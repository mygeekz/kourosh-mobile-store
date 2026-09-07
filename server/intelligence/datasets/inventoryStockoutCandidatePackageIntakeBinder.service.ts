import { createHash } from "node:crypto";
import {
  listMlCandidateModelPackages,
  listMlCandidatePackageIntakeBinders,
  recordMlCandidatePackageIntakeBinder,
} from "../../db/domains/mlDatasets.db";
import type {
  CandidatePackageIntakeBinderRecommendation,
  CandidatePackageIntakeBinderStatus,
  InventoryStockoutCandidatePackageIntakeBinderContract,
  InventoryStockoutCandidatePackageIntakeBinderGate,
  InventoryStockoutCandidatePackageIntakeBinderResponse,
  InventoryStockoutCandidatePackageIntakeBinderSummary,
  MlCandidatePackageIntakeBinderCatalogSummary,
} from "./datasetTypes";
import { buildInventoryStockoutCandidateModelPackage } from "./inventoryStockoutCandidateModelPackage.service";

const BINDER_KEY = "inventory_stockout_candidate_package_intake_quarantine_binder_v1" as const;
const BINDER_VERSION = "v1" as const;
const PACKAGE_KEY = "inventory_stockout_offline_candidate_model_package_v1" as const;
const PACKAGE_VERSION = "v1" as const;
const PHASE = "Phase 8B" as const;

const modelExecutionAllowed = false as const;
const runtimeInvocationAllowed = false as const;
const inferenceEndpointExposed = false as const;
const artifactActivationAllowed = false as const;
const artifactBytesLoadingAllowed = false as const;
const artifactIntakeCanLoadBytes = false as const;
const artifactIntakeCanPersistBytes = false as const;
const quarantineCanExecuteArtifact = false as const;
const quarantineCanActivateArtifact = false as const;
const productionIntegrationAllowed = false as const;
const decisionAutomationAllowed = false as const;
const canChangeInventoryOrAccounting = false as const;
const canChangePricing = false as const;
const canChangeReports = false as const;
const canChangeLedger = false as const;
const binderContainsExecutableBytes = false as const;
const packageBytesLoaded = false as const;
const packageBytesPersisted = false as const;

const asNumber = (value: unknown): number | null => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const asString = (value: unknown): string | null => {
  const text = String(value ?? "").trim();
  return text || null;
};


const sha256 = (value: unknown): string => createHash("sha256").update(JSON.stringify(value)).digest("hex");

const buildGate = (
  key: string,
  label: string,
  status: InventoryStockoutCandidatePackageIntakeBinderGate["status"],
  value: unknown,
  message: string,
): InventoryStockoutCandidatePackageIntakeBinderGate => ({ key, label, status, value, message });

const uniqueMessages = (
  gates: InventoryStockoutCandidatePackageIntakeBinderGate[],
  status: InventoryStockoutCandidatePackageIntakeBinderGate["status"],
) => Array.from(new Set(gates.filter((gate) => gate.status === status).map((gate) => gate.message)));

const chooseRecommendation = (status: CandidatePackageIntakeBinderStatus): CandidatePackageIntakeBinderRecommendation => {
  if (status === "binder_ready") return "prepare_metadata_only_intake_binder";
  if (status === "needs_phase8a_package_ready") return "complete_phase8a_package_first";
  if (status === "needs_exported_candidate_package") return "record_candidate_package_export_first";
  if (status === "needs_quarantine_review_plan") return "document_quarantine_review_plan_first";
  return "resolve_safety_blocks_first";
};

export const buildInventoryStockoutCandidatePackageIntakeBinderContract = (): InventoryStockoutCandidatePackageIntakeBinderContract => ({
  contractKey: BINDER_KEY,
  contractVersion: BINDER_VERSION,
  generatedAt: new Date().toISOString(),
  phase: PHASE,
  purpose: "Prepare a metadata-only intake, quarantine, and review-binder readiness packet for the Phase 8A inventory stockout candidate package without loading package bytes or enabling any runtime behavior.",
  binderScope: "offline_candidate_package_intake_quarantine_metadata_only",
  requiredUpstreamPackageKey: PACKAGE_KEY,
  requiredUpstreamPackageVersion: PACKAGE_VERSION,
  requiredUpstreamEvidence: [
    "Phase 8A candidate package summary with status package_ready",
    "Persisted Phase 8A candidate package export metadata row",
    "candidate package manifest, model card, lineage, evaluation snapshot, and safety policy metadata",
    "SHA-256 artifact checksum metadata from upstream artifact registry",
    "human-readable quarantine review plan for metadata-only evidence review",
  ],
  includedBinderSections: [
    "candidate-package-intake-manifest.json",
    "candidate-package-quarantine-readiness-plan.json",
    "candidate-package-review-binder-payload.json",
    "candidate-package-safety-policy.json",
    "candidate-package-readiness-summary.json",
  ],
  excludedArtifactClasses: [
    "model binaries",
    "candidate package ZIP bytes",
    "pickle/joblib/onnx/pt files",
    "runtime loader code",
    "inference endpoints",
    "activation or deployment descriptors",
  ],
  forbiddenBehavior: [
    "Do not load, parse, execute, train, activate, deploy, or production-score model artifacts in Phase 8B.",
    "Do not persist candidate package bytes or artifact bytes in Kourosh.",
    "Do not add /infer, /execute, /activate, /deploy, or /production-score routes.",
    "Do not mutate inventory, accounting, ledger, pricing, reports, or business records.",
    "Do not treat this binder as production approval or automated decision authority.",
  ],
  operationalPolicy: {
    modelExecutionAllowed,
    runtimeInvocationAllowed,
    inferenceEndpointExposed,
    artifactActivationAllowed,
    artifactBytesLoadingAllowed,
    artifactIntakeCanLoadBytes,
    artifactIntakeCanPersistBytes,
    quarantineCanExecuteArtifact,
    quarantineCanActivateArtifact,
    productionIntegrationAllowed,
    decisionAutomationAllowed,
    canChangeInventoryOrAccounting,
    canChangePricing,
    canChangeReports,
    canChangeLedger,
  },
});

export const buildInventoryStockoutCandidatePackageIntakeBinder = async (
  options: Record<string, unknown> = {},
): Promise<InventoryStockoutCandidatePackageIntakeBinderResponse> => {
  const generatedAt = new Date().toISOString();
  const contract = buildInventoryStockoutCandidatePackageIntakeBinderContract();
  const [candidatePackageResponse, lastCandidatePackages] = await Promise.all([
    buildInventoryStockoutCandidateModelPackage(options),
    listMlCandidateModelPackages(10).catch(() => []),
  ]);
  const candidatePackage = candidatePackageResponse.summary;
  const latestPersistedPackage = (lastCandidatePackages || []).find((row: Record<string, unknown>) => String(row.packageKey) === PACKAGE_KEY) || null;
  const packageId = asNumber((latestPersistedPackage as Record<string, unknown> | null)?.id);
  const packageStatus = asString((latestPersistedPackage as Record<string, unknown> | null)?.packageStatus) || candidatePackage.status || null;
  const upstreamPackageReady = candidatePackage.status === "package_ready";
  const exportedPackageExists = Boolean(packageId);
  const quarantineReviewPlanJson = (options.quarantineReviewPlanJson && typeof options.quarantineReviewPlanJson === "object")
    ? options.quarantineReviewPlanJson as Record<string, unknown>
    : {
        reviewMode: "metadata_only_quarantine_review_readiness",
        requiredReviewerRole: "Human MLOps reviewer",
        requiredChecks: [
          "Verify Phase 8A package status is package_ready.",
          "Verify package manifest, model card, lineage, evaluation snapshot, and safety policy are present.",
          "Verify artifact checksum metadata is present and no artifact bytes were loaded or persisted.",
          "Verify no runtime, inference, activation, deployment, or business mutation capability is enabled.",
        ],
      };
  const quarantinePlanDocumented = Object.keys(quarantineReviewPlanJson).length > 0;
  const safetyPolicyStillDisabled =
    modelExecutionAllowed === false &&
    runtimeInvocationAllowed === false &&
    inferenceEndpointExposed === false &&
    artifactActivationAllowed === false &&
    artifactBytesLoadingAllowed === false &&
    artifactIntakeCanLoadBytes === false &&
    artifactIntakeCanPersistBytes === false &&
    quarantineCanExecuteArtifact === false &&
    quarantineCanActivateArtifact === false &&
    productionIntegrationAllowed === false &&
    decisionAutomationAllowed === false &&
    canChangeInventoryOrAccounting === false &&
    canChangePricing === false &&
    canChangeReports === false &&
    canChangeLedger === false &&
    binderContainsExecutableBytes === false &&
    packageBytesLoaded === false &&
    packageBytesPersisted === false;

  const gates: InventoryStockoutCandidatePackageIntakeBinderGate[] = [
    buildGate("phase8a_package_ready", "Phase 8A Package Ready", upstreamPackageReady ? "pass" : "block", candidatePackage.status, upstreamPackageReady ? "Phase 8A candidate package is package_ready." : "Phase 8A candidate package must be package_ready before Phase 8B intake binder readiness."),
    buildGate("persisted_package_export_exists", "Persisted Package Export", exportedPackageExists ? "pass" : "block", packageId, exportedPackageExists ? "A Phase 8A candidate package export metadata row exists." : "Record/export the Phase 8A candidate package metadata before preparing intake/quarantine binder readiness."),
    buildGate("artifact_checksum_present", "Artifact Checksum", candidatePackage.artifactChecksumSha256 ? "pass" : "block", candidatePackage.artifactChecksumSha256, candidatePackage.artifactChecksumSha256 ? "Artifact checksum metadata is available for traceability." : "Artifact checksum SHA-256 metadata is required for quarantine traceability."),
    buildGate("quarantine_review_plan_documented", "Quarantine Review Plan", quarantinePlanDocumented ? "pass" : "block", quarantineReviewPlanJson, quarantinePlanDocumented ? "Metadata-only quarantine review plan is documented." : "A metadata-only quarantine review plan is required."),
    buildGate("metadata_only_intake", "Metadata-only Intake", !packageBytesLoaded && !packageBytesPersisted && !binderContainsExecutableBytes ? "pass" : "block", { packageBytesLoaded, packageBytesPersisted, binderContainsExecutableBytes }, "Phase 8B intake binder stores metadata/readiness evidence only; no package bytes or executable bytes are loaded or persisted."),
    buildGate("runtime_disabled", "Runtime Disabled", !modelExecutionAllowed && !runtimeInvocationAllowed && !inferenceEndpointExposed ? "pass" : "block", { modelExecutionAllowed, runtimeInvocationAllowed, inferenceEndpointExposed }, "Model execution, runtime invocation, and inference endpoints remain disabled."),
    buildGate("artifact_activation_blocked", "Artifact Activation Blocked", !artifactActivationAllowed && !artifactBytesLoadingAllowed && !artifactIntakeCanLoadBytes && !artifactIntakeCanPersistBytes ? "pass" : "block", { artifactActivationAllowed, artifactBytesLoadingAllowed, artifactIntakeCanLoadBytes, artifactIntakeCanPersistBytes }, "Artifact activation, byte loading, and byte persistence remain disabled."),
    buildGate("quarantine_non_executing", "Quarantine Non-executing", !quarantineCanExecuteArtifact && !quarantineCanActivateArtifact ? "pass" : "block", { quarantineCanExecuteArtifact, quarantineCanActivateArtifact }, "Quarantine review readiness cannot execute or activate artifacts."),
    buildGate("business_mutation_blocked", "Business Mutation Blocked", !productionIntegrationAllowed && !decisionAutomationAllowed && !canChangeInventoryOrAccounting && !canChangePricing && !canChangeReports && !canChangeLedger ? "pass" : "block", { productionIntegrationAllowed, decisionAutomationAllowed, canChangeInventoryOrAccounting, canChangePricing, canChangeReports, canChangeLedger }, "Production integration, decision automation, and business mutation remain blocked."),
  ];

  const blockers = uniqueMessages(gates, "block");
  const warnings = uniqueMessages(gates, "warning");
  const passCount = gates.filter((gate) => gate.status === "pass").length;
  const totalGateCount = gates.length;
  const readinessScorePct = Math.round((passCount / Math.max(totalGateCount, 1)) * 10000) / 100;

  let status: CandidatePackageIntakeBinderStatus = "binder_ready";
  if (!safetyPolicyStillDisabled) status = "safety_blocked";
  else if (!upstreamPackageReady) status = "needs_phase8a_package_ready";
  else if (!exportedPackageExists) status = "needs_exported_candidate_package";
  else if (!quarantinePlanDocumented) status = "needs_quarantine_review_plan";
  else if (blockers.length > 0) status = "safety_blocked";

  const recommendation = chooseRecommendation(status);
  const safetyPolicy = {
    phase: PHASE,
    metadataOnly: true,
    modelExecutionAllowed,
    runtimeInvocationAllowed,
    inferenceEndpointExposed,
    artifactActivationAllowed,
    artifactBytesLoadingAllowed,
    artifactIntakeCanLoadBytes,
    artifactIntakeCanPersistBytes,
    quarantineCanExecuteArtifact,
    quarantineCanActivateArtifact,
    productionIntegrationAllowed,
    decisionAutomationAllowed,
    canChangeInventoryOrAccounting,
    canChangePricing,
    canChangeReports,
    canChangeLedger,
    binderContainsExecutableBytes,
    packageBytesLoaded,
    packageBytesPersisted,
    nextAllowedStep: "A future phase may add human review/signoff around this metadata-only binder; Phase 8B does not enable artifact loading, execution, activation, deployment, inference, or business mutation.",
  };

  const intakeManifest = {
    binderKey: BINDER_KEY,
    binderVersion: BINDER_VERSION,
    generatedAt,
    phase: PHASE,
    packageId,
    packageKey: PACKAGE_KEY,
    packageVersion: PACKAGE_VERSION,
    packageStatus,
    candidatePackageSummary: candidatePackage,
    latestPersistedPackage,
    intakeMode: "metadata_only_intake_readiness",
    quarantineMode: "metadata_only_quarantine_review_readiness",
    includedSections: contract.includedBinderSections,
    excludedArtifactClasses: contract.excludedArtifactClasses,
    safetyPolicy,
  };

  const quarantineReadinessPlan = {
    ...quarantineReviewPlanJson,
    phase: PHASE,
    packageId,
    packageKey: PACKAGE_KEY,
    packageVersion: PACKAGE_VERSION,
    packageStatus,
    artifactChecksumSha256: candidatePackage.artifactChecksumSha256,
    noArtifactBytesIncluded: true,
    noRuntimeExecution: true,
    noActivationOrDeployment: true,
    noBusinessMutation: true,
  };

  const summary: InventoryStockoutCandidatePackageIntakeBinderSummary = {
    binderKey: BINDER_KEY,
    binderVersion: BINDER_VERSION,
    generatedAt,
    phase: PHASE,
    status,
    recommendation,
    readinessScorePct,
    packageId,
    packageKey: PACKAGE_KEY,
    packageVersion: PACKAGE_VERSION,
    packageStatus,
    importId: asNumber(candidatePackage.importId),
    artifactMetadataId: asNumber(candidatePackage.artifactMetadataId),
    approvalReviewId: asNumber(candidatePackage.approvalReviewId),
    modelKey: asString(candidatePackage.modelKey),
    modelVersion: asString(candidatePackage.modelVersion),
    artifactChecksumSha256: asString(candidatePackage.artifactChecksumSha256),
    intakeMode: "metadata_only_intake_readiness",
    quarantineMode: "metadata_only_quarantine_review_readiness",
    binderContainsExecutableBytes,
    packageBytesLoaded,
    packageBytesPersisted,
    modelExecutionAllowed,
    runtimeInvocationAllowed,
    inferenceEndpointExposed,
    artifactActivationAllowed,
    artifactBytesLoadingAllowed,
    artifactIntakeCanLoadBytes,
    artifactIntakeCanPersistBytes,
    quarantineCanExecuteArtifact,
    quarantineCanActivateArtifact,
    productionIntegrationAllowed,
    decisionAutomationAllowed,
    canChangeInventoryOrAccounting,
    canChangePricing,
    canChangeReports,
    canChangeLedger,
    blockerCount: blockers.length,
    warningCount: warnings.length,
    passCount,
    totalGateCount,
    blockers,
    warnings,
    signedBinderHash: null,
    recommendedNextAction: status === "binder_ready"
      ? "Phase 8B intake/quarantine binder آماده ثبت metadata-only است؛ هیچ package byte، artifact load، inference، activation یا mutation فعال نیست."
      : blockers[0] || "برای آماده‌شدن Phase 8B binder، evidenceهای upstream را کامل کنید.",
  };

  const binderPayload = {
    phase: PHASE,
    binderKey: BINDER_KEY,
    binderVersion: BINDER_VERSION,
    generatedAt,
    intakeManifest,
    quarantineReadinessPlan,
    candidatePackage: candidatePackageResponse,
    gates,
    safetyPolicy,
  };
  const signedBinderHash = sha256(binderPayload);
  summary.signedBinderHash = signedBinderHash;

  return {
    success: true,
    contract,
    summary,
    gates,
    intakeManifest,
    quarantineReadinessPlan,
    binderPayload,
    safetyPolicy,
  };
};

export const prepareInventoryStockoutCandidatePackageIntakeBinder = async (
  options: Record<string, unknown> = {},
): Promise<InventoryStockoutCandidatePackageIntakeBinderResponse> => {
  const binder = await buildInventoryStockoutCandidatePackageIntakeBinder(options);
  if (binder.summary.status !== "binder_ready") return binder;

  const binderRecord = await recordMlCandidatePackageIntakeBinder({
    packageId: binder.summary.packageId,
    packageKey: binder.summary.packageKey,
    packageVersion: binder.summary.packageVersion,
    candidateModelKey: binder.summary.modelKey,
    candidateModelVersion: binder.summary.modelVersion,
    importId: binder.summary.importId,
    artifactMetadataId: binder.summary.artifactMetadataId,
    approvalReviewId: binder.summary.approvalReviewId,
    artifactChecksumSha256: binder.summary.artifactChecksumSha256,
    binderKey: binder.summary.binderKey,
    binderVersion: binder.summary.binderVersion,
    intakeStatus: "metadata_intake_ready",
    quarantineStatus: "metadata_quarantine_review_ready",
    binderStatus: binder.summary.status,
    readinessScorePct: binder.summary.readinessScorePct,
    intakeManifest: binder.intakeManifest,
    quarantineReadinessPlan: binder.quarantineReadinessPlan,
    binderPayload: binder.binderPayload,
    safetyPolicy: binder.safetyPolicy,
    summary: binder.summary as unknown as Record<string, unknown>,
    signedBinderHash: binder.summary.signedBinderHash || sha256(binder.binderPayload),
    modelExecutionAllowed: binder.summary.modelExecutionAllowed,
    runtimeInvocationAllowed: binder.summary.runtimeInvocationAllowed,
    inferenceEndpointExposed: binder.summary.inferenceEndpointExposed,
    artifactActivationAllowed: binder.summary.artifactActivationAllowed,
    artifactBytesLoadingAllowed: binder.summary.artifactBytesLoadingAllowed,
    artifactIntakeCanLoadBytes: binder.summary.artifactIntakeCanLoadBytes,
    artifactIntakeCanPersistBytes: binder.summary.artifactIntakeCanPersistBytes,
    quarantineCanExecuteArtifact: binder.summary.quarantineCanExecuteArtifact,
    quarantineCanActivateArtifact: binder.summary.quarantineCanActivateArtifact,
    productionIntegrationAllowed: binder.summary.productionIntegrationAllowed,
    decisionAutomationAllowed: binder.summary.decisionAutomationAllowed,
    inventoryAccountingChangeAllowed: binder.summary.canChangeInventoryOrAccounting,
    pricingChangeAllowed: binder.summary.canChangePricing,
    reportsChangeAllowed: binder.summary.canChangeReports,
    ledgerChangeAllowed: binder.summary.canChangeLedger,
    binderContainsExecutableBytes: binder.summary.binderContainsExecutableBytes,
    packageBytesLoaded: binder.summary.packageBytesLoaded,
    packageBytesPersisted: binder.summary.packageBytesPersisted,
    userId: asNumber(options.userId),
  });

  return {
    ...binder,
    binderRecord,
  };
};

export const buildMlCandidatePackageIntakeBinderCatalogSummary = async (): Promise<MlCandidatePackageIntakeBinderCatalogSummary> => {
  const [currentCandidatePackageIntakeBinder, lastCandidatePackageIntakeBinders] = await Promise.all([
    buildInventoryStockoutCandidatePackageIntakeBinder().then((result) => result.summary),
    listMlCandidatePackageIntakeBinders(10).catch(() => []),
  ]);
  return {
    generatedAt: new Date().toISOString(),
    contract: buildInventoryStockoutCandidatePackageIntakeBinderContract(),
    currentCandidatePackageIntakeBinder,
    lastCandidatePackageIntakeBinders,
    recommendedNextAction: currentCandidatePackageIntakeBinder.recommendedNextAction,
  };
};

/* Phase 8B guard anchors: inventory_stockout_candidate_package_intake_quarantine_binder_v1, buildInventoryStockoutCandidatePackageIntakeBinderContract, buildInventoryStockoutCandidatePackageIntakeBinder, prepareInventoryStockoutCandidatePackageIntakeBinder, metadata_only_intake_readiness, metadata_only_quarantine_review_readiness */
