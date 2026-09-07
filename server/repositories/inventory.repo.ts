import {
  completeStockCountInDb,
  createInventoryAdjustmentInDb,
  createStockCountInDb,
  getAbcReport,
  getAllStockCountsFromDb,
  getDeadStockReport,
  getInventoryTurnoverReport,
  getStockCountByIdFromDb,
  upsertStockCountItemInDb,
  type StockCountCreatePayload,
} from "../database";

export const inventoryRepo = {
  createStockCount: (payload: StockCountCreatePayload) =>
    createStockCountInDb(payload),
  listStockCounts: () => getAllStockCountsFromDb(),
  getStockCountById: (id: number) => getStockCountByIdFromDb(id),
  upsertStockCountItem: (stockCountId: number, productId: number, countedQty: number) =>
    upsertStockCountItemInDb(stockCountId, productId, countedQty),
  completeStockCount: (id: number, userId: number | null) =>
    completeStockCountInDb(id, userId ?? undefined),
  createInventoryAdjustment: (payload: {
    productId: number;
    direction: "in" | "out";
    quantity: number;
    unitCost: number;
    reason?: string;
    entryDate: string;
  }) => createInventoryAdjustmentInDb(payload),
  getInventoryTurnoverReport: (fromISO: string, toISO: string) =>
    getInventoryTurnoverReport(fromISO, toISO),
  getDeadStockReport: (days: number) => getDeadStockReport(days),
  getAbcReport: (fromISO: string, toISO: string, metric: "sales" | "profit") =>
    getAbcReport(fromISO, toISO, metric),
};
