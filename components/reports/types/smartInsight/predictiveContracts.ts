// Extracted from ../smartInsightContracts.ts; type-only compatibility surface preserved.
import type { InsightSeverity, StockReorderRow } from './uiStateContracts';

export type PredictiveCollectionRisk = {
  overdueAmount?: number;
  overdueCount?: number;
  dueSoonCount?: number;
  [key: string]: unknown;
};
export type PredictiveRiskBuckets = {
  collection?: PredictiveCollectionRisk;
  stockout?: PredictiveStockoutItem[];
  [key: string]: unknown;
};
export type PredictiveForecastPayload = {
  label?: string;
  warning?: string;
  [key: string]: unknown;
};
export type PredictionAccuracyPayload = {
  generatedAt?: string;
  overall?: {
    totalRuns?: number;
    evaluatedRuns?: number;
    pendingRuns?: number;
    avgAccuracyPct?: number | null;
    confidenceLabel?: string;
    [key: string]: unknown;
  };
  byType?: Array<{
    type?: string;
    label?: string;
    avgAccuracyPct?: number | null;
    status?: string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
};
export type ModelReadinessPayload = {
  generatedAt?: string;
  items?: Array<{
    key?: string;
    label?: string;
    readinessPct?: number;
    status?: string;
    [key: string]: unknown;
  }>;
  bestReadyModel?: {
    key?: string;
    label?: string;
    readinessPct?: number;
    status?: string;
    [key: string]: unknown;
  } | null;
  weakestModel?: {
    key?: string;
    label?: string;
    readinessPct?: number;
    status?: string;
    [key: string]: unknown;
  } | null;
  [key: string]: unknown;
};
export type DataQualityPayload = {
  generatedAt?: string;
  overallScore?: number;
  checks?: Array<{
    key?: string;
    label?: string;
    status?: string;
    value?: number | string | null;
    message?: string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
};
export type PredictiveEnginePayload = {
  confidence?: number;
  forecast?: PredictiveForecastPayload;
  risks?: PredictiveRiskBuckets;
  alerts?: PredictiveAlertItem[];
  salesForecast?: unknown;
  stockoutItems?: StockReorderRow[];
  futureAlerts?: unknown[];
  updatedAt?: string;
  method?: { label?: string; warning?: string } | string;
  [key: string]: unknown;
};
export type PredictiveStockoutItem = StockReorderRow & {
  stockQuantity?: number;
  soldQty14?: number;
  suggestedBuyQty?: number;
};
export type PredictiveAlertItem = {
  id?: string;
  severity?: InsightSeverity;
  title?: string;
  summary?: string;
  actionLabel?: string;
  to?: string;
  [key: string]: unknown;
};
