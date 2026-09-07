import type { OfflineArtifactValidationSafetyGate } from "../validation/offlineArtifactValidationTypes";
import type { OfflineArtifactValidationEvidenceConfidence } from "./offlineArtifactValidationEvidenceReviewPackTypes";
import type { OfflineArtifactValidationReviewPriority } from "./offlineArtifactValidationReviewQueueTypes";
import type { OfflineArtifactValidationFutureShadowEligibilityGateRecord } from "./offlineArtifactValidationFutureShadowEligibilityGateTypes";

export type OfflineArtifactValidationFutureShadowEligibilityReviewBinderStatus =
  | "binder_ready_for_future_shadow_review"
  | "binder_needs_eligibility_closure"
  | "binder_blocked_by_eligibility_gate"
  | "binder_rejected_for_artifact_trust"
  | "binder_safety_blocked";

export type OfflineArtifactValidationFutureShadowEligibilityReviewBinderDecision =
  | "ready_for_future_shadow_review_binder"
  | "needs_eligibility_closure"
  | "blocked_by_eligibility_gate"
  | "quarantine_recommended"
  | "reject_recommended";

export interface OfflineArtifactValidationFutureShadowEligibilityReviewBinderSection {
  key: string;
  title: string;
  status: "pass" | "warning" | "fail";
  priority: OfflineArtifactValidationReviewPriority;
  evidence: Record<string, unknown>;
  reviewerPrompt: string;
  blockerReason: string | null;
  metadataOnly: true;
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

export interface OfflineArtifactValidationFutureShadowEligibilityReviewBinderSnapshot {
  phase: "Phase 7H — Offline Artifact Future Shadow Eligibility Review Binder";
  eligibilityGate: OfflineArtifactValidationFutureShadowEligibilityGateRecord;
  binderSections: OfflineArtifactValidationFutureShadowEligibilityReviewBinderSection[];
  binderStatus: OfflineArtifactValidationFutureShadowEligibilityReviewBinderStatus;
  binderDecision: OfflineArtifactValidationFutureShadowEligibilityReviewBinderDecision;
  binderScope: "future_shadow_review_binder_only" | "not_applicable";
  binderReadinessPct: number;
  sectionCount: number;
  passedSectionCount: number;
  warningSectionCount: number;
  failedSectionCount: number;
  evidenceConfidence: OfflineArtifactValidationEvidenceConfidence;
  eligibilityDecision: string;
  gateStatus: string;
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

export interface OfflineArtifactValidationFutureShadowEligibilityReviewBinderRecord {
  id: number;
  futureShadowEligibilityGateId: number;
  evidenceClosureSignoffPackId: number;
  evidenceGapClosureMatrixId: number;
  evidenceReviewPackId: number;
  queueItemId: number;
  validationResultId: number;
  artifactId: string | number;
  artifactHash: string | null;
  binderStatus: OfflineArtifactValidationFutureShadowEligibilityReviewBinderStatus;
  binderDecision: OfflineArtifactValidationFutureShadowEligibilityReviewBinderDecision;
  binderReadinessPct: number;
  sectionCount: number;
  passedSectionCount: number;
  warningSectionCount: number;
  failedSectionCount: number;
  evidenceConfidence: OfflineArtifactValidationEvidenceConfidence;
  eligibilityDecision: string;
  gateStatus: string;
  recommendedBinderAction: string;
  binderSnapshot: OfflineArtifactValidationFutureShadowEligibilityReviewBinderSnapshot;
  signedFutureShadowEligibilityReviewBinderHash: string;
  safety: OfflineArtifactValidationSafetyGate;
  createdAt: string;
  createdByUserId: string | number | null;
}

export interface OfflineArtifactValidationFutureShadowEligibilityReviewBinderSummary {
  totalReviewBinders: number;
  readyForFutureShadowReviewBinders: number;
  needsEligibilityClosureBinders: number;
  blockedByEligibilityGateBinders: number;
  rejectedForArtifactTrustBinders: number;
  safetyBlockedBinders: number;
  averageBinderReadinessPct: number;
  totalFailedSectionCount: number;
  latestReviewBinder: OfflineArtifactValidationFutureShadowEligibilityReviewBinderRecord | null;
  recommendedNextAction: string;
  safety: OfflineArtifactValidationSafetyGate;
}

export interface OfflineArtifactValidationFutureShadowEligibilityReviewBinderCreateInput {
  futureShadowEligibilityGateId: string | number;
  createdByUserId?: string | number | null;
}
