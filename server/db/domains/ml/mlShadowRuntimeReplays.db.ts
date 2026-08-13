import { allAsync, getAsync, runAsync } from "../../query";
import { clampLimit, safeJson } from "./mlDbUtils";
import type { ShadowRuntimeMode } from "../../../intelligence/mlRuntime/shadowRuntimeTypes";

export type ShadowRuntimeReplaySourceRow = {
  snapshotId: number;
  runId: number | null;
  modelKey: string | null;
  modelVersion: string | null;
  predictionType: string;
  entityType: string | null;
  entityId: string | number | null;
  horizonDays: number | null;
  featuresJson: string | null;
  snapshotCreatedAt: string | null;
  runCreatedAt: string | null;
  confidence: number | null;
  tomorrowSalesForecast: number | null;
  next7SalesForecast: number | null;
  tomorrowOrdersForecast: number | null;
  stockoutRiskCount: number | null;
  collectionOverdueAmount: number | null;
  collectionDueSoonAmount: number | null;
  payloadJson: string | null;
};

export type ShadowRuntimeReplayBatchRecord = {
  id: number;
  replayKey: string;
  modelImportId: string | number | null;
  modelKey: string;
  modelVersion: string;
  predictionType: string | null;
  requestedLimit: number;
  sourceSnapshotCount: number;
  replayedSnapshotCount: number;
  validationFailedCount: number;
  modelExecutionAttemptedCount: number;
  inferenceEndpointExposedCount: number;
  businessMutationAllowedCount: number;
  status: string;
  safetyNotes: string[];
  summary: Record<string, unknown> | null;
  createdAt: string;
  createdByUserId: string | number | null;
};

export type ShadowRuntimeReplayItemRecord = {
  id: number;
  batchId: number;
  attemptId: number | null;
  snapshotId: number;
  predictionRunId: number | null;
  predictionType: string;
  entityType: string | null;
  entityId: string | number | null;
  runtimeMode: ShadowRuntimeMode;
  validationStatus: string;
  allowed: boolean;
  modelExecutionAttempted: boolean;
  modelExecutionAllowed: boolean;
  inferenceEndpointExposed: boolean;
  productionIntegrationAllowed: boolean;
  decisionAutomationAllowed: boolean;
  canChangeInventoryOrAccounting: boolean;
  baselinePrediction: Record<string, unknown> | null;
  candidateOutput: Record<string, unknown> | null;
  delta: Record<string, unknown> | null;
  status: string;
  createdAt: string;
};

const parseJson = <T>(value: unknown, fallback: T): T => {
  if (typeof value !== "string" || value.trim().length === 0) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch (_err) {
    return fallback;
  }
};

const toBoolean = (value: unknown): boolean => Number(value) === 1;

const mapReplayBatchRow = (row: Record<string, unknown> | undefined): ShadowRuntimeReplayBatchRecord | null => {
  if (!row) return null;
  return {
    id: Number(row.id),
    replayKey: String(row.replayKey || ""),
    modelImportId: row.modelImportId as string | number | null,
    modelKey: String(row.modelKey || ""),
    modelVersion: String(row.modelVersion || ""),
    predictionType: row.predictionType as string | null,
    requestedLimit: Number(row.requestedLimit || 0),
    sourceSnapshotCount: Number(row.sourceSnapshotCount || 0),
    replayedSnapshotCount: Number(row.replayedSnapshotCount || 0),
    validationFailedCount: Number(row.validationFailedCount || 0),
    modelExecutionAttemptedCount: Number(row.modelExecutionAttemptedCount || 0),
    inferenceEndpointExposedCount: Number(row.inferenceEndpointExposedCount || 0),
    businessMutationAllowedCount: Number(row.businessMutationAllowedCount || 0),
    status: String(row.status || "created_audit_only"),
    safetyNotes: parseJson<string[]>(row.safetyNotesJson, []),
    summary: parseJson<Record<string, unknown> | null>(row.summaryJson, null),
    createdAt: String(row.createdAt || ""),
    createdByUserId: row.createdByUserId as string | number | null,
  };
};

const mapReplayItemRow = (row: Record<string, unknown> | undefined): ShadowRuntimeReplayItemRecord | null => {
  if (!row) return null;
  return {
    id: Number(row.id),
    batchId: Number(row.batchId),
    attemptId: row.attemptId == null ? null : Number(row.attemptId),
    snapshotId: Number(row.snapshotId),
    predictionRunId: row.predictionRunId == null ? null : Number(row.predictionRunId),
    predictionType: String(row.predictionType || ""),
    entityType: row.entityType as string | null,
    entityId: row.entityId as string | number | null,
    runtimeMode: (row.runtimeMode || "disabled") as ShadowRuntimeMode,
    validationStatus: String(row.validationStatus || "invalid"),
    allowed: toBoolean(row.allowed),
    modelExecutionAttempted: toBoolean(row.modelExecutionAttempted),
    modelExecutionAllowed: toBoolean(row.modelExecutionAllowed),
    inferenceEndpointExposed: toBoolean(row.inferenceEndpointExposed),
    productionIntegrationAllowed: toBoolean(row.productionIntegrationAllowed),
    decisionAutomationAllowed: toBoolean(row.decisionAutomationAllowed),
    canChangeInventoryOrAccounting: toBoolean(row.canChangeInventoryOrAccounting),
    baselinePrediction: parseJson<Record<string, unknown> | null>(row.baselinePredictionJson, null),
    candidateOutput: parseJson<Record<string, unknown> | null>(row.candidateOutputJson, null),
    delta: parseJson<Record<string, unknown> | null>(row.deltaJson, null),
    status: String(row.status || "candidate_output_unavailable_runtime_disabled"),
    createdAt: String(row.createdAt || ""),
  };
};

const replayBatchSelect = `
  SELECT id,
         replay_key AS replayKey,
         model_import_id AS modelImportId,
         model_key AS modelKey,
         model_version AS modelVersion,
         prediction_type AS predictionType,
         requested_limit AS requestedLimit,
         source_snapshot_count AS sourceSnapshotCount,
         replayed_snapshot_count AS replayedSnapshotCount,
         validation_failed_count AS validationFailedCount,
         model_execution_attempted_count AS modelExecutionAttemptedCount,
         inference_endpoint_exposed_count AS inferenceEndpointExposedCount,
         business_mutation_allowed_count AS businessMutationAllowedCount,
         status,
         safety_notes_json AS safetyNotesJson,
         summary_json AS summaryJson,
         created_at AS createdAt,
         created_by_user_id AS createdByUserId
  FROM ml_shadow_runtime_replay_batches
`;

const replayItemSelect = `
  SELECT id,
         batch_id AS batchId,
         attempt_id AS attemptId,
         snapshot_id AS snapshotId,
         prediction_run_id AS predictionRunId,
         prediction_type AS predictionType,
         entity_type AS entityType,
         entity_id AS entityId,
         runtime_mode AS runtimeMode,
         validation_status AS validationStatus,
         allowed,
         model_execution_attempted AS modelExecutionAttempted,
         model_execution_allowed AS modelExecutionAllowed,
         inference_endpoint_exposed AS inferenceEndpointExposed,
         production_integration_allowed AS productionIntegrationAllowed,
         decision_automation_allowed AS decisionAutomationAllowed,
         can_change_inventory_or_accounting AS canChangeInventoryOrAccounting,
         baseline_prediction_json AS baselinePredictionJson,
         candidate_output_json AS candidateOutputJson,
         delta_json AS deltaJson,
         status,
         created_at AS createdAt
  FROM ml_shadow_runtime_replay_items
`;

export const listHistoricalFeatureSnapshotsForReplay = async (options: {
  limit?: unknown;
  predictionType?: unknown;
} = {}): Promise<ShadowRuntimeReplaySourceRow[]> => {
  const limit = clampLimit(options.limit, 25, 250);
  const predictionType = typeof options.predictionType === "string" && options.predictionType.trim().length
    ? options.predictionType.trim()
    : null;
  const params: Array<string | number> = [];
  let where = "WHERE pfs.features_json IS NOT NULL AND length(trim(pfs.features_json)) > 2";
  if (predictionType) {
    where += " AND pfs.prediction_type = ?";
    params.push(predictionType);
  }
  params.push(limit);

  const rows = await allAsync(
    `
      SELECT pfs.id AS snapshotId,
             pfs.run_id AS runId,
             pfs.model_key AS modelKey,
             pfs.model_version AS modelVersion,
             pfs.prediction_type AS predictionType,
             pfs.entity_type AS entityType,
             pfs.entity_id AS entityId,
             pfs.horizon_days AS horizonDays,
             pfs.features_json AS featuresJson,
             pfs.created_at AS snapshotCreatedAt,
             per.createdAt AS runCreatedAt,
             per.confidence AS confidence,
             per.tomorrowSalesForecast AS tomorrowSalesForecast,
             per.next7SalesForecast AS next7SalesForecast,
             per.tomorrowOrdersForecast AS tomorrowOrdersForecast,
             per.stockoutRiskCount AS stockoutRiskCount,
             per.collectionOverdueAmount AS collectionOverdueAmount,
             per.collectionDueSoonAmount AS collectionDueSoonAmount,
             per.payloadJson AS payloadJson
      FROM predictive_feature_snapshots pfs
      LEFT JOIN predictive_engine_runs per ON per.id = pfs.run_id
      ${where}
      ORDER BY pfs.created_at DESC, pfs.id DESC
      LIMIT ?
    `,
    params,
  );
  return rows.map((row) => ({
    snapshotId: Number(row.snapshotId),
    runId: row.runId == null ? null : Number(row.runId),
    modelKey: row.modelKey as string | null,
    modelVersion: row.modelVersion as string | null,
    predictionType: String(row.predictionType || ""),
    entityType: row.entityType as string | null,
    entityId: row.entityId as string | number | null,
    horizonDays: row.horizonDays == null ? null : Number(row.horizonDays),
    featuresJson: row.featuresJson as string | null,
    snapshotCreatedAt: row.snapshotCreatedAt as string | null,
    runCreatedAt: row.runCreatedAt as string | null,
    confidence: row.confidence == null ? null : Number(row.confidence),
    tomorrowSalesForecast: row.tomorrowSalesForecast == null ? null : Number(row.tomorrowSalesForecast),
    next7SalesForecast: row.next7SalesForecast == null ? null : Number(row.next7SalesForecast),
    tomorrowOrdersForecast: row.tomorrowOrdersForecast == null ? null : Number(row.tomorrowOrdersForecast),
    stockoutRiskCount: row.stockoutRiskCount == null ? null : Number(row.stockoutRiskCount),
    collectionOverdueAmount: row.collectionOverdueAmount == null ? null : Number(row.collectionOverdueAmount),
    collectionDueSoonAmount: row.collectionDueSoonAmount == null ? null : Number(row.collectionDueSoonAmount),
    payloadJson: row.payloadJson as string | null,
  }));
};

export const recordShadowRuntimeReplayBatch = async (payload: {
  replayKey: string;
  modelImportId?: string | number | null;
  modelKey: string;
  modelVersion: string;
  predictionType?: string | null;
  requestedLimit: number;
  sourceSnapshotCount?: number;
  status: string;
  safetyNotes?: string[];
  summary?: Record<string, unknown> | null;
  createdByUserId?: string | number | null;
}): Promise<ShadowRuntimeReplayBatchRecord | null> => {
  const result = await runAsync(
    `
      INSERT INTO ml_shadow_runtime_replay_batches (
        replay_key, model_import_id, model_key, model_version, prediction_type,
        requested_limit, source_snapshot_count, status, safety_notes_json, summary_json, created_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.replayKey,
      payload.modelImportId == null ? null : String(payload.modelImportId),
      payload.modelKey,
      payload.modelVersion,
      payload.predictionType || null,
      payload.requestedLimit,
      payload.sourceSnapshotCount || 0,
      payload.status,
      safeJson(payload.safetyNotes || []),
      safeJson(payload.summary || null),
      payload.createdByUserId == null ? null : String(payload.createdByUserId),
    ],
  );
  return getShadowRuntimeReplayBatchById(result.lastID);
};

export const updateShadowRuntimeReplayBatchSummary = async (batchIdInput: unknown, payload: {
  sourceSnapshotCount: number;
  replayedSnapshotCount: number;
  validationFailedCount: number;
  modelExecutionAttemptedCount: number;
  inferenceEndpointExposedCount: number;
  businessMutationAllowedCount: number;
  status: string;
  safetyNotes?: string[];
  summary?: Record<string, unknown> | null;
}): Promise<ShadowRuntimeReplayBatchRecord | null> => {
  const batchId = Number(batchIdInput);
  if (!Number.isFinite(batchId) || batchId <= 0) return null;
  await runAsync(
    `
      UPDATE ml_shadow_runtime_replay_batches
      SET source_snapshot_count = ?,
          replayed_snapshot_count = ?,
          validation_failed_count = ?,
          model_execution_attempted_count = ?,
          inference_endpoint_exposed_count = ?,
          business_mutation_allowed_count = ?,
          status = ?,
          safety_notes_json = ?,
          summary_json = ?
      WHERE id = ?
    `,
    [
      payload.sourceSnapshotCount,
      payload.replayedSnapshotCount,
      payload.validationFailedCount,
      payload.modelExecutionAttemptedCount,
      payload.inferenceEndpointExposedCount,
      payload.businessMutationAllowedCount,
      payload.status,
      safeJson(payload.safetyNotes || []),
      safeJson(payload.summary || null),
      batchId,
    ],
  );
  return getShadowRuntimeReplayBatchById(batchId);
};

export const recordShadowRuntimeReplayItem = async (payload: {
  batchId: number;
  attemptId?: number | null;
  snapshotId: number;
  predictionRunId?: number | null;
  predictionType: string;
  entityType?: string | null;
  entityId?: string | number | null;
  runtimeMode: ShadowRuntimeMode;
  validationStatus: string;
  allowed: boolean;
  modelExecutionAttempted: boolean;
  modelExecutionAllowed: boolean;
  inferenceEndpointExposed: boolean;
  productionIntegrationAllowed: boolean;
  decisionAutomationAllowed: boolean;
  canChangeInventoryOrAccounting: boolean;
  baselinePrediction?: Record<string, unknown> | null;
  candidateOutput?: Record<string, unknown> | null;
  delta?: Record<string, unknown> | null;
  status: string;
}): Promise<ShadowRuntimeReplayItemRecord | null> => {
  const result = await runAsync(
    `
      INSERT INTO ml_shadow_runtime_replay_items (
        batch_id, attempt_id, snapshot_id, prediction_run_id, prediction_type, entity_type, entity_id,
        runtime_mode, validation_status, allowed, model_execution_attempted, model_execution_allowed,
        inference_endpoint_exposed, production_integration_allowed, decision_automation_allowed,
        can_change_inventory_or_accounting, baseline_prediction_json, candidate_output_json, delta_json, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.batchId,
      payload.attemptId ?? null,
      payload.snapshotId,
      payload.predictionRunId ?? null,
      payload.predictionType,
      payload.entityType || null,
      payload.entityId == null ? null : String(payload.entityId),
      payload.runtimeMode,
      payload.validationStatus,
      payload.allowed ? 1 : 0,
      payload.modelExecutionAttempted ? 1 : 0,
      payload.modelExecutionAllowed ? 1 : 0,
      payload.inferenceEndpointExposed ? 1 : 0,
      payload.productionIntegrationAllowed ? 1 : 0,
      payload.decisionAutomationAllowed ? 1 : 0,
      payload.canChangeInventoryOrAccounting ? 1 : 0,
      safeJson(payload.baselinePrediction || null),
      safeJson(payload.candidateOutput || null),
      safeJson(payload.delta || null),
      payload.status,
    ],
  );
  return getShadowRuntimeReplayItemById(result.lastID);
};

export const listShadowRuntimeReplayBatches = async (limitInput?: unknown): Promise<ShadowRuntimeReplayBatchRecord[]> => {
  const limit = clampLimit(limitInput, 25, 200);
  const rows = await allAsync(
    `${replayBatchSelect} ORDER BY created_at DESC, id DESC LIMIT ?`,
    [limit],
  );
  return rows.map((row) => mapReplayBatchRow(row)).filter((row): row is ShadowRuntimeReplayBatchRecord => row !== null);
};

export const getShadowRuntimeReplayBatchById = async (idInput: unknown): Promise<ShadowRuntimeReplayBatchRecord | null> => {
  const id = Number(idInput);
  if (!Number.isFinite(id) || id <= 0) return null;
  const row = await getAsync(`${replayBatchSelect} WHERE id = ?`, [id]);
  return mapReplayBatchRow(row);
};

export const getShadowRuntimeReplayItemById = async (idInput: unknown): Promise<ShadowRuntimeReplayItemRecord | null> => {
  const id = Number(idInput);
  if (!Number.isFinite(id) || id <= 0) return null;
  const row = await getAsync(`${replayItemSelect} WHERE id = ?`, [id]);
  return mapReplayItemRow(row);
};

export const listShadowRuntimeReplayItems = async (batchIdInput: unknown, limitInput?: unknown): Promise<ShadowRuntimeReplayItemRecord[]> => {
  const batchId = Number(batchIdInput);
  if (!Number.isFinite(batchId) || batchId <= 0) return [];
  const limit = clampLimit(limitInput, 50, 250);
  const rows = await allAsync(
    `${replayItemSelect} WHERE batch_id = ? ORDER BY created_at ASC, id ASC LIMIT ?`,
    [batchId, limit],
  );
  return rows.map((row) => mapReplayItemRow(row)).filter((row): row is ShadowRuntimeReplayItemRecord => row !== null);
};

export const getShadowRuntimeReplaySummary = async (): Promise<Record<string, unknown>> => {
  const aggregate = await getAsync(`
    SELECT COUNT(*) AS totalBatches,
           SUM(source_snapshot_count) AS totalSourceSnapshots,
           SUM(replayed_snapshot_count) AS totalReplayedSnapshots,
           SUM(validation_failed_count) AS totalValidationFailures,
           SUM(model_execution_attempted_count) AS totalModelExecutionAttempted,
           SUM(inference_endpoint_exposed_count) AS totalInferenceEndpointExposed,
           SUM(business_mutation_allowed_count) AS totalBusinessMutationAllowed,
           MAX(created_at) AS latestReplayAt
    FROM ml_shadow_runtime_replay_batches
  `);
  const latestReplay = (await listShadowRuntimeReplayBatches(1))[0] || null;
  return {
    totalBatches: Number(aggregate?.totalBatches || 0),
    totalSourceSnapshots: Number(aggregate?.totalSourceSnapshots || 0),
    totalReplayedSnapshots: Number(aggregate?.totalReplayedSnapshots || 0),
    totalValidationFailures: Number(aggregate?.totalValidationFailures || 0),
    totalModelExecutionAttempted: Number(aggregate?.totalModelExecutionAttempted || 0),
    totalInferenceEndpointExposed: Number(aggregate?.totalInferenceEndpointExposed || 0),
    totalBusinessMutationAllowed: Number(aggregate?.totalBusinessMutationAllowed || 0),
    latestReplayAt: aggregate?.latestReplayAt || null,
    latestReplay,
  };
};
