// Phase 7K-Cleanup DB function module. SQL and behavior preserved.
import { allAsync, getAsync, runAsync } from "../../../query";
import { clampLimit, safeJson } from "../mlDbUtils";


export const recordMlProductionReleaseGateSimulation = async (payload: {
  simulationKey: string;
  importId?: number | null;
  backlogId?: number | null;
  designSpecId?: number | null;
  modelKey?: string | null;
  modelVersion?: string | null;
  backlogStatus?: string | null;
  backlogReleaseGateStatus?: string | null;
  simulatedReleaseGateStatus: string;
  simulationStatus: string;
  recommendation?: string | null;
  readinessScorePct: number;
  ownerMatrixComplete: boolean;
  riskRegisterStatus?: string | null;
  releaseGateChecklistStatus?: string | null;
  blockerCount: number;
  warningCount: number;
  passCount: number;
  totalGateCount: number;
  simulation?: Record<string, unknown>;
  gateResults?: Array<Record<string, unknown>> | Record<string, unknown>;
  auditExport?: Record<string, unknown>;
  summary?: Record<string, unknown>;
  policy?: Record<string, unknown>;
  userId?: number | null;
}) => {
  const result = await runAsync(
    `
      INSERT INTO ml_production_release_gate_simulations (
        simulation_key, import_id, backlog_id, design_spec_id, model_key, model_version,
        backlog_status, backlog_release_gate_status, simulated_release_gate_status,
        simulation_status, recommendation, readiness_score_pct, owner_matrix_complete,
        risk_register_status, release_gate_checklist_status, blocker_count, warning_count,
        pass_count, total_gate_count, simulation_json, gate_results_json, audit_export_json,
        summary_json, policy_json, user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.simulationKey,
      payload.importId || null,
      payload.backlogId || null,
      payload.designSpecId || null,
      payload.modelKey || null,
      payload.modelVersion || null,
      payload.backlogStatus || null,
      payload.backlogReleaseGateStatus || null,
      payload.simulatedReleaseGateStatus,
      payload.simulationStatus,
      payload.recommendation || null,
      payload.readinessScorePct,
      payload.ownerMatrixComplete ? 1 : 0,
      payload.riskRegisterStatus || null,
      payload.releaseGateChecklistStatus || null,
      payload.blockerCount,
      payload.warningCount,
      payload.passCount,
      payload.totalGateCount,
      safeJson(payload.simulation || {}),
      safeJson(payload.gateResults || []),
      safeJson(payload.auditExport || {}),
      safeJson(payload.summary || {}),
      safeJson(payload.policy || {}),
      payload.userId || null,
    ],
  );
  return getAsync(`SELECT * FROM ml_production_release_gate_simulations WHERE id = ?`, [result.lastID]);
};

export const listMlProductionReleaseGateSimulations = async (limitInput?: unknown) => {
  const limit = clampLimit(limitInput, 10, 100);
  return allAsync(
    `
      SELECT id, simulation_key AS simulationKey, import_id AS importId,
             backlog_id AS backlogId, design_spec_id AS designSpecId,
             model_key AS modelKey, model_version AS modelVersion,
             backlog_status AS backlogStatus,
             backlog_release_gate_status AS backlogReleaseGateStatus,
             simulated_release_gate_status AS simulatedReleaseGateStatus,
             simulation_status AS simulationStatus, recommendation,
             readiness_score_pct AS readinessScorePct,
             owner_matrix_complete AS ownerMatrixComplete,
             risk_register_status AS riskRegisterStatus,
             release_gate_checklist_status AS releaseGateChecklistStatus,
             blocker_count AS blockerCount, warning_count AS warningCount,
             pass_count AS passCount, total_gate_count AS totalGateCount,
             created_at AS createdAt, user_id AS userId
      FROM ml_production_release_gate_simulations
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [limit],
  );
};

export const listMlProductionReleaseGateSimulationsByImportId = async (importIdInput: unknown, limitInput?: unknown) => {
  const importId = Number(importIdInput);
  if (!Number.isFinite(importId) || importId <= 0) return [];
  const limit = clampLimit(limitInput, 5, 50);
  return allAsync(
    `
      SELECT id, simulation_key AS simulationKey, import_id AS importId,
             backlog_id AS backlogId, design_spec_id AS designSpecId,
             model_key AS modelKey, model_version AS modelVersion,
             backlog_status AS backlogStatus,
             backlog_release_gate_status AS backlogReleaseGateStatus,
             simulated_release_gate_status AS simulatedReleaseGateStatus,
             simulation_status AS simulationStatus, recommendation,
             readiness_score_pct AS readinessScorePct,
             owner_matrix_complete AS ownerMatrixComplete,
             risk_register_status AS riskRegisterStatus,
             release_gate_checklist_status AS releaseGateChecklistStatus,
             blocker_count AS blockerCount, warning_count AS warningCount,
             pass_count AS passCount, total_gate_count AS totalGateCount,
             created_at AS createdAt, user_id AS userId
      FROM ml_production_release_gate_simulations
      WHERE import_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [importId, limit],
  );
};
