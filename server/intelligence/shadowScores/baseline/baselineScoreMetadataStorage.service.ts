import { recordBaselineScoreMetadataBatch } from '../../../db/domains/ml/shadowScores';
import { mapBaselineScoreMetadataStorageRecords } from './baselineScoreMetadataMapper';
import { validateBaselineScoreMetadataPayload } from './baselineScoreMetadataValidator';
import type { BaselineScoreMetadataPayload, BaselineScoreMetadataStorageServiceResult } from './baselineScoreMetadataTypes';

export type BaselineScoreMetadataStorageServiceOptions = {
  createdByUserId?: number | null;
};

export const storeBaselineScoreMetadataFixture = async (
  payload: BaselineScoreMetadataPayload | unknown,
  options: BaselineScoreMetadataStorageServiceOptions = {},
): Promise<BaselineScoreMetadataStorageServiceResult> => {
  const validation = validateBaselineScoreMetadataPayload(payload);

  if (validation.status === 'fail') {
    return {
      phase: 'Phase 15A',
      storageKind: 'metadata_only_stored_baseline_score_source',
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
      runtimeInvocationAllowed: false,
      inferenceEndpointExposed: false,
      artifactActivationAllowed: false,
      canMutateBusinessRecords: false,
    };
  }

  const normalizedRecords = mapBaselineScoreMetadataStorageRecords(
    payload as BaselineScoreMetadataPayload,
    validation,
    options.createdByUserId ?? null,
  );
  const writeResult = await recordBaselineScoreMetadataBatch(normalizedRecords);

  return {
    phase: 'Phase 15A',
    storageKind: 'metadata_only_stored_baseline_score_source',
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
    runtimeInvocationAllowed: false,
    inferenceEndpointExposed: false,
    artifactActivationAllowed: false,
    canMutateBusinessRecords: false,
  };
};

export const validateBaselineScoreMetadataFixtureForStorage = validateBaselineScoreMetadataPayload;
