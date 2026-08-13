// Phase 8D — Offline Candidate Package Human Signoff Archive Pack type surface.

export type CandidatePackageHumanSignoffArchivePackStatus =
  | "archive_pack_ready"
  | "needs_phase8c_human_signoff"
  | "needs_signed_review_hash"
  | "safety_blocked";

export type CandidatePackageHumanSignoffArchivePackRecommendation =
  | "record_metadata_only_human_signoff_archive_pack"
  | "record_phase8c_human_review_signoff_first"
  | "restore_signed_review_hash_traceability"
  | "resolve_safety_blocks_first";

export type InventoryStockoutCandidatePackageHumanSignoffArchivePackGate = {
  key: string;
  label: string;
  status: "pass" | "warning" | "block";
  value: unknown;
  message: string;
};

export type InventoryStockoutCandidatePackageHumanSignoffArchivePackContract = {
  contractKey: "inventory_stockout_candidate_package_human_signoff_archive_pack_v1";
  contractVersion: "v1";
  generatedAt: string;
  phase: "Phase 8D";
  purpose: string;
  archiveScope: "offline_candidate_package_human_signoff_archive_metadata_only";
  requiredUpstreamSignoffKey: "inventory_stockout_candidate_package_human_review_signoff_gate_v1";
  requiredUpstreamSignoffVersion: "v1";
  requiredUpstreamEvidence: string[];
  includedArchiveSections: string[];
  forbiddenBehavior: string[];
  operationalPolicy: {
    archivePackIsProductionApproval: false;
    archivePackCanLoadPackageBytes: false;
    archivePackCanPersistArtifactBytes: false;
    archivePackCanExecuteModel: false;
    archivePackCanInvokeRuntime: false;
    archivePackCanExposeInferenceEndpoint: false;
    archivePackCanActivateArtifact: false;
    archivePackCanDeployArtifact: false;
    archivePackCanProductionScore: false;
    archivePackCanScheduleRetentionJobs: false;
    archivePackCanDeleteOrPurge: false;
    archivePackMetadataOnly: true;
    retentionPolicyLocked: true;
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

export type InventoryStockoutCandidatePackageHumanSignoffArchivePackSummary = {
  archivePackKey: "inventory_stockout_candidate_package_human_signoff_archive_pack_v1";
  archivePackVersion: "v1";
  generatedAt: string;
  phase: "Phase 8D";
  status: CandidatePackageHumanSignoffArchivePackStatus;
  recommendation: CandidatePackageHumanSignoffArchivePackRecommendation;
  readinessScorePct: number;
  signoffId: number | null;
  signoffKey: "inventory_stockout_candidate_package_human_review_signoff_gate_v1";
  signoffVersion: "v1";
  reviewStatus: string | null;
  signoffStatus: string | null;
  signedReviewHash: string | null;
  binderId: number | null;
  packageId: number | null;
  packageKey: "inventory_stockout_offline_candidate_model_package_v1";
  packageVersion: "v1";
  importId: number | null;
  artifactMetadataId: number | null;
  approvalReviewId: number | null;
  modelKey: string | null;
  modelVersion: string | null;
  artifactChecksumSha256: string | null;
  archiveMode: "metadata_only_human_signoff_archive_pack";
  archivePackIsProductionApproval: false;
  archivePackCanLoadPackageBytes: false;
  archivePackCanPersistArtifactBytes: false;
  archivePackCanExecuteModel: false;
  archivePackCanInvokeRuntime: false;
  archivePackCanExposeInferenceEndpoint: false;
  archivePackCanActivateArtifact: false;
  archivePackCanDeployArtifact: false;
  archivePackCanProductionScore: false;
  archivePackCanScheduleRetentionJobs: false;
  archivePackCanDeleteOrPurge: false;
  archivePackMetadataOnly: true;
  retentionPolicyLocked: true;
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
  signedArchiveHash: string | null;
  recommendedNextAction: string;
};

export type InventoryStockoutCandidatePackageHumanSignoffArchivePackResponse = {
  success: true;
  contract: InventoryStockoutCandidatePackageHumanSignoffArchivePackContract;
  summary: InventoryStockoutCandidatePackageHumanSignoffArchivePackSummary;
  gates: InventoryStockoutCandidatePackageHumanSignoffArchivePackGate[];
  archivePack: Record<string, unknown>;
  retentionPolicy: Record<string, unknown>;
  safetyPolicy: Record<string, unknown>;
  archiveRecord?: Record<string, unknown> | null;
};

export type MlCandidatePackageHumanSignoffArchivePackCatalogSummary = {
  generatedAt: string;
  contract: InventoryStockoutCandidatePackageHumanSignoffArchivePackContract;
  currentCandidatePackageHumanSignoffArchivePack: InventoryStockoutCandidatePackageHumanSignoffArchivePackSummary;
  lastCandidatePackageHumanSignoffArchivePacks: Array<Record<string, unknown>>;
  recommendedNextAction: string;
};

export type MlCandidatePackageHumanSignoffArchivePackSummaryPayload = {
  generatedAt?: string;
  currentCandidatePackageHumanSignoffArchivePack?: {
    status?: string;
    recommendation?: string;
    readinessScorePct?: number | null;
    signoffId?: number | null;
    packageId?: number | null;
    modelKey?: string | null;
    modelVersion?: string | null;
    artifactChecksumSha256?: string | null;
    signedReviewHash?: string | null;
    archivePackIsProductionApproval?: boolean;
    archivePackCanLoadPackageBytes?: boolean;
    archivePackCanPersistArtifactBytes?: boolean;
    archivePackCanExecuteModel?: boolean;
    archivePackCanExposeInferenceEndpoint?: boolean;
    archivePackCanActivateArtifact?: boolean;
    archivePackCanDeployArtifact?: boolean;
    archivePackCanProductionScore?: boolean;
    archivePackCanScheduleRetentionJobs?: boolean;
    archivePackCanDeleteOrPurge?: boolean;
    archivePackMetadataOnly?: boolean;
    retentionPolicyLocked?: boolean;
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
  lastCandidatePackageHumanSignoffArchivePacks?: Array<Record<string, unknown>>;
  recommendedNextAction?: string;
  [key: string]: unknown;
};
