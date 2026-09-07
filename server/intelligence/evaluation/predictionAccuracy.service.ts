import { getPredictionAccuracySummary } from "../../db/domains/predictions.db";
import type { PredictionAccuracySummary } from "./predictionEvaluationTypes";
import { roundMetric } from "./predictionMetrics";

const TYPE_LABELS: Record<string, string> = {
  sales_forecast: "Sales Forecast",
  inventory_stockout: "Inventory Stockout",
  collection_pressure: "Collection Pressure",
};

const REQUIRED_TYPES = ["sales_forecast", "inventory_stockout", "collection_pressure"];

const classifyAccuracy = (
  avgAccuracyPct: number | null,
  evaluatedRuns: number,
): "healthy" | "watch" | "weak" | "insufficient_data" => {
  if (!evaluatedRuns || avgAccuracyPct == null) return "insufficient_data";
  if (avgAccuracyPct >= 80) return "healthy";
  if (avgAccuracyPct >= 55) return "watch";
  return "weak";
};

const confidenceLabel = (avgAccuracyPct: number | null, evaluatedRuns: number): string => {
  if (!evaluatedRuns || avgAccuracyPct == null) return "insufficient_data";
  if (avgAccuracyPct >= 80) return "reliable_baseline";
  if (avgAccuracyPct >= 55) return "watch_baseline";
  return "weak_baseline";
};

export const buildPredictionAccuracySummary = async (): Promise<PredictionAccuracySummary> => {
  const raw = await getPredictionAccuracySummary();
  const overallRow = raw.overall || {};
  const byTypeRows = new Map<string, Record<string, unknown>>(
    (raw.byType || []).map((row: Record<string, unknown>) => [String(row.type || ""), row]),
  );
  const avgAccuracyPct = overallRow.avgAccuracyPct == null
    ? null
    : roundMetric(Number(overallRow.avgAccuracyPct), 2);
  const evaluatedRuns = Number(overallRow.evaluatedRuns || 0);

  return {
    generatedAt: new Date().toISOString(),
    overall: {
      totalRuns: Number(overallRow.totalRuns || 0),
      evaluatedRuns,
      pendingRuns: Number(overallRow.pendingRuns || 0),
      avgAccuracyPct,
      confidenceLabel: confidenceLabel(avgAccuracyPct, evaluatedRuns),
    },
    byType: REQUIRED_TYPES.map((type) => {
      const row = byTypeRows.get(type) || {};
      const rowAccuracy = row.avgAccuracyPct == null ? null : roundMetric(Number(row.avgAccuracyPct), 2);
      const rowEvaluatedRuns = Number(row.evaluatedRuns || 0);
      return {
        type,
        label: TYPE_LABELS[type] || type,
        totalRuns: Number(overallRow.totalRuns || 0),
        evaluatedRuns: rowEvaluatedRuns,
        avgAccuracyPct: rowAccuracy,
        avgErrorPct: row.avgErrorPct == null ? null : roundMetric(Number(row.avgErrorPct), 2),
        lastEvaluatedAt: row.lastEvaluatedAt ? String(row.lastEvaluatedAt) : null,
        status: classifyAccuracy(rowAccuracy, rowEvaluatedRuns),
      };
    }),
    recentEvaluations: raw.recentEvaluations || [],
  };
};
