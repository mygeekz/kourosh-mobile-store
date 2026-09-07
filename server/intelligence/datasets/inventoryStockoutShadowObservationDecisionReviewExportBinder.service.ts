import {
  buildInventoryStockoutShadowObservationReviewDashboard,
  buildInventoryStockoutShadowObservationReviewDashboardContract,
} from "./inventoryStockoutShadowObservationReviewDashboard.service";
import {
  buildInventoryStockoutShadowObservationReviewDecisionLog,
  buildInventoryStockoutShadowObservationReviewDecisionLogContract,
} from "./inventoryStockoutShadowObservationReviewDecisionLog.service";
import type {
  InventoryStockoutShadowObservationDecisionReviewExportBinderContract,
  InventoryStockoutShadowObservationDecisionReviewExportBinderGate,
  InventoryStockoutShadowObservationDecisionReviewExportBinderResponse,
  InventoryStockoutShadowObservationDecisionReviewExportBinderSummary,
  MlShadowObservationDecisionReviewExportBinderCatalogSummary,
  ShadowObservationDecisionReviewExportBinderRecommendation,
  ShadowObservationDecisionReviewExportBinderStatus,
} from "./datasetTypes";

const EXPORT_BINDER_CONTRACT_KEY = "inventory_stockout_shadow_observation_decision_review_export_binder_v1" as const;
const EXPORT_BINDER_CONTRACT_VERSION = "v1" as const;
const REQUIRED_REVIEW_DASHBOARD_KEY = "inventory_stockout_shadow_observation_review_dashboard_v1" as const;
const REQUIRED_DECISION_LOG_KEY = "inventory_stockout_shadow_observation_review_decision_log_v1" as const;
const EXPORT_BINDER_SCOPE = "phase3k_shadow_observation_decision_review_export_binder_audit_only" as const;
const FEATURE_FLAG_KEY = "ml.inventoryStockout.shadowObservationDecisionReviewExportBinder.enabled" as const;
const JSON_EXPORT_VERSION = "shadow_observation_decision_review_export_binder_json_v1" as const;
const CSV_EXPORT_VERSION = "shadow_observation_decision_review_export_binder_csv_v1" as const;
const MANIFEST_VERSION = "shadow_observation_decision_review_export_binder_manifest_v1" as const;

const featureFlagDefault = false as const;
const binderRuntimeEnabled = false as const;
const runtimeInvocationAllowed = false as const;
const modelExecutionAllowed = false as const;
const inferenceEndpointExposed = false as const;
const productionIntegrationAllowed = false as const;
const decisionAutomationAllowed = false as const;
const canChangeInventoryOrAccounting = false as const;
const auditOnly = true as const;
const mutationAllowed = false as const;
const exportOnly = true as const;
const humanReviewOnly = true as const;
const baselineOnlySourceOfTruth = true as const;
const operationalDecisionAllowed = false as const;
const customerSupplierMessageAllowed = false as const;

const asNumber = (value: unknown): number | null => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
};

const getCount = (value: unknown): number => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : 0;
};

const buildGate = (
  key: string,
  label: string,
  status: InventoryStockoutShadowObservationDecisionReviewExportBinderGate["status"],
  value: unknown,
  message: string,
): InventoryStockoutShadowObservationDecisionReviewExportBinderGate => ({ key, label, status, value, message });

const uniqueMessages = (
  gates: InventoryStockoutShadowObservationDecisionReviewExportBinderGate[],
  status: InventoryStockoutShadowObservationDecisionReviewExportBinderGate["status"],
): string[] => Array.from(new Set(gates.filter((gate) => gate.status === status).map((gate) => gate.message)));

const csvEscape = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
};

const createEvidenceFingerprint = (payload: Record<string, unknown>): string => {
  const raw = JSON.stringify(payload);
  let hash = 0;
  for (let index = 0; index < raw.length; index += 1) {
    hash = ((hash << 5) - hash + raw.charCodeAt(index)) | 0;
  }
  return `binder-${raw.length}-${Math.abs(hash)}`;
};

const buildContract = (): InventoryStockoutShadowObservationDecisionReviewExportBinderContract => ({
  contractKey: EXPORT_BINDER_CONTRACT_KEY,
  contractVersion: EXPORT_BINDER_CONTRACT_VERSION,
  generatedAt: new Date().toISOString(),
  purpose: "Bind shadow observation events, review dashboard evidence, human review decision logs, and baseline comparison into one governance export artifact without enabling runtime execution or operational decisions.",
  requiredReviewDashboardKey: REQUIRED_REVIEW_DASHBOARD_KEY,
  requiredDecisionLogKey: REQUIRED_DECISION_LOG_KEY,
  binderScope: EXPORT_BINDER_SCOPE,
  exportVersions: {
    json: JSON_EXPORT_VERSION,
    csv: CSV_EXPORT_VERSION,
    manifest: MANIFEST_VERSION,
  },
  requiredAssertions: [
    "Phase 3I review dashboard evidence is available before the binder is considered complete.",
    "Phase 3J decision-log evidence is available before the binder is considered complete.",
    "Binder exports are governance artifacts only and do not approve production integration.",
    "No model runtime, inference endpoint, prediction serving, scoring, or external ML worker is enabled by this phase.",
    "No inventory, accounting, pricing, report, customer, partner, supplier, or communication table is mutated.",
    "Rule/statistical baseline remains the only source of truth.",
  ],
  forbiddenBehavior: [
    "Do not execute a model artifact while building an evidence binder.",
    "Do not transform binder evidence into inventory, accounting, pricing, report, customer, partner, or messaging mutations.",
    "Do not emit purchase quantities, price changes, customer messages, supplier messages, or operational recommendations.",
    "Do not treat the binder as production approval, release signoff, or automated decision authority.",
    "Do not expose inference or prediction-serving endpoints.",
  ],
  operationalPolicy: {
    productionIntegrationAllowed: false,
    inferenceRuntimeEnabled: false,
    decisionAutomationAllowed: false,
    canChangeInventoryOrAccounting: false,
  },
});

const buildSafetyPolicy = (generatedAt: string) => ({
  generatedAt,
  policyKey: "shadow_observation_decision_review_export_binder_policy_v1",
  featureFlagKey: FEATURE_FLAG_KEY,
  featureFlagDefault,
  binderRuntimeEnabled,
  runtimeInvocationAllowed,
  modelExecutionAllowed,
  inferenceEndpointExposed,
  productionIntegrationAllowed,
  decisionAutomationAllowed,
  canChangeInventoryOrAccounting,
  auditOnly,
  mutationAllowed,
  exportOnly,
  humanReviewOnly,
  baselineOnlySourceOfTruth,
  operationalDecisionAllowed,
  customerSupplierMessageAllowed,
  protectedTableGroups: ["inventory", "accounting", "pricing", "reports", "communications", "customers", "partners", "suppliers"],
});

const buildEvidenceSections = (
  reviewDashboard: Awaited<ReturnType<typeof buildInventoryStockoutShadowObservationReviewDashboard>>,
  decisionLog: Awaited<ReturnType<typeof buildInventoryStockoutShadowObservationReviewDecisionLog>>,
) => [
  {
    sectionKey: "shadow_observation_events",
    label: "Shadow observation events",
    rowCount: getCount(reviewDashboard.summary.eventCount),
    status: reviewDashboard.summary.eventCount > 0 ? "bound" : "empty",
    sourceContractKey: "inventory_stockout_shadow_observation_event_store_v1",
    policy: "Audit-only event rows; not operational recommendations.",
  },
  {
    sectionKey: "review_dashboard",
    label: "Review audit dashboard",
    rowCount: reviewDashboard.reviewRows.length,
    status: reviewDashboard.summary.dashboardStatus,
    sourceContractKey: REQUIRED_REVIEW_DASHBOARD_KEY,
    policy: "Review and export only; no model execution or scoring.",
  },
  {
    sectionKey: "decision_log",
    label: "Human review decision log",
    rowCount: decisionLog.decisionRows.length,
    status: decisionLog.summary.decisionLogStatus,
    sourceContractKey: REQUIRED_DECISION_LOG_KEY,
    policy: "Human audit decisions only; not production approvals.",
  },
  {
    sectionKey: "baseline_comparison",
    label: "Baseline comparison",
    rowCount: reviewDashboard.summary.baselineComparisonAvailable ? 1 : 0,
    status: reviewDashboard.summary.baselineComparisonAvailable ? "available" : "not_available",
    sourceContractKey: "inventory_stockout_baseline_benchmark_v1",
    policy: "Display-only comparison; baseline remains source of truth.",
  },
];

export const buildInventoryStockoutShadowObservationDecisionReviewExportBinderContract = buildContract;

export const buildInventoryStockoutShadowObservationDecisionReviewExportBinder = async (
  importIdInput?: unknown,
  options: Record<string, unknown> = {},
): Promise<InventoryStockoutShadowObservationDecisionReviewExportBinderResponse> => {
  const generatedAt = new Date().toISOString();
  const importId = asNumber(importIdInput) ?? asNumber(options.importId);
  const reviewDashboard = await buildInventoryStockoutShadowObservationReviewDashboard(importId, options);
  const decisionLog = await buildInventoryStockoutShadowObservationReviewDecisionLog(importId ?? reviewDashboard.summary.importId, options);
  const resolvedImportId = importId ?? reviewDashboard.summary.importId ?? decisionLog.summary.importId ?? null;
  const evidenceSections = buildEvidenceSections(reviewDashboard, decisionLog);

  const reviewDashboardReady = reviewDashboard.summary.dashboardStatus === "review_ready";
  const decisionLogReady = decisionLog.summary.decisionLogStatus === "decision_log_ready";
  const eventCount = getCount(reviewDashboard.summary.eventCount);
  const decisionCount = getCount(decisionLog.summary.decisionCount);
  const unsafeEventCount = getCount(reviewDashboard.summary.unsafeEventCount);
  const forbiddenFieldAttemptCount = getCount(reviewDashboard.summary.forbiddenFieldAttemptCount) + getCount(decisionLog.summary.forbiddenFieldAttemptCount);
  const evidenceSectionCount = evidenceSections.length;
  const completedEvidenceSectionCount = evidenceSections.filter((section) => section.status !== "empty" && section.status !== "not_available").length;
  const binderComplete = reviewDashboardReady && decisionLogReady && eventCount > 0 && decisionCount > 0 && unsafeEventCount === 0 && forbiddenFieldAttemptCount === 0;

  const gates: InventoryStockoutShadowObservationDecisionReviewExportBinderGate[] = [
    buildGate("review_dashboard_ready", "Review dashboard ready", reviewDashboardReady ? "pass" : "warning", reviewDashboard.summary.dashboardStatus, "Phase 3I review dashboard evidence should be available before exporting a complete binder."),
    buildGate("decision_log_ready", "Decision log ready", decisionLogReady ? "pass" : "warning", decisionLog.summary.decisionLogStatus, "Phase 3J human review decision evidence should be available before exporting a complete binder."),
    buildGate("observation_events_bound", "Observation events bound", eventCount > 0 ? "pass" : "warning", eventCount, "Binder should include stored audit-only shadow observation events."),
    buildGate("human_decisions_bound", "Human decisions bound", decisionCount > 0 ? "pass" : "warning", decisionCount, "Binder should include human review decisions before it is considered complete."),
    buildGate("unsafe_events_absent", "Unsafe event rows absent", unsafeEventCount === 0 ? "pass" : "block", unsafeEventCount, "Binder cannot include event rows that violate audit-only or mutation-forbidden guards."),
    buildGate("forbidden_fields_absent", "Forbidden fields absent", forbiddenFieldAttemptCount === 0 ? "pass" : "block", forbiddenFieldAttemptCount, "Binder cannot include score, runtime, recommendation, messaging, or mutation field attempts."),
    buildGate("feature_flag_default_off", "Feature flag default off", featureFlagDefault === false ? "pass" : "block", featureFlagDefault, "Binder feature flag remains false by default."),
    buildGate("binder_runtime_disabled", "Binder runtime disabled", binderRuntimeEnabled === false ? "pass" : "block", binderRuntimeEnabled, "Binder generation does not enable runtime processing."),
    buildGate("runtime_invocation_disabled", "Runtime invocation disabled", runtimeInvocationAllowed === false ? "pass" : "block", runtimeInvocationAllowed, "No runtime invocation is allowed from the binder."),
    buildGate("model_execution_disabled", "Model execution disabled", modelExecutionAllowed === false ? "pass" : "block", modelExecutionAllowed, "Model execution remains disabled."),
    buildGate("endpoint_hidden", "Inference endpoint hidden", inferenceEndpointExposed === false ? "pass" : "block", inferenceEndpointExposed, "No inference or scoring endpoint is exposed."),
    buildGate("decision_automation_disabled", "Decision automation disabled", decisionAutomationAllowed === false ? "pass" : "block", decisionAutomationAllowed, "Binder output cannot trigger automated business decisions."),
    buildGate("mutation_forbidden", "Operational mutations forbidden", canChangeInventoryOrAccounting === false && mutationAllowed === false ? "pass" : "block", { canChangeInventoryOrAccounting, mutationAllowed }, "Binder cannot mutate inventory, accounting, pricing, reports, customers, partners, suppliers, or communications."),
    buildGate("baseline_only_source_of_truth", "Baseline source of truth", baselineOnlySourceOfTruth ? "pass" : "block", baselineOnlySourceOfTruth, "Rule/statistical baseline remains the only source of truth."),
    buildGate("export_only", "Export only", exportOnly ? "pass" : "block", exportOnly, "Binder is an export-only governance artifact."),
  ];

  const blockerCount = gates.filter((gate) => gate.status === "block").length;
  const warningCount = gates.filter((gate) => gate.status === "warning").length;
  const passCount = gates.filter((gate) => gate.status === "pass").length;
  const totalGateCount = gates.length;
  const readinessScorePct = totalGateCount ? Math.round((passCount / totalGateCount) * 100) : 0;

  let binderStatus: ShadowObservationDecisionReviewExportBinderStatus = "binder_ready";
  let recommendation: ShadowObservationDecisionReviewExportBinderRecommendation = "export_governance_evidence_binder";

  if (blockerCount > 0) {
    binderStatus = "blocked";
    recommendation = "resolve_audit_safety_blocks_first";
  } else if (!reviewDashboardReady) {
    binderStatus = "needs_review_dashboard";
    recommendation = "complete_review_dashboard_first";
  } else if (!decisionLogReady) {
    binderStatus = "needs_decision_log";
    recommendation = "record_human_review_decisions_first";
  } else if (eventCount === 0) {
    binderStatus = "needs_observation_events";
    recommendation = "record_observation_events_first";
  } else if (decisionCount === 0) {
    binderStatus = "needs_decision_log";
    recommendation = "record_human_review_decisions_first";
  }

  const recommendedNextAction = binderStatus === "binder_ready"
    ? "Export the evidence binder for governance review only; do not treat it as production approval, model runtime activation, or an operational recommendation."
    : binderStatus === "needs_observation_events"
      ? "Record audit-only shadow observation events before building a complete binder."
      : binderStatus === "needs_review_dashboard"
        ? "Complete the Phase 3I review dashboard evidence before binding exports."
        : binderStatus === "needs_decision_log"
          ? "Record Phase 3J human review decisions before exporting a complete binder."
          : "Resolve audit safety blockers without enabling model runtime, inference endpoints, or business mutations.";

  const summary: InventoryStockoutShadowObservationDecisionReviewExportBinderSummary = {
    generatedAt,
    importId: resolvedImportId,
    binderStatus,
    recommendation,
    readinessScorePct,
    featureFlagKey: FEATURE_FLAG_KEY,
    featureFlagDefault,
    binderRuntimeEnabled,
    runtimeInvocationAllowed,
    modelExecutionAllowed,
    inferenceEndpointExposed,
    productionIntegrationAllowed,
    decisionAutomationAllowed,
    canChangeInventoryOrAccounting,
    auditOnly,
    mutationAllowed,
    exportOnly,
    humanReviewOnly,
    baselineOnlySourceOfTruth,
    operationalDecisionAllowed,
    customerSupplierMessageAllowed,
    reviewDashboardStatus: reviewDashboard.summary.dashboardStatus,
    decisionLogStatus: decisionLog.summary.decisionLogStatus,
    eventCount,
    reviewRowCount: reviewDashboard.reviewRows.length,
    decisionCount,
    evidenceSectionCount,
    completedEvidenceSectionCount,
    baselineComparisonAvailable: Boolean(reviewDashboard.summary.baselineComparisonAvailable),
    unsafeEventCount,
    forbiddenFieldAttemptCount,
    binderComplete,
    jsonExportVersion: JSON_EXPORT_VERSION,
    csvExportVersion: CSV_EXPORT_VERSION,
    manifestVersion: MANIFEST_VERSION,
    blockerCount,
    warningCount,
    passCount,
    totalGateCount,
    blockers: uniqueMessages(gates, "block"),
    warnings: uniqueMessages(gates, "warning"),
    recommendedNextAction,
  };

  const exportManifest = {
    generatedAt,
    phase: "Phase 3K — Shadow Observation Decision Review Export Binder",
    contractKey: EXPORT_BINDER_CONTRACT_KEY,
    contractVersion: EXPORT_BINDER_CONTRACT_VERSION,
    importId: resolvedImportId,
    binderStatus,
    binderComplete,
    jsonExportVersion: JSON_EXPORT_VERSION,
    csvExportVersion: CSV_EXPORT_VERSION,
    manifestVersion: MANIFEST_VERSION,
    evidenceSectionCount,
    completedEvidenceSectionCount,
    reviewRowCount: reviewDashboard.reviewRows.length,
    decisionCount,
    eventCount,
    exportOnly,
    auditOnly,
    mutationAllowed,
    runtimeInvocationAllowed,
    modelExecutionAllowed,
    inferenceEndpointExposed,
    productionIntegrationAllowed,
    decisionAutomationAllowed,
    canChangeInventoryOrAccounting,
  };

  const binderPayload = {
    exportVersion: JSON_EXPORT_VERSION,
    generatedAt,
    contract: buildContract(),
    summary,
    evidenceSections,
    reviewDashboard: {
      contract: buildInventoryStockoutShadowObservationReviewDashboardContract(),
      summary: reviewDashboard.summary,
      baselineComparison: reviewDashboard.baselineComparison,
      exportManifest: reviewDashboard.exportManifest,
      reviewRows: reviewDashboard.reviewRows,
    },
    decisionLog: {
      contract: buildInventoryStockoutShadowObservationReviewDecisionLogContract(),
      summary: decisionLog.summary,
      decisionPolicy: decisionLog.decisionPolicy,
      decisionRows: decisionLog.decisionRows,
      auditExport: decisionLog.auditExport,
    },
    safetyPolicy: buildSafetyPolicy(generatedAt),
    exportManifest,
    policy: "Governance export binder only; not production approval, runtime activation, inference serving, scoring, operational recommendation, inventory/accounting mutation, or customer/supplier communication.",
  };

  const binderFingerprint = createEvidenceFingerprint({
    importId: resolvedImportId,
    eventCount,
    decisionCount,
    reviewRowCount: reviewDashboard.reviewRows.length,
    baselineComparison: reviewDashboard.baselineComparison,
    decisionRows: decisionLog.decisionRows,
    generatedAt,
  });

  return {
    success: true,
    contract: buildContract(),
    summary,
    gates,
    evidenceSections,
    exportManifest: {
      ...exportManifest,
      binderFingerprint,
    },
    binderPayload: {
      ...binderPayload,
      exportManifest: {
        ...exportManifest,
        binderFingerprint,
      },
    },
    safetyPolicy: buildSafetyPolicy(generatedAt),
    reviewDashboardSummary: reviewDashboard.summary,
    decisionLogSummary: decisionLog.summary,
    baselineComparison: reviewDashboard.baselineComparison,
  };
};

export const buildMlShadowObservationDecisionReviewExportBinderCatalogSummary = async (): Promise<MlShadowObservationDecisionReviewExportBinderCatalogSummary> => {
  const current = await buildInventoryStockoutShadowObservationDecisionReviewExportBinder();
  return {
    generatedAt: new Date().toISOString(),
    contract: buildContract(),
    currentShadowObservationDecisionReviewExportBinder: current.summary,
    evidenceSections: current.evidenceSections,
    exportManifest: current.exportManifest,
    recommendedNextAction: current.summary.recommendedNextAction,
  };
};

export const exportInventoryStockoutShadowObservationDecisionReviewExportBinderCsv = async (
  importIdInput?: unknown,
  options: Record<string, unknown> = {},
): Promise<{ filename: string; csv: string; rowCount: number; manifest: Record<string, unknown> }> => {
  const binder = await buildInventoryStockoutShadowObservationDecisionReviewExportBinder(importIdInput, options);
  const headers = [
    "sectionKey",
    "label",
    "rowCount",
    "status",
    "sourceContractKey",
    "policy",
  ];
  const rows = binder.evidenceSections.map((section) => {
    const row = section as Record<string, unknown>;
    return headers.map((header) => csvEscape(row[header])).join(",");
  });
  return {
    filename: `inventory-stockout-shadow-observation-decision-review-export-binder-${binder.summary.importId || "latest"}.csv`,
    csv: [`# ${CSV_EXPORT_VERSION}`, headers.join(","), ...rows].join("\n"),
    rowCount: binder.evidenceSections.length,
    manifest: binder.exportManifest,
  };
};
