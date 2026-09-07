import type { MlWorkbenchImportAnnotationSavedViewId } from './candidateEvaluationMetadataImportResultAnnotationSavedViewsTypes';

export type MlWorkbenchImportAnnotationSavedViewUsageStatus =
  | 'saved_view_usage_summary_ready'
  | 'saved_view_usage_summary_empty'
  | 'saved_view_usage_summary_attention';

export type MlWorkbenchImportAnnotationSavedViewUsageRow = {
  presetId: MlWorkbenchImportAnnotationSavedViewId;
  label: string;
  badge: string;
  rank: number;
  filterSignature: string;
  matchedAnnotationCount: number;
  sampledAnnotationCount: number;
  usefulnessScore: number;
  usageSignal: 'high_attention' | 'active_context' | 'empty_view';
  severityFocus: string | null;
  scopeFocus: string | null;
  kindFocus: string | null;
  dynamicSavedView: boolean;
  metadataOnlyUsageSummary: true;
  readOnlyUsageSummary: true;
  storesUserBehavior: false;
  neverMutatesAnnotations: true;
  neverMutatesImportResults: true;
};

export type MlWorkbenchImportAnnotationSavedViewFilterCoverage = {
  filterKey: string;
  presetCount: number;
  presetIds: MlWorkbenchImportAnnotationSavedViewId[];
  metadataOnlyCoverage: true;
};

export type MlWorkbenchImportAnnotationSavedViewUsageContract = {
  contractKey: 'ml_workbench_import_annotation_saved_view_usage_summary_v1';
  contractVersion: 'v1';
  generatedAt: string;
  phase: 'Phase 11J';
  purpose: string;
  dataSource: 'static_annotation_saved_view_catalog_plus_read_only_annotation_search';
  linkedSavedViewsContract: 'ml_workbench_import_annotation_saved_views_v1';
  linkedSearchContract: 'ml_workbench_import_annotation_search_v1';
  allowedRoutes: [
    'GET metadata-results/review-annotations/saved-views/usage-summary/contract',
    'GET metadata-results/review-annotations/saved-views/usage-summary',
  ];
  forbiddenBehavior: string[];
  operationalPolicy: {
    metadataOnlyUsageSummary: true;
    readOnlyUsageSummary: true;
    storesUserBehavior: false;
    storesClickEvents: false;
    storesPersonalUsageSignals: false;
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

export type MlWorkbenchImportAnnotationSavedViewUsageSummaryResponse = {
  success: true;
  contract: MlWorkbenchImportAnnotationSavedViewUsageContract;
  summary: {
    generatedAt: string;
    phase: 'Phase 11J';
    status: MlWorkbenchImportAnnotationSavedViewUsageStatus;
    savedViewCount: number;
    evaluatedSavedViewCount: number;
    nonEmptySavedViewCount: number;
    emptySavedViewCount: number;
    attentionSavedViewCount: number;
    totalAnnotationCount: number;
    warningCount: number;
    watchCount: number;
    resolvedCount: number;
    topPresetId: MlWorkbenchImportAnnotationSavedViewId | null;
    topPresetLabel: string | null;
    topPresetMatchedAnnotationCount: number;
    mostCoveredFilterKey: string | null;
    metadataOnlyUsageSummary: true;
    readOnlyUsageSummary: true;
    storesUserBehavior: false;
    storesClickEvents: false;
    storesPersonalUsageSignals: false;
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
  rows: MlWorkbenchImportAnnotationSavedViewUsageRow[];
  filterCoverage: MlWorkbenchImportAnnotationSavedViewFilterCoverage[];
  safetyPolicy: MlWorkbenchImportAnnotationSavedViewUsageContract['operationalPolicy'];
};
