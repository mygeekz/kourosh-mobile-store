import {
  buildShadowRuntimeArtifactEnvelopeRetentionPolicyReadinessPack,
  buildShadowRuntimeArtifactEnvelopeRetentionPolicyReadinessPackContract,
} from "./shadowRuntimeArtifactEnvelopeRetentionPolicyReadinessPack.service";
import { getShadowRuntimeSafetyGate } from "./shadowRuntimeSafety";

const PHASE_LABEL = "Phase 5L — Offline Envelope Retention Evidence Export Readiness Pack" as const;
const ENVELOPE_RETENTION_EVIDENCE_EXPORT_READINESS_PACK_KEY = "shadow_runtime_artifact_envelope_retention_evidence_export_readiness_pack_v1" as const;

const nowIso = () => new Date().toISOString();

type EvidenceExportReadinessStatus = "ready_for_export_contract_review" | "review_required" | "blocked";

type EvidenceExportDimension =
  | "source_policy"
  | "export_contract"
  | "review_payload"
  | "file_generation"
  | "persistence"
  | "archive_purge_delete"
  | "artifact_access"
  | "approval_controls"
  | "business_mutation"
  | "safety_gate";

type ArtifactEnvelopeRetentionEvidenceExportRecord = {
  exportKey: string;
  exportVersion: "v1";
  sourcePolicyKey: string;
  sourceEnvelopeKey: string;
  sourceManifestKey: string;
  metadataEnvelopeOnly: true;
  exportMode: "readiness_only_no_file_generation";
  exportScope: "retention_policy_evidence_review_payload_only";
  reviewPayloadMode: "in_memory_contract_snapshot_only";
  proposedExportFormat: "json_contract_preview_only";
  fileGenerationAllowed: false;
  fileDownloadRequired: false;
  exportPersistenceAllowed: false;
  exportJobAllowed: false;
  exportQueueAllowed: false;
  archiveActionAllowed: false;
  purgeAllowed: false;
  deleteAllowed: false;
  retentionPolicyPersistenceAllowed: false;
  retentionEnforcementAllowed: false;
  expiryEnforcementAllowed: false;
  envelopePersistenceAllowed: false;
  artifactStorageAllowed: false;
  artifactFilePathStored: false;
  artifactBytesStored: false;
  artifactContentStored: false;
  artifactFileReadAllowed: false;
  artifactBytesReadAllowed: false;
  artifactImportAllowed: false;
  modelArtifactLoadAllowed: false;
  modelExecutionAllowed: false;
  inferenceEndpointExposed: false;
  productionIntegrationAllowed: false;
  decisionAutomationAllowed: false;
  approvalAllowed: false;
  activationAllowed: false;
  promotionAllowed: false;
  artifactAcceptanceAllowed: false;
  businessMutationAllowed: false;
  pricingMutationAllowed: false;
  reportMutationAllowed: false;
  ledgerMutationAllowed: false;
  inventoryMutationAllowed: false;
  accountingMutationAllowed: false;
  generatedAt: string;
  notes: string[];
};

type EvidenceExportReadinessRow = {
  exportKey: string;
  dimension: EvidenceExportDimension;
  status: EvidenceExportReadinessStatus;
  expected: string | boolean | number;
  actual: string | boolean | number | null;
  issue: string | null;
  evidence: string;
};

const REQUIRED_FALSE_EXPORT_FIELDS = [
  "fileGenerationAllowed",
  "fileDownloadRequired",
  "exportPersistenceAllowed",
  "exportJobAllowed",
  "exportQueueAllowed",
  "archiveActionAllowed",
  "purgeAllowed",
  "deleteAllowed",
  "retentionPolicyPersistenceAllowed",
  "retentionEnforcementAllowed",
  "expiryEnforcementAllowed",
  "envelopePersistenceAllowed",
  "artifactStorageAllowed",
  "artifactFilePathStored",
  "artifactBytesStored",
  "artifactContentStored",
  "artifactFileReadAllowed",
  "artifactBytesReadAllowed",
  "artifactImportAllowed",
  "modelArtifactLoadAllowed",
  "modelExecutionAllowed",
  "inferenceEndpointExposed",
  "productionIntegrationAllowed",
  "decisionAutomationAllowed",
  "approvalAllowed",
  "activationAllowed",
  "promotionAllowed",
  "artifactAcceptanceAllowed",
  "businessMutationAllowed",
  "pricingMutationAllowed",
  "reportMutationAllowed",
  "ledgerMutationAllowed",
  "inventoryMutationAllowed",
  "accountingMutationAllowed",
] as const;

const FORBIDDEN_EXPORT_FIELDS = [
  "exportFilePath",
  "exportDownloadUrl",
  "exportJobId",
  "archiveJobId",
  "purgeJobId",
  "deleteCommand",
  "artifactBytes",
  "artifactContent",
  "artifactFilePath",
  "runtimeEndpoint",
  "inferenceUrl",
  "approvalStatus",
  "activationStatus",
  "promotionStatus",
  "acceptedAt",
  "deployedAt",
  "pricingDecision",
  "inventoryMutation",
  "accountingMutation",
  "ledgerMutation",
] as const;

const buildRow = (
  exportKey: string,
  dimension: EvidenceExportDimension,
  status: EvidenceExportReadinessStatus,
  expected: string | boolean | number,
  actual: string | boolean | number | null,
  issue: string | null,
  evidence: string,
): EvidenceExportReadinessRow => ({ exportKey, dimension, status, expected, actual, issue, evidence });

const readFlag = (record: Record<string, unknown>, field: string): boolean | null => (
  typeof record[field] === "boolean" ? Boolean(record[field]) : null
);

const buildFalseFlagRow = (
  exportKey: string,
  dimension: EvidenceExportDimension,
  record: Record<string, unknown>,
  field: typeof REQUIRED_FALSE_EXPORT_FIELDS[number],
  evidence: string,
): EvidenceExportReadinessRow => {
  const actual = readFlag(record, field);
  const ready = actual === false;
  return buildRow(
    exportKey,
    dimension,
    ready ? "ready_for_export_contract_review" : "blocked",
    false,
    actual,
    ready ? null : `${field} must remain false in the offline envelope retention evidence export readiness pack.`,
    evidence,
  );
};

const buildSafetyGateRow = (exportKey: string): EvidenceExportReadinessRow => {
  const safetyGate = getShadowRuntimeSafetyGate();
  const compatible = safetyGate.runtimeInvocationAllowed === false
    && safetyGate.modelExecutionAllowed === false
    && safetyGate.inferenceEndpointExposed === false
    && safetyGate.productionIntegrationAllowed === false
    && safetyGate.decisionAutomationAllowed === false
    && safetyGate.canChangeInventoryOrAccounting === false
    && safetyGate.canChangePricing === false
    && safetyGate.canChangeReports === false
    && safetyGate.canChangeLedger === false
    && safetyGate.canMutateBusinessRecords === false;

  return buildRow(
    exportKey,
    "safety_gate",
    compatible ? "ready_for_export_contract_review" : "blocked",
    false,
    compatible ? false : true,
    compatible ? null : "Central safety gate exposes an enabled runtime, inference, production integration, decision automation, or business mutation capability.",
    "Export readiness reads the central safety gate and requires every execution, inference, production, and business mutation flag to remain false.",
  );
};

export const buildShadowRuntimeArtifactEnvelopeRetentionEvidenceExportReadinessPackContract = () => ({
  envelopeRetentionEvidenceExportReadinessPackKey: ENVELOPE_RETENTION_EVIDENCE_EXPORT_READINESS_PACK_KEY,
  envelopeRetentionEvidenceExportReadinessPackVersion: "v1",
  phase: PHASE_LABEL,
  generatedAt: nowIso(),
  purpose: "Read-only offline export readiness contract for future envelope retention policy evidence review payloads without generating files, persisting exports, archiving, purging, deleting, reading artifacts, running inference, approving, activating, promoting, or mutating business data.",
  upstreamContracts: {
    envelopeRetentionPolicyReadinessPack: buildShadowRuntimeArtifactEnvelopeRetentionPolicyReadinessPackContract().envelopeRetentionPolicyReadinessPackKey,
  },
  proposedExportShape: {
    exportScope: "retention_policy_evidence_review_payload_only",
    reviewPayloadMode: "in_memory_contract_snapshot_only",
    proposedExportFormat: "json_contract_preview_only",
    fileGenerationAllowed: false,
    exportPersistenceAllowed: false,
  },
  requiredFalseFields: [...REQUIRED_FALSE_EXPORT_FIELDS],
  forbiddenExportFields: [...FORBIDDEN_EXPORT_FIELDS],
  allowedBehavior: [
    "Describe a future export review payload contract in memory only.",
    "Map existing envelope retention policy readiness records to export readiness records without saving them.",
    "Expose retention evidence export readiness for Admin and Manager review.",
  ],
  forbiddenBehavior: [
    "Do not generate files or require file downloads in this phase.",
    "Do not persist export records, export jobs, export queues, metadata envelopes, or retention policies.",
    "Do not enforce retention, expiry, archive, purge, or deletion behavior.",
    "Do not store artifact files, paths, bytes, binaries, parsed artifact contents, or runtime commands.",
    "Do not read artifact files or bytes.",
    "Do not import, parse, or load model artifacts.",
    "Do not execute a model or call an external runtime.",
    "Do not expose an inference endpoint.",
    "Do not approve, activate, promote, accept, deploy, archive, purge, delete, export-run, or resolve candidate artifacts.",
    "Do not mutate pricing, reports, ledger, inventory, accounting, sales, repairs, partners, customers, or any business record.",
  ],
  safetyGate: getShadowRuntimeSafetyGate(),
});

export const buildShadowRuntimeArtifactEnvelopeRetentionEvidenceExportRecords = (): ArtifactEnvelopeRetentionEvidenceExportRecord[] => {
  const retentionPack = buildShadowRuntimeArtifactEnvelopeRetentionPolicyReadinessPack();
  return retentionPack.policies.map((policy) => ({
    exportKey: `retention_evidence_export_readiness_${policy.policyKey}`,
    exportVersion: "v1",
    sourcePolicyKey: policy.policyKey,
    sourceEnvelopeKey: policy.sourceEnvelopeKey,
    sourceManifestKey: policy.sourceManifestKey,
    metadataEnvelopeOnly: true,
    exportMode: "readiness_only_no_file_generation",
    exportScope: "retention_policy_evidence_review_payload_only",
    reviewPayloadMode: "in_memory_contract_snapshot_only",
    proposedExportFormat: "json_contract_preview_only",
    fileGenerationAllowed: false,
    fileDownloadRequired: false,
    exportPersistenceAllowed: false,
    exportJobAllowed: false,
    exportQueueAllowed: false,
    archiveActionAllowed: false,
    purgeAllowed: false,
    deleteAllowed: false,
    retentionPolicyPersistenceAllowed: false,
    retentionEnforcementAllowed: false,
    expiryEnforcementAllowed: false,
    envelopePersistenceAllowed: false,
    artifactStorageAllowed: false,
    artifactFilePathStored: false,
    artifactBytesStored: false,
    artifactContentStored: false,
    artifactFileReadAllowed: false,
    artifactBytesReadAllowed: false,
    artifactImportAllowed: false,
    modelArtifactLoadAllowed: false,
    modelExecutionAllowed: false,
    inferenceEndpointExposed: false,
    productionIntegrationAllowed: false,
    decisionAutomationAllowed: false,
    approvalAllowed: false,
    activationAllowed: false,
    promotionAllowed: false,
    artifactAcceptanceAllowed: false,
    businessMutationAllowed: false,
    pricingMutationAllowed: false,
    reportMutationAllowed: false,
    ledgerMutationAllowed: false,
    inventoryMutationAllowed: false,
    accountingMutationAllowed: false,
    generatedAt: nowIso(),
    notes: [
      "Retention evidence export readiness is generated from envelope retention policy readiness evidence only.",
      "The export payload is a contract preview for review only; no file generation, persistence, job queue, archive, purge, or deletion is enabled.",
      "No artifact file reading, artifact byte access, import, model execution, inference, approval, activation, promotion, artifact acceptance, or business mutation is enabled.",
    ],
  }));
};

export const buildShadowRuntimeArtifactEnvelopeRetentionEvidenceExportReadinessPack = () => {
  const contract = buildShadowRuntimeArtifactEnvelopeRetentionEvidenceExportReadinessPackContract();
  const retentionPack = buildShadowRuntimeArtifactEnvelopeRetentionPolicyReadinessPack();
  const exports = buildShadowRuntimeArtifactEnvelopeRetentionEvidenceExportRecords();
  const readinessRows = exports.flatMap((evidenceExport) => {
    const record = evidenceExport as unknown as Record<string, unknown>;
    return [
      buildRow(
        evidenceExport.exportKey,
        "source_policy",
        evidenceExport.sourcePolicyKey ? "ready_for_export_contract_review" : "review_required",
        "retention policy readiness reference",
        evidenceExport.sourcePolicyKey || null,
        evidenceExport.sourcePolicyKey ? null : "Export readiness must reference an envelope retention policy readiness record.",
        "Export readiness references retention policy evidence by key only and does not persist export records, jobs, files, or metadata envelopes.",
      ),
      buildRow(
        evidenceExport.exportKey,
        "export_contract",
        evidenceExport.exportMode === "readiness_only_no_file_generation" ? "ready_for_export_contract_review" : "blocked",
        "readiness_only_no_file_generation",
        evidenceExport.exportMode,
        evidenceExport.exportMode === "readiness_only_no_file_generation" ? null : "Export contract must remain readiness-only with no file generation.",
        "Export readiness describes a future review contract only and does not generate files.",
      ),
      buildRow(
        evidenceExport.exportKey,
        "review_payload",
        evidenceExport.reviewPayloadMode === "in_memory_contract_snapshot_only" ? "ready_for_export_contract_review" : "blocked",
        "in_memory_contract_snapshot_only",
        evidenceExport.reviewPayloadMode,
        evidenceExport.reviewPayloadMode === "in_memory_contract_snapshot_only" ? null : "Review payload must remain in-memory contract snapshot only.",
        "Review payload evidence is produced in memory only; no file download or export persistence is required.",
      ),
      buildFalseFlagRow(evidenceExport.exportKey, "file_generation", record, "fileGenerationAllowed", "File generation must remain disabled."),
      buildFalseFlagRow(evidenceExport.exportKey, "file_generation", record, "fileDownloadRequired", "File download must not be required for export readiness."),
      buildFalseFlagRow(evidenceExport.exportKey, "persistence", record, "exportPersistenceAllowed", "Export persistence must remain disabled."),
      buildFalseFlagRow(evidenceExport.exportKey, "persistence", record, "exportJobAllowed", "Export job creation must remain disabled."),
      buildFalseFlagRow(evidenceExport.exportKey, "persistence", record, "exportQueueAllowed", "Export queueing must remain disabled."),
      buildFalseFlagRow(evidenceExport.exportKey, "archive_purge_delete", record, "archiveActionAllowed", "Archive actions must remain disabled."),
      buildFalseFlagRow(evidenceExport.exportKey, "archive_purge_delete", record, "purgeAllowed", "Purge must remain disabled."),
      buildFalseFlagRow(evidenceExport.exportKey, "archive_purge_delete", record, "deleteAllowed", "Deletion must remain disabled."),
      buildFalseFlagRow(evidenceExport.exportKey, "persistence", record, "retentionPolicyPersistenceAllowed", "Retention policy persistence must remain disabled."),
      buildFalseFlagRow(evidenceExport.exportKey, "persistence", record, "retentionEnforcementAllowed", "Retention enforcement must remain disabled."),
      buildFalseFlagRow(evidenceExport.exportKey, "persistence", record, "expiryEnforcementAllowed", "Expiry enforcement must remain disabled."),
      buildFalseFlagRow(evidenceExport.exportKey, "persistence", record, "envelopePersistenceAllowed", "Envelope persistence must remain disabled."),
      buildFalseFlagRow(evidenceExport.exportKey, "artifact_access", record, "artifactStorageAllowed", "Artifact storage must remain disabled."),
      buildFalseFlagRow(evidenceExport.exportKey, "artifact_access", record, "artifactFileReadAllowed", "Artifact file reading must remain disabled."),
      buildFalseFlagRow(evidenceExport.exportKey, "artifact_access", record, "artifactBytesReadAllowed", "Artifact byte access must remain disabled."),
      buildFalseFlagRow(evidenceExport.exportKey, "artifact_access", record, "artifactImportAllowed", "Artifact import must remain disabled."),
      buildFalseFlagRow(evidenceExport.exportKey, "approval_controls", record, "approvalAllowed", "Approval controls must not be added."),
      buildFalseFlagRow(evidenceExport.exportKey, "approval_controls", record, "activationAllowed", "Activation controls must not be added."),
      buildFalseFlagRow(evidenceExport.exportKey, "approval_controls", record, "promotionAllowed", "Promotion controls must not be added."),
      buildFalseFlagRow(evidenceExport.exportKey, "approval_controls", record, "artifactAcceptanceAllowed", "Artifact acceptance controls must not be added."),
      buildFalseFlagRow(evidenceExport.exportKey, "business_mutation", record, "businessMutationAllowed", "Business mutation must remain disabled."),
      buildFalseFlagRow(evidenceExport.exportKey, "business_mutation", record, "pricingMutationAllowed", "Pricing mutation must remain disabled."),
      buildFalseFlagRow(evidenceExport.exportKey, "business_mutation", record, "reportMutationAllowed", "Report mutation must remain disabled."),
      buildFalseFlagRow(evidenceExport.exportKey, "business_mutation", record, "ledgerMutationAllowed", "Ledger mutation must remain disabled."),
      buildFalseFlagRow(evidenceExport.exportKey, "business_mutation", record, "inventoryMutationAllowed", "Inventory mutation must remain disabled."),
      buildFalseFlagRow(evidenceExport.exportKey, "business_mutation", record, "accountingMutationAllowed", "Accounting mutation must remain disabled."),
      buildSafetyGateRow(evidenceExport.exportKey),
    ];
  });

  return {
    generatedAt: nowIso(),
    phase: PHASE_LABEL,
    envelopeRetentionEvidenceExportReadinessPackKey: ENVELOPE_RETENTION_EVIDENCE_EXPORT_READINESS_PACK_KEY,
    contract,
    upstreamRetentionPolicyReadinessSnapshot: {
      envelopeRetentionPolicyReadinessPackKey: retentionPack.envelopeRetentionPolicyReadinessPackKey,
      retentionPolicyCount: retentionPack.policies.length,
      readinessRowCount: retentionPack.readinessRows.length,
      readinessIssueCount: retentionPack.readinessRows.filter((row) => row.issue).length,
    },
    exports,
    readinessRows,
  };
};

export const getShadowRuntimeArtifactEnvelopeRetentionEvidenceExportReadinessPackSummary = () => {
  const pack = buildShadowRuntimeArtifactEnvelopeRetentionEvidenceExportReadinessPack();
  const safetyGate = getShadowRuntimeSafetyGate();
  const issueCount = pack.readinessRows.filter((row) => row.issue).length;
  const blockedCount = pack.readinessRows.filter((row) => row.status === "blocked").length;
  const reviewRequiredCount = pack.readinessRows.filter((row) => row.status === "review_required").length;
  const readyCount = pack.readinessRows.filter((row) => row.status === "ready_for_export_contract_review").length;

  return {
    generatedAt: nowIso(),
    currentStatus: PHASE_LABEL,
    artifactEnvelopeRetentionEvidenceExportReadinessPackLabel: "Offline Envelope Retention Evidence Export Readiness Pack",
    artifactEnvelopeRetentionEvidenceExportReadinessPackStatus: "Offline / Read-only / Export contract evidence only",
    exportPersistence: "Not implemented",
    exportFileGeneration: "Blocked",
    exportJob: "Blocked",
    exportQueue: "Blocked",
    archiveAction: "Blocked",
    purgeAction: "Prohibited",
    deletionAction: "Blocked",
    artifactFileAccess: "Blocked",
    modelExecution: "Off",
    productionInference: "Not exposed",
    businessMutation: "Blocked",
    latestSafetyStatus: safetyGate,
    currentShadowRuntimeArtifactEnvelopeRetentionEvidenceExportReadinessPack: {
      status: "offline_retention_evidence_export_readiness_only",
      readinessScorePct: blockedCount === 0 ? 100 : 80,
      exportReadinessRecordCount: pack.exports.length,
      readinessRowCount: pack.readinessRows.length,
      readyRowCount: readyCount,
      reviewRequiredRowCount: reviewRequiredCount,
      blockedRowCount: blockedCount,
      exportIssueCount: issueCount,
      metadataEnvelopeOnly: true,
      fileGenerationAllowed: false,
      fileDownloadRequired: false,
      exportPersistenceAllowed: false,
      exportJobAllowed: false,
      exportQueueAllowed: false,
      retentionPolicyPersistenceAllowed: false,
      retentionEnforcementAllowed: false,
      expiryEnforcementAllowed: false,
      archiveActionAllowed: false,
      purgeAllowed: false,
      deleteAllowed: false,
      envelopePersistenceAllowed: false,
      artifactFileReadAllowed: false,
      artifactBytesReadAllowed: false,
      artifactImportAllowed: false,
      modelArtifactLoadAllowed: false,
      externalModelCallAllowed: false,
      approvalAllowed: false,
      activationAllowed: false,
      promotionAllowed: false,
      artifactAcceptanceAllowed: false,
      runtimeInvocationAllowed: safetyGate.runtimeInvocationAllowed,
      modelExecutionAllowed: safetyGate.modelExecutionAllowed,
      inferenceEndpointExposed: safetyGate.inferenceEndpointExposed,
      productionIntegrationAllowed: safetyGate.productionIntegrationAllowed,
      decisionAutomationAllowed: safetyGate.decisionAutomationAllowed,
      canChangeInventoryOrAccounting: safetyGate.canChangeInventoryOrAccounting,
      canChangePricing: safetyGate.canChangePricing,
      canChangeReports: safetyGate.canChangeReports,
      canChangeLedger: safetyGate.canChangeLedger,
      canMutateBusinessRecords: safetyGate.canMutateBusinessRecords,
      explanation: "Offline envelope retention evidence export readiness describes future review/export payload contracts in memory only; it does not generate files, persist export jobs, archive, purge, delete, read artifacts, load models, run inference, approve, activate, promote, accept artifacts, or mutate business data.",
      warnings: [
        "Export readiness is evidence only and no file generation, persistence, export job, or export queue is implemented.",
        "Retention policy evidence remains review-only; no archive, purge, deletion, expiry enforcement, or lifecycle worker is enabled.",
        "No artifact file reading, import, model execution, production inference endpoint, approval, activation, promotion, artifact acceptance, or business mutation is enabled.",
      ],
      blockers: [],
      recommendedNextAction: "Review the export payload contract shape before any future human-reviewed evidence export mechanism is considered.",
    },
    contract: pack.contract,
    upstreamRetentionPolicyReadinessSnapshot: pack.upstreamRetentionPolicyReadinessSnapshot,
    exports: pack.exports,
    readinessRows: pack.readinessRows,
  };
};

export const getShadowRuntimeArtifactEnvelopeRetentionEvidenceExportDetail = (exportKey: string) => {
  const pack = buildShadowRuntimeArtifactEnvelopeRetentionEvidenceExportReadinessPack();
  const evidenceExport = pack.exports.find((entry) => entry.exportKey === exportKey);
  if (!evidenceExport) return null;
  return {
    generatedAt: nowIso(),
    export: evidenceExport,
    readinessRows: pack.readinessRows.filter((row) => row.exportKey === exportKey),
    contract: pack.contract,
    upstreamRetentionPolicyReadinessSnapshot: pack.upstreamRetentionPolicyReadinessSnapshot,
  };
};
