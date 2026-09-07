import {
  createOfflineArtifactAuditSnapshotGovernanceSignoffRecord,
  getOfflineArtifactAuditSnapshotGovernanceSignoffSummary,
  listOfflineArtifactAuditSnapshotGovernanceSignoffs,
  listOfflineArtifactAuditSnapshotGovernanceSignoffsByArtifactId,
  listOfflineArtifactAuditSnapshotGovernanceSignoffsByAuditSnapshotId,
} from "../../db/domains/ml/mlOfflineArtifactAuditSnapshotGovernanceSignoffs.db";
import { getOfflineArtifactFinalizationChainAuditSnapshotById } from "../../db/domains/ml/mlOfflineArtifactFinalizationChainAuditSnapshots.db";
import { computeArtifactEnvelopeSha256 } from "./artifactHashing";
import { buildOfflineArtifactSafetyNotes, getOfflineArtifactIntakeSafetyGate } from "./artifactSafety";
import { validateOfflineArtifactAuditSnapshotGovernanceSignoffRequest } from "./artifactAuditSnapshotGovernanceSignoffValidation";
import type {
  NormalizedOfflineArtifactAuditSnapshotGovernanceSignoffInput,
  OfflineArtifactAuditSnapshotGovernanceSignoffRecord,
  OfflineArtifactAuditSnapshotGovernanceSignoffResult,
  OfflineArtifactAuditSnapshotGovernanceSignoffSummary,
  OfflineArtifactFinalizationChainAuditSnapshotRecord,
} from "./artifactIntakeTypes";

const nowIso = (): string => new Date().toISOString();

const rejectedAuditSnapshotGovernanceSignoffResult = (
  auditSnapshotId: string | number | null,
  validationMessages: string[],
): OfflineArtifactAuditSnapshotGovernanceSignoffResult => ({
  accepted: false,
  auditSnapshotId,
  auditSnapshotGovernanceSignoffId: null,
  signoffDecision: "needs_audit_snapshot_governance_review",
  signoffStatus: "needs_audit_snapshot_governance_review",
  signedAuditSnapshotGovernanceHash: null,
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

const resultFromAuditSnapshotGovernanceSignoffRecord = (
  record: OfflineArtifactAuditSnapshotGovernanceSignoffRecord,
  validationMessages: string[],
): OfflineArtifactAuditSnapshotGovernanceSignoffResult => ({
  accepted: true,
  auditSnapshotId: record.auditSnapshotId,
  auditSnapshotGovernanceSignoffId: record.id,
  signoffDecision: record.signoffDecision,
  signoffStatus: record.signoffStatus,
  signedAuditSnapshotGovernanceHash: record.signedAuditSnapshotGovernanceHash,
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

const buildAuditSnapshotGovernanceSignoffManifest = (
  auditSnapshot: OfflineArtifactFinalizationChainAuditSnapshotRecord,
  input: NormalizedOfflineArtifactAuditSnapshotGovernanceSignoffInput,
  safetyNotes: string[],
): Record<string, unknown> => ({
  phase: "Phase 6K — Offline Artifact Audit Snapshot Governance Signoff Readiness",
  mode: "metadata_audit_snapshot_governance_signoff_readiness_only",
  auditSnapshotId: auditSnapshot.id,
  finalizationId: auditSnapshot.finalizationId,
  retentionGovernanceArchiveId: auditSnapshot.retentionGovernanceArchiveId,
  retentionGovernanceReviewId: auditSnapshot.retentionGovernanceReviewId,
  retentionPolicyEvidenceId: auditSnapshot.retentionPolicyEvidenceId,
  archivePackId: auditSnapshot.archivePackId,
  signoffId: auditSnapshot.signoffId,
  binderId: auditSnapshot.binderId,
  artifactId: auditSnapshot.artifactId,
  artifactSha256: auditSnapshot.artifactSha256,
  modelKey: auditSnapshot.modelKey,
  modelVersion: auditSnapshot.modelVersion,
  signedAuditSnapshotHash: auditSnapshot.signedAuditSnapshotHash,
  signoffDecision: input.signoffDecision,
  signoffStatus: input.signoffStatus,
  signoffPurpose: input.signoffPurpose,
  auditReviewerSignoffNotes: input.auditReviewerSignoffNotes,
  exceptionNotes: input.exceptionNotes,
  rejectionReason: input.rejectionReason,
  governanceSignerDisplayName: input.governanceSignerDisplayName,
  snapshotAcceptanceJson: input.snapshotAcceptanceJson,
  evidenceConfidenceJson: input.evidenceConfidenceJson,
  exceptionNotesJson: input.exceptionNotesJson,
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

export async function signoffOfflineArtifactAuditSnapshotGovernanceReadiness(payload: {
  auditSnapshotId: string | number;
  request: unknown;
  createdByUserId?: string | number | null;
}): Promise<OfflineArtifactAuditSnapshotGovernanceSignoffResult> {
  const safetyGate = getOfflineArtifactIntakeSafetyGate();
  const validation = validateOfflineArtifactAuditSnapshotGovernanceSignoffRequest(payload.auditSnapshotId, payload.request, safetyGate);
  if (!validation.valid || !validation.normalized) {
    return rejectedAuditSnapshotGovernanceSignoffResult(payload.auditSnapshotId, validation.messages);
  }

  const auditSnapshot = await getOfflineArtifactFinalizationChainAuditSnapshotById(validation.normalized.auditSnapshotId);
  if (!auditSnapshot) {
    return rejectedAuditSnapshotGovernanceSignoffResult(payload.auditSnapshotId, ["Offline artifact finalization chain audit snapshot readiness record was not found for governance signoff readiness."]);
  }
  if (auditSnapshot.retentionJobScheduled || auditSnapshot.deletionOrPurgeAllowed || auditSnapshot.archiveFileCreated || auditSnapshot.artifactBytesIncluded) {
    return rejectedAuditSnapshotGovernanceSignoffResult(payload.auditSnapshotId, ["Audit snapshot governance signoff readiness refused because source audit snapshot must have no retention job, no deletion or purge, no file creation, and no artifact bytes."]);
  }

  const safetyNotes = [
    ...buildOfflineArtifactSafetyNotes(),
    "Phase 6K audit snapshot governance signoff readiness is metadata governance signoff only; it records human audit reviewer signoff, snapshot acceptance decision, exception notes, evidence confidence, and signed audit snapshot governance hash without scheduling retention jobs, deleting, purging, creating files, exporting files, including artifact bytes, executing artifacts, exposing inference, activating artifacts, releasing to production, or mutating business records.",
  ];
  const manifest = buildAuditSnapshotGovernanceSignoffManifest(auditSnapshot, validation.normalized, safetyNotes);
  const signedAuditSnapshotGovernanceHash = computeArtifactEnvelopeSha256(manifest);
  const record = await createOfflineArtifactAuditSnapshotGovernanceSignoffRecord({
    input: validation.normalized,
    signedAuditSnapshotGovernanceHash,
    safetyNotes,
    createdByUserId: payload.createdByUserId,
  });
  if (!record) {
    return rejectedAuditSnapshotGovernanceSignoffResult(payload.auditSnapshotId, ["Offline artifact audit snapshot governance signoff readiness could not be recorded."]);
  }

  return resultFromAuditSnapshotGovernanceSignoffRecord(record, validation.messages);
}

export const listOfflineArtifactAuditSnapshotGovernanceSignoffReadinessManifests = listOfflineArtifactAuditSnapshotGovernanceSignoffs;
export const listOfflineArtifactAuditSnapshotGovernanceSignoffsForAuditSnapshot = listOfflineArtifactAuditSnapshotGovernanceSignoffsByAuditSnapshotId;
export const listOfflineArtifactAuditSnapshotGovernanceSignoffsForArtifact = listOfflineArtifactAuditSnapshotGovernanceSignoffsByArtifactId;

export async function buildOfflineArtifactAuditSnapshotGovernanceSignoffSummary(): Promise<OfflineArtifactAuditSnapshotGovernanceSignoffSummary> {
  return getOfflineArtifactAuditSnapshotGovernanceSignoffSummary();
}
