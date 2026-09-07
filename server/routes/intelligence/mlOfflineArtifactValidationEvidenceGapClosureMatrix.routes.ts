import type { Express } from "express";
import {
  bootstrapOfflineArtifactValidationEvidenceGapClosureMatrixFromLatestEvidenceReviewPack,
  buildOfflineArtifactValidationEvidenceGapClosureMatrixSummary,
  createLatestOfflineArtifactValidationEvidenceGapClosureMatrixForQueueItem,
  createOfflineArtifactValidationEvidenceGapClosureMatrix,
  getLatestOfflineArtifactValidationEvidenceGapClosureMatrix,
  getOfflineArtifactValidationEvidenceGapClosureMatrix,
  listOfflineArtifactValidationEvidenceGapClosureMatrixRecords,
} from "../../intelligence/artifacts/validationReviewQueue/offlineArtifactValidationEvidenceGapClosureMatrix.service";
import type { IntelligenceRouteDeps } from "./types";

const readRequestUserId = (req: unknown): string | number | null => {
  const user = (req as { user?: { id?: string | number } }).user;
  return user?.id ?? null;
};

export const registerMlOfflineArtifactValidationEvidenceGapClosureMatrixRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.get(
    "/api/brain/ml-offline-artifacts/validation/evidence-gap-closure-matrix/summary",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = await buildOfflineArtifactValidationEvidenceGapClosureMatrixSummary();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-offline-artifacts/validation/evidence-gap-closure-matrix",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const items = await listOfflineArtifactValidationEvidenceGapClosureMatrixRecords(req.query.limit);
        res.json({ success: true, data: { items, total: items.length } });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-offline-artifacts/validation/evidence-gap-closure-matrix/:id",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await getOfflineArtifactValidationEvidenceGapClosureMatrix(req.params.id);
        if (!data) {
          res.status(404).json({ success: false, message: "Offline artifact evidence gap closure matrix was not found." });
          return;
        }
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/ml-offline-artifacts/validation/evidence-review-packs/:id/evidence-gap-closure-matrix",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await createOfflineArtifactValidationEvidenceGapClosureMatrix({
          evidenceReviewPackId: req.params.id,
          createdByUserId: readRequestUserId(req),
        });
        if (!data) {
          res.status(404).json({ success: false, message: "Offline artifact evidence review pack was not found; gap closure matrix was not created." });
          return;
        }
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/ml-offline-artifacts/validation/evidence-gap-closure-matrix/bootstrap-latest",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await bootstrapOfflineArtifactValidationEvidenceGapClosureMatrixFromLatestEvidenceReviewPack({ createdByUserId: readRequestUserId(req) });
        if (!data) {
          res.status(404).json({ success: false, message: "No offline artifact evidence review pack exists to build a gap closure matrix." });
          return;
        }
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/ml-offline-artifacts/validation/review-queue/:id/evidence-gap-closure-matrix/latest-pack",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await createLatestOfflineArtifactValidationEvidenceGapClosureMatrixForQueueItem({
          queueItemId: req.params.id,
          createdByUserId: readRequestUserId(req),
        });
        if (!data) {
          res.status(404).json({ success: false, message: "No evidence review pack exists for this review queue item." });
          return;
        }
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-offline-artifacts/validation/evidence-review-packs/:id/evidence-gap-closure-matrix/latest",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await getLatestOfflineArtifactValidationEvidenceGapClosureMatrix(req.params.id);
        if (!data) {
          res.status(404).json({ success: false, message: "No evidence gap closure matrix exists for this evidence review pack." });
          return;
        }
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );
};
