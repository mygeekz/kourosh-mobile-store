import { allAsync, getAsync, runAsync } from '../../../../query';
import { clampLimit, safeJson } from '../../mlDbUtils';
import type { SqliteBindValue } from "../../../../query";

export type ShadowScoreImportApplyReceiptExportPackageSnapshotInput = {
  snapshotId: string;
  packageId: string;
  packageType: string;
  packageVersion: string;
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
  filters: unknown;
  page: unknown;
  summary: unknown;
  safety: unknown;
  packagePayload: unknown;
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
  createdAt?: string | null;
};

export type StoredShadowScoreImportApplyReceiptExportPackageSnapshot = {
  id: number;
  snapshotId: string;
  packageId: string;
  packageType: string;
  packageVersion: string;
  contentHash: string;
  receiptHash: string;
  receiptCount: number;
  statusCounts: unknown;
  sourceCounts: unknown;
  dryRunCount: number;
  appliedCount: number;
  rejectedCount: number;
  totalRecordsReceived: number;
  totalRecordsInserted: number;
  totalRecordsSkippedDuplicate: number;
  totalRecordsRejected: number;
  warningCount: number;
  errorCount: number;
  filters: unknown;
  page: unknown;
  summary: unknown;
  safety: unknown;
  packagePayload: unknown;
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

export type ShadowScoreImportApplyReceiptExportPackageSnapshotListOptions = {
  packageId?: unknown;
  contentHash?: unknown;
  receiptHash?: unknown;
  generatedByUserId?: unknown;
  traceId?: unknown;
  createdAtFrom?: unknown;
  createdAtTo?: unknown;
  limit?: unknown;
  offset?: unknown;
};

export type ShadowScoreImportApplyReceiptExportPackageSnapshotSummary = {
  snapshotCount: number;
  receiptCount: number;
  dryRunCount: number;
  appliedCount: number;
  rejectedCount: number;
  latestSnapshotId: string | null;
  metadataOnly: true;
  modelExecutionAllowed: false;
  inferenceEndpointExposed: false;
  artifactActivationAllowed: false;
  businessMutationAllowed: false;
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
const integer = (value: unknown): number => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.trunc(numeric) : 0;
};
const normalizeString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
const nullableString = (value: unknown): string | null => {
  const normalized = normalizeString(value);
  return normalized.length > 0 ? normalized : null;
};

const normalizeSnapshotRow = (row: Record<string, unknown> | undefined | null): StoredShadowScoreImportApplyReceiptExportPackageSnapshot | null => {
  if (!row) return null;
  return {
    id: Number(row.id ?? 0),
    snapshotId: String(row.snapshotId ?? row.snapshot_id ?? ''),
    packageId: String(row.packageId ?? row.package_id ?? ''),
    packageType: String(row.packageType ?? row.package_type ?? ''),
    packageVersion: String(row.packageVersion ?? row.package_version ?? ''),
    contentHash: String(row.contentHash ?? row.content_hash ?? ''),
    receiptHash: String(row.receiptHash ?? row.receipt_hash ?? ''),
    receiptCount: integer(row.receiptCount ?? row.receipt_count),
    statusCounts: parseJson(row.statusCountsJson ?? row.status_counts_json),
    sourceCounts: parseJson(row.sourceCountsJson ?? row.source_counts_json),
    dryRunCount: integer(row.dryRunCount ?? row.dry_run_count),
    appliedCount: integer(row.appliedCount ?? row.applied_count),
    rejectedCount: integer(row.rejectedCount ?? row.rejected_count),
    totalRecordsReceived: integer(row.totalRecordsReceived ?? row.total_records_received),
    totalRecordsInserted: integer(row.totalRecordsInserted ?? row.total_records_inserted),
    totalRecordsSkippedDuplicate: integer(row.totalRecordsSkippedDuplicate ?? row.total_records_skipped_duplicate),
    totalRecordsRejected: integer(row.totalRecordsRejected ?? row.total_records_rejected),
    warningCount: integer(row.warningCount ?? row.warning_count),
    errorCount: integer(row.errorCount ?? row.error_count),
    filters: parseJson(row.filtersJson ?? row.filters_json),
    page: parseJson(row.pageJson ?? row.page_json),
    summary: parseJson(row.summaryJson ?? row.summary_json),
    safety: parseJson(row.safetyJson ?? row.safety_json),
    packagePayload: parseJson(row.packagePayloadJson ?? row.package_payload_json),
    metadataOnly: true,
    modelExecutionAllowed: false,
    inferenceEndpointExposed: false,
    artifactActivationAllowed: false,
    businessMutationAllowed: false,
    containsModelBytes: false,
    containsRawCsv: false,
    containsFilesystemPaths: false,
    generatedByUserId: nullableString(row.generatedByUserId ?? row.generated_by_user_id),
    traceId: nullableString(row.traceId ?? row.trace_id),
    generatedAt: String(row.generatedAt ?? row.generated_at ?? ''),
    createdAt: String(row.createdAt ?? row.created_at ?? ''),
  };
};

const selectBase = `
  SELECT id,
         snapshot_id AS snapshotId,
         package_id AS packageId,
         package_type AS packageType,
         package_version AS packageVersion,
         content_hash AS contentHash,
         receipt_hash AS receiptHash,
         receipt_count AS receiptCount,
         status_counts_json AS statusCountsJson,
         source_counts_json AS sourceCountsJson,
         dry_run_count AS dryRunCount,
         applied_count AS appliedCount,
         rejected_count AS rejectedCount,
         total_records_received AS totalRecordsReceived,
         total_records_inserted AS totalRecordsInserted,
         total_records_skipped_duplicate AS totalRecordsSkippedDuplicate,
         total_records_rejected AS totalRecordsRejected,
         warning_count AS warningCount,
         error_count AS errorCount,
         filters_json AS filtersJson,
         page_json AS pageJson,
         summary_json AS summaryJson,
         safety_json AS safetyJson,
         package_payload_json AS packagePayloadJson,
         metadata_only AS metadataOnly,
         model_execution_allowed AS modelExecutionAllowed,
         inference_endpoint_exposed AS inferenceEndpointExposed,
         artifact_activation_allowed AS artifactActivationAllowed,
         business_mutation_allowed AS businessMutationAllowed,
         contains_model_bytes AS containsModelBytes,
         contains_raw_csv AS containsRawCsv,
         contains_filesystem_paths AS containsFilesystemPaths,
         generated_by_user_id AS generatedByUserId,
         trace_id AS traceId,
         generated_at AS generatedAt,
         created_at AS createdAt
  FROM ml_shadow_score_import_apply_receipt_export_package_snapshots
`;

const assertSnapshotSafety = (snapshot: ShadowScoreImportApplyReceiptExportPackageSnapshotInput): void => {
  if (!normalizeString(snapshot.snapshotId)) throw new Error('snapshot_id_required');
  if (!normalizeString(snapshot.packageId)) throw new Error('package_id_required');
  if (!normalizeString(snapshot.contentHash)) throw new Error('content_hash_required');
  if (!normalizeString(snapshot.receiptHash)) throw new Error('receipt_hash_required');
  if (snapshot.metadataOnly !== true) throw new Error('snapshot_metadata_only_required');
  if (
    snapshot.modelExecutionAllowed !== false
    || snapshot.inferenceEndpointExposed !== false
    || snapshot.artifactActivationAllowed !== false
    || snapshot.businessMutationAllowed !== false
    || snapshot.containsModelBytes !== false
    || snapshot.containsRawCsv !== false
    || snapshot.containsFilesystemPaths !== false
  ) {
    throw new Error('snapshot_safety_flags_must_remain_false');
  }
};

export const recordShadowScoreImportApplyReceiptExportPackageSnapshot = async (
  snapshot: ShadowScoreImportApplyReceiptExportPackageSnapshotInput,
): Promise<StoredShadowScoreImportApplyReceiptExportPackageSnapshot> => {
  assertSnapshotSafety(snapshot);
  await runAsync(
    `
      INSERT INTO ml_shadow_score_import_apply_receipt_export_package_snapshots (
        snapshot_id,
        package_id,
        package_type,
        package_version,
        content_hash,
        receipt_hash,
        receipt_count,
        status_counts_json,
        source_counts_json,
        dry_run_count,
        applied_count,
        rejected_count,
        total_records_received,
        total_records_inserted,
        total_records_skipped_duplicate,
        total_records_rejected,
        warning_count,
        error_count,
        filters_json,
        page_json,
        summary_json,
        safety_json,
        package_payload_json,
        metadata_only,
        model_execution_allowed,
        inference_endpoint_exposed,
        artifact_activation_allowed,
        business_mutation_allowed,
        contains_model_bytes,
        contains_raw_csv,
        contains_filesystem_paths,
        generated_by_user_id,
        trace_id,
        generated_at,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 0, 0, 0, 0, 0, 0, ?, ?, ?, COALESCE(?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')))
    `,
    [
      snapshot.snapshotId,
      snapshot.packageId,
      snapshot.packageType,
      snapshot.packageVersion,
      snapshot.contentHash,
      snapshot.receiptHash,
      integer(snapshot.receiptCount),
      safeJson(snapshot.statusCounts ?? {}),
      safeJson(snapshot.sourceCounts ?? {}),
      integer(snapshot.dryRunCount),
      integer(snapshot.appliedCount),
      integer(snapshot.rejectedCount),
      integer(snapshot.totalRecordsReceived),
      integer(snapshot.totalRecordsInserted),
      integer(snapshot.totalRecordsSkippedDuplicate),
      integer(snapshot.totalRecordsRejected),
      integer(snapshot.warningCount),
      integer(snapshot.errorCount),
      safeJson(snapshot.filters ?? {}),
      safeJson(snapshot.page ?? {}),
      safeJson(snapshot.summary ?? {}),
      safeJson(snapshot.safety ?? {}),
      safeJson(snapshot.packagePayload ?? {}),
      nullableString(snapshot.generatedByUserId),
      nullableString(snapshot.traceId),
      normalizeString(snapshot.generatedAt),
      nullableString(snapshot.createdAt),
    ],
  );

  const stored = await getShadowScoreImportApplyReceiptExportPackageSnapshotBySnapshotId(snapshot.snapshotId);
  if (!stored) throw new Error('snapshot_insert_failed');
  return stored;
};

export const getShadowScoreImportApplyReceiptExportPackageSnapshotById = async (
  idInput: unknown,
): Promise<StoredShadowScoreImportApplyReceiptExportPackageSnapshot | null> => {
  const id = Number(idInput);
  if (!Number.isFinite(id) || id <= 0) return null;
  return normalizeSnapshotRow(await getAsync(`${selectBase} WHERE id = ? LIMIT 1`, [Math.trunc(id)]));
};

export const getShadowScoreImportApplyReceiptExportPackageSnapshotBySnapshotId = async (
  snapshotIdInput: unknown,
): Promise<StoredShadowScoreImportApplyReceiptExportPackageSnapshot | null> => {
  const snapshotId = normalizeString(snapshotIdInput);
  if (!snapshotId) return null;
  return normalizeSnapshotRow(await getAsync(`${selectBase} WHERE snapshot_id = ? LIMIT 1`, [snapshotId]));
};

export const getShadowScoreImportApplyReceiptExportPackageSnapshotsByPackageId = async (
  packageIdInput: unknown,
): Promise<StoredShadowScoreImportApplyReceiptExportPackageSnapshot[]> => {
  const packageId = normalizeString(packageIdInput);
  if (!packageId) return [];
  const rows = await allAsync(`${selectBase} WHERE package_id = ? ORDER BY created_at DESC, id DESC LIMIT 500`, [packageId]);
  return rows.map((row) => normalizeSnapshotRow(row)).filter((row): row is StoredShadowScoreImportApplyReceiptExportPackageSnapshot => Boolean(row));
};

export const getShadowScoreImportApplyReceiptExportPackageSnapshotsByContentHash = async (
  contentHashInput: unknown,
): Promise<StoredShadowScoreImportApplyReceiptExportPackageSnapshot[]> => {
  const contentHash = normalizeString(contentHashInput);
  if (!contentHash) return [];
  const rows = await allAsync(`${selectBase} WHERE content_hash = ? ORDER BY created_at DESC, id DESC LIMIT 500`, [contentHash]);
  return rows.map((row) => normalizeSnapshotRow(row)).filter((row): row is StoredShadowScoreImportApplyReceiptExportPackageSnapshot => Boolean(row));
};

export const listShadowScoreImportApplyReceiptExportPackageSnapshots = async (
  options: ShadowScoreImportApplyReceiptExportPackageSnapshotListOptions = {},
): Promise<StoredShadowScoreImportApplyReceiptExportPackageSnapshot[]> => {
  const where: string[] = [];
  const params: SqliteBindValue[] = [];
  const packageId = normalizeString(options.packageId);
  const contentHash = normalizeString(options.contentHash);
  const receiptHash = normalizeString(options.receiptHash);
  const generatedByUserId = normalizeString(options.generatedByUserId);
  const traceId = normalizeString(options.traceId);
  const createdAtFrom = normalizeString(options.createdAtFrom);
  const createdAtTo = normalizeString(options.createdAtTo);

  if (packageId) { where.push('package_id = ?'); params.push(packageId); }
  if (contentHash) { where.push('content_hash = ?'); params.push(contentHash); }
  if (receiptHash) { where.push('receipt_hash = ?'); params.push(receiptHash); }
  if (generatedByUserId) { where.push('generated_by_user_id = ?'); params.push(generatedByUserId); }
  if (traceId) { where.push('trace_id = ?'); params.push(traceId); }
  if (createdAtFrom) { where.push('created_at >= ?'); params.push(createdAtFrom); }
  if (createdAtTo) { where.push('created_at <= ?'); params.push(createdAtTo); }

  const limit = clampLimit(options.limit, 25, 500);
  const offset = Math.max(0, integer(options.offset));
  params.push(limit, offset);

  const rows = await allAsync(
    `${selectBase}${where.length ? ` WHERE ${where.join(' AND ')}` : ''} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
    params,
  );
  return rows.map((row) => normalizeSnapshotRow(row)).filter((row): row is StoredShadowScoreImportApplyReceiptExportPackageSnapshot => Boolean(row));
};

export const getShadowScoreImportApplyReceiptExportPackageSnapshotSummary = async (): Promise<ShadowScoreImportApplyReceiptExportPackageSnapshotSummary> => {
  const summary = await getAsync(
    `
      SELECT COUNT(*) AS snapshotCount,
             COALESCE(SUM(receipt_count), 0) AS receiptCount,
             COALESCE(SUM(dry_run_count), 0) AS dryRunCount,
             COALESCE(SUM(applied_count), 0) AS appliedCount,
             COALESCE(SUM(rejected_count), 0) AS rejectedCount
      FROM ml_shadow_score_import_apply_receipt_export_package_snapshots
    `,
  );
  const latest = await getAsync(`SELECT snapshot_id AS snapshotId FROM ml_shadow_score_import_apply_receipt_export_package_snapshots ORDER BY created_at DESC, id DESC LIMIT 1`);
  return {
    snapshotCount: integer(summary?.snapshotCount),
    receiptCount: integer(summary?.receiptCount),
    dryRunCount: integer(summary?.dryRunCount),
    appliedCount: integer(summary?.appliedCount),
    rejectedCount: integer(summary?.rejectedCount),
    latestSnapshotId: nullableString(latest?.snapshotId),
    metadataOnly: true,
    modelExecutionAllowed: false,
    inferenceEndpointExposed: false,
    artifactActivationAllowed: false,
    businessMutationAllowed: false,
    canChangeInventoryOrAccounting: false,
  };
};
