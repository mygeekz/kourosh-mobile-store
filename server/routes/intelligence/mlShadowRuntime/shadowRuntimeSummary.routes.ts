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

export const registerShadowruntimesummaryRoutesRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.get(
    "/api/brain/ml-shadow-runtime/summary",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const attemptSummary = await getShadowRuntimeAttemptSummary();
        const replaySummary = await getShadowRuntimeReplaySummary();
        const artifactMetadataIntakeSummary =
          getShadowRuntimeCandidateArtifactMetadataIntakeReadinessPackSummary();
        const artifactMetadataCompatibilityMatrixSummary =
          getShadowRuntimeArtifactMetadataCompatibilityMatrixSummary();
        const artifactEnvelopeStorageReadinessDesignSummary =
          getShadowRuntimeArtifactEnvelopeStorageReadinessDesignSummary();
        const artifactEnvelopeRetentionPolicyReadinessPackSummary =
          getShadowRuntimeArtifactEnvelopeRetentionPolicyReadinessPackSummary();
        const artifactEnvelopeRetentionEvidenceExportReadinessPackSummary =
          getShadowRuntimeArtifactEnvelopeRetentionEvidenceExportReadinessPackSummary();
        const artifactEnvelopeRetentionEvidenceExportReviewBinderDesignSummary =
          getShadowRuntimeArtifactEnvelopeRetentionEvidenceExportReviewBinderDesignSummary();
        const artifactEnvelopeReviewBinderTraceabilityMatrixSummary =
          getShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityMatrixSummary();
        const artifactEnvelopeReviewBinderTraceabilityCoverageReviewPackSummary =
          getShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageReviewPackSummary();
        const artifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPackSummary =
          getShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPackSummary();
        const artifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationMatrixSummary =
          getShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationMatrixSummary();
        const artifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationReviewRoutingReadinessPackSummary =
          getShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationReviewRoutingReadinessPackSummary();
        const artifactEnvelopeReviewBinderTraceabilityCoverageBalancePackSummary =
          getShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalancePackSummary();
        const artifactEnvelopeReviewBinderTraceabilityCoverageBalanceReviewNotesPackSummary =
          getShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceReviewNotesPackSummary();
        const artifactEnvelopeReviewBinderTraceabilityCoverageBalanceNotesTriageMatrixSummary =
          getShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceNotesTriageMatrixSummary();
        const artifactEnvelopeReviewBinderTraceabilityCoverageBalanceNotesTriageReviewRoutingSummaryPackSummary =
          getShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceNotesTriageReviewRoutingSummaryPackSummary();
        const safetyGate = getShadowRuntimeSafetyGate();
        res.json({
          success: true,
          data: {
            generatedAt: new Date().toISOString(),
            currentStatus:
              "Phase 5V — Offline Triage Matrix Review Routing Summary Pack",
            adapterLabel: "Shadow Runtime Adapter",
            adapterStatus: "Disabled / Dry-run only",
            modelExecution: "Off",
            productionInference: "Not exposed",
            businessMutation: "Blocked",
            latestSafetyStatus: safetyGate,
            currentShadowRuntimeAdapter: {
              status: "disabled_dry_run_only",
              readinessScorePct: 100,
              totalAttempts: attemptSummary.totalAttempts,
              latestAttemptAt: attemptSummary.latestAttemptAt,
              latestAttempt: attemptSummary.latestAttempt,
              runtimeInvocationAllowed: safetyGate.runtimeInvocationAllowed,
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
                "This is not live ML. This is a safe shadow runtime contract test.",
              warnings: [
                "No real model execution is enabled.",
                "No inference endpoint is exposed.",
                "No business mutation is possible.",
              ],
              blockers: [],
            },
            attemptSummary,
            replaySummary,
            artifactMetadataIntakeSummary,
            artifactMetadataCompatibilityMatrixSummary,
            artifactEnvelopeStorageReadinessDesignSummary,
            artifactEnvelopeRetentionPolicyReadinessPackSummary,
            artifactEnvelopeRetentionEvidenceExportReadinessPackSummary,
            artifactEnvelopeRetentionEvidenceExportReviewBinderDesignSummary,
            artifactEnvelopeReviewBinderTraceabilityMatrixSummary,
            artifactEnvelopeReviewBinderTraceabilityCoverageReviewPackSummary,
            artifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPackSummary,
            artifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationMatrixSummary,
            artifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationReviewRoutingReadinessPackSummary,
            artifactEnvelopeReviewBinderTraceabilityCoverageBalancePackSummary,
            artifactEnvelopeReviewBinderTraceabilityCoverageBalanceReviewNotesPackSummary,
            artifactEnvelopeReviewBinderTraceabilityCoverageBalanceNotesTriageMatrixSummary,
            artifactEnvelopeReviewBinderTraceabilityCoverageBalanceNotesTriageReviewRoutingSummaryPackSummary,
            currentShadowRuntimeCandidateArtifactMetadataIntakeReadinessPack:
              artifactMetadataIntakeSummary.currentShadowRuntimeCandidateArtifactMetadataIntakeReadinessPack,
            currentShadowRuntimeArtifactMetadataCompatibilityMatrix:
              artifactMetadataCompatibilityMatrixSummary.currentShadowRuntimeArtifactMetadataCompatibilityMatrix,
            currentShadowRuntimeArtifactEnvelopeStorageReadinessDesign:
              artifactEnvelopeStorageReadinessDesignSummary.currentShadowRuntimeArtifactEnvelopeStorageReadinessDesign,
            currentShadowRuntimeArtifactEnvelopeRetentionPolicyReadinessPack:
              artifactEnvelopeRetentionPolicyReadinessPackSummary.currentShadowRuntimeArtifactEnvelopeRetentionPolicyReadinessPack,
            currentShadowRuntimeArtifactEnvelopeRetentionEvidenceExportReadinessPack:
              artifactEnvelopeRetentionEvidenceExportReadinessPackSummary.currentShadowRuntimeArtifactEnvelopeRetentionEvidenceExportReadinessPack,
            currentShadowRuntimeArtifactEnvelopeRetentionEvidenceExportReviewBinderDesign:
              artifactEnvelopeRetentionEvidenceExportReviewBinderDesignSummary.currentShadowRuntimeArtifactEnvelopeRetentionEvidenceExportReviewBinderDesign,
            currentShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityMatrix:
              artifactEnvelopeReviewBinderTraceabilityMatrixSummary.currentShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityMatrix,
            currentShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageReviewPack:
              artifactEnvelopeReviewBinderTraceabilityCoverageReviewPackSummary.currentShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageReviewPack,
            currentShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPack:
              artifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPackSummary.currentShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPack,
            currentShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationMatrix:
              artifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationMatrixSummary.currentShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationMatrix,
            currentShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationReviewRoutingReadinessPack:
              artifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationReviewRoutingReadinessPackSummary.currentShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationReviewRoutingReadinessPack,
            currentShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalancePack:
              artifactEnvelopeReviewBinderTraceabilityCoverageBalancePackSummary.currentShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalancePack,
            currentShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceReviewNotesPack:
              artifactEnvelopeReviewBinderTraceabilityCoverageBalanceReviewNotesPackSummary.currentShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceReviewNotesPack,
            currentShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceNotesTriageMatrix:
              artifactEnvelopeReviewBinderTraceabilityCoverageBalanceNotesTriageMatrixSummary.currentShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceNotesTriageMatrix,
            currentShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceNotesTriageReviewRoutingSummaryPack:
              artifactEnvelopeReviewBinderTraceabilityCoverageBalanceNotesTriageReviewRoutingSummaryPackSummary.currentShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceNotesTriageReviewRoutingSummaryPack,
            currentShadowRuntimeReplay: {
              status: "audit_only_runtime_disabled",
              totalBatches: replaySummary.totalBatches,
              totalReplayedSnapshots: replaySummary.totalReplayedSnapshots,
              latestReplayAt: replaySummary.latestReplayAt,
              modelExecutionAllowed: safetyGate.modelExecutionAllowed,
              inferenceEndpointExposed: safetyGate.inferenceEndpointExposed,
              canMutateBusinessRecords: safetyGate.canMutateBusinessRecords,
            },
          },
        });
      } catch (err) {
        next(err);
      }
    },
  );

};
