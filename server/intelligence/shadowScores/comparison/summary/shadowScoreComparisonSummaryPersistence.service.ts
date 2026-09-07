import { persistShadowScoreComparisonSummary } from '../../../../db/domains/ml/shadowScores';
import { compareShadowScoresFromStoredMetadata } from '../shadowScoreComparison.service';
import type { ShadowScoreComparisonServiceOptions } from '../shadowScoreComparisonTypes';
import type {
  ShadowScoreComparisonSummaryPersistenceOptions,
  ShadowScoreComparisonSummaryPersistenceResult,
  ShadowScoreComparisonSummarySourceRequest,
} from './shadowScoreComparisonSummaryTypes';
import { mapShadowScoreComparisonResultToPersistenceInput } from './shadowScoreComparisonSummaryMapper';

export const persistStoredShadowScoreComparisonSummary = async (
  request: ShadowScoreComparisonSummarySourceRequest,
  comparisonOptions: ShadowScoreComparisonServiceOptions = {},
  persistenceOptions: ShadowScoreComparisonSummaryPersistenceOptions = {},
): Promise<ShadowScoreComparisonSummaryPersistenceResult> => {
  const comparisonResult = await compareShadowScoresFromStoredMetadata(request, comparisonOptions);
  const persistenceInput = mapShadowScoreComparisonResultToPersistenceInput(comparisonResult, request, persistenceOptions);
  const summaryWriteResult = await persistShadowScoreComparisonSummary(persistenceInput);

  return {
    phase: 'Phase 15B',
    persistenceKind: 'metadata_only_shadow_score_comparison_summary_persistence',
    comparisonResult,
    summaryPayload: persistenceInput.summaryPayload,
    summaryWriteResult,
    metadataOnly: true,
    modelExecutionAllowed: false,
    inferenceEndpointExposed: false,
    artifactActivationAllowed: false,
    canMutateBusinessRecords: false,
  };
};
