// Phase 7K-Cleanup DB function module. SQL and behavior preserved.
import { allAsync, getAsync, runAsync } from "../../../query";
import { clampLimit, safeJson } from "../mlDbUtils";


export const recordMlSafeInferenceBoundarySkeleton = async (payload: {
  skeletonKey: string;
  importId?: number | null;
  governanceSignoffId?: number | null;
  modelKey?: string | null;
  modelVersion?: string | null;
  governanceStatus?: string | null;
  implementationEntryDecision?: string | null;
  boundaryStatus: string;
  featureFlagKey?: string | null;
  featureFlagDefault: boolean;
  runtimeEnabled: boolean;
  inferenceEndpointExposed: boolean;
  productionIntegrationAllowed: boolean;
  decisionAutomationAllowed: boolean;
  inventoryAccountingChangeAllowed: boolean;
  shadowOnlyCapable: boolean;
  fallbackStrategy?: string | null;
  readinessScorePct: number;
  blockerCount: number;
  warningCount: number;
  passCount: number;
  totalGateCount: number;
  boundaryContract?: Record<string, unknown>;
  disabledRuntimeManifest?: Record<string, unknown>;
  safetyControls?: Record<string, unknown>;
  featureFlagPolicy?: Record<string, unknown>;
  fallbackPolicy?: Record<string, unknown>;
  auditExport?: Record<string, unknown>;
  summary?: Record<string, unknown>;
  policy?: Record<string, unknown>;
  userId?: number | null;
}) => {
  const result = await runAsync(
    `
      INSERT INTO ml_safe_inference_boundary_skeletons (
        skeleton_key, import_id, governance_signoff_id, model_key, model_version,
        governance_status, implementation_entry_decision, boundary_status, feature_flag_key,
        feature_flag_default, runtime_enabled, inference_endpoint_exposed,
        production_integration_allowed, decision_automation_allowed,
        inventory_accounting_change_allowed, shadow_only_capable, fallback_strategy,
        readiness_score_pct, blocker_count, warning_count, pass_count, total_gate_count,
        boundary_contract_json, disabled_runtime_manifest_json, safety_controls_json,
        feature_flag_policy_json, fallback_policy_json, audit_export_json, summary_json,
        policy_json, user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.skeletonKey,
      payload.importId || null,
      payload.governanceSignoffId || null,
      payload.modelKey || null,
      payload.modelVersion || null,
      payload.governanceStatus || null,
      payload.implementationEntryDecision || null,
      payload.boundaryStatus,
      payload.featureFlagKey || null,
      payload.featureFlagDefault ? 1 : 0,
      payload.runtimeEnabled ? 1 : 0,
      payload.inferenceEndpointExposed ? 1 : 0,
      payload.productionIntegrationAllowed ? 1 : 0,
      payload.decisionAutomationAllowed ? 1 : 0,
      payload.inventoryAccountingChangeAllowed ? 1 : 0,
      payload.shadowOnlyCapable ? 1 : 0,
      payload.fallbackStrategy || null,
      payload.readinessScorePct,
      payload.blockerCount,
      payload.warningCount,
      payload.passCount,
      payload.totalGateCount,
      safeJson(payload.boundaryContract || {}),
      safeJson(payload.disabledRuntimeManifest || {}),
      safeJson(payload.safetyControls || {}),
      safeJson(payload.featureFlagPolicy || {}),
      safeJson(payload.fallbackPolicy || {}),
      safeJson(payload.auditExport || {}),
      safeJson(payload.summary || {}),
      safeJson(payload.policy || {}),
      payload.userId || null,
    ],
  );
  return getAsync(`SELECT * FROM ml_safe_inference_boundary_skeletons WHERE id = ?`, [result.lastID]);
};

export const listMlSafeInferenceBoundarySkeletons = async (limitInput?: unknown) => {
  const limit = clampLimit(limitInput, 10, 100);
  return allAsync(
    `
      SELECT id, skeleton_key AS skeletonKey, import_id AS importId,
             governance_signoff_id AS governanceSignoffId, model_key AS modelKey,
             model_version AS modelVersion, governance_status AS governanceStatus,
             implementation_entry_decision AS implementationEntryDecision,
             boundary_status AS boundaryStatus, feature_flag_key AS featureFlagKey,
             feature_flag_default AS featureFlagDefault, runtime_enabled AS runtimeEnabled,
             inference_endpoint_exposed AS inferenceEndpointExposed,
             production_integration_allowed AS productionIntegrationAllowed,
             decision_automation_allowed AS decisionAutomationAllowed,
             inventory_accounting_change_allowed AS inventoryAccountingChangeAllowed,
             shadow_only_capable AS shadowOnlyCapable, fallback_strategy AS fallbackStrategy,
             readiness_score_pct AS readinessScorePct, blocker_count AS blockerCount,
             warning_count AS warningCount, pass_count AS passCount, total_gate_count AS totalGateCount,
             created_at AS createdAt, user_id AS userId
      FROM ml_safe_inference_boundary_skeletons
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [limit],
  );
};

export const listMlSafeInferenceBoundarySkeletonsByImportId = async (importIdInput: unknown, limitInput?: unknown) => {
  const importId = Number(importIdInput);
  if (!Number.isFinite(importId) || importId <= 0) return [];
  const limit = clampLimit(limitInput, 5, 50);
  return allAsync(
    `
      SELECT id, skeleton_key AS skeletonKey, import_id AS importId,
             governance_signoff_id AS governanceSignoffId, model_key AS modelKey,
             model_version AS modelVersion, governance_status AS governanceStatus,
             implementation_entry_decision AS implementationEntryDecision,
             boundary_status AS boundaryStatus, feature_flag_key AS featureFlagKey,
             feature_flag_default AS featureFlagDefault, runtime_enabled AS runtimeEnabled,
             inference_endpoint_exposed AS inferenceEndpointExposed,
             production_integration_allowed AS productionIntegrationAllowed,
             decision_automation_allowed AS decisionAutomationAllowed,
             inventory_accounting_change_allowed AS inventoryAccountingChangeAllowed,
             shadow_only_capable AS shadowOnlyCapable, fallback_strategy AS fallbackStrategy,
             readiness_score_pct AS readinessScorePct, blocker_count AS blockerCount,
             warning_count AS warningCount, pass_count AS passCount, total_gate_count AS totalGateCount,
             created_at AS createdAt, user_id AS userId
      FROM ml_safe_inference_boundary_skeletons
      WHERE import_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [importId, limit],
  );
};
