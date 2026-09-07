import {
  getMlModelResultImportById,
  listMlModelResultImports,
  listMlShadowObservationEventsByImportId,
  listMlShadowObservationReviewDecisions,
  listMlShadowObservationReviewDecisionsByImportId,
  recordMlShadowObservationReviewDecision,
} from "../../db/domains/mlDatasets.db";
import {
  buildInventoryStockoutShadowObservationReviewDashboard,
  buildInventoryStockoutShadowObservationReviewDashboardContract,
} from "./inventoryStockoutShadowObservationReviewDashboard.service";
import type {
  InventoryStockoutShadowObservationReviewDecisionLogContract,
  InventoryStockoutShadowObservationReviewDecisionLogGate,
  InventoryStockoutShadowObservationReviewDecisionLogResponse,
  InventoryStockoutShadowObservationReviewDecisionLogSummary,
  MlShadowObservationReviewDecisionLogCatalogSummary,
  ShadowObservationReviewDecisionLogRecommendation,
  ShadowObservationReviewDecisionLogStatus,
} from "./datasetTypes";

const DECISION_LOG_CONTRACT_KEY = "inventory_stockout_shadow_observation_review_decision_log_v1" as const;
const DECISION_LOG_CONTRACT_VERSION = "v1" as const;
const REQUIRED_REVIEW_DASHBOARD_KEY = "inventory_stockout_shadow_observation_review_dashboard_v1" as const;
const DECISION_LOG_SCOPE = "phase3j_shadow_observation_review_decision_log_audit_only" as const;
const FEATURE_FLAG_KEY = "ml.inventoryStockout.shadowObservationReviewDecisionLog.enabled" as const;
const CSV_EXPORT_VERSION = "shadow_observation_review_decision_log_csv_v1" as const;
const JSON_EXPORT_VERSION = "shadow_observation_review_decision_log_json_v1" as const;

const featureFlagDefault = false as const;
const decisionLogEnabled = false as const;
const humanReviewOnly = true as const;
const runtimeInvocationAllowed = false as const;
const modelExecutionAllowed = false as const;
const inferenceEndpointExposed = false as const;
const productionIntegrationAllowed = false as const;
const decisionAutomationAllowed = false as const;
const canChangeInventoryOrAccounting = false as const;
const auditOnly = true as const;
const mutationAllowed = false as const;
const baselineOnlySourceOfTruth = true as const;
const operationalDecisionAllowed = false as const;
const customerSupplierMessageAllowed = false as const;

const allowedDecisionTypes = [
  "acknowledge_audit_evidence",
  "needs_more_evidence",
  "block_future_phase",
  "accept_for_governance_archive",
] as const;

const allowedDecisionStatuses = ["draft", "recorded", "superseded", "voided"] as const;

const forbiddenDecisionFieldKeys = [
  "approveProduction",
  "enableRuntime",
  "enableInference",
  "executeModel",
  "predictedProbability",
  "predictedLabel",
  "predictionScore",
  "modelScore",
  "operationalRecommendation",
  "purchaseSuggestion",
  "priceSuggestion",
  "reorderQuantity",
  "sendCustomerMessage",
  "sendSupplierMessage",
  "mutateInventory",
  "mutateAccounting",
] as const;

const asNumber = (value: unknown): number | null => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
};

const normalizeText = (value: unknown, fallback: string | null = null): string | null => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : fallback;
};

const hasOwn = (source: Record<string, unknown>, key: string): boolean => Object.prototype.hasOwnProperty.call(source, key);

const extractForbiddenFieldKeys = (options: Record<string, unknown>): string[] => {
  const decision = options.decision && typeof options.decision === "object" && !Array.isArray(options.decision)
    ? options.decision as Record<string, unknown>
    : {};
  const payload = options.payload && typeof options.payload === "object" && !Array.isArray(options.payload)
    ? options.payload as Record<string, unknown>
    : {};
  const keys = forbiddenDecisionFieldKeys.filter((key) => hasOwn(options, key) || hasOwn(decision, key) || hasOwn(payload, key));
  return Array.from(new Set(keys));
};

const normalizeDecisionType = (value: unknown): typeof allowedDecisionTypes[number] => {
  const text = normalizeText(value, "acknowledge_audit_evidence") as typeof allowedDecisionTypes[number];
  return allowedDecisionTypes.includes(text) ? text : "acknowledge_audit_evidence";
};

const normalizeDecisionStatus = (value: unknown): typeof allowedDecisionStatuses[number] => {
  const text = normalizeText(value, "recorded") as typeof allowedDecisionStatuses[number];
  return allowedDecisionStatuses.includes(text) ? text : "recorded";
};

const normalizeReviewedEventIds = (value: unknown): number[] => {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map(asNumber).filter((item): item is number => item !== null))).slice(0, 100);
};

const pickLatestImportId = async (): Promise<number | null> => {
  const imports = await listMlModelResultImports(1) as Array<Record<string, unknown>>;
  return asNumber(imports[0]?.id);
};

const buildContract = (): InventoryStockoutShadowObservationReviewDecisionLogContract => ({
  contractKey: DECISION_LOG_CONTRACT_KEY,
  contractVersion: DECISION_LOG_CONTRACT_VERSION,
  generatedAt: new Date().toISOString(),
  purpose: "Record human review decisions for shadow observation audit evidence without enabling automation, inference, or operational mutations.",
  requiredReviewDashboardKey: REQUIRED_REVIEW_DASHBOARD_KEY,
  decisionLogScope: DECISION_LOG_SCOPE,
  allowedDecisionTypes: [...allowedDecisionTypes],
  forbiddenBehavior: [
    "Do not convert review decisions into inventory, accounting, pricing, report, customer, partner, or communication mutations.",
    "Do not enable model runtime, inference endpoints, scoring, prediction serving, or external ML workers.",
    "Do not store model scores, predicted labels, purchase suggestions, price suggestions, reorder quantities, or operational recommendations.",
    "Do not treat decision log rows as production approvals or sales decisions.",
    "Do not send SMS, Telegram, email, customer reminders, or supplier messages from this phase.",
  ],
  operationalPolicy: {
    productionIntegrationAllowed: false,
    inferenceRuntimeEnabled: false,
    decisionAutomationAllowed: false,
    canChangeInventoryOrAccounting: false,
  },
});

const buildGate = (
  key: string,
  label: string,
  status: InventoryStockoutShadowObservationReviewDecisionLogGate["status"],
  value: unknown,
  message: string,
): InventoryStockoutShadowObservationReviewDecisionLogGate => ({ key, label, status, value, message });

const uniqueMessages = (
  gates: InventoryStockoutShadowObservationReviewDecisionLogGate[],
  status: InventoryStockoutShadowObservationReviewDecisionLogGate["status"],
): string[] => Array.from(new Set(gates.filter((gate) => gate.status === status).map((gate) => gate.message)));

const buildDecisionPolicy = (generatedAt: string) => ({
  generatedAt,
  policyKey: "shadow_observation_review_decision_log_policy_v1",
  decisionMode: "human_audit_decision_only",
  allowedDecisionTypes: [...allowedDecisionTypes],
  allowedDecisionStatuses: [...allowedDecisionStatuses],
  forbiddenFields: [...forbiddenDecisionFieldKeys],
  requiredFlags: {
    humanReviewOnly: true,
    auditOnly: true,
    mutationAllowed: false,
    runtimeInvocationAllowed: false,
    modelExecutionAllowed: false,
    operationalDecisionAllowed: false,
    customerSupplierMessageAllowed: false,
    baselineOnlySourceOfTruth: true,
  },
});

const buildAuditExport = (
  generatedAt: string,
  summary: InventoryStockoutShadowObservationReviewDecisionLogSummary,
  decisions: Array<Record<string, unknown>>,
) => ({
  exportVersion: JSON_EXPORT_VERSION,
  generatedAt,
  summary,
  decisions,
  policy: "Governance evidence only; not a production approval, operational recommendation, or model runtime activation.",
});

const buildDecisionRows = (decisions: Array<Record<string, unknown>>) => decisions.map((decision) => ({
  id: decision.id ?? null,
  importId: decision.importId ?? null,
  observationEventId: decision.observationEventId ?? null,
  reviewDecisionType: decision.reviewDecisionType ?? null,
  reviewDecisionStatus: decision.reviewDecisionStatus ?? null,
  reviewerName: decision.reviewerName ?? null,
  reviewerRole: decision.reviewerRole ?? null,
  humanReviewOnly: Boolean(decision.humanReviewOnly),
  auditOnly: Boolean(decision.auditOnly),
  mutationAllowed: Boolean(decision.mutationAllowed),
  operationalDecisionAllowed: Boolean(decision.operationalDecisionAllowed),
  forbiddenFieldAttemptCount: Number(decision.forbiddenFieldAttemptCount || 0),
  createdAt: decision.createdAt ?? null,
}));

export const buildInventoryStockoutShadowObservationReviewDecisionLogContract = buildContract;

export const buildInventoryStockoutShadowObservationReviewDecisionLog = async (
  importIdInput?: unknown,
  options: Record<string, unknown> = {},
): Promise<InventoryStockoutShadowObservationReviewDecisionLogResponse> => {
  const generatedAt = new Date().toISOString();
  const importId = asNumber(importIdInput) ?? asNumber(options.importId) ?? await pickLatestImportId();
  const modelImport = importId ? await getMlModelResultImportById(importId) as Record<string, unknown> | null : null;
  const reviewDashboard = await buildInventoryStockoutShadowObservationReviewDashboard(importId, options);
  const observationEvents = importId ? await listMlShadowObservationEventsByImportId(importId, options.limit) as Array<Record<string, unknown>> : [];
  const decisions = importId ? await listMlShadowObservationReviewDecisionsByImportId(importId, options.limit) as Array<Record<string, unknown>> : [];
  const forbiddenFieldKeys = extractForbiddenFieldKeys(options);

  const eventCount = observationEvents.length;
  const decisionCount = decisions.length;
  const pendingDecisionCount = decisions.filter((decision) => decision.reviewDecisionStatus === "draft").length;
  const acceptedForAuditCount = decisions.filter((decision) => decision.reviewDecisionType === "acknowledge_audit_evidence" || decision.reviewDecisionType === "accept_for_governance_archive").length;
  const needsMoreEvidenceCount = decisions.filter((decision) => decision.reviewDecisionType === "needs_more_evidence").length;
  const blockedFuturePhaseCount = decisions.filter((decision) => decision.reviewDecisionType === "block_future_phase").length;
  const forbiddenFieldAttemptCount = decisions.reduce((sum, decision) => sum + Number(decision.forbiddenFieldAttemptCount || 0), 0) + forbiddenFieldKeys.length;
  const reviewDashboardReady = reviewDashboard.summary.dashboardStatus === "review_ready";

  const gates = [
    buildGate("review_dashboard_available", "Review dashboard available", reviewDashboardReady ? "pass" : "warning", reviewDashboard.summary.dashboardStatus, "Phase 3I review dashboard must exist before decision logs are governance-complete."),
    buildGate("observation_events_available", "Observation events available", eventCount > 0 ? "pass" : "warning", eventCount, "Human decisions should reference stored audit-only observation events."),
    buildGate("decision_rows_recorded", "Decision rows recorded", decisionCount > 0 ? "pass" : "warning", decisionCount, "No human review decision has been recorded yet."),
    buildGate("forbidden_fields_absent", "Forbidden decision fields absent", forbiddenFieldKeys.length === 0 ? "pass" : "block", forbiddenFieldKeys, "Decision log payload cannot include runtime, score, recommendation, messaging, or operational mutation fields."),
    buildGate("feature_flag_default_off", "Feature flag default off", featureFlagDefault === false ? "pass" : "block", featureFlagDefault, "Decision-log feature flag remains false by default."),
    buildGate("decision_log_disabled", "Decision log runtime disabled", decisionLogEnabled === false ? "pass" : "block", decisionLogEnabled, "Decision-log runtime automation remains disabled."),
    buildGate("human_review_only", "Human review only", humanReviewOnly ? "pass" : "block", humanReviewOnly, "Decision logs are human audit records only."),
    buildGate("runtime_invocation_disabled", "Runtime invocation disabled", runtimeInvocationAllowed === false ? "pass" : "block", runtimeInvocationAllowed, "Decision log cannot invoke runtime."),
    buildGate("model_execution_disabled", "Model execution disabled", modelExecutionAllowed === false ? "pass" : "block", modelExecutionAllowed, "Model execution remains disabled."),
    buildGate("endpoint_hidden", "Inference endpoint hidden", inferenceEndpointExposed === false ? "pass" : "block", inferenceEndpointExposed, "No inference or scoring endpoint is exposed."),
    buildGate("decision_automation_disabled", "Decision automation disabled", decisionAutomationAllowed === false ? "pass" : "block", decisionAutomationAllowed, "Decision log does not automate business actions."),
    buildGate("operational_mutation_forbidden", "Operational mutations forbidden", canChangeInventoryOrAccounting === false && mutationAllowed === false ? "pass" : "block", { canChangeInventoryOrAccounting, mutationAllowed }, "Decision log cannot mutate inventory, accounting, pricing, reports, customers, partners, or communications."),
    buildGate("baseline_only_source_of_truth", "Baseline source of truth", baselineOnlySourceOfTruth ? "pass" : "block", baselineOnlySourceOfTruth, "Rule/statistical baseline remains the only source of truth."),
  ];

  const blockerCount = gates.filter((gate) => gate.status === "block").length;
  const warningCount = gates.filter((gate) => gate.status === "warning").length;
  const passCount = gates.filter((gate) => gate.status === "pass").length;
  const totalGateCount = gates.length;
  const readinessScorePct = totalGateCount ? Math.round((passCount / totalGateCount) * 100) : 0;

  let decisionLogStatus: ShadowObservationReviewDecisionLogStatus = "decision_log_ready";
  let recommendation: ShadowObservationReviewDecisionLogRecommendation = "record_human_audit_decision";

  if (blockerCount > 0) {
    decisionLogStatus = "blocked";
    recommendation = "resolve_audit_safety_blocks_first";
  } else if (!reviewDashboardReady) {
    decisionLogStatus = "needs_review_dashboard";
    recommendation = "review_dashboard_first";
  } else if (eventCount === 0) {
    decisionLogStatus = "needs_observation_events";
    recommendation = "record_observation_events_first";
  }

  const recommendedNextAction = decisionLogStatus === "decision_log_ready"
    ? "Record or review human audit decisions for stored shadow observation events; do not enable runtime invocation, automated decisions, customer/supplier messages, or operational mutations."
    : decisionLogStatus === "needs_observation_events"
      ? "Record audit-only observation events before decision-log review."
      : decisionLogStatus === "needs_review_dashboard"
        ? "Open the Phase 3I review dashboard first and verify audit/export evidence."
        : "Resolve audit safety blockers without enabling model runtime, inference endpoints, or business mutations.";

  const summary: InventoryStockoutShadowObservationReviewDecisionLogSummary = {
    generatedAt,
    importId: importId ?? null,
    decisionLogStatus,
    recommendation,
    readinessScorePct,
    featureFlagKey: FEATURE_FLAG_KEY,
    featureFlagDefault,
    decisionLogEnabled,
    humanReviewOnly,
    runtimeInvocationAllowed,
    modelExecutionAllowed,
    inferenceEndpointExposed,
    productionIntegrationAllowed,
    decisionAutomationAllowed,
    canChangeInventoryOrAccounting,
    auditOnly,
    mutationAllowed,
    baselineOnlySourceOfTruth,
    operationalDecisionAllowed,
    customerSupplierMessageAllowed,
    reviewDashboardStatus: reviewDashboard.summary.dashboardStatus,
    eventCount,
    decisionCount,
    pendingDecisionCount,
    acceptedForAuditCount,
    needsMoreEvidenceCount,
    blockedFuturePhaseCount,
    forbiddenFieldAttemptCount,
    blockerCount,
    warningCount,
    passCount,
    totalGateCount,
    blockers: uniqueMessages(gates, "block"),
    warnings: uniqueMessages(gates, "warning"),
    recommendedNextAction,
  };

  const decisionRows = buildDecisionRows(decisions);
  const auditExport = buildAuditExport(generatedAt, summary, decisionRows);

  return {
    success: true,
    contract: buildContract(),
    summary,
    gates,
    decisionPolicy: buildDecisionPolicy(generatedAt),
    decisionRows,
    recentObservationEvents: observationEvents,
    reviewDashboardSummary: reviewDashboard.summary,
    auditExport: {
      ...auditExport,
      modelImport: modelImport ? { id: modelImport.id, modelKey: modelImport.modelKey, modelVersion: modelImport.modelVersion, status: modelImport.status } : null,
      reviewDashboard: {
        summary: reviewDashboard.summary,
        exportManifest: reviewDashboard.exportManifest,
      },
    },
  };
};

export const recordInventoryStockoutShadowObservationReviewDecision = async (payload: Record<string, unknown>) => {
  const generatedAt = new Date().toISOString();
  const importId = asNumber(payload.importId);
  const observationEventId = asNumber(payload.observationEventId);
  const decisionType = normalizeDecisionType(payload.reviewDecisionType || payload.decisionType);
  const decisionStatus = normalizeDecisionStatus(payload.reviewDecisionStatus || payload.decisionStatus);
  const reviewedEventIds = normalizeReviewedEventIds(payload.reviewedEventIds || (observationEventId ? [observationEventId] : []));
  const forbiddenFieldKeys = extractForbiddenFieldKeys(payload);
  const dashboard = await buildInventoryStockoutShadowObservationReviewDecisionLog(importId, payload);

  const safetyAssertions = {
    generatedAt,
    phase: "Phase 3J — Shadow Observation Review Decision Log",
    humanReviewOnly,
    auditOnly,
    mutationAllowed,
    runtimeInvocationAllowed,
    modelExecutionAllowed,
    inferenceEndpointExposed,
    productionIntegrationAllowed,
    decisionAutomationAllowed,
    canChangeInventoryOrAccounting,
    operationalDecisionAllowed,
    customerSupplierMessageAllowed,
    baselineOnlySourceOfTruth,
    forbiddenFieldKeys,
  };

  const decisionPolicy = buildDecisionPolicy(generatedAt);
  const decisionPayload = {
    reviewDecisionType: decisionType,
    reviewDecisionStatus: decisionStatus,
    reviewerName: normalizeText(payload.reviewerName),
    reviewerRole: normalizeText(payload.reviewerRole),
    reviewerNote: normalizeText(payload.reviewerNote || payload.note),
    reviewedEventIds,
    createdAt: generatedAt,
    auditOnly: true,
    humanReviewOnly: true,
    operationalDecisionAllowed: false,
    mutationAllowed: false,
  };

  const record = await recordMlShadowObservationReviewDecision({
    decisionLogKey: DECISION_LOG_CONTRACT_KEY,
    decisionLogVersion: DECISION_LOG_CONTRACT_VERSION,
    importId,
    observationEventId,
    reviewDashboardKey: REQUIRED_REVIEW_DASHBOARD_KEY,
    reviewDecisionType: decisionType,
    reviewDecisionStatus: decisionStatus,
    reviewerName: normalizeText(payload.reviewerName),
    reviewerRole: normalizeText(payload.reviewerRole),
    reviewerNote: normalizeText(payload.reviewerNote || payload.note),
    evidenceSummary: {
      eventCount: dashboard.summary.eventCount,
      reviewDashboardStatus: dashboard.summary.reviewDashboardStatus,
      decisionLogStatus: dashboard.summary.decisionLogStatus,
      reviewDashboardKey: REQUIRED_REVIEW_DASHBOARD_KEY,
    },
    reviewedEventIds,
    decisionPayload,
    safetyAssertions,
    decisionPolicy,
    auditExport: {
      exportVersion: JSON_EXPORT_VERSION,
      generatedAt,
      decisionPayload,
      safetyAssertions,
      message: "Human audit decision only; not a production approval or operational recommendation.",
    },
    featureFlagKey: FEATURE_FLAG_KEY,
    featureFlagDefault,
    decisionLogEnabled,
    humanReviewOnly,
    runtimeInvocationAllowed,
    modelExecutionAllowed,
    inferenceEndpointExposed,
    productionIntegrationAllowed,
    decisionAutomationAllowed,
    inventoryAccountingChangeAllowed: canChangeInventoryOrAccounting,
    auditOnly,
    mutationAllowed,
    baselineOnlySourceOfTruth,
    operationalDecisionAllowed,
    customerSupplierMessageAllowed,
    forbiddenFieldAttemptCount: forbiddenFieldKeys.length,
    userId: asNumber(payload.userId),
  });

  const refreshed = await buildInventoryStockoutShadowObservationReviewDecisionLog(importId, payload);
  return {
    decisionRecord: record,
    summary: refreshed.summary,
    safetyAssertions,
  };
};

export const listInventoryStockoutShadowObservationReviewDecisions = async (importIdInput?: unknown, limitInput?: unknown) => {
  const importId = asNumber(importIdInput);
  return importId
    ? listMlShadowObservationReviewDecisionsByImportId(importId, limitInput)
    : listMlShadowObservationReviewDecisions(limitInput);
};

const csvEscape = (value: unknown): string => {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
};

export const exportInventoryStockoutShadowObservationReviewDecisionLogCsv = async (importIdInput?: unknown, options: Record<string, unknown> = {}) => {
  const data = await buildInventoryStockoutShadowObservationReviewDecisionLog(importIdInput, options);
  const headers = [
    "id",
    "importId",
    "observationEventId",
    "reviewDecisionType",
    "reviewDecisionStatus",
    "reviewerName",
    "reviewerRole",
    "humanReviewOnly",
    "auditOnly",
    "mutationAllowed",
    "operationalDecisionAllowed",
    "forbiddenFieldAttemptCount",
    "createdAt",
  ];
  const rows = data.decisionRows.map((row) => headers.map((header) => csvEscape(row[header])).join(","));
  return {
    filename: `inventory-stockout-shadow-observation-review-decision-log-${data.summary.importId || "latest"}.csv`,
    csv: [`# ${CSV_EXPORT_VERSION}`, headers.join(","), ...rows].join("\n"),
  };
};

export const buildMlShadowObservationReviewDecisionLogCatalogSummary = async (): Promise<MlShadowObservationReviewDecisionLogCatalogSummary> => {
  const current = await buildInventoryStockoutShadowObservationReviewDecisionLog();
  const lastShadowObservationReviewDecisions = await listMlShadowObservationReviewDecisions(5) as Array<Record<string, unknown>>;
  return {
    generatedAt: new Date().toISOString(),
    contract: buildContract(),
    currentShadowObservationReviewDecisionLog: current.summary,
    lastShadowObservationReviewDecisions,
    recommendedNextAction: current.summary.recommendedNextAction,
  };
};
