import { allAsync, getAsync, runAsync } from "../db/query";
import { inferCustomerLedgerReference } from "./customerLedgerMutations.repo";


const isImmutableCancellationLedgerEntry = (row: any): boolean => {
  const referenceType = String(row?.referenceType || "").trim().toLowerCase();
  return referenceType === "installment_cancellation_reversal" ||
    referenceType === "installment_cancellation_downpayment_refund_due" ||
    referenceType === "installment_cancellation_refund_payment";
};

const assertCancellationLedgerEntryMutable = (row: any): void => {
  if (isImmutableCancellationLedgerEntry(row)) {
    throw new Error(
      "این سند سیستمیِ فسخ بخشی از تاریخچه حسابداری قرارداد است و قابل ویرایش یا حذف نیست.",
    );
  }
};

export type CustomerLedgerEditablePayload = {
  description?: string | null;
  debit?: number | string | null;
  credit?: number | string | null;
  transactionDate?: string | null;
  referenceType?: string | null;
  referenceId?: number | string | null;
};

export const recalcCustomerBalancesInternal = async (
  customerId: number,
): Promise<void> => {
  const rows = await allAsync(
    `SELECT id, debit, credit, transactionDate
       FROM customer_ledger
      WHERE customerId = ?
   ORDER BY datetime(transactionDate) ASC, id ASC`,
    [customerId],
  );

  let balance = 0;
  for (const r of rows) {
    balance = balance + (Number(r.debit) || 0) - (Number(r.credit) || 0);
    await runAsync(`UPDATE customer_ledger SET balance = ? WHERE id = ?`, [
      balance,
      r.id,
    ]);
  }
  try {
    await runAsync(`UPDATE customers SET currentBalance = ? WHERE id = ?`, [
      balance,
      customerId,
    ]);
  } catch (_e) {}
};

export const recalcCustomerBalances = async (
  customerId: number,
): Promise<void> => {
  await runAsync("BEGIN");
  try {
    await recalcCustomerBalancesInternal(customerId);
    await runAsync("COMMIT");
  } catch (e) {
    await runAsync("ROLLBACK");
    throw e;
  }
};

export type CustomerLedgerEditDeleteDeps = {
  recalcCustomerBalances?: (customerId: number) => Promise<void>;
};

export const updateCustomerLedgerEntryInDb = async (
  customerId: number,
  entryId: number,
  data: Partial<CustomerLedgerEditablePayload>,
  deps: CustomerLedgerEditDeleteDeps = {},
): Promise<any> => {
  const row = await getAsync(`SELECT * FROM customer_ledger WHERE id = ?`, [
    entryId,
  ]);
  if (!row) throw new Error("رکورد دفتر یافت نشد");
  if (Number(row.customerId) !== Number(customerId))
    throw new Error("عدم تطابق مشتری");
  assertCancellationLedgerEntryMutable(row);

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
  const explicitRefType = Object.prototype.hasOwnProperty.call(
    data || {},
    "referenceType",
  )
    ? (data as any).referenceType ?? null
    : row.referenceType;
  const explicitRefId = Object.prototype.hasOwnProperty.call(
    data || {},
    "referenceId",
  )
    ? (data as any).referenceId ?? null
    : row.referenceId;

  if ((debit > 0 && credit > 0) || (debit <= 0 && credit <= 0))
    throw new Error("مبالغ نامعتبر: فقط یکی از بدهکار/بستانکار و حتماً مثبت");

  const inferredRef = inferCustomerLedgerReference(description, debit, credit, {
    referenceType: explicitRefType,
    referenceId: explicitRefId,
  });

  await runAsync(
    `UPDATE customer_ledger
        SET description = ?, debit = ?, credit = ?, transactionDate = ?, updatedAt = ?, referenceType = ?, referenceId = ?
      WHERE id = ?`,
    [
      description,
      debit,
      credit,
      transactionDate,
      new Date().toISOString(),
      inferredRef.referenceType,
      inferredRef.referenceId,
      entryId,
    ],
  );

  await (deps.recalcCustomerBalances || recalcCustomerBalances)(customerId);
  return await getAsync(`SELECT * FROM customer_ledger WHERE id = ?`, [
    entryId,
  ]);
};

export const deleteCustomerLedgerEntryFromDb = async (
  customerId: number,
  entryId: number,
  deps: CustomerLedgerEditDeleteDeps = {},
): Promise<boolean> => {
  const row = await getAsync(
    `SELECT id, customerId, referenceType FROM customer_ledger WHERE id = ?`,
    [entryId],
  );
  if (!row) throw new Error("رکورد دفتر یافت نشد");
  if (Number(row.customerId) !== Number(customerId))
    throw new Error("عدم تطابق مشتری");
  assertCancellationLedgerEntryMutable(row);

  await runAsync(`DELETE FROM customer_ledger WHERE id = ?`, [entryId]);
  await (deps.recalcCustomerBalances || recalcCustomerBalances)(customerId);
  return true;
};
