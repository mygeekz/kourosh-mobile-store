import { allAsync, getAsync, runAsync } from "../../query";
import { clampLimit, safeJson } from "./mlDbUtils";
import { buildOfflineArtifactValidationSafetyGate } from "../../../intelligence/artifacts/validation/offlineArtifactValidationRules";
import type { OfflineArtifactValidationSafetyGate } from "../../../intelligence/artifacts/validation/offlineArtifactValidationTypes";
import type {
  OfflineArtifactValidationReviewDecision,
  OfflineArtifactValidationReviewPriority,
  OfflineArtifactValidationReviewQueueRecord,
  OfflineArtifactValidationReviewQueueSnapshot,
  OfflineArtifactValidationReviewQueueStatus,
  OfflineArtifactValidationReviewQueueSummary,
} from "../../../intelligence/artifacts/validationReviewQueue/offlineArtifactValidationReviewQueueTypes";

const parseJson = <T>(value: unknown, fallback: T): T => {
  if (typeof value !== "string" || value.trim().length === 0) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch (_err) {
    return fallback;
  }
};

const mapOfflineArtifactValidationReviewQueueRow = (
  row: Record<string, unknown> | undefined,
): OfflineArtifactValidationReviewQueueRecord | null => {
  if (!row) return null;
  const safety = parseJson<OfflineArtifactValidationSafetyGate>(row.safetyGateJson, buildOfflineArtifactValidationSafetyGate());
  return {
    id: Number(row.id),
    validationResultId: Number(row.validationResultId || 0),
    artifactId: String(row.artifactId || ""),
    artifactHash: row.artifactHash == null ? null : String(row.artifactHash),
    validationStatus: String(row.validationStatus || "insufficient_metadata") as OfflineArtifactValidationReviewQueueRecord["validationStatus"],
    trustScore: Number(row.trustScore || 0),
    trustLabel: String(row.trustLabel || "review_required") as OfflineArtifactValidationReviewQueueRecord["trustLabel"],
    driftRisk: String(row.driftRisk || "high") as OfflineArtifactValidationReviewQueueRecord["driftRisk"],
    reviewPriority: String(row.reviewPriority || "medium") as OfflineArtifactValidationReviewPriority,
    queueStatus: String(row.queueStatus || "open") as OfflineArtifactValidationReviewQueueStatus,
    criticalFindingCount: Number(row.criticalFindingCount || 0),
    highFindingCount: Number(row.highFindingCount || 0),
    missingEvidenceCount: Number(row.missingEvidenceCount || 0),
    assignedReviewerId: row.assignedReviewerId as string | number | null,
    reviewerDecision: String(row.reviewerDecision || "not_reviewed") as OfflineArtifactValidationReviewDecision,
    reviewerNotes: parseJson<string[]>(row.reviewerNotesJson, []),
    reviewerEvidence: parseJson<Record<string, unknown>>(row.reviewerEvidenceJson, {}),
    sourceValidationSnapshot: parseJson<OfflineArtifactValidationReviewQueueSnapshot>(row.sourceValidationSnapshotJson, {
      phase: "Phase 7B — Offline Artifact Validation Review Queue",
      validationResultId: Number(row.validationResultId || 0),
      artifactId: String(row.artifactId || ""),
      artifactHash: row.artifactHash == null ? null : String(row.artifactHash),
      validationStatus: String(row.validationStatus || "insufficient_metadata") as OfflineArtifactValidationReviewQueueSnapshot["validationStatus"],
      trustScore: Number(row.trustScore || 0),
      trustLabel: String(row.trustLabel || "review_required") as OfflineArtifactValidationReviewQueueSnapshot["trustLabel"],
      driftRisk: String(row.driftRisk || "high") as OfflineArtifactValidationReviewQueueSnapshot["driftRisk"],
      criticalFindingCount: Number(row.criticalFindingCount || 0),
      highFindingCount: Number(row.highFindingCount || 0),
      missingEvidenceCount: Number(row.missingEvidenceCount || 0),
      finalReviewerDecision: String(row.finalReviewerDecision || "not_reviewed") as OfflineArtifactValidationReviewQueueSnapshot["finalReviewerDecision"],
      executionAllowed: safety.artifactExecutionAllowed,
      activationAllowed: safety.artifactActivationAllowed,
      inferenceAllowed: safety.inferenceEndpointExposed,
      businessMutationAllowed: safety.canMutateBusinessRecords,
      sourceValidation: {} as OfflineArtifactValidationReviewQueueSnapshot["sourceValidation"],
    }),
    finalReviewerDecision: String(row.finalReviewerDecision || "not_reviewed") as OfflineArtifactValidationReviewQueueRecord["finalReviewerDecision"],
    safety,
    createdAt: String(row.createdAt || ""),
    updatedAt: String(row.updatedAt || ""),
    createdByUserId: row.createdByUserId as string | number | null,
    reviewedByUserId: row.reviewedByUserId as string | number | null,
  };
};

const offlineArtifactValidationReviewQueueSelect = `
  SELECT id,
         validation_result_id AS validationResultId,
         artifact_id AS artifactId,
         artifact_hash AS artifactHash,
         validation_status AS validationStatus,
         trust_score AS trustScore,
         trust_label AS trustLabel,
         drift_risk AS driftRisk,
         review_priority AS reviewPriority,
         queue_status AS queueStatus,
         critical_finding_count AS criticalFindingCount,
         high_finding_count AS highFindingCount,
         missing_evidence_count AS missingEvidenceCount,
         assigned_reviewer_id AS assignedReviewerId,
         reviewer_decision AS reviewerDecision,
         reviewer_notes_json AS reviewerNotesJson,
         reviewer_evidence_json AS reviewerEvidenceJson,
         source_validation_snapshot_json AS sourceValidationSnapshotJson,
         final_reviewer_decision AS finalReviewerDecision,
         safety_gate_json AS safetyGateJson,
         created_at AS createdAt,
         updated_at AS updatedAt,
         created_by_user_id AS createdByUserId,
         reviewed_by_user_id AS reviewedByUserId
  FROM offline_artifact_validation_review_queue_items
`;

export const recordOfflineArtifactValidationReviewQueueItem = async (
  record: Omit<OfflineArtifactValidationReviewQueueRecord, "id" | "createdAt" | "updatedAt">,
): Promise<OfflineArtifactValidationReviewQueueRecord | null> => {
  const insertResult = await runAsync(
    `
      INSERT INTO offline_artifact_validation_review_queue_items (
        validation_result_id, artifact_id, artifact_hash, validation_status, trust_score,
        trust_label, drift_risk, review_priority, queue_status, critical_finding_count,
        high_finding_count, missing_evidence_count, assigned_reviewer_id, reviewer_decision,
        reviewer_notes_json, reviewer_evidence_json, source_validation_snapshot_json,
        final_reviewer_decision, safety_gate_json, created_by_user_id, reviewed_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      record.validationResultId,
      String(record.artifactId),
      record.artifactHash,
      record.validationStatus,
      record.trustScore,
      record.trustLabel,
      record.driftRisk,
      record.reviewPriority,
      record.queueStatus,
      record.criticalFindingCount,
      record.highFindingCount,
      record.missingEvidenceCount,
      record.assignedReviewerId == null ? null : String(record.assignedReviewerId),
      record.reviewerDecision,
      safeJson(record.reviewerNotes),
      safeJson(record.reviewerEvidence),
      safeJson(record.sourceValidationSnapshot),
      record.finalReviewerDecision,
      safeJson(record.safety),
      record.createdByUserId == null ? null : String(record.createdByUserId),
      record.reviewedByUserId == null ? null : String(record.reviewedByUserId),
    ],
  );
  return getOfflineArtifactValidationReviewQueueItemById(insertResult.lastID);
};

export const getOfflineArtifactValidationReviewQueueItemById = async (
  idInput: unknown,
): Promise<OfflineArtifactValidationReviewQueueRecord | null> => {
  const id = Number(idInput);
  if (!Number.isFinite(id) || id <= 0) return null;
  const row = await getAsync(`${offlineArtifactValidationReviewQueueSelect} WHERE id = ?`, [id]);
  return mapOfflineArtifactValidationReviewQueueRow(row);
};

export const listOfflineArtifactValidationReviewQueueItems = async (
  limitInput?: unknown,
): Promise<OfflineArtifactValidationReviewQueueRecord[]> => {
  const limit = clampLimit(limitInput, 50, 500);
  const rows = await allAsync(`${offlineArtifactValidationReviewQueueSelect} ORDER BY created_at DESC, id DESC LIMIT ?`, [limit]);
  return rows.map((row) => mapOfflineArtifactValidationReviewQueueRow(row)).filter((row): row is OfflineArtifactValidationReviewQueueRecord => row !== null);
};

export const updateOfflineArtifactValidationReviewQueueDecision = async (payload: {
  id: number;
  queueStatus: OfflineArtifactValidationReviewQueueStatus;
  assignedReviewerId?: string | number | null;
  reviewerDecision: OfflineArtifactValidationReviewDecision;
  reviewerNotes: string[];
  reviewerEvidence: Record<string, unknown>;
  reviewedByUserId?: string | number | null;
  safety: OfflineArtifactValidationSafetyGate;
}): Promise<OfflineArtifactValidationReviewQueueRecord | null> => {
  await runAsync(
    `
      UPDATE offline_artifact_validation_review_queue_items
      SET queue_status = ?,
          assigned_reviewer_id = ?,
          reviewer_decision = ?,
          reviewer_notes_json = ?,
          reviewer_evidence_json = ?,
          reviewed_by_user_id = ?,
          safety_gate_json = ?,
          updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')
      WHERE id = ?
    `,
    [
      payload.queueStatus,
      payload.assignedReviewerId == null ? null : String(payload.assignedReviewerId),
      payload.reviewerDecision,
      safeJson(payload.reviewerNotes),
      safeJson(payload.reviewerEvidence),
      payload.reviewedByUserId == null ? null : String(payload.reviewedByUserId),
      safeJson(payload.safety),
      payload.id,
    ],
  );
  return getOfflineArtifactValidationReviewQueueItemById(payload.id);
};

export const getOfflineArtifactValidationReviewQueueSummary = async (): Promise<OfflineArtifactValidationReviewQueueSummary> => {
  const aggregate = await getAsync(`
    SELECT COUNT(*) AS totalQueueItems,
           SUM(CASE WHEN queue_status = 'open' THEN 1 ELSE 0 END) AS openItems,
           SUM(CASE WHEN queue_status = 'assigned' THEN 1 ELSE 0 END) AS assignedItems,
           SUM(CASE WHEN queue_status = 'evidence_requested' THEN 1 ELSE 0 END) AS evidenceRequestedItems,
           SUM(CASE WHEN queue_status = 'deferred' THEN 1 ELSE 0 END) AS deferredItems,
           SUM(CASE WHEN queue_status = 'closed_shadow_only' THEN 1 ELSE 0 END) AS closedShadowOnlyItems,
           SUM(CASE WHEN queue_status = 'quarantine_recommended' THEN 1 ELSE 0 END) AS quarantineRecommendedItems,
           SUM(CASE WHEN queue_status = 'reject_recommended' THEN 1 ELSE 0 END) AS rejectRecommendedItems,
           SUM(CASE WHEN review_priority = 'critical' THEN 1 ELSE 0 END) AS criticalPriorityItems,
           SUM(CASE WHEN review_priority = 'high' THEN 1 ELSE 0 END) AS highPriorityItems,
           SUM(CASE WHEN review_priority = 'medium' THEN 1 ELSE 0 END) AS mediumPriorityItems,
           SUM(CASE WHEN review_priority = 'low' THEN 1 ELSE 0 END) AS lowPriorityItems
    FROM offline_artifact_validation_review_queue_items
  `).catch(() => null) as Record<string, unknown> | null;
  const latestQueueItem = (await listOfflineArtifactValidationReviewQueueItems(1))[0] || null;
  const openItems = Number(aggregate?.openItems || 0);
  const assignedItems = Number(aggregate?.assignedItems || 0);
  const evidenceRequestedItems = Number(aggregate?.evidenceRequestedItems || 0);
  const deferredItems = Number(aggregate?.deferredItems || 0);
  return {
    totalQueueItems: Number(aggregate?.totalQueueItems || 0),
    openItems,
    assignedItems,
    evidenceRequestedItems,
    deferredItems,
    closedShadowOnlyItems: Number(aggregate?.closedShadowOnlyItems || 0),
    quarantineRecommendedItems: Number(aggregate?.quarantineRecommendedItems || 0),
    rejectRecommendedItems: Number(aggregate?.rejectRecommendedItems || 0),
    criticalPriorityItems: Number(aggregate?.criticalPriorityItems || 0),
    highPriorityItems: Number(aggregate?.highPriorityItems || 0),
    mediumPriorityItems: Number(aggregate?.mediumPriorityItems || 0),
    lowPriorityItems: Number(aggregate?.lowPriorityItems || 0),
    pendingHumanReviewItems: openItems + assignedItems + evidenceRequestedItems + deferredItems,
    latestQueueItem,
    safety: buildOfflineArtifactValidationSafetyGate(),
  };
};
