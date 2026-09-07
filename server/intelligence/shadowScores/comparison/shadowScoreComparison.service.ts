import {
  getBaselineScoreMetadataRecordsForComparison,
  getShadowScoreMetadataRecordsByCandidatePackageId,
} from '../../../db/domains/ml/shadowScores';
import {
  computeShadowScoreAgreementSummary,
  computeShadowScoreDeltaSummary,
  summarizeShadowScoreDistribution,
} from './shadowScoreComparisonMath';
import {
  filterShadowScoreComparisonRecords,
  mapBaselineFixtureToComparisonRecords,
  mapStoredShadowScoreMetadataRecordsToComparisonRecords,
} from './shadowScoreComparisonMapper';
import type {
  BaselineCoverageSummary,
  ShadowScoreComparisonBaselineSource,
  ShadowScoreComparisonRequest,
  ShadowScoreComparisonResult,
  ShadowScoreComparisonSafetyPolicy,
  ShadowScoreComparisonScoreRecord,
  ShadowScoreComparisonServiceOptions,
} from './shadowScoreComparisonTypes';

const safetyPolicy: ShadowScoreComparisonSafetyPolicy = {
  metadataOnly: true,
  modelExecutionAllowed: false,
  runtimeInvocationAllowed: false,
  inferenceEndpointExposed: false,
  productionIntegrationAllowed: false,
  decisionAutomationAllowed: false,
  businessMutationAllowed: false,
  canChangeInventoryOrAccounting: false,
  canChangePricing: false,
  canChangeReports: false,
  canChangeLedger: false,
  canMutateBusinessRecords: false,
  artifactExecutionAllowed: false,
  artifactActivationAllowed: false,
  artifactBytesLoadingAllowed: false,
  rawTrainingCsvLoadingAllowed: false,
  automaticDeletionAllowed: false,
  purgeJobAllowed: false,
};

const emptySummary = summarizeShadowScoreDistribution([]);

const makeCoverageSummary = (
  baselineSource: ShadowScoreComparisonBaselineSource,
  candidateCount: number,
  baselineCount: number,
  matchedEntityCount: number,
  missingBaselineCount: number,
  extraBaselineCount: number,
): BaselineCoverageSummary => {
  const coverageRatio = candidateCount > 0 ? Number((matchedEntityCount / candidateCount).toFixed(6)) : 0;
  return {
    baselineSource,
    candidateCount,
    baselineCount,
    matchedEntityCount,
    missingBaselineCount,
    extraBaselineCount,
    coverageRatio,
    status: baselineCount === 0 || matchedEntityCount === 0 ? 'missing' : missingBaselineCount === 0 ? 'complete' : 'partial',
  };
};

const emptyCoverage = (
  baselineSource: ShadowScoreComparisonBaselineSource,
  candidateCount = 0,
): BaselineCoverageSummary => makeCoverageSummary(baselineSource, candidateCount, 0, 0, candidateCount, 0);

const failureResult = (
  candidatePackageId: string,
  errors: string[],
): ShadowScoreComparisonResult => ({
  candidatePackageId,
  comparisonStatus: 'failed',
  metadataOnly: true,
  modelExecutionAllowed: false,
  inferenceEndpointExposed: false,
  businessMutationAllowed: false,
  candidateSummary: emptySummary,
  baselineSummary: null,
  deltaSummary: null,
  agreementSummary: null,
  baselineCoverageSummary: emptyCoverage('none'),
  safetyPolicy,
  warnings: [],
  errors,
  generatedAt: new Date().toISOString(),
});

const asBaselineSource = (value: unknown): ShadowScoreComparisonBaselineSource => {
  if (value === 'stored_metadata' || value === 'fixture_metadata' || value === 'none') return value;
  return 'none';
};

const resolveBaselineRecords = async (
  request: ShadowScoreComparisonRequest,
  options: ShadowScoreComparisonServiceOptions,
): Promise<{ records: ShadowScoreComparisonScoreRecord[]; warnings: string[]; errors: string[] }> => {
  const baselineSource = asBaselineSource(request.baselineSource ?? 'none');
  if (baselineSource === 'none') {
    return { records: [], warnings: ['baseline_source_not_requested'], errors: [] };
  }
  if (Array.isArray(options.baselineRecords)) {
    return { records: options.baselineRecords.filter((record) => record.metadataOnly === true), warnings: [], errors: [] };
  }
  if (baselineSource === 'fixture_metadata' && options.baselineFixturePayload) {
    const mapped = mapBaselineFixtureToComparisonRecords(options.baselineFixturePayload);
    return { records: mapped.records, warnings: mapped.warnings, errors: mapped.errors };
  }
  if (baselineSource === 'stored_metadata') {
    const storedBaselineRecords = await getBaselineScoreMetadataRecordsForComparison({
      baselineKey: request.baselineKey ?? undefined,
      predictionType: request.predictionType ?? undefined,
      horizonDays: request.horizonDays ?? undefined,
      entityType: request.entityType ?? undefined,
      limit: 1000,
    });
    return {
      records: mapStoredShadowScoreMetadataRecordsToComparisonRecords(storedBaselineRecords, 'baseline_stored_metadata'),
      warnings: storedBaselineRecords.length === 0 ? ['stored_baseline_metadata_not_available'] : [],
      errors: [],
    };
  }
  return { records: [], warnings: ['safe_baseline_metadata_not_available'], errors: [] };
};

export const compareShadowScoresFromStoredMetadata = async (
  request: ShadowScoreComparisonRequest,
  options: ShadowScoreComparisonServiceOptions = {},
): Promise<ShadowScoreComparisonResult> => {
  const candidatePackageId = typeof request.candidatePackageId === 'string' ? request.candidatePackageId.trim() : '';
  if (!candidatePackageId) return failureResult('', ['candidate_package_id_required']);

  const baselineSource = asBaselineSource(request.baselineSource ?? 'none');
  const storedCandidateRecords = await getShadowScoreMetadataRecordsByCandidatePackageId(candidatePackageId);
  const candidateRecords = filterShadowScoreComparisonRecords(
    mapStoredShadowScoreMetadataRecordsToComparisonRecords(storedCandidateRecords, 'candidate_stored_metadata'),
    request,
  );
  const candidateSummary = summarizeShadowScoreDistribution(candidateRecords);
  const generatedAt = new Date().toISOString();

  if (candidateRecords.length === 0) {
    return {
      candidatePackageId,
      comparisonStatus: 'empty_candidate',
      metadataOnly: true,
      modelExecutionAllowed: false,
      inferenceEndpointExposed: false,
      businessMutationAllowed: false,
      candidateSummary,
      baselineSummary: null,
      deltaSummary: null,
      agreementSummary: null,
      baselineCoverageSummary: emptyCoverage(baselineSource, 0),
      safetyPolicy,
      warnings: ['no_candidate_metadata_records_found'],
      errors: [],
      generatedAt,
    };
  }

  const baselineResolution = await resolveBaselineRecords(request, options);
  const baselineRecords = filterShadowScoreComparisonRecords(baselineResolution.records, request);

  if (baselineRecords.length === 0) {
    return {
      candidatePackageId,
      comparisonStatus: 'insufficient_baseline',
      metadataOnly: true,
      modelExecutionAllowed: false,
      inferenceEndpointExposed: false,
      businessMutationAllowed: false,
      candidateSummary,
      baselineSummary: null,
      deltaSummary: null,
      agreementSummary: null,
      baselineCoverageSummary: emptyCoverage(baselineSource, candidateRecords.length),
      safetyPolicy,
      warnings: [...baselineResolution.warnings, 'no_safe_baseline_metadata_records_available'],
      errors: baselineResolution.errors,
      generatedAt,
    };
  }

  const baselineSummary = summarizeShadowScoreDistribution(baselineRecords);
  const deltaSummary = computeShadowScoreDeltaSummary(candidateRecords, baselineRecords);
  const agreementSummary = computeShadowScoreAgreementSummary(candidateRecords, baselineRecords);
  const baselineCoverageSummary = makeCoverageSummary(
    baselineSource,
    candidateRecords.length,
    baselineRecords.length,
    deltaSummary.matchedEntityCount,
    deltaSummary.candidateOnlyCount,
    deltaSummary.baselineOnlyCount,
  );
  const comparisonStatus = baselineCoverageSummary.status === 'complete' ? 'ready' : 'partial';

  return {
    candidatePackageId,
    comparisonStatus,
    metadataOnly: true,
    modelExecutionAllowed: false,
    inferenceEndpointExposed: false,
    businessMutationAllowed: false,
    candidateSummary,
    baselineSummary,
    deltaSummary,
    agreementSummary,
    baselineCoverageSummary,
    safetyPolicy,
    warnings: comparisonStatus === 'partial'
      ? [...baselineResolution.warnings, 'candidate_and_baseline_entities_have_incomplete_overlap']
      : baselineResolution.warnings,
    errors: baselineResolution.errors,
    generatedAt,
  };
};
