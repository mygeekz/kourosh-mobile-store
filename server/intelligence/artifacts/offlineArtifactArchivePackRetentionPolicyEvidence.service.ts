import {
  createOfflineArtifactArchivePackRetentionPolicyEvidenceRecord,
  getOfflineArtifactArchivePackRetentionPolicyEvidenceSummary,
  listOfflineArtifactArchivePackRetentionPolicyEvidence,
  listOfflineArtifactArchivePackRetentionPolicyEvidenceByArchivePackId,
  listOfflineArtifactArchivePackRetentionPolicyEvidenceByArtifactId,
} from "../../db/domains/ml/mlOfflineArtifactArchivePackRetentionPolicyEvidence.db";
import { getOfflineArtifactGovernanceSignoffArchivePackById } from "../../db/domains/ml/mlOfflineArtifactGovernanceSignoffArchivePacks.db";
import { computeArtifactEnvelopeSha256 } from "./artifactHashing";
import { buildOfflineArtifactSafetyNotes, getOfflineArtifactIntakeSafetyGate } from "./artifactSafety";
import { validateOfflineArtifactArchivePackRetentionPolicyEvidenceRequest } from "./artifactArchivePackRetentionPolicyEvidenceValidation";
import type {
  NormalizedOfflineArtifactArchivePackRetentionPolicyEvidenceInput,
  OfflineArtifactArchivePackRetentionPolicyEvidenceRecord,
  OfflineArtifactArchivePackRetentionPolicyEvidenceResult,
  OfflineArtifactArchivePackRetentionPolicyEvidenceSummary,
} from "./artifactIntakeTypes";

const nowIso = (): string => new Date().toISOString();

const rejectedRetentionPolicyEvidenceResult = (
  archivePackId: string | number | null,
  validationMessages: string[],
): OfflineArtifactArchivePackRetentionPolicyEvidenceResult => ({
  accepted: false,
  archivePackId,
  retentionPolicyEvidenceId: null,
  retentionDecision: "needs_retention_policy_review",
  retentionStatus: "needs_retention_policy_review",
  signedRetentionPolicyHash: null,
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

const resultFromRetentionPolicyEvidenceRecord = (
  record: OfflineArtifactArchivePackRetentionPolicyEvidenceRecord,
  validationMessages: string[],
): OfflineArtifactArchivePackRetentionPolicyEvidenceResult => ({
  accepted: true,
  archivePackId: record.archivePackId,
  retentionPolicyEvidenceId: record.id,
  retentionDecision: record.retentionDecision,
  retentionStatus: record.retentionStatus,
  signedRetentionPolicyHash: record.signedRetentionPolicyHash,
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

const buildRetentionPolicyEvidenceManifest = (
  archivePack: NonNullable<Awaited<ReturnType<typeof getOfflineArtifactGovernanceSignoffArchivePackById>>>,
  input: NormalizedOfflineArtifactArchivePackRetentionPolicyEvidenceInput,
  safetyNotes: string[],
): Record<string, unknown> => ({
  phase: "Phase 6F — Offline Artifact Archive Pack Retention Policy Evidence Readiness",
  mode: "metadata_retention_policy_evidence_only",
  archivePackId: archivePack.id,
  signoffId: archivePack.signoffId,
  binderId: archivePack.binderId,
  artifactId: archivePack.artifactId,
  artifactSha256: archivePack.artifactSha256,
  modelKey: archivePack.modelKey,
  modelVersion: archivePack.modelVersion,
  signedArchivePackHash: archivePack.signedArchivePackHash,
  retentionDecision: input.retentionDecision,
  retentionStatus: input.retentionStatus,
  retentionPolicyPurpose: input.retentionPolicyPurpose,
  retentionWindowDays: input.retentionWindowDays,
  retainUntil: input.retainUntil,
  legalHoldReason: input.legalHoldReason,
  policyNotes: input.policyNotes,
  rejectionReason: input.rejectionReason,
  policyReviewerDisplayName: input.policyReviewerDisplayName,
  retentionPolicyManifestJson: input.retentionPolicyManifestJson,
  holdEvidenceJson: input.holdEvidenceJson,
  expiryMetadataJson: input.expiryMetadataJson,
  purgeProhibitionEvidenceJson: input.purgeProhibitionEvidenceJson,
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

export async function prepareOfflineArtifactArchivePackRetentionPolicyEvidenceReadiness(payload: {
  archivePackId: string | number;
  request: unknown;
  createdByUserId?: string | number | null;
}): Promise<OfflineArtifactArchivePackRetentionPolicyEvidenceResult> {
  const safetyGate = getOfflineArtifactIntakeSafetyGate();
  const validation = validateOfflineArtifactArchivePackRetentionPolicyEvidenceRequest(payload.archivePackId, payload.request, safetyGate);
  if (!validation.valid || !validation.normalized) {
    return rejectedRetentionPolicyEvidenceResult(payload.archivePackId, validation.messages);
  }

  const archivePack = await getOfflineArtifactGovernanceSignoffArchivePackById(validation.normalized.archivePackId);
  if (!archivePack) {
    return rejectedRetentionPolicyEvidenceResult(payload.archivePackId, ["Offline artifact governance signoff archive-pack record was not found for retention policy evidence readiness."]);
  }
  if (archivePack.archiveFileCreated || archivePack.artifactBytesIncluded || archivePack.retentionJobScheduled || archivePack.deletionOrPurgeAllowed) {
    return rejectedRetentionPolicyEvidenceResult(payload.archivePackId, ["Retention policy evidence refused because archive-pack readiness must have no file creation, no artifact bytes, no retention job, and no deletion or purge."]);
  }

  const safetyNotes = [
    ...buildOfflineArtifactSafetyNotes(),
    "Phase 6F retention policy evidence readiness is metadata retention evidence only; it records retention windows, hold reason, expiry metadata, and purge prohibition evidence without scheduling retention jobs, deleting, purging, creating files, including artifact bytes, executing artifacts, exposing inference, activating artifacts, releasing to production, or mutating business records.",
  ];
  const manifest = buildRetentionPolicyEvidenceManifest(archivePack, validation.normalized, safetyNotes);
  const signedRetentionPolicyHash = computeArtifactEnvelopeSha256(manifest);
  const record = await createOfflineArtifactArchivePackRetentionPolicyEvidenceRecord({
    input: validation.normalized,
    signedRetentionPolicyHash,
    safetyNotes,
    createdByUserId: payload.createdByUserId,
  });
  if (!record) {
    return rejectedRetentionPolicyEvidenceResult(payload.archivePackId, ["Offline artifact archive-pack retention policy evidence readiness could not be recorded."]);
  }

  return resultFromRetentionPolicyEvidenceRecord(record, validation.messages);
}

export const listOfflineArtifactArchivePackRetentionPolicyEvidenceReadinessManifests = listOfflineArtifactArchivePackRetentionPolicyEvidence;
export const listOfflineArtifactArchivePackRetentionPolicyEvidenceForArchivePack = listOfflineArtifactArchivePackRetentionPolicyEvidenceByArchivePackId;
export const listOfflineArtifactArchivePackRetentionPolicyEvidenceForArtifact = listOfflineArtifactArchivePackRetentionPolicyEvidenceByArtifactId;

export async function buildOfflineArtifactArchivePackRetentionPolicyEvidenceSummary(): Promise<OfflineArtifactArchivePackRetentionPolicyEvidenceSummary> {
  return getOfflineArtifactArchivePackRetentionPolicyEvidenceSummary();
}
