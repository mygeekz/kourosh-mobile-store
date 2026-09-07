import type { Express } from "express";
import {
  bootstrapOfflineArtifactValidationFutureShadowBoardReviewPacketFromLatestRoutingSummaryPack,
  buildOfflineArtifactValidationFutureShadowBoardReviewPacketSummary,
  createLatestOfflineArtifactValidationFutureShadowBoardReviewPacketForReviewBinder,
  createOfflineArtifactValidationFutureShadowBoardReviewPacket,
  getLatestOfflineArtifactValidationFutureShadowBoardReviewPacket,
  getOfflineArtifactValidationFutureShadowBoardReviewPacket,
  listOfflineArtifactValidationFutureShadowBoardReviewPacketRecords,
} from "../../intelligence/artifacts/validationReviewQueue/offlineArtifactValidationFutureShadowBoardReviewPacket.service";
import type { IntelligenceRouteDeps } from "./types";

const readRequestUserId = (req: unknown): string | number | null => {
  const user = (req as { user?: { id?: string | number } }).user;
  return user?.id ?? null;
};

export const registerMlOfflineArtifactValidationFutureShadowBoardReviewPacketRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.get(
    "/api/brain/ml-offline-artifacts/validation/future-shadow-board-review-packets/summary",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = await buildOfflineArtifactValidationFutureShadowBoardReviewPacketSummary();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-offline-artifacts/validation/future-shadow-board-review-packets",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const items = await listOfflineArtifactValidationFutureShadowBoardReviewPacketRecords(req.query.limit);
        res.json({ success: true, data: { items, total: items.length } });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-offline-artifacts/validation/future-shadow-board-review-packets/:id",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await getOfflineArtifactValidationFutureShadowBoardReviewPacket(req.params.id);
        if (!data) {
          res.status(404).json({ success: false, message: "Offline artifact future shadow board review packet was not found." });
          return;
        }
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/ml-offline-artifacts/validation/future-shadow-review-binder-routing-summary-packs/:id/future-shadow-board-review-packet",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await createOfflineArtifactValidationFutureShadowBoardReviewPacket({
          futureShadowReviewBinderRoutingSummaryPackId: req.params.id,
          createdByUserId: readRequestUserId(req),
        });
        if (!data) {
          res.status(404).json({ success: false, message: "Offline artifact future shadow review binder routing summary pack was not found; board review packet was not created." });
          return;
        }
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/ml-offline-artifacts/validation/future-shadow-board-review-packets/bootstrap-latest",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await bootstrapOfflineArtifactValidationFutureShadowBoardReviewPacketFromLatestRoutingSummaryPack({
          createdByUserId: readRequestUserId(req),
        });
        if (!data) {
          res.status(404).json({ success: false, message: "No future shadow review binder routing summary pack exists to build a board review packet." });
          return;
        }
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/ml-offline-artifacts/validation/future-shadow-eligibility-review-binders/:id/future-shadow-board-review-packet/latest-routing-summary",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await createLatestOfflineArtifactValidationFutureShadowBoardReviewPacketForReviewBinder({
          futureShadowEligibilityReviewBinderId: req.params.id,
          createdByUserId: readRequestUserId(req),
        });
        if (!data) {
          res.status(404).json({ success: false, message: "No routing summary pack exists for this future shadow eligibility review binder." });
          return;
        }
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-offline-artifacts/validation/future-shadow-review-binder-routing-summary-packs/:id/future-shadow-board-review-packet/latest",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await getLatestOfflineArtifactValidationFutureShadowBoardReviewPacket(req.params.id);
        if (!data) {
          res.status(404).json({ success: false, message: "No future shadow board review packet exists for this routing summary pack." });
          return;
        }
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );
};
