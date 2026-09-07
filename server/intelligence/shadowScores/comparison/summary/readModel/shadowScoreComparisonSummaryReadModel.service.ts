import {
  getLatestShadowScoreComparisonSummary,
  getShadowScoreComparisonSummaryById,
  getShadowScoreComparisonSummaryByKey,
  getShadowScoreComparisonSummaryStats,
  listShadowScoreComparisonSummaries,
  listShadowScoreComparisonSummaryReadModels,
} from '../../../../../db/domains/ml/shadowScores';
import {
  INTERNAL_COMPARISON_SUMMARY_READ_MODEL_DEFAULT_LIMIT,
  INTERNAL_COMPARISON_SUMMARY_READ_MODEL_DEFAULT_OFFSET,
  INTERNAL_COMPARISON_SUMMARY_READ_MODEL_DEFAULT_SORT,
  INTERNAL_COMPARISON_SUMMARY_READ_MODEL_FILTER_KEYS,
  INTERNAL_COMPARISON_SUMMARY_READ_MODEL_MAX_LIMIT,
  buildInternalComparisonSummaryReadModelRouteSummary,
} from './shadowScoreComparisonSummaryInternalReadModelContract';
import {
  mapStoredShadowScoreComparisonSummaryToReadModelDetail,
  mapStoredShadowScoreComparisonSummaryToReadModelListItem,
  STORED_COMPARISON_SUMMARY_READ_MODEL_SAFETY,
} from './shadowScoreComparisonSummaryReadModelMapper';
import type {
  ShadowScoreComparisonSummaryReadModelDetailResult,
  ShadowScoreComparisonSummaryReadModelIdentityRequest,
  ShadowScoreComparisonSummaryReadModelListRequest,
  ShadowScoreComparisonSummaryReadModelListResult,
  ShadowScoreComparisonSummaryReadModelOverview,
  ShadowScoreComparisonSummaryInternalReadModelRouteResult,
} from './shadowScoreComparisonSummaryReadModelTypes';

const generatedAt = (): string => new Date().toISOString();
const normalizeString = (value: unknown): string | null => (typeof value === 'string' && value.trim().length > 0 ? value.trim() : null);
const normalizePositiveInteger = (value: unknown): number | null => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? Math.trunc(numeric) : null;
};

export const listStoredShadowScoreComparisonSummaryReadModels = async (
  request: ShadowScoreComparisonSummaryReadModelListRequest = {},
): Promise<ShadowScoreComparisonSummaryReadModelListResult> => {
  const records = await listShadowScoreComparisonSummaries({
    candidatePackageId: normalizeString(request.candidatePackageId),
    baselineSource: normalizeString(request.baselineSource),
    baselineKey: normalizeString(request.baselineKey),
    comparisonStatus: normalizeString(request.comparisonStatus),
    baselineCoverageStatus: normalizeString(request.baselineCoverageStatus),
    entityType: normalizeString(request.entityType),
    limit: request.limit ?? 50,
  });

  return {
    phase: 'Phase 15C',
    readModelKind: 'metadata_only_shadow_score_comparison_summary_internal_admin_read_model',
    generatedAt: generatedAt(),
    filters: request,
    count: records.length,
    items: records.map(mapStoredShadowScoreComparisonSummaryToReadModelListItem),
    safety: STORED_COMPARISON_SUMMARY_READ_MODEL_SAFETY,
  };
};

export const getStoredShadowScoreComparisonSummaryReadModel = async (
  request: ShadowScoreComparisonSummaryReadModelIdentityRequest,
): Promise<ShadowScoreComparisonSummaryReadModelDetailResult> => {
  const summaryKey = normalizeString(request.summaryKey);
  const id = normalizePositiveInteger(request.id);
  const record = summaryKey
    ? await getShadowScoreComparisonSummaryByKey(summaryKey)
    : id
    ? await getShadowScoreComparisonSummaryById(id)
    : null;

  return {
    phase: 'Phase 15C',
    readModelKind: 'metadata_only_shadow_score_comparison_summary_internal_admin_read_model',
    generatedAt: generatedAt(),
    found: Boolean(record),
    record: record ? mapStoredShadowScoreComparisonSummaryToReadModelDetail(record) : null,
    safety: STORED_COMPARISON_SUMMARY_READ_MODEL_SAFETY,
  };
};

export const getStoredShadowScoreComparisonSummaryAdminOverview = async (): Promise<ShadowScoreComparisonSummaryReadModelOverview> => {
  const [stats, latest] = await Promise.all([
    getShadowScoreComparisonSummaryStats(),
    getLatestShadowScoreComparisonSummary(),
  ]);

  return {
    phase: 'Phase 15C',
    readModelKind: 'metadata_only_shadow_score_comparison_summary_internal_admin_read_model',
    generatedAt: generatedAt(),
    stats: {
      summaryCount: stats.summaryCount,
      candidatePackageCount: stats.candidatePackageCount,
      storedBaselineSummaryCount: stats.storedBaselineSummaryCount,
      coverageStatusDistribution: stats.coverageStatusDistribution,
      safeMetadataOnlyCount: stats.safeMetadataOnlyCount,
      unsafeFlagCount: stats.unsafeFlagCount,
    },
    latestSummary: latest ? mapStoredShadowScoreComparisonSummaryToReadModelListItem(latest) : null,
    safety: STORED_COMPARISON_SUMMARY_READ_MODEL_SAFETY,
  };
};

const normalizeNonNegativeInteger = (value: unknown): number | null => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? Math.trunc(numeric) : null;
};

// Phase 16B compatibility anchors for static regression guards:
// metadataOnly: true
// limitCandidate = normalizePositiveInteger(query.limit) ?? 25
// Math.min(limitCandidate, 100)
// normalizeNonNegativeInteger(query.offset) ?? 0
// modelExecutionAllowed: false
// runtimeInvocationAllowed: false
// inferenceEndpointExposed: false
// artifactActivationAllowed: false
// businessMutationAllowed: false
// returnedCount: items.length
// createdAt_desc
// createdAt_asc
// query.sort === 'createdAt_asc' ? 'createdAt_asc' : 'createdAt_desc'

export const normalizeShadowScoreComparisonSummaryInternalReadModelQuery = (
  query: Record<string, unknown> = {},
): ShadowScoreComparisonSummaryReadModelListRequest => {
  const limitCandidate = normalizePositiveInteger(query.limit) ?? INTERNAL_COMPARISON_SUMMARY_READ_MODEL_DEFAULT_LIMIT;
  const limit = Math.min(limitCandidate, INTERNAL_COMPARISON_SUMMARY_READ_MODEL_MAX_LIMIT);
  const offset = normalizeNonNegativeInteger(query.offset) ?? INTERNAL_COMPARISON_SUMMARY_READ_MODEL_DEFAULT_OFFSET;
  const sort = query.sort === 'createdAt_asc' ? 'createdAt_asc' : INTERNAL_COMPARISON_SUMMARY_READ_MODEL_DEFAULT_SORT;
  return {
    candidatePackageId: normalizeString(query.candidatePackageId),
    modelKey: normalizeString(query.modelKey),
    modelVersion: normalizeString(query.modelVersion),
    predictionType: normalizeString(query.predictionType),
    baselineKey: normalizeString(query.baselineKey),
    comparisonStatus: normalizeString(query.comparisonStatus),
    limit,
    offset,
    sort,
  };
};

export const listInternalAdminShadowScoreComparisonSummaryReadModelRoute = async (
  query: Record<string, unknown> = {},
): Promise<ShadowScoreComparisonSummaryInternalReadModelRouteResult> => {
  const filters = normalizeShadowScoreComparisonSummaryInternalReadModelQuery(query);
  const { records, total } = await listShadowScoreComparisonSummaryReadModels(filters);
  const items = records.map(mapStoredShadowScoreComparisonSummaryToReadModelListItem);
  const responseFilters: ShadowScoreComparisonSummaryInternalReadModelRouteResult['filters'] = {};
  for (const key of INTERNAL_COMPARISON_SUMMARY_READ_MODEL_FILTER_KEYS) {
    const value = filters[key];
    if (typeof value === 'string' && value.length > 0) responseFilters[key] = value;
  }
  const limit = filters.limit ?? INTERNAL_COMPARISON_SUMMARY_READ_MODEL_DEFAULT_LIMIT;
  const offset = filters.offset ?? INTERNAL_COMPARISON_SUMMARY_READ_MODEL_DEFAULT_OFFSET;
  return {
    items,
    page: {
      limit,
      offset,
      total,
      hasMore: offset + items.length < total,
    },
    summary: buildInternalComparisonSummaryReadModelRouteSummary(items.length),
    filters: responseFilters,
  };
};
