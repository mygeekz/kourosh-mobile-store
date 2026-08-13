import { allAsync, getAsync, runAsync } from "../../query";
import { getOfflineArtifactArchivePackRetentionPolicyEvidenceById } from "./mlOfflineArtifactArchivePackRetentionPolicyEvidence.db";
import { clampLimit, safeJson } from "./mlDbUtils";
import { getOfflineArtifactIntakeSafetyGate } from "../../../intelligence/artifacts/artifactSafety";
import type {
  NormalizedOfflineArtifactRetentionEvidenceGovernanceReviewInput,
  OfflineArtifactRetentionEvidenceGovernanceReviewRecord,
  OfflineArtifactRetentionEvidenceGovernanceReviewSummary,
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

export const mapOfflineArtifactRetentionEvidenceGovernanceReviewRow = (
  row: Record<string, unknown> | undefined,
): OfflineArtifactRetentionEvidenceGovernanceReviewRecord | null => {
  if (!row) return null;
  return {
    id: Number(row.id),
    retentionPolicyEvidenceId: Number(row.retentionPolicyEvidenceId),
    archivePackId: Number(row.archivePackId),
    signoffId: Number(row.signoffId),
    binderId: Number(row.binderId),
    artifactId: Number(row.artifactId),
    artifactSha256: String(row.artifactSha256 || ""),
    modelKey: String(row.modelKey || ""),
    modelVersion: String(row.modelVersion || ""),
    signedRetentionPolicyHash: String(row.signedRetentionPolicyHash || ""),
    governanceReviewDecision: String(row.governanceReviewDecision || ""),
    governanceReviewStatus: String(row.governanceReviewStatus || ""),
    governanceReviewPurpose: String(row.governanceReviewPurpose || ""),
    reviewerNotes: String(row.reviewerNotes || ""),
    rejectionReason: row.rejectionReason == null ? null : String(row.rejectionReason),
    riskConfirmationJson: parseJson<Record<string, unknown>>(row.riskConfirmationJson, {}),
    holdConfirmationJson: parseJson<Record<string, unknown>>(row.holdConfirmationJson, {}),
    purgeProhibitionReviewJson: parseJson<Record<string, unknown>>(row.purgeProhibitionReviewJson, {}),
    evidenceCompletenessJson: parseJson<Record<string, unknown>>(row.evidenceCompletenessJson, {}),
    safetyNotes: parseJson<string[]>(row.safetyNotesJson, []),
    signedRetentionGovernanceHash: String(row.signedRetentionGovernanceHash || ""),
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
    governanceReviewerDisplayName: row.governanceReviewerDisplayName == null ? null : String(row.governanceReviewerDisplayName),
    createdAt: String(row.createdAt || ""),
  };
};

const offlineArtifactRetentionEvidenceGovernanceReviewSelect = `
  SELECT id,
         retention_policy_evidence_id AS retentionPolicyEvidenceId,
         archive_pack_id AS archivePackId,
         signoff_id AS signoffId,
         binder_id AS binderId,
         artifact_id AS artifactId,
         artifact_sha256 AS artifactSha256,
         model_key AS modelKey,
         model_version AS modelVersion,
         signed_retention_policy_hash AS signedRetentionPolicyHash,
         governance_review_decision AS governanceReviewDecision,
         governance_review_status AS governanceReviewStatus,
         governance_review_purpose AS governanceReviewPurpose,
         reviewer_notes AS reviewerNotes,
         rejection_reason AS rejectionReason,
         risk_confirmation_json AS riskConfirmationJson,
         hold_confirmation_json AS holdConfirmationJson,
         purge_prohibition_review_json AS purgeProhibitionReviewJson,
         evidence_completeness_json AS evidenceCompletenessJson,
         safety_notes_json AS safetyNotesJson,
         signed_retention_governance_hash AS signedRetentionGovernanceHash,
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
         governance_reviewer_display_name AS governanceReviewerDisplayName,
         created_at AS createdAt
  FROM ml_offline_artifact_retention_evidence_governance_reviews
`;

export const createOfflineArtifactRetentionEvidenceGovernanceReviewRecord = async (payload: {
  input: NormalizedOfflineArtifactRetentionEvidenceGovernanceReviewInput;
  signedRetentionGovernanceHash: string;
  safetyNotes: string[];
  createdByUserId?: string | number | null;
}): Promise<OfflineArtifactRetentionEvidenceGovernanceReviewRecord | null> => {
  const gate = getOfflineArtifactIntakeSafetyGate();
  const retentionPolicyEvidence = await getOfflineArtifactArchivePackRetentionPolicyEvidenceById(payload.input.retentionPolicyEvidenceId);
  if (!retentionPolicyEvidence) return null;

  const result = await runAsync(
    `
      INSERT INTO ml_offline_artifact_retention_evidence_governance_reviews (
        retention_policy_evidence_id, archive_pack_id, signoff_id, binder_id, artifact_id, artifact_sha256,
        model_key, model_version, signed_retention_policy_hash, governance_review_decision, governance_review_status,
        governance_review_purpose, reviewer_notes, rejection_reason, risk_confirmation_json, hold_confirmation_json,
        purge_prohibition_review_json, evidence_completeness_json, safety_notes_json, signed_retention_governance_hash,
        retention_job_scheduled, deletion_or_purge_allowed, archive_file_created, artifact_bytes_included,
        artifact_execution_allowed, artifact_auto_activation_allowed, model_execution_allowed, inference_endpoint_exposed,
        production_integration_allowed, can_mutate_business_records, created_by_user_id, governance_reviewer_display_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      retentionPolicyEvidence.id,
      retentionPolicyEvidence.archivePackId,
      retentionPolicyEvidence.signoffId,
      retentionPolicyEvidence.binderId,
      retentionPolicyEvidence.artifactId,
      retentionPolicyEvidence.artifactSha256,
      retentionPolicyEvidence.modelKey,
      retentionPolicyEvidence.modelVersion,
      retentionPolicyEvidence.signedRetentionPolicyHash,
      payload.input.governanceReviewDecision,
      payload.input.governanceReviewStatus,
      payload.input.governanceReviewPurpose,
      payload.input.reviewerNotes,
      payload.input.rejectionReason,
      safeJson(payload.input.riskConfirmationJson),
      safeJson(payload.input.holdConfirmationJson),
      safeJson(payload.input.purgeProhibitionReviewJson),
      safeJson(payload.input.evidenceCompletenessJson),
      safeJson(payload.safetyNotes),
      payload.signedRetentionGovernanceHash,
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
      payload.input.governanceReviewerDisplayName,
    ],
  );

  return getOfflineArtifactRetentionEvidenceGovernanceReviewById(result.lastID);
};

export const getOfflineArtifactRetentionEvidenceGovernanceReviewById = async (
  idInput: unknown,
): Promise<OfflineArtifactRetentionEvidenceGovernanceReviewRecord | null> => {
  const id = Number(idInput);
  if (!Number.isFinite(id) || id <= 0) return null;
  const row = await getAsync(`${offlineArtifactRetentionEvidenceGovernanceReviewSelect} WHERE id = ?`, [id]);
  return mapOfflineArtifactRetentionEvidenceGovernanceReviewRow(row);
};

export const listOfflineArtifactRetentionEvidenceGovernanceReviews = async (
  limitInput?: unknown,
): Promise<OfflineArtifactRetentionEvidenceGovernanceReviewRecord[]> => {
  const limit = clampLimit(limitInput, 25, 200);
  const rows = await allAsync(`${offlineArtifactRetentionEvidenceGovernanceReviewSelect} ORDER BY created_at DESC, id DESC LIMIT ?`, [limit]);
  return rows
    .map((row) => mapOfflineArtifactRetentionEvidenceGovernanceReviewRow(row))
    .filter((row): row is OfflineArtifactRetentionEvidenceGovernanceReviewRecord => row !== null);
};

export const listOfflineArtifactRetentionEvidenceGovernanceReviewsByRetentionPolicyEvidenceId = async (
  retentionPolicyEvidenceIdInput: unknown,
  limitInput?: unknown,
): Promise<OfflineArtifactRetentionEvidenceGovernanceReviewRecord[]> => {
  const retentionPolicyEvidenceId = Number(retentionPolicyEvidenceIdInput);
  if (!Number.isFinite(retentionPolicyEvidenceId) || retentionPolicyEvidenceId <= 0) return [];
  const limit = clampLimit(limitInput, 25, 200);
  const rows = await allAsync(
    `${offlineArtifactRetentionEvidenceGovernanceReviewSelect} WHERE retention_policy_evidence_id = ? ORDER BY created_at DESC, id DESC LIMIT ?`,
    [retentionPolicyEvidenceId, limit],
  );
  return rows
    .map((row) => mapOfflineArtifactRetentionEvidenceGovernanceReviewRow(row))
    .filter((row): row is OfflineArtifactRetentionEvidenceGovernanceReviewRecord => row !== null);
};

export const listOfflineArtifactRetentionEvidenceGovernanceReviewsByArtifactId = async (
  artifactIdInput: unknown,
  limitInput?: unknown,
): Promise<OfflineArtifactRetentionEvidenceGovernanceReviewRecord[]> => {
  const artifactId = Number(artifactIdInput);
  if (!Number.isFinite(artifactId) || artifactId <= 0) return [];
  const limit = clampLimit(limitInput, 25, 200);
  const rows = await allAsync(
    `${offlineArtifactRetentionEvidenceGovernanceReviewSelect} WHERE artifact_id = ? ORDER BY created_at DESC, id DESC LIMIT ?`,
    [artifactId, limit],
  );
  return rows
    .map((row) => mapOfflineArtifactRetentionEvidenceGovernanceReviewRow(row))
    .filter((row): row is OfflineArtifactRetentionEvidenceGovernanceReviewRecord => row !== null);
};

export const getLatestOfflineArtifactRetentionEvidenceGovernanceReviewForRetentionPolicyEvidence = async (
  retentionPolicyEvidenceIdInput: unknown,
): Promise<OfflineArtifactRetentionEvidenceGovernanceReviewRecord | null> => {
  const retentionPolicyEvidenceId = Number(retentionPolicyEvidenceIdInput);
  if (!Number.isFinite(retentionPolicyEvidenceId) || retentionPolicyEvidenceId <= 0) return null;
  const row = await getAsync(
    `${offlineArtifactRetentionEvidenceGovernanceReviewSelect} WHERE retention_policy_evidence_id = ? ORDER BY created_at DESC, id DESC LIMIT 1`,
    [retentionPolicyEvidenceId],
  );
  return mapOfflineArtifactRetentionEvidenceGovernanceReviewRow(row);
};

export const getOfflineArtifactRetentionEvidenceGovernanceReviewSummary = async (): Promise<OfflineArtifactRetentionEvidenceGovernanceReviewSummary> => {
  const aggregate = await getAsync(`
    SELECT COUNT(*) AS retentionGovernanceReviewRecords,
           SUM(CASE WHEN governance_review_status = 'approved_retention_governance_evidence' THEN 1 ELSE 0 END) AS approvedRetentionGovernanceReviewRecords,
           SUM(CASE WHEN governance_review_status = 'pending_retention_governance_review' OR governance_review_status = 'needs_retention_governance_review' THEN 1 ELSE 0 END) AS pendingRetentionGovernanceReviewRecords,
           SUM(CASE WHEN governance_review_status = 'rejected' THEN 1 ELSE 0 END) AS rejectedRetentionGovernanceReviewRecords,
           SUM(CASE WHEN governance_review_status = 'archived' THEN 1 ELSE 0 END) AS archivedRetentionGovernanceReviewRecords,
           SUM(CASE WHEN signed_retention_governance_hash IS NOT NULL AND length(signed_retention_governance_hash) = 64 THEN 1 ELSE 0 END) AS signedRetentionGovernanceReviewRecords
    FROM ml_offline_artifact_retention_evidence_governance_reviews
  `).catch(() => null);
  const latestRetentionGovernanceReview = (await listOfflineArtifactRetentionEvidenceGovernanceReviews(1))[0] || null;
  const retentionGovernanceArchiveSummary = await import("./mlOfflineArtifactRetentionGovernanceReviewArchives.db")
    .then((module) => module.getOfflineArtifactRetentionGovernanceReviewArchiveSummary())
    .catch(() => null);
  return {
    retentionGovernanceReviewRecords: Number(aggregate?.retentionGovernanceReviewRecords || 0),
    approvedRetentionGovernanceReviewRecords: Number(aggregate?.approvedRetentionGovernanceReviewRecords || 0),
    pendingRetentionGovernanceReviewRecords: Number(aggregate?.pendingRetentionGovernanceReviewRecords || 0),
    rejectedRetentionGovernanceReviewRecords: Number(aggregate?.rejectedRetentionGovernanceReviewRecords || 0),
    archivedRetentionGovernanceReviewRecords: Number(aggregate?.archivedRetentionGovernanceReviewRecords || 0),
    signedRetentionGovernanceReviewRecords: Number(aggregate?.signedRetentionGovernanceReviewRecords || 0),
    latestRetentionGovernanceReview,
    retentionGovernanceArchiveRecords: retentionGovernanceArchiveSummary?.retentionGovernanceArchiveRecords ?? 0,
    preparedRetentionGovernanceArchiveRecords: retentionGovernanceArchiveSummary?.preparedRetentionGovernanceArchiveRecords ?? 0,
    pendingRetentionGovernanceArchiveRecords: retentionGovernanceArchiveSummary?.pendingRetentionGovernanceArchiveRecords ?? 0,
    rejectedRetentionGovernanceArchiveRecords: retentionGovernanceArchiveSummary?.rejectedRetentionGovernanceArchiveRecords ?? 0,
    signedRetentionGovernanceArchiveRecords: retentionGovernanceArchiveSummary?.signedRetentionGovernanceArchiveRecords ?? 0,
    latestRetentionGovernanceArchive: retentionGovernanceArchiveSummary?.latestRetentionGovernanceArchive ?? null,
    safetyStatus: getOfflineArtifactIntakeSafetyGate(),
    retentionEvidenceGovernanceReviewMode: "metadata_retention_governance_review_only",
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
