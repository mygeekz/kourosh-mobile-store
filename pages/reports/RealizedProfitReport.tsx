import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import moment from 'jalali-moment';
import PageKit from '../../components/ui/PageKit';
import ShamsiDatePicker from '../../components/ShamsiDatePicker';
import ReportFilterField from '../../components/reports/ReportFilterField';
import ReportDatePresetChips from '../../components/reports/ReportDatePresetChips';
import { apiFetch } from '../../utils/apiFetch';
import { exportToExcel } from '../../utils/exporters';
import { useReportsExports } from '../../contexts/ReportsExportsContext';
import { formatCurrencyText, readStoredCurrencyUnit } from '../../utils/currency';
import { APP_MESSAGES } from '../../shared/messages';
import AppSearchField from '../../components/ui/AppSearchField';
import { formatShamsiDate, toShamsiInputValue } from '../../utils/shamsiDate';

const toJalali = (d: Date) => toShamsiInputValue(d);
const money = (n: unknown) => formatCurrencyText(Number(n || 0), readStoredCurrencyUnit());
const percent = (n: unknown) => `${Number(n || 0).toLocaleString('fa-IR', { maximumFractionDigits: 1 })}٪`;
const safeNumber = (n: unknown) => Number.isFinite(Number(n)) ? Number(n) : 0;
const normalizePercent = (value: unknown) => {
  const n = safeNumber(value);
  return n > 0 && n <= 1 ? n * 100 : n;
};
const shamsiFromISO = formatShamsiDate;

const normalizeProfitSearchText = (value: unknown) => String(value ?? '')
  .toLowerCase()
  .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
  .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
  .replace(/ي/g, 'ی')
  .replace(/ك/g, 'ک')
  .replace(/\s+/g, ' ')
  .trim();

const paymentLabel: Record<string, string> = {
  cash: 'نقدی',
  credit: 'اعتباری',
  installment: 'اقساطی',
};

const itemLabel: Record<string, string> = {
  phone: 'گوشی',
  inventory: 'کالا',
  service: 'خدمات',
  unknown: 'نامشخص',
};

type ProfitBucket = {
  contractualRevenue?: number;
  realizedRevenue?: number;
  realizedProfit?: number;
  fullProfit?: number;
  rowsCount?: number;
};

type RealizedProfitDoc = {
  docKey?: string;
  sourceType?: 'invoice' | 'installment';
  orderId?: number;
  customerId?: number | null;
  customerName?: string | null;
  paymentType?: 'cash' | 'credit' | 'installment';
  transactionDate?: string;
  contractualTotal?: number;
  contractualCost?: number;
  receivedInRange?: number;
  primaryItemName?: string;
  itemsSummary?: string;
  itemsCount?: number;
  detailHref?: string;
  detailLabel?: string;
  totalProfit?: number;
  realizedProfit?: number;
  unrecognizedProfit?: number;
  collectionRate?: number;
  costBasisSource?: string;
};

type RealizedProfitRow = {
  rowId?: string | number;
  docKey?: string;
  sourceType?: 'invoice' | 'installment' | string;
  orderId?: number;
  itemType?: string;
  productId?: number;
  productName?: string;
  customerName?: string | null;
  transactionDate?: string;
  paymentType?: string;
  quantity?: number;
  lineTotal?: number;
  lineCost?: number;
  lineOriginalCost?: number;
  costDelta?: number;
  expectedFullProfit?: number;
  expectedRealizedProfit?: number;
  receivedAmount?: number;
  realizedCost?: number;
  fullProfit?: number;
  realizedProfit?: number;
  unrecognizedProfit?: number;
  collectionRate?: number;
  costBasisSource?: string;
};


type ProfitDocFilter = 'all' | 'phones' | 'installments' | 'unrecognized';

const profitDocFilters: Array<{ key: ProfitDocFilter; label: string; description: string; icon: string }> = [
  { key: 'all', label: 'همه اسناد', description: 'نمای کامل', icon: 'fa-layer-group' },
  { key: 'phones', label: 'فقط گوشی‌ها', description: 'اسناد دارای گوشی', icon: 'fa-mobile-screen-button' },
  { key: 'installments', label: 'فقط اقساطی‌ها', description: 'متصل به اقساط', icon: 'fa-file-invoice-dollar' },
  { key: 'unrecognized', label: 'وصول‌نشده', description: 'سود باقی‌مانده', icon: 'fa-hourglass-half' },
];


function ProfitDocFilterButton({ filter, active, onClick }: { filter: { key: ProfitDocFilter; label: string; description: string; icon: string }; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative min-h-[5.4rem] overflow-hidden rounded-[24px] border pr-14 pl-4 py-3.5 text-right transition ${active ? 'border-sky-300 bg-sky-50 text-sky-900 shadow-[0_20px_44px_-34px_rgba(2,132,199,0.6)] dark:border-sky-700 dark:bg-sky-950/30 dark:text-sky-100' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-900'}`}
    >
      {active ? <span className="absolute inset-y-3 right-0 w-1 rounded-l-full bg-sky-500" /> : null}
      <span className={`absolute right-4 top-1/2 -translate-y-1/2 grid h-8 w-8 place-items-center rounded-2xl border ${active ? 'border-sky-200 bg-white text-sky-700 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-200' : 'border-slate-200 bg-slate-50 text-slate-500 group-hover:text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400'}`}>
        <i className={`fa-solid ${filter.icon} text-[12px]`} />
      </span>
      <span className="block text-sm font-black leading-5 text-slate-900 dark:text-slate-50">{filter.label}</span>
      <span className="mt-1 block text-[11px] font-bold leading-5 text-slate-500 dark:text-slate-400">{filter.description}</span>
    </button>
  );
}

function SummaryMetricCard({ icon, label, value, tone = 'neutral' }: { icon: string; label: string; value: React.ReactNode; tone?: 'neutral' | 'success' | 'warning' | 'info' }) {
  const toneClass = tone === 'success'
    ? 'border-emerald-200 bg-emerald-50/65 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-300'
    : tone === 'warning'
    ? 'border-amber-200 bg-amber-50/65 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300'
    : tone === 'info'
    ? 'border-sky-200 bg-sky-50/65 text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/20 dark:text-sky-300'
    : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900/45 dark:text-slate-300';

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/45">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-black leading-5 text-slate-500 dark:text-slate-400">{label}</div>
          <div className="mt-1 truncate text-sm font-black text-slate-900 dark:text-slate-50" title={String(value)}>{value}</div>
        </div>
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-2xl border ${toneClass}`}>
          <i className={`fa-solid ${icon} text-[11px]`} />
        </span>
      </div>
    </div>
  );
}

type RealizedProfitData = {
  range?: { fromISO?: string; toISO?: string };
  summary?: {
    contractualRevenue?: number;
    contractualCost?: number;
    fullProfit?: number;
    realizedRevenue?: number;
    realizedCost?: number;
    realizedProfit?: number;
    unrecognizedProfit?: number;
    collectionRate?: number;
    rowsCount?: number;
    docsCount?: number;
    unlinkedCreditReceipts?: number;
    byPaymentType?: Record<string, ProfitBucket>;
    byItemType?: Record<string, ProfitBucket>;
  };
  docs?: RealizedProfitDoc[];
  rows?: RealizedProfitRow[];
  byDay?: Array<{ day: string; contractualRevenue: number; realizedRevenue: number; realizedProfit: number }>;
  audit?: Record<string, unknown>;
};

function KpiCard({ label, value, hint, icon, tone = 'neutral' }: { label: string; value: string; hint?: string; icon: string; tone?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' }) {
  const toneClass = tone === 'success'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-300'
    : tone === 'warning'
    ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300'
    : tone === 'danger'
    ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-300'
    : tone === 'info'
    ? 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/20 dark:text-sky-300'
    : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300';

  const accentClass = tone === 'success'
    ? 'bg-emerald-500'
    : tone === 'warning'
    ? 'bg-amber-500'
    : tone === 'danger'
    ? 'bg-rose-500'
    : tone === 'info'
    ? 'bg-sky-500'
    : 'bg-slate-400';

  return (
    <div className="group relative overflow-hidden rounded-[22px] border border-slate-200/80 bg-white px-4 py-3 shadow-[0_14px_34px_-30px_rgba(15,23,42,0.24)] transition hover:border-slate-300 hover:shadow-[0_18px_40px_-32px_rgba(15,23,42,0.28)] dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700">
      <span className={`absolute inset-y-3 right-0 w-1 rounded-l-full ${accentClass}`} />
      <div className="flex items-center justify-between gap-3 pr-2">
        <div className="min-w-0 flex-1 text-right">
          <div className="flex items-center gap-2 text-[11px] font-black text-slate-500 dark:text-slate-400">
            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-2xl border ${toneClass}`}>
              <i className={`fa-solid ${icon} text-[11px]`} />
            </span>
            <span className="truncate">{label}</span>
          </div>
          <div className="mt-2 truncate text-[17px] font-black leading-6 text-slate-950 dark:text-slate-50" title={value}>{value}</div>
          {hint ? <div className="mt-0.5 truncate text-[11px] font-bold leading-5 text-slate-500 dark:text-slate-400" title={hint}>{hint}</div> : null}
        </div>
      </div>
    </div>
  );
}

function MiniBar({ label, value, max, sub, tone = 'info', progressValue, progressMax }: { label: string; value: number; max?: number; sub?: string; tone?: 'info' | 'success' | 'warning'; progressValue?: number; progressMax?: number }) {
  const base = safeNumber(progressMax) > 0 ? safeNumber(progressMax) : safeNumber(max);
  const numerator = safeNumber(progressValue ?? value);
  const rawWidth = base > 0 ? (numerator / base) * 100 : 0;
  const normalized = Math.max(0, Math.min(100, rawWidth));
  const width = normalized > 0 ? Math.max(12, normalized) : 0;
  const color = tone === 'success' ? 'bg-emerald-500' : tone === 'warning' ? 'bg-amber-500' : 'bg-sky-500';
  return (
    <div className="rounded-[22px] border border-slate-200/80 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-900/45">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-black text-slate-800 dark:text-slate-100">{label}</span>
        <span className="font-black text-slate-900 dark:text-slate-50">{money(value)}</span>
      </div>
      {sub ? <div className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">{sub}</div> : null}
      <div className="mt-3 flex items-center gap-3">
        <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-slate-200/90 dark:bg-slate-800">
          <div className={`absolute inset-y-0 right-0 rounded-full ${color} transition-all duration-700`} style={{ width: `${width}%` }} />
        </div>
        <span className="shrink-0 text-[11px] font-black text-slate-500 dark:text-slate-400">{percent(normalized)}</span>
      </div>
    </div>
  );
}



function getCostBasisLabel(source?: string, row?: Partial<RealizedProfitRow>) {
  const s = String(source || row?.costBasisSource || '').trim();
  if (s === 'current_purchase_price') return `${APP_MESSAGES.labels.costBasis}: ${APP_MESSAGES.labels.costBasisCurrentPurchasePrice}`;
  if (s === 'sale_item_buy_price') return 'مبنای بها: قیمت خرید ثبت‌شده در سند';
  if (s === 'original_purchase_price') return `${APP_MESSAGES.labels.costBasis}: ${APP_MESSAGES.labels.costBasisOriginalPurchasePrice}`;
  if (s === 'product_purchase_price') return `${APP_MESSAGES.labels.costBasis}: ${APP_MESSAGES.labels.costBasisProductPurchasePrice}`;
  if (row && String(row.itemType || '') === 'phone') {
    const lineCost = safeNumber(row.lineCost);
    const originalCost = safeNumber(row.lineOriginalCost || row.lineCost);
    if (lineCost > 0 && Math.abs(lineCost - originalCost) > 1) return `${APP_MESSAGES.labels.costBasis}: ${APP_MESSAGES.labels.costBasisCurrentPurchasePrice}`;
    if (lineCost > 0) return 'مبنای بها: قیمت خرید اصلی/سند';
  }
  return '';
}

function CostBasisPill({ label, tone = 'info' }: { label?: string; tone?: 'info' | 'neutral' }) {
  if (!label) return null;
  const classes = tone === 'info'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/25 dark:text-emerald-200'
    : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300';
  return (
    <span className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black ${classes}`}>
      <i className="fa-solid fa-scale-balanced text-[9px]" />
      {label}
    </span>
  );
}

function deriveDocCostBasisLabel(rows: RealizedProfitRow[]) {
  const phoneRows = rows.filter((row) => String(row.itemType || '') === 'phone');
  if (!phoneRows.length) return '';
  if (phoneRows.some((row) => String(row.costBasisSource || '') === 'current_purchase_price')) return `${APP_MESSAGES.labels.costBasis}: ${APP_MESSAGES.labels.costBasisCurrentPurchasePrice}`;
  if (phoneRows.some((row) => String(row.costBasisSource || '') === 'sale_item_buy_price')) return `${APP_MESSAGES.labels.costBasis}: ${APP_MESSAGES.labels.costBasisSaleItemBuyPrice}`;
  return getCostBasisLabel('', phoneRows[0]);
}

function TableHeaderCell({ icon, children, className = '' }: { icon: string; children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-4 py-3 ${className}`}>
      <span className="inline-flex items-center gap-2 whitespace-nowrap text-[11px] font-black text-slate-500 dark:text-slate-400">
        <i className={`fa-solid ${icon} text-[10px] text-slate-400`} />
        {children}
      </span>
    </th>
  );
}

function IconValueCell({ icon, label, value, tone = 'neutral', dir = 'rtl' }: { icon: string; label: string; value: React.ReactNode; tone?: 'neutral' | 'success' | 'warning' | 'info'; dir?: 'rtl' | 'ltr' }) {
  const toneClass = tone === 'success'
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-900/40'
    : tone === 'warning'
    ? 'bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/30 dark:text-amber-300 dark:ring-amber-900/40'
    : tone === 'info'
    ? 'bg-sky-50 text-sky-700 ring-sky-100 dark:bg-sky-950/30 dark:text-sky-300 dark:ring-sky-900/40'
    : 'bg-slate-50 text-slate-600 ring-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800';

  return (
    <div className="flex min-w-[9rem] items-center gap-2">
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-2xl ring-1 ${toneClass}`}>
        <i className={`fa-solid ${icon} text-[11px]`} />
      </span>
      <span className="min-w-0 text-right">
        <span className="block text-[10px] font-black text-slate-400 dark:text-slate-500">{label}</span>
        <span className="mt-0.5 block whitespace-nowrap text-xs font-black text-slate-900 dark:text-slate-50" dir={dir}>{value}</span>
      </span>
    </div>
  );
}

function PaymentTypeBadge({ paymentType, sourceType }: { paymentType?: string; sourceType?: string }) {
  const isInstallment = paymentType === 'installment' || sourceType === 'installment';
  const isCredit = paymentType === 'credit';
  const icon = isInstallment ? 'fa-calendar-days' : isCredit ? 'fa-handshake' : 'fa-money-bill-wave';
  const label = paymentLabel[String(paymentType || '')] || paymentType || '—';
  const tone = isInstallment
    ? 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-300'
    : isCredit
    ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300'
    : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300';

  return (
    <span className={`inline-flex min-w-[7.5rem] items-center justify-between gap-2 rounded-2xl border px-3 py-2 text-xs font-black ${tone}`}>
      <i className={`fa-solid ${icon} text-[11px]`} />
      <span>{label}</span>
    </span>
  );
}

function CollectionRateCell({ value }: { value?: number }) {
  const n = Math.max(0, Math.min(100, normalizePercent(value)));
  const width = n > 0 ? Math.max(12, n) : 0;
  return (
    <div className="min-w-[8.75rem]">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-black text-slate-900 dark:text-slate-50">
          <i className="fa-solid fa-gauge-high text-[10px] text-sky-500" />
          {percent(n)}
        </span>
        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500">وصول</span>
      </div>
      <div className="mt-2 relative h-3 overflow-hidden rounded-full bg-slate-200/90 dark:bg-slate-800">
        <div className="absolute inset-y-0 right-0 rounded-full bg-sky-500 transition-all duration-700" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function ItemTypePill({ type }: { type?: string }) {
  const key = String(type || 'unknown');
  const label = itemLabel[key] || key || 'نامشخص';
  const icon = key === 'phone' ? 'fa-mobile-screen-button' : key === 'service' ? 'fa-screwdriver-wrench' : key === 'inventory' ? 'fa-box-open' : 'fa-circle-question';
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-black text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
      <i className={`fa-solid ${icon} text-[10px] text-slate-400`} />
      {label}
    </span>
  );
}

function DetailMetric({ icon, label, value, tone = 'neutral' }: { icon: string; label: string; value: React.ReactNode; tone?: 'neutral' | 'success' | 'warning' | 'info' }) {
  const toneClass = tone === 'success'
    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/25 dark:text-emerald-300'
    : tone === 'warning'
    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/25 dark:text-amber-300'
    : tone === 'info'
    ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/25 dark:text-sky-300'
    : 'bg-slate-50 text-slate-700 dark:bg-slate-900/55 dark:text-slate-200';
  return (
    <div className={`rounded-2xl px-3 py-2 ${toneClass}`}>
      <div className="flex items-center gap-2 text-[10px] font-black opacity-75">
        <i className={`fa-solid ${icon} text-[10px]`} />
        {label}
      </div>
      <div className="mt-1 whitespace-nowrap text-xs font-black">{value}</div>
    </div>
  );
}

function ExpandedProfitLines({ rows }: { rows: RealizedProfitRow[] }) {
  const totals = rows.reduce((acc: { lineTotal: number; lineCost: number; originalCost: number; receivedAmount: number; realizedProfit: number; fullProfit: number; expectedFullProfit: number; expectedRealizedProfit: number; costDelta: number }, row) => {
    const lineTotal = safeNumber(row.lineTotal);
    const lineCost = safeNumber(row.lineCost);
    const originalCost = safeNumber(row.lineOriginalCost || row.lineCost);
    const fullProfit = safeNumber(row.fullProfit ?? (lineTotal - lineCost));
    const expectedFullProfit = safeNumber(row.expectedFullProfit ?? (lineTotal - originalCost));
    const realizedProfit = safeNumber(row.realizedProfit);
    const expectedRealizedProfit = safeNumber(row.expectedRealizedProfit ?? expectedFullProfit * (safeNumber(row.collectionRate) / 100));
    acc.lineTotal += lineTotal;
    acc.lineCost += lineCost;
    acc.originalCost += originalCost;
    acc.receivedAmount += safeNumber(row.receivedAmount);
    acc.realizedProfit += realizedProfit;
    acc.fullProfit += fullProfit;
    acc.expectedFullProfit += expectedFullProfit;
    acc.expectedRealizedProfit += expectedRealizedProfit;
    acc.costDelta += lineCost - originalCost;
    return acc;
  }, { lineTotal: 0, lineCost: 0, originalCost: 0, receivedAmount: 0, realizedProfit: 0, fullProfit: 0, expectedFullProfit: 0, expectedRealizedProfit: 0, costDelta: 0 });

  const profitDelta = totals.fullProfit - totals.expectedFullProfit;

  return (
    <div className="rounded-[26px] border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/45">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[11px] font-black text-slate-500 shadow-sm dark:bg-slate-950 dark:text-slate-400">
            <i className="fa-solid fa-layer-group text-slate-400" />
            ریز اقلام این سند
          </div>
          <h4 className="mt-2 text-sm font-black text-slate-900 dark:text-slate-50">مدل/شرح کالا، قیمت فروش، قیمت خرید روز، خرید اولیه و سهم سود</h4>
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          <DetailMetric icon="fa-file-invoice-dollar" label="جمع فروش" value={money(totals.lineTotal)} />
          <DetailMetric icon="fa-tags" label="خرید روز / مبنا" value={money(totals.lineCost)} tone="info" />
          <DetailMetric icon="fa-box-archive" label="خرید اولیه" value={money(totals.originalCost)} />
          <DetailMetric icon="fa-chart-line" label="سود واقعی" value={money(totals.fullProfit)} tone="success" />
          <DetailMetric icon="fa-scale-balanced" label="اختلاف با سود مورد انتظار" value={money(profitDelta)} tone={profitDelta >= 0 ? 'success' : 'warning'} />
        </div>
      </div>

      <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
        <div className="grid gap-3 md:grid-cols-3">
          <DetailMetric icon="fa-coins" label="سود مورد انتظار با خرید اولیه" value={money(totals.expectedFullProfit)} tone="info" />
          <DetailMetric icon="fa-circle-check" label="سود شناسایی‌شده واقعی" value={money(totals.realizedProfit)} tone="success" />
          <DetailMetric icon="fa-arrows-left-right" label="اختلاف خرید روز با خرید اولیه" value={money(totals.costDelta)} tone={totals.costDelta <= 0 ? 'success' : 'warning'} />
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {rows.map((row, index) => {
          const qty = safeNumber(row.quantity);
          const lineTotal = safeNumber(row.lineTotal);
          const lineCost = safeNumber(row.lineCost);
          const originalCost = safeNumber(row.lineOriginalCost || row.lineCost);
          const fullProfit = safeNumber(row.fullProfit ?? (lineTotal - lineCost));
          const expectedFullProfit = safeNumber(row.expectedFullProfit ?? (lineTotal - originalCost));
          const realizedProfit = safeNumber(row.realizedProfit);
          const margin = lineTotal > 0 ? (fullProfit / lineTotal) * 100 : 0;
          const costDelta = lineCost - originalCost;
          const profitDelta = fullProfit - expectedFullProfit;
          return (
            <div key={String(row.rowId || `${row.docKey}-${index}`)} className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="grid gap-3 xl:grid-cols-[minmax(16rem,1.35fr)_repeat(4,minmax(8.5rem,1fr))] xl:items-center">
                <div className="min-w-0">
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                      <i className={`fa-solid ${String(row.itemType || '') === 'phone' ? 'fa-mobile-screen-button' : String(row.itemType || '') === 'service' ? 'fa-screwdriver-wrench' : 'fa-box-open'}`} />
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-black text-slate-900 dark:text-slate-50" title={row.productName || '—'}>{row.productName || '—'}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <ItemTypePill type={row.itemType} />
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                          تعداد: {qty.toLocaleString('fa-IR')}
                        </span>
                        {row.productId ? (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-500 dark:bg-slate-900 dark:text-slate-400" dir="ltr">
                            ID #{Number(row.productId).toLocaleString('fa-IR')}
                          </span>
                        ) : null}
                        <CostBasisPill label={getCostBasisLabel(row.costBasisSource, row)} tone={String(row.costBasisSource || '') === 'current_purchase_price' ? 'info' : 'neutral'} />
                      </div>
                    </div>
                  </div>
                </div>
                <DetailMetric icon="fa-cart-shopping" label="قیمت فروش" value={money(lineTotal)} />
                <DetailMetric icon="fa-tags" label="قیمت خرید روز" value={money(lineCost)} tone="info" />
                <DetailMetric icon="fa-box-archive" label="قیمت خرید اولیه" value={money(originalCost)} />
                <DetailMetric icon="fa-scale-balanced" label="اختلاف سود واقعی/انتظار" value={`${money(profitDelta)} • ${costDelta === 0 ? 'بدون تغییر مبنا' : costDelta > 0 ? 'کاهش سود به‌خاطر رشد خرید روز' : 'افزایش سود به‌خاطر کاهش خرید روز'}`} tone={profitDelta >= 0 ? 'success' : 'warning'} />
                <DetailMetric icon="fa-circle-check" label="سهم سود شناسایی‌شده" value={`${money(realizedProfit)} • ${percent(margin)}`} tone="success" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DocumentSubject({ doc }: { doc: RealizedProfitDoc }) {
  const href = doc.detailHref || (doc.sourceType === 'installment' ? `/installment-sales/${doc.orderId || ''}` : `/invoices/${doc.orderId || ''}`);
  const subject = doc.primaryItemName || 'سند فروش';
  const customerName = doc.customerName || 'خریدار نامشخص';
  const icon = doc.sourceType === 'installment' ? 'fa-file-invoice-dollar' : 'fa-receipt';

  return (
    <Link
      to={href}
      className="group flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-right transition hover:border-sky-300 hover:bg-sky-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-sky-700 dark:hover:bg-sky-950/30"
      title={`${subject} - ${customerName}`}
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600 group-hover:bg-sky-100 group-hover:text-sky-700 dark:bg-slate-900 dark:text-slate-300 dark:group-hover:bg-sky-950 dark:group-hover:text-sky-200">
        <i className={`fa-solid ${icon} text-[12px]`} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-black text-slate-900 dark:text-slate-50">{subject}</span>
        <span className="mt-0.5 block truncate text-[11px] font-bold text-slate-500 dark:text-slate-400">{customerName}</span>
      </span>
      <i className="fa-solid fa-arrow-up-left-from-square shrink-0 text-[10px] text-slate-400 group-hover:text-sky-600" />
    </Link>
  );
}

export default function RealizedProfitReport() {
  const { registerReportExports } = useReportsExports();
  const exportExcelRef = useRef<() => void>(() => {});
  const [fromDate, setFromDate] = useState<Date>(() => {
    const m = moment();
    return moment(`${m.locale('fa').format('jYYYY/jMM')}/01`, 'jYYYY/jMM/jDD').toDate();
  });
  const [toDate, setToDate] = useState<Date>(() => new Date());
  const [data, setData] = useState<RealizedProfitData | null>(null);
  const [docFilter, setDocFilter] = useState<ProfitDocFilter>('all');
  const [docSearch, setDocSearch] = useState('');
  const [expandedDocKeys, setExpandedDocKeys] = useState<Set<string>>(() => new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = useMemo(() => toJalali(fromDate), [fromDate]);
  const to = useMemo(() => toJalali(toDate), [toDate]);
  const summary = data?.summary || {};
  const byPaymentType = summary.byPaymentType || {};
  const byItemType = summary.byItemType || {};
  const docs = data?.docs || [];
  const rows = data?.rows || [];
  const rowsByDocKey = useMemo(() => {
    const map = new Map<string, RealizedProfitRow[]>();
    for (const row of rows) {
      const key = String(row.docKey || '');
      if (!key) continue;
      const list = map.get(key) || [];
      list.push(row);
      map.set(key, list);
    }
    return map;
  }, [rows]);
  const toggleDocExpanded = useCallback((key: string) => {
    if (!key) return;
    setExpandedDocKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);
  const phoneDocKeys = useMemo(() => new Set(rows.filter((row) => String(row.itemType || '') === 'phone').map((row) => String(row.docKey || ''))), [rows]);
  const normalizedDocSearch = useMemo(() => normalizeProfitSearchText(docSearch), [docSearch]);
  const filteredDocs = useMemo(() => {
    let baseDocs = docs;
    if (docFilter === 'phones') {
      baseDocs = docs.filter((doc) => phoneDocKeys.has(String(doc.docKey || '')) || /گوشی|iphone|galaxy|samsung|xiaomi|redmi|poco|honor|huawei|oppo|vivo/i.test(`${doc.primaryItemName || ''} ${doc.itemsSummary || ''}`));
    } else if (docFilter === 'installments') {
      baseDocs = docs.filter((doc) => doc.sourceType === 'installment' || doc.paymentType === 'installment');
    } else if (docFilter === 'unrecognized') {
      baseDocs = docs.filter((doc) => safeNumber(doc.unrecognizedProfit) > 0);
    }

    if (!normalizedDocSearch) return baseDocs;

    return baseDocs.filter((doc) => {
      const haystack = normalizeProfitSearchText([
        doc.docKey,
        doc.orderId,
        doc.customerName,
        doc.primaryItemName,
        doc.itemsSummary,
        doc.detailLabel,
        paymentLabel[String(doc.paymentType || '')] || doc.paymentType,
        doc.sourceType === 'installment' ? 'اقساطی وضعیت اقساط' : 'فاکتور فروش',
      ].join(' '));
      return haystack.includes(normalizedDocSearch);
    });
  }, [docFilter, docs, normalizedDocSearch, phoneDocKeys]);
  type FilteredDocsSummary = {
    contractualTotal: number;
    receivedInRange: number;
    realizedProfit: number;
    unrecognizedProfit: number;
  };

  const filteredDocsSummary = useMemo<FilteredDocsSummary>(() => filteredDocs.reduce<FilteredDocsSummary>((acc, doc) => {
    acc.contractualTotal += safeNumber(doc.contractualTotal);
    acc.receivedInRange += safeNumber(doc.receivedInRange);
    acc.realizedProfit += safeNumber(doc.realizedProfit);
    acc.unrecognizedProfit += safeNumber(doc.unrecognizedProfit);
    return acc;
  }, { contractualTotal: 0, receivedInRange: 0, realizedProfit: 0, unrecognizedProfit: 0 }), [filteredDocs]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ from, to });
      const response = await apiFetch(`/api/reports/realized-profit?${qs.toString()}`);
      const json = await response.json();
      if (!response.ok || !json?.success) throw new Error(json?.message || 'خطا در دریافت گزارش سود تحقق‌یافته');
      setData(json.data || null);
    } catch (e: any) {
      setError(e?.message || 'خطا در دریافت گزارش سود تحقق‌یافته');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    const t = window.setTimeout(() => { void load(); }, 250);
    return () => window.clearTimeout(t);
  }, [load]);

  const exportExcel = useCallback(() => {
    if (!data) return;
    const excelRows = [
      { بخش: 'خلاصه', عنوان: 'درآمد قراردادی', مقدار: summary.contractualRevenue || 0 },
      { بخش: 'خلاصه', عنوان: 'درآمد وصول‌شده', مقدار: summary.realizedRevenue || 0 },
      { بخش: 'خلاصه', عنوان: 'بهای تمام‌شده شناسایی‌شده', مقدار: summary.realizedCost || 0 },
      { بخش: 'خلاصه', عنوان: 'سود تحقق‌یافته', مقدار: summary.realizedProfit || 0 },
      { بخش: 'خلاصه', عنوان: 'سود شناسایی‌نشده', مقدار: summary.unrecognizedProfit || 0 },
      { بخش: 'خلاصه', عنوان: 'نرخ وصول', مقدار: summary.collectionRate || 0 },
      ...Object.entries(byPaymentType).map(([key, bucket]) => ({ بخش: 'روش پرداخت', عنوان: paymentLabel[key] || key, مقدار: bucket.realizedProfit || 0 })),
      ...rows.map((row) => ({ بخش: 'اقلام', عنوان: row.productName || row.docKey || '—', مقدار: row.realizedProfit || 0, روش: paymentLabel[String(row.paymentType || '')] || row.paymentType || '—', وصول: row.receivedAmount || 0 })),
    ];
    exportToExcel(
      `realized-profit-${new Date().toISOString().slice(0, 10)}.xlsx`,
      excelRows,
      [
        { header: 'بخش', key: 'بخش' },
        { header: 'عنوان', key: 'عنوان' },
        { header: 'مقدار', key: 'مقدار' },
        { header: 'روش', key: 'روش' },
        { header: 'وصول', key: 'وصول' },
      ],
      'RealizedProfit'
    );
  }, [byPaymentType, data, rows, summary.collectionRate, summary.contractualRevenue, summary.realizedCost, summary.realizedProfit, summary.realizedRevenue, summary.unrecognizedProfit]);

  exportExcelRef.current = exportExcel;
  useEffect(() => {
    registerReportExports({ excel: () => exportExcelRef.current() });
    return () => registerReportExports({});
  }, [registerReportExports]);

  return (
    <PageKit
      title="سود تحقق‌یافته"
      icon={<i className="fa-solid fa-scale-balanced" />}
      className="report-merged-page realized-profit-compact-page"
      isLoading={isLoading}
      isEmpty={!isLoading && !data}
      emptyTitle={error ? 'خطا در دریافت گزارش' : 'داده‌ای برای نمایش نیست'}
      emptyDescription={error || 'بازه را تغییر بده و دوباره گزارش را دریافت کن.'}
      emptyActionLabel="بازخوانی"
      onEmptyAction={load}
      secondaryRow={
        <div dir="rtl" className="realized-profit-header-row">
          <div className="realized-profit-title-card">
            <span className="realized-profit-title-card__icon">
              <i className="fa-solid fa-scale-balanced" />
            </span>

            <div className="min-w-0">
              <div className="realized-profit-title-card__kicker">گزارش مالی</div>
              <h2 className="realized-profit-title-card__title">سود تحقق‌یافته</h2>
              <p className="realized-profit-title-card__text">
                نمای سودهای شناسایی‌شده بر پایه مبالغ وصول‌شده.
              </p>
              <div
                className="report-basis-badge report-basis-badge--realized-profit realized-profit-basis-note"
                tabIndex={0}
                role="note"
                aria-label="مبنای محاسبه سود تحقق‌یافته"
                data-tooltip="مثال: اگر فروش اقساطی هنوز کامل وصول نشده باشد، سود هم کامل شناسایی نمی‌شود؛ فقط به نسبت مبلغی که واقعاً دریافت شده وارد گزارش می‌شود."
              >
                <i className="fa-solid fa-coins" />
                مبنای محاسبه: سود فقط به نسبت مبالغ وصول‌شده شناسایی می‌شود
                <span className="report-basis-badge__hint" aria-hidden="true">
                  مثال: اگر فقط نصف مبلغ وصول شده باشد، فقط همان نسبت سود شناسایی می‌شود.
                </span>
              </div>
            </div>
          </div>

          <div className="realized-profit-filter-bar" aria-label="فیلتر بازه زمانی سود تحقق‌یافته">
            <div className="realized-profit-filter-row realized-profit-filter-row--primary">
              <ReportDatePresetChips
                fromDate={fromDate}
                toDate={toDate}
                onChange={({ from, to }) => { setFromDate(from); setToDate(to); }}
                className="realized-profit-date-presets"
              />

              <button type="button" onClick={load} className="realized-profit-refresh-button" disabled={isLoading}>
                <i className={`fa-solid ${isLoading ? 'fa-spinner fa-spin' : 'fa-bolt'}`} />
                بروزرسانی
              </button>
            </div>

            <div className="realized-profit-filter-row realized-profit-filter-row--dates">
              <ReportFilterField
                label="از تاریخ"
                icon={<i className="fa-regular fa-calendar" />}
                minWidthClassName="realized-profit-date-field"
              >
                <ShamsiDatePicker
                  selectedDate={fromDate}
                  onDateChange={(d) => d && setFromDate(d)}
                  inputClassName="realized-profit-date-input"
                />
              </ReportFilterField>

              <ReportFilterField
                label="تا تاریخ"
                icon={<i className="fa-regular fa-calendar-check" />}
                minWidthClassName="realized-profit-date-field"
              >
                <ShamsiDatePicker
                  selectedDate={toDate}
                  onDateChange={(d) => d && setToDate(d)}
                  inputClassName="realized-profit-date-input"
                />
              </ReportFilterField>
            </div>
          </div>
        </div>
      }
    >
      {data ? (
        <div className="realized-profit-content mt-6 space-y-5" dir="rtl">
          <section className="realized-profit-kpi-grid grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="سود تحقق‌یافته" value={money(summary.realizedProfit)} hint={`درآمد وصول‌شده: ${money(summary.realizedRevenue)}`} icon="fa-circle-check" tone="success" />
            <KpiCard label="سود شناسایی‌نشده" value={money(summary.unrecognizedProfit)} hint="سود بالقوه‌ای که هنوز وصول نشده" icon="fa-hourglass-half" tone="warning" />
            <KpiCard label="نرخ وصول" value={percent(summary.collectionRate)} hint={`${money(summary.realizedRevenue)} از ${money(summary.contractualRevenue)}`} icon="fa-gauge-high" tone="info" />
            <KpiCard label="بهای تمام‌شده شناسایی‌شده" value={money(summary.realizedCost)} hint={`COGS قراردادی: ${money(summary.contractualCost)}`} icon="fa-boxes-stacked" tone="neutral" />
          </section>

          <section className="realized-profit-split-grid grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)]">
            <div className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_22px_50px_-40px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-black tracking-[0.16em] text-slate-500 dark:text-slate-400">PAYMENT RECOGNITION</div>
                  <h3 className="mt-1 text-base font-black text-slate-900 dark:text-slate-50">تفکیک نقدی / اعتباری / اقساطی</h3>
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">{Number(summary.docsCount || 0).toLocaleString('fa-IR')} سند</span>
              </div>
              <div className="mt-4 space-y-3">
                {(['cash', 'credit', 'installment'] as const).map((key) => {
                  const bucket = byPaymentType[key] || {};
                  return (
                    <MiniBar
                      key={key}
                      label={paymentLabel[key]}
                      value={safeNumber(bucket.realizedProfit)}
                      progressValue={safeNumber(bucket.realizedProfit)}
                      progressMax={Math.max(safeNumber(bucket.fullProfit), safeNumber(bucket.realizedProfit), 1)}
                      tone={key === 'cash' ? 'success' : key === 'credit' ? 'warning' : 'info'}
                      sub={`وصول: ${money(bucket.realizedRevenue)} • سود کل: ${money(bucket.fullProfit)}`}
                    />
                  );
                })}
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_22px_50px_-40px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-black tracking-[0.16em] text-slate-500 dark:text-slate-400">ITEM MIX</div>
                  <h3 className="mt-1 text-base font-black text-slate-900 dark:text-slate-50">تفکیک گوشی / کالا / خدمات</h3>
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">{Number(summary.rowsCount || 0).toLocaleString('fa-IR')} قلم</span>
              </div>
              <div className="mt-4 space-y-3">
                {Object.entries(byItemType).length ? Object.entries(byItemType).map(([key, bucket]) => (
                  <MiniBar
                    key={key}
                    label={itemLabel[key] || key}
                    value={safeNumber(bucket.realizedProfit)}
                    progressValue={safeNumber(bucket.realizedProfit)}
                    progressMax={Math.max(safeNumber(bucket.fullProfit), safeNumber(bucket.realizedProfit), 1)}
                    tone="info"
                    sub={`وصول: ${money(bucket.realizedRevenue)} • سود کل: ${money(bucket.fullProfit)}`}
                  />
                )) : <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">تفکیک آیتم برای این بازه موجود نیست.</div>}
              </div>
            </div>
          </section>

          <section className="realized-profit-docs-panel rounded-[30px] border border-slate-200/80 bg-white p-5 shadow-[0_22px_50px_-40px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-950">
            <div className="rounded-[26px] border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/45">
              <div className="flex items-start gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                  <i className="fa-solid fa-file-signature" />
                </span>
                <div className="min-w-0">
                  <div className="text-[11px] font-black tracking-[0.16em] text-slate-500 dark:text-slate-400">DOCUMENTS</div>
                  <h3 className="mt-1 text-lg font-black text-slate-900 dark:text-slate-50">آخرین اسناد سود شناسایی‌شده</h3>
                  <div className="mt-1 text-xs font-bold leading-6 text-slate-500 dark:text-slate-400">مدل گوشی و نام خریدار هر سند به صفحه فاکتور یا وضعیت اقساط متصل است.</div>
                </div>
              </div>
            </div>
            <div className="mt-4 rounded-[24px] border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/45">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <AppSearchField
                  value={docSearch}
                  onChange={setDocSearch}
                  placeholder="جستجو با مدل گوشی، نام خریدار، شماره فاکتور یا شماره اقساط..."
                  ariaLabel="جستجوی اسناد سود تحقق‌یافته"
                  size="lg"
                  clearable
                  className="min-w-0 flex-1"
                />
                <div className="flex shrink-0 items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                  <i className="fa-solid fa-filter-circle-dollar text-slate-400" />
                  <span>{filteredDocs.length.toLocaleString('fa-IR')} سند مطابق فیلتر و جستجو</span>
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
              <SummaryMetricCard icon="fa-folder-open" label="اسناد این نما" value={`${filteredDocs.length.toLocaleString('fa-IR')} سند`} />
              <SummaryMetricCard icon="fa-file-contract" label="قرارداد" value={money(filteredDocsSummary.contractualTotal)} />
              <SummaryMetricCard icon="fa-chart-line" label="سود تحقق‌یافته" value={money(filteredDocsSummary.realizedProfit)} tone="success" />
              <SummaryMetricCard icon="fa-hourglass-half" label="سود وصول‌نشده" value={money(filteredDocsSummary.unrecognizedProfit)} tone="warning" />
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              {profitDocFilters.map((filter) => (
                <ProfitDocFilterButton
                  key={filter.key}
                  filter={filter}
                  active={docFilter === filter.key}
                  onClick={() => setDocFilter(filter.key)}
                />
              ))}
            </div>
            <div className="mt-4 rounded-3xl border border-slate-200/80 bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] dark:border-slate-800 dark:bg-slate-950">
              <div role="table" className="w-full text-right text-sm">
                <div role="row" className="hidden grid-cols-[1.05fr_1.35fr_.9fr_.9fr_1fr_.95fr] gap-3 border-b border-slate-100 bg-slate-50/95 px-4 py-3 text-[11px] font-black text-slate-500 dark:border-slate-800 dark:bg-slate-900/95 xl:grid">
                  <span className="inline-flex items-center gap-2"><i className="fa-solid fa-calendar-day text-slate-400" /> سند</span>
                  <span className="inline-flex items-center gap-2"><i className="fa-solid fa-link text-slate-400" /> بابت / خریدار</span>
                  <span className="inline-flex items-center gap-2"><i className="fa-solid fa-file-invoice-dollar text-slate-400" /> قرارداد</span>
                  <span className="inline-flex items-center gap-2"><i className="fa-solid fa-wallet text-slate-400" /> وصول‌شده</span>
                  <span className="inline-flex items-center gap-2"><i className="fa-solid fa-chart-line text-slate-400" /> سود</span>
                  <span className="inline-flex items-center gap-2"><i className="fa-solid fa-gauge-high text-slate-400" /> نرخ / ریز اقلام</span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredDocs.slice(0, 12).map((doc, index) => {
                    const docKey = String(doc.docKey || '');
                    const detailRows = docKey ? (rowsByDocKey.get(docKey) || []) : [];
                    const isExpanded = docKey ? expandedDocKeys.has(docKey) : false;
                    return (
                      <React.Fragment key={doc.docKey || index}>
                        <div role="row" className={`grid gap-3 px-4 py-4 transition xl:grid-cols-[1.05fr_1.35fr_.9fr_.9fr_1fr_.95fr] xl:items-center ${isExpanded ? 'bg-sky-50/45 dark:bg-sky-950/15' : 'hover:bg-slate-50/80 dark:hover:bg-slate-900/45'}`}>
                          <div className="grid gap-2 sm:grid-cols-3 xl:block xl:space-y-2">
                            <IconValueCell icon="fa-calendar-check" label="تاریخ سند" value={shamsiFromISO(doc.transactionDate)} />
                            <PaymentTypeBadge paymentType={doc.paymentType} sourceType={doc.sourceType} />
                            <IconValueCell
                              icon={doc.sourceType === 'installment' ? 'fa-list-check' : 'fa-receipt'}
                              label={doc.sourceType === 'installment' ? 'فروش اقساطی' : 'فاکتور'}
                              value={doc.orderId ? `#${Number(doc.orderId).toLocaleString('fa-IR')}` : '—'}
                              dir="ltr"
                            />
                          </div>
                          <div className="space-y-2">
                            <DocumentSubject doc={doc} />
                            <CostBasisPill label={deriveDocCostBasisLabel(detailRows)} />
                          </div>
                          <IconValueCell icon="fa-file-contract" label="مبلغ قرارداد" value={money(doc.contractualTotal)} />
                          <IconValueCell icon="fa-money-bill-transfer" label="وصول در بازه" value={money(doc.receivedInRange)} tone="info" />
                          <div className="grid gap-2 sm:grid-cols-2 xl:block xl:space-y-2">
                            <IconValueCell icon="fa-arrow-trend-up" label="سود تحقق‌یافته" value={money(doc.realizedProfit)} tone="success" />
                            <IconValueCell icon="fa-clock" label="سود وصول‌نشده" value={money(doc.unrecognizedProfit)} tone="warning" />
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2 xl:block xl:space-y-3">
                            <CollectionRateCell value={doc.collectionRate} />
                            <button
                              type="button"
                              onClick={() => toggleDocExpanded(docKey)}
                              disabled={!detailRows.length}
                              className={`inline-flex w-full items-center justify-between gap-3 rounded-2xl border px-3 py-2 text-xs font-black transition ${isExpanded ? 'border-sky-300 bg-sky-600 text-white shadow-[0_16px_35px_-28px_rgba(2,132,199,0.65)] dark:border-sky-700 dark:bg-sky-500' : 'border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-sky-700 dark:hover:bg-sky-950/30 dark:hover:text-sky-200'}`}
                            >
                              <span className="inline-flex items-center gap-2">
                                <i className="fa-solid fa-list-check text-[11px]" />
                                {detailRows.length.toLocaleString('fa-IR')} قلم
                              </span>
                              <i className={`fa-solid ${isExpanded ? 'fa-chevron-up' : 'fa-chevron-down'} text-[10px]`} />
                            </button>
                          </div>
                        </div>
                        {isExpanded ? (
                          <div className="bg-slate-50/55 px-4 pb-5 pt-0 dark:bg-slate-950/40">
                            <ExpandedProfitLines rows={detailRows} />
                          </div>
                        ) : null}
                      </React.Fragment>
                    );
                  })}
                  {!filteredDocs.length ? (
                    <div className="px-4 py-10 text-center">
                      <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-3xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
                        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-slate-400 shadow-sm dark:bg-slate-950">
                          <i className="fa-solid fa-magnifying-glass-chart" />
                        </span>
                        <div className="text-sm font-black text-slate-700 dark:text-slate-200">سندی برای فیلتر یا جستجوی انتخاب‌شده وجود ندارد.</div>
                        <div className="text-xs font-semibold leading-6">عبارت جستجو یا فیلتر سریع را تغییر بده تا اسناد بیشتری نمایش داده شود.</div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </PageKit>
  );
}
