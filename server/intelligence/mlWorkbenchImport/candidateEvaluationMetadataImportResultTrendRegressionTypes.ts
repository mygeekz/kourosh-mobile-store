export type MlWorkbenchImportTrendRegressionStatus =
  | 'trend_regression_summary_ready'
  | 'trend_regression_summary_warning'
  | 'trend_regression_summary_empty';

export type MlWorkbenchImportTrendRegressionMetricStatus =
  | 'improved'
  | 'stable'
  | 'regression'
  | 'missing_current_metric'
  | 'missing_previous_metric';

export type MlWorkbenchImportTrendRegressionMetricSignal = {
  key: string;
  label: string;
  previousValue: number | null;
  currentValue: number | null;
  delta: number | null;
  regressionThreshold: number;
  status: MlWorkbenchImportTrendRegressionMetricStatus;
};

export type MlWorkbenchImportTrendRegressionRow = {
  id: number | null;
  rank: number;
  candidatePackageId: string | null;
  modelKey: string | null;
  modelVersion: string | null;
  predictionType: string | null;
  validationStatus: string | null;
  createdAt: string | null;
  previousCandidatePackageId: string | null;
  previousModelVersion: string | null;
  previousCreatedAt: string | null;
  validationScore: number | null;
  previousValidationScore: number | null;
  validationScoreDelta: number | null;
  warningCount: number;
  previousWarningCount: number;
  warningDelta: number;
  errorCount: number;
  previousErrorCount: number;
  errorDelta: number;
  forbiddenFieldCount: number;
  previousForbiddenFieldCount: number;
  forbiddenFieldDelta: number;
  trendStatus: MlWorkbenchImportTrendRegressionStatus;
  metricSignalCount: number;
  regressionSignalCount: number;
  improvementSignalCount: number;
  stableSignalCount: number;
  maxMetricDrop: number | null;
  metricSignals: MlWorkbenchImportTrendRegressionMetricSignal[];
  metadataOnlyTrend: true;
  readOnlyTrend: true;
  usesPersistedResultHistory: true;
  modelExecutionAllowed: false;
  runtimeInvocationAllowed: false;
  inferenceEndpointExposed: false;
  artifactActivationAllowed: false;
  businessMutationAllowed: false;
  governanceWorkflowAdded: false;
};

export type MlWorkbenchImportTrendRegressionContract = {
  contractKey: 'ml_workbench_import_trend_regression_summary_v1';
  contractVersion: 'v1';
  generatedAt: string;
  phase: 'Phase 11F';
  purpose: string;
  analysisScope: 'persisted_metadata_import_result_history_only';
  dataSource: 'ml_workbench_import_results';
  allowedRoutes: [
    'GET /api/brain/ml-workbench-import/metadata-results/trend-regression-summary/contract',
    'GET /api/brain/ml-workbench-import/metadata-results/trend-regression-summary',
  ];
  analyzedMetricFields: string[];
  forbiddenBehavior: string[];
  operationalPolicy: {
    metadataOnlyTrend: true;
    readOnlyTrend: true;
    usesPersistedResultHistory: true;
    modelExecutionAllowed: false;
    runtimeInvocationAllowed: false;
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
    artifactBytesLoadingAllowed: false;
    rawTrainingCsvLoadingAllowed: false;
    governanceWorkflowAdded: false;
  };
};

export type MlWorkbenchImportTrendRegressionSummary = {
  generatedAt: string;
  phase: 'Phase 11F';
  status: MlWorkbenchImportTrendRegressionStatus;
  historyCount: number;
  analyzedTransitionCount: number;
  comparableTransitionCount: number;
  regressionCandidateCount: number;
  warningCandidateCount: number;
  stableCandidateCount: number;
  improvedMetricCount: number;
  regressionMetricCount: number;
  stableMetricCount: number;
  warningIncreaseCount: number;
  errorIncreaseCount: number;
  forbiddenFieldIncreaseCount: number;
  maxMetricDrop: number | null;
  latestCandidatePackageId: string | null;
  latestModelVersion: string | null;
  latestTrendStatus: MlWorkbenchImportTrendRegressionStatus;
  metadataOnlyTrend: true;
  readOnlyTrend: true;
  usesPersistedResultHistory: true;
  modelExecutionAllowed: false;
  runtimeInvocationAllowed: false;
  inferenceEndpointExposed: false;
  artifactActivationAllowed: false;
  businessMutationAllowed: false;
  governanceWorkflowAdded: false;
  recommendedNextAction: string;
};

export type MlWorkbenchImportTrendRegressionResponse = {
  success: true;
  contract: MlWorkbenchImportTrendRegressionContract;
  summary: MlWorkbenchImportTrendRegressionSummary;
  rows: MlWorkbenchImportTrendRegressionRow[];
  safetyPolicy: MlWorkbenchImportTrendRegressionContract['operationalPolicy'];
};
