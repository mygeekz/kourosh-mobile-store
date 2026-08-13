import type { RequestHandler } from "express";
import type { CoreMessagingRouteAdapters } from "../bootstrap/coreMessagingBridge";
import type { registerReportAutomationRoutes } from "./reportAutomation.routes";

export type AnyFn = (...args: any[]) => any;
export type AuthorizeRole = (allowedRoles: string[]) => RequestHandler;

export interface CoreBusinessAuthDeps {
  requireAuth: RequestHandler;
  authorizeRole: AuthorizeRole;
  revokeUserSessions: (userId: number, exceptToken?: string | null) => number;
}

export interface CoreBusinessCustomerDeps {
  getAllCustomersWithBalanceFromDb: AnyFn;
  getCustomerByIdFromDb: AnyFn;
  getCustomerSalesTrustProfileFromDb: AnyFn;
}

export interface CoreBusinessDbDeps {
  allAsync: AnyFn;
  getAsync: AnyFn;
  runAsync: AnyFn;
  addAuditLog: AnyFn;
  getDebtorsList: AnyFn;
  getCreditorsList: AnyFn;
  getExpensesSummaryFromDb: AnyFn;
  addCustomerFollowupToDb: AnyFn;
}

export interface CoreBusinessSalesAdvisorDeps {
  salesAdvisorNum: AnyFn;
  salesAdvisorMoney: AnyFn;
  salesAdvisorParseDate: AnyFn;
  salesAdvisorClamp: AnyFn;
  buildSalesAdvisorAnalysis: AnyFn;
}

export interface CoreBusinessMessagingDeps {
  notifyCustomer: CoreMessagingRouteAdapters["notifyCustomer"];
  formatPriceForSms: AnyFn;
  safeReplaceTemplate: AnyFn;
  enqueueTelegramToTopicTargets: CoreMessagingRouteAdapters["enqueueTelegramToTopicTargets"];
  getTelegramTargetsForTopic: CoreMessagingRouteAdapters["getTelegramTargetsForTopic"];
  sendTelegramMessages: AnyFn;
  insertSmsLog: AnyFn;
  isTopicTypeEnabled: CoreMessagingRouteAdapters["isTopicTypeEnabled"];
}

export interface CoreBusinessReportsDeps {
  sanitizeJalali: AnyFn;
  getSalesSummaryAndProfit: AnyFn;
  buildRealizedProfitRecognitionReport: AnyFn;
  buildProductSalesCollectionsReport: AnyFn;
  reportCurrencyContract: any;
  buildDiscountAwareInvoiceLines: AnyFn;
  buildProductSalesCollectionRisk: AnyFn;
  getProductSalesDocKey: AnyFn;
  formatReportMoneyText: AnyFn;
  matchesProductSalesDetailsQuery: AnyFn;
  getProductSalesDetailsDiscountAudit: AnyFn;
  summarizeProductSalesDetailsRows: AnyFn;
  buildProductSalesDetailsTopProducts: AnyFn;
  buildProductSalesCalculationHealth: AnyFn;
}

export interface CoreBusinessLocalSettingsDeps {
  uploadsDir: string;
  localCertDir: string;
  localHostsScriptPath: string;
  localMacHostsScriptPath: string;
  normalizeLocalHostname: AnyFn;
  normalizeLocalSuffix: AnyFn;
  buildLocalDomain: AnyFn;
  buildLocalDomainShortcut: AnyFn;
  getLocalDomainHostIp: AnyFn;
  buildWindowsHostsSetupBatch: AnyFn;
  buildMacHostsSetupCommand: AnyFn;
  generateLocalCertificate: AnyFn;
}

export interface CoreBusinessCollectionCenterDeps {
  enrichCollectionCenterItems: AnyFn;
  buildCollectionCenterSourceFromISO: AnyFn;
  shouldShowCollectionCenterItemForOperationalWindow: AnyFn;
  buildDirectInstallmentCollectionItems: AnyFn;
  collectionCenterToShamsiDisplay: AnyFn;
  collectionCenterDateDiffInDays: AnyFn;
  collectionCenterOverdueDays: AnyFn;
  collectionCenterKanbanMeta: AnyFn;
  summarizeCollectionCenter: AnyFn;
  collectionCenterActionMeta: AnyFn;
  defaultCollectionCenterNextDate: AnyFn;
  buildCollectionCenterMarker: AnyFn;
}

export interface CoreBusinessSmartInsightDeps {
  recordAiFeatureImpactEvent: AnyFn;
  ensureSmartInsightDecisionMemory: AnyFn;
}

export interface CoreBusinessHtmlFormattingDeps {
  escapeHtml: AnyFn;
  sanitizeTelegramHtml: AnyFn;
  markdownishToHtml: AnyFn;
  telegramCard: AnyFn;
}

export interface CoreBusinessRouteRegistryDeps {
  auth: CoreBusinessAuthDeps;
  customers: CoreBusinessCustomerDeps;
  db: CoreBusinessDbDeps;
  salesAdvisor: CoreBusinessSalesAdvisorDeps;
  messaging: CoreBusinessMessagingDeps;
  reports: CoreBusinessReportsDeps;
  localSettings: CoreBusinessLocalSettingsDeps;
  collectionCenter: CoreBusinessCollectionCenterDeps;
  smartInsights: CoreBusinessSmartInsightDeps;
  htmlFormatting: CoreBusinessHtmlFormattingDeps;
}

export interface CoreBusinessRouteRegistryResult {
  reportAutomationRuntime: ReturnType<typeof registerReportAutomationRoutes>;
}
