import React, { useId, useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import type { SalesDataPoint } from '../types';
import type { ChartVariant } from './ChartStylePicker';

type Props = {
  data: SalesDataPoint[];
  variant: ChartVariant;
  theme: 'light' | 'dark' | string; // از ThemeContext شما می‌آید
  height?: number;                  // پیش‌فرض 320px
  loading?: boolean;
};

const SalesAreaChart: React.FC<Props> = ({ data, variant, theme, height = 320, loading }) => {
  const svgId = useId();
  const isDark = String(theme).includes('dark');

  // پالت‌ها و کانتینر کلاس بر اساس استایل
  const cfg = useMemo(() => {
    // رنگ پایه
    const base = isDark ? '#A5B4FC' : '#4F46E5';
    const accent = isDark ? '#34D399' : '#10B981';

    // wrapper کلاس‌ها الهام‌گرفته از Lightswind (گرادیان/گلس/گلو) :contentReference[oaicite:1]{index=1}
    const wrappers: Record<string, string> = {
      minimal: 'bg-white dark:bg-gray-800 rounded-xl shadow-sm p-0',
      glass:
        'relative rounded-2xl p-3 sm:p-4 border border-white/10 dark:border-white/10 ' +
        'bg-white/50 dark:bg-gray-900/40 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.08)]',
      glow:
        'relative rounded-2xl p-3 sm:p-4 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-fuchsia-500/10 ' +
        'shadow-[0_0_40px_-10px_rgba(99,102,241,0.5)] ring-1 ring-white/10',
      aurora:
        'relative rounded-2xl p-3 sm:p-4 ' +
        'bg-[radial-gradient(1200px_500px_at_90%_-10%,rgba(99,102,241,0.20),transparent),radial-gradient(800px_400px_at_10%_110%,rgba(16,185,129,0.20),transparent)] ' +
        'border border-white/10',
      mesh:
        'relative rounded-2xl p-3 sm:p-4 border border-gray-200 dark:border-gray-800 ' +
        'bg-white dark:bg-gray-900 overflow-hidden',
      neon:
        'relative rounded-2xl p-3 sm:p-4 bg-gray-950/60 border border-indigo-500/30 ' +
        'shadow-[0_0_30px_rgba(99,102,241,0.45),inset_0_0_30px_rgba(16,185,129,0.15)]',
    };

    // stroke/fill
    const styles = {
      minimal:  { stroke: base, fill1: base, fill2: base },
      glass:    { stroke: base, fill1: base, fill2: '#FFFFFF' },
      glow:     { stroke: base, fill1: base, fill2: base },
      aurora:   { stroke: base, fill1: base, fill2: accent },
      mesh:     { stroke: base, fill1: base, fill2: base },
      neon:     { stroke: '#7C3AED', fill1: '#8B5CF6', fill2: '#22D3EE' },
    } as const;

    return {
      wrapper: wrappers[variant],
      colors: styles[variant],
      grid: isDark ? '#2F3341' : '#E5E7EB',
      tick: isDark ? '#9CA3AF' : '#6B7280',
      tooltipBg: isDark ? '#111827' : '#FFFFFF',
      tooltipText: isDark ? '#E5E7EB' : '#111827',
    };
  }, [variant, isDark]);

  const gradId = `grad-${variant}-${svgId}`;
  const glowId = `glow-${svgId}`;
  const meshId = `mesh-${svgId}`;

  return (
    <div className={cfg.wrapper} dir="rtl" style={{ height }}>
      {/* تزئینات ویژهٔ mesh */}
      {variant === 'mesh' && (
        <svg className="absolute inset-0 h-full w-full opacity-[0.06] pointer-events-none">
          <defs>
            <pattern id={meshId} width="24" height="24" patternUnits="userSpaceOnUse">
              <path d="M24 0H0V24" fill="none" stroke={isDark ? '#E5E7EB' : '#111827'} strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#${meshId})`} />
        </svg>
      )}

      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 0, left: 8, bottom: 8 }}>
          <defs>
            {/* گرادیان‌ها */}
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              {variant === 'aurora' ? (
                <>
                  <stop offset="0%"  stopColor={cfg.colors.fill1} stopOpacity={0.35} />
                  <stop offset="50%" stopColor={cfg.colors.fill2} stopOpacity={0.20} />
                  <stop offset="100%" stopColor={cfg.colors.fill2} stopOpacity={0.06} />
                </>
              ) : variant === 'neon' ? (
                <>
                  <stop offset="0%"  stopColor={cfg.colors.fill1} stopOpacity={0.45} />
                  <stop offset="60%" stopColor={cfg.colors.fill2} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={cfg.colors.fill2} stopOpacity={0.04} />
                </>
              ) : (
                <>
                  <stop offset="0%" stopColor={cfg.colors.fill1} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={cfg.colors.fill2} stopOpacity={0.06} />
                </>
              )}
            </linearGradient>

            {/* فیلتر گلو برای variant=glow */}
            {variant === 'glow' && (
              <filter id={glowId}>
                <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            )}
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke={cfg.grid} vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12, fill: cfg.tick }}
            axisLine={{ stroke: cfg.grid }}
            tickLine={{ stroke: cfg.grid }}
          />
          <YAxis
            orientation="right"
            tick={{ fontSize: 12, fill: cfg.tick }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => v.toLocaleString('fa-IR')}
          />

          <Tooltip
            contentStyle={{
              backgroundColor: cfg.tooltipBg,
              borderRadius: 10,
              border: `1px solid ${cfg.grid}`,
              direction: 'rtl',
            }}
            labelStyle={{ color: cfg.tooltipText, fontWeight: 700 }}
            itemStyle={{ color: isDark ? '#A78BFA' : '#6366F1' }}
            formatter={(v: number) => [v.toLocaleString('fa-IR') + ' تومان', 'فروش']}
          />
          <Legend wrapperStyle={{ direction: 'rtl', fontSize: 13, color: cfg.tick }} />

          <Area
            type="monotone"
            dataKey="sales"
            name="فروش"
            stroke={cfg.colors.stroke}
            strokeWidth={variant === 'neon' ? 2.5 : 2}
            fillOpacity={1}
            fill={`url(#${gradId})`}
            activeDot={{ r: 6 }}
            {...(variant === 'glow' ? { filter: `url(#${glowId})` } : {})}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SalesAreaChart;
