export type OfflineCandidateDeploymentReadinessMetadataStatus =
  | "deployment_readiness_metadata_ready"
  | "deployment_readiness_metadata_warning"
  | "deployment_readiness_metadata_missing"
  | "candidate_not_found";

export type OfflineCandidateDeploymentReadinessMetadataRecommendation =
  | "review_deployment_readiness_metadata"
  | "add_offline_deployment_readiness_metadata_to_candidate_package"
  | "import_candidate_evaluation_metadata_first";

export type InventoryStockoutCandidateDeploymentReadinessMetadataCheckStatus = "pass" | "warning" | "fail";

export type InventoryStockoutCandidateDeploymentReadinessMetadataCheck = {
  key: string;
  label: string;
  status: InventoryStockoutCandidateDeploymentReadinessMetadataCheckStatus;
  weight: number;
  earned: number;
  source: string;
  value: unknown;
  message: string;
};

export type InventoryStockoutCandidateDeploymentReadinessSignal = {
  key: string;
  family:
    | "completeness"
    | "safety"
    | "metrics_coverage"
    | "calibration_coverage"
    | "error_analysis_coverage"
    | "robustness_coverage"
    | "limitation";
  label: string;
  status: "available" | "missing" | "blocked";
  source: string;
  value: unknown;
  score: number | null;
  message: string;
};

export type InventoryStockoutCandidateDeploymentReadinessMetadataContract = {
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
    metadataReadOnlyDeploymentReadinessSummary: true;
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
    backendDeploymentReadinessExecutionAllowed: false;
  };
};

export type InventoryStockoutCandidateDeploymentReadinessMetadataSummary = {
  generatedAt: string;
  metadataImportId: number | null;
  candidatePackageId: string;
  modelKey: string;
  modelVersion: string;
  predictionType: string;
  horizonDays: number | null;
  status: OfflineCandidateDeploymentReadinessMetadataStatus;
  recommendation: OfflineCandidateDeploymentReadinessMetadataRecommendation;
  deploymentReadinessScorePct: number;
  passCount: number;
  warningCount: number;
  failCount: number;
  totalCheckCount: number;
  completenessScorePct: number;
  safetyScorePct: number;
  metricsCoverageScorePct: number;
  calibrationCoverageScorePct: number;
  errorAnalysisCoverageScorePct: number;
  robustnessCoverageScorePct: number;
  limitationCount: number;
  readinessSignalCount: number;
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
  backendDeploymentReadinessExecutionAllowed: false;
  recommendedNextAction: string;
};

export type InventoryStockoutCandidateDeploymentReadinessMetadataResponse = {
  success: true;
  contract: InventoryStockoutCandidateDeploymentReadinessMetadataContract;
  summary: InventoryStockoutCandidateDeploymentReadinessMetadataSummary;
  checks: InventoryStockoutCandidateDeploymentReadinessMetadataCheck[];
  readinessSignals: InventoryStockoutCandidateDeploymentReadinessSignal[];
  deploymentReadinessMetadataPreview: Record<string, unknown>;
  safetyPolicy: Record<string, unknown>;
};

export type MlCandidateDeploymentReadinessMetadataCatalogSummary = {
  generatedAt: string;
  contract: InventoryStockoutCandidateDeploymentReadinessMetadataContract;
  currentCandidateDeploymentReadinessMetadata: {
    generatedAt: string;
    status: OfflineCandidateDeploymentReadinessMetadataStatus;
    recommendation: OfflineCandidateDeploymentReadinessMetadataRecommendation;
    candidateCount: number;
    metadataSource: string;
    metadataReadOnlyDeploymentReadinessSummary: true;
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
    backendDeploymentReadinessExecutionAllowed: false;
  };
  recentCandidateImports: Array<Record<string, unknown>>;
  recommendedNextAction: string;
};
