import {
  buildInventoryStockoutShadowScoreRetentionReviewSignoff,
  buildInventoryStockoutShadowScoreRetentionReviewSignoffContract,
} from "./inventoryStockoutShadowScoreRetentionReviewSignoff.service";

const SHADOW_SCORE_SIGNOFF_ARCHIVE_BINDER_CONTRACT_KEY = "inventory_stockout_shadow_score_signoff_archive_binder_v1" as const;
const SHADOW_SCORE_SIGNOFF_ARCHIVE_BINDER_CONTRACT_VERSION = "v1" as const;
const REQUIRED_RETENTION_REVIEW_SIGNOFF_CONTRACT_KEY = "inventory_stockout_shadow_score_retention_review_signoff_v1" as const;
const SHADOW_SCORE_SIGNOFF_ARCHIVE_BINDER_SCOPE = "phase4g_shadow_score_signoff_archive_binder_governance_only_no_runtime_execution" as const;
const FEATURE_FLAG_KEY = "ml.inventoryStockout.shadowScoreSignoffArchiveBinder.enabled" as const;
const ARCHIVE_BINDER_STRATEGY = "read_only_shadow_score_signoff_archive_binder_v1" as const;

const featureFlagDefault = false as const;
const archiveBinderEnabled = false as const;
const readOnlyArchiveBinderOnly = true as const;
const archiveBinderPersistenceAllowed = false as const;
const archiveMutationAllowed = false as const;
const runtimeInvocationAllowed = false as const;
const modelExecutionAllowed = false as const;
const inferenceEndpointExposed = false as const;
const productionInferenceEndpointExposed = false as const;
const productionIntegrationAllowed = false as const;
const decisionAutomationAllowed = false as const;
const canChangeInventoryOrAccounting = false as const;
const auditOnly = true as const;
const mutationAllowed = false as const;
const exportOnly = true as const;
const signoffPersistenceAllowed = false as const;
const retentionReviewPersistenceAllowed = false as const;
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

const buildSafetyPolicy = (generatedAt: string) => ({
  generatedAt,
  policyKey: "shadow_score_signoff_archive_binder_safety_policy_v1",
  phase: "Phase 4G — Shadow Score Signoff Archive Binder",
  requiredFlags: {
    featureFlagDefault,
    archiveBinderEnabled,
    readOnlyArchiveBinderOnly,
    archiveBinderPersistenceAllowed,
    archiveMutationAllowed,
    runtimeInvocationAllowed,
    modelExecutionAllowed,
    inferenceEndpointExposed,
    productionInferenceEndpointExposed,
    productionIntegrationAllowed,
    decisionAutomationAllowed,
    canChangeInventoryOrAccounting,
    auditOnly,
    mutationAllowed,
    exportOnly,
    signoffPersistenceAllowed,
    retentionReviewPersistenceAllowed,
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

export const buildInventoryStockoutShadowScoreSignoffArchiveBinderContract = () => ({
  contractKey: SHADOW_SCORE_SIGNOFF_ARCHIVE_BINDER_CONTRACT_KEY,
  contractVersion: SHADOW_SCORE_SIGNOFF_ARCHIVE_BINDER_CONTRACT_VERSION,
  generatedAt: new Date().toISOString(),
  purpose: "Define the Phase 4G read-only archive binder envelope for Phase 4F shadow score retention review signoff evidence without persisting archive binders, executing models, exposing production inference, deleting evidence, or mutating business records.",
  requiredRetentionReviewSignoffContractKey: REQUIRED_RETENTION_REVIEW_SIGNOFF_CONTRACT_KEY,
  archiveBinderScope: SHADOW_SCORE_SIGNOFF_ARCHIVE_BINDER_SCOPE,
  archiveBinderStrategy: ARCHIVE_BINDER_STRATEGY,
  requiredRetentionReviewSignoffContract: buildInventoryStockoutShadowScoreRetentionReviewSignoffContract(),
  requiredAssertions: [
    "Shadow score signoff archive binder is feature-flagged off by default.",
    "Archive binder output is export/read-only and derived from Phase 4F retention review signoff metadata.",
    "No archive binder, signoff, retention, deletion, purge, or operational state is persisted in Phase 4G.",
    "No model runtime, external model call, production inference endpoint, or business mutation is enabled.",
    "Archive binder status is governance-only and cannot authorize evidence deletion or production deployment.",
  ],
  forbiddenBehavior: [
    "Do not add POST, PUT, PATCH, or DELETE archive binder endpoints in Phase 4G.",
    "Do not persist archive binder records, signoff records, retention records, deletion approvals, or purge schedules.",
    "Do not delete, purge, or auto-archive evidence.",
    "Do not recalculate, overwrite, or persist shadow scores.",
    "Do not expose production inference endpoints.",
    "Do not write archive outcomes into inventory, accounting, pricing, sales, repairs, partner, customer, ledger, report, or messaging records.",
  ],
  operationalPolicy: {
    productionIntegrationAllowed,
    productionInferenceEndpointExposed,
    modelExecutionAllowed,
    decisionAutomationAllowed,
    canChangeInventoryOrAccounting,
    archiveBinderPersistenceAllowed,
    archiveMutationAllowed,
    signoffPersistenceAllowed,
    retentionReviewPersistenceAllowed,
    automaticDeletionAllowed,
    purgeJobAllowed,
  },
});

export const buildInventoryStockoutShadowScoreSignoffArchiveBinder = async (importIdInput?: unknown, options: Record<string, unknown> = {}) => {
  const generatedAt = new Date().toISOString();
  const signoff = await buildInventoryStockoutShadowScoreRetentionReviewSignoff(importIdInput, options) as Record<string, any>;
  const signoffSummary = signoff.summary || {};
  const signoffRows = asArray(signoff.reviewRows);
  const sourceRetentionReviewRows = asArray(signoff.sourceRetentionReviewRows);
  const blockers = Array.isArray(signoffSummary.blockers) ? signoffSummary.blockers : [];
  const warnings = Array.isArray(signoffSummary.warnings) ? signoffSummary.warnings : [];
  const importId = signoffSummary.importId ?? null;
  const binderSections = [
    {
      sectionKey: "retention_review_signoff_summary",
      evidenceSource: "phase4f_shadow_score_retention_review_signoff",
      itemCount: signoffSummary ? 1 : 0,
      included: Boolean(signoffSummary),
      exportOnly,
      mutationAllowed,
    },
    {
      sectionKey: "retention_review_signoff_rows",
      evidenceSource: "phase4f_shadow_score_retention_review_signoff_rows",
      itemCount: signoffRows.length,
      included: signoffRows.length > 0,
      exportOnly,
      mutationAllowed,
    },
    {
      sectionKey: "source_retention_review_rows",
      evidenceSource: "phase4e_shadow_score_evidence_retention_review",
      itemCount: sourceRetentionReviewRows.length,
      included: sourceRetentionReviewRows.length > 0,
      exportOnly,
      mutationAllowed,
    },
    {
      sectionKey: "safety_policy",
      evidenceSource: "phase4g_shadow_score_signoff_archive_binder_policy",
      itemCount: 1,
      included: true,
      exportOnly,
      mutationAllowed,
    },
  ];
  const missingBinderSectionCount = binderSections.filter((section) => !section.included).length;
  const archiveBinderStatus = missingBinderSectionCount
    ? "incomplete_archive_binder_human_review_required"
    : blockers.length
      ? "blocked_archive_binder_human_review_required"
      : warnings.length
        ? "archive_binder_ready_with_warnings"
        : "archive_binder_ready_for_human_governance_review";
  const readinessScorePct = Math.max(0, Math.min(100, Math.round(Number(signoffSummary.readinessScorePct || 0))));
  const archiveBinderManifest = {
    manifestVersion: "shadow_score_signoff_archive_binder_manifest_v1",
    generatedAt,
    importId,
    archiveBinderContractKey: SHADOW_SCORE_SIGNOFF_ARCHIVE_BINDER_CONTRACT_KEY,
    requiredRetentionReviewSignoffContractKey: REQUIRED_RETENTION_REVIEW_SIGNOFF_CONTRACT_KEY,
    archiveBinderStatus,
    binderSectionCount: binderSections.length,
    missingBinderSectionCount,
    signoffRowCount: signoffRows.length,
    sourceRetentionReviewRowCount: sourceRetentionReviewRows.length,
    featureFlagKey: FEATURE_FLAG_KEY,
    featureFlagDefault,
    archiveBinderEnabled,
    readOnlyArchiveBinderOnly,
    modelExecutionAllowed,
    productionInferenceEndpointExposed,
    mutationAllowed,
    archiveBinderPersistenceAllowed,
    automaticDeletionAllowed,
    purgeJobAllowed,
  };
  const safetyPolicy = buildSafetyPolicy(generatedAt);

  return {
    success: true,
    contract: buildInventoryStockoutShadowScoreSignoffArchiveBinderContract(),
    summary: {
      generatedAt,
      importId,
      archiveBinderStatus,
      recommendation: "archive_shadow_score_signoff_evidence_for_future_human_governance_review_without_deletion_persistence_or_runtime_activation",
      binderSectionCount: binderSections.length,
      missingBinderSectionCount,
      signoffRowCount: signoffRows.length,
      sourceRetentionReviewRowCount: sourceRetentionReviewRows.length,
      retentionReviewSignoffStatus: signoffSummary.retentionReviewSignoffStatus || null,
      readinessScorePct,
      shadowScore: signoffSummary.shadowScore ?? 0,
      featureFlagKey: FEATURE_FLAG_KEY,
      featureFlagDefault,
      archiveBinderEnabled,
      readOnlyArchiveBinderOnly,
      archiveBinderPersistenceAllowed,
      archiveMutationAllowed,
      runtimeInvocationAllowed,
      modelExecutionAllowed,
      inferenceEndpointExposed,
      productionInferenceEndpointExposed,
      productionIntegrationAllowed,
      decisionAutomationAllowed,
      canChangeInventoryOrAccounting,
      auditOnly,
      mutationAllowed,
      exportOnly,
      signoffPersistenceAllowed,
      retentionReviewPersistenceAllowed,
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
    binderSections,
    archiveBinderManifest,
    sourceRetentionReviewSignoffManifest: signoff.retentionReviewManifest || {},
    sourceRetentionReviewSignoffRows: signoffRows,
    sourceRetentionReviewRows,
    safetyPolicy,
  };
};

export const buildMlShadowScoreSignoffArchiveBinderCatalogSummary = async () => {
  const current = await buildInventoryStockoutShadowScoreSignoffArchiveBinder();
  return {
    currentShadowScoreSignoffArchiveBinder: current.summary,
    lastArchiveBinderManifests: [current.archiveBinderManifest],
    archiveBinderSections: current.binderSections,
    archiveBinderPayloadPreview: {
      contractKey: current.contract.contractKey,
      requiredRetentionReviewSignoffContractKey: current.contract.requiredRetentionReviewSignoffContractKey,
      safetyPolicy: current.safetyPolicy,
    },
  };
};

export const exportInventoryStockoutShadowScoreSignoffArchiveBinderJson = async (importIdInput?: unknown, options: Record<string, unknown> = {}) => {
  const archiveBinder = await buildInventoryStockoutShadowScoreSignoffArchiveBinder(importIdInput, options);
  return {
    exportedAt: new Date().toISOString(),
    format: "json",
    archiveBinder,
  };
};

export const exportInventoryStockoutShadowScoreSignoffArchiveBinderManifest = async (importIdInput?: unknown, options: Record<string, unknown> = {}) => {
  const archiveBinder = await buildInventoryStockoutShadowScoreSignoffArchiveBinder(importIdInput, options);
  return archiveBinder.archiveBinderManifest;
};

export const exportInventoryStockoutShadowScoreSignoffArchiveBinderCsv = async (importIdInput?: unknown, options: Record<string, unknown> = {}) => {
  const archiveBinder = await buildInventoryStockoutShadowScoreSignoffArchiveBinder(importIdInput, options);
  const header = [
    "sectionKey",
    "evidenceSource",
    "itemCount",
    "included",
    "exportOnly",
    "mutationAllowed",
    "archiveBinderPersistenceAllowed",
    "automaticDeletionAllowed",
    "purgeJobAllowed",
  ];
  const rows = archiveBinder.binderSections.map((section) => [
    section.sectionKey,
    section.evidenceSource,
    section.itemCount,
    section.included,
    section.exportOnly,
    section.mutationAllowed,
    archiveBinder.summary.archiveBinderPersistenceAllowed,
    archiveBinder.summary.automaticDeletionAllowed,
    archiveBinder.summary.purgeJobAllowed,
  ].map(csvEscape).join(","));
  const csv = [header.join(","), ...rows].join("\n");
  return {
    filename: `inventory-stockout-shadow-score-signoff-archive-binder-${archiveBinder.summary.importId || "latest"}.csv`,
    csv,
  };
};
