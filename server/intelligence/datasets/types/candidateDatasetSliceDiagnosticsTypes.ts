export type OfflineCandidateDatasetSliceDiagnosticsStatus =
  | "slice_diagnostics_ready"
  | "slice_diagnostics_warning"
  | "no_slice_metadata"
  | "candidate_not_found";

export type OfflineCandidateDatasetSliceDiagnosticsRecommendation =
  | "review_slice_diagnostics_metadata_only"
  | "add_slice_diagnostics_to_offline_candidate_package"
  | "import_candidate_evaluation_metadata_first"
  | "review_slice_warnings_before_model_comparison";

export type InventoryStockoutCandidateDatasetSliceDiagnosticsContract = {
  contractKey: string;
  contractVersion: string;
  generatedAt: string;
  phase: string;
  purpose: string;
  diagnosticsScope: string;
  dataSource: string;
  diagnosticTypes: string[];
  supportedSliceDimensions: string[];
  forbiddenBehavior: string[];
  operationalPolicy: {
    metadataReadOnlySliceDiagnostics: boolean;
    backendModelExecutionAllowed: boolean;
    runtimeInvocationAllowed: boolean;
    backendInferenceEndpointExposed: boolean;
    inferenceEndpointExposed: boolean;
    productionIntegrationAllowed: boolean;
    decisionAutomationAllowed: boolean;
    canChangeInventoryOrAccounting: boolean;
    canChangePricing: boolean;
    canChangeReports: boolean;
    canChangeLedger: boolean;
    canMutateBusinessRecords: boolean;
    artifactExecutionAllowed: boolean;
    artifactActivationAllowed: boolean;
    artifactBytesLoadingAllowedInBackend: boolean;
  };
};

export type InventoryStockoutCandidateDatasetSliceDiagnostic = {
  key: string;
  label: string;
  sliceType: string;
  segment: string;
  rowCount: number | null;
  positiveRate: number | null;
  missingRate: number | null;
  metricKey: string | null;
  metricValue: number | null;
  warning: string | null;
  source: string;
};

export type InventoryStockoutCandidateDatasetSliceDiagnosticsSummary = {
  generatedAt: string;
  phase: string;
  status: OfflineCandidateDatasetSliceDiagnosticsStatus;
  recommendation: OfflineCandidateDatasetSliceDiagnosticsRecommendation;
  metadataImportId: number | null;
  candidatePackageId: string | null;
  modelKey: string | null;
  modelVersion: string | null;
  predictionType: string | null;
  horizonDays: number | null;
  sliceCount: number;
  supportedSliceCount: number;
  warningCount: number;
  missingnessSliceCount: number;
  targetDistributionSliceCount: number;
  safetyLocked: boolean;
  metadataReadOnlySliceDiagnostics: true;
  backendModelExecutionAllowed: false;
  backendInferenceEndpointExposed: false;
  productionIntegrationAllowed: false;
  decisionAutomationAllowed: false;
  canChangeInventoryOrAccounting: false;
  artifactActivationAllowed: false;
  recommendedNextAction: string;
};

export type InventoryStockoutCandidateDatasetSliceDiagnosticsResponse = {
  success: true;
  contract: InventoryStockoutCandidateDatasetSliceDiagnosticsContract;
  summary: InventoryStockoutCandidateDatasetSliceDiagnosticsSummary;
  diagnostics: InventoryStockoutCandidateDatasetSliceDiagnostic[];
  sliceFamilies: Array<{ key: string; label: string; count: number; warningCount: number }>;
  sourceMetadata: {
    evaluationReport: boolean;
    metrics: boolean;
    modelCard: boolean;
    trainingPackageValidationReport: boolean;
  };
  safetyPolicy: Record<string, unknown>;
};

export type MlCandidateDatasetSliceDiagnosticsCatalogSummary = {
  generatedAt: string;
  contract: InventoryStockoutCandidateDatasetSliceDiagnosticsContract;
  currentCandidateDatasetSliceDiagnostics: InventoryStockoutCandidateDatasetSliceDiagnosticsSummary | null;
  recentCandidateMetadataImports: Array<Record<string, unknown>>;
  recommendedNextAction: string;
};
