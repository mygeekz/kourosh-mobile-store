// Phase 7K-Cleanup modular type surface. Behavior/type names preserved.
import type { OfflineModelArtifactSafetyGate } from "./artifactBaseTypes";
import type { OfflineArtifactAuditSnapshotGovernanceSignoffRecord } from "./artifactReviewTypes";

export type OfflineArtifactFinalizationChainAuditSnapshotDecision =
  | "needs_audit_snapshot_review"
  | "prepare_finalization_chain_audit_snapshot_readiness"
  | "reject_finalization_chain_audit_snapshot"
  | "archive_audit_snapshot_metadata_only";

export type OfflineArtifactFinalizationChainAuditSnapshotStatus =
  | "pending_audit_snapshot_review"
  | "prepared_finalization_chain_audit_snapshot"
  | "needs_audit_snapshot_review"
  | "rejected"
  | "archived";

export interface OfflineArtifactFinalizationChainAuditSnapshotRequest {
  finalizationId?: string | number;
  auditSnapshotDecision: OfflineArtifactFinalizationChainAuditSnapshotDecision;
  snapshotPurpose?: string | null;
  snapshotTimestamp?: string | null;
  auditReviewerNotes: string;
  rejectionReason?: string | null;
  auditReviewerDisplayName?: string | null;
  finalChainDigestJson?: Record<string, unknown>;
  reviewerTrailDigestJson?: Record<string, unknown>;
  immutableEvidenceSummaryJson?: Record<string, unknown>;
  evidenceIndexJson?: Record<string, unknown>;
  acknowledgedSafetyFlags?: Record<string, unknown>;
}

export interface NormalizedOfflineArtifactFinalizationChainAuditSnapshotInput {
  finalizationId: string | number;
  auditSnapshotDecision: OfflineArtifactFinalizationChainAuditSnapshotDecision;
  auditSnapshotStatus: OfflineArtifactFinalizationChainAuditSnapshotStatus;
  snapshotPurpose: string;
  snapshotTimestamp: string;
  auditReviewerNotes: string;
  rejectionReason: string | null;
  auditReviewerDisplayName: string | null;
  finalChainDigestJson: Record<string, unknown>;
  reviewerTrailDigestJson: Record<string, unknown>;
  immutableEvidenceSummaryJson: Record<string, unknown>;
  evidenceIndexJson: Record<string, unknown>;
  acknowledgedSafetyFlags: Record<string, unknown>;
  auditSnapshotEnvelopeSizeBytes: number;
}

export interface OfflineArtifactFinalizationChainAuditSnapshotValidationResult {
  valid: boolean;
  messages: string[];
  normalized: NormalizedOfflineArtifactFinalizationChainAuditSnapshotInput | null;
}

export interface OfflineArtifactFinalizationChainAuditSnapshotRecord {
  id: number;
  finalizationId: number;
  retentionGovernanceArchiveId: number;
  retentionGovernanceReviewId: number;
  retentionPolicyEvidenceId: number;
  archivePackId: number;
  signoffId: number;
  binderId: number;
  artifactId: number;
  artifactSha256: string;
  modelKey: string;
  modelVersion: string;
  signedFinalizationReadinessHash: string;
  auditSnapshotDecision: OfflineArtifactFinalizationChainAuditSnapshotDecision | string;
  auditSnapshotStatus: OfflineArtifactFinalizationChainAuditSnapshotStatus | string;
  snapshotPurpose: string;
  snapshotTimestamp: string;
  auditReviewerNotes: string;
  rejectionReason: string | null;
  finalChainDigestJson: Record<string, unknown>;
  reviewerTrailDigestJson: Record<string, unknown>;
  immutableEvidenceSummaryJson: Record<string, unknown>;
  evidenceIndexJson: Record<string, unknown>;
  safetyNotes: string[];
  signedAuditSnapshotHash: string;
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
  auditReviewerDisplayName: string | null;
  createdAt: string;
}

export interface OfflineArtifactFinalizationChainAuditSnapshotResult {
  accepted: boolean;
  finalizationId: string | number | null;
  auditSnapshotId: string | number | null;
  auditSnapshotDecision: OfflineArtifactFinalizationChainAuditSnapshotDecision | string;
  auditSnapshotStatus: OfflineArtifactFinalizationChainAuditSnapshotStatus | string;
  signedAuditSnapshotHash: string | null;
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

export interface OfflineArtifactFinalizationChainAuditSnapshotSummary {
  auditSnapshotRecords: number;
  preparedAuditSnapshotRecords: number;
  pendingAuditSnapshotRecords: number;
  rejectedAuditSnapshotRecords: number;
  archivedAuditSnapshotRecords: number;
  signedAuditSnapshotRecords: number;
  latestAuditSnapshot: OfflineArtifactFinalizationChainAuditSnapshotRecord | null;
  auditSnapshotGovernanceSignoffRecords: number;
  acceptedAuditSnapshotGovernanceSignoffRecords: number;
  pendingAuditSnapshotGovernanceSignoffRecords: number;
  rejectedAuditSnapshotGovernanceSignoffRecords: number;
  signedAuditSnapshotGovernanceSignoffRecords: number;
  latestAuditSnapshotGovernanceSignoff: OfflineArtifactAuditSnapshotGovernanceSignoffRecord | null;
  safetyStatus: OfflineModelArtifactSafetyGate;
  finalizationChainAuditSnapshotMode: "metadata_finalization_chain_audit_snapshot_readiness_only";
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

export type OfflineArtifactAuditSnapshotGovernanceArchiveDecision =
  | "needs_audit_governance_archive_review"
  | "prepare_audit_governance_archive_readiness"
  | "reject_audit_governance_archive"
  | "archive_audit_governance_metadata_only";

export type OfflineArtifactAuditSnapshotGovernanceArchiveStatus =
  | "pending_audit_governance_archive_review"
  | "prepared_audit_governance_archive"
  | "needs_audit_governance_archive_review"
  | "rejected"
  | "archived";

export interface OfflineArtifactAuditSnapshotGovernanceArchiveRequest {
  auditSnapshotGovernanceSignoffId?: string | number;
  archiveDecision: OfflineArtifactAuditSnapshotGovernanceArchiveDecision;
  archivePurpose?: string | null;
  archivistNotes: string;
  rejectionReason?: string | null;
  archivistDisplayName?: string | null;
  governanceArchiveManifestJson?: Record<string, unknown>;
  signerTrailJson?: Record<string, unknown>;
  exceptionSummaryJson?: Record<string, unknown>;
  evidenceConfidenceDigestJson?: Record<string, unknown>;
  acknowledgedSafetyFlags?: Record<string, unknown>;
}

export interface NormalizedOfflineArtifactAuditSnapshotGovernanceArchiveInput {
  auditSnapshotGovernanceSignoffId: string | number;
  archiveDecision: OfflineArtifactAuditSnapshotGovernanceArchiveDecision;
  archiveStatus: OfflineArtifactAuditSnapshotGovernanceArchiveStatus;
  archivePurpose: string;
  archivistNotes: string;
  rejectionReason: string | null;
  archivistDisplayName: string | null;
  governanceArchiveManifestJson: Record<string, unknown>;
  signerTrailJson: Record<string, unknown>;
  exceptionSummaryJson: Record<string, unknown>;
  evidenceConfidenceDigestJson: Record<string, unknown>;
  acknowledgedSafetyFlags: Record<string, unknown>;
  governanceArchiveEnvelopeSizeBytes: number;
}

export interface OfflineArtifactAuditSnapshotGovernanceArchiveValidationResult {
  valid: boolean;
  messages: string[];
  normalized: NormalizedOfflineArtifactAuditSnapshotGovernanceArchiveInput | null;
}

export interface OfflineArtifactAuditSnapshotGovernanceArchiveRecord {
  id: number;
  auditSnapshotGovernanceSignoffId: number;
  auditSnapshotId: number;
  finalizationId: number;
  retentionGovernanceArchiveId: number;
  retentionGovernanceReviewId: number;
  retentionPolicyEvidenceId: number;
  archivePackId: number;
  signoffId: number;
  binderId: number;
  artifactId: number;
  artifactSha256: string;
  modelKey: string;
  modelVersion: string;
  signedAuditSnapshotGovernanceHash: string;
  archiveDecision: OfflineArtifactAuditSnapshotGovernanceArchiveDecision | string;
  archiveStatus: OfflineArtifactAuditSnapshotGovernanceArchiveStatus | string;
  archivePurpose: string;
  archivistNotes: string;
  rejectionReason: string | null;
  governanceArchiveManifestJson: Record<string, unknown>;
  signerTrailJson: Record<string, unknown>;
  exceptionSummaryJson: Record<string, unknown>;
  evidenceConfidenceDigestJson: Record<string, unknown>;
  safetyNotes: string[];
  signedAuditGovernanceArchiveHash: string;
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

export interface OfflineArtifactAuditSnapshotGovernanceArchiveResult {
  accepted: boolean;
  auditSnapshotGovernanceSignoffId: string | number | null;
  auditSnapshotGovernanceArchiveId: string | number | null;
  archiveDecision: OfflineArtifactAuditSnapshotGovernanceArchiveDecision | string;
  archiveStatus: OfflineArtifactAuditSnapshotGovernanceArchiveStatus | string;
  signedAuditGovernanceArchiveHash: string | null;
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

export interface OfflineArtifactAuditSnapshotGovernanceArchiveSummary {
  auditSnapshotGovernanceArchiveRecords: number;
  preparedAuditSnapshotGovernanceArchiveRecords: number;
  pendingAuditSnapshotGovernanceArchiveRecords: number;
  rejectedAuditSnapshotGovernanceArchiveRecords: number;
  archivedAuditSnapshotGovernanceArchiveRecords: number;
  signedAuditSnapshotGovernanceArchiveRecords: number;
  latestAuditSnapshotGovernanceArchive: OfflineArtifactAuditSnapshotGovernanceArchiveRecord | null;
  safetyStatus: OfflineModelArtifactSafetyGate;
  auditSnapshotGovernanceArchiveMode: "metadata_audit_snapshot_governance_archive_readiness_only";
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
