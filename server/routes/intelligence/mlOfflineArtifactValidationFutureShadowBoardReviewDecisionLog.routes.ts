import type { Express, NextFunction, Request, Response } from "express";
import type { IntelligenceRouteDeps } from "./types";
import {
  bootstrapOfflineArtifactValidationFutureShadowBoardReviewDecisionLogFromLatestBoardReviewPacket,
  createLatestOfflineArtifactValidationFutureShadowBoardReviewDecisionLogForRoutingSummaryPack,
  createOfflineArtifactValidationFutureShadowBoardReviewDecisionLog,
  getLatestOfflineArtifactValidationFutureShadowBoardReviewDecisionLogForBoardReviewPacket,
  getOfflineArtifactValidationFutureShadowBoardReviewDecisionLogById,
  getOfflineArtifactValidationFutureShadowBoardReviewDecisionLogSummary,
  listOfflineArtifactValidationFutureShadowBoardReviewDecisionLogs,
} from "../../intelligence/artifacts/validationReviewQueue/offlineArtifactValidationFutureShadowBoardReviewDecisionLog.service";

export const registerMlOfflineArtifactValidationFutureShadowBoardReviewDecisionLogRoutes = (app: Express, deps: IntelligenceRouteDeps): void => {
  const adminManagerOnly = deps.authorizeRole(["Admin", "Manager"]);

  app.get("/api/brain/ml-offline-artifacts/validation/future-shadow-board-review-decision-logs/summary", adminManagerOnly, async (_req: Request, res: Response, next: NextFunction) => {
    try { res.json({ success: true, data: await getOfflineArtifactValidationFutureShadowBoardReviewDecisionLogSummary() }); } catch (err) { next(err); }
  });

  app.get("/api/brain/ml-offline-artifacts/validation/future-shadow-board-review-decision-logs", adminManagerOnly, async (req: Request, res: Response, next: NextFunction) => {
    try { res.json({ success: true, data: await listOfflineArtifactValidationFutureShadowBoardReviewDecisionLogs(req.query.limit) }); } catch (err) { next(err); }
  });

  app.get("/api/brain/ml-offline-artifacts/validation/future-shadow-board-review-decision-logs/:id", adminManagerOnly, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const record = await getOfflineArtifactValidationFutureShadowBoardReviewDecisionLogById(req.params.id);
      if (!record) return res.status(404).json({ success: false, message: "Future shadow board review decision log not found." });
      return res.json({ success: true, data: record });
    } catch (err) { next(err); }
  });

  app.post("/api/brain/ml-offline-artifacts/validation/future-shadow-board-review-packets/:id/future-shadow-board-review-decision-log", adminManagerOnly, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const record = await createOfflineArtifactValidationFutureShadowBoardReviewDecisionLog({
        futureShadowBoardReviewPacketId: req.params.id,
        boardDecision: req.body?.boardDecision,
        boardDecisionReason: req.body?.boardDecisionReason,
        createdByUserId: (req as any)?.user?.id ?? null,
      });
      return res.status(201).json({ success: true, data: record });
    } catch (err) { next(err); }
  });

  app.post("/api/brain/ml-offline-artifacts/validation/future-shadow-board-review-decision-logs/bootstrap-latest", adminManagerOnly, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const record = await bootstrapOfflineArtifactValidationFutureShadowBoardReviewDecisionLogFromLatestBoardReviewPacket((req as any)?.user?.id ?? null);
      if (!record) return res.status(404).json({ success: false, message: "No future shadow board review packet exists to create a decision log." });
      return res.status(201).json({ success: true, data: record });
    } catch (err) { next(err); }
  });

  app.post("/api/brain/ml-offline-artifacts/validation/future-shadow-review-binder-routing-summary-packs/:id/future-shadow-board-review-decision-log/latest-board-packet", adminManagerOnly, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const record = await createLatestOfflineArtifactValidationFutureShadowBoardReviewDecisionLogForRoutingSummaryPack(req.params.id, (req as any)?.user?.id ?? null);
      if (!record) return res.status(404).json({ success: false, message: "No latest board review packet exists for this routing summary pack." });
      return res.status(201).json({ success: true, data: record });
    } catch (err) { next(err); }
  });

  app.get("/api/brain/ml-offline-artifacts/validation/future-shadow-board-review-packets/:id/future-shadow-board-review-decision-log/latest", adminManagerOnly, async (req: Request, res: Response, next: NextFunction) => {
    try { res.json({ success: true, data: await getLatestOfflineArtifactValidationFutureShadowBoardReviewDecisionLogForBoardReviewPacket(req.params.id) }); } catch (err) { next(err); }
  });
};
