import fs from 'node:fs';
import path from 'node:path';
import { listWorkbenchImportResults } from '../../db/domains/ml/mlWorkbenchImportResults.db';
import type {
  MlWorkbenchImportOfflineMetricsComparisonContract,
  MlWorkbenchImportOfflineMetricsComparisonMetric,
  MlWorkbenchImportOfflineMetricsComparisonResponse,
  MlWorkbenchImportOfflineMetricsComparisonRow,
  MlWorkbenchImportOfflineMetricsComparisonStatus,
} from './candidateEvaluationMetadataImportResultOfflineMetricsComparisonTypes';

const CONTRACT_KEY = 'ml_workbench_import_offline_metrics_comparison_v1' as const;
const CONTRACT_VERSION = 'v1' as const;
const PHASE = 'Phase 11E' as const;
const OFFLINE_METRICS_SNAPSHOT_PATH = 'server/tests/fixtures/mlWorkbenchImport/phase11e_offline_workbench_metrics_snapshot.fixture.json' as const;

const metadataOnlyComparison = true as const;
const readOnlyComparison = true as const;
const usesCopiedFixtureSnapshot = true as const;
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

const comparedMetricFields = [
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

const metricTolerance = 0.0001;

const forbiddenBehavior = [
  'No backend model execution.',
  'No runtime invocation.',
  'No inference endpoint exposure.',
  'No model binary, model bytes, artifact bytes, raw training CSV, or raw test CSV loading.',
  'No artifact activation.',
  'No production integration or decision automation.',
  'No mutation of inventory, accounting, pricing, reports, ledgers, customers, partners, sales, repairs, invoices, or phones.',
  'No new binder, signoff workflow, archive pack, retention policy, routing matrix, board packet, or governance workflow.',
] as const;

const safetyPolicy = {
  metadataOnlyComparison,
  readOnlyComparison,
  usesCopiedFixtureSnapshot,
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

const readOfflineMetricsSnapshot = (): PlainObject => {
  const absolute = path.resolve(process.cwd(), OFFLINE_METRICS_SNAPSHOT_PATH);
  const fallback = {
    candidatePackageId: null,
    modelVersion: null,
    metrics: {},
  };
  if (!fs.existsSync(absolute)) return fallback;
  try {
    const parsed = JSON.parse(fs.readFileSync(absolute, 'utf8')) as unknown;
    return isObject(parsed) ? parsed : fallback;
  } catch (_err) {
    return fallback;
  }
};

const metricStatus = (persistedValue: number | null, offlineWorkbenchValue: number | null) => {
  if (persistedValue === null) return 'missing_persisted_metric' as const;
  if (offlineWorkbenchValue === null) return 'missing_offline_metric' as const;
  return Math.abs(persistedValue - offlineWorkbenchValue) <= metricTolerance ? 'match' as const : 'drift' as const;
};

const compareMetrics = (persistedMetrics: unknown, offlineMetrics: unknown): MlWorkbenchImportOfflineMetricsComparisonMetric[] =>
  comparedMetricFields.map((key) => {
    const persistedValue = extractMetric(persistedMetrics, key);
    const offlineWorkbenchValue = extractMetric(offlineMetrics, key);
    const delta = persistedValue !== null && offlineWorkbenchValue !== null ? persistedValue - offlineWorkbenchValue : null;
    return {
      key,
      label: metricLabels[key],
      persistedValue,
      offlineWorkbenchValue,
      delta,
      tolerance: metricTolerance,
      status: metricStatus(persistedValue, offlineWorkbenchValue),
    };
  });

const chooseRowStatus = (metrics: MlWorkbenchImportOfflineMetricsComparisonMetric[]): MlWorkbenchImportOfflineMetricsComparisonStatus => {
  if (!metrics.length || metrics.every((metric) => metric.status === 'missing_persisted_metric' || metric.status === 'missing_offline_metric')) return 'offline_metrics_comparison_empty';
  if (metrics.some((metric) => metric.status !== 'match')) return 'offline_metrics_comparison_warning';
  return 'offline_metrics_comparison_ready';
};

const maxAbsDelta = (metrics: MlWorkbenchImportOfflineMetricsComparisonMetric[]): number | null => {
  const values = metrics.map((metric) => metric.delta).filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (!values.length) return null;
  return Math.max(...values.map((value) => Math.abs(value)));
};

const buildRow = (
  result: PlainObject,
  index: number,
  offlineMetrics: unknown,
): MlWorkbenchImportOfflineMetricsComparisonRow => {
  const metrics = compareMetrics(result.metricsSummary, offlineMetrics);
  const comparisonStatus = chooseRowStatus(metrics);
  return {
    id: asNumber(result.id),
    rank: index + 1,
    candidatePackageId: asString(result.candidatePackageId),
    modelKey: asString(result.modelKey),
    modelVersion: asString(result.modelVersion),
    predictionType: asString(result.predictionType),
    validationStatus: asString(result.validationStatus),
    comparisonStatus,
    metricsComparedCount: metrics.length,
    metricMatchCount: metrics.filter((metric) => metric.status === 'match').length,
    metricDriftCount: metrics.filter((metric) => metric.status === 'drift').length,
    missingPersistedMetricCount: metrics.filter((metric) => metric.status === 'missing_persisted_metric').length,
    missingOfflineMetricCount: metrics.filter((metric) => metric.status === 'missing_offline_metric').length,
    maxAbsDelta: maxAbsDelta(metrics),
    metrics,
    createdAt: asString(result.createdAt),
    metadataOnly: true,
    readOnlyComparison: true,
    usesCopiedFixtureSnapshot: true,
    modelExecutionAllowed: false,
    runtimeInvocationAllowed: false,
    inferenceEndpointExposed: false,
    artifactActivationAllowed: false,
    businessMutationAllowed: false,
    governanceWorkflowAdded: false,
  };
};

const chooseStatus = (rows: MlWorkbenchImportOfflineMetricsComparisonRow[]): MlWorkbenchImportOfflineMetricsComparisonStatus => {
  if (!rows.length) return 'offline_metrics_comparison_empty';
  if (rows.some((row) => row.comparisonStatus !== 'offline_metrics_comparison_ready')) return 'offline_metrics_comparison_warning';
  return 'offline_metrics_comparison_ready';
};

export const buildMlWorkbenchImportOfflineMetricsComparisonContract = (): MlWorkbenchImportOfflineMetricsComparisonContract => ({
  contractKey: CONTRACT_KEY,
  contractVersion: CONTRACT_VERSION,
  generatedAt: new Date().toISOString(),
  phase: PHASE,
  purpose: 'Compare persisted Phase 11D metadata-result metrics against a copied offline workbench metrics snapshot for read-only review visibility.',
  comparisonScope: 'persisted_metadata_import_result_to_offline_workbench_metrics_snapshot_only',
  dataSource: 'ml_workbench_import_results',
  offlineMetricsSnapshotPath: OFFLINE_METRICS_SNAPSHOT_PATH,
  allowedRoutes: [
    'GET /api/brain/ml-workbench-import/metadata-results/offline-metrics-comparison/contract',
    'GET /api/brain/ml-workbench-import/metadata-results/offline-metrics-comparison',
  ],
  comparedMetricFields: [...comparedMetricFields],
  forbiddenBehavior: [...forbiddenBehavior],
  operationalPolicy: safetyPolicy,
});

export const buildMlWorkbenchImportOfflineMetricsComparison = async (
  input: Record<string, unknown> = {},
): Promise<MlWorkbenchImportOfflineMetricsComparisonResponse> => {
  const limit = asNumber(input.limit) ?? 20;
  const persistedResults = await listWorkbenchImportResults(limit).catch(() => []);
  const snapshot = readOfflineMetricsSnapshot();
  const offlineMetrics = objectAt(snapshot, 'metrics') ?? {};
  const rows = (persistedResults as unknown as PlainObject[]).map((result, index) => buildRow(result, index, offlineMetrics));
  const status = chooseStatus(rows);
  const generatedAt = new Date().toISOString();
  const metricDriftCount = rows.reduce((sum, row) => sum + row.metricDriftCount, 0);
  const missingMetricCount = rows.reduce((sum, row) => sum + row.missingPersistedMetricCount + row.missingOfflineMetricCount, 0);
  const deltaValues = rows.map((row) => row.maxAbsDelta).filter((value): value is number => typeof value === 'number' && Number.isFinite(value));

  return {
    success: true,
    contract: buildMlWorkbenchImportOfflineMetricsComparisonContract(),
    summary: {
      generatedAt,
      phase: PHASE,
      status,
      candidateCount: rows.length,
      comparableCandidateCount: rows.filter((row) => row.metricsComparedCount > row.missingPersistedMetricCount + row.missingOfflineMetricCount).length,
      metricMatchCount: rows.reduce((sum, row) => sum + row.metricMatchCount, 0),
      metricDriftCount,
      missingMetricCount,
      maxAbsDelta: deltaValues.length ? Math.max(...deltaValues) : null,
      baselineCandidatePackageId: asString(snapshot.candidatePackageId),
      baselineModelVersion: asString(snapshot.modelVersion),
      offlineMetricsSnapshotPath: OFFLINE_METRICS_SNAPSHOT_PATH,
      metadataOnlyComparison,
      readOnlyComparison,
      modelExecutionAllowed,
      runtimeInvocationAllowed,
      inferenceEndpointExposed,
      artifactActivationAllowed,
      businessMutationAllowed: false,
      governanceWorkflowAdded,
      recommendedNextAction: status === 'offline_metrics_comparison_empty'
        ? 'Record metadata-only import results before comparing against the copied offline workbench metrics snapshot.'
        : 'Review metric drift or missing metadata only; do not run models, activate artifacts, expose inference, mutate business data, or add governance workflow.',
    },
    rows,
    safetyPolicy,
  };
};

/* Phase 11E anchors: ml_workbench_import_offline_metrics_comparison_v1, offline-metrics-comparison, copied offline workbench metrics snapshot, metadata-only comparison, read-only comparison, persisted Phase 11D metadata-result records, no model execution, no runtime invocation, no inference endpoint, no activation, no artifact bytes, no raw CSV, no business mutation, no governance workflow. */
