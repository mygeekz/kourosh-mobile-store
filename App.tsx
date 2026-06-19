// App.tsx
import React, { Suspense } from 'react';
import { Toaster, resolveValue, toast as hotToast } from 'react-hot-toast';
import { Routes, Route, Navigate } from 'react-router-dom';

import MainLayout from './components/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
import RoleProtectedRoute from './components/RoleProtectedRoute';
import PublicRoute from './components/PublicRoute';

import { StyleProvider } from './contexts/StyleContext';
import AppLoadingScreen from './components/AppLoadingScreen';
import PwaInstallOverlay from './components/PwaInstallOverlay';
import GlobalButtonEffects from './components/GlobalButtonEffects';
import Notification from './components/Notification';
import type { NotificationMessage } from './types';
import { applyDocumentBranding, readStoredBranding } from './utils/branding';
import { useFeatureFlags } from './contexts/FeatureFlagsContext';

// صفحات را Lazy می‌کنیم تا لود اولیه سبک شود
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const SearchResults = React.lazy(() => import('./pages/SearchResults'));
const LoginPage = React.lazy(() => import('./pages/Login'));
const InstallApp = React.lazy(() => import('./pages/InstallApp'));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage'));

const Products = React.lazy(() => import('./pages/Products'));
const MobilePhones = React.lazy(() => import('./pages/MobilePhones'));

const SalesCartPage = React.lazy(() => import('./pages/SalesCartPage'));
const SalesHub = React.lazy(() => import('./pages/SalesHub'));

const InstallmentSalesPage = React.lazy(() => import('./pages/InstallmentSalesPage'));
const AddInstallmentSalePage = React.lazy(() => import('./pages/AddInstallmentSalePage'));
const InstallmentSaleDetailPage = React.lazy(() => import('./pages/InstallmentSaleDetailPage'));

const Customers = React.lazy(() => import('./pages/Customers'));
const CustomerDetailPage = React.lazy(() => import('./pages/CustomerDetail'));

const Partners = React.lazy(() => import('./pages/Partners'));
const PartnerDetail = React.lazy(() => import('./pages/PartnerDetail'));

const Repairs = React.lazy(() => import('./pages/Repairs'));
const AddRepair = React.lazy(() => import('./pages/AddRepair'));
const RepairDetail = React.lazy(() => import('./pages/RepairDetail'));
const RepairReceipt = React.lazy(() => import('./pages/RepairReceipt'));

const Services = React.lazy(() => import('./pages/Services'));

const Reports = React.lazy(() => import('./pages/Reports'));
const ReportsLayout = React.lazy(() => import('./pages/ReportsLayout'));
const PrintLayout = React.lazy(() => import('./pages/PrintLayout'));
const PrintReportShell = React.lazy(() => import('./pages/PrintReportShell'));
const AnalyticsDashboard = React.lazy(() => import('./pages/reports/AnalyticsDashboard'));
const ProductProfitReal = React.lazy(() => import('./pages/reports/ProductProfitReal'));
const ExpensesPage = React.lazy(() => import('./pages/Expenses'));
const SalesReport = React.lazy(() => import('./pages/reports/SalesReport'));
const DebtorsReport = React.lazy(() => import('./pages/reports/DebtorsReport'));
const CreditorsReport = React.lazy(() => import('./pages/reports/CreditorsReport'));
const TopCustomersReport = React.lazy(() => import('./pages/reports/TopCustomersReport'));
const TopSuppliersReport = React.lazy(() => import('./pages/reports/TopSuppliersReport'));
const AnalysisHub = React.lazy(() => import('./pages/reports/AnalysisHub'));
const ProfitabilityReport = React.lazy(() => import('./pages/reports/ProfitabilityReport'));
const InventoryAnalysisReport = React.lazy(() => import('./pages/reports/InventoryAnalysisReport'));
const PurchaseSuggestionReport = React.lazy(() => import('./pages/reports/PurchaseSuggestionReport'));
const PhoneSalesReport = React.lazy(() => import('./pages/reports/PhoneSalesReport'));
const PhoneInstallmentSalesReport = React.lazy(() => import('./pages/reports/PhoneInstallmentSalesReport'));
const CompareSales = React.lazy(() => import('./pages/reports/CompareSales'));
const FinancialOverview = React.lazy(() => import('./pages/reports/FinancialOverview'));
const RealizedProfitReport = React.lazy(() => import('./pages/reports/RealizedProfitReport'));
const InstallmentsCalendar = React.lazy(() => import('./pages/reports/InstallmentsCalendar'));
const ProductSalesReport = React.lazy(() => import('./pages/reports/ProductSalesReport'));
const PartnerPerformanceReport = React.lazy(() => import('./pages/reports/PartnerPerformanceReport'));
const FollowupsReport = React.lazy(() => import('./pages/reports/FollowupsReport'));
const CollectionFollowupCenter = React.lazy(() => import('./pages/reports/CollectionFollowupCenter'));
const MobileSalesAnalytics = React.lazy(() => import('./pages/reports/MobileSalesAnalytics'));
const SmartInsightCenter = React.lazy(() => import('./pages/reports/SmartInsightCenter'));
const InventoryTurnoverReport = React.lazy(() => import('./pages/reports/InventoryTurnoverReport'));
const DeadStockReport = React.lazy(() => import('./pages/reports/DeadStockReport'));
const AbcAnalysisReport = React.lazy(() => import('./pages/reports/AbcAnalysisReport'));
const AgingReceivablesReport = React.lazy(() => import('./pages/reports/AgingReceivablesReport'));
const CashflowReport = React.lazy(() => import('./pages/reports/CashflowReport'));
const FinancialAuditReport = React.lazy(() => import("./pages/reports/FinancialAuditReport"));
const ManagerCreditApprovalsReport = React.lazy(() => import("./pages/reports/ManagerCreditApprovalsReport"));
const SalesRiskDecisionsReport = React.lazy(() => import("./pages/reports/SalesRiskDecisionsReport"));

const Invoices = React.lazy(() => import('./pages/Invoices'));
const InvoiceDetail = React.lazy(() => import('./pages/InvoiceDetail'));

const LabelPrint = React.lazy(() => import('./pages/tools/LabelPrint'));
const StockCounts = React.lazy(() => import('./pages/StockCounts'));

const Settings = React.lazy(() => import('./pages/Settings'));
const StyleSettings = React.lazy(() => import('./pages/settings/StyleSettings'));
const StoreOwnershipPage = React.lazy(() => import('./pages/settings/StoreOwnershipPage'));

const NotFound = React.lazy(() => import('./pages/NotFound'));
const Forbidden = React.lazy(() => import('./pages/Forbidden'));
const NotificationsPage = React.lazy(() => import('./pages/Notifications'));
const OutboxPage = React.lazy(() => import('./pages/Outbox'));

// Phase 2: advanced report pages and audit log
const RfmReport = React.lazy(() => import('./pages/reports/RfmReport'));
const CohortReport = React.lazy(() => import('./pages/reports/CohortReport'));
const AuditLogPage = React.lazy(() => import('./pages/AuditLog'));

const RouteFallback: React.FC = () => <AppLoadingScreen />;


const BrandingBootstrap: React.FC = () => {
  React.useEffect(() => {
    applyDocumentBranding(readStoredBranding()?.storeName);
  }, []);
  return null;
};

const FeatureGate: React.FC<{ feature: string; children: React.ReactElement }> = ({ feature, children }) => {
  const { isEnabled } = useFeatureFlags();
  return isEnabled(feature) ? children : <Forbidden />;
};


const getToastUi = (type?: string) => {
  switch (type) {
    case 'success':
      return {
        title: 'با موفقیت انجام شد',
        icon: 'fa-circle-check',
        wrap: 'border-emerald-200/90 bg-white/95 text-slate-900 dark:border-emerald-900/40 dark:bg-slate-950/95 dark:text-slate-100',
        iconWrap: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-900/40',
        progress: 'from-emerald-400 via-cyan-400 to-sky-500 dark:from-emerald-300 dark:via-cyan-300 dark:to-sky-300',
      };
    case 'error':
      return {
        title: 'در انجام عملیات مشکلی ایجاد شد',
        icon: 'fa-circle-exclamation',
        wrap: 'border-rose-200/90 bg-white/95 text-slate-900 dark:border-rose-900/40 dark:bg-slate-950/95 dark:text-slate-100',
        iconWrap: 'bg-rose-50 text-rose-600 ring-1 ring-rose-100 dark:bg-rose-950/30 dark:text-rose-300 dark:ring-rose-900/40',
        progress: 'from-rose-400 via-orange-400 to-amber-400 dark:from-rose-300 dark:via-orange-300 dark:to-amber-300',
      };
    case 'loading':
      return {
        title: 'در حال انجام عملیات',
        icon: 'fa-spinner fa-spin',
        wrap: 'border-sky-200/90 bg-white/95 text-slate-900 dark:border-sky-900/40 dark:bg-slate-950/95 dark:text-slate-100',
        iconWrap: 'bg-sky-50 text-sky-600 ring-1 ring-sky-100 dark:bg-sky-950/30 dark:text-sky-300 dark:ring-sky-900/40',
        progress: 'from-sky-400 via-cyan-400 to-blue-500 dark:from-sky-300 dark:via-cyan-300 dark:to-blue-300',
      };
    case 'blank':
    default:
      return {
        title: 'اطلاع‌رسانی سیستم',
        icon: 'fa-bell',
        wrap: 'border-slate-200/90 bg-white/95 text-slate-900 dark:border-slate-800/60 dark:bg-slate-950/95 dark:text-slate-100',
        iconWrap: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800',
        progress: 'from-slate-400 via-sky-400 to-cyan-400 dark:from-slate-300 dark:via-sky-300 dark:to-cyan-300',
      };
  }
};



type GlobalToastPayload = {
  id?: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  message?: string;
  duration?: number;
};

const GlobalAppFeedbackBridge: React.FC = () => {
  const [notification, setNotification] = React.useState<null | ({ id?: string } & NotificationMessage)>(null);

  React.useEffect(() => {
    const handleToast = (event: Event) => {
      const detail = (event as CustomEvent<GlobalToastPayload>).detail || {};
      if (!detail.message) return;
      setNotification({
        id: detail.id,
        type: detail.type || 'info',
        text: detail.message,
        closeMs: detail.duration,
      });
    };

    const handleDismiss = (event: Event) => {
      const detail = (event as CustomEvent<{ id?: string }>).detail || {};
      setNotification((current) => {
        if (!current) return current;
        if (!detail.id || !current.id || current.id === detail.id) return null;
        return current;
      });
    };

    window.addEventListener('kourosh:app-toast', handleToast as EventListener);
    window.addEventListener('kourosh:app-toast-dismiss', handleDismiss as EventListener);
    return () => {
      window.removeEventListener('kourosh:app-toast', handleToast as EventListener);
      window.removeEventListener('kourosh:app-toast-dismiss', handleDismiss as EventListener);
    };
  }, []);

  return notification ? <Notification message={notification} onClose={() => setNotification(null)} /> : null;
};

const App: React.FC = () => {
  return (
    <StyleProvider>
      <BrandingBootstrap />
      {/* 
        نمایش راهنمای نصب PWA روی موبایل.
        اگر مرورگر شرایط نصب را داشته باشد، دکمه نصب فعال می‌شود.
        برای iOS، راهنمای Add to Home Screen نمایش داده می‌شود.
      */}
      <PwaInstallOverlay />
      <GlobalButtonEffects />
            <GlobalAppFeedbackBridge />
      <Toaster
        position="bottom-right"
        reverseOrder={false}
        gutter={14}
        containerStyle={{ zIndex: 2147483000, right: 20, bottom: 20, left: 'auto', top: 'auto' }}
        toastOptions={{
          duration: 4200,
          style: { background: 'transparent', boxShadow: 'none', padding: 0, maxWidth: 'none' },
          success: { duration: 3600 },
          error: { duration: 5400 },
          loading: { duration: 4500 },
        }}
      >
        {(t) => {
          const ui = getToastUi(t.type);
          return (
            <div
              className={`pointer-events-auto w-[min(92vw,460px)] overflow-hidden rounded-[24px] border shadow-[0_25px_70px_-35px_rgba(15,23,42,0.42)] backdrop-blur-xl transition-all duration-300 ${ui.wrap} ${t.visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
              data-ui-feedback-surface="toast"
              dir="rtl"
            >
              <div className="flex items-start gap-3 px-4 pb-3 pt-4">
                <div className={`mt-0.5 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${ui.iconWrap}`}>
                  <i className={`fa-solid ${ui.icon} text-lg`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[15px] font-black tracking-[-0.01em]">{ui.title}</div>
                      <div className="mt-1 text-[13px] leading-6 text-slate-600 dark:text-slate-300">{resolveValue(t.message, t)}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => hotToast.dismiss(t.id)}
                      className="app-command-button app-command-button--icon inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-slate-200/80 bg-white/80 text-slate-500 transition-all hover:border-slate-300 hover:text-slate-700 dark:border-slate-700/80 dark:bg-slate-900/70 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-200"
                      data-ui-button="true"
                      data-ui-variant="secondary"
                      data-ui-size="icon"
                      data-ui-global-toast-close="true"
                      aria-label="بستن اعلان"
                    >
                      <i className="fa-solid fa-xmark" />
                    </button>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1.5"><i className="fa-solid fa-wand-magic-sparkles" /> اعلان هوشمند سیستم</span>
                    <span className="inline-flex items-center gap-1.5"><i className="fa-regular fa-clock" /> بستن خودکار</span>
                  </div>
                </div>
              </div>
              <div className="h-1.5 w-full bg-slate-100/80 dark:bg-slate-800/80">
                <div className={`toast-progress-bar h-full w-full bg-gradient-to-r ${ui.progress}`} style={{ animationDuration: `${typeof t.duration === 'number' ? t.duration : 4200}ms`, animationPlayState: t.visible ? 'running' : 'paused' }} />
              </div>
            </div>
          );
        }}
      </Toaster>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
        {/* Public (مثل لاگین) */}
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/install" element={<InstallApp />} />
        </Route>

        {/* Protected (اپ اصلی) */}
        <Route element={<ProtectedRoute />}>
          {/* مسیرهای چاپ/PDF (بدون MainLayout) */}
          <Route path="/print" element={<PrintLayout />}>
            <Route path="reports/*" element={<PrintReportShell />} />
          </Route>

          <Route element={<MainLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="search" element={<SearchResults />} />
            <Route path="/search" element={<SearchResults />} />
            <Route path="/403" element={<Forbidden />} />

            {/* کالا/فروش */}
            <Route element={<RoleProtectedRoute allowedRoles={['Admin','Manager','Warehouse','Salesperson','Technician','Marketer']} />}>
              <Route path="/products" element={<Products />} />
              <Route path="/mobile-phones" element={<FeatureGate feature="mobile_phones"><MobilePhones /></FeatureGate>} />
            </Route>

            {/* فروش + فاکتور + اقساط */}
            <Route element={<RoleProtectedRoute allowedRoles={['Admin','Manager','Salesperson']} />}>
              <Route path="/sales" element={<FeatureGate feature="cash_sales"><SalesHub /></FeatureGate>} />
              <Route path="/sales/cash" element={<FeatureGate feature="cash_sales"><SalesCartPage /></FeatureGate>} />
              <Route path="/sales/expenses" element={<ExpensesPage />} />
              <Route path="/cart-sale" element={<FeatureGate feature="cash_sales"><SalesCartPage /></FeatureGate>} />
              <Route path="/installment-sales" element={<FeatureGate feature="installments"><InstallmentSalesPage /></FeatureGate>} />
              <Route path="/installment-sales/new" element={<FeatureGate feature="installments"><AddInstallmentSalePage /></FeatureGate>} />
              <Route path="/installment-sales/:id" element={<FeatureGate feature="installments"><InstallmentSaleDetailPage /></FeatureGate>} />
              <Route path="/invoices" element={<FeatureGate feature="cash_sales"><Invoices /></FeatureGate>} />
              <Route path="/invoices/:orderId" element={<FeatureGate feature="cash_sales"><InvoiceDetail /></FeatureGate>} />
            </Route>

            {/* مشتریان/همکاران */}
            <Route element={<RoleProtectedRoute allowedRoles={['Admin','Manager','Salesperson','Marketer']} />}>
              <Route path="/customers" element={<Customers />} />
              <Route path="/customers/:id" element={<CustomerDetailPage />} />
              <Route path="/partners" element={<Partners />} />
              <Route path="/partners/:id" element={<PartnerDetail />} />
            </Route>

            {/* تعمیرات/خدمات */}
            <Route element={<RoleProtectedRoute allowedRoles={['Admin','Manager','Technician']} />}>
              <Route path="/repairs" element={<FeatureGate feature="repairs_services"><Repairs /></FeatureGate>} />
              <Route path="/repairs/new" element={<FeatureGate feature="repairs_services"><AddRepair /></FeatureGate>} />
              <Route path="/repairs/:id" element={<FeatureGate feature="repairs_services"><RepairDetail /></FeatureGate>} />
              <Route path="/repairs/:id/receipt" element={<FeatureGate feature="repairs_services"><RepairReceipt /></FeatureGate>} />
              <Route path="/services" element={<FeatureGate feature="repairs_services"><Services /></FeatureGate>} />
            </Route>

            {/* ابزارها */}
            <Route element={<RoleProtectedRoute allowedRoles={['Admin','Manager','Warehouse']} />}>
              <Route path="/tools/labelprint" element={<FeatureGate feature="purchases_stock_counts"><LabelPrint /></FeatureGate>} />
              <Route path="/purchases" element={<FeatureGate feature="purchases_stock_counts"><Navigate to="/products" replace /></FeatureGate>} />
              <Route path="/stock-counts" element={<FeatureGate feature="purchases_stock_counts"><StockCounts /></FeatureGate>} />
            </Route>

            {/* گزارش‌ها */}
            <Route element={<RoleProtectedRoute allowedRoles={['Admin','Manager','Salesperson','Marketer']} />}>
              <Route path="/expenses" element={<ExpensesPage />} />

              {/* Reports (premium layout wrapper) */}
              <Route path="/reports" element={<FeatureGate feature="advanced_reports"><ReportsLayout /></FeatureGate>}>
                <Route index element={<Reports />} />
                <Route path="sales-summary" element={<SalesReport />} />
                <Route path="sales" element={<SalesReport />} />
                <Route path="product-sales" element={<ProductSalesReport />} />
                <Route path="partners-performance" element={<PartnerPerformanceReport />} />
                <Route path="followups" element={<FollowupsReport />} />
                <Route path="collection-center" element={<FeatureGate feature="installments"><CollectionFollowupCenter /></FeatureGate>} />
                <Route path="collection-followup" element={<FeatureGate feature="installments"><CollectionFollowupCenter /></FeatureGate>} />
                <Route path="debtors" element={<DebtorsReport />} />
                <Route path="creditors" element={<CreditorsReport />} />
                <Route path="top-customers" element={<TopCustomersReport />} />
                <Route path="top-suppliers" element={<TopSuppliersReport />} />
                <Route path="mobile-sales-analytics" element={<FeatureGate feature="mobile_phones"><MobileSalesAnalytics /></FeatureGate>} />
                <Route path="smart-insights" element={<FeatureGate feature="smart_insights"><SmartInsightCenter /></FeatureGate>} />
                <Route path="phone-sales" element={<FeatureGate feature="mobile_phones"><PhoneSalesReport /></FeatureGate>} />
                <Route path="phone-installment-sales" element={<FeatureGate feature="mobile_phones"><PhoneInstallmentSalesReport /></FeatureGate>} />
                <Route path="periodic-comparison" element={<CompareSales />} />
                <Route path="financial-overview" element={<FinancialOverview />} />
                <Route path="realized-profit" element={<RealizedProfitReport />} />
                <Route path="analytics" element={<AnalyticsDashboard />} />
                <Route path="product-profit-real" element={<ProductProfitReal />} />
                <Route path="installments-calendar" element={<FeatureGate feature="installments"><InstallmentsCalendar /></FeatureGate>} />
                <Route path="rfm" element={<RfmReport />} />
                <Route path="cohort" element={<CohortReport />} />
                <Route path="inventory-turnover" element={<InventoryTurnoverReport />} />
                <Route path="dead-stock" element={<DeadStockReport />} />
                <Route path="abc" element={<AbcAnalysisReport />} />
                <Route path="aging-receivables" element={<AgingReceivablesReport />} />
                <Route path="cashflow" element={<CashflowReport />} />
                <Route path="financial-audit" element={<FinancialAuditReport />} />
                <Route path="manager-credit-approvals" element={<ManagerCreditApprovalsReport />} />
                <Route path="sales-risk-decisions" element={<SalesRiskDecisionsReport />} />

                {/* analysis hub + children */}
                <Route path="analysis" element={<FeatureGate feature="smart_insights"><AnalysisHub /></FeatureGate>} />
                <Route path="analysis/profitability" element={<FeatureGate feature="smart_insights"><ProfitabilityReport /></FeatureGate>} />
                <Route path="analysis/inventory" element={<FeatureGate feature="smart_insights"><InventoryAnalysisReport /></FeatureGate>} />
                <Route path="analysis/suggestions" element={<FeatureGate feature="smart_insights"><PurchaseSuggestionReport /></FeatureGate>} />
              </Route>
            </Route>

            {/* Audit log */}
            <Route element={<RoleProtectedRoute allowedRoles={['Admin','Manager']} />}>
              <Route path="/audit-log" element={<FeatureGate feature="audit_log"><AuditLogPage /></FeatureGate>} />
            </Route>

            {/* تنظیمات + نوتیفیکیشن‌ها */}
            <Route element={<RoleProtectedRoute allowedRoles={['Admin']} />}>
              <Route path="/notifications" element={<FeatureGate feature="notifications_outbox"><NotificationsPage /></FeatureGate>} />
              <Route path="/outbox" element={<FeatureGate feature="notifications_outbox"><OutboxPage /></FeatureGate>} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/settings/style" element={<StyleSettings />} /> {/* ← صفحه قلب استایل */}
              <Route path="/settings/store-ownership" element={<StoreOwnershipPage />} />
            </Route>


            {/* 404 داخل لایهٔ اصلی */}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>

        {/* اگر مسیر خارج از Protected خورد (نادر)، 404 ساده: */}
        <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </StyleProvider>
  );
};

export default App;
