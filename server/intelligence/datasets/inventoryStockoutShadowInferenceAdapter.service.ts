import {
  getMlModelResultImportById,
  listMlModelArtifactMetadata,
  listMlModelArtifactMetadataByImportId,
  listMlModelResultImports,
  listMlSafeInferenceBoundarySkeletonsByImportId,
  listMlShadowInferenceAdapterContracts,
  listMlShadowInferenceAdapterContractsByImportId,
  recordMlShadowInferenceAdapterContract,
} from "../../db/domains/mlDatasets.db";
import type {
  InventoryStockoutShadowInferenceAdapterContract,
  InventoryStockoutShadowInferenceAdapterGate,
  InventoryStockoutShadowInferenceAdapterResponse,
  InventoryStockoutShadowInferenceAdapterSummary,
  MlShadowInferenceAdapterCatalogSummary,
  ShadowInferenceAdapterContractStatus,
  ShadowInferenceAdapterRecommendation,
} from "./datasetTypes";

const ADAPTER_KEY = "inventory_stockout_shadow_inference_adapter_contract_v1" as const;
const ADAPTER_VERSION = "v1" as const;
const ACCEPTED_ARTIFACT_KEY = "inventory_stockout_model_artifact_metadata_registry_v1" as const;
const ACCEPTED_BOUNDARY_KEY = "inventory_stockout_safe_inference_boundary_skeleton_v1" as const;
const ADAPTER_SCOPE = "phase3c_shadow_adapter_contract_only_no_model_execution" as const;
const FEATURE_FLAG_KEY = "ml.inventoryStockout.shadowAdapter.enabled" as const;
const FALLBACK_STRATEGY = "rule_statistical_baseline_v1_only" as const;

const featureFlagDefault = false as const;
const runtimeInvocationAllowed = false as const;
const modelExecutionAllowed = false as const;
const inferenceEndpointExposed = false as const;
const productionIntegrationAllowed = false as const;
const decisionAutomationAllowed = false as const;
const canChangeInventoryOrAccounting = false as const;
const shadowModeOnly = true as const;

const asNumber = (value: unknown): number | null => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
};

const normalizeText = (value: unknown, fallback: string | null = null): string | null => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const buildContract = (): InventoryStockoutShadowInferenceAdapterContract => ({
  contractKey: ADAPTER_KEY,
  contractVersion: ADAPTER_VERSION,
  generatedAt: new Date().toISOString(),
  purpose: "Define the shadow inference adapter boundary for an inventory-stockout model candidate without invoking model runtime or exposing scoring endpoints.",
  acceptedArtifactRegistryKey: ACCEPTED_ARTIFACT_KEY,
  acceptedBoundaryKey: ACCEPTED_BOUNDARY_KEY,
  adapterScope: ADAPTER_SCOPE,
  requiredReferences: [
    "validatedModelImportId",
    "safeBoundarySkeletonId",
    "modelArtifactMetadataId",
    "modelKey",
    "modelVersion",
    "featureFlagKey",
  ],
  forbiddenBehavior: [
    "Do not execute a model artifact in Kourosh.",
    "Do not expose a scoring or inference endpoint.",
    "Do not call external model services, AI APIs, shell commands, or process runners.",
    "Do not write model outputs into operational inventory, accounting, pricing, invoices, reports, ledgers, purchasing, or customer communication.",
    "Do not override the rule/statistical baseline fallback.",
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
  status: InventoryStockoutShadowInferenceAdapterGate["status"],
  value: unknown,
  message: string,
): InventoryStockoutShadowInferenceAdapterGate => ({ key, label, status, value, message });

const uniqueMessages = (
  gates: InventoryStockoutShadowInferenceAdapterGate[],
  status: InventoryStockoutShadowInferenceAdapterGate["status"],
): string[] => Array.from(new Set(gates.filter((gate) => gate.status === status).map((gate) => gate.message)));

const pickLatestImportId = async (): Promise<number | null> => {
  const imports = await listMlModelResultImports(1) as Array<Record<string, unknown>>;
  return asNumber(imports[0]?.id);
};

export const buildInventoryStockoutShadowInferenceAdapterContract = buildContract;

export const buildInventoryStockoutShadowInferenceAdapter = async (
  importIdInput?: unknown,
  options: Record<string, unknown> = {},
): Promise<InventoryStockoutShadowInferenceAdapterResponse> => {
  const generatedAt = new Date().toISOString();
  const importId = asNumber(importIdInput) ?? asNumber(options.importId) ?? await pickLatestImportId();
  const modelImport = importId ? await getMlModelResultImportById(importId) as Record<string, unknown> | null : null;
  const artifactRecords = importId ? await listMlModelArtifactMetadataByImportId(importId, 25) as Array<Record<string, unknown>> : [];
  const latestArtifactMetadata = artifactRecords[0] || null;
  const safeBoundaries = importId ? await listMlSafeInferenceBoundarySkeletonsByImportId(importId, 25) as Array<Record<string, unknown>> : [];
  const latestSafeBoundary = safeBoundaries[0] || null;
  const previousAdapterContracts = importId ? await listMlShadowInferenceAdapterContractsByImportId(importId, 25) as Array<Record<string, unknown>> : [];

  const modelKey = normalizeText(options.modelKey, normalizeText(latestArtifactMetadata?.modelKey, normalizeText(modelImport?.modelKey)));
  const modelVersion = normalizeText(options.modelVersion, normalizeText(latestArtifactMetadata?.modelVersion, normalizeText(modelImport?.modelVersion)));
  const registryStatus = normalizeText(latestArtifactMetadata?.registryStatus);
  const boundaryStatus = normalizeText(latestSafeBoundary?.boundaryStatus);
  const artifactMetadataReady = registryStatus === "metadata_ready";
  const artifactRuntimeStillDisabled = Number(latestArtifactMetadata?.runtimeLoadAllowed) === 0 || latestArtifactMetadata?.runtimeLoadAllowed === false;
  const artifactInferenceStillDisabled = Number(latestArtifactMetadata?.inferenceEnabled) === 0 || latestArtifactMetadata?.inferenceEnabled === false;
  const safeBoundaryReady = boundaryStatus === "skeleton_ready";
  const boundaryRuntimeStillDisabled = Number(latestSafeBoundary?.runtimeEnabled) === 0 || latestSafeBoundary?.runtimeEnabled === false;
  const boundaryEndpointStillHidden = Number(latestSafeBoundary?.inferenceEndpointExposed) === 0 || latestSafeBoundary?.inferenceEndpointExposed === false;
  const hasImport = Boolean(modelImport?.id);
  const referencesComplete = Boolean(importId && latestArtifactMetadata?.id && latestSafeBoundary?.id && modelKey && modelVersion);

  const gates: InventoryStockoutShadowInferenceAdapterGate[] = [
    buildGate("model_import_exists", "Model Import Audit", hasImport ? "pass" : "block", importId, hasImport ? "Model import audit record is traceable." : "A validated model import audit record is required before shadow adapter planning."),
    buildGate("safe_boundary_ready", "Safe Boundary Skeleton", safeBoundaryReady ? "pass" : "block", boundaryStatus, safeBoundaryReady ? "Phase 3A safe inference boundary skeleton is ready." : "Phase 3A safe inference boundary must be skeleton_ready."),
    buildGate("artifact_metadata_ready", "Artifact Metadata Registry", artifactMetadataReady ? "pass" : "block", registryStatus, artifactMetadataReady ? "Phase 3B artifact metadata registry is ready." : "Phase 3B artifact metadata must be metadata_ready before Phase 3C."),
    buildGate("boundary_runtime_disabled", "Boundary Runtime Disabled", boundaryRuntimeStillDisabled ? "pass" : "block", latestSafeBoundary?.runtimeEnabled, "Safe boundary runtime remains disabled."),
    buildGate("boundary_endpoint_hidden", "No Scoring Endpoint", boundaryEndpointStillHidden ? "pass" : "block", latestSafeBoundary?.inferenceEndpointExposed, "No scoring endpoint is exposed."),
    buildGate("artifact_runtime_disabled", "Artifact Runtime Disabled", artifactRuntimeStillDisabled ? "pass" : "block", latestArtifactMetadata?.runtimeLoadAllowed, "Artifact metadata does not allow runtime loading."),
    buildGate("artifact_inference_disabled", "Artifact Inference Disabled", artifactInferenceStillDisabled ? "pass" : "block", latestArtifactMetadata?.inferenceEnabled, "Artifact metadata does not allow inference."),
    buildGate("references_complete", "Adapter References", referencesComplete ? "pass" : "block", { importId, artifactMetadataId: latestArtifactMetadata?.id, safeBoundarySkeletonId: latestSafeBoundary?.id, modelKey, modelVersion }, referencesComplete ? "Adapter references are complete." : "Import, artifact metadata, safe boundary, model key, and model version references are required."),
    buildGate("contract_only", "Contract Only", !runtimeInvocationAllowed && !modelExecutionAllowed && !inferenceEndpointExposed ? "pass" : "block", { runtimeInvocationAllowed, modelExecutionAllowed, inferenceEndpointExposed }, "Phase 3C defines the adapter contract only; no runtime invocation or endpoint is allowed."),
    buildGate("business_truth_protected", "Business Truth Protected", canChangeInventoryOrAccounting === false ? "pass" : "block", canChangeInventoryOrAccounting, "Inventory/accounting/report truth remains untouched."),
  ];

  const blockers = uniqueMessages(gates, "block");
  const warnings = uniqueMessages(gates, "warning");
  const passCount = gates.filter((gate) => gate.status === "pass").length;
  const readinessScorePct = Math.round((passCount / Math.max(gates.length, 1)) * 100);

  let adapterStatus: ShadowInferenceAdapterContractStatus = "not_started";
  let recommendation: ShadowInferenceAdapterRecommendation = "keep_shadow_adapter_blocked";
  if (!safeBoundaryReady) {
    adapterStatus = "needs_safe_boundary";
    recommendation = "complete_safe_boundary_skeleton";
  } else if (!artifactMetadataReady) {
    adapterStatus = "needs_artifact_metadata";
    recommendation = "complete_artifact_metadata_registry";
  } else if (blockers.length === 0) {
    adapterStatus = "adapter_contract_ready";
    recommendation = "prepare_disabled_shadow_adapter_implementation";
  } else {
    adapterStatus = "blocked";
  }

  const adapterContract = {
    adapterKey: ADAPTER_KEY,
    adapterVersion: ADAPTER_VERSION,
    adapterScope: ADAPTER_SCOPE,
    featureFlagKey: FEATURE_FLAG_KEY,
    featureFlagDefault,
    allowedMode: "shadow_contract_only",
    disabledRuntime: true,
    noScoringEndpoint: true,
    modelExecutionAllowed,
    runtimeInvocationAllowed,
  };

  const ioContract = {
    inputSchema: {
      entityType: "product",
      entityId: "string | number",
      horizonDays: "number",
      featuresSnapshotRef: "predictive_feature_snapshots.id",
      generatedAt: "ISO-8601 timestamp",
    },
    outputSchema: {
      rowKey: "string",
      predictedProbability: "number between 0 and 1",
      predictedLabel: "boolean derived outside Kourosh only in future approved phases",
      explanation: "string | optional",
    },
    currentPhaseBehavior: "schema_definition_only_no_execution",
  };

  const guardrailPolicy = {
    featureFlagRequired: true,
    featureFlagDefault,
    runtimeInvocationAllowed,
    modelExecutionAllowed,
    inferenceEndpointExposed,
    shadowModeOnly,
    auditRequiredBeforeAnyFutureAdapter: true,
    humanReviewRequiredForFutureUse: true,
  };

  const fallbackPolicy = {
    fallbackStrategy: FALLBACK_STRATEGY,
    baselineRemainsSourceOfTruth: true,
    modelOutputCanOverrideBaseline: false,
    modelOutputCanMutateBusinessData: false,
  };

  const summary: InventoryStockoutShadowInferenceAdapterSummary = {
    adapterKey: ADAPTER_KEY,
    adapterVersion: ADAPTER_VERSION,
    generatedAt,
    importId,
    artifactMetadataId: asNumber(latestArtifactMetadata?.id),
    safeBoundarySkeletonId: asNumber(latestSafeBoundary?.id),
    modelKey,
    modelVersion,
    registryStatus,
    boundaryStatus,
    adapterStatus,
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
    shadowModeOnly,
    fallbackStrategy: FALLBACK_STRATEGY,
    blockerCount: blockers.length,
    warningCount: warnings.length,
    passCount,
    totalGateCount: gates.length,
    adapterGates: gates,
    blockers,
    warnings,
    recommendedNextAction: blockers[0] || warnings[0] || "Phase 3C contract is ready; next phase may plan disabled adapter implementation without enabling runtime.",
  };

  const auditExport = {
    generatedAt,
    phase: "3C",
    artifactMetadataId: summary.artifactMetadataId,
    safeBoundarySkeletonId: summary.safeBoundarySkeletonId,
    adapterStatus,
    recommendation,
    blockers,
    warnings,
    policy: fallbackPolicy,
  };

  const policy = {
    productionIntegrationAllowed,
    inferenceRuntimeEnabled: false,
    decisionAutomationAllowed,
    canChangeInventoryOrAccounting,
    shadowInferenceAdapterContractOnly: true,
  };

  return {
    generatedAt,
    contract: buildContract(),
    summary,
    latestArtifactMetadata,
    latestSafeBoundary,
    modelImport,
    adapterContract,
    ioContract,
    guardrailPolicy,
    fallbackPolicy,
    auditExport,
    previousAdapterContracts,
    operationalPolicy: {
      shadowInferenceAdapterContractOnly: true,
      productionIntegrationAllowed,
      inferenceRuntimeEnabled: false,
      decisionAutomationAllowed,
      message: "Phase 3C only defines the disabled shadow adapter contract. It does not execute models or expose inference.",
    },
  };
};

export const recordInventoryStockoutShadowInferenceAdapter = async (
  payload: Record<string, unknown>,
): Promise<InventoryStockoutShadowInferenceAdapterResponse> => {
  const data = await buildInventoryStockoutShadowInferenceAdapter(payload.importId, payload);
  const record = await recordMlShadowInferenceAdapterContract({
    adapterKey: data.summary.adapterKey,
    adapterVersion: data.summary.adapterVersion,
    importId: data.summary.importId,
    artifactMetadataId: data.summary.artifactMetadataId,
    safeBoundarySkeletonId: data.summary.safeBoundarySkeletonId,
    modelKey: data.summary.modelKey,
    modelVersion: data.summary.modelVersion,
    registryStatus: data.summary.registryStatus,
    boundaryStatus: data.summary.boundaryStatus,
    adapterStatus: data.summary.adapterStatus,
    featureFlagKey: data.summary.featureFlagKey,
    featureFlagDefault: data.summary.featureFlagDefault,
    runtimeInvocationAllowed: data.summary.runtimeInvocationAllowed,
    modelExecutionAllowed: data.summary.modelExecutionAllowed,
    inferenceEndpointExposed: data.summary.inferenceEndpointExposed,
    productionIntegrationAllowed: data.summary.productionIntegrationAllowed,
    decisionAutomationAllowed: data.summary.decisionAutomationAllowed,
    inventoryAccountingChangeAllowed: data.summary.canChangeInventoryOrAccounting,
    shadowModeOnly: data.summary.shadowModeOnly,
    fallbackStrategy: data.summary.fallbackStrategy,
    readinessScorePct: data.summary.readinessScorePct,
    blockerCount: data.summary.blockerCount,
    warningCount: data.summary.warningCount,
    passCount: data.summary.passCount,
    totalGateCount: data.summary.totalGateCount,
    adapterContract: data.adapterContract,
    ioContract: data.ioContract,
    guardrailPolicy: data.guardrailPolicy,
    fallbackPolicy: data.fallbackPolicy,
    auditExport: data.auditExport,
    summary: data.summary as unknown as Record<string, unknown>,
    policy: data.operationalPolicy,
    userId: asNumber(payload.userId),
  });
  return { ...data, adapterRecord: record as Record<string, unknown> | null };
};

export const listInventoryStockoutShadowInferenceAdapters = async (importIdInput: unknown) => {
  return listMlShadowInferenceAdapterContractsByImportId(importIdInput, 50) as Promise<Array<Record<string, unknown>>>;
};

export const buildMlShadowInferenceAdapterCatalogSummary = async (): Promise<MlShadowInferenceAdapterCatalogSummary> => {
  const importId = await pickLatestImportId();
  const current = await buildInventoryStockoutShadowInferenceAdapter(importId);
  const lastShadowAdapters = await listMlShadowInferenceAdapterContracts(25) as Array<Record<string, unknown>>;
  return {
    generatedAt: new Date().toISOString(),
    contract: buildContract(),
    currentShadowAdapter: current.summary,
    lastShadowAdapters,
    recommendedNextAction: current.summary.recommendedNextAction,
  };
};
