import { listMlModelResultImports } from "../../db/domains/mlDatasets.db";
import {
  buildInventoryStockoutShadowObservationSignoffArchivePack,
  exportInventoryStockoutShadowObservationSignoffArchivePackManifest,
} from "./inventoryStockoutShadowObservationSignoffArchivePack.service";

const RETENTION_POLICY_CONTRACT_KEY = "inventory_stockout_shadow_observation_archive_pack_retention_policy_v1" as const;
const RETENTION_POLICY_CONTRACT_VERSION = "v1" as const;
const REQUIRED_ARCHIVE_PACK_KEY = "inventory_stockout_shadow_observation_signoff_archive_pack_v1" as const;
const RETENTION_POLICY_SCOPE = "phase3n_shadow_observation_archive_pack_retention_policy_read_only" as const;
const FEATURE_FLAG_KEY = "ml.inventoryStockout.shadowObservationArchivePackRetentionPolicy.enabled" as const;
const JSON_EXPORT_VERSION = "shadow_observation_archive_pack_retention_policy_json_v1" as const;
const CSV_EXPORT_VERSION = "shadow_observation_archive_pack_retention_policy_csv_v1" as const;
const MANIFEST_EXPORT_VERSION = "shadow_observation_archive_pack_retention_policy_manifest_v1" as const;

const featureFlagDefault = false as const;
const retentionPolicyEnabled = false as const;
const readOnlyPolicy = true as const;
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
const automaticDeletionAllowed = false as const;
const purgeJobAllowed = false as const;
const legalHoldOverrideAllowed = false as const;
const retentionPolicyAdvisoryOnly = true as const;

const defaultRetentionDays = 365 as const;
const minimumRetentionDays = 180 as const;
const reviewCadenceDays = 90 as const;

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

const addDays = (iso: string, days: number): string => {
  const date = new Date(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
};

const pickLatestImportId = async (): Promise<number | null> => {
  const imports = await listMlModelResultImports(1) as Array<Record<string, unknown>>;
  return asNumber(imports[0]?.id);
};

const createRetentionFingerprint = (payload: Record<string, unknown>): string => {
  const raw = JSON.stringify(payload);
  let hash = 0;
  for (let index = 0; index < raw.length; index += 1) {
    hash = ((hash << 5) - hash + raw.charCodeAt(index)) | 0;
  }
  return `retention-policy-${raw.length}-${Math.abs(hash)}`;
};

export const buildInventoryStockoutShadowObservationArchivePackRetentionPolicyContract = () => ({
  contractKey: RETENTION_POLICY_CONTRACT_KEY,
  contractVersion: RETENTION_POLICY_CONTRACT_VERSION,
  generatedAt: new Date().toISOString(),
  purpose: "Define a read-only retention and review policy for Phase 3M shadow observation signoff archive packs without deleting records, scheduling purge jobs, activating runtime inference, or mutating operational business data.",
  requiredArchivePackKey: REQUIRED_ARCHIVE_PACK_KEY,
  retentionPolicyScope: RETENTION_POLICY_SCOPE,
  exportVersions: {
    json: JSON_EXPORT_VERSION,
    csv: CSV_EXPORT_VERSION,
    manifest: MANIFEST_EXPORT_VERSION,
  },
  retentionDefaults: {
    defaultRetentionDays,
    minimumRetentionDays,
    reviewCadenceDays,
    automaticDeletionAllowed: false,
    purgeJobAllowed: false,
    legalHoldOverrideAllowed: false,
  },
  requiredAssertions: [
    "Retention policy is advisory, read-only, and export-only.",
    "Retention policy does not delete, purge, archive, move, compact, or rewrite evidence records.",
    "Retention policy does not approve production integration, release, runtime activation, or model execution.",
    "Retention policy does not mutate inventory, accounting, pricing, reports, customer ledger, partner ledger, supplier records, or communications.",
    "Human governance review is required before any future retention action can be implemented in a separate phase.",
  ],
  forbiddenBehavior: [
    "Do not schedule automatic deletion or purge jobs.",
    "Do not remove evidence rows or files while evaluating retention windows.",
    "Do not treat retention readiness as production approval.",
    "Do not run model artifacts or inference while building retention policy evidence.",
    "Do not emit operational recommendations, purchase quantities, price changes, or customer/supplier messages.",
  ],
  operationalPolicy: {
    productionIntegrationAllowed: false,
    inferenceRuntimeEnabled: false,
    decisionAutomationAllowed: false,
    canChangeInventoryOrAccounting: false,
    automaticDeletionAllowed: false,
  },
});

const buildPolicyManifest = (generatedAt: string) => ({
  generatedAt,
  policyKey: "shadow_observation_archive_pack_retention_policy_manifest_v1",
  policyMode: "read_only_retention_policy_advisory",
  sourceEvidence: [REQUIRED_ARCHIVE_PACK_KEY],
  retentionDefaults: {
    defaultRetentionDays,
    minimumRetentionDays,
    reviewCadenceDays,
  },
  requiredFlags: {
    featureFlagDefault,
    retentionPolicyEnabled,
    readOnlyPolicy,
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
    automaticDeletionAllowed,
    purgeJobAllowed,
    legalHoldOverrideAllowed,
    retentionPolicyAdvisoryOnly,
  },
});

export const buildInventoryStockoutShadowObservationArchivePackRetentionPolicy = async (importIdInput?: unknown, options: Record<string, unknown> = {}) => {
  const generatedAt = new Date().toISOString();
  const importId = asNumber(importIdInput) ?? asNumber(options.importId) ?? await pickLatestImportId();
  const requestedRetentionDays = asNumber(options.retentionDays);
  const retentionDays = Math.max(minimumRetentionDays, requestedRetentionDays ?? defaultRetentionDays);
  const archivePack = await buildInventoryStockoutShadowObservationSignoffArchivePack(importId, options);
  const archiveManifest = await exportInventoryStockoutShadowObservationSignoffArchivePackManifest(importId, options).catch(() => (archivePack as any).archiveManifest || {});
  const archiveSummary = (archivePack as any).summary || {};
  const archiveGeneratedAt = typeof (archiveManifest as any).generatedAt === "string" ? (archiveManifest as any).generatedAt : generatedAt;
  const retainUntil = addDays(archiveGeneratedAt, retentionDays);
  const nextGovernanceReviewAt = addDays(generatedAt, reviewCadenceDays);
  const blockerMessages = [
    ...(((archiveSummary as any).blockers || []) as string[]),
  ];
  const warningMessages = [
    ...(((archiveSummary as any).warnings || []) as string[]),
    automaticDeletionAllowed ? "automatic deletion unexpectedly enabled" : "Retention policy is advisory only; no deletion or purge job is allowed in Phase 3N.",
  ];
  const archiveFingerprint = typeof (archiveSummary as any).archiveFingerprint === "string" ? (archiveSummary as any).archiveFingerprint : "archive-fingerprint-unavailable";
  const retentionPolicyStatus = blockerMessages.length ? "blocked" : archiveFingerprint === "archive-fingerprint-unavailable" ? "needs_archive_pack" : "retention_policy_ready";
  const recommendation = retentionPolicyStatus === "retention_policy_ready" ? "retain_archive_pack_and_review_on_schedule" : "build_archive_pack_before_retention_review";
  const retentionManifest = {
    manifestVersion: MANIFEST_EXPORT_VERSION,
    generatedAt,
    importId,
    retentionPolicyContractKey: RETENTION_POLICY_CONTRACT_KEY,
    requiredArchivePackKey: REQUIRED_ARCHIVE_PACK_KEY,
    archiveFingerprint,
    retentionPolicyStatus,
    retentionDays,
    retainUntil,
    nextGovernanceReviewAt,
    automaticDeletionAllowed,
    purgeJobAllowed,
    mutationAllowed,
    readOnlyPolicy,
  };
  const policyManifest = buildPolicyManifest(generatedAt);
  const retentionPayload = {
    contract: buildInventoryStockoutShadowObservationArchivePackRetentionPolicyContract(),
    importId,
    archiveSummary,
    archiveManifest,
    retentionManifest,
    policyManifest,
  };
  const retentionFingerprint = createRetentionFingerprint(retentionPayload);
  const readinessScorePct = Math.max(0, Math.min(100, Math.round((getCount((archiveSummary as any).readinessScorePct) * 0.8) + (archiveFingerprint !== "archive-fingerprint-unavailable" ? 10 : 0) + (retentionDays >= minimumRetentionDays ? 10 : 0))));
  const summary = {
    retentionPolicyKey: RETENTION_POLICY_CONTRACT_KEY,
    importId,
    retentionPolicyStatus,
    recommendation,
    readinessScorePct,
    archiveFingerprint,
    retentionFingerprint,
    retentionDays,
    retainUntil,
    nextGovernanceReviewAt,
    blockers: blockerMessages,
    warnings: warningMessages,
    generatedAt,
    featureFlagKey: FEATURE_FLAG_KEY,
    featureFlagDefault,
    retentionPolicyEnabled,
    readOnlyPolicy,
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
    automaticDeletionAllowed,
    purgeJobAllowed,
    legalHoldOverrideAllowed,
    retentionPolicyAdvisoryOnly,
  };
  return {
    phase: "Phase 3N — Shadow Archive Pack Retention Policy",
    contract: buildInventoryStockoutShadowObservationArchivePackRetentionPolicyContract(),
    summary,
    retentionManifest,
    policyManifest,
    retentionPayload: { ...retentionPayload, retentionFingerprint },
    archiveManifest,
  };
};

export const buildMlShadowObservationArchivePackRetentionPolicyCatalogSummary = async () => {
  const current = await buildInventoryStockoutShadowObservationArchivePackRetentionPolicy();
  return {
    contract: buildInventoryStockoutShadowObservationArchivePackRetentionPolicyContract(),
    currentShadowObservationArchivePackRetentionPolicy: current.summary,
    lastRetentionPolicyManifests: [current.retentionManifest],
    retentionPayloadPreview: {
      archiveFingerprint: current.summary.archiveFingerprint,
      retentionFingerprint: current.summary.retentionFingerprint,
      retainUntil: current.summary.retainUntil,
      nextGovernanceReviewAt: current.summary.nextGovernanceReviewAt,
    },
  };
};

export const exportInventoryStockoutShadowObservationArchivePackRetentionPolicyManifest = async (importIdInput?: unknown, options: Record<string, unknown> = {}) => {
  const policy = await buildInventoryStockoutShadowObservationArchivePackRetentionPolicy(importIdInput, options);
  return policy.retentionManifest;
};

export const exportInventoryStockoutShadowObservationArchivePackRetentionPolicyCsv = async (importIdInput?: unknown, options: Record<string, unknown> = {}) => {
  const policy = await buildInventoryStockoutShadowObservationArchivePackRetentionPolicy(importIdInput, options);
  const rows = [
    ["section", "key", "value", "safety_note"],
    ["retention_policy", "status", policy.summary.retentionPolicyStatus, "Retention policy evidence only; not deletion approval."],
    ["retention_policy", "fingerprint", policy.summary.retentionFingerprint, "Read-only retention policy fingerprint."],
    ["retention_policy", "retentionDays", policy.summary.retentionDays, "Advisory retention window only."],
    ["retention_policy", "retainUntil", policy.summary.retainUntil, "No automatic deletion after this date."],
    ["retention_policy", "nextGovernanceReviewAt", policy.summary.nextGovernanceReviewAt, "Human governance review date only."],
    ["source_archive", "archiveFingerprint", policy.summary.archiveFingerprint, "Source Phase 3M archive reference only."],
    ["policy", "automaticDeletionAllowed", automaticDeletionAllowed, "No automatic deletion."],
    ["policy", "purgeJobAllowed", purgeJobAllowed, "No purge job."],
    ["policy", "runtimeInvocationAllowed", runtimeInvocationAllowed, "No runtime invocation."],
    ["policy", "modelExecutionAllowed", modelExecutionAllowed, "No model execution."],
    ["policy", "inferenceEndpointExposed", inferenceEndpointExposed, "No inference endpoint."],
    ["policy", "mutationAllowed", mutationAllowed, "No inventory/accounting mutation."],
  ];
  return {
    filename: `inventory-stockout-shadow-observation-archive-pack-retention-policy-${policy.summary.importId || "latest"}.csv`,
    csv: rows.map((row) => row.map(csvEscape).join(",")).join("\n"),
  };
};
