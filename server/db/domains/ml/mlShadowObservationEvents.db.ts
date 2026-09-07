import { allAsync, getAsync, runAsync } from "../../query";
import { clampLimit, safeJson } from "./mlDbUtils";

export const recordMlShadowObservationEvent = async (payload: {
  observationEventKey: string;
  observationEventVersion: string;
  importId?: number | null;
  observationContractId?: number | null;
  disabledHarnessId?: number | null;
  fixtureRunId?: number | null;
  disabledShellId?: number | null;
  adapterContractId?: number | null;
  artifactMetadataId?: number | null;
  safeBoundarySkeletonId?: number | null;
  modelKey?: string | null;
  modelVersion?: string | null;
  sourceRunId?: string | null;
  baselineReference?: string | null;
  eventStoreStatus: string;
  featureFlagKey?: string | null;
  featureFlagDefault: boolean;
  eventStoreEnabled: boolean;
  runtimeInvocationAllowed: boolean;
  modelExecutionAllowed: boolean;
  inferenceEndpointExposed: boolean;
  productionIntegrationAllowed: boolean;
  decisionAutomationAllowed: boolean;
  inventoryAccountingChangeAllowed: boolean;
  auditOnly: boolean;
  mutationAllowed: boolean;
  baselineOnlySourceOfTruth: boolean;
  forbiddenFieldAttemptCount?: number;
  readinessScorePct?: number | null;
  blockerCount?: number;
  warningCount?: number;
  passCount?: number;
  totalGateCount?: number;
  observationPayload?: Record<string, unknown>;
  safetyAssertions?: Record<string, unknown>;
  mutationGuardPolicy?: Record<string, unknown>;
  retentionPolicy?: Record<string, unknown>;
  forbiddenFieldKeys?: string[];
  auditExport?: Record<string, unknown>;
  summary?: Record<string, unknown>;
  policy?: Record<string, unknown>;
  userId?: number | null;
}) => {
  const result = await runAsync(
    `
      INSERT INTO ml_shadow_observation_events (
        observation_event_key, observation_event_version, import_id, observation_contract_id,
        disabled_harness_id, fixture_run_id, disabled_shell_id, adapter_contract_id,
        artifact_metadata_id, safe_boundary_skeleton_id, model_key, model_version,
        source_run_id, baseline_reference, event_store_status, feature_flag_key,
        feature_flag_default, event_store_enabled, runtime_invocation_allowed,
        model_execution_allowed, inference_endpoint_exposed, production_integration_allowed,
        decision_automation_allowed, inventory_accounting_change_allowed, audit_only,
        mutation_allowed, baseline_only_source_of_truth, forbidden_field_attempt_count,
        readiness_score_pct, blocker_count, warning_count, pass_count, total_gate_count,
        observation_payload_json, safety_assertions_json, mutation_guard_policy_json,
        retention_policy_json, forbidden_field_keys_json, audit_export_json, summary_json,
        policy_json, user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.observationEventKey,
      payload.observationEventVersion,
      payload.importId || null,
      payload.observationContractId || null,
      payload.disabledHarnessId || null,
      payload.fixtureRunId || null,
      payload.disabledShellId || null,
      payload.adapterContractId || null,
      payload.artifactMetadataId || null,
      payload.safeBoundarySkeletonId || null,
      payload.modelKey || null,
      payload.modelVersion || null,
      payload.sourceRunId || null,
      payload.baselineReference || null,
      payload.eventStoreStatus,
      payload.featureFlagKey || null,
      payload.featureFlagDefault ? 1 : 0,
      payload.eventStoreEnabled ? 1 : 0,
      payload.runtimeInvocationAllowed ? 1 : 0,
      payload.modelExecutionAllowed ? 1 : 0,
      payload.inferenceEndpointExposed ? 1 : 0,
      payload.productionIntegrationAllowed ? 1 : 0,
      payload.decisionAutomationAllowed ? 1 : 0,
      payload.inventoryAccountingChangeAllowed ? 1 : 0,
      payload.auditOnly ? 1 : 0,
      payload.mutationAllowed ? 1 : 0,
      payload.baselineOnlySourceOfTruth ? 1 : 0,
      payload.forbiddenFieldAttemptCount || 0,
      payload.readinessScorePct ?? null,
      payload.blockerCount || 0,
      payload.warningCount || 0,
      payload.passCount || 0,
      payload.totalGateCount || 0,
      safeJson(payload.observationPayload || {}),
      safeJson(payload.safetyAssertions || {}),
      safeJson(payload.mutationGuardPolicy || {}),
      safeJson(payload.retentionPolicy || {}),
      safeJson(payload.forbiddenFieldKeys || []),
      safeJson(payload.auditExport || {}),
      safeJson(payload.summary || {}),
      safeJson(payload.policy || {}),
      payload.userId || null,
    ],
  );
  return getAsync(`SELECT * FROM ml_shadow_observation_events WHERE id = ?`, [result.lastID]);
};

const eventProjection = `
  SELECT id, observation_event_key AS observationEventKey,
         observation_event_version AS observationEventVersion,
         import_id AS importId, observation_contract_id AS observationContractId,
         disabled_harness_id AS disabledHarnessId, fixture_run_id AS fixtureRunId,
         disabled_shell_id AS disabledShellId, adapter_contract_id AS adapterContractId,
         artifact_metadata_id AS artifactMetadataId, safe_boundary_skeleton_id AS safeBoundarySkeletonId,
         model_key AS modelKey, model_version AS modelVersion, source_run_id AS sourceRunId,
         baseline_reference AS baselineReference, event_store_status AS eventStoreStatus,
         feature_flag_key AS featureFlagKey, feature_flag_default AS featureFlagDefault,
         event_store_enabled AS eventStoreEnabled, runtime_invocation_allowed AS runtimeInvocationAllowed,
         model_execution_allowed AS modelExecutionAllowed, inference_endpoint_exposed AS inferenceEndpointExposed,
         production_integration_allowed AS productionIntegrationAllowed,
         decision_automation_allowed AS decisionAutomationAllowed,
         inventory_accounting_change_allowed AS inventoryAccountingChangeAllowed,
         audit_only AS auditOnly, mutation_allowed AS mutationAllowed,
         baseline_only_source_of_truth AS baselineOnlySourceOfTruth,
         forbidden_field_attempt_count AS forbiddenFieldAttemptCount,
         readiness_score_pct AS readinessScorePct, blocker_count AS blockerCount,
         warning_count AS warningCount, pass_count AS passCount,
         total_gate_count AS totalGateCount, created_at AS createdAt, user_id AS userId
  FROM ml_shadow_observation_events
`;

export const listMlShadowObservationEvents = async (limitInput?: unknown) => {
  const limit = clampLimit(limitInput, 10, 100);
  return allAsync(
    `${eventProjection}
      ORDER BY created_at DESC, id DESC
      LIMIT ?`,
    [limit],
  );
};

export const listMlShadowObservationEventsByImportId = async (importIdInput: unknown, limitInput?: unknown) => {
  const importId = Number(importIdInput);
  if (!Number.isFinite(importId) || importId <= 0) return [];
  const limit = clampLimit(limitInput, 5, 50);
  return allAsync(
    `${eventProjection}
      WHERE import_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ?`,
    [importId, limit],
  );
};

export const listMlShadowObservationEventsByContractId = async (contractIdInput: unknown, limitInput?: unknown) => {
  const contractId = Number(contractIdInput);
  if (!Number.isFinite(contractId) || contractId <= 0) return [];
  const limit = clampLimit(limitInput, 5, 50);
  return allAsync(
    `${eventProjection}
      WHERE observation_contract_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ?`,
    [contractId, limit],
  );
};
