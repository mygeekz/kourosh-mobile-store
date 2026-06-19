import type { ChartTimeframe, DashboardAPIData, InstallmentCalendarItem } from '../../types';
import type { ContainerSize } from './useContainerSize';

export type ChartVariant = 'minimal' | 'glass' | 'glow' | 'aurora' | 'mesh' | 'neon';

export type AssetBreakdown = {
  productsValue: number;
  phonesValue: number;
  itemsCount: number;
};

export type DueRange = { from: string; to: string };

export type DashboardWidgetContext = {
  token: string | null;
  authReady: boolean;
  isDark: boolean;

  showLoadingSkeletons: boolean;

  // Main dashboard summary
  dashboardData: DashboardAPIData | null;

  // Chart controls
  activeTimeframe: ChartTimeframe['key'];
  setActiveTimeframe: (t: ChartTimeframe['key']) => void;
  chartStyle: ChartVariant;
  setChartStyle: (v: ChartVariant) => void;

  // Assets
  assetLoading: boolean;
  assetValue: number;
  assetBreakdown: AssetBreakdown;

  // Upcoming installments/checks
  dueLoading: boolean;
  dueItems: InstallmentCalendarItem[];
  dueRange: DueRange | null;

  
  // Product-only sales (inventory items) in current period
  productSalesLoading: boolean;
  productSalesTotal: number;

// Formatting
  formatPrice: (v: number) => string;
  formatNumber: (v: number) => string;
};

export type DashboardWidgetProps = {
  ctx: DashboardWidgetContext;
  container: ContainerSize;
};
