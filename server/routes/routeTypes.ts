/**
 * Type-only route boundary exports.
 *
 * Keep this file free of runtime exports so route modules can share backend
 * contracts without adding app/runtime dependencies or changing behavior.
 */
export type {
  AnyFn,
  AuthorizeRole,
  CoreBusinessAuthDeps,
  CoreBusinessCustomerDeps,
  CoreBusinessDbDeps,
  CoreBusinessSalesAdvisorDeps,
  CoreBusinessMessagingDeps,
  CoreBusinessReportsDeps,
  CoreBusinessLocalSettingsDeps,
  CoreBusinessCollectionCenterDeps,
  CoreBusinessSmartInsightDeps,
  CoreBusinessHtmlFormattingDeps,
  CoreBusinessRouteRegistryDeps,
  CoreBusinessRouteRegistryResult,
} from "./coreBusinessRouteTypes";

export type {
  CollectionCenterReportRoutesDeps,
  RegisterCollectionCenterReportRoutesDeps,
  CustomerTrustRoutesDeps,
  RegisterCustomerTrustRoutesDeps,
  FinancialOverviewReportRoutesDeps,
  RegisterFinancialOverviewReportRoutesDeps,
  LegacySalesRoutesDeps,
  LegacySalesDeps,
  LocalSettingsRoutesDeps,
  RegisterLocalSettingsRoutesDeps,
  CompareSalesReportRoutesDeps,
  ProductSalesSummaryReportRoutesDeps,
  ProductSalesDetailsReportRoutesDeps,
  RegisterCompareSalesReportRoutesDeps,
  RegisterProductSalesSummaryReportRoutesDeps,
  RegisterProductSalesDetailsReportRoutesDeps,
  ReportAutomationRoutesDeps,
  ReportAutomationRouteDeps,
  ReportAutomationRuntime,
  SalesOrderMutationRoutesDeps,
  SalesOrderMutationDeps,
  SalesRiskRoutesDeps,
  RegisterSalesRiskRoutesDeps,
  SmartInsightReportRoutesDeps,
  SmartInsightReportRouteDeps,
} from "./routeDepsCompatTypes";
