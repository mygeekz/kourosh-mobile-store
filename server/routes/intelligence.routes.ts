import type { Express } from "express";
import { registerIntelligenceRouteModules } from "./intelligence";
import type { IntelligenceRouteDeps } from "./intelligence/types";

export const registerIntelligenceRoutes = (
  app: Express,
  deps: IntelligenceRouteDeps,
): void => {
  registerIntelligenceRouteModules(app, deps);
};
