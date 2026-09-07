import { allAsync, getAsync, runAsync } from "../../query";
import { clampLimit, safeJson } from "./mlDbUtils";

export const recordMlShadowEvaluation = async (payload: {
  evaluationKey: string;
  importId: number;
  approvalReviewId?: number | null;
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
  evaluatedRows: number;
  candidateF1Pct?: number | null;
  baselineF1Pct?: number | null;
  deltaF1Pct?: number | null;
  candidateBalancedAccuracyPct?: number | null;
  baselineBalancedAccuracyPct?: number | null;
  deltaBalancedAccuracyPct?: number | null;
  status: string;
  summary?: Record<string, unknown>;
  policy?: Record<string, unknown>;
  userId?: number | null;
}) => {
  const result = await runAsync(
    `
      INSERT INTO ml_shadow_evaluations (
        evaluation_key, import_id, approval_review_id, model_key, model_version,
        dataset_key, dataset_version, package_key, package_version, split_key,
        split_strategy, seed, test_ratio, evaluated_rows, candidate_f1_pct,
        baseline_f1_pct, delta_f1_pct, candidate_balanced_accuracy_pct,
        baseline_balanced_accuracy_pct, delta_balanced_accuracy_pct, status,
        summary_json, policy_json, user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.evaluationKey,
      payload.importId,
      payload.approvalReviewId || null,
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
      payload.evaluatedRows,
      payload.candidateF1Pct ?? null,
      payload.baselineF1Pct ?? null,
      payload.deltaF1Pct ?? null,
      payload.candidateBalancedAccuracyPct ?? null,
      payload.baselineBalancedAccuracyPct ?? null,
      payload.deltaBalancedAccuracyPct ?? null,
      payload.status,
      safeJson(payload.summary || {}),
      safeJson(payload.policy || {}),
      payload.userId || null,
    ],
  );
  return getAsync(`SELECT * FROM ml_shadow_evaluations WHERE id = ?`, [result.lastID]);
};

export const listMlShadowEvaluations = async (limitInput?: unknown) => {
  const limit = clampLimit(limitInput, 10, 100);
  return allAsync(
    `
      SELECT id, evaluation_key AS evaluationKey, import_id AS importId,
             approval_review_id AS approvalReviewId, model_key AS modelKey,
             model_version AS modelVersion, dataset_key AS datasetKey,
             dataset_version AS datasetVersion, package_key AS packageKey,
             package_version AS packageVersion, split_key AS splitKey,
             split_strategy AS splitStrategy, seed, test_ratio AS testRatio,
             evaluated_rows AS evaluatedRows, candidate_f1_pct AS candidateF1Pct,
             baseline_f1_pct AS baselineF1Pct, delta_f1_pct AS deltaF1Pct,
             candidate_balanced_accuracy_pct AS candidateBalancedAccuracyPct,
             baseline_balanced_accuracy_pct AS baselineBalancedAccuracyPct,
             delta_balanced_accuracy_pct AS deltaBalancedAccuracyPct,
             status, created_at AS createdAt, user_id AS userId
      FROM ml_shadow_evaluations
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [limit],
  );
};

export const listMlShadowEvaluationsByImportId = async (importIdInput: unknown, limitInput?: unknown) => {
  const importId = Number(importIdInput);
  if (!Number.isFinite(importId) || importId <= 0) return [];
  const limit = clampLimit(limitInput, 5, 50);
  return allAsync(
    `
      SELECT id, evaluation_key AS evaluationKey, import_id AS importId,
             approval_review_id AS approvalReviewId, model_key AS modelKey,
             model_version AS modelVersion, dataset_key AS datasetKey,
             dataset_version AS datasetVersion, package_key AS packageKey,
             package_version AS packageVersion, split_key AS splitKey,
             split_strategy AS splitStrategy, seed, test_ratio AS testRatio,
             evaluated_rows AS evaluatedRows, candidate_f1_pct AS candidateF1Pct,
             baseline_f1_pct AS baselineF1Pct, delta_f1_pct AS deltaF1Pct,
             candidate_balanced_accuracy_pct AS candidateBalancedAccuracyPct,
             baseline_balanced_accuracy_pct AS baselineBalancedAccuracyPct,
             delta_balanced_accuracy_pct AS deltaBalancedAccuracyPct,
             status, created_at AS createdAt, user_id AS userId
      FROM ml_shadow_evaluations
      WHERE import_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [importId, limit],
  );
};
