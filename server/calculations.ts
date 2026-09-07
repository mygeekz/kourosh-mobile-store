import { calculateAccountingBalanceFromMovements, calculateInstallmentContractAccountingState, calculateSalesAccountingSummary } from "./accounting/accountingEngine";

/*
 * Helper functions for unified calculation of sales orders and installments.
 *
 * The project previously duplicated logic for computing subtotals, discounts and taxes
 * directly inside the createSalesOrder function. To make the code easier to check and
 * maintain we extract these calculations into their own module. In the future the
 * same helpers can be reused by invoice generation or dashboard analytics.
 */

export interface CartLine {
  quantity: number;
  unitPrice: number;
  discountPerItem?: number;
}

export interface SalesSummary {
  subtotal: number;
  itemsDiscount: number;
  taxableAmount: number;
  taxAmount: number;
  grandTotal: number;
}

/**
 * Compute the financial summary for a sales order.
 *
 * @param lines   The array of cart items; each item must define quantity and unitPrice. An optional per‑item discount may be supplied.
 * @param globalDiscount The global discount applied on the subtotal (before tax), e.g. 5000 means 5,000 toman discount. Use 0 for none.
 * @param taxPercentage  The tax rate in percent, e.g. 9 for a 9% VAT. Use 0 for none.
 * @returns An object containing subtotal, itemsDiscount, taxableAmount, taxAmount and grandTotal.
 */
export function calculateSalesSummary(
  lines: CartLine[],
  globalDiscount: number = 0,
  taxPercentage: number = 0
): SalesSummary {
  return calculateSalesAccountingSummary(lines, globalDiscount, taxPercentage);
}

/**
 * Calculate the total price and remaining debt for an installment sale.
 *
 * In the current data model an installment sale sells exactly one phone and the
 * `actualSalePrice`, `downPayment`, `numberOfInstallments` and `installmentAmount` fields
 * are provided. The total price is the sum of the down payment and all future
 * instalment amounts. The remaining debt at the time of sale is simply the total
 * price minus the down payment. This helper is separated to make the logic
 * explicit and checkable.
 */
export function calculateInstallmentTotals(
  actualSalePrice: number,
  downPayment: number,
  numberOfInstallments: number,
  installmentAmount: number
): { totalPrice: number; debt: number } {
  // v339 canonical contract truth is the signed actual sale price. Schedule math
  // may be used for validation/rounding, but must never create a second debt formula.
  void numberOfInstallments;
  void installmentAmount;
  const state = calculateInstallmentContractAccountingState({ actualSalePrice, downPayment });
  return { totalPrice: Math.max(0, Number(actualSalePrice) || 0), debt: state.contractDebt };
}

/**
 * Global-discount calculation: ignore any per-item discount fields and apply
 * a single discount number across the whole cart.
 */
export function calcTotalsGlobalDiscount(
  lines: { quantity: number; unitPrice: number }[],
  discountTotal: number,
  taxRate: number = 0
): { subtotal: number; discount: number; tax: number; payable: number } {
  const subtotal = (lines || []).reduce((s, l) => s + (Number(l.unitPrice) || 0) * (Number(l.quantity) || 0), 0);
  const cleanDiscount = Math.max(0, Math.min(Number(discountTotal) || 0, subtotal));
  const taxableBase = subtotal - cleanDiscount;
  const tax = Math.round(taxableBase * (Number(taxRate) || 0));
  const payable = taxableBase + tax;
  return { subtotal, discount: cleanDiscount, tax, payable };
}

export interface PartnerLedgerAccountingLine {
  debit?: number | string | null;
  credit?: number | string | null;
}

export interface PartnerPhoneAccountingLine {
  status?: string | null;
  purchasePrice?: number | string | null;
  currentPurchasePrice?: number | string | null;
}

export interface PartnerAccessoryAccountingLine {
  purchasePrice?: number | string | null;
  stock_quantity?: number | string | null;
  stockQuantity?: number | string | null;
}

export interface PartnerAccountSnapshotInput {
  ledger?: PartnerLedgerAccountingLine[];
  phones?: PartnerPhoneAccountingLine[];
  accessories?: PartnerAccessoryAccountingLine[];
}

export interface PartnerAccountSnapshot {
  currentBalance: number;
  soldPhoneCurrentDeltaAmount: number;
  unsoldPhonesInventoryAmount: number;
  unsoldAccessoriesInventoryAmount: number;
  realizedCollectedBalance: number;
}

const PARTNER_UNSOLD_PHONE_STATUSES = new Set(['موجود در انبار', 'مرجوعی', 'مرجوعی اقساطی']);
const PARTNER_SOLD_PHONE_STATUSES = new Set(['فروخته شده', 'فروخته شده (قسطی)']);

function accountingNumber(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Partner accounting must value phones by replacement/current purchase price first.
 * If the current price is empty or zero, it falls back to the original purchase price.
 */
export function getPartnerPhoneReferencePurchasePrice(phone: PartnerPhoneAccountingLine): number {
  const current = accountingNumber(phone.currentPurchasePrice);
  if (current > 0) return current;
  return accountingNumber(phone.purchasePrice);
}

/**
 * Computes the partner's realized/collectable balance exactly like the partner-detail SQL:
 * ledger balance + current-price delta of sold phones - unsold phones - unsold accessories.
 */
export function calculatePartnerAccountSnapshot(input: PartnerAccountSnapshotInput): PartnerAccountSnapshot {
  const ledger = input.ledger || [];
  const phones = input.phones || [];
  const accessories = input.accessories || [];

  const currentBalance = calculateAccountingBalanceFromMovements("partner", ledger);

  const soldPhoneCurrentDeltaAmount = phones.reduce((sum, phone) => {
    const status = String(phone.status || '').trim();
    if (!PARTNER_SOLD_PHONE_STATUSES.has(status)) return sum;
    return sum + getPartnerPhoneReferencePurchasePrice(phone) - accountingNumber(phone.purchasePrice);
  }, 0);

  const unsoldPhonesInventoryAmount = phones.reduce((sum, phone) => {
    const status = String(phone.status || '').trim();
    if (!PARTNER_UNSOLD_PHONE_STATUSES.has(status)) return sum;
    return sum + getPartnerPhoneReferencePurchasePrice(phone);
  }, 0);

  const unsoldAccessoriesInventoryAmount = accessories.reduce((sum, product) => {
    const qty = accountingNumber(product.stock_quantity ?? product.stockQuantity);
    if (qty <= 0) return sum;
    return sum + accountingNumber(product.purchasePrice) * qty;
  }, 0);

  return {
    currentBalance,
    soldPhoneCurrentDeltaAmount,
    unsoldPhonesInventoryAmount,
    unsoldAccessoriesInventoryAmount,
    realizedCollectedBalance: currentBalance + soldPhoneCurrentDeltaAmount - unsoldPhonesInventoryAmount - unsoldAccessoriesInventoryAmount,
  };
}
