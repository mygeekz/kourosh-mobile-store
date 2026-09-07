import { computeArtifactEnvelopeSha256 } from "../artifactHashing";
import { buildOfflineArtifactValidationSafetyGate } from "../validation/offlineArtifactValidationRules";
import {
  getLatestOfflineArtifactValidationFutureShadowEligibilityGateForSignoffPack,
  getOfflineArtifactValidationFutureShadowEligibilityGateById,
  listOfflineArtifactValidationFutureShadowEligibilityGates,
} from "../../../db/domains/ml/mlOfflineArtifactValidationFutureShadowEligibilityGate.db";
import {
  getLatestOfflineArtifactValidationFutureShadowEligibilityReviewBinderForEligibilityGate,
  getOfflineArtifactValidationFutureShadowEligibilityReviewBinderById,
  getOfflineArtifactValidationFutureShadowEligibilityReviewBinderSummary,
  listOfflineArtifactValidationFutureShadowEligibilityReviewBinders,
  recordOfflineArtifactValidationFutureShadowEligibilityReviewBinder,
} from "../../../db/domains/ml/mlOfflineArtifactValidationFutureShadowEligibilityReviewBinder.db";
import type { OfflineArtifactValidationFutureShadowEligibilityGateRecord } from "./offlineArtifactValidationFutureShadowEligibilityGateTypes";
import type { OfflineArtifactValidationReviewPriority } from "./offlineArtifactValidationReviewQueueTypes";
import type {
  OfflineArtifactValidationFutureShadowEligibilityReviewBinderCreateInput,
  OfflineArtifactValidationFutureShadowEligibilityReviewBinderDecision,
  OfflineArtifactValidationFutureShadowEligibilityReviewBinderRecord,
  OfflineArtifactValidationFutureShadowEligibilityReviewBinderSection,
  OfflineArtifactValidationFutureShadowEligibilityReviewBinderSnapshot,
  OfflineArtifactValidationFutureShadowEligibilityReviewBinderStatus,
} from "./offlineArtifactValidationFutureShadowEligibilityReviewBinderTypes";

const PHASE_LABEL = "Phase 7H — Offline Artifact Future Shadow Eligibility Review Binder" as const;

const section = (
  key: string,
  title: string,
  status: OfflineArtifactValidationFutureShadowEligibilityReviewBinderSection["status"],
  priority: OfflineArtifactValidationReviewPriority,
  evidence: Record<string, unknown>,
  reviewerPrompt: string,
  blockerReason: string | null,
): OfflineArtifactValidationFutureShadowEligibilityReviewBinderSection => ({
  key,
  title,
  status,
  priority,
  evidence,
  reviewerPrompt,
  blockerReason,
  metadataOnly: true,
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

const allSafetyFlagsDisabled = (gate: OfflineArtifactValidationFutureShadowEligibilityGateRecord): boolean => (
  gate.safety.modelExecutionAllowed === false
  && gate.safety.runtimeInvocationAllowed === false
  && gate.safety.artifactExecutionAllowed === false
  && gate.safety.artifactActivationAllowed === false
  && gate.safety.artifactBytesLoadingAllowed === false
  && gate.safety.inferenceEndpointExposed === false
  && gate.safety.productionIntegrationAllowed === false
  && gate.safety.decisionAutomationAllowed === false
  && gate.safety.canMutateBusinessRecords === false
  && gate.safety.automaticDeletionAllowed === false
  && gate.safety.purgeJobAllowed === false
);

export const buildOfflineArtifactValidationFutureShadowEligibilityReviewBinderSections = (
  gate: OfflineArtifactValidationFutureShadowEligibilityGateRecord,
): OfflineArtifactValidationFutureShadowEligibilityReviewBinderSection[] => {
  const snapshot = gate.eligibilityGateSnapshot;
  const eligible = gate.gateStatus === "eligible_for_future_shadow_review"
    && gate.eligibilityDecision === "eligible_for_future_shadow_review";
  const traceabilityComplete = Boolean(
    gate.evidenceClosureSignoffPackId
      && gate.evidenceGapClosureMatrixId
      && gate.evidenceReviewPackId
      && gate.queueItemId
      && gate.validationResultId
      && gate.artifactId,
  );
  return [
    section(
      "eligibility_gate_ready",
      "Future shadow eligibility gate is ready for review binder packaging",
      eligible ? "pass" : gate.gateStatus === "not_ready_needs_more_evidence" ? "warning" : "fail",
      gate.gateStatus === "safety_gate_blocked" ? "critical" : "high",
      { gateStatus: gate.gateStatus, eligibilityDecision: gate.eligibilityDecision },
      "Confirm the eligibility gate is future-shadow-review-only before using this binder for human review.",
      eligible ? null : "Review binder requires an eligible future-shadow-review-only gate; no automatic promotion is allowed.",
    ),
    section(
      "eligibility_readiness_threshold_met",
      "Eligibility readiness is high enough to package a review binder",
      gate.eligibilityReadinessPct >= 100 ? "pass" : gate.eligibilityReadinessPct >= 85 ? "warning" : "fail",
      gate.eligibilityReadinessPct < 85 ? "high" : "medium",
      { eligibilityReadinessPct: gate.eligibilityReadinessPct, blockerCount: gate.blockerCount, criticalBlockerCount: gate.criticalBlockerCount },
      "Review readiness percentage and blocker counts before binder acceptance.",
      gate.eligibilityReadinessPct >= 85 ? null : "Increase eligibility readiness through metadata-only evidence closure before binder packaging.",
    ),
    section(
      "critical_blockers_absent",
      "No critical eligibility blockers remain open",
      gate.criticalBlockerCount > 0 ? "fail" : gate.blockerCount > 0 ? "warning" : "pass",
      gate.criticalBlockerCount > 0 ? "critical" : "high",
      { blockerCount: gate.blockerCount, criticalBlockerCount: gate.criticalBlockerCount, warningCount: gate.warningCount },
      "Inspect blocker summary and keep unresolved blockers outside future shadow review.",
      gate.criticalBlockerCount > 0 ? "Close critical blockers before review binder is marked ready." : null,
    ),
    section(
      "evidence_confidence_acceptable",
      "Evidence confidence is acceptable for human review binder packaging",
      gate.evidenceConfidence === "high" ? "pass" : gate.evidenceConfidence === "medium" ? "warning" : "fail",
      gate.evidenceConfidence === "low" ? "high" : "medium",
      { evidenceConfidence: gate.evidenceConfidence },
      "Confirm evidence confidence and request more evidence when confidence is low.",
      gate.evidenceConfidence === "low" ? "Collect stronger metadata-only evidence before packaging a binder." : null,
    ),
    section(
      "traceability_chain_complete",
      "Traceability chain links validation, review queue, evidence pack, matrix, signoff, and eligibility gate",
      traceabilityComplete ? "pass" : "fail",
      "critical",
      {
        evidenceClosureSignoffPackId: gate.evidenceClosureSignoffPackId,
        evidenceGapClosureMatrixId: gate.evidenceGapClosureMatrixId,
        evidenceReviewPackId: gate.evidenceReviewPackId,
        queueItemId: gate.queueItemId,
        validationResultId: gate.validationResultId,
        artifactId: gate.artifactId,
        artifactHash: gate.artifactHash,
      },
      "Verify the binder can be traced back to every metadata-only evidence layer.",
      traceabilityComplete ? null : "Restore missing metadata references before binder creation.",
    ),
    section(
      "future_shadow_scope_only",
      "Binder scope is future-shadow-review-only and cannot become runtime promotion",
      snapshot.eligibilityScope === "future_shadow_review_only"
        && snapshot.futureShadowOnly === true
        && snapshot.productionDeploymentAllowed === false
        && snapshot.automaticApprovalAllowed === false
        ? "pass"
        : "fail",
      "critical",
      {
        eligibilityScope: snapshot.eligibilityScope,
        futureShadowOnly: snapshot.futureShadowOnly,
        productionDeploymentAllowed: snapshot.productionDeploymentAllowed,
        automaticApprovalAllowed: snapshot.automaticApprovalAllowed,
      },
      "Confirm the binder language remains limited to future shadow review only.",
      snapshot.eligibilityScope === "future_shadow_review_only" ? null : "Block binder packaging when scope is not future-shadow-review-only.",
    ),
    section(
      "safety_gate_disabled",
      "Execution, activation, inference, runtime invocation, business mutation, deletion, and purge stay disabled",
      allSafetyFlagsDisabled(gate) ? "pass" : "fail",
      "critical",
      gate.safety as unknown as Record<string, unknown>,
      "Confirm every safety flag remains disabled before publishing the review binder metadata.",
      allSafetyFlagsDisabled(gate) ? null : "Block binder packaging while any safety flag is enabled.",
    ),
  ];
};

const binderReadinessPct = (sections: OfflineArtifactValidationFutureShadowEligibilityReviewBinderSection[]): number => {
  if (sections.length === 0) return 0;
  const score = sections.reduce((sum, row) => {
    if (row.status === "pass") return sum + 1;
    if (row.status === "warning") return sum + 0.5;
    return sum;
  }, 0);
  return Math.max(0, Math.min(100, Math.round((score / sections.length) * 100)));
};

const statusFromBinderSections = (
  sections: OfflineArtifactValidationFutureShadowEligibilityReviewBinderSection[],
  gate: OfflineArtifactValidationFutureShadowEligibilityGateRecord,
): OfflineArtifactValidationFutureShadowEligibilityReviewBinderStatus => {
  if (!allSafetyFlagsDisabled(gate)) return "binder_safety_blocked";
  if (gate.eligibilityDecision === "reject_recommended" || gate.gateStatus === "rejected_for_artifact_trust") return "binder_rejected_for_artifact_trust";
  const hasCriticalFail = sections.some((row) => row.status === "fail" && row.priority === "critical");
  const hasFail = sections.some((row) => row.status === "fail");
  if (hasCriticalFail) return "binder_blocked_by_eligibility_gate";
  if (hasFail || gate.gateStatus === "not_ready_needs_more_evidence") return "binder_needs_eligibility_closure";
  return "binder_ready_for_future_shadow_review";
};

const decisionFromBinderStatus = (
  status: OfflineArtifactValidationFutureShadowEligibilityReviewBinderStatus,
  gate: OfflineArtifactValidationFutureShadowEligibilityGateRecord,
): OfflineArtifactValidationFutureShadowEligibilityReviewBinderDecision => {
  if (status === "binder_ready_for_future_shadow_review") return "ready_for_future_shadow_review_binder";
  if (status === "binder_rejected_for_artifact_trust" || gate.eligibilityDecision === "reject_recommended") return "reject_recommended";
  if (gate.eligibilityDecision === "quarantine_recommended") return "quarantine_recommended";
  if (status === "binder_needs_eligibility_closure") return "needs_eligibility_closure";
  return "blocked_by_eligibility_gate";
};

const recommendedActionFromBinder = (
  status: OfflineArtifactValidationFutureShadowEligibilityReviewBinderStatus,
  sections: OfflineArtifactValidationFutureShadowEligibilityReviewBinderSection[],
): string => {
  const firstBlocker = sections.find((row) => row.status === "fail" && row.blockerReason);
  if (firstBlocker?.blockerReason) return firstBlocker.blockerReason;
  if (status === "binder_ready_for_future_shadow_review") return "Use this binder only as metadata for a future human shadow-review discussion; do not execute, activate, infer, deploy, or mutate business records.";
  if (status === "binder_safety_blocked") return "Keep binder blocked until all safety flags are disabled.";
  if (status === "binder_rejected_for_artifact_trust") return "Keep artifact rejected or quarantined for trust reasons; do not package for future shadow review.";
  if (status === "binder_blocked_by_eligibility_gate") return "Resolve eligibility gate blockers before review binder is marked ready.";
  return "Close eligibility/evidence gaps through metadata-only review before binder packaging.";
};

export const buildOfflineArtifactValidationFutureShadowEligibilityReviewBinderSnapshot = (
  gate: OfflineArtifactValidationFutureShadowEligibilityGateRecord,
  binderSections: OfflineArtifactValidationFutureShadowEligibilityReviewBinderSection[],
  binderStatus: OfflineArtifactValidationFutureShadowEligibilityReviewBinderStatus,
  binderDecision: OfflineArtifactValidationFutureShadowEligibilityReviewBinderDecision,
): OfflineArtifactValidationFutureShadowEligibilityReviewBinderSnapshot => ({
  phase: PHASE_LABEL,
  eligibilityGate: gate,
  binderSections,
  binderStatus,
  binderDecision,
  binderScope: binderStatus === "binder_ready_for_future_shadow_review" ? "future_shadow_review_binder_only" : "not_applicable",
  binderReadinessPct: binderReadinessPct(binderSections),
  sectionCount: binderSections.length,
  passedSectionCount: binderSections.filter((row) => row.status === "pass").length,
  warningSectionCount: binderSections.filter((row) => row.status === "warning").length,
  failedSectionCount: binderSections.filter((row) => row.status === "fail").length,
  evidenceConfidence: gate.evidenceConfidence,
  eligibilityDecision: gate.eligibilityDecision,
  gateStatus: gate.gateStatus,
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

export const createOfflineArtifactValidationFutureShadowEligibilityReviewBinder = async (
  input: OfflineArtifactValidationFutureShadowEligibilityReviewBinderCreateInput,
): Promise<OfflineArtifactValidationFutureShadowEligibilityReviewBinderRecord | null> => {
  const gate = await getOfflineArtifactValidationFutureShadowEligibilityGateById(input.futureShadowEligibilityGateId);
  if (!gate) return null;
  const binderSections = buildOfflineArtifactValidationFutureShadowEligibilityReviewBinderSections(gate);
  const readiness = binderReadinessPct(binderSections);
  const binderStatus = statusFromBinderSections(binderSections, gate);
  const binderDecision = decisionFromBinderStatus(binderStatus, gate);
  const safety = buildOfflineArtifactValidationSafetyGate();
  const snapshot = buildOfflineArtifactValidationFutureShadowEligibilityReviewBinderSnapshot(gate, binderSections, binderStatus, binderDecision);
  const signedFutureShadowEligibilityReviewBinderHash = computeArtifactEnvelopeSha256({
    phase: PHASE_LABEL,
    futureShadowEligibilityGateId: gate.id,
    evidenceClosureSignoffPackId: gate.evidenceClosureSignoffPackId,
    evidenceGapClosureMatrixId: gate.evidenceGapClosureMatrixId,
    evidenceReviewPackId: gate.evidenceReviewPackId,
    queueItemId: gate.queueItemId,
    validationResultId: gate.validationResultId,
    artifactId: gate.artifactId,
    artifactHash: gate.artifactHash,
    binderStatus,
    binderDecision,
    binderReadinessPct: readiness,
    binderSections: binderSections.map((row) => ({ key: row.key, status: row.status, priority: row.priority })),
    safety,
    metadataOnly: true,
    advisoryOnly: true,
    futureShadowOnly: true,
    artifactBytesIncluded: false,
    modelOutputIncluded: false,
    automaticApprovalAllowed: false,
    productionDeploymentAllowed: false,
  });
  return recordOfflineArtifactValidationFutureShadowEligibilityReviewBinder({
    futureShadowEligibilityGateId: gate.id,
    evidenceClosureSignoffPackId: gate.evidenceClosureSignoffPackId,
    evidenceGapClosureMatrixId: gate.evidenceGapClosureMatrixId,
    evidenceReviewPackId: gate.evidenceReviewPackId,
    queueItemId: gate.queueItemId,
    validationResultId: gate.validationResultId,
    artifactId: gate.artifactId,
    artifactHash: gate.artifactHash,
    binderStatus,
    binderDecision,
    binderReadinessPct: readiness,
    sectionCount: binderSections.length,
    passedSectionCount: binderSections.filter((row) => row.status === "pass").length,
    warningSectionCount: binderSections.filter((row) => row.status === "warning").length,
    failedSectionCount: binderSections.filter((row) => row.status === "fail").length,
    evidenceConfidence: gate.evidenceConfidence,
    eligibilityDecision: gate.eligibilityDecision,
    gateStatus: gate.gateStatus,
    recommendedBinderAction: recommendedActionFromBinder(binderStatus, binderSections),
    binderSnapshot: snapshot,
    signedFutureShadowEligibilityReviewBinderHash,
    safety,
    createdByUserId: input.createdByUserId ?? null,
  });
};

export const bootstrapOfflineArtifactValidationFutureShadowEligibilityReviewBinderFromLatestGate = async (payload: {
  createdByUserId?: string | number | null;
} = {}): Promise<OfflineArtifactValidationFutureShadowEligibilityReviewBinderRecord | null> => {
  const [latestGate] = await listOfflineArtifactValidationFutureShadowEligibilityGates(1);
  if (!latestGate) return null;
  return createOfflineArtifactValidationFutureShadowEligibilityReviewBinder({
    futureShadowEligibilityGateId: latestGate.id,
    createdByUserId: payload.createdByUserId ?? null,
  });
};

export const createLatestOfflineArtifactValidationFutureShadowEligibilityReviewBinderForSignoffPack = async (payload: {
  evidenceClosureSignoffPackId: string | number;
  createdByUserId?: string | number | null;
}): Promise<OfflineArtifactValidationFutureShadowEligibilityReviewBinderRecord | null> => {
  const latestGate = await getLatestOfflineArtifactValidationFutureShadowEligibilityGateForSignoffPack(payload.evidenceClosureSignoffPackId);
  if (!latestGate) return null;
  return createOfflineArtifactValidationFutureShadowEligibilityReviewBinder({
    futureShadowEligibilityGateId: latestGate.id,
    createdByUserId: payload.createdByUserId ?? null,
  });
};

export const getOfflineArtifactValidationFutureShadowEligibilityReviewBinder = getOfflineArtifactValidationFutureShadowEligibilityReviewBinderById;
export const listOfflineArtifactValidationFutureShadowEligibilityReviewBinderRecords = listOfflineArtifactValidationFutureShadowEligibilityReviewBinders;
export const getLatestOfflineArtifactValidationFutureShadowEligibilityReviewBinder = getLatestOfflineArtifactValidationFutureShadowEligibilityReviewBinderForEligibilityGate;
export const buildOfflineArtifactValidationFutureShadowEligibilityReviewBinderSummary = getOfflineArtifactValidationFutureShadowEligibilityReviewBinderSummary;
export const OFFLINE_ARTIFACT_VALIDATION_FUTURE_SHADOW_ELIGIBILITY_REVIEW_BINDER_PHASE = PHASE_LABEL;
