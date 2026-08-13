import { allAsync, getAsync, runAsync } from '../../../query';
import type { SqliteBindValue } from '../../../query';
import { clampLimit, safeJson } from '../mlDbUtils';
import {
  type ShadowScoreMetadataBatchWriteResult,
  type ShadowScoreMetadataRecordWriteResult,
  type ShadowScoreMetadataScoreRole,
  type ShadowScoreMetadataStorageRecordInput,
  type ShadowScoreMetadataStorageValidationReport,
  type StoredShadowScoreMetadataRecord,
} from '../../../../intelligence/shadowScores/shadowScoreMetadataStorageTypes';

const parseJson = (value: unknown): unknown => {
  if (typeof value !== 'string') return value ?? null;
  try {
    return JSON.parse(value);
  } catch (_err) {
    return { parseError: true };
  }
};

const boolFromDb = (value: unknown): boolean => Number(value) === 1 || value === true;

const boolToSafeInteger = (value: unknown, defaultValue: boolean): 0 | 1 => {
  if (value === undefined || value === null) return defaultValue ? 1 : 0;
  return value === true || value === 1 || value === '1' ? 1 : 0;
};

const finiteNumberOrNull = (value: unknown): number | null => {
  if (value === undefined || value === null || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const finiteIntegerOrNull = (value: unknown): number | null => {
  const numeric = finiteNumberOrNull(value);
  return numeric === null ? null : Math.trunc(numeric);
};

const normalizeString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
const nullableString = (value: unknown): string | null => {
  const normalized = normalizeString(value);
  return normalized.length > 0 ? normalized : null;
};
const normalizeRole = (value: unknown): ShadowScoreMetadataScoreRole => value === 'baseline' ? 'baseline' : 'candidate';

const normalizeRecordRow = (row: Record<string, unknown> | undefined | null): StoredShadowScoreMetadataRecord | null => {
  if (!row) return null;
  return {
    id: Number(row.id ?? 0),
    importFixtureId: String(row.importFixtureId ?? row.import_fixture_id ?? ''),
    candidatePackageId: String(row.candidatePackageId ?? row.candidate_package_id ?? ''),
    scoreRole: normalizeRole(row.scoreRole ?? row.score_role),
    baselineSource: nullableString(row.baselineSource ?? row.baseline_source),
    baselineKey: nullableString(row.baselineKey ?? row.baseline_key),
    baselineVersion: nullableString(row.baselineVersion ?? row.baseline_version),
    baselineGeneratedAt: nullableString(row.baselineGeneratedAt ?? row.baseline_generated_at),
    baselinePayloadHash: nullableString(row.baselinePayloadHash ?? row.baseline_payload_hash),
    baselineValidationStatus: nullableString(row.baselineValidationStatus ?? row.baseline_validation_status),
    baselinePayload: parseJson(row.baselinePayloadJson ?? row.baseline_payload_json),
    modelKey: String(row.modelKey ?? row.model_key ?? ''),
    modelVersion: String(row.modelVersion ?? row.model_version ?? ''),
    predictionType: String(row.predictionType ?? row.prediction_type ?? ''),
    horizonDays: finiteIntegerOrNull(row.horizonDays ?? row.horizon_days),
    entityType: String(row.entityType ?? row.entity_type ?? ''),
    entityId: String(row.entityId ?? row.entity_id ?? ''),
    sourceRowIndex: Number(row.sourceRowIndex ?? row.source_row_index ?? 0),
    score: finiteNumberOrNull(row.score),
    label: nullableString(row.label),
    confidence: finiteNumberOrNull(row.confidence),
    scoreGeneratedAt: nullableString(row.scoreGeneratedAt ?? row.score_generated_at),
    scoreSource: String(row.scoreSource ?? row.score_source ?? ''),
    offlineExecutionReportHash: nullableString(row.offlineExecutionReportHash ?? row.offline_execution_report_hash),
    candidateScoreOutputHash: nullableString(row.candidateScoreOutputHash ?? row.candidate_score_output_hash),
    shadowScoreExportHash: nullableString(row.shadowScoreExportHash ?? row.shadow_score_export_hash),
    importPayloadHash: String(row.importPayloadHash ?? row.import_payload_hash ?? ''),
    metadataOnly: boolFromDb(row.metadataOnly ?? row.metadata_only),
    modelBinaryPresent: boolFromDb(row.modelBinaryPresent ?? row.model_binary_present),
    rawCsvPresent: boolFromDb(row.rawCsvPresent ?? row.raw_csv_present),
    inferenceDirectivePresent: boolFromDb(row.inferenceDirectivePresent ?? row.inference_directive_present),
    activationDirectivePresent: boolFromDb(row.activationDirectivePresent ?? row.activation_directive_present),
    businessMutationDirectivePresent: boolFromDb(row.businessMutationDirectivePresent ?? row.business_mutation_directive_present),
    forbiddenFieldCount: Number(row.forbiddenFieldCount ?? row.forbidden_field_count ?? 0),
    validationStatus: String(row.validationStatus ?? row.validation_status ?? ''),
    validationReport: parseJson(row.validationReportJson ?? row.validation_report_json),
    scorePayload: parseJson(row.scorePayloadJson ?? row.score_payload_json),
    safetyPolicy: parseJson(row.safetyPolicyJson ?? row.safety_policy_json),
    createdAt: String(row.createdAt ?? row.created_at ?? ''),
    createdByUserId: finiteIntegerOrNull(row.createdByUserId ?? row.created_by_user_id),
  };
};

const selectBase = `
  SELECT id,
         import_fixture_id AS importFixtureId,
         candidate_package_id AS candidatePackageId,
         score_role AS scoreRole,
         baseline_source AS baselineSource,
         baseline_key AS baselineKey,
         baseline_version AS baselineVersion,
         baseline_generated_at AS baselineGeneratedAt,
         baseline_payload_hash AS baselinePayloadHash,
         baseline_validation_status AS baselineValidationStatus,
         baseline_payload_json AS baselinePayloadJson,
         model_key AS modelKey,
         model_version AS modelVersion,
         prediction_type AS predictionType,
         horizon_days AS horizonDays,
         entity_type AS entityType,
         entity_id AS entityId,
         source_row_index AS sourceRowIndex,
         score,
         label,
         confidence,
         score_generated_at AS scoreGeneratedAt,
         score_source AS scoreSource,
         offline_execution_report_hash AS offlineExecutionReportHash,
         candidate_score_output_hash AS candidateScoreOutputHash,
         shadow_score_export_hash AS shadowScoreExportHash,
         import_payload_hash AS importPayloadHash,
         metadata_only AS metadataOnly,
         model_binary_present AS modelBinaryPresent,
         raw_csv_present AS rawCsvPresent,
         inference_directive_present AS inferenceDirectivePresent,
         activation_directive_present AS activationDirectivePresent,
         business_mutation_directive_present AS businessMutationDirectivePresent,
         forbidden_field_count AS forbiddenFieldCount,
         validation_status AS validationStatus,
         validation_report_json AS validationReportJson,
         score_payload_json AS scorePayloadJson,
         safety_policy_json AS safetyPolicyJson,
         created_at AS createdAt,
         created_by_user_id AS createdByUserId
  FROM ml_shadow_score_metadata_records
`;

const rejectResult = (
  reason: string,
  validation: ShadowScoreMetadataStorageValidationReport | null = null,
): ShadowScoreMetadataRecordWriteResult => ({
  status: 'fail',
  inserted: false,
  duplicate: false,
  rejected: true,
  reason,
  record: null,
  validation,
});

const isSafeRecordInput = (payload: ShadowScoreMetadataStorageRecordInput): { safe: boolean; reason: string | null } => {
  const role = normalizeRole(payload.scoreRole);
  if (!normalizeString(payload.importFixtureId)) return { safe: false, reason: 'import_fixture_id_missing' };
  if (!normalizeString(payload.candidatePackageId)) return { safe: false, reason: 'candidate_package_id_missing' };
  if (role === 'baseline' && !normalizeString(payload.baselineSource)) return { safe: false, reason: 'baseline_source_missing' };
  if (role === 'baseline' && !normalizeString(payload.baselineKey)) return { safe: false, reason: 'baseline_key_missing' };
  if (!normalizeString(payload.modelKey)) return { safe: false, reason: 'model_key_missing' };
  if (!normalizeString(payload.modelVersion)) return { safe: false, reason: 'model_version_missing' };
  if (!normalizeString(payload.predictionType)) return { safe: false, reason: 'prediction_type_missing' };
  if (!normalizeString(payload.entityType)) return { safe: false, reason: 'entity_type_missing' };
  if (!normalizeString(payload.entityId)) return { safe: false, reason: 'entity_id_missing' };
  if (!normalizeString(payload.importPayloadHash)) return { safe: false, reason: 'import_payload_hash_missing' };

  if (boolToSafeInteger(payload.metadataOnly, true) !== 1) return { safe: false, reason: 'metadata_only_must_be_true' };
  if (boolToSafeInteger(payload.modelBinaryPresent, false) !== 0) return { safe: false, reason: 'model_binary_present_must_be_false' };
  if (boolToSafeInteger(payload.rawCsvPresent, false) !== 0) return { safe: false, reason: 'raw_csv_present_must_be_false' };
  if (boolToSafeInteger(payload.inferenceDirectivePresent, false) !== 0) return { safe: false, reason: 'inference_directive_present_must_be_false' };
  if (boolToSafeInteger(payload.activationDirectivePresent, false) !== 0) return { safe: false, reason: 'activation_directive_present_must_be_false' };
  if (boolToSafeInteger(payload.businessMutationDirectivePresent, false) !== 0) {
    return { safe: false, reason: 'business_mutation_directive_present_must_be_false' };
  }

  const policy = payload.safetyPolicy as Record<string, unknown> | null | undefined;
  if (policy && typeof policy === 'object') {
    for (const key of [
      'modelExecutionAllowed',
      'runtimeInvocationAllowed',
      'inferenceEndpointExposed',
      'productionIntegrationAllowed',
      'decisionAutomationAllowed',
      'canChangeInventoryOrAccounting',
      'canChangePricing',
      'canChangeReports',
      'canChangeLedger',
      'canMutateBusinessRecords',
      'artifactExecutionAllowed',
      'artifactActivationAllowed',
      'artifactBytesLoadingAllowed',
      'rawTrainingCsvLoadingAllowed',
      'automaticDeletionAllowed',
      'purgeJobAllowed',
    ]) {
      if (policy[key] === true) return { safe: false, reason: `${key}_must_be_false` };
    }
  }

  return { safe: true, reason: null };
};

const getByIdempotency = async (
  scoreRole: ShadowScoreMetadataScoreRole,
  candidatePackageId: string,
  importPayloadHash: string,
  sourceRowIndex: number,
): Promise<StoredShadowScoreMetadataRecord | null> => {
  const row = await getAsync(
    `${selectBase} WHERE score_role = ? AND candidate_package_id = ? AND import_payload_hash = ? AND source_row_index = ? LIMIT 1`,
    [scoreRole, candidatePackageId, importPayloadHash, sourceRowIndex],
  );
  return normalizeRecordRow(row);
};

export const recordShadowScoreMetadataRecord = async (
  payload: ShadowScoreMetadataStorageRecordInput,
): Promise<ShadowScoreMetadataRecordWriteResult> => {
  const safety = isSafeRecordInput(payload);
  if (!safety.safe) return rejectResult(safety.reason ?? 'unsafe_metadata_record');

  const scoreRole = normalizeRole(payload.scoreRole);
  const sourceRowIndex = Number.isFinite(Number(payload.sourceRowIndex)) ? Math.trunc(Number(payload.sourceRowIndex)) : 0;

  const insertResult = await runAsync(
    `
      INSERT OR IGNORE INTO ml_shadow_score_metadata_records (
        import_fixture_id,
        candidate_package_id,
        score_role,
        baseline_source,
        baseline_key,
        baseline_version,
        baseline_generated_at,
        baseline_payload_hash,
        baseline_validation_status,
        baseline_payload_json,
        model_key,
        model_version,
        prediction_type,
        horizon_days,
        entity_type,
        entity_id,
        source_row_index,
        score,
        label,
        confidence,
        score_generated_at,
        score_source,
        offline_execution_report_hash,
        candidate_score_output_hash,
        shadow_score_export_hash,
        import_payload_hash,
        metadata_only,
        model_binary_present,
        raw_csv_present,
        inference_directive_present,
        activation_directive_present,
        business_mutation_directive_present,
        forbidden_field_count,
        validation_status,
        validation_report_json,
        score_payload_json,
        safety_policy_json,
        created_by_user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 0, 0, 0, 0, ?, ?, ?, ?, ?, ?)
    `,
    [
      payload.importFixtureId,
      payload.candidatePackageId,
      scoreRole,
      nullableString(payload.baselineSource),
      nullableString(payload.baselineKey),
      nullableString(payload.baselineVersion),
      nullableString(payload.baselineGeneratedAt),
      nullableString(payload.baselinePayloadHash),
      nullableString(payload.baselineValidationStatus),
      safeJson(payload.baselinePayload ?? {}),
      payload.modelKey,
      payload.modelVersion,
      payload.predictionType,
      finiteIntegerOrNull(payload.horizonDays),
      payload.entityType,
      payload.entityId,
      sourceRowIndex,
      finiteNumberOrNull(payload.score),
      nullableString(payload.label),
      finiteNumberOrNull(payload.confidence),
      nullableString(payload.scoreGeneratedAt),
      nullableString(payload.scoreSource) ?? (scoreRole === 'baseline' ? 'metadata_only_baseline_score_storage' : 'metadata_only_shadow_score_import_fixture'),
      nullableString(payload.offlineExecutionReportHash),
      nullableString(payload.candidateScoreOutputHash),
      nullableString(payload.shadowScoreExportHash),
      payload.importPayloadHash,
      finiteIntegerOrNull(payload.forbiddenFieldCount) ?? 0,
      nullableString(payload.validationStatus) ?? (scoreRole === 'baseline' ? 'stored_baseline_metadata_only' : 'stored_metadata_only'),
      safeJson(payload.validationReport ?? {}),
      safeJson(payload.scorePayload ?? {}),
      safeJson(payload.safetyPolicy ?? {}),
      finiteIntegerOrNull(payload.createdByUserId),
    ],
  );

  const record = await getByIdempotency(scoreRole, payload.candidatePackageId, payload.importPayloadHash, sourceRowIndex);
  if (!record) return rejectResult('insert_failed_or_record_missing');

  const inserted = Number(insertResult.changes ?? 0) > 0;

  return {
    status: 'pass',
    inserted,
    duplicate: !inserted,
    rejected: false,
    reason: null,
    record,
    validation: null,
  };
};

export const recordShadowScoreMetadataBatch = async (
  records: ShadowScoreMetadataStorageRecordInput[],
): Promise<ShadowScoreMetadataBatchWriteResult> => {
  const results: ShadowScoreMetadataRecordWriteResult[] = [];
  const storedRecords: StoredShadowScoreMetadataRecord[] = [];

  for (const recordInput of records) {
    const scoreRole = normalizeRole(recordInput.scoreRole);
    const before = await getByIdempotency(
      scoreRole,
      recordInput.candidatePackageId,
      recordInput.importPayloadHash,
      Number.isFinite(Number(recordInput.sourceRowIndex)) ? Math.trunc(Number(recordInput.sourceRowIndex)) : 0,
    );
    const result = await recordShadowScoreMetadataRecord(recordInput);
    const duplicate = Boolean(before && result.record?.id === before.id);
    const normalizedResult = duplicate ? { ...result, inserted: false, duplicate: true } : result;
    results.push(normalizedResult);
    if (normalizedResult.record) storedRecords.push(normalizedResult.record);
  }

  const rejectedCount = results.filter((result) => result.rejected).length;
  const duplicateCount = results.filter((result) => result.duplicate).length;
  const insertedCount = results.filter((result) => result.inserted).length;

  return {
    status: rejectedCount > 0 ? 'fail' : 'pass',
    requestedCount: records.length,
    insertedCount,
    duplicateCount,
    rejectedCount,
    records: storedRecords,
    results,
  };
};

export const listShadowScoreMetadataRecords = async (options: {
  candidatePackageId?: unknown;
  scoreRole?: unknown;
  validationStatus?: unknown;
  limit?: unknown;
} = {}): Promise<StoredShadowScoreMetadataRecord[]> => {
  const where: string[] = [];
  const params: SqliteBindValue[] = [];
  const candidatePackageId = normalizeString(options.candidatePackageId);
  const scoreRole = options.scoreRole === 'candidate' || options.scoreRole === 'baseline' ? String(options.scoreRole) : '';
  const validationStatus = normalizeString(options.validationStatus);

  if (candidatePackageId) {
    where.push('candidate_package_id = ?');
    params.push(candidatePackageId);
  }
  if (scoreRole) {
    where.push('score_role = ?');
    params.push(scoreRole);
  }
  if (validationStatus) {
    where.push('validation_status = ?');
    params.push(validationStatus);
  }

  const limit = clampLimit(options.limit, 50, 500);
  params.push(limit);

  const rows = await allAsync(
    `${selectBase}${where.length ? ` WHERE ${where.join(' AND ')}` : ''} ORDER BY created_at DESC, id DESC LIMIT ?`,
    params,
  );
  return rows.map((row) => normalizeRecordRow(row)).filter((row): row is StoredShadowScoreMetadataRecord => Boolean(row));
};

export const getShadowScoreMetadataRecordById = async (idInput: unknown): Promise<StoredShadowScoreMetadataRecord | null> => {
  const id = Number(idInput);
  if (!Number.isFinite(id) || id <= 0) return null;
  const row = await getAsync(`${selectBase} WHERE id = ? LIMIT 1`, [Math.trunc(id)]);
  return normalizeRecordRow(row);
};

export const getShadowScoreMetadataRecordsByCandidatePackageId = async (
  candidatePackageIdInput: unknown,
): Promise<StoredShadowScoreMetadataRecord[]> => {
  const candidatePackageId = normalizeString(candidatePackageIdInput);
  if (!candidatePackageId) return [];
  return listShadowScoreMetadataRecords({ candidatePackageId, scoreRole: 'candidate', limit: 500 });
};

export const getLatestShadowScoreMetadataRecord = async (): Promise<StoredShadowScoreMetadataRecord | null> => {
  const row = await getAsync(`${selectBase} WHERE score_role = 'candidate' ORDER BY created_at DESC, id DESC LIMIT 1`);
  return normalizeRecordRow(row);
};

export const getShadowScoreMetadataSummary = async () => {
  const summary = await getAsync(
    `
      SELECT COUNT(*) AS recordCount,
             COUNT(DISTINCT candidate_package_id) AS candidatePackageCount,
             SUM(CASE WHEN metadata_only = 1 AND model_binary_present = 0 AND raw_csv_present = 0 AND inference_directive_present = 0 AND activation_directive_present = 0 AND business_mutation_directive_present = 0 THEN 1 ELSE 0 END) AS safeMetadataOnlyCount,
             SUM(CASE WHEN model_binary_present != 0 OR raw_csv_present != 0 OR inference_directive_present != 0 OR activation_directive_present != 0 OR business_mutation_directive_present != 0 THEN 1 ELSE 0 END) AS unsafeFlagCount,
             SUM(forbidden_field_count) AS forbiddenFieldCount,
             SUM(CASE WHEN score_role = 'candidate' THEN 1 ELSE 0 END) AS candidateRecordCount,
             SUM(CASE WHEN score_role = 'baseline' THEN 1 ELSE 0 END) AS baselineRecordCount,
             SUM(CASE WHEN validation_status = 'stored_metadata_only' THEN 1 ELSE 0 END) AS storedCount,
             SUM(CASE WHEN validation_status = 'stored_metadata_only_with_warnings' THEN 1 ELSE 0 END) AS warningCount
      FROM ml_shadow_score_metadata_records
    `,
  );
  const latest = await getLatestShadowScoreMetadataRecord();

  return {
    recordCount: Number(summary?.recordCount ?? 0),
    candidatePackageCount: Number(summary?.candidatePackageCount ?? 0),
    candidateRecordCount: Number(summary?.candidateRecordCount ?? 0),
    baselineRecordCount: Number(summary?.baselineRecordCount ?? 0),
    safeMetadataOnlyCount: Number(summary?.safeMetadataOnlyCount ?? 0),
    unsafeFlagCount: Number(summary?.unsafeFlagCount ?? 0),
    forbiddenFieldCount: Number(summary?.forbiddenFieldCount ?? 0),
    validationStatusDistribution: {
      stored: Number(summary?.storedCount ?? 0),
      warning: Number(summary?.warningCount ?? 0),
    },
    latestRecordId: latest?.id ?? null,
    latestCandidatePackageId: latest?.candidatePackageId ?? null,
    latestValidationStatus: latest?.validationStatus ?? null,
    metadataOnly: true,
    modelExecutionAllowed: false,
    inferenceEndpointExposed: false,
    artifactActivationAllowed: false,
    canChangeInventoryOrAccounting: false,
    canChangePricing: false,
    canChangeReports: false,
    canChangeLedger: false,
    canMutateBusinessRecords: false,
  };
};

export const recordBaselineScoreMetadataRecord = async (
  payload: ShadowScoreMetadataStorageRecordInput,
): Promise<ShadowScoreMetadataRecordWriteResult> => recordShadowScoreMetadataRecord({
  ...payload,
  scoreRole: 'baseline',
  scoreSource: nullableString(payload.scoreSource) ?? 'metadata_only_baseline_score_storage',
  validationStatus: nullableString(payload.validationStatus) ?? 'stored_baseline_metadata_only',
});

export const recordBaselineScoreMetadataBatch = async (
  records: ShadowScoreMetadataStorageRecordInput[],
): Promise<ShadowScoreMetadataBatchWriteResult> => recordShadowScoreMetadataBatch(records.map((record) => ({
  ...record,
  scoreRole: 'baseline',
  scoreSource: nullableString(record.scoreSource) ?? 'metadata_only_baseline_score_storage',
  validationStatus: nullableString(record.validationStatus) ?? 'stored_baseline_metadata_only',
})));

export const listBaselineScoreMetadataRecords = async (options: {
  baselineKey?: unknown;
  baselineSource?: unknown;
  predictionType?: unknown;
  horizonDays?: unknown;
  entityType?: unknown;
  limit?: unknown;
} = {}): Promise<StoredShadowScoreMetadataRecord[]> => {
  const where = [`score_role = 'baseline'`];
  const params: SqliteBindValue[] = [];
  const baselineKey = normalizeString(options.baselineKey);
  const baselineSource = normalizeString(options.baselineSource);
  const predictionType = normalizeString(options.predictionType);
  const horizonDays = finiteIntegerOrNull(options.horizonDays);
  const entityType = normalizeString(options.entityType);

  if (baselineKey) {
    where.push('baseline_key = ?');
    params.push(baselineKey);
  }
  if (baselineSource) {
    where.push('baseline_source = ?');
    params.push(baselineSource);
  }
  if (predictionType) {
    where.push('prediction_type = ?');
    params.push(predictionType);
  }
  if (horizonDays !== null) {
    where.push('horizon_days = ?');
    params.push(horizonDays);
  }
  if (entityType) {
    where.push('entity_type = ?');
    params.push(entityType);
  }

  const limit = clampLimit(options.limit, 100, 1000);
  params.push(limit);
  const rows = await allAsync(`${selectBase} WHERE ${where.join(' AND ')} ORDER BY created_at DESC, id DESC LIMIT ?`, params);
  return rows.map((row) => normalizeRecordRow(row)).filter((row): row is StoredShadowScoreMetadataRecord => Boolean(row));
};

export const getBaselineScoreMetadataRecordById = async (idInput: unknown): Promise<StoredShadowScoreMetadataRecord | null> => {
  const id = Number(idInput);
  if (!Number.isFinite(id) || id <= 0) return null;
  const row = await getAsync(`${selectBase} WHERE id = ? AND score_role = 'baseline' LIMIT 1`, [Math.trunc(id)]);
  return normalizeRecordRow(row);
};

export const getBaselineScoreMetadataRecordsByBaselineKey = async (
  baselineKeyInput: unknown,
): Promise<StoredShadowScoreMetadataRecord[]> => listBaselineScoreMetadataRecords({ baselineKey: baselineKeyInput, limit: 1000 });

export const getBaselineScoreMetadataRecordsForComparison = async (options: {
  baselineKey?: unknown;
  baselineSource?: unknown;
  predictionType?: unknown;
  horizonDays?: unknown;
  entityType?: unknown;
  limit?: unknown;
} = {}): Promise<StoredShadowScoreMetadataRecord[]> => listBaselineScoreMetadataRecords({ ...options, limit: options.limit ?? 1000 });

export const getLatestBaselineScoreMetadataRecord = async (options: {
  baselineKey?: unknown;
  predictionType?: unknown;
  horizonDays?: unknown;
  entityType?: unknown;
} = {}): Promise<StoredShadowScoreMetadataRecord | null> => {
  const rows = await listBaselineScoreMetadataRecords({ ...options, limit: 1 });
  return rows[0] ?? null;
};

export const getBaselineScoreMetadataSummary = async () => {
  const summary = await getAsync(
    `
      SELECT COUNT(*) AS recordCount,
             COUNT(DISTINCT baseline_key) AS baselineKeyCount,
             COUNT(DISTINCT baseline_source) AS baselineSourceCount,
             SUM(CASE WHEN metadata_only = 1 AND model_binary_present = 0 AND raw_csv_present = 0 AND inference_directive_present = 0 AND activation_directive_present = 0 AND business_mutation_directive_present = 0 THEN 1 ELSE 0 END) AS safeMetadataOnlyCount,
             SUM(CASE WHEN model_binary_present != 0 OR raw_csv_present != 0 OR inference_directive_present != 0 OR activation_directive_present != 0 OR business_mutation_directive_present != 0 THEN 1 ELSE 0 END) AS unsafeFlagCount,
             SUM(forbidden_field_count) AS forbiddenFieldCount
      FROM ml_shadow_score_metadata_records
      WHERE score_role = 'baseline'
    `,
  );
  const latest = await getLatestBaselineScoreMetadataRecord();
  return {
    baselineSource: 'stored_metadata',
    recordCount: Number(summary?.recordCount ?? 0),
    baselineKeyCount: Number(summary?.baselineKeyCount ?? 0),
    baselineSourceCount: Number(summary?.baselineSourceCount ?? 0),
    safeMetadataOnlyCount: Number(summary?.safeMetadataOnlyCount ?? 0),
    unsafeFlagCount: Number(summary?.unsafeFlagCount ?? 0),
    forbiddenFieldCount: Number(summary?.forbiddenFieldCount ?? 0),
    latestRecordId: latest?.id ?? null,
    latestBaselineKey: latest?.baselineKey ?? null,
    latestBaselineVersion: latest?.baselineVersion ?? null,
    metadataOnly: true,
    modelExecutionAllowed: false,
    inferenceEndpointExposed: false,
    artifactActivationAllowed: false,
    canChangeInventoryOrAccounting: false,
    canChangePricing: false,
    canChangeReports: false,
    canChangeLedger: false,
    canMutateBusinessRecords: false,
  };
};
