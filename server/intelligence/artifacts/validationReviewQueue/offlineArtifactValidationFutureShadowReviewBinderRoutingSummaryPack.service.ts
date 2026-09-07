import { computeArtifactEnvelopeSha256 } from "../artifactHashing";
import { buildOfflineArtifactValidationSafetyGate } from "../validation/offlineArtifactValidationRules";
import {
  getLatestOfflineArtifactValidationFutureShadowEligibilityReviewBinderForEligibilityGate,
  getOfflineArtifactValidationFutureShadowEligibilityReviewBinderById,
  listOfflineArtifactValidationFutureShadowEligibilityReviewBinders,
} from "../../../db/domains/ml/mlOfflineArtifactValidationFutureShadowEligibilityReviewBinder.db";
import {
  getLatestOfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackForReviewBinder,
  getOfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackById,
  getOfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackSummary,
  listOfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPacks,
  recordOfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPack,
} from "../../../db/domains/ml/mlOfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPack.db";
import type { OfflineArtifactValidationFutureShadowEligibilityReviewBinderRecord } from "./offlineArtifactValidationFutureShadowEligibilityReviewBinderTypes";
import type { OfflineArtifactValidationReviewPriority } from "./offlineArtifactValidationReviewQueueTypes";
import type {
  OfflineArtifactValidationFutureShadowReviewBinderRoutingLane,
  OfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryDecision,
  OfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackCreateInput,
  OfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackRecord,
  OfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackStatus,
  OfflineArtifactValidationFutureShadowReviewBinderRoutingSummarySection,
  OfflineArtifactValidationFutureShadowReviewBinderRoutingSummarySnapshot,
} from "./offlineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackTypes";

const PHASE_LABEL = "Phase 7I — Offline Artifact Future Shadow Review Binder Routing Summary Pack" as const;

const section = (
  key: string,
  title: string,
  status: OfflineArtifactValidationFutureShadowReviewBinderRoutingSummarySection["status"],
  priority: OfflineArtifactValidationReviewPriority,
  routeLane: OfflineArtifactValidationFutureShadowReviewBinderRoutingLane,
  evidence: Record<string, unknown>,
  reviewerPrompt: string,
  routingReason: string | null,
): OfflineArtifactValidationFutureShadowReviewBinderRoutingSummarySection => ({
  key,
  title,
  status,
  priority,
  routeLane,
  evidence,
  reviewerPrompt,
  routingReason,
  metadataOnly: true,
  advisoryOnly: true,
  futureShadowOnly: true,
  executionAllowed: false,
  activationAllowed: false,
  inferenceAllowed: false,
  runtimeInvocationAllowed: false,
  businessMutationAllowed: false,
  productionDeploymentAllowed: false,
  automaticApprovalAllowed: false,
  artifactBytesIncluded: false,
  modelOutputIncluded: false,
});

const allSafetyFlagsDisabled = (binder: OfflineArtifactValidationFutureShadowEligibilityReviewBinderRecord): boolean => (
  binder.safety.modelExecutionAllowed === false
  && binder.safety.runtimeInvocationAllowed === false
  && binder.safety.artifactExecutionAllowed === false
  && binder.safety.artifactActivationAllowed === false
  && binder.safety.artifactBytesLoadingAllowed === false
  && binder.safety.inferenceEndpointExposed === false
  && binder.safety.productionIntegrationAllowed === false
  && binder.safety.decisionAutomationAllowed === false
  && binder.safety.canMutateBusinessRecords === false
  && binder.safety.automaticDeletionAllowed === false
  && binder.safety.purgeJobAllowed === false
);

export const buildOfflineArtifactValidationFutureShadowReviewBinderRoutingSummarySections = (
  binder: OfflineArtifactValidationFutureShadowEligibilityReviewBinderRecord,
): OfflineArtifactValidationFutureShadowReviewBinderRoutingSummarySection[] => {
  const binderReady = binder.binderStatus === "binder_ready_for_future_shadow_review"
    && binder.binderDecision === "ready_for_future_shadow_review_binder";
  const routeLane: OfflineArtifactValidationFutureShadowReviewBinderRoutingLane = binderReady
    ? "future_shadow_review_board_only"
    : binder.binderStatus === "binder_safety_blocked"
      ? "safety_review_blocked"
      : binder.binderStatus === "binder_rejected_for_artifact_trust"
        ? "artifact_trust_rejection_review"
        : binder.binderStatus === "binder_blocked_by_eligibility_gate"
          ? "reviewer_evidence_closure"
          : "eligibility_binder_closure";
  const traceabilityComplete = Boolean(
    binder.futureShadowEligibilityGateId
      && binder.evidenceClosureSignoffPackId
      && binder.evidenceGapClosureMatrixId
      && binder.evidenceReviewPackId
      && binder.queueItemId
      && binder.validationResultId
      && binder.artifactId,
  );
  const evidenceAccepted = binder.evidenceConfidence === "high" || binder.evidenceConfidence === "medium";
  return [
    section(
      "review_binder_ready_for_routing",
      "Future shadow eligibility review binder is ready for routing summary packaging",
      binderReady ? "pass" : binder.binderStatus === "binder_needs_eligibility_closure" ? "warning" : "fail",
      binder.binderStatus === "binder_safety_blocked" ? "critical" : "high",
      routeLane,
      { binderStatus: binder.binderStatus, binderDecision: binder.binderDecision },
      "Confirm this binder is only routed for future shadow review and not for activation or runtime work.",
      binderReady ? null : "Routing summary requires a ready future-shadow-review-only binder; no automatic promotion is allowed.",
    ),
    section(
      "routing_readiness_threshold_met",
      "Binder readiness is high enough for routing summary pack",
      binder.binderReadinessPct >= 100 ? "pass" : binder.binderReadinessPct >= 85 ? "warning" : "fail",
      binder.binderReadinessPct < 85 ? "high" : "medium",
      routeLane,
      { binderReadinessPct: binder.binderReadinessPct, failedSectionCount: binder.failedSectionCount },
      "Review readiness percentage before routing to any future review board.",
      binder.binderReadinessPct >= 85 ? null : "Raise binder readiness through metadata-only closure before routing.",
    ),
    section(
      "failed_sections_absent",
      "Binder has no failed sections before routing",
      binder.failedSectionCount === 0 ? "pass" : "fail",
      binder.failedSectionCount > 0 ? "high" : "low",
      binder.failedSectionCount > 0 ? "reviewer_evidence_closure" : routeLane,
      { failedSectionCount: binder.failedSectionCount, warningSectionCount: binder.warningSectionCount },
      "Resolve failed binder sections before routing the pack forward.",
      binder.failedSectionCount === 0 ? null : "Failed binder sections block routing; use evidence closure instead.",
    ),
    section(
      "evidence_confidence_accepted_for_routing",
      "Evidence confidence is acceptable for routing summary",
      binder.evidenceConfidence === "high" ? "pass" : evidenceAccepted ? "warning" : "fail",
      evidenceAccepted ? "medium" : "high",
      evidenceAccepted ? routeLane : "reviewer_evidence_closure",
      { evidenceConfidence: binder.evidenceConfidence },
      "Confirm confidence is sufficient for human routing; this is not approval or activation.",
      evidenceAccepted ? null : "Low evidence confidence should be routed to evidence closure, not a future shadow board.",
    ),
    section(
      "traceability_chain_complete_for_routing",
      "Routing summary preserves full offline validation traceability chain",
      traceabilityComplete ? "pass" : "fail",
      traceabilityComplete ? "low" : "high",
      traceabilityComplete ? routeLane : "reviewer_evidence_closure",
      {
        futureShadowEligibilityGateId: binder.futureShadowEligibilityGateId,
        evidenceClosureSignoffPackId: binder.evidenceClosureSignoffPackId,
        evidenceGapClosureMatrixId: binder.evidenceGapClosureMatrixId,
        evidenceReviewPackId: binder.evidenceReviewPackId,
        queueItemId: binder.queueItemId,
        validationResultId: binder.validationResultId,
        artifactId: binder.artifactId,
      },
      "Keep routing traceability metadata complete before forwarding to any human board.",
      traceabilityComplete ? null : "Traceability gap exists; routing summary must stay in closure lane.",
    ),
    section(
      "future_shadow_routing_scope_only",
      "Routing scope is future-shadow-review-only and advisory-only",
      binder.binderSnapshot.futureShadowOnly === true && binder.binderSnapshot.advisoryOnly === true ? "pass" : "fail",
      "critical",
      binder.binderSnapshot.futureShadowOnly === true && binder.binderSnapshot.advisoryOnly === true ? routeLane : "safety_review_blocked",
      { futureShadowOnly: binder.binderSnapshot.futureShadowOnly, advisoryOnly: binder.binderSnapshot.advisoryOnly },
      "Reject any routing interpretation that implies execution, activation, deployment, or production approval.",
      binder.binderSnapshot.futureShadowOnly === true && binder.binderSnapshot.advisoryOnly === true ? null : "Routing scope must remain advisory future-shadow-only.",
    ),
    section(
      "safety_gate_disabled_for_routing",
      "Safety gate remains disabled for execution, activation, inference, deletion, and business mutation",
      allSafetyFlagsDisabled(binder) ? "pass" : "fail",
      "critical",
      allSafetyFlagsDisabled(binder) ? routeLane : "safety_review_blocked",
      { safety: binder.safety },
      "Do not route any pack if safety flags imply runtime, inference, activation, deletion, or mutation.",
      allSafetyFlagsDisabled(binder) ? null : "Safety flags are not fully disabled; routing is blocked.",
    ),
  ];
};

const statusFromSections = (
  binder: OfflineArtifactValidationFutureShadowEligibilityReviewBinderRecord,
  sections: OfflineArtifactValidationFutureShadowReviewBinderRoutingSummarySection[],
): OfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackStatus => {
  if (!allSafetyFlagsDisabled(binder) || sections.some((item) => item.routeLane === "safety_review_blocked" && item.status === "fail")) return "routing_pack_safety_blocked";
  if (binder.binderStatus === "binder_rejected_for_artifact_trust") return "routing_pack_rejected_for_artifact_trust";
  if (binder.binderStatus === "binder_blocked_by_eligibility_gate") return "routing_pack_blocked_by_binder";
  if (sections.some((item) => item.status === "fail") || binder.binderStatus !== "binder_ready_for_future_shadow_review") return "routing_pack_needs_binder_closure";
  return "routing_pack_ready_for_future_shadow_board";
};

const decisionFromStatus = (
  status: OfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackStatus,
): OfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryDecision => {
  if (status === "routing_pack_ready_for_future_shadow_board") return "route_to_future_shadow_review_board";
  if (status === "routing_pack_rejected_for_artifact_trust") return "reject_recommended";
  if (status === "routing_pack_safety_blocked") return "hold_for_evidence_closure";
  if (status === "routing_pack_blocked_by_binder") return "hold_for_evidence_closure";
  return "hold_for_binder_closure";
};

const routeLaneFromStatus = (
  status: OfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackStatus,
): OfflineArtifactValidationFutureShadowReviewBinderRoutingLane => {
  if (status === "routing_pack_ready_for_future_shadow_board") return "future_shadow_review_board_only";
  if (status === "routing_pack_safety_blocked") return "safety_review_blocked";
  if (status === "routing_pack_rejected_for_artifact_trust") return "artifact_trust_rejection_review";
  if (status === "routing_pack_blocked_by_binder") return "reviewer_evidence_closure";
  return "eligibility_binder_closure";
};

const priorityFromSections = (sections: OfflineArtifactValidationFutureShadowReviewBinderRoutingSummarySection[]): OfflineArtifactValidationReviewPriority => {
  if (sections.some((item) => item.status === "fail" && item.priority === "critical")) return "critical";
  if (sections.some((item) => item.status === "fail" && item.priority === "high")) return "high";
  if (sections.some((item) => item.status === "warning")) return "medium";
  return "low";
};

const readinessPctFromSections = (sections: OfflineArtifactValidationFutureShadowReviewBinderRoutingSummarySection[]): number => {
  if (sections.length === 0) return 0;
  const score = sections.reduce((sum, item) => sum + (item.status === "pass" ? 1 : item.status === "warning" ? 0.5 : 0), 0);
  return Math.round((score / sections.length) * 100);
};

const recommendedActionFromRoutingPack = (
  status: OfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackStatus,
): string => {
  if (status === "routing_pack_ready_for_future_shadow_board") {
    return "Route this metadata-only pack to the future shadow review board; do not execute, activate, infer, deploy, or mutate business records.";
  }
  if (status === "routing_pack_safety_blocked") {
    return "Hold routing and review disabled safety flags before any further metadata-only routing.";
  }
  if (status === "routing_pack_rejected_for_artifact_trust") {
    return "Route to artifact trust rejection review; do not promote to future shadow review.";
  }
  if (status === "routing_pack_blocked_by_binder") {
    return "Route back to evidence closure because the eligibility binder is blocked.";
  }
  return "Route back to binder closure and resolve metadata-only readiness gaps before future shadow board routing.";
};

export const buildOfflineArtifactValidationFutureShadowReviewBinderRoutingSummarySnapshot = (
  binder: OfflineArtifactValidationFutureShadowEligibilityReviewBinderRecord,
): OfflineArtifactValidationFutureShadowReviewBinderRoutingSummarySnapshot => {
  const routingSections = buildOfflineArtifactValidationFutureShadowReviewBinderRoutingSummarySections(binder);
  const routingPackStatus = statusFromSections(binder, routingSections);
  const routingDecision = decisionFromStatus(routingPackStatus);
  const routeLane = routeLaneFromStatus(routingPackStatus);
  const routePriority = priorityFromSections(routingSections);
  const passedSectionCount = routingSections.filter((item) => item.status === "pass").length;
  const warningSectionCount = routingSections.filter((item) => item.status === "warning").length;
  const failedSectionCount = routingSections.filter((item) => item.status === "fail").length;
  return {
    phase: PHASE_LABEL,
    reviewBinder: binder,
    routingSections,
    routingPackStatus,
    routingDecision,
    routeLane,
    routePriority,
    routingScope: routingPackStatus === "routing_pack_ready_for_future_shadow_board" ? "future_shadow_review_routing_summary_only" : "not_applicable",
    routingReadinessPct: readinessPctFromSections(routingSections),
    sectionCount: routingSections.length,
    passedSectionCount,
    warningSectionCount,
    failedSectionCount,
    evidenceConfidence: binder.evidenceConfidence,
    binderDecision: binder.binderDecision,
    binderStatus: binder.binderStatus,
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
  };
};

export const createOfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPack = async (
  input: OfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackCreateInput,
): Promise<OfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackRecord | null> => {
  const binder = await getOfflineArtifactValidationFutureShadowEligibilityReviewBinderById(input.futureShadowEligibilityReviewBinderId);
  if (!binder) return null;
  const routingSummaryPackSnapshot = buildOfflineArtifactValidationFutureShadowReviewBinderRoutingSummarySnapshot(binder);
  const signedFutureShadowReviewBinderRoutingSummaryPackHash = computeArtifactEnvelopeSha256({
    phase: PHASE_LABEL,
    futureShadowEligibilityReviewBinderId: binder.id,
    artifactId: binder.artifactId,
    artifactHash: binder.artifactHash,
    routingPackStatus: routingSummaryPackSnapshot.routingPackStatus,
    routingDecision: routingSummaryPackSnapshot.routingDecision,
    routeLane: routingSummaryPackSnapshot.routeLane,
    routePriority: routingSummaryPackSnapshot.routePriority,
    routingReadinessPct: routingSummaryPackSnapshot.routingReadinessPct,
    sectionCount: routingSummaryPackSnapshot.sectionCount,
    failedSectionCount: routingSummaryPackSnapshot.failedSectionCount,
    safety: buildOfflineArtifactValidationSafetyGate(),
  });
  return recordOfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPack({
    futureShadowEligibilityReviewBinderId: binder.id,
    futureShadowEligibilityGateId: binder.futureShadowEligibilityGateId,
    evidenceClosureSignoffPackId: binder.evidenceClosureSignoffPackId,
    evidenceGapClosureMatrixId: binder.evidenceGapClosureMatrixId,
    evidenceReviewPackId: binder.evidenceReviewPackId,
    queueItemId: binder.queueItemId,
    validationResultId: binder.validationResultId,
    artifactId: binder.artifactId,
    artifactHash: binder.artifactHash,
    routingPackStatus: routingSummaryPackSnapshot.routingPackStatus,
    routingDecision: routingSummaryPackSnapshot.routingDecision,
    routingReadinessPct: routingSummaryPackSnapshot.routingReadinessPct,
    routePriority: routingSummaryPackSnapshot.routePriority,
    routeLane: routingSummaryPackSnapshot.routeLane,
    sectionCount: routingSummaryPackSnapshot.sectionCount,
    passedSectionCount: routingSummaryPackSnapshot.passedSectionCount,
    warningSectionCount: routingSummaryPackSnapshot.warningSectionCount,
    failedSectionCount: routingSummaryPackSnapshot.failedSectionCount,
    evidenceConfidence: routingSummaryPackSnapshot.evidenceConfidence,
    binderDecision: routingSummaryPackSnapshot.binderDecision,
    binderStatus: routingSummaryPackSnapshot.binderStatus,
    recommendedRoutingAction: recommendedActionFromRoutingPack(routingSummaryPackSnapshot.routingPackStatus),
    routingSummaryPackSnapshot,
    signedFutureShadowReviewBinderRoutingSummaryPackHash,
    safety: buildOfflineArtifactValidationSafetyGate(),
    createdByUserId: input.createdByUserId ?? null,
  });
};

export const bootstrapOfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackFromLatestReviewBinder = async (
  input: { createdByUserId?: string | number | null } = {},
): Promise<OfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackRecord | null> => {
  const latestBinder = (await listOfflineArtifactValidationFutureShadowEligibilityReviewBinders(1))[0] || null;
  if (!latestBinder) return null;
  return createOfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPack({
    futureShadowEligibilityReviewBinderId: latestBinder.id,
    createdByUserId: input.createdByUserId ?? null,
  });
};

export const createLatestOfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackForEligibilityGate = async (
  input: { futureShadowEligibilityGateId: string | number; createdByUserId?: string | number | null },
): Promise<OfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackRecord | null> => {
  const binder = await getLatestOfflineArtifactValidationFutureShadowEligibilityReviewBinderForEligibilityGate(input.futureShadowEligibilityGateId);
  if (!binder) return null;
  return createOfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPack({
    futureShadowEligibilityReviewBinderId: binder.id,
    createdByUserId: input.createdByUserId ?? null,
  });
};

export const getOfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPack = (
  id: string | number,
): Promise<OfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackRecord | null> => getOfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackById(id);

export const listOfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackRecords = (
  limit?: unknown,
): Promise<OfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackRecord[]> => listOfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPacks(limit);

export const getLatestOfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPack = (
  futureShadowEligibilityReviewBinderId: string | number,
): Promise<OfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackRecord | null> => getLatestOfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackForReviewBinder(futureShadowEligibilityReviewBinderId);

export const buildOfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackSummary = getOfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackSummary;
