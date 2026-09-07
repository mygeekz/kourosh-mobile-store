// Phase 7K-Cleanup modular type surface. Behavior/type names preserved.
import type { OfflineModelArtifactSafetyGate } from "./artifactBaseTypes";

export type OfflineArtifactGovernanceSignoffArchivePackDecision =
  | "needs_archive_pack_review"
  | "prepare_archive_pack_readiness_only"
  | "reject_archive_pack_readiness"
  | "archive_without_file_export";

export type OfflineArtifactGovernanceSignoffArchivePackStatus =
  | "pending_archive_pack_review"
  | "prepared_archive_pack_readiness"
  | "needs_archive_pack_review"
  | "rejected"
  | "archived";

export interface OfflineArtifactGovernanceSignoffArchivePackRequest {
  signoffId?: string | number;
  archivePackDecision: OfflineArtifactGovernanceSignoffArchivePackDecision;
  archivePackPurpose?: string | null;
  archivistNotes: string;
  rejectionReason?: string | null;
  archivistDisplayName?: string | null;
  archiveManifestJson?: Record<string, unknown>;
  retentionManifestJson?: Record<string, unknown>;
  evidenceIndexJson?: Record<string, unknown>;
  archiveReadinessNotesJson?: Record<string, unknown>;
  acknowledgedSafetyFlags?: Record<string, unknown>;
}

export interface NormalizedOfflineArtifactGovernanceSignoffArchivePackInput {
  signoffId: string | number;
  archivePackDecision: OfflineArtifactGovernanceSignoffArchivePackDecision;
  archivePackStatus: OfflineArtifactGovernanceSignoffArchivePackStatus;
  archivePackPurpose: string;
  archivistNotes: string;
  rejectionReason: string | null;
  archivistDisplayName: string | null;
  archiveManifestJson: Record<string, unknown>;
  retentionManifestJson: Record<string, unknown>;
  evidenceIndexJson: Record<string, unknown>;
  archiveReadinessNotesJson: Record<string, unknown>;
  acknowledgedSafetyFlags: Record<string, unknown>;
  archiveEnvelopeSizeBytes: number;
}

export interface OfflineArtifactGovernanceSignoffArchivePackValidationResult {
  valid: boolean;
  messages: string[];
  normalized: NormalizedOfflineArtifactGovernanceSignoffArchivePackInput | null;
}

export interface OfflineArtifactGovernanceSignoffArchivePackRecord {
  id: number;
  signoffId: number;
  binderId: number;
  artifactId: number;
  artifactSha256: string;
  modelKey: string;
  modelVersion: string;
  signedGovernanceHash: string;
  archivePackDecision: OfflineArtifactGovernanceSignoffArchivePackDecision | string;
  archivePackStatus: OfflineArtifactGovernanceSignoffArchivePackStatus | string;
  archivePackPurpose: string;
  archivistNotes: string;
  rejectionReason: string | null;
  archiveManifestJson: Record<string, unknown>;
  retentionManifestJson: Record<string, unknown>;
  evidenceIndexJson: Record<string, unknown>;
  archiveReadinessNotesJson: Record<string, unknown>;
  safetyNotes: string[];
  signedArchivePackHash: string;
  archiveFileCreated: boolean;
  artifactBytesIncluded: boolean;
  retentionJobScheduled: boolean;
  deletionOrPurgeAllowed: boolean;
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

export interface OfflineArtifactGovernanceSignoffArchivePackResult {
  accepted: boolean;
  signoffId: string | number | null;
  archivePackId: string | number | null;
  archivePackDecision: OfflineArtifactGovernanceSignoffArchivePackDecision | string;
  archivePackStatus: OfflineArtifactGovernanceSignoffArchivePackStatus | string;
  signedArchivePackHash: string | null;
  archiveFileCreated: false;
  artifactBytesIncluded: false;
  retentionJobScheduled: false;
  deletionOrPurgeAllowed: false;
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

export interface OfflineArtifactGovernanceSignoffArchivePackSummary {
  archivePackReadinessRecords: number;
  preparedArchivePackRecords: number;
  pendingArchivePackRecords: number;
  rejectedArchivePackRecords: number;
  archivedArchivePackRecords: number;
  signedArchivePackManifestRecords: number;
  latestArchivePack: OfflineArtifactGovernanceSignoffArchivePackRecord | null;
  safetyStatus: OfflineModelArtifactSafetyGate;
  archivePackMode: "metadata_archive_pack_readiness_only";
  archiveFileCreated: false;
  artifactBytesIncluded: false;
  retentionJobScheduled: false;
  deletionOrPurgeAllowed: false;
  execution: "Off";
  autoActivation: "Off";
  productionInference: "Not exposed";
  productionIntegration: "Off";
  noBusinessMutation: true;
}
