import { allAsync, getAsync, runAsync } from "../../query";
import { clampLimit, safeJson } from "./mlDbUtils";

type WorkbenchImportResultRow = Record<string, unknown> | undefined | null;

const parseJson = (value: unknown): unknown => {
  if (typeof value !== 'string') return value ?? null;
  try {
    return JSON.parse(value);
  } catch (_err) {
    return { parseError: true };
  }
};

const boolFromDb = (value: unknown): boolean => Number(value) === 1 || value === true;

const normalizeWorkbenchImportResultRow = (row: WorkbenchImportResultRow, includeSnapshots = false) => {
  if (!row) return null;
  const normalized = {
    id: Number(row.id),
    candidatePackageId: String(row.candidatePackageId ?? row.candidate_package_id ?? ''),
    modelKey: String(row.modelKey ?? row.model_key ?? ''),
    modelVersion: String(row.modelVersion ?? row.model_version ?? ''),
    predictionType: String(row.predictionType ?? row.prediction_type ?? ''),
    trainingPackageReference: String(row.trainingPackageReference ?? row.training_package_reference ?? '') || null,
    candidateManifestHash: String(row.candidateManifestHash ?? row.candidate_manifest_hash ?? '') || null,
    metricsSummary: parseJson(row.metricsSummaryJson ?? row.metrics_summary_json),
    evaluationSummary: parseJson(row.evaluationSummaryJson ?? row.evaluation_summary_json),
    modelCardReference: String(row.modelCardReference ?? row.model_card_reference ?? '') || null,
    checksumSummary: parseJson(row.checksumSummaryJson ?? row.checksum_summary_json),
    safetyPolicy: parseJson(row.safetyPolicyJson ?? row.safety_policy_json),
    validationStatus: String(row.validationStatus ?? row.validation_status ?? ''),
    validationScore: Number(row.validationScore ?? row.validation_score ?? 0),
    warningCount: Number(row.warningCount ?? row.warning_count ?? 0),
    errorCount: Number(row.errorCount ?? row.error_count ?? 0),
    forbiddenFieldCount: Number(row.forbiddenFieldCount ?? row.forbidden_field_count ?? 0),
    metadataOnly: boolFromDb(row.metadataOnly ?? row.metadata_only),
    modelBinaryPresent: boolFromDb(row.modelBinaryPresent ?? row.model_binary_present),
    rawCsvPresent: boolFromDb(row.rawCsvPresent ?? row.raw_csv_present),
    activationDirectivePresent: boolFromDb(row.activationDirectivePresent ?? row.activation_directive_present),
    inferenceDirectivePresent: boolFromDb(row.inferenceDirectivePresent ?? row.inference_directive_present),
    businessMutationDirectivePresent: boolFromDb(row.businessMutationDirectivePresent ?? row.business_mutation_directive_present),
    createdAt: String(row.createdAt ?? row.created_at ?? '') || null,
    createdByUserId: row.createdByUserId ?? row.created_by_user_id ?? null,
  };

  return includeSnapshots
    ? {
        ...normalized,
        payloadSnapshot: parseJson(row.payloadSnapshotJson ?? row.payload_snapshot_json),
        resultSnapshot: parseJson(row.resultSnapshotJson ?? row.result_snapshot_json),
      }
    : normalized;
};

const selectBase = `
  SELECT id,
         candidate_package_id AS candidatePackageId,
         model_key AS modelKey,
         model_version AS modelVersion,
         prediction_type AS predictionType,
         training_package_reference AS trainingPackageReference,
         candidate_manifest_hash AS candidateManifestHash,
         metrics_summary_json AS metricsSummaryJson,
         evaluation_summary_json AS evaluationSummaryJson,
         model_card_reference AS modelCardReference,
         checksum_summary_json AS checksumSummaryJson,
         safety_policy_json AS safetyPolicyJson,
         validation_status AS validationStatus,
         validation_score AS validationScore,
         warning_count AS warningCount,
         error_count AS errorCount,
         forbidden_field_count AS forbiddenFieldCount,
         metadata_only AS metadataOnly,
         model_binary_present AS modelBinaryPresent,
         raw_csv_present AS rawCsvPresent,
         activation_directive_present AS activationDirectivePresent,
         inference_directive_present AS inferenceDirectivePresent,
         business_mutation_directive_present AS businessMutationDirectivePresent,
         created_at AS createdAt,
         created_by_user_id AS createdByUserId
  FROM ml_workbench_import_results
`;

const selectDetail = `
  SELECT id,
         candidate_package_id AS candidatePackageId,
         model_key AS modelKey,
         model_version AS modelVersion,
         prediction_type AS predictionType,
         training_package_reference AS trainingPackageReference,
         candidate_manifest_hash AS candidateManifestHash,
         metrics_summary_json AS metricsSummaryJson,
         evaluation_summary_json AS evaluationSummaryJson,
         model_card_reference AS modelCardReference,
         checksum_summary_json AS checksumSummaryJson,
         safety_policy_json AS safetyPolicyJson,
         validation_status AS validationStatus,
         validation_score AS validationScore,
         warning_count AS warningCount,
         error_count AS errorCount,
         forbidden_field_count AS forbiddenFieldCount,
         metadata_only AS metadataOnly,
         model_binary_present AS modelBinaryPresent,
         raw_csv_present AS rawCsvPresent,
         activation_directive_present AS activationDirectivePresent,
         inference_directive_present AS inferenceDirectivePresent,
         business_mutation_directive_present AS businessMutationDirectivePresent,
         payload_snapshot_json AS payloadSnapshotJson,
         result_snapshot_json AS resultSnapshotJson,
         created_at AS createdAt,
         created_by_user_id AS createdByUserId
  FROM ml_workbench_import_results
`;

export const recordWorkbenchImportResult = async (payload: {
  candidatePackageId: string;
  modelKey: string;
  modelVersion: string;
  predictionType: string;
  trainingPackageReference?: string | null;
  candidateManifestHash?: string | null;
  metricsSummary?: unknown;
  evaluationSummary?: unknown;
  modelCardReference?: string | null;
  checksumSummary?: unknown;
  safetyPolicy?: unknown;
  validationStatus: string;
  validationScore?: number | null;
  warningCount?: number | null;
  errorCount?: number | null;
  forbiddenFieldCount?: number | null;
  payloadSnapshot?: unknown;
  resultSnapshot?: unknown;
  createdByUserId?: number | null;
}) => {
  const result = await runAsync(
    `
      INSERT INTO ml_workbench_import_results (
        candidate_package_id, model_key, model_version, prediction_type,
        training_package_reference, candidate_manifest_hash, metrics_summary_json,
        evaluation_summary_json, model_card_reference, checksum_summary_json,
        safety_policy_json, validation_status, validation_score, warning_count,
        error_count, forbidden_field_count, metadata_only, model_binary_present,
        raw_csv_present, activation_directive_present, inference_directive_present,
        business_mutation_directive_present, payload_snapshot_json, result_snapshot_json,
        created_by_user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 0, 0, 0, 0, ?, ?, ?)
    `,
    [
      payload.candidatePackageId,
      payload.modelKey,
      payload.modelVersion,
      payload.predictionType,
      payload.trainingPackageReference || null,
      payload.candidateManifestHash || null,
      safeJson(payload.metricsSummary ?? {}),
      safeJson(payload.evaluationSummary ?? {}),
      payload.modelCardReference || null,
      safeJson(payload.checksumSummary ?? {}),
      safeJson(payload.safetyPolicy ?? {}),
      payload.validationStatus,
      payload.validationScore ?? null,
      payload.warningCount ?? 0,
      payload.errorCount ?? 0,
      payload.forbiddenFieldCount ?? 0,
      safeJson(payload.payloadSnapshot ?? {}),
      safeJson(payload.resultSnapshot ?? {}),
      payload.createdByUserId || null,
    ],
  );

  return getWorkbenchImportResultById(result.lastID);
};

export const listWorkbenchImportResults = async (limitInput?: unknown) => {
  const limit = clampLimit(limitInput, 20, 100);
  const rows = await allAsync(`${selectBase} ORDER BY created_at DESC, id DESC LIMIT ?`, [limit]);
  return rows.map((row) => normalizeWorkbenchImportResultRow(row));
};

export const getWorkbenchImportResultById = async (idInput: unknown) => {
  const id = Number(idInput);
  if (!Number.isFinite(id) || id <= 0) return null;
  const row = await getAsync(`${selectDetail} WHERE id = ?`, [id]);
  return normalizeWorkbenchImportResultRow(row, true);
};

export const getWorkbenchImportResultByCandidatePackageId = async (candidatePackageIdInput: unknown) => {
  const candidatePackageId = String(candidatePackageIdInput ?? '').trim();
  if (!candidatePackageId) return null;
  const row = await getAsync(
    `${selectDetail} WHERE candidate_package_id = ? ORDER BY created_at DESC, id DESC LIMIT 1`,
    [candidatePackageId],
  );
  return normalizeWorkbenchImportResultRow(row, true);
};

export const getLatestWorkbenchImportResult = async () => {
  const row = await getAsync(`${selectDetail} ORDER BY created_at DESC, id DESC LIMIT 1`);
  return normalizeWorkbenchImportResultRow(row, true);
};

export const getWorkbenchImportResultSummary = async () => {
  const summary = await getAsync(
    `
      SELECT COUNT(*) AS historyCount,
             SUM(CASE WHEN validation_status LIKE '%ready%' OR validation_status = 'pass' THEN 1 ELSE 0 END) AS readyCount,
             SUM(CASE WHEN validation_status LIKE '%warning%' THEN 1 ELSE 0 END) AS warningStatusCount,
             SUM(CASE WHEN validation_status LIKE '%rejected%' OR validation_status LIKE '%block%' THEN 1 ELSE 0 END) AS rejectedCount,
             SUM(warning_count) AS warningCount,
             SUM(error_count) AS errorCount,
             SUM(forbidden_field_count) AS forbiddenFieldCount,
             SUM(CASE WHEN metadata_only = 1 AND model_binary_present = 0 AND raw_csv_present = 0 AND activation_directive_present = 0 AND inference_directive_present = 0 AND business_mutation_directive_present = 0 THEN 1 ELSE 0 END) AS safeMetadataCount
      FROM ml_workbench_import_results
    `,
  );
  const latest = await getLatestWorkbenchImportResult();

  return {
    historyCount: Number(summary?.historyCount ?? 0),
    validationStatusDistribution: {
      ready: Number(summary?.readyCount ?? 0),
      warning: Number(summary?.warningStatusCount ?? 0),
      rejected: Number(summary?.rejectedCount ?? 0),
    },
    warningCount: Number(summary?.warningCount ?? 0),
    errorCount: Number(summary?.errorCount ?? 0),
    forbiddenFieldCount: Number(summary?.forbiddenFieldCount ?? 0),
    safeMetadataCount: Number(summary?.safeMetadataCount ?? 0),
    latestCandidatePackageId: latest?.candidatePackageId ?? null,
    latestValidationStatus: latest?.validationStatus ?? null,
    latestChecksumStatus: latest?.checksumSummary ? 'metadata_available' : 'missing_metadata',
    latestSafetyPolicyStatus: latest?.metadataOnly === true && latest?.modelBinaryPresent === false ? 'metadata_only_safe' : 'metadata_only_proof_failed',
    metadataOnly: true,
    modelExecutionAllowed: false,
    inferenceEndpointExposed: false,
    artifactActivationAllowed: false,
    canMutateBusinessRecords: false,
  };
};

/* Phase 11D anchors: ml_workbench_import_results, recordWorkbenchImportResult, listWorkbenchImportResults, getWorkbenchImportResultById, getWorkbenchImportResultByCandidatePackageId, getWorkbenchImportResultSummary, getLatestWorkbenchImportResult, metadata-only persistence, no model bytes, no raw CSV, no inference, no activation, no business mutation. */
