// Phase 7K-Cleanup modular type surface. Behavior/type names preserved.
import type { InventoryStockoutDatasetSplitSummary } from "./inventoryStockoutDatasetTypes";

export type BaselineBenchmarkMetrics = {
  accuracyPct: number | null;
  precisionPct: number | null;
  recallPct: number | null;
  specificityPct: number | null;
  f1Pct: number | null;
  balancedAccuracyPct: number | null;
  falsePositiveRatePct: number | null;
  falseNegativeRatePct: number | null;
};

export type BaselineBenchmarkCandidate = {
  key: string;
  label: string;
  description: string;
  confusionMatrix: {
    truePositive: number;
    trueNegative: number;
    falsePositive: number;
    falseNegative: number;
  };
  metrics: BaselineBenchmarkMetrics;
  warnings: string[];
};

export type InventoryStockoutBenchmarkSummary = {
  benchmarkKey: "inventory_stockout_rule_baseline_benchmark_v1";
  datasetKey: "inventory_stockout_baseline_v1";
  datasetVersion: "v1";
  generatedAt: string;
  evaluatedOn: "test_split";
  totalRows: number;
  trainRows: number;
  testRows: number;
  bestCandidateKey: string | null;
  bestCandidateLabel: string | null;
  bestF1Pct: number | null;
  bestBalancedAccuracyPct: number | null;
  status: "ready" | "warning" | "insufficient_data";
  blockers: string[];
  recommendedNextAction: string;
};

export type InventoryStockoutBenchmarkResponse = {
  generatedAt: string;
  summary: InventoryStockoutBenchmarkSummary;
  split: InventoryStockoutDatasetSplitSummary;
  candidates: BaselineBenchmarkCandidate[];
  bestCandidate: BaselineBenchmarkCandidate | null;
  benchmarkPolicy: {
    trainingPolicy: string;
    leakagePolicy: string;
    scoringPolicy: string;
  };
  exportRecord?: Record<string, unknown> | null;
};

export type MlBenchmarkCatalogSummary = {
  generatedAt: string;
  currentInventoryStockoutBenchmark: InventoryStockoutBenchmarkSummary;
  lastBenchmarks: Array<Record<string, unknown>>;
};
