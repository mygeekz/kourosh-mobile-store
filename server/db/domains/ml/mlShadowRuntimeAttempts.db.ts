import { allAsync, getAsync, runAsync } from "../../query";
import { clampLimit, safeJson } from "./mlDbUtils";
import type { ShadowRuntimeAttemptRecord, ShadowRuntimeMode } from "../../../intelligence/mlRuntime/shadowRuntimeTypes";

const toBoolean = (value: unknown): boolean => Number(value) === 1;

const parseJson = <T>(value: unknown, fallback: T): T => {
  if (typeof value !== "string" || value.trim().length === 0) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch (_err) {
    return fallback;
  }
};

const mapAttemptRow = (row: Record<string, unknown> | undefined): ShadowRuntimeAttemptRecord | null => {
  if (!row) return null;
  return {
    id: Number(row.id),
    modelImportId: row.modelImportId as string | number | null,
    modelKey: row.modelKey as string | null,
    modelVersion: row.modelVersion as string | null,
    predictionType: row.predictionType as string | null,
    entityType: row.entityType as string | null,
    entityId: row.entityId as string | number | null,
    runtimeMode: (row.runtimeMode || "disabled") as ShadowRuntimeMode,
    allowed: toBoolean(row.allowed),
    modelExecutionAttempted: toBoolean(row.modelExecutionAttempted),
    modelExecutionAllowed: toBoolean(row.modelExecutionAllowed),
    inferenceEndpointExposed: toBoolean(row.inferenceEndpointExposed),
    productionIntegrationAllowed: toBoolean(row.productionIntegrationAllowed),
    decisionAutomationAllowed: toBoolean(row.decisionAutomationAllowed),
    canChangeInventoryOrAccounting: toBoolean(row.canChangeInventoryOrAccounting),
    inputSnapshot: parseJson<Record<string, unknown> | null>(row.inputSnapshotJson, null),
    outputSnapshot: parseJson<Record<string, unknown> | null>(row.outputSnapshotJson, null),
    safetyNotes: parseJson<string[]>(row.safetyNotesJson, []),
    status: String(row.status || "disabled"),
    createdAt: String(row.createdAt || ""),
    createdByUserId: row.createdByUserId as string | number | null,
  };
};

const attemptSelect = `
  SELECT id,
         model_import_id AS modelImportId,
         model_key AS modelKey,
         model_version AS modelVersion,
         prediction_type AS predictionType,
         entity_type AS entityType,
         entity_id AS entityId,
         runtime_mode AS runtimeMode,
         allowed,
         model_execution_attempted AS modelExecutionAttempted,
         model_execution_allowed AS modelExecutionAllowed,
         inference_endpoint_exposed AS inferenceEndpointExposed,
         production_integration_allowed AS productionIntegrationAllowed,
         decision_automation_allowed AS decisionAutomationAllowed,
         can_change_inventory_or_accounting AS canChangeInventoryOrAccounting,
         input_snapshot_json AS inputSnapshotJson,
         output_snapshot_json AS outputSnapshotJson,
         safety_notes_json AS safetyNotesJson,
         status,
         created_at AS createdAt,
         created_by_user_id AS createdByUserId
  FROM ml_shadow_runtime_attempts
`;

export const recordShadowRuntimeAttempt = async (payload: {
  modelImportId?: string | number | null;
  modelKey?: string | null;
  modelVersion?: string | null;
  predictionType?: string | null;
  entityType?: string | null;
  entityId?: string | number | null;
  runtimeMode: ShadowRuntimeMode;
  allowed: boolean;
  modelExecutionAttempted: boolean;
  modelExecutionAllowed: boolean;
  inferenceEndpointExposed: boolean;
  productionIntegrationAllowed: boolean;
  decisionAutomationAllowed: boolean;
  canChangeInventoryOrAccounting: boolean;
  inputSnapshot?: Record<string, unknown> | null;
  outputSnapshot?: Record<string, unknown> | null;
  safetyNotes?: string[];
  status: string;
  createdByUserId?: string | number | null;
}): Promise<ShadowRuntimeAttemptRecord | null> => {
  const result = await runAsync(
    `
      INSERT INTO ml_shadow_runtime_attempts (
        model_import_id, model_key, model_version, prediction_type, entity_type, entity_id,
        runtime_mode, allowed, model_execution_attempted, model_execution_allowed,
        inference_endpoint_exposed, production_integration_allowed, decision_automation_allowed,
        can_change_inventory_or_accounting, input_snapshot_json, output_snapshot_json,
        safety_notes_json, status, created_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.modelImportId == null ? null : String(payload.modelImportId),
      payload.modelKey || null,
      payload.modelVersion || null,
      payload.predictionType || null,
      payload.entityType || null,
      payload.entityId == null ? null : String(payload.entityId),
      payload.runtimeMode,
      payload.allowed ? 1 : 0,
      payload.modelExecutionAttempted ? 1 : 0,
      payload.modelExecutionAllowed ? 1 : 0,
      payload.inferenceEndpointExposed ? 1 : 0,
      payload.productionIntegrationAllowed ? 1 : 0,
      payload.decisionAutomationAllowed ? 1 : 0,
      payload.canChangeInventoryOrAccounting ? 1 : 0,
      safeJson(payload.inputSnapshot || null),
      safeJson(payload.outputSnapshot || null),
      safeJson(payload.safetyNotes || []),
      payload.status,
      payload.createdByUserId == null ? null : String(payload.createdByUserId),
    ],
  );
  return getShadowRuntimeAttemptById(result.lastID);
};

export const listShadowRuntimeAttempts = async (limitInput?: unknown): Promise<ShadowRuntimeAttemptRecord[]> => {
  const limit = clampLimit(limitInput, 25, 200);
  const rows = await allAsync(
    `${attemptSelect} ORDER BY created_at DESC, id DESC LIMIT ?`,
    [limit],
  );
  return rows.map((row) => mapAttemptRow(row)).filter((row): row is ShadowRuntimeAttemptRecord => row !== null);
};

export const getShadowRuntimeAttemptById = async (idInput: unknown): Promise<ShadowRuntimeAttemptRecord | null> => {
  const id = Number(idInput);
  if (!Number.isFinite(id) || id <= 0) return null;
  const row = await getAsync(`${attemptSelect} WHERE id = ?`, [id]);
  return mapAttemptRow(row);
};

export const getShadowRuntimeAttemptSummary = async (): Promise<Record<string, unknown>> => {
  const aggregate = await getAsync(`
    SELECT COUNT(*) AS totalAttempts,
           SUM(CASE WHEN runtime_mode = 'dry_run' THEN 1 ELSE 0 END) AS dryRunAttempts,
           SUM(CASE WHEN allowed = 1 THEN 1 ELSE 0 END) AS allowedAttempts,
           SUM(CASE WHEN model_execution_attempted = 1 THEN 1 ELSE 0 END) AS modelExecutionAttemptedCount,
           SUM(CASE WHEN model_execution_allowed = 1 THEN 1 ELSE 0 END) AS modelExecutionAllowedCount,
           SUM(CASE WHEN inference_endpoint_exposed = 1 THEN 1 ELSE 0 END) AS inferenceEndpointExposedCount,
           SUM(CASE WHEN production_integration_allowed = 1 THEN 1 ELSE 0 END) AS productionIntegrationAllowedCount,
           SUM(CASE WHEN decision_automation_allowed = 1 THEN 1 ELSE 0 END) AS decisionAutomationAllowedCount,
           SUM(CASE WHEN can_change_inventory_or_accounting = 1 THEN 1 ELSE 0 END) AS inventoryAccountingMutationAllowedCount,
           MAX(created_at) AS latestAttemptAt
    FROM ml_shadow_runtime_attempts
  `);
  const latestAttempt = (await listShadowRuntimeAttempts(1))[0] || null;
  return {
    totalAttempts: Number(aggregate?.totalAttempts || 0),
    dryRunAttempts: Number(aggregate?.dryRunAttempts || 0),
    allowedAttempts: Number(aggregate?.allowedAttempts || 0),
    modelExecutionAttemptedCount: Number(aggregate?.modelExecutionAttemptedCount || 0),
    modelExecutionAllowedCount: Number(aggregate?.modelExecutionAllowedCount || 0),
    inferenceEndpointExposedCount: Number(aggregate?.inferenceEndpointExposedCount || 0),
    productionIntegrationAllowedCount: Number(aggregate?.productionIntegrationAllowedCount || 0),
    decisionAutomationAllowedCount: Number(aggregate?.decisionAutomationAllowedCount || 0),
    inventoryAccountingMutationAllowedCount: Number(aggregate?.inventoryAccountingMutationAllowedCount || 0),
    latestAttemptAt: aggregate?.latestAttemptAt || null,
    latestAttempt,
  };
};
