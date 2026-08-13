import {
  buildInventoryStockoutShadowScoreSignoffEvidencePack,
  buildInventoryStockoutShadowScoreSignoffEvidencePackContract,
} from "./inventoryStockoutShadowScoreSignoffEvidencePack.service";

const EVIDENCE_RETENTION_REVIEW_CONTRACT_KEY = "inventory_stockout_shadow_score_evidence_retention_review_v1" as const;
const EVIDENCE_RETENTION_REVIEW_CONTRACT_VERSION = "v1" as const;
const REQUIRED_EVIDENCE_PACK_CONTRACT_KEY = "inventory_stockout_shadow_score_signoff_evidence_pack_v1" as const;
const RETENTION_REVIEW_SCOPE = "phase4e_shadow_score_evidence_retention_review_governance_only_no_runtime_execution" as const;
const FEATURE_FLAG_KEY = "ml.inventoryStockout.shadowScoreEvidenceRetentionReview.enabled" as const;
const RETENTION_REVIEW_STRATEGY = "read_only_shadow_score_evidence_retention_review_v1" as const;
const DEFAULT_RETENTION_DAYS = 365 as const;
const DEFAULT_REVIEW_INTERVAL_DAYS = 90 as const;

const featureFlagDefault = false as const;
const retentionReviewEnabled = false as const;
const advisoryOnly = true as const;
const readOnlyReviewOnly = true as const;
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
const retentionPersistenceAllowed = false as const;
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
  policyKey: "shadow_score_evidence_retention_review_safety_policy_v1",
  phase: "Phase 4E — Shadow Score Evidence Retention Review",
  requiredFlags: {
    featureFlagDefault,
    retentionReviewEnabled,
    advisoryOnly,
    readOnlyReviewOnly,
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
    retentionPersistenceAllowed,
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

export const buildInventoryStockoutShadowScoreEvidenceRetentionReviewContract = () => ({
  contractKey: EVIDENCE_RETENTION_REVIEW_CONTRACT_KEY,
  contractVersion: EVIDENCE_RETENTION_REVIEW_CONTRACT_VERSION,
  generatedAt: new Date().toISOString(),
  purpose: "Define the Phase 4E read-only retention review envelope for Phase 4D shadow score signoff evidence packs without deleting evidence, persisting retention records, executing models, exposing production inference, or mutating business records.",
  requiredEvidencePackContractKey: REQUIRED_EVIDENCE_PACK_CONTRACT_KEY,
  retentionReviewScope: RETENTION_REVIEW_SCOPE,
  retentionReviewStrategy: RETENTION_REVIEW_STRATEGY,
  defaultRetentionDays: DEFAULT_RETENTION_DAYS,
  defaultReviewIntervalDays: DEFAULT_REVIEW_INTERVAL_DAYS,
  requiredEvidencePackContract: buildInventoryStockoutShadowScoreSignoffEvidencePackContract(),
  requiredAssertions: [
    "Shadow score evidence retention review is feature-flagged off by default.",
    "Retention review is advisory/read-only and derived from Phase 4D evidence pack metadata.",
    "No evidence pack, retention policy, review decision, or deletion state is persisted in Phase 4E.",
    "No purge job, auto-delete workflow, model runtime, or production inference endpoint is enabled.",
    "Retention status is governance-only and cannot authorize evidence deletion or business mutation.",
  ],
  forbiddenBehavior: [
    "Do not add POST, PUT, PATCH, or DELETE retention review endpoints in Phase 4E.",
    "Do not persist retention records, review outcomes, deletion approvals, or purge schedules.",
    "Do not delete or archive evidence pack data automatically.",
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
    evidencePersistenceAllowed: false,
    retentionPersistenceAllowed: false,
    automaticDeletionAllowed: false,
    purgeJobAllowed: false,
  },
});

export const buildInventoryStockoutShadowScoreEvidenceRetentionReview = async (importIdInput?: unknown, options: Record<string, unknown> = {}) => {
  const generatedAt = new Date().toISOString();
  const evidencePack = await buildInventoryStockoutShadowScoreSignoffEvidencePack(importIdInput, options) as Record<string, any>;
  const packSummary = evidencePack.summary || {};
  const evidenceSections = asArray(evidencePack.evidenceSections);
  const evidencePackManifest = evidencePack.evidencePackManifest || {};
  const blockers = Array.isArray(packSummary.blockers) ? packSummary.blockers : [];
  const warnings = Array.isArray(packSummary.warnings) ? packSummary.warnings : [];
  const importId = packSummary.importId ?? null;
  const retentionDays = Number(options.retentionDays || DEFAULT_RETENTION_DAYS) > 0 ? Number(options.retentionDays || DEFAULT_RETENTION_DAYS) : DEFAULT_RETENTION_DAYS;
  const reviewIntervalDays = Number(options.reviewIntervalDays || DEFAULT_REVIEW_INTERVAL_DAYS) > 0 ? Number(options.reviewIntervalDays || DEFAULT_REVIEW_INTERVAL_DAYS) : DEFAULT_REVIEW_INTERVAL_DAYS;
  const retainUntil = addDaysIso(generatedAt, retentionDays);
  const nextGovernanceReviewAt = addDaysIso(generatedAt, reviewIntervalDays);
  const reviewRows = evidenceSections.map((section, index) => ({
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
  const missingEvidenceSectionCount = Number(packSummary.missingEvidenceSectionCount || 0);
  const retentionReviewStatus = missingEvidenceSectionCount
    ? "incomplete_evidence_retention_review_human_review_required"
    : blockers.length
      ? "blocked_evidence_retention_review_human_review_required"
      : warnings.length
        ? "evidence_retention_review_ready_with_warnings"
        : "evidence_retention_review_ready_for_human_review";
  const readinessScorePct = Math.max(0, Math.min(100, Math.round(Number(packSummary.readinessScorePct || 0))));
  const retentionReviewManifest = {
    manifestVersion: "shadow_score_evidence_retention_review_manifest_v1",
    generatedAt,
    importId,
    evidenceRetentionReviewContractKey: EVIDENCE_RETENTION_REVIEW_CONTRACT_KEY,
    requiredEvidencePackContractKey: REQUIRED_EVIDENCE_PACK_CONTRACT_KEY,
    retentionReviewStatus,
    retentionDays,
    reviewIntervalDays,
    retainUntil,
    nextGovernanceReviewAt,
    evidenceSectionCount: evidenceSections.length,
    reviewRowCount: reviewRows.length,
    featureFlagKey: FEATURE_FLAG_KEY,
    featureFlagDefault,
    retentionReviewEnabled,
    advisoryOnly,
    modelExecutionAllowed,
    productionInferenceEndpointExposed,
    mutationAllowed,
    retentionPersistenceAllowed,
    automaticDeletionAllowed,
    purgeJobAllowed,
  };
  const safetyPolicy = buildSafetyPolicy(generatedAt);

  return {
    success: true,
    contract: buildInventoryStockoutShadowScoreEvidenceRetentionReviewContract(),
    summary: {
      generatedAt,
      importId,
      retentionReviewStatus,
      recommendation: "retain_shadow_score_evidence_for_future_human_governance_review_without_deletion_or_runtime_activation",
      retentionDays,
      reviewIntervalDays,
      retainUntil,
      nextGovernanceReviewAt,
      evidenceSectionCount: evidenceSections.length,
      reviewRowCount: reviewRows.length,
      missingEvidenceSectionCount,
      readinessScorePct,
      shadowScore: packSummary.shadowScore ?? 0,
      featureFlagKey: FEATURE_FLAG_KEY,
      featureFlagDefault,
      retentionReviewEnabled,
      advisoryOnly,
      readOnlyReviewOnly,
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
      retentionPersistenceAllowed,
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
    sourceEvidencePackManifest: evidencePackManifest,
    sourceEvidenceSections: evidenceSections,
    safetyPolicy,
  };
};

export const buildMlShadowScoreEvidenceRetentionReviewCatalogSummary = async () => {
  const current = await buildInventoryStockoutShadowScoreEvidenceRetentionReview();
  return {
    currentShadowScoreEvidenceRetentionReview: current.summary,
    lastRetentionReviewManifests: [current.retentionReviewManifest],
    retentionReviewRows: current.reviewRows,
    retentionReviewPayloadPreview: {
      contractKey: current.contract.contractKey,
      sourceEvidencePackContractKey: current.contract.requiredEvidencePackContractKey,
      safetyPolicy: current.safetyPolicy,
    },
  };
};

export const exportInventoryStockoutShadowScoreEvidenceRetentionReviewJson = async (importIdInput?: unknown, options: Record<string, unknown> = {}) => {
  const retentionReview = await buildInventoryStockoutShadowScoreEvidenceRetentionReview(importIdInput, options);
  return {
    exportedAt: new Date().toISOString(),
    format: "json",
    retentionReview,
  };
};

export const exportInventoryStockoutShadowScoreEvidenceRetentionReviewManifest = async (importIdInput?: unknown, options: Record<string, unknown> = {}) => {
  const retentionReview = await buildInventoryStockoutShadowScoreEvidenceRetentionReview(importIdInput, options);
  return retentionReview.retentionReviewManifest;
};

export const exportInventoryStockoutShadowScoreEvidenceRetentionReviewCsv = async (importIdInput?: unknown, options: Record<string, unknown> = {}) => {
  const retentionReview = await buildInventoryStockoutShadowScoreEvidenceRetentionReview(importIdInput, options);
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
    filename: `inventory-stockout-shadow-score-evidence-retention-review-${retentionReview.summary.importId || "latest"}.csv`,
    csv,
  };
};
