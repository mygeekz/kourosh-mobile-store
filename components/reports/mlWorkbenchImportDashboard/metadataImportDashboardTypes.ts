export type ImportResultRow = {
  id?: number | null;
  rank?: number;
  candidatePackageId?: string | null;
  modelKey?: string | null;
  modelVersion?: string | null;
  predictionType?: string | null;
  metadataImportStatus?: string | null;
  validationStatus?: string | null;
  outputContractStatus?: string | null;
  safetyPolicyStatus?: string | null;
  comparisonScore?: number | null;
  comparisonBasis?: string | null;
  createdAt?: string | null;
  warningCount?: number | null;
  errorCount?: number | null;
  forbiddenFieldCount?: number | null;
  trainingPackageReference?: string | null;
  candidateManifestHash?: string | null;
  metadataOnly?: true;
  eligibleForProduction?: false;
  activationAllowed?: false;
  backendExecutionAllowed?: false;
  businessMutationAllowed?: false;
};

export type ImportResultSummary = {
  phase?: string;
  status?: string;
  recommendation?: string;
  candidateCount?: number;
  comparableCandidateCount?: number;
  safeMetadataCandidateCount?: number;
  warningCandidateCount?: number;
  blockedCandidateCount?: number;
  historyCount?: number;
  totalWarningCount?: number;
  totalErrorCount?: number;
  forbiddenFieldCount?: number;
  latestChecksumStatus?: string | null;
  latestSafetyPolicyStatus?: string | null;
  bestCandidatePackageId?: string | null;
  bestModelVersion?: string | null;
  bestComparisonScore?: number | null;
  bestComparisonBasis?: string | null;
  latestCandidatePackageId?: string | null;
  latestMetadataImportStatus?: string | null;
  latestValidationStatus?: string | null;
  metadataOnlyReadDashboard?: true;
  routeAdded?: true;
  modelExecutionAllowed?: false;
  runtimeInvocationAllowed?: false;
  inferenceEndpointExposed?: false;
  productionIntegrationAllowed?: false;
  decisionAutomationAllowed?: false;
  canChangeInventoryOrAccounting?: false;
  canChangePricing?: false;
  canChangeReports?: false;
  canChangeLedger?: false;
  canMutateBusinessRecords?: false;
  artifactExecutionAllowed?: false;
  artifactActivationAllowed?: false;
  artifactBytesLoadingAllowed?: false;
  rawTrainingCsvLoadingAllowed?: false;
  recommendedNextAction?: string;
};

export type ImportResultPayload = {
  summary?: ImportResultSummary;
  rows?: ImportResultRow[];
};

export type OfflineMetricsComparisonMetric = {
  key: string;
  label: string;
  persistedValue?: number | null;
  offlineWorkbenchValue?: number | null;
  delta?: number | null;
  status?: string | null;
};

export type OfflineMetricsComparisonRow = {
  candidatePackageId?: string | null;
  modelVersion?: string | null;
  comparisonStatus?: string | null;
  metricMatchCount?: number | null;
  metricDriftCount?: number | null;
  missingPersistedMetricCount?: number | null;
  missingOfflineMetricCount?: number | null;
  maxAbsDelta?: number | null;
  metrics?: OfflineMetricsComparisonMetric[];
};

export type OfflineMetricsComparisonPayload = {
  summary?: {
    phase?: string;
    status?: string;
    candidateCount?: number;
    comparableCandidateCount?: number;
    metricMatchCount?: number;
    metricDriftCount?: number;
    missingMetricCount?: number;
    maxAbsDelta?: number | null;
    baselineCandidatePackageId?: string | null;
    baselineModelVersion?: string | null;
    offlineMetricsSnapshotPath?: string | null;
    metadataOnlyComparison?: true;
    readOnlyComparison?: true;
    modelExecutionAllowed?: false;
    inferenceEndpointExposed?: false;
    artifactActivationAllowed?: false;
    businessMutationAllowed?: false;
    governanceWorkflowAdded?: false;
    recommendedNextAction?: string;
  };
  rows?: OfflineMetricsComparisonRow[];
};



export type TrendRegressionRow = {
  candidatePackageId?: string | null;
  modelVersion?: string | null;
  previousModelVersion?: string | null;
  trendStatus?: string | null;
  regressionSignalCount?: number | null;
  improvementSignalCount?: number | null;
  stableSignalCount?: number | null;
  warningDelta?: number | null;
  errorDelta?: number | null;
  forbiddenFieldDelta?: number | null;
  maxMetricDrop?: number | null;
};

export type TrendRegressionPayload = {
  summary?: {
    phase?: string;
    status?: string;
    historyCount?: number;
    analyzedTransitionCount?: number;
    regressionCandidateCount?: number;
    warningCandidateCount?: number;
    stableCandidateCount?: number;
    improvedMetricCount?: number;
    regressionMetricCount?: number;
    stableMetricCount?: number;
    warningIncreaseCount?: number;
    errorIncreaseCount?: number;
    forbiddenFieldIncreaseCount?: number;
    maxMetricDrop?: number | null;
    latestCandidatePackageId?: string | null;
    latestModelVersion?: string | null;
    latestTrendStatus?: string | null;
    metadataOnlyTrend?: true;
    readOnlyTrend?: true;
    usesPersistedResultHistory?: true;
    modelExecutionAllowed?: false;
    inferenceEndpointExposed?: false;
    artifactActivationAllowed?: false;
    businessMutationAllowed?: false;
    governanceWorkflowAdded?: false;
    recommendedNextAction?: string;
  };
  rows?: TrendRegressionRow[];
};


export type ReviewAnnotationSeverity = 'info' | 'watch' | 'warning' | 'resolved';
export type ReviewAnnotationScope = 'metadata_result' | 'trend_signal' | 'offline_metrics_comparison' | 'dashboard';
export type ReviewAnnotationKind = 'operator_note' | 'review_note' | 'risk_note' | 'follow_up' | 'dismissed_signal';

export type ReviewAnnotation = {
  id?: number | null;
  candidatePackageId?: string | null;
  annotationScope?: ReviewAnnotationScope | string | null;
  annotationKind?: ReviewAnnotationKind | string | null;
  severity?: ReviewAnnotationSeverity | string | null;
  signalKey?: string | null;
  noteText?: string | null;
  metadataOnly?: true;
  modelExecutionAllowed?: false;
  inferenceEndpointExposed?: false;
  artifactActivationAllowed?: false;
  businessMutationAllowed?: false;
  governanceWorkflowAdded?: false;
  createdAt?: string | null;
};

// Phase 11G compatibility fetch anchor: review-annotations?limit=5
export type ReviewAnnotationsPayload = {
  summary?: {
    phase?: string;
    status?: string;
    annotationCount?: number;
    safeAnnotationCount?: number;
    infoCount?: number;
    watchCount?: number;
    warningCount?: number;
    resolvedCount?: number;
    metadataResultCount?: number;
    trendSignalCount?: number;
    offlineMetricsComparisonCount?: number;
    latestCandidatePackageId?: string | null;
    latestSeverity?: string | null;
    latestAnnotationKind?: string | null;
    metadataOnlyAnnotations?: true;
    writesOnlyAnnotationRecords?: true;
    neverMutatesImportResults?: true;
    modelExecutionAllowed?: false;
    inferenceEndpointExposed?: false;
    artifactActivationAllowed?: false;
    businessMutationAllowed?: false;
    governanceWorkflowAdded?: false;
    recommendedNextAction?: string;
    filterCount?: number;
    resultCount?: number;
    totalAnnotationCount?: number;
    appliedFilters?: Record<string, string | number | null>;
    metadataOnlySearch?: true;
    readOnlySearch?: true;
  };
  annotations?: ReviewAnnotation[];
};

export type AnnotationSavedViewId =
  | 'warnings_only'
  | 'watch_queue'
  | 'resolved_notes'
  | 'trend_signals'
  | 'offline_metric_notes'
  | 'dashboard_notes'
  | 'risk_notes'
  | 'follow_up_notes'
  | 'latest_candidate';

export type AnnotationSavedView = {
  id: AnnotationSavedViewId | string;
  label?: string;
  description?: string;
  badge?: string;
  sortOrder?: number;
  filters?: Record<string, string | number | null>;
  dynamicFilter?: string;
  metadataOnlySavedView?: true;
  readOnlySavedView?: true;
  neverMutatesAnnotations?: true;
  neverMutatesImportResults?: true;
};

export type AnnotationSavedViewsPayload = {
  summary?: {
    phase?: string;
    status?: string;
    savedViewCount?: number;
    dynamicSavedViewCount?: number;
    metadataOnlySavedViews?: true;
    readOnlySavedViews?: true;
    neverMutatesAnnotations?: true;
    neverMutatesImportResults?: true;
    recommendedNextAction?: string;
  };
  savedViews?: AnnotationSavedView[];
};

export type AnnotationSavedViewUsageRow = {
  presetId?: AnnotationSavedViewId | string;
  label?: string;
  badge?: string;
  rank?: number;
  filterSignature?: string;
  matchedAnnotationCount?: number;
  sampledAnnotationCount?: number;
  usefulnessScore?: number;
  usageSignal?: string;
  severityFocus?: string | null;
  scopeFocus?: string | null;
  kindFocus?: string | null;
  dynamicSavedView?: boolean;
  metadataOnlyUsageSummary?: true;
  readOnlyUsageSummary?: true;
  storesUserBehavior?: false;
  neverMutatesAnnotations?: true;
  neverMutatesImportResults?: true;
};

export type AnnotationSavedViewUsagePayload = {
  summary?: {
    phase?: string;
    status?: string;
    savedViewCount?: number;
    evaluatedSavedViewCount?: number;
    nonEmptySavedViewCount?: number;
    emptySavedViewCount?: number;
    attentionSavedViewCount?: number;
    totalAnnotationCount?: number;
    warningCount?: number;
    watchCount?: number;
    resolvedCount?: number;
    topPresetId?: AnnotationSavedViewId | string | null;
    topPresetLabel?: string | null;
    topPresetMatchedAnnotationCount?: number;
    mostCoveredFilterKey?: string | null;
    metadataOnlyUsageSummary?: true;
    readOnlyUsageSummary?: true;
    storesUserBehavior?: false;
    storesClickEvents?: false;
    storesPersonalUsageSignals?: false;
    neverMutatesAnnotations?: true;
    neverMutatesImportResults?: true;
    recommendedNextAction?: string;
  };
  rows?: AnnotationSavedViewUsageRow[];
};


export type MetadataToShadowReadinessBridgeRow = {
  candidatePackageId?: string | null;
  modelKey?: string | null;
  modelVersion?: string | null;
  predictionType?: string | null;
  validationStatus?: string | null;
  validationScore?: number | null;
  warningCount?: number;
  errorCount?: number;
  forbiddenFieldCount?: number;
  metadataOnly?: boolean;
  modelBinaryPresent?: boolean;
  rawCsvPresent?: boolean;
  activationDirectivePresent?: boolean;
  inferenceDirectivePresent?: boolean;
  businessMutationDirectivePresent?: boolean;
  trainingPackageReference?: string | null;
  candidateManifestHash?: string | null;
  createdAt?: string | null;
  shadowCandidateReadiness?:
    | 'ready_for_shadow_observation_metadata_only'
    | 'needs_metadata_review_before_shadow_observation'
    | 'blocked_from_shadow_observation_metadata_only';
  readinessSignals?: string[];
  blockingReasons?: string[];
  metadataToShadowBridgeOnly?: true;
  readOnlyBridge?: true;
  createsShadowRuntimeRecord?: false;
  createsShadowObservation?: false;
  modelExecutionAllowed?: false;
  runtimeInvocationAllowed?: false;
  inferenceEndpointExposed?: false;
  artifactActivationAllowed?: false;
  canMutateBusinessRecords?: false;
};

export type MetadataToShadowReadinessBridgePayload = {
  summary?: {
    phase?: 'Phase 12A';
    status?: string;
    candidateCount?: number;
    readyCandidateCount?: number;
    watchCandidateCount?: number;
    blockedCandidateCount?: number;
    latestCandidatePackageId?: string | null;
    recommendedNextAction?: string;
    metadataOnlyBridge?: true;
    readOnlyBridge?: true;
    readinessOnly?: true;
    createsShadowRuntimeRecord?: false;
    createsShadowObservation?: false;
    createsGovernanceWorkflow?: false;
    modelExecutionAllowed?: false;
    runtimeInvocationAllowed?: false;
    inferenceEndpointExposed?: false;
    productionIntegrationAllowed?: false;
    decisionAutomationAllowed?: false;
    canChangeInventoryOrAccounting?: false;
    canChangePricing?: false;
    canChangeReports?: false;
    canChangeLedger?: false;
    canMutateBusinessRecords?: false;
    artifactExecutionAllowed?: false;
    artifactActivationAllowed?: false;
    artifactBytesLoadingAllowed?: false;
    rawTrainingCsvLoadingAllowed?: false;
  };
  rows?: MetadataToShadowReadinessBridgeRow[];
};

export type Phase11LDisclosurePanelKey = 'shadowReadiness' | 'consistencyHeatmap' | 'offlineMetrics' | 'trendRegression' | 'annotationWorkspace';

export type ImportResultDetailSection = {
  key: string;
  label: string;
  value: string | number | boolean | null;
  metadataOnly?: true;
};

export type ImportResultDetail = {
  candidatePackageId?: string | null;
  modelKey?: string | null;
  modelVersion?: string | null;
  predictionType?: string | null;
  metadataImportStatus?: string | null;
  validationStatus?: string | null;
  outputContractStatus?: string | null;
  safetyPolicyStatus?: string | null;
  comparisonScore?: number | null;
  comparisonBasis?: string | null;
  createdAt?: string | null;
  warningCount?: number | null;
  errorCount?: number | null;
  forbiddenFieldCount?: number | null;
  trainingPackageReference?: string | null;
  candidateManifestHash?: string | null;
  metadataOnly?: true;
  readOnly?: true;
  eligibleForProduction?: false;
  activationAllowed?: false;
  backendExecutionAllowed?: false;
  businessMutationAllowed?: false;
  sections?: ImportResultDetailSection[];
};

export type ImportResultDetailPayload = {
  status?: string;
  detail?: ImportResultDetail | null;
};

