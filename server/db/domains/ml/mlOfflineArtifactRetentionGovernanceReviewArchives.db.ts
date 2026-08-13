import { allAsync, getAsync, runAsync } from "../../query";
import { getOfflineArtifactRetentionEvidenceGovernanceReviewById } from "./mlOfflineArtifactRetentionEvidenceGovernanceReviews.db";
import { clampLimit, safeJson } from "./mlDbUtils";
import { getOfflineArtifactIntakeSafetyGate } from "../../../intelligence/artifacts/artifactSafety";
import type {
  NormalizedOfflineArtifactRetentionGovernanceReviewArchiveInput,
  OfflineArtifactRetentionGovernanceReviewArchiveRecord,
  OfflineArtifactRetentionGovernanceReviewArchiveSummary,
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

export const mapOfflineArtifactRetentionGovernanceReviewArchiveRow = (
  row: Record<string, unknown> | undefined,
): OfflineArtifactRetentionGovernanceReviewArchiveRecord | null => {
  if (!row) return null;
  return {
    id: Number(row.id),
    retentionGovernanceReviewId: Number(row.retentionGovernanceReviewId),
    retentionPolicyEvidenceId: Number(row.retentionPolicyEvidenceId),
    archivePackId: Number(row.archivePackId),
    signoffId: Number(row.signoffId),
    binderId: Number(row.binderId),
    artifactId: Number(row.artifactId),
    artifactSha256: String(row.artifactSha256 || ""),
    modelKey: String(row.modelKey || ""),
    modelVersion: String(row.modelVersion || ""),
    signedRetentionGovernanceHash: String(row.signedRetentionGovernanceHash || ""),
    archiveDecision: String(row.archiveDecision || ""),
    archiveStatus: String(row.archiveStatus || ""),
    archivePurpose: String(row.archivePurpose || ""),
    archivistNotes: String(row.archivistNotes || ""),
    rejectionReason: row.rejectionReason == null ? null : String(row.rejectionReason),
    archiveManifestJson: parseJson<Record<string, unknown>>(row.archiveManifestJson, {}),
    reviewerTrailJson: parseJson<Record<string, unknown>>(row.reviewerTrailJson, {}),
    retentionGovernanceChainJson: parseJson<Record<string, unknown>>(row.retentionGovernanceChainJson, {}),
    evidenceIndexJson: parseJson<Record<string, unknown>>(row.evidenceIndexJson, {}),
    safetyNotes: parseJson<string[]>(row.safetyNotesJson, []),
    signedArchiveReadinessHash: String(row.signedArchiveReadinessHash || ""),
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

const offlineArtifactRetentionGovernanceReviewArchiveSelect = `
  SELECT id,
         retention_governance_review_id AS retentionGovernanceReviewId,
         retention_policy_evidence_id AS retentionPolicyEvidenceId,
         archive_pack_id AS archivePackId,
         signoff_id AS signoffId,
         binder_id AS binderId,
         artifact_id AS artifactId,
         artifact_sha256 AS artifactSha256,
         model_key AS modelKey,
         model_version AS modelVersion,
         signed_retention_governance_hash AS signedRetentionGovernanceHash,
         archive_decision AS archiveDecision,
         archive_status AS archiveStatus,
         archive_purpose AS archivePurpose,
         archivist_notes AS archivistNotes,
         rejection_reason AS rejectionReason,
         archive_manifest_json AS archiveManifestJson,
         reviewer_trail_json AS reviewerTrailJson,
         retention_governance_chain_json AS retentionGovernanceChainJson,
         evidence_index_json AS evidenceIndexJson,
         safety_notes_json AS safetyNotesJson,
         signed_archive_readiness_hash AS signedArchiveReadinessHash,
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
  FROM ml_offline_artifact_retention_governance_review_archives
`;

export const createOfflineArtifactRetentionGovernanceReviewArchiveRecord = async (payload: {
  input: NormalizedOfflineArtifactRetentionGovernanceReviewArchiveInput;
  signedArchiveReadinessHash: string;
  safetyNotes: string[];
  createdByUserId?: string | number | null;
}): Promise<OfflineArtifactRetentionGovernanceReviewArchiveRecord | null> => {
  const gate = getOfflineArtifactIntakeSafetyGate();
  const governanceReview = await getOfflineArtifactRetentionEvidenceGovernanceReviewById(payload.input.retentionGovernanceReviewId);
  if (!governanceReview) return null;

  const result = await runAsync(
    `
      INSERT INTO ml_offline_artifact_retention_governance_review_archives (
        retention_governance_review_id, retention_policy_evidence_id, archive_pack_id, signoff_id, binder_id,
        artifact_id, artifact_sha256, model_key, model_version, signed_retention_governance_hash,
        archive_decision, archive_status, archive_purpose, archivist_notes, rejection_reason,
        archive_manifest_json, reviewer_trail_json, retention_governance_chain_json, evidence_index_json,
        safety_notes_json, signed_archive_readiness_hash, retention_job_scheduled, deletion_or_purge_allowed,
        archive_file_created, artifact_bytes_included, artifact_execution_allowed, artifact_auto_activation_allowed,
        model_execution_allowed, inference_endpoint_exposed, production_integration_allowed, can_mutate_business_records,
        created_by_user_id, archivist_display_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      governanceReview.id,
      governanceReview.retentionPolicyEvidenceId,
      governanceReview.archivePackId,
      governanceReview.signoffId,
      governanceReview.binderId,
      governanceReview.artifactId,
      governanceReview.artifactSha256,
      governanceReview.modelKey,
      governanceReview.modelVersion,
      governanceReview.signedRetentionGovernanceHash,
      payload.input.archiveDecision,
      payload.input.archiveStatus,
      payload.input.archivePurpose,
      payload.input.archivistNotes,
      payload.input.rejectionReason,
      safeJson(payload.input.archiveManifestJson),
      safeJson(payload.input.reviewerTrailJson),
      safeJson(payload.input.retentionGovernanceChainJson),
      safeJson(payload.input.evidenceIndexJson),
      safeJson(payload.safetyNotes),
      payload.signedArchiveReadinessHash,
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

  return getOfflineArtifactRetentionGovernanceReviewArchiveById(result.lastID);
};

export const getOfflineArtifactRetentionGovernanceReviewArchiveById = async (
  idInput: unknown,
): Promise<OfflineArtifactRetentionGovernanceReviewArchiveRecord | null> => {
  const id = Number(idInput);
  if (!Number.isFinite(id) || id <= 0) return null;
  const row = await getAsync(`${offlineArtifactRetentionGovernanceReviewArchiveSelect} WHERE id = ?`, [id]);
  return mapOfflineArtifactRetentionGovernanceReviewArchiveRow(row);
};

export const listOfflineArtifactRetentionGovernanceReviewArchives = async (
  limitInput?: unknown,
): Promise<OfflineArtifactRetentionGovernanceReviewArchiveRecord[]> => {
  const limit = clampLimit(limitInput, 25, 200);
  const rows = await allAsync(`${offlineArtifactRetentionGovernanceReviewArchiveSelect} ORDER BY created_at DESC, id DESC LIMIT ?`, [limit]);
  return rows
    .map((row) => mapOfflineArtifactRetentionGovernanceReviewArchiveRow(row))
    .filter((row): row is OfflineArtifactRetentionGovernanceReviewArchiveRecord => row !== null);
};

export const listOfflineArtifactRetentionGovernanceReviewArchivesByRetentionGovernanceReviewId = async (
  retentionGovernanceReviewIdInput: unknown,
  limitInput?: unknown,
): Promise<OfflineArtifactRetentionGovernanceReviewArchiveRecord[]> => {
  const retentionGovernanceReviewId = Number(retentionGovernanceReviewIdInput);
  if (!Number.isFinite(retentionGovernanceReviewId) || retentionGovernanceReviewId <= 0) return [];
  const limit = clampLimit(limitInput, 25, 200);
  const rows = await allAsync(
    `${offlineArtifactRetentionGovernanceReviewArchiveSelect} WHERE retention_governance_review_id = ? ORDER BY created_at DESC, id DESC LIMIT ?`,
    [retentionGovernanceReviewId, limit],
  );
  return rows
    .map((row) => mapOfflineArtifactRetentionGovernanceReviewArchiveRow(row))
    .filter((row): row is OfflineArtifactRetentionGovernanceReviewArchiveRecord => row !== null);
};

export const listOfflineArtifactRetentionGovernanceReviewArchivesByArtifactId = async (
  artifactIdInput: unknown,
  limitInput?: unknown,
): Promise<OfflineArtifactRetentionGovernanceReviewArchiveRecord[]> => {
  const artifactId = Number(artifactIdInput);
  if (!Number.isFinite(artifactId) || artifactId <= 0) return [];
  const limit = clampLimit(limitInput, 25, 200);
  const rows = await allAsync(
    `${offlineArtifactRetentionGovernanceReviewArchiveSelect} WHERE artifact_id = ? ORDER BY created_at DESC, id DESC LIMIT ?`,
    [artifactId, limit],
  );
  return rows
    .map((row) => mapOfflineArtifactRetentionGovernanceReviewArchiveRow(row))
    .filter((row): row is OfflineArtifactRetentionGovernanceReviewArchiveRecord => row !== null);
};

export const getLatestOfflineArtifactRetentionGovernanceReviewArchiveForRetentionGovernanceReview = async (
  retentionGovernanceReviewIdInput: unknown,
): Promise<OfflineArtifactRetentionGovernanceReviewArchiveRecord | null> => {
  const retentionGovernanceReviewId = Number(retentionGovernanceReviewIdInput);
  if (!Number.isFinite(retentionGovernanceReviewId) || retentionGovernanceReviewId <= 0) return null;
  const row = await getAsync(
    `${offlineArtifactRetentionGovernanceReviewArchiveSelect} WHERE retention_governance_review_id = ? ORDER BY created_at DESC, id DESC LIMIT 1`,
    [retentionGovernanceReviewId],
  );
  return mapOfflineArtifactRetentionGovernanceReviewArchiveRow(row);
};

export const getOfflineArtifactRetentionGovernanceReviewArchiveSummary = async (): Promise<OfflineArtifactRetentionGovernanceReviewArchiveSummary> => {
  const aggregate = await getAsync(`
    SELECT COUNT(*) AS retentionGovernanceArchiveRecords,
           SUM(CASE WHEN archive_status = 'prepared_retention_governance_archive' THEN 1 ELSE 0 END) AS preparedRetentionGovernanceArchiveRecords,
           SUM(CASE WHEN archive_status = 'pending_retention_archive_review' OR archive_status = 'needs_retention_archive_review' THEN 1 ELSE 0 END) AS pendingRetentionGovernanceArchiveRecords,
           SUM(CASE WHEN archive_status = 'rejected' THEN 1 ELSE 0 END) AS rejectedRetentionGovernanceArchiveRecords,
           SUM(CASE WHEN archive_status = 'archived' THEN 1 ELSE 0 END) AS archivedRetentionGovernanceArchiveRecords,
           SUM(CASE WHEN signed_archive_readiness_hash IS NOT NULL AND length(signed_archive_readiness_hash) = 64 THEN 1 ELSE 0 END) AS signedRetentionGovernanceArchiveRecords
    FROM ml_offline_artifact_retention_governance_review_archives
  `).catch(() => null);
  const latestRetentionGovernanceArchive = (await listOfflineArtifactRetentionGovernanceReviewArchives(1))[0] || null;
  return {
    retentionGovernanceArchiveRecords: Number(aggregate?.retentionGovernanceArchiveRecords || 0),
    preparedRetentionGovernanceArchiveRecords: Number(aggregate?.preparedRetentionGovernanceArchiveRecords || 0),
    pendingRetentionGovernanceArchiveRecords: Number(aggregate?.pendingRetentionGovernanceArchiveRecords || 0),
    rejectedRetentionGovernanceArchiveRecords: Number(aggregate?.rejectedRetentionGovernanceArchiveRecords || 0),
    archivedRetentionGovernanceArchiveRecords: Number(aggregate?.archivedRetentionGovernanceArchiveRecords || 0),
    signedRetentionGovernanceArchiveRecords: Number(aggregate?.signedRetentionGovernanceArchiveRecords || 0),
    latestRetentionGovernanceArchive,
    safetyStatus: getOfflineArtifactIntakeSafetyGate(),
    retentionGovernanceReviewArchiveMode: "metadata_retention_governance_archive_readiness_only",
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
