import type {
  ShadowScoreAgreementSummary,
  ShadowScoreComparisonResult,
  ShadowScoreComparisonSafetyPolicy,
  ShadowScoreComparisonStatus,
  ShadowScoreDeltaSummary,
  ShadowScoreDistributionSummary,
} from '../shadowScoreComparisonTypes';

export type ShadowScoreComparisonExportContractVersion = 'shadow_score_comparison_export_contract_v1';

export type ShadowScoreComparisonExportKind = 'metadata_only_shadow_score_comparison_export';

export type ShadowScoreComparisonExportValidationStatus = 'valid' | 'invalid';

export interface ShadowScoreComparisonExportSourceDescriptor {
  sourcePhase: 'Phase 14B';
  exportPhase: 'Phase 14C';
  comparisonGeneratedAt: string;
  candidatePackageId: string;
  comparisonStatus: ShadowScoreComparisonStatus;
  baselineAvailable: boolean;
}

export interface ShadowScoreComparisonExportSafetyAssertions extends ShadowScoreComparisonSafetyPolicy {
  evidenceOnly: true;
  containsModelBinary: false;
  containsRawCsv: false;
  containsInferenceDirective: false;
  containsActivationDirective: false;
  containsBusinessMutationDirective: false;
  containsProductionDecision: false;
}

export interface ShadowScoreComparisonExportSummary {
  candidatePackageId: string;
  comparisonStatus: ShadowScoreComparisonStatus;
  candidateSummary: ShadowScoreDistributionSummary;
  baselineSummary: ShadowScoreDistributionSummary | null;
  deltaSummary: ShadowScoreDeltaSummary | null;
  agreementSummary: ShadowScoreAgreementSummary | null;
  warningCount: number;
  errorCount: number;
}

export interface ShadowScoreComparisonExportIntegrity {
  canonicalPayloadHash: string;
  comparisonResultHash: string;
  contractVersion: ShadowScoreComparisonExportContractVersion;
  hashAlgorithm: 'stable-json-fnv1a64';
}

export interface ShadowScoreComparisonExportContractEnvelope {
  exportKind: ShadowScoreComparisonExportKind;
  contractVersion: ShadowScoreComparisonExportContractVersion;
  metadataOnly: true;
  evidenceOnly: true;
  generatedAt: string;
  source: ShadowScoreComparisonExportSourceDescriptor;
  safetyAssertions: ShadowScoreComparisonExportSafetyAssertions;
  summary: ShadowScoreComparisonExportSummary;
  comparisonResult: ShadowScoreComparisonResult;
  integrity: ShadowScoreComparisonExportIntegrity;
  warnings: string[];
  errors: string[];
}

export interface ShadowScoreComparisonExportContractValidationResult {
  validationStatus: ShadowScoreComparisonExportValidationStatus;
  metadataOnly: boolean;
  evidenceOnly: boolean;
  errors: string[];
  warnings: string[];
}
