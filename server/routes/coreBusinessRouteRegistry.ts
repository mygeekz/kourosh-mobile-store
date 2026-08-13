import type { Express } from "express";
import type { CoreBusinessRouteRegistryDeps, CoreBusinessRouteRegistryResult } from "./routeTypes";
import {
  registerAutomationRouteGroup,
  registerCustomerPartnerRouteGroup,
  registerAnalyticsAndFinancialRouteGroup,
  registerIntelligenceAndOperationalReportsRouteGroup,
  registerOperationalRouteGroup,
  registerSalesReportsRouteGroup,
  registerSalesRouteGroup,
  registerSettingsAndInstallmentsRouteGroup,
} from "./coreBusinessRouteMicroRegistrars";

export function registerCoreBusinessRoutes(
  app: Express,
  deps: CoreBusinessRouteRegistryDeps,
): CoreBusinessRouteRegistryResult {
  registerOperationalRouteGroup(app, deps);
  registerSalesRouteGroup(app, deps);
  registerCustomerPartnerRouteGroup(app, deps);
  registerSalesReportsRouteGroup(app, deps);
  registerSettingsAndInstallmentsRouteGroup(app, deps);
  registerAnalyticsAndFinancialRouteGroup(app, deps);
  registerIntelligenceAndOperationalReportsRouteGroup(app, deps);

  const reportAutomationRuntime = registerAutomationRouteGroup(app, deps);

  return { reportAutomationRuntime };
}
