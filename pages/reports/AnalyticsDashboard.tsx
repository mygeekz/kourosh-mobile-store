import { useCallback, useEffect, useMemo, useState } from 'react';
import moment from 'jalali-moment';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';
import ShamsiDatePicker from '../../components/ShamsiDatePicker';
import ReportDatePresetChips from '../../components/reports/ReportDatePresetChips';
import ReportFilterField from '../../components/reports/ReportFilterField';
import Notification from '../../components/Notification';
import Skeleton from '../../components/ui/Skeleton';
import { useAuth } from '../../contexts/AuthContext';
import type { NotificationMessage } from '../../types';

type AnalyticsData = {
  range: { from: string; to: string };
  salesTrend: { date: string; revenue: number }[];
  debtDailyTrend: { date: string; debt: number }[];
  debtByDueMonth: { month: string; debt: number }[];
  monthComparison: { month: string; revenue: number }[];
  bestProductsByProfit: {
    id: number;
    name: string;
    qty: number;
    revenue: number;
    unitCost: number;
    cogs: number;
    profit: number;
  }[];
  worstProductsByProfit: {
    id: number;
    name: string;
    qty: number;
    revenue: number;
    unitCost: number;
    cogs: number;
    profit: number;
  }[];
  bestProducts: { id: number; name: string; qty: number; revenue: number }[];
  worstProducts: { id: number; name: string; qty: number; revenue: number }[];
};

const fmtMoney = (n: any) => Number(n || 0).toLocaleString('fa-IR');
const fmtChartMoney = (n: any) => {
  const v = Number(n || 0);
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toLocaleString('fa-IR', { maximumFractionDigits: 1 })}م`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toLocaleString('fa-IR', { maximumFractionDigits: 0 })}هزار`;
  return v.toLocaleString('fa-IR');
};
const tooltipMoney = (value: any, label = 'درآمد') => [`${fmtMoney(value)} تومان`, label];
const startOfCurrentJalaliMonth = () => moment().startOf('jMonth').startOf('day').toDate();

const fmtPercent = (n: any) => {
  const v = Number(n || 0);
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toLocaleString('fa-IR', { maximumFractionDigits: 1 })}%`;
};

const prettyDay = (iso: string) => {
  try {
    return moment(iso, 'YYYY-MM-DD').locale('fa').format('jMM/jDD');
  } catch {
    return iso;
  }
};

const prettyMonth = (ym: string) => {
  try {
    return moment(`${ym}-01`, 'YYYY-MM-DD').locale('fa').format('jYY/jMM');
  } catch {
    return ym;
  }
};

function clampPct(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(-999, Math.min(999, n));
}

const hasPositiveValue = <T extends Record<string, any>>(rows: T[] | undefined, key: keyof T) =>
  Array.isArray(rows) && rows.some((row) => Number(row?.[key] || 0) > 0);

const hasMoreThanOnePositivePoint = <T extends Record<string, any>>(rows: T[] | undefined, key: keyof T) =>
  Array.isArray(rows) && rows.filter((row) => Number(row?.[key] || 0) > 0).length > 1;

const EmptyAnalyticsState = ({ icon, title, text }: { icon: string; title: string; text: string }) => (
  <div className="analytics-executive-empty-state">
    <span className="analytics-executive-empty-state__icon"><i className={icon} /></span>
    <div>
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  </div>
);

export default function AnalyticsDashboard() {
  const { token } = useAuth();

  const [fromDate, setFromDate] = useState<Date | null>(() => startOfCurrentJalaliMonth());
  const [toDate, setToDate] = useState<Date | null>(new Date());

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [compareData, setCompareData] = useState<AnalyticsData | null>(null);

  const [compareEnabled, setCompareEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('analytics_compare') === '1';
    } catch {
      return false;
    }
  });

  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'receivables'>('overview');

  const [isLoading, setIsLoading] = useState(false);
  const [isCompareLoading, setIsCompareLoading] = useState(false);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);

  const currentRange = useMemo(() => {
    if (!fromDate || !toDate) return { from: null as Date | null, to: null as Date | null };
    return {
      from: moment(fromDate).startOf('day').toDate(),
      to: moment(toDate).endOf('day').toDate(),
    };
  }, [fromDate, toDate]);

  const compareRange = useMemo(() => {
    if (!currentRange.from || !currentRange.to) return { from: null as Date | null, to: null as Date | null };
    const days = Math.max(1, moment(currentRange.to).startOf('day').diff(moment(currentRange.from).startOf('day'), 'days') + 1);
    const prevTo = moment(currentRange.from).subtract(1, 'day').endOf('day').toDate();
    const prevFrom = moment(prevTo).subtract(days - 1, 'days').startOf('day').toDate();
    return { from: prevFrom, to: prevTo };
  }, [currentRange]);

  const buildRangeParams = useCallback((from: Date | null, to: Date | null) => {
    const qs = new URLSearchParams();
    if (from) qs.set('from', from.toISOString());
    if (to) qs.set('to', to.toISOString());
    return qs;
  }, []);

  const fetchMainAnalytics = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setNotification(null);

    try {
      const qs = buildRangeParams(currentRange.from, currentRange.to);
      const res = await fetch(`/api/reports/analytics-dashboard?${qs.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } });
      const js = await res.json();
      if (!res.ok || js?.success === false) throw new Error(js?.message || 'خطا در دریافت گزارش تحلیلی');
      setData(js.data);
    } catch (e: any) {
      setNotification({ message: e?.message || 'خطا در عملیات', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [token, currentRange, buildRangeParams]);

  const fetchCompareAnalytics = useCallback(async () => {
    if (!token) return;
    if (!compareEnabled) {
      setCompareData(null);
      return;
    }
    if (!compareRange.from || !compareRange.to) return;

    setIsCompareLoading(true);
    try {
      const qs = buildRangeParams(compareRange.from, compareRange.to);
      const res = await fetch(`/api/reports/analytics-dashboard?${qs.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } });
      const js = await res.json();
      if (!res.ok || js?.success === false) throw new Error(js?.message || 'خطا در دریافت بازه مقایسه');
      setCompareData(js.data);
    } catch {
      setCompareData(null);
    } finally {
      setIsCompareLoading(false);
    }
  }, [token, compareEnabled, compareRange, buildRangeParams]);

  useEffect(() => {
    if (!token) return;
    const t = window.setTimeout(() => { void fetchMainAnalytics(); }, 250);
    return () => window.clearTimeout(t);
  }, [token, fetchMainAnalytics]);

  useEffect(() => {
    if (!token) return;
    try { localStorage.setItem('analytics_compare', compareEnabled ? '1' : '0'); } catch { /* ignore */ }
    const t = window.setTimeout(() => { void fetchCompareAnalytics(); }, 300);
    return () => window.clearTimeout(t);
  }, [token, compareEnabled, fetchCompareAnalytics]);

  const applyPreset = (preset: '7d' | 'thisMonth' | 'lastMonth') => {
    const now = moment();

    if (preset === '7d') {
      setFromDate(now.clone().subtract(6, 'days').startOf('day').toDate());
      setToDate(now.clone().endOf('day').toDate());
      return;
    }

    if (preset === 'thisMonth') {
      setFromDate(now.clone().startOf('jMonth').startOf('day').toDate());
      setToDate(now.clone().endOf('day').toDate());
      return;
    }

    // lastMonth
    const lm = now.clone().subtract(1, 'jMonth');
    setFromDate(lm.clone().startOf('jMonth').startOf('day').toDate());
    setToDate(lm.clone().endOf('jMonth').endOf('day').toDate());
  };

  const kpis = useMemo(() => {
    const totalRevenue = (data?.salesTrend || []).reduce((s, x) => s + Number(x.revenue || 0), 0);
    const avgDaily = data?.salesTrend?.length ? Math.round(totalRevenue / data.salesTrend.length) : 0;

    const lastDebt = (data?.debtDailyTrend || []).length
      ? Number(data?.debtDailyTrend?.[data.debtDailyTrend.length - 1]?.debt || 0)
      : 0;

    const prevRevenue = (compareData?.salesTrend || []).reduce((s, x) => s + Number(x.revenue || 0), 0);
    const revenueDeltaPct = prevRevenue ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;

    const prevAvg = compareData?.salesTrend?.length ? Math.round(prevRevenue / compareData.salesTrend.length) : 0;
    const avgDeltaPct = prevAvg ? ((avgDaily - prevAvg) / prevAvg) * 100 : 0;

    const compareDebtTrend = compareData?.debtDailyTrend || [];
    const prevDebt = compareDebtTrend.length
      ? Number(compareDebtTrend[compareDebtTrend.length - 1]?.debt || 0)
      : 0;
    const debtDeltaPct = prevDebt ? ((lastDebt - prevDebt) / prevDebt) * 100 : 0;

    return {
      totalRevenue,
      avgDaily,
      lastDebt,
      revenueDeltaPct: clampPct(revenueDeltaPct),
      avgDeltaPct: clampPct(avgDeltaPct),
      debtDeltaPct: clampPct(debtDeltaPct),
    };
  }, [data, compareData]);

  const insights = useMemo(() => {
    const best = (data?.bestProductsByProfit || [])[0];
    const worst = (data?.worstProductsByProfit || [])[0];

    const trend = data?.salesTrend || [];
    const total = trend.reduce((s, x) => s + Number(x.revenue || 0), 0);
    const avg = trend.length ? total / trend.length : 0;

    const spike = trend.reduce(
      (acc, x) => {
        const v = Number(x.revenue || 0);
        return v > acc.v ? { v, d: x.date } : acc;
      },
      { v: 0, d: '' }
    );

    const spikeRatio = avg ? spike.v / avg : 0;

    const debtTrend = data?.debtDailyTrend || [];
    const last = debtTrend.length ? Number(debtTrend[debtTrend.length - 1]?.debt || 0) : 0;
    const first = debtTrend.length ? Number(debtTrend[0]?.debt || 0) : 0;
    const debtChange = first ? ((last - first) / first) * 100 : 0;

    return {
      best,
      worst,
      spike,
      spikeRatio,
      debtChange: clampPct(debtChange),
    };
  }, [data]);

  const hasAnyData = useMemo(() => {
    if (!data) return false;
    return (
      hasPositiveValue(data.salesTrend, 'revenue') ||
      hasPositiveValue(data.bestProducts, 'revenue') ||
      hasPositiveValue(data.bestProductsByProfit, 'profit') ||
      hasPositiveValue(data.debtDailyTrend, 'debt') ||
      hasPositiveValue(data.monthComparison, 'revenue')
    );
  }, [data]);

  const chartState = useMemo(() => ({
    hasSalesTrend: hasPositiveValue(data?.salesTrend, 'revenue'),
    hasDebtTrend: hasPositiveValue(data?.debtDailyTrend, 'debt'),
    hasDebtLine: hasMoreThanOnePositivePoint(data?.debtDailyTrend, 'debt'),
    hasDebtByMonth: hasPositiveValue(data?.debtByDueMonth, 'debt'),
    hasMonthComparison: hasPositiveValue(data?.monthComparison, 'revenue'),
    hasProductRevenue: hasPositiveValue(data?.bestProducts, 'revenue') || hasPositiveValue(data?.worstProducts, 'revenue'),
    hasProductProfit: hasPositiveValue(data?.bestProductsByProfit, 'profit') || hasPositiveValue(data?.worstProductsByProfit, 'profit'),
  }), [data]);

  const debtSnapshotSummary = useMemo(() => {
    const points = data?.debtDailyTrend || [];
    const last = [...points].reverse().find((point) => Number(point?.debt || 0) > 0);
    return {
      date: last?.date || '',
      debt: Number(last?.debt || 0),
      count: points.filter((point) => Number(point?.debt || 0) > 0).length,
    };
  }, [data]);

  const Skeleton = ({ className }: { className?: string }) => (
    <div className={`animate-pulse rounded-xl bg-gray-100 dark:bg-slate-800/60 ${className || ''}`} />
  );

  const TabButton = ({
    id,
    icon,
    title,
  }: {
    id: 'overview' | 'products' | 'receivables';
    icon: string;
    title: string;
  }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={
        activeTab === id
          ? 'analytics-executive-tab is-active'
          : 'analytics-executive-tab'
      }
    >
      <i className={`${icon} ml-2`} />
      {title}
    </button>
  );

  return (
    <div className="analytics-executive-page space-y-4" dir="rtl">
      <section className="analytics-executive-hero">
        <div className="analytics-executive-hero__head">
          <span className="analytics-executive-hero__icon" aria-hidden="true">
            <i className="fa-solid fa-chart-simple" />
          </span>
          <div className="min-w-0">
            <div className="analytics-executive-hero__kicker">EXECUTIVE ANALYTICS</div>
            <h2 className="analytics-executive-hero__title">داشبورد تحلیل‌ها</h2>
            <p className="analytics-executive-hero__text">نمای مدیریتی فروش، کالا و مطالبات؛ خلاصه‌ای برای تصمیم‌گیری سریع و رفتن به گزارش‌های تخصصی.</p>
          </div>
        </div>

        <div className="analytics-executive-control-dock" aria-label="فیلترهای داشبورد تحلیل‌ها">
          <ReportDatePresetChips
            fromDate={fromDate}
            toDate={toDate}
            onChange={({ from, to }) => { setFromDate(from); setToDate(to); }}
            className="analytics-executive-date-presets"
          />

          <ReportFilterField label="از تاریخ" icon={<i className="fa-regular fa-calendar" />} minWidthClassName="analytics-executive-filter-field analytics-executive-filter-field--date">
            <ShamsiDatePicker selectedDate={fromDate} onDateChange={setFromDate} />
          </ReportFilterField>

          <ReportFilterField label="تا تاریخ" icon={<i className="fa-regular fa-calendar-check" />} minWidthClassName="analytics-executive-filter-field analytics-executive-filter-field--date">
            <ShamsiDatePicker selectedDate={toDate} onDateChange={setToDate} />
          </ReportFilterField>

          <label className="analytics-executive-compare-toggle">
            <input
              type="checkbox"
              checked={compareEnabled}
              onChange={(e) => setCompareEnabled(e.target.checked)}
            />
            <span>مقایسه با بازه قبل</span>
            {isCompareLoading ? <small>…</small> : null}
          </label>

          <button
            type="button"
            onClick={fetchMainAnalytics}
            className="analytics-executive-refresh-button"
            disabled={isLoading}
          >
            <i className={`fa-solid fa-rotate ${isLoading ? 'fa-spin' : ''}`} />
            بروزرسانی
          </button>
        </div>

        <div className="analytics-executive-tabs" role="tablist" aria-label="بخش‌های داشبورد تحلیل‌ها">
          <TabButton id="overview" icon="fa-solid fa-gauge-high" title="نمای کلی" />
          <TabButton id="products" icon="fa-solid fa-cubes" title="کالاها" />
          <TabButton id="receivables" icon="fa-solid fa-file-invoice-dollar" title="مطالبات" />
        </div>
      </section>

      {notification ? <Notification message={notification.message} type={notification.type} /> : null}

      <section className="analytics-executive-kpi-grid">
        <div className="analytics-executive-kpi analytics-executive-kpi--revenue">
          <div className="absolute -top-10 -left-10 h-24 w-24 rounded-full bg-sky-100 blur-2xl opacity-80 dark:bg-sky-900/30" />
          <div className="relative">
            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
              <span>جمع درآمد بازه</span>
              {compareEnabled && compareData ? (
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">{fmtPercent(kpis.revenueDeltaPct)}</span>
              ) : null}
            </div>
            <div className="mt-2 text-2xl font-bold">{isLoading ? <Skeleton className="h-8 w-40" /> : fmtMoney(kpis.totalRevenue)}</div>
            <div className="mt-3 h-10">
              {isLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                chartState.hasSalesTrend ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={(data?.salesTrend || []).slice(-12)}>
                      <Line type="monotone" dataKey="revenue" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="analytics-executive-mini-empty">فروش ثبت نشده</div>
                )
              )}
            </div>
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">فروش (روزانه) + پیش‌پرداخت اقساط</div>
          </div>
        </div>

        <div className="analytics-executive-kpi analytics-executive-kpi--avg">
          <div className="absolute -top-10 -left-10 h-24 w-24 rounded-full bg-emerald-100 blur-2xl opacity-80 dark:bg-emerald-900/30" />
          <div className="relative">
            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
              <span>میانگین فروش روزانه</span>
              {compareEnabled && compareData ? (
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">{fmtPercent(kpis.avgDeltaPct)}</span>
              ) : null}
            </div>
            <div className="mt-2 text-2xl font-bold">{isLoading ? <Skeleton className="h-8 w-32" /> : fmtMoney(kpis.avgDaily)}</div>
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">بر اساس تعداد روزهای بازه انتخابی</div>
          </div>
        </div>

        <div className="analytics-executive-kpi analytics-executive-kpi--debt">
          <div className="absolute -top-10 -left-10 h-24 w-24 rounded-full bg-rose-100 blur-2xl opacity-80 dark:bg-rose-900/30" />
          <div className="relative">
            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
              <span>بدهی جاری اقساط</span>
              {compareEnabled && compareData ? (
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">{fmtPercent(kpis.debtDeltaPct)}</span>
              ) : null}
            </div>
            <div className="mt-2 text-2xl font-bold">{isLoading ? <Skeleton className="h-8 w-40" /> : fmtMoney(kpis.lastDebt)}</div>
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">آخرین مقدار بدهی در روند روزانه</div>
          </div>
        </div>
      </section>

      {!isLoading && data && !hasAnyData ? (
        <div className="analytics-executive-card p-6">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <i className="fa-solid fa-circle-info text-amber-700 dark:text-amber-200" />
            </div>
            <div>
              <div className="font-bold text-slate-900 dark:text-slate-100">در این بازه داده‌ای برای تحلیل پیدا نشد</div>
              <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                چند علت رایج: (۱) در این بازه فاکتور/سفارش ثبت اطلاعات نشده، (۲) تاریخ‌ها خارج از بازه‌ی داده‌های موجود است، (۳) گزارش‌های اقساط/بدهی هنوز داده ندارند.
              </div>
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <button onClick={() => applyPreset('thisMonth')} className="px-3 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-sm font-semibold">نمایش این ماه</button>
                <button onClick={() => applyPreset('thisMonth')} className="px-3 py-2 rounded-xl border bg-white/60 dark:bg-slate-900/40 dark:border-slate-800 text-sm font-semibold">ماه جاری</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="analytics-executive-insights">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            <i className="fa-solid fa-wand-magic-sparkles ml-2 text-indigo-600" />
            بینش‌های خودکار
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {data?.range?.from && data?.range?.to ? (
              <span>
                بازه: {moment(data.range.from).locale('fa').format('jYYYY/jMM/jDD')} تا {moment(data.range.to).locale('fa').format('jYYYY/jMM/jDD')}
              </span>
            ) : null}
          </div>
        </div>

        <div className="analytics-executive-insight-grid">
          <div className="analytics-executive-insight-card">
            <div className="text-xs text-gray-500 dark:text-gray-400">بهترین محصول از نظر سود</div>
            <div className="mt-1 font-bold text-slate-900 dark:text-slate-100">{insights.best ? insights.best.name : 'فروش سودآور ثبت نشده'}</div>
            <div className="mt-2 text-sm">
              <span className="text-gray-500 dark:text-gray-400">سود:</span>{' '}
              <span className="font-bold">{insights.best ? fmtMoney(insights.best.profit) : '0'}</span>
            </div>
          </div>

          <div className="analytics-executive-insight-card">
            <div className="text-xs text-gray-500 dark:text-gray-400">ریسک حاشیه سود</div>
            <div className="mt-1 font-bold text-slate-900 dark:text-slate-100">{insights.worst ? insights.worst.name : 'ریسک سود قابل محاسبه نیست'}</div>
            <div className="mt-2 text-sm">
              <span className="text-gray-500 dark:text-gray-400">سود:</span>{' '}
              <span className="font-bold">{insights.worst ? fmtMoney(insights.worst.profit) : '0'}</span>
            </div>
          </div>

          <div className="analytics-executive-insight-card">
            <div className="text-xs text-gray-500 dark:text-gray-400">بیشترین جهش فروش روزانه</div>
            <div className="mt-1 font-bold text-slate-900 dark:text-slate-100">{chartState.hasSalesTrend && insights.spike?.d ? prettyDay(insights.spike.d) : 'جهش فروش دیده نشد'}</div>
            <div className="mt-2 text-sm">
              <span className="text-gray-500 dark:text-gray-400">مبلغ:</span>{' '}
              <span className="font-bold">{fmtMoney(insights.spike?.v || 0)}</span>
              {insights.spikeRatio > 1.4 ? (
                <span className="mr-2 text-xs font-bold text-amber-700 dark:text-amber-200">(غیرعادی)</span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {activeTab === 'overview' ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="analytics-executive-card">
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              <i className="fa-solid fa-chart-line ml-2 text-sky-600" />
              روند فروش (روزانه)
            </div>

            <div className="mt-3 h-72">
              {isLoading ? (
                <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">در حال دریافت...</div>
              ) : chartState.hasSalesTrend ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data?.salesTrend || []} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={prettyDay} minTickGap={18} />
                    <YAxis tickFormatter={(v) => fmtChartMoney(v)} width={50} />
                    <Tooltip formatter={(v: any) => tooltipMoney(v, 'درآمد')} labelFormatter={(l: any) => prettyDay(String(l))} cursor={{ stroke: 'rgba(37,99,235,.22)', strokeWidth: 1 }} />
                    <Line type="monotone" dataKey="revenue" name="درآمد" strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <EmptyAnalyticsState icon="fa-solid fa-chart-line" title="در این بازه فروش ثبت نشده" text="بازه تاریخ را تغییر بده یا پس از ثبت فروش، این نمودار فعال می‌شود." />
              )}
            </div>
          </div>

          <div className="analytics-executive-card">
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              <i className="fa-solid fa-scale-balanced ml-2 text-rose-600" />
              روند بدهی (روزانه)
            </div>

            <div className="mt-3 h-72">
              {isLoading ? (
                <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">در حال دریافت...</div>
              ) : chartState.hasDebtLine ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data?.debtDailyTrend || []} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={prettyDay} minTickGap={18} />
                    <YAxis tickFormatter={(v) => fmtChartMoney(v)} width={50} />
                    <Tooltip formatter={(v: any) => tooltipMoney(v, 'بدهی')} labelFormatter={(l: any) => prettyDay(String(l))} cursor={{ stroke: 'rgba(225,29,72,.22)', strokeWidth: 1 }} />
                    <Line type="monotone" dataKey="debt" name="بدهی" strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : chartState.hasDebtTrend ? (
                <div className="analytics-executive-debt-snapshot-card">
                  <span className="analytics-executive-debt-snapshot-card__icon"><i className="fa-solid fa-scale-balanced" /></span>
                  <div className="analytics-executive-debt-snapshot-card__content">
                    <div className="analytics-executive-debt-snapshot-card__label">آخرین snapshot بدهی</div>
                    <div className="analytics-executive-debt-snapshot-card__value">{fmtMoney(debtSnapshotSummary.debt || kpis.lastDebt)} تومان</div>
                    <p>تاریخچه بدهی هنوز کامل نیست؛ سیستم از این به بعد روند روزانه را خودکار می‌سازد.</p>
                  </div>
                  <div className="analytics-executive-debt-snapshot-card__meta">
                    <span>تاریخ</span>
                    <strong>{debtSnapshotSummary.date ? prettyDay(debtSnapshotSummary.date) : 'امروز'}</strong>
                  </div>
                </div>
              ) : (
                <EmptyAnalyticsState icon="fa-solid fa-scale-balanced" title="روند بدهی هنوز داده کافی ندارد" text="پس از ثبت snapshotهای بیشتر، نمودار روند بدهی نمایش داده می‌شود." />
              )}

              <div className="mt-4 rounded-xl border bg-white/60 p-3 text-xs text-gray-700 dark:bg-slate-900/40 dark:border-slate-800 dark:text-gray-200">
                <div className="font-semibold mb-2">بدهی (بر اساس سررسید اقساط) — نمای ثانویه</div>
                <div className="h-44">
                  {chartState.hasDebtByMonth ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data?.debtByDueMonth || []} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" tickFormatter={prettyMonth} />
                        <YAxis tickFormatter={(v) => fmtChartMoney(v)} width={50} />
                        <Tooltip formatter={(v: any) => tooltipMoney(v, 'بدهی')} labelFormatter={(l: any) => prettyMonth(String(l))} cursor={{ fill: 'rgba(225,29,72,.045)' }} />
                        <Bar dataKey="debt" name="بدهی" radius={[10, 10, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyAnalyticsState icon="fa-solid fa-calendar-days" title="سررسید بدهی ماهانه وجود ندارد" text="وقتی اقساط پرداخت‌نشده با dueDate ثبت شود، این بخش فعال می‌شود." />
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="analytics-executive-card xl:col-span-2">
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              <i className="fa-solid fa-chart-column ml-2 text-indigo-600" />
              مقایسه ماه‌ها (۶ ماه اخیر)
            </div>

            <div className="mt-3 h-72">
              {isLoading ? (
                <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">در حال دریافت...</div>
              ) : chartState.hasMonthComparison ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data?.monthComparison || []} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tickFormatter={prettyMonth} />
                    <YAxis tickFormatter={(v) => fmtChartMoney(v)} width={50} />
                    <Tooltip formatter={(v: any) => tooltipMoney(v, 'درآمد')} labelFormatter={(l: any) => prettyMonth(String(l))} cursor={{ fill: 'rgba(37,99,235,.045)' }} />
                    <Bar dataKey="revenue" name="درآمد" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyAnalyticsState icon="fa-solid fa-chart-column" title="برای مقایسه ماهانه فروش کافی وجود ندارد" text="وقتی فروش در ماه‌های مختلف ثبت شود، نمودار مقایسه ماه‌ها نمایش داده می‌شود." />
              )}
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === 'products' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="analytics-executive-card">
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                <i className="fa-solid fa-trophy ml-2 text-emerald-600" />
                بهترین محصولات
              </div>

              <div className="mt-3 overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-slate-800/70">
                    <tr className="text-right">
                      <th className="p-2">محصول</th>
                      <th className="p-2">تعداد</th>
                      <th className="p-2">درآمد</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.bestProducts || []).map((p) => (
                      <tr key={p.id} className="border-t border-gray-100 dark:border-slate-800">
                        <td className="p-2">{p.name}</td>
                        <td className="p-2 whitespace-nowrap">{Number(p.qty).toLocaleString('fa-IR')}</td>
                        <td className="p-2 whitespace-nowrap font-semibold">{fmtMoney(p.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(!data?.bestProducts || data.bestProducts.length === 0) ? (
                  <div className="p-6 text-center text-gray-500 dark:text-gray-400">داده‌ای وجود ندارد.</div>
                ) : null}
              </div>
            </div>

            <div className="analytics-executive-card">
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                <i className="fa-solid fa-bug ml-2 text-rose-600" />
                بدترین محصولات (کمترین درآمد)
              </div>

              <div className="mt-3 overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-slate-800/70">
                    <tr className="text-right">
                      <th className="p-2">محصول</th>
                      <th className="p-2">تعداد</th>
                      <th className="p-2">درآمد</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.worstProducts || []).map((p) => (
                      <tr key={p.id} className="border-t border-gray-100 dark:border-slate-800">
                        <td className="p-2">{p.name}</td>
                        <td className="p-2 whitespace-nowrap">{Number(p.qty).toLocaleString('fa-IR')}</td>
                        <td className="p-2 whitespace-nowrap font-semibold">{fmtMoney(p.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(!data?.worstProducts || data.worstProducts.length === 0) ? (
                  <div className="p-6 text-center text-gray-500 dark:text-gray-400">داده‌ای وجود ندارد.</div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="analytics-executive-card">
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                <i className="fa-solid fa-sack-dollar ml-2 text-emerald-600" />
                بهترین محصولات بر اساس سود (واقعی)
              </div>

              <div className="mt-3 overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-slate-800/70">
                    <tr className="text-right">
                      <th className="p-2">محصول</th>
                      <th className="p-2">تعداد</th>
                      <th className="p-2">درآمد</th>
                      <th className="p-2">سود</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.bestProductsByProfit || []).map((p) => (
                      <tr key={p.id} className="border-t border-gray-100 dark:border-slate-800">
                        <td className="p-2">{p.name}</td>
                        <td className="p-2 whitespace-nowrap">{Number(p.qty).toLocaleString('fa-IR')}</td>
                        <td className="p-2 whitespace-nowrap">{fmtMoney(p.revenue)}</td>
                        <td className="p-2 whitespace-nowrap font-semibold">{fmtMoney(p.profit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(!data?.bestProductsByProfit || data.bestProductsByProfit.length === 0) ? (
                  <div className="p-6 text-center text-gray-500 dark:text-gray-400">داده‌ای وجود ندارد.</div>
                ) : null}
              </div>

              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                سود واقعی (FIFO) = درآمد − (میانگین قیمت خرید × تعداد فروش). اگر خرید ثبت اطلاعات نشده باشد از purchasePrice محصول استفاده می‌شود.
              </div>
            </div>

            <div className="analytics-executive-card">
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                <i className="fa-solid fa-triangle-exclamation ml-2 text-rose-600" />
                بدترین محصولات بر اساس سود (واقعی)
              </div>

              <div className="mt-3 overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-slate-800/70">
                    <tr className="text-right">
                      <th className="p-2">محصول</th>
                      <th className="p-2">تعداد</th>
                      <th className="p-2">درآمد</th>
                      <th className="p-2">سود</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.worstProductsByProfit || []).map((p) => (
                      <tr key={p.id} className="border-t border-gray-100 dark:border-slate-800">
                        <td className="p-2">{p.name}</td>
                        <td className="p-2 whitespace-nowrap">{Number(p.qty).toLocaleString('fa-IR')}</td>
                        <td className="p-2 whitespace-nowrap">{fmtMoney(p.revenue)}</td>
                        <td className="p-2 whitespace-nowrap font-semibold">{fmtMoney(p.profit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(!data?.worstProductsByProfit || data.worstProductsByProfit.length === 0) ? (
                  <div className="p-6 text-center text-gray-500 dark:text-gray-400">داده‌ای وجود ندارد.</div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === 'receivables' ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="analytics-executive-card">
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              <i className="fa-solid fa-calendar-days ml-2 text-indigo-600" />
              بدهی بر اساس سررسید (ماه)
            </div>
            <div className="mt-3 h-80">
              {isLoading ? (
                <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">در حال دریافت...</div>
              ) : chartState.hasDebtByMonth ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data?.debtByDueMonth || []} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tickFormatter={prettyMonth} />
                    <YAxis tickFormatter={(v) => fmtChartMoney(v)} width={50} />
                    <Tooltip formatter={(v: any) => tooltipMoney(v, 'بدهی')} labelFormatter={(l: any) => prettyMonth(String(l))} cursor={{ fill: 'rgba(225,29,72,.045)' }} />
                    <Bar dataKey="debt" name="بدهی" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyAnalyticsState icon="fa-solid fa-calendar-days" title="بدهی سررسیددار برای نمایش وجود ندارد" text="پس از ثبت اقساط پرداخت‌نشده با تاریخ سررسید، این نمودار فعال می‌شود." />
              )}
            </div>
          </div>

          <div className="analytics-executive-card">
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              <i className="fa-solid fa-chart-line ml-2 text-rose-600" />
              روند بدهی روزانه
            </div>
            <div className="mt-3 h-80">
              {isLoading ? (
                <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">در حال دریافت...</div>
              ) : chartState.hasDebtLine ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data?.debtDailyTrend || []} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={prettyDay} minTickGap={18} />
                    <YAxis tickFormatter={(v) => fmtChartMoney(v)} width={50} />
                    <Tooltip formatter={(v: any) => tooltipMoney(v, 'بدهی')} labelFormatter={(l: any) => prettyDay(String(l))} cursor={{ stroke: 'rgba(225,29,72,.22)', strokeWidth: 1 }} />
                    <Line type="monotone" dataKey="debt" name="بدهی" strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : chartState.hasDebtTrend ? (
                <div className="analytics-executive-debt-snapshot-card">
                  <span className="analytics-executive-debt-snapshot-card__icon"><i className="fa-solid fa-scale-balanced" /></span>
                  <div className="analytics-executive-debt-snapshot-card__content">
                    <div className="analytics-executive-debt-snapshot-card__label">آخرین snapshot بدهی</div>
                    <div className="analytics-executive-debt-snapshot-card__value">{fmtMoney(debtSnapshotSummary.debt || kpis.lastDebt)} تومان</div>
                    <p>تاریخچه کافی برای خط روند وجود ندارد؛ سیستم روند بدهی را از داده‌های اقساطی می‌سازد.</p>
                  </div>
                  <div className="analytics-executive-debt-snapshot-card__meta">
                    <span>تاریخ</span>
                    <strong>{debtSnapshotSummary.date ? prettyDay(debtSnapshotSummary.date) : 'امروز'}</strong>
                  </div>
                </div>
              ) : (
                <EmptyAnalyticsState icon="fa-solid fa-scale-balanced" title="داده کافی برای روند بدهی وجود ندارد" text="پس از ثبت snapshotهای بدهی، این نمودار فعال می‌شود." />
              )}
            </div>

            <div className="mt-3 rounded-xl border bg-white/60 p-3 text-xs text-gray-700 dark:bg-slate-900/40 dark:border-slate-800 dark:text-gray-200">
              <div className="font-semibold">تغییر بدهی در بازه</div>
              <div className="mt-1">{fmtPercent(insights.debtChange)}</div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
