import {
  getMlModelResultImportById,
  listMlCandidateModelPackages,
  listMlModelApprovalReviewsByImportId,
  listMlModelArtifactMetadataByImportId,
  listMlModelResultImports,
  recordMlCandidateModelPackage,
} from "../../db/domains/mlDatasets.db";
import type {
  CandidateModelPackageRecommendation,
  CandidateModelPackageStatus,
  InventoryStockoutCandidateModelPackageContract,
  InventoryStockoutCandidateModelPackageGate,
  InventoryStockoutCandidateModelPackageResponse,
  InventoryStockoutCandidateModelPackageSummary,
  MlCandidateModelPackageCatalogSummary,
} from "./datasetTypes";
import { buildInventoryStockoutTrainingPackage } from "./inventoryStockoutTrainingPackage.service";

const PACKAGE_KEY = "inventory_stockout_offline_candidate_model_package_v1" as const;
const PACKAGE_VERSION = "v1" as const;
const DATASET_KEY = "inventory_stockout_baseline_v1" as const;
const DATASET_VERSION = "v1" as const;
const TRAINING_PACKAGE_KEY = "inventory_stockout_external_training_package_v1" as const;
const TRAINING_PACKAGE_VERSION = "v1" as const;
const PHASE = "Phase 8A" as const;

const modelExecutionAllowed = false as const;
const runtimeInvocationAllowed = false as const;
const inferenceEndpointExposed = false as const;
const artifactActivationAllowed = false as const;
const artifactBytesLoadingAllowed = false as const;
const productionIntegrationAllowed = false as const;
const decisionAutomationAllowed = false as const;
const canChangeInventoryOrAccounting = false as const;
const canChangePricing = false as const;
const canChangeReports = false as const;
const canChangeLedger = false as const;
const packageContainsExecutableBytes = false as const;
const artifactBinaryStored = false as const;

const asNumber = (value: unknown): number | null => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const asString = (value: unknown): string | null => {
  const text = String(value ?? "").trim();
  return text || null;
};

const buildGate = (
  key: string,
  label: string,
  status: InventoryStockoutCandidateModelPackageGate["status"],
  value: unknown,
  message: string,
): InventoryStockoutCandidateModelPackageGate => ({ key, label, status, value, message });

const uniqueMessages = (
  gates: InventoryStockoutCandidateModelPackageGate[],
  status: InventoryStockoutCandidateModelPackageGate["status"],
) => Array.from(new Set(gates.filter((gate) => gate.status === status).map((gate) => gate.message)));

const chooseRecommendation = (status: CandidateModelPackageStatus): CandidateModelPackageRecommendation => {
  if (status === "package_ready") return "export_offline_candidate_package";
  if (status === "needs_model_result_import") return "import_candidate_results_first";
  if (status === "needs_candidate_approval") return "approve_candidate_review_first";
  if (status === "needs_artifact_metadata") return "complete_artifact_metadata_first";
  return "resolve_safety_blocks_first";
};

export const buildInventoryStockoutCandidateModelPackageContract = (): InventoryStockoutCandidateModelPackageContract => ({
  contractKey: PACKAGE_KEY,
  contractVersion: PACKAGE_VERSION,
  generatedAt: new Date().toISOString(),
  phase: PHASE,
  purpose: "Package the first inventory stockout candidate model evidence for offline governance review without loading, executing, activating, or serving the model inside Kourosh.",
  packageScope: "offline_candidate_model_package_metadata_only",
  acceptedDatasetKey: DATASET_KEY,
  acceptedTrainingPackageKey: TRAINING_PACKAGE_KEY,
  requiredUpstreamEvidence: [
    "validated or warning external model result import",
    "approved_candidate human review",
    "metadata_ready model artifact metadata registry row",
    "inventory stockout external training package lineage",
    "SHA-256 artifact checksum metadata",
  ],
  includedPackageSections: [
    "candidate-package-manifest.json",
    "candidate-model-card.json",
    "lineage.json",
    "evaluation-snapshot.json",
    "safety-policy.json",
  ],
  excludedArtifactClasses: [
    "model binaries",
    "pickle/joblib/onnx/pt files",
    "Python or notebook training code",
    "runtime loader code",
    "inference endpoints",
    "deployment descriptors",
  ],
  forbiddenBehavior: [
    "Do not execute, train, load, activate, deploy, or production-score any model in Phase 8A.",
    "Do not add /infer, /execute, /activate, /deploy, or /production-score routes.",
    "Do not store artifact bytes or executable candidate files in Kourosh.",
    "Do not mutate inventory, accounting, ledger, pricing, reports, or business records.",
    "Do not use this package as production approval or automated decision authority.",
  ],
  operationalPolicy: {
    modelExecutionAllowed,
    runtimeInvocationAllowed,
    inferenceEndpointExposed,
    artifactActivationAllowed,
    artifactBytesLoadingAllowed,
    productionIntegrationAllowed,
    decisionAutomationAllowed,
    canChangeInventoryOrAccounting,
    canChangePricing,
    canChangeReports,
    canChangeLedger,
  },
});

const resolveModelImport = async (options: Record<string, unknown>) => {
  const requestedImportId = asNumber(options.importId);
  if (requestedImportId) return getMlModelResultImportById(requestedImportId);
  const rows = await listMlModelResultImports(50);
  return rows.find((row: Record<string, unknown>) => ["validated", "warning"].includes(String(row.status))) || null;
};

export const buildInventoryStockoutCandidateModelPackage = async (
  options: Record<string, unknown> = {},
): Promise<InventoryStockoutCandidateModelPackageResponse> => {
  const generatedAt = new Date().toISOString();
  const contract = buildInventoryStockoutCandidateModelPackageContract();
  const [trainingPackage, selectedImport] = await Promise.all([
    buildInventoryStockoutTrainingPackage({ limit: 10000 }).then((result) => result.summary),
    resolveModelImport(options),
  ]);

  const importId = asNumber((selectedImport as Record<string, unknown> | null)?.id);
  const approvalReviews = importId ? await listMlModelApprovalReviewsByImportId(importId, 20) : [];
  const approvedReview = approvalReviews.find((row: Record<string, unknown>) => (
    String(row.approvalStatus || row.decision) === "approved_candidate" || String(row.decision) === "approved_candidate"
  )) || null;
  const artifactMetadataRows = importId ? await listMlModelArtifactMetadataByImportId(importId, 20) : [];
  const artifactMetadata = artifactMetadataRows.find((row: Record<string, unknown>) => String(row.registryStatus) === "metadata_ready") || artifactMetadataRows[0] || null;

  const modelKey = asString((selectedImport as Record<string, unknown> | null)?.modelKey);
  const modelVersion = asString((selectedImport as Record<string, unknown> | null)?.modelVersion);
  const importStatus = asString((selectedImport as Record<string, unknown> | null)?.status);
  const approvalStatus = asString((approvedReview as Record<string, unknown> | null)?.approvalStatus || (approvedReview as Record<string, unknown> | null)?.decision);
  const artifactRegistryStatus = asString((artifactMetadata as Record<string, unknown> | null)?.registryStatus);
  const artifactChecksumSha256 = asString((artifactMetadata as Record<string, unknown> | null)?.artifactChecksumSha256);

  const resultImportAccepted = Boolean(selectedImport && ["validated", "warning"].includes(String(importStatus)));
  const approvalReady = Boolean(approvedReview && approvalStatus === "approved_candidate");
  const artifactMetadataReady = Boolean(artifactMetadata && artifactRegistryStatus === "metadata_ready" && artifactChecksumSha256);
  const safetyPolicyStillDisabled =
    modelExecutionAllowed === false &&
    runtimeInvocationAllowed === false &&
    inferenceEndpointExposed === false &&
    artifactActivationAllowed === false &&
    artifactBytesLoadingAllowed === false &&
    productionIntegrationAllowed === false &&
    decisionAutomationAllowed === false &&
    canChangeInventoryOrAccounting === false &&
    canChangePricing === false &&
    canChangeReports === false &&
    canChangeLedger === false &&
    packageContainsExecutableBytes === false &&
    artifactBinaryStored === false;

  const gates: InventoryStockoutCandidateModelPackageGate[] = [
    buildGate("model_result_import_exists", "Model Result Import", selectedImport ? "pass" : "block", importId, selectedImport ? "External candidate model result import exists." : "قبل از package باید نتیجه مدل بیرونی import و score شده باشد."),
    buildGate("model_result_import_accepted", "Accepted Import Status", resultImportAccepted ? "pass" : "block", importStatus, resultImportAccepted ? "Model result import is validated or warning, not rejected." : "Import نتیجه مدل باید validated یا warning باشد."),
    buildGate("candidate_human_approval", "Human Candidate Approval", approvalReady ? "pass" : "block", approvalStatus, approvalReady ? "Human review approved this model as offline candidate." : "قبل از Phase 8A package باید approval review با وضعیت approved_candidate ثبت شود."),
    buildGate("artifact_metadata_ready", "Artifact Metadata Ready", artifactMetadataReady ? "pass" : "block", { artifactRegistryStatus, artifactChecksumSha256 }, artifactMetadataReady ? "Artifact metadata registry is metadata_ready with SHA-256 checksum." : "Model artifact metadata باید metadata_ready و دارای SHA-256 checksum باشد."),
    buildGate("training_lineage_available", "Training Lineage", trainingPackage.packageKey === TRAINING_PACKAGE_KEY ? "pass" : "block", trainingPackage.packageKey, "Candidate package is linked to the inventory stockout external training package."),
    buildGate("metadata_only_package", "No Executable Bytes", !packageContainsExecutableBytes && !artifactBinaryStored ? "pass" : "block", { packageContainsExecutableBytes, artifactBinaryStored }, "Phase 8A package contains metadata/manifest only; no executable bytes are stored."),
    buildGate("runtime_disabled", "Runtime Disabled", modelExecutionAllowed === false && runtimeInvocationAllowed === false && inferenceEndpointExposed === false ? "pass" : "block", { modelExecutionAllowed, runtimeInvocationAllowed, inferenceEndpointExposed }, "Model execution, runtime invocation, and inference endpoints remain disabled."),
    buildGate("business_truth_protected", "Business Truth Protected", !productionIntegrationAllowed && !decisionAutomationAllowed && !canChangeInventoryOrAccounting && !canChangePricing && !canChangeReports && !canChangeLedger ? "pass" : "block", { productionIntegrationAllowed, decisionAutomationAllowed, canChangeInventoryOrAccounting, canChangePricing, canChangeReports, canChangeLedger }, "Inventory, accounting, ledger, pricing, and reports remain untouched."),
    buildGate("artifact_activation_blocked", "Artifact Activation Blocked", !artifactActivationAllowed && !artifactBytesLoadingAllowed ? "pass" : "block", { artifactActivationAllowed, artifactBytesLoadingAllowed }, "Artifact activation and artifact byte loading remain disabled."),
  ];

  const blockers = uniqueMessages(gates, "block");
  const warnings = uniqueMessages(gates, "warning");
  const passCount = gates.filter((gate) => gate.status === "pass").length;
  const totalGateCount = gates.length;
  const readinessScorePct = Math.round((passCount / Math.max(totalGateCount, 1)) * 10000) / 100;

  let status: CandidateModelPackageStatus = "package_ready";
  if (!safetyPolicyStillDisabled) status = "safety_blocked";
  else if (!selectedImport || !resultImportAccepted) status = "needs_model_result_import";
  else if (!approvalReady) status = "needs_candidate_approval";
  else if (!artifactMetadataReady) status = "needs_artifact_metadata";
  else if (blockers.length > 0) status = "safety_blocked";

  const recommendation = chooseRecommendation(status);
  const candidateF1Pct = asNumber((selectedImport as Record<string, unknown> | null)?.f1Pct);
  const baselineF1Pct = asNumber((selectedImport as Record<string, unknown> | null)?.baselineF1Pct);
  const candidateBalancedAccuracyPct = asNumber((selectedImport as Record<string, unknown> | null)?.balancedAccuracyPct);
  const baselineBalancedAccuracyPct = asNumber((selectedImport as Record<string, unknown> | null)?.baselineBalancedAccuracyPct);
  const delta = (left: number | null, right: number | null) => left == null || right == null ? null : Math.round((left - right) * 100) / 100;

  const summary: InventoryStockoutCandidateModelPackageSummary = {
    packageKey: PACKAGE_KEY,
    packageVersion: PACKAGE_VERSION,
    generatedAt,
    phase: PHASE,
    status,
    recommendation,
    readinessScorePct,
    importId,
    artifactMetadataId: asNumber((artifactMetadata as Record<string, unknown> | null)?.id),
    approvalReviewId: asNumber((approvedReview as Record<string, unknown> | null)?.id),
    modelKey,
    modelVersion,
    datasetKey: DATASET_KEY,
    datasetVersion: DATASET_VERSION,
    trainingPackageKey: TRAINING_PACKAGE_KEY,
    trainingPackageVersion: TRAINING_PACKAGE_VERSION,
    modelResultImportStatus: importStatus,
    approvalStatus,
    artifactRegistryStatus,
    artifactChecksumSha256,
    candidateF1Pct,
    baselineF1Pct,
    deltaF1Pct: delta(candidateF1Pct, baselineF1Pct),
    candidateBalancedAccuracyPct,
    baselineBalancedAccuracyPct,
    deltaBalancedAccuracyPct: delta(candidateBalancedAccuracyPct, baselineBalancedAccuracyPct),
    modelExecutionAllowed,
    runtimeInvocationAllowed,
    inferenceEndpointExposed,
    artifactActivationAllowed,
    artifactBytesLoadingAllowed,
    productionIntegrationAllowed,
    decisionAutomationAllowed,
    canChangeInventoryOrAccounting,
    canChangePricing,
    canChangeReports,
    canChangeLedger,
    packageContainsExecutableBytes,
    artifactBinaryStored,
    blockerCount: blockers.length,
    warningCount: warnings.length,
    passCount,
    totalGateCount,
    blockers,
    warnings,
    recommendedNextAction: status === "package_ready"
      ? "Phase 8A package آماده export آفلاین است؛ همچنان فقط metadata/evidence است و inference یا business mutation ندارد."
      : blockers[0] || "برای آماده‌شدن package، evidenceهای upstream را کامل کنید.",
  };

  const lineage = {
    phase: PHASE,
    packageKey: PACKAGE_KEY,
    importId,
    artifactMetadataId: summary.artifactMetadataId,
    approvalReviewId: summary.approvalReviewId,
    datasetKey: DATASET_KEY,
    datasetVersion: DATASET_VERSION,
    trainingPackageKey: TRAINING_PACKAGE_KEY,
    trainingPackageVersion: TRAINING_PACKAGE_VERSION,
    upstreamTrainingPackageStatus: trainingPackage.status,
    modelResultImport: selectedImport || null,
    approvalReview: approvedReview || null,
    artifactMetadata: artifactMetadata || null,
  };

  const evaluationSnapshot = {
    modelKey,
    modelVersion,
    importId,
    modelResultImportStatus: importStatus,
    threshold: (selectedImport as Record<string, unknown> | null)?.threshold ?? null,
    importedRows: (selectedImport as Record<string, unknown> | null)?.importedRows ?? null,
    matchedTestRows: (selectedImport as Record<string, unknown> | null)?.matchedTestRows ?? null,
    candidateF1Pct,
    baselineF1Pct,
    deltaF1Pct: summary.deltaF1Pct,
    candidateBalancedAccuracyPct,
    baselineBalancedAccuracyPct,
    deltaBalancedAccuracyPct: summary.deltaBalancedAccuracyPct,
  };

  const modelCard = {
    modelKey,
    modelVersion,
    algorithmFamily: (artifactMetadata as Record<string, unknown> | null)?.algorithmFamily || "external_offline_candidate",
    artifactSource: (artifactMetadata as Record<string, unknown> | null)?.artifactSource || null,
    artifactStorageRef: (artifactMetadata as Record<string, unknown> | null)?.artifactStorageRef || null,
    artifactChecksumSha256,
    trainedOutsideKourosh: true,
    packagedInsideKourosh: "metadata_only",
    intendedUse: "offline inventory stockout candidate review only",
    forbiddenUse: contract.forbiddenBehavior,
    limitations: [
      "This package does not include executable model bytes.",
      "Kourosh does not load, run, activate, deploy, or serve this candidate in Phase 8A.",
      "Metrics are from imported external test-split predictions and remain advisory until later governed phases.",
    ],
  };

  const safetyPolicy = {
    phase: PHASE,
    metadataOnly: true,
    modelExecutionAllowed,
    runtimeInvocationAllowed,
    inferenceEndpointExposed,
    artifactActivationAllowed,
    artifactBytesLoadingAllowed,
    productionIntegrationAllowed,
    decisionAutomationAllowed,
    canChangeInventoryOrAccounting,
    canChangePricing,
    canChangeReports,
    canChangeLedger,
    packageContainsExecutableBytes,
    artifactBinaryStored,
    nextAllowedStep: "A future phase may prepare candidate package quarantine/intake evidence; Phase 8A does not enable runtime, inference, activation, deployment, or business mutation.",
  };

  const packageManifest = {
    packageKey: PACKAGE_KEY,
    packageVersion: PACKAGE_VERSION,
    createdAt: generatedAt,
    phase: PHASE,
    status,
    recommendation,
    modelKey,
    modelVersion,
    sections: contract.includedPackageSections,
    excludedArtifactClasses: contract.excludedArtifactClasses,
    endpoints: {
      summary: "/api/brain/ml-candidate-model-packages/summary",
      contract: "/api/brain/ml-datasets/inventory-stockout/candidate-model-package/contract",
      packageJson: "/api/brain/ml-datasets/inventory-stockout/candidate-model-package",
      manifestJson: "/api/brain/ml-datasets/inventory-stockout/candidate-model-package/manifest.json",
    },
    lineage,
    evaluationSnapshot,
    safetyPolicy,
  };

  return {
    success: true,
    contract,
    summary,
    gates,
    packageManifest,
    modelCard,
    lineage,
    evaluationSnapshot,
    safetyPolicy,
  };
};

export const recordInventoryStockoutCandidateModelPackageExport = async (
  options: Record<string, unknown> = {},
): Promise<InventoryStockoutCandidateModelPackageResponse> => {
  const pack = await buildInventoryStockoutCandidateModelPackage(options);
  const exportRecord = await recordMlCandidateModelPackage({
    packageKey: pack.summary.packageKey,
    packageVersion: pack.summary.packageVersion,
    candidateModelKey: pack.summary.modelKey,
    candidateModelVersion: pack.summary.modelVersion,
    importId: pack.summary.importId,
    artifactMetadataId: pack.summary.artifactMetadataId,
    approvalReviewId: pack.summary.approvalReviewId,
    datasetKey: pack.summary.datasetKey,
    datasetVersion: pack.summary.datasetVersion,
    trainingPackageKey: pack.summary.trainingPackageKey,
    trainingPackageVersion: pack.summary.trainingPackageVersion,
    packageStatus: pack.summary.status,
    readinessScorePct: pack.summary.readinessScorePct,
    modelExecutionAllowed: pack.summary.modelExecutionAllowed,
    runtimeInvocationAllowed: pack.summary.runtimeInvocationAllowed,
    inferenceEndpointExposed: pack.summary.inferenceEndpointExposed,
    artifactActivationAllowed: pack.summary.artifactActivationAllowed,
    artifactBytesLoadingAllowed: pack.summary.artifactBytesLoadingAllowed,
    productionIntegrationAllowed: pack.summary.productionIntegrationAllowed,
    decisionAutomationAllowed: pack.summary.decisionAutomationAllowed,
    inventoryAccountingChangeAllowed: pack.summary.canChangeInventoryOrAccounting,
    pricingChangeAllowed: pack.summary.canChangePricing,
    reportsChangeAllowed: pack.summary.canChangeReports,
    ledgerChangeAllowed: pack.summary.canChangeLedger,
    packageContainsExecutableBytes: pack.summary.packageContainsExecutableBytes,
    artifactBinaryStored: pack.summary.artifactBinaryStored,
    packageManifest: pack.packageManifest,
    modelCard: pack.modelCard,
    lineage: pack.lineage,
    evaluationSnapshot: pack.evaluationSnapshot,
    safetyPolicy: pack.safetyPolicy,
    summary: pack.summary as unknown as Record<string, unknown>,
    userId: asNumber(options.userId),
  });

  return {
    ...pack,
    exportRecord,
  };
};

export const buildMlCandidateModelPackageCatalogSummary = async (): Promise<MlCandidateModelPackageCatalogSummary> => {
  const [currentCandidateModelPackage, lastCandidateModelPackages] = await Promise.all([
    buildInventoryStockoutCandidateModelPackage().then((result) => result.summary),
    listMlCandidateModelPackages(10).catch(() => []),
  ]);
  return {
    generatedAt: new Date().toISOString(),
    contract: buildInventoryStockoutCandidateModelPackageContract(),
    currentCandidateModelPackage,
    lastCandidateModelPackages,
    recommendedNextAction: currentCandidateModelPackage.recommendedNextAction,
  };
};
