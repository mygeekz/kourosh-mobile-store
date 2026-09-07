// Phase 7K-Cleanup modular type surface. Behavior/type names preserved.
import type { OfflineModelArtifactSafetyGate } from "./artifactBaseTypes";

export type OfflineArtifactReviewBinderStatus =
  | "prepared"
  | "needs_review"
  | "blocked"
  | "archived";

export interface OfflineArtifactReviewBinderRequest {
  artifactId?: string | number;
  binderPurpose?: string | null;
  reviewerNotes?: string | null;
  requestedSectionsJson?: Record<string, unknown>;
  traceabilityManifestJson?: Record<string, unknown>;
  evidenceIndexJson?: Record<string, unknown>;
  exportReadinessNotesJson?: Record<string, unknown>;
  acknowledgedSafetyFlags?: Record<string, unknown>;
}

export interface NormalizedOfflineArtifactReviewBinderInput {
  artifactId: string | number;
  binderPurpose: string;
  reviewerNotes: string | null;
  requestedSectionsJson: Record<string, unknown>;
  traceabilityManifestJson: Record<string, unknown>;
  evidenceIndexJson: Record<string, unknown>;
  exportReadinessNotesJson: Record<string, unknown>;
  acknowledgedSafetyFlags: Record<string, unknown>;
  binderEnvelopeSizeBytes: number;
}

export interface OfflineArtifactReviewBinderValidationResult {
  valid: boolean;
  messages: string[];
  normalized: NormalizedOfflineArtifactReviewBinderInput | null;
}

export interface OfflineArtifactReviewBinderRecord {
  id: number;
  artifactId: number;
  artifactSha256: string;
  modelKey: string;
  modelVersion: string;
  latestReviewId: number | null;
  latestReviewHash: string | null;
  binderStatus: OfflineArtifactReviewBinderStatus | string;
  binderPurpose: string;
  binderManifestJson: Record<string, unknown>;
  traceabilityManifestJson: Record<string, unknown>;
  evidenceIndexJson: Record<string, unknown>;
  exportReadinessNotesJson: Record<string, unknown>;
  safetyNotes: string[];
  signedBinderHash: string;
  artifactExecutionAllowed: boolean;
  artifactAutoActivationAllowed: boolean;
  modelExecutionAllowed: boolean;
  inferenceEndpointExposed: boolean;
  productionIntegrationAllowed: boolean;
  canMutateBusinessRecords: boolean;
  exportFileCreated: boolean;
  artifactBytesIncluded: boolean;
  createdByUserId: string | number | null;
  createdAt: string;
}

export interface OfflineArtifactReviewBinderResult {
  accepted: boolean;
  artifactId: string | number | null;
  binderId: string | number | null;
  binderStatus: OfflineArtifactReviewBinderStatus | string;
  signedBinderHash: string | null;
  exportFileCreated: false;
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

export interface OfflineArtifactReviewBinderSummary {
  binderReadinessRecords: number;
  preparedBinderRecords: number;
  blockedBinderRecords: number;
  archivedBinderRecords: number;
  signedBinderManifestRecords: number;
  latestBinder: OfflineArtifactReviewBinderRecord | null;
  safetyStatus: OfflineModelArtifactSafetyGate;
  binderExportMode: "metadata_manifest_only";
  exportFileCreated: false;
  artifactBytesIncluded: false;
  execution: "Off";
  autoActivation: "Off";
  productionInference: "Not exposed";
  productionIntegration: "Off";
  noBusinessMutation: true;
}
