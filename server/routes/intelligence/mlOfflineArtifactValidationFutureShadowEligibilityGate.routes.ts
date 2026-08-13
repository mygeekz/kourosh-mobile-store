import type { Express } from "express";
import {
  bootstrapOfflineArtifactValidationFutureShadowEligibilityGateFromLatestSignoffPack,
  buildOfflineArtifactValidationFutureShadowEligibilityGateSummary,
  createLatestOfflineArtifactValidationFutureShadowEligibilityGateForEvidenceGapClosureMatrix,
  createOfflineArtifactValidationFutureShadowEligibilityGate,
  getLatestOfflineArtifactValidationFutureShadowEligibilityGate,
  getOfflineArtifactValidationFutureShadowEligibilityGate,
  listOfflineArtifactValidationFutureShadowEligibilityGateRecords,
} from "../../intelligence/artifacts/validationReviewQueue/offlineArtifactValidationFutureShadowEligibilityGate.service";
import type { IntelligenceRouteDeps } from "./types";

const readRequestUserId = (req: unknown): string | number | null => {
  const user = (req as { user?: { id?: string | number } }).user;
  return user?.id ?? null;
};

export const registerMlOfflineArtifactValidationFutureShadowEligibilityGateRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.get(
    "/api/brain/ml-offline-artifacts/validation/future-shadow-eligibility-gates/summary",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = await buildOfflineArtifactValidationFutureShadowEligibilityGateSummary();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-offline-artifacts/validation/future-shadow-eligibility-gates",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const items = await listOfflineArtifactValidationFutureShadowEligibilityGateRecords(req.query.limit);
        res.json({ success: true, data: { items, total: items.length } });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-offline-artifacts/validation/future-shadow-eligibility-gates/:id",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await getOfflineArtifactValidationFutureShadowEligibilityGate(req.params.id);
        if (!data) {
          res.status(404).json({ success: false, message: "Offline artifact future shadow eligibility gate was not found." });
          return;
        }
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/ml-offline-artifacts/validation/evidence-closure-signoff-packs/:id/future-shadow-eligibility-gate",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await createOfflineArtifactValidationFutureShadowEligibilityGate({
          evidenceClosureSignoffPackId: req.params.id,
          createdByUserId: readRequestUserId(req),
        });
        if (!data) {
          res.status(404).json({ success: false, message: "Offline artifact evidence closure signoff pack was not found; future shadow eligibility gate was not created." });
          return;
        }
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/ml-offline-artifacts/validation/future-shadow-eligibility-gates/bootstrap-latest",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await bootstrapOfflineArtifactValidationFutureShadowEligibilityGateFromLatestSignoffPack({
          createdByUserId: readRequestUserId(req),
        });
        if (!data) {
          res.status(404).json({ success: false, message: "No evidence closure signoff pack exists to build a future shadow eligibility gate." });
          return;
        }
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/ml-offline-artifacts/validation/evidence-gap-closure-matrix/:id/future-shadow-eligibility-gate/latest-signoff",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await createLatestOfflineArtifactValidationFutureShadowEligibilityGateForEvidenceGapClosureMatrix({
          evidenceGapClosureMatrixId: req.params.id,
          createdByUserId: readRequestUserId(req),
        });
        if (!data) {
          res.status(404).json({ success: false, message: "No evidence closure signoff pack exists for this evidence gap closure matrix." });
          return;
        }
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-offline-artifacts/validation/evidence-closure-signoff-packs/:id/future-shadow-eligibility-gate/latest",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await getLatestOfflineArtifactValidationFutureShadowEligibilityGate(req.params.id);
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
};
