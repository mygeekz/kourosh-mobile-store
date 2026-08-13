import type { OfflineArtifactValidationSafetyGate } from "../validation/offlineArtifactValidationTypes";
import type { OfflineArtifactValidationEvidenceConfidence, OfflineArtifactValidationEvidenceReviewPackRecord } from "./offlineArtifactValidationEvidenceReviewPackTypes";
import type { OfflineArtifactValidationReviewPriority } from "./offlineArtifactValidationReviewQueueTypes";

export type OfflineArtifactValidationEvidenceGapClosureMatrixStatus =
  | "no_gaps_detected"
  | "closure_ready"
  | "partial_closure"
  | "needs_more_evidence"
  | "critical_gap_open";

export type OfflineArtifactValidationEvidenceGapClosureState =
  | "closed_by_evidence"
  | "partially_closed"
  | "open"
  | "blocked";

export interface OfflineArtifactValidationEvidenceGapClosureMatrixRow {
  gapKey: string;
  gapDescription: string;
  source: "validation_finding" | "evidence_review_pack" | "review_queue" | "assignment_event" | "derived";
  priority: OfflineArtifactValidationReviewPriority;
  closureState: OfflineArtifactValidationEvidenceGapClosureState;
  evidenceConfidence: OfflineArtifactValidationEvidenceConfidence;
  evidenceReferences: string[];
  requiredAction: string;
  advisoryOnly: true;
  executionAllowed: false;
  activationAllowed: false;
  inferenceAllowed: false;
  businessMutationAllowed: false;
}

export interface OfflineArtifactValidationEvidenceGapClosureMatrixSnapshot {
  phase: "Phase 7E — Offline Artifact Evidence Gap Closure Matrix";
  evidenceReviewPack: OfflineArtifactValidationEvidenceReviewPackRecord;
  matrixRows: OfflineArtifactValidationEvidenceGapClosureMatrixRow[];
  openGapKeys: string[];
  closedGapKeys: string[];
  blockedGapKeys: string[];
  advisoryOnly: true;
  executionAllowed: false;
  activationAllowed: false;
  inferenceAllowed: false;
  businessMutationAllowed: false;
  artifactBytesIncluded: false;
  modelOutputIncluded: false;
  automaticApprovalAllowed: false;
}

export interface OfflineArtifactValidationEvidenceGapClosureMatrixRecord {
  id: number;
  evidenceReviewPackId: number;
  queueItemId: number;
  validationResultId: number;
  artifactId: string | number;
  artifactHash: string | null;
  matrixStatus: OfflineArtifactValidationEvidenceGapClosureMatrixStatus;
  closureReadinessPct: number;
  totalGapCount: number;
  openGapCount: number;
  closedGapCount: number;
  blockedGapCount: number;
  criticalOpenGapCount: number;
  highOpenGapCount: number;
  evidenceConfidence: OfflineArtifactValidationEvidenceConfidence;
  recommendedClosureAction: string;
  matrixSnapshot: OfflineArtifactValidationEvidenceGapClosureMatrixSnapshot;
  signedEvidenceGapClosureMatrixHash: string;
  safety: OfflineArtifactValidationSafetyGate;
  createdAt: string;
  createdByUserId: string | number | null;
}

export interface OfflineArtifactValidationEvidenceGapClosureMatrixSummary {
  totalMatrices: number;
  noGapsDetectedMatrices: number;
  closureReadyMatrices: number;
  partialClosureMatrices: number;
  needsMoreEvidenceMatrices: number;
  criticalGapOpenMatrices: number;
  totalOpenGapCount: number;
  totalCriticalOpenGapCount: number;
  totalHighOpenGapCount: number;
  averageClosureReadinessPct: number;
  latestMatrix: OfflineArtifactValidationEvidenceGapClosureMatrixRecord | null;
  recommendedNextAction: string;
  safety: OfflineArtifactValidationSafetyGate;
}

export interface OfflineArtifactValidationEvidenceGapClosureMatrixCreateInput {
  evidenceReviewPackId: string | number;
  createdByUserId?: string | number | null;
}
