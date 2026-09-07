import type {
  ShadowScoreAgreementSummary,
  ShadowScoreComparisonScoreRecord,
  ShadowScoreDeltaSummary,
  ShadowScoreDistributionSummary,
} from './shadowScoreComparisonTypes';

const roundMetric = (value: number | null): number | null => {
  if (value === null || !Number.isFinite(value)) return null;
  return Number(value.toFixed(6));
};

const numericValue = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value;
};

const scoreKey = (record: ShadowScoreComparisonScoreRecord): string => [
  record.entityType,
  record.entityId,
  record.predictionType ?? '',
  record.horizonDays ?? '',
].join('::');

const median = (values: number[]): number | null => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle];
  return (sorted[middle - 1] + sorted[middle]) / 2;
};

export const summarizeShadowScoreDistribution = (
  records: ShadowScoreComparisonScoreRecord[],
): ShadowScoreDistributionSummary => {
  const scores = records.map((record) => numericValue(record.score)).filter((score): score is number => score !== null);
  const confidences = records
    .map((record) => numericValue(record.confidence))
    .filter((confidence): confidence is number => confidence !== null);
  const labelDistribution = records.reduce<Record<string, number>>((acc, record) => {
    const label = typeof record.label === 'string' && record.label.trim() ? record.label.trim() : 'unlabeled';
    acc[label] = (acc[label] ?? 0) + 1;
    return acc;
  }, {});
  const sum = scores.reduce((acc, score) => acc + score, 0);
  const confidenceSum = confidences.reduce((acc, confidence) => acc + confidence, 0);

  return {
    count: records.length,
    validScoreCount: scores.length,
    nullScoreCount: records.filter((record) => record.score === null || record.score === undefined).length,
    nonNumericScoreCount: records.filter((record) => record.score !== null && record.score !== undefined && numericValue(record.score) === null).length,
    minScore: scores.length > 0 ? Math.min(...scores) : null,
    maxScore: scores.length > 0 ? Math.max(...scores) : null,
    meanScore: scores.length > 0 ? roundMetric(sum / scores.length) : null,
    medianScore: roundMetric(median(scores)),
    labelDistribution,
    confidenceSummary: {
      count: confidences.length,
      nullConfidenceCount: records.length - confidences.length,
      minConfidence: confidences.length > 0 ? Math.min(...confidences) : null,
      maxConfidence: confidences.length > 0 ? Math.max(...confidences) : null,
      meanConfidence: confidences.length > 0 ? roundMetric(confidenceSum / confidences.length) : null,
    },
  };
};

const indexByStableEntity = (records: ShadowScoreComparisonScoreRecord[]) => {
  const map = new Map<string, ShadowScoreComparisonScoreRecord>();
  let duplicateCount = 0;
  for (const record of records) {
    const key = scoreKey(record);
    if (map.has(key)) {
      duplicateCount += 1;
      continue;
    }
    map.set(key, record);
  }
  return { map, duplicateCount };
};

export const computeShadowScoreDeltaSummary = (
  candidateRecords: ShadowScoreComparisonScoreRecord[],
  baselineRecords: ShadowScoreComparisonScoreRecord[],
): ShadowScoreDeltaSummary => {
  const candidate = indexByStableEntity(candidateRecords);
  const baseline = indexByStableEntity(baselineRecords);
  const absoluteDeltas: number[] = [];
  const signedDeltas: number[] = [];
  const directionCounts = { candidateHigher: 0, candidateLower: 0, unchanged: 0 };
  let matchedEntityCount = 0;
  let candidateOnlyCount = 0;

  for (const [key, candidateRecord] of candidate.map.entries()) {
    const baselineRecord = baseline.map.get(key);
    if (!baselineRecord) {
      candidateOnlyCount += 1;
      continue;
    }
    const candidateScore = numericValue(candidateRecord.score);
    const baselineScore = numericValue(baselineRecord.score);
    if (candidateScore === null || baselineScore === null) continue;

    const signedDelta = candidateScore - baselineScore;
    matchedEntityCount += 1;
    absoluteDeltas.push(Math.abs(signedDelta));
    signedDeltas.push(signedDelta);
    if (signedDelta > 0) directionCounts.candidateHigher += 1;
    else if (signedDelta < 0) directionCounts.candidateLower += 1;
    else directionCounts.unchanged += 1;
  }

  let baselineOnlyCount = 0;
  for (const key of baseline.map.keys()) {
    if (!candidate.map.has(key)) baselineOnlyCount += 1;
  }

  const absoluteDeltaSum = absoluteDeltas.reduce((acc, delta) => acc + delta, 0);
  const signedDeltaSum = signedDeltas.reduce((acc, delta) => acc + delta, 0);

  return {
    matchedEntityCount,
    candidateOnlyCount,
    baselineOnlyCount,
    duplicateCandidateEntityCount: candidate.duplicateCount,
    duplicateBaselineEntityCount: baseline.duplicateCount,
    absoluteDeltaMean: absoluteDeltas.length > 0 ? roundMetric(absoluteDeltaSum / absoluteDeltas.length) : null,
    absoluteDeltaMax: absoluteDeltas.length > 0 ? roundMetric(Math.max(...absoluteDeltas)) : null,
    signedDeltaMean: signedDeltas.length > 0 ? roundMetric(signedDeltaSum / signedDeltas.length) : null,
    directionCounts,
  };
};

export const computeShadowScoreAgreementSummary = (
  candidateRecords: ShadowScoreComparisonScoreRecord[],
  baselineRecords: ShadowScoreComparisonScoreRecord[],
): ShadowScoreAgreementSummary => {
  const candidate = indexByStableEntity(candidateRecords);
  const baseline = indexByStableEntity(baselineRecords);
  let comparableLabelCount = 0;
  let labelAgreementCount = 0;
  let labelDisagreementCount = 0;
  let missingCandidateLabelCount = 0;
  let missingBaselineLabelCount = 0;

  for (const [key, candidateRecord] of candidate.map.entries()) {
    const baselineRecord = baseline.map.get(key);
    if (!baselineRecord) continue;
    const candidateLabel = typeof candidateRecord.label === 'string' && candidateRecord.label.trim() ? candidateRecord.label.trim() : null;
    const baselineLabel = typeof baselineRecord.label === 'string' && baselineRecord.label.trim() ? baselineRecord.label.trim() : null;
    if (!candidateLabel) missingCandidateLabelCount += 1;
    if (!baselineLabel) missingBaselineLabelCount += 1;
    if (!candidateLabel || !baselineLabel) continue;
    comparableLabelCount += 1;
    if (candidateLabel === baselineLabel) labelAgreementCount += 1;
    else labelDisagreementCount += 1;
  }

  return {
    comparableLabelCount,
    labelAgreementCount,
    labelDisagreementCount,
    missingCandidateLabelCount,
    missingBaselineLabelCount,
    agreementRate: comparableLabelCount > 0 ? roundMetric(labelAgreementCount / comparableLabelCount) : null,
  };
};
