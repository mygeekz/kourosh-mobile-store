import type { SalesReturnWithItems } from '../salesOrders';
import {
  fetchLegacyInvoiceData,
  fetchLegacyInvoiceDataForSaleIds,
  fetchSalesOrderInvoice,
  fetchSalesOrderProfitSnapshot,
  fetchSalesReturnsForOrder,
} from '../repositories/salesInvoice.repo';

export async function listSalesReturnsForOrder(
  orderId: number,
): Promise<SalesReturnWithItems[]> {
  return fetchSalesReturnsForOrder(orderId);
}

export async function getSalesOrderInvoiceWithLegacyFallback(orderId: number) {
  let invoice = await fetchSalesOrderInvoice(orderId);
  if (!invoice) invoice = await fetchLegacyInvoiceData(orderId);
  return invoice;
}

export async function getSalesOrderProfitSnapshot(orderId: number) {
  return fetchSalesOrderProfitSnapshot(orderId);
}

export async function getLegacyInvoiceDataBySaleId(saleId: number) {
  return fetchLegacyInvoiceData(saleId);
}

export async function getLegacyInvoiceDataForSaleIds(saleIds: number[]) {
  return fetchLegacyInvoiceDataForSaleIds(saleIds);
}
