import { allAsync, getAsync, runAsync } from "../../query";
import { clampLimit, safeJson } from "./mlDbUtils";

export const recordMlShadowObservationBinderReviewSignoff = async (payload: {
  signoffGateKey: string;
  signoffGateVersion: string;
  importId?: number | null;
  binderContractKey: string;
  binderFingerprint?: string | null;
  signoffType: string;
  signoffStatus: string;
  signerName?: string | null;
  signerRole?: string | null;
  signerNote?: string | null;
  evidenceSummary?: Record<string, unknown>;
  binderSummary?: Record<string, unknown>;
  signoffPayload?: Record<string, unknown>;
  safetyAssertions?: Record<string, unknown>;
  signoffPolicy?: Record<string, unknown>;
  auditExport?: Record<string, unknown>;
  featureFlagKey?: string | null;
  featureFlagDefault: boolean;
  signoffGateEnabled: boolean;
  humanSignoffOnly: boolean;
  runtimeInvocationAllowed: boolean;
  modelExecutionAllowed: boolean;
  inferenceEndpointExposed: boolean;
  productionIntegrationAllowed: boolean;
  decisionAutomationAllowed: boolean;
  inventoryAccountingChangeAllowed: boolean;
  auditOnly: boolean;
  mutationAllowed: boolean;
  baselineOnlySourceOfTruth: boolean;
  operationalDecisionAllowed: boolean;
  customerSupplierMessageAllowed: boolean;
  forbiddenFieldAttemptCount?: number;
  userId?: number | null;
}) => {
  const result = await runAsync(
    `
      INSERT INTO ml_shadow_observation_binder_review_signoffs (
        signoff_gate_key, signoff_gate_version, import_id, binder_contract_key,
        binder_fingerprint, signoff_type, signoff_status, signer_name, signer_role,
        signer_note, evidence_summary_json, binder_summary_json, signoff_payload_json,
        safety_assertions_json, signoff_policy_json, audit_export_json, feature_flag_key,
        feature_flag_default, signoff_gate_enabled, human_signoff_only,
        runtime_invocation_allowed, model_execution_allowed, inference_endpoint_exposed,
        production_integration_allowed, decision_automation_allowed,
        inventory_accounting_change_allowed, audit_only, mutation_allowed,
        baseline_only_source_of_truth, operational_decision_allowed,
        customer_supplier_message_allowed, forbidden_field_attempt_count, user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.signoffGateKey,
      payload.signoffGateVersion,
      payload.importId || null,
      payload.binderContractKey,
      payload.binderFingerprint || null,
      payload.signoffType,
      payload.signoffStatus,
      payload.signerName || null,
      payload.signerRole || null,
      payload.signerNote || null,
      safeJson(payload.evidenceSummary || {}),
      safeJson(payload.binderSummary || {}),
      safeJson(payload.signoffPayload || {}),
      safeJson(payload.safetyAssertions || {}),
      safeJson(payload.signoffPolicy || {}),
      safeJson(payload.auditExport || {}),
      payload.featureFlagKey || null,
      payload.featureFlagDefault ? 1 : 0,
      payload.signoffGateEnabled ? 1 : 0,
      payload.humanSignoffOnly ? 1 : 0,
      payload.runtimeInvocationAllowed ? 1 : 0,
      payload.modelExecutionAllowed ? 1 : 0,
      payload.inferenceEndpointExposed ? 1 : 0,
      payload.productionIntegrationAllowed ? 1 : 0,
      payload.decisionAutomationAllowed ? 1 : 0,
      payload.inventoryAccountingChangeAllowed ? 1 : 0,
      payload.auditOnly ? 1 : 0,
      payload.mutationAllowed ? 1 : 0,
      payload.baselineOnlySourceOfTruth ? 1 : 0,
      payload.operationalDecisionAllowed ? 1 : 0,
      payload.customerSupplierMessageAllowed ? 1 : 0,
      payload.forbiddenFieldAttemptCount || 0,
      payload.userId || null,
    ],
  );
  return getAsync(`SELECT * FROM ml_shadow_observation_binder_review_signoffs WHERE id = ?`, [result.lastID]);
};

const signoffProjection = `
  SELECT id, signoff_gate_key AS signoffGateKey,
         signoff_gate_version AS signoffGateVersion,
         import_id AS importId, binder_contract_key AS binderContractKey,
         binder_fingerprint AS binderFingerprint, signoff_type AS signoffType,
         signoff_status AS signoffStatus, signer_name AS signerName,
         signer_role AS signerRole, signer_note AS signerNote,
         feature_flag_key AS featureFlagKey, feature_flag_default AS featureFlagDefault,
         signoff_gate_enabled AS signoffGateEnabled, human_signoff_only AS humanSignoffOnly,
         runtime_invocation_allowed AS runtimeInvocationAllowed,
         model_execution_allowed AS modelExecutionAllowed,
         inference_endpoint_exposed AS inferenceEndpointExposed,
         production_integration_allowed AS productionIntegrationAllowed,
         decision_automation_allowed AS decisionAutomationAllowed,
         inventory_accounting_change_allowed AS inventoryAccountingChangeAllowed,
         audit_only AS auditOnly, mutation_allowed AS mutationAllowed,
         baseline_only_source_of_truth AS baselineOnlySourceOfTruth,
         operational_decision_allowed AS operationalDecisionAllowed,
         customer_supplier_message_allowed AS customerSupplierMessageAllowed,
         forbidden_field_attempt_count AS forbiddenFieldAttemptCount,
         created_at AS createdAt, user_id AS userId
  FROM ml_shadow_observation_binder_review_signoffs
`;

export const listMlShadowObservationBinderReviewSignoffs = async (limitInput?: unknown) => {
  const limit = clampLimit(limitInput, 10, 100);
  return allAsync(
    `${signoffProjection}
      ORDER BY created_at DESC, id DESC
      LIMIT ?`,
    [limit],
  );
};

export const listMlShadowObservationBinderReviewSignoffsByImportId = async (importIdInput: unknown, limitInput?: unknown) => {
  const importId = Number(importIdInput);
  if (!Number.isFinite(importId) || importId <= 0) return [];
  const limit = clampLimit(limitInput, 10, 100);
  return allAsync(
    `${signoffProjection}
      WHERE import_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ?`,
    [importId, limit],
  );
};

export const listMlShadowObservationBinderReviewSignoffsByFingerprint = async (fingerprintInput: unknown, limitInput?: unknown) => {
  const fingerprint = typeof fingerprintInput === "string" ? fingerprintInput.trim() : "";
  if (!fingerprint) return [];
  const limit = clampLimit(limitInput, 10, 100);
  return allAsync(
    `${signoffProjection}
      WHERE binder_fingerprint = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ?`,
    [fingerprint, limit],
  );
};
