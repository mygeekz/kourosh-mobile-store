import type { OfflineArtifactValidationSafetyGate } from "../validation/offlineArtifactValidationTypes";
import type { OfflineArtifactValidationReviewQueueRecord } from "./offlineArtifactValidationReviewQueueTypes";
import type { OfflineArtifactValidationReviewerAssignmentEventRecord } from "./offlineArtifactValidationReviewerAssignmentUxTypes";

export type OfflineArtifactValidationEvidenceReviewPackStatus =
  | "ready_for_review"
  | "needs_more_evidence"
  | "critical_review_required"
  | "closed_shadow_only"
  | "quarantine_or_reject_recommended";

export type OfflineArtifactValidationEvidenceConfidence = "low" | "medium" | "high";

export interface OfflineArtifactValidationEvidenceReviewPackSnapshot {
  phase: "Phase 7D — Offline Artifact Validation Evidence Note Review Pack";
  queueItem: OfflineArtifactValidationReviewQueueRecord;
  assignmentEvents: OfflineArtifactValidationReviewerAssignmentEventRecord[];
  evidenceNotes: OfflineArtifactValidationReviewerAssignmentEventRecord[];
  reviewerNotes: string[];
  evidenceReferences: string[];
  unresolvedEvidenceGaps: string[];
  advisoryOnly: true;
  executionAllowed: false;
  activationAllowed: false;
  inferenceAllowed: false;
  businessMutationAllowed: false;
  artifactBytesIncluded: false;
  modelOutputIncluded: false;
}

export interface OfflineArtifactValidationEvidenceReviewPackRecord {
  id: number;
  queueItemId: number;
  validationResultId: number;
  artifactId: string | number;
  artifactHash: string | null;
  packStatus: OfflineArtifactValidationEvidenceReviewPackStatus;
  evidenceConfidence: OfflineArtifactValidationEvidenceConfidence;
  evidenceNoteCount: number;
  assignmentEventCount: number;
  reviewerNoteCount: number;
  unresolvedEvidenceGapCount: number;
  recommendedReviewerAction: string;
  packSnapshot: OfflineArtifactValidationEvidenceReviewPackSnapshot;
  signedEvidenceReviewPackHash: string;
  safety: OfflineArtifactValidationSafetyGate;
  createdAt: string;
  createdByUserId: string | number | null;
}

export interface OfflineArtifactValidationEvidenceReviewPackSummary {
  totalPacks: number;
  readyForReviewPacks: number;
  needsMoreEvidencePacks: number;
  criticalReviewRequiredPacks: number;
  closedShadowOnlyPacks: number;
  quarantineOrRejectRecommendedPacks: number;
  lowConfidencePacks: number;
  mediumConfidencePacks: number;
  highConfidencePacks: number;
  unresolvedEvidenceGapCount: number;
  latestPack: OfflineArtifactValidationEvidenceReviewPackRecord | null;
  recommendedNextAction: string;
  safety: OfflineArtifactValidationSafetyGate;
}

export interface OfflineArtifactValidationEvidenceReviewPackCreateInput {
  queueItemId: string | number;
  createdByUserId?: string | number | null;
}
