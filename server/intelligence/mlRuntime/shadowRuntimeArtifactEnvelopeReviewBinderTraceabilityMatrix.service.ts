import {
  buildShadowRuntimeArtifactEnvelopeRetentionEvidenceExportReviewBinderDesign,
  buildShadowRuntimeArtifactEnvelopeRetentionEvidenceExportReviewBinderDesignContract,
} from "./shadowRuntimeArtifactEnvelopeRetentionEvidenceExportReviewBinderDesign.service";
import { getShadowRuntimeSafetyGate } from "./shadowRuntimeSafety";

const PHASE_LABEL = "Phase 5N — Offline Review Binder Traceability Matrix" as const;
const REVIEW_BINDER_TRACEABILITY_MATRIX_KEY = "shadow_runtime_artifact_envelope_review_binder_traceability_matrix_v1" as const;

const nowIso = () => new Date().toISOString();

type ReviewBinderTraceabilityStatus = "trace_ready" | "review_required" | "blocked";

type ReviewBinderTraceabilityDimension =
  | "binder_section"
  | "source_export_evidence"
  | "retention_policy_evidence"
  | "metadata_envelope"
  | "manifest_metadata"
  | "safety_gate"
  | "file_output"
  | "persistence"
  | "review_resolution"
  | "archive_purge_delete"
  | "artifact_access"
  | "approval_controls"
  | "business_mutation";

type ReviewBinderTraceabilityRecord = {
  traceabilityKey: string;
  traceabilityVersion: "v1";
  binderKey: string;
  binderSection: string;
  sourceExportKey: string;
  sourcePolicyKey: string;
  sourceEnvelopeKey: string;
  sourceManifestKey: string;
  traceTarget: "source_export_evidence" | "retention_policy_evidence" | "metadata_envelope" | "manifest_metadata" | "central_safety_gate" | "forbidden_action_checklist";
  traceMode: "offline_readonly_traceability_only";
  traceStatus: ReviewBinderTraceabilityStatus;
  traceEvidence: string;
  traceabilityPersistenceAllowed: false;
  traceabilityJobAllowed: false;
  traceabilityQueueAllowed: false;
  traceabilityResolutionAllowed: false;
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

type ReviewBinderTraceabilityRow = {
  traceabilityKey: string;
  binderKey: string;
  binderSection: string;
  dimension: ReviewBinderTraceabilityDimension;
  status: ReviewBinderTraceabilityStatus;
  expected: string | boolean | number;
  actual: string | boolean | number | null;
  issue: string | null;
  evidence: string;
};

const REQUIRED_FALSE_TRACEABILITY_FIELDS = [
  "traceabilityPersistenceAllowed",
  "traceabilityJobAllowed",
  "traceabilityQueueAllowed",
  "traceabilityResolutionAllowed",
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

const FORBIDDEN_TRACEABILITY_FIELDS = [
  "traceabilityJobId",
  "traceabilityResolutionId",
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

const SECTION_TARGETS: Record<string, ReviewBinderTraceabilityRecord["traceTarget"]> = {
  source_export_readiness_reference: "source_export_evidence",
  retention_policy_evidence_summary: "retention_policy_evidence",
  metadata_envelope_reference: "metadata_envelope",
  safety_gate_snapshot: "central_safety_gate",
  forbidden_action_checklist: "forbidden_action_checklist",
};

const SECTION_DIMENSIONS: Record<string, ReviewBinderTraceabilityDimension> = {
  source_export_readiness_reference: "source_export_evidence",
  retention_policy_evidence_summary: "retention_policy_evidence",
  metadata_envelope_reference: "metadata_envelope",
  safety_gate_snapshot: "safety_gate",
  forbidden_action_checklist: "binder_section",
};

const buildRow = (
  traceabilityKey: string,
  binderKey: string,
  binderSection: string,
  dimension: ReviewBinderTraceabilityDimension,
  status: ReviewBinderTraceabilityStatus,
  expected: string | boolean | number,
  actual: string | boolean | number | null,
  issue: string | null,
  evidence: string,
): ReviewBinderTraceabilityRow => ({ traceabilityKey, binderKey, binderSection, dimension, status, expected, actual, issue, evidence });

const readFlag = (record: Record<string, unknown>, field: string): boolean | null => (
  typeof record[field] === "boolean" ? Boolean(record[field]) : null
);

const buildFalseFlagRow = (
  record: ReviewBinderTraceabilityRecord,
  dimension: ReviewBinderTraceabilityDimension,
  field: typeof REQUIRED_FALSE_TRACEABILITY_FIELDS[number],
  evidence: string,
): ReviewBinderTraceabilityRow => {
  const actual = readFlag(record as unknown as Record<string, unknown>, field);
  const ready = actual === false;
  return buildRow(
    record.traceabilityKey,
    record.binderKey,
    record.binderSection,
    dimension,
    ready ? "trace_ready" : "blocked",
    false,
    actual,
    ready ? null : `${field} must remain false in the offline review binder traceability matrix.`,
    evidence,
  );
};

const buildSafetyGateRow = (record: ReviewBinderTraceabilityRecord): ReviewBinderTraceabilityRow => {
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
    record.traceabilityKey,
    record.binderKey,
    record.binderSection,
    "safety_gate",
    compatible ? "trace_ready" : "blocked",
    false,
    compatible ? false : true,
    compatible ? null : "Central safety gate exposes an enabled runtime, inference, production integration, decision automation, or business mutation capability.",
    "Traceability matrix links binder safety sections to the central safety gate and requires every execution, inference, production, and business mutation flag to remain false.",
  );
};

export const buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityMatrixContract = () => ({
  reviewBinderTraceabilityMatrixKey: REVIEW_BINDER_TRACEABILITY_MATRIX_KEY,
  reviewBinderTraceabilityMatrixVersion: "v1",
  phase: PHASE_LABEL,
  generatedAt: nowIso(),
  purpose: "Read-only offline traceability matrix linking review binder sections to source export evidence, retention policy evidence, metadata envelope references, manifest metadata references, and the central safety gate without generating files, persisting traces, signing off, resolving evidence, archiving, purging, deleting, reading artifacts, running inference, approving, activating, promoting, or mutating business data.",
  upstreamContracts: {
    evidenceExportReviewBinderDesign: buildShadowRuntimeArtifactEnvelopeRetentionEvidenceExportReviewBinderDesignContract().evidenceExportReviewBinderDesignKey,
  },
  proposedTraceabilityShape: {
    traceMode: "offline_readonly_traceability_only",
    traceabilityPersistenceAllowed: false,
    traceabilityResolutionAllowed: false,
    reviewSignoffAllowed: false,
    binderFileGenerationAllowed: false,
  },
  traceTargets: [
    "source_export_evidence",
    "retention_policy_evidence",
    "metadata_envelope",
    "manifest_metadata",
    "central_safety_gate",
    "forbidden_action_checklist",
  ],
  requiredFalseFields: [...REQUIRED_FALSE_TRACEABILITY_FIELDS],
  forbiddenTraceabilityFields: [...FORBIDDEN_TRACEABILITY_FIELDS],
  allowedBehavior: [
    "Build an in-memory traceability matrix from existing offline review binder design records.",
    "Link binder sections to source export evidence, retention policy evidence, envelope metadata, manifest metadata, and safety gate references by key only.",
    "Expose traceability evidence for Admin and Manager review.",
  ],
  forbiddenBehavior: [
    "Do not generate files, downloads, binders, traceability jobs, or traceability queues in this phase.",
    "Do not persist traceability rows, binders, export jobs, metadata envelopes, or retention policies.",
    "Do not assign reviewers, record review signoff, or resolve traceability/evidence in this phase.",
    "Do not enforce retention, expiry, archive, purge, or deletion behavior.",
    "Do not store artifact files, paths, bytes, binaries, parsed artifact contents, or runtime commands.",
    "Do not read artifact files or bytes.",
    "Do not import, parse, or load model artifacts.",
    "Do not execute a model or call an external runtime.",
    "Do not expose an inference endpoint.",
    "Do not approve, activate, promote, accept, deploy, archive, purge, delete, export-run, binder-run, traceability-run, signoff, assign-reviewer, or resolve candidate artifacts.",
    "Do not mutate pricing, reports, ledger, inventory, accounting, sales, repairs, partners, customers, or any business record.",
  ],
  safetyGate: getShadowRuntimeSafetyGate(),
});

const buildTraceabilityEvidence = (binderSection: string, traceTarget: ReviewBinderTraceabilityRecord["traceTarget"]): string => {
  if (traceTarget === "source_export_evidence") return "Binder section traces to the source envelope retention evidence export readiness key only.";
  if (traceTarget === "retention_policy_evidence") return "Binder section traces to retention policy evidence by policy key only; no retention enforcement is enabled.";
  if (traceTarget === "metadata_envelope") return "Binder section traces to metadata envelope key only; no envelope persistence or artifact storage is enabled.";
  if (traceTarget === "manifest_metadata") return "Binder section traces to manifest metadata by key only; no artifact file reading, import, or model loading is enabled.";
  if (traceTarget === "central_safety_gate") return "Binder section traces to the central safety gate and requires all runtime, inference, production, and mutation flags to remain false.";
  return `Binder section ${binderSection} traces to forbidden action evidence only; it does not create action controls.`;
};

export const buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityRecords = (): ReviewBinderTraceabilityRecord[] => {
  const binderDesign = buildShadowRuntimeArtifactEnvelopeRetentionEvidenceExportReviewBinderDesign();
  return binderDesign.binders.flatMap((binder) => binder.binderSections.map((binderSection) => {
    const traceTarget = SECTION_TARGETS[binderSection] ?? "forbidden_action_checklist";
    return {
      traceabilityKey: `review_binder_traceability_${binder.binderKey}_${binderSection}`,
      traceabilityVersion: "v1" as const,
      binderKey: binder.binderKey,
      binderSection,
      sourceExportKey: binder.sourceExportKey,
      sourcePolicyKey: binder.sourcePolicyKey,
      sourceEnvelopeKey: binder.sourceEnvelopeKey,
      sourceManifestKey: binder.sourceManifestKey,
      traceTarget,
      traceMode: "offline_readonly_traceability_only" as const,
      traceStatus: traceTarget ? "trace_ready" as const : "review_required" as const,
      traceEvidence: buildTraceabilityEvidence(binderSection, traceTarget),
      traceabilityPersistenceAllowed: false as const,
      traceabilityJobAllowed: false as const,
      traceabilityQueueAllowed: false as const,
      traceabilityResolutionAllowed: false as const,
      binderFileGenerationAllowed: false as const,
      binderDownloadAllowed: false as const,
      binderPersistenceAllowed: false as const,
      binderJobAllowed: false as const,
      binderQueueAllowed: false as const,
      exportExecutionAllowed: false as const,
      exportPersistenceAllowed: false as const,
      evidenceResolutionAllowed: false as const,
      reviewSignoffAllowed: false as const,
      reviewerAssignmentAllowed: false as const,
      archiveActionAllowed: false as const,
      purgeAllowed: false as const,
      deleteAllowed: false as const,
      retentionPolicyPersistenceAllowed: false as const,
      retentionEnforcementAllowed: false as const,
      expiryEnforcementAllowed: false as const,
      envelopePersistenceAllowed: false as const,
      artifactStorageAllowed: false as const,
      artifactFilePathStored: false as const,
      artifactBytesStored: false as const,
      artifactContentStored: false as const,
      artifactFileReadAllowed: false as const,
      artifactBytesReadAllowed: false as const,
      artifactImportAllowed: false as const,
      modelArtifactLoadAllowed: false as const,
      modelExecutionAllowed: false as const,
      inferenceEndpointExposed: false as const,
      productionIntegrationAllowed: false as const,
      decisionAutomationAllowed: false as const,
      approvalAllowed: false as const,
      activationAllowed: false as const,
      promotionAllowed: false as const,
      artifactAcceptanceAllowed: false as const,
      businessMutationAllowed: false as const,
      pricingMutationAllowed: false as const,
      reportMutationAllowed: false as const,
      ledgerMutationAllowed: false as const,
      inventoryMutationAllowed: false as const,
      accountingMutationAllowed: false as const,
      generatedAt: nowIso(),
      notes: [
        "Traceability matrix rows are generated from offline review binder design records only.",
        "Traceability links are key references only; no file generation, persistence, traceability job, reviewer assignment, signoff, evidence resolution, archive, purge, or deletion is enabled.",
        "No artifact file reading, artifact byte access, import, model execution, inference, approval, activation, promotion, artifact acceptance, or business mutation is enabled.",
      ],
    };
  }));
};

export const buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityMatrix = () => {
  const contract = buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityMatrixContract();
  const binderDesign = buildShadowRuntimeArtifactEnvelopeRetentionEvidenceExportReviewBinderDesign();
  const traceabilityRecords = buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityRecords();
  const traceabilityRows = traceabilityRecords.flatMap((record) => {
    const hasSourceExport = Boolean(record.sourceExportKey);
    const hasPolicy = Boolean(record.sourcePolicyKey);
    const hasEnvelope = Boolean(record.sourceEnvelopeKey);
    const hasManifest = Boolean(record.sourceManifestKey);
    return [
      buildRow(
        record.traceabilityKey,
        record.binderKey,
        record.binderSection,
        SECTION_DIMENSIONS[record.binderSection] ?? "binder_section",
        record.binderSection ? "trace_ready" : "review_required",
        "binder section label",
        record.binderSection || null,
        record.binderSection ? null : "Traceability record must include a binder section label.",
        "Traceability matrix maps each binder section by label only and does not generate files or action controls.",
      ),
      buildRow(
        record.traceabilityKey,
        record.binderKey,
        record.binderSection,
        "source_export_evidence",
        hasSourceExport ? "trace_ready" : "review_required",
        "source export evidence key",
        record.sourceExportKey || null,
        hasSourceExport ? null : "Traceability matrix should reference the source export evidence key.",
        "Traceability uses source export readiness keys only; no export execution or export persistence is enabled.",
      ),
      buildRow(
        record.traceabilityKey,
        record.binderKey,
        record.binderSection,
        "retention_policy_evidence",
        hasPolicy ? "trace_ready" : "review_required",
        "retention policy evidence key",
        record.sourcePolicyKey || null,
        hasPolicy ? null : "Traceability matrix should reference retention policy evidence.",
        "Retention policy traceability is evidence-only and does not enforce retention, expiry, archive, purge, or deletion behavior.",
      ),
      buildRow(
        record.traceabilityKey,
        record.binderKey,
        record.binderSection,
        "metadata_envelope",
        hasEnvelope ? "trace_ready" : "review_required",
        "metadata envelope key",
        record.sourceEnvelopeKey || null,
        hasEnvelope ? null : "Traceability matrix should reference a metadata envelope key.",
        "Metadata envelope traceability is by key only; no envelope persistence, artifact storage, or artifact path storage is enabled.",
      ),
      buildRow(
        record.traceabilityKey,
        record.binderKey,
        record.binderSection,
        "manifest_metadata",
        hasManifest ? "trace_ready" : "review_required",
        "manifest metadata key",
        record.sourceManifestKey || null,
        hasManifest ? null : "Traceability matrix should reference manifest metadata.",
        "Manifest metadata traceability is by key only; no artifact file reading, bytes access, import, or model loading is enabled.",
      ),
      buildFalseFlagRow(record, "file_output", "binderFileGenerationAllowed", "Binder file generation must remain disabled."),
      buildFalseFlagRow(record, "file_output", "binderDownloadAllowed", "Binder downloads must remain disabled."),
      buildFalseFlagRow(record, "persistence", "traceabilityPersistenceAllowed", "Traceability persistence must remain disabled."),
      buildFalseFlagRow(record, "persistence", "traceabilityJobAllowed", "Traceability jobs must remain disabled."),
      buildFalseFlagRow(record, "persistence", "traceabilityQueueAllowed", "Traceability queues must remain disabled."),
      buildFalseFlagRow(record, "review_resolution", "traceabilityResolutionAllowed", "Traceability resolution must remain disabled."),
      buildFalseFlagRow(record, "review_resolution", "evidenceResolutionAllowed", "Evidence resolution must remain disabled."),
      buildFalseFlagRow(record, "review_resolution", "reviewSignoffAllowed", "Review signoff must remain disabled."),
      buildFalseFlagRow(record, "review_resolution", "reviewerAssignmentAllowed", "Reviewer assignment must remain disabled."),
      buildFalseFlagRow(record, "archive_purge_delete", "archiveActionAllowed", "Archive actions must remain disabled."),
      buildFalseFlagRow(record, "archive_purge_delete", "purgeAllowed", "Purge must remain disabled."),
      buildFalseFlagRow(record, "archive_purge_delete", "deleteAllowed", "Deletion must remain disabled."),
      buildFalseFlagRow(record, "artifact_access", "artifactFileReadAllowed", "Artifact file reading must remain disabled."),
      buildFalseFlagRow(record, "artifact_access", "artifactBytesReadAllowed", "Artifact byte access must remain disabled."),
      buildFalseFlagRow(record, "artifact_access", "artifactImportAllowed", "Artifact import must remain disabled."),
      buildFalseFlagRow(record, "artifact_access", "modelArtifactLoadAllowed", "Model artifact loading must remain disabled."),
      buildFalseFlagRow(record, "artifact_access", "modelExecutionAllowed", "Model execution must remain disabled."),
      buildFalseFlagRow(record, "approval_controls", "approvalAllowed", "Approval controls must not be added."),
      buildFalseFlagRow(record, "approval_controls", "activationAllowed", "Activation controls must not be added."),
      buildFalseFlagRow(record, "approval_controls", "promotionAllowed", "Promotion controls must not be added."),
      buildFalseFlagRow(record, "approval_controls", "artifactAcceptanceAllowed", "Artifact acceptance controls must not be added."),
      buildFalseFlagRow(record, "business_mutation", "businessMutationAllowed", "Business mutation must remain disabled."),
      buildFalseFlagRow(record, "business_mutation", "pricingMutationAllowed", "Pricing mutation must remain disabled."),
      buildFalseFlagRow(record, "business_mutation", "reportMutationAllowed", "Report mutation must remain disabled."),
      buildFalseFlagRow(record, "business_mutation", "ledgerMutationAllowed", "Ledger mutation must remain disabled."),
      buildFalseFlagRow(record, "business_mutation", "inventoryMutationAllowed", "Inventory mutation must remain disabled."),
      buildFalseFlagRow(record, "business_mutation", "accountingMutationAllowed", "Accounting mutation must remain disabled."),
      buildSafetyGateRow(record),
    ];
  });

  return {
    generatedAt: nowIso(),
    phase: PHASE_LABEL,
    reviewBinderTraceabilityMatrixKey: REVIEW_BINDER_TRACEABILITY_MATRIX_KEY,
    contract,
    upstreamReviewBinderDesignSnapshot: {
      evidenceExportReviewBinderDesignKey: binderDesign.evidenceExportReviewBinderDesignKey,
      binderDesignRecordCount: binderDesign.binders.length,
      binderReadinessRowCount: binderDesign.readinessRows.length,
      binderIssueCount: binderDesign.readinessRows.filter((row) => row.issue).length,
    },
    traceabilityRecords,
    traceabilityRows,
  };
};

export const getShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityMatrixSummary = () => {
  const matrix = buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityMatrix();
  const safetyGate = getShadowRuntimeSafetyGate();
  const issueCount = matrix.traceabilityRows.filter((row) => row.issue).length;
  const blockedCount = matrix.traceabilityRows.filter((row) => row.status === "blocked").length;
  const reviewRequiredCount = matrix.traceabilityRows.filter((row) => row.status === "review_required").length;
  const readyCount = matrix.traceabilityRows.filter((row) => row.status === "trace_ready").length;

  return {
    generatedAt: nowIso(),
    currentStatus: PHASE_LABEL,
    artifactEnvelopeReviewBinderTraceabilityMatrixLabel: "Offline Review Binder Traceability Matrix",
    artifactEnvelopeReviewBinderTraceabilityMatrixStatus: "Offline / Read-only / Traceability evidence only",
    traceabilityPersistence: "Not implemented",
    traceabilityResolution: "Blocked",
    binderFileGeneration: "Blocked",
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
    currentShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityMatrix: {
      status: "offline_review_binder_traceability_matrix_only",
      readinessScorePct: blockedCount === 0 ? 100 : 80,
      traceabilityRecordCount: matrix.traceabilityRecords.length,
      traceabilityRowCount: matrix.traceabilityRows.length,
      readyRowCount: readyCount,
      reviewRequiredRowCount: reviewRequiredCount,
      blockedRowCount: blockedCount,
      traceabilityIssueCount: issueCount,
      sourceExportTraceCount: matrix.traceabilityRecords.filter((row) => row.traceTarget === "source_export_evidence").length,
      retentionPolicyTraceCount: matrix.traceabilityRecords.filter((row) => row.traceTarget === "retention_policy_evidence").length,
      metadataEnvelopeTraceCount: matrix.traceabilityRecords.filter((row) => row.traceTarget === "metadata_envelope").length,
      safetyGateTraceCount: matrix.traceabilityRecords.filter((row) => row.traceTarget === "central_safety_gate").length,
      metadataEnvelopeOnly: true,
      traceabilityPersistenceAllowed: false,
      traceabilityJobAllowed: false,
      traceabilityQueueAllowed: false,
      traceabilityResolutionAllowed: false,
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
      explanation: "Offline review binder traceability matrix links binder sections to source export evidence, retention policy evidence, metadata envelope references, manifest metadata, and safety gate evidence by key only; it does not generate files, persist traces, resolve evidence, sign off, archive, purge, delete, read artifacts, load models, run inference, approve, activate, promote, accept artifacts, or mutate business data.",
      warnings: [
        "Traceability matrix is evidence only and no file output, persistence, traceability job, traceability queue, reviewer assignment, signoff, or evidence resolution is implemented.",
        "Export and retention evidence remain review-only; no export execution, archive, purge, deletion, expiry enforcement, or lifecycle worker is enabled.",
        "No artifact file reading, import, model execution, production inference endpoint, approval, activation, promotion, artifact acceptance, or business mutation is enabled.",
      ],
      blockers: [],
      recommendedNextAction: "Review traceability coverage before any future evidence binder review workflow is considered.",
    },
    contract: matrix.contract,
    upstreamReviewBinderDesignSnapshot: matrix.upstreamReviewBinderDesignSnapshot,
    traceabilityRecords: matrix.traceabilityRecords,
    traceabilityRows: matrix.traceabilityRows,
  };
};

export const getShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityMatrixBinderDetail = (binderKey: string) => {
  const matrix = buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityMatrix();
  const traceabilityRecords = matrix.traceabilityRecords.filter((item) => item.binderKey === binderKey);
  if (!traceabilityRecords.length) return null;

  return {
    generatedAt: nowIso(),
    phase: PHASE_LABEL,
    binderKey,
    traceabilityRecords,
    traceabilityRows: matrix.traceabilityRows.filter((row) => row.binderKey === binderKey),
    contract: matrix.contract,
    safetyGate: getShadowRuntimeSafetyGate(),
  };
};
