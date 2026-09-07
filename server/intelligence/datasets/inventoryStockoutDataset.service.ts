import {
  getInventoryStockoutDatasetSourceCounts,
  listInventoryStockoutDatasetSnapshotRows,
  listMlDatasetExports,
  recordMlDatasetExport,
  type InventoryStockoutDatasetSnapshotRow,
} from "../../db/domains/mlDatasets.db";
import type {
  InventoryStockoutDatasetResponse,
  InventoryStockoutDatasetRow,
  InventoryStockoutDatasetSummary,
  MlDatasetCatalogSummary,
} from "./datasetTypes";
import {
  normalizeDatasetNumber,
  rowsToCsv,
  safeParseJson,
  severityToScore,
  toBinaryLabel,
} from "./datasetUtils";

const DATASET_KEY = "inventory_stockout_baseline_v1" as const;
const DATASET_VERSION = "v1" as const;
const LABEL_KEY = "actual_stockout_within_horizon" as const;
const FEATURE_COUNT = 4;

const normalizeBoolRisk = (value: unknown, fallback = false): number => {
  if (value === true || value === 1 || value === "1") return 1;
  if (value === false || value === 0 || value === "0") return 0;
  return fallback ? 1 : 0;
};

const findOutcomeItemForSnapshot = (
  row: InventoryStockoutDatasetSnapshotRow,
  metrics: Record<string, unknown>,
): Record<string, unknown> | null => {
  const items = Array.isArray(metrics.items) ? metrics.items : [];
  const entityId = row.entityId == null ? null : String(row.entityId);
  if (!entityId) return null;
  return (items.find((item) => String((item as Record<string, unknown>).productId ?? "") === entityId) || null) as Record<string, unknown> | null;
};

const buildDatasetRow = (
  sourceRow: InventoryStockoutDatasetSnapshotRow,
): InventoryStockoutDatasetRow => {
  const features = safeParseJson<Record<string, unknown>>(sourceRow.featuresJson, {});
  const metrics = safeParseJson<Record<string, unknown>>(sourceRow.outcomeMetricsJson, {});
  const outcomeItem = findOutcomeItemForSnapshot(sourceRow, metrics);
  const predictedDays = normalizeDatasetNumber(features.daysToStockout);
  const horizonDays = normalizeDatasetNumber(sourceRow.horizonDays);
  const severityLabel = features.severity == null ? null : String(features.severity);
  const predictedRiskByDays = predictedDays == null || horizonDays == null ? false : predictedDays <= horizonDays;
  const baselinePredictedRisk = normalizeBoolRisk(
    features.baselinePredictedRisk,
    predictedRiskByDays || ["critical", "high", "medium"].includes(String(severityLabel || "")),
  );
  const actualStockout = outcomeItem
    ? toBinaryLabel(outcomeItem.actualStockoutOccurred)
    : null;
  const hasOutcomeLabel = actualStockout !== null;
  const hasFeatureSnapshot = Boolean(sourceRow.snapshotId && sourceRow.featuresJson);
  const issues = [];

  if (!hasOutcomeLabel) {
    issues.push({
      key: "missing_outcome_label",
      severity: "warning" as const,
      message: "این ردیف هنوز outcome evaluation ندارد و فقط برای inference/debug مناسب است.",
    });
  }
  if (normalizeDatasetNumber(features.stockQuantity) == null) {
    issues.push({
      key: "missing_stock_quantity",
      severity: "blocker" as const,
      message: "stockQuantity در feature snapshot موجود نیست.",
    });
  }
  if (normalizeDatasetNumber(features.soldQty14) == null) {
    issues.push({
      key: "missing_sold_qty_14",
      severity: "warning" as const,
      message: "soldQty14 در feature snapshot موجود نیست.",
    });
  }

  // v2 training uses only measurements available at observation time. Rule outputs
  // remain in the response for historical compatibility but are excluded by the trainer.
  const leakageSafe = [
    features.stockQuantity,
    features.soldQty14,
    features.avgDailySold,
    features.thresholdQty,
  ].every((value) => normalizeDatasetNumber(value) !== null);
  const canTrain = hasFeatureSnapshot && hasOutcomeLabel && !issues.some((issue) => issue.severity === "blocker");

  return {
    rowKey: `${DATASET_KEY}:${sourceRow.snapshotId}`,
    datasetKey: DATASET_KEY,
    datasetVersion: DATASET_VERSION,
    predictionRunId: Number(sourceRow.runId),
    featureSnapshotId: Number(sourceRow.snapshotId),
    productId: features.productId == null ? sourceRow.entityId : (features.productId as string | number),
    productName: features.productName == null ? null : String(features.productName),
    observedAt: sourceRow.runCreatedAt || sourceRow.snapshotCreatedAt || null,
    horizonStart: sourceRow.horizonTomorrow || null,
    horizonEnd: sourceRow.horizonNext7DaysUntil || null,
    horizonDays,
    modelKey: sourceRow.modelKey || "rule_statistical_baseline",
    modelVersion: sourceRow.modelVersion || "v1",
    features: {
      stockQuantity: normalizeDatasetNumber(features.stockQuantity),
      soldQty14: normalizeDatasetNumber(features.soldQty14),
      avgDailySold: normalizeDatasetNumber(features.avgDailySold),
      daysToStockoutPredicted: predictedDays,
      thresholdQty: normalizeDatasetNumber(features.thresholdQty),
      suggestedBuyQty: normalizeDatasetNumber(features.suggestedBuyQty),
      severityScore: severityToScore(severityLabel),
      severityLabel,
      baselinePredictedRisk,
    },
    label: {
      target: LABEL_KEY,
      actualStockoutWithinHorizon: actualStockout,
      daysToStockoutActual: outcomeItem ? normalizeDatasetNumber(outcomeItem.daysToStockoutActual) : null,
      soldQtyDuringHorizon: outcomeItem ? normalizeDatasetNumber(outcomeItem.soldQtyDuringHorizon) : null,
      currentStockAtEvaluation: outcomeItem ? normalizeDatasetNumber(outcomeItem.currentStock) : null,
      hitOrMiss: outcomeItem?.hitOrMiss == null ? null : String(outcomeItem.hitOrMiss),
      evaluatedAt: sourceRow.evaluatedAt || null,
    },
    quality: {
      hasFeatureSnapshot,
      hasOutcomeLabel,
      leakageSafe,
      canTrain,
      issues,
    },
  };
};

const buildSummary = (
  rows: InventoryStockoutDatasetRow[],
  sourceCounts?: Record<string, unknown> | null,
): InventoryStockoutDatasetSummary => {
  const labeledRows = rows.filter((row) => row.quality.hasOutcomeLabel).length;
  const positiveLabels = rows.filter((row) => row.label.actualStockoutWithinHorizon === 1).length;
  const negativeLabels = rows.filter((row) => row.label.actualStockoutWithinHorizon === 0).length;
  const unlabeledRows = rows.length - labeledRows;
  const hasBothClasses = positiveLabels > 0 && negativeLabels > 0;
  const labelCoverage = rows.length ? Math.round((labeledRows / rows.length) * 100) : 0;
  const volumeScore = Math.min(100, Math.round((labeledRows / 200) * 100));
  const classBalanceScore = hasBothClasses ? 100 : positiveLabels || negativeLabels ? 45 : 0;
  const readinessPct = Math.max(0, Math.min(100, Math.round(volumeScore * 0.6 + labelCoverage * 0.25 + classBalanceScore * 0.15)));
  const blockers: string[] = [];

  if (!rows.length) blockers.push("هیچ feature snapshot از نوع inventory_stockout وجود ندارد.");
  if (!labeledRows) blockers.push("هیچ outcome label ارزیابی‌شده برای stockout وجود ندارد.");
  if (labeledRows > 0 && !hasBothClasses) blockers.push("labelها فقط یک کلاس دارند؛ برای baseline ML باید هم stockout و هم non-stockout دیده شود.");
  if (labeledRows < 30) blockers.push("تعداد ردیف‌های labeled برای train/test split پایدار کافی نیست.");

  let status: InventoryStockoutDatasetSummary["status"] = "not_ready";
  if (readinessPct >= 75 && labeledRows >= 100 && hasBothClasses) status = "ready";
  else if (readinessPct >= 55 && labeledRows >= 50 && hasBothClasses) status = "almost_ready";
  else if (rows.length || Number(sourceCounts?.totalSnapshots || 0) > 0) status = "needs_data";

  const recommendedNextAction = status === "ready"
    ? "دیتاست برای export و ساخت baseline آموزشی ساده آماده است؛ مرحله بعدی می‌تواند train/test split و benchmark باشد."
    : status === "almost_ready"
      ? "چند دوره outcome evaluation دیگر ثبت کنید تا تعداد ردیف و تنوع label بهتر شود."
      : "ابتدا prediction runهای بیشتری تولید کنید و بعد از رسیدن horizon، outcome evaluation را اجرا کنید.";

  return {
    datasetKey: DATASET_KEY,
    datasetVersion: DATASET_VERSION,
    labelKey: LABEL_KEY,
    generatedAt: new Date().toISOString(),
    totalRows: rows.length,
    labeledRows,
    unlabeledRows,
    positiveLabels,
    negativeLabels,
    featureCount: FEATURE_COUNT,
    readinessPct,
    status,
    blockers,
    recommendedNextAction,
  };
};

export const buildInventoryStockoutDataset = async (options: {
  limit?: unknown;
  onlyLabeled?: unknown;
} = {}): Promise<InventoryStockoutDatasetResponse> => {
  const onlyLabeled = String(options.onlyLabeled || "").toLowerCase() === "true";
  const [sourceRows, sourceCounts] = await Promise.all([
    listInventoryStockoutDatasetSnapshotRows({ limit: options.limit, onlyLabeled }),
    getInventoryStockoutDatasetSourceCounts().catch(() => null),
  ]);
  const rows = sourceRows.map(buildDatasetRow);
  const summary = buildSummary(rows, sourceCounts);
  return {
    generatedAt: new Date().toISOString(),
    summary,
    rows,
    exportHints: {
      jsonEndpoint: "/api/brain/ml-datasets/inventory-stockout",
      csvEndpoint: "/api/brain/ml-datasets/inventory-stockout/export.csv",
      leakagePolicy: "features come from predictive_feature_snapshots; labels come only from evaluated predictive_outcome_events.",
    },
  };
};

export const buildMlDatasetCatalogSummary = async (): Promise<MlDatasetCatalogSummary> => {
  const dataset = await buildInventoryStockoutDataset({ limit: 10000 });
  const lastExports = await listMlDatasetExports(10).catch(() => []);
  return {
    generatedAt: new Date().toISOString(),
    datasets: [dataset.summary],
    lastExports,
  };
};

const flattenInventoryStockoutRowsForCsv = (rows: InventoryStockoutDatasetRow[]) => rows.map((row) => ({
  rowKey: row.rowKey,
  predictionRunId: row.predictionRunId,
  featureSnapshotId: row.featureSnapshotId,
  productId: row.productId,
  productName: row.productName,
  observedAt: row.observedAt,
  horizonStart: row.horizonStart,
  horizonEnd: row.horizonEnd,
  horizonDays: row.horizonDays,
  stockQuantity: row.features.stockQuantity,
  soldQty14: row.features.soldQty14,
  avgDailySold: row.features.avgDailySold,
  daysToStockoutPredicted: row.features.daysToStockoutPredicted,
  thresholdQty: row.features.thresholdQty,
  suggestedBuyQty: row.features.suggestedBuyQty,
  severityScore: row.features.severityScore,
  severityLabel: row.features.severityLabel,
  baselinePredictedRisk: row.features.baselinePredictedRisk,
  actualStockoutWithinHorizon: row.label.actualStockoutWithinHorizon,
  daysToStockoutActual: row.label.daysToStockoutActual,
  soldQtyDuringHorizon: row.label.soldQtyDuringHorizon,
  currentStockAtEvaluation: row.label.currentStockAtEvaluation,
  hitOrMiss: row.label.hitOrMiss,
  evaluatedAt: row.label.evaluatedAt,
  canTrain: row.quality.canTrain ? 1 : 0,
}));

export const buildInventoryStockoutDatasetCsv = async (options: {
  limit?: unknown;
  onlyLabeled?: unknown;
  userId?: number | null;
} = {}) => {
  const dataset = await buildInventoryStockoutDataset(options);
  const rows = flattenInventoryStockoutRowsForCsv(dataset.rows);
  const headers = [
    "rowKey",
    "predictionRunId",
    "featureSnapshotId",
    "productId",
    "productName",
    "observedAt",
    "horizonStart",
    "horizonEnd",
    "horizonDays",
    "stockQuantity",
    "soldQty14",
    "avgDailySold",
    "daysToStockoutPredicted",
    "thresholdQty",
    "suggestedBuyQty",
    "severityScore",
    "severityLabel",
    "baselinePredictedRisk",
    "actualStockoutWithinHorizon",
    "daysToStockoutActual",
    "soldQtyDuringHorizon",
    "currentStockAtEvaluation",
    "hitOrMiss",
    "evaluatedAt",
    "canTrain",
  ];
  const csv = rowsToCsv(headers, rows);
  const exportRecord = await recordMlDatasetExport({
    datasetKey: DATASET_KEY,
    datasetVersion: DATASET_VERSION,
    exportFormat: "csv",
    rowCount: dataset.summary.totalRows,
    labeledRowCount: dataset.summary.labeledRows,
    featureCount: dataset.summary.featureCount,
    labelKey: dataset.summary.labelKey,
    filters: { limit: options.limit, onlyLabeled: options.onlyLabeled },
    summary: dataset.summary,
    userId: options.userId,
  }).catch(() => null);
  return { csv, summary: dataset.summary, exportRecord };
};

export const recordInventoryStockoutJsonExport = async (options: {
  limit?: unknown;
  onlyLabeled?: unknown;
  userId?: number | null;
} = {}) => {
  const dataset = await buildInventoryStockoutDataset(options);
  const exportRecord = await recordMlDatasetExport({
    datasetKey: DATASET_KEY,
    datasetVersion: DATASET_VERSION,
    exportFormat: "json",
    rowCount: dataset.summary.totalRows,
    labeledRowCount: dataset.summary.labeledRows,
    featureCount: dataset.summary.featureCount,
    labelKey: dataset.summary.labelKey,
    filters: { limit: options.limit, onlyLabeled: options.onlyLabeled },
    summary: dataset.summary,
    userId: options.userId,
  });
  return { dataset, exportRecord };
};
