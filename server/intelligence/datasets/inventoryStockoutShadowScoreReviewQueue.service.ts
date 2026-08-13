import { buildInventoryStockoutReadOnlyShadowScoringRuntime } from "./inventoryStockoutReadOnlyShadowScoringRuntime.service";

const REVIEW_QUEUE_CONTRACT_KEY = "inventory_stockout_shadow_score_review_queue_v1" as const;
const REVIEW_QUEUE_CONTRACT_VERSION = "v1" as const;
const REQUIRED_RUNTIME_CONTRACT_KEY = "inventory_stockout_read_only_shadow_scoring_runtime_v1" as const;
const REVIEW_QUEUE_SCOPE = "phase4b_shadow_score_review_queue_governance_only_no_runtime_execution" as const;
const FEATURE_FLAG_KEY = "ml.inventoryStockout.shadowScoreReviewQueue.enabled" as const;
const QUEUE_STRATEGY = "read_only_shadow_score_manual_review_queue_v1" as const;

const featureFlagDefault = false as const;
const reviewQueueEnabled = false as const;
const manualReviewOnly = true as const;
const runtimeInvocationAllowed = false as const;
const modelExecutionAllowed = false as const;
const inferenceEndpointExposed = false as const;
const productionInferenceEndpointExposed = false as const;
const productionIntegrationAllowed = false as const;
const decisionAutomationAllowed = false as const;
const canChangeInventoryOrAccounting = false as const;
const auditOnly = true as const;
const mutationAllowed = false as const;
const queuePersistenceAllowed = false as const;
const scoreRecalculationAllowed = false as const;
const operationalDecisionAllowed = false as const;
const customerSupplierMessageAllowed = false as const;
const runtimeArtifactLoadAllowed = false as const;
const externalModelCallAllowed = false as const;

const asNumber = (value: unknown): number | null => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
};

const clamp = (value: number, min = 0, max = 100): number => Math.max(min, Math.min(max, Math.round(value)));

const csvEscape = (value: unknown): string => {
  const text = value == null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const buildQueueItemId = (importId: number | null | undefined, queueReason: string, priority: string): string => {
  const normalizedImportId = importId || "latest";
  const normalizedReason = queueReason.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "review";
  return `shadow-score-review-${normalizedImportId}-${priority}-${normalizedReason}`;
};

const buildSafetyPolicy = (generatedAt: string) => ({
  generatedAt,
  policyKey: "shadow_score_review_queue_safety_policy_v1",
  phase: "Phase 4B — Shadow Score Review Queue",
  requiredFlags: {
    featureFlagDefault,
    reviewQueueEnabled,
    manualReviewOnly,
    runtimeInvocationAllowed,
    modelExecutionAllowed,
    inferenceEndpointExposed,
    productionInferenceEndpointExposed,
    productionIntegrationAllowed,
    decisionAutomationAllowed,
    canChangeInventoryOrAccounting,
    auditOnly,
    mutationAllowed,
    queuePersistenceAllowed,
    scoreRecalculationAllowed,
    operationalDecisionAllowed,
    customerSupplierMessageAllowed,
    runtimeArtifactLoadAllowed,
    externalModelCallAllowed,
  },
});

export const buildInventoryStockoutShadowScoreReviewQueueContract = () => ({
  contractKey: REVIEW_QUEUE_CONTRACT_KEY,
  contractVersion: REVIEW_QUEUE_CONTRACT_VERSION,
  generatedAt: new Date().toISOString(),
  purpose: "Define the Phase 4B read-only manual review queue for Phase 4A shadow scores without model execution, score persistence, production inference, automation, or business mutation.",
  requiredRuntimeContractKey: REQUIRED_RUNTIME_CONTRACT_KEY,
  reviewQueueScope: REVIEW_QUEUE_SCOPE,
  queueStrategy: QUEUE_STRATEGY,
  requiredAssertions: [
    "Shadow score review queue is feature-flagged off by default.",
    "Queue rows are derived read-only from Phase 4A runtime summary evidence.",
    "No model artifact, external model service, runtime scorer, or shell runner is executed.",
    "No score, queue item, or review state is persisted as operational truth in Phase 4B.",
    "Queue items are for human governance triage only and cannot trigger inventory, accounting, pricing, sales, repair, partner, customer, ledger, report, or messaging changes.",
  ],
  forbiddenBehavior: [
    "Do not add POST, PUT, PATCH, or DELETE review-queue endpoints.",
    "Do not persist generated queue items.",
    "Do not calculate new model scores.",
    "Do not expose production inference endpoints.",
    "Do not write recommendations into business records.",
  ],
  operationalPolicy: {
    productionIntegrationAllowed: false,
    productionInferenceEndpointExposed: false,
    modelExecutionAllowed: false,
    decisionAutomationAllowed: false,
    canChangeInventoryOrAccounting: false,
    queuePersistenceAllowed: false,
  },
});

export const buildInventoryStockoutShadowScoreReviewQueue = async (importIdInput?: unknown, options: Record<string, unknown> = {}) => {
  const generatedAt = new Date().toISOString();
  const runtime = await buildInventoryStockoutReadOnlyShadowScoringRuntime(importIdInput, options) as Record<string, any>;
  const runtimeSummary = runtime.summary || {};
  const scoringPreview = runtime.scoringPreview || {};
  const importId = asNumber(runtimeSummary.importId) ?? asNumber(scoringPreview.importId) ?? asNumber(importIdInput) ?? null;
  const blockers = Array.isArray(runtimeSummary.blockers) ? runtimeSummary.blockers : [];
  const warnings = Array.isArray(runtimeSummary.warnings) ? runtimeSummary.warnings : [];
  const readinessScorePct = clamp(Number(runtimeSummary.readinessScorePct) || 0);
  const shadowScore = clamp(Number(runtimeSummary.shadowScore) || 0);
  const runtimeReady = runtimeSummary.runtimeStatus === "read_only_shadow_runtime_ready";

  const derivedItems = [
    {
      queueReason: runtimeReady ? "runtime-ready-manual-review" : "runtime-evidence-incomplete-review",
      priority: runtimeReady ? "medium" : "high",
      reviewStatus: "pending_manual_review",
      evidenceSource: "phase4a_read_only_shadow_scoring_runtime_summary",
      title: runtimeReady ? "Manual review of ready read-only shadow score" : "Manual review required before trusting shadow score preview",
      summary: runtimeReady
        ? "Phase 4A read-only score evidence is complete enough for human governance review, but production inference remains disabled."
        : "Phase 4A read-only score evidence is incomplete or blocked; human governance review should inspect blockers and warnings.",
    },
    ...(blockers.length ? blockers.slice(0, 5).map((blocker: string, index: number) => ({
      queueReason: `blocker-${index + 1}`,
      priority: "critical",
      reviewStatus: "pending_manual_review",
      evidenceSource: "phase4a_blocker",
      title: "Shadow score blocker requires review",
      summary: blocker,
    })) : []),
    ...(!blockers.length && warnings.length ? warnings.slice(0, 5).map((warning: string, index: number) => ({
      queueReason: `warning-${index + 1}`,
      priority: "medium",
      reviewStatus: "pending_manual_review",
      evidenceSource: "phase4a_warning",
      title: "Shadow score warning requires review",
      summary: warning,
    })) : []),
  ];

  const reviewQueueItems = derivedItems.map((item) => ({
    id: buildQueueItemId(importId, item.queueReason, item.priority),
    importId,
    generatedAt,
    shadowScore,
    readinessScorePct,
    queueStrategy: QUEUE_STRATEGY,
    modelOutput: null,
    operationalRecommendation: null,
    inventoryMutation: null,
    accountingMutation: null,
    pricingMutation: null,
    scorePersistence: null,
    ...item,
  }));

  const criticalCount = reviewQueueItems.filter((item) => item.priority === "critical").length;
  const highCount = reviewQueueItems.filter((item) => item.priority === "high").length;
  const mediumCount = reviewQueueItems.filter((item) => item.priority === "medium").length;
  const queueStatus = criticalCount ? "blocked_manual_review_required" : highCount ? "needs_manual_review" : "review_queue_ready";
  const safetyPolicy = buildSafetyPolicy(generatedAt);
  const reviewQueueManifest = {
    manifestVersion: "shadow_score_review_queue_manifest_v1",
    generatedAt,
    importId,
    reviewQueueContractKey: REVIEW_QUEUE_CONTRACT_KEY,
    requiredRuntimeContractKey: REQUIRED_RUNTIME_CONTRACT_KEY,
    queueStatus,
    queueItemCount: reviewQueueItems.length,
    featureFlagKey: FEATURE_FLAG_KEY,
    featureFlagDefault,
    reviewQueueEnabled,
    manualReviewOnly,
    modelExecutionAllowed,
    productionInferenceEndpointExposed,
    mutationAllowed,
    queuePersistenceAllowed,
  };

  return {
    success: true,
    contract: buildInventoryStockoutShadowScoreReviewQueueContract(),
    summary: {
      generatedAt,
      importId,
      queueStatus,
      recommendation: queueStatus === "review_queue_ready" ? "review_shadow_score_queue_manually_without_runtime_activation" : "resolve_runtime_evidence_before_queue_signoff",
      queueItemCount: reviewQueueItems.length,
      pendingReviewCount: reviewQueueItems.length,
      criticalCount,
      highCount,
      mediumCount,
      readinessScorePct,
      shadowScore,
      featureFlagKey: FEATURE_FLAG_KEY,
      featureFlagDefault,
      reviewQueueEnabled,
      manualReviewOnly,
      runtimeInvocationAllowed,
      modelExecutionAllowed,
      inferenceEndpointExposed,
      productionInferenceEndpointExposed,
      productionIntegrationAllowed,
      decisionAutomationAllowed,
      canChangeInventoryOrAccounting,
      auditOnly,
      mutationAllowed,
      queuePersistenceAllowed,
      scoreRecalculationAllowed,
      operationalDecisionAllowed,
      customerSupplierMessageAllowed,
      runtimeArtifactLoadAllowed,
      externalModelCallAllowed,
      runtimeStatus: runtimeSummary.runtimeStatus || null,
      blockers,
      warnings,
      recommendedNextAction: queueStatus === "review_queue_ready" ? "review_shadow_score_queue_manually_without_runtime_activation" : "resolve_runtime_evidence_before_queue_signoff",
    },
    reviewQueueItems,
    reviewQueueManifest,
    safetyPolicy,
    runtimeSummary,
    scoringPreview,
  };
};

export const buildMlShadowScoreReviewQueueCatalogSummary = async () => {
  const current = await buildInventoryStockoutShadowScoreReviewQueue();
  return {
    generatedAt: new Date().toISOString(),
    contract: buildInventoryStockoutShadowScoreReviewQueueContract(),
    currentShadowScoreReviewQueue: current.summary,
    reviewQueueItems: current.reviewQueueItems,
    reviewQueueManifest: current.reviewQueueManifest,
    recommendedNextAction: current.summary.recommendedNextAction,
  };
};

export const exportInventoryStockoutShadowScoreReviewQueueManifest = async (importIdInput?: unknown, options: Record<string, unknown> = {}) => {
  const queue = await buildInventoryStockoutShadowScoreReviewQueue(importIdInput, options);
  return queue.reviewQueueManifest;
};

export const exportInventoryStockoutShadowScoreReviewQueueJson = async (importIdInput?: unknown, options: Record<string, unknown> = {}) => {
  return buildInventoryStockoutShadowScoreReviewQueue(importIdInput, options);
};

export const exportInventoryStockoutShadowScoreReviewQueueCsv = async (importIdInput?: unknown, options: Record<string, unknown> = {}) => {
  const queue = await buildInventoryStockoutShadowScoreReviewQueue(importIdInput, options);
  const headers = ["id", "importId", "generatedAt", "priority", "reviewStatus", "queueReason", "shadowScore", "readinessScorePct", "evidenceSource", "title", "summary"];
  const rows = queue.reviewQueueItems.map((item) => headers.map((header) => csvEscape((item as Record<string, unknown>)[header])).join(","));
  const csv = [headers.join(","), ...rows].join("\n");
  return {
    filename: `inventory-stockout-shadow-score-review-queue-${queue.summary.importId || "latest"}.csv`,
    csv,
  };
};
