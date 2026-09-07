// Phase 8J — Offline Candidate Package Governance Signoff Archive Pack type surface.

export type CandidatePackageGovernanceSignoffArchivePackStatus =
  | "governance_signoff_archive_pack_ready"
  | "needs_phase8i_final_audit_snapshot_governance_signoff"
  | "needs_signed_final_audit_snapshot_governance_signoff_hash"
  | "safety_blocked";

export type CandidatePackageGovernanceSignoffArchivePackRecommendation =
  | "record_metadata_only_governance_signoff_archive_pack"
  | "record_phase8i_final_audit_snapshot_governance_signoff_first"
  | "restore_signed_final_audit_snapshot_governance_signoff_hash_traceability"
  | "resolve_safety_blocks_first";

export type InventoryStockoutCandidatePackageGovernanceSignoffArchivePackGate = {
  key: string;
  label: string;
  status: "pass" | "warning" | "block";
  value: unknown;
  message: string;
};

export type InventoryStockoutCandidatePackageGovernanceSignoffArchivePackContract = {
  contractKey: "inventory_stockout_candidate_package_governance_signoff_archive_pack_v1";
  contractVersion: "v1";
  generatedAt: string;
  phase: "Phase 8J";
  purpose: string;
  archiveScope: "offline_candidate_package_governance_signoff_archive_metadata_only";
  requiredUpstreamFinalAuditSnapshotGovernanceSignoffKey: "inventory_stockout_candidate_package_final_audit_snapshot_governance_signoff_gate_v1";
  requiredUpstreamFinalAuditSnapshotGovernanceSignoffVersion: "v1";
  requiredUpstreamEvidence: string[];
  includedArchiveSections: string[];
  forbiddenBehavior: string[];
  operationalPolicy: {
    governanceSignoffArchivePackIsProductionApproval: false;
    governanceSignoffArchivePackCanLoadSignoffBytes: false;
    governanceSignoffArchivePackCanLoadSnapshotBytes: false;
    governanceSignoffArchivePackCanLoadArchiveBytes: false;
    governanceSignoffArchivePackCanLoadPackageBytes: false;
    governanceSignoffArchivePackCanPersistArtifactBytes: false;
    governanceSignoffArchivePackCanExecuteModel: false;
    governanceSignoffArchivePackCanInvokeRuntime: false;
    governanceSignoffArchivePackCanExposeInferenceEndpoint: false;
    governanceSignoffArchivePackCanActivateArtifact: false;
    governanceSignoffArchivePackCanDeployArtifact: false;
    governanceSignoffArchivePackCanProductionScore: false;
    governanceSignoffArchivePackCanScheduleRetentionJobs: false;
    governanceSignoffArchivePackCanDeleteOrPurge: false;
    governanceSignoffArchivePackMetadataOnly: true;
    retentionPolicyLocked: true;
    finalAuditSnapshotImmutable: true;
    governanceSignoffIsFinalAuditClosure: true;
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

export type InventoryStockoutCandidatePackageGovernanceSignoffArchivePackSummary = {
  governanceSignoffArchivePackKey: "inventory_stockout_candidate_package_governance_signoff_archive_pack_v1";
  governanceSignoffArchivePackVersion: "v1";
  generatedAt: string;
  phase: "Phase 8J";
  status: CandidatePackageGovernanceSignoffArchivePackStatus;
  recommendation: CandidatePackageGovernanceSignoffArchivePackRecommendation;
  readinessScorePct: number;
  finalAuditSnapshotGovernanceSignoffId: number | null;
  finalAuditSnapshotGovernanceSignoffKey: "inventory_stockout_candidate_package_final_audit_snapshot_governance_signoff_gate_v1";
  finalAuditSnapshotGovernanceSignoffVersion: "v1";
  finalAuditSnapshotGovernanceSignoffStatus: string | null;
  signedFinalAuditSnapshotGovernanceSignoffHash: string | null;
  retentionArchiveFinalAuditSnapshotId: number | null;
  signedRetentionArchiveFinalAuditSnapshotHash: string | null;
  packageId: number | null;
  packageKey: "inventory_stockout_offline_candidate_model_package_v1";
  packageVersion: "v1";
  governanceSignoffArchiveMode: "metadata_only_governance_signoff_archive_pack";
  governanceSignoffArchivePackIsProductionApproval: false;
  governanceSignoffArchivePackCanLoadSignoffBytes: false;
  governanceSignoffArchivePackCanLoadSnapshotBytes: false;
  governanceSignoffArchivePackCanLoadArchiveBytes: false;
  governanceSignoffArchivePackCanLoadPackageBytes: false;
  governanceSignoffArchivePackCanPersistArtifactBytes: false;
  governanceSignoffArchivePackCanExecuteModel: false;
  governanceSignoffArchivePackCanInvokeRuntime: false;
  governanceSignoffArchivePackCanExposeInferenceEndpoint: false;
  governanceSignoffArchivePackCanActivateArtifact: false;
  governanceSignoffArchivePackCanDeployArtifact: false;
  governanceSignoffArchivePackCanProductionScore: false;
  governanceSignoffArchivePackCanScheduleRetentionJobs: false;
  governanceSignoffArchivePackCanDeleteOrPurge: false;
  governanceSignoffArchivePackMetadataOnly: true;
  retentionPolicyLocked: true;
  finalAuditSnapshotImmutable: true;
  governanceSignoffIsFinalAuditClosure: true;
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
  signedGovernanceSignoffArchiveHash: string | null;
  recommendedNextAction: string;
};

export type InventoryStockoutCandidatePackageGovernanceSignoffArchivePackResponse = {
  success: true;
  contract: InventoryStockoutCandidatePackageGovernanceSignoffArchivePackContract;
  summary: InventoryStockoutCandidatePackageGovernanceSignoffArchivePackSummary;
  gates: InventoryStockoutCandidatePackageGovernanceSignoffArchivePackGate[];
  archivePacket: Record<string, unknown>;
  retentionPolicy: Record<string, unknown>;
  safetyPolicy: Record<string, unknown>;
  archiveRecord?: Record<string, unknown> | null;
};

export type MlCandidatePackageGovernanceSignoffArchivePackCatalogSummary = {
  generatedAt: string;
  contract: InventoryStockoutCandidatePackageGovernanceSignoffArchivePackContract;
  currentCandidatePackageGovernanceSignoffArchivePack: InventoryStockoutCandidatePackageGovernanceSignoffArchivePackSummary;
  lastCandidatePackageGovernanceSignoffArchivePacks: Array<Record<string, unknown>>;
  recommendedNextAction: string;
};

export type MlCandidatePackageGovernanceSignoffArchivePackSummaryPayload = {
  generatedAt?: string;
  currentCandidatePackageGovernanceSignoffArchivePack?: {
    status?: string;
    recommendation?: string;
    readinessScorePct?: number | null;
    finalAuditSnapshotGovernanceSignoffId?: number | null;
    signedFinalAuditSnapshotGovernanceSignoffHash?: string | null;
    governanceSignoffArchivePackIsProductionApproval?: boolean;
    governanceSignoffArchivePackCanLoadSignoffBytes?: boolean;
    governanceSignoffArchivePackCanLoadSnapshotBytes?: boolean;
    governanceSignoffArchivePackCanLoadArchiveBytes?: boolean;
    governanceSignoffArchivePackCanLoadPackageBytes?: boolean;
    governanceSignoffArchivePackCanPersistArtifactBytes?: boolean;
    governanceSignoffArchivePackCanExecuteModel?: boolean;
    governanceSignoffArchivePackCanExposeInferenceEndpoint?: boolean;
    governanceSignoffArchivePackCanActivateArtifact?: boolean;
    governanceSignoffArchivePackCanDeployArtifact?: boolean;
    governanceSignoffArchivePackCanProductionScore?: boolean;
    governanceSignoffArchivePackCanScheduleRetentionJobs?: boolean;
    governanceSignoffArchivePackCanDeleteOrPurge?: boolean;
    governanceSignoffArchivePackMetadataOnly?: boolean;
    retentionPolicyLocked?: boolean;
    finalAuditSnapshotImmutable?: boolean;
    governanceSignoffIsFinalAuditClosure?: boolean;
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
  lastCandidatePackageGovernanceSignoffArchivePacks?: Array<Record<string, unknown>>;
  recommendedNextAction?: string;
  [key: string]: unknown;
};
