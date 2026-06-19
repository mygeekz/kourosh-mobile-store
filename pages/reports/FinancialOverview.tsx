import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import moment from 'jalali-moment';
import ShamsiDatePicker from '../../components/ShamsiDatePicker';
import ReportDatePresetChips from '../../components/reports/ReportDatePresetChips';
import Notification from '../../components/Notification';
import Modal from '../../components/Modal';
import PriceInput from '../../components/PriceInput';
import { useAuth } from '../../contexts/AuthContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import { useReportsExports } from '../../contexts/ReportsExportsContext';
import { getAuthHeaders } from '../../utils/apiUtils';
import { exportToExcel } from '../../utils/exporters';
import { formatIsoToShamsiDateTime } from '../../utils/dateUtils';
import { FinancialOverviewData, NotificationMessage } from '../../types';
import { formatCurrencyText, readStoredCurrencyUnit } from '../../utils/currency';

type FinancialOverviewExtras = FinancialOverviewData & {
  profit: FinancialOverviewData['profit'] & {
    realizedProfit?: number;
    realizedRevenue?: number;
    realizedCost?: number;
    unrecognizedProfit?: number;
    collectionRate?: number;
    recognitionAudit?: Record<string, unknown> | null;
  };
  workingCapital: FinancialOverviewData['workingCapital'] & {
    audit?: { receivablesSource?: string; payablesSource?: string; debtorsCount?: number; creditorsCount?: number; generatedAt?: string } | null;
  };
  expensesSummary?: {
    total: number;
    byCategory: { category: string; total: number }[];
  };
  totalExpenses?: number;
  realProfit?: number;
};

const money = (n: number | undefined | null) => formatCurrencyText(n ?? 0, readStoredCurrencyUnit());
const percent = (n: number | undefined | null) => `${Number(n ?? 0).toLocaleString('fa-IR', { maximumFractionDigits: 1 })}٪`;
const toShamsiStr = (d: Date) => moment(d).locale('en').format('jYYYY/jMM/jDD');
const formatDateFa = (value?: string | null, withTime = false) => {
  if (!value) return '—';
  const raw = String(value).trim();
  if (/^\d{4}\/\d{2}\/\d{2}/.test(raw)) return raw;
  return withTime
    ? formatIsoToShamsiDateTime(raw, 'jYYYY/jMM/jDD HH:mm')
    : formatIsoToShamsiDateTime(raw, 'jYYYY/jMM/jDD');
};

const normalizeFinancialData = (raw: any): FinancialOverviewExtras => ({
  range: {
    from: raw?.range?.from ?? '',
    to: raw?.range?.to ?? '',
    fromISO: raw?.range?.fromISO ?? '',
    toISO: raw?.range?.toISO ?? '',
  },
  sales: {
    ordersCount: Number(raw?.sales?.ordersCount ?? 0),
    subtotal: Number(raw?.sales?.subtotal ?? 0),
    discounts: Number(raw?.sales?.discounts ?? 0),
    netSalesBeforeTax: Number(raw?.sales?.netSalesBeforeTax ?? 0),
    taxAmount: Number(raw?.sales?.taxAmount ?? 0),
    totalSales: Number(raw?.sales?.totalSales ?? 0),
    refundsTotal: Number(raw?.sales?.refundsTotal ?? 0),
    productSalesTotal: Number(raw?.sales?.productSalesTotal ?? 0),
  },
  profit: {
    grossProfit: Number(raw?.profit?.grossProfit ?? 0),
    cogs: Number(raw?.profit?.cogs ?? 0),
    realizedProfit: Number(raw?.profit?.realizedProfit ?? 0),
    realizedRevenue: Number(raw?.profit?.realizedRevenue ?? 0),
    realizedCost: Number(raw?.profit?.realizedCost ?? 0),
    unrecognizedProfit: Number(raw?.profit?.unrecognizedProfit ?? 0),
    collectionRate: Number(raw?.profit?.collectionRate ?? 0),
    recognitionAudit: raw?.profit?.recognitionAudit ?? null,
  },
  repairs: {
    count: Number(raw?.repairs?.count ?? 0),
    revenue: Number(raw?.repairs?.revenue ?? 0),
    partsCost: Number(raw?.repairs?.partsCost ?? 0),
    laborFee: Number(raw?.repairs?.laborFee ?? 0),
    costs: Number(raw?.repairs?.costs ?? 0),
    profit: Number(raw?.repairs?.profit ?? 0),
  },
  purchases: { total: Number(raw?.purchases?.total ?? 0) },
  workingCapital: {
    receivables: Number(raw?.workingCapital?.receivables ?? 0),
    payables: Number(raw?.workingCapital?.payables ?? 0),
    audit: raw?.workingCapital?.audit ?? null,
  },
  inventory: { inventoryValue: Number(raw?.inventory?.inventoryValue ?? 0) },
  top: {
    debtors: Array.isArray(raw?.top?.debtors) ? raw.top.debtors : [],
    creditors: Array.isArray(raw?.top?.creditors) ? raw.top.creditors : [],
  },
  expensesSummary: raw?.expensesSummary
    ? {
        total: Number(raw?.expensesSummary?.total ?? 0),
        byCategory: Array.isArray(raw?.expensesSummary?.byCategory) ? raw.expensesSummary.byCategory : [],
      }
    : undefined,
  totalExpenses: raw?.totalExpenses != null ? Number(raw.totalExpenses) : undefined,
  realProfit: raw?.realProfit != null ? Number(raw.realProfit) : undefined,
});

const iconClass = (name: string) => `fa-solid ${name}`;

type FinancialMetricTone = 'neutral' | 'good' | 'warn' | 'bad' | 'info';

const metricToneIconClass: Record<FinancialMetricTone, string> = {
  neutral: 'fo-metric-card__icon--neutral',
  good: 'fo-metric-card__icon--good',
  warn: 'fo-metric-card__icon--warn',
  bad: 'fo-metric-card__icon--bad',
  info: 'fo-metric-card__icon--info',
};

const metricToneValueClass: Record<FinancialMetricTone, string> = {
  neutral: 'fo-metric-card__value--neutral',
  good: 'fo-metric-card__value--good',
  warn: 'fo-metric-card__value--warn',
  bad: 'fo-metric-card__value--bad',
  info: 'fo-metric-card__value--info',
};

const FinancialMetricCard = ({
  label,
  value,
  hint,
  icon,
  tone = 'neutral',
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: React.ReactNode;
  tone?: FinancialMetricTone;
}) => (
  <article className="fo-metric-card" dir="rtl">
    <div className="fo-metric-card__copy">
      <span className="fo-metric-card__label">{label}</span>
      <strong className={`fo-metric-card__value ${metricToneValueClass[tone]}`}>{value}</strong>
      {hint ? <span className="fo-metric-card__hint">{hint}</span> : null}
    </div>
    {icon ? <span className={`fo-metric-card__icon ${metricToneIconClass[tone]}`}>{icon}</span> : null}
  </article>
);

const iconButtonClass =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-primary/25 hover:bg-primary/5 hover:text-primary dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-primary/10';

const pillButtonClass =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl border px-3.5 py-2.5 text-sm font-semibold transition';

const categoryName = (c: string) =>
  c === 'rent' ? 'اجاره' : c === 'salary' ? 'حقوق' : c === 'inventory' ? 'خرید کالا' : 'هزینه‌های جانبی';


const ExpensePie = ({ rows, total }: { rows: { category: string; total: number }[]; total: number }) => {
  const radius = 38;
  const cx = 48;
  const cy = 48;
  let startAngle = -Math.PI / 2;
  const sortedRows = [...(rows || [])].filter((r) => Number(r.total || 0) > 0).sort((a, b) => Number(b.total || 0) - Number(a.total || 0));

  const palette = ['#0ea5e9', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981', '#64748b'];
  const arcs = sortedRows.map((r, i) => {
    const value = Number(r.total || 0);
    const frac = total > 0 ? value / total : 0;
    const endAngle = startAngle + frac * Math.PI * 2;
    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);
    const large = endAngle - startAngle > Math.PI ? 1 : 0;
    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2} Z`;
    startAngle = endAngle;
    return { d, color: palette[i % palette.length], value };
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[140px_1fr] lg:items-start">
      <div className="mx-auto flex shrink-0 flex-col items-center">
        <svg width="104" height="104" viewBox="0 0 104 104" className="drop-shadow-sm">
          <circle cx={cx} cy={cy} r={radius} fill="#e5e7eb" className="dark:fill-slate-800" />
          {arcs.map((a, i) => <path key={i} d={a.d} fill={a.color} opacity={0.96} />)}
          <circle cx={cx} cy={cy} r="22" fill="white" className="dark:fill-slate-950" />
          <text x={cx} y={cy - 2} textAnchor="middle" className="fill-slate-900 dark:fill-slate-100" fontSize="9" fontWeight="700">هزینه‌ها</text>
          <text x={cx} y={cy + 11} textAnchor="middle" className="fill-slate-600 dark:fill-slate-300" fontSize="8">{money(total)}</text>
        </svg>
        <div className="mt-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">تفکیک بر اساس دسته هزینه</div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {sortedRows.length ? sortedRows.map((r, idx) => {
          const value = Number(r.total || 0);
          const pct = total > 0 ? Math.round((value / total) * 100) : 0;
          const color = palette[idx % palette.length];
          return (
            <div key={r.category} className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm dark:border-slate-800 dark:bg-slate-950/60">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="h-3 w-3 rounded-sm shrink-0" style={{ background: color }} />
                  <span className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">{categoryName(r.category)}</span>
                </div>
                <div className="shrink-0 text-left">
                  <div className="font-extrabold text-slate-900 dark:text-slate-100">{money(value)}</div>
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{pct.toLocaleString('fa-IR')}٪</div>
                </div>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-800">
                <div className="h-full rounded-full" style={{ width: `${Math.max(4, pct)}%`, background: color }} />
              </div>
            </div>
          );
        }) : (
          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-5 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400 sm:col-span-2">
            هزینه‌ای در این بازه ثبت نشده است.
          </div>
        )}
      </div>
    </div>
  );
};

const FinancialOverviewPage: React.FC = () => {
  const confirmAction = useConfirm();
  const { registerReportExports } = useReportsExports();
  const exportExcelRef = useRef<() => void>(() => {});
  const { token } = useAuth();

  const [fromDate, setFromDate] = useState<Date | null>(() => {
    const m = moment();
    const j = moment(`${m.locale('fa').format('jYYYY/jMM')}/01`, 'jYYYY/jMM/jDD');
    return j.toDate();
  });
  const [toDate, setToDate] = useState<Date | null>(new Date());
  const [data, setData] = useState<FinancialOverviewExtras | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleCreating, setScheduleCreating] = useState(false);
  const [scheduleType, setScheduleType] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [scheduleWeekdays, setScheduleWeekdays] = useState<number[]>([6]);
  const [scheduleMonthDay, setScheduleMonthDay] = useState(1);
  const [drillOpen, setDrillOpen] = useState(false);
  const [drillKpi, setDrillKpi] = useState<'totalSales' | 'productSalesTotal' | 'grossProfit'>('totalSales');
  const [drillRows, setDrillRows] = useState<any[]>([]);
  const [drillLoading, setDrillLoading] = useState(false);

  const currentRange = useMemo(() => ({
    from: fromDate ? toShamsiStr(fromDate) : '',
    to: toDate ? toShamsiStr(toDate) : '',
  }), [fromDate, toDate]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const buildCronFromUi = useCallback(() => {
    const [hh, mm] = String(scheduleTime || '09:00').split(':');
    const hour = Math.max(0, Math.min(23, Number(hh || 9)));
    const minute = Math.max(0, Math.min(59, Number(mm || 0)));

    if (scheduleType === 'daily') return `${minute} ${hour} * * *`;
    if (scheduleType === 'weekly') {
      const days = (scheduleWeekdays || []).length ? scheduleWeekdays : [6];
      const dow = Array.from(new Set(days)).sort().join(',');
      return `${minute} ${hour} * * ${dow}`;
    }
    const day = Math.max(1, Math.min(31, Number(scheduleMonthDay || 1)));
    return `${minute} ${hour} ${day} * *`;
  }, [scheduleMonthDay, scheduleTime, scheduleType, scheduleWeekdays]);

  const scheduleSummaryFa = useMemo(() => {
    const time = scheduleTime || '09:00';
    if (scheduleType === 'daily') return `روزانه ساعت ${time}`;
    if (scheduleType === 'weekly') {
      const map: Record<number, string> = { 0: 'یکشنبه', 1: 'دوشنبه', 2: 'سه‌شنبه', 3: 'چهارشنبه', 4: 'پنجشنبه', 5: 'جمعه', 6: 'شنبه' };
      const days = (scheduleWeekdays || []).length ? scheduleWeekdays : [6];
      return `هفتگی (${days.map((d) => map[d]).join('، ')}) ساعت ${time}`;
    }
    return `ماهانه (روز ${scheduleMonthDay}) ساعت ${time}`;
  }, [scheduleMonthDay, scheduleTime, scheduleType, scheduleWeekdays]);

  const fetchData = useCallback(
    async (override?: { from?: string; to?: string }) => {
      if (!token) return;

      const from = override?.from ?? currentRange.from;
      const to = override?.to ?? currentRange.to;

      setIsLoading(true);
      setIsRefreshing(true);
      try {
        const qs = new URLSearchParams();
        if (from) qs.set('from', from);
        if (to) qs.set('to', to);

        const res = await fetch(`/api/reports/financial-overview?${qs.toString()}`, { headers: getAuthHeaders(token) });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message || 'خطا در دریافت گزارش');
        setData(normalizeFinancialData(json.data));
      } catch (e: any) {
        setNotification({ type: 'error', text: e?.message || 'خطا در دریافت گزارش' });
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [currentRange.from, currentRange.to, token]
  );

  const refreshOverview = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!token) return;
    const t = window.setTimeout(() => {
      void refreshOverview();
    }, 250);
    return () => window.clearTimeout(t);
  }, [refreshOverview, token]);

  const openDrilldown = useCallback(
    async (kpi: 'totalSales' | 'productSalesTotal' | 'grossProfit') => {
      try {
        if (!token) return;
        setDrillKpi(kpi);
        setDrillOpen(true);
        setDrillLoading(true);
        const from = currentRange.from;
        const to = currentRange.to;
        const url = `/api/reports/financial-overview/drilldown?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&kpi=${encodeURIComponent(kpi)}`;
        const resp = await fetch(url, { headers: getAuthHeaders(token) });
        const j = await resp.json();
        if (j?.success) setDrillRows(Array.isArray(j.data) ? j.data : []);
        else setDrillRows([]);
      } finally {
        setDrillLoading(false);
      }
    },
    [currentRange.from, currentRange.to, token]
  );

  const createSchedule = useCallback(async () => {
    try {
      if (!token) return;
      setScheduleCreating(true);
      const resp = await fetch(`/api/reports/schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
        body: JSON.stringify({
          reportKey: 'financial-overview',
          cronExpr: buildCronFromUi(),
          payloadJson: {
            scheduleType,
            scheduleTime,
            scheduleWeekdays,
            scheduleMonthDay,
            range: { from: currentRange.from || null, to: currentRange.to || null },
          },
          channel: 'telegram',
        }),
      });
      const j = await resp.json();
      if (j?.success) {
        setNotification({ type: 'success', text: 'زمان‌بندی ذخیره تغییرات شد.' });
        setScheduleOpen(false);
      } else {
        setNotification({ type: 'error', text: j?.message || 'خطا در زمان‌بندی' });
      }
    } finally {
      setScheduleCreating(false);
    }
  }, [buildCronFromUi, currentRange.from, currentRange.to, scheduleMonthDay, scheduleTime, scheduleType, scheduleWeekdays, token]);

  const exportExcel = useCallback(() => {
    if (!data) return;
    const rows: any[] = [];
    rows.push({ بخش: 'بازه', عنوان: 'از', مقدار: data.range.from || data.range.fromISO || '' });
    rows.push({ بخش: 'بازه', عنوان: 'تا', مقدار: data.range.to || data.range.toISO || '' });
    rows.push({});
    rows.push({ بخش: 'فروش', عنوان: 'تعداد سفارش', مقدار: data.sales.ordersCount });
    rows.push({ بخش: 'فروش', عنوان: 'جمع فروش (با مالیات)', مقدار: data.sales.totalSales });
    rows.push({ بخش: 'فروش', عنوان: 'خالص فروش قبل از مالیات', مقدار: data.sales.netSalesBeforeTax });
    rows.push({ بخش: 'فروش', عنوان: 'تخفیف‌ها', مقدار: data.sales.discounts });
    rows.push({ بخش: 'فروش', عنوان: 'مالیات', مقدار: data.sales.taxAmount });
    rows.push({ بخش: 'فروش', عنوان: 'مرجوعی‌ها', مقدار: data.sales.refundsTotal });
    rows.push({});
    rows.push({ بخش: 'سود', عنوان: 'بهای تمام‌شده', مقدار: data.profit.cogs });
    rows.push({ بخش: 'سود', عنوان: 'سود ناخالص', مقدار: data.profit.grossProfit });
    rows.push({ بخش: 'سود وصول‌شده', عنوان: 'سود تحقق‌یافته', مقدار: data.profit.realizedProfit ?? 0 });
    rows.push({ بخش: 'سود وصول‌شده', عنوان: 'درآمد تحقق‌یافته', مقدار: data.profit.realizedRevenue ?? 0 });
    rows.push({ بخش: 'سود وصول‌شده', عنوان: 'بهای تمام‌شده تحقق‌یافته', مقدار: data.profit.realizedCost ?? 0 });
    rows.push({ بخش: 'سود وصول‌شده', عنوان: 'سود در انتظار وصول', مقدار: data.profit.unrecognizedProfit ?? 0 });
    rows.push({ بخش: 'سود وصول‌شده', عنوان: 'درصد وصول فروش', مقدار: data.profit.collectionRate ?? 0 });
    rows.push({});
    rows.push({ بخش: 'گردش', عنوان: 'خریدها', مقدار: data.purchases.total });
    rows.push({ بخش: 'گردش', عنوان: 'موجودی انبار (ارزش خرید)', مقدار: data.inventory.inventoryValue });
    rows.push({ بخش: 'گردش', عنوان: 'مطالبات مشتریان', مقدار: data.workingCapital.receivables });
    rows.push({ بخش: 'گردش', عنوان: 'بدهی به تامین‌کنندگان', مقدار: data.workingCapital.payables });
    rows.push({});
    rows.push({ بخش: 'Top', عنوان: 'بدهکاران', مقدار: '' });
    (data.top.debtors || []).slice(0, 20).forEach((d: any) => {
      rows.push({ بخش: 'بدهکار', عنوان: d.fullName || d.name, مقدار: d.balance });
    });
    rows.push({});
    rows.push({ بخش: 'Top', عنوان: 'بستانکاران', مقدار: '' });
    (data.top.creditors || []).slice(0, 20).forEach((c: any) => {
      rows.push({ بخش: 'بستانکار', عنوان: c.name, مقدار: c.balance });
    });

    exportToExcel(
      `financial-overview-${new Date().toISOString().slice(0, 10)}.xlsx`,
      rows,
      [
        { header: 'بخش', key: 'بخش' },
        { header: 'عنوان', key: 'عنوان' },
        { header: 'مقدار', key: 'مقدار' },
      ],
      'Overview'
    );
  }, [data]);

  exportExcelRef.current = exportExcel;
  useEffect(() => {
    registerReportExports({ excel: () => exportExcelRef.current() });
    return () => registerReportExports({});
  }, [registerReportExports]);

  const totals = useMemo(() => {
    const expenses = data?.expensesSummary?.total ?? data?.totalExpenses ?? 0;
    const sales = data?.sales.totalSales ?? 0;
    const gross = data?.profit.grossProfit ?? 0;
    const real = data?.realProfit ?? gross - expenses;
    const repairProfit = data?.repairs.profit ?? 0;
    const realizedProfit = data?.profit.realizedProfit ?? 0;
    const realizedRevenue = data?.profit.realizedRevenue ?? 0;
    const realizedCost = data?.profit.realizedCost ?? 0;
    const unrecognizedProfit = data?.profit.unrecognizedProfit ?? 0;
    const collectionRate = data?.profit.collectionRate ?? 0;
    return { expenses, sales, gross, real, repairProfit, realizedProfit, realizedRevenue, realizedCost, unrecognizedProfit, collectionRate };
  }, [data]);

  const debtors = data?.top.debtors ?? [];
  const creditors = data?.top.creditors ?? [];
  const expenseRows = data?.expensesSummary?.byCategory ?? [];

  const salesMarginPct = data?.sales.totalSales ? (data.profit.grossProfit / Math.max(1, data.sales.totalSales)) * 100 : 0;
  const expenseRatioPct = data?.sales.totalSales ? (totals.expenses / Math.max(1, data.sales.totalSales)) * 100 : 0;
  const salesTone = (data?.sales.totalSales ?? 0) > 0 ? 'good' : 'neutral';
  const grossProfitTone = salesMarginPct < 10 ? 'bad' : salesMarginPct < 20 ? 'warn' : 'good';
  const purchasesTone = (data?.purchases.total ?? 0) > 0 ? 'neutral' : 'info';
  const expensesTone = expenseRatioPct > 45 ? 'bad' : expenseRatioPct > 25 ? 'warn' : 'neutral';
  const realProfitTone = totals.real < 0 ? 'bad' : totals.real < Math.max(1, totals.gross) * 0.12 ? 'warn' : 'good';
  const inventoryTone = (data?.inventory.inventoryValue ?? 0) > 0 ? 'info' : 'neutral';
  const collectionTone = totals.collectionRate >= 75 ? 'good' : totals.collectionRate >= 45 ? 'warn' : 'bad';

  return (
    <div className="report-page reports-financial-redesign-v1 financial-overview-redesign-v1" dir="rtl">
      <Notification message={notification} onClose={() => setNotification(null)} />

      <div className="financial-overview-stage27-shell">
        <div className="space-y-5">
          {!data ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
              <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-300">
                <i className={iconClass(isLoading ? 'fa-spinner fa-spin' : 'fa-chart-pie')} />
              </div>
              <div className="text-base font-bold text-slate-700 dark:text-slate-200">{isLoading ? 'در حال دریافت گزارش...' : 'گزارش برای نمایش آماده نیست.'}</div>
              <div className="mt-1 text-sm leading-7">بازه را تغییر بده تا گزارش همان لحظه به‌روزرسانی شود.</div>
            </div>
          ) : (
            <>
              <section className="fo-executive-filter-card" aria-label="فیلتر بازه گزارش مالی">
                <div className="fo-filter-presets">
                  <ReportDatePresetChips fromDate={fromDate} toDate={toDate} onChange={({ from, to }) => { setFromDate(from); setToDate(to); }} className="shadow-none" />
                </div>
                <div className="fo-filter-dates">
                  <div className="fo-date-field">
                    <span className="fo-date-label"><i className={iconClass('fa-calendar-days')} />از تاریخ</span>
                    <ShamsiDatePicker selectedDate={fromDate} onDateChange={setFromDate} inputClassName="fo-date-input" />
                  </div>
                  <div className="fo-date-field">
                    <span className="fo-date-label"><i className={iconClass('fa-calendar-check')} />تا تاریخ</span>
                    <ShamsiDatePicker selectedDate={toDate} onDateChange={setToDate} inputClassName="fo-date-input" />
                  </div>
                </div>
                <button type="button" onClick={() => void refreshOverview()} disabled={isLoading} className="fo-refresh-button">
                  <i className={iconClass(isLoading ? 'fa-spinner fa-spin' : 'fa-rotate-right')} />
                  به‌روزرسانی
                </button>
              </section>

              <section className="fo-section">
                <div className="fo-section-head">
                  <div>
                    <h3>خلاصه مدیریتی</h3>
                    <p>چهار شاخص اصلی برای ارزیابی سریع فروش، سود و وصول در بازه انتخابی.</p>
                  </div>
                  <div className="fo-section-actions">
                    <a href="#/reports/product-sales" className="fo-action-link"><i className={iconClass('fa-chart-line')} />جزئیات فروش</a>
                    <a href="#/reports/financial-audit" className="fo-action-link"><i className={iconClass('fa-shield-check')} />کنترل اختلاف</a>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <FinancialMetricCard label="جمع فروش" value={money(data.sales.totalSales)} hint={`${data.sales.ordersCount.toLocaleString('fa-IR')} سفارش ثبت‌شده`} tone={salesTone} icon={<i className={iconClass('fa-sack-dollar')} />} />
                  <FinancialMetricCard label="سود ناخالص" value={money(data.profit.grossProfit)} hint={`بهای تمام‌شده: ${money(data.profit.cogs)} • حاشیه ${salesMarginPct.toLocaleString('fa-IR', { maximumFractionDigits: 1 })}٪`} tone={grossProfitTone} icon={<i className={iconClass('fa-chart-line')} />} />
                  <FinancialMetricCard label="سود عملیاتی" value={money(totals.real)} hint="سود ناخالص پس از کسر هزینه‌ها" tone={realProfitTone} icon={<i className={iconClass('fa-bullseye')} />} />
                  <FinancialMetricCard label="درصد وصول فروش" value={percent(totals.collectionRate)} hint="نسبت وصول واقعی به فروش قراردادی" tone={collectionTone} icon={<i className={iconClass('fa-gauge-high')} />} />
                </div>
              </section>

              <section className="fo-section">
                <div className="fo-section-head">
                  <div>
                    <h3>سرمایه در گردش</h3>
                    <p>مانده‌های عملیاتی که روی نقدینگی روز فروشگاه اثر مستقیم دارند.</p>
                  </div>
                  <div className="fo-section-actions">
                    <a href="#/reports/aging-receivables" className="fo-action-link"><i className={iconClass('fa-user-clock')} />ریسک وصول</a>
                    <a href="#/reports/cashflow" className="fo-action-link"><i className={iconClass('fa-wallet')} />جریان نقدی</a>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <FinancialMetricCard label="مطالبات مشتریان" value={money(data.workingCapital.receivables)} hint={`${Number(data.workingCapital.audit?.debtorsCount ?? debtors.length).toLocaleString('fa-IR')} مشتری بدهکار`} tone={(data.workingCapital.receivables ?? 0) > 0 ? 'warn' : 'good'} icon={<i className={iconClass('fa-user-clock')} />} />
                  <FinancialMetricCard label="بدهی به همکاران" value={money(data.workingCapital.payables)} hint={`${Number(data.workingCapital.audit?.creditorsCount ?? creditors.length).toLocaleString('fa-IR')} حساب بستانکار`} tone={(data.workingCapital.payables ?? 0) > 0 ? 'neutral' : 'good'} icon={<i className={iconClass('fa-file-invoice-dollar')} />} />
                  <FinancialMetricCard label="ارزش موجودی" value={money(data.inventory.inventoryValue)} hint="ارزش خرید کالاهای قابل فروش" tone={inventoryTone} icon={<i className={iconClass('fa-boxes-stacked')} />} />
                  <FinancialMetricCard label="خریدها" value={money(data.purchases.total)} hint={`مرجوعی‌ها: ${money(data.sales.refundsTotal)}`} tone={purchasesTone} icon={<i className={iconClass('fa-cart-shopping')} />} />
                </div>
              </section>

              <section className="fo-section fo-realized-section">
                <div className="fo-section-head">
                  <div>
                    <h3>سود وصول‌شده</h3>
                    <p>برای فروش نقدی، اعتباری و اقساطی؛ سود فقط وقتی تصمیم‌ساز است که میزان وصول آن مشخص باشد.</p>
                  </div>
                  <div className="fo-section-actions">
                    <a href="#/reports/realized-profit" className="fo-action-link"><i className={iconClass('fa-circle-check')} />جزئیات سود وصول‌شده</a>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  {[
                    { label: 'سود تحقق‌یافته', value: totals.realizedProfit, sub: `وصول واقعی: ${money(totals.realizedRevenue)}`, icon: 'fa-circle-check', tone: 'fo-tone-good' },
                    { label: 'سود در انتظار وصول', value: totals.unrecognizedProfit, sub: 'سود مانده در اقساط و مطالبات', icon: 'fa-hourglass-half', tone: 'fo-tone-warn' },
                    { label: 'بهای تمام‌شده وصول‌شده', value: totals.realizedCost, sub: `درصد وصول: ${percent(totals.collectionRate)}`, icon: 'fa-scale-balanced', tone: 'fo-tone-info' },
                  ].map((item) => {
                    const max = Math.max(1, Math.abs(totals.realizedProfit), Math.abs(totals.unrecognizedProfit), Math.abs(totals.realizedCost));
                    const width = Math.max(4, Math.min(100, Math.round((Math.abs(item.value) / max) * 100)));
                    return (
                      <div key={item.label} className="fo-realized-card">
                        <div className="fo-realized-card-top">
                          <span className={`fo-realized-icon ${item.tone}`}><i className={iconClass(item.icon)} /></span>
                          <div>
                            <div className="fo-realized-label">{item.label}</div>
                            <div className="fo-realized-value">{money(item.value)}</div>
                          </div>
                        </div>
                        <div className="fo-realized-sub">{item.sub}</div>
                        <div className="fo-meter"><span style={{ width: `${width}%` }} /></div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,.8fr)]">
                <div className="fo-section">
                  <div className="fo-section-head">
                    <div>
                      <h3>هزینه‌ها و سود عملیاتی</h3>
                      <p>اثر هزینه‌ها روی سود نهایی بازه انتخابی.</p>
                    </div>
                    <div className="fo-mini-badge">نسبت هزینه به فروش: {expenseRatioPct.toLocaleString('fa-IR', { maximumFractionDigits: 1 })}٪</div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    {[
                      { label: 'فروش', value: totals.sales, icon: 'fa-hand-holding-dollar' },
                      { label: 'سود ناخالص', value: totals.gross, icon: 'fa-chart-simple' },
                      { label: 'هزینه‌ها', value: totals.expenses, icon: 'fa-receipt' },
                    ].map((item) => (
                      <div key={item.label} className="fo-compact-metric">
                        <i className={iconClass(item.icon)} />
                        <span>{item.label}</span>
                        <strong>{money(item.value)}</strong>
                      </div>
                    ))}
                  </div>
                  <div className="fo-inline-actions">
                    <button type="button" onClick={() => void openDrilldown('totalSales')} className="fo-action-link"><i className={iconClass('fa-list-ul')} />جزئیات جمع فروش</button>
                    <button type="button" onClick={() => void openDrilldown('grossProfit')} className="fo-action-link"><i className={iconClass('fa-layer-group')} />جزئیات سود ناخالص</button>
                  </div>
                </div>

                <div className="fo-section">
                  <div className="fo-section-head">
                    <div>
                      <h3>تفکیک هزینه‌ها</h3>
                      <p>نمای دسته‌بندی هزینه‌های ثبت‌شده.</p>
                    </div>
                  </div>
                  {expenseRows.length > 0 ? (
                    <ExpensePie rows={expenseRows} total={Number(data.expensesSummary?.total ?? 0)} />
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
                      هزینه‌ای در این بازه ثبت نشده است.
                    </div>
                  )}
                </div>
              </section>

              <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div className="fo-section fo-list-section">
                  <div className="fo-section-head">
                    <div>
                      <h3>بدهکاران شاخص</h3>
                      <p>مشتریانی که بیشترین اثر را روی مطالبات دارند.</p>
                    </div>
                    <a href="#/reports/aging-receivables" className="fo-action-link"><i className={iconClass('fa-arrow-up-right-from-square')} />تحلیل ریسک وصول</a>
                  </div>
                  {debtors.length === 0 ? (
                    <div className="fo-empty-state">موردی برای نمایش وجود ندارد.</div>
                  ) : (
                    <div className="fo-person-list">
                      {debtors.slice(0, 6).map((d: any, i: number) => {
                        const name = String(d.fullName || d.name || '—').trim();
                        const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part: string) => part[0]).join('').slice(0, 2) || '؟';
                        return (
                          <a key={d.id ?? i} href={`#/customers/${d.id ?? ''}#customer-ledger-section`} className="fo-person-row">
                            <span className="fo-avatar">{initials}</span>
                            <span className="fo-person-name">{name}</span>
                            <strong>{money(d.balance)}</strong>
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="fo-section fo-list-section">
                  <div className="fo-section-head">
                    <div>
                      <h3>بستانکاران شاخص</h3>
                      <p>حساب‌هایی که بیشترین تعهد پرداخت را ایجاد کرده‌اند.</p>
                    </div>
                  </div>
                  {creditors.length === 0 ? (
                    <div className="fo-empty-state">موردی برای نمایش وجود ندارد.</div>
                  ) : (
                    <div className="fo-person-list">
                      {creditors.slice(0, 6).map((c: any, i: number) => {
                        const name = String(c.partnerName || c.fullName || c.name || '—').trim();
                        const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part: string) => part[0]).join('').slice(0, 2) || '؟';
                        return (
                          <a key={c.id ?? i} href={`#/people/${c.id ?? ''}`} className="fo-person-row fo-person-row--creditor">
                            <span className="fo-avatar">{initials}</span>
                            <span className="fo-person-name">{name}</span>
                            <strong>{money(c.balance)}</strong>
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            </>
          )}

          {drillOpen ? (
            <Modal
              title={drillKpi === 'totalSales' ? 'جزئیات جمع فروش' : drillKpi === 'productSalesTotal' ? 'جزئیات فروش غیرگوشی' : 'جزئیات سود ناخالص'}
              onClose={() => setDrillOpen(false)}
              widthClass="max-w-4xl"
            >
              {drillLoading ? (
                <div className="p-6 text-sm text-slate-600 dark:text-slate-300">در حال دریافت اطلاعات…</div>
              ) : drillRows.length === 0 ? (
                <div className="p-6 text-sm text-slate-600 dark:text-slate-300">موردی یافت نشد.</div>
              ) : (
                <div className="overflow-auto">
                  <table className="min-w-full text-sm">
                    <thead className="sticky top-0 bg-white dark:bg-slate-950">
                      <tr className="text-right text-slate-600 dark:text-slate-300">
                        <th className="px-3 py-2">فاکتور</th>
                        <th className="px-3 py-2">تاریخ</th>
                        <th className="px-3 py-2">مشتری</th>
                        <th className="px-3 py-2">مبلغ</th>
                        {drillKpi === 'grossProfit' ? <th className="px-3 py-2">سود</th> : null}
                      </tr>
                    </thead>
                    <tbody>
                      {drillRows.map((r, i) => (
                        <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                          <td className="px-3 py-2">{r.orderId ?? '—'}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{formatDateFa(r.date, true)}</td>
                          <td className="px-3 py-2">
                            {r.customerName || '—'}
                            {r.customerPhone ? <div className="text-xs text-slate-500">{r.customerPhone}</div> : null}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">{money(r.amount)}</td>
                          {drillKpi === 'grossProfit' ? <td className="px-3 py-2 whitespace-nowrap">{money(r.profit)}</td> : null}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Modal>
          ) : null}

          {scheduleOpen ? (
            <Modal title="زمان‌بندی ارسال گزارش به تلگرام" onClose={() => setScheduleOpen(false)} widthClass="max-w-2xl">
              <div className="space-y-4 text-sm">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
                  زمان‌بندی را انتخاب کنید. cron به‌صورت خودکار ساخته می‌شود.
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-500 dark:text-slate-400">تکرار</label>
                    <div className="relative">
                      <i className={`${iconClass('fa-repeat')} ux-input-affix-icon ux-input-affix-icon--left`} />
                      <select
                        value={scheduleType}
                        onChange={(e) => setScheduleType(e.target.value as any)}
                        className="ux-input-affix-target--left ux-input-affix-target--wide w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 pr-3 outline-none dark:border-slate-700 dark:bg-slate-950"
                      >
                        <option value="daily">روزانه</option>
                        <option value="weekly">هفتگی</option>
                        <option value="monthly">ماهانه</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-500 dark:text-slate-400">ساعت</label>
                    <div className="relative">
                      <i className={`${iconClass('fa-clock')} ux-input-affix-icon ux-input-affix-icon--left`} />
                      <input
                        type="time"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        className="ux-input-affix-target--left ux-input-affix-target--wide w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 pr-3 text-center font-mono outline-none dark:border-slate-700 dark:bg-slate-950"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  {scheduleType === 'weekly' ? (
                    <div className="md:col-span-2">
                      <label className="mb-1.5 block text-xs font-bold text-slate-500 dark:text-slate-400">روزهای هفته</label>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-7">
                        {[
                          { v: 6, t: 'شنبه' },
                          { v: 0, t: 'یکشنبه' },
                          { v: 1, t: 'دوشنبه' },
                          { v: 2, t: 'سه‌شنبه' },
                          { v: 3, t: 'چهارشنبه' },
                          { v: 4, t: 'پنجشنبه' },
                          { v: 5, t: 'جمعه' },
                        ].map((d) => {
                          const active = scheduleWeekdays.includes(d.v);
                          return (
                            <button
                              type="button"
                              key={d.v}
                              onClick={() => {
                                setScheduleWeekdays((prev) => (prev.includes(d.v) ? prev.filter((x) => x !== d.v) : [...prev, d.v]));
                              }}
                              className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-3 py-2.5 text-sm font-semibold transition ${
                                active
                                  ? 'border-primary bg-primary text-white shadow-sm'
                                  : 'border-slate-200 bg-white text-slate-700 hover:border-primary/25 hover:bg-primary/5 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200'
                              }`}
                            >
                              <i className={iconClass(active ? 'fa-check' : 'fa-calendar-day')} />
                              {d.t}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  {scheduleType === 'monthly' ? (
                    <div className="md:col-span-2">
                      <label className="mb-1.5 block text-xs font-bold text-slate-500 dark:text-slate-400">روز ماه</label>
                      <PriceInput
                        name="scheduleMonthDay"
                        value={String(scheduleMonthDay)}
                        onChange={(e) => setScheduleMonthDay(Math.max(1, Math.min(31, Number(e.target.value || 1))))}
                        className="w-full text-left"
                        topLabel="روز"
                        suffix="ماه"
                        preview="مثلاً ۱۵"
                      />
                    </div>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200">
                  <div className="font-bold">خلاصه: {scheduleSummaryFa}</div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    cronExpr: <span className="font-mono">{buildCronFromUi()}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button type="button" className={iconButtonClass} onClick={() => setScheduleOpen(false)}>
                    <i className={iconClass('fa-xmark')} />
                    انصراف
                  </button>
                  <button
                    type="button"
                    onClick={() => void createSchedule()}
                    disabled={scheduleCreating}
                    className={`${pillButtonClass} border-primary/20 bg-primary text-white shadow-sm hover:brightness-110 disabled:opacity-50`}
                  >
                    <i className={iconClass(scheduleCreating ? 'fa-spinner fa-spin' : 'fa-paper-plane')} />
                    ثبت اطلاعات زمان‌بندی
                  </button>
                </div>
              </div>
            </Modal>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default FinancialOverviewPage;
