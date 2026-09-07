import {
  buildShadowRuntimeCandidateContractDriftReviewPackContract,
} from "./shadowRuntimeCandidateContractDriftReviewPack.service";
import {
  buildShadowRuntimeCandidateOutputFixturePackContract,
} from "./shadowRuntimeCandidateOutputFixturePack.service";
import { getShadowRuntimeSafetyGate } from "./shadowRuntimeSafety";

const PHASE_LABEL = "Phase 5H — Offline Candidate Artifact Metadata Intake Readiness Pack" as const;
const INTAKE_PACK_KEY = "shadow_runtime_candidate_artifact_metadata_intake_readiness_pack_v1" as const;

type MetadataIssueSeverity = "info" | "warning" | "critical";
type MetadataManifestStatus = "valid" | "review_required" | "invalid";

type CandidateArtifactMetadataManifest = {
  manifestKey: string;
  manifestVersion: "v1";
  metadataOnly: true;
  artifactReferenceMode: "declared_only_no_file_access";
  modelKey: string;
  modelVersion: string;
  modelFamily: string;
  predictionType: string;
  entityType: string;
  declaredInputContractKey: string;
  declaredOutputContractKey: string;
  declaredFeatureSnapshotContractKey: string;
  declaredTrainingDatasetKey: string;
  declaredArtifactFormat: "json_manifest" | "onnx_manifest" | "binary_manifest" | "unknown_manifest";
  declaredChecksum: string | null;
  declaredChecksumAlgorithm: "sha256" | "sha512" | "none";
  declaredCreatedAt: string;
  declaredBy: string;
  artifactFileReadAllowed: false;
  artifactBytesReadAllowed: false;
  artifactParseAllowed: false;
  artifactImportAllowed: false;
  modelExecutionAttempted: false;
  modelExecutionAllowed: false;
  inferenceEndpointExposed: false;
  productionIntegrationAllowed: false;
  decisionAutomationAllowed: false;
  approvalAllowed: false;
  activationAllowed: false;
  promotionAllowed: false;
  businessMutationAllowed: false;
  pricingMutationAllowed: false;
  reportMutationAllowed: false;
  ledgerMutationAllowed: false;
  generatedAt: string;
  notes: string[];
};

type CandidateArtifactMetadataValidationIssue = {
  field: string;
  severity: MetadataIssueSeverity;
  message: string;
};

const REQUIRED_METADATA_FIELDS = [
  "manifestKey",
  "manifestVersion",
  "metadataOnly",
  "artifactReferenceMode",
  "modelKey",
  "modelVersion",
  "modelFamily",
  "predictionType",
  "entityType",
  "declaredInputContractKey",
  "declaredOutputContractKey",
  "declaredFeatureSnapshotContractKey",
  "declaredTrainingDatasetKey",
  "declaredArtifactFormat",
  "declaredChecksumAlgorithm",
  "declaredCreatedAt",
  "declaredBy",
  "artifactFileReadAllowed",
  "artifactBytesReadAllowed",
  "artifactParseAllowed",
  "artifactImportAllowed",
  "modelExecutionAttempted",
  "modelExecutionAllowed",
  "inferenceEndpointExposed",
  "productionIntegrationAllowed",
  "decisionAutomationAllowed",
  "approvalAllowed",
  "activationAllowed",
  "promotionAllowed",
  "businessMutationAllowed",
  "pricingMutationAllowed",
  "reportMutationAllowed",
  "ledgerMutationAllowed",
  "generatedAt",
] as const;

const REQUIRED_FALSE_FIELDS = [
  "artifactFileReadAllowed",
  "artifactBytesReadAllowed",
  "artifactParseAllowed",
  "artifactImportAllowed",
  "modelExecutionAttempted",
  "modelExecutionAllowed",
  "inferenceEndpointExposed",
  "productionIntegrationAllowed",
  "decisionAutomationAllowed",
  "approvalAllowed",
  "activationAllowed",
  "promotionAllowed",
  "businessMutationAllowed",
  "pricingMutationAllowed",
  "reportMutationAllowed",
  "ledgerMutationAllowed",
] as const;

const FORBIDDEN_METADATA_FIELDS = [
  "artifactBytes",
  "artifactContent",
  "modelBinary",
  "runtimeEndpoint",
  "inferenceUrl",
  "approvalStatus",
  "activationStatus",
  "promotionStatus",
  "productionDeployment",
  "executionCommand",
  "pricingDecision",
  "inventoryMutation",
  "accountingMutation",
  "ledgerMutation",
] as const;

const nowIso = () => new Date().toISOString();

export const buildShadowRuntimeCandidateArtifactMetadataIntakeReadinessPackContract = () => ({
  intakeReadinessPackKey: INTAKE_PACK_KEY,
  intakeReadinessPackVersion: "v1",
  phase: PHASE_LABEL,
  generatedAt: nowIso(),
  purpose: "Read-only offline readiness pack for validating candidate artifact metadata manifests before any future artifact file access or inference design is considered.",
  allowedBehavior: [
    "Validate candidate artifact metadata manifest shape in memory.",
    "Report missing metadata fields, forbidden operational fields, and safety flag violations.",
    "Expose metadata-intake readiness evidence for Admin and Manager review.",
  ],
  forbiddenBehavior: [
    "Do not read artifact files or bytes.",
    "Do not parse or import model artifacts.",
    "Do not execute a real model.",
    "Do not call external runtimes or APIs.",
    "Do not expose an inference endpoint.",
    "Do not approve, activate, promote, deploy, or run a model candidate.",
    "Do not write metadata intake decisions to the database.",
    "Do not mutate pricing, reports, ledger, inventory, accounting, sales, repairs, partners, or customers.",
  ],
  requiredMetadataFields: [...REQUIRED_METADATA_FIELDS],
  requiredFalseFields: [...REQUIRED_FALSE_FIELDS],
  forbiddenMetadataFields: [...FORBIDDEN_METADATA_FIELDS],
  upstreamContracts: {
    outputFixtureContract: buildShadowRuntimeCandidateOutputFixturePackContract().fixturePackKey,
    contractDriftReviewPack: buildShadowRuntimeCandidateContractDriftReviewPackContract().driftReviewPackKey,
  },
  safetyGate: getShadowRuntimeSafetyGate(),
});

export const buildShadowRuntimeCandidateArtifactMetadataManifestFixtures = (): CandidateArtifactMetadataManifest[] => [
  {
    manifestKey: "candidate_artifact_metadata_inventory_stockout_v1",
    manifestVersion: "v1",
    metadataOnly: true,
    artifactReferenceMode: "declared_only_no_file_access",
    modelKey: "inventory_stockout_candidate",
    modelVersion: "offline-metadata-v1",
    modelFamily: "external_candidate_declared_only",
    predictionType: "inventory_stockout",
    entityType: "product",
    declaredInputContractKey: "predictive_feature_snapshot_v1",
    declaredOutputContractKey: "shadow_runtime_candidate_output_contract_fixture_pack_v1",
    declaredFeatureSnapshotContractKey: "predictive_feature_snapshot_contract_v1",
    declaredTrainingDatasetKey: "inventory_stockout_baseline_v1",
    declaredArtifactFormat: "json_manifest",
    declaredChecksum: "metadata-only-fixture-no-file-hash",
    declaredChecksumAlgorithm: "none",
    declaredCreatedAt: nowIso(),
    declaredBy: "offline_governance_fixture",
    artifactFileReadAllowed: false,
    artifactBytesReadAllowed: false,
    artifactParseAllowed: false,
    artifactImportAllowed: false,
    modelExecutionAttempted: false,
    modelExecutionAllowed: false,
    inferenceEndpointExposed: false,
    productionIntegrationAllowed: false,
    decisionAutomationAllowed: false,
    approvalAllowed: false,
    activationAllowed: false,
    promotionAllowed: false,
    businessMutationAllowed: false,
    pricingMutationAllowed: false,
    reportMutationAllowed: false,
    ledgerMutationAllowed: false,
    generatedAt: nowIso(),
    notes: [
      "This fixture represents metadata shape only.",
      "No artifact file or bytes are read in Phase 5H.",
      "No inference, approval, activation, promotion, or business mutation is enabled.",
    ],
  },
  {
    manifestKey: "candidate_artifact_metadata_revenue_signal_v1",
    manifestVersion: "v1",
    metadataOnly: true,
    artifactReferenceMode: "declared_only_no_file_access",
    modelKey: "revenue_signal_candidate",
    modelVersion: "offline-metadata-v1",
    modelFamily: "external_candidate_declared_only",
    predictionType: "revenue_signal",
    entityType: "product_group",
    declaredInputContractKey: "predictive_feature_snapshot_v1",
    declaredOutputContractKey: "shadow_runtime_candidate_output_contract_fixture_pack_v1",
    declaredFeatureSnapshotContractKey: "predictive_feature_snapshot_contract_v1",
    declaredTrainingDatasetKey: "sales_revenue_baseline_v1",
    declaredArtifactFormat: "unknown_manifest",
    declaredChecksum: null,
    declaredChecksumAlgorithm: "none",
    declaredCreatedAt: nowIso(),
    declaredBy: "offline_governance_fixture",
    artifactFileReadAllowed: false,
    artifactBytesReadAllowed: false,
    artifactParseAllowed: false,
    artifactImportAllowed: false,
    modelExecutionAttempted: false,
    modelExecutionAllowed: false,
    inferenceEndpointExposed: false,
    productionIntegrationAllowed: false,
    decisionAutomationAllowed: false,
    approvalAllowed: false,
    activationAllowed: false,
    promotionAllowed: false,
    businessMutationAllowed: false,
    pricingMutationAllowed: false,
    reportMutationAllowed: false,
    ledgerMutationAllowed: false,
    generatedAt: nowIso(),
    notes: [
      "Checksum is intentionally absent because no artifact file is accepted in this phase.",
      "Manifest is used only to test readiness of metadata validation rules.",
    ],
  },
];

const isPlainRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);

const readText = (record: Record<string, unknown>, field: string) => typeof record[field] === "string" ? String(record[field]).trim() : "";

export const validateShadowRuntimeCandidateArtifactMetadataManifest = (manifest: unknown) => {
  const issues: CandidateArtifactMetadataValidationIssue[] = [];
  const record = isPlainRecord(manifest) ? manifest : {};

  if (!isPlainRecord(manifest)) {
    issues.push({ field: "manifest", severity: "critical", message: "Metadata manifest must be a plain object." });
  }

  REQUIRED_METADATA_FIELDS.forEach((field) => {
    if (!Object.prototype.hasOwnProperty.call(record, field)) {
      issues.push({ field, severity: "critical", message: "Required metadata field is missing." });
    }
  });

  ["manifestKey", "modelKey", "modelVersion", "predictionType", "entityType", "declaredOutputContractKey"].forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(record, field) && !readText(record, field)) {
      issues.push({ field, severity: "critical", message: "Required text metadata field must be a non-empty string." });
    }
  });

  REQUIRED_FALSE_FIELDS.forEach((field) => {
    if (record[field] !== false) {
      issues.push({ field, severity: "critical", message: "Safety-critical metadata flag must remain false." });
    }
  });

  FORBIDDEN_METADATA_FIELDS.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(record, field)) {
      issues.push({ field, severity: "critical", message: "Forbidden operational field is not allowed in an offline metadata intake manifest." });
    }
  });

  if (record.metadataOnly !== true) {
    issues.push({ field: "metadataOnly", severity: "critical", message: "Metadata intake must be marked metadataOnly=true." });
  }

  if (record.artifactReferenceMode !== "declared_only_no_file_access") {
    issues.push({ field: "artifactReferenceMode", severity: "critical", message: "Artifact reference mode must prevent file access in Phase 5H." });
  }

  if (record.declaredChecksumAlgorithm === "sha256" || record.declaredChecksumAlgorithm === "sha512") {
    if (!readText(record, "declaredChecksum")) {
      issues.push({ field: "declaredChecksum", severity: "warning", message: "Declared checksum algorithm is set, but checksum text is empty." });
    }
  }

  const criticalCount = issues.filter((issue) => issue.severity === "critical").length;
  const warningCount = issues.filter((issue) => issue.severity === "warning").length;
  const status: MetadataManifestStatus = criticalCount > 0 ? "invalid" : warningCount > 0 ? "review_required" : "valid";

  return {
    generatedAt: nowIso(),
    status,
    valid: status === "valid",
    issueCount: issues.length,
    criticalIssueCount: criticalCount,
    warningIssueCount: warningCount,
    issues,
    checkedRequiredFieldCount: REQUIRED_METADATA_FIELDS.length,
    checkedRequiredFalseFieldCount: REQUIRED_FALSE_FIELDS.length,
    checkedForbiddenFieldCount: FORBIDDEN_METADATA_FIELDS.length,
    artifactFileReadAllowed: false,
    artifactBytesReadAllowed: false,
    artifactImportAllowed: false,
    modelExecutionAllowed: false,
    inferenceEndpointExposed: false,
    canMutateBusinessRecords: false,
  };
};

export const buildShadowRuntimeCandidateArtifactMetadataIntakeReadinessPack = () => {
  const contract = buildShadowRuntimeCandidateArtifactMetadataIntakeReadinessPackContract();
  const manifests = buildShadowRuntimeCandidateArtifactMetadataManifestFixtures();
  const manifestValidations = manifests.map((manifest) => ({
    manifestKey: manifest.manifestKey,
    validation: validateShadowRuntimeCandidateArtifactMetadataManifest(manifest),
  }));

  return {
    generatedAt: nowIso(),
    phase: PHASE_LABEL,
    intakeReadinessPackKey: INTAKE_PACK_KEY,
    contract,
    manifests,
    manifestValidations,
  };
};

export const getShadowRuntimeCandidateArtifactMetadataIntakeReadinessPackSummary = () => {
  const pack = buildShadowRuntimeCandidateArtifactMetadataIntakeReadinessPack();
  const safetyGate = getShadowRuntimeSafetyGate();
  const issueCount = pack.manifestValidations.reduce((sum, row) => sum + row.validation.issueCount, 0);
  const validManifestCount = pack.manifestValidations.filter((row) => row.validation.valid).length;
  const invalidManifestCount = pack.manifestValidations.filter((row) => row.validation.status === "invalid").length;
  const reviewRequiredCount = pack.manifestValidations.filter((row) => row.validation.status === "review_required").length;

  return {
    generatedAt: nowIso(),
    currentStatus: PHASE_LABEL,
    artifactMetadataIntakeReadinessPackLabel: "Offline Candidate Artifact Metadata Intake Readiness Pack",
    artifactMetadataIntakeReadinessPackStatus: "Offline / Metadata-only / Readiness evidence only",
    artifactFileAccess: "Blocked",
    modelArtifactLoading: "Blocked",
    modelExecution: "Off",
    productionInference: "Not exposed",
    businessMutation: "Blocked",
    latestSafetyStatus: safetyGate,
    currentShadowRuntimeCandidateArtifactMetadataIntakeReadinessPack: {
      status: "offline_metadata_intake_readiness_only",
      readinessScorePct: invalidManifestCount === 0 ? 100 : 85,
      manifestFixtureCount: pack.manifests.length,
      validManifestFixtureCount: validManifestCount,
      invalidManifestFixtureCount: invalidManifestCount,
      reviewRequiredManifestFixtureCount: reviewRequiredCount,
      metadataIssueCount: issueCount,
      requiredMetadataFieldCount: REQUIRED_METADATA_FIELDS.length,
      requiredFalseFieldCount: REQUIRED_FALSE_FIELDS.length,
      forbiddenMetadataFieldCount: FORBIDDEN_METADATA_FIELDS.length,
      artifactFileReadAllowed: false,
      artifactBytesReadAllowed: false,
      artifactParseAllowed: false,
      artifactImportAllowed: false,
      modelArtifactLoadAllowed: false,
      externalModelCallAllowed: false,
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
      explanation: "Offline metadata intake readiness validates manifest shape only; it does not read artifact files, import artifacts, run inference, approve, activate, promote, or mutate business data.",
      warnings: [
        "Metadata manifests are governance readiness fixtures only.",
        "No artifact file or bytes are read.",
        "No model artifact import or execution is enabled.",
        "No inference endpoint is exposed.",
        "No approval, activation, promotion, pricing, reporting, ledger, inventory, accounting, or business mutation is possible.",
      ],
      blockers: [],
      recommendedNextAction: "Review metadata field requirements before any future offline artifact envelope acceptance design.",
    },
    contract: pack.contract,
    manifests: pack.manifests,
    manifestValidations: pack.manifestValidations,
  };
};

export const getShadowRuntimeCandidateArtifactMetadataIntakeReadinessManifestDetail = (manifestKey: string) => {
  const pack = buildShadowRuntimeCandidateArtifactMetadataIntakeReadinessPack();
  const manifest = pack.manifests.find((entry) => entry.manifestKey === manifestKey);
  if (!manifest) return null;
  return {
    generatedAt: nowIso(),
    manifest,
    validation: validateShadowRuntimeCandidateArtifactMetadataManifest(manifest),
    contract: pack.contract,
  };
};
