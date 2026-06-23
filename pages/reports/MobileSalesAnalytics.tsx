import React, { useEffect, useMemo, useRef, useState } from 'react';
import moment from 'jalali-moment';
import ShamsiDatePicker from '../../components/ShamsiDatePicker';
import ReportDatePresetChips from '../../components/reports/ReportDatePresetChips';
import Notification from '../../components/Notification';
import { useReportsExports } from '../../contexts/ReportsExportsContext';
import { exportToExcel } from '../../utils/exporters';
import { apiFetch } from '../../utils/apiFetch';
import type { NotificationMessage } from '../../types';
import KpiDefinitionNote from '../../components/reports/KpiDefinitionNote';
import { formatCurrencyText, readStoredCurrencyUnit } from '../../utils/currency';
import { formatShamsiDate, toShamsiInputValue } from '../../utils/shamsiDate';

type TabKey = 'overview' | 'cash' | 'installment' | 'risk' | 'real' | 'partners';

type CashRow = {
  id: string;
  saleId: number;
  saleDate?: string;
  saleTypeLabel: string;
  customerName?: string;
  customerPhone?: string;
  phoneModel?: string;
  imei?: string;
  purchasePrice: number;
  referencePrice: number;
  currentPurchasePrice?: number;
  salePrice: number;
  grossLineTotal: number;
  itemDiscount: number;
  invoiceDiscountShare: number;
  profit: number;
  realProfit: number;
  replacementDelta: number;
  receivedAmount: number;
  outstandingAmount: number;
};

type InstallmentRow = {
  id: string;
  saleId: number;
  saleDate?: string;
  saleTypeLabel: string;
  customerName?: string;
  customerPhone?: string;
  phoneModel?: string;
  imei?: string;
  purchasePrice: number;
  referencePrice: number;
  currentPurchasePrice?: number;
  contractTotal: number;
  downPayment: number;
  paidInstallments: number;
  receivedAmount: number;
  outstandingAmount: number;
  collectionRate: number;
  downPaymentRate: number;
  fullProfit: number;
  realizedProfit: number;
  unrecognizedProfit: number;
  realProfit: number;
  replacementDelta: number;
  overdueAmount: number;
  overdueCount: number;
  overdueChecks: number;
  overdueDays: number;
  dueInDays: number | null;
  nextDueDate?: string | null;
  nextDueAmount: number;
  numberOfInstallments: number;
  customerBalance: number;
  riskScore: number;
  riskLevel: 'critical' | 'high' | 'followup' | 'low' | string;
  riskLabel: string;
  riskTone: string;
  riskReasons: string[];

};

type PartnerCapitalPhone = {
  phoneId: number;
  phoneModel?: string;
  imei?: string;
  phoneStatus?: string;
  sharePercent: number;
  purchasePrice: number;
  currentPurchasePrice: number;
  partnerCapitalAtCurrentPrice: number;
  saleKind: 'cash' | 'installment' | 'sold' | 'remaining' | string;
};

type PartnerCapitalRow = {
  storePartnerId: number;
  partnerName: string;
  colorTag?: string | null;
  partnerSource?: string;
  totalPhonesHad: number;
  cashSoldCount: number;
  installmentSoldCount: number;
  remainingCount: number;
  soldCount: number;
  initialPurchaseCapital: number;
  soldCapitalAtCurrentPrice: number;
  cashSoldCapitalAtCurrentPrice: number;
  installmentSoldCapitalAtCurrentPrice: number;
  inventoryCapitalAtCurrentPrice: number;
  replacementDeltaCapital: number;
  paidSettlementAmount: number;
  receivedSettlementAmount: number;
  netSettledAmount: number;
  remainingCapitalBalance: number;
  phones?: PartnerCapitalPhone[];
};

type PartnerCapitalSummary = {
  partnersCount: number;
  totalPhonesHad: number;
  totalCashSoldCount: number;
  totalInstallmentSoldCount: number;
  totalRemainingCount: number;
  totalSoldCapitalAtCurrentPrice: number;
  totalInventoryCapitalAtCurrentPrice: number;
  totalPaidToPartners: number;
  totalReceivedFromPartners: number;
  totalRemainingCapitalBalance: number;
};

type Summary = {
  totalPhones: number;
  cashCount: number;
  installmentCount: number;
  totalSales: number;
  cashSales: number;
  installmentSales: number;
  cashProfit: number;
  cashRealProfit: number;
  installmentFullProfit: number;
  installmentRealizedProfit: number;
  installmentUnrecognizedProfit: number;
  installmentReceived: number;
  installmentOutstanding: number;
  installmentCollectionRate: number;
  highRiskCount: number;
  criticalRiskCount: number;
  averageDownPaymentRate: number;
  totalReplacementDelta: number;
  totalRealProfit: number;
};

type AnalyticsPayload = {
  from?: string;
  to?: string;
  summary: Summary;
  comparison?: any;
  cashRows: CashRow[];
  installmentRows: InstallmentRow[];
  realProfitRows: Array<(CashRow | InstallmentRow) & { saleType?: string; fullProfit?: number; riskLabel?: string }>;
  risk?: { highRiskCount: number; rows: InstallmentRow[] };
  partnerCapital?: { summary: PartnerCapitalSummary; rows: PartnerCapitalRow[] };
};

const emptySummary: Summary = {
  totalPhones: 0,
  cashCount: 0,
  installmentCount: 0,
  totalSales: 0,
  cashSales: 0,
  installmentSales: 0,
  cashProfit: 0,
  cashRealProfit: 0,
  installmentFullProfit: 0,
  installmentRealizedProfit: 0,
  installmentUnrecognizedProfit: 0,
  installmentReceived: 0,
  installmentOutstanding: 0,
  installmentCollectionRate: 0,
  highRiskCount: 0,
  criticalRiskCount: 0,
  averageDownPaymentRate: 0,
  totalReplacementDelta: 0,
  totalRealProfit: 0,
};


const emptyPartnerCapitalSummary: PartnerCapitalSummary = {
  partnersCount: 0,
  totalPhonesHad: 0,
  totalCashSoldCount: 0,
  totalInstallmentSoldCount: 0,
  totalRemainingCount: 0,
  totalSoldCapitalAtCurrentPrice: 0,
  totalInventoryCapitalAtCurrentPrice: 0,
  totalPaidToPartners: 0,
  totalReceivedFromPartners: 0,
  totalRemainingCapitalBalance: 0,
};

const money = (value?: number | null) => formatCurrencyText(Number(value || 0), readStoredCurrencyUnit());
const percent = (value?: number | null) => `${Number(value || 0).toLocaleString('fa-IR', { maximumFractionDigits: 1 })}٪`;
const toJ = (date: Date | null) => toShamsiInputValue(date);
const shamsi = formatShamsiDate;
const signedMoney = (value?: number | null) => {
  const n = Number(value || 0);
  const cls = n > 0 ? 'text-emerald-600 dark:text-emerald-300' : n < 0 ? 'text-rose-600 dark:text-rose-300' : 'text-slate-600 dark:text-slate-300';
  return <span className={`font-black ${cls}`}>{money(n)}</span>;
};

const tabMeta: Record<TabKey, { label: string; icon: string; hint: string }> = {
  overview: { label: 'نمای کلی', icon: 'fa-chart-pie', hint: 'مقایسه نقد و اقساط' },
  cash: { label: 'نقدی', icon: 'fa-money-bill-wave', hint: 'سود سریع و قطعی' },
  installment: { label: 'اقساطی', icon: 'fa-file-invoice-dollar', hint: 'سود کل و وصول‌شده' },
  risk: { label: 'ریسک اقساط', icon: 'fa-triangle-exclamation', hint: 'پرونده‌های قابل پیگیری' },
  real: { label: 'سود واقعی', icon: 'fa-scale-balanced', hint: 'قیمت خرید روز و سود واقعی' },
  partners: { label: 'سرمایه همکاران', icon: 'fa-people-group', hint: 'بازگشت اصل پول گوشی و وضعیت سرمایه' },
};

const riskChipClass = (level?: string) => {
  if (level === 'critical') return 'bg-rose-600 text-white';
  if (level === 'high') return 'bg-orange-500 text-white';
  if (level === 'followup') return 'bg-amber-500 text-white';
  return 'bg-emerald-600 text-white';
};

function KpiCard({ label, value, hint, icon, tone = 'slate' }: { label: string; value: React.ReactNode; hint?: string; icon: string; tone?: 'slate' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'sky' }) {
  const toneMap: Record<string, string> = {
    slate: 'bg-slate-900 text-white dark:bg-white dark:text-slate-950',
    emerald: 'bg-emerald-600 text-white',
    amber: 'bg-amber-500 text-white',
    rose: 'bg-rose-600 text-white',
    indigo: 'bg-indigo-600 text-white',
    sky: 'bg-sky-600 text-white',
  };
  return (
    <div className="rounded-[26px] border border-slate-200/80 bg-white/95 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-black tracking-[0.12em] text-slate-500 dark:text-slate-400">{label}</div>
          <div className="mt-2 text-xl font-black text-slate-900 dark:text-white">{value}</div>
          {hint ? <div className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">{hint}</div> : null}
        </div>
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${toneMap[tone] || toneMap.slate}`}>
          <i className={`fa-solid ${icon}`} />
        </span>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-[26px] border border-dashed border-slate-300 bg-slate-50/80 p-8 text-center text-sm font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-400">
      {text}
    </div>
  );
}

export default function MobileSalesAnalytics() {
  const { registerReportExports } = useReportsExports();
  const exportRef = useRef<() => void>(() => undefined);
  const [fromDate, setFromDate] = useState<Date | null>(() => moment().subtract(30, 'day').toDate());
  const [toDate, setToDate] = useState<Date | null>(() => new Date());
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);
  const [data, setData] = useState<AnalyticsPayload>({ summary: emptySummary, cashRows: [], installmentRows: [], realProfitRows: [], risk: { highRiskCount: 0, rows: [] }, partnerCapital: { summary: emptyPartnerCapitalSummary, rows: [] } });
  const [selectedRisk, setSelectedRisk] = useState<InstallmentRow | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (toJ(fromDate)) qs.set('fromDate', toJ(fromDate));
      if (toJ(toDate)) qs.set('toDate', toJ(toDate));
      const res = await apiFetch(`/api/reports/mobile-sales-analytics?${qs.toString()}`);
      const js = await res.json();
      if (!res.ok || js?.success === false) throw new Error(js?.message || 'خطا در دریافت مرکز تحلیل فروش گوشی');
      setData({
        summary: { ...emptySummary, ...(js?.data?.summary || {}) },
        comparison: js?.data?.comparison || {},
        cashRows: Array.isArray(js?.data?.cashRows) ? js.data.cashRows : [],
        installmentRows: Array.isArray(js?.data?.installmentRows) ? js.data.installmentRows : [],
        realProfitRows: Array.isArray(js?.data?.realProfitRows) ? js.data.realProfitRows : [],
        risk: js?.data?.risk || { highRiskCount: 0, rows: [] },
        partnerCapital: js?.data?.partnerCapital || { summary: emptyPartnerCapitalSummary, rows: [] },
        from: js?.data?.from,
        to: js?.data?.to,
      });
    } catch (e: any) {
      setNotification({ type: 'error', text: e?.message || 'خطا در دریافت اطلاعات' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = window.setTimeout(() => { void fetchData(); }, 280);
    return () => window.clearTimeout(t);
  }, [fromDate, toDate]);

  const q = query.trim().toLowerCase();
  const cashRows = useMemo(() => data.cashRows.filter((r) => !q || [r.customerName, r.customerPhone, r.phoneModel, r.imei, r.saleId].some((v) => String(v || '').toLowerCase().includes(q))).slice(0, 250), [data.cashRows, q]);
  const installmentRows = useMemo(() => data.installmentRows.filter((r) => !q || [r.customerName, r.customerPhone, r.phoneModel, r.imei, r.saleId, r.riskLabel, r.riskReasons?.join(' ')].some((v) => String(v || '').toLowerCase().includes(q))).slice(0, 250), [data.installmentRows, q]);
  const riskRows = useMemo(() => (data.risk?.rows || data.installmentRows).filter((r) => !q || [r.customerName, r.customerPhone, r.phoneModel, r.imei, r.riskLabel, r.riskReasons?.join(' ')].some((v) => String(v || '').toLowerCase().includes(q))).slice(0, 100), [data.risk?.rows, data.installmentRows, q]);
  const realRows = useMemo(() => data.realProfitRows.filter((r: any) => !q || [r.customerName, r.customerPhone, r.phoneModel, r.imei, r.saleId, r.riskLabel].some((v) => String(v || '').toLowerCase().includes(q))).slice(0, 120), [data.realProfitRows, q]);
  const partnerRows = useMemo(() => (data.partnerCapital?.rows || []).filter((r) => !q || [r.partnerName, r.partnerSource, r.phones?.map((p) => `${p.phoneModel} ${p.imei}`).join(' ')].some((v) => String(v || '').toLowerCase().includes(q))).slice(0, 120), [data.partnerCapital?.rows, q]);

  const exportExcel = () => {
    const rows = [
      ...data.cashRows.map((r) => ({
        type: 'نقدی', saleId: r.saleId, date: shamsi(r.saleDate), customer: r.customerName || '', phone: r.customerPhone || '', model: r.phoneModel || '', imei: r.imei || '', sale: r.salePrice, purchase: r.purchasePrice, reference: r.referencePrice, profit: r.profit, realizedProfit: r.profit, unrecognizedProfit: 0, collectionRate: '۱۰۰٪', outstanding: 0, risk: '', reasons: '', realProfit: r.realProfit,
      })),
      ...data.installmentRows.map((r) => ({
        type: 'اقساطی', saleId: r.saleId, date: shamsi(r.saleDate), customer: r.customerName || '', phone: r.customerPhone || '', model: r.phoneModel || '', imei: r.imei || '', sale: r.contractTotal, purchase: r.purchasePrice, reference: r.referencePrice, profit: r.fullProfit, realizedProfit: r.realizedProfit, unrecognizedProfit: r.unrecognizedProfit, collectionRate: percent(r.collectionRate), outstanding: r.outstandingAmount, risk: r.riskLabel, reasons: (r.riskReasons || []).join(' | '), realProfit: r.realProfit,
      })),
      ...(data.partnerCapital?.rows || []).map((r) => ({
        type: 'سهم شریک', saleId: '', date: '', customer: r.partnerName, phone: '', model: `کل گوشی: ${r.totalPhonesHad}`, imei: '', sale: r.soldCapitalAtCurrentPrice, purchase: r.initialPurchaseCapital, reference: r.soldCapitalAtCurrentPrice, profit: 0, realizedProfit: 0, unrecognizedProfit: 0, collectionRate: '', outstanding: r.remainingCapitalBalance, risk: r.remainingCapitalBalance > 0 ? 'طلبکار' : r.remainingCapitalBalance < 0 ? 'بدهکار' : 'تسویه', reasons: `نقدی: ${r.cashSoldCount} | اقساطی: ${r.installmentSoldCount} | مانده: ${r.remainingCount} | پرداختی: ${r.paidSettlementAmount} | دریافتی: ${r.receivedSettlementAmount}`, realProfit: r.replacementDeltaCapital,
      })),
    ];
    exportToExcel(`mobile-sales-analytics-V6-${moment().format('YYYYMMDD-HHmm')}`, rows, [
      { header: 'نوع فروش', key: 'type' },
      { header: 'شماره سند', key: 'saleId' },
      { header: 'تاریخ', key: 'date' },
      { header: 'مشتری', key: 'customer' },
      { header: 'موبایل', key: 'phone' },
      { header: 'مدل گوشی', key: 'model' },
      { header: 'IMEI', key: 'imei' },
      { header: 'مبلغ فروش/قرارداد', key: 'sale' },
      { header: 'قیمت خرید', key: 'purchase' },
      { header: 'قیمت خرید روز/جایگزینی', key: 'reference' },
      { header: 'سود کل', key: 'profit' },
      { header: 'سود وصول‌شده', key: 'realizedProfit' },
      { header: 'سود وصول‌نشده', key: 'unrecognizedProfit' },
      { header: 'درصد وصول', key: 'collectionRate' },
      { header: 'مانده وصول', key: 'outstanding' },
      { header: 'ریسک', key: 'risk' },
      { header: 'دلایل ریسک', key: 'reasons' },
      { header: 'سود واقعی با قیمت خرید روز', key: 'realProfit' },
    ], 'تحلیل فروش گوشی');
  };

  exportRef.current = exportExcel;
  useEffect(() => { registerReportExports({ excel: () => exportRef.current() }); return () => registerReportExports({}); }, [registerReportExports]);

  const summary = data.summary || emptySummary;
  const partnerCapitalSummary = data.partnerCapital?.summary || emptyPartnerCapitalSummary;
  const installmentShare = summary.totalSales > 0 ? (summary.installmentSales / summary.totalSales) * 100 : 0;

  return (
    <div className="mobile-sales-analytics-executive-page space-y-5" dir="rtl">
      {notification ? <Notification message={notification} onClose={() => setNotification(null)} /> : null}

      <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="border-b border-slate-100 bg-gradient-to-l from-slate-950 via-slate-900 to-slate-800 p-5 text-white dark:border-slate-800">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-black text-white/85">
                <i className="fa-solid fa-mobile-screen-button" /> مرکز تحلیل گوشی نقد و اقساط
              </div>
              <h1 className="mt-3 text-2xl font-black md:text-3xl">تحلیل فروش گوشی نقد و اقساط</h1>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-white/70">
                فروش نقدی، قراردادهای اقساطی، سود وصول‌شده، ریسک اقساط، سود واقعی و مانده اصل پول شرکا را در یک نمای مدیریتی کنار هم ببین.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[430px]">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-3 shadow-sm backdrop-blur-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-black text-white/65">سهم اقساط از فروش</div>
                  <i className="fa-solid fa-file-invoice-dollar text-xs text-white/75" />
                </div>
                <div className="mt-1 text-2xl font-black text-white">{percent(installmentShare)}</div>
                <div className="mt-1 text-[10px] text-white/60">درصد قراردادهای اقساطی</div>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-3 shadow-sm backdrop-blur-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-black text-white/65">ریسک فوری/بحرانی</div>
                  <i className="fa-solid fa-triangle-exclamation text-xs text-white/75" />
                </div>
                <div className="mt-1 text-2xl font-black text-white">{Number(summary.highRiskCount || 0).toLocaleString('fa-IR')}</div>
                <div className="mt-1 text-[10px] text-white/60">پرونده‌های نیازمند پیگیری</div>
              </div>
            </div>
          </div>
        </div>
        <div className="p-4 md:p-5">
          <div className="grid gap-3 xl:grid-cols-[1fr_auto] xl:items-end">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="sm:col-span-2 lg:col-span-4">
                <ReportDatePresetChips fromDate={fromDate} toDate={toDate} onChange={({ from, to }) => { setFromDate(from); setToDate(to); }} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-black text-slate-600 dark:text-slate-300">از تاریخ</label>
                <ShamsiDatePicker selectedDate={fromDate} onDateChange={setFromDate} inputClassName="min-h-[48px] w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-4 text-base font-black dark:border-slate-700 dark:bg-slate-900/60" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-black text-slate-600 dark:text-slate-300">تا تاریخ</label>
                <ShamsiDatePicker selectedDate={toDate} onDateChange={setToDate} inputClassName="min-h-[48px] w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-4 text-base font-black dark:border-slate-700 dark:bg-slate-900/60" />
              </div>
              <div className="lg:col-span-2">
                <div className="mb-1 flex flex-wrap items-center gap-2"><label className="block text-xs font-black text-slate-600 dark:text-slate-300">جستجو</label><span className="report-local-filter-pill">محلی همین گزارش</span></div>
                <div className="relative">
                  <i className="fa-solid fa-search absolute left-4 right-auto top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="جستجو در همین گزارش: مدل، IMEI، مشتری، شماره سند…" className="report-local-search-input min-h-[48px] w-full rounded-2xl border border-slate-200 bg-slate-50/80 pr-4 pl-11 text-sm font-bold outline-none  dark:border-slate-700 dark:bg-slate-900/60 dark:text-white" />
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => void fetchData()} disabled={loading} className="inline-flex min-h-[48px] items-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 disabled:opacity-60 dark:bg-white dark:text-slate-950">
                <i className={`fa-solid fa-rotate ${loading ? 'animate-spin' : ''}`} /> به‌روزرسانی
              </button>
              <span className="inline-flex min-h-[48px] items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-xs font-black text-slate-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400" title="خروجی Excel از نوار مرکزی بالای گزارش انجام می‌شود.">
                <i className="fa-solid fa-arrow-up-right-from-square" /> خروجی از نوار بالا
              </span>
            </div>
          </div>

          <div className="mobile-sales-tab-grid mt-4 grid grid-cols-1 gap-2 rounded-[24px] border border-slate-200 bg-slate-50 p-1.5 dark:border-slate-800 dark:bg-slate-900/70 sm:grid-cols-2 xl:grid-cols-3">
            {(Object.keys(tabMeta) as TabKey[]).map((key) => (
              <button key={key} onClick={() => setActiveTab(key)} className={`mobile-sales-tab-button min-w-0 rounded-[20px] px-4 py-3 text-right transition ${activeTab === key ? 'bg-white text-slate-950 shadow-sm dark:bg-slate-800 dark:text-white' : 'text-slate-500 hover:bg-white/70 dark:text-slate-400 dark:hover:bg-slate-800/60'}`}>
                <div className="flex items-center gap-2 text-sm font-black"><i className={`fa-solid ${tabMeta[key].icon}`} /> {tabMeta[key].label}</div>
                <div className="mt-1 text-[11px] font-bold opacity-70">{tabMeta[key].hint}</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <KpiDefinitionNote
        title="مرزبندی سود موبایل"
        description="این بخش سود موبایل را از چند زاویه نشان می‌دهد؛ سود نقدی، سود اقساط وصول‌شده و سود واقعی با قیمت مرجع یکی نیستند."
        items={[
          { label: 'سود نقدی قطعی', role: 'recognized', description: 'سود فروش نقدی که وصول آن همزمان با فروش است.' },
          { label: 'سود وصول‌شده اقساط', role: 'collection', description: 'بخشی از سود اقساطی که متناسب با پرداخت‌های دریافتی شناسایی شده.' },
          { label: 'سود وصول‌نشده', role: 'audit', description: 'سود بالقوه باقی‌مانده از قراردادهای اقساطی.' },
          { label: 'سود واقعی با قیمت مرجع', role: 'operational', description: 'تحلیل مدیریتی بر پایه قیمت خرید/جایگزینی روز؛ جایگزین سود حسابداری نیست.' },
        ]}
      />

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="کل فروش گوشی" value={money(summary.totalSales)} hint={`${Number(summary.totalPhones || 0).toLocaleString('fa-IR')} دستگاه در بازه`} icon="fa-mobile-screen-button" tone="slate" />
        <KpiCard label="سود نقدی قطعی" value={money(summary.cashProfit)} hint={`${Number(summary.cashCount || 0).toLocaleString('fa-IR')} فروش نقدی`} icon="fa-bolt" tone="emerald" />
        <KpiCard label="سود وصول‌شده اقساط" value={money(summary.installmentRealizedProfit)} hint={`${percent(summary.installmentCollectionRate)} وصول از قراردادها`} icon="fa-hand-holding-dollar" tone="sky" />
        <KpiCard label="سود وصول‌نشده" value={money(summary.installmentUnrecognizedProfit)} hint={`${money(summary.installmentOutstanding)} مانده وصول`} icon="fa-hourglass-half" tone={summary.installmentUnrecognizedProfit > 0 ? 'amber' : 'emerald'} />
        <KpiCard label="مانده بازگشت سرمایه همکاران" value={money(partnerCapitalSummary.totalRemainingCapitalBalance)} hint={`${Number(partnerCapitalSummary.partnersCount || 0).toLocaleString('fa-IR')} همکار/شریک`} icon="fa-people-group" tone="indigo" />
      </section>

      {activeTab === 'overview' && (
        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white">مقایسه نقدی و اقساطی</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">فروش اقساطی ممکن است سود کل بیشتری بسازد، اما بخش وصول‌نشده و ریسک را هم باید کنار آن دید.</p>
              </div>
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-200">Comparison</span>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="rounded-[26px] border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                <div className="text-sm font-black text-emerald-700 dark:text-emerald-200">فروش نقدی</div>
                <div className="mt-3 space-y-3 text-sm">
                  <div className="flex justify-between"><span>مبلغ فروش</span><strong>{money(summary.cashSales)}</strong></div>
                  <div className="flex justify-between"><span>سود قطعی</span><strong>{money(summary.cashProfit)}</strong></div>
                  <div className="flex justify-between"><span>درصد وصول</span><strong>۱۰۰٪</strong></div>
                </div>
              </div>
              <div className="rounded-[26px] border border-sky-200 bg-sky-50 p-4 dark:border-sky-900/50 dark:bg-sky-950/20">
                <div className="text-sm font-black text-sky-700 dark:text-sky-200">فروش اقساطی</div>
                <div className="mt-3 space-y-3 text-sm">
                  <div className="flex justify-between"><span>مبلغ قرارداد</span><strong>{money(summary.installmentSales)}</strong></div>
                  <div className="flex justify-between"><span>سود کل</span><strong>{money(summary.installmentFullProfit)}</strong></div>
                  <div className="flex justify-between"><span>سود وصول‌شده</span><strong>{money(summary.installmentRealizedProfit)}</strong></div>
                  <div className="flex justify-between"><span>مانده وصول</span><strong>{money(summary.installmentOutstanding)}</strong></div>
                </div>
              </div>
            </div>
          </section>
          <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <h2 className="text-lg font-black text-slate-900 dark:text-white">سیگنال مدیریتی</h2>
            <div className="mt-4 space-y-3">
              <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                <div className="text-xs font-black text-slate-500 dark:text-slate-400">وضعیت وصول اقساط</div>
                <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{percent(summary.installmentCollectionRate)}</div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"><div className="h-full rounded-full bg-slate-900 dark:bg-white" style={{ width: `${Math.max(0, Math.min(100, summary.installmentCollectionRate || 0))}%` }} /></div>
              </div>
              <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                <div className="text-xs font-black text-slate-500 dark:text-slate-400">سود واقعی با قیمت مرجع</div>
                <div className="mt-2 text-xl font-black">{signedMoney(summary.totalRealProfit)}</div>
                <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">قیمت مرجع فعلاً از قیمت فروش/قیمت ثبت‌شده روی گوشی خوانده می‌شود؛ اگر قیمت روز خرید مجدد در آینده ثبت شود، همین گزارش دقیق‌تر می‌شود.</p>
              </div>
            </div>
          </section>
        </div>
      )}

      {activeTab === 'cash' && (
        <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <h2 className="text-lg font-black text-slate-900 dark:text-white">فروش‌های نقدی گوشی</h2>
          <div className="mt-4 overflow-x-auto">
            {cashRows.length ? <table className="min-w-full text-sm"><thead className="text-xs text-slate-500"><tr className="border-b border-slate-200 dark:border-slate-800"><th className="py-3 text-right">گوشی</th><th className="py-3 text-right">مشتری</th><th className="py-3 text-right">مبلغ فروش</th><th className="py-3 text-right">تخفیف</th><th className="py-3 text-right">سود</th><th className="py-3 text-right">سود واقعی</th></tr></thead><tbody>{cashRows.map((r) => <tr key={r.id} className="border-b border-slate-100 dark:border-slate-800/70"><td className="py-3"><div className="font-black text-slate-900 dark:text-white">{r.phoneModel}</div><div className="text-xs text-slate-500" dir="ltr">{r.imei || '—'} • {shamsi(r.saleDate)}</div></td><td className="py-3"><div className="font-bold">{r.customerName}</div><div className="text-xs text-slate-500">{r.customerPhone || '—'}</div></td><td className="py-3 font-black">{money(r.salePrice)}</td><td className="py-3 text-xs">آیتم: {money(r.itemDiscount)}<br />فاکتور: {money(r.invoiceDiscountShare)}</td><td className="py-3">{signedMoney(r.profit)}</td><td className="py-3">{signedMoney(r.realProfit)}</td></tr>)}</tbody></table> : <EmptyState title="در این بازه فروش نقدی گوشی پیدا نشد." />}
          </div>
        </section>
      )}

      {activeTab === 'installment' && (
        <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <h2 className="text-lg font-black text-slate-900 dark:text-white">فروش‌های اقساطی گوشی</h2>
          <div className="mt-4 overflow-x-auto">
            {installmentRows.length ? <table className="min-w-full text-sm"><thead className="text-xs text-slate-500"><tr className="border-b border-slate-200 dark:border-slate-800"><th className="py-3 text-right">گوشی</th><th className="py-3 text-right">مشتری</th><th className="py-3 text-right">قرارداد</th><th className="py-3 text-right">وصول</th><th className="py-3 text-right">سود</th><th className="py-3 text-right">قسط بعدی</th></tr></thead><tbody>{installmentRows.map((r) => <tr key={r.id} className="border-b border-slate-100 dark:border-slate-800/70"><td className="py-3"><div className="font-black text-slate-900 dark:text-white">{r.phoneModel}</div><div className="text-xs text-slate-500" dir="ltr">{r.imei || '—'} • {shamsi(r.saleDate)}</div></td><td className="py-3"><div className="font-bold">{r.customerName}</div><div className="text-xs text-slate-500">{r.customerPhone || '—'}</div></td><td className="py-3 font-black">{money(r.contractTotal)}<div className="text-xs text-slate-500">پیش‌پرداخت: {percent(r.downPaymentRate)}</div></td><td className="py-3"><strong>{percent(r.collectionRate)}</strong><div className="text-xs text-slate-500">مانده: {money(r.outstandingAmount)}</div></td><td className="py-3 text-xs">کل: {money(r.fullProfit)}<br />وصول‌شده: {money(r.realizedProfit)}<br />وصول‌نشده: {money(r.unrecognizedProfit)}</td><td className="py-3 text-xs">{r.nextDueDate ? shamsi(r.nextDueDate) : '—'}<br />{r.nextDueAmount ? money(r.nextDueAmount) : ''}</td></tr>)}</tbody></table> : <EmptyState title="در این بازه فروش اقساطی گوشی پیدا نشد." />}
          </div>
        </section>
      )}

      {activeTab === 'risk' && (
        <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">ریسک اقساط گوشی</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">فروش‌های اقساطی بر اساس وصول، پیش‌پرداخت، دیرکرد، چک و سود وصول‌نشده اولویت‌بندی شده‌اند.</p>
            </div>
            <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-700 dark:bg-rose-950/40 dark:text-rose-200">{Number(summary.highRiskCount || 0).toLocaleString('fa-IR')} پرونده پرریسک</span>
          </div>
          <div className="mt-4 grid gap-3">
            {riskRows.length ? riskRows.map((r) => (
              <button key={r.id} onClick={() => setSelectedRisk(r)} className="rounded-[26px] border border-slate-200 bg-slate-50/80 p-4 text-right transition hover:-translate-y-0.5 hover:bg-white hover:shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:hover:bg-slate-900">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-3 py-1 text-xs font-black ${riskChipClass(r.riskLevel)}`}>{r.riskLabel}</span><span className="text-xs font-black text-slate-500">امتیاز {Number(r.riskScore || 0).toLocaleString('fa-IR')}</span></div>
                    <div className="mt-2 font-black text-slate-900 dark:text-white">{r.customerName} — {r.phoneModel}</div>
                    <div className="mt-1 text-xs text-slate-500" dir="ltr">{r.imei || '—'}</div>
                  </div>
                  <div className="grid gap-2 text-xs md:grid-cols-4 md:text-sm">
                    <div><span className="text-slate-500">مانده</span><div className="font-black">{money(r.outstandingAmount)}</div></div>
                    <div><span className="text-slate-500">وصول</span><div className="font-black">{percent(r.collectionRate)}</div></div>
                    <div><span className="text-slate-500">دیرکرد</span><div className="font-black">{Number(r.overdueCount || 0).toLocaleString('fa-IR')} قسط</div></div>
                    <div><span className="text-slate-500">سود وصول‌نشده</span><div className="font-black">{money(r.unrecognizedProfit)}</div></div>
                  </div>
                </div>
              </button>
            )) : <EmptyState title="پرونده ریسک‌دار برای این بازه پیدا نشد." />}
          </div>
        </section>
      )}

      {activeTab === 'real' && (
        <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <h2 className="text-lg font-black text-slate-900 dark:text-white">سود واقعی گوشی با قیمت خرید روز</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">برای تحلیل جایگزینی موجودی، قیمت خرید روز/جایگزینی کنار قیمت خرید اولیه و مبلغ فروش مقایسه می‌شود.</p>
          <div className="mt-4 overflow-x-auto">
            {realRows.length ? <table className="min-w-full text-sm"><thead className="text-xs text-slate-500"><tr className="border-b border-slate-200 dark:border-slate-800"><th className="py-3 text-right">گوشی</th><th className="py-3 text-right">نوع</th><th className="py-3 text-right">فروش/قرارداد</th><th className="py-3 text-right">خرید اولیه</th><th className="py-3 text-right">قیمت خرید روز</th><th className="py-3 text-right">اثر قیمت</th><th className="py-3 text-right">سود واقعی</th></tr></thead><tbody>{realRows.map((r: any) => <tr key={r.id} className="border-b border-slate-100 dark:border-slate-800/70"><td className="py-3"><div className="font-black text-slate-900 dark:text-white">{r.phoneModel}</div><div className="text-xs text-slate-500" dir="ltr">{r.imei || '—'}</div></td><td className="py-3"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-700 dark:bg-slate-800 dark:text-slate-100">{r.saleTypeLabel || (r.saleType === 'installment' ? 'اقساطی' : 'نقدی')}</span></td><td className="py-3 font-black">{money(r.salePrice ?? r.contractTotal)}</td><td className="py-3">{money(r.purchasePrice)}</td><td className="py-3">{money(r.referencePrice)}</td><td className="py-3">{signedMoney(r.replacementDelta)}</td><td className="py-3">{signedMoney(r.realProfit)}</td></tr>)}</tbody></table> : <EmptyState title="داده‌ای برای تحلیل سود واقعی در این بازه وجود ندارد." />}
          </div>
        </section>
      )}


      {activeTab === 'partners' && (
        <section className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <KpiCard label="تعداد شرکا/همکار" value={Number(partnerCapitalSummary.partnersCount || 0).toLocaleString('fa-IR')} hint="بر اساس پروفایل مالکیت یا تامین‌کننده" icon="fa-users" tone="slate" />
            <KpiCard label="گوشی‌های ثبت‌شده برای شرکا" value={Number(partnerCapitalSummary.totalPhonesHad || 0).toLocaleString('fa-IR')} hint={`نقدی ${Number(partnerCapitalSummary.totalCashSoldCount || 0).toLocaleString('fa-IR')} • اقساطی ${Number(partnerCapitalSummary.totalInstallmentSoldCount || 0).toLocaleString('fa-IR')}`} icon="fa-mobile-screen" tone="sky" />
            <KpiCard label="گوشی‌های مانده" value={Number(partnerCapitalSummary.totalRemainingCount || 0).toLocaleString('fa-IR')} hint={money(partnerCapitalSummary.totalInventoryCapitalAtCurrentPrice)} icon="fa-boxes-stacked" tone="emerald" />
            <KpiCard label="اصل پول گوشی فروخته‌شده" value={money(partnerCapitalSummary.totalSoldCapitalAtCurrentPrice)} hint="با قیمت خرید روز / جایگزینی" icon="fa-sack-dollar" tone="amber" />
            <KpiCard label="مانده بعد از پرداخت/دریافت" value={money(partnerCapitalSummary.totalRemainingCapitalBalance)} hint={`پرداختی: ${money(partnerCapitalSummary.totalPaidToPartners)} • دریافتی: ${money(partnerCapitalSummary.totalReceivedFromPartners)}`} icon="fa-scale-balanced" tone="indigo" />
          </div>

          <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white">گزارش بازگشت سرمایه گوشی همکاران</h2>
                <p className="mt-1 text-sm leading-7 text-slate-500 dark:text-slate-400">
                  این جدول سود گوشی را از اصل سرمایه جدا می‌کند؛ مانده نهایی فقط نشان می‌دهد چه مقدار از سرمایه همکار برگشته یا هنوز در انتظار بازگشت است.
                </p>
              </div>
              <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/30 dark:text-indigo-200">
                مبنا: قیمت خرید روز
              </span>
            </div>
            <div className="mt-4 overflow-x-auto">
              {partnerRows.length ? (
                <table className="min-w-full text-sm">
                  <thead className="text-xs text-slate-500">
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      <th className="py-3 text-right">شریک/همکار</th>
                      <th className="py-3 text-right">تعداد گوشی</th>
                      <th className="py-3 text-right">نقدی</th>
                      <th className="py-3 text-right">اقساطی</th>
                      <th className="py-3 text-right">مانده</th>
                      <th className="py-3 text-right">اصل پول فروخته‌شده</th>
                      <th className="py-3 text-right">موجودی به قیمت روز</th>
                      <th className="py-3 text-right">پرداخت/دریافت</th>
                      <th className="py-3 text-right">مانده بازگشت سرمایه</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partnerRows.map((r) => (
                      <tr key={r.storePartnerId} className="border-b border-slate-100 align-top dark:border-slate-800/70">
                        <td className="py-3">
                          <div className="font-black text-slate-900 dark:text-white">{r.partnerName}</div>
                          <div className="mt-1 text-xs text-slate-500">{r.partnerSource === 'legacy_supplier' ? 'تامین‌کننده قدیمی' : 'شریک فروشگاه'}</div>
                          {r.phones?.length ? <div className="mt-2 text-[11px] leading-6 text-slate-500 dark:text-slate-400">{r.phones.slice(0, 3).map((p) => `${p.phoneModel || 'گوشی'} ${p.imei ? `(${p.imei})` : ''}`).join('، ')}</div> : null}
                        </td>
                        <td className="py-3 font-black">{Number(r.totalPhonesHad || 0).toLocaleString('fa-IR')}</td>
                        <td className="py-3"><strong>{Number(r.cashSoldCount || 0).toLocaleString('fa-IR')}</strong><div className="text-xs text-slate-500">{money(r.cashSoldCapitalAtCurrentPrice)}</div></td>
                        <td className="py-3"><strong>{Number(r.installmentSoldCount || 0).toLocaleString('fa-IR')}</strong><div className="text-xs text-slate-500">{money(r.installmentSoldCapitalAtCurrentPrice)}</div></td>
                        <td className="py-3"><strong>{Number(r.remainingCount || 0).toLocaleString('fa-IR')}</strong><div className="text-xs text-slate-500">به قیمت روز</div></td>
                        <td className="py-3 font-black">{money(r.soldCapitalAtCurrentPrice)}<div className="text-xs text-slate-500">بدون سود گوشی</div></td>
                        <td className="py-3">{money(r.inventoryCapitalAtCurrentPrice)}<div className="text-xs text-slate-500">مانده انبار</div></td>
                        <td className="py-3 text-xs leading-6">
                          پرداختی: <strong>{money(r.paidSettlementAmount)}</strong><br />
                          دریافتی: <strong>{money(r.receivedSettlementAmount)}</strong>
                        </td>
                        <td className="py-3">{signedMoney(r.remainingCapitalBalance)}<div className="text-xs text-slate-500">اصل سرمایه − تسویه‌ها</div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <EmptyState title="برای این بازه/جستجو سهم گوشی شرکا پیدا نشد." />}
            </div>
          </section>
        </section>
      )}

      {selectedRisk ? (
        <div className="fixed inset-0 z-[230] flex justify-end bg-black/40 p-3 backdrop-blur-sm" onClick={() => setSelectedRisk(null)}>
          <aside className="h-full w-full max-w-2xl overflow-auto rounded-[30px] bg-white p-5 shadow-2xl dark:bg-slate-950" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${riskChipClass(selectedRisk.riskLevel)}`}>{selectedRisk.riskLabel}</span>
                <h3 className="mt-3 text-xl font-black text-slate-900 dark:text-white">چرا این فروش باید بررسی شود؟</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{selectedRisk.customerName} — {selectedRisk.phoneModel}</p>
              </div>
              <button onClick={() => setSelectedRisk(null)} className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200">✕</button>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <KpiCard label="مانده وصول" value={money(selectedRisk.outstandingAmount)} icon="fa-wallet" tone="rose" />
              <KpiCard label="درصد وصول" value={percent(selectedRisk.collectionRate)} icon="fa-percent" tone="sky" />
              <KpiCard label="سود وصول‌شده" value={money(selectedRisk.realizedProfit)} icon="fa-circle-check" tone="emerald" />
              <KpiCard label="سود وصول‌نشده" value={money(selectedRisk.unrecognizedProfit)} icon="fa-hourglass" tone="amber" />
            </div>
            <div className="mt-5 rounded-[26px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/70">
              <h4 className="font-black text-slate-900 dark:text-white">دلایل ریسک</h4>
              <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
                {(selectedRisk.riskReasons || []).map((reason, idx) => <li key={idx} className="flex gap-2"><i className="fa-solid fa-circle-info mt-1 text-indigo-500" /> <span>{reason}</span></li>)}
              </ul>
            </div>
            <div className="mt-4 rounded-[26px] border border-slate-200 bg-white p-4 text-sm leading-8 dark:border-slate-800 dark:bg-slate-950">
              <div className="grid gap-2 sm:grid-cols-2">
                <div>شماره سند: <strong>{selectedRisk.saleId.toLocaleString('fa-IR')}</strong></div>
                <div>تاریخ فروش: <strong>{shamsi(selectedRisk.saleDate)}</strong></div>
                <div>پیش‌پرداخت: <strong>{money(selectedRisk.downPayment)} ({percent(selectedRisk.downPaymentRate)})</strong></div>
                <div>قسط/چک عقب‌افتاده: <strong>{Number(selectedRisk.overdueCount || 0).toLocaleString('fa-IR')} / {Number(selectedRisk.overdueChecks || 0).toLocaleString('fa-IR')}</strong></div>
                <div>موعد بعدی: <strong>{selectedRisk.nextDueDate ? shamsi(selectedRisk.nextDueDate) : '—'}</strong></div>
                <div>مبلغ موعد بعدی: <strong>{money(selectedRisk.nextDueAmount)}</strong></div>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
