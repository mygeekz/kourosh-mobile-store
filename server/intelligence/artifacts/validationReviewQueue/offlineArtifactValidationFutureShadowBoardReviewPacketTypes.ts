import type { OfflineArtifactValidationSafetyGate } from "../validation/offlineArtifactValidationTypes";
import type { OfflineArtifactValidationEvidenceConfidence } from "./offlineArtifactValidationEvidenceReviewPackTypes";
import type { OfflineArtifactValidationReviewPriority } from "./offlineArtifactValidationReviewQueueTypes";
import type { OfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackRecord } from "./offlineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackTypes";

export type OfflineArtifactValidationFutureShadowBoardReviewPacketStatus =
  | "board_packet_ready_for_future_shadow_review"
  | "board_packet_needs_routing_closure"
  | "board_packet_blocked_by_routing"
  | "board_packet_rejected_for_artifact_trust"
  | "board_packet_safety_blocked";

export type OfflineArtifactValidationFutureShadowBoardReviewPacketDecision =
  | "submit_to_future_shadow_board_review"
  | "hold_for_routing_closure"
  | "hold_for_evidence_closure"
  | "quarantine_recommended"
  | "reject_recommended";

export type OfflineArtifactValidationFutureShadowBoardReviewLane =
  | "future_shadow_board_review_only"
  | "routing_closure"
  | "reviewer_evidence_closure"
  | "artifact_trust_rejection_review"
  | "safety_review_blocked";

export interface OfflineArtifactValidationFutureShadowBoardReviewPacketSection {
  key: string;
  title: string;
  status: "pass" | "warning" | "fail";
  priority: OfflineArtifactValidationReviewPriority;
  boardReviewLane: OfflineArtifactValidationFutureShadowBoardReviewLane;
  evidence: Record<string, unknown>;
  boardPrompt: string;
  boardReviewReason: string | null;
  metadataOnly: true;
  advisoryOnly: true;
  futureShadowOnly: true;
  executionAllowed: false;
  activationAllowed: false;
  inferenceAllowed: false;
  runtimeInvocationAllowed: false;
  businessMutationAllowed: false;
  productionDeploymentAllowed: false;
  automaticApprovalAllowed: false;
  artifactBytesIncluded: false;
  modelOutputIncluded: false;
}

export interface OfflineArtifactValidationFutureShadowBoardReviewPacketSnapshot {
  phase: "Phase 7J — Offline Artifact Future Shadow Board Review Packet";
  routingSummaryPack: OfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackRecord;
  boardPacketSections: OfflineArtifactValidationFutureShadowBoardReviewPacketSection[];
  boardPacketStatus: OfflineArtifactValidationFutureShadowBoardReviewPacketStatus;
  boardPacketDecision: OfflineArtifactValidationFutureShadowBoardReviewPacketDecision;
  boardReviewLane: OfflineArtifactValidationFutureShadowBoardReviewLane;
  boardReviewPriority: OfflineArtifactValidationReviewPriority;
  boardReviewScope: "future_shadow_board_review_packet_only" | "not_applicable";
  boardPacketReadinessPct: number;
  sectionCount: number;
  passedSectionCount: number;
  warningSectionCount: number;
  failedSectionCount: number;
  evidenceConfidence: OfflineArtifactValidationEvidenceConfidence;
  routingDecision: string;
  routingPackStatus: string;
  routeLane: string;
  metadataOnly: true;
  advisoryOnly: true;
  futureShadowOnly: true;
  executionAllowed: false;
  activationAllowed: false;
  inferenceAllowed: false;
  runtimeInvocationAllowed: false;
  businessMutationAllowed: false;
  artifactBytesIncluded: false;
  modelOutputIncluded: false;
  automaticApprovalAllowed: false;
  productionDeploymentAllowed: false;
}

export interface OfflineArtifactValidationFutureShadowBoardReviewPacketRecord {
  id: number;
  futureShadowReviewBinderRoutingSummaryPackId: number;
  futureShadowEligibilityReviewBinderId: number;
  futureShadowEligibilityGateId: number;
  evidenceClosureSignoffPackId: number;
  evidenceGapClosureMatrixId: number;
  evidenceReviewPackId: number;
  queueItemId: number;
  validationResultId: number;
  artifactId: string | number;
  artifactHash: string | null;
  boardPacketStatus: OfflineArtifactValidationFutureShadowBoardReviewPacketStatus;
  boardPacketDecision: OfflineArtifactValidationFutureShadowBoardReviewPacketDecision;
  boardPacketReadinessPct: number;
  boardReviewPriority: OfflineArtifactValidationReviewPriority;
  boardReviewLane: OfflineArtifactValidationFutureShadowBoardReviewLane;
  sectionCount: number;
  passedSectionCount: number;
  warningSectionCount: number;
  failedSectionCount: number;
  evidenceConfidence: OfflineArtifactValidationEvidenceConfidence;
  routingDecision: string;
  routingPackStatus: string;
  routeLane: string;
  recommendedBoardAction: string;
  boardReviewPacketSnapshot: OfflineArtifactValidationFutureShadowBoardReviewPacketSnapshot;
  signedFutureShadowBoardReviewPacketHash: string;
  safety: OfflineArtifactValidationSafetyGate;
  createdAt: string;
  createdByUserId: string | number | null;
}

export interface OfflineArtifactValidationFutureShadowBoardReviewPacketSummary {
  totalBoardReviewPackets: number;
  readyForFutureShadowBoardReviewPackets: number;
  needsRoutingClosurePackets: number;
  blockedByRoutingPackets: number;
  rejectedForArtifactTrustPackets: number;
  safetyBlockedPackets: number;
  averageBoardPacketReadinessPct: number;
  totalFailedSectionCount: number;
  criticalBoardReviewCount: number;
  highBoardReviewCount: number;
  latestBoardReviewPacket: OfflineArtifactValidationFutureShadowBoardReviewPacketRecord | null;
  recommendedNextAction: string;
  safety: OfflineArtifactValidationSafetyGate;
}

export interface OfflineArtifactValidationFutureShadowBoardReviewPacketCreateInput {
  futureShadowReviewBinderRoutingSummaryPackId: string | number;
  createdByUserId?: string | number | null;
}
