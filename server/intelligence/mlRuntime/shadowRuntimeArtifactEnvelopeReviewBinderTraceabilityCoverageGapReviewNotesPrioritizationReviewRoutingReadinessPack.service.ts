import {
  buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationMatrix,
  buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationMatrixContract,
} from "./shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationMatrix.service";
import { getShadowRuntimeSafetyGate } from "./shadowRuntimeSafety";

const PHASE_LABEL = "Phase 5R — Offline Prioritization Review Routing Readiness Pack" as const;
const REVIEW_ROUTING_READINESS_PACK_KEY = "shadow_runtime_artifact_envelope_review_notes_prioritization_review_routing_readiness_pack_v1" as const;

const nowIso = () => new Date().toISOString();

type ReviewRouteKey = "security-review" | "metadata-review" | "coverage-review" | "governance-review";
type ReviewRouteStatus = "routing_ready" | "review_required" | "blocked";
type ReviewRoutePriority = "critical" | "high" | "medium" | "low";

type ReviewRoutingReadinessRecord = {
  routingKey: string;
  routingVersion: "v1";
  routeKey: ReviewRouteKey;
  routeLabel: string;
  routeReason: string;
  priorityKey: string;
  noteKey: string;
  binderKey: string;
  coverageKey: string;
  priorityBand: ReviewRoutePriority;
  priorityScore: number;
  priorityRank: number;
  safetyRelevance: string;
  sourceDimension: string;
  coverageSource: string;
  binderSection: string;
  status: ReviewRouteStatus;
  suggestedHumanReviewPath: string;
  routingRationale: string;
  sourceEvidence: string;
  reviewRoutingPersistenceAllowed: false;
  reviewRoutingJobAllowed: false;
  reviewRoutingQueueAllowed: false;
  reviewRoutingAssignmentAllowed: false;
  reviewerAssignmentAllowed: false;
  reviewRoutingResolutionAllowed: false;
  reviewRoutingSignoffAllowed: false;
  routingExportAllowed: false;
  routingDownloadAllowed: false;
  routingFileOutputAllowed: false;
  prioritizationPersistenceAllowed: false;
  prioritizationAssignmentAllowed: false;
  prioritizationResolutionAllowed: false;
  prioritizationSignoffAllowed: false;
  priorityExportAllowed: false;
  priorityFileOutputAllowed: false;
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

type ReviewRoutingReadinessPack = {
  contract: ReturnType<typeof buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationReviewRoutingReadinessPackContract>;
  routingRecords: ReviewRoutingReadinessRecord[];
  upstreamPrioritizationMatrixSnapshot: ReturnType<typeof buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationMatrix>;
};

const REQUIRED_FALSE_ROUTING_FIELDS = [
  "reviewRoutingPersistenceAllowed",
  "reviewRoutingJobAllowed",
  "reviewRoutingQueueAllowed",
  "reviewRoutingAssignmentAllowed",
  "reviewerAssignmentAllowed",
  "reviewRoutingResolutionAllowed",
  "reviewRoutingSignoffAllowed",
  "routingExportAllowed",
  "routingDownloadAllowed",
  "routingFileOutputAllowed",
  "prioritizationPersistenceAllowed",
  "prioritizationAssignmentAllowed",
  "prioritizationResolutionAllowed",
  "prioritizationSignoffAllowed",
  "priorityExportAllowed",
  "priorityFileOutputAllowed",
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

const FORBIDDEN_ROUTING_FIELDS = [
  "routingPersistenceId",
  "routingJobId",
  "routingQueueId",
  "reviewAssignmentId",
  "reviewerUserId",
  "resolutionId",
  "signoffId",
  "routingExportPath",
  "routingDownloadUrl",
  "priorityPersistenceId",
  "notePersistenceId",
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

const routeForPriority = (row: Record<string, unknown>): { routeKey: ReviewRouteKey; routeLabel: string; routeReason: string } => {
  const combined = `${String(row.safetyRelevance ?? "")} ${String(row.noteCategory ?? "")} ${String(row.sourceDimension ?? "")} ${String(row.coverageSource ?? "")} ${String(row.binderSection ?? "")}`;
  if (/safety|forbidden|inference|approval|activation|promotion|business|mutation|archive|purge|delete/i.test(combined)) {
    return { routeKey: "security-review", routeLabel: "Security Review", routeReason: "Safety or forbidden-action relevance requires security-oriented human review context." };
  }
  if (/metadata|artifact|manifest|envelope|storage/i.test(combined)) {
    return { routeKey: "metadata-review", routeLabel: "Metadata Review", routeReason: "Metadata, artifact, manifest, or envelope references require metadata-oriented review context." };
  }
  if (/coverage|traceability|binder|source/i.test(combined)) {
    return { routeKey: "coverage-review", routeLabel: "Coverage Review", routeReason: "Coverage, traceability, binder, or source evidence references require coverage-oriented review context." };
  }
  return { routeKey: "governance-review", routeLabel: "Governance Review", routeReason: "General governance context requires non-operational human review routing only." };
};

const statusForPriority = (priorityBand: string): ReviewRouteStatus => (
  priorityBand === "critical" ? "blocked" : priorityBand === "high" || priorityBand === "medium" ? "review_required" : "routing_ready"
);

const buildSafeRoutingRecord = (args: {
  routingKey: string;
  routeKey: ReviewRouteKey;
  routeLabel: string;
  routeReason: string;
  priorityKey: string;
  noteKey: string;
  binderKey: string;
  coverageKey: string;
  priorityBand: ReviewRoutePriority;
  priorityScore: number;
  priorityRank: number;
  safetyRelevance: string;
  sourceDimension: string;
  coverageSource: string;
  binderSection: string;
  status: ReviewRouteStatus;
  suggestedHumanReviewPath: string;
  routingRationale: string;
  sourceEvidence: string;
}): ReviewRoutingReadinessRecord => ({
  routingKey: args.routingKey,
  routingVersion: "v1",
  routeKey: args.routeKey,
  routeLabel: args.routeLabel,
  routeReason: args.routeReason,
  priorityKey: args.priorityKey,
  noteKey: args.noteKey,
  binderKey: args.binderKey,
  coverageKey: args.coverageKey,
  priorityBand: args.priorityBand,
  priorityScore: args.priorityScore,
  priorityRank: args.priorityRank,
  safetyRelevance: args.safetyRelevance,
  sourceDimension: args.sourceDimension,
  coverageSource: args.coverageSource,
  binderSection: args.binderSection,
  status: args.status,
  suggestedHumanReviewPath: args.suggestedHumanReviewPath,
  routingRationale: args.routingRationale,
  sourceEvidence: args.sourceEvidence,
  reviewRoutingPersistenceAllowed: false,
  reviewRoutingJobAllowed: false,
  reviewRoutingQueueAllowed: false,
  reviewRoutingAssignmentAllowed: false,
  reviewerAssignmentAllowed: false,
  reviewRoutingResolutionAllowed: false,
  reviewRoutingSignoffAllowed: false,
  routingExportAllowed: false,
  routingDownloadAllowed: false,
  routingFileOutputAllowed: false,
  prioritizationPersistenceAllowed: false,
  prioritizationAssignmentAllowed: false,
  prioritizationResolutionAllowed: false,
  prioritizationSignoffAllowed: false,
  priorityExportAllowed: false,
  priorityFileOutputAllowed: false,
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
    "Review routing readiness is generated in memory from Phase 5Q priority rows only.",
    "Suggested routes are advisory labels for human review context and do not assign reviewers, persist workflow state, resolve evidence, sign off, export files, or create queues.",
    "No artifact access, inference, approval, activation, promotion, archive, purge, deletion, or business mutation is enabled.",
  ],
});

export const buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationReviewRoutingReadinessPackContract = () => ({
  reviewRoutingReadinessPackKey: REVIEW_ROUTING_READINESS_PACK_KEY,
  reviewRoutingReadinessPackVersion: "v1",
  phase: PHASE_LABEL,
  generatedAt: nowIso(),
  purpose: "Read-only offline review routing readiness pack for Phase 5Q priority rows. It suggests human review routes such as security-review, metadata-review, coverage-review, and governance-review without assignment, persistence, resolution, signoff, export, file output, artifact access, inference, approval, activation, promotion, or business mutation.",
  upstreamContracts: {
    prioritizationMatrix: buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationMatrixContract().reviewNotesPrioritizationMatrixKey,
  },
  proposedRoutingShape: {
    routingMode: "offline_readonly_human_review_routing_readiness_only",
    allowedRouteKeys: ["security-review", "metadata-review", "coverage-review", "governance-review"],
    reviewRoutingPersistenceAllowed: false,
    reviewRoutingAssignmentAllowed: false,
    reviewRoutingResolutionAllowed: false,
    reviewRoutingSignoffAllowed: false,
    routingExportAllowed: false,
    routingFileOutputAllowed: false,
  },
  requiredFalseFields: [...REQUIRED_FALSE_ROUTING_FIELDS],
  forbiddenRoutingFields: [...FORBIDDEN_ROUTING_FIELDS],
  allowedBehavior: [
    "Build an in-memory routing readiness pack from existing offline prioritization rows only.",
    "Suggest advisory human review routes by severity, coverage source, binder section, and safety relevance.",
    "Expose routing readiness evidence for Admin and Manager review only.",
  ],
  forbiddenBehavior: [
    "Do not persist routes, priorities, notes, coverage rows, traceability rows, binders, export jobs, metadata envelopes, or retention policies.",
    "Do not assign reviewers, create routing jobs, queues, workflow state, resolutions, signoffs, exports, file outputs, or downloads.",
    "Do not enforce retention, expiry, archive, purge, or deletion behavior.",
    "Do not read artifact files or bytes, import artifacts, load model artifacts, run inference, approve, activate, promote, accept, or deploy candidates.",
    "Do not mutate pricing, reports, ledger, inventory, accounting, sales, repairs, partners, customers, or any business record.",
  ],
  safetyGate: getShadowRuntimeSafetyGate(),
});

export const buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationReviewRoutingReadinessRecords = (): ReviewRoutingReadinessRecord[] => {
  const matrix = buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationMatrix();
  return matrix.priorityRows.map((row, index) => {
    const route = routeForPriority(row as Record<string, unknown>);
    return buildSafeRoutingRecord({
      routingKey: `review_routing_${route.routeKey}_${row.priorityKey}_${index + 1}`,
      routeKey: route.routeKey,
      routeLabel: route.routeLabel,
      routeReason: route.routeReason,
      priorityKey: row.priorityKey,
      noteKey: row.noteKey,
      binderKey: row.binderKey,
      coverageKey: row.coverageKey,
      priorityBand: row.priorityBand,
      priorityScore: row.priorityScore,
      priorityRank: row.priorityRank,
      safetyRelevance: row.safetyRelevance,
      sourceDimension: row.sourceDimension,
      coverageSource: row.coverageSource,
      binderSection: row.binderSection,
      status: statusForPriority(row.priorityBand),
      suggestedHumanReviewPath: route.routeKey,
      routingRationale: `${route.routeLabel} is suggested for priority ${row.priorityKey} because ${route.routeReason} This remains advisory-only and does not create assignment, persistence, resolution, signoff, export, file output, inference, approval, activation, promotion, or mutation controls.`,
      sourceEvidence: row.sourceEvidence,
    });
  });
};

export const buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationReviewRoutingReadinessPack = (): ReviewRoutingReadinessPack => ({
  contract: buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationReviewRoutingReadinessPackContract(),
  routingRecords: buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationReviewRoutingReadinessRecords(),
  upstreamPrioritizationMatrixSnapshot: buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationMatrix(),
});

export const getShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationReviewRoutingReadinessPackSummary = () => {
  const routingRecords = buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationReviewRoutingReadinessRecords();
  const blockers = routingRecords.filter((row) => row.status === "blocked").map((row) => row.routingRationale);
  const warnings = routingRecords.filter((row) => row.status === "review_required").map((row) => row.routingRationale);
  const securityReviewCount = routingRecords.filter((row) => row.routeKey === "security-review").length;
  const metadataReviewCount = routingRecords.filter((row) => row.routeKey === "metadata-review").length;
  const coverageReviewCount = routingRecords.filter((row) => row.routeKey === "coverage-review").length;
  const governanceReviewCount = routingRecords.filter((row) => row.routeKey === "governance-review").length;
  const criticalRouteCount = routingRecords.filter((row) => row.priorityBand === "critical").length;
  const highRouteCount = routingRecords.filter((row) => row.priorityBand === "high").length;
  const readinessScorePct = routingRecords.length === 0
    ? 100
    : Math.round((routingRecords.filter((row) => row.status !== "blocked").length / routingRecords.length) * 100);

  return {
    generatedAt: nowIso(),
    currentStatus: PHASE_LABEL,
    artifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationReviewRoutingReadinessPackLabel: "Prioritization Review Routing Readiness Pack",
    artifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationReviewRoutingReadinessPackStatus: "Offline routing readiness only / assignment disabled",
    reviewRoutingPersistence: "Disabled",
    reviewRoutingAssignment: "Disabled",
    reviewRoutingResolution: "Disabled",
    reviewRoutingSignoff: "Disabled",
    routingExport: "Disabled",
    fileOutput: "Disabled",
    artifactAccess: "Blocked",
    modelExecution: "Off",
    productionInference: "Not exposed",
    businessMutation: "Blocked",
    currentShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationReviewRoutingReadinessPack: {
      status: "offline_review_routing_readiness_only",
      readinessScorePct,
      routingRecordCount: routingRecords.length,
      securityReviewCount,
      metadataReviewCount,
      coverageReviewCount,
      governanceReviewCount,
      criticalRouteCount,
      highRouteCount,
      warningCount: warnings.length,
      blockerCount: blockers.length,
      firstSuggestedRoute: routingRecords[0] ?? null,
      reviewRoutingPersistenceAllowed: false,
      reviewRoutingAssignmentAllowed: false,
      reviewRoutingResolutionAllowed: false,
      reviewRoutingSignoffAllowed: false,
      routingExportAllowed: false,
      routingDownloadAllowed: false,
      routingFileOutputAllowed: false,
      prioritizationPersistenceAllowed: false,
      prioritizationAssignmentAllowed: false,
      prioritizationResolutionAllowed: false,
      prioritizationSignoffAllowed: false,
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
      explanation: "Review routing readiness pack only suggests advisory human review routes for priority rows and does not create assignments, persistence, resolution, signoff, export, file output, artifact access, inference, approval, activation, promotion, or business mutation.",
    },
  };
};

export const getShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationReviewRoutingReadinessRouteDetail = (routeKey: string) => {
  const pack = buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationReviewRoutingReadinessPack();
  const routeRecords = pack.routingRecords.filter((item) => item.routeKey === routeKey || item.routingKey === routeKey || item.priorityKey === routeKey);
  if (routeRecords.length === 0) return null;
  return {
    routeKey,
    routeRecords,
    total: routeRecords.length,
    upstreamPrioritizationMatrixSnapshot: pack.upstreamPrioritizationMatrixSnapshot,
    contract: pack.contract,
  };
};
