import type { MetadataOnlyReceiptExportPackage } from '../packageBuilder/shadowScoreReceiptExportPackageTypes';
import type { StoredShadowScoreImportApplyReceiptExportPackageSnapshot } from '../../../../../db/domains/ml/shadowScores/importApplyReceiptExportPackageSnapshots';

export const METADATA_ONLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_VERSION = 'v1' as const;

export type MetadataOnlyReceiptExportPackageSnapshotSafety = {
  metadataOnly: true;
  modelExecutionAllowed: false;
  inferenceEndpointExposed: false;
  artifactActivationAllowed: false;
  businessMutationAllowed: false;
  containsModelBytes: false;
  containsRawCsv: false;
  containsFilesystemPaths: false;
  canChangeInventoryOrAccounting: false;
};

export type MetadataOnlyReceiptExportPackageSnapshotRecord = {
  snapshotId: string;
  snapshotVersion: typeof METADATA_ONLY_RECEIPT_EXPORT_PACKAGE_SNAPSHOT_VERSION;
  packageId: string;
  packageType: MetadataOnlyReceiptExportPackage['packageType'];
  packageVersion: MetadataOnlyReceiptExportPackage['packageVersion'];
  contentHash: string;
  receiptHash: string;
  receiptCount: number;
  statusCounts: Record<string, number>;
  sourceCounts: Record<string, number>;
  dryRunCount: number;
  appliedCount: number;
  rejectedCount: number;
  totalRecordsReceived: number;
  totalRecordsInserted: number;
  totalRecordsSkippedDuplicate: number;
  totalRecordsRejected: number;
  warningCount: number;
  errorCount: number;
  filters: MetadataOnlyReceiptExportPackage['filters'];
  page: MetadataOnlyReceiptExportPackage['page'];
  summary: MetadataOnlyReceiptExportPackage['summary'];
  safety: MetadataOnlyReceiptExportPackageSnapshotSafety;
  packagePayload: MetadataOnlyReceiptExportPackage;
  metadataOnly: true;
  modelExecutionAllowed: false;
  inferenceEndpointExposed: false;
  artifactActivationAllowed: false;
  businessMutationAllowed: false;
  containsModelBytes: false;
  containsRawCsv: false;
  containsFilesystemPaths: false;
  generatedByUserId: string | null;
  traceId: string | null;
  generatedAt: string;
  createdAt: string;
};

export type PersistMetadataOnlyReceiptExportPackageSnapshotOptions = {
  snapshotId?: string;
  createdAt?: string;
};

export type MetadataOnlyReceiptExportPackageSnapshotPersistenceResult = {
  persisted: true;
  idempotencyStrategy: 'one_snapshot_per_generated_package_attempt';
  snapshot: StoredShadowScoreImportApplyReceiptExportPackageSnapshot;
};
