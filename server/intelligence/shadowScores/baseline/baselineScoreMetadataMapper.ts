import type { ShadowScoreMetadataStorageRecordInput } from '../shadowScoreMetadataStorageTypes';
import type { BaselineScoreMetadataPayload, BaselineScoreMetadataValidationReport } from './baselineScoreMetadataTypes';

const asString = (value: unknown, fallback = ''): string => typeof value === 'string' && value.trim() ? value.trim() : fallback;
const asNullableString = (value: unknown): string | null => {
  const normalized = asString(value);
  return normalized ? normalized : null;
};
const asNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};
const asInteger = (value: unknown, fallback: number): number => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.trunc(numeric) : fallback;
};

export const mapBaselineScoreMetadataStorageRecords = (
  payload: BaselineScoreMetadataPayload,
  validation: BaselineScoreMetadataValidationReport,
  createdByUserId: number | null = null,
): ShadowScoreMetadataStorageRecordInput[] => {
  if (validation.status === 'fail' || !Array.isArray(payload.records)) return [];

  const fixtureId = asString(payload.fixtureId, `metadata-only-baseline:${asString(payload.baselineKey, 'unknown-baseline')}`);
  const baselineSource = asString(payload.baselineSource);
  const baselineKey = asString(payload.baselineKey);
  const baselineVersion = asNullableString(payload.baselineVersion);
  const baselineGeneratedAt = asNullableString(payload.baselineGeneratedAt) ?? asNullableString(payload.generatedAt);
  const payloadHorizonDays = asNullableNumber(payload.horizonDays);

  return payload.records.map((record, index) => {
    const scorePayload = {
      baselineRecordId: record.baselineRecordId ?? null,
      entityType: record.entityType ?? null,
      entityId: record.entityId ?? null,
      predictionType: record.predictionType ?? payload.predictionType ?? null,
      horizonDays: record.horizonDays ?? payload.horizonDays ?? null,
      baselineScore: record.baselineScore ?? record.score ?? null,
      baselineLabel: record.baselineLabel ?? record.label ?? null,
      baselineConfidence: record.baselineConfidence ?? record.confidence ?? null,
      sourceBaselineRecordHash: record.sourceBaselineRecordHash ?? null,
    };

    return {
      importFixtureId: fixtureId,
      candidatePackageId: asString(payload.candidatePackageId, `baseline:${baselineKey}`),
      scoreRole: 'baseline',
      baselineSource,
      baselineKey,
      baselineVersion,
      baselineGeneratedAt,
      baselinePayloadHash: asNullableString(payload.baselinePayloadHash) ?? validation.importPayloadHash,
      baselineValidationStatus: validation.status === 'warning' ? 'stored_baseline_metadata_only_with_warnings' : 'stored_baseline_metadata_only',
      baselinePayload: {
        fixtureId,
        baselineSource,
        baselineKey,
        baselineVersion,
        baselineGeneratedAt,
      },
      modelKey: asString(record.modelKey, asString(payload.modelKey)),
      modelVersion: asString(record.modelVersion, asString(payload.modelVersion)),
      predictionType: asString(record.predictionType, asString(payload.predictionType)),
      horizonDays: asNullableNumber(record.horizonDays) ?? payloadHorizonDays,
      entityType: asString(record.entityType),
      entityId: asString(record.entityId),
      sourceRowIndex: asInteger(record.sourceRowIndex, index),
      score: asNullableNumber(record.baselineScore ?? record.score),
      label: asNullableString(record.baselineLabel ?? record.label),
      confidence: asNullableNumber(record.baselineConfidence ?? record.confidence),
      scoreGeneratedAt: asNullableString(record.scoreGeneratedAt) ?? baselineGeneratedAt,
      scoreSource: 'metadata_only_baseline_score_storage',
      offlineExecutionReportHash: null,
      candidateScoreOutputHash: null,
      shadowScoreExportHash: asNullableString(record.sourceBaselineRecordHash),
      importPayloadHash: validation.importPayloadHash,
      metadataOnly: true,
      modelBinaryPresent: false,
      rawCsvPresent: false,
      inferenceDirectivePresent: false,
      activationDirectivePresent: false,
      businessMutationDirectivePresent: false,
      forbiddenFieldCount: validation.forbiddenFieldCount,
      validationStatus: validation.status === 'warning' ? 'stored_baseline_metadata_only_with_warnings' : 'stored_baseline_metadata_only',
      validationReport: validation,
      scorePayload,
      safetyPolicy: validation.safetyPolicy ?? payload.safetyPolicy ?? {},
      createdByUserId,
    };
  });
};
