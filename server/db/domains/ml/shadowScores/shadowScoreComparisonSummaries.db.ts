import { allAsync, getAsync, runAsync } from '../../../query';
import type { SqliteBindValue } from '../../../query';
import { clampLimit, safeJson } from '../mlDbUtils';
import type {
  ShadowScoreComparisonSummaryPersistenceInput,
  StoredShadowScoreComparisonSummaryRecord,
  ShadowScoreComparisonSummaryWriteResult,
} from '../../../../intelligence/shadowScores/comparison/summary/shadowScoreComparisonSummaryTypes';

const parseJson = (value: unknown): unknown => {
  if (typeof value !== 'string') return value ?? null;
  try {
    return JSON.parse(value);
  } catch (_err) {
    return { parseError: true };
  }
};

const boolFromDb = (value: unknown): boolean => Number(value) === 1 || value === true;
const normalizeString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
const nullableString = (value: unknown): string | null => {
  const normalized = normalizeString(value);
  return normalized.length > 0 ? normalized : null;
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
const finiteInteger = (value: unknown, fallback = 0): number => finiteIntegerOrNull(value) ?? fallback;
const finiteNumber = (value: unknown, fallback = 0): number => finiteNumberOrNull(value) ?? fallback;

const selectBase = `
  SELECT id,
         summary_key AS summaryKey,
         candidate_package_id AS candidatePackageId,
         baseline_source AS baselineSource,
         baseline_key AS baselineKey,
         prediction_type AS predictionType,
         horizon_days AS horizonDays,
         entity_type AS entityType,
         comparison_status AS comparisonStatus,
         baseline_coverage_status AS baselineCoverageStatus,
         candidate_count AS candidateCount,
         baseline_count AS baselineCount,
         matched_entity_count AS matchedEntityCount,
         missing_baseline_count AS missingBaselineCount,
         extra_baseline_count AS extraBaselineCount,
         coverage_ratio AS coverageRatio,
         absolute_delta_mean AS absoluteDeltaMean,
         absolute_delta_max AS absoluteDeltaMax,
         signed_delta_mean AS signedDeltaMean,
         label_agreement_rate AS labelAgreementRate,
         warning_count AS warningCount,
         error_count AS errorCount,
         comparison_generated_at AS comparisonGeneratedAt,
         comparison_result_hash AS comparisonResultHash,
         summary_payload_json AS summaryPayloadJson,
         comparison_result_json AS comparisonResultJson,
         metadata_only AS metadataOnly,
         model_binary_present AS modelBinaryPresent,
         raw_csv_present AS rawCsvPresent,
         inference_directive_present AS inferenceDirectivePresent,
         activation_directive_present AS activationDirectivePresent,
         business_mutation_directive_present AS businessMutationDirectivePresent,
         safety_policy_json AS safetyPolicyJson,
         created_at AS createdAt,
         created_by_user_id AS createdByUserId
  FROM ml_shadow_score_comparison_summaries
`;

const normalizeSummaryRow = (row: Record<string, unknown> | undefined | null): StoredShadowScoreComparisonSummaryRecord | null => {
  if (!row) return null;
  return {
    id: Number(row.id ?? 0),
    summaryKey: String(row.summaryKey ?? row.summary_key ?? ''),
    candidatePackageId: String(row.candidatePackageId ?? row.candidate_package_id ?? ''),
    baselineSource: String(row.baselineSource ?? row.baseline_source ?? 'none') as StoredShadowScoreComparisonSummaryRecord['baselineSource'],
    baselineKey: nullableString(row.baselineKey ?? row.baseline_key),
    predictionType: nullableString(row.predictionType ?? row.prediction_type),
    horizonDays: finiteIntegerOrNull(row.horizonDays ?? row.horizon_days),
    entityType: nullableString(row.entityType ?? row.entity_type),
    comparisonStatus: String(row.comparisonStatus ?? row.comparison_status ?? ''),
    baselineCoverageStatus: String(row.baselineCoverageStatus ?? row.baseline_coverage_status ?? 'missing') as StoredShadowScoreComparisonSummaryRecord['baselineCoverageStatus'],
    candidateCount: finiteInteger(row.candidateCount ?? row.candidate_count),
    baselineCount: finiteInteger(row.baselineCount ?? row.baseline_count),
    matchedEntityCount: finiteInteger(row.matchedEntityCount ?? row.matched_entity_count),
    missingBaselineCount: finiteInteger(row.missingBaselineCount ?? row.missing_baseline_count),
    extraBaselineCount: finiteInteger(row.extraBaselineCount ?? row.extra_baseline_count),
    coverageRatio: finiteNumber(row.coverageRatio ?? row.coverage_ratio),
    absoluteDeltaMean: finiteNumberOrNull(row.absoluteDeltaMean ?? row.absolute_delta_mean),
    absoluteDeltaMax: finiteNumberOrNull(row.absoluteDeltaMax ?? row.absolute_delta_max),
    signedDeltaMean: finiteNumberOrNull(row.signedDeltaMean ?? row.signed_delta_mean),
    labelAgreementRate: finiteNumberOrNull(row.labelAgreementRate ?? row.label_agreement_rate),
    warningCount: finiteInteger(row.warningCount ?? row.warning_count),
    errorCount: finiteInteger(row.errorCount ?? row.error_count),
    comparisonGeneratedAt: String(row.comparisonGeneratedAt ?? row.comparison_generated_at ?? ''),
    comparisonResultHash: String(row.comparisonResultHash ?? row.comparison_result_hash ?? ''),
    summaryPayload: parseJson(row.summaryPayloadJson ?? row.summary_payload_json),
    comparisonResult: parseJson(row.comparisonResultJson ?? row.comparison_result_json),
    metadataOnly: boolFromDb(row.metadataOnly ?? row.metadata_only),
    modelBinaryPresent: boolFromDb(row.modelBinaryPresent ?? row.model_binary_present),
    rawCsvPresent: boolFromDb(row.rawCsvPresent ?? row.raw_csv_present),
    inferenceDirectivePresent: boolFromDb(row.inferenceDirectivePresent ?? row.inference_directive_present),
    activationDirectivePresent: boolFromDb(row.activationDirectivePresent ?? row.activation_directive_present),
    businessMutationDirectivePresent: boolFromDb(row.businessMutationDirectivePresent ?? row.business_mutation_directive_present),
    safetyPolicy: parseJson(row.safetyPolicyJson ?? row.safety_policy_json),
    createdAt: String(row.createdAt ?? row.created_at ?? ''),
    createdByUserId: finiteIntegerOrNull(row.createdByUserId ?? row.created_by_user_id),
  };
};

const isSafeSummaryInput = (payload: ShadowScoreComparisonSummaryPersistenceInput): { safe: boolean; reason: string | null } => {
  if (!normalizeString(payload.summaryKey)) return { safe: false, reason: 'summary_key_missing' };
  if (!normalizeString(payload.candidatePackageId)) return { safe: false, reason: 'candidate_package_id_missing' };
  if (!['stored_metadata', 'fixture_metadata', 'none'].includes(String(payload.baselineSource))) return { safe: false, reason: 'baseline_source_invalid' };
  if (!normalizeString(payload.comparisonStatus)) return { safe: false, reason: 'comparison_status_missing' };
  if (!['complete', 'partial', 'missing'].includes(String(payload.baselineCoverageStatus))) return { safe: false, reason: 'baseline_coverage_status_invalid' };
  if (!normalizeString(payload.comparisonGeneratedAt)) return { safe: false, reason: 'comparison_generated_at_missing' };
  if (!normalizeString(payload.comparisonResultHash)) return { safe: false, reason: 'comparison_result_hash_missing' };
  if (payload.metadataOnly !== true) return { safe: false, reason: 'metadata_only_must_be_true' };
  if (payload.modelBinaryPresent !== false) return { safe: false, reason: 'model_binary_present_must_be_false' };
  if (payload.rawCsvPresent !== false) return { safe: false, reason: 'raw_csv_present_must_be_false' };
  if (payload.inferenceDirectivePresent !== false) return { safe: false, reason: 'inference_directive_present_must_be_false' };
  if (payload.activationDirectivePresent !== false) return { safe: false, reason: 'activation_directive_present_must_be_false' };
  if (payload.businessMutationDirectivePresent !== false) return { safe: false, reason: 'business_mutation_directive_present_must_be_false' };
  const policy = payload.safetyPolicy;
  if (policy && typeof policy === 'object') {
    const unsafePolicyKeys = new Set<string>([
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
    ]);
    for (const [key, value] of Object.entries(policy)) {
      if (unsafePolicyKeys.has(key) && value === true) return { safe: false, reason: `${key}_must_be_false` };
    }
  }
  return { safe: true, reason: null };
};

export const getShadowScoreComparisonSummaryByKey = async (
  summaryKeyInput: unknown,
): Promise<StoredShadowScoreComparisonSummaryRecord | null> => {
  const summaryKey = normalizeString(summaryKeyInput);
  if (!summaryKey) return null;
  const row = await getAsync(`${selectBase} WHERE summary_key = ? LIMIT 1`, [summaryKey]);
  return normalizeSummaryRow(row);
};

export const persistShadowScoreComparisonSummary = async (
  payload: ShadowScoreComparisonSummaryPersistenceInput,
): Promise<ShadowScoreComparisonSummaryWriteResult> => {
  const safety = isSafeSummaryInput(payload);
  if (!safety.safe) {
    return { status: 'fail', inserted: false, duplicate: false, rejected: true, reason: safety.reason, record: null };
  }

  const existing = await getShadowScoreComparisonSummaryByKey(payload.summaryKey);
  if (existing) return { status: 'pass', inserted: false, duplicate: true, rejected: false, reason: null, record: existing };

  await runAsync(
    `
      INSERT OR IGNORE INTO ml_shadow_score_comparison_summaries (
        summary_key,
        candidate_package_id,
        baseline_source,
        baseline_key,
        prediction_type,
        horizon_days,
        entity_type,
        comparison_status,
        baseline_coverage_status,
        candidate_count,
        baseline_count,
        matched_entity_count,
        missing_baseline_count,
        extra_baseline_count,
        coverage_ratio,
        absolute_delta_mean,
        absolute_delta_max,
        signed_delta_mean,
        label_agreement_rate,
        warning_count,
        error_count,
        comparison_generated_at,
        comparison_result_hash,
        summary_payload_json,
        comparison_result_json,
        metadata_only,
        model_binary_present,
        raw_csv_present,
        inference_directive_present,
        activation_directive_present,
        business_mutation_directive_present,
        safety_policy_json,
        created_by_user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 0, 0, 0, 0, ?, ?)
    `,
    [
      payload.summaryKey,
      payload.candidatePackageId,
      payload.baselineSource,
      nullableString(payload.baselineKey),
      nullableString(payload.predictionType),
      finiteIntegerOrNull(payload.horizonDays),
      nullableString(payload.entityType),
      payload.comparisonStatus,
      payload.baselineCoverageStatus,
      finiteInteger(payload.candidateCount),
      finiteInteger(payload.baselineCount),
      finiteInteger(payload.matchedEntityCount),
      finiteInteger(payload.missingBaselineCount),
      finiteInteger(payload.extraBaselineCount),
      finiteNumber(payload.coverageRatio),
      finiteNumberOrNull(payload.absoluteDeltaMean),
      finiteNumberOrNull(payload.absoluteDeltaMax),
      finiteNumberOrNull(payload.signedDeltaMean),
      finiteNumberOrNull(payload.labelAgreementRate),
      finiteInteger(payload.warningCount),
      finiteInteger(payload.errorCount),
      payload.comparisonGeneratedAt,
      payload.comparisonResultHash,
      safeJson(payload.summaryPayload ?? {}),
      safeJson(payload.comparisonResult ?? {}),
      safeJson(payload.safetyPolicy ?? {}),
      finiteIntegerOrNull(payload.createdByUserId),
    ],
  );

  const record = await getShadowScoreComparisonSummaryByKey(payload.summaryKey);
  if (!record) return { status: 'fail', inserted: false, duplicate: false, rejected: true, reason: 'insert_failed_or_record_missing', record: null };
  return { status: 'pass', inserted: true, duplicate: false, rejected: false, reason: null, record };
};

export const getShadowScoreComparisonSummaryById = async (
  idInput: unknown,
): Promise<StoredShadowScoreComparisonSummaryRecord | null> => {
  const id = finiteIntegerOrNull(idInput);
  if (!id || id <= 0) return null;
  const row = await getAsync(`${selectBase} WHERE id = ? LIMIT 1`, [id]);
  return normalizeSummaryRow(row);
};

export const listShadowScoreComparisonSummaries = async (options: {
  candidatePackageId?: unknown;
  baselineSource?: unknown;
  baselineKey?: unknown;
  predictionType?: unknown;
  comparisonStatus?: unknown;
  baselineCoverageStatus?: unknown;
  entityType?: unknown;
  limit?: unknown;
} = {}): Promise<StoredShadowScoreComparisonSummaryRecord[]> => {
  const where: string[] = [];
  const params: SqliteBindValue[] = [];
  const candidatePackageId = normalizeString(options.candidatePackageId);
  const baselineSource = normalizeString(options.baselineSource);
  const baselineKey = normalizeString(options.baselineKey);
  const predictionType = normalizeString(options.predictionType);
  const comparisonStatus = normalizeString(options.comparisonStatus);
  const baselineCoverageStatus = normalizeString(options.baselineCoverageStatus);
  const entityType = normalizeString(options.entityType);
  if (candidatePackageId) {
    where.push('candidate_package_id = ?');
    params.push(candidatePackageId);
  }
  if (baselineSource) {
    where.push('baseline_source = ?');
    params.push(baselineSource);
  }
  if (baselineKey) {
    where.push('baseline_key = ?');
    params.push(baselineKey);
  }
  if (predictionType) {
    where.push('prediction_type = ?');
    params.push(predictionType);
  }
  if (comparisonStatus) {
    where.push('comparison_status = ?');
    params.push(comparisonStatus);
  }
  if (baselineCoverageStatus) {
    where.push('baseline_coverage_status = ?');
    params.push(baselineCoverageStatus);
  }
  if (entityType) {
    where.push('entity_type = ?');
    params.push(entityType);
  }
  const limit = clampLimit(options.limit, 50, 500);
  params.push(limit);
  const rows = await allAsync(
    `${selectBase}${where.length ? ` WHERE ${where.join(' AND ')}` : ''} ORDER BY created_at DESC, id DESC LIMIT ?`,
    params,
  );
  return rows.map((row) => normalizeSummaryRow(row)).filter((row): row is StoredShadowScoreComparisonSummaryRecord => Boolean(row));
};


export const listShadowScoreComparisonSummaryReadModels = async (options: {
  candidatePackageId?: unknown;
  modelKey?: unknown;
  modelVersion?: unknown;
  predictionType?: unknown;
  baselineKey?: unknown;
  comparisonStatus?: unknown;
  limit?: unknown;
  offset?: unknown;
  sort?: unknown;
} = {}): Promise<{ records: StoredShadowScoreComparisonSummaryRecord[]; total: number }> => {
  const where: string[] = [];
  const params: SqliteBindValue[] = [];
  const candidatePackageId = normalizeString(options.candidatePackageId);
  const modelKey = normalizeString(options.modelKey);
  const modelVersion = normalizeString(options.modelVersion);
  const predictionType = normalizeString(options.predictionType);
  const baselineKey = normalizeString(options.baselineKey);
  const comparisonStatus = normalizeString(options.comparisonStatus);

  if (candidatePackageId) {
    where.push('candidate_package_id = ?');
    params.push(candidatePackageId);
  }
  if (predictionType) {
    where.push('prediction_type = ?');
    params.push(predictionType);
  }
  if (baselineKey) {
    where.push('baseline_key = ?');
    params.push(baselineKey);
  }
  if (comparisonStatus) {
    where.push('comparison_status = ?');
    params.push(comparisonStatus);
  }
  if (modelKey) {
    where.push('summary_payload_json LIKE ?');
    params.push(`%"modelKey":"${modelKey.replace(/[\\%_]/g, '')}"%`);
  }
  if (modelVersion) {
    where.push('summary_payload_json LIKE ?');
    params.push(`%"modelVersion":"${modelVersion.replace(/[\\%_]/g, '')}"%`);
  }

  const whereSql = where.length ? ` WHERE ${where.join(' AND ')}` : '';
  const countRow = await getAsync(`SELECT COUNT(*) AS total FROM ml_shadow_score_comparison_summaries${whereSql}`, params);
  const total = finiteInteger(countRow?.total, 0);
  const limit = clampLimit(options.limit, 25, 100);
  const offset = Math.max(0, finiteInteger(options.offset, 0));
  const sort = normalizeString(options.sort) === 'createdAt_asc' ? 'created_at ASC, id ASC' : 'created_at DESC, id DESC';
  const rows = await allAsync(
    `${selectBase}${whereSql} ORDER BY ${sort} LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );
  return {
    records: rows.map((row) => normalizeSummaryRow(row)).filter((row): row is StoredShadowScoreComparisonSummaryRecord => Boolean(row)),
    total,
  };
};

export const getLatestShadowScoreComparisonSummary = async (options: {
  candidatePackageId?: unknown;
  baselineKey?: unknown;
} = {}): Promise<StoredShadowScoreComparisonSummaryRecord | null> => {
  const rows = await listShadowScoreComparisonSummaries({ ...options, limit: 1 });
  return rows[0] ?? null;
};

export const getShadowScoreComparisonSummaryStats = async () => {
  const row = await getAsync(
    `
      SELECT COUNT(*) AS summaryCount,
             COUNT(DISTINCT candidate_package_id) AS candidatePackageCount,
             SUM(CASE WHEN baseline_source = 'stored_metadata' THEN 1 ELSE 0 END) AS storedBaselineSummaryCount,
             SUM(CASE WHEN baseline_coverage_status = 'complete' THEN 1 ELSE 0 END) AS completeCoverageCount,
             SUM(CASE WHEN baseline_coverage_status = 'partial' THEN 1 ELSE 0 END) AS partialCoverageCount,
             SUM(CASE WHEN baseline_coverage_status = 'missing' THEN 1 ELSE 0 END) AS missingCoverageCount,
             SUM(CASE WHEN metadata_only = 1 AND model_binary_present = 0 AND raw_csv_present = 0 AND inference_directive_present = 0 AND activation_directive_present = 0 AND business_mutation_directive_present = 0 THEN 1 ELSE 0 END) AS safeMetadataOnlyCount,
             SUM(CASE WHEN model_binary_present != 0 OR raw_csv_present != 0 OR inference_directive_present != 0 OR activation_directive_present != 0 OR business_mutation_directive_present != 0 THEN 1 ELSE 0 END) AS unsafeFlagCount
      FROM ml_shadow_score_comparison_summaries
    `,
  );
  return {
    summaryCount: Number(row?.summaryCount ?? 0),
    candidatePackageCount: Number(row?.candidatePackageCount ?? 0),
    storedBaselineSummaryCount: Number(row?.storedBaselineSummaryCount ?? 0),
    coverageStatusDistribution: {
      complete: Number(row?.completeCoverageCount ?? 0),
      partial: Number(row?.partialCoverageCount ?? 0),
      missing: Number(row?.missingCoverageCount ?? 0),
    },
    safeMetadataOnlyCount: Number(row?.safeMetadataOnlyCount ?? 0),
    unsafeFlagCount: Number(row?.unsafeFlagCount ?? 0),
    metadataOnly: true,
    modelExecutionAllowed: false,
    inferenceEndpointExposed: false,
    artifactActivationAllowed: false,
    canChangeInventoryOrAccounting: false,
    canMutateBusinessRecords: false,
  };
};
