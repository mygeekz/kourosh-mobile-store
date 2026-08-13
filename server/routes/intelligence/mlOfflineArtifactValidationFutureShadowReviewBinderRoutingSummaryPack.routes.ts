import type { Express } from "express";
import {
  bootstrapOfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackFromLatestReviewBinder,
  buildOfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackSummary,
  createLatestOfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackForEligibilityGate,
  createOfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPack,
  getLatestOfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPack,
  getOfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPack,
  listOfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackRecords,
} from "../../intelligence/artifacts/validationReviewQueue/offlineArtifactValidationFutureShadowReviewBinderRoutingSummaryPack.service";
import type { IntelligenceRouteDeps } from "./types";

const readRequestUserId = (req: unknown): string | number | null => {
  const user = (req as { user?: { id?: string | number } }).user;
  return user?.id ?? null;
};

export const registerMlOfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.get(
    "/api/brain/ml-offline-artifacts/validation/future-shadow-review-binder-routing-summary-packs/summary",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = await buildOfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackSummary();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-offline-artifacts/validation/future-shadow-review-binder-routing-summary-packs",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const items = await listOfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackRecords(req.query.limit);
        res.json({ success: true, data: { items, total: items.length } });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-offline-artifacts/validation/future-shadow-review-binder-routing-summary-packs/:id",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await getOfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPack(req.params.id);
        if (!data) {
          res.status(404).json({ success: false, message: "Offline artifact future shadow review binder routing summary pack was not found." });
          return;
        }
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/ml-offline-artifacts/validation/future-shadow-eligibility-review-binders/:id/future-shadow-review-binder-routing-summary-pack",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await createOfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPack({
          futureShadowEligibilityReviewBinderId: req.params.id,
          createdByUserId: readRequestUserId(req),
        });
        if (!data) {
          res.status(404).json({ success: false, message: "Offline artifact future shadow eligibility review binder was not found; routing summary pack was not created." });
          return;
        }
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/ml-offline-artifacts/validation/future-shadow-review-binder-routing-summary-packs/bootstrap-latest",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await bootstrapOfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackFromLatestReviewBinder({
          createdByUserId: readRequestUserId(req),
        });
        if (!data) {
          res.status(404).json({ success: false, message: "No future shadow eligibility review binder exists to build a routing summary pack." });
          return;
        }
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/ml-offline-artifacts/validation/future-shadow-eligibility-gates/:id/future-shadow-review-binder-routing-summary-pack/latest-binder",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await createLatestOfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPackForEligibilityGate({
          futureShadowEligibilityGateId: req.params.id,
          createdByUserId: readRequestUserId(req),
        });
        if (!data) {
          res.status(404).json({ success: false, message: "No future shadow eligibility review binder exists for this eligibility gate." });
          return;
        }
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-offline-artifacts/validation/future-shadow-eligibility-review-binders/:id/future-shadow-review-binder-routing-summary-pack/latest",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await getLatestOfflineArtifactValidationFutureShadowReviewBinderRoutingSummaryPack(req.params.id);
        if (!data) {
          res.status(404).json({ success: false, message: "No future shadow review binder routing summary pack exists for this review binder." });
          return;
        }
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );
};
