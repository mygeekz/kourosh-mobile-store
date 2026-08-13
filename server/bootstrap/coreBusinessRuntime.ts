import type { Express, RequestHandler } from "express";
import { registerCoreBusinessRoutes } from "../routes/coreBusinessRouteRegistry";
import {
  ensureSmartInsightDecisionMemory,
  recordAiFeatureImpactEvent,
} from "../intelligence/smartInsights/smartInsightCore.service";
import {
  localCertDir,
  localHostsScriptPath,
  localMacHostsScriptPath,
  normalizeLocalHostname,
  normalizeLocalSuffix,
  buildLocalDomain,
  buildLocalDomainShortcut,
  getLocalDomainHostIp,
  buildWindowsHostsSetupBatch,
  buildMacHostsSetupCommand,
  generateLocalCertificate,
  uploadsDir,
} from "../utils/localSettingsHelpers";
import { insertSmsLog } from "../utils/smsLogHelpers";
import { safeReplaceTemplate } from "../utils/telegramDeepLinkHelpers";
import {
  createFormatPriceForSms,
  sanitizeTelegramHtml,
  escapeHtml,
  markdownishToHtml,
  telegramCard,
} from "../utils/messagingFormatters";
import {
  buildSalesAdvisorAnalysis,
  getCustomerSalesTrustProfileFromDb,
  salesAdvisorClamp,
  salesAdvisorMoney,
  salesAdvisorNum,
  salesAdvisorParseDate,
} from "../utils/salesAdvisorHelpers";
import {
  REPORT_CURRENCY_CONTRACT,
  formatReportMoneyText,
  buildDiscountAwareInvoiceLines,
  getProductSalesDocKey,
  buildProductSalesCollectionsReport,
  buildRealizedProfitRecognitionReport,
  getProductSalesDetailsDiscountAudit,
  matchesProductSalesDetailsQuery,
  summarizeProductSalesDetailsRows,
  buildProductSalesDetailsTopProducts,
  buildProductSalesCalculationHealth,
  buildProductSalesCollectionRisk,
} from "../utils/productSalesReportHelpers";
import {
  buildCollectionCenterSourceFromISO,
  shouldShowCollectionCenterItemForOperationalWindow,
  buildDirectInstallmentCollectionItems,
  enrichCollectionCenterItems,
  collectionCenterToShamsiDisplay,
  collectionCenterDateDiffInDays,
  collectionCenterOverdueDays,
  collectionCenterKanbanMeta,
  summarizeCollectionCenter,
  collectionCenterActionMeta,
  defaultCollectionCenterNextDate,
  buildCollectionCenterMarker,
} from "../utils/collectionCenterHelpers";
import {
  addAuditLog,
  addCustomerFollowupToDb,
  allAsync,
  getAllCustomersWithBalanceFromDb,
  getCustomerByIdFromDb,
  getCreditorsList,
  getDebtorsList,
  getExpensesSummaryFromDb,
  getSalesSummaryAndProfit,
  getAsync,
  runAsync,
} from "../database";
import { sendTelegramMessages } from "../telegramService";
import {
  createCoreMessagingRouteAdapters,
  type CoreMessagingBridge,
} from "./coreMessagingBridge";

type AuthorizeRole = (allowedRoles: string[]) => RequestHandler;

export interface CoreBusinessRuntimeDeps {
  requireAuth: RequestHandler;
  authorizeRole: AuthorizeRole;
  revokeUserSessions: (userId: number, exceptToken?: string | null) => number;
  messaging: CoreMessagingBridge;
}

export const formatPriceForSms = createFormatPriceForSms(
  REPORT_CURRENCY_CONTRACT.moneyDivisor,
);

export const sanitizeJalali = (input: unknown): string =>
  String(input ?? "")
    .trim()
    .replace(/[^0-9\u06F0-\u06F9/]/g, "");

export function registerCoreBusinessRuntime(
  app: Express,
  deps: CoreBusinessRuntimeDeps,
) {
  const messagingAdapters = createCoreMessagingRouteAdapters(deps.messaging);

  return registerCoreBusinessRoutes(app, {
    auth: {
      requireAuth: deps.requireAuth,
      authorizeRole: deps.authorizeRole,
      revokeUserSessions: deps.revokeUserSessions,
    },
    customers: {
      getAllCustomersWithBalanceFromDb,
      getCustomerByIdFromDb,
      getCustomerSalesTrustProfileFromDb,
    },
    db: {
      allAsync,
      getAsync,
      runAsync,
      addAuditLog,
      getDebtorsList,
      getCreditorsList,
      getExpensesSummaryFromDb,
      addCustomerFollowupToDb,
    },
    salesAdvisor: {
      salesAdvisorNum,
      salesAdvisorMoney,
      salesAdvisorParseDate,
      salesAdvisorClamp,
      buildSalesAdvisorAnalysis,
    },
    messaging: {
      notifyCustomer: messagingAdapters.notifyCustomer,
      formatPriceForSms,
      safeReplaceTemplate,
      enqueueTelegramToTopicTargets: messagingAdapters.enqueueTelegramToTopicTargets,
      getTelegramTargetsForTopic: messagingAdapters.getTelegramTargetsForTopic,
      sendTelegramMessages,
      insertSmsLog,
      isTopicTypeEnabled: messagingAdapters.isTopicTypeEnabled,
    },
    reports: {
      sanitizeJalali,
      getSalesSummaryAndProfit,
      buildRealizedProfitRecognitionReport,
      buildProductSalesCollectionsReport,
      reportCurrencyContract: REPORT_CURRENCY_CONTRACT,
      buildDiscountAwareInvoiceLines,
      buildProductSalesCollectionRisk,
      getProductSalesDocKey,
      formatReportMoneyText,
      matchesProductSalesDetailsQuery,
      getProductSalesDetailsDiscountAudit,
      summarizeProductSalesDetailsRows,
      buildProductSalesDetailsTopProducts,
      buildProductSalesCalculationHealth,
    },
    localSettings: {
      uploadsDir,
      localCertDir,
      localHostsScriptPath,
      localMacHostsScriptPath,
      normalizeLocalHostname,
      normalizeLocalSuffix,
      buildLocalDomain,
      buildLocalDomainShortcut,
      getLocalDomainHostIp,
      buildWindowsHostsSetupBatch,
      buildMacHostsSetupCommand,
      generateLocalCertificate,
    },
    collectionCenter: {
      enrichCollectionCenterItems,
      buildCollectionCenterSourceFromISO,
      shouldShowCollectionCenterItemForOperationalWindow,
      buildDirectInstallmentCollectionItems,
      collectionCenterToShamsiDisplay,
      collectionCenterDateDiffInDays,
      collectionCenterOverdueDays,
      collectionCenterKanbanMeta,
      summarizeCollectionCenter,
      collectionCenterActionMeta,
      defaultCollectionCenterNextDate,
      buildCollectionCenterMarker,
    },
    smartInsights: {
      recordAiFeatureImpactEvent,
      ensureSmartInsightDecisionMemory,
    },
    htmlFormatting: {
      escapeHtml,
      sanitizeTelegramHtml,
      markdownishToHtml,
      telegramCard,
    },
  });
}
