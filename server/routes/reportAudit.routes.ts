import type { Express, RequestHandler } from "express";
import moment from "jalali-moment";
import { allAsync } from "../database";
import { buildFinancialAudit } from "../reportFinancialAudit";

type AuthorizeRole = (allowed: string[]) => RequestHandler;

type ReportAuditRouteDeps = {
  authorizeRole: AuthorizeRole;
};

const REPORT_ROLES = ["Admin", "Manager", "Salesperson", "Marketer"];

export const registerReportAuditRoutes = (
  app: Express,
  { authorizeRole }: ReportAuditRouteDeps,
): void => {
  app.get(
    "/api/reports/financial-audit",
    authorizeRole(REPORT_ROLES),
    async (req, res, next) => {
      try {
        const fromISO = String(req.query.fromISO || "").slice(0, 10);
        const toISO = String(req.query.toISO || "").slice(0, 10);
        const safeFrom = /^\d{4}-\d{2}-\d{2}$/.test(fromISO)
          ? fromISO
          : new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
        const safeTo = /^\d{4}-\d{2}-\d{2}$/.test(toISO)
          ? toISO
          : new Date().toISOString().slice(0, 10);
        const start = safeFrom <= safeTo ? safeFrom : safeTo;
        const end = safeFrom <= safeTo ? safeTo : safeFrom;
        const todayJalali = moment().locale("en").format("jYYYY/MM/DD");

        const invoiceRows = await allAsync(
          `
        SELECT id, subtotal, discount, tax, grandTotal, transactionDate, paymentMethod, status
        FROM sales_orders
        WHERE date(substr(transactionDate, 1, 10)) BETWEEN date(?) AND date(?)
          AND COALESCE(status, 'active') = 'active'
      `,
          [start, end],
        );

        const itemRows = await allAsync(
          `
        SELECT soi.id, soi.orderId, soi.itemType, soi.itemId, soi.description, soi.quantity, soi.unitPrice,
          soi.discountPerItem, soi.totalPrice, COALESCE(soi.buyPrice, 0) AS buyPrice,
          p.purchasePrice AS productPurchasePrice,
          ph.purchasePrice AS phonePurchasePrice,
          ph.currentPurchasePrice AS phoneCurrentPurchasePrice,
          so.transactionDate
        FROM sales_order_items soi
        JOIN sales_orders so ON so.id = soi.orderId
        LEFT JOIN products p ON soi.itemType = 'inventory' AND p.id = soi.itemId
        LEFT JOIN phones ph ON soi.itemType = 'phone' AND ph.id = soi.itemId
        WHERE date(substr(so.transactionDate, 1, 10)) BETWEEN date(?) AND date(?)
          AND COALESCE(so.status, 'active') = 'active'
      `,
          [start, end],
        );

        const installmentRows = await allAsync(
          `
        SELECT ins.id, ins.actualSalePrice, ins.downPayment, ins.numberOfInstallments, ins.installmentAmount, ins.saleType,
          COALESCE(ins.saleDateISO, ins.dateCreated) AS accountingDate,
          COALESCE((
            SELECT SUM(ip.amountDue)
              FROM installment_payments ip
             WHERE ip.saleId = ins.id AND COALESCE(ip.sourceType, 'installment') = 'installment'
          ), 0) AS scheduledAmount,
          COALESCE((SELECT SUM(ic.amount) FROM installment_checks ic WHERE ic.saleId = ins.id), 0) AS checkScheduledAmount,
          COALESCE((
            SELECT SUM(it.amount_paid)
              FROM installment_transactions it
              JOIN installment_payments ip ON ip.id = it.installment_payment_id
             WHERE ip.saleId = ins.id
          ), 0) AS paidAmount,
          COALESCE((
            SELECT SUM(MAX(0, COALESCE(ic.amount, 0) - COALESCE((
              SELECT SUM(it2.amount_paid)
                FROM installment_transactions it2
                JOIN installment_payments ip2 ON ip2.id = it2.installment_payment_id
               WHERE ip2.sourceType = 'check_recovery' AND ip2.sourceId = ic.id
            ), 0)))
              FROM installment_checks ic
             WHERE ic.saleId = ins.id
               AND COALESCE(ic.status, '') IN ('نقد شد','وصول شده','پاس شده','تسویه شده')
          ), 0) AS cashedCheckRemainder,
          COALESCE((
            SELECT SUM(MAX(0, ip.amountDue - COALESCE((
              SELECT SUM(it3.amount_paid) FROM installment_transactions it3 WHERE it3.installment_payment_id = ip.id
            ), 0)))
              FROM installment_payments ip
             WHERE ip.saleId = ins.id
               AND COALESCE(ip.sourceType, 'installment') = 'installment'
               AND ip.dueDate < ?
          ), 0) AS overdueUnpaidAmount
        FROM installment_sales ins
        WHERE COALESCE(ins.status,'active') = 'active'
          AND date(substr(COALESCE(ins.saleDateISO, ins.dateCreated), 1, 10)) BETWEEN date(?) AND date(?)
      `,
          [todayJalali, start, end],
        );

        const inventoryRows = await allAsync(
          `
        SELECT id, name, purchasePrice, sellingPrice, stock_quantity
        FROM products
        WHERE stock_quantity < 0 OR (stock_quantity > 0 AND COALESCE(purchasePrice, 0) <= 0)
        ORDER BY id DESC
        LIMIT 500
      `,
          [],
        );

        const phoneRows = await allAsync(
          `
        SELECT id, model, imei, status, purchasePrice, currentPurchasePrice, saleDate, purchaseDate
        FROM phones
        WHERE (COALESCE(purchasePrice, 0) > 0 AND COALESCE(currentPurchasePrice, 0) <= 0)
          AND status IN ('موجود در انبار', 'مرجوعی', 'مرجوعی اقساطی', 'فروخته شده', 'فروخته شده (قسطی)')
        ORDER BY id DESC
        LIMIT 500
      `,
          [],
        );

        const partnerLedgerRows = await allAsync(
          `
        SELECT id, partnerId, transactionDate, debit, credit, balance, referenceType, referenceId
        FROM partner_ledger
        WHERE (COALESCE(debit, 0) > 0 AND COALESCE(credit, 0) > 0)
        ORDER BY id DESC
        LIMIT 500
      `,
          [],
        );

        const audit = buildFinancialAudit({
          invoiceRows,
          itemRows,
          installmentRows,
          inventoryRows,
          phoneRows,
          partnerLedgerRows,
        });
        res.json({
          success: true,
          data: {
            ...audit,
            range: { fromISO: start, toISO: end },
            sampled: {
              invoices: invoiceRows.length,
              items: itemRows.length,
              installments: installmentRows.length,
              inventoryChecks: inventoryRows.length,
              phoneChecks: phoneRows.length,
              partnerLedgerChecks: partnerLedgerRows.length,
            },
          },
        });
      } catch (e) {
        next(e);
      }
    },
  );
};
