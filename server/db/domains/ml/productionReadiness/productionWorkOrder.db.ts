// Phase 7K-Cleanup DB function module. SQL and behavior preserved.
import { allAsync, getAsync, runAsync } from "../../../query";
import { clampLimit, safeJson } from "../mlDbUtils";


export const recordMlProductionImplementationWorkOrder = async (payload: {
  workOrderKey: string;
  importId?: number | null;
  charterId?: number | null;
  modelKey?: string | null;
  modelVersion?: string | null;
  charterStatus?: string | null;
  charterGoNoGoStatus?: string | null;
  workOrderStatus: string;
  recommendation?: string | null;
  readinessScorePct: number;
  workOrderScopeStatus?: string | null;
  ownerMatrixStatus?: string | null;
  releaseHandoffStatus?: string | null;
  epicCount: number;
  taskCount: number;
  acceptanceCriteriaCount: number;
  qaChecklistCount: number;
  rolloutChecklistCount: number;
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
  workOrder?: Record<string, unknown>;
  epicBreakdown?: Array<Record<string, unknown>> | Record<string, unknown>;
  taskBreakdown?: Array<Record<string, unknown>> | Record<string, unknown>;
  acceptanceCriteria?: Array<Record<string, unknown>> | Record<string, unknown>;
  qaPlan?: Record<string, unknown>;
  rolloutChecklist?: Array<Record<string, unknown>> | Record<string, unknown>;
  auditExport?: Record<string, unknown>;
  summary?: Record<string, unknown>;
  policy?: Record<string, unknown>;
  userId?: number | null;
}) => {
  const result = await runAsync(
    `
      INSERT INTO ml_production_implementation_work_order_packs (
        work_order_key, import_id, charter_id, model_key, model_version,
        charter_status, charter_go_no_go_status, work_order_status, recommendation,
        readiness_score_pct, work_order_scope_status, owner_matrix_status, release_handoff_status,
        epic_count, task_count, acceptance_criteria_count, qa_checklist_count, rollout_checklist_count,
        blocker_count, warning_count, pass_count, total_gate_count, product_owner, engineering_owner,
        qa_owner, security_owner, monitoring_owner, rollback_owner, change_manager, release_manager,
        work_order_json, epic_breakdown_json, task_breakdown_json, acceptance_criteria_json,
        qa_plan_json, rollout_checklist_json, audit_export_json, summary_json, policy_json, user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.workOrderKey,
      payload.importId || null,
      payload.charterId || null,
      payload.modelKey || null,
      payload.modelVersion || null,
      payload.charterStatus || null,
      payload.charterGoNoGoStatus || null,
      payload.workOrderStatus,
      payload.recommendation || null,
      payload.readinessScorePct,
      payload.workOrderScopeStatus || null,
      payload.ownerMatrixStatus || null,
      payload.releaseHandoffStatus || null,
      payload.epicCount,
      payload.taskCount,
      payload.acceptanceCriteriaCount,
      payload.qaChecklistCount,
      payload.rolloutChecklistCount,
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
      safeJson(payload.workOrder || {}),
      safeJson(payload.epicBreakdown || []),
      safeJson(payload.taskBreakdown || []),
      safeJson(payload.acceptanceCriteria || []),
      safeJson(payload.qaPlan || {}),
      safeJson(payload.rolloutChecklist || []),
      safeJson(payload.auditExport || {}),
      safeJson(payload.summary || {}),
      safeJson(payload.policy || {}),
      payload.userId || null,
    ],
  );
  return getAsync(`SELECT * FROM ml_production_implementation_work_order_packs WHERE id = ?`, [result.lastID]);
};

export const listMlProductionImplementationWorkOrders = async (limitInput?: unknown) => {
  const limit = clampLimit(limitInput, 10, 100);
  return allAsync(
    `
      SELECT id, work_order_key AS workOrderKey, import_id AS importId,
             charter_id AS charterId, model_key AS modelKey, model_version AS modelVersion,
             charter_status AS charterStatus, charter_go_no_go_status AS charterGoNoGoStatus,
             work_order_status AS workOrderStatus, recommendation, readiness_score_pct AS readinessScorePct,
             work_order_scope_status AS workOrderScopeStatus, owner_matrix_status AS ownerMatrixStatus,
             release_handoff_status AS releaseHandoffStatus, epic_count AS epicCount,
             task_count AS taskCount, acceptance_criteria_count AS acceptanceCriteriaCount,
             qa_checklist_count AS qaChecklistCount, rollout_checklist_count AS rolloutChecklistCount,
             blocker_count AS blockerCount, warning_count AS warningCount,
             pass_count AS passCount, total_gate_count AS totalGateCount,
             product_owner AS productOwner, engineering_owner AS engineeringOwner,
             qa_owner AS qaOwner, security_owner AS securityOwner,
             monitoring_owner AS monitoringOwner, rollback_owner AS rollbackOwner,
             change_manager AS changeManager, release_manager AS releaseManager,
             created_at AS createdAt, user_id AS userId
      FROM ml_production_implementation_work_order_packs
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [limit],
  );
};

export const listMlProductionImplementationWorkOrdersByImportId = async (importIdInput: unknown, limitInput?: unknown) => {
  const importId = Number(importIdInput);
  if (!Number.isFinite(importId) || importId <= 0) return [];
  const limit = clampLimit(limitInput, 5, 50);
  return allAsync(
    `
      SELECT id, work_order_key AS workOrderKey, import_id AS importId,
             charter_id AS charterId, model_key AS modelKey, model_version AS modelVersion,
             charter_status AS charterStatus, charter_go_no_go_status AS charterGoNoGoStatus,
             work_order_status AS workOrderStatus, recommendation, readiness_score_pct AS readinessScorePct,
             work_order_scope_status AS workOrderScopeStatus, owner_matrix_status AS ownerMatrixStatus,
             release_handoff_status AS releaseHandoffStatus, epic_count AS epicCount,
             task_count AS taskCount, acceptance_criteria_count AS acceptanceCriteriaCount,
             qa_checklist_count AS qaChecklistCount, rollout_checklist_count AS rolloutChecklistCount,
             blocker_count AS blockerCount, warning_count AS warningCount,
             pass_count AS passCount, total_gate_count AS totalGateCount,
             product_owner AS productOwner, engineering_owner AS engineeringOwner,
             qa_owner AS qaOwner, security_owner AS securityOwner,
             monitoring_owner AS monitoringOwner, rollback_owner AS rollbackOwner,
             change_manager AS changeManager, release_manager AS releaseManager,
             created_at AS createdAt, user_id AS userId
      FROM ml_production_implementation_work_order_packs
      WHERE import_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [importId, limit],
  );
};
