export type NumericPredictionMetrics = {
  predictedValue: number;
  actualValue: number;
  absoluteError: number;
  percentageError: number;
  accuracyPct: number;
};

export const roundMetric = (value: number, digits = 2): number => {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

export const normalizeMetricNumber = (value: unknown, fallback = 0): number => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

export const calculateNumericPredictionMetrics = (
  predictedInput: unknown,
  actualInput: unknown,
): NumericPredictionMetrics => {
  const predictedValue = normalizeMetricNumber(predictedInput);
  const actualValue = normalizeMetricNumber(actualInput);
  const absoluteError = Math.abs(predictedValue - actualValue);
  const percentageError = (absoluteError / Math.max(Math.abs(actualValue), 1)) * 100;
  const accuracyPct = Math.max(0, 100 - percentageError);

  return {
    predictedValue: roundMetric(predictedValue, 2),
    actualValue: roundMetric(actualValue, 2),
    absoluteError: roundMetric(absoluteError, 2),
    percentageError: roundMetric(percentageError, 2),
    accuracyPct: roundMetric(accuracyPct, 2),
  };
};

export const numericAccuracyToOutcomeStatus = (
  accuracyPct: number | null | undefined,
): "hit" | "partial" | "miss" | "insufficient_data" => {
  if (!Number.isFinite(Number(accuracyPct))) return "insufficient_data";
  const accuracy = Number(accuracyPct);
  if (accuracy >= 75) return "hit";
  if (accuracy >= 45) return "partial";
  return "miss";
};

export const calculateBinaryPredictionAccuracy = (
  predictedOccurred: boolean,
  actualOccurred: boolean,
): number => (predictedOccurred === actualOccurred ? 100 : 0);

export const diffInclusiveDays = (startIso: unknown, endIso: unknown): number => {
  const startText = String(startIso || "").slice(0, 10);
  const endText = String(endIso || "").slice(0, 10);
  const start = Date.parse(`${startText}T00:00:00Z`);
  const end = Date.parse(`${endText}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 1;
  return Math.max(1, Math.round((end - start) / 86_400_000) + 1);
};
