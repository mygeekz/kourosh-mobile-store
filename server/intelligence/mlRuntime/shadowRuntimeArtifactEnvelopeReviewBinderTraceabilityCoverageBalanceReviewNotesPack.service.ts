import {
  buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalancePack,
  buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalancePackContract,
} from "./shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationReviewRoutingCoverageBalancePack.service";
import { getShadowRuntimeSafetyGate } from "./shadowRuntimeSafety";

const PHASE_LABEL = "Phase 5T — Offline Routing Balance Review Notes Pack" as const;
const ROUTING_BALANCE_REVIEW_NOTES_PACK_KEY = "shadow_runtime_artifact_envelope_review_routing_balance_review_notes_pack_v1" as const;

const nowIso = () => new Date().toISOString();

type ReviewRouteKey = "security-review" | "metadata-review" | "coverage-review" | "governance-review";
type ReviewNoteSeverity = "info" | "warning" | "attention";

type ReviewRoutingBalanceReviewNote = {
  noteKey: string;
  noteVersion: "v1";
  routeKey: ReviewRouteKey;
  routeLabel: string;
  sourceBalanceKey: string;
  sourceCoverageBalanceStatus: string;
  routeSharePct: number;
  expectedMinSharePct: number;
  expectedMaxSharePct: number;
  balanceNoteSeverity: ReviewNoteSeverity;
  balanceReviewNoteTitle: string;
  balanceReviewNote: string;
  recommendedReviewFocus: string[];
  notePersistenceAllowed: false;
  noteJobAllowed: false;
  noteQueueAllowed: false;
  noteAssignmentAllowed: false;
  reviewerAssignmentAllowed: false;
  noteResolutionAllowed: false;
  noteSignoffAllowed: false;
  noteExportAllowed: false;
  noteDownloadAllowed: false;
  noteFileOutputAllowed: false;
  balancePersistenceAllowed: false;
  balanceResolutionAllowed: false;
  balanceSignoffAllowed: false;
  balanceExportAllowed: false;
  balanceDownloadAllowed: false;
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

type ReviewRoutingBalanceReviewNotesPack = {
  contract: ReturnType<typeof buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceReviewNotesPackContract>;
  reviewNotes: ReviewRoutingBalanceReviewNote[];
  upstreamRoutingCoverageBalanceSnapshot: ReturnType<typeof buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalancePack>;
};

const REQUIRED_FALSE_NOTE_FIELDS = [
  "notePersistenceAllowed",
  "noteJobAllowed",
  "noteQueueAllowed",
  "noteAssignmentAllowed",
  "reviewerAssignmentAllowed",
  "noteResolutionAllowed",
  "noteSignoffAllowed",
  "noteExportAllowed",
  "noteDownloadAllowed",
  "noteFileOutputAllowed",
  "balancePersistenceAllowed",
  "balanceResolutionAllowed",
  "balanceSignoffAllowed",
  "balanceExportAllowed",
  "balanceDownloadAllowed",
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
  "noteAssignmentId",
  "reviewerUserId",
  "noteResolutionId",
  "noteSignoffId",
  "noteExportPath",
  "noteDownloadUrl",
  "balancePersistenceId",
  "balanceJobId",
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

const severityForBalance = (status: string, sharePct: number): ReviewNoteSeverity => {
  if (status === "underrepresented") return "attention";
  if (status === "watch" || sharePct > 60) return "warning";
  return "info";
};

const buildRecommendedReviewFocus = (status: string, routeKey: ReviewRouteKey): string[] => {
  const focus = [
    `${routeKey} balance evidence`,
    "human review coverage only",
    "no assignment or signoff action",
  ];
  if (status === "underrepresented") focus.push("underrepresented route share review");
  if (status === "watch") focus.push("route concentration watch review");
  return focus;
};

const buildSafeReviewNote = (balanceRecord: Record<string, unknown>): ReviewRoutingBalanceReviewNote => {
  const routeKey = String(balanceRecord.routeKey) as ReviewRouteKey;
  const routeLabel = String(balanceRecord.routeLabel ?? routeKey);
  const balanceKey = String(balanceRecord.balanceKey ?? `routing_balance_${routeKey}_v1`);
  const status = String(balanceRecord.coverageBalanceStatus ?? "balanced");
  const routeSharePct = Number(balanceRecord.routeSharePct ?? 0);
  const expectedMinSharePct = Number(balanceRecord.expectedMinSharePct ?? 0);
  const expectedMaxSharePct = Number(balanceRecord.expectedMaxSharePct ?? 0);
  const severity = severityForBalance(status, routeSharePct);

  return {
    noteKey: `routing_balance_review_note_${routeKey}_v1`,
    noteVersion: "v1",
    routeKey,
    routeLabel,
    sourceBalanceKey: balanceKey,
    sourceCoverageBalanceStatus: status,
    routeSharePct,
    expectedMinSharePct,
    expectedMaxSharePct,
    balanceNoteSeverity: severity,
    balanceReviewNoteTitle: `${routeLabel} routing balance review note`,
    balanceReviewNote: `${routeLabel} has ${routeSharePct}% advisory routing share with status ${status}. This note is offline review evidence only and does not create persistence, assignment, resolution, signoff, export, file output, artifact access, inference, approval, activation, promotion, or mutation controls.`,
    recommendedReviewFocus: buildRecommendedReviewFocus(status, routeKey),
    notePersistenceAllowed: false,
    noteJobAllowed: false,
    noteQueueAllowed: false,
    noteAssignmentAllowed: false,
    reviewerAssignmentAllowed: false,
    noteResolutionAllowed: false,
    noteSignoffAllowed: false,
    noteExportAllowed: false,
    noteDownloadAllowed: false,
    noteFileOutputAllowed: false,
    balancePersistenceAllowed: false,
    balanceResolutionAllowed: false,
    balanceSignoffAllowed: false,
    balanceExportAllowed: false,
    balanceDownloadAllowed: false,
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
      "Routing balance review notes are generated in memory from Phase 5S balance records only.",
      "Review notes do not persist state, assign reviewers, resolve evidence, sign off, export files, or create jobs.",
      "No artifact access, inference, approval, activation, promotion, archive, purge, deletion, or business mutation is enabled.",
    ],
  };
};

export const buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceReviewNotesPackContract = () => ({
  routingBalanceReviewNotesPackKey: ROUTING_BALANCE_REVIEW_NOTES_PACK_KEY,
  routingBalanceReviewNotesPackVersion: "v1",
  phase: PHASE_LABEL,
  generatedAt: nowIso(),
  purpose: "Read-only offline routing balance review notes pack for Phase 5S balance records. It converts balance watch/underrepresented evidence into human review notes only, without persistence, assignment, resolution, signoff, export, file output, artifact access, inference, approval, activation, promotion, or business mutation.",
  upstreamContracts: {
    routingCoverageBalancePack: buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalancePackContract().routingCoverageBalancePackKey,
  },
  proposedNoteShape: {
    noteMode: "offline_readonly_routing_balance_review_notes_only",
    notePersistenceAllowed: false,
    noteAssignmentAllowed: false,
    noteResolutionAllowed: false,
    noteSignoffAllowed: false,
    noteExportAllowed: false,
    noteFileOutputAllowed: false,
  },
  requiredFalseFields: [...REQUIRED_FALSE_NOTE_FIELDS],
  forbiddenNoteFields: [...FORBIDDEN_NOTE_FIELDS],
  allowedBehavior: [
    "Build in-memory human review notes from existing offline routing coverage balance records only.",
    "Surface advisory review focus for security-review, metadata-review, coverage-review, and governance-review balance records.",
    "Expose routing balance review notes for Admin and Manager review only.",
  ],
  forbiddenBehavior: [
    "Do not persist notes, assignments, routes, priorities, coverage rows, traceability rows, binders, export jobs, metadata envelopes, or retention policies.",
    "Do not assign reviewers, create jobs, queues, workflow state, resolutions, signoffs, exports, file outputs, or downloads.",
    "Do not enforce retention, expiry, archive, purge, or deletion behavior.",
    "Do not read artifact files or bytes, import artifacts, load model artifacts, run inference, approve, activate, promote, accept, or deploy candidates.",
    "Do not mutate pricing, reports, ledger, inventory, accounting, sales, repairs, partners, customers, or any business record.",
  ],
  safetyGate: getShadowRuntimeSafetyGate(),
});

export const buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceReviewNotes = (): ReviewRoutingBalanceReviewNote[] => {
  const upstream = buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalancePack();
  return upstream.balanceRecords.map((record) => buildSafeReviewNote(record as unknown as Record<string, unknown>));
};

export const buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceReviewNotesPack = (): ReviewRoutingBalanceReviewNotesPack => ({
  contract: buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceReviewNotesPackContract(),
  reviewNotes: buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceReviewNotes(),
  upstreamRoutingCoverageBalanceSnapshot: buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalancePack(),
});

export const getShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceReviewNotesPackSummary = () => {
  const reviewNotes = buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceReviewNotes();
  const warnings = reviewNotes
    .filter((note) => note.balanceNoteSeverity !== "info")
    .map((note) => note.balanceReviewNote);
  const blockers: string[] = [];
  const attentionCount = reviewNotes.filter((note) => note.balanceNoteSeverity === "attention").length;
  const warningCount = reviewNotes.filter((note) => note.balanceNoteSeverity === "warning").length;
  const infoCount = reviewNotes.filter((note) => note.balanceNoteSeverity === "info").length;
  const readinessScorePct = reviewNotes.length === 0 ? 100 : Math.max(0, Math.round(100 - ((attentionCount * 18 + warningCount * 10) / reviewNotes.length)));

  return {
    generatedAt: nowIso(),
    currentStatus: PHASE_LABEL,
    artifactEnvelopeReviewBinderTraceabilityCoverageBalanceReviewNotesPackLabel: "Routing Balance Review Notes Pack",
    artifactEnvelopeReviewBinderTraceabilityCoverageBalanceReviewNotesPackStatus: "Offline routing balance notes only / persistence disabled",
    notePersistence: "Disabled",
    noteAssignment: "Disabled",
    noteResolution: "Disabled",
    noteSignoff: "Disabled",
    noteExport: "Disabled",
    fileOutput: "Disabled",
    artifactAccess: "Blocked",
    modelExecution: "Off",
    productionInference: "Not exposed",
    businessMutation: "Blocked",
    currentShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceReviewNotesPack: {
      status: "offline_routing_balance_review_notes_only",
      reviewNoteCount: reviewNotes.length,
      attentionCount,
      warningCount,
      infoCount,
      readinessScorePct,
      firstReviewNote: reviewNotes[0] ?? null,
      notePersistenceAllowed: false,
      noteAssignmentAllowed: false,
      noteResolutionAllowed: false,
      noteSignoffAllowed: false,
      noteExportAllowed: false,
      noteDownloadAllowed: false,
      noteFileOutputAllowed: false,
      balancePersistenceAllowed: false,
      balanceResolutionAllowed: false,
      balanceSignoffAllowed: false,
      balanceExportAllowed: false,
      balanceFileOutputAllowed: false,
      reviewRoutingAssignmentAllowed: false,
      reviewerAssignmentAllowed: false,
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
      explanation: "Routing balance review notes pack only turns offline balance evidence into human review notes and does not persist notes, assign reviewers, resolve/sign off, export files, read artifacts, run inference, approve, activate, promote, or mutate business records.",
    },
  };
};

export const getShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceReviewNotesRouteDetail = (routeKey: string) => {
  const pack = buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceReviewNotesPack();
  const reviewNotes = pack.reviewNotes.filter((item) => item.routeKey === routeKey || item.noteKey === routeKey);
  if (reviewNotes.length === 0) return null;
  return {
    routeKey,
    reviewNotes,
    total: reviewNotes.length,
    upstreamRoutingCoverageBalanceSnapshot: pack.upstreamRoutingCoverageBalanceSnapshot,
    contract: pack.contract,
  };
};
