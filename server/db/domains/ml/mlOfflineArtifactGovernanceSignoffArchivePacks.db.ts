import { allAsync, getAsync, runAsync } from "../../query";
import { getOfflineArtifactReviewBinderGovernanceSignoffById } from "./mlOfflineArtifactReviewBinderGovernanceSignoffs.db";
import { clampLimit, safeJson } from "./mlDbUtils";
import { getOfflineArtifactIntakeSafetyGate } from "../../../intelligence/artifacts/artifactSafety";
import type {
  NormalizedOfflineArtifactGovernanceSignoffArchivePackInput,
  OfflineArtifactGovernanceSignoffArchivePackRecord,
  OfflineArtifactGovernanceSignoffArchivePackSummary,
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

export const mapOfflineArtifactGovernanceSignoffArchivePackRow = (
  row: Record<string, unknown> | undefined,
): OfflineArtifactGovernanceSignoffArchivePackRecord | null => {
  if (!row) return null;
  return {
    id: Number(row.id),
    signoffId: Number(row.signoffId),
    binderId: Number(row.binderId),
    artifactId: Number(row.artifactId),
    artifactSha256: String(row.artifactSha256 || ""),
    modelKey: String(row.modelKey || ""),
    modelVersion: String(row.modelVersion || ""),
    signedGovernanceHash: String(row.signedGovernanceHash || ""),
    archivePackDecision: String(row.archivePackDecision || ""),
    archivePackStatus: String(row.archivePackStatus || ""),
    archivePackPurpose: String(row.archivePackPurpose || ""),
    archivistNotes: String(row.archivistNotes || ""),
    rejectionReason: row.rejectionReason == null ? null : String(row.rejectionReason),
    archiveManifestJson: parseJson<Record<string, unknown>>(row.archiveManifestJson, {}),
    retentionManifestJson: parseJson<Record<string, unknown>>(row.retentionManifestJson, {}),
    evidenceIndexJson: parseJson<Record<string, unknown>>(row.evidenceIndexJson, {}),
    archiveReadinessNotesJson: parseJson<Record<string, unknown>>(row.archiveReadinessNotesJson, {}),
    safetyNotes: parseJson<string[]>(row.safetyNotesJson, []),
    signedArchivePackHash: String(row.signedArchivePackHash || ""),
    archiveFileCreated: toBoolean(row.archiveFileCreated),
    artifactBytesIncluded: toBoolean(row.artifactBytesIncluded),
    retentionJobScheduled: toBoolean(row.retentionJobScheduled),
    deletionOrPurgeAllowed: toBoolean(row.deletionOrPurgeAllowed),
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

const offlineArtifactGovernanceSignoffArchivePackSelect = `
  SELECT id,
         signoff_id AS signoffId,
         binder_id AS binderId,
         artifact_id AS artifactId,
         artifact_sha256 AS artifactSha256,
         model_key AS modelKey,
         model_version AS modelVersion,
         signed_governance_hash AS signedGovernanceHash,
         archive_pack_decision AS archivePackDecision,
         archive_pack_status AS archivePackStatus,
         archive_pack_purpose AS archivePackPurpose,
         archivist_notes AS archivistNotes,
         rejection_reason AS rejectionReason,
         archive_manifest_json AS archiveManifestJson,
         retention_manifest_json AS retentionManifestJson,
         evidence_index_json AS evidenceIndexJson,
         archive_readiness_notes_json AS archiveReadinessNotesJson,
         safety_notes_json AS safetyNotesJson,
         signed_archive_pack_hash AS signedArchivePackHash,
         archive_file_created AS archiveFileCreated,
         artifact_bytes_included AS artifactBytesIncluded,
         retention_job_scheduled AS retentionJobScheduled,
         deletion_or_purge_allowed AS deletionOrPurgeAllowed,
         artifact_execution_allowed AS artifactExecutionAllowed,
         artifact_auto_activation_allowed AS artifactAutoActivationAllowed,
         model_execution_allowed AS modelExecutionAllowed,
         inference_endpoint_exposed AS inferenceEndpointExposed,
         production_integration_allowed AS productionIntegrationAllowed,
         can_mutate_business_records AS canMutateBusinessRecords,
         created_by_user_id AS createdByUserId,
         archivist_display_name AS archivistDisplayName,
         created_at AS createdAt
  FROM ml_offline_artifact_governance_signoff_archive_packs
`;

export const createOfflineArtifactGovernanceSignoffArchivePackRecord = async (payload: {
  input: NormalizedOfflineArtifactGovernanceSignoffArchivePackInput;
  signedArchivePackHash: string;
  safetyNotes: string[];
  createdByUserId?: string | number | null;
}): Promise<OfflineArtifactGovernanceSignoffArchivePackRecord | null> => {
  const gate = getOfflineArtifactIntakeSafetyGate();
  const signoff = await getOfflineArtifactReviewBinderGovernanceSignoffById(payload.input.signoffId);
  if (!signoff) return null;

  const result = await runAsync(
    `
      INSERT INTO ml_offline_artifact_governance_signoff_archive_packs (
        signoff_id, binder_id, artifact_id, artifact_sha256, model_key, model_version,
        signed_governance_hash, archive_pack_decision, archive_pack_status, archive_pack_purpose,
        archivist_notes, rejection_reason, archive_manifest_json, retention_manifest_json,
        evidence_index_json, archive_readiness_notes_json, safety_notes_json, signed_archive_pack_hash,
        archive_file_created, artifact_bytes_included, retention_job_scheduled, deletion_or_purge_allowed,
        artifact_execution_allowed, artifact_auto_activation_allowed, model_execution_allowed,
        inference_endpoint_exposed, production_integration_allowed, can_mutate_business_records,
        created_by_user_id, archivist_display_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      signoff.id,
      signoff.binderId,
      signoff.artifactId,
      signoff.artifactSha256,
      signoff.modelKey,
      signoff.modelVersion,
      signoff.signedGovernanceHash,
      payload.input.archivePackDecision,
      payload.input.archivePackStatus,
      payload.input.archivePackPurpose,
      payload.input.archivistNotes,
      payload.input.rejectionReason,
      safeJson(payload.input.archiveManifestJson),
      safeJson(payload.input.retentionManifestJson),
      safeJson(payload.input.evidenceIndexJson),
      safeJson(payload.input.archiveReadinessNotesJson),
      safeJson(payload.safetyNotes),
      payload.signedArchivePackHash,
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

  return getOfflineArtifactGovernanceSignoffArchivePackById(result.lastID);
};

export const getOfflineArtifactGovernanceSignoffArchivePackById = async (
  idInput: unknown,
): Promise<OfflineArtifactGovernanceSignoffArchivePackRecord | null> => {
  const id = Number(idInput);
  if (!Number.isFinite(id) || id <= 0) return null;
  const row = await getAsync(`${offlineArtifactGovernanceSignoffArchivePackSelect} WHERE id = ?`, [id]);
  return mapOfflineArtifactGovernanceSignoffArchivePackRow(row);
};

export const listOfflineArtifactGovernanceSignoffArchivePacks = async (
  limitInput?: unknown,
): Promise<OfflineArtifactGovernanceSignoffArchivePackRecord[]> => {
  const limit = clampLimit(limitInput, 25, 200);
  const rows = await allAsync(`${offlineArtifactGovernanceSignoffArchivePackSelect} ORDER BY created_at DESC, id DESC LIMIT ?`, [limit]);
  return rows
    .map((row) => mapOfflineArtifactGovernanceSignoffArchivePackRow(row))
    .filter((row): row is OfflineArtifactGovernanceSignoffArchivePackRecord => row !== null);
};

export const listOfflineArtifactGovernanceSignoffArchivePacksBySignoffId = async (
  signoffIdInput: unknown,
  limitInput?: unknown,
): Promise<OfflineArtifactGovernanceSignoffArchivePackRecord[]> => {
  const signoffId = Number(signoffIdInput);
  if (!Number.isFinite(signoffId) || signoffId <= 0) return [];
  const limit = clampLimit(limitInput, 25, 200);
  const rows = await allAsync(
    `${offlineArtifactGovernanceSignoffArchivePackSelect} WHERE signoff_id = ? ORDER BY created_at DESC, id DESC LIMIT ?`,
    [signoffId, limit],
  );
  return rows
    .map((row) => mapOfflineArtifactGovernanceSignoffArchivePackRow(row))
    .filter((row): row is OfflineArtifactGovernanceSignoffArchivePackRecord => row !== null);
};

export const listOfflineArtifactGovernanceSignoffArchivePacksByArtifactId = async (
  artifactIdInput: unknown,
  limitInput?: unknown,
): Promise<OfflineArtifactGovernanceSignoffArchivePackRecord[]> => {
  const artifactId = Number(artifactIdInput);
  if (!Number.isFinite(artifactId) || artifactId <= 0) return [];
  const limit = clampLimit(limitInput, 25, 200);
  const rows = await allAsync(
    `${offlineArtifactGovernanceSignoffArchivePackSelect} WHERE artifact_id = ? ORDER BY created_at DESC, id DESC LIMIT ?`,
    [artifactId, limit],
  );
  return rows
    .map((row) => mapOfflineArtifactGovernanceSignoffArchivePackRow(row))
    .filter((row): row is OfflineArtifactGovernanceSignoffArchivePackRecord => row !== null);
};

export const getLatestOfflineArtifactGovernanceSignoffArchivePackForSignoff = async (
  signoffIdInput: unknown,
): Promise<OfflineArtifactGovernanceSignoffArchivePackRecord | null> => {
  const packs = await listOfflineArtifactGovernanceSignoffArchivePacksBySignoffId(signoffIdInput, 1);
  return packs[0] || null;
};

export const getOfflineArtifactGovernanceSignoffArchivePackSummary = async (): Promise<OfflineArtifactGovernanceSignoffArchivePackSummary> => {
  const aggregate = await getAsync(`
    SELECT COUNT(*) AS archivePackReadinessRecords,
           SUM(CASE WHEN archive_pack_status = 'prepared_archive_pack_readiness' THEN 1 ELSE 0 END) AS preparedArchivePackRecords,
           SUM(CASE WHEN archive_pack_status = 'pending_archive_pack_review' OR archive_pack_status = 'needs_archive_pack_review' THEN 1 ELSE 0 END) AS pendingArchivePackRecords,
           SUM(CASE WHEN archive_pack_status = 'rejected' THEN 1 ELSE 0 END) AS rejectedArchivePackRecords,
           SUM(CASE WHEN archive_pack_status = 'archived' THEN 1 ELSE 0 END) AS archivedArchivePackRecords,
           SUM(CASE WHEN signed_archive_pack_hash IS NOT NULL AND length(signed_archive_pack_hash) = 64 THEN 1 ELSE 0 END) AS signedArchivePackManifestRecords
    FROM ml_offline_artifact_governance_signoff_archive_packs
  `);
  const latestArchivePack = (await listOfflineArtifactGovernanceSignoffArchivePacks(1))[0] || null;
  return {
    archivePackReadinessRecords: Number(aggregate?.archivePackReadinessRecords || 0),
    preparedArchivePackRecords: Number(aggregate?.preparedArchivePackRecords || 0),
    pendingArchivePackRecords: Number(aggregate?.pendingArchivePackRecords || 0),
    rejectedArchivePackRecords: Number(aggregate?.rejectedArchivePackRecords || 0),
    archivedArchivePackRecords: Number(aggregate?.archivedArchivePackRecords || 0),
    signedArchivePackManifestRecords: Number(aggregate?.signedArchivePackManifestRecords || 0),
    latestArchivePack,
    safetyStatus: getOfflineArtifactIntakeSafetyGate(),
    archivePackMode: "metadata_archive_pack_readiness_only",
    archiveFileCreated: false,
    artifactBytesIncluded: false,
    retentionJobScheduled: false,
    deletionOrPurgeAllowed: false,
    execution: "Off",
    autoActivation: "Off",
    productionInference: "Not exposed",
    productionIntegration: "Off",
    noBusinessMutation: true,
  };
};
