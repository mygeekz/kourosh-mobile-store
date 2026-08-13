import type { Express } from "express";
import { buildDataQualitySummary } from "../../intelligence/readiness/dataQuality.service";
import type { IntelligenceRouteDeps } from "./types";

export const registerDataQualityRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.get(
    "/api/brain/data-quality",
    authorizeRole(["Admin", "Manager", "Salesperson", "Marketer"]),
    async (_req, res, next) => {
      try {
        const data = await buildDataQualitySummary();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );
};
