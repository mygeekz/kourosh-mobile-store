import {
  buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceNotesTriageMatrix,
  buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceNotesTriageMatrixContract,
} from "./shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceNotesTriageMatrix.service";
import { getShadowRuntimeSafetyGate } from "./shadowRuntimeSafety";

const PHASE_LABEL = "Phase 5V — Offline Triage Matrix Review Routing Summary Pack" as const;
const TRIAGE_REVIEW_ROUTING_SUMMARY_PACK_KEY = "shadow_runtime_artifact_envelope_review_routing_balance_notes_triage_review_routing_summary_pack_v1" as const;

const nowIso = () => new Date().toISOString();

type ReviewRouteKey = "security-review" | "metadata-review" | "coverage-review" | "governance-review";
type RouteSummaryStatus = "ready_for_human_review" | "attention_recommended" | "critical_attention_recommended";
type RouteSummaryBand = "critical" | "high" | "medium" | "low";

type TriageReviewRoutingSummaryRecord = {
  routeSummaryKey: string;
  routeSummaryVersion: "v1";
  routeKey: ReviewRouteKey;
  routeLabel: string;
  sourceTriageKeys: string[];
  triageRowCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  averageTriageScore: number;
  maxShareDeviationPct: number;
  routeSummaryScore: number;
  routeSummaryBand: RouteSummaryBand;
  routeSummaryStatus: RouteSummaryStatus;
  routeSummaryRationale: string;
  suggestedHumanReviewRoute: ReviewRouteKey;
  suggestedReviewFocus: string[];
  routeSummaryPersistenceAllowed: false;
  routeSummaryJobAllowed: false;
  routeSummaryQueueAllowed: false;
  routeSummaryAssignmentAllowed: false;
  routeSummaryResolutionAllowed: false;
  routeSummarySignoffAllowed: false;
  routeSummaryExportAllowed: false;
  routeSummaryDownloadAllowed: false;
  routeSummaryFileOutputAllowed: false;
  triagePersistenceAllowed: false;
  triageAssignmentAllowed: false;
  triageResolutionAllowed: false;
  triageSignoffAllowed: false;
  triageExportAllowed: false;
  triageFileOutputAllowed: false;
  notePersistenceAllowed: false;
  noteAssignmentAllowed: false;
  noteResolutionAllowed: false;
  noteSignoffAllowed: false;
  reviewRoutingPersistenceAllowed: false;
  reviewRoutingAssignmentAllowed: false;
  reviewRoutingResolutionAllowed: false;
  reviewRoutingSignoffAllowed: false;
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

type TriageReviewRoutingSummaryPack = {
  contract: ReturnType<typeof buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceNotesTriageReviewRoutingSummaryPackContract>;
  routeSummaries: TriageReviewRoutingSummaryRecord[];
  upstreamTriageMatrixSnapshot: ReturnType<typeof buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceNotesTriageMatrix>;
};

const REVIEW_ROUTE_KEYS: ReviewRouteKey[] = ["security-review", "metadata-review", "coverage-review", "governance-review"];

const REQUIRED_FALSE_ROUTE_SUMMARY_FIELDS = [
  "routeSummaryPersistenceAllowed",
  "routeSummaryJobAllowed",
  "routeSummaryQueueAllowed",
  "routeSummaryAssignmentAllowed",
  "routeSummaryResolutionAllowed",
  "routeSummarySignoffAllowed",
  "routeSummaryExportAllowed",
  "routeSummaryDownloadAllowed",
  "routeSummaryFileOutputAllowed",
  "triagePersistenceAllowed",
  "triageAssignmentAllowed",
  "triageResolutionAllowed",
  "triageSignoffAllowed",
  "triageExportAllowed",
  "triageFileOutputAllowed",
  "notePersistenceAllowed",
  "noteAssignmentAllowed",
  "noteResolutionAllowed",
  "noteSignoffAllowed",
  "reviewRoutingPersistenceAllowed",
  "reviewRoutingAssignmentAllowed",
  "reviewRoutingResolutionAllowed",
  "reviewRoutingSignoffAllowed",
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

const FORBIDDEN_ROUTE_SUMMARY_FIELDS = [
  "routeSummaryPersistenceId",
  "routeSummaryJobId",
  "routeSummaryQueueId",
  "routeSummaryAssignmentId",
  "routeSummaryResolutionId",
  "routeSummarySignoffId",
  "routeSummaryExportPath",
  "routeSummaryDownloadUrl",
  "triagePersistenceId",
  "triageAssignmentId",
  "notePersistenceId",
  "reviewerUserId",
  "reviewerAssignmentId",
  "routeAssignmentId",
  "routingPersistenceId",
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

const routeLabelForKey = (routeKey: ReviewRouteKey): string => {
  if (routeKey === "security-review") return "Security Review";
  if (routeKey === "metadata-review") return "Metadata Review";
  if (routeKey === "coverage-review") return "Coverage Review";
  return "Governance Review";
};

const routeBandForScore = (score: number): RouteSummaryBand => {
  if (score >= 85) return "critical";
  if (score >= 65) return "high";
  if (score >= 40) return "medium";
  return "low";
};

const routeStatusForBand = (band: RouteSummaryBand): RouteSummaryStatus => (
  band === "critical" ? "critical_attention_recommended" : band === "high" || band === "medium" ? "attention_recommended" : "ready_for_human_review"
);

const buildSafeRouteSummaryRecord = (routeKey: ReviewRouteKey, triageRows: Array<Record<string, unknown>>): TriageReviewRoutingSummaryRecord => {
  const routeLabel = routeLabelForKey(routeKey);
  const scores = triageRows.map((row) => Number(row.triageScore ?? 0));
  const deviations = triageRows.map((row) => Number(row.shareDeviationPct ?? 0));
  const criticalCount = triageRows.filter((row) => row.triageBand === "critical").length;
  const highCount = triageRows.filter((row) => row.triageBand === "high").length;
  const mediumCount = triageRows.filter((row) => row.triageBand === "medium").length;
  const lowCount = triageRows.filter((row) => row.triageBand === "low").length;
  const averageTriageScore = scores.length === 0 ? 0 : Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  const maxShareDeviationPct = deviations.length === 0 ? 0 : Math.max(...deviations);
  const routeSummaryScore = Math.min(100, Math.round(averageTriageScore + criticalCount * 8 + highCount * 5 + Math.min(12, maxShareDeviationPct)));
  const routeSummaryBand = routeBandForScore(routeSummaryScore);
  const routeSummaryStatus = routeStatusForBand(routeSummaryBand);
  const sourceTriageKeys = triageRows.map((row) => String(row.triageKey ?? row.sourceNoteKey ?? routeKey));

  return {
    routeSummaryKey: `triage_review_routing_summary_${routeKey}_v1`,
    routeSummaryVersion: "v1",
    routeKey,
    routeLabel,
    sourceTriageKeys,
    triageRowCount: triageRows.length,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    averageTriageScore,
    maxShareDeviationPct,
    routeSummaryScore,
    routeSummaryBand,
    routeSummaryStatus,
    routeSummaryRationale: `${routeLabel} summary groups ${triageRows.length} triage row(s), ${criticalCount} critical, ${highCount} high, ${averageTriageScore} average triage score, and ${maxShareDeviationPct}% max share deviation.`,
    suggestedHumanReviewRoute: routeKey,
    suggestedReviewFocus: [
      `${routeKey} triage summary`,
      `${routeSummaryBand} route-summary band`,
      `${averageTriageScore} average triage score`,
      `${maxShareDeviationPct}% max share deviation`,
    ],
    routeSummaryPersistenceAllowed: false,
    routeSummaryJobAllowed: false,
    routeSummaryQueueAllowed: false,
    routeSummaryAssignmentAllowed: false,
    routeSummaryResolutionAllowed: false,
    routeSummarySignoffAllowed: false,
    routeSummaryExportAllowed: false,
    routeSummaryDownloadAllowed: false,
    routeSummaryFileOutputAllowed: false,
    triagePersistenceAllowed: false,
    triageAssignmentAllowed: false,
    triageResolutionAllowed: false,
    triageSignoffAllowed: false,
    triageExportAllowed: false,
    triageFileOutputAllowed: false,
    notePersistenceAllowed: false,
    noteAssignmentAllowed: false,
    noteResolutionAllowed: false,
    noteSignoffAllowed: false,
    reviewRoutingPersistenceAllowed: false,
    reviewRoutingAssignmentAllowed: false,
    reviewRoutingResolutionAllowed: false,
    reviewRoutingSignoffAllowed: false,
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
      "Triage review routing summaries are generated in memory from Phase 5U triage rows only.",
      "Route summaries group advisory triage evidence by human review route only.",
      "No persistence, assignment, resolution, signoff, export, file output, artifact access, inference, approval, activation, promotion, or business mutation is enabled.",
    ],
  };
};

export const buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceNotesTriageReviewRoutingSummaryPackContract = () => ({
  triageReviewRoutingSummaryPackKey: TRIAGE_REVIEW_ROUTING_SUMMARY_PACK_KEY,
  triageReviewRoutingSummaryPackVersion: "v1",
  phase: PHASE_LABEL,
  generatedAt: nowIso(),
  purpose: "Read-only offline triage matrix review routing summary pack. It summarizes Phase 5U triage rows by suggested human review route only, without persistence, assignment, resolution, signoff, export, file output, artifact access, inference, approval, activation, promotion, or business mutation.",
  upstreamContracts: {
    routingBalanceNotesTriageMatrix: buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceNotesTriageMatrixContract().routingBalanceNotesTriageMatrixKey,
  },
  summaryDimensions: ["review route", "triage band", "critical/high counts", "average triage score", "share deviation"],
  reviewRoutes: [...REVIEW_ROUTE_KEYS],
  proposedRouteSummaryShape: {
    routeSummaryMode: "offline_readonly_triage_review_routing_summary_only",
    routeSummaryPersistenceAllowed: false,
    routeSummaryAssignmentAllowed: false,
    routeSummaryResolutionAllowed: false,
    routeSummarySignoffAllowed: false,
    routeSummaryExportAllowed: false,
    routeSummaryFileOutputAllowed: false,
  },
  requiredFalseFields: [...REQUIRED_FALSE_ROUTE_SUMMARY_FIELDS],
  forbiddenRouteSummaryFields: [...FORBIDDEN_ROUTE_SUMMARY_FIELDS],
  allowedBehavior: [
    "Build in-memory route summaries from existing offline triage rows only.",
    "Summarize advisory triage evidence by security-review, metadata-review, coverage-review, and governance-review.",
    "Expose route summary and route detail for Admin and Manager review only.",
  ],
  forbiddenBehavior: [
    "Do not persist route summaries, triage rows, notes, assignments, routes, priorities, coverage rows, traceability rows, binders, export jobs, metadata envelopes, or retention policies.",
    "Do not assign reviewers, create jobs, queues, workflow state, resolutions, signoffs, exports, file outputs, or downloads.",
    "Do not enforce retention, expiry, archive, purge, or deletion behavior.",
    "Do not read artifact files or bytes, import artifacts, load model artifacts, run inference, approve, activate, promote, accept, or deploy candidates.",
    "Do not mutate pricing, reports, ledger, inventory, accounting, sales, repairs, partners, customers, or any business record.",
  ],
  safetyGate: getShadowRuntimeSafetyGate(),
});

export const buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceNotesTriageReviewRoutingSummaryRecords = (): TriageReviewRoutingSummaryRecord[] => {
  const matrix = buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceNotesTriageMatrix();
  const triageRows = matrix.triageRows.map((row) => row as unknown as Record<string, unknown>);
  return REVIEW_ROUTE_KEYS.map((routeKey) => buildSafeRouteSummaryRecord(
    routeKey,
    triageRows.filter((row) => row.routeKey === routeKey),
  ));
};

export const buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceNotesTriageReviewRoutingSummaryPack = (): TriageReviewRoutingSummaryPack => ({
  contract: buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceNotesTriageReviewRoutingSummaryPackContract(),
  routeSummaries: buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceNotesTriageReviewRoutingSummaryRecords(),
  upstreamTriageMatrixSnapshot: buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceNotesTriageMatrix(),
});

export const getShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceNotesTriageReviewRoutingSummaryPackSummary = () => {
  const routeSummaries = buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceNotesTriageReviewRoutingSummaryRecords();
  const blockers: string[] = [];
  const warnings = routeSummaries
    .filter((row) => row.routeSummaryBand === "critical" || row.routeSummaryBand === "high")
    .map((row) => row.routeSummaryRationale);
  const criticalRouteCount = routeSummaries.filter((row) => row.routeSummaryBand === "critical").length;
  const highRouteCount = routeSummaries.filter((row) => row.routeSummaryBand === "high").length;
  const totalTriageRows = routeSummaries.reduce((sum, row) => sum + row.triageRowCount, 0);
  const averageRouteSummaryScore = routeSummaries.length === 0 ? 0 : Math.round(routeSummaries.reduce((sum, row) => sum + row.routeSummaryScore, 0) / routeSummaries.length);
  const maxShareDeviationPct = routeSummaries.length === 0 ? 0 : Math.max(...routeSummaries.map((row) => row.maxShareDeviationPct));
  const readinessScorePct = Math.max(0, Math.round(100 - ((criticalRouteCount * 18 + highRouteCount * 10) / Math.max(1, routeSummaries.length))));

  return {
    generatedAt: nowIso(),
    currentStatus: PHASE_LABEL,
    artifactEnvelopeReviewBinderTraceabilityCoverageBalanceNotesTriageReviewRoutingSummaryPackLabel: "Triage Matrix Review Routing Summary Pack",
    artifactEnvelopeReviewBinderTraceabilityCoverageBalanceNotesTriageReviewRoutingSummaryPackStatus: "Offline triage review routing summary only / persistence disabled",
    routeSummaryPersistence: "Disabled",
    routeSummaryAssignment: "Disabled",
    routeSummaryResolution: "Disabled",
    routeSummarySignoff: "Disabled",
    routeSummaryExport: "Disabled",
    fileOutput: "Disabled",
    artifactAccess: "Blocked",
    modelExecution: "Off",
    productionInference: "Not exposed",
    businessMutation: "Blocked",
    currentShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceNotesTriageReviewRoutingSummaryPack: {
      status: "offline_triage_review_routing_summary_only",
      routeSummaryCount: routeSummaries.length,
      totalTriageRows,
      criticalRouteCount,
      highRouteCount,
      averageRouteSummaryScore,
      maxShareDeviationPct,
      readinessScorePct,
      firstRouteSummary: routeSummaries[0] ?? null,
      routeSummaryPersistenceAllowed: false,
      routeSummaryAssignmentAllowed: false,
      routeSummaryResolutionAllowed: false,
      routeSummarySignoffAllowed: false,
      routeSummaryExportAllowed: false,
      routeSummaryDownloadAllowed: false,
      routeSummaryFileOutputAllowed: false,
      triagePersistenceAllowed: false,
      triageAssignmentAllowed: false,
      triageResolutionAllowed: false,
      triageSignoffAllowed: false,
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
      explanation: "Triage review routing summary pack groups offline triage matrix rows by suggested human review route only. It does not persist summaries, assign reviewers, resolve/sign off, export files, read artifacts, run inference, approve, activate, promote, or mutate business records.",
    },
  };
};

export const getShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceNotesTriageReviewRoutingSummaryRouteDetail = (routeKey: string) => {
  const pack = buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceNotesTriageReviewRoutingSummaryPack();
  const routeSummaries = pack.routeSummaries.filter((item) => item.routeKey === routeKey || item.routeSummaryKey === routeKey);
  if (routeSummaries.length === 0) return null;
  return {
    routeKey,
    routeSummaries,
    total: routeSummaries.length,
    upstreamTriageMatrixSnapshot: pack.upstreamTriageMatrixSnapshot,
    contract: pack.contract,
  };
};
