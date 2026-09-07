import { allAsync, getAsync, runAsync } from "../../query";
import { getOfflineArtifactGovernanceSignoffArchivePackById } from "./mlOfflineArtifactGovernanceSignoffArchivePacks.db";
import { clampLimit, safeJson } from "./mlDbUtils";
import { getOfflineArtifactIntakeSafetyGate } from "../../../intelligence/artifacts/artifactSafety";
import type {
  NormalizedOfflineArtifactArchivePackRetentionPolicyEvidenceInput,
  OfflineArtifactArchivePackRetentionPolicyEvidenceRecord,
  OfflineArtifactArchivePackRetentionPolicyEvidenceSummary,
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

export const mapOfflineArtifactArchivePackRetentionPolicyEvidenceRow = (
  row: Record<string, unknown> | undefined,
): OfflineArtifactArchivePackRetentionPolicyEvidenceRecord | null => {
  if (!row) return null;
  return {
    id: Number(row.id),
    archivePackId: Number(row.archivePackId),
    signoffId: Number(row.signoffId),
    binderId: Number(row.binderId),
    artifactId: Number(row.artifactId),
    artifactSha256: String(row.artifactSha256 || ""),
    modelKey: String(row.modelKey || ""),
    modelVersion: String(row.modelVersion || ""),
    signedArchivePackHash: String(row.signedArchivePackHash || ""),
    retentionDecision: String(row.retentionDecision || ""),
    retentionStatus: String(row.retentionStatus || ""),
    retentionPolicyPurpose: String(row.retentionPolicyPurpose || ""),
    retentionWindowDays: row.retentionWindowDays == null ? null : Number(row.retentionWindowDays),
    retainUntil: row.retainUntil == null ? null : String(row.retainUntil),
    legalHoldReason: row.legalHoldReason == null ? null : String(row.legalHoldReason),
    policyNotes: String(row.policyNotes || ""),
    rejectionReason: row.rejectionReason == null ? null : String(row.rejectionReason),
    retentionPolicyManifestJson: parseJson<Record<string, unknown>>(row.retentionPolicyManifestJson, {}),
    holdEvidenceJson: parseJson<Record<string, unknown>>(row.holdEvidenceJson, {}),
    expiryMetadataJson: parseJson<Record<string, unknown>>(row.expiryMetadataJson, {}),
    purgeProhibitionEvidenceJson: parseJson<Record<string, unknown>>(row.purgeProhibitionEvidenceJson, {}),
    safetyNotes: parseJson<string[]>(row.safetyNotesJson, []),
    signedRetentionPolicyHash: String(row.signedRetentionPolicyHash || ""),
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
    policyReviewerDisplayName: row.policyReviewerDisplayName == null ? null : String(row.policyReviewerDisplayName),
    createdAt: String(row.createdAt || ""),
  };
};

const offlineArtifactArchivePackRetentionPolicyEvidenceSelect = `
  SELECT id,
         archive_pack_id AS archivePackId,
         signoff_id AS signoffId,
         binder_id AS binderId,
         artifact_id AS artifactId,
         artifact_sha256 AS artifactSha256,
         model_key AS modelKey,
         model_version AS modelVersion,
         signed_archive_pack_hash AS signedArchivePackHash,
         retention_decision AS retentionDecision,
         retention_status AS retentionStatus,
         retention_policy_purpose AS retentionPolicyPurpose,
         retention_window_days AS retentionWindowDays,
         retain_until AS retainUntil,
         legal_hold_reason AS legalHoldReason,
         policy_notes AS policyNotes,
         rejection_reason AS rejectionReason,
         retention_policy_manifest_json AS retentionPolicyManifestJson,
         hold_evidence_json AS holdEvidenceJson,
         expiry_metadata_json AS expiryMetadataJson,
         purge_prohibition_evidence_json AS purgeProhibitionEvidenceJson,
         safety_notes_json AS safetyNotesJson,
         signed_retention_policy_hash AS signedRetentionPolicyHash,
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
         policy_reviewer_display_name AS policyReviewerDisplayName,
         created_at AS createdAt
  FROM ml_offline_artifact_archive_pack_retention_policy_evidence
`;

export const createOfflineArtifactArchivePackRetentionPolicyEvidenceRecord = async (payload: {
  input: NormalizedOfflineArtifactArchivePackRetentionPolicyEvidenceInput;
  signedRetentionPolicyHash: string;
  safetyNotes: string[];
  createdByUserId?: string | number | null;
}): Promise<OfflineArtifactArchivePackRetentionPolicyEvidenceRecord | null> => {
  const gate = getOfflineArtifactIntakeSafetyGate();
  const archivePack = await getOfflineArtifactGovernanceSignoffArchivePackById(payload.input.archivePackId);
  if (!archivePack) return null;

  const result = await runAsync(
    `
      INSERT INTO ml_offline_artifact_archive_pack_retention_policy_evidence (
        archive_pack_id, signoff_id, binder_id, artifact_id, artifact_sha256, model_key, model_version,
        signed_archive_pack_hash, retention_decision, retention_status, retention_policy_purpose,
        retention_window_days, retain_until, legal_hold_reason, policy_notes, rejection_reason,
        retention_policy_manifest_json, hold_evidence_json, expiry_metadata_json, purge_prohibition_evidence_json,
        safety_notes_json, signed_retention_policy_hash, retention_job_scheduled, deletion_or_purge_allowed,
        archive_file_created, artifact_bytes_included, artifact_execution_allowed, artifact_auto_activation_allowed,
        model_execution_allowed, inference_endpoint_exposed, production_integration_allowed, can_mutate_business_records,
        created_by_user_id, policy_reviewer_display_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      archivePack.id,
      archivePack.signoffId,
      archivePack.binderId,
      archivePack.artifactId,
      archivePack.artifactSha256,
      archivePack.modelKey,
      archivePack.modelVersion,
      archivePack.signedArchivePackHash,
      payload.input.retentionDecision,
      payload.input.retentionStatus,
      payload.input.retentionPolicyPurpose,
      payload.input.retentionWindowDays,
      payload.input.retainUntil,
      payload.input.legalHoldReason,
      payload.input.policyNotes,
      payload.input.rejectionReason,
      safeJson(payload.input.retentionPolicyManifestJson),
      safeJson(payload.input.holdEvidenceJson),
      safeJson(payload.input.expiryMetadataJson),
      safeJson(payload.input.purgeProhibitionEvidenceJson),
      safeJson(payload.safetyNotes),
      payload.signedRetentionPolicyHash,
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
      payload.input.policyReviewerDisplayName,
    ],
  );

  return getOfflineArtifactArchivePackRetentionPolicyEvidenceById(result.lastID);
};

export const getOfflineArtifactArchivePackRetentionPolicyEvidenceById = async (
  idInput: unknown,
): Promise<OfflineArtifactArchivePackRetentionPolicyEvidenceRecord | null> => {
  const id = Number(idInput);
  if (!Number.isFinite(id) || id <= 0) return null;
  const row = await getAsync(`${offlineArtifactArchivePackRetentionPolicyEvidenceSelect} WHERE id = ?`, [id]);
  return mapOfflineArtifactArchivePackRetentionPolicyEvidenceRow(row);
};

export const listOfflineArtifactArchivePackRetentionPolicyEvidence = async (
  limitInput?: unknown,
): Promise<OfflineArtifactArchivePackRetentionPolicyEvidenceRecord[]> => {
  const limit = clampLimit(limitInput, 25, 200);
  const rows = await allAsync(`${offlineArtifactArchivePackRetentionPolicyEvidenceSelect} ORDER BY created_at DESC, id DESC LIMIT ?`, [limit]);
  return rows
    .map((row) => mapOfflineArtifactArchivePackRetentionPolicyEvidenceRow(row))
    .filter((row): row is OfflineArtifactArchivePackRetentionPolicyEvidenceRecord => row !== null);
};

export const listOfflineArtifactArchivePackRetentionPolicyEvidenceByArchivePackId = async (
  archivePackIdInput: unknown,
  limitInput?: unknown,
): Promise<OfflineArtifactArchivePackRetentionPolicyEvidenceRecord[]> => {
  const archivePackId = Number(archivePackIdInput);
  if (!Number.isFinite(archivePackId) || archivePackId <= 0) return [];
  const limit = clampLimit(limitInput, 25, 200);
  const rows = await allAsync(
    `${offlineArtifactArchivePackRetentionPolicyEvidenceSelect} WHERE archive_pack_id = ? ORDER BY created_at DESC, id DESC LIMIT ?`,
    [archivePackId, limit],
  );
  return rows
    .map((row) => mapOfflineArtifactArchivePackRetentionPolicyEvidenceRow(row))
    .filter((row): row is OfflineArtifactArchivePackRetentionPolicyEvidenceRecord => row !== null);
};

export const listOfflineArtifactArchivePackRetentionPolicyEvidenceByArtifactId = async (
  artifactIdInput: unknown,
  limitInput?: unknown,
): Promise<OfflineArtifactArchivePackRetentionPolicyEvidenceRecord[]> => {
  const artifactId = Number(artifactIdInput);
  if (!Number.isFinite(artifactId) || artifactId <= 0) return [];
  const limit = clampLimit(limitInput, 25, 200);
  const rows = await allAsync(
    `${offlineArtifactArchivePackRetentionPolicyEvidenceSelect} WHERE artifact_id = ? ORDER BY created_at DESC, id DESC LIMIT ?`,
    [artifactId, limit],
  );
  return rows
    .map((row) => mapOfflineArtifactArchivePackRetentionPolicyEvidenceRow(row))
    .filter((row): row is OfflineArtifactArchivePackRetentionPolicyEvidenceRecord => row !== null);
};

export const getLatestOfflineArtifactArchivePackRetentionPolicyEvidenceForArchivePack = async (
  archivePackIdInput: unknown,
): Promise<OfflineArtifactArchivePackRetentionPolicyEvidenceRecord | null> => {
  const archivePackId = Number(archivePackIdInput);
  if (!Number.isFinite(archivePackId) || archivePackId <= 0) return null;
  const row = await getAsync(
    `${offlineArtifactArchivePackRetentionPolicyEvidenceSelect} WHERE archive_pack_id = ? ORDER BY created_at DESC, id DESC LIMIT 1`,
    [archivePackId],
  );
  return mapOfflineArtifactArchivePackRetentionPolicyEvidenceRow(row);
};

export const getOfflineArtifactArchivePackRetentionPolicyEvidenceSummary = async (): Promise<OfflineArtifactArchivePackRetentionPolicyEvidenceSummary> => {
  const aggregate = await getAsync(`
    SELECT COUNT(*) AS retentionPolicyEvidenceRecords,
           SUM(CASE WHEN retention_status = 'prepared_retention_policy_evidence' THEN 1 ELSE 0 END) AS preparedRetentionPolicyEvidenceRecords,
           SUM(CASE WHEN retention_status = 'pending_retention_policy_review' OR retention_status = 'needs_retention_policy_review' THEN 1 ELSE 0 END) AS pendingRetentionPolicyEvidenceRecords,
           SUM(CASE WHEN retention_status = 'rejected' THEN 1 ELSE 0 END) AS rejectedRetentionPolicyEvidenceRecords,
           SUM(CASE WHEN retention_status = 'archived' THEN 1 ELSE 0 END) AS archivedRetentionPolicyEvidenceRecords,
           SUM(CASE WHEN signed_retention_policy_hash IS NOT NULL AND length(signed_retention_policy_hash) = 64 THEN 1 ELSE 0 END) AS signedRetentionPolicyEvidenceRecords
    FROM ml_offline_artifact_archive_pack_retention_policy_evidence
  `).catch(() => null);
  const latestRetentionPolicyEvidence = (await listOfflineArtifactArchivePackRetentionPolicyEvidence(1))[0] || null;
  return {
    retentionPolicyEvidenceRecords: Number(aggregate?.retentionPolicyEvidenceRecords || 0),
    preparedRetentionPolicyEvidenceRecords: Number(aggregate?.preparedRetentionPolicyEvidenceRecords || 0),
    pendingRetentionPolicyEvidenceRecords: Number(aggregate?.pendingRetentionPolicyEvidenceRecords || 0),
    rejectedRetentionPolicyEvidenceRecords: Number(aggregate?.rejectedRetentionPolicyEvidenceRecords || 0),
    archivedRetentionPolicyEvidenceRecords: Number(aggregate?.archivedRetentionPolicyEvidenceRecords || 0),
    signedRetentionPolicyEvidenceRecords: Number(aggregate?.signedRetentionPolicyEvidenceRecords || 0),
    latestRetentionPolicyEvidence,
    safetyStatus: getOfflineArtifactIntakeSafetyGate(),
    retentionPolicyEvidenceMode: "metadata_retention_policy_evidence_only",
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
