import {
  getMlModelResultImportById,
  listMlModelResultImports,
  listMlProductionGovernanceSignoffDecisions,
  listMlProductionGovernanceSignoffDecisionsByImportId,
  listMlSafeInferenceBoundarySkeletons,
  listMlSafeInferenceBoundarySkeletonsByImportId,
  recordMlSafeInferenceBoundarySkeleton,
} from "../../db/domains/mlDatasets.db";
import type {
  InventoryStockoutSafeInferenceBoundaryContract,
  InventoryStockoutSafeInferenceBoundaryGate,
  InventoryStockoutSafeInferenceBoundaryResponse,
  InventoryStockoutSafeInferenceBoundarySummary,
  MlSafeInferenceBoundaryCatalogSummary,
  SafeInferenceBoundaryRecommendation,
  SafeInferenceBoundarySkeletonStatus,
} from "./datasetTypes";

const SKELETON_KEY = "inventory_stockout_safe_inference_boundary_skeleton_v1" as const;
const CONTRACT_VERSION = "v1" as const;
const ACCEPTED_GOVERNANCE_KEY = "inventory_stockout_final_governance_signoff_implementation_entry_decision_v1" as const;
const BOUNDARY_SCOPE = "phase3a_disabled_safe_inference_boundary_skeleton_only" as const;
const FEATURE_FLAG_KEY = "ml.inventoryStockout.safeInferenceBoundary.enabled" as const;
const FALLBACK_STRATEGY = "rule_statistical_baseline_v1_only" as const;

const asNumber = (value: unknown): number | null => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const normalizeText = (value: unknown, fallback: string | null = null): string | null => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

const normalizeBoolean = (value: unknown): boolean => value === true || value === 1 || value === "true" || value === "yes" || value === "signed" || value === "approved";

const buildContract = (): InventoryStockoutSafeInferenceBoundaryContract => ({
  contractKey: SKELETON_KEY,
  contractVersion: CONTRACT_VERSION,
  generatedAt: new Date().toISOString(),
  purpose: "Define a disabled, feature-flagged safe inference boundary skeleton for Phase 3A without loading, running, scoring, or exposing any production model runtime.",
  acceptedGovernanceKey: ACCEPTED_GOVERNANCE_KEY,
  boundaryScope: BOUNDARY_SCOPE,
  featureFlagKey: FEATURE_FLAG_KEY,
  featureFlagDefault: false,
  boundaryRules: [
    "The boundary skeleton requires a Phase 2W governance signoff with phase2Closed=true and implementationEntryDecision=enter_phase3a_safe_skeleton.",
    "The feature flag must exist but default to false.",
    "No inference runtime, model artifact loading, scoring, production integration, or decision automation is allowed in Phase 3A.",
    "Any future adapter must remain behind this boundary and must fall back to the rule/statistical baseline until a later approved phase.",
    "Inventory, accounting, invoice, ledger, report, pricing, purchasing, and customer communication workflows must remain unchanged.",
  ],
  forbiddenBehavior: [
    "Do not expose a model scoring endpoint.",
    "Do not import, load, deserialize, or execute a model artifact.",
    "Do not call external model runtimes, training stacks, offline model services, external AI APIs, or child processes.",
    "Do not write model recommendations into operational tables.",
    "Do not change inventory, accounting, ledger, invoice, report, purchase, pricing, or customer messaging behavior.",
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
  status: InventoryStockoutSafeInferenceBoundaryGate["status"],
  value: unknown,
  message: string,
): InventoryStockoutSafeInferenceBoundaryGate => ({ key, label, status, value, message });

const uniqueMessages = (gates: InventoryStockoutSafeInferenceBoundaryGate[], status: InventoryStockoutSafeInferenceBoundaryGate["status"]) => (
  [...new Set(gates.filter((gate) => gate.status === status).map((gate) => gate.message).filter(Boolean))]
);

const pickLatestImportId = async (): Promise<number | null> => {
  const boundaries = await listMlSafeInferenceBoundarySkeletons(25) as Array<Record<string, unknown>>;
  const fromBoundary = boundaries.find((row) => asNumber(row.importId));
  if (fromBoundary) return asNumber(fromBoundary.importId);
  const governance = await listMlProductionGovernanceSignoffDecisions(25) as Array<Record<string, unknown>>;
  const fromGovernance = governance.find((row) => asNumber(row.importId));
  if (fromGovernance) return asNumber(fromGovernance.importId);
  const imports = await listMlModelResultImports(25) as Array<Record<string, unknown>>;
  return asNumber(imports[0]?.id);
};

export const buildInventoryStockoutSafeInferenceBoundaryContract = buildContract;

export const buildInventoryStockoutSafeInferenceBoundary = async (
  importIdInput?: unknown,
  payload: Record<string, unknown> = {},
): Promise<InventoryStockoutSafeInferenceBoundaryResponse> => {
  const generatedAt = new Date().toISOString();
  const importId = asNumber(importIdInput) || asNumber(payload.importId) || await pickLatestImportId();
  const modelImport = importId ? await getMlModelResultImportById(importId) as Record<string, unknown> | null : null;
  const previousBoundarySkeletons = importId ? await listMlSafeInferenceBoundarySkeletonsByImportId(importId, 25) as Array<Record<string, unknown>> : [];
  const governanceSignoffs = importId ? await listMlProductionGovernanceSignoffDecisionsByImportId(importId, 25) as Array<Record<string, unknown>> : await listMlProductionGovernanceSignoffDecisions(25) as Array<Record<string, unknown>>;
  const latestGovernanceSignoff = governanceSignoffs[0] || null;

  const featureFlagKey = FEATURE_FLAG_KEY;
  const featureFlagDefault = false as const;
  const runtimeEnabled = false as const;
  const inferenceEndpointExposed = false as const;
  const productionIntegrationAllowed = false as const;
  const decisionAutomationAllowed = false as const;
  const canChangeInventoryOrAccounting = false as const;
  const shadowOnlyCapable = false as const;
  const governanceReady = latestGovernanceSignoff?.governanceStatus === "governance_ready";
  const phase2Closed = normalizeBoolean(latestGovernanceSignoff?.phase2Closed);
  const phase3aEntryDecision = latestGovernanceSignoff?.implementationEntryDecision === "enter_phase3a_safe_skeleton";
  const featureFlagDefined = Boolean(featureFlagKey);
  const modelImportAvailable = Boolean(modelImport || latestGovernanceSignoff?.importId);

  const gates: InventoryStockoutSafeInferenceBoundaryGate[] = [
    buildGate("model_import_available", "Model Import Audit", modelImportAvailable ? "pass" : "block", importId, modelImportAvailable ? "Model import audit record is traceable." : "A model import audit record is required before a safe boundary can be scoped."),
    buildGate("governance_ready", "Phase 2 Governance", governanceReady ? "pass" : "block", latestGovernanceSignoff?.governanceStatus, governanceReady ? "Phase 2W governance signoff is ready." : "Phase 2W governance signoff must be governance_ready."),
    buildGate("phase2_closed", "Phase 2 Closed", phase2Closed ? "pass" : "block", latestGovernanceSignoff?.phase2Closed, phase2Closed ? "Phase 2 is closed by governance signoff." : "Phase 2 must be formally closed before Phase 3A skeleton work."),
    buildGate("entry_decision_phase3a", "Implementation Entry Decision", phase3aEntryDecision ? "pass" : "block", latestGovernanceSignoff?.implementationEntryDecision, phase3aEntryDecision ? "Governance decision allows Phase 3A safe skeleton scoping." : "Implementation entry decision must be enter_phase3a_safe_skeleton."),
    buildGate("feature_flag_defined", "Feature Flag", featureFlagDefined ? "pass" : "block", featureFlagKey, featureFlagDefined ? "Safe boundary feature flag key is defined." : "A disabled feature flag key is required."),
    buildGate("feature_flag_default_off", "Feature Flag Default", featureFlagDefault === false ? "pass" : "block", featureFlagDefault, "Feature flag defaults to OFF."),
    buildGate("runtime_disabled", "Runtime Disabled", runtimeEnabled === false ? "pass" : "block", runtimeEnabled, "Inference runtime remains disabled."),
    buildGate("endpoint_not_exposed", "No Scoring Endpoint", inferenceEndpointExposed === false ? "pass" : "block", inferenceEndpointExposed, "No model scoring endpoint is exposed."),
    buildGate("fallback_policy", "Baseline Fallback", FALLBACK_STRATEGY ? "pass" : "warning", FALLBACK_STRATEGY, "Fallback stays with the rule/statistical baseline v1."),
    buildGate("business_truth_protected", "Business Truth Protected", canChangeInventoryOrAccounting === false ? "pass" : "block", canChangeInventoryOrAccounting, "Inventory/accounting/report truth remains untouched."),
  ];

  const blockers = uniqueMessages(gates, "block");
  const warnings = uniqueMessages(gates, "warning");
  const passCount = gates.filter((gate) => gate.status === "pass").length;
  const totalGateCount = gates.length;
  const readinessScorePct = Math.round((passCount / Math.max(totalGateCount, 1)) * 10000) / 100;

  let boundaryStatus: SafeInferenceBoundarySkeletonStatus = "not_started";
  let recommendation: SafeInferenceBoundaryRecommendation = "keep_boundary_blocked";
  if (!latestGovernanceSignoff) {
    boundaryStatus = "needs_governance_signoff";
    recommendation = "complete_governance_signoff";
  } else if (!featureFlagDefined) {
    boundaryStatus = "needs_feature_flag";
    recommendation = "define_feature_flag";
  } else if (blockers.length > 0) {
    boundaryStatus = "blocked";
    recommendation = "keep_boundary_blocked";
  } else {
    boundaryStatus = "skeleton_ready";
    recommendation = "prepare_disabled_boundary_for_phase3b";
  }

  const boundaryContract = {
    boundaryName: "Inventory Stockout Safe Inference Boundary",
    boundaryScope: BOUNDARY_SCOPE,
    acceptedGovernanceKey: ACCEPTED_GOVERNANCE_KEY,
    allowedInputs: ["validated_test_split_row_key", "feature_snapshot_reference", "baseline_context"],
    allowedOutputs: ["audit_only_boundary_manifest", "disabled_runtime_status", "fallback_policy"],
    forbiddenOutputs: ["purchase_action", "stock_adjustment", "price_change", "invoice_change", "ledger_change", "customer_message", "report_total_change"],
  };

  const disabledRuntimeManifest = {
    runtimeEnabled,
    scoringEndpointExposed: inferenceEndpointExposed,
    modelArtifactLoadingAllowed: false,
    modelExecutionAllowed: false,
    externalServiceCallsAllowed: false,
    childProcessExecutionAllowed: false,
    featureFlagKey,
    featureFlagDefault,
    status: "disabled_by_design",
  };

  const safetyControls = {
    manualOverrideRequired: true,
    humanReviewRequiredBeforeAnyFuturePilot: true,
    auditLoggingRequired: true,
    baselineFallbackRequired: true,
    writeToOperationalTablesAllowed: false,
    inventoryAccountingMutationAllowed: false,
  };

  const featureFlagPolicy = {
    key: featureFlagKey,
    defaultEnabled: false,
    canBeEnabledInPhase3A: false,
    requiresFutureGovernanceGate: true,
    allowedCurrentUse: "configuration_contract_only",
  };

  const fallbackPolicy = {
    strategy: FALLBACK_STRATEGY,
    baselineModelKey: "rule_statistical_baseline_v1",
    fallbackAlwaysActive: true,
    candidateModelCanOverrideBaseline: false,
    operationalDecisionSource: "existing_business_logic_only",
  };

  const summary: InventoryStockoutSafeInferenceBoundarySummary = {
    skeletonKey: SKELETON_KEY,
    generatedAt,
    importId,
    governanceSignoffId: asNumber(latestGovernanceSignoff?.id),
    modelKey: normalizeText(modelImport?.modelKey, normalizeText(latestGovernanceSignoff?.modelKey)),
    modelVersion: normalizeText(modelImport?.modelVersion, normalizeText(latestGovernanceSignoff?.modelVersion)),
    governanceStatus: normalizeText(latestGovernanceSignoff?.governanceStatus),
    implementationEntryDecision: normalizeText(latestGovernanceSignoff?.implementationEntryDecision),
    boundaryStatus,
    recommendation,
    readinessScorePct,
    featureFlagKey,
    featureFlagDefault,
    runtimeEnabled,
    inferenceEndpointExposed,
    productionIntegrationAllowed,
    decisionAutomationAllowed,
    canChangeInventoryOrAccounting,
    shadowOnlyCapable,
    fallbackStrategy: FALLBACK_STRATEGY,
    blockerCount: blockers.length,
    warningCount: warnings.length,
    passCount,
    totalGateCount,
    boundaryGates: gates,
    blockers,
    warnings,
    recommendedNextAction: recommendation === "prepare_disabled_boundary_for_phase3b"
      ? "Keep the safe boundary disabled and use it only as the contract baseline for Phase 3B artifact metadata planning. Do not enable scoring or operational actions."
      : blockers[0] || warnings[0] || "Complete Phase 2W governance before creating the disabled safe inference boundary skeleton.",
  };

  const auditExport = {
    generatedAt,
    skeletonKey: SKELETON_KEY,
    importId,
    governanceSignoffId: summary.governanceSignoffId,
    boundaryStatus,
    readinessScorePct,
    blockers,
    warnings,
    policy: buildContract().operationalPolicy,
    safeInferenceBoundarySkeletonOnly: true,
  };

  return {
    generatedAt,
    contract: buildContract(),
    summary,
    latestGovernanceSignoff,
    boundaryContract,
    disabledRuntimeManifest,
    safetyControls,
    featureFlagPolicy,
    fallbackPolicy,
    auditExport,
    previousBoundarySkeletons,
    operationalPolicy: {
      safeInferenceBoundarySkeletonOnly: true,
      productionIntegrationAllowed: false,
      inferenceRuntimeEnabled: false,
      decisionAutomationAllowed: false,
      message: "Phase 3A creates a disabled safe inference boundary skeleton only. It cannot score models, expose inference endpoints, enable production integration, or alter inventory, accounting, invoices, ledgers, reports, pricing, purchasing, or customer communication.",
    },
  };
};

export const recordInventoryStockoutSafeInferenceBoundary = async (
  payload: Record<string, unknown> = {},
): Promise<InventoryStockoutSafeInferenceBoundaryResponse> => {
  const data = await buildInventoryStockoutSafeInferenceBoundary(payload.importId, payload);
  const record = await recordMlSafeInferenceBoundarySkeleton({
    skeletonKey: SKELETON_KEY,
    importId: data.summary.importId,
    governanceSignoffId: data.summary.governanceSignoffId,
    modelKey: data.summary.modelKey,
    modelVersion: data.summary.modelVersion,
    governanceStatus: data.summary.governanceStatus,
    implementationEntryDecision: data.summary.implementationEntryDecision,
    boundaryStatus: data.summary.boundaryStatus,
    featureFlagKey: data.summary.featureFlagKey,
    featureFlagDefault: data.summary.featureFlagDefault,
    runtimeEnabled: data.summary.runtimeEnabled,
    inferenceEndpointExposed: data.summary.inferenceEndpointExposed,
    productionIntegrationAllowed: data.summary.productionIntegrationAllowed,
    decisionAutomationAllowed: data.summary.decisionAutomationAllowed,
    inventoryAccountingChangeAllowed: data.summary.canChangeInventoryOrAccounting,
    shadowOnlyCapable: data.summary.shadowOnlyCapable,
    fallbackStrategy: data.summary.fallbackStrategy,
    readinessScorePct: data.summary.readinessScorePct,
    blockerCount: data.summary.blockerCount,
    warningCount: data.summary.warningCount,
    passCount: data.summary.passCount,
    totalGateCount: data.summary.totalGateCount,
    boundaryContract: data.boundaryContract,
    disabledRuntimeManifest: data.disabledRuntimeManifest,
    safetyControls: data.safetyControls,
    featureFlagPolicy: data.featureFlagPolicy,
    fallbackPolicy: data.fallbackPolicy,
    auditExport: data.auditExport,
    summary: data.summary as unknown as Record<string, unknown>,
    policy: data.operationalPolicy,
    userId: asNumber(payload.userId),
  }) as Record<string, unknown> | null;
  return { ...data, boundaryRecord: record };
};

export const listInventoryStockoutSafeInferenceBoundaries = async (importIdInput: unknown) => {
  return listMlSafeInferenceBoundarySkeletonsByImportId(importIdInput, 50) as Promise<Array<Record<string, unknown>>>;
};

export const buildMlSafeInferenceBoundaryCatalogSummary = async (): Promise<MlSafeInferenceBoundaryCatalogSummary> => {
  const importId = await pickLatestImportId();
  const current = await buildInventoryStockoutSafeInferenceBoundary(importId);
  const lastBoundaries = await listMlSafeInferenceBoundarySkeletons(25) as Array<Record<string, unknown>>;
  return {
    generatedAt: new Date().toISOString(),
    contract: buildContract(),
    currentBoundary: current.summary,
    lastBoundaries,
    recommendedNextAction: current.summary.recommendedNextAction,
  };
};
