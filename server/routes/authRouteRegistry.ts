import type { Express } from "express";
import {
  registerProtectedAuthRoutes,
  registerPublicAuthRoutes,
  type ProtectedAuthRouteDeps,
  type PublicAuthRouteDeps,
} from "./auth.routes";
import { registerInitialSetupRoutes } from "./initialSetup.routes";
import { registerSearchRoutes } from "./search.routes";
import { registerBarcodeRoutes } from "./barcode.routes";
import { registerMiniAppRoutes } from "./miniapp.routes";

export function registerPublicAppRoutes(
  app: Express,
  deps: PublicAuthRouteDeps,
): void {
  registerInitialSetupRoutes(app);
  registerPublicAuthRoutes(app, deps);
  // Mini App routes own their Telegram validation and isolated session guard.
  // Register them before the dashboard's bearer-token gate.
  registerMiniAppRoutes(app);
}

export function registerPreTokenUtilityRoutes(app: Express): void {
  registerSearchRoutes(app);
  registerBarcodeRoutes(app);
}

export function registerProtectedAuthAppRoutes(
  app: Express,
  deps: ProtectedAuthRouteDeps,
): void {
  registerProtectedAuthRoutes(app, deps);
}
