export type OfflineCandidateErrorAnalysisMetadataStatus =
  | "error_analysis_metadata_ready"
  | "error_analysis_metadata_warning"
  | "error_analysis_metadata_missing"
  | "candidate_not_found";

export type OfflineCandidateErrorAnalysisMetadataRecommendation =
  | "review_error_analysis_metadata"
  | "add_offline_error_analysis_metadata_to_candidate_package"
  | "import_candidate_evaluation_metadata_first";

export type InventoryStockoutCandidateErrorAnalysisMetadataCheckStatus = "pass" | "warning" | "fail";

export type InventoryStockoutCandidateErrorAnalysisMetadataCheck = {
  key: string;
  label: string;
  status: InventoryStockoutCandidateErrorAnalysisMetadataCheckStatus;
  weight: number;
  earned: number;
  source: string;
  value: unknown;
  message: string;
};

export type InventoryStockoutCandidateErrorAnalysisItem = {
  key: string;
  family:
    | "false_positive"
    | "false_negative"
    | "high_confidence_wrong"
    | "error_bucket"
    | "error_note";
  label: string;
  count: number | null;
  rate: number | null;
  confidence: number | null;
  severity: "info" | "warning" | "critical";
  source: string;
  examples: string[];
  notes: string[];
};

export type InventoryStockoutCandidateErrorAnalysisSignal = {
  key: string;
  family:
    | "false_positive"
    | "false_negative"
    | "high_confidence_wrong"
    | "error_bucket"
    | "error_note"
    | "safety";
  label: string;
  status: "available" | "missing";
  source: string;
  value: unknown;
  count: number;
  message: string;
};

export type InventoryStockoutCandidateErrorAnalysisMetadataContract = {
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
    metadataReadOnlyErrorAnalysisMetadata: true;
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
  };
};

export type InventoryStockoutCandidateErrorAnalysisMetadataSummary = {
  generatedAt: string;
  metadataImportId: number | null;
  candidatePackageId: string;
  modelKey: string;
  modelVersion: string;
  predictionType: string;
  horizonDays: number | null;
  status: OfflineCandidateErrorAnalysisMetadataStatus;
  recommendation: OfflineCandidateErrorAnalysisMetadataRecommendation;
  errorAnalysisScorePct: number;
  passCount: number;
  warningCount: number;
  failCount: number;
  totalCheckCount: number;
  errorItemCount: number;
  falsePositiveMetadataCount: number;
  falseNegativeMetadataCount: number;
  highConfidenceWrongCount: number;
  errorBucketCount: number;
  errorNoteCount: number;
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
  recommendedNextAction: string;
};

export type InventoryStockoutCandidateErrorAnalysisMetadataResponse = {
  success: true;
  contract: InventoryStockoutCandidateErrorAnalysisMetadataContract;
  summary: InventoryStockoutCandidateErrorAnalysisMetadataSummary;
  checks: InventoryStockoutCandidateErrorAnalysisMetadataCheck[];
  errorAnalysisSignals: InventoryStockoutCandidateErrorAnalysisSignal[];
  errorAnalysisItems: InventoryStockoutCandidateErrorAnalysisItem[];
  errorAnalysisMetadataPreview: Record<string, unknown>;
  safetyPolicy: Record<string, unknown>;
};

export type MlCandidateErrorAnalysisMetadataCatalogSummary = {
  generatedAt: string;
  contract: InventoryStockoutCandidateErrorAnalysisMetadataContract;
  currentCandidateErrorAnalysisMetadata: {
    generatedAt: string;
    status: OfflineCandidateErrorAnalysisMetadataStatus;
    recommendation: OfflineCandidateErrorAnalysisMetadataRecommendation;
    candidateCount: number;
    metadataSource: string;
    metadataReadOnlyErrorAnalysisMetadata: true;
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
  };
  recentCandidateImports: Array<Record<string, unknown>>;
  recommendedNextAction: string;
};
