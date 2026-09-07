import type { ShadowScoreComparisonResult } from '../shadowScoreComparisonTypes';
import type {
  ShadowScoreComparisonExportContractEnvelope,
  ShadowScoreComparisonExportIntegrity,
  ShadowScoreComparisonExportSafetyAssertions,
  ShadowScoreComparisonExportSummary,
} from './shadowScoreComparisonExportContractTypes';

export const stableJsonStringify = (value: unknown): string => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableJsonStringify(item)).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJsonStringify(record[key])}`)
    .join(',')}}`;
};

export const stableFnv1a64Hash = (value: unknown): string => {
  const input = stableJsonStringify(value);
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= BigInt(input.charCodeAt(index));
    hash = BigInt.asUintN(64, hash * prime);
  }
  return `fnv1a64:${hash.toString(16).padStart(16, '0')}`;
};

export const mapComparisonResultToExportSafetyAssertions = (
  result: ShadowScoreComparisonResult,
): ShadowScoreComparisonExportSafetyAssertions => ({
  ...result.safetyPolicy,
  evidenceOnly: true,
  containsModelBinary: false,
  containsRawCsv: false,
  containsInferenceDirective: false,
  containsActivationDirective: false,
  containsBusinessMutationDirective: false,
  containsProductionDecision: false,
});

export const mapComparisonResultToExportSummary = (
  result: ShadowScoreComparisonResult,
): ShadowScoreComparisonExportSummary => ({
  candidatePackageId: result.candidatePackageId,
  comparisonStatus: result.comparisonStatus,
  candidateSummary: result.candidateSummary,
  baselineSummary: result.baselineSummary,
  deltaSummary: result.deltaSummary,
  agreementSummary: result.agreementSummary,
  warningCount: result.warnings.length,
  errorCount: result.errors.length,
});

export const createComparisonExportIntegrity = (
  envelopeWithoutIntegrity: Omit<ShadowScoreComparisonExportContractEnvelope, 'integrity'>,
): ShadowScoreComparisonExportIntegrity => ({
  canonicalPayloadHash: stableFnv1a64Hash(envelopeWithoutIntegrity),
  comparisonResultHash: stableFnv1a64Hash(envelopeWithoutIntegrity.comparisonResult),
  contractVersion: 'shadow_score_comparison_export_contract_v1',
  hashAlgorithm: 'stable-json-fnv1a64',
});
