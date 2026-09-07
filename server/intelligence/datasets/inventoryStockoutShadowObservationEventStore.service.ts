import {
  getMlModelResultImportById,
  listMlModelResultImports,
  listMlShadowAdapterObservationLogContracts,
  listMlShadowAdapterObservationLogContractsByImportId,
  listMlShadowObservationEvents,
  listMlShadowObservationEventsByImportId,
  recordMlShadowObservationEvent,
} from "../../db/domains/mlDatasets.db";
import type {
  InventoryStockoutShadowObservationEventStoreContract,
  InventoryStockoutShadowObservationEventStoreGate,
  InventoryStockoutShadowObservationEventStoreResponse,
  InventoryStockoutShadowObservationEventStoreSummary,
  MlShadowObservationEventStoreCatalogSummary,
  ShadowObservationEventStoreRecommendation,
  ShadowObservationEventStoreStatus,
} from "./datasetTypes";

const EVENT_STORE_CONTRACT_KEY = "inventory_stockout_shadow_observation_event_store_v1" as const;
const EVENT_STORE_CONTRACT_VERSION = "v1" as const;
const OBSERVATION_EVENT_KEY = "inventory_stockout_shadow_observation_event_v1" as const;
const OBSERVATION_EVENT_VERSION = "v1" as const;
const REQUIRED_OBSERVATION_CONTRACT_KEY = "inventory_stockout_shadow_adapter_observation_log_contract_v1" as const;
const EVENT_STORE_SCOPE = "phase3h_shadow_observation_event_store_audit_only" as const;
const FEATURE_FLAG_KEY = "ml.inventoryStockout.shadowObservationEventStore.enabled" as const;
const OBSERVATION_EVENT_SCHEMA_VERSION = "shadow_observation_event_store_v1" as const;
const FALLBACK_STRATEGY = "rule_statistical_baseline_v1_only" as const;

const featureFlagDefault = false as const;
const observationEventStoreEnabled = false as const;
const runtimeInvocationAllowed = false as const;
const modelExecutionAllowed = false as const;
const inferenceEndpointExposed = false as const;
const productionIntegrationAllowed = false as const;
const decisionAutomationAllowed = false as const;
const canChangeInventoryOrAccounting = false as const;
const auditOnly = true as const;
const mutationAllowed = false as const;
const baselineOnlySourceOfTruth = true as const;

const forbiddenEventFieldKeys = [
  "predictedProbability",
  "predictedLabel",
  "predictionScore",
  "modelScore",
  "operationalRecommendation",
  "purchaseSuggestion",
  "priceSuggestion",
  "reorderQuantity",
  "customerMessage",
  "supplierMessage",
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
  const nestedObservation = options.observation && typeof options.observation === "object" && !Array.isArray(options.observation)
    ? options.observation as Record<string, unknown>
    : {};
  const payload = options.payload && typeof options.payload === "object" && !Array.isArray(options.payload)
    ? options.payload as Record<string, unknown>
    : {};
  const keys = forbiddenEventFieldKeys.filter((key) => hasOwn(options, key) || hasOwn(nestedObservation, key) || hasOwn(payload, key));
  return Array.from(new Set(keys));
};

const pickLatestImportId = async (): Promise<number | null> => {
  const imports = await listMlModelResultImports(1) as Array<Record<string, unknown>>;
  return asNumber(imports[0]?.id);
};

const buildContract = (): InventoryStockoutShadowObservationEventStoreContract => ({
  contractKey: EVENT_STORE_CONTRACT_KEY,
  contractVersion: EVENT_STORE_CONTRACT_VERSION,
  generatedAt: new Date().toISOString(),
  purpose: "Persist audit-only shadow observation event envelopes after the Phase 3G observation log contract without invoking model runtime or exposing scoring.",
  requiredObservationContractKey: REQUIRED_OBSERVATION_CONTRACT_KEY,
  eventStoreScope: EVENT_STORE_SCOPE,
  requiredAssertions: [
    "Phase 3G observation log contract is ready before a shadow observation event is stored.",
    "Shadow observation event store feature flag remains false by default.",
    "Stored observation events are audit-only envelopes and cannot include model scores.",
    "Runtime invocation remains false.",
    "Model execution remains false.",
    "No inference, scoring, prediction-serving, or runtime endpoint is exposed.",
    "Rule/statistical baseline remains the only source of truth.",
    "Inventory, accounting, pricing, reports, invoices, ledgers, purchasing, repairs, and communications are not mutated.",
  ],
  forbiddenBehavior: [
    "Do not execute a model artifact while recording an observation event.",
    "Do not load model binaries or call runtime workers.",
    "Do not accept predicted probability, predicted label, model score, purchase suggestion, price suggestion, or operational recommendation fields.",
    "Do not write shadow observation payloads into operational inventory, accounting, pricing, report, customer, partner, or messaging tables.",
    "Do not treat shadow observation events as production recommendations.",
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
  status: InventoryStockoutShadowObservationEventStoreGate["status"],
  value: unknown,
  message: string,
): InventoryStockoutShadowObservationEventStoreGate => ({ key, label, status, value, message });

const uniqueMessages = (
  gates: InventoryStockoutShadowObservationEventStoreGate[],
  status: InventoryStockoutShadowObservationEventStoreGate["status"],
): string[] => Array.from(new Set(gates.filter((gate) => gate.status === status).map((gate) => gate.message)));

const buildObservationEventSchema = (generatedAt: string) => ({
  schemaVersion: OBSERVATION_EVENT_SCHEMA_VERSION,
  generatedAt,
  mode: "audit_only_shadow_observation_event_store",
  allowedFields: [
    "observationEventId",
    "sourceRunId",
    "baselineReference",
    "observationContractId",
    "observedAt",
    "auditOnly",
    "mutationAllowed",
    "fallbackStrategy",
  ],
  forbiddenFields: [...forbiddenEventFieldKeys],
  requiredFlags: {
    auditOnly: true,
    mutationAllowed: false,
    runtimeInvocationAllowed: false,
    modelExecutionAllowed: false,
    baselineOnlySourceOfTruth: true,
  },
});

const buildNoOpObservationEventFixture = (generatedAt: string, sourceRunId: string | null, observationContractId: number | null) => ({
  fixtureKey: "shadow_observation_event_store_no_op_event_v1",
  generatedAt,
  observationEvent: {
    observationEventKey: OBSERVATION_EVENT_KEY,
    sourceRunId,
    observationContractId,
    baselineReference: FALLBACK_STRATEGY,
    observedAt: generatedAt,
    auditOnly: true,
    mutationAllowed: false,
    runtimeInvocationAllowed: false,
    modelExecutionAllowed: false,
    fallbackStrategy: FALLBACK_STRATEGY,
  },
  assertion: "This event-store fixture is an audit-only row and cannot carry a model score, label, purchase suggestion, price suggestion, or operational recommendation.",
});

const buildMutationGuardPolicy = () => ({
  mutationAllowed: false,
  protectedTableGroups: ["inventory", "accounting", "pricing", "reports", "communications", "customers", "partners"],
  guards: [
    { tableGroup: "inventory", mutationAllowed: false, message: "Shadow observation events cannot update products, stock rows, inventory logs, reorder decisions, or purchase suggestions." },
    { tableGroup: "accounting", mutationAllowed: false, message: "Shadow observation events cannot update ledgers, invoices, expenses, installments, partner balances, or customer balances." },
    { tableGroup: "pricing", mutationAllowed: false, message: "Shadow observation events cannot update costs, sale prices, discounts, margins, or profit calculations." },
    { tableGroup: "reports", mutationAllowed: false, message: "Shadow observation events cannot update official report totals or cached financial results." },
    { tableGroup: "communications", mutationAllowed: false, message: "Shadow observation events cannot send SMS, Telegram, email, customer reminders, or supplier messages." },
  ],
});

const buildRetentionPolicy = (generatedAt: string) => ({
  generatedAt,
  retentionClass: "shadow_observation_event_audit_store_only",
  containsOperationalDecision: false,
  containsModelScore: false,
  canBeUsedForCustomerOrSupplierCommunication: false,
  recommendedRetention: "keep with MLOps audit trail; do not treat as official inventory, pricing, accounting, or reporting record",
});

const buildAuditOnlyObservationPayload = (generatedAt: string, sourceRunId: string | null, observationContractId: number | null) => ({
  observationEventKey: OBSERVATION_EVENT_KEY,
  observationEventVersion: OBSERVATION_EVENT_VERSION,
  observationContractId,
  sourceRunId,
  baselineReference: FALLBACK_STRATEGY,
  observedAt: generatedAt,
  auditOnly: true,
  mutationAllowed: false,
  eventStoreEnabled: false,
  runtimeInvocationAllowed: false,
  modelExecutionAllowed: false,
  fallbackStrategy: FALLBACK_STRATEGY,
});

export const buildInventoryStockoutShadowObservationEventStoreContract = buildContract;

export const buildInventoryStockoutShadowObservationEventStore = async (
  importIdInput?: unknown,
  options: Record<string, unknown> = {},
): Promise<InventoryStockoutShadowObservationEventStoreResponse> => {
  const generatedAt = new Date().toISOString();
  const importId = asNumber(importIdInput) ?? asNumber(options.importId) ?? await pickLatestImportId();
  const modelImport = importId ? await getMlModelResultImportById(importId) as Record<string, unknown> | null : null;
  const previousObservationContracts = importId ? await listMlShadowAdapterObservationLogContractsByImportId(importId, 25) as Array<Record<string, unknown>> : [];
  const recentObservationEvents = importId ? await listMlShadowObservationEventsByImportId(importId, 25) as Array<Record<string, unknown>> : [];
  const latestObservationContract = previousObservationContracts[0] || null;
  const observationContractId = asNumber(latestObservationContract?.id);
  const observationContractStatus = normalizeText(latestObservationContract?.observationContractStatus);
  const observationContractReady = observationContractStatus === "observation_contract_ready";
  const sourceRunId = normalizeText(options.sourceRunId, normalizeText(options.sourceEventId));
  const modelKey = normalizeText(options.modelKey, normalizeText(latestObservationContract?.modelKey, normalizeText(modelImport?.modelKey)));
  const modelVersion = normalizeText(options.modelVersion, normalizeText(latestObservationContract?.modelVersion, normalizeText(modelImport?.modelVersion)));
  const forbiddenFieldKeys = extractForbiddenFieldKeys(options);

  const observationEventSchema = buildObservationEventSchema(generatedAt);
  const noOpObservationEventFixture = buildNoOpObservationEventFixture(generatedAt, sourceRunId, observationContractId);
  const mutationGuardPolicy = buildMutationGuardPolicy();
  const retentionPolicy = buildRetentionPolicy(generatedAt);
  const observationPayload = buildAuditOnlyObservationPayload(generatedAt, sourceRunId, observationContractId);

  const hasImport = Boolean(modelImport?.id);
  const referencesComplete = Boolean(importId && observationContractId && modelKey && modelVersion);
  const noForbiddenModelOutputFields = forbiddenFieldKeys.length === 0;

  const gates: InventoryStockoutShadowObservationEventStoreGate[] = [
    buildGate("model_import_exists", "Model import audit record", hasImport ? "pass" : "block", importId, hasImport ? "Model import record is traceable." : "Model import record is required before shadow observation events can be stored."),
    buildGate("observation_contract_exists", "Observation contract record", observationContractId ? "pass" : "block", observationContractId, observationContractId ? "Phase 3G observation contract is traceable." : "Phase 3G observation contract must be recorded before Phase 3H event-store rows."),
    buildGate("observation_contract_ready", "Observation contract ready", observationContractReady ? "pass" : "block", observationContractStatus, observationContractReady ? "Observation contract is ready for audit-only event-store rows." : "Observation contract must be observation_contract_ready first."),
    buildGate("feature_flag_default_off", "Feature flag default off", featureFlagDefault === false ? "pass" : "block", featureFlagDefault, "Shadow observation event store feature flag remains false by default."),
    buildGate("event_store_runtime_disabled", "Event-store runtime disabled", observationEventStoreEnabled === false ? "pass" : "block", observationEventStoreEnabled, "Event store persistence does not enable automatic runtime logging."),
    buildGate("runtime_invocation_disabled", "Runtime invocation disabled", runtimeInvocationAllowed === false ? "pass" : "block", runtimeInvocationAllowed, "No runtime invocation is allowed while storing shadow observation events."),
    buildGate("model_execution_disabled", "Model execution disabled", modelExecutionAllowed === false ? "pass" : "block", modelExecutionAllowed, "Model execution remains disabled."),
    buildGate("endpoint_hidden", "Inference endpoint hidden", inferenceEndpointExposed === false ? "pass" : "block", inferenceEndpointExposed, "No inference or scoring endpoint is exposed."),
    buildGate("no_forbidden_model_output_fields", "No model-output fields", noForbiddenModelOutputFields ? "pass" : "block", forbiddenFieldKeys, noForbiddenModelOutputFields ? "Observation event input contains no model score or operational recommendation fields." : "Rejected model-output or operational recommendation field keys are present in the observation event input."),
    buildGate("audit_only_envelope", "Audit-only envelope", auditOnly && mutationAllowed === false ? "pass" : "block", { auditOnly, mutationAllowed }, "Observation event payload is audit-only and mutation forbidden."),
    buildGate("baseline_only_source_of_truth", "Baseline source of truth", baselineOnlySourceOfTruth ? "pass" : "block", baselineOnlySourceOfTruth, "Rule/statistical baseline remains the only source of truth."),
    buildGate("references_complete", "References complete", referencesComplete ? "pass" : "warning", { importId, observationContractId, modelKey, modelVersion }, referencesComplete ? "Observation event references are complete." : "Import, observation contract, model key, and model version references should all be traceable."),
    buildGate("mutation_forbidden", "Operational mutations forbidden", canChangeInventoryOrAccounting === false ? "pass" : "block", canChangeInventoryOrAccounting, "Shadow observation events cannot mutate inventory, accounting, pricing, reports, communications, customers, or partners."),
  ];

  const blockerCount = gates.filter((gate) => gate.status === "block").length;
  const warningCount = gates.filter((gate) => gate.status === "warning").length;
  const passCount = gates.filter((gate) => gate.status === "pass").length;
  const totalGateCount = gates.length;
  const readinessScorePct = totalGateCount ? Math.round((passCount / totalGateCount) * 100) : 0;

  let eventStoreStatus: ShadowObservationEventStoreStatus = "not_started";
  let recommendation: ShadowObservationEventStoreRecommendation = "keep_shadow_observation_event_store_runtime_disabled";

  if (blockerCount === 0) {
    eventStoreStatus = "event_store_ready";
    recommendation = "record_audit_only_observation_event";
  } else if (!observationContractId || !observationContractReady) {
    eventStoreStatus = "needs_observation_contract";
    recommendation = "complete_observation_contract_first";
  } else {
    eventStoreStatus = "blocked";
  }

  const recommendedNextAction = eventStoreStatus === "event_store_ready"
    ? "Record audit-only shadow observation events only; keep runtime invocation, model execution, inference endpoints, and operational mutations disabled."
    : eventStoreStatus === "needs_observation_contract"
      ? "Record and pass the Phase 3G observation log contract before storing Phase 3H observation events."
      : "Resolve blockers without enabling model runtime or changing production business behavior.";

  const summary: InventoryStockoutShadowObservationEventStoreSummary = {
    generatedAt,
    importId,
    observationContractId,
    modelKey,
    modelVersion,
    eventStoreStatus,
    recommendation,
    readinessScorePct,
    featureFlagKey: FEATURE_FLAG_KEY,
    featureFlagDefault,
    eventStoreEnabled: observationEventStoreEnabled,
    runtimeInvocationAllowed,
    modelExecutionAllowed,
    inferenceEndpointExposed,
    productionIntegrationAllowed,
    decisionAutomationAllowed,
    canChangeInventoryOrAccounting,
    auditOnly,
    mutationAllowed,
    baselineOnlySourceOfTruth,
    observationEventSchemaVersion: OBSERVATION_EVENT_SCHEMA_VERSION,
    eventCount: recentObservationEvents.length,
    forbiddenFieldAttemptCount: forbiddenFieldKeys.length,
    blockerCount,
    warningCount,
    passCount,
    totalGateCount,
    blockers: uniqueMessages(gates, "block"),
    warnings: uniqueMessages(gates, "warning"),
    recommendedNextAction,
  };

  const auditExport = {
    generatedAt,
    phase: "Phase 3H — Shadow Observation Event Store",
    eventStoreContractKey: EVENT_STORE_CONTRACT_KEY,
    observationEventKey: OBSERVATION_EVENT_KEY,
    importId,
    observationContractId,
    eventStoreStatus,
    forbiddenFieldKeys,
    eventStoreEnabled: observationEventStoreEnabled,
    runtimeInvocationAllowed,
    modelExecutionAllowed,
    inferenceEndpointExposed,
    productionIntegrationAllowed,
    decisionAutomationAllowed,
    canChangeInventoryOrAccounting,
    baselineOnlySourceOfTruth,
  };

  return {
    success: true,
    contract: buildContract(),
    summary,
    gates,
    observationEventSchema,
    noOpObservationEventFixture,
    observationPayload,
    mutationGuardPolicy,
    retentionPolicy,
    auditExport,
    latestObservationContract,
    recentObservationEvents,
    eventRecord: null,
  };
};

export const recordInventoryStockoutShadowObservationEvent = async (payload: {
  importId?: unknown;
  userId?: number | null;
} & Record<string, unknown>): Promise<InventoryStockoutShadowObservationEventStoreResponse> => {
  const data = await buildInventoryStockoutShadowObservationEventStore(payload.importId, payload);

  if (data.summary.eventStoreStatus !== "event_store_ready") {
    return data;
  }

  const latestObservationContract = data.latestObservationContract || {};
  const eventRecord = await recordMlShadowObservationEvent({
    observationEventKey: OBSERVATION_EVENT_KEY,
    observationEventVersion: OBSERVATION_EVENT_VERSION,
    importId: data.summary.importId,
    observationContractId: data.summary.observationContractId,
    disabledHarnessId: asNumber(latestObservationContract.disabledHarnessId),
    fixtureRunId: asNumber(latestObservationContract.fixtureRunId),
    disabledShellId: asNumber(latestObservationContract.disabledShellId),
    adapterContractId: asNumber(latestObservationContract.adapterContractId),
    artifactMetadataId: asNumber(latestObservationContract.artifactMetadataId),
    safeBoundarySkeletonId: asNumber(latestObservationContract.safeBoundarySkeletonId),
    modelKey: data.summary.modelKey,
    modelVersion: data.summary.modelVersion,
    sourceRunId: normalizeText(payload.sourceRunId, normalizeText(payload.sourceEventId)),
    baselineReference: FALLBACK_STRATEGY,
    eventStoreStatus: "audit_event_recorded",
    featureFlagKey: FEATURE_FLAG_KEY,
    featureFlagDefault,
    eventStoreEnabled: observationEventStoreEnabled,
    runtimeInvocationAllowed,
    modelExecutionAllowed,
    inferenceEndpointExposed,
    productionIntegrationAllowed,
    decisionAutomationAllowed,
    inventoryAccountingChangeAllowed: canChangeInventoryOrAccounting,
    auditOnly,
    mutationAllowed,
    baselineOnlySourceOfTruth,
    forbiddenFieldAttemptCount: data.summary.forbiddenFieldAttemptCount,
    readinessScorePct: data.summary.readinessScorePct,
    blockerCount: data.summary.blockerCount,
    warningCount: data.summary.warningCount,
    passCount: data.summary.passCount,
    totalGateCount: data.summary.totalGateCount,
    observationPayload: data.observationPayload,
    safetyAssertions: data.observationEventSchema,
    mutationGuardPolicy: data.mutationGuardPolicy,
    retentionPolicy: data.retentionPolicy,
    forbiddenFieldKeys: [],
    auditExport: data.auditExport,
    summary: data.summary,
    policy: data.contract.operationalPolicy,
    userId: payload.userId || null,
  });

  const recentObservationEvents = await listMlShadowObservationEventsByImportId(data.summary.importId, 25) as Array<Record<string, unknown>>;

  return {
    ...data,
    summary: {
      ...data.summary,
      eventCount: recentObservationEvents.length,
    },
    recentObservationEvents,
    eventRecord: eventRecord as Record<string, unknown>,
  };
};

export const listInventoryStockoutShadowObservationEvents = async (importIdInput: unknown) => {
  return listMlShadowObservationEventsByImportId(importIdInput, 50) as Promise<Array<Record<string, unknown>>>;
};

export const buildMlShadowObservationEventStoreCatalogSummary = async (): Promise<MlShadowObservationEventStoreCatalogSummary> => {
  const importId = await pickLatestImportId();
  const current = await buildInventoryStockoutShadowObservationEventStore(importId);
  const lastShadowObservationEvents = await listMlShadowObservationEvents(25) as Array<Record<string, unknown>>;
  const lastShadowAdapterObservationLogContracts = await listMlShadowAdapterObservationLogContracts(25) as Array<Record<string, unknown>>;
  return {
    generatedAt: new Date().toISOString(),
    contract: buildContract(),
    currentShadowObservationEventStore: current.summary,
    lastShadowObservationEvents,
    lastShadowAdapterObservationLogContracts,
    recommendedNextAction: current.summary.recommendedNextAction,
  };
};
