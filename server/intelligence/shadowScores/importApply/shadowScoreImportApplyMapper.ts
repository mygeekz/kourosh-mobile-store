import { mapShadowScoreMetadataStorageRecords } from '../shadowScoreMetadataStorageMapper';
import { mapBaselineScoreMetadataStorageRecords } from '../baseline/baselineScoreMetadataMapper';
import type { ShadowScoreMetadataFixturePayload } from '../shadowScoreMetadataStorageTypes';
import type { BaselineScoreMetadataPayload } from '../baseline/baselineScoreMetadataTypes';
import type {
  MetadataOnlyShadowScoreImportApplyMappedRecords,
  MetadataOnlyShadowScoreImportApplyValidationReport,
} from './shadowScoreImportApplyTypes';
import { getMetadataOnlyShadowScoreImportApplyBaselinePayload } from './shadowScoreImportApplyValidator';

const toCreatedByUserId = (value: string | number | null | undefined): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? Math.trunc(numeric) : null;
};

export const mapMetadataOnlyShadowScoreImportApplyRecords = (
  payload: ShadowScoreMetadataFixturePayload | unknown,
  validation: MetadataOnlyShadowScoreImportApplyValidationReport,
  requestedByUserId?: string | number | null,
): MetadataOnlyShadowScoreImportApplyMappedRecords => {
  if (validation.status === 'fail') {
    return { candidateRecords: [], baselineRecords: [], allRecords: [] };
  }

  const createdByUserId = toCreatedByUserId(requestedByUserId);
  const candidateRecords = mapShadowScoreMetadataStorageRecords(
    payload as ShadowScoreMetadataFixturePayload,
    validation.storageValidation,
    createdByUserId,
  );

  const baselinePayload = getMetadataOnlyShadowScoreImportApplyBaselinePayload(payload) as BaselineScoreMetadataPayload | null;
  const baselineRecords = baselinePayload && validation.baselineValidation
    ? mapBaselineScoreMetadataStorageRecords(baselinePayload, validation.baselineValidation, createdByUserId)
    : [];

  return {
    candidateRecords,
    baselineRecords,
    allRecords: [...candidateRecords, ...baselineRecords],
  };
};
