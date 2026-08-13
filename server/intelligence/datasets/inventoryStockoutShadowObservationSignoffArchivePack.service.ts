import { listMlModelResultImports } from "../../db/domains/mlDatasets.db";
import {
  buildInventoryStockoutShadowObservationDecisionReviewExportBinder,
  exportInventoryStockoutShadowObservationDecisionReviewExportBinderCsv,
} from "./inventoryStockoutShadowObservationDecisionReviewExportBinder.service";
import {
  buildInventoryStockoutShadowObservationBinderReviewSignoffGate,
  exportInventoryStockoutShadowObservationBinderReviewSignoffGateCsv,
} from "./inventoryStockoutShadowObservationBinderReviewSignoffGate.service";

const ARCHIVE_PACK_CONTRACT_KEY = "inventory_stockout_shadow_observation_signoff_archive_pack_v1" as const;
const ARCHIVE_PACK_CONTRACT_VERSION = "v1" as const;
const REQUIRED_BINDER_KEY = "inventory_stockout_shadow_observation_decision_review_export_binder_v1" as const;
const REQUIRED_SIGNOFF_KEY = "inventory_stockout_shadow_observation_binder_review_signoff_gate_v1" as const;
const ARCHIVE_PACK_SCOPE = "phase3m_shadow_observation_signoff_archive_pack_read_only" as const;
const FEATURE_FLAG_KEY = "ml.inventoryStockout.shadowObservationSignoffArchivePack.enabled" as const;
const JSON_EXPORT_VERSION = "shadow_observation_signoff_archive_pack_json_v1" as const;
const CSV_EXPORT_VERSION = "shadow_observation_signoff_archive_pack_csv_v1" as const;
const MANIFEST_EXPORT_VERSION = "shadow_observation_signoff_archive_pack_manifest_v1" as const;

const featureFlagDefault = false as const;
const archivePackEnabled = false as const;
const readOnlyArchivePack = true as const;
const runtimeInvocationAllowed = false as const;
const modelExecutionAllowed = false as const;
const inferenceEndpointExposed = false as const;
const productionIntegrationAllowed = false as const;
const decisionAutomationAllowed = false as const;
const canChangeInventoryOrAccounting = false as const;
const auditOnly = true as const;
const mutationAllowed = false as const;
const exportOnly = true as const;
const humanReviewOnly = true as const;
const baselineOnlySourceOfTruth = true as const;
const operationalDecisionAllowed = false as const;
const customerSupplierMessageAllowed = false as const;
const archivalPackageOnly = true as const;

const asNumber = (value: unknown): number | null => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
};

const getCount = (value: unknown): number => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : 0;
};

const csvEscape = (value: unknown): string => {
  const text = value == null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const pickLatestImportId = async (): Promise<number | null> => {
  const imports = await listMlModelResultImports(1) as Array<Record<string, unknown>>;
  return asNumber(imports[0]?.id);
};

const createArchiveFingerprint = (payload: Record<string, unknown>): string => {
  const raw = JSON.stringify(payload);
  let hash = 0;
  for (let index = 0; index < raw.length; index += 1) {
    hash = ((hash << 5) - hash + raw.charCodeAt(index)) | 0;
  }
  return `archive-pack-${raw.length}-${Math.abs(hash)}`;
};

export const buildInventoryStockoutShadowObservationSignoffArchivePackContract = () => ({
  contractKey: ARCHIVE_PACK_CONTRACT_KEY,
  contractVersion: ARCHIVE_PACK_CONTRACT_VERSION,
  generatedAt: new Date().toISOString(),
  purpose: "Build a read-only governance archive package that binds Phase 3K binder evidence, Phase 3L human signoff records, policy assertions, export manifests, and CSV/JSON references without activating runtime inference or operational mutations.",
  requiredBinderKey: REQUIRED_BINDER_KEY,
  requiredSignoffGateKey: REQUIRED_SIGNOFF_KEY,
  archivePackScope: ARCHIVE_PACK_SCOPE,
  exportVersions: {
    json: JSON_EXPORT_VERSION,
    csv: CSV_EXPORT_VERSION,
    manifest: MANIFEST_EXPORT_VERSION,
  },
  requiredAssertions: [
    "Archive pack is read-only and export-only.",
    "Archive pack does not approve production integration, release, or runtime activation.",
    "Archive pack does not execute model artifacts, score data, or expose inference endpoints.",
    "Archive pack does not mutate inventory, accounting, pricing, reports, customer ledger, partner ledger, supplier records, or communications.",
    "Rule/statistical baseline remains the only source of truth.",
  ],
  forbiddenBehavior: [
    "Do not treat archive pack completion as production approval.",
    "Do not run model artifacts while creating archive pack evidence.",
    "Do not emit operational recommendations, purchase quantities, price changes, or customer/supplier messages.",
    "Do not alter operational business records.",
  ],
  operationalPolicy: {
    productionIntegrationAllowed: false,
    inferenceRuntimeEnabled: false,
    decisionAutomationAllowed: false,
    canChangeInventoryOrAccounting: false,
  },
});

const buildPolicyManifest = (generatedAt: string) => ({
  generatedAt,
  policyKey: "shadow_observation_signoff_archive_pack_policy_v1",
  archiveMode: "read_only_governance_archive_package",
  sourceEvidence: [REQUIRED_BINDER_KEY, REQUIRED_SIGNOFF_KEY],
  requiredFlags: {
    featureFlagDefault,
    archivePackEnabled,
    readOnlyArchivePack,
    runtimeInvocationAllowed,
    modelExecutionAllowed,
    inferenceEndpointExposed,
    productionIntegrationAllowed,
    decisionAutomationAllowed,
    canChangeInventoryOrAccounting,
    auditOnly,
    mutationAllowed,
    exportOnly,
    humanReviewOnly,
    baselineOnlySourceOfTruth,
    operationalDecisionAllowed,
    customerSupplierMessageAllowed,
    archivalPackageOnly,
  },
});

export const buildInventoryStockoutShadowObservationSignoffArchivePack = async (importIdInput?: unknown, options: Record<string, unknown> = {}) => {
  const generatedAt = new Date().toISOString();
  const importId = asNumber(importIdInput) ?? asNumber(options.importId) ?? await pickLatestImportId();
  const contract = buildInventoryStockoutShadowObservationSignoffArchivePackContract();
  const binder = await buildInventoryStockoutShadowObservationDecisionReviewExportBinder(importId, options);
  const signoffGate = await buildInventoryStockoutShadowObservationBinderReviewSignoffGate(importId, options);
  const binderSummary = (binder as any).summary || {};
  const signoffSummary = (signoffGate as any).summary || {};
  const signoffRows = Array.isArray((signoffGate as any).signoffRows) ? (signoffGate as any).signoffRows : [];
  const evidenceSections = Array.isArray((binder as any).evidenceSections) ? (binder as any).evidenceSections : [];
  const blockerMessages = [
    ...(((binderSummary as any).blockers || []) as string[]),
    ...(((signoffSummary as any).blockers || []) as string[]),
  ];
  const warningMessages = [
    ...(((binderSummary as any).warnings || []) as string[]),
    ...(((signoffSummary as any).warnings || []) as string[]),
  ];
  const hasBinderEvidence = evidenceSections.length > 0;
  const hasHumanSignoff = signoffRows.length > 0;
  const readinessScorePct = Math.max(0, Math.min(100, Math.round((getCount((binderSummary as any).readinessScorePct) * 0.45) + (getCount((signoffSummary as any).readinessScorePct) * 0.45) + (hasBinderEvidence ? 5 : 0) + (hasHumanSignoff ? 5 : 0))));
  const archivePackStatus = blockerMessages.length ? "blocked" : hasBinderEvidence && hasHumanSignoff ? "archive_ready" : hasBinderEvidence ? "needs_human_signoff" : "needs_binder";
  const recommendation = archivePackStatus === "archive_ready" ? "archive_ready_for_governance_review" : archivePackStatus === "needs_human_signoff" ? "collect_human_signoff_before_archive" : "build_binder_before_archive";
  const policyManifest = buildPolicyManifest(generatedAt);
  const archiveManifest = {
    manifestVersion: MANIFEST_EXPORT_VERSION,
    generatedAt,
    importId,
    archivePackContractKey: ARCHIVE_PACK_CONTRACT_KEY,
    requiredBinderKey: REQUIRED_BINDER_KEY,
    requiredSignoffGateKey: REQUIRED_SIGNOFF_KEY,
    archivePackStatus,
    evidenceSectionCount: evidenceSections.length,
    humanSignoffCount: signoffRows.length,
    exportOnly: true,
    readOnlyArchivePack: true,
    productionIntegrationAllowed: false,
    inferenceRuntimeEnabled: false,
    mutationAllowed: false,
  };
  const archivePayload = {
    contract,
    importId,
    binderSummary,
    signoffSummary,
    evidenceSections,
    signoffRows,
    policyManifest,
    archiveManifest,
  };
  const archiveFingerprint = createArchiveFingerprint(archivePayload);
  const summary = {
    archivePackKey: ARCHIVE_PACK_CONTRACT_KEY,
    importId,
    archivePackStatus,
    recommendation,
    readinessScorePct,
    evidenceSectionCount: evidenceSections.length,
    humanSignoffCount: signoffRows.length,
    archiveFingerprint,
    blockers: blockerMessages,
    warnings: warningMessages,
    generatedAt,
    featureFlagKey: FEATURE_FLAG_KEY,
    featureFlagDefault,
    archivePackEnabled,
    readOnlyArchivePack,
    runtimeInvocationAllowed,
    modelExecutionAllowed,
    inferenceEndpointExposed,
    productionIntegrationAllowed,
    decisionAutomationAllowed,
    canChangeInventoryOrAccounting,
    auditOnly,
    mutationAllowed,
    exportOnly,
    humanReviewOnly,
    baselineOnlySourceOfTruth,
    operationalDecisionAllowed,
    customerSupplierMessageAllowed,
    archivalPackageOnly,
  };
  return {
    phase: "Phase 3M — Shadow Observation Signoff Archive Pack",
    contract,
    summary,
    archiveManifest,
    policyManifest,
    archivePayload: { ...archivePayload, archiveFingerprint },
    evidenceSections,
    signoffRows,
  };
};

export const buildMlShadowObservationSignoffArchivePackCatalogSummary = async () => {
  const current = await buildInventoryStockoutShadowObservationSignoffArchivePack();
  return {
    contract: buildInventoryStockoutShadowObservationSignoffArchivePackContract(),
    currentShadowObservationSignoffArchivePack: current.summary,
    lastArchivePackManifests: [current.archiveManifest],
    archivePayloadPreview: {
      evidenceSectionCount: current.evidenceSections.length,
      humanSignoffCount: current.signoffRows.length,
      archiveFingerprint: current.summary.archiveFingerprint,
    },
  };
};

export const exportInventoryStockoutShadowObservationSignoffArchivePackManifest = async (importIdInput?: unknown, options: Record<string, unknown> = {}) => {
  const pack = await buildInventoryStockoutShadowObservationSignoffArchivePack(importIdInput, options);
  return pack.archiveManifest;
};

export const exportInventoryStockoutShadowObservationSignoffArchivePackCsv = async (importIdInput?: unknown, options: Record<string, unknown> = {}) => {
  const pack = await buildInventoryStockoutShadowObservationSignoffArchivePack(importIdInput, options);
  const binderCsv = await exportInventoryStockoutShadowObservationDecisionReviewExportBinderCsv(importIdInput, options).catch(() => ({ csv: "", filename: "binder-unavailable.csv" }));
  const signoffCsv = await exportInventoryStockoutShadowObservationBinderReviewSignoffGateCsv(importIdInput, options).catch(() => ({ csv: "", filename: "signoff-unavailable.csv" }));
  const rows = [
    ["section", "key", "value", "safety_note"],
    ["archive_pack", "status", pack.summary.archivePackStatus, "Archive pack evidence only; not production approval."],
    ["archive_pack", "fingerprint", pack.summary.archiveFingerprint, "Read-only governance archive fingerprint."],
    ["archive_pack", "evidenceSectionCount", pack.summary.evidenceSectionCount, "Evidence copied from Phase 3K binder."],
    ["archive_pack", "humanSignoffCount", pack.summary.humanSignoffCount, "Human signoff evidence only; not release authorization."],
    ["policy", "runtimeInvocationAllowed", runtimeInvocationAllowed, "No runtime invocation."],
    ["policy", "modelExecutionAllowed", modelExecutionAllowed, "No model execution."],
    ["policy", "inferenceEndpointExposed", inferenceEndpointExposed, "No inference endpoint."],
    ["policy", "mutationAllowed", mutationAllowed, "No inventory/accounting mutation."],
    ["source_export", "binderCsvFilename", (binderCsv as any).filename, "Source export reference only."],
    ["source_export", "signoffCsvFilename", (signoffCsv as any).filename, "Source export reference only."],
  ];
  return {
    filename: `inventory-stockout-shadow-observation-signoff-archive-pack-${pack.summary.importId || "latest"}.csv`,
    csv: rows.map((row) => row.map(csvEscape).join(",")).join("\n"),
  };
};
