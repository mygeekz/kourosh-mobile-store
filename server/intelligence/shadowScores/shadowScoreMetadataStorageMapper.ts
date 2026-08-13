import {
  type ShadowScoreMetadataFixturePayload,
  type ShadowScoreMetadataStorageRecordInput,
  type ShadowScoreMetadataStorageValidationReport,
} from './shadowScoreMetadataStorageTypes';

const asString = (value: unknown, fallback = ''): string => {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
};

const asNullableString = (value: unknown): string | null => {
  const normalized = asString(value);
  return normalized.length > 0 ? normalized : null;
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

export const mapShadowScoreMetadataStorageRecords = (
  payload: ShadowScoreMetadataFixturePayload,
  validation: ShadowScoreMetadataStorageValidationReport,
  createdByUserId: number | null = null,
): ShadowScoreMetadataStorageRecordInput[] => {
  if (validation.status === 'fail' || !Array.isArray(payload.records)) return [];

  const importFixtureId = asString(payload.fixtureId, `metadata-only-fixture:${asString(payload.candidatePackageId, 'unknown-package')}`);
  const payloadGeneratedAt = asNullableString(payload.generatedAt);
  const payloadHorizonDays = asNullableNumber(payload.horizonDays);

  return payload.records.map((record, index) => {
    const scorePayload = {
      importRecordId: record.importRecordId ?? null,
      shadowScoreId: record.shadowScoreId ?? null,
      entityType: record.entityType ?? null,
      entityId: record.entityId ?? null,
      predictionType: record.predictionType ?? payload.predictionType ?? null,
      horizonDays: record.horizonDays ?? payload.horizonDays ?? null,
      candidateScore: record.candidateScore ?? null,
      candidateLabel: record.candidateLabel ?? null,
      candidateConfidence: record.candidateConfidence ?? null,
      scoreQuality: record.scoreQuality ?? null,
      sourceExportRecordHash: record.sourceExportRecordHash ?? null,
    };

    return {
      importFixtureId,
      candidatePackageId: asString(record.candidatePackageId, asString(payload.candidatePackageId)),
      scoreRole: 'candidate',
      baselineSource: null,
      baselineKey: null,
      baselineVersion: null,
      baselineGeneratedAt: null,
      baselinePayloadHash: null,
      baselineValidationStatus: null,
      baselinePayload: {},
      modelKey: asString(record.modelKey, asString(payload.modelKey)),
      modelVersion: asString(record.modelVersion, asString(payload.modelVersion)),
      predictionType: asString(record.predictionType, asString(payload.predictionType)),
      horizonDays: asNullableNumber(record.horizonDays) ?? payloadHorizonDays,
      entityType: asString(record.entityType),
      entityId: asString(record.entityId),
      sourceRowIndex: asInteger(record.sourceRowIndex ?? record.sourceShadowRecordIndex, index),
      score: asNullableNumber(record.candidateScore),
      label: asNullableString(record.candidateLabel),
      confidence: asNullableNumber(record.candidateConfidence),
      scoreGeneratedAt: asNullableString(record.scoreGeneratedAt) ?? payloadGeneratedAt,
      scoreSource: asString(record.storageClass, asString(payload.fixtureKind, 'metadata_only_shadow_score_import_fixture')),
      offlineExecutionReportHash: asNullableString(payload.offlineExecutionReportHash),
      candidateScoreOutputHash: asNullableString(payload.candidateScoreOutputHash),
      shadowScoreExportHash: asNullableString(record.sourceExportRecordHash) ?? asNullableString(payload.shadowScoreExportHash),
      importPayloadHash: validation.importPayloadHash,
      metadataOnly: true,
      modelBinaryPresent: false,
      rawCsvPresent: false,
      inferenceDirectivePresent: false,
      activationDirectivePresent: false,
      businessMutationDirectivePresent: false,
      forbiddenFieldCount: validation.forbiddenFieldCount,
      validationStatus: validation.status === 'warning' ? 'stored_metadata_only_with_warnings' : 'stored_metadata_only',
      validationReport: validation,
      scorePayload,
      safetyPolicy: validation.safetyPolicy ?? payload.safetyPolicy ?? {},
      createdByUserId,
    };
  });
};
