import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import moment from 'jalali-moment';
import { Button, PageKit } from '@/components/ui';
import { apiFetch } from '../../utils/apiFetch';
import { reportNavigationAnchor, useReportDrilldownNavigation } from '../../hooks/useReportDrilldownNavigation';
import ShamsiDatePicker from '../../components/ShamsiDatePicker';
import ReportDatePresetChips from '../../components/reports/ReportDatePresetChips';
import {
  formatReportCountText,
  formatReportDaysText,
  formatReportMoneyText,
  formatReportPercentText,
  formatReportRatioText,
} from '../../utils/reportPresentation';

type InventoryTurnoverDiagnostics = {
  fromDate?: string;
  toDate?: string;
  fromJalali?: string;
  toJalali?: string;
  endValue?: number;
  purchaseValue?: number;
  orderCogs?: number;
  installmentCogs?: number;
  legacyCogs?: number;
  ledgerCogs?: number;
  productsWithStock?: number;
  productsWithCost?: number;
  productsWithSellingFallback?: number;
  cogsSource?: string;
};

type Data = {
  periodDays: number;
  cogs: number;
  avgInventoryValue: number;
  inventoryTurnover: number;
  daysOfInventory: number;
  diagnostics?: InventoryTurnoverDiagnostics;
};

type TurnoverTone = 'neutral' | 'warning' | 'info' | 'success';

const toISODate = (date: Date) => moment(date).locale('en').format('YYYY-MM-DD');
const toJalali = (date: Date) => moment(date).locale('fa').format('jYYYY/jMM/jDD');

const getTurnoverState = (turnover: number): { label: string; tone: TurnoverTone; description: string } => {
  if (turnover <= 0) {
    return {
      label: 'بدون گردش ثبت‌شده',
      tone: 'neutral',
      description: 'در بازه انتخابی بهای تمام‌شده‌ای برای خروج کالای انباری ثبت نشده است.',
    };
  }
  if (turnover < 0.5) {
    return {
      label: 'گردش بسیار کند',
      tone: 'warning',
      description: 'موجودی نسبت به بهای کالای فروخته‌شده بالاست؛ کالاهای کم‌تحرک و خریدهای مازاد باید بررسی شوند.',
    };
  }
  if (turnover < 1) {
    return {
      label: 'گردش کند',
      tone: 'warning',
      description: 'در بازه کمتر از یک چرخه کامل موجودی ثبت شده است؛ ترکیب خرید و فروش نیاز به کنترل دارد.',
    };
  }
  if (turnover < 2) {
    return {
      label: 'گردش متعادل',
      tone: 'info',
      description: 'موجودی بیش از یک‌بار به بهای فروش تبدیل شده است؛ نقطه سفارش و کالاهای کندفروش را هم‌زمان کنترل کنید.',
    };
  }
  return {
    label: 'گردش سریع',
    tone: 'success',
    description: 'سرعت خروج موجودی بالاست؛ احتمال کسری کالا و نیاز به سفارش مجدد را بررسی کنید.',
  };
};

const toneClasses: Record<TurnoverTone, string> = {
  neutral: 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300',
  warning: 'border-amber-200 text-amber-700 dark:border-amber-900/60 dark:text-amber-200',
  info: 'border-blue-200 text-blue-700 dark:border-blue-900/60 dark:text-blue-200',
  success: 'border-emerald-200 text-emerald-700 dark:border-emerald-900/60 dark:text-emerald-200',
};

const CompactMetric = ({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: string;
}) => (
  <article className="min-w-0 rounded-[18px] border border-slate-200 bg-white px-3.5 py-3 dark:border-slate-800 dark:bg-slate-950">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="text-[11px] font-black text-slate-500 dark:text-slate-400">{label}</div>
        <bdi dir="ltr" className="mt-1.5 block truncate text-right text-[17px] font-black leading-7 text-slate-950 dark:text-white" title={value}>
          {value}
        </bdi>
        <p className="mt-1 text-[10.5px] font-bold leading-5 text-slate-500 dark:text-slate-400">{hint}</p>
      </div>
      <i className={`fa-solid ${icon} mt-0.5 shrink-0 text-sm text-slate-500 dark:text-slate-400`} aria-hidden="true" />
    </div>
  </article>
);

const DetailRow = ({ label, value, tone }: { label: string; value: string; tone?: 'warning' }) => (
  <div className="flex min-h-10 items-center justify-between gap-4 border-b border-slate-100 py-2.5 last:border-b-0 dark:border-slate-800">
    <dt className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{label}</dt>
    <dd className={`text-left text-[11px] font-black ${tone === 'warning' ? 'text-amber-600 dark:text-amber-300' : 'text-slate-900 dark:text-white'}`}>{value}</dd>
  </div>
);

export default function InventoryTurnoverReport() {
  const navigate = useNavigate();
  const [fromDate, setFromDate] = useState<Date>(() => moment().subtract(30, 'days').toDate());
  const [toDate, setToDate] = useState<Date>(() => new Date());
  const [data, setData] = useState<Data | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const subtitle = useMemo(() => `بازه ${toJalali(fromDate)} تا ${toJalali(toDate)}`, [fromDate, toDate]);
  const turnoverState = getTurnoverState(data?.inventoryTurnover ?? 0);

  const load = async () => {
    setIsLoading(true);
    setErr(null);
    try {
      const fromISO = toISODate(fromDate);
      const toISO = toISODate(toDate);
      const res = await apiFetch(`/api/reports/inventory-turnover?fromISO=${encodeURIComponent(fromISO)}&toISO=${encodeURIComponent(toISO)}`);
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.message || 'خطا در دریافت گزارش');
      setData(json.data as Data);
    } catch (error: any) {
      setErr(error?.message || 'خطا در دریافت گزارش');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, toDate]);

  const reportUiState = useMemo(() => ({
    fromDate: fromDate.toISOString(),
    toDate: toDate.toISOString(),
  }), [fromDate, toDate]);

  const restoreReportUiState = useCallback((state: Record<string, unknown>) => {
    if (state.fromDate) setFromDate(new Date(String(state.fromDate)));
    if (state.toDate) setToDate(new Date(String(state.toDate)));
  }, []);

  const { openDrilldown } = useReportDrilldownNavigation({
    reportKey: 'inventory-turnover',
    uiState: reportUiState,
    restoreUiState: restoreReportUiState,
  });

  const diagnostics = data?.diagnostics;
  const productsWithStock = Math.max(0, Number(diagnostics?.productsWithStock || 0));
  const productsWithCost = Math.max(0, Number(diagnostics?.productsWithCost || 0));
  const fallbackCount = Math.max(0, Number(diagnostics?.productsWithSellingFallback || 0));
  const costCoverageRate = productsWithStock > 0 ? (productsWithCost / productsWithStock) * 100 : 0;
  const cogsSourceLabel = diagnostics?.cogsSource === 'sales_documents'
    ? 'اسناد فروش ثبت‌شده'
    : diagnostics?.cogsSource === 'inventory_ledger'
      ? 'دفتر گردش انبار'
      : 'بدون حرکت فروش';

  return (
    <PageKit
      title="گردش موجودی"
      subtitle={subtitle}
      icon={<i className="fa-solid fa-rotate" />}
      className="report-merged-page inventory-turnover-compact-page"
      backAction={() => navigate('/reports')}
      isLoading={isLoading}
      isEmpty={!isLoading && !data}
      emptyTitle={err ? 'خطا در دریافت گزارش' : 'داده‌ای برای نمایش نیست'}
      emptyDescription={err || 'بازه زمانی را تغییر بده و دوباره تلاش کن.'}
      emptyActionLabel="بازخوانی"
      onEmptyAction={load}
      toolbarRight={
        <div className="grid w-full gap-2 rounded-[18px] border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-950 lg:grid-cols-[minmax(260px,1fr)_minmax(140px,172px)_minmax(140px,172px)_auto] lg:items-end">
          <ReportDatePresetChips
            fromDate={fromDate}
            toDate={toDate}
            onChange={({ from, to }) => { setFromDate(from); setToDate(to); }}
            compact
          />
          <label className="grid min-w-0 gap-1">
            <span className="px-1 text-[10px] font-black text-slate-500 dark:text-slate-400">از تاریخ</span>
            <ShamsiDatePicker selectedDate={fromDate} onDateChange={(date) => date && setFromDate(date)} size="compact" />
          </label>
          <label className="grid min-w-0 gap-1">
            <span className="px-1 text-[10px] font-black text-slate-500 dark:text-slate-400">تا تاریخ</span>
            <ShamsiDatePicker selectedDate={toDate} onDateChange={(date) => date && setToDate(date)} size="compact" />
          </label>
          <Button
            variant="primary"
            size="sm"
            autoIcon={false}
            leftIcon={<i className={`fa-solid ${isLoading ? 'fa-spinner fa-spin' : 'fa-rotate'}`} />}
            onClick={() => void load()}
            disabled={isLoading}
            className="w-full lg:w-auto"
          >
            بازخوانی
          </Button>
        </div>
      }
    >
      {data ? (
        <div className="space-y-3" dir="rtl">
          <section className="rounded-[20px] border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-sm font-black text-slate-950 dark:text-white">خلاصه گردش موجودی</h2>
                <p className="mt-1 text-[11px] font-bold leading-5 text-slate-500 dark:text-slate-400">
                  فرمول از بهای کالای فروخته‌شده و میانگین ارزش موجودی واقعی همین بازه استفاده می‌کند.
                </p>
              </div>
              <span className={`inline-flex min-h-8 w-fit items-center gap-2 rounded-full border px-3 text-[11px] font-black ${toneClasses[turnoverState.tone]}`}>
                <i className="fa-solid fa-gauge-high" />
                {turnoverState.label}
              </span>
            </div>

            <div className="mt-3 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
              <CompactMetric label="نرخ گردش موجودی" value={formatReportRatioText(data.inventoryTurnover, 2)} hint={`بازه ${formatReportCountText(data.periodDays)} روزه`} icon="fa-chart-line" />
              <CompactMetric label="روزهای نگهداری" value={formatReportDaysText(data.daysOfInventory, 1)} hint="مدت برآوردی تبدیل موجودی به فروش" icon="fa-calendar-days" />
              <CompactMetric label="بهای کالای فروخته‌شده" value={formatReportMoneyText(data.cogs)} hint="COGS واقعی کالای انباری" icon="fa-receipt" />
              <CompactMetric label="میانگین ارزش موجودی" value={formatReportMoneyText(data.avgInventoryValue)} hint="میانگین ارزش ابتدا و انتهای بازه" icon="fa-boxes-stacked" />
            </div>
          </section>

          <section className="grid gap-3 xl:grid-cols-2">
            <article data-navigation-anchor={reportNavigationAnchor('inventory-turnover', 'management-actions')} className="rounded-[20px] border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black text-slate-500 dark:text-slate-400">برداشت مدیریتی</div>
                  <h3 className="mt-1 text-sm font-black text-slate-950 dark:text-white">{turnoverState.label}</h3>
                </div>
                <i className="fa-solid fa-lightbulb text-sm text-slate-500 dark:text-slate-400" />
              </div>
              <p className="mt-2.5 text-[11.5px] font-bold leading-6 text-slate-600 dark:text-slate-300">{turnoverState.description}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="neutral" size="sm" autoIcon={false} leftIcon={<i className="fa-solid fa-box-archive" />} onClick={() => openDrilldown('/reports/dead-stock', { contextLabel: 'گردش موجودی • کالای راکد', anchorId: reportNavigationAnchor('inventory-turnover', 'management-actions') })}>کالای راکد</Button>
                <Button variant="neutral" size="sm" autoIcon={false} leftIcon={<i className="fa-solid fa-layer-group" />} onClick={() => openDrilldown('/reports/abc', { contextLabel: 'گردش موجودی • تحلیل ABC', anchorId: reportNavigationAnchor('inventory-turnover', 'management-actions') })}>تحلیل ABC</Button>
                <Button variant="neutral" size="sm" autoIcon={false} leftIcon={<i className="fa-solid fa-cart-flatbed" />} onClick={() => openDrilldown('/reports/analysis/suggestions', { contextLabel: 'گردش موجودی • پیشنهاد خرید', anchorId: reportNavigationAnchor('inventory-turnover', 'management-actions') })}>پیشنهاد خرید</Button>
              </div>
            </article>

            <article className="rounded-[20px] border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black text-slate-500 dark:text-slate-400">کنترل کیفیت داده</div>
                  <h3 className="mt-1 text-sm font-black text-slate-950 dark:text-white">پوشش قیمت خرید</h3>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-[10.5px] font-black ${toneClasses[fallbackCount > 0 || costCoverageRate < 100 ? 'warning' : 'success']}`}>
                  {formatReportPercentText(costCoverageRate)}
                </span>
              </div>
              <dl className="mt-2">
                <DetailRow label="کالای دارای موجودی" value={formatReportCountText(productsWithStock)} />
                <DetailRow label="دارای قیمت خرید معتبر" value={formatReportCountText(productsWithCost)} />
                <DetailRow label="منبع COGS" value={cogsSourceLabel} />
                <DetailRow label="قیمت فروش جایگزین" value={formatReportCountText(fallbackCount)} tone={fallbackCount > 0 ? 'warning' : undefined} />
              </dl>
              {fallbackCount > 0 ? (
                <p className="mt-2 rounded-[14px] border border-amber-200 px-3 py-2 text-[10.5px] font-bold leading-5 text-amber-700 dark:border-amber-900/60 dark:text-amber-200">
                  برای {formatReportCountText(fallbackCount)} کالا قیمت خرید معتبر ثبت نشده است؛ ارزش‌گذاری این بخش برآوردی است.
                </p>
              ) : null}
            </article>
          </section>

          <section className="rounded-[20px] border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="text-[10px] font-black text-slate-500 dark:text-slate-400">فرمول گزارش</div>
                <div className="mt-1 text-[11.5px] font-black text-slate-900 dark:text-white">بهای کالای فروخته‌شده ÷ میانگین ارزش موجودی</div>
              </div>
              <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto] sm:items-center">
                <bdi dir="ltr" className="truncate text-left text-[12px] font-black text-slate-900 dark:text-white">{formatReportMoneyText(data.cogs)}</bdi>
                <span className="text-slate-400">÷</span>
                <bdi dir="ltr" className="truncate text-left text-[12px] font-black text-slate-900 dark:text-white">{formatReportMoneyText(data.avgInventoryValue)}</bdi>
                <strong className="rounded-full border border-slate-200 px-3 py-1 text-[11px] text-slate-900 dark:border-slate-700 dark:text-white">{formatReportRatioText(data.inventoryTurnover, 2)}</strong>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </PageKit>
  );
}
