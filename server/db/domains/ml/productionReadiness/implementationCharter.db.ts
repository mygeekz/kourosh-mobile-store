// Phase 7K-Cleanup DB function module. SQL and behavior preserved.
import { allAsync, getAsync, runAsync } from "../../../query";
import { clampLimit, safeJson } from "../mlDbUtils";


export const recordMlProductionImplementationCharter = async (payload: {
  charterKey: string;
  importId?: number | null;
  simulationId?: number | null;
  backlogId?: number | null;
  modelKey?: string | null;
  modelVersion?: string | null;
  simulationStatus?: string | null;
  simulatedReleaseGateStatus?: string | null;
  charterStatus: string;
  recommendation?: string | null;
  readinessScorePct: number;
  scopeBoundaryStatus?: string | null;
  ownerMatrixStatus?: string | null;
  goNoGoStatus?: string | null;
  blockerCount: number;
  warningCount: number;
  passCount: number;
  totalGateCount: number;
  signoffOwner?: string | null;
  executiveSponsor?: string | null;
  productOwner?: string | null;
  engineeringOwner?: string | null;
  qaOwner?: string | null;
  securityOwner?: string | null;
  monitoringOwner?: string | null;
  rollbackOwner?: string | null;
  changeManager?: string | null;
  charter?: Record<string, unknown>;
  scopeBoundary?: Record<string, unknown>;
  responsibilityMatrix?: Record<string, unknown>;
  goNoGoChecklist?: Array<Record<string, unknown>> | Record<string, unknown>;
  auditExport?: Record<string, unknown>;
  summary?: Record<string, unknown>;
  policy?: Record<string, unknown>;
  userId?: number | null;
}) => {
  const result = await runAsync(
    `
      INSERT INTO ml_production_implementation_readiness_charters (
        charter_key, import_id, simulation_id, backlog_id, model_key, model_version,
        simulation_status, simulated_release_gate_status, charter_status, recommendation,
        readiness_score_pct, scope_boundary_status, owner_matrix_status, go_no_go_status,
        blocker_count, warning_count, pass_count, total_gate_count, signoff_owner,
        executive_sponsor, product_owner, engineering_owner, qa_owner, security_owner,
        monitoring_owner, rollback_owner, change_manager, charter_json, scope_boundary_json,
        responsibility_matrix_json, go_no_go_checklist_json, audit_export_json, summary_json,
        policy_json, user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.charterKey,
      payload.importId || null,
      payload.simulationId || null,
      payload.backlogId || null,
      payload.modelKey || null,
      payload.modelVersion || null,
      payload.simulationStatus || null,
      payload.simulatedReleaseGateStatus || null,
      payload.charterStatus,
      payload.recommendation || null,
      payload.readinessScorePct,
      payload.scopeBoundaryStatus || null,
      payload.ownerMatrixStatus || null,
      payload.goNoGoStatus || null,
      payload.blockerCount,
      payload.warningCount,
      payload.passCount,
      payload.totalGateCount,
      payload.signoffOwner || null,
      payload.executiveSponsor || null,
      payload.productOwner || null,
      payload.engineeringOwner || null,
      payload.qaOwner || null,
      payload.securityOwner || null,
      payload.monitoringOwner || null,
      payload.rollbackOwner || null,
      payload.changeManager || null,
      safeJson(payload.charter || {}),
      safeJson(payload.scopeBoundary || {}),
      safeJson(payload.responsibilityMatrix || {}),
      safeJson(payload.goNoGoChecklist || []),
      safeJson(payload.auditExport || {}),
      safeJson(payload.summary || {}),
      safeJson(payload.policy || {}),
      payload.userId || null,
    ],
  );
  return getAsync(`SELECT * FROM ml_production_implementation_readiness_charters WHERE id = ?`, [result.lastID]);
};

export const listMlProductionImplementationCharters = async (limitInput?: unknown) => {
  const limit = clampLimit(limitInput, 10, 100);
  return allAsync(
    `
      SELECT id, charter_key AS charterKey, import_id AS importId,
             simulation_id AS simulationId, backlog_id AS backlogId,
             model_key AS modelKey, model_version AS modelVersion,
             simulation_status AS simulationStatus,
             simulated_release_gate_status AS simulatedReleaseGateStatus,
             charter_status AS charterStatus, recommendation,
             readiness_score_pct AS readinessScorePct,
             scope_boundary_status AS scopeBoundaryStatus,
             owner_matrix_status AS ownerMatrixStatus,
             go_no_go_status AS goNoGoStatus,
             blocker_count AS blockerCount, warning_count AS warningCount,
             pass_count AS passCount, total_gate_count AS totalGateCount,
             signoff_owner AS signoffOwner, executive_sponsor AS executiveSponsor,
             product_owner AS productOwner, engineering_owner AS engineeringOwner,
             qa_owner AS qaOwner, security_owner AS securityOwner,
             monitoring_owner AS monitoringOwner, rollback_owner AS rollbackOwner,
             change_manager AS changeManager, created_at AS createdAt, user_id AS userId
      FROM ml_production_implementation_readiness_charters
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [limit],
  );
};

export const listMlProductionImplementationChartersByImportId = async (importIdInput: unknown, limitInput?: unknown) => {
  const importId = Number(importIdInput);
  if (!Number.isFinite(importId) || importId <= 0) return [];
  const limit = clampLimit(limitInput, 5, 50);
  return allAsync(
    `
      SELECT id, charter_key AS charterKey, import_id AS importId,
             simulation_id AS simulationId, backlog_id AS backlogId,
             model_key AS modelKey, model_version AS modelVersion,
             simulation_status AS simulationStatus,
             simulated_release_gate_status AS simulatedReleaseGateStatus,
             charter_status AS charterStatus, recommendation,
             readiness_score_pct AS readinessScorePct,
             scope_boundary_status AS scopeBoundaryStatus,
             owner_matrix_status AS ownerMatrixStatus,
             go_no_go_status AS goNoGoStatus,
             blocker_count AS blockerCount, warning_count AS warningCount,
             pass_count AS passCount, total_gate_count AS totalGateCount,
             signoff_owner AS signoffOwner, executive_sponsor AS executiveSponsor,
             product_owner AS productOwner, engineering_owner AS engineeringOwner,
             qa_owner AS qaOwner, security_owner AS securityOwner,
             monitoring_owner AS monitoringOwner, rollback_owner AS rollbackOwner,
             change_manager AS changeManager, created_at AS createdAt, user_id AS userId
      FROM ml_production_implementation_readiness_charters
      WHERE import_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [importId, limit],
  );
};
