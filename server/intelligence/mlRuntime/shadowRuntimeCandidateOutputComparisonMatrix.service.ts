import {
  buildShadowRuntimeCandidateOutputContractFixtures,
  buildShadowRuntimeCandidateOutputFixturePackContract,
  validateShadowRuntimeCandidateOutputFixture,
} from "./shadowRuntimeCandidateOutputFixturePack.service";
import { getShadowRuntimeSafetyGate } from "./shadowRuntimeSafety";

const PHASE_LABEL = "Phase 5F — Candidate Output Fixture Comparison Matrix" as const;
const COMPARISON_MATRIX_KEY = "shadow_runtime_candidate_output_fixture_comparison_matrix_v1" as const;

type MatrixStatus = "match" | "missing" | "type_mismatch" | "forbidden_present" | "safety_violation";

type BaselineFieldContract = {
  field: string;
  required: boolean;
  allowedTypes: Array<"string" | "number" | "boolean" | "object" | "array" | "null">;
  nullable: boolean;
  safetyCritical?: boolean;
  expectedFalse?: boolean;
};

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

const FIELD_TYPE_RULES: Record<string, Pick<BaselineFieldContract, "allowedTypes" | "nullable">> = {
  fixtureKey: { allowedTypes: ["string"], nullable: false },
  fixtureVersion: { allowedTypes: ["string"], nullable: false },
  fixtureOnly: { allowedTypes: ["boolean"], nullable: false },
  modelKey: { allowedTypes: ["string"], nullable: false },
  modelVersion: { allowedTypes: ["string"], nullable: false },
  predictionType: { allowedTypes: ["string"], nullable: false },
  entityType: { allowedTypes: ["string"], nullable: false },
  entityId: { allowedTypes: ["string", "number", "null"], nullable: true },
  horizonDays: { allowedTypes: ["number", "null"], nullable: true },
  candidateScore: { allowedTypes: ["number", "null"], nullable: true },
  candidateLabel: { allowedTypes: ["string", "null"], nullable: true },
  candidateConfidence: { allowedTypes: ["number", "null"], nullable: true },
  baselineScore: { allowedTypes: ["number", "null"], nullable: true },
  deltaFromBaseline: { allowedTypes: ["number", "null"], nullable: true },
  rawCandidateOutput: { allowedTypes: ["object", "null"], nullable: true },
  explanation: { allowedTypes: ["string"], nullable: false },
  safetyNotes: { allowedTypes: ["array"], nullable: false },
  generatedAt: { allowedTypes: ["string"], nullable: false },
  modelExecutionAttempted: { allowedTypes: ["boolean"], nullable: false },
  modelExecutionAllowed: { allowedTypes: ["boolean"], nullable: false },
  inferenceEndpointExposed: { allowedTypes: ["boolean"], nullable: false },
  productionIntegrationAllowed: { allowedTypes: ["boolean"], nullable: false },
  decisionAutomationAllowed: { allowedTypes: ["boolean"], nullable: false },
  businessMutationAllowed: { allowedTypes: ["boolean"], nullable: false },
  approvalAllowed: { allowedTypes: ["boolean"], nullable: false },
  activationAllowed: { allowedTypes: ["boolean"], nullable: false },
  promotionAllowed: { allowedTypes: ["boolean"], nullable: false },
  pricingMutationAllowed: { allowedTypes: ["boolean"], nullable: false },
  reportMutationAllowed: { allowedTypes: ["boolean"], nullable: false },
  ledgerMutationAllowed: { allowedTypes: ["boolean"], nullable: false },
};

const getValueType = (value: unknown): BaselineFieldContract["allowedTypes"][number] => {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "object") return "object";
  if (typeof value === "string") return "string";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  return "object";
};

const isAllowedType = (value: unknown, contract: BaselineFieldContract): boolean => {
  if (value === null) return contract.nullable || contract.allowedTypes.includes("null");
  return contract.allowedTypes.includes(getValueType(value));
};

export const buildShadowRuntimeCandidateOutputComparisonMatrixContract = () => {
  const fixturePackContract = buildShadowRuntimeCandidateOutputFixturePackContract();
  const requiredFields = Array.isArray(fixturePackContract.requiredFields) ? fixturePackContract.requiredFields : [];
  const forbiddenFields = Array.isArray(fixturePackContract.forbiddenFields) ? fixturePackContract.forbiddenFields : [];
  const baselineFields: BaselineFieldContract[] = [
    ...requiredFields.map((field) => {
      const textField = String(field);
      const rule = FIELD_TYPE_RULES[textField] || { allowedTypes: ["string", "number", "boolean", "object", "array", "null"], nullable: true };
      return {
        field: textField,
        required: true,
        allowedTypes: rule.allowedTypes,
        nullable: rule.nullable,
        safetyCritical: SAFETY_FALSE_FIELDS.includes(textField as typeof SAFETY_FALSE_FIELDS[number]),
        expectedFalse: SAFETY_FALSE_FIELDS.includes(textField as typeof SAFETY_FALSE_FIELDS[number]),
      };
    }),
    ...SAFETY_FALSE_FIELDS.filter((field) => !requiredFields.includes(field)).map((field) => {
      const rule = FIELD_TYPE_RULES[field];
      return {
        field,
        required: true,
        allowedTypes: rule.allowedTypes,
        nullable: rule.nullable,
        safetyCritical: true,
        expectedFalse: true,
      };
    }),
  ];

  return {
    matrixKey: COMPARISON_MATRIX_KEY,
    matrixVersion: "v1",
    phase: PHASE_LABEL,
    generatedAt: new Date().toISOString(),
    purpose: "Read-only comparison matrix that compares offline candidate output fixtures against the baseline-compatible output contract field-by-field.",
    baselineFields,
    forbiddenFields,
    allowedBehavior: [
      "Compare synthetic candidate fixture fields with the offline baseline-compatible contract.",
      "Report missing fields, type mismatches, forbidden fields, and safety flag violations.",
      "Expose comparison evidence for Admin and Manager review.",
    ],
    forbiddenBehavior: [
      "Do not load model artifacts.",
      "Do not execute a real model.",
      "Do not call external runtimes or APIs.",
      "Do not expose an inference endpoint.",
      "Do not approve, activate, promote, or deploy a model candidate.",
      "Do not mutate pricing, reports, ledger, inventory, accounting, sales, repairs, partners, or customers.",
    ],
    safetyGate: getShadowRuntimeSafetyGate(),
  };
};

export const buildShadowRuntimeCandidateOutputComparisonMatrix = () => {
  const contract = buildShadowRuntimeCandidateOutputComparisonMatrixContract();
  const fixtures = buildShadowRuntimeCandidateOutputContractFixtures();
  const matrixRows = fixtures.flatMap((fixture) => {
    const fixtureRecord = fixture as Record<string, unknown>;
    const baselineRows = contract.baselineFields.map((fieldContract) => {
      const hasField = Object.prototype.hasOwnProperty.call(fixtureRecord, fieldContract.field);
      const value = fixtureRecord[fieldContract.field];
      let status: MatrixStatus = "match";
      let message = "Field is present and matches the baseline-compatible fixture contract.";

      if (!hasField && fieldContract.required) {
        status = "missing";
        message = "Required baseline-compatible field is missing from the candidate fixture.";
      } else if (hasField && !isAllowedType(value, fieldContract)) {
        status = "type_mismatch";
        message = `Field type ${getValueType(value)} is not allowed for this baseline-compatible field.`;
      } else if (fieldContract.expectedFalse && value !== false) {
        status = "safety_violation";
        message = "Safety-critical field must remain false in the offline comparison matrix.";
      }

      return {
        fixtureKey: fixture.fixtureKey,
        field: fieldContract.field,
        required: fieldContract.required,
        allowedTypes: fieldContract.allowedTypes,
        nullable: fieldContract.nullable,
        safetyCritical: Boolean(fieldContract.safetyCritical),
        expectedFalse: Boolean(fieldContract.expectedFalse),
        actualType: hasField ? getValueType(value) : "missing",
        actualValuePreview: typeof value === "object" ? null : value,
        status,
        message,
      };
    });

    const forbiddenRows = contract.forbiddenFields
      .filter((field) => Object.prototype.hasOwnProperty.call(fixtureRecord, String(field)))
      .map((field) => ({
        fixtureKey: fixture.fixtureKey,
        field: String(field),
        required: false,
        allowedTypes: [],
        nullable: true,
        safetyCritical: true,
        expectedFalse: false,
        actualType: getValueType(fixtureRecord[String(field)]),
        actualValuePreview: null,
        status: "forbidden_present" as MatrixStatus,
        message: "Forbidden production/action field is present and must be removed from the offline candidate output fixture.",
      }));

    return [...baselineRows, ...forbiddenRows];
  });

  const fixtureValidations = fixtures.map((fixture) => ({
    fixtureKey: fixture.fixtureKey,
    validation: validateShadowRuntimeCandidateOutputFixture(fixture),
  }));

  return {
    generatedAt: new Date().toISOString(),
    matrixKey: COMPARISON_MATRIX_KEY,
    phase: PHASE_LABEL,
    contract,
    fixtures,
    fixtureValidations,
    matrixRows,
  };
};

export const getShadowRuntimeCandidateOutputComparisonMatrixSummary = () => {
  const matrix = buildShadowRuntimeCandidateOutputComparisonMatrix();
  const safetyGate = getShadowRuntimeSafetyGate();
  const countStatus = (status: MatrixStatus) => matrix.matrixRows.filter((row) => row.status === status).length;
  const issueCount = matrix.matrixRows.filter((row) => row.status !== "match").length;
  const comparisonByFixture = matrix.fixtures.map((fixture) => {
    const rows = matrix.matrixRows.filter((row) => row.fixtureKey === fixture.fixtureKey);
    return {
      fixtureKey: fixture.fixtureKey,
      predictionType: fixture.predictionType,
      entityType: fixture.entityType,
      matrixRowCount: rows.length,
      issueCount: rows.filter((row) => row.status !== "match").length,
      missingFieldCount: rows.filter((row) => row.status === "missing").length,
      typeMismatchCount: rows.filter((row) => row.status === "type_mismatch").length,
      forbiddenFieldCount: rows.filter((row) => row.status === "forbidden_present").length,
      safetyViolationCount: rows.filter((row) => row.status === "safety_violation").length,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    currentStatus: PHASE_LABEL,
    comparisonMatrixLabel: "Candidate Output Fixture Comparison Matrix",
    comparisonMatrixStatus: "Offline / Read-only / Contract comparison only",
    modelArtifactLoading: "Blocked",
    modelExecution: "Off",
    productionInference: "Not exposed",
    businessMutation: "Blocked",
    latestSafetyStatus: safetyGate,
    currentShadowRuntimeCandidateOutputFixtureComparisonMatrix: {
      status: "offline_comparison_only",
      readinessScorePct: issueCount === 0 ? 100 : 90,
      fixtureCount: matrix.fixtures.length,
      baselineFieldCount: matrix.contract.baselineFields.length,
      requiredFieldCount: matrix.contract.baselineFields.filter((field) => field.required).length,
      matrixRowCount: matrix.matrixRows.length,
      matchedFieldCount: countStatus("match"),
      issueCount,
      missingFieldCount: countStatus("missing"),
      typeMismatchCount: countStatus("type_mismatch"),
      forbiddenFieldCount: countStatus("forbidden_present"),
      safetyViolationCount: countStatus("safety_violation"),
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
      explanation: "Offline comparison matrix checks synthetic candidate output fixtures against a baseline-compatible contract without loading artifacts, running inference, or creating production actions.",
      warnings: [
        "Comparison matrix is offline-only and read-only.",
        "No real model execution is enabled.",
        "No model artifact is loaded.",
        "No inference endpoint is exposed.",
        "No approval, activation, promotion, pricing, reporting, ledger, inventory, accounting, or business mutation is possible.",
      ],
      blockers: [],
      recommendedNextAction: "Use this matrix to harden candidate output contracts before any future offline artifact inspection phase.",
    },
    comparisonByFixture,
    contract: matrix.contract,
    matrixRows: matrix.matrixRows,
    fixtureValidations: matrix.fixtureValidations,
  };
};

export const getShadowRuntimeCandidateOutputComparisonMatrixFixtureDetail = (fixtureKey: unknown) => {
  const matrix = buildShadowRuntimeCandidateOutputComparisonMatrix();
  const normalizedKey = String(fixtureKey ?? "").trim();
  const fixture = matrix.fixtures.find((item) => item.fixtureKey === normalizedKey);
  if (!fixture) return null;
  return {
    generatedAt: new Date().toISOString(),
    currentStatus: PHASE_LABEL,
    fixture,
    validation: validateShadowRuntimeCandidateOutputFixture(fixture),
    matrixRows: matrix.matrixRows.filter((row) => row.fixtureKey === normalizedKey),
    safetyGate: getShadowRuntimeSafetyGate(),
  };
};
