import {
  getShadowScoreImportApplyReceiptById,
  getShadowScoreImportApplyReceiptByReceiptId,
  getShadowScoreImportApplyReceiptSummary,
  listShadowScoreImportApplyReceipts,
  type ShadowScoreImportApplyReceiptSummary,
  type StoredShadowScoreImportApplyReceipt,
} from '../../../../db/domains/ml/shadowScores/importApplyReceipts';

export type ShadowScoreImportApplyReceiptReadModelQuery = {
  receiptId?: unknown;
  id?: unknown;
  status?: unknown;
  source?: unknown;
  dryRun?: unknown;
  candidatePackageId?: unknown;
  importPayloadHash?: unknown;
  requestedByUserId?: unknown;
  createdAtFrom?: unknown;
  createdAtTo?: unknown;
  sort?: unknown;
  limit?: unknown;
  offset?: unknown;
};

export type ShadowScoreImportApplyReceiptReadModelSafetySummary = {
  route: 'internal_metadata_only_import_apply_receipt_read_model';
  readOnly: true;
  metadataOnly: true;
  metadataOnlyWrite: false;
  businessMutationAllowed: false;
  modelExecutionAllowed: false;
  runtimeInvocationAllowed: false;
  inferenceEndpointExposed: false;
  artifactActivationAllowed: false;
  canChangeInventoryOrAccounting: false;
  canChangePricing: false;
  canChangeReports: false;
  canChangeLedger: false;
  canMutateBusinessRecords: false;
};

export type ShadowScoreImportApplyReceiptReadModelPage = {
  limit: number;
  offset: number;
  total: number | null;
  hasMore: boolean;
};

export type ShadowScoreImportApplyReceiptReadModelSummary = ShadowScoreImportApplyReceiptSummary & {
  returnedCount: number;
};

export type ShadowScoreImportApplyReceiptReadModelResult = {
  phase: 'Phase 20B';
  routeKind: 'metadata_only_import_apply_receipt_internal_read_model';
  metadataOnly: true;
  readOnly: true;
  receipt: StoredShadowScoreImportApplyReceipt | null;
  receipts: StoredShadowScoreImportApplyReceipt[];
  items: StoredShadowScoreImportApplyReceipt[];
  receiptCount: number;
  page: ShadowScoreImportApplyReceiptReadModelPage;
  summary: ShadowScoreImportApplyReceiptReadModelSummary;
  filters: {
    receiptId: string | null;
    id: number | null;
    status: string | null;
    source: string | null;
    dryRun: boolean | null;
    candidatePackageId: string | null;
    importPayloadHash: string | null;
    requestedByUserId: string | null;
    createdAtFrom: string | null;
    createdAtTo: string | null;
    sort: 'createdAt_desc' | 'createdAt_asc';
    limit: number;
    offset: number;
  };
  safety: ShadowScoreImportApplyReceiptReadModelSafetySummary;
  generatedAt: string;
};

const stringOrNull = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  const normalized = String(Array.isArray(value) ? value[0] : value).trim();
  return normalized.length > 0 ? normalized.slice(0, 180) : null;
};

const numberOrNull = (value: unknown): number | null => {
  const numeric = Number(Array.isArray(value) ? value[0] : value);
  return Number.isFinite(numeric) && numeric > 0 ? Math.trunc(numeric) : null;
};

const clampLimit = (value: unknown): number => {
  const numeric = Number(Array.isArray(value) ? value[0] : value);
  if (!Number.isFinite(numeric)) return 25;
  return Math.min(Math.max(Math.trunc(numeric), 1), 100);
};

const normalizeOffset = (value: unknown): number => {
  const numeric = Number(Array.isArray(value) ? value[0] : value);
  return Number.isFinite(numeric) && numeric > 0 ? Math.trunc(numeric) : 0;
};

const boolOrNull = (value: unknown): boolean | null => {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === true || raw === 'true' || raw === '1' || raw === 1) return true;
  if (raw === false || raw === 'false' || raw === '0' || raw === 0) return false;
  return null;
};

const normalizeSort = (value: unknown): 'createdAt_desc' | 'createdAt_asc' => {
  const normalized = stringOrNull(value);
  return normalized === 'createdAt_asc' ? 'createdAt_asc' : 'createdAt_desc';
};

export const buildImportApplyReceiptReadModelSafetySummary = (): ShadowScoreImportApplyReceiptReadModelSafetySummary => ({
  route: 'internal_metadata_only_import_apply_receipt_read_model',
  readOnly: true,
  metadataOnly: true,
  metadataOnlyWrite: false,
  businessMutationAllowed: false,
  modelExecutionAllowed: false,
  runtimeInvocationAllowed: false,
  inferenceEndpointExposed: false,
  artifactActivationAllowed: false,
  canChangeInventoryOrAccounting: false,
  canChangePricing: false,
  canChangeReports: false,
  canChangeLedger: false,
  canMutateBusinessRecords: false,
});

export const listInternalAdminShadowScoreImportApplyReceiptReadModel = async (
  query: ShadowScoreImportApplyReceiptReadModelQuery = {},
): Promise<ShadowScoreImportApplyReceiptReadModelResult> => {
  const receiptId = stringOrNull(query.receiptId);
  const id = numberOrNull(query.id);
  const dryRun = boolOrNull(query.dryRun);
  const filters = {
    receiptId,
    id,
    status: stringOrNull(query.status),
    source: stringOrNull(query.source),
    dryRun,
    candidatePackageId: stringOrNull(query.candidatePackageId),
    importPayloadHash: stringOrNull(query.importPayloadHash),
    requestedByUserId: stringOrNull(query.requestedByUserId),
    createdAtFrom: stringOrNull(query.createdAtFrom),
    createdAtTo: stringOrNull(query.createdAtTo),
    sort: normalizeSort(query.sort),
    limit: clampLimit(query.limit),
    offset: normalizeOffset(query.offset),
  };

  let receipt: StoredShadowScoreImportApplyReceipt | null = null;
  if (receiptId) receipt = await getShadowScoreImportApplyReceiptByReceiptId(receiptId);
  else if (id !== null) receipt = await getShadowScoreImportApplyReceiptById(id);

  const requestedLimit = filters.limit;
  const rawReceipts = receipt
    ? [receipt]
    : await listShadowScoreImportApplyReceipts({
        status: filters.status,
        source: filters.source,
        dryRun: filters.dryRun ?? undefined,
        candidatePackageId: filters.candidatePackageId,
        importPayloadHash: filters.importPayloadHash,
        requestedByUserId: filters.requestedByUserId,
        createdAtFrom: filters.createdAtFrom,
        createdAtTo: filters.createdAtTo,
        sort: filters.sort,
        limit: requestedLimit + 1,
        offset: filters.offset,
      });

  const hasMore = !receipt && rawReceipts.length > requestedLimit;
  const receipts = receipt ? rawReceipts : rawReceipts.slice(0, requestedLimit);
  const baseSummary = await getShadowScoreImportApplyReceiptSummary();
  const summary: ShadowScoreImportApplyReceiptReadModelSummary = {
    ...baseSummary,
    returnedCount: receipts.length,
  };

  return {
    phase: 'Phase 20B',
    routeKind: 'metadata_only_import_apply_receipt_internal_read_model',
    metadataOnly: true,
    readOnly: true,
    receipt,
    receipts,
    items: receipts,
    receiptCount: receipts.length,
    page: {
      limit: requestedLimit,
      offset: filters.offset,
      total: null,
      hasMore,
    },
    summary,
    filters,
    safety: buildImportApplyReceiptReadModelSafetySummary(),
    generatedAt: new Date().toISOString(),
  };
};

export const buildImportApplyReceiptReadModelSuccessEnvelope = (data: ShadowScoreImportApplyReceiptReadModelResult) => ({
  success: true,
  data,
});

export const buildImportApplyReceiptReadModelErrorEnvelope = () => ({
  success: false,
  error: {
    code: 'metadata_only_import_apply_receipt_read_model_failed',
    message: 'Invalid metadata-only import apply receipt read-model request.',
  },
  data: null,
});
