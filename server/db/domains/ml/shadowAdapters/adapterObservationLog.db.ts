// Phase 7K-Cleanup DB function module. SQL and behavior preserved.
import { allAsync, getAsync, runAsync } from "../../../query";
import { clampLimit, safeJson } from "../mlDbUtils";


export const recordMlShadowAdapterObservationLogContract = async (payload: {
  observationContractKey: string;
  observationContractVersion: string;
  importId?: number | null;
  disabledHarnessId?: number | null;
  fixtureRunId?: number | null;
  disabledShellId?: number | null;
  adapterContractId?: number | null;
  artifactMetadataId?: number | null;
  safeBoundarySkeletonId?: number | null;
  modelKey?: string | null;
  modelVersion?: string | null;
  harnessStatus?: string | null;
  observationContractStatus: string;
  featureFlagKey?: string | null;
  featureFlagDefault: boolean;
  observationLoggingEnabled: boolean;
  runtimeInvocationAllowed: boolean;
  modelExecutionAllowed: boolean;
  inferenceEndpointExposed: boolean;
  productionIntegrationAllowed: boolean;
  decisionAutomationAllowed: boolean;
  inventoryAccountingChangeAllowed: boolean;
  noOpObservationOnly: boolean;
  baselineOnlySourceOfTruth: boolean;
  observationEventSchema?: Record<string, unknown>;
  noOpObservationFixture?: Record<string, unknown>;
  mutationGuardPolicy?: Record<string, unknown>;
  retentionPolicy?: Record<string, unknown>;
  auditExport?: Record<string, unknown>;
  readinessScorePct?: number | null;
  blockerCount?: number;
  warningCount?: number;
  passCount?: number;
  totalGateCount?: number;
  summary?: Record<string, unknown>;
  policy?: Record<string, unknown>;
  userId?: number | null;
}) => {
  const result = await runAsync(
    `
      INSERT INTO ml_shadow_adapter_observation_log_contracts (
        observation_contract_key, observation_contract_version, import_id, disabled_harness_id,
        fixture_run_id, disabled_shell_id, adapter_contract_id, artifact_metadata_id,
        safe_boundary_skeleton_id, model_key, model_version, harness_status, observation_contract_status,
        feature_flag_key, feature_flag_default, observation_logging_enabled, runtime_invocation_allowed,
        model_execution_allowed, inference_endpoint_exposed, production_integration_allowed,
        decision_automation_allowed, inventory_accounting_change_allowed, no_op_observation_only,
        baseline_only_source_of_truth, observation_event_schema_json, no_op_observation_fixture_json,
        mutation_guard_policy_json, retention_policy_json, audit_export_json, readiness_score_pct,
        blocker_count, warning_count, pass_count, total_gate_count, summary_json, policy_json, user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.observationContractKey,
      payload.observationContractVersion,
      payload.importId || null,
      payload.disabledHarnessId || null,
      payload.fixtureRunId || null,
      payload.disabledShellId || null,
      payload.adapterContractId || null,
      payload.artifactMetadataId || null,
      payload.safeBoundarySkeletonId || null,
      payload.modelKey || null,
      payload.modelVersion || null,
      payload.harnessStatus || null,
      payload.observationContractStatus,
      payload.featureFlagKey || null,
      payload.featureFlagDefault ? 1 : 0,
      payload.observationLoggingEnabled ? 1 : 0,
      payload.runtimeInvocationAllowed ? 1 : 0,
      payload.modelExecutionAllowed ? 1 : 0,
      payload.inferenceEndpointExposed ? 1 : 0,
      payload.productionIntegrationAllowed ? 1 : 0,
      payload.decisionAutomationAllowed ? 1 : 0,
      payload.inventoryAccountingChangeAllowed ? 1 : 0,
      payload.noOpObservationOnly ? 1 : 0,
      payload.baselineOnlySourceOfTruth ? 1 : 0,
      safeJson(payload.observationEventSchema || {}),
      safeJson(payload.noOpObservationFixture || {}),
      safeJson(payload.mutationGuardPolicy || {}),
      safeJson(payload.retentionPolicy || {}),
      safeJson(payload.auditExport || {}),
      payload.readinessScorePct ?? null,
      payload.blockerCount || 0,
      payload.warningCount || 0,
      payload.passCount || 0,
      payload.totalGateCount || 0,
      safeJson(payload.summary || {}),
      safeJson(payload.policy || {}),
      payload.userId || null,
    ],
  );
  return getAsync(`SELECT * FROM ml_shadow_adapter_observation_log_contracts WHERE id = ?`, [result.lastID]);
};

export const listMlShadowAdapterObservationLogContracts = async (limitInput?: unknown) => {
  const limit = clampLimit(limitInput, 10, 100);
  return allAsync(
    `
      SELECT id, observation_contract_key AS observationContractKey,
             observation_contract_version AS observationContractVersion,
             import_id AS importId, disabled_harness_id AS disabledHarnessId,
             fixture_run_id AS fixtureRunId, disabled_shell_id AS disabledShellId,
             adapter_contract_id AS adapterContractId, artifact_metadata_id AS artifactMetadataId,
             safe_boundary_skeleton_id AS safeBoundarySkeletonId,
             model_key AS modelKey, model_version AS modelVersion, harness_status AS harnessStatus,
             observation_contract_status AS observationContractStatus,
             feature_flag_key AS featureFlagKey, feature_flag_default AS featureFlagDefault,
             observation_logging_enabled AS observationLoggingEnabled,
             runtime_invocation_allowed AS runtimeInvocationAllowed,
             model_execution_allowed AS modelExecutionAllowed,
             inference_endpoint_exposed AS inferenceEndpointExposed,
             production_integration_allowed AS productionIntegrationAllowed,
             decision_automation_allowed AS decisionAutomationAllowed,
             inventory_accounting_change_allowed AS inventoryAccountingChangeAllowed,
             no_op_observation_only AS noOpObservationOnly,
             baseline_only_source_of_truth AS baselineOnlySourceOfTruth,
             readiness_score_pct AS readinessScorePct, blocker_count AS blockerCount,
             warning_count AS warningCount, pass_count AS passCount,
             total_gate_count AS totalGateCount, created_at AS createdAt, user_id AS userId
      FROM ml_shadow_adapter_observation_log_contracts
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [limit],
  );
};

export const listMlShadowAdapterObservationLogContractsByImportId = async (importIdInput: unknown, limitInput?: unknown) => {
  const importId = Number(importIdInput);
  if (!Number.isFinite(importId) || importId <= 0) return [];
  const limit = clampLimit(limitInput, 5, 50);
  return allAsync(
    `
      SELECT id, observation_contract_key AS observationContractKey,
             observation_contract_version AS observationContractVersion,
             import_id AS importId, disabled_harness_id AS disabledHarnessId,
             fixture_run_id AS fixtureRunId, disabled_shell_id AS disabledShellId,
             adapter_contract_id AS adapterContractId, artifact_metadata_id AS artifactMetadataId,
             safe_boundary_skeleton_id AS safeBoundarySkeletonId,
             model_key AS modelKey, model_version AS modelVersion, harness_status AS harnessStatus,
             observation_contract_status AS observationContractStatus,
             feature_flag_key AS featureFlagKey, feature_flag_default AS featureFlagDefault,
             observation_logging_enabled AS observationLoggingEnabled,
             runtime_invocation_allowed AS runtimeInvocationAllowed,
             model_execution_allowed AS modelExecutionAllowed,
             inference_endpoint_exposed AS inferenceEndpointExposed,
             production_integration_allowed AS productionIntegrationAllowed,
             decision_automation_allowed AS decisionAutomationAllowed,
             inventory_accounting_change_allowed AS inventoryAccountingChangeAllowed,
             no_op_observation_only AS noOpObservationOnly,
             baseline_only_source_of_truth AS baselineOnlySourceOfTruth,
             readiness_score_pct AS readinessScorePct, blocker_count AS blockerCount,
             warning_count AS warningCount, pass_count AS passCount,
             total_gate_count AS totalGateCount, created_at AS createdAt, user_id AS userId
      FROM ml_shadow_adapter_observation_log_contracts
      WHERE import_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [importId, limit],
  );
};
