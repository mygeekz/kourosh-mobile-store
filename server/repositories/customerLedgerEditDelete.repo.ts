import { getAsync, runAsync } from "../db/query";
import { rebuildCustomerLedgerBalanceCache } from "../db/ledgerBalanceConsistency";
import { assertReasonableAccountingDate, normalizeAccountingMovement } from "../accounting/accountingEngine";
import { createLedgerReversal, getLedgerReversalLink } from "../accounting/accountingReversal";
import { recordAccountingAuditEvent, type AccountingAuditActor } from "../accounting/accountingAuditTrail";

const isImmutableCancellationLedgerEntry = (row: any): boolean => {
  const referenceType = String(row?.referenceType || "").trim().toLowerCase();
  return referenceType === "installment_cancellation_reversal" ||
    referenceType === "installment_cancellation_downpayment_refund_due" ||
    referenceType === "installment_cancellation_refund_payment";
};

const assertCancellationLedgerEntryMutable = (row: any): void => {
  if (isImmutableCancellationLedgerEntry(row)) {
    throw new Error("این سند سیستمیِ فسخ بخشی از تاریخچه حسابداری قرارداد است و قابل ویرایش یا حذف نیست.");
  }
};

const isManualCustomerLedgerEntry = (row: any): boolean => {
  const referenceType = String(row?.referenceType || "").trim().toLowerCase();
  return !referenceType || referenceType === "manual_accounting_document" || referenceType === "manual_customer_entry" || referenceType === "manual_payment" || referenceType === "manual_receipt";
};

const assertManualFinancialCorrectionAllowed = async (row: any): Promise<void> => {
  assertCancellationLedgerEntryMutable(row);
  if (!isManualCustomerLedgerEntry(row)) {
    throw new Error("این سند به فروش/قسط/چک یا عملیات سیستمی متصل است و باید از همان بخش منبع اصلاح شود؛ ویرایش مالی مستقیم دفتر مجاز نیست.");
  }
  const reversal = await getLedgerReversalLink("customer", Number(row.id));
  if (reversal) throw new Error("این سند قبلاً با سند برگشتی اصلاح شده و قابل ویرایش مجدد نیست.");
};

export type CustomerLedgerEditablePayload = {
  description?: string | null;
  debit?: number | string | null;
  credit?: number | string | null;
  transactionDate?: string | null;
  referenceType?: string | null;
  referenceId?: number | string | null;
};

export const recalcCustomerBalancesInternal = async (customerId: number): Promise<void> => {
  await rebuildCustomerLedgerBalanceCache(customerId);
};

export const recalcCustomerBalances = async (customerId: number): Promise<void> => {
  await rebuildCustomerLedgerBalanceCache(customerId);
};

export type CustomerLedgerEditDeleteDeps = {
  recalcCustomerBalances?: (customerId: number) => Promise<void>;
  actor?: AccountingAuditActor | null;
};

export const updateCustomerLedgerEntryInDb = async (
  customerId: number,
  entryId: number,
  data: Partial<CustomerLedgerEditablePayload>,
  deps: CustomerLedgerEditDeleteDeps = {},
): Promise<any> => {
  const row = await getAsync(`SELECT * FROM customer_ledger WHERE id = ?`, [entryId]);
  if (!row) throw new Error("رکورد دفتر یافت نشد");
  if (Number(row.customerId) !== Number(customerId)) throw new Error("عدم تطابق مشتری");
  assertCancellationLedgerEntryMutable(row);

  const rawDesc = (data as any)?.description;
  const rawDebit = (data as any)?.debit;
  const rawCred = (data as any)?.credit;
  const rawDate = (data as any)?.transactionDate;
  const description = rawDesc == null ? String(row.description || "") : String(rawDesc).trim();
  const debit = rawDebit == null || rawDebit === "" ? Number(row.debit || 0) : Number(rawDebit);
  const credit = rawCred == null || rawCred === "" ? Number(row.credit || 0) : Number(rawCred);
  const transactionDate = rawDate == null || rawDate === ""
    ? String(row.transactionDate || new Date().toISOString())
    : assertReasonableAccountingDate(rawDate);
  const movement = normalizeAccountingMovement({ debit, credit });
  const originalDirection = Number(row.debit || 0) > 0 ? "debit" : "credit";
  const requestedDirection = movement.debit > 0 ? "debit" : "credit";
  if (requestedDirection !== originalDirection) {
    throw new Error("جهت تراکنش دفتر مشتری در ویرایش قابل تغییر نیست؛ اصلاح جهت باید از سند منبع/مرکز تطبیق انجام شود.");
  }

  const referenceWasExplicitlyChanged =
    Object.prototype.hasOwnProperty.call(data || {}, "referenceType") ||
    Object.prototype.hasOwnProperty.call(data || {}, "referenceId");
  if (referenceWasExplicitlyChanged) {
    const requestedType = String((data as any).referenceType ?? row.referenceType ?? "").trim();
    const requestedIdRaw = (data as any).referenceId ?? row.referenceId ?? null;
    const requestedId = requestedIdRaw == null || requestedIdRaw === "" ? null : Number(requestedIdRaw);
    if (requestedType !== String(row.referenceType || "").trim() || requestedId !== (row.referenceId == null ? null : Number(row.referenceId))) {
      throw new Error("مرجع یک سند مالی از دفتر قابل تغییر مستقیم نیست؛ اصلاح باید از عملیات منبع انجام شود.");
    }
  }

  const financialChanged =
    Math.abs(movement.debit - Number(row.debit || 0)) > 0.00001 ||
    Math.abs(movement.credit - Number(row.credit || 0)) > 0.00001 ||
    String(transactionDate) !== String(row.transactionDate || "");
  const immutableManualSourceDescriptionChanged =
    String(row.referenceType || "").trim().toLowerCase() === "manual_accounting_document" &&
    description !== String(row.description || "");

  if (financialChanged || immutableManualSourceDescriptionChanged) {
    await assertManualFinancialCorrectionAllowed(row);
    const result = await createLedgerReversal({
      kind: "customer",
      originalLedgerId: entryId,
      reason: immutableManualSourceDescriptionChanged && !financialChanged
        ? "اصلاح علت سند مستقل دفتر مشتری"
        : "اصلاح مبلغ/تاریخ سند دستی دفتر مشتری",
      actor: deps.actor,
      replacement: {
        description,
        debit: movement.debit,
        credit: movement.credit,
        transactionDate,
        createManualDocument: true,
        replacesDocumentId: String(row.referenceType || "").trim().toLowerCase() === "manual_accounting_document"
          ? Number(row.referenceId || 0) || null
          : null,
      },
    });
    await (deps.recalcCustomerBalances || recalcCustomerBalances)(customerId);
    return result.replacementId
      ? await getAsync(`SELECT * FROM customer_ledger WHERE id = ?`, [result.replacementId])
      : row;
  }

  const updatedAt = new Date().toISOString();
  await runAsync(
    `UPDATE customer_ledger SET description = ?, updatedAt = ? WHERE id = ?`,
    [description, updatedAt, entryId],
  );
  const updated = await getAsync(`SELECT * FROM customer_ledger WHERE id = ?`, [entryId]);
  await recordAccountingAuditEvent({
    eventType: "ledger_metadata_updated",
    entityType: "customer_ledger",
    entityId: entryId,
    accountType: "customer",
    accountId: customerId,
    actor: deps.actor,
    reason: "description_only",
    before: row,
    after: updated,
    source: "customer_ledger_ui",
  });
  return updated;
};

export const deleteCustomerLedgerEntryFromDb = async (
  customerId: number,
  entryId: number,
  deps: CustomerLedgerEditDeleteDeps = {},
): Promise<boolean> => {
  const row = await getAsync(`SELECT * FROM customer_ledger WHERE id = ?`, [entryId]);
  if (!row) throw new Error("رکورد دفتر یافت نشد");
  if (Number(row.customerId) !== Number(customerId)) throw new Error("عدم تطابق مشتری");
  await assertManualFinancialCorrectionAllowed(row);

  await createLedgerReversal({
    kind: "customer",
    originalLedgerId: entryId,
    reason: "ابطال سند دستی دفتر مشتری",
    actor: deps.actor,
  });
  await (deps.recalcCustomerBalances || recalcCustomerBalances)(customerId);
  return true;
};
