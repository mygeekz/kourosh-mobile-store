// Phase 7K-Cleanup DB function module. SQL and behavior preserved.
import { allAsync, getAsync, runAsync } from "../../../query";
import { clampLimit, safeJson } from "../mlDbUtils";


export const recordMlShadowRuntimeContractTestFixtures = async (payload: {
  fixtureKey: string;
  fixtureVersion: string;
  importId?: number | null;
  disabledShellId?: number | null;
  adapterContractId?: number | null;
  artifactMetadataId?: number | null;
  safeBoundarySkeletonId?: number | null;
  modelKey?: string | null;
  modelVersion?: string | null;
  shellStatus?: string | null;
  fixtureStatus: string;
  featureFlagKey?: string | null;
  featureFlagDefault: boolean;
  runtimeInvocationAllowed: boolean;
  modelExecutionAllowed: boolean;
  inferenceEndpointExposed: boolean;
  productionIntegrationAllowed: boolean;
  decisionAutomationAllowed: boolean;
  inventoryAccountingChangeAllowed: boolean;
  noOpFixturesOnly: boolean;
  baselineOnlySourceOfTruth: boolean;
  fixtureCount?: number;
  contractTestCount?: number;
  mutationAssertionCount?: number;
  readinessScorePct?: number | null;
  blockerCount?: number;
  warningCount?: number;
  passCount?: number;
  totalGateCount?: number;
  contractTestSuite?: Record<string, unknown>;
  noOpAuditFixtures?: Array<Record<string, unknown>>;
  noMutationAssertions?: Array<Record<string, unknown>>;
  fallbackPolicy?: Record<string, unknown>;
  auditExport?: Record<string, unknown>;
  summary?: Record<string, unknown>;
  policy?: Record<string, unknown>;
  userId?: number | null;
}) => {
  const result = await runAsync(
    `
      INSERT INTO ml_shadow_runtime_contract_test_fixtures (
        fixture_key, fixture_version, import_id, disabled_shell_id,
        adapter_contract_id, artifact_metadata_id, safe_boundary_skeleton_id,
        model_key, model_version, shell_status, fixture_status,
        feature_flag_key, feature_flag_default, runtime_invocation_allowed,
        model_execution_allowed, inference_endpoint_exposed,
        production_integration_allowed, decision_automation_allowed,
        inventory_accounting_change_allowed, no_op_fixtures_only,
        baseline_only_source_of_truth, fixture_count, contract_test_count,
        mutation_assertion_count, readiness_score_pct, blocker_count,
        warning_count, pass_count, total_gate_count, contract_test_suite_json,
        no_op_audit_fixtures_json, no_mutation_assertions_json, fallback_policy_json,
        audit_export_json, summary_json, policy_json, user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.fixtureKey,
      payload.fixtureVersion,
      payload.importId || null,
      payload.disabledShellId || null,
      payload.adapterContractId || null,
      payload.artifactMetadataId || null,
      payload.safeBoundarySkeletonId || null,
      payload.modelKey || null,
      payload.modelVersion || null,
      payload.shellStatus || null,
      payload.fixtureStatus,
      payload.featureFlagKey || null,
      payload.featureFlagDefault ? 1 : 0,
      payload.runtimeInvocationAllowed ? 1 : 0,
      payload.modelExecutionAllowed ? 1 : 0,
      payload.inferenceEndpointExposed ? 1 : 0,
      payload.productionIntegrationAllowed ? 1 : 0,
      payload.decisionAutomationAllowed ? 1 : 0,
      payload.inventoryAccountingChangeAllowed ? 1 : 0,
      payload.noOpFixturesOnly ? 1 : 0,
      payload.baselineOnlySourceOfTruth ? 1 : 0,
      payload.fixtureCount || 0,
      payload.contractTestCount || 0,
      payload.mutationAssertionCount || 0,
      payload.readinessScorePct ?? null,
      payload.blockerCount || 0,
      payload.warningCount || 0,
      payload.passCount || 0,
      payload.totalGateCount || 0,
      safeJson(payload.contractTestSuite || {}),
      safeJson(payload.noOpAuditFixtures || []),
      safeJson(payload.noMutationAssertions || []),
      safeJson(payload.fallbackPolicy || {}),
      safeJson(payload.auditExport || {}),
      safeJson(payload.summary || {}),
      safeJson(payload.policy || {}),
      payload.userId || null,
    ],
  );
  return getAsync(`SELECT * FROM ml_shadow_runtime_contract_test_fixtures WHERE id = ?`, [result.lastID]);
};

export const listMlShadowRuntimeContractTestFixtures = async (limitInput?: unknown) => {
  const limit = clampLimit(limitInput, 10, 100);
  return allAsync(
    `
      SELECT id, fixture_key AS fixtureKey, fixture_version AS fixtureVersion,
             import_id AS importId, disabled_shell_id AS disabledShellId,
             adapter_contract_id AS adapterContractId, artifact_metadata_id AS artifactMetadataId,
             safe_boundary_skeleton_id AS safeBoundarySkeletonId,
             model_key AS modelKey, model_version AS modelVersion,
             shell_status AS shellStatus, fixture_status AS fixtureStatus,
             feature_flag_key AS featureFlagKey, feature_flag_default AS featureFlagDefault,
             runtime_invocation_allowed AS runtimeInvocationAllowed,
             model_execution_allowed AS modelExecutionAllowed,
             inference_endpoint_exposed AS inferenceEndpointExposed,
             production_integration_allowed AS productionIntegrationAllowed,
             decision_automation_allowed AS decisionAutomationAllowed,
             inventory_accounting_change_allowed AS inventoryAccountingChangeAllowed,
             no_op_fixtures_only AS noOpFixturesOnly,
             baseline_only_source_of_truth AS baselineOnlySourceOfTruth,
             fixture_count AS fixtureCount, contract_test_count AS contractTestCount,
             mutation_assertion_count AS mutationAssertionCount,
             readiness_score_pct AS readinessScorePct, blocker_count AS blockerCount,
             warning_count AS warningCount, pass_count AS passCount,
             total_gate_count AS totalGateCount, created_at AS createdAt, user_id AS userId
      FROM ml_shadow_runtime_contract_test_fixtures
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [limit],
  );
};

export const listMlShadowRuntimeContractTestFixturesByImportId = async (importIdInput: unknown, limitInput?: unknown) => {
  const importId = Number(importIdInput);
  if (!Number.isFinite(importId) || importId <= 0) return [];
  const limit = clampLimit(limitInput, 5, 50);
  return allAsync(
    `
      SELECT id, fixture_key AS fixtureKey, fixture_version AS fixtureVersion,
             import_id AS importId, disabled_shell_id AS disabledShellId,
             adapter_contract_id AS adapterContractId, artifact_metadata_id AS artifactMetadataId,
             safe_boundary_skeleton_id AS safeBoundarySkeletonId,
             model_key AS modelKey, model_version AS modelVersion,
             shell_status AS shellStatus, fixture_status AS fixtureStatus,
             feature_flag_key AS featureFlagKey, feature_flag_default AS featureFlagDefault,
             runtime_invocation_allowed AS runtimeInvocationAllowed,
             model_execution_allowed AS modelExecutionAllowed,
             inference_endpoint_exposed AS inferenceEndpointExposed,
             production_integration_allowed AS productionIntegrationAllowed,
             decision_automation_allowed AS decisionAutomationAllowed,
             inventory_accounting_change_allowed AS inventoryAccountingChangeAllowed,
             no_op_fixtures_only AS noOpFixturesOnly,
             baseline_only_source_of_truth AS baselineOnlySourceOfTruth,
             fixture_count AS fixtureCount, contract_test_count AS contractTestCount,
             mutation_assertion_count AS mutationAssertionCount,
             readiness_score_pct AS readinessScorePct, blocker_count AS blockerCount,
             warning_count AS warningCount, pass_count AS passCount,
             total_gate_count AS totalGateCount, created_at AS createdAt, user_id AS userId
      FROM ml_shadow_runtime_contract_test_fixtures
      WHERE import_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [importId, limit],
  );
};
