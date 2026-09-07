export type OfflineCandidateRobustnessMetadataStatus =
  | "robustness_metadata_ready"
  | "robustness_metadata_warning"
  | "robustness_metadata_missing"
  | "candidate_not_found";

export type OfflineCandidateRobustnessMetadataRecommendation =
  | "review_robustness_metadata"
  | "add_offline_robustness_metadata_to_candidate_package"
  | "import_candidate_evaluation_metadata_first";

export type InventoryStockoutCandidateRobustnessMetadataCheckStatus = "pass" | "warning" | "fail";

export type InventoryStockoutCandidateRobustnessMetadataCheck = {
  key: string;
  label: string;
  status: InventoryStockoutCandidateRobustnessMetadataCheckStatus;
  weight: number;
  earned: number;
  source: string;
  value: unknown;
  message: string;
};

export type InventoryStockoutCandidateRobustnessItem = {
  key: string;
  family:
    | "stress_test"
    | "edge_case"
    | "low_sample_segment"
    | "missing_feature_stress"
    | "robustness_warning"
    | "limitation";
  label: string;
  score: number | null;
  metric: number | null;
  rowCount: number | null;
  severity: "info" | "warning" | "critical";
  source: string;
  examples: string[];
  notes: string[];
};

export type InventoryStockoutCandidateRobustnessSignal = {
  key: string;
  family:
    | "stress_test"
    | "edge_case"
    | "low_sample_segment"
    | "missing_feature_stress"
    | "robustness_warning"
    | "limitation"
    | "safety";
  label: string;
  status: "available" | "missing";
  source: string;
  value: unknown;
  count: number;
  message: string;
};

export type InventoryStockoutCandidateRobustnessMetadataContract = {
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
    metadataReadOnlyRobustnessMetadata: true;
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
    backendCalibrationExecutionAllowed: false;
    backendErrorAnalysisExecutionAllowed: false;
    backendRobustnessExecutionAllowed: false;
  };
};

export type InventoryStockoutCandidateRobustnessMetadataSummary = {
  generatedAt: string;
  metadataImportId: number | null;
  candidatePackageId: string;
  modelKey: string;
  modelVersion: string;
  predictionType: string;
  horizonDays: number | null;
  status: OfflineCandidateRobustnessMetadataStatus;
  recommendation: OfflineCandidateRobustnessMetadataRecommendation;
  robustnessScorePct: number;
  passCount: number;
  warningCount: number;
  failCount: number;
  totalCheckCount: number;
  robustnessItemCount: number;
  stressTestCount: number;
  edgeCaseCount: number;
  lowSampleSegmentCount: number;
  missingFeatureStressCount: number;
  robustnessWarningCount: number;
  limitationCount: number;
  warnings: string[];
  backendModelExecutionAllowed: false;
  backendInferenceEndpointExposed: false;
  productionIntegrationAllowed: false;
  decisionAutomationAllowed: false;
  canChangeInventoryOrAccounting: false;
  artifactActivationAllowed: false;
  rawTrainingCsvLoadingAllowedInBackend: false;
  backendThresholdExecutionAllowed: false;
  backendCalibrationExecutionAllowed: false;
  backendErrorAnalysisExecutionAllowed: false;
  backendRobustnessExecutionAllowed: false;
  recommendedNextAction: string;
};

export type InventoryStockoutCandidateRobustnessMetadataResponse = {
  success: true;
  contract: InventoryStockoutCandidateRobustnessMetadataContract;
  summary: InventoryStockoutCandidateRobustnessMetadataSummary;
  checks: InventoryStockoutCandidateRobustnessMetadataCheck[];
  robustnessSignals: InventoryStockoutCandidateRobustnessSignal[];
  robustnessItems: InventoryStockoutCandidateRobustnessItem[];
  robustnessMetadataPreview: Record<string, unknown>;
  safetyPolicy: Record<string, unknown>;
};

export type MlCandidateRobustnessMetadataCatalogSummary = {
  generatedAt: string;
  contract: InventoryStockoutCandidateRobustnessMetadataContract;
  currentCandidateRobustnessMetadata: {
    generatedAt: string;
    status: OfflineCandidateRobustnessMetadataStatus;
    recommendation: OfflineCandidateRobustnessMetadataRecommendation;
    candidateCount: number;
    metadataSource: string;
    metadataReadOnlyRobustnessMetadata: true;
    backendModelExecutionAllowed: false;
    backendInferenceEndpointExposed: false;
    productionIntegrationAllowed: false;
    decisionAutomationAllowed: false;
    canChangeInventoryOrAccounting: false;
    artifactActivationAllowed: false;
    rawTrainingCsvLoadingAllowedInBackend: false;
    backendThresholdExecutionAllowed: false;
    backendCalibrationExecutionAllowed: false;
    backendErrorAnalysisExecutionAllowed: false;
    backendRobustnessExecutionAllowed: false;
  };
  recentCandidateImports: Array<Record<string, unknown>>;
  recommendedNextAction: string;
};
