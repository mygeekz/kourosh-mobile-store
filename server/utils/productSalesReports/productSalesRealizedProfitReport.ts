import { formatExactNumberText } from "../../../utils/exactNumber";
import moment from "jalali-moment";
import { fromShamsiStringToISO } from "../../db/date";

import {
  allocateReportAmountByWeights,
  allocateReportAmountShare,
  buildDiscountAwareInvoiceLines,
  clamp01,
  getProductSalesDocKey,
} from './productSalesSharedCore';

type RealizedProfitDoc = {
  docKey: string;
  sourceType: "invoice" | "installment";
  paymentType: "cash" | "credit" | "installment";
  orderId: number;
  customerId: number | null;
  customerName?: string | null;
  transactionDate: string;
  contractualTotal: number;
  contractualCost: number;
  receivedInRange: number;
  actualSalePrice?: number;
  primaryItemName?: string;
  itemsSummary?: string;
  itemsCount?: number;
  detailHref?: string;
  detailLabel?: string;
  totalProfit?: number;
  realizedProfit?: number;
  unrecognizedProfit?: number;
  collectionRate?: number;
};

export const isDateInRange = (value: any, fromISO: string, toISO: string) => {
  const d = moment(String(value || "").slice(0, 10));
  return (
    d.isValid() &&
    !d.isBefore(moment(String(fromISO).slice(0, 10)), "day") &&
    !d.isAfter(moment(String(toISO).slice(0, 10)), "day")
  );
};

export const normalizeRealizedProfitReportDate = (value: any): string => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const shamsi = raw.includes("/") ? fromShamsiStringToISO(raw) : "";
  const candidates = [shamsi, raw, raw.slice(0, 10)].filter(Boolean);
  for (const candidate of candidates) {
    try {
      const m = moment(
        candidate,
        [moment.ISO_8601, "YYYY-MM-DD", "YYYY/MM/DD"],
        true,
      );
      if (m && typeof m.isValid === "function" && m.isValid())
        return m.format("YYYY-MM-DD");
    } catch {}
  }
  try {
    const loose = moment(raw);
    return loose && typeof loose.isValid === "function" && loose.isValid()
      ? loose.format("YYYY-MM-DD")
      : "";
  } catch {
    return "";
  }
};

export const isRealizedProfitReportDateInRange = (
  value: any,
  fromDate: string,
  toDate: string,
) => {
  const d = normalizeRealizedProfitReportDate(value);
  return (
    !!d &&
    !moment(d).isBefore(moment(fromDate), "day") &&
    !moment(d).isAfter(moment(toDate), "day")
  );
};

export const isPassedInstallmentCheckStatus = (status: any) => {
  const s = String(status || "").trim();
  if (!s) return false;
  if (/ضمانت|امانت|نزد فروشنده|در جریان|برگشت|عودت|لغو|باطل/.test(s))
    return false;
  return (
    ["نقد شد", "پاس شده", "وصول شده", "تسویه شده"].includes(s) ||
    /پاس|وصول|نقد|تسویه/.test(s)
  );
};

export const calculateProportionalProfitRecognition = (
  contractualTotal: number,
  contractualCost: number,
  receivedAmount: number,
) => {
  const total = Math.max(0, Number(contractualTotal || 0));
  const cost = Math.max(0, Number(contractualCost || 0));
  const received = Math.min(total, Math.max(0, Number(receivedAmount || 0)));
  const fullProfit = total - cost;
  const realizedProfit = total > 0
    ? allocateReportAmountShare(fullProfit, received, total)
    : 0;
  const realizedCost = received - realizedProfit;
  return {
    received,
    fullProfit,
    realizedProfit,
    realizedCost,
    unrecognizedProfit: fullProfit - realizedProfit,
    collectionRate: total > 0 ? (received / total) * 100 : 0,
  };
};

// Compatibility export for older modules. Recognition is now proportional to
// actual collection, so principal and profit are recognized together instead
// of reporting zero profit until the entire cost has been recovered.
export const calculateCostRecoveryRecognition = calculateProportionalProfitRecognition;


export async function buildRealizedProfitRecognitionReport(
  fromISO: string,
  toISO: string,
  deps?: { allAsync: (sql: string, params?: any[]) => Promise<any[]> },
) {
  const readAll = deps?.allAsync ?? (await import("../../database")).allAsync;
  const fromDate = moment(String(fromISO)).isValid()
    ? moment(String(fromISO)).format("YYYY-MM-DD")
    : moment().startOf("jMonth").format("YYYY-MM-DD");
  const toDate = moment(String(toISO)).isValid()
    ? moment(String(toISO)).format("YYYY-MM-DD")
    : moment().endOf("day").format("YYYY-MM-DD");

  const invoiceRaw = await readAll(
    `SELECT
        'invoice' AS sourceType,
        so.id AS orderId,
        so.customerId,
        c.fullName AS customerName,
        so.paymentMethod,
        so.transactionDate,
        COALESCE(so.discount,0) AS orderDiscount,
        soi.id AS lineId,
        soi.itemType,
        soi.itemId AS productId,
        COALESCE(CASE WHEN soi.itemType='service' THEN sv.name WHEN soi.itemType='inventory' THEN p.name ELSE ph.model END, soi.description, '—') AS productName,
        COALESCE(soi.quantity,0) AS quantity,
        COALESCE(soi.unitPrice,0) AS unitPrice,
        COALESCE(soi.discountPerItem,0) AS discountPerItem,
        ((COALESCE(soi.quantity,0) * COALESCE(soi.unitPrice,0)) - COALESCE(soi.discountPerItem,0)) AS lineTotal,
        CASE
          WHEN soi.itemType='inventory' THEN COALESCE(NULLIF(soi.buyPrice,0), p.purchasePrice,0) * COALESCE(soi.quantity,0)
          WHEN soi.itemType='phone' THEN COALESCE(NULLIF(ph.currentPurchasePrice,0), NULLIF(soi.buyPrice,0), ph.purchasePrice,0) * COALESCE(soi.quantity,0)
          ELSE 0
        END AS lineCost,
        CASE
          WHEN soi.itemType='inventory' THEN COALESCE(p.purchasePrice,0) * COALESCE(soi.quantity,0)
          WHEN soi.itemType='phone' THEN COALESCE(ph.purchasePrice,0) * COALESCE(soi.quantity,0)
          ELSE 0
        END AS lineOriginalCost,
        CASE
          WHEN soi.itemType='phone' AND COALESCE(NULLIF(ph.currentPurchasePrice,0),0) > 0 THEN 'current_purchase_price'
          WHEN soi.itemType='phone' AND COALESCE(NULLIF(soi.buyPrice,0),0) > 0 THEN 'sale_item_buy_price'
          WHEN soi.itemType='phone' THEN 'original_purchase_price'
          WHEN soi.itemType='inventory' AND COALESCE(NULLIF(soi.buyPrice,0),0) > 0 THEN 'sale_item_buy_price'
          WHEN soi.itemType='inventory' THEN 'product_purchase_price'
          ELSE 'not_applicable'
        END AS costBasisSource
       FROM sales_orders so
       JOIN sales_order_items soi ON so.id = soi.orderId
       LEFT JOIN products p ON soi.itemType='inventory' AND p.id = soi.itemId
       LEFT JOIN services sv ON soi.itemType='service' AND sv.id = soi.itemId
       LEFT JOIN phones ph ON soi.itemType='phone' AND ph.id = soi.itemId
       LEFT JOIN customers c ON c.id = so.customerId
      WHERE (so.status IS NULL OR so.status = 'active')
        AND date(so.transactionDate) <= date(?)
      ORDER BY date(so.transactionDate) ASC, so.id ASC, soi.id ASC`,
    [toDate],
  );

  const invoiceLines = buildDiscountAwareInvoiceLines(invoiceRaw as any[]).map(
    (row: any, idx: number) => ({
      rowId: `invoice-${row.orderId}-${row.lineId || idx}`,
      sourceType: "invoice",
      docKey: getProductSalesDocKey("invoice", Number(row.orderId)),
      orderId: Number(row.orderId),
      customerId: row.customerId == null ? null : Number(row.customerId),
      customerName:
        row.customerName == null ? null : String(row.customerName || ""),
      transactionDate: String(row.transactionDate || ""),
      paymentType:
        String(row.paymentMethod || "cash").toLowerCase() === "credit"
          ? "credit"
          : "cash",
      itemType: String(row.itemType || "inventory"),
      productId: Number(row.productId || 0),
      productName: String(row.productName || "—"),
      quantity: Number(row.quantity || 0),
      lineTotal: Math.max(0, Number(row.lineTotal || 0)),
      lineCost: Math.max(0, Number(row.lineCost || 0)),
      lineOriginalCost: Math.max(
        0,
        Number(row.lineOriginalCost || row.lineCost || 0),
      ),
      costBasisSource: String(row.costBasisSource || ""),
      receivedAmount: 0,
      realizedProfit: 0,
      fullProfit: 0,
      unrecognizedProfit: 0,
      collectionRate: 0,
    }),
  );

  const installmentRaw = await readAll(
    `SELECT
        'installment' AS sourceType,
        ins.id AS orderId,
        ins.customerId,
        c.fullName AS customerName,
        'installment' AS paymentMethod,
        COALESCE(ins.saleDateISO, ins.dateCreated) AS transactionDate,
        COALESCE(ins.actualSalePrice,0) AS actualSalePrice,
        COALESCE(ins.downPayment,0) AS downPayment,
        isi.id AS lineId,
        isi.itemType,
        isi.itemId AS productId,
        COALESCE(CASE WHEN isi.itemType='service' THEN sv.name WHEN isi.itemType='inventory' THEN p.name ELSE ph.model END, isi.description, '—') AS productName,
        COALESCE(isi.quantity,0) AS quantity,
        COALESCE(isi.totalPrice,0) AS lineTotal,
        CASE
          WHEN isi.itemType='inventory' THEN COALESCE(NULLIF(isi.buyPrice,0), p.purchasePrice,0) * COALESCE(isi.quantity,0)
          WHEN isi.itemType='phone' THEN COALESCE(NULLIF(ph.currentPurchasePrice,0), NULLIF(isi.buyPrice,0), ph.purchasePrice,0) * COALESCE(isi.quantity,0)
          ELSE 0
        END AS lineCost,
        CASE
          WHEN isi.itemType='inventory' THEN COALESCE(p.purchasePrice,0) * COALESCE(isi.quantity,0)
          WHEN isi.itemType='phone' THEN COALESCE(ph.purchasePrice,0) * COALESCE(isi.quantity,0)
          ELSE 0
        END AS lineOriginalCost,
        CASE
          WHEN isi.itemType='phone' AND COALESCE(NULLIF(ph.currentPurchasePrice,0),0) > 0 THEN 'current_purchase_price'
          WHEN isi.itemType='phone' AND COALESCE(NULLIF(isi.buyPrice,0),0) > 0 THEN 'sale_item_buy_price'
          WHEN isi.itemType='phone' THEN 'original_purchase_price'
          WHEN isi.itemType='inventory' AND COALESCE(NULLIF(isi.buyPrice,0),0) > 0 THEN 'sale_item_buy_price'
          WHEN isi.itemType='inventory' THEN 'product_purchase_price'
          ELSE 'not_applicable'
        END AS costBasisSource
       FROM installment_sales ins
       JOIN installment_sale_items isi ON ins.id = isi.saleId
       LEFT JOIN products p ON isi.itemType='inventory' AND p.id = isi.itemId
       LEFT JOIN services sv ON isi.itemType='service' AND sv.id = isi.itemId
       LEFT JOIN phones ph ON isi.itemType='phone' AND ph.id = isi.itemId
       LEFT JOIN customers c ON c.id = ins.customerId
      WHERE COALESCE(ins.status,'active') = 'active'
        AND date(COALESCE(ins.saleDateISO, ins.dateCreated)) <= date(?)

      UNION ALL

      SELECT
        'installment' AS sourceType,
        ins.id AS orderId,
        ins.customerId,
        c.fullName AS customerName,
        'installment' AS paymentMethod,
        COALESCE(ins.saleDateISO, ins.dateCreated) AS transactionDate,
        COALESCE(ins.actualSalePrice,0) AS actualSalePrice,
        COALESCE(ins.downPayment,0) AS downPayment,
        NULL AS lineId,
        'phone' AS itemType,
        ph.id AS productId,
        COALESCE(ph.model, 'گوشی') AS productName,
        1 AS quantity,
        COALESCE(ins.actualSalePrice,0) AS lineTotal,
        COALESCE(NULLIF(ph.currentPurchasePrice,0), ph.purchasePrice,0) AS lineCost,
        COALESCE(ph.purchasePrice,0) AS lineOriginalCost,
        CASE
          WHEN COALESCE(NULLIF(ph.currentPurchasePrice,0),0) > 0 THEN 'current_purchase_price'
          ELSE 'original_purchase_price'
        END AS costBasisSource
       FROM installment_sales ins
       JOIN phones ph ON ph.id = ins.phoneId
       LEFT JOIN customers c ON c.id = ins.customerId
      WHERE COALESCE(ins.status,'active') = 'active'
        AND ins.phoneId IS NOT NULL
        AND date(COALESCE(ins.saleDateISO, ins.dateCreated)) <= date(?)
        AND NOT EXISTS (SELECT 1 FROM installment_sale_items isi2 WHERE isi2.saleId = ins.id)
      ORDER BY transactionDate ASC, orderId ASC`,
    [toDate, toDate],
  );

  const installmentLines = (installmentRaw as any[]).map(
    (row: any, idx: number) => ({
      rowId: `installment-${row.orderId}-${row.lineId || idx}`,
      sourceType: "installment",
      docKey: getProductSalesDocKey("installment", Number(row.orderId)),
      orderId: Number(row.orderId),
      customerId: row.customerId == null ? null : Number(row.customerId),
      customerName:
        row.customerName == null ? null : String(row.customerName || ""),
      transactionDate: String(row.transactionDate || ""),
      paymentType: "installment",
      actualSalePrice: Number(row.actualSalePrice || 0),
      downPayment: Number(row.downPayment || 0),
      itemType: String(row.itemType || "inventory"),
      productId: Number(row.productId || 0),
      productName: String(row.productName || "—"),
      quantity: Number(row.quantity || 0),
      lineTotal: Math.max(0, Number(row.lineTotal || 0)),
      lineCost: Math.max(0, Number(row.lineCost || 0)),
      lineOriginalCost: Math.max(
        0,
        Number(row.lineOriginalCost || row.lineCost || 0),
      ),
      costBasisSource: String(row.costBasisSource || ""),
      receivedAmount: 0,
      realizedProfit: 0,
      fullProfit: 0,
      unrecognizedProfit: 0,
      collectionRate: 0,
    }),
  );

  const lines = [...invoiceLines, ...installmentLines].filter(
    (line: any) =>
      Number(line.lineTotal || 0) > 0 || Number(line.lineCost || 0) > 0,
  );
  const docs = new Map<string, RealizedProfitDoc>();
  const docsLines = new Map<string, any[]>();

  for (const line of lines as any[]) {
    const arr = docsLines.get(line.docKey) || [];
    arr.push(line);
    docsLines.set(line.docKey, arr);
  }

  // Installment accounting note:
  // For installment sales, the recognized contract value must be the actual sale price,
  // not a stale line total. Older records may have installment_sale_items.totalPrice
  // that does not exactly match installment_sales.actualSalePrice. Aligning line totals
  // prevents wrong remaining profit such as 1M instead of the actual 2M margin.
  for (const arr of docsLines.values()) {
    const first = arr[0] || {};
    if (String(first.sourceType || "") !== "installment") continue;
    const actualSalePrice = Math.max(0, Number(first.actualSalePrice || 0));
    const linesTotal = arr.reduce(
      (sum: number, line: any) =>
        sum + Math.max(0, Number(line.lineTotal || 0)),
      0,
    );
    if (
      actualSalePrice > 0 &&
      linesTotal > 0 &&
      Math.abs(actualSalePrice - linesTotal) > 0
    ) {
      const allocatedLineTotals = allocateReportAmountByWeights(
        actualSalePrice,
        arr.map((line: any) => Math.max(0, Number(line.lineTotal || 0))),
      );
      for (const [index, line] of (arr as any[]).entries()) {
        line.lineTotal = allocatedLineTotals[index] || 0;
      }
    }
  }

  for (const [docKey, arr] of docsLines.entries()) {
    const first = arr[0];
    const contractualTotal = arr.reduce(
      (s: number, l: any) => s + Number(l.lineTotal || 0),
      0,
    );
    const contractualCost = arr.reduce(
      (s: number, l: any) => s + Number(l.lineCost || 0),
      0,
    );
    const sourceType =
      first.sourceType === "installment" ? "installment" : "invoice";
    const phoneFirst = arr.find(
      (l: any) => String(l.itemType || "") === "phone",
    );
    const primaryLine = phoneFirst || arr[0] || {};
    const cleanItemName = String(primaryLine.productName || "—").trim() || "—";
    const extraItemsCount = Math.max(0, arr.length - 1);
    const itemsSummary =
      extraItemsCount > 0
        ? `${cleanItemName} + ${formatExactNumberText(extraItemsCount)} قلم دیگر`
        : cleanItemName;
    const doc: RealizedProfitDoc = {
      docKey,
      sourceType,
      paymentType:
        first.paymentType === "installment"
          ? "installment"
          : first.paymentType === "credit"
            ? "credit"
            : "cash",
      orderId: Number(first.orderId || 0),
      customerId: first.customerId == null ? null : Number(first.customerId),
      customerName: first.customerName || null,
      transactionDate: String(first.transactionDate || ""),
      contractualTotal,
      contractualCost,
      receivedInRange: 0,
      actualSalePrice: Number(first.actualSalePrice || contractualTotal || 0),
      primaryItemName: cleanItemName,
      itemsSummary,
      itemsCount: arr.length,
      detailHref:
        sourceType === "installment"
          ? `/installment-sales/${Number(first.orderId || 0)}`
          : `/invoices/${Number(first.orderId || 0)}`,
      detailLabel:
        sourceType === "installment" ? "مشاهده وضعیت اقساط" : "مشاهده فاکتور",
    };
    if (
      doc.paymentType === "cash" &&
      isDateInRange(doc.transactionDate, fromDate, toDate)
    ) {
      doc.receivedInRange = contractualTotal;
    }
    if (
      doc.paymentType === "installment" &&
      isDateInRange(doc.transactionDate, fromDate, toDate)
    ) {
      const actualSalePrice = Number(
        doc.actualSalePrice || contractualTotal || 0,
      );
      const downPayment = Math.max(0, Number(first.downPayment || 0));
      doc.receivedInRange += actualSalePrice > 0
        ? allocateReportAmountShare(downPayment, contractualTotal, actualSalePrice)
        : Math.min(downPayment, contractualTotal);
    }
    docs.set(docKey, doc);
  }

  const invoiceDocsById = new Map<number, RealizedProfitDoc>();
  const installmentDocsById = new Map<number, RealizedProfitDoc>();
  for (const doc of docs.values()) {
    if (doc.sourceType === "invoice") invoiceDocsById.set(doc.orderId, doc);
    if (doc.sourceType === "installment")
      installmentDocsById.set(doc.orderId, doc);
  }

  const creditReceipts = await readAll(
    `SELECT cl.id, cl.customerId, cl.transactionDate, COALESCE(cl.credit,0) AS amount, cl.description, cl.referenceType, cl.referenceId,
            CASE
              WHEN LOWER(COALESCE(cl.referenceType,'')) = 'installment_check_cashed'
              THEN (SELECT ic.saleId FROM installment_checks ic WHERE ic.id = cl.referenceId LIMIT 1)
              ELSE NULL
            END AS installmentSaleId
       FROM customer_ledger cl
      WHERE cl.customerId IS NOT NULL
        AND COALESCE(cl.credit,0) > 0
        AND COALESCE(cl.debit,0) = 0
        AND LOWER(COALESCE(cl.referenceType,'')) NOT IN (
          'installment_payment_tx',
          'installment_cancellation_reversal',
          'installment_cancellation_downpayment_refund_due'
        )
        AND NOT (
          LOWER(COALESCE(cl.referenceType,'')) = 'installment_check_cashed'
          AND EXISTS (
            SELECT 1
              FROM installment_checks ic_cancel
              JOIN installment_sales ins_cancel ON ins_cancel.id = ic_cancel.saleId
             WHERE ic_cancel.id = cl.referenceId
               AND COALESCE(ins_cancel.status,'active') <> 'active'
          )
        )
        AND date(cl.transactionDate) BETWEEN date(?) AND date(?)
      ORDER BY datetime(cl.transactionDate) ASC, cl.id ASC`,
    [fromDate, toDate],
  );

  let unlinkedCreditReceipts = 0;
  for (const receipt of creditReceipts as any[]) {
    const amount = Math.max(0, Number(receipt.amount || 0));
    if (amount <= 0) continue;
    const refType = String(receipt.referenceType || "")
      .trim()
      .toLowerCase();
    const refId = Number(receipt.referenceId || 0);
    const desc = String(receipt.description || "");
    const parsedInvoiceId =
      refId > 0
        ? refId
        : Number(
            desc.match(
              /(?:فاکتور(?:\s*فروش)?|invoice)\s*(?:شماره|#)?\s*(\d+)/i,
            )?.[1] || 0,
          );
    const isDirectInvoiceRef =
      refType === "sales_order_receipt" ||
      refType === "sales_order_payment" ||
      (!refType && parsedInvoiceId > 0);

    if (refType === "installment_check_cashed") {
      const installmentDoc = installmentDocsById.get(
        Number(receipt.installmentSaleId || 0),
      );
      if (
        !installmentDoc ||
        Number(installmentDoc.customerId || 0) !== Number(receipt.customerId || 0)
      ) {
        unlinkedCreditReceipts += amount;
        continue;
      }
      const actualSalePrice = Number(
        installmentDoc.actualSalePrice || installmentDoc.contractualTotal || 0,
      );
      const allocRaw = actualSalePrice > 0
        ? allocateReportAmountShare(
            amount,
            Number(installmentDoc.contractualTotal || 0),
            actualSalePrice,
          )
        : amount;
      const outstanding = Math.max(
        0,
        Number(installmentDoc.contractualTotal || 0) -
          Number(installmentDoc.receivedInRange || 0),
      );
      installmentDoc.receivedInRange += Math.min(
        outstanding,
        Math.max(0, allocRaw),
      );
      continue;
    }

    const doc = isDirectInvoiceRef
      ? invoiceDocsById.get(parsedInvoiceId)
      : null;
    if (
      !doc ||
      doc.paymentType !== "credit" ||
      Number(doc.customerId || 0) !== Number(receipt.customerId || 0)
    ) {
      unlinkedCreditReceipts += amount;
      continue;
    }
    const outstanding = Math.max(
      0,
      Number(doc.contractualTotal || 0) - Number(doc.receivedInRange || 0),
    );
    const alloc = Math.min(outstanding, amount);
    doc.receivedInRange += alloc;
    if (amount > alloc) unlinkedCreditReceipts += amount - alloc;
  }

  const installmentReceipts = await readAll(
    `SELECT ins.id AS saleId, it.id AS txId, it.payment_date AS paymentDate, COALESCE(it.amount_paid,0) AS amountPaid
       FROM installment_transactions it
       JOIN installment_payments ip ON ip.id = it.installment_payment_id
       JOIN installment_sales ins ON ins.id = ip.saleId
      WHERE COALESCE(ins.status,'active') = 'active'
        AND date(it.payment_date) BETWEEN date(?) AND date(?)
      ORDER BY datetime(it.payment_date) ASC, it.id ASC`,
    [fromDate, toDate],
  );

  for (const tx of installmentReceipts as any[]) {
    const doc = installmentDocsById.get(Number(tx.saleId));
    if (!doc) continue;
    const actualSalePrice = Number(
      doc.actualSalePrice || doc.contractualTotal || 0,
    );
    const raw = Math.max(0, Number(tx.amountPaid || 0));
    const allocRaw = actualSalePrice > 0
      ? allocateReportAmountShare(raw, Number(doc.contractualTotal || 0), actualSalePrice)
      : raw;
    const outstanding = Math.max(
      0,
      Number(doc.contractualTotal || 0) - Number(doc.receivedInRange || 0),
    );
    doc.receivedInRange += Math.min(outstanding, allocRaw);
  }

  // Legacy fallback: older databases may contain a cashed check without the
  // dedicated installment_check_cashed ledger row. Count only its unrecovered
  // remainder, and never double-count cash-recovery transactions. New records
  // use the real ledger receipt date above.
  const legacyPassedChecks = await readAll(
    `SELECT ic.saleId, ic.id AS checkId, ic.dueDate, COALESCE(ic.amount,0) AS amount, ic.status,
            COALESCE((
              SELECT SUM(it.amount_paid)
                FROM installment_payments ip
                JOIN installment_transactions it ON it.installment_payment_id = ip.id
               WHERE ip.sourceType = 'check_recovery' AND ip.sourceId = ic.id
            ),0) AS recoveredAmount
       FROM installment_checks ic
      WHERE COALESCE(ic.amount,0) > 0
        AND NOT EXISTS (
          SELECT 1 FROM customer_ledger cl
           WHERE cl.referenceType = 'installment_check_cashed'
             AND cl.referenceId = ic.id
        )`,
    [],
  ).catch(() => []);

  for (const check of legacyPassedChecks as any[]) {
    if (!isPassedInstallmentCheckStatus(check.status)) continue;
    if (!isRealizedProfitReportDateInRange(check.dueDate, fromDate, toDate))
      continue;
    const doc = installmentDocsById.get(Number(check.saleId));
    if (!doc) continue;
    const actualSalePrice = Number(
      doc.actualSalePrice || doc.contractualTotal || 0,
    );
    const raw = Math.max(
      0,
      Number(check.amount || 0) - Math.max(0, Number(check.recoveredAmount || 0)),
    );
    const allocRaw = actualSalePrice > 0
      ? allocateReportAmountShare(raw, Number(doc.contractualTotal || 0), actualSalePrice)
      : raw;
    const outstanding = Math.max(
      0,
      Number(doc.contractualTotal || 0) - Number(doc.receivedInRange || 0),
    );
    doc.receivedInRange += Math.min(outstanding, Math.max(0, allocRaw));
  }

  // A period report must only contain documents that were created in the
  // requested range or had a real collection inside it. Older untouched
  // contracts remain outside the period instead of inflating its denominator.
  const activeDocKeys = new Set(
    Array.from(docs.entries())
      .filter(([, doc]) =>
        isDateInRange(doc.transactionDate, fromDate, toDate) ||
        Number(doc.receivedInRange || 0) > 0,
      )
      .map(([docKey]) => docKey),
  );

  const periodDocKeys = new Set(
    Array.from(docs.entries())
      .filter(([, doc]) => isDateInRange(doc.transactionDate, fromDate, toDate))
      .map(([docKey]) => docKey),
  );

  const summary: any = {
    contractualRevenue: 0,
    contractualCost: 0,
    fullProfit: 0,
    realizedRevenue: 0,
    realizedCost: 0,
    realizedProfit: 0,
    unrecognizedProfit: 0,
    collectionRate: 0,
    rowsCount: 0,
    docsCount: 0,
    unlinkedCreditReceipts,
    byPaymentType: {
      cash: {
        contractualRevenue: 0,
        realizedRevenue: 0,
        realizedProfit: 0,
        fullProfit: 0,
      },
      credit: {
        contractualRevenue: 0,
        realizedRevenue: 0,
        realizedProfit: 0,
        fullProfit: 0,
      },
      installment: {
        contractualRevenue: 0,
        realizedRevenue: 0,
        realizedProfit: 0,
        fullProfit: 0,
      },
    },
    byItemType: {},
    managementBuckets: {
      accessories: {
        realizedRevenue: 0,
        realizedProfit: 0,
        fullProfit: 0,
        rowsCount: 0,
      },
      cashPhone: {
        realizedRevenue: 0,
        realizedProfit: 0,
        fullProfit: 0,
        rowsCount: 0,
      },
      installmentPhone: {
        realizedRevenue: 0,
        realizedProfit: 0,
        fullProfit: 0,
        rowsCount: 0,
      },
      credit: {
        realizedRevenue: 0,
        realizedProfit: 0,
        fullProfit: 0,
        rowsCount: 0,
      },
    },
  };

  for (const [docKey, doc] of docs.entries()) {
    if (!activeDocKeys.has(docKey)) continue;
    const total = Number(doc.contractualTotal || 0);
    const cost = Number(doc.contractualCost || 0);
    const recognition = calculateCostRecoveryRecognition(
      total,
      cost,
      Number(doc.receivedInRange || 0),
    );
    doc.receivedInRange = recognition.received;
    doc.collectionRate = recognition.collectionRate;
    doc.totalProfit = recognition.fullProfit;
    doc.realizedProfit = recognition.realizedProfit;
    doc.unrecognizedProfit = recognition.unrecognizedProfit;

    const bucket =
      summary.byPaymentType[doc.paymentType] || summary.byPaymentType.cash;
    bucket.contractualRevenue += total;
    bucket.realizedRevenue += recognition.received;
    bucket.fullProfit += recognition.fullProfit;
    bucket.realizedProfit += recognition.realizedProfit;

    summary.contractualRevenue += total;
    summary.contractualCost += cost;
    summary.fullProfit += recognition.fullProfit;
    summary.realizedRevenue += recognition.received;
    summary.realizedCost += recognition.realizedCost;
    summary.realizedProfit += recognition.realizedProfit;
    summary.unrecognizedProfit += recognition.unrecognizedProfit;
    summary.docsCount += 1;
  }
  summary.collectionRate =
    summary.contractualRevenue > 0
      ? (summary.realizedRevenue / summary.contractualRevenue) * 100
      : 0;

  for (const [docKey, docLines] of docsLines.entries()) {
    if (!activeDocKeys.has(docKey)) continue;
    const doc = docs.get(String(docKey));
    if (!doc) continue;
    const ratio =
      Number(doc.contractualTotal || 0) > 0
        ? clamp01(
            Number(doc.receivedInRange || 0) /
              Number(doc.contractualTotal || 0),
          )
        : 0;
    const lineTotals = docLines.map((line: any) => Math.max(0, Number(line.lineTotal || 0)));
    const receivedAllocations = allocateReportAmountByWeights(
      Number(doc.receivedInRange || 0),
      lineTotals,
    );
    const realizedProfitValue = Number(doc.realizedProfit || 0);
    const realizedProfitWeights = docLines.map((line: any) => {
      const fullProfit = Number(line.lineTotal || 0) - Number(line.lineCost || 0);
      return realizedProfitValue >= 0
        ? Math.max(0, fullProfit)
        : Math.abs(Math.min(0, fullProfit));
    });
    const realizedProfitAllocations = allocateReportAmountByWeights(
      realizedProfitValue,
      realizedProfitWeights.some((value) => value > 0) ? realizedProfitWeights : lineTotals,
    );

    for (const [lineIndex, line] of (docLines as any[]).entries()) {
      const lineTotal = Number(line.lineTotal || 0);
      const lineCost = Number(line.lineCost || 0);
      const lineOriginalCost = Number(line.lineOriginalCost || lineCost || 0);
      const receivedAmount = receivedAllocations[lineIndex] || 0;
      const fullProfit = lineTotal - lineCost;
      const expectedFullProfit = lineTotal - lineOriginalCost;
      const expectedRecognition = calculateCostRecoveryRecognition(
        lineTotal,
        lineOriginalCost,
        receivedAmount,
      );
      const realizedProfit = realizedProfitAllocations[lineIndex] || 0;
      const realizedCost = receivedAmount - realizedProfit;
      line.paymentType = doc.paymentType;
      line.receivedAmount = receivedAmount;
      line.realizedCost = realizedCost;
      line.fullProfit = fullProfit;
      line.expectedFullProfit = expectedFullProfit;
      line.expectedRealizedProfit = expectedRecognition.realizedProfit;
      line.costDelta = lineCost - lineOriginalCost;
      line.realizedProfit = realizedProfit;
      line.unrecognizedProfit = fullProfit - realizedProfit;
      line.collectionRate = ratio * 100;

      const itemType = String(line.itemType || "unknown");
      summary.byItemType[itemType] = summary.byItemType[itemType] || {
        contractualRevenue: 0,
        realizedRevenue: 0,
        fullProfit: 0,
        realizedProfit: 0,
        rowsCount: 0,
      };
      summary.byItemType[itemType].contractualRevenue += lineTotal;
      summary.byItemType[itemType].realizedRevenue += receivedAmount;
      summary.byItemType[itemType].fullProfit += fullProfit;
      summary.byItemType[itemType].realizedProfit += realizedProfit;
      summary.byItemType[itemType].rowsCount += 1;

      // These four manager-facing buckets are deliberately mutually exclusive.
      // Credit always wins as a payment category; the remaining rows are split
      // into phone cash, phone installment, and non-phone accessories/services.
      const managementBucketKey =
        String(doc.paymentType || "") === "credit"
          ? "credit"
          : itemType === "phone" && String(doc.paymentType || "") === "installment"
            ? "installmentPhone"
            : itemType === "phone"
              ? "cashPhone"
              : "accessories";
      const managementBucket = summary.managementBuckets[managementBucketKey];
      managementBucket.realizedRevenue += receivedAmount;
      managementBucket.realizedProfit += realizedProfit;
      managementBucket.fullProfit += fullProfit;
      managementBucket.rowsCount += 1;
      summary.rowsCount += 1;
    }
  }

  const buildScopedSummary = (scopeKeys: Set<string>) => {
    const scoped: any = {
      contractualRevenue: 0,
      contractualCost: 0,
      fullProfit: 0,
      realizedRevenue: 0,
      realizedCost: 0,
      realizedProfit: 0,
      unrecognizedProfit: 0,
      collectionRate: 0,
      rowsCount: 0,
      docsCount: 0,
      unlinkedCreditReceipts: 0,
      byPaymentType: {
        cash: { contractualRevenue: 0, realizedRevenue: 0, realizedProfit: 0, fullProfit: 0 },
        credit: { contractualRevenue: 0, realizedRevenue: 0, realizedProfit: 0, fullProfit: 0 },
        installment: { contractualRevenue: 0, realizedRevenue: 0, realizedProfit: 0, fullProfit: 0 },
      },
      byItemType: {},
      managementBuckets: {
        accessories: { realizedRevenue: 0, realizedProfit: 0, fullProfit: 0, rowsCount: 0 },
        cashPhone: { realizedRevenue: 0, realizedProfit: 0, fullProfit: 0, rowsCount: 0 },
        installmentPhone: { realizedRevenue: 0, realizedProfit: 0, fullProfit: 0, rowsCount: 0 },
        credit: { realizedRevenue: 0, realizedProfit: 0, fullProfit: 0, rowsCount: 0 },
      },
    };

    for (const [docKey, doc] of docs.entries()) {
      if (!scopeKeys.has(docKey)) continue;
      const total = Number(doc.contractualTotal || 0);
      const cost = Number(doc.contractualCost || 0);
      const received = Number(doc.receivedInRange || 0);
      const realizedProfit = Number(doc.realizedProfit || 0);
      const fullProfit = Number(doc.totalProfit || 0);
      const paymentBucket = scoped.byPaymentType[doc.paymentType] || scoped.byPaymentType.cash;
      paymentBucket.contractualRevenue += total;
      paymentBucket.realizedRevenue += received;
      paymentBucket.realizedProfit += realizedProfit;
      paymentBucket.fullProfit += fullProfit;
      scoped.contractualRevenue += total;
      scoped.contractualCost += cost;
      scoped.fullProfit += fullProfit;
      scoped.realizedRevenue += received;
      scoped.realizedCost += received - realizedProfit;
      scoped.realizedProfit += realizedProfit;
      scoped.unrecognizedProfit += Number(doc.unrecognizedProfit || 0);
      scoped.docsCount += 1;
    }

    for (const [docKey, scopedLines] of docsLines.entries()) {
      if (!scopeKeys.has(docKey)) continue;
      const doc = docs.get(docKey);
      if (!doc) continue;
      for (const line of scopedLines as any[]) {
        const itemType = String(line.itemType || 'unknown');
        const lineTotal = Number(line.lineTotal || 0);
        const receivedAmount = Number(line.receivedAmount || 0);
        const fullProfit = Number(line.fullProfit || 0);
        const realizedProfit = Number(line.realizedProfit || 0);
        scoped.byItemType[itemType] = scoped.byItemType[itemType] || {
          contractualRevenue: 0, realizedRevenue: 0, fullProfit: 0, realizedProfit: 0, rowsCount: 0,
        };
        scoped.byItemType[itemType].contractualRevenue += lineTotal;
        scoped.byItemType[itemType].realizedRevenue += receivedAmount;
        scoped.byItemType[itemType].fullProfit += fullProfit;
        scoped.byItemType[itemType].realizedProfit += realizedProfit;
        scoped.byItemType[itemType].rowsCount += 1;

        const managementBucketKey =
          String(doc.paymentType || '') === 'credit'
            ? 'credit'
            : itemType === 'phone' && String(doc.paymentType || '') === 'installment'
              ? 'installmentPhone'
              : itemType === 'phone'
                ? 'cashPhone'
                : 'accessories';
        const managementBucket = scoped.managementBuckets[managementBucketKey];
        managementBucket.realizedRevenue += receivedAmount;
        managementBucket.realizedProfit += realizedProfit;
        managementBucket.fullProfit += fullProfit;
        managementBucket.rowsCount += 1;
        scoped.rowsCount += 1;
      }
    }

    scoped.collectionRate = scoped.contractualRevenue > 0
      ? (scoped.realizedRevenue / scoped.contractualRevenue) * 100
      : 0;
    return scoped;
  };

  const periodSummary = buildScopedSummary(periodDocKeys);

  const byDayMap = new Map<string, any>();
  for (const [docKey, doc] of docs.entries()) {
    if (!activeDocKeys.has(docKey)) continue;
    const day = String(doc.transactionDate || "").slice(0, 10);
    if (!day) continue;
    const cur = byDayMap.get(day) || {
      day,
      contractualRevenue: 0,
      realizedRevenue: 0,
      realizedProfit: 0,
    };
    cur.contractualRevenue += Number(doc.contractualTotal || 0);
    cur.realizedRevenue += Number(doc.receivedInRange || 0);
    cur.realizedProfit += Number(doc.realizedProfit || 0);
    byDayMap.set(day, cur);
  }

  return {
    dataSource: "sqlite-business-records",
    sourceTables: [
      "sales_orders",
      "sales_order_items",
      "installment_sales",
      "installment_sale_items",
      "customer_ledger",
      "installment_transactions",
      "installment_checks",
    ],
    generatedAt: new Date().toISOString(),
    range: { fromISO: fromDate, toISO: toDate },
    summary,
    periodSummary,
    docs: Array.from(docs.entries()).filter(([docKey]) => activeDocKeys.has(docKey)).map(([, doc]) => doc).sort(
      (a, b) =>
        String(b.transactionDate).localeCompare(String(a.transactionDate)) ||
        Number(b.orderId) - Number(a.orderId),
    ),
    rows: (lines as any[]).filter((line) => activeDocKeys.has(String(line.docKey || ""))).sort(
      (a, b) =>
        String(b.transactionDate).localeCompare(String(a.transactionDate)) ||
        Number(b.orderId) - Number(a.orderId),
    ),
    byDay: Array.from(byDayMap.values()).sort((a, b) =>
      String(a.day).localeCompare(String(b.day)),
    ),
    audit: {
      recognitionBasis:
        "proportional collection: realized profit follows the exact collected share of each contract; cash sales recognize fully when fully received",
      costRecognition:
        "proportional COGS = collected revenue minus proportionally recognized profit; phone cost fallback uses currentPurchasePrice before original purchasePrice whenever day-of-sale/current purchase price is registered",
      creditReceiptLink:
        "customer_ledger.referenceType/referenceId or invoice number parsed from description",
      installmentReceiptLink:
        "down payment + installment_transactions + passed/non-guarantee installment_checks + check recovery transactions",
      managementBucketClassification:
        "mutually exclusive: credit payment first; otherwise phone installment, phone cash, or non-phone accessories/services",
      periodSummaryScope:
        "contracts created inside the selected range only; collection-activity summary keeps older contracts that received money inside the range",
      generatedAt: new Date().toISOString(),
    },
  };
}
