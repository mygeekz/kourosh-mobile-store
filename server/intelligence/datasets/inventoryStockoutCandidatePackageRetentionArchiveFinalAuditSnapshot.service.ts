import { createHash } from "node:crypto";
import {
  getLatestMlCandidatePackageRetentionSignoffArchivePack,
  listMlCandidatePackageRetentionArchiveFinalAuditSnapshots,
  recordMlCandidatePackageRetentionArchiveFinalAuditSnapshot,
} from "../../db/domains/mlDatasets.db";
import type {
  CandidatePackageRetentionArchiveFinalAuditSnapshotRecommendation,
  CandidatePackageRetentionArchiveFinalAuditSnapshotStatus,
  InventoryStockoutCandidatePackageRetentionArchiveFinalAuditSnapshotContract,
  InventoryStockoutCandidatePackageRetentionArchiveFinalAuditSnapshotGate,
  InventoryStockoutCandidatePackageRetentionArchiveFinalAuditSnapshotResponse,
  InventoryStockoutCandidatePackageRetentionArchiveFinalAuditSnapshotSummary,
  MlCandidatePackageRetentionArchiveFinalAuditSnapshotCatalogSummary,
} from "./datasetTypes";

const RETENTION_ARCHIVE_FINAL_AUDIT_SNAPSHOT_KEY = "inventory_stockout_candidate_package_retention_archive_final_audit_snapshot_v1" as const;
const RETENTION_ARCHIVE_FINAL_AUDIT_SNAPSHOT_VERSION = "v1" as const;
const RETENTION_SIGNOFF_ARCHIVE_PACK_KEY = "inventory_stockout_candidate_package_retention_signoff_archive_pack_v1" as const;
const RETENTION_SIGNOFF_ARCHIVE_PACK_VERSION = "v1" as const;
const PACKAGE_KEY = "inventory_stockout_offline_candidate_model_package_v1" as const;
const PACKAGE_VERSION = "v1" as const;
const PHASE = "Phase 8H" as const;

const retentionArchiveFinalAuditSnapshotIsProductionApproval = false as const;
const retentionArchiveFinalAuditSnapshotCanLoadArchiveBytes = false as const;
const retentionArchiveFinalAuditSnapshotCanLoadPackageBytes = false as const;
const retentionArchiveFinalAuditSnapshotCanPersistArtifactBytes = false as const;
const retentionArchiveFinalAuditSnapshotCanExecuteModel = false as const;
const retentionArchiveFinalAuditSnapshotCanInvokeRuntime = false as const;
const retentionArchiveFinalAuditSnapshotCanExposeInferenceEndpoint = false as const;
const retentionArchiveFinalAuditSnapshotCanActivateArtifact = false as const;
const retentionArchiveFinalAuditSnapshotCanDeployArtifact = false as const;
const retentionArchiveFinalAuditSnapshotCanProductionScore = false as const;
const retentionArchiveFinalAuditSnapshotCanScheduleRetentionJobs = false as const;
const retentionArchiveFinalAuditSnapshotCanDeleteOrPurge = false as const;
const retentionArchiveFinalAuditSnapshotMetadataOnly = true as const;
const retentionPolicyLocked = true as const;
const finalAuditSnapshotImmutable = true as const;
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
  status: InventoryStockoutCandidatePackageRetentionArchiveFinalAuditSnapshotGate["status"],
  value: unknown,
  message: string,
): InventoryStockoutCandidatePackageRetentionArchiveFinalAuditSnapshotGate => ({ key, label, status, value, message });

const uniqueMessages = (
  gates: InventoryStockoutCandidatePackageRetentionArchiveFinalAuditSnapshotGate[],
  status: InventoryStockoutCandidatePackageRetentionArchiveFinalAuditSnapshotGate["status"],
) => Array.from(new Set(gates.filter((gate) => gate.status === status).map((gate) => gate.message)));

const chooseRecommendation = (
  status: CandidatePackageRetentionArchiveFinalAuditSnapshotStatus,
): CandidatePackageRetentionArchiveFinalAuditSnapshotRecommendation => {
  if (status === "retention_archive_final_audit_snapshot_ready") return "record_metadata_only_retention_archive_final_audit_snapshot";
  if (status === "needs_phase8g_retention_signoff_archive_pack") return "record_phase8g_retention_signoff_archive_pack_first";
  if (status === "needs_signed_retention_signoff_archive_hash") return "restore_signed_retention_signoff_archive_hash_traceability";
  return "resolve_safety_blocks_first";
};

export const buildInventoryStockoutCandidatePackageRetentionArchiveFinalAuditSnapshotContract = (): InventoryStockoutCandidatePackageRetentionArchiveFinalAuditSnapshotContract => ({
  contractKey: RETENTION_ARCHIVE_FINAL_AUDIT_SNAPSHOT_KEY,
  contractVersion: RETENTION_ARCHIVE_FINAL_AUDIT_SNAPSHOT_VERSION,
  generatedAt: new Date().toISOString(),
  phase: PHASE,
  purpose: "Create a metadata-only final audit snapshot for the Phase 8G retention signoff archive pack without making the snapshot a production approval and without enabling retention jobs, delete, purge, archive/package loading, model execution, runtime invocation, inference, activation, deployment, production scoring, or business mutation.",
  auditScope: "offline_candidate_package_retention_archive_final_audit_snapshot_metadata_only",
  requiredUpstreamRetentionSignoffArchivePackKey: RETENTION_SIGNOFF_ARCHIVE_PACK_KEY,
  requiredUpstreamRetentionSignoffArchivePackVersion: RETENTION_SIGNOFF_ARCHIVE_PACK_VERSION,
  requiredUpstreamEvidence: [
    "Persisted Phase 8G candidate package retention signoff archive pack row",
    "Phase 8G archive_status is retention_signoff_archive_pack_ready",
    "Signed Phase 8G retention signoff archive hash for immutable final-audit traceability",
    "Phase 8G safety policy confirms no retention execution, delete, purge, loading, runtime, inference, activation, deployment, production scoring, or business mutation",
  ],
  includedAuditSections: [
    "candidate-package-retention-archive-final-audit-snapshot.json",
    "candidate-package-retention-archive-final-audit-retention-policy.json",
    "candidate-package-retention-archive-final-audit-safety-policy.json",
    "candidate-package-retention-archive-final-audit-summary.json",
  ],
  forbiddenBehavior: [
    "Do not schedule retention jobs in Phase 8H.",
    "Do not delete, purge, overwrite, or mutate archive/package/artifact records.",
    "Do not load archive bytes, package bytes, or artifact bytes.",
    "Do not execute, invoke, train, activate, deploy, or production-score any model artifact.",
    "Do not add /infer, /execute, /activate, /deploy, or /production-score routes.",
    "Do not treat this final audit snapshot as production approval, deployment approval, or retention execution approval.",
    "Do not mutate inventory, accounting, ledger, pricing, reports, or business records.",
  ],
  operationalPolicy: {
    retentionArchiveFinalAuditSnapshotIsProductionApproval,
    retentionArchiveFinalAuditSnapshotCanLoadArchiveBytes,
    retentionArchiveFinalAuditSnapshotCanLoadPackageBytes,
    retentionArchiveFinalAuditSnapshotCanPersistArtifactBytes,
    retentionArchiveFinalAuditSnapshotCanExecuteModel,
    retentionArchiveFinalAuditSnapshotCanInvokeRuntime,
    retentionArchiveFinalAuditSnapshotCanExposeInferenceEndpoint,
    retentionArchiveFinalAuditSnapshotCanActivateArtifact,
    retentionArchiveFinalAuditSnapshotCanDeployArtifact,
    retentionArchiveFinalAuditSnapshotCanProductionScore,
    retentionArchiveFinalAuditSnapshotCanScheduleRetentionJobs,
    retentionArchiveFinalAuditSnapshotCanDeleteOrPurge,
    retentionArchiveFinalAuditSnapshotMetadataOnly,
    retentionPolicyLocked,
    finalAuditSnapshotImmutable,
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

export const buildInventoryStockoutCandidatePackageRetentionArchiveFinalAuditSnapshot = async (
  _options: Record<string, unknown> = {},
): Promise<InventoryStockoutCandidatePackageRetentionArchiveFinalAuditSnapshotResponse> => {
  const generatedAt = new Date().toISOString();
  const contract = buildInventoryStockoutCandidatePackageRetentionArchiveFinalAuditSnapshotContract();
  const latestRetentionSignoffArchivePack = await getLatestMlCandidatePackageRetentionSignoffArchivePack().catch(() => null) as Record<string, unknown> | null;
  const retentionSignoffArchivePackId = asNumber(latestRetentionSignoffArchivePack?.id);
  const retentionSignoffArchivePackStatus = asString(latestRetentionSignoffArchivePack?.archiveStatus);
  const signedRetentionSignoffArchiveHash = asString(latestRetentionSignoffArchivePack?.signedRetentionSignoffArchiveHash);
  const retentionReviewSignoffId = asNumber(latestRetentionSignoffArchivePack?.retentionReviewSignoffId);
  const signedRetentionReviewSignoffHash = asString(latestRetentionSignoffArchivePack?.signedRetentionReviewSignoffHash);
  const packageId = asNumber(latestRetentionSignoffArchivePack?.packageId);
  const persistedArchivePackExists = Boolean(retentionSignoffArchivePackId);
  const upstreamArchivePackReady = retentionSignoffArchivePackStatus === "retention_signoff_archive_pack_ready";

  const safetyPolicyStillDisabled =
    retentionArchiveFinalAuditSnapshotIsProductionApproval === false &&
    retentionArchiveFinalAuditSnapshotCanLoadArchiveBytes === false &&
    retentionArchiveFinalAuditSnapshotCanLoadPackageBytes === false &&
    retentionArchiveFinalAuditSnapshotCanPersistArtifactBytes === false &&
    retentionArchiveFinalAuditSnapshotCanExecuteModel === false &&
    retentionArchiveFinalAuditSnapshotCanInvokeRuntime === false &&
    retentionArchiveFinalAuditSnapshotCanExposeInferenceEndpoint === false &&
    retentionArchiveFinalAuditSnapshotCanActivateArtifact === false &&
    retentionArchiveFinalAuditSnapshotCanDeployArtifact === false &&
    retentionArchiveFinalAuditSnapshotCanProductionScore === false &&
    retentionArchiveFinalAuditSnapshotCanScheduleRetentionJobs === false &&
    retentionArchiveFinalAuditSnapshotCanDeleteOrPurge === false &&
    retentionArchiveFinalAuditSnapshotMetadataOnly === true &&
    retentionPolicyLocked === true &&
    finalAuditSnapshotImmutable === true &&
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
    retentionPolicyLocked,
    finalAuditSnapshotImmutable,
    retentionExecutionAllowed,
    automaticDeletionAllowed,
    purgeJobAllowed,
    retentionJobSchedulingAllowed: false,
    deletionOrPurgeAllowed: false,
    manualReviewRequiredBeforeAnyFutureRetentionExecution: true,
    generatedAt,
  };

  const gates = [
    buildGate("persisted_phase8g_retention_signoff_archive_pack_exists", "Persisted Phase 8G Retention Signoff Archive Pack", persistedArchivePackExists ? "pass" : "block", retentionSignoffArchivePackId, persistedArchivePackExists ? "A persisted Phase 8G retention signoff archive pack metadata row exists." : "Record a Phase 8G retention signoff archive pack before building the Phase 8H final audit snapshot."),
    buildGate("phase8g_retention_signoff_archive_pack_ready", "Phase 8G Retention Signoff Archive Pack Ready", upstreamArchivePackReady ? "pass" : "block", retentionSignoffArchivePackStatus, upstreamArchivePackReady ? "Phase 8G archive status is retention_signoff_archive_pack_ready." : "Phase 8G archive status must be retention_signoff_archive_pack_ready before final audit snapshotting."),
    buildGate("signed_retention_signoff_archive_hash_present", "Signed Retention Signoff Archive Hash", signedRetentionSignoffArchiveHash ? "pass" : "block", signedRetentionSignoffArchiveHash, signedRetentionSignoffArchiveHash ? "A signed Phase 8G retention signoff archive hash is available for final-audit traceability." : "Restore signedRetentionSignoffArchiveHash before building the Phase 8H final audit snapshot."),
    buildGate("retention_policy_locked", "Retention Policy Locked", retentionPolicyLocked ? "pass" : "block", retentionPolicyLocked, retentionPolicyLocked ? "Retention policy remains locked and metadata-only." : "Retention policy must stay locked before final audit snapshotting."),
    buildGate("final_audit_snapshot_immutable", "Final Audit Snapshot Immutable", finalAuditSnapshotImmutable ? "pass" : "block", finalAuditSnapshotImmutable, finalAuditSnapshotImmutable ? "The final audit snapshot is immutable metadata." : "Final audit snapshot immutability must remain enabled."),
    buildGate("safety_policy_disabled", "Safety Policy Disabled", safetyPolicyStillDisabled ? "pass" : "block", safetyPolicyStillDisabled, safetyPolicyStillDisabled ? "Execution, inference, activation, deploy, production scoring, retention jobs, delete/purge, loading, and business mutation remain disabled." : "A Phase 8H safety policy flag is not disabled."),
  ];

  let status: CandidatePackageRetentionArchiveFinalAuditSnapshotStatus = "retention_archive_final_audit_snapshot_ready";
  if (!persistedArchivePackExists || !upstreamArchivePackReady) status = "needs_phase8g_retention_signoff_archive_pack";
  else if (!signedRetentionSignoffArchiveHash) status = "needs_signed_retention_signoff_archive_hash";
  else if (!safetyPolicyStillDisabled || !retentionPolicyLocked || !finalAuditSnapshotImmutable) status = "safety_blocked";

  const blockers = uniqueMessages(gates, "block");
  const warnings = uniqueMessages(gates, "warning");
  const passCount = gates.filter((gate) => gate.status === "pass").length;
  const readinessScorePct = Math.round((passCount / gates.length) * 100);
  const recommendation = chooseRecommendation(status);
  const signedRetentionArchiveFinalAuditSnapshotHash = status === "retention_archive_final_audit_snapshot_ready"
    ? sha256({
        key: RETENTION_ARCHIVE_FINAL_AUDIT_SNAPSHOT_KEY,
        version: RETENTION_ARCHIVE_FINAL_AUDIT_SNAPSHOT_VERSION,
        retentionSignoffArchivePackId,
        signedRetentionSignoffArchiveHash,
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

  const summary: InventoryStockoutCandidatePackageRetentionArchiveFinalAuditSnapshotSummary = {
    retentionArchiveFinalAuditSnapshotKey: RETENTION_ARCHIVE_FINAL_AUDIT_SNAPSHOT_KEY,
    retentionArchiveFinalAuditSnapshotVersion: RETENTION_ARCHIVE_FINAL_AUDIT_SNAPSHOT_VERSION,
    generatedAt,
    phase: PHASE,
    status,
    recommendation,
    readinessScorePct,
    retentionSignoffArchivePackId,
    retentionSignoffArchivePackKey: RETENTION_SIGNOFF_ARCHIVE_PACK_KEY,
    retentionSignoffArchivePackVersion: RETENTION_SIGNOFF_ARCHIVE_PACK_VERSION,
    retentionSignoffArchivePackStatus,
    signedRetentionSignoffArchiveHash,
    retentionReviewSignoffId,
    signedRetentionReviewSignoffHash,
    packageId,
    packageKey: PACKAGE_KEY,
    packageVersion: PACKAGE_VERSION,
    retentionArchiveFinalAuditSnapshotMode: "metadata_only_retention_archive_final_audit_snapshot",
    retentionArchiveFinalAuditSnapshotIsProductionApproval,
    retentionArchiveFinalAuditSnapshotCanLoadArchiveBytes,
    retentionArchiveFinalAuditSnapshotCanLoadPackageBytes,
    retentionArchiveFinalAuditSnapshotCanPersistArtifactBytes,
    retentionArchiveFinalAuditSnapshotCanExecuteModel,
    retentionArchiveFinalAuditSnapshotCanInvokeRuntime,
    retentionArchiveFinalAuditSnapshotCanExposeInferenceEndpoint,
    retentionArchiveFinalAuditSnapshotCanActivateArtifact,
    retentionArchiveFinalAuditSnapshotCanDeployArtifact,
    retentionArchiveFinalAuditSnapshotCanProductionScore,
    retentionArchiveFinalAuditSnapshotCanScheduleRetentionJobs,
    retentionArchiveFinalAuditSnapshotCanDeleteOrPurge,
    retentionArchiveFinalAuditSnapshotMetadataOnly,
    retentionPolicyLocked,
    finalAuditSnapshotImmutable,
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
    signedRetentionArchiveFinalAuditSnapshotHash,
    recommendedNextAction: recommendation,
  };

  const auditSnapshot = {
    auditSnapshotKey: RETENTION_ARCHIVE_FINAL_AUDIT_SNAPSHOT_KEY,
    auditSnapshotVersion: RETENTION_ARCHIVE_FINAL_AUDIT_SNAPSHOT_VERSION,
    generatedAt,
    phase: PHASE,
    upstreamRetentionSignoffArchivePack: {
      retentionSignoffArchivePackId,
      retentionSignoffArchivePackKey: RETENTION_SIGNOFF_ARCHIVE_PACK_KEY,
      retentionSignoffArchivePackVersion: RETENTION_SIGNOFF_ARCHIVE_PACK_VERSION,
      retentionSignoffArchivePackStatus,
      signedRetentionSignoffArchiveHash,
      retentionReviewSignoffId,
      signedRetentionReviewSignoffHash,
      packageId,
    },
    summary,
    retentionPolicy,
    safetyPolicy,
    auditSections: contract.includedAuditSections,
  };

  return {
    success: true,
    contract,
    summary,
    gates,
    auditSnapshot,
    retentionPolicy,
    safetyPolicy,
  };
};

export const prepareInventoryStockoutCandidatePackageRetentionArchiveFinalAuditSnapshot = async (
  options: Record<string, unknown> = {},
): Promise<InventoryStockoutCandidatePackageRetentionArchiveFinalAuditSnapshotResponse> => {
  const snapshot = await buildInventoryStockoutCandidatePackageRetentionArchiveFinalAuditSnapshot(options);
  if (snapshot.summary.status !== "retention_archive_final_audit_snapshot_ready") return snapshot;

  const snapshotRecord = await recordMlCandidatePackageRetentionArchiveFinalAuditSnapshot({
    retentionSignoffArchivePackId: snapshot.summary.retentionSignoffArchivePackId,
    retentionSignoffArchivePackKey: snapshot.summary.retentionSignoffArchivePackKey,
    retentionSignoffArchivePackVersion: snapshot.summary.retentionSignoffArchivePackVersion,
    retentionSignoffArchivePackStatus: snapshot.summary.retentionSignoffArchivePackStatus,
    signedRetentionSignoffArchiveHash: snapshot.summary.signedRetentionSignoffArchiveHash || "",
    retentionReviewSignoffId: snapshot.summary.retentionReviewSignoffId,
    signedRetentionReviewSignoffHash: snapshot.summary.signedRetentionReviewSignoffHash,
    packageId: snapshot.summary.packageId,
    packageKey: snapshot.summary.packageKey,
    packageVersion: snapshot.summary.packageVersion,
    retentionArchiveFinalAuditSnapshotKey: snapshot.summary.retentionArchiveFinalAuditSnapshotKey,
    retentionArchiveFinalAuditSnapshotVersion: snapshot.summary.retentionArchiveFinalAuditSnapshotVersion,
    snapshotStatus: snapshot.summary.status,
    readinessScorePct: snapshot.summary.readinessScorePct,
    auditSnapshot: snapshot.auditSnapshot,
    retentionPolicy: snapshot.retentionPolicy,
    safetyPolicy: snapshot.safetyPolicy,
    summary: snapshot.summary,
    signedRetentionArchiveFinalAuditSnapshotHash: snapshot.summary.signedRetentionArchiveFinalAuditSnapshotHash || "",
    retentionArchiveFinalAuditSnapshotIsProductionApproval,
    retentionArchiveFinalAuditSnapshotCanLoadArchiveBytes,
    retentionArchiveFinalAuditSnapshotCanLoadPackageBytes,
    retentionArchiveFinalAuditSnapshotCanPersistArtifactBytes,
    retentionArchiveFinalAuditSnapshotCanExecuteModel,
    retentionArchiveFinalAuditSnapshotCanInvokeRuntime,
    retentionArchiveFinalAuditSnapshotCanExposeInferenceEndpoint,
    retentionArchiveFinalAuditSnapshotCanActivateArtifact,
    retentionArchiveFinalAuditSnapshotCanDeployArtifact,
    retentionArchiveFinalAuditSnapshotCanProductionScore,
    retentionArchiveFinalAuditSnapshotCanScheduleRetentionJobs,
    retentionArchiveFinalAuditSnapshotCanDeleteOrPurge,
    retentionArchiveFinalAuditSnapshotMetadataOnly,
    retentionPolicyLocked,
    finalAuditSnapshotImmutable,
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

  return { ...snapshot, snapshotRecord: snapshotRecord as Record<string, unknown> | null };
};

export const buildMlCandidatePackageRetentionArchiveFinalAuditSnapshotCatalogSummary = async (): Promise<MlCandidatePackageRetentionArchiveFinalAuditSnapshotCatalogSummary> => {
  const [currentCandidatePackageRetentionArchiveFinalAuditSnapshot, lastCandidatePackageRetentionArchiveFinalAuditSnapshots] = await Promise.all([
    buildInventoryStockoutCandidatePackageRetentionArchiveFinalAuditSnapshot().then((result) => result.summary),
    listMlCandidatePackageRetentionArchiveFinalAuditSnapshots(10).catch(() => []),
  ]);
  return {
    generatedAt: new Date().toISOString(),
    contract: buildInventoryStockoutCandidatePackageRetentionArchiveFinalAuditSnapshotContract(),
    currentCandidatePackageRetentionArchiveFinalAuditSnapshot,
    lastCandidatePackageRetentionArchiveFinalAuditSnapshots,
    recommendedNextAction: currentCandidatePackageRetentionArchiveFinalAuditSnapshot.recommendedNextAction,
  };
};

/* Phase 8H guard anchors: inventory_stockout_candidate_package_retention_archive_final_audit_snapshot_v1, buildInventoryStockoutCandidatePackageRetentionArchiveFinalAuditSnapshotContract, buildInventoryStockoutCandidatePackageRetentionArchiveFinalAuditSnapshot, prepareInventoryStockoutCandidatePackageRetentionArchiveFinalAuditSnapshot, metadata_only_retention_archive_final_audit_snapshot */
