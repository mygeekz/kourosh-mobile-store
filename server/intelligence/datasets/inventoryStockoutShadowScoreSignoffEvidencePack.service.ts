import {
  buildInventoryStockoutShadowScoreReviewSignoffWorkflow,
  exportInventoryStockoutShadowScoreReviewSignoffWorkflowCsv,
} from "./inventoryStockoutShadowScoreReviewSignoffWorkflow.service";

const SIGNOFF_EVIDENCE_PACK_CONTRACT_KEY = "inventory_stockout_shadow_score_signoff_evidence_pack_v1" as const;
const SIGNOFF_EVIDENCE_PACK_CONTRACT_VERSION = "v1" as const;
const REQUIRED_SIGNOFF_WORKFLOW_CONTRACT_KEY = "inventory_stockout_shadow_score_review_signoff_workflow_v1" as const;
const EVIDENCE_PACK_SCOPE = "phase4d_shadow_score_signoff_evidence_pack_governance_only_no_runtime_execution" as const;
const FEATURE_FLAG_KEY = "ml.inventoryStockout.shadowScoreSignoffEvidencePack.enabled" as const;
const EVIDENCE_PACK_STRATEGY = "read_only_shadow_score_signoff_evidence_pack_v1" as const;

const featureFlagDefault = false as const;
const evidencePackEnabled = false as const;
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
const evidencePersistenceAllowed = false as const;
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

const asArray = (value: unknown): Array<Record<string, any>> => Array.isArray(value) ? value as Array<Record<string, any>> : [];

const buildSafetyPolicy = (generatedAt: string) => ({
  generatedAt,
  policyKey: "shadow_score_signoff_evidence_pack_safety_policy_v1",
  phase: "Phase 4D — Shadow Score Signoff Evidence Pack",
  requiredFlags: {
    featureFlagDefault,
    evidencePackEnabled,
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
    evidencePersistenceAllowed,
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

export const buildInventoryStockoutShadowScoreSignoffEvidencePackContract = () => ({
  contractKey: SIGNOFF_EVIDENCE_PACK_CONTRACT_KEY,
  contractVersion: SIGNOFF_EVIDENCE_PACK_CONTRACT_VERSION,
  generatedAt: new Date().toISOString(),
  purpose: "Define the Phase 4D read-only evidence pack envelope for Phase 4C shadow score signoff workflow evidence without persisting evidence, executing models, exposing production inference, or mutating business records.",
  requiredSignoffWorkflowContractKey: REQUIRED_SIGNOFF_WORKFLOW_CONTRACT_KEY,
  evidencePackScope: EVIDENCE_PACK_SCOPE,
  evidencePackStrategy: EVIDENCE_PACK_STRATEGY,
  requiredAssertions: [
    "Shadow score signoff evidence pack is feature-flagged off by default.",
    "Evidence pack sections are derived read-only from Phase 4C signoff workflow evidence.",
    "No evidence pack, signoff, approval, or queue state is persisted in Phase 4D.",
    "No model artifact, external model service, runtime scorer, or shell runner is executed.",
    "Evidence pack status is governance-only and cannot authorize production inference or business mutation.",
  ],
  forbiddenBehavior: [
    "Do not add POST, PUT, PATCH, or DELETE evidence pack endpoints in Phase 4D.",
    "Do not persist evidence packs, signoff decisions, or approval records.",
    "Do not recalculate or overwrite shadow scores.",
    "Do not expose production inference endpoints.",
    "Do not write evidence pack outcomes into inventory, accounting, pricing, sales, repairs, partner, customer, ledger, report, or messaging records.",
  ],
  operationalPolicy: {
    productionIntegrationAllowed: false,
    productionInferenceEndpointExposed: false,
    modelExecutionAllowed: false,
    decisionAutomationAllowed: false,
    canChangeInventoryOrAccounting: false,
    evidencePersistenceAllowed: false,
    signoffPersistenceAllowed: false,
  },
});

export const buildInventoryStockoutShadowScoreSignoffEvidencePack = async (importIdInput?: unknown, options: Record<string, unknown> = {}) => {
  const generatedAt = new Date().toISOString();
  const workflow = await buildInventoryStockoutShadowScoreReviewSignoffWorkflow(importIdInput, options) as Record<string, any>;
  const workflowSummary = workflow.summary || {};
  const workflowSteps = asArray(workflow.workflowSteps);
  const queueItems = asArray(workflow.reviewQueueItems);
  const blockers = Array.isArray(workflowSummary.blockers) ? workflowSummary.blockers : [];
  const warnings = Array.isArray(workflowSummary.warnings) ? workflowSummary.warnings : [];
  const importId = workflowSummary.importId ?? null;
  const evidenceSections = [
    {
      sectionKey: "signoff_workflow_summary",
      sectionStatus: workflowSummary.workflowStatus ? "available_for_human_review" : "missing_workflow_summary",
      evidenceSource: "phase4c_shadow_score_review_signoff_workflow",
      itemCount: 1,
      included: Boolean(workflowSummary.workflowStatus),
    },
    {
      sectionKey: "workflow_steps",
      sectionStatus: workflowSteps.length ? "available_for_human_review" : "missing_workflow_steps",
      evidenceSource: "phase4c_workflow_steps",
      itemCount: workflowSteps.length,
      included: workflowSteps.length > 0,
    },
    {
      sectionKey: "review_queue_items",
      sectionStatus: queueItems.length ? "available_for_human_review" : "missing_review_queue_items",
      evidenceSource: "phase4b_shadow_score_review_queue",
      itemCount: queueItems.length,
      included: queueItems.length > 0,
    },
    {
      sectionKey: "safety_policy",
      sectionStatus: "available_for_human_review",
      evidenceSource: "phase4d_safety_policy",
      itemCount: 1,
      included: true,
    },
  ];
  const missingEvidenceSectionCount = evidenceSections.filter((section) => !section.included).length;
  const evidencePackStatus = missingEvidenceSectionCount
    ? "incomplete_evidence_pack_human_review_required"
    : blockers.length
      ? "blocked_evidence_pack_human_review_required"
      : warnings.length
        ? "evidence_pack_ready_with_warnings"
        : "evidence_pack_ready_for_human_review";
  const evidencePackComplete = missingEvidenceSectionCount === 0;
  const readinessScorePct = Math.max(0, Math.round(((evidenceSections.length - missingEvidenceSectionCount) / evidenceSections.length) * 100));
  const signoffAllowed = Boolean(workflowSummary.signoffAllowed) && evidencePackComplete && blockers.length === 0;
  const evidencePackManifest = {
    manifestVersion: "shadow_score_signoff_evidence_pack_manifest_v1",
    generatedAt,
    importId,
    evidencePackContractKey: SIGNOFF_EVIDENCE_PACK_CONTRACT_KEY,
    requiredSignoffWorkflowContractKey: REQUIRED_SIGNOFF_WORKFLOW_CONTRACT_KEY,
    evidencePackStatus,
    evidencePackComplete,
    signoffAllowed,
    evidenceSectionCount: evidenceSections.length,
    missingEvidenceSectionCount,
    workflowStepCount: workflowSteps.length,
    queueItemCount: queueItems.length,
    featureFlagKey: FEATURE_FLAG_KEY,
    featureFlagDefault,
    evidencePackEnabled,
    humanSignoffOnly,
    modelExecutionAllowed,
    productionInferenceEndpointExposed,
    mutationAllowed,
    evidencePersistenceAllowed,
    signoffPersistenceAllowed,
  };
  const safetyPolicy = buildSafetyPolicy(generatedAt);

  return {
    success: true,
    contract: buildInventoryStockoutShadowScoreSignoffEvidencePackContract(),
    summary: {
      generatedAt,
      importId,
      evidencePackStatus,
      recommendation: signoffAllowed ? "review_evidence_pack_for_future_human_governance_signoff_without_runtime_activation" : "complete_or_resolve_shadow_score_signoff_evidence_before_review",
      evidencePackComplete,
      signoffAllowed,
      evidenceSectionCount: evidenceSections.length,
      missingEvidenceSectionCount,
      workflowStepCount: workflowSteps.length,
      queueItemCount: queueItems.length,
      readinessScorePct,
      shadowScore: workflowSummary.shadowScore ?? 0,
      featureFlagKey: FEATURE_FLAG_KEY,
      featureFlagDefault,
      evidencePackEnabled,
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
      evidencePersistenceAllowed,
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
      recommendedNextAction: signoffAllowed ? "review_evidence_pack_for_future_human_governance_signoff_without_runtime_activation" : "complete_or_resolve_shadow_score_signoff_evidence_before_review",
    },
    evidenceSections,
    evidencePackManifest,
    safetyPolicy,
    signoffWorkflowSummary: workflowSummary,
    workflowSteps,
    reviewQueueItems: queueItems,
  };
};

export const buildMlShadowScoreSignoffEvidencePackCatalogSummary = async () => {
  const current = await buildInventoryStockoutShadowScoreSignoffEvidencePack();
  return {
    generatedAt: new Date().toISOString(),
    contract: buildInventoryStockoutShadowScoreSignoffEvidencePackContract(),
    currentShadowScoreSignoffEvidencePack: current.summary,
    evidenceSections: current.evidenceSections,
    evidencePackManifest: current.evidencePackManifest,
    recommendedNextAction: current.summary.recommendedNextAction,
  };
};

export const exportInventoryStockoutShadowScoreSignoffEvidencePackManifest = async (importIdInput?: unknown, options: Record<string, unknown> = {}) => {
  const evidencePack = await buildInventoryStockoutShadowScoreSignoffEvidencePack(importIdInput, options);
  return evidencePack.evidencePackManifest;
};

export const exportInventoryStockoutShadowScoreSignoffEvidencePackJson = async (importIdInput?: unknown, options: Record<string, unknown> = {}) => {
  return buildInventoryStockoutShadowScoreSignoffEvidencePack(importIdInput, options);
};

export const exportInventoryStockoutShadowScoreSignoffEvidencePackCsv = async (importIdInput?: unknown, options: Record<string, unknown> = {}) => {
  const evidencePack = await buildInventoryStockoutShadowScoreSignoffEvidencePack(importIdInput, options);
  const workflowCsv = await exportInventoryStockoutShadowScoreReviewSignoffWorkflowCsv(importIdInput, options);
  const headers = ["sectionKey", "sectionStatus", "evidenceSource", "itemCount", "included"];
  const rows = evidencePack.evidenceSections.map((section) => headers.map((header) => csvEscape((section as Record<string, unknown>)[header])).join(","));
  const csv = [
    headers.join(","),
    ...rows,
    "",
    "workflowCsvFilename",
    csvEscape(workflowCsv.filename),
  ].join("\n");
  return {
    filename: `inventory-stockout-shadow-score-signoff-evidence-pack-${evidencePack.summary.importId || "latest"}.csv`,
    csv,
  };
};
