import {
  cancelSalesOrder,
  createSalesOrder,
  createSalesReturn,
  deleteSalesOrder,
  getSalesOrderForInvoice,
} from '../salesOrders';
import type { InvoiceData, SalesOrderPayload } from '../../types';
import type {
  CancelSalesOrderPayload,
  SalesReturnPayload,
  SalesReturnRow,
} from '../salesOrders';

export async function createSalesOrderWithPayload(
  payload: SalesOrderPayload,
): Promise<{ orderId: number }> {
  return createSalesOrder(payload);
}

export async function getSalesOrderInvoiceForNotification(
  orderId: number,
): Promise<InvoiceData | null> {
  return getSalesOrderForInvoice(orderId);
}

export async function deleteSalesOrderById(
  orderId: number,
): Promise<{ deleted: true } | null> {
  return deleteSalesOrder(orderId);
}

export async function cancelSalesOrderById(
  orderId: number,
  payload: CancelSalesOrderPayload,
): Promise<{ canceled: true } | null> {
  return cancelSalesOrder(orderId, payload);
}

export async function createSalesReturnForOrderId(
  orderId: number,
  payload: SalesReturnPayload,
): Promise<SalesReturnRow> {
  return createSalesReturn(orderId, payload);
}
