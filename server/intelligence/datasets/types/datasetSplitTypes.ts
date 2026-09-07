// Phase 7K-Cleanup modular type surface. Behavior/type names preserved.
import type { InventoryStockoutDatasetRow, InventoryStockoutDatasetSplitSummary } from "./inventoryStockoutDatasetTypes";

export type DatasetSplitStrategy = "entity_grouped_hash" | "row_hash";

export type InventoryStockoutSplitConfig = {
  seed: string;
  testRatio: number;
  strategy: DatasetSplitStrategy;
  minLabeledRows: number;
};

export type InventoryStockoutTrainTestSplitResponse = {
  generatedAt: string;
  config: InventoryStockoutSplitConfig;
  summary: InventoryStockoutDatasetSplitSummary;
  trainRows: InventoryStockoutDatasetRow[];
  testRows: InventoryStockoutDatasetRow[];
};
