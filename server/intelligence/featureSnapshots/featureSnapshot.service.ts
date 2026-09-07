import { recordFeatureSnapshot } from "../../db/domains/predictions.db";
import { allAsync } from "../../database";
import type { PredictiveBrainData } from "../predictive/predictiveTypes";

const BASELINE_MODEL_KEY = "rule_statistical_baseline" as const;
const BASELINE_MODEL_VERSION = "v1";
const DEFAULT_HORIZON_DAYS = 7;

export const recordPredictiveFeatureSnapshots = async (
  runId: number,
  data: PredictiveBrainData,
): Promise<void> => {
  await recordFeatureSnapshot({
    runId,
    modelKey: BASELINE_MODEL_KEY,
    modelVersion: BASELINE_MODEL_VERSION,
    predictionType: "sales_forecast",
    entityType: "global",
    entityId: "sales",
    horizonDays: DEFAULT_HORIZON_DAYS,
    features: {
      tomorrowSalesForecast: data.forecast?.tomorrowSales || 0,
      next7SalesForecast: data.forecast?.next7Sales || 0,
      tomorrowOrdersForecast: data.forecast?.tomorrowOrders || 0,
      avgTicket7: data.forecast?.avgTicket || 0,
      trendPct: data.forecast?.trendPct || 0,
      discountPressure: data.forecast?.discountPressure || 0,
      confidence: data.confidence || 0,
      dataPoints: data.method?.dataPoints || 0,
      horizonTomorrow: data.horizon?.tomorrow || null,
      horizonNext7DaysUntil: data.horizon?.next7DaysUntil || null,
    },
  });

  await recordFeatureSnapshot({
    runId,
    modelKey: BASELINE_MODEL_KEY,
    modelVersion: BASELINE_MODEL_VERSION,
    predictionType: "collection_pressure",
    entityType: "global",
    entityId: "installments",
    horizonDays: DEFAULT_HORIZON_DAYS,
    features: {
      overdueCount: data.risks?.collection?.overdueCount || 0,
      overdueAmount: data.risks?.collection?.overdueAmount || 0,
      dueSoonCount: data.risks?.collection?.dueSoonCount || 0,
      dueSoonAmount: data.risks?.collection?.dueSoonAmount || 0,
      horizonNext7DaysUntil: data.horizon?.next7DaysUntil || null,
    },
  });

  // Capture the complete inventory population, including non-risk/negative examples.
  // The former risk-only loop created selection bias and could not support a reliable classifier.
  const completeInventoryRows = await allAsync(`
    SELECT p.id AS productId, p.name AS productName,
           COALESCE(p.stock_quantity, 0) AS stockQuantity,
           COALESCE(p.threshold, 5) AS thresholdQty,
           COALESCE(SUM(CASE WHEN so.id IS NOT NULL THEN soi.quantity ELSE 0 END), 0) AS soldQty14
    FROM products p
    LEFT JOIN sales_order_items soi ON soi.itemType = 'inventory' AND soi.itemId = p.id
    LEFT JOIN sales_orders so ON so.id = soi.orderId
      AND date(substr(so.transactionDate, 1, 10)) BETWEEN date('now', '-13 days') AND date('now')
      AND COALESCE(so.status, 'active') = 'active'
    GROUP BY p.id, p.name, p.stock_quantity, p.threshold
    ORDER BY p.id ASC
  `).catch(() => []);
  const snapshotRows = completeInventoryRows.length > 0 ? completeInventoryRows.map((row: any) => {
    const stockQuantity = Number(row.stockQuantity || 0);
    const soldQty14 = Number(row.soldQty14 || 0);
    const avgDailySold = soldQty14 / 14;
    const daysToStockout = avgDailySold > 0 ? stockQuantity / avgDailySold : null;
    return {
      productId: row.productId,
      productName: row.productName,
      stockQuantity,
      thresholdQty: Number(row.thresholdQty || 5),
      soldQty14,
      avgDailySold: Math.round(avgDailySold * 100) / 100,
      daysToStockout: daysToStockout === null ? null : Math.round(daysToStockout * 10) / 10,
      baselinePredictedRisk: daysToStockout !== null ? daysToStockout <= DEFAULT_HORIZON_DAYS : stockQuantity <= Number(row.thresholdQty || 5),
    };
  }) : (data.risks?.stockout || []);

  for (const risk of snapshotRows) {
    await recordFeatureSnapshot({
      runId,
      modelKey: BASELINE_MODEL_KEY,
      modelVersion: BASELINE_MODEL_VERSION,
      predictionType: "inventory_stockout",
      entityType: "product",
      entityId: risk.productId == null ? null : String(risk.productId),
      horizonDays: DEFAULT_HORIZON_DAYS,
      features: {
        productId: risk.productId,
        productName: risk.productName,
        stockQuantity: risk.stockQuantity,
        soldQty14: risk.soldQty14,
        avgDailySold: risk.avgDailySold,
        daysToStockout: risk.daysToStockout,
        thresholdQty: risk.thresholdQty,
        suggestedBuyQty: "suggestedBuyQty" in risk ? risk.suggestedBuyQty : null,
        severity: "severity" in risk ? risk.severity : null,
        baselinePredictedRisk: "baselinePredictedRisk" in risk ? risk.baselinePredictedRisk : undefined,
      },
    });
  }
};
