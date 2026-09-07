import { allAsync, getAsync, runAsync } from '../../../../query';
import { clampLimit, safeJson } from '../../mlDbUtils';
import type { SqliteBindValue } from "../../../../query";

export type ShadowScoreImportApplyReceiptStatus = 'applied' | 'dry_run' | 'rejected' | 'partial';

export type ShadowScoreImportApplyReceiptInput = {
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
  warnings: string[];
  errors: string[];
  safetyPolicy: Record<string, unknown>;
  applyResult: unknown;
  metadataOnly: true;
  modelExecutionAllowed: false;
  inferenceEndpointExposed: false;
  artifactActivationAllowed: false;
  businessMutationAllowed: false;
  requestedByUserId?: string | number | null;
  traceId?: string | null;
  createdAt?: string | null;
};

export type StoredShadowScoreImportApplyReceipt = {
  id: number;
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
  warnings: unknown;
  errors: unknown;
  safetyPolicy: unknown;
  applyResult: unknown;
  metadataOnly: true;
  modelExecutionAllowed: false;
  inferenceEndpointExposed: false;
  artifactActivationAllowed: false;
  businessMutationAllowed: false;
  requestedByUserId: string | null;
  traceId: string | null;
  createdAt: string;
};

export type ShadowScoreImportApplyReceiptSummary = {
  receiptCount: number;
  dryRunCount: number;
  appliedCount: number;
  rejectedCount: number;
  partialCount: number;
  safeMetadataOnlyCount: number;
  unsafeFlagCount: number;
  latestReceiptId: string | null;
  metadataOnly: true;
  modelExecutionAllowed: false;
  inferenceEndpointExposed: false;
  artifactActivationAllowed: false;
  canChangeInventoryOrAccounting: false;
};

const parseJson = (value: unknown): unknown => {
  if (typeof value !== 'string') return value ?? null;
  try {
    return JSON.parse(value);
  } catch (_err) {
    return { parseError: true };
  }
};

const boolFromDb = (value: unknown): boolean => Number(value) === 1 || value === true;
const nullableString = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
};
const normalizeString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
const integer = (value: unknown): number => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.trunc(numeric) : 0;
};

const normalizeReceiptRow = (row: Record<string, unknown> | undefined | null): StoredShadowScoreImportApplyReceipt | null => {
  if (!row) return null;
  return {
    id: Number(row.id ?? 0),
    receiptId: String(row.receiptId ?? row.receipt_id ?? ''),
    importPayloadHash: nullableString(row.importPayloadHash ?? row.import_payload_hash),
    candidatePackageId: nullableString(row.candidatePackageId ?? row.candidate_package_id),
    modelKey: nullableString(row.modelKey ?? row.model_key),
    modelVersion: nullableString(row.modelVersion ?? row.model_version),
    predictionType: nullableString(row.predictionType ?? row.prediction_type),
    source: String(row.source ?? ''),
    dryRun: boolFromDb(row.dryRun ?? row.dry_run),
    status: String(row.status ?? 'rejected') as ShadowScoreImportApplyReceiptStatus,
    recordsReceived: Number(row.recordsReceived ?? row.records_received ?? 0),
    recordsInserted: Number(row.recordsInserted ?? row.records_inserted ?? 0),
    recordsSkippedDuplicate: Number(row.recordsSkippedDuplicate ?? row.records_skipped_duplicate ?? 0),
    recordsRejected: Number(row.recordsRejected ?? row.records_rejected ?? 0),
    warningCount: Number(row.warningCount ?? row.warning_count ?? 0),
    errorCount: Number(row.errorCount ?? row.error_count ?? 0),
    warnings: parseJson(row.warningsJson ?? row.warnings_json),
    errors: parseJson(row.errorsJson ?? row.errors_json),
    safetyPolicy: parseJson(row.safetyPolicyJson ?? row.safety_policy_json),
    applyResult: parseJson(row.applyResultJson ?? row.apply_result_json),
    metadataOnly: true,
    modelExecutionAllowed: false,
    inferenceEndpointExposed: false,
    artifactActivationAllowed: false,
    businessMutationAllowed: false,
    requestedByUserId: nullableString(row.requestedByUserId ?? row.requested_by_user_id),
    traceId: nullableString(row.traceId ?? row.trace_id),
    createdAt: String(row.createdAt ?? row.created_at ?? ''),
  };
};

const selectBase = `
  SELECT id,
         receipt_id AS receiptId,
         import_payload_hash AS importPayloadHash,
         candidate_package_id AS candidatePackageId,
         model_key AS modelKey,
         model_version AS modelVersion,
         prediction_type AS predictionType,
         source,
         dry_run AS dryRun,
         status,
         records_received AS recordsReceived,
         records_inserted AS recordsInserted,
         records_skipped_duplicate AS recordsSkippedDuplicate,
         records_rejected AS recordsRejected,
         warning_count AS warningCount,
         error_count AS errorCount,
         warnings_json AS warningsJson,
         errors_json AS errorsJson,
         safety_policy_json AS safetyPolicyJson,
         apply_result_json AS applyResultJson,
         metadata_only AS metadataOnly,
         model_execution_allowed AS modelExecutionAllowed,
         inference_endpoint_exposed AS inferenceEndpointExposed,
         artifact_activation_allowed AS artifactActivationAllowed,
         business_mutation_allowed AS businessMutationAllowed,
         requested_by_user_id AS requestedByUserId,
         trace_id AS traceId,
         created_at AS createdAt
  FROM ml_shadow_score_import_apply_receipts
`;

export const recordShadowScoreImportApplyReceipt = async (
  receipt: ShadowScoreImportApplyReceiptInput,
): Promise<StoredShadowScoreImportApplyReceipt> => {
  if (!normalizeString(receipt.receiptId)) throw new Error('receipt_id_required');
  if (receipt.metadataOnly !== true) throw new Error('receipt_metadata_only_required');
  if (receipt.modelExecutionAllowed !== false || receipt.inferenceEndpointExposed !== false || receipt.artifactActivationAllowed !== false || receipt.businessMutationAllowed !== false) {
    throw new Error('receipt_safety_flags_must_remain_false');
  }

  await runAsync(
    `
      INSERT INTO ml_shadow_score_import_apply_receipts (
        receipt_id,
        import_payload_hash,
        candidate_package_id,
        model_key,
        model_version,
        prediction_type,
        source,
        dry_run,
        status,
        records_received,
        records_inserted,
        records_skipped_duplicate,
        records_rejected,
        warning_count,
        error_count,
        warnings_json,
        errors_json,
        safety_policy_json,
        apply_result_json,
        metadata_only,
        model_execution_allowed,
        inference_endpoint_exposed,
        artifact_activation_allowed,
        business_mutation_allowed,
        requested_by_user_id,
        trace_id,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 0, 0, 0, ?, ?, COALESCE(?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')))
    `,
    [
      receipt.receiptId,
      nullableString(receipt.importPayloadHash),
      nullableString(receipt.candidatePackageId),
      nullableString(receipt.modelKey),
      nullableString(receipt.modelVersion),
      nullableString(receipt.predictionType),
      normalizeString(receipt.source) || 'internal_admin',
      receipt.dryRun ? 1 : 0,
      receipt.status,
      integer(receipt.recordsReceived),
      integer(receipt.recordsInserted),
      integer(receipt.recordsSkippedDuplicate),
      integer(receipt.recordsRejected),
      integer(receipt.warningCount),
      integer(receipt.errorCount),
      safeJson(receipt.warnings ?? []),
      safeJson(receipt.errors ?? []),
      safeJson(receipt.safetyPolicy ?? {}),
      safeJson(receipt.applyResult ?? {}),
      nullableString(receipt.requestedByUserId),
      nullableString(receipt.traceId),
      nullableString(receipt.createdAt),
    ],
  );

  const stored = await getShadowScoreImportApplyReceiptByReceiptId(receipt.receiptId);
  if (!stored) throw new Error('receipt_insert_failed');
  return stored;
};

export const getShadowScoreImportApplyReceiptById = async (idInput: unknown): Promise<StoredShadowScoreImportApplyReceipt | null> => {
  const id = Number(idInput);
  if (!Number.isFinite(id) || id <= 0) return null;
  return normalizeReceiptRow(await getAsync(`${selectBase} WHERE id = ? LIMIT 1`, [Math.trunc(id)]));
};

export const getShadowScoreImportApplyReceiptByReceiptId = async (receiptIdInput: unknown): Promise<StoredShadowScoreImportApplyReceipt | null> => {
  const receiptId = normalizeString(receiptIdInput);
  if (!receiptId) return null;
  return normalizeReceiptRow(await getAsync(`${selectBase} WHERE receipt_id = ? LIMIT 1`, [receiptId]));
};

export const getShadowScoreImportApplyReceiptsByImportPayloadHash = async (
  importPayloadHashInput: unknown,
): Promise<StoredShadowScoreImportApplyReceipt[]> => {
  const importPayloadHash = normalizeString(importPayloadHashInput);
  if (!importPayloadHash) return [];
  const rows = await allAsync(`${selectBase} WHERE import_payload_hash = ? ORDER BY created_at DESC, id DESC LIMIT 500`, [importPayloadHash]);
  return rows.map((row) => normalizeReceiptRow(row)).filter((row): row is StoredShadowScoreImportApplyReceipt => Boolean(row));
};

export const listShadowScoreImportApplyReceipts = async (options: {
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
} = {}): Promise<StoredShadowScoreImportApplyReceipt[]> => {
  const where: string[] = [];
  const params: SqliteBindValue[] = [];
  const status = normalizeString(options.status);
  const source = normalizeString(options.source);
  const candidatePackageId = normalizeString(options.candidatePackageId);
  const importPayloadHash = normalizeString(options.importPayloadHash);
  const requestedByUserId = normalizeString(options.requestedByUserId);
  const createdAtFrom = normalizeString(options.createdAtFrom);
  const createdAtTo = normalizeString(options.createdAtTo);
  const sort = normalizeString(options.sort);
  const orderBy = sort === 'createdAt_asc' ? 'created_at ASC, id ASC' : 'created_at DESC, id DESC';

  if (status) { where.push('status = ?'); params.push(status); }
  if (source) { where.push('source = ?'); params.push(source); }
  if (options.dryRun === true || options.dryRun === false || options.dryRun === 1 || options.dryRun === 0 || options.dryRun === '1' || options.dryRun === '0') {
    where.push('dry_run = ?');
    params.push(options.dryRun === true || options.dryRun === 1 || options.dryRun === '1' ? 1 : 0);
  }
  if (candidatePackageId) { where.push('candidate_package_id = ?'); params.push(candidatePackageId); }
  if (importPayloadHash) { where.push('import_payload_hash = ?'); params.push(importPayloadHash); }
  if (requestedByUserId) { where.push('requested_by_user_id = ?'); params.push(requestedByUserId); }
  if (createdAtFrom) { where.push('created_at >= ?'); params.push(createdAtFrom); }
  if (createdAtTo) { where.push('created_at <= ?'); params.push(createdAtTo); }

  const limit = clampLimit(options.limit, 25, 500);
  const offset = Math.max(0, integer(options.offset));
  params.push(limit, offset);

  const rows = await allAsync(
    `${selectBase}${where.length ? ` WHERE ${where.join(' AND ')}` : ''} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
    params,
  );
  return rows.map((row) => normalizeReceiptRow(row)).filter((row): row is StoredShadowScoreImportApplyReceipt => Boolean(row));
};

export const getShadowScoreImportApplyReceiptSummary = async (): Promise<ShadowScoreImportApplyReceiptSummary> => {
  const summary = await getAsync(
    `
      SELECT COUNT(*) AS receiptCount,
             SUM(CASE WHEN dry_run = 1 THEN 1 ELSE 0 END) AS dryRunCount,
             SUM(CASE WHEN status = 'applied' THEN 1 ELSE 0 END) AS appliedCount,
             SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejectedCount,
             SUM(CASE WHEN status = 'partial' THEN 1 ELSE 0 END) AS partialCount,
             SUM(CASE WHEN metadata_only = 1 AND model_execution_allowed = 0 AND inference_endpoint_exposed = 0 AND artifact_activation_allowed = 0 AND business_mutation_allowed = 0 THEN 1 ELSE 0 END) AS safeMetadataOnlyCount,
             SUM(CASE WHEN metadata_only != 1 OR model_execution_allowed != 0 OR inference_endpoint_exposed != 0 OR artifact_activation_allowed != 0 OR business_mutation_allowed != 0 THEN 1 ELSE 0 END) AS unsafeFlagCount
      FROM ml_shadow_score_import_apply_receipts
    `,
  );
  const latest = await getAsync(`SELECT receipt_id AS receiptId FROM ml_shadow_score_import_apply_receipts ORDER BY created_at DESC, id DESC LIMIT 1`);
  return {
    receiptCount: Number(summary?.receiptCount ?? 0),
    dryRunCount: Number(summary?.dryRunCount ?? 0),
    appliedCount: Number(summary?.appliedCount ?? 0),
    rejectedCount: Number(summary?.rejectedCount ?? 0),
    partialCount: Number(summary?.partialCount ?? 0),
    safeMetadataOnlyCount: Number(summary?.safeMetadataOnlyCount ?? 0),
    unsafeFlagCount: Number(summary?.unsafeFlagCount ?? 0),
    latestReceiptId: nullableString(latest?.receiptId),
    metadataOnly: true,
    modelExecutionAllowed: false,
    inferenceEndpointExposed: false,
    artifactActivationAllowed: false,
    canChangeInventoryOrAccounting: false,
  };
};
