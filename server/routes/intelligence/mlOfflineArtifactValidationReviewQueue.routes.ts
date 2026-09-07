import type { Express } from "express";
import {
  applyOfflineArtifactValidationReviewDecision,
  bootstrapOfflineArtifactValidationReviewQueueFromLatestValidation,
  buildOfflineArtifactValidationReviewQueueSummary,
  createOfflineArtifactValidationReviewQueueItemFromResult,
  getOfflineArtifactValidationReviewQueueItem,
  listOfflineArtifactValidationReviewQueue,
} from "../../intelligence/artifacts/validationReviewQueue/offlineArtifactValidationReviewQueue.service";
import type { IntelligenceRouteDeps } from "./types";

const readRequestUserId = (req: unknown): string | number | null => {
  const user = (req as { user?: { id?: string | number } }).user;
  return user?.id ?? null;
};

export const registerMlOfflineArtifactValidationReviewQueueRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.get(
    "/api/brain/ml-offline-artifacts/validation/review-queue/summary",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = await buildOfflineArtifactValidationReviewQueueSummary();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-offline-artifacts/validation/review-queue",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const items = await listOfflineArtifactValidationReviewQueue(req.query.limit);
        res.json({ success: true, data: { items, total: items.length } });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-offline-artifacts/validation/review-queue/:id",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await getOfflineArtifactValidationReviewQueueItem(req.params.id);
        if (!data) {
          res.status(404).json({ success: false, message: "Offline artifact validation review queue item was not found." });
          return;
        }
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/ml-offline-artifacts/validation/review-queue/bootstrap-latest",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await bootstrapOfflineArtifactValidationReviewQueueFromLatestValidation({
          createdByUserId: readRequestUserId(req),
        });
        if (!data) {
          res.status(404).json({ success: false, message: "No validation result exists to place in the offline validation review queue." });
          return;
        }
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/ml-offline-artifacts/validation/results/:id/review-queue",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await createOfflineArtifactValidationReviewQueueItemFromResult({
          validationResultId: req.params.id,
          createdByUserId: readRequestUserId(req),
        });
        if (!data) {
          res.status(404).json({ success: false, message: "Offline artifact validation result was not found; no review queue item was created." });
          return;
        }
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/ml-offline-artifacts/validation/review-queue/:id/decision",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await applyOfflineArtifactValidationReviewDecision({
          queueItemId: req.params.id,
          reviewerDecision: req.body?.reviewerDecision || "not_reviewed",
          reviewerNotes: req.body?.reviewerNotes ?? null,
          reviewerEvidence: req.body?.reviewerEvidence ?? null,
          assignedReviewerId: req.body?.assignedReviewerId ?? null,
          reviewedByUserId: readRequestUserId(req),
        });
        if (!data) {
          res.status(404).json({ success: false, message: "Offline artifact validation review queue item was not found; no decision was recorded." });
          return;
        }
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );
};
