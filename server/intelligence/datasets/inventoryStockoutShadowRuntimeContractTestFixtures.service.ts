import {
  getMlModelResultImportById,
  listMlDisabledShadowAdapterShells,
  listMlDisabledShadowAdapterShellsByImportId,
  listMlModelResultImports,
  listMlShadowRuntimeContractTestFixtures,
  listMlShadowRuntimeContractTestFixturesByImportId,
  recordMlShadowRuntimeContractTestFixtures,
} from "../../db/domains/mlDatasets.db";
import type {
  InventoryStockoutShadowRuntimeContractTestFixtureGate,
  InventoryStockoutShadowRuntimeContractTestFixturesContract,
  InventoryStockoutShadowRuntimeContractTestFixturesResponse,
  InventoryStockoutShadowRuntimeContractTestFixturesSummary,
  MlShadowRuntimeContractTestFixturesCatalogSummary,
  ShadowRuntimeContractTestFixtureRecommendation,
  ShadowRuntimeContractTestFixtureStatus,
} from "./datasetTypes";

const FIXTURE_KEY = "inventory_stockout_shadow_runtime_contract_test_fixtures_v1" as const;
const FIXTURE_VERSION = "v1" as const;
const ACCEPTED_SHELL_KEY = "inventory_stockout_disabled_shadow_adapter_shell_v1" as const;
const FIXTURE_SCOPE = "phase3e_shadow_runtime_contract_tests_no_op_audit_fixtures" as const;
const FEATURE_FLAG_KEY = "ml.inventoryStockout.shadowRuntimeContractTests.enabled" as const;
const FALLBACK_STRATEGY = "rule_statistical_baseline_v1_only" as const;

const featureFlagDefault = false as const;
const runtimeInvocationAllowed = false as const;
const modelExecutionAllowed = false as const;
const inferenceEndpointExposed = false as const;
const productionIntegrationAllowed = false as const;
const decisionAutomationAllowed = false as const;
const canChangeInventoryOrAccounting = false as const;
const noOpFixturesOnly = true as const;
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

const buildContract = (): InventoryStockoutShadowRuntimeContractTestFixturesContract => ({
  contractKey: FIXTURE_KEY,
  contractVersion: FIXTURE_VERSION,
  generatedAt: new Date().toISOString(),
  purpose: "Define no-op shadow runtime contract tests and audit fixtures while keeping model execution fully disabled.",
  acceptedShellKey: ACCEPTED_SHELL_KEY,
  fixtureScope: FIXTURE_SCOPE,
  requiredAssertions: [
    "Feature flag remains false by default.",
    "Runtime invocation remains false.",
    "Model execution remains false.",
    "No scoring or inference endpoint is exposed.",
    "No-op fixture does not emit predictedProbability or predictedLabel.",
    "Rule/statistical baseline remains the only source of truth.",
    "Inventory, accounting, reports, invoices, ledgers, pricing, purchasing, repairs, and customer communications are not mutated.",
  ],
  forbiddenBehavior: [
    "Do not execute a model artifact.",
    "Do not load model binaries.",
    "Do not call external model services, AI APIs, runtime workers, shell command runners, or process runners.",
    "Do not expose scoring, inference, or runtime invocation endpoints.",
    "Do not write predictions into operational business tables.",
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
  status: InventoryStockoutShadowRuntimeContractTestFixtureGate["status"],
  value: unknown,
  message: string,
): InventoryStockoutShadowRuntimeContractTestFixtureGate => ({ key, label, status, value, message });

const uniqueMessages = (
  gates: InventoryStockoutShadowRuntimeContractTestFixtureGate[],
  status: InventoryStockoutShadowRuntimeContractTestFixtureGate["status"],
): string[] => Array.from(new Set(gates.filter((gate) => gate.status === status).map((gate) => gate.message)));

const pickLatestImportId = async (): Promise<number | null> => {
  const imports = await listMlModelResultImports(1) as Array<Record<string, unknown>>;
  return asNumber(imports[0]?.id);
};

const buildNoOpAuditFixtures = (generatedAt: string) => [
  {
    fixtureKey: "feature_flag_off_no_runtime",
    generatedAt,
    input: { featureFlagKey: FEATURE_FLAG_KEY, featureFlagDefault },
    expected: {
      runtimeInvocationAllowed: false,
      modelExecutionAllowed: false,
      inferenceEndpointExposed: false,
      reason: "Phase 3E only validates the disabled contract; it does not invoke a model.",
    },
  },
  {
    fixtureKey: "no_op_shadow_prediction_envelope",
    generatedAt,
    input: { entityType: "product", entityId: "fixture-product-1", horizonDays: 7 },
    expected: {
      predictedProbability: null,
      predictedLabel: null,
      modelOutputUnavailableReason: "Shadow runtime contract tests are no-op fixtures only.",
      baselineFallback: FALLBACK_STRATEGY,
    },
  },
  {
    fixtureKey: "baseline_source_of_truth_guard",
    generatedAt,
    input: { baselineEngine: "rule/statistical baseline model v1" },
    expected: {
      baselineOnlySourceOfTruth: true,
      modelCanOverrideBaseline: false,
      automationAllowed: false,
    },
  },
];

const buildNoMutationAssertions = () => [
  { tableGroup: "inventory", mutationAllowed: false, assertion: "No fixture may update products, stock rows, inventory logs, or reorder decisions." },
  { tableGroup: "accounting", mutationAllowed: false, assertion: "No fixture may update customer ledger, partner ledger, invoices, expenses, or installment calculations." },
  { tableGroup: "pricing", mutationAllowed: false, assertion: "No fixture may update purchase cost, sale price, profit, discount, or margin truth." },
  { tableGroup: "reports", mutationAllowed: false, assertion: "No fixture may update official report totals or cached financial outputs." },
  { tableGroup: "communications", mutationAllowed: false, assertion: "No fixture may send Telegram, SMS, email, or customer notifications." },
];

export const buildInventoryStockoutShadowRuntimeContractTestFixturesContract = buildContract;

export const buildInventoryStockoutShadowRuntimeContractTestFixtures = async (
  importIdInput?: unknown,
  options: Record<string, unknown> = {},
): Promise<InventoryStockoutShadowRuntimeContractTestFixturesResponse> => {
  const generatedAt = new Date().toISOString();
  const importId = asNumber(importIdInput) ?? asNumber(options.importId) ?? await pickLatestImportId();
  const modelImport = importId ? await getMlModelResultImportById(importId) as Record<string, unknown> | null : null;
  const shells = importId ? await listMlDisabledShadowAdapterShellsByImportId(importId, 25) as Array<Record<string, unknown>> : [];
  const latestDisabledShell = shells[0] || null;
  const previousFixtureRuns = importId ? await listMlShadowRuntimeContractTestFixturesByImportId(importId, 25) as Array<Record<string, unknown>> : [];

  const shellStatus = normalizeText(latestDisabledShell?.shellStatus);
  const modelKey = normalizeText(options.modelKey, normalizeText(latestDisabledShell?.modelKey, normalizeText(modelImport?.modelKey)));
  const modelVersion = normalizeText(options.modelVersion, normalizeText(latestDisabledShell?.modelVersion, normalizeText(modelImport?.modelVersion)));
  const hasImport = Boolean(modelImport?.id);
  const shellReady = shellStatus === "shell_ready";
  const shellFeatureFlagOff = Number(latestDisabledShell?.featureFlagDefault) === 0 || latestDisabledShell?.featureFlagDefault === false;
  const shellRuntimeDisabled = Number(latestDisabledShell?.runtimeInvocationAllowed) === 0 || latestDisabledShell?.runtimeInvocationAllowed === false;
  const shellModelExecutionDisabled = Number(latestDisabledShell?.modelExecutionAllowed) === 0 || latestDisabledShell?.modelExecutionAllowed === false;
  const shellEndpointHidden = Number(latestDisabledShell?.inferenceEndpointExposed) === 0 || latestDisabledShell?.inferenceEndpointExposed === false;
  const shellNoOpOnly = Number(latestDisabledShell?.noOpAdapterOnly) === 1 || latestDisabledShell?.noOpAdapterOnly === true;
  const shellAuditHookEnabled = Number(latestDisabledShell?.auditHookEnabled) === 1 || latestDisabledShell?.auditHookEnabled === true;
  const referencesComplete = Boolean(importId && latestDisabledShell?.id && modelKey && modelVersion);

  const noOpAuditFixtures = buildNoOpAuditFixtures(generatedAt);
  const noMutationAssertions = buildNoMutationAssertions();
  const contractTestSuite = {
    suiteKey: FIXTURE_KEY,
    suiteVersion: FIXTURE_VERSION,
    generatedAt,
    mode: "no_op_contract_tests_only",
    tests: [
      { key: "feature_flag_default_off", expected: false, source: FEATURE_FLAG_KEY },
      { key: "runtime_invocation_disabled", expected: false },
      { key: "model_execution_disabled", expected: false },
      { key: "inference_endpoint_hidden", expected: false },
      { key: "no_op_fixture_output_shape", expectedFields: ["predictedProbability:null", "predictedLabel:null", "baselineFallback"] },
      { key: "business_mutation_guard", expectedMutationAllowed: false },
    ],
  };

  const gates: InventoryStockoutShadowRuntimeContractTestFixtureGate[] = [
    buildGate("model_import_exists", "Model Import Audit", hasImport ? "pass" : "block", importId, hasImport ? "Model import audit record is traceable." : "A model import audit record is required."),
    buildGate("disabled_shell_ready", "Disabled Shell Ready", shellReady ? "pass" : "block", shellStatus, shellReady ? "Phase 3D disabled shell is ready." : "Phase 3D disabled shell must be shell_ready before Phase 3E."),
    buildGate("feature_flags_off", "Feature Flags Off", !featureFlagDefault && shellFeatureFlagOff ? "pass" : "block", { featureFlagDefault, shellFeatureFlagOff }, "Contract test feature flag and upstream disabled shell feature flag remain off by default."),
    buildGate("runtime_disabled", "Runtime Disabled", !runtimeInvocationAllowed && shellRuntimeDisabled ? "pass" : "block", { runtimeInvocationAllowed, shellRuntimeDisabled }, "Runtime invocation is disabled."),
    buildGate("model_execution_disabled", "Model Execution Disabled", !modelExecutionAllowed && shellModelExecutionDisabled ? "pass" : "block", { modelExecutionAllowed, shellModelExecutionDisabled }, "Model execution is disabled."),
    buildGate("endpoint_hidden", "No Inference Endpoint", !inferenceEndpointExposed && shellEndpointHidden ? "pass" : "block", { inferenceEndpointExposed, shellEndpointHidden }, "No scoring/inference endpoint is exposed."),
    buildGate("no_op_fixture_only", "No-Op Fixtures Only", noOpFixturesOnly && shellNoOpOnly ? "pass" : "block", { noOpFixturesOnly, shellNoOpOnly }, "Fixtures are no-op only and cannot emit real model predictions."),
    buildGate("audit_hook_available", "Audit Hook Available", shellAuditHookEnabled ? "pass" : "warning", shellAuditHookEnabled, "Shell audit hook is available for fixture evidence."),
    buildGate("baseline_source_of_truth", "Baseline Source of Truth", baselineOnlySourceOfTruth ? "pass" : "block", baselineOnlySourceOfTruth, "Rule/statistical baseline remains the only source of truth."),
    buildGate("no_business_mutation", "No Business Mutation", canChangeInventoryOrAccounting === false ? "pass" : "block", canChangeInventoryOrAccounting, "Fixtures cannot mutate inventory, accounting, pricing, reports, invoices, ledgers, or communications."),
    buildGate("references_complete", "Fixture References", referencesComplete ? "pass" : "block", { importId, disabledShellId: latestDisabledShell?.id, modelKey, modelVersion }, referencesComplete ? "Fixture references are complete." : "Import, disabled shell, model key, and model version references are required."),
  ];

  const blockers = uniqueMessages(gates, "block");
  const warnings = uniqueMessages(gates, "warning");
  const passCount = gates.filter((gate) => gate.status === "pass").length;
  const readinessScorePct = Math.round((passCount / Math.max(gates.length, 1)) * 100);

  let fixtureStatus: ShadowRuntimeContractTestFixtureStatus = "not_started";
  let recommendation: ShadowRuntimeContractTestFixtureRecommendation = "keep_shadow_runtime_tests_disabled";
  if (!shellReady) {
    fixtureStatus = "needs_disabled_shell";
    recommendation = "complete_disabled_shadow_adapter_shell";
  } else if (blockers.length === 0) {
    fixtureStatus = "fixtures_ready";
    recommendation = "prepare_no_op_shadow_runtime_harness";
  } else {
    fixtureStatus = "blocked";
  }

  const fallbackPolicy = {
    fallbackStrategy: FALLBACK_STRATEGY,
    baselineRemainsSourceOfTruth: true,
    fixtureCanOverrideBaseline: false,
    fixtureCanMutateBusinessData: false,
    noModelOutputAllowed: true,
  };

  const summary: InventoryStockoutShadowRuntimeContractTestFixturesSummary = {
    fixtureKey: FIXTURE_KEY,
    fixtureVersion: FIXTURE_VERSION,
    generatedAt,
    importId,
    disabledShellId: asNumber(latestDisabledShell?.id),
    adapterContractId: asNumber(latestDisabledShell?.adapterContractId),
    artifactMetadataId: asNumber(latestDisabledShell?.artifactMetadataId),
    safeBoundarySkeletonId: asNumber(latestDisabledShell?.safeBoundarySkeletonId),
    modelKey,
    modelVersion,
    shellStatus,
    fixtureStatus,
    recommendation,
    readinessScorePct,
    featureFlagKey: FEATURE_FLAG_KEY,
    featureFlagDefault,
    runtimeInvocationAllowed,
    modelExecutionAllowed,
    inferenceEndpointExposed,
    productionIntegrationAllowed,
    decisionAutomationAllowed,
    canChangeInventoryOrAccounting,
    noOpFixturesOnly,
    baselineOnlySourceOfTruth,
    fixtureCount: noOpAuditFixtures.length,
    contractTestCount: (contractTestSuite.tests as unknown[]).length,
    mutationAssertionCount: noMutationAssertions.length,
    blockerCount: blockers.length,
    warningCount: warnings.length,
    passCount,
    totalGateCount: gates.length,
    fixtureGates: gates,
    blockers,
    warnings,
    recommendedNextAction: blockers[0] || warnings[0] || "Phase 3E fixtures are ready; future work can add a disabled harness without enabling model execution.",
  };

  const auditExport = {
    generatedAt,
    phase: "3E",
    fixtureStatus,
    recommendation,
    importId,
    disabledShellId: summary.disabledShellId,
    blockers,
    warnings,
    policy: fallbackPolicy,
  };

  return {
    generatedAt,
    contract: buildContract(),
    summary,
    latestDisabledShell,
    modelImport,
    contractTestSuite,
    noOpAuditFixtures,
    noMutationAssertions,
    fallbackPolicy,
    auditExport,
    previousFixtureRuns,
    operationalPolicy: {
      shadowRuntimeContractTestsOnly: true,
      productionIntegrationAllowed,
      inferenceRuntimeEnabled: false,
      decisionAutomationAllowed,
      message: "Phase 3E only records no-op shadow runtime contract tests and audit fixtures. It does not execute models or expose inference.",
    },
  };
};

export const recordInventoryStockoutShadowRuntimeContractTestFixtures = async (
  payload: Record<string, unknown>,
): Promise<InventoryStockoutShadowRuntimeContractTestFixturesResponse> => {
  const data = await buildInventoryStockoutShadowRuntimeContractTestFixtures(payload.importId, payload);
  const record = await recordMlShadowRuntimeContractTestFixtures({
    fixtureKey: data.summary.fixtureKey,
    fixtureVersion: data.summary.fixtureVersion,
    importId: data.summary.importId,
    disabledShellId: data.summary.disabledShellId,
    adapterContractId: data.summary.adapterContractId,
    artifactMetadataId: data.summary.artifactMetadataId,
    safeBoundarySkeletonId: data.summary.safeBoundarySkeletonId,
    modelKey: data.summary.modelKey,
    modelVersion: data.summary.modelVersion,
    shellStatus: data.summary.shellStatus,
    fixtureStatus: data.summary.fixtureStatus,
    featureFlagKey: data.summary.featureFlagKey,
    featureFlagDefault: data.summary.featureFlagDefault,
    runtimeInvocationAllowed: data.summary.runtimeInvocationAllowed,
    modelExecutionAllowed: data.summary.modelExecutionAllowed,
    inferenceEndpointExposed: data.summary.inferenceEndpointExposed,
    productionIntegrationAllowed: data.summary.productionIntegrationAllowed,
    decisionAutomationAllowed: data.summary.decisionAutomationAllowed,
    inventoryAccountingChangeAllowed: data.summary.canChangeInventoryOrAccounting,
    noOpFixturesOnly: data.summary.noOpFixturesOnly,
    baselineOnlySourceOfTruth: data.summary.baselineOnlySourceOfTruth,
    fixtureCount: data.summary.fixtureCount,
    contractTestCount: data.summary.contractTestCount,
    mutationAssertionCount: data.summary.mutationAssertionCount,
    readinessScorePct: data.summary.readinessScorePct,
    blockerCount: data.summary.blockerCount,
    warningCount: data.summary.warningCount,
    passCount: data.summary.passCount,
    totalGateCount: data.summary.totalGateCount,
    contractTestSuite: data.contractTestSuite,
    noOpAuditFixtures: data.noOpAuditFixtures,
    noMutationAssertions: data.noMutationAssertions,
    fallbackPolicy: data.fallbackPolicy,
    auditExport: data.auditExport,
    summary: data.summary as unknown as Record<string, unknown>,
    policy: data.operationalPolicy,
    userId: asNumber(payload.userId),
  });
  return { ...data, fixtureRecord: record as Record<string, unknown> | null };
};

export const listInventoryStockoutShadowRuntimeContractTestFixtures = async (importIdInput: unknown) => {
  return listMlShadowRuntimeContractTestFixturesByImportId(importIdInput, 50) as Promise<Array<Record<string, unknown>>>;
};

export const buildMlShadowRuntimeContractTestFixturesCatalogSummary = async (): Promise<MlShadowRuntimeContractTestFixturesCatalogSummary> => {
  const importId = await pickLatestImportId();
  const current = await buildInventoryStockoutShadowRuntimeContractTestFixtures(importId);
  const lastShadowRuntimeContractTestFixtures = await listMlShadowRuntimeContractTestFixtures(25) as Array<Record<string, unknown>>;
  return {
    generatedAt: new Date().toISOString(),
    contract: buildContract(),
    currentShadowRuntimeContractTestFixtures: current.summary,
    lastShadowRuntimeContractTestFixtures,
    recommendedNextAction: current.summary.recommendedNextAction,
  };
};
