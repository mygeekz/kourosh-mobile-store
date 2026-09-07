import type { Express } from "express";
import {
  buildPredictiveOutcomeSummary,
  getPredictiveRunDetails,
  listPredictiveRuns,
  recordPredictiveOutcome,
  recordPredictiveRun,
} from "../../intelligence/predictive/predictionOutcomeTracking.service";
import { buildPredictionAccuracySummary } from "../../intelligence/evaluation/predictionAccuracy.service";
import { evaluatePendingPredictionOutcomes } from "../../intelligence/evaluation/predictionOutcomeEvaluator";
import type { IntelligenceRouteDeps } from "./types";

export const registerPredictionAccuracyRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.post(
    "/api/brain/predictive/outcomes",
    authorizeRole(["Admin", "Manager", "Salesperson", "Marketer"]),
    async (req, res, next) => {
      try {
        const outcome = await recordPredictiveOutcome(
          req.body || {},
          (req as any).user?.id || null,
        );
        res.json({ success: true, data: { outcome } });
      } catch (err: any) {
        if (String(err?.message || "").includes("شناسه run")) {
          return res.status(400).json({ success: false, message: err.message });
        }
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/predictive/outcomes/summary",
    authorizeRole(["Admin", "Manager", "Salesperson", "Marketer"]),
    async (req, res, next) => {
      try {
        const summary = await buildPredictiveOutcomeSummary(
          req.query as Record<string, unknown>,
        );
        res.json({ success: true, data: summary });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/predictive/accuracy",
    authorizeRole(["Admin", "Manager", "Salesperson", "Marketer"]),
    async (_req, res, next) => {
      try {
        const data = await buildPredictionAccuracySummary();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/predictive/outcomes/evaluate",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await evaluatePendingPredictionOutcomes(req.body || {});
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );
};
