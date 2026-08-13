import { listWorkbenchImportResults } from '../../db/domains/ml/mlWorkbenchImportResults.db';
import type {
  MlWorkbenchImportTrendRegressionContract,
  MlWorkbenchImportTrendRegressionMetricSignal,
  MlWorkbenchImportTrendRegressionMetricStatus,
  MlWorkbenchImportTrendRegressionResponse,
  MlWorkbenchImportTrendRegressionRow,
  MlWorkbenchImportTrendRegressionStatus,
} from './candidateEvaluationMetadataImportResultTrendRegressionTypes';

const CONTRACT_KEY = 'ml_workbench_import_trend_regression_summary_v1' as const;
const CONTRACT_VERSION = 'v1' as const;
const PHASE = 'Phase 11F' as const;

const metadataOnlyTrend = true as const;
const readOnlyTrend = true as const;
const usesPersistedResultHistory = true as const;
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

const metricRegressionThreshold = 0.02;
const validationRegressionThreshold = 0.1;

const analyzedMetricFields = [
  'accuracyPct',
  'precisionPct',
  'recallPct',
  'f1Pct',
  'balancedAccuracyPct',
] as const;

const metricLabels: Record<string, string> = {
  accuracyPct: 'Accuracy %',
  precisionPct: 'Precision %',
  recallPct: 'Recall %',
  f1Pct: 'F1 %',
  balancedAccuracyPct: 'Balanced accuracy %',
};

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
  metadataOnlyTrend,
  readOnlyTrend,
  usesPersistedResultHistory,
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

const isObject = (value: unknown): value is PlainObject =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const objectAt = (value: unknown, key: string): PlainObject | null => {
  if (!isObject(value)) return null;
  const next = value[key];
  return isObject(next) ? next : null;
};

const numberAt = (value: unknown, key: string): number | null => {
  if (!isObject(value)) return null;
  return asNumber(value[key]);
};

const extractMetric = (value: unknown, key: string): number | null => {
  const direct = numberAt(value, key);
  if (direct !== null) return direct;
  const summary = objectAt(value, 'summary');
  const summaryValue = numberAt(summary, key);
  if (summaryValue !== null) return summaryValue;
  const metrics = objectAt(value, 'metrics');
  const metricValue = numberAt(metrics, key);
  if (metricValue !== null) return metricValue;
  return null;
};

const orderHistoryChronologically = (results: PlainObject[]): PlainObject[] =>
  [...results].sort((left, right) => {
    const leftDate = Date.parse(asString(left.createdAt) || '');
    const rightDate = Date.parse(asString(right.createdAt) || '');
    if (Number.isFinite(leftDate) && Number.isFinite(rightDate) && leftDate !== rightDate) return leftDate - rightDate;
    return (asNumber(left.id) ?? 0) - (asNumber(right.id) ?? 0);
  });

const metricStatus = (previousValue: number | null, currentValue: number | null): MlWorkbenchImportTrendRegressionMetricStatus => {
  if (currentValue === null) return 'missing_current_metric';
  if (previousValue === null) return 'missing_previous_metric';
  const delta = currentValue - previousValue;
  if (delta <= -metricRegressionThreshold) return 'regression';
  if (delta >= metricRegressionThreshold) return 'improved';
  return 'stable';
};

const buildMetricSignals = (previous: PlainObject, current: PlainObject): MlWorkbenchImportTrendRegressionMetricSignal[] =>
  analyzedMetricFields.map((key) => {
    const previousValue = extractMetric(previous.metricsSummary, key);
    const currentValue = extractMetric(current.metricsSummary, key);
    const delta = previousValue !== null && currentValue !== null ? currentValue - previousValue : null;
    return {
      key,
      label: metricLabels[key],
      previousValue,
      currentValue,
      delta,
      regressionThreshold: metricRegressionThreshold,
      status: metricStatus(previousValue, currentValue),
    };
  });

const maxDrop = (signals: MlWorkbenchImportTrendRegressionMetricSignal[]): number | null => {
  const drops = signals
    .map((signal) => signal.delta)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value < 0)
    .map((value) => Math.abs(value));
  return drops.length ? Math.max(...drops) : null;
};

const chooseRowStatus = (
  signals: MlWorkbenchImportTrendRegressionMetricSignal[],
  validationScoreDelta: number | null,
  warningDelta: number,
  errorDelta: number,
  forbiddenFieldDelta: number,
): MlWorkbenchImportTrendRegressionStatus => {
  if (!signals.length) return 'trend_regression_summary_empty';
  const hasRegression = signals.some((signal) => signal.status === 'regression')
    || (validationScoreDelta !== null && validationScoreDelta <= -validationRegressionThreshold)
    || warningDelta > 0
    || errorDelta > 0
    || forbiddenFieldDelta > 0;
  return hasRegression ? 'trend_regression_summary_warning' : 'trend_regression_summary_ready';
};

const buildRow = (previous: PlainObject, current: PlainObject, index: number): MlWorkbenchImportTrendRegressionRow => {
  const metricSignals = buildMetricSignals(previous, current);
  const validationScore = asNumber(current.validationScore);
  const previousValidationScore = asNumber(previous.validationScore);
  const validationScoreDelta = validationScore !== null && previousValidationScore !== null ? validationScore - previousValidationScore : null;
  const warningCount = asNumber(current.warningCount) ?? 0;
  const previousWarningCount = asNumber(previous.warningCount) ?? 0;
  const errorCount = asNumber(current.errorCount) ?? 0;
  const previousErrorCount = asNumber(previous.errorCount) ?? 0;
  const forbiddenFieldCount = asNumber(current.forbiddenFieldCount) ?? 0;
  const previousForbiddenFieldCount = asNumber(previous.forbiddenFieldCount) ?? 0;
  const warningDelta = warningCount - previousWarningCount;
  const errorDelta = errorCount - previousErrorCount;
  const forbiddenFieldDelta = forbiddenFieldCount - previousForbiddenFieldCount;
  const trendStatus = chooseRowStatus(metricSignals, validationScoreDelta, warningDelta, errorDelta, forbiddenFieldDelta);

  return {
    id: asNumber(current.id),
    rank: index + 1,
    candidatePackageId: asString(current.candidatePackageId),
    modelKey: asString(current.modelKey),
    modelVersion: asString(current.modelVersion),
    predictionType: asString(current.predictionType),
    validationStatus: asString(current.validationStatus),
    createdAt: asString(current.createdAt),
    previousCandidatePackageId: asString(previous.candidatePackageId),
    previousModelVersion: asString(previous.modelVersion),
    previousCreatedAt: asString(previous.createdAt),
    validationScore,
    previousValidationScore,
    validationScoreDelta,
    warningCount,
    previousWarningCount,
    warningDelta,
    errorCount,
    previousErrorCount,
    errorDelta,
    forbiddenFieldCount,
    previousForbiddenFieldCount,
    forbiddenFieldDelta,
    trendStatus,
    metricSignalCount: metricSignals.length,
    regressionSignalCount: metricSignals.filter((signal) => signal.status === 'regression').length,
    improvementSignalCount: metricSignals.filter((signal) => signal.status === 'improved').length,
    stableSignalCount: metricSignals.filter((signal) => signal.status === 'stable').length,
    maxMetricDrop: maxDrop(metricSignals),
    metricSignals,
    metadataOnlyTrend,
    readOnlyTrend,
    usesPersistedResultHistory,
    modelExecutionAllowed,
    runtimeInvocationAllowed,
    inferenceEndpointExposed,
    artifactActivationAllowed,
    businessMutationAllowed: false,
    governanceWorkflowAdded,
  };
};

const buildRows = (history: PlainObject[]): MlWorkbenchImportTrendRegressionRow[] => {
  const chronological = orderHistoryChronologically(history);
  const rows: MlWorkbenchImportTrendRegressionRow[] = [];
  const previousByModel = new Map<string, PlainObject>();

  for (const current of chronological) {
    const groupKey = [asString(current.modelKey), asString(current.predictionType)].filter(Boolean).join('::') || 'unknown-model';
    const previous = previousByModel.get(groupKey);
    if (previous) rows.push(buildRow(previous, current, rows.length));
    previousByModel.set(groupKey, current);
  }

  return rows.reverse();
};

const chooseSummaryStatus = (rows: MlWorkbenchImportTrendRegressionRow[], historyCount: number): MlWorkbenchImportTrendRegressionStatus => {
  if (historyCount < 2 || !rows.length) return 'trend_regression_summary_empty';
  if (rows.some((row) => row.trendStatus === 'trend_regression_summary_warning')) return 'trend_regression_summary_warning';
  return 'trend_regression_summary_ready';
};

export const buildMlWorkbenchImportTrendRegressionSummaryContract = (): MlWorkbenchImportTrendRegressionContract => ({
  contractKey: CONTRACT_KEY,
  contractVersion: CONTRACT_VERSION,
  generatedAt: new Date().toISOString(),
  phase: PHASE,
  purpose: 'Summarize persisted metadata-result history into read-only trend and regression signals for Smart Insight Center visibility.',
  analysisScope: 'persisted_metadata_import_result_history_only',
  dataSource: 'ml_workbench_import_results',
  allowedRoutes: [
    'GET /api/brain/ml-workbench-import/metadata-results/trend-regression-summary/contract',
    'GET /api/brain/ml-workbench-import/metadata-results/trend-regression-summary',
  ],
  analyzedMetricFields: [...analyzedMetricFields],
  forbiddenBehavior: [...forbiddenBehavior],
  operationalPolicy: safetyPolicy,
});

export const buildMlWorkbenchImportTrendRegressionSummary = async (
  input: Record<string, unknown> = {},
): Promise<MlWorkbenchImportTrendRegressionResponse> => {
  const limit = asNumber(input.limit) ?? 30;
  const persistedResults = await listWorkbenchImportResults(limit).catch(() => []);
  const history = (persistedResults as unknown as PlainObject[]).filter(Boolean);
  const rows = buildRows(history);
  const generatedAt = new Date().toISOString();
  const status = chooseSummaryStatus(rows, history.length);
  const regressionMetricCount = rows.reduce((sum, row) => sum + row.regressionSignalCount, 0);
  const improvedMetricCount = rows.reduce((sum, row) => sum + row.improvementSignalCount, 0);
  const stableMetricCount = rows.reduce((sum, row) => sum + row.stableSignalCount, 0);
  const dropValues = rows.map((row) => row.maxMetricDrop).filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  const latest = orderHistoryChronologically(history).at(-1) ?? null;

  return {
    success: true,
    contract: buildMlWorkbenchImportTrendRegressionSummaryContract(),
    summary: {
      generatedAt,
      phase: PHASE,
      status,
      historyCount: history.length,
      analyzedTransitionCount: rows.length,
      comparableTransitionCount: rows.filter((row) => row.metricSignalCount > 0).length,
      regressionCandidateCount: rows.filter((row) => row.regressionSignalCount > 0 || row.validationScoreDelta !== null && row.validationScoreDelta <= -validationRegressionThreshold).length,
      warningCandidateCount: rows.filter((row) => row.trendStatus === 'trend_regression_summary_warning').length,
      stableCandidateCount: rows.filter((row) => row.trendStatus === 'trend_regression_summary_ready').length,
      improvedMetricCount,
      regressionMetricCount,
      stableMetricCount,
      warningIncreaseCount: rows.filter((row) => row.warningDelta > 0).length,
      errorIncreaseCount: rows.filter((row) => row.errorDelta > 0).length,
      forbiddenFieldIncreaseCount: rows.filter((row) => row.forbiddenFieldDelta > 0).length,
      maxMetricDrop: dropValues.length ? Math.max(...dropValues) : null,
      latestCandidatePackageId: latest ? asString(latest.candidatePackageId) : null,
      latestModelVersion: latest ? asString(latest.modelVersion) : null,
      latestTrendStatus: rows[0]?.trendStatus ?? status,
      metadataOnlyTrend,
      readOnlyTrend,
      usesPersistedResultHistory,
      modelExecutionAllowed,
      runtimeInvocationAllowed,
      inferenceEndpointExposed,
      artifactActivationAllowed,
      businessMutationAllowed: false,
      governanceWorkflowAdded,
      recommendedNextAction: status === 'trend_regression_summary_empty'
        ? 'Persist at least two metadata-only import results for the same model/prediction type before trend signals can be summarized.'
        : status === 'trend_regression_summary_warning'
          ? 'Review regression, warning, error, or forbidden-field increases only; do not run models, activate artifacts, expose inference, mutate business data, or add governance workflow.'
          : 'Trend signals are stable based on persisted metadata history; continue metadata-only monitoring without execution or activation.',
    },
    rows,
    safetyPolicy,
  };
};

/* Phase 11F anchors: ml_workbench_import_trend_regression_summary_v1, trend-regression-summary, persisted metadata-result history, trend signal, regression signal, warning increase, error increase, metadata-only trend, read-only trend, no model execution, no runtime invocation, no inference endpoint, no activation, no artifact bytes, no raw CSV, no business mutation, no governance workflow. */
