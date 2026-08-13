import { allAsync, getAsync, runAsync } from "../../query";
import { clampLimit, safeJson } from "./mlDbUtils";

export const recordMlShadowObservationReviewDecision = async (payload: {
  decisionLogKey: string;
  decisionLogVersion: string;
  importId?: number | null;
  observationEventId?: number | null;
  reviewDashboardKey?: string | null;
  reviewDecisionType: string;
  reviewDecisionStatus: string;
  reviewerName?: string | null;
  reviewerRole?: string | null;
  reviewerNote?: string | null;
  evidenceSummary?: Record<string, unknown>;
  reviewedEventIds?: number[];
  decisionPayload?: Record<string, unknown>;
  safetyAssertions?: Record<string, unknown>;
  decisionPolicy?: Record<string, unknown>;
  auditExport?: Record<string, unknown>;
  featureFlagKey?: string | null;
  featureFlagDefault: boolean;
  decisionLogEnabled: boolean;
  humanReviewOnly: boolean;
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
      INSERT INTO ml_shadow_observation_review_decision_logs (
        decision_log_key, decision_log_version, import_id, observation_event_id,
        review_dashboard_key, review_decision_type, review_decision_status,
        reviewer_name, reviewer_role, reviewer_note, evidence_summary_json,
        reviewed_event_ids_json, decision_payload_json, safety_assertions_json,
        decision_policy_json, audit_export_json, feature_flag_key, feature_flag_default,
        decision_log_enabled, human_review_only, runtime_invocation_allowed,
        model_execution_allowed, inference_endpoint_exposed, production_integration_allowed,
        decision_automation_allowed, inventory_accounting_change_allowed, audit_only,
        mutation_allowed, baseline_only_source_of_truth, operational_decision_allowed,
        customer_supplier_message_allowed, forbidden_field_attempt_count, user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.decisionLogKey,
      payload.decisionLogVersion,
      payload.importId || null,
      payload.observationEventId || null,
      payload.reviewDashboardKey || null,
      payload.reviewDecisionType,
      payload.reviewDecisionStatus,
      payload.reviewerName || null,
      payload.reviewerRole || null,
      payload.reviewerNote || null,
      safeJson(payload.evidenceSummary || {}),
      safeJson(payload.reviewedEventIds || []),
      safeJson(payload.decisionPayload || {}),
      safeJson(payload.safetyAssertions || {}),
      safeJson(payload.decisionPolicy || {}),
      safeJson(payload.auditExport || {}),
      payload.featureFlagKey || null,
      payload.featureFlagDefault ? 1 : 0,
      payload.decisionLogEnabled ? 1 : 0,
      payload.humanReviewOnly ? 1 : 0,
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
  return getAsync(`SELECT * FROM ml_shadow_observation_review_decision_logs WHERE id = ?`, [result.lastID]);
};

const decisionProjection = `
  SELECT id, decision_log_key AS decisionLogKey,
         decision_log_version AS decisionLogVersion,
         import_id AS importId, observation_event_id AS observationEventId,
         review_dashboard_key AS reviewDashboardKey,
         review_decision_type AS reviewDecisionType,
         review_decision_status AS reviewDecisionStatus,
         reviewer_name AS reviewerName, reviewer_role AS reviewerRole,
         reviewer_note AS reviewerNote, feature_flag_key AS featureFlagKey,
         feature_flag_default AS featureFlagDefault,
         decision_log_enabled AS decisionLogEnabled,
         human_review_only AS humanReviewOnly,
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
  FROM ml_shadow_observation_review_decision_logs
`;

export const listMlShadowObservationReviewDecisions = async (limitInput?: unknown) => {
  const limit = clampLimit(limitInput, 10, 100);
  return allAsync(
    `${decisionProjection}
      ORDER BY created_at DESC, id DESC
      LIMIT ?`,
    [limit],
  );
};

export const listMlShadowObservationReviewDecisionsByImportId = async (importIdInput: unknown, limitInput?: unknown) => {
  const importId = Number(importIdInput);
  if (!Number.isFinite(importId) || importId <= 0) return [];
  const limit = clampLimit(limitInput, 10, 100);
  return allAsync(
    `${decisionProjection}
      WHERE import_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ?`,
    [importId, limit],
  );
};

export const listMlShadowObservationReviewDecisionsByEventId = async (eventIdInput: unknown, limitInput?: unknown) => {
  const eventId = Number(eventIdInput);
  if (!Number.isFinite(eventId) || eventId <= 0) return [];
  const limit = clampLimit(limitInput, 10, 100);
  return allAsync(
    `${decisionProjection}
      WHERE observation_event_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ?`,
    [eventId, limit],
  );
};
