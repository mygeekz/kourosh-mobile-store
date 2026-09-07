import {
  createOfflineArtifactGovernanceArchiveChainFinalizationRecord,
  getOfflineArtifactGovernanceArchiveChainFinalizationSummary,
  listOfflineArtifactGovernanceArchiveChainFinalizations,
  listOfflineArtifactGovernanceArchiveChainFinalizationsByArtifactId,
  listOfflineArtifactGovernanceArchiveChainFinalizationsByRetentionGovernanceArchiveId,
} from "../../db/domains/ml/mlOfflineArtifactGovernanceArchiveChainFinalizations.db";
import { getOfflineArtifactRetentionGovernanceReviewArchiveById } from "../../db/domains/ml/mlOfflineArtifactRetentionGovernanceReviewArchives.db";
import { computeArtifactEnvelopeSha256 } from "./artifactHashing";
import { buildOfflineArtifactSafetyNotes, getOfflineArtifactIntakeSafetyGate } from "./artifactSafety";
import { validateOfflineArtifactGovernanceArchiveChainFinalizationRequest } from "./artifactGovernanceArchiveChainFinalizationValidation";
import type {
  NormalizedOfflineArtifactGovernanceArchiveChainFinalizationInput,
  OfflineArtifactGovernanceArchiveChainFinalizationRecord,
  OfflineArtifactGovernanceArchiveChainFinalizationResult,
  OfflineArtifactGovernanceArchiveChainFinalizationSummary,
  OfflineArtifactRetentionGovernanceReviewArchiveRecord,
} from "./artifactIntakeTypes";

const nowIso = (): string => new Date().toISOString();

const rejectedFinalizationResult = (
  retentionGovernanceArchiveId: string | number | null,
  validationMessages: string[],
): OfflineArtifactGovernanceArchiveChainFinalizationResult => ({
  accepted: false,
  retentionGovernanceArchiveId,
  finalizationId: null,
  finalizationDecision: "needs_finalization_review",
  finalizationStatus: "needs_finalization_review",
  signedFinalizationReadinessHash: null,
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

const resultFromFinalizationRecord = (
  record: OfflineArtifactGovernanceArchiveChainFinalizationRecord,
  validationMessages: string[],
): OfflineArtifactGovernanceArchiveChainFinalizationResult => ({
  accepted: true,
  retentionGovernanceArchiveId: record.retentionGovernanceArchiveId,
  finalizationId: record.id,
  finalizationDecision: record.finalizationDecision,
  finalizationStatus: record.finalizationStatus,
  signedFinalizationReadinessHash: record.signedFinalizationReadinessHash,
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

const buildGovernanceArchiveChainFinalizationManifest = (
  archive: OfflineArtifactRetentionGovernanceReviewArchiveRecord,
  input: NormalizedOfflineArtifactGovernanceArchiveChainFinalizationInput,
  safetyNotes: string[],
): Record<string, unknown> => ({
  phase: "Phase 6I — Offline Artifact Governance Archive Chain Finalization Readiness",
  mode: "metadata_governance_archive_chain_finalization_readiness_only",
  retentionGovernanceArchiveId: archive.id,
  retentionGovernanceReviewId: archive.retentionGovernanceReviewId,
  retentionPolicyEvidenceId: archive.retentionPolicyEvidenceId,
  archivePackId: archive.archivePackId,
  signoffId: archive.signoffId,
  binderId: archive.binderId,
  artifactId: archive.artifactId,
  artifactSha256: archive.artifactSha256,
  modelKey: archive.modelKey,
  modelVersion: archive.modelVersion,
  signedArchiveReadinessHash: archive.signedArchiveReadinessHash,
  finalizationDecision: input.finalizationDecision,
  finalizationStatus: input.finalizationStatus,
  finalizationPurpose: input.finalizationPurpose,
  finalReviewerNotes: input.finalReviewerNotes,
  rejectionReason: input.rejectionReason,
  finalReviewerDisplayName: input.finalReviewerDisplayName,
  chainCompletenessJson: input.chainCompletenessJson,
  finalReviewerAcknowledgementJson: input.finalReviewerAcknowledgementJson,
  immutableEvidenceSummaryJson: input.immutableEvidenceSummaryJson,
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

export async function prepareOfflineArtifactGovernanceArchiveChainFinalizationReadiness(payload: {
  retentionGovernanceArchiveId: string | number;
  request: unknown;
  createdByUserId?: string | number | null;
}): Promise<OfflineArtifactGovernanceArchiveChainFinalizationResult> {
  const safetyGate = getOfflineArtifactIntakeSafetyGate();
  const validation = validateOfflineArtifactGovernanceArchiveChainFinalizationRequest(payload.retentionGovernanceArchiveId, payload.request, safetyGate);
  if (!validation.valid || !validation.normalized) {
    return rejectedFinalizationResult(payload.retentionGovernanceArchiveId, validation.messages);
  }

  const archive = await getOfflineArtifactRetentionGovernanceReviewArchiveById(validation.normalized.retentionGovernanceArchiveId);
  if (!archive) {
    return rejectedFinalizationResult(payload.retentionGovernanceArchiveId, ["Offline artifact retention governance archive readiness record was not found for chain finalization."]);
  }
  if (archive.retentionJobScheduled || archive.deletionOrPurgeAllowed || archive.archiveFileCreated || archive.artifactBytesIncluded) {
    return rejectedFinalizationResult(payload.retentionGovernanceArchiveId, ["Governance archive chain finalization refused because source archive readiness must have no retention job, no deletion or purge, no file creation, and no artifact bytes."]);
  }

  const safetyNotes = [
    ...buildOfflineArtifactSafetyNotes(),
    "Phase 6I governance archive chain finalization readiness is metadata finalization only; it records chain completeness, final reviewer acknowledgement, immutable evidence summary, evidence index, and signed finalization-readiness hash without scheduling retention jobs, deleting, purging, creating files, including artifact bytes, executing artifacts, exposing inference, activating artifacts, releasing to production, or mutating business records.",
  ];
  const manifest = buildGovernanceArchiveChainFinalizationManifest(archive, validation.normalized, safetyNotes);
  const signedFinalizationReadinessHash = computeArtifactEnvelopeSha256(manifest);
  const record = await createOfflineArtifactGovernanceArchiveChainFinalizationRecord({
    input: validation.normalized,
    signedFinalizationReadinessHash,
    safetyNotes,
    createdByUserId: payload.createdByUserId,
  });
  if (!record) {
    return rejectedFinalizationResult(payload.retentionGovernanceArchiveId, ["Offline artifact governance archive chain finalization readiness could not be recorded."]);
  }

  return resultFromFinalizationRecord(record, validation.messages);
}

export const listOfflineArtifactGovernanceArchiveChainFinalizationReadinessManifests = listOfflineArtifactGovernanceArchiveChainFinalizations;
export const listOfflineArtifactGovernanceArchiveChainFinalizationReadinessForRetentionGovernanceArchive = listOfflineArtifactGovernanceArchiveChainFinalizationsByRetentionGovernanceArchiveId;
export const listOfflineArtifactGovernanceArchiveChainFinalizationReadinessForArtifact = listOfflineArtifactGovernanceArchiveChainFinalizationsByArtifactId;

export async function buildOfflineArtifactGovernanceArchiveChainFinalizationSummary(): Promise<OfflineArtifactGovernanceArchiveChainFinalizationSummary> {
  return getOfflineArtifactGovernanceArchiveChainFinalizationSummary();
}
