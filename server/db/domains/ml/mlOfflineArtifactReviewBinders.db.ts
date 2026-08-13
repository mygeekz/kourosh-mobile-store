import { allAsync, getAsync, runAsync } from "../../query";
import { getOfflineArtifactById } from "./mlOfflineArtifacts.db";
import { getLatestOfflineArtifactQuarantineReviewForArtifact } from "./mlOfflineArtifactReviews.db";
import { clampLimit, safeJson } from "./mlDbUtils";
import { getOfflineArtifactIntakeSafetyGate } from "../../../intelligence/artifacts/artifactSafety";
import type {
  NormalizedOfflineArtifactReviewBinderInput,
  OfflineArtifactReviewBinderRecord,
  OfflineArtifactReviewBinderSummary,
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

const mapOfflineArtifactReviewBinderRow = (row: Record<string, unknown> | undefined): OfflineArtifactReviewBinderRecord | null => {
  if (!row) return null;
  return {
    id: Number(row.id),
    artifactId: Number(row.artifactId),
    artifactSha256: String(row.artifactSha256 || ""),
    modelKey: String(row.modelKey || ""),
    modelVersion: String(row.modelVersion || ""),
    latestReviewId: row.latestReviewId == null ? null : Number(row.latestReviewId),
    latestReviewHash: row.latestReviewHash == null ? null : String(row.latestReviewHash),
    binderStatus: String(row.binderStatus || ""),
    binderPurpose: String(row.binderPurpose || ""),
    binderManifestJson: parseJson<Record<string, unknown>>(row.binderManifestJson, {}),
    traceabilityManifestJson: parseJson<Record<string, unknown>>(row.traceabilityManifestJson, {}),
    evidenceIndexJson: parseJson<Record<string, unknown>>(row.evidenceIndexJson, {}),
    exportReadinessNotesJson: parseJson<Record<string, unknown>>(row.exportReadinessNotesJson, {}),
    safetyNotes: parseJson<string[]>(row.safetyNotesJson, []),
    signedBinderHash: String(row.signedBinderHash || ""),
    artifactExecutionAllowed: toBoolean(row.artifactExecutionAllowed),
    artifactAutoActivationAllowed: toBoolean(row.artifactAutoActivationAllowed),
    modelExecutionAllowed: toBoolean(row.modelExecutionAllowed),
    inferenceEndpointExposed: toBoolean(row.inferenceEndpointExposed),
    productionIntegrationAllowed: toBoolean(row.productionIntegrationAllowed),
    canMutateBusinessRecords: toBoolean(row.canMutateBusinessRecords),
    exportFileCreated: toBoolean(row.exportFileCreated),
    artifactBytesIncluded: toBoolean(row.artifactBytesIncluded),
    createdByUserId: row.createdByUserId as string | number | null,
    createdAt: String(row.createdAt || ""),
  };
};

const offlineArtifactReviewBinderSelect = `
  SELECT id,
         artifact_id AS artifactId,
         artifact_sha256 AS artifactSha256,
         model_key AS modelKey,
         model_version AS modelVersion,
         latest_review_id AS latestReviewId,
         latest_review_hash AS latestReviewHash,
         binder_status AS binderStatus,
         binder_purpose AS binderPurpose,
         binder_manifest_json AS binderManifestJson,
         traceability_manifest_json AS traceabilityManifestJson,
         evidence_index_json AS evidenceIndexJson,
         export_readiness_notes_json AS exportReadinessNotesJson,
         safety_notes_json AS safetyNotesJson,
         signed_binder_hash AS signedBinderHash,
         artifact_execution_allowed AS artifactExecutionAllowed,
         artifact_auto_activation_allowed AS artifactAutoActivationAllowed,
         model_execution_allowed AS modelExecutionAllowed,
         inference_endpoint_exposed AS inferenceEndpointExposed,
         production_integration_allowed AS productionIntegrationAllowed,
         can_mutate_business_records AS canMutateBusinessRecords,
         export_file_created AS exportFileCreated,
         artifact_bytes_included AS artifactBytesIncluded,
         created_by_user_id AS createdByUserId,
         created_at AS createdAt
  FROM ml_offline_artifact_review_binders
`;

export const createOfflineArtifactReviewBinderRecord = async (payload: {
  input: NormalizedOfflineArtifactReviewBinderInput;
  binderManifestJson: Record<string, unknown>;
  signedBinderHash: string;
  safetyNotes: string[];
  createdByUserId?: string | number | null;
}): Promise<OfflineArtifactReviewBinderRecord | null> => {
  const gate = getOfflineArtifactIntakeSafetyGate();
  const artifact = await getOfflineArtifactById(payload.input.artifactId);
  if (!artifact) return null;
  const latestReview = await getLatestOfflineArtifactQuarantineReviewForArtifact(artifact.id);
  const binderStatus = latestReview ? "prepared" : "needs_review";
  const result = await runAsync(
    `
      INSERT INTO ml_offline_artifact_review_binders (
        artifact_id, artifact_sha256, model_key, model_version,
        latest_review_id, latest_review_hash, binder_status, binder_purpose,
        binder_manifest_json, traceability_manifest_json, evidence_index_json,
        export_readiness_notes_json, safety_notes_json, signed_binder_hash,
        artifact_execution_allowed, artifact_auto_activation_allowed, model_execution_allowed,
        inference_endpoint_exposed, production_integration_allowed, can_mutate_business_records,
        export_file_created, artifact_bytes_included, created_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      artifact.id,
      artifact.sha256,
      artifact.modelKey,
      artifact.modelVersion,
      latestReview?.id ?? null,
      latestReview?.signedReviewHash ?? null,
      binderStatus,
      payload.input.binderPurpose,
      safeJson(payload.binderManifestJson),
      safeJson(payload.input.traceabilityManifestJson),
      safeJson(payload.input.evidenceIndexJson),
      safeJson(payload.input.exportReadinessNotesJson),
      safeJson(payload.safetyNotes),
      payload.signedBinderHash,
      gate.artifactExecutionAllowed ? 1 : 0,
      gate.artifactAutoActivationAllowed ? 1 : 0,
      gate.modelExecutionAllowed ? 1 : 0,
      gate.inferenceEndpointExposed ? 1 : 0,
      gate.productionIntegrationAllowed ? 1 : 0,
      gate.canMutateBusinessRecords ? 1 : 0,
      0,
      0,
      payload.createdByUserId == null ? null : String(payload.createdByUserId),
    ],
  );
  return getOfflineArtifactReviewBinderById(result.lastID);
};

export const getOfflineArtifactReviewBinderById = async (idInput: unknown): Promise<OfflineArtifactReviewBinderRecord | null> => {
  const id = Number(idInput);
  if (!Number.isFinite(id) || id <= 0) return null;
  const row = await getAsync(`${offlineArtifactReviewBinderSelect} WHERE id = ?`, [id]);
  return mapOfflineArtifactReviewBinderRow(row);
};

export const listOfflineArtifactReviewBinders = async (limitInput?: unknown): Promise<OfflineArtifactReviewBinderRecord[]> => {
  const limit = clampLimit(limitInput, 25, 200);
  const rows = await allAsync(`${offlineArtifactReviewBinderSelect} ORDER BY created_at DESC, id DESC LIMIT ?`, [limit]);
  return rows.map((row) => mapOfflineArtifactReviewBinderRow(row)).filter((row): row is OfflineArtifactReviewBinderRecord => row !== null);
};

export const listOfflineArtifactReviewBindersByArtifactId = async (
  artifactIdInput: unknown,
  limitInput?: unknown,
): Promise<OfflineArtifactReviewBinderRecord[]> => {
  const artifactId = Number(artifactIdInput);
  if (!Number.isFinite(artifactId) || artifactId <= 0) return [];
  const limit = clampLimit(limitInput, 25, 200);
  const rows = await allAsync(`${offlineArtifactReviewBinderSelect} WHERE artifact_id = ? ORDER BY created_at DESC, id DESC LIMIT ?`, [artifactId, limit]);
  return rows.map((row) => mapOfflineArtifactReviewBinderRow(row)).filter((row): row is OfflineArtifactReviewBinderRecord => row !== null);
};

export const getLatestOfflineArtifactReviewBinderForArtifact = async (
  artifactIdInput: unknown,
): Promise<OfflineArtifactReviewBinderRecord | null> => {
  const binders = await listOfflineArtifactReviewBindersByArtifactId(artifactIdInput, 1);
  return binders[0] || null;
};

export const getOfflineArtifactReviewBinderSummary = async (): Promise<OfflineArtifactReviewBinderSummary> => {
  const aggregate = await getAsync(`
    SELECT COUNT(*) AS binderReadinessRecords,
           SUM(CASE WHEN binder_status = 'prepared' THEN 1 ELSE 0 END) AS preparedBinderRecords,
           SUM(CASE WHEN binder_status = 'blocked' THEN 1 ELSE 0 END) AS blockedBinderRecords,
           SUM(CASE WHEN binder_status = 'archived' THEN 1 ELSE 0 END) AS archivedBinderRecords,
           SUM(CASE WHEN signed_binder_hash IS NOT NULL AND length(signed_binder_hash) = 64 THEN 1 ELSE 0 END) AS signedBinderManifestRecords
    FROM ml_offline_artifact_review_binders
  `);
  const latestBinder = (await listOfflineArtifactReviewBinders(1))[0] || null;
  return {
    binderReadinessRecords: Number(aggregate?.binderReadinessRecords || 0),
    preparedBinderRecords: Number(aggregate?.preparedBinderRecords || 0),
    blockedBinderRecords: Number(aggregate?.blockedBinderRecords || 0),
    archivedBinderRecords: Number(aggregate?.archivedBinderRecords || 0),
    signedBinderManifestRecords: Number(aggregate?.signedBinderManifestRecords || 0),
    latestBinder,
    safetyStatus: getOfflineArtifactIntakeSafetyGate(),
    binderExportMode: "metadata_manifest_only",
    exportFileCreated: false,
    artifactBytesIncluded: false,
    execution: "Off",
    autoActivation: "Off",
    productionInference: "Not exposed",
    productionIntegration: "Off",
    noBusinessMutation: true,
  };
};
