import { getAsync, runAsync } from "../db/query";

export type PartnerLedgerEntryPayload = {
  description: string;
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
): Promise<any> => {
  const dateToStore = transactionDateISO || new Date().toISOString();
  const nowIso = new Date().toISOString();
  const prevBalanceRow = await getAsync(
    `SELECT balance FROM partner_ledger WHERE partnerId = ? ORDER BY id DESC LIMIT 1`,
    [partnerId],
  );
  const prevBalance = prevBalanceRow ? prevBalanceRow.balance : 0;
  const currentDebit = debit || 0;
  const currentCredit = credit || 0;
  const newBalance = prevBalance + currentCredit - currentDebit;

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
      referenceType,
      referenceId,
      settlementBatchId || null,
      changeHistoryJson || null,
    ],
  );
  return await getAsync("SELECT * FROM partner_ledger WHERE id = ?", [
    result.lastID,
  ]);
};

export const addPartnerLedgerEntryToDb = async (
  partnerId: number,
  entryData: PartnerLedgerEntryPayload,
): Promise<any> => {
  const {
    description,
    debit,
    credit,
    transactionDate,
    referenceType,
    referenceId,
    settlementBatchId,
    changeHistoryJson,
  } = entryData as any;
  return await addPartnerLedgerEntryInternal(
    partnerId,
    description,
    debit,
    credit,
    transactionDate,
    referenceType || undefined,
    referenceId != null ? Number(referenceId) : undefined,
    settlementBatchId ? String(settlementBatchId).trim() : undefined,
    changeHistoryJson ? String(changeHistoryJson) : undefined,
  );
};
