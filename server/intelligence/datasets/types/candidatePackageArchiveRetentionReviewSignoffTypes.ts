// Phase 8F — Offline Candidate Package Archive Retention Review Signoff Gate type surface.

export type CandidatePackageArchiveRetentionReviewSignoffStatus =
  | "retention_review_signoff_ready"
  | "needs_phase8e_retention_review_binder"
  | "needs_signed_retention_review_binder_hash"
  | "needs_retention_review_signoff_evidence"
  | "safety_blocked";

export type CandidatePackageArchiveRetentionReviewSignoffRecommendation =
  | "record_metadata_only_archive_retention_review_signoff"
  | "record_phase8e_retention_review_binder_first"
  | "restore_signed_retention_review_binder_hash_traceability"
  | "collect_retention_review_signoff_evidence_first"
  | "resolve_safety_blocks_first";

export type InventoryStockoutCandidatePackageArchiveRetentionReviewSignoffGate = {
  key: string;
  label: string;
  status: "pass" | "warning" | "block";
  value: unknown;
  message: string;
};

export type InventoryStockoutCandidatePackageArchiveRetentionReviewSignoffContract = {
  contractKey: "inventory_stockout_candidate_package_archive_retention_review_signoff_gate_v1";
  contractVersion: "v1";
  generatedAt: string;
  phase: "Phase 8F";
  purpose: string;
  signoffScope: "offline_candidate_package_archive_retention_review_signoff_metadata_only";
  requiredUpstreamRetentionReviewBinderKey: "inventory_stockout_candidate_package_archive_retention_review_binder_v1";
  requiredUpstreamRetentionReviewBinderVersion: "v1";
  requiredUpstreamEvidence: string[];
  requiredRetentionReviewSignoffEvidence: string[];
  includedSignoffSections: string[];
  forbiddenBehavior: string[];
  operationalPolicy: {
    retentionReviewHumanSignoffRequired: true;
    retentionReviewSignoffIsProductionApproval: false;
    retentionReviewSignoffCanLoadArchiveBytes: false;
    retentionReviewSignoffCanLoadPackageBytes: false;
    retentionReviewSignoffCanPersistArtifactBytes: false;
    retentionReviewSignoffCanExecuteModel: false;
    retentionReviewSignoffCanInvokeRuntime: false;
    retentionReviewSignoffCanExposeInferenceEndpoint: false;
    retentionReviewSignoffCanActivateArtifact: false;
    retentionReviewSignoffCanDeployArtifact: false;
    retentionReviewSignoffCanProductionScore: false;
    retentionReviewSignoffCanScheduleRetentionJobs: false;
    retentionReviewSignoffCanDeleteOrPurge: false;
    retentionReviewSignoffMetadataOnly: true;
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

export type InventoryStockoutCandidatePackageArchiveRetentionReviewSignoffSummary = {
  retentionReviewSignoffKey: "inventory_stockout_candidate_package_archive_retention_review_signoff_gate_v1";
  retentionReviewSignoffVersion: "v1";
  generatedAt: string;
  phase: "Phase 8F";
  status: CandidatePackageArchiveRetentionReviewSignoffStatus;
  recommendation: CandidatePackageArchiveRetentionReviewSignoffRecommendation;
  readinessScorePct: number;
  retentionReviewBinderId: number | null;
  retentionReviewBinderKey: "inventory_stockout_candidate_package_archive_retention_review_binder_v1";
  retentionReviewBinderVersion: "v1";
  retentionReviewStatus: string | null;
  signedRetentionReviewBinderHash: string | null;
  archivePackId: number | null;
  archivePackKey: string | null;
  archivePackVersion: string | null;
  signedArchiveHash: string | null;
  signoffId: number | null;
  signoffKey: string | null;
  signoffVersion: string | null;
  signedReviewHash: string | null;
  packageId: number | null;
  packageKey: "inventory_stockout_offline_candidate_model_package_v1";
  packageVersion: "v1";
  retentionReviewSignoffMode: "metadata_only_archive_retention_review_signoff_gate";
  retentionReviewHumanSignoffRequired: true;
  retentionReviewSignoffEvidenceProvided: boolean;
  retentionReviewSignoffIsProductionApproval: false;
  retentionReviewSignoffCanLoadArchiveBytes: false;
  retentionReviewSignoffCanLoadPackageBytes: false;
  retentionReviewSignoffCanPersistArtifactBytes: false;
  retentionReviewSignoffCanExecuteModel: false;
  retentionReviewSignoffCanInvokeRuntime: false;
  retentionReviewSignoffCanExposeInferenceEndpoint: false;
  retentionReviewSignoffCanActivateArtifact: false;
  retentionReviewSignoffCanDeployArtifact: false;
  retentionReviewSignoffCanProductionScore: false;
  retentionReviewSignoffCanScheduleRetentionJobs: false;
  retentionReviewSignoffCanDeleteOrPurge: false;
  retentionReviewSignoffMetadataOnly: true;
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
  signedRetentionReviewSignoffHash: string | null;
  recommendedNextAction: string;
};

export type InventoryStockoutCandidatePackageArchiveRetentionReviewSignoffResponse = {
  success: true;
  contract: InventoryStockoutCandidatePackageArchiveRetentionReviewSignoffContract;
  summary: InventoryStockoutCandidatePackageArchiveRetentionReviewSignoffSummary;
  gates: InventoryStockoutCandidatePackageArchiveRetentionReviewSignoffGate[];
  signoffPacket: Record<string, unknown>;
  signoffPayload: Record<string, unknown>;
  retentionReviewSignoffPolicy: Record<string, unknown>;
  safetyPolicy: Record<string, unknown>;
  signoffRecord?: Record<string, unknown> | null;
};

export type MlCandidatePackageArchiveRetentionReviewSignoffCatalogSummary = {
  generatedAt: string;
  contract: InventoryStockoutCandidatePackageArchiveRetentionReviewSignoffContract;
  currentCandidatePackageArchiveRetentionReviewSignoff: InventoryStockoutCandidatePackageArchiveRetentionReviewSignoffSummary;
  lastCandidatePackageArchiveRetentionReviewSignoffs: Array<Record<string, unknown>>;
  recommendedNextAction: string;
};

export type MlCandidatePackageArchiveRetentionReviewSignoffSummaryPayload = {
  generatedAt?: string;
  currentCandidatePackageArchiveRetentionReviewSignoff?: {
    status?: string;
    recommendation?: string;
    readinessScorePct?: number | null;
    retentionReviewBinderId?: number | null;
    signedRetentionReviewBinderHash?: string | null;
    retentionReviewSignoffEvidenceProvided?: boolean;
    retentionReviewHumanSignoffRequired?: boolean;
    retentionReviewSignoffIsProductionApproval?: boolean;
    retentionReviewSignoffCanLoadArchiveBytes?: boolean;
    retentionReviewSignoffCanLoadPackageBytes?: boolean;
    retentionReviewSignoffCanPersistArtifactBytes?: boolean;
    retentionReviewSignoffCanExecuteModel?: boolean;
    retentionReviewSignoffCanExposeInferenceEndpoint?: boolean;
    retentionReviewSignoffCanActivateArtifact?: boolean;
    retentionReviewSignoffCanDeployArtifact?: boolean;
    retentionReviewSignoffCanProductionScore?: boolean;
    retentionReviewSignoffCanScheduleRetentionJobs?: boolean;
    retentionReviewSignoffCanDeleteOrPurge?: boolean;
    retentionReviewSignoffMetadataOnly?: boolean;
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
  lastCandidatePackageArchiveRetentionReviewSignoffs?: Array<Record<string, unknown>>;
  recommendedNextAction?: string;
  [key: string]: unknown;
};
