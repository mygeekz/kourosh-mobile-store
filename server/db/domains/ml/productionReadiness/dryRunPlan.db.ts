// Phase 7K-Cleanup DB function module. SQL and behavior preserved.
import { allAsync, getAsync, runAsync } from "../../../query";
import { clampLimit, safeJson } from "../mlDbUtils";


export const recordMlProductionImplementationDryRunPlan = async (payload: {
  dryRunKey: string;
  importId?: number | null;
  workOrderId?: number | null;
  charterId?: number | null;
  modelKey?: string | null;
  modelVersion?: string | null;
  workOrderStatus?: string | null;
  releaseHandoffStatus?: string | null;
  dryRunStatus: string;
  recommendation?: string | null;
  readinessScorePct: number;
  dependencySequenceStatus?: string | null;
  milestonePlanStatus?: string | null;
  blockerCount: number;
  warningCount: number;
  passCount: number;
  totalGateCount: number;
  dependencyCount: number;
  milestoneCount: number;
  dryRunTaskCount: number;
  productOwner?: string | null;
  engineeringOwner?: string | null;
  qaOwner?: string | null;
  securityOwner?: string | null;
  monitoringOwner?: string | null;
  rollbackOwner?: string | null;
  changeManager?: string | null;
  releaseManager?: string | null;
  dryRunPlan?: Record<string, unknown>;
  dependencySequence?: Array<Record<string, unknown>> | Record<string, unknown>;
  milestonePlan?: Array<Record<string, unknown>> | Record<string, unknown>;
  readinessBlockers?: Array<Record<string, unknown>> | Record<string, unknown>;
  dryRunChecklist?: Array<Record<string, unknown>> | Record<string, unknown>;
  auditExport?: Record<string, unknown>;
  summary?: Record<string, unknown>;
  policy?: Record<string, unknown>;
  userId?: number | null;
}) => {
  const result = await runAsync(
    `
      INSERT INTO ml_production_implementation_dry_run_plans (
        dry_run_key, import_id, work_order_id, charter_id, model_key, model_version,
        work_order_status, release_handoff_status, dry_run_status, recommendation,
        readiness_score_pct, dependency_sequence_status, milestone_plan_status,
        blocker_count, warning_count, pass_count, total_gate_count, dependency_count,
        milestone_count, dry_run_task_count, product_owner, engineering_owner, qa_owner,
        security_owner, monitoring_owner, rollback_owner, change_manager, release_manager,
        dry_run_plan_json, dependency_sequence_json, milestone_plan_json, readiness_blockers_json,
        dry_run_checklist_json, audit_export_json, summary_json, policy_json, user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.dryRunKey,
      payload.importId || null,
      payload.workOrderId || null,
      payload.charterId || null,
      payload.modelKey || null,
      payload.modelVersion || null,
      payload.workOrderStatus || null,
      payload.releaseHandoffStatus || null,
      payload.dryRunStatus,
      payload.recommendation || null,
      payload.readinessScorePct,
      payload.dependencySequenceStatus || null,
      payload.milestonePlanStatus || null,
      payload.blockerCount,
      payload.warningCount,
      payload.passCount,
      payload.totalGateCount,
      payload.dependencyCount,
      payload.milestoneCount,
      payload.dryRunTaskCount,
      payload.productOwner || null,
      payload.engineeringOwner || null,
      payload.qaOwner || null,
      payload.securityOwner || null,
      payload.monitoringOwner || null,
      payload.rollbackOwner || null,
      payload.changeManager || null,
      payload.releaseManager || null,
      safeJson(payload.dryRunPlan || {}),
      safeJson(payload.dependencySequence || []),
      safeJson(payload.milestonePlan || []),
      safeJson(payload.readinessBlockers || []),
      safeJson(payload.dryRunChecklist || []),
      safeJson(payload.auditExport || {}),
      safeJson(payload.summary || {}),
      safeJson(payload.policy || {}),
      payload.userId || null,
    ],
  );
  return getAsync(`SELECT * FROM ml_production_implementation_dry_run_plans WHERE id = ?`, [result.lastID]);
};

export const listMlProductionImplementationDryRunPlans = async (limitInput?: unknown) => {
  const limit = clampLimit(limitInput, 10, 100);
  return allAsync(
    `
      SELECT id, dry_run_key AS dryRunKey, import_id AS importId,
             work_order_id AS workOrderId, charter_id AS charterId,
             model_key AS modelKey, model_version AS modelVersion,
             work_order_status AS workOrderStatus, release_handoff_status AS releaseHandoffStatus,
             dry_run_status AS dryRunStatus, recommendation,
             readiness_score_pct AS readinessScorePct,
             dependency_sequence_status AS dependencySequenceStatus,
             milestone_plan_status AS milestonePlanStatus,
             blocker_count AS blockerCount, warning_count AS warningCount,
             pass_count AS passCount, total_gate_count AS totalGateCount,
             dependency_count AS dependencyCount, milestone_count AS milestoneCount,
             dry_run_task_count AS dryRunTaskCount,
             product_owner AS productOwner, engineering_owner AS engineeringOwner,
             qa_owner AS qaOwner, security_owner AS securityOwner,
             monitoring_owner AS monitoringOwner, rollback_owner AS rollbackOwner,
             change_manager AS changeManager, release_manager AS releaseManager,
             created_at AS createdAt, user_id AS userId
      FROM ml_production_implementation_dry_run_plans
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [limit],
  );
};

export const listMlProductionImplementationDryRunPlansByImportId = async (importIdInput: unknown, limitInput?: unknown) => {
  const importId = Number(importIdInput);
  if (!Number.isFinite(importId) || importId <= 0) return [];
  const limit = clampLimit(limitInput, 5, 50);
  return allAsync(
    `
      SELECT id, dry_run_key AS dryRunKey, import_id AS importId,
             work_order_id AS workOrderId, charter_id AS charterId,
             model_key AS modelKey, model_version AS modelVersion,
             work_order_status AS workOrderStatus, release_handoff_status AS releaseHandoffStatus,
             dry_run_status AS dryRunStatus, recommendation,
             readiness_score_pct AS readinessScorePct,
             dependency_sequence_status AS dependencySequenceStatus,
             milestone_plan_status AS milestonePlanStatus,
             blocker_count AS blockerCount, warning_count AS warningCount,
             pass_count AS passCount, total_gate_count AS totalGateCount,
             dependency_count AS dependencyCount, milestone_count AS milestoneCount,
             dry_run_task_count AS dryRunTaskCount,
             product_owner AS productOwner, engineering_owner AS engineeringOwner,
             qa_owner AS qaOwner, security_owner AS securityOwner,
             monitoring_owner AS monitoringOwner, rollback_owner AS rollbackOwner,
             change_manager AS changeManager, release_manager AS releaseManager,
             created_at AS createdAt, user_id AS userId
      FROM ml_production_implementation_dry_run_plans
      WHERE import_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [importId, limit],
  );
};
