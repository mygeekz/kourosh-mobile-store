import { createHash } from "node:crypto";
import {
  getLatestMlCandidatePackageRetentionArchiveFinalAuditSnapshot,
  listMlCandidatePackageFinalAuditSnapshotGovernanceSignoffs,
  recordMlCandidatePackageFinalAuditSnapshotGovernanceSignoff,
} from "../../db/domains/mlDatasets.db";
import type {
  CandidatePackageFinalAuditSnapshotGovernanceSignoffRecommendation,
  CandidatePackageFinalAuditSnapshotGovernanceSignoffStatus,
  InventoryStockoutCandidatePackageFinalAuditSnapshotGovernanceSignoffContract,
  InventoryStockoutCandidatePackageFinalAuditSnapshotGovernanceSignoffGate,
  InventoryStockoutCandidatePackageFinalAuditSnapshotGovernanceSignoffResponse,
  InventoryStockoutCandidatePackageFinalAuditSnapshotGovernanceSignoffSummary,
  MlCandidatePackageFinalAuditSnapshotGovernanceSignoffCatalogSummary,
} from "./datasetTypes";

const FINAL_AUDIT_SNAPSHOT_GOVERNANCE_SIGNOFF_KEY = "inventory_stockout_candidate_package_final_audit_snapshot_governance_signoff_gate_v1" as const;
const FINAL_AUDIT_SNAPSHOT_GOVERNANCE_SIGNOFF_VERSION = "v1" as const;
const RETENTION_ARCHIVE_FINAL_AUDIT_SNAPSHOT_KEY = "inventory_stockout_candidate_package_retention_archive_final_audit_snapshot_v1" as const;
const RETENTION_ARCHIVE_FINAL_AUDIT_SNAPSHOT_VERSION = "v1" as const;
const PACKAGE_KEY = "inventory_stockout_offline_candidate_model_package_v1" as const;
const PACKAGE_VERSION = "v1" as const;
const PHASE = "Phase 8I" as const;

const finalAuditSnapshotGovernanceHumanSignoffRequired = true as const;
const finalAuditSnapshotGovernanceSignoffIsProductionApproval = false as const;
const finalAuditSnapshotGovernanceSignoffCanLoadSnapshotBytes = false as const;
const finalAuditSnapshotGovernanceSignoffCanLoadArchiveBytes = false as const;
const finalAuditSnapshotGovernanceSignoffCanLoadPackageBytes = false as const;
const finalAuditSnapshotGovernanceSignoffCanPersistArtifactBytes = false as const;
const finalAuditSnapshotGovernanceSignoffCanExecuteModel = false as const;
const finalAuditSnapshotGovernanceSignoffCanInvokeRuntime = false as const;
const finalAuditSnapshotGovernanceSignoffCanExposeInferenceEndpoint = false as const;
const finalAuditSnapshotGovernanceSignoffCanActivateArtifact = false as const;
const finalAuditSnapshotGovernanceSignoffCanDeployArtifact = false as const;
const finalAuditSnapshotGovernanceSignoffCanProductionScore = false as const;
const finalAuditSnapshotGovernanceSignoffCanScheduleRetentionJobs = false as const;
const finalAuditSnapshotGovernanceSignoffCanDeleteOrPurge = false as const;
const finalAuditSnapshotGovernanceSignoffMetadataOnly = true as const;
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
  status: InventoryStockoutCandidatePackageFinalAuditSnapshotGovernanceSignoffGate["status"],
  value: unknown,
  message: string,
): InventoryStockoutCandidatePackageFinalAuditSnapshotGovernanceSignoffGate => ({ key, label, status, value, message });

const uniqueMessages = (
  gates: InventoryStockoutCandidatePackageFinalAuditSnapshotGovernanceSignoffGate[],
  status: InventoryStockoutCandidatePackageFinalAuditSnapshotGovernanceSignoffGate["status"],
) => Array.from(new Set(gates.filter((gate) => gate.status === status).map((gate) => gate.message)));

const chooseRecommendation = (
  status: CandidatePackageFinalAuditSnapshotGovernanceSignoffStatus,
): CandidatePackageFinalAuditSnapshotGovernanceSignoffRecommendation => {
  if (status === "final_audit_snapshot_governance_signoff_ready") return "record_metadata_only_final_audit_snapshot_governance_signoff";
  if (status === "needs_phase8h_final_audit_snapshot") return "record_phase8h_final_audit_snapshot_first";
  if (status === "needs_signed_final_audit_snapshot_hash") return "restore_signed_final_audit_snapshot_hash_traceability";
  if (status === "needs_final_audit_snapshot_governance_signoff_evidence") return "collect_final_audit_snapshot_governance_signoff_evidence_first";
  return "resolve_safety_blocks_first";
};

const getGovernanceSignoffEvidence = (options: Record<string, unknown>): Record<string, unknown> | null => {
  const candidates = [
    options.finalAuditSnapshotGovernanceSignoffEvidence,
    options.finalAuditSnapshotGovernanceSignoffEvidenceJson,
    options.governanceSignoffEvidence,
    options.humanGovernanceEvidence,
    options.signoffEvidence,
    options.reviewEvidenceJson,
  ];
  const match = candidates.find((value) => value && typeof value === "object" && !Array.isArray(value));
  return match ? match as Record<string, unknown> : null;
};

const hasFinalAuditSnapshotGovernanceSignoffEvidence = (value: Record<string, unknown> | null): boolean => {
  if (!value) return false;
  const reviewer = asString(value.reviewerName || value.reviewer || value.governanceReviewer || value.signoffReviewer || value.reviewerRole);
  const decision = asString(value.governanceDecision || value.signoffDecision || value.reviewDecision || value.decision);
  const checklist = value.governanceChecklist || value.signoffChecklist || value.reviewChecklist || value.checklist || value.requiredChecks;
  const acknowledgement = asString(value.acknowledgement || value.nonProductionAcknowledgement || value.safetyAcknowledgement);
  const checklistReady = Array.isArray(checklist) ? checklist.length > 0 : Boolean(checklist && typeof checklist === "object");
  return Boolean(reviewer && decision && checklistReady && acknowledgement);
};

export const buildInventoryStockoutCandidatePackageFinalAuditSnapshotGovernanceSignoffContract = (): InventoryStockoutCandidatePackageFinalAuditSnapshotGovernanceSignoffContract => ({
  contractKey: FINAL_AUDIT_SNAPSHOT_GOVERNANCE_SIGNOFF_KEY,
  contractVersion: FINAL_AUDIT_SNAPSHOT_GOVERNANCE_SIGNOFF_VERSION,
  generatedAt: new Date().toISOString(),
  phase: PHASE,
  purpose: "Record a metadata-only human governance signoff gate for the Phase 8H final audit snapshot without treating the signoff as production approval and without enabling retention jobs, delete, purge, snapshot/archive/package loading, model execution, runtime invocation, inference, activation, deployment, production scoring, or business mutation.",
  signoffScope: "offline_candidate_package_final_audit_snapshot_governance_signoff_metadata_only",
  requiredUpstreamRetentionArchiveFinalAuditSnapshotKey: RETENTION_ARCHIVE_FINAL_AUDIT_SNAPSHOT_KEY,
  requiredUpstreamRetentionArchiveFinalAuditSnapshotVersion: RETENTION_ARCHIVE_FINAL_AUDIT_SNAPSHOT_VERSION,
  requiredUpstreamEvidence: [
    "Persisted Phase 8H candidate package retention archive final audit snapshot row",
    "Phase 8H snapshot_status is retention_archive_final_audit_snapshot_ready",
    "Signed Phase 8H final audit snapshot hash for governance signoff traceability",
    "Phase 8H safety policy confirms no retention execution, delete, purge, loading, runtime, inference, activation, deployment, production scoring, or business mutation",
  ],
  requiredGovernanceSignoffEvidence: [
    "Human governance reviewer identity or role",
    "Human governance decision for metadata-only final audit snapshot signoff",
    "Governance checklist confirming no retention job, delete, purge, loading, execution, inference, activation, deployment, production scoring, or business mutation is enabled",
    "Explicit acknowledgement that Phase 8I is not production approval and does not authorize retention execution or artifact/model activation",
  ],
  includedSignoffSections: [
    "candidate-package-final-audit-snapshot-governance-signoff-packet.json",
    "candidate-package-final-audit-snapshot-governance-signoff-evidence.json",
    "candidate-package-final-audit-snapshot-governance-signoff-policy.json",
    "candidate-package-final-audit-snapshot-governance-signoff-safety-policy.json",
    "candidate-package-final-audit-snapshot-governance-signoff-summary.json",
  ],
  forbiddenBehavior: [
    "Do not schedule retention jobs in Phase 8I.",
    "Do not delete, purge, overwrite, or mutate snapshot/archive/package/artifact records.",
    "Do not load snapshot bytes, archive bytes, package bytes, or artifact bytes.",
    "Do not execute, invoke, train, activate, deploy, or production-score any model artifact.",
    "Do not add /infer, /execute, /activate, /deploy, or /production-score routes.",
    "Do not treat this governance signoff as production approval, deployment approval, model approval, or retention execution approval.",
    "Do not mutate inventory, accounting, ledger, pricing, reports, or business records.",
  ],
  operationalPolicy: {
    finalAuditSnapshotGovernanceHumanSignoffRequired,
    finalAuditSnapshotGovernanceSignoffIsProductionApproval,
    finalAuditSnapshotGovernanceSignoffCanLoadSnapshotBytes,
    finalAuditSnapshotGovernanceSignoffCanLoadArchiveBytes,
    finalAuditSnapshotGovernanceSignoffCanLoadPackageBytes,
    finalAuditSnapshotGovernanceSignoffCanPersistArtifactBytes,
    finalAuditSnapshotGovernanceSignoffCanExecuteModel,
    finalAuditSnapshotGovernanceSignoffCanInvokeRuntime,
    finalAuditSnapshotGovernanceSignoffCanExposeInferenceEndpoint,
    finalAuditSnapshotGovernanceSignoffCanActivateArtifact,
    finalAuditSnapshotGovernanceSignoffCanDeployArtifact,
    finalAuditSnapshotGovernanceSignoffCanProductionScore,
    finalAuditSnapshotGovernanceSignoffCanScheduleRetentionJobs,
    finalAuditSnapshotGovernanceSignoffCanDeleteOrPurge,
    finalAuditSnapshotGovernanceSignoffMetadataOnly,
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

export const buildInventoryStockoutCandidatePackageFinalAuditSnapshotGovernanceSignoff = async (
  options: Record<string, unknown> = {},
): Promise<InventoryStockoutCandidatePackageFinalAuditSnapshotGovernanceSignoffResponse> => {
  const generatedAt = new Date().toISOString();
  const contract = buildInventoryStockoutCandidatePackageFinalAuditSnapshotGovernanceSignoffContract();
  const latestFinalAuditSnapshot = await getLatestMlCandidatePackageRetentionArchiveFinalAuditSnapshot().catch(() => null) as Record<string, unknown> | null;
  const retentionArchiveFinalAuditSnapshotId = asNumber(latestFinalAuditSnapshot?.id);
  const retentionArchiveFinalAuditSnapshotStatus = asString(latestFinalAuditSnapshot?.snapshotStatus);
  const signedRetentionArchiveFinalAuditSnapshotHash = asString(latestFinalAuditSnapshot?.signedRetentionArchiveFinalAuditSnapshotHash);
  const retentionSignoffArchivePackId = asNumber(latestFinalAuditSnapshot?.retentionSignoffArchivePackId);
  const signedRetentionSignoffArchiveHash = asString(latestFinalAuditSnapshot?.signedRetentionSignoffArchiveHash);
  const packageId = asNumber(latestFinalAuditSnapshot?.packageId);
  const persistedFinalAuditSnapshotExists = Boolean(retentionArchiveFinalAuditSnapshotId);
  const upstreamFinalAuditSnapshotReady = retentionArchiveFinalAuditSnapshotStatus === "retention_archive_final_audit_snapshot_ready";
  const governanceSignoffEvidence = getGovernanceSignoffEvidence(options);
  const finalAuditSnapshotGovernanceSignoffEvidenceProvided = hasFinalAuditSnapshotGovernanceSignoffEvidence(governanceSignoffEvidence);

  const safetyPolicyStillDisabled =
    finalAuditSnapshotGovernanceHumanSignoffRequired === true &&
    finalAuditSnapshotGovernanceSignoffIsProductionApproval === false &&
    finalAuditSnapshotGovernanceSignoffCanLoadSnapshotBytes === false &&
    finalAuditSnapshotGovernanceSignoffCanLoadArchiveBytes === false &&
    finalAuditSnapshotGovernanceSignoffCanLoadPackageBytes === false &&
    finalAuditSnapshotGovernanceSignoffCanPersistArtifactBytes === false &&
    finalAuditSnapshotGovernanceSignoffCanExecuteModel === false &&
    finalAuditSnapshotGovernanceSignoffCanInvokeRuntime === false &&
    finalAuditSnapshotGovernanceSignoffCanExposeInferenceEndpoint === false &&
    finalAuditSnapshotGovernanceSignoffCanActivateArtifact === false &&
    finalAuditSnapshotGovernanceSignoffCanDeployArtifact === false &&
    finalAuditSnapshotGovernanceSignoffCanProductionScore === false &&
    finalAuditSnapshotGovernanceSignoffCanScheduleRetentionJobs === false &&
    finalAuditSnapshotGovernanceSignoffCanDeleteOrPurge === false &&
    finalAuditSnapshotGovernanceSignoffMetadataOnly === true &&
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

  const signoffPolicy = {
    finalAuditSnapshotGovernanceHumanSignoffRequired,
    finalAuditSnapshotGovernanceSignoffMetadataOnly,
    finalAuditSnapshotGovernanceSignoffIsProductionApproval,
    retentionPolicyLocked,
    finalAuditSnapshotImmutable,
    governanceSignoffIsFinalAuditClosure,
    retentionExecutionAllowed,
    automaticDeletionAllowed,
    purgeJobAllowed,
    generatedAt,
  };

  const gates = [
    buildGate("persisted_phase8h_final_audit_snapshot_exists", "Persisted Phase 8H Final Audit Snapshot", persistedFinalAuditSnapshotExists ? "pass" : "block", retentionArchiveFinalAuditSnapshotId, persistedFinalAuditSnapshotExists ? "A persisted Phase 8H final audit snapshot metadata row exists." : "Record a Phase 8H final audit snapshot before building the Phase 8I governance signoff gate."),
    buildGate("phase8h_final_audit_snapshot_ready", "Phase 8H Final Audit Snapshot Ready", upstreamFinalAuditSnapshotReady ? "pass" : "block", retentionArchiveFinalAuditSnapshotStatus, upstreamFinalAuditSnapshotReady ? "Phase 8H snapshot status is retention_archive_final_audit_snapshot_ready." : "Phase 8H snapshot status must be retention_archive_final_audit_snapshot_ready before governance signoff."),
    buildGate("signed_final_audit_snapshot_hash_present", "Signed Final Audit Snapshot Hash", signedRetentionArchiveFinalAuditSnapshotHash ? "pass" : "block", signedRetentionArchiveFinalAuditSnapshotHash, signedRetentionArchiveFinalAuditSnapshotHash ? "A signed Phase 8H final audit snapshot hash is available for governance traceability." : "Restore signedRetentionArchiveFinalAuditSnapshotHash before building the Phase 8I governance signoff."),
    buildGate("governance_signoff_evidence_present", "Governance Signoff Evidence", finalAuditSnapshotGovernanceSignoffEvidenceProvided ? "pass" : "block", finalAuditSnapshotGovernanceSignoffEvidenceProvided, finalAuditSnapshotGovernanceSignoffEvidenceProvided ? "Human governance signoff evidence is present." : "Provide governance signoff evidence with reviewer, decision, checklist, and non-production acknowledgement."),
    buildGate("retention_policy_locked", "Retention Policy Locked", retentionPolicyLocked ? "pass" : "block", retentionPolicyLocked, retentionPolicyLocked ? "Retention policy remains locked and metadata-only." : "Retention policy must stay locked before governance signoff."),
    buildGate("final_audit_snapshot_immutable", "Final Audit Snapshot Immutable", finalAuditSnapshotImmutable ? "pass" : "block", finalAuditSnapshotImmutable, finalAuditSnapshotImmutable ? "The upstream final audit snapshot remains immutable metadata." : "Final audit snapshot immutability must remain enabled."),
    buildGate("safety_policy_disabled", "Safety Policy Disabled", safetyPolicyStillDisabled ? "pass" : "block", safetyPolicyStillDisabled, safetyPolicyStillDisabled ? "Execution, inference, activation, deploy, production scoring, retention jobs, delete/purge, loading, and business mutation remain disabled." : "A Phase 8I safety policy flag is not disabled."),
  ];

  let status: CandidatePackageFinalAuditSnapshotGovernanceSignoffStatus = "final_audit_snapshot_governance_signoff_ready";
  if (!persistedFinalAuditSnapshotExists || !upstreamFinalAuditSnapshotReady) status = "needs_phase8h_final_audit_snapshot";
  else if (!signedRetentionArchiveFinalAuditSnapshotHash) status = "needs_signed_final_audit_snapshot_hash";
  else if (!finalAuditSnapshotGovernanceSignoffEvidenceProvided) status = "needs_final_audit_snapshot_governance_signoff_evidence";
  else if (!safetyPolicyStillDisabled || !retentionPolicyLocked || !finalAuditSnapshotImmutable) status = "safety_blocked";

  const blockers = uniqueMessages(gates, "block");
  const warnings = uniqueMessages(gates, "warning");
  const passCount = gates.filter((gate) => gate.status === "pass").length;
  const readinessScorePct = Math.round((passCount / gates.length) * 100);
  const recommendation = chooseRecommendation(status);
  const signedFinalAuditSnapshotGovernanceSignoffHash = status === "final_audit_snapshot_governance_signoff_ready"
    ? sha256({
        key: FINAL_AUDIT_SNAPSHOT_GOVERNANCE_SIGNOFF_KEY,
        version: FINAL_AUDIT_SNAPSHOT_GOVERNANCE_SIGNOFF_VERSION,
        retentionArchiveFinalAuditSnapshotId,
        signedRetentionArchiveFinalAuditSnapshotHash,
        governanceSignoffEvidence,
        signoffPolicy,
        generatedAt,
      })
    : null;

  const safetyPolicy = {
    ...contract.operationalPolicy,
    generatedAt,
    forbiddenRoutes: ["/infer", "/execute", "/activate", "/deploy", "/production-score"],
    invoiceCancelReasonUntouched: true,
  };

  const summary: InventoryStockoutCandidatePackageFinalAuditSnapshotGovernanceSignoffSummary = {
    finalAuditSnapshotGovernanceSignoffKey: FINAL_AUDIT_SNAPSHOT_GOVERNANCE_SIGNOFF_KEY,
    finalAuditSnapshotGovernanceSignoffVersion: FINAL_AUDIT_SNAPSHOT_GOVERNANCE_SIGNOFF_VERSION,
    generatedAt,
    phase: PHASE,
    status,
    recommendation,
    readinessScorePct,
    retentionArchiveFinalAuditSnapshotId,
    retentionArchiveFinalAuditSnapshotKey: RETENTION_ARCHIVE_FINAL_AUDIT_SNAPSHOT_KEY,
    retentionArchiveFinalAuditSnapshotVersion: RETENTION_ARCHIVE_FINAL_AUDIT_SNAPSHOT_VERSION,
    retentionArchiveFinalAuditSnapshotStatus,
    signedRetentionArchiveFinalAuditSnapshotHash,
    retentionSignoffArchivePackId,
    signedRetentionSignoffArchiveHash,
    packageId,
    packageKey: PACKAGE_KEY,
    packageVersion: PACKAGE_VERSION,
    finalAuditSnapshotGovernanceSignoffMode: "metadata_only_final_audit_snapshot_governance_signoff_gate",
    finalAuditSnapshotGovernanceSignoffEvidenceProvided,
    finalAuditSnapshotGovernanceHumanSignoffRequired,
    finalAuditSnapshotGovernanceSignoffIsProductionApproval,
    finalAuditSnapshotGovernanceSignoffCanLoadSnapshotBytes,
    finalAuditSnapshotGovernanceSignoffCanLoadArchiveBytes,
    finalAuditSnapshotGovernanceSignoffCanLoadPackageBytes,
    finalAuditSnapshotGovernanceSignoffCanPersistArtifactBytes,
    finalAuditSnapshotGovernanceSignoffCanExecuteModel,
    finalAuditSnapshotGovernanceSignoffCanInvokeRuntime,
    finalAuditSnapshotGovernanceSignoffCanExposeInferenceEndpoint,
    finalAuditSnapshotGovernanceSignoffCanActivateArtifact,
    finalAuditSnapshotGovernanceSignoffCanDeployArtifact,
    finalAuditSnapshotGovernanceSignoffCanProductionScore,
    finalAuditSnapshotGovernanceSignoffCanScheduleRetentionJobs,
    finalAuditSnapshotGovernanceSignoffCanDeleteOrPurge,
    finalAuditSnapshotGovernanceSignoffMetadataOnly,
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
    signedFinalAuditSnapshotGovernanceSignoffHash,
    recommendedNextAction: recommendation,
  };

  const signoffPacket = {
    signoffPacketKey: FINAL_AUDIT_SNAPSHOT_GOVERNANCE_SIGNOFF_KEY,
    signoffPacketVersion: FINAL_AUDIT_SNAPSHOT_GOVERNANCE_SIGNOFF_VERSION,
    generatedAt,
    phase: PHASE,
    upstreamRetentionArchiveFinalAuditSnapshot: {
      retentionArchiveFinalAuditSnapshotId,
      retentionArchiveFinalAuditSnapshotKey: RETENTION_ARCHIVE_FINAL_AUDIT_SNAPSHOT_KEY,
      retentionArchiveFinalAuditSnapshotVersion: RETENTION_ARCHIVE_FINAL_AUDIT_SNAPSHOT_VERSION,
      retentionArchiveFinalAuditSnapshotStatus,
      signedRetentionArchiveFinalAuditSnapshotHash,
      retentionSignoffArchivePackId,
      signedRetentionSignoffArchiveHash,
      packageId,
    },
    signoffEvidence: governanceSignoffEvidence || {},
    summary,
    signoffPolicy,
    safetyPolicy,
    signoffSections: contract.includedSignoffSections,
  };

  return {
    success: true,
    contract,
    summary,
    gates,
    signoffPacket,
    signoffPolicy,
    safetyPolicy,
  };
};

export const prepareInventoryStockoutCandidatePackageFinalAuditSnapshotGovernanceSignoff = async (
  options: Record<string, unknown> = {},
): Promise<InventoryStockoutCandidatePackageFinalAuditSnapshotGovernanceSignoffResponse> => {
  const signoff = await buildInventoryStockoutCandidatePackageFinalAuditSnapshotGovernanceSignoff(options);
  if (signoff.summary.status !== "final_audit_snapshot_governance_signoff_ready") return signoff;
  const governanceSignoffEvidence = getGovernanceSignoffEvidence(options) || {};

  const signoffRecord = await recordMlCandidatePackageFinalAuditSnapshotGovernanceSignoff({
    retentionArchiveFinalAuditSnapshotId: signoff.summary.retentionArchiveFinalAuditSnapshotId,
    retentionArchiveFinalAuditSnapshotKey: signoff.summary.retentionArchiveFinalAuditSnapshotKey,
    retentionArchiveFinalAuditSnapshotVersion: signoff.summary.retentionArchiveFinalAuditSnapshotVersion,
    retentionArchiveFinalAuditSnapshotStatus: signoff.summary.retentionArchiveFinalAuditSnapshotStatus,
    signedRetentionArchiveFinalAuditSnapshotHash: signoff.summary.signedRetentionArchiveFinalAuditSnapshotHash || "",
    retentionSignoffArchivePackId: signoff.summary.retentionSignoffArchivePackId,
    signedRetentionSignoffArchiveHash: signoff.summary.signedRetentionSignoffArchiveHash,
    packageId: signoff.summary.packageId,
    packageKey: signoff.summary.packageKey,
    packageVersion: signoff.summary.packageVersion,
    finalAuditSnapshotGovernanceSignoffKey: signoff.summary.finalAuditSnapshotGovernanceSignoffKey,
    finalAuditSnapshotGovernanceSignoffVersion: signoff.summary.finalAuditSnapshotGovernanceSignoffVersion,
    signoffStatus: signoff.summary.status,
    readinessScorePct: signoff.summary.readinessScorePct,
    signoffPacket: signoff.signoffPacket,
    signoffEvidence: governanceSignoffEvidence,
    signoffPolicy: signoff.signoffPolicy,
    safetyPolicy: signoff.safetyPolicy,
    summary: signoff.summary,
    signedFinalAuditSnapshotGovernanceSignoffHash: signoff.summary.signedFinalAuditSnapshotGovernanceSignoffHash || "",
    finalAuditSnapshotGovernanceHumanSignoffRequired,
    finalAuditSnapshotGovernanceSignoffIsProductionApproval,
    finalAuditSnapshotGovernanceSignoffCanLoadSnapshotBytes,
    finalAuditSnapshotGovernanceSignoffCanLoadArchiveBytes,
    finalAuditSnapshotGovernanceSignoffCanLoadPackageBytes,
    finalAuditSnapshotGovernanceSignoffCanPersistArtifactBytes,
    finalAuditSnapshotGovernanceSignoffCanExecuteModel,
    finalAuditSnapshotGovernanceSignoffCanInvokeRuntime,
    finalAuditSnapshotGovernanceSignoffCanExposeInferenceEndpoint,
    finalAuditSnapshotGovernanceSignoffCanActivateArtifact,
    finalAuditSnapshotGovernanceSignoffCanDeployArtifact,
    finalAuditSnapshotGovernanceSignoffCanProductionScore,
    finalAuditSnapshotGovernanceSignoffCanScheduleRetentionJobs,
    finalAuditSnapshotGovernanceSignoffCanDeleteOrPurge,
    finalAuditSnapshotGovernanceSignoffMetadataOnly,
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

  return { ...signoff, signoffRecord: signoffRecord as Record<string, unknown> | null };
};

export const buildMlCandidatePackageFinalAuditSnapshotGovernanceSignoffCatalogSummary = async (): Promise<MlCandidatePackageFinalAuditSnapshotGovernanceSignoffCatalogSummary> => {
  const [currentCandidatePackageFinalAuditSnapshotGovernanceSignoff, lastCandidatePackageFinalAuditSnapshotGovernanceSignoffs] = await Promise.all([
    buildInventoryStockoutCandidatePackageFinalAuditSnapshotGovernanceSignoff().then((result) => result.summary),
    listMlCandidatePackageFinalAuditSnapshotGovernanceSignoffs(10).catch(() => []),
  ]);
  return {
    generatedAt: new Date().toISOString(),
    contract: buildInventoryStockoutCandidatePackageFinalAuditSnapshotGovernanceSignoffContract(),
    currentCandidatePackageFinalAuditSnapshotGovernanceSignoff,
    lastCandidatePackageFinalAuditSnapshotGovernanceSignoffs,
    recommendedNextAction: currentCandidatePackageFinalAuditSnapshotGovernanceSignoff.recommendedNextAction,
  };
};

/* Phase 8I guard anchors: inventory_stockout_candidate_package_final_audit_snapshot_governance_signoff_gate_v1, buildInventoryStockoutCandidatePackageFinalAuditSnapshotGovernanceSignoffContract, buildInventoryStockoutCandidatePackageFinalAuditSnapshotGovernanceSignoff, prepareInventoryStockoutCandidatePackageFinalAuditSnapshotGovernanceSignoff, metadata_only_final_audit_snapshot_governance_signoff_gate */
