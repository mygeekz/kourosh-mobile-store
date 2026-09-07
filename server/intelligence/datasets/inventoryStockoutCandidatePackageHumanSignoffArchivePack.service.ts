import { createHash } from "node:crypto";
import {
  getLatestMlCandidatePackageHumanReviewSignoff,
  listMlCandidatePackageHumanSignoffArchivePacks,
  recordMlCandidatePackageHumanSignoffArchivePack,
} from "../../db/domains/mlDatasets.db";
import type {
  CandidatePackageHumanSignoffArchivePackRecommendation,
  CandidatePackageHumanSignoffArchivePackStatus,
  InventoryStockoutCandidatePackageHumanSignoffArchivePackContract,
  InventoryStockoutCandidatePackageHumanSignoffArchivePackGate,
  InventoryStockoutCandidatePackageHumanSignoffArchivePackResponse,
  InventoryStockoutCandidatePackageHumanSignoffArchivePackSummary,
  MlCandidatePackageHumanSignoffArchivePackCatalogSummary,
} from "./datasetTypes";

const ARCHIVE_PACK_KEY = "inventory_stockout_candidate_package_human_signoff_archive_pack_v1" as const;
const ARCHIVE_PACK_VERSION = "v1" as const;
const SIGNOFF_KEY = "inventory_stockout_candidate_package_human_review_signoff_gate_v1" as const;
const SIGNOFF_VERSION = "v1" as const;
const PACKAGE_KEY = "inventory_stockout_offline_candidate_model_package_v1" as const;
const PACKAGE_VERSION = "v1" as const;
const PHASE = "Phase 8D" as const;

const archivePackIsProductionApproval = false as const;
const archivePackCanLoadPackageBytes = false as const;
const archivePackCanPersistArtifactBytes = false as const;
const archivePackCanExecuteModel = false as const;
const archivePackCanInvokeRuntime = false as const;
const archivePackCanExposeInferenceEndpoint = false as const;
const archivePackCanActivateArtifact = false as const;
const archivePackCanDeployArtifact = false as const;
const archivePackCanProductionScore = false as const;
const archivePackCanScheduleRetentionJobs = false as const;
const archivePackCanDeleteOrPurge = false as const;
const archivePackMetadataOnly = true as const;
const retentionPolicyLocked = true as const;
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
  status: InventoryStockoutCandidatePackageHumanSignoffArchivePackGate["status"],
  value: unknown,
  message: string,
): InventoryStockoutCandidatePackageHumanSignoffArchivePackGate => ({ key, label, status, value, message });

const uniqueMessages = (
  gates: InventoryStockoutCandidatePackageHumanSignoffArchivePackGate[],
  status: InventoryStockoutCandidatePackageHumanSignoffArchivePackGate["status"],
) => Array.from(new Set(gates.filter((gate) => gate.status === status).map((gate) => gate.message)));

const chooseRecommendation = (
  status: CandidatePackageHumanSignoffArchivePackStatus,
): CandidatePackageHumanSignoffArchivePackRecommendation => {
  if (status === "archive_pack_ready") return "record_metadata_only_human_signoff_archive_pack";
  if (status === "needs_phase8c_human_signoff") return "record_phase8c_human_review_signoff_first";
  if (status === "needs_signed_review_hash") return "restore_signed_review_hash_traceability";
  return "resolve_safety_blocks_first";
};

export const buildInventoryStockoutCandidatePackageHumanSignoffArchivePackContract = (): InventoryStockoutCandidatePackageHumanSignoffArchivePackContract => ({
  contractKey: ARCHIVE_PACK_KEY,
  contractVersion: ARCHIVE_PACK_VERSION,
  generatedAt: new Date().toISOString(),
  phase: PHASE,
  purpose: "Create a metadata-only archive pack for the Phase 8C human review/signoff gate without making the archive pack a production approval and without enabling package loading, model execution, runtime invocation, inference, activation, deployment, production scoring, retention jobs, delete/purge, or business mutation.",
  archiveScope: "offline_candidate_package_human_signoff_archive_metadata_only",
  requiredUpstreamSignoffKey: SIGNOFF_KEY,
  requiredUpstreamSignoffVersion: SIGNOFF_VERSION,
  requiredUpstreamEvidence: [
    "Persisted Phase 8C candidate package human review/signoff metadata row",
    "Phase 8C review_status is metadata_human_review_signed",
    "Phase 8C signoff_status is signoff_gate_ready",
    "Signed Phase 8C review hash for immutable traceability",
    "Artifact checksum metadata traceability from upstream package/signoff",
  ],
  includedArchiveSections: [
    "candidate-package-human-signoff-archive-pack.json",
    "candidate-package-human-signoff-retention-policy.json",
    "candidate-package-human-signoff-archive-safety-policy.json",
    "candidate-package-human-signoff-archive-summary.json",
  ],
  forbiddenBehavior: [
    "Do not load or persist candidate package bytes in Phase 8D.",
    "Do not execute, invoke, train, activate, deploy, or production-score any model artifact.",
    "Do not add /infer, /execute, /activate, /deploy, or /production-score routes.",
    "Do not treat this archive pack as production approval or automated decision authority.",
    "Do not schedule retention jobs, delete artifacts, or purge records in Phase 8D.",
    "Do not mutate inventory, accounting, ledger, pricing, reports, or business records.",
  ],
  operationalPolicy: {
    archivePackIsProductionApproval,
    archivePackCanLoadPackageBytes,
    archivePackCanPersistArtifactBytes,
    archivePackCanExecuteModel,
    archivePackCanInvokeRuntime,
    archivePackCanExposeInferenceEndpoint,
    archivePackCanActivateArtifact,
    archivePackCanDeployArtifact,
    archivePackCanProductionScore,
    archivePackCanScheduleRetentionJobs,
    archivePackCanDeleteOrPurge,
    archivePackMetadataOnly,
    retentionPolicyLocked,
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

export const buildInventoryStockoutCandidatePackageHumanSignoffArchivePack = async (
  _options: Record<string, unknown> = {},
): Promise<InventoryStockoutCandidatePackageHumanSignoffArchivePackResponse> => {
  const generatedAt = new Date().toISOString();
  const contract = buildInventoryStockoutCandidatePackageHumanSignoffArchivePackContract();
  const latestSignoff = await getLatestMlCandidatePackageHumanReviewSignoff().catch(() => null) as Record<string, unknown> | null;
  const signoffId = asNumber(latestSignoff?.id);
  const reviewStatus = asString(latestSignoff?.reviewStatus);
  const signoffStatus = asString(latestSignoff?.signoffStatus);
  const signedReviewHash = asString(latestSignoff?.signedReviewHash);
  const persistedSignoffExists = Boolean(signoffId);
  const upstreamSignoffReady = reviewStatus === "metadata_human_review_signed" && signoffStatus === "signoff_gate_ready";

  const safetyPolicyStillDisabled =
    archivePackIsProductionApproval === false &&
    archivePackCanLoadPackageBytes === false &&
    archivePackCanPersistArtifactBytes === false &&
    archivePackCanExecuteModel === false &&
    archivePackCanInvokeRuntime === false &&
    archivePackCanExposeInferenceEndpoint === false &&
    archivePackCanActivateArtifact === false &&
    archivePackCanDeployArtifact === false &&
    archivePackCanProductionScore === false &&
    archivePackCanScheduleRetentionJobs === false &&
    archivePackCanDeleteOrPurge === false &&
    archivePackMetadataOnly === true &&
    retentionPolicyLocked === true &&
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
    policyKey: "candidate_package_human_signoff_archive_retention_policy_v1",
    policyVersion: "v1",
    generatedAt,
    retentionMode: "metadata_archive_reference_only",
    retentionPolicyLocked,
    retentionJobSchedulingAllowed: archivePackCanScheduleRetentionJobs,
    automaticDeletionAllowed: archivePackCanDeleteOrPurge,
    purgeJobAllowed: archivePackCanDeleteOrPurge,
    notes: [
      "Phase 8D records archive metadata only.",
      "No artifact bytes are loaded or persisted.",
      "No delete, purge, or retention job execution is enabled.",
    ],
  };

  const gates: InventoryStockoutCandidatePackageHumanSignoffArchivePackGate[] = [
    buildGate("persisted_phase8c_signoff_exists", "Persisted Phase 8C Signoff", persistedSignoffExists ? "pass" : "block", signoffId, persistedSignoffExists ? "A persisted Phase 8C human review/signoff metadata row exists." : "Record a Phase 8C human review/signoff gate before building the Phase 8D archive pack."),
    buildGate("phase8c_signoff_ready", "Phase 8C Signoff Ready", upstreamSignoffReady ? "pass" : "block", { reviewStatus, signoffStatus }, upstreamSignoffReady ? "Phase 8C signoff is metadata_human_review_signed with signoff_gate_ready status." : "Phase 8C signoff must be metadata_human_review_signed and signoff_gate_ready before archival."),
    buildGate("signed_review_hash_present", "Signed Review Hash", signedReviewHash ? "pass" : "block", signedReviewHash, signedReviewHash ? "Signed Phase 8C review hash is available for archive traceability." : "Signed Phase 8C review hash is required before archive pack recording."),
    buildGate("retention_policy_locked", "Retention Policy Locked", retentionPolicyLocked ? "pass" : "block", retentionPolicyLocked, retentionPolicyLocked ? "Archive retention policy is locked as metadata-only and requires a future phase for any retention execution." : "Retention policy must remain locked for Phase 8D."),
    buildGate("archive_safety_policy_disabled", "Archive Safety Policy", safetyPolicyStillDisabled ? "pass" : "block", safetyPolicyStillDisabled, safetyPolicyStillDisabled ? "Archive pack safety policy keeps package loading, execution, inference, activation, deployment, production scoring, retention jobs, delete/purge, and business mutation disabled." : "Archive pack safety policy changed and must be blocked."),
  ];

  let status: CandidatePackageHumanSignoffArchivePackStatus = "archive_pack_ready";
  if (!safetyPolicyStillDisabled) status = "safety_blocked";
  else if (!persistedSignoffExists || !upstreamSignoffReady) status = "needs_phase8c_human_signoff";
  else if (!signedReviewHash) status = "needs_signed_review_hash";

  const blockers = uniqueMessages(gates, "block");
  const warnings = uniqueMessages(gates, "warning");
  const passCount = gates.filter((gate) => gate.status === "pass").length;
  const totalGateCount = gates.length;
  const readinessScorePct = totalGateCount > 0 ? Math.round((passCount / totalGateCount) * 10000) / 100 : 0;
  const recommendation = chooseRecommendation(status);

  const safetyPolicy = {
    phase: PHASE,
    archivePackIsProductionApproval,
    archivePackCanLoadPackageBytes,
    archivePackCanPersistArtifactBytes,
    archivePackCanExecuteModel,
    archivePackCanInvokeRuntime,
    archivePackCanExposeInferenceEndpoint,
    archivePackCanActivateArtifact,
    archivePackCanDeployArtifact,
    archivePackCanProductionScore,
    archivePackCanScheduleRetentionJobs,
    archivePackCanDeleteOrPurge,
    archivePackMetadataOnly,
    retentionPolicyLocked,
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

  const summary: InventoryStockoutCandidatePackageHumanSignoffArchivePackSummary = {
    archivePackKey: ARCHIVE_PACK_KEY,
    archivePackVersion: ARCHIVE_PACK_VERSION,
    generatedAt,
    phase: PHASE,
    status,
    recommendation,
    readinessScorePct,
    signoffId,
    signoffKey: SIGNOFF_KEY,
    signoffVersion: SIGNOFF_VERSION,
    reviewStatus,
    signoffStatus,
    signedReviewHash,
    binderId: asNumber(latestSignoff?.binderId),
    packageId: asNumber(latestSignoff?.packageId),
    packageKey: PACKAGE_KEY,
    packageVersion: PACKAGE_VERSION,
    importId: asNumber(latestSignoff?.importId),
    artifactMetadataId: asNumber(latestSignoff?.artifactMetadataId),
    approvalReviewId: asNumber(latestSignoff?.approvalReviewId),
    modelKey: asString(latestSignoff?.candidateModelKey),
    modelVersion: asString(latestSignoff?.candidateModelVersion),
    artifactChecksumSha256: asString(latestSignoff?.artifactChecksumSha256),
    archiveMode: "metadata_only_human_signoff_archive_pack",
    archivePackIsProductionApproval,
    archivePackCanLoadPackageBytes,
    archivePackCanPersistArtifactBytes,
    archivePackCanExecuteModel,
    archivePackCanInvokeRuntime,
    archivePackCanExposeInferenceEndpoint,
    archivePackCanActivateArtifact,
    archivePackCanDeployArtifact,
    archivePackCanProductionScore,
    archivePackCanScheduleRetentionJobs,
    archivePackCanDeleteOrPurge,
    archivePackMetadataOnly,
    retentionPolicyLocked,
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
    signedArchiveHash: null,
    recommendedNextAction: status === "archive_pack_ready"
      ? "Phase 8D archive pack آماده ثبت metadata-only است؛ این archive pack تولیدی نیست و load/execute/infer/activate/deploy/production-score/retention-job/delete/purge/mutation ندارد."
      : blockers[0] || "برای آماده‌شدن Phase 8D، Phase 8C human signoff و signed review hash را کامل کنید.",
  };

  const archivePack = {
    phase: PHASE,
    archivePackKey: ARCHIVE_PACK_KEY,
    archivePackVersion: ARCHIVE_PACK_VERSION,
    generatedAt,
    upstreamSignoff: {
      signoffId,
      signoffKey: SIGNOFF_KEY,
      signoffVersion: SIGNOFF_VERSION,
      reviewStatus,
      signoffStatus,
      signedReviewHash,
    },
    packageTraceability: {
      binderId: summary.binderId,
      packageId: summary.packageId,
      packageKey: summary.packageKey,
      packageVersion: summary.packageVersion,
      importId: summary.importId,
      artifactMetadataId: summary.artifactMetadataId,
      approvalReviewId: summary.approvalReviewId,
      modelKey: summary.modelKey,
      modelVersion: summary.modelVersion,
      artifactChecksumSha256: summary.artifactChecksumSha256,
    },
    gates,
    retentionPolicy,
    safetyPolicy,
  };
  const signedArchiveHash = sha256(archivePack);
  summary.signedArchiveHash = signedArchiveHash;

  return {
    success: true,
    contract,
    summary,
    gates,
    archivePack,
    retentionPolicy,
    safetyPolicy,
  };
};

export const prepareInventoryStockoutCandidatePackageHumanSignoffArchivePack = async (
  options: Record<string, unknown> = {},
): Promise<InventoryStockoutCandidatePackageHumanSignoffArchivePackResponse> => {
  const archive = await buildInventoryStockoutCandidatePackageHumanSignoffArchivePack(options);
  if (archive.summary.status !== "archive_pack_ready") return archive;

  const archiveRecord = await recordMlCandidatePackageHumanSignoffArchivePack({
    signoffId: archive.summary.signoffId,
    signoffKey: archive.summary.signoffKey,
    signoffVersion: archive.summary.signoffVersion,
    signedReviewHash: archive.summary.signedReviewHash || "",
    binderId: archive.summary.binderId,
    packageId: archive.summary.packageId,
    packageKey: archive.summary.packageKey,
    packageVersion: archive.summary.packageVersion,
    candidateModelKey: archive.summary.modelKey,
    candidateModelVersion: archive.summary.modelVersion,
    importId: archive.summary.importId,
    artifactMetadataId: archive.summary.artifactMetadataId,
    approvalReviewId: archive.summary.approvalReviewId,
    artifactChecksumSha256: archive.summary.artifactChecksumSha256,
    archivePackKey: archive.summary.archivePackKey,
    archivePackVersion: archive.summary.archivePackVersion,
    archiveStatus: archive.summary.status,
    readinessScorePct: archive.summary.readinessScorePct,
    archivePack: archive.archivePack,
    retentionPolicy: archive.retentionPolicy,
    safetyPolicy: archive.safetyPolicy,
    summary: archive.summary as unknown as Record<string, unknown>,
    signedArchiveHash: archive.summary.signedArchiveHash || sha256(archive.archivePack),
    archivePackIsProductionApproval: archive.summary.archivePackIsProductionApproval,
    archivePackCanLoadPackageBytes: archive.summary.archivePackCanLoadPackageBytes,
    archivePackCanPersistArtifactBytes: archive.summary.archivePackCanPersistArtifactBytes,
    archivePackCanExecuteModel: archive.summary.archivePackCanExecuteModel,
    archivePackCanInvokeRuntime: archive.summary.archivePackCanInvokeRuntime,
    archivePackCanExposeInferenceEndpoint: archive.summary.archivePackCanExposeInferenceEndpoint,
    archivePackCanActivateArtifact: archive.summary.archivePackCanActivateArtifact,
    archivePackCanDeployArtifact: archive.summary.archivePackCanDeployArtifact,
    archivePackCanProductionScore: archive.summary.archivePackCanProductionScore,
    archivePackCanScheduleRetentionJobs: archive.summary.archivePackCanScheduleRetentionJobs,
    archivePackCanDeleteOrPurge: archive.summary.archivePackCanDeleteOrPurge,
    archivePackMetadataOnly: archive.summary.archivePackMetadataOnly,
    retentionPolicyLocked: archive.summary.retentionPolicyLocked,
    modelExecutionAllowed: archive.summary.modelExecutionAllowed,
    runtimeInvocationAllowed: archive.summary.runtimeInvocationAllowed,
    inferenceEndpointExposed: archive.summary.inferenceEndpointExposed,
    artifactActivationAllowed: archive.summary.artifactActivationAllowed,
    artifactBytesLoadingAllowed: archive.summary.artifactBytesLoadingAllowed,
    productionIntegrationAllowed: archive.summary.productionIntegrationAllowed,
    decisionAutomationAllowed: archive.summary.decisionAutomationAllowed,
    inventoryAccountingChangeAllowed: archive.summary.canChangeInventoryOrAccounting,
    pricingChangeAllowed: archive.summary.canChangePricing,
    reportsChangeAllowed: archive.summary.canChangeReports,
    ledgerChangeAllowed: archive.summary.canChangeLedger,
    userId: asNumber(options.userId),
  });

  return {
    ...archive,
    archiveRecord,
  };
};

export const buildMlCandidatePackageHumanSignoffArchivePackCatalogSummary = async (): Promise<MlCandidatePackageHumanSignoffArchivePackCatalogSummary> => {
  const [currentCandidatePackageHumanSignoffArchivePack, lastCandidatePackageHumanSignoffArchivePacks] = await Promise.all([
    buildInventoryStockoutCandidatePackageHumanSignoffArchivePack().then((result) => result.summary),
    listMlCandidatePackageHumanSignoffArchivePacks(10).catch(() => []),
  ]);
  return {
    generatedAt: new Date().toISOString(),
    contract: buildInventoryStockoutCandidatePackageHumanSignoffArchivePackContract(),
    currentCandidatePackageHumanSignoffArchivePack,
    lastCandidatePackageHumanSignoffArchivePacks,
    recommendedNextAction: currentCandidatePackageHumanSignoffArchivePack.recommendedNextAction,
  };
};

/* Phase 8D guard anchors: inventory_stockout_candidate_package_human_signoff_archive_pack_v1, buildInventoryStockoutCandidatePackageHumanSignoffArchivePackContract, buildInventoryStockoutCandidatePackageHumanSignoffArchivePack, prepareInventoryStockoutCandidatePackageHumanSignoffArchivePack, metadata_only_human_signoff_archive_pack */
