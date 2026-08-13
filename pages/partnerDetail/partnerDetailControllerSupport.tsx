import { formatIsoToShamsi, formatIsoToShamsiDateTime } from '../../utils/dateUtils';
import { getBalanceBadgeClass, getBalanceState } from '../../utils/adaptiveUi';
import { toSafeNumber } from '../../utils/formBehavior';
import { formatCurrencyText, readStoredCurrencyUnit } from '../../utils/currency';

/* ---------------- Helpers ---------------- */
export const fa2en = (s: string = '') => s.replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString());
export const num = (v: any): number => toSafeNumber(v, 0);

export type QtyPrice = { qty?: number; total?: number };

export const BULK_SETTLEMENT_LAST_NOTE_KEY = 'kourosh.partner.bulkSettlement.lastNote';

export const createBulkSettlementBatchId = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `PSB-${stamp}-${random}`;
};

export const extractSettlementBatchId = (entry: any): string => {
  const directBatchId = String(entry?.settlementBatchId || '').trim();
  if (directBatchId) return directBatchId;
  const match = String(entry?.description || '').match(/شناسه دسته تسویه[:：]\s*([A-Z0-9-]+)/i);
  return match?.[1]?.trim() || '';
};

export const PHONE_LEDGER_REFERENCE_TYPES = new Set(['phone_purchase', 'phone_purchase_edit', 'phone_purchase_reversal_on_edit', 'phone_settlement_payment', 'phone_payment', 'product_settlement_phone']);
export const PRODUCT_LEDGER_REFERENCE_TYPES = new Set(['product_purchase', 'product_purchase_edit']);

export const getLedgerSystemKind = (entry: any): 'phone' | 'product' | 'unknown' => {
  const refType = String(entry?.referenceType || '').trim();
  if (PHONE_LEDGER_REFERENCE_TYPES.has(refType)) return 'phone';
  if (PRODUCT_LEDGER_REFERENCE_TYPES.has(refType)) return 'product';
  return 'unknown';
};

export const getLedgerSystemId = (entry: any): string => {
  const refType = String(entry?.referenceType || '').trim();
  const refId = Number(entry?.referenceId || 0);
  const kind = getLedgerSystemKind(entry);
  if (kind !== 'unknown' && refId > 0) return `${kind === 'phone' ? 'ph' : 'p'}${refId}`;
  if (refType && refId > 0) return `${refType}#${refId}`;
  if (refId > 0) return `ref#${refId}`;
  return `ledger#${Number(entry?.id || 0) || '0'}`;
};

export const getPurchaseSystemId = (item: any): string => {
  const type = String(item?.type || 'item').trim();
  const id = Number(item?.id || 0);
  if (type === 'phone') return `ph${id || '0'}`;
  if (type === 'product') return `p${id || '0'}`;
  return `${type || 'item'}#${id || '0'}`;
};

export const csvEscape = (value: any) => {
  const text = String(value ?? '').replace(/"/g, '""');
  return `"${text}"`;
};

export const extractQtyFromText = (txt?: string): number => {
  if (!txt) return 0;
  const m = fa2en(txt).match(/(\d+)\s*(?:عدد|تا|pcs?)/i);
  return m ? Number(m[1]) : 0;
};
export const extractTotalFromText = (txt?: string): number => {
  if (!txt) return 0;
  const m = fa2en(txt).match(/(?:ارزش|مبلغ|جمع)\s*(?:کل)?\s*([\d,]+)/i);
  return m ? Number(m[1].replace(/,/g, '')) : 0;
};

export const formatPartnerLedgerCurrency = (amount?: number, type?: 'debit' | 'credit' | 'balance') => {
  if (amount === undefined || amount === null) return <span className="text-gray-700">{formatCurrencyText(0, readStoredCurrencyUnit())}</span>;
  let amountStr = formatCurrencyText(Math.abs(amount), readStoredCurrencyUnit());
  let color = 'text-gray-700';
  if (type === 'balance') {
    if (amount > 0) { color = 'text-red-600 font-semibold'; amountStr += ' (بدهی به همکار)'; }
    else if (amount < 0) { color = 'text-green-700 font-semibold'; amountStr = `${formatCurrencyText(Math.abs(amount), readStoredCurrencyUnit())} (طلب از همکار)`; }
    else amountStr += ' (تسویه)';
  } else if (type === 'debit' && amount > 0) color = 'text-green-600';
  else if (type === 'credit' && amount > 0) color = 'text-red-500';
  return <span className={type === 'balance' ? getBalanceBadgeClass(getBalanceState(amount)) : color}>{amountStr}</span>;
};
export const formatPrice = (price?: number | null) => (price == null ? '-' : formatCurrencyText(price, readStoredCurrencyUnit()));


export type PhoneSettlementStatusKey = 'settled' | 'partial' | 'unpaid' | 'unknown';

export const getPhoneSettlementStatusMeta = (paidValue: any, balanceValue: any, basisValue: any) => {
  const paid = num(paidValue);
  const balance = Math.max(0, num(balanceValue));
  const basis = num(basisValue);
  if (basis <= 0) {
    return {
      key: 'unknown' as PhoneSettlementStatusKey,
      label: 'نامشخص',
      hint: 'مبنای حساب ثبت نشده',
      icon: 'fa-solid fa-circle-question',
      badgeClass: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300',
      progressClass: 'bg-gradient-to-l from-slate-300 via-slate-400 to-slate-500 dark:from-slate-500 dark:via-slate-400 dark:to-slate-300',
      progressPercent: 0,
    };
  }
  const progressPercent = Math.max(0, Math.min(100, Math.round((paid / basis) * 100)));
  if (balance <= 0) {
    return {
      key: 'settled' as PhoneSettlementStatusKey,
      label: 'سرمایه برگشته',
      hint: 'مانده ندارد',
      icon: 'fa-solid fa-circle-check',
      badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/35 dark:text-emerald-200',
      progressClass: 'bg-gradient-to-l from-emerald-500 via-teal-400 to-cyan-400 dark:from-emerald-400 dark:via-teal-300 dark:to-cyan-300',
      progressPercent: 100,
    };
  }
  if (paid > 0) {
    return {
      key: 'partial' as PhoneSettlementStatusKey,
      label: 'نیمه‌تسویه',
      hint: `${progressPercent.toLocaleString('fa-IR')}٪ پرداخت شده`,
      icon: 'fa-solid fa-circle-half-stroke',
      badgeClass: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/35 dark:text-amber-200',
      progressClass: 'bg-gradient-to-l from-amber-500 via-orange-400 to-rose-400 dark:from-amber-300 dark:via-orange-300 dark:to-rose-300',
      progressPercent,
    };
  }
  return {
    key: 'unpaid' as PhoneSettlementStatusKey,
    label: 'بدون پرداخت',
    hint: 'پرداختی روی این گوشی ثبت نشده',
    icon: 'fa-solid fa-hourglass-start',
    badgeClass: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/35 dark:text-rose-200',
    progressClass: 'bg-gradient-to-l from-rose-500 via-orange-400 to-slate-300 dark:from-rose-400 dark:via-orange-300 dark:to-slate-500',
    progressPercent: 0,
  };
};



export type SaleClosureMeta = {
  isInstallment: boolean;
  isClosed: boolean;
  label: string;
  hint: string;
  icon: string;
  badgeClass: string;
  remainingAmount: number;
  openCount: number;
};

export const getSaleClosureMeta = (item: any): SaleClosureMeta => {
  const sourceType = String(item?.saleSourceType || item?.settlementPriceSource || '').trim();
  const statusText = String(item?.status || '').trim();
  const paymentMethodText = String(item?.salePaymentMethod || '').trim().toLowerCase();
  const isInstallment = sourceType === 'installment_sale' || statusText.includes('قسطی') || paymentMethodText.includes('installment') || paymentMethodText.includes('قسط');
  if (!isInstallment) {
    return {
      isInstallment: false,
      isClosed: true,
      label: 'پرونده فروش بسته',
      hint: 'فروش نقدی/فاکتوری؛ دریافت مشتری در لحظه فروش تسویه شده است.',
      icon: 'fa-solid fa-circle-check',
      badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/35 dark:text-emerald-200',
      remainingAmount: 0,
      openCount: 0,
    };
  }
  const actualTotal = num(item?.installmentSaleActualTotal || item?.saleTotalPrice || item?.installmentSaleScheduledAmount || 0);
  const collected = Math.max(0, num(item?.installmentCollectedAmount || 0));
  const remainingAmount = Math.max(0, actualTotal - collected);
  const isClosed = remainingAmount <= 0.00001;
  const openPayments = isClosed ? 0 : num(item?.installmentSaleOpenPaymentsCount || 0);
  const openChecks = isClosed ? 0 : num(item?.installmentSaleOpenChecksCount || 0);
  const openCount = Math.max(0, openPayments + openChecks);
  return {
    isInstallment: true,
    isClosed,
    label: isClosed ? 'پرونده اقساط بسته' : `${openCount > 0 ? openCount.toLocaleString('fa-IR') : ''} ${openCount > 0 ? 'قسط/چک باقی‌مانده' : 'پرونده اقساط باز'}`.trim(),
    hint: isClosed
      ? 'همه اقساط و چک‌های این فروش بسته شده‌اند.'
      : `مانده مشتری: ${formatCurrencyText(remainingAmount, readStoredCurrencyUnit())}`,
    icon: isClosed ? 'fa-solid fa-circle-check' : 'fa-solid fa-calendar',
    badgeClass: isClosed
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/35 dark:text-emerald-200'
      : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/35 dark:text-amber-200',
    remainingAmount,
    openCount,
  };
};

export const getPartnerCapitalMeta = (item: any) => {
  const meta = getPhoneSettlementStatusMeta(item?.phoneSettlementPaidAmount, item?.phoneSettlementBalance, item?.settlementPurchasePrice);
  const balance = Math.max(0, num(item?.phoneSettlementBalance));
  return {
    ...meta,
    label: balance <= 0 ? 'سرمایه همکار برگشته' : 'بازگشت سرمایه در جریان',
    hint: balance <= 0 ? 'اصل سرمایه این گوشی برای همکار کامل برگشته است.' : `مانده سرمایه همکار: ${formatCurrencyText(balance, readStoredCurrencyUnit())}`,
  };
};

export const getPurchaseDateValue = (item: any): string => {
  return String(item?.purchaseDate || item?.datePurchased || item?.dateAdded || item?.transactionDate || item?.soldAt || item?.createdAt || '').trim();
};

export const getEntityRegisteredDateValue = (entity: any): string =>
  String(entity?.dateAdded || entity?.createdAt || entity?.created_at || entity?.registrationDate || '').trim();

export const formatKnownShamsiDate = (value?: string | null, fallback: string = 'نامشخص'): string => {
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  const formatted = formatIsoToShamsi(raw);
  return formatted === 'تاریخ نامعتبر' ? fallback : formatted;
};

export const formatLedgerTransactionDate = (value?: string | null): string => {
  const raw = String(value || '').trim();
  if (!raw) return 'نامشخص';
  const formatted = formatIsoToShamsiDateTime(raw, 'jYYYY/jMM/jDD HH:mm');
  return formatted === 'تاریخ نامعتبر' ? formatIsoToShamsi(raw) : formatted;
};
export const describeLacheckPurchase = (item: any): string => {
  if (!item) return 'هنوز خریدی ثبت اطلاعات نشده';
  const dateValue = getPurchaseDateValue(item);
  const dateLabel = formatKnownShamsiDate(dateValue, '');
  const name = String(item?.name || item?.model || item?.title || 'کالای خریداری‌شده').trim();
  const bits = [name, dateLabel].filter(Boolean);
  return bits.length ? bits.join(' • ') : 'آخرین خرید ثبت اطلاعات‌شده';
};

/* ---------------- Component ---------------- */
