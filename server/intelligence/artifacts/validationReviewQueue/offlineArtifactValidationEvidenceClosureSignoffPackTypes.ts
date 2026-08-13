import type { OfflineArtifactValidationSafetyGate } from "../validation/offlineArtifactValidationTypes";
import type { OfflineArtifactValidationEvidenceConfidence } from "./offlineArtifactValidationEvidenceReviewPackTypes";
import type { OfflineArtifactValidationEvidenceGapClosureMatrixRecord } from "./offlineArtifactValidationEvidenceGapClosureMatrixTypes";
import type { OfflineArtifactValidationReviewPriority } from "./offlineArtifactValidationReviewQueueTypes";

export type OfflineArtifactValidationEvidenceClosureSignoffPackStatus =
  | "ready_for_human_signoff"
  | "signed_for_future_shadow_only"
  | "needs_more_evidence"
  | "blocked_by_open_gap"
  | "rejected_for_artifact_trust";

export type OfflineArtifactValidationEvidenceClosureSignoffDecision =
  | "not_signed"
  | "accepted_for_future_shadow_only"
  | "needs_more_evidence"
  | "quarantine_recommended"
  | "reject_recommended";

export interface OfflineArtifactValidationEvidenceClosureSignoffChecklistItem {
  key: string;
  label: string;
  status: "pass" | "warning" | "fail";
  priority: OfflineArtifactValidationReviewPriority;
  evidence: Record<string, unknown>;
  requiredReviewerAction: string;
  advisoryOnly: true;
  executionAllowed: false;
  activationAllowed: false;
  inferenceAllowed: false;
  businessMutationAllowed: false;
}

export interface OfflineArtifactValidationEvidenceClosureSignoffPackSnapshot {
  phase: "Phase 7F — Offline Artifact Evidence Closure Reviewer Signoff Pack";
  matrix: OfflineArtifactValidationEvidenceGapClosureMatrixRecord;
  checklist: OfflineArtifactValidationEvidenceClosureSignoffChecklistItem[];
  reviewerDecision: OfflineArtifactValidationEvidenceClosureSignoffDecision;
  reviewerDecisionReason: string;
  signoffScope: "future_shadow_only" | "not_applicable";
  evidenceConfidence: OfflineArtifactValidationEvidenceConfidence;
  closureReadinessPct: number;
  openGapCount: number;
  criticalOpenGapCount: number;
  highOpenGapCount: number;
  advisoryOnly: true;
  executionAllowed: false;
  activationAllowed: false;
  inferenceAllowed: false;
  businessMutationAllowed: false;
  artifactBytesIncluded: false;
  modelOutputIncluded: false;
  automaticApprovalAllowed: false;
  productionDeploymentAllowed: false;
}

export interface OfflineArtifactValidationEvidenceClosureSignoffPackRecord {
  id: number;
  evidenceGapClosureMatrixId: number;
  evidenceReviewPackId: number;
  queueItemId: number;
  validationResultId: number;
  artifactId: string | number;
  artifactHash: string | null;
  signoffPackStatus: OfflineArtifactValidationEvidenceClosureSignoffPackStatus;
  reviewerDecision: OfflineArtifactValidationEvidenceClosureSignoffDecision;
  reviewerDecisionReason: string;
  signoffReadinessPct: number;
  checklistPassCount: number;
  checklistWarningCount: number;
  checklistFailCount: number;
  evidenceConfidence: OfflineArtifactValidationEvidenceConfidence;
  recommendedSignoffAction: string;
  signoffPackSnapshot: OfflineArtifactValidationEvidenceClosureSignoffPackSnapshot;
  signedEvidenceClosureReviewerSignoffPackHash: string;
  safety: OfflineArtifactValidationSafetyGate;
  createdAt: string;
  createdByUserId: string | number | null;
}

export interface OfflineArtifactValidationEvidenceClosureSignoffPackSummary {
  totalSignoffPacks: number;
  readyForHumanSignoffPacks: number;
  signedForFutureShadowOnlyPacks: number;
  needsMoreEvidencePacks: number;
  blockedByOpenGapPacks: number;
  rejectedForArtifactTrustPacks: number;
  averageSignoffReadinessPct: number;
  totalChecklistFailCount: number;
  latestSignoffPack: OfflineArtifactValidationEvidenceClosureSignoffPackRecord | null;
  recommendedNextAction: string;
  safety: OfflineArtifactValidationSafetyGate;
}

export interface OfflineArtifactValidationEvidenceClosureSignoffPackCreateInput {
  evidenceGapClosureMatrixId: string | number;
  reviewerDecision?: OfflineArtifactValidationEvidenceClosureSignoffDecision;
  reviewerDecisionReason?: string;
  createdByUserId?: string | number | null;
}
