// Domain database API extracted from legacyRuntime in Phase 1E.

import { getDbInstance } from "../core/runtimeBindings";
import {
  recordInventoryInDb as recordInventoryInRepo,
  computeFifoCogsForProduct as computeFifoCogsForProductInRepo,
  getInventoryFifoAgingForAllProducts as getInventoryFifoAgingForAllProductsInRepo,
  getMonthlyProfitByProductFifo as getMonthlyProfitByProductFifoInRepo,
  createInventoryAdjustmentInDb as createInventoryAdjustmentInRepo,
  getInventoryAgingBucketsFromDb as getInventoryAgingBucketsFromRepo,
  listSalesProfitRowsFifo as listSalesProfitRowsFifoInRepo,
  getRealProfitPerProductFifo as getRealProfitPerProductFifoInRepo,
} from "../../repositories/inventoryLedger.repo";
import { createStockCountInDb as createStockCountInRepo, getAllStockCountsFromDb as getAllStockCountsFromRepo, getStockCountByIdFromDb as getStockCountByIdFromRepo, upsertStockCountItemInDb as upsertStockCountItemInRepo, completeStockCountInDb as completeStockCountInRepo, type StockCountCreatePayload } from "../../repositories/stockCounts.repo";
import { adjustProductStockInDb as adjustProductStockInRepo, type AdjustStockPayload } from "../../repositories/productStockAdjustments.repo";

export type { StockCountCreatePayload } from "../../repositories/stockCounts.repo";
export type { AdjustStockPayload } from "../../repositories/productStockAdjustments.repo";

export const adjustProductStockInDb = async (
  productId: number,
  payload: AdjustStockPayload,
): Promise<{
  productId: number;
  oldQuantity: number;
  newQuantity: number;
  delta: number;
}> => {
  await getDbInstance();
  return await adjustProductStockInRepo(productId, payload);
};

export const createStockCountInDb = async (
  payload: StockCountCreatePayload,
) => {
  await getDbInstance();
  return await createStockCountInRepo(payload);
};

export const getAllStockCountsFromDb = async () => {
  await getDbInstance();
  return await getAllStockCountsFromRepo();
};

export const getStockCountByIdFromDb = async (stockCountId: number) => {
  await getDbInstance();
  return await getStockCountByIdFromRepo(stockCountId);
};

export const upsertStockCountItemInDb = async (
  stockCountId: number,
  productId: number,
  countedQty: number,
) => {
  await getDbInstance();
  return await upsertStockCountItemInRepo(stockCountId, productId, countedQty);
};

export const completeStockCountInDb = async (
  stockCountId: number,
  createdByUserId?: number,
) => {
  await getDbInstance();
  return await completeStockCountInRepo(stockCountId, createdByUserId);
};

export const recordInventoryInDb = async (payload: {
  productId: number;
  entryType: "in" | "out";
  quantity: number;
  unitCost?: number;
  refType?: string;
  refId?: number;
  entryDate: string;
}) => {
  await getDbInstance();
  return recordInventoryInRepo(payload);
};

export const computeFifoCogsForProduct = async (
  productId: number,
  soldQty: number,
) => {
  await getDbInstance();
  return computeFifoCogsForProductInRepo(productId, soldQty);
};

export const getInventoryFifoAgingForAllProducts = async () => {
  await getDbInstance();
  return getInventoryFifoAgingForAllProductsInRepo();
};

export const getMonthlyProfitByProductFifo = async (monthsBack: number = 6) => {
  await getDbInstance();
  return getMonthlyProfitByProductFifoInRepo(monthsBack);
};

export const createInventoryAdjustmentInDb = async (payload: {
  productId: number;
  direction: "in" | "out";
  quantity: number;
  unitCost?: number;
  reason?: string;
  entryDate: string;
}) => {
  await getDbInstance();
  return createInventoryAdjustmentInRepo(payload);
};

export const getInventoryAgingBucketsFromDb = async () => {
  await getDbInstance();
  return getInventoryAgingBucketsFromRepo();
};

export const listSalesProfitRowsFifo = async (
  fromIso: string,
  toIso: string,
) => {
  await getDbInstance();
  return listSalesProfitRowsFifoInRepo(fromIso, toIso);
};

export const getRealProfitPerProductFifo = async (
  fromIso: string,
  toIso: string,
) => {
  await getDbInstance();
  return getRealProfitPerProductFifoInRepo(fromIso, toIso);
};
