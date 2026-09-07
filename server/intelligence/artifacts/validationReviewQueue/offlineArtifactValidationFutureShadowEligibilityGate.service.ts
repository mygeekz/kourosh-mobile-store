import { computeArtifactEnvelopeSha256 } from "../artifactHashing";
import { buildOfflineArtifactValidationSafetyGate } from "../validation/offlineArtifactValidationRules";
import {
  getLatestOfflineArtifactValidationEvidenceClosureSignoffPackForEvidenceGapClosureMatrix,
  getOfflineArtifactValidationEvidenceClosureSignoffPackById,
  listOfflineArtifactValidationEvidenceClosureSignoffPacks,
} from "../../../db/domains/ml/mlOfflineArtifactValidationEvidenceClosureSignoffPack.db";
import {
  getLatestOfflineArtifactValidationFutureShadowEligibilityGateForSignoffPack,
  getOfflineArtifactValidationFutureShadowEligibilityGateById,
  getOfflineArtifactValidationFutureShadowEligibilityGateSummary,
  listOfflineArtifactValidationFutureShadowEligibilityGates,
  recordOfflineArtifactValidationFutureShadowEligibilityGate,
} from "../../../db/domains/ml/mlOfflineArtifactValidationFutureShadowEligibilityGate.db";
import type { OfflineArtifactValidationEvidenceClosureSignoffPackRecord } from "./offlineArtifactValidationEvidenceClosureSignoffPackTypes";
import type { OfflineArtifactValidationReviewPriority } from "./offlineArtifactValidationReviewQueueTypes";
import type {
  OfflineArtifactValidationFutureShadowEligibilityCheck,
  OfflineArtifactValidationFutureShadowEligibilityDecision,
  OfflineArtifactValidationFutureShadowEligibilityGateCreateInput,
  OfflineArtifactValidationFutureShadowEligibilityGateRecord,
  OfflineArtifactValidationFutureShadowEligibilityGateSnapshot,
  OfflineArtifactValidationFutureShadowEligibilityGateStatus,
} from "./offlineArtifactValidationFutureShadowEligibilityGateTypes";

const PHASE_LABEL = "Phase 7G — Offline Artifact Future Shadow Eligibility Readiness Gate" as const;

const check = (
  key: string,
  label: string,
  status: OfflineArtifactValidationFutureShadowEligibilityCheck["status"],
  priority: OfflineArtifactValidationReviewPriority,
  evidence: Record<string, unknown>,
  blockerReason: string | null,
): OfflineArtifactValidationFutureShadowEligibilityCheck => ({
  key,
  label,
  status,
  priority,
  evidence,
  blockerReason,
  advisoryOnly: true,
  futureShadowOnly: true,
  executionAllowed: false,
  activationAllowed: false,
  inferenceAllowed: false,
  businessMutationAllowed: false,
  productionDeploymentAllowed: false,
  automaticApprovalAllowed: false,
});

const allSafetyFlagsDisabled = (signoffPack: OfflineArtifactValidationEvidenceClosureSignoffPackRecord): boolean => (
  signoffPack.safety.modelExecutionAllowed === false
  && signoffPack.safety.runtimeInvocationAllowed === false
  && signoffPack.safety.artifactExecutionAllowed === false
  && signoffPack.safety.artifactActivationAllowed === false
  && signoffPack.safety.artifactBytesLoadingAllowed === false
  && signoffPack.safety.inferenceEndpointExposed === false
  && signoffPack.safety.productionIntegrationAllowed === false
  && signoffPack.safety.decisionAutomationAllowed === false
  && signoffPack.safety.canMutateBusinessRecords === false
  && signoffPack.safety.automaticDeletionAllowed === false
  && signoffPack.safety.purgeJobAllowed === false
);

export const buildOfflineArtifactValidationFutureShadowEligibilityChecks = (
  signoffPack: OfflineArtifactValidationEvidenceClosureSignoffPackRecord,
): OfflineArtifactValidationFutureShadowEligibilityCheck[] => {
  const signedForShadowOnly = signoffPack.signoffPackStatus === "signed_for_future_shadow_only"
    && signoffPack.reviewerDecision === "accepted_for_future_shadow_only";
  const hasChecklistFailures = signoffPack.checklistFailCount > 0;
  const signoffSnapshot = signoffPack.signoffPackSnapshot;
  return [
    check(
      "reviewer_signed_future_shadow_only",
      "Human reviewer explicitly signed for future-shadow-only consideration",
      signedForShadowOnly ? "pass" : signoffPack.signoffPackStatus === "ready_for_human_signoff" ? "warning" : "fail",
      signoffPack.reviewerDecision === "reject_recommended" ? "critical" : "high",
      { signoffPackStatus: signoffPack.signoffPackStatus, reviewerDecision: signoffPack.reviewerDecision },
      signedForShadowOnly ? null : "Gate requires explicit human future-shadow-only signoff metadata; no automatic eligibility is allowed.",
    ),
    check(
      "signoff_checklist_has_no_failures",
      "Evidence closure signoff checklist has no failing items",
      hasChecklistFailures ? "fail" : signoffPack.checklistWarningCount > 0 ? "warning" : "pass",
      hasChecklistFailures ? "critical" : "medium",
      { checklistFailCount: signoffPack.checklistFailCount, checklistWarningCount: signoffPack.checklistWarningCount, checklistPassCount: signoffPack.checklistPassCount },
      hasChecklistFailures ? "Close signoff checklist failures before future shadow eligibility is marked ready." : null,
    ),
    check(
      "signoff_readiness_threshold_met",
      "Signoff readiness is high enough for future-shadow-only eligibility review",
      signoffPack.signoffReadinessPct >= 100 ? "pass" : signoffPack.signoffReadinessPct >= 85 ? "warning" : "fail",
      signoffPack.signoffReadinessPct < 85 ? "high" : "medium",
      { signoffReadinessPct: signoffPack.signoffReadinessPct },
      signoffPack.signoffReadinessPct >= 85 ? null : "Raise signoff readiness through metadata-only evidence closure before eligibility review.",
    ),
    check(
      "evidence_confidence_not_low",
      "Evidence confidence is not low",
      signoffPack.evidenceConfidence === "high" ? "pass" : signoffPack.evidenceConfidence === "medium" ? "warning" : "fail",
      signoffPack.evidenceConfidence === "low" ? "high" : "medium",
      { evidenceConfidence: signoffPack.evidenceConfidence },
      signoffPack.evidenceConfidence === "low" ? "Collect stronger metadata-only evidence before future shadow eligibility." : null,
    ),
    check(
      "future_shadow_scope_only",
      "Eligibility scope remains future-shadow-review-only",
      signoffSnapshot.signoffScope === "future_shadow_only" && signoffSnapshot.productionDeploymentAllowed === false && signoffSnapshot.automaticApprovalAllowed === false ? "pass" : "fail",
      "critical",
      { signoffScope: signoffSnapshot.signoffScope, productionDeploymentAllowed: signoffSnapshot.productionDeploymentAllowed, automaticApprovalAllowed: signoffSnapshot.automaticApprovalAllowed },
      signoffSnapshot.signoffScope === "future_shadow_only" ? null : "Block eligibility if scope is not explicitly limited to future shadow review only.",
    ),
    check(
      "safety_gate_disabled",
      "Execution, activation, inference, runtime invocation, business mutation, deletion, and purge stay disabled",
      allSafetyFlagsDisabled(signoffPack) ? "pass" : "fail",
      "critical",
      signoffPack.safety as unknown as Record<string, unknown>,
      allSafetyFlagsDisabled(signoffPack) ? null : "Block eligibility when any safety gate is enabled; this gate cannot promote artifacts to runtime.",
    ),
  ];
};

const eligibilityReadinessPct = (checks: OfflineArtifactValidationFutureShadowEligibilityCheck[]): number => {
  if (checks.length === 0) return 0;
  const score = checks.reduce((sum, row) => {
    if (row.status === "pass") return sum + 1;
    if (row.status === "warning") return sum + 0.5;
    return sum;
  }, 0);
  return Math.max(0, Math.min(100, Math.round((score / checks.length) * 100)));
};

const statusFromEligibilityChecks = (
  checks: OfflineArtifactValidationFutureShadowEligibilityCheck[],
  signoffPack: OfflineArtifactValidationEvidenceClosureSignoffPackRecord,
): OfflineArtifactValidationFutureShadowEligibilityGateStatus => {
  if (!allSafetyFlagsDisabled(signoffPack)) return "safety_gate_blocked";
  if (signoffPack.reviewerDecision === "reject_recommended" || signoffPack.signoffPackStatus === "rejected_for_artifact_trust") return "rejected_for_artifact_trust";
  const hasCriticalFail = checks.some((row) => row.status === "fail" && row.priority === "critical");
  const hasFail = checks.some((row) => row.status === "fail");
  if (hasCriticalFail) return "blocked_by_signoff";
  if (hasFail || signoffPack.signoffPackStatus === "needs_more_evidence") return "not_ready_needs_more_evidence";
  return "eligible_for_future_shadow_review";
};

const decisionFromGateStatus = (
  status: OfflineArtifactValidationFutureShadowEligibilityGateStatus,
  signoffPack: OfflineArtifactValidationEvidenceClosureSignoffPackRecord,
): OfflineArtifactValidationFutureShadowEligibilityDecision => {
  if (status === "eligible_for_future_shadow_review") return "eligible_for_future_shadow_review";
  if (status === "rejected_for_artifact_trust" || signoffPack.reviewerDecision === "reject_recommended") return "reject_recommended";
  if (signoffPack.reviewerDecision === "quarantine_recommended") return "quarantine_recommended";
  if (status === "not_ready_needs_more_evidence") return "needs_evidence_closure";
  return "not_eligible";
};

const recommendedActionFromEligibilityGate = (
  status: OfflineArtifactValidationFutureShadowEligibilityGateStatus,
  checks: OfflineArtifactValidationFutureShadowEligibilityCheck[],
): string => {
  const firstBlocker = checks.find((row) => row.status === "fail" && row.blockerReason);
  if (firstBlocker?.blockerReason) return firstBlocker.blockerReason;
  if (status === "eligible_for_future_shadow_review") return "Preserve as future-shadow-review-only eligibility metadata; do not execute, activate, infer, deploy, or mutate business records.";
  if (status === "safety_gate_blocked") return "Keep eligibility blocked until all safety flags are disabled.";
  if (status === "rejected_for_artifact_trust") return "Keep artifact rejected or quarantined for trust reasons; do not promote to future shadow review.";
  if (status === "blocked_by_signoff") return "Resolve human signoff blockers before future shadow eligibility is marked ready.";
  return "Collect metadata-only evidence and close signoff gaps before future shadow eligibility review.";
};

export const buildOfflineArtifactValidationFutureShadowEligibilityGateSnapshot = (
  signoffPack: OfflineArtifactValidationEvidenceClosureSignoffPackRecord,
  checks: OfflineArtifactValidationFutureShadowEligibilityCheck[],
  gateStatus: OfflineArtifactValidationFutureShadowEligibilityGateStatus,
  eligibilityDecision: OfflineArtifactValidationFutureShadowEligibilityDecision,
): OfflineArtifactValidationFutureShadowEligibilityGateSnapshot => ({
  phase: PHASE_LABEL,
  signoffPack,
  checks,
  gateStatus,
  eligibilityDecision,
  eligibilityScope: gateStatus === "eligible_for_future_shadow_review" ? "future_shadow_review_only" : "not_applicable",
  eligibilityReadinessPct: eligibilityReadinessPct(checks),
  blockerCount: checks.filter((row) => row.status === "fail").length,
  criticalBlockerCount: checks.filter((row) => row.status === "fail" && row.priority === "critical").length,
  warningCount: checks.filter((row) => row.status === "warning").length,
  evidenceConfidence: signoffPack.evidenceConfidence,
  reviewerDecision: signoffPack.reviewerDecision,
  signoffPackStatus: signoffPack.signoffPackStatus,
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

export const createOfflineArtifactValidationFutureShadowEligibilityGate = async (
  input: OfflineArtifactValidationFutureShadowEligibilityGateCreateInput,
): Promise<OfflineArtifactValidationFutureShadowEligibilityGateRecord | null> => {
  const signoffPack = await getOfflineArtifactValidationEvidenceClosureSignoffPackById(input.evidenceClosureSignoffPackId);
  if (!signoffPack) return null;
  const checks = buildOfflineArtifactValidationFutureShadowEligibilityChecks(signoffPack);
  const readiness = eligibilityReadinessPct(checks);
  const blockerCount = checks.filter((row) => row.status === "fail").length;
  const criticalBlockerCount = checks.filter((row) => row.status === "fail" && row.priority === "critical").length;
  const warningCount = checks.filter((row) => row.status === "warning").length;
  const gateStatus = statusFromEligibilityChecks(checks, signoffPack);
  const eligibilityDecision = decisionFromGateStatus(gateStatus, signoffPack);
  const safety = buildOfflineArtifactValidationSafetyGate();
  const snapshot = buildOfflineArtifactValidationFutureShadowEligibilityGateSnapshot(signoffPack, checks, gateStatus, eligibilityDecision);
  const signedFutureShadowEligibilityGateHash = computeArtifactEnvelopeSha256({
    phase: PHASE_LABEL,
    evidenceClosureSignoffPackId: signoffPack.id,
    evidenceGapClosureMatrixId: signoffPack.evidenceGapClosureMatrixId,
    evidenceReviewPackId: signoffPack.evidenceReviewPackId,
    queueItemId: signoffPack.queueItemId,
    validationResultId: signoffPack.validationResultId,
    artifactId: signoffPack.artifactId,
    artifactHash: signoffPack.artifactHash,
    gateStatus,
    eligibilityDecision,
    eligibilityReadinessPct: readiness,
    checks: checks.map((row) => ({ key: row.key, status: row.status, priority: row.priority })),
    safety,
    advisoryOnly: true,
    futureShadowOnly: true,
    artifactBytesIncluded: false,
    modelOutputIncluded: false,
    automaticApprovalAllowed: false,
    productionDeploymentAllowed: false,
  });
  return recordOfflineArtifactValidationFutureShadowEligibilityGate({
    evidenceClosureSignoffPackId: signoffPack.id,
    evidenceGapClosureMatrixId: signoffPack.evidenceGapClosureMatrixId,
    evidenceReviewPackId: signoffPack.evidenceReviewPackId,
    queueItemId: signoffPack.queueItemId,
    validationResultId: signoffPack.validationResultId,
    artifactId: signoffPack.artifactId,
    artifactHash: signoffPack.artifactHash,
    gateStatus,
    eligibilityDecision,
    eligibilityReadinessPct: readiness,
    blockerCount,
    criticalBlockerCount,
    warningCount,
    evidenceConfidence: signoffPack.evidenceConfidence,
    reviewerDecision: signoffPack.reviewerDecision,
    signoffPackStatus: signoffPack.signoffPackStatus,
    recommendedEligibilityAction: recommendedActionFromEligibilityGate(gateStatus, checks),
    eligibilityGateSnapshot: snapshot,
    signedFutureShadowEligibilityGateHash,
    safety,
    createdByUserId: input.createdByUserId ?? null,
  });
};

export const bootstrapOfflineArtifactValidationFutureShadowEligibilityGateFromLatestSignoffPack = async (payload: {
  createdByUserId?: string | number | null;
} = {}): Promise<OfflineArtifactValidationFutureShadowEligibilityGateRecord | null> => {
  const [latestSignoffPack] = await listOfflineArtifactValidationEvidenceClosureSignoffPacks(1);
  if (!latestSignoffPack) return null;
  return createOfflineArtifactValidationFutureShadowEligibilityGate({
    evidenceClosureSignoffPackId: latestSignoffPack.id,
    createdByUserId: payload.createdByUserId ?? null,
  });
};

export const createLatestOfflineArtifactValidationFutureShadowEligibilityGateForEvidenceGapClosureMatrix = async (payload: {
  evidenceGapClosureMatrixId: string | number;
  createdByUserId?: string | number | null;
}): Promise<OfflineArtifactValidationFutureShadowEligibilityGateRecord | null> => {
  const latestSignoffPack = await getLatestOfflineArtifactValidationEvidenceClosureSignoffPackForEvidenceGapClosureMatrix(payload.evidenceGapClosureMatrixId);
  if (!latestSignoffPack) return null;
  return createOfflineArtifactValidationFutureShadowEligibilityGate({
    evidenceClosureSignoffPackId: latestSignoffPack.id,
    createdByUserId: payload.createdByUserId ?? null,
  });
};

export const getOfflineArtifactValidationFutureShadowEligibilityGate = getOfflineArtifactValidationFutureShadowEligibilityGateById;
export const listOfflineArtifactValidationFutureShadowEligibilityGateRecords = listOfflineArtifactValidationFutureShadowEligibilityGates;
export const getLatestOfflineArtifactValidationFutureShadowEligibilityGate = getLatestOfflineArtifactValidationFutureShadowEligibilityGateForSignoffPack;
export const buildOfflineArtifactValidationFutureShadowEligibilityGateSummary = getOfflineArtifactValidationFutureShadowEligibilityGateSummary;
export const OFFLINE_ARTIFACT_VALIDATION_FUTURE_SHADOW_ELIGIBILITY_GATE_PHASE = PHASE_LABEL;
