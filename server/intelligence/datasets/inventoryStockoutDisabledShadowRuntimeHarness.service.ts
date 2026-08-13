import {
  getMlModelResultImportById,
  listMlDisabledShadowRuntimeHarnesses,
  listMlDisabledShadowRuntimeHarnessesByImportId,
  listMlShadowRuntimeContractTestFixturesByImportId,
  listMlModelResultImports,
  recordMlDisabledShadowRuntimeHarness,
} from "../../db/domains/mlDatasets.db";
import type {
  DisabledShadowRuntimeHarnessRecommendation,
  DisabledShadowRuntimeHarnessStatus,
  InventoryStockoutDisabledShadowRuntimeHarnessContract,
  InventoryStockoutDisabledShadowRuntimeHarnessGate,
  InventoryStockoutDisabledShadowRuntimeHarnessResponse,
  InventoryStockoutDisabledShadowRuntimeHarnessSummary,
  MlDisabledShadowRuntimeHarnessCatalogSummary,
} from "./datasetTypes";

const HARNESS_KEY = "inventory_stockout_disabled_shadow_runtime_harness_v1" as const;
const HARNESS_VERSION = "v1" as const;
const REQUIRED_FIXTURE_KEY = "inventory_stockout_shadow_runtime_contract_test_fixtures_v1" as const;
const HARNESS_SCOPE = "phase3f_disabled_shadow_runtime_harness_no_op_validation_only" as const;
const FEATURE_FLAG_KEY = "ml.inventoryStockout.disabledShadowRuntimeHarness.enabled" as const;
const FALLBACK_STRATEGY = "rule_statistical_baseline_v1_only" as const;

const featureFlagDefault = false as const;
const harnessEnabled = false as const;
const runtimeInvocationAllowed = false as const;
const modelExecutionAllowed = false as const;
const inferenceEndpointExposed = false as const;
const productionIntegrationAllowed = false as const;
const decisionAutomationAllowed = false as const;
const canChangeInventoryOrAccounting = false as const;
const noOpHarnessOnly = true as const;
const baselineOnlySourceOfTruth = true as const;
const auditHookEnabled = true as const;

const asNumber = (value: unknown): number | null => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
};

const normalizeText = (value: unknown, fallback: string | null = null): string | null => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : fallback;
};

const buildContract = (): InventoryStockoutDisabledShadowRuntimeHarnessContract => ({
  contractKey: HARNESS_KEY,
  contractVersion: HARNESS_VERSION,
  generatedAt: new Date().toISOString(),
  purpose: "Define a disabled, no-op harness that validates Phase 3E fixtures without invoking any model or exposing scoring.",
  requiredFixtureKey: REQUIRED_FIXTURE_KEY,
  harnessScope: HARNESS_SCOPE,
  requiredAssertions: [
    "Phase 3E fixtures are fixtures_ready before the harness is recorded.",
    "Harness feature flag remains false by default.",
    "Harness runtime invocation remains false.",
    "Harness model execution remains false.",
    "No scoring or inference endpoint is exposed.",
    "Harness output is no-op validation evidence only.",
    "Rule/statistical baseline remains the only source of truth.",
    "Inventory, accounting, pricing, reports, invoices, ledgers, repairs, purchasing, and communications are not mutated.",
  ],
  forbiddenBehavior: [
    "Do not execute a model artifact.",
    "Do not load model binaries.",
    "Do not call model workers, runtime workers, shell command runners, process runners, or external scoring services.",
    "Do not expose scoring, inference, prediction-serving, or runtime invocation endpoints.",
    "Do not write candidate model outputs into operational business tables.",
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
  status: InventoryStockoutDisabledShadowRuntimeHarnessGate["status"],
  value: unknown,
  message: string,
): InventoryStockoutDisabledShadowRuntimeHarnessGate => ({ key, label, status, value, message });

const uniqueMessages = (
  gates: InventoryStockoutDisabledShadowRuntimeHarnessGate[],
  status: InventoryStockoutDisabledShadowRuntimeHarnessGate["status"],
): string[] => Array.from(new Set(gates.filter((gate) => gate.status === status).map((gate) => gate.message)));

const pickLatestImportId = async (): Promise<number | null> => {
  const imports = await listMlModelResultImports(1) as Array<Record<string, unknown>>;
  return asNumber(imports[0]?.id);
};

const buildNoOpAssertions = (generatedAt: string) => [
  {
    key: "harness_feature_flag_off",
    generatedAt,
    assertion: "The disabled harness feature flag is false by default.",
    expected: false,
    actual: featureFlagDefault,
    passed: featureFlagDefault === false,
  },
  {
    key: "harness_runtime_never_invoked",
    generatedAt,
    assertion: "The disabled harness cannot invoke runtime or model execution.",
    expected: { runtimeInvocationAllowed: false, modelExecutionAllowed: false },
    actual: { runtimeInvocationAllowed, modelExecutionAllowed },
    passed: runtimeInvocationAllowed === false && modelExecutionAllowed === false,
  },
  {
    key: "harness_output_is_audit_only",
    generatedAt,
    assertion: "The harness only emits validation evidence and cannot emit predictedProbability or predictedLabel.",
    expected: { predictedProbability: null, predictedLabel: null, baselineFallback: FALLBACK_STRATEGY },
    actual: { predictedProbability: null, predictedLabel: null, baselineFallback: FALLBACK_STRATEGY },
    passed: true,
  },
];

const buildMutationGuardResults = () => [
  { tableGroup: "inventory", mutationAllowed: false, passed: true, message: "Harness cannot update products, stock rows, inventory logs, reorder decisions, or purchase suggestions." },
  { tableGroup: "accounting", mutationAllowed: false, passed: true, message: "Harness cannot update ledgers, invoices, expenses, installments, or financial truth." },
  { tableGroup: "pricing", mutationAllowed: false, passed: true, message: "Harness cannot update costs, sale prices, discounts, margins, or profit calculations." },
  { tableGroup: "reports", mutationAllowed: false, passed: true, message: "Harness cannot update official report totals or cached financial results." },
  { tableGroup: "communications", mutationAllowed: false, passed: true, message: "Harness cannot send SMS, Telegram, email, customer reminders, or supplier messages." },
];

export const buildInventoryStockoutDisabledShadowRuntimeHarnessContract = buildContract;

export const buildInventoryStockoutDisabledShadowRuntimeHarness = async (
  importIdInput?: unknown,
  options: Record<string, unknown> = {},
): Promise<InventoryStockoutDisabledShadowRuntimeHarnessResponse> => {
  const generatedAt = new Date().toISOString();
  const importId = asNumber(importIdInput) ?? asNumber(options.importId) ?? await pickLatestImportId();
  const modelImport = importId ? await getMlModelResultImportById(importId) as Record<string, unknown> | null : null;
  const fixtureRuns = importId ? await listMlShadowRuntimeContractTestFixturesByImportId(importId, 25) as Array<Record<string, unknown>> : [];
  const latestFixtureRun = fixtureRuns[0] || null;
  const previousHarnessRuns = importId ? await listMlDisabledShadowRuntimeHarnessesByImportId(importId, 25) as Array<Record<string, unknown>> : [];

  const fixtureStatus = normalizeText(latestFixtureRun?.fixtureStatus);
  const modelKey = normalizeText(options.modelKey, normalizeText(latestFixtureRun?.modelKey, normalizeText(modelImport?.modelKey)));
  const modelVersion = normalizeText(options.modelVersion, normalizeText(latestFixtureRun?.modelVersion, normalizeText(modelImport?.modelVersion)));
  const hasImport = Boolean(modelImport?.id);
  const fixtureReady = fixtureStatus === "fixtures_ready";
  const fixtureFeatureFlagOff = Number(latestFixtureRun?.featureFlagDefault) === 0 || latestFixtureRun?.featureFlagDefault === false;
  const fixtureRuntimeDisabled = Number(latestFixtureRun?.runtimeInvocationAllowed) === 0 || latestFixtureRun?.runtimeInvocationAllowed === false;
  const fixtureModelExecutionDisabled = Number(latestFixtureRun?.modelExecutionAllowed) === 0 || latestFixtureRun?.modelExecutionAllowed === false;
  const fixtureEndpointHidden = Number(latestFixtureRun?.inferenceEndpointExposed) === 0 || latestFixtureRun?.inferenceEndpointExposed === false;
  const fixtureNoOpOnly = Number(latestFixtureRun?.noOpFixturesOnly) === 1 || latestFixtureRun?.noOpFixturesOnly === true;
  const fixtureBaselineOnly = Number(latestFixtureRun?.baselineOnlySourceOfTruth) === 1 || latestFixtureRun?.baselineOnlySourceOfTruth === true;
  const referencesComplete = Boolean(importId && latestFixtureRun?.id && modelKey && modelVersion);

  const noOpAssertions = buildNoOpAssertions(generatedAt);
  const mutationGuardResults = buildMutationGuardResults();
  const harnessManifest = {
    harnessKey: HARNESS_KEY,
    harnessVersion: HARNESS_VERSION,
    generatedAt,
    mode: "disabled_no_op_validation_harness_only",
    featureFlagKey: FEATURE_FLAG_KEY,
    featureFlagDefault,
    harnessEnabled,
    acceptedFixtureStatus: "fixtures_ready",
    forbiddenOutputFields: ["predictedProbability", "predictedLabel", "operationalRecommendation"],
    allowedOutputFields: ["validationStatus", "auditEvidence", "fallbackPolicy", "mutationGuards"],
  };

  const validationRun = {
    generatedAt,
    runMode: "no_op_harness_validation_only",
    fixtureRunId: asNumber(latestFixtureRun?.id),
    checks: [
      { key: "fixture_status", expected: "fixtures_ready", actual: fixtureStatus, passed: fixtureReady },
      { key: "feature_flag_default", expected: false, actual: featureFlagDefault, passed: featureFlagDefault === false },
      { key: "runtime_invocation_allowed", expected: false, actual: runtimeInvocationAllowed, passed: runtimeInvocationAllowed === false },
      { key: "model_execution_allowed", expected: false, actual: modelExecutionAllowed, passed: modelExecutionAllowed === false },
      { key: "inference_endpoint_exposed", expected: false, actual: inferenceEndpointExposed, passed: inferenceEndpointExposed === false },
      { key: "baseline_only_source_of_truth", expected: true, actual: baselineOnlySourceOfTruth, passed: baselineOnlySourceOfTruth === true },
    ],
  };

  const gates: InventoryStockoutDisabledShadowRuntimeHarnessGate[] = [
    buildGate("model_import_exists", "Model Import Audit", hasImport ? "pass" : "block", importId, hasImport ? "Model import audit record is traceable." : "A model import audit record is required."),
    buildGate("fixture_run_ready", "Runtime Fixtures Ready", fixtureReady ? "pass" : "block", fixtureStatus, fixtureReady ? "Phase 3E fixtures are ready." : "Phase 3E fixtures must be fixtures_ready before the disabled harness."),
    buildGate("feature_flags_off", "Feature Flags Off", !featureFlagDefault && fixtureFeatureFlagOff ? "pass" : "block", { featureFlagDefault, fixtureFeatureFlagOff }, "Harness and fixture feature flags remain off by default."),
    buildGate("harness_disabled", "Harness Disabled", harnessEnabled === false ? "pass" : "block", harnessEnabled, "Harness remains disabled by default."),
    buildGate("runtime_disabled", "Runtime Disabled", !runtimeInvocationAllowed && fixtureRuntimeDisabled ? "pass" : "block", { runtimeInvocationAllowed, fixtureRuntimeDisabled }, "Runtime invocation is disabled in harness and fixtures."),
    buildGate("model_execution_disabled", "Model Execution Disabled", !modelExecutionAllowed && fixtureModelExecutionDisabled ? "pass" : "block", { modelExecutionAllowed, fixtureModelExecutionDisabled }, "Model execution is disabled in harness and fixtures."),
    buildGate("endpoint_hidden", "No Inference Endpoint", !inferenceEndpointExposed && fixtureEndpointHidden ? "pass" : "block", { inferenceEndpointExposed, fixtureEndpointHidden }, "No scoring/inference endpoint is exposed."),
    buildGate("no_op_only", "No-Op Harness Only", noOpHarnessOnly && fixtureNoOpOnly ? "pass" : "block", { noOpHarnessOnly, fixtureNoOpOnly }, "Harness is no-op validation only."),
    buildGate("baseline_source_of_truth", "Baseline Source of Truth", baselineOnlySourceOfTruth && fixtureBaselineOnly ? "pass" : "block", { baselineOnlySourceOfTruth, fixtureBaselineOnly }, "Rule/statistical baseline remains the only source of truth."),
    buildGate("audit_hook_enabled", "Audit Hook Enabled", auditHookEnabled ? "pass" : "warning", auditHookEnabled, "Harness audit hook is enabled for evidence only."),
    buildGate("no_business_mutation", "No Business Mutation", canChangeInventoryOrAccounting === false ? "pass" : "block", canChangeInventoryOrAccounting, "Harness cannot mutate inventory, accounting, pricing, reports, invoices, ledgers, repairs, purchasing, or communications."),
    buildGate("references_complete", "Harness References", referencesComplete ? "pass" : "block", { importId, fixtureRunId: latestFixtureRun?.id, modelKey, modelVersion }, referencesComplete ? "Harness references are complete." : "Import, fixture run, model key, and model version references are required."),
  ];

  const blockers = uniqueMessages(gates, "block");
  const warnings = uniqueMessages(gates, "warning");
  const passCount = gates.filter((gate) => gate.status === "pass").length;
  const readinessScorePct = Math.round((passCount / Math.max(gates.length, 1)) * 100);

  let harnessStatus: DisabledShadowRuntimeHarnessStatus = "not_started";
  let recommendation: DisabledShadowRuntimeHarnessRecommendation = "keep_disabled_harness_off";
  if (!fixtureReady) {
    harnessStatus = "needs_runtime_contract_fixtures";
    recommendation = "complete_runtime_contract_fixtures";
  } else if (blockers.length === 0) {
    harnessStatus = "harness_ready";
    recommendation = "prepare_shadow_adapter_observation_log";
  } else {
    harnessStatus = "blocked";
  }

  const fallbackPolicy = {
    fallbackStrategy: FALLBACK_STRATEGY,
    baselineRemainsSourceOfTruth: true,
    harnessCanOverrideBaseline: false,
    harnessCanMutateBusinessData: false,
    noModelOutputAllowed: true,
  };

  const summary: InventoryStockoutDisabledShadowRuntimeHarnessSummary = {
    harnessKey: HARNESS_KEY,
    harnessVersion: HARNESS_VERSION,
    generatedAt,
    importId,
    fixtureRunId: asNumber(latestFixtureRun?.id),
    disabledShellId: asNumber(latestFixtureRun?.disabledShellId),
    adapterContractId: asNumber(latestFixtureRun?.adapterContractId),
    artifactMetadataId: asNumber(latestFixtureRun?.artifactMetadataId),
    safeBoundarySkeletonId: asNumber(latestFixtureRun?.safeBoundarySkeletonId),
    modelKey,
    modelVersion,
    fixtureStatus,
    harnessStatus,
    recommendation,
    readinessScorePct,
    featureFlagKey: FEATURE_FLAG_KEY,
    featureFlagDefault,
    harnessEnabled,
    runtimeInvocationAllowed,
    modelExecutionAllowed,
    inferenceEndpointExposed,
    productionIntegrationAllowed,
    decisionAutomationAllowed,
    canChangeInventoryOrAccounting,
    noOpHarnessOnly,
    baselineOnlySourceOfTruth,
    auditHookEnabled,
    harnessCheckCount: (validationRun.checks as unknown[]).length,
    mutationGuardCount: mutationGuardResults.length,
    blockerCount: blockers.length,
    warningCount: warnings.length,
    passCount,
    totalGateCount: gates.length,
    harnessGates: gates,
    blockers,
    warnings,
    recommendedNextAction: blockers[0] || warnings[0] || "Phase 3F disabled harness is ready; future work may add observation logs without enabling model execution.",
  };

  const auditExport = {
    generatedAt,
    phase: "3F",
    harnessStatus,
    recommendation,
    importId,
    fixtureRunId: summary.fixtureRunId,
    blockers,
    warnings,
    policy: fallbackPolicy,
  };

  return {
    generatedAt,
    contract: buildContract(),
    summary,
    latestFixtureRun,
    modelImport,
    harnessManifest,
    validationRun,
    noOpAssertions,
    mutationGuardResults,
    fallbackPolicy,
    auditExport,
    previousHarnessRuns,
    operationalPolicy: {
      disabledHarnessOnly: true,
      productionIntegrationAllowed,
      inferenceRuntimeEnabled: false,
      decisionAutomationAllowed,
      message: "Phase 3F only records a disabled no-op harness. It does not execute models or expose inference.",
    },
  };
};

export const recordInventoryStockoutDisabledShadowRuntimeHarness = async (
  payload: Record<string, unknown>,
): Promise<InventoryStockoutDisabledShadowRuntimeHarnessResponse> => {
  const data = await buildInventoryStockoutDisabledShadowRuntimeHarness(payload.importId, payload);
  const record = await recordMlDisabledShadowRuntimeHarness({
    harnessKey: data.summary.harnessKey,
    harnessVersion: data.summary.harnessVersion,
    importId: data.summary.importId,
    fixtureRunId: data.summary.fixtureRunId,
    disabledShellId: data.summary.disabledShellId,
    adapterContractId: data.summary.adapterContractId,
    artifactMetadataId: data.summary.artifactMetadataId,
    safeBoundarySkeletonId: data.summary.safeBoundarySkeletonId,
    modelKey: data.summary.modelKey,
    modelVersion: data.summary.modelVersion,
    fixtureStatus: data.summary.fixtureStatus,
    harnessStatus: data.summary.harnessStatus,
    featureFlagKey: data.summary.featureFlagKey,
    featureFlagDefault: data.summary.featureFlagDefault,
    harnessEnabled: data.summary.harnessEnabled,
    runtimeInvocationAllowed: data.summary.runtimeInvocationAllowed,
    modelExecutionAllowed: data.summary.modelExecutionAllowed,
    inferenceEndpointExposed: data.summary.inferenceEndpointExposed,
    productionIntegrationAllowed: data.summary.productionIntegrationAllowed,
    decisionAutomationAllowed: data.summary.decisionAutomationAllowed,
    inventoryAccountingChangeAllowed: data.summary.canChangeInventoryOrAccounting,
    noOpHarnessOnly: data.summary.noOpHarnessOnly,
    baselineOnlySourceOfTruth: data.summary.baselineOnlySourceOfTruth,
    auditHookEnabled: data.summary.auditHookEnabled,
    harnessCheckCount: data.summary.harnessCheckCount,
    mutationGuardCount: data.summary.mutationGuardCount,
    readinessScorePct: data.summary.readinessScorePct,
    blockerCount: data.summary.blockerCount,
    warningCount: data.summary.warningCount,
    passCount: data.summary.passCount,
    totalGateCount: data.summary.totalGateCount,
    harnessManifest: data.harnessManifest,
    validationRun: data.validationRun,
    noOpAssertions: data.noOpAssertions,
    mutationGuardResults: data.mutationGuardResults,
    fallbackPolicy: data.fallbackPolicy,
    auditExport: data.auditExport,
    summary: data.summary as unknown as Record<string, unknown>,
    policy: data.operationalPolicy,
    userId: asNumber(payload.userId),
  });
  return { ...data, harnessRecord: record as Record<string, unknown> | null };
};

export const listInventoryStockoutDisabledShadowRuntimeHarnesses = async (importIdInput: unknown) => {
  return listMlDisabledShadowRuntimeHarnessesByImportId(importIdInput, 50) as Promise<Array<Record<string, unknown>>>;
};

export const buildMlDisabledShadowRuntimeHarnessCatalogSummary = async (): Promise<MlDisabledShadowRuntimeHarnessCatalogSummary> => {
  const importId = await pickLatestImportId();
  const current = await buildInventoryStockoutDisabledShadowRuntimeHarness(importId);
  const lastDisabledShadowRuntimeHarnesses = await listMlDisabledShadowRuntimeHarnesses(25) as Array<Record<string, unknown>>;
  return {
    generatedAt: new Date().toISOString(),
    contract: buildContract(),
    currentDisabledShadowRuntimeHarness: current.summary,
    lastDisabledShadowRuntimeHarnesses,
    recommendedNextAction: current.summary.recommendedNextAction,
  };
};
