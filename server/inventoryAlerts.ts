import { Router } from "express";
import { getDbInstance } from "./database";

/**
 * لیست کالاهایی که موجودی‌شان کمتر یا مساوی threshold است
 * GET /inventory/alerts
 */
export const inventoryAlertsRouter = Router();

inventoryAlertsRouter.get("/", async (_req, res, next) => {
  try {
    const db = await getDbInstance();
    if (!db) throw new Error("Database is not initialized");

    db.all(
      "SELECT productId, quantity, threshold FROM inventory WHERE quantity <= threshold",
      [],
      (err: any, rows: any[]) => {
        if (err) return next(err);
        res.json(rows ?? []);
      }
    );
  } catch (e) {
    next(e);
  }
});
