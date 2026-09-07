import { allAsync, getAsync, runAsync } from "../../query";
import { clampLimit, safeJson } from "./mlDbUtils";
import { buildOfflineArtifactValidationSafetyGate } from "../../../intelligence/artifacts/validation/offlineArtifactValidationRules";
import type {
  OfflineArtifactCompatibilitySummary,
  OfflineArtifactFinalReviewSnapshot,
  OfflineArtifactValidationFinding,
  OfflineArtifactValidationRecord,
  OfflineArtifactValidationResult,
  OfflineArtifactValidationSafetyGate,
  OfflineArtifactValidationSummary,
} from "../../../intelligence/artifacts/validation/offlineArtifactValidationTypes";

const parseJson = <T>(value: unknown, fallback: T): T => {
  if (typeof value !== "string" || value.trim().length === 0) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch (_err) {
    return fallback;
  }
};

const mapOfflineArtifactValidationRow = (
  row: Record<string, unknown> | undefined,
): OfflineArtifactValidationRecord | null => {
  if (!row) return null;
  const safety = parseJson<OfflineArtifactValidationSafetyGate>(row.safetyGateJson, buildOfflineArtifactValidationSafetyGate());
  return {
    id: Number(row.id),
    artifactId: String(row.artifactId || ""),
    artifactHash: row.artifactHash == null ? null : String(row.artifactHash),
    artifactKind: row.artifactKind == null ? null : String(row.artifactKind),
    schemaVersion: row.schemaVersion == null ? null : String(row.schemaVersion),
    modelFamily: row.modelFamily == null ? null : String(row.modelFamily),
    validationStatus: String(row.validationStatus || "insufficient_metadata") as OfflineArtifactValidationRecord["validationStatus"],
    trustScore: Number(row.trustScore || 0),
    trustLabel: String(row.trustLabel || "review_required") as OfflineArtifactValidationRecord["trustLabel"],
    driftRisk: String(row.driftRisk || "high") as OfflineArtifactValidationRecord["driftRisk"],
    generatedAt: String(row.createdAt || ""),
    executionAllowed: safety.artifactExecutionAllowed,
    activationAllowed: safety.artifactActivationAllowed,
    inferenceAllowed: safety.inferenceEndpointExposed,
    businessMutationAllowed: safety.canMutateBusinessRecords,
    findings: parseJson<OfflineArtifactValidationFinding[]>(row.findingsJson, []),
    compatibility: parseJson<OfflineArtifactCompatibilitySummary>(row.compatibilityJson, {
      envelopeSchema: { status: "missing", expected: {}, observed: {}, notes: [] },
      modelFamily: { status: "missing", expected: {}, observed: {}, notes: [] },
      featureContract: { status: "missing", expected: {}, observed: {}, notes: [] },
      outputContract: { status: "missing", expected: {}, observed: {}, notes: [] },
      trainingPackageReference: { status: "missing", expected: {}, observed: {}, notes: [] },
      benchmarkReference: { status: "missing", expected: {}, observed: {}, notes: [] },
      modelImportReference: { status: "missing", expected: {}, observed: {}, notes: [] },
      hashSignature: { status: "missing", expected: {}, observed: {}, notes: [] },
      metadataCompleteness: { status: "missing", expected: {}, observed: {}, notes: [] },
      quarantineReasonQuality: { status: "missing", expected: {}, observed: {}, notes: [] },
      contractDriftRisk: "high",
    }),
    finalReviewSnapshot: parseJson<OfflineArtifactFinalReviewSnapshot>(row.finalReviewSnapshotJson, {
      finalReviewerDecision: "not_reviewed",
      archiveCompletenessStatus: "missing",
      exceptionClosureStatus: "open",
      evidenceConfidenceAccepted: false,
      signedAuditGovernanceFinalReviewHash: null,
      notes: [],
    }),
    safety,
    createdAt: String(row.createdAt || ""),
    createdByUserId: row.createdByUserId as string | number | null,
  };
};

const offlineArtifactValidationSelect = `
  SELECT id,
         artifact_id AS artifactId,
         artifact_hash AS artifactHash,
         artifact_kind AS artifactKind,
         schema_version AS schemaVersion,
         model_family AS modelFamily,
         validation_status AS validationStatus,
         trust_score AS trustScore,
         trust_label AS trustLabel,
         drift_risk AS driftRisk,
         findings_json AS findingsJson,
         compatibility_json AS compatibilityJson,
         final_review_snapshot_json AS finalReviewSnapshotJson,
         safety_gate_json AS safetyGateJson,
         created_at AS createdAt,
         created_by_user_id AS createdByUserId
  FROM offline_artifact_validation_results
`;

export const recordOfflineArtifactValidationResult = async (
  result: OfflineArtifactValidationResult,
  createdByUserId?: string | number | null,
): Promise<OfflineArtifactValidationRecord | null> => {
  const insertResult = await runAsync(
    `
      INSERT INTO offline_artifact_validation_results (
        artifact_id, artifact_hash, artifact_kind, schema_version, model_family,
        validation_status, trust_score, trust_label, drift_risk, findings_json,
        compatibility_json, final_review_snapshot_json, safety_gate_json, created_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      String(result.artifactId),
      result.artifactHash,
      result.artifactKind,
      result.schemaVersion,
      result.modelFamily,
      result.validationStatus,
      result.trustScore,
      result.trustLabel,
      result.driftRisk,
      safeJson(result.findings),
      safeJson(result.compatibility),
      safeJson(result.finalReviewSnapshot),
      safeJson(result.safety),
      createdByUserId == null ? null : String(createdByUserId),
    ],
  );
  return getOfflineArtifactValidationResultById(insertResult.lastID);
};

export const getOfflineArtifactValidationResultById = async (
  idInput: unknown,
): Promise<OfflineArtifactValidationRecord | null> => {
  const id = Number(idInput);
  if (!Number.isFinite(id) || id <= 0) return null;
  const row = await getAsync(`${offlineArtifactValidationSelect} WHERE id = ?`, [id]);
  return mapOfflineArtifactValidationRow(row);
};

export const listOfflineArtifactValidationResults = async (
  limitInput?: unknown,
): Promise<OfflineArtifactValidationRecord[]> => {
  const limit = clampLimit(limitInput, 50, 500);
  const rows = await allAsync(`${offlineArtifactValidationSelect} ORDER BY created_at DESC, id DESC LIMIT ?`, [limit]);
  return rows.map((row) => mapOfflineArtifactValidationRow(row)).filter((row): row is OfflineArtifactValidationRecord => row !== null);
};

export const getLatestOfflineArtifactValidationForArtifact = async (
  artifactIdInput: unknown,
): Promise<OfflineArtifactValidationRecord | null> => {
  const artifactId = String(artifactIdInput || "").trim();
  if (!artifactId) return null;
  const row = await getAsync(
    `${offlineArtifactValidationSelect} WHERE artifact_id = ? ORDER BY created_at DESC, id DESC LIMIT 1`,
    [artifactId],
  );
  return mapOfflineArtifactValidationRow(row);
};

export const getOfflineArtifactValidationSummary = async (): Promise<OfflineArtifactValidationSummary> => {
  const aggregate = await getAsync(`
    SELECT COUNT(*) AS totalValidationResults,
           SUM(CASE WHEN validation_status = 'pass' THEN 1 ELSE 0 END) AS passResults,
           SUM(CASE WHEN validation_status = 'warning' THEN 1 ELSE 0 END) AS warningResults,
           SUM(CASE WHEN validation_status = 'fail' THEN 1 ELSE 0 END) AS failResults,
           SUM(CASE WHEN validation_status = 'quarantined' THEN 1 ELSE 0 END) AS quarantinedResults,
           SUM(CASE WHEN validation_status = 'insufficient_metadata' THEN 1 ELSE 0 END) AS insufficientMetadataResults,
           SUM(CASE WHEN trust_label = 'trusted_candidate' THEN 1 ELSE 0 END) AS trustedCandidateResults,
           SUM(CASE WHEN trust_label = 'review_required' THEN 1 ELSE 0 END) AS reviewRequiredResults,
           SUM(CASE WHEN trust_label = 'quarantine_recommended' THEN 1 ELSE 0 END) AS quarantineRecommendedResults,
           SUM(CASE WHEN trust_label = 'reject_recommended' THEN 1 ELSE 0 END) AS rejectRecommendedResults,
           AVG(trust_score) AS averageTrustScore
    FROM offline_artifact_validation_results
  `).catch(() => null) as Record<string, unknown> | null;
  const latestValidation = (await listOfflineArtifactValidationResults(1))[0] || null;
  const latestFindings = latestValidation?.findings || [];
  const safety = buildOfflineArtifactValidationSafetyGate();
  return {
    totalValidationResults: Number(aggregate?.totalValidationResults || 0),
    passResults: Number(aggregate?.passResults || 0),
    warningResults: Number(aggregate?.warningResults || 0),
    failResults: Number(aggregate?.failResults || 0),
    quarantinedResults: Number(aggregate?.quarantinedResults || 0),
    insufficientMetadataResults: Number(aggregate?.insufficientMetadataResults || 0),
    trustedCandidateResults: Number(aggregate?.trustedCandidateResults || 0),
    reviewRequiredResults: Number(aggregate?.reviewRequiredResults || 0),
    quarantineRecommendedResults: Number(aggregate?.quarantineRecommendedResults || 0),
    rejectRecommendedResults: Number(aggregate?.rejectRecommendedResults || 0),
    criticalFindingResults: latestFindings.filter((finding) => finding.severity === "critical" && finding.status !== "pass").length,
    highFindingResults: latestFindings.filter((finding) => finding.severity === "high" && finding.status !== "pass").length,
    missingEvidenceResults: latestValidation?.compatibility.metadataCompleteness.missing?.length || 0,
    averageTrustScore: Math.round(Number(aggregate?.averageTrustScore || 0)),
    latestValidation,
    safety,
  };
};
