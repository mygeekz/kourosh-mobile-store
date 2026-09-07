import { buildOfflineArtifactValidationSafetyGate } from "../validation/offlineArtifactValidationRules";
import {
  getLatestOfflineArtifactValidationReviewerAssignmentEvent,
  countOfflineArtifactValidationReviewerEvidenceNotes,
  listOfflineArtifactValidationReviewerAssignmentEventsForQueueItem,
  recordOfflineArtifactValidationReviewerAssignmentEvent,
} from "../../../db/domains/ml/mlOfflineArtifactValidationReviewerAssignmentUx.db";
import {
  getOfflineArtifactValidationReviewQueueItemById,
  listOfflineArtifactValidationReviewQueueItems,
  updateOfflineArtifactValidationReviewQueueDecision,
} from "../../../db/domains/ml/mlOfflineArtifactValidationReviewQueue.db";
import type {
  OfflineArtifactValidationReviewerAssignmentInput,
  OfflineArtifactValidationReviewerAssignmentUxState,
  OfflineArtifactValidationReviewerEvidenceNoteInput,
  OfflineArtifactValidationReviewQueueFilterInput,
} from "./offlineArtifactValidationReviewerAssignmentUxTypes";
import type {
  OfflineArtifactValidationReviewDecision,
  OfflineArtifactValidationReviewQueueRecord,
  OfflineArtifactValidationReviewQueueStatus,
} from "./offlineArtifactValidationReviewQueueTypes";

const PHASE_LABEL = "Phase 7C — Offline Artifact Validation Reviewer Assignment UX" as const;

const VALID_STATUSES = new Set(["open", "assigned", "evidence_requested", "deferred", "closed_shadow_only", "quarantine_recommended", "reject_recommended"]);
const VALID_PRIORITIES = new Set(["low", "medium", "high", "critical"]);

const normalizeLimit = (input: unknown): number => {
  const numeric = Number(input);
  if (!Number.isFinite(numeric) || numeric <= 0) return 25;
  return Math.max(1, Math.min(100, Math.round(numeric)));
};

const normalizeStatus = (input: unknown): OfflineArtifactValidationReviewQueueStatus | "all" => {
  if (typeof input !== "string" || input === "all") return "all";
  return VALID_STATUSES.has(input) ? input as OfflineArtifactValidationReviewQueueStatus : "all";
};

const normalizePriority = (input: unknown): OfflineArtifactValidationReviewerAssignmentUxState["activeFilters"]["priority"] => {
  if (typeof input !== "string" || input === "all") return "all";
  return VALID_PRIORITIES.has(input) ? input as OfflineArtifactValidationReviewerAssignmentUxState["activeFilters"]["priority"] : "all";
};

const normalizeAssignedReviewerFilter = (input: unknown): string | number | "all" | "unassigned" => {
  if (input == null || input === "" || input === "all") return "all";
  if (input === "unassigned") return "unassigned";
  return String(input);
};

const filterQueueItems = (
  items: OfflineArtifactValidationReviewQueueRecord[],
  filters: OfflineArtifactValidationReviewerAssignmentUxState["activeFilters"],
): OfflineArtifactValidationReviewQueueRecord[] => items.filter((item) => {
  const statusMatches = filters.status === "all" || item.queueStatus === filters.status;
  const priorityMatches = filters.priority === "all" || item.reviewPriority === filters.priority;
  const reviewerMatches = filters.assignedReviewerId === "all"
    || (filters.assignedReviewerId === "unassigned" ? item.assignedReviewerId == null : String(item.assignedReviewerId ?? "") === String(filters.assignedReviewerId));
  return statusMatches && priorityMatches && reviewerMatches;
}).slice(0, filters.limit);

const decisionFromAssignment = (assignedReviewerId: string | number | null): OfflineArtifactValidationReviewDecision => {
  return assignedReviewerId == null || String(assignedReviewerId).trim().length === 0 ? "not_reviewed" : "assign_reviewer";
};

const statusFromAssignment = (assignedReviewerId: string | number | null): OfflineArtifactValidationReviewQueueStatus => {
  return assignedReviewerId == null || String(assignedReviewerId).trim().length === 0 ? "open" : "assigned";
};

const appendReviewerEvidence = (
  existing: Record<string, unknown>,
  event: Record<string, unknown>,
): Record<string, unknown> => {
  const assignmentUxEvents = Array.isArray(existing.assignmentUxEvents) ? existing.assignmentUxEvents : [];
  return {
    ...existing,
    assignmentUxEvents: [...assignmentUxEvents, event].slice(-50),
    assignmentUxLastUpdatedAt: new Date().toISOString(),
    assignmentUxPhase: PHASE_LABEL,
    advisoryOnly: true,
    executionAllowed: false,
    activationAllowed: false,
    inferenceAllowed: false,
    businessMutationAllowed: false,
  };
};

export const buildOfflineArtifactValidationReviewerAssignmentUxState = async (
  filtersInput: OfflineArtifactValidationReviewQueueFilterInput = {},
): Promise<OfflineArtifactValidationReviewerAssignmentUxState> => {
  const activeFilters: OfflineArtifactValidationReviewerAssignmentUxState["activeFilters"] = {
    status: normalizeStatus(filtersInput.status),
    priority: normalizePriority(filtersInput.priority),
    assignedReviewerId: normalizeAssignedReviewerFilter(filtersInput.assignedReviewerId),
    limit: normalizeLimit(filtersInput.limit),
  };
  const queueItems = await listOfflineArtifactValidationReviewQueueItems(250);
  const visibleItems = filterQueueItems(queueItems, activeFilters);
  const latestAssignmentEvent = await getLatestOfflineArtifactValidationReviewerAssignmentEvent();
  const evidenceNoteCount = await countOfflineArtifactValidationReviewerEvidenceNotes();
  const assignedVisibleItems = visibleItems.filter((item) => item.assignedReviewerId != null).length;
  const unassignedVisibleItems = visibleItems.length - assignedVisibleItems;
  return {
    phase: PHASE_LABEL,
    filterControls: {
      statuses: ["all", "open", "assigned", "evidence_requested", "deferred", "closed_shadow_only", "quarantine_recommended", "reject_recommended"],
      priorities: ["all", "critical", "high", "medium", "low"],
      reviewerScopes: ["all", "unassigned", "assigned"],
    },
    activeFilters,
    visibleItems,
    totalVisibleItems: visibleItems.length,
    latestQueueItem: visibleItems[0] || queueItems[0] || null,
    latestAssignmentEvent,
    evidenceNoteCount,
    assignedVisibleItems,
    unassignedVisibleItems,
    recommendedNextAction: unassignedVisibleItems > 0
      ? "Assign a human reviewer to the highest-priority unassigned validation queue item."
      : "Review evidence notes and keep decisions advisory-only until a future shadow-only phase is explicitly approved.",
    safety: buildOfflineArtifactValidationSafetyGate(),
  };
};

export const assignOfflineArtifactValidationReviewer = async (
  input: OfflineArtifactValidationReviewerAssignmentInput,
): Promise<OfflineArtifactValidationReviewQueueRecord | null> => {
  const existing = await getOfflineArtifactValidationReviewQueueItemById(input.queueItemId);
  if (!existing) return null;
  const assignedReviewerId = input.assignedReviewerId == null || String(input.assignedReviewerId).trim().length === 0 ? null : input.assignedReviewerId;
  const safety = buildOfflineArtifactValidationSafetyGate();
  const note = input.assignmentNote?.trim() || `${PHASE_LABEL}: reviewer assignment updated; advisoryOnly=true; no activation, inference, execution, or business mutation.`;
  const event = await recordOfflineArtifactValidationReviewerAssignmentEvent({
    queueItemId: existing.id,
    eventType: "assignment_changed",
    assignedReviewerId,
    note,
    evidenceJson: {
      previousReviewerId: existing.assignedReviewerId,
      nextReviewerId: assignedReviewerId,
      queueStatus: statusFromAssignment(assignedReviewerId),
      reviewerDecision: decisionFromAssignment(assignedReviewerId),
      phase: PHASE_LABEL,
      advisoryOnly: true,
    },
    safety,
    createdByUserId: input.assignedByUserId ?? null,
  });
  return updateOfflineArtifactValidationReviewQueueDecision({
    id: existing.id,
    queueStatus: statusFromAssignment(assignedReviewerId),
    assignedReviewerId,
    reviewerDecision: decisionFromAssignment(assignedReviewerId),
    reviewerNotes: [
      ...existing.reviewerNotes,
      note,
      `assignmentEventId=${event?.id ?? "not_recorded"}; phase=${PHASE_LABEL}; executionAllowed=false; activationAllowed=false; inferenceAllowed=false; businessMutationAllowed=false.`,
    ],
    reviewerEvidence: appendReviewerEvidence(existing.reviewerEvidence, {
      eventType: "assignment_changed",
      eventId: event?.id ?? null,
      assignedReviewerId,
      recordedAt: event?.createdAt ?? new Date().toISOString(),
    }),
    reviewedByUserId: input.assignedByUserId ?? null,
    safety,
  });
};

export const recordOfflineArtifactValidationReviewerEvidenceNote = async (
  input: OfflineArtifactValidationReviewerEvidenceNoteInput,
): Promise<OfflineArtifactValidationReviewQueueRecord | null> => {
  const existing = await getOfflineArtifactValidationReviewQueueItemById(input.queueItemId);
  if (!existing) return null;
  const evidenceNote = String(input.evidenceNote || "").trim();
  if (evidenceNote.length === 0) return existing;
  const evidenceType = input.evidenceType || "reviewer_note";
  const safety = buildOfflineArtifactValidationSafetyGate();
  const event = await recordOfflineArtifactValidationReviewerAssignmentEvent({
    queueItemId: existing.id,
    eventType: "evidence_note_added",
    assignedReviewerId: existing.assignedReviewerId,
    note: evidenceNote,
    evidenceType,
    evidenceReference: input.evidenceReference ?? null,
    evidenceJson: {
      evidenceType,
      evidenceReference: input.evidenceReference ?? null,
      phase: PHASE_LABEL,
      advisoryOnly: true,
      noArtifactBytes: true,
      noModelExecution: true,
    },
    safety,
    createdByUserId: input.recordedByUserId ?? null,
  });
  return updateOfflineArtifactValidationReviewQueueDecision({
    id: existing.id,
    queueStatus: existing.queueStatus === "open" ? "evidence_requested" : existing.queueStatus,
    assignedReviewerId: existing.assignedReviewerId,
    reviewerDecision: existing.reviewerDecision,
    reviewerNotes: [
      ...existing.reviewerNotes,
      `${PHASE_LABEL} evidence note recorded: ${evidenceNote}`,
      `evidenceEventId=${event?.id ?? "not_recorded"}; metadataOnly=true; artifactBytesLoadingAllowed=false.`,
    ],
    reviewerEvidence: appendReviewerEvidence(existing.reviewerEvidence, {
      eventType: "evidence_note_added",
      eventId: event?.id ?? null,
      evidenceType,
      evidenceReference: input.evidenceReference ?? null,
      recordedAt: event?.createdAt ?? new Date().toISOString(),
    }),
    reviewedByUserId: input.recordedByUserId ?? null,
    safety,
  });
};

export const listOfflineArtifactValidationReviewerAssignmentEvents = listOfflineArtifactValidationReviewerAssignmentEventsForQueueItem;
export const OFFLINE_ARTIFACT_VALIDATION_REVIEWER_ASSIGNMENT_UX_PHASE = PHASE_LABEL;
