import {
  getLatestWorkbenchImportResultAnnotation,
  getWorkbenchImportResultAnnotationSummary,
  getWorkbenchImportResultAnnotationsByCandidatePackageId,
  listWorkbenchImportResultAnnotations,
  recordWorkbenchImportResultAnnotation,
  type MlWorkbenchImportAnnotationKind,
  type MlWorkbenchImportAnnotationScope,
  type MlWorkbenchImportAnnotationSeverity,
} from '../../db/domains/ml/mlWorkbenchImportResultAnnotations.db';
import {
  getWorkbenchImportResultByCandidatePackageId,
  getWorkbenchImportResultById,
} from '../../db/domains/ml/mlWorkbenchImportResults.db';
import type {
  MlWorkbenchImportReviewAnnotation,
  MlWorkbenchImportReviewAnnotationKind,
  MlWorkbenchImportReviewAnnotationScope,
  MlWorkbenchImportReviewAnnotationsContract,
  MlWorkbenchImportReviewAnnotationsResponse,
  MlWorkbenchImportReviewAnnotationSeverity,
  MlWorkbenchImportReviewAnnotationStatus,
} from './candidateEvaluationMetadataImportResultAnnotationsTypes';

const CONTRACT_KEY = 'ml_workbench_import_review_annotations_v1' as const;
const CONTRACT_VERSION = 'v1' as const;
const PHASE = 'Phase 11G' as const;

const metadataOnlyAnnotations = true as const;
const writesOnlyAnnotationRecords = true as const;
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
  'No mutation of inventory, accounting, pricing, reports, ledgers, customers, partners, sales, repairs, invoices, or phones.',
  'No new binder, signoff workflow, archive pack, retention policy, routing matrix, board packet, or governance workflow.',
] as const;

const safetyPolicy = {
  metadataOnlyAnnotations,
  writesOnlyAnnotationRecords,
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

const normalizeScope = (value: unknown): MlWorkbenchImportAnnotationScope => {
  const text = asString(value);
  return allowedScopes.includes(text as MlWorkbenchImportReviewAnnotationScope)
    ? text as MlWorkbenchImportAnnotationScope
    : 'metadata_result';
};

const normalizeKind = (value: unknown): MlWorkbenchImportAnnotationKind => {
  const text = asString(value);
  return allowedKinds.includes(text as MlWorkbenchImportReviewAnnotationKind)
    ? text as MlWorkbenchImportAnnotationKind
    : 'operator_note';
};

const normalizeSeverity = (value: unknown): MlWorkbenchImportAnnotationSeverity => {
  const text = asString(value);
  return allowedSeverities.includes(text as MlWorkbenchImportReviewAnnotationSeverity)
    ? text as MlWorkbenchImportAnnotationSeverity
    : 'info';
};

const normalizeNoteText = (value: unknown): string => {
  const text = String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) throw new Error('متن یادداشت اپراتور الزامی است.');
  return text.slice(0, 1600);
};

const normalizeSignalKey = (value: unknown): string | null => {
  const text = asString(value);
  if (!text) return null;
  return text.replace(/[^a-zA-Z0-9_.:-]/g, '').slice(0, 120) || null;
};

const normalizeAnnotation = (value: unknown): MlWorkbenchImportReviewAnnotation | null => {
  const item = value as PlainObject | null | undefined;
  if (!item) return null;
  return {
    id: Number(item.id),
    importResultId: asIdentifier(item.importResultId),
    candidatePackageId: String(item.candidatePackageId ?? ''),
    annotationScope: normalizeScope(item.annotationScope),
    annotationKind: normalizeKind(item.annotationKind),
    severity: normalizeSeverity(item.severity),
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

const chooseStatus = (annotationCount: number, warningCount: number): MlWorkbenchImportReviewAnnotationStatus => {
  if (annotationCount <= 0) return 'review_annotations_empty';
  if (warningCount > 0) return 'review_annotations_warning';
  return 'review_annotations_ready';
};

const buildSummary = (summary: PlainObject = {}) => {
  const annotationCount = asNumber(summary.annotationCount) ?? 0;
  const warningCount = asNumber(summary.warningCount) ?? 0;
  const status = chooseStatus(annotationCount, warningCount);
  return {
    generatedAt: new Date().toISOString(),
    phase: PHASE,
    status,
    annotationCount,
    safeAnnotationCount: asNumber(summary.safeAnnotationCount) ?? 0,
    infoCount: asNumber(summary.infoCount) ?? 0,
    watchCount: asNumber(summary.watchCount) ?? 0,
    warningCount,
    resolvedCount: asNumber(summary.resolvedCount) ?? 0,
    metadataResultCount: asNumber(summary.metadataResultCount) ?? 0,
    trendSignalCount: asNumber(summary.trendSignalCount) ?? 0,
    offlineMetricsComparisonCount: asNumber(summary.offlineMetricsComparisonCount) ?? 0,
    latestCandidatePackageId: asString(summary.latestCandidatePackageId),
    latestSeverity: asString(summary.latestSeverity),
    latestAnnotationKind: asString(summary.latestAnnotationKind),
    metadataOnlyAnnotations,
    writesOnlyAnnotationRecords,
    neverMutatesImportResults,
    modelExecutionAllowed,
    runtimeInvocationAllowed,
    inferenceEndpointExposed,
    artifactActivationAllowed,
    artifactBytesLoadingAllowed,
    rawCsvLoadingAllowed: false as const,
    businessMutationAllowed: false as const,
    governanceWorkflowAdded,
    recommendedNextAction: status === 'review_annotations_empty'
      ? 'Add a short operator note only when a persisted metadata result, trend signal, or offline metrics comparison needs context; do not treat notes as signoff or activation.'
      : status === 'review_annotations_warning'
        ? 'Review warning annotations as metadata-only context; do not execute models, expose inference, activate artifacts, mutate business records, or create governance workflow.'
        : 'Operator annotations are available as metadata-only context; keep review notes lightweight and non-governance.',
  };
};

export const buildMlWorkbenchImportReviewAnnotationsContract = (): MlWorkbenchImportReviewAnnotationsContract => ({
  contractKey: CONTRACT_KEY,
  contractVersion: CONTRACT_VERSION,
  generatedAt: new Date().toISOString(),
  phase: PHASE,
  purpose: 'Attach lightweight operator notes to persisted metadata result records, trend signals, or offline metrics comparisons without activation, inference, or governance workflow.',
  dataSource: 'ml_workbench_import_result_annotations',
  linkedDataSource: 'ml_workbench_import_results',
  allowedRoutes: [
    'GET metadata-results/review-annotations/contract',
    'POST metadata-results/review-annotations',
    'GET metadata-results/review-annotations',
    'GET metadata-results/review-annotations/summary',
    'GET metadata-results/review-annotations/latest',
    'GET metadata-results/review-annotations/by-candidate/:candidatePackageId',
  ],
  allowedScopes,
  allowedKinds,
  allowedSeverities,
  forbiddenBehavior: [...forbiddenBehavior],
  operationalPolicy: safetyPolicy,
});

export const listMlWorkbenchImportReviewAnnotations = async (
  input: Record<string, unknown> = {},
): Promise<MlWorkbenchImportReviewAnnotationsResponse> => {
  const annotations = await listWorkbenchImportResultAnnotations({
    limit: input.limit,
    candidatePackageId: asString(input.candidatePackageId),
    importResultId: asNumber(input.importResultId),
    annotationScope: input.annotationScope ? normalizeScope(input.annotationScope) : null,
    severity: input.severity ? normalizeSeverity(input.severity) : null,
  });
  const summary = await getWorkbenchImportResultAnnotationSummary();
  return {
    success: true,
    contract: buildMlWorkbenchImportReviewAnnotationsContract(),
    summary: buildSummary(summary as PlainObject),
    annotations: annotations.map(normalizeAnnotation).filter(Boolean) as MlWorkbenchImportReviewAnnotation[],
    safetyPolicy,
  };
};

export const getMlWorkbenchImportReviewAnnotationSummary = async (): Promise<MlWorkbenchImportReviewAnnotationsResponse> => {
  const summary = await getWorkbenchImportResultAnnotationSummary();
  return {
    success: true,
    contract: buildMlWorkbenchImportReviewAnnotationsContract(),
    summary: buildSummary(summary as PlainObject),
    annotations: [],
    safetyPolicy,
  };
};

export const getLatestMlWorkbenchImportReviewAnnotation = async (): Promise<{
  success: true;
  contract: MlWorkbenchImportReviewAnnotationsContract;
  annotation: MlWorkbenchImportReviewAnnotation | null;
  safetyPolicy: MlWorkbenchImportReviewAnnotationsContract['operationalPolicy'];
}> => ({
  success: true,
  contract: buildMlWorkbenchImportReviewAnnotationsContract(),
  annotation: normalizeAnnotation(await getLatestWorkbenchImportResultAnnotation()),
  safetyPolicy,
});

export const getMlWorkbenchImportReviewAnnotationsByCandidatePackageId = async (candidatePackageId: string, limit: unknown = 50) => {
  const annotations = await getWorkbenchImportResultAnnotationsByCandidatePackageId(candidatePackageId, limit);
  const summary = await getWorkbenchImportResultAnnotationSummary();
  return {
    success: true,
    contract: buildMlWorkbenchImportReviewAnnotationsContract(),
    summary: buildSummary(summary as PlainObject),
    annotations: annotations.map(normalizeAnnotation).filter(Boolean),
    safetyPolicy,
  };
};

export const recordMlWorkbenchImportReviewAnnotation = async (
  input: Record<string, unknown> = {},
  createdByUserId: number | null = null,
) => {
  const importResultId = asNumber(input.importResultId);
  let candidatePackageId = asString(input.candidatePackageId);
  let importResult: PlainObject | null = null;

  if (importResultId) {
    importResult = await getWorkbenchImportResultById(importResultId) as PlainObject | null;
    if (!importResult) throw new Error('Persisted metadata import result برای این importResultId پیدا نشد.');
    candidatePackageId = candidatePackageId || asString(importResult.candidatePackageId);
  }

  if (candidatePackageId && !importResult) {
    importResult = await getWorkbenchImportResultByCandidatePackageId(candidatePackageId) as PlainObject | null;
  }

  if (!candidatePackageId) throw new Error('candidatePackageId یا importResultId برای ثبت annotation الزامی است.');

  const noteText = normalizeNoteText(input.noteText ?? input.note);
  const annotation = await recordWorkbenchImportResultAnnotation({
    importResultId: importResultId || asNumber(importResult?.id),
    candidatePackageId,
    annotationScope: normalizeScope(input.annotationScope),
    annotationKind: normalizeKind(input.annotationKind),
    severity: normalizeSeverity(input.severity),
    signalKey: normalizeSignalKey(input.signalKey),
    noteText,
    metadataSnapshot: {
      phase: PHASE,
      targetCandidatePackageId: candidatePackageId,
      targetImportResultId: importResultId || asNumber(importResult?.id),
      targetModelKey: importResult ? asString(importResult.modelKey) : null,
      targetModelVersion: importResult ? asString(importResult.modelVersion) : null,
      annotationScope: normalizeScope(input.annotationScope),
      annotationKind: normalizeKind(input.annotationKind),
      severity: normalizeSeverity(input.severity),
      metadataOnlyAnnotations,
      writesOnlyAnnotationRecords,
      neverMutatesImportResults,
      modelExecutionAllowed,
      runtimeInvocationAllowed,
      inferenceEndpointExposed,
      artifactActivationAllowed,
      artifactBytesLoadingAllowed,
      rawCsvLoadingAllowed: false,
      businessMutationAllowed: false,
      governanceWorkflowAdded,
    },
    createdByUserId,
  });

  return {
    success: true,
    contract: buildMlWorkbenchImportReviewAnnotationsContract(),
    annotation: normalizeAnnotation(annotation),
    safetyPolicy,
  };
};

/* Phase 11G anchors: ml_workbench_import_review_annotations_v1, review-annotations, operator annotations, noteText, severity, annotationScope, annotationKind, metadata-only annotations, writesOnlyAnnotationRecords, neverMutatesImportResults, no model execution, no runtime invocation, no inference endpoint, no activation, no artifact bytes, no raw CSV, no business mutation, no governance workflow. */
