import type { Express } from "express";
import {
  buildInventoryStockoutShadowObservationEventStore,
  buildInventoryStockoutShadowObservationEventStoreContract,
  buildMlShadowObservationEventStoreCatalogSummary,
  listInventoryStockoutShadowObservationEvents,
  recordInventoryStockoutShadowObservationEvent,
} from "../../intelligence/datasets/inventoryStockoutShadowObservationEventStore.service";
import type { IntelligenceRouteDeps } from "./types";

export const registerMlShadowObservationEventStoreRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.get(
    "/api/brain/ml-shadow-observation-events/summary",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = await buildMlShadowObservationEventStoreCatalogSummary();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/shadow-observation-event-store/contract",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = buildInventoryStockoutShadowObservationEventStoreContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/shadow-observation-event-store",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutShadowObservationEventStore(req.params.id, req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/shadow-observation-events",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const observationEvents = await listInventoryStockoutShadowObservationEvents(req.params.id);
        res.json({ success: true, data: { observationEvents, total: observationEvents.length } });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/ml-model-imports/:id/shadow-observation-events",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await recordInventoryStockoutShadowObservationEvent({
          ...(req.body || {}),
          importId: req.params.id,
          userId: (req as any).user?.id || null,
        });
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );
};
