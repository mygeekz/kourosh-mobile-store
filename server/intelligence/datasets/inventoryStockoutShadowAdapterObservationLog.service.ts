import {
  getMlModelResultImportById,
  listMlDisabledShadowRuntimeHarnesses,
  listMlDisabledShadowRuntimeHarnessesByImportId,
  listMlModelResultImports,
  listMlShadowAdapterObservationLogContracts,
  listMlShadowAdapterObservationLogContractsByImportId,
  recordMlShadowAdapterObservationLogContract,
} from "../../db/domains/mlDatasets.db";
import type {
  InventoryStockoutShadowAdapterObservationLogContract,
  InventoryStockoutShadowAdapterObservationLogGate,
  InventoryStockoutShadowAdapterObservationLogResponse,
  InventoryStockoutShadowAdapterObservationLogSummary,
  MlShadowAdapterObservationLogCatalogSummary,
  ShadowAdapterObservationLogContractRecommendation,
  ShadowAdapterObservationLogContractStatus,
} from "./datasetTypes";

const CONTRACT_KEY = "inventory_stockout_shadow_adapter_observation_log_contract_v1" as const;
const CONTRACT_VERSION = "v1" as const;
const REQUIRED_HARNESS_KEY = "inventory_stockout_disabled_shadow_runtime_harness_v1" as const;
const OBSERVATION_SCOPE = "phase3g_shadow_adapter_observation_log_contract_no_op_audit_only" as const;
const FEATURE_FLAG_KEY = "ml.inventoryStockout.shadowObservationLog.enabled" as const;
const OBSERVATION_SCHEMA_VERSION = "shadow_observation_event_v1" as const;
const FALLBACK_STRATEGY = "rule_statistical_baseline_v1_only" as const;

const featureFlagDefault = false as const;
const observationLoggingEnabled = false as const;
const runtimeInvocationAllowed = false as const;
const modelExecutionAllowed = false as const;
const inferenceEndpointExposed = false as const;
const productionIntegrationAllowed = false as const;
const decisionAutomationAllowed = false as const;
const canChangeInventoryOrAccounting = false as const;
const noOpObservationOnly = true as const;
const baselineOnlySourceOfTruth = true as const;

const asNumber = (value: unknown): number | null => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
};

const normalizeText = (value: unknown, fallback: string | null = null): string | null => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : fallback;
};

const buildContract = (): InventoryStockoutShadowAdapterObservationLogContract => ({
  contractKey: CONTRACT_KEY,
  contractVersion: CONTRACT_VERSION,
  generatedAt: new Date().toISOString(),
  purpose: "Define audit-only observation log contract for future shadow adapter observations without invoking any model or exposing scoring.",
  requiredHarnessKey: REQUIRED_HARNESS_KEY,
  observationScope: OBSERVATION_SCOPE,
  requiredAssertions: [
    "Phase 3F disabled harness is harness_ready before observation contract is recorded.",
    "Observation feature flag remains false by default.",
    "Observation logging remains disabled until a later explicitly approved phase.",
    "Runtime invocation remains false.",
    "Model execution remains false.",
    "No scoring or inference endpoint is exposed.",
    "Observation events are no-op audit envelopes only.",
    "Rule/statistical baseline remains the only source of truth.",
    "Inventory, accounting, pricing, reports, invoices, ledgers, repairs, purchasing, and communications are not mutated.",
  ],
  forbiddenBehavior: [
    "Do not execute a model artifact.",
    "Do not load model binaries.",
    "Do not call model workers, runtime workers, shell command runners, process runners, or external scoring services.",
    "Do not expose scoring, inference, prediction-serving, or runtime invocation endpoints.",
    "Do not write candidate model outputs into operational business tables.",
    "Do not use observation logs as production recommendations.",
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
  status: InventoryStockoutShadowAdapterObservationLogGate["status"],
  value: unknown,
  message: string,
): InventoryStockoutShadowAdapterObservationLogGate => ({ key, label, status, value, message });

const uniqueMessages = (
  gates: InventoryStockoutShadowAdapterObservationLogGate[],
  status: InventoryStockoutShadowAdapterObservationLogGate["status"],
): string[] => Array.from(new Set(gates.filter((gate) => gate.status === status).map((gate) => gate.message)));

const pickLatestImportId = async (): Promise<number | null> => {
  const imports = await listMlModelResultImports(1) as Array<Record<string, unknown>>;
  return asNumber(imports[0]?.id);
};

const buildObservationEventSchema = (generatedAt: string) => ({
  schemaVersion: OBSERVATION_SCHEMA_VERSION,
  generatedAt,
  mode: "no_op_shadow_observation_audit_envelope_only",
  allowedFields: [
    "observationId",
    "sourceRunId",
    "baselineReference",
    "adapterContractKey",
    "observedAt",
    "auditOnly",
    "mutationAllowed",
    "fallbackStrategy",
  ],
  forbiddenFields: ["predictedProbability", "predictedLabel", "operationalRecommendation", "purchaseSuggestion", "priceSuggestion"],
  requiredFlags: {
    auditOnly: true,
    mutationAllowed: false,
    modelExecutionAllowed: false,
    baselineOnlySourceOfTruth: true,
  },
});

const buildNoOpObservationFixture = (generatedAt: string) => ({
  fixtureKey: "shadow_observation_no_op_envelope_v1",
  generatedAt,
  observation: {
    observationId: "noop-observation-example",
    baselineReference: FALLBACK_STRATEGY,
    observedAt: generatedAt,
    auditOnly: true,
    mutationAllowed: false,
    modelExecutionAllowed: false,
    predictedProbability: null,
    predictedLabel: null,
    operationalRecommendation: null,
    fallbackStrategy: FALLBACK_STRATEGY,
  },
  assertion: "This no-op observation envelope cannot carry a model score or operational recommendation.",
});

const buildMutationGuardPolicy = () => ({
  mutationAllowed: false,
  protectedTableGroups: ["inventory", "accounting", "pricing", "reports", "communications", "customers", "partners"],
  guards: [
    { tableGroup: "inventory", mutationAllowed: false, message: "Observation logs cannot update products, stock rows, inventory logs, reorder decisions, or purchase suggestions." },
    { tableGroup: "accounting", mutationAllowed: false, message: "Observation logs cannot update ledgers, invoices, expenses, installments, or financial truth." },
    { tableGroup: "pricing", mutationAllowed: false, message: "Observation logs cannot update costs, sale prices, discounts, margins, or profit calculations." },
    { tableGroup: "reports", mutationAllowed: false, message: "Observation logs cannot update official report totals or cached financial results." },
    { tableGroup: "communications", mutationAllowed: false, message: "Observation logs cannot send SMS, Telegram, email, customer reminders, or supplier messages." },
  ],
});

export const buildInventoryStockoutShadowAdapterObservationLogContract = buildContract;

export const buildInventoryStockoutShadowAdapterObservationLog = async (
  importIdInput?: unknown,
  options: Record<string, unknown> = {},
): Promise<InventoryStockoutShadowAdapterObservationLogResponse> => {
  const generatedAt = new Date().toISOString();
  const importId = asNumber(importIdInput) ?? asNumber(options.importId) ?? await pickLatestImportId();
  const modelImport = importId ? await getMlModelResultImportById(importId) as Record<string, unknown> | null : null;
  const harnessRuns = importId ? await listMlDisabledShadowRuntimeHarnessesByImportId(importId, 25) as Array<Record<string, unknown>> : [];
  const latestHarness = harnessRuns[0] || null;
  const previousObservationContracts = importId ? await listMlShadowAdapterObservationLogContractsByImportId(importId, 25) as Array<Record<string, unknown>> : [];

  const harnessStatus = normalizeText(latestHarness?.harnessStatus);
  const modelKey = normalizeText(options.modelKey, normalizeText(latestHarness?.modelKey, normalizeText(modelImport?.modelKey)));
  const modelVersion = normalizeText(options.modelVersion, normalizeText(latestHarness?.modelVersion, normalizeText(modelImport?.modelVersion)));
  const hasImport = Boolean(modelImport?.id);
  const harnessReady = harnessStatus === "harness_ready";
  const harnessFeatureFlagOff = Number(latestHarness?.featureFlagDefault) === 0 || latestHarness?.featureFlagDefault === false;
  const harnessRuntimeDisabled = Number(latestHarness?.runtimeInvocationAllowed) === 0 || latestHarness?.runtimeInvocationAllowed === false;
  const harnessModelExecutionDisabled = Number(latestHarness?.modelExecutionAllowed) === 0 || latestHarness?.modelExecutionAllowed === false;
  const harnessEndpointHidden = Number(latestHarness?.inferenceEndpointExposed) === 0 || latestHarness?.inferenceEndpointExposed === false;
  const harnessNoOpOnly = Number(latestHarness?.noOpHarnessOnly) === 1 || latestHarness?.noOpHarnessOnly === true;
  const harnessBaselineOnly = Number(latestHarness?.baselineOnlySourceOfTruth) === 1 || latestHarness?.baselineOnlySourceOfTruth === true;
  const referencesComplete = Boolean(importId && latestHarness?.id && modelKey && modelVersion);

  const observationEventSchema = buildObservationEventSchema(generatedAt);
  const noOpObservationFixture = buildNoOpObservationFixture(generatedAt);
  const mutationGuardPolicy = buildMutationGuardPolicy();
  const retentionPolicy = {
    generatedAt,
    retentionClass: "audit_contract_only",
    containsOperationalDecision: false,
    containsModelScore: false,
    canBeUsedForCustomerOrSupplierCommunication: false,
    recommendedRetention: "keep with MLOps audit trail; do not treat as official inventory or financial record",
  };

  const gates: InventoryStockoutShadowAdapterObservationLogGate[] = [
    buildGate("model_import_exists", "Model import audit record", hasImport ? "pass" : "block", importId, hasImport ? "Model import record is traceable." : "Model import record is required before observation contract."),
    buildGate("disabled_harness_ready", "Disabled runtime harness ready", harnessReady ? "pass" : "block", harnessStatus, harnessReady ? "Phase 3F harness is ready." : "Phase 3F disabled runtime harness must be harness_ready first."),
    buildGate("feature_flag_default_off", "Feature flag default off", featureFlagDefault === false && harnessFeatureFlagOff ? "pass" : "block", { observationFeatureFlagDefault: featureFlagDefault, harnessFeatureFlagOff }, "Observation logging feature flag remains false by default."),
    buildGate("observation_logging_disabled", "Observation logging disabled", observationLoggingEnabled === false ? "pass" : "block", observationLoggingEnabled, "Observation logging remains disabled in Phase 3G."),
    buildGate("runtime_disabled", "Runtime invocation disabled", runtimeInvocationAllowed === false && harnessRuntimeDisabled ? "pass" : "block", { runtimeInvocationAllowed, harnessRuntimeDisabled }, "Runtime invocation remains disabled."),
    buildGate("model_execution_disabled", "Model execution disabled", modelExecutionAllowed === false && harnessModelExecutionDisabled ? "pass" : "block", { modelExecutionAllowed, harnessModelExecutionDisabled }, "Model execution remains disabled."),
    buildGate("endpoint_hidden", "No scoring endpoint exposed", inferenceEndpointExposed === false && harnessEndpointHidden ? "pass" : "block", { inferenceEndpointExposed, harnessEndpointHidden }, "No scoring or inference endpoint is exposed."),
    buildGate("no_op_observation_only", "No-op observation only", noOpObservationOnly && harnessNoOpOnly ? "pass" : "block", { noOpObservationOnly, harnessNoOpOnly }, "Observation event schema is audit-only and no-op."),
    buildGate("baseline_source_of_truth", "Baseline source of truth", baselineOnlySourceOfTruth && harnessBaselineOnly ? "pass" : "block", { baselineOnlySourceOfTruth, harnessBaselineOnly }, "Rule/statistical baseline remains the only source of truth."),
    buildGate("references_complete", "References complete", referencesComplete ? "pass" : "block", { importId, harnessId: latestHarness?.id, modelKey, modelVersion }, referencesComplete ? "Observation contract references are complete." : "Import, harness, model key, and model version references are required."),
    buildGate("mutation_forbidden", "Operational mutations forbidden", canChangeInventoryOrAccounting === false ? "pass" : "block", canChangeInventoryOrAccounting, "Observation logs cannot mutate inventory, accounting, pricing, reports, or communications."),
  ];

  const blockers = uniqueMessages(gates, "block");
  const warnings = uniqueMessages(gates, "warning");
  const passCount = gates.filter((gate) => gate.status === "pass").length;
  const totalGateCount = gates.length;
  const readinessScorePct = Math.round((passCount / Math.max(totalGateCount, 1)) * 10000) / 100;

  let observationContractStatus: ShadowAdapterObservationLogContractStatus = "not_started";
  let recommendation: ShadowAdapterObservationLogContractRecommendation = "keep_shadow_observation_logging_disabled";
  if (!harnessReady) {
    observationContractStatus = "needs_disabled_runtime_harness";
    recommendation = "complete_disabled_runtime_harness_first";
  } else if (blockers.length > 0) {
    observationContractStatus = "blocked";
    recommendation = "keep_shadow_observation_logging_disabled";
  } else {
    observationContractStatus = "observation_contract_ready";
    recommendation = "record_observation_contract_only";
  }

  const recommendedNextAction = observationContractStatus === "observation_contract_ready"
    ? "Observation log contract is ready as an audit-only envelope. Keep feature flag off; do not execute model runtime."
    : blockers[0] || warnings[0] || "Complete disabled runtime harness before recording observation contract.";

  const summary: InventoryStockoutShadowAdapterObservationLogSummary = {
    generatedAt,
    importId,
    modelKey,
    modelVersion,
    observationContractStatus,
    recommendation,
    readinessScorePct,
    featureFlagKey: FEATURE_FLAG_KEY,
    featureFlagDefault,
    observationLoggingEnabled,
    runtimeInvocationAllowed,
    modelExecutionAllowed,
    inferenceEndpointExposed,
    productionIntegrationAllowed,
    noOpObservationOnly,
    baselineOnlySourceOfTruth,
    observationSchemaVersion: OBSERVATION_SCHEMA_VERSION,
    blockerCount: blockers.length,
    warningCount: warnings.length,
    blockers,
    warnings,
    recommendedNextAction,
  };

  const auditExport = {
    generatedAt,
    phase: "Phase 3G",
    contractKey: CONTRACT_KEY,
    importId,
    disabledHarnessId: asNumber(latestHarness?.id),
    observationContractStatus,
    policy: {
      productionIntegrationAllowed,
      inferenceRuntimeEnabled: runtimeInvocationAllowed,
      decisionAutomationAllowed,
      canChangeInventoryOrAccounting,
      modelExecutionAllowed,
      inferenceEndpointExposed,
    },
  };

  return {
    success: true,
    contract: buildContract(),
    summary,
    gates,
    observationEventSchema,
    noOpObservationFixture,
    mutationGuardPolicy,
    retentionPolicy,
    auditExport,
    recentObservationContracts: previousObservationContracts,
  };
};

export const recordInventoryStockoutShadowAdapterObservationLog = async (payload: {
  importId?: unknown;
  userId?: number | null;
} & Record<string, unknown>): Promise<InventoryStockoutShadowAdapterObservationLogResponse> => {
  const data = await buildInventoryStockoutShadowAdapterObservationLog(payload.importId, payload);
  const latestHarness = (await listMlDisabledShadowRuntimeHarnessesByImportId(data.summary.importId, 1) as Array<Record<string, unknown>>)[0] || null;
  await recordMlShadowAdapterObservationLogContract({
    observationContractKey: CONTRACT_KEY,
    observationContractVersion: CONTRACT_VERSION,
    importId: data.summary.importId,
    disabledHarnessId: asNumber(latestHarness?.id),
    fixtureRunId: asNumber(latestHarness?.fixtureRunId),
    disabledShellId: asNumber(latestHarness?.disabledShellId),
    adapterContractId: asNumber(latestHarness?.adapterContractId),
    artifactMetadataId: asNumber(latestHarness?.artifactMetadataId),
    safeBoundarySkeletonId: asNumber(latestHarness?.safeBoundarySkeletonId),
    modelKey: data.summary.modelKey,
    modelVersion: data.summary.modelVersion,
    harnessStatus: normalizeText(latestHarness?.harnessStatus),
    observationContractStatus: data.summary.observationContractStatus,
    featureFlagKey: FEATURE_FLAG_KEY,
    featureFlagDefault,
    observationLoggingEnabled,
    runtimeInvocationAllowed,
    modelExecutionAllowed,
    inferenceEndpointExposed,
    productionIntegrationAllowed,
    decisionAutomationAllowed,
    inventoryAccountingChangeAllowed: canChangeInventoryOrAccounting,
    noOpObservationOnly,
    baselineOnlySourceOfTruth,
    observationEventSchema: data.observationEventSchema,
    noOpObservationFixture: data.noOpObservationFixture,
    mutationGuardPolicy: data.mutationGuardPolicy,
    retentionPolicy: data.retentionPolicy,
    auditExport: data.auditExport,
    readinessScorePct: data.summary.readinessScorePct,
    blockerCount: data.summary.blockerCount,
    warningCount: data.summary.warningCount,
    passCount: data.gates.filter((gate) => gate.status === "pass").length,
    totalGateCount: data.gates.length,
    summary: data.summary,
    policy: data.contract.operationalPolicy,
    userId: payload.userId || null,
  });
  return buildInventoryStockoutShadowAdapterObservationLog(payload.importId, payload);
};

export const listInventoryStockoutShadowAdapterObservationLogContracts = async (importIdInput: unknown) => {
  return listMlShadowAdapterObservationLogContractsByImportId(importIdInput, 50) as Promise<Array<Record<string, unknown>>>;
};

export const buildMlShadowAdapterObservationLogCatalogSummary = async (): Promise<MlShadowAdapterObservationLogCatalogSummary> => {
  const importId = await pickLatestImportId();
  const current = await buildInventoryStockoutShadowAdapterObservationLog(importId);
  const lastShadowAdapterObservationLogContracts = await listMlShadowAdapterObservationLogContracts(25) as Array<Record<string, unknown>>;
  return {
    contract: current.contract,
    currentShadowAdapterObservationLogContract: current.summary,
    lastShadowAdapterObservationLogContracts,
    recommendedNextAction: current.summary.recommendedNextAction,
  };
};
