import {
  createOfflineArtifactRetentionEvidenceGovernanceReviewRecord,
  getOfflineArtifactRetentionEvidenceGovernanceReviewSummary,
  listOfflineArtifactRetentionEvidenceGovernanceReviews,
  listOfflineArtifactRetentionEvidenceGovernanceReviewsByArtifactId,
  listOfflineArtifactRetentionEvidenceGovernanceReviewsByRetentionPolicyEvidenceId,
} from "../../db/domains/ml/mlOfflineArtifactRetentionEvidenceGovernanceReviews.db";
import { getOfflineArtifactArchivePackRetentionPolicyEvidenceById } from "../../db/domains/ml/mlOfflineArtifactArchivePackRetentionPolicyEvidence.db";
import { computeArtifactEnvelopeSha256 } from "./artifactHashing";
import { buildOfflineArtifactSafetyNotes, getOfflineArtifactIntakeSafetyGate } from "./artifactSafety";
import { validateOfflineArtifactRetentionEvidenceGovernanceReviewRequest } from "./artifactRetentionEvidenceGovernanceReviewValidation";
import type {
  NormalizedOfflineArtifactRetentionEvidenceGovernanceReviewInput,
  OfflineArtifactArchivePackRetentionPolicyEvidenceRecord,
  OfflineArtifactRetentionEvidenceGovernanceReviewRecord,
  OfflineArtifactRetentionEvidenceGovernanceReviewResult,
  OfflineArtifactRetentionEvidenceGovernanceReviewSummary,
} from "./artifactIntakeTypes";

const nowIso = (): string => new Date().toISOString();

const rejectedRetentionGovernanceReviewResult = (
  retentionPolicyEvidenceId: string | number | null,
  validationMessages: string[],
): OfflineArtifactRetentionEvidenceGovernanceReviewResult => ({
  accepted: false,
  retentionPolicyEvidenceId,
  retentionGovernanceReviewId: null,
  governanceReviewDecision: "needs_retention_governance_review",
  governanceReviewStatus: "needs_retention_governance_review",
  signedRetentionGovernanceHash: null,
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

const resultFromRetentionGovernanceReviewRecord = (
  record: OfflineArtifactRetentionEvidenceGovernanceReviewRecord,
  validationMessages: string[],
): OfflineArtifactRetentionEvidenceGovernanceReviewResult => ({
  accepted: true,
  retentionPolicyEvidenceId: record.retentionPolicyEvidenceId,
  retentionGovernanceReviewId: record.id,
  governanceReviewDecision: record.governanceReviewDecision,
  governanceReviewStatus: record.governanceReviewStatus,
  signedRetentionGovernanceHash: record.signedRetentionGovernanceHash,
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

const buildRetentionGovernanceReviewManifest = (
  retentionPolicyEvidence: OfflineArtifactArchivePackRetentionPolicyEvidenceRecord,
  input: NormalizedOfflineArtifactRetentionEvidenceGovernanceReviewInput,
  safetyNotes: string[],
): Record<string, unknown> => ({
  phase: "Phase 6G — Offline Artifact Retention Evidence Governance Review Readiness",
  mode: "metadata_retention_governance_review_only",
  retentionPolicyEvidenceId: retentionPolicyEvidence.id,
  archivePackId: retentionPolicyEvidence.archivePackId,
  signoffId: retentionPolicyEvidence.signoffId,
  binderId: retentionPolicyEvidence.binderId,
  artifactId: retentionPolicyEvidence.artifactId,
  artifactSha256: retentionPolicyEvidence.artifactSha256,
  modelKey: retentionPolicyEvidence.modelKey,
  modelVersion: retentionPolicyEvidence.modelVersion,
  signedRetentionPolicyHash: retentionPolicyEvidence.signedRetentionPolicyHash,
  governanceReviewDecision: input.governanceReviewDecision,
  governanceReviewStatus: input.governanceReviewStatus,
  governanceReviewPurpose: input.governanceReviewPurpose,
  reviewerNotes: input.reviewerNotes,
  rejectionReason: input.rejectionReason,
  governanceReviewerDisplayName: input.governanceReviewerDisplayName,
  riskConfirmationJson: input.riskConfirmationJson,
  holdConfirmationJson: input.holdConfirmationJson,
  purgeProhibitionReviewJson: input.purgeProhibitionReviewJson,
  evidenceCompletenessJson: input.evidenceCompletenessJson,
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

export async function reviewOfflineArtifactRetentionEvidenceGovernanceReadiness(payload: {
  retentionPolicyEvidenceId: string | number;
  request: unknown;
  createdByUserId?: string | number | null;
}): Promise<OfflineArtifactRetentionEvidenceGovernanceReviewResult> {
  const safetyGate = getOfflineArtifactIntakeSafetyGate();
  const validation = validateOfflineArtifactRetentionEvidenceGovernanceReviewRequest(payload.retentionPolicyEvidenceId, payload.request, safetyGate);
  if (!validation.valid || !validation.normalized) {
    return rejectedRetentionGovernanceReviewResult(payload.retentionPolicyEvidenceId, validation.messages);
  }

  const retentionPolicyEvidence = await getOfflineArtifactArchivePackRetentionPolicyEvidenceById(validation.normalized.retentionPolicyEvidenceId);
  if (!retentionPolicyEvidence) {
    return rejectedRetentionGovernanceReviewResult(payload.retentionPolicyEvidenceId, ["Offline artifact retention policy evidence record was not found for governance review readiness."]);
  }
  if (retentionPolicyEvidence.retentionJobScheduled || retentionPolicyEvidence.deletionOrPurgeAllowed || retentionPolicyEvidence.archiveFileCreated || retentionPolicyEvidence.artifactBytesIncluded) {
    return rejectedRetentionGovernanceReviewResult(payload.retentionPolicyEvidenceId, ["Retention governance review refused because retention policy evidence must have no retention job, no deletion or purge, no file creation, and no artifact bytes."]);
  }

  const safetyNotes = [
    ...buildOfflineArtifactSafetyNotes(),
    "Phase 6G retention evidence governance review readiness is metadata governance review only; it records human review decision, reviewer notes, risk and hold confirmation, evidence completeness, and purge-prohibition review without scheduling retention jobs, deleting, purging, creating files, including artifact bytes, executing artifacts, exposing inference, activating artifacts, releasing to production, or mutating business records.",
  ];
  const manifest = buildRetentionGovernanceReviewManifest(retentionPolicyEvidence, validation.normalized, safetyNotes);
  const signedRetentionGovernanceHash = computeArtifactEnvelopeSha256(manifest);
  const record = await createOfflineArtifactRetentionEvidenceGovernanceReviewRecord({
    input: validation.normalized,
    signedRetentionGovernanceHash,
    safetyNotes,
    createdByUserId: payload.createdByUserId,
  });
  if (!record) {
    return rejectedRetentionGovernanceReviewResult(payload.retentionPolicyEvidenceId, ["Offline artifact retention evidence governance review readiness could not be recorded."]);
  }

  return resultFromRetentionGovernanceReviewRecord(record, validation.messages);
}

export const listOfflineArtifactRetentionEvidenceGovernanceReviewReadinessManifests = listOfflineArtifactRetentionEvidenceGovernanceReviews;
export const listOfflineArtifactRetentionEvidenceGovernanceReviewsForRetentionPolicyEvidence = listOfflineArtifactRetentionEvidenceGovernanceReviewsByRetentionPolicyEvidenceId;
export const listOfflineArtifactRetentionEvidenceGovernanceReviewsForArtifact = listOfflineArtifactRetentionEvidenceGovernanceReviewsByArtifactId;

export async function buildOfflineArtifactRetentionEvidenceGovernanceReviewSummary(): Promise<OfflineArtifactRetentionEvidenceGovernanceReviewSummary> {
  return getOfflineArtifactRetentionEvidenceGovernanceReviewSummary();
}
