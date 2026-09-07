import {
  buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPack,
  buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPackContract,
} from "./shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPack.service";
import { getShadowRuntimeSafetyGate } from "./shadowRuntimeSafety";

const PHASE_LABEL = "Phase 5Q — Offline Review Notes Prioritization Matrix" as const;
const REVIEW_NOTES_PRIORITIZATION_MATRIX_KEY = "shadow_runtime_artifact_envelope_review_notes_prioritization_matrix_v1" as const;

const nowIso = () => new Date().toISOString();

type PrioritizationBand = "critical" | "high" | "medium" | "low";
type PrioritizationStatus = "prioritized" | "review_required" | "blocked";
type PrioritizationSafetyRelevance = "safety_blocker" | "governance_control" | "coverage_context";

type ReviewNotePrioritizationRow = {
  priorityKey: string;
  priorityVersion: "v1";
  noteKey: string;
  binderKey: string;
  coverageKey: string;
  sourceDimension: string;
  coverageSource: string;
  binderSection: string;
  noteSeverity: string;
  noteCategory: string;
  priorityScore: number;
  priorityRank: number;
  priorityBand: PrioritizationBand;
  status: PrioritizationStatus;
  safetyRelevance: PrioritizationSafetyRelevance;
  priorityRationale: string;
  humanReviewPrompt: string;
  sourceEvidence: string;
  prioritizationPersistenceAllowed: false;
  prioritizationJobAllowed: false;
  prioritizationQueueAllowed: false;
  prioritizationAssignmentAllowed: false;
  prioritizationResolutionAllowed: false;
  prioritizationSignoffAllowed: false;
  priorityExportAllowed: false;
  priorityDownloadAllowed: false;
  priorityFileOutputAllowed: false;
  coverageGapNotesPersistenceAllowed: false;
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

type ReviewNotesPrioritizationMatrix = {
  contract: ReturnType<typeof buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationMatrixContract>;
  priorityRows: ReviewNotePrioritizationRow[];
  upstreamCoverageGapReviewNotesSnapshot: ReturnType<typeof buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPack>;
};

const REQUIRED_FALSE_PRIORITY_FIELDS = [
  "prioritizationPersistenceAllowed",
  "prioritizationJobAllowed",
  "prioritizationQueueAllowed",
  "prioritizationAssignmentAllowed",
  "prioritizationResolutionAllowed",
  "prioritizationSignoffAllowed",
  "priorityExportAllowed",
  "priorityDownloadAllowed",
  "priorityFileOutputAllowed",
  "coverageGapNotesPersistenceAllowed",
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

const FORBIDDEN_PRIORITY_FIELDS = [
  "priorityPersistenceId",
  "priorityJobId",
  "priorityQueueId",
  "assignmentId",
  "resolutionId",
  "signoffId",
  "priorityExportPath",
  "priorityDownloadUrl",
  "notePersistenceId",
  "noteJobId",
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

const inferSafetyRelevance = (noteCategory: string, sourceDimension: string): PrioritizationSafetyRelevance => {
  const combined = `${noteCategory} ${sourceDimension}`;
  if (/safety|forbidden|inference|approval|business|mutation|artifact|archive|purge|delete/i.test(combined)) return "safety_blocker";
  if (/persistence|resolution|signoff|assignment|file|export|retention|metadata/i.test(combined)) return "governance_control";
  return "coverage_context";
};

const scoreNote = (note: Record<string, unknown>): number => {
  const severity = String(note.severity ?? "info");
  const status = String(note.status ?? "note_ready");
  const coveragePct = typeof note.coveragePct === "number" ? note.coveragePct : 100;
  const safetyRelevance = inferSafetyRelevance(String(note.category ?? "coverage_gap"), String(note.sourceDimension ?? "coverage_ready"));
  const severityScore = severity === "blocked" ? 70 : severity === "warning" ? 45 : 15;
  const statusScore = status === "blocked" ? 20 : status === "review_required" ? 12 : 0;
  const coverageGapScore = Math.max(0, Math.min(15, Math.round((100 - coveragePct) / 7)));
  const safetyScore = safetyRelevance === "safety_blocker" ? 15 : safetyRelevance === "governance_control" ? 8 : 3;
  return Math.min(100, severityScore + statusScore + coverageGapScore + safetyScore);
};

const bandForScore = (score: number): PrioritizationBand => {
  if (score >= 85) return "critical";
  if (score >= 65) return "high";
  if (score >= 40) return "medium";
  return "low";
};

const statusForBand = (band: PrioritizationBand): PrioritizationStatus => (
  band === "critical" ? "blocked" : band === "high" || band === "medium" ? "review_required" : "prioritized"
);

const buildSafePriorityRow = (args: {
  priorityKey: string;
  noteKey: string;
  binderKey: string;
  coverageKey: string;
  sourceDimension: string;
  coverageSource: string;
  binderSection: string;
  noteSeverity: string;
  noteCategory: string;
  priorityScore: number;
  priorityRank: number;
  priorityBand: PrioritizationBand;
  status: PrioritizationStatus;
  safetyRelevance: PrioritizationSafetyRelevance;
  priorityRationale: string;
  humanReviewPrompt: string;
  sourceEvidence: string;
}): ReviewNotePrioritizationRow => ({
  priorityKey: args.priorityKey,
  priorityVersion: "v1",
  noteKey: args.noteKey,
  binderKey: args.binderKey,
  coverageKey: args.coverageKey,
  sourceDimension: args.sourceDimension,
  coverageSource: args.coverageSource,
  binderSection: args.binderSection,
  noteSeverity: args.noteSeverity,
  noteCategory: args.noteCategory,
  priorityScore: args.priorityScore,
  priorityRank: args.priorityRank,
  priorityBand: args.priorityBand,
  status: args.status,
  safetyRelevance: args.safetyRelevance,
  priorityRationale: args.priorityRationale,
  humanReviewPrompt: args.humanReviewPrompt,
  sourceEvidence: args.sourceEvidence,
  prioritizationPersistenceAllowed: false,
  prioritizationJobAllowed: false,
  prioritizationQueueAllowed: false,
  prioritizationAssignmentAllowed: false,
  prioritizationResolutionAllowed: false,
  prioritizationSignoffAllowed: false,
  priorityExportAllowed: false,
  priorityDownloadAllowed: false,
  priorityFileOutputAllowed: false,
  coverageGapNotesPersistenceAllowed: false,
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
    "Review note prioritization is generated in memory from Phase 5P advisory notes only.",
    "Priority rows do not create assignments, persistence, workflow state, resolution, signoff, export files, downloads, or queues.",
    "No artifact access, inference, approval, activation, promotion, archive, purge, deletion, or business mutation is enabled.",
  ],
});

export const buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationMatrixContract = () => ({
  reviewNotesPrioritizationMatrixKey: REVIEW_NOTES_PRIORITIZATION_MATRIX_KEY,
  reviewNotesPrioritizationMatrixVersion: "v1",
  phase: PHASE_LABEL,
  generatedAt: nowIso(),
  purpose: "Read-only offline prioritization matrix for advisory review notes by severity, coverage source, binder section, and safety relevance without persistence, assignment, resolution, signoff, export, file output, artifact access, inference, approval, activation, promotion, or business mutation.",
  upstreamContracts: {
    coverageGapReviewNotesPack: buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPackContract().coverageGapReviewNotesPackKey,
  },
  proposedPriorityShape: {
    priorityMode: "offline_readonly_review_note_prioritization_only",
    prioritizationPersistenceAllowed: false,
    prioritizationAssignmentAllowed: false,
    prioritizationResolutionAllowed: false,
    prioritizationSignoffAllowed: false,
    priorityExportAllowed: false,
    priorityFileOutputAllowed: false,
  },
  requiredFalseFields: [...REQUIRED_FALSE_PRIORITY_FIELDS],
  forbiddenPriorityFields: [...FORBIDDEN_PRIORITY_FIELDS],
  allowedBehavior: [
    "Build an in-memory priority matrix from existing offline coverage gap review notes only.",
    "Rank advisory notes by severity, coverage source, binder section, and safety relevance for human review context.",
    "Expose prioritization evidence for Admin and Manager review only.",
  ],
  forbiddenBehavior: [
    "Do not persist priorities, notes, coverage rows, traceability rows, binders, export jobs, metadata envelopes, or retention policies.",
    "Do not create priority jobs, queues, reviewer assignments, review signoffs, evidence resolutions, exports, file outputs, downloads, or workflow state.",
    "Do not enforce retention, expiry, archive, purge, or deletion behavior.",
    "Do not read artifact files or bytes, import artifacts, load model artifacts, run inference, approve, activate, promote, accept, or deploy candidates.",
    "Do not mutate pricing, reports, ledger, inventory, accounting, sales, repairs, partners, customers, or any business record.",
  ],
  safetyGate: getShadowRuntimeSafetyGate(),
});

export const buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationRows = (): ReviewNotePrioritizationRow[] => {
  const notesPack = buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPack();
  return notesPack.reviewNotes
    .map((note, index) => {
      const score = scoreNote(note as Record<string, unknown>);
      const band = bandForScore(score);
      const safetyRelevance = inferSafetyRelevance(String(note.category), String(note.sourceDimension));
      return {
        note,
        score,
        band,
        safetyRelevance,
        originalIndex: index,
      };
    })
    .sort((a, b) => b.score - a.score || a.originalIndex - b.originalIndex)
    .map(({ note, score, band, safetyRelevance }, index) => buildSafePriorityRow({
      priorityKey: `review_note_priority_${note.noteKey}_${index + 1}`,
      noteKey: note.noteKey,
      binderKey: note.binderKey,
      coverageKey: note.coverageKey,
      sourceDimension: note.sourceDimension,
      coverageSource: note.sourceDimension,
      binderSection: note.binderKey,
      noteSeverity: note.severity,
      noteCategory: note.category,
      priorityScore: score,
      priorityRank: index + 1,
      priorityBand: band,
      status: statusForBand(band),
      safetyRelevance,
      priorityRationale: `Priority ${index + 1} is based on severity ${note.severity}, source ${note.sourceDimension}, binder section ${note.binderKey}, coverage ${note.coveragePct}%, and safety relevance ${safetyRelevance}.`,
      humanReviewPrompt: "Review this priority row as advisory context only. It does not assign work, resolve evidence, sign off, export files, persist notes, run inference, approve, activate, promote, or mutate business records.",
      sourceEvidence: note.sourceEvidence,
    }));
};

export const buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationMatrix = (): ReviewNotesPrioritizationMatrix => ({
  contract: buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationMatrixContract(),
  priorityRows: buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationRows(),
  upstreamCoverageGapReviewNotesSnapshot: buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPack(),
});

export const getShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationMatrixSummary = () => {
  const priorityRows = buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationRows();
  const blockers = priorityRows.filter((row) => row.status === "blocked").map((row) => row.priorityRationale);
  const warnings = priorityRows.filter((row) => row.status === "review_required").map((row) => row.priorityRationale);
  const criticalCount = priorityRows.filter((row) => row.priorityBand === "critical").length;
  const highPriorityCount = priorityRows.filter((row) => row.priorityBand === "high").length;
  const mediumPriorityCount = priorityRows.filter((row) => row.priorityBand === "medium").length;
  const lowPriorityCount = priorityRows.filter((row) => row.priorityBand === "low").length;
  const averagePriorityScore = priorityRows.length === 0
    ? 0
    : Math.round(priorityRows.reduce((total, row) => total + row.priorityScore, 0) / priorityRows.length);
  const readinessScorePct = priorityRows.length === 0
    ? 100
    : Math.round((priorityRows.filter((row) => row.status !== "blocked").length / priorityRows.length) * 100);

  return {
    generatedAt: nowIso(),
    currentStatus: PHASE_LABEL,
    artifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationMatrixLabel: "Review Notes Prioritization Matrix",
    artifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationMatrixStatus: "Offline prioritization only / persistence disabled",
    prioritizationPersistence: "Disabled",
    prioritizationAssignment: "Disabled",
    prioritizationResolution: "Disabled",
    prioritizationSignoff: "Disabled",
    priorityExport: "Disabled",
    fileOutput: "Disabled",
    artifactAccess: "Blocked",
    modelExecution: "Off",
    productionInference: "Not exposed",
    businessMutation: "Blocked",
    currentShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationMatrix: {
      status: "offline_review_notes_prioritization_only",
      readinessScorePct,
      priorityRowCount: priorityRows.length,
      criticalCount,
      highPriorityCount,
      mediumPriorityCount,
      lowPriorityCount,
      warningCount: warnings.length,
      blockerCount: blockers.length,
      averagePriorityScore,
      highestPriority: priorityRows[0] ?? null,
      prioritizationPersistenceAllowed: false,
      prioritizationAssignmentAllowed: false,
      prioritizationResolutionAllowed: false,
      prioritizationSignoffAllowed: false,
      priorityExportAllowed: false,
      priorityDownloadAllowed: false,
      priorityFileOutputAllowed: false,
      coverageGapNotesPersistenceAllowed: false,
      coverageGapNotesAssignmentAllowed: false,
      coverageGapNotesResolutionAllowed: false,
      coverageGapNotesSignoffAllowed: false,
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
      explanation: "Review note prioritization matrix ranks advisory Phase 5P notes in memory only and does not create persistence, assignments, resolution, signoff, export, file output, artifact access, inference, approval, activation, promotion, or business mutation.",
    },
  };
};

export const getShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationMatrixNoteDetail = (noteKey: string) => {
  const matrix = buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationMatrix();
  const row = matrix.priorityRows.find((item) => item.noteKey === noteKey || item.priorityKey === noteKey);
  if (!row) return null;
  return {
    ...row,
    upstreamCoverageGapReviewNotesSnapshot: matrix.upstreamCoverageGapReviewNotesSnapshot,
    contract: matrix.contract,
  };
};
