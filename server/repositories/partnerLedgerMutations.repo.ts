import { execAsync, getAsync, runAsync } from "../db/query";
import { getPartnerLedgerCanonicalBalance, rebuildPartnerLedgerBalanceCache } from "../db/ledgerBalanceConsistency";
import { assertReasonableAccountingDate, normalizeAccountingMovement, normalizeAccountingReference } from "../accounting/accountingEngine";
import { recordAccountingAuditEvent, type AccountingAuditActor } from "../accounting/accountingAuditTrail";
import { createManualAccountingDocument } from "../accounting/manualAccountingDocument";

export type PartnerLedgerEntryPayload = {
  description: string;
  referenceMode?: "standalone" | null;
  debit?: number;
  credit?: number;
  transactionDate: string;
  referenceType?: string | null;
  referenceId?: number | null;
  settlementBatchId?: string | null;
  changeHistoryJson?: string | null;
};

export const addPartnerLedgerEntryInternal = async (
  partnerId: number,
  description: string,
  debit: number | undefined,
  credit: number | undefined,
  transactionDateISO?: string,
  referenceType?: string,
  referenceId?: number,
  settlementBatchId?: string,
  changeHistoryJson?: string | null,
  actor?: AccountingAuditActor | null,
): Promise<any> => {
  const dateToStore = assertReasonableAccountingDate(transactionDateISO || new Date().toISOString());
  const nowIso = new Date().toISOString();
  // `balance` on each row is only a display cache. The accounting source of truth
  // is the sum of ledger movements, so backdated rows cannot inherit a stale cache.
  const prevBalance = await getPartnerLedgerCanonicalBalance(partnerId);
  const movement = normalizeAccountingMovement({ debit, credit });
  const currentDebit = movement.debit;
  const currentCredit = movement.credit;
  const newBalance = prevBalance + currentCredit - currentDebit;
  const reference = normalizeAccountingReference({
    referenceType,
    referenceId,
    manualFallbackType: "",
  });
  if (!String(reference.referenceType || "").trim() || !Number(reference.referenceId || 0)) {
    throw new Error("هر سند دفتر همکار باید به یک سند مالی با شناسه معتبر متصل باشد.");
  }

  const result = await runAsync(
    `INSERT INTO partner_ledger (partnerId, transactionDate, createdAt, updatedAt, description, debit, credit, balance, referenceType, referenceId, settlementBatchId, changeHistoryJson) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      partnerId,
      dateToStore,
      nowIso,
      nowIso,
      description,
      currentDebit,
      currentCredit,
      newBalance,
      reference.referenceType,
      reference.referenceId,
      settlementBatchId || null,
      changeHistoryJson || null,
    ],
  );
  await rebuildPartnerLedgerBalanceCache(partnerId);
  const inserted = await getAsync("SELECT * FROM partner_ledger WHERE id = ?", [result.lastID]);
  const auditEvent = recordAccountingAuditEvent({
    eventType: "ledger_created",
    entityType: "partner_ledger",
    entityId: Number(result.lastID),
    accountType: "partner",
    accountId: partnerId,
    actor,
    reason: reference.referenceType,
    after: inserted,
    source: reference.referenceType === "manual_accounting_document" ? "manual_accounting_document" : "partner_ledger_system",
  });
  if (reference.referenceType === "manual_accounting_document") await auditEvent;
  else await auditEvent.catch(() => undefined);
  return inserted;
};

export const addPartnerLedgerEntryToDb = async (
  partnerId: number,
  entryData: PartnerLedgerEntryPayload,
  actor?: AccountingAuditActor | null,
): Promise<any> => {
  const {
    description,
    referenceMode,
    debit,
    credit,
    transactionDate,
    referenceType,
    referenceId,
    settlementBatchId,
    changeHistoryJson,
  } = entryData as any;
  if (String(referenceMode || "").trim().toLowerCase() !== "standalone") {
    throw new Error("ثبت دستی فقط با انتخاب «سند مستقل حسابداری» مجاز است.");
  }
  const movement = normalizeAccountingMovement({ debit, credit }, { allowBalancedPair: false });
  const requestedType = String(referenceType || "").trim().toLowerCase();
  if (referenceId != null || (requestedType && !["manual_accounting_document", "manual_partner_entry", "manual_payment", "manual_receipt"].includes(requestedType))) {
    throw new Error("مرجع سیستمی از فرم دفتر همکار قابل ثبت نیست؛ عملیات باید از بخش منبع انجام شود.");
  }
  const dateToStore = assertReasonableAccountingDate(transactionDate || new Date().toISOString());
  await execAsync("BEGIN IMMEDIATE TRANSACTION;");
  try {
    const document = await createManualAccountingDocument({
      accountType: "partner",
      accountId: partnerId,
      description,
      debit: movement.debit,
      credit: movement.credit,
      transactionDate: dateToStore,
      actor,
      documentKind: "standalone_adjustment",
    });
    const inserted = await addPartnerLedgerEntryInternal(
      partnerId,
      description,
      movement.debit,
      movement.credit,
      dateToStore,
      "manual_accounting_document",
      Number(document.id),
      settlementBatchId ? String(settlementBatchId).trim() : undefined,
      changeHistoryJson ? String(changeHistoryJson) : undefined,
      actor,
    );
    await execAsync("COMMIT;");
    return inserted;
  } catch (error) {
    await execAsync("ROLLBACK;").catch(() => undefined);
    throw error;
  }
};


/**
 * Trusted source path for a concrete phone settlement action. Unlike the
 * public manual-ledger function, this requires a real phone owned/supplied by
 * the same partner and the reference is fixed by the source operation.
 */
export const addPartnerPhoneSettlementLedgerEntryToDb = async (
  partnerId: number,
  phoneId: number,
  entryData: Omit<PartnerLedgerEntryPayload, "referenceMode" | "referenceType" | "referenceId">,
  actor?: AccountingAuditActor | null,
): Promise<any> => {
  const safePartnerId = Math.floor(Number(partnerId || 0));
  const safePhoneId = Math.floor(Number(phoneId || 0));
  if (safePartnerId <= 0 || safePhoneId <= 0) throw new Error("شناسه همکار/گوشی نامعتبر است.");
  const phone = await getAsync(
    `SELECT id, supplierId, status FROM phones WHERE id=? LIMIT 1`,
    [safePhoneId],
  );
  if (!phone?.id) throw new Error("گوشی مرجع یافت نشد.");
  if (Number(phone.supplierId || 0) !== safePartnerId) {
    throw new Error("گوشی مرجع متعلق به این تأمین‌کننده نیست.");
  }
  if (!['فروخته شده', 'فروخته شده (قسطی)'].includes(String(phone.status || '').trim())) {
    throw new Error("پرداخت سرمایه فقط برای گوشی فروخته‌شده قابل ثبت است.");
  }
  const movement = normalizeAccountingMovement(
    { debit: entryData.debit, credit: entryData.credit },
    { allowBalancedPair: false },
  );
  if (movement.debit <= 0 || movement.credit > 0) {
    throw new Error("پرداخت سرمایه گوشی باید به‌صورت Debit مثبت برای همکار ثبت شود.");
  }
  return await addPartnerLedgerEntryInternal(
    safePartnerId,
    String(entryData.description || "").trim(),
    movement.debit,
    0,
    entryData.transactionDate,
    "phone_settlement_payment",
    safePhoneId,
    entryData.settlementBatchId ? String(entryData.settlementBatchId).trim() : undefined,
    entryData.changeHistoryJson ? String(entryData.changeHistoryJson) : undefined,
    actor,
  );
};
