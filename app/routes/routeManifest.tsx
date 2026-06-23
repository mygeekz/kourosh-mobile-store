import React from 'react';
import { Navigate } from 'react-router-dom';

import type { RoleName } from '../../utils/rbac';
export type { RoleName } from '../../utils/rbac';
import { FeatureGate } from './FeatureGate';
import * as Page from './lazyPages';

export type AppRouteDefinition = {
  path?: string;
  index?: true;
  element: React.ReactElement;
};

export type RoleRouteGroup = {
  id: string;
  label: string;
  allowedRoles: RoleName[];
  routes: AppRouteDefinition[];
};

const route = (path: string, element: React.ReactElement): AppRouteDefinition => ({ path, element });
const indexRoute = (element: React.ReactElement): AppRouteDefinition => ({ index: true, element });
const gated = (feature: string, element: React.ReactElement): React.ReactElement => (
  <FeatureGate feature={feature}>{element}</FeatureGate>
);

export const publicRoutes: AppRouteDefinition[] = [
  route('/login', <Page.LoginPage />),
  route('/install', <Page.InstallApp />),
];

export const printRoutes: AppRouteDefinition[] = [
  route('reports/*', <Page.PrintReportShell />),
];

export const mainLayoutRoutes: AppRouteDefinition[] = [
  route('/', <Page.Dashboard />),
  route('/profile', <Page.ProfilePage />),
  route('search', <Page.SearchResults />),
  route('/search', <Page.SearchResults />),
  route('/403', <Page.Forbidden />),
];

export const reportsAllowedRoles: RoleName[] = ['Admin', 'Manager', 'Salesperson', 'Marketer'];

export const reportRoutes: AppRouteDefinition[] = [
  indexRoute(<Page.Reports />),
  route('sales-summary', <Page.SalesReport />),
  route('sales', <Page.SalesReport />),
  route('product-sales', <Page.ProductSalesReport />),
  route('partners-performance', <Page.PartnerPerformanceReport />),
  route('followups', <Page.FollowupsReport />),
  route('collection-center', gated('installments', <Page.CollectionFollowupCenter />)),
  route('collection-followup', gated('installments', <Page.CollectionFollowupCenter />)),
  route('debtors', <Page.DebtorsReport />),
  route('creditors', <Page.CreditorsReport />),
  route('top-customers', <Page.TopCustomersReport />),
  route('top-suppliers', <Page.TopSuppliersReport />),
  route('mobile-sales-analytics', gated('mobile_phones', <Page.MobileSalesAnalytics />)),
  route('smart-insights', gated('smart_insights', <Page.SmartInsightCenter />)),
  route('phone-sales', gated('mobile_phones', <Page.PhoneSalesReport />)),
  route('phone-installment-sales', gated('mobile_phones', <Page.PhoneInstallmentSalesReport />)),
  route('periodic-comparison', <Page.CompareSales />),
  route('financial-overview', <Page.FinancialOverview />),
  route('realized-profit', <Page.RealizedProfitReport />),
  route('analytics', <Page.AnalyticsDashboard />),
  route('product-profit-real', <Page.ProductProfitReal />),
  route('installments-calendar', gated('installments', <Page.InstallmentsCalendar />)),
  route('rfm', <Page.RfmReport />),
  route('cohort', <Page.CohortReport />),
  route('inventory-turnover', <Page.InventoryTurnoverReport />),
  route('dead-stock', <Page.DeadStockReport />),
  route('abc', <Page.AbcAnalysisReport />),
  route('aging-receivables', <Page.AgingReceivablesReport />),
  route('cashflow', <Page.CashflowReport />),
  route('financial-audit', <Page.FinancialAuditReport />),
  route('manager-credit-approvals', <Page.ManagerCreditApprovalsReport />),
  route('sales-risk-decisions', <Page.SalesRiskDecisionsReport />),
  route('analysis', gated('smart_insights', <Page.AnalysisHub />)),
  route('analysis/profitability', gated('smart_insights', <Page.ProfitabilityReport />)),
  route('analysis/inventory', gated('smart_insights', <Page.InventoryAnalysisReport />)),
  route('analysis/suggestions', gated('smart_insights', <Page.PurchaseSuggestionReport />)),
];

export const roleRouteGroups: RoleRouteGroup[] = [
  {
    id: 'inventory-sales-access',
    label: 'Inventory and sales visibility',
    allowedRoles: ['Admin', 'Manager', 'Warehouse', 'Salesperson', 'Technician', 'Marketer'],
    routes: [
      route('/products', <Page.Products />),
      route('/mobile-phones', gated('mobile_phones', <Page.MobilePhones />)),
    ],
  },
  {
    id: 'sales-invoices-installments',
    label: 'Sales, invoices, and installments',
    allowedRoles: ['Admin', 'Manager', 'Salesperson'],
    routes: [
      route('/sales', gated('cash_sales', <Page.SalesHub />)),
      route('/sales/cash', gated('cash_sales', <Page.SalesCartPage />)),
      route('/sales/expenses', <Page.ExpensesPage />),
      route('/cart-sale', gated('cash_sales', <Page.SalesCartPage />)),
      route('/installment-sales', gated('installments', <Page.InstallmentSalesPage />)),
      route('/installment-sales/new', gated('installments', <Page.AddInstallmentSalePage />)),
      route('/installment-sales/:id', gated('installments', <Page.InstallmentSaleDetailPage />)),
      route('/invoices', gated('cash_sales', <Page.Invoices />)),
      route('/invoices/:orderId', gated('cash_sales', <Page.InvoiceDetail />)),
    ],
  },
  {
    id: 'crm-partners',
    label: 'Customers and partners',
    allowedRoles: ['Admin', 'Manager', 'Salesperson', 'Marketer'],
    routes: [
      route('/customers', <Page.Customers />),
      route('/customers/:id', <Page.CustomerDetailPage />),
      route('/partners', <Page.Partners />),
      route('/partners/:id', <Page.PartnerDetail />),
    ],
  },
  {
    id: 'repairs-services',
    label: 'Repairs and services',
    allowedRoles: ['Admin', 'Manager', 'Technician'],
    routes: [
      route('/repairs', gated('repairs_services', <Page.Repairs />)),
      route('/repairs/new', gated('repairs_services', <Page.AddRepair />)),
      route('/repairs/:id', gated('repairs_services', <Page.RepairDetail />)),
      route('/repairs/:id/receipt', gated('repairs_services', <Page.RepairReceipt />)),
      route('/services', gated('repairs_services', <Page.Services />)),
    ],
  },
  {
    id: 'warehouse-tools',
    label: 'Warehouse tools',
    allowedRoles: ['Admin', 'Manager', 'Warehouse'],
    routes: [
      route('/tools/labelprint', gated('purchases_stock_counts', <Page.LabelPrint />)),
      route('/purchases', gated('purchases_stock_counts', <Navigate to="/products" replace />)),
      route('/stock-counts', gated('purchases_stock_counts', <Page.StockCounts />)),
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    allowedRoles: reportsAllowedRoles,
    routes: [
      route('/expenses', <Page.ExpensesPage />),
    ],
  },
  {
    id: 'audit-log',
    label: 'Audit log',
    allowedRoles: ['Admin', 'Manager'],
    routes: [
      route('/audit-log', gated('audit_log', <Page.AuditLogPage />)),
    ],
  },
  {
    id: 'admin-settings',
    label: 'Admin settings and messaging',
    allowedRoles: ['Admin'],
    routes: [
      route('/notifications', gated('notifications_outbox', <Page.NotificationsPage />)),
      route('/outbox', gated('notifications_outbox', <Page.OutboxPage />)),
      route('/settings', <Page.Settings />),
      route('/settings/style', <Page.StyleSettings />),
      route('/settings/store-ownership', <Page.StoreOwnershipPage />),
    ],
  },
];

export const reportsLayoutRoute = route(
  '/reports',
  gated('advanced_reports', <Page.ReportsLayout />),
);

export const mainLayoutCatchAllRoute = route('*', <Page.NotFound />);
export const rootCatchAllRoute = route('*', <Page.NotFound />);
