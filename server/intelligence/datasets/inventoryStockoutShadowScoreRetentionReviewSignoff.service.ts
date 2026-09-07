import {
  buildInventoryStockoutShadowScoreEvidenceRetentionReview,
  buildInventoryStockoutShadowScoreEvidenceRetentionReviewContract,
} from "./inventoryStockoutShadowScoreEvidenceRetentionReview.service";

const RETENTION_REVIEW_SIGNOFF_CONTRACT_KEY = "inventory_stockout_shadow_score_retention_review_signoff_v1" as const;
const RETENTION_REVIEW_SIGNOFF_CONTRACT_VERSION = "v1" as const;
const REQUIRED_RETENTION_REVIEW_CONTRACT_KEY = "inventory_stockout_shadow_score_evidence_retention_review_v1" as const;
const RETENTION_REVIEW_SIGNOFF_SCOPE = "phase4f_shadow_score_retention_review_signoff_governance_only_no_runtime_execution" as const;
const FEATURE_FLAG_KEY = "ml.inventoryStockout.shadowScoreRetentionReviewSignoff.enabled" as const;
const RETENTION_REVIEW_SIGNOFF_STRATEGY = "read_only_shadow_score_retention_review_signoff_v1" as const;
const DEFAULT_RETENTION_DAYS = 365 as const;
const DEFAULT_REVIEW_INTERVAL_DAYS = 90 as const;

const featureFlagDefault = false as const;
const retentionReviewSignoffEnabled = false as const;
const advisoryOnly = true as const;
const readOnlySignoffOnly = true as const;
const runtimeInvocationAllowed = false as const;
const modelExecutionAllowed = false as const;
const inferenceEndpointExposed = false as const;
const productionInferenceEndpointExposed = false as const;
const productionIntegrationAllowed = false as const;
const decisionAutomationAllowed = false as const;
const canChangeInventoryOrAccounting = false as const;
const auditOnly = true as const;
const mutationAllowed = false as const;
const retentionReviewPersistenceAllowed = false as const;
const signoffPersistenceAllowed = false as const;
const automaticDeletionAllowed = false as const;
const purgeJobAllowed = false as const;
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

const addDaysIso = (baseIso: string, days: number): string => {
  const date = new Date(baseIso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
};

const buildSafetyPolicy = (generatedAt: string) => ({
  generatedAt,
  policyKey: "shadow_score_retention_review_signoff_safety_policy_v1",
  phase: "Phase 4F — Shadow Score Retention Review Signoff",
  requiredFlags: {
    featureFlagDefault,
    retentionReviewSignoffEnabled,
    advisoryOnly,
    readOnlySignoffOnly,
    runtimeInvocationAllowed,
    modelExecutionAllowed,
    inferenceEndpointExposed,
    productionInferenceEndpointExposed,
    productionIntegrationAllowed,
    decisionAutomationAllowed,
    canChangeInventoryOrAccounting,
    auditOnly,
    mutationAllowed,
    retentionReviewPersistenceAllowed,
    signoffPersistenceAllowed,
    automaticDeletionAllowed,
    purgeJobAllowed,
    queuePersistenceAllowed,
    scoreRecalculationAllowed,
    operationalApprovalAllowed,
    operationalDecisionAllowed,
    customerSupplierMessageAllowed,
    runtimeArtifactLoadAllowed,
    externalModelCallAllowed,
  },
});

export const buildInventoryStockoutShadowScoreRetentionReviewSignoffContract = () => ({
  contractKey: RETENTION_REVIEW_SIGNOFF_CONTRACT_KEY,
  contractVersion: RETENTION_REVIEW_SIGNOFF_CONTRACT_VERSION,
  generatedAt: new Date().toISOString(),
  purpose: "Define the Phase 4F read-only signoff envelope for Phase 4E shadow score evidence retention reviews without deleting evidence, persisting signoff records, executing models, exposing production inference, or mutating business records.",
  requiredRetentionReviewContractKey: REQUIRED_RETENTION_REVIEW_CONTRACT_KEY,
  retentionReviewScope: RETENTION_REVIEW_SIGNOFF_SCOPE,
  retentionReviewStrategy: RETENTION_REVIEW_SIGNOFF_STRATEGY,
  defaultRetentionDays: DEFAULT_RETENTION_DAYS,
  defaultReviewIntervalDays: DEFAULT_REVIEW_INTERVAL_DAYS,
  requiredRetentionReviewContract: buildInventoryStockoutShadowScoreEvidenceRetentionReviewContract(),
  requiredAssertions: [
    "Shadow score retention review signoff is feature-flagged off by default.",
    "Retention review signoff is advisory/read-only and derived from Phase 4E retention review metadata.",
    "No retention review, retention policy, review decision, or deletion state is persisted in Phase 4F.",
    "No purge job, auto-delete workflow, model runtime, or production inference endpoint is enabled.",
    "Retention status is governance-only and cannot authorize evidence deletion or business mutation.",
  ],
  forbiddenBehavior: [
    "Do not add POST, PUT, PATCH, or DELETE retention review signoff endpoints in Phase 4F.",
    "Do not persist retention records, review outcomes, deletion approvals, or purge schedules.",
    "Do not delete or archive retention review data automatically.",
    "Do not recalculate or overwrite shadow scores.",
    "Do not expose production inference endpoints.",
    "Do not write retention outcomes into inventory, accounting, pricing, sales, repairs, partner, customer, ledger, report, or messaging records.",
  ],
  operationalPolicy: {
    productionIntegrationAllowed: false,
    productionInferenceEndpointExposed: false,
    modelExecutionAllowed: false,
    decisionAutomationAllowed: false,
    canChangeInventoryOrAccounting: false,
    retentionReviewPersistenceAllowed: false,
    signoffPersistenceAllowed: false,
    automaticDeletionAllowed: false,
    purgeJobAllowed: false,
  },
});

export const buildInventoryStockoutShadowScoreRetentionReviewSignoff = async (importIdInput?: unknown, options: Record<string, unknown> = {}) => {
  const generatedAt = new Date().toISOString();
  const retentionReview = await buildInventoryStockoutShadowScoreEvidenceRetentionReview(importIdInput, options) as Record<string, any>;
  const retentionSummary = retentionReview.summary || {};
  const retentionReviewRows = asArray(retentionReview.retentionReviewRows);
  const retentionReviewManifestSource = retentionReview.retentionReviewManifest || {};
  const blockers = Array.isArray(retentionSummary.blockers) ? retentionSummary.blockers : [];
  const warnings = Array.isArray(retentionSummary.warnings) ? retentionSummary.warnings : [];
  const importId = retentionSummary.importId ?? null;
  const retentionDays = Number(options.retentionDays || DEFAULT_RETENTION_DAYS) > 0 ? Number(options.retentionDays || DEFAULT_RETENTION_DAYS) : DEFAULT_RETENTION_DAYS;
  const reviewIntervalDays = Number(options.reviewIntervalDays || DEFAULT_REVIEW_INTERVAL_DAYS) > 0 ? Number(options.reviewIntervalDays || DEFAULT_REVIEW_INTERVAL_DAYS) : DEFAULT_REVIEW_INTERVAL_DAYS;
  const retainUntil = addDaysIso(generatedAt, retentionDays);
  const nextGovernanceReviewAt = addDaysIso(generatedAt, reviewIntervalDays);
  const reviewRows = retentionReviewRows.map((section, index) => ({
    rowKey: `shadow_score_evidence_retention_${index + 1}`,
    sectionKey: section.sectionKey || `section_${index + 1}`,
    evidenceSource: section.evidenceSource || "phase4d_shadow_score_signoff_evidence_pack",
    retentionClass: "governance_shadow_evidence",
    retentionAction: "retain_for_future_human_review_only",
    automaticDeletionAllowed,
    purgeJobAllowed,
    retainUntil,
    nextGovernanceReviewAt,
    itemCount: Number(section.itemCount || 0),
    included: Boolean(section.included),
  }));
  const missingRetentionReviewRowCount = Number(retentionSummary.missingRetentionReviewRowCount || 0);
  const retentionReviewSignoffStatus = missingRetentionReviewRowCount
    ? "incomplete_retention_review_signoff_human_review_required"
    : blockers.length
      ? "blocked_retention_review_signoff_human_review_required"
      : warnings.length
        ? "retention_review_signoff_ready_with_warnings"
        : "retention_review_signoff_ready_for_human_review";
  const readinessScorePct = Math.max(0, Math.min(100, Math.round(Number(retentionSummary.readinessScorePct || 0))));
  const retentionReviewManifest = {
    manifestVersion: "shadow_score_retention_review_signoff_manifest_v1",
    generatedAt,
    importId,
    evidenceRetentionReviewContractKey: RETENTION_REVIEW_SIGNOFF_CONTRACT_KEY,
    requiredRetentionReviewContractKey: REQUIRED_RETENTION_REVIEW_CONTRACT_KEY,
    retentionReviewSignoffStatus,
    retentionDays,
    reviewIntervalDays,
    retainUntil,
    nextGovernanceReviewAt,
    retentionReviewRowCount: retentionReviewRows.length,
    signoffRowCount: reviewRows.length,
    featureFlagKey: FEATURE_FLAG_KEY,
    featureFlagDefault,
    retentionReviewSignoffEnabled,
    advisoryOnly,
    modelExecutionAllowed,
    productionInferenceEndpointExposed,
    mutationAllowed,
    signoffPersistenceAllowed,
    automaticDeletionAllowed,
    purgeJobAllowed,
  };
  const safetyPolicy = buildSafetyPolicy(generatedAt);

  return {
    success: true,
    contract: buildInventoryStockoutShadowScoreRetentionReviewSignoffContract(),
    summary: {
      generatedAt,
      importId,
      retentionReviewSignoffStatus,
      recommendation: "retain_shadow_score_evidence_for_future_human_governance_review_without_deletion_or_runtime_activation",
      retentionDays,
      reviewIntervalDays,
      retainUntil,
      nextGovernanceReviewAt,
      retentionReviewRowCount: retentionReviewRows.length,
      signoffRowCount: reviewRows.length,
      missingRetentionReviewRowCount,
      readinessScorePct,
      shadowScore: retentionSummary.shadowScore ?? 0,
      featureFlagKey: FEATURE_FLAG_KEY,
      featureFlagDefault,
      retentionReviewSignoffEnabled,
      advisoryOnly,
      readOnlySignoffOnly,
      runtimeInvocationAllowed,
      modelExecutionAllowed,
      inferenceEndpointExposed,
      productionInferenceEndpointExposed,
      productionIntegrationAllowed,
      decisionAutomationAllowed,
      canChangeInventoryOrAccounting,
      auditOnly,
      mutationAllowed,
      retentionReviewPersistenceAllowed,
      signoffPersistenceAllowed,
      automaticDeletionAllowed,
      purgeJobAllowed,
      queuePersistenceAllowed,
      scoreRecalculationAllowed,
      operationalApprovalAllowed,
      operationalDecisionAllowed,
      customerSupplierMessageAllowed,
      runtimeArtifactLoadAllowed,
      externalModelCallAllowed,
      blockers,
      warnings,
    },
    reviewRows,
    retentionReviewManifest,
    sourceRetentionReviewManifest: retentionReviewManifestSource,
    sourceRetentionReviewRows: retentionReviewRows,
    safetyPolicy,
  };
};

export const buildMlShadowScoreRetentionReviewSignoffCatalogSummary = async () => {
  const current = await buildInventoryStockoutShadowScoreRetentionReviewSignoff();
  return {
    currentShadowScoreRetentionReviewSignoff: current.summary,
    lastRetentionReviewSignoffManifests: [current.retentionReviewManifest],
    signoffRows: current.reviewRows,
    signoffPayloadPreview: {
      contractKey: current.contract.contractKey,
      sourceRetentionReviewContractKey: current.contract.requiredRetentionReviewContractKey,
      safetyPolicy: current.safetyPolicy,
    },
  };
};

export const exportInventoryStockoutShadowScoreRetentionReviewSignoffJson = async (importIdInput?: unknown, options: Record<string, unknown> = {}) => {
  const retentionReview = await buildInventoryStockoutShadowScoreRetentionReviewSignoff(importIdInput, options);
  return {
    exportedAt: new Date().toISOString(),
    format: "json",
    retentionReview,
  };
};

export const exportInventoryStockoutShadowScoreRetentionReviewSignoffManifest = async (importIdInput?: unknown, options: Record<string, unknown> = {}) => {
  const retentionReview = await buildInventoryStockoutShadowScoreRetentionReviewSignoff(importIdInput, options);
  return retentionReview.retentionReviewManifest;
};

export const exportInventoryStockoutShadowScoreRetentionReviewSignoffCsv = async (importIdInput?: unknown, options: Record<string, unknown> = {}) => {
  const retentionReview = await buildInventoryStockoutShadowScoreRetentionReviewSignoff(importIdInput, options);
  const header = [
    "rowKey",
    "sectionKey",
    "evidenceSource",
    "retentionClass",
    "retentionAction",
    "itemCount",
    "included",
    "retainUntil",
    "nextGovernanceReviewAt",
    "automaticDeletionAllowed",
    "purgeJobAllowed",
  ];
  const rows = retentionReview.reviewRows.map((row) => [
    row.rowKey,
    row.sectionKey,
    row.evidenceSource,
    row.retentionClass,
    row.retentionAction,
    row.itemCount,
    row.included,
    row.retainUntil,
    row.nextGovernanceReviewAt,
    row.automaticDeletionAllowed,
    row.purgeJobAllowed,
  ].map(csvEscape).join(","));
  const csv = [header.join(","), ...rows].join("\n");
  return {
    filename: `inventory-stockout-shadow-score-retention-review-signoff-${retentionReview.summary.importId || "latest"}.csv`,
    csv,
  };
};
