import { allAsync, getAsync, runAsync } from "../../query";
import { getOfflineArtifactFinalizationChainAuditSnapshotById } from "./mlOfflineArtifactFinalizationChainAuditSnapshots.db";
import { clampLimit, safeJson } from "./mlDbUtils";
import { getOfflineArtifactIntakeSafetyGate } from "../../../intelligence/artifacts/artifactSafety";
import type {
  NormalizedOfflineArtifactAuditSnapshotGovernanceSignoffInput,
  OfflineArtifactAuditSnapshotGovernanceSignoffRecord,
  OfflineArtifactAuditSnapshotGovernanceSignoffSummary,
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

export const mapOfflineArtifactAuditSnapshotGovernanceSignoffRow = (
  row: Record<string, unknown> | undefined,
): OfflineArtifactAuditSnapshotGovernanceSignoffRecord | null => {
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

const offlineArtifactAuditSnapshotGovernanceSignoffSelect = `
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
`;

export const createOfflineArtifactAuditSnapshotGovernanceSignoffRecord = async (payload: {
  input: NormalizedOfflineArtifactAuditSnapshotGovernanceSignoffInput;
  signedAuditSnapshotGovernanceHash: string;
  safetyNotes: string[];
  createdByUserId?: string | number | null;
}): Promise<OfflineArtifactAuditSnapshotGovernanceSignoffRecord | null> => {
  const gate = getOfflineArtifactIntakeSafetyGate();
  const auditSnapshot = await getOfflineArtifactFinalizationChainAuditSnapshotById(payload.input.auditSnapshotId);
  if (!auditSnapshot) return null;

  const result = await runAsync(
    `
      INSERT INTO ml_offline_artifact_audit_snapshot_governance_signoffs (
        audit_snapshot_id, finalization_id, retention_governance_archive_id, retention_governance_review_id,
        retention_policy_evidence_id, archive_pack_id, signoff_id, binder_id, artifact_id, artifact_sha256,
        model_key, model_version, signed_audit_snapshot_hash, signoff_decision, signoff_status,
        signoff_purpose, audit_reviewer_signoff_notes, exception_notes, rejection_reason,
        snapshot_acceptance_json, evidence_confidence_json, exception_notes_json, safety_notes_json,
        signed_audit_snapshot_governance_hash, retention_job_scheduled, deletion_or_purge_allowed,
        archive_file_created, artifact_bytes_included, artifact_execution_allowed, artifact_auto_activation_allowed,
        model_execution_allowed, inference_endpoint_exposed, production_integration_allowed,
        can_mutate_business_records, created_by_user_id, governance_signer_display_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      auditSnapshot.id,
      auditSnapshot.finalizationId,
      auditSnapshot.retentionGovernanceArchiveId,
      auditSnapshot.retentionGovernanceReviewId,
      auditSnapshot.retentionPolicyEvidenceId,
      auditSnapshot.archivePackId,
      auditSnapshot.signoffId,
      auditSnapshot.binderId,
      auditSnapshot.artifactId,
      auditSnapshot.artifactSha256,
      auditSnapshot.modelKey,
      auditSnapshot.modelVersion,
      auditSnapshot.signedAuditSnapshotHash,
      payload.input.signoffDecision,
      payload.input.signoffStatus,
      payload.input.signoffPurpose,
      payload.input.auditReviewerSignoffNotes,
      payload.input.exceptionNotes,
      payload.input.rejectionReason,
      safeJson(payload.input.snapshotAcceptanceJson),
      safeJson(payload.input.evidenceConfidenceJson),
      safeJson(payload.input.exceptionNotesJson),
      safeJson(payload.safetyNotes),
      payload.signedAuditSnapshotGovernanceHash,
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
      payload.input.governanceSignerDisplayName,
    ],
  );

  return getOfflineArtifactAuditSnapshotGovernanceSignoffById(result.lastID);
};

export const getOfflineArtifactAuditSnapshotGovernanceSignoffById = async (
  idInput: unknown,
): Promise<OfflineArtifactAuditSnapshotGovernanceSignoffRecord | null> => {
  const id = Number(idInput);
  if (!Number.isFinite(id) || id <= 0) return null;
  const row = await getAsync(`${offlineArtifactAuditSnapshotGovernanceSignoffSelect} WHERE id = ?`, [id]);
  return mapOfflineArtifactAuditSnapshotGovernanceSignoffRow(row);
};

export const listOfflineArtifactAuditSnapshotGovernanceSignoffs = async (
  limitInput?: unknown,
): Promise<OfflineArtifactAuditSnapshotGovernanceSignoffRecord[]> => {
  const limit = clampLimit(limitInput, 25, 200);
  const rows = await allAsync(`${offlineArtifactAuditSnapshotGovernanceSignoffSelect} ORDER BY created_at DESC, id DESC LIMIT ?`, [limit]);
  return rows
    .map((row) => mapOfflineArtifactAuditSnapshotGovernanceSignoffRow(row))
    .filter((row): row is OfflineArtifactAuditSnapshotGovernanceSignoffRecord => row !== null);
};

export const listOfflineArtifactAuditSnapshotGovernanceSignoffsByAuditSnapshotId = async (
  auditSnapshotIdInput: unknown,
  limitInput?: unknown,
): Promise<OfflineArtifactAuditSnapshotGovernanceSignoffRecord[]> => {
  const auditSnapshotId = Number(auditSnapshotIdInput);
  if (!Number.isFinite(auditSnapshotId) || auditSnapshotId <= 0) return [];
  const limit = clampLimit(limitInput, 25, 200);
  const rows = await allAsync(
    `${offlineArtifactAuditSnapshotGovernanceSignoffSelect} WHERE audit_snapshot_id = ? ORDER BY created_at DESC, id DESC LIMIT ?`,
    [auditSnapshotId, limit],
  );
  return rows
    .map((row) => mapOfflineArtifactAuditSnapshotGovernanceSignoffRow(row))
    .filter((row): row is OfflineArtifactAuditSnapshotGovernanceSignoffRecord => row !== null);
};

export const listOfflineArtifactAuditSnapshotGovernanceSignoffsByArtifactId = async (
  artifactIdInput: unknown,
  limitInput?: unknown,
): Promise<OfflineArtifactAuditSnapshotGovernanceSignoffRecord[]> => {
  const artifactId = Number(artifactIdInput);
  if (!Number.isFinite(artifactId) || artifactId <= 0) return [];
  const limit = clampLimit(limitInput, 25, 200);
  const rows = await allAsync(
    `${offlineArtifactAuditSnapshotGovernanceSignoffSelect} WHERE artifact_id = ? ORDER BY created_at DESC, id DESC LIMIT ?`,
    [artifactId, limit],
  );
  return rows
    .map((row) => mapOfflineArtifactAuditSnapshotGovernanceSignoffRow(row))
    .filter((row): row is OfflineArtifactAuditSnapshotGovernanceSignoffRecord => row !== null);
};

export const getLatestOfflineArtifactAuditSnapshotGovernanceSignoffForAuditSnapshot = async (
  auditSnapshotIdInput: unknown,
): Promise<OfflineArtifactAuditSnapshotGovernanceSignoffRecord | null> => {
  const auditSnapshotId = Number(auditSnapshotIdInput);
  if (!Number.isFinite(auditSnapshotId) || auditSnapshotId <= 0) return null;
  const row = await getAsync(
    `${offlineArtifactAuditSnapshotGovernanceSignoffSelect} WHERE audit_snapshot_id = ? ORDER BY created_at DESC, id DESC LIMIT 1`,
    [auditSnapshotId],
  );
  return mapOfflineArtifactAuditSnapshotGovernanceSignoffRow(row);
};

export const getOfflineArtifactAuditSnapshotGovernanceSignoffSummary = async (): Promise<OfflineArtifactAuditSnapshotGovernanceSignoffSummary> => {
  const aggregate = await getAsync(`
    SELECT COUNT(*) AS auditSnapshotGovernanceSignoffRecords,
           SUM(CASE WHEN signoff_status = 'accepted_audit_snapshot_governance_signoff' THEN 1 ELSE 0 END) AS acceptedAuditSnapshotGovernanceSignoffRecords,
           SUM(CASE WHEN signoff_status = 'pending_audit_snapshot_governance_review' OR signoff_status = 'needs_audit_snapshot_governance_review' THEN 1 ELSE 0 END) AS pendingAuditSnapshotGovernanceSignoffRecords,
           SUM(CASE WHEN signoff_status = 'rejected' THEN 1 ELSE 0 END) AS rejectedAuditSnapshotGovernanceSignoffRecords,
           SUM(CASE WHEN signoff_status = 'archived' THEN 1 ELSE 0 END) AS archivedAuditSnapshotGovernanceSignoffRecords,
           SUM(CASE WHEN signed_audit_snapshot_governance_hash IS NOT NULL AND length(signed_audit_snapshot_governance_hash) = 64 THEN 1 ELSE 0 END) AS signedAuditSnapshotGovernanceSignoffRecords
    FROM ml_offline_artifact_audit_snapshot_governance_signoffs
  `).catch(() => null);
  const latestAuditSnapshotGovernanceSignoff = (await listOfflineArtifactAuditSnapshotGovernanceSignoffs(1))[0] || null;
  return {
    auditSnapshotGovernanceSignoffRecords: Number(aggregate?.auditSnapshotGovernanceSignoffRecords || 0),
    acceptedAuditSnapshotGovernanceSignoffRecords: Number(aggregate?.acceptedAuditSnapshotGovernanceSignoffRecords || 0),
    pendingAuditSnapshotGovernanceSignoffRecords: Number(aggregate?.pendingAuditSnapshotGovernanceSignoffRecords || 0),
    rejectedAuditSnapshotGovernanceSignoffRecords: Number(aggregate?.rejectedAuditSnapshotGovernanceSignoffRecords || 0),
    archivedAuditSnapshotGovernanceSignoffRecords: Number(aggregate?.archivedAuditSnapshotGovernanceSignoffRecords || 0),
    signedAuditSnapshotGovernanceSignoffRecords: Number(aggregate?.signedAuditSnapshotGovernanceSignoffRecords || 0),
    latestAuditSnapshotGovernanceSignoff,
    safetyStatus: getOfflineArtifactIntakeSafetyGate(),
    auditSnapshotGovernanceSignoffMode: "metadata_audit_snapshot_governance_signoff_readiness_only",
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
