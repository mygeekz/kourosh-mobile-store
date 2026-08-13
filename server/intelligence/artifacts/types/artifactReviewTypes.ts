// Phase 7K-Cleanup modular type surface. Behavior/type names preserved.
import type { OfflineArtifactGovernanceSignoffArchivePackRecord } from "./artifactArchiveTypes";
import type { OfflineArtifactFinalizationChainAuditSnapshotRecord } from "./artifactAuditSnapshotTypes";
import type { OfflineModelArtifactSafetyGate } from "./artifactBaseTypes";

export type OfflineArtifactReviewDecision =
  | "needs_more_evidence"
  | "approve_for_shadow_review_only"
  | "reject_quarantine_artifact"
  | "archive_without_activation";

export type OfflineArtifactReviewStatus =
  | "pending_review"
  | "needs_more_evidence"
  | "approved_for_shadow_review"
  | "rejected"
  | "archived";

export type OfflineArtifactReviewBinderGovernanceSignoffDecision =
  | "needs_governance_review"
  | "approve_binder_governance_readiness_only"
  | "reject_binder_governance_readiness"
  | "archive_binder_governance_signoff";

export type OfflineArtifactReviewBinderGovernanceSignoffStatus =
  | "pending_governance_review"
  | "needs_governance_review"
  | "approved_governance_readiness"
  | "rejected"
  | "archived";

export interface OfflineArtifactReviewBinderGovernanceSignoffRequest {
  binderId?: string | number;
  signoffDecision: OfflineArtifactReviewBinderGovernanceSignoffDecision;
  signerNotes: string;
  rejectionReason?: string | null;
  signerDisplayName?: string | null;
  governanceFindingsJson?: Record<string, unknown>;
  evidenceCompletenessJson?: Record<string, unknown>;
  riskAcceptanceJson?: Record<string, unknown>;
  acknowledgedSafetyFlags?: Record<string, unknown>;
}

export interface NormalizedOfflineArtifactReviewBinderGovernanceSignoffInput {
  binderId: string | number;
  signoffDecision: OfflineArtifactReviewBinderGovernanceSignoffDecision;
  signoffStatus: OfflineArtifactReviewBinderGovernanceSignoffStatus;
  signerNotes: string;
  rejectionReason: string | null;
  signerDisplayName: string | null;
  governanceFindingsJson: Record<string, unknown>;
  evidenceCompletenessJson: Record<string, unknown>;
  riskAcceptanceJson: Record<string, unknown>;
  acknowledgedSafetyFlags: Record<string, unknown>;
  signoffEnvelopeSizeBytes: number;
}

export interface OfflineArtifactReviewBinderGovernanceSignoffValidationResult {
  valid: boolean;
  messages: string[];
  normalized: NormalizedOfflineArtifactReviewBinderGovernanceSignoffInput | null;
}

export interface OfflineArtifactReviewBinderGovernanceSignoffRecord {
  id: number;
  binderId: number;
  artifactId: number;
  artifactSha256: string;
  modelKey: string;
  modelVersion: string;
  signedBinderHash: string;
  signoffDecision: OfflineArtifactReviewBinderGovernanceSignoffDecision | string;
  signoffStatus: OfflineArtifactReviewBinderGovernanceSignoffStatus | string;
  signerNotes: string;
  rejectionReason: string | null;
  governanceFindingsJson: Record<string, unknown>;
  evidenceCompletenessJson: Record<string, unknown>;
  riskAcceptanceJson: Record<string, unknown>;
  safetyNotes: string[];
  signedGovernanceHash: string;
  artifactExecutionAllowed: boolean;
  artifactAutoActivationAllowed: boolean;
  modelExecutionAllowed: boolean;
  inferenceEndpointExposed: boolean;
  productionIntegrationAllowed: boolean;
  canMutateBusinessRecords: boolean;
  exportFileCreated: boolean;
  artifactBytesIncluded: boolean;
  binderActivationAllowed: boolean;
  signerUserId: string | number | null;
  signerDisplayName: string | null;
  createdAt: string;
}

export interface OfflineArtifactReviewBinderGovernanceSignoffResult {
  accepted: boolean;
  binderId: string | number | null;
  signoffId: string | number | null;
  signoffDecision: OfflineArtifactReviewBinderGovernanceSignoffDecision | string;
  signoffStatus: OfflineArtifactReviewBinderGovernanceSignoffStatus | string;
  signedGovernanceHash: string | null;
  exportFileCreated: false;
  artifactBytesIncluded: false;
  binderActivationAllowed: false;
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

export interface OfflineArtifactReviewBinderGovernanceSignoffSummary {
  governanceSignoffRecords: number;
  pendingGovernanceSignoffRecords: number;
  approvedGovernanceSignoffRecords: number;
  rejectedGovernanceSignoffRecords: number;
  archivedGovernanceSignoffRecords: number;
  signedGovernanceSignoffRecords: number;
  latestGovernanceSignoff: OfflineArtifactReviewBinderGovernanceSignoffRecord | null;
  latestArchivePack: OfflineArtifactGovernanceSignoffArchivePackRecord | null;
  safetyStatus: OfflineModelArtifactSafetyGate;
  governanceSignoffMode: "metadata_signoff_only";
  exportFileCreated: false;
  artifactBytesIncluded: false;
  binderActivationAllowed: false;
  execution: "Off";
  autoActivation: "Off";
  productionInference: "Not exposed";
  productionIntegration: "Off";
  noBusinessMutation: true;
}

export type OfflineArtifactGovernanceArchiveChainFinalizationDecision =
  | "needs_finalization_review"
  | "prepare_governance_archive_chain_finalization_readiness"
  | "reject_governance_archive_chain_finalization"
  | "archive_chain_finalization_metadata_only";

export type OfflineArtifactGovernanceArchiveChainFinalizationStatus =
  | "pending_finalization_review"
  | "prepared_governance_archive_chain_finalization"
  | "needs_finalization_review"
  | "rejected"
  | "archived";

export interface OfflineArtifactGovernanceArchiveChainFinalizationRequest {
  retentionGovernanceArchiveId?: string | number;
  finalizationDecision: OfflineArtifactGovernanceArchiveChainFinalizationDecision;
  finalizationPurpose?: string | null;
  finalReviewerNotes: string;
  rejectionReason?: string | null;
  finalReviewerDisplayName?: string | null;
  chainCompletenessJson?: Record<string, unknown>;
  finalReviewerAcknowledgementJson?: Record<string, unknown>;
  immutableEvidenceSummaryJson?: Record<string, unknown>;
  evidenceIndexJson?: Record<string, unknown>;
  acknowledgedSafetyFlags?: Record<string, unknown>;
}

export interface NormalizedOfflineArtifactGovernanceArchiveChainFinalizationInput {
  retentionGovernanceArchiveId: string | number;
  finalizationDecision: OfflineArtifactGovernanceArchiveChainFinalizationDecision;
  finalizationStatus: OfflineArtifactGovernanceArchiveChainFinalizationStatus;
  finalizationPurpose: string;
  finalReviewerNotes: string;
  rejectionReason: string | null;
  finalReviewerDisplayName: string | null;
  chainCompletenessJson: Record<string, unknown>;
  finalReviewerAcknowledgementJson: Record<string, unknown>;
  immutableEvidenceSummaryJson: Record<string, unknown>;
  evidenceIndexJson: Record<string, unknown>;
  acknowledgedSafetyFlags: Record<string, unknown>;
  finalizationEnvelopeSizeBytes: number;
}

export interface OfflineArtifactGovernanceArchiveChainFinalizationRecord {
  id: number;
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
  signedArchiveReadinessHash: string;
  finalizationDecision: OfflineArtifactGovernanceArchiveChainFinalizationDecision | string;
  finalizationStatus: OfflineArtifactGovernanceArchiveChainFinalizationStatus | string;
  finalizationPurpose: string;
  finalReviewerNotes: string;
  rejectionReason: string | null;
  chainCompletenessJson: Record<string, unknown>;
  finalReviewerAcknowledgementJson: Record<string, unknown>;
  immutableEvidenceSummaryJson: Record<string, unknown>;
  evidenceIndexJson: Record<string, unknown>;
  safetyNotes: string[];
  signedFinalizationReadinessHash: string;
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
  finalReviewerDisplayName: string | null;
  createdAt: string;
}

export interface OfflineArtifactGovernanceArchiveChainFinalizationResult {
  accepted: boolean;
  retentionGovernanceArchiveId: string | number | null;
  finalizationId: string | number | null;
  finalizationDecision: OfflineArtifactGovernanceArchiveChainFinalizationDecision | string;
  finalizationStatus: OfflineArtifactGovernanceArchiveChainFinalizationStatus | string;
  signedFinalizationReadinessHash: string | null;
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

export interface OfflineArtifactGovernanceArchiveChainFinalizationSummary {
  finalizationRecords: number;
  preparedFinalizationRecords: number;
  pendingFinalizationRecords: number;
  rejectedFinalizationRecords: number;
  archivedFinalizationRecords: number;
  signedFinalizationReadinessRecords: number;
  latestFinalization: OfflineArtifactGovernanceArchiveChainFinalizationRecord | null;
  auditSnapshotRecords: number;
  preparedAuditSnapshotRecords: number;
  pendingAuditSnapshotRecords: number;
  rejectedAuditSnapshotRecords: number;
  signedAuditSnapshotRecords: number;
  latestAuditSnapshot: OfflineArtifactFinalizationChainAuditSnapshotRecord | null;
  safetyStatus: OfflineModelArtifactSafetyGate;
  governanceArchiveChainFinalizationMode: "metadata_governance_archive_chain_finalization_readiness_only";
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

export type OfflineArtifactAuditSnapshotGovernanceSignoffDecision =
  | "needs_audit_snapshot_governance_review"
  | "accept_audit_snapshot_metadata_only"
  | "reject_audit_snapshot_governance_signoff"
  | "archive_audit_snapshot_governance_metadata_only";

export type OfflineArtifactAuditSnapshotGovernanceSignoffStatus =
  | "pending_audit_snapshot_governance_review"
  | "accepted_audit_snapshot_governance_signoff"
  | "needs_audit_snapshot_governance_review"
  | "rejected"
  | "archived";

export interface OfflineArtifactAuditSnapshotGovernanceSignoffRequest {
  auditSnapshotId?: string | number;
  signoffDecision: OfflineArtifactAuditSnapshotGovernanceSignoffDecision;
  signoffPurpose?: string | null;
  auditReviewerSignoffNotes: string;
  exceptionNotes?: string | null;
  rejectionReason?: string | null;
  governanceSignerDisplayName?: string | null;
  snapshotAcceptanceJson?: Record<string, unknown>;
  evidenceConfidenceJson?: Record<string, unknown>;
  exceptionNotesJson?: Record<string, unknown>;
  acknowledgedSafetyFlags?: Record<string, unknown>;
}

export interface NormalizedOfflineArtifactAuditSnapshotGovernanceSignoffInput {
  auditSnapshotId: string | number;
  signoffDecision: OfflineArtifactAuditSnapshotGovernanceSignoffDecision;
  signoffStatus: OfflineArtifactAuditSnapshotGovernanceSignoffStatus;
  signoffPurpose: string;
  auditReviewerSignoffNotes: string;
  exceptionNotes: string | null;
  rejectionReason: string | null;
  governanceSignerDisplayName: string | null;
  snapshotAcceptanceJson: Record<string, unknown>;
  evidenceConfidenceJson: Record<string, unknown>;
  exceptionNotesJson: Record<string, unknown>;
  acknowledgedSafetyFlags: Record<string, unknown>;
  governanceSignoffEnvelopeSizeBytes: number;
}

export interface OfflineArtifactAuditSnapshotGovernanceSignoffValidationResult {
  valid: boolean;
  messages: string[];
  normalized: NormalizedOfflineArtifactAuditSnapshotGovernanceSignoffInput | null;
}

export interface OfflineArtifactAuditSnapshotGovernanceSignoffRecord {
  id: number;
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
  signedAuditSnapshotHash: string;
  signoffDecision: OfflineArtifactAuditSnapshotGovernanceSignoffDecision | string;
  signoffStatus: OfflineArtifactAuditSnapshotGovernanceSignoffStatus | string;
  signoffPurpose: string;
  auditReviewerSignoffNotes: string;
  exceptionNotes: string | null;
  rejectionReason: string | null;
  snapshotAcceptanceJson: Record<string, unknown>;
  evidenceConfidenceJson: Record<string, unknown>;
  exceptionNotesJson: Record<string, unknown>;
  safetyNotes: string[];
  signedAuditSnapshotGovernanceHash: string;
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
  governanceSignerDisplayName: string | null;
  createdAt: string;
}

export interface OfflineArtifactAuditSnapshotGovernanceSignoffResult {
  accepted: boolean;
  auditSnapshotId: string | number | null;
  auditSnapshotGovernanceSignoffId: string | number | null;
  signoffDecision: OfflineArtifactAuditSnapshotGovernanceSignoffDecision | string;
  signoffStatus: OfflineArtifactAuditSnapshotGovernanceSignoffStatus | string;
  signedAuditSnapshotGovernanceHash: string | null;
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

export interface OfflineArtifactAuditSnapshotGovernanceSignoffSummary {
  auditSnapshotGovernanceSignoffRecords: number;
  acceptedAuditSnapshotGovernanceSignoffRecords: number;
  pendingAuditSnapshotGovernanceSignoffRecords: number;
  rejectedAuditSnapshotGovernanceSignoffRecords: number;
  archivedAuditSnapshotGovernanceSignoffRecords: number;
  signedAuditSnapshotGovernanceSignoffRecords: number;
  latestAuditSnapshotGovernanceSignoff: OfflineArtifactAuditSnapshotGovernanceSignoffRecord | null;
  safetyStatus: OfflineModelArtifactSafetyGate;
  auditSnapshotGovernanceSignoffMode: "metadata_audit_snapshot_governance_signoff_readiness_only";
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
