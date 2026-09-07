// Phase 7K-Cleanup DB function module. SQL and behavior preserved.
import { allAsync, getAsync, runAsync } from "../../../query";
import { clampLimit, safeJson } from "../mlDbUtils";


export const recordMlDisabledShadowRuntimeHarness = async (payload: {
  harnessKey: string;
  harnessVersion: string;
  importId?: number | null;
  fixtureRunId?: number | null;
  disabledShellId?: number | null;
  adapterContractId?: number | null;
  artifactMetadataId?: number | null;
  safeBoundarySkeletonId?: number | null;
  modelKey?: string | null;
  modelVersion?: string | null;
  fixtureStatus?: string | null;
  harnessStatus: string;
  featureFlagKey?: string | null;
  featureFlagDefault: boolean;
  harnessEnabled: boolean;
  runtimeInvocationAllowed: boolean;
  modelExecutionAllowed: boolean;
  inferenceEndpointExposed: boolean;
  productionIntegrationAllowed: boolean;
  decisionAutomationAllowed: boolean;
  inventoryAccountingChangeAllowed: boolean;
  noOpHarnessOnly: boolean;
  baselineOnlySourceOfTruth: boolean;
  auditHookEnabled: boolean;
  harnessCheckCount?: number;
  mutationGuardCount?: number;
  readinessScorePct?: number | null;
  blockerCount?: number;
  warningCount?: number;
  passCount?: number;
  totalGateCount?: number;
  harnessManifest?: Record<string, unknown>;
  validationRun?: Record<string, unknown>;
  noOpAssertions?: Array<Record<string, unknown>>;
  mutationGuardResults?: Array<Record<string, unknown>>;
  fallbackPolicy?: Record<string, unknown>;
  auditExport?: Record<string, unknown>;
  summary?: Record<string, unknown>;
  policy?: Record<string, unknown>;
  userId?: number | null;
}) => {
  const result = await runAsync(
    `
      INSERT INTO ml_disabled_shadow_runtime_harnesses (
        harness_key, harness_version, import_id, fixture_run_id, disabled_shell_id,
        adapter_contract_id, artifact_metadata_id, safe_boundary_skeleton_id,
        model_key, model_version, fixture_status, harness_status,
        feature_flag_key, feature_flag_default, harness_enabled, runtime_invocation_allowed,
        model_execution_allowed, inference_endpoint_exposed, production_integration_allowed,
        decision_automation_allowed, inventory_accounting_change_allowed, no_op_harness_only,
        baseline_only_source_of_truth, audit_hook_enabled, harness_check_count, mutation_guard_count,
        readiness_score_pct, blocker_count, warning_count, pass_count, total_gate_count,
        harness_manifest_json, validation_run_json, no_op_assertions_json, mutation_guard_results_json,
        fallback_policy_json, audit_export_json, summary_json, policy_json, user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.harnessKey,
      payload.harnessVersion,
      payload.importId || null,
      payload.fixtureRunId || null,
      payload.disabledShellId || null,
      payload.adapterContractId || null,
      payload.artifactMetadataId || null,
      payload.safeBoundarySkeletonId || null,
      payload.modelKey || null,
      payload.modelVersion || null,
      payload.fixtureStatus || null,
      payload.harnessStatus,
      payload.featureFlagKey || null,
      payload.featureFlagDefault ? 1 : 0,
      payload.harnessEnabled ? 1 : 0,
      payload.runtimeInvocationAllowed ? 1 : 0,
      payload.modelExecutionAllowed ? 1 : 0,
      payload.inferenceEndpointExposed ? 1 : 0,
      payload.productionIntegrationAllowed ? 1 : 0,
      payload.decisionAutomationAllowed ? 1 : 0,
      payload.inventoryAccountingChangeAllowed ? 1 : 0,
      payload.noOpHarnessOnly ? 1 : 0,
      payload.baselineOnlySourceOfTruth ? 1 : 0,
      payload.auditHookEnabled ? 1 : 0,
      payload.harnessCheckCount || 0,
      payload.mutationGuardCount || 0,
      payload.readinessScorePct ?? null,
      payload.blockerCount || 0,
      payload.warningCount || 0,
      payload.passCount || 0,
      payload.totalGateCount || 0,
      safeJson(payload.harnessManifest || {}),
      safeJson(payload.validationRun || {}),
      safeJson(payload.noOpAssertions || []),
      safeJson(payload.mutationGuardResults || []),
      safeJson(payload.fallbackPolicy || {}),
      safeJson(payload.auditExport || {}),
      safeJson(payload.summary || {}),
      safeJson(payload.policy || {}),
      payload.userId || null,
    ],
  );
  return getAsync(`SELECT * FROM ml_disabled_shadow_runtime_harnesses WHERE id = ?`, [result.lastID]);
};

export const listMlDisabledShadowRuntimeHarnesses = async (limitInput?: unknown) => {
  const limit = clampLimit(limitInput, 10, 100);
  return allAsync(
    `
      SELECT id, harness_key AS harnessKey, harness_version AS harnessVersion,
             import_id AS importId, fixture_run_id AS fixtureRunId,
             disabled_shell_id AS disabledShellId, adapter_contract_id AS adapterContractId,
             artifact_metadata_id AS artifactMetadataId, safe_boundary_skeleton_id AS safeBoundarySkeletonId,
             model_key AS modelKey, model_version AS modelVersion, fixture_status AS fixtureStatus,
             harness_status AS harnessStatus, feature_flag_key AS featureFlagKey,
             feature_flag_default AS featureFlagDefault, harness_enabled AS harnessEnabled,
             runtime_invocation_allowed AS runtimeInvocationAllowed, model_execution_allowed AS modelExecutionAllowed,
             inference_endpoint_exposed AS inferenceEndpointExposed, production_integration_allowed AS productionIntegrationAllowed,
             decision_automation_allowed AS decisionAutomationAllowed, inventory_accounting_change_allowed AS inventoryAccountingChangeAllowed,
             no_op_harness_only AS noOpHarnessOnly, baseline_only_source_of_truth AS baselineOnlySourceOfTruth,
             audit_hook_enabled AS auditHookEnabled, harness_check_count AS harnessCheckCount, mutation_guard_count AS mutationGuardCount,
             readiness_score_pct AS readinessScorePct, blocker_count AS blockerCount, warning_count AS warningCount,
             pass_count AS passCount, total_gate_count AS totalGateCount, created_at AS createdAt, user_id AS userId
      FROM ml_disabled_shadow_runtime_harnesses
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [limit],
  );
};

export const listMlDisabledShadowRuntimeHarnessesByImportId = async (importIdInput: unknown, limitInput?: unknown) => {
  const importId = Number(importIdInput);
  if (!Number.isFinite(importId) || importId <= 0) return [];
  const limit = clampLimit(limitInput, 5, 50);
  return allAsync(
    `
      SELECT id, harness_key AS harnessKey, harness_version AS harnessVersion,
             import_id AS importId, fixture_run_id AS fixtureRunId,
             disabled_shell_id AS disabledShellId, adapter_contract_id AS adapterContractId,
             artifact_metadata_id AS artifactMetadataId, safe_boundary_skeleton_id AS safeBoundarySkeletonId,
             model_key AS modelKey, model_version AS modelVersion, fixture_status AS fixtureStatus,
             harness_status AS harnessStatus, feature_flag_key AS featureFlagKey,
             feature_flag_default AS featureFlagDefault, harness_enabled AS harnessEnabled,
             runtime_invocation_allowed AS runtimeInvocationAllowed, model_execution_allowed AS modelExecutionAllowed,
             inference_endpoint_exposed AS inferenceEndpointExposed, production_integration_allowed AS productionIntegrationAllowed,
             decision_automation_allowed AS decisionAutomationAllowed, inventory_accounting_change_allowed AS inventoryAccountingChangeAllowed,
             no_op_harness_only AS noOpHarnessOnly, baseline_only_source_of_truth AS baselineOnlySourceOfTruth,
             audit_hook_enabled AS auditHookEnabled, harness_check_count AS harnessCheckCount, mutation_guard_count AS mutationGuardCount,
             readiness_score_pct AS readinessScorePct, blocker_count AS blockerCount, warning_count AS warningCount,
             pass_count AS passCount, total_gate_count AS totalGateCount, created_at AS createdAt, user_id AS userId
      FROM ml_disabled_shadow_runtime_harnesses
      WHERE import_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [importId, limit],
  );
};
