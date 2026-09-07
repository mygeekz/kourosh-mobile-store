import type { MlWorkbenchImportReviewAnnotation } from './candidateEvaluationMetadataImportResultAnnotationsTypes';

export type MlWorkbenchImportAnnotationSavedViewId =
  | 'warnings_only'
  | 'watch_queue'
  | 'resolved_notes'
  | 'trend_signals'
  | 'offline_metric_notes'
  | 'dashboard_notes'
  | 'risk_notes'
  | 'follow_up_notes'
  | 'latest_candidate';

export type MlWorkbenchImportAnnotationSavedViewFilter = {
  query?: string | null;
  candidatePackageId?: string | null;
  annotationScope?: string | null;
  annotationKind?: string | null;
  severity?: string | null;
  signalKey?: string | null;
  createdFrom?: string | null;
  createdTo?: string | null;
  limit?: number;
};

export type MlWorkbenchImportAnnotationSavedView = {
  id: MlWorkbenchImportAnnotationSavedViewId;
  label: string;
  description: string;
  badge: string;
  sortOrder: number;
  filters: MlWorkbenchImportAnnotationSavedViewFilter;
  dynamicFilter?: 'latestCandidatePackageId';
  metadataOnlySavedView: true;
  readOnlySavedView: true;
  neverMutatesAnnotations: true;
  neverMutatesImportResults: true;
};

export type MlWorkbenchImportAnnotationSavedViewsContract = {
  contractKey: 'ml_workbench_import_annotation_saved_views_v1';
  contractVersion: 'v1';
  generatedAt: string;
  phase: 'Phase 11I';
  purpose: string;
  dataSource: 'static_annotation_saved_view_catalog';
  linkedSearchContract: 'ml_workbench_import_annotation_search_v1';
  allowedRoutes: [
    'GET metadata-results/review-annotations/saved-views/contract',
    'GET metadata-results/review-annotations/saved-views',
    'GET metadata-results/review-annotations/saved-views/:presetId/apply',
  ];
  supportedPresetIds: MlWorkbenchImportAnnotationSavedViewId[];
  forbiddenBehavior: string[];
  operationalPolicy: {
    metadataOnlySavedViews: true;
    readOnlySavedViews: true;
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

export type MlWorkbenchImportAnnotationSavedViewsListResponse = {
  success: true;
  contract: MlWorkbenchImportAnnotationSavedViewsContract;
  summary: {
    generatedAt: string;
    phase: 'Phase 11I';
    status: 'annotation_saved_views_ready';
    savedViewCount: number;
    dynamicSavedViewCount: number;
    metadataOnlySavedViews: true;
    readOnlySavedViews: true;
    neverMutatesAnnotations: true;
    neverMutatesImportResults: true;
    recommendedNextAction: string;
  };
  savedViews: MlWorkbenchImportAnnotationSavedView[];
};

export type MlWorkbenchImportAnnotationSavedViewApplyResponse = {
  success: true;
  contract: MlWorkbenchImportAnnotationSavedViewsContract;
  selectedSavedView: MlWorkbenchImportAnnotationSavedView;
  summary: {
    generatedAt: string;
    phase: 'Phase 11I';
    status: string;
    filterCount: number;
    resultCount: number;
    totalAnnotationCount: number;
    warningCount: number;
    watchCount: number;
    resolvedCount: number;
    appliedFilters: Record<string, string | number | null>;
    selectedSavedViewId: MlWorkbenchImportAnnotationSavedViewId;
    selectedSavedViewLabel: string;
    savedViewApplied: true;
    metadataOnlySavedViews: true;
    readOnlySavedViews: true;
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
  annotations: MlWorkbenchImportReviewAnnotation[];
  safetyPolicy: MlWorkbenchImportAnnotationSavedViewsContract['operationalPolicy'];
};
