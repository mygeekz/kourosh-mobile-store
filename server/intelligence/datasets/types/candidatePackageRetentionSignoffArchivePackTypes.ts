// Phase 8G — Offline Candidate Package Retention Signoff Archive Pack type surface.

export type CandidatePackageRetentionSignoffArchivePackStatus =
  | "retention_signoff_archive_pack_ready"
  | "needs_phase8f_retention_review_signoff"
  | "needs_signed_retention_review_signoff_hash"
  | "safety_blocked";

export type CandidatePackageRetentionSignoffArchivePackRecommendation =
  | "record_metadata_only_retention_signoff_archive_pack"
  | "record_phase8f_retention_review_signoff_first"
  | "restore_signed_retention_review_signoff_hash_traceability"
  | "resolve_safety_blocks_first";

export type InventoryStockoutCandidatePackageRetentionSignoffArchivePackGate = {
  key: string;
  label: string;
  status: "pass" | "warning" | "block";
  value: unknown;
  message: string;
};

export type InventoryStockoutCandidatePackageRetentionSignoffArchivePackContract = {
  contractKey: "inventory_stockout_candidate_package_retention_signoff_archive_pack_v1";
  contractVersion: "v1";
  generatedAt: string;
  phase: "Phase 8G";
  purpose: string;
  archiveScope: "offline_candidate_package_retention_signoff_archive_metadata_only";
  requiredUpstreamRetentionReviewSignoffKey: "inventory_stockout_candidate_package_archive_retention_review_signoff_gate_v1";
  requiredUpstreamRetentionReviewSignoffVersion: "v1";
  requiredUpstreamEvidence: string[];
  includedArchiveSections: string[];
  forbiddenBehavior: string[];
  operationalPolicy: {
    retentionSignoffArchivePackIsProductionApproval: false;
    retentionSignoffArchivePackCanLoadArchiveBytes: false;
    retentionSignoffArchivePackCanLoadPackageBytes: false;
    retentionSignoffArchivePackCanPersistArtifactBytes: false;
    retentionSignoffArchivePackCanExecuteModel: false;
    retentionSignoffArchivePackCanInvokeRuntime: false;
    retentionSignoffArchivePackCanExposeInferenceEndpoint: false;
    retentionSignoffArchivePackCanActivateArtifact: false;
    retentionSignoffArchivePackCanDeployArtifact: false;
    retentionSignoffArchivePackCanProductionScore: false;
    retentionSignoffArchivePackCanScheduleRetentionJobs: false;
    retentionSignoffArchivePackCanDeleteOrPurge: false;
    retentionSignoffArchivePackMetadataOnly: true;
    retentionPolicyLocked: true;
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

export type InventoryStockoutCandidatePackageRetentionSignoffArchivePackSummary = {
  retentionSignoffArchivePackKey: "inventory_stockout_candidate_package_retention_signoff_archive_pack_v1";
  retentionSignoffArchivePackVersion: "v1";
  generatedAt: string;
  phase: "Phase 8G";
  status: CandidatePackageRetentionSignoffArchivePackStatus;
  recommendation: CandidatePackageRetentionSignoffArchivePackRecommendation;
  readinessScorePct: number;
  retentionReviewSignoffId: number | null;
  retentionReviewSignoffKey: "inventory_stockout_candidate_package_archive_retention_review_signoff_gate_v1";
  retentionReviewSignoffVersion: "v1";
  retentionReviewSignoffStatus: string | null;
  signedRetentionReviewSignoffHash: string | null;
  retentionReviewBinderId: number | null;
  signedRetentionReviewBinderHash: string | null;
  packageId: number | null;
  packageKey: "inventory_stockout_offline_candidate_model_package_v1";
  packageVersion: "v1";
  retentionSignoffArchiveMode: "metadata_only_retention_signoff_archive_pack";
  retentionSignoffArchivePackIsProductionApproval: false;
  retentionSignoffArchivePackCanLoadArchiveBytes: false;
  retentionSignoffArchivePackCanLoadPackageBytes: false;
  retentionSignoffArchivePackCanPersistArtifactBytes: false;
  retentionSignoffArchivePackCanExecuteModel: false;
  retentionSignoffArchivePackCanInvokeRuntime: false;
  retentionSignoffArchivePackCanExposeInferenceEndpoint: false;
  retentionSignoffArchivePackCanActivateArtifact: false;
  retentionSignoffArchivePackCanDeployArtifact: false;
  retentionSignoffArchivePackCanProductionScore: false;
  retentionSignoffArchivePackCanScheduleRetentionJobs: false;
  retentionSignoffArchivePackCanDeleteOrPurge: false;
  retentionSignoffArchivePackMetadataOnly: true;
  retentionPolicyLocked: true;
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
  signedRetentionSignoffArchiveHash: string | null;
  recommendedNextAction: string;
};

export type InventoryStockoutCandidatePackageRetentionSignoffArchivePackResponse = {
  success: true;
  contract: InventoryStockoutCandidatePackageRetentionSignoffArchivePackContract;
  summary: InventoryStockoutCandidatePackageRetentionSignoffArchivePackSummary;
  gates: InventoryStockoutCandidatePackageRetentionSignoffArchivePackGate[];
  archivePacket: Record<string, unknown>;
  retentionPolicy: Record<string, unknown>;
  safetyPolicy: Record<string, unknown>;
  archiveRecord?: Record<string, unknown> | null;
};

export type MlCandidatePackageRetentionSignoffArchivePackCatalogSummary = {
  generatedAt: string;
  contract: InventoryStockoutCandidatePackageRetentionSignoffArchivePackContract;
  currentCandidatePackageRetentionSignoffArchivePack: InventoryStockoutCandidatePackageRetentionSignoffArchivePackSummary;
  lastCandidatePackageRetentionSignoffArchivePacks: Array<Record<string, unknown>>;
  recommendedNextAction: string;
};

export type MlCandidatePackageRetentionSignoffArchivePackSummaryPayload = {
  generatedAt?: string;
  currentCandidatePackageRetentionSignoffArchivePack?: {
    status?: string;
    recommendation?: string;
    readinessScorePct?: number | null;
    retentionReviewSignoffId?: number | null;
    signedRetentionReviewSignoffHash?: string | null;
    retentionSignoffArchivePackIsProductionApproval?: boolean;
    retentionSignoffArchivePackCanLoadArchiveBytes?: boolean;
    retentionSignoffArchivePackCanLoadPackageBytes?: boolean;
    retentionSignoffArchivePackCanPersistArtifactBytes?: boolean;
    retentionSignoffArchivePackCanExecuteModel?: boolean;
    retentionSignoffArchivePackCanExposeInferenceEndpoint?: boolean;
    retentionSignoffArchivePackCanActivateArtifact?: boolean;
    retentionSignoffArchivePackCanDeployArtifact?: boolean;
    retentionSignoffArchivePackCanProductionScore?: boolean;
    retentionSignoffArchivePackCanScheduleRetentionJobs?: boolean;
    retentionSignoffArchivePackCanDeleteOrPurge?: boolean;
    retentionSignoffArchivePackMetadataOnly?: boolean;
    retentionPolicyLocked?: boolean;
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
  lastCandidatePackageRetentionSignoffArchivePacks?: Array<Record<string, unknown>>;
  recommendedNextAction?: string;
  [key: string]: unknown;
};
