import { runAsync } from "./query";

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
  const phoneIdNum = Number(phoneId);
  const basis = toAccountingNumber(costBasisAmount);
  if (!Number.isInteger(phoneIdNum) || phoneIdNum <= 0 || basis <= 0) return;
  await runAsync(
    `UPDATE sales_transactions SET buyPrice = ? WHERE itemType = 'phone' AND itemId = ?`,
    [basis, phoneIdNum],
  ).catch(() => undefined);
  await runAsync(
    `UPDATE sales_order_items SET buyPrice = ? WHERE itemType = 'phone' AND itemId = ?`,
    [basis, phoneIdNum],
  ).catch(() => undefined);
  await runAsync(
    `UPDATE installment_sale_items SET buyPrice = ? WHERE itemType = 'phone' AND itemId = ?`,
    [basis, phoneIdNum],
  ).catch(() => undefined);
};
