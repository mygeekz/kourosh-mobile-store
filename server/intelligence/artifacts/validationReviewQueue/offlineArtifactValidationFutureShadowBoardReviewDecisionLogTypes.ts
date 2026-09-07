import type { OfflineArtifactValidationSafetyGate } from "../validation/offlineArtifactValidationTypes";
import type { OfflineArtifactValidationEvidenceConfidence } from "./offlineArtifactValidationEvidenceReviewPackTypes";
import type { OfflineArtifactValidationReviewPriority } from "./offlineArtifactValidationReviewQueueTypes";
import type { OfflineArtifactValidationFutureShadowBoardReviewPacketRecord } from "./offlineArtifactValidationFutureShadowBoardReviewPacketTypes";

export type OfflineArtifactValidationFutureShadowBoardReviewDecisionLogStatus =
  | "decision_log_recorded_for_future_shadow_board"
  | "decision_log_needs_board_packet_closure"
  | "decision_log_blocked_by_packet"
  | "decision_log_rejected_for_artifact_trust"
  | "decision_log_safety_blocked";

export type OfflineArtifactValidationFutureShadowBoardReviewDecision =
  | "accepted_for_future_shadow_review_only"
  | "needs_board_packet_closure"
  | "needs_routing_closure"
  | "needs_evidence_closure"
  | "quarantine_recommended"
  | "reject_recommended"
  | "deferred";

export type OfflineArtifactValidationFutureShadowBoardReviewDecisionLane =
  | "future_shadow_board_decision_log_only"
  | "board_packet_closure"
  | "routing_closure"
  | "reviewer_evidence_closure"
  | "artifact_trust_rejection_review"
  | "safety_review_blocked";

export interface OfflineArtifactValidationFutureShadowBoardReviewDecisionLogEntry {
  key: string;
  title: string;
  status: "pass" | "warning" | "fail";
  priority: OfflineArtifactValidationReviewPriority;
  decisionLane: OfflineArtifactValidationFutureShadowBoardReviewDecisionLane;
  evidence: Record<string, unknown>;
  decisionReason: string | null;
  reviewerPrompt: string;
  metadataOnly: true;
  advisoryOnly: true;
  futureShadowOnly: true;
  executionAllowed: false;
  activationAllowed: false;
  inferenceAllowed: false;
  runtimeInvocationAllowed: false;
  businessMutationAllowed: false;
  productionDeploymentAllowed: false;
  productionScoringAllowed: false;
  automaticApprovalAllowed: false;
  artifactBytesIncluded: false;
  modelOutputIncluded: false;
}

export interface OfflineArtifactValidationFutureShadowBoardReviewDecisionLogSnapshot {
  phase: "Phase 7K — Offline Artifact Future Shadow Board Review Decision Log";
  boardReviewPacket: OfflineArtifactValidationFutureShadowBoardReviewPacketRecord;
  decisionEntries: OfflineArtifactValidationFutureShadowBoardReviewDecisionLogEntry[];
  decisionLogStatus: OfflineArtifactValidationFutureShadowBoardReviewDecisionLogStatus;
  boardDecision: OfflineArtifactValidationFutureShadowBoardReviewDecision;
  boardDecisionReason: string;
  boardDecisionLane: OfflineArtifactValidationFutureShadowBoardReviewDecisionLane;
  boardReviewPriority: OfflineArtifactValidationReviewPriority;
  boardDecisionScope: "future_shadow_board_decision_log_only" | "not_applicable";
  decisionLogReadinessPct: number;
  sectionCount: number;
  passedSectionCount: number;
  warningSectionCount: number;
  failedSectionCount: number;
  evidenceConfidence: OfflineArtifactValidationEvidenceConfidence;
  boardPacketDecision: string;
  boardPacketStatus: string;
  boardReviewLane: string;
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
  productionScoringAllowed: false;
}

export interface OfflineArtifactValidationFutureShadowBoardReviewDecisionLogRecord {
  id: number;
  futureShadowBoardReviewPacketId: number;
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
  decisionLogStatus: OfflineArtifactValidationFutureShadowBoardReviewDecisionLogStatus;
  boardDecision: OfflineArtifactValidationFutureShadowBoardReviewDecision;
  boardDecisionReason: string;
  decisionLogReadinessPct: number;
  boardReviewPriority: OfflineArtifactValidationReviewPriority;
  boardDecisionLane: OfflineArtifactValidationFutureShadowBoardReviewDecisionLane;
  sectionCount: number;
  passedSectionCount: number;
  warningSectionCount: number;
  failedSectionCount: number;
  evidenceConfidence: OfflineArtifactValidationEvidenceConfidence;
  boardPacketDecision: string;
  boardPacketStatus: string;
  boardReviewLane: string;
  recommendedDecisionAction: string;
  decisionLogSnapshot: OfflineArtifactValidationFutureShadowBoardReviewDecisionLogSnapshot;
  signedFutureShadowBoardReviewDecisionLogHash: string;
  safety: OfflineArtifactValidationSafetyGate;
  createdAt: string;
  createdByUserId: string | number | null;
}

export interface OfflineArtifactValidationFutureShadowBoardReviewDecisionLogSummary {
  totalDecisionLogs: number;
  acceptedForFutureShadowReviewOnlyDecisionLogs: number;
  needsBoardPacketClosureDecisionLogs: number;
  blockedByPacketDecisionLogs: number;
  rejectedForArtifactTrustDecisionLogs: number;
  safetyBlockedDecisionLogs: number;
  averageDecisionLogReadinessPct: number;
  totalFailedSectionCount: number;
  criticalDecisionLogCount: number;
  highDecisionLogCount: number;
  latestDecisionLog: OfflineArtifactValidationFutureShadowBoardReviewDecisionLogRecord | null;
  recommendedNextAction: string;
  safety: OfflineArtifactValidationSafetyGate;
}

export interface OfflineArtifactValidationFutureShadowBoardReviewDecisionLogCreateInput {
  futureShadowBoardReviewPacketId: string | number;
  boardDecision?: OfflineArtifactValidationFutureShadowBoardReviewDecision | string | null;
  boardDecisionReason?: string | null;
  createdByUserId?: string | number | null;
}
