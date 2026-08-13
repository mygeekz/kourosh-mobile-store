import { allAsync, getAsync, runAsync } from "../../query";
import { clampLimit, safeJson } from "./mlDbUtils";
import { buildOfflineArtifactValidationSafetyGate } from "../../../intelligence/artifacts/validation/offlineArtifactValidationRules";
import type { OfflineArtifactValidationSafetyGate } from "../../../intelligence/artifacts/validation/offlineArtifactValidationTypes";
import type { OfflineArtifactValidationEvidenceConfidence } from "../../../intelligence/artifacts/validationReviewQueue/offlineArtifactValidationEvidenceReviewPackTypes";
import type {
  OfflineArtifactValidationFutureShadowEligibilityReviewBinderDecision,
  OfflineArtifactValidationFutureShadowEligibilityReviewBinderRecord,
  OfflineArtifactValidationFutureShadowEligibilityReviewBinderSnapshot,
  OfflineArtifactValidationFutureShadowEligibilityReviewBinderStatus,
  OfflineArtifactValidationFutureShadowEligibilityReviewBinderSummary,
} from "../../../intelligence/artifacts/validationReviewQueue/offlineArtifactValidationFutureShadowEligibilityReviewBinderTypes";

const parseJson = <T>(value: unknown, fallback: T): T => {
  if (typeof value !== "string" || value.trim().length === 0) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch (_err) {
    return fallback;
  }
};

const fallbackReviewBinderSnapshot = (): OfflineArtifactValidationFutureShadowEligibilityReviewBinderSnapshot => ({
  phase: "Phase 7H — Offline Artifact Future Shadow Eligibility Review Binder",
  eligibilityGate: {} as OfflineArtifactValidationFutureShadowEligibilityReviewBinderSnapshot["eligibilityGate"],
  binderSections: [],
  binderStatus: "binder_needs_eligibility_closure",
  binderDecision: "needs_eligibility_closure",
  binderScope: "not_applicable",
  binderReadinessPct: 0,
  sectionCount: 0,
  passedSectionCount: 0,
  warningSectionCount: 0,
  failedSectionCount: 0,
  evidenceConfidence: "low",
  eligibilityDecision: "not_eligible",
  gateStatus: "not_ready_needs_more_evidence",
  metadataOnly: true,
  advisoryOnly: true,
  futureShadowOnly: true,
  executionAllowed: false,
  activationAllowed: false,
  inferenceAllowed: false,
  runtimeInvocationAllowed: false,
  businessMutationAllowed: false,
  artifactBytesIncluded: false,
  modelOutputIncluded: false,
  automaticApprovalAllowed: false,
  productionDeploymentAllowed: false,
});

const mapOfflineArtifactValidationFutureShadowEligibilityReviewBinderRow = (
  row: Record<string, unknown> | undefined,
): OfflineArtifactValidationFutureShadowEligibilityReviewBinderRecord | null => {
  if (!row) return null;
  const safety = parseJson<OfflineArtifactValidationSafetyGate>(row.safetyGateJson, buildOfflineArtifactValidationSafetyGate());
  return {
    id: Number(row.id),
    futureShadowEligibilityGateId: Number(row.futureShadowEligibilityGateId || 0),
    evidenceClosureSignoffPackId: Number(row.evidenceClosureSignoffPackId || 0),
    evidenceGapClosureMatrixId: Number(row.evidenceGapClosureMatrixId || 0),
    evidenceReviewPackId: Number(row.evidenceReviewPackId || 0),
    queueItemId: Number(row.queueItemId || 0),
    validationResultId: Number(row.validationResultId || 0),
    artifactId: String(row.artifactId || ""),
    artifactHash: row.artifactHash == null ? null : String(row.artifactHash),
    binderStatus: String(row.binderStatus || "binder_needs_eligibility_closure") as OfflineArtifactValidationFutureShadowEligibilityReviewBinderStatus,
    binderDecision: String(row.binderDecision || "needs_eligibility_closure") as OfflineArtifactValidationFutureShadowEligibilityReviewBinderDecision,
    binderReadinessPct: Number(row.binderReadinessPct || 0),
    sectionCount: Number(row.sectionCount || 0),
    passedSectionCount: Number(row.passedSectionCount || 0),
    warningSectionCount: Number(row.warningSectionCount || 0),
    failedSectionCount: Number(row.failedSectionCount || 0),
    evidenceConfidence: String(row.evidenceConfidence || "low") as OfflineArtifactValidationEvidenceConfidence,
    eligibilityDecision: String(row.eligibilityDecision || "not_eligible"),
    gateStatus: String(row.gateStatus || "not_ready_needs_more_evidence"),
    recommendedBinderAction: String(row.recommendedBinderAction || "Review eligibility binder manually; no runtime promotion is allowed."),
    binderSnapshot: parseJson<OfflineArtifactValidationFutureShadowEligibilityReviewBinderSnapshot>(row.binderSnapshotJson, fallbackReviewBinderSnapshot()),
    signedFutureShadowEligibilityReviewBinderHash: String(row.signedFutureShadowEligibilityReviewBinderHash || ""),
    safety,
    createdAt: String(row.createdAt || ""),
    createdByUserId: row.createdByUserId as string | number | null,
  };
};

const offlineArtifactValidationFutureShadowEligibilityReviewBinderSelect = `
  SELECT id,
         future_shadow_eligibility_gate_id AS futureShadowEligibilityGateId,
         evidence_closure_signoff_pack_id AS evidenceClosureSignoffPackId,
         evidence_gap_closure_matrix_id AS evidenceGapClosureMatrixId,
         evidence_review_pack_id AS evidenceReviewPackId,
         queue_item_id AS queueItemId,
         validation_result_id AS validationResultId,
         artifact_id AS artifactId,
         artifact_hash AS artifactHash,
         binder_status AS binderStatus,
         binder_decision AS binderDecision,
         binder_readiness_pct AS binderReadinessPct,
         section_count AS sectionCount,
         passed_section_count AS passedSectionCount,
         warning_section_count AS warningSectionCount,
         failed_section_count AS failedSectionCount,
         evidence_confidence AS evidenceConfidence,
         eligibility_decision AS eligibilityDecision,
         gate_status AS gateStatus,
         recommended_binder_action AS recommendedBinderAction,
         binder_snapshot_json AS binderSnapshotJson,
         signed_future_shadow_eligibility_review_binder_hash AS signedFutureShadowEligibilityReviewBinderHash,
         safety_gate_json AS safetyGateJson,
         created_at AS createdAt,
         created_by_user_id AS createdByUserId
  FROM offline_artifact_validation_future_shadow_eligibility_review_binders
`;

export const recordOfflineArtifactValidationFutureShadowEligibilityReviewBinder = async (
  record: Omit<OfflineArtifactValidationFutureShadowEligibilityReviewBinderRecord, "id" | "createdAt">,
): Promise<OfflineArtifactValidationFutureShadowEligibilityReviewBinderRecord | null> => {
  const insertResult = await runAsync(
    `
      INSERT INTO offline_artifact_validation_future_shadow_eligibility_review_binders (
        future_shadow_eligibility_gate_id, evidence_closure_signoff_pack_id, evidence_gap_closure_matrix_id,
        evidence_review_pack_id, queue_item_id, validation_result_id, artifact_id, artifact_hash,
        binder_status, binder_decision, binder_readiness_pct, section_count, passed_section_count,
        warning_section_count, failed_section_count, evidence_confidence, eligibility_decision, gate_status,
        recommended_binder_action, binder_snapshot_json, signed_future_shadow_eligibility_review_binder_hash,
        safety_gate_json, created_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      record.futureShadowEligibilityGateId,
      record.evidenceClosureSignoffPackId,
      record.evidenceGapClosureMatrixId,
      record.evidenceReviewPackId,
      record.queueItemId,
      record.validationResultId,
      String(record.artifactId),
      record.artifactHash,
      record.binderStatus,
      record.binderDecision,
      record.binderReadinessPct,
      record.sectionCount,
      record.passedSectionCount,
      record.warningSectionCount,
      record.failedSectionCount,
      record.evidenceConfidence,
      record.eligibilityDecision,
      record.gateStatus,
      record.recommendedBinderAction,
      safeJson(record.binderSnapshot),
      record.signedFutureShadowEligibilityReviewBinderHash,
      safeJson(record.safety),
      record.createdByUserId == null ? null : String(record.createdByUserId),
    ],
  );
  return getOfflineArtifactValidationFutureShadowEligibilityReviewBinderById(insertResult.lastID);
};

export const getOfflineArtifactValidationFutureShadowEligibilityReviewBinderById = async (
  idInput: unknown,
): Promise<OfflineArtifactValidationFutureShadowEligibilityReviewBinderRecord | null> => {
  const id = Number(idInput);
  if (!Number.isFinite(id) || id <= 0) return null;
  const row = await getAsync(`${offlineArtifactValidationFutureShadowEligibilityReviewBinderSelect} WHERE id = ?`, [id]);
  return mapOfflineArtifactValidationFutureShadowEligibilityReviewBinderRow(row);
};

export const listOfflineArtifactValidationFutureShadowEligibilityReviewBinders = async (
  limitInput?: unknown,
): Promise<OfflineArtifactValidationFutureShadowEligibilityReviewBinderRecord[]> => {
  const limit = clampLimit(limitInput, 50, 500);
  const rows = await allAsync(`${offlineArtifactValidationFutureShadowEligibilityReviewBinderSelect} ORDER BY created_at DESC, id DESC LIMIT ?`, [limit]);
  return rows.map((row) => mapOfflineArtifactValidationFutureShadowEligibilityReviewBinderRow(row)).filter((row): row is OfflineArtifactValidationFutureShadowEligibilityReviewBinderRecord => row !== null);
};

export const getLatestOfflineArtifactValidationFutureShadowEligibilityReviewBinderForEligibilityGate = async (
  futureShadowEligibilityGateIdInput: unknown,
): Promise<OfflineArtifactValidationFutureShadowEligibilityReviewBinderRecord | null> => {
  const futureShadowEligibilityGateId = Number(futureShadowEligibilityGateIdInput);
  if (!Number.isFinite(futureShadowEligibilityGateId) || futureShadowEligibilityGateId <= 0) return null;
  const row = await getAsync(
    `${offlineArtifactValidationFutureShadowEligibilityReviewBinderSelect} WHERE future_shadow_eligibility_gate_id = ? ORDER BY created_at DESC, id DESC LIMIT 1`,
    [futureShadowEligibilityGateId],
  ).catch(() => null);
  return mapOfflineArtifactValidationFutureShadowEligibilityReviewBinderRow(row);
};

export const getOfflineArtifactValidationFutureShadowEligibilityReviewBinderSummary = async (): Promise<OfflineArtifactValidationFutureShadowEligibilityReviewBinderSummary> => {
  const aggregate = await getAsync(`
    SELECT COUNT(*) AS totalReviewBinders,
           SUM(CASE WHEN binder_status = 'binder_ready_for_future_shadow_review' THEN 1 ELSE 0 END) AS readyForFutureShadowReviewBinders,
           SUM(CASE WHEN binder_status = 'binder_needs_eligibility_closure' THEN 1 ELSE 0 END) AS needsEligibilityClosureBinders,
           SUM(CASE WHEN binder_status = 'binder_blocked_by_eligibility_gate' THEN 1 ELSE 0 END) AS blockedByEligibilityGateBinders,
           SUM(CASE WHEN binder_status = 'binder_rejected_for_artifact_trust' THEN 1 ELSE 0 END) AS rejectedForArtifactTrustBinders,
           SUM(CASE WHEN binder_status = 'binder_safety_blocked' THEN 1 ELSE 0 END) AS safetyBlockedBinders,
           AVG(binder_readiness_pct) AS averageBinderReadinessPct,
           SUM(failed_section_count) AS totalFailedSectionCount
    FROM offline_artifact_validation_future_shadow_eligibility_review_binders
  `).catch(() => null) as Record<string, unknown> | null;
  const latestReviewBinder = (await listOfflineArtifactValidationFutureShadowEligibilityReviewBinders(1))[0] || null;
  const totalReviewBinders = Number(aggregate?.totalReviewBinders || 0);
  const readyForFutureShadowReviewBinders = Number(aggregate?.readyForFutureShadowReviewBinders || 0);
  const totalFailedSectionCount = Number(aggregate?.totalFailedSectionCount || 0);
  return {
    totalReviewBinders,
    readyForFutureShadowReviewBinders,
    needsEligibilityClosureBinders: Number(aggregate?.needsEligibilityClosureBinders || 0),
    blockedByEligibilityGateBinders: Number(aggregate?.blockedByEligibilityGateBinders || 0),
    rejectedForArtifactTrustBinders: Number(aggregate?.rejectedForArtifactTrustBinders || 0),
    safetyBlockedBinders: Number(aggregate?.safetyBlockedBinders || 0),
    averageBinderReadinessPct: Math.round(Number(aggregate?.averageBinderReadinessPct || 0)),
    totalFailedSectionCount,
    latestReviewBinder,
    recommendedNextAction: latestReviewBinder?.recommendedBinderAction || (totalReviewBinders === 0
      ? "Create a metadata-only review binder from an eligible future-shadow gate; no runtime promotion is allowed."
      : readyForFutureShadowReviewBinders > 0
        ? "Ready binders are future-shadow-review-only metadata; do not execute, activate, infer, deploy, or mutate business records."
        : "Resolve eligibility gate blockers and evidence gaps before binder packaging."),
    safety: buildOfflineArtifactValidationSafetyGate(),
  };
};
