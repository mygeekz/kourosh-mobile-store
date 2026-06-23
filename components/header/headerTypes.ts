import type { CSSProperties } from 'react';

export type HeaderSearchDomain = 'customer' | 'partner' | 'product' | 'phone' | 'service' | 'invoice' | 'repair' | 'installment';

export type HeaderSearchHistoryItem = {
  query: string;
  count?: number;
};

export type HeaderSearchItem = {
  id: number;
  domain: HeaderSearchDomain;
  title?: string;
  subtitle?: string;
  titleHL?: string;
  snippet?: string;
  matchSource?: string;
  matchReason?: string;
};

export type HeaderQuickMenuKey = 'sales' | 'due' | 'notifications';

export type HeaderQuickMenuSmartStyle = CSSProperties & {
  '--header-quick-panel-origin-x'?: string;
  '--header-quick-panel-origin-y'?: string;
};


export type HeaderNotificationItem = {
  id: string;
  title?: string;
  description?: string;
  actionLink?: string;
};

export type HeaderDueItem = {
  saleId?: number;
  dueDate?: string;
  amount?: number;
  customerFullName?: string;
  status?: string;
};

export type HeaderSalesPreview = {
  totalRevenue: number;
  grossProfit: number;
  totalTransactions: number;
  averageSaleValue: number;
  topSellingItems: Array<{ itemName?: string; totalRevenue?: number; quantitySold?: number }>;
};

export type HeaderFinancePulse = {
  realizedProfit: number;
  realizedRevenue: number;
  unrecognizedProfit: number;
  collectionRate: number;
};

export type HeaderQuickStats = {
  salesCount: number;
  notificationsCount: number;
  dueCount: number;
};

export type HeaderQuickPanels = {
  sales: HeaderSalesPreview;
  notifications: HeaderNotificationItem[];
  due: HeaderDueItem[];
};
