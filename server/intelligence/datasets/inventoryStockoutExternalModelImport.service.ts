import {
  listMlModelResultImports,
  recordMlModelResultImport,
} from "../../db/domains/mlDatasets.db";
import type {
  BaselineBenchmarkMetrics,
  ExternalModelImportContract,
  ExternalModelImportIssue,
  ExternalModelImportPredictionRow,
  ExternalModelImportRequest,
  ExternalModelImportValidationResponse,
  ExternalModelImportValidationSummary,
  InventoryStockoutDatasetRow,
  MlModelImportCatalogSummary,
} from "./datasetTypes";
import { buildInventoryStockoutBaselineBenchmark } from "./inventoryStockoutBenchmark.service";
import { buildInventoryStockoutTrainingPackage } from "./inventoryStockoutTrainingPackage.service";

const CONTRACT_KEY = "inventory_stockout_external_model_result_import_v1" as const;
const CONTRACT_VERSION = "v1" as const;
const DATASET_KEY = "inventory_stockout_baseline_v1" as const;
const DATASET_VERSION = "v1" as const;
const PACKAGE_KEY = "inventory_stockout_external_training_package_v1" as const;
const PACKAGE_VERSION = "v1" as const;
const LABEL_KEY = "actual_stockout_within_horizon" as const;

const clampThreshold = (value: unknown): number => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0.5;
  return Math.max(0, Math.min(1, numeric));
};

const roundPct = (value: number | null): number | null => (
  value == null || !Number.isFinite(value) ? null : Math.round(value * 100) / 100
);

const pct = (numerator: number, denominator: number): number | null => {
  if (!denominator) return null;
  return roundPct((numerator / denominator) * 100);
};

const metricDelta = (candidate: number | null, baseline: number | null): number | null => {
  if (candidate == null || baseline == null) return null;
  return roundPct(candidate - baseline);
};

const normalizeText = (value: unknown): string | null => {
  const text = String(value || "").trim();
  return text || null;
};

const normalizePredictionRows = (
  input: unknown,
  threshold: number,
  issues: ExternalModelImportIssue[],
): ExternalModelImportPredictionRow[] => {
  if (!Array.isArray(input)) {
    issues.push({
      key: "predictions_missing",
      severity: "blocker",
      message: "فیلد predictions باید آرایه‌ای از rowKey و predictedProbability باشد.",
    });
    return [];
  }

  return input.flatMap((raw, index) => {
    const row = raw as Record<string, unknown>;
    const rowKey = normalizeText(row?.rowKey);
    const probability = Number(row?.predictedProbability);
    const predictedLabelRaw = row?.predictedLabel;
    const normalizedLabel = predictedLabelRaw == null || predictedLabelRaw === ""
      ? undefined
      : Number(predictedLabelRaw) === 1 ? 1 : Number(predictedLabelRaw) === 0 ? 0 : undefined;

    if (!rowKey) {
      issues.push({
        key: "prediction_row_missing_row_key",
        severity: "blocker",
        message: `ردیف prediction شماره ${index + 1} rowKey معتبر ندارد.`,
      });
      return [];
    }
    if (!Number.isFinite(probability) || probability < 0 || probability > 1) {
      issues.push({
        key: "prediction_probability_out_of_range",
        severity: "blocker",
        message: `predictedProbability برای rowKey ${rowKey} باید عددی بین ۰ و ۱ باشد.`,
      });
      return [];
    }
    if (predictedLabelRaw != null && predictedLabelRaw !== "" && normalizedLabel == null) {
      issues.push({
        key: "prediction_label_invalid",
        severity: "blocker",
        message: `predictedLabel برای rowKey ${rowKey} باید ۰ یا ۱ باشد.`,
      });
      return [];
    }
    if (normalizedLabel != null) {
      const thresholdLabel = probability >= threshold ? 1 : 0;
      if (normalizedLabel !== thresholdLabel) {
        issues.push({
          key: "prediction_label_threshold_mismatch",
          severity: "warning",
          message: `predictedLabel برای rowKey ${rowKey} با threshold ${threshold} هم‌خوان نیست؛ برای metric همان label ارسال‌شده استفاده شد.`,
        });
      }
    }

    return [{ rowKey, predictedProbability: probability, predictedLabel: normalizedLabel }];
  });
};

const labelValue = (row: InventoryStockoutDatasetRow): 0 | 1 | null => row.label.actualStockoutWithinHorizon;

const computeMetrics = (pairs: Array<{ actual: 0 | 1; predicted: 0 | 1 }>): BaselineBenchmarkMetrics => {
  let truePositive = 0;
  let trueNegative = 0;
  let falsePositive = 0;
  let falseNegative = 0;

  for (const pair of pairs) {
    if (pair.predicted === 1 && pair.actual === 1) truePositive += 1;
    else if (pair.predicted === 0 && pair.actual === 0) trueNegative += 1;
    else if (pair.predicted === 1 && pair.actual === 0) falsePositive += 1;
    else falseNegative += 1;
  }

  const precision = pct(truePositive, truePositive + falsePositive);
  const recall = pct(truePositive, truePositive + falseNegative);
  const specificity = pct(trueNegative, trueNegative + falsePositive);
  const f1 = precision == null || recall == null || precision + recall === 0
    ? null
    : roundPct((2 * precision * recall) / (precision + recall));
  const balancedAccuracy = recall == null || specificity == null ? null : roundPct((recall + specificity) / 2);

  return {
    accuracyPct: pct(truePositive + trueNegative, pairs.length),
    precisionPct: precision,
    recallPct: recall,
    specificityPct: specificity,
    f1Pct: f1,
    balancedAccuracyPct: balancedAccuracy,
    falsePositiveRatePct: pct(falsePositive, falsePositive + trueNegative),
    falseNegativeRatePct: pct(falseNegative, falseNegative + truePositive),
  };
};

export const buildInventoryStockoutExternalModelImportContract = (): ExternalModelImportContract => ({
  contractKey: CONTRACT_KEY,
  contractVersion: CONTRACT_VERSION,
  generatedAt: new Date().toISOString(),
  purpose: "Validate, score, compare, and audit results from an externally trained inventory stockout model without adding an inference runtime to Kourosh.",
  acceptedDatasetKey: DATASET_KEY,
  acceptedPackageKey: PACKAGE_KEY,
  labelKey: LABEL_KEY,
  expectedPredictionSchema: {
    rowKey: "string",
    predictedProbability: "number:0..1",
    predictedLabel: "optional binary 0|1; if omitted, threshold is applied",
  },
  requiredTopLevelFields: ["modelKey", "modelVersion", "predictions"],
  optionalTopLevelFields: ["threshold", "seed", "testRatio", "strategy", "modelCard"],
  validationRules: [
    "Only prediction rows for the fixed inventory stockout test split are accepted.",
    "Each rowKey must be unique and must match a test row in the exported training package.",
    "predictedProbability must be between 0 and 1.",
    "If predictedLabel is omitted, threshold is applied to predictedProbability.",
    "Metrics are calculated only on matched labeled test rows.",
  ],
  forbiddenBehavior: [
    "Do not import executable model artifacts into Kourosh in this phase.",
    "Do not add Python, FastAPI, MLflow, sklearn, XGBoost, LightGBM, neural networks, or external AI API calls.",
    "Do not expose an inference endpoint or change official inventory/accounting calculations.",
    "Do not treat imported metrics as production approval.",
  ],
  exampleRequest: {
    modelKey: "inventory_stockout_external_candidate_001",
    modelVersion: "offline-2026-07-01",
    threshold: 0.5,
    predictions: [
      { rowKey: "inventory_stockout_baseline_v1:v1:run-123:snapshot-456:product-42", predictedProbability: 0.82 },
    ],
    modelCard: {
      algorithmFamily: "external_offline_model",
      trainedOutsideKourosh: true,
      notes: "Attach only metadata and row-level predictions, not a model binary.",
    },
  },
});

const buildRecommendedNextAction = (
  status: ExternalModelImportValidationSummary["status"],
  comparison: ExternalModelImportValidationSummary["comparison"],
): string => {
  if (status === "rejected") return "payload import را اصلاح کنید؛ Kourosh فقط predictionهای JSON مطابق contract را می‌پذیرد.";
  if (status === "insufficient_data") return "قبل از import نتیجه مدل بیرونی، test split labeled و benchmark قابل اتکا بسازید.";
  if (comparison.beatsBaselineOnF1 === true && comparison.beatsBaselineOnBalancedAccuracy === true) {
    return "نتیجه external model از baseline بهتر است؛ در فاز بعدی می‌توانید model card و approval workflow را formalize کنید، نه inference runtime.";
  }
  return "نتیجه را فقط برای audit نگه دارید؛ تا وقتی برتری پایدار نسبت به baseline اثبات نشده، آن را وارد تصمیم عملیاتی نکنید.";
};

export const validateInventoryStockoutExternalModelResults = async (
  request: ExternalModelImportRequest = {},
  shouldRecord = false,
): Promise<ExternalModelImportValidationResponse> => {
  const generatedAt = new Date().toISOString();
  const contract = buildInventoryStockoutExternalModelImportContract();
  const threshold = clampThreshold(request.threshold);
  const issues: ExternalModelImportIssue[] = [];
  const modelKey = normalizeText(request.modelKey);
  const modelVersion = normalizeText(request.modelVersion);

  if (!modelKey) {
    issues.push({ key: "model_key_missing", severity: "blocker", message: "modelKey برای import نتیجه مدل بیرونی الزامی است." });
  }
  if (!modelVersion) {
    issues.push({ key: "model_version_missing", severity: "blocker", message: "modelVersion برای import نتیجه مدل بیرونی الزامی است." });
  }
  if (request.datasetKey && request.datasetKey !== DATASET_KEY) {
    issues.push({ key: "dataset_key_mismatch", severity: "blocker", message: `فقط dataset ${DATASET_KEY} در این contract پذیرفته می‌شود.` });
  }
  if (request.packageKey && request.packageKey !== PACKAGE_KEY) {
    issues.push({ key: "package_key_mismatch", severity: "blocker", message: `فقط package ${PACKAGE_KEY} در این contract پذیرفته می‌شود.` });
  }
  if (threshold !== Number(request.threshold ?? threshold) && request.threshold != null) {
    issues.push({ key: "threshold_clamped", severity: "warning", message: "threshold خارج از بازه ۰ تا ۱ بود و clamp شد." });
  }

  const predictions = normalizePredictionRows(request.predictions, threshold, issues);
  const duplicateCounts = new Map<string, number>();
  for (const row of predictions) duplicateCounts.set(row.rowKey, (duplicateCounts.get(row.rowKey) || 0) + 1);
  const duplicateRows = Array.from(duplicateCounts.values()).reduce((sum, count) => sum + Math.max(0, count - 1), 0);
  if (duplicateRows > 0) {
    issues.push({ key: "duplicate_prediction_rows", severity: "blocker", message: `${duplicateRows} prediction row تکراری بر اساس rowKey پیدا شد.` });
  }

  const splitOptions = {
    seed: request.seed,
    testRatio: request.testRatio,
    strategy: request.strategy,
  } as Record<string, unknown>;
  const trainingPackage = await buildInventoryStockoutTrainingPackage(splitOptions);
  const benchmark = await buildInventoryStockoutBaselineBenchmark(splitOptions);
  const expectedByRowKey = new Map(trainingPackage.testRows.map((row) => [row.rowKey, row]));
  const predictionByRowKey = new Map(predictions.map((row) => [row.rowKey, row]));

  const missingKeys = trainingPackage.testRows
    .map((row) => row.rowKey)
    .filter((rowKey) => !predictionByRowKey.has(rowKey));
  const unexpectedKeys = predictions
    .map((row) => row.rowKey)
    .filter((rowKey) => !expectedByRowKey.has(rowKey));

  if (!trainingPackage.testRows.length) {
    issues.push({ key: "no_test_rows", severity: "blocker", message: "test split ردیف labeled ندارد؛ import قابل امتیازدهی نیست." });
  }
  if (missingKeys.length) {
    issues.push({ key: "missing_test_predictions", severity: "blocker", message: `${missingKeys.length} rowKey از test split در predictions ارسال نشده است.` });
  }
  if (unexpectedKeys.length) {
    issues.push({ key: "unexpected_prediction_rows", severity: "blocker", message: `${unexpectedKeys.length} prediction row خارج از test split ارسال شده است.` });
  }
  if (benchmark.summary.status === "insufficient_data") {
    issues.push({ key: "benchmark_insufficient_data", severity: "warning", message: "baseline benchmark هنوز insufficient_data است؛ مقایسه external model قطعی نیست." });
  }
  if (!trainingPackage.summary.blockers.length && !predictions.length) {
    issues.push({ key: "empty_predictions", severity: "blocker", message: "هیچ prediction معتبری برای import ارسال نشده است." });
  }

  const acceptedPredictions = trainingPackage.testRows.flatMap((row) => {
    const prediction = predictionByRowKey.get(row.rowKey);
    const actual = labelValue(row);
    if (!prediction || actual == null) return [];
    const predictedLabelResolved = prediction.predictedLabel ?? (prediction.predictedProbability >= threshold ? 1 : 0);
    return [{ ...prediction, actualLabel: actual, predictedLabelResolved }];
  });

  const metrics = computeMetrics(acceptedPredictions.map((row) => ({
    actual: row.actualLabel,
    predicted: row.predictedLabelResolved,
  })));

  const baselineF1 = benchmark.summary.bestF1Pct ?? null;
  const baselineBalancedAccuracy = benchmark.summary.bestBalancedAccuracyPct ?? null;
  const comparison = {
    deltaF1Pct: metricDelta(metrics.f1Pct, baselineF1),
    deltaBalancedAccuracyPct: metricDelta(metrics.balancedAccuracyPct, baselineBalancedAccuracy),
    beatsBaselineOnF1: metrics.f1Pct == null || baselineF1 == null ? null : metrics.f1Pct > baselineF1,
    beatsBaselineOnBalancedAccuracy: metrics.balancedAccuracyPct == null || baselineBalancedAccuracy == null ? null : metrics.balancedAccuracyPct > baselineBalancedAccuracy,
  };

  const blockerCount = issues.filter((issue) => issue.severity === "blocker").length;
  const warningCount = issues.filter((issue) => issue.severity === "warning").length;
  const status: ExternalModelImportValidationSummary["status"] = blockerCount
    ? trainingPackage.testRows.length ? "rejected" : "insufficient_data"
    : warningCount ? "warning" : "validated";

  const summary: ExternalModelImportValidationSummary = {
    contractKey: CONTRACT_KEY,
    generatedAt,
    modelKey,
    modelVersion,
    datasetKey: DATASET_KEY,
    datasetVersion: DATASET_VERSION,
    packageKey: PACKAGE_KEY,
    packageVersion: PACKAGE_VERSION,
    splitKey: trainingPackage.summary.splitKey,
    splitStrategy: trainingPackage.summary.splitStrategy,
    seed: trainingPackage.summary.seed,
    testRatio: trainingPackage.summary.testRatio,
    labelKey: LABEL_KEY,
    threshold,
    expectedTestRows: trainingPackage.testRows.length,
    importedRows: predictions.length,
    matchedTestRows: acceptedPredictions.length,
    missingTestRows: missingKeys.length,
    unexpectedRows: unexpectedKeys.length,
    duplicateRows,
    metrics,
    baseline: {
      bestCandidateKey: benchmark.summary.bestCandidateKey,
      bestCandidateLabel: benchmark.summary.bestCandidateLabel,
      f1Pct: baselineF1,
      balancedAccuracyPct: baselineBalancedAccuracy,
    },
    comparison,
    status,
    issues,
    recommendedNextAction: "",
  };
  summary.recommendedNextAction = buildRecommendedNextAction(status, comparison);

  let importRecord: Record<string, unknown> | null = null;
  if (shouldRecord && status !== "rejected" && status !== "insufficient_data") {
    importRecord = await recordMlModelResultImport({
      importKey: `${CONTRACT_KEY}:${modelKey}:${modelVersion}:${generatedAt}`,
      modelKey: modelKey || "unknown_external_model",
      modelVersion: modelVersion || "unknown_version",
      datasetKey: DATASET_KEY,
      datasetVersion: DATASET_VERSION,
      packageKey: PACKAGE_KEY,
      packageVersion: PACKAGE_VERSION,
      splitKey: summary.splitKey,
      splitStrategy: summary.splitStrategy,
      seed: summary.seed,
      testRatio: summary.testRatio,
      labelKey: LABEL_KEY,
      threshold,
      importedRows: summary.importedRows,
      matchedTestRows: summary.matchedTestRows,
      missingTestRows: summary.missingTestRows,
      unexpectedRows: summary.unexpectedRows,
      duplicateRows: summary.duplicateRows,
      accuracyPct: metrics.accuracyPct,
      precisionPct: metrics.precisionPct,
      recallPct: metrics.recallPct,
      f1Pct: metrics.f1Pct,
      balancedAccuracyPct: metrics.balancedAccuracyPct,
      baselineF1Pct: baselineF1,
      baselineBalancedAccuracyPct: baselineBalancedAccuracy,
      metrics: { ...metrics, acceptedPredictionCount: acceptedPredictions.length },
      validation: { status, issues },
      comparison,
      modelCard: request.modelCard || {},
      status,
      userId: request.userId || null,
    });
  }

  return {
    generatedAt,
    contract,
    summary,
    acceptedPredictions,
    importRecord,
  };
};

export const recordInventoryStockoutExternalModelResults = async (
  request: ExternalModelImportRequest = {},
): Promise<ExternalModelImportValidationResponse> => validateInventoryStockoutExternalModelResults(request, true);

export const buildMlModelImportCatalogSummary = async (): Promise<MlModelImportCatalogSummary> => {
  const generatedAt = new Date().toISOString();
  const lastModelResultImports = await listMlModelResultImports(10);
  const currentValidation = (await validateInventoryStockoutExternalModelResults({ predictions: [] }, false)).summary;
  return {
    generatedAt,
    contract: buildInventoryStockoutExternalModelImportContract(),
    currentValidation,
    lastModelResultImports,
  };
};
