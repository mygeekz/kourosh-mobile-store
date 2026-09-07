import { recordShadowScoreMetadataBatch } from '../../db/domains/ml/shadowScores';
import { mapShadowScoreMetadataStorageRecords } from './shadowScoreMetadataStorageMapper';
import { validateShadowScoreMetadataStoragePayload } from './shadowScoreMetadataStorageValidator';
import {
  type ShadowScoreMetadataFixturePayload,
  type ShadowScoreMetadataStorageServiceResult,
} from './shadowScoreMetadataStorageTypes';

export type ShadowScoreMetadataStorageServiceOptions = {
  createdByUserId?: number | null;
};

export const storeShadowScoreMetadataFixture = async (
  payload: ShadowScoreMetadataFixturePayload | unknown,
  options: ShadowScoreMetadataStorageServiceOptions = {},
): Promise<ShadowScoreMetadataStorageServiceResult> => {
  const validation = validateShadowScoreMetadataStoragePayload(payload);

  if (validation.status === 'fail') {
    return {
      phase: 'Phase 14A',
      storageKind: 'metadata_only_shadow_score_storage_apply',
      status: 'fail',
      validation,
      requestedRecordCount: validation.recordCount,
      normalizedRecordCount: 0,
      insertedCount: 0,
      duplicateCount: 0,
      rejectedCount: validation.recordCount,
      records: [],
      safetyPolicy: validation.safetyPolicy,
      modelExecutionAllowed: false,
      inferenceEndpointExposed: false,
      artifactActivationAllowed: false,
      canMutateBusinessRecords: false,
    };
  }

  const normalizedRecords = mapShadowScoreMetadataStorageRecords(
    payload as ShadowScoreMetadataFixturePayload,
    validation,
    options.createdByUserId ?? null,
  );
  const writeResult = await recordShadowScoreMetadataBatch(normalizedRecords);

  return {
    phase: 'Phase 14A',
    storageKind: 'metadata_only_shadow_score_storage_apply',
    status: writeResult.status === 'fail' ? 'fail' : validation.status,
    validation,
    requestedRecordCount: validation.recordCount,
    normalizedRecordCount: normalizedRecords.length,
    insertedCount: writeResult.insertedCount,
    duplicateCount: writeResult.duplicateCount,
    rejectedCount: writeResult.rejectedCount,
    records: writeResult.records,
    safetyPolicy: validation.safetyPolicy,
    modelExecutionAllowed: false,
    inferenceEndpointExposed: false,
    artifactActivationAllowed: false,
    canMutateBusinessRecords: false,
  };
};

export const validateShadowScoreMetadataFixtureForStorage = validateShadowScoreMetadataStoragePayload;
