// Phase 7K-Cleanup modular type surface. Behavior/type names preserved.
import type { InventoryStockoutBenchmarkSummary } from "./benchmarkTypes";
import type { DatasetSplitStrategy } from "./datasetSplitTypes";
import type { InventoryStockoutDatasetRow, InventoryStockoutDatasetSplitSummary } from "./inventoryStockoutDatasetTypes";

export type InventoryStockoutTrainingFeatureSpec = {
  key: keyof InventoryStockoutDatasetRow["features"];
  type: "number" | "integer" | "category" | "binary";
  nullable: boolean;
  description: string;
};

export type InventoryStockoutTrainingPackageSummary = {
  packageKey: "inventory_stockout_external_training_package_v1";
  datasetKey: "inventory_stockout_baseline_v1";
  datasetVersion: "v1";
  generatedAt: string;
  splitKey: string;
  splitStrategy: DatasetSplitStrategy;
  seed: string;
  testRatio: number;
  trainRows: number;
  testRows: number;
  labeledRows: number;
  featureCount: number;
  labelKey: "actual_stockout_within_horizon";
  bestBaselineKey: string | null;
  bestBaselineF1Pct: number | null;
  bestBaselineBalancedAccuracyPct: number | null;
  status: "ready" | "warning" | "insufficient_data";
  blockers: string[];
  recommendedNextAction: string;
};

export type InventoryStockoutTrainingPackageManifest = {
  packageKey: "inventory_stockout_external_training_package_v1";
  packageVersion: "v1";
  datasetKey: "inventory_stockout_baseline_v1";
  datasetVersion: "v1";
  createdAt: string;
  purpose: string;
  allowedUse: string[];
  forbiddenUse: string[];
  target: {
    key: "actual_stockout_within_horizon";
    type: "binary";
    positiveClass: 1;
    negativeClass: 0;
    description: string;
  };
  featureSchema: InventoryStockoutTrainingFeatureSpec[];
  split: InventoryStockoutDatasetSplitSummary;
  baselineBenchmark: InventoryStockoutBenchmarkSummary;
  files: {
    trainJsonEndpoint: string;
    testJsonEndpoint: string;
    trainCsvEndpoint: string;
    testCsvEndpoint: string;
    manifestEndpoint: string;
  };
  leakagePolicy: string;
  trainingPolicy: string;
  evaluationPolicy: string;
};

export type InventoryStockoutTrainingPackageDataCard = {
  title: string;
  owner: string;
  generatedAt: string;
  sourceTables: string[];
  rowDefinition: string;
  labelDefinition: string;
  knownLimitations: string[];
  minimumTrainingGate: {
    minTrainRows: number;
    minTestRows: number;
    requiresBothClassesInTrain: boolean;
    requiresBothClassesInTest: boolean;
  };
  recommendedExternalWorkflow: string[];
};

export type InventoryStockoutTrainingPackageResponse = {
  generatedAt: string;
  summary: InventoryStockoutTrainingPackageSummary;
  manifest: InventoryStockoutTrainingPackageManifest;
  dataCard: InventoryStockoutTrainingPackageDataCard;
  trainRows: InventoryStockoutDatasetRow[];
  testRows: InventoryStockoutDatasetRow[];
  exportRecord?: Record<string, unknown> | null;
};

export type MlTrainingPackageCatalogSummary = {
  generatedAt: string;
  currentInventoryStockoutTrainingPackage: InventoryStockoutTrainingPackageSummary;
  lastTrainingPackageExports: Array<Record<string, unknown>>;
};
