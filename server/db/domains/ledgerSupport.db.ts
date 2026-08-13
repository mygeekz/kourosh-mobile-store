// Phase 1D: purchase/ledger helper cluster extracted from legacyRuntime.ts.

import { getAsync } from "../query";
import { addPartnerLedgerEntryInternal as addPartnerLedgerEntryInternalInRepo } from "../../repositories/partner";

export const addPartnerLedgerEntryInternal = async (
  // Made exportable if needed, but consider if it's truly public API
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
  return await addPartnerLedgerEntryInternalInRepo(
    partnerId,
    description,
    debit,
    credit,
    transactionDateISO,
    referenceType,
    referenceId,
    settlementBatchId,
    changeHistoryJson,
  );
};

export const PHONE_PURCHASE_LEDGER_REFERENCE_TYPES = [
  "phone_purchase",
  "phone_purchase_edit",
  "phone_purchase_reversal_on_edit",
] as const;

export const PRODUCT_PURCHASE_LEDGER_REFERENCE_TYPES = [
  "product_purchase",
  "product_purchase_edit",
] as const;

export const PURCHASE_LEDGER_REFERENCE_TYPE_SET = new Set<string>([
  ...PHONE_PURCHASE_LEDGER_REFERENCE_TYPES,
  ...PRODUCT_PURCHASE_LEDGER_REFERENCE_TYPES,
]);

export type LedgerChangeHistoryEntry = {
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

export const parseLedgerChangeHistory = (value: any): LedgerChangeHistoryEntry[] => {
  if (!value) return [];
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
};

export const stringifyLedgerChangeHistory = (
  existing: any,
  next: LedgerChangeHistoryEntry,
): string => {
  const history = parseLedgerChangeHistory(existing);
  history.push(next);
  return JSON.stringify(history);
};

export const buildPhonePurchaseDescription = (phone: {
  model?: string | null;
  imei?: string | null;
  id?: number | null;
  purchasePrice?: number | null;
  currentPurchasePrice?: number | null;
}) => {
  const price =
    Number(phone?.currentPurchasePrice ?? phone?.purchasePrice ?? 0) || 0;
  const label = [
    phone?.model || "گوشی",
    phone?.imei ? `IMEI: ${phone.imei}` : "",
    phone?.id ? `شناسه گوشی: ${phone.id}` : "",
  ]
    .filter(Boolean)
    .join(" • ");
  return `دریافت گوشی: ${label} به ارزش ${price.toLocaleString("fa-IR")}`;
};

export const fetchLatestPurchaseLedgerRowForReference = async (
  referenceId: number,
  referenceTypes: readonly string[],
) => {
  if (!referenceId || !referenceTypes.length) return null;
  const placeholders = referenceTypes.map(() => "?").join(", ");
  return await getAsync(
    `SELECT * FROM partner_ledger WHERE referenceId = ? AND referenceType IN (${placeholders}) ORDER BY datetime(COALESCE(updatedAt, createdAt, transactionDate)) DESC, id DESC LIMIT 1`,
    [referenceId, ...referenceTypes],
  );
};
