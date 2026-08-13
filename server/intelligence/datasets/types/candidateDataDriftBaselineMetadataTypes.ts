export type OfflineCandidateDataDriftBaselineMetadataStatus =
  | "drift_metadata_ready"
  | "drift_metadata_warning"
  | "drift_metadata_missing"
  | "candidate_not_found";

export type OfflineCandidateDataDriftBaselineMetadataRecommendation =
  | "review_drift_baseline_metadata"
  | "add_offline_drift_metadata_to_candidate_package"
  | "import_candidate_evaluation_metadata_first";

export type InventoryStockoutCandidateDataDriftBaselineMetadataCheckStatus = "pass" | "warning" | "fail";

export type InventoryStockoutCandidateDataDriftBaselineMetadataCheck = {
  key: string;
  label: string;
  status: InventoryStockoutCandidateDataDriftBaselineMetadataCheckStatus;
  weight: number;
  earned: number;
  source: string;
  value: unknown;
  message: string;
};

export type InventoryStockoutCandidateDataDriftSignal = {
  key: string;
  family: "feature_distribution" | "missingness" | "target_balance" | "row_count" | "baseline_reference" | "metadata";
  label: string;
  status: "available" | "warning" | "missing";
  source: string;
  baselineValue: unknown;
  candidateValue: unknown;
  delta: number | null;
  deltaPct: number | null;
  message: string;
};

export type InventoryStockoutCandidateDataDriftBaselineMetadataContract = {
  contractKey: "inventory_stockout_offline_candidate_data_drift_baseline_metadata_v1";
  contractVersion: "v1";
  phase: "Phase 9H";
  generatedAt: string;
  purpose: string;
  metadataSource: "ml_candidate_evaluation_metadata_imports";
  readOnly: true;
  allowedMetadataFamilies: string[];
  forbiddenBehavior: string[];
  safetyPolicy: {
    metadataReadOnlyDataDriftBaseline: true;
    backendModelExecutionAllowed: false;
    runtimeInvocationAllowed: false;
    backendInferenceEndpointExposed: false;
    inferenceEndpointExposed: false;
    productionIntegrationAllowed: false;
    decisionAutomationAllowed: false;
    canChangeInventoryOrAccounting: false;
    canChangePricing: false;
    canChangeReports: false;
    canChangeLedger: false;
    canMutateBusinessRecords: false;
    artifactExecutionAllowed: false;
    artifactActivationAllowed: false;
    artifactBytesLoadingAllowedInBackend: false;
    rawTrainingCsvLoadingAllowedInBackend: false;
    baselineTrainingDataLoadingAllowedInBackend: false;
  };
};

export type InventoryStockoutCandidateDataDriftBaselineMetadataSummary = {
  generatedAt: string;
  status: OfflineCandidateDataDriftBaselineMetadataStatus;
  recommendation: OfflineCandidateDataDriftBaselineMetadataRecommendation;
  candidatePackageId: string | null;
  modelKey: string | null;
  modelVersion: string | null;
  predictionType: string | null;
  targetColumn: string | null;
  horizonDays: number | null;
  trainingManifestHash: string | null;
  driftScorePct: number;
  passCount: number;
  warningCount: number;
  failCount: number;
  driftSignalCount: number;
  availableSignalCount: number;
  missingSignalCount: number;
  featureDistributionCount: number;
  missingnessDriftCount: number;
  targetBalanceSignalCount: number;
  rowCountSignalCount: number;
  baselineReferenceAvailable: boolean;
  currentReferenceAvailable: boolean;
  rowCountBaseline: number | null;
  rowCountCandidate: number | null;
  rowCountDeltaPct: number | null;
  targetPositiveRateBaseline: number | null;
  targetPositiveRateCandidate: number | null;
  targetPositiveRateDelta: number | null;
  metadataReadOnlyDataDriftBaseline: true;
  backendModelExecutionAllowed: false;
  runtimeInvocationAllowed: false;
  backendInferenceEndpointExposed: false;
  inferenceEndpointExposed: false;
  productionIntegrationAllowed: false;
  decisionAutomationAllowed: false;
  canChangeInventoryOrAccounting: false;
  artifactActivationAllowed: false;
  artifactBytesLoadingAllowedInBackend: false;
  rawTrainingCsvLoadingAllowedInBackend: false;
  baselineTrainingDataLoadingAllowedInBackend: false;
  recommendedNextAction: string;
};

export type InventoryStockoutCandidateDataDriftBaselineMetadataResponse = {
  success: true;
  contract: InventoryStockoutCandidateDataDriftBaselineMetadataContract;
  summary: InventoryStockoutCandidateDataDriftBaselineMetadataSummary;
  checks: InventoryStockoutCandidateDataDriftBaselineMetadataCheck[];
  driftSignals: InventoryStockoutCandidateDataDriftSignal[];
  baselineMetadataPreview: Record<string, unknown>;
  currentMetadataPreview: Record<string, unknown>;
  featureDistributionPreview: Record<string, unknown>;
  missingnessPreview: Record<string, unknown>;
  targetBalancePreview: Record<string, unknown>;
  sourceMetadata: Record<string, unknown>;
  safetyPolicy: InventoryStockoutCandidateDataDriftBaselineMetadataContract["safetyPolicy"];
};

export type MlCandidateDataDriftBaselineMetadataCatalogSummary = {
  generatedAt: string;
  contract: InventoryStockoutCandidateDataDriftBaselineMetadataContract;
  candidateCount: number;
  candidatesWithDriftMetadata: number;
  candidatesMissingDriftMetadata: number;
  averageDriftScorePct: number;
  lastCandidateDataDriftBaselineMetadata: InventoryStockoutCandidateDataDriftBaselineMetadataSummary[];
  recommendedNextAction: string;
};
