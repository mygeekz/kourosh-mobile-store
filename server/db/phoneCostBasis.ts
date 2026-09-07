import { allAsync, runAsync } from "./query";

export type PhoneCostBasisSource =
  | "currentPurchasePrice"
  | "documentBuyPrice"
  | "purchasePrice";

export const toAccountingNumber = (value: any): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

export const resolvePhoneCostBasis = (
  phone: { currentPurchasePrice?: any; purchasePrice?: any } | null | undefined,
  documentBuyPrice?: any,
): { amount: number; source: PhoneCostBasisSource } => {
  const current = toAccountingNumber(phone?.currentPurchasePrice);
  const document = toAccountingNumber(documentBuyPrice);
  const original = toAccountingNumber(phone?.purchasePrice);
  if (current > 0) return { amount: current, source: "currentPurchasePrice" };
  if (document > 0) return { amount: document, source: "documentBuyPrice" };
  return { amount: original, source: "purchasePrice" };
};

export const resolvePhoneCostBasisAmount = (
  phone: { currentPurchasePrice?: any; purchasePrice?: any } | null | undefined,
  documentBuyPrice?: any,
): number => resolvePhoneCostBasis(phone, documentBuyPrice).amount;

export const syncPhoneCostBasisSnapshots = async (
  phoneId: number,
  costBasisAmount: number,
): Promise<void> => {
  // v338 historical-freeze compatibility shim.
  // Sale documents are accounting evidence and must never be rewritten merely
  // because today's phone cost basis changed. New sales persist their own
  // buyPrice at creation time, so this function intentionally performs no DB write.
  const phoneIdNum = Number(phoneId);
  const basis = toAccountingNumber(costBasisAmount);
  if (!Number.isInteger(phoneIdNum) || phoneIdNum <= 0 || basis <= 0) return;
};


/**
 * v338 compatibility diagnostic. Historical sale documents are immutable evidence;
 * the current phone row is NOT allowed to overwrite persisted sale-line buyPrice.
 */
export const reconcileAllPhoneCostBasisDocuments = async (): Promise<{
  phonesScanned: number;
  phonesWithBasis: number;
}> => {
  // v338: retained only for compatibility/diagnostics. It MUST NOT rewrite
  // sales_transactions, sales_order_items, or installment_sale_items.
  const rows = await allAsync(
    `SELECT id, purchasePrice, currentPurchasePrice FROM phones ORDER BY id ASC`,
  ).catch(() => [] as any[]);
  return { phonesScanned: rows.length, phonesWithBasis: 0 };
};
