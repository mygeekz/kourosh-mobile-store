// Phase 7K-Cleanup DB function module. SQL and behavior preserved.
import { allAsync, getAsync, runAsync } from "../../../query";
import { clampLimit, safeJson } from "../mlDbUtils";


export const recordMlShadowInferenceAdapterContract = async (payload: {
  adapterKey: string;
  adapterVersion: string;
  importId?: number | null;
  artifactMetadataId?: number | null;
  safeBoundarySkeletonId?: number | null;
  modelKey?: string | null;
  modelVersion?: string | null;
  registryStatus?: string | null;
  boundaryStatus?: string | null;
  adapterStatus: string;
  featureFlagKey?: string | null;
  featureFlagDefault: boolean;
  runtimeInvocationAllowed: boolean;
  modelExecutionAllowed: boolean;
  inferenceEndpointExposed: boolean;
  productionIntegrationAllowed: boolean;
  decisionAutomationAllowed: boolean;
  inventoryAccountingChangeAllowed: boolean;
  shadowModeOnly: boolean;
  fallbackStrategy?: string | null;
  readinessScorePct?: number | null;
  blockerCount?: number;
  warningCount?: number;
  passCount?: number;
  totalGateCount?: number;
  adapterContract?: Record<string, unknown>;
  ioContract?: Record<string, unknown>;
  guardrailPolicy?: Record<string, unknown>;
  fallbackPolicy?: Record<string, unknown>;
  auditExport?: Record<string, unknown>;
  summary?: Record<string, unknown>;
  policy?: Record<string, unknown>;
  userId?: number | null;
}) => {
  const result = await runAsync(
    `
      INSERT INTO ml_shadow_inference_adapter_contracts (
        adapter_key, adapter_version, import_id, artifact_metadata_id,
        safe_boundary_skeleton_id, model_key, model_version, registry_status,
        boundary_status, adapter_status, feature_flag_key, feature_flag_default,
        runtime_invocation_allowed, model_execution_allowed, inference_endpoint_exposed,
        production_integration_allowed, decision_automation_allowed,
        inventory_accounting_change_allowed, shadow_mode_only, fallback_strategy,
        readiness_score_pct, blocker_count, warning_count, pass_count,
        total_gate_count, adapter_contract_json, io_contract_json,
        guardrail_policy_json, fallback_policy_json, audit_export_json,
        summary_json, policy_json, user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.adapterKey,
      payload.adapterVersion,
      payload.importId || null,
      payload.artifactMetadataId || null,
      payload.safeBoundarySkeletonId || null,
      payload.modelKey || null,
      payload.modelVersion || null,
      payload.registryStatus || null,
      payload.boundaryStatus || null,
      payload.adapterStatus,
      payload.featureFlagKey || null,
      payload.featureFlagDefault ? 1 : 0,
      payload.runtimeInvocationAllowed ? 1 : 0,
      payload.modelExecutionAllowed ? 1 : 0,
      payload.inferenceEndpointExposed ? 1 : 0,
      payload.productionIntegrationAllowed ? 1 : 0,
      payload.decisionAutomationAllowed ? 1 : 0,
      payload.inventoryAccountingChangeAllowed ? 1 : 0,
      payload.shadowModeOnly ? 1 : 0,
      payload.fallbackStrategy || null,
      payload.readinessScorePct ?? null,
      payload.blockerCount || 0,
      payload.warningCount || 0,
      payload.passCount || 0,
      payload.totalGateCount || 0,
      safeJson(payload.adapterContract || {}),
      safeJson(payload.ioContract || {}),
      safeJson(payload.guardrailPolicy || {}),
      safeJson(payload.fallbackPolicy || {}),
      safeJson(payload.auditExport || {}),
      safeJson(payload.summary || {}),
      safeJson(payload.policy || {}),
      payload.userId || null,
    ],
  );
  return getAsync(`SELECT * FROM ml_shadow_inference_adapter_contracts WHERE id = ?`, [result.lastID]);
};

export const listMlShadowInferenceAdapterContracts = async (limitInput?: unknown) => {
  const limit = clampLimit(limitInput, 10, 100);
  return allAsync(
    `
      SELECT id, adapter_key AS adapterKey, adapter_version AS adapterVersion,
             import_id AS importId, artifact_metadata_id AS artifactMetadataId,
             safe_boundary_skeleton_id AS safeBoundarySkeletonId, model_key AS modelKey,
             model_version AS modelVersion, registry_status AS registryStatus,
             boundary_status AS boundaryStatus, adapter_status AS adapterStatus,
             feature_flag_key AS featureFlagKey, feature_flag_default AS featureFlagDefault,
             runtime_invocation_allowed AS runtimeInvocationAllowed,
             model_execution_allowed AS modelExecutionAllowed,
             inference_endpoint_exposed AS inferenceEndpointExposed,
             production_integration_allowed AS productionIntegrationAllowed,
             decision_automation_allowed AS decisionAutomationAllowed,
             inventory_accounting_change_allowed AS inventoryAccountingChangeAllowed,
             shadow_mode_only AS shadowModeOnly, fallback_strategy AS fallbackStrategy,
             readiness_score_pct AS readinessScorePct, blocker_count AS blockerCount,
             warning_count AS warningCount, pass_count AS passCount,
             total_gate_count AS totalGateCount, created_at AS createdAt, user_id AS userId
      FROM ml_shadow_inference_adapter_contracts
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [limit],
  );
};

export const listMlShadowInferenceAdapterContractsByImportId = async (importIdInput: unknown, limitInput?: unknown) => {
  const importId = Number(importIdInput);
  if (!Number.isFinite(importId) || importId <= 0) return [];
  const limit = clampLimit(limitInput, 5, 50);
  return allAsync(
    `
      SELECT id, adapter_key AS adapterKey, adapter_version AS adapterVersion,
             import_id AS importId, artifact_metadata_id AS artifactMetadataId,
             safe_boundary_skeleton_id AS safeBoundarySkeletonId, model_key AS modelKey,
             model_version AS modelVersion, registry_status AS registryStatus,
             boundary_status AS boundaryStatus, adapter_status AS adapterStatus,
             feature_flag_key AS featureFlagKey, feature_flag_default AS featureFlagDefault,
             runtime_invocation_allowed AS runtimeInvocationAllowed,
             model_execution_allowed AS modelExecutionAllowed,
             inference_endpoint_exposed AS inferenceEndpointExposed,
             production_integration_allowed AS productionIntegrationAllowed,
             decision_automation_allowed AS decisionAutomationAllowed,
             inventory_accounting_change_allowed AS inventoryAccountingChangeAllowed,
             shadow_mode_only AS shadowModeOnly, fallback_strategy AS fallbackStrategy,
             readiness_score_pct AS readinessScorePct, blocker_count AS blockerCount,
             warning_count AS warningCount, pass_count AS passCount,
             total_gate_count AS totalGateCount, created_at AS createdAt, user_id AS userId
      FROM ml_shadow_inference_adapter_contracts
      WHERE import_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [importId, limit],
  );
};
