// Phase 7K-Cleanup DB function module. SQL and behavior preserved.
import { allAsync, getAsync, runAsync } from "../../../query";
import { clampLimit, safeJson } from "../mlDbUtils";


export const recordMlProductionDryRunCloseoutMemo = async (payload: {
  closeoutMemoKey: string;
  importId?: number | null;
  executionLogId?: number | null;
  dryRunPlanId?: number | null;
  workOrderId?: number | null;
  modelKey?: string | null;
  modelVersion?: string | null;
  executionStatus?: string | null;
  evidenceBinderStatus?: string | null;
  signoffStatus?: string | null;
  closeoutStatus: string;
  finalRecommendation?: string | null;
  readinessScorePct: number;
  evidenceItemCount: number;
  acceptedEvidenceCount: number;
  signoffCount: number;
  unresolvedBlockerCount: number;
  riskCount: number;
  blockerCount: number;
  warningCount: number;
  passCount: number;
  totalGateCount: number;
  memoOwner?: string | null;
  decisionOwner?: string | null;
  reviewBoardChair?: string | null;
  productOwner?: string | null;
  engineeringOwner?: string | null;
  qaOwner?: string | null;
  securityOwner?: string | null;
  monitoringOwner?: string | null;
  rollbackOwner?: string | null;
  closeoutMemo?: Record<string, unknown>;
  evidenceSummary?: Record<string, unknown>;
  signoffSummary?: Record<string, unknown>;
  riskSummary?: Array<Record<string, unknown>> | Record<string, unknown>;
  decisionSummary?: Record<string, unknown>;
  auditExport?: Record<string, unknown>;
  summary?: Record<string, unknown>;
  policy?: Record<string, unknown>;
  userId?: number | null;
}) => {
  const result = await runAsync(
    `
      INSERT INTO ml_production_dry_run_closeout_memos (
        closeout_memo_key, import_id, execution_log_id, dry_run_plan_id, work_order_id,
        model_key, model_version, execution_status, evidence_binder_status, signoff_status,
        closeout_status, final_recommendation, readiness_score_pct, evidence_item_count,
        accepted_evidence_count, signoff_count, unresolved_blocker_count, risk_count,
        blocker_count, warning_count, pass_count, total_gate_count, memo_owner,
        decision_owner, review_board_chair, product_owner, engineering_owner, qa_owner,
        security_owner, monitoring_owner, rollback_owner, closeout_memo_json,
        evidence_summary_json, signoff_summary_json, risk_summary_json, decision_summary_json,
        audit_export_json, summary_json, policy_json, user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.closeoutMemoKey,
      payload.importId || null,
      payload.executionLogId || null,
      payload.dryRunPlanId || null,
      payload.workOrderId || null,
      payload.modelKey || null,
      payload.modelVersion || null,
      payload.executionStatus || null,
      payload.evidenceBinderStatus || null,
      payload.signoffStatus || null,
      payload.closeoutStatus,
      payload.finalRecommendation || null,
      payload.readinessScorePct,
      payload.evidenceItemCount,
      payload.acceptedEvidenceCount,
      payload.signoffCount,
      payload.unresolvedBlockerCount,
      payload.riskCount,
      payload.blockerCount,
      payload.warningCount,
      payload.passCount,
      payload.totalGateCount,
      payload.memoOwner || null,
      payload.decisionOwner || null,
      payload.reviewBoardChair || null,
      payload.productOwner || null,
      payload.engineeringOwner || null,
      payload.qaOwner || null,
      payload.securityOwner || null,
      payload.monitoringOwner || null,
      payload.rollbackOwner || null,
      safeJson(payload.closeoutMemo || {}),
      safeJson(payload.evidenceSummary || {}),
      safeJson(payload.signoffSummary || {}),
      safeJson(payload.riskSummary || []),
      safeJson(payload.decisionSummary || {}),
      safeJson(payload.auditExport || {}),
      safeJson(payload.summary || {}),
      safeJson(payload.policy || {}),
      payload.userId || null,
    ],
  );
  return getAsync(`SELECT * FROM ml_production_dry_run_closeout_memos WHERE id = ?`, [result.lastID]);
};

export const listMlProductionDryRunCloseoutMemos = async (limitInput?: unknown) => {
  const limit = clampLimit(limitInput, 10, 100);
  return allAsync(
    `
      SELECT id, closeout_memo_key AS closeoutMemoKey, import_id AS importId,
             execution_log_id AS executionLogId, dry_run_plan_id AS dryRunPlanId,
             work_order_id AS workOrderId, model_key AS modelKey, model_version AS modelVersion,
             execution_status AS executionStatus, evidence_binder_status AS evidenceBinderStatus,
             signoff_status AS signoffStatus, closeout_status AS closeoutStatus,
             final_recommendation AS finalRecommendation, readiness_score_pct AS readinessScorePct,
             evidence_item_count AS evidenceItemCount, accepted_evidence_count AS acceptedEvidenceCount,
             signoff_count AS signoffCount, unresolved_blocker_count AS unresolvedBlockerCount,
             risk_count AS riskCount, blocker_count AS blockerCount, warning_count AS warningCount,
             pass_count AS passCount, total_gate_count AS totalGateCount,
             memo_owner AS memoOwner, decision_owner AS decisionOwner, review_board_chair AS reviewBoardChair,
             product_owner AS productOwner, engineering_owner AS engineeringOwner, qa_owner AS qaOwner,
             security_owner AS securityOwner, monitoring_owner AS monitoringOwner, rollback_owner AS rollbackOwner,
             created_at AS createdAt, user_id AS userId
      FROM ml_production_dry_run_closeout_memos
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [limit],
  );
};

export const listMlProductionDryRunCloseoutMemosByImportId = async (importIdInput: unknown, limitInput?: unknown) => {
  const importId = Number(importIdInput);
  if (!Number.isFinite(importId) || importId <= 0) return [];
  const limit = clampLimit(limitInput, 5, 50);
  return allAsync(
    `
      SELECT id, closeout_memo_key AS closeoutMemoKey, import_id AS importId,
             execution_log_id AS executionLogId, dry_run_plan_id AS dryRunPlanId,
             work_order_id AS workOrderId, model_key AS modelKey, model_version AS modelVersion,
             execution_status AS executionStatus, evidence_binder_status AS evidenceBinderStatus,
             signoff_status AS signoffStatus, closeout_status AS closeoutStatus,
             final_recommendation AS finalRecommendation, readiness_score_pct AS readinessScorePct,
             evidence_item_count AS evidenceItemCount, accepted_evidence_count AS acceptedEvidenceCount,
             signoff_count AS signoffCount, unresolved_blocker_count AS unresolvedBlockerCount,
             risk_count AS riskCount, blocker_count AS blockerCount, warning_count AS warningCount,
             pass_count AS passCount, total_gate_count AS totalGateCount,
             memo_owner AS memoOwner, decision_owner AS decisionOwner, review_board_chair AS reviewBoardChair,
             product_owner AS productOwner, engineering_owner AS engineeringOwner, qa_owner AS qaOwner,
             security_owner AS securityOwner, monitoring_owner AS monitoringOwner, rollback_owner AS rollbackOwner,
             created_at AS createdAt, user_id AS userId
      FROM ml_production_dry_run_closeout_memos
      WHERE import_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [importId, limit],
  );
};
