import {
  getMlModelResultImportById,
  listMlModelResultImports,
  listMlShadowObservationBinderReviewSignoffs,
  listMlShadowObservationBinderReviewSignoffsByImportId,
  recordMlShadowObservationBinderReviewSignoff,
} from "../../db/domains/mlDatasets.db";
import {
  buildInventoryStockoutShadowObservationDecisionReviewExportBinder,
  buildInventoryStockoutShadowObservationDecisionReviewExportBinderContract,
} from "./inventoryStockoutShadowObservationDecisionReviewExportBinder.service";
import type {
  InventoryStockoutShadowObservationBinderReviewSignoffGateContract,
  InventoryStockoutShadowObservationBinderReviewSignoffGateGate,
  InventoryStockoutShadowObservationBinderReviewSignoffGateResponse,
  InventoryStockoutShadowObservationBinderReviewSignoffGateSummary,
  MlShadowObservationBinderReviewSignoffGateCatalogSummary,
  ShadowObservationBinderReviewSignoffGateRecommendation,
  ShadowObservationBinderReviewSignoffGateStatus,
} from "./datasetTypes";

const SIGNOFF_GATE_CONTRACT_KEY = "inventory_stockout_shadow_observation_binder_review_signoff_gate_v1" as const;
const SIGNOFF_GATE_CONTRACT_VERSION = "v1" as const;
const REQUIRED_EXPORT_BINDER_KEY = "inventory_stockout_shadow_observation_decision_review_export_binder_v1" as const;
const SIGNOFF_GATE_SCOPE = "phase3l_shadow_observation_binder_review_signoff_gate_audit_only" as const;
const FEATURE_FLAG_KEY = "ml.inventoryStockout.shadowObservationBinderReviewSignoffGate.enabled" as const;
const JSON_EXPORT_VERSION = "shadow_observation_binder_review_signoff_gate_json_v1" as const;
const CSV_EXPORT_VERSION = "shadow_observation_binder_review_signoff_gate_csv_v1" as const;

const featureFlagDefault = false as const;
const signoffGateEnabled = false as const;
const humanSignoffOnly = true as const;
const runtimeInvocationAllowed = false as const;
const modelExecutionAllowed = false as const;
const inferenceEndpointExposed = false as const;
const productionIntegrationAllowed = false as const;
const decisionAutomationAllowed = false as const;
const canChangeInventoryOrAccounting = false as const;
const auditOnly = true as const;
const mutationAllowed = false as const;
const baselineOnlySourceOfTruth = true as const;
const operationalDecisionAllowed = false as const;
const customerSupplierMessageAllowed = false as const;

const allowedSignoffTypes = [
  "acknowledge_binder_evidence",
  "request_binder_revision",
  "block_future_release_review",
  "approve_governance_archive",
] as const;

const allowedSignoffStatuses = ["draft", "signed", "superseded", "voided"] as const;

const forbiddenSignoffFieldKeys = [
  "approveProduction",
  "releaseToProduction",
  "enableRuntime",
  "enableInference",
  "executeModel",
  "predictedProbability",
  "predictedLabel",
  "predictionScore",
  "modelScore",
  "operationalRecommendation",
  "purchaseSuggestion",
  "priceSuggestion",
  "reorderQuantity",
  "sendCustomerMessage",
  "sendSupplierMessage",
  "mutateInventory",
  "mutateAccounting",
  "changeReports",
  "changePartnerLedger",
  "changeCustomerLedger",
] as const;

const asNumber = (value: unknown): number | null => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
};

const getCount = (value: unknown): number => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : 0;
};

const normalizeText = (value: unknown, fallback: string | null = null): string | null => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : fallback;
};

const hasOwn = (source: Record<string, unknown>, key: string): boolean => Object.prototype.hasOwnProperty.call(source, key);

const extractForbiddenFieldKeys = (options: Record<string, unknown>): string[] => {
  const signoff = options.signoff && typeof options.signoff === "object" && !Array.isArray(options.signoff)
    ? options.signoff as Record<string, unknown>
    : {};
  const payload = options.payload && typeof options.payload === "object" && !Array.isArray(options.payload)
    ? options.payload as Record<string, unknown>
    : {};
  const keys = forbiddenSignoffFieldKeys.filter((key) => hasOwn(options, key) || hasOwn(signoff, key) || hasOwn(payload, key));
  return Array.from(new Set(keys));
};

const normalizeSignoffType = (value: unknown): typeof allowedSignoffTypes[number] => {
  const text = normalizeText(value, "acknowledge_binder_evidence") as typeof allowedSignoffTypes[number];
  return allowedSignoffTypes.includes(text) ? text : "acknowledge_binder_evidence";
};

const normalizeSignoffStatus = (value: unknown): typeof allowedSignoffStatuses[number] => {
  const text = normalizeText(value, "signed") as typeof allowedSignoffStatuses[number];
  return allowedSignoffStatuses.includes(text) ? text : "signed";
};

const pickLatestImportId = async (): Promise<number | null> => {
  const imports = await listMlModelResultImports(1) as Array<Record<string, unknown>>;
  return asNumber(imports[0]?.id);
};

const createEvidenceFingerprint = (payload: Record<string, unknown>): string => {
  const raw = JSON.stringify(payload);
  let hash = 0;
  for (let index = 0; index < raw.length; index += 1) {
    hash = ((hash << 5) - hash + raw.charCodeAt(index)) | 0;
  }
  return `signoff-${raw.length}-${Math.abs(hash)}`;
};

const buildContract = (): InventoryStockoutShadowObservationBinderReviewSignoffGateContract => ({
  contractKey: SIGNOFF_GATE_CONTRACT_KEY,
  contractVersion: SIGNOFF_GATE_CONTRACT_VERSION,
  generatedAt: new Date().toISOString(),
  purpose: "Record human signoff-gate evidence for a completed shadow observation decision-review export binder without approving production integration, inference runtime, or operational mutations.",
  requiredExportBinderKey: REQUIRED_EXPORT_BINDER_KEY,
  signoffGateScope: SIGNOFF_GATE_SCOPE,
  allowedSignoffTypes: [...allowedSignoffTypes],
  exportVersions: {
    json: JSON_EXPORT_VERSION,
    csv: CSV_EXPORT_VERSION,
  },
  requiredAssertions: [
    "Phase 3K export binder evidence must be available before human signoff is governance-complete.",
    "A signoff row is a human audit acknowledgement only, not production approval or release authorization.",
    "No model runtime, inference endpoint, prediction serving, scoring, or external ML worker is enabled by this phase.",
    "No inventory, accounting, pricing, report, customer, partner, supplier, or communication table is mutated.",
    "Rule/statistical baseline remains the only source of truth.",
  ],
  forbiddenBehavior: [
    "Do not convert binder signoff into production integration approval.",
    "Do not execute a model artifact while building or signing the binder gate.",
    "Do not emit purchase quantities, price changes, customer messages, supplier messages, or operational recommendations.",
    "Do not expose inference or prediction-serving endpoints.",
    "Do not mutate inventory, accounting, pricing, reports, customer ledger, partner ledger, or communications.",
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
  status: InventoryStockoutShadowObservationBinderReviewSignoffGateGate["status"],
  value: unknown,
  message: string,
): InventoryStockoutShadowObservationBinderReviewSignoffGateGate => ({ key, label, status, value, message });

const uniqueMessages = (
  gates: InventoryStockoutShadowObservationBinderReviewSignoffGateGate[],
  status: InventoryStockoutShadowObservationBinderReviewSignoffGateGate["status"],
): string[] => Array.from(new Set(gates.filter((gate) => gate.status === status).map((gate) => gate.message)));

const buildSignoffPolicy = (generatedAt: string) => ({
  generatedAt,
  policyKey: "shadow_observation_binder_review_signoff_gate_policy_v1",
  signoffMode: "human_governance_signoff_only",
  allowedSignoffTypes: [...allowedSignoffTypes],
  allowedSignoffStatuses: [...allowedSignoffStatuses],
  forbiddenFields: [...forbiddenSignoffFieldKeys],
  requiredFlags: {
    humanSignoffOnly: true,
    auditOnly: true,
    mutationAllowed: false,
    runtimeInvocationAllowed: false,
    modelExecutionAllowed: false,
    operationalDecisionAllowed: false,
    customerSupplierMessageAllowed: false,
    baselineOnlySourceOfTruth: true,
  },
});

const buildSignoffRows = (signoffs: Array<Record<string, unknown>>) => signoffs.map((signoff) => ({
  id: signoff.id ?? null,
  importId: signoff.importId ?? null,
  binderContractKey: signoff.binderContractKey ?? null,
  binderFingerprint: signoff.binderFingerprint ?? null,
  signoffType: signoff.signoffType ?? null,
  signoffStatus: signoff.signoffStatus ?? null,
  signerName: signoff.signerName ?? null,
  signerRole: signoff.signerRole ?? null,
  humanSignoffOnly: Boolean(signoff.humanSignoffOnly),
  auditOnly: Boolean(signoff.auditOnly),
  mutationAllowed: Boolean(signoff.mutationAllowed),
  operationalDecisionAllowed: Boolean(signoff.operationalDecisionAllowed),
  forbiddenFieldAttemptCount: Number(signoff.forbiddenFieldAttemptCount || 0),
  createdAt: signoff.createdAt ?? null,
}));

export const buildInventoryStockoutShadowObservationBinderReviewSignoffGateContract = buildContract;

export const buildInventoryStockoutShadowObservationBinderReviewSignoffGate = async (
  importIdInput?: unknown,
  options: Record<string, unknown> = {},
): Promise<InventoryStockoutShadowObservationBinderReviewSignoffGateResponse> => {
  const generatedAt = new Date().toISOString();
  const importId = asNumber(importIdInput) ?? asNumber(options.importId) ?? await pickLatestImportId();
  const modelImport = importId ? await getMlModelResultImportById(importId) as Record<string, unknown> | null : null;
  const binder = await buildInventoryStockoutShadowObservationDecisionReviewExportBinder(importId, options);
  const binderContract = buildInventoryStockoutShadowObservationDecisionReviewExportBinderContract();
  const signoffs = importId ? await listMlShadowObservationBinderReviewSignoffsByImportId(importId, options.limit) as Array<Record<string, unknown>> : [];
  const forbiddenFieldKeys = extractForbiddenFieldKeys(options);
  const binderComplete = Boolean(binder.summary.binderComplete);
  const binderFingerprint = createEvidenceFingerprint({
    importId,
    binderStatus: binder.summary.binderStatus,
    evidenceSectionCount: binder.summary.evidenceSectionCount,
    completedEvidenceSectionCount: binder.summary.completedEvidenceSectionCount,
    decisionCount: binder.summary.decisionCount,
    eventCount: binder.summary.eventCount,
    baselineComparisonAvailable: binder.summary.baselineComparisonAvailable,
  });

  const signoffCount = signoffs.length;
  const signedCount = signoffs.filter((signoff) => signoff.signoffStatus === "signed").length;
  const revisionRequestedCount = signoffs.filter((signoff) => signoff.signoffType === "request_binder_revision").length;
  const blockedFutureReviewCount = signoffs.filter((signoff) => signoff.signoffType === "block_future_release_review").length;
  const archiveApprovedCount = signoffs.filter((signoff) => signoff.signoffType === "approve_governance_archive").length;
  const forbiddenFieldAttemptCount = signoffs.reduce((sum, signoff) => sum + Number(signoff.forbiddenFieldAttemptCount || 0), 0) + forbiddenFieldKeys.length;

  const gates = [
    buildGate("export_binder_available", "Export binder available", binder ? "pass" : "block", binder.summary.binderStatus, "Phase 3K export binder must be available before signoff gate review."),
    buildGate("export_binder_complete", "Export binder complete", binderComplete ? "pass" : "warning", binder.summary.binderComplete, "Human signoff should wait until the evidence binder is complete."),
    buildGate("human_signoff_recorded", "Human signoff recorded", signedCount > 0 ? "pass" : "warning", signedCount, "No human binder signoff has been recorded yet."),
    buildGate("forbidden_fields_absent", "Forbidden signoff fields absent", forbiddenFieldKeys.length === 0 ? "pass" : "block", forbiddenFieldKeys, "Signoff payload cannot include runtime, score, recommendation, messaging, release, or operational mutation fields."),
    buildGate("feature_flag_default_off", "Feature flag default off", featureFlagDefault === false ? "pass" : "block", featureFlagDefault, "Signoff-gate feature flag remains false by default."),
    buildGate("signoff_gate_disabled", "Signoff gate runtime disabled", signoffGateEnabled === false ? "pass" : "block", signoffGateEnabled, "Signoff gate does not enable runtime automation."),
    buildGate("human_signoff_only", "Human signoff only", humanSignoffOnly ? "pass" : "block", humanSignoffOnly, "Signoff rows are human governance records only."),
    buildGate("runtime_invocation_disabled", "Runtime invocation disabled", runtimeInvocationAllowed === false ? "pass" : "block", runtimeInvocationAllowed, "Signoff gate cannot invoke runtime."),
    buildGate("model_execution_disabled", "Model execution disabled", modelExecutionAllowed === false ? "pass" : "block", modelExecutionAllowed, "Model execution remains disabled."),
    buildGate("endpoint_hidden", "Inference endpoint hidden", inferenceEndpointExposed === false ? "pass" : "block", inferenceEndpointExposed, "No inference or scoring endpoint is exposed."),
    buildGate("decision_automation_disabled", "Decision automation disabled", decisionAutomationAllowed === false ? "pass" : "block", decisionAutomationAllowed, "Signoff gate does not automate business actions."),
    buildGate("operational_mutation_forbidden", "Operational mutations forbidden", canChangeInventoryOrAccounting === false && mutationAllowed === false ? "pass" : "block", { canChangeInventoryOrAccounting, mutationAllowed }, "Signoff gate cannot mutate inventory, accounting, pricing, reports, ledgers, customers, partners, suppliers, or communications."),
    buildGate("baseline_only_source_of_truth", "Baseline source of truth", baselineOnlySourceOfTruth ? "pass" : "block", baselineOnlySourceOfTruth, "Rule/statistical baseline remains the only source of truth."),
    buildGate("not_production_approval", "Not production approval", productionIntegrationAllowed === false && operationalDecisionAllowed === false ? "pass" : "block", { productionIntegrationAllowed, operationalDecisionAllowed }, "Binder signoff is not production approval or release authorization."),
  ];

  const blockerCount = gates.filter((gate) => gate.status === "block").length;
  const warningCount = gates.filter((gate) => gate.status === "warning").length;
  const passCount = gates.filter((gate) => gate.status === "pass").length;
  const totalGateCount = gates.length;
  const readinessScorePct = totalGateCount ? Math.round((passCount / totalGateCount) * 100) : 0;

  let signoffGateStatus: ShadowObservationBinderReviewSignoffGateStatus = "signoff_ready";
  let recommendation: ShadowObservationBinderReviewSignoffGateRecommendation = "archive_signed_binder_evidence";

  if (blockerCount > 0) {
    signoffGateStatus = "blocked";
    recommendation = "resolve_audit_safety_blocks_first";
  } else if (!binder) {
    signoffGateStatus = "needs_binder";
    recommendation = "build_export_binder_first";
  } else if (!binderComplete) {
    signoffGateStatus = "needs_binder_completion";
    recommendation = "complete_export_binder_first";
  } else if (signedCount === 0) {
    signoffGateStatus = "needs_human_signoff";
    recommendation = "record_human_binder_signoff";
  }

  const recommendedNextAction = signoffGateStatus === "signoff_ready"
    ? "Archive the human-signed evidence binder for audit review only; do not treat it as production approval, runtime activation, or operational decision authority."
    : signoffGateStatus === "needs_human_signoff"
      ? "Record a human governance signoff for the completed Phase 3K evidence binder."
      : signoffGateStatus === "needs_binder_completion"
        ? "Complete the Phase 3K evidence binder before signoff."
        : signoffGateStatus === "needs_binder"
          ? "Build the Phase 3K evidence binder before signoff review."
          : "Resolve audit safety blockers without enabling model runtime, inference endpoints, customer/supplier messages, or business mutations.";

  const summary: InventoryStockoutShadowObservationBinderReviewSignoffGateSummary = {
    generatedAt,
    importId: importId ?? null,
    signoffGateStatus,
    recommendation,
    readinessScorePct,
    featureFlagKey: FEATURE_FLAG_KEY,
    featureFlagDefault,
    signoffGateEnabled,
    humanSignoffOnly,
    runtimeInvocationAllowed,
    modelExecutionAllowed,
    inferenceEndpointExposed,
    productionIntegrationAllowed,
    decisionAutomationAllowed,
    canChangeInventoryOrAccounting,
    auditOnly,
    mutationAllowed,
    baselineOnlySourceOfTruth,
    operationalDecisionAllowed,
    customerSupplierMessageAllowed,
    requiredExportBinderKey: REQUIRED_EXPORT_BINDER_KEY,
    exportBinderStatus: binder.summary.binderStatus,
    binderComplete,
    binderFingerprint,
    eventCount: getCount(binder.summary.eventCount),
    decisionCount: getCount(binder.summary.decisionCount),
    evidenceSectionCount: getCount(binder.summary.evidenceSectionCount),
    completedEvidenceSectionCount: getCount(binder.summary.completedEvidenceSectionCount),
    signoffCount,
    signedCount,
    revisionRequestedCount,
    blockedFutureReviewCount,
    archiveApprovedCount,
    forbiddenFieldAttemptCount,
    blockerCount,
    warningCount,
    passCount,
    totalGateCount,
    blockers: uniqueMessages(gates, "block"),
    warnings: uniqueMessages(gates, "warning"),
    recommendedNextAction,
  };

  const signoffRows = buildSignoffRows(signoffs);
  const signoffPolicy = buildSignoffPolicy(generatedAt);
  const auditExport = {
    exportVersion: JSON_EXPORT_VERSION,
    generatedAt,
    summary,
    signoffRows,
    binderSummary: binder.summary,
    binderContract,
    modelImport: modelImport ? { id: modelImport.id, modelKey: modelImport.modelKey, modelVersion: modelImport.modelVersion, status: modelImport.status } : null,
    policy: "Human binder signoff evidence only; not production approval, release authorization, operational recommendation, or model runtime activation.",
  };

  return {
    success: true,
    contract: buildContract(),
    summary,
    gates,
    signoffPolicy,
    signoffRows,
    binderSummary: binder.summary,
    binderExportManifest: binder.exportManifest,
    auditExport,
  };
};

export const recordInventoryStockoutShadowObservationBinderReviewSignoff = async (payload: Record<string, unknown>) => {
  const generatedAt = new Date().toISOString();
  const importId = asNumber(payload.importId);
  const signoffType = normalizeSignoffType(payload.signoffType || payload.reviewDecisionType || payload.decisionType);
  const signoffStatus = normalizeSignoffStatus(payload.signoffStatus || payload.reviewDecisionStatus || payload.decisionStatus);
  const forbiddenFieldKeys = extractForbiddenFieldKeys(payload);
  const gate = await buildInventoryStockoutShadowObservationBinderReviewSignoffGate(importId, payload);

  const safetyAssertions = {
    generatedAt,
    phase: "Phase 3L — Shadow Observation Binder Review Signoff Gate",
    humanSignoffOnly,
    auditOnly,
    mutationAllowed,
    runtimeInvocationAllowed,
    modelExecutionAllowed,
    inferenceEndpointExposed,
    productionIntegrationAllowed,
    decisionAutomationAllowed,
    canChangeInventoryOrAccounting,
    operationalDecisionAllowed,
    customerSupplierMessageAllowed,
    baselineOnlySourceOfTruth,
    forbiddenFieldKeys,
  };

  const signoffPolicy = buildSignoffPolicy(generatedAt);
  const signoffPayload = {
    signoffType,
    signoffStatus,
    signerName: normalizeText(payload.signerName || payload.reviewerName),
    signerRole: normalizeText(payload.signerRole || payload.reviewerRole),
    signerNote: normalizeText(payload.signerNote || payload.reviewerNote || payload.note),
    createdAt: generatedAt,
    auditOnly: true,
    humanSignoffOnly: true,
    operationalDecisionAllowed: false,
    mutationAllowed: false,
    productionApprovalAllowed: false,
  };

  const record = await recordMlShadowObservationBinderReviewSignoff({
    signoffGateKey: SIGNOFF_GATE_CONTRACT_KEY,
    signoffGateVersion: SIGNOFF_GATE_CONTRACT_VERSION,
    importId,
    binderContractKey: REQUIRED_EXPORT_BINDER_KEY,
    binderFingerprint: gate.summary.binderFingerprint,
    signoffType,
    signoffStatus,
    signerName: normalizeText(payload.signerName || payload.reviewerName),
    signerRole: normalizeText(payload.signerRole || payload.reviewerRole),
    signerNote: normalizeText(payload.signerNote || payload.reviewerNote || payload.note),
    evidenceSummary: {
      exportBinderStatus: gate.summary.exportBinderStatus,
      binderComplete: gate.summary.binderComplete,
      evidenceSectionCount: gate.summary.evidenceSectionCount,
      completedEvidenceSectionCount: gate.summary.completedEvidenceSectionCount,
      signoffGateStatus: gate.summary.signoffGateStatus,
    },
    binderSummary: gate.binderSummary as Record<string, unknown>,
    signoffPayload,
    safetyAssertions,
    signoffPolicy,
    auditExport: {
      exportVersion: JSON_EXPORT_VERSION,
      generatedAt,
      signoffPayload,
      safetyAssertions,
      message: "Human binder signoff only; not production approval, release authorization, operational recommendation, or runtime activation.",
    },
    featureFlagKey: FEATURE_FLAG_KEY,
    featureFlagDefault,
    signoffGateEnabled,
    humanSignoffOnly,
    runtimeInvocationAllowed,
    modelExecutionAllowed,
    inferenceEndpointExposed,
    productionIntegrationAllowed,
    decisionAutomationAllowed,
    inventoryAccountingChangeAllowed: canChangeInventoryOrAccounting,
    auditOnly,
    mutationAllowed,
    baselineOnlySourceOfTruth,
    operationalDecisionAllowed,
    customerSupplierMessageAllowed,
    forbiddenFieldAttemptCount: forbiddenFieldKeys.length,
    userId: asNumber(payload.userId),
  });

  const refreshed = await buildInventoryStockoutShadowObservationBinderReviewSignoffGate(importId, payload);
  return {
    signoffRecord: record,
    summary: refreshed.summary,
    safetyAssertions,
  };
};

export const listInventoryStockoutShadowObservationBinderReviewSignoffs = async (importIdInput?: unknown, limitInput?: unknown) => {
  const importId = asNumber(importIdInput);
  return importId
    ? listMlShadowObservationBinderReviewSignoffsByImportId(importId, limitInput)
    : listMlShadowObservationBinderReviewSignoffs(limitInput);
};

const csvEscape = (value: unknown): string => {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
};

export const exportInventoryStockoutShadowObservationBinderReviewSignoffGateCsv = async (importIdInput?: unknown, options: Record<string, unknown> = {}) => {
  const data = await buildInventoryStockoutShadowObservationBinderReviewSignoffGate(importIdInput, options);
  const headers = [
    "id",
    "importId",
    "binderContractKey",
    "binderFingerprint",
    "signoffType",
    "signoffStatus",
    "signerName",
    "signerRole",
    "humanSignoffOnly",
    "auditOnly",
    "mutationAllowed",
    "operationalDecisionAllowed",
    "forbiddenFieldAttemptCount",
    "createdAt",
  ];
  const rows = data.signoffRows.map((row) => headers.map((header) => csvEscape(row[header])).join(","));
  return {
    filename: `inventory-stockout-shadow-observation-binder-review-signoff-gate-${data.summary.importId || "latest"}.csv`,
    csv: [`# ${CSV_EXPORT_VERSION}`, headers.join(","), ...rows].join("\n"),
  };
};

export const buildMlShadowObservationBinderReviewSignoffGateCatalogSummary = async (): Promise<MlShadowObservationBinderReviewSignoffGateCatalogSummary> => {
  const current = await buildInventoryStockoutShadowObservationBinderReviewSignoffGate();
  const lastShadowObservationBinderReviewSignoffs = await listMlShadowObservationBinderReviewSignoffs(5) as Array<Record<string, unknown>>;
  return {
    generatedAt: new Date().toISOString(),
    contract: buildContract(),
    currentShadowObservationBinderReviewSignoffGate: current.summary,
    lastShadowObservationBinderReviewSignoffs,
    recommendedNextAction: current.summary.recommendedNextAction,
  };
};
