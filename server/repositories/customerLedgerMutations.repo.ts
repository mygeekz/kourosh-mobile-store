import { getAsync, runAsync } from "../db/query";

export type CustomerLedgerReferenceMeta = {
  referenceType?: string | null;
  referenceId?: number | null;
};

export type CustomerLedgerEntryPayload = {
  description: string;
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

  return { referenceType: null, referenceId: null };
};

export const addCustomerLedgerEntryInternal = async (
  customerId: number,
  description: string,
  debit: number | undefined,
  credit: number | undefined,
  transactionDateISO?: string,
  meta?: CustomerLedgerReferenceMeta,
): Promise<any> => {
  const dateToStore = transactionDateISO || new Date().toISOString();
  const nowIso = new Date().toISOString();
  const prevBalanceRow = await getAsync(
    `SELECT balance FROM customer_ledger WHERE customerId = ? ORDER BY id DESC LIMIT 1`,
    [customerId],
  );
  const prevBalance = prevBalanceRow ? prevBalanceRow.balance : 0;
  const currentDebit = debit || 0;
  const currentCredit = credit || 0;
  const newBalance = prevBalance + currentDebit - currentCredit;

  const inferredRef = inferCustomerLedgerReference(
    description,
    currentDebit,
    currentCredit,
    meta,
  );

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
      inferredRef.referenceType,
      inferredRef.referenceId,
    ],
  );
  return await getAsync("SELECT * FROM customer_ledger WHERE id = ?", [
    result.lastID,
  ]);
};

export const addCustomerLedgerEntryToDb = async (
  customerId: number,
  entryData: CustomerLedgerEntryPayload,
): Promise<any> => {
  const {
    description,
    debit,
    credit,
    transactionDate,
    referenceType,
    referenceId,
  } = entryData;
  return await addCustomerLedgerEntryInternal(
    customerId,
    description,
    debit,
    credit,
    transactionDate,
    { referenceType, referenceId },
  );
};
