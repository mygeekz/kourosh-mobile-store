import { allAsync, getAsync, runAsync } from "../../query";
import { clampLimit, safeJson } from "./mlDbUtils";

export const recordMlModelResultImport = async (payload: {
  importKey: string;
  modelKey: string;
  modelVersion: string;
  datasetKey: string;
  datasetVersion: string;
  packageKey: string;
  packageVersion: string;
  splitKey: string;
  splitStrategy: string;
  seed: string;
  testRatio: number;
  labelKey: string;
  threshold: number;
  importedRows: number;
  matchedTestRows: number;
  missingTestRows: number;
  unexpectedRows: number;
  duplicateRows: number;
  accuracyPct?: number | null;
  precisionPct?: number | null;
  recallPct?: number | null;
  f1Pct?: number | null;
  balancedAccuracyPct?: number | null;
  baselineF1Pct?: number | null;
  baselineBalancedAccuracyPct?: number | null;
  metrics?: Record<string, unknown>;
  validation?: Record<string, unknown>;
  comparison?: Record<string, unknown>;
  modelCard?: Record<string, unknown>;
  status: string;
  userId?: number | null;
}) => {
  const result = await runAsync(
    `
      INSERT INTO ml_model_result_imports (
        import_key, model_key, model_version, dataset_key, dataset_version,
        package_key, package_version, split_key, split_strategy, seed, test_ratio,
        label_key, threshold, imported_rows, matched_test_rows, missing_test_rows,
        unexpected_rows, duplicate_rows, accuracy_pct, precision_pct, recall_pct,
        f1_pct, balanced_accuracy_pct, baseline_f1_pct, baseline_balanced_accuracy_pct,
        metrics_json, validation_json, comparison_json, model_card_json, status, user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.importKey,
      payload.modelKey,
      payload.modelVersion,
      payload.datasetKey,
      payload.datasetVersion,
      payload.packageKey,
      payload.packageVersion,
      payload.splitKey,
      payload.splitStrategy,
      payload.seed,
      payload.testRatio,
      payload.labelKey,
      payload.threshold,
      payload.importedRows,
      payload.matchedTestRows,
      payload.missingTestRows,
      payload.unexpectedRows,
      payload.duplicateRows,
      payload.accuracyPct ?? null,
      payload.precisionPct ?? null,
      payload.recallPct ?? null,
      payload.f1Pct ?? null,
      payload.balancedAccuracyPct ?? null,
      payload.baselineF1Pct ?? null,
      payload.baselineBalancedAccuracyPct ?? null,
      safeJson(payload.metrics || {}),
      safeJson(payload.validation || {}),
      safeJson(payload.comparison || {}),
      safeJson(payload.modelCard || {}),
      payload.status,
      payload.userId || null,
    ],
  );
  return getAsync(`SELECT * FROM ml_model_result_imports WHERE id = ?`, [result.lastID]);
};

export const listMlModelResultImports = async (limitInput?: unknown) => {
  const limit = clampLimit(limitInput, 10, 100);
  return allAsync(
    `
      SELECT id, import_key AS importKey, model_key AS modelKey,
             model_version AS modelVersion, dataset_key AS datasetKey,
             dataset_version AS datasetVersion, package_key AS packageKey,
             package_version AS packageVersion, split_key AS splitKey,
             split_strategy AS splitStrategy, seed, test_ratio AS testRatio,
             label_key AS labelKey, threshold, imported_rows AS importedRows,
             matched_test_rows AS matchedTestRows, missing_test_rows AS missingTestRows,
             unexpected_rows AS unexpectedRows, duplicate_rows AS duplicateRows,
             accuracy_pct AS accuracyPct, precision_pct AS precisionPct,
             recall_pct AS recallPct, f1_pct AS f1Pct,
             balanced_accuracy_pct AS balancedAccuracyPct,
             baseline_f1_pct AS baselineF1Pct,
             baseline_balanced_accuracy_pct AS baselineBalancedAccuracyPct,
             status, created_at AS createdAt, user_id AS userId
      FROM ml_model_result_imports
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [limit],
  );
};

export const getMlModelResultImportById = async (idInput: unknown) => {
  const id = Number(idInput);
  if (!Number.isFinite(id) || id <= 0) return null;
  return getAsync(
    `
      SELECT id, import_key AS importKey, model_key AS modelKey,
             model_version AS modelVersion, dataset_key AS datasetKey,
             dataset_version AS datasetVersion, package_key AS packageKey,
             package_version AS packageVersion, split_key AS splitKey,
             split_strategy AS splitStrategy, seed, test_ratio AS testRatio,
             label_key AS labelKey, threshold, imported_rows AS importedRows,
             matched_test_rows AS matchedTestRows, missing_test_rows AS missingTestRows,
             unexpected_rows AS unexpectedRows, duplicate_rows AS duplicateRows,
             accuracy_pct AS accuracyPct, precision_pct AS precisionPct,
             recall_pct AS recallPct, f1_pct AS f1Pct,
             balanced_accuracy_pct AS balancedAccuracyPct,
             baseline_f1_pct AS baselineF1Pct,
             baseline_balanced_accuracy_pct AS baselineBalancedAccuracyPct,
             metrics_json AS metricsJson, validation_json AS validationJson,
             comparison_json AS comparisonJson, model_card_json AS modelCardJson,
             status, created_at AS createdAt, user_id AS userId
      FROM ml_model_result_imports
      WHERE id = ?
    `,
    [id],
  );
};
