import {
  getMlModelResultImportById,
  listMlBaselineBenchmarks,
  listMlModelResultImports,
  listMlShadowAdapterObservationLogContracts,
  listMlShadowAdapterObservationLogContractsByImportId,
  listMlShadowObservationEvents,
  listMlShadowObservationEventsByImportId,
} from "../../db/domains/mlDatasets.db";
import { buildInventoryStockoutShadowObservationEventStore } from "./inventoryStockoutShadowObservationEventStore.service";
import type {
  InventoryStockoutShadowObservationReviewDashboardContract,
  InventoryStockoutShadowObservationReviewDashboardGate,
  InventoryStockoutShadowObservationReviewDashboardResponse,
  InventoryStockoutShadowObservationReviewDashboardSummary,
  MlShadowObservationReviewDashboardCatalogSummary,
  ShadowObservationReviewDashboardRecommendation,
  ShadowObservationReviewDashboardStatus,
} from "./datasetTypes";

const REVIEW_DASHBOARD_CONTRACT_KEY = "inventory_stockout_shadow_observation_review_dashboard_v1" as const;
const REVIEW_DASHBOARD_CONTRACT_VERSION = "v1" as const;
const REVIEW_DASHBOARD_SCOPE = "phase3i_shadow_observation_review_audit_dashboard" as const;
const REQUIRED_EVENT_STORE_CONTRACT_KEY = "inventory_stockout_shadow_observation_event_store_v1" as const;
const FEATURE_FLAG_KEY = "ml.inventoryStockout.shadowObservationReviewDashboard.enabled" as const;
const CSV_EXPORT_VERSION = "shadow_observation_review_dashboard_csv_v1" as const;
const JSON_EXPORT_VERSION = "shadow_observation_review_dashboard_json_v1" as const;

const featureFlagDefault = false as const;
const dashboardRuntimeEnabled = false as const;
const runtimeInvocationAllowed = false as const;
const modelExecutionAllowed = false as const;
const inferenceEndpointExposed = false as const;
const productionIntegrationAllowed = false as const;
const decisionAutomationAllowed = false as const;
const canChangeInventoryOrAccounting = false as const;
const auditOnly = true as const;
const mutationAllowed = false as const;
const baselineOnlySourceOfTruth = true as const;
const exportOnly = true as const;

const asNumber = (value: unknown): number | null => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
};

const pickLatestImportId = async (): Promise<number | null> => {
  const imports = await listMlModelResultImports(1) as Array<Record<string, unknown>>;
  return asNumber(imports[0]?.id);
};

const buildGate = (
  key: string,
  label: string,
  status: InventoryStockoutShadowObservationReviewDashboardGate["status"],
  value: unknown,
  message: string,
): InventoryStockoutShadowObservationReviewDashboardGate => ({ key, label, status, value, message });

const uniqueMessages = (
  gates: InventoryStockoutShadowObservationReviewDashboardGate[],
  status: InventoryStockoutShadowObservationReviewDashboardGate["status"],
): string[] => Array.from(new Set(gates.filter((gate) => gate.status === status).map((gate) => gate.message)));

const toPercentDelta = (candidate: unknown, baseline: unknown): number | null => {
  const candidateNumber = Number(candidate);
  const baselineNumber = Number(baseline);
  if (!Number.isFinite(candidateNumber) || !Number.isFinite(baselineNumber)) return null;
  return Math.round((candidateNumber - baselineNumber) * 100) / 100;
};

const buildContract = (): InventoryStockoutShadowObservationReviewDashboardContract => ({
  contractKey: REVIEW_DASHBOARD_CONTRACT_KEY,
  contractVersion: REVIEW_DASHBOARD_CONTRACT_VERSION,
  generatedAt: new Date().toISOString(),
  purpose: "Review, filter, export, and baseline-compare stored shadow observation event envelopes without invoking a model runtime or creating operational recommendations.",
  requiredEventStoreContractKey: REQUIRED_EVENT_STORE_CONTRACT_KEY,
  dashboardScope: REVIEW_DASHBOARD_SCOPE,
  exportVersions: {
    csv: CSV_EXPORT_VERSION,
    json: JSON_EXPORT_VERSION,
  },
  requiredAssertions: [
    "Phase 3H event store exists before the review dashboard is considered useful.",
    "Review dashboard feature flag remains false by default.",
    "Dashboard reads audit-only shadow observation rows and does not execute a model.",
    "Dashboard exports are governance artifacts only and cannot be used as production recommendations.",
    "Baseline benchmark remains the reference point for comparison.",
    "Runtime invocation, model execution, inference endpoints, production integration, and decision automation remain disabled.",
    "Inventory, accounting, pricing, reports, invoices, ledgers, purchasing, repairs, customers, partners, and communications are not mutated.",
  ],
  forbiddenBehavior: [
    "Do not execute a model artifact while building the review dashboard.",
    "Do not score products, customers, partners, invoices, or inventory rows from this dashboard.",
    "Do not emit purchase quantities, price changes, customer messages, supplier messages, or operational recommendations.",
    "Do not write review-dashboard output into operational inventory, accounting, pricing, report, customer, partner, or messaging tables.",
    "Do not expose inference or prediction-serving endpoints.",
  ],
  operationalPolicy: {
    productionIntegrationAllowed: false,
    inferenceRuntimeEnabled: false,
    decisionAutomationAllowed: false,
    canChangeInventoryOrAccounting: false,
  },
});

const buildSafetyPolicy = () => ({
  featureFlagKey: FEATURE_FLAG_KEY,
  featureFlagDefault,
  dashboardRuntimeEnabled,
  runtimeInvocationAllowed,
  modelExecutionAllowed,
  inferenceEndpointExposed,
  productionIntegrationAllowed,
  decisionAutomationAllowed,
  canChangeInventoryOrAccounting,
  auditOnly,
  mutationAllowed,
  baselineOnlySourceOfTruth: true,
  exportOnly,
  protectedTableGroups: ["inventory", "accounting", "pricing", "reports", "communications", "customers", "partners"],
});

const buildReviewRows = (events: Array<Record<string, unknown>>) => events.map((event) => ({
  eventId: event.id ?? null,
  importId: event.importId ?? null,
  observationContractId: event.observationContractId ?? null,
  eventStoreStatus: event.eventStoreStatus ?? null,
  readinessScorePct: event.readinessScorePct ?? null,
  baselineReference: event.baselineReference ?? null,
  modelKey: event.modelKey ?? null,
  modelVersion: event.modelVersion ?? null,
  sourceRunId: event.sourceRunId ?? null,
  auditOnly: event.auditOnly === 1 || event.auditOnly === true,
  mutationAllowed: event.mutationAllowed === 1 || event.mutationAllowed === true,
  runtimeInvocationAllowed: event.runtimeInvocationAllowed === 1 || event.runtimeInvocationAllowed === true,
  modelExecutionAllowed: event.modelExecutionAllowed === 1 || event.modelExecutionAllowed === true,
  forbiddenFieldAttemptCount: event.forbiddenFieldAttemptCount ?? 0,
  createdAt: event.createdAt ?? null,
}));

const csvEscape = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
};

const csvHeaders = [
  "event_id",
  "import_id",
  "observation_contract_id",
  "event_store_status",
  "readiness_score_pct",
  "baseline_reference",
  "model_key",
  "model_version",
  "source_run_id",
  "audit_only",
  "mutation_allowed",
  "runtime_invocation_allowed",
  "model_execution_allowed",
  "forbidden_field_attempt_count",
  "created_at",
] as const;

const buildCsv = (rows: Array<Record<string, unknown>>): string => {
  const lines = [csvHeaders.join(",")];
  rows.forEach((row) => {
    lines.push([
      row.eventId,
      row.importId,
      row.observationContractId,
      row.eventStoreStatus,
      row.readinessScorePct,
      row.baselineReference,
      row.modelKey,
      row.modelVersion,
      row.sourceRunId,
      row.auditOnly,
      row.mutationAllowed,
      row.runtimeInvocationAllowed,
      row.modelExecutionAllowed,
      row.forbiddenFieldAttemptCount,
      row.createdAt,
    ].map(csvEscape).join(","));
  });
  return `${lines.join("\n")}\n`;
};

export const buildInventoryStockoutShadowObservationReviewDashboardContract = buildContract;

export const buildInventoryStockoutShadowObservationReviewDashboard = async (
  importIdInput?: unknown,
  options: Record<string, unknown> = {},
): Promise<InventoryStockoutShadowObservationReviewDashboardResponse> => {
  const generatedAt = new Date().toISOString();
  const importId = asNumber(importIdInput) ?? asNumber(options.importId) ?? await pickLatestImportId();
  const modelImport = importId ? await getMlModelResultImportById(importId) as Record<string, unknown> | null : null;
  const eventStore = await buildInventoryStockoutShadowObservationEventStore(importId, options);
  const events = importId ? await listMlShadowObservationEventsByImportId(importId, 50) as Array<Record<string, unknown>> : await listMlShadowObservationEvents(50) as Array<Record<string, unknown>>;
  const observationContracts = importId ? await listMlShadowAdapterObservationLogContractsByImportId(importId, 25) as Array<Record<string, unknown>> : await listMlShadowAdapterObservationLogContracts(25) as Array<Record<string, unknown>>;
  const latestBenchmarks = await listMlBaselineBenchmarks(10) as Array<Record<string, unknown>>;
  const latestBenchmark = latestBenchmarks[0] || null;
  const reviewRows = buildReviewRows(events);

  const eventCount = reviewRows.length;
  const auditOnlyEventCount = reviewRows.filter((row) => row.auditOnly === true && row.mutationAllowed === false).length;
  const unsafeEventCount = reviewRows.filter((row) => row.auditOnly !== true || row.mutationAllowed !== false || row.runtimeInvocationAllowed === true || row.modelExecutionAllowed === true).length;
  const forbiddenFieldAttemptCount = reviewRows.reduce((sum, row) => sum + (Number(row.forbiddenFieldAttemptCount) || 0), 0);
  const exportReady = eventCount > 0 && unsafeEventCount === 0;
  const eventStoreStatus = eventStore.summary.eventStoreStatus;
  const eventStoreReady = eventStoreStatus === "event_store_ready" || eventStoreStatus === "blocked" || eventStoreStatus === "needs_observation_contract";
  const baselineF1Pct = modelImport?.baselineF1Pct ?? latestBenchmark?.bestF1Pct ?? null;
  const baselineBalancedAccuracyPct = modelImport?.baselineBalancedAccuracyPct ?? latestBenchmark?.bestBalancedAccuracyPct ?? null;
  const candidateF1Pct = modelImport?.f1Pct ?? null;
  const candidateBalancedAccuracyPct = modelImport?.balancedAccuracyPct ?? null;
  const deltaF1Pct = toPercentDelta(candidateF1Pct, baselineF1Pct);
  const deltaBalancedAccuracyPct = toPercentDelta(candidateBalancedAccuracyPct, baselineBalancedAccuracyPct);
  const baselineComparisonAvailable = Boolean(baselineF1Pct != null || baselineBalancedAccuracyPct != null);

  const gates: InventoryStockoutShadowObservationReviewDashboardGate[] = [
    buildGate("event_store_surface_available", "Event-store surface", eventStoreReady ? "pass" : "block", eventStoreStatus, "Phase 3H event-store contract is visible to the review dashboard."),
    buildGate("observation_events_available", "Observation events", eventCount > 0 ? "pass" : "warning", eventCount, eventCount > 0 ? "Stored shadow observation events are available for review." : "No stored observation events are available yet; dashboard remains ready but empty."),
    buildGate("all_events_audit_only", "Audit-only rows", unsafeEventCount === 0 ? "pass" : "block", { auditOnlyEventCount, unsafeEventCount }, unsafeEventCount === 0 ? "All visible observation events remain audit-only and mutation-forbidden." : "One or more rows violate audit-only review constraints."),
    buildGate("no_forbidden_field_attempts", "Forbidden model-output attempts", forbiddenFieldAttemptCount === 0 ? "pass" : "warning", forbiddenFieldAttemptCount, forbiddenFieldAttemptCount === 0 ? "No model-output fields were attempted in stored events." : "Some event-store inputs attempted forbidden model-output fields; keep them in audit review only."),
    buildGate("baseline_comparison_available", "Baseline comparison", baselineComparisonAvailable ? "pass" : "warning", { baselineF1Pct, baselineBalancedAccuracyPct, candidateF1Pct, candidateBalancedAccuracyPct }, baselineComparisonAvailable ? "Baseline comparison can be displayed without changing production decisions." : "No baseline benchmark/import metric is available for comparison yet."),
    buildGate("export_is_governance_only", "Governance export", exportReady ? "pass" : "warning", exportReady, "CSV/JSON exports are audit artifacts only and cannot be used as operational recommendations."),
    buildGate("feature_flag_default_off", "Feature flag default off", featureFlagDefault === false ? "pass" : "block", featureFlagDefault, "Review dashboard feature flag remains false by default."),
    buildGate("dashboard_runtime_disabled", "Dashboard runtime disabled", dashboardRuntimeEnabled === false ? "pass" : "block", dashboardRuntimeEnabled, "Dashboard does not enable automatic runtime review processing."),
    buildGate("runtime_invocation_disabled", "Runtime invocation disabled", runtimeInvocationAllowed === false ? "pass" : "block", runtimeInvocationAllowed, "No runtime invocation is allowed from the review dashboard."),
    buildGate("model_execution_disabled", "Model execution disabled", modelExecutionAllowed === false ? "pass" : "block", modelExecutionAllowed, "Model execution remains disabled."),
    buildGate("endpoint_hidden", "Inference endpoint hidden", inferenceEndpointExposed === false ? "pass" : "block", inferenceEndpointExposed, "No inference or scoring endpoint is exposed."),
    buildGate("baseline_only_source_of_truth", "Baseline source of truth", baselineOnlySourceOfTruth ? "pass" : "block", baselineOnlySourceOfTruth, "Rule/statistical baseline remains the only source of truth."),
    buildGate("mutation_forbidden", "Operational mutations forbidden", canChangeInventoryOrAccounting === false ? "pass" : "block", canChangeInventoryOrAccounting, "Review dashboard cannot mutate inventory, accounting, pricing, reports, communications, customers, or partners."),
  ];

  const blockerCount = gates.filter((gate) => gate.status === "block").length;
  const warningCount = gates.filter((gate) => gate.status === "warning").length;
  const passCount = gates.filter((gate) => gate.status === "pass").length;
  const totalGateCount = gates.length;
  const readinessScorePct = totalGateCount ? Math.round((passCount / totalGateCount) * 100) : 0;

  let dashboardStatus: ShadowObservationReviewDashboardStatus = "review_ready";
  let recommendation: ShadowObservationReviewDashboardRecommendation = "review_and_export_audit_only_events";

  if (blockerCount > 0) {
    dashboardStatus = "blocked";
    recommendation = "resolve_audit_safety_blocks_first";
  } else if (!eventStoreReady) {
    dashboardStatus = "needs_event_store";
    recommendation = "complete_shadow_observation_event_store_first";
  } else if (eventCount === 0) {
    dashboardStatus = "needs_observation_events";
    recommendation = "record_audit_only_observation_events_first";
  }

  const recommendedNextAction = dashboardStatus === "review_ready"
    ? "Review stored audit-only shadow observation events, export governance evidence if needed, and compare only against baseline metrics; do not enable runtime invocation or operational decisions."
    : dashboardStatus === "needs_observation_events"
      ? "Record audit-only Phase 3H observation events before treating the review dashboard as populated."
      : dashboardStatus === "needs_event_store"
        ? "Complete the Phase 3H shadow observation event store surface first."
        : "Resolve audit safety blockers without enabling model runtime, inference endpoints, or business mutations.";

  const summary: InventoryStockoutShadowObservationReviewDashboardSummary = {
    generatedAt,
    importId,
    dashboardStatus,
    recommendation,
    readinessScorePct,
    featureFlagKey: FEATURE_FLAG_KEY,
    featureFlagDefault,
    dashboardRuntimeEnabled,
    runtimeInvocationAllowed,
    modelExecutionAllowed,
    inferenceEndpointExposed,
    productionIntegrationAllowed,
    decisionAutomationAllowed,
    canChangeInventoryOrAccounting,
    auditOnly,
    mutationAllowed,
    baselineOnlySourceOfTruth,
    exportOnly,
    eventCount,
    auditOnlyEventCount,
    unsafeEventCount,
    forbiddenFieldAttemptCount,
    observationContractCount: observationContracts.length,
    baselineComparisonAvailable,
    baselineF1Pct: baselineF1Pct as number | null,
    candidateF1Pct: candidateF1Pct as number | null,
    deltaF1Pct,
    baselineBalancedAccuracyPct: baselineBalancedAccuracyPct as number | null,
    candidateBalancedAccuracyPct: candidateBalancedAccuracyPct as number | null,
    deltaBalancedAccuracyPct,
    csvExportVersion: CSV_EXPORT_VERSION,
    jsonExportVersion: JSON_EXPORT_VERSION,
    blockerCount,
    warningCount,
    passCount,
    totalGateCount,
    blockers: uniqueMessages(gates, "block"),
    warnings: uniqueMessages(gates, "warning"),
    recommendedNextAction,
  };

  const baselineComparison = {
    generatedAt,
    baselineSource: modelImport?.baselineF1Pct != null || modelImport?.baselineBalancedAccuracyPct != null ? "model_import_baseline_metrics" : latestBenchmark ? "latest_baseline_benchmark" : "not_available",
    baselineBenchmarkId: latestBenchmark?.id ?? null,
    modelImportId: modelImport?.id ?? importId ?? null,
    baselineF1Pct,
    candidateF1Pct,
    deltaF1Pct,
    baselineBalancedAccuracyPct,
    candidateBalancedAccuracyPct,
    deltaBalancedAccuracyPct,
    comparisonPolicy: "Display-only governance comparison; baseline remains source of truth and no production decision changes are allowed.",
  };

  const exportManifest = {
    generatedAt,
    phase: "Phase 3I — Shadow Observation Review/Audit Dashboard",
    contractKey: REVIEW_DASHBOARD_CONTRACT_KEY,
    csvExportVersion: CSV_EXPORT_VERSION,
    jsonExportVersion: JSON_EXPORT_VERSION,
    rowCount: reviewRows.length,
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

  return {
    success: true,
    contract: buildContract(),
    summary,
    gates,
    baselineComparison,
    reviewRows,
    exportManifest,
    safetyPolicy: buildSafetyPolicy(),
    eventStoreSummary: eventStore.summary,
    recentObservationEvents: events,
    recentObservationContracts: observationContracts,
    latestBenchmark,
    latestModelImport: modelImport,
  };
};

export const buildMlShadowObservationReviewDashboardCatalogSummary = async (): Promise<MlShadowObservationReviewDashboardCatalogSummary> => {
  const importId = await pickLatestImportId();
  const current = await buildInventoryStockoutShadowObservationReviewDashboard(importId);
  return {
    generatedAt: new Date().toISOString(),
    contract: buildContract(),
    currentShadowObservationReviewDashboard: current.summary,
    baselineComparison: current.baselineComparison,
    reviewRows: current.reviewRows.slice(0, 25),
    exportManifest: current.exportManifest,
    recommendedNextAction: current.summary.recommendedNextAction,
  };
};

export const exportInventoryStockoutShadowObservationReviewDashboardCsv = async (
  importIdInput?: unknown,
  options: Record<string, unknown> = {},
): Promise<{ filename: string; csv: string; rowCount: number; manifest: Record<string, unknown> }> => {
  const dashboard = await buildInventoryStockoutShadowObservationReviewDashboard(importIdInput, options);
  const csv = buildCsv(dashboard.reviewRows);
  const generatedStamp = dashboard.summary.generatedAt.replace(/[:.]/g, "-");
  return {
    filename: `inventory-stockout-shadow-observation-review-dashboard-${generatedStamp}.csv`,
    csv,
    rowCount: dashboard.reviewRows.length,
    manifest: dashboard.exportManifest,
  };
};
