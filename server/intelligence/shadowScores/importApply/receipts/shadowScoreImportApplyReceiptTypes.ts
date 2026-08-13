import type {
  MetadataOnlyShadowScoreImportApplyOptions,
  MetadataOnlyShadowScoreImportApplyReceiptMetadata,
  MetadataOnlyShadowScoreImportApplyResult,
} from '../shadowScoreImportApplyTypes';
import type { ShadowScoreImportApplyReceiptInput, StoredShadowScoreImportApplyReceipt } from '../../../../db/domains/ml/shadowScores/importApplyReceipts';

export type MetadataOnlyShadowScoreImportApplyReceiptRecord = ShadowScoreImportApplyReceiptInput;
export type StoredMetadataOnlyShadowScoreImportApplyReceipt = StoredShadowScoreImportApplyReceipt;
export type MetadataOnlyShadowScoreImportApplyReceiptSummary = MetadataOnlyShadowScoreImportApplyReceiptMetadata;

export type MetadataOnlyShadowScoreImportApplyReceiptMappingInput = {
  result: MetadataOnlyShadowScoreImportApplyResult;
  options: MetadataOnlyShadowScoreImportApplyOptions;
  createdAt?: string;
};
