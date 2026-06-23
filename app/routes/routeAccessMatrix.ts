import type { RoleName } from '../../utils/rbac';

export type RouteAccessKind = 'public' | 'authenticated' | 'role-protected';

export type RouteAccessMatrixEntry = {
  routeKey: string;
  manifestPath: string;
  effectivePath: string;
  section: string;
  access: RouteAccessKind;
  allowedRoles: readonly RoleName[];
  featureFlags: readonly string[];
  notes?: string;
};

export const routeAccessMatrix = [
  { routeKey: 'public:login', manifestPath: '/login', effectivePath: '/login', section: 'public', access: 'public', allowedRoles: [], featureFlags: [] },
  { routeKey: 'public:install', manifestPath: '/install', effectivePath: '/install', section: 'public', access: 'public', allowedRoles: [], featureFlags: [] },
  { routeKey: 'print:reports', manifestPath: 'reports/*', effectivePath: '/print/reports/*', section: 'print', access: 'authenticated', allowedRoles: [], featureFlags: [], notes: 'Nested below /print and ProtectedRoute.' },
  { routeKey: 'main:dashboard', manifestPath: '/', effectivePath: '/', section: 'main', access: 'authenticated', allowedRoles: [], featureFlags: [] },
  { routeKey: 'main:profile', manifestPath: '/profile', effectivePath: '/profile', section: 'main', access: 'authenticated', allowedRoles: [], featureFlags: [] },
  { routeKey: 'main:search-relative', manifestPath: 'search', effectivePath: '/search', section: 'main', access: 'authenticated', allowedRoles: [], featureFlags: [] },
  { routeKey: 'main:search-absolute', manifestPath: '/search', effectivePath: '/search', section: 'main', access: 'authenticated', allowedRoles: [], featureFlags: [] },
  { routeKey: 'main:forbidden', manifestPath: '/403', effectivePath: '/403', section: 'main', access: 'authenticated', allowedRoles: [], featureFlags: [] },
  { routeKey: 'inventory-sales-access:products', manifestPath: '/products', effectivePath: '/products', section: 'inventory-sales-access', access: 'role-protected', allowedRoles: ['Admin', 'Manager', 'Warehouse', 'Salesperson', 'Technician', 'Marketer'], featureFlags: [] },
  { routeKey: 'inventory-sales-access:mobile-phones', manifestPath: '/mobile-phones', effectivePath: '/mobile-phones', section: 'inventory-sales-access', access: 'role-protected', allowedRoles: ['Admin', 'Manager', 'Warehouse', 'Salesperson', 'Technician', 'Marketer'], featureFlags: ['mobile_phones'] },
  { routeKey: 'sales-invoices-installments:sales-hub', manifestPath: '/sales', effectivePath: '/sales', section: 'sales-invoices-installments', access: 'role-protected', allowedRoles: ['Admin', 'Manager', 'Salesperson'], featureFlags: ['cash_sales'] },
  { routeKey: 'sales-invoices-installments:sales-cash', manifestPath: '/sales/cash', effectivePath: '/sales/cash', section: 'sales-invoices-installments', access: 'role-protected', allowedRoles: ['Admin', 'Manager', 'Salesperson'], featureFlags: ['cash_sales'] },
  { routeKey: 'sales-invoices-installments:sales-expenses', manifestPath: '/sales/expenses', effectivePath: '/sales/expenses', section: 'sales-invoices-installments', access: 'role-protected', allowedRoles: ['Admin', 'Manager', 'Salesperson'], featureFlags: [] },
  { routeKey: 'sales-invoices-installments:cart-sale', manifestPath: '/cart-sale', effectivePath: '/cart-sale', section: 'sales-invoices-installments', access: 'role-protected', allowedRoles: ['Admin', 'Manager', 'Salesperson'], featureFlags: ['cash_sales'] },
  { routeKey: 'sales-invoices-installments:installment-sales', manifestPath: '/installment-sales', effectivePath: '/installment-sales', section: 'sales-invoices-installments', access: 'role-protected', allowedRoles: ['Admin', 'Manager', 'Salesperson'], featureFlags: ['installments'] },
  { routeKey: 'sales-invoices-installments:installment-sales-new', manifestPath: '/installment-sales/new', effectivePath: '/installment-sales/new', section: 'sales-invoices-installments', access: 'role-protected', allowedRoles: ['Admin', 'Manager', 'Salesperson'], featureFlags: ['installments'] },
  { routeKey: 'sales-invoices-installments:installment-sale-detail', manifestPath: '/installment-sales/:id', effectivePath: '/installment-sales/:id', section: 'sales-invoices-installments', access: 'role-protected', allowedRoles: ['Admin', 'Manager', 'Salesperson'], featureFlags: ['installments'] },
  { routeKey: 'sales-invoices-installments:invoices', manifestPath: '/invoices', effectivePath: '/invoices', section: 'sales-invoices-installments', access: 'role-protected', allowedRoles: ['Admin', 'Manager', 'Salesperson'], featureFlags: ['cash_sales'] },
  { routeKey: 'sales-invoices-installments:invoice-detail', manifestPath: '/invoices/:orderId', effectivePath: '/invoices/:orderId', section: 'sales-invoices-installments', access: 'role-protected', allowedRoles: ['Admin', 'Manager', 'Salesperson'], featureFlags: ['cash_sales'] },
  { routeKey: 'crm-partners:customers', manifestPath: '/customers', effectivePath: '/customers', section: 'crm-partners', access: 'role-protected', allowedRoles: ['Admin', 'Manager', 'Salesperson', 'Marketer'], featureFlags: [] },
  { routeKey: 'crm-partners:customer-detail', manifestPath: '/customers/:id', effectivePath: '/customers/:id', section: 'crm-partners', access: 'role-protected', allowedRoles: ['Admin', 'Manager', 'Salesperson', 'Marketer'], featureFlags: [] },
  { routeKey: 'crm-partners:partners', manifestPath: '/partners', effectivePath: '/partners', section: 'crm-partners', access: 'role-protected', allowedRoles: ['Admin', 'Manager', 'Salesperson', 'Marketer'], featureFlags: [] },
  { routeKey: 'crm-partners:partner-detail', manifestPath: '/partners/:id', effectivePath: '/partners/:id', section: 'crm-partners', access: 'role-protected', allowedRoles: ['Admin', 'Manager', 'Salesperson', 'Marketer'], featureFlags: [] },
  { routeKey: 'repairs-services:repairs', manifestPath: '/repairs', effectivePath: '/repairs', section: 'repairs-services', access: 'role-protected', allowedRoles: ['Admin', 'Manager', 'Technician'], featureFlags: ['repairs_services'] },
  { routeKey: 'repairs-services:repair-new', manifestPath: '/repairs/new', effectivePath: '/repairs/new', section: 'repairs-services', access: 'role-protected', allowedRoles: ['Admin', 'Manager', 'Technician'], featureFlags: ['repairs_services'] },
  { routeKey: 'repairs-services:repair-detail', manifestPath: '/repairs/:id', effectivePath: '/repairs/:id', section: 'repairs-services', access: 'role-protected', allowedRoles: ['Admin', 'Manager', 'Technician'], featureFlags: ['repairs_services'] },
  { routeKey: 'repairs-services:repair-receipt', manifestPath: '/repairs/:id/receipt', effectivePath: '/repairs/:id/receipt', section: 'repairs-services', access: 'role-protected', allowedRoles: ['Admin', 'Manager', 'Technician'], featureFlags: ['repairs_services'] },
  { routeKey: 'repairs-services:services', manifestPath: '/services', effectivePath: '/services', section: 'repairs-services', access: 'role-protected', allowedRoles: ['Admin', 'Manager', 'Technician'], featureFlags: ['repairs_services'] },
  { routeKey: 'warehouse-tools:labelprint', manifestPath: '/tools/labelprint', effectivePath: '/tools/labelprint', section: 'warehouse-tools', access: 'role-protected', allowedRoles: ['Admin', 'Manager', 'Warehouse'], featureFlags: ['purchases_stock_counts'] },
  { routeKey: 'warehouse-tools:purchases-redirect', manifestPath: '/purchases', effectivePath: '/purchases', section: 'warehouse-tools', access: 'role-protected', allowedRoles: ['Admin', 'Manager', 'Warehouse'], featureFlags: ['purchases_stock_counts'], notes: 'Redirects to /products when allowed.' },
  { routeKey: 'warehouse-tools:stock-counts', manifestPath: '/stock-counts', effectivePath: '/stock-counts', section: 'warehouse-tools', access: 'role-protected', allowedRoles: ['Admin', 'Manager', 'Warehouse'], featureFlags: ['purchases_stock_counts'] },
  { routeKey: 'reports:expenses', manifestPath: '/expenses', effectivePath: '/expenses', section: 'reports', access: 'role-protected', allowedRoles: ['Admin', 'Manager', 'Salesperson', 'Marketer'], featureFlags: [] },
  { routeKey: 'audit-log:audit-log', manifestPath: '/audit-log', effectivePath: '/audit-log', section: 'audit-log', access: 'role-protected', allowedRoles: ['Admin', 'Manager'], featureFlags: ['audit_log'] },
  { routeKey: 'admin-settings:notifications', manifestPath: '/notifications', effectivePath: '/notifications', section: 'admin-settings', access: 'role-protected', allowedRoles: ['Admin'], featureFlags: ['notifications_outbox'] },
  { routeKey: 'admin-settings:outbox', manifestPath: '/outbox', effectivePath: '/outbox', section: 'admin-settings', access: 'role-protected', allowedRoles: ['Admin'], featureFlags: ['notifications_outbox'] },
  { routeKey: 'admin-settings:settings', manifestPath: '/settings', effectivePath: '/settings', section: 'admin-settings', access: 'role-protected', allowedRoles: ['Admin'], featureFlags: [] },
  { routeKey: 'admin-settings:settings-style', manifestPath: '/settings/style', effectivePath: '/settings/style', section: 'admin-settings', access: 'role-protected', allowedRoles: ['Admin'], featureFlags: [] },
  { routeKey: 'admin-settings:store-ownership', manifestPath: '/settings/store-ownership', effectivePath: '/settings/store-ownership', section: 'admin-settings', access: 'role-protected', allowedRoles: ['Admin'], featureFlags: [] },
  { routeKey: 'reports-layout:shell', manifestPath: '/reports', effectivePath: '/reports', section: 'reports-layout', access: 'role-protected', allowedRoles: ['Admin', 'Manager', 'Salesperson', 'Marketer'], featureFlags: ['advanced_reports'], notes: 'Parent reports shell; child routes inherit this feature gate.' },
  { routeKey: 'reports-layout:index', manifestPath: '(index)', effectivePath: '/reports', section: 'reports-layout', access: 'role-protected', allowedRoles: ['Admin', 'Manager', 'Salesperson', 'Marketer'], featureFlags: ['advanced_reports'], notes: 'Index route inside /reports.' },
  { routeKey: 'reports-layout:sales-summary', manifestPath: 'sales-summary', effectivePath: '/reports/sales-summary', section: 'reports-layout', access: 'role-protected', allowedRoles: ['Admin', 'Manager', 'Salesperson', 'Marketer'], featureFlags: ['advanced_reports'] },
  { routeKey: 'reports-layout:sales', manifestPath: 'sales', effectivePath: '/reports/sales', section: 'reports-layout', access: 'role-protected', allowedRoles: ['Admin', 'Manager', 'Salesperson', 'Marketer'], featureFlags: ['advanced_reports'] },
  { routeKey: 'reports-layout:product-sales', manifestPath: 'product-sales', effectivePath: '/reports/product-sales', section: 'reports-layout', access: 'role-protected', allowedRoles: ['Admin', 'Manager', 'Salesperson', 'Marketer'], featureFlags: ['advanced_reports'] },
  { routeKey: 'reports-layout:partners-performance', manifestPath: 'partners-performance', effectivePath: '/reports/partners-performance', section: 'reports-layout', access: 'role-protected', allowedRoles: ['Admin', 'Manager', 'Salesperson', 'Marketer'], featureFlags: ['advanced_reports'] },
  { routeKey: 'reports-layout:followups', manifestPath: 'followups', effectivePath: '/reports/followups', section: 'reports-layout', access: 'role-protected', allowedRoles: ['Admin', 'Manager', 'Salesperson', 'Marketer'], featureFlags: ['advanced_reports'] },
  { routeKey: 'reports-layout:collection-center', manifestPath: 'collection-center', effectivePath: '/reports/collection-center', section: 'reports-layout', access: 'role-protected', allowedRoles: ['Admin', 'Manager', 'Salesperson', 'Marketer'], featureFlags: ['advanced_reports', 'installments'] },
  { routeKey: 'reports-layout:collection-followup', manifestPath: 'collection-followup', effectivePath: '/reports/collection-followup', section: 'reports-layout', access: 'role-protected', allowedRoles: ['Admin', 'Manager', 'Salesperson', 'Marketer'], featureFlags: ['advanced_reports', 'installments'] },
  { routeKey: 'reports-layout:debtors', manifestPath: 'debtors', effectivePath: '/reports/debtors', section: 'reports-layout', access: 'role-protected', allowedRoles: ['Admin', 'Manager', 'Salesperson', 'Marketer'], featureFlags: ['advanced_reports'] },
  { routeKey: 'reports-layout:creditors', manifestPath: 'creditors', effectivePath: '/reports/creditors', section: 'reports-layout', access: 'role-protected', allowedRoles: ['Admin', 'Manager', 'Salesperson', 'Marketer'], featureFlags: ['advanced_reports'] },
  { routeKey: 'reports-layout:top-customers', manifestPath: 'top-customers', effectivePath: '/reports/top-customers', section: 'reports-layout', access: 'role-protected', allowedRoles: ['Admin', 'Manager', 'Salesperson', 'Marketer'], featureFlags: ['advanced_reports'] },
  { routeKey: 'reports-layout:top-suppliers', manifestPath: 'top-suppliers', effectivePath: '/reports/top-suppliers', section: 'reports-layout', access: 'role-protected', allowedRoles: ['Admin', 'Manager', 'Salesperson', 'Marketer'], featureFlags: ['advanced_reports'] },
  { routeKey: 'reports-layout:mobile-sales-analytics', manifestPath: 'mobile-sales-analytics', effectivePath: '/reports/mobile-sales-analytics', section: 'reports-layout', access: 'role-protected', allowedRoles: ['Admin', 'Manager', 'Salesperson', 'Marketer'], featureFlags: ['advanced_reports', 'mobile_phones'] },
  { routeKey: 'reports-layout:smart-insights', manifestPath: 'smart-insights', effectivePath: '/reports/smart-insights', section: 'reports-layout', access: 'role-protected', allowedRoles: ['Admin', 'Manager', 'Salesperson', 'Marketer'], featureFlags: ['advanced_reports', 'smart_insights'] },
  { routeKey: 'reports-layout:phone-sales', manifestPath: 'phone-sales', effectivePath: '/reports/phone-sales', section: 'reports-layout', access: 'role-protected', allowedRoles: ['Admin', 'Manager', 'Salesperson', 'Marketer'], featureFlags: ['advanced_reports', 'mobile_phones'] },
  { routeKey: 'reports-layout:phone-installment-sales', manifestPath: 'phone-installment-sales', effectivePath: '/reports/phone-installment-sales', section: 'reports-layout', access: 'role-protected', allowedRoles: ['Admin', 'Manager', 'Salesperson', 'Marketer'], featureFlags: ['advanced_reports', 'mobile_phones'] },
  { routeKey: 'reports-layout:periodic-comparison', manifestPath: 'periodic-comparison', effectivePath: '/reports/periodic-comparison', section: 'reports-layout', access: 'role-protected', allowedRoles: ['Admin', 'Manager', 'Salesperson', 'Marketer'], featureFlags: ['advanced_reports'] },
  { routeKey: 'reports-layout:financial-overview', manifestPath: 'financial-overview', effectivePath: '/reports/financial-overview', section: 'reports-layout', access: 'role-protected', allowedRoles: ['Admin', 'Manager', 'Salesperson', 'Marketer'], featureFlags: ['advanced_reports'] },
  { routeKey: 'reports-layout:realized-profit', manifestPath: 'realized-profit', effectivePath: '/reports/realized-profit', section: 'reports-layout', access: 'role-protected', allowedRoles: ['Admin', 'Manager', 'Salesperson', 'Marketer'], featureFlags: ['advanced_reports'] },
  { routeKey: 'reports-layout:analytics', manifestPath: 'analytics', effectivePath: '/reports/analytics', section: 'reports-layout', access: 'role-protected', allowedRoles: ['Admin', 'Manager', 'Salesperson', 'Marketer'], featureFlags: ['advanced_reports'] },
  { routeKey: 'reports-layout:product-profit-real', manifestPath: 'product-profit-real', effectivePath: '/reports/product-profit-real', section: 'reports-layout', access: 'role-protected', allowedRoles: ['Admin', 'Manager', 'Salesperson', 'Marketer'], featureFlags: ['advanced_reports'] },
  { routeKey: 'reports-layout:installments-calendar', manifestPath: 'installments-calendar', effectivePath: '/reports/installments-calendar', section: 'reports-layout', access: 'role-protected', allowedRoles: ['Admin', 'Manager', 'Salesperson', 'Marketer'], featureFlags: ['advanced_reports', 'installments'] },
  { routeKey: 'reports-layout:rfm', manifestPath: 'rfm', effectivePath: '/reports/rfm', section: 'reports-layout', access: 'role-protected', allowedRoles: ['Admin', 'Manager', 'Salesperson', 'Marketer'], featureFlags: ['advanced_reports'] },
  { routeKey: 'reports-layout:cohort', manifestPath: 'cohort', effectivePath: '/reports/cohort', section: 'reports-layout', access: 'role-protected', allowedRoles: ['Admin', 'Manager', 'Salesperson', 'Marketer'], featureFlags: ['advanced_reports'] },
  { routeKey: 'reports-layout:inventory-turnover', manifestPath: 'inventory-turnover', effectivePath: '/reports/inventory-turnover', section: 'reports-layout', access: 'role-protected', allowedRoles: ['Admin', 'Manager', 'Salesperson', 'Marketer'], featureFlags: ['advanced_reports'] },
  { routeKey: 'reports-layout:dead-stock', manifestPath: 'dead-stock', effectivePath: '/reports/dead-stock', section: 'reports-layout', access: 'role-protected', allowedRoles: ['Admin', 'Manager', 'Salesperson', 'Marketer'], featureFlags: ['advanced_reports'] },
  { routeKey: 'reports-layout:abc', manifestPath: 'abc', effectivePath: '/reports/abc', section: 'reports-layout', access: 'role-protected', allowedRoles: ['Admin', 'Manager', 'Salesperson', 'Marketer'], featureFlags: ['advanced_reports'] },
  { routeKey: 'reports-layout:aging-receivables', manifestPath: 'aging-receivables', effectivePath: '/reports/aging-receivables', section: 'reports-layout', access: 'role-protected', allowedRoles: ['Admin', 'Manager', 'Salesperson', 'Marketer'], featureFlags: ['advanced_reports'] },
  { routeKey: 'reports-layout:cashflow', manifestPath: 'cashflow', effectivePath: '/reports/cashflow', section: 'reports-layout', access: 'role-protected', allowedRoles: ['Admin', 'Manager', 'Salesperson', 'Marketer'], featureFlags: ['advanced_reports'] },
  { routeKey: 'reports-layout:financial-audit', manifestPath: 'financial-audit', effectivePath: '/reports/financial-audit', section: 'reports-layout', access: 'role-protected', allowedRoles: ['Admin', 'Manager', 'Salesperson', 'Marketer'], featureFlags: ['advanced_reports'] },
  { routeKey: 'reports-layout:manager-credit-approvals', manifestPath: 'manager-credit-approvals', effectivePath: '/reports/manager-credit-approvals', section: 'reports-layout', access: 'role-protected', allowedRoles: ['Admin', 'Manager', 'Salesperson', 'Marketer'], featureFlags: ['advanced_reports'] },
  { routeKey: 'reports-layout:sales-risk-decisions', manifestPath: 'sales-risk-decisions', effectivePath: '/reports/sales-risk-decisions', section: 'reports-layout', access: 'role-protected', allowedRoles: ['Admin', 'Manager', 'Salesperson', 'Marketer'], featureFlags: ['advanced_reports'] },
  { routeKey: 'reports-layout:analysis', manifestPath: 'analysis', effectivePath: '/reports/analysis', section: 'reports-layout', access: 'role-protected', allowedRoles: ['Admin', 'Manager', 'Salesperson', 'Marketer'], featureFlags: ['advanced_reports', 'smart_insights'] },
  { routeKey: 'reports-layout:analysis-profitability', manifestPath: 'analysis/profitability', effectivePath: '/reports/analysis/profitability', section: 'reports-layout', access: 'role-protected', allowedRoles: ['Admin', 'Manager', 'Salesperson', 'Marketer'], featureFlags: ['advanced_reports', 'smart_insights'] },
  { routeKey: 'reports-layout:analysis-inventory', manifestPath: 'analysis/inventory', effectivePath: '/reports/analysis/inventory', section: 'reports-layout', access: 'role-protected', allowedRoles: ['Admin', 'Manager', 'Salesperson', 'Marketer'], featureFlags: ['advanced_reports', 'smart_insights'] },
  { routeKey: 'reports-layout:analysis-suggestions', manifestPath: 'analysis/suggestions', effectivePath: '/reports/analysis/suggestions', section: 'reports-layout', access: 'role-protected', allowedRoles: ['Admin', 'Manager', 'Salesperson', 'Marketer'], featureFlags: ['advanced_reports', 'smart_insights'] },
  { routeKey: 'main:catch-all', manifestPath: '*', effectivePath: '*', section: 'main', access: 'authenticated', allowedRoles: [], featureFlags: [], notes: 'MainLayout catch-all for authenticated app surface.' },
  { routeKey: 'root:catch-all', manifestPath: '*', effectivePath: '*', section: 'root', access: 'public', allowedRoles: [], featureFlags: [], notes: 'Root-level catch-all outside ProtectedRoute.' },
] as const satisfies readonly RouteAccessMatrixEntry[];

export const routeAccessMatrixByKey = Object.fromEntries(
  routeAccessMatrix.map((entry) => [entry.routeKey, entry]),
) as Readonly<Record<string, RouteAccessMatrixEntry>>;

export const ROUTE_ACCESS_MATRIX_COUNT = routeAccessMatrix.length;

export const getRouteAccessEntry = (routeKey: string): RouteAccessMatrixEntry | undefined => {
  return routeAccessMatrixByKey[routeKey];
};
