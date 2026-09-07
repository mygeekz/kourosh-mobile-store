import {
  buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageReviewPack,
  buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageReviewPackContract,
} from "./shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageReviewPack.service";
import { getShadowRuntimeSafetyGate } from "./shadowRuntimeSafety";

const PHASE_LABEL = "Phase 5P — Offline Coverage Gap Review Notes Pack" as const;
const COVERAGE_GAP_REVIEW_NOTES_PACK_KEY = "shadow_runtime_artifact_envelope_review_binder_traceability_coverage_gap_review_notes_pack_v1" as const;

const nowIso = () => new Date().toISOString();

type CoverageGapReviewNoteStatus = "note_ready" | "review_required" | "blocked";
type CoverageGapReviewNoteSeverity = "info" | "warning" | "blocked";
type CoverageGapReviewNoteCategory =
  | "coverage_gap"
  | "binder_section"
  | "source_export_evidence"
  | "retention_policy_evidence"
  | "metadata_envelope"
  | "manifest_metadata"
  | "safety_gate"
  | "forbidden_action"
  | "persistence"
  | "resolution_signoff"
  | "file_output"
  | "archive_purge_delete"
  | "artifact_access"
  | "inference_controls"
  | "approval_controls"
  | "business_mutation";

type CoverageGapReviewNote = {
  noteKey: string;
  noteVersion: "v1";
  binderKey: string;
  coverageKey: string;
  coveragePct: number;
  category: CoverageGapReviewNoteCategory;
  severity: CoverageGapReviewNoteSeverity;
  status: CoverageGapReviewNoteStatus;
  sourceDimension: string;
  noteTitle: string;
  noteBody: string;
  recommendedHumanReview: string;
  sourceEvidence: string;
  coverageGapNotesPersistenceAllowed: false;
  coverageGapNotesJobAllowed: false;
  coverageGapNotesQueueAllowed: false;
  coverageGapNotesAssignmentAllowed: false;
  coverageGapNotesResolutionAllowed: false;
  coverageGapNotesSignoffAllowed: false;
  notesExportAllowed: false;
  notesDownloadAllowed: false;
  fileOutputAllowed: false;
  coveragePersistenceAllowed: false;
  coverageResolutionAllowed: false;
  reviewerAssignmentAllowed: false;
  reviewSignoffAllowed: false;
  evidenceResolutionAllowed: false;
  traceabilityPersistenceAllowed: false;
  traceabilityResolutionAllowed: false;
  binderPersistenceAllowed: false;
  binderFileGenerationAllowed: false;
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

type CoverageGapReviewNotesPack = {
  contract: ReturnType<typeof buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPackContract>;
  reviewNotes: CoverageGapReviewNote[];
  upstreamCoverageReviewSnapshot: ReturnType<typeof buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageReviewPack>;
};

const REQUIRED_FALSE_NOTE_FIELDS = [
  "coverageGapNotesPersistenceAllowed",
  "coverageGapNotesJobAllowed",
  "coverageGapNotesQueueAllowed",
  "coverageGapNotesAssignmentAllowed",
  "coverageGapNotesResolutionAllowed",
  "coverageGapNotesSignoffAllowed",
  "notesExportAllowed",
  "notesDownloadAllowed",
  "fileOutputAllowed",
  "coveragePersistenceAllowed",
  "coverageResolutionAllowed",
  "reviewerAssignmentAllowed",
  "reviewSignoffAllowed",
  "evidenceResolutionAllowed",
  "traceabilityPersistenceAllowed",
  "traceabilityResolutionAllowed",
  "binderPersistenceAllowed",
  "binderFileGenerationAllowed",
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

const FORBIDDEN_NOTE_FIELDS = [
  "notePersistenceId",
  "noteJobId",
  "noteQueueId",
  "assignmentId",
  "resolutionId",
  "signoffId",
  "notesExportPath",
  "notesDownloadUrl",
  "coveragePersistenceId",
  "coverageResolutionId",
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

const mapDimensionToCategory = (dimension: string): CoverageGapReviewNoteCategory => {
  if (dimension.includes("source_export")) return "source_export_evidence";
  if (dimension.includes("retention_policy")) return "retention_policy_evidence";
  if (dimension.includes("metadata_envelope")) return "metadata_envelope";
  if (dimension.includes("manifest_metadata")) return "manifest_metadata";
  if (dimension.includes("safety_gate")) return "safety_gate";
  if (dimension.includes("forbidden")) return "forbidden_action";
  if (dimension.includes("persistence")) return "persistence";
  if (dimension.includes("resolution") || dimension.includes("signoff")) return "resolution_signoff";
  if (dimension.includes("file")) return "file_output";
  if (dimension.includes("archive") || dimension.includes("purge") || dimension.includes("delete")) return "archive_purge_delete";
  if (dimension.includes("artifact")) return "artifact_access";
  if (dimension.includes("inference")) return "inference_controls";
  if (dimension.includes("approval")) return "approval_controls";
  if (dimension.includes("business") || dimension.includes("mutation")) return "business_mutation";
  if (dimension.includes("binder_section")) return "binder_section";
  return "coverage_gap";
};

const severityForStatus = (status: string): CoverageGapReviewNoteSeverity => (
  status === "blocked" ? "blocked" : status === "review_required" ? "warning" : "info"
);

const buildSafeNoteShell = (args: {
  noteKey: string;
  binderKey: string;
  coverageKey: string;
  coveragePct: number;
  category: CoverageGapReviewNoteCategory;
  severity: CoverageGapReviewNoteSeverity;
  status: CoverageGapReviewNoteStatus;
  sourceDimension: string;
  noteTitle: string;
  noteBody: string;
  recommendedHumanReview: string;
  sourceEvidence: string;
}): CoverageGapReviewNote => ({
  noteKey: args.noteKey,
  noteVersion: "v1",
  binderKey: args.binderKey,
  coverageKey: args.coverageKey,
  coveragePct: args.coveragePct,
  category: args.category,
  severity: args.severity,
  status: args.status,
  sourceDimension: args.sourceDimension,
  noteTitle: args.noteTitle,
  noteBody: args.noteBody,
  recommendedHumanReview: args.recommendedHumanReview,
  sourceEvidence: args.sourceEvidence,
  coverageGapNotesPersistenceAllowed: false,
  coverageGapNotesJobAllowed: false,
  coverageGapNotesQueueAllowed: false,
  coverageGapNotesAssignmentAllowed: false,
  coverageGapNotesResolutionAllowed: false,
  coverageGapNotesSignoffAllowed: false,
  notesExportAllowed: false,
  notesDownloadAllowed: false,
  fileOutputAllowed: false,
  coveragePersistenceAllowed: false,
  coverageResolutionAllowed: false,
  reviewerAssignmentAllowed: false,
  reviewSignoffAllowed: false,
  evidenceResolutionAllowed: false,
  traceabilityPersistenceAllowed: false,
  traceabilityResolutionAllowed: false,
  binderPersistenceAllowed: false,
  binderFileGenerationAllowed: false,
  exportExecutionAllowed: false,
  exportPersistenceAllowed: false,
  archiveActionAllowed: false,
  purgeAllowed: false,
  deleteAllowed: false,
  retentionPolicyPersistenceAllowed: false,
  retentionEnforcementAllowed: false,
  expiryEnforcementAllowed: false,
  envelopePersistenceAllowed: false,
  artifactStorageAllowed: false,
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
    "Coverage gap review notes are generated in memory from coverage review evidence only.",
    "Notes are advisory review text and do not create assignments, workflow state, resolution records, signoff, export files, or persistence.",
    "No artifact access, inference, approval, activation, promotion, archive, purge, deletion, or business mutation is enabled.",
  ],
});

export const buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPackContract = () => ({
  coverageGapReviewNotesPackKey: COVERAGE_GAP_REVIEW_NOTES_PACK_KEY,
  coverageGapReviewNotesPackVersion: "v1",
  phase: PHASE_LABEL,
  generatedAt: nowIso(),
  purpose: "Read-only offline coverage gap review notes for human review of traceability coverage gaps without persistence, assignment, signoff, resolution, export, file output, artifact access, inference, approval, activation, promotion, or business mutation.",
  upstreamContracts: {
    traceabilityCoverageReviewPack: buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageReviewPackContract().traceabilityCoverageReviewPackKey,
  },
  proposedNoteShape: {
    noteMode: "offline_readonly_gap_review_notes_only",
    coverageGapNotesPersistenceAllowed: false,
    coverageGapNotesAssignmentAllowed: false,
    coverageGapNotesResolutionAllowed: false,
    coverageGapNotesSignoffAllowed: false,
    fileOutputAllowed: false,
  },
  requiredFalseFields: [...REQUIRED_FALSE_NOTE_FIELDS],
  forbiddenNoteFields: [...FORBIDDEN_NOTE_FIELDS],
  allowedBehavior: [
    "Build in-memory review notes from existing offline traceability coverage rows only.",
    "Convert coverage gaps and blocked coverage dimensions into advisory human review notes.",
    "Expose review note evidence for Admin and Manager review only.",
  ],
  forbiddenBehavior: [
    "Do not persist review notes, coverage rows, traceability rows, binders, export jobs, metadata envelopes, or retention policies.",
    "Do not create note jobs, queues, reviewer assignments, review signoffs, evidence resolutions, exports, file outputs, downloads, or workflow state.",
    "Do not enforce retention, expiry, archive, purge, or deletion behavior.",
    "Do not read artifact files or bytes, import artifacts, load model artifacts, run inference, approve, activate, promote, accept, or deploy candidates.",
    "Do not mutate pricing, reports, ledger, inventory, accounting, sales, repairs, partners, customers, or any business record.",
  ],
  safetyGate: getShadowRuntimeSafetyGate(),
});

export const buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotes = (): CoverageGapReviewNote[] => {
  const coverage = buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageReviewPack();
  const gapRows = coverage.coverageRows.filter((row) => row.issue || row.status === "review_required" || row.status === "blocked");
  const notes = gapRows.map((row, index) => {
    const record = coverage.coverageRecords.find((item) => item.coverageKey === row.coverageKey);
    const category = mapDimensionToCategory(row.dimension);
    const status = row.status === "blocked" ? "blocked" : "review_required";
    return buildSafeNoteShell({
      noteKey: `coverage_gap_review_note_${row.coverageKey}_${index + 1}`,
      binderKey: row.binderKey,
      coverageKey: row.coverageKey,
      coveragePct: record?.coveragePct ?? 0,
      category,
      severity: severityForStatus(row.status),
      status,
      sourceDimension: row.dimension,
      noteTitle: `Review ${row.dimension} for ${row.binderKey}`,
      noteBody: row.issue || `Human review should confirm ${row.dimension} coverage before any future governance workflow is considered.`,
      recommendedHumanReview: "Review the referenced coverage gap manually in the Smart Insight governance area. This note is advisory only and does not create assignment, resolution, signoff, export, or persistence state.",
      sourceEvidence: row.evidence,
    });
  });

  if (notes.length > 0) return notes;

  return coverage.coverageRecords.map((record, index) => buildSafeNoteShell({
    noteKey: `coverage_gap_review_note_${record.coverageKey}_${index + 1}`,
    binderKey: record.binderKey,
    coverageKey: record.coverageKey,
    coveragePct: record.coveragePct,
    category: "coverage_gap",
    severity: "info",
    status: "note_ready",
    sourceDimension: "coverage_ready",
    noteTitle: `Coverage ready for ${record.binderKey}`,
    noteBody: "No coverage gap is currently detected for this binder based on offline coverage review evidence.",
    recommendedHumanReview: "Keep this note as read-only review context; no assignment, resolution, signoff, export, file output, persistence, or workflow action is created.",
    sourceEvidence: "Coverage review indicates required source references are present while all runtime, inference, approval, artifact access, file output, and business mutation controls remain disabled.",
  }));
};

export const buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPack = (): CoverageGapReviewNotesPack => ({
  contract: buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPackContract(),
  reviewNotes: buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotes(),
  upstreamCoverageReviewSnapshot: buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageReviewPack(),
});

export const getShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPackSummary = () => {
  const reviewNotes = buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotes();
  const coverage = buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageReviewPack();
  const blockers = reviewNotes.filter((note) => note.status === "blocked").map((note) => note.noteBody);
  const warnings = reviewNotes.filter((note) => note.status === "review_required").map((note) => note.noteBody);
  const readinessScorePct = reviewNotes.length === 0
    ? 100
    : Math.round((reviewNotes.filter((note) => note.status !== "blocked").length / reviewNotes.length) * 100);
  return {
    generatedAt: nowIso(),
    currentStatus: PHASE_LABEL,
    artifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPackLabel: "Coverage Gap Review Notes Pack",
    artifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPackStatus: "Offline review notes only / persistence disabled",
    notesPersistence: "Disabled",
    notesAssignment: "Disabled",
    notesResolution: "Disabled",
    notesSignoff: "Disabled",
    notesExport: "Disabled",
    fileOutput: "Disabled",
    artifactAccess: "Blocked",
    modelExecution: "Off",
    productionInference: "Not exposed",
    businessMutation: "Blocked",
    currentShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPack: {
      status: "offline_gap_review_notes_only",
      readinessScorePct,
      reviewNoteCount: reviewNotes.length,
      blockerCount: blockers.length,
      warningCount: warnings.length,
      upstreamCoverageRecordCount: coverage.coverageRecords.length,
      upstreamCoverageIssueCount: coverage.coverageRows.filter((row) => row.issue).length,
      coverageGapNotesPersistenceAllowed: false,
      coverageGapNotesAssignmentAllowed: false,
      coverageGapNotesResolutionAllowed: false,
      coverageGapNotesSignoffAllowed: false,
      notesExportAllowed: false,
      notesDownloadAllowed: false,
      fileOutputAllowed: false,
      artifactFileReadAllowed: false,
      artifactImportAllowed: false,
      modelExecutionAllowed: false,
      inferenceEndpointExposed: false,
      approvalAllowed: false,
      activationAllowed: false,
      promotionAllowed: false,
      businessMutationAllowed: false,
      blockers,
      warnings,
      explanation: "Coverage gap review notes are generated from offline coverage evidence only and do not create persistence, assignment, resolution, signoff, export, file output, artifact access, inference, approval, activation, promotion, or business mutation.",
    },
  };
};

export const getShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPackBinderDetail = (binderKey: string) => {
  const pack = buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPack();
  const reviewNotes = pack.reviewNotes.filter((note) => note.binderKey === binderKey);
  if (reviewNotes.length === 0) return null;
  return {
    binderKey,
    reviewNotes,
    total: reviewNotes.length,
    contract: pack.contract,
    upstreamCoverageRows: pack.upstreamCoverageReviewSnapshot.coverageRows.filter((row) => row.binderKey === binderKey),
    upstreamCoverageRecords: pack.upstreamCoverageReviewSnapshot.coverageRecords.filter((record) => record.binderKey === binderKey),
  };
};
