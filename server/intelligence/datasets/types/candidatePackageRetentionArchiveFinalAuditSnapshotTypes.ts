// Phase 8H — Offline Candidate Package Retention Archive Final Audit Snapshot type surface.

export type CandidatePackageRetentionArchiveFinalAuditSnapshotStatus =
  | "retention_archive_final_audit_snapshot_ready"
  | "needs_phase8g_retention_signoff_archive_pack"
  | "needs_signed_retention_signoff_archive_hash"
  | "safety_blocked";

export type CandidatePackageRetentionArchiveFinalAuditSnapshotRecommendation =
  | "record_metadata_only_retention_archive_final_audit_snapshot"
  | "record_phase8g_retention_signoff_archive_pack_first"
  | "restore_signed_retention_signoff_archive_hash_traceability"
  | "resolve_safety_blocks_first";

export type InventoryStockoutCandidatePackageRetentionArchiveFinalAuditSnapshotGate = {
  key: string;
  label: string;
  status: "pass" | "warning" | "block";
  value: unknown;
  message: string;
};

export type InventoryStockoutCandidatePackageRetentionArchiveFinalAuditSnapshotContract = {
  contractKey: "inventory_stockout_candidate_package_retention_archive_final_audit_snapshot_v1";
  contractVersion: "v1";
  generatedAt: string;
  phase: "Phase 8H";
  purpose: string;
  auditScope: "offline_candidate_package_retention_archive_final_audit_snapshot_metadata_only";
  requiredUpstreamRetentionSignoffArchivePackKey: "inventory_stockout_candidate_package_retention_signoff_archive_pack_v1";
  requiredUpstreamRetentionSignoffArchivePackVersion: "v1";
  requiredUpstreamEvidence: string[];
  includedAuditSections: string[];
  forbiddenBehavior: string[];
  operationalPolicy: {
    retentionArchiveFinalAuditSnapshotIsProductionApproval: false;
    retentionArchiveFinalAuditSnapshotCanLoadArchiveBytes: false;
    retentionArchiveFinalAuditSnapshotCanLoadPackageBytes: false;
    retentionArchiveFinalAuditSnapshotCanPersistArtifactBytes: false;
    retentionArchiveFinalAuditSnapshotCanExecuteModel: false;
    retentionArchiveFinalAuditSnapshotCanInvokeRuntime: false;
    retentionArchiveFinalAuditSnapshotCanExposeInferenceEndpoint: false;
    retentionArchiveFinalAuditSnapshotCanActivateArtifact: false;
    retentionArchiveFinalAuditSnapshotCanDeployArtifact: false;
    retentionArchiveFinalAuditSnapshotCanProductionScore: false;
    retentionArchiveFinalAuditSnapshotCanScheduleRetentionJobs: false;
    retentionArchiveFinalAuditSnapshotCanDeleteOrPurge: false;
    retentionArchiveFinalAuditSnapshotMetadataOnly: true;
    retentionPolicyLocked: true;
    finalAuditSnapshotImmutable: true;
    retentionExecutionAllowed: false;
    automaticDeletionAllowed: false;
    purgeJobAllowed: false;
    modelExecutionAllowed: false;
    runtimeInvocationAllowed: false;
    inferenceEndpointExposed: false;
    artifactActivationAllowed: false;
    artifactBytesLoadingAllowed: false;
    productionIntegrationAllowed: false;
    decisionAutomationAllowed: false;
    canChangeInventoryOrAccounting: false;
    canChangePricing: false;
    canChangeReports: false;
    canChangeLedger: false;
  };
};

export type InventoryStockoutCandidatePackageRetentionArchiveFinalAuditSnapshotSummary = {
  retentionArchiveFinalAuditSnapshotKey: "inventory_stockout_candidate_package_retention_archive_final_audit_snapshot_v1";
  retentionArchiveFinalAuditSnapshotVersion: "v1";
  generatedAt: string;
  phase: "Phase 8H";
  status: CandidatePackageRetentionArchiveFinalAuditSnapshotStatus;
  recommendation: CandidatePackageRetentionArchiveFinalAuditSnapshotRecommendation;
  readinessScorePct: number;
  retentionSignoffArchivePackId: number | null;
  retentionSignoffArchivePackKey: "inventory_stockout_candidate_package_retention_signoff_archive_pack_v1";
  retentionSignoffArchivePackVersion: "v1";
  retentionSignoffArchivePackStatus: string | null;
  signedRetentionSignoffArchiveHash: string | null;
  retentionReviewSignoffId: number | null;
  signedRetentionReviewSignoffHash: string | null;
  packageId: number | null;
  packageKey: "inventory_stockout_offline_candidate_model_package_v1";
  packageVersion: "v1";
  retentionArchiveFinalAuditSnapshotMode: "metadata_only_retention_archive_final_audit_snapshot";
  retentionArchiveFinalAuditSnapshotIsProductionApproval: false;
  retentionArchiveFinalAuditSnapshotCanLoadArchiveBytes: false;
  retentionArchiveFinalAuditSnapshotCanLoadPackageBytes: false;
  retentionArchiveFinalAuditSnapshotCanPersistArtifactBytes: false;
  retentionArchiveFinalAuditSnapshotCanExecuteModel: false;
  retentionArchiveFinalAuditSnapshotCanInvokeRuntime: false;
  retentionArchiveFinalAuditSnapshotCanExposeInferenceEndpoint: false;
  retentionArchiveFinalAuditSnapshotCanActivateArtifact: false;
  retentionArchiveFinalAuditSnapshotCanDeployArtifact: false;
  retentionArchiveFinalAuditSnapshotCanProductionScore: false;
  retentionArchiveFinalAuditSnapshotCanScheduleRetentionJobs: false;
  retentionArchiveFinalAuditSnapshotCanDeleteOrPurge: false;
  retentionArchiveFinalAuditSnapshotMetadataOnly: true;
  retentionPolicyLocked: true;
  finalAuditSnapshotImmutable: true;
  retentionExecutionAllowed: false;
  automaticDeletionAllowed: false;
  purgeJobAllowed: false;
  modelExecutionAllowed: false;
  runtimeInvocationAllowed: false;
  inferenceEndpointExposed: false;
  artifactActivationAllowed: false;
  artifactBytesLoadingAllowed: false;
  productionIntegrationAllowed: false;
  decisionAutomationAllowed: false;
  canChangeInventoryOrAccounting: false;
  canChangePricing: false;
  canChangeReports: false;
  canChangeLedger: false;
  blockerCount: number;
  warningCount: number;
  passCount: number;
  totalGateCount: number;
  blockers: string[];
  warnings: string[];
  signedRetentionArchiveFinalAuditSnapshotHash: string | null;
  recommendedNextAction: string;
};

export type InventoryStockoutCandidatePackageRetentionArchiveFinalAuditSnapshotResponse = {
  success: true;
  contract: InventoryStockoutCandidatePackageRetentionArchiveFinalAuditSnapshotContract;
  summary: InventoryStockoutCandidatePackageRetentionArchiveFinalAuditSnapshotSummary;
  gates: InventoryStockoutCandidatePackageRetentionArchiveFinalAuditSnapshotGate[];
  auditSnapshot: Record<string, unknown>;
  retentionPolicy: Record<string, unknown>;
  safetyPolicy: Record<string, unknown>;
  snapshotRecord?: Record<string, unknown> | null;
};

export type MlCandidatePackageRetentionArchiveFinalAuditSnapshotCatalogSummary = {
  generatedAt: string;
  contract: InventoryStockoutCandidatePackageRetentionArchiveFinalAuditSnapshotContract;
  currentCandidatePackageRetentionArchiveFinalAuditSnapshot: InventoryStockoutCandidatePackageRetentionArchiveFinalAuditSnapshotSummary;
  lastCandidatePackageRetentionArchiveFinalAuditSnapshots: Array<Record<string, unknown>>;
  recommendedNextAction: string;
};

export type MlCandidatePackageRetentionArchiveFinalAuditSnapshotSummaryPayload = {
  generatedAt?: string;
  currentCandidatePackageRetentionArchiveFinalAuditSnapshot?: {
    status?: string;
    recommendation?: string;
    readinessScorePct?: number | null;
    retentionSignoffArchivePackId?: number | null;
    signedRetentionSignoffArchiveHash?: string | null;
    retentionArchiveFinalAuditSnapshotIsProductionApproval?: boolean;
    retentionArchiveFinalAuditSnapshotCanLoadArchiveBytes?: boolean;
    retentionArchiveFinalAuditSnapshotCanLoadPackageBytes?: boolean;
    retentionArchiveFinalAuditSnapshotCanPersistArtifactBytes?: boolean;
    retentionArchiveFinalAuditSnapshotCanExecuteModel?: boolean;
    retentionArchiveFinalAuditSnapshotCanExposeInferenceEndpoint?: boolean;
    retentionArchiveFinalAuditSnapshotCanActivateArtifact?: boolean;
    retentionArchiveFinalAuditSnapshotCanDeployArtifact?: boolean;
    retentionArchiveFinalAuditSnapshotCanProductionScore?: boolean;
    retentionArchiveFinalAuditSnapshotCanScheduleRetentionJobs?: boolean;
    retentionArchiveFinalAuditSnapshotCanDeleteOrPurge?: boolean;
    retentionArchiveFinalAuditSnapshotMetadataOnly?: boolean;
    retentionPolicyLocked?: boolean;
    finalAuditSnapshotImmutable?: boolean;
    retentionExecutionAllowed?: boolean;
    automaticDeletionAllowed?: boolean;
    purgeJobAllowed?: boolean;
    modelExecutionAllowed?: boolean;
    runtimeInvocationAllowed?: boolean;
    inferenceEndpointExposed?: boolean;
    artifactActivationAllowed?: boolean;
    artifactBytesLoadingAllowed?: boolean;
    productionIntegrationAllowed?: boolean;
    decisionAutomationAllowed?: boolean;
    canChangeInventoryOrAccounting?: boolean;
    blockerCount?: number;
    warningCount?: number;
    blockers?: string[];
    warnings?: string[];
    recommendedNextAction?: string;
    [key: string]: unknown;
  };
  lastCandidatePackageRetentionArchiveFinalAuditSnapshots?: Array<Record<string, unknown>>;
  recommendedNextAction?: string;
  [key: string]: unknown;
};
