import type { Express } from "express";
import type { CoreBusinessRouteRegistryDeps } from "./routeTypes";
import { registerDashboardRoutes } from "./dashboard.routes";
import { registerNotificationsRoutes } from "./notifications.routes";
import { registerProductsRoutes } from "./products.routes";
import { registerInventoryRoutes } from "./inventory.routes";
import { registerPurchasesRoutes } from "./purchases.routes";
import { registerPhonesRoutes } from "./phones.routes";
import { registerSalesReadRoutes } from "./salesRead.routes";
import { registerCustomerTrustRoutes } from "./customerTrust.routes";
import { registerSalesRiskRoutes } from "./salesRisk.routes";
import { registerSalesOrderMutationRoutes } from "./salesOrderMutations.routes";
import { registerSalesInvoiceRoutes } from "./salesInvoice.routes";
import { registerLegacySalesRoutes } from "./legacySales.routes";
import { registerCustomersRoutes } from "./customers.routes";
import { registerPartnersRoutes } from "./partners.routes";
import { registerPartnerOwnershipRoutes } from "./partnerOwnership.routes";
import { registerReportAuditRoutes } from "./reportAudit.routes";
import { registerReportSalesCoreRoutes } from "./reportSalesCore.routes";
import { registerReportMobileSalesAnalyticsRoutes } from "./reportMobileSalesAnalytics.routes";
import {
  registerCompareSalesReportRoutes,
  registerProductSalesSummaryReportRoutes,
  registerProductSalesDetailsReportRoutes,
} from "./productSalesReports.routes";
import { registerSettingsRoutes } from "./settings.routes";
import { registerLocalSettingsRoutes } from "./localSettings.routes";
import { registerBackupRoutes } from "./backup.routes";
import { registerUsersRoutes } from "./users.routes";
import { registerInstallmentsRoutes } from "./installments.routes";
import { registerAnalysisRoutes } from "./analysis.routes";
import {
  registerReportAnalyticsDashboardRoutes,
  registerReportRetentionRoutes,
} from "./reportAnalytics.routes";
import { registerExpensesRoutes } from "./expenses.routes";
import { registerReportExportRoutes } from "./reportExport.routes";
import { registerFinancialOverviewReportRoutes } from "./financialOverviewReports.routes";
import { registerSmartInsightActionRoutes } from "./smartInsightActions.routes";
import { registerSmartInsightReportRoutes } from "./smartInsightReport.routes";
import { registerIntelligenceRoutes } from "./intelligence.routes";
import { registerCollectionCenterReportRoutes } from "./collectionCenterReports.routes";
import { registerFollowupsInstallmentsReportsRoutes } from "./followupsInstallmentsReports.routes";
import { registerAgingCashflowReportRoutes } from "./agingCashflowReports.routes";
import { registerAuditLogRoutes } from "./auditLog.routes";
import { registerAccountingReconciliationRoutes } from "./accountingReconciliation.routes";
import { registerReportAutomationRoutes } from "./reportAutomation.routes";
import {
  createCollectionCenterReportRouteDeps,
  createCustomerTrustRouteDeps,
  createFinancialOverviewReportRouteDeps,
  createLegacySalesRouteDeps,
  createLocalSettingsRouteDeps,
  createProductSalesDetailsReportRouteDeps,
  createReportAutomationRoutesDeps,
  createSalesOrderMutationRouteDeps,
  createSalesRiskRouteDeps,
  createSmartInsightReportRoutesDeps,
} from "./coreBusinessRouteAdapters";

export function registerOperationalRouteGroup(
  app: Express,
  deps: CoreBusinessRouteRegistryDeps,
): void {
  registerDashboardRoutes(app, { requireAuth: deps.auth.requireAuth });
  registerNotificationsRoutes(app, { authorizeRole: deps.auth.authorizeRole });

  registerProductsRoutes(app, { authorizeRole: deps.auth.authorizeRole });
  registerInventoryRoutes(app, { authorizeRole: deps.auth.authorizeRole });
  registerPurchasesRoutes(app, { authorizeRole: deps.auth.authorizeRole });
  registerPhonesRoutes(app, { authorizeRole: deps.auth.authorizeRole });
}

export function registerSalesRouteGroup(
  app: Express,
  deps: CoreBusinessRouteRegistryDeps,
): void {
  registerSalesReadRoutes(app, { authorizeRole: deps.auth.authorizeRole });
  registerCustomerTrustRoutes(app, createCustomerTrustRouteDeps(deps));
  registerSalesRiskRoutes(app, createSalesRiskRouteDeps(deps));
  registerSalesOrderMutationRoutes(app, createSalesOrderMutationRouteDeps(deps));
  registerSalesInvoiceRoutes(app, { authorizeRole: deps.auth.authorizeRole });
  registerLegacySalesRoutes(app, createLegacySalesRouteDeps(deps));
}

export function registerCustomerPartnerRouteGroup(
  app: Express,
  deps: CoreBusinessRouteRegistryDeps,
): void {
  registerCustomersRoutes(app, {
    authorizeRole: deps.auth.authorizeRole,
    notifyCustomer: deps.messaging.notifyCustomer,
  });
  registerPartnersRoutes(app, { authorizeRole: deps.auth.authorizeRole });
  registerPartnerOwnershipRoutes(app, { authorizeRole: deps.auth.authorizeRole });
}

export function registerSalesReportsRouteGroup(
  app: Express,
  deps: CoreBusinessRouteRegistryDeps,
): void {
  registerReportAuditRoutes(app, { authorizeRole: deps.auth.authorizeRole });
  registerReportSalesCoreRoutes(app, { authorizeRole: deps.auth.authorizeRole });
  registerReportMobileSalesAnalyticsRoutes(app, { authorizeRole: deps.auth.authorizeRole });
  registerCompareSalesReportRoutes(app, {
    authorizeRole: deps.auth.authorizeRole,
    sanitizeJalali: deps.reports.sanitizeJalali,
    getSalesSummaryAndProfit: deps.reports.getSalesSummaryAndProfit,
  });
  registerProductSalesSummaryReportRoutes(app, {
    authorizeRole: deps.auth.authorizeRole,
    allAsync: deps.db.allAsync,
    buildRealizedProfitRecognitionReport: deps.reports.buildRealizedProfitRecognitionReport,
    buildProductSalesCollectionsReport: deps.reports.buildProductSalesCollectionsReport,
    reportCurrencyContract: deps.reports.reportCurrencyContract,
  });
}

export function registerSettingsAndInstallmentsRouteGroup(
  app: Express,
  deps: CoreBusinessRouteRegistryDeps,
): void {
  registerSettingsRoutes(app, { authorizeRole: deps.auth.authorizeRole });
  registerLocalSettingsRoutes(app, createLocalSettingsRouteDeps(deps));
  registerBackupRoutes(app, { authorizeRole: deps.auth.authorizeRole });
  registerUsersRoutes(app, {
    authorizeRole: deps.auth.authorizeRole,
    revokeUserSessions: deps.auth.revokeUserSessions,
  });

  registerInstallmentsRoutes(app, {
    authorizeRole: deps.auth.authorizeRole,
    notifyCustomer: deps.messaging.notifyCustomer,
    insertSmsLog: (payload: any) => deps.messaging.insertSmsLog(payload),
  });
}

export function registerAnalyticsAndFinancialRouteGroup(
  app: Express,
  deps: CoreBusinessRouteRegistryDeps,
): void {
  registerAnalysisRoutes(app, { authorizeRole: deps.auth.authorizeRole });
  registerReportRetentionRoutes(app, { authorizeRole: deps.auth.authorizeRole });
  registerExpensesRoutes(app, { authorizeRole: deps.auth.authorizeRole });
  registerReportExportRoutes(app, { authorizeRole: deps.auth.authorizeRole });
  registerReportAnalyticsDashboardRoutes(app, { authorizeRole: deps.auth.authorizeRole });
  registerFinancialOverviewReportRoutes(app, createFinancialOverviewReportRouteDeps(deps));
}

export function registerIntelligenceAndOperationalReportsRouteGroup(
  app: Express,
  deps: CoreBusinessRouteRegistryDeps,
): void {
  registerSmartInsightActionRoutes(app, { authorizeRole: deps.auth.authorizeRole });
  registerSmartInsightReportRoutes(app, createSmartInsightReportRoutesDeps(deps));
  registerIntelligenceRoutes(app, { authorizeRole: deps.auth.authorizeRole });
  registerCollectionCenterReportRoutes(app, createCollectionCenterReportRouteDeps(deps));
  registerProductSalesDetailsReportRoutes(app, createProductSalesDetailsReportRouteDeps(deps));
  registerFollowupsInstallmentsReportsRoutes(app, { authorizeRole: deps.auth.authorizeRole });
  registerAgingCashflowReportRoutes(app, { authorizeRole: deps.auth.authorizeRole });
  registerAuditLogRoutes(app, { authorizeRole: deps.auth.authorizeRole });
  registerAccountingReconciliationRoutes(app, { authorizeRole: deps.auth.authorizeRole });
}

export function registerAutomationRouteGroup(
  app: Express,
  deps: CoreBusinessRouteRegistryDeps,
): ReturnType<typeof registerReportAutomationRoutes> {
  return registerReportAutomationRoutes(app, createReportAutomationRoutesDeps(deps));
}
