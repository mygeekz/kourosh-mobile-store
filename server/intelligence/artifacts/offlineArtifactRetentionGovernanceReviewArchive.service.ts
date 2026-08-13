import {
  createOfflineArtifactRetentionGovernanceReviewArchiveRecord,
  getOfflineArtifactRetentionGovernanceReviewArchiveSummary,
  listOfflineArtifactRetentionGovernanceReviewArchives,
  listOfflineArtifactRetentionGovernanceReviewArchivesByArtifactId,
  listOfflineArtifactRetentionGovernanceReviewArchivesByRetentionGovernanceReviewId,
} from "../../db/domains/ml/mlOfflineArtifactRetentionGovernanceReviewArchives.db";
import { getOfflineArtifactRetentionEvidenceGovernanceReviewById } from "../../db/domains/ml/mlOfflineArtifactRetentionEvidenceGovernanceReviews.db";
import { computeArtifactEnvelopeSha256 } from "./artifactHashing";
import { buildOfflineArtifactSafetyNotes, getOfflineArtifactIntakeSafetyGate } from "./artifactSafety";
import { validateOfflineArtifactRetentionGovernanceReviewArchiveRequest } from "./artifactRetentionGovernanceReviewArchiveValidation";
import type {
  NormalizedOfflineArtifactRetentionGovernanceReviewArchiveInput,
  OfflineArtifactRetentionEvidenceGovernanceReviewRecord,
  OfflineArtifactRetentionGovernanceReviewArchiveRecord,
  OfflineArtifactRetentionGovernanceReviewArchiveResult,
  OfflineArtifactRetentionGovernanceReviewArchiveSummary,
} from "./artifactIntakeTypes";

const nowIso = (): string => new Date().toISOString();

const rejectedRetentionGovernanceArchiveResult = (
  retentionGovernanceReviewId: string | number | null,
  validationMessages: string[],
): OfflineArtifactRetentionGovernanceReviewArchiveResult => ({
  accepted: false,
  retentionGovernanceReviewId,
  retentionGovernanceArchiveId: null,
  archiveDecision: "needs_retention_archive_review",
  archiveStatus: "needs_retention_archive_review",
  signedArchiveReadinessHash: null,
  retentionJobScheduled: false,
  deletionOrPurgeAllowed: false,
  archiveFileCreated: false,
  artifactBytesIncluded: false,
  artifactExecutionAllowed: false,
  artifactAutoActivationAllowed: false,
  modelExecutionAllowed: false,
  inferenceEndpointExposed: false,
  productionIntegrationAllowed: false,
  canMutateBusinessRecords: false,
  validationMessages,
  safetyNotes: buildOfflineArtifactSafetyNotes(),
  createdAt: nowIso(),
});

const resultFromRetentionGovernanceArchiveRecord = (
  record: OfflineArtifactRetentionGovernanceReviewArchiveRecord,
  validationMessages: string[],
): OfflineArtifactRetentionGovernanceReviewArchiveResult => ({
  accepted: true,
  retentionGovernanceReviewId: record.retentionGovernanceReviewId,
  retentionGovernanceArchiveId: record.id,
  archiveDecision: record.archiveDecision,
  archiveStatus: record.archiveStatus,
  signedArchiveReadinessHash: record.signedArchiveReadinessHash,
  retentionJobScheduled: false,
  deletionOrPurgeAllowed: false,
  archiveFileCreated: false,
  artifactBytesIncluded: false,
  artifactExecutionAllowed: false,
  artifactAutoActivationAllowed: false,
  modelExecutionAllowed: false,
  inferenceEndpointExposed: false,
  productionIntegrationAllowed: false,
  canMutateBusinessRecords: false,
  validationMessages,
  safetyNotes: record.safetyNotes,
  createdAt: record.createdAt,
});

const buildRetentionGovernanceArchiveReadinessManifest = (
  governanceReview: OfflineArtifactRetentionEvidenceGovernanceReviewRecord,
  input: NormalizedOfflineArtifactRetentionGovernanceReviewArchiveInput,
  safetyNotes: string[],
): Record<string, unknown> => ({
  phase: "Phase 6H — Offline Artifact Retention Governance Review Archive Readiness",
  mode: "metadata_retention_governance_archive_readiness_only",
  retentionGovernanceReviewId: governanceReview.id,
  retentionPolicyEvidenceId: governanceReview.retentionPolicyEvidenceId,
  archivePackId: governanceReview.archivePackId,
  signoffId: governanceReview.signoffId,
  binderId: governanceReview.binderId,
  artifactId: governanceReview.artifactId,
  artifactSha256: governanceReview.artifactSha256,
  modelKey: governanceReview.modelKey,
  modelVersion: governanceReview.modelVersion,
  signedRetentionGovernanceHash: governanceReview.signedRetentionGovernanceHash,
  archiveDecision: input.archiveDecision,
  archiveStatus: input.archiveStatus,
  archivePurpose: input.archivePurpose,
  archivistNotes: input.archivistNotes,
  rejectionReason: input.rejectionReason,
  archivistDisplayName: input.archivistDisplayName,
  archiveManifestJson: input.archiveManifestJson,
  reviewerTrailJson: input.reviewerTrailJson,
  retentionGovernanceChainJson: input.retentionGovernanceChainJson,
  evidenceIndexJson: input.evidenceIndexJson,
  acknowledgedSafetyFlags: input.acknowledgedSafetyFlags,
  safetyGate: getOfflineArtifactIntakeSafetyGate(),
  safetyNotes,
  retentionJobScheduled: false,
  deletionOrPurgeAllowed: false,
  archiveFileCreated: false,
  artifactBytesIncluded: false,
  artifactExecutionAllowed: false,
  artifactAutoActivationAllowed: false,
  modelExecutionAllowed: false,
  inferenceEndpointExposed: false,
  productionIntegrationAllowed: false,
  canMutateBusinessRecords: false,
});

export async function prepareOfflineArtifactRetentionGovernanceReviewArchiveReadiness(payload: {
  retentionGovernanceReviewId: string | number;
  request: unknown;
  createdByUserId?: string | number | null;
}): Promise<OfflineArtifactRetentionGovernanceReviewArchiveResult> {
  const safetyGate = getOfflineArtifactIntakeSafetyGate();
  const validation = validateOfflineArtifactRetentionGovernanceReviewArchiveRequest(payload.retentionGovernanceReviewId, payload.request, safetyGate);
  if (!validation.valid || !validation.normalized) {
    return rejectedRetentionGovernanceArchiveResult(payload.retentionGovernanceReviewId, validation.messages);
  }

  const governanceReview = await getOfflineArtifactRetentionEvidenceGovernanceReviewById(validation.normalized.retentionGovernanceReviewId);
  if (!governanceReview) {
    return rejectedRetentionGovernanceArchiveResult(payload.retentionGovernanceReviewId, ["Offline artifact retention governance review record was not found for archive readiness."]);
  }
  if (governanceReview.retentionJobScheduled || governanceReview.deletionOrPurgeAllowed || governanceReview.archiveFileCreated || governanceReview.artifactBytesIncluded) {
    return rejectedRetentionGovernanceArchiveResult(payload.retentionGovernanceReviewId, ["Retention governance archive readiness refused because source governance review must have no retention job, no deletion or purge, no file creation, and no artifact bytes."]);
  }

  const safetyNotes = [
    ...buildOfflineArtifactSafetyNotes(),
    "Phase 6H retention governance review archive readiness is metadata archive readiness only; it records archive manifest, reviewer trail, retention governance chain, evidence index, and signed archive-readiness hash without scheduling retention jobs, deleting, purging, creating archive files, including artifact bytes, executing artifacts, exposing inference, activating artifacts, releasing to production, or mutating business records.",
  ];
  const manifest = buildRetentionGovernanceArchiveReadinessManifest(governanceReview, validation.normalized, safetyNotes);
  const signedArchiveReadinessHash = computeArtifactEnvelopeSha256(manifest);
  const record = await createOfflineArtifactRetentionGovernanceReviewArchiveRecord({
    input: validation.normalized,
    signedArchiveReadinessHash,
    safetyNotes,
    createdByUserId: payload.createdByUserId,
  });
  if (!record) {
    return rejectedRetentionGovernanceArchiveResult(payload.retentionGovernanceReviewId, ["Offline artifact retention governance review archive readiness could not be recorded."]);
  }

  return resultFromRetentionGovernanceArchiveRecord(record, validation.messages);
}

export const listOfflineArtifactRetentionGovernanceReviewArchiveReadinessManifests = listOfflineArtifactRetentionGovernanceReviewArchives;
export const listOfflineArtifactRetentionGovernanceReviewArchiveReadinessForRetentionGovernanceReview = listOfflineArtifactRetentionGovernanceReviewArchivesByRetentionGovernanceReviewId;
export const listOfflineArtifactRetentionGovernanceReviewArchiveReadinessForArtifact = listOfflineArtifactRetentionGovernanceReviewArchivesByArtifactId;

export async function buildOfflineArtifactRetentionGovernanceReviewArchiveSummary(): Promise<OfflineArtifactRetentionGovernanceReviewArchiveSummary> {
  return getOfflineArtifactRetentionGovernanceReviewArchiveSummary();
}
