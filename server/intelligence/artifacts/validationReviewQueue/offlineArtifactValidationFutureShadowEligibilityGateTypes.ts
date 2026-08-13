import type { OfflineArtifactValidationSafetyGate } from "../validation/offlineArtifactValidationTypes";
import type { OfflineArtifactValidationEvidenceConfidence } from "./offlineArtifactValidationEvidenceReviewPackTypes";
import type { OfflineArtifactValidationReviewPriority } from "./offlineArtifactValidationReviewQueueTypes";
import type { OfflineArtifactValidationEvidenceClosureSignoffPackRecord } from "./offlineArtifactValidationEvidenceClosureSignoffPackTypes";

export type OfflineArtifactValidationFutureShadowEligibilityGateStatus =
  | "eligible_for_future_shadow_review"
  | "not_ready_needs_more_evidence"
  | "blocked_by_signoff"
  | "rejected_for_artifact_trust"
  | "safety_gate_blocked";

export type OfflineArtifactValidationFutureShadowEligibilityDecision =
  | "not_eligible"
  | "eligible_for_future_shadow_review"
  | "needs_evidence_closure"
  | "quarantine_recommended"
  | "reject_recommended";

export interface OfflineArtifactValidationFutureShadowEligibilityCheck {
  key: string;
  label: string;
  status: "pass" | "warning" | "fail";
  priority: OfflineArtifactValidationReviewPriority;
  evidence: Record<string, unknown>;
  blockerReason: string | null;
  advisoryOnly: true;
  futureShadowOnly: true;
  executionAllowed: false;
  activationAllowed: false;
  inferenceAllowed: false;
  businessMutationAllowed: false;
  productionDeploymentAllowed: false;
  automaticApprovalAllowed: false;
}

export interface OfflineArtifactValidationFutureShadowEligibilityGateSnapshot {
  phase: "Phase 7G — Offline Artifact Future Shadow Eligibility Readiness Gate";
  signoffPack: OfflineArtifactValidationEvidenceClosureSignoffPackRecord;
  checks: OfflineArtifactValidationFutureShadowEligibilityCheck[];
  gateStatus: OfflineArtifactValidationFutureShadowEligibilityGateStatus;
  eligibilityDecision: OfflineArtifactValidationFutureShadowEligibilityDecision;
  eligibilityScope: "future_shadow_review_only" | "not_applicable";
  eligibilityReadinessPct: number;
  blockerCount: number;
  criticalBlockerCount: number;
  warningCount: number;
  evidenceConfidence: OfflineArtifactValidationEvidenceConfidence;
  reviewerDecision: string;
  signoffPackStatus: string;
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

export interface OfflineArtifactValidationFutureShadowEligibilityGateRecord {
  id: number;
  evidenceClosureSignoffPackId: number;
  evidenceGapClosureMatrixId: number;
  evidenceReviewPackId: number;
  queueItemId: number;
  validationResultId: number;
  artifactId: string | number;
  artifactHash: string | null;
  gateStatus: OfflineArtifactValidationFutureShadowEligibilityGateStatus;
  eligibilityDecision: OfflineArtifactValidationFutureShadowEligibilityDecision;
  eligibilityReadinessPct: number;
  blockerCount: number;
  criticalBlockerCount: number;
  warningCount: number;
  evidenceConfidence: OfflineArtifactValidationEvidenceConfidence;
  reviewerDecision: string;
  signoffPackStatus: string;
  recommendedEligibilityAction: string;
  eligibilityGateSnapshot: OfflineArtifactValidationFutureShadowEligibilityGateSnapshot;
  signedFutureShadowEligibilityGateHash: string;
  safety: OfflineArtifactValidationSafetyGate;
  createdAt: string;
  createdByUserId: string | number | null;
}

export interface OfflineArtifactValidationFutureShadowEligibilityGateSummary {
  totalEligibilityGates: number;
  eligibleForFutureShadowReviewGates: number;
  notReadyNeedsMoreEvidenceGates: number;
  blockedBySignoffGates: number;
  rejectedForArtifactTrustGates: number;
  safetyGateBlockedGates: number;
  averageEligibilityReadinessPct: number;
  totalBlockerCount: number;
  totalCriticalBlockerCount: number;
  latestEligibilityGate: OfflineArtifactValidationFutureShadowEligibilityGateRecord | null;
  recommendedNextAction: string;
  safety: OfflineArtifactValidationSafetyGate;
}

export interface OfflineArtifactValidationFutureShadowEligibilityGateCreateInput {
  evidenceClosureSignoffPackId: string | number;
  createdByUserId?: string | number | null;
}
