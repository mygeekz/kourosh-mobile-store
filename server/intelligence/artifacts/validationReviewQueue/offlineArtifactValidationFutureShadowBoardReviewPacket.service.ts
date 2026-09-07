import { computeArtifactEnvelopeSha256 } from "../artifactHashing";
import { buildOfflineArtifactValidationSafetyGate } from "../validation/offlineArtifactValidationRules";
import {
  getLatestOfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackForReviewBinder,
  getOfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackById,
  listOfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPacks,
} from "../../../db/domains/ml/mlOfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPack.db";
import {
  getLatestOfflineArtifactValidationFutureShadowBoardReviewPacketForRoutingSummaryPack,
  getOfflineArtifactValidationFutureShadowBoardReviewPacketById,
  getOfflineArtifactValidationFutureShadowBoardReviewPacketSummary,
  listOfflineArtifactValidationFutureShadowBoardReviewPackets,
  recordOfflineArtifactValidationFutureShadowBoardReviewPacket,
} from "../../../db/domains/ml/mlOfflineArtifactValidationFutureShadowBoardReviewPacket.db";
import type { OfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackRecord } from "./offlineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackTypes";
import type { OfflineArtifactValidationReviewPriority } from "./offlineArtifactValidationReviewQueueTypes";
import type {
  OfflineArtifactValidationFutureShadowBoardReviewLane,
  OfflineArtifactValidationFutureShadowBoardReviewPacketCreateInput,
  OfflineArtifactValidationFutureShadowBoardReviewPacketDecision,
  OfflineArtifactValidationFutureShadowBoardReviewPacketRecord,
  OfflineArtifactValidationFutureShadowBoardReviewPacketSection,
  OfflineArtifactValidationFutureShadowBoardReviewPacketSnapshot,
  OfflineArtifactValidationFutureShadowBoardReviewPacketStatus,
} from "./offlineArtifactValidationFutureShadowBoardReviewPacketTypes";

const PHASE_LABEL = "Phase 7J — Offline Artifact Future Shadow Board Review Packet" as const;

const section = (
  key: string,
  title: string,
  status: OfflineArtifactValidationFutureShadowBoardReviewPacketSection["status"],
  priority: OfflineArtifactValidationReviewPriority,
  boardReviewLane: OfflineArtifactValidationFutureShadowBoardReviewLane,
  evidence: Record<string, unknown>,
  boardPrompt: string,
  boardReviewReason: string | null,
): OfflineArtifactValidationFutureShadowBoardReviewPacketSection => ({
  key,
  title,
  status,
  priority,
  boardReviewLane,
  evidence,
  boardPrompt,
  boardReviewReason,
  metadataOnly: true,
  advisoryOnly: true,
  futureShadowOnly: true,
  executionAllowed: false,
  activationAllowed: false,
  inferenceAllowed: false,
  runtimeInvocationAllowed: false,
  businessMutationAllowed: false,
  productionDeploymentAllowed: false,
  automaticApprovalAllowed: false,
  artifactBytesIncluded: false,
  modelOutputIncluded: false,
});

const allSafetyFlagsDisabled = (routingPack: OfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackRecord): boolean => (
  routingPack.safety.modelExecutionAllowed === false
  && routingPack.safety.runtimeInvocationAllowed === false
  && routingPack.safety.artifactExecutionAllowed === false
  && routingPack.safety.artifactActivationAllowed === false
  && routingPack.safety.artifactBytesLoadingAllowed === false
  && routingPack.safety.inferenceEndpointExposed === false
  && routingPack.safety.productionIntegrationAllowed === false
  && routingPack.safety.decisionAutomationAllowed === false
  && routingPack.safety.canMutateBusinessRecords === false
  && routingPack.safety.automaticDeletionAllowed === false
  && routingPack.safety.purgeJobAllowed === false
);

export const buildOfflineArtifactValidationFutureShadowBoardReviewPacketSections = (
  routingPack: OfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackRecord,
): OfflineArtifactValidationFutureShadowBoardReviewPacketSection[] => {
  const boardReady = routingPack.routingPackStatus === "routing_pack_ready_for_future_shadow_board"
    && routingPack.routingDecision === "route_to_future_shadow_review_board"
    && routingPack.routeLane === "future_shadow_review_board_only";
  const boardLane: OfflineArtifactValidationFutureShadowBoardReviewLane = boardReady
    ? "future_shadow_board_review_only"
    : routingPack.routingPackStatus === "routing_pack_safety_blocked"
      ? "safety_review_blocked"
      : routingPack.routingPackStatus === "routing_pack_rejected_for_artifact_trust"
        ? "artifact_trust_rejection_review"
        : routingPack.routingPackStatus === "routing_pack_blocked_by_binder"
          ? "reviewer_evidence_closure"
          : "routing_closure";
  const traceabilityComplete = Boolean(
    routingPack.futureShadowEligibilityReviewBinderId
      && routingPack.futureShadowEligibilityGateId
      && routingPack.evidenceClosureSignoffPackId
      && routingPack.evidenceGapClosureMatrixId
      && routingPack.evidenceReviewPackId
      && routingPack.queueItemId
      && routingPack.validationResultId
      && routingPack.artifactId,
  );
  const evidenceAccepted = routingPack.evidenceConfidence === "high" || routingPack.evidenceConfidence === "medium";
  return [
    section(
      "routing_pack_ready_for_board_packet",
      "Routing summary pack is ready to become a future shadow board review packet",
      boardReady ? "pass" : routingPack.routingPackStatus === "routing_pack_needs_binder_closure" ? "warning" : "fail",
      routingPack.routingPackStatus === "routing_pack_safety_blocked" ? "critical" : "high",
      boardLane,
      { routingPackStatus: routingPack.routingPackStatus, routingDecision: routingPack.routingDecision, routeLane: routingPack.routeLane },
      "Confirm this packet is submitted only for future shadow board review and not for runtime, inference, activation, or deployment.",
      boardReady ? null : "Board packet requires a routing summary that is ready for future shadow board review; no automatic promotion is allowed.",
    ),
    section(
      "routing_decision_board_review_only",
      "Routing decision points only to a future shadow review board",
      routingPack.routingDecision === "route_to_future_shadow_review_board" ? "pass" : "fail",
      routingPack.routingDecision === "route_to_future_shadow_review_board" ? "medium" : "high",
      routingPack.routingDecision === "route_to_future_shadow_review_board" ? boardLane : "routing_closure",
      { routingDecision: routingPack.routingDecision, recommendedRoutingAction: routingPack.recommendedRoutingAction },
      "Review the routing decision and keep the board packet advisory-only.",
      routingPack.routingDecision === "route_to_future_shadow_review_board" ? null : "Routing decision is not ready for a board review packet.",
    ),
    section(
      "routing_readiness_threshold_met_for_board_packet",
      "Routing readiness is high enough for a board review packet",
      routingPack.routingReadinessPct >= 100 ? "pass" : routingPack.routingReadinessPct >= 85 ? "warning" : "fail",
      routingPack.routingReadinessPct < 85 ? "high" : "medium",
      routingPack.routingReadinessPct >= 85 ? boardLane : "routing_closure",
      { routingReadinessPct: routingPack.routingReadinessPct, failedSectionCount: routingPack.failedSectionCount },
      "Review routing readiness before presenting metadata to any future board.",
      routingPack.routingReadinessPct >= 85 ? null : "Raise routing readiness through metadata-only closure before board packet submission.",
    ),
    section(
      "route_lane_is_board_only",
      "Route lane is future-shadow-board-review-only",
      routingPack.routeLane === "future_shadow_review_board_only" ? "pass" : "fail",
      routingPack.routeLane === "future_shadow_review_board_only" ? "medium" : "high",
      routingPack.routeLane === "future_shadow_review_board_only" ? boardLane : "routing_closure",
      { routeLane: routingPack.routeLane, routePriority: routingPack.routePriority },
      "Confirm the lane does not imply runtime, deployment, inference, activation, or production scoring.",
      routingPack.routeLane === "future_shadow_review_board_only" ? null : "Route lane must be board-review-only before packet submission.",
    ),
    section(
      "failed_sections_absent_for_board_packet",
      "Routing summary has no failed sections before board review packet creation",
      routingPack.failedSectionCount === 0 ? "pass" : "fail",
      routingPack.failedSectionCount > 0 ? "high" : "low",
      routingPack.failedSectionCount > 0 ? "routing_closure" : boardLane,
      { failedSectionCount: routingPack.failedSectionCount, warningSectionCount: routingPack.warningSectionCount },
      "Resolve failed routing sections before a packet is sent to a future board.",
      routingPack.failedSectionCount === 0 ? null : "Failed routing sections block board review packet readiness.",
    ),
    section(
      "evidence_confidence_accepted_for_board_packet",
      "Evidence confidence is acceptable for future shadow board packet review",
      routingPack.evidenceConfidence === "high" ? "pass" : evidenceAccepted ? "warning" : "fail",
      evidenceAccepted ? "medium" : "high",
      evidenceAccepted ? boardLane : "reviewer_evidence_closure",
      { evidenceConfidence: routingPack.evidenceConfidence },
      "Confirm confidence is sufficient for human board review; this is not approval or activation.",
      evidenceAccepted ? null : "Low evidence confidence should return to evidence closure, not board packet review.",
    ),
    section(
      "traceability_chain_complete_for_board_packet",
      "Board packet preserves full offline validation traceability chain",
      traceabilityComplete ? "pass" : "fail",
      traceabilityComplete ? "low" : "high",
      traceabilityComplete ? boardLane : "reviewer_evidence_closure",
      {
        futureShadowReviewBinderRoutingSummaryPackId: routingPack.id,
        futureShadowEligibilityReviewBinderId: routingPack.futureShadowEligibilityReviewBinderId,
        futureShadowEligibilityGateId: routingPack.futureShadowEligibilityGateId,
        evidenceClosureSignoffPackId: routingPack.evidenceClosureSignoffPackId,
        evidenceGapClosureMatrixId: routingPack.evidenceGapClosureMatrixId,
        evidenceReviewPackId: routingPack.evidenceReviewPackId,
        queueItemId: routingPack.queueItemId,
        validationResultId: routingPack.validationResultId,
        artifactId: routingPack.artifactId,
      },
      "Keep board review packet traceability metadata complete before any human board review.",
      traceabilityComplete ? null : "Traceability gap exists; packet must stay in closure lane.",
    ),
    section(
      "future_shadow_board_scope_only",
      "Board packet scope is future-shadow-review-only and advisory-only",
      routingPack.routingSummaryPackSnapshot.futureShadowOnly === true && routingPack.routingSummaryPackSnapshot.advisoryOnly === true ? "pass" : "fail",
      "critical",
      routingPack.routingSummaryPackSnapshot.futureShadowOnly === true && routingPack.routingSummaryPackSnapshot.advisoryOnly === true ? boardLane : "safety_review_blocked",
      { futureShadowOnly: routingPack.routingSummaryPackSnapshot.futureShadowOnly, advisoryOnly: routingPack.routingSummaryPackSnapshot.advisoryOnly },
      "Reject any board packet interpretation that implies execution, activation, deployment, production scoring, or automatic approval.",
      routingPack.routingSummaryPackSnapshot.futureShadowOnly === true && routingPack.routingSummaryPackSnapshot.advisoryOnly === true ? null : "Board packet scope must remain advisory future-shadow-only.",
    ),
    section(
      "safety_gate_disabled_for_board_packet",
      "Safety gate remains disabled for execution, activation, inference, deletion, and business mutation",
      allSafetyFlagsDisabled(routingPack) ? "pass" : "fail",
      "critical",
      allSafetyFlagsDisabled(routingPack) ? boardLane : "safety_review_blocked",
      { safety: routingPack.safety },
      "Do not create board review packets if safety flags imply runtime, inference, activation, deletion, or mutation.",
      allSafetyFlagsDisabled(routingPack) ? null : "Safety flags are not fully disabled; board packet is blocked.",
    ),
  ];
};

const statusFromSections = (
  routingPack: OfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackRecord,
  sections: OfflineArtifactValidationFutureShadowBoardReviewPacketSection[],
): OfflineArtifactValidationFutureShadowBoardReviewPacketStatus => {
  if (!allSafetyFlagsDisabled(routingPack) || sections.some((item) => item.boardReviewLane === "safety_review_blocked" && item.status === "fail")) return "board_packet_safety_blocked";
  if (routingPack.routingPackStatus === "routing_pack_rejected_for_artifact_trust") return "board_packet_rejected_for_artifact_trust";
  if (routingPack.routingPackStatus === "routing_pack_blocked_by_binder") return "board_packet_blocked_by_routing";
  if (sections.some((item) => item.status === "fail") || routingPack.routingPackStatus !== "routing_pack_ready_for_future_shadow_board") return "board_packet_needs_routing_closure";
  return "board_packet_ready_for_future_shadow_review";
};

const decisionFromStatus = (
  status: OfflineArtifactValidationFutureShadowBoardReviewPacketStatus,
): OfflineArtifactValidationFutureShadowBoardReviewPacketDecision => {
  if (status === "board_packet_ready_for_future_shadow_review") return "submit_to_future_shadow_board_review";
  if (status === "board_packet_rejected_for_artifact_trust") return "reject_recommended";
  if (status === "board_packet_safety_blocked") return "hold_for_evidence_closure";
  if (status === "board_packet_blocked_by_routing") return "hold_for_evidence_closure";
  return "hold_for_routing_closure";
};

const laneFromStatus = (
  status: OfflineArtifactValidationFutureShadowBoardReviewPacketStatus,
): OfflineArtifactValidationFutureShadowBoardReviewLane => {
  if (status === "board_packet_ready_for_future_shadow_review") return "future_shadow_board_review_only";
  if (status === "board_packet_safety_blocked") return "safety_review_blocked";
  if (status === "board_packet_rejected_for_artifact_trust") return "artifact_trust_rejection_review";
  if (status === "board_packet_blocked_by_routing") return "reviewer_evidence_closure";
  return "routing_closure";
};

const priorityFromSections = (sections: OfflineArtifactValidationFutureShadowBoardReviewPacketSection[]): OfflineArtifactValidationReviewPriority => {
  if (sections.some((item) => item.status === "fail" && item.priority === "critical")) return "critical";
  if (sections.some((item) => item.status === "fail" && item.priority === "high")) return "high";
  if (sections.some((item) => item.status === "warning")) return "medium";
  return "low";
};

const readinessPctFromSections = (sections: OfflineArtifactValidationFutureShadowBoardReviewPacketSection[]): number => {
  if (sections.length === 0) return 0;
  const score = sections.reduce((sum, item) => sum + (item.status === "pass" ? 1 : item.status === "warning" ? 0.5 : 0), 0);
  return Math.round((score / sections.length) * 100);
};

const recommendedActionFromBoardPacket = (
  status: OfflineArtifactValidationFutureShadowBoardReviewPacketStatus,
): string => {
  if (status === "board_packet_ready_for_future_shadow_review") {
    return "Submit this metadata-only packet to the future shadow review board; do not execute, activate, infer, deploy, production-score, automatically approve, or mutate business records.";
  }
  if (status === "board_packet_safety_blocked") {
    return "Hold board packet submission and review disabled safety flags before any further metadata-only board routing.";
  }
  if (status === "board_packet_rejected_for_artifact_trust") {
    return "Route to artifact trust rejection review; do not submit to the future shadow review board.";
  }
  if (status === "board_packet_blocked_by_routing") {
    return "Route back to evidence/routing closure because the routing summary is blocked.";
  }
  return "Route back to routing closure and resolve metadata-only readiness gaps before any future shadow board review packet is submitted.";
};

export const buildOfflineArtifactValidationFutureShadowBoardReviewPacketSnapshot = (
  routingPack: OfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackRecord,
): OfflineArtifactValidationFutureShadowBoardReviewPacketSnapshot => {
  const boardPacketSections = buildOfflineArtifactValidationFutureShadowBoardReviewPacketSections(routingPack);
  const boardPacketStatus = statusFromSections(routingPack, boardPacketSections);
  const boardPacketDecision = decisionFromStatus(boardPacketStatus);
  const boardReviewLane = laneFromStatus(boardPacketStatus);
  const boardReviewPriority = priorityFromSections(boardPacketSections);
  const passedSectionCount = boardPacketSections.filter((item) => item.status === "pass").length;
  const warningSectionCount = boardPacketSections.filter((item) => item.status === "warning").length;
  const failedSectionCount = boardPacketSections.filter((item) => item.status === "fail").length;
  return {
    phase: PHASE_LABEL,
    routingSummaryPack: routingPack,
    boardPacketSections,
    boardPacketStatus,
    boardPacketDecision,
    boardReviewLane,
    boardReviewPriority,
    boardReviewScope: boardPacketStatus === "board_packet_ready_for_future_shadow_review" ? "future_shadow_board_review_packet_only" : "not_applicable",
    boardPacketReadinessPct: readinessPctFromSections(boardPacketSections),
    sectionCount: boardPacketSections.length,
    passedSectionCount,
    warningSectionCount,
    failedSectionCount,
    evidenceConfidence: routingPack.evidenceConfidence,
    routingDecision: routingPack.routingDecision,
    routingPackStatus: routingPack.routingPackStatus,
    routeLane: routingPack.routeLane,
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
  };
};

export const createOfflineArtifactValidationFutureShadowBoardReviewPacket = async (
  input: OfflineArtifactValidationFutureShadowBoardReviewPacketCreateInput,
): Promise<OfflineArtifactValidationFutureShadowBoardReviewPacketRecord | null> => {
  const routingPack = await getOfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackById(input.futureShadowReviewBinderRoutingSummaryPackId);
  if (!routingPack) return null;
  const boardReviewPacketSnapshot = buildOfflineArtifactValidationFutureShadowBoardReviewPacketSnapshot(routingPack);
  const signedFutureShadowBoardReviewPacketHash = computeArtifactEnvelopeSha256({
    phase: PHASE_LABEL,
    futureShadowReviewBinderRoutingSummaryPackId: routingPack.id,
    artifactId: routingPack.artifactId,
    artifactHash: routingPack.artifactHash,
    boardPacketStatus: boardReviewPacketSnapshot.boardPacketStatus,
    boardPacketDecision: boardReviewPacketSnapshot.boardPacketDecision,
    boardReviewLane: boardReviewPacketSnapshot.boardReviewLane,
    boardReviewPriority: boardReviewPacketSnapshot.boardReviewPriority,
    boardPacketReadinessPct: boardReviewPacketSnapshot.boardPacketReadinessPct,
    sectionCount: boardReviewPacketSnapshot.sectionCount,
    failedSectionCount: boardReviewPacketSnapshot.failedSectionCount,
    safety: buildOfflineArtifactValidationSafetyGate(),
  });
  return recordOfflineArtifactValidationFutureShadowBoardReviewPacket({
    futureShadowReviewBinderRoutingSummaryPackId: routingPack.id,
    futureShadowEligibilityReviewBinderId: routingPack.futureShadowEligibilityReviewBinderId,
    futureShadowEligibilityGateId: routingPack.futureShadowEligibilityGateId,
    evidenceClosureSignoffPackId: routingPack.evidenceClosureSignoffPackId,
    evidenceGapClosureMatrixId: routingPack.evidenceGapClosureMatrixId,
    evidenceReviewPackId: routingPack.evidenceReviewPackId,
    queueItemId: routingPack.queueItemId,
    validationResultId: routingPack.validationResultId,
    artifactId: routingPack.artifactId,
    artifactHash: routingPack.artifactHash,
    boardPacketStatus: boardReviewPacketSnapshot.boardPacketStatus,
    boardPacketDecision: boardReviewPacketSnapshot.boardPacketDecision,
    boardPacketReadinessPct: boardReviewPacketSnapshot.boardPacketReadinessPct,
    boardReviewPriority: boardReviewPacketSnapshot.boardReviewPriority,
    boardReviewLane: boardReviewPacketSnapshot.boardReviewLane,
    sectionCount: boardReviewPacketSnapshot.sectionCount,
    passedSectionCount: boardReviewPacketSnapshot.passedSectionCount,
    warningSectionCount: boardReviewPacketSnapshot.warningSectionCount,
    failedSectionCount: boardReviewPacketSnapshot.failedSectionCount,
    evidenceConfidence: boardReviewPacketSnapshot.evidenceConfidence,
    routingDecision: boardReviewPacketSnapshot.routingDecision,
    routingPackStatus: boardReviewPacketSnapshot.routingPackStatus,
    routeLane: boardReviewPacketSnapshot.routeLane,
    recommendedBoardAction: recommendedActionFromBoardPacket(boardReviewPacketSnapshot.boardPacketStatus),
    boardReviewPacketSnapshot,
    signedFutureShadowBoardReviewPacketHash,
    safety: buildOfflineArtifactValidationSafetyGate(),
    createdByUserId: input.createdByUserId ?? null,
  });
};

export const bootstrapOfflineArtifactValidationFutureShadowBoardReviewPacketFromLatestRoutingSummaryPack = async (
  input: { createdByUserId?: string | number | null } = {},
): Promise<OfflineArtifactValidationFutureShadowBoardReviewPacketRecord | null> => {
  const latestRoutingPack = (await listOfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPacks(1))[0] || null;
  if (!latestRoutingPack) return null;
  return createOfflineArtifactValidationFutureShadowBoardReviewPacket({
    futureShadowReviewBinderRoutingSummaryPackId: latestRoutingPack.id,
    createdByUserId: input.createdByUserId ?? null,
  });
};

export const createLatestOfflineArtifactValidationFutureShadowBoardReviewPacketForReviewBinder = async (
  input: { futureShadowEligibilityReviewBinderId: string | number; createdByUserId?: string | number | null },
): Promise<OfflineArtifactValidationFutureShadowBoardReviewPacketRecord | null> => {
  const routingPack = await getLatestOfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackForReviewBinder(input.futureShadowEligibilityReviewBinderId);
  if (!routingPack) return null;
  return createOfflineArtifactValidationFutureShadowBoardReviewPacket({
    futureShadowReviewBinderRoutingSummaryPackId: routingPack.id,
    createdByUserId: input.createdByUserId ?? null,
  });
};

export const getOfflineArtifactValidationFutureShadowBoardReviewPacket = (
  id: string | number,
): Promise<OfflineArtifactValidationFutureShadowBoardReviewPacketRecord | null> => getOfflineArtifactValidationFutureShadowBoardReviewPacketById(id);

export const listOfflineArtifactValidationFutureShadowBoardReviewPacketRecords = (
  limit?: unknown,
): Promise<OfflineArtifactValidationFutureShadowBoardReviewPacketRecord[]> => listOfflineArtifactValidationFutureShadowBoardReviewPackets(limit);

export const getLatestOfflineArtifactValidationFutureShadowBoardReviewPacket = (
  futureShadowReviewBinderRoutingSummaryPackId: string | number,
): Promise<OfflineArtifactValidationFutureShadowBoardReviewPacketRecord | null> => getLatestOfflineArtifactValidationFutureShadowBoardReviewPacketForRoutingSummaryPack(futureShadowReviewBinderRoutingSummaryPackId);

export const buildOfflineArtifactValidationFutureShadowBoardReviewPacketSummary = getOfflineArtifactValidationFutureShadowBoardReviewPacketSummary;
