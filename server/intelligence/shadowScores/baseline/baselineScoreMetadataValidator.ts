import { hashShadowScoreMetadataPayload } from '../shadowScoreMetadataStorageValidator';
import type { ShadowScoreMetadataSafetyPolicy, ShadowScoreMetadataStorageIssue } from '../shadowScoreMetadataStorageTypes';
import type { BaselineScoreMetadataPayload, BaselineScoreMetadataValidationReport } from './baselineScoreMetadataTypes';

const REQUIRED_FALSE_POLICY_KEYS = [
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
] as const;

const FORBIDDEN_FIELDS = new Set([
  'set_stock',
  'change_price',
  'approve_purchase',
  'create_invoice',
  'mutate_ledger',
  'auto_order',
  'delete_record',
  'production_action',
  'auto_decision',
  'activate_artifact',
  'deploy_model',
  'write_inventory',
  'write_accounting',
  'write_ledger',
  'write_report',
  'execute_model',
  'run_inference',
]);

const FORBIDDEN_PATTERNS = [
  /modelBinary/i,
  /modelBytes/i,
  /model\.joblib/i,
  /joblib/i,
  /sklearn/i,
  /rawCsv/i,
  /rawTrainingCsv/i,
  /trainCsv/i,
  /testCsv/i,
  /rawDataset/i,
  /fullDataset/i,
  /inferenceDirective/i,
  /activationDirective/i,
  /businessMutationDirective/i,
  /productionDecision/i,
  /activationFlag/i,
  /deployModel/i,
  /executeModel/i,
  /runInference/i,
];

const issue = (code: string, message: string, path: string): ShadowScoreMetadataStorageIssue => ({ code, message, path });
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const asString = (value: unknown): string => typeof value === 'string' ? value.trim() : '';
const asFiniteNumber = (value: unknown): number | null => {
  if (value === undefined || value === null || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const toSafePolicy = (value: unknown): ShadowScoreMetadataSafetyPolicy | null => {
  if (!isRecord(value)) return null;
  const policy: Record<string, false> = {};
  for (const key of REQUIRED_FALSE_POLICY_KEYS) {
    if (value[key] !== false) return null;
    policy[key] = false;
  }
  return policy as ShadowScoreMetadataSafetyPolicy;
};

const countForbiddenFieldKeys = (value: unknown, path = '$'): ShadowScoreMetadataStorageIssue[] => {
  if (Array.isArray(value)) return value.flatMap((entry, index) => countForbiddenFieldKeys(entry, `${path}[${index}]`));
  if (!isRecord(value)) return [];
  const issues: ShadowScoreMetadataStorageIssue[] = [];
  for (const [key, nestedValue] of Object.entries(value)) {
    const keyPath = `${path}.${key}`;
    const isSafePolicyFlag = path === '$.safetyPolicy' && REQUIRED_FALSE_POLICY_KEYS.includes(key as typeof REQUIRED_FALSE_POLICY_KEYS[number]);
    const isSafeBackendNegationFlag = path === '$.backendImportPolicy' && /^backendMustNot[A-Z]/.test(key);
    if (!isSafePolicyFlag && !isSafeBackendNegationFlag && (FORBIDDEN_FIELDS.has(key) || FORBIDDEN_PATTERNS.some((pattern) => pattern.test(key)))) {
      issues.push(issue('forbidden_field_present', `${key} is not allowed in metadata-only baseline score storage.`, keyPath));
    }
    issues.push(...countForbiddenFieldKeys(nestedValue, keyPath));
  }
  return issues;
};

export const validateBaselineScoreMetadataPayload = (input: BaselineScoreMetadataPayload | unknown): BaselineScoreMetadataValidationReport => {
  const errors: ShadowScoreMetadataStorageIssue[] = [];
  const warnings: ShadowScoreMetadataStorageIssue[] = [];
  const importPayloadHash = hashShadowScoreMetadataPayload(input);

  if (!isRecord(input)) {
    errors.push(issue('payload_not_object', 'Payload must be an object.', '$'));
    return {
      phase: 'Phase 15A',
      validationKind: 'metadata_only_baseline_score_metadata_validation',
      status: 'fail',
      metadataOnly: false,
      recordCount: 0,
      validatedRecordCount: 0,
      forbiddenFieldCount: 0,
      warningCount: warnings.length,
      errorCount: errors.length,
      warnings,
      errors,
      importPayloadHash,
      baselineSource: null,
      baselineKey: null,
      baselineVersion: null,
      baselineGeneratedAt: null,
      safetyPolicy: null,
      safetyFlags: {
        modelExecutionAllowed: false,
        runtimeInvocationAllowed: false,
        inferenceEndpointExposed: false,
        artifactActivationAllowed: false,
        canMutateBusinessRecords: false,
      },
    };
  }

  const payload = input as BaselineScoreMetadataPayload;
  const records = Array.isArray(payload.records) ? payload.records : [];
  const safetyPolicy = toSafePolicy(payload.safetyPolicy);
  const forbiddenIssues = countForbiddenFieldKeys(payload);
  const baselineSource = asString(payload.baselineSource);
  const baselineKey = asString(payload.baselineKey);
  const baselineVersion = asString(payload.baselineVersion);
  const baselineGeneratedAt = asString(payload.baselineGeneratedAt ?? payload.generatedAt);

  if (payload.fixtureKind !== 'metadata_only_baseline_score_fixture' && payload.fixtureKind !== 'metadata_only_baseline_shadow_score_fixture') {
    errors.push(issue('baseline_fixture_kind_missing', 'Baseline fixture must be explicitly metadata-only.', 'fixtureKind'));
  }
  if (payload.metadataOnly !== true) errors.push(issue('metadata_only_required', 'Baseline payload metadataOnly must be true.', 'metadataOnly'));
  if (payload.evidenceOnly !== true) errors.push(issue('evidence_only_required', 'Baseline payload evidenceOnly must be true.', 'evidenceOnly'));
  if (!baselineSource) errors.push(issue('baseline_source_missing', 'baselineSource is required.', 'baselineSource'));
  if (!baselineKey) errors.push(issue('baseline_key_missing', 'baselineKey is required.', 'baselineKey'));
  if (!asString(payload.modelKey)) errors.push(issue('model_key_missing', 'modelKey is required.', 'modelKey'));
  if (!asString(payload.modelVersion)) errors.push(issue('model_version_missing', 'modelVersion is required.', 'modelVersion'));
  if (!asString(payload.predictionType)) errors.push(issue('prediction_type_missing', 'predictionType is required.', 'predictionType'));
  if (!Array.isArray(payload.records) || records.length === 0) errors.push(issue('baseline_scores_missing', 'At least one baseline metadata score is required.', 'records'));
  if (!safetyPolicy) errors.push(issue('safety_policy_invalid', 'Safety policy must exist and keep every execution/mutation flag false.', 'safetyPolicy'));
  if (forbiddenIssues.length > 0) errors.push(...forbiddenIssues);

  records.forEach((record, index) => {
    const rowPath = `records[${index}]`;
    if (!isRecord(record)) {
      errors.push(issue('baseline_row_not_object', 'Baseline score row must be an object.', rowPath));
      return;
    }
    if (record.metadataOnly === false) errors.push(issue('row_metadata_only_required', 'Baseline row metadataOnly must not be false.', `${rowPath}.metadataOnly`));
    if (!asString(record.entityType)) errors.push(issue('entity_type_missing', 'Baseline row entityType is required.', `${rowPath}.entityType`));
    if (!asString(record.entityId)) errors.push(issue('entity_id_missing', 'Baseline row entityId is required.', `${rowPath}.entityId`));
    if (!asString(record.predictionType ?? payload.predictionType)) errors.push(issue('row_prediction_type_missing', 'Baseline row predictionType is required.', `${rowPath}.predictionType`));
    if (!Number.isFinite(Number(record.horizonDays ?? payload.horizonDays ?? 0))) {
      errors.push(issue('horizon_days_invalid', 'horizonDays must be finite when present.', `${rowPath}.horizonDays`));
    }
    const score = asFiniteNumber(record.baselineScore ?? record.score);
    if ((record.baselineScore ?? record.score) !== undefined && score === null) {
      warnings.push(issue('score_not_numeric', 'Baseline score is present but not numeric; it will be stored as null.', `${rowPath}.score`));
    }
    if (score === null) warnings.push(issue('score_missing', 'Baseline score is null or missing.', `${rowPath}.score`));
    if (!asString(record.baselineLabel ?? record.label)) warnings.push(issue('label_missing', 'Baseline label is missing.', `${rowPath}.label`));
    const confidence = asFiniteNumber(record.baselineConfidence ?? record.confidence);
    if (confidence !== null && (confidence < 0 || confidence > 1)) {
      errors.push(issue('confidence_out_of_range', 'Baseline confidence must be between 0 and 1.', `${rowPath}.confidence`));
    }
    for (const [flag, value] of Object.entries({
      modelExecutionAllowed: record.modelExecutionAllowed,
      inferenceEndpointExposed: record.inferenceEndpointExposed,
      artifactActivationAllowed: record.artifactActivationAllowed,
      businessMutationAllowed: record.businessMutationAllowed,
    })) {
      if (value === true) errors.push(issue('unsafe_row_flag_enabled', `${flag} must remain false.`, `${rowPath}.${flag}`));
    }
    if (!asString(record.sourceBaselineRecordHash)) warnings.push(issue('source_baseline_record_hash_missing', 'Baseline row lacks sourceBaselineRecordHash.', `${rowPath}.sourceBaselineRecordHash`));
  });

  const status = errors.length > 0 ? 'fail' : warnings.length > 0 ? 'warning' : 'pass';
  return {
    phase: 'Phase 15A',
    validationKind: 'metadata_only_baseline_score_metadata_validation',
    status,
    metadataOnly: status !== 'fail',
    recordCount: records.length,
    validatedRecordCount: status === 'fail' ? 0 : records.length,
    forbiddenFieldCount: forbiddenIssues.length,
    warningCount: warnings.length,
    errorCount: errors.length,
    warnings,
    errors,
    importPayloadHash,
    baselineSource: baselineSource || null,
    baselineKey: baselineKey || null,
    baselineVersion: baselineVersion || null,
    baselineGeneratedAt: baselineGeneratedAt || null,
    safetyPolicy,
    safetyFlags: {
      modelExecutionAllowed: false,
      runtimeInvocationAllowed: false,
      inferenceEndpointExposed: false,
      artifactActivationAllowed: false,
      canMutateBusinessRecords: false,
    },
  };
};
