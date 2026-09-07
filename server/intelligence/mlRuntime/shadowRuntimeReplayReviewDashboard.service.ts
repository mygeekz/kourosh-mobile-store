import {
  getShadowRuntimeReplayBatchById,
  getShadowRuntimeReplaySummary,
  listShadowRuntimeReplayBatches,
  listShadowRuntimeReplayItems,
  type ShadowRuntimeReplayBatchRecord,
  type ShadowRuntimeReplayItemRecord,
} from "../../db/domains/ml/mlShadowRuntimeReplays.db";
import { getShadowRuntimeSafetyGate } from "./shadowRuntimeSafety";

const PHASE_LABEL = "Phase 5C — Replay Result Review Dashboard" as const;
const DASHBOARD_KEY = "shadow_runtime_replay_result_review_dashboard_v1" as const;
const DEFAULT_BATCH_LIMIT = 10;
const DEFAULT_ITEM_LIMIT = 25;
const MAX_BATCH_LIMIT = 50;
const MAX_ITEM_LIMIT = 100;

const clampLimit = (value: unknown, fallback: number, max: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.max(1, Math.min(max, Math.round(parsed)));
};

const toSafetyReviewStatus = (batch: ShadowRuntimeReplayBatchRecord | null) => ({
  batchId: batch?.id ?? null,
  replayStatus: batch?.status ?? "no_replay_batch_recorded",
  validationFailedCount: batch?.validationFailedCount ?? 0,
  modelExecutionAttemptedCount: batch?.modelExecutionAttemptedCount ?? 0,
  inferenceEndpointExposedCount: batch?.inferenceEndpointExposedCount ?? 0,
  businessMutationAllowedCount: batch?.businessMutationAllowedCount ?? 0,
  reviewSeverity: !batch
    ? "empty"
    : batch.modelExecutionAttemptedCount || batch.inferenceEndpointExposedCount || batch.businessMutationAllowedCount
      ? "blocked"
      : batch.validationFailedCount
        ? "needs_contract_review"
        : "clean_audit_only",
});

const summarizeReplayItems = (items: ShadowRuntimeReplayItemRecord[]) => {
  const validationFailures = items.filter((item) => item.validationStatus !== "valid");
  const unsafeFlags = items.filter((item) => (
    item.modelExecutionAttempted
    || item.modelExecutionAllowed
    || item.inferenceEndpointExposed
    || item.productionIntegrationAllowed
    || item.decisionAutomationAllowed
    || item.canChangeInventoryOrAccounting
  ));
  const byPredictionType = items.reduce<Record<string, number>>((acc, item) => {
    const key = item.predictionType || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return {
    totalItems: items.length,
    validationFailureCount: validationFailures.length,
    unsafeFlagCount: unsafeFlags.length,
    byPredictionType,
    latestValidationFailures: validationFailures.slice(0, 10).map((item) => ({
      itemId: item.id,
      snapshotId: item.snapshotId,
      predictionType: item.predictionType,
      validationStatus: item.validationStatus,
      status: item.status,
      createdAt: item.createdAt,
    })),
  };
};

export const buildShadowRuntimeReplayReviewDashboardContract = () => ({
  dashboardKey: DASHBOARD_KEY,
  dashboardVersion: "v1",
  phase: PHASE_LABEL,
  generatedAt: new Date().toISOString(),
  purpose: "Read-only review surface for historical replay batches, validation failures, replay items, and safety status.",
  sourceTables: [
    "ml_shadow_runtime_replay_batches",
    "ml_shadow_runtime_replay_items",
    "ml_shadow_runtime_attempts",
  ],
  allowedBehavior: [
    "Read replay batch evidence.",
    "Read replay item evidence.",
    "Summarize validation failures and safety flags.",
    "Show review-only dashboard data for Admin and Manager users.",
  ],
  forbiddenBehavior: [
    "Do not execute a real model.",
    "Do not run replay jobs from the review dashboard.",
    "Do not approve, activate, or promote a model candidate.",
    "Do not expose an inference endpoint.",
    "Do not mutate accounting, inventory, ledger, pricing, reports, sales, repairs, partners, or customers.",
  ],
  safetyGate: getShadowRuntimeSafetyGate(),
});

export const getShadowRuntimeReplayReviewDashboardSummary = async (options: {
  batchLimit?: unknown;
  itemLimit?: unknown;
} = {}) => {
  const batchLimit = clampLimit(options.batchLimit, DEFAULT_BATCH_LIMIT, MAX_BATCH_LIMIT);
  const itemLimit = clampLimit(options.itemLimit, DEFAULT_ITEM_LIMIT, MAX_ITEM_LIMIT);
  const [summary, batches] = await Promise.all([
    getShadowRuntimeReplaySummary(),
    listShadowRuntimeReplayBatches(batchLimit),
  ]);
  const latestBatch = batches[0] || null;
  const latestItems = latestBatch ? await listShadowRuntimeReplayItems(latestBatch.id, itemLimit) : [];
  const safetyGate = getShadowRuntimeSafetyGate();
  const itemSummary = summarizeReplayItems(latestItems);

  return {
    generatedAt: new Date().toISOString(),
    currentStatus: PHASE_LABEL,
    dashboardLabel: "Replay Result Review Dashboard",
    dashboardStatus: "Read-only / Review only",
    modelExecution: "Off",
    productionInference: "Not exposed",
    businessMutation: "Blocked",
    latestSafetyStatus: safetyGate,
    currentShadowRuntimeReplayReviewDashboard: {
      status: "read_only_review_dashboard",
      readinessScorePct: 100,
      reviewBatchCount: summary.totalBatches,
      reviewItemCount: summary.totalReplayedSnapshots,
      validationFailureCount: summary.totalValidationFailures,
      modelExecutionAttemptedCount: summary.totalModelExecutionAttempted,
      inferenceEndpointExposedCount: summary.totalInferenceEndpointExposed,
      businessMutationAllowedCount: summary.totalBusinessMutationAllowed,
      latestReplayAt: summary.latestReplayAt,
      latestBatchReview: toSafetyReviewStatus(latestBatch),
      latestItemSummary: itemSummary,
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
      explanation: "Replay results are review-only audit evidence. The dashboard cannot approve, activate, execute, or mutate anything.",
      warnings: [
        "Review dashboard is read-only.",
        "No real model execution is enabled.",
        "No inference endpoint is exposed.",
        "No business mutation is possible.",
      ],
      blockers: [],
      recommendedNextAction: "Review validation failures and unsafe-flag counters before any future replay comparison work.",
    },
    replaySummary: summary,
    recentReplayBatches: batches,
    latestReplayItems: latestItems,
  };
};

export const getShadowRuntimeReplayReviewBatchDetail = async (batchId: unknown, itemLimitInput?: unknown) => {
  const itemLimit = clampLimit(itemLimitInput, DEFAULT_ITEM_LIMIT, MAX_ITEM_LIMIT);
  const batch = await getShadowRuntimeReplayBatchById(batchId);
  if (!batch) return null;
  const items = await listShadowRuntimeReplayItems(batch.id, itemLimit);
  return {
    generatedAt: new Date().toISOString(),
    currentStatus: PHASE_LABEL,
    dashboardLabel: "Replay Result Review Dashboard",
    batch,
    itemSummary: summarizeReplayItems(items),
    items,
    safetyGate: getShadowRuntimeSafetyGate(),
    reviewOnly: true,
    approvalAllowed: false,
    activationAllowed: false,
    productionInferenceAllowed: false,
    businessMutationAllowed: false,
  };
};
