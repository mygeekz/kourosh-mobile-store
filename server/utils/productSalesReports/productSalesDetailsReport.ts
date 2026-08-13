import moment from "jalali-moment";
import { allAsync, getAsync, fromShamsiStringToISO } from "../../database";

import { safeReportNumber } from './productSalesSharedCore';

export const getProductSalesDetailsDiscountAudit = (row: any) => {
  const itemDiscount = Math.max(0, Number(row?.discountPerItem || 0));
  const invoiceShare = Math.max(0, Number(row?.globalDiscountShare || 0));
  const totalDiscount = Math.max(
    0,
    Number(row?.totalDiscountAmount ?? itemDiscount + invoiceShare),
  );
  const hasItemDiscount = itemDiscount > 0;
  const hasInvoiceDiscount = invoiceShare > 0;
  return {
    itemDiscount,
    invoiceShare,
    totalDiscount,
    hasItemDiscount,
    hasInvoiceDiscount,
    hasAnyDiscount: hasItemDiscount || hasInvoiceDiscount || totalDiscount > 0,
  };
};

export const matchesProductSalesDetailsQuery = (row: any, query: string) => {
  const q = String(query || "")
    .trim()
    .toLowerCase();
  if (!q) return true;
  const sourceLabel =
    String(row?.sourceType || "invoice") === "installment"
      ? "اقساطی"
      : "فاکتور";
  const paymentLabel =
    row?.paymentType === "installment"
      ? "اقساطی"
      : row?.paymentType === "credit"
        ? "اعتباری"
        : "نقدی";
  const itemLabel = row?.itemType === "service" ? "خدمات" : "لوازم";
  return (
    String(row?.orderId || "").includes(q) ||
    String(row?.productId || "").includes(q) ||
    String(row?.productName || "")
      .toLowerCase()
      .includes(q) ||
    sourceLabel.includes(q) ||
    paymentLabel.includes(q) ||
    itemLabel.includes(q)
  );
};

export const summarizeProductSalesDetailsRows = (rows: any[]) =>
  rows.reduce(
    (acc: any, row: any) => {
      const audit = getProductSalesDetailsDiscountAudit(row);
      acc.lineTotal += Number(row?.lineTotal || 0);
      acc.receivedAmount += Number(row?.receivedAmount || 0);
      acc.totalProfit += Number(
        row?.fullProfit ??
          Number(row?.lineTotal || 0) - Number(row?.lineCost || 0),
      );
      acc.realizedProfit += Number(row?.realizedProfit || 0);
      acc.unrecognizedProfit += Number(
        row?.unrecognizedProfit ??
          Number(
            row?.fullProfit ??
              Number(row?.lineTotal || 0) - Number(row?.lineCost || 0),
          ) - Number(row?.realizedProfit || 0),
      );
      acc.totalDiscountAmount += audit.totalDiscount;
      acc.itemDiscountAmount += audit.itemDiscount;
      acc.invoiceDiscountShare += audit.invoiceShare;
      return acc;
    },
    {
      lineTotal: 0,
      receivedAmount: 0,
      totalProfit: 0,
      realizedProfit: 0,
      unrecognizedProfit: 0,
      totalDiscountAmount: 0,
      itemDiscountAmount: 0,
      invoiceDiscountShare: 0,
    },
  );

export const buildProductSalesDetailsTopProducts = (rows: any[]) => {
  const map = new Map<string, any>();
  for (const row of rows) {
    const itemType = row?.itemType === "service" ? "service" : "inventory";
    const productId = Number(row?.productId || 0);
    const key = `${itemType}:${productId}`;
    const cur = map.get(key) || {
      itemType,
      productId,
      productName: String(row?.productName || "—"),
      qty: 0,
      amount: 0,
    };
    cur.qty += Number(row?.quantity || 0);
    cur.amount += Number(row?.receivedAmount ?? row?.lineTotal ?? 0);
    map.set(key, cur);
  }
  return Array.from(map.values())
    .sort((a: any, b: any) => Number(b.amount || 0) - Number(a.amount || 0))
    .slice(0, 8);
};
