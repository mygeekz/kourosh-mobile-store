import type { Express, RequestHandler } from "express";
import { purchasesService } from "../services/purchases.service";

type AuthorizeRole = (allowed: string[]) => RequestHandler;

type PurchasesRouteDeps = {
  authorizeRole: AuthorizeRole;
};

const PURCHASE_ROLES = ["Admin", "Manager", "Warehouse"];

export const registerPurchasesRoutes = (
  app: Express,
  { authorizeRole }: PurchasesRouteDeps,
): void => {
  app.post(
    "/api/purchases",
    authorizeRole(PURCHASE_ROLES),
    async (req, res, next) => {
      try {
        const data = await purchasesService.createPurchase({
          body: req.body,
          user: (req as any).user,
        });
        return res.status(201).json({ success: true, data });
      } catch (e) {
        next(e);
      }
    },
  );

  app.get(
    "/api/purchases",
    authorizeRole(PURCHASE_ROLES),
    async (_req, res, next) => {
      try {
        const rows = await purchasesService.listPurchases();
        return res.json({ success: true, data: rows });
      } catch (e) {
        next(e);
      }
    },
  );

  app.get(
    "/api/purchases/:id",
    authorizeRole(PURCHASE_ROLES),
    async (req, res, next) => {
      try {
        const id = Number(req.params.id);
        if (!id)
          return res
            .status(400)
            .json({ success: false, message: "شناسه نامعتبر است." });
        const row = await purchasesService.getPurchaseById(id);
        if (!row)
          return res
            .status(404)
            .json({ success: false, message: "رسید خرید یافت نشد." });
        return res.json({ success: true, data: row });
      } catch (e) {
        next(e);
      }
    },
  );
};
