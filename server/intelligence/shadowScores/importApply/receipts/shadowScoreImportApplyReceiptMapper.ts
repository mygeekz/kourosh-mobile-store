import { randomUUID } from 'node:crypto';
import type { ShadowScoreImportApplyReceiptInput } from '../../../../db/domains/ml/shadowScores/importApplyReceipts';
import type { MetadataOnlyShadowScoreImportApplyReceiptMappingInput } from './shadowScoreImportApplyReceiptTypes';

const safePolicy = {
  metadataOnly: true,
  modelExecutionAllowed: false,
  runtimeInvocationAllowed: false,
  inferenceEndpointExposed: false,
  productionIntegrationAllowed: false,
  decisionAutomationAllowed: false,
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
  businessMutationAllowed: false,
} as const;

const nullableString = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
};

const getFirstRecordValue = (result: MetadataOnlyShadowScoreImportApplyReceiptMappingInput['result'], key: 'modelKey' | 'modelVersion' | 'predictionType'): string | null => {
  const first = result.records?.[0] as Record<string, unknown> | undefined;
  return nullableString(first?.[key]);
};

const sanitizeApplyResultForReceipt = (result: MetadataOnlyShadowScoreImportApplyReceiptMappingInput['result']): unknown => ({
  phase: result.phase,
  serviceKind: result.serviceKind,
  status: result.status,
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
  importPayloadHash: result.importPayloadHash,
  candidatePackageId: result.candidatePackageId,
  recordsReceived: result.recordsReceived,
  recordsInserted: result.recordsInserted,
  recordsSkippedDuplicate: result.recordsSkippedDuplicate,
  recordsRejected: result.recordsRejected,
  warningCount: result.warningCount,
  errorCount: result.errorCount,
  warnings: result.warnings,
  errors: result.errors,
  generatedAt: result.generatedAt,
});

export const mapShadowScoreImportApplyResultToReceiptRecord = ({
  result,
  options,
  createdAt,
}: MetadataOnlyShadowScoreImportApplyReceiptMappingInput): ShadowScoreImportApplyReceiptInput => ({
  receiptId: `ml-import-apply-receipt-${randomUUID()}`,
  importPayloadHash: result.importPayloadHash,
  candidatePackageId: result.candidatePackageId,
  modelKey: getFirstRecordValue(result, 'modelKey'),
  modelVersion: getFirstRecordValue(result, 'modelVersion'),
  predictionType: getFirstRecordValue(result, 'predictionType'),
  source: options.source,
  dryRun: options.dryRun === true,
  status: result.status,
  recordsReceived: result.recordsReceived,
  recordsInserted: result.recordsInserted,
  recordsSkippedDuplicate: result.recordsSkippedDuplicate,
  recordsRejected: result.recordsRejected,
  warningCount: result.warningCount,
  errorCount: result.errorCount,
  warnings: result.warnings,
  errors: result.errors,
  safetyPolicy: safePolicy,
  applyResult: sanitizeApplyResultForReceipt(result),
  metadataOnly: true,
  modelExecutionAllowed: false,
  inferenceEndpointExposed: false,
  artifactActivationAllowed: false,
  businessMutationAllowed: false,
  requestedByUserId: options.requestedByUserId ?? null,
  traceId: options.traceId ?? null,
  createdAt: createdAt ?? result.generatedAt,
});
