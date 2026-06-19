import React from 'react';
import { useLocation } from 'react-router-dom';

// گزارش‌ها را مستقیم رندر می‌کنیم (بدون ReportsLayout/MainLayout)
import SalesReport from './reports/SalesReport';
import ProductSalesReport from './reports/ProductSalesReport';
import FollowupsReport from './reports/FollowupsReport';
import DebtorsReport from './reports/DebtorsReport';
import CreditorsReport from './reports/CreditorsReport';
import TopCustomersReport from './reports/TopCustomersReport';
import TopSuppliersReport from './reports/TopSuppliersReport';
import PhoneSalesReport from './reports/PhoneSalesReport';
import PhoneInstallmentSalesReport from './reports/PhoneInstallmentSalesReport';
import CompareSales from './reports/CompareSales';
import FinancialOverview from './reports/FinancialOverview';
import AnalyticsDashboard from './reports/AnalyticsDashboard';
import ProductProfitReal from './reports/ProductProfitReal';
import InstallmentsCalendar from './reports/InstallmentsCalendar';
import RfmReport from './reports/RfmReport';
import CohortReport from './reports/CohortReport';
import InventoryTurnoverReport from './reports/InventoryTurnoverReport';
import DeadStockReport from './reports/DeadStockReport';
import AbcAnalysisReport from './reports/AbcAnalysisReport';
import AgingReceivablesReport from './reports/AgingReceivablesReport';
import CashflowReport from './reports/CashflowReport';
import AnalysisHub from './reports/AnalysisHub';
import ProfitabilityReport from './reports/ProfitabilityReport';
import InventoryAnalysisReport from './reports/InventoryAnalysisReport';
import PurchaseSuggestionReport from './reports/PurchaseSuggestionReport';

const PrintReportShell: React.FC = () => {
  const { pathname } = useLocation();

  // اگر slug شامل مسیرهای تو در تو نشد، از pathname استخراج می‌کنیم.
  // مثال: /print/reports/analysis/profitability
  const fullSlug = (() => {
    const p = pathname || '';
    const i = p.indexOf('/print/reports/');
    if (i === -1) return '';
    return p.slice(i + '/print/reports/'.length);
  })();

  const map: Record<string, React.ReactNode> = {
    'sales-summary': <SalesReport />,
    'product-sales': <ProductSalesReport />,
    followups: <FollowupsReport />,
    debtors: <DebtorsReport />,
    creditors: <CreditorsReport />,
    'top-customers': <TopCustomersReport />,
    'top-suppliers': <TopSuppliersReport />,
    'phone-sales': <PhoneSalesReport />,
    'phone-installment-sales': <PhoneInstallmentSalesReport />,
    'periodic-comparison': <CompareSales />,
    'financial-overview': <FinancialOverview />,
    analytics: <AnalyticsDashboard />,
    'product-profit-real': <ProductProfitReal />,
    'installments-calendar': <InstallmentsCalendar />,
    rfm: <RfmReport />,
    cohort: <CohortReport />,
    'inventory-turnover': <InventoryTurnoverReport />,
    'dead-stock': <DeadStockReport />,
    abc: <AbcAnalysisReport />,
    'aging-receivables': <AgingReceivablesReport />,
    cashflow: <CashflowReport />,
    analysis: <AnalysisHub />,
    'analysis/profitability': <ProfitabilityReport />,
    'analysis/inventory': <InventoryAnalysisReport />,
    'analysis/suggestions': <PurchaseSuggestionReport />,
  };

  // پشتیبانی از مسیرهای تو در تو (analysis/...) که در slug ممکن است فقط "analysis" بیاید.
  const node = map[fullSlug] ?? (
    <div className="p-6 rounded-2xl border border-slate-200">
      <div className="font-extrabold">گزارش پیدا نشد</div>
      <div className="text-sm text-slate-500 mt-1">کلید گزارش: {fullSlug}</div>
    </div>
  );

  return <div id="report-print-root">{node}</div>;
};

export default PrintReportShell;
