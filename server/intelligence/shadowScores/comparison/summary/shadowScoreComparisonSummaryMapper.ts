import { createHash } from 'node:crypto';
import type { ShadowScoreComparisonRequest, ShadowScoreComparisonResult } from '../shadowScoreComparisonTypes';
import type {
  ShadowScoreComparisonSummaryPayload,
  ShadowScoreComparisonSummaryPersistenceInput,
  ShadowScoreComparisonSummaryPersistenceOptions,
} from './shadowScoreComparisonSummaryTypes';

const stableStringify = (value: unknown): string => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`;
};

export const hashShadowScoreComparisonSummaryPayload = (payload: unknown): string => {
  return createHash('sha256').update(stableStringify(payload)).digest('hex');
};

const nullableString = (value: unknown): string | null => {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
};

const nullableInteger = (value: unknown): number | null => {
  if (value === undefined || value === null || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.trunc(numeric) : null;
};

export const mapShadowScoreComparisonResultToSummaryPayload = (
  result: ShadowScoreComparisonResult,
  request: ShadowScoreComparisonRequest,
): ShadowScoreComparisonSummaryPayload => ({
  phase: 'Phase 15B',
  summaryKind: 'metadata_only_shadow_score_comparison_summary_persistence',
  candidatePackageId: result.candidatePackageId,
  baselineSource: result.baselineCoverageSummary.baselineSource,
  baselineKey: nullableString(request.baselineKey),
  predictionType: nullableString(request.predictionType),
  horizonDays: nullableInteger(request.horizonDays),
  entityType: nullableString(request.entityType),
  comparisonStatus: result.comparisonStatus,
  baselineCoverageSummary: result.baselineCoverageSummary,
  candidateSummary: result.candidateSummary,
  baselineSummary: result.baselineSummary,
  deltaSummary: result.deltaSummary,
  agreementSummary: result.agreementSummary,
  warningCount: result.warnings.length,
  errorCount: result.errors.length,
  metadataOnly: true,
  evidenceOnly: true,
  modelExecutionAllowed: false,
  inferenceEndpointExposed: false,
  artifactActivationAllowed: false,
  canMutateBusinessRecords: false,
});

export const mapShadowScoreComparisonResultToPersistenceInput = (
  result: ShadowScoreComparisonResult,
  request: ShadowScoreComparisonRequest,
  options: ShadowScoreComparisonSummaryPersistenceOptions = {},
): ShadowScoreComparisonSummaryPersistenceInput => {
  const summaryPayload = mapShadowScoreComparisonResultToSummaryPayload(result, request);
  const comparisonResultHash = hashShadowScoreComparisonSummaryPayload(result);
  const summaryIdentityHash = hashShadowScoreComparisonSummaryPayload(summaryPayload);
  const summaryKey = hashShadowScoreComparisonSummaryPayload({
    phase: 'Phase 15B',
    candidatePackageId: result.candidatePackageId,
    baselineSource: summaryPayload.baselineSource,
    baselineKey: summaryPayload.baselineKey,
    predictionType: summaryPayload.predictionType,
    horizonDays: summaryPayload.horizonDays,
    entityType: summaryPayload.entityType,
    comparisonStatus: result.comparisonStatus,
    baselineCoverageStatus: result.baselineCoverageSummary.status,
    summaryIdentityHash,
    summaryKeySalt: nullableString(options.summaryKeySalt),
  });

  return {
    summaryKey,
    candidatePackageId: result.candidatePackageId,
    baselineSource: summaryPayload.baselineSource,
    baselineKey: summaryPayload.baselineKey,
    predictionType: summaryPayload.predictionType,
    horizonDays: summaryPayload.horizonDays,
    entityType: summaryPayload.entityType,
    comparisonStatus: result.comparisonStatus,
    baselineCoverageStatus: result.baselineCoverageSummary.status,
    candidateCount: result.baselineCoverageSummary.candidateCount,
    baselineCount: result.baselineCoverageSummary.baselineCount,
    matchedEntityCount: result.baselineCoverageSummary.matchedEntityCount,
    missingBaselineCount: result.baselineCoverageSummary.missingBaselineCount,
    extraBaselineCount: result.baselineCoverageSummary.extraBaselineCount,
    coverageRatio: result.baselineCoverageSummary.coverageRatio,
    absoluteDeltaMean: result.deltaSummary?.absoluteDeltaMean ?? null,
    absoluteDeltaMax: result.deltaSummary?.absoluteDeltaMax ?? null,
    signedDeltaMean: result.deltaSummary?.signedDeltaMean ?? null,
    labelAgreementRate: result.agreementSummary?.agreementRate ?? null,
    warningCount: result.warnings.length,
    errorCount: result.errors.length,
    comparisonGeneratedAt: result.generatedAt,
    comparisonResultHash,
    summaryPayload,
    comparisonResult: result,
    metadataOnly: true,
    modelBinaryPresent: false,
    rawCsvPresent: false,
    inferenceDirectivePresent: false,
    activationDirectivePresent: false,
    businessMutationDirectivePresent: false,
    safetyPolicy: result.safetyPolicy,
    createdByUserId: options.createdByUserId ?? null,
  };
};
