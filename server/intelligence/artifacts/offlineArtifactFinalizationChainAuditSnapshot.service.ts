import {
  createOfflineArtifactFinalizationChainAuditSnapshotRecord,
  getOfflineArtifactFinalizationChainAuditSnapshotSummary,
  listOfflineArtifactFinalizationChainAuditSnapshots,
  listOfflineArtifactFinalizationChainAuditSnapshotsByArtifactId,
  listOfflineArtifactFinalizationChainAuditSnapshotsByFinalizationId,
} from "../../db/domains/ml/mlOfflineArtifactFinalizationChainAuditSnapshots.db";
import { getOfflineArtifactGovernanceArchiveChainFinalizationById } from "../../db/domains/ml/mlOfflineArtifactGovernanceArchiveChainFinalizations.db";
import { computeArtifactEnvelopeSha256 } from "./artifactHashing";
import { buildOfflineArtifactSafetyNotes, getOfflineArtifactIntakeSafetyGate } from "./artifactSafety";
import { validateOfflineArtifactFinalizationChainAuditSnapshotRequest } from "./artifactFinalizationChainAuditSnapshotValidation";
import type {
  NormalizedOfflineArtifactFinalizationChainAuditSnapshotInput,
  OfflineArtifactFinalizationChainAuditSnapshotRecord,
  OfflineArtifactFinalizationChainAuditSnapshotResult,
  OfflineArtifactFinalizationChainAuditSnapshotSummary,
  OfflineArtifactGovernanceArchiveChainFinalizationRecord,
} from "./artifactIntakeTypes";

const nowIso = (): string => new Date().toISOString();

const rejectedAuditSnapshotResult = (
  finalizationId: string | number | null,
  validationMessages: string[],
): OfflineArtifactFinalizationChainAuditSnapshotResult => ({
  accepted: false,
  finalizationId,
  auditSnapshotId: null,
  auditSnapshotDecision: "needs_audit_snapshot_review",
  auditSnapshotStatus: "needs_audit_snapshot_review",
  signedAuditSnapshotHash: null,
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

const resultFromAuditSnapshotRecord = (
  record: OfflineArtifactFinalizationChainAuditSnapshotRecord,
  validationMessages: string[],
): OfflineArtifactFinalizationChainAuditSnapshotResult => ({
  accepted: true,
  finalizationId: record.finalizationId,
  auditSnapshotId: record.id,
  auditSnapshotDecision: record.auditSnapshotDecision,
  auditSnapshotStatus: record.auditSnapshotStatus,
  signedAuditSnapshotHash: record.signedAuditSnapshotHash,
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

const buildFinalizationChainAuditSnapshotManifest = (
  finalization: OfflineArtifactGovernanceArchiveChainFinalizationRecord,
  input: NormalizedOfflineArtifactFinalizationChainAuditSnapshotInput,
  safetyNotes: string[],
): Record<string, unknown> => ({
  phase: "Phase 6J — Offline Artifact Finalization Chain Audit Snapshot Readiness",
  mode: "metadata_finalization_chain_audit_snapshot_readiness_only",
  finalizationId: finalization.id,
  retentionGovernanceArchiveId: finalization.retentionGovernanceArchiveId,
  retentionGovernanceReviewId: finalization.retentionGovernanceReviewId,
  retentionPolicyEvidenceId: finalization.retentionPolicyEvidenceId,
  archivePackId: finalization.archivePackId,
  signoffId: finalization.signoffId,
  binderId: finalization.binderId,
  artifactId: finalization.artifactId,
  artifactSha256: finalization.artifactSha256,
  modelKey: finalization.modelKey,
  modelVersion: finalization.modelVersion,
  signedFinalizationReadinessHash: finalization.signedFinalizationReadinessHash,
  auditSnapshotDecision: input.auditSnapshotDecision,
  auditSnapshotStatus: input.auditSnapshotStatus,
  snapshotPurpose: input.snapshotPurpose,
  snapshotTimestamp: input.snapshotTimestamp,
  auditReviewerNotes: input.auditReviewerNotes,
  rejectionReason: input.rejectionReason,
  auditReviewerDisplayName: input.auditReviewerDisplayName,
  finalChainDigestJson: input.finalChainDigestJson,
  reviewerTrailDigestJson: input.reviewerTrailDigestJson,
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

export async function prepareOfflineArtifactFinalizationChainAuditSnapshotReadiness(payload: {
  finalizationId: string | number;
  request: unknown;
  createdByUserId?: string | number | null;
}): Promise<OfflineArtifactFinalizationChainAuditSnapshotResult> {
  const safetyGate = getOfflineArtifactIntakeSafetyGate();
  const validation = validateOfflineArtifactFinalizationChainAuditSnapshotRequest(payload.finalizationId, payload.request, safetyGate);
  if (!validation.valid || !validation.normalized) {
    return rejectedAuditSnapshotResult(payload.finalizationId, validation.messages);
  }

  const finalization = await getOfflineArtifactGovernanceArchiveChainFinalizationById(validation.normalized.finalizationId);
  if (!finalization) {
    return rejectedAuditSnapshotResult(payload.finalizationId, ["Offline artifact governance archive chain finalization readiness record was not found for audit snapshot readiness."]);
  }
  if (finalization.retentionJobScheduled || finalization.deletionOrPurgeAllowed || finalization.archiveFileCreated || finalization.artifactBytesIncluded) {
    return rejectedAuditSnapshotResult(payload.finalizationId, ["Finalization chain audit snapshot readiness refused because source finalization must have no retention job, no deletion or purge, no file creation, and no artifact bytes."]);
  }

  const safetyNotes = [
    ...buildOfflineArtifactSafetyNotes(),
    "Phase 6J finalization chain audit snapshot readiness is metadata audit snapshot only; it records snapshot timestamp, final chain digest, reviewer trail digest, immutable evidence summary, evidence index, and signed audit snapshot hash without scheduling retention jobs, deleting, purging, creating files, exporting files, including artifact bytes, executing artifacts, exposing inference, activating artifacts, releasing to production, or mutating business records.",
  ];
  const manifest = buildFinalizationChainAuditSnapshotManifest(finalization, validation.normalized, safetyNotes);
  const signedAuditSnapshotHash = computeArtifactEnvelopeSha256(manifest);
  const record = await createOfflineArtifactFinalizationChainAuditSnapshotRecord({
    input: validation.normalized,
    signedAuditSnapshotHash,
    safetyNotes,
    createdByUserId: payload.createdByUserId,
  });
  if (!record) {
    return rejectedAuditSnapshotResult(payload.finalizationId, ["Offline artifact finalization chain audit snapshot readiness could not be recorded."]);
  }

  return resultFromAuditSnapshotRecord(record, validation.messages);
}

export const listOfflineArtifactFinalizationChainAuditSnapshotReadinessManifests = listOfflineArtifactFinalizationChainAuditSnapshots;
export const listOfflineArtifactFinalizationChainAuditSnapshotReadinessForFinalization = listOfflineArtifactFinalizationChainAuditSnapshotsByFinalizationId;
export const listOfflineArtifactFinalizationChainAuditSnapshotReadinessForArtifact = listOfflineArtifactFinalizationChainAuditSnapshotsByArtifactId;

export async function buildOfflineArtifactFinalizationChainAuditSnapshotSummary(): Promise<OfflineArtifactFinalizationChainAuditSnapshotSummary> {
  return getOfflineArtifactFinalizationChainAuditSnapshotSummary();
}
