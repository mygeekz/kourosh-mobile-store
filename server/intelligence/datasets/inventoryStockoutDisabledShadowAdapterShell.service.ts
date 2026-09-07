import {
  getMlModelResultImportById,
  listMlDisabledShadowAdapterShells,
  listMlDisabledShadowAdapterShellsByImportId,
  listMlModelArtifactMetadataByImportId,
  listMlSafeInferenceBoundarySkeletonsByImportId,
  listMlShadowInferenceAdapterContracts,
  listMlShadowInferenceAdapterContractsByImportId,
  listMlModelResultImports,
  recordMlDisabledShadowAdapterShell,
} from "../../db/domains/mlDatasets.db";
import type {
  DisabledShadowAdapterShellRecommendation,
  DisabledShadowAdapterShellStatus,
  InventoryStockoutDisabledShadowAdapterShellContract,
  InventoryStockoutDisabledShadowAdapterShellGate,
  InventoryStockoutDisabledShadowAdapterShellResponse,
  InventoryStockoutDisabledShadowAdapterShellSummary,
  MlDisabledShadowAdapterShellCatalogSummary,
} from "./datasetTypes";

const SHELL_KEY = "inventory_stockout_disabled_shadow_adapter_shell_v1" as const;
const SHELL_VERSION = "v1" as const;
const ACCEPTED_ADAPTER_KEY = "inventory_stockout_shadow_inference_adapter_contract_v1" as const;
const SHELL_SCOPE = "phase3d_disabled_shadow_adapter_shell_no_model_execution" as const;
const FEATURE_FLAG_KEY = "ml.inventoryStockout.disabledShadowAdapterShell.enabled" as const;
const UPSTREAM_FEATURE_FLAG_KEY = "ml.inventoryStockout.shadowAdapter.enabled" as const;
const FALLBACK_STRATEGY = "rule_statistical_baseline_v1_only" as const;

const featureFlagDefault = false as const;
const shellEnabled = false as const;
const runtimeInvocationAllowed = false as const;
const modelExecutionAllowed = false as const;
const inferenceEndpointExposed = false as const;
const productionIntegrationAllowed = false as const;
const decisionAutomationAllowed = false as const;
const canChangeInventoryOrAccounting = false as const;
const noOpAdapterOnly = true as const;
const auditHookEnabled = true as const;
const shadowModeOnly = true as const;

const asNumber = (value: unknown): number | null => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
};

const normalizeText = (value: unknown, fallback: string | null = null): string | null => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : fallback;
};

const buildContract = (): InventoryStockoutDisabledShadowAdapterShellContract => ({
  contractKey: SHELL_KEY,
  contractVersion: SHELL_VERSION,
  generatedAt: new Date().toISOString(),
  purpose: "Define a disabled no-op shadow adapter implementation shell for future inventory stockout inference integration without executing a model.",
  acceptedAdapterContractKey: ACCEPTED_ADAPTER_KEY,
  shellScope: SHELL_SCOPE,
  requiredReferences: [
    "validatedModelImportId",
    "shadowInferenceAdapterContractId",
    "modelArtifactMetadataId",
    "safeBoundarySkeletonId",
    "modelKey",
    "modelVersion",
    "featureFlagKey",
  ],
  forbiddenBehavior: [
    "Do not execute a model artifact.",
    "Do not expose a scoring or inference endpoint.",
    "Do not call external model services, AI APIs, shell commands, process runners, or runtime tooling.",
    "Do not write model outputs into inventory, accounting, invoices, ledgers, pricing, reports, purchasing, repairs, or customer communications.",
    "Do not allow shadow output to override the rule/statistical baseline.",
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
  status: InventoryStockoutDisabledShadowAdapterShellGate["status"],
  value: unknown,
  message: string,
): InventoryStockoutDisabledShadowAdapterShellGate => ({ key, label, status, value, message });

const uniqueMessages = (
  gates: InventoryStockoutDisabledShadowAdapterShellGate[],
  status: InventoryStockoutDisabledShadowAdapterShellGate["status"],
): string[] => Array.from(new Set(gates.filter((gate) => gate.status === status).map((gate) => gate.message)));

const pickLatestImportId = async (): Promise<number | null> => {
  const imports = await listMlModelResultImports(1) as Array<Record<string, unknown>>;
  return asNumber(imports[0]?.id);
};

export const buildInventoryStockoutDisabledShadowAdapterShellContract = buildContract;

export const buildInventoryStockoutDisabledShadowAdapterShell = async (
  importIdInput?: unknown,
  options: Record<string, unknown> = {},
): Promise<InventoryStockoutDisabledShadowAdapterShellResponse> => {
  const generatedAt = new Date().toISOString();
  const importId = asNumber(importIdInput) ?? asNumber(options.importId) ?? await pickLatestImportId();
  const modelImport = importId ? await getMlModelResultImportById(importId) as Record<string, unknown> | null : null;
  const adapterContracts = importId ? await listMlShadowInferenceAdapterContractsByImportId(importId, 25) as Array<Record<string, unknown>> : [];
  const latestAdapterContract = adapterContracts[0] || null;
  const artifactRecords = importId ? await listMlModelArtifactMetadataByImportId(importId, 25) as Array<Record<string, unknown>> : [];
  const latestArtifactMetadata = artifactRecords[0] || null;
  const safeBoundaries = importId ? await listMlSafeInferenceBoundarySkeletonsByImportId(importId, 25) as Array<Record<string, unknown>> : [];
  const latestSafeBoundary = safeBoundaries[0] || null;
  const previousShells = importId ? await listMlDisabledShadowAdapterShellsByImportId(importId, 25) as Array<Record<string, unknown>> : [];

  const modelKey = normalizeText(options.modelKey, normalizeText(latestAdapterContract?.modelKey, normalizeText(latestArtifactMetadata?.modelKey, normalizeText(modelImport?.modelKey))));
  const modelVersion = normalizeText(options.modelVersion, normalizeText(latestAdapterContract?.modelVersion, normalizeText(latestArtifactMetadata?.modelVersion, normalizeText(modelImport?.modelVersion))));
  const adapterStatus = normalizeText(latestAdapterContract?.adapterStatus);
  const registryStatus = normalizeText(latestArtifactMetadata?.registryStatus);
  const boundaryStatus = normalizeText(latestSafeBoundary?.boundaryStatus);
  const hasImport = Boolean(modelImport?.id);
  const adapterContractReady = adapterStatus === "adapter_contract_ready";
  const artifactMetadataReady = registryStatus === "metadata_ready";
  const safeBoundaryReady = boundaryStatus === "skeleton_ready";
  const upstreamFeatureFlagDefault = Number(latestAdapterContract?.featureFlagDefault) === 0 || latestAdapterContract?.featureFlagDefault === false;
  const upstreamRuntimeDisabled = Number(latestAdapterContract?.runtimeInvocationAllowed) === 0 || latestAdapterContract?.runtimeInvocationAllowed === false;
  const upstreamModelExecutionDisabled = Number(latestAdapterContract?.modelExecutionAllowed) === 0 || latestAdapterContract?.modelExecutionAllowed === false;
  const upstreamEndpointHidden = Number(latestAdapterContract?.inferenceEndpointExposed) === 0 || latestAdapterContract?.inferenceEndpointExposed === false;
  const boundaryRuntimeStillDisabled = Number(latestSafeBoundary?.runtimeEnabled) === 0 || latestSafeBoundary?.runtimeEnabled === false;
  const artifactRuntimeStillDisabled = Number(latestArtifactMetadata?.runtimeLoadAllowed) === 0 || latestArtifactMetadata?.runtimeLoadAllowed === false;
  const referencesComplete = Boolean(importId && latestAdapterContract?.id && latestArtifactMetadata?.id && latestSafeBoundary?.id && modelKey && modelVersion);

  const gates: InventoryStockoutDisabledShadowAdapterShellGate[] = [
    buildGate("model_import_exists", "Model Import Audit", hasImport ? "pass" : "block", importId, hasImport ? "Model import audit record is traceable." : "A validated model import audit record is required."),
    buildGate("adapter_contract_ready", "Shadow Adapter Contract", adapterContractReady ? "pass" : "block", adapterStatus, adapterContractReady ? "Phase 3C shadow adapter contract is ready." : "Phase 3C adapter contract must be adapter_contract_ready before Phase 3D."),
    buildGate("safe_boundary_ready", "Safe Boundary Skeleton", safeBoundaryReady ? "pass" : "block", boundaryStatus, safeBoundaryReady ? "Phase 3A safe boundary remains ready." : "Phase 3A safe boundary must be skeleton_ready."),
    buildGate("artifact_metadata_ready", "Artifact Metadata Registry", artifactMetadataReady ? "pass" : "block", registryStatus, artifactMetadataReady ? "Phase 3B artifact metadata remains ready." : "Phase 3B artifact metadata must be metadata_ready."),
    buildGate("feature_flag_default_off", "Feature Flag Default Off", !featureFlagDefault && upstreamFeatureFlagDefault ? "pass" : "block", { featureFlagDefault, upstreamFeatureFlagDefault }, "Shell and upstream shadow adapter feature flags are off by default."),
    buildGate("shell_disabled", "Shell Disabled", shellEnabled === false ? "pass" : "block", shellEnabled, "No-op shell is disabled by design in Phase 3D."),
    buildGate("runtime_disabled", "Runtime Disabled", !runtimeInvocationAllowed && upstreamRuntimeDisabled && boundaryRuntimeStillDisabled && artifactRuntimeStillDisabled ? "pass" : "block", { runtimeInvocationAllowed, upstreamRuntimeDisabled, boundaryRuntimeStillDisabled, artifactRuntimeStillDisabled }, "Runtime invocation remains disabled across shell, adapter, boundary, and artifact metadata."),
    buildGate("model_execution_disabled", "Model Execution Disabled", !modelExecutionAllowed && upstreamModelExecutionDisabled ? "pass" : "block", { modelExecutionAllowed, upstreamModelExecutionDisabled }, "No model execution is allowed."),
    buildGate("endpoint_hidden", "No Inference Endpoint", !inferenceEndpointExposed && upstreamEndpointHidden ? "pass" : "block", { inferenceEndpointExposed, upstreamEndpointHidden }, "No scoring or inference endpoint is exposed."),
    buildGate("no_op_adapter_only", "No-Op Adapter Only", noOpAdapterOnly ? "pass" : "block", noOpAdapterOnly, "Phase 3D shell only returns disabled/no-op state and baseline fallback metadata."),
    buildGate("audit_hook_present", "Audit Hook Present", auditHookEnabled ? "pass" : "block", auditHookEnabled, "Audit hook policy is defined before any future runtime work."),
    buildGate("references_complete", "Shell References", referencesComplete ? "pass" : "block", { importId, adapterContractId: latestAdapterContract?.id, artifactMetadataId: latestArtifactMetadata?.id, safeBoundarySkeletonId: latestSafeBoundary?.id, modelKey, modelVersion }, referencesComplete ? "Shell references are complete." : "Import, adapter contract, artifact metadata, safe boundary, model key, and model version references are required."),
    buildGate("business_truth_protected", "Business Truth Protected", canChangeInventoryOrAccounting === false ? "pass" : "block", canChangeInventoryOrAccounting, "Inventory/accounting/report truth remains untouched."),
  ];

  const blockers = uniqueMessages(gates, "block");
  const warnings = uniqueMessages(gates, "warning");
  const passCount = gates.filter((gate) => gate.status === "pass").length;
  const readinessScorePct = Math.round((passCount / Math.max(gates.length, 1)) * 100);

  let shellStatus: DisabledShadowAdapterShellStatus = "not_started";
  let recommendation: DisabledShadowAdapterShellRecommendation = "keep_shell_disabled";
  if (!safeBoundaryReady) {
    shellStatus = "needs_safe_boundary";
    recommendation = "complete_safe_boundary_skeleton";
  } else if (!artifactMetadataReady) {
    shellStatus = "needs_artifact_metadata";
    recommendation = "complete_artifact_metadata_registry";
  } else if (!adapterContractReady) {
    shellStatus = "needs_adapter_contract";
    recommendation = "complete_shadow_adapter_contract";
  } else if (blockers.length === 0) {
    shellStatus = "shell_ready";
    recommendation = "prepare_shadow_runtime_contract_tests";
  } else {
    shellStatus = "blocked";
  }

  const shellInterface = {
    shellKey: SHELL_KEY,
    shellVersion: SHELL_VERSION,
    shellScope: SHELL_SCOPE,
    featureFlagKey: FEATURE_FLAG_KEY,
    featureFlagDefault,
    shellEnabled,
    methods: [
      {
        name: "getDisabledShadowAdapterStatus",
        behavior: "returns disabled state, references, fallback strategy, and policy only",
      },
      {
        name: "buildNoOpShadowPredictionEnvelope",
        behavior: "creates an audit-safe no-op envelope with no probability, no label, and no model execution",
      },
      {
        name: "recordShadowAdapterShellAudit",
        behavior: "records shell readiness/audit metadata only when explicitly called by Admin/Manager endpoints",
      },
    ],
  };

  const noOpAdapterManifest = {
    adapterImplementation: "disabled_no_op_shell",
    runtimeInvocationAllowed,
    modelExecutionAllowed,
    inferenceEndpointExposed,
    outputPolicy: {
      predictedProbability: null,
      predictedLabel: null,
      modelOutputUnavailableReason: "Phase 3D shell is disabled and does not execute a model.",
      baselineFallback: FALLBACK_STRATEGY,
    },
  };

  const auditHookPolicy = {
    auditHookEnabled,
    writesAllowed: ["ml_disabled_shadow_adapter_shells"],
    businessTablesReadOnly: true,
    businessTablesMutable: false,
    requiredActorRoles: ["Admin", "Manager"],
    captures: ["feature flag state", "upstream contract references", "fallback strategy", "policy gates"],
  };

  const fallbackPolicy = {
    fallbackStrategy: FALLBACK_STRATEGY,
    baselineRemainsSourceOfTruth: true,
    noOpShellCanOverrideBaseline: false,
    noOpShellCanMutateBusinessData: false,
  };

  const summary: InventoryStockoutDisabledShadowAdapterShellSummary = {
    shellKey: SHELL_KEY,
    shellVersion: SHELL_VERSION,
    generatedAt,
    importId,
    adapterContractId: asNumber(latestAdapterContract?.id),
    artifactMetadataId: asNumber(latestArtifactMetadata?.id),
    safeBoundarySkeletonId: asNumber(latestSafeBoundary?.id),
    modelKey,
    modelVersion,
    adapterStatus,
    registryStatus,
    boundaryStatus,
    shellStatus,
    recommendation,
    readinessScorePct,
    featureFlagKey: FEATURE_FLAG_KEY,
    featureFlagDefault,
    upstreamFeatureFlagKey: UPSTREAM_FEATURE_FLAG_KEY,
    shellEnabled,
    runtimeInvocationAllowed,
    modelExecutionAllowed,
    inferenceEndpointExposed,
    productionIntegrationAllowed,
    decisionAutomationAllowed,
    canChangeInventoryOrAccounting,
    noOpAdapterOnly,
    auditHookEnabled,
    shadowModeOnly,
    fallbackStrategy: FALLBACK_STRATEGY,
    blockerCount: blockers.length,
    warningCount: warnings.length,
    passCount,
    totalGateCount: gates.length,
    shellGates: gates,
    blockers,
    warnings,
    recommendedNextAction: blockers[0] || warnings[0] || "Phase 3D no-op shell is ready; next phase may add shadow runtime contract tests without enabling model execution.",
  };

  const auditExport = {
    generatedAt,
    phase: "3D",
    shellStatus,
    recommendation,
    importId,
    adapterContractId: summary.adapterContractId,
    artifactMetadataId: summary.artifactMetadataId,
    safeBoundarySkeletonId: summary.safeBoundarySkeletonId,
    blockers,
    warnings,
    policy: fallbackPolicy,
  };

  const policy = {
    productionIntegrationAllowed,
    inferenceRuntimeEnabled: false,
    decisionAutomationAllowed,
    canChangeInventoryOrAccounting,
    disabledShadowAdapterShellOnly: true,
  };

  return {
    generatedAt,
    contract: buildContract(),
    summary,
    latestAdapterContract,
    latestArtifactMetadata,
    latestSafeBoundary,
    modelImport,
    shellInterface,
    noOpAdapterManifest,
    auditHookPolicy,
    fallbackPolicy,
    auditExport,
    previousShells,
    operationalPolicy: {
      disabledShadowAdapterShellOnly: true,
      productionIntegrationAllowed,
      inferenceRuntimeEnabled: false,
      decisionAutomationAllowed,
      message: "Phase 3D only defines a disabled no-op shadow adapter implementation shell. It does not execute models or expose inference.",
    },
  };
};

export const recordInventoryStockoutDisabledShadowAdapterShell = async (
  payload: Record<string, unknown>,
): Promise<InventoryStockoutDisabledShadowAdapterShellResponse> => {
  const data = await buildInventoryStockoutDisabledShadowAdapterShell(payload.importId, payload);
  const record = await recordMlDisabledShadowAdapterShell({
    shellKey: data.summary.shellKey,
    shellVersion: data.summary.shellVersion,
    importId: data.summary.importId,
    adapterContractId: data.summary.adapterContractId,
    artifactMetadataId: data.summary.artifactMetadataId,
    safeBoundarySkeletonId: data.summary.safeBoundarySkeletonId,
    modelKey: data.summary.modelKey,
    modelVersion: data.summary.modelVersion,
    adapterStatus: data.summary.adapterStatus,
    registryStatus: data.summary.registryStatus,
    boundaryStatus: data.summary.boundaryStatus,
    shellStatus: data.summary.shellStatus,
    featureFlagKey: data.summary.featureFlagKey,
    featureFlagDefault: data.summary.featureFlagDefault,
    shellEnabled: data.summary.shellEnabled,
    runtimeInvocationAllowed: data.summary.runtimeInvocationAllowed,
    modelExecutionAllowed: data.summary.modelExecutionAllowed,
    inferenceEndpointExposed: data.summary.inferenceEndpointExposed,
    productionIntegrationAllowed: data.summary.productionIntegrationAllowed,
    decisionAutomationAllowed: data.summary.decisionAutomationAllowed,
    inventoryAccountingChangeAllowed: data.summary.canChangeInventoryOrAccounting,
    noOpAdapterOnly: data.summary.noOpAdapterOnly,
    auditHookEnabled: data.summary.auditHookEnabled,
    shadowModeOnly: data.summary.shadowModeOnly,
    fallbackStrategy: data.summary.fallbackStrategy,
    readinessScorePct: data.summary.readinessScorePct,
    blockerCount: data.summary.blockerCount,
    warningCount: data.summary.warningCount,
    passCount: data.summary.passCount,
    totalGateCount: data.summary.totalGateCount,
    shellInterface: data.shellInterface,
    noOpAdapterManifest: data.noOpAdapterManifest,
    auditHookPolicy: data.auditHookPolicy,
    fallbackPolicy: data.fallbackPolicy,
    auditExport: data.auditExport,
    summary: data.summary as unknown as Record<string, unknown>,
    policy: data.operationalPolicy,
    userId: asNumber(payload.userId),
  });
  return { ...data, shellRecord: record as Record<string, unknown> | null };
};

export const listInventoryStockoutDisabledShadowAdapterShells = async (importIdInput: unknown) => {
  return listMlDisabledShadowAdapterShellsByImportId(importIdInput, 50) as Promise<Array<Record<string, unknown>>>;
};

export const buildMlDisabledShadowAdapterShellCatalogSummary = async (): Promise<MlDisabledShadowAdapterShellCatalogSummary> => {
  const importId = await pickLatestImportId();
  const current = await buildInventoryStockoutDisabledShadowAdapterShell(importId);
  const lastShells = await listMlDisabledShadowAdapterShells(25) as Array<Record<string, unknown>>;
  return {
    generatedAt: new Date().toISOString(),
    contract: buildContract(),
    currentDisabledShadowAdapterShell: current.summary,
    lastDisabledShadowAdapterShells: lastShells,
    recommendedNextAction: current.summary.recommendedNextAction,
  };
};
