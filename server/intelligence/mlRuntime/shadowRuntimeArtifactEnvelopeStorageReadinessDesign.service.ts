import {
  buildShadowRuntimeArtifactMetadataCompatibilityMatrix,
  buildShadowRuntimeArtifactMetadataCompatibilityMatrixContract,
} from "./shadowRuntimeArtifactMetadataCompatibilityMatrix.service";
import {
  buildShadowRuntimeCandidateArtifactMetadataManifestFixtures,
} from "./shadowRuntimeCandidateArtifactMetadataIntakeReadinessPack.service";
import { getShadowRuntimeSafetyGate } from "./shadowRuntimeSafety";

const PHASE_LABEL = "Phase 5J — Offline Artifact Envelope Storage Readiness Design" as const;
const ENVELOPE_STORAGE_READINESS_DESIGN_KEY = "shadow_runtime_artifact_envelope_storage_readiness_design_v1" as const;

const nowIso = () => new Date().toISOString();

type EnvelopeStorageReadinessStatus = "ready_for_design_review" | "review_required" | "blocked";

type ArtifactEnvelopeStorageReadinessRecord = {
  envelopeKey: string;
  envelopeVersion: "v1";
  sourceManifestKey: string;
  metadataEnvelopeOnly: true;
  storageMode: "design_only_no_persistence";
  proposedEnvelopeTableName: "future_ml_candidate_artifact_metadata_envelopes_metadata_only";
  proposedEnvelopeFields: string[];
  manifestReferenceMode: "manifest_key_reference_only";
  artifactStorageMode: "no_artifact_storage";
  artifactFilePathStored: false;
  artifactBytesStored: false;
  artifactContentStored: false;
  artifactChecksumSnapshotOnly: true;
  artifactFileReadAllowed: false;
  artifactBytesReadAllowed: false;
  artifactParseAllowed: false;
  artifactImportAllowed: false;
  artifactPersistenceAllowed: false;
  envelopePersistenceAllowed: false;
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

type EnvelopeStorageReadinessRow = {
  envelopeKey: string;
  dimension:
    | "manifest_reference"
    | "metadata_envelope"
    | "artifact_storage"
    | "envelope_persistence"
    | "model_execution"
    | "approval_controls"
    | "business_mutation"
    | "safety_gate";
  status: EnvelopeStorageReadinessStatus;
  expected: string | boolean;
  actual: string | boolean | null;
  issue: string | null;
  evidence: string;
};

const PROPOSED_ENVELOPE_FIELDS = [
  "envelope_key",
  "envelope_version",
  "manifest_key",
  "manifest_version",
  "model_key",
  "model_version",
  "prediction_type",
  "entity_type",
  "declared_input_contract_key",
  "declared_output_contract_key",
  "declared_feature_snapshot_contract_key",
  "declared_training_dataset_key",
  "declared_artifact_format",
  "declared_checksum_algorithm",
  "declared_checksum_snapshot",
  "metadata_snapshot_json",
  "compatibility_snapshot_json",
  "safety_gate_snapshot_json",
  "status",
  "created_at",
] as const;

const REQUIRED_FALSE_ENVELOPE_FIELDS = [
  "artifactFilePathStored",
  "artifactBytesStored",
  "artifactContentStored",
  "artifactFileReadAllowed",
  "artifactBytesReadAllowed",
  "artifactParseAllowed",
  "artifactImportAllowed",
  "artifactPersistenceAllowed",
  "envelopePersistenceAllowed",
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

const FORBIDDEN_ENVELOPE_FIELDS = [
  "artifactBytes",
  "artifactContent",
  "artifactFilePath",
  "modelBinary",
  "runtimeEndpoint",
  "inferenceUrl",
  "approvalStatus",
  "activationStatus",
  "promotionStatus",
  "acceptedAt",
  "deployedAt",
  "executionCommand",
  "pricingDecision",
  "inventoryMutation",
  "accountingMutation",
  "ledgerMutation",
] as const;

const buildRow = (
  envelopeKey: string,
  dimension: EnvelopeStorageReadinessRow["dimension"],
  status: EnvelopeStorageReadinessStatus,
  expected: string | boolean,
  actual: string | boolean | null,
  issue: string | null,
  evidence: string,
): EnvelopeStorageReadinessRow => ({ envelopeKey, dimension, status, expected, actual, issue, evidence });

const readFlag = (record: Record<string, unknown>, field: string): boolean | null => (
  typeof record[field] === "boolean" ? Boolean(record[field]) : null
);

const buildSafetyGateRow = (envelopeKey: string): EnvelopeStorageReadinessRow => {
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
    envelopeKey,
    "safety_gate",
    compatible ? "ready_for_design_review" : "blocked",
    false,
    compatible ? false : true,
    compatible ? null : "Central safety gate exposes an enabled runtime, inference, production integration, decision automation, or business mutation capability.",
    "Envelope storage readiness design reads the central safety gate and requires every execution, inference, production, and business mutation flag to remain false.",
  );
};

const buildFalseFlagRow = (
  envelopeKey: string,
  dimension: EnvelopeStorageReadinessRow["dimension"],
  record: Record<string, unknown>,
  field: typeof REQUIRED_FALSE_ENVELOPE_FIELDS[number],
  evidence: string,
): EnvelopeStorageReadinessRow => {
  const actual = readFlag(record, field);
  const ready = actual === false;
  return buildRow(
    envelopeKey,
    dimension,
    ready ? "ready_for_design_review" : "blocked",
    false,
    actual,
    ready ? null : `${field} must remain false in the offline envelope storage readiness design.`,
    evidence,
  );
};

export const buildShadowRuntimeArtifactEnvelopeStorageReadinessDesignContract = () => ({
  envelopeStorageReadinessDesignKey: ENVELOPE_STORAGE_READINESS_DESIGN_KEY,
  envelopeStorageReadinessDesignVersion: "v1",
  phase: PHASE_LABEL,
  generatedAt: nowIso(),
  purpose: "Read-only offline readiness design for a future metadata envelope around candidate artifact manifests, without storing artifact files, artifact bytes, model binaries, approvals, activations, or production decisions.",
  upstreamContracts: {
    metadataCompatibilityMatrix: buildShadowRuntimeArtifactMetadataCompatibilityMatrixContract().compatibilityMatrixKey,
  },
  proposedFutureEnvelopeTableName: "future_ml_candidate_artifact_metadata_envelopes_metadata_only",
  proposedEnvelopeFields: [...PROPOSED_ENVELOPE_FIELDS],
  requiredFalseFields: [...REQUIRED_FALSE_ENVELOPE_FIELDS],
  forbiddenEnvelopeFields: [...FORBIDDEN_ENVELOPE_FIELDS],
  allowedBehavior: [
    "Describe a future metadata-only envelope shape in memory.",
    "Map existing metadata manifest fixtures to envelope readiness records without saving them.",
    "Compare envelope readiness against artifact access, model execution, approval, and business mutation blockers.",
    "Expose readiness evidence for Admin and Manager review.",
  ],
  forbiddenBehavior: [
    "Do not save metadata envelopes to a database in this phase.",
    "Do not store artifact files, paths, bytes, binaries, parsed artifact contents, or runtime commands.",
    "Do not read artifact files or bytes.",
    "Do not import, parse, or load model artifacts.",
    "Do not execute a model or call an external runtime.",
    "Do not expose an inference endpoint.",
    "Do not approve, activate, promote, accept, deploy, or resolve candidate artifacts.",
    "Do not mutate pricing, reports, ledger, inventory, accounting, sales, repairs, partners, customers, or any business record.",
  ],
  safetyGate: getShadowRuntimeSafetyGate(),
});

export const buildShadowRuntimeArtifactEnvelopeStorageReadinessRecords = (): ArtifactEnvelopeStorageReadinessRecord[] => (
  buildShadowRuntimeCandidateArtifactMetadataManifestFixtures().map((manifest) => ({
    envelopeKey: `metadata_envelope_design_${manifest.manifestKey}`,
    envelopeVersion: "v1",
    sourceManifestKey: manifest.manifestKey,
    metadataEnvelopeOnly: true,
    storageMode: "design_only_no_persistence",
    proposedEnvelopeTableName: "future_ml_candidate_artifact_metadata_envelopes_metadata_only",
    proposedEnvelopeFields: [...PROPOSED_ENVELOPE_FIELDS],
    manifestReferenceMode: "manifest_key_reference_only",
    artifactStorageMode: "no_artifact_storage",
    artifactFilePathStored: false,
    artifactBytesStored: false,
    artifactContentStored: false,
    artifactChecksumSnapshotOnly: true,
    artifactFileReadAllowed: false,
    artifactBytesReadAllowed: false,
    artifactParseAllowed: false,
    artifactImportAllowed: false,
    artifactPersistenceAllowed: false,
    envelopePersistenceAllowed: false,
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
      "Envelope is a design-only metadata wrapper around an existing manifest fixture.",
      "No envelope persistence or artifact storage is implemented in Phase 5J.",
      "No artifact file reading, artifact byte access, import, model execution, inference, approval, activation, promotion, artifact acceptance, or business mutation is enabled.",
    ],
  }))
);

export const buildShadowRuntimeArtifactEnvelopeStorageReadinessDesign = () => {
  const contract = buildShadowRuntimeArtifactEnvelopeStorageReadinessDesignContract();
  const compatibilityMatrix = buildShadowRuntimeArtifactMetadataCompatibilityMatrix();
  const envelopes = buildShadowRuntimeArtifactEnvelopeStorageReadinessRecords();
  const readinessRows = envelopes.flatMap((envelope) => {
    const record = envelope as unknown as Record<string, unknown>;
    return [
      buildRow(
        envelope.envelopeKey,
        "manifest_reference",
        envelope.sourceManifestKey ? "ready_for_design_review" : "review_required",
        "manifest_key_reference_only",
        envelope.sourceManifestKey || null,
        envelope.sourceManifestKey ? null : "Envelope design must reference a source manifest key only.",
        "Envelope design references candidate artifact metadata manifests by key only and does not store artifact paths, files, bytes, or model binaries.",
      ),
      buildRow(
        envelope.envelopeKey,
        "metadata_envelope",
        envelope.metadataEnvelopeOnly === true ? "ready_for_design_review" : "blocked",
        true,
        envelope.metadataEnvelopeOnly,
        envelope.metadataEnvelopeOnly === true ? null : "Envelope design must remain metadata-only.",
        "Envelope readiness design is limited to metadata snapshots and compatibility evidence.",
      ),
      buildFalseFlagRow(envelope.envelopeKey, "artifact_storage", record, "artifactFilePathStored", "Artifact file paths must not be stored in this phase."),
      buildFalseFlagRow(envelope.envelopeKey, "artifact_storage", record, "artifactBytesStored", "Artifact bytes must not be stored in this phase."),
      buildFalseFlagRow(envelope.envelopeKey, "artifact_storage", record, "artifactContentStored", "Parsed artifact contents must not be stored in this phase."),
      buildFalseFlagRow(envelope.envelopeKey, "envelope_persistence", record, "envelopePersistenceAllowed", "Envelope persistence is design-only and remains disabled."),
      buildFalseFlagRow(envelope.envelopeKey, "model_execution", record, "modelArtifactLoadAllowed", "Model artifact loading must remain disabled."),
      buildFalseFlagRow(envelope.envelopeKey, "model_execution", record, "modelExecutionAllowed", "Model execution must remain disabled."),
      buildFalseFlagRow(envelope.envelopeKey, "approval_controls", record, "approvalAllowed", "Approval controls must not be added."),
      buildFalseFlagRow(envelope.envelopeKey, "approval_controls", record, "activationAllowed", "Activation controls must not be added."),
      buildFalseFlagRow(envelope.envelopeKey, "approval_controls", record, "promotionAllowed", "Promotion controls must not be added."),
      buildFalseFlagRow(envelope.envelopeKey, "approval_controls", record, "artifactAcceptanceAllowed", "Artifact acceptance controls must not be added."),
      buildFalseFlagRow(envelope.envelopeKey, "business_mutation", record, "businessMutationAllowed", "Business mutation must remain disabled."),
      buildFalseFlagRow(envelope.envelopeKey, "business_mutation", record, "pricingMutationAllowed", "Pricing mutation must remain disabled."),
      buildFalseFlagRow(envelope.envelopeKey, "business_mutation", record, "reportMutationAllowed", "Report mutation must remain disabled."),
      buildFalseFlagRow(envelope.envelopeKey, "business_mutation", record, "ledgerMutationAllowed", "Ledger mutation must remain disabled."),
      buildSafetyGateRow(envelope.envelopeKey),
    ];
  });

  return {
    generatedAt: nowIso(),
    phase: PHASE_LABEL,
    envelopeStorageReadinessDesignKey: ENVELOPE_STORAGE_READINESS_DESIGN_KEY,
    contract,
    compatibilityMatrixSnapshot: {
      compatibilityMatrixKey: compatibilityMatrix.contract.compatibilityMatrixKey,
      manifestCount: compatibilityMatrix.manifests.length,
      matrixRowCount: compatibilityMatrix.matrixRows.length,
      compatibilityIssueCount: compatibilityMatrix.matrixRows.filter((row) => row.issue).length,
    },
    envelopes,
    readinessRows,
  };
};

export const getShadowRuntimeArtifactEnvelopeStorageReadinessDesignSummary = () => {
  const design = buildShadowRuntimeArtifactEnvelopeStorageReadinessDesign();
  const safetyGate = getShadowRuntimeSafetyGate();
  const issueCount = design.readinessRows.filter((row) => row.issue).length;
  const blockedCount = design.readinessRows.filter((row) => row.status === "blocked").length;
  const reviewRequiredCount = design.readinessRows.filter((row) => row.status === "review_required").length;
  const readyCount = design.readinessRows.filter((row) => row.status === "ready_for_design_review").length;

  return {
    generatedAt: nowIso(),
    currentStatus: PHASE_LABEL,
    artifactEnvelopeStorageReadinessDesignLabel: "Offline Artifact Envelope Storage Readiness Design",
    artifactEnvelopeStorageReadinessDesignStatus: "Offline / Read-only / Design evidence only",
    artifactFileAccess: "Blocked",
    artifactStorage: "Blocked",
    envelopePersistence: "Not implemented",
    modelExecution: "Off",
    productionInference: "Not exposed",
    businessMutation: "Blocked",
    latestSafetyStatus: safetyGate,
    currentShadowRuntimeArtifactEnvelopeStorageReadinessDesign: {
      status: "offline_envelope_storage_readiness_design_only",
      readinessScorePct: blockedCount === 0 ? 100 : 80,
      envelopeDesignCount: design.envelopes.length,
      readinessRowCount: design.readinessRows.length,
      readyRowCount: readyCount,
      reviewRequiredRowCount: reviewRequiredCount,
      blockedRowCount: blockedCount,
      readinessIssueCount: issueCount,
      proposedEnvelopeFieldCount: design.contract.proposedEnvelopeFields.length,
      forbiddenEnvelopeFieldCount: design.contract.forbiddenEnvelopeFields.length,
      metadataEnvelopeOnly: true,
      artifactFilePathStored: false,
      artifactBytesStored: false,
      artifactContentStored: false,
      artifactFileReadAllowed: false,
      artifactBytesReadAllowed: false,
      artifactParseAllowed: false,
      artifactImportAllowed: false,
      artifactPersistenceAllowed: false,
      envelopePersistenceAllowed: false,
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
      explanation: "Offline envelope storage readiness design describes a future metadata-only envelope shape in memory; it does not save envelopes, store artifacts, read files, load models, run inference, approve, activate, promote, accept artifacts, or mutate business data.",
      warnings: [
        "Envelope storage readiness is design evidence only and no persistence is implemented.",
        "No artifact file path, bytes, binary, parsed content, or runtime command is stored.",
        "No artifact file reading, import, model execution, production inference endpoint, approval, activation, promotion, artifact acceptance, or business mutation is enabled.",
      ],
      blockers: [],
      recommendedNextAction: "Review metadata-only envelope fields before any future persistence design is considered.",
    },
    contract: design.contract,
    compatibilityMatrixSnapshot: design.compatibilityMatrixSnapshot,
    envelopes: design.envelopes,
    readinessRows: design.readinessRows,
  };
};

export const getShadowRuntimeArtifactEnvelopeStorageReadinessEnvelopeDetail = (envelopeKey: string) => {
  const design = buildShadowRuntimeArtifactEnvelopeStorageReadinessDesign();
  const envelope = design.envelopes.find((entry) => entry.envelopeKey === envelopeKey);
  if (!envelope) return null;
  return {
    generatedAt: nowIso(),
    envelope,
    readinessRows: design.readinessRows.filter((row) => row.envelopeKey === envelopeKey),
    contract: design.contract,
    compatibilityMatrixSnapshot: design.compatibilityMatrixSnapshot,
  };
};
