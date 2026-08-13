import { computeArtifactEnvelopeSha256 } from "../artifactHashing";
import { buildOfflineArtifactValidationSafetyGate } from "../validation/offlineArtifactValidationRules";
import {
  getLatestOfflineArtifactValidationFutureShadowBoardReviewPacketForRoutingSummaryPack,
  getOfflineArtifactValidationFutureShadowBoardReviewPacketById,
  listOfflineArtifactValidationFutureShadowBoardReviewPackets,
} from "../../../db/domains/ml/mlOfflineArtifactValidationFutureShadowBoardReviewPacket.db";
import {
  getLatestOfflineArtifactValidationFutureShadowBoardReviewDecisionLogForBoardReviewPacket,
  getOfflineArtifactValidationFutureShadowBoardReviewDecisionLogById,
  getOfflineArtifactValidationFutureShadowBoardReviewDecisionLogSummary,
  listOfflineArtifactValidationFutureShadowBoardReviewDecisionLogs,
  recordOfflineArtifactValidationFutureShadowBoardReviewDecisionLog,
} from "../../../db/domains/ml/mlOfflineArtifactValidationFutureShadowBoardReviewDecisionLog.db";
import type { OfflineArtifactValidationFutureShadowBoardReviewPacketRecord } from "./offlineArtifactValidationFutureShadowBoardReviewPacketTypes";
import type { OfflineArtifactValidationReviewPriority } from "./offlineArtifactValidationReviewQueueTypes";
import type {
  OfflineArtifactValidationFutureShadowBoardReviewDecision,
  OfflineArtifactValidationFutureShadowBoardReviewDecisionLane,
  OfflineArtifactValidationFutureShadowBoardReviewDecisionLogCreateInput,
  OfflineArtifactValidationFutureShadowBoardReviewDecisionLogEntry,
  OfflineArtifactValidationFutureShadowBoardReviewDecisionLogRecord,
  OfflineArtifactValidationFutureShadowBoardReviewDecisionLogSnapshot,
  OfflineArtifactValidationFutureShadowBoardReviewDecisionLogStatus,
} from "./offlineArtifactValidationFutureShadowBoardReviewDecisionLogTypes";

const PHASE_LABEL = "Phase 7K — Offline Artifact Future Shadow Board Review Decision Log" as const;

const allowedBoardDecisions: OfflineArtifactValidationFutureShadowBoardReviewDecision[] = [
  "accepted_for_future_shadow_review_only",
  "needs_board_packet_closure",
  "needs_routing_closure",
  "needs_evidence_closure",
  "quarantine_recommended",
  "reject_recommended",
  "deferred",
];

const decisionEntry = (
  key: string,
  title: string,
  status: OfflineArtifactValidationFutureShadowBoardReviewDecisionLogEntry["status"],
  priority: OfflineArtifactValidationReviewPriority,
  decisionLane: OfflineArtifactValidationFutureShadowBoardReviewDecisionLane,
  evidence: Record<string, unknown>,
  reviewerPrompt: string,
  decisionReason: string | null,
): OfflineArtifactValidationFutureShadowBoardReviewDecisionLogEntry => ({
  key,
  title,
  status,
  priority,
  decisionLane,
  evidence,
  reviewerPrompt,
  decisionReason,
  metadataOnly: true,
  advisoryOnly: true,
  futureShadowOnly: true,
  executionAllowed: false,
  activationAllowed: false,
  inferenceAllowed: false,
  runtimeInvocationAllowed: false,
  businessMutationAllowed: false,
  productionDeploymentAllowed: false,
  productionScoringAllowed: false,
  automaticApprovalAllowed: false,
  artifactBytesIncluded: false,
  modelOutputIncluded: false,
});

const allSafetyFlagsDisabled = (packet: OfflineArtifactValidationFutureShadowBoardReviewPacketRecord): boolean => (
  packet.safety.modelExecutionAllowed === false
  && packet.safety.runtimeInvocationAllowed === false
  && packet.safety.artifactExecutionAllowed === false
  && packet.safety.artifactActivationAllowed === false
  && packet.safety.artifactBytesLoadingAllowed === false
  && packet.safety.inferenceEndpointExposed === false
  && packet.safety.productionIntegrationAllowed === false
  && packet.safety.decisionAutomationAllowed === false
  && packet.safety.canChangeInventoryOrAccounting === false
  && packet.safety.canChangePricing === false
  && packet.safety.canChangeReports === false
  && packet.safety.canChangeLedger === false
  && packet.safety.canMutateBusinessRecords === false
  && packet.safety.automaticDeletionAllowed === false
  && packet.safety.purgeJobAllowed === false
);

const normalizeBoardDecision = (
  rawDecision: unknown,
  packet: OfflineArtifactValidationFutureShadowBoardReviewPacketRecord,
): OfflineArtifactValidationFutureShadowBoardReviewDecision => {
  const candidate = String(rawDecision ?? "").trim() as OfflineArtifactValidationFutureShadowBoardReviewDecision;
  if (allowedBoardDecisions.includes(candidate)) return candidate;
  if (packet.boardPacketStatus === "board_packet_ready_for_future_shadow_review") return "accepted_for_future_shadow_review_only";
  if (packet.boardPacketStatus === "board_packet_rejected_for_artifact_trust") return "reject_recommended";
  if (packet.boardPacketStatus === "board_packet_safety_blocked") return "deferred";
  if (packet.boardPacketStatus === "board_packet_blocked_by_routing") return "needs_evidence_closure";
  return "needs_board_packet_closure";
};

const decisionLaneFromDecision = (
  decision: OfflineArtifactValidationFutureShadowBoardReviewDecision,
  packet: OfflineArtifactValidationFutureShadowBoardReviewPacketRecord,
): OfflineArtifactValidationFutureShadowBoardReviewDecisionLane => {
  if (!allSafetyFlagsDisabled(packet)) return "safety_review_blocked";
  if (decision === "accepted_for_future_shadow_review_only") return "future_shadow_board_decision_log_only";
  if (decision === "reject_recommended" || decision === "quarantine_recommended") return "artifact_trust_rejection_review";
  if (decision === "needs_evidence_closure") return "reviewer_evidence_closure";
  if (decision === "needs_routing_closure") return "routing_closure";
  return "board_packet_closure";
};

const statusFromDecision = (
  decision: OfflineArtifactValidationFutureShadowBoardReviewDecision,
  packet: OfflineArtifactValidationFutureShadowBoardReviewPacketRecord,
): OfflineArtifactValidationFutureShadowBoardReviewDecisionLogStatus => {
  if (!allSafetyFlagsDisabled(packet)) return "decision_log_safety_blocked";
  if (packet.boardPacketStatus === "board_packet_rejected_for_artifact_trust" || decision === "reject_recommended" || decision === "quarantine_recommended") return "decision_log_rejected_for_artifact_trust";
  if (packet.boardPacketStatus === "board_packet_blocked_by_routing") return "decision_log_blocked_by_packet";
  if (decision === "accepted_for_future_shadow_review_only" && packet.boardPacketStatus === "board_packet_ready_for_future_shadow_review") return "decision_log_recorded_for_future_shadow_board";
  return "decision_log_needs_board_packet_closure";
};

const priorityFromEntries = (entries: OfflineArtifactValidationFutureShadowBoardReviewDecisionLogEntry[]): OfflineArtifactValidationReviewPriority => {
  if (entries.some((item) => item.status === "fail" && item.priority === "critical")) return "critical";
  if (entries.some((item) => item.status === "fail" && item.priority === "high")) return "high";
  if (entries.some((item) => item.status === "warning")) return "medium";
  return "low";
};

const readinessPctFromEntries = (entries: OfflineArtifactValidationFutureShadowBoardReviewDecisionLogEntry[]): number => {
  if (entries.length === 0) return 0;
  const score = entries.reduce((sum, item) => sum + (item.status === "pass" ? 1 : item.status === "warning" ? 0.5 : 0), 0);
  return Math.round((score / entries.length) * 100);
};

export const buildOfflineArtifactValidationFutureShadowBoardReviewDecisionLogEntries = (
  packet: OfflineArtifactValidationFutureShadowBoardReviewPacketRecord,
  decision: OfflineArtifactValidationFutureShadowBoardReviewDecision,
  decisionReason: string,
): OfflineArtifactValidationFutureShadowBoardReviewDecisionLogEntry[] => {
  const packetReady = packet.boardPacketStatus === "board_packet_ready_for_future_shadow_review";
  const boardOnlyDecision = decision === "accepted_for_future_shadow_review_only";
  const reasonProvided = decisionReason.trim().length >= 5;
  const scopeSafe = packet.boardReviewPacketSnapshot.futureShadowOnly === true && packet.boardReviewPacketSnapshot.advisoryOnly === true;
  const packetHasNoFailures = packet.failedSectionCount === 0;
  const evidenceAccepted = packet.evidenceConfidence === "high" || packet.evidenceConfidence === "medium";
  const traceabilityComplete = Boolean(
    packet.id
    && packet.futureShadowReviewBinderRoutingSummaryPackId
    && packet.futureShadowEligibilityReviewBinderId
    && packet.futureShadowEligibilityGateId
    && packet.evidenceClosureSignoffPackId
    && packet.evidenceGapClosureMatrixId
    && packet.evidenceReviewPackId
    && packet.queueItemId
    && packet.validationResultId
    && packet.artifactId,
  );

  return [
    decisionEntry(
      "board_packet_ready_for_decision_log",
      "Board review packet is ready before recording a board decision log",
      packetReady ? "pass" : "fail",
      packetReady ? "medium" : "high",
      packetReady ? "future_shadow_board_decision_log_only" : "board_packet_closure",
      { boardPacketStatus: packet.boardPacketStatus, boardPacketDecision: packet.boardPacketDecision },
      "Confirm the board packet is metadata-only and ready for human decision logging.",
      packetReady ? null : "Board decision log should not be recorded as accepted until packet closure is complete.",
    ),
    decisionEntry(
      "board_decision_future_shadow_only",
      "Board decision is explicitly future-shadow-review-only",
      boardOnlyDecision && packetReady ? "pass" : decision === "deferred" ? "warning" : "fail",
      boardOnlyDecision ? "medium" : "high",
      boardOnlyDecision ? "future_shadow_board_decision_log_only" : decisionLaneFromDecision(decision, packet),
      { boardDecision: decision },
      "Record only advisory future-shadow-review-only decisions; this is not approval, activation, deployment, production scoring, or inference.",
      boardOnlyDecision ? null : "Decision is not an accepted future-shadow-review-only decision.",
    ),
    decisionEntry(
      "board_decision_reason_recorded",
      "Board decision reason is captured in the decision log",
      reasonProvided ? "pass" : "warning",
      reasonProvided ? "low" : "medium",
      decisionLaneFromDecision(decision, packet),
      { boardDecisionReason: decisionReason },
      "Keep the human board reason concise, audit-ready, and explicit about future-shadow-only scope.",
      reasonProvided ? null : "Decision reason is short or missing; add a stronger human-review note.",
    ),
    decisionEntry(
      "board_packet_failures_absent",
      "Board packet has no failed sections before accepted decision logging",
      packetHasNoFailures ? "pass" : "fail",
      packetHasNoFailures ? "low" : "high",
      packetHasNoFailures ? decisionLaneFromDecision(decision, packet) : "board_packet_closure",
      { failedSectionCount: packet.failedSectionCount, warningSectionCount: packet.warningSectionCount },
      "Resolve failed packet sections before recording an accepted future-shadow-only board decision.",
      packetHasNoFailures ? null : "Board packet failure blocks accepted decision logging.",
    ),
    decisionEntry(
      "evidence_confidence_accepted_for_decision_log",
      "Evidence confidence is acceptable for board decision logging",
      packet.evidenceConfidence === "high" ? "pass" : evidenceAccepted ? "warning" : "fail",
      evidenceAccepted ? "medium" : "high",
      evidenceAccepted ? decisionLaneFromDecision(decision, packet) : "reviewer_evidence_closure",
      { evidenceConfidence: packet.evidenceConfidence },
      "Confirm evidence confidence is enough for a human board decision log, not for activation or inference.",
      evidenceAccepted ? null : "Low evidence confidence should return to evidence closure.",
    ),
    decisionEntry(
      "traceability_chain_complete_for_decision_log",
      "Decision log preserves complete offline validation traceability chain",
      traceabilityComplete ? "pass" : "fail",
      traceabilityComplete ? "low" : "high",
      traceabilityComplete ? decisionLaneFromDecision(decision, packet) : "reviewer_evidence_closure",
      {
        futureShadowBoardReviewPacketId: packet.id,
        futureShadowReviewBinderRoutingSummaryPackId: packet.futureShadowReviewBinderRoutingSummaryPackId,
        futureShadowEligibilityReviewBinderId: packet.futureShadowEligibilityReviewBinderId,
        futureShadowEligibilityGateId: packet.futureShadowEligibilityGateId,
        evidenceClosureSignoffPackId: packet.evidenceClosureSignoffPackId,
        evidenceGapClosureMatrixId: packet.evidenceGapClosureMatrixId,
        evidenceReviewPackId: packet.evidenceReviewPackId,
        queueItemId: packet.queueItemId,
        validationResultId: packet.validationResultId,
        artifactId: packet.artifactId,
      },
      "Keep traceability intact for future shadow review board records.",
      traceabilityComplete ? null : "Traceability gap exists; decision log must remain in closure lane.",
    ),
    decisionEntry(
      "future_shadow_decision_scope_only",
      "Decision log scope is future-shadow-review-only and advisory-only",
      scopeSafe ? "pass" : "fail",
      "critical",
      scopeSafe ? decisionLaneFromDecision(decision, packet) : "safety_review_blocked",
      { futureShadowOnly: packet.boardReviewPacketSnapshot.futureShadowOnly, advisoryOnly: packet.boardReviewPacketSnapshot.advisoryOnly },
      "Reject any decision log interpretation that implies execution, activation, deployment, production scoring, automatic approval, or business mutation.",
      scopeSafe ? null : "Decision log scope must remain advisory future-shadow-only.",
    ),
    decisionEntry(
      "safety_gate_disabled_for_decision_log",
      "Safety gate remains disabled for execution, activation, inference, deletion, and business mutation",
      allSafetyFlagsDisabled(packet) ? "pass" : "fail",
      "critical",
      allSafetyFlagsDisabled(packet) ? decisionLaneFromDecision(decision, packet) : "safety_review_blocked",
      { safety: packet.safety },
      "Do not record decision logs if safety flags imply runtime, inference, activation, deletion, deployment, scoring, or mutation.",
      allSafetyFlagsDisabled(packet) ? null : "Safety flags are not fully disabled; decision log is blocked.",
    ),
  ];
};

const recommendedActionFromDecisionLog = (
  status: OfflineArtifactValidationFutureShadowBoardReviewDecisionLogStatus,
): string => {
  if (status === "decision_log_recorded_for_future_shadow_board") return "Decision log is accepted for future-shadow-review-only evidence; do not execute, activate, infer, deploy, production-score, automatically approve, or mutate business records.";
  if (status === "decision_log_safety_blocked") return "Hold decision logging and review disabled safety flags before any further metadata-only board decision routing.";
  if (status === "decision_log_rejected_for_artifact_trust") return "Route to artifact trust rejection review; do not treat this as approval or shadow activation.";
  if (status === "decision_log_blocked_by_packet") return "Return to board packet/routing/evidence closure before recording accepted board decision metadata.";
  return "Resolve board packet closure and record a stronger human decision reason before any future-shadow-only board decision log is considered ready.";
};

export const buildOfflineArtifactValidationFutureShadowBoardReviewDecisionLogSnapshot = (
  packet: OfflineArtifactValidationFutureShadowBoardReviewPacketRecord,
  decision: OfflineArtifactValidationFutureShadowBoardReviewDecision,
  decisionReason: string,
): OfflineArtifactValidationFutureShadowBoardReviewDecisionLogSnapshot => {
  const decisionEntries = buildOfflineArtifactValidationFutureShadowBoardReviewDecisionLogEntries(packet, decision, decisionReason);
  const decisionLogStatus = statusFromDecision(decision, packet);
  const boardDecisionLane = decisionLaneFromDecision(decision, packet);
  const boardReviewPriority = priorityFromEntries(decisionEntries);
  const decisionLogReadinessPct = readinessPctFromEntries(decisionEntries);
  const passedSectionCount = decisionEntries.filter((item) => item.status === "pass").length;
  const warningSectionCount = decisionEntries.filter((item) => item.status === "warning").length;
  const failedSectionCount = decisionEntries.filter((item) => item.status === "fail").length;

  return {
    phase: PHASE_LABEL,
    boardReviewPacket: packet,
    decisionEntries,
    decisionLogStatus,
    boardDecision: decision,
    boardDecisionReason: decisionReason,
    boardDecisionLane,
    boardReviewPriority,
    boardDecisionScope: decisionLogStatus === "decision_log_recorded_for_future_shadow_board" ? "future_shadow_board_decision_log_only" : "not_applicable",
    decisionLogReadinessPct,
    sectionCount: decisionEntries.length,
    passedSectionCount,
    warningSectionCount,
    failedSectionCount,
    evidenceConfidence: packet.evidenceConfidence,
    boardPacketDecision: packet.boardPacketDecision,
    boardPacketStatus: packet.boardPacketStatus,
    boardReviewLane: packet.boardReviewLane,
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
  };
};

export const createOfflineArtifactValidationFutureShadowBoardReviewDecisionLog = async (
  input: OfflineArtifactValidationFutureShadowBoardReviewDecisionLogCreateInput,
): Promise<OfflineArtifactValidationFutureShadowBoardReviewDecisionLogRecord> => {
  const packet = await getOfflineArtifactValidationFutureShadowBoardReviewPacketById(input.futureShadowBoardReviewPacketId);
  if (!packet) throw new Error("Future shadow board review packet not found for decision log.");
  const boardDecision = normalizeBoardDecision(input.boardDecision, packet);
  const boardDecisionReason = String(input.boardDecisionReason || "Human board decision recorded for future-shadow-review-only metadata; no activation, inference, deployment, production scoring, automatic approval, or business mutation is allowed.").trim();
  const decisionLogSnapshot = buildOfflineArtifactValidationFutureShadowBoardReviewDecisionLogSnapshot(packet, boardDecision, boardDecisionReason);
  const signedFutureShadowBoardReviewDecisionLogHash = computeArtifactEnvelopeSha256({ phase: PHASE_LABEL, artifactId: packet.artifactId, artifactHash: packet.artifactHash, decisionLogSnapshot });
  const saved = await recordOfflineArtifactValidationFutureShadowBoardReviewDecisionLog({
    futureShadowBoardReviewPacketId: packet.id,
    futureShadowReviewBinderRoutingSummaryPackId: packet.futureShadowReviewBinderRoutingSummaryPackId,
    futureShadowEligibilityReviewBinderId: packet.futureShadowEligibilityReviewBinderId,
    futureShadowEligibilityGateId: packet.futureShadowEligibilityGateId,
    evidenceClosureSignoffPackId: packet.evidenceClosureSignoffPackId,
    evidenceGapClosureMatrixId: packet.evidenceGapClosureMatrixId,
    evidenceReviewPackId: packet.evidenceReviewPackId,
    queueItemId: packet.queueItemId,
    validationResultId: packet.validationResultId,
    artifactId: packet.artifactId,
    artifactHash: packet.artifactHash,
    decisionLogStatus: decisionLogSnapshot.decisionLogStatus,
    boardDecision: decisionLogSnapshot.boardDecision,
    boardDecisionReason: decisionLogSnapshot.boardDecisionReason,
    decisionLogReadinessPct: decisionLogSnapshot.decisionLogReadinessPct,
    boardReviewPriority: decisionLogSnapshot.boardReviewPriority,
    boardDecisionLane: decisionLogSnapshot.boardDecisionLane,
    sectionCount: decisionLogSnapshot.sectionCount,
    passedSectionCount: decisionLogSnapshot.passedSectionCount,
    warningSectionCount: decisionLogSnapshot.warningSectionCount,
    failedSectionCount: decisionLogSnapshot.failedSectionCount,
    evidenceConfidence: decisionLogSnapshot.evidenceConfidence,
    boardPacketDecision: packet.boardPacketDecision,
    boardPacketStatus: packet.boardPacketStatus,
    boardReviewLane: packet.boardReviewLane,
    recommendedDecisionAction: recommendedActionFromDecisionLog(decisionLogSnapshot.decisionLogStatus),
    decisionLogSnapshot,
    signedFutureShadowBoardReviewDecisionLogHash,
    safety: buildOfflineArtifactValidationSafetyGate(),
    createdByUserId: input.createdByUserId ?? null,
  });
  if (!saved) throw new Error("Failed to persist future shadow board review decision log.");
  return saved;
};

export const bootstrapOfflineArtifactValidationFutureShadowBoardReviewDecisionLogFromLatestBoardReviewPacket = async (createdByUserId?: string | number | null): Promise<OfflineArtifactValidationFutureShadowBoardReviewDecisionLogRecord | null> => {
  const latestPacket = (await listOfflineArtifactValidationFutureShadowBoardReviewPackets(1))[0];
  if (!latestPacket) return null;
  return createOfflineArtifactValidationFutureShadowBoardReviewDecisionLog({ futureShadowBoardReviewPacketId: latestPacket.id, createdByUserId });
};

export const createLatestOfflineArtifactValidationFutureShadowBoardReviewDecisionLogForRoutingSummaryPack = async (futureShadowReviewBinderRoutingSummaryPackId: string | number, createdByUserId?: string | number | null): Promise<OfflineArtifactValidationFutureShadowBoardReviewDecisionLogRecord | null> => {
  const packet = await getLatestOfflineArtifactValidationFutureShadowBoardReviewPacketForRoutingSummaryPack(futureShadowReviewBinderRoutingSummaryPackId);
  if (!packet) return null;
  return createOfflineArtifactValidationFutureShadowBoardReviewDecisionLog({ futureShadowBoardReviewPacketId: packet.id, createdByUserId });
};

export {
  getLatestOfflineArtifactValidationFutureShadowBoardReviewDecisionLogForBoardReviewPacket,
  getOfflineArtifactValidationFutureShadowBoardReviewDecisionLogById,
  getOfflineArtifactValidationFutureShadowBoardReviewDecisionLogSummary,
  listOfflineArtifactValidationFutureShadowBoardReviewDecisionLogs,
};
