import type { ShadowScoreImportApplyReceiptReadModelResult } from '../shadowScoreImportApplyReceiptReadModel.service';
import {
  createReceiptExportIntegrity,
  mapReceiptReadModelToExportSafetyAssertions,
  mapReceiptReadModelToExportSummary,
  mapStoredReceiptToExportReceipt,
} from './shadowScoreImportApplyReceiptExportContractMapper';
import { assertValidShadowScoreImportApplyReceiptExportContract } from './shadowScoreImportApplyReceiptExportContractValidator';
import type { ShadowScoreImportApplyReceiptExportContractEnvelope } from './shadowScoreImportApplyReceiptExportContractTypes';

export interface CreateShadowScoreImportApplyReceiptExportContractOptions {
  generatedAt?: string;
  warnings?: string[];
}

export const createShadowScoreImportApplyReceiptExportContract = (
  readModel: ShadowScoreImportApplyReceiptReadModelResult,
  options: CreateShadowScoreImportApplyReceiptExportContractOptions = {},
): ShadowScoreImportApplyReceiptExportContractEnvelope => {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const receipts = readModel.items.map(mapStoredReceiptToExportReceipt);
  const readModelForExport: ShadowScoreImportApplyReceiptExportContractEnvelope['readModel'] = {
    ...readModel,
    receipt: null,
    receipts,
    items: receipts,
  };
  const envelopeWithoutIntegrity: Omit<ShadowScoreImportApplyReceiptExportContractEnvelope, 'integrity'> = {
    exportKind: 'metadata_only_import_apply_receipt_export',
    contractVersion: 'shadow_score_import_apply_receipt_export_contract_v1',
    metadataOnly: true,
    readOnly: true,
    evidenceOnly: true,
    generatedAt,
    source: {
      sourcePhase: 'Phase 20B',
      exportPhase: 'Phase 21A',
      route: '/api/brain/ml-shadow-scores/metadata-only/import-apply-receipts/internal/read-model',
      generatedFromReadModelAt: readModel.generatedAt,
      filterSummary: readModel.filters,
      receiptCount: readModel.receiptCount,
      returnedCount: readModel.summary.returnedCount,
    },
    safetyAssertions: mapReceiptReadModelToExportSafetyAssertions(),
    summary: mapReceiptReadModelToExportSummary(readModel, receipts),
    receipts,
    readModel: readModelForExport,
    warnings: options.warnings ?? [],
    errors: [],
  };

  return assertValidShadowScoreImportApplyReceiptExportContract({
    ...envelopeWithoutIntegrity,
    integrity: createReceiptExportIntegrity(envelopeWithoutIntegrity),
  });
};
