import { apiFetch } from "../utils/apiFetch";
import { getAuthHeaders } from '../utils/apiUtils';

export const ML_OPERATOR_OVERVIEW_ROUTES = {
  comparisonSummaries: '/api/brain/ml-shadow-scores/metadata-only/comparison-summaries/internal/read-model',
  importReceipts: '/api/brain/ml-shadow-scores/metadata-only/import-apply-receipts/internal/read-model',
  receiptExports: '/api/brain/ml-shadow-scores/metadata-only/import-apply-receipt-exports/internal/read-model',
  exportPackages: '/api/brain/ml-shadow-scores/metadata-only/import-apply-receipt-export-packages/internal/read-model',
  packageSnapshots: '/api/brain/ml-shadow-scores/metadata-only/import-apply-receipt-export-package-snapshots/internal/read-model',
} as const;

export type MlOperatorOverviewRouteKey = keyof typeof ML_OPERATOR_OVERVIEW_ROUTES;

export type MlOperatorRouteState = 'ready' | 'empty' | 'unauthorized' | 'unavailable' | 'error';

export type MlOperatorRouteResult = {
  key: MlOperatorOverviewRouteKey;
  label: string;
  route: string;
  state: MlOperatorRouteState;
  statusCode: number | null;
  fetchedAt: string;
  count: number;
  latestId: string | null;
  latestChecksum: string | null;
  summary: Record<string, unknown> | null;
  items: unknown[];
  raw: unknown;
  message: string | null;
};

export type MlOperatorOverviewResult = {
  fetchedAt: string;
  sources: Record<MlOperatorOverviewRouteKey, MlOperatorRouteResult>;
  totals: {
    readySources: number;
    emptySources: number;
    warningSources: number;
    returnedItems: number;
  };
  safety: {
    metadataOnly: true;
    readOnly: true;
    modelExecutionAllowed: false;
    runtimeInvocationAllowed: false;
    inferenceEndpointExposed: false;
    artifactActivationAllowed: false;
    decisionAutomationAllowed: false;
    canMutateBusinessRecords: false;
  };
};

type RouteConfig = {
  key: MlOperatorOverviewRouteKey;
  label: string;
  route: string;
  query: Record<string, string>;
};

const ROUTE_CONFIGS: RouteConfig[] = [
  {
    key: 'comparisonSummaries',
    label: 'خلاصه مقایسه‌ها',
    route: ML_OPERATOR_OVERVIEW_ROUTES.comparisonSummaries,
    query: { limit: '5', offset: '0', sort: 'createdAt_desc' },
  },
  {
    key: 'importReceipts',
    label: 'رسیدهای ورود امن',
    route: ML_OPERATOR_OVERVIEW_ROUTES.importReceipts,
    query: { limit: '5', offset: '0', sort: 'createdAt_desc' },
  },
  {
    key: 'receiptExports',
    label: 'خروجی رسیدها',
    route: ML_OPERATOR_OVERVIEW_ROUTES.receiptExports,
    query: { limit: '5', offset: '0', sort: 'createdAt_desc' },
  },
  {
    key: 'exportPackages',
    label: 'بسته‌های خروجی',
    route: ML_OPERATOR_OVERVIEW_ROUTES.exportPackages,
    query: { limit: '5', offset: '0', sort: 'createdAt_desc' },
  },
  {
    key: 'packageSnapshots',
    label: 'اسنپ‌شات‌های بسته',
    route: ML_OPERATOR_OVERVIEW_ROUTES.packageSnapshots,
    query: { limit: '5', offset: '0' },
  },
];

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const firstString = (...values: unknown[]): string | null => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return null;
};

const unwrapData = (payload: unknown): unknown => {
  if (!isRecord(payload)) return payload;
  if ('data' in payload && isRecord(payload.data)) return payload.data;
  return payload;
};

const extractItems = (payload: unknown): unknown[] => {
  const data = unwrapData(payload);
  if (!isRecord(data)) return [];
  const candidates = [data.items, data.receipts, data.snapshots, data.records, data.results];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }
  const packageRecord = isRecord(data.package) ? data.package : null;
  return packageRecord ? [packageRecord] : [];
};

const extractSummary = (payload: unknown): Record<string, unknown> | null => {
  const data = unwrapData(payload);
  if (!isRecord(data)) return null;
  if (isRecord(data.summary)) return data.summary;
  if (isRecord(data.safety)) return data.safety;
  return null;
};

const extractLatestId = (items: unknown[]): string | null => {
  const latest = items.find(isRecord);
  if (!latest) return null;
  return firstString(
    latest.id,
    latest.summaryId,
    latest.summaryKey,
    latest.receiptId,
    latest.packageId,
    latest.snapshotId,
    latest.candidatePackageId,
  );
};

const extractChecksum = (items: unknown[]): string | null => {
  const latest = items.find(isRecord);
  if (!latest) return null;
  return firstString(
    latest.checksum,
    latest.contentHash,
    latest.receiptHash,
    latest.importPayloadHash,
    latest.exportPayloadHash,
    latest.packageHash,
  );
};

const stateFromResponse = (response: Response, items: unknown[]): MlOperatorRouteState => {
  if (response.status === 401 || response.status === 403) return 'unauthorized';
  if (response.status === 404) return 'unavailable';
  if (!response.ok) return 'error';
  return items.length > 0 ? 'ready' : 'empty';
};

const buildUrl = (route: string, query: Record<string, string>): string => {
  const params = new URLSearchParams(query);
  return `${route}?${params.toString()}`;
};

const fetchRoute = async (config: RouteConfig, token: string | null): Promise<MlOperatorRouteResult> => {
  const fetchedAt = new Date().toISOString();
  try {
    const response = await apiFetch(buildUrl(config.route, config.query), {
      method: 'GET',
      headers: getAuthHeaders(token),
      cache: 'no-store',
    });
    const raw: unknown = await response.json().catch(() => null);
    const items = response.ok ? extractItems(raw) : [];
    const summary = response.ok ? extractSummary(raw) : null;

    return {
      key: config.key,
      label: config.label,
      route: config.route,
      state: stateFromResponse(response, items),
      statusCode: response.status,
      fetchedAt,
      count: items.length,
      latestId: extractLatestId(items),
      latestChecksum: extractChecksum(items),
      summary,
      items,
      raw,
      message: response.ok ? null : 'دریافت اطلاعات این بخش با خطا روبه‌رو شد.',
    };
  } catch (error) {
    return {
      key: config.key,
      label: config.label,
      route: config.route,
      state: 'error',
      statusCode: null,
      fetchedAt,
      count: 0,
      latestId: null,
      latestChecksum: null,
      summary: null,
      items: [],
      raw: null,
      message: error instanceof Error ? error.message : 'خطای نامشخص در ارتباط با سرور.',
    };
  }
};

export const fetchMlOperatorOverview = async (token: string | null): Promise<MlOperatorOverviewResult> => {
  const results = await Promise.all(ROUTE_CONFIGS.map((config) => fetchRoute(config, token)));
  const sources = Object.fromEntries(results.map((result) => [result.key, result])) as Record<
    MlOperatorOverviewRouteKey,
    MlOperatorRouteResult
  >;
  const readySources = results.filter((result) => result.state === 'ready').length;
  const emptySources = results.filter((result) => result.state === 'empty').length;
  const warningSources = results.filter((result) => !['ready', 'empty'].includes(result.state)).length;

  return {
    fetchedAt: new Date().toISOString(),
    sources,
    totals: {
      readySources,
      emptySources,
      warningSources,
      returnedItems: results.reduce((sum, result) => sum + result.count, 0),
    },
    safety: {
      metadataOnly: true,
      readOnly: true,
      modelExecutionAllowed: false,
      runtimeInvocationAllowed: false,
      inferenceEndpointExposed: false,
      artifactActivationAllowed: false,
      decisionAutomationAllowed: false,
      canMutateBusinessRecords: false,
    },
  };
};
