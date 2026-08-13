import { useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { CHART_TIMEFRAMES } from '../../../constants';
import type { SalesDataPoint, ChartTimeframe } from '../../../types';
import type { DashboardWidgetProps, ChartVariant } from '../types';
import Skeleton from '../../../components/ui/Skeleton';
import DashboardWidgetHeader from '../DashboardWidgetHeader';
import OperationalWidgetLayout from '../OperationalWidgetLayout';

const extractNumeric = (value: unknown): number => {
  if (value == null) return 0;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'object') {
    const source = value as Record<string, unknown>;
    const key = ['sales', 'value', 'amount', 'total', 'sum', 'revenue', 'count', 'price', 'num']
      .find((candidate) => Object.prototype.hasOwnProperty.call(source, candidate));
    return key ? extractNumeric(source[key]) : 0;
  }
  const normalized = String(value)
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[,،\s]/g, '')
    .replace(/تومان|ريال|ریال|IRR|IRT|tomans?|toman|rial/gi, '')
    .replace(/[^\d.-]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const chartTone = (style: ChartVariant, isDark: boolean) => {
  const tones: Record<ChartVariant, { stroke: string; fill: string }> = {
    minimal: { stroke: isDark ? '#93c5fd' : '#2563eb', fill: isDark ? '#93c5fd' : '#2563eb' },
    glass: { stroke: isDark ? '#7dd3fc' : '#0284c7', fill: isDark ? '#7dd3fc' : '#0284c7' },
    glow: { stroke: isDark ? '#c4b5fd' : '#7c3aed', fill: isDark ? '#c4b5fd' : '#7c3aed' },
    aurora: { stroke: isDark ? '#6ee7b7' : '#059669', fill: isDark ? '#6ee7b7' : '#059669' },
    mesh: { stroke: isDark ? '#fcd34d' : '#d97706', fill: isDark ? '#fcd34d' : '#d97706' },
    neon: { stroke: isDark ? '#67e8f9' : '#0891b2', fill: isDark ? '#67e8f9' : '#0891b2' },
  };
  return tones[style] || tones.minimal;
};

export default function SalesChartWidget({ ctx, container }: DashboardWidgetProps) {
  const width = container.width || 0;
  const compact = width > 0 && width < 560;
  const tiny = width > 0 && width < 420;
  const isDark = ctx.isDark;
  const colors = useMemo(() => chartTone(ctx.chartStyle, isDark), [ctx.chartStyle, isDark]);
  const data = (ctx.dashboardData?.salesChartData || []) as SalesDataPoint[];
  const chartReady = container.width > 0 && container.height > 0;
  const tickColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? '#1e293b' : '#e2e8f0';

  const timeframeControl = (
    <div className="app-dashboard-range-tabs" aria-label="بازه نمودار فروش">
      {CHART_TIMEFRAMES.map((timeframe) => (
        <button
          key={timeframe.key}
          type="button"
          data-skip-global-button="true"
          className="app-dashboard-range-tab"
          data-active={ctx.activeTimeframe === timeframe.key ? 'true' : 'false'}
          onClick={() => ctx.setActiveTimeframe(timeframe.key as ChartTimeframe['key'])}
          disabled={Boolean(ctx.showLoadingSkeletons)}
        >
          {timeframe.label}
        </button>
      ))}
    </div>
  );

  return (
    <div data-ui-dashboard-widget-kind="sales-chart" className="app-dashboard-widget app-dashboard-chart">
      <OperationalWidgetLayout
        header={(
          <DashboardWidgetHeader
            title="نمای کلی فروش"
            subtitle="روند فروش در بازه انتخابی"
            icon="fa-solid fa-chart-line"
            action={timeframeControl}
            compact={compact}
          />
        )}
        compact={compact}
        scroll={false}
        scrollLabel="نمودار فروش"
      >
        <div className="app-dashboard-chart__stage">
          {ctx.showLoadingSkeletons || !chartReady ? (
            <div className="app-dashboard-chart__loading" aria-label="در حال دریافت نمودار فروش">
              <div className="app-dashboard-chart__loading-bars">
                {Array.from({ length: 7 }).map((_, index) => (
                  <div key={index} className="app-dashboard-chart__loading-bar" data-bar-index={index}>
                    <Skeleton tone="info" className="h-full w-full" rounded="lg" />
                  </div>
                ))}
              </div>
            </div>
          ) : data.length > 0 ? (
            <ResponsiveContainer
              width="100%"
              height="100%"
              minWidth={1}
              minHeight={1}
              initialDimension={{ width: Math.max(1, container.width), height: Math.max(1, container.height) }}
            >
              <AreaChart data={data} margin={{ top: 10, right: tiny ? 2 : 8, left: tiny ? -16 : -4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 4" stroke={gridColor} vertical={!tiny} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: tickColor, fontSize: tiny ? 9 : 10 }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={tiny ? 20 : 12}
                />
                <YAxis
                  tick={{ fill: tickColor, fontSize: tiny ? 9 : 10 }}
                  tickLine={false}
                  axisLine={false}
                  width={tiny ? 42 : 58}
                  tickFormatter={(value) => extractNumeric(value).toLocaleString('fa-IR')}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#0f172a' : '#ffffff',
                    border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                    borderRadius: '10px',
                    boxShadow: 'none',
                    direction: 'rtl',
                    fontSize: '11px',
                  }}
                  itemStyle={{ color: colors.stroke }}
                  labelStyle={{ color: isDark ? '#e2e8f0' : '#334155', fontWeight: 700 }}
                  formatter={(value: unknown) => [ctx.formatPrice(extractNumeric(value)), 'فروش']}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke={colors.stroke}
                  fill={colors.fill}
                  fillOpacity={0.09}
                  strokeWidth={2}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                  dot={false}
                  name="فروش"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="app-dashboard-empty">
              <span className="app-dashboard-empty__icon"><i className="fa-solid fa-chart-line" /></span>
              <strong>{!ctx.token && ctx.authReady ? 'برای مشاهده اطلاعات وارد شوید' : 'داده‌ای برای نمایش وجود ندارد'}</strong>
              <span>{!ctx.token && ctx.authReady ? 'پس از ورود، روند فروش در این بخش نمایش داده می‌شود.' : 'با ثبت فروش جدید، نمودار به‌روزرسانی می‌شود.'}</span>
            </div>
          )}
        </div>
      </OperationalWidgetLayout>
    </div>
  );
}
