export type PredictionEvaluationStatus =
  | "pending"
  | "ready"
  | "evaluated"
  | "skipped"
  | "insufficient_data"
  | "failed";

export type BaselinePredictionType =
  | "sales_forecast"
  | "inventory_stockout"
  | "collection_pressure";

export type PredictionEvaluationRecord = {
  runId: number;
  predictionType: BaselinePredictionType;
  outcomeStatus: string;
  predictedValue: number | null;
  actualValue: number | null;
  absoluteError: number | null;
  percentageError: number | null;
  accuracyPct: number | null;
  horizonDays: number | null;
  note?: string | null;
  metrics: Record<string, unknown>;
};

export type PredictionAccuracySummary = {
  generatedAt: string;
  overall: {
    totalRuns: number;
    evaluatedRuns: number;
    pendingRuns: number;
    avgAccuracyPct: number | null;
    confidenceLabel: string;
  };
  byType: Array<{
    type: string;
    label: string;
    totalRuns: number;
    evaluatedRuns: number;
    avgAccuracyPct: number | null;
    avgErrorPct: number | null;
    lastEvaluatedAt: string | null;
    status: "healthy" | "watch" | "weak" | "insufficient_data";
  }>;
  recentEvaluations: Array<Record<string, unknown>>;
};
