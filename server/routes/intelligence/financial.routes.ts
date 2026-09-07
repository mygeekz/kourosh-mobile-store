import type { Express } from "express";
import {
  buildFinancialBrainData,
  FinancialBrainRangeError,
} from "../../intelligence/financial/financialBrain.service";
import type { IntelligenceRouteDeps } from "./types";

export const registerFinancialBrainRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.get(
    "/api/brain/financial",
    authorizeRole(["Admin", "Manager", "Salesperson", "Marketer"]),
    async (req, res, next) => {
      try {
        const data = await buildFinancialBrainData(req.query);
        res.json({ success: true, data });
      } catch (err) {
        if (err instanceof FinancialBrainRangeError) {
          return res.status(400).json({
            success: false,
            message: "بازه زمانی Financial Brain نامعتبر است.",
          });
        }
        next(err);
      }
    },
  );
};
