// Phase 8K — Offline Candidate Package Governance Signoff Archive Finalization Summary Pack type surface.

export type CandidatePackageGovernanceSignoffArchiveFinalizationSummaryPackStatus =
  | "governance_signoff_archive_finalization_summary_pack_ready"
  | "needs_phase8j_governance_signoff_archive_pack"
  | "needs_signed_governance_signoff_archive_hash"
  | "safety_blocked";

export type CandidatePackageGovernanceSignoffArchiveFinalizationSummaryPackRecommendation =
  | "record_metadata_only_governance_signoff_archive_finalization_summary_pack"
  | "record_phase8j_governance_signoff_archive_pack_first"
  | "restore_signed_governance_signoff_archive_hash_traceability"
  | "resolve_safety_blocks_first";

export type InventoryStockoutCandidatePackageGovernanceSignoffArchiveFinalizationSummaryPackGate = {
  key: string;
  label: string;
  status: "pass" | "warning" | "block";
  value: unknown;
  message: string;
};

export type InventoryStockoutCandidatePackageGovernanceSignoffArchiveFinalizationSummaryPackContract = {
  contractKey: "inventory_stockout_candidate_package_governance_signoff_archive_finalization_summary_pack_v1";
  contractVersion: "v1";
  generatedAt: string;
  phase: "Phase 8K";
  purpose: string;
  finalizationScope: "offline_candidate_package_governance_signoff_archive_finalization_summary_metadata_only";
  requiredUpstreamGovernanceSignoffArchivePackKey: "inventory_stockout_candidate_package_governance_signoff_archive_pack_v1";
  requiredUpstreamGovernanceSignoffArchivePackVersion: "v1";
  requiredUpstreamEvidence: string[];
  includedFinalizationSections: string[];
  forbiddenBehavior: string[];
  operationalPolicy: {
    governanceSignoffArchiveFinalizationSummaryPackIsProductionApproval: false;
    governanceSignoffArchiveFinalizationSummaryPackCanLoadSignoffBytes: false;
    governanceSignoffArchiveFinalizationSummaryPackCanLoadSnapshotBytes: false;
    governanceSignoffArchiveFinalizationSummaryPackCanLoadArchiveBytes: false;
    governanceSignoffArchiveFinalizationSummaryPackCanLoadPackageBytes: false;
    governanceSignoffArchiveFinalizationSummaryPackCanPersistArtifactBytes: false;
    governanceSignoffArchiveFinalizationSummaryPackCanExecuteModel: false;
    governanceSignoffArchiveFinalizationSummaryPackCanInvokeRuntime: false;
    governanceSignoffArchiveFinalizationSummaryPackCanExposeInferenceEndpoint: false;
    governanceSignoffArchiveFinalizationSummaryPackCanActivateArtifact: false;
    governanceSignoffArchiveFinalizationSummaryPackCanDeployArtifact: false;
    governanceSignoffArchiveFinalizationSummaryPackCanProductionScore: false;
    governanceSignoffArchiveFinalizationSummaryPackCanScheduleRetentionJobs: false;
    governanceSignoffArchiveFinalizationSummaryPackCanDeleteOrPurge: false;
    governanceSignoffArchiveFinalizationSummaryPackMetadataOnly: true;
    retentionPolicyLocked: true;
    finalAuditSnapshotImmutable: true;
    governanceSignoffArchiveFinalizationIsClosureSummary: true;
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

export type InventoryStockoutCandidatePackageGovernanceSignoffArchiveFinalizationSummaryPackSummary = {
  governanceSignoffArchiveFinalizationSummaryPackKey: "inventory_stockout_candidate_package_governance_signoff_archive_finalization_summary_pack_v1";
  governanceSignoffArchiveFinalizationSummaryPackVersion: "v1";
  generatedAt: string;
  phase: "Phase 8K";
  status: CandidatePackageGovernanceSignoffArchiveFinalizationSummaryPackStatus;
  recommendation: CandidatePackageGovernanceSignoffArchiveFinalizationSummaryPackRecommendation;
  readinessScorePct: number;
  governanceSignoffArchivePackId: number | null;
  governanceSignoffArchivePackKey: "inventory_stockout_candidate_package_governance_signoff_archive_pack_v1";
  governanceSignoffArchivePackVersion: "v1";
  governanceSignoffArchivePackStatus: string | null;
  signedGovernanceSignoffArchiveHash: string | null;
  finalAuditSnapshotGovernanceSignoffId: number | null;
  signedFinalAuditSnapshotGovernanceSignoffHash: string | null;
  retentionArchiveFinalAuditSnapshotId: number | null;
  signedRetentionArchiveFinalAuditSnapshotHash: string | null;
  packageId: number | null;
  packageKey: "inventory_stockout_offline_candidate_model_package_v1";
  packageVersion: "v1";
  governanceSignoffArchiveFinalizationMode: "metadata_only_governance_signoff_archive_finalization_summary_pack";
  governanceSignoffArchiveFinalizationSummaryPackIsProductionApproval: false;
  governanceSignoffArchiveFinalizationSummaryPackCanLoadSignoffBytes: false;
  governanceSignoffArchiveFinalizationSummaryPackCanLoadSnapshotBytes: false;
  governanceSignoffArchiveFinalizationSummaryPackCanLoadArchiveBytes: false;
  governanceSignoffArchiveFinalizationSummaryPackCanLoadPackageBytes: false;
  governanceSignoffArchiveFinalizationSummaryPackCanPersistArtifactBytes: false;
  governanceSignoffArchiveFinalizationSummaryPackCanExecuteModel: false;
  governanceSignoffArchiveFinalizationSummaryPackCanInvokeRuntime: false;
  governanceSignoffArchiveFinalizationSummaryPackCanExposeInferenceEndpoint: false;
  governanceSignoffArchiveFinalizationSummaryPackCanActivateArtifact: false;
  governanceSignoffArchiveFinalizationSummaryPackCanDeployArtifact: false;
  governanceSignoffArchiveFinalizationSummaryPackCanProductionScore: false;
  governanceSignoffArchiveFinalizationSummaryPackCanScheduleRetentionJobs: false;
  governanceSignoffArchiveFinalizationSummaryPackCanDeleteOrPurge: false;
  governanceSignoffArchiveFinalizationSummaryPackMetadataOnly: true;
  retentionPolicyLocked: true;
  finalAuditSnapshotImmutable: true;
  governanceSignoffArchiveFinalizationIsClosureSummary: true;
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
  signedGovernanceSignoffArchiveFinalizationSummaryHash: string | null;
  recommendedNextAction: string;
};

export type InventoryStockoutCandidatePackageGovernanceSignoffArchiveFinalizationSummaryPackResponse = {
  success: true;
  contract: InventoryStockoutCandidatePackageGovernanceSignoffArchiveFinalizationSummaryPackContract;
  summary: InventoryStockoutCandidatePackageGovernanceSignoffArchiveFinalizationSummaryPackSummary;
  gates: InventoryStockoutCandidatePackageGovernanceSignoffArchiveFinalizationSummaryPackGate[];
  finalizationSummaryPacket: Record<string, unknown>;
  retentionPolicy: Record<string, unknown>;
  safetyPolicy: Record<string, unknown>;
  finalizationRecord?: Record<string, unknown> | null;
};

export type MlCandidatePackageGovernanceSignoffArchiveFinalizationSummaryPackCatalogSummary = {
  generatedAt: string;
  contract: InventoryStockoutCandidatePackageGovernanceSignoffArchiveFinalizationSummaryPackContract;
  currentCandidatePackageGovernanceSignoffArchiveFinalizationSummaryPack: InventoryStockoutCandidatePackageGovernanceSignoffArchiveFinalizationSummaryPackSummary;
  lastCandidatePackageGovernanceSignoffArchiveFinalizationSummaryPacks: Array<Record<string, unknown>>;
  recommendedNextAction: string;
};

export type MlCandidatePackageGovernanceSignoffArchiveFinalizationSummaryPackSummaryPayload = {
  generatedAt?: string;
  currentCandidatePackageGovernanceSignoffArchiveFinalizationSummaryPack?: {
    status?: string;
    recommendation?: string;
    readinessScorePct?: number | null;
    governanceSignoffArchivePackId?: number | null;
    signedGovernanceSignoffArchiveHash?: string | null;
    governanceSignoffArchiveFinalizationSummaryPackIsProductionApproval?: boolean;
    governanceSignoffArchiveFinalizationSummaryPackCanLoadSignoffBytes?: boolean;
    governanceSignoffArchiveFinalizationSummaryPackCanLoadSnapshotBytes?: boolean;
    governanceSignoffArchiveFinalizationSummaryPackCanLoadArchiveBytes?: boolean;
    governanceSignoffArchiveFinalizationSummaryPackCanLoadPackageBytes?: boolean;
    governanceSignoffArchiveFinalizationSummaryPackCanPersistArtifactBytes?: boolean;
    governanceSignoffArchiveFinalizationSummaryPackCanExecuteModel?: boolean;
    governanceSignoffArchiveFinalizationSummaryPackCanExposeInferenceEndpoint?: boolean;
    governanceSignoffArchiveFinalizationSummaryPackCanActivateArtifact?: boolean;
    governanceSignoffArchiveFinalizationSummaryPackCanDeployArtifact?: boolean;
    governanceSignoffArchiveFinalizationSummaryPackCanProductionScore?: boolean;
    governanceSignoffArchiveFinalizationSummaryPackCanScheduleRetentionJobs?: boolean;
    governanceSignoffArchiveFinalizationSummaryPackCanDeleteOrPurge?: boolean;
    governanceSignoffArchiveFinalizationSummaryPackMetadataOnly?: boolean;
    retentionPolicyLocked?: boolean;
    finalAuditSnapshotImmutable?: boolean;
    governanceSignoffArchiveFinalizationIsClosureSummary?: boolean;
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
  lastCandidatePackageGovernanceSignoffArchiveFinalizationSummaryPacks?: Array<Record<string, unknown>>;
  recommendedNextAction?: string;
  [key: string]: unknown;
};
