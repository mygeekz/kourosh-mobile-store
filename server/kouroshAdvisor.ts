import type { Express } from "express";
import type { AuthorizeRole } from "./routes/intelligence/types";
import { allAsync } from "./db/query";
import { type InventoryCurrentRow, type InventoryLabeledRow } from "./advisory/inventoryStockoutModel";
import { runInventoryAdvisoryInference } from "./advisory/advisoryInference";

const number = (value: unknown): number => Number.isFinite(Number(value)) ? Number(value) : 0;

export const readInventoryTrainingRows = async (): Promise<InventoryLabeledRow[]> => {
  const rows = await allAsync(`
    SELECT pfs.id AS snapshotId, pfs.entity_id AS productId,
           COALESCE(per.createdAt, pfs.created_at) AS observedAt,
           pfs.features_json AS featuresJson, poe.metricsJson AS outcomeMetricsJson
    FROM predictive_feature_snapshots pfs
    JOIN predictive_engine_runs per ON per.id = pfs.run_id
    JOIN predictive_outcome_events poe ON poe.runId = pfs.run_id AND poe.predictionType = 'inventory_stockout'
    WHERE pfs.prediction_type = 'inventory_stockout'
    ORDER BY observedAt ASC, pfs.id ASC
    LIMIT 10000
  `).catch(() => []);
  return rows.flatMap((row: any) => {
    try {
      const features = JSON.parse(row.featuresJson || "{}");
      const metrics = JSON.parse(row.outcomeMetricsJson || "{}");
      const outcome = Array.isArray(metrics.items) ? metrics.items.find((item: any) => String(item.productId) === String(row.productId)) : null;
      const label = outcome?.actualStockoutOccurred;
      if (!(label === true || label === false || label === 1 || label === 0)) return [];
      return [{ snapshotId: number(row.snapshotId), productId: String(row.productId), observedAt: String(row.observedAt), stockQuantity: number(features.stockQuantity), soldQty14: number(features.soldQty14), avgDailySold: number(features.avgDailySold), thresholdQty: number(features.thresholdQty), actualStockoutWithinHorizon: (label === true || label === 1 ? 1 : 0) as 0 | 1 }];
    } catch { return []; }
  });
};

export const readCurrentInventoryRows = async (): Promise<InventoryCurrentRow[]> => {
  const rows = await allAsync(`
    SELECT p.id AS productId, p.name AS productName, COALESCE(p.stock_quantity, 0) AS stockQuantity,
           COALESCE(p.threshold, 5) AS thresholdQty,
           COALESCE(SUM(CASE WHEN so.id IS NOT NULL THEN soi.quantity ELSE 0 END), 0) AS soldQty14
    FROM products p
    LEFT JOIN sales_order_items soi ON soi.itemType = 'inventory' AND soi.itemId = p.id
    LEFT JOIN sales_orders so ON so.id = soi.orderId AND date(substr(so.transactionDate, 1, 10)) BETWEEN date('now', '-13 days') AND date('now') AND COALESCE(so.status, 'active') = 'active'
    GROUP BY p.id, p.name, p.stock_quantity, p.threshold ORDER BY p.id ASC
  `).catch(() => []);
  return rows.map((row: any) => ({ productId: String(row.productId), productName: String(row.productName || "کالا"), stockQuantity: number(row.stockQuantity), thresholdQty: number(row.thresholdQty), soldQty14: number(row.soldQty14), avgDailySold: number(row.soldQty14) / 14 }));
};

export const getInventoryMlAdvisory = async () => {
  const [labeledRows, currentRows] = await Promise.all([
    readInventoryTrainingRows(),
    readCurrentInventoryRows(),
  ]);
  return runInventoryAdvisoryInference(labeledRows, currentRows);
};

export const registerKouroshAdvisorRoutes = (app: Express, authorizeRole: AuthorizeRole): void => {
  app.get("/api/intelligence/advisory/inventory-stockout", authorizeRole(["Admin", "Manager", "Warehouse"]), async (_request, response, next) => {
    try { response.json({ success: true, data: await getInventoryMlAdvisory() }); } catch (error) { next(error); }
  });
};
