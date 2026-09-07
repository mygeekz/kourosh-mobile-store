import { computeArtifactEnvelopeSha256 } from "../artifactHashing";
import { getOfflineArtifactById } from "../../../db/domains/ml/mlOfflineArtifacts.db";
import {
  getMlModelResultImportById,
  listMlModelResultImports,
} from "../../../db/domains/ml/mlModelImports.db";
import { listMlBaselineBenchmarks } from "../../../db/domains/ml/mlBenchmarks.db";
import { listMlTrainingPackageExports } from "../../../db/domains/ml/mlTrainingPackages.db";
import {
  getLatestOfflineArtifactValidationForArtifact,
  getOfflineArtifactValidationResultById,
  getOfflineArtifactValidationSummary,
  listOfflineArtifactValidationResults,
  recordOfflineArtifactValidationResult,
} from "../../../db/domains/ml/mlOfflineArtifactValidation.db";
import {
  buildCompatibilitySummary,
  buildOfflineArtifactValidationSafetyGate,
  normalizeOfflineArtifactMetadataEnvelope,
  readModelImportReference,
  validateBenchmarkReference,
  validateEnvelopeSchema,
  validateFeatureContract,
  validateHashSignature,
  validateMetadataCompleteness,
  validateModelFamily,
  validateModelImportReference,
  validateOutputContract,
  validateQuarantineReasonQuality,
  validateTrainingPackageReference,
} from "./offlineArtifactValidationRules";
import { calculateOfflineArtifactTrustScore } from "./offlineArtifactValidationScore";
import { countFindings } from "./offlineArtifactValidationFindings";
import type {
  OfflineArtifactCompatibilitySummary,
  OfflineArtifactDriftRisk,
  OfflineArtifactFinalReviewSnapshot,
  OfflineArtifactValidationFinding,
  OfflineArtifactValidationRecord,
  OfflineArtifactValidationResult,
  OfflineArtifactValidationStatus,
  OfflineArtifactTrustLabel,
} from "./offlineArtifactValidationTypes";

const PHASE_LABEL = "Phase 7A — Offline Artifact Validation Deepening" as const;
const nowIso = () => new Date().toISOString();

const isRecord = (value: unknown): value is Record<string, unknown> => (
  value !== null && typeof value === "object" && !Array.isArray(value)
);

const toSourceRecord = (artifact: unknown): Record<string, unknown> => {
  if (!isRecord(artifact)) return {};
  return artifact;
};

const findReferencedModelImport = async (
  source: Record<string, unknown>,
): Promise<Record<string, unknown> | null> => {
  const envelope = normalizeOfflineArtifactMetadataEnvelope(source);
  const reference = readModelImportReference(envelope);
  const referencedId = Number(reference.modelImportId);
  if (Number.isFinite(referencedId) && referencedId > 0) {
    return getMlModelResultImportById(referencedId) as Promise<Record<string, unknown> | null>;
  }
  const imports = await listMlModelResultImports(1) as Array<Record<string, unknown>>;
  return imports[0] || null;
};

const latestTrainingPackage = async (): Promise<Record<string, unknown> | null> => {
  const rows = await listMlTrainingPackageExports(1) as Array<Record<string, unknown>>;
  return rows[0] || null;
};

const latestBenchmark = async (): Promise<Record<string, unknown> | null> => {
  const rows = await listMlBaselineBenchmarks(1) as Array<Record<string, unknown>>;
  return rows[0] || null;
};

const validationStatusFrom = (
  findings: OfflineArtifactValidationFinding[],
  driftRisk: OfflineArtifactDriftRisk,
  trustLabel: OfflineArtifactTrustLabel,
): OfflineArtifactValidationStatus => {
  if (findings.some((finding) => finding.severity === "critical" && finding.status === "fail")) return "fail";
  if (trustLabel === "reject_recommended") return "fail";
  if (trustLabel === "quarantine_recommended") return "quarantined";
  if (findings.some((finding) => finding.key.includes("missing") && finding.status !== "pass")) return "insufficient_metadata";
  if (driftRisk === "high" || driftRisk === "critical") return "warning";
  if (findings.some((finding) => finding.status === "warning" || finding.status === "fail")) return "warning";
  return "pass";
};

const finalReviewDecisionFrom = (
  validationStatus: OfflineArtifactValidationStatus,
  driftRisk: OfflineArtifactDriftRisk,
  trustLabel: OfflineArtifactTrustLabel,
): OfflineArtifactFinalReviewSnapshot["finalReviewerDecision"] => {
  if (validationStatus === "fail" || trustLabel === "reject_recommended" || driftRisk === "critical") return "reject_recommended";
  if (validationStatus === "quarantined" || trustLabel === "quarantine_recommended") return "quarantine_recommended";
  if (validationStatus === "warning" || validationStatus === "insufficient_metadata") return "needs_exception_closure";
  return "accepted_for_future_shadow_only";
};

const archiveCompletenessFrom = (compatibility: OfflineArtifactCompatibilitySummary): OfflineArtifactFinalReviewSnapshot["archiveCompletenessStatus"] => {
  const dimensions = Object.values(compatibility).filter(isRecord) as Array<{ status?: string }>;
  const missing = dimensions.filter((dimension) => dimension.status === "missing").length;
  if (missing === 0) return "complete";
  if (missing <= 2) return "partial";
  return "missing";
};

const buildFinalReviewSnapshot = (
  resultSeed: Pick<OfflineArtifactValidationResult, "artifactId" | "artifactHash" | "schemaVersion" | "modelFamily" | "trustScore" | "trustLabel" | "driftRisk" | "validationStatus">,
  compatibility: OfflineArtifactCompatibilitySummary,
  findings: OfflineArtifactValidationFinding[],
): OfflineArtifactFinalReviewSnapshot => {
  const evidenceConfidenceAccepted = resultSeed.validationStatus === "pass" && resultSeed.trustScore >= 85 && resultSeed.driftRisk === "low";
  const exceptionClosureStatus: OfflineArtifactFinalReviewSnapshot["exceptionClosureStatus"] = evidenceConfidenceAccepted
    ? "not_applicable"
    : findings.some((finding) => finding.status !== "pass")
      ? "open"
      : "closed";
  const notes = [
    `${PHASE_LABEL} is read-only and advisory; it does not approve activation or production use.`,
    "Final review snapshot is metadata-only audit evidence, not a binder/archive/signoff workflow.",
    `criticalFindings=${countFindings(findings, "critical")}`,
    `highFindings=${countFindings(findings, "high")}`,
  ];
  const unsignedSnapshot = {
    phase: PHASE_LABEL,
    artifactId: resultSeed.artifactId,
    artifactHash: resultSeed.artifactHash,
    schemaVersion: resultSeed.schemaVersion,
    modelFamily: resultSeed.modelFamily,
    validationStatus: resultSeed.validationStatus,
    trustScore: resultSeed.trustScore,
    trustLabel: resultSeed.trustLabel,
    driftRisk: resultSeed.driftRisk,
    evidenceConfidenceAccepted,
    exceptionClosureStatus,
    compatibilityDigest: compatibility,
    notes,
  };
  return {
    finalReviewerDecision: finalReviewDecisionFrom(resultSeed.validationStatus, resultSeed.driftRisk, resultSeed.trustLabel),
    archiveCompletenessStatus: archiveCompletenessFrom(compatibility),
    exceptionClosureStatus,
    evidenceConfidenceAccepted,
    signedAuditGovernanceFinalReviewHash: computeArtifactEnvelopeSha256(unsignedSnapshot),
    notes,
  };
};

export const validateOfflineArtifactEnvelope = async (
  artifactEnvelope: unknown,
): Promise<OfflineArtifactValidationResult> => {
  const source = toSourceRecord(artifactEnvelope);
  const envelope = normalizeOfflineArtifactMetadataEnvelope(source);
  const generatedAt = nowIso();
  const metadataOnlySignedEnvelopeHash = computeArtifactEnvelopeSha256({
    phase: PHASE_LABEL,
    generatedAt,
    artifactId: envelope.artifactId,
    artifactHash: envelope.artifactHash,
    artifactKind: envelope.artifactKind,
    schemaVersion: envelope.schemaVersion,
    modelFamily: envelope.modelFamily,
    declaredModelKey: envelope.declaredModelKey,
    declaredModelVersion: envelope.declaredModelVersion,
    declaredPredictionType: envelope.declaredPredictionType,
    declaredHorizon: envelope.declaredHorizon,
    metadata: envelope.metadata,
  });

  const [modelImport, trainingPackage, benchmark] = await Promise.all([
    findReferencedModelImport(source),
    latestTrainingPackage(),
    latestBenchmark(),
  ]);

  const envelopeSchema = validateEnvelopeSchema(envelope);
  const modelFamily = validateModelFamily(envelope);
  const featureContract = validateFeatureContract(envelope);
  const outputContract = validateOutputContract(envelope);
  const trainingPackageReference = validateTrainingPackageReference(envelope, trainingPackage);
  const benchmarkReference = validateBenchmarkReference(envelope, benchmark);
  const modelImportReference = validateModelImportReference(envelope, modelImport);
  const hashSignature = validateHashSignature(envelope, metadataOnlySignedEnvelopeHash);
  const metadataCompleteness = validateMetadataCompleteness(envelope);
  const quarantineReasonQuality = validateQuarantineReasonQuality(envelope);

  const findings = [
    ...envelopeSchema.findings,
    ...modelFamily.findings,
    ...featureContract.findings,
    ...outputContract.findings,
    ...trainingPackageReference.findings,
    ...benchmarkReference.findings,
    ...modelImportReference.findings,
    ...hashSignature.findings,
    ...metadataCompleteness.findings,
    ...quarantineReasonQuality.findings,
  ];

  const compatibility = buildCompatibilitySummary({
    envelopeSchema: envelopeSchema.compatibility,
    modelFamily: modelFamily.compatibility,
    featureContract: featureContract.compatibility,
    outputContract: outputContract.compatibility,
    trainingPackageReference: trainingPackageReference.compatibility,
    benchmarkReference: benchmarkReference.compatibility,
    modelImportReference: modelImportReference.compatibility,
    hashSignature: hashSignature.compatibility,
    metadataCompleteness: metadataCompleteness.compatibility,
    quarantineReasonQuality: quarantineReasonQuality.compatibility,
  });
  const { trustScore, trustLabel } = calculateOfflineArtifactTrustScore(findings);
  const validationStatus = validationStatusFrom(findings, compatibility.contractDriftRisk, trustLabel);
  const safety = buildOfflineArtifactValidationSafetyGate();
  const seed = {
    artifactId: envelope.artifactId,
    artifactHash: envelope.artifactHash,
    artifactKind: envelope.artifactKind,
    schemaVersion: envelope.schemaVersion,
    modelFamily: envelope.modelFamily,
    validationStatus,
    trustScore,
    trustLabel,
    driftRisk: compatibility.contractDriftRisk,
  };

  return {
    ...seed,
    generatedAt,
    executionAllowed: safety.artifactExecutionAllowed,
    activationAllowed: safety.artifactActivationAllowed,
    inferenceAllowed: safety.inferenceEndpointExposed,
    businessMutationAllowed: safety.canMutateBusinessRecords,
    findings,
    compatibility,
    finalReviewSnapshot: buildFinalReviewSnapshot(seed, compatibility, findings),
    safety,
  };
};

export const validateOfflineArtifactById = async (payload: {
  artifactId: string | number;
  createdByUserId?: string | number | null;
}): Promise<OfflineArtifactValidationRecord | null> => {
  const artifact = await getOfflineArtifactById(payload.artifactId);
  if (!artifact) return null;
  const validationResult = await validateOfflineArtifactEnvelope(artifact as unknown as Record<string, unknown>);
  return recordOfflineArtifactValidationResult(validationResult, payload.createdByUserId);
};

export const getLatestOfflineArtifactValidationByArtifactId = getLatestOfflineArtifactValidationForArtifact;
export const getOfflineArtifactValidationResult = getOfflineArtifactValidationResultById;
export const listOfflineArtifactDeepValidationResults = listOfflineArtifactValidationResults;
export const buildOfflineArtifactValidationSummary = getOfflineArtifactValidationSummary;
