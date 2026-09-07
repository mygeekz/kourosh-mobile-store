import type { StoredShadowScoreMetadataRecord } from '../shadowScoreMetadataStorageTypes';
import type {
  ShadowScoreBaselineFixtureMappingResult,
  ShadowScoreComparisonRequest,
  ShadowScoreComparisonScoreRecord,
} from './shadowScoreComparisonTypes';

const asRecord = (value: unknown): Record<string, unknown> | null => {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
};

const asString = (value: unknown): string | null => {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
};

const asNumber = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value;
};

const asInteger = (value: unknown): number | null => {
  const numeric = asNumber(value);
  return numeric === null ? null : Math.trunc(numeric);
};

const isExplicitlyUnsafe = (record: Record<string, unknown>): boolean => {
  return [
    'modelExecutionAllowed',
    'runtimeInvocationAllowed',
    'inferenceEndpointExposed',
    'productionIntegrationAllowed',
    'decisionAutomationAllowed',
    'businessMutationAllowed',
    'canChangeInventoryOrAccounting',
    'canChangePricing',
    'canChangeReports',
    'canChangeLedger',
    'canMutateBusinessRecords',
    'artifactExecutionAllowed',
    'artifactActivationAllowed',
    'artifactBytesLoadingAllowed',
    'rawTrainingCsvLoadingAllowed',
    'automaticDeletionAllowed',
    'purgeJobAllowed',
    'modelBinaryPresent',
    'rawCsvPresent',
    'inferenceDirectivePresent',
    'activationDirectivePresent',
    'businessMutationDirectivePresent',
  ].some((key) => record[key] === true);
};

export const mapStoredShadowScoreMetadataRecordToComparisonRecord = (
  record: StoredShadowScoreMetadataRecord,
  source: 'candidate_stored_metadata' | 'baseline_stored_metadata' = 'candidate_stored_metadata',
): ShadowScoreComparisonScoreRecord => ({
  source,
  candidatePackageId: record.candidatePackageId,
  modelKey: record.modelKey,
  modelVersion: record.modelVersion,
  predictionType: record.predictionType,
  horizonDays: record.horizonDays,
  entityType: record.entityType,
  entityId: record.entityId,
  sourceRowIndex: record.sourceRowIndex,
  score: record.score,
  label: record.label,
  confidence: record.confidence,
  metadataOnly: true,
  storedRecord: record,
});

export const mapStoredShadowScoreMetadataRecordsToComparisonRecords = (
  records: StoredShadowScoreMetadataRecord[],
  source: 'candidate_stored_metadata' | 'baseline_stored_metadata' = 'candidate_stored_metadata',
): ShadowScoreComparisonScoreRecord[] => records
  .filter((record) => record.metadataOnly === true)
  .filter((record) => record.modelBinaryPresent === false)
  .filter((record) => record.rawCsvPresent === false)
  .filter((record) => record.inferenceDirectivePresent === false)
  .filter((record) => record.activationDirectivePresent === false)
  .filter((record) => record.businessMutationDirectivePresent === false)
  .map((record) => mapStoredShadowScoreMetadataRecordToComparisonRecord(record, source));

export const filterShadowScoreComparisonRecords = (
  records: ShadowScoreComparisonScoreRecord[],
  request: Pick<ShadowScoreComparisonRequest, 'predictionType' | 'horizonDays' | 'entityType'>,
): ShadowScoreComparisonScoreRecord[] => records.filter((record) => {
  if (request.predictionType && record.predictionType !== request.predictionType) return false;
  if (request.horizonDays !== undefined && request.horizonDays !== null && record.horizonDays !== request.horizonDays) return false;
  if (request.entityType && record.entityType !== request.entityType) return false;
  return true;
});

export const mapBaselineFixtureToComparisonRecords = (payload: unknown): ShadowScoreBaselineFixtureMappingResult => {
  const fixture = asRecord(payload);
  const warnings: string[] = [];
  const errors: string[] = [];
  if (!fixture) {
    return { metadataOnly: false, records: [], warnings, errors: ['baseline_fixture_payload_must_be_object'] };
  }

  if (fixture.evidenceOnly !== true) errors.push('baseline_fixture_must_be_evidence_only');
  if (fixture.metadataOnly === false) errors.push('baseline_fixture_must_be_metadata_only');
  if (isExplicitlyUnsafe(fixture)) errors.push('baseline_fixture_safety_flag_enabled');
  const safetyPolicy = asRecord(fixture.safetyPolicy);
  if (safetyPolicy && isExplicitlyUnsafe(safetyPolicy)) errors.push('baseline_fixture_safety_policy_enabled');

  const rows = Array.isArray(fixture.records) ? fixture.records : [];
  if (rows.length === 0) warnings.push('baseline_fixture_has_no_records');

  const records = rows.flatMap((row, index): ShadowScoreComparisonScoreRecord[] => {
    const baseline = asRecord(row);
    if (!baseline) {
      warnings.push(`baseline_record_${index}_must_be_object`);
      return [];
    }
    if (isExplicitlyUnsafe(baseline)) {
      errors.push(`baseline_record_${index}_safety_flag_enabled`);
      return [];
    }
    const entityType = asString(baseline.entityType);
    const entityId = asString(baseline.entityId);
    if (!entityType || !entityId) {
      warnings.push(`baseline_record_${index}_missing_entity_identity`);
      return [];
    }

    return [{
      source: 'baseline_fixture_metadata',
      baselinePackageId: asString(fixture.baselinePackageId) ?? asString(fixture.fixtureId),
      modelKey: asString(baseline.modelKey) ?? asString(fixture.modelKey),
      modelVersion: asString(baseline.modelVersion) ?? asString(fixture.modelVersion),
      predictionType: asString(baseline.predictionType) ?? asString(fixture.predictionType),
      horizonDays: asInteger(baseline.horizonDays) ?? asInteger(fixture.horizonDays),
      entityType,
      entityId,
      sourceRowIndex: asInteger(baseline.sourceRowIndex) ?? index,
      score: asNumber(baseline.baselineScore) ?? asNumber(baseline.score) ?? asNumber(baseline.candidateScore),
      label: asString(baseline.baselineLabel) ?? asString(baseline.label) ?? asString(baseline.candidateLabel),
      confidence: asNumber(baseline.baselineConfidence) ?? asNumber(baseline.confidence) ?? asNumber(baseline.candidateConfidence),
      metadataOnly: true,
    }];
  });

  return {
    metadataOnly: errors.length === 0,
    records: errors.length === 0 ? records : [],
    warnings,
    errors,
  };
};
