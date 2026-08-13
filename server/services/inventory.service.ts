import { analyzeInventoryVelocity } from "../analysis";
import { inventoryRepo } from "../repositories/inventory.repo";

export const inventoryService = {
  createStockCount: inventoryRepo.createStockCount,
  listStockCounts: inventoryRepo.listStockCounts,
  getStockCountById: inventoryRepo.getStockCountById,
  upsertStockCountItem: inventoryRepo.upsertStockCountItem,
  completeStockCount: inventoryRepo.completeStockCount,
  createInventoryAdjustment: inventoryRepo.createInventoryAdjustment,
  analyzeInventoryVelocity: () => analyzeInventoryVelocity(),
  getInventoryTurnoverReport: inventoryRepo.getInventoryTurnoverReport,
  getDeadStockReport: inventoryRepo.getDeadStockReport,
  getAbcReport: inventoryRepo.getAbcReport,
};
