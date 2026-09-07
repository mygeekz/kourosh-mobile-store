import {
  buildInventoryStockoutShadowScoreReviewQueue,
  exportInventoryStockoutShadowScoreReviewQueueCsv,
} from "./inventoryStockoutShadowScoreReviewQueue.service";

const SIGNOFF_WORKFLOW_CONTRACT_KEY = "inventory_stockout_shadow_score_review_signoff_workflow_v1" as const;
const SIGNOFF_WORKFLOW_CONTRACT_VERSION = "v1" as const;
const REQUIRED_REVIEW_QUEUE_CONTRACT_KEY = "inventory_stockout_shadow_score_review_queue_v1" as const;
const SIGNOFF_WORKFLOW_SCOPE = "phase4c_shadow_score_review_signoff_workflow_governance_only_no_runtime_execution" as const;
const FEATURE_FLAG_KEY = "ml.inventoryStockout.shadowScoreReviewSignoffWorkflow.enabled" as const;
const WORKFLOW_STRATEGY = "read_only_shadow_score_human_signoff_workflow_v1" as const;

const featureFlagDefault = false as const;
const signoffWorkflowEnabled = false as const;
const humanSignoffOnly = true as const;
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
const signoffPersistenceAllowed = false as const;
const queuePersistenceAllowed = false as const;
const scoreRecalculationAllowed = false as const;
const operationalApprovalAllowed = false as const;
const operationalDecisionAllowed = false as const;
const customerSupplierMessageAllowed = false as const;
const runtimeArtifactLoadAllowed = false as const;
const externalModelCallAllowed = false as const;

const csvEscape = (value: unknown): string => {
  const text = value == null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const asQueueItems = (queue: Record<string, any>) => Array.isArray(queue.reviewQueueItems) ? queue.reviewQueueItems as Array<Record<string, any>> : [];

const buildSafetyPolicy = (generatedAt: string) => ({
  generatedAt,
  policyKey: "shadow_score_review_signoff_workflow_safety_policy_v1",
  phase: "Phase 4C — Shadow Score Review Signoff Workflow",
  requiredFlags: {
    featureFlagDefault,
    signoffWorkflowEnabled,
    humanSignoffOnly,
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
    signoffPersistenceAllowed,
    queuePersistenceAllowed,
    scoreRecalculationAllowed,
    operationalApprovalAllowed,
    operationalDecisionAllowed,
    customerSupplierMessageAllowed,
    runtimeArtifactLoadAllowed,
    externalModelCallAllowed,
  },
});

export const buildInventoryStockoutShadowScoreReviewSignoffWorkflowContract = () => ({
  contractKey: SIGNOFF_WORKFLOW_CONTRACT_KEY,
  contractVersion: SIGNOFF_WORKFLOW_CONTRACT_VERSION,
  generatedAt: new Date().toISOString(),
  purpose: "Define the Phase 4C read-only human signoff workflow envelope for Phase 4B shadow score review queue evidence without persisting signoffs, executing models, exposing production inference, or mutating business records.",
  requiredReviewQueueContractKey: REQUIRED_REVIEW_QUEUE_CONTRACT_KEY,
  signoffWorkflowScope: SIGNOFF_WORKFLOW_SCOPE,
  workflowStrategy: WORKFLOW_STRATEGY,
  requiredAssertions: [
    "Shadow score review signoff workflow is feature-flagged off by default.",
    "Workflow steps are derived read-only from Phase 4B queue evidence.",
    "No signoff, approval, or queue state is persisted in Phase 4C.",
    "No model artifact, external model service, runtime scorer, or shell runner is executed.",
    "Human signoff status is governance-only and cannot authorize production inference or business mutation.",
  ],
  forbiddenBehavior: [
    "Do not add POST, PUT, PATCH, or DELETE signoff workflow endpoints in Phase 4C.",
    "Do not persist signoff decisions or approval records.",
    "Do not recalculate or overwrite shadow scores.",
    "Do not expose production inference endpoints.",
    "Do not write signoff outcomes into inventory, accounting, pricing, sales, repairs, partner, customer, ledger, report, or messaging records.",
  ],
  operationalPolicy: {
    productionIntegrationAllowed: false,
    productionInferenceEndpointExposed: false,
    modelExecutionAllowed: false,
    decisionAutomationAllowed: false,
    canChangeInventoryOrAccounting: false,
    signoffPersistenceAllowed: false,
  },
});

export const buildInventoryStockoutShadowScoreReviewSignoffWorkflow = async (importIdInput?: unknown, options: Record<string, unknown> = {}) => {
  const generatedAt = new Date().toISOString();
  const queue = await buildInventoryStockoutShadowScoreReviewQueue(importIdInput, options) as Record<string, any>;
  const queueSummary = queue.summary || {};
  const queueItems = asQueueItems(queue);
  const criticalCount = Number(queueSummary.criticalCount) || queueItems.filter((item) => item.priority === "critical").length;
  const highCount = Number(queueSummary.highCount) || queueItems.filter((item) => item.priority === "high").length;
  const pendingReviewCount = Number(queueSummary.pendingReviewCount) || queueItems.length;
  const blockers = Array.isArray(queueSummary.blockers) ? queueSummary.blockers : [];
  const warnings = Array.isArray(queueSummary.warnings) ? queueSummary.warnings : [];
  const importId = queueSummary.importId ?? null;
  const workflowStatus = criticalCount
    ? "blocked_signoff_not_allowed"
    : highCount
      ? "manual_evidence_review_required_before_signoff"
      : "ready_for_human_governance_signoff_review";
  const signoffAllowed = workflowStatus === "ready_for_human_governance_signoff_review";
  const workflowSteps = [
    {
      stepKey: "verify_queue_evidence",
      stepStatus: queueItems.length ? "ready_for_manual_review" : "blocked_missing_queue_evidence",
      evidenceSource: "phase4b_shadow_score_review_queue",
      requiredHumanAction: "Review queue item titles, summaries, priorities, blockers, and warnings.",
    },
    {
      stepKey: "confirm_safety_gates",
      stepStatus: "required_before_any_future_runtime_phase",
      evidenceSource: "phase4c_safety_policy",
      requiredHumanAction: "Confirm model execution, production inference, automation, and business mutation remain disabled.",
    },
    {
      stepKey: "record_external_signoff_note",
      stepStatus: signoffAllowed ? "manual_signoff_note_can_be_recorded_outside_phase4c" : "signoff_blocked_until_queue_evidence_is_clean",
      evidenceSource: "human_governance_review",
      requiredHumanAction: "Record any actual signoff outside this read-only workflow until a future persistence phase explicitly enables signoff storage.",
    },
  ];

  const signoffWorkflowManifest = {
    manifestVersion: "shadow_score_review_signoff_workflow_manifest_v1",
    generatedAt,
    importId,
    signoffWorkflowContractKey: SIGNOFF_WORKFLOW_CONTRACT_KEY,
    requiredReviewQueueContractKey: REQUIRED_REVIEW_QUEUE_CONTRACT_KEY,
    workflowStatus,
    signoffAllowed,
    workflowStepCount: workflowSteps.length,
    queueItemCount: queueItems.length,
    featureFlagKey: FEATURE_FLAG_KEY,
    featureFlagDefault,
    signoffWorkflowEnabled,
    humanSignoffOnly,
    modelExecutionAllowed,
    productionInferenceEndpointExposed,
    mutationAllowed,
    signoffPersistenceAllowed,
  };

  const safetyPolicy = buildSafetyPolicy(generatedAt);

  return {
    success: true,
    contract: buildInventoryStockoutShadowScoreReviewSignoffWorkflowContract(),
    summary: {
      generatedAt,
      importId,
      workflowStatus,
      recommendation: signoffAllowed ? "perform_human_governance_signoff_review_without_runtime_activation" : "resolve_shadow_score_queue_blockers_before_signoff_review",
      signoffAllowed,
      workflowStepCount: workflowSteps.length,
      queueItemCount: queueItems.length,
      pendingReviewCount,
      criticalCount,
      highCount,
      readinessScorePct: queueSummary.readinessScorePct ?? 0,
      shadowScore: queueSummary.shadowScore ?? 0,
      featureFlagKey: FEATURE_FLAG_KEY,
      featureFlagDefault,
      signoffWorkflowEnabled,
      humanSignoffOnly,
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
      signoffPersistenceAllowed,
      queuePersistenceAllowed,
      scoreRecalculationAllowed,
      operationalApprovalAllowed,
      operationalDecisionAllowed,
      customerSupplierMessageAllowed,
      runtimeArtifactLoadAllowed,
      externalModelCallAllowed,
      blockers,
      warnings,
      recommendedNextAction: signoffAllowed ? "perform_human_governance_signoff_review_without_runtime_activation" : "resolve_shadow_score_queue_blockers_before_signoff_review",
    },
    workflowSteps,
    signoffWorkflowManifest,
    safetyPolicy,
    reviewQueueSummary: queueSummary,
    reviewQueueItems: queueItems,
  };
};

export const buildMlShadowScoreReviewSignoffWorkflowCatalogSummary = async () => {
  const current = await buildInventoryStockoutShadowScoreReviewSignoffWorkflow();
  return {
    generatedAt: new Date().toISOString(),
    contract: buildInventoryStockoutShadowScoreReviewSignoffWorkflowContract(),
    currentShadowScoreReviewSignoffWorkflow: current.summary,
    workflowSteps: current.workflowSteps,
    signoffWorkflowManifest: current.signoffWorkflowManifest,
    recommendedNextAction: current.summary.recommendedNextAction,
  };
};

export const exportInventoryStockoutShadowScoreReviewSignoffWorkflowManifest = async (importIdInput?: unknown, options: Record<string, unknown> = {}) => {
  const workflow = await buildInventoryStockoutShadowScoreReviewSignoffWorkflow(importIdInput, options);
  return workflow.signoffWorkflowManifest;
};

export const exportInventoryStockoutShadowScoreReviewSignoffWorkflowJson = async (importIdInput?: unknown, options: Record<string, unknown> = {}) => {
  return buildInventoryStockoutShadowScoreReviewSignoffWorkflow(importIdInput, options);
};

export const exportInventoryStockoutShadowScoreReviewSignoffWorkflowCsv = async (importIdInput?: unknown, options: Record<string, unknown> = {}) => {
  const workflow = await buildInventoryStockoutShadowScoreReviewSignoffWorkflow(importIdInput, options);
  const headers = ["stepKey", "stepStatus", "evidenceSource", "requiredHumanAction"];
  const rows = workflow.workflowSteps.map((step) => headers.map((header) => csvEscape((step as Record<string, unknown>)[header])).join(","));
  const csv = [headers.join(","), ...rows].join("\n");
  return {
    filename: `inventory-stockout-shadow-score-review-signoff-workflow-${workflow.summary.importId || "latest"}.csv`,
    csv,
  };
};
