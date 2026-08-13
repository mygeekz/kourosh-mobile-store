import {
  buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceReviewNotesPack,
  buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceReviewNotesPackContract,
} from "./shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceReviewNotesPack.service";
import { getShadowRuntimeSafetyGate } from "./shadowRuntimeSafety";

const PHASE_LABEL = "Phase 5U — Offline Routing Balance Notes Triage Matrix" as const;
const ROUTING_BALANCE_NOTES_TRIAGE_MATRIX_KEY = "shadow_runtime_artifact_envelope_review_routing_balance_notes_triage_matrix_v1" as const;

const nowIso = () => new Date().toISOString();

type ReviewRouteKey = "security-review" | "metadata-review" | "coverage-review" | "governance-review";
type TriageBand = "critical" | "high" | "medium" | "low";
type SafetyRelevance = "safety_blocker" | "governance_control" | "coverage_balance_context";
type TriageStatus = "triaged" | "review_required" | "blocked";

type RoutingBalanceNoteTriageRow = {
  triageKey: string;
  triageVersion: "v1";
  sourceNoteKey: string;
  routeKey: ReviewRouteKey;
  routeLabel: string;
  sourceBalanceKey: string;
  sourceCoverageBalanceStatus: string;
  noteSeverity: string;
  routeSharePct: number;
  expectedMinSharePct: number;
  expectedMaxSharePct: number;
  shareDeviationPct: number;
  safetyRelevance: SafetyRelevance;
  triageScore: number;
  triageRank: number;
  triageBand: TriageBand;
  triageStatus: TriageStatus;
  triageRationale: string;
  humanReviewPrompt: string;
  suggestedReviewFocus: string[];
  triagePersistenceAllowed: false;
  triageJobAllowed: false;
  triageQueueAllowed: false;
  triageAssignmentAllowed: false;
  triageResolutionAllowed: false;
  triageSignoffAllowed: false;
  triageExportAllowed: false;
  triageDownloadAllowed: false;
  triageFileOutputAllowed: false;
  notePersistenceAllowed: false;
  noteAssignmentAllowed: false;
  noteResolutionAllowed: false;
  noteSignoffAllowed: false;
  noteExportAllowed: false;
  noteFileOutputAllowed: false;
  balancePersistenceAllowed: false;
  balanceResolutionAllowed: false;
  balanceSignoffAllowed: false;
  balanceExportAllowed: false;
  balanceFileOutputAllowed: false;
  reviewRoutingPersistenceAllowed: false;
  reviewRoutingAssignmentAllowed: false;
  reviewRoutingResolutionAllowed: false;
  reviewRoutingSignoffAllowed: false;
  prioritizationPersistenceAllowed: false;
  prioritizationAssignmentAllowed: false;
  prioritizationResolutionAllowed: false;
  prioritizationSignoffAllowed: false;
  coverageGapNotesPersistenceAllowed: false;
  coverageGapNotesAssignmentAllowed: false;
  coverageGapNotesResolutionAllowed: false;
  coverageGapNotesSignoffAllowed: false;
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

type RoutingBalanceNotesTriageMatrix = {
  contract: ReturnType<typeof buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceNotesTriageMatrixContract>;
  triageRows: RoutingBalanceNoteTriageRow[];
  upstreamRoutingBalanceReviewNotesSnapshot: ReturnType<typeof buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceReviewNotesPack>;
};

const REQUIRED_FALSE_TRIAGE_FIELDS = [
  "triagePersistenceAllowed",
  "triageJobAllowed",
  "triageQueueAllowed",
  "triageAssignmentAllowed",
  "triageResolutionAllowed",
  "triageSignoffAllowed",
  "triageExportAllowed",
  "triageDownloadAllowed",
  "triageFileOutputAllowed",
  "notePersistenceAllowed",
  "noteAssignmentAllowed",
  "noteResolutionAllowed",
  "noteSignoffAllowed",
  "noteExportAllowed",
  "noteFileOutputAllowed",
  "balancePersistenceAllowed",
  "balanceResolutionAllowed",
  "balanceSignoffAllowed",
  "balanceExportAllowed",
  "balanceFileOutputAllowed",
  "reviewRoutingPersistenceAllowed",
  "reviewRoutingAssignmentAllowed",
  "reviewRoutingResolutionAllowed",
  "reviewRoutingSignoffAllowed",
  "prioritizationPersistenceAllowed",
  "prioritizationAssignmentAllowed",
  "prioritizationResolutionAllowed",
  "prioritizationSignoffAllowed",
  "coverageGapNotesPersistenceAllowed",
  "coverageGapNotesAssignmentAllowed",
  "coverageGapNotesResolutionAllowed",
  "coverageGapNotesSignoffAllowed",
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

const FORBIDDEN_TRIAGE_FIELDS = [
  "triagePersistenceId",
  "triageJobId",
  "triageQueueId",
  "triageAssignmentId",
  "triageResolutionId",
  "triageSignoffId",
  "triageExportPath",
  "triageDownloadUrl",
  "notePersistenceId",
  "noteJobId",
  "noteAssignmentId",
  "reviewerUserId",
  "balancePersistenceId",
  "routingPersistenceId",
  "priorityPersistenceId",
  "coveragePersistenceId",
  "traceabilityPersistenceId",
  "binderFilePath",
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

const shareDeviation = (sharePct: number, minPct: number, maxPct: number): number => {
  if (sharePct < minPct) return Number((minPct - sharePct).toFixed(2));
  if (sharePct > maxPct) return Number((sharePct - maxPct).toFixed(2));
  return 0;
};

const safetyRelevanceForRoute = (routeKey: ReviewRouteKey): SafetyRelevance => {
  if (routeKey === "security-review") return "safety_blocker";
  if (routeKey === "governance-review" || routeKey === "metadata-review") return "governance_control";
  return "coverage_balance_context";
};

const triageScoreForNote = (note: Record<string, unknown>): number => {
  const severity = String(note.balanceNoteSeverity ?? "info");
  const routeKey = String(note.routeKey ?? "coverage-review") as ReviewRouteKey;
  const sharePct = Number(note.routeSharePct ?? 0);
  const minPct = Number(note.expectedMinSharePct ?? 0);
  const maxPct = Number(note.expectedMaxSharePct ?? 0);
  const deviation = shareDeviation(sharePct, minPct, maxPct);
  const severityScore = severity === "attention" ? 45 : severity === "warning" ? 30 : 10;
  const routeScore = routeKey === "security-review" ? 20 : routeKey === "governance-review" ? 15 : routeKey === "metadata-review" ? 10 : 6;
  const deviationScore = Math.min(25, Math.round(deviation * 2));
  const statusScore = /underrepresented/i.test(String(note.sourceCoverageBalanceStatus ?? "")) ? 10 : /watch/i.test(String(note.sourceCoverageBalanceStatus ?? "")) ? 6 : 0;
  return Math.min(100, severityScore + routeScore + deviationScore + statusScore);
};

const triageBandForScore = (score: number): TriageBand => {
  if (score >= 85) return "critical";
  if (score >= 65) return "high";
  if (score >= 40) return "medium";
  return "low";
};

const triageStatusForBand = (band: TriageBand): TriageStatus => (
  band === "critical" ? "blocked" : band === "high" || band === "medium" ? "review_required" : "triaged"
);

const buildSafeTriageRow = (note: Record<string, unknown>, rank: number): RoutingBalanceNoteTriageRow => {
  const routeKey = String(note.routeKey ?? "coverage-review") as ReviewRouteKey;
  const routeLabel = String(note.routeLabel ?? routeKey);
  const routeSharePct = Number(note.routeSharePct ?? 0);
  const expectedMinSharePct = Number(note.expectedMinSharePct ?? 0);
  const expectedMaxSharePct = Number(note.expectedMaxSharePct ?? 0);
  const deviation = shareDeviation(routeSharePct, expectedMinSharePct, expectedMaxSharePct);
  const triageScore = triageScoreForNote(note);
  const triageBand = triageBandForScore(triageScore);
  const triageStatus = triageStatusForBand(triageBand);
  const safetyRelevance = safetyRelevanceForRoute(routeKey);
  const sourceNoteKey = String(note.noteKey ?? `routing_balance_review_note_${routeKey}_v1`);
  const sourceBalanceKey = String(note.sourceBalanceKey ?? `routing_balance_${routeKey}_v1`);
  const sourceCoverageBalanceStatus = String(note.sourceCoverageBalanceStatus ?? "balanced");
  const noteSeverity = String(note.balanceNoteSeverity ?? "info");

  return {
    triageKey: `routing_balance_note_triage_${routeKey}_v1`,
    triageVersion: "v1",
    sourceNoteKey,
    routeKey,
    routeLabel,
    sourceBalanceKey,
    sourceCoverageBalanceStatus,
    noteSeverity,
    routeSharePct,
    expectedMinSharePct,
    expectedMaxSharePct,
    shareDeviationPct: deviation,
    safetyRelevance,
    triageScore,
    triageRank: rank,
    triageBand,
    triageStatus,
    triageRationale: `${routeLabel} is triaged with ${triageScore} score from severity ${noteSeverity}, ${deviation}% share deviation, route key ${routeKey}, and safety relevance ${safetyRelevance}.`,
    humanReviewPrompt: `Review ${routeLabel} balance note for severity, route key, share deviation, and safety relevance. This is advisory triage evidence only and does not persist, assign, resolve, sign off, export, output files, run inference, approve, activate, promote, or mutate business records.`,
    suggestedReviewFocus: [
      `${routeKey} balance-note triage`,
      `${noteSeverity} severity review`,
      `${deviation}% share deviation review`,
      `${safetyRelevance} safety relevance review`,
    ],
    triagePersistenceAllowed: false,
    triageJobAllowed: false,
    triageQueueAllowed: false,
    triageAssignmentAllowed: false,
    triageResolutionAllowed: false,
    triageSignoffAllowed: false,
    triageExportAllowed: false,
    triageDownloadAllowed: false,
    triageFileOutputAllowed: false,
    notePersistenceAllowed: false,
    noteAssignmentAllowed: false,
    noteResolutionAllowed: false,
    noteSignoffAllowed: false,
    noteExportAllowed: false,
    noteFileOutputAllowed: false,
    balancePersistenceAllowed: false,
    balanceResolutionAllowed: false,
    balanceSignoffAllowed: false,
    balanceExportAllowed: false,
    balanceFileOutputAllowed: false,
    reviewRoutingPersistenceAllowed: false,
    reviewRoutingAssignmentAllowed: false,
    reviewRoutingResolutionAllowed: false,
    reviewRoutingSignoffAllowed: false,
    prioritizationPersistenceAllowed: false,
    prioritizationAssignmentAllowed: false,
    prioritizationResolutionAllowed: false,
    prioritizationSignoffAllowed: false,
    coverageGapNotesPersistenceAllowed: false,
    coverageGapNotesAssignmentAllowed: false,
    coverageGapNotesResolutionAllowed: false,
    coverageGapNotesSignoffAllowed: false,
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
      "Routing balance note triage rows are generated in memory from Phase 5T review notes only.",
      "Triage matrix sorts balance notes by severity, route key, share deviation, and safety relevance only.",
      "No persistence, assignment, resolution, signoff, export, file output, artifact access, inference, approval, activation, promotion, or business mutation is enabled.",
    ],
  };
};

export const buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceNotesTriageMatrixContract = () => ({
  routingBalanceNotesTriageMatrixKey: ROUTING_BALANCE_NOTES_TRIAGE_MATRIX_KEY,
  routingBalanceNotesTriageMatrixVersion: "v1",
  phase: PHASE_LABEL,
  generatedAt: nowIso(),
  purpose: "Read-only offline routing balance notes triage matrix. It sorts Phase 5T routing balance review notes by severity, route key, share deviation, and safety relevance only, without persistence, assignment, resolution, signoff, export, file output, artifact access, inference, approval, activation, promotion, or business mutation.",
  upstreamContracts: {
    routingBalanceReviewNotesPack: buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceReviewNotesPackContract().routingBalanceReviewNotesPackKey,
  },
  proposedTriageShape: {
    triageMode: "offline_readonly_routing_balance_notes_triage_only",
    triagePersistenceAllowed: false,
    triageAssignmentAllowed: false,
    triageResolutionAllowed: false,
    triageSignoffAllowed: false,
    triageExportAllowed: false,
    triageFileOutputAllowed: false,
  },
  triageDimensions: ["severity", "route key", "share deviation", "safety relevance"],
  requiredFalseFields: [...REQUIRED_FALSE_TRIAGE_FIELDS],
  forbiddenTriageFields: [...FORBIDDEN_TRIAGE_FIELDS],
  allowedBehavior: [
    "Build in-memory triage rows from existing offline routing balance review notes only.",
    "Sort advisory notes by severity, route key, share deviation, and safety relevance.",
    "Expose triage summary and detail for Admin and Manager review only.",
  ],
  forbiddenBehavior: [
    "Do not persist triage rows, notes, assignments, routes, priorities, coverage rows, traceability rows, binders, export jobs, metadata envelopes, or retention policies.",
    "Do not assign reviewers, create jobs, queues, workflow state, resolutions, signoffs, exports, file outputs, or downloads.",
    "Do not enforce retention, expiry, archive, purge, or deletion behavior.",
    "Do not read artifact files or bytes, import artifacts, load model artifacts, run inference, approve, activate, promote, accept, or deploy candidates.",
    "Do not mutate pricing, reports, ledger, inventory, accounting, sales, repairs, partners, customers, or any business record.",
  ],
  safetyGate: getShadowRuntimeSafetyGate(),
});

export const buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceNotesTriageRows = (): RoutingBalanceNoteTriageRow[] => {
  const upstream = buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceReviewNotesPack();
  return upstream.reviewNotes
    .map((note) => note as unknown as Record<string, unknown>)
    .map((note) => ({ note, score: triageScoreForNote(note) }))
    .sort((a, b) => b.score - a.score)
    .map((entry, index) => buildSafeTriageRow(entry.note, index + 1));
};

export const buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceNotesTriageMatrix = (): RoutingBalanceNotesTriageMatrix => ({
  contract: buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceNotesTriageMatrixContract(),
  triageRows: buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceNotesTriageRows(),
  upstreamRoutingBalanceReviewNotesSnapshot: buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceReviewNotesPack(),
});

export const getShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceNotesTriageMatrixSummary = () => {
  const triageRows = buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceNotesTriageRows();
  const blockers: string[] = [];
  const warnings = triageRows
    .filter((row) => row.triageBand === "critical" || row.triageBand === "high")
    .map((row) => row.triageRationale);
  const criticalCount = triageRows.filter((row) => row.triageBand === "critical").length;
  const highCount = triageRows.filter((row) => row.triageBand === "high").length;
  const mediumCount = triageRows.filter((row) => row.triageBand === "medium").length;
  const lowCount = triageRows.filter((row) => row.triageBand === "low").length;
  const averageTriageScore = triageRows.length === 0 ? 0 : Math.round(triageRows.reduce((sum, row) => sum + row.triageScore, 0) / triageRows.length);
  const maxShareDeviationPct = triageRows.length === 0 ? 0 : Math.max(...triageRows.map((row) => row.shareDeviationPct));
  const readinessScorePct = Math.max(0, Math.round(100 - ((criticalCount * 20 + highCount * 12 + mediumCount * 5) / Math.max(1, triageRows.length))));

  return {
    generatedAt: nowIso(),
    currentStatus: PHASE_LABEL,
    artifactEnvelopeReviewBinderTraceabilityCoverageBalanceNotesTriageMatrixLabel: "Routing Balance Notes Triage Matrix",
    artifactEnvelopeReviewBinderTraceabilityCoverageBalanceNotesTriageMatrixStatus: "Offline routing balance notes triage only / persistence disabled",
    triagePersistence: "Disabled",
    triageAssignment: "Disabled",
    triageResolution: "Disabled",
    triageSignoff: "Disabled",
    triageExport: "Disabled",
    fileOutput: "Disabled",
    artifactAccess: "Blocked",
    modelExecution: "Off",
    productionInference: "Not exposed",
    businessMutation: "Blocked",
    currentShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceNotesTriageMatrix: {
      status: "offline_routing_balance_notes_triage_only",
      triageRowCount: triageRows.length,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      averageTriageScore,
      maxShareDeviationPct,
      readinessScorePct,
      firstTriageRow: triageRows[0] ?? null,
      triagePersistenceAllowed: false,
      triageAssignmentAllowed: false,
      triageResolutionAllowed: false,
      triageSignoffAllowed: false,
      triageExportAllowed: false,
      triageDownloadAllowed: false,
      triageFileOutputAllowed: false,
      notePersistenceAllowed: false,
      noteAssignmentAllowed: false,
      noteResolutionAllowed: false,
      noteSignoffAllowed: false,
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
      explanation: "Routing balance notes triage matrix sorts offline balance notes by severity, route key, share deviation, and safety relevance only. It does not persist triage, assign reviewers, resolve/sign off, export files, read artifacts, run inference, approve, activate, promote, or mutate business records.",
    },
  };
};

export const getShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceNotesTriageMatrixNoteDetail = (noteKey: string) => {
  const matrix = buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceNotesTriageMatrix();
  const triageRows = matrix.triageRows.filter((item) => item.sourceNoteKey === noteKey || item.triageKey === noteKey || item.routeKey === noteKey);
  if (triageRows.length === 0) return null;
  return {
    noteKey,
    triageRows,
    total: triageRows.length,
    upstreamRoutingBalanceReviewNotesSnapshot: matrix.upstreamRoutingBalanceReviewNotesSnapshot,
    contract: matrix.contract,
  };
};
