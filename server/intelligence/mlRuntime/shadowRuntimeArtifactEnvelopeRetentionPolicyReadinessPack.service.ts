import {
  buildShadowRuntimeArtifactEnvelopeStorageReadinessDesign,
  buildShadowRuntimeArtifactEnvelopeStorageReadinessDesignContract,
} from "./shadowRuntimeArtifactEnvelopeStorageReadinessDesign.service";
import { getShadowRuntimeSafetyGate } from "./shadowRuntimeSafety";

const PHASE_LABEL = "Phase 5K — Offline Envelope Retention Policy Readiness Pack" as const;
const ENVELOPE_RETENTION_POLICY_READINESS_PACK_KEY = "shadow_runtime_artifact_envelope_retention_policy_readiness_pack_v1" as const;

const nowIso = () => new Date().toISOString();

type RetentionPolicyReadinessStatus = "ready_for_policy_review" | "review_required" | "blocked";

type RetentionPolicyDimension =
  | "source_envelope"
  | "retention_policy"
  | "expiry_policy"
  | "archive_eligibility"
  | "purge_prohibition"
  | "persistence"
  | "artifact_access"
  | "approval_controls"
  | "business_mutation"
  | "safety_gate";

type ArtifactEnvelopeRetentionPolicyRecord = {
  policyKey: string;
  policyVersion: "v1";
  sourceEnvelopeKey: string;
  sourceManifestKey: string;
  metadataEnvelopeOnly: true;
  policyMode: "readiness_only_no_enforcement";
  retentionScope: "metadata_envelope_evidence_only";
  proposedRetentionDays: number;
  expiryRuleMode: "metadata_expiry_label_only";
  archiveEligibilityMode: "evidence_only_no_archive_action";
  purgeProhibitionMode: "purge_prohibited_no_delete_action";
  retentionPolicyPersistenceAllowed: false;
  retentionEnforcementAllowed: false;
  expiryEnforcementAllowed: false;
  archiveActionAllowed: false;
  purgeAllowed: false;
  autoPurgeAllowed: false;
  deleteAllowed: false;
  legalHoldBypassAllowed: false;
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

type RetentionPolicyReadinessRow = {
  policyKey: string;
  dimension: RetentionPolicyDimension;
  status: RetentionPolicyReadinessStatus;
  expected: string | boolean | number;
  actual: string | boolean | number | null;
  issue: string | null;
  evidence: string;
};

const REQUIRED_FALSE_RETENTION_FIELDS = [
  "retentionPolicyPersistenceAllowed",
  "retentionEnforcementAllowed",
  "expiryEnforcementAllowed",
  "archiveActionAllowed",
  "purgeAllowed",
  "autoPurgeAllowed",
  "deleteAllowed",
  "legalHoldBypassAllowed",
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

const FORBIDDEN_RETENTION_FIELDS = [
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
  "archiveJobId",
  "purgeJobId",
  "deleteCommand",
  "retentionWorkerCommand",
  "pricingDecision",
  "inventoryMutation",
  "accountingMutation",
  "ledgerMutation",
] as const;

const buildRow = (
  policyKey: string,
  dimension: RetentionPolicyDimension,
  status: RetentionPolicyReadinessStatus,
  expected: string | boolean | number,
  actual: string | boolean | number | null,
  issue: string | null,
  evidence: string,
): RetentionPolicyReadinessRow => ({ policyKey, dimension, status, expected, actual, issue, evidence });

const readFlag = (record: Record<string, unknown>, field: string): boolean | null => (
  typeof record[field] === "boolean" ? Boolean(record[field]) : null
);

const buildFalseFlagRow = (
  policyKey: string,
  dimension: RetentionPolicyDimension,
  record: Record<string, unknown>,
  field: typeof REQUIRED_FALSE_RETENTION_FIELDS[number],
  evidence: string,
): RetentionPolicyReadinessRow => {
  const actual = readFlag(record, field);
  const ready = actual === false;
  return buildRow(
    policyKey,
    dimension,
    ready ? "ready_for_policy_review" : "blocked",
    false,
    actual,
    ready ? null : `${field} must remain false in the offline envelope retention policy readiness pack.`,
    evidence,
  );
};

const buildSafetyGateRow = (policyKey: string): RetentionPolicyReadinessRow => {
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
    policyKey,
    "safety_gate",
    compatible ? "ready_for_policy_review" : "blocked",
    false,
    compatible ? false : true,
    compatible ? null : "Central safety gate exposes an enabled runtime, inference, production integration, decision automation, or business mutation capability.",
    "Retention policy readiness reads the central safety gate and requires every execution, inference, production, and business mutation flag to remain false.",
  );
};

export const buildShadowRuntimeArtifactEnvelopeRetentionPolicyReadinessPackContract = () => ({
  envelopeRetentionPolicyReadinessPackKey: ENVELOPE_RETENTION_POLICY_READINESS_PACK_KEY,
  envelopeRetentionPolicyReadinessPackVersion: "v1",
  phase: PHASE_LABEL,
  generatedAt: nowIso(),
  purpose: "Read-only offline readiness design for future metadata-envelope retention, expiry, archive eligibility, and purge prohibition evidence without enforcing retention, archiving, deleting, saving policies, reading artifacts, running inference, or mutating business data.",
  upstreamContracts: {
    envelopeStorageReadinessDesign: buildShadowRuntimeArtifactEnvelopeStorageReadinessDesignContract().envelopeStorageReadinessDesignKey,
  },
  proposedPolicyShape: {
    retentionScope: "metadata_envelope_evidence_only",
    proposedRetentionDays: 365,
    expiryRuleMode: "metadata_expiry_label_only",
    archiveEligibilityMode: "evidence_only_no_archive_action",
    purgeProhibitionMode: "purge_prohibited_no_delete_action",
  },
  requiredFalseFields: [...REQUIRED_FALSE_RETENTION_FIELDS],
  forbiddenRetentionFields: [...FORBIDDEN_RETENTION_FIELDS],
  allowedBehavior: [
    "Describe retention, expiry, archive eligibility, and purge prohibition policy readiness in memory only.",
    "Map existing envelope storage readiness records to retention readiness policy records without saving them.",
    "Expose metadata-envelope retention evidence for Admin and Manager review.",
  ],
  forbiddenBehavior: [
    "Do not save retention policies or metadata envelopes in this phase.",
    "Do not enforce retention, expiry, archive, purge, or deletion behavior.",
    "Do not store artifact files, paths, bytes, binaries, parsed artifact contents, or runtime commands.",
    "Do not read artifact files or bytes.",
    "Do not import, parse, or load model artifacts.",
    "Do not execute a model or call an external runtime.",
    "Do not expose an inference endpoint.",
    "Do not approve, activate, promote, accept, deploy, archive, purge, delete, or resolve candidate artifacts.",
    "Do not mutate pricing, reports, ledger, inventory, accounting, sales, repairs, partners, customers, or any business record.",
  ],
  safetyGate: getShadowRuntimeSafetyGate(),
});

export const buildShadowRuntimeArtifactEnvelopeRetentionPolicyRecords = (): ArtifactEnvelopeRetentionPolicyRecord[] => {
  const storageDesign = buildShadowRuntimeArtifactEnvelopeStorageReadinessDesign();
  return storageDesign.envelopes.map((envelope) => ({
    policyKey: `retention_policy_readiness_${envelope.envelopeKey}`,
    policyVersion: "v1",
    sourceEnvelopeKey: envelope.envelopeKey,
    sourceManifestKey: envelope.sourceManifestKey,
    metadataEnvelopeOnly: true,
    policyMode: "readiness_only_no_enforcement",
    retentionScope: "metadata_envelope_evidence_only",
    proposedRetentionDays: 365,
    expiryRuleMode: "metadata_expiry_label_only",
    archiveEligibilityMode: "evidence_only_no_archive_action",
    purgeProhibitionMode: "purge_prohibited_no_delete_action",
    retentionPolicyPersistenceAllowed: false,
    retentionEnforcementAllowed: false,
    expiryEnforcementAllowed: false,
    archiveActionAllowed: false,
    purgeAllowed: false,
    autoPurgeAllowed: false,
    deleteAllowed: false,
    legalHoldBypassAllowed: false,
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
      "Retention policy readiness is generated from metadata-envelope design evidence only.",
      "Expiry and archive eligibility are labels for future design review; no enforcement, archive action, purge action, or deletion is enabled.",
      "No artifact file reading, artifact byte access, import, model execution, inference, approval, activation, promotion, artifact acceptance, or business mutation is enabled.",
    ],
  }));
};

export const buildShadowRuntimeArtifactEnvelopeRetentionPolicyReadinessPack = () => {
  const contract = buildShadowRuntimeArtifactEnvelopeRetentionPolicyReadinessPackContract();
  const storageDesign = buildShadowRuntimeArtifactEnvelopeStorageReadinessDesign();
  const policies = buildShadowRuntimeArtifactEnvelopeRetentionPolicyRecords();
  const readinessRows = policies.flatMap((policy) => {
    const record = policy as unknown as Record<string, unknown>;
    return [
      buildRow(
        policy.policyKey,
        "source_envelope",
        policy.sourceEnvelopeKey ? "ready_for_policy_review" : "review_required",
        "metadata envelope reference",
        policy.sourceEnvelopeKey || null,
        policy.sourceEnvelopeKey ? null : "Retention policy readiness must reference a metadata envelope design record.",
        "Retention readiness references metadata-envelope design evidence by key only and does not store artifact paths, files, bytes, or model binaries.",
      ),
      buildRow(
        policy.policyKey,
        "retention_policy",
        policy.policyMode === "readiness_only_no_enforcement" ? "ready_for_policy_review" : "blocked",
        "readiness_only_no_enforcement",
        policy.policyMode,
        policy.policyMode === "readiness_only_no_enforcement" ? null : "Retention policy must remain readiness-only with no enforcement.",
        "Retention policy readiness describes policy shape only and does not enforce retention.",
      ),
      buildRow(
        policy.policyKey,
        "expiry_policy",
        policy.expiryRuleMode === "metadata_expiry_label_only" ? "ready_for_policy_review" : "blocked",
        "metadata_expiry_label_only",
        policy.expiryRuleMode,
        policy.expiryRuleMode === "metadata_expiry_label_only" ? null : "Expiry policy must remain label-only.",
        "Expiry readiness marks future review labels only and does not expire or remove records.",
      ),
      buildRow(
        policy.policyKey,
        "archive_eligibility",
        policy.archiveEligibilityMode === "evidence_only_no_archive_action" ? "ready_for_policy_review" : "blocked",
        "evidence_only_no_archive_action",
        policy.archiveEligibilityMode,
        policy.archiveEligibilityMode === "evidence_only_no_archive_action" ? null : "Archive eligibility must not perform archive actions.",
        "Archive eligibility is evidence-only and no archive action is enabled.",
      ),
      buildRow(
        policy.policyKey,
        "purge_prohibition",
        policy.purgeProhibitionMode === "purge_prohibited_no_delete_action" ? "ready_for_policy_review" : "blocked",
        "purge_prohibited_no_delete_action",
        policy.purgeProhibitionMode,
        policy.purgeProhibitionMode === "purge_prohibited_no_delete_action" ? null : "Purge prohibition must remain explicit and must not allow deletion.",
        "Purge is explicitly prohibited; no purge action or deletion is enabled.",
      ),
      buildFalseFlagRow(policy.policyKey, "persistence", record, "retentionPolicyPersistenceAllowed", "Retention policy persistence is not implemented in this phase."),
      buildFalseFlagRow(policy.policyKey, "persistence", record, "retentionEnforcementAllowed", "Retention enforcement must remain disabled."),
      buildFalseFlagRow(policy.policyKey, "expiry_policy", record, "expiryEnforcementAllowed", "Expiry enforcement must remain disabled."),
      buildFalseFlagRow(policy.policyKey, "archive_eligibility", record, "archiveActionAllowed", "Archive actions must remain disabled."),
      buildFalseFlagRow(policy.policyKey, "purge_prohibition", record, "purgeAllowed", "Purge must remain disabled."),
      buildFalseFlagRow(policy.policyKey, "purge_prohibition", record, "autoPurgeAllowed", "Automatic purge must remain disabled."),
      buildFalseFlagRow(policy.policyKey, "purge_prohibition", record, "deleteAllowed", "Deletion must remain disabled."),
      buildFalseFlagRow(policy.policyKey, "purge_prohibition", record, "legalHoldBypassAllowed", "Legal-hold bypass must remain disabled."),
      buildFalseFlagRow(policy.policyKey, "persistence", record, "envelopePersistenceAllowed", "Envelope persistence must remain disabled."),
      buildFalseFlagRow(policy.policyKey, "artifact_access", record, "artifactStorageAllowed", "Artifact storage must remain disabled."),
      buildFalseFlagRow(policy.policyKey, "artifact_access", record, "artifactFileReadAllowed", "Artifact file reading must remain disabled."),
      buildFalseFlagRow(policy.policyKey, "artifact_access", record, "artifactBytesReadAllowed", "Artifact byte access must remain disabled."),
      buildFalseFlagRow(policy.policyKey, "artifact_access", record, "artifactImportAllowed", "Artifact import must remain disabled."),
      buildFalseFlagRow(policy.policyKey, "approval_controls", record, "approvalAllowed", "Approval controls must not be added."),
      buildFalseFlagRow(policy.policyKey, "approval_controls", record, "activationAllowed", "Activation controls must not be added."),
      buildFalseFlagRow(policy.policyKey, "approval_controls", record, "promotionAllowed", "Promotion controls must not be added."),
      buildFalseFlagRow(policy.policyKey, "approval_controls", record, "artifactAcceptanceAllowed", "Artifact acceptance controls must not be added."),
      buildFalseFlagRow(policy.policyKey, "business_mutation", record, "businessMutationAllowed", "Business mutation must remain disabled."),
      buildFalseFlagRow(policy.policyKey, "business_mutation", record, "pricingMutationAllowed", "Pricing mutation must remain disabled."),
      buildFalseFlagRow(policy.policyKey, "business_mutation", record, "reportMutationAllowed", "Report mutation must remain disabled."),
      buildFalseFlagRow(policy.policyKey, "business_mutation", record, "ledgerMutationAllowed", "Ledger mutation must remain disabled."),
      buildFalseFlagRow(policy.policyKey, "business_mutation", record, "inventoryMutationAllowed", "Inventory mutation must remain disabled."),
      buildFalseFlagRow(policy.policyKey, "business_mutation", record, "accountingMutationAllowed", "Accounting mutation must remain disabled."),
      buildSafetyGateRow(policy.policyKey),
    ];
  });

  return {
    generatedAt: nowIso(),
    phase: PHASE_LABEL,
    envelopeRetentionPolicyReadinessPackKey: ENVELOPE_RETENTION_POLICY_READINESS_PACK_KEY,
    contract,
    upstreamEnvelopeStorageReadinessSnapshot: {
      envelopeStorageReadinessDesignKey: storageDesign.envelopeStorageReadinessDesignKey,
      envelopeDesignCount: storageDesign.envelopes.length,
      readinessRowCount: storageDesign.readinessRows.length,
      readinessIssueCount: storageDesign.readinessRows.filter((row) => row.issue).length,
    },
    policies,
    readinessRows,
  };
};

export const getShadowRuntimeArtifactEnvelopeRetentionPolicyReadinessPackSummary = () => {
  const pack = buildShadowRuntimeArtifactEnvelopeRetentionPolicyReadinessPack();
  const safetyGate = getShadowRuntimeSafetyGate();
  const issueCount = pack.readinessRows.filter((row) => row.issue).length;
  const blockedCount = pack.readinessRows.filter((row) => row.status === "blocked").length;
  const reviewRequiredCount = pack.readinessRows.filter((row) => row.status === "review_required").length;
  const readyCount = pack.readinessRows.filter((row) => row.status === "ready_for_policy_review").length;

  return {
    generatedAt: nowIso(),
    currentStatus: PHASE_LABEL,
    artifactEnvelopeRetentionPolicyReadinessPackLabel: "Offline Envelope Retention Policy Readiness Pack",
    artifactEnvelopeRetentionPolicyReadinessPackStatus: "Offline / Read-only / Policy evidence only",
    retentionPolicyPersistence: "Not implemented",
    retentionEnforcement: "Blocked",
    expiryEnforcement: "Blocked",
    archiveAction: "Blocked",
    purgeAction: "Prohibited",
    artifactFileAccess: "Blocked",
    modelExecution: "Off",
    productionInference: "Not exposed",
    businessMutation: "Blocked",
    latestSafetyStatus: safetyGate,
    currentShadowRuntimeArtifactEnvelopeRetentionPolicyReadinessPack: {
      status: "offline_retention_policy_readiness_only",
      readinessScorePct: blockedCount === 0 ? 100 : 80,
      retentionPolicyCount: pack.policies.length,
      readinessRowCount: pack.readinessRows.length,
      readyRowCount: readyCount,
      reviewRequiredRowCount: reviewRequiredCount,
      blockedRowCount: blockedCount,
      retentionIssueCount: issueCount,
      proposedRetentionDays: 365,
      metadataEnvelopeOnly: true,
      retentionPolicyPersistenceAllowed: false,
      retentionEnforcementAllowed: false,
      expiryEnforcementAllowed: false,
      archiveActionAllowed: false,
      purgeAllowed: false,
      autoPurgeAllowed: false,
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
      explanation: "Offline envelope retention policy readiness describes future metadata-envelope retention, expiry, archive eligibility, and purge prohibition evidence in memory only; it does not save policies, enforce retention, archive, purge, delete, read artifacts, load models, run inference, approve, activate, promote, accept artifacts, or mutate business data.",
      warnings: [
        "Retention policy readiness is evidence only and no persistence or enforcement is implemented.",
        "Archive eligibility and expiry are labels only; no archive, purge, deletion, or lifecycle worker is enabled.",
        "No artifact file reading, import, model execution, production inference endpoint, approval, activation, promotion, artifact acceptance, or business mutation is enabled.",
      ],
      blockers: [],
      recommendedNextAction: "Review retention and purge-prohibition policy shape before any future metadata-only persistence design is considered.",
    },
    contract: pack.contract,
    upstreamEnvelopeStorageReadinessSnapshot: pack.upstreamEnvelopeStorageReadinessSnapshot,
    policies: pack.policies,
    readinessRows: pack.readinessRows,
  };
};

export const getShadowRuntimeArtifactEnvelopeRetentionPolicyDetail = (policyKey: string) => {
  const pack = buildShadowRuntimeArtifactEnvelopeRetentionPolicyReadinessPack();
  const policy = pack.policies.find((entry) => entry.policyKey === policyKey);
  if (!policy) return null;
  return {
    generatedAt: nowIso(),
    policy,
    readinessRows: pack.readinessRows.filter((row) => row.policyKey === policyKey),
    contract: pack.contract,
    upstreamEnvelopeStorageReadinessSnapshot: pack.upstreamEnvelopeStorageReadinessSnapshot,
  };
};
