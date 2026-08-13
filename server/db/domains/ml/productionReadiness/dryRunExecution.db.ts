// Phase 7K-Cleanup DB function module. SQL and behavior preserved.
import { allAsync, getAsync, runAsync } from "../../../query";
import { clampLimit, safeJson } from "../mlDbUtils";


export const recordMlProductionDryRunExecutionLog = async (payload: {
  executionLogKey: string;
  importId?: number | null;
  dryRunPlanId?: number | null;
  workOrderId?: number | null;
  modelKey?: string | null;
  modelVersion?: string | null;
  dryRunStatus?: string | null;
  executionStatus: string;
  recommendation?: string | null;
  readinessScorePct: number;
  evidenceBinderStatus?: string | null;
  signoffStatus?: string | null;
  evidenceItemCount: number;
  acceptedEvidenceCount: number;
  signoffCount: number;
  unresolvedBlockerCount: number;
  blockerCount: number;
  warningCount: number;
  passCount: number;
  totalGateCount: number;
  productOwner?: string | null;
  engineeringOwner?: string | null;
  qaOwner?: string | null;
  securityOwner?: string | null;
  monitoringOwner?: string | null;
  rollbackOwner?: string | null;
  changeManager?: string | null;
  releaseManager?: string | null;
  evidenceItems?: Array<Record<string, unknown>> | Record<string, unknown>;
  signoffs?: Array<Record<string, unknown>> | Record<string, unknown>;
  unresolvedBlockers?: Array<Record<string, unknown>> | Record<string, unknown>;
  evidenceBinder?: Record<string, unknown>;
  auditExport?: Record<string, unknown>;
  summary?: Record<string, unknown>;
  policy?: Record<string, unknown>;
  userId?: number | null;
}) => {
  const result = await runAsync(
    `
      INSERT INTO ml_production_dry_run_execution_logs (
        execution_log_key, import_id, dry_run_plan_id, work_order_id, model_key, model_version,
        dry_run_status, execution_status, recommendation, readiness_score_pct,
        evidence_binder_status, signoff_status, evidence_item_count, accepted_evidence_count,
        signoff_count, unresolved_blocker_count, blocker_count, warning_count, pass_count,
        total_gate_count, product_owner, engineering_owner, qa_owner, security_owner,
        monitoring_owner, rollback_owner, change_manager, release_manager, evidence_items_json,
        signoffs_json, unresolved_blockers_json, evidence_binder_json, audit_export_json,
        summary_json, policy_json, user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.executionLogKey,
      payload.importId || null,
      payload.dryRunPlanId || null,
      payload.workOrderId || null,
      payload.modelKey || null,
      payload.modelVersion || null,
      payload.dryRunStatus || null,
      payload.executionStatus,
      payload.recommendation || null,
      payload.readinessScorePct,
      payload.evidenceBinderStatus || null,
      payload.signoffStatus || null,
      payload.evidenceItemCount,
      payload.acceptedEvidenceCount,
      payload.signoffCount,
      payload.unresolvedBlockerCount,
      payload.blockerCount,
      payload.warningCount,
      payload.passCount,
      payload.totalGateCount,
      payload.productOwner || null,
      payload.engineeringOwner || null,
      payload.qaOwner || null,
      payload.securityOwner || null,
      payload.monitoringOwner || null,
      payload.rollbackOwner || null,
      payload.changeManager || null,
      payload.releaseManager || null,
      safeJson(payload.evidenceItems || []),
      safeJson(payload.signoffs || []),
      safeJson(payload.unresolvedBlockers || []),
      safeJson(payload.evidenceBinder || {}),
      safeJson(payload.auditExport || {}),
      safeJson(payload.summary || {}),
      safeJson(payload.policy || {}),
      payload.userId || null,
    ],
  );
  return getAsync(`SELECT * FROM ml_production_dry_run_execution_logs WHERE id = ?`, [result.lastID]);
};

export const listMlProductionDryRunExecutionLogs = async (limitInput?: unknown) => {
  const limit = clampLimit(limitInput, 10, 100);
  return allAsync(
    `
      SELECT id, execution_log_key AS executionLogKey, import_id AS importId,
             dry_run_plan_id AS dryRunPlanId, work_order_id AS workOrderId,
             model_key AS modelKey, model_version AS modelVersion,
             dry_run_status AS dryRunStatus, execution_status AS executionStatus,
             recommendation, readiness_score_pct AS readinessScorePct,
             evidence_binder_status AS evidenceBinderStatus, signoff_status AS signoffStatus,
             evidence_item_count AS evidenceItemCount, accepted_evidence_count AS acceptedEvidenceCount,
             signoff_count AS signoffCount, unresolved_blocker_count AS unresolvedBlockerCount,
             blocker_count AS blockerCount, warning_count AS warningCount,
             pass_count AS passCount, total_gate_count AS totalGateCount,
             product_owner AS productOwner, engineering_owner AS engineeringOwner,
             qa_owner AS qaOwner, security_owner AS securityOwner,
             monitoring_owner AS monitoringOwner, rollback_owner AS rollbackOwner,
             change_manager AS changeManager, release_manager AS releaseManager,
             created_at AS createdAt, user_id AS userId
      FROM ml_production_dry_run_execution_logs
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [limit],
  );
};

export const listMlProductionDryRunExecutionLogsByImportId = async (importIdInput: unknown, limitInput?: unknown) => {
  const importId = Number(importIdInput);
  if (!Number.isFinite(importId) || importId <= 0) return [];
  const limit = clampLimit(limitInput, 5, 50);
  return allAsync(
    `
      SELECT id, execution_log_key AS executionLogKey, import_id AS importId,
             dry_run_plan_id AS dryRunPlanId, work_order_id AS workOrderId,
             model_key AS modelKey, model_version AS modelVersion,
             dry_run_status AS dryRunStatus, execution_status AS executionStatus,
             recommendation, readiness_score_pct AS readinessScorePct,
             evidence_binder_status AS evidenceBinderStatus, signoff_status AS signoffStatus,
             evidence_item_count AS evidenceItemCount, accepted_evidence_count AS acceptedEvidenceCount,
             signoff_count AS signoffCount, unresolved_blocker_count AS unresolvedBlockerCount,
             blocker_count AS blockerCount, warning_count AS warningCount,
             pass_count AS passCount, total_gate_count AS totalGateCount,
             product_owner AS productOwner, engineering_owner AS engineeringOwner,
             qa_owner AS qaOwner, security_owner AS securityOwner,
             monitoring_owner AS monitoringOwner, rollback_owner AS rollbackOwner,
             change_manager AS changeManager, release_manager AS releaseManager,
             created_at AS createdAt, user_id AS userId
      FROM ml_production_dry_run_execution_logs
      WHERE import_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [importId, limit],
  );
};
