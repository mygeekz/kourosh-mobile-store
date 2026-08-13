import {
  getSellableItemsFromDb,
  getAllSalesTransactionsFromDb,
  getProfitPerSaleMapFromDb,
  getInvoiceDataById,
  getInvoiceDataForSaleIds,
} from '../database';
import {
  getAllSalesOrdersFromDb,
  getSalesOrderForInvoice,
} from '../salesOrders';

export async function fetchSellableItems(filters?: { q?: string; limit?: number; offset?: number }) {
  return getSellableItemsFromDb(filters);
}

export async function fetchLegacySalesRows() {
  return getAllSalesTransactionsFromDb();
}

export async function fetchSalesOrderRows() {
  return getAllSalesOrdersFromDb();
}

export async function fetchProfitPerSaleMap(saleIds: number[]) {
  return getProfitPerSaleMapFromDb(saleIds);
}

export async function fetchSalesOrderInvoice(saleId: number) {
  return getSalesOrderForInvoice(saleId);
}

export async function fetchLegacyInvoice(saleId: number) {
  return getInvoiceDataById(saleId);
}

export async function fetchInvoiceDataForSaleIds(saleIds: number[]) {
  return getInvoiceDataForSaleIds(saleIds);
}
