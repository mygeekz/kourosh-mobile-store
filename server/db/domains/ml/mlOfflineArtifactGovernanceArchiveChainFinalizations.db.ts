import { allAsync, getAsync, runAsync } from "../../query";
import { getOfflineArtifactRetentionGovernanceReviewArchiveById } from "./mlOfflineArtifactRetentionGovernanceReviewArchives.db";
import { clampLimit, safeJson } from "./mlDbUtils";
import { getOfflineArtifactIntakeSafetyGate } from "../../../intelligence/artifacts/artifactSafety";
import type {
  NormalizedOfflineArtifactGovernanceArchiveChainFinalizationInput,
  OfflineArtifactGovernanceArchiveChainFinalizationRecord,
  OfflineArtifactGovernanceArchiveChainFinalizationSummary,
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

export const mapOfflineArtifactGovernanceArchiveChainFinalizationRow = (
  row: Record<string, unknown> | undefined,
): OfflineArtifactGovernanceArchiveChainFinalizationRecord | null => {
  if (!row) return null;
  return {
    id: Number(row.id),
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
    signedArchiveReadinessHash: String(row.signedArchiveReadinessHash || ""),
    finalizationDecision: String(row.finalizationDecision || ""),
    finalizationStatus: String(row.finalizationStatus || ""),
    finalizationPurpose: String(row.finalizationPurpose || ""),
    finalReviewerNotes: String(row.finalReviewerNotes || ""),
    rejectionReason: row.rejectionReason == null ? null : String(row.rejectionReason),
    chainCompletenessJson: parseJson<Record<string, unknown>>(row.chainCompletenessJson, {}),
    finalReviewerAcknowledgementJson: parseJson<Record<string, unknown>>(row.finalReviewerAcknowledgementJson, {}),
    immutableEvidenceSummaryJson: parseJson<Record<string, unknown>>(row.immutableEvidenceSummaryJson, {}),
    evidenceIndexJson: parseJson<Record<string, unknown>>(row.evidenceIndexJson, {}),
    safetyNotes: parseJson<string[]>(row.safetyNotesJson, []),
    signedFinalizationReadinessHash: String(row.signedFinalizationReadinessHash || ""),
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
    finalReviewerDisplayName: row.finalReviewerDisplayName == null ? null : String(row.finalReviewerDisplayName),
    createdAt: String(row.createdAt || ""),
  };
};

const offlineArtifactGovernanceArchiveChainFinalizationSelect = `
  SELECT id,
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
         signed_archive_readiness_hash AS signedArchiveReadinessHash,
         finalization_decision AS finalizationDecision,
         finalization_status AS finalizationStatus,
         finalization_purpose AS finalizationPurpose,
         final_reviewer_notes AS finalReviewerNotes,
         rejection_reason AS rejectionReason,
         chain_completeness_json AS chainCompletenessJson,
         final_reviewer_acknowledgement_json AS finalReviewerAcknowledgementJson,
         immutable_evidence_summary_json AS immutableEvidenceSummaryJson,
         evidence_index_json AS evidenceIndexJson,
         safety_notes_json AS safetyNotesJson,
         signed_finalization_readiness_hash AS signedFinalizationReadinessHash,
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
         final_reviewer_display_name AS finalReviewerDisplayName,
         created_at AS createdAt
  FROM ml_offline_artifact_governance_archive_chain_finalizations
`;

export const createOfflineArtifactGovernanceArchiveChainFinalizationRecord = async (payload: {
  input: NormalizedOfflineArtifactGovernanceArchiveChainFinalizationInput;
  signedFinalizationReadinessHash: string;
  safetyNotes: string[];
  createdByUserId?: string | number | null;
}): Promise<OfflineArtifactGovernanceArchiveChainFinalizationRecord | null> => {
  const gate = getOfflineArtifactIntakeSafetyGate();
  const archive = await getOfflineArtifactRetentionGovernanceReviewArchiveById(payload.input.retentionGovernanceArchiveId);
  if (!archive) return null;

  const result = await runAsync(
    `
      INSERT INTO ml_offline_artifact_governance_archive_chain_finalizations (
        retention_governance_archive_id, retention_governance_review_id, retention_policy_evidence_id,
        archive_pack_id, signoff_id, binder_id, artifact_id, artifact_sha256, model_key, model_version,
        signed_archive_readiness_hash, finalization_decision, finalization_status, finalization_purpose,
        final_reviewer_notes, rejection_reason, chain_completeness_json, final_reviewer_acknowledgement_json,
        immutable_evidence_summary_json, evidence_index_json, safety_notes_json, signed_finalization_readiness_hash,
        retention_job_scheduled, deletion_or_purge_allowed, archive_file_created, artifact_bytes_included,
        artifact_execution_allowed, artifact_auto_activation_allowed, model_execution_allowed, inference_endpoint_exposed,
        production_integration_allowed, can_mutate_business_records, created_by_user_id, final_reviewer_display_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      archive.id,
      archive.retentionGovernanceReviewId,
      archive.retentionPolicyEvidenceId,
      archive.archivePackId,
      archive.signoffId,
      archive.binderId,
      archive.artifactId,
      archive.artifactSha256,
      archive.modelKey,
      archive.modelVersion,
      archive.signedArchiveReadinessHash,
      payload.input.finalizationDecision,
      payload.input.finalizationStatus,
      payload.input.finalizationPurpose,
      payload.input.finalReviewerNotes,
      payload.input.rejectionReason,
      safeJson(payload.input.chainCompletenessJson),
      safeJson(payload.input.finalReviewerAcknowledgementJson),
      safeJson(payload.input.immutableEvidenceSummaryJson),
      safeJson(payload.input.evidenceIndexJson),
      safeJson(payload.safetyNotes),
      payload.signedFinalizationReadinessHash,
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
      payload.input.finalReviewerDisplayName,
    ],
  );

  return getOfflineArtifactGovernanceArchiveChainFinalizationById(result.lastID);
};

export const getOfflineArtifactGovernanceArchiveChainFinalizationById = async (
  idInput: unknown,
): Promise<OfflineArtifactGovernanceArchiveChainFinalizationRecord | null> => {
  const id = Number(idInput);
  if (!Number.isFinite(id) || id <= 0) return null;
  const row = await getAsync(`${offlineArtifactGovernanceArchiveChainFinalizationSelect} WHERE id = ?`, [id]);
  return mapOfflineArtifactGovernanceArchiveChainFinalizationRow(row);
};

export const listOfflineArtifactGovernanceArchiveChainFinalizations = async (
  limitInput?: unknown,
): Promise<OfflineArtifactGovernanceArchiveChainFinalizationRecord[]> => {
  const limit = clampLimit(limitInput, 25, 200);
  const rows = await allAsync(`${offlineArtifactGovernanceArchiveChainFinalizationSelect} ORDER BY created_at DESC, id DESC LIMIT ?`, [limit]);
  return rows
    .map((row) => mapOfflineArtifactGovernanceArchiveChainFinalizationRow(row))
    .filter((row): row is OfflineArtifactGovernanceArchiveChainFinalizationRecord => row !== null);
};

export const listOfflineArtifactGovernanceArchiveChainFinalizationsByRetentionGovernanceArchiveId = async (
  retentionGovernanceArchiveIdInput: unknown,
  limitInput?: unknown,
): Promise<OfflineArtifactGovernanceArchiveChainFinalizationRecord[]> => {
  const retentionGovernanceArchiveId = Number(retentionGovernanceArchiveIdInput);
  if (!Number.isFinite(retentionGovernanceArchiveId) || retentionGovernanceArchiveId <= 0) return [];
  const limit = clampLimit(limitInput, 25, 200);
  const rows = await allAsync(
    `${offlineArtifactGovernanceArchiveChainFinalizationSelect} WHERE retention_governance_archive_id = ? ORDER BY created_at DESC, id DESC LIMIT ?`,
    [retentionGovernanceArchiveId, limit],
  );
  return rows
    .map((row) => mapOfflineArtifactGovernanceArchiveChainFinalizationRow(row))
    .filter((row): row is OfflineArtifactGovernanceArchiveChainFinalizationRecord => row !== null);
};

export const listOfflineArtifactGovernanceArchiveChainFinalizationsByArtifactId = async (
  artifactIdInput: unknown,
  limitInput?: unknown,
): Promise<OfflineArtifactGovernanceArchiveChainFinalizationRecord[]> => {
  const artifactId = Number(artifactIdInput);
  if (!Number.isFinite(artifactId) || artifactId <= 0) return [];
  const limit = clampLimit(limitInput, 25, 200);
  const rows = await allAsync(
    `${offlineArtifactGovernanceArchiveChainFinalizationSelect} WHERE artifact_id = ? ORDER BY created_at DESC, id DESC LIMIT ?`,
    [artifactId, limit],
  );
  return rows
    .map((row) => mapOfflineArtifactGovernanceArchiveChainFinalizationRow(row))
    .filter((row): row is OfflineArtifactGovernanceArchiveChainFinalizationRecord => row !== null);
};

export const getLatestOfflineArtifactGovernanceArchiveChainFinalizationForRetentionGovernanceArchive = async (
  retentionGovernanceArchiveIdInput: unknown,
): Promise<OfflineArtifactGovernanceArchiveChainFinalizationRecord | null> => {
  const retentionGovernanceArchiveId = Number(retentionGovernanceArchiveIdInput);
  if (!Number.isFinite(retentionGovernanceArchiveId) || retentionGovernanceArchiveId <= 0) return null;
  const row = await getAsync(
    `${offlineArtifactGovernanceArchiveChainFinalizationSelect} WHERE retention_governance_archive_id = ? ORDER BY created_at DESC, id DESC LIMIT 1`,
    [retentionGovernanceArchiveId],
  );
  return mapOfflineArtifactGovernanceArchiveChainFinalizationRow(row);
};

export const getOfflineArtifactGovernanceArchiveChainFinalizationSummary = async (): Promise<OfflineArtifactGovernanceArchiveChainFinalizationSummary> => {
  const aggregate = await getAsync(`
    SELECT COUNT(*) AS finalizationRecords,
           SUM(CASE WHEN finalization_status = 'prepared_governance_archive_chain_finalization' THEN 1 ELSE 0 END) AS preparedFinalizationRecords,
           SUM(CASE WHEN finalization_status = 'pending_finalization_review' OR finalization_status = 'needs_finalization_review' THEN 1 ELSE 0 END) AS pendingFinalizationRecords,
           SUM(CASE WHEN finalization_status = 'rejected' THEN 1 ELSE 0 END) AS rejectedFinalizationRecords,
           SUM(CASE WHEN finalization_status = 'archived' THEN 1 ELSE 0 END) AS archivedFinalizationRecords,
           SUM(CASE WHEN signed_finalization_readiness_hash IS NOT NULL AND length(signed_finalization_readiness_hash) = 64 THEN 1 ELSE 0 END) AS signedFinalizationReadinessRecords
    FROM ml_offline_artifact_governance_archive_chain_finalizations
  `).catch(() => null);
  const latestFinalization = (await listOfflineArtifactGovernanceArchiveChainFinalizations(1))[0] || null;
  const auditSnapshotSummary = await import("./mlOfflineArtifactFinalizationChainAuditSnapshots.db")
    .then((module) => module.getOfflineArtifactFinalizationChainAuditSnapshotSummary())
    .catch(() => null);
  return {
    finalizationRecords: Number(aggregate?.finalizationRecords || 0),
    preparedFinalizationRecords: Number(aggregate?.preparedFinalizationRecords || 0),
    pendingFinalizationRecords: Number(aggregate?.pendingFinalizationRecords || 0),
    rejectedFinalizationRecords: Number(aggregate?.rejectedFinalizationRecords || 0),
    archivedFinalizationRecords: Number(aggregate?.archivedFinalizationRecords || 0),
    signedFinalizationReadinessRecords: Number(aggregate?.signedFinalizationReadinessRecords || 0),
    latestFinalization,
    auditSnapshotRecords: auditSnapshotSummary?.auditSnapshotRecords ?? 0,
    preparedAuditSnapshotRecords: auditSnapshotSummary?.preparedAuditSnapshotRecords ?? 0,
    pendingAuditSnapshotRecords: auditSnapshotSummary?.pendingAuditSnapshotRecords ?? 0,
    rejectedAuditSnapshotRecords: auditSnapshotSummary?.rejectedAuditSnapshotRecords ?? 0,
    signedAuditSnapshotRecords: auditSnapshotSummary?.signedAuditSnapshotRecords ?? 0,
    latestAuditSnapshot: auditSnapshotSummary?.latestAuditSnapshot ?? null,
    safetyStatus: getOfflineArtifactIntakeSafetyGate(),
    governanceArchiveChainFinalizationMode: "metadata_governance_archive_chain_finalization_readiness_only",
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
