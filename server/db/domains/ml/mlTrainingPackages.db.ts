import { allAsync, getAsync, runAsync } from "../../query";
import { clampLimit, safeJson } from "./mlDbUtils";

export const recordMlTrainingPackageExport = async (payload: {
  packageKey: string;
  packageVersion: string;
  datasetKey: string;
  datasetVersion: string;
  splitKey: string;
  splitStrategy: string;
  seed: string;
  testRatio: number;
  trainRows: number;
  testRows: number;
  featureCount: number;
  labelKey: string;
  manifest?: Record<string, unknown>;
  dataCard?: Record<string, unknown>;
  summary?: Record<string, unknown>;
  userId?: number | null;
}) => {
  const result = await runAsync(
    `
      INSERT INTO ml_training_package_exports (
        package_key, package_version, dataset_key, dataset_version, split_key,
        split_strategy, seed, test_ratio, train_rows, test_rows, feature_count,
        label_key, manifest_json, data_card_json, summary_json, user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.packageKey,
      payload.packageVersion,
      payload.datasetKey,
      payload.datasetVersion,
      payload.splitKey,
      payload.splitStrategy,
      payload.seed,
      payload.testRatio,
      payload.trainRows,
      payload.testRows,
      payload.featureCount,
      payload.labelKey,
      safeJson(payload.manifest || {}),
      safeJson(payload.dataCard || {}),
      safeJson(payload.summary || {}),
      payload.userId || null,
    ],
  );
  return getAsync(`SELECT * FROM ml_training_package_exports WHERE id = ?`, [result.lastID]);
};

export const listMlTrainingPackageExports = async (limitInput?: unknown) => {
  const limit = clampLimit(limitInput, 10, 100);
  return allAsync(
    `
      SELECT id, package_key AS packageKey, package_version AS packageVersion,
             dataset_key AS datasetKey, dataset_version AS datasetVersion,
             split_key AS splitKey, split_strategy AS splitStrategy, seed,
             test_ratio AS testRatio, train_rows AS trainRows, test_rows AS testRows,
             feature_count AS featureCount, label_key AS labelKey,
             created_at AS createdAt, user_id AS userId
      FROM ml_training_package_exports
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [limit],
  );
};
