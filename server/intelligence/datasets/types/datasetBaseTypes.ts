// Phase 7K-Cleanup modular type surface. Behavior/type names preserved.
import type { InventoryStockoutDatasetSummary } from "./inventoryStockoutDatasetTypes";

export type DatasetReadinessStatus = "ready" | "almost_ready" | "needs_data" | "not_ready";

export type DatasetQualityIssue = {
  key: string;
  severity: "info" | "warning" | "blocker";
  message: string;
};

export type MlDatasetCatalogSummary = {
  generatedAt: string;
  datasets: InventoryStockoutDatasetSummary[];
  lastExports: Array<Record<string, unknown>>;
};
