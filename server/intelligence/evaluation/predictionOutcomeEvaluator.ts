import { getAsync } from "../../database";
import {
  listPredictionRunsForEvaluation,
  recordPredictionOutcome,
  updatePredictionRunEvaluationStatus,
  type PredictionRunForEvaluation,
} from "../../db/domains/predictions.db";
import {
  calculateBinaryPredictionAccuracy,
  calculateNumericPredictionMetrics,
  diffInclusiveDays,
  normalizeMetricNumber,
  numericAccuracyToOutcomeStatus,
  roundMetric,
} from "./predictionMetrics";
import type { PredictionEvaluationRecord } from "./predictionEvaluationTypes";

type PredictivePayload = {
  risks?: {
    stockout?: Array<Record<string, unknown>>;
    collection?: Record<string, unknown>;
  };
};

const parsePayload = (value: unknown): PredictivePayload => {
  if (!value || typeof value !== "string") return {};
  try {
    const parsed = JSON.parse(value) as PredictivePayload;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (_err) {
    return {};
  }
};

const todayIso = (): string => new Date().toISOString().slice(0, 10);

const evaluateSalesForecast = async (
  run: PredictionRunForEvaluation,
): Promise<PredictionEvaluationRecord> => {
  const horizonStart = String(run.horizonTomorrow || "").slice(0, 10);
  const horizonEnd = String(run.horizonNext7DaysUntil || "").slice(0, 10);
  const horizonDays = diffInclusiveDays(horizonStart, horizonEnd);
  const predictedValue = normalizeMetricNumber(run.next7SalesForecast);

  const actual = await getAsync(
    `
      SELECT COALESCE(SUM(grandTotal), 0) AS actualSales,
             COUNT(*) AS actualOrders
      FROM sales_orders
      WHERE substr(transactionDate, 1, 10) BETWEEN ? AND ?
        AND COALESCE(status, 'active') = 'active'
    `,
    [horizonStart, horizonEnd],
  ).catch(() => ({ actualSales: 0, actualOrders: 0 }));

  const metrics = calculateNumericPredictionMetrics(predictedValue, actual?.actualSales || 0);
  return {
    runId: Number(run.id),
    predictionType: "sales_forecast",
    outcomeStatus: numericAccuracyToOutcomeStatus(metrics.accuracyPct),
    predictedValue: metrics.predictedValue,
    actualValue: metrics.actualValue,
    absoluteError: metrics.absoluteError,
    percentageError: metrics.percentageError,
    accuracyPct: metrics.accuracyPct,
    horizonDays,
    metrics: {
      ...metrics,
      actualOrders: normalizeMetricNumber(actual?.actualOrders),
      evaluatedAt: new Date().toISOString(),
    },
  };
};

const getProductStockoutActual = async (
  productId: unknown,
  horizonStart: string,
  horizonEnd: string,
  snapshotStock: number,
) => {
  return getAsync(
    `
      SELECT p.stock_quantity AS currentStock,
             COALESCE(SUM(CASE WHEN so.id IS NOT NULL THEN soi.quantity ELSE 0 END), 0) AS soldQtyDuringHorizon
      FROM products p
      LEFT JOIN sales_order_items soi ON soi.itemType = 'inventory' AND soi.itemId = p.id
      LEFT JOIN sales_orders so ON so.id = soi.orderId
        AND substr(so.transactionDate, 1, 10) BETWEEN ? AND ?
        AND COALESCE(so.status, 'active') = 'active'
      WHERE p.id = ?
      GROUP BY p.id, p.stock_quantity
    `,
    [horizonStart, horizonEnd, productId],
  )
    .then((row) => {
      const soldQtyDuringHorizon = normalizeMetricNumber(row?.soldQtyDuringHorizon);
      const currentStock = normalizeMetricNumber(row?.currentStock, snapshotStock);
      const stockoutBySnapshot = snapshotStock - soldQtyDuringHorizon <= 0;
      const actualStockoutOccurred = currentStock <= 0 || stockoutBySnapshot;
      return { currentStock, soldQtyDuringHorizon, actualStockoutOccurred };
    })
    .catch(() => ({ currentStock: snapshotStock, soldQtyDuringHorizon: 0, actualStockoutOccurred: false }));
};

const evaluateInventoryStockout = async (
  run: PredictionRunForEvaluation,
): Promise<PredictionEvaluationRecord> => {
  const payload = parsePayload(run.payloadJson);
  const stockoutRisks = Array.isArray(payload.risks?.stockout)
    ? payload.risks?.stockout || []
    : [];
  const horizonStart = String(run.horizonTomorrow || "").slice(0, 10);
  const horizonEnd = String(run.horizonNext7DaysUntil || "").slice(0, 10);
  const horizonDays = diffInclusiveDays(horizonStart, horizonEnd);

  const evaluatedItems = [];
  for (const risk of stockoutRisks) {
    const snapshotStock = normalizeMetricNumber(risk.stockQuantity);
    const actual = await getProductStockoutActual(
      risk.productId,
      horizonStart,
      horizonEnd,
      snapshotStock,
    );
    const predictedDays = risk.daysToStockout == null ? null : normalizeMetricNumber(risk.daysToStockout);
    const predictedRisk = predictedDays == null || predictedDays <= horizonDays || ["critical", "high", "medium"].includes(String(risk.severity || ""));
    const daysToStockoutActual = actual.actualStockoutOccurred && actual.soldQtyDuringHorizon > 0
      ? Math.max(1, Math.ceil(snapshotStock / Math.max(actual.soldQtyDuringHorizon / horizonDays, 0.01)))
      : null;
    evaluatedItems.push({
      productId: risk.productId,
      productName: risk.productName,
      predictedRisk,
      predictedSeverity: risk.severity || null,
      actualStockoutOccurred: actual.actualStockoutOccurred,
      daysToStockoutPredicted: predictedDays,
      daysToStockoutActual,
      soldQtyDuringHorizon: actual.soldQtyDuringHorizon,
      currentStock: actual.currentStock,
      hitOrMiss: predictedRisk === actual.actualStockoutOccurred ? "hit" : "miss",
      severityMatch: actual.actualStockoutOccurred ? ["critical", "high"].includes(String(risk.severity || "")) : !["critical", "high"].includes(String(risk.severity || "")),
    });
  }

  const broadActual = await getAsync(
    `SELECT COUNT(*) AS actualStockouts FROM products WHERE COALESCE(stock_quantity, 0) <= 0`,
  ).catch(() => ({ actualStockouts: 0 }));
  const predictedRiskCount = stockoutRisks.length;
  const actualStockoutCount = evaluatedItems.length
    ? evaluatedItems.filter((item) => item.actualStockoutOccurred).length
    : normalizeMetricNumber(broadActual?.actualStockouts);
  const matches = evaluatedItems.length
    ? evaluatedItems.filter((item) => item.hitOrMiss === "hit").length
    : actualStockoutCount === 0
      ? 1
      : 0;
  const denominator = Math.max(1, evaluatedItems.length || 1);
  const accuracyPct = roundMetric((matches / denominator) * 100, 2);
  const outcomeStatus = stockoutRisks.length === 0 && actualStockoutCount > 0
    ? "miss"
    : numericAccuracyToOutcomeStatus(accuracyPct);

  return {
    runId: Number(run.id),
    predictionType: "inventory_stockout",
    outcomeStatus,
    predictedValue: predictedRiskCount,
    actualValue: actualStockoutCount,
    absoluteError: Math.abs(predictedRiskCount - actualStockoutCount),
    percentageError: predictedRiskCount > 0
      ? roundMetric((Math.abs(predictedRiskCount - actualStockoutCount) / Math.max(actualStockoutCount, 1)) * 100, 2)
      : null,
    accuracyPct,
    horizonDays,
    metrics: {
      predictedRisk: predictedRiskCount > 0,
      actualStockoutOccurred: actualStockoutCount > 0,
      predictedRiskCount,
      actualStockoutCount,
      hitOrMiss: outcomeStatus === "hit" ? "hit" : outcomeStatus === "partial" ? "partial" : "miss",
      severityMatch: evaluatedItems.filter((item) => item.severityMatch).length,
      items: evaluatedItems,
    },
  };
};

const evaluateCollectionPressure = async (
  run: PredictionRunForEvaluation,
): Promise<PredictionEvaluationRecord> => {
  const horizonEnd = String(run.horizonNext7DaysUntil || "").slice(0, 10);
  const horizonStart = String(run.horizonTomorrow || "").slice(0, 10);
  const horizonDays = diffInclusiveDays(horizonStart, horizonEnd);
  const predictedOverdueAmount = normalizeMetricNumber(run.collectionOverdueAmount) + normalizeMetricNumber(run.collectionDueSoonAmount);
  const predictedOverdueCount = normalizeMetricNumber(run.collectionOverdueCount) + normalizeMetricNumber(run.collectionDueSoonCount);

  const actual = await getAsync(
    `
      SELECT COUNT(*) AS actualOverdueCount,
             COALESCE(SUM(amountDue), 0) AS actualOverdueAmount
      FROM installment_payments
      WHERE COALESCE(status, 'پرداخت نشده') <> 'پرداخت شده'
        AND REPLACE(dueDate, '/', '-') <= ?
    `,
    [horizonEnd],
  ).catch(() => ({ actualOverdueCount: 0, actualOverdueAmount: 0 }));

  const metrics = calculateNumericPredictionMetrics(predictedOverdueAmount, actual?.actualOverdueAmount || 0);
  const countMetrics = calculateNumericPredictionMetrics(predictedOverdueCount, actual?.actualOverdueCount || 0);
  const combinedAccuracy = roundMetric((metrics.accuracyPct * 0.7) + (countMetrics.accuracyPct * 0.3), 2);

  return {
    runId: Number(run.id),
    predictionType: "collection_pressure",
    outcomeStatus: numericAccuracyToOutcomeStatus(combinedAccuracy),
    predictedValue: metrics.predictedValue,
    actualValue: metrics.actualValue,
    absoluteError: metrics.absoluteError,
    percentageError: metrics.percentageError,
    accuracyPct: combinedAccuracy,
    horizonDays,
    metrics: {
      predictedOverdueAmount,
      actualOverdueAmount: metrics.actualValue,
      predictedOverdueCount,
      actualOverdueCount: countMetrics.actualValue,
      absoluteError: metrics.absoluteError,
      percentageError: metrics.percentageError,
      amountAccuracyPct: metrics.accuracyPct,
      countAccuracyPct: countMetrics.accuracyPct,
      accuracyPct: combinedAccuracy,
    },
  };
};

export const evaluateSinglePredictionRun = async (
  run: PredictionRunForEvaluation,
): Promise<{ runId: number; outcomes: Record<string, unknown>[]; status: string }> => {
  const runId = Number(run.id);
  await updatePredictionRunEvaluationStatus(runId, "ready");
  const evaluations = await Promise.all([
    evaluateSalesForecast(run),
    evaluateInventoryStockout(run),
    evaluateCollectionPressure(run),
  ]);
  const outcomes = [];
  for (const evaluation of evaluations) {
    outcomes.push(await recordPredictionOutcome(evaluation));
  }
  await updatePredictionRunEvaluationStatus(runId, "evaluated");
  return { runId, outcomes, status: "evaluated" };
};

export const evaluatePendingPredictionOutcomes = async (
  options: { limit?: unknown } = {},
) => {
  const runs = await listPredictionRunsForEvaluation({
    limit: options.limit,
    readyDateIso: todayIso(),
  });
  const results: Array<Record<string, unknown>> = [];
  let failedRuns = 0;

  for (const run of runs) {
    try {
      results.push(await evaluateSinglePredictionRun(run));
    } catch (err) {
      failedRuns += 1;
      await updatePredictionRunEvaluationStatus(Number(run.id), "failed").catch(() => undefined);
      results.push({
        runId: Number(run.id),
        status: "failed",
        message: err instanceof Error ? err.message : "Prediction evaluation failed",
      });
    }
  }

  const evaluatedRuns = results.filter((item) => item.status === "evaluated").length;
  const outcomeCount = results.reduce((sum, item) => {
    const outcomes = item.outcomes;
    return sum + (Array.isArray(outcomes) ? outcomes.length : 0);
  }, 0);

  return {
    success: true,
    generatedAt: new Date().toISOString(),
    scannedRuns: runs.length,
    evaluatedRuns,
    failedRuns,
    outcomeCount,
    results,
  };
};
