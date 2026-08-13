import { listMlModelResultImports } from "../../db/domains/mlDatasets.db";
import { buildInventoryStockoutShadowObservationArchivePackRetentionPolicy } from "./inventoryStockoutShadowObservationArchivePackRetentionPolicy.service";
import { buildMlBenchmarkCatalogSummary } from "./inventoryStockoutBenchmark.service";

const RUNTIME_CONTRACT_KEY = "inventory_stockout_read_only_shadow_scoring_runtime_v1" as const;
const RUNTIME_CONTRACT_VERSION = "v1" as const;
const REQUIRED_RETENTION_POLICY_KEY = "inventory_stockout_shadow_observation_archive_pack_retention_policy_v1" as const;
const RUNTIME_SCOPE = "phase4a_read_only_shadow_scoring_runtime_governance_only_no_production_inference" as const;
const FEATURE_FLAG_KEY = "ml.inventoryStockout.readOnlyShadowScoringRuntime.enabled" as const;
const SCORING_STRATEGY = "rule_statistical_baseline_shadow_score_v1_only" as const;

const featureFlagDefault = false as const;
const shadowScoringRuntimeEnabled = false as const;
const readOnlyRuntime = true as const;
const runtimeInvocationAllowed = false as const;
const modelExecutionAllowed = false as const;
const inferenceEndpointExposed = false as const;
const productionInferenceEndpointExposed = false as const;
const productionIntegrationAllowed = false as const;
const decisionAutomationAllowed = false as const;
const canChangeInventoryOrAccounting = false as const;
const auditOnly = true as const;
const mutationAllowed = false as const;
const baselineOnlySourceOfTruth = true as const;
const operationalDecisionAllowed = false as const;
const customerSupplierMessageAllowed = false as const;
const runtimeArtifactLoadAllowed = false as const;
const externalModelCallAllowed = false as const;
const scoringResultPersistenceAllowed = false as const;

const asNumber = (value: unknown): number | null => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
};

const getCount = (value: unknown): number => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : 0;
};

const clamp = (value: number, min = 0, max = 100): number => Math.max(min, Math.min(max, Math.round(value)));

const csvEscape = (value: unknown): string => {
  const text = value == null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const pickLatestImportId = async (): Promise<number | null> => {
  const imports = await listMlModelResultImports(1) as Array<Record<string, unknown>>;
  return asNumber(imports[0]?.id);
};

const createRuntimeFingerprint = (payload: Record<string, unknown>): string => {
  const raw = JSON.stringify(payload);
  let hash = 0;
  for (let index = 0; index < raw.length; index += 1) {
    hash = ((hash << 5) - hash + raw.charCodeAt(index)) | 0;
  }
  return `read-only-shadow-runtime-${raw.length}-${Math.abs(hash)}`;
};

export const buildInventoryStockoutReadOnlyShadowScoringRuntimeContract = () => ({
  contractKey: RUNTIME_CONTRACT_KEY,
  contractVersion: RUNTIME_CONTRACT_VERSION,
  generatedAt: new Date().toISOString(),
  purpose: "Define the Phase 4A read-only shadow scoring runtime envelope for inventory-stockout governance without production inference, model artifact execution, business mutation, or automated decisions.",
  requiredRetentionPolicyKey: REQUIRED_RETENTION_POLICY_KEY,
  runtimeScope: RUNTIME_SCOPE,
  scoringStrategy: SCORING_STRATEGY,
  requiredAssertions: [
    "Read-only shadow scoring runtime is feature-flagged off by default.",
    "No production inference endpoint is exposed.",
    "No model artifact, script process, external model service, or shell runner is executed.",
    "Shadow score output is governance-only and cannot mutate inventory, accounting, pricing, reports, ledgers, sales, repairs, partners, customers, or messaging.",
    "Rule/statistical baseline remains the source of truth until a future phase explicitly enables a reviewed runtime path.",
  ],
  forbiddenBehavior: [
    "Do not load model artifact files at runtime.",
    "Do not call external model services.",
    "Do not expose production scoring or decision endpoints.",
    "Do not persist generated shadow scores as operational truth.",
    "Do not write recommendations into purchase, sale, pricing, report, ledger, inventory, customer, or partner records.",
  ],
  operationalPolicy: {
    productionIntegrationAllowed: false,
    productionInferenceEndpointExposed: false,
    modelExecutionAllowed: false,
    decisionAutomationAllowed: false,
    canChangeInventoryOrAccounting: false,
  },
});

const buildSafetyPolicy = (generatedAt: string) => ({
  generatedAt,
  policyKey: "read_only_shadow_scoring_runtime_safety_policy_v1",
  phase: "Phase 4A — Read-Only Shadow Scoring Runtime",
  requiredFlags: {
    featureFlagDefault,
    shadowScoringRuntimeEnabled,
    readOnlyRuntime,
    runtimeInvocationAllowed,
    modelExecutionAllowed,
    inferenceEndpointExposed,
    productionInferenceEndpointExposed,
    productionIntegrationAllowed,
    decisionAutomationAllowed,
    canChangeInventoryOrAccounting,
    auditOnly,
    mutationAllowed,
    baselineOnlySourceOfTruth,
    operationalDecisionAllowed,
    customerSupplierMessageAllowed,
    runtimeArtifactLoadAllowed,
    externalModelCallAllowed,
    scoringResultPersistenceAllowed,
  },
});

export const buildInventoryStockoutReadOnlyShadowScoringRuntime = async (importIdInput?: unknown, options: Record<string, unknown> = {}) => {
  const generatedAt = new Date().toISOString();
  const importId = asNumber(importIdInput) ?? asNumber(options.importId) ?? await pickLatestImportId();
  const retentionPolicy = await buildInventoryStockoutShadowObservationArchivePackRetentionPolicy(importId, options).catch((error) => ({
    summary: {
      retentionPolicyStatus: "unavailable",
      readinessScorePct: 0,
      blockers: [error instanceof Error ? error.message : "Retention policy evidence is unavailable."],
      warnings: [],
    },
  })) as Record<string, unknown>;
  const benchmarkSummary = await buildMlBenchmarkCatalogSummary().catch(() => null) as Record<string, unknown> | null;
  const retentionSummary = (retentionPolicy as any).summary || {};
  const retentionReady = retentionSummary.retentionPolicyStatus === "retention_policy_ready";
  const baselineAvailable = Boolean(benchmarkSummary);
  const retentionReadiness = getCount(retentionSummary.readinessScorePct);
  const baselineScore = clamp(baselineAvailable ? 70 : 35);
  const governanceCompletenessScore = clamp((retentionReadiness * 0.7) + (baselineAvailable ? 20 : 0) + 10);
  const shadowScore = clamp((baselineScore * 0.55) + (governanceCompletenessScore * 0.45));
  const blockers = [
    ...(((retentionSummary as any).blockers || []) as string[]),
    shadowScoringRuntimeEnabled ? "Shadow scoring runtime unexpectedly enabled; Phase 4A must remain feature-flag disabled by default." : "",
    modelExecutionAllowed ? "Model execution unexpectedly enabled." : "",
    productionInferenceEndpointExposed ? "Production inference endpoint unexpectedly exposed." : "",
  ].filter(Boolean);
  const warnings = [
    ...(((retentionSummary as any).warnings || []) as string[]),
    baselineAvailable ? "Shadow score uses read-only baseline/governance evidence only; it is not a model prediction." : "Baseline benchmark summary unavailable; shadow score remains low-confidence governance preview.",
  ];
  const runtimeStatus = blockers.length ? "blocked" : retentionReady && baselineAvailable ? "read_only_shadow_runtime_ready" : "needs_governance_evidence";
  const recommendation = runtimeStatus === "read_only_shadow_runtime_ready" ? "keep_runtime_disabled_and_review_shadow_scores_manually" : "complete_governance_evidence_before_shadow_scoring_review";
  const scoringPreview = {
    scoringStrategy: SCORING_STRATEGY,
    generatedAt,
    importId,
    shadowScore,
    confidencePct: clamp((retentionReadiness * 0.6) + (baselineAvailable ? 25 : 0)),
    sourceOfTruth: "rule_statistical_baseline_and_governance_evidence_only",
    modelOutput: null,
    operationalRecommendation: null,
    inventoryMutation: null,
    accountingMutation: null,
    pricingMutation: null,
  };
  const safetyPolicy = buildSafetyPolicy(generatedAt);
  const runtimeManifest = {
    manifestVersion: "read_only_shadow_scoring_runtime_manifest_v1",
    generatedAt,
    importId,
    runtimeContractKey: RUNTIME_CONTRACT_KEY,
    requiredRetentionPolicyKey: REQUIRED_RETENTION_POLICY_KEY,
    runtimeStatus,
    shadowScore,
    featureFlagKey: FEATURE_FLAG_KEY,
    featureFlagDefault,
    shadowScoringRuntimeEnabled,
    productionInferenceEndpointExposed,
    modelExecutionAllowed,
    mutationAllowed,
  };
  const runtimePayload = {
    contract: buildInventoryStockoutReadOnlyShadowScoringRuntimeContract(),
    summary: {
      generatedAt,
      importId,
      runtimeStatus,
      recommendation,
      readinessScorePct: governanceCompletenessScore,
      shadowScore,
      featureFlagKey: FEATURE_FLAG_KEY,
      featureFlagDefault,
      shadowScoringRuntimeEnabled,
      readOnlyRuntime,
      runtimeInvocationAllowed,
      modelExecutionAllowed,
      inferenceEndpointExposed,
      productionInferenceEndpointExposed,
      productionIntegrationAllowed,
      decisionAutomationAllowed,
      canChangeInventoryOrAccounting,
      auditOnly,
      mutationAllowed,
      baselineOnlySourceOfTruth,
      operationalDecisionAllowed,
      customerSupplierMessageAllowed,
      runtimeArtifactLoadAllowed,
      externalModelCallAllowed,
      scoringResultPersistenceAllowed,
      retentionPolicyStatus: retentionSummary.retentionPolicyStatus || null,
      baselineAvailable,
      blockers,
      warnings,
      recommendedNextAction: recommendation,
    },
    scoringPreview,
    runtimeManifest,
    safetyPolicy,
    retentionPolicySummary: retentionSummary,
    baselineSummary: benchmarkSummary,
  };
  const runtimeFingerprint = createRuntimeFingerprint(runtimePayload);
  return {
    success: true,
    ...runtimePayload,
    runtimeFingerprint,
  };
};

export const buildMlReadOnlyShadowScoringRuntimeCatalogSummary = async () => {
  const current = await buildInventoryStockoutReadOnlyShadowScoringRuntime();
  return {
    generatedAt: new Date().toISOString(),
    contract: buildInventoryStockoutReadOnlyShadowScoringRuntimeContract(),
    currentReadOnlyShadowScoringRuntime: current.summary,
    scoringPreview: current.scoringPreview,
    runtimeManifest: current.runtimeManifest,
    recommendedNextAction: current.summary.recommendedNextAction,
  };
};

export const exportInventoryStockoutReadOnlyShadowScoringRuntimeManifest = async (importIdInput?: unknown, options: Record<string, unknown> = {}) => {
  const runtime = await buildInventoryStockoutReadOnlyShadowScoringRuntime(importIdInput, options);
  return runtime.runtimeManifest;
};

export const exportInventoryStockoutReadOnlyShadowScoringRuntimeCsv = async (importIdInput?: unknown, options: Record<string, unknown> = {}) => {
  const runtime = await buildInventoryStockoutReadOnlyShadowScoringRuntime(importIdInput, options);
  const row = runtime.summary;
  const headers = ["generatedAt", "importId", "runtimeStatus", "readinessScorePct", "shadowScore", "featureFlagDefault", "shadowScoringRuntimeEnabled", "modelExecutionAllowed", "productionInferenceEndpointExposed", "mutationAllowed", "baselineAvailable", "recommendedNextAction"];
  const csv = [headers.join(","), headers.map((header) => csvEscape((row as Record<string, unknown>)[header])).join(",")].join("\n");
  return {
    filename: `inventory-stockout-read-only-shadow-scoring-runtime-${row.importId || "latest"}.csv`,
    csv,
  };
};
