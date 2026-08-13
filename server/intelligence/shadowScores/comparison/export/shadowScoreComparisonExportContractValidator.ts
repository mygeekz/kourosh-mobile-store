import type { ShadowScoreComparisonExportContractEnvelope, ShadowScoreComparisonExportContractValidationResult } from './shadowScoreComparisonExportContractTypes';

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
  'inferenceDirective',
  'activationDirective',
  'businessMutationDirective',
  'productionDecision',
  'activationFlag',
  'inventoryMutation',
  'accountingMutation',
  'ledgerMutation',
  'pricingMutation',
  'reportMutation',
]);

const asRecord = (value: unknown): Record<string, unknown> | null => {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
};

const inspectPayload = (value: unknown, path: string, errors: string[]): void => {
  if (Array.isArray(value)) {
    value.forEach((item, index) => inspectPayload(item, `${path}[${index}]`, errors));
    return;
  }
  const record = asRecord(value);
  if (!record) return;
  for (const [key, nestedValue] of Object.entries(record)) {
    const nestedPath = path ? `${path}.${key}` : key;
    if (forbiddenPayloadKeys.has(key)) errors.push(`forbidden_export_payload_key:${nestedPath}`);
    if (unsafeTrueKeys.has(key) && nestedValue === true) errors.push(`unsafe_export_flag_enabled:${nestedPath}`);
    inspectPayload(nestedValue, nestedPath, errors);
  }
};

export const validateShadowScoreComparisonExportContract = (
  payload: unknown,
): ShadowScoreComparisonExportContractValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const envelope = asRecord(payload);
  if (!envelope) {
    return {
      validationStatus: 'invalid',
      metadataOnly: false,
      evidenceOnly: false,
      errors: ['export_contract_payload_must_be_object'],
      warnings,
    };
  }

  if (envelope.exportKind !== 'metadata_only_shadow_score_comparison_export') errors.push('export_kind_invalid');
  if (envelope.contractVersion !== 'shadow_score_comparison_export_contract_v1') errors.push('export_contract_version_invalid');
  if (envelope.metadataOnly !== true) errors.push('export_contract_must_be_metadata_only');
  if (envelope.evidenceOnly !== true) errors.push('export_contract_must_be_evidence_only');

  const comparisonResult = asRecord(envelope.comparisonResult);
  if (!comparisonResult) errors.push('comparison_result_required');
  else {
    if (comparisonResult.metadataOnly !== true) errors.push('comparison_result_must_be_metadata_only');
    if (comparisonResult.modelExecutionAllowed !== false) errors.push('comparison_result_model_execution_must_be_false');
    if (comparisonResult.inferenceEndpointExposed !== false) errors.push('comparison_result_inference_endpoint_must_be_false');
    if (comparisonResult.businessMutationAllowed !== false) errors.push('comparison_result_business_mutation_must_be_false');
  }

  const safetyAssertions = asRecord(envelope.safetyAssertions);
  if (!safetyAssertions) errors.push('safety_assertions_required');
  else {
    if (safetyAssertions.metadataOnly !== true) errors.push('safety_assertions_metadata_only_required');
    if (safetyAssertions.evidenceOnly !== true) errors.push('safety_assertions_evidence_only_required');
  }

  const integrity = asRecord(envelope.integrity);
  if (!integrity) errors.push('integrity_required');
  else {
    if (typeof integrity.canonicalPayloadHash !== 'string' || !integrity.canonicalPayloadHash.startsWith('fnv1a64:')) {
      errors.push('canonical_payload_hash_required');
    }
    if (typeof integrity.comparisonResultHash !== 'string' || !integrity.comparisonResultHash.startsWith('fnv1a64:')) {
      errors.push('comparison_result_hash_required');
    }
  }

  inspectPayload(envelope, '', errors);

  return {
    validationStatus: errors.length === 0 ? 'valid' : 'invalid',
    metadataOnly: envelope.metadataOnly === true,
    evidenceOnly: envelope.evidenceOnly === true,
    errors,
    warnings,
  };
};

export const assertValidShadowScoreComparisonExportContract = (
  envelope: ShadowScoreComparisonExportContractEnvelope,
): ShadowScoreComparisonExportContractEnvelope => {
  const validation = validateShadowScoreComparisonExportContract(envelope);
  if (validation.validationStatus !== 'valid') {
    throw new Error(`Invalid metadata-only shadow score comparison export contract: ${validation.errors.join(', ')}`);
  }
  return envelope;
};
