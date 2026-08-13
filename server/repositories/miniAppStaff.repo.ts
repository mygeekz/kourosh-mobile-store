/* eslint-disable @typescript-eslint/no-explicit-any -- This repository is the whitelist boundary over legacy SQLite rows. */
import { allAsync, getAsync } from "../db/query";
import { getDbInstance } from "../db/core/runtimeBindings";

export type MiniAppStaffRepoDependencies = {
  ensureDatabase: () => Promise<unknown>;
  allRows: (sql: string, params?: unknown[]) => Promise<any[]>;
  getRow: (sql: string, params?: unknown[]) => Promise<any>;
};

const defaultDependencies: MiniAppStaffRepoDependencies = {
  ensureDatabase: getDbInstance,
  allRows: (sql, params = []) => allAsync(sql, params),
  getRow: (sql, params = []) => getAsync(sql, params),
};

const NORMALIZED_TEXT = (column: string) =>
  `REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(${column},''),'ي','ی'),'ك','ک'),'أ','ا'),'إ','ا'),'آ','ا')`;

export const createMiniAppStaffRepository = (
  dependencies: MiniAppStaffRepoDependencies = defaultDependencies,
) => {
  const ready = () => dependencies.ensureDatabase();
  return {
    getReceivablesSummary: async () => {
      await ready();
      return dependencies.getRow(`
        WITH balances AS (
          SELECT customerId, SUM(COALESCE(debit,0) - COALESCE(credit,0)) AS balance
          FROM customer_ledger
          GROUP BY customerId
        )
        SELECT
          COALESCE(SUM(CASE WHEN balance > 0 THEN balance ELSE 0 END),0) AS totalReceivables,
          COALESCE(SUM(CASE WHEN balance > 0 THEN 1 ELSE 0 END),0) AS debtorsCount
        FROM balances
      `);
    },

    searchCustomers: async (query: string, limit: number) => {
      await ready();
      const name = NORMALIZED_TEXT("c.fullName");
      return dependencies.allRows(`
        SELECT c.id AS customerId, c.fullName, c.phoneNumber,
               COALESCE((SELECT SUM(COALESCE(l.debit,0)-COALESCE(l.credit,0)) FROM customer_ledger l WHERE l.customerId=c.id),0) AS currentBalance
        FROM customers c
        WHERE INSTR(${name}, ?) > 0
           OR INSTR(COALESCE(c.phoneNumber,''), ?) > 0
           OR CAST(c.id AS TEXT) = ?
        ORDER BY CASE WHEN CAST(c.id AS TEXT)=? THEN 0 WHEN ${name}=? THEN 1 ELSE 2 END,
                 c.fullName COLLATE NOCASE, c.id
        LIMIT ?
      `, [query, query, query, query, query, limit]);
    },

    searchPhones: async (query: string, limit: number) => {
      await ready();
      const model = NORMALIZED_TEXT("ph.model");
      return dependencies.allRows(`
        SELECT ph.id, ph.model, ph.imei, ph.color, ph.storage, ph.ram, ph.status, ph.salePrice
        FROM phones ph
        WHERE INSTR(${model}, ?) > 0 OR INSTR(COALESCE(ph.imei,''), ?) > 0 OR CAST(ph.id AS TEXT)=?
        ORDER BY CASE WHEN COALESCE(ph.imei,'')=? THEN 0 WHEN CAST(ph.id AS TEXT)=? THEN 1 ELSE 2 END,
                 ph.registerDate DESC, ph.id DESC
        LIMIT ?
      `, [query, query, query, query, query, limit]);
    },

    searchInvoices: async (query: string, limit: number) => {
      await ready();
      const customer = NORMALIZED_TEXT("customerName");
      return dependencies.allRows(`
        WITH invoice_rows AS (
          SELECT 'order' AS source, so.id AS invoiceId, CAST(so.id AS TEXT) AS invoiceNumber,
                 COALESCE(c.fullName,'مهمان') AS customerName, so.transactionDate AS invoiceDate,
                 so.grandTotal AS total, so.paymentMethod,
                 COALESCE((SELECT GROUP_CONCAT(soi.description,'، ') FROM sales_order_items soi WHERE soi.orderId=so.id),'فاکتور فروش') AS itemSummary
          FROM sales_orders so LEFT JOIN customers c ON c.id=so.customerId
          WHERE COALESCE(so.status,'active') <> 'canceled'
          UNION ALL
          SELECT 'legacy', i.id, COALESCE(NULLIF(i.invoiceNumber,''),CAST(i.id AS TEXT)),
                 COALESCE(c.fullName,'مهمان'), i.date, i.grandTotal, NULL,
                 COALESCE((SELECT GROUP_CONCAT(ii.description,'، ') FROM invoice_items ii WHERE ii.invoiceId=i.id),'فاکتور قدیمی')
          FROM invoices i LEFT JOIN customers c ON c.id=i.customerId
        )
        SELECT * FROM invoice_rows
        WHERE invoiceNumber=? OR CAST(invoiceId AS TEXT)=? OR INSTR(${customer},?)>0
        ORDER BY CASE WHEN invoiceNumber=? THEN 0 WHEN CAST(invoiceId AS TEXT)=? THEN 1 ELSE 2 END,
                 invoiceDate DESC, invoiceId DESC
        LIMIT ?
      `, [query, query, query, query, query, limit]);
    },

    searchInstallments: async (query: string, limit: number) => {
      await ready();
      const customer = NORMALIZED_TEXT("c.fullName");
      const summary = NORMALIZED_TEXT("s.itemsSummary");
      return dependencies.allRows(`
        SELECT s.id AS saleId, s.customerId, c.fullName AS customerName, c.phoneNumber AS customerPhone,
               COALESCE(NULLIF(s.itemsSummary,''),'قرارداد اقساطی') AS itemSummary,
               COALESCE(s.saleDate,s.saleDateISO,s.dateCreated) AS saleDate,
               s.actualSalePrice, s.status
        FROM installment_sales s JOIN customers c ON c.id=s.customerId
        WHERE CAST(s.id AS TEXT)=? OR INSTR(${customer},?)>0 OR INSTR(COALESCE(c.phoneNumber,''),?)>0 OR INSTR(${summary},?)>0
        ORDER BY CASE WHEN CAST(s.id AS TEXT)=? THEN 0 ELSE 1 END,
                 COALESCE(s.saleDateISO,s.dateCreated) DESC, s.id DESC
        LIMIT ?
      `, [query, query, query, query, query, limit]);
    },

    getCustomerBasic: async (customerId: number) => {
      await ready();
      return dependencies.getRow(`
        SELECT c.id AS customerId, c.fullName, c.phoneNumber,
               COALESCE((SELECT SUM(COALESCE(l.debit,0)-COALESCE(l.credit,0)) FROM customer_ledger l WHERE l.customerId=c.id),0) AS currentBalance
        FROM customers c WHERE c.id=? LIMIT 1
      `, [customerId]);
    },

    listCustomerRecentLedger: async (customerId: number, limit: number) => {
      await ready();
      return dependencies.allRows(`
        SELECT transactionDate, description, debit, credit, balance
        FROM customer_ledger
        WHERE customerId=?
        ORDER BY datetime(COALESCE(updatedAt,createdAt,transactionDate)) DESC, id DESC
        LIMIT ?
      `, [customerId, limit]);
    },

    listCustomerRecentPurchases: async (customerId: number, limit: number) => {
      await ready();
      return dependencies.allRows(`
        WITH purchases AS (
          SELECT so.transactionDate AS purchaseDate, 'order' AS source, so.id AS purchaseId,
                 so.paymentMethod AS purchaseType, so.grandTotal AS total,
                 COALESCE((SELECT GROUP_CONCAT(soi.description,'، ') FROM sales_order_items soi WHERE soi.orderId=so.id),'فاکتور فروش') AS itemSummary
          FROM sales_orders so WHERE so.customerId=? AND COALESCE(so.status,'active')<>'canceled'
          UNION ALL
          SELECT st.transactionDate, 'legacy', st.id, st.paymentMethod, st.totalPrice, st.itemName
          FROM sales_transactions st WHERE st.customerId=?
          UNION ALL
          SELECT COALESCE(s.saleDate,s.saleDateISO,s.dateCreated), 'installment', s.id, 'installment', s.actualSalePrice,
                 COALESCE(NULLIF(s.itemsSummary,''),'فروش اقساطی')
          FROM installment_sales s WHERE s.customerId=? AND COALESCE(s.status,'active')<>'canceled'
        )
        SELECT * FROM purchases ORDER BY purchaseDate DESC, purchaseId DESC LIMIT ?
      `, [customerId, customerId, customerId, limit]);
    },

    getPhoneSaleRelation: async (phoneId: number) => {
      await ready();
      return dependencies.getRow(`
        WITH relations AS (
          SELECT 1 AS priority, 'order' AS source, so.id AS saleRef, so.transactionDate AS saleDate,
                 c.id AS customerId, c.fullName AS customerName, c.phoneNumber AS customerPhone
          FROM sales_order_items soi JOIN sales_orders so ON so.id=soi.orderId LEFT JOIN customers c ON c.id=so.customerId
          WHERE soi.itemType='phone' AND soi.itemId=? AND COALESCE(so.status,'active')<>'canceled'
          UNION ALL
          SELECT 2, 'legacy', st.id, st.transactionDate, c.id, c.fullName, c.phoneNumber
          FROM sales_transactions st LEFT JOIN customers c ON c.id=st.customerId
          WHERE st.itemType='phone' AND st.itemId=?
          UNION ALL
          SELECT 3, 'installment', s.id, COALESCE(s.saleDateISO,s.dateCreated), c.id, c.fullName, c.phoneNumber
          FROM installment_sales s LEFT JOIN customers c ON c.id=s.customerId
          WHERE (s.phoneId=? OR EXISTS(SELECT 1 FROM installment_sale_items isi WHERE isi.saleId=s.id AND isi.itemType='phone' AND isi.itemId=?))
            AND COALESCE(s.status,'active')<>'canceled'
        )
        SELECT * FROM relations ORDER BY saleDate DESC, priority ASC, saleRef DESC LIMIT 1
      `, [phoneId, phoneId, phoneId, phoneId]);
    },
  };
};

export const miniAppStaffRepo = createMiniAppStaffRepository();
