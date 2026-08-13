// Phase 9C — Offline Evaluation Comparison Dashboard type surface.
// Metadata-only dashboard: no model execution, no activation, no inference endpoint.

export type OfflineEvaluationComparisonDashboardStatus =
  | "comparison_ready"
  | "comparison_warning"
  | "no_imported_candidates";

export type OfflineEvaluationComparisonDashboardRecommendation =
  | "compare_imported_metadata_only"
  | "import_candidate_evaluation_metadata_first"
  | "review_candidate_metadata_warnings";

export type InventoryStockoutEvaluationComparisonDashboardContract = {
  contractKey: "inventory_stockout_offline_evaluation_comparison_dashboard_v1";
  contractVersion: "v1";
  generatedAt: string;
  phase: "Phase 9C";
  purpose: string;
  dashboardScope: "offline_candidate_evaluation_metadata_comparison_only";
  dataSource: "ml_candidate_evaluation_metadata_imports";
  comparedMetricFields: string[];
  rankedMetricPreference: string[];
  forbiddenBehavior: string[];
  operationalPolicy: {
    metadataReadOnlyDashboard: true;
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
  };
};

export type InventoryStockoutEvaluationComparisonDashboardRow = {
  id: number | null;
  rank: number;
  candidatePackageId: string | null;
  modelKey: string | null;
  modelVersion: string | null;
  modelFamily: string | null;
  predictionType: string | null;
  targetColumn: string | null;
  horizonDays: number | null;
  trainingManifestHash: string | null;
  validationStatus: string | null;
  metricsStatus: string | null;
  outputContractStatus: string | null;
  safetyPolicyStatus: string | null;
  metadataImportStatus: string | null;
  accuracy: number | null;
  precisionScore: number | null;
  recallScore: number | null;
  f1: number | null;
  rocAuc: number | null;
  mae: number | null;
  rmse: number | null;
  r2: number | null;
  comparisonScore: number | null;
  comparisonBasis: string;
  safetyLocked: true;
  eligibleForProduction: false;
  activationAllowed: false;
  backendExecutionAllowed: false;
  createdAt: string | null;
};

export type InventoryStockoutEvaluationComparisonDashboardSummary = {
  generatedAt: string;
  phase: "Phase 9C";
  status: OfflineEvaluationComparisonDashboardStatus;
  recommendation: OfflineEvaluationComparisonDashboardRecommendation;
  candidateCount: number;
  comparableCandidateCount: number;
  safeMetadataCandidateCount: number;
  warningCandidateCount: number;
  blockedCandidateCount: number;
  bestCandidatePackageId: string | null;
  bestModelVersion: string | null;
  bestComparisonScore: number | null;
  bestComparisonBasis: string | null;
  metadataReadOnlyDashboard: true;
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
  recommendedNextAction: string;
};

export type InventoryStockoutEvaluationComparisonDashboardResponse = {
  success: true;
  contract: InventoryStockoutEvaluationComparisonDashboardContract;
  summary: InventoryStockoutEvaluationComparisonDashboardSummary;
  rows: InventoryStockoutEvaluationComparisonDashboardRow[];
  metricColumns: string[];
  safetyPolicy: Record<string, false | true>;
};

export type MlCandidateEvaluationComparisonDashboardCatalogSummary = {
  generatedAt: string;
  contract: InventoryStockoutEvaluationComparisonDashboardContract;
  currentEvaluationComparisonDashboard: InventoryStockoutEvaluationComparisonDashboardSummary;
  rows: InventoryStockoutEvaluationComparisonDashboardRow[];
  recommendedNextAction: string;
};
