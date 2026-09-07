export type MlWorkbenchImportResultDashboardStatus =
  | 'metadata_import_result_ready'
  | 'metadata_import_result_warning'
  | 'metadata_import_result_empty';

export type MlWorkbenchImportResultDashboardRecommendation =
  | 'review_metadata_import_results_only'
  | 'import_metadata_payload_first'
  | 'review_metadata_import_warnings_only';

export type MlWorkbenchImportResultDashboardRow = {
  id: number | null;
  rank: number;
  candidatePackageId: string | null;
  modelKey: string | null;
  modelVersion: string | null;
  predictionType: string | null;
  metadataImportStatus: string | null;
  validationStatus: string | null;
  outputContractStatus: string | null;
  safetyPolicyStatus: string | null;
  comparisonScore: number | null;
  comparisonBasis: string | null;
  createdAt: string | null;
  warningCount?: number | null;
  errorCount?: number | null;
  forbiddenFieldCount?: number | null;
  trainingPackageReference?: string | null;
  candidateManifestHash?: string | null;
  latestChecksumStatus?: string | null;
  latestSafetyPolicyStatus?: string | null;
  metadataOnlyProof?: {
    metadataOnly: true;
    modelBinaryPresent: false;
    rawCsvPresent: false;
    activationDirectivePresent: false;
    inferenceDirectivePresent: false;
    businessMutationDirectivePresent: false;
  };
  metadataOnly: true;
  eligibleForProduction: false;
  activationAllowed: false;
  backendExecutionAllowed: false;
  businessMutationAllowed: false;
};

export type MlWorkbenchImportResultDashboardContract = {
  contractKey: 'ml_workbench_import_result_dashboard_v1';
  contractVersion: 'v1';
  generatedAt: string;
  phase: 'Phase 11D';
  purpose: string;
  dashboardScope: 'metadata_import_result_dashboard_only';
  sourceContract: 'phase9b_candidate_evaluation_metadata_import';
  sourceDashboard: 'inventory_stockout_offline_evaluation_comparison_dashboard_v1';
  allowedRoute: '/api/brain/ml-workbench-import/metadata-result-dashboard';
  persistedResultRoutes: [
    'POST /api/brain/ml-workbench-import/metadata-result',
    'GET /api/brain/ml-workbench-import/metadata-results',
    'GET /api/brain/ml-workbench-import/metadata-results/summary',
    'GET /api/brain/ml-workbench-import/metadata-results/latest',
    'GET /api/brain/ml-workbench-import/metadata-results/:id',
    'GET /api/brain/ml-workbench-import/metadata-results/by-candidate/:candidatePackageId',
  ];
  forbiddenBehavior: string[];
  operationalPolicy: {
    metadataOnlyReadDashboard: true;
    metadataOnlyPersistence: true;
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
  };
};

export type MlWorkbenchImportResultDashboardSummary = {
  generatedAt: string;
  phase: 'Phase 11D';
  status: MlWorkbenchImportResultDashboardStatus;
  recommendation: MlWorkbenchImportResultDashboardRecommendation;
  candidateCount: number;
  comparableCandidateCount: number;
  safeMetadataCandidateCount: number;
  warningCandidateCount: number;
  blockedCandidateCount: number;
  historyCount: number;
  validationStatusDistribution: {
    ready: number;
    warning: number;
    rejected: number;
  };
  totalWarningCount: number;
  totalErrorCount: number;
  forbiddenFieldCount: number;
  bestCandidatePackageId: string | null;
  bestModelVersion: string | null;
  bestComparisonScore: number | null;
  bestComparisonBasis: string | null;
  latestCandidatePackageId: string | null;
  latestMetadataImportStatus: string | null;
  latestValidationStatus: string | null;
  latestChecksumStatus: string | null;
  latestSafetyPolicyStatus: string | null;
  metadataOnlyReadDashboard: true;
  metadataOnlyPersistence: true;
  routeAdded: true;
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
  recommendedNextAction: string;
};

export type MlWorkbenchImportResultDashboardResponse = {
  success: true;
  contract: MlWorkbenchImportResultDashboardContract;
  summary: MlWorkbenchImportResultDashboardSummary;
  rows: MlWorkbenchImportResultDashboardRow[];
  safetyPolicy: MlWorkbenchImportResultDashboardContract['operationalPolicy'];
};
