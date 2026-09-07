import { allAsync, getAsync, runAsync } from "../../query";
import { getOfflineArtifactGovernanceArchiveChainFinalizationById } from "./mlOfflineArtifactGovernanceArchiveChainFinalizations.db";
import { clampLimit, safeJson } from "./mlDbUtils";
import { getOfflineArtifactIntakeSafetyGate } from "../../../intelligence/artifacts/artifactSafety";
import type {
  NormalizedOfflineArtifactFinalizationChainAuditSnapshotInput,
  OfflineArtifactFinalizationChainAuditSnapshotRecord,
  OfflineArtifactFinalizationChainAuditSnapshotSummary,
  OfflineArtifactAuditSnapshotGovernanceSignoffRecord,
} from "../../../intelligence/artifacts/artifactIntakeTypes";

const toBoolean = (value: unknown): boolean => Number(value) === 1;

const parseJson = <T>(value: unknown, fallback: T): T => {
  if (typeof value !== "string" || value.trim().length === 0) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch (_err) {
    return fallback;
  }
};

export const mapOfflineArtifactFinalizationChainAuditSnapshotRow = (
  row: Record<string, unknown> | undefined,
): OfflineArtifactFinalizationChainAuditSnapshotRecord | null => {
  if (!row) return null;
  return {
    id: Number(row.id),
    finalizationId: Number(row.finalizationId),
    retentionGovernanceArchiveId: Number(row.retentionGovernanceArchiveId),
    retentionGovernanceReviewId: Number(row.retentionGovernanceReviewId),
    retentionPolicyEvidenceId: Number(row.retentionPolicyEvidenceId),
    archivePackId: Number(row.archivePackId),
    signoffId: Number(row.signoffId),
    binderId: Number(row.binderId),
    artifactId: Number(row.artifactId),
    artifactSha256: String(row.artifactSha256 || ""),
    modelKey: String(row.modelKey || ""),
    modelVersion: String(row.modelVersion || ""),
    signedFinalizationReadinessHash: String(row.signedFinalizationReadinessHash || ""),
    auditSnapshotDecision: String(row.auditSnapshotDecision || ""),
    auditSnapshotStatus: String(row.auditSnapshotStatus || ""),
    snapshotPurpose: String(row.snapshotPurpose || ""),
    snapshotTimestamp: String(row.snapshotTimestamp || ""),
    auditReviewerNotes: String(row.auditReviewerNotes || ""),
    rejectionReason: row.rejectionReason == null ? null : String(row.rejectionReason),
    finalChainDigestJson: parseJson<Record<string, unknown>>(row.finalChainDigestJson, {}),
    reviewerTrailDigestJson: parseJson<Record<string, unknown>>(row.reviewerTrailDigestJson, {}),
    immutableEvidenceSummaryJson: parseJson<Record<string, unknown>>(row.immutableEvidenceSummaryJson, {}),
    evidenceIndexJson: parseJson<Record<string, unknown>>(row.evidenceIndexJson, {}),
    safetyNotes: parseJson<string[]>(row.safetyNotesJson, []),
    signedAuditSnapshotHash: String(row.signedAuditSnapshotHash || ""),
    retentionJobScheduled: toBoolean(row.retentionJobScheduled),
    deletionOrPurgeAllowed: toBoolean(row.deletionOrPurgeAllowed),
    archiveFileCreated: toBoolean(row.archiveFileCreated),
    artifactBytesIncluded: toBoolean(row.artifactBytesIncluded),
    artifactExecutionAllowed: toBoolean(row.artifactExecutionAllowed),
    artifactAutoActivationAllowed: toBoolean(row.artifactAutoActivationAllowed),
    modelExecutionAllowed: toBoolean(row.modelExecutionAllowed),
    inferenceEndpointExposed: toBoolean(row.inferenceEndpointExposed),
    productionIntegrationAllowed: toBoolean(row.productionIntegrationAllowed),
    canMutateBusinessRecords: toBoolean(row.canMutateBusinessRecords),
    createdByUserId: row.createdByUserId as string | number | null,
    auditReviewerDisplayName: row.auditReviewerDisplayName == null ? null : String(row.auditReviewerDisplayName),
    createdAt: String(row.createdAt || ""),
  };
};

const offlineArtifactFinalizationChainAuditSnapshotSelect = `
  SELECT id,
         finalization_id AS finalizationId,
         retention_governance_archive_id AS retentionGovernanceArchiveId,
         retention_governance_review_id AS retentionGovernanceReviewId,
         retention_policy_evidence_id AS retentionPolicyEvidenceId,
         archive_pack_id AS archivePackId,
         signoff_id AS signoffId,
         binder_id AS binderId,
         artifact_id AS artifactId,
         artifact_sha256 AS artifactSha256,
         model_key AS modelKey,
         model_version AS modelVersion,
         signed_finalization_readiness_hash AS signedFinalizationReadinessHash,
         audit_snapshot_decision AS auditSnapshotDecision,
         audit_snapshot_status AS auditSnapshotStatus,
         snapshot_purpose AS snapshotPurpose,
         snapshot_timestamp AS snapshotTimestamp,
         audit_reviewer_notes AS auditReviewerNotes,
         rejection_reason AS rejectionReason,
         final_chain_digest_json AS finalChainDigestJson,
         reviewer_trail_digest_json AS reviewerTrailDigestJson,
         immutable_evidence_summary_json AS immutableEvidenceSummaryJson,
         evidence_index_json AS evidenceIndexJson,
         safety_notes_json AS safetyNotesJson,
         signed_audit_snapshot_hash AS signedAuditSnapshotHash,
         retention_job_scheduled AS retentionJobScheduled,
         deletion_or_purge_allowed AS deletionOrPurgeAllowed,
         archive_file_created AS archiveFileCreated,
         artifact_bytes_included AS artifactBytesIncluded,
         artifact_execution_allowed AS artifactExecutionAllowed,
         artifact_auto_activation_allowed AS artifactAutoActivationAllowed,
         model_execution_allowed AS modelExecutionAllowed,
         inference_endpoint_exposed AS inferenceEndpointExposed,
         production_integration_allowed AS productionIntegrationAllowed,
         can_mutate_business_records AS canMutateBusinessRecords,
         created_by_user_id AS createdByUserId,
         audit_reviewer_display_name AS auditReviewerDisplayName,
         created_at AS createdAt
  FROM ml_offline_artifact_finalization_chain_audit_snapshots
`;

export const createOfflineArtifactFinalizationChainAuditSnapshotRecord = async (payload: {
  input: NormalizedOfflineArtifactFinalizationChainAuditSnapshotInput;
  signedAuditSnapshotHash: string;
  safetyNotes: string[];
  createdByUserId?: string | number | null;
}): Promise<OfflineArtifactFinalizationChainAuditSnapshotRecord | null> => {
  const gate = getOfflineArtifactIntakeSafetyGate();
  const finalization = await getOfflineArtifactGovernanceArchiveChainFinalizationById(payload.input.finalizationId);
  if (!finalization) return null;

  const result = await runAsync(
    `
      INSERT INTO ml_offline_artifact_finalization_chain_audit_snapshots (
        finalization_id, retention_governance_archive_id, retention_governance_review_id, retention_policy_evidence_id,
        archive_pack_id, signoff_id, binder_id, artifact_id, artifact_sha256, model_key, model_version,
        signed_finalization_readiness_hash, audit_snapshot_decision, audit_snapshot_status, snapshot_purpose,
        snapshot_timestamp, audit_reviewer_notes, rejection_reason, final_chain_digest_json, reviewer_trail_digest_json,
        immutable_evidence_summary_json, evidence_index_json, safety_notes_json, signed_audit_snapshot_hash,
        retention_job_scheduled, deletion_or_purge_allowed, archive_file_created, artifact_bytes_included,
        artifact_execution_allowed, artifact_auto_activation_allowed, model_execution_allowed, inference_endpoint_exposed,
        production_integration_allowed, can_mutate_business_records, created_by_user_id, audit_reviewer_display_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      finalization.id,
      finalization.retentionGovernanceArchiveId,
      finalization.retentionGovernanceReviewId,
      finalization.retentionPolicyEvidenceId,
      finalization.archivePackId,
      finalization.signoffId,
      finalization.binderId,
      finalization.artifactId,
      finalization.artifactSha256,
      finalization.modelKey,
      finalization.modelVersion,
      finalization.signedFinalizationReadinessHash,
      payload.input.auditSnapshotDecision,
      payload.input.auditSnapshotStatus,
      payload.input.snapshotPurpose,
      payload.input.snapshotTimestamp,
      payload.input.auditReviewerNotes,
      payload.input.rejectionReason,
      safeJson(payload.input.finalChainDigestJson),
      safeJson(payload.input.reviewerTrailDigestJson),
      safeJson(payload.input.immutableEvidenceSummaryJson),
      safeJson(payload.input.evidenceIndexJson),
      safeJson(payload.safetyNotes),
      payload.signedAuditSnapshotHash,
      0,
      0,
      0,
      0,
      gate.artifactExecutionAllowed ? 1 : 0,
      gate.artifactAutoActivationAllowed ? 1 : 0,
      gate.modelExecutionAllowed ? 1 : 0,
      gate.inferenceEndpointExposed ? 1 : 0,
      gate.productionIntegrationAllowed ? 1 : 0,
      gate.canMutateBusinessRecords ? 1 : 0,
      payload.createdByUserId == null ? null : String(payload.createdByUserId),
      payload.input.auditReviewerDisplayName,
    ],
  );

  return getOfflineArtifactFinalizationChainAuditSnapshotById(result.lastID);
};

export const getOfflineArtifactFinalizationChainAuditSnapshotById = async (
  idInput: unknown,
): Promise<OfflineArtifactFinalizationChainAuditSnapshotRecord | null> => {
  const id = Number(idInput);
  if (!Number.isFinite(id) || id <= 0) return null;
  const row = await getAsync(`${offlineArtifactFinalizationChainAuditSnapshotSelect} WHERE id = ?`, [id]);
  return mapOfflineArtifactFinalizationChainAuditSnapshotRow(row);
};

export const listOfflineArtifactFinalizationChainAuditSnapshots = async (
  limitInput?: unknown,
): Promise<OfflineArtifactFinalizationChainAuditSnapshotRecord[]> => {
  const limit = clampLimit(limitInput, 25, 200);
  const rows = await allAsync(`${offlineArtifactFinalizationChainAuditSnapshotSelect} ORDER BY created_at DESC, id DESC LIMIT ?`, [limit]);
  return rows
    .map((row) => mapOfflineArtifactFinalizationChainAuditSnapshotRow(row))
    .filter((row): row is OfflineArtifactFinalizationChainAuditSnapshotRecord => row !== null);
};

export const listOfflineArtifactFinalizationChainAuditSnapshotsByFinalizationId = async (
  finalizationIdInput: unknown,
  limitInput?: unknown,
): Promise<OfflineArtifactFinalizationChainAuditSnapshotRecord[]> => {
  const finalizationId = Number(finalizationIdInput);
  if (!Number.isFinite(finalizationId) || finalizationId <= 0) return [];
  const limit = clampLimit(limitInput, 25, 200);
  const rows = await allAsync(
    `${offlineArtifactFinalizationChainAuditSnapshotSelect} WHERE finalization_id = ? ORDER BY created_at DESC, id DESC LIMIT ?`,
    [finalizationId, limit],
  );
  return rows
    .map((row) => mapOfflineArtifactFinalizationChainAuditSnapshotRow(row))
    .filter((row): row is OfflineArtifactFinalizationChainAuditSnapshotRecord => row !== null);
};

export const listOfflineArtifactFinalizationChainAuditSnapshotsByArtifactId = async (
  artifactIdInput: unknown,
  limitInput?: unknown,
): Promise<OfflineArtifactFinalizationChainAuditSnapshotRecord[]> => {
  const artifactId = Number(artifactIdInput);
  if (!Number.isFinite(artifactId) || artifactId <= 0) return [];
  const limit = clampLimit(limitInput, 25, 200);
  const rows = await allAsync(
    `${offlineArtifactFinalizationChainAuditSnapshotSelect} WHERE artifact_id = ? ORDER BY created_at DESC, id DESC LIMIT ?`,
    [artifactId, limit],
  );
  return rows
    .map((row) => mapOfflineArtifactFinalizationChainAuditSnapshotRow(row))
    .filter((row): row is OfflineArtifactFinalizationChainAuditSnapshotRecord => row !== null);
};

export const getLatestOfflineArtifactFinalizationChainAuditSnapshotForFinalization = async (
  finalizationIdInput: unknown,
): Promise<OfflineArtifactFinalizationChainAuditSnapshotRecord | null> => {
  const finalizationId = Number(finalizationIdInput);
  if (!Number.isFinite(finalizationId) || finalizationId <= 0) return null;
  const row = await getAsync(
    `${offlineArtifactFinalizationChainAuditSnapshotSelect} WHERE finalization_id = ? ORDER BY created_at DESC, id DESC LIMIT 1`,
    [finalizationId],
  );
  return mapOfflineArtifactFinalizationChainAuditSnapshotRow(row);
};


const mapLatestAuditSnapshotGovernanceSignoffRow = (row: Record<string, unknown> | undefined): OfflineArtifactAuditSnapshotGovernanceSignoffRecord | null => {
  if (!row) return null;
  return {
    id: Number(row.id),
    auditSnapshotId: Number(row.auditSnapshotId),
    finalizationId: Number(row.finalizationId),
    retentionGovernanceArchiveId: Number(row.retentionGovernanceArchiveId),
    retentionGovernanceReviewId: Number(row.retentionGovernanceReviewId),
    retentionPolicyEvidenceId: Number(row.retentionPolicyEvidenceId),
    archivePackId: Number(row.archivePackId),
    signoffId: Number(row.signoffId),
    binderId: Number(row.binderId),
    artifactId: Number(row.artifactId),
    artifactSha256: String(row.artifactSha256 || ""),
    modelKey: String(row.modelKey || ""),
    modelVersion: String(row.modelVersion || ""),
    signedAuditSnapshotHash: String(row.signedAuditSnapshotHash || ""),
    signoffDecision: String(row.signoffDecision || ""),
    signoffStatus: String(row.signoffStatus || ""),
    signoffPurpose: String(row.signoffPurpose || ""),
    auditReviewerSignoffNotes: String(row.auditReviewerSignoffNotes || ""),
    exceptionNotes: row.exceptionNotes == null ? null : String(row.exceptionNotes),
    rejectionReason: row.rejectionReason == null ? null : String(row.rejectionReason),
    snapshotAcceptanceJson: parseJson<Record<string, unknown>>(row.snapshotAcceptanceJson, {}),
    evidenceConfidenceJson: parseJson<Record<string, unknown>>(row.evidenceConfidenceJson, {}),
    exceptionNotesJson: parseJson<Record<string, unknown>>(row.exceptionNotesJson, {}),
    safetyNotes: parseJson<string[]>(row.safetyNotesJson, []),
    signedAuditSnapshotGovernanceHash: String(row.signedAuditSnapshotGovernanceHash || ""),
    retentionJobScheduled: toBoolean(row.retentionJobScheduled),
    deletionOrPurgeAllowed: toBoolean(row.deletionOrPurgeAllowed),
    archiveFileCreated: toBoolean(row.archiveFileCreated),
    artifactBytesIncluded: toBoolean(row.artifactBytesIncluded),
    artifactExecutionAllowed: toBoolean(row.artifactExecutionAllowed),
    artifactAutoActivationAllowed: toBoolean(row.artifactAutoActivationAllowed),
    modelExecutionAllowed: toBoolean(row.modelExecutionAllowed),
    inferenceEndpointExposed: toBoolean(row.inferenceEndpointExposed),
    productionIntegrationAllowed: toBoolean(row.productionIntegrationAllowed),
    canMutateBusinessRecords: toBoolean(row.canMutateBusinessRecords),
    createdByUserId: row.createdByUserId as string | number | null,
    governanceSignerDisplayName: row.governanceSignerDisplayName == null ? null : String(row.governanceSignerDisplayName),
    createdAt: String(row.createdAt || ""),
  };
};

export const getOfflineArtifactFinalizationChainAuditSnapshotSummary = async (): Promise<OfflineArtifactFinalizationChainAuditSnapshotSummary> => {
  const aggregate = await getAsync(`
    SELECT COUNT(*) AS auditSnapshotRecords,
           SUM(CASE WHEN audit_snapshot_status = 'prepared_finalization_chain_audit_snapshot' THEN 1 ELSE 0 END) AS preparedAuditSnapshotRecords,
           SUM(CASE WHEN audit_snapshot_status = 'pending_audit_snapshot_review' OR audit_snapshot_status = 'needs_audit_snapshot_review' THEN 1 ELSE 0 END) AS pendingAuditSnapshotRecords,
           SUM(CASE WHEN audit_snapshot_status = 'rejected' THEN 1 ELSE 0 END) AS rejectedAuditSnapshotRecords,
           SUM(CASE WHEN audit_snapshot_status = 'archived' THEN 1 ELSE 0 END) AS archivedAuditSnapshotRecords,
           SUM(CASE WHEN signed_audit_snapshot_hash IS NOT NULL AND length(signed_audit_snapshot_hash) = 64 THEN 1 ELSE 0 END) AS signedAuditSnapshotRecords
    FROM ml_offline_artifact_finalization_chain_audit_snapshots
  `).catch(() => null);
  const latestAuditSnapshot = (await listOfflineArtifactFinalizationChainAuditSnapshots(1))[0] || null;
  const auditSnapshotGovernanceSignoffAggregate = await getAsync(`
    SELECT COUNT(*) AS auditSnapshotGovernanceSignoffRecords,
           SUM(CASE WHEN signoff_status = 'accepted_audit_snapshot_governance_signoff' THEN 1 ELSE 0 END) AS acceptedAuditSnapshotGovernanceSignoffRecords,
           SUM(CASE WHEN signoff_status = 'pending_audit_snapshot_governance_review' OR signoff_status = 'needs_audit_snapshot_governance_review' THEN 1 ELSE 0 END) AS pendingAuditSnapshotGovernanceSignoffRecords,
           SUM(CASE WHEN signoff_status = 'rejected' THEN 1 ELSE 0 END) AS rejectedAuditSnapshotGovernanceSignoffRecords,
           SUM(CASE WHEN signed_audit_snapshot_governance_hash IS NOT NULL AND length(signed_audit_snapshot_governance_hash) = 64 THEN 1 ELSE 0 END) AS signedAuditSnapshotGovernanceSignoffRecords
    FROM ml_offline_artifact_audit_snapshot_governance_signoffs
  `).catch(() => null);
  const latestAuditSnapshotGovernanceSignoffRow = await getAsync(`
    SELECT id,
           audit_snapshot_id AS auditSnapshotId,
           finalization_id AS finalizationId,
           retention_governance_archive_id AS retentionGovernanceArchiveId,
           retention_governance_review_id AS retentionGovernanceReviewId,
           retention_policy_evidence_id AS retentionPolicyEvidenceId,
           archive_pack_id AS archivePackId,
           signoff_id AS signoffId,
           binder_id AS binderId,
           artifact_id AS artifactId,
           artifact_sha256 AS artifactSha256,
           model_key AS modelKey,
           model_version AS modelVersion,
           signed_audit_snapshot_hash AS signedAuditSnapshotHash,
           signoff_decision AS signoffDecision,
           signoff_status AS signoffStatus,
           signoff_purpose AS signoffPurpose,
           audit_reviewer_signoff_notes AS auditReviewerSignoffNotes,
           exception_notes AS exceptionNotes,
           rejection_reason AS rejectionReason,
           snapshot_acceptance_json AS snapshotAcceptanceJson,
           evidence_confidence_json AS evidenceConfidenceJson,
           exception_notes_json AS exceptionNotesJson,
           safety_notes_json AS safetyNotesJson,
           signed_audit_snapshot_governance_hash AS signedAuditSnapshotGovernanceHash,
           retention_job_scheduled AS retentionJobScheduled,
           deletion_or_purge_allowed AS deletionOrPurgeAllowed,
           archive_file_created AS archiveFileCreated,
           artifact_bytes_included AS artifactBytesIncluded,
           artifact_execution_allowed AS artifactExecutionAllowed,
           artifact_auto_activation_allowed AS artifactAutoActivationAllowed,
           model_execution_allowed AS modelExecutionAllowed,
           inference_endpoint_exposed AS inferenceEndpointExposed,
           production_integration_allowed AS productionIntegrationAllowed,
           can_mutate_business_records AS canMutateBusinessRecords,
           created_by_user_id AS createdByUserId,
           governance_signer_display_name AS governanceSignerDisplayName,
           created_at AS createdAt
    FROM ml_offline_artifact_audit_snapshot_governance_signoffs
    ORDER BY created_at DESC, id DESC
    LIMIT 1
  `).catch(() => null);
  return {
    auditSnapshotRecords: Number(aggregate?.auditSnapshotRecords || 0),
    preparedAuditSnapshotRecords: Number(aggregate?.preparedAuditSnapshotRecords || 0),
    pendingAuditSnapshotRecords: Number(aggregate?.pendingAuditSnapshotRecords || 0),
    rejectedAuditSnapshotRecords: Number(aggregate?.rejectedAuditSnapshotRecords || 0),
    archivedAuditSnapshotRecords: Number(aggregate?.archivedAuditSnapshotRecords || 0),
    signedAuditSnapshotRecords: Number(aggregate?.signedAuditSnapshotRecords || 0),
    latestAuditSnapshot,
    auditSnapshotGovernanceSignoffRecords: Number(auditSnapshotGovernanceSignoffAggregate?.auditSnapshotGovernanceSignoffRecords || 0),
    acceptedAuditSnapshotGovernanceSignoffRecords: Number(auditSnapshotGovernanceSignoffAggregate?.acceptedAuditSnapshotGovernanceSignoffRecords || 0),
    pendingAuditSnapshotGovernanceSignoffRecords: Number(auditSnapshotGovernanceSignoffAggregate?.pendingAuditSnapshotGovernanceSignoffRecords || 0),
    rejectedAuditSnapshotGovernanceSignoffRecords: Number(auditSnapshotGovernanceSignoffAggregate?.rejectedAuditSnapshotGovernanceSignoffRecords || 0),
    signedAuditSnapshotGovernanceSignoffRecords: Number(auditSnapshotGovernanceSignoffAggregate?.signedAuditSnapshotGovernanceSignoffRecords || 0),
    latestAuditSnapshotGovernanceSignoff: mapLatestAuditSnapshotGovernanceSignoffRow(latestAuditSnapshotGovernanceSignoffRow),
    safetyStatus: getOfflineArtifactIntakeSafetyGate(),
    finalizationChainAuditSnapshotMode: "metadata_finalization_chain_audit_snapshot_readiness_only",
    retentionJobScheduled: false,
    deletionOrPurgeAllowed: false,
    archiveFileCreated: false,
    artifactBytesIncluded: false,
    execution: "Off",
    autoActivation: "Off",
    productionInference: "Not exposed",
    productionIntegration: "Off",
    noBusinessMutation: true,
  };
};
