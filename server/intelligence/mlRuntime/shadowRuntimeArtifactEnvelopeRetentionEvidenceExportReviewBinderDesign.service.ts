import {
  buildShadowRuntimeArtifactEnvelopeRetentionEvidenceExportReadinessPack,
  buildShadowRuntimeArtifactEnvelopeRetentionEvidenceExportReadinessPackContract,
} from "./shadowRuntimeArtifactEnvelopeRetentionEvidenceExportReadinessPack.service";
import { getShadowRuntimeSafetyGate } from "./shadowRuntimeSafety";

const PHASE_LABEL = "Phase 5M — Offline Evidence Export Review Binder Design" as const;
const EVIDENCE_EXPORT_REVIEW_BINDER_DESIGN_KEY = "shadow_runtime_artifact_envelope_retention_evidence_export_review_binder_design_v1" as const;

const nowIso = () => new Date().toISOString();

type ReviewBinderDesignStatus = "ready_for_human_review_design" | "review_required" | "blocked";

type ReviewBinderDesignDimension =
  | "source_export_readiness"
  | "binder_contract"
  | "binder_sections"
  | "file_generation"
  | "persistence"
  | "review_resolution"
  | "archive_purge_delete"
  | "artifact_access"
  | "approval_controls"
  | "business_mutation"
  | "safety_gate";

type EvidenceExportReviewBinderDesignRecord = {
  binderKey: string;
  binderVersion: "v1";
  sourceExportKey: string;
  sourcePolicyKey: string;
  sourceEnvelopeKey: string;
  sourceManifestKey: string;
  metadataEnvelopeOnly: true;
  binderMode: "readiness_only_no_file_generation";
  binderScope: "human_review_binder_design_only";
  binderPayloadMode: "in_memory_design_snapshot_only";
  binderSections: string[];
  binderFileGenerationAllowed: false;
  binderDownloadAllowed: false;
  binderPersistenceAllowed: false;
  binderJobAllowed: false;
  binderQueueAllowed: false;
  exportExecutionAllowed: false;
  exportPersistenceAllowed: false;
  evidenceResolutionAllowed: false;
  reviewSignoffAllowed: false;
  reviewerAssignmentAllowed: false;
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

type ReviewBinderDesignRow = {
  binderKey: string;
  dimension: ReviewBinderDesignDimension;
  status: ReviewBinderDesignStatus;
  expected: string | boolean | number;
  actual: string | boolean | number | null;
  issue: string | null;
  evidence: string;
};

const REQUIRED_FALSE_BINDER_FIELDS = [
  "binderFileGenerationAllowed",
  "binderDownloadAllowed",
  "binderPersistenceAllowed",
  "binderJobAllowed",
  "binderQueueAllowed",
  "exportExecutionAllowed",
  "exportPersistenceAllowed",
  "evidenceResolutionAllowed",
  "reviewSignoffAllowed",
  "reviewerAssignmentAllowed",
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

const FORBIDDEN_BINDER_FIELDS = [
  "binderFilePath",
  "binderDownloadUrl",
  "binderJobId",
  "exportJobId",
  "reviewSignoffId",
  "reviewerAssignmentId",
  "evidenceResolutionId",
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
  binderKey: string,
  dimension: ReviewBinderDesignDimension,
  status: ReviewBinderDesignStatus,
  expected: string | boolean | number,
  actual: string | boolean | number | null,
  issue: string | null,
  evidence: string,
): ReviewBinderDesignRow => ({ binderKey, dimension, status, expected, actual, issue, evidence });

const readFlag = (record: Record<string, unknown>, field: string): boolean | null => (
  typeof record[field] === "boolean" ? Boolean(record[field]) : null
);

const buildFalseFlagRow = (
  binderKey: string,
  dimension: ReviewBinderDesignDimension,
  record: Record<string, unknown>,
  field: typeof REQUIRED_FALSE_BINDER_FIELDS[number],
  evidence: string,
): ReviewBinderDesignRow => {
  const actual = readFlag(record, field);
  const ready = actual === false;
  return buildRow(
    binderKey,
    dimension,
    ready ? "ready_for_human_review_design" : "blocked",
    false,
    actual,
    ready ? null : `${field} must remain false in the offline evidence export review binder design.`,
    evidence,
  );
};

const buildSafetyGateRow = (binderKey: string): ReviewBinderDesignRow => {
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
    binderKey,
    "safety_gate",
    compatible ? "ready_for_human_review_design" : "blocked",
    false,
    compatible ? false : true,
    compatible ? null : "Central safety gate exposes an enabled runtime, inference, production integration, decision automation, or business mutation capability.",
    "Review binder design reads the central safety gate and requires every execution, inference, production, and business mutation flag to remain false.",
  );
};

export const buildShadowRuntimeArtifactEnvelopeRetentionEvidenceExportReviewBinderDesignContract = () => ({
  evidenceExportReviewBinderDesignKey: EVIDENCE_EXPORT_REVIEW_BINDER_DESIGN_KEY,
  evidenceExportReviewBinderDesignVersion: "v1",
  phase: PHASE_LABEL,
  generatedAt: nowIso(),
  purpose: "Read-only offline review binder design for future human review of envelope retention evidence export readiness without generating files, persisting binders, assigning reviewers, signing off, resolving evidence, archiving, purging, deleting, reading artifacts, running inference, approving, activating, promoting, or mutating business data.",
  upstreamContracts: {
    envelopeRetentionEvidenceExportReadinessPack: buildShadowRuntimeArtifactEnvelopeRetentionEvidenceExportReadinessPackContract().envelopeRetentionEvidenceExportReadinessPackKey,
  },
  proposedBinderShape: {
    binderScope: "human_review_binder_design_only",
    binderPayloadMode: "in_memory_design_snapshot_only",
    binderMode: "readiness_only_no_file_generation",
    binderFileGenerationAllowed: false,
    binderPersistenceAllowed: false,
    reviewSignoffAllowed: false,
  },
  requiredFalseFields: [...REQUIRED_FALSE_BINDER_FIELDS],
  forbiddenBinderFields: [...FORBIDDEN_BINDER_FIELDS],
  binderSections: [
    "source_export_readiness_reference",
    "retention_policy_evidence_summary",
    "metadata_envelope_reference",
    "safety_gate_snapshot",
    "forbidden_action_checklist",
  ],
  allowedBehavior: [
    "Describe a future human review binder design in memory only.",
    "Map existing envelope retention evidence export readiness records to binder design records without saving them.",
    "Expose binder design evidence for Admin and Manager review.",
  ],
  forbiddenBehavior: [
    "Do not generate binder files or downloads in this phase.",
    "Do not persist binders, binder jobs, binder queues, export jobs, metadata envelopes, or retention policies.",
    "Do not assign reviewers, record review signoff, or resolve evidence in this phase.",
    "Do not enforce retention, expiry, archive, purge, or deletion behavior.",
    "Do not store artifact files, paths, bytes, binaries, parsed artifact contents, or runtime commands.",
    "Do not read artifact files or bytes.",
    "Do not import, parse, or load model artifacts.",
    "Do not execute a model or call an external runtime.",
    "Do not expose an inference endpoint.",
    "Do not approve, activate, promote, accept, deploy, archive, purge, delete, export-run, binder-run, signoff, assign-reviewer, or resolve candidate artifacts.",
    "Do not mutate pricing, reports, ledger, inventory, accounting, sales, repairs, partners, customers, or any business record.",
  ],
  safetyGate: getShadowRuntimeSafetyGate(),
});

export const buildShadowRuntimeArtifactEnvelopeRetentionEvidenceExportReviewBinderDesignRecords = (): EvidenceExportReviewBinderDesignRecord[] => {
  const exportPack = buildShadowRuntimeArtifactEnvelopeRetentionEvidenceExportReadinessPack();
  return exportPack.exports.map((exportReadiness) => ({
    binderKey: `evidence_export_review_binder_design_${exportReadiness.exportKey}`,
    binderVersion: "v1",
    sourceExportKey: exportReadiness.exportKey,
    sourcePolicyKey: exportReadiness.sourcePolicyKey,
    sourceEnvelopeKey: exportReadiness.sourceEnvelopeKey,
    sourceManifestKey: exportReadiness.sourceManifestKey,
    metadataEnvelopeOnly: true,
    binderMode: "readiness_only_no_file_generation",
    binderScope: "human_review_binder_design_only",
    binderPayloadMode: "in_memory_design_snapshot_only",
    binderSections: [
      "source_export_readiness_reference",
      "retention_policy_evidence_summary",
      "metadata_envelope_reference",
      "safety_gate_snapshot",
      "forbidden_action_checklist",
    ],
    binderFileGenerationAllowed: false,
    binderDownloadAllowed: false,
    binderPersistenceAllowed: false,
    binderJobAllowed: false,
    binderQueueAllowed: false,
    exportExecutionAllowed: false,
    exportPersistenceAllowed: false,
    evidenceResolutionAllowed: false,
    reviewSignoffAllowed: false,
    reviewerAssignmentAllowed: false,
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
      "Review binder design is generated from envelope retention evidence export readiness records only.",
      "The binder payload is a contract design for human review only; no file generation, persistence, binder job, reviewer assignment, signoff, archive, purge, or deletion is enabled.",
      "No artifact file reading, artifact byte access, import, model execution, inference, approval, activation, promotion, artifact acceptance, or business mutation is enabled.",
    ],
  }));
};

export const buildShadowRuntimeArtifactEnvelopeRetentionEvidenceExportReviewBinderDesign = () => {
  const contract = buildShadowRuntimeArtifactEnvelopeRetentionEvidenceExportReviewBinderDesignContract();
  const exportPack = buildShadowRuntimeArtifactEnvelopeRetentionEvidenceExportReadinessPack();
  const binders = buildShadowRuntimeArtifactEnvelopeRetentionEvidenceExportReviewBinderDesignRecords();
  const readinessRows = binders.flatMap((binder) => {
    const record = binder as unknown as Record<string, unknown>;
    return [
      buildRow(
        binder.binderKey,
        "source_export_readiness",
        binder.sourceExportKey ? "ready_for_human_review_design" : "review_required",
        "retention evidence export readiness reference",
        binder.sourceExportKey || null,
        binder.sourceExportKey ? null : "Review binder design must reference an envelope retention evidence export readiness record.",
        "Review binder design references export readiness evidence by key only and does not persist binder records, jobs, files, or metadata envelopes.",
      ),
      buildRow(
        binder.binderKey,
        "binder_contract",
        binder.binderMode === "readiness_only_no_file_generation" ? "ready_for_human_review_design" : "blocked",
        "readiness_only_no_file_generation",
        binder.binderMode,
        binder.binderMode === "readiness_only_no_file_generation" ? null : "Binder design must remain readiness-only with no file generation.",
        "Binder design describes a future human review package only and does not generate files.",
      ),
      buildRow(
        binder.binderKey,
        "binder_sections",
        binder.binderSections.length >= 3 ? "ready_for_human_review_design" : "review_required",
        3,
        binder.binderSections.length,
        binder.binderSections.length >= 3 ? null : "Binder design should include enough sections for human review context.",
        "Binder sections are labels only and do not create files, signoff records, reviewer assignments, or persistence.",
      ),
      buildFalseFlagRow(binder.binderKey, "file_generation", record, "binderFileGenerationAllowed", "Binder file generation must remain disabled."),
      buildFalseFlagRow(binder.binderKey, "file_generation", record, "binderDownloadAllowed", "Binder downloads must remain disabled."),
      buildFalseFlagRow(binder.binderKey, "persistence", record, "binderPersistenceAllowed", "Binder persistence must remain disabled."),
      buildFalseFlagRow(binder.binderKey, "persistence", record, "binderJobAllowed", "Binder jobs must remain disabled."),
      buildFalseFlagRow(binder.binderKey, "persistence", record, "binderQueueAllowed", "Binder queues must remain disabled."),
      buildFalseFlagRow(binder.binderKey, "persistence", record, "exportExecutionAllowed", "Export execution must remain disabled."),
      buildFalseFlagRow(binder.binderKey, "persistence", record, "exportPersistenceAllowed", "Export persistence must remain disabled."),
      buildFalseFlagRow(binder.binderKey, "review_resolution", record, "evidenceResolutionAllowed", "Evidence resolution must remain disabled."),
      buildFalseFlagRow(binder.binderKey, "review_resolution", record, "reviewSignoffAllowed", "Review signoff must remain disabled."),
      buildFalseFlagRow(binder.binderKey, "review_resolution", record, "reviewerAssignmentAllowed", "Reviewer assignment must remain disabled."),
      buildFalseFlagRow(binder.binderKey, "archive_purge_delete", record, "archiveActionAllowed", "Archive actions must remain disabled."),
      buildFalseFlagRow(binder.binderKey, "archive_purge_delete", record, "purgeAllowed", "Purge must remain disabled."),
      buildFalseFlagRow(binder.binderKey, "archive_purge_delete", record, "deleteAllowed", "Deletion must remain disabled."),
      buildFalseFlagRow(binder.binderKey, "persistence", record, "retentionPolicyPersistenceAllowed", "Retention policy persistence must remain disabled."),
      buildFalseFlagRow(binder.binderKey, "persistence", record, "retentionEnforcementAllowed", "Retention enforcement must remain disabled."),
      buildFalseFlagRow(binder.binderKey, "persistence", record, "expiryEnforcementAllowed", "Expiry enforcement must remain disabled."),
      buildFalseFlagRow(binder.binderKey, "persistence", record, "envelopePersistenceAllowed", "Envelope persistence must remain disabled."),
      buildFalseFlagRow(binder.binderKey, "artifact_access", record, "artifactStorageAllowed", "Artifact storage must remain disabled."),
      buildFalseFlagRow(binder.binderKey, "artifact_access", record, "artifactFileReadAllowed", "Artifact file reading must remain disabled."),
      buildFalseFlagRow(binder.binderKey, "artifact_access", record, "artifactBytesReadAllowed", "Artifact byte access must remain disabled."),
      buildFalseFlagRow(binder.binderKey, "artifact_access", record, "artifactImportAllowed", "Artifact import must remain disabled."),
      buildFalseFlagRow(binder.binderKey, "approval_controls", record, "approvalAllowed", "Approval controls must not be added."),
      buildFalseFlagRow(binder.binderKey, "approval_controls", record, "activationAllowed", "Activation controls must not be added."),
      buildFalseFlagRow(binder.binderKey, "approval_controls", record, "promotionAllowed", "Promotion controls must not be added."),
      buildFalseFlagRow(binder.binderKey, "approval_controls", record, "artifactAcceptanceAllowed", "Artifact acceptance controls must not be added."),
      buildFalseFlagRow(binder.binderKey, "business_mutation", record, "businessMutationAllowed", "Business mutation must remain disabled."),
      buildFalseFlagRow(binder.binderKey, "business_mutation", record, "pricingMutationAllowed", "Pricing mutation must remain disabled."),
      buildFalseFlagRow(binder.binderKey, "business_mutation", record, "reportMutationAllowed", "Report mutation must remain disabled."),
      buildFalseFlagRow(binder.binderKey, "business_mutation", record, "ledgerMutationAllowed", "Ledger mutation must remain disabled."),
      buildFalseFlagRow(binder.binderKey, "business_mutation", record, "inventoryMutationAllowed", "Inventory mutation must remain disabled."),
      buildFalseFlagRow(binder.binderKey, "business_mutation", record, "accountingMutationAllowed", "Accounting mutation must remain disabled."),
      buildSafetyGateRow(binder.binderKey),
    ];
  });

  return {
    generatedAt: nowIso(),
    phase: PHASE_LABEL,
    evidenceExportReviewBinderDesignKey: EVIDENCE_EXPORT_REVIEW_BINDER_DESIGN_KEY,
    contract,
    upstreamEvidenceExportReadinessSnapshot: {
      envelopeRetentionEvidenceExportReadinessPackKey: exportPack.envelopeRetentionEvidenceExportReadinessPackKey,
      exportReadinessRecordCount: exportPack.exports.length,
      readinessRowCount: exportPack.readinessRows.length,
      readinessIssueCount: exportPack.readinessRows.filter((row) => row.issue).length,
    },
    binders,
    readinessRows,
  };
};

export const getShadowRuntimeArtifactEnvelopeRetentionEvidenceExportReviewBinderDesignSummary = () => {
  const design = buildShadowRuntimeArtifactEnvelopeRetentionEvidenceExportReviewBinderDesign();
  const safetyGate = getShadowRuntimeSafetyGate();
  const issueCount = design.readinessRows.filter((row) => row.issue).length;
  const blockedCount = design.readinessRows.filter((row) => row.status === "blocked").length;
  const reviewRequiredCount = design.readinessRows.filter((row) => row.status === "review_required").length;
  const readyCount = design.readinessRows.filter((row) => row.status === "ready_for_human_review_design").length;

  return {
    generatedAt: nowIso(),
    currentStatus: PHASE_LABEL,
    artifactEnvelopeRetentionEvidenceExportReviewBinderDesignLabel: "Offline Evidence Export Review Binder Design",
    artifactEnvelopeRetentionEvidenceExportReviewBinderDesignStatus: "Offline / Read-only / Human review binder design only",
    binderPersistence: "Not implemented",
    binderFileGeneration: "Blocked",
    binderJob: "Blocked",
    binderQueue: "Blocked",
    reviewerAssignment: "Blocked",
    reviewSignoff: "Blocked",
    evidenceResolution: "Blocked",
    exportExecution: "Blocked",
    archiveAction: "Blocked",
    purgeAction: "Prohibited",
    deletionAction: "Blocked",
    artifactFileAccess: "Blocked",
    modelExecution: "Off",
    productionInference: "Not exposed",
    businessMutation: "Blocked",
    latestSafetyStatus: safetyGate,
    currentShadowRuntimeArtifactEnvelopeRetentionEvidenceExportReviewBinderDesign: {
      status: "offline_evidence_export_review_binder_design_only",
      readinessScorePct: blockedCount === 0 ? 100 : 80,
      binderDesignRecordCount: design.binders.length,
      readinessRowCount: design.readinessRows.length,
      readyRowCount: readyCount,
      reviewRequiredRowCount: reviewRequiredCount,
      blockedRowCount: blockedCount,
      binderIssueCount: issueCount,
      metadataEnvelopeOnly: true,
      binderFileGenerationAllowed: false,
      binderDownloadAllowed: false,
      binderPersistenceAllowed: false,
      binderJobAllowed: false,
      binderQueueAllowed: false,
      exportExecutionAllowed: false,
      exportPersistenceAllowed: false,
      evidenceResolutionAllowed: false,
      reviewSignoffAllowed: false,
      reviewerAssignmentAllowed: false,
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
      explanation: "Offline evidence export review binder design describes future human review binder structure in memory only; it does not generate files, persist binders, assign reviewers, sign off, resolve evidence, execute exports, archive, purge, delete, read artifacts, load models, run inference, approve, activate, promote, accept artifacts, or mutate business data.",
      warnings: [
        "Review binder design is evidence only and no file generation, download, persistence, binder job, binder queue, reviewer assignment, signoff, or evidence resolution is implemented.",
        "Export readiness evidence remains review-only; no export execution, archive, purge, deletion, expiry enforcement, or lifecycle worker is enabled.",
        "No artifact file reading, import, model execution, production inference endpoint, approval, activation, promotion, artifact acceptance, or business mutation is enabled.",
      ],
      blockers: [],
      recommendedNextAction: "Review the offline binder section design before any future human-reviewed evidence binder mechanism is considered.",
    },
    contract: design.contract,
    upstreamEvidenceExportReadinessSnapshot: design.upstreamEvidenceExportReadinessSnapshot,
    binders: design.binders,
    readinessRows: design.readinessRows,
  };
};

export const getShadowRuntimeArtifactEnvelopeRetentionEvidenceExportReviewBinderDetail = (binderKey: string) => {
  const design = buildShadowRuntimeArtifactEnvelopeRetentionEvidenceExportReviewBinderDesign();
  const binder = design.binders.find((item) => item.binderKey === binderKey);
  if (!binder) return null;

  return {
    generatedAt: nowIso(),
    phase: PHASE_LABEL,
    binder,
    readinessRows: design.readinessRows.filter((row) => row.binderKey === binderKey),
    contract: design.contract,
    safetyGate: getShadowRuntimeSafetyGate(),
  };
};
