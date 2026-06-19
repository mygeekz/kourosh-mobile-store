import React from 'react';
import type { DashboardWidgetProps, DashboardWidgetContext } from './types';

import AssetWidget from './widgets/AssetWidget';
import KPIWidget from './widgets/KPIWidget';
import ProductSalesKPIWidget from './widgets/ProductSalesKPIWidget';
import SalesChartWidget from './widgets/SalesChartWidget';
import RecentActivitiesWidget from './widgets/RecentActivitiesWidget';
import InstallmentCalendarWidget from './widgets/InstallmentCalendarWidget';
import ActionCenterWidgetCard from './widgets/ActionCenterWidgetCard';
import ClockWidget from './widgets/ClockWidget';

export type WidgetId =
  | 'asset'
  | 'kpi_revenue_today'
  | 'kpi_sales_month'
  | 'kpi_cash_sales_month'
  | 'kpi_installment_sales_month'
  | 'kpi_repair_profit_month'
  | 'kpi_product_sales_month'
  | 'kpi_products_count'
  | 'kpi_customers_count'
  | 'sales_chart'
  | 'recent_activities'
  | 'installment_calendar'
  | 'action_center'
  | 'clock_widget';

export type SizePreset = 'tile' | 'wide' | 'hero' | 'tall';

export type WidgetDef = {
  id: WidgetId;
  title: string;
  icon: string;
  category: string;
  accent: 'indigo'|'emerald'|'violet'|'rose'|'sky'|'amber'|'teal';
  defaultPreset: SizePreset;
  // widget body
  Component: React.FC<DashboardWidgetProps>;
  // optional constraints (merged into layout item)
  constraints?: Partial<{ w: number; h: number; minW?: number; minH?: number; maxW?: number; maxH?: number }>;
  canRemove?: boolean;
  canResize?: boolean;
  featureKey?: string;
};

export const PRESET_SIZE: Record<SizePreset, { w: number; h: number; minW: number; minH: number }> = {
  tile: { w: 3, h: 2, minW: 2, minH: 2 },
  wide: { w: 6, h: 2, minW: 4, minH: 2 },
  tall: { w: 5, h: 5, minW: 4, minH: 4 },
  hero: { w: 12, h: 6, minW: 6, minH: 4 },
};

const kpiValue =
  (fn: (ctx: DashboardWidgetContext) => number) =>
  (ctx: DashboardWidgetContext): string =>
    ctx.formatPrice(fn(ctx));

export const WIDGET_REGISTRY: Record<WidgetId, WidgetDef> = {
  asset: {
    id: 'asset',
    title: 'دارایی (کالاهای موجود)',
    icon: 'fa-solid fa-vault',
    category: 'خلاصه',
    accent: 'violet',
    defaultPreset: 'wide',
    Component: AssetWidget,
    canRemove: true,
    canResize: true,
  },

  kpi_revenue_today: {
    id: 'kpi_revenue_today',
    title: 'درآمد امروز',
    icon: 'fa-solid fa-sack-dollar',
    category: 'شاخص‌ها',
    accent: 'emerald',
    defaultPreset: 'wide',
    Component: (props) => (
      <KPIWidget
        {...props}
        title="درآمد امروز"
        subtitle="Revenue (today)"
        accent="emerald"
        icon="fa-solid fa-sack-dollar"
        detailsTo="/reports/financial-overview"
        getValue={kpiValue((c) => c.dashboardData?.kpis?.revenueToday ?? 0)}
      />
    ),
    canRemove: true,
    canResize: true,
  },

  kpi_sales_month: {
    id: 'kpi_sales_month',
    title: 'فروش ماه جاری',
    icon: 'fa-solid fa-dollar-sign',
    category: 'شاخص‌ها',
    accent: 'violet',
    defaultPreset: 'tile',
    Component: (props) => (
      <KPIWidget
        {...props}
        title="فروش کل ماه جاری"
        subtitle="Total sales (month)"
        accent="indigo"
        icon="fa-solid fa-dollar-sign"
        detailsTo="/reports/sales-summary"
        getValue={kpiValue((c) => c.dashboardData?.kpis?.totalSalesMonth ?? 0)}
      />
    ),
    canRemove: true,
    canResize: true,
  },

  kpi_cash_sales_month: {
    featureKey: 'mobile_phones',
    id: 'kpi_cash_sales_month',
    title: 'درآمد فروش نقدی گوشی',
    icon: 'fa-solid fa-mobile-screen-button',
    category: 'شاخص‌ها',
    accent: 'amber',
    defaultPreset: 'tile',
    Component: (props) => (
      <KPIWidget
        {...props}
        title="درآمد فروش نقدی گوشی"
        subtitle="Phone cash sales (month)"
        hint="ماه جاری"
        accent="amber"
        icon="fa-solid fa-mobile-screen-button" detailsTo="/reports/phone-sales"
        getValue={kpiValue((c) => c.dashboardData?.kpis?.phoneSalesRevenueMonth ?? 0)}
      />
    ),
    canRemove: true,
    canResize: true,
  },

  kpi_installment_sales_month: {
    featureKey: 'installments',
    id: 'kpi_installment_sales_month',
    title: 'درآمد فروش اقساطی',
    icon: 'fa-solid fa-file-invoice-dollar',
    category: 'شاخص‌ها',
    accent: 'indigo',
    defaultPreset: 'tile',
    Component: (props) => (
      <KPIWidget
        {...props}
        title="درآمد فروش اقساطی"
        subtitle="Installment sales (month)"
        hint="ماه جاری"
        accent="indigo"
        icon="fa-solid fa-file-invoice-dollar" detailsTo="/installment-sales"
        getValue={kpiValue((c) => c.dashboardData?.kpis?.installmentSalesRevenueMonth ?? 0)}
      />
    ),
    canRemove: true,
    canResize: true,
  },


  kpi_repair_profit_month: {
    featureKey: 'repairs_services',
    id: 'kpi_repair_profit_month',
    title: 'سود تعمیرات ماه',
    icon: 'fa-solid fa-screwdriver-wrench',
    category: 'شاخص‌ها',
    accent: 'amber',
    defaultPreset: 'tile',
    Component: (props) => (
      <KPIWidget
        {...props}
        title="سود تعمیرات ماه"
        subtitle="Repair profit (month)"
        hint="ماه جاری"
        accent="amber"
        icon="fa-solid fa-screwdriver-wrench" detailsTo="/reports/financial-overview"
        getValue={kpiValue((c) => c.dashboardData?.kpis?.repairProfitMonth ?? 0)}
      />
    ),
    canRemove: true,
    canResize: true,
  },

  kpi_product_sales_month: {
    id: 'kpi_product_sales_month',
    title: 'فروش محصولات جانبی',
    icon: 'fa-solid fa-box-open',
    category: 'شاخص‌ها',
    accent: 'amber',
    defaultPreset: 'wide',
    Component: ProductSalesKPIWidget,
    canRemove: true,
    canResize: true,
  },


  kpi_products_count: {
    id: 'kpi_products_count',
    title: 'تعداد محصولات و گوشی‌ها',
    icon: 'fa-solid fa-box-open',
    category: 'شاخص‌ها',
    accent: 'sky',
    defaultPreset: 'tile',
    Component: (props) => (
      <KPIWidget
        {...props}
        title="تعداد محصولات و گوشی‌ها"
        subtitle="Active products"
        accent="blue"
        icon="fa-solid fa-box-open" detailsTo="/products"
        getValue={(c) => c.formatNumber(c.dashboardData?.kpis?.activeProductsCount ?? 0)}
      />
    ),
    canRemove: true,
    canResize: true,
  },

  kpi_customers_count: {
    id: 'kpi_customers_count',
    title: 'تعداد مشتریان',
    icon: 'fa-solid fa-users',
    category: 'شاخص‌ها',
    accent: 'rose',
    defaultPreset: 'tile',
    Component: (props) => (
      <KPIWidget
        {...props}
        title="تعداد مشتریان"
        subtitle="Total customers"
        accent="rose"
        icon="fa-solid fa-users" detailsTo="/customers"
        getValue={(c) => c.formatNumber(c.dashboardData?.kpis?.totalCustomersCount ?? 0)}
      />
    ),
    canRemove: true,
    canResize: true,
  },

  sales_chart: {
    id: 'sales_chart',
    title: 'نمودار فروش',
    icon: 'fa-solid fa-chart-area',
    category: 'نمودارها',
    accent: 'teal',
    defaultPreset: 'hero',
    Component: SalesChartWidget,
    canRemove: true,
    canResize: true,
    constraints: { minW: 4, minH: 4 },
  },

  recent_activities: {
    featureKey: 'audit_log',
    id: 'recent_activities',
    title: 'فعالیت‌های اخیر',
    icon: 'fa-solid fa-clock-rotate-left',
    category: 'گزارش سریع',
    accent: 'indigo',
    defaultPreset: 'tall',
    Component: RecentActivitiesWidget,
    canRemove: true,
    canResize: true,
    constraints: { minW: 4, minH: 4 },
  },

  installment_calendar: {
    featureKey: 'installments',
    id: 'installment_calendar',
    title: 'خلاصه فروش اقساطی',
    icon: 'fa-solid fa-calendar-days',
    category: 'مالی',
    accent: 'amber',
    defaultPreset: 'tall',
    Component: InstallmentCalendarWidget,
    canRemove: true,
    canResize: true,
    constraints: { minW: 4, minH: 4 },
  },



  clock_widget: {
    featureKey: 'dashboard_clock_widget',
    id: 'clock_widget',
    title: 'ساعت و تاریخ',
    icon: 'fa-solid fa-clock',
    category: 'ابزارها',
    accent: 'sky',
    defaultPreset: 'wide',
    Component: ClockWidget,
    canRemove: true,
    canResize: true,
  },

  action_center: {
    featureKey: 'smart_insights',
    id: 'action_center',
    title: 'مرکز عملیات',
    icon: 'fa-solid fa-bolt',
    category: 'مالی',
    accent: 'teal',
    defaultPreset: 'tall',
    Component: ActionCenterWidgetCard,
    canRemove: false, // make sure there's always a hint/action
    canResize: true,
    constraints: { minW: 4, minH: 4 },
  },
};

export const ALL_WIDGETS: WidgetDef[] = Object.values(WIDGET_REGISTRY);
