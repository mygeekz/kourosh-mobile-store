import { allAsync, getAsync, runAsync } from "../../query";
import { clampLimit, safeJson } from "./mlDbUtils";

export const recordMlOfflinePilotReadinessCheck = async (payload: {
  gateKey: string;
  importId?: number | null;
  stabilityCheckId?: number | null;
  modelKey?: string | null;
  modelVersion?: string | null;
  stabilityStatus?: string | null;
  stabilityEvaluationsConsidered: number;
  minimumEvaluations: number;
  avgDeltaF1Pct?: number | null;
  avgDeltaBalancedAccuracyPct?: number | null;
  ownerApproved: boolean;
  ownerName?: string | null;
  pilotOwner?: string | null;
  rollbackOwner?: string | null;
  monitoringCadence: string;
  status: string;
  offlinePilotReady: boolean;
  rollbackPolicy?: Record<string, unknown>;
  monitoringPlan?: Record<string, unknown>;
  summary?: Record<string, unknown>;
  policy?: Record<string, unknown>;
  userId?: number | null;
}) => {
  const result = await runAsync(
    `
      INSERT INTO ml_offline_pilot_readiness_checks (
        gate_key, import_id, stability_check_id, model_key, model_version,
        stability_status, stability_evaluations_considered, minimum_evaluations,
        avg_delta_f1_pct, avg_delta_balanced_accuracy_pct, owner_approved,
        owner_name, pilot_owner, rollback_owner, monitoring_cadence, status,
        offline_pilot_ready, rollback_policy_json, monitoring_plan_json,
        summary_json, policy_json, user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.gateKey,
      payload.importId || null,
      payload.stabilityCheckId || null,
      payload.modelKey || null,
      payload.modelVersion || null,
      payload.stabilityStatus || null,
      payload.stabilityEvaluationsConsidered,
      payload.minimumEvaluations,
      payload.avgDeltaF1Pct ?? null,
      payload.avgDeltaBalancedAccuracyPct ?? null,
      payload.ownerApproved ? 1 : 0,
      payload.ownerName || null,
      payload.pilotOwner || null,
      payload.rollbackOwner || null,
      payload.monitoringCadence,
      payload.status,
      payload.offlinePilotReady ? 1 : 0,
      safeJson(payload.rollbackPolicy || {}),
      safeJson(payload.monitoringPlan || {}),
      safeJson(payload.summary || {}),
      safeJson(payload.policy || {}),
      payload.userId || null,
    ],
  );
  return getAsync(`SELECT * FROM ml_offline_pilot_readiness_checks WHERE id = ?`, [result.lastID]);
};

export const listMlOfflinePilotReadinessChecks = async (limitInput?: unknown) => {
  const limit = clampLimit(limitInput, 10, 100);
  return allAsync(
    `
      SELECT id, gate_key AS gateKey, import_id AS importId,
             stability_check_id AS stabilityCheckId, model_key AS modelKey,
             model_version AS modelVersion, stability_status AS stabilityStatus,
             stability_evaluations_considered AS stabilityEvaluationsConsidered,
             minimum_evaluations AS minimumEvaluations,
             avg_delta_f1_pct AS avgDeltaF1Pct,
             avg_delta_balanced_accuracy_pct AS avgDeltaBalancedAccuracyPct,
             owner_approved AS ownerApproved, owner_name AS ownerName,
             pilot_owner AS pilotOwner, rollback_owner AS rollbackOwner,
             monitoring_cadence AS monitoringCadence, status,
             offline_pilot_ready AS offlinePilotReady,
             created_at AS createdAt, user_id AS userId
      FROM ml_offline_pilot_readiness_checks
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [limit],
  );
};

export const listMlOfflinePilotReadinessChecksByImportId = async (importIdInput: unknown, limitInput?: unknown) => {
  const importId = Number(importIdInput);
  if (!Number.isFinite(importId) || importId <= 0) return [];
  const limit = clampLimit(limitInput, 5, 50);
  return allAsync(
    `
      SELECT id, gate_key AS gateKey, import_id AS importId,
             stability_check_id AS stabilityCheckId, model_key AS modelKey,
             model_version AS modelVersion, stability_status AS stabilityStatus,
             stability_evaluations_considered AS stabilityEvaluationsConsidered,
             minimum_evaluations AS minimumEvaluations,
             avg_delta_f1_pct AS avgDeltaF1Pct,
             avg_delta_balanced_accuracy_pct AS avgDeltaBalancedAccuracyPct,
             owner_approved AS ownerApproved, owner_name AS ownerName,
             pilot_owner AS pilotOwner, rollback_owner AS rollbackOwner,
             monitoring_cadence AS monitoringCadence, status,
             offline_pilot_ready AS offlinePilotReady,
             created_at AS createdAt, user_id AS userId
      FROM ml_offline_pilot_readiness_checks
      WHERE import_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [importId, limit],
  );
};

export const recordMlOfflinePilotDecisionReview = async (payload: {
  decisionKey: string;
  importId?: number | null;
  offlinePilotCheckId?: number | null;
  modelKey?: string | null;
  modelVersion?: string | null;
  boardDecision: string;
  boardStatus: string;
  boardScope: string;
  avgDeltaF1Pct?: number | null;
  avgDeltaBalancedAccuracyPct?: number | null;
  pilotOwner?: string | null;
  rollbackOwner?: string | null;
  reviewBoard?: Record<string, unknown>;
  decision?: Record<string, unknown>;
  actionItems?: Record<string, unknown> | Array<Record<string, unknown>>;
  summary?: Record<string, unknown>;
  policy?: Record<string, unknown>;
  userId?: number | null;
}) => {
  const result = await runAsync(
    `
      INSERT INTO ml_offline_pilot_decision_reviews (
        decision_key, import_id, offline_pilot_check_id, model_key, model_version,
        board_decision, board_status, board_scope, avg_delta_f1_pct,
        avg_delta_balanced_accuracy_pct, pilot_owner, rollback_owner,
        review_board_json, decision_json, action_items_json, summary_json,
        policy_json, user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.decisionKey,
      payload.importId || null,
      payload.offlinePilotCheckId || null,
      payload.modelKey || null,
      payload.modelVersion || null,
      payload.boardDecision,
      payload.boardStatus,
      payload.boardScope,
      payload.avgDeltaF1Pct ?? null,
      payload.avgDeltaBalancedAccuracyPct ?? null,
      payload.pilotOwner || null,
      payload.rollbackOwner || null,
      safeJson(payload.reviewBoard || {}),
      safeJson(payload.decision || {}),
      safeJson(payload.actionItems || []),
      safeJson(payload.summary || {}),
      safeJson(payload.policy || {}),
      payload.userId || null,
    ],
  );
  return getAsync(`SELECT * FROM ml_offline_pilot_decision_reviews WHERE id = ?`, [result.lastID]);
};

export const listMlOfflinePilotDecisionReviews = async (limitInput?: unknown) => {
  const limit = clampLimit(limitInput, 10, 100);
  return allAsync(
    `
      SELECT id, decision_key AS decisionKey, import_id AS importId,
             offline_pilot_check_id AS offlinePilotCheckId,
             model_key AS modelKey, model_version AS modelVersion,
             board_decision AS boardDecision, board_status AS boardStatus,
             board_scope AS boardScope, avg_delta_f1_pct AS avgDeltaF1Pct,
             avg_delta_balanced_accuracy_pct AS avgDeltaBalancedAccuracyPct,
             pilot_owner AS pilotOwner, rollback_owner AS rollbackOwner,
             created_at AS createdAt, user_id AS userId
      FROM ml_offline_pilot_decision_reviews
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [limit],
  );
};

export const listMlOfflinePilotDecisionReviewsByImportId = async (importIdInput: unknown, limitInput?: unknown) => {
  const importId = Number(importIdInput);
  if (!Number.isFinite(importId) || importId <= 0) return [];
  const limit = clampLimit(limitInput, 5, 50);
  return allAsync(
    `
      SELECT id, decision_key AS decisionKey, import_id AS importId,
             offline_pilot_check_id AS offlinePilotCheckId,
             model_key AS modelKey, model_version AS modelVersion,
             board_decision AS boardDecision, board_status AS boardStatus,
             board_scope AS boardScope, avg_delta_f1_pct AS avgDeltaF1Pct,
             avg_delta_balanced_accuracy_pct AS avgDeltaBalancedAccuracyPct,
             pilot_owner AS pilotOwner, rollback_owner AS rollbackOwner,
             created_at AS createdAt, user_id AS userId
      FROM ml_offline_pilot_decision_reviews
      WHERE import_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [importId, limit],
  );
};

export const recordMlOfflinePilotReviewPack = async (payload: {
  packKey: string;
  importId?: number | null;
  offlinePilotCheckId?: number | null;
  decisionReviewId?: number | null;
  modelKey?: string | null;
  modelVersion?: string | null;
  boardStatus?: string | null;
  boardDecision?: string | null;
  shadowEvaluationsCount: number;
  stabilityStatus?: string | null;
  offlinePilotStatus?: string | null;
  rollbackStatus: string;
  recommendation: string;
  executiveSummary?: Record<string, unknown>;
  reviewPack?: Record<string, unknown>;
  timeline?: Array<Record<string, unknown>>;
  summary?: Record<string, unknown>;
  policy?: Record<string, unknown>;
  userId?: number | null;
}) => {
  const result = await runAsync(
    `
      INSERT INTO ml_offline_pilot_review_packs (
        pack_key, import_id, offline_pilot_check_id, decision_review_id,
        model_key, model_version, board_status, board_decision,
        shadow_evaluations_count, stability_status, offline_pilot_status,
        rollback_status, recommendation, executive_summary_json,
        review_pack_json, timeline_json, summary_json, policy_json, user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.packKey,
      payload.importId || null,
      payload.offlinePilotCheckId || null,
      payload.decisionReviewId || null,
      payload.modelKey || null,
      payload.modelVersion || null,
      payload.boardStatus || null,
      payload.boardDecision || null,
      payload.shadowEvaluationsCount,
      payload.stabilityStatus || null,
      payload.offlinePilotStatus || null,
      payload.rollbackStatus,
      payload.recommendation,
      safeJson(payload.executiveSummary || {}),
      safeJson(payload.reviewPack || {}),
      safeJson(payload.timeline || []),
      safeJson(payload.summary || {}),
      safeJson(payload.policy || {}),
      payload.userId || null,
    ],
  );
  return getAsync(`SELECT * FROM ml_offline_pilot_review_packs WHERE id = ?`, [result.lastID]);
};

export const listMlOfflinePilotReviewPacks = async (limitInput?: unknown) => {
  const limit = clampLimit(limitInput, 10, 100);
  return allAsync(
    `
      SELECT id, pack_key AS packKey, import_id AS importId,
             offline_pilot_check_id AS offlinePilotCheckId,
             decision_review_id AS decisionReviewId, model_key AS modelKey,
             model_version AS modelVersion, board_status AS boardStatus,
             board_decision AS boardDecision,
             shadow_evaluations_count AS shadowEvaluationsCount,
             stability_status AS stabilityStatus,
             offline_pilot_status AS offlinePilotStatus,
             rollback_status AS rollbackStatus, recommendation,
             created_at AS createdAt, user_id AS userId
      FROM ml_offline_pilot_review_packs
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [limit],
  );
};

export const listMlOfflinePilotReviewPacksByImportId = async (importIdInput: unknown, limitInput?: unknown) => {
  const importId = Number(importIdInput);
  if (!Number.isFinite(importId) || importId <= 0) return [];
  const limit = clampLimit(limitInput, 5, 50);
  return allAsync(
    `
      SELECT id, pack_key AS packKey, import_id AS importId,
             offline_pilot_check_id AS offlinePilotCheckId,
             decision_review_id AS decisionReviewId, model_key AS modelKey,
             model_version AS modelVersion, board_status AS boardStatus,
             board_decision AS boardDecision,
             shadow_evaluations_count AS shadowEvaluationsCount,
             stability_status AS stabilityStatus,
             offline_pilot_status AS offlinePilotStatus,
             rollback_status AS rollbackStatus, recommendation,
             created_at AS createdAt, user_id AS userId
      FROM ml_offline_pilot_review_packs
      WHERE import_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [importId, limit],
  );
};

export const recordMlOfflinePilotReviewExport = async (payload: {
  exportKey: string;
  importId?: number | null;
  reviewPackId?: number | null;
  modelKey?: string | null;
  modelVersion?: string | null;
  dashboardStatus: string;
  recommendation?: string | null;
  rollbackStatus: string;
  pilotReadinessPct?: number | null;
  shadowEvaluationsCount: number;
  avgDeltaF1Pct?: number | null;
  avgDeltaBalancedAccuracyPct?: number | null;
  exportFormat: string;
  kpiJson?: Record<string, unknown>;
  exportJson?: Record<string, unknown>;
  exportMarkdown?: string;
  summary?: Record<string, unknown>;
  policy?: Record<string, unknown>;
  userId?: number | null;
}) => {
  const result = await runAsync(
    `
      INSERT INTO ml_offline_pilot_review_exports (
        export_key, import_id, review_pack_id, model_key, model_version,
        dashboard_status, recommendation, rollback_status, pilot_readiness_pct,
        shadow_evaluations_count, avg_delta_f1_pct, avg_delta_balanced_accuracy_pct,
        export_format, kpi_json, export_json, export_markdown, summary_json,
        policy_json, user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.exportKey,
      payload.importId || null,
      payload.reviewPackId || null,
      payload.modelKey || null,
      payload.modelVersion || null,
      payload.dashboardStatus,
      payload.recommendation || null,
      payload.rollbackStatus,
      payload.pilotReadinessPct ?? null,
      payload.shadowEvaluationsCount,
      payload.avgDeltaF1Pct ?? null,
      payload.avgDeltaBalancedAccuracyPct ?? null,
      payload.exportFormat,
      safeJson(payload.kpiJson || {}),
      safeJson(payload.exportJson || {}),
      payload.exportMarkdown || "",
      safeJson(payload.summary || {}),
      safeJson(payload.policy || {}),
      payload.userId || null,
    ],
  );
  return getAsync(`SELECT * FROM ml_offline_pilot_review_exports WHERE id = ?`, [result.lastID]);
};

export const listMlOfflinePilotReviewExports = async (limitInput?: unknown) => {
  const limit = clampLimit(limitInput, 10, 100);
  return allAsync(
    `
      SELECT id, export_key AS exportKey, import_id AS importId,
             review_pack_id AS reviewPackId, model_key AS modelKey,
             model_version AS modelVersion, dashboard_status AS dashboardStatus,
             recommendation, rollback_status AS rollbackStatus,
             pilot_readiness_pct AS pilotReadinessPct,
             shadow_evaluations_count AS shadowEvaluationsCount,
             avg_delta_f1_pct AS avgDeltaF1Pct,
             avg_delta_balanced_accuracy_pct AS avgDeltaBalancedAccuracyPct,
             export_format AS exportFormat, created_at AS createdAt, user_id AS userId
      FROM ml_offline_pilot_review_exports
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [limit],
  );
};

export const listMlOfflinePilotReviewExportsByImportId = async (importIdInput: unknown, limitInput?: unknown) => {
  const importId = Number(importIdInput);
  if (!Number.isFinite(importId) || importId <= 0) return [];
  const limit = clampLimit(limitInput, 5, 50);
  return allAsync(
    `
      SELECT id, export_key AS exportKey, import_id AS importId,
             review_pack_id AS reviewPackId, model_key AS modelKey,
             model_version AS modelVersion, dashboard_status AS dashboardStatus,
             recommendation, rollback_status AS rollbackStatus,
             pilot_readiness_pct AS pilotReadinessPct,
             shadow_evaluations_count AS shadowEvaluationsCount,
             avg_delta_f1_pct AS avgDeltaF1Pct,
             avg_delta_balanced_accuracy_pct AS avgDeltaBalancedAccuracyPct,
             export_format AS exportFormat, created_at AS createdAt, user_id AS userId
      FROM ml_offline_pilot_review_exports
      WHERE import_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [importId, limit],
  );
};

export const recordMlOfflinePilotCloseout = async (payload: {
  closeoutKey: string;
  importId?: number | null;
  reviewExportId?: number | null;
  reviewPackId?: number | null;
  modelKey?: string | null;
  modelVersion?: string | null;
  dashboardStatus?: string | null;
  recommendation?: string | null;
  rollbackStatus: string;
  pilotReadinessPct?: number | null;
  shadowEvaluationsCount: number;
  avgDeltaF1Pct?: number | null;
  avgDeltaBalancedAccuracyPct?: number | null;
  closeoutStatus: string;
  productionReadinessPreconditionsMet: boolean;
  ownerSignoff: boolean;
  ownerName?: string | null;
  productionReadinessOwner?: string | null;
  closeoutSummary?: Record<string, unknown>;
  preconditions?: Array<Record<string, unknown>> | Record<string, unknown>;
  riskSignoff?: Record<string, unknown>;
  auditExport?: Record<string, unknown>;
  policy?: Record<string, unknown>;
  userId?: number | null;
}) => {
  const result = await runAsync(
    `
      INSERT INTO ml_offline_pilot_closeouts (
        closeout_key, import_id, review_export_id, review_pack_id, model_key,
        model_version, dashboard_status, recommendation, rollback_status,
        pilot_readiness_pct, shadow_evaluations_count, avg_delta_f1_pct,
        avg_delta_balanced_accuracy_pct, closeout_status,
        production_readiness_preconditions_met, owner_signoff, owner_name,
        production_readiness_owner, closeout_summary_json, preconditions_json,
        risk_signoff_json, audit_export_json, policy_json, user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.closeoutKey,
      payload.importId || null,
      payload.reviewExportId || null,
      payload.reviewPackId || null,
      payload.modelKey || null,
      payload.modelVersion || null,
      payload.dashboardStatus || null,
      payload.recommendation || null,
      payload.rollbackStatus,
      payload.pilotReadinessPct ?? null,
      payload.shadowEvaluationsCount,
      payload.avgDeltaF1Pct ?? null,
      payload.avgDeltaBalancedAccuracyPct ?? null,
      payload.closeoutStatus,
      payload.productionReadinessPreconditionsMet ? 1 : 0,
      payload.ownerSignoff ? 1 : 0,
      payload.ownerName || null,
      payload.productionReadinessOwner || null,
      safeJson(payload.closeoutSummary || {}),
      safeJson(payload.preconditions || []),
      safeJson(payload.riskSignoff || {}),
      safeJson(payload.auditExport || {}),
      safeJson(payload.policy || {}),
      payload.userId || null,
    ],
  );
  return getAsync(`SELECT * FROM ml_offline_pilot_closeouts WHERE id = ?`, [result.lastID]);
};

export const listMlOfflinePilotCloseouts = async (limitInput?: unknown) => {
  const limit = clampLimit(limitInput, 10, 100);
  return allAsync(
    `
      SELECT id, closeout_key AS closeoutKey, import_id AS importId,
             review_export_id AS reviewExportId, review_pack_id AS reviewPackId,
             model_key AS modelKey, model_version AS modelVersion,
             dashboard_status AS dashboardStatus, recommendation,
             rollback_status AS rollbackStatus, pilot_readiness_pct AS pilotReadinessPct,
             shadow_evaluations_count AS shadowEvaluationsCount,
             avg_delta_f1_pct AS avgDeltaF1Pct,
             avg_delta_balanced_accuracy_pct AS avgDeltaBalancedAccuracyPct,
             closeout_status AS closeoutStatus,
             production_readiness_preconditions_met AS productionReadinessPreconditionsMet,
             owner_signoff AS ownerSignoff, owner_name AS ownerName,
             production_readiness_owner AS productionReadinessOwner,
             created_at AS createdAt, user_id AS userId
      FROM ml_offline_pilot_closeouts
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [limit],
  );
};

export const listMlOfflinePilotCloseoutsByImportId = async (importIdInput: unknown, limitInput?: unknown) => {
  const importId = Number(importIdInput);
  if (!Number.isFinite(importId) || importId <= 0) return [];
  const limit = clampLimit(limitInput, 5, 50);
  return allAsync(
    `
      SELECT id, closeout_key AS closeoutKey, import_id AS importId,
             review_export_id AS reviewExportId, review_pack_id AS reviewPackId,
             model_key AS modelKey, model_version AS modelVersion,
             dashboard_status AS dashboardStatus, recommendation,
             rollback_status AS rollbackStatus, pilot_readiness_pct AS pilotReadinessPct,
             shadow_evaluations_count AS shadowEvaluationsCount,
             avg_delta_f1_pct AS avgDeltaF1Pct,
             avg_delta_balanced_accuracy_pct AS avgDeltaBalancedAccuracyPct,
             closeout_status AS closeoutStatus,
             production_readiness_preconditions_met AS productionReadinessPreconditionsMet,
             owner_signoff AS ownerSignoff, owner_name AS ownerName,
             production_readiness_owner AS productionReadinessOwner,
             created_at AS createdAt, user_id AS userId
      FROM ml_offline_pilot_closeouts
      WHERE import_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [importId, limit],
  );
};
