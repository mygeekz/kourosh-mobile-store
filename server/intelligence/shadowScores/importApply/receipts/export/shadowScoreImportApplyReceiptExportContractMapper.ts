import type { StoredShadowScoreImportApplyReceipt } from '../../../../../db/domains/ml/shadowScores/importApplyReceipts';
import type { ShadowScoreImportApplyReceiptReadModelResult } from '../shadowScoreImportApplyReceiptReadModel.service';
import type {
  ShadowScoreImportApplyReceiptExportContractEnvelope,
  ShadowScoreImportApplyReceiptExportIntegrity,
  ShadowScoreImportApplyReceiptExportReceipt,
  ShadowScoreImportApplyReceiptExportSafetyAssertions,
  ShadowScoreImportApplyReceiptExportSummary,
} from './shadowScoreImportApplyReceiptExportContractTypes';

export const stableJsonStringify = (value: unknown): string => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableJsonStringify(item)).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJsonStringify(record[key])}`)
    .join(',')}}`;
};

export const stableFnv1a64Hash = (value: unknown): string => {
  const input = stableJsonStringify(value);
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= BigInt(input.charCodeAt(index));
    hash = BigInt.asUintN(64, hash * prime);
  }
  return `fnv1a64:${hash.toString(16).padStart(16, '0')}`;
};

export const mapReceiptReadModelToExportSafetyAssertions = (): ShadowScoreImportApplyReceiptExportSafetyAssertions => ({
  metadataOnly: true,
  readOnly: true,
  evidenceOnly: true,
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
  containsModelBinary: false,
  containsRawCsv: false,
  containsFilesystemPath: false,
  containsInferenceDirective: false,
  containsActivationDirective: false,
  containsBusinessMutationDirective: false,
  containsProductionDecision: false,
});

const toSafeJson = (value: unknown): unknown => value ?? null;

export const mapStoredReceiptToExportReceipt = (
  receipt: StoredShadowScoreImportApplyReceipt,
): ShadowScoreImportApplyReceiptExportReceipt => ({
  id: receipt.id,
  receiptId: receipt.receiptId,
  importPayloadHash: receipt.importPayloadHash,
  candidatePackageId: receipt.candidatePackageId,
  modelKey: receipt.modelKey,
  modelVersion: receipt.modelVersion,
  predictionType: receipt.predictionType,
  source: receipt.source,
  dryRun: receipt.dryRun,
  status: receipt.status,
  recordsReceived: receipt.recordsReceived,
  recordsInserted: receipt.recordsInserted,
  recordsSkippedDuplicate: receipt.recordsSkippedDuplicate,
  recordsRejected: receipt.recordsRejected,
  warningCount: receipt.warningCount,
  errorCount: receipt.errorCount,
  warnings: toSafeJson(receipt.warnings),
  errors: toSafeJson(receipt.errors),
  safetyPolicy: toSafeJson(receipt.safetyPolicy),
  metadataOnly: true,
  modelExecutionAllowed: false,
  inferenceEndpointExposed: false,
  artifactActivationAllowed: false,
  businessMutationAllowed: false,
  requestedByUserId: receipt.requestedByUserId,
  traceId: receipt.traceId,
  createdAt: receipt.createdAt,
});

export const mapReceiptReadModelToExportSummary = (
  readModel: ShadowScoreImportApplyReceiptReadModelResult,
  receipts: ShadowScoreImportApplyReceiptExportReceipt[],
): ShadowScoreImportApplyReceiptExportSummary => ({
  ...readModel.summary,
  exportedReceiptCount: receipts.length,
  returnedCount: receipts.length,
  requestedDryRunFilter: readModel.filters.dryRun,
  requestedStatusFilter: readModel.filters.status,
  requestedSourceFilter: readModel.filters.source,
  requestedCandidatePackageId: readModel.filters.candidatePackageId,
  requestedImportPayloadHash: readModel.filters.importPayloadHash,
});

export const createReceiptExportIntegrity = (
  envelopeWithoutIntegrity: Omit<ShadowScoreImportApplyReceiptExportContractEnvelope, 'integrity'>,
): ShadowScoreImportApplyReceiptExportIntegrity => ({
  canonicalPayloadHash: stableFnv1a64Hash(envelopeWithoutIntegrity),
  readModelHash: stableFnv1a64Hash(envelopeWithoutIntegrity.readModel),
  receiptSetHash: stableFnv1a64Hash(envelopeWithoutIntegrity.receipts),
  contractVersion: 'shadow_score_import_apply_receipt_export_contract_v1',
  hashAlgorithm: 'stable-json-fnv1a64',
});
