import { stableFnv1a64Hash } from '../export/shadowScoreComparisonExportContractMapper';
import { validateShadowScoreComparisonExportContract } from '../export/shadowScoreComparisonExportContractValidator';
import type { ShadowScoreComparisonExportContractEnvelope } from '../export/shadowScoreComparisonExportContractTypes';
import type {
  ShadowScoreComparisonImportDryRunIntegrityCheck,
  ShadowScoreComparisonImportDryRunSafetyPolicy,
} from './shadowScoreComparisonImportDryRunTypes';

const asRecord = (value: unknown): Record<string, unknown> | null => {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
};

export const createShadowScoreComparisonImportDryRunSafetyPolicy = (): ShadowScoreComparisonImportDryRunSafetyPolicy => ({
  metadataOnly: true,
  dryRunOnly: true,
  evidenceOnly: true,
  wouldPersist: false,
  wouldCreateMigration: false,
  wouldCreateTable: false,
  wouldExposeRoute: false,
  modelExecutionAllowed: false,
  runtimeInvocationAllowed: false,
  inferenceEndpointExposed: false,
  productionIntegrationAllowed: false,
  decisionAutomationAllowed: false,
  businessMutationAllowed: false,
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
});

export const verifyShadowScoreComparisonExportIntegrityForImportDryRun = (
  payload: unknown,
): ShadowScoreComparisonImportDryRunIntegrityCheck => {
  const envelope = asRecord(payload);
  if (!envelope) {
    return {
      hashAlgorithm: 'missing',
      canonicalPayloadHashMatches: null,
      comparisonResultHashMatches: null,
      declaredCanonicalPayloadHash: null,
      recomputedCanonicalPayloadHash: null,
      declaredComparisonResultHash: null,
      recomputedComparisonResultHash: null,
    };
  }

  const integrity = asRecord(envelope.integrity);
  const declaredAlgorithm = integrity?.hashAlgorithm;
  const declaredCanonicalPayloadHash = typeof integrity?.canonicalPayloadHash === 'string' ? integrity.canonicalPayloadHash : null;
  const declaredComparisonResultHash = typeof integrity?.comparisonResultHash === 'string' ? integrity.comparisonResultHash : null;
  const algorithm = declaredAlgorithm === 'stable-json-fnv1a64' ? 'stable-json-fnv1a64' : declaredAlgorithm ? 'unsupported' : 'missing';

  if (algorithm !== 'stable-json-fnv1a64') {
    return {
      hashAlgorithm: algorithm,
      canonicalPayloadHashMatches: null,
      comparisonResultHashMatches: null,
      declaredCanonicalPayloadHash,
      recomputedCanonicalPayloadHash: null,
      declaredComparisonResultHash,
      recomputedComparisonResultHash: null,
    };
  }

  const { integrity: _ignoredIntegrity, ...envelopeWithoutIntegrity } = envelope;
  const recomputedCanonicalPayloadHash = stableFnv1a64Hash(envelopeWithoutIntegrity);
  const recomputedComparisonResultHash = envelope.comparisonResult
    ? stableFnv1a64Hash(envelope.comparisonResult)
    : null;

  return {
    hashAlgorithm: 'stable-json-fnv1a64',
    canonicalPayloadHashMatches: declaredCanonicalPayloadHash === recomputedCanonicalPayloadHash,
    comparisonResultHashMatches: declaredComparisonResultHash === recomputedComparisonResultHash,
    declaredCanonicalPayloadHash,
    recomputedCanonicalPayloadHash,
    declaredComparisonResultHash,
    recomputedComparisonResultHash,
  };
};

export const validateShadowScoreComparisonExportImportDryRunPayload = (payload: unknown) => {
  const exportValidation = validateShadowScoreComparisonExportContract(payload);
  const integrityCheck = verifyShadowScoreComparisonExportIntegrityForImportDryRun(payload);
  const errors = [...exportValidation.errors];
  const warnings = [...exportValidation.warnings];

  if (integrityCheck.hashAlgorithm !== 'stable-json-fnv1a64') {
    errors.push('import_dry_run_integrity_hash_algorithm_invalid');
  }
  if (integrityCheck.canonicalPayloadHashMatches !== true) {
    errors.push('import_dry_run_canonical_payload_hash_mismatch');
  }
  if (integrityCheck.comparisonResultHashMatches !== true) {
    errors.push('import_dry_run_comparison_result_hash_mismatch');
  }

  return {
    validationStatus: errors.length === 0 ? 'valid' as const : 'invalid' as const,
    metadataOnly: exportValidation.metadataOnly,
    evidenceOnly: exportValidation.evidenceOnly,
    errors,
    warnings,
    integrityCheck,
  };
};

export const coerceValidShadowScoreComparisonExportEnvelopeForImportDryRun = (
  payload: unknown,
): ShadowScoreComparisonExportContractEnvelope | null => {
  const validation = validateShadowScoreComparisonExportImportDryRunPayload(payload);
  if (validation.validationStatus !== 'valid') return null;
  return payload as ShadowScoreComparisonExportContractEnvelope;
};
