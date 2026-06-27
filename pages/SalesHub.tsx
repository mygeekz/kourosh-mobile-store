import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import moment from 'jalali-moment';
import PageShell from '../components/ui/PageShell';
import { useAuth } from '../contexts/AuthContext';
import type { SalesTransactionEntry } from '../types';
import { getAuthHeaders } from '../utils/apiUtils';
import { formatIsoToShamsi } from '../utils/dateUtils';
import { formatCurrencyText, readStoredCurrencyUnit } from '../utils/currency';

/**
 * هاب فروش
 * - اگر از صفحات دیگر با state.prefillItem به /sales آمده باشیم،
 *   به صورت خودکار به فروش نقدی هدایت می‌شود تا رفتار قبلی حفظ شود.
 */
type MetricCard = {
  label: string;
  value: string;
  hint: string;
  icon: string;
  tone: 'blue' | 'emerald' | 'violet' | 'amber' | 'sky';
  trend?: string;
  trendTone?: 'up' | 'down' | 'neutral';
  data: number[];
};

type QuickAction = {
  title: string;
  subtitle: string;
  icon: string;
  to: string;
  tone: 'blue' | 'emerald' | 'violet' | 'amber' | 'sky' | 'slate';
};

type PeriodOption = 7 | 30 | 90;

const periodOptions: Array<{ value: PeriodOption; label: string }> = [
  { value: 7, label: '۷ روز گذشته' },
  { value: 30, label: '۳۰ روز گذشته' },
  { value: 90, label: '۹۰ روز گذشته' },
];

const metricToneMap: Record<MetricCard['tone'], { icon: string; stroke: string; soft: string }> = {
  blue: { icon: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/35 dark:text-blue-300 dark:border-blue-900/60', stroke: '#3b82f6', soft: 'from-blue-50/80 to-white dark:from-blue-950/20 dark:to-slate-950/20' },
  emerald: { icon: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/35 dark:text-emerald-300 dark:border-emerald-900/60', stroke: '#10b981', soft: 'from-emerald-50/80 to-white dark:from-emerald-950/20 dark:to-slate-950/20' },
  violet: { icon: 'bg-violet-50 text-violet-600 border-violet-100 dark:bg-violet-950/35 dark:text-violet-300 dark:border-violet-900/60', stroke: '#8b5cf6', soft: 'from-violet-50/80 to-white dark:from-violet-950/20 dark:to-slate-950/20' },
  amber: { icon: 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/35 dark:text-amber-300 dark:border-amber-900/60', stroke: '#f59e0b', soft: 'from-amber-50/80 to-white dark:from-amber-950/20 dark:to-slate-950/20' },
  sky: { icon: 'bg-sky-50 text-sky-600 border-sky-100 dark:bg-sky-950/35 dark:text-sky-300 dark:border-sky-900/60', stroke: '#0ea5e9', soft: 'from-sky-50/80 to-white dark:from-sky-950/20 dark:to-slate-950/20' },
};

const quickToneMap: Record<QuickAction['tone'], string> = {
  blue: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/35 dark:text-blue-300 dark:border-blue-900/60',
  emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/35 dark:text-emerald-300 dark:border-emerald-900/60',
  violet: 'bg-violet-50 text-violet-600 border-violet-100 dark:bg-violet-950/35 dark:text-violet-300 dark:border-violet-900/60',
  amber: 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/35 dark:text-amber-300 dark:border-amber-900/60',
  sky: 'bg-sky-50 text-sky-600 border-sky-100 dark:bg-sky-950/35 dark:text-sky-300 dark:border-sky-900/60',
  slate: 'bg-slate-50 text-slate-600 border-slate-100 dark:bg-slate-900/70 dark:text-slate-300 dark:border-slate-800',
};

const quickActions: QuickAction[] = [
  { title: 'فروش نقدی', subtitle: 'ثبت سریع فروش و صدور فاکتور نقدی', icon: 'fa-solid fa-wallet', to: '/sales/cash', tone: 'emerald' },
  { title: 'فروش اعتباری', subtitle: 'ثبت فروش اعتباری و ایجاد حساب مشتری', icon: 'fa-solid fa-user-check', to: '/sales/cash?mode=credit', tone: 'blue' },
  { title: 'فروش اقساطی', subtitle: 'ثبت قرارداد اقساط و پیگیری پرداخت‌ها', icon: 'fa-solid fa-calendar-check', to: '/installment-sales', tone: 'sky' },
  { title: 'ثبت هزینه', subtitle: 'کنترل هزینه‌های فروشگاه و سود و زیان', icon: 'fa-solid fa-file-invoice-dollar', to: '/sales/expenses', tone: 'amber' },
  { title: 'مدیریت فاکتورها', subtitle: 'جست‌وجو، چاپ و پیگیری فاکتورهای فروش', icon: 'fa-solid fa-file-lines', to: '/invoices', tone: 'violet' },
];

const parseTs = (value?: string | null): number => {
  if (!value) return 0;
  if (value.includes('T') || value.includes('-')) {
    const timestamp = Date.parse(value);
    return Number.isNaN(timestamp) ? 0 : timestamp;
  }
  const parsed = moment.from(value, 'fa', 'jYYYY/jMM/jDD');
  return parsed.isValid() ? parsed.toDate().getTime() : 0;
};

const getSaleAmount = (sale: SalesTransactionEntry | any): number => {
  const amount = Number(sale?.grandTotal ?? sale?.totalAmount ?? sale?.total ?? sale?.totalPrice ?? 0);
  return Number.isFinite(amount) ? amount : 0;
};

const getSaleCustomer = (sale: SalesTransactionEntry | any): string => (
  sale?.customerName ?? sale?.customerFullName ?? sale?.customer ?? (sale?.customerId ? 'مشتری ثبت‌شده' : 'مهمان')
);

const normalizeSalePaymentMethod = (sale: SalesTransactionEntry | any): 'cash' | 'credit' | 'installment' => {
  const raw = String(
    sale?.paymentMethod
    ?? sale?.payment_method
    ?? sale?.paymentType
    ?? sale?.purchaseType
    ?? sale?.purchaseTypeLabel
    ?? '',
  ).trim().toLowerCase();

  if (raw.includes('installment') || raw.includes('قسط')) return 'installment';
  if (raw.includes('credit') || raw.includes('اعتبار')) return 'credit';
  return 'cash';
};

const getSalePaymentLabel = (sale: SalesTransactionEntry | any): string => {
  const kind = normalizeSalePaymentMethod(sale);
  if (kind === 'credit') return 'فروش اعتباری';
  if (kind === 'installment') return 'فروش اقساطی';
  return 'فروش نقدی';
};

const getSaleStatus = (sale: SalesTransactionEntry | any): { label: string; className: string } => {
  if (sale?.status === 'canceled') {
    return { label: 'باطل شده', className: 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900/60' };
  }
  const kind = normalizeSalePaymentMethod(sale);
  if (kind === 'credit') {
    return { label: 'اعتباری', className: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/60' };
  }
  if (kind === 'installment') {
    return { label: 'اقساطی', className: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900/60' };
  }
  return { label: 'نقدی', className: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/60' };
};

const formatMoney = (amount: number): string => formatCurrencyText(amount, readStoredCurrencyUnit());

const buildSparkData = (rows: SalesTransactionEntry[], periodDays: PeriodOption): number[] => {
  const bucketCount = periodDays === 7 ? 7 : periodDays === 30 ? 6 : 6;
  const bucketSize = Math.max(1, Math.ceil(periodDays / bucketCount));
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - periodDays + 1);
  const buckets = Array.from({ length: bucketCount }, () => 0);

  rows.forEach((sale) => {
    const timestamp = parseTs(sale.transactionDate);
    if (!timestamp) return;
    const diffDays = Math.floor((timestamp - start.getTime()) / 86_400_000);
    if (diffDays < 0 || diffDays >= periodDays) return;
    const index = Math.min(bucketCount - 1, Math.max(0, Math.floor(diffDays / bucketSize)));
    buckets[index] += getSaleAmount(sale);
  });

  return buckets;
};

const buildChartData = (rows: SalesTransactionEntry[], periodDays: PeriodOption) => {
  const points = periodDays === 7 ? 7 : 6;
  const step = periodDays === 7 ? 1 : Math.ceil(periodDays / points);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Array.from({ length: points }, (_, index) => {
    const start = new Date(today);
    start.setDate(today.getDate() - periodDays + 1 + index * step);
    const end = new Date(start);
    end.setDate(start.getDate() + step);
    const sales = rows.reduce((sum, sale) => {
      const timestamp = parseTs(sale.transactionDate);
      return timestamp >= start.getTime() && timestamp < end.getTime() ? sum + getSaleAmount(sale) : sum;
    }, 0);

    return {
      label: formatIsoToShamsi(start.toISOString()).slice(5),
      sales,
    };
  });
};

const getTrendText = (current: number, previous: number): { text: string; tone: 'up' | 'down' | 'neutral' } => {
  if (previous <= 0 && current <= 0) return { text: 'بدون داده دوره قبل', tone: 'neutral' };
  if (previous <= 0) return { text: '+۱۰۰٪ نسبت به دوره قبل', tone: 'up' };
  const percent = Math.round(((current - previous) / previous) * 100);
  const prefix = percent > 0 ? '+' : '';
  return { text: `${prefix}${percent.toLocaleString('fa-IR')}٪ نسبت به دوره قبل`, tone: percent >= 0 ? 'up' : 'down' };
};

const filterRowsByWindow = (rows: SalesTransactionEntry[], start: number, end: number): SalesTransactionEntry[] => (
  rows.filter((sale) => {
    const timestamp = parseTs(sale.transactionDate);
    return timestamp >= start && timestamp <= end;
  })
);

const MiniSparkline: React.FC<{ values: number[]; stroke: string }> = ({ values, stroke }) => {
  const normalized = values.length ? values : [0];
  const max = Math.max(...normalized, 1);
  const min = Math.min(...normalized, 0);
  const width = 170;
  const height = 34;
  const range = Math.max(1, max - min);
  const points = normalized.map((value, index) => {
    const x = normalized.length === 1 ? width : (index / (normalized.length - 1)) * width;
    const y = height - ((value - min) / range) * (height - 6) - 3;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg className="mt-3 h-8 w-full overflow-visible" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      <polyline points={points} fill="none" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const SalesTrendChart: React.FC<{ data: Array<{ label: string; sales: number }> }> = ({ data }) => {
  const width = 640;
  const height = 220;
  const padding = { top: 18, right: 28, bottom: 42, left: 18 };
  const maxValue = Math.max(...data.map((point) => point.sales), 1);
  const innerWidth = width - padding.right - padding.left;
  const innerHeight = height - padding.top - padding.bottom;
  const points = data.map((point, index) => {
    const x = padding.left + (data.length === 1 ? innerWidth : (index / (data.length - 1)) * innerWidth);
    const y = padding.top + innerHeight - (point.sales / maxValue) * innerHeight;
    return { ...point, x, y };
  });
  const polyline = points.map((point) => `${point.x},${point.y}`).join(' ');
  const areaPath = points.length ? `M ${points[0].x} ${padding.top + innerHeight} L ${polyline} L ${points[points.length - 1].x} ${padding.top + innerHeight} Z` : '';

  return (
    <div className="overflow-hidden rounded-[26px] border border-slate-200/85 bg-white p-4 shadow-[0_22px_54px_-44px_rgba(15,23,42,0.34)] dark:border-slate-800/90 dark:bg-slate-950/82 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 text-right">
        <div>
          <h3 className="text-[1.05rem] font-black text-slate-950 dark:text-slate-50">نمودار فروش</h3>
          <p className="mt-1 text-[12px] font-medium text-slate-500 dark:text-slate-400">روند فروش ثبت‌شده در بازه انتخابی</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] font-extrabold text-slate-600 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
          <i className="fa-solid fa-chart-line text-blue-500" />
          فروش دوره
        </span>
      </div>

      <div className="mt-5 w-full overflow-hidden rounded-[20px] bg-gradient-to-b from-slate-50 to-white p-3 dark:from-slate-900/70 dark:to-slate-950/30">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-[250px] w-full" role="img" aria-label="نمودار فروش">
          <defs>
            <linearGradient id="salesHubChartFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.24" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {[0, 1, 2, 3].map((line) => {
            const y = padding.top + (line / 3) * innerHeight;
            return <line key={line} x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeDasharray="4 6" />;
          })}
          {areaPath ? <path d={areaPath} fill="url(#salesHubChartFill)" /> : null}
          {polyline ? <polyline points={polyline} fill="none" stroke="#3b82f6" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /> : null}
          {points.map((point) => (
            <g key={point.label}>
              <circle cx={point.x} cy={point.y} r="5" fill="#3b82f6" stroke="white" strokeWidth="3" />
              <text x={point.x} y={height - 14} textAnchor="middle" className="fill-slate-500 text-[13px] font-bold dark:fill-slate-400">{point.label}</text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
};

const MetricTile: React.FC<{ metric: MetricCard }> = ({ metric }) => {
  const tone = metricToneMap[metric.tone];
  const trendClass = metric.trendTone === 'down'
    ? 'text-rose-600 dark:text-rose-300'
    : metric.trendTone === 'up'
      ? 'text-emerald-600 dark:text-emerald-300'
      : 'text-slate-400 dark:text-slate-500';

  return (
    <article className={['rounded-[22px] border border-slate-200/85 bg-gradient-to-br p-4 text-right shadow-[0_18px_42px_-38px_rgba(15,23,42,0.32)] dark:border-slate-800/90 dark:bg-slate-950/82', tone.soft].join(' ')}>
      <div className="flex items-start justify-between gap-3">
        <span className={['grid h-10 w-10 place-items-center rounded-[15px] border text-[16px] shadow-sm', tone.icon].join(' ')}>
          <i className={metric.icon} />
        </span>
        <div className="min-w-0 text-right">
          <div className="text-[12px] font-extrabold text-slate-500 dark:text-slate-400">{metric.label}</div>
          <div className="mt-1.5 text-[1.18rem] font-black tracking-tight text-slate-950 dark:text-slate-50">{metric.value}</div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">{metric.hint}</span>
        {metric.trend ? <span className={`text-[11px] font-black ${trendClass}`}>{metric.trend}</span> : null}
      </div>
      <MiniSparkline values={metric.data} stroke={tone.stroke} />
    </article>
  );
};

const QuickActionCard: React.FC<{ action: QuickAction }> = ({ action }) => (
  <Link
    to={action.to}
    className="group flex min-h-[96px] items-center justify-between gap-3 rounded-[18px] border border-slate-200/80 bg-white px-3.5 py-3 text-right shadow-[0_14px_34px_-32px_rgba(15,23,42,0.32)] transition-all duration-200 hover:-translate-y-[1px] hover:border-slate-300 hover:shadow-[0_20px_42px_-36px_rgba(15,23,42,0.38)] dark:border-slate-800/90 dark:bg-slate-950/82"
  >
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 transition-all duration-200 group-hover:-translate-x-0.5 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
      <i className="fa-solid fa-arrow-left text-[12px]" />
    </span>
    <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
      <div className="min-w-0 text-right">
        <h3 className="truncate text-[13px] font-black text-slate-950 dark:text-slate-50">{action.title}</h3>
        <p className="mt-0.5 truncate text-[11px] font-medium text-slate-500 dark:text-slate-400">{action.subtitle}</p>
      </div>
      <span className={['grid h-10 w-10 shrink-0 place-items-center rounded-[14px] border text-[15px]', quickToneMap[action.tone]].join(' ')}>
        <i className={action.icon} />
      </span>
    </div>
  </Link>
);

const SalesHub: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation() as any;
  const { token } = useAuth();
  const [sales, setSales] = useState<SalesTransactionEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [periodDays, setPeriodDays] = useState<PeriodOption>(30);

  useEffect(() => {
    if (location?.state?.prefillItem) {
      navigate('/sales/cash', { state: location.state, replace: true });
    }
  }, [location?.state, navigate]);

  useEffect(() => {
    let isMounted = true;
    const fetchSalesSummary = async () => {
      if (!token) return;
      setIsLoading(true);
      try {
        const res = await fetch('/api/sales-orders', { headers: getAuthHeaders(token) });
        const json = await res.json();
        if (!res.ok || !json?.success || !Array.isArray(json.data)) throw new Error('sales-summary-fetch-failed');
        if (isMounted) {
          setSales(
            [...(json.data as SalesTransactionEntry[])].sort((a, b) => {
              const diff = parseTs(b.transactionDate) - parseTs(a.transactionDate);
              return diff || Number(b.id) - Number(a.id);
            }),
          );
        }
      } catch {
        if (isMounted) setSales([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void fetchSalesSummary();
    return () => { isMounted = false; };
  }, [token]);

  const analytics = useMemo(() => {
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - periodDays + 1);
    const previousStart = new Date(start);
    previousStart.setDate(previousStart.getDate() - periodDays);
    const previousEnd = new Date(start);
    previousEnd.setMilliseconds(previousEnd.getMilliseconds() - 1);

    const currentRows = filterRowsByWindow(sales, start.getTime(), now.getTime());
    const previousRows = filterRowsByWindow(sales, previousStart.getTime(), previousEnd.getTime());
    const currentTotal = currentRows.reduce((sum, sale) => sum + getSaleAmount(sale), 0);
    const previousTotal = previousRows.reduce((sum, sale) => sum + getSaleAmount(sale), 0);
    const paidTotal = currentRows
      .filter((sale: any) => normalizeSalePaymentMethod(sale) === 'cash')
      .reduce((sum, sale) => sum + getSaleAmount(sale), 0);
    const openTotal = currentRows
      .filter((sale: any) => normalizeSalePaymentMethod(sale) !== 'cash')
      .reduce((sum, sale) => sum + getSaleAmount(sale), 0);
    const average = currentRows.length ? Math.round(currentTotal / currentRows.length) : 0;
    const trend = getTrendText(currentTotal, previousTotal);
    const sparkData = buildSparkData(currentRows, periodDays);

    return {
      currentRows,
      chartData: buildChartData(currentRows, periodDays),
      recentRows: sales.slice(0, 5),
      metrics: [
        {
          label: 'تعداد فاکتورها',
          value: currentRows.length.toLocaleString('fa-IR'),
          hint: `در ${periodOptions.find((item) => item.value === periodDays)?.label}`,
          icon: 'fa-solid fa-cart-shopping',
          tone: 'blue' as const,
          trend: trend.text,
          trendTone: trend.tone,
          data: sparkData,
        },
        {
          label: 'مبلغ کل فروش',
          value: formatMoney(currentTotal),
          hint: 'جمع مبلغ فاکتورهای ثبت‌شده',
          icon: 'fa-solid fa-money-bill-trend-up',
          tone: 'emerald' as const,
          trend: trend.text,
          trendTone: trend.tone,
          data: sparkData,
        },
        {
          label: 'میانگین هر فاکتور',
          value: formatMoney(average),
          hint: 'میانگین ارزش سفارش',
          icon: 'fa-solid fa-chart-simple',
          tone: 'violet' as const,
          data: sparkData.map((value) => Math.round(value / Math.max(1, currentRows.length))),
        },
        {
          label: 'مبلغ پرداخت شده',
          value: formatMoney(paidTotal),
          hint: 'فروش‌های نقد یا تسویه‌شده',
          icon: 'fa-solid fa-wallet',
          tone: 'amber' as const,
          data: sparkData,
        },
        {
          label: 'مبلغ اعتباری/معوق',
          value: formatMoney(openTotal),
          hint: 'اعتباری و اقساطی برای پیگیری',
          icon: 'fa-solid fa-clock-rotate-left',
          tone: 'sky' as const,
          trend: openTotal > 0 ? 'نیازمند پیگیری وصول' : 'بدون مانده باز',
          trendTone: openTotal > 0 ? 'down' : 'neutral',
          data: sparkData,
        },
      ] satisfies MetricCard[],
    };
  }, [periodDays, sales]);

  return (
    <PageShell
      title="فروش"
      description="ثبت اطلاعات و مدیریت فروش"
      icon={<i className="fa-solid fa-cart-shopping" />}
      hideAutoHeader
    >
      <div className="sales-hub-foundation mx-auto max-w-7xl px-3 pb-6 sm:px-4" dir="rtl" data-ui-sales-page="hub">
        <section className="pt-1 md:pt-2" aria-label="هدر تجاری فروش">
          <div className="overflow-hidden rounded-[24px] border border-slate-200/85 bg-white shadow-[0_18px_42px_-36px_rgba(15,23,42,0.28)] dark:border-slate-800/90 dark:bg-slate-950/82">
            <div className="grid min-h-[98px] grid-cols-1 items-center gap-2.5 px-4 py-3 md:grid-cols-[58px_minmax(0,1fr)_auto] md:px-5 lg:px-6">
              <div className="flex justify-center md:justify-start">
                <div className="relative grid h-[48px] w-[48px] place-items-center rounded-[15px] border border-blue-100 bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-50 text-blue-600 shadow-[0_14px_30px_-26px_rgba(59,130,246,0.34)] dark:border-blue-900/60 dark:from-blue-950/30 dark:via-indigo-950/30 dark:to-slate-950/20 dark:text-blue-300">
                  <span className="absolute inset-x-3 bottom-2 h-2.5 rounded-full bg-blue-200/30 blur-md dark:bg-blue-500/10" />
                  <i className="fa-solid fa-cart-shopping relative text-[18px]" />
                </div>
              </div>

              <div className="text-right">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-slate-50 px-2.5 py-0.5 text-[9px] font-extrabold text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
                  <i className="fa-solid fa-bolt text-amber-500" />
                  <span>مرکز رشد فروش و عملیات تجاری</span>
                </div>
                <h1 className="mt-1.5 text-[1.15rem] font-black tracking-tight text-slate-950 dark:text-slate-50 md:text-[1.45rem]">
                  فروش حرفه‌ای، سریع و سودآور
                </h1>
                <p className="mt-1 max-w-3xl text-[11px] font-medium leading-5 text-slate-500 dark:text-slate-400">
                  تمام جریان‌های تجاری فروشگاه در یک هاب متمرکز: ثبت فروش نقدی، اعتباری و اقساطی، مدیریت فاکتورها، کنترل هزینه‌ها و رصد عملکرد فروش برای تصمیم‌گیری سریع‌تر.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-start gap-2 md:justify-end md:self-start">
                <label className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-slate-200/85 bg-white px-2.5 text-[10px] font-extrabold text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-950/82 dark:text-slate-300">
                  <i className="fa-regular fa-calendar text-slate-400" />
                  <select
                    value={periodDays}
                    onChange={(event) => setPeriodDays(Number(event.target.value) as PeriodOption)}
                    className="bg-transparent text-right outline-none"
                    aria-label="بازه گزارش فروش"
                  >
                    {periodOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="خلاصه فروش">
          {analytics.metrics.map((metric) => <MetricTile key={metric.label} metric={metric} />)}
        </section>

        <section className="mt-4" aria-label="دسترسی‌های فروش">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {quickActions.map((action) => <QuickActionCard key={action.title} action={action} />)}
          </div>
        </section>

        <section className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)]" aria-label="تحلیل و آخرین فاکتورها">
          <SalesTrendChart data={analytics.chartData} />

          <div className="rounded-[26px] border border-slate-200/85 bg-white p-4 shadow-[0_22px_54px_-44px_rgba(15,23,42,0.34)] dark:border-slate-800/90 dark:bg-slate-950/82 md:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3 text-right">
              <div>
                <h3 className="text-[1.05rem] font-black text-slate-950 dark:text-slate-50">آخرین فاکتورها</h3>
                <p className="mt-1 text-[12px] font-medium text-slate-500 dark:text-slate-400">جدیدترین فاکتورهای ثبت‌شده فروش</p>
              </div>
              <Link to="/invoices" className="text-[12px] font-black text-blue-600 hover:text-blue-700 dark:text-blue-300">
                مشاهده همه
                <i className="fa-solid fa-arrow-left mr-2" />
              </Link>
            </div>

            <div className="mt-4 overflow-hidden rounded-[20px] border border-slate-200/75 dark:border-slate-800/90">
              {isLoading ? (
                <div className="space-y-3 p-4">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="h-12 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900" />
                  ))}
                </div>
              ) : analytics.recentRows.length === 0 ? (
                <div className="grid min-h-[220px] place-items-center p-6 text-center">
                  <div>
                    <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-900 dark:text-slate-500">
                      <i className="fa-solid fa-receipt" />
                    </span>
                    <h4 className="mt-3 text-[14px] font-black text-slate-700 dark:text-slate-200">هنوز فاکتوری ثبت نشده</h4>
                    <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">بعد از ثبت فروش، آخرین فاکتورها اینجا دیده می‌شوند.</p>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-slate-200/75 dark:divide-slate-800/90">
                  {analytics.recentRows.map((sale) => {
                    const status = getSaleStatus(sale);
                    return (
                      <div key={sale.id} className="grid grid-cols-1 gap-3 px-4 py-3 text-right transition hover:bg-slate-50/80 dark:hover:bg-slate-900/50 md:grid-cols-[1fr_auto_auto_auto] md:items-center">
                        <div className="min-w-0">
                          <Link to={`/invoices/${sale.id}`} className="text-[13px] font-black text-slate-950 hover:text-blue-600 dark:text-slate-50 dark:hover:text-blue-300">
                            فاکتور #{sale.id.toLocaleString('fa-IR')}
                          </Link>
                          <div className="mt-1 truncate text-[12px] font-medium text-slate-500 dark:text-slate-400">
                            {getSaleCustomer(sale)} • {getSalePaymentLabel(sale)} • {sale.itemName || 'شرح فروش'}
                          </div>
                        </div>
                        <span className="text-[12px] font-bold text-slate-500 dark:text-slate-400">{formatIsoToShamsi(sale.transactionDate)}</span>
                        <span className="text-[13px] font-black text-slate-900 dark:text-slate-100">{formatMoney(getSaleAmount(sale))}</span>
                        <span className={`inline-flex w-fit items-center justify-center rounded-full border px-2.5 py-1 text-[11px] font-black ${status.className}`}>{status.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  );
};

export default SalesHub;
