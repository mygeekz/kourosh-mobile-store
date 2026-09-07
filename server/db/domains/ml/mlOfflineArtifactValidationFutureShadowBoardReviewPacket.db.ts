import { allAsync, getAsync, runAsync } from "../../query";
import { clampLimit, safeJson } from "./mlDbUtils";
import { buildOfflineArtifactValidationSafetyGate } from "../../../intelligence/artifacts/validation/offlineArtifactValidationRules";
import type { OfflineArtifactValidationSafetyGate } from "../../../intelligence/artifacts/validation/offlineArtifactValidationTypes";
import type { OfflineArtifactValidationEvidenceConfidence } from "../../../intelligence/artifacts/validationReviewQueue/offlineArtifactValidationEvidenceReviewPackTypes";
import type { OfflineArtifactValidationReviewPriority } from "../../../intelligence/artifacts/validationReviewQueue/offlineArtifactValidationReviewQueueTypes";
import type {
  OfflineArtifactValidationFutureShadowBoardReviewLane,
  OfflineArtifactValidationFutureShadowBoardReviewPacketDecision,
  OfflineArtifactValidationFutureShadowBoardReviewPacketRecord,
  OfflineArtifactValidationFutureShadowBoardReviewPacketSnapshot,
  OfflineArtifactValidationFutureShadowBoardReviewPacketStatus,
  OfflineArtifactValidationFutureShadowBoardReviewPacketSummary,
} from "../../../intelligence/artifacts/validationReviewQueue/offlineArtifactValidationFutureShadowBoardReviewPacketTypes";

const parseJson = <T>(value: unknown, fallback: T): T => {
  if (typeof value !== "string" || value.trim().length === 0) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch (_err) {
    return fallback;
  }
};

const fallbackBoardReviewPacketSnapshot = (): OfflineArtifactValidationFutureShadowBoardReviewPacketSnapshot => ({
  phase: "Phase 7J — Offline Artifact Future Shadow Board Review Packet",
  routingSummaryPack: {} as OfflineArtifactValidationFutureShadowBoardReviewPacketSnapshot["routingSummaryPack"],
  boardPacketSections: [],
  boardPacketStatus: "board_packet_needs_routing_closure",
  boardPacketDecision: "hold_for_routing_closure",
  boardReviewLane: "routing_closure",
  boardReviewPriority: "medium",
  boardReviewScope: "not_applicable",
  boardPacketReadinessPct: 0,
  sectionCount: 0,
  passedSectionCount: 0,
  warningSectionCount: 0,
  failedSectionCount: 0,
  evidenceConfidence: "low",
  routingDecision: "hold_for_binder_closure",
  routingPackStatus: "routing_pack_needs_binder_closure",
  routeLane: "eligibility_binder_closure",
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
});

const mapOfflineArtifactValidationFutureShadowBoardReviewPacketRow = (
  row: Record<string, unknown> | undefined,
): OfflineArtifactValidationFutureShadowBoardReviewPacketRecord | null => {
  if (!row) return null;
  const safety = parseJson<OfflineArtifactValidationSafetyGate>(row.safetyGateJson, buildOfflineArtifactValidationSafetyGate());
  return {
    id: Number(row.id),
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
    boardPacketStatus: String(row.boardPacketStatus || "board_packet_needs_routing_closure") as OfflineArtifactValidationFutureShadowBoardReviewPacketStatus,
    boardPacketDecision: String(row.boardPacketDecision || "hold_for_routing_closure") as OfflineArtifactValidationFutureShadowBoardReviewPacketDecision,
    boardPacketReadinessPct: Number(row.boardPacketReadinessPct || 0),
    boardReviewPriority: String(row.boardReviewPriority || "medium") as OfflineArtifactValidationReviewPriority,
    boardReviewLane: String(row.boardReviewLane || "routing_closure") as OfflineArtifactValidationFutureShadowBoardReviewLane,
    sectionCount: Number(row.sectionCount || 0),
    passedSectionCount: Number(row.passedSectionCount || 0),
    warningSectionCount: Number(row.warningSectionCount || 0),
    failedSectionCount: Number(row.failedSectionCount || 0),
    evidenceConfidence: String(row.evidenceConfidence || "low") as OfflineArtifactValidationEvidenceConfidence,
    routingDecision: String(row.routingDecision || "hold_for_binder_closure"),
    routingPackStatus: String(row.routingPackStatus || "routing_pack_needs_binder_closure"),
    routeLane: String(row.routeLane || "eligibility_binder_closure"),
    recommendedBoardAction: String(row.recommendedBoardAction || "Review board packet manually; no activation, inference, deployment, automatic approval, or business mutation is allowed."),
    boardReviewPacketSnapshot: parseJson<OfflineArtifactValidationFutureShadowBoardReviewPacketSnapshot>(row.boardReviewPacketSnapshotJson, fallbackBoardReviewPacketSnapshot()),
    signedFutureShadowBoardReviewPacketHash: String(row.signedFutureShadowBoardReviewPacketHash || ""),
    safety,
    createdAt: String(row.createdAt || ""),
    createdByUserId: row.createdByUserId as string | number | null,
  };
};

const offlineArtifactValidationFutureShadowBoardReviewPacketSelect = `
  SELECT id,
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
         board_packet_status AS boardPacketStatus,
         board_packet_decision AS boardPacketDecision,
         board_packet_readiness_pct AS boardPacketReadinessPct,
         board_review_priority AS boardReviewPriority,
         board_review_lane AS boardReviewLane,
         section_count AS sectionCount,
         passed_section_count AS passedSectionCount,
         warning_section_count AS warningSectionCount,
         failed_section_count AS failedSectionCount,
         evidence_confidence AS evidenceConfidence,
         routing_decision AS routingDecision,
         routing_pack_status AS routingPackStatus,
         route_lane AS routeLane,
         recommended_board_action AS recommendedBoardAction,
         board_review_packet_snapshot_json AS boardReviewPacketSnapshotJson,
         signed_future_shadow_board_review_packet_hash AS signedFutureShadowBoardReviewPacketHash,
         safety_gate_json AS safetyGateJson,
         created_at AS createdAt,
         created_by_user_id AS createdByUserId
  FROM offline_artifact_validation_future_shadow_board_review_packets
`;

export const recordOfflineArtifactValidationFutureShadowBoardReviewPacket = async (
  record: Omit<OfflineArtifactValidationFutureShadowBoardReviewPacketRecord, "id" | "createdAt">,
): Promise<OfflineArtifactValidationFutureShadowBoardReviewPacketRecord | null> => {
  const insertResult = await runAsync(
    `
      INSERT INTO offline_artifact_validation_future_shadow_board_review_packets (
        future_shadow_review_binder_routing_summary_pack_id, future_shadow_eligibility_review_binder_id,
        future_shadow_eligibility_gate_id, evidence_closure_signoff_pack_id, evidence_gap_closure_matrix_id,
        evidence_review_pack_id, queue_item_id, validation_result_id, artifact_id, artifact_hash,
        board_packet_status, board_packet_decision, board_packet_readiness_pct, board_review_priority,
        board_review_lane, section_count, passed_section_count, warning_section_count, failed_section_count,
        evidence_confidence, routing_decision, routing_pack_status, route_lane, recommended_board_action,
        board_review_packet_snapshot_json, signed_future_shadow_board_review_packet_hash, safety_gate_json, created_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
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
      record.boardPacketStatus,
      record.boardPacketDecision,
      record.boardPacketReadinessPct,
      record.boardReviewPriority,
      record.boardReviewLane,
      record.sectionCount,
      record.passedSectionCount,
      record.warningSectionCount,
      record.failedSectionCount,
      record.evidenceConfidence,
      record.routingDecision,
      record.routingPackStatus,
      record.routeLane,
      record.recommendedBoardAction,
      safeJson(record.boardReviewPacketSnapshot),
      record.signedFutureShadowBoardReviewPacketHash,
      safeJson(record.safety),
      record.createdByUserId == null ? null : String(record.createdByUserId),
    ],
  );
  return getOfflineArtifactValidationFutureShadowBoardReviewPacketById(insertResult.lastID);
};

export const getOfflineArtifactValidationFutureShadowBoardReviewPacketById = async (
  idInput: unknown,
): Promise<OfflineArtifactValidationFutureShadowBoardReviewPacketRecord | null> => {
  const id = Number(idInput);
  if (!Number.isFinite(id) || id <= 0) return null;
  const row = await getAsync(`${offlineArtifactValidationFutureShadowBoardReviewPacketSelect} WHERE id = ?`, [id]);
  return mapOfflineArtifactValidationFutureShadowBoardReviewPacketRow(row as Record<string, unknown> | undefined);
};

export const listOfflineArtifactValidationFutureShadowBoardReviewPackets = async (
  limitInput?: unknown,
): Promise<OfflineArtifactValidationFutureShadowBoardReviewPacketRecord[]> => {
  const limit = clampLimit(limitInput, 50, 250);
  const rows = await allAsync(`${offlineArtifactValidationFutureShadowBoardReviewPacketSelect} ORDER BY datetime(created_at) DESC, id DESC LIMIT ?`, [limit]);
  return rows
    .map((row) => mapOfflineArtifactValidationFutureShadowBoardReviewPacketRow(row as Record<string, unknown>))
    .filter((item): item is OfflineArtifactValidationFutureShadowBoardReviewPacketRecord => Boolean(item));
};

export const getLatestOfflineArtifactValidationFutureShadowBoardReviewPacketForRoutingSummaryPack = async (
  futureShadowReviewBinderRoutingSummaryPackIdInput: unknown,
): Promise<OfflineArtifactValidationFutureShadowBoardReviewPacketRecord | null> => {
  const id = Number(futureShadowReviewBinderRoutingSummaryPackIdInput);
  if (!Number.isFinite(id) || id <= 0) return null;
  const row = await getAsync(
    `${offlineArtifactValidationFutureShadowBoardReviewPacketSelect} WHERE future_shadow_review_binder_routing_summary_pack_id = ? ORDER BY datetime(created_at) DESC, id DESC LIMIT 1`,
    [id],
  );
  return mapOfflineArtifactValidationFutureShadowBoardReviewPacketRow(row as Record<string, unknown> | undefined);
};

export const getOfflineArtifactValidationFutureShadowBoardReviewPacketSummary = async (): Promise<OfflineArtifactValidationFutureShadowBoardReviewPacketSummary> => {
  const aggregate = await getAsync(`
    SELECT COUNT(*) AS totalBoardReviewPackets,
           SUM(CASE WHEN board_packet_status = 'board_packet_ready_for_future_shadow_review' THEN 1 ELSE 0 END) AS readyForFutureShadowBoardReviewPackets,
           SUM(CASE WHEN board_packet_status = 'board_packet_needs_routing_closure' THEN 1 ELSE 0 END) AS needsRoutingClosurePackets,
           SUM(CASE WHEN board_packet_status = 'board_packet_blocked_by_routing' THEN 1 ELSE 0 END) AS blockedByRoutingPackets,
           SUM(CASE WHEN board_packet_status = 'board_packet_rejected_for_artifact_trust' THEN 1 ELSE 0 END) AS rejectedForArtifactTrustPackets,
           SUM(CASE WHEN board_packet_status = 'board_packet_safety_blocked' THEN 1 ELSE 0 END) AS safetyBlockedPackets,
           AVG(board_packet_readiness_pct) AS averageBoardPacketReadinessPct,
           SUM(failed_section_count) AS totalFailedSectionCount,
           SUM(CASE WHEN board_review_priority = 'critical' THEN 1 ELSE 0 END) AS criticalBoardReviewCount,
           SUM(CASE WHEN board_review_priority = 'high' THEN 1 ELSE 0 END) AS highBoardReviewCount
    FROM offline_artifact_validation_future_shadow_board_review_packets
  `).catch(() => null) as Record<string, unknown> | null;
  const latestBoardReviewPacket = (await listOfflineArtifactValidationFutureShadowBoardReviewPackets(1))[0] || null;
  const totalBoardReviewPackets = Number(aggregate?.totalBoardReviewPackets || 0);
  const readyForFutureShadowBoardReviewPackets = Number(aggregate?.readyForFutureShadowBoardReviewPackets || 0);
  return {
    totalBoardReviewPackets,
    readyForFutureShadowBoardReviewPackets,
    needsRoutingClosurePackets: Number(aggregate?.needsRoutingClosurePackets || 0),
    blockedByRoutingPackets: Number(aggregate?.blockedByRoutingPackets || 0),
    rejectedForArtifactTrustPackets: Number(aggregate?.rejectedForArtifactTrustPackets || 0),
    safetyBlockedPackets: Number(aggregate?.safetyBlockedPackets || 0),
    averageBoardPacketReadinessPct: Math.round(Number(aggregate?.averageBoardPacketReadinessPct || 0)),
    totalFailedSectionCount: Number(aggregate?.totalFailedSectionCount || 0),
    criticalBoardReviewCount: Number(aggregate?.criticalBoardReviewCount || 0),
    highBoardReviewCount: Number(aggregate?.highBoardReviewCount || 0),
    latestBoardReviewPacket,
    recommendedNextAction: latestBoardReviewPacket?.recommendedBoardAction || (totalBoardReviewPackets === 0
      ? "Create a metadata-only future shadow board review packet from a ready routing summary; no activation, inference, deployment, automatic approval, or business mutation is allowed."
      : readyForFutureShadowBoardReviewPackets > 0
        ? "Ready board review packets may be submitted as metadata-only evidence for future shadow board review; do not execute, activate, infer, deploy, production-score, automatically approve, or mutate records."
        : "Resolve routing closure and evidence gaps before submitting any future shadow board review packet."),
    safety: buildOfflineArtifactValidationSafetyGate(),
  };
};
