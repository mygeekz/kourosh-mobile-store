import type {
  ShadowScoreComparisonSummaryInternalReadModelRouteResult,
  ShadowScoreComparisonSummaryInternalReadModelRouteSummary,
  ShadowScoreComparisonSummaryInternalReadModelSuccessEnvelope,
  ShadowScoreComparisonSummaryInternalReadModelErrorEnvelope,
} from './shadowScoreComparisonSummaryReadModelTypes';

export const INTERNAL_COMPARISON_SUMMARY_READ_MODEL_DEFAULT_LIMIT = 25 as const;
export const INTERNAL_COMPARISON_SUMMARY_READ_MODEL_MAX_LIMIT = 100 as const;
export const INTERNAL_COMPARISON_SUMMARY_READ_MODEL_DEFAULT_OFFSET = 0 as const;
export const INTERNAL_COMPARISON_SUMMARY_READ_MODEL_DEFAULT_SORT = 'createdAt_desc' as const;
export const INTERNAL_COMPARISON_SUMMARY_READ_MODEL_SUPPORTED_SORTS = ['createdAt_desc', 'createdAt_asc'] as const;
export const INTERNAL_COMPARISON_SUMMARY_READ_MODEL_FILTER_KEYS = [
  'candidatePackageId',
  'modelKey',
  'modelVersion',
  'predictionType',
  'baselineKey',
  'comparisonStatus',
] as const;

export const INTERNAL_COMPARISON_SUMMARY_READ_MODEL_ERROR_MESSAGE =
  'Invalid metadata-only comparison summary read-model request.' as const;

export const INTERNAL_COMPARISON_SUMMARY_READ_MODEL_BASE_SUMMARY: Omit<
  ShadowScoreComparisonSummaryInternalReadModelRouteSummary,
  'returnedCount'
> = Object.freeze({
  metadataOnly: true,
  modelExecutionAllowed: false,
  runtimeInvocationAllowed: false,
  inferenceEndpointExposed: false,
  artifactActivationAllowed: false,
  businessMutationAllowed: false,
});

export const buildInternalComparisonSummaryReadModelRouteSummary = (
  returnedCount: number,
): ShadowScoreComparisonSummaryInternalReadModelRouteSummary => ({
  ...INTERNAL_COMPARISON_SUMMARY_READ_MODEL_BASE_SUMMARY,
  returnedCount,
});

export const buildInternalComparisonSummaryReadModelSuccessEnvelope = (
  data: ShadowScoreComparisonSummaryInternalReadModelRouteResult,
): ShadowScoreComparisonSummaryInternalReadModelSuccessEnvelope => ({
  success: true,
  data,
});

export const buildInternalComparisonSummaryReadModelErrorEnvelope = ():
  ShadowScoreComparisonSummaryInternalReadModelErrorEnvelope => ({
  success: false,
  message: INTERNAL_COMPARISON_SUMMARY_READ_MODEL_ERROR_MESSAGE,
});
