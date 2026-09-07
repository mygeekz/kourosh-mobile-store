import type { ReactNode } from 'react';

type DashboardMetricTone = 'neutral' | 'sky' | 'emerald' | 'amber' | 'violet' | 'rose';

type DashboardMetricProps = {
  label: string;
  value: ReactNode;
  valueBadge?: string;
  icon?: string;
  meta?: ReactNode;
  tone?: DashboardMetricTone;
  compact?: boolean;
};

/** Canonical compact metric used across all dashboard surfaces. */
export default function DashboardMetric({
  label,
  value,
  valueBadge,
  icon,
  meta,
  tone = 'neutral',
  compact = false,
}: DashboardMetricProps) {
  return (
    <div
      className="app-dashboard-metric"
      data-dashboard-metric-tone={tone}
      data-dashboard-metric-density={compact ? 'compact' : 'regular'}
    >
      <div className="app-dashboard-metric__topline">
        <span className="app-dashboard-metric__label">{label}</span>
        {icon ? (
          <span className="app-dashboard-metric__icon" aria-hidden="true">
            <i className={icon} />
          </span>
        ) : null}
      </div>
      {valueBadge ? (
        <span className="mt-1.5 inline-flex w-fit items-center rounded-full border border-current/20 px-2 py-0.5 text-[9px] font-extrabold leading-4 opacity-80">
          {valueBadge}
        </span>
      ) : null}
      <div className="app-dashboard-metric__value">{value}</div>
      {meta ? <div className="app-dashboard-metric__meta !overflow-visible !whitespace-normal !text-clip break-words">{meta}</div> : null}
    </div>
  );
}
