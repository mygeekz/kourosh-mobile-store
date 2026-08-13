import type {
  OfflineArtifactDriftRisk,
  OfflineArtifactTrustLabel,
  OfflineArtifactValidationRecord,
  OfflineArtifactValidationSafetyGate,
  OfflineArtifactValidationStatus,
} from "../validation/offlineArtifactValidationTypes";

export type OfflineArtifactValidationReviewQueueStatus =
  | "open"
  | "assigned"
  | "evidence_requested"
  | "deferred"
  | "closed_shadow_only"
  | "quarantine_recommended"
  | "reject_recommended";

export type OfflineArtifactValidationReviewPriority = "low" | "medium" | "high" | "critical";

export type OfflineArtifactValidationReviewDecision =
  | "not_reviewed"
  | "assign_reviewer"
  | "request_more_evidence"
  | "close_for_future_shadow_only"
  | "recommend_quarantine"
  | "recommend_reject"
  | "defer";

export interface OfflineArtifactValidationReviewQueueSnapshot {
  phase: "Phase 7B — Offline Artifact Validation Review Queue";
  validationResultId: number;
  artifactId: string | number;
  artifactHash: string | null;
  validationStatus: OfflineArtifactValidationStatus;
  trustScore: number;
  trustLabel: OfflineArtifactTrustLabel;
  driftRisk: OfflineArtifactDriftRisk;
  criticalFindingCount: number;
  highFindingCount: number;
  missingEvidenceCount: number;
  finalReviewerDecision: OfflineArtifactValidationRecord["finalReviewSnapshot"]["finalReviewerDecision"];
  executionAllowed: false;
  activationAllowed: false;
  inferenceAllowed: false;
  businessMutationAllowed: false;
  sourceValidation: OfflineArtifactValidationRecord;
}

export interface OfflineArtifactValidationReviewQueueRecord {
  id: number;
  validationResultId: number;
  artifactId: string | number;
  artifactHash: string | null;
  validationStatus: OfflineArtifactValidationStatus;
  trustScore: number;
  trustLabel: OfflineArtifactTrustLabel;
  driftRisk: OfflineArtifactDriftRisk;
  reviewPriority: OfflineArtifactValidationReviewPriority;
  queueStatus: OfflineArtifactValidationReviewQueueStatus;
  criticalFindingCount: number;
  highFindingCount: number;
  missingEvidenceCount: number;
  assignedReviewerId: string | number | null;
  reviewerDecision: OfflineArtifactValidationReviewDecision;
  reviewerNotes: string[];
  reviewerEvidence: Record<string, unknown>;
  sourceValidationSnapshot: OfflineArtifactValidationReviewQueueSnapshot;
  finalReviewerDecision: OfflineArtifactValidationReviewQueueSnapshot["finalReviewerDecision"];
  safety: OfflineArtifactValidationSafetyGate;
  createdAt: string;
  updatedAt: string;
  createdByUserId: string | number | null;
  reviewedByUserId: string | number | null;
}

export interface OfflineArtifactValidationReviewQueueSummary {
  totalQueueItems: number;
  openItems: number;
  assignedItems: number;
  evidenceRequestedItems: number;
  deferredItems: number;
  closedShadowOnlyItems: number;
  quarantineRecommendedItems: number;
  rejectRecommendedItems: number;
  criticalPriorityItems: number;
  highPriorityItems: number;
  mediumPriorityItems: number;
  lowPriorityItems: number;
  pendingHumanReviewItems: number;
  latestQueueItem: OfflineArtifactValidationReviewQueueRecord | null;
  safety: OfflineArtifactValidationSafetyGate;
}

export interface OfflineArtifactValidationReviewDecisionInput {
  queueItemId: string | number;
  reviewerDecision: OfflineArtifactValidationReviewDecision;
  reviewerNotes?: string[] | string | null;
  reviewerEvidence?: Record<string, unknown> | null;
  assignedReviewerId?: string | number | null;
  reviewedByUserId?: string | number | null;
}
