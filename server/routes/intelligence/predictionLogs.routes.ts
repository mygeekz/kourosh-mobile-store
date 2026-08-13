import type { Express } from "express";
import {
  buildPredictiveOutcomeSummary,
  getPredictiveRunDetails,
  listPredictiveRuns,
  recordPredictiveOutcome,
  recordPredictiveRun,
} from "../../intelligence/predictive/predictionOutcomeTracking.service";
import type { IntelligenceRouteDeps } from "./types";

export const registerPredictionLogsRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.get(
    "/api/brain/predictive/logs",
    authorizeRole(["Admin", "Manager", "Salesperson", "Marketer"]),
    async (req, res, next) => {
      try {
        const runs = await listPredictiveRuns(req.query as Record<string, unknown>);
        res.json({ success: true, data: { runs, total: runs.length } });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/predictive/logs/:id",
    authorizeRole(["Admin", "Manager", "Salesperson", "Marketer"]),
    async (req, res, next) => {
      try {
        const runId = Number(req.params.id);
        if (!Number.isFinite(runId) || runId <= 0) {
          return res.status(400).json({
            success: false,
            message: "شناسه پیش‌بینی نامعتبر است.",
          });
        }
        const run = await getPredictiveRunDetails(runId);
        if (!run) {
          return res.status(404).json({
            success: false,
            message: "گزارش پیش‌بینی پیدا نشد.",
          });
        }
        res.json({ success: true, data: { run } });
      } catch (err) {
        next(err);
      }
    },
  );
};
