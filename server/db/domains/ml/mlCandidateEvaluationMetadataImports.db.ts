import { allAsync, getAsync, runAsync } from "../../query";
import { clampLimit, safeJson } from "./mlDbUtils";

export const recordMlCandidateEvaluationMetadataImport = async (payload: {
  importKey: string;
  importVersion: string;
  candidatePackageId: string;
  modelKey: string;
  modelVersion: string;
  modelFamily?: string | null;
  predictionType: string;
  targetColumn?: string | null;
  horizonDays?: number | null;
  trainingManifestHash?: string | null;
  validationStatus: string;
  metricsStatus: string;
  outputContractStatus: string;
  safetyPolicyStatus: string;
  metadataImportStatus: string;
  accuracy?: number | null;
  precisionScore?: number | null;
  recallScore?: number | null;
  f1?: number | null;
  rocAuc?: number | null;
  mae?: number | null;
  rmse?: number | null;
  r2?: number | null;
  candidateManifest: Record<string, unknown>;
  modelCard: Record<string, unknown>;
  metrics: Record<string, unknown>;
  evaluationReport: Record<string, unknown>;
  candidateOutputSample: unknown;
  checksums: Record<string, unknown>;
  trainingPackageValidationReport?: Record<string, unknown> | null;
  importSummary: Record<string, unknown>;
  safetyPolicy: Record<string, unknown>;
  userId?: number | null;
}) => {
  const result = await runAsync(
    `
      INSERT INTO ml_candidate_evaluation_metadata_imports (
        import_key, import_version, candidate_package_id, model_key, model_version,
        model_family, prediction_type, target_column, horizon_days, training_manifest_hash,
        validation_status, metrics_status, output_contract_status, safety_policy_status,
        metadata_import_status, accuracy, precision_score, recall_score, f1, roc_auc,
        mae, rmse, r2, candidate_manifest_json, model_card_json, metrics_json,
        evaluation_report_json, candidate_output_sample_json, checksums_json,
        training_package_validation_report_json, import_summary_json, safety_policy_json, user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.importKey,
      payload.importVersion,
      payload.candidatePackageId,
      payload.modelKey,
      payload.modelVersion,
      payload.modelFamily || null,
      payload.predictionType,
      payload.targetColumn || null,
      payload.horizonDays ?? null,
      payload.trainingManifestHash || null,
      payload.validationStatus,
      payload.metricsStatus,
      payload.outputContractStatus,
      payload.safetyPolicyStatus,
      payload.metadataImportStatus,
      payload.accuracy ?? null,
      payload.precisionScore ?? null,
      payload.recallScore ?? null,
      payload.f1 ?? null,
      payload.rocAuc ?? null,
      payload.mae ?? null,
      payload.rmse ?? null,
      payload.r2 ?? null,
      safeJson(payload.candidateManifest),
      safeJson(payload.modelCard),
      safeJson(payload.metrics),
      safeJson(payload.evaluationReport),
      safeJson(payload.candidateOutputSample),
      safeJson(payload.checksums),
      payload.trainingPackageValidationReport ? safeJson(payload.trainingPackageValidationReport) : null,
      safeJson(payload.importSummary),
      safeJson(payload.safetyPolicy),
      payload.userId || null,
    ],
  );
  return getAsync(`SELECT * FROM ml_candidate_evaluation_metadata_imports WHERE id = ?`, [result.lastID]);
};

export const listMlCandidateEvaluationMetadataImports = async (limitInput?: unknown) => {
  const limit = clampLimit(limitInput, 10, 100);
  return allAsync(
    `
      SELECT id,
             import_key AS importKey,
             import_version AS importVersion,
             candidate_package_id AS candidatePackageId,
             model_key AS modelKey,
             model_version AS modelVersion,
             model_family AS modelFamily,
             prediction_type AS predictionType,
             target_column AS targetColumn,
             horizon_days AS horizonDays,
             training_manifest_hash AS trainingManifestHash,
             validation_status AS validationStatus,
             metrics_status AS metricsStatus,
             output_contract_status AS outputContractStatus,
             safety_policy_status AS safetyPolicyStatus,
             metadata_import_status AS metadataImportStatus,
             accuracy, precision_score AS precisionScore, recall_score AS recallScore,
             f1, roc_auc AS rocAuc, mae, rmse, r2,
             created_at AS createdAt,
             user_id AS userId
      FROM ml_candidate_evaluation_metadata_imports
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [limit],
  );
};

export const getMlCandidateEvaluationMetadataImportById = async (idInput: unknown) => {
  const id = Number(idInput);
  if (!Number.isFinite(id) || id <= 0) return null;
  return getAsync(
    `
      SELECT id,
             import_key AS importKey,
             import_version AS importVersion,
             candidate_package_id AS candidatePackageId,
             model_key AS modelKey,
             model_version AS modelVersion,
             model_family AS modelFamily,
             prediction_type AS predictionType,
             target_column AS targetColumn,
             horizon_days AS horizonDays,
             training_manifest_hash AS trainingManifestHash,
             validation_status AS validationStatus,
             metrics_status AS metricsStatus,
             output_contract_status AS outputContractStatus,
             safety_policy_status AS safetyPolicyStatus,
             metadata_import_status AS metadataImportStatus,
             accuracy, precision_score AS precisionScore, recall_score AS recallScore,
             f1, roc_auc AS rocAuc, mae, rmse, r2,
             candidate_manifest_json AS candidateManifestJson,
             model_card_json AS modelCardJson,
             metrics_json AS metricsJson,
             evaluation_report_json AS evaluationReportJson,
             candidate_output_sample_json AS candidateOutputSampleJson,
             checksums_json AS checksumsJson,
             training_package_validation_report_json AS trainingPackageValidationReportJson,
             import_summary_json AS importSummaryJson,
             safety_policy_json AS safetyPolicyJson,
             created_at AS createdAt,
             user_id AS userId
      FROM ml_candidate_evaluation_metadata_imports
      WHERE id = ?
    `,
    [id],
  );
};

/* Phase 9B anchors: ml_candidate_evaluation_metadata_imports, recordMlCandidateEvaluationMetadataImport, listMlCandidateEvaluationMetadataImports, metadata-only candidate evaluation report import. */
