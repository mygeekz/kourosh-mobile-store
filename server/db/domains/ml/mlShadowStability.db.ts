import { allAsync, getAsync, runAsync } from "../../query";
import { clampLimit, safeJson } from "./mlDbUtils";

export const recordMlShadowStabilityCheck = async (payload: {
  gateKey: string;
  importId?: number | null;
  modelKey?: string | null;
  modelVersion?: string | null;
  minimumEvaluations: number;
  lookbackEvaluations: number;
  evaluationsConsidered: number;
  candidateAvgF1Pct?: number | null;
  baselineAvgF1Pct?: number | null;
  avgDeltaF1Pct?: number | null;
  candidateAvgBalancedAccuracyPct?: number | null;
  baselineAvgBalancedAccuracyPct?: number | null;
  avgDeltaBalancedAccuracyPct?: number | null;
  positiveDeltaF1Count: number;
  positiveDeltaBalancedAccuracyCount: number;
  underperformingCount: number;
  blockedCount: number;
  readyCount: number;
  watchCount: number;
  status: string;
  stableEnoughForOfflinePilot: boolean;
  summary?: Record<string, unknown>;
  policy?: Record<string, unknown>;
  userId?: number | null;
}) => {
  const result = await runAsync(
    `
      INSERT INTO ml_shadow_stability_checks (
        gate_key, import_id, model_key, model_version, minimum_evaluations,
        lookback_evaluations, evaluations_considered, candidate_avg_f1_pct,
        baseline_avg_f1_pct, avg_delta_f1_pct, candidate_avg_balanced_accuracy_pct,
        baseline_avg_balanced_accuracy_pct, avg_delta_balanced_accuracy_pct,
        positive_delta_f1_count, positive_delta_balanced_accuracy_count,
        underperforming_count, blocked_count, ready_count, watch_count, status,
        stable_enough_for_offline_pilot, summary_json, policy_json, user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.gateKey,
      payload.importId || null,
      payload.modelKey || null,
      payload.modelVersion || null,
      payload.minimumEvaluations,
      payload.lookbackEvaluations,
      payload.evaluationsConsidered,
      payload.candidateAvgF1Pct ?? null,
      payload.baselineAvgF1Pct ?? null,
      payload.avgDeltaF1Pct ?? null,
      payload.candidateAvgBalancedAccuracyPct ?? null,
      payload.baselineAvgBalancedAccuracyPct ?? null,
      payload.avgDeltaBalancedAccuracyPct ?? null,
      payload.positiveDeltaF1Count,
      payload.positiveDeltaBalancedAccuracyCount,
      payload.underperformingCount,
      payload.blockedCount,
      payload.readyCount,
      payload.watchCount,
      payload.status,
      payload.stableEnoughForOfflinePilot ? 1 : 0,
      safeJson(payload.summary || {}),
      safeJson(payload.policy || {}),
      payload.userId || null,
    ],
  );
  return getAsync(`SELECT * FROM ml_shadow_stability_checks WHERE id = ?`, [result.lastID]);
};

export const listMlShadowStabilityChecks = async (limitInput?: unknown) => {
  const limit = clampLimit(limitInput, 10, 100);
  return allAsync(
    `
      SELECT id, gate_key AS gateKey, import_id AS importId,
             model_key AS modelKey, model_version AS modelVersion,
             minimum_evaluations AS minimumEvaluations,
             lookback_evaluations AS lookbackEvaluations,
             evaluations_considered AS evaluationsConsidered,
             candidate_avg_f1_pct AS candidateAvgF1Pct,
             baseline_avg_f1_pct AS baselineAvgF1Pct,
             avg_delta_f1_pct AS avgDeltaF1Pct,
             candidate_avg_balanced_accuracy_pct AS candidateAvgBalancedAccuracyPct,
             baseline_avg_balanced_accuracy_pct AS baselineAvgBalancedAccuracyPct,
             avg_delta_balanced_accuracy_pct AS avgDeltaBalancedAccuracyPct,
             positive_delta_f1_count AS positiveDeltaF1Count,
             positive_delta_balanced_accuracy_count AS positiveDeltaBalancedAccuracyCount,
             underperforming_count AS underperformingCount,
             blocked_count AS blockedCount, ready_count AS readyCount,
             watch_count AS watchCount, status,
             stable_enough_for_offline_pilot AS stableEnoughForOfflinePilot,
             created_at AS createdAt, user_id AS userId
      FROM ml_shadow_stability_checks
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [limit],
  );
};

export const listMlShadowStabilityChecksByImportId = async (importIdInput: unknown, limitInput?: unknown) => {
  const importId = Number(importIdInput);
  if (!Number.isFinite(importId) || importId <= 0) return [];
  const limit = clampLimit(limitInput, 5, 50);
  return allAsync(
    `
      SELECT id, gate_key AS gateKey, import_id AS importId,
             model_key AS modelKey, model_version AS modelVersion,
             minimum_evaluations AS minimumEvaluations,
             lookback_evaluations AS lookbackEvaluations,
             evaluations_considered AS evaluationsConsidered,
             candidate_avg_f1_pct AS candidateAvgF1Pct,
             baseline_avg_f1_pct AS baselineAvgF1Pct,
             avg_delta_f1_pct AS avgDeltaF1Pct,
             candidate_avg_balanced_accuracy_pct AS candidateAvgBalancedAccuracyPct,
             baseline_avg_balanced_accuracy_pct AS baselineAvgBalancedAccuracyPct,
             avg_delta_balanced_accuracy_pct AS avgDeltaBalancedAccuracyPct,
             positive_delta_f1_count AS positiveDeltaF1Count,
             positive_delta_balanced_accuracy_count AS positiveDeltaBalancedAccuracyCount,
             underperforming_count AS underperformingCount,
             blocked_count AS blockedCount, ready_count AS readyCount,
             watch_count AS watchCount, status,
             stable_enough_for_offline_pilot AS stableEnoughForOfflinePilot,
             created_at AS createdAt, user_id AS userId
      FROM ml_shadow_stability_checks
      WHERE import_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [importId, limit],
  );
};
