import { createHash } from "node:crypto";
import {
  getLatestMlCandidatePackageIntakeBinder,
  listMlCandidatePackageHumanReviewSignoffs,
  recordMlCandidatePackageHumanReviewSignoff,
} from "../../db/domains/mlDatasets.db";
import type {
  CandidatePackageHumanReviewSignoffRecommendation,
  CandidatePackageHumanReviewSignoffStatus,
  InventoryStockoutCandidatePackageHumanReviewSignoffContract,
  InventoryStockoutCandidatePackageHumanReviewSignoffGate,
  InventoryStockoutCandidatePackageHumanReviewSignoffResponse,
  InventoryStockoutCandidatePackageHumanReviewSignoffSummary,
  MlCandidatePackageHumanReviewSignoffCatalogSummary,
} from "./datasetTypes";

const SIGNOFF_KEY = "inventory_stockout_candidate_package_human_review_signoff_gate_v1" as const;
const SIGNOFF_VERSION = "v1" as const;
const BINDER_KEY = "inventory_stockout_candidate_package_intake_quarantine_binder_v1" as const;
const BINDER_VERSION = "v1" as const;
const PACKAGE_KEY = "inventory_stockout_offline_candidate_model_package_v1" as const;
const PACKAGE_VERSION = "v1" as const;
const PHASE = "Phase 8C" as const;

const humanReviewRequired = true as const;
const signoffIsProductionApproval = false as const;
const signoffCanLoadPackageBytes = false as const;
const signoffCanPersistArtifactBytes = false as const;
const signoffCanExecuteModel = false as const;
const signoffCanInvokeRuntime = false as const;
const signoffCanExposeInferenceEndpoint = false as const;
const signoffCanActivateArtifact = false as const;
const signoffCanDeployArtifact = false as const;
const signoffCanProductionScore = false as const;
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
  status: InventoryStockoutCandidatePackageHumanReviewSignoffGate["status"],
  value: unknown,
  message: string,
): InventoryStockoutCandidatePackageHumanReviewSignoffGate => ({ key, label, status, value, message });

const uniqueMessages = (
  gates: InventoryStockoutCandidatePackageHumanReviewSignoffGate[],
  status: InventoryStockoutCandidatePackageHumanReviewSignoffGate["status"],
) => Array.from(new Set(gates.filter((gate) => gate.status === status).map((gate) => gate.message)));

const chooseRecommendation = (
  status: CandidatePackageHumanReviewSignoffStatus,
): CandidatePackageHumanReviewSignoffRecommendation => {
  if (status === "signoff_gate_ready") return "record_metadata_only_human_review_signoff";
  if (status === "needs_phase8b_binder_ready") return "complete_phase8b_binder_first";
  if (status === "needs_persisted_intake_binder") return "record_phase8b_intake_binder_first";
  if (status === "needs_human_review_evidence") return "collect_human_review_evidence_first";
  return "resolve_safety_blocks_first";
};

const hasHumanReviewEvidence = (value: unknown): boolean => {
  if (!value || typeof value !== "object") return false;
  const evidence = value as Record<string, unknown>;
  const reviewer = asString(evidence.reviewerName || evidence.reviewer || evidence.reviewerRole);
  const decision = asString(evidence.reviewDecision || evidence.signoffDecision || evidence.decision);
  const checklist = evidence.reviewChecklist || evidence.checklist || evidence.requiredChecks;
  const checklistReady = Array.isArray(checklist) ? checklist.length > 0 : Boolean(checklist && typeof checklist === "object");
  return Boolean(reviewer && decision && checklistReady);
};

export const buildInventoryStockoutCandidatePackageHumanReviewSignoffContract = (): InventoryStockoutCandidatePackageHumanReviewSignoffContract => ({
  contractKey: SIGNOFF_KEY,
  contractVersion: SIGNOFF_VERSION,
  generatedAt: new Date().toISOString(),
  phase: PHASE,
  purpose: "Record a metadata-only human review/signoff gate for the Phase 8B candidate package intake binder without making the signoff a production approval and without enabling artifact loading, model execution, inference, activation, deployment, production scoring, or business mutation.",
  signoffScope: "offline_candidate_package_human_review_metadata_only",
  requiredUpstreamBinderKey: BINDER_KEY,
  requiredUpstreamBinderVersion: BINDER_VERSION,
  requiredUpstreamEvidence: [
    "Persisted Phase 8B candidate package intake/quarantine binder metadata row",
    "Phase 8B binder status is binder_ready",
    "Signed Phase 8B binder hash and safety policy metadata",
    "Artifact checksum metadata traceability from the upstream candidate package",
  ],
  requiredHumanReviewEvidence: [
    "Human reviewer identity or role",
    "Human review decision for metadata-only signoff gate",
    "Human review checklist confirming no package bytes, runtime, inference, activation, deployment, production scoring, or business mutation are enabled",
    "Explicit acknowledgement that Phase 8C signoff is not production approval",
  ],
  includedSignoffSections: [
    "candidate-package-human-review-packet.json",
    "candidate-package-human-signoff-payload.json",
    "candidate-package-human-signoff-safety-policy.json",
    "candidate-package-human-signoff-summary.json",
  ],
  forbiddenBehavior: [
    "Do not load or persist candidate package bytes in Phase 8C.",
    "Do not execute, invoke, train, activate, deploy, or production-score any model artifact.",
    "Do not add /infer, /execute, /activate, /deploy, or /production-score routes.",
    "Do not treat this human signoff as production approval or automated decision authority.",
    "Do not mutate inventory, accounting, ledger, pricing, reports, or business records.",
  ],
  operationalPolicy: {
    humanReviewRequired,
    signoffIsProductionApproval,
    signoffCanLoadPackageBytes,
    signoffCanPersistArtifactBytes,
    signoffCanExecuteModel,
    signoffCanInvokeRuntime,
    signoffCanExposeInferenceEndpoint,
    signoffCanActivateArtifact,
    signoffCanDeployArtifact,
    signoffCanProductionScore,
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

export const buildInventoryStockoutCandidatePackageHumanReviewSignoff = async (
  options: Record<string, unknown> = {},
): Promise<InventoryStockoutCandidatePackageHumanReviewSignoffResponse> => {
  const generatedAt = new Date().toISOString();
  const contract = buildInventoryStockoutCandidatePackageHumanReviewSignoffContract();
  const latestBinder = await getLatestMlCandidatePackageIntakeBinder().catch(() => null) as Record<string, unknown> | null;
  const binderId = asNumber(latestBinder?.id);
  const binderStatus = asString(latestBinder?.binderStatus);
  const persistedBinderExists = Boolean(binderId);
  const upstreamBinderReady = binderStatus === "binder_ready";
  const reviewEvidenceJson = (options.reviewEvidenceJson && typeof options.reviewEvidenceJson === "object")
    ? options.reviewEvidenceJson as Record<string, unknown>
    : (options.humanReviewEvidence && typeof options.humanReviewEvidence === "object")
      ? options.humanReviewEvidence as Record<string, unknown>
      : null;
  const humanReviewEvidenceProvided = hasHumanReviewEvidence(reviewEvidenceJson);

  const safetyPolicyStillDisabled =
    humanReviewRequired === true &&
    signoffIsProductionApproval === false &&
    signoffCanLoadPackageBytes === false &&
    signoffCanPersistArtifactBytes === false &&
    signoffCanExecuteModel === false &&
    signoffCanInvokeRuntime === false &&
    signoffCanExposeInferenceEndpoint === false &&
    signoffCanActivateArtifact === false &&
    signoffCanDeployArtifact === false &&
    signoffCanProductionScore === false &&
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
    canChangeLedger === false;

  const gates: InventoryStockoutCandidatePackageHumanReviewSignoffGate[] = [
    buildGate("persisted_phase8b_binder_exists", "Persisted Phase 8B Binder", persistedBinderExists ? "pass" : "block", binderId, persistedBinderExists ? "A persisted Phase 8B intake/quarantine binder metadata row exists." : "Record a Phase 8B intake/quarantine binder before Phase 8C human review signoff."),
    buildGate("phase8b_binder_ready", "Phase 8B Binder Ready", upstreamBinderReady ? "pass" : "block", binderStatus, upstreamBinderReady ? "Phase 8B binder status is binder_ready." : "Phase 8B binder status must be binder_ready before human review signoff."),
    buildGate("signed_binder_hash_present", "Signed Binder Hash", latestBinder?.signedBinderHash ? "pass" : "block", latestBinder?.signedBinderHash, latestBinder?.signedBinderHash ? "Signed Phase 8B binder hash is available for traceability." : "Signed Phase 8B binder hash is required for Phase 8C review traceability."),
    buildGate("human_review_evidence_present", "Human Review Evidence", humanReviewEvidenceProvided ? "pass" : "block", reviewEvidenceJson, humanReviewEvidenceProvided ? "Human review evidence is present for metadata-only signoff." : "Human reviewer, decision, and checklist evidence are required before Phase 8C signoff can be recorded."),
    buildGate("not_production_approval", "Not Production Approval", !signoffIsProductionApproval ? "pass" : "block", signoffIsProductionApproval, "Phase 8C signoff is a metadata-only human review gate and is not production approval."),
    buildGate("no_package_bytes", "No Package Bytes", !signoffCanLoadPackageBytes && !signoffCanPersistArtifactBytes ? "pass" : "block", { signoffCanLoadPackageBytes, signoffCanPersistArtifactBytes }, "Phase 8C cannot load candidate package bytes or persist artifact bytes."),
    buildGate("runtime_disabled", "Runtime Disabled", !signoffCanExecuteModel && !signoffCanInvokeRuntime && !signoffCanExposeInferenceEndpoint && !modelExecutionAllowed && !runtimeInvocationAllowed && !inferenceEndpointExposed ? "pass" : "block", { signoffCanExecuteModel, signoffCanInvokeRuntime, signoffCanExposeInferenceEndpoint, modelExecutionAllowed, runtimeInvocationAllowed, inferenceEndpointExposed }, "Model execution, runtime invocation, and inference endpoint exposure remain disabled."),
    buildGate("activation_deployment_blocked", "Activation / Deployment Blocked", !signoffCanActivateArtifact && !signoffCanDeployArtifact && !signoffCanProductionScore && !artifactActivationAllowed && !artifactBytesLoadingAllowed ? "pass" : "block", { signoffCanActivateArtifact, signoffCanDeployArtifact, signoffCanProductionScore, artifactActivationAllowed, artifactBytesLoadingAllowed }, "Artifact activation, deployment, production scoring, and artifact byte loading remain blocked."),
    buildGate("business_mutation_blocked", "Business Mutation Blocked", !productionIntegrationAllowed && !decisionAutomationAllowed && !canChangeInventoryOrAccounting && !canChangePricing && !canChangeReports && !canChangeLedger ? "pass" : "block", { productionIntegrationAllowed, decisionAutomationAllowed, canChangeInventoryOrAccounting, canChangePricing, canChangeReports, canChangeLedger }, "Production integration, decision automation, and inventory/accounting/pricing/report/ledger mutation remain blocked."),
  ];

  const blockers = uniqueMessages(gates, "block");
  const warnings = uniqueMessages(gates, "warning");
  const passCount = gates.filter((gate) => gate.status === "pass").length;
  const totalGateCount = gates.length;
  const readinessScorePct = Math.round((passCount / Math.max(totalGateCount, 1)) * 10000) / 100;

  let status: CandidatePackageHumanReviewSignoffStatus = "signoff_gate_ready";
  if (!safetyPolicyStillDisabled) status = "safety_blocked";
  else if (!persistedBinderExists) status = "needs_persisted_intake_binder";
  else if (!upstreamBinderReady) status = "needs_phase8b_binder_ready";
  else if (!humanReviewEvidenceProvided) status = "needs_human_review_evidence";
  else if (blockers.length > 0) status = "safety_blocked";

  const recommendation = chooseRecommendation(status);
  const safetyPolicy = {
    phase: PHASE,
    metadataOnly: true,
    humanReviewRequired,
    signoffIsProductionApproval,
    signoffCanLoadPackageBytes,
    signoffCanPersistArtifactBytes,
    signoffCanExecuteModel,
    signoffCanInvokeRuntime,
    signoffCanExposeInferenceEndpoint,
    signoffCanActivateArtifact,
    signoffCanDeployArtifact,
    signoffCanProductionScore,
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
    nextAllowedStep: "A future phase may archive the metadata-only human signoff packet; Phase 8C does not load, execute, activate, deploy, production-score, expose inference, or mutate business records.",
  };

  const reviewPacket = {
    signoffKey: SIGNOFF_KEY,
    signoffVersion: SIGNOFF_VERSION,
    generatedAt,
    phase: PHASE,
    binderId,
    binderKey: BINDER_KEY,
    binderVersion: BINDER_VERSION,
    binderStatus,
    upstreamBinder: latestBinder,
    humanReviewEvidence: reviewEvidenceJson,
    reviewMode: "metadata_only_human_review_signoff_gate",
    requiredHumanReviewEvidence: contract.requiredHumanReviewEvidence,
    includedSections: contract.includedSignoffSections,
    safetyPolicy,
  };

  const summary: InventoryStockoutCandidatePackageHumanReviewSignoffSummary = {
    signoffKey: SIGNOFF_KEY,
    signoffVersion: SIGNOFF_VERSION,
    generatedAt,
    phase: PHASE,
    status,
    recommendation,
    readinessScorePct,
    binderId,
    binderKey: BINDER_KEY,
    binderVersion: BINDER_VERSION,
    binderStatus,
    packageId: asNumber(latestBinder?.packageId),
    packageKey: PACKAGE_KEY,
    packageVersion: PACKAGE_VERSION,
    importId: asNumber(latestBinder?.importId),
    artifactMetadataId: asNumber(latestBinder?.artifactMetadataId),
    approvalReviewId: asNumber(latestBinder?.approvalReviewId),
    modelKey: asString(latestBinder?.candidateModelKey),
    modelVersion: asString(latestBinder?.candidateModelVersion),
    artifactChecksumSha256: asString(latestBinder?.artifactChecksumSha256),
    reviewMode: "metadata_only_human_review_signoff_gate",
    humanReviewRequired,
    humanReviewEvidenceProvided,
    signoffIsProductionApproval,
    signoffCanLoadPackageBytes,
    signoffCanPersistArtifactBytes,
    signoffCanExecuteModel,
    signoffCanInvokeRuntime,
    signoffCanExposeInferenceEndpoint,
    signoffCanActivateArtifact,
    signoffCanDeployArtifact,
    signoffCanProductionScore,
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
    blockerCount: blockers.length,
    warningCount: warnings.length,
    passCount,
    totalGateCount,
    blockers,
    warnings,
    signedReviewHash: null,
    recommendedNextAction: status === "signoff_gate_ready"
      ? "Phase 8C human review/signoff gate آماده ثبت metadata-only است؛ این signoff تولیدی نیست و load/execute/infer/activate/deploy/production-score/mutation ندارد."
      : blockers[0] || "برای آماده‌شدن Phase 8C، Phase 8B binder و human review evidence را کامل کنید.",
  };

  const signoffPayload = {
    phase: PHASE,
    signoffKey: SIGNOFF_KEY,
    signoffVersion: SIGNOFF_VERSION,
    generatedAt,
    reviewPacket,
    gates,
    safetyPolicy,
  };
  const signedReviewHash = sha256(signoffPayload);
  summary.signedReviewHash = signedReviewHash;

  return {
    success: true,
    contract,
    summary,
    gates,
    reviewPacket,
    signoffPayload,
    safetyPolicy,
  };
};

export const prepareInventoryStockoutCandidatePackageHumanReviewSignoff = async (
  options: Record<string, unknown> = {},
): Promise<InventoryStockoutCandidatePackageHumanReviewSignoffResponse> => {
  const signoff = await buildInventoryStockoutCandidatePackageHumanReviewSignoff(options);
  if (signoff.summary.status !== "signoff_gate_ready") return signoff;

  const signoffRecord = await recordMlCandidatePackageHumanReviewSignoff({
    binderId: signoff.summary.binderId,
    binderKey: signoff.summary.binderKey,
    binderVersion: signoff.summary.binderVersion,
    packageId: signoff.summary.packageId,
    packageKey: signoff.summary.packageKey,
    packageVersion: signoff.summary.packageVersion,
    candidateModelKey: signoff.summary.modelKey,
    candidateModelVersion: signoff.summary.modelVersion,
    importId: signoff.summary.importId,
    artifactMetadataId: signoff.summary.artifactMetadataId,
    approvalReviewId: signoff.summary.approvalReviewId,
    artifactChecksumSha256: signoff.summary.artifactChecksumSha256,
    signoffKey: signoff.summary.signoffKey,
    signoffVersion: signoff.summary.signoffVersion,
    reviewStatus: "metadata_human_review_signed",
    signoffStatus: signoff.summary.status,
    readinessScorePct: signoff.summary.readinessScorePct,
    reviewPacket: signoff.reviewPacket,
    signoffPayload: signoff.signoffPayload,
    safetyPolicy: signoff.safetyPolicy,
    summary: signoff.summary as unknown as Record<string, unknown>,
    signedReviewHash: signoff.summary.signedReviewHash || sha256(signoff.signoffPayload),
    humanReviewRequired: signoff.summary.humanReviewRequired,
    humanReviewEvidenceProvided: signoff.summary.humanReviewEvidenceProvided,
    signoffIsProductionApproval: signoff.summary.signoffIsProductionApproval,
    signoffCanLoadPackageBytes: signoff.summary.signoffCanLoadPackageBytes,
    signoffCanPersistArtifactBytes: signoff.summary.signoffCanPersistArtifactBytes,
    signoffCanExecuteModel: signoff.summary.signoffCanExecuteModel,
    signoffCanInvokeRuntime: signoff.summary.signoffCanInvokeRuntime,
    signoffCanExposeInferenceEndpoint: signoff.summary.signoffCanExposeInferenceEndpoint,
    signoffCanActivateArtifact: signoff.summary.signoffCanActivateArtifact,
    signoffCanDeployArtifact: signoff.summary.signoffCanDeployArtifact,
    signoffCanProductionScore: signoff.summary.signoffCanProductionScore,
    modelExecutionAllowed: signoff.summary.modelExecutionAllowed,
    runtimeInvocationAllowed: signoff.summary.runtimeInvocationAllowed,
    inferenceEndpointExposed: signoff.summary.inferenceEndpointExposed,
    artifactActivationAllowed: signoff.summary.artifactActivationAllowed,
    artifactBytesLoadingAllowed: signoff.summary.artifactBytesLoadingAllowed,
    productionIntegrationAllowed: signoff.summary.productionIntegrationAllowed,
    decisionAutomationAllowed: signoff.summary.decisionAutomationAllowed,
    inventoryAccountingChangeAllowed: signoff.summary.canChangeInventoryOrAccounting,
    pricingChangeAllowed: signoff.summary.canChangePricing,
    reportsChangeAllowed: signoff.summary.canChangeReports,
    ledgerChangeAllowed: signoff.summary.canChangeLedger,
    userId: asNumber(options.userId),
  });

  return {
    ...signoff,
    signoffRecord,
  };
};

export const buildMlCandidatePackageHumanReviewSignoffCatalogSummary = async (): Promise<MlCandidatePackageHumanReviewSignoffCatalogSummary> => {
  const [currentCandidatePackageHumanReviewSignoff, lastCandidatePackageHumanReviewSignoffs] = await Promise.all([
    buildInventoryStockoutCandidatePackageHumanReviewSignoff().then((result) => result.summary),
    listMlCandidatePackageHumanReviewSignoffs(10).catch(() => []),
  ]);
  return {
    generatedAt: new Date().toISOString(),
    contract: buildInventoryStockoutCandidatePackageHumanReviewSignoffContract(),
    currentCandidatePackageHumanReviewSignoff,
    lastCandidatePackageHumanReviewSignoffs,
    recommendedNextAction: currentCandidatePackageHumanReviewSignoff.recommendedNextAction,
  };
};

/* Phase 8C guard anchors: inventory_stockout_candidate_package_human_review_signoff_gate_v1, buildInventoryStockoutCandidatePackageHumanReviewSignoffContract, buildInventoryStockoutCandidatePackageHumanReviewSignoff, prepareInventoryStockoutCandidatePackageHumanReviewSignoff, metadata_only_human_review_signoff_gate */
