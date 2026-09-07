import {
  getMlModelResultImportById,
  listMlModelArtifactMetadata,
  listMlModelArtifactMetadataByImportId,
  listMlModelResultImports,
  listMlSafeInferenceBoundarySkeletonsByImportId,
  recordMlModelArtifactMetadata,
} from "../../db/domains/mlDatasets.db";
import type {
  InventoryStockoutModelArtifactMetadataContract,
  InventoryStockoutModelArtifactMetadataGate,
  InventoryStockoutModelArtifactMetadataResponse,
  InventoryStockoutModelArtifactMetadataSummary,
  MlModelArtifactMetadataCatalogSummary,
  ModelArtifactMetadataRecommendation,
  ModelArtifactMetadataRegistryStatus,
} from "./datasetTypes";

const ARTIFACT_KEY = "inventory_stockout_model_artifact_metadata_registry_v1" as const;
const ARTIFACT_VERSION = "v1" as const;
const ACCEPTED_BOUNDARY_KEY = "inventory_stockout_safe_inference_boundary_skeleton_v1" as const;
const REGISTRY_SCOPE = "phase3b_metadata_registry_only_no_runtime_load" as const;
const CHECKSUM_ALGORITHM = "sha256" as const;

const runtimeLoadAllowed = false as const;
const artifactBinaryStored = false as const;
const inferenceEnabled = false as const;
const productionIntegrationAllowed = false as const;
const decisionAutomationAllowed = false as const;
const canChangeInventoryOrAccounting = false as const;

const asNumber = (value: unknown): number | null => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
};

const normalizeText = (value: unknown, fallback: string | null = null): string | null => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const isSha256 = (value: unknown): value is string => (
  typeof value === "string" && /^[a-fA-F0-9]{64}$/.test(value.trim())
);

const buildContract = (): InventoryStockoutModelArtifactMetadataContract => ({
  contractKey: ARTIFACT_KEY,
  contractVersion: ARTIFACT_VERSION,
  generatedAt: new Date().toISOString(),
  purpose: "Register metadata for an externally trained inventory-stockout model artifact without storing binaries, loading runtime code, or enabling inference.",
  acceptedBoundaryKey: ACCEPTED_BOUNDARY_KEY,
  registryScope: REGISTRY_SCOPE,
  requiredMetadata: [
    "modelKey",
    "modelVersion",
    "artifactSource",
    "artifactStorageRef",
    "artifactChecksumSha256",
    "checksumAlgorithm",
    "algorithmFamily",
    "ownerName",
    "ownerTeam",
    "trainingPackageKey",
    "trainingPackageVersion",
    "safeBoundarySkeletonId",
    "governanceSignoffId",
  ],
  forbiddenBehavior: [
    "Do not upload or store model binaries inside Kourosh.",
    "Do not load model artifacts at runtime.",
    "Do not expose an inference/scoring endpoint.",
    "Do not call external training services, AI APIs, process runners, or model runtimes.",
    "Do not mutate inventory, accounting, invoices, ledgers, reports, pricing, purchasing, or customer communication.",
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
  status: InventoryStockoutModelArtifactMetadataGate["status"],
  value: unknown,
  message: string,
): InventoryStockoutModelArtifactMetadataGate => ({ key, label, status, value, message });

const uniqueMessages = (
  gates: InventoryStockoutModelArtifactMetadataGate[],
  status: InventoryStockoutModelArtifactMetadataGate["status"],
): string[] => Array.from(new Set(gates.filter((gate) => gate.status === status).map((gate) => gate.message)));

const pickLatestImportId = async (): Promise<number | null> => {
  const imports = await listMlModelResultImports(1) as Array<Record<string, unknown>>;
  return asNumber(imports[0]?.id);
};

export const buildInventoryStockoutModelArtifactMetadataContract = buildContract;

export const buildInventoryStockoutModelArtifactMetadata = async (
  importIdInput?: unknown,
  options: Record<string, unknown> = {},
): Promise<InventoryStockoutModelArtifactMetadataResponse> => {
  const generatedAt = new Date().toISOString();
  const importId = asNumber(importIdInput) ?? asNumber(options.importId) ?? await pickLatestImportId();
  const modelImport = importId ? await getMlModelResultImportById(importId) as Record<string, unknown> | null : null;
  const previousArtifactMetadata = importId ? await listMlModelArtifactMetadataByImportId(importId, 25) as Array<Record<string, unknown>> : [];
  const safeBoundaries = importId ? await listMlSafeInferenceBoundarySkeletonsByImportId(importId, 25) as Array<Record<string, unknown>> : [];
  const latestSafeBoundary = safeBoundaries[0] || null;

  const modelKey = normalizeText(options.modelKey, normalizeText(modelImport?.modelKey));
  const modelVersion = normalizeText(options.modelVersion, normalizeText(modelImport?.modelVersion));
  const artifactSource = normalizeText(options.artifactSource, normalizeText(modelImport?.importKey));
  const artifactStorageRef = normalizeText(options.artifactStorageRef, normalizeText(options.storageRef));
  const artifactChecksumSha256 = normalizeText(options.artifactChecksumSha256, normalizeText(options.checksumSha256));
  const algorithmFamily = normalizeText(options.algorithmFamily, "external_offline_model");
  const ownerName = normalizeText(options.ownerName, normalizeText(options.modelOwner));
  const ownerTeam = normalizeText(options.ownerTeam, normalizeText(options.modelOwnerTeam, "MLOps Governance"));
  const trainingPackageKey = normalizeText(options.trainingPackageKey, normalizeText(modelImport?.packageKey));
  const trainingPackageVersion = normalizeText(options.trainingPackageVersion, normalizeText(modelImport?.packageVersion));
  const datasetKey = normalizeText(options.datasetKey, normalizeText(modelImport?.datasetKey, "inventory_stockout_baseline_v1"));
  const datasetVersion = normalizeText(options.datasetVersion, normalizeText(modelImport?.datasetVersion, "v1"));

  const safeBoundaryReady = latestSafeBoundary?.boundaryStatus === "skeleton_ready";
  const boundaryRuntimeStillDisabled = Number(latestSafeBoundary?.runtimeEnabled) === 0 || latestSafeBoundary?.runtimeEnabled === false;
  const boundaryEndpointStillHidden = Number(latestSafeBoundary?.inferenceEndpointExposed) === 0 || latestSafeBoundary?.inferenceEndpointExposed === false;
  const boundaryProductionStillDisabled = Number(latestSafeBoundary?.productionIntegrationAllowed) === 0 || latestSafeBoundary?.productionIntegrationAllowed === false;
  const hasImport = Boolean(modelImport?.id);
  const hasCoreMetadata = Boolean(modelKey && modelVersion && artifactSource && artifactStorageRef && artifactChecksumSha256 && algorithmFamily && ownerName && ownerTeam);
  const checksumValid = isSha256(artifactChecksumSha256);
  const lineageComplete = Boolean(trainingPackageKey && trainingPackageVersion && datasetKey && datasetVersion && latestSafeBoundary?.id);
  const approvalTrailStatus = safeBoundaryReady && hasImport ? "phase2w_and_phase3a_referenced" : "incomplete";

  const gates: InventoryStockoutModelArtifactMetadataGate[] = [
    buildGate("model_import_exists", "Model Import Audit", hasImport ? "pass" : "block", importId, hasImport ? "Model import audit record is traceable." : "A validated model import audit record is required before registering artifact metadata."),
    buildGate("safe_boundary_ready", "Safe Boundary Skeleton", safeBoundaryReady ? "pass" : "block", latestSafeBoundary?.boundaryStatus, safeBoundaryReady ? "Phase 3A safe inference boundary skeleton is ready." : "Phase 3A safe inference boundary skeleton must be skeleton_ready."),
    buildGate("boundary_runtime_disabled", "Runtime Disabled", boundaryRuntimeStillDisabled ? "pass" : "block", latestSafeBoundary?.runtimeEnabled, "Safe boundary runtime remains disabled."),
    buildGate("boundary_endpoint_hidden", "No Scoring Endpoint", boundaryEndpointStillHidden ? "pass" : "block", latestSafeBoundary?.inferenceEndpointExposed, "Safe boundary has no scoring endpoint exposed."),
    buildGate("boundary_production_disabled", "No Production Integration", boundaryProductionStillDisabled ? "pass" : "block", latestSafeBoundary?.productionIntegrationAllowed, "Safe boundary blocks production integration."),
    buildGate("core_metadata_complete", "Core Artifact Metadata", hasCoreMetadata ? "pass" : "block", { modelKey, modelVersion, artifactSource, artifactStorageRef, ownerName, ownerTeam }, hasCoreMetadata ? "Core model artifact metadata is complete." : "Model key/version, source, storage reference, checksum, algorithm family, owner name, and owner team are required."),
    buildGate("checksum_valid", "SHA-256 Checksum", checksumValid ? "pass" : "block", artifactChecksumSha256, checksumValid ? "Artifact checksum is a valid SHA-256 fingerprint." : "artifactChecksumSha256 must be a 64-character hexadecimal SHA-256 checksum."),
    buildGate("lineage_complete", "Training Lineage", lineageComplete ? "pass" : "warning", { trainingPackageKey, trainingPackageVersion, datasetKey, datasetVersion }, lineageComplete ? "Training package and dataset lineage are traceable." : "Training package, dataset, and safe boundary lineage should be complete before Phase 3C shadow adapter planning."),
    buildGate("metadata_only", "Metadata Only", !artifactBinaryStored && !runtimeLoadAllowed && !inferenceEnabled ? "pass" : "block", { artifactBinaryStored, runtimeLoadAllowed, inferenceEnabled }, "Kourosh stores metadata only; no binary artifact, runtime load, or inference is allowed."),
    buildGate("business_truth_protected", "Business Truth Protected", canChangeInventoryOrAccounting === false ? "pass" : "block", canChangeInventoryOrAccounting, "Inventory/accounting/report truth remains untouched."),
  ];

  const blockers = uniqueMessages(gates, "block");
  const warnings = uniqueMessages(gates, "warning");
  const passCount = gates.filter((gate) => gate.status === "pass").length;
  const totalGateCount = gates.length;
  const readinessScorePct = Math.round((passCount / Math.max(totalGateCount, 1)) * 10000) / 100;

  let registryStatus: ModelArtifactMetadataRegistryStatus = "not_started";
  let recommendation: ModelArtifactMetadataRecommendation = "keep_artifact_blocked";
  if (!latestSafeBoundary) {
    registryStatus = "needs_safe_boundary";
    recommendation = "complete_safe_boundary_skeleton";
  } else if (!hasCoreMetadata || !checksumValid) {
    registryStatus = "needs_artifact_metadata";
    recommendation = "complete_artifact_metadata";
  } else if (blockers.length > 0) {
    registryStatus = "blocked";
    recommendation = "keep_artifact_blocked";
  } else {
    registryStatus = "metadata_ready";
    recommendation = "prepare_shadow_adapter_contract";
  }

  const metadataContract = {
    artifactKey: ARTIFACT_KEY,
    artifactVersion: ARTIFACT_VERSION,
    registryScope: REGISTRY_SCOPE,
    checksumAlgorithm: CHECKSUM_ALGORITHM,
    requiredBeforePhase3C: ["artifactChecksumSha256", "artifactStorageRef", "ownerName", "ownerTeam", "safeBoundarySkeletonId", "governanceSignoffId"],
    forbiddenCurrentActions: buildContract().forbiddenBehavior,
  };

  const artifactManifest = {
    modelKey,
    modelVersion,
    artifactStatus: "metadata_only",
    artifactSource,
    artifactStorageRef,
    artifactChecksumSha256,
    checksumAlgorithm: CHECKSUM_ALGORITHM,
    algorithmFamily,
    binaryStoredInKourosh: artifactBinaryStored,
    runtimeLoadAllowed,
    inferenceEnabled,
  };

  const lineage = {
    importId,
    modelImportKey: modelImport?.importKey || null,
    safeBoundarySkeletonId: asNumber(latestSafeBoundary?.id),
    governanceSignoffId: asNumber(latestSafeBoundary?.governanceSignoffId),
    trainingPackageKey,
    trainingPackageVersion,
    datasetKey,
    datasetVersion,
    sourceSystem: "external_offline_training_pipeline",
  };

  const approvalTrail = {
    status: approvalTrailStatus,
    phase2GovernanceReferenced: Boolean(latestSafeBoundary?.governanceSignoffId),
    phase3aSafeBoundaryReferenced: Boolean(latestSafeBoundary?.id),
    ownerName,
    ownerTeam,
    requiresFuturePhase3CApproval: true,
  };

  const safetyPolicy = {
    metadataOnly: true,
    artifactBinaryStored,
    runtimeLoadAllowed,
    inferenceEnabled,
    productionIntegrationAllowed,
    decisionAutomationAllowed,
    canChangeInventoryOrAccounting,
    nextAllowedStep: "Phase 3C can plan a shadow adapter contract only after metadata_ready; it still must not change operational truth.",
  };

  const summary: InventoryStockoutModelArtifactMetadataSummary = {
    artifactKey: ARTIFACT_KEY,
    artifactVersion: ARTIFACT_VERSION,
    generatedAt,
    importId,
    safeBoundarySkeletonId: asNumber(latestSafeBoundary?.id),
    governanceSignoffId: asNumber(latestSafeBoundary?.governanceSignoffId),
    modelKey,
    modelVersion,
    artifactStatus: "metadata_only",
    artifactSource,
    artifactStorageRef,
    artifactChecksumSha256,
    checksumAlgorithm: CHECKSUM_ALGORITHM,
    algorithmFamily,
    trainingPackageKey,
    trainingPackageVersion,
    datasetKey,
    datasetVersion,
    ownerName,
    ownerTeam,
    approvalTrailStatus,
    registryStatus,
    recommendation,
    readinessScorePct,
    runtimeLoadAllowed,
    artifactBinaryStored,
    inferenceEnabled,
    productionIntegrationAllowed,
    decisionAutomationAllowed,
    canChangeInventoryOrAccounting,
    blockerCount: blockers.length,
    warningCount: warnings.length,
    passCount,
    totalGateCount,
    metadataGates: gates,
    blockers,
    warnings,
    recommendedNextAction: recommendation === "prepare_shadow_adapter_contract"
      ? "Artifact metadata is ready for Phase 3C shadow adapter contract planning. Keep runtime loading and inference disabled."
      : blockers[0] || warnings[0] || "Complete Phase 3A safe boundary and artifact metadata before moving toward shadow adapter planning.",
  };

  const auditExport = {
    generatedAt,
    artifactKey: ARTIFACT_KEY,
    importId,
    safeBoundarySkeletonId: summary.safeBoundarySkeletonId,
    governanceSignoffId: summary.governanceSignoffId,
    registryStatus,
    readinessScorePct,
    blockers,
    warnings,
    metadataOnly: true,
    policy: buildContract().operationalPolicy,
  };

  return {
    generatedAt,
    contract: buildContract(),
    summary,
    latestSafeBoundary,
    modelImport,
    metadataContract,
    artifactManifest,
    lineage,
    approvalTrail,
    safetyPolicy,
    auditExport,
    previousArtifactMetadata,
    operationalPolicy: {
      modelArtifactMetadataOnly: true,
      productionIntegrationAllowed: false,
      inferenceRuntimeEnabled: false,
      decisionAutomationAllowed: false,
      message: "Phase 3B registers model artifact metadata only. It does not store binaries, load models, expose inference, automate decisions, or alter operational/financial truth.",
    },
  };
};

export const recordInventoryStockoutModelArtifactMetadata = async (
  payload: Record<string, unknown> = {},
): Promise<InventoryStockoutModelArtifactMetadataResponse> => {
  const data = await buildInventoryStockoutModelArtifactMetadata(payload.importId, payload);
  const record = await recordMlModelArtifactMetadata({
    artifactKey: ARTIFACT_KEY,
    artifactVersion: ARTIFACT_VERSION,
    importId: data.summary.importId,
    safeBoundarySkeletonId: data.summary.safeBoundarySkeletonId,
    governanceSignoffId: data.summary.governanceSignoffId,
    modelKey: data.summary.modelKey,
    modelVersion: data.summary.modelVersion,
    artifactStatus: data.summary.artifactStatus,
    artifactSource: data.summary.artifactSource,
    artifactStorageRef: data.summary.artifactStorageRef,
    artifactChecksumSha256: data.summary.artifactChecksumSha256,
    checksumAlgorithm: data.summary.checksumAlgorithm,
    algorithmFamily: data.summary.algorithmFamily,
    trainingPackageKey: data.summary.trainingPackageKey,
    trainingPackageVersion: data.summary.trainingPackageVersion,
    datasetKey: data.summary.datasetKey,
    datasetVersion: data.summary.datasetVersion,
    ownerName: data.summary.ownerName,
    ownerTeam: data.summary.ownerTeam,
    approvalTrailStatus: data.summary.approvalTrailStatus,
    registryStatus: data.summary.registryStatus,
    runtimeLoadAllowed: data.summary.runtimeLoadAllowed,
    artifactBinaryStored: data.summary.artifactBinaryStored,
    inferenceEnabled: data.summary.inferenceEnabled,
    productionIntegrationAllowed: data.summary.productionIntegrationAllowed,
    decisionAutomationAllowed: data.summary.decisionAutomationAllowed,
    inventoryAccountingChangeAllowed: data.summary.canChangeInventoryOrAccounting,
    metadataContract: data.metadataContract,
    artifactManifest: data.artifactManifest,
    lineage: data.lineage,
    approvalTrail: data.approvalTrail,
    safetyPolicy: data.safetyPolicy,
    auditExport: data.auditExport,
    summary: data.summary as unknown as Record<string, unknown>,
    policy: data.operationalPolicy,
    userId: asNumber(payload.userId),
  }) as Record<string, unknown> | null;
  return { ...data, artifactRecord: record };
};

export const listInventoryStockoutModelArtifactMetadata = async (importIdInput: unknown) => {
  return listMlModelArtifactMetadataByImportId(importIdInput, 50) as Promise<Array<Record<string, unknown>>>;
};

export const buildMlModelArtifactMetadataCatalogSummary = async (): Promise<MlModelArtifactMetadataCatalogSummary> => {
  const importId = await pickLatestImportId();
  const current = await buildInventoryStockoutModelArtifactMetadata(importId);
  const lastArtifactMetadata = await listMlModelArtifactMetadata(25) as Array<Record<string, unknown>>;
  return {
    generatedAt: new Date().toISOString(),
    contract: buildContract(),
    currentArtifactMetadata: current.summary,
    lastArtifactMetadata,
    recommendedNextAction: current.summary.recommendedNextAction,
  };
};
