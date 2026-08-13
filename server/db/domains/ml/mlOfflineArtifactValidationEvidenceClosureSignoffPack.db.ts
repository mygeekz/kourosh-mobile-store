import { allAsync, getAsync, runAsync } from "../../query";
import { clampLimit, safeJson } from "./mlDbUtils";
import { buildOfflineArtifactValidationSafetyGate } from "../../../intelligence/artifacts/validation/offlineArtifactValidationRules";
import type { OfflineArtifactValidationSafetyGate } from "../../../intelligence/artifacts/validation/offlineArtifactValidationTypes";
import type { OfflineArtifactValidationEvidenceConfidence } from "../../../intelligence/artifacts/validationReviewQueue/offlineArtifactValidationEvidenceReviewPackTypes";
import type {
  OfflineArtifactValidationEvidenceClosureSignoffPackRecord,
  OfflineArtifactValidationEvidenceClosureSignoffPackSnapshot,
  OfflineArtifactValidationEvidenceClosureSignoffPackStatus,
  OfflineArtifactValidationEvidenceClosureSignoffDecision,
  OfflineArtifactValidationEvidenceClosureSignoffPackSummary,
} from "../../../intelligence/artifacts/validationReviewQueue/offlineArtifactValidationEvidenceClosureSignoffPackTypes";

const parseJson = <T>(value: unknown, fallback: T): T => {
  if (typeof value !== "string" || value.trim().length === 0) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch (_err) {
    return fallback;
  }
};

const fallbackSignoffSnapshot = (): OfflineArtifactValidationEvidenceClosureSignoffPackSnapshot => ({
  phase: "Phase 7F — Offline Artifact Evidence Closure Reviewer Signoff Pack",
  matrix: {} as OfflineArtifactValidationEvidenceClosureSignoffPackSnapshot["matrix"],
  checklist: [],
  reviewerDecision: "not_signed",
  reviewerDecisionReason: "Snapshot unavailable.",
  signoffScope: "not_applicable",
  evidenceConfidence: "low",
  closureReadinessPct: 0,
  openGapCount: 0,
  criticalOpenGapCount: 0,
  highOpenGapCount: 0,
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

const mapOfflineArtifactValidationEvidenceClosureSignoffPackRow = (
  row: Record<string, unknown> | undefined,
): OfflineArtifactValidationEvidenceClosureSignoffPackRecord | null => {
  if (!row) return null;
  const safety = parseJson<OfflineArtifactValidationSafetyGate>(row.safetyGateJson, buildOfflineArtifactValidationSafetyGate());
  return {
    id: Number(row.id),
    evidenceGapClosureMatrixId: Number(row.evidenceGapClosureMatrixId || 0),
    evidenceReviewPackId: Number(row.evidenceReviewPackId || 0),
    queueItemId: Number(row.queueItemId || 0),
    validationResultId: Number(row.validationResultId || 0),
    artifactId: String(row.artifactId || ""),
    artifactHash: row.artifactHash == null ? null : String(row.artifactHash),
    signoffPackStatus: String(row.signoffPackStatus || "needs_more_evidence") as OfflineArtifactValidationEvidenceClosureSignoffPackStatus,
    reviewerDecision: String(row.reviewerDecision || "not_signed") as OfflineArtifactValidationEvidenceClosureSignoffDecision,
    reviewerDecisionReason: String(row.reviewerDecisionReason || ""),
    signoffReadinessPct: Number(row.signoffReadinessPct || 0),
    checklistPassCount: Number(row.checklistPassCount || 0),
    checklistWarningCount: Number(row.checklistWarningCount || 0),
    checklistFailCount: Number(row.checklistFailCount || 0),
    evidenceConfidence: String(row.evidenceConfidence || "low") as OfflineArtifactValidationEvidenceConfidence,
    recommendedSignoffAction: String(row.recommendedSignoffAction || "Review signoff pack manually; no activation is allowed."),
    signoffPackSnapshot: parseJson<OfflineArtifactValidationEvidenceClosureSignoffPackSnapshot>(row.signoffPackSnapshotJson, fallbackSignoffSnapshot()),
    signedEvidenceClosureReviewerSignoffPackHash: String(row.signedEvidenceClosureReviewerSignoffPackHash || ""),
    safety,
    createdAt: String(row.createdAt || ""),
    createdByUserId: row.createdByUserId as string | number | null,
  };
};

const offlineArtifactValidationEvidenceClosureSignoffPackSelect = `
  SELECT id,
         evidence_gap_closure_matrix_id AS evidenceGapClosureMatrixId,
         evidence_review_pack_id AS evidenceReviewPackId,
         queue_item_id AS queueItemId,
         validation_result_id AS validationResultId,
         artifact_id AS artifactId,
         artifact_hash AS artifactHash,
         signoff_pack_status AS signoffPackStatus,
         reviewer_decision AS reviewerDecision,
         reviewer_decision_reason AS reviewerDecisionReason,
         signoff_readiness_pct AS signoffReadinessPct,
         checklist_pass_count AS checklistPassCount,
         checklist_warning_count AS checklistWarningCount,
         checklist_fail_count AS checklistFailCount,
         evidence_confidence AS evidenceConfidence,
         recommended_signoff_action AS recommendedSignoffAction,
         signoff_pack_snapshot_json AS signoffPackSnapshotJson,
         signed_evidence_closure_reviewer_signoff_pack_hash AS signedEvidenceClosureReviewerSignoffPackHash,
         safety_gate_json AS safetyGateJson,
         created_at AS createdAt,
         created_by_user_id AS createdByUserId
  FROM offline_artifact_validation_evidence_closure_signoff_packs
`;

export const recordOfflineArtifactValidationEvidenceClosureSignoffPack = async (
  record: Omit<OfflineArtifactValidationEvidenceClosureSignoffPackRecord, "id" | "createdAt">,
): Promise<OfflineArtifactValidationEvidenceClosureSignoffPackRecord | null> => {
  const insertResult = await runAsync(
    `
      INSERT INTO offline_artifact_validation_evidence_closure_signoff_packs (
        evidence_gap_closure_matrix_id, evidence_review_pack_id, queue_item_id, validation_result_id,
        artifact_id, artifact_hash, signoff_pack_status, reviewer_decision, reviewer_decision_reason,
        signoff_readiness_pct, checklist_pass_count, checklist_warning_count, checklist_fail_count,
        evidence_confidence, recommended_signoff_action, signoff_pack_snapshot_json,
        signed_evidence_closure_reviewer_signoff_pack_hash, safety_gate_json, created_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      record.evidenceGapClosureMatrixId,
      record.evidenceReviewPackId,
      record.queueItemId,
      record.validationResultId,
      String(record.artifactId),
      record.artifactHash,
      record.signoffPackStatus,
      record.reviewerDecision,
      record.reviewerDecisionReason,
      record.signoffReadinessPct,
      record.checklistPassCount,
      record.checklistWarningCount,
      record.checklistFailCount,
      record.evidenceConfidence,
      record.recommendedSignoffAction,
      safeJson(record.signoffPackSnapshot),
      record.signedEvidenceClosureReviewerSignoffPackHash,
      safeJson(record.safety),
      record.createdByUserId == null ? null : String(record.createdByUserId),
    ],
  );
  return getOfflineArtifactValidationEvidenceClosureSignoffPackById(insertResult.lastID);
};

export const getOfflineArtifactValidationEvidenceClosureSignoffPackById = async (
  idInput: unknown,
): Promise<OfflineArtifactValidationEvidenceClosureSignoffPackRecord | null> => {
  const id = Number(idInput);
  if (!Number.isFinite(id) || id <= 0) return null;
  const row = await getAsync(`${offlineArtifactValidationEvidenceClosureSignoffPackSelect} WHERE id = ?`, [id]);
  return mapOfflineArtifactValidationEvidenceClosureSignoffPackRow(row);
};

export const listOfflineArtifactValidationEvidenceClosureSignoffPacks = async (
  limitInput?: unknown,
): Promise<OfflineArtifactValidationEvidenceClosureSignoffPackRecord[]> => {
  const limit = clampLimit(limitInput, 50, 500);
  const rows = await allAsync(`${offlineArtifactValidationEvidenceClosureSignoffPackSelect} ORDER BY created_at DESC, id DESC LIMIT ?`, [limit]);
  return rows.map((row) => mapOfflineArtifactValidationEvidenceClosureSignoffPackRow(row)).filter((row): row is OfflineArtifactValidationEvidenceClosureSignoffPackRecord => row !== null);
};

export const getLatestOfflineArtifactValidationEvidenceClosureSignoffPackForEvidenceGapClosureMatrix = async (
  evidenceGapClosureMatrixIdInput: unknown,
): Promise<OfflineArtifactValidationEvidenceClosureSignoffPackRecord | null> => {
  const evidenceGapClosureMatrixId = Number(evidenceGapClosureMatrixIdInput);
  if (!Number.isFinite(evidenceGapClosureMatrixId) || evidenceGapClosureMatrixId <= 0) return null;
  const row = await getAsync(
    `${offlineArtifactValidationEvidenceClosureSignoffPackSelect} WHERE evidence_gap_closure_matrix_id = ? ORDER BY created_at DESC, id DESC LIMIT 1`,
    [evidenceGapClosureMatrixId],
  ).catch(() => null);
  return mapOfflineArtifactValidationEvidenceClosureSignoffPackRow(row);
};

export const getOfflineArtifactValidationEvidenceClosureSignoffPackSummary = async (): Promise<OfflineArtifactValidationEvidenceClosureSignoffPackSummary> => {
  const aggregate = await getAsync(`
    SELECT COUNT(*) AS totalSignoffPacks,
           SUM(CASE WHEN signoff_pack_status = 'ready_for_human_signoff' THEN 1 ELSE 0 END) AS readyForHumanSignoffPacks,
           SUM(CASE WHEN signoff_pack_status = 'signed_for_future_shadow_only' THEN 1 ELSE 0 END) AS signedForFutureShadowOnlyPacks,
           SUM(CASE WHEN signoff_pack_status = 'needs_more_evidence' THEN 1 ELSE 0 END) AS needsMoreEvidencePacks,
           SUM(CASE WHEN signoff_pack_status = 'blocked_by_open_gap' THEN 1 ELSE 0 END) AS blockedByOpenGapPacks,
           SUM(CASE WHEN signoff_pack_status = 'rejected_for_artifact_trust' THEN 1 ELSE 0 END) AS rejectedForArtifactTrustPacks,
           AVG(signoff_readiness_pct) AS averageSignoffReadinessPct,
           SUM(checklist_fail_count) AS totalChecklistFailCount
    FROM offline_artifact_validation_evidence_closure_signoff_packs
  `).catch(() => null) as Record<string, unknown> | null;
  const latestSignoffPack = (await listOfflineArtifactValidationEvidenceClosureSignoffPacks(1))[0] || null;
  const totalChecklistFailCount = Number(aggregate?.totalChecklistFailCount || 0);
  return {
    totalSignoffPacks: Number(aggregate?.totalSignoffPacks || 0),
    readyForHumanSignoffPacks: Number(aggregate?.readyForHumanSignoffPacks || 0),
    signedForFutureShadowOnlyPacks: Number(aggregate?.signedForFutureShadowOnlyPacks || 0),
    needsMoreEvidencePacks: Number(aggregate?.needsMoreEvidencePacks || 0),
    blockedByOpenGapPacks: Number(aggregate?.blockedByOpenGapPacks || 0),
    rejectedForArtifactTrustPacks: Number(aggregate?.rejectedForArtifactTrustPacks || 0),
    averageSignoffReadinessPct: Number(aggregate?.averageSignoffReadinessPct || 0),
    totalChecklistFailCount,
    latestSignoffPack,
    recommendedNextAction: totalChecklistFailCount > 0
      ? "Resolve reviewer signoff checklist failures before future shadow-only consideration."
      : latestSignoffPack?.signoffPackStatus === "signed_for_future_shadow_only"
        ? "Keep signoff as future-shadow-only metadata; activation, execution, inference, and production deployment remain disabled."
        : "Generate reviewer signoff packs for closed evidence matrices; all signoff remains human advisory metadata only.",
    safety: buildOfflineArtifactValidationSafetyGate(),
  };
};
