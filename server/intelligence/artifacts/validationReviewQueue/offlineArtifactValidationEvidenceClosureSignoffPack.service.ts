import { computeArtifactEnvelopeSha256 } from "../artifactHashing";
import { buildOfflineArtifactValidationSafetyGate } from "../validation/offlineArtifactValidationRules";
import {
  getLatestOfflineArtifactValidationEvidenceGapClosureMatrixForEvidenceReviewPack,
  getOfflineArtifactValidationEvidenceGapClosureMatrixById,
  listOfflineArtifactValidationEvidenceGapClosureMatrices,
} from "../../../db/domains/ml/mlOfflineArtifactValidationEvidenceGapClosureMatrix.db";
import {
  getLatestOfflineArtifactValidationEvidenceClosureSignoffPackForEvidenceGapClosureMatrix,
  getOfflineArtifactValidationEvidenceClosureSignoffPackById,
  getOfflineArtifactValidationEvidenceClosureSignoffPackSummary,
  listOfflineArtifactValidationEvidenceClosureSignoffPacks,
  recordOfflineArtifactValidationEvidenceClosureSignoffPack,
} from "../../../db/domains/ml/mlOfflineArtifactValidationEvidenceClosureSignoffPack.db";
import type { OfflineArtifactValidationEvidenceGapClosureMatrixRecord } from "./offlineArtifactValidationEvidenceGapClosureMatrixTypes";
import type { OfflineArtifactValidationReviewPriority } from "./offlineArtifactValidationReviewQueueTypes";
import type {
  OfflineArtifactValidationEvidenceClosureSignoffChecklistItem,
  OfflineArtifactValidationEvidenceClosureSignoffDecision,
  OfflineArtifactValidationEvidenceClosureSignoffPackCreateInput,
  OfflineArtifactValidationEvidenceClosureSignoffPackRecord,
  OfflineArtifactValidationEvidenceClosureSignoffPackSnapshot,
  OfflineArtifactValidationEvidenceClosureSignoffPackStatus,
} from "./offlineArtifactValidationEvidenceClosureSignoffPackTypes";

const PHASE_LABEL = "Phase 7F — Offline Artifact Evidence Closure Reviewer Signoff Pack" as const;

const safeDecision = (decision: unknown): OfflineArtifactValidationEvidenceClosureSignoffDecision => {
  const value = String(decision || "not_signed");
  if ([
    "not_signed",
    "accepted_for_future_shadow_only",
    "needs_more_evidence",
    "quarantine_recommended",
    "reject_recommended",
  ].includes(value)) return value as OfflineArtifactValidationEvidenceClosureSignoffDecision;
  return "not_signed";
};

const item = (
  key: string,
  label: string,
  status: OfflineArtifactValidationEvidenceClosureSignoffChecklistItem["status"],
  priority: OfflineArtifactValidationReviewPriority,
  evidence: Record<string, unknown>,
  requiredReviewerAction: string,
): OfflineArtifactValidationEvidenceClosureSignoffChecklistItem => ({
  key,
  label,
  status,
  priority,
  evidence,
  requiredReviewerAction,
  advisoryOnly: true,
  executionAllowed: false,
  activationAllowed: false,
  inferenceAllowed: false,
  businessMutationAllowed: false,
});

export const buildOfflineArtifactValidationEvidenceClosureSignoffChecklist = (
  matrix: OfflineArtifactValidationEvidenceGapClosureMatrixRecord,
): OfflineArtifactValidationEvidenceClosureSignoffChecklistItem[] => {
  const matrixRows = matrix.matrixSnapshot.matrixRows || [];
  return [
    item(
      "matrix_closure_ready",
      "Evidence gap closure matrix is closed or has no gaps",
      matrix.matrixStatus === "closure_ready" || matrix.matrixStatus === "no_gaps_detected" ? "pass" : matrix.matrixStatus === "partial_closure" ? "warning" : "fail",
      matrix.criticalOpenGapCount > 0 ? "critical" : matrix.highOpenGapCount > 0 ? "high" : "medium",
      { matrixStatus: matrix.matrixStatus, closureReadinessPct: matrix.closureReadinessPct },
      "Do not sign until open evidence gaps are closed or explicitly escalated by a human reviewer.",
    ),
    item(
      "critical_open_gap_absent",
      "No critical evidence gap remains open",
      matrix.criticalOpenGapCount === 0 ? "pass" : "fail",
      "critical",
      { criticalOpenGapCount: matrix.criticalOpenGapCount, openGapKeys: matrix.matrixSnapshot.openGapKeys },
      "Resolve critical evidence gaps before future shadow-only signoff metadata is accepted.",
    ),
    item(
      "high_open_gap_absent",
      "No high-priority evidence gap remains open",
      matrix.highOpenGapCount === 0 ? "pass" : "warning",
      "high",
      { highOpenGapCount: matrix.highOpenGapCount },
      "Close or document high-priority evidence gaps before reviewer signoff.",
    ),
    item(
      "evidence_confidence_acceptable",
      "Evidence confidence is acceptable for human signoff review",
      matrix.evidenceConfidence === "high" ? "pass" : matrix.evidenceConfidence === "medium" ? "warning" : "fail",
      matrix.evidenceConfidence === "low" ? "high" : "medium",
      { evidenceConfidence: matrix.evidenceConfidence },
      "Add metadata-only evidence notes until reviewer confidence is at least medium.",
    ),
    item(
      "matrix_snapshot_traceable",
      "Matrix snapshot includes traceable rows or explicit no-gap state",
      matrixRows.length > 0 || matrix.matrixStatus === "no_gaps_detected" ? "pass" : "warning",
      "medium",
      { matrixRowCount: matrixRows.length, totalGapCount: matrix.totalGapCount },
      "Keep a readable matrix snapshot for reviewer traceability; do not include artifact bytes.",
    ),
    item(
      "safety_gate_disabled",
      "Execution, activation, inference, and business mutation are disabled",
      matrix.safety.modelExecutionAllowed === false
        && matrix.safety.artifactExecutionAllowed === false
        && matrix.safety.artifactActivationAllowed === false
        && matrix.safety.inferenceEndpointExposed === false
        && matrix.safety.canMutateBusinessRecords === false
        ? "pass"
        : "fail",
      "critical",
      matrix.safety as unknown as Record<string, unknown>,
      "Block signoff if any safety gate is enabled; reviewer signoff is metadata-only.",
    ),
  ];
};

const signoffReadinessPct = (checklist: OfflineArtifactValidationEvidenceClosureSignoffChecklistItem[]): number => {
  if (checklist.length === 0) return 0;
  const score = checklist.reduce((sum, row) => {
    if (row.status === "pass") return sum + 1;
    if (row.status === "warning") return sum + 0.5;
    return sum;
  }, 0);
  return Math.max(0, Math.min(100, Math.round((score / checklist.length) * 100)));
};

const statusFromChecklist = (
  checklist: OfflineArtifactValidationEvidenceClosureSignoffChecklistItem[],
  reviewerDecision: OfflineArtifactValidationEvidenceClosureSignoffDecision,
): OfflineArtifactValidationEvidenceClosureSignoffPackStatus => {
  if (reviewerDecision === "reject_recommended") return "rejected_for_artifact_trust";
  if (reviewerDecision === "quarantine_recommended") return "blocked_by_open_gap";
  if (reviewerDecision === "needs_more_evidence") return "needs_more_evidence";
  const hasCriticalFail = checklist.some((row) => row.status === "fail" && row.priority === "critical");
  const hasFail = checklist.some((row) => row.status === "fail");
  if (hasCriticalFail) return "blocked_by_open_gap";
  if (hasFail) return "needs_more_evidence";
  if (reviewerDecision === "accepted_for_future_shadow_only") return "signed_for_future_shadow_only";
  return "ready_for_human_signoff";
};

const recommendedActionFromSignoffPack = (
  status: OfflineArtifactValidationEvidenceClosureSignoffPackStatus,
  checklist: OfflineArtifactValidationEvidenceClosureSignoffChecklistItem[],
): string => {
  const firstFail = checklist.find((row) => row.status === "fail");
  if (firstFail) return firstFail.requiredReviewerAction;
  if (status === "signed_for_future_shadow_only") return "Preserve reviewer signoff as future-shadow-only metadata; do not activate, infer, execute, or mutate records.";
  if (status === "ready_for_human_signoff") return "A human reviewer may sign for future shadow-only consideration; automatic approval remains disabled.";
  if (status === "blocked_by_open_gap") return "Resolve blocked evidence gaps before human signoff; artifact activation remains disabled.";
  if (status === "rejected_for_artifact_trust") return "Keep artifact rejected or quarantined for trust reasons; do not promote to runtime.";
  return "Collect metadata-only evidence to close signoff checklist failures.";
};

export const buildOfflineArtifactValidationEvidenceClosureSignoffPackSnapshot = (
  matrix: OfflineArtifactValidationEvidenceGapClosureMatrixRecord,
  checklist: OfflineArtifactValidationEvidenceClosureSignoffChecklistItem[],
  reviewerDecision: OfflineArtifactValidationEvidenceClosureSignoffDecision,
  reviewerDecisionReason: string,
): OfflineArtifactValidationEvidenceClosureSignoffPackSnapshot => ({
  phase: PHASE_LABEL,
  matrix,
  checklist,
  reviewerDecision,
  reviewerDecisionReason,
  signoffScope: reviewerDecision === "accepted_for_future_shadow_only" ? "future_shadow_only" : "not_applicable",
  evidenceConfidence: matrix.evidenceConfidence,
  closureReadinessPct: matrix.closureReadinessPct,
  openGapCount: matrix.openGapCount,
  criticalOpenGapCount: matrix.criticalOpenGapCount,
  highOpenGapCount: matrix.highOpenGapCount,
  advisoryOnly: true,
  executionAllowed: false,
  activationAllowed: false,
  inferenceAllowed: false,
  businessMutationAllowed: false,
  artifactBytesIncluded: false,
  modelOutputIncluded: false,
  automaticApprovalAllowed: false,
  productionDeploymentAllowed: false,
});

export const createOfflineArtifactValidationEvidenceClosureSignoffPack = async (
  input: OfflineArtifactValidationEvidenceClosureSignoffPackCreateInput,
): Promise<OfflineArtifactValidationEvidenceClosureSignoffPackRecord | null> => {
  const matrix = await getOfflineArtifactValidationEvidenceGapClosureMatrixById(input.evidenceGapClosureMatrixId);
  if (!matrix) return null;
  const reviewerDecision = safeDecision(input.reviewerDecision);
  const reviewerDecisionReason = String(input.reviewerDecisionReason || "Human reviewer signoff pack generated for offline artifact evidence closure review.").slice(0, 1200);
  const checklist = buildOfflineArtifactValidationEvidenceClosureSignoffChecklist(matrix);
  const readiness = signoffReadinessPct(checklist);
  const status = statusFromChecklist(checklist, reviewerDecision);
  const safety = buildOfflineArtifactValidationSafetyGate();
  const snapshot = buildOfflineArtifactValidationEvidenceClosureSignoffPackSnapshot(matrix, checklist, reviewerDecision, reviewerDecisionReason);
  const signedEvidenceClosureReviewerSignoffPackHash = computeArtifactEnvelopeSha256({
    phase: PHASE_LABEL,
    evidenceGapClosureMatrixId: matrix.id,
    evidenceReviewPackId: matrix.evidenceReviewPackId,
    queueItemId: matrix.queueItemId,
    validationResultId: matrix.validationResultId,
    artifactId: matrix.artifactId,
    artifactHash: matrix.artifactHash,
    signoffPackStatus: status,
    reviewerDecision,
    signoffReadinessPct: readiness,
    checklist: checklist.map((row) => ({ key: row.key, status: row.status, priority: row.priority })),
    safety,
    advisoryOnly: true,
    artifactBytesIncluded: false,
    modelOutputIncluded: false,
    automaticApprovalAllowed: false,
    productionDeploymentAllowed: false,
  });
  return recordOfflineArtifactValidationEvidenceClosureSignoffPack({
    evidenceGapClosureMatrixId: matrix.id,
    evidenceReviewPackId: matrix.evidenceReviewPackId,
    queueItemId: matrix.queueItemId,
    validationResultId: matrix.validationResultId,
    artifactId: matrix.artifactId,
    artifactHash: matrix.artifactHash,
    signoffPackStatus: status,
    reviewerDecision,
    reviewerDecisionReason,
    signoffReadinessPct: readiness,
    checklistPassCount: checklist.filter((row) => row.status === "pass").length,
    checklistWarningCount: checklist.filter((row) => row.status === "warning").length,
    checklistFailCount: checklist.filter((row) => row.status === "fail").length,
    evidenceConfidence: matrix.evidenceConfidence,
    recommendedSignoffAction: recommendedActionFromSignoffPack(status, checklist),
    signoffPackSnapshot: snapshot,
    signedEvidenceClosureReviewerSignoffPackHash,
    safety,
    createdByUserId: input.createdByUserId ?? null,
  });
};

export const bootstrapOfflineArtifactValidationEvidenceClosureSignoffPackFromLatestMatrix = async (payload: {
  reviewerDecision?: OfflineArtifactValidationEvidenceClosureSignoffDecision;
  reviewerDecisionReason?: string;
  createdByUserId?: string | number | null;
} = {}): Promise<OfflineArtifactValidationEvidenceClosureSignoffPackRecord | null> => {
  const [latestMatrix] = await listOfflineArtifactValidationEvidenceGapClosureMatrices(1);
  if (!latestMatrix) return null;
  return createOfflineArtifactValidationEvidenceClosureSignoffPack({
    evidenceGapClosureMatrixId: latestMatrix.id,
    reviewerDecision: payload.reviewerDecision,
    reviewerDecisionReason: payload.reviewerDecisionReason,
    createdByUserId: payload.createdByUserId ?? null,
  });
};

export const createLatestOfflineArtifactValidationEvidenceClosureSignoffPackForEvidenceReviewPack = async (payload: {
  evidenceReviewPackId: string | number;
  reviewerDecision?: OfflineArtifactValidationEvidenceClosureSignoffDecision;
  reviewerDecisionReason?: string;
  createdByUserId?: string | number | null;
}): Promise<OfflineArtifactValidationEvidenceClosureSignoffPackRecord | null> => {
  const latestMatrix = await getLatestOfflineArtifactValidationEvidenceGapClosureMatrixForEvidenceReviewPack(payload.evidenceReviewPackId);
  if (!latestMatrix) return null;
  return createOfflineArtifactValidationEvidenceClosureSignoffPack({
    evidenceGapClosureMatrixId: latestMatrix.id,
    reviewerDecision: payload.reviewerDecision,
    reviewerDecisionReason: payload.reviewerDecisionReason,
    createdByUserId: payload.createdByUserId ?? null,
  });
};

export const getOfflineArtifactValidationEvidenceClosureSignoffPack = getOfflineArtifactValidationEvidenceClosureSignoffPackById;
export const listOfflineArtifactValidationEvidenceClosureSignoffPackRecords = listOfflineArtifactValidationEvidenceClosureSignoffPacks;
export const getLatestOfflineArtifactValidationEvidenceClosureSignoffPack = getLatestOfflineArtifactValidationEvidenceClosureSignoffPackForEvidenceGapClosureMatrix;
export const buildOfflineArtifactValidationEvidenceClosureSignoffPackSummary = getOfflineArtifactValidationEvidenceClosureSignoffPackSummary;
export const OFFLINE_ARTIFACT_VALIDATION_EVIDENCE_CLOSURE_SIGNOFF_PACK_PHASE = PHASE_LABEL;
