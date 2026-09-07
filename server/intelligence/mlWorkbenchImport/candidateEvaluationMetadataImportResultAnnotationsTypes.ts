export type MlWorkbenchImportReviewAnnotationStatus =
  | 'review_annotations_ready'
  | 'review_annotations_warning'
  | 'review_annotations_empty';

export type MlWorkbenchImportReviewAnnotationScope =
  | 'metadata_result'
  | 'trend_signal'
  | 'offline_metrics_comparison'
  | 'dashboard';

export type MlWorkbenchImportReviewAnnotationKind =
  | 'operator_note'
  | 'review_note'
  | 'risk_note'
  | 'follow_up'
  | 'dismissed_signal';

export type MlWorkbenchImportReviewAnnotationSeverity =
  | 'info'
  | 'watch'
  | 'warning'
  | 'resolved';

export type MlWorkbenchImportReviewAnnotation = {
  id: number;
  importResultId: number | string | null;
  candidatePackageId: string;
  annotationScope: MlWorkbenchImportReviewAnnotationScope;
  annotationKind: MlWorkbenchImportReviewAnnotationKind;
  severity: MlWorkbenchImportReviewAnnotationSeverity;
  signalKey: string | null;
  noteText: string;
  metadataSnapshot: unknown;
  metadataOnly: true;
  modelExecutionAllowed: false;
  runtimeInvocationAllowed: false;
  inferenceEndpointExposed: false;
  artifactActivationAllowed: false;
  artifactBytesLoadingAllowed: false;
  rawCsvLoadingAllowed: false;
  businessMutationAllowed: false;
  governanceWorkflowAdded: false;
  createdAt: string | null;
  createdByUserId: number | string | null;
};

export type MlWorkbenchImportReviewAnnotationsContract = {
  contractKey: 'ml_workbench_import_review_annotations_v1';
  contractVersion: 'v1';
  generatedAt: string;
  phase: 'Phase 11G';
  purpose: string;
  dataSource: 'ml_workbench_import_result_annotations';
  linkedDataSource: 'ml_workbench_import_results';
  allowedRoutes: [
    'GET metadata-results/review-annotations/contract',
    'POST metadata-results/review-annotations',
    'GET metadata-results/review-annotations',
    'GET metadata-results/review-annotations/summary',
    'GET metadata-results/review-annotations/latest',
    'GET metadata-results/review-annotations/by-candidate/:candidatePackageId',
  ];
  allowedScopes: MlWorkbenchImportReviewAnnotationScope[];
  allowedKinds: MlWorkbenchImportReviewAnnotationKind[];
  allowedSeverities: MlWorkbenchImportReviewAnnotationSeverity[];
  forbiddenBehavior: string[];
  operationalPolicy: {
    metadataOnlyAnnotations: true;
    writesOnlyAnnotationRecords: true;
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

export type MlWorkbenchImportReviewAnnotationsSummary = {
  generatedAt: string;
  phase: 'Phase 11G';
  status: MlWorkbenchImportReviewAnnotationStatus;
  annotationCount: number;
  safeAnnotationCount: number;
  infoCount: number;
  watchCount: number;
  warningCount: number;
  resolvedCount: number;
  metadataResultCount: number;
  trendSignalCount: number;
  offlineMetricsComparisonCount: number;
  latestCandidatePackageId: string | null;
  latestSeverity: string | null;
  latestAnnotationKind: string | null;
  metadataOnlyAnnotations: true;
  writesOnlyAnnotationRecords: true;
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

export type MlWorkbenchImportReviewAnnotationsResponse = {
  success: true;
  contract: MlWorkbenchImportReviewAnnotationsContract;
  summary: MlWorkbenchImportReviewAnnotationsSummary;
  annotations: MlWorkbenchImportReviewAnnotation[];
  safetyPolicy: MlWorkbenchImportReviewAnnotationsContract['operationalPolicy'];
};
