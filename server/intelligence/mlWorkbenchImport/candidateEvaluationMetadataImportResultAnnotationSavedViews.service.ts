import { getWorkbenchImportResultAnnotationSummary } from '../../db/domains/ml/mlWorkbenchImportResultAnnotations.db';
import { searchMlWorkbenchImportReviewAnnotations } from './candidateEvaluationMetadataImportResultAnnotationSearch.service';
import type {
  MlWorkbenchImportAnnotationSavedView,
  MlWorkbenchImportAnnotationSavedViewApplyResponse,
  MlWorkbenchImportAnnotationSavedViewId,
  MlWorkbenchImportAnnotationSavedViewsContract,
  MlWorkbenchImportAnnotationSavedViewsListResponse,
} from './candidateEvaluationMetadataImportResultAnnotationSavedViewsTypes';

const CONTRACT_KEY = 'ml_workbench_import_annotation_saved_views_v1' as const;
const CONTRACT_VERSION = 'v1' as const;
const PHASE = 'Phase 11I' as const;

const metadataOnlySavedViews = true as const;
const readOnlySavedViews = true as const;
const neverMutatesAnnotations = true as const;
const neverMutatesImportResults = true as const;
const modelExecutionAllowed = false as const;
const runtimeInvocationAllowed = false as const;
const inferenceEndpointExposed = false as const;
const productionIntegrationAllowed = false as const;
const decisionAutomationAllowed = false as const;
const canChangeInventoryOrAccounting = false as const;
const canChangePricing = false as const;
const canChangeReports = false as const;
const canChangeLedger = false as const;
const canMutateBusinessRecords = false as const;
const artifactExecutionAllowed = false as const;
const artifactActivationAllowed = false as const;
const artifactBytesLoadingAllowed = false as const;
const rawTrainingCsvLoadingAllowed = false as const;
const governanceWorkflowAdded = false as const;

const safetyPolicy = {
  metadataOnlySavedViews,
  readOnlySavedViews,
  neverMutatesAnnotations,
  neverMutatesImportResults,
  modelExecutionAllowed,
  runtimeInvocationAllowed,
  inferenceEndpointExposed,
  productionIntegrationAllowed,
  decisionAutomationAllowed,
  canChangeInventoryOrAccounting,
  canChangePricing,
  canChangeReports,
  canChangeLedger,
  canMutateBusinessRecords,
  artifactExecutionAllowed,
  artifactActivationAllowed,
  artifactBytesLoadingAllowed,
  rawTrainingCsvLoadingAllowed,
  governanceWorkflowAdded,
};

const forbiddenBehavior = [
  'No backend model execution.',
  'No runtime invocation.',
  'No inference endpoint exposure.',
  'No model training, fitting, activation, deployment, or production scoring route.',
  'No model binary, artifact bytes, raw train.csv, raw test.csv, or live ml-workbench output loading.',
  'No mutation of annotation records through saved-view routes.',
  'No mutation of import result records, inventory, accounting, pricing, reports, ledgers, customers, partners, sales, repairs, invoices, or phones.',
  'No new binder, signoff workflow, archive pack, retention policy, routing matrix, board packet, or governance workflow.',
] as const;

type PlainObject = Record<string, unknown>;

const savedViewCatalog: MlWorkbenchImportAnnotationSavedView[] = [
  {
    id: 'warnings_only',
    label: 'Warnings only',
    description: 'Shows only warning-severity annotation records for fast operator review.',
    badge: 'Warning',
    sortOrder: 10,
    filters: { severity: 'warning', limit: 8 },
    metadataOnlySavedView: true,
    readOnlySavedView: true,
    neverMutatesAnnotations: true,
    neverMutatesImportResults: true,
  },
  {
    id: 'watch_queue',
    label: 'Watch queue',
    description: 'Shows watch-severity annotation records that need lightweight follow-up context.',
    badge: 'Watch',
    sortOrder: 20,
    filters: { severity: 'watch', limit: 8 },
    metadataOnlySavedView: true,
    readOnlySavedView: true,
    neverMutatesAnnotations: true,
    neverMutatesImportResults: true,
  },
  {
    id: 'trend_signals',
    label: 'Trend signals',
    description: 'Shows annotations attached to trend/regression signals only.',
    badge: 'Trend',
    sortOrder: 30,
    filters: { annotationScope: 'trend_signal', limit: 8 },
    metadataOnlySavedView: true,
    readOnlySavedView: true,
    neverMutatesAnnotations: true,
    neverMutatesImportResults: true,
  },
  {
    id: 'offline_metric_notes',
    label: 'Offline metric notes',
    description: 'Shows annotations tied to offline metrics comparison context.',
    badge: 'Offline',
    sortOrder: 40,
    filters: { annotationScope: 'offline_metrics_comparison', limit: 8 },
    metadataOnlySavedView: true,
    readOnlySavedView: true,
    neverMutatesAnnotations: true,
    neverMutatesImportResults: true,
  },
  {
    id: 'follow_up_notes',
    label: 'Follow-up notes',
    description: 'Shows operator follow-up annotation records only.',
    badge: 'Follow-up',
    sortOrder: 50,
    filters: { annotationKind: 'follow_up', limit: 8 },
    metadataOnlySavedView: true,
    readOnlySavedView: true,
    neverMutatesAnnotations: true,
    neverMutatesImportResults: true,
  },
  {
    id: 'risk_notes',
    label: 'Risk notes',
    description: 'Shows annotation records explicitly marked as risk notes.',
    badge: 'Risk',
    sortOrder: 60,
    filters: { annotationKind: 'risk_note', limit: 8 },
    metadataOnlySavedView: true,
    readOnlySavedView: true,
    neverMutatesAnnotations: true,
    neverMutatesImportResults: true,
  },
  {
    id: 'resolved_notes',
    label: 'Resolved notes',
    description: 'Shows resolved annotation records for post-review trace context.',
    badge: 'Resolved',
    sortOrder: 70,
    filters: { severity: 'resolved', limit: 8 },
    metadataOnlySavedView: true,
    readOnlySavedView: true,
    neverMutatesAnnotations: true,
    neverMutatesImportResults: true,
  },
  {
    id: 'dashboard_notes',
    label: 'Dashboard notes',
    description: 'Shows annotations attached to the dashboard context.',
    badge: 'Dashboard',
    sortOrder: 80,
    filters: { annotationScope: 'dashboard', limit: 8 },
    metadataOnlySavedView: true,
    readOnlySavedView: true,
    neverMutatesAnnotations: true,
    neverMutatesImportResults: true,
  },
  {
    id: 'latest_candidate',
    label: 'Latest candidate',
    description: 'Shows annotations for the latest annotated candidate; optionally accepts candidatePackageId override.',
    badge: 'Latest',
    sortOrder: 90,
    filters: { limit: 8 },
    dynamicFilter: 'latestCandidatePackageId',
    metadataOnlySavedView: true,
    readOnlySavedView: true,
    neverMutatesAnnotations: true,
    neverMutatesImportResults: true,
  },
];

const allowedPresetIds = savedViewCatalog.map((view) => view.id);

const normalizePresetId = (value: unknown): MlWorkbenchImportAnnotationSavedViewId | null => {
  const text = String(value ?? '').trim();
  return allowedPresetIds.includes(text as MlWorkbenchImportAnnotationSavedViewId)
    ? text as MlWorkbenchImportAnnotationSavedViewId
    : null;
};

const asString = (value: unknown): string | null => {
  const text = String(value ?? '').trim();
  return text || null;
};

const cloneView = (view: MlWorkbenchImportAnnotationSavedView): MlWorkbenchImportAnnotationSavedView => ({
  ...view,
  filters: { ...view.filters },
});

export const getMlWorkbenchImportAnnotationSavedViewCatalog = (): MlWorkbenchImportAnnotationSavedView[] =>
  savedViewCatalog
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(cloneView);

export const buildMlWorkbenchImportAnnotationSavedViewsContract = (): MlWorkbenchImportAnnotationSavedViewsContract => ({
  contractKey: CONTRACT_KEY,
  contractVersion: CONTRACT_VERSION,
  generatedAt: new Date().toISOString(),
  phase: PHASE,
  purpose: 'Provide a metadata-only, read-only catalog of quick annotation filter presets that apply Phase 11H annotation search filters without mutating annotations or import results.',
  dataSource: 'static_annotation_saved_view_catalog',
  linkedSearchContract: 'ml_workbench_import_annotation_search_v1',
  allowedRoutes: [
    'GET metadata-results/review-annotations/saved-views/contract',
    'GET metadata-results/review-annotations/saved-views',
    'GET metadata-results/review-annotations/saved-views/:presetId/apply',
  ],
  supportedPresetIds: [...allowedPresetIds],
  forbiddenBehavior: [...forbiddenBehavior],
  operationalPolicy: safetyPolicy,
});

export const listMlWorkbenchImportAnnotationSavedViews = async (): Promise<MlWorkbenchImportAnnotationSavedViewsListResponse> => {
  const savedViews = getMlWorkbenchImportAnnotationSavedViewCatalog();
  return {
    success: true,
    contract: buildMlWorkbenchImportAnnotationSavedViewsContract(),
    summary: {
      generatedAt: new Date().toISOString(),
      phase: PHASE,
      status: 'annotation_saved_views_ready',
      savedViewCount: savedViews.length,
      dynamicSavedViewCount: savedViews.filter((view) => view.dynamicFilter).length,
      metadataOnlySavedViews,
      readOnlySavedViews,
      neverMutatesAnnotations,
      neverMutatesImportResults,
      recommendedNextAction: 'Use saved views as read-only annotation filters only; do not treat a saved view as approval, activation, inference, or business mutation.',
    },
    savedViews,
  };
};

export const applyMlWorkbenchImportAnnotationSavedView = async (
  presetIdInput: unknown,
  query: PlainObject = {},
): Promise<MlWorkbenchImportAnnotationSavedViewApplyResponse> => {
  const presetId = normalizePresetId(presetIdInput) || 'warnings_only';
  const selected = getMlWorkbenchImportAnnotationSavedViewCatalog().find((view) => view.id === presetId)
    || getMlWorkbenchImportAnnotationSavedViewCatalog()[0];
  const annotationSummary = await getWorkbenchImportResultAnnotationSummary() as PlainObject;
  const candidateOverride = asString(query.candidatePackageId);
  const latestCandidatePackageId = candidateOverride || asString(annotationSummary.latestCandidatePackageId);
  const filters: PlainObject = {
    ...selected.filters,
    limit: query.limit || selected.filters.limit || 8,
  };

  if (selected.dynamicFilter === 'latestCandidatePackageId') {
    filters.candidatePackageId = latestCandidatePackageId || '__no_latest_candidate__';
  }

  const searchResponse = await searchMlWorkbenchImportReviewAnnotations(filters);
  return {
    success: true,
    contract: buildMlWorkbenchImportAnnotationSavedViewsContract(),
    selectedSavedView: selected,
    summary: {
      ...searchResponse.summary,
      phase: PHASE,
      metadataOnlySavedViews,
      readOnlySavedViews,
      neverMutatesAnnotations,
      neverMutatesImportResults,
      selectedSavedViewId: selected.id,
      selectedSavedViewLabel: selected.label,
      savedViewApplied: true,
      recommendedNextAction: searchResponse.annotations.length
        ? 'Review this saved-view result as metadata context only; saved views do not create approval, activation, inference, or business mutation.'
        : 'No annotations matched this saved view; adjust filters or pick another preset without creating governance workflow or model activation.',
    },
    annotations: searchResponse.annotations,
    safetyPolicy,
  };
};

/* Phase 11I anchors: ml_workbench_import_annotation_saved_views_v1, review-annotations/saved-views, warnings_only, watch_queue, trend_signals, offline_metric_notes, follow_up_notes, risk_notes, resolved_notes, dashboard_notes, latest_candidate, metadata-only saved views, read-only saved views, neverMutatesAnnotations, neverMutatesImportResults, no model execution, no runtime invocation, no inference endpoint, no activation, no artifact bytes, no raw CSV, no business mutation, no governance workflow. */
