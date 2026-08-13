import type { Express } from "express";
import {
  assignOfflineArtifactValidationReviewer,
  buildOfflineArtifactValidationReviewerAssignmentUxState,
  listOfflineArtifactValidationReviewerAssignmentEvents,
  recordOfflineArtifactValidationReviewerEvidenceNote,
} from "../../intelligence/artifacts/validationReviewQueue/offlineArtifactValidationReviewerAssignmentUx.service";
import type { IntelligenceRouteDeps } from "./types";
import type {
  OfflineArtifactValidationReviewPriority,
  OfflineArtifactValidationReviewQueueStatus,
} from "../../intelligence/artifacts/validationReviewQueue/offlineArtifactValidationReviewQueueTypes";

const readRequestUserId = (req: unknown): string | number | null => {
  const user = (req as { user?: { id?: string | number } }).user;
  return user?.id ?? null;
};

const readQueryText = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

const readQueueStatus = (value: unknown): OfflineArtifactValidationReviewQueueStatus | "all" | undefined => {
  const text = readQueryText(value);
  switch (text) {
    case "all":
    case "open":
    case "assigned":
    case "evidence_requested":
    case "deferred":
    case "closed_shadow_only":
    case "quarantine_recommended":
    case "reject_recommended":
      return text;
    default:
      return undefined;
  }
};

const readReviewPriority = (value: unknown): OfflineArtifactValidationReviewPriority | "all" | undefined => {
  const text = readQueryText(value);
  switch (text) {
    case "all":
    case "low":
    case "medium":
    case "high":
    case "critical":
      return text;
    default:
      return undefined;
  }
};

export const registerMlOfflineArtifactValidationReviewerAssignmentUxRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.get(
    "/api/brain/ml-offline-artifacts/validation/review-queue/assignment-ui",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildOfflineArtifactValidationReviewerAssignmentUxState({
          status: readQueueStatus(req.query.status),
          priority: readReviewPriority(req.query.priority),
          assignedReviewerId: readQueryText(req.query.assignedReviewerId),
          limit: readQueryText(req.query.limit),
        });
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/ml-offline-artifacts/validation/review-queue/:id/assign-reviewer",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await assignOfflineArtifactValidationReviewer({
          queueItemId: req.params.id,
          assignedReviewerId: req.body?.assignedReviewerId ?? null,
          assignmentNote: req.body?.assignmentNote ?? null,
          assignedByUserId: readRequestUserId(req),
        });
        if (!data) {
          res.status(404).json({ success: false, message: "Offline artifact validation review queue item was not found; reviewer assignment was not recorded." });
          return;
        }
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/ml-offline-artifacts/validation/review-queue/:id/evidence-note",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await recordOfflineArtifactValidationReviewerEvidenceNote({
          queueItemId: req.params.id,
          evidenceNote: req.body?.evidenceNote || "",
          evidenceType: req.body?.evidenceType ?? "reviewer_note",
          evidenceReference: req.body?.evidenceReference ?? null,
          recordedByUserId: readRequestUserId(req),
        });
        if (!data) {
          res.status(404).json({ success: false, message: "Offline artifact validation review queue item was not found; evidence note was not recorded." });
          return;
        }
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-offline-artifacts/validation/review-queue/:id/assignment-events",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const items = await listOfflineArtifactValidationReviewerAssignmentEvents(req.params.id, req.query.limit);
        res.json({ success: true, data: { items, total: items.length } });
      } catch (err) {
        next(err);
      }
    },
  );
};
