import { computeArtifactEnvelopeSha256 } from "../artifactHashing";
import { buildOfflineArtifactValidationSafetyGate } from "../validation/offlineArtifactValidationRules";
import {
  getLatestOfflineArtifactValidationEvidenceReviewPackForQueueItem,
  getOfflineArtifactValidationEvidenceReviewPackById,
  listOfflineArtifactValidationEvidenceReviewPacks,
} from "../../../db/domains/ml/mlOfflineArtifactValidationEvidenceReviewPack.db";
import {
  getLatestOfflineArtifactValidationEvidenceGapClosureMatrixForEvidenceReviewPack,
  getOfflineArtifactValidationEvidenceGapClosureMatrixById,
  getOfflineArtifactValidationEvidenceGapClosureMatrixSummary,
  listOfflineArtifactValidationEvidenceGapClosureMatrices,
  recordOfflineArtifactValidationEvidenceGapClosureMatrix,
} from "../../../db/domains/ml/mlOfflineArtifactValidationEvidenceGapClosureMatrix.db";
import type { OfflineArtifactValidationEvidenceConfidence, OfflineArtifactValidationEvidenceReviewPackRecord } from "./offlineArtifactValidationEvidenceReviewPackTypes";
import type { OfflineArtifactValidationReviewPriority } from "./offlineArtifactValidationReviewQueueTypes";
import type {
  OfflineArtifactValidationEvidenceGapClosureMatrixCreateInput,
  OfflineArtifactValidationEvidenceGapClosureMatrixRecord,
  OfflineArtifactValidationEvidenceGapClosureMatrixRow,
  OfflineArtifactValidationEvidenceGapClosureMatrixSnapshot,
  OfflineArtifactValidationEvidenceGapClosureMatrixStatus,
  OfflineArtifactValidationEvidenceGapClosureState,
} from "./offlineArtifactValidationEvidenceGapClosureMatrixTypes";

const PHASE_LABEL = "Phase 7E — Offline Artifact Evidence Gap Closure Matrix" as const;

const normalizeKey = (value: string): string => value
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "_")
  .replace(/^_+|_+$/g, "")
  .slice(0, 80) || "evidence_gap";

const uniqueStrings = (items: Array<string | null | undefined>): string[] => {
  return [...new Set(items.map((item) => String(item || "").trim()).filter((item) => item.length > 0))];
};

const evidenceReferencesFromPack = (pack: OfflineArtifactValidationEvidenceReviewPackRecord): string[] => uniqueStrings([
  ...(pack.packSnapshot.evidenceReferences || []),
  ...((pack.packSnapshot.evidenceNotes || []).map((event) => event.evidenceReference || String(event.evidenceJson?.evidenceReference || ""))),
]);

const priorityFromPack = (
  pack: OfflineArtifactValidationEvidenceReviewPackRecord,
  gapDescription: string,
): OfflineArtifactValidationReviewPriority => {
  const description = gapDescription.toLowerCase();
  if (pack.packStatus === "critical_review_required" || pack.packSnapshot.queueItem.reviewPriority === "critical" || description.includes("critical")) return "critical";
  if (pack.packSnapshot.queueItem.reviewPriority === "high" || description.includes("high-priority") || description.includes("quarantine")) return "high";
  if (pack.evidenceConfidence === "low" || pack.packSnapshot.queueItem.reviewPriority === "medium") return "medium";
  return "low";
};

const closureStateFromPack = (
  pack: OfflineArtifactValidationEvidenceReviewPackRecord,
  gapDescription: string,
  evidenceReferences: string[],
): OfflineArtifactValidationEvidenceGapClosureState => {
  if (pack.packSnapshot.queueItem.queueStatus === "deferred") return "blocked";
  if (pack.packStatus === "critical_review_required" && gapDescription.toLowerCase().includes("critical")) return "blocked";
  if (evidenceReferences.length >= 2 && pack.evidenceConfidence === "high") return "closed_by_evidence";
  if (evidenceReferences.length > 0 && pack.evidenceConfidence !== "low") return "partially_closed";
  return "open";
};

const requiredActionForRow = (
  state: OfflineArtifactValidationEvidenceGapClosureState,
  priority: OfflineArtifactValidationReviewPriority,
  gapDescription: string,
): string => {
  if (state === "closed_by_evidence") return "Preserve the metadata evidence link and keep this gap closed for human review; do not activate the artifact.";
  if (state === "partially_closed") return "Add one more metadata evidence note or reviewer reference before treating this gap as closed.";
  if (state === "blocked") return `Escalate blocked ${priority} evidence gap to a human reviewer; keep artifact execution and activation disabled.`;
  return `Record metadata-only closure evidence for gap: ${gapDescription}`;
};

const sourceForGap = (gapDescription: string): OfflineArtifactValidationEvidenceGapClosureMatrixRow["source"] => {
  const lower = gapDescription.toLowerCase();
  if (lower.includes("validation")) return "validation_finding";
  if (lower.includes("queue") || lower.includes("reviewer")) return "review_queue";
  if (lower.includes("evidence note") || lower.includes("evidence was requested")) return "assignment_event";
  return "evidence_review_pack";
};

export const buildOfflineArtifactValidationEvidenceGapClosureMatrixRows = (
  pack: OfflineArtifactValidationEvidenceReviewPackRecord,
): OfflineArtifactValidationEvidenceGapClosureMatrixRow[] => {
  const baseGaps = uniqueStrings(pack.packSnapshot.unresolvedEvidenceGaps || []);
  const evidenceReferences = evidenceReferencesFromPack(pack);

  const gapDescriptions = baseGaps.length > 0
    ? baseGaps
    : pack.evidenceConfidence === "high" && pack.packStatus === "ready_for_review"
      ? []
      : ["Evidence review pack has no explicit unresolved gap, but closure confidence still requires human confirmation."];

  return gapDescriptions.map((gapDescription, index) => {
    const priority = priorityFromPack(pack, gapDescription);
    const closureState = closureStateFromPack(pack, gapDescription, evidenceReferences);
    return {
      gapKey: `${normalizeKey(gapDescription)}_${index + 1}`,
      gapDescription,
      source: sourceForGap(gapDescription),
      priority,
      closureState,
      evidenceConfidence: pack.evidenceConfidence,
      evidenceReferences,
      requiredAction: requiredActionForRow(closureState, priority, gapDescription),
      advisoryOnly: true,
      executionAllowed: false,
      activationAllowed: false,
      inferenceAllowed: false,
      businessMutationAllowed: false,
    };
  });
};

const closureReadinessPct = (rows: OfflineArtifactValidationEvidenceGapClosureMatrixRow[]): number => {
  if (rows.length === 0) return 100;
  const score = rows.reduce((sum, row) => {
    if (row.closureState === "closed_by_evidence") return sum + 1;
    if (row.closureState === "partially_closed") return sum + 0.5;
    return sum;
  }, 0);
  return Math.max(0, Math.min(100, Math.round((score / rows.length) * 100)));
};

const statusFromRows = (
  rows: OfflineArtifactValidationEvidenceGapClosureMatrixRow[],
  readinessPct: number,
): OfflineArtifactValidationEvidenceGapClosureMatrixStatus => {
  if (rows.length === 0) return "no_gaps_detected";
  if (rows.some((row) => row.priority === "critical" && row.closureState !== "closed_by_evidence")) return "critical_gap_open";
  if (readinessPct >= 100) return "closure_ready";
  if (readinessPct > 0) return "partial_closure";
  return "needs_more_evidence";
};

const recommendedActionFromMatrix = (
  rows: OfflineArtifactValidationEvidenceGapClosureMatrixRow[],
  matrixStatus: OfflineArtifactValidationEvidenceGapClosureMatrixStatus,
): string => {
  const firstOpenRow = rows.find((row) => row.closureState === "open" || row.closureState === "blocked");
  if (firstOpenRow) return firstOpenRow.requiredAction;
  if (matrixStatus === "no_gaps_detected") return "No evidence gaps are currently detected; preserve this as advisory metadata only.";
  if (matrixStatus === "closure_ready") return "Evidence gaps appear closed for human review; keep artifact activation, execution, and inference disabled.";
  if (matrixStatus === "partial_closure") return "Complete the remaining partial evidence closures before any future shadow-only review.";
  if (matrixStatus === "critical_gap_open") return "Escalate critical evidence gaps to a human reviewer; no automatic approval or activation is allowed.";
  return "Record metadata-only evidence notes to close outstanding gaps; do not load artifact bytes.";
};

export const buildOfflineArtifactValidationEvidenceGapClosureMatrixSnapshot = (
  pack: OfflineArtifactValidationEvidenceReviewPackRecord,
  matrixRows: OfflineArtifactValidationEvidenceGapClosureMatrixRow[],
): OfflineArtifactValidationEvidenceGapClosureMatrixSnapshot => {
  return {
    phase: PHASE_LABEL,
    evidenceReviewPack: pack,
    matrixRows,
    openGapKeys: matrixRows.filter((row) => row.closureState === "open" || row.closureState === "partially_closed").map((row) => row.gapKey),
    closedGapKeys: matrixRows.filter((row) => row.closureState === "closed_by_evidence").map((row) => row.gapKey),
    blockedGapKeys: matrixRows.filter((row) => row.closureState === "blocked").map((row) => row.gapKey),
    advisoryOnly: true,
    executionAllowed: false,
    activationAllowed: false,
    inferenceAllowed: false,
    businessMutationAllowed: false,
    artifactBytesIncluded: false,
    modelOutputIncluded: false,
    automaticApprovalAllowed: false,
  };
};

export const createOfflineArtifactValidationEvidenceGapClosureMatrix = async (
  input: OfflineArtifactValidationEvidenceGapClosureMatrixCreateInput,
): Promise<OfflineArtifactValidationEvidenceGapClosureMatrixRecord | null> => {
  const evidenceReviewPack = await getOfflineArtifactValidationEvidenceReviewPackById(input.evidenceReviewPackId);
  if (!evidenceReviewPack) return null;
  const matrixRows = buildOfflineArtifactValidationEvidenceGapClosureMatrixRows(evidenceReviewPack);
  const readinessPct = closureReadinessPct(matrixRows);
  const matrixStatus = statusFromRows(matrixRows, readinessPct);
  const safety = buildOfflineArtifactValidationSafetyGate();
  const snapshot = buildOfflineArtifactValidationEvidenceGapClosureMatrixSnapshot(evidenceReviewPack, matrixRows);
  const openGapCount = matrixRows.filter((row) => row.closureState === "open" || row.closureState === "partially_closed").length;
  const blockedGapCount = matrixRows.filter((row) => row.closureState === "blocked").length;
  const criticalOpenGapCount = matrixRows.filter((row) => row.priority === "critical" && row.closureState !== "closed_by_evidence").length;
  const highOpenGapCount = matrixRows.filter((row) => row.priority === "high" && row.closureState !== "closed_by_evidence").length;
  const signedEvidenceGapClosureMatrixHash = computeArtifactEnvelopeSha256({
    phase: PHASE_LABEL,
    evidenceReviewPackId: evidenceReviewPack.id,
    queueItemId: evidenceReviewPack.queueItemId,
    validationResultId: evidenceReviewPack.validationResultId,
    artifactId: evidenceReviewPack.artifactId,
    artifactHash: evidenceReviewPack.artifactHash,
    matrixStatus,
    closureReadinessPct: readinessPct,
    rows: matrixRows.map((row) => ({
      gapKey: row.gapKey,
      priority: row.priority,
      closureState: row.closureState,
      evidenceConfidence: row.evidenceConfidence,
      evidenceReferences: row.evidenceReferences,
    })),
    safety,
    advisoryOnly: true,
    artifactBytesIncluded: false,
    modelOutputIncluded: false,
    automaticApprovalAllowed: false,
  });
  return recordOfflineArtifactValidationEvidenceGapClosureMatrix({
    evidenceReviewPackId: evidenceReviewPack.id,
    queueItemId: evidenceReviewPack.queueItemId,
    validationResultId: evidenceReviewPack.validationResultId,
    artifactId: evidenceReviewPack.artifactId,
    artifactHash: evidenceReviewPack.artifactHash,
    matrixStatus,
    closureReadinessPct: readinessPct,
    totalGapCount: matrixRows.length,
    openGapCount,
    closedGapCount: matrixRows.filter((row) => row.closureState === "closed_by_evidence").length,
    blockedGapCount,
    criticalOpenGapCount,
    highOpenGapCount,
    evidenceConfidence: evidenceReviewPack.evidenceConfidence,
    recommendedClosureAction: recommendedActionFromMatrix(matrixRows, matrixStatus),
    matrixSnapshot: snapshot,
    signedEvidenceGapClosureMatrixHash,
    safety,
    createdByUserId: input.createdByUserId ?? null,
  });
};

export const bootstrapOfflineArtifactValidationEvidenceGapClosureMatrixFromLatestEvidenceReviewPack = async (payload: {
  createdByUserId?: string | number | null;
} = {}): Promise<OfflineArtifactValidationEvidenceGapClosureMatrixRecord | null> => {
  const [latestPack] = await listOfflineArtifactValidationEvidenceReviewPacks(1);
  if (!latestPack) return null;
  return createOfflineArtifactValidationEvidenceGapClosureMatrix({
    evidenceReviewPackId: latestPack.id,
    createdByUserId: payload.createdByUserId ?? null,
  });
};

export const createLatestOfflineArtifactValidationEvidenceGapClosureMatrixForQueueItem = async (payload: {
  queueItemId: string | number;
  createdByUserId?: string | number | null;
}): Promise<OfflineArtifactValidationEvidenceGapClosureMatrixRecord | null> => {
  const latestPack = await getLatestOfflineArtifactValidationEvidenceReviewPackForQueueItem(payload.queueItemId);
  if (!latestPack) return null;
  return createOfflineArtifactValidationEvidenceGapClosureMatrix({
    evidenceReviewPackId: latestPack.id,
    createdByUserId: payload.createdByUserId ?? null,
  });
};

export const getOfflineArtifactValidationEvidenceGapClosureMatrix = getOfflineArtifactValidationEvidenceGapClosureMatrixById;
export const listOfflineArtifactValidationEvidenceGapClosureMatrixRecords = listOfflineArtifactValidationEvidenceGapClosureMatrices;
export const getLatestOfflineArtifactValidationEvidenceGapClosureMatrix = getLatestOfflineArtifactValidationEvidenceGapClosureMatrixForEvidenceReviewPack;
export const buildOfflineArtifactValidationEvidenceGapClosureMatrixSummary = getOfflineArtifactValidationEvidenceGapClosureMatrixSummary;
export const OFFLINE_ARTIFACT_VALIDATION_EVIDENCE_GAP_CLOSURE_MATRIX_PHASE = PHASE_LABEL;
