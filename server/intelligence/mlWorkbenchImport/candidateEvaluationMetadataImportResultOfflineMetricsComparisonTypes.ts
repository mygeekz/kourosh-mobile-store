export type MlWorkbenchImportOfflineMetricsComparisonStatus =
  | 'offline_metrics_comparison_ready'
  | 'offline_metrics_comparison_warning'
  | 'offline_metrics_comparison_empty';

export type MlWorkbenchImportOfflineMetricsComparisonMetricStatus =
  | 'match'
  | 'drift'
  | 'missing_persisted_metric'
  | 'missing_offline_metric';

export type MlWorkbenchImportOfflineMetricsComparisonMetric = {
  key: string;
  label: string;
  persistedValue: number | null;
  offlineWorkbenchValue: number | null;
  delta: number | null;
  tolerance: number;
  status: MlWorkbenchImportOfflineMetricsComparisonMetricStatus;
};

export type MlWorkbenchImportOfflineMetricsComparisonRow = {
  id: number | null;
  rank: number;
  candidatePackageId: string | null;
  modelKey: string | null;
  modelVersion: string | null;
  predictionType: string | null;
  validationStatus: string | null;
  comparisonStatus: MlWorkbenchImportOfflineMetricsComparisonStatus;
  metricsComparedCount: number;
  metricMatchCount: number;
  metricDriftCount: number;
  missingPersistedMetricCount: number;
  missingOfflineMetricCount: number;
  maxAbsDelta: number | null;
  metrics: MlWorkbenchImportOfflineMetricsComparisonMetric[];
  createdAt: string | null;
  metadataOnly: true;
  readOnlyComparison: true;
  usesCopiedFixtureSnapshot: true;
  modelExecutionAllowed: false;
  runtimeInvocationAllowed: false;
  inferenceEndpointExposed: false;
  artifactActivationAllowed: false;
  businessMutationAllowed: false;
  governanceWorkflowAdded: false;
};

export type MlWorkbenchImportOfflineMetricsComparisonContract = {
  contractKey: 'ml_workbench_import_offline_metrics_comparison_v1';
  contractVersion: 'v1';
  generatedAt: string;
  phase: 'Phase 11E';
  purpose: string;
  comparisonScope: 'persisted_metadata_import_result_to_offline_workbench_metrics_snapshot_only';
  dataSource: 'ml_workbench_import_results';
  offlineMetricsSnapshotPath: 'server/tests/fixtures/mlWorkbenchImport/phase11e_offline_workbench_metrics_snapshot.fixture.json';
  allowedRoutes: [
    'GET /api/brain/ml-workbench-import/metadata-results/offline-metrics-comparison/contract',
    'GET /api/brain/ml-workbench-import/metadata-results/offline-metrics-comparison',
  ];
  comparedMetricFields: string[];
  forbiddenBehavior: string[];
  operationalPolicy: {
    metadataOnlyComparison: true;
    readOnlyComparison: true;
    usesCopiedFixtureSnapshot: true;
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

export type MlWorkbenchImportOfflineMetricsComparisonSummary = {
  generatedAt: string;
  phase: 'Phase 11E';
  status: MlWorkbenchImportOfflineMetricsComparisonStatus;
  candidateCount: number;
  comparableCandidateCount: number;
  metricMatchCount: number;
  metricDriftCount: number;
  missingMetricCount: number;
  maxAbsDelta: number | null;
  baselineCandidatePackageId: string | null;
  baselineModelVersion: string | null;
  offlineMetricsSnapshotPath: MlWorkbenchImportOfflineMetricsComparisonContract['offlineMetricsSnapshotPath'];
  metadataOnlyComparison: true;
  readOnlyComparison: true;
  modelExecutionAllowed: false;
  runtimeInvocationAllowed: false;
  inferenceEndpointExposed: false;
  artifactActivationAllowed: false;
  businessMutationAllowed: false;
  governanceWorkflowAdded: false;
  recommendedNextAction: string;
};

export type MlWorkbenchImportOfflineMetricsComparisonResponse = {
  success: true;
  contract: MlWorkbenchImportOfflineMetricsComparisonContract;
  summary: MlWorkbenchImportOfflineMetricsComparisonSummary;
  rows: MlWorkbenchImportOfflineMetricsComparisonRow[];
  safetyPolicy: MlWorkbenchImportOfflineMetricsComparisonContract['operationalPolicy'];
};
