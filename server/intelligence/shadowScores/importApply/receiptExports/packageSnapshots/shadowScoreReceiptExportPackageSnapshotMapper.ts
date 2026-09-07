import crypto from 'node:crypto';
import type { MetadataOnlyReceiptExportPackage } from '../packageBuilder/shadowScoreReceiptExportPackageTypes';
import type { ShadowScoreImportApplyReceiptExportPackageSnapshotInput } from '../../../../../db/domains/ml/shadowScores/importApplyReceiptExportPackageSnapshots';
import type { MetadataOnlyReceiptExportPackageSnapshotRecord } from './shadowScoreReceiptExportPackageSnapshotTypes';
import { METADATA_ONLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_VERSION } from './shadowScoreReceiptExportPackageSnapshotTypes';

const nullableString = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
};

const buildSnapshotId = (): string => `receipt-export-package-snapshot-${crypto.randomUUID()}`;

export const mapMetadataOnlyReceiptExportPackageToSnapshotRecord = (
  packageDocument: MetadataOnlyReceiptExportPackage,
  options: { snapshotId?: string; createdAt?: string } = {},
): MetadataOnlyReceiptExportPackageSnapshotRecord => {
  const packageSafety = packageDocument.safety;
  const safety = {
    metadataOnly: packageSafety.metadataOnly,
    modelExecutionAllowed: packageSafety.modelExecutionAllowed,
    inferenceEndpointExposed: packageSafety.inferenceEndpointExposed,
    artifactActivationAllowed: packageSafety.artifactActivationAllowed,
    businessMutationAllowed: packageSafety.businessMutationAllowed,
    containsModelBytes: packageSafety.containsModelBytes,
    containsRawCsv: packageSafety.containsRawCsv,
    containsFilesystemPaths: packageSafety.containsFilesystemPaths,
    canChangeInventoryOrAccounting: packageSafety.canChangeInventoryOrAccounting,
  } as const;

  return {
    snapshotId: nullableString(options.snapshotId) ?? buildSnapshotId(),
    snapshotVersion: METADATA_ONLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_VERSION,
    packageId: packageDocument.packageId,
    packageType: packageDocument.packageType,
    packageVersion: packageDocument.packageVersion,
    contentHash: packageDocument.checksums.contentHash,
    receiptHash: packageDocument.checksums.receiptHash,
    receiptCount: packageDocument.summary.receiptCount,
    statusCounts: packageDocument.summary.statusCounts,
    sourceCounts: packageDocument.summary.sourceCounts,
    dryRunCount: packageDocument.summary.dryRunCount,
    appliedCount: packageDocument.summary.appliedCount,
    rejectedCount: packageDocument.summary.rejectedCount,
    totalRecordsReceived: packageDocument.summary.totalRecordsReceived,
    totalRecordsInserted: packageDocument.summary.totalRecordsInserted,
    totalRecordsSkippedDuplicate: packageDocument.summary.totalRecordsSkippedDuplicate,
    totalRecordsRejected: packageDocument.summary.totalRecordsRejected,
    warningCount: packageDocument.summary.warningCount,
    errorCount: packageDocument.summary.errorCount,
    filters: packageDocument.filters,
    page: packageDocument.page,
    summary: packageDocument.summary,
    safety,
    packagePayload: packageDocument,
    metadataOnly: true,
    modelExecutionAllowed: false,
    inferenceEndpointExposed: false,
    artifactActivationAllowed: false,
    businessMutationAllowed: false,
    containsModelBytes: false,
    containsRawCsv: false,
    containsFilesystemPaths: false,
    generatedByUserId: packageDocument.generatedByUserId,
    traceId: packageDocument.traceId,
    generatedAt: packageDocument.generatedAt,
    createdAt: options.createdAt ?? new Date().toISOString(),
  };
};

export const mapSnapshotRecordToRepositoryInput = (
  snapshot: MetadataOnlyReceiptExportPackageSnapshotRecord,
): ShadowScoreImportApplyReceiptExportPackageSnapshotInput => ({
  snapshotId: snapshot.snapshotId,
  packageId: snapshot.packageId,
  packageType: snapshot.packageType,
  packageVersion: snapshot.packageVersion,
  contentHash: snapshot.contentHash,
  receiptHash: snapshot.receiptHash,
  receiptCount: snapshot.receiptCount,
  statusCounts: snapshot.statusCounts,
  sourceCounts: snapshot.sourceCounts,
  dryRunCount: snapshot.dryRunCount,
  appliedCount: snapshot.appliedCount,
  rejectedCount: snapshot.rejectedCount,
  totalRecordsReceived: snapshot.totalRecordsReceived,
  totalRecordsInserted: snapshot.totalRecordsInserted,
  totalRecordsSkippedDuplicate: snapshot.totalRecordsSkippedDuplicate,
  totalRecordsRejected: snapshot.totalRecordsRejected,
  warningCount: snapshot.warningCount,
  errorCount: snapshot.errorCount,
  filters: snapshot.filters,
  page: snapshot.page,
  summary: snapshot.summary,
  safety: snapshot.safety,
  packagePayload: snapshot.packagePayload,
  metadataOnly: true,
  modelExecutionAllowed: false,
  inferenceEndpointExposed: false,
  artifactActivationAllowed: false,
  businessMutationAllowed: false,
  containsModelBytes: false,
  containsRawCsv: false,
  containsFilesystemPaths: false,
  generatedByUserId: snapshot.generatedByUserId,
  traceId: snapshot.traceId,
  generatedAt: snapshot.generatedAt,
  createdAt: snapshot.createdAt,
});
