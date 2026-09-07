import {
  listMlBaselineBenchmarks,
  recordMlBaselineBenchmark,
} from "../../db/domains/mlDatasets.db";
import type {
  BaselineBenchmarkCandidate,
  BaselineBenchmarkMetrics,
  InventoryStockoutBenchmarkResponse,
  InventoryStockoutBenchmarkSummary,
  InventoryStockoutDatasetRow,
  InventoryStockoutDatasetSplitSummary,
  InventoryStockoutSplitConfig,
  InventoryStockoutTrainTestSplitResponse,
  MlBenchmarkCatalogSummary,
} from "./datasetTypes";
import { buildInventoryStockoutDataset } from "./inventoryStockoutDataset.service";

const DATASET_KEY = "inventory_stockout_baseline_v1" as const;
const DATASET_VERSION = "v1" as const;
const BENCHMARK_KEY = "inventory_stockout_rule_baseline_benchmark_v1" as const;

const clampNumber = (value: unknown, fallback: number, min: number, max: number): number => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(max, numeric));
};

const normalizeSplitConfig = (options: Record<string, unknown> = {}): InventoryStockoutSplitConfig => ({
  seed: String(options.seed || "kourosh-phase2d-v1"),
  testRatio: clampNumber(options.testRatio, 0.2, 0.1, 0.4),
  strategy: options.strategy === "row_hash" ? "row_hash" : "entity_grouped_hash",
  minLabeledRows: Math.round(clampNumber(options.minLabeledRows, 30, 5, 1000)),
});

const stableHash = (value: string): number => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const splitScore = (key: string, seed: string): number => stableHash(`${seed}:${key}`) / 0xffffffff;

const labelValue = (row: InventoryStockoutDatasetRow): 0 | 1 | null => row.label.actualStockoutWithinHorizon;

const countLabels = (rows: InventoryStockoutDatasetRow[]) => ({
  positive: rows.filter((row) => labelValue(row) === 1).length,
  negative: rows.filter((row) => labelValue(row) === 0).length,
});

const splitKeyForRow = (row: InventoryStockoutDatasetRow, strategy: InventoryStockoutSplitConfig["strategy"]): string => {
  if (strategy === "row_hash") return row.rowKey;
  const entity = row.productId == null ? null : String(row.productId);
  return entity ? `product:${entity}` : row.rowKey;
};

const rebalanceIfNeeded = (
  trainRows: InventoryStockoutDatasetRow[],
  testRows: InventoryStockoutDatasetRow[],
): { trainRows: InventoryStockoutDatasetRow[]; testRows: InventoryStockoutDatasetRow[] } => {
  if (trainRows.length && testRows.length) return { trainRows, testRows };
  const combined = [...trainRows, ...testRows].sort((a, b) => a.rowKey.localeCompare(b.rowKey));
  if (combined.length < 2) return { trainRows, testRows };
  const fallbackTestSize = Math.max(1, Math.round(combined.length * 0.2));
  return {
    trainRows: combined.slice(0, Math.max(1, combined.length - fallbackTestSize)),
    testRows: combined.slice(Math.max(1, combined.length - fallbackTestSize)),
  };
};

const createSplitKey = (config: InventoryStockoutSplitConfig): string => (
  `${DATASET_KEY}:${DATASET_VERSION}:${config.strategy}:seed-${config.seed}:test-${config.testRatio}`
);

const buildSplitSummary = (
  config: InventoryStockoutSplitConfig,
  trainRows: InventoryStockoutDatasetRow[],
  testRows: InventoryStockoutDatasetRow[],
  totalUsableRows: number,
): InventoryStockoutDatasetSplitSummary => {
  const trainLabels = countLabels(trainRows);
  const testLabels = countLabels(testRows);
  const blockers: string[] = [];
  const hasBothClassesInTrain = trainLabels.positive > 0 && trainLabels.negative > 0;
  const hasBothClassesInTest = testLabels.positive > 0 && testLabels.negative > 0;

  if (totalUsableRows < config.minLabeledRows) {
    blockers.push(`تعداد ردیف‌های قابل train کمتر از حداقل ${config.minLabeledRows} است.`);
  }
  if (!hasBothClassesInTrain) {
    blockers.push("train split هر دو کلاس stockout و non-stockout را ندارد.");
  }
  if (!hasBothClassesInTest) {
    blockers.push("test split هر دو کلاس stockout و non-stockout را ندارد؛ benchmark قابل اتکا نیست.");
  }
  if (!trainRows.length || !testRows.length) {
    blockers.push("train/test split معتبر ساخته نشد.");
  }

  const status: InventoryStockoutDatasetSplitSummary["status"] = blockers.length
    ? totalUsableRows > 0 ? "warning" : "insufficient_data"
    : "ready";

  const recommendedNextAction = status === "ready"
    ? "Split آماده benchmark است؛ می‌توانید rule baselineها را روی test split ارزیابی کنید."
    : "outcome evaluationهای بیشتری ثبت کنید تا split هر دو کلاس و حجم کافی داشته باشد.";

  return {
    datasetKey: DATASET_KEY,
    datasetVersion: DATASET_VERSION,
    generatedAt: new Date().toISOString(),
    splitKey: createSplitKey(config),
    splitStrategy: config.strategy,
    seed: config.seed,
    testRatio: config.testRatio,
    totalUsableRows,
    trainRows: trainRows.length,
    testRows: testRows.length,
    trainPositiveLabels: trainLabels.positive,
    trainNegativeLabels: trainLabels.negative,
    testPositiveLabels: testLabels.positive,
    testNegativeLabels: testLabels.negative,
    hasBothClassesInTrain,
    hasBothClassesInTest,
    leakagePolicy: config.strategy === "entity_grouped_hash"
      ? "Rows are grouped by product/entity before hashing, so the same product is not intentionally split across train and test."
      : "Rows are split by deterministic row hash; use only for debugging when entity-grouped split is too sparse.",
    status,
    blockers,
    recommendedNextAction,
  };
};

export const buildInventoryStockoutTrainTestSplit = async (
  options: Record<string, unknown> = {},
): Promise<InventoryStockoutTrainTestSplitResponse> => {
  const config = normalizeSplitConfig(options);
  const dataset = await buildInventoryStockoutDataset({
    limit: options.limit || 10000,
    onlyLabeled: true,
  });
  const usableRows = dataset.rows.filter((row) => row.quality.canTrain && labelValue(row) !== null);
  const train: InventoryStockoutDatasetRow[] = [];
  const test: InventoryStockoutDatasetRow[] = [];

  for (const row of usableRows) {
    const key = splitKeyForRow(row, config.strategy);
    if (splitScore(key, config.seed) < config.testRatio) test.push(row);
    else train.push(row);
  }

  const balanced = rebalanceIfNeeded(train, test);
  const summary = buildSplitSummary(config, balanced.trainRows, balanced.testRows, usableRows.length);

  return {
    generatedAt: new Date().toISOString(),
    config,
    summary,
    trainRows: balanced.trainRows,
    testRows: balanced.testRows,
  };
};

const pct = (numerator: number, denominator: number): number | null => {
  if (!denominator) return null;
  return Math.round((numerator / denominator) * 10000) / 100;
};

const buildMetrics = (confusionMatrix: BaselineBenchmarkCandidate["confusionMatrix"]): BaselineBenchmarkMetrics => {
  const { truePositive, trueNegative, falsePositive, falseNegative } = confusionMatrix;
  const total = truePositive + trueNegative + falsePositive + falseNegative;
  const precision = pct(truePositive, truePositive + falsePositive);
  const recall = pct(truePositive, truePositive + falseNegative);
  const specificity = pct(trueNegative, trueNegative + falsePositive);
  const f1 = precision == null || recall == null || precision + recall === 0
    ? null
    : Math.round((2 * precision * recall / (precision + recall)) * 100) / 100;
  const balancedAccuracy = recall == null || specificity == null
    ? null
    : Math.round(((recall + specificity) / 2) * 100) / 100;

  return {
    accuracyPct: pct(truePositive + trueNegative, total),
    precisionPct: precision,
    recallPct: recall,
    specificityPct: specificity,
    f1Pct: f1,
    balancedAccuracyPct: balancedAccuracy,
    falsePositiveRatePct: pct(falsePositive, falsePositive + trueNegative),
    falseNegativeRatePct: pct(falseNegative, falseNegative + truePositive),
  };
};

type CandidateDefinition = {
  key: string;
  label: string;
  description: string;
  predict: (row: InventoryStockoutDatasetRow) => 0 | 1;
};

const candidateDefinitions: CandidateDefinition[] = [
  {
    key: "rule_baseline_v1",
    label: "Rule/Statistical Baseline v1",
    description: "Uses the prediction-time baseline risk flag stored in the feature snapshot.",
    predict: (row) => row.features.baselinePredictedRisk ? 1 : 0,
  },
  {
    key: "days_to_stockout_horizon",
    label: "Days-to-stockout horizon rule",
    description: "Predicts stockout when predicted days-to-stockout is inside the prediction horizon.",
    predict: (row) => {
      const days = row.features.daysToStockoutPredicted;
      const horizon = row.horizonDays;
      return days != null && horizon != null && days <= horizon ? 1 : 0;
    },
  },
  {
    key: "severity_medium_plus",
    label: "Severity medium-plus rule",
    description: "Predicts stockout when severity score is medium, high, or critical.",
    predict: (row) => row.features.severityScore >= 2 ? 1 : 0,
  },
  {
    key: "stock_below_threshold",
    label: "Stock below threshold rule",
    description: "Predicts stockout when current stock is at or below reorder threshold.",
    predict: (row) => {
      const stock = row.features.stockQuantity;
      const threshold = row.features.thresholdQty;
      return stock != null && threshold != null && stock <= threshold ? 1 : 0;
    },
  },
  {
    key: "always_non_stockout_reference",
    label: "Always non-stockout reference",
    description: "A weak reference baseline used to detect misleading class imbalance.",
    predict: () => 0,
  },
];

const evaluateCandidate = (
  definition: CandidateDefinition,
  testRows: InventoryStockoutDatasetRow[],
): BaselineBenchmarkCandidate => {
  const confusionMatrix = {
    truePositive: 0,
    trueNegative: 0,
    falsePositive: 0,
    falseNegative: 0,
  };

  for (const row of testRows) {
    const actual = labelValue(row);
    if (actual == null) continue;
    const predicted = definition.predict(row);
    if (predicted === 1 && actual === 1) confusionMatrix.truePositive += 1;
    else if (predicted === 0 && actual === 0) confusionMatrix.trueNegative += 1;
    else if (predicted === 1 && actual === 0) confusionMatrix.falsePositive += 1;
    else if (predicted === 0 && actual === 1) confusionMatrix.falseNegative += 1;
  }

  const metrics = buildMetrics(confusionMatrix);
  const warnings: string[] = [];
  if (metrics.recallPct === 0) warnings.push("این baseline هیچ stockout واقعی را پیدا نکرده است.");
  if (metrics.precisionPct === 0) warnings.push("این baseline هشدارهای stockout اشتباه زیادی دارد یا true positive ندارد.");
  if (definition.key === "always_non_stockout_reference" && (metrics.accuracyPct || 0) > 70) {
    warnings.push("accuracy خام ممکن است به‌خاطر imbalance گمراه‌کننده باشد؛ balanced accuracy و F1 را ملاک قرار دهید.");
  }

  return {
    key: definition.key,
    label: definition.label,
    description: definition.description,
    confusionMatrix,
    metrics,
    warnings,
  };
};

const candidateSortScore = (candidate: BaselineBenchmarkCandidate): number => {
  const f1 = candidate.metrics.f1Pct ?? -1;
  const balanced = candidate.metrics.balancedAccuracyPct ?? -1;
  const recall = candidate.metrics.recallPct ?? -1;
  return f1 * 1000000 + balanced * 1000 + recall;
};

const buildBenchmarkSummary = (
  split: InventoryStockoutTrainTestSplitResponse,
  candidates: BaselineBenchmarkCandidate[],
): InventoryStockoutBenchmarkSummary => {
  const ranked = [...candidates].sort((a, b) => candidateSortScore(b) - candidateSortScore(a));
  const bestCandidate = ranked[0] || null;
  const blockers = [...split.summary.blockers];

  if (!split.summary.testRows) blockers.push("هیچ test row برای benchmark وجود ندارد.");
  if (!candidates.length) blockers.push("هیچ baseline candidate قابل ارزیابی نیست.");

  const status: InventoryStockoutBenchmarkSummary["status"] = blockers.length
    ? split.summary.totalUsableRows > 0 ? "warning" : "insufficient_data"
    : "ready";

  const recommendedNextAction = status === "ready"
    ? "Benchmark rule baseline ذخیره‌پذیر است؛ مرحله بعدی می‌تواند export train/test و سپس baseline ML خارج از اپلیکیشن باشد."
    : "prediction outcomeهای بیشتری ارزیابی کنید تا benchmark test split قابل اتکاتر شود.";

  return {
    benchmarkKey: BENCHMARK_KEY,
    datasetKey: DATASET_KEY,
    datasetVersion: DATASET_VERSION,
    generatedAt: new Date().toISOString(),
    evaluatedOn: "test_split",
    totalRows: split.summary.totalUsableRows,
    trainRows: split.summary.trainRows,
    testRows: split.summary.testRows,
    bestCandidateKey: bestCandidate?.key || null,
    bestCandidateLabel: bestCandidate?.label || null,
    bestF1Pct: bestCandidate?.metrics.f1Pct ?? null,
    bestBalancedAccuracyPct: bestCandidate?.metrics.balancedAccuracyPct ?? null,
    status,
    blockers,
    recommendedNextAction,
  };
};

export const buildInventoryStockoutBaselineBenchmark = async (
  options: Record<string, unknown> = {},
): Promise<InventoryStockoutBenchmarkResponse> => {
  const split = await buildInventoryStockoutTrainTestSplit(options);
  const candidates = candidateDefinitions.map((definition) => evaluateCandidate(definition, split.testRows));
  const summary = buildBenchmarkSummary(split, candidates);
  const bestCandidate = candidates.find((candidate) => candidate.key === summary.bestCandidateKey) || null;

  return {
    generatedAt: new Date().toISOString(),
    summary,
    split: split.summary,
    candidates,
    bestCandidate,
    benchmarkPolicy: {
      trainingPolicy: "No real ML training is performed in Phase 2D; this benchmark only scores deterministic baseline rules.",
      leakagePolicy: split.summary.leakagePolicy,
      scoringPolicy: "Candidates are ranked by F1, then balanced accuracy, then recall to avoid raw accuracy bias.",
    },
  };
};

export const recordInventoryStockoutBaselineBenchmark = async (
  options: Record<string, unknown> = {},
): Promise<InventoryStockoutBenchmarkResponse> => {
  const benchmark = await buildInventoryStockoutBaselineBenchmark(options);
  const exportRecord = await recordMlBaselineBenchmark({
    benchmarkKey: benchmark.summary.benchmarkKey,
    datasetKey: benchmark.summary.datasetKey,
    datasetVersion: benchmark.summary.datasetVersion,
    splitKey: benchmark.split.splitKey,
    splitStrategy: benchmark.split.splitStrategy,
    seed: benchmark.split.seed,
    testRatio: benchmark.split.testRatio,
    trainRows: benchmark.summary.trainRows,
    testRows: benchmark.summary.testRows,
    bestCandidateKey: benchmark.summary.bestCandidateKey,
    bestF1Pct: benchmark.summary.bestF1Pct,
    bestBalancedAccuracyPct: benchmark.summary.bestBalancedAccuracyPct,
    metrics: { candidates: benchmark.candidates, bestCandidate: benchmark.bestCandidate },
    summary: benchmark.summary,
    userId: Number.isFinite(Number(options.userId)) ? Number(options.userId) : null,
  });

  return {
    ...benchmark,
    exportRecord,
  };
};

export const buildMlBenchmarkCatalogSummary = async (): Promise<MlBenchmarkCatalogSummary> => {
  const [currentInventoryStockoutBenchmark, lastBenchmarks] = await Promise.all([
    buildInventoryStockoutBaselineBenchmark({ limit: 10000 }).then((result) => result.summary),
    listMlBaselineBenchmarks(10).catch(() => []),
  ]);
  return {
    generatedAt: new Date().toISOString(),
    currentInventoryStockoutBenchmark,
    lastBenchmarks,
  };
};
