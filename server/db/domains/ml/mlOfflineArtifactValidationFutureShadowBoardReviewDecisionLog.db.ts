import { allAsync, getAsync, runAsync } from "../../query";
import { clampLimit, safeJson } from "./mlDbUtils";
import { buildOfflineArtifactValidationSafetyGate } from "../../../intelligence/artifacts/validation/offlineArtifactValidationRules";
import type { OfflineArtifactValidationSafetyGate } from "../../../intelligence/artifacts/validation/offlineArtifactValidationTypes";
import type { OfflineArtifactValidationEvidenceConfidence } from "../../../intelligence/artifacts/validationReviewQueue/offlineArtifactValidationEvidenceReviewPackTypes";
import type { OfflineArtifactValidationReviewPriority } from "../../../intelligence/artifacts/validationReviewQueue/offlineArtifactValidationReviewQueueTypes";
import type {
  OfflineArtifactValidationFutureShadowBoardReviewDecision,
  OfflineArtifactValidationFutureShadowBoardReviewDecisionLane,
  OfflineArtifactValidationFutureShadowBoardReviewDecisionLogRecord,
  OfflineArtifactValidationFutureShadowBoardReviewDecisionLogSnapshot,
  OfflineArtifactValidationFutureShadowBoardReviewDecisionLogStatus,
  OfflineArtifactValidationFutureShadowBoardReviewDecisionLogSummary,
} from "../../../intelligence/artifacts/validationReviewQueue/offlineArtifactValidationFutureShadowBoardReviewDecisionLogTypes";

const parseJson = <T>(value: unknown, fallback: T): T => {
  if (typeof value !== "string" || value.trim().length === 0) return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
};

const fallbackDecisionLogSnapshot = (): OfflineArtifactValidationFutureShadowBoardReviewDecisionLogSnapshot => ({
  phase: "Phase 7K — Offline Artifact Future Shadow Board Review Decision Log",
  boardReviewPacket: {} as OfflineArtifactValidationFutureShadowBoardReviewDecisionLogSnapshot["boardReviewPacket"],
  decisionEntries: [],
  decisionLogStatus: "decision_log_needs_board_packet_closure",
  boardDecision: "deferred",
  boardDecisionReason: "No decision log snapshot was available.",
  boardDecisionLane: "board_packet_closure",
  boardReviewPriority: "medium",
  boardDecisionScope: "not_applicable",
  decisionLogReadinessPct: 0,
  sectionCount: 0,
  passedSectionCount: 0,
  warningSectionCount: 0,
  failedSectionCount: 0,
  evidenceConfidence: "low",
  boardPacketDecision: "hold_for_routing_closure",
  boardPacketStatus: "board_packet_needs_routing_closure",
  boardReviewLane: "routing_closure",
  metadataOnly: true,
  advisoryOnly: true,
  futureShadowOnly: true,
  executionAllowed: false,
  activationAllowed: false,
  inferenceAllowed: false,
  runtimeInvocationAllowed: false,
  businessMutationAllowed: false,
  artifactBytesIncluded: false,
  modelOutputIncluded: false,
  automaticApprovalAllowed: false,
  productionDeploymentAllowed: false,
  productionScoringAllowed: false,
});

const mapOfflineArtifactValidationFutureShadowBoardReviewDecisionLogRow = (
  row: Record<string, unknown> | undefined,
): OfflineArtifactValidationFutureShadowBoardReviewDecisionLogRecord | null => {
  if (!row) return null;
  const safety = parseJson<OfflineArtifactValidationSafetyGate>(row.safetyGateJson, buildOfflineArtifactValidationSafetyGate());
  return {
    id: Number(row.id),
    futureShadowBoardReviewPacketId: Number(row.futureShadowBoardReviewPacketId || 0),
    futureShadowReviewBinderRoutingSummaryPackId: Number(row.futureShadowReviewBinderRoutingSummaryPackId || 0),
    futureShadowEligibilityReviewBinderId: Number(row.futureShadowEligibilityReviewBinderId || 0),
    futureShadowEligibilityGateId: Number(row.futureShadowEligibilityGateId || 0),
    evidenceClosureSignoffPackId: Number(row.evidenceClosureSignoffPackId || 0),
    evidenceGapClosureMatrixId: Number(row.evidenceGapClosureMatrixId || 0),
    evidenceReviewPackId: Number(row.evidenceReviewPackId || 0),
    queueItemId: Number(row.queueItemId || 0),
    validationResultId: Number(row.validationResultId || 0),
    artifactId: String(row.artifactId || ""),
    artifactHash: row.artifactHash == null ? null : String(row.artifactHash),
    decisionLogStatus: String(row.decisionLogStatus || "decision_log_needs_board_packet_closure") as OfflineArtifactValidationFutureShadowBoardReviewDecisionLogStatus,
    boardDecision: String(row.boardDecision || "deferred") as OfflineArtifactValidationFutureShadowBoardReviewDecision,
    boardDecisionReason: String(row.boardDecisionReason || "Manual board decision reason was not provided."),
    decisionLogReadinessPct: Number(row.decisionLogReadinessPct || 0),
    boardReviewPriority: String(row.boardReviewPriority || "medium") as OfflineArtifactValidationReviewPriority,
    boardDecisionLane: String(row.boardDecisionLane || "board_packet_closure") as OfflineArtifactValidationFutureShadowBoardReviewDecisionLane,
    sectionCount: Number(row.sectionCount || 0),
    passedSectionCount: Number(row.passedSectionCount || 0),
    warningSectionCount: Number(row.warningSectionCount || 0),
    failedSectionCount: Number(row.failedSectionCount || 0),
    evidenceConfidence: String(row.evidenceConfidence || "low") as OfflineArtifactValidationEvidenceConfidence,
    boardPacketDecision: String(row.boardPacketDecision || "hold_for_routing_closure"),
    boardPacketStatus: String(row.boardPacketStatus || "board_packet_needs_routing_closure"),
    boardReviewLane: String(row.boardReviewLane || "routing_closure"),
    recommendedDecisionAction: String(row.recommendedDecisionAction || "Keep decision log advisory-only; no activation, inference, deployment, production scoring, automatic approval, or business mutation is allowed."),
    decisionLogSnapshot: parseJson<OfflineArtifactValidationFutureShadowBoardReviewDecisionLogSnapshot>(row.decisionLogSnapshotJson, fallbackDecisionLogSnapshot()),
    signedFutureShadowBoardReviewDecisionLogHash: String(row.signedFutureShadowBoardReviewDecisionLogHash || ""),
    safety,
    createdAt: String(row.createdAt || ""),
    createdByUserId: row.createdByUserId as string | number | null,
  };
};

const selectDecisionLog = `
  SELECT id,
         future_shadow_board_review_packet_id AS futureShadowBoardReviewPacketId,
         future_shadow_review_binder_routing_summary_pack_id AS futureShadowReviewBinderRoutingSummaryPackId,
         future_shadow_eligibility_review_binder_id AS futureShadowEligibilityReviewBinderId,
         future_shadow_eligibility_gate_id AS futureShadowEligibilityGateId,
         evidence_closure_signoff_pack_id AS evidenceClosureSignoffPackId,
         evidence_gap_closure_matrix_id AS evidenceGapClosureMatrixId,
         evidence_review_pack_id AS evidenceReviewPackId,
         queue_item_id AS queueItemId,
         validation_result_id AS validationResultId,
         artifact_id AS artifactId,
         artifact_hash AS artifactHash,
         decision_log_status AS decisionLogStatus,
         board_decision AS boardDecision,
         board_decision_reason AS boardDecisionReason,
         decision_log_readiness_pct AS decisionLogReadinessPct,
         board_review_priority AS boardReviewPriority,
         board_decision_lane AS boardDecisionLane,
         section_count AS sectionCount,
         passed_section_count AS passedSectionCount,
         warning_section_count AS warningSectionCount,
         failed_section_count AS failedSectionCount,
         evidence_confidence AS evidenceConfidence,
         board_packet_decision AS boardPacketDecision,
         board_packet_status AS boardPacketStatus,
         board_review_lane AS boardReviewLane,
         recommended_decision_action AS recommendedDecisionAction,
         decision_log_snapshot_json AS decisionLogSnapshotJson,
         signed_future_shadow_board_review_decision_log_hash AS signedFutureShadowBoardReviewDecisionLogHash,
         safety_gate_json AS safetyGateJson,
         created_at AS createdAt,
         created_by_user_id AS createdByUserId
  FROM offline_artifact_validation_future_shadow_board_review_decision_logs
`;

export const recordOfflineArtifactValidationFutureShadowBoardReviewDecisionLog = async (
  record: Omit<OfflineArtifactValidationFutureShadowBoardReviewDecisionLogRecord, "id" | "createdAt">,
): Promise<OfflineArtifactValidationFutureShadowBoardReviewDecisionLogRecord | null> => {
  const insertResult = await runAsync(
    `
      INSERT INTO offline_artifact_validation_future_shadow_board_review_decision_logs (
        future_shadow_board_review_packet_id, future_shadow_review_binder_routing_summary_pack_id,
        future_shadow_eligibility_review_binder_id, future_shadow_eligibility_gate_id,
        evidence_closure_signoff_pack_id, evidence_gap_closure_matrix_id, evidence_review_pack_id,
        queue_item_id, validation_result_id, artifact_id, artifact_hash, decision_log_status,
        board_decision, board_decision_reason, decision_log_readiness_pct, board_review_priority,
        board_decision_lane, section_count, passed_section_count, warning_section_count, failed_section_count,
        evidence_confidence, board_packet_decision, board_packet_status, board_review_lane,
        recommended_decision_action, decision_log_snapshot_json,
        signed_future_shadow_board_review_decision_log_hash, safety_gate_json, created_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      record.futureShadowBoardReviewPacketId,
      record.futureShadowReviewBinderRoutingSummaryPackId,
      record.futureShadowEligibilityReviewBinderId,
      record.futureShadowEligibilityGateId,
      record.evidenceClosureSignoffPackId,
      record.evidenceGapClosureMatrixId,
      record.evidenceReviewPackId,
      record.queueItemId,
      record.validationResultId,
      String(record.artifactId),
      record.artifactHash,
      record.decisionLogStatus,
      record.boardDecision,
      record.boardDecisionReason,
      record.decisionLogReadinessPct,
      record.boardReviewPriority,
      record.boardDecisionLane,
      record.sectionCount,
      record.passedSectionCount,
      record.warningSectionCount,
      record.failedSectionCount,
      record.evidenceConfidence,
      record.boardPacketDecision,
      record.boardPacketStatus,
      record.boardReviewLane,
      record.recommendedDecisionAction,
      safeJson(record.decisionLogSnapshot),
      record.signedFutureShadowBoardReviewDecisionLogHash,
      safeJson(record.safety),
      record.createdByUserId == null ? null : String(record.createdByUserId),
    ],
  );
  return getOfflineArtifactValidationFutureShadowBoardReviewDecisionLogById(insertResult.lastID);
};

export const getOfflineArtifactValidationFutureShadowBoardReviewDecisionLogById = async (idInput: unknown): Promise<OfflineArtifactValidationFutureShadowBoardReviewDecisionLogRecord | null> => {
  const id = Number(idInput);
  if (!Number.isFinite(id) || id <= 0) return null;
  const row = await getAsync(`${selectDecisionLog} WHERE id = ?`, [id]);
  return mapOfflineArtifactValidationFutureShadowBoardReviewDecisionLogRow(row as Record<string, unknown> | undefined);
};

export const listOfflineArtifactValidationFutureShadowBoardReviewDecisionLogs = async (limitInput?: unknown): Promise<OfflineArtifactValidationFutureShadowBoardReviewDecisionLogRecord[]> => {
  const limit = clampLimit(limitInput, 50, 250);
  const rows = await allAsync(`${selectDecisionLog} ORDER BY datetime(created_at) DESC, id DESC LIMIT ?`, [limit]);
  return rows.map((row) => mapOfflineArtifactValidationFutureShadowBoardReviewDecisionLogRow(row as Record<string, unknown>)).filter((item): item is OfflineArtifactValidationFutureShadowBoardReviewDecisionLogRecord => Boolean(item));
};

export const getLatestOfflineArtifactValidationFutureShadowBoardReviewDecisionLogForBoardReviewPacket = async (futureShadowBoardReviewPacketIdInput: unknown): Promise<OfflineArtifactValidationFutureShadowBoardReviewDecisionLogRecord | null> => {
  const id = Number(futureShadowBoardReviewPacketIdInput);
  if (!Number.isFinite(id) || id <= 0) return null;
  const row = await getAsync(`${selectDecisionLog} WHERE future_shadow_board_review_packet_id = ? ORDER BY datetime(created_at) DESC, id DESC LIMIT 1`, [id]);
  return mapOfflineArtifactValidationFutureShadowBoardReviewDecisionLogRow(row as Record<string, unknown> | undefined);
};

export const getOfflineArtifactValidationFutureShadowBoardReviewDecisionLogSummary = async (): Promise<OfflineArtifactValidationFutureShadowBoardReviewDecisionLogSummary> => {
  const aggregate = await getAsync(`
    SELECT COUNT(*) AS totalDecisionLogs,
           SUM(CASE WHEN decision_log_status = 'decision_log_recorded_for_future_shadow_board' THEN 1 ELSE 0 END) AS acceptedForFutureShadowReviewOnlyDecisionLogs,
           SUM(CASE WHEN decision_log_status = 'decision_log_needs_board_packet_closure' THEN 1 ELSE 0 END) AS needsBoardPacketClosureDecisionLogs,
           SUM(CASE WHEN decision_log_status = 'decision_log_blocked_by_packet' THEN 1 ELSE 0 END) AS blockedByPacketDecisionLogs,
           SUM(CASE WHEN decision_log_status = 'decision_log_rejected_for_artifact_trust' THEN 1 ELSE 0 END) AS rejectedForArtifactTrustDecisionLogs,
           SUM(CASE WHEN decision_log_status = 'decision_log_safety_blocked' THEN 1 ELSE 0 END) AS safetyBlockedDecisionLogs,
           AVG(decision_log_readiness_pct) AS averageDecisionLogReadinessPct,
           SUM(failed_section_count) AS totalFailedSectionCount,
           SUM(CASE WHEN board_review_priority = 'critical' THEN 1 ELSE 0 END) AS criticalDecisionLogCount,
           SUM(CASE WHEN board_review_priority = 'high' THEN 1 ELSE 0 END) AS highDecisionLogCount
    FROM offline_artifact_validation_future_shadow_board_review_decision_logs
  `).catch(() => null) as Record<string, unknown> | null;
  const latestDecisionLog = (await listOfflineArtifactValidationFutureShadowBoardReviewDecisionLogs(1))[0] || null;
  const totalDecisionLogs = Number(aggregate?.totalDecisionLogs || 0);
  const acceptedForFutureShadowReviewOnlyDecisionLogs = Number(aggregate?.acceptedForFutureShadowReviewOnlyDecisionLogs || 0);
  return {
    totalDecisionLogs,
    acceptedForFutureShadowReviewOnlyDecisionLogs,
    needsBoardPacketClosureDecisionLogs: Number(aggregate?.needsBoardPacketClosureDecisionLogs || 0),
    blockedByPacketDecisionLogs: Number(aggregate?.blockedByPacketDecisionLogs || 0),
    rejectedForArtifactTrustDecisionLogs: Number(aggregate?.rejectedForArtifactTrustDecisionLogs || 0),
    safetyBlockedDecisionLogs: Number(aggregate?.safetyBlockedDecisionLogs || 0),
    averageDecisionLogReadinessPct: Math.round(Number(aggregate?.averageDecisionLogReadinessPct || 0)),
    totalFailedSectionCount: Number(aggregate?.totalFailedSectionCount || 0),
    criticalDecisionLogCount: Number(aggregate?.criticalDecisionLogCount || 0),
    highDecisionLogCount: Number(aggregate?.highDecisionLogCount || 0),
    latestDecisionLog,
    recommendedNextAction: latestDecisionLog?.recommendedDecisionAction || (totalDecisionLogs === 0
      ? "Record a metadata-only future shadow board decision log from a ready board review packet; no activation, inference, deployment, production scoring, automatic approval, or business mutation is allowed."
      : acceptedForFutureShadowReviewOnlyDecisionLogs > 0
        ? "Accepted decision logs are future-shadow-review-only evidence; do not execute, activate, infer, deploy, production-score, automatically approve, or mutate records."
        : "Resolve board packet closure and evidence gaps before recording a future shadow board decision log."),
    safety: buildOfflineArtifactValidationSafetyGate(),
  };
};
