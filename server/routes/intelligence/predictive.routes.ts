import type { Express } from "express";
import {
  buildPredictiveEngineData,
  PredictiveRangeError,
} from "../../intelligence/predictive/predictiveEngine.service";
import {
  buildPredictiveOutcomeSummary,
  getPredictiveRunDetails,
  listPredictiveRuns,
  recordPredictiveOutcome,
  recordPredictiveRun,
} from "../../intelligence/predictive/predictionOutcomeTracking.service";
import type { IntelligenceRouteDeps } from "./types";

export const registerPredictiveRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.get(
    "/api/brain/predictive",
    authorizeRole(["Admin", "Manager", "Salesperson", "Marketer"]),
    async (req, res, next) => {
      try {
        const data = await buildPredictiveEngineData(req.query);
        const tracking = await recordPredictiveRun(
          data,
          req.query as Record<string, unknown>,
          (req as any).user?.id || null,
        );
        res.json({
          success: true,
          data: {
            ...data,
            tracking: {
              predictionRunId: tracking.runId,
              predictionRunKey: tracking.runKey,
              deduplicated: tracking.deduplicated,
            },
          },
        });
      } catch (err) {
        if (err instanceof PredictiveRangeError) {
          return res.status(400).json({
            success: false,
            message: "بازه زمانی پیش‌بینی نامعتبر است.",
          });
        }
        next(err);
      }
    },
  );
};
