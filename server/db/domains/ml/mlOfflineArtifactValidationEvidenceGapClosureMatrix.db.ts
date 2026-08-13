import { allAsync, getAsync, runAsync } from "../../query";
import { clampLimit, safeJson } from "./mlDbUtils";
import { buildOfflineArtifactValidationSafetyGate } from "../../../intelligence/artifacts/validation/offlineArtifactValidationRules";
import type { OfflineArtifactValidationSafetyGate } from "../../../intelligence/artifacts/validation/offlineArtifactValidationTypes";
import type { OfflineArtifactValidationEvidenceConfidence } from "../../../intelligence/artifacts/validationReviewQueue/offlineArtifactValidationEvidenceReviewPackTypes";
import type {
  OfflineArtifactValidationEvidenceGapClosureMatrixRecord,
  OfflineArtifactValidationEvidenceGapClosureMatrixSnapshot,
  OfflineArtifactValidationEvidenceGapClosureMatrixStatus,
  OfflineArtifactValidationEvidenceGapClosureMatrixSummary,
} from "../../../intelligence/artifacts/validationReviewQueue/offlineArtifactValidationEvidenceGapClosureMatrixTypes";

const parseJson = <T>(value: unknown, fallback: T): T => {
  if (typeof value !== "string" || value.trim().length === 0) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch (_err) {
    return fallback;
  }
};

const fallbackMatrixSnapshot = (): OfflineArtifactValidationEvidenceGapClosureMatrixSnapshot => ({
  phase: "Phase 7E — Offline Artifact Evidence Gap Closure Matrix",
  evidenceReviewPack: {} as OfflineArtifactValidationEvidenceGapClosureMatrixSnapshot["evidenceReviewPack"],
  matrixRows: [],
  openGapKeys: [],
  closedGapKeys: [],
  blockedGapKeys: [],
  advisoryOnly: true,
  executionAllowed: false,
  activationAllowed: false,
  inferenceAllowed: false,
  businessMutationAllowed: false,
  artifactBytesIncluded: false,
  modelOutputIncluded: false,
  automaticApprovalAllowed: false,
});

const mapOfflineArtifactValidationEvidenceGapClosureMatrixRow = (
  row: Record<string, unknown> | undefined,
): OfflineArtifactValidationEvidenceGapClosureMatrixRecord | null => {
  if (!row) return null;
  const safety = parseJson<OfflineArtifactValidationSafetyGate>(row.safetyGateJson, buildOfflineArtifactValidationSafetyGate());
  return {
    id: Number(row.id),
    evidenceReviewPackId: Number(row.evidenceReviewPackId || 0),
    queueItemId: Number(row.queueItemId || 0),
    validationResultId: Number(row.validationResultId || 0),
    artifactId: String(row.artifactId || ""),
    artifactHash: row.artifactHash == null ? null : String(row.artifactHash),
    matrixStatus: String(row.matrixStatus || "needs_more_evidence") as OfflineArtifactValidationEvidenceGapClosureMatrixStatus,
    closureReadinessPct: Number(row.closureReadinessPct || 0),
    totalGapCount: Number(row.totalGapCount || 0),
    openGapCount: Number(row.openGapCount || 0),
    closedGapCount: Number(row.closedGapCount || 0),
    blockedGapCount: Number(row.blockedGapCount || 0),
    criticalOpenGapCount: Number(row.criticalOpenGapCount || 0),
    highOpenGapCount: Number(row.highOpenGapCount || 0),
    evidenceConfidence: String(row.evidenceConfidence || "low") as OfflineArtifactValidationEvidenceConfidence,
    recommendedClosureAction: String(row.recommendedClosureAction || "Review evidence gaps manually; no activation is allowed."),
    matrixSnapshot: parseJson<OfflineArtifactValidationEvidenceGapClosureMatrixSnapshot>(row.matrixSnapshotJson, fallbackMatrixSnapshot()),
    signedEvidenceGapClosureMatrixHash: String(row.signedEvidenceGapClosureMatrixHash || ""),
    safety,
    createdAt: String(row.createdAt || ""),
    createdByUserId: row.createdByUserId as string | number | null,
  };
};

const offlineArtifactValidationEvidenceGapClosureMatrixSelect = `
  SELECT id,
         evidence_review_pack_id AS evidenceReviewPackId,
         queue_item_id AS queueItemId,
         validation_result_id AS validationResultId,
         artifact_id AS artifactId,
         artifact_hash AS artifactHash,
         matrix_status AS matrixStatus,
         closure_readiness_pct AS closureReadinessPct,
         total_gap_count AS totalGapCount,
         open_gap_count AS openGapCount,
         closed_gap_count AS closedGapCount,
         blocked_gap_count AS blockedGapCount,
         critical_open_gap_count AS criticalOpenGapCount,
         high_open_gap_count AS highOpenGapCount,
         evidence_confidence AS evidenceConfidence,
         recommended_closure_action AS recommendedClosureAction,
         matrix_snapshot_json AS matrixSnapshotJson,
         signed_evidence_gap_closure_matrix_hash AS signedEvidenceGapClosureMatrixHash,
         safety_gate_json AS safetyGateJson,
         created_at AS createdAt,
         created_by_user_id AS createdByUserId
  FROM offline_artifact_validation_evidence_gap_closure_matrices
`;

export const recordOfflineArtifactValidationEvidenceGapClosureMatrix = async (
  record: Omit<OfflineArtifactValidationEvidenceGapClosureMatrixRecord, "id" | "createdAt">,
): Promise<OfflineArtifactValidationEvidenceGapClosureMatrixRecord | null> => {
  const insertResult = await runAsync(
    `
      INSERT INTO offline_artifact_validation_evidence_gap_closure_matrices (
        evidence_review_pack_id, queue_item_id, validation_result_id, artifact_id, artifact_hash,
        matrix_status, closure_readiness_pct, total_gap_count, open_gap_count, closed_gap_count,
        blocked_gap_count, critical_open_gap_count, high_open_gap_count, evidence_confidence,
        recommended_closure_action, matrix_snapshot_json, signed_evidence_gap_closure_matrix_hash,
        safety_gate_json, created_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      record.evidenceReviewPackId,
      record.queueItemId,
      record.validationResultId,
      String(record.artifactId),
      record.artifactHash,
      record.matrixStatus,
      record.closureReadinessPct,
      record.totalGapCount,
      record.openGapCount,
      record.closedGapCount,
      record.blockedGapCount,
      record.criticalOpenGapCount,
      record.highOpenGapCount,
      record.evidenceConfidence,
      record.recommendedClosureAction,
      safeJson(record.matrixSnapshot),
      record.signedEvidenceGapClosureMatrixHash,
      safeJson(record.safety),
      record.createdByUserId == null ? null : String(record.createdByUserId),
    ],
  );
  return getOfflineArtifactValidationEvidenceGapClosureMatrixById(insertResult.lastID);
};

export const getOfflineArtifactValidationEvidenceGapClosureMatrixById = async (
  idInput: unknown,
): Promise<OfflineArtifactValidationEvidenceGapClosureMatrixRecord | null> => {
  const id = Number(idInput);
  if (!Number.isFinite(id) || id <= 0) return null;
  const row = await getAsync(`${offlineArtifactValidationEvidenceGapClosureMatrixSelect} WHERE id = ?`, [id]);
  return mapOfflineArtifactValidationEvidenceGapClosureMatrixRow(row);
};

export const listOfflineArtifactValidationEvidenceGapClosureMatrices = async (
  limitInput?: unknown,
): Promise<OfflineArtifactValidationEvidenceGapClosureMatrixRecord[]> => {
  const limit = clampLimit(limitInput, 50, 500);
  const rows = await allAsync(`${offlineArtifactValidationEvidenceGapClosureMatrixSelect} ORDER BY created_at DESC, id DESC LIMIT ?`, [limit]);
  return rows.map((row) => mapOfflineArtifactValidationEvidenceGapClosureMatrixRow(row)).filter((row): row is OfflineArtifactValidationEvidenceGapClosureMatrixRecord => row !== null);
};

export const getLatestOfflineArtifactValidationEvidenceGapClosureMatrixForEvidenceReviewPack = async (
  evidenceReviewPackIdInput: unknown,
): Promise<OfflineArtifactValidationEvidenceGapClosureMatrixRecord | null> => {
  const evidenceReviewPackId = Number(evidenceReviewPackIdInput);
  if (!Number.isFinite(evidenceReviewPackId) || evidenceReviewPackId <= 0) return null;
  const row = await getAsync(
    `${offlineArtifactValidationEvidenceGapClosureMatrixSelect} WHERE evidence_review_pack_id = ? ORDER BY created_at DESC, id DESC LIMIT 1`,
    [evidenceReviewPackId],
  ).catch(() => null);
  return mapOfflineArtifactValidationEvidenceGapClosureMatrixRow(row);
};

export const getOfflineArtifactValidationEvidenceGapClosureMatrixSummary = async (): Promise<OfflineArtifactValidationEvidenceGapClosureMatrixSummary> => {
  const aggregate = await getAsync(`
    SELECT COUNT(*) AS totalMatrices,
           SUM(CASE WHEN matrix_status = 'no_gaps_detected' THEN 1 ELSE 0 END) AS noGapsDetectedMatrices,
           SUM(CASE WHEN matrix_status = 'closure_ready' THEN 1 ELSE 0 END) AS closureReadyMatrices,
           SUM(CASE WHEN matrix_status = 'partial_closure' THEN 1 ELSE 0 END) AS partialClosureMatrices,
           SUM(CASE WHEN matrix_status = 'needs_more_evidence' THEN 1 ELSE 0 END) AS needsMoreEvidenceMatrices,
           SUM(CASE WHEN matrix_status = 'critical_gap_open' THEN 1 ELSE 0 END) AS criticalGapOpenMatrices,
           SUM(open_gap_count) AS totalOpenGapCount,
           SUM(critical_open_gap_count) AS totalCriticalOpenGapCount,
           SUM(high_open_gap_count) AS totalHighOpenGapCount,
           AVG(closure_readiness_pct) AS averageClosureReadinessPct
    FROM offline_artifact_validation_evidence_gap_closure_matrices
  `).catch(() => null) as Record<string, unknown> | null;
  const latestMatrix = (await listOfflineArtifactValidationEvidenceGapClosureMatrices(1))[0] || null;
  const totalOpenGapCount = Number(aggregate?.totalOpenGapCount || 0);
  const totalCriticalOpenGapCount = Number(aggregate?.totalCriticalOpenGapCount || 0);
  const totalHighOpenGapCount = Number(aggregate?.totalHighOpenGapCount || 0);
  return {
    totalMatrices: Number(aggregate?.totalMatrices || 0),
    noGapsDetectedMatrices: Number(aggregate?.noGapsDetectedMatrices || 0),
    closureReadyMatrices: Number(aggregate?.closureReadyMatrices || 0),
    partialClosureMatrices: Number(aggregate?.partialClosureMatrices || 0),
    needsMoreEvidenceMatrices: Number(aggregate?.needsMoreEvidenceMatrices || 0),
    criticalGapOpenMatrices: Number(aggregate?.criticalGapOpenMatrices || 0),
    totalOpenGapCount,
    totalCriticalOpenGapCount,
    totalHighOpenGapCount,
    averageClosureReadinessPct: Number(aggregate?.averageClosureReadinessPct || 0),
    latestMatrix,
    recommendedNextAction: totalCriticalOpenGapCount > 0
      ? "Close or escalate critical metadata evidence gaps before any future shadow-only review."
      : totalOpenGapCount > 0 || totalHighOpenGapCount > 0
        ? "Continue metadata-only gap closure until no high-priority evidence gaps remain open."
        : "Evidence gap closure matrices are ready for human reading; remain offline, advisory-only, and non-executing.",
    safety: buildOfflineArtifactValidationSafetyGate(),
  };
};
