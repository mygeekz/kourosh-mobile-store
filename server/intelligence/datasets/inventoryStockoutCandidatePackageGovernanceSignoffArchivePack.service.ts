import { createHash } from "node:crypto";
import {
  getLatestMlCandidatePackageFinalAuditSnapshotGovernanceSignoff,
  listMlCandidatePackageGovernanceSignoffArchivePacks,
  recordMlCandidatePackageGovernanceSignoffArchivePack,
} from "../../db/domains/mlDatasets.db";
import type {
  CandidatePackageGovernanceSignoffArchivePackRecommendation,
  CandidatePackageGovernanceSignoffArchivePackStatus,
  InventoryStockoutCandidatePackageGovernanceSignoffArchivePackContract,
  InventoryStockoutCandidatePackageGovernanceSignoffArchivePackGate,
  InventoryStockoutCandidatePackageGovernanceSignoffArchivePackResponse,
  InventoryStockoutCandidatePackageGovernanceSignoffArchivePackSummary,
  MlCandidatePackageGovernanceSignoffArchivePackCatalogSummary,
} from "./datasetTypes";

const GOVERNANCE_SIGNOFF_ARCHIVE_PACK_KEY = "inventory_stockout_candidate_package_governance_signoff_archive_pack_v1" as const;
const GOVERNANCE_SIGNOFF_ARCHIVE_PACK_VERSION = "v1" as const;
const FINAL_AUDIT_SNAPSHOT_GOVERNANCE_SIGNOFF_KEY = "inventory_stockout_candidate_package_final_audit_snapshot_governance_signoff_gate_v1" as const;
const FINAL_AUDIT_SNAPSHOT_GOVERNANCE_SIGNOFF_VERSION = "v1" as const;
const PACKAGE_KEY = "inventory_stockout_offline_candidate_model_package_v1" as const;
const PACKAGE_VERSION = "v1" as const;
const PHASE = "Phase 8J" as const;

const governanceSignoffArchivePackIsProductionApproval = false as const;
const governanceSignoffArchivePackCanLoadSignoffBytes = false as const;
const governanceSignoffArchivePackCanLoadSnapshotBytes = false as const;
const governanceSignoffArchivePackCanLoadArchiveBytes = false as const;
const governanceSignoffArchivePackCanLoadPackageBytes = false as const;
const governanceSignoffArchivePackCanPersistArtifactBytes = false as const;
const governanceSignoffArchivePackCanExecuteModel = false as const;
const governanceSignoffArchivePackCanInvokeRuntime = false as const;
const governanceSignoffArchivePackCanExposeInferenceEndpoint = false as const;
const governanceSignoffArchivePackCanActivateArtifact = false as const;
const governanceSignoffArchivePackCanDeployArtifact = false as const;
const governanceSignoffArchivePackCanProductionScore = false as const;
const governanceSignoffArchivePackCanScheduleRetentionJobs = false as const;
const governanceSignoffArchivePackCanDeleteOrPurge = false as const;
const governanceSignoffArchivePackMetadataOnly = true as const;
const retentionPolicyLocked = true as const;
const finalAuditSnapshotImmutable = true as const;
const governanceSignoffIsFinalAuditClosure = true as const;
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
  status: InventoryStockoutCandidatePackageGovernanceSignoffArchivePackGate["status"],
  value: unknown,
  message: string,
): InventoryStockoutCandidatePackageGovernanceSignoffArchivePackGate => ({ key, label, status, value, message });

const uniqueMessages = (
  gates: InventoryStockoutCandidatePackageGovernanceSignoffArchivePackGate[],
  status: InventoryStockoutCandidatePackageGovernanceSignoffArchivePackGate["status"],
) => Array.from(new Set(gates.filter((gate) => gate.status === status).map((gate) => gate.message)));

const chooseRecommendation = (
  status: CandidatePackageGovernanceSignoffArchivePackStatus,
): CandidatePackageGovernanceSignoffArchivePackRecommendation => {
  if (status === "governance_signoff_archive_pack_ready") return "record_metadata_only_governance_signoff_archive_pack";
  if (status === "needs_phase8i_final_audit_snapshot_governance_signoff") return "record_phase8i_final_audit_snapshot_governance_signoff_first";
  if (status === "needs_signed_final_audit_snapshot_governance_signoff_hash") return "restore_signed_final_audit_snapshot_governance_signoff_hash_traceability";
  return "resolve_safety_blocks_first";
};

export const buildInventoryStockoutCandidatePackageGovernanceSignoffArchivePackContract = (): InventoryStockoutCandidatePackageGovernanceSignoffArchivePackContract => ({
  contractKey: GOVERNANCE_SIGNOFF_ARCHIVE_PACK_KEY,
  contractVersion: GOVERNANCE_SIGNOFF_ARCHIVE_PACK_VERSION,
  generatedAt: new Date().toISOString(),
  phase: PHASE,
  purpose: "Record a metadata-only archive pack for the Phase 8I final audit snapshot governance signoff without treating the archive as production approval and without enabling retention jobs, delete, purge, signoff/snapshot/archive/package loading, model execution, runtime invocation, inference, activation, deployment, production scoring, or business mutation.",
  archiveScope: "offline_candidate_package_governance_signoff_archive_metadata_only",
  requiredUpstreamFinalAuditSnapshotGovernanceSignoffKey: FINAL_AUDIT_SNAPSHOT_GOVERNANCE_SIGNOFF_KEY,
  requiredUpstreamFinalAuditSnapshotGovernanceSignoffVersion: FINAL_AUDIT_SNAPSHOT_GOVERNANCE_SIGNOFF_VERSION,
  requiredUpstreamEvidence: [
    "Persisted Phase 8I candidate package final audit snapshot governance signoff row",
    "Phase 8I signoff_status is final_audit_snapshot_governance_signoff_ready",
    "Signed Phase 8I final audit snapshot governance signoff hash for archive traceability",
    "Phase 8I safety policy confirms no production approval, retention execution, delete, purge, loading, runtime, inference, activation, deployment, production scoring, or business mutation",
  ],
  includedArchiveSections: [
    "candidate-package-governance-signoff-archive-packet.json",
    "candidate-package-governance-signoff-archive-policy.json",
    "candidate-package-governance-signoff-archive-retention-policy.json",
    "candidate-package-governance-signoff-archive-safety-policy.json",
    "candidate-package-governance-signoff-archive-summary.json",
  ],
  forbiddenBehavior: [
    "Do not schedule retention jobs in Phase 8J.",
    "Do not delete, purge, overwrite, or mutate signoff/snapshot/archive/package/artifact records.",
    "Do not load signoff bytes, snapshot bytes, archive bytes, package bytes, or artifact bytes.",
    "Do not execute, invoke, train, activate, deploy, or production-score any model artifact.",
    "Do not add /infer, /execute, /activate, /deploy, /production-score, or /approve-production routes.",
    "Do not treat this archive pack as production approval, deployment approval, model approval, retention execution approval, or artifact activation approval.",
    "Do not mutate inventory, accounting, ledger, pricing, reports, or business records.",
  ],
  operationalPolicy: {
    governanceSignoffArchivePackIsProductionApproval,
    governanceSignoffArchivePackCanLoadSignoffBytes,
    governanceSignoffArchivePackCanLoadSnapshotBytes,
    governanceSignoffArchivePackCanLoadArchiveBytes,
    governanceSignoffArchivePackCanLoadPackageBytes,
    governanceSignoffArchivePackCanPersistArtifactBytes,
    governanceSignoffArchivePackCanExecuteModel,
    governanceSignoffArchivePackCanInvokeRuntime,
    governanceSignoffArchivePackCanExposeInferenceEndpoint,
    governanceSignoffArchivePackCanActivateArtifact,
    governanceSignoffArchivePackCanDeployArtifact,
    governanceSignoffArchivePackCanProductionScore,
    governanceSignoffArchivePackCanScheduleRetentionJobs,
    governanceSignoffArchivePackCanDeleteOrPurge,
    governanceSignoffArchivePackMetadataOnly,
    retentionPolicyLocked,
    finalAuditSnapshotImmutable,
    governanceSignoffIsFinalAuditClosure,
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

export const buildInventoryStockoutCandidatePackageGovernanceSignoffArchivePack = async (
  _options: Record<string, unknown> = {},
): Promise<InventoryStockoutCandidatePackageGovernanceSignoffArchivePackResponse> => {
  const generatedAt = new Date().toISOString();
  const contract = buildInventoryStockoutCandidatePackageGovernanceSignoffArchivePackContract();
  const latestFinalAuditSnapshotGovernanceSignoff = await getLatestMlCandidatePackageFinalAuditSnapshotGovernanceSignoff().catch(() => null) as Record<string, unknown> | null;
  const finalAuditSnapshotGovernanceSignoffId = asNumber(latestFinalAuditSnapshotGovernanceSignoff?.id);
  const finalAuditSnapshotGovernanceSignoffStatus = asString(latestFinalAuditSnapshotGovernanceSignoff?.signoffStatus);
  const signedFinalAuditSnapshotGovernanceSignoffHash = asString(latestFinalAuditSnapshotGovernanceSignoff?.signedFinalAuditSnapshotGovernanceSignoffHash);
  const retentionArchiveFinalAuditSnapshotId = asNumber(latestFinalAuditSnapshotGovernanceSignoff?.retentionArchiveFinalAuditSnapshotId);
  const signedRetentionArchiveFinalAuditSnapshotHash = asString(latestFinalAuditSnapshotGovernanceSignoff?.signedRetentionArchiveFinalAuditSnapshotHash);
  const packageId = asNumber(latestFinalAuditSnapshotGovernanceSignoff?.packageId);
  const persistedGovernanceSignoffExists = Boolean(finalAuditSnapshotGovernanceSignoffId);
  const upstreamGovernanceSignoffReady = finalAuditSnapshotGovernanceSignoffStatus === "final_audit_snapshot_governance_signoff_ready";

  const safetyPolicyStillDisabled =
    governanceSignoffArchivePackIsProductionApproval === false &&
    governanceSignoffArchivePackCanLoadSignoffBytes === false &&
    governanceSignoffArchivePackCanLoadSnapshotBytes === false &&
    governanceSignoffArchivePackCanLoadArchiveBytes === false &&
    governanceSignoffArchivePackCanLoadPackageBytes === false &&
    governanceSignoffArchivePackCanPersistArtifactBytes === false &&
    governanceSignoffArchivePackCanExecuteModel === false &&
    governanceSignoffArchivePackCanInvokeRuntime === false &&
    governanceSignoffArchivePackCanExposeInferenceEndpoint === false &&
    governanceSignoffArchivePackCanActivateArtifact === false &&
    governanceSignoffArchivePackCanDeployArtifact === false &&
    governanceSignoffArchivePackCanProductionScore === false &&
    governanceSignoffArchivePackCanScheduleRetentionJobs === false &&
    governanceSignoffArchivePackCanDeleteOrPurge === false &&
    governanceSignoffArchivePackMetadataOnly === true &&
    retentionPolicyLocked === true &&
    finalAuditSnapshotImmutable === true &&
    governanceSignoffIsFinalAuditClosure === true &&
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
    policyKey: "candidate_package_governance_signoff_archive_retention_policy_v1",
    policyVersion: "v1",
    generatedAt,
    retentionMode: "metadata_archive_reference_only",
    retentionPolicyLocked,
    retentionExecutionAllowed,
    retentionJobSchedulingAllowed: governanceSignoffArchivePackCanScheduleRetentionJobs,
    automaticDeletionAllowed,
    purgeJobAllowed,
    notes: [
      "Phase 8J records governance signoff archive metadata only.",
      "No signoff, snapshot, archive, package, or artifact bytes are loaded or persisted.",
      "No delete, purge, or retention job execution is enabled.",
    ],
  };

  const gates: InventoryStockoutCandidatePackageGovernanceSignoffArchivePackGate[] = [
    buildGate("persisted_phase8i_final_audit_snapshot_governance_signoff_exists", "Persisted Phase 8I Final Audit Snapshot Governance Signoff", persistedGovernanceSignoffExists ? "pass" : "block", finalAuditSnapshotGovernanceSignoffId, persistedGovernanceSignoffExists ? "A persisted Phase 8I final audit snapshot governance signoff metadata row exists." : "Record a Phase 8I final audit snapshot governance signoff before building the Phase 8J archive pack."),
    buildGate("phase8i_final_audit_snapshot_governance_signoff_ready", "Phase 8I Governance Signoff Ready", upstreamGovernanceSignoffReady ? "pass" : "block", finalAuditSnapshotGovernanceSignoffStatus, upstreamGovernanceSignoffReady ? "Phase 8I final audit snapshot governance signoff status is final_audit_snapshot_governance_signoff_ready." : "Phase 8I final audit snapshot governance signoff must be final_audit_snapshot_governance_signoff_ready before archive packaging."),
    buildGate("signed_final_audit_snapshot_governance_signoff_hash_present", "Signed Final Audit Snapshot Governance Signoff Hash", signedFinalAuditSnapshotGovernanceSignoffHash ? "pass" : "block", signedFinalAuditSnapshotGovernanceSignoffHash, signedFinalAuditSnapshotGovernanceSignoffHash ? "A signed Phase 8I governance signoff hash is available for archive traceability." : "Restore signedFinalAuditSnapshotGovernanceSignoffHash before building the Phase 8J archive pack."),
    buildGate("retention_policy_locked", "Retention Policy Locked", retentionPolicyLocked ? "pass" : "block", retentionPolicyLocked, retentionPolicyLocked ? "Retention policy remains locked and metadata-only." : "Retention policy must stay locked before governance signoff archival."),
    buildGate("safety_policy_disabled", "Safety Policy Disabled", safetyPolicyStillDisabled ? "pass" : "block", safetyPolicyStillDisabled, safetyPolicyStillDisabled ? "Production approval, execution, inference, activation, deploy, production scoring, retention jobs, delete/purge, loading, and business mutation remain disabled." : "A Phase 8J safety policy flag is not disabled."),
  ];

  let status: CandidatePackageGovernanceSignoffArchivePackStatus = "governance_signoff_archive_pack_ready";
  if (!persistedGovernanceSignoffExists || !upstreamGovernanceSignoffReady) {
    status = "needs_phase8i_final_audit_snapshot_governance_signoff";
  } else if (!signedFinalAuditSnapshotGovernanceSignoffHash) {
    status = "needs_signed_final_audit_snapshot_governance_signoff_hash";
  } else if (!safetyPolicyStillDisabled) {
    status = "safety_blocked";
  }

  const blockers = uniqueMessages(gates, "block");
  const warnings = uniqueMessages(gates, "warning");
  const passCount = gates.filter((gate) => gate.status === "pass").length;
  const readinessScorePct = Math.round((passCount / gates.length) * 100);

  const safetyPolicy = {
    policyKey: "candidate_package_governance_signoff_archive_safety_policy_v1",
    generatedAt,
    governanceSignoffArchivePackIsProductionApproval,
    governanceSignoffArchivePackCanLoadSignoffBytes,
    governanceSignoffArchivePackCanLoadSnapshotBytes,
    governanceSignoffArchivePackCanLoadArchiveBytes,
    governanceSignoffArchivePackCanLoadPackageBytes,
    governanceSignoffArchivePackCanPersistArtifactBytes,
    governanceSignoffArchivePackCanExecuteModel,
    governanceSignoffArchivePackCanInvokeRuntime,
    governanceSignoffArchivePackCanExposeInferenceEndpoint,
    governanceSignoffArchivePackCanActivateArtifact,
    governanceSignoffArchivePackCanDeployArtifact,
    governanceSignoffArchivePackCanProductionScore,
    governanceSignoffArchivePackCanScheduleRetentionJobs,
    governanceSignoffArchivePackCanDeleteOrPurge,
    governanceSignoffArchivePackMetadataOnly,
    retentionPolicyLocked,
    finalAuditSnapshotImmutable,
    governanceSignoffIsFinalAuditClosure,
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

  const archivePacket = {
    archiveKey: GOVERNANCE_SIGNOFF_ARCHIVE_PACK_KEY,
    archiveVersion: GOVERNANCE_SIGNOFF_ARCHIVE_PACK_VERSION,
    generatedAt,
    archiveMode: "metadata_only_governance_signoff_archive_pack",
    upstream: {
      finalAuditSnapshotGovernanceSignoffId,
      finalAuditSnapshotGovernanceSignoffKey: FINAL_AUDIT_SNAPSHOT_GOVERNANCE_SIGNOFF_KEY,
      finalAuditSnapshotGovernanceSignoffVersion: FINAL_AUDIT_SNAPSHOT_GOVERNANCE_SIGNOFF_VERSION,
      finalAuditSnapshotGovernanceSignoffStatus,
      signedFinalAuditSnapshotGovernanceSignoffHash,
      retentionArchiveFinalAuditSnapshotId,
      signedRetentionArchiveFinalAuditSnapshotHash,
      packageId,
    },
    sections: contract.includedArchiveSections,
    retentionPolicy,
    safetyPolicy,
  };

  const signedGovernanceSignoffArchiveHash = status === "governance_signoff_archive_pack_ready"
    ? sha256({ archivePacket, retentionPolicy, safetyPolicy, upstreamHash: signedFinalAuditSnapshotGovernanceSignoffHash })
    : null;

  const summary: InventoryStockoutCandidatePackageGovernanceSignoffArchivePackSummary = {
    governanceSignoffArchivePackKey: GOVERNANCE_SIGNOFF_ARCHIVE_PACK_KEY,
    governanceSignoffArchivePackVersion: GOVERNANCE_SIGNOFF_ARCHIVE_PACK_VERSION,
    generatedAt,
    phase: PHASE,
    status,
    recommendation: chooseRecommendation(status),
    readinessScorePct,
    finalAuditSnapshotGovernanceSignoffId,
    finalAuditSnapshotGovernanceSignoffKey: FINAL_AUDIT_SNAPSHOT_GOVERNANCE_SIGNOFF_KEY,
    finalAuditSnapshotGovernanceSignoffVersion: FINAL_AUDIT_SNAPSHOT_GOVERNANCE_SIGNOFF_VERSION,
    finalAuditSnapshotGovernanceSignoffStatus,
    signedFinalAuditSnapshotGovernanceSignoffHash,
    retentionArchiveFinalAuditSnapshotId,
    signedRetentionArchiveFinalAuditSnapshotHash,
    packageId,
    packageKey: PACKAGE_KEY,
    packageVersion: PACKAGE_VERSION,
    governanceSignoffArchiveMode: "metadata_only_governance_signoff_archive_pack",
    governanceSignoffArchivePackIsProductionApproval,
    governanceSignoffArchivePackCanLoadSignoffBytes,
    governanceSignoffArchivePackCanLoadSnapshotBytes,
    governanceSignoffArchivePackCanLoadArchiveBytes,
    governanceSignoffArchivePackCanLoadPackageBytes,
    governanceSignoffArchivePackCanPersistArtifactBytes,
    governanceSignoffArchivePackCanExecuteModel,
    governanceSignoffArchivePackCanInvokeRuntime,
    governanceSignoffArchivePackCanExposeInferenceEndpoint,
    governanceSignoffArchivePackCanActivateArtifact,
    governanceSignoffArchivePackCanDeployArtifact,
    governanceSignoffArchivePackCanProductionScore,
    governanceSignoffArchivePackCanScheduleRetentionJobs,
    governanceSignoffArchivePackCanDeleteOrPurge,
    governanceSignoffArchivePackMetadataOnly,
    retentionPolicyLocked,
    finalAuditSnapshotImmutable,
    governanceSignoffIsFinalAuditClosure,
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
    signedGovernanceSignoffArchiveHash,
    recommendedNextAction: chooseRecommendation(status),
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

export const prepareInventoryStockoutCandidatePackageGovernanceSignoffArchivePack = async (
  options: Record<string, unknown> = {},
): Promise<InventoryStockoutCandidatePackageGovernanceSignoffArchivePackResponse> => {
  const archive = await buildInventoryStockoutCandidatePackageGovernanceSignoffArchivePack(options);
  if (archive.summary.status !== "governance_signoff_archive_pack_ready" || !archive.summary.signedGovernanceSignoffArchiveHash) return archive;

  const archiveRecord = await recordMlCandidatePackageGovernanceSignoffArchivePack({
    finalAuditSnapshotGovernanceSignoffId: archive.summary.finalAuditSnapshotGovernanceSignoffId,
    finalAuditSnapshotGovernanceSignoffKey: archive.summary.finalAuditSnapshotGovernanceSignoffKey,
    finalAuditSnapshotGovernanceSignoffVersion: archive.summary.finalAuditSnapshotGovernanceSignoffVersion,
    finalAuditSnapshotGovernanceSignoffStatus: archive.summary.finalAuditSnapshotGovernanceSignoffStatus,
    signedFinalAuditSnapshotGovernanceSignoffHash: archive.summary.signedFinalAuditSnapshotGovernanceSignoffHash || "",
    retentionArchiveFinalAuditSnapshotId: archive.summary.retentionArchiveFinalAuditSnapshotId,
    signedRetentionArchiveFinalAuditSnapshotHash: archive.summary.signedRetentionArchiveFinalAuditSnapshotHash,
    packageId: archive.summary.packageId,
    packageKey: archive.summary.packageKey,
    packageVersion: archive.summary.packageVersion,
    governanceSignoffArchivePackKey: archive.summary.governanceSignoffArchivePackKey,
    governanceSignoffArchivePackVersion: archive.summary.governanceSignoffArchivePackVersion,
    archiveStatus: archive.summary.status,
    readinessScorePct: archive.summary.readinessScorePct,
    archivePacket: archive.archivePacket,
    retentionPolicy: archive.retentionPolicy,
    safetyPolicy: archive.safetyPolicy,
    summary: archive.summary,
    signedGovernanceSignoffArchiveHash: archive.summary.signedGovernanceSignoffArchiveHash || "",
    governanceSignoffArchivePackIsProductionApproval,
    governanceSignoffArchivePackCanLoadSignoffBytes,
    governanceSignoffArchivePackCanLoadSnapshotBytes,
    governanceSignoffArchivePackCanLoadArchiveBytes,
    governanceSignoffArchivePackCanLoadPackageBytes,
    governanceSignoffArchivePackCanPersistArtifactBytes,
    governanceSignoffArchivePackCanExecuteModel,
    governanceSignoffArchivePackCanInvokeRuntime,
    governanceSignoffArchivePackCanExposeInferenceEndpoint,
    governanceSignoffArchivePackCanActivateArtifact,
    governanceSignoffArchivePackCanDeployArtifact,
    governanceSignoffArchivePackCanProductionScore,
    governanceSignoffArchivePackCanScheduleRetentionJobs,
    governanceSignoffArchivePackCanDeleteOrPurge,
    governanceSignoffArchivePackMetadataOnly,
    retentionPolicyLocked,
    finalAuditSnapshotImmutable,
    governanceSignoffIsFinalAuditClosure,
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

  return { ...archive, archiveRecord };
};

export const buildMlCandidatePackageGovernanceSignoffArchivePackCatalogSummary = async (): Promise<MlCandidatePackageGovernanceSignoffArchivePackCatalogSummary> => {
  const [currentCandidatePackageGovernanceSignoffArchivePack, lastCandidatePackageGovernanceSignoffArchivePacks] = await Promise.all([
    buildInventoryStockoutCandidatePackageGovernanceSignoffArchivePack().then((result) => result.summary),
    listMlCandidatePackageGovernanceSignoffArchivePacks(10).catch(() => []),
  ]);
  return {
    generatedAt: new Date().toISOString(),
    contract: buildInventoryStockoutCandidatePackageGovernanceSignoffArchivePackContract(),
    currentCandidatePackageGovernanceSignoffArchivePack,
    lastCandidatePackageGovernanceSignoffArchivePacks,
    recommendedNextAction: currentCandidatePackageGovernanceSignoffArchivePack.recommendedNextAction,
  };
};

/* Phase 8J guard anchors: inventory_stockout_candidate_package_governance_signoff_archive_pack_v1, buildInventoryStockoutCandidatePackageGovernanceSignoffArchivePackContract, buildInventoryStockoutCandidatePackageGovernanceSignoffArchivePack, prepareInventoryStockoutCandidatePackageGovernanceSignoffArchivePack, metadata_only_governance_signoff_archive_pack, signedFinalAuditSnapshotGovernanceSignoffHash */
