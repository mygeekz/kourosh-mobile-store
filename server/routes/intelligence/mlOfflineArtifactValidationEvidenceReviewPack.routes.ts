import type { Express } from "express";
import {
  bootstrapOfflineArtifactValidationEvidenceReviewPackFromLatestQueueItem,
  buildOfflineArtifactValidationEvidenceReviewPackSummary,
  createOfflineArtifactValidationEvidenceReviewPack,
  getLatestOfflineArtifactValidationEvidenceReviewPack,
  getOfflineArtifactValidationEvidenceReviewPack,
  listOfflineArtifactValidationEvidenceReviewPackRecords,
} from "../../intelligence/artifacts/validationReviewQueue/offlineArtifactValidationEvidenceReviewPack.service";
import type { IntelligenceRouteDeps } from "./types";

const readRequestUserId = (req: unknown): string | number | null => {
  const user = (req as { user?: { id?: string | number } }).user;
  return user?.id ?? null;
};

export const registerMlOfflineArtifactValidationEvidenceReviewPackRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.get(
    "/api/brain/ml-offline-artifacts/validation/evidence-review-packs/summary",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = await buildOfflineArtifactValidationEvidenceReviewPackSummary();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-offline-artifacts/validation/evidence-review-packs",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const items = await listOfflineArtifactValidationEvidenceReviewPackRecords(req.query.limit);
        res.json({ success: true, data: { items, total: items.length } });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-offline-artifacts/validation/evidence-review-packs/:id",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await getOfflineArtifactValidationEvidenceReviewPack(req.params.id);
        if (!data) {
          res.status(404).json({ success: false, message: "Offline artifact validation evidence review pack was not found." });
          return;
        }
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/ml-offline-artifacts/validation/review-queue/:id/evidence-review-pack",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await createOfflineArtifactValidationEvidenceReviewPack({
          queueItemId: req.params.id,
          createdByUserId: readRequestUserId(req),
        });
        if (!data) {
          res.status(404).json({ success: false, message: "Offline artifact validation review queue item was not found; evidence review pack was not created." });
          return;
        }
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/ml-offline-artifacts/validation/evidence-review-packs/bootstrap-latest",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await bootstrapOfflineArtifactValidationEvidenceReviewPackFromLatestQueueItem({ createdByUserId: readRequestUserId(req) });
        if (!data) {
          res.status(404).json({ success: false, message: "No offline artifact validation review queue item exists to package." });
          return;
        }
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-offline-artifacts/validation/review-queue/:id/evidence-review-pack/latest",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await getLatestOfflineArtifactValidationEvidenceReviewPack(req.params.id);
        if (!data) {
          res.status(404).json({ success: false, message: "No evidence review pack exists for this offline artifact validation review queue item." });
          return;
        }
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );
};
