import React from 'react';

// Central lazy-page registry for the app route manifest.
// Keep this file import-only: route policy belongs in routeManifest.tsx.
export const Dashboard = React.lazy(() => import('../../pages/Dashboard'));
export const SearchResults = React.lazy(() => import('../../pages/SearchResults'));
export const LoginPage = React.lazy(() => import('../../pages/Login'));
export const InstallApp = React.lazy(() => import('../../pages/InstallApp'));
export const ProfilePage = React.lazy(() => import('../../pages/ProfilePage'));

export const Products = React.lazy(() => import('../../pages/Products'));
export const MobilePhones = React.lazy(() => import('../../pages/MobilePhones'));

export const SalesCartPage = React.lazy(() => import('../../pages/SalesCartPage'));
export const SalesHub = React.lazy(() => import('../../pages/SalesHub'));

export const InstallmentSalesPage = React.lazy(() => import('../../pages/InstallmentSalesPage'));
export const AddInstallmentSalePage = React.lazy(() => import('../../pages/AddInstallmentSalePage'));
export const InstallmentSaleDetailPage = React.lazy(() => import('../../pages/InstallmentSaleDetailPage'));

export const Customers = React.lazy(() => import('../../pages/Customers'));
export const CustomerDetailPage = React.lazy(() => import('../../pages/CustomerDetail'));

export const Partners = React.lazy(() => import('../../pages/Partners'));
export const PartnerDetail = React.lazy(() => import('../../pages/PartnerDetail'));

export const Repairs = React.lazy(() => import('../../pages/Repairs'));
export const AddRepair = React.lazy(() => import('../../pages/AddRepair'));
export const RepairDetail = React.lazy(() => import('../../pages/RepairDetail'));
export const RepairReceipt = React.lazy(() => import('../../pages/RepairReceipt'));

export const Services = React.lazy(() => import('../../pages/Services'));

export const Reports = React.lazy(() => import('../../pages/Reports'));
export const ReportsLayout = React.lazy(() => import('../../pages/ReportsLayout'));
export const PrintLayout = React.lazy(() => import('../../pages/PrintLayout'));
export const PrintReportShell = React.lazy(() => import('../../pages/PrintReportShell'));
export const AnalyticsDashboard = React.lazy(() => import('../../pages/reports/AnalyticsDashboard'));
export const ProductProfitReal = React.lazy(() => import('../../pages/reports/ProductProfitReal'));
export const ExpensesPage = React.lazy(() => import('../../pages/Expenses'));
export const SalesReport = React.lazy(() => import('../../pages/reports/SalesReport'));
export const DebtorsReport = React.lazy(() => import('../../pages/reports/DebtorsReport'));
export const CreditorsReport = React.lazy(() => import('../../pages/reports/CreditorsReport'));
export const TopCustomersReport = React.lazy(() => import('../../pages/reports/TopCustomersReport'));
export const TopSuppliersReport = React.lazy(() => import('../../pages/reports/TopSuppliersReport'));
export const AnalysisHub = React.lazy(() => import('../../pages/reports/AnalysisHub'));
export const ProfitabilityReport = React.lazy(() => import('../../pages/reports/ProfitabilityReport'));
export const InventoryAnalysisReport = React.lazy(() => import('../../pages/reports/InventoryAnalysisReport'));
export const PurchaseSuggestionReport = React.lazy(() => import('../../pages/reports/PurchaseSuggestionReport'));
export const PhoneSalesReport = React.lazy(() => import('../../pages/reports/PhoneSalesReport'));
export const PhoneInstallmentSalesReport = React.lazy(() => import('../../pages/reports/PhoneInstallmentSalesReport'));
export const CompareSales = React.lazy(() => import('../../pages/reports/CompareSales'));
export const FinancialOverview = React.lazy(() => import('../../pages/reports/FinancialOverview'));
export const RealizedProfitReport = React.lazy(() => import('../../pages/reports/RealizedProfitReport'));
export const InstallmentsCalendar = React.lazy(() => import('../../pages/reports/InstallmentsCalendar'));
export const ProductSalesReport = React.lazy(() => import('../../pages/reports/ProductSalesReport'));
export const PartnerPerformanceReport = React.lazy(() => import('../../pages/reports/PartnerPerformanceReport'));
export const FollowupsReport = React.lazy(() => import('../../pages/reports/FollowupsReport'));
export const CollectionFollowupCenter = React.lazy(() => import('../../pages/reports/CollectionFollowupCenter'));
export const MobileSalesAnalytics = React.lazy(() => import('../../pages/reports/MobileSalesAnalytics'));
export const SmartInsightCenter = React.lazy(() => import('../../pages/reports/SmartInsightCenter'));
export const InventoryTurnoverReport = React.lazy(() => import('../../pages/reports/InventoryTurnoverReport'));
export const DeadStockReport = React.lazy(() => import('../../pages/reports/DeadStockReport'));
export const AbcAnalysisReport = React.lazy(() => import('../../pages/reports/AbcAnalysisReport'));
export const AgingReceivablesReport = React.lazy(() => import('../../pages/reports/AgingReceivablesReport'));
export const CashflowReport = React.lazy(() => import('../../pages/reports/CashflowReport'));
export const FinancialAuditReport = React.lazy(() => import('../../pages/reports/FinancialAuditReport'));
export const ManagerCreditApprovalsReport = React.lazy(() => import('../../pages/reports/ManagerCreditApprovalsReport'));
export const SalesRiskDecisionsReport = React.lazy(() => import('../../pages/reports/SalesRiskDecisionsReport'));

export const Invoices = React.lazy(() => import('../../pages/Invoices'));
export const InvoiceDetail = React.lazy(() => import('../../pages/InvoiceDetail'));

export const LabelPrint = React.lazy(() => import('../../pages/tools/LabelPrint'));
export const StockCounts = React.lazy(() => import('../../pages/StockCounts'));

export const Settings = React.lazy(() => import('../../pages/Settings'));
export const StyleSettings = React.lazy(() => import('../../pages/settings/StyleSettings'));
export const StoreOwnershipPage = React.lazy(() => import('../../pages/settings/StoreOwnershipPage'));

export const NotFound = React.lazy(() => import('../../pages/NotFound'));
export const Forbidden = React.lazy(() => import('../../pages/Forbidden'));
export const NotificationsPage = React.lazy(() => import('../../pages/Notifications'));
export const OutboxPage = React.lazy(() => import('../../pages/Outbox'));

export const RfmReport = React.lazy(() => import('../../pages/reports/RfmReport'));
export const CohortReport = React.lazy(() => import('../../pages/reports/CohortReport'));
export const AuditLogPage = React.lazy(() => import('../../pages/AuditLog'));
