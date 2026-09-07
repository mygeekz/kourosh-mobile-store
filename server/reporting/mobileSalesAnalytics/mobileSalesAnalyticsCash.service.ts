import { allAsync } from "../../database";
import { allocateReportAmountByWeights } from "../../utils/productSalesReports/productSalesSharedCore";
import {
  mobileAnalyticsNumber,
  mobileAnalyticsRound,
} from "./mobileSalesAnalyticsUtils";

export async function fetchMobileAnalyticsCashRows(
  fromISO: string,
  toISO: string,
): Promise<any[]> {
  const orderCashRows = await allAsync(
    `
      WITH order_item_totals AS (
        SELECT orderId, SUM(COALESCE(totalPrice, 0)) AS orderBase
        FROM sales_order_items
        GROUP BY orderId
      )
      SELECT
        'order' AS source,
        so.id AS saleId,
        so.transactionDate AS saleDate,
        so.paymentMethod AS paymentMethod,
        c.id AS customerId,
        c.fullName AS customerName,
        c.phoneNumber AS customerPhone,
        ph.id AS phoneId,
        ph.model AS phoneModel,
        ph.imei AS imei,
        COALESCE(soi.quantity, 1) AS quantity,
        COALESCE(ph.purchasePrice, 0) AS purchasePrice,
        NULLIF(ph.currentPurchasePrice, 0) AS currentPurchasePrice,
        COALESCE(NULLIF(ph.currentPurchasePrice, 0), NULLIF(soi.buyPrice, 0), ph.purchasePrice, 0) AS phoneReferencePrice,
        COALESCE(soi.unitPrice, 0) AS unitPrice,
        COALESCE(soi.discountPerItem, 0) AS itemDiscount,
        COALESCE(so.discount, 0) AS invoiceDiscount,
        COALESCE(soi.totalPrice, 0) AS lineTotal,
        COALESCE(oit.orderBase, 0) AS orderBase,
        0 AS invoiceDiscountShare
      FROM sales_order_items soi
      JOIN sales_orders so ON so.id = soi.orderId
      JOIN order_item_totals oit ON oit.orderId = so.id
      JOIN phones ph ON soi.itemType = 'phone' AND soi.itemId = ph.id
      LEFT JOIN customers c ON c.id = so.customerId
      WHERE date(substr(so.transactionDate, 1, 10)) BETWEEN date(?) AND date(?)
        AND (so.status IS NULL OR so.status = 'active')
    `,
    [fromISO, toISO],
  );

  const legacyCashRows = await allAsync(
    `
      SELECT
        'legacy' AS source,
        st.id AS saleId,
        st.transactionDate AS saleDate,
        COALESCE(st.paymentMethod, 'cash') AS paymentMethod,
        c.id AS customerId,
        c.fullName AS customerName,
        c.phoneNumber AS customerPhone,
        ph.id AS phoneId,
        ph.model AS phoneModel,
        ph.imei AS imei,
        1 AS quantity,
        COALESCE(ph.purchasePrice, 0) AS purchasePrice,
        NULLIF(ph.currentPurchasePrice, 0) AS currentPurchasePrice,
        COALESCE(NULLIF(ph.currentPurchasePrice, 0), NULLIF(st.buyPrice, 0), ph.purchasePrice, 0) AS phoneReferencePrice,
        COALESCE(st.totalPrice, 0) AS unitPrice,
        COALESCE(st.discount, 0) AS itemDiscount,
        0 AS invoiceDiscount,
        COALESCE(st.totalPrice, 0) AS lineTotal,
        COALESCE(st.totalPrice, 0) AS orderBase,
        0 AS invoiceDiscountShare
      FROM sales_transactions st
      JOIN phones ph ON st.itemType = 'phone' AND st.itemId = ph.id
      LEFT JOIN customers c ON c.id = st.customerId
      WHERE date(substr(st.transactionDate, 1, 10)) BETWEEN date(?) AND date(?)
    `,
    [fromISO, toISO],
  );

  const allRows = [...(orderCashRows as any[]), ...(legacyCashRows as any[])];
  const discountSharesByRow = new Map<any, number>();
  const orderRowsById = new Map<number, any[]>();
  for (const row of allRows) {
    if (row.source !== 'order') continue;
    const saleId = Number(row.saleId || 0);
    const group = orderRowsById.get(saleId) || [];
    group.push(row);
    orderRowsById.set(saleId, group);
  }
  for (const group of orderRowsById.values()) {
    const lineWeights = group.map((row) => Math.max(0, mobileAnalyticsNumber(row.lineTotal)));
    const phoneBase = lineWeights.reduce((sum, value) => sum + value, 0);
    const orderBase = Math.max(phoneBase, mobileAnalyticsNumber(group[0]?.orderBase));
    const remainder = Math.max(0, orderBase - phoneBase);
    const weights = remainder > 0 ? [...lineWeights, remainder] : lineWeights;
    const shares = allocateReportAmountByWeights(
      Math.max(0, mobileAnalyticsNumber(group[0]?.invoiceDiscount)),
      weights,
    );
    group.forEach((row, index) => discountSharesByRow.set(row, shares[index] || 0));
  }

  return allRows.map(
    (r: any) => {
      const qty = Math.max(1, mobileAnalyticsNumber(r.quantity || 1));
      const lineTotal = mobileAnalyticsNumber(r.lineTotal);
      const invoiceDiscountShare = r.source === 'order'
        ? Math.max(0, discountSharesByRow.get(r) || 0)
        : 0;
      const netSalePrice = Math.max(0, lineTotal - invoiceDiscountShare);
      const cost = mobileAnalyticsNumber(r.purchasePrice) * qty;
      const hasCurrentPurchasePrice = mobileAnalyticsNumber(r.currentPurchasePrice) > 0;
      const replacementCost = hasCurrentPurchasePrice
        ? mobileAnalyticsNumber(r.currentPurchasePrice) * qty
        : null;
      const profit = netSalePrice - cost;
      const realProfit = replacementCost === null ? null : netSalePrice - replacementCost;
      return {
        id: `cash-${r.source}-${r.saleId}-${r.phoneId}-${r.imei || ""}`,
        source: r.source,
        saleType: "cash",
        saleTypeLabel: "نقدی",
        saleId: Number(r.saleId || 0),
        saleDate: r.saleDate,
        paymentMethod: r.paymentMethod || "cash",
        customerId: r.customerId ? Number(r.customerId) : null,
        customerName: r.customerName || "مشتری نقدی/ثبت نشده",
        customerPhone: r.customerPhone || "",
        phoneId: r.phoneId ? Number(r.phoneId) : null,
        phoneModel: r.phoneModel || "گوشی",
        imei: r.imei || "",
        quantity: qty,
        purchasePrice: mobileAnalyticsRound(
          mobileAnalyticsNumber(r.purchasePrice) * qty,
        ),
        referencePrice: replacementCost === null ? null : mobileAnalyticsRound(replacementCost),
        referencePriceAvailable: hasCurrentPurchasePrice,
        referencePriceSource: hasCurrentPurchasePrice ? "phones.currentPurchasePrice" : null,
        salePrice: mobileAnalyticsRound(netSalePrice),
        grossLineTotal: mobileAnalyticsRound(lineTotal),
        itemDiscount: mobileAnalyticsRound(mobileAnalyticsNumber(r.itemDiscount)),
        invoiceDiscountShare: mobileAnalyticsRound(invoiceDiscountShare),
        profit: mobileAnalyticsRound(profit),
        realProfit: realProfit === null ? null : mobileAnalyticsRound(realProfit),
        replacementDelta: replacementCost === null ? null : mobileAnalyticsRound(replacementCost - cost),
        collectionRate: 100,
        receivedAmount: mobileAnalyticsRound(netSalePrice),
        outstandingAmount: 0,
      };
    },
  );
}
