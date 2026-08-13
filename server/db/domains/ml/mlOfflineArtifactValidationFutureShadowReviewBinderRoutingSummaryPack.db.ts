import { allAsync, getAsync, runAsync } from "../../query";
import { clampLimit, safeJson } from "./mlDbUtils";
import { buildOfflineArtifactValidationSafetyGate } from "../../../intelligence/artifacts/validation/offlineArtifactValidationRules";
import type { OfflineArtifactValidationSafetyGate } from "../../../intelligence/artifacts/validation/offlineArtifactValidationTypes";
import type { OfflineArtifactValidationEvidenceConfidence } from "../../../intelligence/artifacts/validationReviewQueue/offlineArtifactValidationEvidenceReviewPackTypes";
import type { OfflineArtifactValidationReviewPriority } from "../../../intelligence/artifacts/validationReviewQueue/offlineArtifactValidationReviewQueueTypes";
import type {
  OfflineArtifactValidationFutureShadowReviewBinderRoutingLane,
  OfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryDecision,
  OfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackRecord,
  OfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackStatus,
  OfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackSummary,
  OfflineArtifactValidationFutureShadowReviewBinderRoutingSummarySnapshot,
} from "../../../intelligence/artifacts/validationReviewQueue/offlineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackTypes";

const parseJson = <T>(value: unknown, fallback: T): T => {
  if (typeof value !== "string" || value.trim().length === 0) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch (_err) {
    return fallback;
  }
};

const fallbackRoutingSummarySnapshot = (): OfflineArtifactValidationFutureShadowReviewBinderRoutingSummarySnapshot => ({
  phase: "Phase 7I — Offline Artifact Future Shadow Review Binder Routing Summary Pack",
  reviewBinder: {} as OfflineArtifactValidationFutureShadowReviewBinderRoutingSummarySnapshot["reviewBinder"],
  routingSections: [],
  routingPackStatus: "routing_pack_needs_binder_closure",
  routingDecision: "hold_for_binder_closure",
  routeLane: "eligibility_binder_closure",
  routePriority: "medium",
  routingScope: "not_applicable",
  routingReadinessPct: 0,
  sectionCount: 0,
  passedSectionCount: 0,
  warningSectionCount: 0,
  failedSectionCount: 0,
  evidenceConfidence: "low",
  binderDecision: "needs_eligibility_closure",
  binderStatus: "binder_needs_eligibility_closure",
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

const mapOfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackRow = (
  row: Record<string, unknown> | undefined,
): OfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackRecord | null => {
  if (!row) return null;
  const safety = parseJson<OfflineArtifactValidationSafetyGate>(row.safetyGateJson, buildOfflineArtifactValidationSafetyGate());
  return {
    id: Number(row.id),
    futureShadowEligibilityReviewBinderId: Number(row.futureShadowEligibilityReviewBinderId || 0),
    futureShadowEligibilityGateId: Number(row.futureShadowEligibilityGateId || 0),
    evidenceClosureSignoffPackId: Number(row.evidenceClosureSignoffPackId || 0),
    evidenceGapClosureMatrixId: Number(row.evidenceGapClosureMatrixId || 0),
    evidenceReviewPackId: Number(row.evidenceReviewPackId || 0),
    queueItemId: Number(row.queueItemId || 0),
    validationResultId: Number(row.validationResultId || 0),
    artifactId: String(row.artifactId || ""),
    artifactHash: row.artifactHash == null ? null : String(row.artifactHash),
    routingPackStatus: String(row.routingPackStatus || "routing_pack_needs_binder_closure") as OfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackStatus,
    routingDecision: String(row.routingDecision || "hold_for_binder_closure") as OfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryDecision,
    routingReadinessPct: Number(row.routingReadinessPct || 0),
    routePriority: String(row.routePriority || "medium") as OfflineArtifactValidationReviewPriority,
    routeLane: String(row.routeLane || "eligibility_binder_closure") as OfflineArtifactValidationFutureShadowReviewBinderRoutingLane,
    sectionCount: Number(row.sectionCount || 0),
    passedSectionCount: Number(row.passedSectionCount || 0),
    warningSectionCount: Number(row.warningSectionCount || 0),
    failedSectionCount: Number(row.failedSectionCount || 0),
    evidenceConfidence: String(row.evidenceConfidence || "low") as OfflineArtifactValidationEvidenceConfidence,
    binderDecision: String(row.binderDecision || "needs_eligibility_closure"),
    binderStatus: String(row.binderStatus || "binder_needs_eligibility_closure"),
    recommendedRoutingAction: String(row.recommendedRoutingAction || "Review routing summary manually; no activation, inference, deployment, or business mutation is allowed."),
    routingSummaryPackSnapshot: parseJson<OfflineArtifactValidationFutureShadowReviewBinderRoutingSummarySnapshot>(row.routingSummaryPackSnapshotJson, fallbackRoutingSummarySnapshot()),
    signedFutureShadowReviewBinderRoutingSummaryPackHash: String(row.signedFutureShadowReviewBinderRoutingSummaryPackHash || ""),
    safety,
    createdAt: String(row.createdAt || ""),
    createdByUserId: row.createdByUserId as string | number | null,
  };
};

const offlineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackSelect = `
  SELECT id,
         future_shadow_eligibility_review_binder_id AS futureShadowEligibilityReviewBinderId,
         future_shadow_eligibility_gate_id AS futureShadowEligibilityGateId,
         evidence_closure_signoff_pack_id AS evidenceClosureSignoffPackId,
         evidence_gap_closure_matrix_id AS evidenceGapClosureMatrixId,
         evidence_review_pack_id AS evidenceReviewPackId,
         queue_item_id AS queueItemId,
         validation_result_id AS validationResultId,
         artifact_id AS artifactId,
         artifact_hash AS artifactHash,
         routing_pack_status AS routingPackStatus,
         routing_decision AS routingDecision,
         routing_readiness_pct AS routingReadinessPct,
         route_priority AS routePriority,
         route_lane AS routeLane,
         section_count AS sectionCount,
         passed_section_count AS passedSectionCount,
         warning_section_count AS warningSectionCount,
         failed_section_count AS failedSectionCount,
         evidence_confidence AS evidenceConfidence,
         binder_decision AS binderDecision,
         binder_status AS binderStatus,
         recommended_routing_action AS recommendedRoutingAction,
         routing_summary_pack_snapshot_json AS routingSummaryPackSnapshotJson,
         signed_future_shadow_review_binder_routing_summary_pack_hash AS signedFutureShadowReviewBinderRoutingSummaryPackHash,
         safety_gate_json AS safetyGateJson,
         created_at AS createdAt,
         created_by_user_id AS createdByUserId
  FROM offline_artifact_validation_future_shadow_review_binder_routing_summary_packs
`;

export const recordOfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPack = async (
  record: Omit<OfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackRecord, "id" | "createdAt">,
): Promise<OfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackRecord | null> => {
  const insertResult = await runAsync(
    `
      INSERT INTO offline_artifact_validation_future_shadow_review_binder_routing_summary_packs (
        future_shadow_eligibility_review_binder_id, future_shadow_eligibility_gate_id,
        evidence_closure_signoff_pack_id, evidence_gap_closure_matrix_id, evidence_review_pack_id,
        queue_item_id, validation_result_id, artifact_id, artifact_hash, routing_pack_status,
        routing_decision, routing_readiness_pct, route_priority, route_lane, section_count,
        passed_section_count, warning_section_count, failed_section_count, evidence_confidence,
        binder_decision, binder_status, recommended_routing_action, routing_summary_pack_snapshot_json,
        signed_future_shadow_review_binder_routing_summary_pack_hash, safety_gate_json, created_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      record.futureShadowEligibilityReviewBinderId,
      record.futureShadowEligibilityGateId,
      record.evidenceClosureSignoffPackId,
      record.evidenceGapClosureMatrixId,
      record.evidenceReviewPackId,
      record.queueItemId,
      record.validationResultId,
      String(record.artifactId),
      record.artifactHash,
      record.routingPackStatus,
      record.routingDecision,
      record.routingReadinessPct,
      record.routePriority,
      record.routeLane,
      record.sectionCount,
      record.passedSectionCount,
      record.warningSectionCount,
      record.failedSectionCount,
      record.evidenceConfidence,
      record.binderDecision,
      record.binderStatus,
      record.recommendedRoutingAction,
      safeJson(record.routingSummaryPackSnapshot),
      record.signedFutureShadowReviewBinderRoutingSummaryPackHash,
      safeJson(record.safety),
      record.createdByUserId == null ? null : String(record.createdByUserId),
    ],
  );
  return getOfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackById(insertResult.lastID);
};

export const getOfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackById = async (
  idInput: unknown,
): Promise<OfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackRecord | null> => {
  const id = Number(idInput);
  if (!Number.isFinite(id) || id <= 0) return null;
  const row = await getAsync(`${offlineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackSelect} WHERE id = ?`, [id]);
  return mapOfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackRow(row);
};

export const listOfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPacks = async (
  limitInput?: unknown,
): Promise<OfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackRecord[]> => {
  const limit = clampLimit(limitInput, 50, 500);
  const rows = await allAsync(`${offlineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackSelect} ORDER BY created_at DESC, id DESC LIMIT ?`, [limit]);
  return rows.map((row) => mapOfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackRow(row)).filter((row): row is OfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackRecord => row !== null);
};

export const getLatestOfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackForReviewBinder = async (
  futureShadowEligibilityReviewBinderIdInput: unknown,
): Promise<OfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackRecord | null> => {
  const futureShadowEligibilityReviewBinderId = Number(futureShadowEligibilityReviewBinderIdInput);
  if (!Number.isFinite(futureShadowEligibilityReviewBinderId) || futureShadowEligibilityReviewBinderId <= 0) return null;
  const row = await getAsync(
    `${offlineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackSelect} WHERE future_shadow_eligibility_review_binder_id = ? ORDER BY created_at DESC, id DESC LIMIT 1`,
    [futureShadowEligibilityReviewBinderId],
  ).catch(() => null);
  return mapOfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackRow(row);
};

export const getOfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackSummary = async (): Promise<OfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackSummary> => {
  const aggregate = await getAsync(`
    SELECT COUNT(*) AS totalRoutingSummaryPacks,
           SUM(CASE WHEN routing_pack_status = 'routing_pack_ready_for_future_shadow_board' THEN 1 ELSE 0 END) AS readyForFutureShadowBoardPacks,
           SUM(CASE WHEN routing_pack_status = 'routing_pack_needs_binder_closure' THEN 1 ELSE 0 END) AS needsBinderClosurePacks,
           SUM(CASE WHEN routing_pack_status = 'routing_pack_blocked_by_binder' THEN 1 ELSE 0 END) AS blockedByBinderPacks,
           SUM(CASE WHEN routing_pack_status = 'routing_pack_rejected_for_artifact_trust' THEN 1 ELSE 0 END) AS rejectedForArtifactTrustPacks,
           SUM(CASE WHEN routing_pack_status = 'routing_pack_safety_blocked' THEN 1 ELSE 0 END) AS safetyBlockedPacks,
           AVG(routing_readiness_pct) AS averageRoutingReadinessPct,
           SUM(failed_section_count) AS totalFailedSectionCount,
           SUM(CASE WHEN route_priority = 'critical' THEN 1 ELSE 0 END) AS criticalRouteCount,
           SUM(CASE WHEN route_priority = 'high' THEN 1 ELSE 0 END) AS highRouteCount
    FROM offline_artifact_validation_future_shadow_review_binder_routing_summary_packs
  `).catch(() => null) as Record<string, unknown> | null;
  const latestRoutingSummaryPack = (await listOfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPacks(1))[0] || null;
  const totalRoutingSummaryPacks = Number(aggregate?.totalRoutingSummaryPacks || 0);
  const readyForFutureShadowBoardPacks = Number(aggregate?.readyForFutureShadowBoardPacks || 0);
  return {
    totalRoutingSummaryPacks,
    readyForFutureShadowBoardPacks,
    needsBinderClosurePacks: Number(aggregate?.needsBinderClosurePacks || 0),
    blockedByBinderPacks: Number(aggregate?.blockedByBinderPacks || 0),
    rejectedForArtifactTrustPacks: Number(aggregate?.rejectedForArtifactTrustPacks || 0),
    safetyBlockedPacks: Number(aggregate?.safetyBlockedPacks || 0),
    averageRoutingReadinessPct: Math.round(Number(aggregate?.averageRoutingReadinessPct || 0)),
    totalFailedSectionCount: Number(aggregate?.totalFailedSectionCount || 0),
    criticalRouteCount: Number(aggregate?.criticalRouteCount || 0),
    highRouteCount: Number(aggregate?.highRouteCount || 0),
    latestRoutingSummaryPack,
    recommendedNextAction: latestRoutingSummaryPack?.recommendedRoutingAction || (totalRoutingSummaryPacks === 0
      ? "Create a metadata-only routing summary pack from a ready review binder; no activation, inference, deployment, or business mutation is allowed."
      : readyForFutureShadowBoardPacks > 0
        ? "Ready routing packs may be sent to the future shadow review board as metadata-only evidence; do not execute, activate, infer, deploy, or mutate records."
        : "Resolve binder closure and evidence gaps before routing to any future shadow review board."),
    safety: buildOfflineArtifactValidationSafetyGate(),
  };
};
