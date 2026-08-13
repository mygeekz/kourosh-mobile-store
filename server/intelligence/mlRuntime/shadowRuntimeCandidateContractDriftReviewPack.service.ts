import {
  buildShadowRuntimeCandidateOutputComparisonMatrixContract,
  buildShadowRuntimeCandidateOutputComparisonMatrix,
} from "./shadowRuntimeCandidateOutputComparisonMatrix.service";
import {
  buildShadowRuntimeCandidateOutputContractFixtures,
  buildShadowRuntimeCandidateOutputFixturePackContract,
} from "./shadowRuntimeCandidateOutputFixturePack.service";
import { getShadowRuntimeSafetyGate } from "./shadowRuntimeSafety";

const PHASE_LABEL = "Phase 5G — Offline Candidate Contract Drift Review Pack" as const;
const DRIFT_REVIEW_PACK_KEY = "shadow_runtime_candidate_contract_drift_review_pack_v1" as const;

type DriftSeverity = "info" | "review" | "critical";
type DriftStatus = "added" | "removed" | "unchanged";

type ContractSnapshot = {
  versionKey: string;
  versionLabel: string;
  source: "seed_offline_fixture_contract" | "current_offline_fixture_contract";
  requiredFields: string[];
  forbiddenFields: string[];
  safetyFalseFields: string[];
  generatedAt: string;
  notes: string[];
};

type DriftRow = {
  field: string;
  driftType: "required_field" | "forbidden_field" | "safety_false_field";
  status: DriftStatus;
  severity: DriftSeverity;
  previousVersionKey: string;
  currentVersionKey: string;
  previousPresent: boolean;
  currentPresent: boolean;
  safetyCritical: boolean;
  message: string;
};

const CURRENT_VERSION_KEY = "candidate_output_contract_v1" as const;
const SEED_VERSION_KEY = "candidate_output_contract_seed_v0" as const;

const SAFETY_FALSE_FIELDS = [
  "modelExecutionAttempted",
  "modelExecutionAllowed",
  "inferenceEndpointExposed",
  "productionIntegrationAllowed",
  "decisionAutomationAllowed",
  "businessMutationAllowed",
  "approvalAllowed",
  "activationAllowed",
  "promotionAllowed",
  "pricingMutationAllowed",
  "reportMutationAllowed",
  "ledgerMutationAllowed",
] as const;

const buildSeedContractSnapshot = (): ContractSnapshot => ({
  versionKey: SEED_VERSION_KEY,
  versionLabel: "Offline seed contract before Phase 5E fixture hardening",
  source: "seed_offline_fixture_contract",
  generatedAt: new Date().toISOString(),
  requiredFields: [
    "fixtureKey",
    "fixtureVersion",
    "fixtureOnly",
    "modelKey",
    "modelVersion",
    "predictionType",
    "entityType",
    "entityId",
    "horizonDays",
    "candidateScore",
    "candidateLabel",
    "candidateConfidence",
    "baselineScore",
    "deltaFromBaseline",
    "rawCandidateOutput",
    "explanation",
    "safetyNotes",
    "generatedAt",
  ],
  forbiddenFields: [
    "approved",
    "approvalStatus",
    "productionDecision",
    "decision",
    "autoDecision",
    "price",
    "inventoryMutation",
    "accountingMutation",
  ],
  safetyFalseFields: [
    "modelExecutionAttempted",
    "modelExecutionAllowed",
    "inferenceEndpointExposed",
    "productionIntegrationAllowed",
    "decisionAutomationAllowed",
    "businessMutationAllowed",
    "approvalAllowed",
    "activationAllowed",
    "pricingMutationAllowed",
  ],
  notes: [
    "Seed snapshot is an offline governance reference only.",
    "It is not a model artifact and is not loaded for inference.",
    "It is used only to make current contract drift visible to reviewers.",
  ],
});

const toStringArray = (value: unknown): string[] => Array.isArray(value)
  ? value.map((entry) => String(entry)).filter(Boolean)
  : [];

const buildCurrentContractSnapshot = (): ContractSnapshot => {
  const fixtureContract = buildShadowRuntimeCandidateOutputFixturePackContract();
  const matrixContract = buildShadowRuntimeCandidateOutputComparisonMatrixContract();
  return {
    versionKey: CURRENT_VERSION_KEY,
    versionLabel: "Current Phase 5E/5F offline candidate output contract",
    source: "current_offline_fixture_contract",
    generatedAt: new Date().toISOString(),
    requiredFields: toStringArray(fixtureContract.requiredFields),
    forbiddenFields: toStringArray(fixtureContract.forbiddenFields),
    safetyFalseFields: Array.isArray(matrixContract.baselineFields)
      ? matrixContract.baselineFields
        .filter((field) => Boolean((field as { expectedFalse?: boolean }).expectedFalse))
        .map((field) => String((field as { field?: string }).field || ""))
        .filter(Boolean)
      : [],
    notes: [
      "Current contract is produced from offline fixtures and the comparison matrix.",
      "It does not load a candidate artifact or call an external model runtime.",
      "It does not approve, activate, promote, or mutate business data.",
    ],
  };
};

const fieldSet = (fields: string[]) => new Set(fields.map((field) => String(field)).filter(Boolean));

const buildRowsForCategory = (
  driftType: DriftRow["driftType"],
  previousFields: string[],
  currentFields: string[],
  previousVersionKey: string,
  currentVersionKey: string,
): DriftRow[] => {
  const previous = fieldSet(previousFields);
  const current = fieldSet(currentFields);
  const allFields = Array.from(new Set([...previous, ...current])).sort((a, b) => a.localeCompare(b));

  return allFields.map((field) => {
    const previousPresent = previous.has(field);
    const currentPresent = current.has(field);
    const status: DriftStatus = previousPresent === currentPresent ? "unchanged" : currentPresent ? "added" : "removed";
    const safetyCritical = driftType === "safety_false_field" || SAFETY_FALSE_FIELDS.includes(field as typeof SAFETY_FALSE_FIELDS[number]);
    const severity: DriftSeverity = status === "unchanged" ? "info" : safetyCritical ? "critical" : "review";
    const categoryLabel = driftType.replace(/_/g, " ");
    const message = status === "unchanged"
      ? `${field} is unchanged in the ${categoryLabel} set.`
      : status === "added"
        ? `${field} was added to the current ${categoryLabel} set for offline contract hardening.`
        : `${field} was removed from the current ${categoryLabel} set and should be reviewed before any future artifact loading design.`;

    return {
      field,
      driftType,
      status,
      severity,
      previousVersionKey,
      currentVersionKey,
      previousPresent,
      currentPresent,
      safetyCritical,
      message,
    };
  });
};

export const buildShadowRuntimeCandidateContractDriftReviewPackContract = () => ({
  driftReviewPackKey: DRIFT_REVIEW_PACK_KEY,
  driftReviewPackVersion: "v1",
  phase: PHASE_LABEL,
  generatedAt: new Date().toISOString(),
  purpose: "Read-only offline review pack for comparing candidate output contract fixture shape across contract snapshots before any artifact loading or inference design is considered.",
  allowedBehavior: [
    "Compare offline candidate output contract snapshots in memory.",
    "Report required-field, forbidden-field, and safety-false-field drift.",
    "Expose drift evidence for Admin and Manager review.",
  ],
  forbiddenBehavior: [
    "Do not load model artifacts.",
    "Do not execute a real model.",
    "Do not call external runtimes or APIs.",
    "Do not expose an inference endpoint.",
    "Do not approve, activate, promote, deploy, or run a model candidate.",
    "Do not write drift decisions to the database.",
    "Do not mutate pricing, reports, ledger, inventory, accounting, sales, repairs, partners, or customers.",
  ],
  reviewedVersionKeys: [SEED_VERSION_KEY, CURRENT_VERSION_KEY],
  safetyGate: getShadowRuntimeSafetyGate(),
});

export const buildShadowRuntimeCandidateContractDriftReviewPack = () => {
  const previousSnapshot = buildSeedContractSnapshot();
  const currentSnapshot = buildCurrentContractSnapshot();
  const comparisonMatrix = buildShadowRuntimeCandidateOutputComparisonMatrix();
  const fixtures = buildShadowRuntimeCandidateOutputContractFixtures();
  const driftRows = [
    ...buildRowsForCategory(
      "required_field",
      previousSnapshot.requiredFields,
      currentSnapshot.requiredFields,
      previousSnapshot.versionKey,
      currentSnapshot.versionKey,
    ),
    ...buildRowsForCategory(
      "forbidden_field",
      previousSnapshot.forbiddenFields,
      currentSnapshot.forbiddenFields,
      previousSnapshot.versionKey,
      currentSnapshot.versionKey,
    ),
    ...buildRowsForCategory(
      "safety_false_field",
      previousSnapshot.safetyFalseFields,
      currentSnapshot.safetyFalseFields,
      previousSnapshot.versionKey,
      currentSnapshot.versionKey,
    ),
  ];

  return {
    generatedAt: new Date().toISOString(),
    phase: PHASE_LABEL,
    contract: buildShadowRuntimeCandidateContractDriftReviewPackContract(),
    snapshots: [previousSnapshot, currentSnapshot],
    driftRows,
    currentFixtureKeys: fixtures.map((fixture) => fixture.fixtureKey),
    comparisonMatrixKey: comparisonMatrix.matrixKey,
  };
};

export const getShadowRuntimeCandidateContractDriftReviewPackSummary = () => {
  const pack = buildShadowRuntimeCandidateContractDriftReviewPack();
  const safetyGate = getShadowRuntimeSafetyGate();
  const driftRows = pack.driftRows;
  const changedRows = driftRows.filter((row) => row.status !== "unchanged");
  const safetyCriticalRows = changedRows.filter((row) => row.safetyCritical);
  const removedRows = changedRows.filter((row) => row.status === "removed");

  return {
    generatedAt: new Date().toISOString(),
    currentStatus: PHASE_LABEL,
    contractDriftReviewPackLabel: "Offline Candidate Contract Drift Review Pack",
    contractDriftReviewPackStatus: "Offline / Read-only / Drift evidence only",
    modelArtifactLoading: "Blocked",
    modelExecution: "Off",
    productionInference: "Not exposed",
    businessMutation: "Blocked",
    latestSafetyStatus: safetyGate,
    currentShadowRuntimeCandidateContractDriftReviewPack: {
      status: "offline_drift_review_only",
      readinessScorePct: removedRows.length === 0 ? 100 : 90,
      reviewedContractVersionCount: pack.snapshots.length,
      driftRowCount: driftRows.length,
      changedDriftRowCount: changedRows.length,
      addedFieldCount: changedRows.filter((row) => row.status === "added").length,
      removedFieldCount: removedRows.length,
      safetyCriticalDriftCount: safetyCriticalRows.length,
      requiredFieldDriftCount: changedRows.filter((row) => row.driftType === "required_field").length,
      forbiddenFieldDriftCount: changedRows.filter((row) => row.driftType === "forbidden_field").length,
      safetyFalseFieldDriftCount: changedRows.filter((row) => row.driftType === "safety_false_field").length,
      currentFixtureCount: pack.currentFixtureKeys.length,
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
      explanation: "Offline drift review compares candidate output contract fixture snapshots only; it does not load artifacts, run inference, approve, activate, promote, or mutate business data.",
      warnings: [
        "Drift rows are governance evidence only.",
        "No model artifact is loaded.",
        "No real model execution is enabled.",
        "No inference endpoint is exposed.",
        "No approval, activation, promotion, pricing, reporting, ledger, inventory, accounting, or business mutation is possible.",
      ],
      blockers: [],
      recommendedNextAction: "Review changed drift rows before designing any future offline artifact metadata import stage.",
    },
    contract: pack.contract,
    snapshots: pack.snapshots,
    driftRows,
  };
};

export const getShadowRuntimeCandidateContractDriftReviewPackVersionDetail = (versionKey: string) => {
  const pack = buildShadowRuntimeCandidateContractDriftReviewPack();
  const snapshot = pack.snapshots.find((entry) => entry.versionKey === versionKey);
  if (!snapshot) return null;
  return {
    generatedAt: new Date().toISOString(),
    snapshot,
    driftRows: pack.driftRows.filter((row) => row.previousVersionKey === versionKey || row.currentVersionKey === versionKey),
    contract: pack.contract,
  };
};
