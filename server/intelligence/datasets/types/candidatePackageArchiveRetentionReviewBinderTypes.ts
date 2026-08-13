// Phase 8E — Offline Candidate Package Archive Retention Review Binder type surface.

export type CandidatePackageArchiveRetentionReviewBinderStatus =
  | "retention_review_binder_ready"
  | "needs_phase8d_archive_pack"
  | "needs_signed_archive_hash"
  | "safety_blocked";

export type CandidatePackageArchiveRetentionReviewBinderRecommendation =
  | "record_metadata_only_archive_retention_review_binder"
  | "record_phase8d_human_signoff_archive_pack_first"
  | "restore_signed_archive_hash_traceability"
  | "resolve_safety_blocks_first";

export type InventoryStockoutCandidatePackageArchiveRetentionReviewBinderGate = {
  key: string;
  label: string;
  status: "pass" | "warning" | "block";
  value: unknown;
  message: string;
};

export type InventoryStockoutCandidatePackageArchiveRetentionReviewBinderContract = {
  contractKey: "inventory_stockout_candidate_package_archive_retention_review_binder_v1";
  contractVersion: "v1";
  generatedAt: string;
  phase: "Phase 8E";
  purpose: string;
  binderScope: "offline_candidate_package_archive_retention_review_metadata_only";
  requiredUpstreamArchivePackKey: "inventory_stockout_candidate_package_human_signoff_archive_pack_v1";
  requiredUpstreamArchivePackVersion: "v1";
  requiredUpstreamEvidence: string[];
  includedBinderSections: string[];
  forbiddenBehavior: string[];
  operationalPolicy: {
    retentionReviewBinderIsProductionApproval: false;
    retentionReviewBinderCanLoadArchiveBytes: false;
    retentionReviewBinderCanLoadPackageBytes: false;
    retentionReviewBinderCanPersistArtifactBytes: false;
    retentionReviewBinderCanExecuteModel: false;
    retentionReviewBinderCanInvokeRuntime: false;
    retentionReviewBinderCanExposeInferenceEndpoint: false;
    retentionReviewBinderCanActivateArtifact: false;
    retentionReviewBinderCanDeployArtifact: false;
    retentionReviewBinderCanProductionScore: false;
    retentionReviewBinderCanScheduleRetentionJobs: false;
    retentionReviewBinderCanDeleteOrPurge: false;
    retentionReviewBinderMetadataOnly: true;
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

export type InventoryStockoutCandidatePackageArchiveRetentionReviewBinderSummary = {
  retentionReviewBinderKey: "inventory_stockout_candidate_package_archive_retention_review_binder_v1";
  retentionReviewBinderVersion: "v1";
  generatedAt: string;
  phase: "Phase 8E";
  status: CandidatePackageArchiveRetentionReviewBinderStatus;
  recommendation: CandidatePackageArchiveRetentionReviewBinderRecommendation;
  readinessScorePct: number;
  archivePackId: number | null;
  archivePackKey: "inventory_stockout_candidate_package_human_signoff_archive_pack_v1";
  archivePackVersion: "v1";
  archiveStatus: string | null;
  signedArchiveHash: string | null;
  signoffId: number | null;
  signoffKey: string | null;
  signoffVersion: string | null;
  signedReviewHash: string | null;
  packageId: number | null;
  packageKey: "inventory_stockout_offline_candidate_model_package_v1";
  packageVersion: "v1";
  retentionReviewMode: "metadata_only_archive_retention_review_binder";
  retentionReviewBinderIsProductionApproval: false;
  retentionReviewBinderCanLoadArchiveBytes: false;
  retentionReviewBinderCanLoadPackageBytes: false;
  retentionReviewBinderCanPersistArtifactBytes: false;
  retentionReviewBinderCanExecuteModel: false;
  retentionReviewBinderCanInvokeRuntime: false;
  retentionReviewBinderCanExposeInferenceEndpoint: false;
  retentionReviewBinderCanActivateArtifact: false;
  retentionReviewBinderCanDeployArtifact: false;
  retentionReviewBinderCanProductionScore: false;
  retentionReviewBinderCanScheduleRetentionJobs: false;
  retentionReviewBinderCanDeleteOrPurge: false;
  retentionReviewBinderMetadataOnly: true;
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
  signedRetentionReviewBinderHash: string | null;
  recommendedNextAction: string;
};

export type InventoryStockoutCandidatePackageArchiveRetentionReviewBinderResponse = {
  success: true;
  contract: InventoryStockoutCandidatePackageArchiveRetentionReviewBinderContract;
  summary: InventoryStockoutCandidatePackageArchiveRetentionReviewBinderSummary;
  gates: InventoryStockoutCandidatePackageArchiveRetentionReviewBinderGate[];
  retentionReviewBinder: Record<string, unknown>;
  retentionReviewPolicy: Record<string, unknown>;
  safetyPolicy: Record<string, unknown>;
  binderRecord?: Record<string, unknown> | null;
};

export type MlCandidatePackageArchiveRetentionReviewBinderCatalogSummary = {
  generatedAt: string;
  contract: InventoryStockoutCandidatePackageArchiveRetentionReviewBinderContract;
  currentCandidatePackageArchiveRetentionReviewBinder: InventoryStockoutCandidatePackageArchiveRetentionReviewBinderSummary;
  lastCandidatePackageArchiveRetentionReviewBinders: Array<Record<string, unknown>>;
  recommendedNextAction: string;
};

export type MlCandidatePackageArchiveRetentionReviewBinderSummaryPayload = {
  generatedAt?: string;
  currentCandidatePackageArchiveRetentionReviewBinder?: {
    status?: string;
    recommendation?: string;
    readinessScorePct?: number | null;
    archivePackId?: number | null;
    signedArchiveHash?: string | null;
    signoffId?: number | null;
    packageId?: number | null;
    retentionReviewBinderIsProductionApproval?: boolean;
    retentionReviewBinderCanLoadArchiveBytes?: boolean;
    retentionReviewBinderCanLoadPackageBytes?: boolean;
    retentionReviewBinderCanPersistArtifactBytes?: boolean;
    retentionReviewBinderCanExecuteModel?: boolean;
    retentionReviewBinderCanExposeInferenceEndpoint?: boolean;
    retentionReviewBinderCanActivateArtifact?: boolean;
    retentionReviewBinderCanDeployArtifact?: boolean;
    retentionReviewBinderCanProductionScore?: boolean;
    retentionReviewBinderCanScheduleRetentionJobs?: boolean;
    retentionReviewBinderCanDeleteOrPurge?: boolean;
    retentionReviewBinderMetadataOnly?: boolean;
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
  lastCandidatePackageArchiveRetentionReviewBinders?: Array<Record<string, unknown>>;
  recommendedNextAction?: string;
  [key: string]: unknown;
};
