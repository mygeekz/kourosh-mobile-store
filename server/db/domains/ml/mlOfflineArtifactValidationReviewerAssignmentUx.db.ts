import { allAsync, getAsync, runAsync } from "../../query";
import { clampLimit, safeJson } from "./mlDbUtils";
import { buildOfflineArtifactValidationSafetyGate } from "../../../intelligence/artifacts/validation/offlineArtifactValidationRules";
import type { OfflineArtifactValidationSafetyGate } from "../../../intelligence/artifacts/validation/offlineArtifactValidationTypes";
import type {
  OfflineArtifactValidationReviewerAssignmentEventRecord,
  OfflineArtifactValidationReviewerAssignmentEventType,
  OfflineArtifactValidationReviewerEvidenceType,
} from "../../../intelligence/artifacts/validationReviewQueue/offlineArtifactValidationReviewerAssignmentUxTypes";

const parseJson = <T>(value: unknown, fallback: T): T => {
  if (typeof value !== "string" || value.trim().length === 0) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch (_err) {
    return fallback;
  }
};

const mapOfflineArtifactValidationReviewerAssignmentEventRow = (
  row: Record<string, unknown> | undefined,
): OfflineArtifactValidationReviewerAssignmentEventRecord | null => {
  if (!row) return null;
  return {
    id: Number(row.id),
    queueItemId: Number(row.queueItemId || 0),
    eventType: String(row.eventType || "evidence_note_added") as OfflineArtifactValidationReviewerAssignmentEventType,
    assignedReviewerId: row.assignedReviewerId as string | number | null,
    note: row.note == null ? null : String(row.note),
    evidenceType: row.evidenceType == null ? null : String(row.evidenceType) as OfflineArtifactValidationReviewerEvidenceType,
    evidenceReference: row.evidenceReference == null ? null : String(row.evidenceReference),
    evidenceJson: parseJson<Record<string, unknown>>(row.evidenceJson, {}),
    safety: parseJson<OfflineArtifactValidationSafetyGate>(row.safetyGateJson, buildOfflineArtifactValidationSafetyGate()),
    createdAt: String(row.createdAt || ""),
    createdByUserId: row.createdByUserId as string | number | null,
  };
};

const offlineArtifactValidationReviewerAssignmentEventSelect = `
  SELECT id,
         queue_item_id AS queueItemId,
         event_type AS eventType,
         assigned_reviewer_id AS assignedReviewerId,
         note,
         evidence_type AS evidenceType,
         evidence_reference AS evidenceReference,
         evidence_json AS evidenceJson,
         safety_gate_json AS safetyGateJson,
         created_at AS createdAt,
         created_by_user_id AS createdByUserId
  FROM offline_artifact_validation_reviewer_assignment_events
`;

export const recordOfflineArtifactValidationReviewerAssignmentEvent = async (record: {
  queueItemId: string | number;
  eventType: OfflineArtifactValidationReviewerAssignmentEventType;
  assignedReviewerId?: string | number | null;
  note?: string | null;
  evidenceType?: OfflineArtifactValidationReviewerEvidenceType | null;
  evidenceReference?: string | null;
  evidenceJson?: Record<string, unknown>;
  safety?: OfflineArtifactValidationSafetyGate;
  createdByUserId?: string | number | null;
}): Promise<OfflineArtifactValidationReviewerAssignmentEventRecord | null> => {
  const insertResult = await runAsync(
    `
      INSERT INTO offline_artifact_validation_reviewer_assignment_events (
        queue_item_id, event_type, assigned_reviewer_id, note, evidence_type,
        evidence_reference, evidence_json, safety_gate_json, created_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      Number(record.queueItemId),
      record.eventType,
      record.assignedReviewerId == null ? null : String(record.assignedReviewerId),
      record.note ?? null,
      record.evidenceType ?? null,
      record.evidenceReference ?? null,
      safeJson(record.evidenceJson ?? {}),
      safeJson(record.safety ?? buildOfflineArtifactValidationSafetyGate()),
      record.createdByUserId == null ? null : String(record.createdByUserId),
    ],
  );
  return getOfflineArtifactValidationReviewerAssignmentEventById(insertResult.lastID);
};

export const getOfflineArtifactValidationReviewerAssignmentEventById = async (
  idInput: unknown,
): Promise<OfflineArtifactValidationReviewerAssignmentEventRecord | null> => {
  const id = Number(idInput);
  if (!Number.isFinite(id) || id <= 0) return null;
  const row = await getAsync(`${offlineArtifactValidationReviewerAssignmentEventSelect} WHERE id = ?`, [id]);
  return mapOfflineArtifactValidationReviewerAssignmentEventRow(row);
};

export const listOfflineArtifactValidationReviewerAssignmentEventsForQueueItem = async (
  queueItemIdInput: unknown,
  limitInput?: unknown,
): Promise<OfflineArtifactValidationReviewerAssignmentEventRecord[]> => {
  const queueItemId = Number(queueItemIdInput);
  if (!Number.isFinite(queueItemId) || queueItemId <= 0) return [];
  const limit = clampLimit(limitInput, 50, 500);
  const rows = await allAsync(
    `${offlineArtifactValidationReviewerAssignmentEventSelect} WHERE queue_item_id = ? ORDER BY created_at DESC, id DESC LIMIT ?`,
    [queueItemId, limit],
  );
  return rows.map((row) => mapOfflineArtifactValidationReviewerAssignmentEventRow(row)).filter((row): row is OfflineArtifactValidationReviewerAssignmentEventRecord => row !== null);
};

export const getLatestOfflineArtifactValidationReviewerAssignmentEvent = async (): Promise<OfflineArtifactValidationReviewerAssignmentEventRecord | null> => {
  const row = await getAsync(`${offlineArtifactValidationReviewerAssignmentEventSelect} ORDER BY created_at DESC, id DESC LIMIT 1`).catch(() => null);
  return mapOfflineArtifactValidationReviewerAssignmentEventRow(row);
};

export const countOfflineArtifactValidationReviewerEvidenceNotes = async (): Promise<number> => {
  const row = await getAsync(
    `SELECT COUNT(*) AS total FROM offline_artifact_validation_reviewer_assignment_events WHERE event_type = 'evidence_note_added'`,
  ).catch(() => null) as Record<string, unknown> | null;
  return Number(row?.total || 0);
};
