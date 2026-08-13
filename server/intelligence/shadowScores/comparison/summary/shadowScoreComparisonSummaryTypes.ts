import type {
  BaselineCoverageSummary,
  ShadowScoreAgreementSummary,
  ShadowScoreComparisonBaselineSource,
  ShadowScoreComparisonRequest,
  ShadowScoreComparisonResult,
  ShadowScoreComparisonStatus,
  ShadowScoreComparisonSafetyPolicy,
  ShadowScoreDeltaSummary,
  ShadowScoreDistributionSummary,
} from '../shadowScoreComparisonTypes';

export type ShadowScoreComparisonSummaryCoverageStatus = BaselineCoverageSummary['status'];

export interface ShadowScoreComparisonSummaryPayload {
  phase: 'Phase 15B';
  summaryKind: 'metadata_only_shadow_score_comparison_summary_persistence';
  candidatePackageId: string;
  baselineSource: ShadowScoreComparisonBaselineSource;
  baselineKey: string | null;
  predictionType: string | null;
  horizonDays: number | null;
  entityType: string | null;
  comparisonStatus: ShadowScoreComparisonStatus;
  baselineCoverageSummary: BaselineCoverageSummary;
  candidateSummary: ShadowScoreDistributionSummary;
  baselineSummary: ShadowScoreDistributionSummary | null;
  deltaSummary: ShadowScoreDeltaSummary | null;
  agreementSummary: ShadowScoreAgreementSummary | null;
  warningCount: number;
  errorCount: number;
  metadataOnly: true;
  evidenceOnly: true;
  modelExecutionAllowed: false;
  inferenceEndpointExposed: false;
  artifactActivationAllowed: false;
  canMutateBusinessRecords: false;
}

export interface ShadowScoreComparisonSummaryPersistenceInput {
  summaryKey: string;
  candidatePackageId: string;
  baselineSource: ShadowScoreComparisonBaselineSource;
  baselineKey: string | null;
  predictionType: string | null;
  horizonDays: number | null;
  entityType: string | null;
  comparisonStatus: ShadowScoreComparisonStatus;
  baselineCoverageStatus: ShadowScoreComparisonSummaryCoverageStatus;
  candidateCount: number;
  baselineCount: number;
  matchedEntityCount: number;
  missingBaselineCount: number;
  extraBaselineCount: number;
  coverageRatio: number;
  absoluteDeltaMean: number | null;
  absoluteDeltaMax: number | null;
  signedDeltaMean: number | null;
  labelAgreementRate: number | null;
  warningCount: number;
  errorCount: number;
  comparisonGeneratedAt: string;
  comparisonResultHash: string;
  summaryPayload: ShadowScoreComparisonSummaryPayload;
  comparisonResult: ShadowScoreComparisonResult;
  metadataOnly: true;
  modelBinaryPresent: false;
  rawCsvPresent: false;
  inferenceDirectivePresent: false;
  activationDirectivePresent: false;
  businessMutationDirectivePresent: false;
  safetyPolicy: ShadowScoreComparisonSafetyPolicy;
  createdByUserId?: number | null;
}

export interface StoredShadowScoreComparisonSummaryRecord {
  id: number;
  summaryKey: string;
  candidatePackageId: string;
  baselineSource: ShadowScoreComparisonBaselineSource;
  baselineKey: string | null;
  predictionType: string | null;
  horizonDays: number | null;
  entityType: string | null;
  comparisonStatus: string;
  baselineCoverageStatus: ShadowScoreComparisonSummaryCoverageStatus;
  candidateCount: number;
  baselineCount: number;
  matchedEntityCount: number;
  missingBaselineCount: number;
  extraBaselineCount: number;
  coverageRatio: number;
  absoluteDeltaMean: number | null;
  absoluteDeltaMax: number | null;
  signedDeltaMean: number | null;
  labelAgreementRate: number | null;
  warningCount: number;
  errorCount: number;
  comparisonGeneratedAt: string;
  comparisonResultHash: string;
  summaryPayload: unknown;
  comparisonResult: unknown;
  metadataOnly: boolean;
  modelBinaryPresent: boolean;
  rawCsvPresent: boolean;
  inferenceDirectivePresent: boolean;
  activationDirectivePresent: boolean;
  businessMutationDirectivePresent: boolean;
  safetyPolicy: unknown;
  createdAt: string;
  createdByUserId: number | null;
}

export interface ShadowScoreComparisonSummaryWriteResult {
  status: 'pass' | 'fail';
  inserted: boolean;
  duplicate: boolean;
  rejected: boolean;
  reason: string | null;
  record: StoredShadowScoreComparisonSummaryRecord | null;
}

export interface ShadowScoreComparisonSummaryPersistenceResult {
  phase: 'Phase 15B';
  persistenceKind: 'metadata_only_shadow_score_comparison_summary_persistence';
  comparisonResult: ShadowScoreComparisonResult;
  summaryPayload: ShadowScoreComparisonSummaryPayload;
  summaryWriteResult: ShadowScoreComparisonSummaryWriteResult;
  metadataOnly: true;
  modelExecutionAllowed: false;
  inferenceEndpointExposed: false;
  artifactActivationAllowed: false;
  canMutateBusinessRecords: false;
}

export interface ShadowScoreComparisonSummaryPersistenceOptions {
  createdByUserId?: number | null;
  summaryKeySalt?: string | null;
}

export interface ShadowScoreComparisonSummarySourceRequest extends ShadowScoreComparisonRequest {
  baselineKey?: string | null;
}
