import { allAsync, getAsync, runAsync } from "../query";
import type { BaselinePredictionType, PredictionEvaluationRecord } from "../../intelligence/evaluation/predictionEvaluationTypes";

export type PredictionRunForEvaluation = Record<string, any>;

const safeJson = (value: unknown): string => {
  try {
    return JSON.stringify(value ?? null);
  } catch (_err) {
    return JSON.stringify({ serializationError: true });
  }
};

const clampLimit = (value: unknown, fallback = 50, max = 250): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.max(1, Math.min(max, Math.round(parsed)));
};

export const listPredictionRunsForEvaluation = async (options: {
  limit?: unknown;
  readyDateIso?: string;
} = {}): Promise<PredictionRunForEvaluation[]> => {
  const limit = clampLimit(options.limit, 50, 250);
  const readyDateIso = String(options.readyDateIso || new Date().toISOString().slice(0, 10));
  return allAsync(
    `
      SELECT *
      FROM predictive_engine_runs
      WHERE horizonNext7DaysUntil IS NOT NULL
        AND substr(horizonNext7DaysUntil, 1, 10) <= ?
        AND COALESCE(evaluationStatus, status, 'pending') NOT IN ('evaluated', 'skipped', 'insufficient_data')
      ORDER BY createdAt ASC, id ASC
      LIMIT ?
    `,
    [readyDateIso, limit],
  );
};

export const getPredictionRunById = async (
  runId: number,
): Promise<PredictionRunForEvaluation | null> => {
  const row = await getAsync(`SELECT * FROM predictive_engine_runs WHERE id = ?`, [runId]);
  return row?.id ? row : null;
};

export const updatePredictionRunEvaluationStatus = async (
  runId: number,
  evaluationStatus: string,
): Promise<void> => {
  await runAsync(
    `
      UPDATE predictive_engine_runs
      SET evaluationStatus = ?,
          status = CASE WHEN ? = 'evaluated' THEN 'evaluated' ELSE status END,
          updatedAt = strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')
      WHERE id = ?
    `,
    [evaluationStatus, evaluationStatus, runId],
  );
};

export const recordPredictionOutcome = async (
  record: PredictionEvaluationRecord,
): Promise<Record<string, unknown>> => {
  const metricsJson = safeJson(record.metrics);
  const existing = await getAsync(
    `
      SELECT id
      FROM predictive_outcome_events
      WHERE runId = ? AND predictionType = ?
      ORDER BY id DESC
      LIMIT 1
    `,
    [record.runId, record.predictionType],
  );

  if (existing?.id) {
    await runAsync(
      `
        UPDATE predictive_outcome_events
        SET outcomeStatus = ?, predictedValue = ?, actualValue = ?, absoluteError = ?,
            percentageError = ?, accuracyPct = ?, horizonDays = ?, note = ?,
            metricsJson = ?, evidenceJson = ?, evaluatedAt = strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')
        WHERE id = ?
      `,
      [
        record.outcomeStatus,
        record.predictedValue,
        record.actualValue,
        record.absoluteError,
        record.percentageError,
        record.accuracyPct,
        record.horizonDays,
        record.note || null,
        metricsJson,
        metricsJson,
        existing.id,
      ],
    );
    return getAsync(`SELECT * FROM predictive_outcome_events WHERE id = ?`, [existing.id]);
  }

  const result = await runAsync(
    `
      INSERT INTO predictive_outcome_events (
        runId, predictionType, outcomeStatus, predictedValue, actualValue,
        absoluteError, percentageError, accuracyPct, horizonDays,
        note, metricsJson, evidenceJson, evaluatedAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc'))
    `,
    [
      record.runId,
      record.predictionType,
      record.outcomeStatus,
      record.predictedValue,
      record.actualValue,
      record.absoluteError,
      record.percentageError,
      record.accuracyPct,
      record.horizonDays,
      record.note || null,
      metricsJson,
      metricsJson,
    ],
  );
  return getAsync(`SELECT * FROM predictive_outcome_events WHERE id = ?`, [result.lastID]);
};

export const listPredictionOutcomesSummary = async (limitInput?: unknown) => {
  const limit = clampLimit(limitInput, 20, 100);
  return allAsync(
    `
      SELECT id, runId AS predictionRunId, predictionType AS type,
             predictedValue, actualValue, accuracyPct, percentageError,
             outcomeStatus, evaluatedAt
      FROM predictive_outcome_events
      WHERE predictionType IS NOT NULL
      ORDER BY evaluatedAt DESC, id DESC
      LIMIT ?
    `,
    [limit],
  );
};

export const recordFeatureSnapshot = async (snapshot: {
  runId: number;
  modelKey: string;
  modelVersion: string;
  predictionType: BaselinePredictionType;
  entityType?: string | null;
  entityId?: string | number | null;
  horizonDays?: number | null;
  features: Record<string, unknown>;
}): Promise<Record<string, unknown>> => {
  const entityType = snapshot.entityType || null;
  const entityId = snapshot.entityId == null ? null : String(snapshot.entityId);
  const existing = await getAsync(
    `
      SELECT id
      FROM predictive_feature_snapshots
      WHERE run_id = ?
        AND prediction_type = ?
        AND COALESCE(entity_type, '') = COALESCE(?, '')
        AND COALESCE(entity_id, '') = COALESCE(?, '')
      LIMIT 1
    `,
    [snapshot.runId, snapshot.predictionType, entityType, entityId],
  );

  if (existing?.id) {
    await runAsync(
      `
        UPDATE predictive_feature_snapshots
        SET model_key = ?, model_version = ?, horizon_days = ?, features_json = ?
        WHERE id = ?
      `,
      [
        snapshot.modelKey,
        snapshot.modelVersion,
        snapshot.horizonDays || null,
        safeJson(snapshot.features),
        existing.id,
      ],
    );
    return getAsync(`SELECT * FROM predictive_feature_snapshots WHERE id = ?`, [existing.id]);
  }

  const result = await runAsync(
    `
      INSERT INTO predictive_feature_snapshots (
        run_id, model_key, model_version, prediction_type, entity_type,
        entity_id, horizon_days, features_json
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      snapshot.runId,
      snapshot.modelKey,
      snapshot.modelVersion,
      snapshot.predictionType,
      entityType,
      entityId,
      snapshot.horizonDays || null,
      safeJson(snapshot.features),
    ],
  );
  return getAsync(`SELECT * FROM predictive_feature_snapshots WHERE id = ?`, [result.lastID]);
};

export const listFeatureSnapshotsByRun = async (
  runId: number,
): Promise<Record<string, unknown>[]> => {
  return allAsync(
    `SELECT * FROM predictive_feature_snapshots WHERE run_id = ? ORDER BY created_at ASC, id ASC`,
    [runId],
  );
};

export const getPredictionAccuracySummary = async () => {
  const overall = await getAsync(
    `
      SELECT
        (SELECT COUNT(*) FROM predictive_engine_runs) AS totalRuns,
        (SELECT COUNT(*) FROM predictive_engine_runs WHERE COALESCE(evaluationStatus, status) = 'evaluated') AS evaluatedRuns,
        (SELECT COUNT(*) FROM predictive_engine_runs WHERE COALESCE(evaluationStatus, status, 'pending') NOT IN ('evaluated', 'skipped')) AS pendingRuns,
        AVG(CASE WHEN poe.accuracyPct IS NOT NULL THEN poe.accuracyPct ELSE NULL END) AS avgAccuracyPct
      FROM predictive_outcome_events poe
      WHERE poe.predictionType IS NOT NULL
    `,
  );

  const byType = await allAsync(
    `
      SELECT predictionType AS type,
             COUNT(*) AS evaluatedRuns,
             AVG(accuracyPct) AS avgAccuracyPct,
             AVG(percentageError) AS avgErrorPct,
             MAX(evaluatedAt) AS lastEvaluatedAt
      FROM predictive_outcome_events
      WHERE predictionType IS NOT NULL
      GROUP BY predictionType
      ORDER BY predictionType ASC
    `,
  );

  const recentEvaluations = await listPredictionOutcomesSummary(10);

  return {
    overall,
    byType,
    recentEvaluations,
  };
};
