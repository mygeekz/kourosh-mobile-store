import React, { useEffect, useMemo, useState } from 'react';
import moment from 'jalali-moment';
import { Link } from 'react-router-dom';
import ShamsiDatePicker from '../../../components/ShamsiDatePicker';
import Skeleton from '../../../components/ui/Skeleton';
import { apiFetch } from '../../../utils/apiFetch';
import type { DashboardWidgetProps } from '../types';

type RangeMode = 'weekly' | 'monthly' | 'custom';

type ProductSalesSummary = {
  total: number;
  receivedTotal: number;
  realizedProfit: number;
  breakdown: {
    cashSales: number;
    creditSales: number;
    installmentSales: number;
    cashReceived: number;
    creditReceived: number;
    installmentReceived: number;
  };
};

const toJ = (d: Date) => moment(d).locale('en').format('jYYYY/jMM/jDD');

function getMode(width: number, height: number): 'compact' | 'regular' | 'wide' {
  if ((width || 0) < 340 || (height || 0) < 215) return 'compact';
  if ((width || 0) < 520) return 'regular';
  return 'wide';
}

function StatMiniCard({
  title,
  value,
  icon,
  tone,
}: {
  title: string;
  value: string;
  icon: string;
  tone: 'amber' | 'emerald' | 'indigo';
}) {
  const tones = {
    amber: {
      wrap: 'border-amber-200/70 bg-amber-50/90 dark:border-amber-900/40 dark:bg-amber-950/30',
      iconWrap: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    },
    emerald: {
      wrap: 'border-emerald-200/70 bg-emerald-50/90 dark:border-emerald-900/40 dark:bg-emerald-950/30',
      iconWrap: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    },
    indigo: {
      wrap: 'border-indigo-200/70 bg-indigo-50/90 dark:border-indigo-900/40 dark:bg-indigo-950/30',
      iconWrap: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
    },
  } as const;
  const t = tones[tone];
  return (
    <div data-ui-dashboard-widget-kind="product-sales-metric" className={["rounded-2xl border p-3", t.wrap].join(' ')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 text-right">
          <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">{title}</div>
          <div className="mt-1 text-sm font-black text-slate-900 dark:text-white">{value}</div>
        </div>
        <div className={["flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl", t.iconWrap].join(' ')}>
          <i className={[icon, 'text-sm'].join(' ')} />
        </div>
      </div>
    </div>
  );
}

function BreakdownPill({
  title,
  amount,
  icon,
  tone,
}: {
  title: string;
  amount: string;
  icon: string;
  tone: 'amber' | 'sky' | 'violet';
}) {
  const tones = {
    amber: 'border-amber-200/70 bg-amber-50/80 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200',
    sky: 'border-sky-200/70 bg-sky-50/80 text-sky-800 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-200',
    violet: 'border-violet-200/70 bg-violet-50/80 text-violet-800 dark:border-violet-900/40 dark:bg-violet-950/30 dark:text-violet-200',
  } as const;
  return (
    <div data-ui-dashboard-widget-kind="product-sales-row" className={["flex items-center justify-between gap-2 rounded-2xl border px-3 py-2", tones[tone]].join(' ')}>
      <div className="flex items-center gap-2 min-w-0">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/70 text-[12px] dark:bg-slate-900/50">
          <i className={icon} />
        </span>
        <span className="truncate text-[11px] font-bold">{title}</span>
      </div>
      <span className="whitespace-nowrap text-[11px] font-black">{amount}</span>
    </div>
  );
}

export default function ProductSalesKPIWidget({ ctx, container }: DashboardWidgetProps) {
  const [mode, setMode] = useState<RangeMode>('monthly');
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<ProductSalesSummary>({
    total: 0,
    receivedTotal: 0,
    realizedProfit: 0,
    breakdown: {
      cashSales: 0,
      creditSales: 0,
      installmentSales: 0,
      cashReceived: 0,
      creditReceived: 0,
      installmentReceived: 0,
    },
  });

  const displayMode = useMemo(() => getMode(container.width, container.height), [container.width, container.height]);

  const computed = useMemo(() => {
    const now = moment().locale('fa');
    if (mode === 'weekly') {
      const f = now.clone().startOf('week');
      const t = now.clone().endOf('week');
      return { fromJ: f.format('jYYYY/jMM/jDD'), toJ: t.format('jYYYY/jMM/jDD') };
    }
    if (mode === 'monthly') {
      return { fromJ: now.clone().startOf('jMonth').format('jYYYY/jMM/jDD'), toJ: now.clone().endOf('jMonth').format('jYYYY/jMM/jDD') };
    }
    const fromJ = fromDate ? toJ(fromDate) : now.clone().startOf('jMonth').format('jYYYY/jMM/jDD');
    const toJv = toDate ? toJ(toDate) : now.clone().endOf('jMonth').format('jYYYY/jMM/jDD');
    return { fromJ, toJ: toJv };
  }, [mode, fromDate, toDate]);

  const subtitle = useMemo(() => {
    const map: Record<RangeMode, string> = { weekly: 'هفتگی', monthly: 'ماهانه', custom: 'بازه دلخواه' };
    return `${map[mode]} • ${computed.fromJ} تا ${computed.toJ}`;
  }, [mode, computed.fromJ, computed.toJ]);

  useEffect(() => {
    if (!ctx.token) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await apiFetch(`/api/reports/product-sales?from=${encodeURIComponent(computed.fromJ)}&to=${encodeURIComponent(computed.toJ)}`);
        const js = await res.json().catch(() => ({}));
        if (!cancelled && res.ok && js?.success !== false) {
          setSummary({
            total: Number(js?.data?.total ?? 0) || 0,
            receivedTotal: Number(js?.data?.receivedTotal ?? 0) || 0,
            realizedProfit: Number(js?.data?.realizedProfit ?? 0) || 0,
            breakdown: {
              cashSales: Number(js?.data?.breakdown?.cashSales ?? 0) || 0,
              creditSales: Number(js?.data?.breakdown?.creditSales ?? 0) || 0,
              installmentSales: Number(js?.data?.breakdown?.installmentSales ?? 0) || 0,
              cashReceived: Number(js?.data?.breakdown?.cashReceived ?? 0) || 0,
              creditReceived: Number(js?.data?.breakdown?.creditReceived ?? 0) || 0,
              installmentReceived: Number(js?.data?.breakdown?.installmentReceived ?? 0) || 0,
            },
          });
        }
      } catch {
        // ignore widget errors
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ctx.token, computed.fromJ, computed.toJ]);

  const controls = (
    <div className="mt-3 flex flex-col gap-2" dir="rtl" data-rgl-no-drag>
      <div className="flex flex-wrap gap-2">
        {(['weekly', 'monthly', 'custom'] as RangeMode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMode(m); }}
            className={[
              'rounded-xl border px-2.5 py-1 text-[11px] font-semibold transition',
              mode === m
                ? 'border-amber-300 bg-amber-100/80 text-amber-900 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-100'
                : 'border-slate-200 bg-white/70 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-800/70'
            ].join(' ')}
          >
            {m === 'weekly' ? 'هفتگی' : m === 'monthly' ? 'ماهانه' : 'دلخواه'}
          </button>
        ))}
      </div>

      {mode === 'custom' ? (
        <div className="flex items-center gap-2">
          <div className="flex-1"><ShamsiDatePicker selectedDate={fromDate} onChange={setFromDate} preview="از تاریخ" /></div>
          <div className="flex-1"><ShamsiDatePicker selectedDate={toDate} onChange={setToDate} preview="تا تاریخ" /></div>
        </div>
      ) : null}
    </div>
  );

  if (ctx.showLoadingSkeletons) {
    return (
      <div className="h-full overflow-hidden rounded-[28px] border border-amber-100/80 bg-amber-50/70 p-4 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20">
        <div className="h-full animate-pulse space-y-3">
          <div className="flex items-center justify-between gap-3">
            <Skeleton tone="warning" className="h-10 w-10" rounded="xl" />
            <div className="space-y-2 text-right">
              <Skeleton tone="warning" className="h-3 w-36 mr-auto" rounded="lg" />
              <Skeleton tone="warning" className="h-3 w-52 mr-auto" rounded="lg" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <Skeleton tone="warning" className="h-16" rounded="xl" />
            <Skeleton tone="warning" className="h-16" rounded="xl" />
            <Skeleton tone="warning" className="h-16" rounded="xl" />
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <Skeleton tone="warning" className="h-12" rounded="xl" />
            <Skeleton tone="warning" className="h-12" rounded="xl" />
            <Skeleton tone="warning" className="h-12" rounded="xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="group relative h-full overflow-hidden rounded-[28px] border border-slate-200/85 bg-white text-slate-900 shadow-[0_18px_45px_-32px_rgba(15,23,42,0.22)] ring-1 ring-amber-100 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_60px_-34px_rgba(15,23,42,0.26)] dark:border-slate-800/85 dark:bg-slate-950 dark:text-slate-100 dark:ring-amber-900/35"
    >
      <div className="pointer-events-none absolute left-0 right-0 top-0 h-px bg-gradient-to-l from-amber-500/70 to-orange-500/40" />
      <div className="pointer-events-none absolute -left-8 -top-8 h-24 w-24 rounded-full bg-amber-500/10 blur-2xl dark:bg-amber-400/10" />
      <div className="pointer-events-none absolute -bottom-10 -right-8 h-24 w-24 rounded-full bg-orange-500/10 blur-2xl dark:bg-orange-400/10" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.88)_0%,rgba(255,255,255,1)_42%)] dark:bg-[linear-gradient(180deg,rgba(2,6,23,0.82)_0%,rgba(2,6,23,1)_52%)]" />

      <div className="relative flex h-full flex-col p-4 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-100 bg-amber-50/90 text-amber-700 ring-1 ring-amber-100 dark:border-amber-900/50 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-900/35">
            <i className="fa-solid fa-boxes-stacked text-lg" />
          </div>

          <div className="min-w-0 flex-1 text-right">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <h3 className="text-sm font-black text-slate-900 dark:text-white md:text-base">فروش محصولات جانبی</h3>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
                لوازم و خدمات
              </span>
            </div>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{loading ? 'در حال محاسبه…' : subtitle}</div>
            <div className="mt-2 flex flex-wrap items-center justify-end gap-3 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <i className="fa-solid fa-receipt text-[10px]" />
                فروش قراردادی
              </span>
              <span className="inline-flex items-center gap-1.5">
                <i className="fa-solid fa-wallet text-[10px]" />
                وصول واقعی
              </span>
              <span className="inline-flex items-center gap-1.5">
                <i className="fa-solid fa-chart-line text-[10px]" />
                سود شناسایی‌شده
              </span>
            </div>
          </div>
        </div>

        <div className={[
          'mt-4 grid gap-2.5',
          displayMode === 'compact' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3'
        ].join(' ')}>
          <StatMiniCard title="فروش کل" value={ctx.formatPrice(summary.total)} icon="fa-solid fa-receipt" tone="amber" />
          <StatMiniCard title="وصول‌شده" value={ctx.formatPrice(summary.receivedTotal)} icon="fa-solid fa-wallet" tone="emerald" />
          <StatMiniCard title="سود واقعی" value={ctx.formatPrice(summary.realizedProfit)} icon="fa-solid fa-chart-line" tone="indigo" />
        </div>

        <div className="mt-3 rounded-[24px] border border-slate-200/80 bg-slate-50/75 p-3 dark:border-slate-800/80 dark:bg-slate-900/45">
          <div className="mb-2 flex items-center justify-between gap-2">
            <Link
              to="/reports/product-sales"
              data-rgl-no-drag
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-2 text-[11px] font-semibold text-amber-700 transition hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200"
            >
              <i className="fa-solid fa-up-right-from-square text-[10px]" />
              مشاهده گزارش کامل
            </Link>
            <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300">تفکیک نوع فروش</div>
          </div>

          <div className={[
            'grid gap-2',
            displayMode === 'compact' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3'
          ].join(' ')}>
            <BreakdownPill title="نقدی" amount={ctx.formatPrice(summary.breakdown.cashSales)} icon="fa-solid fa-money-bill-wave" tone="amber" />
            <BreakdownPill title="اعتباری" amount={ctx.formatPrice(summary.breakdown.creditSales)} icon="fa-solid fa-file-invoice" tone="sky" />
            <BreakdownPill title="اقساطی" amount={ctx.formatPrice(summary.breakdown.installmentSales)} icon="fa-solid fa-calendar-check" tone="violet" />
          </div>

          {displayMode !== 'compact' ? (
            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-2 text-right dark:border-slate-800/80 dark:bg-slate-950/50">
                <div className="text-[10px] text-slate-500 dark:text-slate-400">وصول نقدی</div>
                <div className="mt-1 text-[12px] font-black text-slate-900 dark:text-white">{ctx.formatPrice(summary.breakdown.cashReceived)}</div>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-2 text-right dark:border-slate-800/80 dark:bg-slate-950/50">
                <div className="text-[10px] text-slate-500 dark:text-slate-400">وصول اعتباری</div>
                <div className="mt-1 text-[12px] font-black text-slate-900 dark:text-white">{ctx.formatPrice(summary.breakdown.creditReceived)}</div>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-2 text-right dark:border-slate-800/80 dark:bg-slate-950/50">
                <div className="text-[10px] text-slate-500 dark:text-slate-400">وصول اقساط</div>
                <div className="mt-1 text-[12px] font-black text-slate-900 dark:text-white">{ctx.formatPrice(summary.breakdown.installmentReceived)}</div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-auto px-1">{controls}</div>
      </div>
    </div>
  );
}
