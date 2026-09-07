import type {
  MlWorkbenchImportReviewAnnotation,
  MlWorkbenchImportReviewAnnotationKind,
  MlWorkbenchImportReviewAnnotationScope,
  MlWorkbenchImportReviewAnnotationSeverity,
} from './candidateEvaluationMetadataImportResultAnnotationsTypes';

export type MlWorkbenchImportAnnotationSearchStatus =
  | 'annotation_search_ready'
  | 'annotation_search_empty'
  | 'annotation_search_filtered';

export type MlWorkbenchImportAnnotationSearchContract = {
  contractKey: 'ml_workbench_import_annotation_search_v1';
  contractVersion: 'v1';
  generatedAt: string;
  phase: 'Phase 11H';
  purpose: string;
  dataSource: 'ml_workbench_import_result_annotations';
  linkedDataSource: 'ml_workbench_import_results';
  allowedRoutes: [
    'GET metadata-results/review-annotations/search/contract',
    'GET metadata-results/review-annotations/search',
  ];
  searchableFields: ['candidatePackageId', 'noteText', 'signalKey'];
  filterFields: ['candidatePackageId', 'importResultId', 'annotationScope', 'annotationKind', 'severity', 'signalKey', 'createdFrom', 'createdTo'];
  allowedScopes: MlWorkbenchImportReviewAnnotationScope[];
  allowedKinds: MlWorkbenchImportReviewAnnotationKind[];
  allowedSeverities: MlWorkbenchImportReviewAnnotationSeverity[];
  forbiddenBehavior: string[];
  operationalPolicy: {
    metadataOnlySearch: true;
    readOnlySearch: true;
    neverMutatesAnnotations: true;
    neverMutatesImportResults: true;
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

export type MlWorkbenchImportAnnotationSearchSummary = {
  generatedAt: string;
  phase: 'Phase 11H';
  status: MlWorkbenchImportAnnotationSearchStatus;
  filterCount: number;
  resultCount: number;
  totalAnnotationCount: number;
  warningCount: number;
  watchCount: number;
  resolvedCount: number;
  appliedFilters: Record<string, string | number | null>;
  metadataOnlySearch: true;
  readOnlySearch: true;
  neverMutatesAnnotations: true;
  neverMutatesImportResults: true;
  modelExecutionAllowed: false;
  runtimeInvocationAllowed: false;
  inferenceEndpointExposed: false;
  artifactActivationAllowed: false;
  artifactBytesLoadingAllowed: false;
  rawCsvLoadingAllowed: false;
  businessMutationAllowed: false;
  governanceWorkflowAdded: false;
  recommendedNextAction: string;
};

export type MlWorkbenchImportAnnotationSearchResponse = {
  success: true;
  contract: MlWorkbenchImportAnnotationSearchContract;
  summary: MlWorkbenchImportAnnotationSearchSummary;
  annotations: MlWorkbenchImportReviewAnnotation[];
  safetyPolicy: MlWorkbenchImportAnnotationSearchContract['operationalPolicy'];
};
