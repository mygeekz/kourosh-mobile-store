// Phase 8A — Offline Inventory Stockout Candidate Model Package type surface.

export type CandidateModelPackageStatus =
  | "package_ready"
  | "needs_model_result_import"
  | "needs_candidate_approval"
  | "needs_artifact_metadata"
  | "safety_blocked";

export type CandidateModelPackageRecommendation =
  | "export_offline_candidate_package"
  | "import_candidate_results_first"
  | "approve_candidate_review_first"
  | "complete_artifact_metadata_first"
  | "resolve_safety_blocks_first";

export type InventoryStockoutCandidateModelPackageGate = {
  key: string;
  label: string;
  status: "pass" | "warning" | "block";
  value: unknown;
  message: string;
};

export type InventoryStockoutCandidateModelPackageContract = {
  contractKey: "inventory_stockout_offline_candidate_model_package_v1";
  contractVersion: "v1";
  generatedAt: string;
  phase: "Phase 8A";
  purpose: string;
  packageScope: "offline_candidate_model_package_metadata_only";
  acceptedDatasetKey: "inventory_stockout_baseline_v1";
  acceptedTrainingPackageKey: "inventory_stockout_external_training_package_v1";
  requiredUpstreamEvidence: string[];
  includedPackageSections: string[];
  excludedArtifactClasses: string[];
  forbiddenBehavior: string[];
  operationalPolicy: {
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

export type InventoryStockoutCandidateModelPackageSummary = {
  packageKey: "inventory_stockout_offline_candidate_model_package_v1";
  packageVersion: "v1";
  generatedAt: string;
  phase: "Phase 8A";
  status: CandidateModelPackageStatus;
  recommendation: CandidateModelPackageRecommendation;
  readinessScorePct: number;
  importId: number | null;
  artifactMetadataId: number | null;
  approvalReviewId: number | null;
  modelKey: string | null;
  modelVersion: string | null;
  datasetKey: "inventory_stockout_baseline_v1";
  datasetVersion: "v1";
  trainingPackageKey: "inventory_stockout_external_training_package_v1";
  trainingPackageVersion: "v1";
  modelResultImportStatus: string | null;
  approvalStatus: string | null;
  artifactRegistryStatus: string | null;
  artifactChecksumSha256: string | null;
  candidateF1Pct: number | null;
  baselineF1Pct: number | null;
  deltaF1Pct: number | null;
  candidateBalancedAccuracyPct: number | null;
  baselineBalancedAccuracyPct: number | null;
  deltaBalancedAccuracyPct: number | null;
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
  packageContainsExecutableBytes: false;
  artifactBinaryStored: false;
  blockerCount: number;
  warningCount: number;
  passCount: number;
  totalGateCount: number;
  blockers: string[];
  warnings: string[];
  recommendedNextAction: string;
};

export type InventoryStockoutCandidateModelPackageResponse = {
  success: true;
  contract: InventoryStockoutCandidateModelPackageContract;
  summary: InventoryStockoutCandidateModelPackageSummary;
  gates: InventoryStockoutCandidateModelPackageGate[];
  packageManifest: Record<string, unknown>;
  modelCard: Record<string, unknown>;
  lineage: Record<string, unknown>;
  evaluationSnapshot: Record<string, unknown>;
  safetyPolicy: Record<string, unknown>;
  exportRecord?: Record<string, unknown> | null;
};

export type MlCandidateModelPackageCatalogSummary = {
  generatedAt: string;
  contract: InventoryStockoutCandidateModelPackageContract;
  currentCandidateModelPackage: InventoryStockoutCandidateModelPackageSummary;
  lastCandidateModelPackages: Array<Record<string, unknown>>;
  recommendedNextAction: string;
};

export type MlCandidateModelPackageSummaryPayload = {
  generatedAt?: string;
  currentCandidateModelPackage?: {
    status?: string;
    recommendation?: string;
    readinessScorePct?: number | null;
    importId?: number | null;
    artifactMetadataId?: number | null;
    approvalReviewId?: number | null;
    modelKey?: string | null;
    modelVersion?: string | null;
    artifactChecksumSha256?: string | null;
    modelExecutionAllowed?: boolean;
    runtimeInvocationAllowed?: boolean;
    inferenceEndpointExposed?: boolean;
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
  lastCandidateModelPackages?: Array<Record<string, unknown>>;
  recommendedNextAction?: string;
  [key: string]: unknown;
};
