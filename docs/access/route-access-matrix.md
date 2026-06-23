# Route Access Matrix

This matrix is the Phase 14 audit artifact for route access policy. It documents effective route access without changing runtime behavior.

## Legend

- `public`: usable without authentication.
- `authenticated`: requires login, no role restriction.
- `role-protected`: requires login and one of the listed roles.
- `featureFlags`: route-level feature gates; report children inherit `advanced_reports` from the reports shell.

## Summary

- Total route records: **77**
- Public records: **3**
- Authenticated records: **7**
- Role-protected records: **67**

## Matrix

| Route Key | Effective Path | Access | Roles | Feature Flags | Notes |
|---|---|---|---|---|---|
| `public:login` | `/login` | `public` | — | — | — |
| `public:install` | `/install` | `public` | — | — | — |
| `print:reports` | `/print/reports/*` | `authenticated` | — | — | Nested below /print and ProtectedRoute. |
| `main:dashboard` | `/` | `authenticated` | — | — | — |
| `main:profile` | `/profile` | `authenticated` | — | — | — |
| `main:search-relative` | `/search` | `authenticated` | — | — | — |
| `main:search-absolute` | `/search` | `authenticated` | — | — | — |
| `main:forbidden` | `/403` | `authenticated` | — | — | — |
| `inventory-sales-access:products` | `/products` | `role-protected` | Admin, Manager, Warehouse, Salesperson, Technician, Marketer | — | — |
| `inventory-sales-access:mobile-phones` | `/mobile-phones` | `role-protected` | Admin, Manager, Warehouse, Salesperson, Technician, Marketer | mobile_phones | — |
| `sales-invoices-installments:sales-hub` | `/sales` | `role-protected` | Admin, Manager, Salesperson | cash_sales | — |
| `sales-invoices-installments:sales-cash` | `/sales/cash` | `role-protected` | Admin, Manager, Salesperson | cash_sales | — |
| `sales-invoices-installments:sales-expenses` | `/sales/expenses` | `role-protected` | Admin, Manager, Salesperson | — | — |
| `sales-invoices-installments:cart-sale` | `/cart-sale` | `role-protected` | Admin, Manager, Salesperson | cash_sales | — |
| `sales-invoices-installments:installment-sales` | `/installment-sales` | `role-protected` | Admin, Manager, Salesperson | installments | — |
| `sales-invoices-installments:installment-sales-new` | `/installment-sales/new` | `role-protected` | Admin, Manager, Salesperson | installments | — |
| `sales-invoices-installments:installment-sale-detail` | `/installment-sales/:id` | `role-protected` | Admin, Manager, Salesperson | installments | — |
| `sales-invoices-installments:invoices` | `/invoices` | `role-protected` | Admin, Manager, Salesperson | cash_sales | — |
| `sales-invoices-installments:invoice-detail` | `/invoices/:orderId` | `role-protected` | Admin, Manager, Salesperson | cash_sales | — |
| `crm-partners:customers` | `/customers` | `role-protected` | Admin, Manager, Salesperson, Marketer | — | — |
| `crm-partners:customer-detail` | `/customers/:id` | `role-protected` | Admin, Manager, Salesperson, Marketer | — | — |
| `crm-partners:partners` | `/partners` | `role-protected` | Admin, Manager, Salesperson, Marketer | — | — |
| `crm-partners:partner-detail` | `/partners/:id` | `role-protected` | Admin, Manager, Salesperson, Marketer | — | — |
| `repairs-services:repairs` | `/repairs` | `role-protected` | Admin, Manager, Technician | repairs_services | — |
| `repairs-services:repair-new` | `/repairs/new` | `role-protected` | Admin, Manager, Technician | repairs_services | — |
| `repairs-services:repair-detail` | `/repairs/:id` | `role-protected` | Admin, Manager, Technician | repairs_services | — |
| `repairs-services:repair-receipt` | `/repairs/:id/receipt` | `role-protected` | Admin, Manager, Technician | repairs_services | — |
| `repairs-services:services` | `/services` | `role-protected` | Admin, Manager, Technician | repairs_services | — |
| `warehouse-tools:labelprint` | `/tools/labelprint` | `role-protected` | Admin, Manager, Warehouse | purchases_stock_counts | — |
| `warehouse-tools:purchases-redirect` | `/purchases` | `role-protected` | Admin, Manager, Warehouse | purchases_stock_counts | Redirects to /products when allowed. |
| `warehouse-tools:stock-counts` | `/stock-counts` | `role-protected` | Admin, Manager, Warehouse | purchases_stock_counts | — |
| `reports:expenses` | `/expenses` | `role-protected` | Admin, Manager, Salesperson, Marketer | — | — |
| `audit-log:audit-log` | `/audit-log` | `role-protected` | Admin, Manager | audit_log | — |
| `admin-settings:notifications` | `/notifications` | `role-protected` | Admin | notifications_outbox | — |
| `admin-settings:outbox` | `/outbox` | `role-protected` | Admin | notifications_outbox | — |
| `admin-settings:settings` | `/settings` | `role-protected` | Admin | — | — |
| `admin-settings:settings-style` | `/settings/style` | `role-protected` | Admin | — | — |
| `admin-settings:store-ownership` | `/settings/store-ownership` | `role-protected` | Admin | — | — |
| `reports-layout:shell` | `/reports` | `role-protected` | Admin, Manager, Salesperson, Marketer | advanced_reports | Parent reports shell; child routes inherit this feature gate. |
| `reports-layout:index` | `/reports` | `role-protected` | Admin, Manager, Salesperson, Marketer | advanced_reports | Index route inside /reports. |
| `reports-layout:sales-summary` | `/reports/sales-summary` | `role-protected` | Admin, Manager, Salesperson, Marketer | advanced_reports | — |
| `reports-layout:sales` | `/reports/sales` | `role-protected` | Admin, Manager, Salesperson, Marketer | advanced_reports | — |
| `reports-layout:product-sales` | `/reports/product-sales` | `role-protected` | Admin, Manager, Salesperson, Marketer | advanced_reports | — |
| `reports-layout:partners-performance` | `/reports/partners-performance` | `role-protected` | Admin, Manager, Salesperson, Marketer | advanced_reports | — |
| `reports-layout:followups` | `/reports/followups` | `role-protected` | Admin, Manager, Salesperson, Marketer | advanced_reports | — |
| `reports-layout:collection-center` | `/reports/collection-center` | `role-protected` | Admin, Manager, Salesperson, Marketer | advanced_reports, installments | — |
| `reports-layout:collection-followup` | `/reports/collection-followup` | `role-protected` | Admin, Manager, Salesperson, Marketer | advanced_reports, installments | — |
| `reports-layout:debtors` | `/reports/debtors` | `role-protected` | Admin, Manager, Salesperson, Marketer | advanced_reports | — |
| `reports-layout:creditors` | `/reports/creditors` | `role-protected` | Admin, Manager, Salesperson, Marketer | advanced_reports | — |
| `reports-layout:top-customers` | `/reports/top-customers` | `role-protected` | Admin, Manager, Salesperson, Marketer | advanced_reports | — |
| `reports-layout:top-suppliers` | `/reports/top-suppliers` | `role-protected` | Admin, Manager, Salesperson, Marketer | advanced_reports | — |
| `reports-layout:mobile-sales-analytics` | `/reports/mobile-sales-analytics` | `role-protected` | Admin, Manager, Salesperson, Marketer | advanced_reports, mobile_phones | — |
| `reports-layout:smart-insights` | `/reports/smart-insights` | `role-protected` | Admin, Manager, Salesperson, Marketer | advanced_reports, smart_insights | — |
| `reports-layout:phone-sales` | `/reports/phone-sales` | `role-protected` | Admin, Manager, Salesperson, Marketer | advanced_reports, mobile_phones | — |
| `reports-layout:phone-installment-sales` | `/reports/phone-installment-sales` | `role-protected` | Admin, Manager, Salesperson, Marketer | advanced_reports, mobile_phones | — |
| `reports-layout:periodic-comparison` | `/reports/periodic-comparison` | `role-protected` | Admin, Manager, Salesperson, Marketer | advanced_reports | — |
| `reports-layout:financial-overview` | `/reports/financial-overview` | `role-protected` | Admin, Manager, Salesperson, Marketer | advanced_reports | — |
| `reports-layout:realized-profit` | `/reports/realized-profit` | `role-protected` | Admin, Manager, Salesperson, Marketer | advanced_reports | — |
| `reports-layout:analytics` | `/reports/analytics` | `role-protected` | Admin, Manager, Salesperson, Marketer | advanced_reports | — |
| `reports-layout:product-profit-real` | `/reports/product-profit-real` | `role-protected` | Admin, Manager, Salesperson, Marketer | advanced_reports | — |
| `reports-layout:installments-calendar` | `/reports/installments-calendar` | `role-protected` | Admin, Manager, Salesperson, Marketer | advanced_reports, installments | — |
| `reports-layout:rfm` | `/reports/rfm` | `role-protected` | Admin, Manager, Salesperson, Marketer | advanced_reports | — |
| `reports-layout:cohort` | `/reports/cohort` | `role-protected` | Admin, Manager, Salesperson, Marketer | advanced_reports | — |
| `reports-layout:inventory-turnover` | `/reports/inventory-turnover` | `role-protected` | Admin, Manager, Salesperson, Marketer | advanced_reports | — |
| `reports-layout:dead-stock` | `/reports/dead-stock` | `role-protected` | Admin, Manager, Salesperson, Marketer | advanced_reports | — |
| `reports-layout:abc` | `/reports/abc` | `role-protected` | Admin, Manager, Salesperson, Marketer | advanced_reports | — |
| `reports-layout:aging-receivables` | `/reports/aging-receivables` | `role-protected` | Admin, Manager, Salesperson, Marketer | advanced_reports | — |
| `reports-layout:cashflow` | `/reports/cashflow` | `role-protected` | Admin, Manager, Salesperson, Marketer | advanced_reports | — |
| `reports-layout:financial-audit` | `/reports/financial-audit` | `role-protected` | Admin, Manager, Salesperson, Marketer | advanced_reports | — |
| `reports-layout:manager-credit-approvals` | `/reports/manager-credit-approvals` | `role-protected` | Admin, Manager, Salesperson, Marketer | advanced_reports | — |
| `reports-layout:sales-risk-decisions` | `/reports/sales-risk-decisions` | `role-protected` | Admin, Manager, Salesperson, Marketer | advanced_reports | — |
| `reports-layout:analysis` | `/reports/analysis` | `role-protected` | Admin, Manager, Salesperson, Marketer | advanced_reports, smart_insights | — |
| `reports-layout:analysis-profitability` | `/reports/analysis/profitability` | `role-protected` | Admin, Manager, Salesperson, Marketer | advanced_reports, smart_insights | — |
| `reports-layout:analysis-inventory` | `/reports/analysis/inventory` | `role-protected` | Admin, Manager, Salesperson, Marketer | advanced_reports, smart_insights | — |
| `reports-layout:analysis-suggestions` | `/reports/analysis/suggestions` | `role-protected` | Admin, Manager, Salesperson, Marketer | advanced_reports, smart_insights | — |
| `main:catch-all` | `*` | `authenticated` | — | — | MainLayout catch-all for authenticated app surface. |
| `root:catch-all` | `*` | `public` | — | — | Root-level catch-all outside ProtectedRoute. |
