import type {
  MlWorkbenchImportResultDashboardContract,
  MlWorkbenchImportResultDashboardRow,
} from './candidateEvaluationMetadataImportResultDashboardTypes';

export type MlWorkbenchImportResultDetailStatus =
  | 'metadata_import_detail_ready'
  | 'metadata_import_detail_not_found'
  | 'metadata_import_detail_partial_metadata';

export type MlWorkbenchImportResultDetailSection = {
  key: string;
  label: string;
  value: string | number | boolean | null;
  metadataOnly: true;
  warning?: boolean;
};

export type MlWorkbenchImportResultDetail = {
  id?: number | null;
  candidatePackageId: string;
  modelKey: string | null;
  modelVersion: string | null;
  predictionType: string | null;
  trainingPackageReference?: string | null;
  candidateManifestHash?: string | null;
  metadataImportStatus: string | null;
  validationStatus: string | null;
  outputContractStatus: string | null;
  safetyPolicyStatus: string | null;
  comparisonScore: number | null;
  comparisonBasis: string | null;
  warningCount?: number | null;
  errorCount?: number | null;
  forbiddenFieldCount?: number | null;
  createdAt: string | null;
  createdByUserId?: number | null;
  metadataOnly: true;
  readOnly: true;
  eligibleForProduction: false;
  activationAllowed: false;
  backendExecutionAllowed: false;
  businessMutationAllowed: false;
  sections: MlWorkbenchImportResultDetailSection[];
};

export type MlWorkbenchImportResultDetailContract = {
  contractKey: 'ml_workbench_import_result_detail_drawer_v1';
  contractVersion: 'v1';
  generatedAt: string;
  phase: 'Phase 11D';
  purpose: string;
  drawerScope: 'metadata_import_detail_drawer_only';
  sourceDashboardContract: 'ml_workbench_import_result_dashboard_v1';
  allowedRoute: '/api/brain/ml-workbench-import/metadata-result-dashboard/detail/:candidatePackageId';
  persistedResultDetailRoute: '/api/brain/ml-workbench-import/metadata-results/:id';
  forbiddenBehavior: string[];
  operationalPolicy: MlWorkbenchImportResultDashboardContract['operationalPolicy'] & {
    metadataOnlyDetailDrawer: true;
    readOnlyDetailRoute: true;
  };
};

export type MlWorkbenchImportResultDetailResponse = {
  success: true;
  status: MlWorkbenchImportResultDetailStatus;
  contract: MlWorkbenchImportResultDetailContract;
  detail: MlWorkbenchImportResultDetail | null;
  sourceRow: MlWorkbenchImportResultDashboardRow | null;
  safetyPolicy: MlWorkbenchImportResultDetailContract['operationalPolicy'];
};
