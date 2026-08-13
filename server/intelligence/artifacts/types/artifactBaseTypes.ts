// Phase 7K-Cleanup modular type surface. Behavior/type names preserved.
import type { OfflineArtifactGovernanceSignoffArchivePackRecord } from "./artifactArchiveTypes";
import type { OfflineArtifactAuditSnapshotGovernanceArchiveRecord, OfflineArtifactFinalizationChainAuditSnapshotRecord } from "./artifactAuditSnapshotTypes";
import type { OfflineArtifactReviewBinderRecord } from "./artifactBinderTypes";
import type { OfflineArtifactQuarantineReviewRecord } from "./artifactQuarantineTypes";
import type { OfflineArtifactArchivePackRetentionPolicyEvidenceRecord, OfflineArtifactRetentionEvidenceGovernanceReviewRecord, OfflineArtifactRetentionGovernanceReviewArchiveRecord } from "./artifactRetentionTypes";
import type { OfflineArtifactAuditSnapshotGovernanceSignoffRecord, OfflineArtifactGovernanceArchiveChainFinalizationRecord, OfflineArtifactReviewBinderGovernanceSignoffRecord } from "./artifactReviewTypes";

export type ArtifactIntakeStatus =
  | "received"
  | "validated"
  | "quarantined"
  | "rejected"
  | "needs_review"
  | "approved_for_shadow_review"
  | "archived";

export type ArtifactExecutionStatus =
  | "not_allowed"
  | "not_loaded"
  | "not_executed";

export type OfflineModelArtifactKind =
  | "json_model_result_bundle"
  | "csv_score_bundle"
  | "training_package_result"
  | "external_model_metadata_bundle"
  | "serialized_model_artifact_pending_review";

export type ArtifactQuarantineStatus =
  | "quarantine_required"
  | "quarantined"
  | "rejected"
  | "duplicate_detected"
  | "released_for_shadow_review"
  | "archived";

export interface OfflineModelArtifactIntakeRequest {
  artifactName: string;
  artifactKind: string;
  modelKey: string;
  modelVersion: string;
  source: string;
  declaredFormat: string;
  declaredPurpose: string;
  relatedModelImportId?: string | number | null;
  notes?: string | null;
  metadataJson?: Record<string, unknown>;
  artifactPayloadJson?: Record<string, unknown> | null;
}

export interface NormalizedArtifactIntakeInput {
  artifactName: string;
  artifactKind: OfflineModelArtifactKind;
  modelKey: string;
  modelVersion: string;
  source: string;
  declaredFormat: string;
  declaredPurpose: string;
  relatedModelImportId: string | number | null;
  notes: string | null;
  metadataJson: Record<string, unknown>;
  artifactPayloadJson: Record<string, unknown> | null;
  sizeBytes: number;
}

export interface ArtifactIntakeValidationResult {
  valid: boolean;
  messages: string[];
  normalized: NormalizedArtifactIntakeInput | null;
}

export interface OfflineModelArtifactSafetyGate {
  artifactExecutionAllowed: false;
  artifactAutoActivationAllowed: false;
  artifactQuarantineRequired: true;
  runtimeInvocationAllowed: false;
  modelExecutionAllowed: false;
  inferenceEndpointExposed: false;
  productionIntegrationAllowed: false;
  decisionAutomationAllowed: false;
  canChangeInventoryOrAccounting: false;
  canChangePricing: false;
  canChangeReports: false;
  canChangeLedger: false;
  canMutateBusinessRecords: false;
  quarantineReviewCanExecuteArtifact: false;
  quarantineReviewCanActivateArtifact: false;
  quarantineReviewCanReleaseToProduction: false;
  quarantineReviewCanMutateBusinessRecords: false;
  quarantineReviewRequiresHumanEvidence: true;
  quarantineReviewStatusMetadataOnly: true;
  binderReadinessCanExportArtifactBytes: false;
  binderReadinessCanExecuteArtifact: false;
  binderReadinessCanActivateArtifact: false;
  binderReadinessCanReleaseToProduction: false;
  binderReadinessCanMutateBusinessRecords: false;
  binderReadinessMetadataOnly: true;
  binderGovernanceSignoffCanExportFiles: false;
  binderGovernanceSignoffCanExecuteArtifact: false;
  binderGovernanceSignoffCanActivateArtifact: false;
  binderGovernanceSignoffCanReleaseToProduction: false;
  binderGovernanceSignoffCanMutateBusinessRecords: false;
  binderGovernanceSignoffMetadataOnly: true;
  binderGovernanceSignoffRequiresHumanApproval: true;
  archivePackReadinessCanCreateFiles: false;
  archivePackReadinessCanIncludeArtifactBytes: false;
  archivePackReadinessCanExecuteArtifact: false;
  archivePackReadinessCanActivateArtifact: false;
  archivePackReadinessCanReleaseToProduction: false;
  archivePackReadinessCanMutateBusinessRecords: false;
  archivePackReadinessCanScheduleRetentionJobs: false;
  archivePackReadinessCanDeleteOrPurge: false;
  archivePackReadinessMetadataOnly: true;
  archivePackReadinessRetentionReady: true;
  archivePackRetentionPolicyEvidenceCanScheduleRetentionJobs: false;
  archivePackRetentionPolicyEvidenceCanDeleteOrPurge: false;
  archivePackRetentionPolicyEvidenceCanCreateFiles: false;
  archivePackRetentionPolicyEvidenceCanIncludeArtifactBytes: false;
  archivePackRetentionPolicyEvidenceCanExecuteArtifact: false;
  archivePackRetentionPolicyEvidenceCanActivateArtifact: false;
  archivePackRetentionPolicyEvidenceCanReleaseToProduction: false;
  archivePackRetentionPolicyEvidenceCanMutateBusinessRecords: false;
  archivePackRetentionPolicyEvidenceMetadataOnly: true;
  archivePackRetentionPolicyEvidenceRequiresPurgeProhibition: true;
  retentionEvidenceGovernanceReviewCanScheduleRetentionJobs: false;
  retentionEvidenceGovernanceReviewCanDeleteOrPurge: false;
  retentionEvidenceGovernanceReviewCanCreateFiles: false;
  retentionEvidenceGovernanceReviewCanIncludeArtifactBytes: false;
  retentionEvidenceGovernanceReviewCanExecuteArtifact: false;
  retentionEvidenceGovernanceReviewCanActivateArtifact: false;
  retentionEvidenceGovernanceReviewCanReleaseToProduction: false;
  retentionEvidenceGovernanceReviewCanMutateBusinessRecords: false;
  retentionEvidenceGovernanceReviewMetadataOnly: true;
  retentionEvidenceGovernanceReviewRequiresHumanReview: true;
  retentionGovernanceReviewArchiveCanScheduleRetentionJobs: false;
  retentionGovernanceReviewArchiveCanDeleteOrPurge: false;
  retentionGovernanceReviewArchiveCanCreateFiles: false;
  retentionGovernanceReviewArchiveCanIncludeArtifactBytes: false;
  retentionGovernanceReviewArchiveCanExecuteArtifact: false;
  retentionGovernanceReviewArchiveCanActivateArtifact: false;
  retentionGovernanceReviewArchiveCanReleaseToProduction: false;
  retentionGovernanceReviewArchiveCanMutateBusinessRecords: false;
  retentionGovernanceReviewArchiveMetadataOnly: true;
  retentionGovernanceReviewArchiveRequiresChainEvidence: true;
  governanceArchiveChainFinalizationCanScheduleRetentionJobs: false;
  governanceArchiveChainFinalizationCanDeleteOrPurge: false;
  governanceArchiveChainFinalizationCanCreateFiles: false;
  governanceArchiveChainFinalizationCanIncludeArtifactBytes: false;
  governanceArchiveChainFinalizationCanExecuteArtifact: false;
  governanceArchiveChainFinalizationCanActivateArtifact: false;
  governanceArchiveChainFinalizationCanReleaseToProduction: false;
  governanceArchiveChainFinalizationCanMutateBusinessRecords: false;
  governanceArchiveChainFinalizationMetadataOnly: true;
  governanceArchiveChainFinalizationRequiresChainCompleteness: true;
  governanceArchiveChainFinalizationImmutableEvidenceSummaryOnly: true;
  finalizationChainAuditSnapshotCanScheduleRetentionJobs: false;
  finalizationChainAuditSnapshotCanDeleteOrPurge: false;
  finalizationChainAuditSnapshotCanCreateFiles: false;
  finalizationChainAuditSnapshotCanExportFiles: false;
  finalizationChainAuditSnapshotCanIncludeArtifactBytes: false;
  finalizationChainAuditSnapshotCanExecuteArtifact: false;
  finalizationChainAuditSnapshotCanActivateArtifact: false;
  finalizationChainAuditSnapshotCanReleaseToProduction: false;
  finalizationChainAuditSnapshotCanMutateBusinessRecords: false;
  finalizationChainAuditSnapshotMetadataOnly: true;
  finalizationChainAuditSnapshotRequiresFinalChainDigest: true;
  finalizationChainAuditSnapshotRequiresReviewerTrailDigest: true;
  finalizationChainAuditSnapshotDigestOnly: true;
  auditSnapshotGovernanceSignoffCanScheduleRetentionJobs: false;
  auditSnapshotGovernanceSignoffCanDeleteOrPurge: false;
  auditSnapshotGovernanceSignoffCanCreateFiles: false;
  auditSnapshotGovernanceSignoffCanExportFiles: false;
  auditSnapshotGovernanceSignoffCanIncludeArtifactBytes: false;
  auditSnapshotGovernanceSignoffCanExecuteArtifact: false;
  auditSnapshotGovernanceSignoffCanActivateArtifact: false;
  auditSnapshotGovernanceSignoffCanReleaseToProduction: false;
  auditSnapshotGovernanceSignoffCanMutateBusinessRecords: false;
  auditSnapshotGovernanceSignoffMetadataOnly: true;
  auditSnapshotGovernanceSignoffRequiresHumanSignoff: true;
  auditSnapshotGovernanceSignoffRequiresEvidenceConfidence: true;
  auditSnapshotGovernanceArchiveCanScheduleRetentionJobs: false;
  auditSnapshotGovernanceArchiveCanDeleteOrPurge: false;
  auditSnapshotGovernanceArchiveCanCreateFiles: false;
  auditSnapshotGovernanceArchiveCanExportFiles: false;
  auditSnapshotGovernanceArchiveCanIncludeArtifactBytes: false;
  auditSnapshotGovernanceArchiveCanExecuteArtifact: false;
  auditSnapshotGovernanceArchiveCanActivateArtifact: false;
  auditSnapshotGovernanceArchiveCanReleaseToProduction: false;
  auditSnapshotGovernanceArchiveCanMutateBusinessRecords: false;
  auditSnapshotGovernanceArchiveMetadataOnly: true;
  auditSnapshotGovernanceArchiveRequiresSignerTrail: true;
  auditSnapshotGovernanceArchiveRequiresEvidenceConfidenceDigest: true;
}

export interface OfflineModelArtifactIntakeResult {
  accepted: boolean;
  status: ArtifactIntakeStatus;
  artifactId: string | number | null;
  artifactName: string;
  artifactKind: string;
  modelKey: string;
  modelVersion: string;
  declaredFormat: string;
  sha256: string | null;
  sizeBytes: number | null;
  quarantineRequired: boolean;
  quarantined: boolean;
  artifactExecutionAllowed: false;
  artifactAutoActivationAllowed: false;
  modelExecutionAllowed: false;
  inferenceEndpointExposed: false;
  productionIntegrationAllowed: false;
  canMutateBusinessRecords: false;
  validationMessages: string[];
  safetyNotes: string[];
  duplicateOfArtifactId?: string | number | null;
  createdAt: string;
}

export interface OfflineArtifactRecord {
  id: number;
  artifactName: string;
  artifactKind: string;
  modelKey: string;
  modelVersion: string;
  source: string;
  declaredFormat: string;
  declaredPurpose: string;
  relatedModelImportId: string | number | null;
  sha256: string;
  sizeBytes: number;
  metadataJson: Record<string, unknown>;
  artifactPayloadJson: Record<string, unknown> | null;
  validationMessages: string[];
  safetyNotes: string[];
  intakeStatus: ArtifactIntakeStatus | string;
  quarantineStatus: ArtifactQuarantineStatus | string;
  artifactExecutionAllowed: boolean;
  artifactAutoActivationAllowed: boolean;
  modelExecutionAllowed: boolean;
  inferenceEndpointExposed: boolean;
  productionIntegrationAllowed: boolean;
  canMutateBusinessRecords: boolean;
  createdAt: string;
  createdByUserId: string | number | null;
  updatedAt: string;
}

export interface OfflineArtifactSummary {
  totalArtifacts: number;
  quarantinedArtifacts: number;
  rejectedArtifacts: number;
  needsReviewArtifacts: number;
  approvedForShadowReviewArtifacts: number;
  archivedArtifacts: number;
  duplicateHashCount: number;
  reviewRecords: number;
  pendingReviewRecords: number;
  approvedReviewRecords: number;
  rejectedReviewRecords: number;
  signedReviewEvidenceRecords: number;
  binderReadinessRecords: number;
  signedBinderManifestRecords: number;
  governanceSignoffRecords: number;
  pendingGovernanceSignoffRecords: number;
  approvedGovernanceSignoffRecords: number;
  rejectedGovernanceSignoffRecords: number;
  signedGovernanceSignoffRecords: number;
  archivePackReadinessRecords: number;
  signedArchivePackManifestRecords: number;
  pendingArchivePackRecords: number;
  rejectedArchivePackRecords: number;
  latestArtifact: OfflineArtifactRecord | null;
  latestReview: OfflineArtifactQuarantineReviewRecord | null;
  latestBinder: OfflineArtifactReviewBinderRecord | null;
  latestGovernanceSignoff: OfflineArtifactReviewBinderGovernanceSignoffRecord | null;
  retentionPolicyEvidenceRecords: number;
  preparedRetentionPolicyEvidenceRecords: number;
  pendingRetentionPolicyEvidenceRecords: number;
  rejectedRetentionPolicyEvidenceRecords: number;
  signedRetentionPolicyEvidenceRecords: number;
  latestArchivePack: OfflineArtifactGovernanceSignoffArchivePackRecord | null;
  latestRetentionPolicyEvidence: OfflineArtifactArchivePackRetentionPolicyEvidenceRecord | null;
  retentionGovernanceReviewRecords: number;
  approvedRetentionGovernanceReviewRecords: number;
  pendingRetentionGovernanceReviewRecords: number;
  rejectedRetentionGovernanceReviewRecords: number;
  signedRetentionGovernanceReviewRecords: number;
  latestRetentionGovernanceReview: OfflineArtifactRetentionEvidenceGovernanceReviewRecord | null;
  retentionGovernanceArchiveRecords: number;
  preparedRetentionGovernanceArchiveRecords: number;
  pendingRetentionGovernanceArchiveRecords: number;
  rejectedRetentionGovernanceArchiveRecords: number;
  signedRetentionGovernanceArchiveRecords: number;
  latestRetentionGovernanceArchive: OfflineArtifactRetentionGovernanceReviewArchiveRecord | null;
  finalizationRecords: number;
  preparedFinalizationRecords: number;
  pendingFinalizationRecords: number;
  rejectedFinalizationRecords: number;
  signedFinalizationReadinessRecords: number;
  latestFinalization: OfflineArtifactGovernanceArchiveChainFinalizationRecord | null;
  auditSnapshotRecords: number;
  preparedAuditSnapshotRecords: number;
  pendingAuditSnapshotRecords: number;
  rejectedAuditSnapshotRecords: number;
  signedAuditSnapshotRecords: number;
  latestAuditSnapshot: OfflineArtifactFinalizationChainAuditSnapshotRecord | null;
  auditSnapshotGovernanceSignoffRecords: number;
  acceptedAuditSnapshotGovernanceSignoffRecords: number;
  pendingAuditSnapshotGovernanceSignoffRecords: number;
  rejectedAuditSnapshotGovernanceSignoffRecords: number;
  signedAuditSnapshotGovernanceSignoffRecords: number;
  latestAuditSnapshotGovernanceSignoff: OfflineArtifactAuditSnapshotGovernanceSignoffRecord | null;
  auditSnapshotGovernanceArchiveRecords: number;
  preparedAuditSnapshotGovernanceArchiveRecords: number;
  pendingAuditSnapshotGovernanceArchiveRecords: number;
  rejectedAuditSnapshotGovernanceArchiveRecords: number;
  signedAuditSnapshotGovernanceArchiveRecords: number;
  latestAuditSnapshotGovernanceArchive: OfflineArtifactAuditSnapshotGovernanceArchiveRecord | null;
  safetyStatus: OfflineModelArtifactSafetyGate;
  execution: "Off";
  autoActivation: "Off";
  productionInference: "Not exposed";
  artifactIntakeMode: "offline_quarantine_only";
  noBusinessMutation: true;
}
