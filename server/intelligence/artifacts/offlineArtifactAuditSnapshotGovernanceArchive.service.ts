import {
  createOfflineArtifactAuditSnapshotGovernanceArchiveRecord,
  getOfflineArtifactAuditSnapshotGovernanceArchiveSummary,
  listOfflineArtifactAuditSnapshotGovernanceArchives,
  listOfflineArtifactAuditSnapshotGovernanceArchivesByArtifactId,
  listOfflineArtifactAuditSnapshotGovernanceArchivesByAuditSnapshotGovernanceSignoffId,
} from "../../db/domains/ml/mlOfflineArtifactAuditSnapshotGovernanceArchives.db";
import { getOfflineArtifactAuditSnapshotGovernanceSignoffById } from "../../db/domains/ml/mlOfflineArtifactAuditSnapshotGovernanceSignoffs.db";
import { computeArtifactEnvelopeSha256 } from "./artifactHashing";
import { buildOfflineArtifactSafetyNotes, getOfflineArtifactIntakeSafetyGate } from "./artifactSafety";
import { validateOfflineArtifactAuditSnapshotGovernanceArchiveRequest } from "./artifactAuditSnapshotGovernanceArchiveValidation";
import type {
  NormalizedOfflineArtifactAuditSnapshotGovernanceArchiveInput,
  OfflineArtifactAuditSnapshotGovernanceArchiveRecord,
  OfflineArtifactAuditSnapshotGovernanceArchiveResult,
  OfflineArtifactAuditSnapshotGovernanceArchiveSummary,
  OfflineArtifactAuditSnapshotGovernanceSignoffRecord,
} from "./artifactIntakeTypes";

const nowIso = (): string => new Date().toISOString();

const rejectedAuditSnapshotGovernanceArchiveResult = (
  auditSnapshotGovernanceSignoffId: string | number | null,
  validationMessages: string[],
): OfflineArtifactAuditSnapshotGovernanceArchiveResult => ({
  accepted: false,
  auditSnapshotGovernanceSignoffId,
  auditSnapshotGovernanceArchiveId: null,
  archiveDecision: "needs_audit_governance_archive_review",
  archiveStatus: "needs_audit_governance_archive_review",
  signedAuditGovernanceArchiveHash: null,
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

const resultFromAuditSnapshotGovernanceArchiveRecord = (
  record: OfflineArtifactAuditSnapshotGovernanceArchiveRecord,
  validationMessages: string[],
): OfflineArtifactAuditSnapshotGovernanceArchiveResult => ({
  accepted: true,
  auditSnapshotGovernanceSignoffId: record.auditSnapshotGovernanceSignoffId,
  auditSnapshotGovernanceArchiveId: record.id,
  archiveDecision: record.archiveDecision,
  archiveStatus: record.archiveStatus,
  signedAuditGovernanceArchiveHash: record.signedAuditGovernanceArchiveHash,
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

const buildAuditSnapshotGovernanceArchiveManifest = (
  signoff: OfflineArtifactAuditSnapshotGovernanceSignoffRecord,
  input: NormalizedOfflineArtifactAuditSnapshotGovernanceArchiveInput,
  safetyNotes: string[],
): Record<string, unknown> => ({
  phase: "Phase 6L — Offline Artifact Audit Snapshot Governance Archive Readiness",
  mode: "metadata_audit_snapshot_governance_archive_readiness_only",
  auditSnapshotGovernanceSignoffId: signoff.id,
  auditSnapshotId: signoff.auditSnapshotId,
  finalizationId: signoff.finalizationId,
  retentionGovernanceArchiveId: signoff.retentionGovernanceArchiveId,
  retentionGovernanceReviewId: signoff.retentionGovernanceReviewId,
  retentionPolicyEvidenceId: signoff.retentionPolicyEvidenceId,
  archivePackId: signoff.archivePackId,
  signoffId: signoff.signoffId,
  binderId: signoff.binderId,
  artifactId: signoff.artifactId,
  artifactSha256: signoff.artifactSha256,
  modelKey: signoff.modelKey,
  modelVersion: signoff.modelVersion,
  signedAuditSnapshotGovernanceHash: signoff.signedAuditSnapshotGovernanceHash,
  archiveDecision: input.archiveDecision,
  archiveStatus: input.archiveStatus,
  archivePurpose: input.archivePurpose,
  archivistNotes: input.archivistNotes,
  rejectionReason: input.rejectionReason,
  archivistDisplayName: input.archivistDisplayName,
  governanceArchiveManifestJson: input.governanceArchiveManifestJson,
  signerTrailJson: input.signerTrailJson,
  exceptionSummaryJson: input.exceptionSummaryJson,
  evidenceConfidenceDigestJson: input.evidenceConfidenceDigestJson,
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

export async function prepareOfflineArtifactAuditSnapshotGovernanceArchiveReadiness(payload: {
  auditSnapshotGovernanceSignoffId: string | number;
  request: unknown;
  createdByUserId?: string | number | null;
}): Promise<OfflineArtifactAuditSnapshotGovernanceArchiveResult> {
  const safetyGate = getOfflineArtifactIntakeSafetyGate();
  const validation = validateOfflineArtifactAuditSnapshotGovernanceArchiveRequest(payload.auditSnapshotGovernanceSignoffId, payload.request, safetyGate);
  if (!validation.valid || !validation.normalized) {
    return rejectedAuditSnapshotGovernanceArchiveResult(payload.auditSnapshotGovernanceSignoffId, validation.messages);
  }

  const signoff = await getOfflineArtifactAuditSnapshotGovernanceSignoffById(validation.normalized.auditSnapshotGovernanceSignoffId);
  if (!signoff) {
    return rejectedAuditSnapshotGovernanceArchiveResult(payload.auditSnapshotGovernanceSignoffId, ["Offline artifact audit snapshot governance signoff readiness record was not found for governance archive readiness."]);
  }
  if (signoff.retentionJobScheduled || signoff.deletionOrPurgeAllowed || signoff.archiveFileCreated || signoff.artifactBytesIncluded) {
    return rejectedAuditSnapshotGovernanceArchiveResult(payload.auditSnapshotGovernanceSignoffId, ["Audit snapshot governance archive readiness refused because source governance signoff must have no retention job, no deletion or purge, no file creation, and no artifact bytes."]);
  }

  const safetyNotes = [
    ...buildOfflineArtifactSafetyNotes(),
    "Phase 6L audit snapshot governance archive readiness is metadata archive readiness only; it records governance archive manifest, signer trail, exception summary, evidence confidence digest, and signed audit governance archive hash without scheduling retention jobs, deleting, purging, creating files, exporting files, including artifact bytes, executing artifacts, exposing inference, activating artifacts, releasing to production, or mutating business records.",
  ];
  const manifest = buildAuditSnapshotGovernanceArchiveManifest(signoff, validation.normalized, safetyNotes);
  const signedAuditGovernanceArchiveHash = computeArtifactEnvelopeSha256(manifest);
  const record = await createOfflineArtifactAuditSnapshotGovernanceArchiveRecord({
    input: validation.normalized,
    signedAuditGovernanceArchiveHash,
    safetyNotes,
    createdByUserId: payload.createdByUserId,
  });
  if (!record) {
    return rejectedAuditSnapshotGovernanceArchiveResult(payload.auditSnapshotGovernanceSignoffId, ["Offline artifact audit snapshot governance archive readiness could not be recorded."]);
  }

  return resultFromAuditSnapshotGovernanceArchiveRecord(record, validation.messages);
}

export const listOfflineArtifactAuditSnapshotGovernanceArchiveReadinessManifests = listOfflineArtifactAuditSnapshotGovernanceArchives;
export const listOfflineArtifactAuditSnapshotGovernanceArchiveReadinessForAuditSnapshotGovernanceSignoff = listOfflineArtifactAuditSnapshotGovernanceArchivesByAuditSnapshotGovernanceSignoffId;
export const listOfflineArtifactAuditSnapshotGovernanceArchiveReadinessForArtifact = listOfflineArtifactAuditSnapshotGovernanceArchivesByArtifactId;

export async function buildOfflineArtifactAuditSnapshotGovernanceArchiveSummary(): Promise<OfflineArtifactAuditSnapshotGovernanceArchiveSummary> {
  return getOfflineArtifactAuditSnapshotGovernanceArchiveSummary();
}
