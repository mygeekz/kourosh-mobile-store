import { createHash } from "node:crypto";
import {
  getLatestMlCandidatePackageHumanSignoffArchivePack,
  listMlCandidatePackageArchiveRetentionReviewBinders,
  recordMlCandidatePackageArchiveRetentionReviewBinder,
} from "../../db/domains/mlDatasets.db";
import type {
  CandidatePackageArchiveRetentionReviewBinderRecommendation,
  CandidatePackageArchiveRetentionReviewBinderStatus,
  InventoryStockoutCandidatePackageArchiveRetentionReviewBinderContract,
  InventoryStockoutCandidatePackageArchiveRetentionReviewBinderGate,
  InventoryStockoutCandidatePackageArchiveRetentionReviewBinderResponse,
  InventoryStockoutCandidatePackageArchiveRetentionReviewBinderSummary,
  MlCandidatePackageArchiveRetentionReviewBinderCatalogSummary,
} from "./datasetTypes";

const RETENTION_REVIEW_BINDER_KEY = "inventory_stockout_candidate_package_archive_retention_review_binder_v1" as const;
const RETENTION_REVIEW_BINDER_VERSION = "v1" as const;
const ARCHIVE_PACK_KEY = "inventory_stockout_candidate_package_human_signoff_archive_pack_v1" as const;
const ARCHIVE_PACK_VERSION = "v1" as const;
const PACKAGE_KEY = "inventory_stockout_offline_candidate_model_package_v1" as const;
const PACKAGE_VERSION = "v1" as const;
const PHASE = "Phase 8E" as const;

const retentionReviewBinderIsProductionApproval = false as const;
const retentionReviewBinderCanLoadArchiveBytes = false as const;
const retentionReviewBinderCanLoadPackageBytes = false as const;
const retentionReviewBinderCanPersistArtifactBytes = false as const;
const retentionReviewBinderCanExecuteModel = false as const;
const retentionReviewBinderCanInvokeRuntime = false as const;
const retentionReviewBinderCanExposeInferenceEndpoint = false as const;
const retentionReviewBinderCanActivateArtifact = false as const;
const retentionReviewBinderCanDeployArtifact = false as const;
const retentionReviewBinderCanProductionScore = false as const;
const retentionReviewBinderCanScheduleRetentionJobs = false as const;
const retentionReviewBinderCanDeleteOrPurge = false as const;
const retentionReviewBinderMetadataOnly = true as const;
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
  status: InventoryStockoutCandidatePackageArchiveRetentionReviewBinderGate["status"],
  value: unknown,
  message: string,
): InventoryStockoutCandidatePackageArchiveRetentionReviewBinderGate => ({ key, label, status, value, message });

const uniqueMessages = (
  gates: InventoryStockoutCandidatePackageArchiveRetentionReviewBinderGate[],
  status: InventoryStockoutCandidatePackageArchiveRetentionReviewBinderGate["status"],
) => Array.from(new Set(gates.filter((gate) => gate.status === status).map((gate) => gate.message)));

const chooseRecommendation = (
  status: CandidatePackageArchiveRetentionReviewBinderStatus,
): CandidatePackageArchiveRetentionReviewBinderRecommendation => {
  if (status === "retention_review_binder_ready") return "record_metadata_only_archive_retention_review_binder";
  if (status === "needs_phase8d_archive_pack") return "record_phase8d_human_signoff_archive_pack_first";
  if (status === "needs_signed_archive_hash") return "restore_signed_archive_hash_traceability";
  return "resolve_safety_blocks_first";
};

export const buildInventoryStockoutCandidatePackageArchiveRetentionReviewBinderContract = (): InventoryStockoutCandidatePackageArchiveRetentionReviewBinderContract => ({
  contractKey: RETENTION_REVIEW_BINDER_KEY,
  contractVersion: RETENTION_REVIEW_BINDER_VERSION,
  generatedAt: new Date().toISOString(),
  phase: PHASE,
  purpose: "Create a metadata-only retention review binder for the Phase 8D human signoff archive pack without scheduling retention jobs, deleting, purging, loading package/archive bytes, executing models, invoking runtimes, exposing inference, activating/deploying artifacts, production scoring, or mutating business records.",
  binderScope: "offline_candidate_package_archive_retention_review_metadata_only",
  requiredUpstreamArchivePackKey: ARCHIVE_PACK_KEY,
  requiredUpstreamArchivePackVersion: ARCHIVE_PACK_VERSION,
  requiredUpstreamEvidence: [
    "Persisted Phase 8D candidate package human signoff archive pack row",
    "Phase 8D archive_status is archive_pack_ready",
    "Signed Phase 8D archive hash for immutable retention review traceability",
    "Phase 8D retention policy remains locked and metadata-only",
  ],
  includedBinderSections: [
    "candidate-package-archive-retention-review-binder.json",
    "candidate-package-archive-retention-review-policy.json",
    "candidate-package-archive-retention-review-safety-policy.json",
    "candidate-package-archive-retention-review-summary.json",
  ],
  forbiddenBehavior: [
    "Do not schedule retention jobs in Phase 8E.",
    "Do not delete, purge, overwrite, or mutate archive/package/artifact records.",
    "Do not load archive bytes, package bytes, or artifact bytes.",
    "Do not execute, invoke, train, activate, deploy, or production-score any model artifact.",
    "Do not add /infer, /execute, /activate, /deploy, or /production-score routes.",
    "Do not mutate inventory, accounting, ledger, pricing, reports, or business records.",
  ],
  operationalPolicy: {
    retentionReviewBinderIsProductionApproval,
    retentionReviewBinderCanLoadArchiveBytes,
    retentionReviewBinderCanLoadPackageBytes,
    retentionReviewBinderCanPersistArtifactBytes,
    retentionReviewBinderCanExecuteModel,
    retentionReviewBinderCanInvokeRuntime,
    retentionReviewBinderCanExposeInferenceEndpoint,
    retentionReviewBinderCanActivateArtifact,
    retentionReviewBinderCanDeployArtifact,
    retentionReviewBinderCanProductionScore,
    retentionReviewBinderCanScheduleRetentionJobs,
    retentionReviewBinderCanDeleteOrPurge,
    retentionReviewBinderMetadataOnly,
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

export const buildInventoryStockoutCandidatePackageArchiveRetentionReviewBinder = async (
  _options: Record<string, unknown> = {},
): Promise<InventoryStockoutCandidatePackageArchiveRetentionReviewBinderResponse> => {
  const generatedAt = new Date().toISOString();
  const contract = buildInventoryStockoutCandidatePackageArchiveRetentionReviewBinderContract();
  const latestArchivePack = await getLatestMlCandidatePackageHumanSignoffArchivePack().catch(() => null) as Record<string, unknown> | null;
  const archivePackId = asNumber(latestArchivePack?.id);
  const archiveStatus = asString(latestArchivePack?.archiveStatus);
  const signedArchiveHash = asString(latestArchivePack?.signedArchiveHash);
  const persistedArchivePackExists = Boolean(archivePackId);
  const upstreamArchivePackReady = archiveStatus === "archive_pack_ready";

  const safetyPolicyStillDisabled =
    retentionReviewBinderIsProductionApproval === false &&
    retentionReviewBinderCanLoadArchiveBytes === false &&
    retentionReviewBinderCanLoadPackageBytes === false &&
    retentionReviewBinderCanPersistArtifactBytes === false &&
    retentionReviewBinderCanExecuteModel === false &&
    retentionReviewBinderCanInvokeRuntime === false &&
    retentionReviewBinderCanExposeInferenceEndpoint === false &&
    retentionReviewBinderCanActivateArtifact === false &&
    retentionReviewBinderCanDeployArtifact === false &&
    retentionReviewBinderCanProductionScore === false &&
    retentionReviewBinderCanScheduleRetentionJobs === false &&
    retentionReviewBinderCanDeleteOrPurge === false &&
    retentionReviewBinderMetadataOnly === true &&
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

  const retentionReviewPolicy = {
    policyKey: "candidate_package_archive_retention_review_policy_v1",
    policyVersion: "v1",
    generatedAt,
    retentionReviewMode: "metadata_review_reference_only",
    retentionPolicyLocked,
    retentionExecutionAllowed,
    retentionJobSchedulingAllowed: retentionReviewBinderCanScheduleRetentionJobs,
    automaticDeletionAllowed,
    purgeJobAllowed,
    notes: [
      "Phase 8E records retention review binder metadata only.",
      "No archive bytes, package bytes, or artifact bytes are loaded.",
      "No retention job, delete, purge, or record mutation is enabled.",
    ],
  };

  const gates: InventoryStockoutCandidatePackageArchiveRetentionReviewBinderGate[] = [
    buildGate("persisted_phase8d_archive_pack_exists", "Persisted Phase 8D Archive Pack", persistedArchivePackExists ? "pass" : "block", archivePackId, persistedArchivePackExists ? "A persisted Phase 8D human signoff archive pack metadata row exists." : "Record a Phase 8D human signoff archive pack before building the Phase 8E retention review binder."),
    buildGate("phase8d_archive_pack_ready", "Phase 8D Archive Pack Ready", upstreamArchivePackReady ? "pass" : "block", archiveStatus, upstreamArchivePackReady ? "Phase 8D archive pack is archive_pack_ready." : "Phase 8D archive pack must be archive_pack_ready before retention review binding."),
    buildGate("signed_archive_hash_present", "Signed Archive Hash", signedArchiveHash ? "pass" : "block", signedArchiveHash, signedArchiveHash ? "Signed Phase 8D archive hash is available for retention review traceability." : "Signed Phase 8D archive hash is required before retention review binder recording."),
    buildGate("retention_execution_disabled", "Retention Execution Disabled", retentionExecutionAllowed === false && automaticDeletionAllowed === false && purgeJobAllowed === false ? "pass" : "block", { retentionExecutionAllowed, automaticDeletionAllowed, purgeJobAllowed }, "Retention execution, automatic deletion, and purge jobs remain disabled."),
    buildGate("retention_review_safety_policy_disabled", "Retention Review Safety Policy", safetyPolicyStillDisabled ? "pass" : "block", safetyPolicyStillDisabled, safetyPolicyStillDisabled ? "Retention review binder safety policy keeps package/archive loading, execution, inference, activation, deployment, production scoring, retention jobs, delete/purge, and business mutation disabled." : "Retention review binder safety policy changed and must be blocked."),
  ];

  let status: CandidatePackageArchiveRetentionReviewBinderStatus = "retention_review_binder_ready";
  if (!safetyPolicyStillDisabled) status = "safety_blocked";
  else if (!persistedArchivePackExists || !upstreamArchivePackReady) status = "needs_phase8d_archive_pack";
  else if (!signedArchiveHash) status = "needs_signed_archive_hash";

  const blockers = uniqueMessages(gates, "block");
  const warnings = uniqueMessages(gates, "warning");
  const passCount = gates.filter((gate) => gate.status === "pass").length;
  const totalGateCount = gates.length;
  const readinessScorePct = totalGateCount > 0 ? Math.round((passCount / totalGateCount) * 10000) / 100 : 0;
  const recommendation = chooseRecommendation(status);

  const safetyPolicy = {
    phase: PHASE,
    retentionReviewBinderIsProductionApproval,
    retentionReviewBinderCanLoadArchiveBytes,
    retentionReviewBinderCanLoadPackageBytes,
    retentionReviewBinderCanPersistArtifactBytes,
    retentionReviewBinderCanExecuteModel,
    retentionReviewBinderCanInvokeRuntime,
    retentionReviewBinderCanExposeInferenceEndpoint,
    retentionReviewBinderCanActivateArtifact,
    retentionReviewBinderCanDeployArtifact,
    retentionReviewBinderCanProductionScore,
    retentionReviewBinderCanScheduleRetentionJobs,
    retentionReviewBinderCanDeleteOrPurge,
    retentionReviewBinderMetadataOnly,
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

  const summary: InventoryStockoutCandidatePackageArchiveRetentionReviewBinderSummary = {
    retentionReviewBinderKey: RETENTION_REVIEW_BINDER_KEY,
    retentionReviewBinderVersion: RETENTION_REVIEW_BINDER_VERSION,
    generatedAt,
    phase: PHASE,
    status,
    recommendation,
    readinessScorePct,
    archivePackId,
    archivePackKey: ARCHIVE_PACK_KEY,
    archivePackVersion: ARCHIVE_PACK_VERSION,
    archiveStatus,
    signedArchiveHash,
    signoffId: asNumber(latestArchivePack?.signoffId),
    signoffKey: asString(latestArchivePack?.signoffKey),
    signoffVersion: asString(latestArchivePack?.signoffVersion),
    signedReviewHash: asString(latestArchivePack?.signedReviewHash),
    packageId: asNumber(latestArchivePack?.packageId),
    packageKey: PACKAGE_KEY,
    packageVersion: PACKAGE_VERSION,
    retentionReviewMode: "metadata_only_archive_retention_review_binder",
    retentionReviewBinderIsProductionApproval,
    retentionReviewBinderCanLoadArchiveBytes,
    retentionReviewBinderCanLoadPackageBytes,
    retentionReviewBinderCanPersistArtifactBytes,
    retentionReviewBinderCanExecuteModel,
    retentionReviewBinderCanInvokeRuntime,
    retentionReviewBinderCanExposeInferenceEndpoint,
    retentionReviewBinderCanActivateArtifact,
    retentionReviewBinderCanDeployArtifact,
    retentionReviewBinderCanProductionScore,
    retentionReviewBinderCanScheduleRetentionJobs,
    retentionReviewBinderCanDeleteOrPurge,
    retentionReviewBinderMetadataOnly,
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
    signedRetentionReviewBinderHash: null,
    recommendedNextAction: status === "retention_review_binder_ready"
      ? "Phase 8E retention review binder آماده ثبت metadata-only است؛ retention job/delete/purge/load/execute/infer/activate/deploy/production-score/mutation ندارد."
      : blockers[0] || "برای آماده‌شدن Phase 8E، Phase 8D archive pack و signed archive hash را کامل کنید.",
  };

  const retentionReviewBinder = {
    phase: PHASE,
    retentionReviewBinderKey: RETENTION_REVIEW_BINDER_KEY,
    retentionReviewBinderVersion: RETENTION_REVIEW_BINDER_VERSION,
    generatedAt,
    upstreamArchivePack: {
      archivePackId,
      archivePackKey: ARCHIVE_PACK_KEY,
      archivePackVersion: ARCHIVE_PACK_VERSION,
      archiveStatus,
      signedArchiveHash,
    },
    traceability: {
      signoffId: summary.signoffId,
      signoffKey: summary.signoffKey,
      signoffVersion: summary.signoffVersion,
      signedReviewHash: summary.signedReviewHash,
      packageId: summary.packageId,
      packageKey: summary.packageKey,
      packageVersion: summary.packageVersion,
    },
    gates,
    retentionReviewPolicy,
    safetyPolicy,
  };
  const signedRetentionReviewBinderHash = sha256(retentionReviewBinder);
  summary.signedRetentionReviewBinderHash = signedRetentionReviewBinderHash;

  return {
    success: true,
    contract,
    summary,
    gates,
    retentionReviewBinder,
    retentionReviewPolicy,
    safetyPolicy,
  };
};

export const prepareInventoryStockoutCandidatePackageArchiveRetentionReviewBinder = async (
  options: Record<string, unknown> = {},
): Promise<InventoryStockoutCandidatePackageArchiveRetentionReviewBinderResponse> => {
  const binder = await buildInventoryStockoutCandidatePackageArchiveRetentionReviewBinder(options);
  if (binder.summary.status !== "retention_review_binder_ready") return binder;

  const binderRecord = await recordMlCandidatePackageArchiveRetentionReviewBinder({
    archivePackId: binder.summary.archivePackId,
    archivePackKey: binder.summary.archivePackKey,
    archivePackVersion: binder.summary.archivePackVersion,
    archiveStatus: binder.summary.archiveStatus,
    signedArchiveHash: binder.summary.signedArchiveHash || "",
    signoffId: binder.summary.signoffId,
    signoffKey: binder.summary.signoffKey,
    signoffVersion: binder.summary.signoffVersion,
    signedReviewHash: binder.summary.signedReviewHash,
    packageId: binder.summary.packageId,
    packageKey: binder.summary.packageKey,
    packageVersion: binder.summary.packageVersion,
    retentionReviewBinderKey: binder.summary.retentionReviewBinderKey,
    retentionReviewBinderVersion: binder.summary.retentionReviewBinderVersion,
    retentionReviewStatus: binder.summary.status,
    readinessScorePct: binder.summary.readinessScorePct,
    retentionReviewBinder: binder.retentionReviewBinder,
    retentionReviewPolicy: binder.retentionReviewPolicy,
    safetyPolicy: binder.safetyPolicy,
    summary: binder.summary as unknown as Record<string, unknown>,
    signedRetentionReviewBinderHash: binder.summary.signedRetentionReviewBinderHash || sha256(binder.retentionReviewBinder),
    retentionReviewBinderIsProductionApproval: binder.summary.retentionReviewBinderIsProductionApproval,
    retentionReviewBinderCanLoadArchiveBytes: binder.summary.retentionReviewBinderCanLoadArchiveBytes,
    retentionReviewBinderCanLoadPackageBytes: binder.summary.retentionReviewBinderCanLoadPackageBytes,
    retentionReviewBinderCanPersistArtifactBytes: binder.summary.retentionReviewBinderCanPersistArtifactBytes,
    retentionReviewBinderCanExecuteModel: binder.summary.retentionReviewBinderCanExecuteModel,
    retentionReviewBinderCanInvokeRuntime: binder.summary.retentionReviewBinderCanInvokeRuntime,
    retentionReviewBinderCanExposeInferenceEndpoint: binder.summary.retentionReviewBinderCanExposeInferenceEndpoint,
    retentionReviewBinderCanActivateArtifact: binder.summary.retentionReviewBinderCanActivateArtifact,
    retentionReviewBinderCanDeployArtifact: binder.summary.retentionReviewBinderCanDeployArtifact,
    retentionReviewBinderCanProductionScore: binder.summary.retentionReviewBinderCanProductionScore,
    retentionReviewBinderCanScheduleRetentionJobs: binder.summary.retentionReviewBinderCanScheduleRetentionJobs,
    retentionReviewBinderCanDeleteOrPurge: binder.summary.retentionReviewBinderCanDeleteOrPurge,
    retentionReviewBinderMetadataOnly: binder.summary.retentionReviewBinderMetadataOnly,
    retentionPolicyLocked: binder.summary.retentionPolicyLocked,
    retentionExecutionAllowed: binder.summary.retentionExecutionAllowed,
    automaticDeletionAllowed: binder.summary.automaticDeletionAllowed,
    purgeJobAllowed: binder.summary.purgeJobAllowed,
    modelExecutionAllowed: binder.summary.modelExecutionAllowed,
    runtimeInvocationAllowed: binder.summary.runtimeInvocationAllowed,
    inferenceEndpointExposed: binder.summary.inferenceEndpointExposed,
    artifactActivationAllowed: binder.summary.artifactActivationAllowed,
    artifactBytesLoadingAllowed: binder.summary.artifactBytesLoadingAllowed,
    productionIntegrationAllowed: binder.summary.productionIntegrationAllowed,
    decisionAutomationAllowed: binder.summary.decisionAutomationAllowed,
    inventoryAccountingChangeAllowed: binder.summary.canChangeInventoryOrAccounting,
    pricingChangeAllowed: binder.summary.canChangePricing,
    reportsChangeAllowed: binder.summary.canChangeReports,
    ledgerChangeAllowed: binder.summary.canChangeLedger,
    userId: asNumber(options.userId),
  });

  return {
    ...binder,
    binderRecord,
  };
};

export const buildMlCandidatePackageArchiveRetentionReviewBinderCatalogSummary = async (): Promise<MlCandidatePackageArchiveRetentionReviewBinderCatalogSummary> => {
  const [currentCandidatePackageArchiveRetentionReviewBinder, lastCandidatePackageArchiveRetentionReviewBinders] = await Promise.all([
    buildInventoryStockoutCandidatePackageArchiveRetentionReviewBinder().then((result) => result.summary),
    listMlCandidatePackageArchiveRetentionReviewBinders(10).catch(() => []),
  ]);
  return {
    generatedAt: new Date().toISOString(),
    contract: buildInventoryStockoutCandidatePackageArchiveRetentionReviewBinderContract(),
    currentCandidatePackageArchiveRetentionReviewBinder,
    lastCandidatePackageArchiveRetentionReviewBinders,
    recommendedNextAction: currentCandidatePackageArchiveRetentionReviewBinder.recommendedNextAction,
  };
};

/* Phase 8E guard anchors: inventory_stockout_candidate_package_archive_retention_review_binder_v1, buildInventoryStockoutCandidatePackageArchiveRetentionReviewBinderContract, buildInventoryStockoutCandidatePackageArchiveRetentionReviewBinder, prepareInventoryStockoutCandidatePackageArchiveRetentionReviewBinder, metadata_only_archive_retention_review_binder */
