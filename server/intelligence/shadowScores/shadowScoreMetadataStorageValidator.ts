import { createHash } from 'node:crypto';
import {
  type ShadowScoreMetadataFixturePayload,
  type ShadowScoreMetadataSafetyPolicy,
  type ShadowScoreMetadataStorageIssue,
  type ShadowScoreMetadataStorageValidationReport,
} from './shadowScoreMetadataStorageTypes';

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

const FORBIDDEN_FIELD_PATTERNS = [
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
];

const issue = (code: string, message: string, path: string): ShadowScoreMetadataStorageIssue => ({ code, message, path });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
};

export const hashShadowScoreMetadataPayload = (payload: unknown): string =>
  createHash('sha256').update(stableStringify(payload)).digest('hex');

const countForbiddenFieldKeys = (value: unknown, path = '$'): ShadowScoreMetadataStorageIssue[] => {
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => countForbiddenFieldKeys(entry, `${path}[${index}]`));
  }
  if (!isRecord(value)) return [];

  const issues: ShadowScoreMetadataStorageIssue[] = [];
  for (const [key, nestedValue] of Object.entries(value)) {
    const keyPath = `${path}.${key}`;
    const isSafePolicyFlag = path === '$.safetyPolicy' && REQUIRED_FALSE_POLICY_KEYS.includes(key as typeof REQUIRED_FALSE_POLICY_KEYS[number]);
    const isSafeBackendNegationFlag = path === '$.backendImportPolicy' && /^backendMustNot[A-Z]/.test(key);
    if (!isSafePolicyFlag && !isSafeBackendNegationFlag && FORBIDDEN_FIELD_PATTERNS.some((pattern) => pattern.test(key))) {
      issues.push(issue('forbidden_field_present', `${key} is not allowed in metadata-only shadow score storage.`, keyPath));
    }
    issues.push(...countForbiddenFieldKeys(nestedValue, keyPath));
  }
  return issues;
};

const asNonEmptyString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const toSafePolicy = (value: unknown): ShadowScoreMetadataSafetyPolicy | null => {
  if (!isRecord(value)) return null;
  const policy: Record<string, false> = {};
  for (const key of REQUIRED_FALSE_POLICY_KEYS) {
    if (value[key] !== false) return null;
    policy[key] = false;
  }
  return policy as ShadowScoreMetadataSafetyPolicy;
};

export const validateShadowScoreMetadataStoragePayload = (
  input: ShadowScoreMetadataFixturePayload | unknown,
): ShadowScoreMetadataStorageValidationReport => {
  const errors: ShadowScoreMetadataStorageIssue[] = [];
  const warnings: ShadowScoreMetadataStorageIssue[] = [];
  const importPayloadHash = hashShadowScoreMetadataPayload(input);

  if (!isRecord(input)) {
    errors.push(issue('payload_not_object', 'Payload must be an object.', '$'));
    return {
      phase: 'Phase 14A',
      validationKind: 'metadata_only_shadow_score_storage_validation',
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
      safetyPolicy: null,
      safetyFlags: {
        modelExecutionAllowed: false,
        inferenceEndpointExposed: false,
        artifactActivationAllowed: false,
        canMutateBusinessRecords: false,
      },
    };
  }

  const payload = input as ShadowScoreMetadataFixturePayload;
  const records = Array.isArray(payload.records) ? payload.records : [];
  const safetyPolicy = toSafePolicy(payload.safetyPolicy);
  const forbiddenIssues = countForbiddenFieldKeys(payload);

  if (payload.fixtureKind !== 'metadata_only_shadow_score_import_fixture' && payload.importMode !== 'metadata_only_fixture') {
    errors.push(issue('metadata_only_fixture_kind_missing', 'Fixture must be explicitly metadata-only.', 'fixtureKind'));
  }
  if (payload.evidenceOnly !== true) {
    errors.push(issue('evidence_only_required', 'Payload evidenceOnly must be true.', 'evidenceOnly'));
  }
  if (!asNonEmptyString(payload.candidatePackageId)) {
    errors.push(issue('candidate_package_id_missing', 'candidatePackageId is required.', 'candidatePackageId'));
  }
  if (!asNonEmptyString(payload.modelKey)) {
    errors.push(issue('model_key_missing', 'modelKey is required.', 'modelKey'));
  }
  if (!asNonEmptyString(payload.modelVersion)) {
    errors.push(issue('model_version_missing', 'modelVersion is required.', 'modelVersion'));
  }
  if (!asNonEmptyString(payload.predictionType)) {
    errors.push(issue('prediction_type_missing', 'predictionType is required.', 'predictionType'));
  }
  if (!Array.isArray(payload.records) || records.length === 0) {
    errors.push(issue('scores_missing', 'At least one metadata-only score record is required.', 'records'));
  }
  if (!safetyPolicy) {
    errors.push(issue('safety_policy_invalid', 'Safety policy must exist and keep every execution/mutation flag false.', 'safetyPolicy'));
  }
  if (forbiddenIssues.length > 0) {
    errors.push(...forbiddenIssues);
  }

  records.forEach((record, index) => {
    const rowPath = `records[${index}]`;
    if (!asNonEmptyString(record.entityType)) errors.push(issue('entity_type_missing', 'Score row entityType is required.', `${rowPath}.entityType`));
    if (!asNonEmptyString(record.entityId)) errors.push(issue('entity_id_missing', 'Score row entityId is required.', `${rowPath}.entityId`));
    if (!asNonEmptyString(record.predictionType ?? payload.predictionType)) {
      errors.push(issue('row_prediction_type_missing', 'Score row predictionType is required.', `${rowPath}.predictionType`));
    }
    if (!Number.isFinite(Number(record.sourceRowIndex ?? index))) {
      errors.push(issue('source_row_index_missing', 'Score row sourceRowIndex or stable index is required.', `${rowPath}.sourceRowIndex`));
    }
    if (record.candidateScore === undefined && record.candidateLabel === undefined && record.candidateConfidence === undefined) {
      errors.push(issue('score_metadata_missing', 'Score, label, or confidence metadata is required.', rowPath));
    }
    for (const [flag, value] of Object.entries({
      automationAllowed: record.automationAllowed,
      businessMutationAllowed: record.businessMutationAllowed,
      inventoryMutationAllowed: record.inventoryMutationAllowed,
      accountingMutationAllowed: record.accountingMutationAllowed,
      pricingMutationAllowed: record.pricingMutationAllowed,
      ledgerMutationAllowed: record.ledgerMutationAllowed,
      reportMutationAllowed: record.reportMutationAllowed,
      artifactActivationAllowed: record.artifactActivationAllowed,
      modelExecutionAllowed: record.modelExecutionAllowed,
      inferenceEndpointExposed: record.inferenceEndpointExposed,
    })) {
      if (value === true) errors.push(issue('unsafe_row_flag_enabled', `${flag} must remain false.`, `${rowPath}.${flag}`));
    }
    if (!asNonEmptyString(record.sourceExportRecordHash)) {
      warnings.push(issue('source_export_record_hash_missing', 'Row is metadata-only but lacks sourceExportRecordHash.', `${rowPath}.sourceExportRecordHash`));
    }
  });

  const status = errors.length > 0 ? 'fail' : warnings.length > 0 ? 'warning' : 'pass';

  return {
    phase: 'Phase 14A',
    validationKind: 'metadata_only_shadow_score_storage_validation',
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
    safetyPolicy,
    safetyFlags: {
      modelExecutionAllowed: false,
      inferenceEndpointExposed: false,
      artifactActivationAllowed: false,
      canMutateBusinessRecords: false,
    },
  };
};
