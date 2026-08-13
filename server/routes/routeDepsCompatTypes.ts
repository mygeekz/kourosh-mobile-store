/**
 * Backward-compatible route dependency type aliases.
 *
 * Canonical route deps types live next to their route modules using the
 * `XxxRoutesDeps` naming convention. This file gives legacy imports a single
 * compatibility surface without changing the route modules' runtime behavior.
 */
export type {
  CollectionCenterReportRoutesDeps,
  RegisterCollectionCenterReportRoutesDeps,
} from "./collectionCenterReports.routes";

export type {
  CustomerTrustRoutesDeps,
  RegisterCustomerTrustRoutesDeps,
} from "./customerTrust.routes";

export type {
  FinancialOverviewReportRoutesDeps,
  RegisterFinancialOverviewReportRoutesDeps,
} from "./financialOverviewReports.routes";

export type {
  LegacySalesRoutesDeps,
  LegacySalesDeps,
} from "./legacySales.routes";

export type {
  LocalSettingsRoutesDeps,
  RegisterLocalSettingsRoutesDeps,
} from "./localSettings.routes";

export type {
  CompareSalesReportRoutesDeps,
  ProductSalesSummaryReportRoutesDeps,
  ProductSalesDetailsReportRoutesDeps,
  RegisterCompareSalesReportRoutesDeps,
  RegisterProductSalesSummaryReportRoutesDeps,
  RegisterProductSalesDetailsReportRoutesDeps,
} from "./productSalesReports.routes";

export type {
  ReportAutomationRoutesDeps,
  ReportAutomationRouteDeps,
  ReportAutomationRuntime,
} from "./reportAutomation.routes";

export type {
  SalesOrderMutationRoutesDeps,
  SalesOrderMutationDeps,
} from "./salesOrderMutations.routes";

export type {
  SalesRiskRoutesDeps,
  RegisterSalesRiskRoutesDeps,
} from "./salesRisk.routes";

export type {
  SmartInsightReportRoutesDeps,
  SmartInsightReportRouteDeps,
} from "./smartInsightReport.routes";
