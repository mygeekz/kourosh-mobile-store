import { allAsync, getAsync, runAsync } from "../../query";
import { getOfflineArtifactReviewBinderById } from "./mlOfflineArtifactReviewBinders.db";
import { clampLimit, safeJson } from "./mlDbUtils";
import { getOfflineArtifactIntakeSafetyGate } from "../../../intelligence/artifacts/artifactSafety";
import type {
  NormalizedOfflineArtifactReviewBinderGovernanceSignoffInput,
  OfflineArtifactReviewBinderGovernanceSignoffRecord,
  OfflineArtifactReviewBinderGovernanceSignoffSummary,
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

export const mapOfflineArtifactReviewBinderGovernanceSignoffRow = (
  row: Record<string, unknown> | undefined,
): OfflineArtifactReviewBinderGovernanceSignoffRecord | null => {
  if (!row) return null;
  return {
    id: Number(row.id),
    binderId: Number(row.binderId),
    artifactId: Number(row.artifactId),
    artifactSha256: String(row.artifactSha256 || ""),
    modelKey: String(row.modelKey || ""),
    modelVersion: String(row.modelVersion || ""),
    signedBinderHash: String(row.signedBinderHash || ""),
    signoffDecision: String(row.signoffDecision || ""),
    signoffStatus: String(row.signoffStatus || ""),
    signerNotes: String(row.signerNotes || ""),
    rejectionReason: row.rejectionReason == null ? null : String(row.rejectionReason),
    governanceFindingsJson: parseJson<Record<string, unknown>>(row.governanceFindingsJson, {}),
    evidenceCompletenessJson: parseJson<Record<string, unknown>>(row.evidenceCompletenessJson, {}),
    riskAcceptanceJson: parseJson<Record<string, unknown>>(row.riskAcceptanceJson, {}),
    safetyNotes: parseJson<string[]>(row.safetyNotesJson, []),
    signedGovernanceHash: String(row.signedGovernanceHash || ""),
    artifactExecutionAllowed: toBoolean(row.artifactExecutionAllowed),
    artifactAutoActivationAllowed: toBoolean(row.artifactAutoActivationAllowed),
    modelExecutionAllowed: toBoolean(row.modelExecutionAllowed),
    inferenceEndpointExposed: toBoolean(row.inferenceEndpointExposed),
    productionIntegrationAllowed: toBoolean(row.productionIntegrationAllowed),
    canMutateBusinessRecords: toBoolean(row.canMutateBusinessRecords),
    exportFileCreated: toBoolean(row.exportFileCreated),
    artifactBytesIncluded: toBoolean(row.artifactBytesIncluded),
    binderActivationAllowed: toBoolean(row.binderActivationAllowed),
    signerUserId: row.signerUserId as string | number | null,
    signerDisplayName: row.signerDisplayName == null ? null : String(row.signerDisplayName),
    createdAt: String(row.createdAt || ""),
  };
};

const offlineArtifactReviewBinderGovernanceSignoffSelect = `
  SELECT id,
         binder_id AS binderId,
         artifact_id AS artifactId,
         artifact_sha256 AS artifactSha256,
         model_key AS modelKey,
         model_version AS modelVersion,
         signed_binder_hash AS signedBinderHash,
         signoff_decision AS signoffDecision,
         signoff_status AS signoffStatus,
         signer_notes AS signerNotes,
         rejection_reason AS rejectionReason,
         governance_findings_json AS governanceFindingsJson,
         evidence_completeness_json AS evidenceCompletenessJson,
         risk_acceptance_json AS riskAcceptanceJson,
         safety_notes_json AS safetyNotesJson,
         signed_governance_hash AS signedGovernanceHash,
         artifact_execution_allowed AS artifactExecutionAllowed,
         artifact_auto_activation_allowed AS artifactAutoActivationAllowed,
         model_execution_allowed AS modelExecutionAllowed,
         inference_endpoint_exposed AS inferenceEndpointExposed,
         production_integration_allowed AS productionIntegrationAllowed,
         can_mutate_business_records AS canMutateBusinessRecords,
         export_file_created AS exportFileCreated,
         artifact_bytes_included AS artifactBytesIncluded,
         binder_activation_allowed AS binderActivationAllowed,
         signer_user_id AS signerUserId,
         signer_display_name AS signerDisplayName,
         created_at AS createdAt
  FROM ml_offline_artifact_review_binder_governance_signoffs
`;

export const createOfflineArtifactReviewBinderGovernanceSignoffRecord = async (payload: {
  input: NormalizedOfflineArtifactReviewBinderGovernanceSignoffInput;
  signedGovernanceHash: string;
  safetyNotes: string[];
  signerUserId?: string | number | null;
}): Promise<OfflineArtifactReviewBinderGovernanceSignoffRecord | null> => {
  const gate = getOfflineArtifactIntakeSafetyGate();
  const binder = await getOfflineArtifactReviewBinderById(payload.input.binderId);
  if (!binder) return null;

  const result = await runAsync(
    `
      INSERT INTO ml_offline_artifact_review_binder_governance_signoffs (
        binder_id, artifact_id, artifact_sha256, model_key, model_version,
        signed_binder_hash, signoff_decision, signoff_status, signer_notes, rejection_reason,
        governance_findings_json, evidence_completeness_json, risk_acceptance_json, safety_notes_json,
        signed_governance_hash, artifact_execution_allowed, artifact_auto_activation_allowed,
        model_execution_allowed, inference_endpoint_exposed, production_integration_allowed,
        can_mutate_business_records, export_file_created, artifact_bytes_included,
        binder_activation_allowed, signer_user_id, signer_display_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      binder.id,
      binder.artifactId,
      binder.artifactSha256,
      binder.modelKey,
      binder.modelVersion,
      binder.signedBinderHash,
      payload.input.signoffDecision,
      payload.input.signoffStatus,
      payload.input.signerNotes,
      payload.input.rejectionReason,
      safeJson(payload.input.governanceFindingsJson),
      safeJson(payload.input.evidenceCompletenessJson),
      safeJson(payload.input.riskAcceptanceJson),
      safeJson(payload.safetyNotes),
      payload.signedGovernanceHash,
      gate.artifactExecutionAllowed ? 1 : 0,
      gate.artifactAutoActivationAllowed ? 1 : 0,
      gate.modelExecutionAllowed ? 1 : 0,
      gate.inferenceEndpointExposed ? 1 : 0,
      gate.productionIntegrationAllowed ? 1 : 0,
      gate.canMutateBusinessRecords ? 1 : 0,
      0,
      0,
      0,
      payload.signerUserId == null ? null : String(payload.signerUserId),
      payload.input.signerDisplayName,
    ],
  );

  return getOfflineArtifactReviewBinderGovernanceSignoffById(result.lastID);
};

export const getOfflineArtifactReviewBinderGovernanceSignoffById = async (
  idInput: unknown,
): Promise<OfflineArtifactReviewBinderGovernanceSignoffRecord | null> => {
  const id = Number(idInput);
  if (!Number.isFinite(id) || id <= 0) return null;
  const row = await getAsync(`${offlineArtifactReviewBinderGovernanceSignoffSelect} WHERE id = ?`, [id]);
  return mapOfflineArtifactReviewBinderGovernanceSignoffRow(row);
};

export const listOfflineArtifactReviewBinderGovernanceSignoffs = async (
  limitInput?: unknown,
): Promise<OfflineArtifactReviewBinderGovernanceSignoffRecord[]> => {
  const limit = clampLimit(limitInput, 25, 200);
  const rows = await allAsync(`${offlineArtifactReviewBinderGovernanceSignoffSelect} ORDER BY created_at DESC, id DESC LIMIT ?`, [limit]);
  return rows
    .map((row) => mapOfflineArtifactReviewBinderGovernanceSignoffRow(row))
    .filter((row): row is OfflineArtifactReviewBinderGovernanceSignoffRecord => row !== null);
};

export const listOfflineArtifactReviewBinderGovernanceSignoffsByBinderId = async (
  binderIdInput: unknown,
  limitInput?: unknown,
): Promise<OfflineArtifactReviewBinderGovernanceSignoffRecord[]> => {
  const binderId = Number(binderIdInput);
  if (!Number.isFinite(binderId) || binderId <= 0) return [];
  const limit = clampLimit(limitInput, 25, 200);
  const rows = await allAsync(
    `${offlineArtifactReviewBinderGovernanceSignoffSelect} WHERE binder_id = ? ORDER BY created_at DESC, id DESC LIMIT ?`,
    [binderId, limit],
  );
  return rows
    .map((row) => mapOfflineArtifactReviewBinderGovernanceSignoffRow(row))
    .filter((row): row is OfflineArtifactReviewBinderGovernanceSignoffRecord => row !== null);
};

export const listOfflineArtifactReviewBinderGovernanceSignoffsByArtifactId = async (
  artifactIdInput: unknown,
  limitInput?: unknown,
): Promise<OfflineArtifactReviewBinderGovernanceSignoffRecord[]> => {
  const artifactId = Number(artifactIdInput);
  if (!Number.isFinite(artifactId) || artifactId <= 0) return [];
  const limit = clampLimit(limitInput, 25, 200);
  const rows = await allAsync(
    `${offlineArtifactReviewBinderGovernanceSignoffSelect} WHERE artifact_id = ? ORDER BY created_at DESC, id DESC LIMIT ?`,
    [artifactId, limit],
  );
  return rows
    .map((row) => mapOfflineArtifactReviewBinderGovernanceSignoffRow(row))
    .filter((row): row is OfflineArtifactReviewBinderGovernanceSignoffRecord => row !== null);
};

export const getLatestOfflineArtifactReviewBinderGovernanceSignoffForBinder = async (
  binderIdInput: unknown,
): Promise<OfflineArtifactReviewBinderGovernanceSignoffRecord | null> => {
  const signoffs = await listOfflineArtifactReviewBinderGovernanceSignoffsByBinderId(binderIdInput, 1);
  return signoffs[0] || null;
};

export const getOfflineArtifactReviewBinderGovernanceSignoffSummary = async (): Promise<OfflineArtifactReviewBinderGovernanceSignoffSummary> => {
  const aggregate = await getAsync(`
    SELECT COUNT(*) AS governanceSignoffRecords,
           SUM(CASE WHEN signoff_status = 'pending_governance_review' OR signoff_status = 'needs_governance_review' THEN 1 ELSE 0 END) AS pendingGovernanceSignoffRecords,
           SUM(CASE WHEN signoff_status = 'approved_governance_readiness' THEN 1 ELSE 0 END) AS approvedGovernanceSignoffRecords,
           SUM(CASE WHEN signoff_status = 'rejected' THEN 1 ELSE 0 END) AS rejectedGovernanceSignoffRecords,
           SUM(CASE WHEN signoff_status = 'archived' THEN 1 ELSE 0 END) AS archivedGovernanceSignoffRecords,
           SUM(CASE WHEN signed_governance_hash IS NOT NULL AND length(signed_governance_hash) = 64 THEN 1 ELSE 0 END) AS signedGovernanceSignoffRecords
    FROM ml_offline_artifact_review_binder_governance_signoffs
  `);
  const latestGovernanceSignoff = (await listOfflineArtifactReviewBinderGovernanceSignoffs(1))[0] || null;
  const archivePackSummary = await import("./mlOfflineArtifactGovernanceSignoffArchivePacks.db")
    .then((module) => module.getOfflineArtifactGovernanceSignoffArchivePackSummary())
    .catch(() => null);
  return {
    governanceSignoffRecords: Number(aggregate?.governanceSignoffRecords || 0),
    pendingGovernanceSignoffRecords: Number(aggregate?.pendingGovernanceSignoffRecords || 0),
    approvedGovernanceSignoffRecords: Number(aggregate?.approvedGovernanceSignoffRecords || 0),
    rejectedGovernanceSignoffRecords: Number(aggregate?.rejectedGovernanceSignoffRecords || 0),
    archivedGovernanceSignoffRecords: Number(aggregate?.archivedGovernanceSignoffRecords || 0),
    signedGovernanceSignoffRecords: Number(aggregate?.signedGovernanceSignoffRecords || 0),
    latestGovernanceSignoff,
    latestArchivePack: archivePackSummary?.latestArchivePack ?? null,
    safetyStatus: getOfflineArtifactIntakeSafetyGate(),
    governanceSignoffMode: "metadata_signoff_only",
    exportFileCreated: false,
    artifactBytesIncluded: false,
    binderActivationAllowed: false,
    execution: "Off",
    autoActivation: "Off",
    productionInference: "Not exposed",
    productionIntegration: "Off",
    noBusinessMutation: true,
  };
};
