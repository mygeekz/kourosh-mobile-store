// Phase 7K-Cleanup modular type surface. Behavior/type names preserved.
import type { DatasetQualityIssue, DatasetReadinessStatus } from "./datasetBaseTypes";
import type { DatasetSplitStrategy } from "./datasetSplitTypes";

export type InventoryStockoutDatasetRow = {
  rowKey: string;
  datasetKey: "inventory_stockout_baseline_v1";
  datasetVersion: "v1";
  predictionRunId: number;
  featureSnapshotId: number;
  productId: string | number | null;
  productName: string | null;
  observedAt: string | null;
  horizonStart: string | null;
  horizonEnd: string | null;
  horizonDays: number | null;
  modelKey: string;
  modelVersion: string;
  features: {
    stockQuantity: number | null;
    soldQty14: number | null;
    avgDailySold: number | null;
    daysToStockoutPredicted: number | null;
    thresholdQty: number | null;
    suggestedBuyQty: number | null;
    severityScore: number;
    severityLabel: string | null;
    baselinePredictedRisk: number;
  };
  label: {
    target: "actual_stockout_within_horizon";
    actualStockoutWithinHorizon: 0 | 1 | null;
    daysToStockoutActual: number | null;
    soldQtyDuringHorizon: number | null;
    currentStockAtEvaluation: number | null;
    hitOrMiss: string | null;
    evaluatedAt: string | null;
  };
  quality: {
    hasFeatureSnapshot: boolean;
    hasOutcomeLabel: boolean;
    leakageSafe: boolean;
    canTrain: boolean;
    issues: DatasetQualityIssue[];
  };
};

export type InventoryStockoutDatasetSummary = {
  datasetKey: "inventory_stockout_baseline_v1";
  datasetVersion: "v1";
  labelKey: "actual_stockout_within_horizon";
  generatedAt: string;
  totalRows: number;
  labeledRows: number;
  unlabeledRows: number;
  positiveLabels: number;
  negativeLabels: number;
  featureCount: number;
  readinessPct: number;
  status: DatasetReadinessStatus;
  blockers: string[];
  recommendedNextAction: string;
};

export type InventoryStockoutDatasetResponse = {
  generatedAt: string;
  summary: InventoryStockoutDatasetSummary;
  rows: InventoryStockoutDatasetRow[];
  exportHints: {
    jsonEndpoint: string;
    csvEndpoint: string;
    leakagePolicy: string;
  };
};

export type InventoryStockoutDatasetSplitSummary = {
  datasetKey: "inventory_stockout_baseline_v1";
  datasetVersion: "v1";
  generatedAt: string;
  splitKey: string;
  splitStrategy: DatasetSplitStrategy;
  seed: string;
  testRatio: number;
  totalUsableRows: number;
  trainRows: number;
  testRows: number;
  trainPositiveLabels: number;
  trainNegativeLabels: number;
  testPositiveLabels: number;
  testNegativeLabels: number;
  hasBothClassesInTrain: boolean;
  hasBothClassesInTest: boolean;
  leakagePolicy: string;
  status: "ready" | "warning" | "insufficient_data";
  blockers: string[];
  recommendedNextAction: string;
};
