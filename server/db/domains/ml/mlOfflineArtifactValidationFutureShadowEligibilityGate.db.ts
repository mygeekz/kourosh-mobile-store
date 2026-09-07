import { allAsync, getAsync, runAsync } from "../../query";
import { clampLimit, safeJson } from "./mlDbUtils";
import { buildOfflineArtifactValidationSafetyGate } from "../../../intelligence/artifacts/validation/offlineArtifactValidationRules";
import type { OfflineArtifactValidationSafetyGate } from "../../../intelligence/artifacts/validation/offlineArtifactValidationTypes";
import type { OfflineArtifactValidationEvidenceConfidence } from "../../../intelligence/artifacts/validationReviewQueue/offlineArtifactValidationEvidenceReviewPackTypes";
import type {
  OfflineArtifactValidationFutureShadowEligibilityDecision,
  OfflineArtifactValidationFutureShadowEligibilityGateRecord,
  OfflineArtifactValidationFutureShadowEligibilityGateSnapshot,
  OfflineArtifactValidationFutureShadowEligibilityGateStatus,
  OfflineArtifactValidationFutureShadowEligibilityGateSummary,
} from "../../../intelligence/artifacts/validationReviewQueue/offlineArtifactValidationFutureShadowEligibilityGateTypes";

const parseJson = <T>(value: unknown, fallback: T): T => {
  if (typeof value !== "string" || value.trim().length === 0) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch (_err) {
    return fallback;
  }
};

const fallbackEligibilitySnapshot = (): OfflineArtifactValidationFutureShadowEligibilityGateSnapshot => ({
  phase: "Phase 7G — Offline Artifact Future Shadow Eligibility Readiness Gate",
  signoffPack: {} as OfflineArtifactValidationFutureShadowEligibilityGateSnapshot["signoffPack"],
  checks: [],
  gateStatus: "not_ready_needs_more_evidence",
  eligibilityDecision: "not_eligible",
  eligibilityScope: "not_applicable",
  eligibilityReadinessPct: 0,
  blockerCount: 0,
  criticalBlockerCount: 0,
  warningCount: 0,
  evidenceConfidence: "low",
  reviewerDecision: "not_signed",
  signoffPackStatus: "needs_more_evidence",
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

const mapOfflineArtifactValidationFutureShadowEligibilityGateRow = (
  row: Record<string, unknown> | undefined,
): OfflineArtifactValidationFutureShadowEligibilityGateRecord | null => {
  if (!row) return null;
  const safety = parseJson<OfflineArtifactValidationSafetyGate>(row.safetyGateJson, buildOfflineArtifactValidationSafetyGate());
  return {
    id: Number(row.id),
    evidenceClosureSignoffPackId: Number(row.evidenceClosureSignoffPackId || 0),
    evidenceGapClosureMatrixId: Number(row.evidenceGapClosureMatrixId || 0),
    evidenceReviewPackId: Number(row.evidenceReviewPackId || 0),
    queueItemId: Number(row.queueItemId || 0),
    validationResultId: Number(row.validationResultId || 0),
    artifactId: String(row.artifactId || ""),
    artifactHash: row.artifactHash == null ? null : String(row.artifactHash),
    gateStatus: String(row.gateStatus || "not_ready_needs_more_evidence") as OfflineArtifactValidationFutureShadowEligibilityGateStatus,
    eligibilityDecision: String(row.eligibilityDecision || "not_eligible") as OfflineArtifactValidationFutureShadowEligibilityDecision,
    eligibilityReadinessPct: Number(row.eligibilityReadinessPct || 0),
    blockerCount: Number(row.blockerCount || 0),
    criticalBlockerCount: Number(row.criticalBlockerCount || 0),
    warningCount: Number(row.warningCount || 0),
    evidenceConfidence: String(row.evidenceConfidence || "low") as OfflineArtifactValidationEvidenceConfidence,
    reviewerDecision: String(row.reviewerDecision || "not_signed"),
    signoffPackStatus: String(row.signoffPackStatus || "needs_more_evidence"),
    recommendedEligibilityAction: String(row.recommendedEligibilityAction || "Review future shadow eligibility manually; no activation is allowed."),
    eligibilityGateSnapshot: parseJson<OfflineArtifactValidationFutureShadowEligibilityGateSnapshot>(row.eligibilityGateSnapshotJson, fallbackEligibilitySnapshot()),
    signedFutureShadowEligibilityGateHash: String(row.signedFutureShadowEligibilityGateHash || ""),
    safety,
    createdAt: String(row.createdAt || ""),
    createdByUserId: row.createdByUserId as string | number | null,
  };
};

const offlineArtifactValidationFutureShadowEligibilityGateSelect = `
  SELECT id,
         evidence_closure_signoff_pack_id AS evidenceClosureSignoffPackId,
         evidence_gap_closure_matrix_id AS evidenceGapClosureMatrixId,
         evidence_review_pack_id AS evidenceReviewPackId,
         queue_item_id AS queueItemId,
         validation_result_id AS validationResultId,
         artifact_id AS artifactId,
         artifact_hash AS artifactHash,
         gate_status AS gateStatus,
         eligibility_decision AS eligibilityDecision,
         eligibility_readiness_pct AS eligibilityReadinessPct,
         blocker_count AS blockerCount,
         critical_blocker_count AS criticalBlockerCount,
         warning_count AS warningCount,
         evidence_confidence AS evidenceConfidence,
         reviewer_decision AS reviewerDecision,
         signoff_pack_status AS signoffPackStatus,
         recommended_eligibility_action AS recommendedEligibilityAction,
         eligibility_gate_snapshot_json AS eligibilityGateSnapshotJson,
         signed_future_shadow_eligibility_gate_hash AS signedFutureShadowEligibilityGateHash,
         safety_gate_json AS safetyGateJson,
         created_at AS createdAt,
         created_by_user_id AS createdByUserId
  FROM offline_artifact_validation_future_shadow_eligibility_gates
`;

export const recordOfflineArtifactValidationFutureShadowEligibilityGate = async (
  record: Omit<OfflineArtifactValidationFutureShadowEligibilityGateRecord, "id" | "createdAt">,
): Promise<OfflineArtifactValidationFutureShadowEligibilityGateRecord | null> => {
  const insertResult = await runAsync(
    `
      INSERT INTO offline_artifact_validation_future_shadow_eligibility_gates (
        evidence_closure_signoff_pack_id, evidence_gap_closure_matrix_id, evidence_review_pack_id,
        queue_item_id, validation_result_id, artifact_id, artifact_hash, gate_status,
        eligibility_decision, eligibility_readiness_pct, blocker_count, critical_blocker_count,
        warning_count, evidence_confidence, reviewer_decision, signoff_pack_status,
        recommended_eligibility_action, eligibility_gate_snapshot_json,
        signed_future_shadow_eligibility_gate_hash, safety_gate_json, created_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      record.evidenceClosureSignoffPackId,
      record.evidenceGapClosureMatrixId,
      record.evidenceReviewPackId,
      record.queueItemId,
      record.validationResultId,
      String(record.artifactId),
      record.artifactHash,
      record.gateStatus,
      record.eligibilityDecision,
      record.eligibilityReadinessPct,
      record.blockerCount,
      record.criticalBlockerCount,
      record.warningCount,
      record.evidenceConfidence,
      record.reviewerDecision,
      record.signoffPackStatus,
      record.recommendedEligibilityAction,
      safeJson(record.eligibilityGateSnapshot),
      record.signedFutureShadowEligibilityGateHash,
      safeJson(record.safety),
      record.createdByUserId == null ? null : String(record.createdByUserId),
    ],
  );
  return getOfflineArtifactValidationFutureShadowEligibilityGateById(insertResult.lastID);
};

export const getOfflineArtifactValidationFutureShadowEligibilityGateById = async (
  idInput: unknown,
): Promise<OfflineArtifactValidationFutureShadowEligibilityGateRecord | null> => {
  const id = Number(idInput);
  if (!Number.isFinite(id) || id <= 0) return null;
  const row = await getAsync(`${offlineArtifactValidationFutureShadowEligibilityGateSelect} WHERE id = ?`, [id]);
  return mapOfflineArtifactValidationFutureShadowEligibilityGateRow(row);
};

export const listOfflineArtifactValidationFutureShadowEligibilityGates = async (
  limitInput?: unknown,
): Promise<OfflineArtifactValidationFutureShadowEligibilityGateRecord[]> => {
  const limit = clampLimit(limitInput, 50, 500);
  const rows = await allAsync(`${offlineArtifactValidationFutureShadowEligibilityGateSelect} ORDER BY created_at DESC, id DESC LIMIT ?`, [limit]);
  return rows.map((row) => mapOfflineArtifactValidationFutureShadowEligibilityGateRow(row)).filter((row): row is OfflineArtifactValidationFutureShadowEligibilityGateRecord => row !== null);
};

export const getLatestOfflineArtifactValidationFutureShadowEligibilityGateForSignoffPack = async (
  evidenceClosureSignoffPackIdInput: unknown,
): Promise<OfflineArtifactValidationFutureShadowEligibilityGateRecord | null> => {
  const evidenceClosureSignoffPackId = Number(evidenceClosureSignoffPackIdInput);
  if (!Number.isFinite(evidenceClosureSignoffPackId) || evidenceClosureSignoffPackId <= 0) return null;
  const row = await getAsync(
    `${offlineArtifactValidationFutureShadowEligibilityGateSelect} WHERE evidence_closure_signoff_pack_id = ? ORDER BY created_at DESC, id DESC LIMIT 1`,
    [evidenceClosureSignoffPackId],
  ).catch(() => null);
  return mapOfflineArtifactValidationFutureShadowEligibilityGateRow(row);
};

export const getOfflineArtifactValidationFutureShadowEligibilityGateSummary = async (): Promise<OfflineArtifactValidationFutureShadowEligibilityGateSummary> => {
  const aggregate = await getAsync(`
    SELECT COUNT(*) AS totalEligibilityGates,
           SUM(CASE WHEN gate_status = 'eligible_for_future_shadow_review' THEN 1 ELSE 0 END) AS eligibleForFutureShadowReviewGates,
           SUM(CASE WHEN gate_status = 'not_ready_needs_more_evidence' THEN 1 ELSE 0 END) AS notReadyNeedsMoreEvidenceGates,
           SUM(CASE WHEN gate_status = 'blocked_by_signoff' THEN 1 ELSE 0 END) AS blockedBySignoffGates,
           SUM(CASE WHEN gate_status = 'rejected_for_artifact_trust' THEN 1 ELSE 0 END) AS rejectedForArtifactTrustGates,
           SUM(CASE WHEN gate_status = 'safety_gate_blocked' THEN 1 ELSE 0 END) AS safetyGateBlockedGates,
           AVG(eligibility_readiness_pct) AS averageEligibilityReadinessPct,
           SUM(blocker_count) AS totalBlockerCount,
           SUM(critical_blocker_count) AS totalCriticalBlockerCount
    FROM offline_artifact_validation_future_shadow_eligibility_gates
  `).catch(() => null) as Record<string, unknown> | null;
  const latestEligibilityGate = (await listOfflineArtifactValidationFutureShadowEligibilityGates(1))[0] || null;
  const totalEligibilityGates = Number(aggregate?.totalEligibilityGates || 0);
  const eligibleForFutureShadowReviewGates = Number(aggregate?.eligibleForFutureShadowReviewGates || 0);
  const notReadyNeedsMoreEvidenceGates = Number(aggregate?.notReadyNeedsMoreEvidenceGates || 0);
  const blockedBySignoffGates = Number(aggregate?.blockedBySignoffGates || 0);
  const rejectedForArtifactTrustGates = Number(aggregate?.rejectedForArtifactTrustGates || 0);
  const safetyGateBlockedGates = Number(aggregate?.safetyGateBlockedGates || 0);
  const totalBlockerCount = Number(aggregate?.totalBlockerCount || 0);
  return {
    totalEligibilityGates,
    eligibleForFutureShadowReviewGates,
    notReadyNeedsMoreEvidenceGates,
    blockedBySignoffGates,
    rejectedForArtifactTrustGates,
    safetyGateBlockedGates,
    averageEligibilityReadinessPct: Math.round(Number(aggregate?.averageEligibilityReadinessPct || 0)),
    totalBlockerCount,
    totalCriticalBlockerCount: Number(aggregate?.totalCriticalBlockerCount || 0),
    latestEligibilityGate,
    recommendedNextAction: latestEligibilityGate?.recommendedEligibilityAction || (totalEligibilityGates === 0
      ? "Create a future-shadow eligibility gate from a signed evidence closure signoff pack; no runtime promotion is allowed."
      : eligibleForFutureShadowReviewGates > 0
        ? "Eligible gates are future-shadow-review-only metadata; do not execute, activate, infer, deploy, or mutate business records."
        : "Resolve eligibility blockers through metadata-only evidence and human review."),
    safety: buildOfflineArtifactValidationSafetyGate(),
  };
};
