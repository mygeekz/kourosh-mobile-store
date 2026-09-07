import { execAsync, getAsync, runAsync } from "../db/query";
import { getCustomerLedgerRawCanonicalBalance, rebuildCustomerLedgerBalanceCache } from "../db/ledgerBalanceConsistency";
import { assertReasonableAccountingDate, normalizeAccountingMovement, normalizeAccountingReference } from "../accounting/accountingEngine";
import { recordAccountingAuditEvent, type AccountingAuditActor } from "../accounting/accountingAuditTrail";
import { createManualAccountingDocument } from "../accounting/manualAccountingDocument";

export type CustomerLedgerReferenceMeta = {
  referenceType?: string | null;
  referenceId?: number | null;
};

export type CustomerLedgerEntryPayload = {
  description: string;
  referenceMode?: "standalone" | null;
  debit?: number;
  credit?: number;
  transactionDate: string;
  referenceType?: string | null;
  referenceId?: number | null;
  settlementBatchId?: string | null;
};

export const inferCustomerLedgerReference = (
  description: string,
  debit?: number,
  credit?: number,
  explicit?: CustomerLedgerReferenceMeta,
): { referenceType: string | null; referenceId: number | null } => {
  if (explicit?.referenceType || explicit?.referenceId != null) {
    return {
      referenceType: explicit?.referenceType || null,
      referenceId:
        explicit?.referenceId == null
          ? null
          : Number(explicit.referenceId) || null,
    };
  }

  const desc = String(description || "").trim();
  const invoiceMatch = desc.match(
    /(?:فاکتور(?:\s*فروش)?|invoice)\s*(?:شماره|#)?\s*(\d+)/i,
  );
  const invoiceId = invoiceMatch ? Number(invoiceMatch[1]) || null : null;
  if (invoiceId) {
    if (Number(credit || 0) > 0 && Number(debit || 0) <= 0) {
      return { referenceType: "sales_order_receipt", referenceId: invoiceId };
    }
    if (Number(debit || 0) > 0) {
      return { referenceType: "sales_order_charge", referenceId: invoiceId };
    }
  }

  const legacySaleMatch = desc.match(/شناسه\s*فروش\s*:\s*(\d+)/i);
  const legacySaleId = legacySaleMatch ? Number(legacySaleMatch[1]) || null : null;
  if (legacySaleId && Number(debit || 0) > 0) {
    return { referenceType: "sales_transaction_charge", referenceId: legacySaleId };
  }

  return { referenceType: null, referenceId: null };
};


export const addCustomerLedgerEntryInternal = async (
  customerId: number,
  description: string,
  debit: number | undefined,
  credit: number | undefined,
  transactionDateISO?: string,
  meta?: CustomerLedgerReferenceMeta,
  actor?: AccountingAuditActor | null,
  origin: "system" | "manual" = "system",
): Promise<any> => {
  const dateToStore = assertReasonableAccountingDate(transactionDateISO || new Date().toISOString());
  const nowIso = new Date().toISOString();
  const prevBalance = await getCustomerLedgerRawCanonicalBalance(customerId);
  const movement = normalizeAccountingMovement({ debit, credit }, { allowBalancedPair: true });
  const currentDebit = movement.debit;
  const currentCredit = movement.credit;
  const newBalance = prevBalance + currentDebit - currentCredit;

  const sourceRef = normalizeAccountingReference({
    referenceType: meta?.referenceType,
    referenceId: meta?.referenceId,
    manualFallbackType: "",
  });
  if (!String(sourceRef.referenceType || "").trim() || !Number(sourceRef.referenceId || 0)) {
    throw new Error("هر سند دفتر مشتری باید به یک سند مالی با شناسه معتبر متصل باشد.");
  }

  const result = await runAsync(
    `INSERT INTO customer_ledger (customerId, transactionDate, createdAt, updatedAt, description, debit, credit, balance, referenceType, referenceId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      customerId,
      dateToStore,
      nowIso,
      nowIso,
      description,
      currentDebit,
      currentCredit,
      newBalance,
      sourceRef.referenceType,
      sourceRef.referenceId,
    ],
  );
  await rebuildCustomerLedgerBalanceCache(customerId);
  const inserted = await getAsync("SELECT * FROM customer_ledger WHERE id = ?", [result.lastID]);
  const auditEvent = recordAccountingAuditEvent({
    eventType: "ledger_created",
    entityType: "customer_ledger",
    entityId: Number(result.lastID),
    accountType: "customer",
    accountId: customerId,
    actor,
    reason: String(inserted?.referenceType || "accounting_source"),
    after: inserted,
    source: origin === "manual" ? "manual_accounting_document" : "customer_ledger_system",
  });
  if (origin === "manual") await auditEvent;
  else await auditEvent.catch(() => undefined);
  return inserted;
};

export const addCustomerLedgerEntryToDb = async (
  customerId: number,
  entryData: CustomerLedgerEntryPayload,
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
  } = entryData;
  if (String(referenceMode || "").trim().toLowerCase() !== "standalone") {
    throw new Error("ثبت دستی فقط با انتخاب «سند مستقل حسابداری» مجاز است.");
  }
    // Public/manual ledger entry contract is deliberately one-sided. The UI is a
  // standalone-document surface, not a way to forge a source reference.
  const movement = normalizeAccountingMovement({ debit, credit }, { allowBalancedPair: false });
  const requestedType = String(referenceType || "").trim().toLowerCase();
  if (referenceId != null || (requestedType && !["manual_accounting_document", "manual_customer_entry", "manual_payment", "manual_receipt"].includes(requestedType))) {
    throw new Error("مرجع سیستمی از فرم دفتر مشتری قابل ثبت نیست؛ عملیات باید از بخش منبع انجام شود.");
  }
  const dateToStore = assertReasonableAccountingDate(transactionDate || new Date().toISOString());
  await execAsync("BEGIN IMMEDIATE TRANSACTION;");
  try {
    const document = await createManualAccountingDocument({
      accountType: "customer",
      accountId: customerId,
      description,
      debit: movement.debit,
      credit: movement.credit,
      transactionDate: dateToStore,
      actor,
      documentKind: "standalone_adjustment",
    });
    const inserted = await addCustomerLedgerEntryInternal(
      customerId,
      description,
      movement.debit,
      movement.credit,
      dateToStore,
      { referenceType: "manual_accounting_document", referenceId: Number(document.id) },
      actor,
      "manual",
    );
    await execAsync("COMMIT;");
    return inserted;
  } catch (error) {
    await execAsync("ROLLBACK;").catch(() => undefined);
    throw error;
  }
};
