import {
  getShadowRuntimeReplayBatchById,
  getShadowRuntimeReplaySummary,
  listShadowRuntimeReplayBatches,
  listShadowRuntimeReplayItems,
  type ShadowRuntimeReplayBatchRecord,
  type ShadowRuntimeReplayItemRecord,
} from "../../db/domains/ml/mlShadowRuntimeReplays.db";
import { getShadowRuntimeSafetyGate } from "./shadowRuntimeSafety";

const PHASE_LABEL = "Phase 5D — Replay Delta Trend Evidence Pack" as const;
const EVIDENCE_PACK_KEY = "shadow_runtime_replay_delta_trend_evidence_pack_v1" as const;
const DEFAULT_BATCH_LIMIT = 12;
const DEFAULT_ITEM_LIMIT = 50;
const MAX_BATCH_LIMIT = 50;
const MAX_ITEM_LIMIT = 250;

const clampLimit = (value: unknown, fallback: number, max: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.max(1, Math.min(max, Math.round(parsed)));
};

const pct = (part: number, total: number): number => {
  if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0) return 0;
  return Math.round((part / total) * 10000) / 100;
};

const isUnsafeReplayItem = (item: ShadowRuntimeReplayItemRecord): boolean => Boolean(
  item.modelExecutionAttempted
  || item.modelExecutionAllowed
  || item.inferenceEndpointExposed
  || item.productionIntegrationAllowed
  || item.decisionAutomationAllowed
  || item.canChangeInventoryOrAccounting,
);

const countObjectKeys = (value: Record<string, unknown> | null): number => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return 0;
  return Object.keys(value).length;
};

const summarizeItems = (items: ShadowRuntimeReplayItemRecord[]) => {
  const validationFailures = items.filter((item) => item.validationStatus !== "valid");
  const unsafeItems = items.filter(isUnsafeReplayItem);
  const deltaAvailable = items.filter((item) => countObjectKeys(item.delta) > 0);
  const candidateOutputAvailable = items.filter((item) => countObjectKeys(item.candidateOutput) > 0);
  const byPredictionType = items.reduce<Record<string, {
    itemCount: number;
    validationFailureCount: number;
    unsafeFlagCount: number;
    deltaAvailableCount: number;
  }>>((acc, item) => {
    const key = item.predictionType || "unknown";
    if (!acc[key]) {
      acc[key] = {
        itemCount: 0,
        validationFailureCount: 0,
        unsafeFlagCount: 0,
        deltaAvailableCount: 0,
      };
    }
    acc[key].itemCount += 1;
    if (item.validationStatus !== "valid") acc[key].validationFailureCount += 1;
    if (isUnsafeReplayItem(item)) acc[key].unsafeFlagCount += 1;
    if (countObjectKeys(item.delta) > 0) acc[key].deltaAvailableCount += 1;
    return acc;
  }, {});

  return {
    totalItems: items.length,
    validationFailureCount: validationFailures.length,
    validationFailureRatePct: pct(validationFailures.length, items.length),
    unsafeFlagCount: unsafeItems.length,
    unsafeFlagRatePct: pct(unsafeItems.length, items.length),
    deltaAvailableCount: deltaAvailable.length,
    candidateOutputAvailableCount: candidateOutputAvailable.length,
    deltaUnavailableBecauseRuntimeDisabledCount: Math.max(0, items.length - deltaAvailable.length),
    byPredictionType,
    latestValidationFailureSamples: validationFailures.slice(0, 10).map((item) => ({
      itemId: item.id,
      batchId: item.batchId,
      snapshotId: item.snapshotId,
      predictionType: item.predictionType,
      validationStatus: item.validationStatus,
      status: item.status,
      createdAt: item.createdAt,
    })),
    unsafeFlagSamples: unsafeItems.slice(0, 10).map((item) => ({
      itemId: item.id,
      batchId: item.batchId,
      snapshotId: item.snapshotId,
      predictionType: item.predictionType,
      modelExecutionAttempted: item.modelExecutionAttempted,
      modelExecutionAllowed: item.modelExecutionAllowed,
      inferenceEndpointExposed: item.inferenceEndpointExposed,
      productionIntegrationAllowed: item.productionIntegrationAllowed,
      decisionAutomationAllowed: item.decisionAutomationAllowed,
      canChangeInventoryOrAccounting: item.canChangeInventoryOrAccounting,
    })),
  };
};

const buildBatchTrendPoint = (batch: ShadowRuntimeReplayBatchRecord) => {
  const unsafeCount = batch.modelExecutionAttemptedCount
    + batch.inferenceEndpointExposedCount
    + batch.businessMutationAllowedCount;
  return {
    batchId: batch.id,
    replayKey: batch.replayKey,
    createdAt: batch.createdAt,
    status: batch.status,
    predictionType: batch.predictionType,
    sourceSnapshotCount: batch.sourceSnapshotCount,
    replayedSnapshotCount: batch.replayedSnapshotCount,
    validationFailedCount: batch.validationFailedCount,
    validationFailureRatePct: pct(batch.validationFailedCount, batch.replayedSnapshotCount || batch.sourceSnapshotCount),
    modelExecutionAttemptedCount: batch.modelExecutionAttemptedCount,
    inferenceEndpointExposedCount: batch.inferenceEndpointExposedCount,
    businessMutationAllowedCount: batch.businessMutationAllowedCount,
    unsafeTrendPointCount: unsafeCount,
    unsafeTrendPointRatePct: pct(unsafeCount, batch.replayedSnapshotCount || batch.sourceSnapshotCount),
  };
};

const describeValidationTrend = (timeline: ReturnType<typeof buildBatchTrendPoint>[]) => {
  if (timeline.length < 2) {
    return {
      direction: timeline.length === 0 ? "no_replay_batches" : "single_batch_only",
      firstRatePct: timeline[0]?.validationFailureRatePct ?? 0,
      latestRatePct: timeline[0]?.validationFailureRatePct ?? 0,
      deltaPct: 0,
    };
  }

  const chronological = [...timeline].reverse();
  const first = chronological[0];
  const latest = chronological[chronological.length - 1];
  const delta = Math.round((latest.validationFailureRatePct - first.validationFailureRatePct) * 100) / 100;

  return {
    direction: Math.abs(delta) < 0.01
      ? "stable"
      : delta > 0
        ? "validation_failures_increased"
        : "validation_failures_decreased",
    firstRatePct: first.validationFailureRatePct,
    latestRatePct: latest.validationFailureRatePct,
    deltaPct: delta,
  };
};

const buildSafetySummary = (batches: ShadowRuntimeReplayBatchRecord[]) => {
  const unsafeBatches = batches.filter((batch) => (
    batch.modelExecutionAttemptedCount
    || batch.inferenceEndpointExposedCount
    || batch.businessMutationAllowedCount
  ));

  return {
    reviewedBatchCount: batches.length,
    unsafeBatchCount: unsafeBatches.length,
    modelExecutionAttemptedCount: batches.reduce((sum, batch) => sum + batch.modelExecutionAttemptedCount, 0),
    inferenceEndpointExposedCount: batches.reduce((sum, batch) => sum + batch.inferenceEndpointExposedCount, 0),
    businessMutationAllowedCount: batches.reduce((sum, batch) => sum + batch.businessMutationAllowedCount, 0),
    unsafeBatchSamples: unsafeBatches.slice(0, 10).map((batch) => ({
      batchId: batch.id,
      replayKey: batch.replayKey,
      createdAt: batch.createdAt,
      modelExecutionAttemptedCount: batch.modelExecutionAttemptedCount,
      inferenceEndpointExposedCount: batch.inferenceEndpointExposedCount,
      businessMutationAllowedCount: batch.businessMutationAllowedCount,
    })),
  };
};

export const buildShadowRuntimeReplayDeltaTrendEvidencePackContract = () => ({
  evidencePackKey: EVIDENCE_PACK_KEY,
  evidencePackVersion: "v1",
  phase: PHASE_LABEL,
  generatedAt: new Date().toISOString(),
  purpose: "Read-only evidence pack for trend review across historical replay batches, validation deltas, missing candidate outputs, and safety counters.",
  sourceTables: [
    "ml_shadow_runtime_replay_batches",
    "ml_shadow_runtime_replay_items",
    "ml_shadow_runtime_attempts",
    "predictive_feature_snapshots",
  ],
  allowedBehavior: [
    "Read replay batch evidence.",
    "Read replay item evidence.",
    "Summarize validation failure trends across batches.",
    "Summarize unavailable delta/candidate output evidence while runtime remains disabled.",
    "Expose review-only evidence for Admin and Manager users.",
  ],
  forbiddenBehavior: [
    "Do not execute a real model.",
    "Do not run replay jobs from the evidence pack.",
    "Do not approve, activate, promote, or deploy a model candidate.",
    "Do not expose an inference endpoint.",
    "Do not mutate accounting, inventory, ledger, pricing, reports, sales, repairs, partners, or customers.",
  ],
  safetyGate: getShadowRuntimeSafetyGate(),
});

export const getShadowRuntimeReplayDeltaTrendEvidencePackSummary = async (options: {
  batchLimit?: unknown;
  itemLimit?: unknown;
} = {}) => {
  const batchLimit = clampLimit(options.batchLimit, DEFAULT_BATCH_LIMIT, MAX_BATCH_LIMIT);
  const itemLimit = clampLimit(options.itemLimit, DEFAULT_ITEM_LIMIT, MAX_ITEM_LIMIT);
  const [summary, batches] = await Promise.all([
    getShadowRuntimeReplaySummary(),
    listShadowRuntimeReplayBatches(batchLimit),
  ]);

  const batchItems = await Promise.all(
    batches.map(async (batch) => ({ batch, items: await listShadowRuntimeReplayItems(batch.id, itemLimit) })),
  );
  const items = batchItems.flatMap((entry) => entry.items);
  const trendTimeline = batches.map(buildBatchTrendPoint);
  const safetyGate = getShadowRuntimeSafetyGate();
  const itemSummary = summarizeItems(items);
  const safetySummary = buildSafetySummary(batches);

  return {
    generatedAt: new Date().toISOString(),
    currentStatus: PHASE_LABEL,
    evidencePackLabel: "Replay Delta Trend Evidence Pack",
    evidencePackStatus: "Read-only / Evidence only",
    modelExecution: "Off",
    productionInference: "Not exposed",
    businessMutation: "Blocked",
    latestSafetyStatus: safetyGate,
    currentShadowRuntimeReplayDeltaTrendEvidencePack: {
      status: "read_only_evidence_pack",
      readinessScorePct: 100,
      evidenceBatchCount: batches.length,
      evidenceItemCount: items.length,
      validationFailureCount: itemSummary.validationFailureCount,
      validationFailureRatePct: itemSummary.validationFailureRatePct,
      deltaAvailableCount: itemSummary.deltaAvailableCount,
      candidateOutputAvailableCount: itemSummary.candidateOutputAvailableCount,
      deltaUnavailableBecauseRuntimeDisabledCount: itemSummary.deltaUnavailableBecauseRuntimeDisabledCount,
      unsafeTrendPointCount: safetySummary.modelExecutionAttemptedCount
        + safetySummary.inferenceEndpointExposedCount
        + safetySummary.businessMutationAllowedCount,
      latestReplayAt: summary.latestReplayAt,
      validationTrend: describeValidationTrend(trendTimeline),
      itemSummary,
      safetySummary,
      runtimeInvocationAllowed: safetyGate.runtimeInvocationAllowed,
      modelExecutionAllowed: safetyGate.modelExecutionAllowed,
      inferenceEndpointExposed: safetyGate.inferenceEndpointExposed,
      productionIntegrationAllowed: safetyGate.productionIntegrationAllowed,
      decisionAutomationAllowed: safetyGate.decisionAutomationAllowed,
      canChangeInventoryOrAccounting: safetyGate.canChangeInventoryOrAccounting,
      canChangePricing: safetyGate.canChangePricing,
      canChangeReports: safetyGate.canChangeReports,
      canChangeLedger: safetyGate.canChangeLedger,
      canMutateBusinessRecords: safetyGate.canMutateBusinessRecords,
      explanation: "Evidence pack summarizes replay trends only. Runtime remains disabled, so unavailable candidate deltas are expected evidence rather than production signals.",
      warnings: [
        "Replay delta trend evidence is read-only.",
        "No real model execution is enabled.",
        "No inference endpoint is exposed.",
        "No approval, activation, promotion, or business mutation is possible.",
      ],
      blockers: [],
      recommendedNextAction: "Review validation trend evidence before any future offline candidate-output comparison design.",
    },
    replaySummary: summary,
    trendTimeline,
    batchEvidence: batchItems.map((entry) => ({
      batch: entry.batch,
      itemSummary: summarizeItems(entry.items),
    })),
  };
};

export const getShadowRuntimeReplayDeltaTrendEvidencePackBatchDetail = async (batchId: unknown, itemLimitInput?: unknown) => {
  const itemLimit = clampLimit(itemLimitInput, DEFAULT_ITEM_LIMIT, MAX_ITEM_LIMIT);
  const batch = await getShadowRuntimeReplayBatchById(batchId);
  if (!batch) return null;

  const items = await listShadowRuntimeReplayItems(batch.id, itemLimit);
  const safetyGate = getShadowRuntimeSafetyGate();
  return {
    generatedAt: new Date().toISOString(),
    currentStatus: PHASE_LABEL,
    evidencePackLabel: "Replay Delta Trend Evidence Pack",
    batchTrendPoint: buildBatchTrendPoint(batch),
    batch,
    itemSummary: summarizeItems(items),
    items,
    safetyGate,
    evidenceOnly: true,
    approvalAllowed: false,
    activationAllowed: false,
    promotionAllowed: false,
    replayExecutionAllowed: false,
    productionInferenceAllowed: false,
    businessMutationAllowed: false,
  };
};
