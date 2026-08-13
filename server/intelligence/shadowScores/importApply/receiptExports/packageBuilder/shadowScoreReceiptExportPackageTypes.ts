import type { ShadowScoreImportApplyReceiptStatus } from '../../../../../db/domains/ml/shadowScores/importApplyReceipts';

export const METADATA_ONLY_RECEIPT_EXPORT_PACKAGE_TYPE = 'metadata_only_import_apply_receipt_export_package' as const;
export const METADATA_ONLY_RECEIPT_EXPORT_PACKAGE_VERSION = 'v1' as const;

export type MetadataOnlyReceiptExportPackageSort = 'createdAt_desc' | 'createdAt_asc';
export type MetadataOnlyReceiptExportPackageSource = 'internal_admin' | 'test_fixture';

export type MetadataOnlyReceiptExportPackageFilters = {
  importPayloadHash?: string;
  candidatePackageId?: string;
  status?: ShadowScoreImportApplyReceiptStatus | string;
  source?: string;
  dryRun?: boolean;
  requestedByUserId?: string;
  createdAtFrom?: string;
  createdAtTo?: string;
};

export type BuildMetadataOnlyReceiptExportPackageRequest = {
  filters?: MetadataOnlyReceiptExportPackageFilters;
  limit?: number;
  offset?: number;
  sort?: MetadataOnlyReceiptExportPackageSort;
};

export type BuildMetadataOnlyReceiptExportPackageOptions = {
  requestedByUserId?: string | null;
  source: MetadataOnlyReceiptExportPackageSource;
  traceId?: string | null;
  generatedAt?: string;
};

export type MetadataOnlyReceiptExportItem = {
  receiptId: string;
  importPayloadHash: string | null;
  candidatePackageId: string | null;
  modelKey: string | null;
  modelVersion: string | null;
  predictionType: string | null;
  source: string;
  dryRun: boolean;
  status: ShadowScoreImportApplyReceiptStatus;
  recordsReceived: number;
  recordsInserted: number;
  recordsSkippedDuplicate: number;
  recordsRejected: number;
  warningCount: number;
  errorCount: number;
  requestedByUserId: string | null;
  traceId: string | null;
  createdAt: string;
  metadataOnly: true;
  modelExecutionAllowed: false;
  inferenceEndpointExposed: false;
  artifactActivationAllowed: false;
  businessMutationAllowed: false;
};

export type MetadataOnlyReceiptExportPackagePage = {
  limit: number;
  offset: number;
  total: number | null;
  hasMore: boolean;
};

export type MetadataOnlyReceiptExportPackageSummary = {
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
};

export type MetadataOnlyReceiptExportPackageSafety = {
  metadataOnly: true;
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
  businessMutationAllowed: false;
  containsModelBytes: false;
  containsRawCsv: false;
  containsFilesystemPaths: false;
};

export type MetadataOnlyReceiptExportPackageChecksums = {
  contentHash: string;
  receiptHash: string;
};

export type MetadataOnlyReceiptExportPackage = {
  packageType: typeof METADATA_ONLY_RECEIPT_EXPORT_PACKAGE_TYPE;
  packageVersion: typeof METADATA_ONLY_RECEIPT_EXPORT_PACKAGE_VERSION;
  packageId: string;
  generatedAt: string;
  generatedByUserId: string | null;
  traceId: string | null;
  filters: MetadataOnlyReceiptExportPackageFilters;
  page: MetadataOnlyReceiptExportPackagePage;
  summary: MetadataOnlyReceiptExportPackageSummary;
  safety: MetadataOnlyReceiptExportPackageSafety;
  checksums: MetadataOnlyReceiptExportPackageChecksums;
  receipts: MetadataOnlyReceiptExportItem[];
};

export type MetadataOnlyReceiptExportPackageValidationResult = {
  valid: boolean;
  errors: string[];
};
