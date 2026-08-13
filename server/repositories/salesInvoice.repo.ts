import {
  getInvoiceDataById,
  getInvoiceDataForSaleIds,
  getSalesOrderProfitSnapshotFromDb,
} from '../database';
import {
  getSalesOrderForInvoice,
  getSalesReturnsForOrder,
} from '../salesOrders';
import type { SalesReturnWithItems } from '../salesOrders';

export async function fetchSalesReturnsForOrder(
  orderId: number,
): Promise<SalesReturnWithItems[]> {
  return getSalesReturnsForOrder(orderId);
}

export async function fetchSalesOrderInvoice(orderId: number) {
  return getSalesOrderForInvoice(orderId);
}

export async function fetchLegacyInvoiceData(saleId: number) {
  return getInvoiceDataById(saleId);
}

export async function fetchSalesOrderProfitSnapshot(orderId: number) {
  return getSalesOrderProfitSnapshotFromDb(orderId);
}

export async function fetchLegacyInvoiceDataForSaleIds(saleIds: number[]) {
  return getInvoiceDataForSaleIds(saleIds);
}
