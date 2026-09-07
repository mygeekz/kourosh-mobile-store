import type { Express } from "express";
import { buildModelReadinessSummary } from "../../intelligence/readiness/modelReadiness.service";
import type { IntelligenceRouteDeps } from "./types";

export const registerModelReadinessRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.get(
    "/api/brain/model-readiness",
    authorizeRole(["Admin", "Manager", "Salesperson", "Marketer"]),
    async (_req, res, next) => {
      try {
        const data = await buildModelReadinessSummary();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );
};
