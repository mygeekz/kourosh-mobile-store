import {
  getWorkbenchImportResultAnnotationSummary,
  searchWorkbenchImportResultAnnotations,
} from '../../db/domains/ml/mlWorkbenchImportResultAnnotations.db';
import type {
  MlWorkbenchImportReviewAnnotation,
  MlWorkbenchImportReviewAnnotationKind,
  MlWorkbenchImportReviewAnnotationScope,
  MlWorkbenchImportReviewAnnotationSeverity,
} from './candidateEvaluationMetadataImportResultAnnotationsTypes';
import type {
  MlWorkbenchImportAnnotationSearchContract,
  MlWorkbenchImportAnnotationSearchResponse,
  MlWorkbenchImportAnnotationSearchStatus,
} from './candidateEvaluationMetadataImportResultAnnotationSearchTypes';

const CONTRACT_KEY = 'ml_workbench_import_annotation_search_v1' as const;
const CONTRACT_VERSION = 'v1' as const;
const PHASE = 'Phase 11H' as const;

const metadataOnlySearch = true as const;
const readOnlySearch = true as const;
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

const allowedScopes: MlWorkbenchImportReviewAnnotationScope[] = [
  'metadata_result',
  'trend_signal',
  'offline_metrics_comparison',
  'dashboard',
];

const allowedKinds: MlWorkbenchImportReviewAnnotationKind[] = [
  'operator_note',
  'review_note',
  'risk_note',
  'follow_up',
  'dismissed_signal',
];

const allowedSeverities: MlWorkbenchImportReviewAnnotationSeverity[] = [
  'info',
  'watch',
  'warning',
  'resolved',
];

const forbiddenBehavior = [
  'No backend model execution.',
  'No runtime invocation.',
  'No inference endpoint exposure.',
  'No model binary, artifact bytes, raw training CSV, or raw test CSV loading.',
  'No artifact activation.',
  'No production integration or decision automation.',
  'No mutation of annotations through search endpoints.',
  'No mutation of import result records, inventory, accounting, pricing, reports, ledgers, customers, partners, sales, repairs, invoices, or phones.',
  'No new binder, signoff workflow, archive pack, retention policy, routing matrix, board packet, or governance workflow.',
] as const;

const safetyPolicy = {
  metadataOnlySearch,
  readOnlySearch,
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

type PlainObject = Record<string, unknown>;

const asString = (value: unknown): string | null => {
  const text = String(value ?? '').trim();
  return text || null;
};

const asNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const asIdentifier = (value: unknown): string | number | null =>
  typeof value === 'string' || typeof value === 'number' ? value : null;

const asAllowedValue = <T extends string>(value: unknown, allowed: readonly T[]): T | null => {
  const text = asString(value);
  return text === null ? null : allowed.find((candidate) => candidate === text) ?? null;
};

const normalizeAnnotation = (value: unknown): MlWorkbenchImportReviewAnnotation | null => {
  const item = value as PlainObject | null | undefined;
  if (!item) return null;
  return {
    id: Number(item.id),
    importResultId: asIdentifier(item.importResultId),
    candidatePackageId: String(item.candidatePackageId ?? ''),
    annotationScope: String(item.annotationScope ?? 'metadata_result') as MlWorkbenchImportReviewAnnotationScope,
    annotationKind: String(item.annotationKind ?? 'operator_note') as MlWorkbenchImportReviewAnnotationKind,
    severity: String(item.severity ?? 'info') as MlWorkbenchImportReviewAnnotationSeverity,
    signalKey: asString(item.signalKey),
    noteText: String(item.noteText ?? ''),
    metadataSnapshot: item.metadataSnapshot ?? {},
    metadataOnly: true,
    modelExecutionAllowed: false,
    runtimeInvocationAllowed: false,
    inferenceEndpointExposed: false,
    artifactActivationAllowed: false,
    artifactBytesLoadingAllowed: false,
    rawCsvLoadingAllowed: false,
    businessMutationAllowed: false,
    governanceWorkflowAdded: false,
    createdAt: asString(item.createdAt),
    createdByUserId: asIdentifier(item.createdByUserId),
  };
};

const chooseStatus = (filterCount: number, resultCount: number): MlWorkbenchImportAnnotationSearchStatus => {
  if (resultCount <= 0) return 'annotation_search_empty';
  if (filterCount > 0) return 'annotation_search_filtered';
  return 'annotation_search_ready';
};

const normalizeQuery = (input: Record<string, unknown> = {}) => ({
  limit: input.limit,
  query: asString(input.query ?? input.q),
  candidatePackageId: asString(input.candidatePackageId),
  importResultId: asNumber(input.importResultId),
  annotationScope: asAllowedValue(input.annotationScope, allowedScopes),
  annotationKind: asAllowedValue(input.annotationKind, allowedKinds),
  severity: asAllowedValue(input.severity, allowedSeverities),
  signalKey: asString(input.signalKey),
  createdFrom: asString(input.createdFrom),
  createdTo: asString(input.createdTo),
});

export const buildMlWorkbenchImportAnnotationSearchContract = (): MlWorkbenchImportAnnotationSearchContract => ({
  contractKey: CONTRACT_KEY,
  contractVersion: CONTRACT_VERSION,
  generatedAt: new Date().toISOString(),
  phase: PHASE,
  purpose: 'Search and filter metadata-only operator annotations by candidate, severity, scope, kind, signal key, note text, and created-at bounds without mutating annotations or import results.',
  dataSource: 'ml_workbench_import_result_annotations',
  linkedDataSource: 'ml_workbench_import_results',
  allowedRoutes: [
    'GET metadata-results/review-annotations/search/contract',
    'GET metadata-results/review-annotations/search',
  ],
  searchableFields: ['candidatePackageId', 'noteText', 'signalKey'],
  filterFields: ['candidatePackageId', 'importResultId', 'annotationScope', 'annotationKind', 'severity', 'signalKey', 'createdFrom', 'createdTo'],
  allowedScopes,
  allowedKinds,
  allowedSeverities,
  forbiddenBehavior: [...forbiddenBehavior],
  operationalPolicy: safetyPolicy,
});

export const searchMlWorkbenchImportReviewAnnotations = async (
  input: Record<string, unknown> = {},
): Promise<MlWorkbenchImportAnnotationSearchResponse> => {
  const searchResult = await searchWorkbenchImportResultAnnotations(normalizeQuery(input));
  const summary = await getWorkbenchImportResultAnnotationSummary() as PlainObject;
  const appliedFilters = searchResult.appliedFilters || {};
  const filterCount = Number(searchResult.filterCount || Object.keys(appliedFilters).length || 0);
  const resultCount = Number(searchResult.resultCount || 0);
  const status = chooseStatus(filterCount, resultCount);
  return {
    success: true,
    contract: buildMlWorkbenchImportAnnotationSearchContract(),
    summary: {
      generatedAt: new Date().toISOString(),
      phase: PHASE,
      status,
      filterCount,
      resultCount,
      totalAnnotationCount: Number(summary.annotationCount ?? 0),
      warningCount: Number(summary.warningCount ?? 0),
      watchCount: Number(summary.watchCount ?? 0),
      resolvedCount: Number(summary.resolvedCount ?? 0),
      appliedFilters,
      metadataOnlySearch,
      readOnlySearch,
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
      recommendedNextAction: status === 'annotation_search_empty'
        ? 'Adjust filters or search terms; do not create activation, inference, or governance workflow from an empty annotation search.'
        : status === 'annotation_search_filtered'
          ? 'Use filtered annotations as lightweight metadata context only; search remains read-only and cannot mutate import results.'
          : 'Annotation search is available as read-only metadata context; keep review decisions outside model execution and business mutation paths.',
    },
    annotations: (searchResult.annotations || []).map(normalizeAnnotation).filter(Boolean) as MlWorkbenchImportReviewAnnotation[],
    safetyPolicy,
  };
};

/* Phase 11H anchors: ml_workbench_import_annotation_search_v1, review-annotations/search, searchWorkbenchImportResultAnnotations, candidatePackageId filter, severity filter, annotationScope filter, annotationKind filter, createdFrom createdTo bounds, metadata-only search, read-only search, neverMutatesAnnotations, neverMutatesImportResults, no model execution, no runtime invocation, no inference endpoint, no activation, no artifact bytes, no raw CSV, no business mutation, no governance workflow. */
