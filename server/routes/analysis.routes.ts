import type { Express } from "express";
import { analyzeProfitability, generatePurchaseSuggestions } from "../analysis";

type AuthorizeRole = (roles: string[]) => any;

type RegisterAnalysisRoutesDeps = {
  authorizeRole: AuthorizeRole;
};

export const registerAnalysisRoutes = (
  app: Express,
  { authorizeRole }: RegisterAnalysisRoutesDeps,
): void => {
  app.get(
    "/api/analysis/profitability",
    authorizeRole(["Admin"]),
    async (req, res, next) => {
      try {
        const fromDate = String(req.query.fromDate || "").trim() || undefined;
        const toDate = String(req.query.toDate || "").trim() || undefined;
        if (Boolean(fromDate) !== Boolean(toDate)) {
          return res.status(400).json({
            success: false,
            message: "برای تحلیل سودآوری، تاریخ شروع و پایان باید با هم انتخاب شوند.",
          });
        }
        res.json({ success: true, data: await analyzeProfitability(fromDate, toDate) });
      } catch (e) {
        next(e);
      }
    },
  );

  app.get(
    "/api/analysis/purchase-suggestions",
    authorizeRole(["Admin"]),
    async (_req, res, next) => {
      try {
        res.json({ success: true, data: await generatePurchaseSuggestions() });
      } catch (e) {
        next(e);
      }
    },
  );
};
