import {
  listHistoricalFeatureSnapshotsForReplay,
  recordShadowRuntimeReplayBatch,
  recordShadowRuntimeReplayItem,
  updateShadowRuntimeReplayBatchSummary,
  type ShadowRuntimeReplaySourceRow,
} from "../../db/domains/ml/mlShadowRuntimeReplays.db";
import { recordShadowRuntimeAttempt } from "../../db/domains/ml/mlShadowRuntimeAttempts.db";
import { runExternalModelShadowAdapter } from "./externalModelShadowAdapter";
import {
  buildShadowRuntimeSafetyNotes,
  getShadowRuntimeSafetyGate,
} from "./shadowRuntimeSafety";
import {
  mapShadowRuntimeAttemptInputSnapshot,
  mapShadowRuntimeAttemptOutputSnapshot,
  mapShadowRuntimeAttemptStatus,
} from "./shadowRuntimeResultMapper";
import type {
  ExternalModelShadowRuntimeInput,
  ShadowRuntimeDryRunResult,
} from "./shadowRuntimeTypes";

const PHASE_LABEL = "Phase 5B — Shadow Runtime Replay Against Historical Feature Snapshots" as const;
const REPLAY_CONTRACT_KEY = "external_model_shadow_runtime_historical_replay_v1" as const;
const REPLAY_CONTRACT_VERSION = "v1" as const;
const DEFAULT_REPLAY_LIMIT = 25;
const MAX_REPLAY_LIMIT = 100;
const DEFAULT_MODEL_IMPORT_ID = "phase5b_candidate_contract" as const;
const DEFAULT_MODEL_KEY = "external_model_candidate_shadow_contract" as const;
const DEFAULT_MODEL_VERSION = "v1" as const;

const isPlainRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === "object" && value !== null && !Array.isArray(value)
);

const safeParseJson = <T>(value: unknown, fallback: T): T => {
  if (typeof value !== "string" || value.trim().length === 0) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch (_err) {
    return fallback;
  }
};

const clampReplayLimit = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_REPLAY_LIMIT;
  return Math.max(1, Math.min(MAX_REPLAY_LIMIT, Math.round(parsed)));
};

const normalizeOptionalText = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

const buildBaselinePredictionFromSnapshot = (
  row: ShadowRuntimeReplaySourceRow,
  features: Record<string, unknown>,
): Record<string, unknown> => {
  const base: Record<string, unknown> = {
    source: "rule_statistical_baseline",
    modelKey: row.modelKey || "rule_statistical_baseline",
    modelVersion: row.modelVersion || "v1",
    predictionType: row.predictionType,
    entityType: row.entityType,
    entityId: row.entityId,
    horizonDays: row.horizonDays,
    confidence: row.confidence,
    predictionRunId: row.runId,
    featureSnapshotId: row.snapshotId,
  };

  if (row.predictionType === "inventory_stockout") {
    return {
      ...base,
      predictedRisk: features.baselinePredictedRisk ?? null,
      daysToStockout: features.daysToStockout ?? null,
      severity: features.severity ?? null,
      suggestedBuyQty: features.suggestedBuyQty ?? null,
      stockQuantity: features.stockQuantity ?? null,
    };
  }

  if (row.predictionType === "sales_forecast") {
    return {
      ...base,
      tomorrowSalesForecast: row.tomorrowSalesForecast ?? features.tomorrowSalesForecast ?? null,
      next7SalesForecast: row.next7SalesForecast ?? features.next7SalesForecast ?? null,
      tomorrowOrdersForecast: row.tomorrowOrdersForecast ?? features.tomorrowOrdersForecast ?? null,
      avgTicket7: features.avgTicket7 ?? null,
      trendPct: features.trendPct ?? null,
    };
  }

  if (row.predictionType === "collection_pressure") {
    return {
      ...base,
      overdueAmount: row.collectionOverdueAmount ?? features.overdueAmount ?? null,
      dueSoonAmount: row.collectionDueSoonAmount ?? features.dueSoonAmount ?? null,
      overdueCount: features.overdueCount ?? null,
      dueSoonCount: features.dueSoonCount ?? null,
    };
  }

  return base;
};

const buildReplayDelta = (
  baselinePrediction: Record<string, unknown>,
  output: ShadowRuntimeDryRunResult,
): Record<string, unknown> => ({
  comparisonStatus: "candidate_output_unavailable_runtime_disabled",
  baselineAvailable: isPlainRecord(baselinePrediction) && Object.keys(baselinePrediction).length > 0,
  candidateScoreAvailable: output.score !== null,
  scoreDelta: null,
  labelChanged: null,
  confidenceDelta: null,
  explanation: "Historical replay validated the runtime contract only. External model output is unavailable because model execution remains disabled.",
});

const buildRuntimeInputFromSnapshot = (
  row: ShadowRuntimeReplaySourceRow,
  features: Record<string, unknown>,
  baselinePrediction: Record<string, unknown>,
  options: Record<string, unknown>,
  requestedByUserId: string | number | null,
): ExternalModelShadowRuntimeInput => ({
  modelImportId: options.modelImportId as string | number || DEFAULT_MODEL_IMPORT_ID,
  modelKey: normalizeOptionalText(options.modelKey) || DEFAULT_MODEL_KEY,
  modelVersion: normalizeOptionalText(options.modelVersion) || DEFAULT_MODEL_VERSION,
  entityType: row.entityType || "snapshot",
  entityId: row.entityId ?? row.snapshotId,
  predictionType: row.predictionType,
  horizonDays: row.horizonDays,
  featureSnapshot: {
    ...features,
    featureSnapshotId: row.snapshotId,
    predictionRunId: row.runId,
    observedAt: row.snapshotCreatedAt || row.runCreatedAt || null,
  },
  baselinePrediction,
  requestedAt: new Date().toISOString(),
  requestedByUserId,
});

export const buildShadowRuntimeHistoricalReplayContract = () => ({
  contractKey: REPLAY_CONTRACT_KEY,
  contractVersion: REPLAY_CONTRACT_VERSION,
  phase: PHASE_LABEL,
  generatedAt: new Date().toISOString(),
  purpose: "Replay historical predictive_feature_snapshots through the disabled-by-default external model shadow runtime adapter for contract validation and audit evidence only.",
  sourceTable: "predictive_feature_snapshots",
  auditTables: [
    "ml_shadow_runtime_attempts",
    "ml_shadow_runtime_replay_batches",
    "ml_shadow_runtime_replay_items",
  ],
  allowedBehavior: [
    "Select historical feature snapshots.",
    "Build a baseline comparison envelope from existing baseline records.",
    "Call the disabled dry-run adapter contract path.",
    "Persist replay batch/item evidence only.",
  ],
  forbiddenBehavior: [
    "Do not execute a real model.",
    "Do not load external model artifacts.",
    "Do not expose an inference endpoint.",
    "Do not update inventory, accounting, customer, partner, sales, pricing, ledger, report, or repair records.",
    "Do not replace or auto-approve baseline predictions.",
  ],
  safetyGate: getShadowRuntimeSafetyGate(),
});

export const runShadowRuntimeHistoricalReplay = async (options: Record<string, unknown> = {}) => {
  const requestedByUserId = options.requestedByUserId as string | number | null | undefined ?? null;
  const limit = clampReplayLimit(options.limit);
  const predictionType = normalizeOptionalText(options.predictionType);
  const safetyNotes = buildShadowRuntimeSafetyNotes();
  const sourceRows = await listHistoricalFeatureSnapshotsForReplay({ limit, predictionType });
  const modelImportId = options.modelImportId as string | number || DEFAULT_MODEL_IMPORT_ID;
  const modelKey = normalizeOptionalText(options.modelKey) || DEFAULT_MODEL_KEY;
  const modelVersion = normalizeOptionalText(options.modelVersion) || DEFAULT_MODEL_VERSION;
  const replayKey = `${REPLAY_CONTRACT_KEY}:${Date.now()}`;

  const batch = await recordShadowRuntimeReplayBatch({
    replayKey,
    modelImportId,
    modelKey,
    modelVersion,
    predictionType,
    requestedLimit: limit,
    sourceSnapshotCount: sourceRows.length,
    status: "replay_started_audit_only",
    safetyNotes,
    summary: {
      phase: PHASE_LABEL,
      contractKey: REPLAY_CONTRACT_KEY,
      sourceSnapshotCount: sourceRows.length,
      modelExecutionAllowed: false,
      inferenceEndpointExposed: false,
      businessMutationAllowed: false,
    },
    createdByUserId: requestedByUserId,
  });

  if (!batch) {
    return {
      success: false,
      phase: PHASE_LABEL,
      status: "replay_batch_not_recorded",
      safetyGate: getShadowRuntimeSafetyGate(),
      rows: [],
    };
  }

  const replayRows = [] as Array<Record<string, unknown>>;
  let validationFailedCount = 0;
  let modelExecutionAttemptedCount = 0;
  let inferenceEndpointExposedCount = 0;
  let businessMutationAllowedCount = 0;

  for (const row of sourceRows) {
    const features = safeParseJson<Record<string, unknown>>(row.featuresJson, {});
    const baselinePrediction = buildBaselinePredictionFromSnapshot(row, features);
    const runtimeInput = buildRuntimeInputFromSnapshot(
      row,
      features,
      baselinePrediction,
      { ...options, modelImportId, modelKey, modelVersion },
      requestedByUserId,
    );
    const output = await runExternalModelShadowAdapter(runtimeInput);
    if (!output.validation.valid) validationFailedCount += 1;
    if (output.modelExecutionAttempted) modelExecutionAttemptedCount += 1;
    if (output.inferenceEndpointExposed) inferenceEndpointExposedCount += 1;
    if (output.canChangeInventoryOrAccounting) businessMutationAllowedCount += 1;

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
      status: mapShadowRuntimeAttemptStatus(output, output.validation.valid),
      createdByUserId: requestedByUserId,
    });

    const delta = buildReplayDelta(baselinePrediction, output);
    const item = await recordShadowRuntimeReplayItem({
      batchId: batch.id,
      attemptId: attempt?.id ?? null,
      snapshotId: row.snapshotId,
      predictionRunId: row.runId,
      predictionType: row.predictionType,
      entityType: row.entityType,
      entityId: row.entityId,
      runtimeMode: output.mode,
      validationStatus: output.validation.status,
      allowed: output.allowed,
      modelExecutionAttempted: output.modelExecutionAttempted,
      modelExecutionAllowed: output.modelExecutionAllowed,
      inferenceEndpointExposed: output.inferenceEndpointExposed,
      productionIntegrationAllowed: output.productionIntegrationAllowed,
      decisionAutomationAllowed: output.decisionAutomationAllowed,
      canChangeInventoryOrAccounting: output.canChangeInventoryOrAccounting,
      baselinePrediction,
      candidateOutput: mapShadowRuntimeAttemptOutputSnapshot(output),
      delta,
      status: output.validation.valid ? "replay_contract_validated_runtime_disabled" : "replay_validation_failed_runtime_disabled",
    });

    replayRows.push({
      itemId: item?.id ?? null,
      attemptId: attempt?.id ?? null,
      snapshotId: row.snapshotId,
      predictionRunId: row.runId,
      predictionType: row.predictionType,
      entityType: row.entityType,
      entityId: row.entityId,
      validationStatus: output.validation.status,
      runtimeMode: output.mode,
      status: item?.status || "replay_item_not_recorded",
      delta,
    });
  }

  const status = sourceRows.length === 0
    ? "no_historical_snapshots_available"
    : validationFailedCount > 0
      ? "replay_completed_with_validation_warnings_audit_only"
      : "replay_completed_audit_only_runtime_disabled";

  const summary = {
    phase: PHASE_LABEL,
    contractKey: REPLAY_CONTRACT_KEY,
    replayKey,
    modelImportId,
    modelKey,
    modelVersion,
    predictionType,
    requestedLimit: limit,
    sourceSnapshotCount: sourceRows.length,
    replayedSnapshotCount: replayRows.length,
    validationFailedCount,
    modelExecutionAttemptedCount,
    inferenceEndpointExposedCount,
    businessMutationAllowedCount,
    status,
    modelExecutionAllowed: false,
    productionInferenceExposed: false,
    businessMutationAllowed: false,
    explanation: "Historical snapshots were replayed through the disabled dry-run adapter contract only. No external model was called and no business record was changed.",
  };

  const updatedBatch = await updateShadowRuntimeReplayBatchSummary(batch.id, {
    sourceSnapshotCount: sourceRows.length,
    replayedSnapshotCount: replayRows.length,
    validationFailedCount,
    modelExecutionAttemptedCount,
    inferenceEndpointExposedCount,
    businessMutationAllowedCount,
    status,
    safetyNotes,
    summary,
  });

  return {
    success: true,
    phase: PHASE_LABEL,
    contract: buildShadowRuntimeHistoricalReplayContract(),
    summary,
    batch: updatedBatch || batch,
    rows: replayRows,
    safetyGate: getShadowRuntimeSafetyGate(),
  };
};
