import type { ReactNode } from 'react';

type DashboardWidgetHeaderTone = 'primary' | 'neutral' | 'emerald' | 'amber' | 'rose';

type DashboardWidgetHeaderProps = {
  title: string;
  subtitle?: string;
  icon?: string;
  action?: ReactNode;
  compact?: boolean;
  tone?: DashboardWidgetHeaderTone;
};

/** Canonical header for dashboard widgets and dashboard sections. */
export default function DashboardWidgetHeader({
  title,
  subtitle,
  icon,
  action,
  compact = false,
  tone = 'primary',
}: DashboardWidgetHeaderProps) {
  const resolvedIcon = icon?.trim() || 'fa-solid fa-chart-simple';

  return (
    <div
      className="app-dashboard-widget-header"
      data-dashboard-widget-header-density={compact ? 'compact' : 'regular'}
      data-dashboard-widget-header-tone={tone}
    >
      <div className="app-dashboard-widget-header__identity">
        <span className="app-dashboard-widget-header__icon" aria-hidden="true">
          <i className={resolvedIcon} />
        </span>
        <span className="app-dashboard-widget-header__copy">
          <strong className="app-dashboard-widget-header__title">{title}</strong>
          {subtitle ? <span className="app-dashboard-widget-header__subtitle">{subtitle}</span> : null}
        </span>
      </div>
      {action ? <div className="app-dashboard-widget-header__action">{action}</div> : null}
    </div>
  );
}
