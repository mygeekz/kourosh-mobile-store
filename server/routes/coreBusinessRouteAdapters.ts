import type {
  CollectionCenterReportRoutesDeps,
  CoreBusinessRouteRegistryDeps,
  CustomerTrustRoutesDeps,
  FinancialOverviewReportRoutesDeps,
  LegacySalesRoutesDeps,
  LocalSettingsRoutesDeps,
  ProductSalesDetailsReportRoutesDeps,
  ReportAutomationRoutesDeps,
  SalesOrderMutationRoutesDeps,
  SalesRiskRoutesDeps,
  SmartInsightReportRoutesDeps,
} from "./routeTypes";

export function createCustomerTrustRouteDeps(
  deps: CoreBusinessRouteRegistryDeps,
): CustomerTrustRoutesDeps {
  return {
    authorizeRole: deps.auth.authorizeRole,
    getAllCustomersWithBalanceFromDb: deps.customers.getAllCustomersWithBalanceFromDb,
    getCustomerByIdFromDb: deps.customers.getCustomerByIdFromDb,
    getCustomerSalesTrustProfileFromDb: deps.customers.getCustomerSalesTrustProfileFromDb,
    allAsync: deps.db.allAsync,
    salesAdvisorNum: deps.salesAdvisor.salesAdvisorNum,
    salesAdvisorMoney: deps.salesAdvisor.salesAdvisorMoney,
    salesAdvisorParseDate: deps.salesAdvisor.salesAdvisorParseDate,
    salesAdvisorClamp: deps.salesAdvisor.salesAdvisorClamp,
  };
}

export function createSalesRiskRouteDeps(
  deps: CoreBusinessRouteRegistryDeps,
): SalesRiskRoutesDeps {
  return {
    authorizeRole: deps.auth.authorizeRole,
    getCustomerByIdFromDb: deps.customers.getCustomerByIdFromDb,
    getCustomerSalesTrustProfileFromDb: deps.customers.getCustomerSalesTrustProfileFromDb,
    buildSalesAdvisorAnalysis: deps.salesAdvisor.buildSalesAdvisorAnalysis,
    allAsync: deps.db.allAsync,
    addAuditLog: deps.db.addAuditLog,
  };
}

export function createSalesOrderMutationRouteDeps(
  deps: CoreBusinessRouteRegistryDeps,
): SalesOrderMutationRoutesDeps {
  return {
    authorizeRole: deps.auth.authorizeRole,
    getCustomerById: (customerId: number) => deps.customers.getCustomerByIdFromDb(customerId),
    getCustomerSalesTrustProfile: (customerId: number, customer: unknown) =>
      deps.customers.getCustomerSalesTrustProfileFromDb(customerId, customer),
    toNumber: (value: unknown) => deps.salesAdvisor.salesAdvisorNum(value),
    formatPriceForSms: (price: number) => deps.messaging.formatPriceForSms(price),
    notifyCustomer: deps.messaging.notifyCustomer,
    safeReplaceTemplate: (template: string, vars: Record<string, unknown>) =>
      deps.messaging.safeReplaceTemplate(template, vars),
    enqueueTelegramToTopicTargets: async (topic, typeKey, text, meta) => {
      await deps.messaging.enqueueTelegramToTopicTargets(topic, typeKey, text, meta);
    },
  };
}

export function createLegacySalesRouteDeps(
  deps: CoreBusinessRouteRegistryDeps,
): LegacySalesRoutesDeps {
  return {
    getTelegramTargetsForTopic: deps.messaging.getTelegramTargetsForTopic,
    sendTelegramMessages: (botToken: string, chatIds: unknown[], text: string) =>
      deps.messaging.sendTelegramMessages(botToken, chatIds, text),
    formatPriceForSms: (price: number) => deps.messaging.formatPriceForSms(price),
  };
}

export function createLocalSettingsRouteDeps(
  deps: CoreBusinessRouteRegistryDeps,
): LocalSettingsRoutesDeps {
  return {
    authorizeRole: deps.auth.authorizeRole,
    uploadsDir: deps.localSettings.uploadsDir,
    localCertDir: deps.localSettings.localCertDir,
    localHostsScriptPath: deps.localSettings.localHostsScriptPath,
    localMacHostsScriptPath: deps.localSettings.localMacHostsScriptPath,
    normalizeLocalHostname: deps.localSettings.normalizeLocalHostname,
    normalizeLocalSuffix: deps.localSettings.normalizeLocalSuffix,
    buildLocalDomain: deps.localSettings.buildLocalDomain,
    getLocalDomainHostIp: deps.localSettings.getLocalDomainHostIp,
    buildWindowsHostsSetupBatch: deps.localSettings.buildWindowsHostsSetupBatch,
    buildMacHostsSetupCommand: deps.localSettings.buildMacHostsSetupCommand,
    generateLocalCertificate: deps.localSettings.generateLocalCertificate,
  };
}

export function createFinancialOverviewReportRouteDeps(
  deps: CoreBusinessRouteRegistryDeps,
): FinancialOverviewReportRoutesDeps {
  return {
    authorizeRole: deps.auth.authorizeRole,
    allAsync: deps.db.allAsync,
    getAsync: deps.db.getAsync,
    getDebtorsList: deps.db.getDebtorsList,
    getCreditorsList: deps.db.getCreditorsList,
    buildRealizedProfitRecognitionReport: deps.reports.buildRealizedProfitRecognitionReport,
    getExpensesSummaryFromDb: deps.db.getExpensesSummaryFromDb,
    buildProductSalesCollectionsReport: deps.reports.buildProductSalesCollectionsReport,
    buildDiscountAwareInvoiceLines: deps.reports.buildDiscountAwareInvoiceLines,
  };
}

export function createSmartInsightReportRoutesDeps(
  deps: CoreBusinessRouteRegistryDeps,
): SmartInsightReportRoutesDeps {
  return {
    authorizeRole: deps.auth.authorizeRole,
    buildProductSalesCollectionsReport: deps.reports.buildProductSalesCollectionsReport,
    buildProductSalesCollectionRisk: deps.reports.buildProductSalesCollectionRisk,
    enrichCollectionCenterItems: deps.collectionCenter.enrichCollectionCenterItems,
  };
}

export function createCollectionCenterReportRouteDeps(
  deps: CoreBusinessRouteRegistryDeps,
): CollectionCenterReportRoutesDeps {
  return {
    authorizeRole: deps.auth.authorizeRole,
    buildCollectionCenterSourceFromISO: deps.collectionCenter.buildCollectionCenterSourceFromISO,
    buildProductSalesCollectionsReport: deps.reports.buildProductSalesCollectionsReport,
    buildProductSalesCollectionRisk: deps.reports.buildProductSalesCollectionRisk,
    shouldShowCollectionCenterItemForOperationalWindow:
      deps.collectionCenter.shouldShowCollectionCenterItemForOperationalWindow,
    buildDirectInstallmentCollectionItems: deps.collectionCenter.buildDirectInstallmentCollectionItems,
    getProductSalesDocKey: deps.reports.getProductSalesDocKey,
    enrichCollectionCenterItems: deps.collectionCenter.enrichCollectionCenterItems,
    collectionCenterToShamsiDisplay: deps.collectionCenter.collectionCenterToShamsiDisplay,
    collectionCenterDateDiffInDays: deps.collectionCenter.collectionCenterDateDiffInDays,
    collectionCenterOverdueDays: deps.collectionCenter.collectionCenterOverdueDays,
    collectionCenterKanbanMeta: deps.collectionCenter.collectionCenterKanbanMeta,
    summarizeCollectionCenter: deps.collectionCenter.summarizeCollectionCenter,
    collectionCenterActionMeta: deps.collectionCenter.collectionCenterActionMeta,
    defaultCollectionCenterNextDate: deps.collectionCenter.defaultCollectionCenterNextDate,
    buildCollectionCenterMarker: deps.collectionCenter.buildCollectionCenterMarker,
    formatReportMoneyText: deps.reports.formatReportMoneyText,
    addCustomerFollowupToDb: deps.db.addCustomerFollowupToDb,
    recordAiFeatureImpactEvent: deps.smartInsights.recordAiFeatureImpactEvent,
    ensureSmartInsightDecisionMemory: deps.smartInsights.ensureSmartInsightDecisionMemory,
    runAsync: deps.db.runAsync,
  };
}

export function createProductSalesDetailsReportRouteDeps(
  deps: CoreBusinessRouteRegistryDeps,
): ProductSalesDetailsReportRoutesDeps {
  return {
    authorizeRole: deps.auth.authorizeRole,
    buildProductSalesCollectionsReport: deps.reports.buildProductSalesCollectionsReport,
    matchesProductSalesDetailsQuery: deps.reports.matchesProductSalesDetailsQuery,
    getProductSalesDetailsDiscountAudit: deps.reports.getProductSalesDetailsDiscountAudit,
    summarizeProductSalesDetailsRows: deps.reports.summarizeProductSalesDetailsRows,
    buildProductSalesDetailsTopProducts: deps.reports.buildProductSalesDetailsTopProducts,
    buildProductSalesCalculationHealth: deps.reports.buildProductSalesCalculationHealth,
    buildProductSalesCollectionRisk: deps.reports.buildProductSalesCollectionRisk,
  };
}

export function createReportAutomationRoutesDeps(
  deps: CoreBusinessRouteRegistryDeps,
): ReportAutomationRoutesDeps {
  return {
    authorizeRole: deps.auth.authorizeRole,
    formatReportMoneyText: deps.reports.formatReportMoneyText,
    escapeHtml: (value: unknown) => deps.htmlFormatting.escapeHtml(value),
    safeReplaceTemplate: (template: string, vars: Record<string, unknown>) =>
      deps.messaging.safeReplaceTemplate(template, vars),
    sanitizeTelegramHtml: (html: string) => deps.htmlFormatting.sanitizeTelegramHtml(html),
    markdownishToHtml: (template: string) => deps.htmlFormatting.markdownishToHtml(template),
    telegramCard: (title: string, icon: string, lines: string[], footer?: string) =>
      deps.htmlFormatting.telegramCard(title, icon, lines, footer),
    getTelegramTargetsForTopic: deps.messaging.getTelegramTargetsForTopic,
    isTopicTypeEnabled: deps.messaging.isTopicTypeEnabled,
    insertSmsLog: (payload: unknown) => deps.messaging.insertSmsLog(payload),
  };
}
