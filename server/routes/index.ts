import type { Express } from "express";
import { inventoryAlertsRouter } from "../inventoryAlerts";

export const registerModularRoutes = (app: Express): void => {
  app.use("/api/inventory/alerts", inventoryAlertsRouter);
  // Temporary compatibility alias for older clients and bookmarks.
  app.use("/inventory/alerts", inventoryAlertsRouter);
};
