import { listShadowScoreImportApplyReceipts, type StoredShadowScoreImportApplyReceipt } from '../../../../../db/domains/ml/shadowScores/importApplyReceipts';
import { sha256StableJson } from './shadowScoreReceiptExportPackageChecksum';
import type {
  BuildMetadataOnlyReceiptExportPackageOptions,
  BuildMetadataOnlyReceiptExportPackageRequest,
  MetadataOnlyReceiptExportItem,
  MetadataOnlyReceiptExportPackage,
  MetadataOnlyReceiptExportPackageFilters,
  MetadataOnlyReceiptExportPackageSafety,
  MetadataOnlyReceiptExportPackageSort,
  MetadataOnlyReceiptExportPackageSummary,
} from './shadowScoreReceiptExportPackageTypes';
import { METADATA_ONLY_RECEIPT_EXPORT_PACKAGE_TYPE, METADATA_ONLY_RECEIPT_EXPORT_PACKAGE_VERSION } from './shadowScoreReceiptExportPackageTypes';
import { validateMetadataOnlyReceiptExportPackage } from './shadowScoreReceiptExportPackageValidator';

const MAX_LIMIT = 500;
const DEFAULT_LIMIT = 25;
const FORBIDDEN_RECEIPT_CONTENT_PATTERNS = [
  /model\.joblib/i,
  /rawCsv/i,
  /trainCsv/i,
  /testCsv/i,
  /filePath/i,
  /workbenchOutputPath/i,
  /modelPath/i,
  /csvPath/i,
  /runInference/i,
  /executeModel/i,
  /activateArtifact/i,
  /activate_artifact/i,
  /deploy_model/i,
  /write_inventory/i,
  /write_accounting/i,
  /write_ledger/i,
  /write_report/i,
  /mutate_ledger/i,
  /create_invoice/i,
  /change_price/i,
  /set_stock/i,
  /auto_order/i,
  /production_action/i,
  /auto_decision/i,
  /stack trace/i,
  /SQLITE_/i,
];

const normalizeString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
};

const normalizeBoolean = (value: unknown): boolean | undefined => {
  if (value === true || value === false) return value;
  return undefined;
};

const normalizeLimit = (value: unknown): number => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_LIMIT;
  return Math.max(1, Math.min(MAX_LIMIT, Math.trunc(numeric)));
};

const normalizeOffset = (value: unknown): number => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.trunc(numeric));
};

const normalizeSort = (value: unknown): MetadataOnlyReceiptExportPackageSort => (value === 'createdAt_asc' ? 'createdAt_asc' : 'createdAt_desc');

const normalizeFilters = (filters: BuildMetadataOnlyReceiptExportPackageRequest['filters']): MetadataOnlyReceiptExportPackageFilters => {
  const normalized: MetadataOnlyReceiptExportPackageFilters = {};
  const importPayloadHash = normalizeString(filters?.importPayloadHash);
  const candidatePackageId = normalizeString(filters?.candidatePackageId);
  const status = normalizeString(filters?.status);
  const source = normalizeString(filters?.source);
  const requestedByUserId = normalizeString(filters?.requestedByUserId);
  const createdAtFrom = normalizeString(filters?.createdAtFrom);
  const createdAtTo = normalizeString(filters?.createdAtTo);
  const dryRun = normalizeBoolean(filters?.dryRun);
  if (importPayloadHash) normalized.importPayloadHash = importPayloadHash;
  if (candidatePackageId) normalized.candidatePackageId = candidatePackageId;
  if (status) normalized.status = status;
  if (source) normalized.source = source;
  if (dryRun !== undefined) normalized.dryRun = dryRun;
  if (requestedByUserId) normalized.requestedByUserId = requestedByUserId;
  if (createdAtFrom) normalized.createdAtFrom = createdAtFrom;
  if (createdAtTo) normalized.createdAtTo = createdAtTo;
  return normalized;
};

const packageSafety = (): MetadataOnlyReceiptExportPackageSafety => ({
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
  containsModelBytes: false,
  containsRawCsv: false,
  containsFilesystemPaths: false,
});

const containsUnsafeReceiptContent = (receipt: StoredShadowScoreImportApplyReceipt): boolean => {
  const serialized = JSON.stringify({ warnings: receipt.warnings, errors: receipt.errors, safetyPolicy: receipt.safetyPolicy, applyResult: receipt.applyResult });
  return FORBIDDEN_RECEIPT_CONTENT_PATTERNS.some((pattern) => pattern.test(serialized));
};

const toReceiptExportItem = (receipt: StoredShadowScoreImportApplyReceipt): MetadataOnlyReceiptExportItem | null => {
  if (receipt.metadataOnly !== true) return null;
  if (receipt.modelExecutionAllowed !== false || receipt.inferenceEndpointExposed !== false || receipt.artifactActivationAllowed !== false || receipt.businessMutationAllowed !== false) return null;
  if (containsUnsafeReceiptContent(receipt)) return null;
  return {
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
    requestedByUserId: receipt.requestedByUserId,
    traceId: receipt.traceId,
    createdAt: receipt.createdAt,
    metadataOnly: true,
    modelExecutionAllowed: false,
    inferenceEndpointExposed: false,
    artifactActivationAllowed: false,
    businessMutationAllowed: false,
  };
};

const increment = (counts: Record<string, number>, key: string): void => {
  counts[key] = (counts[key] ?? 0) + 1;
};

const buildSummary = (receipts: MetadataOnlyReceiptExportItem[]): MetadataOnlyReceiptExportPackageSummary => {
  const summary: MetadataOnlyReceiptExportPackageSummary = {
    receiptCount: receipts.length,
    statusCounts: {},
    sourceCounts: {},
    dryRunCount: 0,
    appliedCount: 0,
    rejectedCount: 0,
    totalRecordsReceived: 0,
    totalRecordsInserted: 0,
    totalRecordsSkippedDuplicate: 0,
    totalRecordsRejected: 0,
    warningCount: 0,
    errorCount: 0,
  };
  for (const receipt of receipts) {
    increment(summary.statusCounts, receipt.status);
    increment(summary.sourceCounts, receipt.source);
    if (receipt.dryRun) summary.dryRunCount += 1;
    if (receipt.status === 'applied') summary.appliedCount += 1;
    if (receipt.status === 'rejected') summary.rejectedCount += 1;
    summary.totalRecordsReceived += receipt.recordsReceived;
    summary.totalRecordsInserted += receipt.recordsInserted;
    summary.totalRecordsSkippedDuplicate += receipt.recordsSkippedDuplicate;
    summary.totalRecordsRejected += receipt.recordsRejected;
    summary.warningCount += receipt.warningCount;
    summary.errorCount += receipt.errorCount;
  }
  return summary;
};

export const buildMetadataOnlyReceiptExportPackage = async (
  request: BuildMetadataOnlyReceiptExportPackageRequest = {},
  options: BuildMetadataOnlyReceiptExportPackageOptions,
): Promise<MetadataOnlyReceiptExportPackage> => {
  const filters = normalizeFilters(request.filters);
  const limit = normalizeLimit(request.limit);
  const offset = normalizeOffset(request.offset);
  const sort = normalizeSort(request.sort);
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const rows = await listShadowScoreImportApplyReceipts({ ...filters, sort, limit: limit + 1, offset });
  const mapped = rows.map((row) => toReceiptExportItem(row)).filter((row): row is MetadataOnlyReceiptExportItem => Boolean(row));
  const receipts = mapped.slice(0, limit);
  const hasMore = mapped.length > limit || rows.length > limit;
  const summary = buildSummary(receipts);
  const page = { limit, offset, total: null, hasMore };
  const receiptHash = sha256StableJson({ filters, page: { limit, offset, sort }, receipts });
  const safety = packageSafety();
  const contentHash = sha256StableJson({ packageType: METADATA_ONLY_RECEIPT_EXPORT_PACKAGE_TYPE, packageVersion: METADATA_ONLY_RECEIPT_EXPORT_PACKAGE_VERSION, filters, page, summary, safety, receipts });
  const packageId = `receipt-export-package-${contentHash.slice(0, 16)}`;
  const packageDocument: MetadataOnlyReceiptExportPackage = {
    packageType: METADATA_ONLY_RECEIPT_EXPORT_PACKAGE_TYPE,
    packageVersion: METADATA_ONLY_RECEIPT_EXPORT_PACKAGE_VERSION,
    packageId,
    generatedAt,
    generatedByUserId: options.requestedByUserId ?? null,
    traceId: options.traceId ?? null,
    filters,
    page,
    summary,
    safety,
    checksums: { contentHash, receiptHash },
    receipts,
  };
  const validation = validateMetadataOnlyReceiptExportPackage(packageDocument);
  if (!validation.valid) throw new Error(`metadata_only_receipt_export_package_invalid:${validation.errors.join('|')}`);
  return packageDocument;
};
