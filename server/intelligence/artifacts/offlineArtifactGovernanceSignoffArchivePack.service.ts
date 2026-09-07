import {
  createOfflineArtifactGovernanceSignoffArchivePackRecord,
  getOfflineArtifactGovernanceSignoffArchivePackSummary,
  listOfflineArtifactGovernanceSignoffArchivePacks,
  listOfflineArtifactGovernanceSignoffArchivePacksByArtifactId,
  listOfflineArtifactGovernanceSignoffArchivePacksBySignoffId,
} from "../../db/domains/ml/mlOfflineArtifactGovernanceSignoffArchivePacks.db";
import { getOfflineArtifactReviewBinderGovernanceSignoffById } from "../../db/domains/ml/mlOfflineArtifactReviewBinderGovernanceSignoffs.db";
import { computeArtifactEnvelopeSha256 } from "./artifactHashing";
import { buildOfflineArtifactSafetyNotes, getOfflineArtifactIntakeSafetyGate } from "./artifactSafety";
import { validateOfflineArtifactGovernanceSignoffArchivePackRequest } from "./artifactGovernanceSignoffArchivePackValidation";
import type {
  NormalizedOfflineArtifactGovernanceSignoffArchivePackInput,
  OfflineArtifactGovernanceSignoffArchivePackRecord,
  OfflineArtifactGovernanceSignoffArchivePackResult,
  OfflineArtifactGovernanceSignoffArchivePackSummary,
} from "./artifactIntakeTypes";

const nowIso = (): string => new Date().toISOString();

const rejectedArchivePackResult = (
  signoffId: string | number | null,
  validationMessages: string[],
): OfflineArtifactGovernanceSignoffArchivePackResult => ({
  accepted: false,
  signoffId,
  archivePackId: null,
  archivePackDecision: "needs_archive_pack_review",
  archivePackStatus: "needs_archive_pack_review",
  signedArchivePackHash: null,
  archiveFileCreated: false,
  artifactBytesIncluded: false,
  retentionJobScheduled: false,
  deletionOrPurgeAllowed: false,
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

const resultFromArchivePackRecord = (
  record: OfflineArtifactGovernanceSignoffArchivePackRecord,
  validationMessages: string[],
): OfflineArtifactGovernanceSignoffArchivePackResult => ({
  accepted: true,
  signoffId: record.signoffId,
  archivePackId: record.id,
  archivePackDecision: record.archivePackDecision,
  archivePackStatus: record.archivePackStatus,
  signedArchivePackHash: record.signedArchivePackHash,
  archiveFileCreated: false,
  artifactBytesIncluded: false,
  retentionJobScheduled: false,
  deletionOrPurgeAllowed: false,
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

const buildArchivePackManifest = (
  signoff: NonNullable<Awaited<ReturnType<typeof getOfflineArtifactReviewBinderGovernanceSignoffById>>>,
  input: NormalizedOfflineArtifactGovernanceSignoffArchivePackInput,
  safetyNotes: string[],
): Record<string, unknown> => ({
  phase: "Phase 6E — Offline Artifact Governance Signoff Archive Pack Readiness",
  mode: "metadata_archive_pack_readiness_only",
  signoffId: signoff.id,
  binderId: signoff.binderId,
  artifactId: signoff.artifactId,
  artifactSha256: signoff.artifactSha256,
  modelKey: signoff.modelKey,
  modelVersion: signoff.modelVersion,
  signedGovernanceHash: signoff.signedGovernanceHash,
  archivePackDecision: input.archivePackDecision,
  archivePackStatus: input.archivePackStatus,
  archivePackPurpose: input.archivePackPurpose,
  archivistNotes: input.archivistNotes,
  rejectionReason: input.rejectionReason,
  archivistDisplayName: input.archivistDisplayName,
  archiveManifestJson: input.archiveManifestJson,
  retentionManifestJson: input.retentionManifestJson,
  evidenceIndexJson: input.evidenceIndexJson,
  archiveReadinessNotesJson: input.archiveReadinessNotesJson,
  acknowledgedSafetyFlags: input.acknowledgedSafetyFlags,
  safetyGate: getOfflineArtifactIntakeSafetyGate(),
  safetyNotes,
  archiveFileCreated: false,
  artifactBytesIncluded: false,
  retentionJobScheduled: false,
  deletionOrPurgeAllowed: false,
  artifactExecutionAllowed: false,
  artifactAutoActivationAllowed: false,
  modelExecutionAllowed: false,
  inferenceEndpointExposed: false,
  productionIntegrationAllowed: false,
  canMutateBusinessRecords: false,
});

export async function prepareOfflineArtifactGovernanceSignoffArchivePackReadiness(payload: {
  signoffId: string | number;
  request: unknown;
  createdByUserId?: string | number | null;
}): Promise<OfflineArtifactGovernanceSignoffArchivePackResult> {
  const safetyGate = getOfflineArtifactIntakeSafetyGate();
  const validation = validateOfflineArtifactGovernanceSignoffArchivePackRequest(payload.signoffId, payload.request, safetyGate);
  if (!validation.valid || !validation.normalized) {
    return rejectedArchivePackResult(payload.signoffId, validation.messages);
  }

  const signoff = await getOfflineArtifactReviewBinderGovernanceSignoffById(validation.normalized.signoffId);
  if (!signoff) {
    return rejectedArchivePackResult(payload.signoffId, ["Offline artifact review binder governance signoff record was not found for archive-pack readiness."]);
  }
  if (signoff.exportFileCreated || signoff.artifactBytesIncluded || signoff.binderActivationAllowed) {
    return rejectedArchivePackResult(payload.signoffId, ["Archive-pack readiness refused because governance signoff must be metadata-only with no exported file, no artifact bytes, and no binder activation."]);
  }

  const safetyNotes = [
    ...buildOfflineArtifactSafetyNotes(),
    "Phase 6E archive-pack readiness is metadata archive evidence only; it does not create archive files, include artifact bytes, schedule retention jobs, delete, purge, execute artifacts, expose inference, activate artifacts, release to production, or mutate business records.",
  ];
  const archivePackManifest = buildArchivePackManifest(signoff, validation.normalized, safetyNotes);
  const signedArchivePackHash = computeArtifactEnvelopeSha256(archivePackManifest);
  const record = await createOfflineArtifactGovernanceSignoffArchivePackRecord({
    input: validation.normalized,
    signedArchivePackHash,
    safetyNotes,
    createdByUserId: payload.createdByUserId,
  });
  if (!record) {
    return rejectedArchivePackResult(payload.signoffId, ["Offline artifact governance signoff archive-pack readiness could not be recorded."]);
  }

  return resultFromArchivePackRecord(record, validation.messages);
}

export const listOfflineArtifactGovernanceSignoffArchivePackReadinessManifests = listOfflineArtifactGovernanceSignoffArchivePacks;
export const listOfflineArtifactGovernanceSignoffArchivePackReadinessForSignoff = listOfflineArtifactGovernanceSignoffArchivePacksBySignoffId;
export const listOfflineArtifactGovernanceSignoffArchivePackReadinessForArtifact = listOfflineArtifactGovernanceSignoffArchivePacksByArtifactId;

export async function buildOfflineArtifactGovernanceSignoffArchivePackSummary(): Promise<OfflineArtifactGovernanceSignoffArchivePackSummary> {
  return getOfflineArtifactGovernanceSignoffArchivePackSummary();
}
