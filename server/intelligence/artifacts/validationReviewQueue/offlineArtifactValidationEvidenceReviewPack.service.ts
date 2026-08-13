import { computeArtifactEnvelopeSha256 } from "../artifactHashing";
import { buildOfflineArtifactValidationSafetyGate } from "../validation/offlineArtifactValidationRules";
import {
  getOfflineArtifactValidationReviewQueueItemById,
  listOfflineArtifactValidationReviewQueueItems,
} from "../../../db/domains/ml/mlOfflineArtifactValidationReviewQueue.db";
import {
  listOfflineArtifactValidationReviewerAssignmentEventsForQueueItem,
} from "../../../db/domains/ml/mlOfflineArtifactValidationReviewerAssignmentUx.db";
import {
  getLatestOfflineArtifactValidationEvidenceReviewPackForQueueItem,
  getOfflineArtifactValidationEvidenceReviewPackById,
  getOfflineArtifactValidationEvidenceReviewPackSummary,
  listOfflineArtifactValidationEvidenceReviewPacks,
  recordOfflineArtifactValidationEvidenceReviewPack,
} from "../../../db/domains/ml/mlOfflineArtifactValidationEvidenceReviewPack.db";
import type {
  OfflineArtifactValidationEvidenceConfidence,
  OfflineArtifactValidationEvidenceReviewPackCreateInput,
  OfflineArtifactValidationEvidenceReviewPackRecord,
  OfflineArtifactValidationEvidenceReviewPackSnapshot,
  OfflineArtifactValidationEvidenceReviewPackStatus,
} from "./offlineArtifactValidationEvidenceReviewPackTypes";
import type { OfflineArtifactValidationReviewQueueRecord } from "./offlineArtifactValidationReviewQueueTypes";
import type { OfflineArtifactValidationReviewerAssignmentEventRecord } from "./offlineArtifactValidationReviewerAssignmentUxTypes";

const PHASE_LABEL = "Phase 7D — Offline Artifact Validation Evidence Note Review Pack" as const;

const EVENT_LIMIT = 100;

const uniqueStrings = (items: Array<string | null | undefined>): string[] => {
  return [...new Set(items.map((item) => String(item || "").trim()).filter((item) => item.length > 0))];
};

const isEvidenceNote = (event: OfflineArtifactValidationReviewerAssignmentEventRecord): boolean => event.eventType === "evidence_note_added";

const inferEvidenceReferences = (events: OfflineArtifactValidationReviewerAssignmentEventRecord[]): string[] => uniqueStrings(
  events.map((event) => event.evidenceReference || String(event.evidenceJson?.evidenceReference || "")),
);

const deriveUnresolvedEvidenceGaps = (
  queueItem: OfflineArtifactValidationReviewQueueRecord,
  evidenceNotes: OfflineArtifactValidationReviewerAssignmentEventRecord[],
): string[] => {
  const gaps: string[] = [];
  if (queueItem.missingEvidenceCount > 0 && evidenceNotes.length === 0) {
    gaps.push("Missing validation evidence remains unresolved because no reviewer evidence note is attached.");
  }
  if (queueItem.assignedReviewerId == null) {
    gaps.push("No human reviewer is assigned to this validation queue item.");
  }
  if (["critical", "high"].includes(queueItem.reviewPriority) && queueItem.reviewerDecision === "not_reviewed") {
    gaps.push("High-priority validation queue item has no reviewer decision yet.");
  }
  if (queueItem.criticalFindingCount > 0 && queueItem.queueStatus !== "quarantine_recommended" && queueItem.queueStatus !== "reject_recommended") {
    gaps.push("Critical validation findings have not been routed to quarantine or reject recommendation.");
  }
  if (queueItem.queueStatus === "evidence_requested" && evidenceNotes.length === 0) {
    gaps.push("Evidence was requested but no evidence note has been recorded.");
  }
  return uniqueStrings(gaps);
};

const confidenceFromEvidence = (
  queueItem: OfflineArtifactValidationReviewQueueRecord,
  evidenceNotes: OfflineArtifactValidationReviewerAssignmentEventRecord[],
  unresolvedEvidenceGaps: string[],
): OfflineArtifactValidationEvidenceConfidence => {
  if (unresolvedEvidenceGaps.length > 0 || queueItem.missingEvidenceCount > evidenceNotes.length) return "low";
  if (evidenceNotes.length >= 2 && queueItem.assignedReviewerId != null && queueItem.reviewerDecision !== "not_reviewed") return "high";
  return "medium";
};

const statusFromPack = (
  queueItem: OfflineArtifactValidationReviewQueueRecord,
  evidenceConfidence: OfflineArtifactValidationEvidenceConfidence,
  unresolvedEvidenceGaps: string[],
): OfflineArtifactValidationEvidenceReviewPackStatus => {
  if (queueItem.queueStatus === "closed_shadow_only") return "closed_shadow_only";
  if (queueItem.queueStatus === "quarantine_recommended" || queueItem.queueStatus === "reject_recommended") return "quarantine_or_reject_recommended";
  if (queueItem.criticalFindingCount > 0 || queueItem.reviewPriority === "critical") return "critical_review_required";
  if (evidenceConfidence === "low" || unresolvedEvidenceGaps.length > 0) return "needs_more_evidence";
  return "ready_for_review";
};

const recommendedActionFromPack = (
  queueItem: OfflineArtifactValidationReviewQueueRecord,
  packStatus: OfflineArtifactValidationEvidenceReviewPackStatus,
  unresolvedEvidenceGaps: string[],
): string => {
  if (unresolvedEvidenceGaps.length > 0) return `Resolve evidence gap: ${unresolvedEvidenceGaps[0]}`;
  if (packStatus === "critical_review_required") return "Escalate to a human reviewer for quarantine/reject recommendation review; do not activate the artifact.";
  if (packStatus === "needs_more_evidence") return "Record at least one metadata-only evidence note before any future shadow-only review.";
  if (packStatus === "closed_shadow_only") return "Keep the queue item closed for future shadow-only consideration; no activation is permitted.";
  if (packStatus === "quarantine_or_reject_recommended") return "Preserve the recommendation as audit evidence; no automatic deletion, activation, or runtime action is allowed.";
  if (queueItem.reviewerDecision === "not_reviewed") return "Complete human reviewer decision as advisory metadata before any future shadow-only phase.";
  return "Review pack is ready for human governance reading; remain advisory-only and non-executing.";
};

export const buildOfflineArtifactValidationEvidenceReviewPackSnapshot = (
  queueItem: OfflineArtifactValidationReviewQueueRecord,
  assignmentEvents: OfflineArtifactValidationReviewerAssignmentEventRecord[],
): OfflineArtifactValidationEvidenceReviewPackSnapshot => {
  const evidenceNotes = assignmentEvents.filter(isEvidenceNote);
  const unresolvedEvidenceGaps = deriveUnresolvedEvidenceGaps(queueItem, evidenceNotes);
  return {
    phase: PHASE_LABEL,
    queueItem,
    assignmentEvents,
    evidenceNotes,
    reviewerNotes: queueItem.reviewerNotes,
    evidenceReferences: inferEvidenceReferences(assignmentEvents),
    unresolvedEvidenceGaps,
    advisoryOnly: true,
    executionAllowed: false,
    activationAllowed: false,
    inferenceAllowed: false,
    businessMutationAllowed: false,
    artifactBytesIncluded: false,
    modelOutputIncluded: false,
  };
};

export const createOfflineArtifactValidationEvidenceReviewPack = async (
  input: OfflineArtifactValidationEvidenceReviewPackCreateInput,
): Promise<OfflineArtifactValidationEvidenceReviewPackRecord | null> => {
  const queueItem = await getOfflineArtifactValidationReviewQueueItemById(input.queueItemId);
  if (!queueItem) return null;
  const assignmentEvents = await listOfflineArtifactValidationReviewerAssignmentEventsForQueueItem(queueItem.id, EVENT_LIMIT);
  const evidenceNotes = assignmentEvents.filter(isEvidenceNote);
  const snapshot = buildOfflineArtifactValidationEvidenceReviewPackSnapshot(queueItem, assignmentEvents);
  const evidenceConfidence = confidenceFromEvidence(queueItem, evidenceNotes, snapshot.unresolvedEvidenceGaps);
  const packStatus = statusFromPack(queueItem, evidenceConfidence, snapshot.unresolvedEvidenceGaps);
  const safety = buildOfflineArtifactValidationSafetyGate();
  const signedEvidenceReviewPackHash = computeArtifactEnvelopeSha256({
    phase: PHASE_LABEL,
    queueItemId: queueItem.id,
    validationResultId: queueItem.validationResultId,
    artifactId: queueItem.artifactId,
    artifactHash: queueItem.artifactHash,
    packStatus,
    evidenceConfidence,
    evidenceNoteCount: evidenceNotes.length,
    assignmentEventCount: assignmentEvents.length,
    reviewerNoteCount: queueItem.reviewerNotes.length,
    unresolvedEvidenceGaps: snapshot.unresolvedEvidenceGaps,
    reviewerDecision: queueItem.reviewerDecision,
    queueStatus: queueItem.queueStatus,
    safety,
    advisoryOnly: true,
    artifactBytesIncluded: false,
    modelOutputIncluded: false,
  });
  return recordOfflineArtifactValidationEvidenceReviewPack({
    queueItemId: queueItem.id,
    validationResultId: queueItem.validationResultId,
    artifactId: queueItem.artifactId,
    artifactHash: queueItem.artifactHash,
    packStatus,
    evidenceConfidence,
    evidenceNoteCount: evidenceNotes.length,
    assignmentEventCount: assignmentEvents.length,
    reviewerNoteCount: queueItem.reviewerNotes.length,
    unresolvedEvidenceGapCount: snapshot.unresolvedEvidenceGaps.length,
    recommendedReviewerAction: recommendedActionFromPack(queueItem, packStatus, snapshot.unresolvedEvidenceGaps),
    packSnapshot: snapshot,
    signedEvidenceReviewPackHash,
    safety,
    createdByUserId: input.createdByUserId ?? null,
  });
};

export const bootstrapOfflineArtifactValidationEvidenceReviewPackFromLatestQueueItem = async (payload: {
  createdByUserId?: string | number | null;
} = {}): Promise<OfflineArtifactValidationEvidenceReviewPackRecord | null> => {
  const [latestQueueItem] = await listOfflineArtifactValidationReviewQueueItems(1);
  if (!latestQueueItem) return null;
  return createOfflineArtifactValidationEvidenceReviewPack({
    queueItemId: latestQueueItem.id,
    createdByUserId: payload.createdByUserId ?? null,
  });
};

export const getOfflineArtifactValidationEvidenceReviewPack = getOfflineArtifactValidationEvidenceReviewPackById;
export const listOfflineArtifactValidationEvidenceReviewPackRecords = listOfflineArtifactValidationEvidenceReviewPacks;
export const getLatestOfflineArtifactValidationEvidenceReviewPack = getLatestOfflineArtifactValidationEvidenceReviewPackForQueueItem;
export const buildOfflineArtifactValidationEvidenceReviewPackSummary = getOfflineArtifactValidationEvidenceReviewPackSummary;
export const OFFLINE_ARTIFACT_VALIDATION_EVIDENCE_REVIEW_PACK_PHASE = PHASE_LABEL;
