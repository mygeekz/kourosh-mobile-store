// Phase 7K-Cleanup modular type surface. Behavior/type names preserved.
import type { OfflineModelArtifactSafetyGate } from "./artifactBaseTypes";
import type { OfflineArtifactReviewDecision, OfflineArtifactReviewStatus } from "./artifactReviewTypes";

export interface OfflineArtifactQuarantineReviewRequest {
  artifactId?: string | number;
  reviewDecision: OfflineArtifactReviewDecision;
  reviewerNotes: string;
  rejectionReason?: string | null;
  reviewerDisplayName?: string | null;
  validationFindingsJson?: Record<string, unknown>;
  lineageComparisonJson?: Record<string, unknown>;
  evidenceJson?: Record<string, unknown>;
  acknowledgedSafetyFlags?: Record<string, unknown>;
}

export interface NormalizedOfflineArtifactQuarantineReviewInput {
  artifactId: string | number;
  reviewDecision: OfflineArtifactReviewDecision;
  reviewStatus: OfflineArtifactReviewStatus;
  reviewerNotes: string;
  rejectionReason: string | null;
  reviewerDisplayName: string | null;
  validationFindingsJson: Record<string, unknown>;
  lineageComparisonJson: Record<string, unknown>;
  evidenceJson: Record<string, unknown>;
  acknowledgedSafetyFlags: Record<string, unknown>;
  reviewEnvelopeSizeBytes: number;
}

export interface OfflineArtifactQuarantineReviewValidationResult {
  valid: boolean;
  messages: string[];
  normalized: NormalizedOfflineArtifactQuarantineReviewInput | null;
}

export interface OfflineArtifactQuarantineReviewRecord {
  id: number;
  artifactId: number;
  artifactSha256: string;
  modelKey: string;
  modelVersion: string;
  reviewDecision: OfflineArtifactReviewDecision | string;
  reviewStatus: OfflineArtifactReviewStatus | string;
  reviewerNotes: string;
  rejectionReason: string | null;
  validationFindingsJson: Record<string, unknown>;
  lineageComparisonJson: Record<string, unknown>;
  evidenceJson: Record<string, unknown>;
  safetyNotes: string[];
  signedReviewHash: string;
  artifactExecutionAllowed: boolean;
  artifactAutoActivationAllowed: boolean;
  modelExecutionAllowed: boolean;
  inferenceEndpointExposed: boolean;
  productionIntegrationAllowed: boolean;
  canMutateBusinessRecords: boolean;
  reviewerUserId: string | number | null;
  reviewerDisplayName: string | null;
  createdAt: string;
}

export interface OfflineArtifactQuarantineReviewResult {
  accepted: boolean;
  artifactId: string | number | null;
  reviewId: string | number | null;
  reviewDecision: OfflineArtifactReviewDecision | string;
  reviewStatus: OfflineArtifactReviewStatus | string;
  signedReviewHash: string | null;
  artifactExecutionAllowed: false;
  artifactAutoActivationAllowed: false;
  modelExecutionAllowed: false;
  inferenceEndpointExposed: false;
  productionIntegrationAllowed: false;
  canMutateBusinessRecords: false;
  validationMessages: string[];
  safetyNotes: string[];
  createdAt: string;
}

export interface OfflineArtifactQuarantineReviewSummary {
  reviewRecords: number;
  pendingReviewRecords: number;
  needsMoreEvidenceReviewRecords: number;
  approvedReviewRecords: number;
  rejectedReviewRecords: number;
  archivedReviewRecords: number;
  signedReviewEvidenceRecords: number;
  latestReview: OfflineArtifactQuarantineReviewRecord | null;
  safetyStatus: OfflineModelArtifactSafetyGate;
  reviewMode: "metadata_evidence_only";
  execution: "Off";
  autoActivation: "Off";
  productionInference: "Not exposed";
  productionIntegration: "Off";
  noBusinessMutation: true;
}
