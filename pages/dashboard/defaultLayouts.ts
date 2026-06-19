import type { WidgetId, SizePreset } from './registry';

export type DashboardLayoutV2 = {
  version: 2;
  order: WidgetId[];
  sizes: Record<string, SizePreset>;
};

export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayoutV2 = {
  version: 2,
  // Default dashboard layout intentionally contains only managed operational widgets.
  // Executive/fixed KPI sections already cover revenue, monthly sales, repair profit,
  // inventory value, accessory sales, phone cash sales, installment sales, customers/products,
  // urgent actions, and the smart clock. Keeping their duplicate widget versions in the
  // default managed grid breaks the premium fixed-card layout and creates repeated metrics.
  order: [
    'sales_chart',
    'installment_calendar',
    'recent_activities',
  ],
  sizes: {
    sales_chart: 'hero',
    installment_calendar: 'wide',
    recent_activities: 'wide',
  },
};
