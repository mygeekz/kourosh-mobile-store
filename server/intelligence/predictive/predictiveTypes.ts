export type PredictiveQuery = {
  fromDate?: unknown;
  from?: unknown;
  toDate?: unknown;
  to?: unknown;
};

export type PredictiveStockoutRisk = {
  productId: unknown;
  productName: string;
  stockQuantity: number;
  thresholdQty: number;
  soldQty14: number;
  avgDailySold: number;
  daysToStockout: number | null;
  suggestedBuyQty: number;
  severity: "critical" | "high" | "medium" | "low";
  actionLabel: string;
  to: string;
};

export type PredictiveAlert = {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  summary: string;
  actionLabel: string;
  to: string;
};

export type PredictiveBrainData = {
  from: string;
  to: string;
  generatedAt: string;
  confidence: number;
  horizon: {
    tomorrow: string;
    next7DaysUntil: string;
  };
  forecast: {
    tomorrowSales: number;
    next7Sales: number;
    tomorrowOrders: number;
    avgTicket: number;
    trendPct: number;
    discountPressure: number;
  };
  risks: {
    stockout: PredictiveStockoutRisk[];
    collection: {
      overdueCount: number;
      overdueAmount: number;
      dueSoonCount: number;
      dueSoonAmount: number;
    };
  };
  alerts: PredictiveAlert[];
  method: {
    label: string;
    dataPoints: number;
    warning: string;
  };
  tracking?: PredictiveRunTracking;
};

export type PredictiveOutcomeStatus =
  | "unknown"
  | "pending"
  | "hit"
  | "miss"
  | "partial"
  | "neutral"
  | "skipped"
  | "insufficient_data"
  | "failed";

export type PredictiveRunTracking = {
  predictionRunId: number;
  predictionRunKey: string;
  deduplicated?: boolean;
};
