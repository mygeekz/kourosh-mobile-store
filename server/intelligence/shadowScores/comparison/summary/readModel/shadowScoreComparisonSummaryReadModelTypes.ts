import type { StoredShadowScoreComparisonSummaryRecord } from '../shadowScoreComparisonSummaryTypes';
import type { ShadowScoreComparisonBaselineSource } from '../../shadowScoreComparisonTypes';

export type ShadowScoreComparisonSummaryReadModelPhase = 'Phase 15C' | 'Phase 16A' | 'Phase 16C';
export type ShadowScoreComparisonSummaryReadModelKind = 'metadata_only_shadow_score_comparison_summary_internal_admin_read_model';

export interface ShadowScoreComparisonSummaryReadModelSafetyEnvelope {
  metadataOnly: true;
  readOnly: true;
  internalAdminReadModelOnly: true;
  publicApiRouteAdded: false;
  uiAdded: false;
  governanceWorkflowAdded: false;
  modelExecutionAllowed: false;
  runtimeInvocationAllowed: false;
  inferenceEndpointExposed: false;
  productionIntegrationAllowed: false;
  decisionAutomationAllowed: false;
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

export interface ShadowScoreComparisonSummaryReadModelListRequest {
  candidatePackageId?: string | null;
  modelKey?: string | null;
  modelVersion?: string | null;
  predictionType?: string | null;
  baselineSource?: ShadowScoreComparisonBaselineSource | null;
  baselineKey?: string | null;
  comparisonStatus?: string | null;
  baselineCoverageStatus?: StoredShadowScoreComparisonSummaryRecord['baselineCoverageStatus'] | null;
  entityType?: string | null;
  limit?: number | null;
  offset?: number | null;
  sort?: 'createdAt_desc' | 'createdAt_asc' | null;
}

export interface ShadowScoreComparisonSummaryReadModelIdentityRequest {
  summaryKey?: string | null;
  id?: number | null;
}

export interface ShadowScoreComparisonSummaryReadModelListItem {
  id: number;
  summaryKey: string;
  candidatePackageId: string;
  baselineSource: ShadowScoreComparisonBaselineSource;
  baselineKey: string | null;
  predictionType: string | null;
  horizonDays: number | null;
  entityType: string | null;
  comparisonStatus: string;
  baselineCoverageStatus: StoredShadowScoreComparisonSummaryRecord['baselineCoverageStatus'];
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
  createdAt: string;
  safetyFlags: {
    metadataOnly: boolean;
    modelBinaryPresent: boolean;
    rawCsvPresent: boolean;
    inferenceDirectivePresent: boolean;
    activationDirectivePresent: boolean;
    businessMutationDirectivePresent: boolean;
  };
}

export interface ShadowScoreComparisonSummaryReadModelDetail extends ShadowScoreComparisonSummaryReadModelListItem {
  summaryPayload: unknown;
  comparisonResult: unknown;
  safetyPolicy: unknown;
  createdByUserId: number | null;
}

export interface ShadowScoreComparisonSummaryReadModelOverview {
  phase: ShadowScoreComparisonSummaryReadModelPhase;
  readModelKind: ShadowScoreComparisonSummaryReadModelKind;
  generatedAt: string;
  stats: {
    summaryCount: number;
    candidatePackageCount: number;
    storedBaselineSummaryCount: number;
    coverageStatusDistribution: {
      complete: number;
      partial: number;
      missing: number;
    };
    safeMetadataOnlyCount: number;
    unsafeFlagCount: number;
  };
  latestSummary: ShadowScoreComparisonSummaryReadModelListItem | null;
  safety: ShadowScoreComparisonSummaryReadModelSafetyEnvelope;
}

export interface ShadowScoreComparisonSummaryReadModelListResult {
  phase: ShadowScoreComparisonSummaryReadModelPhase;
  readModelKind: ShadowScoreComparisonSummaryReadModelKind;
  generatedAt: string;
  filters: ShadowScoreComparisonSummaryReadModelListRequest;
  count: number;
  items: ShadowScoreComparisonSummaryReadModelListItem[];
  safety: ShadowScoreComparisonSummaryReadModelSafetyEnvelope;
}


export interface ShadowScoreComparisonSummaryInternalReadModelPage {
  limit: number;
  offset: number;
  total: number | null;
  hasMore: boolean;
}

export interface ShadowScoreComparisonSummaryInternalReadModelRouteSummary {
  metadataOnly: true;
  modelExecutionAllowed: false;
  runtimeInvocationAllowed: false;
  inferenceEndpointExposed: false;
  artifactActivationAllowed: false;
  businessMutationAllowed: false;
  returnedCount: number;
}

export interface ShadowScoreComparisonSummaryInternalReadModelRouteResult {
  items: ShadowScoreComparisonSummaryReadModelListItem[];
  page: ShadowScoreComparisonSummaryInternalReadModelPage;
  summary: ShadowScoreComparisonSummaryInternalReadModelRouteSummary;
  filters: {
    candidatePackageId?: string;
    modelKey?: string;
    modelVersion?: string;
    predictionType?: string;
    baselineKey?: string;
    comparisonStatus?: string;
  };
}



export interface ShadowScoreComparisonSummaryInternalReadModelSuccessEnvelope {
  success: true;
  data: ShadowScoreComparisonSummaryInternalReadModelRouteResult;
}

export interface ShadowScoreComparisonSummaryInternalReadModelErrorEnvelope {
  success: false;
  message: 'Invalid metadata-only comparison summary read-model request.';
}

export interface ShadowScoreComparisonSummaryReadModelDetailResult {
  phase: ShadowScoreComparisonSummaryReadModelPhase;
  readModelKind: ShadowScoreComparisonSummaryReadModelKind;
  generatedAt: string;
  found: boolean;
  record: ShadowScoreComparisonSummaryReadModelDetail | null;
  safety: ShadowScoreComparisonSummaryReadModelSafetyEnvelope;
}
