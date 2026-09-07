import type { Express } from "express";
import {
  buildOfflineArtifactValidationSummary,
  getLatestOfflineArtifactValidationByArtifactId,
  getOfflineArtifactValidationResult,
  listOfflineArtifactDeepValidationResults,
  validateOfflineArtifactById,
} from "../../intelligence/artifacts/validation/offlineArtifactValidation.service";
import type { IntelligenceRouteDeps } from "./types";

const readRequestUserId = (req: unknown): string | number | null => {
  const user = (req as { user?: { id?: string | number } }).user;
  return user?.id ?? null;
};

export const registerMlOfflineArtifactValidationRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.get(
    "/api/brain/ml-offline-artifacts/validation/summary",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = await buildOfflineArtifactValidationSummary();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-offline-artifacts/validation/results",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const results = await listOfflineArtifactDeepValidationResults(req.query.limit);
        res.json({ success: true, data: { results, total: results.length } });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-offline-artifacts/validation/results/:id",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const result = await getOfflineArtifactValidationResult(req.params.id);
        if (!result) {
          res.status(404).json({ success: false, message: "Offline artifact validation result was not found." });
          return;
        }
        res.json({ success: true, data: result });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/ml-offline-artifacts/:id/validate-deep",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await validateOfflineArtifactById({
          artifactId: req.params.id,
          createdByUserId: readRequestUserId(req),
        });
        if (!data) {
          res.status(404).json({ success: false, message: "Offline artifact record was not found; no validation was recorded." });
          return;
        }
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-offline-artifacts/:id/validation",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await getLatestOfflineArtifactValidationByArtifactId(req.params.id);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );
};
