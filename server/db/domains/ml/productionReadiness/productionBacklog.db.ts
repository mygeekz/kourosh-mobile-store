// Phase 7K-Cleanup DB function module. SQL and behavior preserved.
import { allAsync, getAsync, runAsync } from "../../../query";
import { clampLimit, safeJson } from "../mlDbUtils";


export const recordMlProductionReadinessBacklog = async (payload: {
  backlogKey: string;
  importId?: number | null;
  designSpecId?: number | null;
  modelKey?: string | null;
  modelVersion?: string | null;
  designStatus?: string | null;
  backlogStatus: string;
  releaseGateStatus: string;
  recommendation?: string | null;
  ownerMatrixComplete: boolean;
  riskRegisterStatus: string;
  totalBacklogItems: number;
  readyBacklogItems: number;
  openBlockerCount: number;
  highRiskCount: number;
  architectureOwner?: string | null;
  productOwner?: string | null;
  engineeringOwner?: string | null;
  qaOwner?: string | null;
  securityOwner?: string | null;
  monitoringOwner?: string | null;
  rollbackOwner?: string | null;
  riskOwner?: string | null;
  backlog?: Array<Record<string, unknown>> | Record<string, unknown>;
  riskRegister?: Array<Record<string, unknown>> | Record<string, unknown>;
  ownerMatrix?: Record<string, unknown>;
  releaseGateChecklist?: Array<Record<string, unknown>> | Record<string, unknown>;
  summary?: Record<string, unknown>;
  policy?: Record<string, unknown>;
  userId?: number | null;
}) => {
  const result = await runAsync(
    `
      INSERT INTO ml_production_readiness_backlogs (
        backlog_key, import_id, design_spec_id, model_key, model_version,
        design_status, backlog_status, release_gate_status, recommendation,
        owner_matrix_complete, risk_register_status, total_backlog_items,
        ready_backlog_items, open_blocker_count, high_risk_count,
        architecture_owner, product_owner, engineering_owner, qa_owner,
        security_owner, monitoring_owner, rollback_owner, risk_owner,
        backlog_json, risk_register_json, owner_matrix_json,
        release_gate_checklist_json, summary_json, policy_json, user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.backlogKey,
      payload.importId || null,
      payload.designSpecId || null,
      payload.modelKey || null,
      payload.modelVersion || null,
      payload.designStatus || null,
      payload.backlogStatus,
      payload.releaseGateStatus,
      payload.recommendation || null,
      payload.ownerMatrixComplete ? 1 : 0,
      payload.riskRegisterStatus,
      payload.totalBacklogItems,
      payload.readyBacklogItems,
      payload.openBlockerCount,
      payload.highRiskCount,
      payload.architectureOwner || null,
      payload.productOwner || null,
      payload.engineeringOwner || null,
      payload.qaOwner || null,
      payload.securityOwner || null,
      payload.monitoringOwner || null,
      payload.rollbackOwner || null,
      payload.riskOwner || null,
      safeJson(payload.backlog || []),
      safeJson(payload.riskRegister || []),
      safeJson(payload.ownerMatrix || {}),
      safeJson(payload.releaseGateChecklist || []),
      safeJson(payload.summary || {}),
      safeJson(payload.policy || {}),
      payload.userId || null,
    ],
  );
  return getAsync(`SELECT * FROM ml_production_readiness_backlogs WHERE id = ?`, [result.lastID]);
};

export const listMlProductionReadinessBacklogs = async (limitInput?: unknown) => {
  const limit = clampLimit(limitInput, 10, 100);
  return allAsync(
    `
      SELECT id, backlog_key AS backlogKey, import_id AS importId,
             design_spec_id AS designSpecId, model_key AS modelKey,
             model_version AS modelVersion, design_status AS designStatus,
             backlog_status AS backlogStatus, release_gate_status AS releaseGateStatus,
             recommendation, owner_matrix_complete AS ownerMatrixComplete,
             risk_register_status AS riskRegisterStatus,
             total_backlog_items AS totalBacklogItems,
             ready_backlog_items AS readyBacklogItems,
             open_blocker_count AS openBlockerCount,
             high_risk_count AS highRiskCount,
             architecture_owner AS architectureOwner, product_owner AS productOwner,
             engineering_owner AS engineeringOwner, qa_owner AS qaOwner,
             security_owner AS securityOwner, monitoring_owner AS monitoringOwner,
             rollback_owner AS rollbackOwner, risk_owner AS riskOwner,
             created_at AS createdAt, user_id AS userId
      FROM ml_production_readiness_backlogs
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [limit],
  );
};

export const listMlProductionReadinessBacklogsByImportId = async (importIdInput: unknown, limitInput?: unknown) => {
  const importId = Number(importIdInput);
  if (!Number.isFinite(importId) || importId <= 0) return [];
  const limit = clampLimit(limitInput, 5, 50);
  return allAsync(
    `
      SELECT id, backlog_key AS backlogKey, import_id AS importId,
             design_spec_id AS designSpecId, model_key AS modelKey,
             model_version AS modelVersion, design_status AS designStatus,
             backlog_status AS backlogStatus, release_gate_status AS releaseGateStatus,
             recommendation, owner_matrix_complete AS ownerMatrixComplete,
             risk_register_status AS riskRegisterStatus,
             total_backlog_items AS totalBacklogItems,
             ready_backlog_items AS readyBacklogItems,
             open_blocker_count AS openBlockerCount,
             high_risk_count AS highRiskCount,
             architecture_owner AS architectureOwner, product_owner AS productOwner,
             engineering_owner AS engineeringOwner, qa_owner AS qaOwner,
             security_owner AS securityOwner, monitoring_owner AS monitoringOwner,
             rollback_owner AS rollbackOwner, risk_owner AS riskOwner,
             created_at AS createdAt, user_id AS userId
      FROM ml_production_readiness_backlogs
      WHERE import_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [importId, limit],
  );
};
