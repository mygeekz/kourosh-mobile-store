import { runPortableLogistic, trainPortableLogistic, type PortableLogisticArtifact, type RegressionExample } from "./portableModel";

export type InventoryLabeledRow = {
  snapshotId: number;
  productId: string;
  observedAt: string;
  stockQuantity: number;
  soldQty14: number;
  avgDailySold: number;
  thresholdQty: number;
  actualStockoutWithinHorizon: 0 | 1;
};

export type InventoryCurrentRow = Omit<InventoryLabeledRow, "snapshotId" | "observedAt" | "actualStockoutWithinHorizon"> & { productName: string };

export type InventoryMlAdvisory = {
  status: "available" | "abstained";
  mode: "read-only-trained-stockout-classifier" | "approved-artifact-stockout-classifier" | "approved-artifact-unavailable" | "advisory-disabled" | "safety-abstention";
  artifactId?: string;
  reason: string;
  metrics: { sampleCount: number; accuracy: number; precision: number; recall: number; brier: number } | null;
  items: Array<{ productId: string; productName: string; probability: number; severity: "low" | "medium" | "high"; suggestedReviewQuantity: number; reason: string }>;
  safety: { advisoryOnly: true; humanReviewRequired: true; automaticOrderingEnabled: false; inventoryMutationEnabled: false };
};

export const INVENTORY_ML_FEATURES = ["stock_quantity", "sold_qty_14", "avg_daily_sold", "threshold_qty"] as const;

export const inventoryFeatureVector = (row: Pick<InventoryLabeledRow, "stockQuantity" | "soldQty14" | "avgDailySold" | "thresholdQty">): number[] =>
  [Number(row.stockQuantity || 0), Number(row.soldQty14 || 0), Number(row.avgDailySold || 0), Number(row.thresholdQty || 0)];

export const trainInventoryStockoutArtifact = (labeledRows: InventoryLabeledRow[], now = new Date(), syntheticTrainingData = false): PortableLogisticArtifact => {
  const positives = labeledRows.filter((row) => row.actualStockoutWithinHorizon === 1).length;
  const negatives = labeledRows.length - positives;
  if (labeledRows.length < 60 || positives < 12 || negatives < 12) throw new Error("Inventory training requires 60 labels and 12 examples from each class");
  const examples: RegressionExample[] = labeledRows.map((row) => ({ x: inventoryFeatureVector(row), y: row.actualStockoutWithinHorizon, observedAt: row.observedAt, entityKey: `${row.productId}:${row.snapshotId}` }));
  return trainPortableLogistic({ artifactId: `inventory-stockout-${now.toISOString().replace(/[^0-9]/g, "").slice(0, 17)}`, featureNames: [...INVENTORY_ML_FEATURES], examples, trainedAt: now.toISOString(), syntheticTrainingData });
};

export const runInventoryStockoutArtifact = (artifact: PortableLogisticArtifact, currentRows: InventoryCurrentRow[]): InventoryMlAdvisory => {
  const items = currentRows.map((row) => {
    const probability = runPortableLogistic(artifact, inventoryFeatureVector(row));
    const reviewQuantity = Math.max(0, Math.ceil(Number(row.avgDailySold || 0) * 21 - Number(row.stockQuantity || 0)));
    return { productId: row.productId, productName: row.productName, probability: Number(probability.toFixed(4)), severity: probability >= 0.72 ? "high" as const : probability >= 0.45 ? "medium" as const : "low" as const, suggestedReviewQuantity: reviewQuantity, reason: probability >= 0.45 ? "الگوی فروش و موجودی به بازبینی خرید نیاز دارد." : "ریسک کمبود در افق هفت‌روزه پایین برآورد شد." };
  }).sort((a, b) => b.probability - a.probability || a.productId.localeCompare(b.productId)).slice(0, 10);
  return { status: "available", mode: "approved-artifact-stockout-classifier", artifactId: artifact.artifactId, reason: "احتمال کمبود از artifact تأییدشده مدل logistic محاسبه شده است.", metrics: { sampleCount: artifact.metrics.sampleCount, accuracy: artifact.metrics.accuracy, precision: artifact.metrics.precision, recall: artifact.metrics.recall, brier: artifact.metrics.brier }, items, safety: { advisoryOnly: true, humanReviewRequired: true, automaticOrderingEnabled: false, inventoryMutationEnabled: false } };
};

export const buildInventoryMlAdvisory = (labeledRows: InventoryLabeledRow[], currentRows: InventoryCurrentRow[], now = new Date()): InventoryMlAdvisory => {
  const positives = labeledRows.filter((row) => row.actualStockoutWithinHorizon === 1).length;
  const negatives = labeledRows.length - positives;
  if (labeledRows.length < 60 || positives < 12 || negatives < 12) {
    return { status: "abstained", mode: "read-only-trained-stockout-classifier", reason: "برای اجرای پایدار مدل انبار حداقل ۶۰ برچسب و ۱۲ نمونه از هر کلاس لازم است.", metrics: null, items: [], safety: { advisoryOnly: true, humanReviewRequired: true, automaticOrderingEnabled: false, inventoryMutationEnabled: false } };
  }
  let artifact;
  try {
    artifact = trainInventoryStockoutArtifact(labeledRows, now);
  } catch (error) {
    return { status: "abstained", mode: "read-only-trained-stockout-classifier", reason: error instanceof Error ? error.message : "آموزش زمانی مدل انبار معتبر نبود.", metrics: null, items: [], safety: { advisoryOnly: true, humanReviewRequired: true, automaticOrderingEnabled: false, inventoryMutationEnabled: false } };
  }
  const items = currentRows.map((row) => {
    const probability = runPortableLogistic(artifact, inventoryFeatureVector(row));
    const reviewQuantity = Math.max(0, Math.ceil(Number(row.avgDailySold || 0) * 21 - Number(row.stockQuantity || 0)));
    return {
      productId: row.productId,
      productName: row.productName,
      probability: Number(probability.toFixed(4)),
      severity: probability >= 0.72 ? "high" as const : probability >= 0.45 ? "medium" as const : "low" as const,
      suggestedReviewQuantity: reviewQuantity,
      reason: probability >= 0.45 ? "الگوی فروش و موجودی به بازبینی خرید نیاز دارد." : "ریسک کمبود در افق هفت‌روزه پایین برآورد شد.",
    };
  }).sort((a, b) => b.probability - a.probability || a.productId.localeCompare(b.productId)).slice(0, 10);
  return {
    status: "available", mode: "read-only-trained-stockout-classifier", reason: "احتمال کمبود از مدل logistic آموزش‌دیده با آزمون زمانی محاسبه شده است.",
    metrics: { sampleCount: artifact.metrics.sampleCount, accuracy: artifact.metrics.accuracy, precision: artifact.metrics.precision, recall: artifact.metrics.recall, brier: artifact.metrics.brier },
    items,
    safety: { advisoryOnly: true, humanReviewRequired: true, automaticOrderingEnabled: false, inventoryMutationEnabled: false },
  };
};
