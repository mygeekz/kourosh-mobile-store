import {
  buildShadowRuntimeCandidateArtifactMetadataManifestFixtures,
  buildShadowRuntimeCandidateArtifactMetadataIntakeReadinessPackContract,
  validateShadowRuntimeCandidateArtifactMetadataManifest,
} from "./shadowRuntimeCandidateArtifactMetadataIntakeReadinessPack.service";
import {
  buildShadowRuntimeCandidateOutputFixturePackContract,
} from "./shadowRuntimeCandidateOutputFixturePack.service";
import { getShadowRuntimeSafetyGate } from "./shadowRuntimeSafety";

const PHASE_LABEL = "Phase 5I — Offline Artifact Metadata Compatibility Matrix" as const;
const COMPATIBILITY_MATRIX_KEY = "shadow_runtime_artifact_metadata_compatibility_matrix_v1" as const;

const nowIso = () => new Date().toISOString();

type CompatibilityDimension =
  | "input_contract"
  | "output_contract"
  | "feature_snapshot_contract"
  | "safety_gate"
  | "artifact_access"
  | "model_execution"
  | "business_mutation";

type CompatibilityStatus = "compatible" | "review_required" | "blocked";

type CompatibilityMatrixRow = {
  manifestKey: string;
  dimension: CompatibilityDimension;
  status: CompatibilityStatus;
  expected: string | boolean;
  actual: string | boolean | null;
  issue: string | null;
  evidence: string;
};

const EXPECTED_INPUT_CONTRACT_KEY = "predictive_feature_snapshot_v1";
const EXPECTED_OUTPUT_CONTRACT_KEY = "shadow_runtime_candidate_output_contract_fixture_pack_v1";
const EXPECTED_FEATURE_SNAPSHOT_CONTRACT_KEY = "predictive_feature_snapshot_contract_v1";

const buildRow = (
  manifestKey: string,
  dimension: CompatibilityDimension,
  status: CompatibilityStatus,
  expected: string | boolean,
  actual: string | boolean | null,
  issue: string | null,
  evidence: string,
): CompatibilityMatrixRow => ({ manifestKey, dimension, status, expected, actual, issue, evidence });

const readText = (record: Record<string, unknown>, field: string): string => (
  typeof record[field] === "string" ? String(record[field]).trim() : ""
);

const readBoolean = (record: Record<string, unknown>, field: string): boolean | null => (
  typeof record[field] === "boolean" ? Boolean(record[field]) : null
);

const compareText = (
  manifestKey: string,
  dimension: CompatibilityDimension,
  expected: string,
  actual: string,
  evidence: string,
): CompatibilityMatrixRow => buildRow(
  manifestKey,
  dimension,
  actual === expected ? "compatible" : "review_required",
  expected,
  actual || null,
  actual === expected ? null : `Manifest declares ${actual || "<missing>"} but expected ${expected}.`,
  evidence,
);

const compareFalseFlag = (
  manifestKey: string,
  dimension: CompatibilityDimension,
  expectedField: string,
  actual: boolean | null,
  evidence: string,
): CompatibilityMatrixRow => buildRow(
  manifestKey,
  dimension,
  "compatible",
  false,
  actual,
  actual === false ? null : `${expectedField} must remain false for offline compatibility review.`,
  evidence,
);

const compareSafetyGate = (manifestKey: string): CompatibilityMatrixRow => {
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
    manifestKey,
    "safety_gate",
    compatible ? "compatible" : "blocked",
    false,
    compatible ? false : true,
    compatible ? null : "Central safety gate exposes at least one enabled production or mutation capability.",
    "Compatibility matrix reads the central safety gate and requires every production, execution, and business mutation flag to remain false.",
  );
};

export const buildShadowRuntimeArtifactMetadataCompatibilityMatrixContract = () => ({
  compatibilityMatrixKey: COMPATIBILITY_MATRIX_KEY,
  compatibilityMatrixVersion: "v1",
  phase: PHASE_LABEL,
  generatedAt: nowIso(),
  purpose: "Read-only offline compatibility matrix comparing candidate artifact metadata manifests against input contract, output fixture contract, feature snapshot contract, and central safety gate.",
  comparedDimensions: [
    "input contract key",
    "output fixture contract key",
    "feature snapshot contract key",
    "central safety gate",
    "artifact access flags",
    "model execution flags",
    "business mutation flags",
  ],
  expectedContracts: {
    inputContractKey: EXPECTED_INPUT_CONTRACT_KEY,
    outputContractKey: buildShadowRuntimeCandidateOutputFixturePackContract().fixturePackKey,
    featureSnapshotContractKey: EXPECTED_FEATURE_SNAPSHOT_CONTRACT_KEY,
    metadataIntakeContractKey: buildShadowRuntimeCandidateArtifactMetadataIntakeReadinessPackContract().intakeReadinessPackKey,
  },
  allowedBehavior: [
    "Compare metadata manifest declarations with offline contract keys in memory.",
    "Report compatibility rows for artifact metadata, input/output contracts, feature snapshots, and safety gate status.",
    "Expose compatibility evidence for Admin and Manager review.",
  ],
  forbiddenBehavior: [
    "Do not read artifact files or bytes.",
    "Do not import, parse, or load model artifacts.",
    "Do not execute a model or call an external runtime.",
    "Do not expose an inference endpoint.",
    "Do not approve, activate, promote, deploy, accept, or run candidate artifacts.",
    "Do not persist compatibility decisions to the database.",
    "Do not mutate pricing, reports, ledger, inventory, accounting, sales, repairs, partners, customers, or any business record.",
  ],
  safetyGate: getShadowRuntimeSafetyGate(),
});

export const buildShadowRuntimeArtifactMetadataCompatibilityMatrix = () => {
  const contract = buildShadowRuntimeArtifactMetadataCompatibilityMatrixContract();
  const manifests = buildShadowRuntimeCandidateArtifactMetadataManifestFixtures();
  const matrixRows = manifests.flatMap((manifest) => {
    const record = manifest as unknown as Record<string, unknown>;
    return [
      compareText(
        manifest.manifestKey,
        "input_contract",
        EXPECTED_INPUT_CONTRACT_KEY,
        readText(record, "declaredInputContractKey"),
        "Metadata manifest must declare the predictive feature snapshot input contract expected by the dry-run adapter.",
      ),
      compareText(
        manifest.manifestKey,
        "output_contract",
        contract.expectedContracts.outputContractKey,
        readText(record, "declaredOutputContractKey"),
        "Metadata manifest must declare the offline candidate output fixture contract used by Phase 5E and comparison matrix evidence.",
      ),
      compareText(
        manifest.manifestKey,
        "feature_snapshot_contract",
        EXPECTED_FEATURE_SNAPSHOT_CONTRACT_KEY,
        readText(record, "declaredFeatureSnapshotContractKey"),
        "Metadata manifest must remain compatible with historical predictive feature snapshot contract evidence.",
      ),
      compareSafetyGate(manifest.manifestKey),
      compareFalseFlag(manifest.manifestKey, "artifact_access", "artifactFileReadAllowed", readBoolean(record, "artifactFileReadAllowed"), "Artifact file access must stay blocked in metadata compatibility review."),
      compareFalseFlag(manifest.manifestKey, "artifact_access", "artifactBytesReadAllowed", readBoolean(record, "artifactBytesReadAllowed"), "Artifact byte access must stay blocked in metadata compatibility review."),
      compareFalseFlag(manifest.manifestKey, "model_execution", "modelExecutionAllowed", readBoolean(record, "modelExecutionAllowed"), "Model execution must stay blocked in metadata compatibility review."),
      compareFalseFlag(manifest.manifestKey, "business_mutation", "businessMutationAllowed", readBoolean(record, "businessMutationAllowed"), "Business mutation must stay blocked in metadata compatibility review."),
    ];
  });

  const manifestValidations = manifests.map((manifest) => ({
    manifestKey: manifest.manifestKey,
    validation: validateShadowRuntimeCandidateArtifactMetadataManifest(manifest),
  }));

  return {
    generatedAt: nowIso(),
    phase: PHASE_LABEL,
    compatibilityMatrixKey: COMPATIBILITY_MATRIX_KEY,
    contract,
    manifests,
    manifestValidations,
    matrixRows,
  };
};

export const getShadowRuntimeArtifactMetadataCompatibilityMatrixSummary = () => {
  const matrix = buildShadowRuntimeArtifactMetadataCompatibilityMatrix();
  const safetyGate = getShadowRuntimeSafetyGate();
  const issueCount = matrix.matrixRows.filter((row) => row.issue).length;
  const blockedCount = matrix.matrixRows.filter((row) => row.status === "blocked").length;
  const reviewRequiredCount = matrix.matrixRows.filter((row) => row.status === "review_required").length;
  const compatibleCount = matrix.matrixRows.filter((row) => row.status === "compatible").length;

  return {
    generatedAt: nowIso(),
    currentStatus: PHASE_LABEL,
    artifactMetadataCompatibilityMatrixLabel: "Offline Artifact Metadata Compatibility Matrix",
    artifactMetadataCompatibilityMatrixStatus: "Offline / Read-only / Compatibility evidence only",
    artifactFileAccess: "Blocked",
    artifactImport: "Blocked",
    modelExecution: "Off",
    productionInference: "Not exposed",
    businessMutation: "Blocked",
    latestSafetyStatus: safetyGate,
    currentShadowRuntimeArtifactMetadataCompatibilityMatrix: {
      status: "offline_metadata_compatibility_matrix_only",
      readinessScorePct: blockedCount === 0 ? 100 : 80,
      manifestFixtureCount: matrix.manifests.length,
      matrixRowCount: matrix.matrixRows.length,
      compatibleRowCount: compatibleCount,
      reviewRequiredRowCount: reviewRequiredCount,
      blockedRowCount: blockedCount,
      compatibilityIssueCount: issueCount,
      inputContractKey: EXPECTED_INPUT_CONTRACT_KEY,
      outputContractKey: matrix.contract.expectedContracts.outputContractKey,
      featureSnapshotContractKey: EXPECTED_FEATURE_SNAPSHOT_CONTRACT_KEY,
      artifactFileReadAllowed: false,
      artifactBytesReadAllowed: false,
      artifactParseAllowed: false,
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
      explanation: "Offline compatibility matrix compares candidate artifact metadata declarations with input, output, feature snapshot, and safety gate contracts only; it does not read artifacts, load files, execute models, approve, activate, promote, accept artifacts, or mutate business data.",
      warnings: [
        "Compatibility matrix evidence is generated in memory only.",
        "No artifact file reading, byte access, parsing, import, or loading is enabled.",
        "No model execution or production inference endpoint is exposed.",
        "No approval, activation, promotion, artifact acceptance, pricing, reporting, ledger, inventory, accounting, or business mutation control is added.",
      ],
      blockers: [],
      recommendedNextAction: "Review compatibility rows before any future offline artifact envelope storage design.",
    },
    contract: matrix.contract,
    manifests: matrix.manifests,
    manifestValidations: matrix.manifestValidations,
    matrixRows: matrix.matrixRows,
  };
};

export const getShadowRuntimeArtifactMetadataCompatibilityMatrixManifestDetail = (manifestKey: string) => {
  const matrix = buildShadowRuntimeArtifactMetadataCompatibilityMatrix();
  const manifest = matrix.manifests.find((entry) => entry.manifestKey === manifestKey);
  if (!manifest) return null;
  return {
    generatedAt: nowIso(),
    manifest,
    manifestValidation: validateShadowRuntimeCandidateArtifactMetadataManifest(manifest),
    compatibilityRows: matrix.matrixRows.filter((row) => row.manifestKey === manifestKey),
    contract: matrix.contract,
  };
};
