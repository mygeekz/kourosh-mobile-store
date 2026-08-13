// Phase 9D — Offline Candidate Metric Drilldown and Explainability Notes type surface.
// Metadata-only details: no model execution, no activation, no inference endpoint.

export type OfflineCandidateMetricDrilldownStatus =
  | "drilldown_ready"
  | "drilldown_warning"
  | "candidate_not_found";

export type OfflineCandidateMetricDrilldownRecommendation =
  | "review_candidate_metrics_and_limitations"
  | "import_candidate_evaluation_metadata_first"
  | "review_candidate_warnings_before_comparison";

export type InventoryStockoutCandidateMetricDrilldownContract = {
  contractKey: "inventory_stockout_offline_candidate_metric_drilldown_v1";
  contractVersion: "v1";
  generatedAt: string;
  phase: "Phase 9D";
  purpose: string;
  drilldownScope: "offline_candidate_evaluation_metadata_drilldown_only";
  dataSource: "ml_candidate_evaluation_metadata_imports";
  supportedLookup: string[];
  exposedSections: string[];
  forbiddenBehavior: string[];
  operationalPolicy: {
    metadataReadOnlyDrilldown: true;
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

export type InventoryStockoutCandidateMetricDrilldownMetric = {
  key: string;
  value: number | string | null;
  available: boolean;
  direction: "higher_is_better" | "lower_is_better" | "informational";
  note: string;
};

export type InventoryStockoutCandidateMetricDrilldownWarning = {
  source: string;
  message: string;
};

export type InventoryStockoutCandidateMetricDrilldownFeature = {
  name: string;
  type: string | null;
  role: string;
  required: boolean | null;
};

export type InventoryStockoutCandidateMetricDrilldownSummary = {
  generatedAt: string;
  phase: "Phase 9D";
  status: OfflineCandidateMetricDrilldownStatus;
  recommendation: OfflineCandidateMetricDrilldownRecommendation;
  id: number | null;
  candidatePackageId: string | null;
  modelKey: string | null;
  modelVersion: string | null;
  modelFamily: string | null;
  predictionType: string | null;
  targetColumn: string | null;
  horizonDays: number | null;
  validationStatus: string | null;
  metricsStatus: string | null;
  outputContractStatus: string | null;
  safetyPolicyStatus: string | null;
  metadataImportStatus: string | null;
  warningCount: number;
  limitationCount: number;
  featureCount: number;
  checksumCount: number;
  metadataReadOnlyDrilldown: true;
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

export type InventoryStockoutCandidateMetricDrilldownResponse = {
  success: true;
  contract: InventoryStockoutCandidateMetricDrilldownContract;
  summary: InventoryStockoutCandidateMetricDrilldownSummary;
  metrics: InventoryStockoutCandidateMetricDrilldownMetric[];
  warnings: InventoryStockoutCandidateMetricDrilldownWarning[];
  knownLimitations: string[];
  featureContract: InventoryStockoutCandidateMetricDrilldownFeature[];
  targetDefinition: Record<string, unknown> | null;
  checksumCoverage: string[];
  outputSamplePreview: Array<Record<string, unknown>>;
  explainabilityNotes: string[];
  modelCard: Record<string, unknown>;
  safetyPolicy: Record<string, false | true>;
};

export type MlCandidateMetricDrilldownCatalogSummary = {
  generatedAt: string;
  contract: InventoryStockoutCandidateMetricDrilldownContract;
  currentCandidateMetricDrilldown: InventoryStockoutCandidateMetricDrilldownSummary | null;
  recommendedNextAction: string;
};
