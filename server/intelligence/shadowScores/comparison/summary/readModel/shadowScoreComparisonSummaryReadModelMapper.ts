import type { StoredShadowScoreComparisonSummaryRecord } from '../shadowScoreComparisonSummaryTypes';
import type {
  ShadowScoreComparisonSummaryReadModelDetail,
  ShadowScoreComparisonSummaryReadModelListItem,
  ShadowScoreComparisonSummaryReadModelSafetyEnvelope,
} from './shadowScoreComparisonSummaryReadModelTypes';

export const STORED_COMPARISON_SUMMARY_READ_MODEL_SAFETY: ShadowScoreComparisonSummaryReadModelSafetyEnvelope = {
  metadataOnly: true,
  readOnly: true,
  internalAdminReadModelOnly: true,
  publicApiRouteAdded: false,
  uiAdded: false,
  governanceWorkflowAdded: false,
  modelExecutionAllowed: false,
  runtimeInvocationAllowed: false,
  inferenceEndpointExposed: false,
  productionIntegrationAllowed: false,
  decisionAutomationAllowed: false,
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
};

export const mapStoredShadowScoreComparisonSummaryToReadModelListItem = (
  record: StoredShadowScoreComparisonSummaryRecord,
): ShadowScoreComparisonSummaryReadModelListItem => ({
  id: record.id,
  summaryKey: record.summaryKey,
  candidatePackageId: record.candidatePackageId,
  baselineSource: record.baselineSource,
  baselineKey: record.baselineKey,
  predictionType: record.predictionType,
  horizonDays: record.horizonDays,
  entityType: record.entityType,
  comparisonStatus: record.comparisonStatus,
  baselineCoverageStatus: record.baselineCoverageStatus,
  candidateCount: record.candidateCount,
  baselineCount: record.baselineCount,
  matchedEntityCount: record.matchedEntityCount,
  missingBaselineCount: record.missingBaselineCount,
  extraBaselineCount: record.extraBaselineCount,
  coverageRatio: record.coverageRatio,
  absoluteDeltaMean: record.absoluteDeltaMean,
  absoluteDeltaMax: record.absoluteDeltaMax,
  signedDeltaMean: record.signedDeltaMean,
  labelAgreementRate: record.labelAgreementRate,
  warningCount: record.warningCount,
  errorCount: record.errorCount,
  comparisonGeneratedAt: record.comparisonGeneratedAt,
  comparisonResultHash: record.comparisonResultHash,
  createdAt: record.createdAt,
  safetyFlags: {
    metadataOnly: record.metadataOnly,
    modelBinaryPresent: record.modelBinaryPresent,
    rawCsvPresent: record.rawCsvPresent,
    inferenceDirectivePresent: record.inferenceDirectivePresent,
    activationDirectivePresent: record.activationDirectivePresent,
    businessMutationDirectivePresent: record.businessMutationDirectivePresent,
  },
});

export const mapStoredShadowScoreComparisonSummaryToReadModelDetail = (
  record: StoredShadowScoreComparisonSummaryRecord,
): ShadowScoreComparisonSummaryReadModelDetail => ({
  ...mapStoredShadowScoreComparisonSummaryToReadModelListItem(record),
  summaryPayload: record.summaryPayload,
  comparisonResult: record.comparisonResult,
  safetyPolicy: record.safetyPolicy,
  createdByUserId: record.createdByUserId,
});
