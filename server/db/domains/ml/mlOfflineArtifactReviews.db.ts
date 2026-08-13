import { allAsync, getAsync, runAsync } from "../../query";
import { getOfflineArtifactById, updateOfflineArtifactStatus } from "./mlOfflineArtifacts.db";
import { clampLimit, safeJson } from "./mlDbUtils";
import { getOfflineArtifactIntakeSafetyGate } from "../../../intelligence/artifacts/artifactSafety";
import type {
  ArtifactIntakeStatus,
  ArtifactQuarantineStatus,
  NormalizedOfflineArtifactQuarantineReviewInput,
  OfflineArtifactQuarantineReviewRecord,
  OfflineArtifactQuarantineReviewSummary,
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

const mapOfflineArtifactReviewRow = (row: Record<string, unknown> | undefined): OfflineArtifactQuarantineReviewRecord | null => {
  if (!row) return null;
  return {
    id: Number(row.id),
    artifactId: Number(row.artifactId),
    artifactSha256: String(row.artifactSha256 || ""),
    modelKey: String(row.modelKey || ""),
    modelVersion: String(row.modelVersion || ""),
    reviewDecision: String(row.reviewDecision || ""),
    reviewStatus: String(row.reviewStatus || ""),
    reviewerNotes: String(row.reviewerNotes || ""),
    rejectionReason: row.rejectionReason == null ? null : String(row.rejectionReason),
    validationFindingsJson: parseJson<Record<string, unknown>>(row.validationFindingsJson, {}),
    lineageComparisonJson: parseJson<Record<string, unknown>>(row.lineageComparisonJson, {}),
    evidenceJson: parseJson<Record<string, unknown>>(row.evidenceJson, {}),
    safetyNotes: parseJson<string[]>(row.safetyNotesJson, []),
    signedReviewHash: String(row.signedReviewHash || ""),
    artifactExecutionAllowed: toBoolean(row.artifactExecutionAllowed),
    artifactAutoActivationAllowed: toBoolean(row.artifactAutoActivationAllowed),
    modelExecutionAllowed: toBoolean(row.modelExecutionAllowed),
    inferenceEndpointExposed: toBoolean(row.inferenceEndpointExposed),
    productionIntegrationAllowed: toBoolean(row.productionIntegrationAllowed),
    canMutateBusinessRecords: toBoolean(row.canMutateBusinessRecords),
    reviewerUserId: row.reviewerUserId as string | number | null,
    reviewerDisplayName: row.reviewerDisplayName == null ? null : String(row.reviewerDisplayName),
    createdAt: String(row.createdAt || ""),
  };
};

const offlineArtifactReviewSelect = `
  SELECT id,
         artifact_id AS artifactId,
         artifact_sha256 AS artifactSha256,
         model_key AS modelKey,
         model_version AS modelVersion,
         review_decision AS reviewDecision,
         review_status AS reviewStatus,
         reviewer_notes AS reviewerNotes,
         rejection_reason AS rejectionReason,
         validation_findings_json AS validationFindingsJson,
         lineage_comparison_json AS lineageComparisonJson,
         evidence_json AS evidenceJson,
         safety_notes_json AS safetyNotesJson,
         signed_review_hash AS signedReviewHash,
         artifact_execution_allowed AS artifactExecutionAllowed,
         artifact_auto_activation_allowed AS artifactAutoActivationAllowed,
         model_execution_allowed AS modelExecutionAllowed,
         inference_endpoint_exposed AS inferenceEndpointExposed,
         production_integration_allowed AS productionIntegrationAllowed,
         can_mutate_business_records AS canMutateBusinessRecords,
         reviewer_user_id AS reviewerUserId,
         reviewer_display_name AS reviewerDisplayName,
         created_at AS createdAt
  FROM ml_offline_artifact_reviews
`;

export const createOfflineArtifactQuarantineReviewRecord = async (payload: {
  input: NormalizedOfflineArtifactQuarantineReviewInput;
  signedReviewHash: string;
  safetyNotes: string[];
  reviewerUserId?: string | number | null;
}): Promise<OfflineArtifactQuarantineReviewRecord | null> => {
  const gate = getOfflineArtifactIntakeSafetyGate();
  const artifact = await getOfflineArtifactById(payload.input.artifactId);
  if (!artifact) return null;
  const result = await runAsync(
    `
      INSERT INTO ml_offline_artifact_reviews (
        artifact_id, artifact_sha256, model_key, model_version,
        review_decision, review_status, reviewer_notes, rejection_reason,
        validation_findings_json, lineage_comparison_json, evidence_json, safety_notes_json,
        signed_review_hash, artifact_execution_allowed, artifact_auto_activation_allowed,
        model_execution_allowed, inference_endpoint_exposed, production_integration_allowed,
        can_mutate_business_records, reviewer_user_id, reviewer_display_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      artifact.id,
      artifact.sha256,
      artifact.modelKey,
      artifact.modelVersion,
      payload.input.reviewDecision,
      payload.input.reviewStatus,
      payload.input.reviewerNotes,
      payload.input.rejectionReason,
      safeJson(payload.input.validationFindingsJson),
      safeJson(payload.input.lineageComparisonJson),
      safeJson(payload.input.evidenceJson),
      safeJson(payload.safetyNotes),
      payload.signedReviewHash,
      gate.artifactExecutionAllowed ? 1 : 0,
      gate.artifactAutoActivationAllowed ? 1 : 0,
      gate.modelExecutionAllowed ? 1 : 0,
      gate.inferenceEndpointExposed ? 1 : 0,
      gate.productionIntegrationAllowed ? 1 : 0,
      gate.canMutateBusinessRecords ? 1 : 0,
      payload.reviewerUserId == null ? null : String(payload.reviewerUserId),
      payload.input.reviewerDisplayName,
    ],
  );
  return getOfflineArtifactQuarantineReviewById(result.lastID);
};

export const getOfflineArtifactQuarantineReviewById = async (idInput: unknown): Promise<OfflineArtifactQuarantineReviewRecord | null> => {
  const id = Number(idInput);
  if (!Number.isFinite(id) || id <= 0) return null;
  const row = await getAsync(`${offlineArtifactReviewSelect} WHERE id = ?`, [id]);
  return mapOfflineArtifactReviewRow(row);
};

export const listOfflineArtifactQuarantineReviews = async (limitInput?: unknown): Promise<OfflineArtifactQuarantineReviewRecord[]> => {
  const limit = clampLimit(limitInput, 25, 200);
  const rows = await allAsync(`${offlineArtifactReviewSelect} ORDER BY created_at DESC, id DESC LIMIT ?`, [limit]);
  return rows.map((row) => mapOfflineArtifactReviewRow(row)).filter((row): row is OfflineArtifactQuarantineReviewRecord => row !== null);
};

export const listOfflineArtifactQuarantineReviewsByArtifactId = async (
  artifactIdInput: unknown,
  limitInput?: unknown,
): Promise<OfflineArtifactQuarantineReviewRecord[]> => {
  const artifactId = Number(artifactIdInput);
  if (!Number.isFinite(artifactId) || artifactId <= 0) return [];
  const limit = clampLimit(limitInput, 25, 200);
  const rows = await allAsync(`${offlineArtifactReviewSelect} WHERE artifact_id = ? ORDER BY created_at DESC, id DESC LIMIT ?`, [artifactId, limit]);
  return rows.map((row) => mapOfflineArtifactReviewRow(row)).filter((row): row is OfflineArtifactQuarantineReviewRecord => row !== null);
};

export const getLatestOfflineArtifactQuarantineReviewForArtifact = async (
  artifactIdInput: unknown,
): Promise<OfflineArtifactQuarantineReviewRecord | null> => {
  const reviews = await listOfflineArtifactQuarantineReviewsByArtifactId(artifactIdInput, 1);
  return reviews[0] || null;
};

export const applyOfflineArtifactReviewStatusToArtifact = async (payload: {
  artifactId: string | number;
  intakeStatus: ArtifactIntakeStatus;
  quarantineStatus: ArtifactQuarantineStatus;
  safetyNotes: string[];
}) => updateOfflineArtifactStatus({
  id: payload.artifactId,
  intakeStatus: payload.intakeStatus,
  quarantineStatus: payload.quarantineStatus,
  safetyNotes: payload.safetyNotes,
});

export const getOfflineArtifactQuarantineReviewSummary = async (): Promise<OfflineArtifactQuarantineReviewSummary> => {
  const aggregate = await getAsync(`
    SELECT COUNT(*) AS reviewRecords,
           SUM(CASE WHEN review_status = 'pending_review' THEN 1 ELSE 0 END) AS pendingReviewRecords,
           SUM(CASE WHEN review_status = 'needs_more_evidence' THEN 1 ELSE 0 END) AS needsMoreEvidenceReviewRecords,
           SUM(CASE WHEN review_status = 'approved_for_shadow_review' THEN 1 ELSE 0 END) AS approvedReviewRecords,
           SUM(CASE WHEN review_status = 'rejected' THEN 1 ELSE 0 END) AS rejectedReviewRecords,
           SUM(CASE WHEN review_status = 'archived' THEN 1 ELSE 0 END) AS archivedReviewRecords,
           SUM(CASE WHEN signed_review_hash IS NOT NULL AND length(signed_review_hash) = 64 THEN 1 ELSE 0 END) AS signedReviewEvidenceRecords
    FROM ml_offline_artifact_reviews
  `);
  const latestReview = (await listOfflineArtifactQuarantineReviews(1))[0] || null;
  return {
    reviewRecords: Number(aggregate?.reviewRecords || 0),
    pendingReviewRecords: Number(aggregate?.pendingReviewRecords || 0),
    needsMoreEvidenceReviewRecords: Number(aggregate?.needsMoreEvidenceReviewRecords || 0),
    approvedReviewRecords: Number(aggregate?.approvedReviewRecords || 0),
    rejectedReviewRecords: Number(aggregate?.rejectedReviewRecords || 0),
    archivedReviewRecords: Number(aggregate?.archivedReviewRecords || 0),
    signedReviewEvidenceRecords: Number(aggregate?.signedReviewEvidenceRecords || 0),
    latestReview,
    safetyStatus: getOfflineArtifactIntakeSafetyGate(),
    reviewMode: "metadata_evidence_only",
    execution: "Off",
    autoActivation: "Off",
    productionInference: "Not exposed",
    productionIntegration: "Off",
    noBusinessMutation: true,
  };
};
