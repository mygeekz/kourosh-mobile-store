import { allAsync, getAsync, runAsync } from "../../query";
import { clampLimit, safeJson } from "./mlDbUtils";
import { buildOfflineArtifactValidationSafetyGate } from "../../../intelligence/artifacts/validation/offlineArtifactValidationRules";
import type { OfflineArtifactValidationSafetyGate } from "../../../intelligence/artifacts/validation/offlineArtifactValidationTypes";
import type {
  OfflineArtifactValidationEvidenceConfidence,
  OfflineArtifactValidationEvidenceReviewPackRecord,
  OfflineArtifactValidationEvidenceReviewPackSnapshot,
  OfflineArtifactValidationEvidenceReviewPackStatus,
  OfflineArtifactValidationEvidenceReviewPackSummary,
} from "../../../intelligence/artifacts/validationReviewQueue/offlineArtifactValidationEvidenceReviewPackTypes";

const parseJson = <T>(value: unknown, fallback: T): T => {
  if (typeof value !== "string" || value.trim().length === 0) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch (_err) {
    return fallback;
  }
};

const mapOfflineArtifactValidationEvidenceReviewPackRow = (
  row: Record<string, unknown> | undefined,
): OfflineArtifactValidationEvidenceReviewPackRecord | null => {
  if (!row) return null;
  const safety = parseJson<OfflineArtifactValidationSafetyGate>(row.safetyGateJson, buildOfflineArtifactValidationSafetyGate());
  return {
    id: Number(row.id),
    queueItemId: Number(row.queueItemId || 0),
    validationResultId: Number(row.validationResultId || 0),
    artifactId: String(row.artifactId || ""),
    artifactHash: row.artifactHash == null ? null : String(row.artifactHash),
    packStatus: String(row.packStatus || "needs_more_evidence") as OfflineArtifactValidationEvidenceReviewPackStatus,
    evidenceConfidence: String(row.evidenceConfidence || "low") as OfflineArtifactValidationEvidenceConfidence,
    evidenceNoteCount: Number(row.evidenceNoteCount || 0),
    assignmentEventCount: Number(row.assignmentEventCount || 0),
    reviewerNoteCount: Number(row.reviewerNoteCount || 0),
    unresolvedEvidenceGapCount: Number(row.unresolvedEvidenceGapCount || 0),
    recommendedReviewerAction: String(row.recommendedReviewerAction || "Review metadata evidence manually; no activation is allowed."),
    packSnapshot: parseJson<OfflineArtifactValidationEvidenceReviewPackSnapshot>(row.packSnapshotJson, {
      phase: "Phase 7D — Offline Artifact Validation Evidence Note Review Pack",
      queueItem: {} as OfflineArtifactValidationEvidenceReviewPackSnapshot["queueItem"],
      assignmentEvents: [],
      evidenceNotes: [],
      reviewerNotes: [],
      evidenceReferences: [],
      unresolvedEvidenceGaps: [],
      advisoryOnly: true,
      executionAllowed: false,
      activationAllowed: false,
      inferenceAllowed: false,
      businessMutationAllowed: false,
      artifactBytesIncluded: false,
      modelOutputIncluded: false,
    }),
    signedEvidenceReviewPackHash: String(row.signedEvidenceReviewPackHash || ""),
    safety,
    createdAt: String(row.createdAt || ""),
    createdByUserId: row.createdByUserId as string | number | null,
  };
};

const offlineArtifactValidationEvidenceReviewPackSelect = `
  SELECT id,
         queue_item_id AS queueItemId,
         validation_result_id AS validationResultId,
         artifact_id AS artifactId,
         artifact_hash AS artifactHash,
         pack_status AS packStatus,
         evidence_confidence AS evidenceConfidence,
         evidence_note_count AS evidenceNoteCount,
         assignment_event_count AS assignmentEventCount,
         reviewer_note_count AS reviewerNoteCount,
         unresolved_evidence_gap_count AS unresolvedEvidenceGapCount,
         recommended_reviewer_action AS recommendedReviewerAction,
         pack_snapshot_json AS packSnapshotJson,
         signed_evidence_review_pack_hash AS signedEvidenceReviewPackHash,
         safety_gate_json AS safetyGateJson,
         created_at AS createdAt,
         created_by_user_id AS createdByUserId
  FROM offline_artifact_validation_evidence_review_packs
`;

export const recordOfflineArtifactValidationEvidenceReviewPack = async (
  record: Omit<OfflineArtifactValidationEvidenceReviewPackRecord, "id" | "createdAt">,
): Promise<OfflineArtifactValidationEvidenceReviewPackRecord | null> => {
  const insertResult = await runAsync(
    `
      INSERT INTO offline_artifact_validation_evidence_review_packs (
        queue_item_id, validation_result_id, artifact_id, artifact_hash, pack_status,
        evidence_confidence, evidence_note_count, assignment_event_count, reviewer_note_count,
        unresolved_evidence_gap_count, recommended_reviewer_action, pack_snapshot_json,
        signed_evidence_review_pack_hash, safety_gate_json, created_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      record.queueItemId,
      record.validationResultId,
      String(record.artifactId),
      record.artifactHash,
      record.packStatus,
      record.evidenceConfidence,
      record.evidenceNoteCount,
      record.assignmentEventCount,
      record.reviewerNoteCount,
      record.unresolvedEvidenceGapCount,
      record.recommendedReviewerAction,
      safeJson(record.packSnapshot),
      record.signedEvidenceReviewPackHash,
      safeJson(record.safety),
      record.createdByUserId == null ? null : String(record.createdByUserId),
    ],
  );
  return getOfflineArtifactValidationEvidenceReviewPackById(insertResult.lastID);
};

export const getOfflineArtifactValidationEvidenceReviewPackById = async (
  idInput: unknown,
): Promise<OfflineArtifactValidationEvidenceReviewPackRecord | null> => {
  const id = Number(idInput);
  if (!Number.isFinite(id) || id <= 0) return null;
  const row = await getAsync(`${offlineArtifactValidationEvidenceReviewPackSelect} WHERE id = ?`, [id]);
  return mapOfflineArtifactValidationEvidenceReviewPackRow(row);
};

export const listOfflineArtifactValidationEvidenceReviewPacks = async (
  limitInput?: unknown,
): Promise<OfflineArtifactValidationEvidenceReviewPackRecord[]> => {
  const limit = clampLimit(limitInput, 50, 500);
  const rows = await allAsync(`${offlineArtifactValidationEvidenceReviewPackSelect} ORDER BY created_at DESC, id DESC LIMIT ?`, [limit]);
  return rows.map((row) => mapOfflineArtifactValidationEvidenceReviewPackRow(row)).filter((row): row is OfflineArtifactValidationEvidenceReviewPackRecord => row !== null);
};

export const getLatestOfflineArtifactValidationEvidenceReviewPackForQueueItem = async (
  queueItemIdInput: unknown,
): Promise<OfflineArtifactValidationEvidenceReviewPackRecord | null> => {
  const queueItemId = Number(queueItemIdInput);
  if (!Number.isFinite(queueItemId) || queueItemId <= 0) return null;
  const row = await getAsync(
    `${offlineArtifactValidationEvidenceReviewPackSelect} WHERE queue_item_id = ? ORDER BY created_at DESC, id DESC LIMIT 1`,
    [queueItemId],
  ).catch(() => null);
  return mapOfflineArtifactValidationEvidenceReviewPackRow(row);
};

export const getOfflineArtifactValidationEvidenceReviewPackSummary = async (): Promise<OfflineArtifactValidationEvidenceReviewPackSummary> => {
  const aggregate = await getAsync(`
    SELECT COUNT(*) AS totalPacks,
           SUM(CASE WHEN pack_status = 'ready_for_review' THEN 1 ELSE 0 END) AS readyForReviewPacks,
           SUM(CASE WHEN pack_status = 'needs_more_evidence' THEN 1 ELSE 0 END) AS needsMoreEvidencePacks,
           SUM(CASE WHEN pack_status = 'critical_review_required' THEN 1 ELSE 0 END) AS criticalReviewRequiredPacks,
           SUM(CASE WHEN pack_status = 'closed_shadow_only' THEN 1 ELSE 0 END) AS closedShadowOnlyPacks,
           SUM(CASE WHEN pack_status = 'quarantine_or_reject_recommended' THEN 1 ELSE 0 END) AS quarantineOrRejectRecommendedPacks,
           SUM(CASE WHEN evidence_confidence = 'low' THEN 1 ELSE 0 END) AS lowConfidencePacks,
           SUM(CASE WHEN evidence_confidence = 'medium' THEN 1 ELSE 0 END) AS mediumConfidencePacks,
           SUM(CASE WHEN evidence_confidence = 'high' THEN 1 ELSE 0 END) AS highConfidencePacks,
           SUM(unresolved_evidence_gap_count) AS unresolvedEvidenceGapCount
    FROM offline_artifact_validation_evidence_review_packs
  `).catch(() => null) as Record<string, unknown> | null;
  const latestPack = (await listOfflineArtifactValidationEvidenceReviewPacks(1))[0] || null;
  const unresolvedEvidenceGapCount = Number(aggregate?.unresolvedEvidenceGapCount || 0);
  return {
    totalPacks: Number(aggregate?.totalPacks || 0),
    readyForReviewPacks: Number(aggregate?.readyForReviewPacks || 0),
    needsMoreEvidencePacks: Number(aggregate?.needsMoreEvidencePacks || 0),
    criticalReviewRequiredPacks: Number(aggregate?.criticalReviewRequiredPacks || 0),
    closedShadowOnlyPacks: Number(aggregate?.closedShadowOnlyPacks || 0),
    quarantineOrRejectRecommendedPacks: Number(aggregate?.quarantineOrRejectRecommendedPacks || 0),
    lowConfidencePacks: Number(aggregate?.lowConfidencePacks || 0),
    mediumConfidencePacks: Number(aggregate?.mediumConfidencePacks || 0),
    highConfidencePacks: Number(aggregate?.highConfidencePacks || 0),
    unresolvedEvidenceGapCount,
    latestPack,
    recommendedNextAction: unresolvedEvidenceGapCount > 0
      ? "Resolve outstanding metadata evidence gaps before any future shadow-only review."
      : "Evidence review packs are ready for human reading; remain offline, advisory-only, and non-executing.",
    safety: buildOfflineArtifactValidationSafetyGate(),
  };
};
