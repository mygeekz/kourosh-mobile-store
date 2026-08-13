import { allAsync, getAsync, runAsync } from "../../query";
import { getOfflineArtifactAuditSnapshotGovernanceSignoffById } from "./mlOfflineArtifactAuditSnapshotGovernanceSignoffs.db";
import { clampLimit, safeJson } from "./mlDbUtils";
import { getOfflineArtifactIntakeSafetyGate } from "../../../intelligence/artifacts/artifactSafety";
import type {
  NormalizedOfflineArtifactAuditSnapshotGovernanceArchiveInput,
  OfflineArtifactAuditSnapshotGovernanceArchiveRecord,
  OfflineArtifactAuditSnapshotGovernanceArchiveSummary,
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

export const mapOfflineArtifactAuditSnapshotGovernanceArchiveRow = (
  row: Record<string, unknown> | undefined,
): OfflineArtifactAuditSnapshotGovernanceArchiveRecord | null => {
  if (!row) return null;
  return {
    id: Number(row.id),
    auditSnapshotGovernanceSignoffId: Number(row.auditSnapshotGovernanceSignoffId),
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
    signedAuditSnapshotGovernanceHash: String(row.signedAuditSnapshotGovernanceHash || ""),
    archiveDecision: String(row.archiveDecision || ""),
    archiveStatus: String(row.archiveStatus || ""),
    archivePurpose: String(row.archivePurpose || ""),
    archivistNotes: String(row.archivistNotes || ""),
    rejectionReason: row.rejectionReason == null ? null : String(row.rejectionReason),
    governanceArchiveManifestJson: parseJson<Record<string, unknown>>(row.governanceArchiveManifestJson, {}),
    signerTrailJson: parseJson<Record<string, unknown>>(row.signerTrailJson, {}),
    exceptionSummaryJson: parseJson<Record<string, unknown>>(row.exceptionSummaryJson, {}),
    evidenceConfidenceDigestJson: parseJson<Record<string, unknown>>(row.evidenceConfidenceDigestJson, {}),
    safetyNotes: parseJson<string[]>(row.safetyNotesJson, []),
    signedAuditGovernanceArchiveHash: String(row.signedAuditGovernanceArchiveHash || ""),
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
    archivistDisplayName: row.archivistDisplayName == null ? null : String(row.archivistDisplayName),
    createdAt: String(row.createdAt || ""),
  };
};

const offlineArtifactAuditSnapshotGovernanceArchiveSelect = `
  SELECT id,
         audit_snapshot_governance_signoff_id AS auditSnapshotGovernanceSignoffId,
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
         signed_audit_snapshot_governance_hash AS signedAuditSnapshotGovernanceHash,
         archive_decision AS archiveDecision,
         archive_status AS archiveStatus,
         archive_purpose AS archivePurpose,
         archivist_notes AS archivistNotes,
         rejection_reason AS rejectionReason,
         governance_archive_manifest_json AS governanceArchiveManifestJson,
         signer_trail_json AS signerTrailJson,
         exception_summary_json AS exceptionSummaryJson,
         evidence_confidence_digest_json AS evidenceConfidenceDigestJson,
         safety_notes_json AS safetyNotesJson,
         signed_audit_governance_archive_hash AS signedAuditGovernanceArchiveHash,
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
         archivist_display_name AS archivistDisplayName,
         created_at AS createdAt
  FROM ml_offline_artifact_audit_snapshot_governance_archives
`;

export const createOfflineArtifactAuditSnapshotGovernanceArchiveRecord = async (payload: {
  input: NormalizedOfflineArtifactAuditSnapshotGovernanceArchiveInput;
  signedAuditGovernanceArchiveHash: string;
  safetyNotes: string[];
  createdByUserId?: string | number | null;
}): Promise<OfflineArtifactAuditSnapshotGovernanceArchiveRecord | null> => {
  const gate = getOfflineArtifactIntakeSafetyGate();
  const signoff = await getOfflineArtifactAuditSnapshotGovernanceSignoffById(payload.input.auditSnapshotGovernanceSignoffId);
  if (!signoff) return null;

  const result = await runAsync(
    `
      INSERT INTO ml_offline_artifact_audit_snapshot_governance_archives (
        audit_snapshot_governance_signoff_id, audit_snapshot_id, finalization_id, retention_governance_archive_id,
        retention_governance_review_id, retention_policy_evidence_id, archive_pack_id, signoff_id, binder_id,
        artifact_id, artifact_sha256, model_key, model_version, signed_audit_snapshot_governance_hash,
        archive_decision, archive_status, archive_purpose, archivist_notes, rejection_reason,
        governance_archive_manifest_json, signer_trail_json, exception_summary_json, evidence_confidence_digest_json,
        safety_notes_json, signed_audit_governance_archive_hash, retention_job_scheduled, deletion_or_purge_allowed,
        archive_file_created, artifact_bytes_included, artifact_execution_allowed, artifact_auto_activation_allowed,
        model_execution_allowed, inference_endpoint_exposed, production_integration_allowed, can_mutate_business_records,
        created_by_user_id, archivist_display_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      signoff.id,
      signoff.auditSnapshotId,
      signoff.finalizationId,
      signoff.retentionGovernanceArchiveId,
      signoff.retentionGovernanceReviewId,
      signoff.retentionPolicyEvidenceId,
      signoff.archivePackId,
      signoff.signoffId,
      signoff.binderId,
      signoff.artifactId,
      signoff.artifactSha256,
      signoff.modelKey,
      signoff.modelVersion,
      signoff.signedAuditSnapshotGovernanceHash,
      payload.input.archiveDecision,
      payload.input.archiveStatus,
      payload.input.archivePurpose,
      payload.input.archivistNotes,
      payload.input.rejectionReason,
      safeJson(payload.input.governanceArchiveManifestJson),
      safeJson(payload.input.signerTrailJson),
      safeJson(payload.input.exceptionSummaryJson),
      safeJson(payload.input.evidenceConfidenceDigestJson),
      safeJson(payload.safetyNotes),
      payload.signedAuditGovernanceArchiveHash,
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
      payload.input.archivistDisplayName,
    ],
  );

  return getOfflineArtifactAuditSnapshotGovernanceArchiveById(result.lastID);
};

export const getOfflineArtifactAuditSnapshotGovernanceArchiveById = async (
  idInput: unknown,
): Promise<OfflineArtifactAuditSnapshotGovernanceArchiveRecord | null> => {
  const id = Number(idInput);
  if (!Number.isFinite(id) || id <= 0) return null;
  const row = await getAsync(`${offlineArtifactAuditSnapshotGovernanceArchiveSelect} WHERE id = ?`, [id]);
  return mapOfflineArtifactAuditSnapshotGovernanceArchiveRow(row);
};

export const listOfflineArtifactAuditSnapshotGovernanceArchives = async (
  limitInput?: unknown,
): Promise<OfflineArtifactAuditSnapshotGovernanceArchiveRecord[]> => {
  const limit = clampLimit(limitInput, 25, 200);
  const rows = await allAsync(`${offlineArtifactAuditSnapshotGovernanceArchiveSelect} ORDER BY created_at DESC, id DESC LIMIT ?`, [limit]);
  return rows.map((row) => mapOfflineArtifactAuditSnapshotGovernanceArchiveRow(row)).filter((row): row is OfflineArtifactAuditSnapshotGovernanceArchiveRecord => row !== null);
};

export const listOfflineArtifactAuditSnapshotGovernanceArchivesByAuditSnapshotGovernanceSignoffId = async (
  auditSnapshotGovernanceSignoffIdInput: unknown,
  limitInput?: unknown,
): Promise<OfflineArtifactAuditSnapshotGovernanceArchiveRecord[]> => {
  const auditSnapshotGovernanceSignoffId = Number(auditSnapshotGovernanceSignoffIdInput);
  if (!Number.isFinite(auditSnapshotGovernanceSignoffId) || auditSnapshotGovernanceSignoffId <= 0) return [];
  const limit = clampLimit(limitInput, 25, 200);
  const rows = await allAsync(
    `${offlineArtifactAuditSnapshotGovernanceArchiveSelect} WHERE audit_snapshot_governance_signoff_id = ? ORDER BY created_at DESC, id DESC LIMIT ?`,
    [auditSnapshotGovernanceSignoffId, limit],
  );
  return rows.map((row) => mapOfflineArtifactAuditSnapshotGovernanceArchiveRow(row)).filter((row): row is OfflineArtifactAuditSnapshotGovernanceArchiveRecord => row !== null);
};

export const listOfflineArtifactAuditSnapshotGovernanceArchivesByArtifactId = async (
  artifactIdInput: unknown,
  limitInput?: unknown,
): Promise<OfflineArtifactAuditSnapshotGovernanceArchiveRecord[]> => {
  const artifactId = Number(artifactIdInput);
  if (!Number.isFinite(artifactId) || artifactId <= 0) return [];
  const limit = clampLimit(limitInput, 25, 200);
  const rows = await allAsync(
    `${offlineArtifactAuditSnapshotGovernanceArchiveSelect} WHERE artifact_id = ? ORDER BY created_at DESC, id DESC LIMIT ?`,
    [artifactId, limit],
  );
  return rows.map((row) => mapOfflineArtifactAuditSnapshotGovernanceArchiveRow(row)).filter((row): row is OfflineArtifactAuditSnapshotGovernanceArchiveRecord => row !== null);
};

export const getLatestOfflineArtifactAuditSnapshotGovernanceArchiveForAuditSnapshotGovernanceSignoff = async (
  auditSnapshotGovernanceSignoffIdInput: unknown,
): Promise<OfflineArtifactAuditSnapshotGovernanceArchiveRecord | null> => {
  const auditSnapshotGovernanceSignoffId = Number(auditSnapshotGovernanceSignoffIdInput);
  if (!Number.isFinite(auditSnapshotGovernanceSignoffId) || auditSnapshotGovernanceSignoffId <= 0) return null;
  const row = await getAsync(
    `${offlineArtifactAuditSnapshotGovernanceArchiveSelect} WHERE audit_snapshot_governance_signoff_id = ? ORDER BY created_at DESC, id DESC LIMIT 1`,
    [auditSnapshotGovernanceSignoffId],
  );
  return mapOfflineArtifactAuditSnapshotGovernanceArchiveRow(row);
};

export const getOfflineArtifactAuditSnapshotGovernanceArchiveSummary = async (): Promise<OfflineArtifactAuditSnapshotGovernanceArchiveSummary> => {
  const aggregate = await getAsync(`
    SELECT COUNT(*) AS auditSnapshotGovernanceArchiveRecords,
           SUM(CASE WHEN archive_status = 'prepared_audit_governance_archive' THEN 1 ELSE 0 END) AS preparedAuditSnapshotGovernanceArchiveRecords,
           SUM(CASE WHEN archive_status = 'pending_audit_governance_archive_review' OR archive_status = 'needs_audit_governance_archive_review' THEN 1 ELSE 0 END) AS pendingAuditSnapshotGovernanceArchiveRecords,
           SUM(CASE WHEN archive_status = 'rejected' THEN 1 ELSE 0 END) AS rejectedAuditSnapshotGovernanceArchiveRecords,
           SUM(CASE WHEN archive_status = 'archived' THEN 1 ELSE 0 END) AS archivedAuditSnapshotGovernanceArchiveRecords,
           SUM(CASE WHEN signed_audit_governance_archive_hash IS NOT NULL AND length(signed_audit_governance_archive_hash) = 64 THEN 1 ELSE 0 END) AS signedAuditSnapshotGovernanceArchiveRecords
    FROM ml_offline_artifact_audit_snapshot_governance_archives
  `).catch(() => null);
  const latestAuditSnapshotGovernanceArchive = (await listOfflineArtifactAuditSnapshotGovernanceArchives(1))[0] || null;
  return {
    auditSnapshotGovernanceArchiveRecords: Number(aggregate?.auditSnapshotGovernanceArchiveRecords || 0),
    preparedAuditSnapshotGovernanceArchiveRecords: Number(aggregate?.preparedAuditSnapshotGovernanceArchiveRecords || 0),
    pendingAuditSnapshotGovernanceArchiveRecords: Number(aggregate?.pendingAuditSnapshotGovernanceArchiveRecords || 0),
    rejectedAuditSnapshotGovernanceArchiveRecords: Number(aggregate?.rejectedAuditSnapshotGovernanceArchiveRecords || 0),
    archivedAuditSnapshotGovernanceArchiveRecords: Number(aggregate?.archivedAuditSnapshotGovernanceArchiveRecords || 0),
    signedAuditSnapshotGovernanceArchiveRecords: Number(aggregate?.signedAuditSnapshotGovernanceArchiveRecords || 0),
    latestAuditSnapshotGovernanceArchive,
    safetyStatus: getOfflineArtifactIntakeSafetyGate(),
    auditSnapshotGovernanceArchiveMode: "metadata_audit_snapshot_governance_archive_readiness_only",
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
