import type { Express } from "express";
import {
  bootstrapOfflineArtifactValidationEvidenceClosureSignoffPackFromLatestMatrix,
  buildOfflineArtifactValidationEvidenceClosureSignoffPackSummary,
  createLatestOfflineArtifactValidationEvidenceClosureSignoffPackForEvidenceReviewPack,
  createOfflineArtifactValidationEvidenceClosureSignoffPack,
  getLatestOfflineArtifactValidationEvidenceClosureSignoffPack,
  getOfflineArtifactValidationEvidenceClosureSignoffPack,
  listOfflineArtifactValidationEvidenceClosureSignoffPackRecords,
} from "../../intelligence/artifacts/validationReviewQueue/offlineArtifactValidationEvidenceClosureSignoffPack.service";
import type { IntelligenceRouteDeps } from "./types";

const readRequestUserId = (req: unknown): string | number | null => {
  const user = (req as { user?: { id?: string | number } }).user;
  return user?.id ?? null;
};

const readReviewerDecisionPayload = (req: unknown): { reviewerDecision?: string; reviewerDecisionReason?: string } => {
  const body = (req as { body?: Record<string, unknown> }).body || {};
  return {
    reviewerDecision: typeof body.reviewerDecision === "string" ? body.reviewerDecision : undefined,
    reviewerDecisionReason: typeof body.reviewerDecisionReason === "string" ? body.reviewerDecisionReason : undefined,
  };
};

export const registerMlOfflineArtifactValidationEvidenceClosureSignoffPackRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.get(
    "/api/brain/ml-offline-artifacts/validation/evidence-closure-signoff-packs/summary",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = await buildOfflineArtifactValidationEvidenceClosureSignoffPackSummary();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-offline-artifacts/validation/evidence-closure-signoff-packs",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const items = await listOfflineArtifactValidationEvidenceClosureSignoffPackRecords(req.query.limit);
        res.json({ success: true, data: { items, total: items.length } });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-offline-artifacts/validation/evidence-closure-signoff-packs/:id",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await getOfflineArtifactValidationEvidenceClosureSignoffPack(req.params.id);
        if (!data) {
          res.status(404).json({ success: false, message: "Offline artifact evidence closure reviewer signoff pack was not found." });
          return;
        }
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/ml-offline-artifacts/validation/evidence-gap-closure-matrix/:id/evidence-closure-signoff-pack",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const payload = readReviewerDecisionPayload(req);
        const data = await createOfflineArtifactValidationEvidenceClosureSignoffPack({
          evidenceGapClosureMatrixId: req.params.id,
          reviewerDecision: payload.reviewerDecision as never,
          reviewerDecisionReason: payload.reviewerDecisionReason,
          createdByUserId: readRequestUserId(req),
        });
        if (!data) {
          res.status(404).json({ success: false, message: "Offline artifact evidence gap closure matrix was not found; signoff pack was not created." });
          return;
        }
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/ml-offline-artifacts/validation/evidence-closure-signoff-packs/bootstrap-latest",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const payload = readReviewerDecisionPayload(req);
        const data = await bootstrapOfflineArtifactValidationEvidenceClosureSignoffPackFromLatestMatrix({
          reviewerDecision: payload.reviewerDecision as never,
          reviewerDecisionReason: payload.reviewerDecisionReason,
          createdByUserId: readRequestUserId(req),
        });
        if (!data) {
          res.status(404).json({ success: false, message: "No offline artifact evidence gap closure matrix exists to build a signoff pack." });
          return;
        }
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/ml-offline-artifacts/validation/evidence-review-packs/:id/evidence-closure-signoff-pack/latest-matrix",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const payload = readReviewerDecisionPayload(req);
        const data = await createLatestOfflineArtifactValidationEvidenceClosureSignoffPackForEvidenceReviewPack({
          evidenceReviewPackId: req.params.id,
          reviewerDecision: payload.reviewerDecision as never,
          reviewerDecisionReason: payload.reviewerDecisionReason,
          createdByUserId: readRequestUserId(req),
        });
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

  app.get(
    "/api/brain/ml-offline-artifacts/validation/evidence-gap-closure-matrix/:id/evidence-closure-signoff-pack/latest",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await getLatestOfflineArtifactValidationEvidenceClosureSignoffPack(req.params.id);
        if (!data) {
          res.status(404).json({ success: false, message: "No evidence closure reviewer signoff pack exists for this matrix." });
          return;
        }
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );
};
