import { allAsync, getAsync, runAsync } from "../db/query";

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

export const recalcPartnerBalances = async (partnerId: number): Promise<void> => {
  const rows = await allAsync(
    `SELECT id, debit, credit, transactionDate
       FROM partner_ledger
      WHERE partnerId = ?
   ORDER BY datetime(transactionDate) ASC, id ASC`,
    [partnerId],
  );

  let balance = 0;
  await runAsync("BEGIN");
  try {
    for (const r of rows) {
      const d = Number(r.debit) || 0;
      const c = Number(r.credit) || 0;
      // در دفتر همکار، credit یعنی بدهی به همکار بیشتر شده و debit یعنی پرداخت/تسویه.
      balance = balance + c - d;
      await runAsync(`UPDATE partner_ledger SET balance = ? WHERE id = ?`, [
        balance,
        r.id,
      ]);
    }
    await runAsync("COMMIT");
  } catch (e) {
    await runAsync("ROLLBACK");
    throw e;
  }
};

export type PartnerLedgerEditDeleteDeps = {
  recalcPartnerBalances?: (partnerId: number) => Promise<void>;
};

export const updatePartnerLedgerEntryInDb = async (
  partnerId: number,
  entryId: number,
  data: Partial<PartnerLedgerEditablePayload>,
  deps: PartnerLedgerEditDeleteDeps = {},
): Promise<any> => {
  const row = await getAsync(`SELECT * FROM partner_ledger WHERE id = ?`, [
    entryId,
  ]);
  if (!row) throw new Error("رکورد دفتر یافت نشد");
  if (Number(row.partnerId) !== Number(partnerId))
    throw new Error("عدم تطابق همکار");

  const rawDesc = (data as any)?.description;
  const rawDebit = (data as any)?.debit;
  const rawCred = (data as any)?.credit;
  const rawDate = (data as any)?.transactionDate;

  const description =
    rawDesc == null ? row.description : String(rawDesc).trim();
  const debit =
    rawDebit == null || rawDebit === "" ? row.debit : Number(rawDebit) || 0;
  const credit =
    rawCred == null || rawCred === "" ? row.credit : Number(rawCred) || 0;
  const transactionDate =
    rawDate && !Number.isNaN(Date.parse(rawDate))
      ? new Date(rawDate).toISOString()
      : row.transactionDate;

  // Exactly one of debit/credit must be > 0
  if ((debit > 0 && credit > 0) || (debit <= 0 && credit <= 0)) {
    throw new Error("مبالغ نامعتبر: فقط یکی از بدهکار/بستانکار و حتماً مثبت");
  }

  const updatedAt = new Date().toISOString();
  const changeHistoryJson = stringifyLedgerChangeHistory(
    (row as any)?.changeHistoryJson,
    {
      changedAt: updatedAt,
      reason: "manual_edit",
      before: {
        description: row.description,
        debit: row.debit,
        credit: row.credit,
        transactionDate: row.transactionDate,
        referenceType: row.referenceType ?? null,
        referenceId: row.referenceId ?? null,
      },
      after: {
        description,
        debit,
        credit,
        transactionDate,
        referenceType: row.referenceType ?? null,
        referenceId: row.referenceId ?? null,
      },
    },
  );

  await runAsync(
    `UPDATE partner_ledger
        SET description = ?, debit = ?, credit = ?, transactionDate = ?, updatedAt = ?, changeHistoryJson = ?
      WHERE id = ?`,
    [
      description,
      debit,
      credit,
      transactionDate,
      updatedAt,
      changeHistoryJson,
      entryId,
    ],
  );

  await (deps.recalcPartnerBalances || recalcPartnerBalances)(partnerId);
  return await getAsync(`SELECT * FROM partner_ledger WHERE id = ?`, [entryId]);
};

export const deletePartnerLedgerEntryFromDb = async (
  partnerId: number,
  entryId: number,
  deps: PartnerLedgerEditDeleteDeps = {},
): Promise<boolean> => {
  const row = await getAsync(
    `SELECT id, partnerId FROM partner_ledger WHERE id = ?`,
    [entryId],
  );
  if (!row) throw new Error("رکورد دفتر یافت نشد");
  if (Number(row.partnerId) !== Number(partnerId))
    throw new Error("عدم تطابق همکار");

  await runAsync(`DELETE FROM partner_ledger WHERE id = ?`, [entryId]);
  await (deps.recalcPartnerBalances || recalcPartnerBalances)(partnerId);
  return true;
};
