import { useId, useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { CHART_TIMEFRAMES } from '../../../constants';
import type { SalesDataPoint, ChartTimeframe } from '../../../types';
import type { DashboardWidgetProps, ChartVariant } from '../types';
import Skeleton from '../../../components/ui/Skeleton';

const extractNumeric = (v: any): number => {
  if (v == null) return 0;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'object') {
    const k = ['sales', 'value', 'amount', 'total', 'sum', 'revenue', 'count', 'price', 'num'].find((key) =>
      Object.prototype.hasOwnProperty.call(v, key),
    );
    return k ? extractNumeric((v as any)[k]) : 0;
  }
  const s = String(v ?? '')
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[,،\s]/g, '')
    .replace(/تومان|ريال|ریال|IRR|IRT|tomans?|toman|rial/gi, '')
    .replace(/[^\d.-]/g, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

const chartConfig = (style: ChartVariant, isDark: boolean) => {
  // Deliberately explicit colors so the style is consistent (works for both themes)
  const base = {
    stroke: isDark ? '#A78BFA' : '#6366F1',
    fill1: isDark ? '#A78BFA' : '#6366F1',
    fill2: isDark ? '#22C55E' : '#10B981',
    strokeWidth: 3,
  };
  if (style === 'minimal') return base;
  if (style === 'glass')
    return { ...base, stroke: isDark ? '#93C5FD' : '#3B82F6', fill1: isDark ? '#93C5FD' : '#3B82F6', fill2: '#FFFFFF', strokeWidth: 3 };
  if (style === 'glow')
    return { ...base, stroke: isDark ? '#F472B6' : '#EC4899', fill1: isDark ? '#F472B6' : '#EC4899', fill2: isDark ? '#A78BFA' : '#6366F1', strokeWidth: 3 };
  if (style === 'aurora')
    return { ...base, stroke: isDark ? '#22C55E' : '#10B981', fill1: isDark ? '#22C55E' : '#10B981', fill2: isDark ? '#60A5FA' : '#3B82F6', strokeWidth: 3 };
  if (style === 'mesh')
    return { ...base, stroke: isDark ? '#FBBF24' : '#F59E0B', fill1: isDark ? '#FBBF24' : '#F59E0B', fill2: isDark ? '#A78BFA' : '#6366F1', strokeWidth: 3 };
  // neon
  return { ...base, stroke: '#22D3EE', fill1: '#22D3EE', fill2: '#A78BFA', strokeWidth: 3 };
};

export default function SalesChartWidget({ ctx, container }: DashboardWidgetProps) {
  const gradId = useId();
  const glowId = useId();
  const meshPatternId = useId();

  const isDark = ctx.isDark;
  const chartTickColor = isDark ? '#9ca3af' : '#6B7280';
  const chartGridColor = isDark ? '#2F3341' : '#e0e0e0';
  const chartTooltipBg = isDark ? '#0B1220' : 'white';
  const chartTooltipText = isDark ? '#E5E7EB' : '#374151';

  const w = container.width || 0;
  const compact = w > 0 && w < 560;
  const tiny = w > 0 && w < 420;
  const padCls = tiny ? 'p-3' : compact ? 'p-4' : 'p-5';

  const chartCfg = useMemo(() => chartConfig(ctx.chartStyle, isDark), [ctx.chartStyle, isDark]);

  const data = (ctx.dashboardData?.salesChartData || []) as SalesDataPoint[];

  const handleTimeframeChange = (timeframeKey: ChartTimeframe['key']) => {
    ctx.setActiveTimeframe(timeframeKey);
  };

  return (
    <div data-ui-dashboard-widget-kind="sales-chart" className={[
      'premium-data-shell flex h-full min-h-0 flex-col overflow-hidden',
      padCls,
    ].join(' ')}>
      <div
        className={[
          'premium-data-header mb-4 shrink-0 gap-3 text-right',
          compact ? 'flex-col items-stretch' : 'flex-row items-center justify-between',
        ].join(' ')}
      >
        <div className="flex min-w-0 items-center justify-end gap-2">
          <h3 className={[tiny ? 'text-xs' : 'text-sm', 'premium-data-title'].join(' ')}>
            نمای کلی فروش
          </h3>
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
            <i className="fa-solid fa-chart-line text-[13px]" />
          </span>
        </div>

        <div className={['flex flex-wrap items-center', compact ? 'justify-start overflow-x-auto' : 'justify-end', 'gap-2'].join(' ')}>
          {CHART_TIMEFRAMES.map((timeframe) => (
            <button
              key={timeframe.key}
              onClick={() => handleTimeframeChange(timeframe.key)}
              disabled={!!ctx.showLoadingSkeletons}
              className={`${tiny ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'} premium-data-segment whitespace-nowrap ${
                ctx.activeTimeframe === timeframe.key
                  ? 'is-active'
                  : ''
              }`}
            >
              {timeframe.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative min-h-0 w-full flex-1 overflow-hidden">
        {ctx.chartStyle === 'mesh' && (
          <svg className="absolute inset-0 h-full w-full opacity-[0.06] pointer-events-none">
            <defs>
              <pattern id={meshPatternId} width="24" height="24" patternUnits="userSpaceOnUse">
                <path d="M24 0H0V24" fill="none" stroke={isDark ? '#E5E7EB' : '#111827'} strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#${meshPatternId})`} />
          </svg>
        )}

        {ctx.showLoadingSkeletons ? (
          <div className="premium-chart-stage h-full min-h-0">
            <div className="flex h-full min-h-0 flex-col gap-4 animate-pulse">
              <div className="flex items-center justify-between gap-3">
                <Skeleton tone="info" className="h-4 w-28" rounded="lg" />
                <div className="flex items-center gap-2">
                  <Skeleton tone="info" className="h-8 w-16" rounded="xl" />
                  <Skeleton tone="info" className="h-8 w-16" rounded="xl" />
                  <Skeleton tone="info" className="h-8 w-16" rounded="xl" />
                </div>
              </div>
              <div className="grid min-h-0 flex-1 grid-cols-6 items-end gap-2">
                <Skeleton tone="info" className="h-16 w-full" rounded="xl" />
                <Skeleton tone="info" className="h-24 w-full" rounded="xl" />
                <Skeleton tone="info" className="h-20 w-full" rounded="xl" />
                <Skeleton tone="info" className="h-32 w-full" rounded="xl" />
                <Skeleton tone="info" className="h-24 w-full" rounded="xl" />
                <Skeleton tone="info" className="h-36 w-full" rounded="xl" />
              </div>
              <div className="grid grid-cols-4 gap-2">
                <Skeleton tone="info" className="h-3" rounded="lg" />
                <Skeleton tone="info" className="h-3" rounded="lg" />
                <Skeleton tone="info" className="h-3" rounded="lg" />
                <Skeleton tone="info" className="h-3" rounded="lg" />
              </div>
            </div>
          </div>
        ) : data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  {ctx.chartStyle === 'glass' ? (
                    <>
                      <stop offset="0%" stopColor={chartCfg.fill1} stopOpacity={0.22} />
                      <stop offset="100%" stopColor="#FFFFFF" stopOpacity={0.02} />
                    </>
                  ) : ctx.chartStyle === 'aurora' ? (
                    <>
                      <stop offset="0%" stopColor={chartCfg.fill1} stopOpacity={0.35} />
                      <stop offset="50%" stopColor={chartCfg.fill2} stopOpacity={0.18} />
                      <stop offset="100%" stopColor={chartCfg.fill2} stopOpacity={0.02} />
                    </>
                  ) : ctx.chartStyle === 'mesh' ? (
                    <>
                      <stop offset="0%" stopColor={chartCfg.fill1} stopOpacity={0.24} />
                      <stop offset="100%" stopColor={chartCfg.fill2} stopOpacity={0.06} />
                    </>
                  ) : ctx.chartStyle === 'neon' ? (
                    <>
                      <stop offset="0%" stopColor={chartCfg.fill1} stopOpacity={0.32} />
                      <stop offset="100%" stopColor={chartCfg.fill2} stopOpacity={0.08} />
                    </>
                  ) : (
                    <>
                      <stop offset="0%" stopColor={chartCfg.fill1} stopOpacity={0.28} />
                      <stop offset="100%" stopColor={chartCfg.fill2} stopOpacity={0.05} />
                    </>
                  )}
                </linearGradient>

                {ctx.chartStyle === 'glow' && (
                  <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                )}
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
              <XAxis dataKey="name" tick={{ fill: chartTickColor, fontSize: tiny ? 10 : 12 }} />
              <YAxis tick={{ fill: chartTickColor, fontSize: tiny ? 10 : 12 }} tickFormatter={(v) => (Number(v) || 0).toLocaleString('fa-IR')} />
              <Tooltip
                contentStyle={{
                  backgroundColor: chartTooltipBg,
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.35)' : '0 10px 30px rgba(0,0,0,0.12)',
                  direction: 'rtl',
                }}
                itemStyle={{ color: isDark ? '#A78BFA' : '#6366F1' }}
                labelStyle={{ color: chartTooltipText, fontWeight: 'bold' }}
                formatter={(value: any) => [ctx.formatPrice(extractNumeric(value)), 'فروش']}
              />
              <Legend wrapperStyle={{ fontSize: '12px', direction: 'rtl', color: chartTickColor }} />

              <Area
                type="monotone"
                dataKey="sales"
                stroke={chartCfg.stroke}
                fillOpacity={1}
                fill={`url(#${gradId})`}
                strokeWidth={chartCfg.strokeWidth}
                activeDot={{ r: 6 }}
                name="فروش"
                {...(ctx.chartStyle === 'glow' ? { filter: `url(#${glowId})` } : {})}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="premium-chart-empty">
            <span className="premium-chart-empty__icon"><i className="fa-solid fa-chart-line" /></span>
            <div className="premium-chart-empty__title">
              {!ctx.token && ctx.authReady ? 'برای مشاهده اطلاعات، ابتدا وارد شوید' : 'داده‌ای برای نمایش وجود ندارد'}
            </div>
            <div className="premium-chart-empty__text">
              {!ctx.token && ctx.authReady ? 'پس از ورود، روند فروش روزانه و تغییرات بازه انتخابی اینجا نمایش داده می‌شود.' : 'بازه انتخابی یا نوع نمودار را تغییر دهید؛ با ثبت داده جدید، این کارت به‌روزرسانی می‌شود.'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
