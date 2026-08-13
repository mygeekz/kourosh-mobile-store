import type { ShadowScoreComparisonStatus } from '../shadowScoreComparisonTypes';
import type {
  ShadowScoreComparisonExportContractEnvelope,
  ShadowScoreComparisonExportContractVersion,
  ShadowScoreComparisonExportKind,
} from '../export/shadowScoreComparisonExportContractTypes';
import type {
  ShadowScoreComparisonImportDryRunRequest,
  ShadowScoreComparisonImportDryRunResult,
} from './shadowScoreComparisonImportDryRunTypes';
import {
  coerceValidShadowScoreComparisonExportEnvelopeForImportDryRun,
  createShadowScoreComparisonImportDryRunSafetyPolicy,
  validateShadowScoreComparisonExportImportDryRunPayload,
} from './shadowScoreComparisonImportDryRunValidator';

const asRecord = (value: unknown): Record<string, unknown> | null => {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
};

const asExportKind = (value: unknown): ShadowScoreComparisonExportKind | null => {
  return value === 'metadata_only_shadow_score_comparison_export' ? value : null;
};

const asContractVersion = (value: unknown): ShadowScoreComparisonExportContractVersion | null => {
  return value === 'shadow_score_comparison_export_contract_v1' ? value : null;
};

const asComparisonStatus = (value: unknown): ShadowScoreComparisonStatus | null => {
  return value === 'ready' || value === 'partial' || value === 'insufficient_baseline' || value === 'empty_candidate' || value === 'failed'
    ? value
    : null;
};

export const dryRunImportShadowScoreComparisonExportContract = (
  request: ShadowScoreComparisonImportDryRunRequest,
): ShadowScoreComparisonImportDryRunResult => {
  const generatedAt = new Date().toISOString();
  const receivedAt = request.receivedAt ?? generatedAt;
  const validation = validateShadowScoreComparisonExportImportDryRunPayload(request.payload);
  const envelope = asRecord(request.payload);
  const source = asRecord(envelope?.source);
  const acceptedEnvelope = coerceValidShadowScoreComparisonExportEnvelopeForImportDryRun(request.payload);
  const candidatePackageId = typeof source?.candidatePackageId === 'string'
    ? source.candidatePackageId
    : typeof asRecord(envelope?.summary)?.candidatePackageId === 'string'
    ? (asRecord(envelope?.summary)?.candidatePackageId as string)
    : null;

  return {
    dryRunOnly: true,
    metadataOnly: true,
    evidenceOnly: true,
    wouldPersist: false,
    wouldMutateBusinessRecords: false,
    modelExecutionAllowed: false,
    inferenceEndpointExposed: false,
    artifactActivationAllowed: false,
    importStatus: validation.validationStatus === 'valid' ? 'accepted' : 'rejected',
    validationStatus: validation.validationStatus,
    exportKind: asExportKind(envelope?.exportKind),
    contractVersion: asContractVersion(envelope?.contractVersion),
    candidatePackageId,
    comparisonStatus: asComparisonStatus(source?.comparisonStatus),
    baselineAvailable: typeof source?.baselineAvailable === 'boolean' ? source.baselineAvailable : null,
    integrityCheck: validation.integrityCheck,
    safetyPolicy: createShadowScoreComparisonImportDryRunSafetyPolicy(),
    acceptedEnvelope: acceptedEnvelope as ShadowScoreComparisonExportContractEnvelope | null,
    warnings: validation.warnings,
    errors: validation.errors,
    generatedAt,
    receivedAt,
    sourceName: request.sourceName ?? null,
  };
};

export const validateShadowScoreComparisonExportContractImportDryRun = (
  payload: unknown,
): ShadowScoreComparisonImportDryRunResult => dryRunImportShadowScoreComparisonExportContract({ payload });
