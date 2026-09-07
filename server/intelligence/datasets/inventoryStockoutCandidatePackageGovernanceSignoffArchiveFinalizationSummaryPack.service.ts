import { createHash } from "node:crypto";
import {
  getLatestMlCandidatePackageGovernanceSignoffArchivePack,
  listMlCandidatePackageGovernanceSignoffArchiveFinalizationSummaryPacks,
  recordMlCandidatePackageGovernanceSignoffArchiveFinalizationSummaryPack,
} from "../../db/domains/mlDatasets.db";
import type {
  CandidatePackageGovernanceSignoffArchiveFinalizationSummaryPackRecommendation,
  CandidatePackageGovernanceSignoffArchiveFinalizationSummaryPackStatus,
  InventoryStockoutCandidatePackageGovernanceSignoffArchiveFinalizationSummaryPackContract,
  InventoryStockoutCandidatePackageGovernanceSignoffArchiveFinalizationSummaryPackGate,
  InventoryStockoutCandidatePackageGovernanceSignoffArchiveFinalizationSummaryPackResponse,
  InventoryStockoutCandidatePackageGovernanceSignoffArchiveFinalizationSummaryPackSummary,
  MlCandidatePackageGovernanceSignoffArchiveFinalizationSummaryPackCatalogSummary,
} from "./datasetTypes";

const GOVERNANCE_SIGNOFF_ARCHIVE_FINALIZATION_SUMMARY_PACK_KEY = "inventory_stockout_candidate_package_governance_signoff_archive_finalization_summary_pack_v1" as const;
const GOVERNANCE_SIGNOFF_ARCHIVE_FINALIZATION_SUMMARY_PACK_VERSION = "v1" as const;
const GOVERNANCE_SIGNOFF_ARCHIVE_PACK_KEY = "inventory_stockout_candidate_package_governance_signoff_archive_pack_v1" as const;
const GOVERNANCE_SIGNOFF_ARCHIVE_PACK_VERSION = "v1" as const;
const PACKAGE_KEY = "inventory_stockout_offline_candidate_model_package_v1" as const;
const PACKAGE_VERSION = "v1" as const;
const PHASE = "Phase 8K" as const;

const governanceSignoffArchiveFinalizationSummaryPackIsProductionApproval = false as const;
const governanceSignoffArchiveFinalizationSummaryPackCanLoadSignoffBytes = false as const;
const governanceSignoffArchiveFinalizationSummaryPackCanLoadSnapshotBytes = false as const;
const governanceSignoffArchiveFinalizationSummaryPackCanLoadArchiveBytes = false as const;
const governanceSignoffArchiveFinalizationSummaryPackCanLoadPackageBytes = false as const;
const governanceSignoffArchiveFinalizationSummaryPackCanPersistArtifactBytes = false as const;
const governanceSignoffArchiveFinalizationSummaryPackCanExecuteModel = false as const;
const governanceSignoffArchiveFinalizationSummaryPackCanInvokeRuntime = false as const;
const governanceSignoffArchiveFinalizationSummaryPackCanExposeInferenceEndpoint = false as const;
const governanceSignoffArchiveFinalizationSummaryPackCanActivateArtifact = false as const;
const governanceSignoffArchiveFinalizationSummaryPackCanDeployArtifact = false as const;
const governanceSignoffArchiveFinalizationSummaryPackCanProductionScore = false as const;
const governanceSignoffArchiveFinalizationSummaryPackCanScheduleRetentionJobs = false as const;
const governanceSignoffArchiveFinalizationSummaryPackCanDeleteOrPurge = false as const;
const governanceSignoffArchiveFinalizationSummaryPackMetadataOnly = true as const;
const retentionPolicyLocked = true as const;
const finalAuditSnapshotImmutable = true as const;
const governanceSignoffArchiveFinalizationIsClosureSummary = true as const;
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
  status: InventoryStockoutCandidatePackageGovernanceSignoffArchiveFinalizationSummaryPackGate["status"],
  value: unknown,
  message: string,
): InventoryStockoutCandidatePackageGovernanceSignoffArchiveFinalizationSummaryPackGate => ({ key, label, status, value, message });

const uniqueMessages = (
  gates: InventoryStockoutCandidatePackageGovernanceSignoffArchiveFinalizationSummaryPackGate[],
  status: InventoryStockoutCandidatePackageGovernanceSignoffArchiveFinalizationSummaryPackGate["status"],
) => Array.from(new Set(gates.filter((gate) => gate.status === status).map((gate) => gate.message)));

const chooseRecommendation = (
  status: CandidatePackageGovernanceSignoffArchiveFinalizationSummaryPackStatus,
): CandidatePackageGovernanceSignoffArchiveFinalizationSummaryPackRecommendation => {
  if (status === "governance_signoff_archive_finalization_summary_pack_ready") return "record_metadata_only_governance_signoff_archive_finalization_summary_pack";
  if (status === "needs_phase8j_governance_signoff_archive_pack") return "record_phase8j_governance_signoff_archive_pack_first";
  if (status === "needs_signed_governance_signoff_archive_hash") return "restore_signed_governance_signoff_archive_hash_traceability";
  return "resolve_safety_blocks_first";
};

export const buildInventoryStockoutCandidatePackageGovernanceSignoffArchiveFinalizationSummaryPackContract = (): InventoryStockoutCandidatePackageGovernanceSignoffArchiveFinalizationSummaryPackContract => ({
  contractKey: GOVERNANCE_SIGNOFF_ARCHIVE_FINALIZATION_SUMMARY_PACK_KEY,
  contractVersion: GOVERNANCE_SIGNOFF_ARCHIVE_FINALIZATION_SUMMARY_PACK_VERSION,
  generatedAt: new Date().toISOString(),
  phase: PHASE,
  purpose: "Record a metadata-only finalization summary pack for the Phase 8J governance signoff archive pack without treating the summary as production approval and without enabling retention jobs, delete, purge, signoff/snapshot/archive/package loading, model execution, runtime invocation, inference, activation, deployment, production scoring, or business mutation.",
  finalizationScope: "offline_candidate_package_governance_signoff_archive_finalization_summary_metadata_only",
  requiredUpstreamGovernanceSignoffArchivePackKey: GOVERNANCE_SIGNOFF_ARCHIVE_PACK_KEY,
  requiredUpstreamGovernanceSignoffArchivePackVersion: GOVERNANCE_SIGNOFF_ARCHIVE_PACK_VERSION,
  requiredUpstreamEvidence: [
    "Persisted Phase 8J candidate package governance signoff archive pack row",
    "Phase 8J archive_status is governance_signoff_archive_pack_ready",
    "Signed Phase 8J governance signoff archive hash for finalization traceability",
    "Phase 8J safety policy confirms no production approval, retention execution, delete, purge, loading, runtime, inference, activation, deployment, production scoring, or business mutation",
  ],
  includedFinalizationSections: [
    "candidate-package-governance-signoff-archive-finalization-summary-packet.json",
    "candidate-package-governance-signoff-archive-finalization-summary-policy.json",
    "candidate-package-governance-signoff-archive-finalization-summary-retention-policy.json",
    "candidate-package-governance-signoff-archive-finalization-summary-safety-policy.json",
    "candidate-package-governance-signoff-archive-finalization-summary.json",
  ],
  forbiddenBehavior: [
    "Do not schedule retention jobs in Phase 8K.",
    "Do not delete, purge, overwrite, or mutate signoff/snapshot/archive/package/artifact records.",
    "Do not load signoff bytes, snapshot bytes, archive bytes, package bytes, or artifact bytes.",
    "Do not execute, invoke, train, activate, deploy, or production-score any model artifact.",
    "Do not add /infer, /execute, /activate, /deploy, /production-score, or /approve-production routes.",
    "Do not treat this finalization summary pack as production approval, deployment approval, model approval, retention execution approval, or artifact activation approval.",
    "Do not mutate inventory, accounting, ledger, pricing, reports, or business records.",
  ],
  operationalPolicy: {
    governanceSignoffArchiveFinalizationSummaryPackIsProductionApproval,
    governanceSignoffArchiveFinalizationSummaryPackCanLoadSignoffBytes,
    governanceSignoffArchiveFinalizationSummaryPackCanLoadSnapshotBytes,
    governanceSignoffArchiveFinalizationSummaryPackCanLoadArchiveBytes,
    governanceSignoffArchiveFinalizationSummaryPackCanLoadPackageBytes,
    governanceSignoffArchiveFinalizationSummaryPackCanPersistArtifactBytes,
    governanceSignoffArchiveFinalizationSummaryPackCanExecuteModel,
    governanceSignoffArchiveFinalizationSummaryPackCanInvokeRuntime,
    governanceSignoffArchiveFinalizationSummaryPackCanExposeInferenceEndpoint,
    governanceSignoffArchiveFinalizationSummaryPackCanActivateArtifact,
    governanceSignoffArchiveFinalizationSummaryPackCanDeployArtifact,
    governanceSignoffArchiveFinalizationSummaryPackCanProductionScore,
    governanceSignoffArchiveFinalizationSummaryPackCanScheduleRetentionJobs,
    governanceSignoffArchiveFinalizationSummaryPackCanDeleteOrPurge,
    governanceSignoffArchiveFinalizationSummaryPackMetadataOnly,
    retentionPolicyLocked,
    finalAuditSnapshotImmutable,
    governanceSignoffArchiveFinalizationIsClosureSummary,
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

export const buildInventoryStockoutCandidatePackageGovernanceSignoffArchiveFinalizationSummaryPack = async (
  _options: Record<string, unknown> = {},
): Promise<InventoryStockoutCandidatePackageGovernanceSignoffArchiveFinalizationSummaryPackResponse> => {
  const generatedAt = new Date().toISOString();
  const contract = buildInventoryStockoutCandidatePackageGovernanceSignoffArchiveFinalizationSummaryPackContract();
  const latestGovernanceSignoffArchivePack = await getLatestMlCandidatePackageGovernanceSignoffArchivePack().catch(() => null) as Record<string, unknown> | null;
  const governanceSignoffArchivePackId = asNumber(latestGovernanceSignoffArchivePack?.id);
  const governanceSignoffArchivePackStatus = asString(latestGovernanceSignoffArchivePack?.archiveStatus);
  const signedGovernanceSignoffArchiveHash = asString(latestGovernanceSignoffArchivePack?.signedGovernanceSignoffArchiveHash);
  const finalAuditSnapshotGovernanceSignoffId = asNumber(latestGovernanceSignoffArchivePack?.finalAuditSnapshotGovernanceSignoffId);
  const signedFinalAuditSnapshotGovernanceSignoffHash = asString(latestGovernanceSignoffArchivePack?.signedFinalAuditSnapshotGovernanceSignoffHash);
  const retentionArchiveFinalAuditSnapshotId = asNumber(latestGovernanceSignoffArchivePack?.retentionArchiveFinalAuditSnapshotId);
  const signedRetentionArchiveFinalAuditSnapshotHash = asString(latestGovernanceSignoffArchivePack?.signedRetentionArchiveFinalAuditSnapshotHash);
  const packageId = asNumber(latestGovernanceSignoffArchivePack?.packageId);
  const persistedGovernanceSignoffArchivePackExists = Boolean(governanceSignoffArchivePackId);
  const upstreamGovernanceSignoffArchivePackReady = governanceSignoffArchivePackStatus === "governance_signoff_archive_pack_ready";

  const safetyPolicyStillDisabled =
    governanceSignoffArchiveFinalizationSummaryPackIsProductionApproval === false &&
    governanceSignoffArchiveFinalizationSummaryPackCanLoadSignoffBytes === false &&
    governanceSignoffArchiveFinalizationSummaryPackCanLoadSnapshotBytes === false &&
    governanceSignoffArchiveFinalizationSummaryPackCanLoadArchiveBytes === false &&
    governanceSignoffArchiveFinalizationSummaryPackCanLoadPackageBytes === false &&
    governanceSignoffArchiveFinalizationSummaryPackCanPersistArtifactBytes === false &&
    governanceSignoffArchiveFinalizationSummaryPackCanExecuteModel === false &&
    governanceSignoffArchiveFinalizationSummaryPackCanInvokeRuntime === false &&
    governanceSignoffArchiveFinalizationSummaryPackCanExposeInferenceEndpoint === false &&
    governanceSignoffArchiveFinalizationSummaryPackCanActivateArtifact === false &&
    governanceSignoffArchiveFinalizationSummaryPackCanDeployArtifact === false &&
    governanceSignoffArchiveFinalizationSummaryPackCanProductionScore === false &&
    governanceSignoffArchiveFinalizationSummaryPackCanScheduleRetentionJobs === false &&
    governanceSignoffArchiveFinalizationSummaryPackCanDeleteOrPurge === false &&
    governanceSignoffArchiveFinalizationSummaryPackMetadataOnly === true &&
    retentionPolicyLocked === true &&
    finalAuditSnapshotImmutable === true &&
    governanceSignoffArchiveFinalizationIsClosureSummary === true &&
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
    policyKey: "candidate_package_governance_signoff_archive_finalization_summary_retention_policy_v1",
    policyVersion: "v1",
    generatedAt,
    retentionMode: "metadata_finalization_summary_reference_only",
    retentionPolicyLocked,
    retentionExecutionAllowed,
    retentionJobSchedulingAllowed: governanceSignoffArchiveFinalizationSummaryPackCanScheduleRetentionJobs,
    automaticDeletionAllowed,
    purgeJobAllowed,
    notes: [
      "Phase 8K records governance signoff archive finalization summary metadata only.",
      "No signoff, snapshot, archive, package, or artifact bytes are loaded or persisted.",
      "No delete, purge, or retention job execution is enabled.",
    ],
  };

  const gates: InventoryStockoutCandidatePackageGovernanceSignoffArchiveFinalizationSummaryPackGate[] = [
    buildGate("persisted_phase8j_governance_signoff_archive_pack_exists", "Persisted Phase 8J Governance Signoff Archive Pack", persistedGovernanceSignoffArchivePackExists ? "pass" : "block", governanceSignoffArchivePackId, persistedGovernanceSignoffArchivePackExists ? "A persisted Phase 8J governance signoff archive pack metadata row exists." : "Record a Phase 8J governance signoff archive pack before building the Phase 8K finalization summary pack."),
    buildGate("phase8j_governance_signoff_archive_pack_ready", "Phase 8J Governance Signoff Archive Pack Ready", upstreamGovernanceSignoffArchivePackReady ? "pass" : "block", governanceSignoffArchivePackStatus, upstreamGovernanceSignoffArchivePackReady ? "Phase 8J governance signoff archive pack status is governance_signoff_archive_pack_ready." : "Phase 8J governance signoff archive pack must be governance_signoff_archive_pack_ready before finalization summary packaging."),
    buildGate("signed_governance_signoff_archive_hash_present", "Signed Governance Signoff Archive Hash", signedGovernanceSignoffArchiveHash ? "pass" : "block", signedGovernanceSignoffArchiveHash, signedGovernanceSignoffArchiveHash ? "A signed Phase 8J governance signoff archive hash is available for finalization traceability." : "Restore signedGovernanceSignoffArchiveHash before building the Phase 8K finalization summary pack."),
    buildGate("retention_policy_locked", "Retention Policy Locked", retentionPolicyLocked ? "pass" : "block", retentionPolicyLocked, retentionPolicyLocked ? "Retention policy remains locked and metadata-only." : "Retention policy must stay locked before governance signoff archive finalization."),
    buildGate("safety_policy_disabled", "Safety Policy Disabled", safetyPolicyStillDisabled ? "pass" : "block", safetyPolicyStillDisabled, safetyPolicyStillDisabled ? "Production approval, execution, inference, activation, deploy, production scoring, retention jobs, delete/purge, loading, and business mutation remain disabled." : "A Phase 8K safety policy flag is not disabled."),
  ];

  let status: CandidatePackageGovernanceSignoffArchiveFinalizationSummaryPackStatus = "governance_signoff_archive_finalization_summary_pack_ready";
  if (!persistedGovernanceSignoffArchivePackExists || !upstreamGovernanceSignoffArchivePackReady) {
    status = "needs_phase8j_governance_signoff_archive_pack";
  } else if (!signedGovernanceSignoffArchiveHash) {
    status = "needs_signed_governance_signoff_archive_hash";
  } else if (!safetyPolicyStillDisabled) {
    status = "safety_blocked";
  }

  const blockers = uniqueMessages(gates, "block");
  const warnings = uniqueMessages(gates, "warning");
  const passCount = gates.filter((gate) => gate.status === "pass").length;
  const readinessScorePct = Math.round((passCount / gates.length) * 100);

  const safetyPolicy = {
    policyKey: "candidate_package_governance_signoff_archive_finalization_summary_safety_policy_v1",
    generatedAt,
    governanceSignoffArchiveFinalizationSummaryPackIsProductionApproval,
    governanceSignoffArchiveFinalizationSummaryPackCanLoadSignoffBytes,
    governanceSignoffArchiveFinalizationSummaryPackCanLoadSnapshotBytes,
    governanceSignoffArchiveFinalizationSummaryPackCanLoadArchiveBytes,
    governanceSignoffArchiveFinalizationSummaryPackCanLoadPackageBytes,
    governanceSignoffArchiveFinalizationSummaryPackCanPersistArtifactBytes,
    governanceSignoffArchiveFinalizationSummaryPackCanExecuteModel,
    governanceSignoffArchiveFinalizationSummaryPackCanInvokeRuntime,
    governanceSignoffArchiveFinalizationSummaryPackCanExposeInferenceEndpoint,
    governanceSignoffArchiveFinalizationSummaryPackCanActivateArtifact,
    governanceSignoffArchiveFinalizationSummaryPackCanDeployArtifact,
    governanceSignoffArchiveFinalizationSummaryPackCanProductionScore,
    governanceSignoffArchiveFinalizationSummaryPackCanScheduleRetentionJobs,
    governanceSignoffArchiveFinalizationSummaryPackCanDeleteOrPurge,
    governanceSignoffArchiveFinalizationSummaryPackMetadataOnly,
    retentionPolicyLocked,
    finalAuditSnapshotImmutable,
    governanceSignoffArchiveFinalizationIsClosureSummary,
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

  const finalizationSummaryPacket = {
    finalizationSummaryKey: GOVERNANCE_SIGNOFF_ARCHIVE_FINALIZATION_SUMMARY_PACK_KEY,
    finalizationSummaryVersion: GOVERNANCE_SIGNOFF_ARCHIVE_FINALIZATION_SUMMARY_PACK_VERSION,
    generatedAt,
    finalizationMode: "metadata_only_governance_signoff_archive_finalization_summary_pack",
    upstream: {
      governanceSignoffArchivePackId,
      governanceSignoffArchivePackKey: GOVERNANCE_SIGNOFF_ARCHIVE_PACK_KEY,
      governanceSignoffArchivePackVersion: GOVERNANCE_SIGNOFF_ARCHIVE_PACK_VERSION,
      governanceSignoffArchivePackStatus,
      signedGovernanceSignoffArchiveHash,
      finalAuditSnapshotGovernanceSignoffId,
      signedFinalAuditSnapshotGovernanceSignoffHash,
      retentionArchiveFinalAuditSnapshotId,
      signedRetentionArchiveFinalAuditSnapshotHash,
      packageId,
    },
    sections: contract.includedFinalizationSections,
    retentionPolicy,
    safetyPolicy,
  };

  const signedGovernanceSignoffArchiveFinalizationSummaryHash = status === "governance_signoff_archive_finalization_summary_pack_ready"
    ? sha256({ finalizationSummaryPacket, retentionPolicy, safetyPolicy, upstreamHash: signedGovernanceSignoffArchiveHash })
    : null;

  const summary: InventoryStockoutCandidatePackageGovernanceSignoffArchiveFinalizationSummaryPackSummary = {
    governanceSignoffArchiveFinalizationSummaryPackKey: GOVERNANCE_SIGNOFF_ARCHIVE_FINALIZATION_SUMMARY_PACK_KEY,
    governanceSignoffArchiveFinalizationSummaryPackVersion: GOVERNANCE_SIGNOFF_ARCHIVE_FINALIZATION_SUMMARY_PACK_VERSION,
    generatedAt,
    phase: PHASE,
    status,
    recommendation: chooseRecommendation(status),
    readinessScorePct,
    governanceSignoffArchivePackId,
    governanceSignoffArchivePackKey: GOVERNANCE_SIGNOFF_ARCHIVE_PACK_KEY,
    governanceSignoffArchivePackVersion: GOVERNANCE_SIGNOFF_ARCHIVE_PACK_VERSION,
    governanceSignoffArchivePackStatus,
    signedGovernanceSignoffArchiveHash,
    finalAuditSnapshotGovernanceSignoffId,
    signedFinalAuditSnapshotGovernanceSignoffHash,
    retentionArchiveFinalAuditSnapshotId,
    signedRetentionArchiveFinalAuditSnapshotHash,
    packageId,
    packageKey: PACKAGE_KEY,
    packageVersion: PACKAGE_VERSION,
    governanceSignoffArchiveFinalizationMode: "metadata_only_governance_signoff_archive_finalization_summary_pack",
    governanceSignoffArchiveFinalizationSummaryPackIsProductionApproval,
    governanceSignoffArchiveFinalizationSummaryPackCanLoadSignoffBytes,
    governanceSignoffArchiveFinalizationSummaryPackCanLoadSnapshotBytes,
    governanceSignoffArchiveFinalizationSummaryPackCanLoadArchiveBytes,
    governanceSignoffArchiveFinalizationSummaryPackCanLoadPackageBytes,
    governanceSignoffArchiveFinalizationSummaryPackCanPersistArtifactBytes,
    governanceSignoffArchiveFinalizationSummaryPackCanExecuteModel,
    governanceSignoffArchiveFinalizationSummaryPackCanInvokeRuntime,
    governanceSignoffArchiveFinalizationSummaryPackCanExposeInferenceEndpoint,
    governanceSignoffArchiveFinalizationSummaryPackCanActivateArtifact,
    governanceSignoffArchiveFinalizationSummaryPackCanDeployArtifact,
    governanceSignoffArchiveFinalizationSummaryPackCanProductionScore,
    governanceSignoffArchiveFinalizationSummaryPackCanScheduleRetentionJobs,
    governanceSignoffArchiveFinalizationSummaryPackCanDeleteOrPurge,
    governanceSignoffArchiveFinalizationSummaryPackMetadataOnly,
    retentionPolicyLocked,
    finalAuditSnapshotImmutable,
    governanceSignoffArchiveFinalizationIsClosureSummary,
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
    signedGovernanceSignoffArchiveFinalizationSummaryHash,
    recommendedNextAction: chooseRecommendation(status),
  };

  return {
    success: true,
    contract,
    summary,
    gates,
    finalizationSummaryPacket,
    retentionPolicy,
    safetyPolicy,
  };
};

export const prepareInventoryStockoutCandidatePackageGovernanceSignoffArchiveFinalizationSummaryPack = async (
  options: Record<string, unknown> = {},
): Promise<InventoryStockoutCandidatePackageGovernanceSignoffArchiveFinalizationSummaryPackResponse> => {
  const finalization = await buildInventoryStockoutCandidatePackageGovernanceSignoffArchiveFinalizationSummaryPack(options);
  if (finalization.summary.status !== "governance_signoff_archive_finalization_summary_pack_ready" || !finalization.summary.signedGovernanceSignoffArchiveFinalizationSummaryHash) return finalization;

  const finalizationRecord = await recordMlCandidatePackageGovernanceSignoffArchiveFinalizationSummaryPack({
    governanceSignoffArchivePackId: finalization.summary.governanceSignoffArchivePackId,
    governanceSignoffArchivePackKey: finalization.summary.governanceSignoffArchivePackKey,
    governanceSignoffArchivePackVersion: finalization.summary.governanceSignoffArchivePackVersion,
    governanceSignoffArchivePackStatus: finalization.summary.governanceSignoffArchivePackStatus,
    signedGovernanceSignoffArchiveHash: finalization.summary.signedGovernanceSignoffArchiveHash || "",
    finalAuditSnapshotGovernanceSignoffId: finalization.summary.finalAuditSnapshotGovernanceSignoffId,
    signedFinalAuditSnapshotGovernanceSignoffHash: finalization.summary.signedFinalAuditSnapshotGovernanceSignoffHash,
    retentionArchiveFinalAuditSnapshotId: finalization.summary.retentionArchiveFinalAuditSnapshotId,
    signedRetentionArchiveFinalAuditSnapshotHash: finalization.summary.signedRetentionArchiveFinalAuditSnapshotHash,
    packageId: finalization.summary.packageId,
    packageKey: finalization.summary.packageKey,
    packageVersion: finalization.summary.packageVersion,
    governanceSignoffArchiveFinalizationSummaryPackKey: finalization.summary.governanceSignoffArchiveFinalizationSummaryPackKey,
    governanceSignoffArchiveFinalizationSummaryPackVersion: finalization.summary.governanceSignoffArchiveFinalizationSummaryPackVersion,
    finalizationStatus: finalization.summary.status,
    readinessScorePct: finalization.summary.readinessScorePct,
    finalizationSummaryPacket: finalization.finalizationSummaryPacket,
    retentionPolicy: finalization.retentionPolicy,
    safetyPolicy: finalization.safetyPolicy,
    summary: finalization.summary,
    signedGovernanceSignoffArchiveFinalizationSummaryHash: finalization.summary.signedGovernanceSignoffArchiveFinalizationSummaryHash || "",
    governanceSignoffArchiveFinalizationSummaryPackIsProductionApproval,
    governanceSignoffArchiveFinalizationSummaryPackCanLoadSignoffBytes,
    governanceSignoffArchiveFinalizationSummaryPackCanLoadSnapshotBytes,
    governanceSignoffArchiveFinalizationSummaryPackCanLoadArchiveBytes,
    governanceSignoffArchiveFinalizationSummaryPackCanLoadPackageBytes,
    governanceSignoffArchiveFinalizationSummaryPackCanPersistArtifactBytes,
    governanceSignoffArchiveFinalizationSummaryPackCanExecuteModel,
    governanceSignoffArchiveFinalizationSummaryPackCanInvokeRuntime,
    governanceSignoffArchiveFinalizationSummaryPackCanExposeInferenceEndpoint,
    governanceSignoffArchiveFinalizationSummaryPackCanActivateArtifact,
    governanceSignoffArchiveFinalizationSummaryPackCanDeployArtifact,
    governanceSignoffArchiveFinalizationSummaryPackCanProductionScore,
    governanceSignoffArchiveFinalizationSummaryPackCanScheduleRetentionJobs,
    governanceSignoffArchiveFinalizationSummaryPackCanDeleteOrPurge,
    governanceSignoffArchiveFinalizationSummaryPackMetadataOnly,
    retentionPolicyLocked,
    finalAuditSnapshotImmutable,
    governanceSignoffArchiveFinalizationIsClosureSummary,
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

  return { ...finalization, finalizationRecord };
};

export const buildMlCandidatePackageGovernanceSignoffArchiveFinalizationSummaryPackCatalogSummary = async (): Promise<MlCandidatePackageGovernanceSignoffArchiveFinalizationSummaryPackCatalogSummary> => {
  const [currentCandidatePackageGovernanceSignoffArchiveFinalizationSummaryPack, lastCandidatePackageGovernanceSignoffArchiveFinalizationSummaryPacks] = await Promise.all([
    buildInventoryStockoutCandidatePackageGovernanceSignoffArchiveFinalizationSummaryPack().then((result) => result.summary),
    listMlCandidatePackageGovernanceSignoffArchiveFinalizationSummaryPacks(10).catch(() => []),
  ]);
  return {
    generatedAt: new Date().toISOString(),
    contract: buildInventoryStockoutCandidatePackageGovernanceSignoffArchiveFinalizationSummaryPackContract(),
    currentCandidatePackageGovernanceSignoffArchiveFinalizationSummaryPack,
    lastCandidatePackageGovernanceSignoffArchiveFinalizationSummaryPacks,
    recommendedNextAction: currentCandidatePackageGovernanceSignoffArchiveFinalizationSummaryPack.recommendedNextAction,
  };
};

/* Phase 8K guard anchors: inventory_stockout_candidate_package_governance_signoff_archive_finalization_summary_pack_v1, buildInventoryStockoutCandidatePackageGovernanceSignoffArchiveFinalizationSummaryPackContract, buildInventoryStockoutCandidatePackageGovernanceSignoffArchiveFinalizationSummaryPack, prepareInventoryStockoutCandidatePackageGovernanceSignoffArchiveFinalizationSummaryPack, metadata_only_governance_signoff_archive_finalization_summary_pack, signedGovernanceSignoffArchiveHash */
