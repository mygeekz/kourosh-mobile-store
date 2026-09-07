// Phase 1D: legacy ledger/history maintenance backfills extracted from legacyRuntime.ts.

import { allAsync, getAsync, runAsync } from "../query";
import { recalcCustomerBalances } from "../../repositories/customer";
import { recalcPartnerBalances } from "../../repositories/partner";
import {
  buildPhonePurchaseDescription,
  stringifyLedgerChangeHistory,
} from "../domains/ledgerSupport.db";

export const backfillCustomerLedgerReferences = async (): Promise<void> => {
  const rows = await allAsync(
    `SELECT id, description, debit, credit, referenceType, referenceId
       FROM customer_ledger
      WHERE (referenceType IS NULL OR TRIM(referenceType) = '' OR referenceId IS NULL)`,
  ).catch(() => [] as any[]);

  if (!rows.length) return;
  await runAsync(`
    CREATE TABLE IF NOT EXISTS accounting_reconciliation_issues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      issueKey TEXT NOT NULL UNIQUE,
      issueType TEXT NOT NULL,
      entityType TEXT NOT NULL,
      entityId INTEGER,
      saleId INTEGER,
      severity TEXT NOT NULL,
      title TEXT NOT NULL,
      detailsJson TEXT NOT NULL DEFAULT '{}',
      firstDetectedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      lastDetectedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      resolvedAt TEXT
    )
  `);
  const now = new Date().toISOString();
  for (const row of rows as any[]) {
    // v341: historical references are evidence. Never infer/overwrite source identity
    // from description text. Ambiguous legacy rows must be resolved by a human.
    await runAsync(
      `INSERT INTO accounting_reconciliation_issues
        (issueKey, issueType, entityType, entityId, severity, title, detailsJson, firstDetectedAt, lastDetectedAt, resolvedAt)
       VALUES (?, 'legacy_customer_ledger_missing_reference', 'customer_ledger', ?, 'high', ?, ?, ?, ?, NULL)
       ON CONFLICT(issueKey) DO UPDATE SET detailsJson=excluded.detailsJson,lastDetectedAt=excluded.lastDetectedAt,resolvedAt=NULL`,
      [
        `legacy-customer-ledger-reference:${Number(row.id)}`,
        Number(row.id),
        `سند دفتر مشتری #${Number(row.id)} مرجع قطعی ندارد؛ تعیین منبع نیازمند بررسی انسانی است`,
        JSON.stringify({
          ledgerId: Number(row.id),
          description: String(row.description || ''),
          debit: Number(row.debit || 0),
          credit: Number(row.credit || 0),
          referenceType: row.referenceType ?? null,
          referenceId: row.referenceId ?? null,
        }),
        now,
        now,
      ],
    );
  }
};

export const LEGACY_LEDGER_BACKFILL_KEY = "legacy_history_ledger_backfill_v1";

export const backfillLegacyHistoryAndLedgers = async (): Promise<void> => {
  const doneRow = await getAsync(`SELECT value FROM settings WHERE key = ?`, [
    LEGACY_LEDGER_BACKFILL_KEY,
  ]).catch(() => null as any);
  if (String(doneRow?.value || "") === "done") return;

  const touchedCustomers = new Set<number>();
  const touchedPartners = new Set<number>();

  // فروش‌های قدیمی
  const legacySales = await allAsync(
    `SELECT id, customerId, itemName, totalPrice, paymentMethod, transactionDate
       FROM sales_transactions
      WHERE customerId IS NOT NULL
        AND COALESCE(totalPrice, 0) > 0
        AND NOT EXISTS (
          SELECT 1 FROM customer_ledger cl
           WHERE cl.customerId = sales_transactions.customerId
             AND cl.description LIKE '%' || 'شناسه فروش: ' || sales_transactions.id || '%'
        )
   ORDER BY datetime(COALESCE(transactionDate, datetime('now'))) ASC, id ASC`,
  ).catch(() => [] as any[]);

  for (const sale of legacySales) {
    const customerId = Number(sale.customerId || 0);
    if (!customerId) continue;
    const totalPrice = Number(sale.totalPrice || 0);
    if (totalPrice <= 0) continue;
    const isCredit =
      String(sale.paymentMethod || "").toLowerCase() === "credit";
    const desc = isCredit
      ? `خرید اعتباری: ${sale.itemName || "کالا/خدمت"} (شناسه فروش: ${sale.id})`
      : `خرید نقدی: ${sale.itemName || "کالا/خدمت"} (شناسه فروش: ${sale.id})`;
    await runAsync(
      `INSERT INTO customer_ledger (customerId, transactionDate, description, debit, credit, balance, referenceType, referenceId)
       VALUES (?, ?, ?, ?, ?, 0, 'sales_transaction_charge', ?)`,
      [
        customerId,
        sale.transactionDate || new Date().toISOString(),
        desc,
        totalPrice,
        isCredit ? 0 : totalPrice,
        Number(sale.id),
      ],
    );
    touchedCustomers.add(customerId);
  }

  // فاکتورهای فروش جدیدتر که شاید قبلاً ledger نخورده‌اند
  const salesOrders = await allAsync(
    `SELECT id, customerId, paymentMethod, grandTotal, transactionDate
       FROM sales_orders
      WHERE customerId IS NOT NULL
        AND COALESCE(grandTotal, 0) > 0
        AND (status IS NULL OR status = 'active')
        AND NOT EXISTS (
          SELECT 1 FROM customer_ledger cl
           WHERE cl.customerId = sales_orders.customerId
             AND cl.description = CASE
               WHEN sales_orders.paymentMethod = 'credit' THEN 'فاکتور فروش اعتباری شماره ' || sales_orders.id
               ELSE 'فاکتور فروش نقدی شماره ' || sales_orders.id
             END
        )
   ORDER BY datetime(COALESCE(transactionDate, datetime('now'))) ASC, id ASC`,
  ).catch(() => [] as any[]);

  for (const order of salesOrders) {
    const customerId = Number(order.customerId || 0);
    if (!customerId) continue;
    const grandTotal = Number(order.grandTotal || 0);
    if (grandTotal <= 0) continue;
    const isCredit =
      String(order.paymentMethod || "").toLowerCase() === "credit";
    const desc = isCredit
      ? `فاکتور فروش اعتباری شماره ${order.id}`
      : `فاکتور فروش نقدی شماره ${order.id}`;
    await runAsync(
      `INSERT INTO customer_ledger (customerId, transactionDate, description, debit, credit, balance, referenceType, referenceId)
       VALUES (?, ?, ?, ?, ?, 0, 'sales_order_charge', ?)`,
      [
        customerId,
        order.transactionDate || new Date().toISOString(),
        desc,
        grandTotal,
        isCredit ? 0 : grandTotal,
        Number(order.id),
      ],
    );
    touchedCustomers.add(customerId);
  }

  // فروش‌های اقساطی قدیمی
  const installmentSales = await allAsync(
    `SELECT id, customerId, actualSalePrice, downPayment, itemsSummary, dateCreated
       FROM installment_sales
      WHERE customerId IS NOT NULL
        AND COALESCE(actualSalePrice, 0) > 0
        AND NOT EXISTS (
          SELECT 1 FROM customer_ledger cl
           WHERE cl.customerId = installment_sales.customerId
             AND COALESCE(cl.debit, 0) > 0
             AND COALESCE(cl.credit, 0) = 0
             AND (
               (cl.referenceType = 'installment_charge' AND cl.referenceId = installment_sales.id)
               OR cl.description LIKE '%' || 'خرید اقساطی (شناسه فروش: ' || installment_sales.id || ')%'
               OR cl.description LIKE '%' || 'شناسه فروش اقساطی: ' || installment_sales.id || '%'
             )
        )
   ORDER BY datetime(COALESCE(dateCreated, datetime('now'))) ASC, id ASC`,
  ).catch(() => [] as any[]);

  for (const sale of installmentSales) {
    const customerId = Number(sale.customerId || 0);
    if (!customerId) continue;
    const total = Number(sale.actualSalePrice || 0);
    const down = Number(sale.downPayment || 0);
    const debt = total - down;
    const shortItems = String(
      sale.itemsSummary || sale.mainItemName || "",
    ).trim();
    const desc = debt > 0
      ? `خرید اقساطی (شناسه فروش: ${sale.id})، موارد: ${shortItems || "—"}، مبلغ کل: ${total.toLocaleString("fa-IR")}، پیش پرداخت: ${down.toLocaleString("fa-IR")}`
      : `خرید (شناسه فروش اقساطی: ${sale.id})، پرداخت کامل`;
    await runAsync(
      `INSERT INTO customer_ledger
        (customerId, transactionDate, description, debit, credit, balance, referenceType, referenceId)
       VALUES (?, ?, ?, ?, ?, 0, 'installment_charge', ?)`,
      [
        customerId,
        sale.dateCreated || new Date().toISOString(),
        desc,
        debt > 0 ? debt : total,
        debt > 0 ? 0 : total,
        sale.id,
      ],
    );
    touchedCustomers.add(customerId);
  }

  // رسیدهای خرید قدیمی تامین‌کننده
  const purchaseReceipts = await allAsync(
    `SELECT id, supplierId, invoiceNumber, totalCost, purchaseDate
       FROM purchases
      WHERE supplierId IS NOT NULL
        AND COALESCE(totalCost, 0) > 0
        AND NOT EXISTS (
          SELECT 1 FROM partner_ledger pl
           WHERE pl.partnerId = purchases.supplierId
             AND (
               (pl.referenceType = 'product_purchase' AND pl.referenceId = purchases.id)
               OR pl.description LIKE 'ثبت خرید کالا (رسید انبار) شماره ' || purchases.id || '%'
             )
        )
   ORDER BY datetime(COALESCE(purchaseDate, datetime('now'))) ASC, id ASC`,
  ).catch(() => [] as any[]);

  for (const purchase of purchaseReceipts) {
    const partnerId = Number(purchase.supplierId || 0);
    if (!partnerId) continue;
    const totalCost = Number(purchase.totalCost || 0);
    if (totalCost <= 0) continue;
    const desc =
      `ثبت خرید کالا (رسید انبار) شماره ${purchase.id}` +
      (purchase.invoiceNumber ? ` | فاکتور: ${purchase.invoiceNumber}` : "");
    await runAsync(
      `INSERT INTO partner_ledger (partnerId, transactionDate, description, debit, credit, balance, referenceType, referenceId)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
      [
        partnerId,
        purchase.purchaseDate || new Date().toISOString(),
        desc,
        0,
        totalCost,
        "product_purchase",
        purchase.id,
      ],
    );
    touchedPartners.add(partnerId);
  }

  for (const customerId of touchedCustomers) {
    await recalcCustomerBalances(customerId);
  }
  for (const partnerId of touchedPartners) {
    await recalcPartnerBalances(partnerId);
  }

  await runAsync(
    `INSERT OR REPLACE INTO settings (key, value) VALUES (?, 'done')`,
    [LEGACY_LEDGER_BACKFILL_KEY],
  );
};

export const PHONE_PURCHASE_LEDGER_COLLAPSE_KEY = "phone_purchase_ledger_collapse_v1";

export const normalizePhonePurchaseLedgers = async (_force = false): Promise<void> => {
  const doneRow = await getAsync(`SELECT value FROM settings WHERE key = ?`, [
    PHONE_PURCHASE_LEDGER_COLLAPSE_KEY,
  ]).catch(() => null as any);
  if (String(doneRow?.value || "") === "done-v341-nondestructive") return;

  const rows = await allAsync(
    `SELECT *
       FROM partner_ledger
      WHERE referenceType IN ('phone_purchase', 'phone_purchase_edit', 'phone_purchase_reversal_on_edit')
        AND referenceId IS NOT NULL
   ORDER BY referenceId ASC, datetime(COALESCE(updatedAt, createdAt, transactionDate)) ASC, id ASC`,
    [],
  ).catch(() => [] as any[]);

  const groups = new Map<number, any[]>();
  for (const row of rows as any[]) {
    const refId = Number(row.referenceId || 0);
    if (!refId) continue;
    groups.set(refId, [...(groups.get(refId) || []), row]);
  }

  // v341: legacy duplicates/mismatches are evidence, not disposable rows.
  // Surface them in reconciliation instead of UPDATE/DELETE normalizing history.
  await runAsync(`
    CREATE TABLE IF NOT EXISTS accounting_reconciliation_issues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      issueKey TEXT NOT NULL UNIQUE,
      issueType TEXT NOT NULL,
      entityType TEXT NOT NULL,
      entityId INTEGER,
      saleId INTEGER,
      severity TEXT NOT NULL,
      title TEXT NOT NULL,
      detailsJson TEXT NOT NULL DEFAULT '{}',
      firstDetectedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      lastDetectedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      resolvedAt TEXT
    )
  `);
  const now = new Date().toISOString();
  for (const [phoneId, entries] of groups.entries()) {
    if (entries.length <= 1) continue;
    await runAsync(
      `INSERT INTO accounting_reconciliation_issues
        (issueKey, issueType, entityType, entityId, severity, title, detailsJson, firstDetectedAt, lastDetectedAt, resolvedAt)
       VALUES (?, 'legacy_phone_purchase_multiple_ledger_rows', 'phone', ?, 'high', ?, ?, ?, ?, NULL)
       ON CONFLICT(issueKey) DO UPDATE SET detailsJson=excluded.detailsJson,lastDetectedAt=excluded.lastDetectedAt,resolvedAt=NULL`,
      [
        `legacy-phone-purchase-ledger:${phoneId}`,
        phoneId,
        `گوشی #${phoneId} بیش از یک سند خرید Legacy دارد؛ اصلاح فقط با Reversal انجام شود`,
        JSON.stringify({ phoneId, ledgerEntryIds: entries.map((row: any) => Number(row.id)), referenceTypes: entries.map((row: any) => String(row.referenceType || '')) }),
        now,
        now,
      ],
    );
  }

  await runAsync(
    `INSERT OR REPLACE INTO settings (key, value) VALUES (?, 'done-v341-nondestructive')`,
    [PHONE_PURCHASE_LEDGER_COLLAPSE_KEY],
  );
};