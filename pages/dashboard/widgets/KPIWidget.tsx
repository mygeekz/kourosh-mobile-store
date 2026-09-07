import { useMemo } from 'react';
import type { DashboardWidgetContext, DashboardWidgetProps } from '../types';
import DashboardMetric from '../DashboardMetric';
import DashboardHeaderLink from '../DashboardHeaderLink';
import Skeleton from '../../../components/ui/Skeleton';

type Accent = 'indigo' | 'emerald' | 'blue' | 'rose' | 'amber' | 'violet';

type Props = DashboardWidgetProps & {
  title: string;
  icon: string;
  accent: Accent;
  getValue: (ctx: DashboardWidgetContext) => string;
  hint?: string;
  detailsTo?: string;
  detailsLabel?: string;
  subtitle?: string;
};

const toneMap: Record<Accent, 'sky' | 'emerald' | 'rose' | 'amber' | 'violet'> = {
  indigo: 'violet',
  emerald: 'emerald',
  blue: 'sky',
  rose: 'rose',
  amber: 'amber',
  violet: 'violet',
};

export default function KPIWidget({
  ctx,
  container,
  title,
  icon,
  accent,
  getValue,
  hint,
  detailsTo,
  detailsLabel,
  subtitle,
}: Props) {
  const compact = useMemo(
    () => (container.width || 0) < 320 || ((container.height || 0) > 0 && (container.height || 0) < 150),
    [container.height, container.width],
  );

  return (
    <div
      dir="rtl"
      data-ui-dashboard-widget-kind="kpi"
      data-dashboard-widget-density={compact ? 'compact' : 'regular'}
      className="app-dashboard-widget app-dashboard-kpi-widget"
    >
      <DashboardMetric
        label={title}
        icon={icon}
        tone={toneMap[accent]}
        compact={compact}
        value={ctx.showLoadingSkeletons ? <Skeleton tone="info" className="h-5 w-28" rounded="lg" /> : getValue(ctx)}
        meta={(
          <span className="app-dashboard-kpi-widget__meta">
            <span>{hint || subtitle || 'به‌روزرسانی خودکار'}</span>
            {detailsTo ? (
              <DashboardHeaderLink to={detailsTo}>
                {detailsLabel || 'جزئیات'}
              </DashboardHeaderLink>
            ) : null}
          </span>
        )}
      />
    </div>
  );
}
