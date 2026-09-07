import { recordShadowScoreImportApplyReceipt } from '../../../../db/domains/ml/shadowScores/importApplyReceipts';
import type { MetadataOnlyShadowScoreImportApplyOptions, MetadataOnlyShadowScoreImportApplyResult } from '../shadowScoreImportApplyTypes';
import { mapShadowScoreImportApplyResultToReceiptRecord } from './shadowScoreImportApplyReceiptMapper';

export const persistShadowScoreImportApplyReceipt = async (
  result: MetadataOnlyShadowScoreImportApplyResult,
  options: MetadataOnlyShadowScoreImportApplyOptions,
): Promise<NonNullable<MetadataOnlyShadowScoreImportApplyResult['receipt']>> => {
  const receiptRecord = mapShadowScoreImportApplyResultToReceiptRecord({ result, options, createdAt: result.generatedAt });
  const stored = await recordShadowScoreImportApplyReceipt(receiptRecord);
  return {
    receiptId: stored.receiptId,
    recorded: true,
    metadataOnly: true,
    createdAt: stored.createdAt,
  };
};
