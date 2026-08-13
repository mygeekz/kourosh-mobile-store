import type { StoredShadowScoreImportApplyReceipt, ShadowScoreImportApplyReceiptSummary } from '../../../../../db/domains/ml/shadowScores/importApplyReceipts';
import type { ShadowScoreImportApplyReceiptReadModelResult } from '../shadowScoreImportApplyReceiptReadModel.service';

export type ShadowScoreImportApplyReceiptExportContractVersion = 'shadow_score_import_apply_receipt_export_contract_v1';

export type ShadowScoreImportApplyReceiptExportKind = 'metadata_only_import_apply_receipt_export';

export type ShadowScoreImportApplyReceiptExportValidationStatus = 'valid' | 'invalid';

export interface ShadowScoreImportApplyReceiptExportSourceDescriptor {
  sourcePhase: 'Phase 20B';
  exportPhase: 'Phase 21A';
  route: '/api/brain/ml-shadow-scores/metadata-only/import-apply-receipts/internal/read-model';
  generatedFromReadModelAt: string;
  filterSummary: Record<string, unknown>;
  receiptCount: number;
  returnedCount: number;
}

export interface ShadowScoreImportApplyReceiptExportSafetyAssertions {
  metadataOnly: true;
  readOnly: true;
  evidenceOnly: true;
  modelExecutionAllowed: false;
  runtimeInvocationAllowed: false;
  inferenceEndpointExposed: false;
  productionIntegrationAllowed: false;
  decisionAutomationAllowed: false;
  canChangeInventoryOrAccounting: false;
  canChangePricing: false;
  canChangeReports: false;
  canChangeLedger: false;
  canMutateBusinessRecords: false;
  artifactExecutionAllowed: false;
  artifactActivationAllowed: false;
  artifactBytesLoadingAllowed: false;
  rawTrainingCsvLoadingAllowed: false;
  automaticDeletionAllowed: false;
  purgeJobAllowed: false;
  containsModelBinary: false;
  containsRawCsv: false;
  containsFilesystemPath: false;
  containsInferenceDirective: false;
  containsActivationDirective: false;
  containsBusinessMutationDirective: false;
  containsProductionDecision: false;
}

export interface ShadowScoreImportApplyReceiptExportSummary extends ShadowScoreImportApplyReceiptSummary {
  exportedReceiptCount: number;
  returnedCount: number;
  requestedDryRunFilter: boolean | null;
  requestedStatusFilter: string | null;
  requestedSourceFilter: string | null;
  requestedCandidatePackageId: string | null;
  requestedImportPayloadHash: string | null;
}

export type ShadowScoreImportApplyReceiptExportReceipt = Pick<
  StoredShadowScoreImportApplyReceipt,
  | 'id'
  | 'receiptId'
  | 'importPayloadHash'
  | 'candidatePackageId'
  | 'modelKey'
  | 'modelVersion'
  | 'predictionType'
  | 'source'
  | 'dryRun'
  | 'status'
  | 'recordsReceived'
  | 'recordsInserted'
  | 'recordsSkippedDuplicate'
  | 'recordsRejected'
  | 'warningCount'
  | 'errorCount'
  | 'warnings'
  | 'errors'
  | 'safetyPolicy'
  | 'metadataOnly'
  | 'modelExecutionAllowed'
  | 'inferenceEndpointExposed'
  | 'artifactActivationAllowed'
  | 'businessMutationAllowed'
  | 'requestedByUserId'
  | 'traceId'
  | 'createdAt'
>;

export interface ShadowScoreImportApplyReceiptExportIntegrity {
  canonicalPayloadHash: string;
  readModelHash: string;
  receiptSetHash: string;
  contractVersion: ShadowScoreImportApplyReceiptExportContractVersion;
  hashAlgorithm: 'stable-json-fnv1a64';
}

export interface ShadowScoreImportApplyReceiptExportContractEnvelope {
  exportKind: ShadowScoreImportApplyReceiptExportKind;
  contractVersion: ShadowScoreImportApplyReceiptExportContractVersion;
  metadataOnly: true;
  readOnly: true;
  evidenceOnly: true;
  generatedAt: string;
  source: ShadowScoreImportApplyReceiptExportSourceDescriptor;
  safetyAssertions: ShadowScoreImportApplyReceiptExportSafetyAssertions;
  summary: ShadowScoreImportApplyReceiptExportSummary;
  receipts: ShadowScoreImportApplyReceiptExportReceipt[];
  readModel: Omit<ShadowScoreImportApplyReceiptReadModelResult, 'receipts' | 'items' | 'receipt'> & {
    receipt: null;
    receipts: ShadowScoreImportApplyReceiptExportReceipt[];
    items: ShadowScoreImportApplyReceiptExportReceipt[];
  };
  integrity: ShadowScoreImportApplyReceiptExportIntegrity;
  warnings: string[];
  errors: string[];
}

export interface ShadowScoreImportApplyReceiptExportContractValidationResult {
  validationStatus: ShadowScoreImportApplyReceiptExportValidationStatus;
  metadataOnly: boolean;
  readOnly: boolean;
  evidenceOnly: boolean;
  errors: string[];
  warnings: string[];
}
