import { createHash } from "node:crypto";
import {
  getLatestMlCandidatePackageArchiveRetentionReviewBinder,
  listMlCandidatePackageArchiveRetentionReviewSignoffs,
  recordMlCandidatePackageArchiveRetentionReviewSignoff,
} from "../../db/domains/mlDatasets.db";
import type {
  CandidatePackageArchiveRetentionReviewSignoffRecommendation,
  CandidatePackageArchiveRetentionReviewSignoffStatus,
  InventoryStockoutCandidatePackageArchiveRetentionReviewSignoffContract,
  InventoryStockoutCandidatePackageArchiveRetentionReviewSignoffGate,
  InventoryStockoutCandidatePackageArchiveRetentionReviewSignoffResponse,
  InventoryStockoutCandidatePackageArchiveRetentionReviewSignoffSummary,
  MlCandidatePackageArchiveRetentionReviewSignoffCatalogSummary,
} from "./datasetTypes";

const RETENTION_REVIEW_SIGNOFF_KEY = "inventory_stockout_candidate_package_archive_retention_review_signoff_gate_v1" as const;
const RETENTION_REVIEW_SIGNOFF_VERSION = "v1" as const;
const RETENTION_REVIEW_BINDER_KEY = "inventory_stockout_candidate_package_archive_retention_review_binder_v1" as const;
const RETENTION_REVIEW_BINDER_VERSION = "v1" as const;
const PACKAGE_KEY = "inventory_stockout_offline_candidate_model_package_v1" as const;
const PACKAGE_VERSION = "v1" as const;
const PHASE = "Phase 8F" as const;

const retentionReviewHumanSignoffRequired = true as const;
const retentionReviewSignoffIsProductionApproval = false as const;
const retentionReviewSignoffCanLoadArchiveBytes = false as const;
const retentionReviewSignoffCanLoadPackageBytes = false as const;
const retentionReviewSignoffCanPersistArtifactBytes = false as const;
const retentionReviewSignoffCanExecuteModel = false as const;
const retentionReviewSignoffCanInvokeRuntime = false as const;
const retentionReviewSignoffCanExposeInferenceEndpoint = false as const;
const retentionReviewSignoffCanActivateArtifact = false as const;
const retentionReviewSignoffCanDeployArtifact = false as const;
const retentionReviewSignoffCanProductionScore = false as const;
const retentionReviewSignoffCanScheduleRetentionJobs = false as const;
const retentionReviewSignoffCanDeleteOrPurge = false as const;
const retentionReviewSignoffMetadataOnly = true as const;
const retentionPolicyLocked = true as const;
const retentionExecutionAllowed = false as const;
const automaticDeletionAllowed = false as const;
const purgeJobAllowed = false as const;
const modelExecutionAllowed = false as const;
const runtimeInvocationAllowed = false as const;
const inferenceEndpointExposed = false as const;
const artifactActivationAllowed = false as const;
const artifactBytesLoadingAllowed = false as const;
const productionIntegrationAllowed = false as const;
const decisionAutomationAllowed = false as const;
const canChangeInventoryOrAccounting = false as const;
const canChangePricing = false as const;
const canChangeReports = false as const;
const canChangeLedger = false as const;

const asNumber = (value: unknown): number | null => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const asString = (value: unknown): string | null => {
  const text = String(value ?? "").trim();
  return text || null;
};

const sha256 = (value: unknown): string => createHash("sha256").update(JSON.stringify(value)).digest("hex");

const buildGate = (
  key: string,
  label: string,
  status: InventoryStockoutCandidatePackageArchiveRetentionReviewSignoffGate["status"],
  value: unknown,
  message: string,
): InventoryStockoutCandidatePackageArchiveRetentionReviewSignoffGate => ({ key, label, status, value, message });

const uniqueMessages = (
  gates: InventoryStockoutCandidatePackageArchiveRetentionReviewSignoffGate[],
  status: InventoryStockoutCandidatePackageArchiveRetentionReviewSignoffGate["status"],
) => Array.from(new Set(gates.filter((gate) => gate.status === status).map((gate) => gate.message)));

const chooseRecommendation = (
  status: CandidatePackageArchiveRetentionReviewSignoffStatus,
): CandidatePackageArchiveRetentionReviewSignoffRecommendation => {
  if (status === "retention_review_signoff_ready") return "record_metadata_only_archive_retention_review_signoff";
  if (status === "needs_phase8e_retention_review_binder") return "record_phase8e_retention_review_binder_first";
  if (status === "needs_signed_retention_review_binder_hash") return "restore_signed_retention_review_binder_hash_traceability";
  if (status === "needs_retention_review_signoff_evidence") return "collect_retention_review_signoff_evidence_first";
  return "resolve_safety_blocks_first";
};

const getSignoffEvidence = (options: Record<string, unknown>): Record<string, unknown> | null => {
  const candidates = [
    options.retentionReviewSignoffEvidence,
    options.retentionReviewSignoffEvidenceJson,
    options.humanReviewEvidence,
    options.reviewEvidenceJson,
    options.signoffEvidence,
  ];
  const match = candidates.find((value) => value && typeof value === "object" && !Array.isArray(value));
  return match ? match as Record<string, unknown> : null;
};

const hasRetentionReviewSignoffEvidence = (value: Record<string, unknown> | null): boolean => {
  if (!value) return false;
  const reviewer = asString(value.reviewerName || value.reviewer || value.reviewerRole || value.signoffReviewer);
  const decision = asString(value.reviewDecision || value.signoffDecision || value.decision || value.retentionReviewDecision);
  const checklist = value.reviewChecklist || value.signoffChecklist || value.checklist || value.requiredChecks;
  const checklistReady = Array.isArray(checklist) ? checklist.length > 0 : Boolean(checklist && typeof checklist === "object");
  return Boolean(reviewer && decision && checklistReady);
};

export const buildInventoryStockoutCandidatePackageArchiveRetentionReviewSignoffContract = (): InventoryStockoutCandidatePackageArchiveRetentionReviewSignoffContract => ({
  contractKey: RETENTION_REVIEW_SIGNOFF_KEY,
  contractVersion: RETENTION_REVIEW_SIGNOFF_VERSION,
  generatedAt: new Date().toISOString(),
  phase: PHASE,
  purpose: "Record a metadata-only human signoff gate for the Phase 8E archive retention review binder without scheduling retention jobs, deleting, purging, loading archive/package/artifact bytes, executing models, invoking runtimes, exposing inference, activating/deploying artifacts, production scoring, or mutating business records.",
  signoffScope: "offline_candidate_package_archive_retention_review_signoff_metadata_only",
  requiredUpstreamRetentionReviewBinderKey: RETENTION_REVIEW_BINDER_KEY,
  requiredUpstreamRetentionReviewBinderVersion: RETENTION_REVIEW_BINDER_VERSION,
  requiredUpstreamEvidence: [
    "Persisted Phase 8E candidate package archive retention review binder row",
    "Phase 8E retention_review_status is retention_review_binder_ready",
    "Signed Phase 8E retention review binder hash for immutable signoff traceability",
    "Phase 8E retention policy remains locked and metadata-only",
  ],
  requiredRetentionReviewSignoffEvidence: [
    "Human reviewer identity or role for retention review signoff",
    "Human decision for metadata-only retention review signoff gate",
    "Human checklist confirming no retention job, delete, purge, loading, execution, inference, activation, deployment, production scoring, or business mutation is enabled",
    "Explicit acknowledgement that Phase 8F signoff is not production approval and does not authorize retention execution",
  ],
  includedSignoffSections: [
    "candidate-package-archive-retention-review-signoff-packet.json",
    "candidate-package-archive-retention-review-signoff-payload.json",
    "candidate-package-archive-retention-review-signoff-policy.json",
    "candidate-package-archive-retention-review-signoff-safety-policy.json",
    "candidate-package-archive-retention-review-signoff-summary.json",
  ],
  forbiddenBehavior: [
    "Do not schedule retention jobs in Phase 8F.",
    "Do not delete, purge, overwrite, or mutate archive/package/artifact records.",
    "Do not load archive bytes, package bytes, or artifact bytes.",
    "Do not execute, invoke, train, activate, deploy, or production-score any model artifact.",
    "Do not add /infer, /execute, /activate, /deploy, or /production-score routes.",
    "Do not treat this retention review signoff as production approval or retention execution approval.",
    "Do not mutate inventory, accounting, ledger, pricing, reports, or business records.",
  ],
  operationalPolicy: {
    retentionReviewHumanSignoffRequired,
    retentionReviewSignoffIsProductionApproval,
    retentionReviewSignoffCanLoadArchiveBytes,
    retentionReviewSignoffCanLoadPackageBytes,
    retentionReviewSignoffCanPersistArtifactBytes,
    retentionReviewSignoffCanExecuteModel,
    retentionReviewSignoffCanInvokeRuntime,
    retentionReviewSignoffCanExposeInferenceEndpoint,
    retentionReviewSignoffCanActivateArtifact,
    retentionReviewSignoffCanDeployArtifact,
    retentionReviewSignoffCanProductionScore,
    retentionReviewSignoffCanScheduleRetentionJobs,
    retentionReviewSignoffCanDeleteOrPurge,
    retentionReviewSignoffMetadataOnly,
    retentionPolicyLocked,
    retentionExecutionAllowed,
    automaticDeletionAllowed,
    purgeJobAllowed,
    modelExecutionAllowed,
    runtimeInvocationAllowed,
    inferenceEndpointExposed,
    artifactActivationAllowed,
    artifactBytesLoadingAllowed,
    productionIntegrationAllowed,
    decisionAutomationAllowed,
    canChangeInventoryOrAccounting,
    canChangePricing,
    canChangeReports,
    canChangeLedger,
  },
});

export const buildInventoryStockoutCandidatePackageArchiveRetentionReviewSignoff = async (
  options: Record<string, unknown> = {},
): Promise<InventoryStockoutCandidatePackageArchiveRetentionReviewSignoffResponse> => {
  const generatedAt = new Date().toISOString();
  const contract = buildInventoryStockoutCandidatePackageArchiveRetentionReviewSignoffContract();
  const latestRetentionReviewBinder = await getLatestMlCandidatePackageArchiveRetentionReviewBinder().catch(() => null) as Record<string, unknown> | null;
  const retentionReviewBinderId = asNumber(latestRetentionReviewBinder?.id);
  const retentionReviewStatus = asString(latestRetentionReviewBinder?.retentionReviewStatus);
  const signedRetentionReviewBinderHash = asString(latestRetentionReviewBinder?.signedRetentionReviewBinderHash);
  const persistedRetentionReviewBinderExists = Boolean(retentionReviewBinderId);
  const upstreamRetentionReviewBinderReady = retentionReviewStatus === "retention_review_binder_ready";
  const retentionReviewSignoffEvidence = getSignoffEvidence(options);
  const retentionReviewSignoffEvidenceProvided = hasRetentionReviewSignoffEvidence(retentionReviewSignoffEvidence);

  const safetyPolicyStillDisabled =
    retentionReviewHumanSignoffRequired === true &&
    retentionReviewSignoffIsProductionApproval === false &&
    retentionReviewSignoffCanLoadArchiveBytes === false &&
    retentionReviewSignoffCanLoadPackageBytes === false &&
    retentionReviewSignoffCanPersistArtifactBytes === false &&
    retentionReviewSignoffCanExecuteModel === false &&
    retentionReviewSignoffCanInvokeRuntime === false &&
    retentionReviewSignoffCanExposeInferenceEndpoint === false &&
    retentionReviewSignoffCanActivateArtifact === false &&
    retentionReviewSignoffCanDeployArtifact === false &&
    retentionReviewSignoffCanProductionScore === false &&
    retentionReviewSignoffCanScheduleRetentionJobs === false &&
    retentionReviewSignoffCanDeleteOrPurge === false &&
    retentionReviewSignoffMetadataOnly === true &&
    retentionPolicyLocked === true &&
    retentionExecutionAllowed === false &&
    automaticDeletionAllowed === false &&
    purgeJobAllowed === false &&
    modelExecutionAllowed === false &&
    runtimeInvocationAllowed === false &&
    inferenceEndpointExposed === false &&
    artifactActivationAllowed === false &&
    artifactBytesLoadingAllowed === false &&
    productionIntegrationAllowed === false &&
    decisionAutomationAllowed === false &&
    canChangeInventoryOrAccounting === false &&
    canChangePricing === false &&
    canChangeReports === false &&
    canChangeLedger === false;

  const retentionReviewSignoffPolicy = {
    policyKey: "candidate_package_archive_retention_review_signoff_policy_v1",
    policyVersion: "v1",
    generatedAt,
    retentionReviewSignoffMode: "metadata_human_signoff_reference_only",
    retentionReviewHumanSignoffRequired,
    retentionReviewSignoffIsProductionApproval,
    retentionPolicyLocked,
    retentionExecutionAllowed,
    retentionJobSchedulingAllowed: retentionReviewSignoffCanScheduleRetentionJobs,
    automaticDeletionAllowed,
    purgeJobAllowed,
    notes: [
      "Phase 8F records retention review signoff metadata only.",
      "No archive bytes, package bytes, or artifact bytes are loaded.",
      "No retention job, delete, purge, or record mutation is enabled.",
      "This signoff does not approve production inference or retention execution.",
    ],
  };

  const gates: InventoryStockoutCandidatePackageArchiveRetentionReviewSignoffGate[] = [
    buildGate("persisted_phase8e_retention_review_binder_exists", "Persisted Phase 8E Retention Review Binder", persistedRetentionReviewBinderExists ? "pass" : "block", retentionReviewBinderId, persistedRetentionReviewBinderExists ? "A persisted Phase 8E archive retention review binder metadata row exists." : "Record a Phase 8E archive retention review binder before building the Phase 8F signoff gate."),
    buildGate("phase8e_retention_review_binder_ready", "Phase 8E Retention Review Binder Ready", upstreamRetentionReviewBinderReady ? "pass" : "block", retentionReviewStatus, upstreamRetentionReviewBinderReady ? "Phase 8E retention review binder is retention_review_binder_ready." : "Phase 8E retention review binder must be retention_review_binder_ready before retention review signoff."),
    buildGate("signed_retention_review_binder_hash_present", "Signed Retention Review Binder Hash", signedRetentionReviewBinderHash ? "pass" : "block", signedRetentionReviewBinderHash, signedRetentionReviewBinderHash ? "Signed Phase 8E retention review binder hash is available for signoff traceability." : "Signed Phase 8E retention review binder hash is required before Phase 8F signoff recording."),
    buildGate("retention_review_signoff_evidence_present", "Retention Review Signoff Evidence", retentionReviewSignoffEvidenceProvided ? "pass" : "block", retentionReviewSignoffEvidenceProvided, retentionReviewSignoffEvidenceProvided ? "Human retention review signoff evidence is present." : "Human reviewer, decision, and checklist evidence are required before Phase 8F signoff recording."),
    buildGate("retention_execution_disabled", "Retention Execution Disabled", retentionExecutionAllowed === false && automaticDeletionAllowed === false && purgeJobAllowed === false ? "pass" : "block", { retentionExecutionAllowed, automaticDeletionAllowed, purgeJobAllowed }, "Retention execution, automatic deletion, and purge jobs remain disabled."),
    buildGate("retention_review_signoff_safety_policy_disabled", "Retention Review Signoff Safety Policy", safetyPolicyStillDisabled ? "pass" : "block", safetyPolicyStillDisabled, safetyPolicyStillDisabled ? "Retention review signoff safety policy keeps archive/package loading, execution, inference, activation, deployment, production scoring, retention jobs, delete/purge, and business mutation disabled." : "Retention review signoff safety policy changed and must be blocked."),
  ];

  let status: CandidatePackageArchiveRetentionReviewSignoffStatus = "retention_review_signoff_ready";
  if (!safetyPolicyStillDisabled) status = "safety_blocked";
  else if (!persistedRetentionReviewBinderExists || !upstreamRetentionReviewBinderReady) status = "needs_phase8e_retention_review_binder";
  else if (!signedRetentionReviewBinderHash) status = "needs_signed_retention_review_binder_hash";
  else if (!retentionReviewSignoffEvidenceProvided) status = "needs_retention_review_signoff_evidence";

  const blockers = uniqueMessages(gates, "block");
  const warnings = uniqueMessages(gates, "warning");
  const passCount = gates.filter((gate) => gate.status === "pass").length;
  const totalGateCount = gates.length;
  const readinessScorePct = totalGateCount > 0 ? Math.round((passCount / totalGateCount) * 10000) / 100 : 0;
  const recommendation = chooseRecommendation(status);

  const safetyPolicy = {
    phase: PHASE,
    retentionReviewHumanSignoffRequired,
    retentionReviewSignoffIsProductionApproval,
    retentionReviewSignoffCanLoadArchiveBytes,
    retentionReviewSignoffCanLoadPackageBytes,
    retentionReviewSignoffCanPersistArtifactBytes,
    retentionReviewSignoffCanExecuteModel,
    retentionReviewSignoffCanInvokeRuntime,
    retentionReviewSignoffCanExposeInferenceEndpoint,
    retentionReviewSignoffCanActivateArtifact,
    retentionReviewSignoffCanDeployArtifact,
    retentionReviewSignoffCanProductionScore,
    retentionReviewSignoffCanScheduleRetentionJobs,
    retentionReviewSignoffCanDeleteOrPurge,
    retentionReviewSignoffMetadataOnly,
    retentionPolicyLocked,
    retentionExecutionAllowed,
    automaticDeletionAllowed,
    purgeJobAllowed,
    modelExecutionAllowed,
    runtimeInvocationAllowed,
    inferenceEndpointExposed,
    artifactActivationAllowed,
    artifactBytesLoadingAllowed,
    productionIntegrationAllowed,
    decisionAutomationAllowed,
    canChangeInventoryOrAccounting,
    canChangePricing,
    canChangeReports,
    canChangeLedger,
  };

  const summary: InventoryStockoutCandidatePackageArchiveRetentionReviewSignoffSummary = {
    retentionReviewSignoffKey: RETENTION_REVIEW_SIGNOFF_KEY,
    retentionReviewSignoffVersion: RETENTION_REVIEW_SIGNOFF_VERSION,
    generatedAt,
    phase: PHASE,
    status,
    recommendation,
    readinessScorePct,
    retentionReviewBinderId,
    retentionReviewBinderKey: RETENTION_REVIEW_BINDER_KEY,
    retentionReviewBinderVersion: RETENTION_REVIEW_BINDER_VERSION,
    retentionReviewStatus,
    signedRetentionReviewBinderHash,
    archivePackId: asNumber(latestRetentionReviewBinder?.archivePackId),
    archivePackKey: asString(latestRetentionReviewBinder?.archivePackKey),
    archivePackVersion: asString(latestRetentionReviewBinder?.archivePackVersion),
    signedArchiveHash: asString(latestRetentionReviewBinder?.signedArchiveHash),
    signoffId: asNumber(latestRetentionReviewBinder?.signoffId),
    signoffKey: asString(latestRetentionReviewBinder?.signoffKey),
    signoffVersion: asString(latestRetentionReviewBinder?.signoffVersion),
    signedReviewHash: asString(latestRetentionReviewBinder?.signedReviewHash),
    packageId: asNumber(latestRetentionReviewBinder?.packageId),
    packageKey: PACKAGE_KEY,
    packageVersion: PACKAGE_VERSION,
    retentionReviewSignoffMode: "metadata_only_archive_retention_review_signoff_gate",
    retentionReviewHumanSignoffRequired,
    retentionReviewSignoffEvidenceProvided,
    retentionReviewSignoffIsProductionApproval,
    retentionReviewSignoffCanLoadArchiveBytes,
    retentionReviewSignoffCanLoadPackageBytes,
    retentionReviewSignoffCanPersistArtifactBytes,
    retentionReviewSignoffCanExecuteModel,
    retentionReviewSignoffCanInvokeRuntime,
    retentionReviewSignoffCanExposeInferenceEndpoint,
    retentionReviewSignoffCanActivateArtifact,
    retentionReviewSignoffCanDeployArtifact,
    retentionReviewSignoffCanProductionScore,
    retentionReviewSignoffCanScheduleRetentionJobs,
    retentionReviewSignoffCanDeleteOrPurge,
    retentionReviewSignoffMetadataOnly,
    retentionPolicyLocked,
    retentionExecutionAllowed,
    automaticDeletionAllowed,
    purgeJobAllowed,
    modelExecutionAllowed,
    runtimeInvocationAllowed,
    inferenceEndpointExposed,
    artifactActivationAllowed,
    artifactBytesLoadingAllowed,
    productionIntegrationAllowed,
    decisionAutomationAllowed,
    canChangeInventoryOrAccounting,
    canChangePricing,
    canChangeReports,
    canChangeLedger,
    blockerCount: blockers.length,
    warningCount: warnings.length,
    passCount,
    totalGateCount,
    blockers,
    warnings,
    signedRetentionReviewSignoffHash: null,
    recommendedNextAction: status === "retention_review_signoff_ready"
      ? "Phase 8F retention review signoff آماده ثبت metadata-only است؛ retention job/delete/purge/load/execute/infer/activate/deploy/production-score/mutation ندارد."
      : blockers[0] || "برای آماده‌شدن Phase 8F، Phase 8E retention review binder و human signoff evidence را کامل کنید.",
  };

  const signoffPacket = {
    phase: PHASE,
    retentionReviewSignoffKey: RETENTION_REVIEW_SIGNOFF_KEY,
    retentionReviewSignoffVersion: RETENTION_REVIEW_SIGNOFF_VERSION,
    generatedAt,
    upstreamRetentionReviewBinder: {
      retentionReviewBinderId,
      retentionReviewBinderKey: RETENTION_REVIEW_BINDER_KEY,
      retentionReviewBinderVersion: RETENTION_REVIEW_BINDER_VERSION,
      retentionReviewStatus,
      signedRetentionReviewBinderHash,
    },
    traceability: {
      archivePackId: summary.archivePackId,
      archivePackKey: summary.archivePackKey,
      archivePackVersion: summary.archivePackVersion,
      signedArchiveHash: summary.signedArchiveHash,
      signoffId: summary.signoffId,
      signoffKey: summary.signoffKey,
      signoffVersion: summary.signoffVersion,
      signedReviewHash: summary.signedReviewHash,
      packageId: summary.packageId,
      packageKey: summary.packageKey,
      packageVersion: summary.packageVersion,
    },
    gates,
    retentionReviewSignoffPolicy,
    safetyPolicy,
  };
  const signoffPayload = {
    phase: PHASE,
    generatedAt,
    retentionReviewSignoffEvidence: retentionReviewSignoffEvidence || null,
    signoffPacketHash: sha256(signoffPacket),
    summary,
  };
  const signedRetentionReviewSignoffHash = sha256(signoffPayload);
  summary.signedRetentionReviewSignoffHash = signedRetentionReviewSignoffHash;

  return {
    success: true,
    contract,
    summary,
    gates,
    signoffPacket,
    signoffPayload,
    retentionReviewSignoffPolicy,
    safetyPolicy,
  };
};

export const prepareInventoryStockoutCandidatePackageArchiveRetentionReviewSignoff = async (
  options: Record<string, unknown> = {},
): Promise<InventoryStockoutCandidatePackageArchiveRetentionReviewSignoffResponse> => {
  const signoff = await buildInventoryStockoutCandidatePackageArchiveRetentionReviewSignoff(options);
  if (signoff.summary.status !== "retention_review_signoff_ready") return signoff;

  const signoffRecord = await recordMlCandidatePackageArchiveRetentionReviewSignoff({
    retentionReviewBinderId: signoff.summary.retentionReviewBinderId,
    retentionReviewBinderKey: signoff.summary.retentionReviewBinderKey,
    retentionReviewBinderVersion: signoff.summary.retentionReviewBinderVersion,
    retentionReviewStatus: signoff.summary.retentionReviewStatus,
    signedRetentionReviewBinderHash: signoff.summary.signedRetentionReviewBinderHash || "",
    archivePackId: signoff.summary.archivePackId,
    archivePackKey: signoff.summary.archivePackKey,
    archivePackVersion: signoff.summary.archivePackVersion,
    signedArchiveHash: signoff.summary.signedArchiveHash,
    signoffId: signoff.summary.signoffId,
    signoffKey: signoff.summary.signoffKey,
    signoffVersion: signoff.summary.signoffVersion,
    signedReviewHash: signoff.summary.signedReviewHash,
    packageId: signoff.summary.packageId,
    packageKey: signoff.summary.packageKey,
    packageVersion: signoff.summary.packageVersion,
    retentionReviewSignoffKey: signoff.summary.retentionReviewSignoffKey,
    retentionReviewSignoffVersion: signoff.summary.retentionReviewSignoffVersion,
    retentionReviewSignoffStatus: signoff.summary.status,
    readinessScorePct: signoff.summary.readinessScorePct,
    signoffPacket: signoff.signoffPacket,
    signoffPayload: signoff.signoffPayload,
    retentionReviewSignoffPolicy: signoff.retentionReviewSignoffPolicy,
    safetyPolicy: signoff.safetyPolicy,
    summary: signoff.summary as unknown as Record<string, unknown>,
    signedRetentionReviewSignoffHash: signoff.summary.signedRetentionReviewSignoffHash || sha256(signoff.signoffPayload),
    retentionReviewHumanSignoffRequired: signoff.summary.retentionReviewHumanSignoffRequired,
    retentionReviewSignoffEvidenceProvided: signoff.summary.retentionReviewSignoffEvidenceProvided,
    retentionReviewSignoffIsProductionApproval: signoff.summary.retentionReviewSignoffIsProductionApproval,
    retentionReviewSignoffCanLoadArchiveBytes: signoff.summary.retentionReviewSignoffCanLoadArchiveBytes,
    retentionReviewSignoffCanLoadPackageBytes: signoff.summary.retentionReviewSignoffCanLoadPackageBytes,
    retentionReviewSignoffCanPersistArtifactBytes: signoff.summary.retentionReviewSignoffCanPersistArtifactBytes,
    retentionReviewSignoffCanExecuteModel: signoff.summary.retentionReviewSignoffCanExecuteModel,
    retentionReviewSignoffCanInvokeRuntime: signoff.summary.retentionReviewSignoffCanInvokeRuntime,
    retentionReviewSignoffCanExposeInferenceEndpoint: signoff.summary.retentionReviewSignoffCanExposeInferenceEndpoint,
    retentionReviewSignoffCanActivateArtifact: signoff.summary.retentionReviewSignoffCanActivateArtifact,
    retentionReviewSignoffCanDeployArtifact: signoff.summary.retentionReviewSignoffCanDeployArtifact,
    retentionReviewSignoffCanProductionScore: signoff.summary.retentionReviewSignoffCanProductionScore,
    retentionReviewSignoffCanScheduleRetentionJobs: signoff.summary.retentionReviewSignoffCanScheduleRetentionJobs,
    retentionReviewSignoffCanDeleteOrPurge: signoff.summary.retentionReviewSignoffCanDeleteOrPurge,
    retentionReviewSignoffMetadataOnly: signoff.summary.retentionReviewSignoffMetadataOnly,
    retentionPolicyLocked: signoff.summary.retentionPolicyLocked,
    retentionExecutionAllowed: signoff.summary.retentionExecutionAllowed,
    automaticDeletionAllowed: signoff.summary.automaticDeletionAllowed,
    purgeJobAllowed: signoff.summary.purgeJobAllowed,
    modelExecutionAllowed: signoff.summary.modelExecutionAllowed,
    runtimeInvocationAllowed: signoff.summary.runtimeInvocationAllowed,
    inferenceEndpointExposed: signoff.summary.inferenceEndpointExposed,
    artifactActivationAllowed: signoff.summary.artifactActivationAllowed,
    artifactBytesLoadingAllowed: signoff.summary.artifactBytesLoadingAllowed,
    productionIntegrationAllowed: signoff.summary.productionIntegrationAllowed,
    decisionAutomationAllowed: signoff.summary.decisionAutomationAllowed,
    inventoryAccountingChangeAllowed: signoff.summary.canChangeInventoryOrAccounting,
    pricingChangeAllowed: signoff.summary.canChangePricing,
    reportsChangeAllowed: signoff.summary.canChangeReports,
    ledgerChangeAllowed: signoff.summary.canChangeLedger,
    userId: asNumber(options.userId),
  });

  return {
    ...signoff,
    signoffRecord,
  };
};

export const buildMlCandidatePackageArchiveRetentionReviewSignoffCatalogSummary = async (): Promise<MlCandidatePackageArchiveRetentionReviewSignoffCatalogSummary> => {
  const [currentCandidatePackageArchiveRetentionReviewSignoff, lastCandidatePackageArchiveRetentionReviewSignoffs] = await Promise.all([
    buildInventoryStockoutCandidatePackageArchiveRetentionReviewSignoff().then((result) => result.summary),
    listMlCandidatePackageArchiveRetentionReviewSignoffs(10).catch(() => []),
  ]);
  return {
    generatedAt: new Date().toISOString(),
    contract: buildInventoryStockoutCandidatePackageArchiveRetentionReviewSignoffContract(),
    currentCandidatePackageArchiveRetentionReviewSignoff,
    lastCandidatePackageArchiveRetentionReviewSignoffs,
    recommendedNextAction: currentCandidatePackageArchiveRetentionReviewSignoff.recommendedNextAction,
  };
};

/* Phase 8F guard anchors: inventory_stockout_candidate_package_archive_retention_review_signoff_gate_v1, buildInventoryStockoutCandidatePackageArchiveRetentionReviewSignoffContract, buildInventoryStockoutCandidatePackageArchiveRetentionReviewSignoff, prepareInventoryStockoutCandidatePackageArchiveRetentionReviewSignoff, metadata_only_archive_retention_review_signoff_gate */
