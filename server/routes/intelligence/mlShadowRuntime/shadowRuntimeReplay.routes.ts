import type { Express } from "express";
import {
  getShadowRuntimeAttemptById,
  getShadowRuntimeAttemptSummary,
  listShadowRuntimeAttempts,
  recordShadowRuntimeAttempt,
} from "../../../db/domains/ml/mlShadowRuntimeAttempts.db";
import {
  getShadowRuntimeReplayBatchById,
  getShadowRuntimeReplaySummary,
  listShadowRuntimeReplayBatches,
  listShadowRuntimeReplayItems,
} from "../../../db/domains/ml/mlShadowRuntimeReplays.db";
import { runExternalModelShadowAdapter } from "../../../intelligence/mlRuntime/externalModelShadowAdapter";
import {
  buildShadowRuntimeHistoricalReplayContract,
  runShadowRuntimeHistoricalReplay,
} from "../../../intelligence/mlRuntime/shadowRuntimeReplay.service";
import {
  buildShadowRuntimeReplayReviewDashboardContract,
  getShadowRuntimeReplayReviewBatchDetail,
  getShadowRuntimeReplayReviewDashboardSummary,
} from "../../../intelligence/mlRuntime/shadowRuntimeReplayReviewDashboard.service";
import {
  buildShadowRuntimeReplayDeltaTrendEvidencePackContract,
  getShadowRuntimeReplayDeltaTrendEvidencePackBatchDetail,
  getShadowRuntimeReplayDeltaTrendEvidencePackSummary,
} from "../../../intelligence/mlRuntime/shadowRuntimeReplayDeltaTrendEvidencePack.service";
import {
  buildShadowRuntimeCandidateOutputFixturePackContract,
  buildShadowRuntimeCandidateOutputContractFixtures,
  getShadowRuntimeCandidateOutputFixturePackSummary,
  validateShadowRuntimeCandidateOutputFixture,
} from "../../../intelligence/mlRuntime/shadowRuntimeCandidateOutputFixturePack.service";
import {
  buildShadowRuntimeCandidateOutputComparisonMatrix,
  buildShadowRuntimeCandidateOutputComparisonMatrixContract,
  getShadowRuntimeCandidateOutputComparisonMatrixFixtureDetail,
  getShadowRuntimeCandidateOutputComparisonMatrixSummary,
} from "../../../intelligence/mlRuntime/shadowRuntimeCandidateOutputComparisonMatrix.service";
import {
  buildShadowRuntimeCandidateContractDriftReviewPack,
  buildShadowRuntimeCandidateContractDriftReviewPackContract,
  getShadowRuntimeCandidateContractDriftReviewPackSummary,
  getShadowRuntimeCandidateContractDriftReviewPackVersionDetail,
} from "../../../intelligence/mlRuntime/shadowRuntimeCandidateContractDriftReviewPack.service";
import {
  buildShadowRuntimeCandidateArtifactMetadataIntakeReadinessPackContract,
  buildShadowRuntimeCandidateArtifactMetadataIntakeReadinessPack,
  getShadowRuntimeCandidateArtifactMetadataIntakeReadinessPackSummary,
  getShadowRuntimeCandidateArtifactMetadataIntakeReadinessManifestDetail,
  validateShadowRuntimeCandidateArtifactMetadataManifest,
} from "../../../intelligence/mlRuntime/shadowRuntimeCandidateArtifactMetadataIntakeReadinessPack.service";
import {
  buildShadowRuntimeArtifactMetadataCompatibilityMatrixContract,
  buildShadowRuntimeArtifactMetadataCompatibilityMatrix,
  getShadowRuntimeArtifactMetadataCompatibilityMatrixSummary,
  getShadowRuntimeArtifactMetadataCompatibilityMatrixManifestDetail,
} from "../../../intelligence/mlRuntime/shadowRuntimeArtifactMetadataCompatibilityMatrix.service";
import {
  buildShadowRuntimeArtifactEnvelopeStorageReadinessDesignContract,
  buildShadowRuntimeArtifactEnvelopeStorageReadinessDesign,
  getShadowRuntimeArtifactEnvelopeStorageReadinessDesignSummary,
  getShadowRuntimeArtifactEnvelopeStorageReadinessEnvelopeDetail,
} from "../../../intelligence/mlRuntime/shadowRuntimeArtifactEnvelopeStorageReadinessDesign.service";
import {
  buildShadowRuntimeArtifactEnvelopeRetentionPolicyReadinessPackContract,
  buildShadowRuntimeArtifactEnvelopeRetentionPolicyReadinessPack,
  getShadowRuntimeArtifactEnvelopeRetentionPolicyReadinessPackSummary,
  getShadowRuntimeArtifactEnvelopeRetentionPolicyDetail,
} from "../../../intelligence/mlRuntime/shadowRuntimeArtifactEnvelopeRetentionPolicyReadinessPack.service";
import {
  buildShadowRuntimeArtifactEnvelopeRetentionEvidenceExportReadinessPackContract,
  buildShadowRuntimeArtifactEnvelopeRetentionEvidenceExportReadinessPack,
  getShadowRuntimeArtifactEnvelopeRetentionEvidenceExportReadinessPackSummary,
  getShadowRuntimeArtifactEnvelopeRetentionEvidenceExportDetail,
} from "../../../intelligence/mlRuntime/shadowRuntimeArtifactEnvelopeRetentionEvidenceExportReadinessPack.service";
import {
  buildShadowRuntimeArtifactEnvelopeRetentionEvidenceExportReviewBinderDesignContract,
  buildShadowRuntimeArtifactEnvelopeRetentionEvidenceExportReviewBinderDesign,
  getShadowRuntimeArtifactEnvelopeRetentionEvidenceExportReviewBinderDesignSummary,
  getShadowRuntimeArtifactEnvelopeRetentionEvidenceExportReviewBinderDetail,
} from "../../../intelligence/mlRuntime/shadowRuntimeArtifactEnvelopeRetentionEvidenceExportReviewBinderDesign.service";
import {
  buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityMatrixContract,
  buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityMatrix,
  getShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityMatrixSummary,
  getShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityMatrixBinderDetail,
} from "../../../intelligence/mlRuntime/shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityMatrix.service";
import {
  buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageReviewPackContract,
  buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageReviewPack,
  getShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageReviewPackSummary,
  getShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageReviewPackBinderDetail,
} from "../../../intelligence/mlRuntime/shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageReviewPack.service";
import {
  buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPackContract,
  buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPack,
  getShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPackSummary,
  getShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPackBinderDetail,
} from "../../../intelligence/mlRuntime/shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPack.service";
import {
  buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationMatrixContract,
  buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationMatrix,
  getShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationMatrixSummary,
  getShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationMatrixNoteDetail,
} from "../../../intelligence/mlRuntime/shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationMatrix.service";
import {
  buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationReviewRoutingReadinessPackContract,
  buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationReviewRoutingReadinessPack,
  getShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationReviewRoutingReadinessPackSummary,
  getShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationReviewRoutingReadinessRouteDetail,
} from "../../../intelligence/mlRuntime/shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationReviewRoutingReadinessPack.service";
import {
  buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalancePackContract,
  buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalancePack,
  getShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalancePackSummary,
  getShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceRouteDetail,
} from "../../../intelligence/mlRuntime/shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationReviewRoutingCoverageBalancePack.service";
import {
  buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceReviewNotesPackContract,
  buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceReviewNotesPack,
  getShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceReviewNotesPackSummary,
  getShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceReviewNotesRouteDetail,
} from "../../../intelligence/mlRuntime/shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceReviewNotesPack.service";
import {
  buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceNotesTriageMatrixContract,
  buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceNotesTriageMatrix,
  getShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceNotesTriageMatrixSummary,
  getShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceNotesTriageMatrixNoteDetail,
} from "../../../intelligence/mlRuntime/shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceNotesTriageMatrix.service";
import {
  buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceNotesTriageReviewRoutingSummaryPackContract,
  buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceNotesTriageReviewRoutingSummaryPack,
  getShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceNotesTriageReviewRoutingSummaryPackSummary,
  getShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceNotesTriageReviewRoutingSummaryRouteDetail,
} from "../../../intelligence/mlRuntime/shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceNotesTriageReviewRoutingSummaryPack.service";
import { getShadowRuntimeSafetyGate } from "../../../intelligence/mlRuntime/shadowRuntimeSafety";
import {
  mapShadowRuntimeAttemptInputSnapshot,
  mapShadowRuntimeAttemptOutputSnapshot,
  mapShadowRuntimeAttemptStatus,
} from "../../../intelligence/mlRuntime/shadowRuntimeResultMapper";
import type { ExternalModelShadowRuntimeInput } from "../../../intelligence/mlRuntime/shadowRuntimeTypes";
import type { IntelligenceRouteDeps } from "../types";

const readRequestUserId = (req: unknown): string | number | null => {
  const user = (req as { user?: { id?: string | number } }).user;
  return user?.id ?? null;
};

const buildRuntimeInput = (
  body: Record<string, unknown>,
  userId: string | number | null,
): ExternalModelShadowRuntimeInput => ({
  modelImportId: body.modelImportId as string | number,
  modelKey: String(body.modelKey ?? ""),
  modelVersion: String(body.modelVersion ?? ""),
  entityType: String(body.entityType ?? ""),
  entityId: (body.entityId as string | number | null | undefined) ?? null,
  predictionType: String(body.predictionType ?? ""),
  horizonDays: body.horizonDays == null ? null : Number(body.horizonDays),
  featureSnapshot: (body.featureSnapshot &&
  typeof body.featureSnapshot === "object" &&
  !Array.isArray(body.featureSnapshot)
    ? body.featureSnapshot
    : {}) as Record<string, unknown>,
  baselinePrediction: (body.baselinePrediction &&
  typeof body.baselinePrediction === "object" &&
  !Array.isArray(body.baselinePrediction)
    ? body.baselinePrediction
    : null) as Record<string, unknown> | null,
  requestedAt:
    typeof body.requestedAt === "string"
      ? body.requestedAt
      : new Date().toISOString(),
  requestedByUserId:
    (body.requestedByUserId as string | number | null | undefined) ?? userId,
});

export const registerShadowruntimereplayRoutesRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {

  app.get(
    "/api/brain/ml-shadow-runtime/replay/contract",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        res.json({
          success: true,
          data: buildShadowRuntimeHistoricalReplayContract(),
        });
      } catch (err) {
        next(err);
      }
    },
  );


  app.post(
    "/api/brain/ml-shadow-runtime/replay-historical-snapshots",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const userId = readRequestUserId(req);
        const data = await runShadowRuntimeHistoricalReplay({
          ...((req.body || {}) as Record<string, unknown>),
          requestedByUserId: userId,
        });
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );


  app.get(
    "/api/brain/ml-shadow-runtime/replays/summary",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const replaySummary = await getShadowRuntimeReplaySummary();
        const safetyGate = getShadowRuntimeSafetyGate();
        res.json({
          success: true,
          data: {
            generatedAt: new Date().toISOString(),
            currentStatus:
              "Phase 5B — Shadow Runtime Replay Against Historical Feature Snapshots",
            replayLabel: "Historical Shadow Runtime Replay",
            replayStatus: "Audit-only / Runtime disabled",
            modelExecution: "Off",
            productionInference: "Not exposed",
            businessMutation: "Blocked",
            latestSafetyStatus: safetyGate,
            currentShadowRuntimeReplay: {
              status: "audit_only_runtime_disabled",
              readinessScorePct: 100,
              totalBatches: replaySummary.totalBatches,
              totalSourceSnapshots: replaySummary.totalSourceSnapshots,
              totalReplayedSnapshots: replaySummary.totalReplayedSnapshots,
              totalValidationFailures: replaySummary.totalValidationFailures,
              latestReplayAt: replaySummary.latestReplayAt,
              latestReplay: replaySummary.latestReplay,
              modelExecutionAllowed: safetyGate.modelExecutionAllowed,
              inferenceEndpointExposed: safetyGate.inferenceEndpointExposed,
              productionIntegrationAllowed:
                safetyGate.productionIntegrationAllowed,
              decisionAutomationAllowed: safetyGate.decisionAutomationAllowed,
              canChangeInventoryOrAccounting:
                safetyGate.canChangeInventoryOrAccounting,
              canChangePricing: safetyGate.canChangePricing,
              canChangeReports: safetyGate.canChangeReports,
              canChangeLedger: safetyGate.canChangeLedger,
              canMutateBusinessRecords: safetyGate.canMutateBusinessRecords,
              explanation:
                "Historical snapshots replay through the disabled dry-run adapter contract only; no external model is called.",
              warnings: [
                "Replay records audit evidence only.",
                "No real model execution is enabled.",
                "No production inference endpoint is exposed.",
                "No business mutation is possible.",
              ],
              blockers: [],
            },
            replaySummary,
          },
        });
      } catch (err) {
        next(err);
      }
    },
  );


  app.get(
    "/api/brain/ml-shadow-runtime/replays",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const batches = await listShadowRuntimeReplayBatches(req.query.limit);
        res.json({ success: true, data: { batches, total: batches.length } });
      } catch (err) {
        next(err);
      }
    },
  );


  app.get(
    "/api/brain/ml-shadow-runtime/replays/:id/items",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const items = await listShadowRuntimeReplayItems(
          req.params.id,
          req.query.limit,
        );
        res.json({ success: true, data: { items, total: items.length } });
      } catch (err) {
        next(err);
      }
    },
  );


  app.get(
    "/api/brain/ml-shadow-runtime/replays/:id",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const replay = await getShadowRuntimeReplayBatchById(req.params.id);
        if (!replay) {
          res
            .status(404)
            .json({
              success: false,
              message: "Shadow runtime replay batch not found.",
            });
          return;
        }
        res.json({ success: true, data: replay });
      } catch (err) {
        next(err);
      }
    },
  );

};
