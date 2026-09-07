import { getAsync, runAsync } from "../db/query";
import { rebuildPartnerLedgerBalanceCache } from "../db/ledgerBalanceConsistency";
import { assertReasonableAccountingDate, normalizeAccountingMovement } from "../accounting/accountingEngine";
import { createLedgerReversal, getLedgerReversalLink } from "../accounting/accountingReversal";
import { recordAccountingAuditEvent, type AccountingAuditActor } from "../accounting/accountingAuditTrail";

export type PartnerLedgerEditablePayload = {
  description?: string | null;
  debit?: number | string | null;
  credit?: number | string | null;
  transactionDate?: string | null;
};

type LedgerChangeHistoryEntry = {
  changedAt: string;
  reason?: string;
  actor?: {
    userId?: number | null;
    username?: string | null;
    displayName?: string | null;
  } | null;
  before?: Record<string, any> | null;
  after?: Record<string, any> | null;
  note?: string | null;
};

const parseLedgerChangeHistory = (value: any): LedgerChangeHistoryEntry[] => {
  if (!value) return [];
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
};

const stringifyLedgerChangeHistory = (
  existing: any,
  next: LedgerChangeHistoryEntry,
): string => {
  const history = parseLedgerChangeHistory(existing);
  history.push(next);
  return JSON.stringify(history);
};

const isManualPartnerLedgerEntry = (row: any): boolean => {
  const referenceType = String(row?.referenceType || "").trim().toLowerCase();
  return !referenceType || referenceType === "manual_accounting_document" || referenceType === "manual_partner_entry" || referenceType === "manual_payment" || referenceType === "manual_receipt";
};

const assertManualCorrectionAllowed = async (row: any): Promise<void> => {
  if (!isManualPartnerLedgerEntry(row)) {
    throw new Error("این سند به یک عملیات سیستمی متصل است و باید از همان بخش منبع اصلاح شود؛ ویرایش مستقیم دفتر مجاز نیست.");
  }
  const reversal = await getLedgerReversalLink("partner", Number(row.id));
  if (reversal) {
    throw new Error("این سند قبلاً با سند برگشتی اصلاح شده و قابل ویرایش مجدد نیست.");
  }
};

export const recalcPartnerBalances = async (partnerId: number): Promise<void> => {
  await rebuildPartnerLedgerBalanceCache(partnerId);
};

export type PartnerLedgerEditDeleteDeps = {
  recalcPartnerBalances?: (partnerId: number) => Promise<void>;
  actor?: AccountingAuditActor | null;
};

export const updatePartnerLedgerEntryInDb = async (
  partnerId: number,
  entryId: number,
  data: Partial<PartnerLedgerEditablePayload>,
  deps: PartnerLedgerEditDeleteDeps = {},
): Promise<any> => {
  const row = await getAsync(`SELECT * FROM partner_ledger WHERE id = ?`, [entryId]);
  if (!row) throw new Error("رکورد دفتر یافت نشد");
  if (Number(row.partnerId) !== Number(partnerId)) throw new Error("عدم تطابق همکار");

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
    throw new Error("جهت تراکنش دفتر در ویرایش قابل تغییر نیست؛ برای اصلاح جهت از سند منبع/مرکز تطبیق استفاده کنید.");
  }

  const financialChanged =
    Math.abs(movement.debit - Number(row.debit || 0)) > 0.00001 ||
    Math.abs(movement.credit - Number(row.credit || 0)) > 0.00001 ||
    String(transactionDate) !== String(row.transactionDate || "");
  const immutableManualSourceDescriptionChanged =
    String(row.referenceType || "").trim().toLowerCase() === "manual_accounting_document" &&
    description !== String(row.description || "");

  if (financialChanged || immutableManualSourceDescriptionChanged) {
    await assertManualCorrectionAllowed(row);
    const result = await createLedgerReversal({
      kind: "partner",
      originalLedgerId: entryId,
      reason: immutableManualSourceDescriptionChanged && !financialChanged
        ? "اصلاح علت سند مستقل دفتر همکار"
        : "اصلاح مبلغ/تاریخ سند دفتر همکار",
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
    await (deps.recalcPartnerBalances || recalcPartnerBalances)(partnerId);
    return result.replacementId
      ? await getAsync(`SELECT * FROM partner_ledger WHERE id = ?`, [result.replacementId])
      : row;
  }

  // Description-only edits are metadata corrections and do not alter money/time.
  const updatedAt = new Date().toISOString();
  const changeHistoryJson = stringifyLedgerChangeHistory((row as any)?.changeHistoryJson, {
    changedAt: updatedAt,
    reason: "manual_description_edit",
    before: { description: row.description },
    after: { description },
  });
  await runAsync(
    `UPDATE partner_ledger SET description = ?, updatedAt = ?, changeHistoryJson = ? WHERE id = ?`,
    [description, updatedAt, changeHistoryJson, entryId],
  );
  const updated = await getAsync(`SELECT * FROM partner_ledger WHERE id = ?`, [entryId]);
  await recordAccountingAuditEvent({
    eventType: "ledger_metadata_updated",
    entityType: "partner_ledger",
    entityId: entryId,
    accountType: "partner",
    accountId: partnerId,
    actor: deps.actor,
    reason: "description_only",
    before: row,
    after: updated,
    source: "partner_ledger_ui",
  });
  return updated;
};

export const deletePartnerLedgerEntryFromDb = async (
  partnerId: number,
  entryId: number,
  deps: PartnerLedgerEditDeleteDeps = {},
): Promise<boolean> => {
  const row = await getAsync(`SELECT * FROM partner_ledger WHERE id = ?`, [entryId]);
  if (!row) throw new Error("رکورد دفتر یافت نشد");
  if (Number(row.partnerId) !== Number(partnerId)) throw new Error("عدم تطابق همکار");
  await assertManualCorrectionAllowed(row);

  await createLedgerReversal({
    kind: "partner",
    originalLedgerId: entryId,
    reason: "ابطال سند دستی دفتر همکار",
    actor: deps.actor,
  });
  await (deps.recalcPartnerBalances || recalcPartnerBalances)(partnerId);
  return true;
};
