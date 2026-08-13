// Phase 7K-Cleanup DB function module. SQL and behavior preserved.
import { allAsync, getAsync, runAsync } from "../../../query";
import { clampLimit, safeJson } from "../mlDbUtils";


export const recordMlDisabledShadowAdapterShell = async (payload: {
  shellKey: string;
  shellVersion: string;
  importId?: number | null;
  adapterContractId?: number | null;
  artifactMetadataId?: number | null;
  safeBoundarySkeletonId?: number | null;
  modelKey?: string | null;
  modelVersion?: string | null;
  adapterStatus?: string | null;
  registryStatus?: string | null;
  boundaryStatus?: string | null;
  shellStatus: string;
  featureFlagKey?: string | null;
  featureFlagDefault: boolean;
  shellEnabled: boolean;
  runtimeInvocationAllowed: boolean;
  modelExecutionAllowed: boolean;
  inferenceEndpointExposed: boolean;
  productionIntegrationAllowed: boolean;
  decisionAutomationAllowed: boolean;
  inventoryAccountingChangeAllowed: boolean;
  noOpAdapterOnly: boolean;
  auditHookEnabled: boolean;
  shadowModeOnly: boolean;
  fallbackStrategy?: string | null;
  readinessScorePct?: number | null;
  blockerCount?: number;
  warningCount?: number;
  passCount?: number;
  totalGateCount?: number;
  shellInterface?: Record<string, unknown>;
  noOpAdapterManifest?: Record<string, unknown>;
  auditHookPolicy?: Record<string, unknown>;
  fallbackPolicy?: Record<string, unknown>;
  auditExport?: Record<string, unknown>;
  summary?: Record<string, unknown>;
  policy?: Record<string, unknown>;
  userId?: number | null;
}) => {
  const result = await runAsync(
    `
      INSERT INTO ml_disabled_shadow_adapter_shells (
        shell_key, shell_version, import_id, adapter_contract_id,
        artifact_metadata_id, safe_boundary_skeleton_id, model_key, model_version,
        adapter_status, registry_status, boundary_status, shell_status,
        feature_flag_key, feature_flag_default, shell_enabled,
        runtime_invocation_allowed, model_execution_allowed, inference_endpoint_exposed,
        production_integration_allowed, decision_automation_allowed,
        inventory_accounting_change_allowed, no_op_adapter_only, audit_hook_enabled,
        shadow_mode_only, fallback_strategy, readiness_score_pct, blocker_count,
        warning_count, pass_count, total_gate_count, shell_interface_json,
        no_op_adapter_manifest_json, audit_hook_policy_json, fallback_policy_json,
        audit_export_json, summary_json, policy_json, user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.shellKey,
      payload.shellVersion,
      payload.importId || null,
      payload.adapterContractId || null,
      payload.artifactMetadataId || null,
      payload.safeBoundarySkeletonId || null,
      payload.modelKey || null,
      payload.modelVersion || null,
      payload.adapterStatus || null,
      payload.registryStatus || null,
      payload.boundaryStatus || null,
      payload.shellStatus,
      payload.featureFlagKey || null,
      payload.featureFlagDefault ? 1 : 0,
      payload.shellEnabled ? 1 : 0,
      payload.runtimeInvocationAllowed ? 1 : 0,
      payload.modelExecutionAllowed ? 1 : 0,
      payload.inferenceEndpointExposed ? 1 : 0,
      payload.productionIntegrationAllowed ? 1 : 0,
      payload.decisionAutomationAllowed ? 1 : 0,
      payload.inventoryAccountingChangeAllowed ? 1 : 0,
      payload.noOpAdapterOnly ? 1 : 0,
      payload.auditHookEnabled ? 1 : 0,
      payload.shadowModeOnly ? 1 : 0,
      payload.fallbackStrategy || null,
      payload.readinessScorePct ?? null,
      payload.blockerCount || 0,
      payload.warningCount || 0,
      payload.passCount || 0,
      payload.totalGateCount || 0,
      safeJson(payload.shellInterface || {}),
      safeJson(payload.noOpAdapterManifest || {}),
      safeJson(payload.auditHookPolicy || {}),
      safeJson(payload.fallbackPolicy || {}),
      safeJson(payload.auditExport || {}),
      safeJson(payload.summary || {}),
      safeJson(payload.policy || {}),
      payload.userId || null,
    ],
  );
  return getAsync(`SELECT * FROM ml_disabled_shadow_adapter_shells WHERE id = ?`, [result.lastID]);
};

export const listMlDisabledShadowAdapterShells = async (limitInput?: unknown) => {
  const limit = clampLimit(limitInput, 10, 100);
  return allAsync(
    `
      SELECT id, shell_key AS shellKey, shell_version AS shellVersion,
             import_id AS importId, adapter_contract_id AS adapterContractId,
             artifact_metadata_id AS artifactMetadataId,
             safe_boundary_skeleton_id AS safeBoundarySkeletonId,
             model_key AS modelKey, model_version AS modelVersion,
             adapter_status AS adapterStatus, registry_status AS registryStatus,
             boundary_status AS boundaryStatus, shell_status AS shellStatus,
             feature_flag_key AS featureFlagKey, feature_flag_default AS featureFlagDefault,
             shell_enabled AS shellEnabled, runtime_invocation_allowed AS runtimeInvocationAllowed,
             model_execution_allowed AS modelExecutionAllowed,
             inference_endpoint_exposed AS inferenceEndpointExposed,
             production_integration_allowed AS productionIntegrationAllowed,
             decision_automation_allowed AS decisionAutomationAllowed,
             inventory_accounting_change_allowed AS inventoryAccountingChangeAllowed,
             no_op_adapter_only AS noOpAdapterOnly, audit_hook_enabled AS auditHookEnabled,
             shadow_mode_only AS shadowModeOnly, fallback_strategy AS fallbackStrategy,
             readiness_score_pct AS readinessScorePct, blocker_count AS blockerCount,
             warning_count AS warningCount, pass_count AS passCount,
             total_gate_count AS totalGateCount, created_at AS createdAt, user_id AS userId
      FROM ml_disabled_shadow_adapter_shells
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [limit],
  );
};

export const listMlDisabledShadowAdapterShellsByImportId = async (importIdInput: unknown, limitInput?: unknown) => {
  const importId = Number(importIdInput);
  if (!Number.isFinite(importId) || importId <= 0) return [];
  const limit = clampLimit(limitInput, 5, 50);
  return allAsync(
    `
      SELECT id, shell_key AS shellKey, shell_version AS shellVersion,
             import_id AS importId, adapter_contract_id AS adapterContractId,
             artifact_metadata_id AS artifactMetadataId,
             safe_boundary_skeleton_id AS safeBoundarySkeletonId,
             model_key AS modelKey, model_version AS modelVersion,
             adapter_status AS adapterStatus, registry_status AS registryStatus,
             boundary_status AS boundaryStatus, shell_status AS shellStatus,
             feature_flag_key AS featureFlagKey, feature_flag_default AS featureFlagDefault,
             shell_enabled AS shellEnabled, runtime_invocation_allowed AS runtimeInvocationAllowed,
             model_execution_allowed AS modelExecutionAllowed,
             inference_endpoint_exposed AS inferenceEndpointExposed,
             production_integration_allowed AS productionIntegrationAllowed,
             decision_automation_allowed AS decisionAutomationAllowed,
             inventory_accounting_change_allowed AS inventoryAccountingChangeAllowed,
             no_op_adapter_only AS noOpAdapterOnly, audit_hook_enabled AS auditHookEnabled,
             shadow_mode_only AS shadowModeOnly, fallback_strategy AS fallbackStrategy,
             readiness_score_pct AS readinessScorePct, blocker_count AS blockerCount,
             warning_count AS warningCount, pass_count AS passCount,
             total_gate_count AS totalGateCount, created_at AS createdAt, user_id AS userId
      FROM ml_disabled_shadow_adapter_shells
      WHERE import_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [importId, limit],
  );
};
