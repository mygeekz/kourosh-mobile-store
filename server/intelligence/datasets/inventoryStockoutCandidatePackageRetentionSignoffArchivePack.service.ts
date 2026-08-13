import { createHash } from "node:crypto";
import {
  getLatestMlCandidatePackageArchiveRetentionReviewSignoff,
  listMlCandidatePackageRetentionSignoffArchivePacks,
  recordMlCandidatePackageRetentionSignoffArchivePack,
} from "../../db/domains/mlDatasets.db";
import type {
  CandidatePackageRetentionSignoffArchivePackRecommendation,
  CandidatePackageRetentionSignoffArchivePackStatus,
  InventoryStockoutCandidatePackageRetentionSignoffArchivePackContract,
  InventoryStockoutCandidatePackageRetentionSignoffArchivePackGate,
  InventoryStockoutCandidatePackageRetentionSignoffArchivePackResponse,
  InventoryStockoutCandidatePackageRetentionSignoffArchivePackSummary,
  MlCandidatePackageRetentionSignoffArchivePackCatalogSummary,
} from "./datasetTypes";

const RETENTION_SIGNOFF_ARCHIVE_PACK_KEY = "inventory_stockout_candidate_package_retention_signoff_archive_pack_v1" as const;
const RETENTION_SIGNOFF_ARCHIVE_PACK_VERSION = "v1" as const;
const RETENTION_REVIEW_SIGNOFF_KEY = "inventory_stockout_candidate_package_archive_retention_review_signoff_gate_v1" as const;
const RETENTION_REVIEW_SIGNOFF_VERSION = "v1" as const;
const PACKAGE_KEY = "inventory_stockout_offline_candidate_model_package_v1" as const;
const PACKAGE_VERSION = "v1" as const;
const PHASE = "Phase 8G" as const;

const retentionSignoffArchivePackIsProductionApproval = false as const;
const retentionSignoffArchivePackCanLoadArchiveBytes = false as const;
const retentionSignoffArchivePackCanLoadPackageBytes = false as const;
const retentionSignoffArchivePackCanPersistArtifactBytes = false as const;
const retentionSignoffArchivePackCanExecuteModel = false as const;
const retentionSignoffArchivePackCanInvokeRuntime = false as const;
const retentionSignoffArchivePackCanExposeInferenceEndpoint = false as const;
const retentionSignoffArchivePackCanActivateArtifact = false as const;
const retentionSignoffArchivePackCanDeployArtifact = false as const;
const retentionSignoffArchivePackCanProductionScore = false as const;
const retentionSignoffArchivePackCanScheduleRetentionJobs = false as const;
const retentionSignoffArchivePackCanDeleteOrPurge = false as const;
const retentionSignoffArchivePackMetadataOnly = true as const;
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
  status: InventoryStockoutCandidatePackageRetentionSignoffArchivePackGate["status"],
  value: unknown,
  message: string,
): InventoryStockoutCandidatePackageRetentionSignoffArchivePackGate => ({ key, label, status, value, message });

const uniqueMessages = (
  gates: InventoryStockoutCandidatePackageRetentionSignoffArchivePackGate[],
  status: InventoryStockoutCandidatePackageRetentionSignoffArchivePackGate["status"],
) => Array.from(new Set(gates.filter((gate) => gate.status === status).map((gate) => gate.message)));

const chooseRecommendation = (
  status: CandidatePackageRetentionSignoffArchivePackStatus,
): CandidatePackageRetentionSignoffArchivePackRecommendation => {
  if (status === "retention_signoff_archive_pack_ready") return "record_metadata_only_retention_signoff_archive_pack";
  if (status === "needs_phase8f_retention_review_signoff") return "record_phase8f_retention_review_signoff_first";
  if (status === "needs_signed_retention_review_signoff_hash") return "restore_signed_retention_review_signoff_hash_traceability";
  return "resolve_safety_blocks_first";
};

export const buildInventoryStockoutCandidatePackageRetentionSignoffArchivePackContract = (): InventoryStockoutCandidatePackageRetentionSignoffArchivePackContract => ({
  contractKey: RETENTION_SIGNOFF_ARCHIVE_PACK_KEY,
  contractVersion: RETENTION_SIGNOFF_ARCHIVE_PACK_VERSION,
  generatedAt: new Date().toISOString(),
  phase: PHASE,
  purpose: "Create a metadata-only archive pack for the Phase 8F archive retention review signoff without making the archive pack a production approval and without enabling retention jobs, delete, purge, archive/package loading, model execution, runtime invocation, inference, activation, deployment, production scoring, or business mutation.",
  archiveScope: "offline_candidate_package_retention_signoff_archive_metadata_only",
  requiredUpstreamRetentionReviewSignoffKey: RETENTION_REVIEW_SIGNOFF_KEY,
  requiredUpstreamRetentionReviewSignoffVersion: RETENTION_REVIEW_SIGNOFF_VERSION,
  requiredUpstreamEvidence: [
    "Persisted Phase 8F candidate package archive retention review signoff row",
    "Phase 8F retention_review_signoff_status is retention_review_signoff_ready",
    "Signed Phase 8F retention review signoff hash for immutable archive traceability",
    "Phase 8F safety policy confirms no retention execution, delete, purge, loading, runtime, inference, activation, deployment, production scoring, or business mutation",
  ],
  includedArchiveSections: [
    "candidate-package-retention-signoff-archive-pack.json",
    "candidate-package-retention-signoff-retention-policy.json",
    "candidate-package-retention-signoff-archive-safety-policy.json",
    "candidate-package-retention-signoff-archive-summary.json",
  ],
  forbiddenBehavior: [
    "Do not schedule retention jobs in Phase 8G.",
    "Do not delete, purge, overwrite, or mutate archive/package/artifact records.",
    "Do not load archive bytes, package bytes, or artifact bytes.",
    "Do not execute, invoke, train, activate, deploy, or production-score any model artifact.",
    "Do not add /infer, /execute, /activate, /deploy, or /production-score routes.",
    "Do not treat this retention signoff archive pack as production approval or retention execution approval.",
    "Do not mutate inventory, accounting, ledger, pricing, reports, or business records.",
  ],
  operationalPolicy: {
    retentionSignoffArchivePackIsProductionApproval,
    retentionSignoffArchivePackCanLoadArchiveBytes,
    retentionSignoffArchivePackCanLoadPackageBytes,
    retentionSignoffArchivePackCanPersistArtifactBytes,
    retentionSignoffArchivePackCanExecuteModel,
    retentionSignoffArchivePackCanInvokeRuntime,
    retentionSignoffArchivePackCanExposeInferenceEndpoint,
    retentionSignoffArchivePackCanActivateArtifact,
    retentionSignoffArchivePackCanDeployArtifact,
    retentionSignoffArchivePackCanProductionScore,
    retentionSignoffArchivePackCanScheduleRetentionJobs,
    retentionSignoffArchivePackCanDeleteOrPurge,
    retentionSignoffArchivePackMetadataOnly,
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

export const buildInventoryStockoutCandidatePackageRetentionSignoffArchivePack = async (
  _options: Record<string, unknown> = {},
): Promise<InventoryStockoutCandidatePackageRetentionSignoffArchivePackResponse> => {
  const generatedAt = new Date().toISOString();
  const contract = buildInventoryStockoutCandidatePackageRetentionSignoffArchivePackContract();
  const latestRetentionReviewSignoff = await getLatestMlCandidatePackageArchiveRetentionReviewSignoff().catch(() => null) as Record<string, unknown> | null;
  const retentionReviewSignoffId = asNumber(latestRetentionReviewSignoff?.id);
  const retentionReviewSignoffStatus = asString(latestRetentionReviewSignoff?.retentionReviewSignoffStatus);
  const signedRetentionReviewSignoffHash = asString(latestRetentionReviewSignoff?.signedRetentionReviewSignoffHash);
  const retentionReviewBinderId = asNumber(latestRetentionReviewSignoff?.retentionReviewBinderId);
  const signedRetentionReviewBinderHash = asString(latestRetentionReviewSignoff?.signedRetentionReviewBinderHash);
  const packageId = asNumber(latestRetentionReviewSignoff?.packageId);
  const persistedSignoffExists = Boolean(retentionReviewSignoffId);
  const upstreamSignoffReady = retentionReviewSignoffStatus === "retention_review_signoff_ready";

  const safetyPolicyStillDisabled =
    retentionSignoffArchivePackIsProductionApproval === false &&
    retentionSignoffArchivePackCanLoadArchiveBytes === false &&
    retentionSignoffArchivePackCanLoadPackageBytes === false &&
    retentionSignoffArchivePackCanPersistArtifactBytes === false &&
    retentionSignoffArchivePackCanExecuteModel === false &&
    retentionSignoffArchivePackCanInvokeRuntime === false &&
    retentionSignoffArchivePackCanExposeInferenceEndpoint === false &&
    retentionSignoffArchivePackCanActivateArtifact === false &&
    retentionSignoffArchivePackCanDeployArtifact === false &&
    retentionSignoffArchivePackCanProductionScore === false &&
    retentionSignoffArchivePackCanScheduleRetentionJobs === false &&
    retentionSignoffArchivePackCanDeleteOrPurge === false &&
    retentionSignoffArchivePackMetadataOnly === true &&
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

  const retentionPolicy = {
    policyKey: "candidate_package_retention_signoff_archive_retention_policy_v1",
    policyVersion: "v1",
    generatedAt,
    retentionMode: "metadata_archive_reference_only",
    retentionPolicyLocked,
    retentionExecutionAllowed,
    retentionJobSchedulingAllowed: retentionSignoffArchivePackCanScheduleRetentionJobs,
    automaticDeletionAllowed,
    purgeJobAllowed,
    notes: [
      "Phase 8G records archive metadata only.",
      "No archive, package, or artifact bytes are loaded or persisted.",
      "No delete, purge, or retention job execution is enabled.",
    ],
  };

  const gates: InventoryStockoutCandidatePackageRetentionSignoffArchivePackGate[] = [
    buildGate("persisted_phase8f_retention_review_signoff_exists", "Persisted Phase 8F Retention Review Signoff", persistedSignoffExists ? "pass" : "block", retentionReviewSignoffId, persistedSignoffExists ? "A persisted Phase 8F retention review signoff metadata row exists." : "Record a Phase 8F archive retention review signoff before building the Phase 8G archive pack."),
    buildGate("phase8f_retention_review_signoff_ready", "Phase 8F Retention Review Signoff Ready", upstreamSignoffReady ? "pass" : "block", retentionReviewSignoffStatus, upstreamSignoffReady ? "Phase 8F retention review signoff status is retention_review_signoff_ready." : "Phase 8F retention review signoff must be retention_review_signoff_ready before archival."),
    buildGate("signed_retention_review_signoff_hash_present", "Signed Retention Review Signoff Hash", signedRetentionReviewSignoffHash ? "pass" : "block", signedRetentionReviewSignoffHash, signedRetentionReviewSignoffHash ? "A signed Phase 8F retention review signoff hash is available for archive traceability." : "Restore signedRetentionReviewSignoffHash before building the Phase 8G archive pack."),
    buildGate("retention_policy_locked", "Retention Policy Locked", retentionPolicyLocked ? "pass" : "block", retentionPolicyLocked, retentionPolicyLocked ? "Retention policy remains locked and metadata-only." : "Retention policy must stay locked before archive packaging."),
    buildGate("safety_policy_disabled", "Safety Policy Disabled", safetyPolicyStillDisabled ? "pass" : "block", safetyPolicyStillDisabled, safetyPolicyStillDisabled ? "Execution, inference, activation, deploy, production scoring, retention jobs, delete/purge, loading, and business mutation remain disabled." : "A Phase 8G safety policy flag is not disabled."),
  ];

  let status: CandidatePackageRetentionSignoffArchivePackStatus = "retention_signoff_archive_pack_ready";
  if (!persistedSignoffExists || !upstreamSignoffReady) status = "needs_phase8f_retention_review_signoff";
  else if (!signedRetentionReviewSignoffHash) status = "needs_signed_retention_review_signoff_hash";
  else if (!safetyPolicyStillDisabled || !retentionPolicyLocked) status = "safety_blocked";

  const blockers = uniqueMessages(gates, "block");
  const warnings = uniqueMessages(gates, "warning");
  const passCount = gates.filter((gate) => gate.status === "pass").length;
  const readinessScorePct = Math.round((passCount / gates.length) * 100);
  const recommendation = chooseRecommendation(status);
  const signedRetentionSignoffArchiveHash = status === "retention_signoff_archive_pack_ready"
    ? sha256({
        key: RETENTION_SIGNOFF_ARCHIVE_PACK_KEY,
        version: RETENTION_SIGNOFF_ARCHIVE_PACK_VERSION,
        retentionReviewSignoffId,
        signedRetentionReviewSignoffHash,
        retentionPolicy,
        generatedAt,
      })
    : null;

  const safetyPolicy = {
    ...contract.operationalPolicy,
    generatedAt,
    forbiddenRoutes: ["/infer", "/execute", "/activate", "/deploy", "/production-score"],
    invoiceCancelReasonUntouched: true,
  };

  const summary: InventoryStockoutCandidatePackageRetentionSignoffArchivePackSummary = {
    retentionSignoffArchivePackKey: RETENTION_SIGNOFF_ARCHIVE_PACK_KEY,
    retentionSignoffArchivePackVersion: RETENTION_SIGNOFF_ARCHIVE_PACK_VERSION,
    generatedAt,
    phase: PHASE,
    status,
    recommendation,
    readinessScorePct,
    retentionReviewSignoffId,
    retentionReviewSignoffKey: RETENTION_REVIEW_SIGNOFF_KEY,
    retentionReviewSignoffVersion: RETENTION_REVIEW_SIGNOFF_VERSION,
    retentionReviewSignoffStatus,
    signedRetentionReviewSignoffHash,
    retentionReviewBinderId,
    signedRetentionReviewBinderHash,
    packageId,
    packageKey: PACKAGE_KEY,
    packageVersion: PACKAGE_VERSION,
    retentionSignoffArchiveMode: "metadata_only_retention_signoff_archive_pack",
    retentionSignoffArchivePackIsProductionApproval,
    retentionSignoffArchivePackCanLoadArchiveBytes,
    retentionSignoffArchivePackCanLoadPackageBytes,
    retentionSignoffArchivePackCanPersistArtifactBytes,
    retentionSignoffArchivePackCanExecuteModel,
    retentionSignoffArchivePackCanInvokeRuntime,
    retentionSignoffArchivePackCanExposeInferenceEndpoint,
    retentionSignoffArchivePackCanActivateArtifact,
    retentionSignoffArchivePackCanDeployArtifact,
    retentionSignoffArchivePackCanProductionScore,
    retentionSignoffArchivePackCanScheduleRetentionJobs,
    retentionSignoffArchivePackCanDeleteOrPurge,
    retentionSignoffArchivePackMetadataOnly,
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
    totalGateCount: gates.length,
    blockers,
    warnings,
    signedRetentionSignoffArchiveHash,
    recommendedNextAction: recommendation,
  };

  const archivePacket = {
    archivePackKey: RETENTION_SIGNOFF_ARCHIVE_PACK_KEY,
    archivePackVersion: RETENTION_SIGNOFF_ARCHIVE_PACK_VERSION,
    generatedAt,
    phase: PHASE,
    upstreamRetentionReviewSignoff: {
      retentionReviewSignoffId,
      retentionReviewSignoffKey: RETENTION_REVIEW_SIGNOFF_KEY,
      retentionReviewSignoffVersion: RETENTION_REVIEW_SIGNOFF_VERSION,
      retentionReviewSignoffStatus,
      signedRetentionReviewSignoffHash,
      retentionReviewBinderId,
      signedRetentionReviewBinderHash,
      packageId,
    },
    summary,
    retentionPolicy,
    safetyPolicy,
    archiveSections: contract.includedArchiveSections,
  };

  return {
    success: true,
    contract,
    summary,
    gates,
    archivePacket,
    retentionPolicy,
    safetyPolicy,
  };
};

export const prepareInventoryStockoutCandidatePackageRetentionSignoffArchivePack = async (
  options: Record<string, unknown> = {},
): Promise<InventoryStockoutCandidatePackageRetentionSignoffArchivePackResponse> => {
  const archivePack = await buildInventoryStockoutCandidatePackageRetentionSignoffArchivePack(options);
  if (archivePack.summary.status !== "retention_signoff_archive_pack_ready") return archivePack;

  const archiveRecord = await recordMlCandidatePackageRetentionSignoffArchivePack({
    retentionReviewSignoffId: archivePack.summary.retentionReviewSignoffId,
    retentionReviewSignoffKey: archivePack.summary.retentionReviewSignoffKey,
    retentionReviewSignoffVersion: archivePack.summary.retentionReviewSignoffVersion,
    retentionReviewSignoffStatus: archivePack.summary.retentionReviewSignoffStatus,
    signedRetentionReviewSignoffHash: archivePack.summary.signedRetentionReviewSignoffHash || "",
    retentionReviewBinderId: archivePack.summary.retentionReviewBinderId,
    signedRetentionReviewBinderHash: archivePack.summary.signedRetentionReviewBinderHash,
    packageId: archivePack.summary.packageId,
    packageKey: archivePack.summary.packageKey,
    packageVersion: archivePack.summary.packageVersion,
    retentionSignoffArchivePackKey: archivePack.summary.retentionSignoffArchivePackKey,
    retentionSignoffArchivePackVersion: archivePack.summary.retentionSignoffArchivePackVersion,
    archiveStatus: archivePack.summary.status,
    readinessScorePct: archivePack.summary.readinessScorePct,
    archivePacket: archivePack.archivePacket,
    retentionPolicy: archivePack.retentionPolicy,
    safetyPolicy: archivePack.safetyPolicy,
    summary: archivePack.summary,
    signedRetentionSignoffArchiveHash: archivePack.summary.signedRetentionSignoffArchiveHash || "",
    retentionSignoffArchivePackIsProductionApproval,
    retentionSignoffArchivePackCanLoadArchiveBytes,
    retentionSignoffArchivePackCanLoadPackageBytes,
    retentionSignoffArchivePackCanPersistArtifactBytes,
    retentionSignoffArchivePackCanExecuteModel,
    retentionSignoffArchivePackCanInvokeRuntime,
    retentionSignoffArchivePackCanExposeInferenceEndpoint,
    retentionSignoffArchivePackCanActivateArtifact,
    retentionSignoffArchivePackCanDeployArtifact,
    retentionSignoffArchivePackCanProductionScore,
    retentionSignoffArchivePackCanScheduleRetentionJobs,
    retentionSignoffArchivePackCanDeleteOrPurge,
    retentionSignoffArchivePackMetadataOnly,
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
    inventoryAccountingChangeAllowed: canChangeInventoryOrAccounting,
    pricingChangeAllowed: canChangePricing,
    reportsChangeAllowed: canChangeReports,
    ledgerChangeAllowed: canChangeLedger,
    userId: asNumber(options.userId),
  });

  return { ...archivePack, archiveRecord: archiveRecord as Record<string, unknown> | null };
};

export const buildMlCandidatePackageRetentionSignoffArchivePackCatalogSummary = async (): Promise<MlCandidatePackageRetentionSignoffArchivePackCatalogSummary> => {
  const [currentCandidatePackageRetentionSignoffArchivePack, lastCandidatePackageRetentionSignoffArchivePacks] = await Promise.all([
    buildInventoryStockoutCandidatePackageRetentionSignoffArchivePack().then((result) => result.summary),
    listMlCandidatePackageRetentionSignoffArchivePacks(10).catch(() => []),
  ]);
  return {
    generatedAt: new Date().toISOString(),
    contract: buildInventoryStockoutCandidatePackageRetentionSignoffArchivePackContract(),
    currentCandidatePackageRetentionSignoffArchivePack,
    lastCandidatePackageRetentionSignoffArchivePacks,
    recommendedNextAction: currentCandidatePackageRetentionSignoffArchivePack.recommendedNextAction,
  };
};

/* Phase 8G guard anchors: inventory_stockout_candidate_package_retention_signoff_archive_pack_v1, buildInventoryStockoutCandidatePackageRetentionSignoffArchivePackContract, buildInventoryStockoutCandidatePackageRetentionSignoffArchivePack, prepareInventoryStockoutCandidatePackageRetentionSignoffArchivePack, metadata_only_retention_signoff_archive_pack */
