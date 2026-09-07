import { getWorkbenchImportResultAnnotationSummary } from '../../db/domains/ml/mlWorkbenchImportResultAnnotations.db';
import { searchMlWorkbenchImportReviewAnnotations } from './candidateEvaluationMetadataImportResultAnnotationSearch.service';
import { getMlWorkbenchImportAnnotationSavedViewCatalog } from './candidateEvaluationMetadataImportResultAnnotationSavedViews.service';
import type {
  MlWorkbenchImportAnnotationSavedView,
  MlWorkbenchImportAnnotationSavedViewId,
} from './candidateEvaluationMetadataImportResultAnnotationSavedViewsTypes';
import type {
  MlWorkbenchImportAnnotationSavedViewFilterCoverage,
  MlWorkbenchImportAnnotationSavedViewUsageContract,
  MlWorkbenchImportAnnotationSavedViewUsageRow,
  MlWorkbenchImportAnnotationSavedViewUsageStatus,
  MlWorkbenchImportAnnotationSavedViewUsageSummaryResponse,
} from './candidateEvaluationMetadataImportResultAnnotationSavedViewUsageSummaryTypes';

const CONTRACT_KEY = 'ml_workbench_import_annotation_saved_view_usage_summary_v1' as const;
const CONTRACT_VERSION = 'v1' as const;
const PHASE = 'Phase 11J' as const;

const metadataOnlyUsageSummary = true as const;
const readOnlyUsageSummary = true as const;
const storesUserBehavior = false as const;
const storesClickEvents = false as const;
const storesPersonalUsageSignals = false as const;
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
  metadataOnlyUsageSummary,
  readOnlyUsageSummary,
  storesUserBehavior,
  storesClickEvents,
  storesPersonalUsageSignals,
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
  'No storage of operator clickstream, personal usage behavior, or sensitive usage events.',
  'No mutation of annotation records through usage-summary routes.',
  'No mutation of import result records, inventory, accounting, pricing, reports, ledgers, customers, partners, sales, repairs, invoices, or phones.',
  'No new binder, signoff workflow, archive pack, retention policy, routing matrix, board packet, or governance workflow.',
] as const;

type PlainObject = Record<string, unknown>;

const asString = (value: unknown): string | null => {
  const text = String(value ?? '').trim();
  return text || null;
};

const toNumber = (value: unknown): number => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const buildFilterSignature = (view: MlWorkbenchImportAnnotationSavedView): string => {
  const entries = Object.entries(view.filters || {})
    .filter(([key, value]) => key !== 'limit' && value !== null && value !== undefined && String(value).trim() !== '')
    .map(([key, value]) => `${key}=${String(value)}`)
    .sort();
  if (view.dynamicFilter) entries.push(`dynamicFilter=${view.dynamicFilter}`);
  return entries.length ? entries.join('&') : 'all_annotations';
};

const buildSearchInputForView = (
  view: MlWorkbenchImportAnnotationSavedView,
  annotationSummary: PlainObject,
): PlainObject => {
  const filters: PlainObject = {
    ...view.filters,
    limit: 200,
  };
  if (view.dynamicFilter === 'latestCandidatePackageId') {
    filters.candidatePackageId = asString(annotationSummary.latestCandidatePackageId) || '__no_latest_candidate__';
  }
  return filters;
};

const computeUsefulnessScore = (view: MlWorkbenchImportAnnotationSavedView, matchedCount: number): number => {
  const severity = asString(view.filters?.severity);
  const scope = asString(view.filters?.annotationScope);
  const kind = asString(view.filters?.annotationKind);
  let weight = 1;
  if (severity === 'warning') weight += 3;
  if (severity === 'watch') weight += 2;
  if (kind === 'risk_note') weight += 3;
  if (kind === 'follow_up') weight += 2;
  if (scope === 'trend_signal') weight += 2;
  if (scope === 'offline_metrics_comparison') weight += 1;
  if (view.dynamicFilter) weight += 1;
  return Number((matchedCount * weight).toFixed(2));
};

const chooseUsageSignal = (view: MlWorkbenchImportAnnotationSavedView, matchedCount: number): MlWorkbenchImportAnnotationSavedViewUsageRow['usageSignal'] => {
  const severity = asString(view.filters?.severity);
  const kind = asString(view.filters?.annotationKind);
  if (matchedCount <= 0) return 'empty_view';
  if (severity === 'warning' || severity === 'watch' || kind === 'risk_note' || kind === 'follow_up') return 'high_attention';
  return 'active_context';
};

const buildFilterCoverage = (views: MlWorkbenchImportAnnotationSavedView[]): MlWorkbenchImportAnnotationSavedViewFilterCoverage[] => {
  const coverage = new Map<string, Set<MlWorkbenchImportAnnotationSavedViewId>>();
  for (const view of views) {
    const keys = Object.entries(view.filters || {})
      .filter(([key, value]) => key !== 'limit' && value !== null && value !== undefined && String(value).trim() !== '')
      .map(([key]) => key);
    if (view.dynamicFilter) keys.push('dynamicFilter');
    for (const key of keys) {
      const current = coverage.get(key) || new Set<MlWorkbenchImportAnnotationSavedViewId>();
      current.add(view.id);
      coverage.set(key, current);
    }
  }
  return [...coverage.entries()]
    .map(([filterKey, presetIds]) => ({
      filterKey,
      presetCount: presetIds.size,
      presetIds: [...presetIds].sort(),
      metadataOnlyCoverage: true as const,
    }))
    .sort((a, b) => b.presetCount - a.presetCount || a.filterKey.localeCompare(b.filterKey));
};

const chooseStatus = (rows: MlWorkbenchImportAnnotationSavedViewUsageRow[]): MlWorkbenchImportAnnotationSavedViewUsageStatus => {
  if (!rows.some((row) => row.matchedAnnotationCount > 0)) return 'saved_view_usage_summary_empty';
  if (rows.some((row) => row.usageSignal === 'high_attention')) return 'saved_view_usage_summary_attention';
  return 'saved_view_usage_summary_ready';
};

export const buildMlWorkbenchImportAnnotationSavedViewUsageSummaryContract = (): MlWorkbenchImportAnnotationSavedViewUsageContract => ({
  contractKey: CONTRACT_KEY,
  contractVersion: CONTRACT_VERSION,
  generatedAt: new Date().toISOString(),
  phase: PHASE,
  purpose: 'Summarize which annotation saved views have useful read-only metadata coverage without storing user behavior, click events, personal usage signals, or mutating annotations/import results.',
  dataSource: 'static_annotation_saved_view_catalog_plus_read_only_annotation_search',
  linkedSavedViewsContract: 'ml_workbench_import_annotation_saved_views_v1',
  linkedSearchContract: 'ml_workbench_import_annotation_search_v1',
  allowedRoutes: [
    'GET metadata-results/review-annotations/saved-views/usage-summary/contract',
    'GET metadata-results/review-annotations/saved-views/usage-summary',
  ],
  forbiddenBehavior: [...forbiddenBehavior],
  operationalPolicy: safetyPolicy,
});

export const buildMlWorkbenchImportAnnotationSavedViewUsageSummary = async (): Promise<MlWorkbenchImportAnnotationSavedViewUsageSummaryResponse> => {
  const savedViews = getMlWorkbenchImportAnnotationSavedViewCatalog();
  const annotationSummary = await getWorkbenchImportResultAnnotationSummary() as PlainObject;
  const rows: MlWorkbenchImportAnnotationSavedViewUsageRow[] = [];

  for (const view of savedViews) {
    const searchResponse = await searchMlWorkbenchImportReviewAnnotations(buildSearchInputForView(view, annotationSummary));
    const matchedAnnotationCount = Number(searchResponse.summary.resultCount || 0);
    const sampledAnnotationCount = searchResponse.annotations.length;
    rows.push({
      presetId: view.id,
      label: view.label,
      badge: view.badge,
      rank: 0,
      filterSignature: buildFilterSignature(view),
      matchedAnnotationCount,
      sampledAnnotationCount,
      usefulnessScore: computeUsefulnessScore(view, matchedAnnotationCount),
      usageSignal: chooseUsageSignal(view, matchedAnnotationCount),
      severityFocus: asString(view.filters?.severity),
      scopeFocus: asString(view.filters?.annotationScope),
      kindFocus: asString(view.filters?.annotationKind),
      dynamicSavedView: Boolean(view.dynamicFilter),
      metadataOnlyUsageSummary,
      readOnlyUsageSummary,
      storesUserBehavior,
      neverMutatesAnnotations,
      neverMutatesImportResults,
    });
  }

  rows.sort((a, b) => b.usefulnessScore - a.usefulnessScore || b.matchedAnnotationCount - a.matchedAnnotationCount || a.presetId.localeCompare(b.presetId));
  rows.forEach((row, index) => {
    row.rank = index + 1;
  });

  const filterCoverage = buildFilterCoverage(savedViews);
  const top = rows[0] || null;
  const status = chooseStatus(rows);
  const totalAnnotationCount = toNumber(annotationSummary.annotationCount);

  return {
    success: true,
    contract: buildMlWorkbenchImportAnnotationSavedViewUsageSummaryContract(),
    summary: {
      generatedAt: new Date().toISOString(),
      phase: PHASE,
      status,
      savedViewCount: savedViews.length,
      evaluatedSavedViewCount: rows.length,
      nonEmptySavedViewCount: rows.filter((row) => row.matchedAnnotationCount > 0).length,
      emptySavedViewCount: rows.filter((row) => row.matchedAnnotationCount <= 0).length,
      attentionSavedViewCount: rows.filter((row) => row.usageSignal === 'high_attention').length,
      totalAnnotationCount,
      warningCount: toNumber(annotationSummary.warningCount),
      watchCount: toNumber(annotationSummary.watchCount),
      resolvedCount: toNumber(annotationSummary.resolvedCount),
      topPresetId: top?.presetId || null,
      topPresetLabel: top?.label || null,
      topPresetMatchedAnnotationCount: top?.matchedAnnotationCount || 0,
      mostCoveredFilterKey: filterCoverage[0]?.filterKey || null,
      metadataOnlyUsageSummary,
      readOnlyUsageSummary,
      storesUserBehavior,
      storesClickEvents,
      storesPersonalUsageSignals,
      neverMutatesAnnotations,
      neverMutatesImportResults,
      modelExecutionAllowed,
      runtimeInvocationAllowed,
      inferenceEndpointExposed,
      artifactActivationAllowed,
      artifactBytesLoadingAllowed,
      rawCsvLoadingAllowed: false,
      businessMutationAllowed: false,
      governanceWorkflowAdded,
      recommendedNextAction: status === 'saved_view_usage_summary_empty'
        ? 'Saved view coverage is currently empty; keep using manual read-only filters without adding behavior tracking or governance workflow.'
        : status === 'saved_view_usage_summary_attention'
          ? 'High-attention saved views have matching annotations; review them as metadata context only without model activation or business mutation.'
          : 'Saved view coverage is available as lightweight metadata context only; do not store clickstream or infer operator intent from it.',
    },
    rows,
    filterCoverage,
    safetyPolicy,
  };
};

/* Phase 11J anchors: ml_workbench_import_annotation_saved_view_usage_summary_v1, review-annotations/saved-views/usage-summary, saved view usage summary, metadata-only usage summary, read-only usage summary, storesUserBehavior = false, storesClickEvents = false, storesPersonalUsageSignals = false, neverMutatesAnnotations, neverMutatesImportResults, no model execution, no runtime invocation, no inference endpoint, no activation, no artifact bytes, no raw CSV, no business mutation, no governance workflow. */
