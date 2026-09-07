export type ShadowScoreImportValidatorStatus = 'pass' | 'warning' | 'fail';

export type ShadowScoreImportValidationIssue = {
  code: string;
  message: string;
  path: string;
};

export type ShadowScoreImportMetadataOnlyRecord = {
  importRecordId: string;
  shadowScoreId: string;
  entityType: string;
  entityId: string;
  predictionType: string;
  horizonDays: number | null;
  candidateScore: number | null;
  candidateLabel: string;
  candidateConfidence: number | null;
  modelKey: string;
  modelVersion: string;
  candidatePackageId: string;
  storageClass: 'metadata_only_shadow_score_import_fixture';
  evidenceOnly: true;
  backendAction: 'validate_and_store_metadata_only_when_future_import_exists';
  importEligibility: 'eligible_for_metadata_only_import';
  automationAllowed: false;
  businessMutationAllowed: false;
  inventoryMutationAllowed: false;
  accountingMutationAllowed: false;
  pricingMutationAllowed: false;
  ledgerMutationAllowed: false;
  reportMutationAllowed: false;
  artifactActivationAllowed: false;
  modelExecutionAllowed: false;
  inferenceEndpointExposed: false;
};

export type ShadowScoreImportMetadataOnlyPayload = {
  contractVersion: string;
  fixtureKind: 'metadata_only_shadow_score_import_fixture';
  candidatePackageId: string;
  modelKey: string;
  modelVersion: string;
  predictionType: string;
  recordCount: number;
  importMode: 'metadata_only_fixture';
  evidenceOnly: true;
  backendImportPolicy: Record<string, unknown>;
  safetyPolicy: Record<string, unknown>;
  records: ShadowScoreImportMetadataOnlyRecord[];
};

export type ShadowScoreImportMetadataOnlyValidationReport = {
  phase: 'Phase 13D';
  validatorKind: 'backend_metadata_only_shadow_score_import_validator';
  status: ShadowScoreImportValidatorStatus;
  recordCount: number;
  validatedRecordCount: number;
  warningCount: number;
  errorCount: number;
  forbiddenFieldCount: number;
  duplicateRecordCount: number;
  warnings: ShadowScoreImportValidationIssue[];
  errors: ShadowScoreImportValidationIssue[];
  safetyPolicy: typeof SHADOW_SCORE_IMPORT_METADATA_ONLY_VALIDATOR_SAFETY_POLICY;
  generatedAt: string;
};

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
  'activationDirective',
  'productionDecisionDirective',
  'backendExecutionDirective',
  'modelBytes',
  'artifactBytes',
  'serializedModel',
  'runtimeInvocationDirective',
  'businessMutationDirective',
]);

const TRUE_FLAG_DENYLIST = new Set([
  'automationAllowed',
  'businessMutationAllowed',
  'inventoryMutationAllowed',
  'accountingMutationAllowed',
  'pricingMutationAllowed',
  'ledgerMutationAllowed',
  'reportMutationAllowed',
  'artifactActivationAllowed',
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
  'artifactBytesLoadingAllowed',
  'rawTrainingCsvLoadingAllowed',
  'automaticDeletionAllowed',
  'purgeJobAllowed',
]);

const REQUIRED_BACKEND_IMPORT_POLICY: Record<string, unknown> = {
  backendAcceptableAsMetadataOnlyFixture: true,
  backendImportType: 'metadata_only_shadow_score_fixture',
  backendMustValidateBeforeStorage: true,
  backendMustNotLoadModelArtifact: true,
  backendMustNotExecuteModel: true,
  backendMustNotExposeInference: true,
  backendMustNotActivateArtifact: true,
  backendMustNotMutateBusinessRecords: true,
  backendMustNotApplyOperationalDecision: true,
  backendMustTreatAsEvidenceOnly: true,
  backendMayStoreOnlyValidatedMetadataInFuturePhase: true,
};

export const SHADOW_SCORE_IMPORT_METADATA_ONLY_VALIDATOR_SAFETY_POLICY = {
  phase: 'Phase 13D',
  metadataValidationOnly: true,
  acceptsWorkbenchPayloadObjectOnly: true,
  readsWorkbenchOutputFiles: false,
  storesValidatedMetadata: false,
  exposesRoute: false,
  modelExecutionAllowed: false,
  runtimeInvocationAllowed: false,
  inferenceEndpointExposed: false,
  productionIntegrationAllowed: false,
  decisionAutomationAllowed: false,
  canChangeInventoryOrAccounting: false,
  canChangePricing: false,
  canChangeReports: false,
  canChangeLedger: false,
  canMutateBusinessRecords: false,
  artifactExecutionAllowed: false,
  artifactActivationAllowed: false,
  artifactBytesLoadingAllowed: false,
  rawTrainingCsvLoadingAllowed: false,
  automaticDeletionAllowed: false,
  purgeJobAllowed: false,
} as const;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const issue = (code: string, message: string, path: string): ShadowScoreImportValidationIssue => ({
  code,
  message,
  path,
});

const findUnsafeFields = (
  value: unknown,
  path: string,
  errors: ShadowScoreImportValidationIssue[],
): number => {
  if (!isRecord(value) && !Array.isArray(value)) return 0;

  let count = 0;
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      count += findUnsafeFields(item, `${path}[${index}]`, errors);
    });
    return count;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    const nestedPath = `${path}.${key}`;
    if (FORBIDDEN_FIELDS.has(key)) {
      count += 1;
      errors.push(issue('forbidden_field', `Forbidden mutation or execution field is present: ${key}`, nestedPath));
    }
    if (TRUE_FLAG_DENYLIST.has(key) && nestedValue === true) {
      errors.push(issue('unsafe_true_flag', `Unsafe runtime or mutation flag must not be true: ${key}`, nestedPath));
    }
    count += findUnsafeFields(nestedValue, nestedPath, errors);
  }
  return count;
};

const requireString = (
  value: Record<string, unknown>,
  key: string,
  errors: ShadowScoreImportValidationIssue[],
  path: string,
): void => {
  if (typeof value[key] !== 'string' || String(value[key]).trim().length === 0) {
    errors.push(issue('missing_string', `${key} must be a non-empty string.`, `${path}.${key}`));
  }
};

const requireConst = (
  value: Record<string, unknown>,
  key: string,
  expected: unknown,
  errors: ShadowScoreImportValidationIssue[],
  path: string,
): void => {
  if (value[key] !== expected) {
    errors.push(issue('invalid_const', `${key} must equal ${String(expected)}.`, `${path}.${key}`));
  }
};

const isSafeScore = (value: unknown): value is number | null => {
  return value === null || (typeof value === 'number' && Number.isFinite(value));
};

const validateRecord = (
  record: unknown,
  index: number,
  payload: Record<string, unknown>,
  seenImportRecordIds: Set<string>,
  seenShadowScoreIds: Set<string>,
  errors: ShadowScoreImportValidationIssue[],
  warnings: ShadowScoreImportValidationIssue[],
): void => {
  const path = `records[${index}]`;
  if (!isRecord(record)) {
    errors.push(issue('invalid_record', 'Each import record must be an object.', path));
    return;
  }

  for (const key of ['importRecordId', 'shadowScoreId', 'entityType', 'entityId', 'predictionType', 'candidateLabel', 'modelKey', 'modelVersion', 'candidatePackageId']) {
    requireString(record, key, errors, path);
  }

  requireConst(record, 'storageClass', 'metadata_only_shadow_score_import_fixture', errors, path);
  requireConst(record, 'evidenceOnly', true, errors, path);
  requireConst(record, 'backendAction', 'validate_and_store_metadata_only_when_future_import_exists', errors, path);
  requireConst(record, 'importEligibility', 'eligible_for_metadata_only_import', errors, path);

  for (const key of ['automationAllowed', 'businessMutationAllowed', 'inventoryMutationAllowed', 'accountingMutationAllowed', 'pricingMutationAllowed', 'ledgerMutationAllowed', 'reportMutationAllowed', 'artifactActivationAllowed', 'modelExecutionAllowed', 'inferenceEndpointExposed']) {
    requireConst(record, key, false, errors, path);
  }

  if (!isSafeScore(record.candidateScore)) {
    errors.push(issue('invalid_candidate_score', 'candidateScore must be numeric or null.', `${path}.candidateScore`));
  }

  if (record.candidateConfidence !== null) {
    if (typeof record.candidateConfidence !== 'number' || !Number.isFinite(record.candidateConfidence) || record.candidateConfidence < 0 || record.candidateConfidence > 1) {
      errors.push(issue('invalid_candidate_confidence', 'candidateConfidence must be null or a number between 0 and 1.', `${path}.candidateConfidence`));
    }
  }

  if (record.horizonDays !== null) {
    if (typeof record.horizonDays !== 'number' || !Number.isFinite(record.horizonDays) || record.horizonDays < 0) {
      errors.push(issue('invalid_horizon_days', 'horizonDays must be null or a non-negative number.', `${path}.horizonDays`));
    }
  }

  const importRecordId = typeof record.importRecordId === 'string' ? record.importRecordId : '';
  if (importRecordId) {
    if (seenImportRecordIds.has(importRecordId)) {
      errors.push(issue('duplicate_import_record_id', `Duplicate importRecordId: ${importRecordId}`, `${path}.importRecordId`));
    }
    seenImportRecordIds.add(importRecordId);
  }

  const shadowScoreId = typeof record.shadowScoreId === 'string' ? record.shadowScoreId : '';
  if (shadowScoreId) {
    if (seenShadowScoreIds.has(shadowScoreId)) {
      warnings.push(issue('duplicate_shadow_score_id', `Duplicate shadowScoreId should be reviewed: ${shadowScoreId}`, `${path}.shadowScoreId`));
    }
    seenShadowScoreIds.add(shadowScoreId);
  }

  for (const key of ['candidatePackageId', 'modelKey', 'modelVersion', 'predictionType']) {
    if (typeof payload[key] === 'string' && typeof record[key] === 'string' && payload[key] !== record[key]) {
      errors.push(issue('payload_record_mismatch', `${key} must match the top-level payload value.`, `${path}.${key}`));
    }
  }
};

export const validateShadowScoreImportMetadataOnlyPayload = (
  payload: unknown,
  generatedAt = new Date().toISOString(),
): ShadowScoreImportMetadataOnlyValidationReport => {
  const errors: ShadowScoreImportValidationIssue[] = [];
  const warnings: ShadowScoreImportValidationIssue[] = [];

  const forbiddenFieldCount = findUnsafeFields(payload, '$', errors);

  if (!isRecord(payload)) {
    errors.push(issue('invalid_payload', 'Payload must be an object.', '$'));
    return {
      phase: 'Phase 13D',
      validatorKind: 'backend_metadata_only_shadow_score_import_validator',
      status: 'fail',
      recordCount: 0,
      validatedRecordCount: 0,
      warningCount: warnings.length,
      errorCount: errors.length,
      forbiddenFieldCount,
      duplicateRecordCount: 0,
      warnings,
      errors,
      safetyPolicy: SHADOW_SCORE_IMPORT_METADATA_ONLY_VALIDATOR_SAFETY_POLICY,
      generatedAt,
    };
  }

  requireConst(payload, 'fixtureKind', 'metadata_only_shadow_score_import_fixture', errors, '$');
  requireConst(payload, 'importMode', 'metadata_only_fixture', errors, '$');
  requireConst(payload, 'evidenceOnly', true, errors, '$');
  for (const key of ['contractVersion', 'candidatePackageId', 'modelKey', 'modelVersion', 'predictionType']) {
    requireString(payload, key, errors, '$');
  }

  if (payload.productionReadinessClaim && payload.productionReadinessClaim !== 'not_approved_for_production') {
    errors.push(issue('unsafe_production_claim', 'productionReadinessClaim must not claim production approval.', '$.productionReadinessClaim'));
  }
  if (payload.backendInferenceClaim && payload.backendInferenceClaim !== 'not_exposed') {
    errors.push(issue('unsafe_inference_claim', 'backendInferenceClaim must remain not_exposed.', '$.backendInferenceClaim'));
  }
  if (payload.artifactActivationClaim && payload.artifactActivationClaim !== 'not_activated') {
    errors.push(issue('unsafe_activation_claim', 'artifactActivationClaim must remain not_activated.', '$.artifactActivationClaim'));
  }
  if (payload.businessMutationClaim && payload.businessMutationClaim !== 'not_allowed') {
    errors.push(issue('unsafe_mutation_claim', 'businessMutationClaim must remain not_allowed.', '$.businessMutationClaim'));
  }

  if (typeof payload.recordCount !== 'number' || !Number.isInteger(payload.recordCount) || payload.recordCount < 0) {
    errors.push(issue('invalid_record_count', 'recordCount must be a non-negative integer.', '$.recordCount'));
  }

  if (!isRecord(payload.backendImportPolicy)) {
    errors.push(issue('missing_backend_import_policy', 'backendImportPolicy must be present as an object.', '$.backendImportPolicy'));
  } else {
    for (const [key, expected] of Object.entries(REQUIRED_BACKEND_IMPORT_POLICY)) {
      requireConst(payload.backendImportPolicy, key, expected, errors, '$.backendImportPolicy');
    }
  }

  if (!isRecord(payload.safetyPolicy)) {
    errors.push(issue('missing_safety_policy', 'safetyPolicy must be present as an object.', '$.safetyPolicy'));
  } else {
    for (const key of TRUE_FLAG_DENYLIST) {
      if (payload.safetyPolicy[key] === true) {
        errors.push(issue('unsafe_safety_policy_flag', `safetyPolicy.${key} must not be true.`, `$.safetyPolicy.${key}`));
      }
    }
  }

  if (!Array.isArray(payload.records)) {
    errors.push(issue('missing_records', 'records must be an array.', '$.records'));
  } else {
    if (typeof payload.recordCount === 'number' && payload.recordCount !== payload.records.length) {
      errors.push(issue('record_count_mismatch', 'recordCount must match records.length.', '$.recordCount'));
    }

    const seenImportRecordIds = new Set<string>();
    const seenShadowScoreIds = new Set<string>();
    payload.records.forEach((record, index) => {
      validateRecord(record, index, payload, seenImportRecordIds, seenShadowScoreIds, errors, warnings);
    });
  }

  const duplicateRecordCount = errors.filter((entry) => entry.code === 'duplicate_import_record_id').length;
  const status: ShadowScoreImportValidatorStatus = errors.length > 0 ? 'fail' : warnings.length > 0 ? 'warning' : 'pass';

  return {
    phase: 'Phase 13D',
    validatorKind: 'backend_metadata_only_shadow_score_import_validator',
    status,
    recordCount: Array.isArray(payload.records) ? payload.records.length : 0,
    validatedRecordCount: status === 'fail' ? 0 : Array.isArray(payload.records) ? payload.records.length : 0,
    warningCount: warnings.length,
    errorCount: errors.length,
    forbiddenFieldCount,
    duplicateRecordCount,
    warnings,
    errors,
    safetyPolicy: SHADOW_SCORE_IMPORT_METADATA_ONLY_VALIDATOR_SAFETY_POLICY,
    generatedAt,
  };
};
