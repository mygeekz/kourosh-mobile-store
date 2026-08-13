import { allAsync, getAsync } from "../db/query";

export type KouroshPulseProductRow = {
  id: number;
  name: string;
  stockQuantity: number;
  dateAdded: string | null;
};

export type KouroshPulsePhoneModelRow = {
  model: string;
  stockQuantity: number;
};

export type KouroshPulseSaleEventRow = {
  source: "legacy-sale" | "sales-order" | "installment-sale";
  saleDate: string | null;
  productId: number | null;
};

export type KouroshPulseInstallmentRow = {
  id: number;
  dueDate: string;
  status: string;
};

export type KouroshPulseReadSnapshot = {
  products: KouroshPulseProductRow[];
  phoneModels: KouroshPulsePhoneModelRow[];
  sales: KouroshPulseSaleEventRow[];
  installments: KouroshPulseInstallmentRow[];
  installmentDatasetCount: number;
};

/**
 * Phase 1A/1B read boundary. Every statement in this repository is SELECT-only.
 * No ML runtime, artifact file, external service, or mutation helper is used.
 */
export const readKouroshPulseSnapshot = async (): Promise<KouroshPulseReadSnapshot> => {
  const [products, phoneModels, sales, installments, installmentDataset] = await Promise.all([
    allAsync(`
      SELECT
        id,
        name,
        COALESCE(stock_quantity, 0) AS stockQuantity,
        date_added AS dateAdded
      FROM products
      ORDER BY id ASC
    `),
    allAsync(`
      SELECT
        TRIM(model) AS model,
        COUNT(*) AS stockQuantity
      FROM phones
      WHERE status = 'موجود در انبار'
      GROUP BY TRIM(model)
      ORDER BY TRIM(model) COLLATE NOCASE ASC
    `),
    allAsync(`
      SELECT 'legacy-sale' AS source, transactionDate AS saleDate,
             CASE WHEN itemType = 'inventory' THEN itemId ELSE NULL END AS productId
      FROM sales_transactions
      UNION ALL
      SELECT 'sales-order' AS source, so.transactionDate AS saleDate,
             CASE WHEN soi.itemType = 'inventory' THEN soi.itemId ELSE NULL END AS productId
      FROM sales_order_items soi
      INNER JOIN sales_orders so ON so.id = soi.orderId
      UNION ALL
      SELECT 'installment-sale' AS source, COALESCE(ins.saleDateISO, ins.dateCreated) AS saleDate,
             CASE WHEN isi.itemType = 'inventory' THEN isi.itemId ELSE NULL END AS productId
      FROM installment_sale_items isi
      INNER JOIN installment_sales ins ON ins.id = isi.saleId
      WHERE COALESCE(ins.status,'active') = 'active'
      ORDER BY saleDate ASC
    `),
    allAsync(`
      SELECT id, dueDate, status
      FROM installment_payments
      WHERE COALESCE(status, 'پرداخت نشده') <> 'پرداخت شده'
        AND paymentDate IS NULL
      ORDER BY dueDate ASC, id ASC
    `),
    getAsync(`
      SELECT
        (SELECT COUNT(*) FROM installment_sales WHERE COALESCE(status,'active') = 'active') +
        (SELECT COUNT(*) FROM installment_payments) AS count
    `),
  ]);

  return {
    products: products as KouroshPulseProductRow[],
    phoneModels: phoneModels as KouroshPulsePhoneModelRow[],
    sales: sales as KouroshPulseSaleEventRow[],
    installments: installments as KouroshPulseInstallmentRow[],
    installmentDatasetCount: Number(installmentDataset?.count || 0),
  };
};
