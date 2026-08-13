import { getDbInstance } from '../database';
import { allAsync, execAsync, runAsync } from '../db/query';

export type PartnerSettlementManagerSignoffUser = {
  id?: number | null;
  username?: string | null;
  roleName?: string | null;
};

export type PartnerSettlementManagerSignoffRequest = {
  settlementId?: string;
  idempotencyKey?: string;
  settlementFingerprint?: string;
  sourceFingerprint?: string;
  ledgerEntryIds?: string[];
  reconciliationStatus?: string;
  signoffEvidence?: Record<string, unknown>;
  managerSignoff?: {
    confirmed?: boolean;
    confirmedByUserId?: number;
    signoffText?: string;
  };
};

export type PartnerSettlementManagerSignoffSuccess = {
  ok: true;
  status: 'signed' | 'already-signed';
  partnerId: number;
  settlementId: string;
  signoffId: string;
  idempotencyKey: string;
  signedAt: string;
  signedByRole: 'Admin' | 'Manager';
  duplicateLock?: 'settlement-id' | 'settlement-fingerprint' | 'idempotency-key';
  mutationScope: {
    auditLog: true;
    partnerLedger: false;
    inventory: false;
    customerLedger: false;
    invoices: false;
    pricing: false;
    ml: false;
  };
};

export type PartnerSettlementManagerSignoffFailureReason =
  | 'unauthorized'
  | 'forbidden'
  | 'missing-signoff-confirmation'
  | 'missing-signoff-data'
  | 'settlement-not-found'
  | 'signoff-idempotency-conflict'
  | 'transaction-rolled-back';

export type PartnerSettlementManagerSignoffFailure = {
  ok: false;
  status: 'rejected';
  reason: PartnerSettlementManagerSignoffFailureReason;
  message: string;
  details?: unknown;
};

export type PartnerSettlementManagerSignoffResponse =
  | PartnerSettlementManagerSignoffSuccess
  | PartnerSettlementManagerSignoffFailure;

const ATOMIC_SETTLEMENT_REFERENCE_TYPE = 'partner_settlement_atomic_submit';
const SIGNOFF_AUDIT_ACTION = 'partner_settlement_manager_signoff_persisted';
const ALLOWED_ROLES = ['Admin', 'Manager'] as const;

const mutationScope = {
  auditLog: true,
  partnerLedger: false,
  inventory: false,
  customerLedger: false,
  invoices: false,
  pricing: false,
  ml: false,
} as const;

const blockedRequestFieldNames = new Set(
  [
    ['override', 'Amount'],
    ['force', 'Submit'],
    ['skip', 'Dry', 'Run'],
    ['bypass', 'Validation'],
    ['auto', 'Approve'],
    ['mutate', 'Inventory', 'Directly'],
    ['mutate', 'Accounting', 'Directly'],
    ['model', 'Score'],
    ['ml', 'Decision'],
  ].map((parts) => parts.join('')),
);

const normalizeText = (value: unknown): string => String(value ?? '').trim();
const normalizeRole = (roleName: unknown): string => normalizeText(roleName);

const reject = (
  reason: PartnerSettlementManagerSignoffFailureReason,
  message: string,
  details?: unknown,
): PartnerSettlementManagerSignoffFailure => ({
  ok: false,
  status: 'rejected',
  reason,
  message,
  ...(details !== undefined ? { details } : {}),
});

const collectUnsafeRequestFields = (value: unknown, prefix = ''): string[] => {
  if (!value || typeof value !== 'object') return [];
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectUnsafeRequestFields(item, `${prefix}[${index}]`));
  }

  const fields: string[] = [];
  for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (blockedRequestFieldNames.has(key)) fields.push(path);
    fields.push(...collectUnsafeRequestFields(nestedValue, path));
  }
  return fields;
};

const parseJson = (raw: unknown): Record<string, any> | null => {
  try {
    return raw ? JSON.parse(String(raw)) : null;
  } catch {
    return null;
  }
};

const normalizeLedgerEntryIds = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.map((item) => normalizeText(item)).filter(Boolean).sort()
    : [];

const findSubmittedSettlementRows = async (
  partnerId: number,
  request: PartnerSettlementManagerSignoffRequest,
): Promise<any[]> => {
  const settlementId = normalizeText(request.settlementId);
  const idempotencyKey = normalizeText(request.idempotencyKey);
  const settlementFingerprint = normalizeText(request.settlementFingerprint);
  const requestedLedgerEntryIds = normalizeLedgerEntryIds(request.ledgerEntryIds);

  const rows = await allAsync(
    `SELECT id, settlementBatchId, changeHistoryJson
       FROM partner_ledger
      WHERE partnerId = ?
        AND referenceType = ?
      ORDER BY id ASC`,
    [partnerId, ATOMIC_SETTLEMENT_REFERENCE_TYPE],
  );

  return rows.filter((row: any) => {
    const meta = parseJson(row?.changeHistoryJson) || {};
    const rowId = normalizeText(row?.id);
    if (settlementId && normalizeText(meta.settlementId) === settlementId) return true;
    if (idempotencyKey && normalizeText(row?.settlementBatchId) === idempotencyKey) return true;
    if (settlementFingerprint && normalizeText(meta.settlementFingerprint) === settlementFingerprint) return true;
    return requestedLedgerEntryIds.includes(rowId);
  });
};

type ExistingSignoffResult = {
  response: PartnerSettlementManagerSignoffSuccess;
  settlementId: string | null;
  settlementFingerprint: string | null;
};

const buildExistingSignoffResponse = (
  partnerId: number,
  idempotencyKey: string,
  row: any,
  meta: Record<string, any>,
  duplicateLock: 'settlement-id' | 'settlement-fingerprint' | 'idempotency-key',
): ExistingSignoffResult => {
  const role = meta?.signedByRole === 'Manager' ? 'Manager' : 'Admin';
  return {
    settlementId: meta?.settlementId ? String(meta.settlementId) : null,
    settlementFingerprint: meta?.settlementFingerprint ? String(meta.settlementFingerprint) : null,
    response: {
      ok: true,
      status: 'already-signed',
      partnerId,
      settlementId: String(meta?.settlementId || ''),
      signoffId: String(row?.id || meta?.signoffId || ''),
      idempotencyKey,
      signedAt: String(meta?.signedAt || row?.createdAt || ''),
      signedByRole: role,
      duplicateLock,
      mutationScope,
    },
  };
};

const readExistingSignoff = async (
  partnerId: number,
  request: PartnerSettlementManagerSignoffRequest,
): Promise<ExistingSignoffResult | null> => {
  const settlementId = normalizeText(request.settlementId);
  const idempotencyKey = normalizeText(request.idempotencyKey);
  const settlementFingerprint = normalizeText(request.settlementFingerprint);
  const rows = await allAsync(
    `SELECT id, description, createdAt
       FROM audit_logs
      WHERE entityType = ?
        AND entityId = ?
        AND action = ?
      ORDER BY id ASC`,
    ['partner_settlement', partnerId, SIGNOFF_AUDIT_ACTION],
  );

  for (const row of rows) {
    const meta = parseJson(row?.description) || {};
    if (idempotencyKey && normalizeText(meta.idempotencyKey) === idempotencyKey) {
      return buildExistingSignoffResponse(partnerId, idempotencyKey, row, meta, 'idempotency-key');
    }
    if (settlementId && normalizeText(meta.settlementId) === settlementId) {
      return buildExistingSignoffResponse(partnerId, idempotencyKey, row, meta, 'settlement-id');
    }
    if (settlementFingerprint && normalizeText(meta.settlementFingerprint) === settlementFingerprint) {
      return buildExistingSignoffResponse(partnerId, idempotencyKey, row, meta, 'settlement-fingerprint');
    }
  }

  return null;
};

const assertExistingSignoffCompatible = (
  existing: ExistingSignoffResult,
  request: PartnerSettlementManagerSignoffRequest,
): PartnerSettlementManagerSignoffFailure | null => {
  const requestedSettlementId = normalizeText(request.settlementId);
  const requestedFingerprint = normalizeText(request.settlementFingerprint);
  if (existing.settlementId && requestedSettlementId && existing.settlementId !== requestedSettlementId) {
    return reject(
      'signoff-idempotency-conflict',
      'این کلید امضای مدیر قبلاً برای تسویه دیگری استفاده شده است.',
      { existingSettlementId: existing.settlementId },
    );
  }
  if (existing.settlementFingerprint && requestedFingerprint && existing.settlementFingerprint !== requestedFingerprint) {
    return reject(
      'signoff-idempotency-conflict',
      'این کلید امضای مدیر با اثرانگشت تسویه دیگری ثبت شده است.',
      { existingSettlementFingerprint: existing.settlementFingerprint },
    );
  }
  return null;
};

const validateRequest = (
  partnerId: number,
  request: PartnerSettlementManagerSignoffRequest,
): PartnerSettlementManagerSignoffFailure | null => {
  if (!Number.isFinite(partnerId) || partnerId <= 0) {
    return reject('missing-signoff-data', 'شناسه همکار برای ذخیره تایید مدیر معتبر نیست.');
  }

  const unsafeFields = collectUnsafeRequestFields(request);
  if (unsafeFields.length > 0) {
    return reject('missing-signoff-data', 'درخواست تایید مدیر شامل فیلدهای ناامن یا خارج از قرارداد است.', { fields: unsafeFields });
  }

  if (!normalizeText(request.settlementId) || !normalizeText(request.idempotencyKey) || !normalizeText(request.settlementFingerprint)) {
    return reject('missing-signoff-data', 'شناسه تسویه، کلید جلوگیری از تکرار و اثرانگشت تسویه برای ذخیره تایید مدیر الزامی است.');
  }

  if (request.managerSignoff?.confirmed !== true) {
    return reject('missing-signoff-confirmation', 'ذخیره تایید مدیر نیازمند تایید صریح مدیر یا ادمین است.');
  }

  return null;
};

const insertSignoffAuditRow = async (
  partnerId: number,
  request: PartnerSettlementManagerSignoffRequest,
  user: PartnerSettlementManagerSignoffUser,
  submittedSettlementRows: any[],
  signedAt: string,
): Promise<string> => {
  const meta = {
    phase: 'Business Phase 1T',
    settlementId: normalizeText(request.settlementId),
    idempotencyKey: normalizeText(request.idempotencyKey),
    settlementFingerprint: normalizeText(request.settlementFingerprint),
    sourceFingerprint: normalizeText(request.sourceFingerprint) || null,
    ledgerEntryIds: submittedSettlementRows.map((row: any) => String(row.id)),
    requestedLedgerEntryIds: normalizeLedgerEntryIds(request.ledgerEntryIds),
    reconciliationStatus: normalizeText(request.reconciliationStatus) || null,
    managerSignoff: {
      confirmed: true,
      confirmedByUserId: Number(request.managerSignoff?.confirmedByUserId || user.id || 0) || null,
      signoffText: normalizeText(request.managerSignoff?.signoffText) || 'manager-signoff-confirmed-from-partner-detail-ui',
    },
    signoffEvidence: request.signoffEvidence || null,
    signedAt,
    signedByUserId: user.id ?? null,
    signedByRole: normalizeRole(user.roleName),
    mutationScope,
  };

  const result = await runAsync(
    `INSERT INTO audit_logs (userId, username, role, action, entityType, entityId, description, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      user.id ?? null,
      user.username ?? null,
      normalizeRole(user.roleName) || null,
      SIGNOFF_AUDIT_ACTION,
      'partner_settlement',
      partnerId,
      JSON.stringify(meta),
      signedAt,
    ],
  );
  return String(result.lastID);
};

export const persistPartnerSettlementManagerSignoff = async (
  partnerIdInput: number,
  requestInput: PartnerSettlementManagerSignoffRequest,
  user: PartnerSettlementManagerSignoffUser,
): Promise<PartnerSettlementManagerSignoffResponse> => {
  await getDbInstance();
  const partnerId = Number(partnerIdInput);
  const request = requestInput || {};
  const roleName = normalizeRole(user?.roleName);

  if (!user?.id) return reject('unauthorized', 'برای ذخیره تایید مدیر ورود معتبر لازم است.');
  if (!ALLOWED_ROLES.includes(roleName as (typeof ALLOWED_ROLES)[number])) {
    return reject('forbidden', 'ذخیره تایید تسویه فقط برای Admin یا Manager مجاز است.');
  }

  const requestError = validateRequest(partnerId, request);
  if (requestError) return requestError;

  const idempotencyKey = normalizeText(request.idempotencyKey);
  const existing = await readExistingSignoff(partnerId, request);
  if (existing) {
    const conflict = existing.response.duplicateLock === 'idempotency-key'
      ? assertExistingSignoffCompatible(existing, request)
      : null;
    return conflict || existing.response;
  }

  const signedAt = new Date().toISOString();

  try {
    await execAsync('BEGIN IMMEDIATE TRANSACTION');

    const duplicateInTransaction = await readExistingSignoff(partnerId, request);
    if (duplicateInTransaction) {
      await execAsync('ROLLBACK');
      const conflict = duplicateInTransaction.response.duplicateLock === 'idempotency-key'
        ? assertExistingSignoffCompatible(duplicateInTransaction, request)
        : null;
      return conflict || duplicateInTransaction.response;
    }

    const submittedSettlementRows = await findSubmittedSettlementRows(partnerId, request);
    if (submittedSettlementRows.length === 0) {
      await execAsync('ROLLBACK');
      return reject('settlement-not-found', 'برای این تایید مدیر، تسویه اتمیک ثبت‌شده در دفتر همکار پیدا نشد.');
    }

    const signoffId = await insertSignoffAuditRow(partnerId, request, user, submittedSettlementRows, signedAt);

    await execAsync('COMMIT');

    return {
      ok: true,
      status: 'signed',
      partnerId,
      settlementId: normalizeText(request.settlementId),
      signoffId,
      idempotencyKey,
      signedAt,
      signedByRole: roleName as 'Admin' | 'Manager',
      mutationScope,
    };
  } catch (error: any) {
    try {
      await execAsync('ROLLBACK');
    } catch {
      // Keep the failure structured even if rollback was already closed by SQLite.
    }
    return reject('transaction-rolled-back', 'ذخیره تایید مدیر شکست خورد و تراکنش برگشت داده شد.', {
      message: String(error?.message || error),
    });
  }
};
