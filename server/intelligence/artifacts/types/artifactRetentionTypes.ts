// Phase 7K-Cleanup modular type surface. Behavior/type names preserved.
import type { OfflineModelArtifactSafetyGate } from "./artifactBaseTypes";

export type OfflineArtifactArchivePackRetentionPolicyEvidenceDecision =
  | "needs_retention_policy_review"
  | "prepare_retention_policy_evidence_only"
  | "reject_retention_policy_evidence"
  | "archive_policy_evidence_without_job";

export type OfflineArtifactArchivePackRetentionPolicyEvidenceStatus =
  | "pending_retention_policy_review"
  | "prepared_retention_policy_evidence"
  | "needs_retention_policy_review"
  | "rejected"
  | "archived";

export interface OfflineArtifactArchivePackRetentionPolicyEvidenceRequest {
  archivePackId?: string | number;
  retentionDecision: OfflineArtifactArchivePackRetentionPolicyEvidenceDecision;
  retentionPolicyPurpose?: string | null;
  retentionWindowDays?: number | string | null;
  retainUntil?: string | null;
  legalHoldReason?: string | null;
  policyNotes: string;
  rejectionReason?: string | null;
  policyReviewerDisplayName?: string | null;
  retentionPolicyManifestJson?: Record<string, unknown>;
  holdEvidenceJson?: Record<string, unknown>;
  expiryMetadataJson?: Record<string, unknown>;
  purgeProhibitionEvidenceJson?: Record<string, unknown>;
  acknowledgedSafetyFlags?: Record<string, unknown>;
}

export interface NormalizedOfflineArtifactArchivePackRetentionPolicyEvidenceInput {
  archivePackId: string | number;
  retentionDecision: OfflineArtifactArchivePackRetentionPolicyEvidenceDecision;
  retentionStatus: OfflineArtifactArchivePackRetentionPolicyEvidenceStatus;
  retentionPolicyPurpose: string;
  retentionWindowDays: number | null;
  retainUntil: string | null;
  legalHoldReason: string | null;
  policyNotes: string;
  rejectionReason: string | null;
  policyReviewerDisplayName: string | null;
  retentionPolicyManifestJson: Record<string, unknown>;
  holdEvidenceJson: Record<string, unknown>;
  expiryMetadataJson: Record<string, unknown>;
  purgeProhibitionEvidenceJson: Record<string, unknown>;
  acknowledgedSafetyFlags: Record<string, unknown>;
  retentionPolicyEnvelopeSizeBytes: number;
}

export interface OfflineArtifactArchivePackRetentionPolicyEvidenceValidationResult {
  valid: boolean;
  messages: string[];
  normalized: NormalizedOfflineArtifactArchivePackRetentionPolicyEvidenceInput | null;
}

export interface OfflineArtifactArchivePackRetentionPolicyEvidenceRecord {
  id: number;
  archivePackId: number;
  signoffId: number;
  binderId: number;
  artifactId: number;
  artifactSha256: string;
  modelKey: string;
  modelVersion: string;
  signedArchivePackHash: string;
  retentionDecision: OfflineArtifactArchivePackRetentionPolicyEvidenceDecision | string;
  retentionStatus: OfflineArtifactArchivePackRetentionPolicyEvidenceStatus | string;
  retentionPolicyPurpose: string;
  retentionWindowDays: number | null;
  retainUntil: string | null;
  legalHoldReason: string | null;
  policyNotes: string;
  rejectionReason: string | null;
  retentionPolicyManifestJson: Record<string, unknown>;
  holdEvidenceJson: Record<string, unknown>;
  expiryMetadataJson: Record<string, unknown>;
  purgeProhibitionEvidenceJson: Record<string, unknown>;
  safetyNotes: string[];
  signedRetentionPolicyHash: string;
  retentionJobScheduled: boolean;
  deletionOrPurgeAllowed: boolean;
  archiveFileCreated: boolean;
  artifactBytesIncluded: boolean;
  artifactExecutionAllowed: boolean;
  artifactAutoActivationAllowed: boolean;
  modelExecutionAllowed: boolean;
  inferenceEndpointExposed: boolean;
  productionIntegrationAllowed: boolean;
  canMutateBusinessRecords: boolean;
  createdByUserId: string | number | null;
  policyReviewerDisplayName: string | null;
  createdAt: string;
}

export interface OfflineArtifactArchivePackRetentionPolicyEvidenceResult {
  accepted: boolean;
  archivePackId: string | number | null;
  retentionPolicyEvidenceId: string | number | null;
  retentionDecision: OfflineArtifactArchivePackRetentionPolicyEvidenceDecision | string;
  retentionStatus: OfflineArtifactArchivePackRetentionPolicyEvidenceStatus | string;
  signedRetentionPolicyHash: string | null;
  retentionJobScheduled: false;
  deletionOrPurgeAllowed: false;
  archiveFileCreated: false;
  artifactBytesIncluded: false;
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

export interface OfflineArtifactArchivePackRetentionPolicyEvidenceSummary {
  retentionPolicyEvidenceRecords: number;
  preparedRetentionPolicyEvidenceRecords: number;
  pendingRetentionPolicyEvidenceRecords: number;
  rejectedRetentionPolicyEvidenceRecords: number;
  archivedRetentionPolicyEvidenceRecords: number;
  signedRetentionPolicyEvidenceRecords: number;
  latestRetentionPolicyEvidence: OfflineArtifactArchivePackRetentionPolicyEvidenceRecord | null;
  safetyStatus: OfflineModelArtifactSafetyGate;
  retentionPolicyEvidenceMode: "metadata_retention_policy_evidence_only";
  retentionJobScheduled: false;
  deletionOrPurgeAllowed: false;
  archiveFileCreated: false;
  artifactBytesIncluded: false;
  execution: "Off";
  autoActivation: "Off";
  productionInference: "Not exposed";
  productionIntegration: "Off";
  noBusinessMutation: true;
}

export type OfflineArtifactRetentionEvidenceGovernanceReviewDecision =
  | "needs_retention_governance_review"
  | "approve_retention_governance_evidence_only"
  | "reject_retention_governance_evidence"
  | "archive_retention_governance_without_job";

export type OfflineArtifactRetentionEvidenceGovernanceReviewStatus =
  | "pending_retention_governance_review"
  | "approved_retention_governance_evidence"
  | "needs_retention_governance_review"
  | "rejected"
  | "archived";

export interface OfflineArtifactRetentionEvidenceGovernanceReviewRequest {
  retentionPolicyEvidenceId?: string | number;
  governanceReviewDecision: OfflineArtifactRetentionEvidenceGovernanceReviewDecision;
  governanceReviewPurpose?: string | null;
  reviewerNotes: string;
  rejectionReason?: string | null;
  governanceReviewerDisplayName?: string | null;
  riskConfirmationJson?: Record<string, unknown>;
  holdConfirmationJson?: Record<string, unknown>;
  purgeProhibitionReviewJson?: Record<string, unknown>;
  evidenceCompletenessJson?: Record<string, unknown>;
  acknowledgedSafetyFlags?: Record<string, unknown>;
}

export interface NormalizedOfflineArtifactRetentionEvidenceGovernanceReviewInput {
  retentionPolicyEvidenceId: string | number;
  governanceReviewDecision: OfflineArtifactRetentionEvidenceGovernanceReviewDecision;
  governanceReviewStatus: OfflineArtifactRetentionEvidenceGovernanceReviewStatus;
  governanceReviewPurpose: string;
  reviewerNotes: string;
  rejectionReason: string | null;
  governanceReviewerDisplayName: string | null;
  riskConfirmationJson: Record<string, unknown>;
  holdConfirmationJson: Record<string, unknown>;
  purgeProhibitionReviewJson: Record<string, unknown>;
  evidenceCompletenessJson: Record<string, unknown>;
  acknowledgedSafetyFlags: Record<string, unknown>;
  governanceReviewEnvelopeSizeBytes: number;
}

export interface OfflineArtifactRetentionEvidenceGovernanceReviewValidationResult {
  valid: boolean;
  messages: string[];
  normalized: NormalizedOfflineArtifactRetentionEvidenceGovernanceReviewInput | null;
}

export interface OfflineArtifactRetentionEvidenceGovernanceReviewRecord {
  id: number;
  retentionPolicyEvidenceId: number;
  archivePackId: number;
  signoffId: number;
  binderId: number;
  artifactId: number;
  artifactSha256: string;
  modelKey: string;
  modelVersion: string;
  signedRetentionPolicyHash: string;
  governanceReviewDecision: OfflineArtifactRetentionEvidenceGovernanceReviewDecision | string;
  governanceReviewStatus: OfflineArtifactRetentionEvidenceGovernanceReviewStatus | string;
  governanceReviewPurpose: string;
  reviewerNotes: string;
  rejectionReason: string | null;
  riskConfirmationJson: Record<string, unknown>;
  holdConfirmationJson: Record<string, unknown>;
  purgeProhibitionReviewJson: Record<string, unknown>;
  evidenceCompletenessJson: Record<string, unknown>;
  safetyNotes: string[];
  signedRetentionGovernanceHash: string;
  retentionJobScheduled: boolean;
  deletionOrPurgeAllowed: boolean;
  archiveFileCreated: boolean;
  artifactBytesIncluded: boolean;
  artifactExecutionAllowed: boolean;
  artifactAutoActivationAllowed: boolean;
  modelExecutionAllowed: boolean;
  inferenceEndpointExposed: boolean;
  productionIntegrationAllowed: boolean;
  canMutateBusinessRecords: boolean;
  createdByUserId: string | number | null;
  governanceReviewerDisplayName: string | null;
  createdAt: string;
}

export interface OfflineArtifactRetentionEvidenceGovernanceReviewResult {
  accepted: boolean;
  retentionPolicyEvidenceId: string | number | null;
  retentionGovernanceReviewId: string | number | null;
  governanceReviewDecision: OfflineArtifactRetentionEvidenceGovernanceReviewDecision | string;
  governanceReviewStatus: OfflineArtifactRetentionEvidenceGovernanceReviewStatus | string;
  signedRetentionGovernanceHash: string | null;
  retentionJobScheduled: false;
  deletionOrPurgeAllowed: false;
  archiveFileCreated: false;
  artifactBytesIncluded: false;
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

export interface OfflineArtifactRetentionEvidenceGovernanceReviewSummary {
  retentionGovernanceReviewRecords: number;
  approvedRetentionGovernanceReviewRecords: number;
  pendingRetentionGovernanceReviewRecords: number;
  rejectedRetentionGovernanceReviewRecords: number;
  archivedRetentionGovernanceReviewRecords: number;
  signedRetentionGovernanceReviewRecords: number;
  latestRetentionGovernanceReview: OfflineArtifactRetentionEvidenceGovernanceReviewRecord | null;
  retentionGovernanceArchiveRecords: number;
  preparedRetentionGovernanceArchiveRecords: number;
  pendingRetentionGovernanceArchiveRecords: number;
  rejectedRetentionGovernanceArchiveRecords: number;
  signedRetentionGovernanceArchiveRecords: number;
  latestRetentionGovernanceArchive: OfflineArtifactRetentionGovernanceReviewArchiveRecord | null;
  safetyStatus: OfflineModelArtifactSafetyGate;
  retentionEvidenceGovernanceReviewMode: "metadata_retention_governance_review_only";
  retentionJobScheduled: false;
  deletionOrPurgeAllowed: false;
  archiveFileCreated: false;
  artifactBytesIncluded: false;
  execution: "Off";
  autoActivation: "Off";
  productionInference: "Not exposed";
  productionIntegration: "Off";
  noBusinessMutation: true;
}

export type OfflineArtifactRetentionGovernanceReviewArchiveDecision =
  | "needs_retention_archive_review"
  | "prepare_retention_governance_archive_readiness"
  | "reject_retention_governance_archive"
  | "archive_retention_governance_metadata_only";

export type OfflineArtifactRetentionGovernanceReviewArchiveStatus =
  | "pending_retention_archive_review"
  | "prepared_retention_governance_archive"
  | "needs_retention_archive_review"
  | "rejected"
  | "archived";

export interface OfflineArtifactRetentionGovernanceReviewArchiveRequest {
  retentionGovernanceReviewId?: string | number;
  archiveDecision: OfflineArtifactRetentionGovernanceReviewArchiveDecision;
  archivePurpose?: string | null;
  archivistNotes: string;
  rejectionReason?: string | null;
  archivistDisplayName?: string | null;
  archiveManifestJson?: Record<string, unknown>;
  reviewerTrailJson?: Record<string, unknown>;
  retentionGovernanceChainJson?: Record<string, unknown>;
  evidenceIndexJson?: Record<string, unknown>;
  acknowledgedSafetyFlags?: Record<string, unknown>;
}

export interface NormalizedOfflineArtifactRetentionGovernanceReviewArchiveInput {
  retentionGovernanceReviewId: string | number;
  archiveDecision: OfflineArtifactRetentionGovernanceReviewArchiveDecision;
  archiveStatus: OfflineArtifactRetentionGovernanceReviewArchiveStatus;
  archivePurpose: string;
  archivistNotes: string;
  rejectionReason: string | null;
  archivistDisplayName: string | null;
  archiveManifestJson: Record<string, unknown>;
  reviewerTrailJson: Record<string, unknown>;
  retentionGovernanceChainJson: Record<string, unknown>;
  evidenceIndexJson: Record<string, unknown>;
  acknowledgedSafetyFlags: Record<string, unknown>;
  archiveReadinessEnvelopeSizeBytes: number;
}

export interface OfflineArtifactRetentionGovernanceReviewArchiveValidationResult {
  valid: boolean;
  messages: string[];
  normalized: NormalizedOfflineArtifactRetentionGovernanceReviewArchiveInput | null;
}

export interface OfflineArtifactRetentionGovernanceReviewArchiveRecord {
  id: number;
  retentionGovernanceReviewId: number;
  retentionPolicyEvidenceId: number;
  archivePackId: number;
  signoffId: number;
  binderId: number;
  artifactId: number;
  artifactSha256: string;
  modelKey: string;
  modelVersion: string;
  signedRetentionGovernanceHash: string;
  archiveDecision: OfflineArtifactRetentionGovernanceReviewArchiveDecision | string;
  archiveStatus: OfflineArtifactRetentionGovernanceReviewArchiveStatus | string;
  archivePurpose: string;
  archivistNotes: string;
  rejectionReason: string | null;
  archiveManifestJson: Record<string, unknown>;
  reviewerTrailJson: Record<string, unknown>;
  retentionGovernanceChainJson: Record<string, unknown>;
  evidenceIndexJson: Record<string, unknown>;
  safetyNotes: string[];
  signedArchiveReadinessHash: string;
  retentionJobScheduled: boolean;
  deletionOrPurgeAllowed: boolean;
  archiveFileCreated: boolean;
  artifactBytesIncluded: boolean;
  artifactExecutionAllowed: boolean;
  artifactAutoActivationAllowed: boolean;
  modelExecutionAllowed: boolean;
  inferenceEndpointExposed: boolean;
  productionIntegrationAllowed: boolean;
  canMutateBusinessRecords: boolean;
  createdByUserId: string | number | null;
  archivistDisplayName: string | null;
  createdAt: string;
}

export interface OfflineArtifactRetentionGovernanceReviewArchiveResult {
  accepted: boolean;
  retentionGovernanceReviewId: string | number | null;
  retentionGovernanceArchiveId: string | number | null;
  archiveDecision: OfflineArtifactRetentionGovernanceReviewArchiveDecision | string;
  archiveStatus: OfflineArtifactRetentionGovernanceReviewArchiveStatus | string;
  signedArchiveReadinessHash: string | null;
  retentionJobScheduled: false;
  deletionOrPurgeAllowed: false;
  archiveFileCreated: false;
  artifactBytesIncluded: false;
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

export interface OfflineArtifactRetentionGovernanceReviewArchiveSummary {
  retentionGovernanceArchiveRecords: number;
  preparedRetentionGovernanceArchiveRecords: number;
  pendingRetentionGovernanceArchiveRecords: number;
  rejectedRetentionGovernanceArchiveRecords: number;
  archivedRetentionGovernanceArchiveRecords: number;
  signedRetentionGovernanceArchiveRecords: number;
  latestRetentionGovernanceArchive: OfflineArtifactRetentionGovernanceReviewArchiveRecord | null;
  safetyStatus: OfflineModelArtifactSafetyGate;
  retentionGovernanceReviewArchiveMode: "metadata_retention_governance_archive_readiness_only";
  retentionJobScheduled: false;
  deletionOrPurgeAllowed: false;
  archiveFileCreated: false;
  artifactBytesIncluded: false;
  execution: "Off";
  autoActivation: "Off";
  productionInference: "Not exposed";
  productionIntegration: "Off";
  noBusinessMutation: true;
}
