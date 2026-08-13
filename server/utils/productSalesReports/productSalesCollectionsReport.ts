import moment from "jalali-moment";
import { allAsync, getAsync, fromShamsiStringToISO } from "../../database";

import {
  allocateReportAmountByWeights,
  allocateReportAmountShare,
  buildDiscountAwareInvoiceLines,
  clamp01,
  getProductSalesDocKey,
} from "./productSalesSharedCore";
import { calculateProportionalProfitRecognition } from './productSalesRealizedProfitReport';

const collectionCenterToShamsiDisplay = (value: unknown): string => {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const normalized = raw
    .replace(/[۰-۹]/g, (digit) =>
      String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)),
    )
    .replace(/[٠-٩]/g, (digit) =>
      String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)),
    );
  const jalaliInput = normalized.slice(0, 10).replace(/-/g, "/");
  if (/^1[34]\d{2}\/\d{1,2}\/\d{1,2}$/.test(jalaliInput)) {
    const jalali = moment(jalaliInput, "jYYYY/jMM/jDD", true);
    return jalali.isValid()
      ? jalali.locale("fa").format("jYYYY/jMM/jDD")
      : "";
  }

  const gregorian = moment(
    normalized,
    [moment.ISO_8601, "YYYY-MM-DD", "YYYY/MM/DD"],
    true,
  );
  return gregorian.isValid()
    ? gregorian.locale("fa").format("jYYYY/jMM/jDD")
    : "";
};

export async function buildProductSalesCollectionsReport(
  fromISO: string,
  toISO: string,
) {
  const invoiceAllLinesRaw = await allAsync(
    `SELECT
        'invoice' AS sourceType,
        so.id AS orderId,
        so.customerId,
        c.fullName AS customerName,
        so.paymentMethod,
        so.transactionDate,
        COALESCE(so.discount, 0) AS orderDiscount,
        soi.itemType,
        soi.itemId AS productId,
        COALESCE(CASE WHEN soi.itemType='service' THEN sv.name WHEN soi.itemType='inventory' THEN p.name ELSE ph.model END, soi.description, '—') AS productName,
        COALESCE(soi.quantity,0) AS quantity,
        COALESCE(soi.unitPrice,0) AS unitPrice,
        COALESCE(soi.discountPerItem,0) AS discountPerItem,
        ((COALESCE(soi.quantity,0) * COALESCE(soi.unitPrice,0)) - COALESCE(soi.discountPerItem,0)) AS lineTotal,
        CASE WHEN soi.itemType='inventory' THEN COALESCE(NULLIF(soi.buyPrice,0), p.purchasePrice,0) * COALESCE(soi.quantity,0) ELSE 0 END AS lineCost
      FROM sales_orders so
      JOIN sales_order_items soi ON so.id = soi.orderId
      LEFT JOIN products p ON soi.itemType='inventory' AND p.id = soi.itemId
      LEFT JOIN services sv ON soi.itemType='service' AND sv.id = soi.itemId
      LEFT JOIN phones ph ON soi.itemType='phone' AND ph.id = soi.itemId
      LEFT JOIN customers c ON c.id = so.customerId
     WHERE soi.itemType IN ('inventory','service','phone')
       AND (so.status IS NULL OR so.status = 'active')
       AND date(so.transactionDate) BETWEEN date(?) AND date(?)
     ORDER BY date(so.transactionDate) ASC, so.id ASC, soi.id ASC`,
    [fromISO, toISO],
  );

  const invoiceLinesRaw = buildDiscountAwareInvoiceLines(
    invoiceAllLinesRaw as any[],
  ).filter(
    (row: any) => row.itemType === "inventory" || row.itemType === "service",
  );

  const invoiceDocsByOrder = new Map<number, any>();
  for (const line of invoiceLinesRaw as any[]) {
    const orderId = Number(line.orderId || 0);
    if (!orderId) continue;
    const doc = invoiceDocsByOrder.get(orderId) || {
      orderId,
      customerId: line.customerId,
      paymentMethod: line.paymentMethod,
      transactionDate: line.transactionDate,
      nonPhoneTotal: 0,
      nonPhoneCost: 0,
    };
    doc.nonPhoneTotal += Number(line.lineTotal || 0);
    doc.nonPhoneCost += Number(line.lineCost || 0);
    invoiceDocsByOrder.set(orderId, doc);
  }
  const invoiceDocsRaw = Array.from(invoiceDocsByOrder.values());

  const installmentDocsRaw = await allAsync(
    `SELECT
        ins.id AS orderId,
        ins.customerId,
        COALESCE(ins.actualSalePrice,0) AS actualSalePrice,
        COALESCE(ins.downPayment,0) AS downPayment,
        COALESCE(ins.saleDateISO, ins.dateCreated) AS transactionDate,
        COALESCE(SUM(COALESCE(isi.totalPrice,0)),0) AS nonPhoneTotal,
        COALESCE(SUM(CASE WHEN isi.itemType='inventory' THEN COALESCE(NULLIF(isi.buyPrice,0), p.purchasePrice,0) * COALESCE(isi.quantity,0) ELSE 0 END),0) AS nonPhoneCost
      FROM installment_sales ins
      JOIN installment_sale_items isi ON ins.id = isi.saleId
      LEFT JOIN products p ON isi.itemType='inventory' AND p.id = isi.itemId
     WHERE COALESCE(ins.status,'active') = 'active'
       AND isi.itemType IN ('inventory','service')
       AND date(COALESCE(ins.saleDateISO, ins.dateCreated)) BETWEEN date(?) AND date(?)
     GROUP BY ins.id, ins.customerId, ins.actualSalePrice, ins.downPayment, COALESCE(ins.saleDateISO, ins.dateCreated)`,
    [fromISO, toISO],
  );

  const installmentLinesRaw = await allAsync(
    `SELECT
        'installment' AS sourceType,
        ins.id AS orderId,
        ins.customerId,
        c.fullName AS customerName,
        'installment' AS paymentMethod,
        COALESCE(ins.saleDateISO, ins.dateCreated) AS transactionDate,
        isi.itemType,
        isi.itemId AS productId,
        COALESCE(CASE WHEN isi.itemType='service' THEN sv.name ELSE p.name END, isi.description, '—') AS productName,
        COALESCE(isi.quantity,0) AS quantity,
        COALESCE(isi.unitPrice,0) AS unitPrice,
        0 AS discountPerItem,
        COALESCE(isi.totalPrice,0) AS lineTotal,
        CASE WHEN isi.itemType='inventory' THEN COALESCE(NULLIF(isi.buyPrice,0), p.purchasePrice,0) * COALESCE(isi.quantity,0) ELSE 0 END AS lineCost
      FROM installment_sales ins
      JOIN installment_sale_items isi ON ins.id = isi.saleId
      LEFT JOIN products p ON isi.itemType='inventory' AND p.id = isi.itemId
      LEFT JOIN services sv ON isi.itemType='service' AND sv.id = isi.itemId
      LEFT JOIN customers c ON c.id = ins.customerId
     WHERE COALESCE(ins.status,'active') = 'active'
       AND isi.itemType IN ('inventory','service')
       AND date(COALESCE(ins.saleDateISO, ins.dateCreated)) BETWEEN date(?) AND date(?)
     ORDER BY date(COALESCE(ins.saleDateISO, ins.dateCreated)) ASC, ins.id ASC, isi.id ASC`,
    [fromISO, toISO],
  );

  const customerReceipts = await allAsync(
    `SELECT cl.id, cl.customerId, cl.transactionDate, COALESCE(cl.credit,0) AS amount, cl.description,
            cl.referenceType, cl.referenceId,
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
    [fromISO, toISO],
  );

  const installmentReceiptRows = await allAsync(
    `SELECT
        ins.id AS saleId,
        it.id AS txId,
        it.payment_date AS paymentDate,
        COALESCE(it.amount_paid,0) AS amountPaid
      FROM installment_transactions it
      JOIN installment_payments ip ON ip.id = it.installment_payment_id
      JOIN installment_sales ins ON ins.id = ip.saleId
     WHERE COALESCE(ins.status,'active') = 'active'
       AND date(it.payment_date) BETWEEN date(?) AND date(?)
     ORDER BY datetime(it.payment_date) ASC, it.id ASC`,
    [fromISO, toISO],
  );

  const docs = new Map<string, any>();
  const invoiceDocsById = new Map<number, any>();
  for (const row of invoiceDocsRaw as any[]) {
    const total = Number(row.nonPhoneTotal || 0);
    if (total <= 0) continue;
    const doc = {
      sourceType: "invoice",
      paymentType:
        String(row.paymentMethod || "cash").toLowerCase() === "credit"
          ? "credit"
          : "cash",
      orderId: Number(row.orderId),
      customerId: row.customerId == null ? null : Number(row.customerId),
      transactionDate:
        collectionCenterToShamsiDisplay(row.transactionDate) ||
        String(row.transactionDate || ""),
      contractualTotal: total,
      contractualCost: Number(row.nonPhoneCost || 0),
      receivedInRange:
        String(row.paymentMethod || "cash").toLowerCase() === "credit"
          ? 0
          : total,
      realizedProfitInRange: 0,
    };
    docs.set(getProductSalesDocKey("invoice", Number(row.orderId)), doc);
    invoiceDocsById.set(Number(row.orderId), doc);
  }
  for (const row of installmentDocsRaw as any[]) {
    const total = Number(row.nonPhoneTotal || 0);
    if (total <= 0) continue;
    const actualSalePrice = Number(row.actualSalePrice || 0);
    const downPayment = Number(row.downPayment || 0);
    const nonPhoneShare = actualSalePrice > 0
      ? Math.min(total, allocateReportAmountShare(downPayment, total, actualSalePrice))
      : Math.min(total, downPayment);
    const doc = {
      sourceType: "installment",
      paymentType: "installment",
      orderId: Number(row.orderId),
      customerId: row.customerId == null ? null : Number(row.customerId),
      transactionDate: String(row.transactionDate || ""),
      contractualTotal: total,
      contractualCost: Number(row.nonPhoneCost || 0),
      receivedInRange: Math.max(0, nonPhoneShare),
      realizedProfitInRange: 0,
      actualSalePrice,
    };
    docs.set(getProductSalesDocKey("installment", Number(row.orderId)), doc);
  }

  const lines = [
    ...(invoiceLinesRaw as any[]),
    ...(installmentLinesRaw as any[]),
  ].map((row: any, idx: number) => ({
    rowId: idx + 1,
    sourceType:
      String(row.sourceType || "invoice") === "installment"
        ? "installment"
        : "invoice",
    docKey: getProductSalesDocKey(
      String(row.sourceType || "invoice") === "installment"
        ? "installment"
        : "invoice",
      Number(row.orderId),
    ),
    paymentType:
      String(row.paymentMethod || "cash").toLowerCase() === "installment"
        ? "installment"
        : String(row.paymentMethod || "cash").toLowerCase() === "credit"
          ? "credit"
          : "cash",
    orderId: Number(row.orderId),
    customerId: row.customerId == null ? null : Number(row.customerId),
    customerName:
      row.customerName == null ? null : String(row.customerName || ""),
    transactionDate: String(row.transactionDate || ""),
    itemType: row.itemType === "service" ? "service" : "inventory",
    productId: Number(row.productId || 0),
    productName: String(row.productName || "—"),
    quantity: Number(row.quantity || 0),
    unitPrice: Number(row.unitPrice || 0),
    discountPerItem: Number(row.discountPerItem || 0),
    orderDiscount: Number(row.orderDiscount || 0),
    invoiceDiscountBase: Number(
      row.invoiceDiscountBase ||
        row.lineTotalBeforeGlobalDiscount ||
        row.originalLineTotal ||
        row.lineTotal ||
        0,
    ),
    lineTotalBeforeGlobalDiscount: Number(
      row.lineTotalBeforeGlobalDiscount ||
        row.originalLineTotal ||
        row.lineTotal ||
        0,
    ),
    globalDiscountShare: Number(row.globalDiscountShare || 0),
    totalDiscountAmount: Number(
      row.totalDiscountAmount ?? row.discountPerItem ?? 0,
    ),
    originalLineTotal: Number(row.originalLineTotal ?? row.lineTotal ?? 0),
    lineTotal: Number(row.lineTotal || 0),
    lineCost: Number(row.lineCost || 0),
    receivedAmount: 0,
    collectionRate: 0,
    fullProfit: 0,
    realizedProfit: 0,
    unrecognizedProfit: 0,
  }));

  const orderLines = new Map<string, any[]>();
  for (const line of lines) {
    const arr = orderLines.get(String(line.docKey)) || [];
    arr.push(line);
    orderLines.set(String(line.docKey), arr);
  }

  const installmentDocsById = new Map<number, any>();
  for (const doc of docs.values()) {
    if (doc.paymentType === "installment")
      installmentDocsById.set(Number(doc.orderId), doc);
  }

  let unlinkedCreditReceipts = 0;
  for (const receipt of customerReceipts as any[]) {
    const amount = Math.max(0, Number(receipt.amount || 0));
    const customerId = Number(receipt.customerId || 0);
    if (!customerId || amount <= 0) continue;

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
        Number(installmentDoc.customerId || 0) !== customerId
      ) {
        unlinkedCreditReceipts += amount;
        continue;
      }
      const actualSalePrice = Number(installmentDoc.actualSalePrice || 0);
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

    if (!isDirectInvoiceRef || parsedInvoiceId <= 0) {
      unlinkedCreditReceipts += amount;
      continue;
    }

    const directDoc = invoiceDocsById.get(parsedInvoiceId);
    if (
      !directDoc ||
      directDoc.paymentType !== "credit" ||
      Number(directDoc.customerId || 0) !== customerId
    ) {
      unlinkedCreditReceipts += amount;
      continue;
    }

    const outstanding = Math.max(
      0,
      Number(directDoc.contractualTotal || 0) -
        Number(directDoc.receivedInRange || 0),
    );
    if (outstanding <= 0) {
      unlinkedCreditReceipts += amount;
      continue;
    }

    const alloc = Math.min(outstanding, amount);
    directDoc.receivedInRange += alloc;
    if (amount > alloc) unlinkedCreditReceipts += amount - alloc;
  }

  for (const tx of installmentReceiptRows as any[]) {
    const doc = installmentDocsById.get(Number(tx.saleId));
    if (!doc) continue;
    const actualSalePrice = Number(doc.actualSalePrice || 0);
    const allocBase = Number(tx.amountPaid || 0);
    const allocRaw = actualSalePrice > 0
      ? allocateReportAmountShare(allocBase, Number(doc.contractualTotal || 0), actualSalePrice)
      : allocBase;
    const outstanding = Math.max(
      0,
      Number(doc.contractualTotal || 0) - Number(doc.receivedInRange || 0),
    );
    const alloc = Math.min(outstanding, Math.max(0, allocRaw));
    doc.receivedInRange += alloc;
  }

  const summary = {
    cashSales: 0,
    creditSales: 0,
    installmentSales: 0,
    cashReceived: 0,
    creditReceived: 0,
    installmentReceived: 0,
    contractualTotal: 0,
    receivedTotal: 0,
    totalProfit: 0,
    realizedProfit: 0,
    unrecognizedProfit: 0,
    rowsCount: 0,
    unlinkedCreditReceipts: 0,
  };
  summary.unlinkedCreditReceipts = unlinkedCreditReceipts;

  for (const doc of docs.values()) {
    const total = Number(doc.contractualTotal || 0);
    const cost = Number(doc.contractualCost || 0);
    const recognition = calculateProportionalProfitRecognition(
      total,
      cost,
      Number(doc.receivedInRange || 0),
    );
    const received = recognition.received;
    const totalProfit = recognition.fullProfit;
    const realizedProfit = recognition.realizedProfit;
    const unrecognizedProfit = recognition.unrecognizedProfit;
    doc.receivedInRange = received;
    doc.collectionRate = recognition.collectionRate;
    doc.totalProfit = totalProfit;
    doc.realizedProfitInRange = realizedProfit;
    doc.unrecognizedProfit = unrecognizedProfit;
    summary.contractualTotal += total;
    summary.receivedTotal += received;
    summary.totalProfit += totalProfit;
    summary.realizedProfit += realizedProfit;
    summary.unrecognizedProfit += unrecognizedProfit;
    if (doc.paymentType === "cash") {
      summary.cashSales += total;
      summary.cashReceived += received;
    } else if (doc.paymentType === "credit") {
      summary.creditSales += total;
      summary.creditReceived += received;
    } else {
      summary.installmentSales += total;
      summary.installmentReceived += received;
    }
  }

  const linesByDoc = new Map<string, any[]>();
  for (const line of lines) {
    const key = String(line.docKey || '');
    const group = linesByDoc.get(key) || [];
    group.push(line);
    linesByDoc.set(key, group);
  }

  for (const [docKey, docLines] of linesByDoc.entries()) {
    const doc = docs.get(docKey);
    if (!doc) continue;
    const total = Number(doc.contractualTotal || 0);
    const received = Number(doc.receivedInRange || 0);
    const docRatio = total > 0 ? clamp01(received / total) : 0;
    const lineTotals = docLines.map((line) => Math.max(0, Number(line.lineTotal || 0)));
    const receivedAllocations = allocateReportAmountByWeights(received, lineTotals);
    const fullProfitWeights = docLines.map((line) => Math.max(
      0,
      Number(line.lineTotal || 0) - Number(line.lineCost || 0),
    ));
    const docRealizedProfit = Number(doc.realizedProfitInRange || 0);
    const realizedProfitAllocations = allocateReportAmountByWeights(
      docRealizedProfit,
      fullProfitWeights.some((value) => value > 0) ? fullProfitWeights : lineTotals,
    );

    docLines.forEach((line, index) => {
      const lineTotal = Number(line.lineTotal || 0);
      const lineCost = Number(line.lineCost || 0);
      const fullProfit = lineTotal - lineCost;
      const receivedAmount = receivedAllocations[index] || 0;
      const realizedProfit = realizedProfitAllocations[index] || 0;
      line.receivedAmount = receivedAmount;
      line.collectionRate = docRatio * 100;
      line.fullProfit = fullProfit;
      line.realizedProfit = realizedProfit;
      line.unrecognizedProfit = fullProfit - realizedProfit;
      line.paymentType = doc.paymentType;
      summary.rowsCount += 1;
    });
  }

  const byDayMap = new Map<string, number>();
  for (const doc of docs.values()) {
    const day = String(doc.transactionDate || "").slice(0, 10);
    if (!day) continue;
    byDayMap.set(
      day,
      (byDayMap.get(day) || 0) + Number(doc.receivedInRange || 0),
    );
  }
  const byDay = Array.from(byDayMap.entries())
    .map(([day, total]) => ({ day, total }))
    .sort((a, b) => String(a.day).localeCompare(String(b.day)));

  return {
    summary,
    rows: lines.sort(
      (a, b) =>
        String(b.transactionDate).localeCompare(String(a.transactionDate)) ||
        Number(b.orderId) - Number(a.orderId),
    ),
    docs: Array.from(docs.values()).sort(
      (a, b) =>
        String(b.transactionDate).localeCompare(String(a.transactionDate)) ||
        Number(b.orderId) - Number(a.orderId),
    ),
    byDay,
  };
}
