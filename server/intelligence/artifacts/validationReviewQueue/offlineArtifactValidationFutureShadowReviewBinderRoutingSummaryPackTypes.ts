import type { OfflineArtifactValidationSafetyGate } from "../validation/offlineArtifactValidationTypes";
import type { OfflineArtifactValidationEvidenceConfidence } from "./offlineArtifactValidationEvidenceReviewPackTypes";
import type { OfflineArtifactValidationReviewPriority } from "./offlineArtifactValidationReviewQueueTypes";
import type { OfflineArtifactValidationFutureShadowEligibilityReviewBinderRecord } from "./offlineArtifactValidationFutureShadowEligibilityReviewBinderTypes";

export type OfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackStatus =
  | "routing_pack_ready_for_future_shadow_board"
  | "routing_pack_needs_binder_closure"
  | "routing_pack_blocked_by_binder"
  | "routing_pack_rejected_for_artifact_trust"
  | "routing_pack_safety_blocked";

export type OfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryDecision =
  | "route_to_future_shadow_review_board"
  | "hold_for_binder_closure"
  | "hold_for_evidence_closure"
  | "quarantine_recommended"
  | "reject_recommended";

export type OfflineArtifactValidationFutureShadowReviewBinderRoutingLane =
  | "future_shadow_review_board_only"
  | "reviewer_evidence_closure"
  | "eligibility_binder_closure"
  | "artifact_trust_rejection_review"
  | "safety_review_blocked";

export interface OfflineArtifactValidationFutureShadowReviewBinderRoutingSummarySection {
  key: string;
  title: string;
  status: "pass" | "warning" | "fail";
  priority: OfflineArtifactValidationReviewPriority;
  routeLane: OfflineArtifactValidationFutureShadowReviewBinderRoutingLane;
  evidence: Record<string, unknown>;
  reviewerPrompt: string;
  routingReason: string | null;
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

export interface OfflineArtifactValidationFutureShadowReviewBinderRoutingSummarySnapshot {
  phase: "Phase 7I — Offline Artifact Future Shadow Review Binder Routing Summary Pack";
  reviewBinder: OfflineArtifactValidationFutureShadowEligibilityReviewBinderRecord;
  routingSections: OfflineArtifactValidationFutureShadowReviewBinderRoutingSummarySection[];
  routingPackStatus: OfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackStatus;
  routingDecision: OfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryDecision;
  routeLane: OfflineArtifactValidationFutureShadowReviewBinderRoutingLane;
  routePriority: OfflineArtifactValidationReviewPriority;
  routingScope: "future_shadow_review_routing_summary_only" | "not_applicable";
  routingReadinessPct: number;
  sectionCount: number;
  passedSectionCount: number;
  warningSectionCount: number;
  failedSectionCount: number;
  evidenceConfidence: OfflineArtifactValidationEvidenceConfidence;
  binderDecision: string;
  binderStatus: string;
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

export interface OfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackRecord {
  id: number;
  futureShadowEligibilityReviewBinderId: number;
  futureShadowEligibilityGateId: number;
  evidenceClosureSignoffPackId: number;
  evidenceGapClosureMatrixId: number;
  evidenceReviewPackId: number;
  queueItemId: number;
  validationResultId: number;
  artifactId: string | number;
  artifactHash: string | null;
  routingPackStatus: OfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackStatus;
  routingDecision: OfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryDecision;
  routingReadinessPct: number;
  routePriority: OfflineArtifactValidationReviewPriority;
  routeLane: OfflineArtifactValidationFutureShadowReviewBinderRoutingLane;
  sectionCount: number;
  passedSectionCount: number;
  warningSectionCount: number;
  failedSectionCount: number;
  evidenceConfidence: OfflineArtifactValidationEvidenceConfidence;
  binderDecision: string;
  binderStatus: string;
  recommendedRoutingAction: string;
  routingSummaryPackSnapshot: OfflineArtifactValidationFutureShadowReviewBinderRoutingSummarySnapshot;
  signedFutureShadowReviewBinderRoutingSummaryPackHash: string;
  safety: OfflineArtifactValidationSafetyGate;
  createdAt: string;
  createdByUserId: string | number | null;
}

export interface OfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackSummary {
  totalRoutingSummaryPacks: number;
  readyForFutureShadowBoardPacks: number;
  needsBinderClosurePacks: number;
  blockedByBinderPacks: number;
  rejectedForArtifactTrustPacks: number;
  safetyBlockedPacks: number;
  averageRoutingReadinessPct: number;
  totalFailedSectionCount: number;
  criticalRouteCount: number;
  highRouteCount: number;
  latestRoutingSummaryPack: OfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackRecord | null;
  recommendedNextAction: string;
  safety: OfflineArtifactValidationSafetyGate;
}

export interface OfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackCreateInput {
  futureShadowEligibilityReviewBinderId: string | number;
  createdByUserId?: string | number | null;
}
