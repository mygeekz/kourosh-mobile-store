export type OfflineCandidateThresholdScenarioMetadataStatus =
  | "threshold_scenario_metadata_ready"
  | "threshold_scenario_metadata_warning"
  | "threshold_scenario_metadata_missing"
  | "candidate_not_found";

export type OfflineCandidateThresholdScenarioMetadataRecommendation =
  | "review_threshold_scenario_metadata"
  | "add_offline_threshold_scenario_metadata_to_candidate_package"
  | "import_candidate_evaluation_metadata_first";

export type InventoryStockoutCandidateThresholdScenarioMetadataCheckStatus = "pass" | "warning" | "fail";

export type InventoryStockoutCandidateThresholdScenarioMetadataCheck = {
  key: string;
  label: string;
  status: InventoryStockoutCandidateThresholdScenarioMetadataCheckStatus;
  weight: number;
  earned: number;
  source: string;
  value: unknown;
  message: string;
};

export type InventoryStockoutCandidateThresholdScenario = {
  key: string;
  threshold: number | null;
  label: string;
  precisionScore: number | null;
  recallScore: number | null;
  f1: number | null;
  accuracy: number | null;
  predictedPositiveRate: number | null;
  source: string;
  safeScenarioLabel: string;
  notes: string[];
};

export type InventoryStockoutCandidateThresholdScenarioSignal = {
  key: string;
  family:
    | "threshold_metadata"
    | "threshold_values"
    | "precision"
    | "recall"
    | "f1"
    | "safe_labels"
    | "safety";
  label: string;
  status: "available" | "missing";
  source: string;
  value: unknown;
  count: number;
  message: string;
};

export type InventoryStockoutCandidateThresholdScenarioMetadataContract = {
  contractKey: string;
  contractVersion: string;
  phase: string;
  generatedAt: string;
  purpose: string;
  metadataSource: string;
  readOnly: boolean;
  allowedMetadataFamilies: string[];
  forbiddenBehavior: string[];
  safetyPolicy: {
    metadataReadOnlyThresholdScenarioMetadata: true;
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
    backendThresholdExecutionAllowed: false;
  };
};

export type InventoryStockoutCandidateThresholdScenarioMetadataSummary = {
  generatedAt: string;
  metadataImportId: number | null;
  candidatePackageId: string;
  modelKey: string;
  modelVersion: string;
  predictionType: string;
  horizonDays: number | null;
  status: OfflineCandidateThresholdScenarioMetadataStatus;
  recommendation: OfflineCandidateThresholdScenarioMetadataRecommendation;
  thresholdScenarioScorePct: number;
  passCount: number;
  warningCount: number;
  failCount: number;
  totalCheckCount: number;
  thresholdScenarioCount: number;
  thresholdValueCount: number;
  precisionScenarioCount: number;
  recallScenarioCount: number;
  f1ScenarioCount: number;
  safeLabelCount: number;
  bestF1Threshold: number | null;
  bestRecallThreshold: number | null;
  bestPrecisionThreshold: number | null;
  warnings: string[];
  backendModelExecutionAllowed: false;
  backendInferenceEndpointExposed: false;
  productionIntegrationAllowed: false;
  decisionAutomationAllowed: false;
  canChangeInventoryOrAccounting: false;
  artifactActivationAllowed: false;
  rawTrainingCsvLoadingAllowedInBackend: false;
  backendThresholdExecutionAllowed: false;
  recommendedNextAction: string;
};

export type InventoryStockoutCandidateThresholdScenarioMetadataResponse = {
  success: true;
  contract: InventoryStockoutCandidateThresholdScenarioMetadataContract;
  summary: InventoryStockoutCandidateThresholdScenarioMetadataSummary;
  checks: InventoryStockoutCandidateThresholdScenarioMetadataCheck[];
  thresholdScenarioSignals: InventoryStockoutCandidateThresholdScenarioSignal[];
  thresholdScenarios: InventoryStockoutCandidateThresholdScenario[];
  thresholdScenarioMetadataPreview: Record<string, unknown>;
  safetyPolicy: Record<string, unknown>;
};

export type MlCandidateThresholdScenarioMetadataCatalogSummary = {
  generatedAt: string;
  contract: InventoryStockoutCandidateThresholdScenarioMetadataContract;
  currentCandidateThresholdScenarioMetadata: {
    generatedAt: string;
    status: OfflineCandidateThresholdScenarioMetadataStatus;
    recommendation: OfflineCandidateThresholdScenarioMetadataRecommendation;
    candidateCount: number;
    metadataSource: string;
    metadataReadOnlyThresholdScenarioMetadata: true;
    backendModelExecutionAllowed: false;
    backendInferenceEndpointExposed: false;
    productionIntegrationAllowed: false;
    decisionAutomationAllowed: false;
    canChangeInventoryOrAccounting: false;
    artifactActivationAllowed: false;
    rawTrainingCsvLoadingAllowedInBackend: false;
    backendThresholdExecutionAllowed: false;
  };
  recentCandidateImports: Array<Record<string, unknown>>;
  recommendedNextAction: string;
};
