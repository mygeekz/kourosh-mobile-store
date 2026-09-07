export type OfflineCandidateCalibrationMetadataStatus =
  | "calibration_metadata_ready"
  | "calibration_metadata_warning"
  | "calibration_metadata_missing"
  | "candidate_not_found";

export type OfflineCandidateCalibrationMetadataRecommendation =
  | "review_calibration_metadata"
  | "add_offline_calibration_metadata_to_candidate_package"
  | "import_candidate_evaluation_metadata_first";

export type InventoryStockoutCandidateCalibrationMetadataCheckStatus = "pass" | "warning" | "fail";

export type InventoryStockoutCandidateCalibrationMetadataCheck = {
  key: string;
  label: string;
  status: InventoryStockoutCandidateCalibrationMetadataCheckStatus;
  weight: number;
  earned: number;
  source: string;
  value: unknown;
  message: string;
};

export type InventoryStockoutCandidateCalibrationBin = {
  key: string;
  label: string;
  lowerBound: number | null;
  upperBound: number | null;
  meanPredictedProbability: number | null;
  observedPositiveRate: number | null;
  sampleCount: number | null;
  source: string;
  notes: string[];
};

export type InventoryStockoutCandidateCalibrationSignal = {
  key: string;
  family:
    | "calibration_metadata"
    | "probability_bins"
    | "predicted_probability"
    | "observed_rate"
    | "brier_score"
    | "expected_calibration_error"
    | "safety";
  label: string;
  status: "available" | "missing";
  source: string;
  value: unknown;
  count: number;
  message: string;
};

export type InventoryStockoutCandidateCalibrationMetadataContract = {
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
    metadataReadOnlyCalibrationMetadata: true;
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
    backendProbabilityRecalibrationAllowed: false;
  };
};

export type InventoryStockoutCandidateCalibrationMetadataSummary = {
  generatedAt: string;
  metadataImportId: number | null;
  candidatePackageId: string;
  modelKey: string;
  modelVersion: string;
  predictionType: string;
  horizonDays: number | null;
  status: OfflineCandidateCalibrationMetadataStatus;
  recommendation: OfflineCandidateCalibrationMetadataRecommendation;
  calibrationScorePct: number;
  passCount: number;
  warningCount: number;
  failCount: number;
  totalCheckCount: number;
  calibrationBinCount: number;
  probabilityBinCount: number;
  predictedProbabilityBinCount: number;
  observedRateBinCount: number;
  sampleCountBinCount: number;
  brierScore: number | null;
  expectedCalibrationError: number | null;
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
  backendProbabilityRecalibrationAllowed: false;
  recommendedNextAction: string;
};

export type InventoryStockoutCandidateCalibrationMetadataResponse = {
  success: true;
  contract: InventoryStockoutCandidateCalibrationMetadataContract;
  summary: InventoryStockoutCandidateCalibrationMetadataSummary;
  checks: InventoryStockoutCandidateCalibrationMetadataCheck[];
  calibrationSignals: InventoryStockoutCandidateCalibrationSignal[];
  calibrationBins: InventoryStockoutCandidateCalibrationBin[];
  calibrationMetadataPreview: Record<string, unknown>;
  safetyPolicy: Record<string, unknown>;
};

export type MlCandidateCalibrationMetadataCatalogSummary = {
  generatedAt: string;
  contract: InventoryStockoutCandidateCalibrationMetadataContract;
  currentCandidateCalibrationMetadata: {
    generatedAt: string;
    status: OfflineCandidateCalibrationMetadataStatus;
    recommendation: OfflineCandidateCalibrationMetadataRecommendation;
    candidateCount: number;
    metadataSource: string;
    metadataReadOnlyCalibrationMetadata: true;
    backendModelExecutionAllowed: false;
    backendInferenceEndpointExposed: false;
    productionIntegrationAllowed: false;
    decisionAutomationAllowed: false;
    canChangeInventoryOrAccounting: false;
    artifactActivationAllowed: false;
    rawTrainingCsvLoadingAllowedInBackend: false;
    backendThresholdExecutionAllowed: false;
    backendCalibrationExecutionAllowed: false;
    backendProbabilityRecalibrationAllowed: false;
  };
  recentCandidateImports: Array<Record<string, unknown>>;
  recommendedNextAction: string;
};
