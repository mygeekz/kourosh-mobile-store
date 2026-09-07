import {
  listMlTrainingPackageExports,
  recordMlTrainingPackageExport,
} from "../../db/domains/mlDatasets.db";
import type {
  InventoryStockoutDatasetRow,
  InventoryStockoutTrainingFeatureSpec,
  InventoryStockoutTrainingPackageDataCard,
  InventoryStockoutTrainingPackageManifest,
  InventoryStockoutTrainingPackageResponse,
  InventoryStockoutTrainingPackageSummary,
  MlTrainingPackageCatalogSummary,
} from "./datasetTypes";
import { rowsToCsv } from "./datasetUtils";
import {
  buildInventoryStockoutBaselineBenchmark,
  buildInventoryStockoutTrainTestSplit,
} from "./inventoryStockoutBenchmark.service";

const PACKAGE_KEY = "inventory_stockout_external_training_package_v1" as const;
const PACKAGE_VERSION = "v1" as const;
const DATASET_KEY = "inventory_stockout_baseline_v1" as const;
const DATASET_VERSION = "v1" as const;
const LABEL_KEY = "actual_stockout_within_horizon" as const;

export const inventoryStockoutTrainingFeatureSchema: InventoryStockoutTrainingFeatureSpec[] = [
  {
    key: "stockQuantity",
    type: "number",
    nullable: false,
    description: "Product stock quantity captured at prediction time.",
  },
  {
    key: "soldQty14",
    type: "number",
    nullable: true,
    description: "Quantity sold during the 14-day lookback window available at prediction time.",
  },
  {
    key: "avgDailySold",
    type: "number",
    nullable: true,
    description: "Average daily sales derived from the prediction-time lookback window.",
  },
  {
    key: "daysToStockoutPredicted",
    type: "number",
    nullable: true,
    description: "Rule/statistical baseline estimate of days until stockout.",
  },
  {
    key: "thresholdQty",
    type: "number",
    nullable: true,
    description: "Reorder threshold known at prediction time.",
  },
  {
    key: "suggestedBuyQty",
    type: "number",
    nullable: true,
    description: "Suggested purchase quantity from the baseline inventory logic.",
  },
  {
    key: "severityScore",
    type: "integer",
    nullable: false,
    description: "Numeric severity encoding: 0 unknown, 1 low, 2 medium, 3 high, 4 critical.",
  },
  {
    key: "baselinePredictedRisk",
    type: "binary",
    nullable: false,
    description: "Prediction-time baseline risk flag; useful for reference comparisons, not as leakage.",
  },
];

const trainingHeaders = [
  "rowKey",
  "split",
  "productId",
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
  "baselinePredictedRisk",
  "actualStockoutWithinHorizon",
  "daysToStockoutActual",
  "evaluatedAt",
];

const flattenTrainingRows = (rows: InventoryStockoutDatasetRow[], split: "train" | "test") => rows.map((row) => ({
  rowKey: row.rowKey,
  split,
  productId: row.productId,
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
  baselinePredictedRisk: row.features.baselinePredictedRisk,
  actualStockoutWithinHorizon: row.label.actualStockoutWithinHorizon,
  daysToStockoutActual: row.label.daysToStockoutActual,
  evaluatedAt: row.label.evaluatedAt,
}));

const buildDataCard = (generatedAt: string): InventoryStockoutTrainingPackageDataCard => ({
  title: "Inventory Stockout External Training Package",
  owner: "Kourosh application-layer MLOps readiness",
  generatedAt,
  sourceTables: [
    "predictive_feature_snapshots",
    "predictive_outcome_events",
    "predictive_engine_runs",
  ],
  rowDefinition: "One row represents one product-level inventory_stockout feature snapshot from a baseline prediction run.",
  labelDefinition: "actual_stockout_within_horizon equals 1 when outcome evaluation observed stockout within the prediction horizon, otherwise 0.",
  knownLimitations: [
    "This package does not contain a trained machine-learning model.",
    "Labels depend on completed prediction outcome evaluation; pending horizons remain excluded from train/test rows.",
    "Small or single-class datasets should not be used for production ML decisions.",
    "Financial, accounting, inventory, and ledger truth calculations are not modified by this package.",
  ],
  minimumTrainingGate: {
    minTrainRows: 30,
    minTestRows: 5,
    requiresBothClassesInTrain: true,
    requiresBothClassesInTest: true,
  },
  recommendedExternalWorkflow: [
    "Export manifest, train CSV, and test CSV from Kourosh.",
    "Train candidate models outside the Kourosh app/runtime.",
    "Evaluate candidates against the fixed test split and compare them with the stored rule/statistical baseline benchmark.",
    "Only consider app integration after a separate model registry/export phase is approved.",
  ],
});

const buildStatus = (
  trainRows: number,
  testRows: number,
  splitStatus: string,
  benchmarkStatus: string,
  hasBothClassesInTrain: boolean,
  hasBothClassesInTest: boolean,
): InventoryStockoutTrainingPackageSummary["status"] => {
  if (!trainRows && !testRows) return "insufficient_data";
  if (splitStatus === "ready" && benchmarkStatus === "ready" && hasBothClassesInTrain && hasBothClassesInTest) return "ready";
  return "warning";
};

const buildSummary = (
  generatedAt: string,
  split: Awaited<ReturnType<typeof buildInventoryStockoutTrainTestSplit>>,
  benchmark: Awaited<ReturnType<typeof buildInventoryStockoutBaselineBenchmark>>,
): InventoryStockoutTrainingPackageSummary => {
  const blockers = Array.from(new Set([
    ...split.summary.blockers,
    ...benchmark.summary.blockers,
  ]));

  if (split.summary.trainRows < 30) blockers.push("train split کمتر از حداقل پیشنهادی ۳۰ ردیف دارد.");
  if (split.summary.testRows < 5) blockers.push("test split کمتر از حداقل پیشنهادی ۵ ردیف دارد.");

  const baseStatus = buildStatus(
    split.summary.trainRows,
    split.summary.testRows,
    split.summary.status,
    benchmark.summary.status,
    split.summary.hasBothClassesInTrain,
    split.summary.hasBothClassesInTest,
  );
  const status: InventoryStockoutTrainingPackageSummary["status"] = blockers.length && baseStatus === "ready"
    ? "warning"
    : baseStatus;

  return {
    packageKey: PACKAGE_KEY,
    datasetKey: DATASET_KEY,
    datasetVersion: DATASET_VERSION,
    generatedAt,
    splitKey: split.summary.splitKey,
    splitStrategy: split.summary.splitStrategy,
    seed: split.summary.seed,
    testRatio: split.summary.testRatio,
    trainRows: split.summary.trainRows,
    testRows: split.summary.testRows,
    labeledRows: split.summary.totalUsableRows,
    featureCount: inventoryStockoutTrainingFeatureSchema.length,
    labelKey: LABEL_KEY,
    bestBaselineKey: benchmark.summary.bestCandidateKey,
    bestBaselineF1Pct: benchmark.summary.bestF1Pct,
    bestBaselineBalancedAccuracyPct: benchmark.summary.bestBalancedAccuracyPct,
    status,
    blockers: Array.from(new Set(blockers)),
    recommendedNextAction: status === "ready"
      ? "Training package آماده export بیرونی است؛ training را خارج از Kourosh اجرا و benchmark را با Rule/Statistical Baseline مقایسه کنید."
      : "قبل از training بیرونی، outcome evaluationهای بیشتری ثبت کنید تا train/test هر دو کلاس و حجم کافی داشته باشد.",
  };
};

const buildManifest = (
  generatedAt: string,
  summary: InventoryStockoutTrainingPackageSummary,
  split: Awaited<ReturnType<typeof buildInventoryStockoutTrainTestSplit>>,
  benchmark: Awaited<ReturnType<typeof buildInventoryStockoutBaselineBenchmark>>,
): InventoryStockoutTrainingPackageManifest => ({
  packageKey: PACKAGE_KEY,
  packageVersion: PACKAGE_VERSION,
  datasetKey: DATASET_KEY,
  datasetVersion: DATASET_VERSION,
  createdAt: generatedAt,
  purpose: "Prepare a leakage-aware inventory stockout train/test package for ML experiments outside the Kourosh application runtime.",
  allowedUse: [
    "External offline model experimentation",
    "Reproducible train/test benchmark comparison",
    "Data quality review before a future model registry phase",
  ],
  forbiddenUse: [
    "Calling this package a trained model",
    "Changing official financial, inventory, or ledger calculations",
    "Running automatic ML training inside Kourosh",
    "Serving predictions from an external model in this phase",
  ],
  target: {
    key: LABEL_KEY,
    type: "binary",
    positiveClass: 1,
    negativeClass: 0,
    description: "Whether a stockout actually occurred inside the evaluated prediction horizon.",
  },
  featureSchema: inventoryStockoutTrainingFeatureSchema,
  split: split.summary,
  baselineBenchmark: benchmark.summary,
  files: {
    trainJsonEndpoint: "/api/brain/ml-datasets/inventory-stockout/training-package?split=train",
    testJsonEndpoint: "/api/brain/ml-datasets/inventory-stockout/training-package?split=test",
    trainCsvEndpoint: "/api/brain/ml-datasets/inventory-stockout/training-package/train.csv",
    testCsvEndpoint: "/api/brain/ml-datasets/inventory-stockout/training-package/test.csv",
    manifestEndpoint: "/api/brain/ml-datasets/inventory-stockout/training-package/manifest.json",
  },
  leakagePolicy: split.summary.leakagePolicy,
  trainingPolicy: "No ML training, Python service, model registry, or inference runtime is added in Phase 2E; package files are for external offline training only.",
  evaluationPolicy: "External candidates must be evaluated on the fixed test split and compared with the stored Rule/Statistical Baseline benchmark before any future integration decision.",
});

export const buildInventoryStockoutTrainingPackage = async (
  options: Record<string, unknown> = {},
): Promise<InventoryStockoutTrainingPackageResponse> => {
  const [split, benchmark] = await Promise.all([
    buildInventoryStockoutTrainTestSplit(options),
    buildInventoryStockoutBaselineBenchmark(options),
  ]);
  const generatedAt = new Date().toISOString();
  const summary = buildSummary(generatedAt, split, benchmark);
  const manifest = buildManifest(generatedAt, summary, split, benchmark);
  const dataCard = buildDataCard(generatedAt);
  const requestedSplit = String(options.split || "").toLowerCase();

  return {
    generatedAt,
    summary,
    manifest,
    dataCard,
    trainRows: requestedSplit === "test" ? [] : split.trainRows,
    testRows: requestedSplit === "train" ? [] : split.testRows,
  };
};

export const buildInventoryStockoutTrainingPackageCsv = async (
  splitName: "train" | "test",
  options: Record<string, unknown> = {},
) => {
  const pack = await buildInventoryStockoutTrainingPackage(options);
  const rows = splitName === "train" ? pack.trainRows : pack.testRows;
  const csv = rowsToCsv(trainingHeaders, flattenTrainingRows(rows, splitName));
  return {
    csv,
    summary: pack.summary,
    manifest: pack.manifest,
  };
};

export const recordInventoryStockoutTrainingPackageExport = async (
  options: Record<string, unknown> = {},
): Promise<InventoryStockoutTrainingPackageResponse> => {
  const pack = await buildInventoryStockoutTrainingPackage(options);
  const exportRecord = await recordMlTrainingPackageExport({
    packageKey: pack.summary.packageKey,
    packageVersion: PACKAGE_VERSION,
    datasetKey: pack.summary.datasetKey,
    datasetVersion: pack.summary.datasetVersion,
    splitKey: pack.summary.splitKey,
    splitStrategy: pack.summary.splitStrategy,
    seed: pack.summary.seed,
    testRatio: pack.summary.testRatio,
    trainRows: pack.summary.trainRows,
    testRows: pack.summary.testRows,
    featureCount: pack.summary.featureCount,
    labelKey: pack.summary.labelKey,
    manifest: pack.manifest as unknown as Record<string, unknown>,
    dataCard: pack.dataCard as unknown as Record<string, unknown>,
    summary: pack.summary as unknown as Record<string, unknown>,
    userId: Number.isFinite(Number(options.userId)) ? Number(options.userId) : null,
  });

  return {
    ...pack,
    exportRecord,
  };
};

export const buildMlTrainingPackageCatalogSummary = async (): Promise<MlTrainingPackageCatalogSummary> => {
  const [currentInventoryStockoutTrainingPackage, lastTrainingPackageExports] = await Promise.all([
    buildInventoryStockoutTrainingPackage({ limit: 10000 }).then((result) => result.summary),
    listMlTrainingPackageExports(10).catch(() => []),
  ]);
  return {
    generatedAt: new Date().toISOString(),
    currentInventoryStockoutTrainingPackage,
    lastTrainingPackageExports,
  };
};
