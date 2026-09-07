import type { CustomerLedgerEntry } from '../../types';
import { formatIsoToShamsi } from '../../utils/dateUtils';
import { formatCurrencyText, readStoredCurrencyUnit } from '../../utils/currency';

/* رنگ‌دهی بدهکار/بستانکار سازگار با دارک */


export const ScoreBar = ({ score }: { score: number }) => {
  const s = Math.max(0, Math.min(100, score || 0));
  const color =
    s >= 80 ? 'bg-emerald-500' : s >= 60 ? 'bg-sky-500' : s >= 40 ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
        <span>امتیاز خوش‌حسابی</span>
        <span className="font-bold text-gray-900 dark:text-gray-100">{s.toLocaleString('fa-IR')} / ۱۰۰</span>
      </div>
      <div className="mt-1 h-2.5 rounded-full bg-gray-200 dark:bg-slate-800 overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${s}%` }} />
      </div>
    </div>
  );
};

export const riskPill = (lvl?: 'low'|'medium'|'high') => {
  const base = 'px-2 py-0.5 rounded-full text-xs font-semibold';
  if (lvl === 'high') return <span className={`${base} bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200`}>ریسک بالا</span>;
  if (lvl === 'medium') return <span className={`${base} bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200`}>ریسک متوسط</span>;
  return <span className={`${base} bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200`}>ریسک پایین</span>;
};


export type CustomerTrustProfile = {
  customerId: number;
  score: number;
  confidence: number;
  tier: 'excellent' | 'good' | 'medium' | 'risky' | 'unknown';
  tierLabel: string;
  purchaseCount: number;
  totalPurchaseAmount: number;
  creditSalesCount: number;
  installmentSalesCount: number;
  installmentObligationCount: number;
  onTimePaymentCount: number;
  latePaymentCount: number;
  overdueUnpaidCount: number;
  returnedCheckCount: number;
  currentBalance: number;
  suggestedCreditLimit: number;
  remainingSuggestedCredit: number;
  lastPurchaseDate?: string | null;
  reasons?: string[];
};

export type CustomerTrustHistoryEvent = {
  date: string;
  type: string;
  title: string;
  description: string;
  impact: number;
  scoreAfter: number;
  amount?: number;
};

export type CustomerTrustHistory = {
  currentScore: number;
  currentTier: string;
  timeline: CustomerTrustHistoryEvent[];
  summary: {
    totalEvents: number;
    positiveEvents: number;
    negativeEvents: number;
    lastChange?: CustomerTrustHistoryEvent | null;
  };
};

export const getTrustTone = (score?: number | null) => {
  const s = Number(score || 0);
  if (s >= 82) return { label: 'بسیار قابل اعتماد', shell: 'border-emerald-200 bg-emerald-50/90 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/25 dark:text-emerald-200', icon: 'fa-solid fa-user-check' };
  if (s >= 68) return { label: 'قابل اعتماد', shell: 'border-blue-200 bg-blue-50/90 text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/25 dark:text-blue-200', icon: 'fa-solid fa-user-check' };
  if (s >= 50) return { label: 'نیازمند احتیاط', shell: 'border-amber-200 bg-amber-50/90 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-200', icon: 'fa-solid fa-user-clock' };
  return { label: 'پرریسک', shell: 'border-rose-200 bg-rose-50/90 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/25 dark:text-rose-200', icon: 'fa-solid fa-triangle-exclamation' };
};

export const formatLedgerCurrency = (amount?: number, type?: 'debit' | 'credit' | 'balance') => {
  if (amount === undefined || amount === null) return formatCurrencyText(0, readStoredCurrencyUnit());

  const amountStrBase = formatCurrencyText(Math.abs(amount), readStoredCurrencyUnit());
  let amountStr = amountStrBase;
  let color = 'text-gray-700 dark:text-gray-300';

  if (type === 'balance') {
    if (amount > 0) {
      color = 'text-red-600 dark:text-rose-400';
      amountStr += ' (بدهکار)';
    } else if (amount < 0) {
      color = 'text-green-700 dark:text-emerald-400';
      amountStr += ' (بستانکار)';
    } else {
      amountStr += ' (تسویه)';
    }
  } else if (type === 'debit' && amount > 0) {
    color = 'text-red-500 dark:text-rose-400';
  } else if (type === 'credit' && amount > 0) {
    color = 'text-green-600 dark:text-emerald-400';
  }

  return <span className={color}>{amountStr}</span>;
};

export const renderLedgerTableAmount = (amount?: number, type?: 'debit' | 'credit' | 'balance') => {
  const value = Number(amount || 0);
  if (type !== 'balance' && value <= 0) {
    return <span className="text-slate-400 dark:text-slate-500">—</span>;
  }

  const amountText = formatCurrencyText(Math.abs(value), readStoredCurrencyUnit());
  if (type === 'balance') {
    const label = value > 0 ? 'بدهکار' : value < 0 ? 'بستانکار' : 'تسویه';
    const color = value > 0
      ? 'text-rose-600 dark:text-rose-300'
      : value < 0
        ? 'text-emerald-600 dark:text-emerald-300'
        : 'text-slate-600 dark:text-slate-300';
    return (
      <span className={`inline-flex flex-col items-start gap-0.5 whitespace-nowrap leading-tight ${color}`}>
        <strong className="font-black">{amountText}</strong>
        <small className="text-[11px] font-extrabold">{label}</small>
      </span>
    );
  }

  const color = type === 'credit'
    ? 'text-emerald-600 dark:text-emerald-300'
    : 'text-rose-600 dark:text-rose-300';
  return <span className={`whitespace-nowrap font-black ${color}`}>{amountText}</span>;
};

export const normalizeTags = (raw: any): string[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String).map(t => t.trim()).filter(Boolean);
  if (typeof raw === 'string') {
    const s = raw.trim();
    if (!s) return [];
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) return parsed.map(String).map(t => t.trim()).filter(Boolean);
    } catch {}
    return s.split(',').map(t => t.trim()).filter(Boolean);
  }
  return [];
};


export const getEntityRegisteredDateValue = (entity: any): string =>
  String(entity?.dateAdded || entity?.createdAt || entity?.created_at || entity?.registrationDate || entity?.transactionDate || '').trim();

export const getCustomerPurchaseDateValue = (item: any): string =>
  String(item?.transactionDate || item?.saleDate || item?.purchaseDate || item?.createdAt || item?.updatedAt || '').trim();

export const formatKnownShamsiDate = (value?: string | null, fallback: string = 'نامشخص'): string => {
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  const formatted = formatIsoToShamsi(raw);
  return formatted === 'تاریخ نامعتبر' ? fallback : formatted;
};

export const ledgerRecordedAt = (entry: CustomerLedgerEntry) =>
  formatIsoToShamsi(entry.createdAt || entry.updatedAt || entry.transactionDate);

export const classifyLedgerPayment = (entry: CustomerLedgerEntry) => {
  const raw = String(entry?.description || '').trim();
  const normalized = raw.replace(/‌/g, ' ').replace(/\s+/g, ' ').trim();
  const isInstallment = /(?:دریافت\s+بابت\s+قسط|ثبت اطلاعات\s+پرداخت\s+قسط|قسط\s*\d+)/i.test(normalized);
  const isCreditPayment = /(?:دریافت|واریز|پرداخت\s+مشتری|تسویه)/i.test(normalized);
  if (isInstallment) return { kind: 'installment' as const, label: 'پرداخت قسط', icon: 'fa-money-bill-wave', tone: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/40 dark:bg-violet-950/25 dark:text-violet-200', severity: 'violet' as const };
  if (isCreditPayment) return { kind: 'credit' as const, label: 'پرداخت بدهی', icon: 'fa-wallet', tone: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/25 dark:text-emerald-200', severity: 'success' as const };
  return { kind: 'general' as const, label: 'دریافت ثبت اطلاعات‌شده', icon: 'fa-arrow-down', tone: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/40 dark:bg-sky-950/25 dark:text-sky-200', severity: 'info' as const };
};
