import type { StoredShadowScoreMetadataRecord } from '../shadowScoreMetadataStorageTypes';

export type ShadowScoreComparisonStatus = 'ready' | 'partial' | 'insufficient_baseline' | 'empty_candidate' | 'failed';

export type ShadowScoreComparisonBaselineSource = 'stored_metadata' | 'fixture_metadata' | 'none';

export interface ShadowScoreComparisonRequest {
  candidatePackageId: string;
  baselineSource?: ShadowScoreComparisonBaselineSource;
  baselineKey?: string | null;
  predictionType?: string | null;
  horizonDays?: number | null;
  entityType?: string | null;
}

export interface ShadowScoreComparisonSafetyPolicy {
  metadataOnly: true;
  modelExecutionAllowed: false;
  runtimeInvocationAllowed: false;
  inferenceEndpointExposed: false;
  productionIntegrationAllowed: false;
  decisionAutomationAllowed: false;
  businessMutationAllowed: false;
  canChangeInventoryOrAccounting: false;
  canChangePricing: false;
  canChangeReports: false;
  canChangeLedger: false;
  canMutateBusinessRecords: false;
  artifactExecutionAllowed: false;
  artifactActivationAllowed: false;
  artifactBytesLoadingAllowed: false;
  rawTrainingCsvLoadingAllowed: false;
  automaticDeletionAllowed: false;
  purgeJobAllowed: false;
}

export interface ShadowScoreComparisonScoreRecord {
  source: 'candidate_stored_metadata' | 'baseline_stored_metadata' | 'baseline_fixture_metadata';
  candidatePackageId?: string | null;
  baselinePackageId?: string | null;
  modelKey?: string | null;
  modelVersion?: string | null;
  predictionType: string | null;
  horizonDays: number | null;
  entityType: string;
  entityId: string;
  sourceRowIndex: number | null;
  score: number | null;
  label: string | null;
  confidence: number | null;
  metadataOnly: true;
  storedRecord?: StoredShadowScoreMetadataRecord;
}

export interface ShadowScoreLabelDistribution {
  [label: string]: number;
}

export interface ShadowScoreConfidenceSummary {
  count: number;
  nullConfidenceCount: number;
  minConfidence: number | null;
  maxConfidence: number | null;
  meanConfidence: number | null;
}

export interface ShadowScoreDistributionSummary {
  count: number;
  validScoreCount: number;
  nullScoreCount: number;
  nonNumericScoreCount: number;
  minScore: number | null;
  maxScore: number | null;
  meanScore: number | null;
  medianScore: number | null;
  labelDistribution: ShadowScoreLabelDistribution;
  confidenceSummary: ShadowScoreConfidenceSummary;
}

export interface ShadowScoreDeltaDirectionCounts {
  candidateHigher: number;
  candidateLower: number;
  unchanged: number;
}

export interface ShadowScoreDeltaSummary {
  matchedEntityCount: number;
  candidateOnlyCount: number;
  baselineOnlyCount: number;
  duplicateCandidateEntityCount: number;
  duplicateBaselineEntityCount: number;
  absoluteDeltaMean: number | null;
  absoluteDeltaMax: number | null;
  signedDeltaMean: number | null;
  directionCounts: ShadowScoreDeltaDirectionCounts;
}

export interface ShadowScoreAgreementSummary {
  comparableLabelCount: number;
  labelAgreementCount: number;
  labelDisagreementCount: number;
  missingCandidateLabelCount: number;
  missingBaselineLabelCount: number;
  agreementRate: number | null;
}

export interface ShadowScoreBaselineFixtureMappingResult {
  metadataOnly: boolean;
  records: ShadowScoreComparisonScoreRecord[];
  warnings: string[];
  errors: string[];
}

export interface BaselineCoverageSummary {
  baselineSource: ShadowScoreComparisonBaselineSource;
  candidateCount: number;
  baselineCount: number;
  matchedEntityCount: number;
  missingBaselineCount: number;
  extraBaselineCount: number;
  coverageRatio: number;
  status: 'complete' | 'partial' | 'missing';
}

export interface ShadowScoreComparisonResult {
  candidatePackageId: string;
  comparisonStatus: ShadowScoreComparisonStatus;
  metadataOnly: true;
  modelExecutionAllowed: false;
  inferenceEndpointExposed: false;
  businessMutationAllowed: false;
  candidateSummary: ShadowScoreDistributionSummary;
  baselineSummary: ShadowScoreDistributionSummary | null;
  deltaSummary: ShadowScoreDeltaSummary | null;
  agreementSummary: ShadowScoreAgreementSummary | null;
  baselineCoverageSummary: BaselineCoverageSummary;
  safetyPolicy: ShadowScoreComparisonSafetyPolicy;
  warnings: string[];
  errors: string[];
  generatedAt: string;
}

export interface ShadowScoreComparisonServiceOptions {
  baselineRecords?: ShadowScoreComparisonScoreRecord[];
  baselineFixturePayload?: unknown;
}
