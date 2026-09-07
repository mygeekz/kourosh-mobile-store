// Phase 7K-Cleanup DB function module. SQL and behavior preserved.
import { allAsync, getAsync, runAsync } from "../../../query";
import { clampLimit, safeJson } from "../mlDbUtils";


export const recordMlProductionGovernanceSignoffDecision = async (payload: {
  governanceKey: string;
  importId?: number | null;
  closeoutMemoId?: number | null;
  executionLogId?: number | null;
  modelKey?: string | null;
  modelVersion?: string | null;
  closeoutStatus?: string | null;
  finalRecommendation?: string | null;
  governanceStatus: string;
  implementationEntryDecision?: string | null;
  phase2Closed: boolean;
  readinessScorePct: number;
  governanceSignoffStatus?: string | null;
  boardQuorumStatus?: string | null;
  implementationEntryStatus?: string | null;
  blockerCount: number;
  warningCount: number;
  passCount: number;
  totalGateCount: number;
  executiveSponsor?: string | null;
  governanceOwner?: string | null;
  decisionOwner?: string | null;
  phase3Owner?: string | null;
  rollbackOwner?: string | null;
  riskOwner?: string | null;
  governanceSummary?: Record<string, unknown>;
  signoffMatrix?: Array<Record<string, unknown>> | Record<string, unknown>;
  implementationEntryDecisionPayload?: Record<string, unknown>;
  phase2CloseoutArchive?: Record<string, unknown>;
  auditExport?: Record<string, unknown>;
  summary?: Record<string, unknown>;
  policy?: Record<string, unknown>;
  userId?: number | null;
}) => {
  const result = await runAsync(
    `
      INSERT INTO ml_production_governance_signoff_decisions (
        governance_key, import_id, closeout_memo_id, execution_log_id, model_key, model_version,
        closeout_status, final_recommendation, governance_status, implementation_entry_decision,
        phase2_closed, readiness_score_pct, governance_signoff_status, board_quorum_status,
        implementation_entry_status, blocker_count, warning_count, pass_count, total_gate_count,
        executive_sponsor, governance_owner, decision_owner, phase3_owner, rollback_owner, risk_owner,
        governance_summary_json, signoff_matrix_json, implementation_entry_decision_json,
        phase2_closeout_archive_json, audit_export_json, summary_json, policy_json, user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.governanceKey,
      payload.importId || null,
      payload.closeoutMemoId || null,
      payload.executionLogId || null,
      payload.modelKey || null,
      payload.modelVersion || null,
      payload.closeoutStatus || null,
      payload.finalRecommendation || null,
      payload.governanceStatus,
      payload.implementationEntryDecision || null,
      payload.phase2Closed ? 1 : 0,
      payload.readinessScorePct,
      payload.governanceSignoffStatus || null,
      payload.boardQuorumStatus || null,
      payload.implementationEntryStatus || null,
      payload.blockerCount,
      payload.warningCount,
      payload.passCount,
      payload.totalGateCount,
      payload.executiveSponsor || null,
      payload.governanceOwner || null,
      payload.decisionOwner || null,
      payload.phase3Owner || null,
      payload.rollbackOwner || null,
      payload.riskOwner || null,
      safeJson(payload.governanceSummary || {}),
      safeJson(payload.signoffMatrix || []),
      safeJson(payload.implementationEntryDecisionPayload || {}),
      safeJson(payload.phase2CloseoutArchive || {}),
      safeJson(payload.auditExport || {}),
      safeJson(payload.summary || {}),
      safeJson(payload.policy || {}),
      payload.userId || null,
    ],
  );
  return getAsync(`SELECT * FROM ml_production_governance_signoff_decisions WHERE id = ?`, [result.lastID]);
};

export const listMlProductionGovernanceSignoffDecisions = async (limitInput?: unknown) => {
  const limit = clampLimit(limitInput, 10, 100);
  return allAsync(
    `
      SELECT id, governance_key AS governanceKey, import_id AS importId,
             closeout_memo_id AS closeoutMemoId, execution_log_id AS executionLogId,
             model_key AS modelKey, model_version AS modelVersion,
             closeout_status AS closeoutStatus, final_recommendation AS finalRecommendation,
             governance_status AS governanceStatus, implementation_entry_decision AS implementationEntryDecision,
             phase2_closed AS phase2Closed, readiness_score_pct AS readinessScorePct,
             governance_signoff_status AS governanceSignoffStatus,
             board_quorum_status AS boardQuorumStatus,
             implementation_entry_status AS implementationEntryStatus,
             blocker_count AS blockerCount, warning_count AS warningCount,
             pass_count AS passCount, total_gate_count AS totalGateCount,
             executive_sponsor AS executiveSponsor, governance_owner AS governanceOwner,
             decision_owner AS decisionOwner, phase3_owner AS phase3Owner,
             rollback_owner AS rollbackOwner, risk_owner AS riskOwner,
             created_at AS createdAt, user_id AS userId
      FROM ml_production_governance_signoff_decisions
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [limit],
  );
};

export const listMlProductionGovernanceSignoffDecisionsByImportId = async (importIdInput: unknown, limitInput?: unknown) => {
  const importId = Number(importIdInput);
  if (!Number.isFinite(importId) || importId <= 0) return [];
  const limit = clampLimit(limitInput, 5, 50);
  return allAsync(
    `
      SELECT id, governance_key AS governanceKey, import_id AS importId,
             closeout_memo_id AS closeoutMemoId, execution_log_id AS executionLogId,
             model_key AS modelKey, model_version AS modelVersion,
             closeout_status AS closeoutStatus, final_recommendation AS finalRecommendation,
             governance_status AS governanceStatus, implementation_entry_decision AS implementationEntryDecision,
             phase2_closed AS phase2Closed, readiness_score_pct AS readinessScorePct,
             governance_signoff_status AS governanceSignoffStatus,
             board_quorum_status AS boardQuorumStatus,
             implementation_entry_status AS implementationEntryStatus,
             blocker_count AS blockerCount, warning_count AS warningCount,
             pass_count AS passCount, total_gate_count AS totalGateCount,
             executive_sponsor AS executiveSponsor, governance_owner AS governanceOwner,
             decision_owner AS decisionOwner, phase3_owner AS phase3Owner,
             rollback_owner AS rollbackOwner, risk_owner AS riskOwner,
             created_at AS createdAt, user_id AS userId
      FROM ml_production_governance_signoff_decisions
      WHERE import_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [importId, limit],
  );
};
