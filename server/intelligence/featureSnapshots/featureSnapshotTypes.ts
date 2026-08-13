export type FeatureSnapshotModelKey = "rule_statistical_baseline";

export type PredictiveFeatureSnapshotInput = {
  runId: number;
  modelKey: FeatureSnapshotModelKey;
  modelVersion: string;
  predictionType: "sales_forecast" | "inventory_stockout" | "collection_pressure";
  entityType?: string | null;
  entityId?: string | number | null;
  horizonDays?: number | null;
  features: Record<string, unknown>;
};
