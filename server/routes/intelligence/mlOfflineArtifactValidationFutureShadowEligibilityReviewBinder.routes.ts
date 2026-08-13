import type { Express } from "express";
import {
  bootstrapOfflineArtifactValidationFutureShadowEligibilityReviewBinderFromLatestGate,
  buildOfflineArtifactValidationFutureShadowEligibilityReviewBinderSummary,
  createLatestOfflineArtifactValidationFutureShadowEligibilityReviewBinderForSignoffPack,
  createOfflineArtifactValidationFutureShadowEligibilityReviewBinder,
  getLatestOfflineArtifactValidationFutureShadowEligibilityReviewBinder,
  getOfflineArtifactValidationFutureShadowEligibilityReviewBinder,
  listOfflineArtifactValidationFutureShadowEligibilityReviewBinderRecords,
} from "../../intelligence/artifacts/validationReviewQueue/offlineArtifactValidationFutureShadowEligibilityReviewBinder.service";
import type { IntelligenceRouteDeps } from "./types";

const readRequestUserId = (req: unknown): string | number | null => {
  const user = (req as { user?: { id?: string | number } }).user;
  return user?.id ?? null;
};

export const registerMlOfflineArtifactValidationFutureShadowEligibilityReviewBinderRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.get(
    "/api/brain/ml-offline-artifacts/validation/future-shadow-eligibility-review-binders/summary",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = await buildOfflineArtifactValidationFutureShadowEligibilityReviewBinderSummary();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-offline-artifacts/validation/future-shadow-eligibility-review-binders",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const items = await listOfflineArtifactValidationFutureShadowEligibilityReviewBinderRecords(req.query.limit);
        res.json({ success: true, data: { items, total: items.length } });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-offline-artifacts/validation/future-shadow-eligibility-review-binders/:id",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await getOfflineArtifactValidationFutureShadowEligibilityReviewBinder(req.params.id);
        if (!data) {
          res.status(404).json({ success: false, message: "Offline artifact future shadow eligibility review binder was not found." });
          return;
        }
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/ml-offline-artifacts/validation/future-shadow-eligibility-gates/:id/future-shadow-eligibility-review-binder",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await createOfflineArtifactValidationFutureShadowEligibilityReviewBinder({
          futureShadowEligibilityGateId: req.params.id,
          createdByUserId: readRequestUserId(req),
        });
        if (!data) {
          res.status(404).json({ success: false, message: "Offline artifact future shadow eligibility gate was not found; review binder was not created." });
          return;
        }
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/ml-offline-artifacts/validation/future-shadow-eligibility-review-binders/bootstrap-latest",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await bootstrapOfflineArtifactValidationFutureShadowEligibilityReviewBinderFromLatestGate({
          createdByUserId: readRequestUserId(req),
        });
        if (!data) {
          res.status(404).json({ success: false, message: "No future shadow eligibility gate exists to build a review binder." });
          return;
        }
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/ml-offline-artifacts/validation/evidence-closure-signoff-packs/:id/future-shadow-eligibility-review-binder/latest-gate",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await createLatestOfflineArtifactValidationFutureShadowEligibilityReviewBinderForSignoffPack({
          evidenceClosureSignoffPackId: req.params.id,
          createdByUserId: readRequestUserId(req),
        });
        if (!data) {
          res.status(404).json({ success: false, message: "No future shadow eligibility gate exists for this evidence closure signoff pack." });
          return;
        }
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-offline-artifacts/validation/future-shadow-eligibility-gates/:id/future-shadow-eligibility-review-binder/latest",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await getLatestOfflineArtifactValidationFutureShadowEligibilityReviewBinder(req.params.id);
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
};
