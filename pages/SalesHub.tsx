import { apiFetch } from "../utils/apiFetch";
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import moment from 'jalali-moment';
import PageShell from '../components/ui/PageShell';
import { ActionLink, IconGlyph, ManagementDirectoryHero, ManagementFilterSurface, ManagementKpiGrid, ManagementListSurface, SelectField, Surface, type ManagementTone } from '@/components/ui';
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
};


type PeriodOption = 7 | 30 | 90;

const periodOptions: Array<{ value: PeriodOption; label: string }> = [
  { value: 7, label: '۷ روز گذشته' },
  { value: 30, label: '۳۰ روز گذشته' },
  { value: 90, label: '۹۰ روز گذشته' },
];

const metricToneMap: Record<MetricCard['tone'], ManagementTone> = {
  blue: 'info',
  emerald: 'success',
  violet: 'accent',
  amber: 'warning',
  sky: 'info',
};


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

  return (
    <Surface surface="glass" scheme="adaptive" variant="panel" wrapContent={false} className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 shadow-sm dark:border-slate-800 dark:bg-slate-950/90">
      <header className="flex flex-col gap-2 border-b border-slate-200/80 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4 dark:border-slate-800">
        <div>
          <h3 className="m-0 text-sm font-black text-slate-950 dark:text-white">روند فروش</h3>
          <p className="m-0 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">مقایسه مبلغ فروش ثبت‌شده در بازه انتخابی</p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
          <i className="fa-solid fa-chart-line" aria-hidden="true" /> نمودار بر پایه فاکتورهای ثبت‌شده
        </span>
      </header>
      <div className="w-full overflow-x-auto overscroll-x-contain p-3 sm:p-4">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-[230px] min-w-[560px] w-full" role="img" aria-label="نمودار فروش">
          {[0, 1, 2, 3].map((line) => {
            const y = padding.top + (line / 3) * innerHeight;
            return <line key={line} x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeDasharray="4 6" />;
          })}
          {polyline ? <polyline points={polyline} fill="none" stroke="currentColor" className="text-sky-600 dark:text-sky-300" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /> : null}
          {points.map((point) => (
            <g key={point.label}>
              <circle cx={point.x} cy={point.y} r="4" fill="currentColor" className="text-sky-600 dark:text-sky-300" />
              <text x={point.x} y={height - 14} textAnchor="middle" className="fill-slate-500 text-[13px] font-bold dark:fill-slate-400">{point.label}</text>
            </g>
          ))}
        </svg>
      </div>
    </Surface>
  );
};

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
        const res = await apiFetch('/api/sales-orders', { headers: getAuthHeaders(token) });
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

    return {
      currentRows,
      currentTotal,
      paidTotal,
      openTotal,
      average,
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
        },
        {
          label: 'مبلغ کل فروش',
          value: formatMoney(currentTotal),
          hint: 'جمع مبلغ فاکتورهای ثبت‌شده',
          icon: 'fa-solid fa-money-bill-trend-up',
          tone: 'emerald' as const,
          trend: trend.text,
          trendTone: trend.tone,
        },
        {
          label: 'میانگین هر فاکتور',
          value: formatMoney(average),
          hint: 'میانگین ارزش سفارش',
          icon: 'fa-solid fa-chart-simple',
          tone: 'violet' as const,
        },
        {
          label: 'مبلغ پرداخت شده',
          value: formatMoney(paidTotal),
          hint: 'فروش‌های نقد یا تسویه‌شده',
          icon: 'fa-solid fa-wallet',
          tone: 'amber' as const,
        },
        {
          label: 'مبلغ اعتباری/معوق',
          value: formatMoney(openTotal),
          hint: 'اعتباری و اقساطی برای پیگیری',
          icon: 'fa-solid fa-clock-rotate-left',
          tone: 'sky' as const,
          trend: openTotal > 0 ? 'نیازمند پیگیری وصول' : 'بدون مانده باز',
          trendTone: openTotal > 0 ? 'down' : 'neutral',
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
      <div className="mx-auto w-full max-w-7xl space-y-3 px-3 pb-6 text-right sm:px-4" dir="rtl" data-ui-sales-page="hub" data-ui-management-directory="sales">
        <ManagementDirectoryHero
          eyebrow="مرکز کنترل فروش"
          title="نمای کلی فروش"
          badge={`${analytics.currentRows.length.toLocaleString('fa-IR')} فاکتور در بازه`}
          description="فروش نقدی، اعتباری و اقساطی، فاکتورها و وضعیت وصول را در یک نمای مدیریتی هماهنگ دنبال کنید."
          navigation={(
            <>
              <ActionLink to="/sales" variant="neutral" size="sm" autoIcon={false} leftIcon={<i className="fa-solid fa-chart-line" aria-hidden="true" />}>نمای فروش</ActionLink>
              <ActionLink to="/invoices" variant="secondary" size="sm" autoIcon={false} leftIcon={<i className="fa-solid fa-file-invoice" aria-hidden="true" />}>فاکتورها</ActionLink>
            </>
          )}
          actions={(
            <>
              <ActionLink to="/sales/cash" variant="primary" size="sm" autoIcon={false} leftIcon={<i className="fa-solid fa-plus" aria-hidden="true" />}>ثبت فروش</ActionLink>
              <ActionLink to="/sales/cash?mode=credit" variant="secondary" size="sm" autoIcon={false} leftIcon={<i className="fa-solid fa-user-check" aria-hidden="true" />}>فروش اعتباری</ActionLink>
              <ActionLink to="/installment-sales" variant="secondary" size="sm" autoIcon={false} leftIcon={<i className="fa-solid fa-calendar-check" aria-hidden="true" />}>فروش اقساطی</ActionLink>
              <ActionLink to="/sales/expenses" variant="secondary" size="sm" autoIcon={false} leftIcon={<i className="fa-solid fa-receipt" aria-hidden="true" />}>هزینه‌ها</ActionLink>
            </>
          )}
          quickStats={[
            {
              key: 'period-sales',
              label: 'فروش بازه انتخابی',
              value: formatMoney(analytics.currentTotal),
              meta: `${analytics.currentRows.length.toLocaleString('fa-IR')} فاکتور ثبت‌شده`,
              icon: 'fa-solid fa-sack-dollar',
              tone: 'success',
            },
            {
              key: 'open-sales',
              label: 'اعتباری و اقساطی',
              value: formatMoney(analytics.openTotal),
              meta: analytics.openTotal > 0 ? 'نیازمند پیگیری وصول' : 'بدون مانده باز در این بازه',
              icon: 'fa-solid fa-clock-rotate-left',
              tone: analytics.openTotal > 0 ? 'warning' : 'neutral',
            },
          ]}
        />

        <ManagementKpiGrid
          items={analytics.metrics.map((metric) => ({
            key: metric.label,
            label: metric.label,
            value: metric.value,
            hint: metric.trend ?? metric.hint,
            icon: metric.icon,
            tone: metricToneMap[metric.tone],
          }))}
        />

        <ManagementFilterSurface>
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-4">
              <SelectField
                value={periodDays}
                onChange={(event) => setPeriodDays(Number(event.target.value) as PeriodOption)}
                size="sm"
                ariaLabel="بازه تحلیل فروش"
                icon={<i className="fa-regular fa-calendar" />}
                wrapperClassName="w-full"
              >
                {periodOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </SelectField>
            </div>
            <div className="flex min-w-0 items-center gap-2 text-[11px] text-slate-500 lg:col-span-8 lg:justify-end dark:text-slate-400">
              <i className="fa-solid fa-circle-info" aria-hidden="true" />
              <span>شاخص‌ها و نمودار فقط از فاکتورهای ثبت‌شده در بازه انتخابی محاسبه می‌شوند.</span>
            </div>
          </div>
        </ManagementFilterSurface>

        <ManagementListSurface
          title="آخرین فاکتورها"
          meta={`نمایش ${analytics.recentRows.length.toLocaleString('fa-IR')} مورد از جدیدترین فروش‌های ثبت‌شده`}
          info={<><i className="fa-solid fa-circle-info" aria-hidden="true" /> نوع پرداخت و مبلغ از خود فاکتور خوانده می‌شود.</>}
          actions={<ActionLink to="/invoices" variant="ghost" size="xs" autoIcon={false} rightIcon={<i className="fa-solid fa-arrow-left" aria-hidden="true" />}>مشاهده همه</ActionLink>}
          bodyClassName="p-0"
        >
          {isLoading ? (
            <div className="space-y-2 p-3 sm:p-4">
              {Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-12 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-900" />)}
            </div>
          ) : analytics.recentRows.length === 0 ? (
            <div className="grid min-h-48 place-items-center p-6 text-center">
              <div>
                <IconGlyph size="lg" tone="neutral" className="mx-auto" aria-hidden="true"><i className="fa-solid fa-receipt" /></IconGlyph>
                <h4 className="mt-3 text-sm font-black text-slate-700 dark:text-slate-200">هنوز فاکتوری ثبت نشده</h4>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">بعد از ثبت فروش، آخرین فاکتورها اینجا نمایش داده می‌شوند.</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-200/80 dark:divide-slate-800">
              {analytics.recentRows.map((sale) => {
                const status = getSaleStatus(sale);
                return (
                  <div key={sale.id} className="grid grid-cols-1 gap-2 px-3 py-3 text-right transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/60 sm:px-4 md:grid-cols-[minmax(0,1.4fr)_minmax(130px,0.7fr)_minmax(150px,0.8fr)_auto] md:items-center">
                    <div className="min-w-0">
                      <Link to={`/invoices/${sale.id}`} className="text-[13px] font-black text-slate-950 hover:text-sky-600 dark:text-slate-50 dark:hover:text-sky-300">فاکتور #{sale.id.toLocaleString('fa-IR')}</Link>
                      <div className="mt-1 truncate text-[11px] font-medium text-slate-500 dark:text-slate-400">{getSaleCustomer(sale)} • {sale.itemName || 'شرح فروش'}</div>
                    </div>
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{formatIsoToShamsi(sale.transactionDate)}</span>
                    <div>
                      <strong className="block text-[13px] font-black text-slate-900 dark:text-slate-100">{formatMoney(getSaleAmount(sale))}</strong>
                      <small className="text-[10px] text-slate-500 dark:text-slate-400">{getSalePaymentLabel(sale)}</small>
                    </div>
                    <span className={`inline-flex w-fit items-center justify-center rounded-full border px-2.5 py-1 text-[10px] font-black ${status.className}`}>{status.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </ManagementListSurface>

        <SalesTrendChart data={analytics.chartData} />
      </div>
    </PageShell>
  );
};

export default SalesHub;
