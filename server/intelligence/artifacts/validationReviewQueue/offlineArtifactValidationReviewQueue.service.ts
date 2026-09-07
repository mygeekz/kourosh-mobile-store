import { computeArtifactEnvelopeSha256 } from "../artifactHashing";
import { countFindings } from "../validation/offlineArtifactValidationFindings";
import { buildOfflineArtifactValidationSafetyGate } from "../validation/offlineArtifactValidationRules";
import {
  getOfflineArtifactValidationResultById,
  getOfflineArtifactValidationSummary,
} from "../../../db/domains/ml/mlOfflineArtifactValidation.db";
import {
  getOfflineArtifactValidationReviewQueueItemById,
  getOfflineArtifactValidationReviewQueueSummary,
  listOfflineArtifactValidationReviewQueueItems,
  recordOfflineArtifactValidationReviewQueueItem,
  updateOfflineArtifactValidationReviewQueueDecision,
} from "../../../db/domains/ml/mlOfflineArtifactValidationReviewQueue.db";
import type { OfflineArtifactValidationRecord } from "../validation/offlineArtifactValidationTypes";
import type {
  OfflineArtifactValidationReviewDecision,
  OfflineArtifactValidationReviewDecisionInput,
  OfflineArtifactValidationReviewPriority,
  OfflineArtifactValidationReviewQueueRecord,
  OfflineArtifactValidationReviewQueueSnapshot,
  OfflineArtifactValidationReviewQueueStatus,
} from "./offlineArtifactValidationReviewQueueTypes";

const PHASE_LABEL = "Phase 7B — Offline Artifact Validation Review Queue" as const;

const isNonEmptyString = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;

const countMissingEvidence = (validation: OfflineArtifactValidationRecord): number => {
  const metadataMissing = validation.compatibility?.metadataCompleteness?.missing?.length || 0;
  const featureMissing = validation.compatibility?.featureContract?.missing?.length || 0;
  const outputMissing = validation.compatibility?.outputContract?.missing?.length || 0;
  return metadataMissing + featureMissing + outputMissing;
};

const reviewPriorityFromValidation = (
  validation: OfflineArtifactValidationRecord,
): OfflineArtifactValidationReviewPriority => {
  const criticalFindings = countFindings(validation.findings, "critical");
  const highFindings = countFindings(validation.findings, "high");
  const missingEvidence = countMissingEvidence(validation);
  if (criticalFindings > 0 || validation.driftRisk === "critical" || validation.trustLabel === "reject_recommended") return "critical";
  if (highFindings > 0 || validation.driftRisk === "high" || validation.trustLabel === "quarantine_recommended") return "high";
  if (missingEvidence > 0 || validation.validationStatus !== "pass" || validation.trustLabel === "review_required") return "medium";
  return "low";
};

const queueStatusFromDecision = (
  decision: OfflineArtifactValidationReviewDecision,
): OfflineArtifactValidationReviewQueueStatus => {
  switch (decision) {
    case "assign_reviewer":
      return "assigned";
    case "request_more_evidence":
      return "evidence_requested";
    case "close_for_future_shadow_only":
      return "closed_shadow_only";
    case "recommend_quarantine":
      return "quarantine_recommended";
    case "recommend_reject":
      return "reject_recommended";
    case "defer":
      return "deferred";
    case "not_reviewed":
    default:
      return "open";
  }
};

const normalizeNotes = (notes: string[] | string | null | undefined): string[] => {
  if (Array.isArray(notes)) return notes.map((note) => String(note).trim()).filter(isNonEmptyString);
  if (typeof notes === "string") return notes.split("\n").map((note) => note.trim()).filter(isNonEmptyString);
  return [];
};

export const buildOfflineArtifactValidationReviewQueueSnapshot = (
  validation: OfflineArtifactValidationRecord,
): OfflineArtifactValidationReviewQueueSnapshot => {
  const criticalFindingCount = countFindings(validation.findings, "critical");
  const highFindingCount = countFindings(validation.findings, "high");
  const missingEvidenceCount = countMissingEvidence(validation);
  const safety = buildOfflineArtifactValidationSafetyGate();
  return {
    phase: PHASE_LABEL,
    validationResultId: validation.id,
    artifactId: validation.artifactId,
    artifactHash: validation.artifactHash,
    validationStatus: validation.validationStatus,
    trustScore: validation.trustScore,
    trustLabel: validation.trustLabel,
    driftRisk: validation.driftRisk,
    criticalFindingCount,
    highFindingCount,
    missingEvidenceCount,
    finalReviewerDecision: validation.finalReviewSnapshot.finalReviewerDecision,
    executionAllowed: safety.artifactExecutionAllowed,
    activationAllowed: safety.artifactActivationAllowed,
    inferenceAllowed: safety.inferenceEndpointExposed,
    businessMutationAllowed: safety.canMutateBusinessRecords,
    sourceValidation: validation,
  };
};

export const createOfflineArtifactValidationReviewQueueItemFromResult = async (payload: {
  validationResultId: string | number;
  createdByUserId?: string | number | null;
}): Promise<OfflineArtifactValidationReviewQueueRecord | null> => {
  const validation = await getOfflineArtifactValidationResultById(payload.validationResultId);
  if (!validation) return null;
  const snapshot = buildOfflineArtifactValidationReviewQueueSnapshot(validation);
  const signedQueueHash = computeArtifactEnvelopeSha256({
    phase: PHASE_LABEL,
    validationResultId: validation.id,
    artifactId: validation.artifactId,
    artifactHash: validation.artifactHash,
    reviewPriority: reviewPriorityFromValidation(validation),
    queueStatus: "open",
    trustScore: validation.trustScore,
    trustLabel: validation.trustLabel,
    driftRisk: validation.driftRisk,
    criticalFindingCount: snapshot.criticalFindingCount,
    highFindingCount: snapshot.highFindingCount,
    missingEvidenceCount: snapshot.missingEvidenceCount,
    safety: buildOfflineArtifactValidationSafetyGate(),
  });
  return recordOfflineArtifactValidationReviewQueueItem({
    validationResultId: validation.id,
    artifactId: validation.artifactId,
    artifactHash: validation.artifactHash,
    validationStatus: validation.validationStatus,
    trustScore: validation.trustScore,
    trustLabel: validation.trustLabel,
    driftRisk: validation.driftRisk,
    reviewPriority: reviewPriorityFromValidation(validation),
    queueStatus: "open",
    criticalFindingCount: snapshot.criticalFindingCount,
    highFindingCount: snapshot.highFindingCount,
    missingEvidenceCount: snapshot.missingEvidenceCount,
    assignedReviewerId: null,
    reviewerDecision: "not_reviewed",
    reviewerNotes: [
      `${PHASE_LABEL} item created from Phase 7A validation result ${validation.id}.`,
      "Human review is advisory and cannot activate artifacts, execute models, expose inference, or mutate business records.",
      `signedQueueHash=${signedQueueHash}`,
    ],
    reviewerEvidence: {},
    sourceValidationSnapshot: snapshot,
    finalReviewerDecision: validation.finalReviewSnapshot.finalReviewerDecision,
    safety: buildOfflineArtifactValidationSafetyGate(),
    createdByUserId: payload.createdByUserId ?? null,
    reviewedByUserId: null,
  });
};

export const applyOfflineArtifactValidationReviewDecision = async (
  input: OfflineArtifactValidationReviewDecisionInput,
): Promise<OfflineArtifactValidationReviewQueueRecord | null> => {
  const existing = await getOfflineArtifactValidationReviewQueueItemById(input.queueItemId);
  if (!existing) return null;
  const reviewerDecision = input.reviewerDecision || "not_reviewed";
  const queueStatus = queueStatusFromDecision(reviewerDecision);
  const safety = buildOfflineArtifactValidationSafetyGate();
  const notes = normalizeNotes(input.reviewerNotes);
  const reviewerNotes = [
    ...existing.reviewerNotes,
    ...notes,
    `${PHASE_LABEL} decision=${reviewerDecision}; queueStatus=${queueStatus}; advisoryOnly=true; executionAllowed=false; activationAllowed=false; inferenceAllowed=false; businessMutationAllowed=false.`,
  ];
  return updateOfflineArtifactValidationReviewQueueDecision({
    id: existing.id,
    queueStatus,
    assignedReviewerId: input.assignedReviewerId ?? existing.assignedReviewerId,
    reviewerDecision,
    reviewerNotes,
    reviewerEvidence: input.reviewerEvidence ?? existing.reviewerEvidence,
    reviewedByUserId: input.reviewedByUserId ?? null,
    safety,
  });
};

export const listOfflineArtifactValidationReviewQueue = listOfflineArtifactValidationReviewQueueItems;
export const getOfflineArtifactValidationReviewQueueItem = getOfflineArtifactValidationReviewQueueItemById;
export const buildOfflineArtifactValidationReviewQueueSummary = getOfflineArtifactValidationReviewQueueSummary;

export const bootstrapOfflineArtifactValidationReviewQueueFromLatestValidation = async (payload: {
  createdByUserId?: string | number | null;
} = {}): Promise<OfflineArtifactValidationReviewQueueRecord | null> => {
  const summary = await getOfflineArtifactValidationSummary();
  const latestValidation = summary.latestValidation;
  if (!latestValidation) return null;
  return createOfflineArtifactValidationReviewQueueItemFromResult({
    validationResultId: latestValidation.id,
    createdByUserId: payload.createdByUserId ?? null,
  });
};

export const OFFLINE_ARTIFACT_VALIDATION_REVIEW_QUEUE_PHASE = PHASE_LABEL;
