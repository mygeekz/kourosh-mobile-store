import type { Express, NextFunction, Request, RequestHandler, Response } from "express";
import { addAuditLog } from "../database";
import { inventoryService } from "../services/inventory.service";

type AuthorizeRole = (allowed: string[]) => RequestHandler;

type InventoryRouteDeps = {
  authorizeRole: AuthorizeRole;
};

const INVENTORY_ROLES = ["Admin", "Manager", "Warehouse"];
const REPORT_ROLES = ["Admin", "Manager", "Salesperson", "Marketer"];

export const registerInventoryRoutes = (
  app: Express,
  { authorizeRole }: InventoryRouteDeps,
): void => {
  // =====================================================
  // P0: Stock Count (inventory counting)
  // =====================================================
  app.post(
    "/api/stock-counts",
    authorizeRole(INVENTORY_ROLES),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        // @ts-ignore
        const userId = req.user?.id;
        const sc = await inventoryService.createStockCount({
          title: req.body?.title,
          notes: req.body?.notes,
          createdByUserId: userId || null,
        });
        if (req.user) {
          try {
            addAuditLog(
              req.user.id,
              req.user.username,
              req.user.roleName,
              "create",
              "stock_count",
              sc?.id || null,
              `ایجاد انبارگردانی #${sc?.id ?? ""}`,
            );
          } catch {}
        }
        return res.status(201).json({ success: true, data: sc });
      } catch (e) {
        next(e);
      }
    },
  );

  app.get(
    "/api/stock-counts",
    authorizeRole(INVENTORY_ROLES),
    async (_req: Request, res: Response, next: NextFunction) => {
      try {
        const rows = await inventoryService.listStockCounts();
        return res.json({ success: true, data: rows });
      } catch (e) {
        next(e);
      }
    },
  );

  app.get(
    "/api/stock-counts/:id",
    authorizeRole(INVENTORY_ROLES),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const id = Number(req.params.id);
        if (!id)
          return res
            .status(400)
            .json({ success: false, message: "شناسه نامعتبر است." });
        const sc = await inventoryService.getStockCountById(id);
        if (!sc)
          return res
            .status(404)
            .json({ success: false, message: "انبارگردانی یافت نشد." });
        return res.json({ success: true, data: sc });
      } catch (e) {
        next(e);
      }
    },
  );

  app.post(
    "/api/stock-counts/:id/items",
    authorizeRole(INVENTORY_ROLES),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const id = Number(req.params.id);
        if (!id)
          return res
            .status(400)
            .json({ success: false, message: "شناسه نامعتبر است." });
        const productId = Number(req.body?.productId);
        const countedQty = Number(req.body?.countedQty);
        if (!productId || !Number.isFinite(countedQty))
          return res
            .status(400)
            .json({ success: false, message: "پارامترها نامعتبر است." });
        await inventoryService.upsertStockCountItem(id, productId, countedQty);
        return res.json({ success: true });
      } catch (e) {
        next(e);
      }
    },
  );

  app.post(
    "/api/stock-counts/:id/complete",
    authorizeRole(INVENTORY_ROLES),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const id = Number(req.params.id);
        if (!id)
          return res
            .status(400)
            .json({ success: false, message: "شناسه نامعتبر است." });
        // @ts-ignore
        const userId = req.user?.id;
        const sc = await inventoryService.completeStockCount(id, userId || null);
        if (req.user) {
          try {
            addAuditLog(
              req.user.id,
              req.user.username,
              req.user.roleName,
              "update",
              "stock_count",
              id,
              `اتمام انبارگردانی #${id}`,
            );
          } catch {}
        }
        return res.json({ success: true, data: sc });
      } catch (e) {
        next(e);
      }
    },
  );

  // =====================================================
  // Inventory Adjustments (increase/decrease stock with FIFO ledger)
  // =====================================================
  app.post(
    "/api/inventory/adjustments",
    authorizeRole(["Admin", "Manager"]),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const payload = req.body as any;
        const data = await inventoryService.createInventoryAdjustment({
          productId: Number(payload.productId),
          direction: payload.direction,
          quantity: Number(payload.quantity),
          unitCost: payload.unitCost != null ? Number(payload.unitCost) : 0,
          reason: payload.reason,
          entryDate: String(payload.entryDate || new Date().toISOString()),
        });
        res.status(201).json({ success: true, data });
      } catch (e) {
        next(e);
      }
    },
  );

  app.get(
    "/api/analysis/inventory-velocity",
    authorizeRole(["Admin"]),
    async (_req: Request, res: Response, next: NextFunction) => {
      try {
        res.json({ success: true, data: await inventoryService.analyzeInventoryVelocity() });
      } catch (e) {
        next(e);
      }
    },
  );

  app.get(
    "/api/reports/inventory-turnover",
    authorizeRole(REPORT_ROLES),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { fromISO, toISO } = req.query;
        if (!fromISO || !toISO)
          return res
            .status(400)
            .json({ success: false, message: "fromISO و toISO الزامی است." });
        const data = await inventoryService.getInventoryTurnoverReport(
          String(fromISO),
          String(toISO),
        );
        res.json({ success: true, data });
      } catch (e) {
        next(e);
      }
    },
  );

  app.get(
    "/api/reports/dead-stock",
    authorizeRole(REPORT_ROLES),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const days = Number(req.query.days ?? 60);
        const data = await inventoryService.getDeadStockReport(Math.max(1, days));
        res.json({ success: true, data });
      } catch (e) {
        next(e);
      }
    },
  );

  app.get(
    "/api/reports/abc",
    authorizeRole(REPORT_ROLES),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { fromISO, toISO, metric } = req.query;
        if (!fromISO || !toISO)
          return res
            .status(400)
            .json({ success: false, message: "fromISO و toISO الزامی است." });
        const m = (metric === "profit" ? "profit" : "sales") as any;
        const data = await inventoryService.getAbcReport(String(fromISO), String(toISO), m);
        res.json({ success: true, data });
      } catch (e) {
        next(e);
      }
    },
  );
};
