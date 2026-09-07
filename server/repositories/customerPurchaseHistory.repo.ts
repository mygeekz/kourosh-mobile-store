import { allAsync } from "../db/query";

export const listLegacyPurchaseHistoryFromRepo = async (
  customerIdFilter: number | null = null,
): Promise<any[]> => {
  let sql = `
    SELECT st.*, c.fullName as customerFullName,
           CASE WHEN st.itemType = 'phone' THEN ph.imei ELSE NULL END as imei,
           CASE WHEN st.itemType = 'phone' THEN ph.model ELSE NULL END as phoneModel
    FROM sales_transactions st
    LEFT JOIN customers c ON st.customerId = c.id
    LEFT JOIN phones ph ON st.itemType = 'phone' AND st.itemId = ph.id
  `;
  const params: any[] = [];
  if (customerIdFilter) {
    sql += " WHERE st.customerId = ?";
    params.push(customerIdFilter);
  }
  sql += " ORDER BY st.id DESC";

  try {
    return await allAsync(sql, params);
  } catch (err: any) {
    console.error("DB Error (getAllSalesTransactionsFromDb):", err);
    throw new Error(`خطا در عملیاتی پایگاه داده: ${err.message}`);
  }
};

export const listSalesOrderHistoryFromRepo = (customerId: number) =>
  allAsync(
    `
      SELECT 
        so.id,
        so.transactionDate,
        'sales_order' as sourceType,
        COALESCE(
          (SELECT GROUP_CONCAT(description, '، ') FROM sales_order_items WHERE orderId = so.id),
          'فاکتور فروش'
        ) as itemName,
        COALESCE(
          (SELECT GROUP_CONCAT(ph.imei, '، ')
           FROM sales_order_items soi
           JOIN phones ph ON soi.itemType = 'phone' AND soi.itemId = ph.id
           WHERE soi.orderId = so.id AND COALESCE(ph.imei, '') <> ''),
          ''
        ) as imei,
        COALESCE((SELECT SUM(quantity) FROM sales_order_items WHERE orderId = so.id), 1) as quantity,
        CASE WHEN COALESCE((SELECT SUM(quantity) FROM sales_order_items WHERE orderId = so.id), 0) > 0
          THEN ROUND(so.grandTotal / (SELECT SUM(quantity) FROM sales_order_items WHERE orderId = so.id), 2)
          ELSE so.grandTotal END as pricePerItem,
        COALESCE(so.discount, 0) as discount,
        so.grandTotal as totalPrice,
        so.paymentMethod,
        so.notes
      FROM sales_orders so
      WHERE so.customerId = ? AND (so.status IS NULL OR so.status = 'active')
      ORDER BY so.id DESC`,
    [customerId],
  ).catch(() => [] as any[]);

export const listInstallmentHistoryFromRepo = (customerId: number) =>
  allAsync(
    `
      SELECT
        s.id,
        substr(COALESCE(s.dateCreated, datetime('now')), 1, 10) as transactionDate,
        'installment_sale' as sourceType,
        COALESCE(NULLIF(s.itemsSummary, ''), 'فروش اقساطی') as itemName,
        COALESCE(
          (SELECT GROUP_CONCAT(ph.imei, '، ')
           FROM installment_sale_items isi
           JOIN phones ph ON isi.itemType = 'phone' AND isi.itemId = ph.id
           WHERE isi.saleId = s.id AND COALESCE(ph.imei, '') <> ''),
          (SELECT ph.imei FROM phones ph WHERE ph.id = s.phoneId),
          ''
        ) as imei,
        1 as quantity,
        CAST(s.actualSalePrice as REAL) as pricePerItem,
        0 as discount,
        CAST(s.actualSalePrice as REAL) as totalPrice,
        'installment' as paymentMethod,
        s.notes
      FROM installment_sales s
      WHERE s.customerId = ?
      ORDER BY s.id DESC`,
    [customerId],
  ).catch(() => [] as any[]);
