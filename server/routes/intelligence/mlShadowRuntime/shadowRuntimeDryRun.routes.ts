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

export const registerShadowruntimedryrunRoutesRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.post(
    "/api/brain/ml-shadow-runtime/dry-run",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const userId = readRequestUserId(req);
        const runtimeInput = buildRuntimeInput(
          (req.body || {}) as Record<string, unknown>,
          userId,
        );
        const output = await runExternalModelShadowAdapter(runtimeInput);
        const attempt = await recordShadowRuntimeAttempt({
          modelImportId: runtimeInput.modelImportId,
          modelKey: runtimeInput.modelKey,
          modelVersion: runtimeInput.modelVersion,
          predictionType: runtimeInput.predictionType,
          entityType: runtimeInput.entityType,
          entityId: runtimeInput.entityId,
          runtimeMode: output.mode,
          allowed: output.allowed,
          modelExecutionAttempted: output.modelExecutionAttempted,
          modelExecutionAllowed: output.modelExecutionAllowed,
          inferenceEndpointExposed: output.inferenceEndpointExposed,
          productionIntegrationAllowed: output.productionIntegrationAllowed,
          decisionAutomationAllowed: output.decisionAutomationAllowed,
          canChangeInventoryOrAccounting: output.canChangeInventoryOrAccounting,
          inputSnapshot: mapShadowRuntimeAttemptInputSnapshot(runtimeInput),
          outputSnapshot: mapShadowRuntimeAttemptOutputSnapshot(output),
          safetyNotes: output.safetyNotes,
          status: mapShadowRuntimeAttemptStatus(
            output,
            output.validation.valid,
          ),
          createdByUserId: userId,
        });
        res.json({ success: true, data: { output, attempt } });
      } catch (err) {
        next(err);
      }
    },
  );

};
