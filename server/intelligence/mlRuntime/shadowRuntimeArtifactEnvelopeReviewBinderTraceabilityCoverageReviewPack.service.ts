import {
  buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityMatrix,
  buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityMatrixContract,
} from "./shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityMatrix.service";
import { getShadowRuntimeSafetyGate } from "./shadowRuntimeSafety";

const PHASE_LABEL = "Phase 5O — Offline Traceability Coverage Review Pack" as const;
const TRACEABILITY_COVERAGE_REVIEW_PACK_KEY = "shadow_runtime_artifact_envelope_review_binder_traceability_coverage_review_pack_v1" as const;

const nowIso = () => new Date().toISOString();

type TraceabilityCoverageStatus = "coverage_ready" | "review_required" | "blocked";
type TraceabilityCoverageDimension =
  | "binder_section_coverage"
  | "source_export_evidence_coverage"
  | "retention_policy_evidence_coverage"
  | "metadata_envelope_coverage"
  | "manifest_metadata_coverage"
  | "safety_gate_coverage"
  | "forbidden_action_coverage"
  | "file_output"
  | "persistence"
  | "resolution_signoff"
  | "archive_purge_delete"
  | "artifact_access"
  | "inference_controls"
  | "approval_controls"
  | "business_mutation";

type TraceabilityCoverageRecord = {
  coverageKey: string;
  coverageVersion: "v1";
  binderKey: string;
  traceabilityRecordCount: number;
  traceabilityRowCount: number;
  coveredSourceCount: number;
  requiredSourceCount: number;
  coveragePct: number;
  status: TraceabilityCoverageStatus;
  sourceExportCovered: boolean;
  retentionPolicyCovered: boolean;
  metadataEnvelopeCovered: boolean;
  manifestMetadataCovered: boolean;
  safetyGateCovered: boolean;
  forbiddenActionCoverageReviewed: boolean;
  traceabilityCoveragePersistenceAllowed: false;
  traceabilityCoverageJobAllowed: false;
  traceabilityCoverageQueueAllowed: false;
  coverageResolutionAllowed: false;
  reviewerAssignmentAllowed: false;
  reviewSignoffAllowed: false;
  evidenceResolutionAllowed: false;
  fileOutputAllowed: false;
  coverageExportAllowed: false;
  coverageDownloadAllowed: false;
  coveragePersistenceAllowed: false;
  traceabilityPersistenceAllowed: false;
  traceabilityResolutionAllowed: false;
  binderFileGenerationAllowed: false;
  binderPersistenceAllowed: false;
  exportExecutionAllowed: false;
  exportPersistenceAllowed: false;
  archiveActionAllowed: false;
  purgeAllowed: false;
  deleteAllowed: false;
  retentionPolicyPersistenceAllowed: false;
  retentionEnforcementAllowed: false;
  expiryEnforcementAllowed: false;
  envelopePersistenceAllowed: false;
  artifactStorageAllowed: false;
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

type TraceabilityCoverageRow = {
  coverageKey: string;
  binderKey: string;
  dimension: TraceabilityCoverageDimension;
  status: TraceabilityCoverageStatus;
  expected: string | boolean | number;
  actual: string | boolean | number | null;
  issue: string | null;
  evidence: string;
};

const REQUIRED_FALSE_COVERAGE_FIELDS = [
  "traceabilityCoveragePersistenceAllowed",
  "traceabilityCoverageJobAllowed",
  "traceabilityCoverageQueueAllowed",
  "coverageResolutionAllowed",
  "reviewerAssignmentAllowed",
  "reviewSignoffAllowed",
  "evidenceResolutionAllowed",
  "fileOutputAllowed",
  "coverageExportAllowed",
  "coverageDownloadAllowed",
  "coveragePersistenceAllowed",
  "traceabilityPersistenceAllowed",
  "traceabilityResolutionAllowed",
  "binderFileGenerationAllowed",
  "binderPersistenceAllowed",
  "exportExecutionAllowed",
  "exportPersistenceAllowed",
  "archiveActionAllowed",
  "purgeAllowed",
  "deleteAllowed",
  "retentionPolicyPersistenceAllowed",
  "retentionEnforcementAllowed",
  "expiryEnforcementAllowed",
  "envelopePersistenceAllowed",
  "artifactStorageAllowed",
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

const FORBIDDEN_COVERAGE_FIELDS = [
  "coverageJobId",
  "coverageQueueId",
  "coverageResolutionId",
  "coverageExportPath",
  "coverageDownloadUrl",
  "coveragePersistenceId",
  "reviewerAssignmentId",
  "reviewSignoffId",
  "evidenceResolutionId",
  "binderFilePath",
  "traceabilityPersistenceId",
  "archiveJobId",
  "purgeJobId",
  "deleteCommand",
  "artifactFilePath",
  "artifactBytes",
  "artifactContent",
  "runtimeEndpoint",
  "inferenceUrl",
  "approvalStatus",
  "activationStatus",
  "promotionStatus",
  "pricingDecision",
  "inventoryMutation",
  "accountingMutation",
  "ledgerMutation",
] as const;

const REQUIRED_SOURCE_TARGETS = [
  "source_export_evidence",
  "retention_policy_evidence",
  "metadata_envelope",
  "manifest_metadata",
  "central_safety_gate",
] as const;

const buildRow = (
  coverageKey: string,
  binderKey: string,
  dimension: TraceabilityCoverageDimension,
  status: TraceabilityCoverageStatus,
  expected: string | boolean | number,
  actual: string | boolean | number | null,
  issue: string | null,
  evidence: string,
): TraceabilityCoverageRow => ({ coverageKey, binderKey, dimension, status, expected, actual, issue, evidence });

const readFlag = (record: Record<string, unknown>, field: string): boolean | null => (
  typeof record[field] === "boolean" ? Boolean(record[field]) : null
);

const buildFalseFlagRow = (
  record: TraceabilityCoverageRecord,
  dimension: TraceabilityCoverageDimension,
  field: typeof REQUIRED_FALSE_COVERAGE_FIELDS[number],
  evidence: string,
): TraceabilityCoverageRow => {
  const actual = readFlag(record as unknown as Record<string, unknown>, field);
  const ready = actual === false;
  return buildRow(
    record.coverageKey,
    record.binderKey,
    dimension,
    ready ? "coverage_ready" : "blocked",
    false,
    actual,
    ready ? null : `${field} must remain false in the offline traceability coverage review pack.`,
    evidence,
  );
};

const buildSafetyGateCoverageRow = (record: TraceabilityCoverageRecord): TraceabilityCoverageRow => {
  const safetyGate = getShadowRuntimeSafetyGate();
  const covered = safetyGate.runtimeInvocationAllowed === false
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
    record.coverageKey,
    record.binderKey,
    "safety_gate_coverage",
    covered ? "coverage_ready" : "blocked",
    true,
    covered,
    covered ? null : "Central safety gate coverage is not complete because at least one runtime, inference, production integration, decision automation, or mutation flag is enabled.",
    "Coverage review links the traceability matrix to the central safety gate and requires every runtime, inference, production, decision automation, and business mutation flag to remain false.",
  );
};

export const buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageReviewPackContract = () => ({
  traceabilityCoverageReviewPackKey: TRACEABILITY_COVERAGE_REVIEW_PACK_KEY,
  traceabilityCoverageReviewPackVersion: "v1",
  phase: PHASE_LABEL,
  generatedAt: nowIso(),
  purpose: "Read-only offline traceability coverage review for binder section coverage against source export evidence, retention policy evidence, metadata envelope references, manifest metadata references, and the central safety gate without persistence, resolution, signoff, export, file output, artifact access, inference, approval, activation, promotion, or business mutation.",
  upstreamContracts: {
    reviewBinderTraceabilityMatrix: buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityMatrixContract().reviewBinderTraceabilityMatrixKey,
  },
  requiredCoverageSources: [...REQUIRED_SOURCE_TARGETS],
  proposedCoverageShape: {
    coverageMode: "offline_readonly_coverage_review_only",
    traceabilityCoveragePersistenceAllowed: false,
    coverageResolutionAllowed: false,
    fileOutputAllowed: false,
    reviewSignoffAllowed: false,
  },
  requiredFalseFields: [...REQUIRED_FALSE_COVERAGE_FIELDS],
  forbiddenCoverageFields: [...FORBIDDEN_COVERAGE_FIELDS],
  allowedBehavior: [
    "Build an in-memory coverage review from existing offline review binder traceability records.",
    "Calculate whether each binder has trace references to source export evidence, retention policy evidence, metadata envelope, manifest metadata, and the central safety gate.",
    "Expose coverage evidence for Admin and Manager review only.",
  ],
  forbiddenBehavior: [
    "Do not persist coverage rows, coverage results, traceability rows, binders, export jobs, metadata envelopes, or retention policies.",
    "Do not create coverage jobs, queues, file outputs, downloads, exports, or review assignments.",
    "Do not resolve coverage, record evidence resolution, or sign off review items.",
    "Do not enforce retention, expiry, archive, purge, or deletion behavior.",
    "Do not read artifact files or bytes, import artifacts, load model artifacts, run inference, approve, activate, promote, accept, or deploy candidates.",
    "Do not mutate pricing, reports, ledger, inventory, accounting, sales, repairs, partners, customers, or any business record.",
  ],
  safetyGate: getShadowRuntimeSafetyGate(),
});

export const buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageRecords = (): TraceabilityCoverageRecord[] => {
  const matrix = buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityMatrix();
  const binderKeys = Array.from(new Set(matrix.traceabilityRecords.map((record) => record.binderKey)));
  return binderKeys.map((binderKey) => {
    const records = matrix.traceabilityRecords.filter((record) => record.binderKey === binderKey);
    const rows = matrix.traceabilityRows.filter((row) => row.binderKey === binderKey);
    const targets = new Set(records.map((record) => record.traceTarget));
    const sourceExportCovered = targets.has("source_export_evidence");
    const retentionPolicyCovered = targets.has("retention_policy_evidence");
    const metadataEnvelopeCovered = targets.has("metadata_envelope");
    const manifestMetadataCovered = rows.some((row) => row.dimension === "manifest_metadata" && !row.issue);
    const safetyGateCovered = rows.some((row) => row.dimension === "safety_gate" && !row.issue);
    const forbiddenActionCoverageReviewed = records.some((record) => record.traceTarget === "forbidden_action_checklist") || rows.some((row) => row.dimension === "approval_controls" || row.dimension === "business_mutation");
    const coveredSourceCount = [sourceExportCovered, retentionPolicyCovered, metadataEnvelopeCovered, manifestMetadataCovered, safetyGateCovered].filter(Boolean).length;
    const requiredSourceCount = REQUIRED_SOURCE_TARGETS.length;
    const coveragePct = Math.round((coveredSourceCount / requiredSourceCount) * 100);
    const status: TraceabilityCoverageStatus = coveragePct === 100 ? "coverage_ready" : coveragePct >= 80 ? "review_required" : "blocked";

    return {
      coverageKey: `review_binder_traceability_coverage_${binderKey}`,
      coverageVersion: "v1" as const,
      binderKey,
      traceabilityRecordCount: records.length,
      traceabilityRowCount: rows.length,
      coveredSourceCount,
      requiredSourceCount,
      coveragePct,
      status,
      sourceExportCovered,
      retentionPolicyCovered,
      metadataEnvelopeCovered,
      manifestMetadataCovered,
      safetyGateCovered,
      forbiddenActionCoverageReviewed,
      traceabilityCoveragePersistenceAllowed: false as const,
      traceabilityCoverageJobAllowed: false as const,
      traceabilityCoverageQueueAllowed: false as const,
      coverageResolutionAllowed: false as const,
      reviewerAssignmentAllowed: false as const,
      reviewSignoffAllowed: false as const,
      evidenceResolutionAllowed: false as const,
      fileOutputAllowed: false as const,
      coverageExportAllowed: false as const,
      coverageDownloadAllowed: false as const,
      coveragePersistenceAllowed: false as const,
      traceabilityPersistenceAllowed: false as const,
      traceabilityResolutionAllowed: false as const,
      binderFileGenerationAllowed: false as const,
      binderPersistenceAllowed: false as const,
      exportExecutionAllowed: false as const,
      exportPersistenceAllowed: false as const,
      archiveActionAllowed: false as const,
      purgeAllowed: false as const,
      deleteAllowed: false as const,
      retentionPolicyPersistenceAllowed: false as const,
      retentionEnforcementAllowed: false as const,
      expiryEnforcementAllowed: false as const,
      envelopePersistenceAllowed: false as const,
      artifactStorageAllowed: false as const,
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
        "Coverage review is generated from offline review binder traceability matrix records only.",
        "Coverage calculations are in-memory only and do not persist coverage rows or resolve traceability evidence.",
        "No file output, export, signoff, archive, purge, deletion, artifact access, inference, approval, activation, promotion, or business mutation is enabled.",
      ],
    };
  });
};

export const buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageReviewPack = () => {
  const contract = buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageReviewPackContract();
  const matrix = buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityMatrix();
  const coverageRecords = buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageRecords();
  const coverageRows = coverageRecords.flatMap((record) => [
    buildRow(record.coverageKey, record.binderKey, "binder_section_coverage", record.traceabilityRecordCount > 0 ? "coverage_ready" : "review_required", "at least one traceability record", record.traceabilityRecordCount, record.traceabilityRecordCount > 0 ? null : "Binder must have traceability records before coverage can be reviewed.", "Coverage review counts traceability records per binder without creating persistence or workflow state."),
    buildRow(record.coverageKey, record.binderKey, "source_export_evidence_coverage", record.sourceExportCovered ? "coverage_ready" : "review_required", true, record.sourceExportCovered, record.sourceExportCovered ? null : "Binder coverage should include source export evidence.", "Coverage review checks source export evidence references by key only; no export execution or file output is enabled."),
    buildRow(record.coverageKey, record.binderKey, "retention_policy_evidence_coverage", record.retentionPolicyCovered ? "coverage_ready" : "review_required", true, record.retentionPolicyCovered, record.retentionPolicyCovered ? null : "Binder coverage should include retention policy evidence.", "Coverage review checks retention policy evidence references only; no retention enforcement, expiry enforcement, archive, purge, or deletion is enabled."),
    buildRow(record.coverageKey, record.binderKey, "metadata_envelope_coverage", record.metadataEnvelopeCovered ? "coverage_ready" : "review_required", true, record.metadataEnvelopeCovered, record.metadataEnvelopeCovered ? null : "Binder coverage should include metadata envelope evidence.", "Coverage review checks metadata envelope references by key only; no envelope persistence or artifact storage is enabled."),
    buildRow(record.coverageKey, record.binderKey, "manifest_metadata_coverage", record.manifestMetadataCovered ? "coverage_ready" : "review_required", true, record.manifestMetadataCovered, record.manifestMetadataCovered ? null : "Binder coverage should include manifest metadata evidence.", "Coverage review checks manifest metadata trace rows only; no artifact file reading, bytes access, import, or model loading is enabled."),
    buildRow(record.coverageKey, record.binderKey, "safety_gate_coverage", record.safetyGateCovered ? "coverage_ready" : "blocked", true, record.safetyGateCovered, record.safetyGateCovered ? null : "Binder coverage must include central safety gate evidence.", "Coverage review requires central safety gate trace evidence and no runtime, inference, production, or mutation flags enabled."),
    buildRow(record.coverageKey, record.binderKey, "forbidden_action_coverage", record.forbiddenActionCoverageReviewed ? "coverage_ready" : "review_required", true, record.forbiddenActionCoverageReviewed, record.forbiddenActionCoverageReviewed ? null : "Binder coverage should include forbidden action review evidence.", "Coverage review includes forbidden action coverage only as evidence and does not add controls."),
    buildRow(record.coverageKey, record.binderKey, "binder_section_coverage", record.status, 100, record.coveragePct, record.coveragePct === 100 ? null : "Traceability coverage is incomplete and requires manual review before any future workflow phase.", "Coverage percentage is calculated from required evidence source coverage only and is not a signoff or approval."),
    buildFalseFlagRow(record, "persistence", "traceabilityCoveragePersistenceAllowed", "Coverage persistence must remain disabled."),
    buildFalseFlagRow(record, "persistence", "traceabilityCoverageJobAllowed", "Coverage jobs must remain disabled."),
    buildFalseFlagRow(record, "persistence", "traceabilityCoverageQueueAllowed", "Coverage queues must remain disabled."),
    buildFalseFlagRow(record, "resolution_signoff", "coverageResolutionAllowed", "Coverage resolution must remain disabled."),
    buildFalseFlagRow(record, "resolution_signoff", "evidenceResolutionAllowed", "Evidence resolution must remain disabled."),
    buildFalseFlagRow(record, "resolution_signoff", "reviewSignoffAllowed", "Review signoff must remain disabled."),
    buildFalseFlagRow(record, "resolution_signoff", "reviewerAssignmentAllowed", "Reviewer assignment must remain disabled."),
    buildFalseFlagRow(record, "file_output", "fileOutputAllowed", "File output must remain disabled."),
    buildFalseFlagRow(record, "file_output", "coverageExportAllowed", "Coverage export must remain disabled."),
    buildFalseFlagRow(record, "file_output", "coverageDownloadAllowed", "Coverage downloads must remain disabled."),
    buildFalseFlagRow(record, "archive_purge_delete", "archiveActionAllowed", "Archive actions must remain disabled."),
    buildFalseFlagRow(record, "archive_purge_delete", "purgeAllowed", "Purge must remain disabled."),
    buildFalseFlagRow(record, "archive_purge_delete", "deleteAllowed", "Deletion must remain disabled."),
    buildFalseFlagRow(record, "artifact_access", "artifactFileReadAllowed", "Artifact file reading must remain disabled."),
    buildFalseFlagRow(record, "artifact_access", "artifactBytesReadAllowed", "Artifact byte access must remain disabled."),
    buildFalseFlagRow(record, "artifact_access", "artifactImportAllowed", "Artifact import must remain disabled."),
    buildFalseFlagRow(record, "artifact_access", "modelArtifactLoadAllowed", "Model artifact loading must remain disabled."),
    buildFalseFlagRow(record, "inference_controls", "modelExecutionAllowed", "Model execution must remain disabled."),
    buildFalseFlagRow(record, "inference_controls", "inferenceEndpointExposed", "Inference endpoint exposure must remain disabled."),
    buildFalseFlagRow(record, "inference_controls", "productionIntegrationAllowed", "Production integration must remain disabled."),
    buildFalseFlagRow(record, "inference_controls", "decisionAutomationAllowed", "Decision automation must remain disabled."),
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
    buildSafetyGateCoverageRow(record),
  ]);

  return {
    generatedAt: nowIso(),
    phase: PHASE_LABEL,
    traceabilityCoverageReviewPackKey: TRACEABILITY_COVERAGE_REVIEW_PACK_KEY,
    contract,
    upstreamTraceabilityMatrixSnapshot: {
      reviewBinderTraceabilityMatrixKey: matrix.reviewBinderTraceabilityMatrixKey,
      traceabilityRecordCount: matrix.traceabilityRecords.length,
      traceabilityRowCount: matrix.traceabilityRows.length,
      traceabilityIssueCount: matrix.traceabilityRows.filter((row) => row.issue).length,
    },
    coverageRecords,
    coverageRows,
  };
};

export const getShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageReviewPackSummary = () => {
  const pack = buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageReviewPack();
  const safetyGate = getShadowRuntimeSafetyGate();
  const issueCount = pack.coverageRows.filter((row) => row.issue).length;
  const blockedCount = pack.coverageRows.filter((row) => row.status === "blocked").length;
  const reviewRequiredCount = pack.coverageRows.filter((row) => row.status === "review_required").length;
  const readyCount = pack.coverageRows.filter((row) => row.status === "coverage_ready").length;
  const averageCoveragePct = pack.coverageRecords.length
    ? Math.round(pack.coverageRecords.reduce((sum, record) => sum + record.coveragePct, 0) / pack.coverageRecords.length)
    : 0;

  return {
    generatedAt: nowIso(),
    currentStatus: PHASE_LABEL,
    artifactEnvelopeReviewBinderTraceabilityCoverageReviewPackLabel: "Offline Traceability Coverage Review Pack",
    artifactEnvelopeReviewBinderTraceabilityCoverageReviewPackStatus: "Offline / Read-only / Coverage evidence only",
    coveragePersistence: "Not implemented",
    coverageResolution: "Blocked",
    fileOutput: "Blocked",
    reviewSignoff: "Blocked",
    evidenceResolution: "Blocked",
    archiveAction: "Blocked",
    purgeAction: "Prohibited",
    deletionAction: "Blocked",
    artifactFileAccess: "Blocked",
    modelExecution: "Off",
    productionInference: "Not exposed",
    businessMutation: "Blocked",
    latestSafetyStatus: safetyGate,
    currentShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageReviewPack: {
      status: "offline_traceability_coverage_review_only",
      readinessScorePct: blockedCount === 0 ? 100 : 80,
      coverageRecordCount: pack.coverageRecords.length,
      coverageRowCount: pack.coverageRows.length,
      coverageReadyRowCount: readyCount,
      coverageReviewRequiredRowCount: reviewRequiredCount,
      coverageBlockedRowCount: blockedCount,
      coverageIssueCount: issueCount,
      averageCoveragePct,
      sourceExportCoverageCount: pack.coverageRecords.filter((record) => record.sourceExportCovered).length,
      retentionPolicyCoverageCount: pack.coverageRecords.filter((record) => record.retentionPolicyCovered).length,
      metadataEnvelopeCoverageCount: pack.coverageRecords.filter((record) => record.metadataEnvelopeCovered).length,
      manifestMetadataCoverageCount: pack.coverageRecords.filter((record) => record.manifestMetadataCovered).length,
      safetyGateCoverageCount: pack.coverageRecords.filter((record) => record.safetyGateCovered).length,
      coveragePersistenceAllowed: false,
      traceabilityCoveragePersistenceAllowed: false,
      traceabilityCoverageJobAllowed: false,
      traceabilityCoverageQueueAllowed: false,
      coverageResolutionAllowed: false,
      fileOutputAllowed: false,
      coverageExportAllowed: false,
      coverageDownloadAllowed: false,
      reviewerAssignmentAllowed: false,
      reviewSignoffAllowed: false,
      evidenceResolutionAllowed: false,
      archiveActionAllowed: false,
      purgeAllowed: false,
      deleteAllowed: false,
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
      explanation: "Offline traceability coverage review calculates coverage between binder sections and source export evidence, retention policy evidence, metadata envelope references, manifest metadata references, and central safety gate evidence; it does not persist coverage, resolve evidence, sign off, generate files, export, archive, purge, delete, read artifacts, load models, run inference, approve, activate, promote, accept artifacts, or mutate business data.",
      warnings: [
        "Coverage review is evidence only and no coverage persistence, job, queue, resolution, reviewer assignment, signoff, export, download, or file output is implemented.",
        "Traceability, export, and retention evidence remain review-only; no export execution, archive, purge, deletion, expiry enforcement, or lifecycle worker is enabled.",
        "No artifact file reading, import, model execution, production inference endpoint, approval, activation, promotion, artifact acceptance, or business mutation is enabled.",
      ],
      blockers: [],
      recommendedNextAction: "Review coverage gaps before any future offline traceability review workflow is considered.",
    },
    contract: pack.contract,
    upstreamTraceabilityMatrixSnapshot: pack.upstreamTraceabilityMatrixSnapshot,
    coverageRecords: pack.coverageRecords,
    coverageRows: pack.coverageRows,
  };
};

export const getShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageReviewPackBinderDetail = (binderKey: string) => {
  const pack = buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageReviewPack();
  const coverageRecords = pack.coverageRecords.filter((item) => item.binderKey === binderKey);
  if (!coverageRecords.length) return null;

  return {
    generatedAt: nowIso(),
    phase: PHASE_LABEL,
    binderKey,
    coverageRecords,
    coverageRows: pack.coverageRows.filter((row) => row.binderKey === binderKey),
    contract: pack.contract,
    safetyGate: getShadowRuntimeSafetyGate(),
  };
};
