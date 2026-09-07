import type {
  ShadowScoreImportApplyReceiptExportContractEnvelope,
  ShadowScoreImportApplyReceiptExportContractValidationResult,
} from './shadowScoreImportApplyReceiptExportContractTypes';

const unsafeTrueKeys = new Set([
  'modelExecutionAllowed',
  'runtimeInvocationAllowed',
  'inferenceEndpointExposed',
  'productionIntegrationAllowed',
  'decisionAutomationAllowed',
  'businessMutationAllowed',
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
  'containsModelBinary',
  'containsRawCsv',
  'containsFilesystemPath',
  'containsInferenceDirective',
  'containsActivationDirective',
  'containsBusinessMutationDirective',
  'containsProductionDecision',
  'modelBinaryPresent',
  'rawCsvPresent',
  'inferenceDirectivePresent',
  'activationDirectivePresent',
  'businessMutationDirectivePresent',
]);

const forbiddenPayloadKeys = new Set([
  'modelBinary',
  'modelBytes',
  'modelBlob',
  'rawCsv',
  'trainCsv',
  'testCsv',
  'rawTrainingCsv',
  'rawTestCsv',
  'filePath',
  'workbenchOutputPath',
  'modelPath',
  'csvPath',
  'inferenceDirective',
  'activationDirective',
  'businessMutationDirective',
  'productionDecision',
  'productionDecisionDirective',
  'backendExecutionDirective',
  'activationFlag',
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
  'inventoryMutation',
  'accountingMutation',
  'ledgerMutation',
  'pricingMutation',
  'reportMutation',
  'execute',
  'activate',
  'runInference',
]);

const forbiddenStringPatterns = [/model\.jo(?:b)lib/i, /train\.csv/i, /test\.csv/i, /\.csv\b/i, /\.jo(?:b)lib\b/i, /\.pkl\b/i, /\.onnx\b/i, /(?:^|[\\/])ml-workbench[\\/]/i];

const asRecord = (value: unknown): Record<string, unknown> | null => {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
};

const inspectPayload = (value: unknown, path: string, errors: string[]): void => {
  if (typeof value === 'string') {
    if (forbiddenStringPatterns.some((pattern) => pattern.test(value))) errors.push(`forbidden_export_payload_string:${path || '<root>'}`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => inspectPayload(item, `${path}[${index}]`, errors));
    return;
  }
  const record = asRecord(value);
  if (!record) return;
  for (const [key, nestedValue] of Object.entries(record)) {
    const nestedPath = path ? `${path}.${key}` : key;
    if (forbiddenPayloadKeys.has(key)) errors.push(`forbidden_receipt_export_payload_key:${nestedPath}`);
    if (unsafeTrueKeys.has(key) && nestedValue === true) errors.push(`unsafe_receipt_export_flag_enabled:${nestedPath}`);
    inspectPayload(nestedValue, nestedPath, errors);
  }
};

export const validateShadowScoreImportApplyReceiptExportContract = (
  payload: unknown,
): ShadowScoreImportApplyReceiptExportContractValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const envelope = asRecord(payload);
  if (!envelope) {
    return {
      validationStatus: 'invalid',
      metadataOnly: false,
      readOnly: false,
      evidenceOnly: false,
      errors: ['receipt_export_contract_payload_must_be_object'],
      warnings,
    };
  }

  if (envelope.exportKind !== 'metadata_only_import_apply_receipt_export') errors.push('receipt_export_kind_invalid');
  if (envelope.contractVersion !== 'shadow_score_import_apply_receipt_export_contract_v1') errors.push('receipt_export_contract_version_invalid');
  if (envelope.metadataOnly !== true) errors.push('receipt_export_contract_must_be_metadata_only');
  if (envelope.readOnly !== true) errors.push('receipt_export_contract_must_be_read_only');
  if (envelope.evidenceOnly !== true) errors.push('receipt_export_contract_must_be_evidence_only');
  if (!Array.isArray(envelope.receipts)) errors.push('receipt_export_receipts_required');

  const readModel = asRecord(envelope.readModel);
  if (!readModel) errors.push('receipt_export_read_model_required');
  else {
    if (readModel.metadataOnly !== true) errors.push('receipt_export_read_model_must_be_metadata_only');
    if (readModel.readOnly !== true) errors.push('receipt_export_read_model_must_be_read_only');
  }

  const safetyAssertions = asRecord(envelope.safetyAssertions);
  if (!safetyAssertions) errors.push('receipt_export_safety_assertions_required');
  else {
    if (safetyAssertions.metadataOnly !== true) errors.push('receipt_export_safety_metadata_only_required');
    if (safetyAssertions.readOnly !== true) errors.push('receipt_export_safety_read_only_required');
    if (safetyAssertions.evidenceOnly !== true) errors.push('receipt_export_safety_evidence_only_required');
  }

  const integrity = asRecord(envelope.integrity);
  if (!integrity) errors.push('receipt_export_integrity_required');
  else {
    for (const key of ['canonicalPayloadHash', 'readModelHash', 'receiptSetHash']) {
      if (typeof integrity[key] !== 'string' || !String(integrity[key]).startsWith('fnv1a64:')) errors.push(`${key}_required`);
    }
    if (integrity.contractVersion !== 'shadow_score_import_apply_receipt_export_contract_v1') errors.push('receipt_export_integrity_contract_version_invalid');
  }

  inspectPayload(envelope, '', errors);

  return {
    validationStatus: errors.length === 0 ? 'valid' : 'invalid',
    metadataOnly: envelope.metadataOnly === true,
    readOnly: envelope.readOnly === true,
    evidenceOnly: envelope.evidenceOnly === true,
    errors,
    warnings,
  };
};

export const assertValidShadowScoreImportApplyReceiptExportContract = (
  envelope: ShadowScoreImportApplyReceiptExportContractEnvelope,
): ShadowScoreImportApplyReceiptExportContractEnvelope => {
  const validation = validateShadowScoreImportApplyReceiptExportContract(envelope);
  if (validation.validationStatus !== 'valid') {
    throw new Error(`Invalid metadata-only import apply receipt export contract: ${validation.errors.join(', ')}`);
  }
  return envelope;
};
