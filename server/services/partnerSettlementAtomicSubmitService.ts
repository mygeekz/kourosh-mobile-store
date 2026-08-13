import { createHash } from "node:crypto";
import { getDbInstance } from "../database";
import { allAsync, execAsync, getAsync, runAsync } from "../db/query";
import { partnersRepo } from "../repositories/partners.repo";

export type PartnerSettlementSubmitterRole = "Admin" | "Manager";

export type PartnerSettlementAtomicSubmitRequest = {
  settlementDraftId?: string;
  dryRunId?: string;
  idempotencyKey?: string;
  confirmedAmount?: number;
  confirmedLineIds?: number[];
  managerConfirmation?: {
    confirmed?: boolean;
    confirmedByUserId?: number;
    confirmationText?: string;
  };
};

export type PartnerSettlementAtomicSubmitSuccess = {
  ok: true;
  status: "submitted" | "already-submitted";
  partnerId: number;
  settlementId: string;
  ledgerEntryIds: string[];
  idempotencyKey: string;
  submittedAt: string;
  submittedByRole: PartnerSettlementSubmitterRole;
  mutationScope: {
    partnerLedger: true;
    inventory: false;
    accountingGlobal: false;
    pricing: false;
    ml: false;
  };
  duplicateLock?: "idempotency-key" | "dry-run-or-draft" | "source-fingerprint";
  settlementFingerprint?: string;
};

export type PartnerSettlementAtomicSubmitErrorReason =
  | "unauthorized"
  | "forbidden"
  | "missing-confirmation"
  | "missing-idempotency-key"
  | "dry-run-not-found"
  | "dry-run-stale"
  | "blocking-validation-errors"
  | "idempotency-conflict"
  | "missing-settlement-data"
  | "transaction-rolled-back";

export type PartnerSettlementAtomicSubmitFailure = {
  ok: false;
  status: "rejected";
  reason: PartnerSettlementAtomicSubmitErrorReason;
  message: string;
  details?: unknown;
};

export type PartnerSettlementAtomicSubmitResponse =
  | PartnerSettlementAtomicSubmitSuccess
  | PartnerSettlementAtomicSubmitFailure;

export type PartnerSettlementAtomicSubmitUser = {
  id?: number | null;
  username?: string | null;
  roleName?: string | null;
};

type SettlementCandidateLine = {
  id: number;
  label: string;
  identifier: string | null;
  amount: number;
  paidAmount: number;
  settlementPurchasePrice: number;
  sourceLabel: string | null;
  hasSource: boolean;
  hasCurrentPurchasePrice: boolean;
};

type SettlementDryRunSnapshot = {
  partnerId: number;
  amount: number;
  lineIds: number[];
  lines: SettlementCandidateLine[];
  settlementDraftId: string;
  dryRunId: string;
  blockingErrors: string[];
};

const REFERENCE_TYPE = "partner_settlement_atomic_submit";
const AUDIT_ACTION = "partner_settlement_atomic_submit";
const SETTLEMENT_ID_PREFIX = "partner-settlement-atomic";
const PARTNER_SETTLEMENT_ALLOWED_ROLES: PartnerSettlementSubmitterRole[] = [
  "Admin",
  "Manager",
];

const mutationScope = {
  partnerLedger: true,
  inventory: false,
  accountingGlobal: false,
  pricing: false,
  ml: false,
} as const;

const blockedRequestFieldNames = new Set(
  [
    ["override", "Amount"],
    ["force", "Submit"],
    ["skip", "Dry", "Run"],
    ["bypass", "Validation"],
    ["auto", "Approve"],
    ["mutate", "Inventory", "Directly"],
    ["mutate", "Accounting", "Directly"],
    ["model", "Score"],
    ["ml", "Decision"],
  ].map((parts) => parts.join("")),
);

const reject = (
  reason: PartnerSettlementAtomicSubmitErrorReason,
  message: string,
  details?: unknown,
): PartnerSettlementAtomicSubmitFailure => ({
  ok: false,
  status: "rejected",
  reason,
  message,
  ...(details !== undefined ? { details } : {}),
});

const normalizeText = (value: unknown): string => String(value || "").trim();
const normalizeNumber = (value: unknown): number => {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? numeric : 0;
};

const normalizeUserRole = (roleName: unknown): string => normalizeText(roleName);

const includesSoldStatus = (value: unknown): boolean => normalizeText(value).includes("فروخته");

const collectUnsafeRequestFields = (value: unknown, prefix = ""): string[] => {
  if (!value || typeof value !== "object") return [];
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

const buildPreviewIds = (partnerId: number, lineIds: number[], amount: number) => {
  const linePart = lineIds.length > 0 ? lineIds.join("-") : "no-lines";
  const amountPart = Number(amount || 0);
  return {
    dryRunId: `partner-${partnerId}-lines-${linePart}-amount-${amountPart}`,
    settlementDraftId: `partner-${partnerId}-draft-lines-${linePart}-amount-${amountPart}`,
  };
};

const stableJson = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (!value || typeof value !== "object") return JSON.stringify(value);
  return `{${Object.keys(value as Record<string, unknown>)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson((value as Record<string, unknown>)[key])}`)
    .join(",")}}`;
};

const sha256Fingerprint = (prefix: string, value: unknown): string =>
  `${prefix}:${createHash("sha256").update(stableJson(value)).digest("hex")}`;

const buildSettlementSourceFingerprint = (snapshot: SettlementDryRunSnapshot): string =>
  sha256Fingerprint("partner-settlement-source-v1", {
    partnerId: snapshot.partnerId,
    payableAmount: Number(snapshot.amount || 0),
    sourceRows: snapshot.lines
      .map((line) => ({
        amount: Number(line.amount || 0),
        lineId: Number(line.id || 0),
        paidAmount: Number(line.paidAmount || 0),
        settlementPurchasePrice: Number(line.settlementPurchasePrice || 0),
      }))
      .sort((a, b) => a.lineId - b.lineId),
  });

const buildSettlementFingerprint = (snapshot: SettlementDryRunSnapshot): string =>
  sha256Fingerprint("partner-settlement-draft-v1", {
    dryRunId: snapshot.dryRunId,
    partnerId: snapshot.partnerId,
    settlementDraftId: snapshot.settlementDraftId,
    sourceFingerprint: buildSettlementSourceFingerprint(snapshot),
  });

const normalizeLineIds = (lineIds: unknown): number[] =>
  Array.isArray(lineIds)
    ? lineIds
        .map(Number)
        .filter((lineId) => Number.isFinite(lineId) && lineId > 0)
        .sort((a, b) => a - b)
    : [];

const sameLineSet = (a: number[], b: number[]): boolean =>
  a.length > 0 &&
  a.length === b.length &&
  a.every((lineId, index) => lineId === b[index]);


const getAutoRecognizedPaidAmount = (row: any, settlementPurchasePrice: number): number => {
  const sourceType = normalizeText(row?.saleSourceType || row?.settlementPriceSource);
  const statusText = normalizeText(row?.status);
  const paymentMethodText = normalizeText(row?.salePaymentMethod).toLowerCase();
  const isInstallmentSale =
    sourceType === "installment_sale" ||
    statusText.includes("قسطی") ||
    paymentMethodText.includes("installment");
  const isCashSale =
    !isInstallmentSale &&
    (sourceType === "sales_order" || sourceType === "legacy_sale") &&
    !paymentMethodText.includes("credit") &&
    !paymentMethodText.includes("اعتبار");

  if (isInstallmentSale) {
    const installmentDownPayment = normalizeNumber(row?.installmentSaleDownPayment);
    const installmentTransactionPaid = normalizeNumber(row?.installmentSaleTransactionPaidAmount);
    const installmentCheckPaid = normalizeNumber(row?.installmentSaleCheckPaidAmount);
    return Math.min(
      settlementPurchasePrice,
      Math.max(0, installmentDownPayment + installmentTransactionPaid + installmentCheckPaid),
    );
  }

  return isCashSale ? settlementPurchasePrice : 0;
};

const buildCandidateLines = (purchaseHistory: any[]): SettlementCandidateLine[] =>
  purchaseHistory
    .filter((row) => row?.type === "phone" && includesSoldStatus(row?.status))
    .map((row) => {
      const settlementPurchasePrice = normalizeNumber(
        row?.settlementPurchasePrice ??
          row?.soldDailyPurchasePrice ??
          row?.purchasePrice ??
          row?.currentPurchasePrice ??
          row?.initialPurchasePrice,
      );
      const manualPaidAmount = normalizeNumber(
        row?.phoneSettlementManualPaidAmount ?? row?.phoneSettlementPaidAmount,
      );
      const autoRecognizedPaidAmount = getAutoRecognizedPaidAmount(row, settlementPurchasePrice);
      const paidAmount = Math.min(
        settlementPurchasePrice,
        Math.max(manualPaidAmount, autoRecognizedPaidAmount),
      );
      const amount = Math.max(0, settlementPurchasePrice - paidAmount);
      const sourceLabel = normalizeText(row?.settlementPriceSourceLabel || row?.saleReferenceLabel) || null;

      return {
        id: Number(row?.id || 0),
        label: normalizeText(row?.name || row?.model || "کالای فروخته‌شده"),
        identifier: normalizeText(row?.identifier) || null,
        amount,
        paidAmount,
        settlementPurchasePrice,
        sourceLabel,
        hasSource: Boolean(sourceLabel || row?.saleSourceType),
        hasCurrentPurchasePrice: settlementPurchasePrice > 0,
      };
    })
    .filter((line) => line.id > 0 && line.amount > 0)
    .sort((a, b) => a.id - b.id);

export const buildPartnerSettlementAtomicDryRunSnapshot = async (
  partnerId: number,
): Promise<SettlementDryRunSnapshot | null> => {
  await getDbInstance();
  const partner = await partnersRepo.getPartnerById(partnerId);
  if (!partner) return null;

  const purchaseHistory = await partnersRepo.getPurchasedItems(partnerId);
  const lines = buildCandidateLines(purchaseHistory);
  const blockingErrors = lines.flatMap((line) => [
    ...(line.hasSource ? [] : [`line-${line.id}:missing-source`]),
    ...(line.hasCurrentPurchasePrice ? [] : [`line-${line.id}:missing-current-purchase-price`]),
    ...(line.amount > 0 ? [] : [`line-${line.id}:missing-settlement-amount`]),
  ]);
  const lineIds = lines.map((line) => line.id);
  const amount = lines.reduce((sum, line) => sum + line.amount, 0);
  const ids = buildPreviewIds(partnerId, lineIds, amount);

  return {
    partnerId,
    amount,
    lineIds,
    lines,
    settlementDraftId: ids.settlementDraftId,
    dryRunId: ids.dryRunId,
    blockingErrors,
  };
};

type ExistingIdempotencyResult = {
  response: PartnerSettlementAtomicSubmitSuccess;
  settlementDraftId: string | null;
  dryRunId: string | null;
};

const parseLedgerMeta = (raw: unknown): any => {
  try {
    return raw ? JSON.parse(String(raw)) : null;
  } catch {
    return null;
  }
};

const readExistingIdempotencyResult = async (
  partnerId: number,
  idempotencyKey: string,
): Promise<ExistingIdempotencyResult | null> => {
  const rows = await allAsync(
    `SELECT id, transactionDate, changeHistoryJson
       FROM partner_ledger
      WHERE partnerId = ?
        AND settlementBatchId = ?
        AND referenceType = ?
      ORDER BY id ASC`,
    [partnerId, idempotencyKey, REFERENCE_TYPE],
  );

  if (!rows.length) return null;
  const meta = parseLedgerMeta(rows[0]?.changeHistoryJson);
  const submittedByRole =
    meta?.submittedByRole === "Manager" ? "Manager" : "Admin";
  return {
    settlementDraftId: meta?.settlementDraftId ? String(meta.settlementDraftId) : null,
    dryRunId: meta?.dryRunId ? String(meta.dryRunId) : null,
    response: {
      ok: true,
      status: "already-submitted",
      partnerId,
      settlementId: meta?.settlementId ? String(meta.settlementId) : `${SETTLEMENT_ID_PREFIX}-${partnerId}-${idempotencyKey}`,
      ledgerEntryIds: rows.map((row: any) => String(row.id)),
      idempotencyKey,
      submittedAt: String(meta?.submittedAt || rows[0]?.transactionDate || ""),
      submittedByRole,
      mutationScope,
      duplicateLock: "idempotency-key",
      settlementFingerprint: meta?.settlementFingerprint ? String(meta.settlementFingerprint) : undefined,
    },
  };
};

const assertIdempotencyCompatible = (
  existing: ExistingIdempotencyResult,
  request: PartnerSettlementAtomicSubmitRequest,
): PartnerSettlementAtomicSubmitFailure | null => {
  if (
    existing.settlementDraftId &&
    request.settlementDraftId &&
    existing.settlementDraftId !== request.settlementDraftId
  ) {
    return reject(
      "idempotency-conflict",
      "این کلید جلوگیری از تکرار قبلاً برای پیش‌نویس تسویه دیگری استفاده شده است.",
      { existingSettlementDraftId: existing.settlementDraftId },
    );
  }

  if (existing.dryRunId && request.dryRunId && existing.dryRunId !== request.dryRunId) {
    return reject(
      "idempotency-conflict",
      "این کلید جلوگیری از تکرار قبلاً برای dry-run دیگری استفاده شده است.",
      { existingDryRunId: existing.dryRunId },
    );
  }

  return null;
};

const validateRequiredRequest = (
  partnerId: number,
  request: PartnerSettlementAtomicSubmitRequest,
): PartnerSettlementAtomicSubmitFailure | null => {
  if (!Number.isFinite(partnerId) || partnerId <= 0) {
    return reject("missing-settlement-data", "شناسه همکار نامعتبر است.");
  }

  const unsafeFields = collectUnsafeRequestFields(request);
  if (unsafeFields.length > 0) {
    return reject(
      "blocking-validation-errors",
      "درخواست شامل فیلدهای ناامن یا خارج از قرارداد تسویه است.",
      { fields: unsafeFields },
    );
  }

  if (!normalizeText(request.idempotencyKey)) {
    return reject("missing-idempotency-key", "کلید جلوگیری از ثبت تکراری الزامی است.");
  }

  if (!normalizeText(request.settlementDraftId) || !normalizeText(request.dryRunId)) {
    return reject("dry-run-not-found", "شناسه پیش‌نویس تسویه و dry-run معتبر الزامی است.");
  }

  if (request.managerConfirmation?.confirmed !== true) {
    return reject("missing-confirmation", "تایید صریح مدیر یا ادمین برای ثبت تسویه الزامی است.");
  }

  return null;
};

const validateDryRunSnapshot = (
  snapshot: SettlementDryRunSnapshot | null,
  request: PartnerSettlementAtomicSubmitRequest,
): PartnerSettlementAtomicSubmitFailure | null => {
  if (!snapshot) {
    return reject("dry-run-not-found", "dry-run تسویه برای همکار پیدا نشد.");
  }

  if (snapshot.lines.length === 0 || snapshot.amount <= 0) {
    return reject("missing-settlement-data", "داده قابل تسویه برای ثبت اتمیک موجود نیست.");
  }

  if (snapshot.blockingErrors.length > 0) {
    return reject(
      "blocking-validation-errors",
      "dry-run شامل خطاهای مسدودکننده است و قابل ثبت نیست.",
      { blockingErrors: snapshot.blockingErrors },
    );
  }

  if (normalizeText(request.dryRunId) !== snapshot.dryRunId) {
    return reject("dry-run-stale", "شناسه dry-run با داده فعلی تسویه همخوان نیست.", {
      expectedDryRunId: snapshot.dryRunId,
    });
  }

  if (normalizeText(request.settlementDraftId) !== snapshot.settlementDraftId) {
    return reject("dry-run-stale", "شناسه پیش‌نویس تسویه با داده فعلی همخوان نیست.", {
      expectedSettlementDraftId: snapshot.settlementDraftId,
    });
  }

  if (
    request.confirmedAmount != null &&
    Math.abs(Number(request.confirmedAmount) - snapshot.amount) > 0.0001
  ) {
    return reject("dry-run-stale", "مبلغ تاییدشده با خروجی dry-run فعلی همخوان نیست.", {
      expectedAmount: snapshot.amount,
    });
  }

  if (Array.isArray(request.confirmedLineIds) && request.confirmedLineIds.length > 0) {
    const requestedLineIds = request.confirmedLineIds.map(Number).sort((a, b) => a - b);
    const expected = snapshot.lineIds.join(",");
    if (requestedLineIds.join(",") !== expected) {
      return reject("dry-run-stale", "ردیف‌های تاییدشده با خروجی dry-run فعلی همخوان نیست.", {
        expectedLineIds: snapshot.lineIds,
      });
    }
  }

  return null;
};


type ExistingDuplicateSettlementResult = {
  response: PartnerSettlementAtomicSubmitSuccess;
  duplicateLock: "dry-run-or-draft" | "source-fingerprint";
};

const buildExistingDuplicateResponse = (
  partnerId: number,
  idempotencyKey: string,
  rows: any[],
  meta: any,
  duplicateLock: "dry-run-or-draft" | "source-fingerprint",
): ExistingDuplicateSettlementResult => {
  const submittedByRole = meta?.submittedByRole === "Manager" ? "Manager" : "Admin";
  return {
    duplicateLock,
    response: {
      ok: true,
      status: "already-submitted",
      partnerId,
      settlementId: meta?.settlementId ? String(meta.settlementId) : `${SETTLEMENT_ID_PREFIX}-${partnerId}-${String(rows[0]?.settlementBatchId || idempotencyKey)}`,
      ledgerEntryIds: rows.map((row: any) => String(row.id)),
      idempotencyKey,
      submittedAt: String(meta?.submittedAt || rows[0]?.transactionDate || ""),
      submittedByRole,
      mutationScope,
      duplicateLock,
      settlementFingerprint: meta?.settlementFingerprint ? String(meta.settlementFingerprint) : undefined,
    },
  };
};

const readExistingDuplicateSettlementResult = async (
  partnerId: number,
  request: PartnerSettlementAtomicSubmitRequest,
  options: {
    settlementFingerprint?: string | null;
    sourceFingerprint?: string | null;
    sourceLineIds?: number[];
  } = {},
): Promise<ExistingDuplicateSettlementResult | null> => {
  const rows = await allAsync(
    `SELECT id, transactionDate, settlementBatchId, referenceId, changeHistoryJson
       FROM partner_ledger
      WHERE partnerId = ?
        AND referenceType = ?
      ORDER BY id ASC`,
    [partnerId, REFERENCE_TYPE],
  );

  const groups = new Map<string, any[]>();
  for (const row of rows) {
    const meta = parseLedgerMeta(row?.changeHistoryJson) || {};
    const groupKey = String(meta?.settlementId || row?.settlementBatchId || row?.id);
    groups.set(groupKey, [...(groups.get(groupKey) || []), row]);
  }

  const requestedDraftId = normalizeText(request.settlementDraftId);
  const requestedDryRunId = normalizeText(request.dryRunId);
  const requestedLineIds = normalizeLineIds(options.sourceLineIds ?? request.confirmedLineIds);

  for (const groupedRows of groups.values()) {
    const parsedRows = groupedRows.map((row) => ({ row, meta: parseLedgerMeta(row?.changeHistoryJson) || {} }));
    const representative = parsedRows[0]?.meta || {};
    const persistedLineIds = normalizeLineIds(
      representative.sourceLineIds || parsedRows.map(({ row }) => Number(row?.referenceId || 0)),
    );

    if (
      (requestedDraftId && representative.settlementDraftId === requestedDraftId) ||
      (requestedDryRunId && representative.dryRunId === requestedDryRunId)
    ) {
      return buildExistingDuplicateResponse(partnerId, normalizeText(request.idempotencyKey), groupedRows, representative, "dry-run-or-draft");
    }

    if (
      (options.settlementFingerprint && representative.settlementFingerprint === options.settlementFingerprint) ||
      (options.sourceFingerprint && representative.sourceFingerprint === options.sourceFingerprint) ||
      sameLineSet(requestedLineIds, persistedLineIds)
    ) {
      return buildExistingDuplicateResponse(partnerId, normalizeText(request.idempotencyKey), groupedRows, representative, "source-fingerprint");
    }
  }

  return null;
};

const insertLedgerRows = async (
  partnerId: number,
  snapshot: SettlementDryRunSnapshot,
  idempotencyKey: string,
  settlementId: string,
  submittedAt: string,
  user: PartnerSettlementAtomicSubmitUser,
  settlementFingerprint: string,
  sourceFingerprint: string,
): Promise<string[]> => {
  const insertedIds: string[] = [];
  for (const line of snapshot.lines) {
    const previous = await getAsync(
      `SELECT balance
         FROM partner_ledger
        WHERE partnerId = ?
        ORDER BY id DESC
        LIMIT 1`,
      [partnerId],
    );
    const previousBalance = normalizeNumber(previous?.balance);
    const debit = line.amount;
    const credit = 0;
    const balance = previousBalance + credit - debit;
    const meta = JSON.stringify({
      phase: "Business Phase 1L",
      settlementId,
      settlementDraftId: snapshot.settlementDraftId,
      dryRunId: snapshot.dryRunId,
      idempotencyKey,
      submittedAt,
      submittedByUserId: user.id ?? null,
      submittedByRole: normalizeUserRole(user.roleName),
      lineId: line.id,
      sourceLineIds: snapshot.lineIds,
      settlementFingerprint,
      sourceFingerprint,
      duplicateLock: "source-fingerprint",
      mutationScope,
    });

    const result = await runAsync(
      `INSERT INTO partner_ledger (
        partnerId,
        transactionDate,
        createdAt,
        updatedAt,
        description,
        debit,
        credit,
        balance,
        referenceType,
        referenceId,
        settlementBatchId,
        changeHistoryJson
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        partnerId,
        submittedAt,
        submittedAt,
        submittedAt,
        `تسویه اتمیک مدیر برای ${line.label}${line.identifier ? ` (${line.identifier})` : ""}`,
        debit,
        credit,
        balance,
        REFERENCE_TYPE,
        line.id,
        idempotencyKey,
        meta,
      ],
    );
    insertedIds.push(String(result.lastID));
  }
  return insertedIds;
};

const insertAuditRow = async (
  partnerId: number,
  snapshot: SettlementDryRunSnapshot,
  idempotencyKey: string,
  settlementId: string,
  submittedAt: string,
  user: PartnerSettlementAtomicSubmitUser,
  settlementFingerprint: string,
  sourceFingerprint: string,
): Promise<void> => {
  await runAsync(
    `INSERT INTO audit_logs (userId, username, role, action, entityType, entityId, description, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      user.id ?? null,
      user.username ?? null,
      normalizeUserRole(user.roleName) || null,
      AUDIT_ACTION,
      "partner_ledger",
      partnerId,
      JSON.stringify({
        phase: "Business Phase 1L",
        settlementId,
        settlementDraftId: snapshot.settlementDraftId,
        dryRunId: snapshot.dryRunId,
        idempotencyKey,
        amount: snapshot.amount,
        lineIds: snapshot.lineIds,
        settlementFingerprint,
        sourceFingerprint,
        mutationScope,
      }),
      submittedAt,
    ],
  );
};

export const submitPartnerSettlementAtomic = async (
  partnerIdInput: number,
  requestInput: PartnerSettlementAtomicSubmitRequest,
  user: PartnerSettlementAtomicSubmitUser,
): Promise<PartnerSettlementAtomicSubmitResponse> => {
  await getDbInstance();
  const partnerId = Number(partnerIdInput);
  const request = requestInput || {};
  const roleName = normalizeUserRole(user?.roleName);

  if (!user?.id) return reject("unauthorized", "برای ثبت تسویه ورود معتبر لازم است.");
  if (!PARTNER_SETTLEMENT_ALLOWED_ROLES.includes(roleName as PartnerSettlementSubmitterRole)) {
    return reject("forbidden", "ثبت تسویه اتمیک فقط برای Admin یا Manager مجاز است.");
  }

  const requiredError = validateRequiredRequest(partnerId, request);
  if (requiredError) return requiredError;

  const idempotencyKey = normalizeText(request.idempotencyKey);
  const existing = await readExistingIdempotencyResult(partnerId, idempotencyKey);
  if (existing) {
    const conflict = assertIdempotencyCompatible(existing, request);
    return conflict || existing.response;
  }

  const settlementId = `${SETTLEMENT_ID_PREFIX}-${partnerId}-${idempotencyKey}`;
  const submittedAt = new Date().toISOString();

  try {
    await execAsync("BEGIN IMMEDIATE TRANSACTION");

    const duplicateInTransaction = await readExistingIdempotencyResult(partnerId, idempotencyKey);
    if (duplicateInTransaction) {
      await execAsync("ROLLBACK");
      const conflict = assertIdempotencyCompatible(duplicateInTransaction, request);
      return conflict || duplicateInTransaction.response;
    }

    const duplicateByDraftOrDryRun = await readExistingDuplicateSettlementResult(partnerId, request);
    if (duplicateByDraftOrDryRun) {
      await execAsync("ROLLBACK");
      return duplicateByDraftOrDryRun.response;
    }

    const transactionSnapshot = await buildPartnerSettlementAtomicDryRunSnapshot(partnerId);
    const transactionDryRunError = validateDryRunSnapshot(transactionSnapshot, request);
    if (transactionDryRunError || !transactionSnapshot) {
      await execAsync("ROLLBACK");
      return transactionDryRunError || reject("dry-run-not-found", "dry-run تسویه هنگام تراکنش پیدا نشد.");
    }

    const settlementFingerprint = buildSettlementFingerprint(transactionSnapshot);
    const sourceFingerprint = buildSettlementSourceFingerprint(transactionSnapshot);
    const duplicateByFingerprint = await readExistingDuplicateSettlementResult(partnerId, request, {
      settlementFingerprint,
      sourceFingerprint,
      sourceLineIds: transactionSnapshot.lineIds,
    });
    if (duplicateByFingerprint) {
      await execAsync("ROLLBACK");
      return duplicateByFingerprint.response;
    }

    const ledgerEntryIds = await insertLedgerRows(
      partnerId,
      transactionSnapshot,
      idempotencyKey,
      settlementId,
      submittedAt,
      user,
      settlementFingerprint,
      sourceFingerprint,
    );
    await insertAuditRow(
      partnerId,
      transactionSnapshot,
      idempotencyKey,
      settlementId,
      submittedAt,
      user,
      settlementFingerprint,
      sourceFingerprint,
    );

    await execAsync("COMMIT");

    return {
      ok: true,
      status: "submitted",
      partnerId,
      settlementId,
      ledgerEntryIds,
      idempotencyKey,
      submittedAt,
      submittedByRole: roleName as PartnerSettlementSubmitterRole,
      mutationScope,
      settlementFingerprint,
    };
  } catch (error: any) {
    try {
      await execAsync("ROLLBACK");
    } catch {
      // Ignore rollback errors; the structured response still communicates rollback failure boundary.
    }
    return reject("transaction-rolled-back", "ثبت تسویه اتمیک شکست خورد و تراکنش برگشت داده شد.", {
      message: String(error?.message || error),
    });
  }
};
