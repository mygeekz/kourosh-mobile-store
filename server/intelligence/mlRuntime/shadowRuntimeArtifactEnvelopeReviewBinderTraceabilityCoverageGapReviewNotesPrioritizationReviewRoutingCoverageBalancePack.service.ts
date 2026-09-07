import {
  buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationReviewRoutingReadinessPack,
  buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationReviewRoutingReadinessPackContract,
} from "./shadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationReviewRoutingReadinessPack.service";
import { getShadowRuntimeSafetyGate } from "./shadowRuntimeSafety";

const PHASE_LABEL = "Phase 5S — Offline Review Routing Coverage Balance Pack" as const;
const ROUTING_COVERAGE_BALANCE_PACK_KEY = "shadow_runtime_artifact_envelope_review_notes_prioritization_review_routing_coverage_balance_pack_v1" as const;

const nowIso = () => new Date().toISOString();

type ReviewRouteKey = "security-review" | "metadata-review" | "coverage-review" | "governance-review";
type BalanceStatus = "balanced" | "watch" | "underrepresented";

type ReviewRoutingCoverageBalanceRecord = {
  balanceKey: string;
  balanceVersion: "v1";
  routeKey: ReviewRouteKey;
  routeLabel: string;
  totalRoutingRecords: number;
  routeRecordCount: number;
  routeSharePct: number;
  expectedMinSharePct: number;
  expectedMaxSharePct: number;
  deviationFromEvenPct: number;
  coverageBalanceStatus: BalanceStatus;
  coverageBalanceRationale: string;
  sourceRoutingRecordKeys: string[];
  balancePersistenceAllowed: false;
  balanceJobAllowed: false;
  balanceQueueAllowed: false;
  balanceResolutionAllowed: false;
  balanceSignoffAllowed: false;
  balanceExportAllowed: false;
  balanceDownloadAllowed: false;
  balanceFileOutputAllowed: false;
  reviewRoutingPersistenceAllowed: false;
  reviewRoutingAssignmentAllowed: false;
  reviewerAssignmentAllowed: false;
  reviewRoutingResolutionAllowed: false;
  reviewRoutingSignoffAllowed: false;
  routingExportAllowed: false;
  routingFileOutputAllowed: false;
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

type ReviewRoutingCoverageBalancePack = {
  contract: ReturnType<typeof buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalancePackContract>;
  balanceRecords: ReviewRoutingCoverageBalanceRecord[];
  upstreamReviewRoutingReadinessSnapshot: ReturnType<typeof buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationReviewRoutingReadinessPack>;
};

const ROUTES: Array<{ routeKey: ReviewRouteKey; routeLabel: string }> = [
  { routeKey: "security-review", routeLabel: "Security Review" },
  { routeKey: "metadata-review", routeLabel: "Metadata Review" },
  { routeKey: "coverage-review", routeLabel: "Coverage Review" },
  { routeKey: "governance-review", routeLabel: "Governance Review" },
];

const REQUIRED_FALSE_BALANCE_FIELDS = [
  "balancePersistenceAllowed",
  "balanceJobAllowed",
  "balanceQueueAllowed",
  "balanceResolutionAllowed",
  "balanceSignoffAllowed",
  "balanceExportAllowed",
  "balanceDownloadAllowed",
  "balanceFileOutputAllowed",
  "reviewRoutingPersistenceAllowed",
  "reviewRoutingAssignmentAllowed",
  "reviewerAssignmentAllowed",
  "reviewRoutingResolutionAllowed",
  "reviewRoutingSignoffAllowed",
  "routingExportAllowed",
  "routingFileOutputAllowed",
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

const FORBIDDEN_BALANCE_FIELDS = [
  "balancePersistenceId",
  "balanceJobId",
  "balanceQueueId",
  "balanceResolutionId",
  "balanceSignoffId",
  "balanceExportPath",
  "balanceDownloadUrl",
  "reviewAssignmentId",
  "reviewerUserId",
  "routingPersistenceId",
  "routingJobId",
  "routingQueueId",
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

const toPercent = (part: number, total: number) => (total <= 0 ? 0 : Math.round((part / total) * 100));

const statusForShare = (sharePct: number, expectedMinSharePct: number, total: number): BalanceStatus => {
  if (total === 0) return "watch";
  if (sharePct < expectedMinSharePct) return "underrepresented";
  if (sharePct > 60) return "watch";
  return "balanced";
};

const buildSafeBalanceRecord = (args: {
  routeKey: ReviewRouteKey;
  routeLabel: string;
  totalRoutingRecords: number;
  routeRecordCount: number;
  routeSharePct: number;
  expectedMinSharePct: number;
  expectedMaxSharePct: number;
  sourceRoutingRecordKeys: string[];
}): ReviewRoutingCoverageBalanceRecord => {
  const deviationFromEvenPct = Math.abs(args.routeSharePct - 25);
  const status = statusForShare(args.routeSharePct, args.expectedMinSharePct, args.totalRoutingRecords);
  return {
    balanceKey: `routing_balance_${args.routeKey}_v1`,
    balanceVersion: "v1",
    routeKey: args.routeKey,
    routeLabel: args.routeLabel,
    totalRoutingRecords: args.totalRoutingRecords,
    routeRecordCount: args.routeRecordCount,
    routeSharePct: args.routeSharePct,
    expectedMinSharePct: args.expectedMinSharePct,
    expectedMaxSharePct: args.expectedMaxSharePct,
    deviationFromEvenPct,
    coverageBalanceStatus: status,
    coverageBalanceRationale: `${args.routeLabel} currently represents ${args.routeSharePct}% of advisory routing records. This balance review is informational only and does not create reviewer assignment, persistence, resolution, signoff, export, file output, inference, approval, activation, promotion, or mutation controls.`,
    sourceRoutingRecordKeys: args.sourceRoutingRecordKeys,
    balancePersistenceAllowed: false,
    balanceJobAllowed: false,
    balanceQueueAllowed: false,
    balanceResolutionAllowed: false,
    balanceSignoffAllowed: false,
    balanceExportAllowed: false,
    balanceDownloadAllowed: false,
    balanceFileOutputAllowed: false,
    reviewRoutingPersistenceAllowed: false,
    reviewRoutingAssignmentAllowed: false,
    reviewerAssignmentAllowed: false,
    reviewRoutingResolutionAllowed: false,
    reviewRoutingSignoffAllowed: false,
    routingExportAllowed: false,
    routingFileOutputAllowed: false,
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
      "Routing coverage balance is generated in memory from Phase 5R advisory routing records only.",
      "Balance values are review evidence and do not assign reviewers, persist state, resolve records, sign off, export files, or create jobs.",
      "No artifact access, inference, approval, activation, promotion, archive, purge, deletion, or business mutation is enabled.",
    ],
  };
};

export const buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalancePackContract = () => ({
  routingCoverageBalancePackKey: ROUTING_COVERAGE_BALANCE_PACK_KEY,
  routingCoverageBalancePackVersion: "v1",
  phase: PHASE_LABEL,
  generatedAt: nowIso(),
  purpose: "Read-only offline routing coverage balance pack for Phase 5R advisory review routes. It compares security-review, metadata-review, coverage-review, and governance-review share only, without assignment, persistence, resolution, signoff, export, file output, artifact access, inference, approval, activation, promotion, or business mutation.",
  upstreamContracts: {
    reviewRoutingReadinessPack: buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationReviewRoutingReadinessPackContract().reviewRoutingReadinessPackKey,
  },
  proposedBalanceShape: {
    balanceMode: "offline_readonly_review_routing_coverage_balance_only",
    routeKeys: ROUTES.map((route) => route.routeKey),
    balancePersistenceAllowed: false,
    balanceResolutionAllowed: false,
    balanceSignoffAllowed: false,
    balanceExportAllowed: false,
    balanceFileOutputAllowed: false,
  },
  requiredFalseFields: [...REQUIRED_FALSE_BALANCE_FIELDS],
  forbiddenBalanceFields: [...FORBIDDEN_BALANCE_FIELDS],
  allowedBehavior: [
    "Build an in-memory balance view from existing offline advisory review routing records only.",
    "Compare route distribution across security-review, metadata-review, coverage-review, and governance-review.",
    "Expose routing balance evidence for Admin and Manager review only.",
  ],
  forbiddenBehavior: [
    "Do not persist balance rows, routes, priorities, notes, coverage rows, traceability rows, binders, export jobs, metadata envelopes, or retention policies.",
    "Do not assign reviewers, create routing jobs, queues, workflow state, resolutions, signoffs, exports, file outputs, or downloads.",
    "Do not enforce retention, expiry, archive, purge, or deletion behavior.",
    "Do not read artifact files or bytes, import artifacts, load model artifacts, run inference, approve, activate, promote, accept, or deploy candidates.",
    "Do not mutate pricing, reports, ledger, inventory, accounting, sales, repairs, partners, customers, or any business record.",
  ],
  safetyGate: getShadowRuntimeSafetyGate(),
});

export const buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceRecords = (): ReviewRoutingCoverageBalanceRecord[] => {
  const upstream = buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationReviewRoutingReadinessPack();
  const routingRecords = upstream.routingRecords;
  const totalRoutingRecords = routingRecords.length;
  const expectedMinSharePct = totalRoutingRecords <= 0 ? 0 : 10;
  const expectedMaxSharePct = totalRoutingRecords <= 0 ? 0 : 60;

  return ROUTES.map((route) => {
    const routeRecords = routingRecords.filter((record) => record.routeKey === route.routeKey);
    return buildSafeBalanceRecord({
      routeKey: route.routeKey,
      routeLabel: route.routeLabel,
      totalRoutingRecords,
      routeRecordCount: routeRecords.length,
      routeSharePct: toPercent(routeRecords.length, totalRoutingRecords),
      expectedMinSharePct,
      expectedMaxSharePct,
      sourceRoutingRecordKeys: routeRecords.map((record) => record.routingKey),
    });
  });
};

export const buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalancePack = (): ReviewRoutingCoverageBalancePack => ({
  contract: buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalancePackContract(),
  balanceRecords: buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceRecords(),
  upstreamReviewRoutingReadinessSnapshot: buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageGapReviewNotesPrioritizationReviewRoutingReadinessPack(),
});

export const getShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalancePackSummary = () => {
  const balanceRecords = buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceRecords();
  const totalRoutingRecords = balanceRecords[0]?.totalRoutingRecords ?? 0;
  const warnings = balanceRecords
    .filter((record) => record.coverageBalanceStatus !== "balanced")
    .map((record) => record.coverageBalanceRationale);
  const blockers: string[] = [];
  const maxRouteSharePct = balanceRecords.reduce((max, record) => Math.max(max, record.routeSharePct), 0);
  const minRouteSharePct = balanceRecords.reduce((min, record) => Math.min(min, record.routeSharePct), balanceRecords.length ? 100 : 0);
  const balanceIssueCount = warnings.length;
  const balanceScorePct = balanceRecords.length === 0
    ? 100
    : Math.max(0, Math.round(100 - balanceRecords.reduce((sum, record) => sum + record.deviationFromEvenPct, 0) / balanceRecords.length));
  const securityReviewSharePct = balanceRecords.find((record) => record.routeKey === "security-review")?.routeSharePct ?? 0;
  const metadataReviewSharePct = balanceRecords.find((record) => record.routeKey === "metadata-review")?.routeSharePct ?? 0;
  const coverageReviewSharePct = balanceRecords.find((record) => record.routeKey === "coverage-review")?.routeSharePct ?? 0;
  const governanceReviewSharePct = balanceRecords.find((record) => record.routeKey === "governance-review")?.routeSharePct ?? 0;

  return {
    generatedAt: nowIso(),
    currentStatus: PHASE_LABEL,
    artifactEnvelopeReviewBinderTraceabilityCoverageBalancePackLabel: "Review Routing Coverage Balance Pack",
    artifactEnvelopeReviewBinderTraceabilityCoverageBalancePackStatus: "Offline routing coverage balance only / persistence disabled",
    balancePersistence: "Disabled",
    balanceResolution: "Disabled",
    balanceSignoff: "Disabled",
    balanceExport: "Disabled",
    fileOutput: "Disabled",
    artifactAccess: "Blocked",
    modelExecution: "Off",
    productionInference: "Not exposed",
    businessMutation: "Blocked",
    currentShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalancePack: {
      status: "offline_review_routing_coverage_balance_only",
      balanceScorePct,
      balanceRecordCount: balanceRecords.length,
      totalRoutingRecords,
      balanceIssueCount,
      maxRouteSharePct,
      minRouteSharePct,
      securityReviewSharePct,
      metadataReviewSharePct,
      coverageReviewSharePct,
      governanceReviewSharePct,
      firstBalanceRecord: balanceRecords[0] ?? null,
      balancePersistenceAllowed: false,
      balanceResolutionAllowed: false,
      balanceSignoffAllowed: false,
      balanceExportAllowed: false,
      balanceDownloadAllowed: false,
      balanceFileOutputAllowed: false,
      reviewRoutingPersistenceAllowed: false,
      reviewRoutingAssignmentAllowed: false,
      reviewerAssignmentAllowed: false,
      reviewRoutingResolutionAllowed: false,
      reviewRoutingSignoffAllowed: false,
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
      explanation: "Review routing coverage balance pack only compares distribution across advisory human review routes and does not create assignments, persistence, resolution, signoff, export, file output, artifact access, inference, approval, activation, promotion, or business mutation.",
    },
  };
};

export const getShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalanceRouteDetail = (routeKey: string) => {
  const pack = buildShadowRuntimeArtifactEnvelopeReviewBinderTraceabilityCoverageBalancePack();
  const balanceRecords = pack.balanceRecords.filter((item) => item.routeKey === routeKey || item.balanceKey === routeKey);
  if (balanceRecords.length === 0) return null;
  return {
    routeKey,
    balanceRecords,
    total: balanceRecords.length,
    upstreamReviewRoutingReadinessSnapshot: pack.upstreamReviewRoutingReadinessSnapshot,
    contract: pack.contract,
  };
};
