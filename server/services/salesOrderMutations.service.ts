import {
  cancelSalesOrderById,
  createSalesOrderWithPayload,
  createSalesReturnForOrderId,
  deleteSalesOrderById,
  getSalesOrderInvoiceForNotification,
} from '../repositories/salesOrderMutations.repo';
import type { InvoiceData, SalesOrderPayload } from '../../types';
import type { CustomerSalesTrustProfile } from '../utils/salesAdvisorHelpers';
import type {
  SalesReturnItemPayload,
  SalesReturnPayload,
  SalesReturnRow,
} from '../salesOrders';


export interface SalesOrderCreditLimitGuardData {
  suggestedCreditLimit: number;
  projectedExposure: number;
  customerTrustScore: number;
  customerTrustTier: string;
}

const toUnknownRecord = (
  value: unknown,
): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

export async function createSalesOrderFromPayload(payload: SalesOrderPayload) {
  return createSalesOrderWithPayload(payload);
}

export async function fetchSalesOrderInvoiceForNotification(
  orderId: number,
): Promise<InvoiceData | null> {
  return getSalesOrderInvoiceForNotification(orderId);
}

export async function enforceSalesOrderCreditLimitGuard(args: {
  payload: SalesOrderPayload;
  roleName: string;
  getCustomerById: (customerId: number) => Promise<unknown>;
  getCustomerSalesTrustProfile: (
    customerId: number,
    customer: unknown,
  ) => Promise<CustomerSalesTrustProfile | null>;
  toNumber: (value: unknown) => number;
}): Promise<
  | { allowed: true }
  | { allowed: false; data: SalesOrderCreditLimitGuardData }
> {
  const {
    payload,
    roleName,
    getCustomerById,
    getCustomerSalesTrustProfile,
    toNumber,
  } = args;
  try {
    const isCreditSale = payload.paymentMethod === 'credit';
    const customerId = Number(payload.customerId || 0);
    if (isCreditSale && customerId > 0) {
      const customer = await getCustomerById(customerId).catch(() => null);
      const trustProfile = await getCustomerSalesTrustProfile(
        customerId,
        customer,
      ).catch(() => null);
      if (trustProfile) {
        const subtotal = payload.items.reduce((sum, item) => {
          const quantity = Math.max(1, toNumber(item.quantity));
          const unitPrice = Math.max(0, toNumber(item.unitPrice));
          return sum + quantity * unitPrice;
        }, 0);
        const rowDiscount = payload.items.reduce((sum, item) => {
          const quantity = Math.max(1, toNumber(item.quantity));
          const unitPrice = Math.max(0, toNumber(item.unitPrice));
          const lineGross = quantity * unitPrice;
          return (
            sum +
            Math.min(
              Math.max(0, toNumber(item.discountPerItem)),
              lineGross,
            )
          );
        }, 0);
        const afterRowDiscounts = Math.max(0, subtotal - rowDiscount);
        const cleanGlobalDiscount = Math.min(
          Math.max(0, toNumber(payload.discount)),
          afterRowDiscounts,
        );
        const projectedGrandTotal = Math.max(
          0,
          afterRowDiscounts - cleanGlobalDiscount,
        );
        const projectedExposure =
          Math.max(0, trustProfile.currentBalance) + projectedGrandTotal;
        const suggestedLimit = Math.max(
          0,
          trustProfile.suggestedCreditLimit,
        );
        const requiresManagerApproval =
          suggestedLimit <= 0 || projectedExposure > suggestedLimit;
        const canApproveCreditLimit = ['Admin', 'Manager'].includes(roleName);
        if (requiresManagerApproval && !canApproveCreditLimit) {
          return {
            allowed: false,
            data: {
              suggestedCreditLimit: suggestedLimit,
              projectedExposure,
              customerTrustScore: trustProfile.score,
              customerTrustTier: trustProfile.tierLabel,
            },
          };
        }
      }
    }
  } catch {}
  return { allowed: true };
}

export async function removeSalesOrder(
  orderId: number,
): Promise<{ deleted: true } | null> {
  return deleteSalesOrderById(orderId);
}

export async function cancelSalesOrderWithReason(
  orderId: number,
  reason: unknown,
): Promise<{ canceled: true } | null> {
  const normalizedReason = String(reason ?? '').trim();
  if (!normalizedReason) {
    throw new Error('ثبت دلیل ابطال فاکتور الزامی است.');
  }
  return cancelSalesOrderById(orderId, { reason: normalizedReason });
}

const normalizeOptionalText = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined;
  const normalized = String(value).trim();
  return normalized || undefined;
};

const normalizeSalesReturnItem = (
  value: unknown,
): SalesReturnItemPayload => {
  const item = toUnknownRecord(value);
  if (!item) throw new Error('اطلاعات آیتم مرجوعی نامعتبر است.');

  const itemType = item.itemType;
  if (itemType !== 'phone' && itemType !== 'inventory' && itemType !== 'service') {
    throw new Error('نوع آیتم مرجوعی نامعتبر است.');
  }

  const itemId = Number(item.itemId);
  if (!Number.isInteger(itemId) || itemId <= 0) {
    throw new Error('شناسه آیتم مرجوعی نامعتبر است.');
  }

  const quantity = Number(item.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error('تعداد مرجوعی نامعتبر است.');
  }

  const unitPriceRaw = item.unitPrice;
  const unitPrice =
    unitPriceRaw === undefined || unitPriceRaw === null || unitPriceRaw === ''
      ? undefined
      : Number(unitPriceRaw);
  if (unitPrice !== undefined && !Number.isFinite(unitPrice)) {
    throw new Error('قیمت آیتم مرجوعی نامعتبر است.');
  }

  return {
    itemType,
    itemId,
    quantity,
    description: normalizeOptionalText(item.description),
    unitPrice,
  };
};

export function normalizeSalesReturnPayload(
  value: unknown,
  createdByUserId?: number | null,
): SalesReturnPayload {
  const payload = toUnknownRecord(value);
  if (!payload) throw new Error('اطلاعات مرجوعی نامعتبر است.');

  const rawItems = payload.items;
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new Error('لیست اقلام مرجوعی خالی است.');
  }

  const rawType = payload.type;
  if (
    rawType !== undefined &&
    rawType !== null &&
    rawType !== '' &&
    rawType !== 'refund' &&
    rawType !== 'exchange'
  ) {
    throw new Error('نوع مرجوعی نامعتبر است.');
  }

  const refundAmount = Number(payload.refundAmount ?? 0);
  if (!Number.isFinite(refundAmount) || refundAmount < 0) {
    throw new Error('مبلغ برگشتی نامعتبر است.');
  }

  return {
    type: rawType === 'exchange' ? 'exchange' : 'refund',
    refundAmount,
    reason: normalizeOptionalText(payload.reason),
    notes: normalizeOptionalText(payload.notes),
    items: rawItems.map(normalizeSalesReturnItem),
    createdByUserId: createdByUserId ?? undefined,
  };
}

export async function createSalesReturnForOrder(
  orderId: number,
  payload: unknown,
  createdByUserId?: number | null,
): Promise<SalesReturnRow> {
  return createSalesReturnForOrderId(
    orderId,
    normalizeSalesReturnPayload(payload, createdByUserId),
  );
}


export function buildSalesOrderCreatedTelegramText(args: {
  orderId: number;
  payload: SalesOrderPayload;
  invoice: InvoiceData | null;
  username: string;
  settings: Record<string, string>;
  safeReplaceTemplate: (
    template: string,
    vars: Record<string, unknown>,
  ) => string;
  formatPriceForSms: (price: number) => string;
}) {
  const {
    orderId,
    payload,
    invoice,
    username,
    settings,
    safeReplaceTemplate,
    formatPriceForSms,
  } = args;
  const baseUrl = String(settings.app_base_url || '').trim();
  const link = baseUrl ? `${baseUrl}/#/sales` : '';
  const payloadRecord = toUnknownRecord(payload) ?? {};
  const payloadFinancialSummary = toUnknownRecord(
    payloadRecord.financialSummary,
  );
  const customerName = String(
    invoice?.customerDetails?.fullName ??
      payloadRecord.customerName ??
      payloadRecord.customerFullName ??
      '',
  ).trim();
  const grandTotalRaw =
    invoice?.financialSummary?.grandTotal ??
    payloadFinancialSummary?.grandTotal ??
    payloadRecord.grandTotal ??
    payloadRecord.total ??
    0;
  const grandTotal = Number(grandTotalRaw) || 0;
  const tplKey = `telegram_tpl_sales_sales_order_created`;
  const tpl =
    String(settings[tplKey] || '').trim() ||
    `🧾 فاکتور جدید ثبت شد
شماره: {invoiceNo}
مشتری: {customerName}
مبلغ: {total}
ثبت‌کننده: {who}
{link}`;
  const formattedTotal = `${formatPriceForSms(grandTotal)} تومان`;
  return safeReplaceTemplate(tpl, {
    invoiceNo: orderId ? `#${orderId}` : '-',
    customerName,
    total: formattedTotal,
    amount: formattedTotal,
    who: username,
    link,
    now: new Date().toISOString(),
  });
}

export function buildSalesOrderCancelledTelegramText(args: {
  orderId: number;
  username: string;
  settings: Record<string, string>;
  safeReplaceTemplate: (
    template: string,
    vars: Record<string, unknown>,
  ) => string;
}) {
  const { orderId, username, settings, safeReplaceTemplate } = args;
  const baseUrl = String(settings.app_base_url || '').trim();
  const link = baseUrl ? `${baseUrl}/#/sales` : '';
  const tplKey = `telegram_tpl_sales_sales_order_cancelled`;
  const tpl =
    String(settings[tplKey] || '').trim() ||
    `❌ فاکتور/سفارش لغو شد
شماره: {invoiceNo}
ثبت‌کننده: {who}
{link}`;
  return safeReplaceTemplate(tpl, {
    invoiceNo: orderId ? `#${orderId}` : '-',
    who: username,
    link,
    now: new Date().toISOString(),
  });
}

export function buildSalesOrderReturnCreatedTelegramText(args: {
  orderId: number;
  row: SalesReturnRow;
  username: string;
  settings: Record<string, string>;
  safeReplaceTemplate: (
    template: string,
    vars: Record<string, unknown>,
  ) => string;
}) {
  const { orderId, username, settings, safeReplaceTemplate } = args;
  const baseUrl = String(settings.app_base_url || '').trim();
  const link = baseUrl ? `${baseUrl}/#/sales` : '';
  const tplKey = `telegram_tpl_sales_sales_order_return_created`;
  const tpl =
    String(settings[tplKey] || '').trim() ||
    `↩️ مرجوعی ثبت شد
شماره: {invoiceNo}
ثبت‌کننده: {who}
{link}`;
  return safeReplaceTemplate(tpl, {
    invoiceNo: orderId ? `#${orderId}` : '-',
    who: username,
    link,
    now: new Date().toISOString(),
  });
}
