import type { ShadowScoreComparisonResult } from '../shadowScoreComparisonTypes';
import {
  createComparisonExportIntegrity,
  mapComparisonResultToExportSafetyAssertions,
  mapComparisonResultToExportSummary,
} from './shadowScoreComparisonExportContractMapper';
import { assertValidShadowScoreComparisonExportContract } from './shadowScoreComparisonExportContractValidator';
import type { ShadowScoreComparisonExportContractEnvelope } from './shadowScoreComparisonExportContractTypes';

export interface CreateShadowScoreComparisonExportContractOptions {
  generatedAt?: string;
  warnings?: string[];
}

export const createShadowScoreComparisonExportContract = (
  comparisonResult: ShadowScoreComparisonResult,
  options: CreateShadowScoreComparisonExportContractOptions = {},
): ShadowScoreComparisonExportContractEnvelope => {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const envelopeWithoutIntegrity: Omit<ShadowScoreComparisonExportContractEnvelope, 'integrity'> = {
    exportKind: 'metadata_only_shadow_score_comparison_export',
    contractVersion: 'shadow_score_comparison_export_contract_v1',
    metadataOnly: true,
    evidenceOnly: true,
    generatedAt,
    source: {
      sourcePhase: 'Phase 14B',
      exportPhase: 'Phase 14C',
      comparisonGeneratedAt: comparisonResult.generatedAt,
      candidatePackageId: comparisonResult.candidatePackageId,
      comparisonStatus: comparisonResult.comparisonStatus,
      baselineAvailable: comparisonResult.baselineSummary !== null,
    },
    safetyAssertions: mapComparisonResultToExportSafetyAssertions(comparisonResult),
    summary: mapComparisonResultToExportSummary(comparisonResult),
    comparisonResult,
    warnings: [...comparisonResult.warnings, ...(options.warnings ?? [])],
    errors: comparisonResult.errors,
  };

  return assertValidShadowScoreComparisonExportContract({
    ...envelopeWithoutIntegrity,
    integrity: createComparisonExportIntegrity(envelopeWithoutIntegrity),
  });
};
