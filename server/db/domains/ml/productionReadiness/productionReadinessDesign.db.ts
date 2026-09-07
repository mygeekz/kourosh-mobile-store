// Phase 7K-Cleanup DB function module. SQL and behavior preserved.
import { allAsync, getAsync, runAsync } from "../../../query";
import { clampLimit, safeJson } from "../mlDbUtils";


export const recordMlProductionReadinessDesignSpec = async (payload: {
  designKey: string;
  importId?: number | null;
  closeoutId?: number | null;
  modelKey?: string | null;
  modelVersion?: string | null;
  closeoutStatus?: string | null;
  rollbackStatus: string;
  designStatus: string;
  recommendation?: string | null;
  productionReadinessDesignPreconditionsMet: boolean;
  architectureOwner?: string | null;
  securityReviewOwner?: string | null;
  monitoringOwner?: string | null;
  rollbackOwner?: string | null;
  manualOverrideOwner?: string | null;
  architectureSpec?: Record<string, unknown>;
  safetyArchitecture?: Record<string, unknown>;
  rolloutRollbackPlan?: Record<string, unknown>;
  auditDesignSpec?: Record<string, unknown>;
  summary?: Record<string, unknown>;
  policy?: Record<string, unknown>;
  userId?: number | null;
}) => {
  const result = await runAsync(
    `
      INSERT INTO ml_production_readiness_design_specs (
        design_key, import_id, closeout_id, model_key, model_version,
        closeout_status, rollback_status, design_status, recommendation,
        production_readiness_design_preconditions_met, architecture_owner,
        security_review_owner, monitoring_owner, rollback_owner,
        manual_override_owner, architecture_spec_json, safety_architecture_json,
        rollout_rollback_plan_json, audit_design_spec_json, summary_json,
        policy_json, user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.designKey,
      payload.importId || null,
      payload.closeoutId || null,
      payload.modelKey || null,
      payload.modelVersion || null,
      payload.closeoutStatus || null,
      payload.rollbackStatus,
      payload.designStatus,
      payload.recommendation || null,
      payload.productionReadinessDesignPreconditionsMet ? 1 : 0,
      payload.architectureOwner || null,
      payload.securityReviewOwner || null,
      payload.monitoringOwner || null,
      payload.rollbackOwner || null,
      payload.manualOverrideOwner || null,
      safeJson(payload.architectureSpec || {}),
      safeJson(payload.safetyArchitecture || {}),
      safeJson(payload.rolloutRollbackPlan || {}),
      safeJson(payload.auditDesignSpec || {}),
      safeJson(payload.summary || {}),
      safeJson(payload.policy || {}),
      payload.userId || null,
    ],
  );
  return getAsync(`SELECT * FROM ml_production_readiness_design_specs WHERE id = ?`, [result.lastID]);
};

export const listMlProductionReadinessDesignSpecs = async (limitInput?: unknown) => {
  const limit = clampLimit(limitInput, 10, 100);
  return allAsync(
    `
      SELECT id, design_key AS designKey, import_id AS importId,
             closeout_id AS closeoutId, model_key AS modelKey,
             model_version AS modelVersion, closeout_status AS closeoutStatus,
             rollback_status AS rollbackStatus, design_status AS designStatus,
             recommendation,
             production_readiness_design_preconditions_met AS productionReadinessDesignPreconditionsMet,
             architecture_owner AS architectureOwner,
             security_review_owner AS securityReviewOwner,
             monitoring_owner AS monitoringOwner, rollback_owner AS rollbackOwner,
             manual_override_owner AS manualOverrideOwner,
             created_at AS createdAt, user_id AS userId
      FROM ml_production_readiness_design_specs
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [limit],
  );
};

export const listMlProductionReadinessDesignSpecsByImportId = async (importIdInput: unknown, limitInput?: unknown) => {
  const importId = Number(importIdInput);
  if (!Number.isFinite(importId) || importId <= 0) return [];
  const limit = clampLimit(limitInput, 5, 50);
  return allAsync(
    `
      SELECT id, design_key AS designKey, import_id AS importId,
             closeout_id AS closeoutId, model_key AS modelKey,
             model_version AS modelVersion, closeout_status AS closeoutStatus,
             rollback_status AS rollbackStatus, design_status AS designStatus,
             recommendation,
             production_readiness_design_preconditions_met AS productionReadinessDesignPreconditionsMet,
             architecture_owner AS architectureOwner,
             security_review_owner AS securityReviewOwner,
             monitoring_owner AS monitoringOwner, rollback_owner AS rollbackOwner,
             manual_override_owner AS manualOverrideOwner,
             created_at AS createdAt, user_id AS userId
      FROM ml_production_readiness_design_specs
      WHERE import_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [importId, limit],
  );
};
