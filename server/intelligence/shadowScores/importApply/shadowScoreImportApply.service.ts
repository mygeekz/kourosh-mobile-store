import { recordShadowScoreMetadataBatch } from '../../../db/domains/ml/shadowScores';
import { mapMetadataOnlyShadowScoreImportApplyRecords } from './shadowScoreImportApplyMapper';
import {
  metadataOnlyShadowScoreImportApplyMessages,
  validateMetadataOnlyShadowScoreImportApplyPayload,
} from './shadowScoreImportApplyValidator';
import type {
  MetadataOnlyShadowScoreImportApplyOptions,
  MetadataOnlyShadowScoreImportApplyResult,
} from './shadowScoreImportApplyTypes';
import { persistShadowScoreImportApplyReceipt } from './receipts/shadowScoreImportApplyReceipt.service';

const safetyResultBase = {
  metadataOnly: true,
  modelExecutionAllowed: false,
  runtimeInvocationAllowed: false,
  inferenceEndpointExposed: false,
  productionIntegrationAllowed: false,
  decisionAutomationAllowed: false,
  artifactActivationAllowed: false,
  businessMutationAllowed: false,
  canChangeInventoryOrAccounting: false,
  canChangePricing: false,
  canChangeReports: false,
  canChangeLedger: false,
  canMutateBusinessRecords: false,
} as const;

const summarize = (
  result: Omit<MetadataOnlyShadowScoreImportApplyResult, keyof typeof safetyResultBase>,
): MetadataOnlyShadowScoreImportApplyResult => ({
  ...result,
  ...safetyResultBase,
});

const withReceipt = async (
  result: MetadataOnlyShadowScoreImportApplyResult,
  options: MetadataOnlyShadowScoreImportApplyOptions,
): Promise<MetadataOnlyShadowScoreImportApplyResult> => ({
  ...result,
  receipt: await persistShadowScoreImportApplyReceipt(result, options),
});

export const applyMetadataOnlyShadowScoreImport = async (
  payload: unknown,
  options: MetadataOnlyShadowScoreImportApplyOptions,
): Promise<MetadataOnlyShadowScoreImportApplyResult> => {
  const generatedAt = new Date().toISOString();
  const validation = validateMetadataOnlyShadowScoreImportApplyPayload(payload);
  const warnings = metadataOnlyShadowScoreImportApplyMessages(validation.warnings);
  const errors = metadataOnlyShadowScoreImportApplyMessages(validation.errors);

  if (validation.status === 'fail') {
    return withReceipt(summarize({
      phase: 'Phase 18A',
      serviceKind: 'metadata_only_shadow_score_import_apply_service',
      status: 'rejected',
      importPayloadHash: validation.importPayloadHash,
      candidatePackageId: validation.candidatePackageId,
      recordsReceived: validation.recordCount,
      recordsInserted: 0,
      recordsSkippedDuplicate: 0,
      recordsRejected: validation.recordCount,
      warningCount: validation.warningCount,
      errorCount: validation.errorCount,
      warnings,
      errors,
      validation,
      records: [],
      generatedAt,
    }), options);
  }

  const mapped = mapMetadataOnlyShadowScoreImportApplyRecords(payload, validation, options.requestedByUserId ?? null);

  if (options.dryRun === true) {
    return withReceipt(summarize({
      phase: 'Phase 18A',
      serviceKind: 'metadata_only_shadow_score_import_apply_service',
      status: 'dry_run',
      importPayloadHash: validation.importPayloadHash,
      candidatePackageId: validation.candidatePackageId,
      recordsReceived: validation.recordCount,
      recordsInserted: 0,
      recordsSkippedDuplicate: 0,
      recordsRejected: 0,
      warningCount: validation.warningCount,
      errorCount: validation.errorCount,
      warnings,
      errors,
      validation,
      records: [],
      generatedAt,
    }), options);
  }

  const writeResult = await recordShadowScoreMetadataBatch(mapped.allRecords);
  const status = writeResult.rejectedCount > 0
    ? (writeResult.insertedCount > 0 || writeResult.duplicateCount > 0 ? 'partial' : 'rejected')
    : 'applied';

  return withReceipt(summarize({
    phase: 'Phase 18A',
    serviceKind: 'metadata_only_shadow_score_import_apply_service',
    status,
    importPayloadHash: validation.importPayloadHash,
    candidatePackageId: validation.candidatePackageId,
    recordsReceived: validation.recordCount,
    recordsInserted: writeResult.insertedCount,
    recordsSkippedDuplicate: writeResult.duplicateCount,
    recordsRejected: writeResult.rejectedCount,
    warningCount: validation.warningCount,
    errorCount: validation.errorCount,
    warnings,
    errors,
    validation,
    records: writeResult.records,
    generatedAt,
  }), options);
};
