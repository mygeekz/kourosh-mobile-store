import moment from "jalali-moment";
import { allAsync, getAsync, fromShamsiStringToISO } from "../../database";

import { getProductSalesDocKey, safeReportNumber } from './productSalesSharedCore';

export const PRODUCT_SALES_HEALTH_TOLERANCE = 1;
export const PRODUCT_SALES_HEALTH_ROUNDING_TOLERANCE = 1000;
export const healthAbsDiff = (a: any, b: any) =>
  Math.abs(Number(a || 0) - Number(b || 0));
export const healthSeverityForDiff = (diff: number) =>
  diff > PRODUCT_SALES_HEALTH_ROUNDING_TOLERANCE ? "error" : "warning";
export const productSalesHealthSourceLabel = (sourceType: any) =>
  String(sourceType || "invoice") === "installment" ? "اقساطی" : "فاکتور";

export function buildProductSalesCalculationHealth(
  rows: any[],
  docs: any[],
  allRowsForCompleteness?: any[],
) {
  const inputRows = Array.isArray(rows) ? rows : [];
  const completenessRows = Array.isArray(allRowsForCompleteness)
    ? allRowsForCompleteness
    : inputRows;
  const docMap = new Map<string, any>();
  for (const doc of docs || []) {
    const key = getProductSalesDocKey(
      String(doc?.sourceType || "invoice"),
      Number(doc?.orderId || 0),
    );
    if (key) docMap.set(key, doc);
  }

  const fullCountByDoc = new Map<string, number>();
  for (const row of completenessRows) {
    const key = String(
      row?.docKey ||
        getProductSalesDocKey(
          String(row?.sourceType || "invoice"),
          Number(row?.orderId || 0),
        ),
    );
    fullCountByDoc.set(key, (fullCountByDoc.get(key) || 0) + 1);
  }

  const rowsByDoc = new Map<string, any[]>();
  for (const row of inputRows) {
    const key = String(
      row?.docKey ||
        getProductSalesDocKey(
          String(row?.sourceType || "invoice"),
          Number(row?.orderId || 0),
        ),
    );
    const list = rowsByDoc.get(key) || [];
    list.push(row);
    rowsByDoc.set(key, list);
  }

  const issues: any[] = [];
  let checkedDocs = 0;
  let checkedRows = 0;
  let skippedPartialDocs = 0;
  let totalAbsoluteDifference = 0;

  const pushIssue = (issue: any) => {
    const diff = Math.abs(Number(issue?.difference || 0));
    totalAbsoluteDifference += diff;
    issues.push({
      id: `${issue.type || "issue"}-${issue.sourceType || "invoice"}-${issue.orderId || 0}-${issues.length + 1}`,
      severity: issue.severity || "warning",
      type: issue.type || "unknown",
      sourceType: issue.sourceType || "invoice",
      orderId: Number(issue.orderId || 0),
      paymentType: issue.paymentType || "cash",
      title: issue.title || "نیاز به بررسی",
      description: issue.description || "",
      expectedAmount: Number(issue.expectedAmount || 0),
      actualAmount: Number(issue.actualAmount || 0),
      difference: Number(issue.difference || 0),
      rowsCount: Number(issue.rowsCount || 0),
      itemDiscountTotal: Number(issue.itemDiscountTotal || 0),
      invoiceDiscountShareTotal: Number(issue.invoiceDiscountShareTotal || 0),
      finalLinesTotal: Number(issue.finalLinesTotal || 0),
      invoiceDiscountBase: Number(issue.invoiceDiscountBase || 0),
      orderDiscount: Number(issue.orderDiscount || 0),
      rowIssues: Array.isArray(issue.rowIssues)
        ? issue.rowIssues.slice(0, 8)
        : [],
    });
  };

  for (const [docKey, groupRows] of rowsByDoc.entries()) {
    if (!groupRows.length) continue;
    checkedDocs += 1;
    checkedRows += groupRows.length;
    const first = groupRows[0] || {};
    const doc = docMap.get(docKey);
    const sourceType =
      String(first.sourceType || doc?.sourceType || "invoice") === "installment"
        ? "installment"
        : "invoice";
    const orderId = Number(first.orderId || doc?.orderId || 0);
    const paymentType = first.paymentType || doc?.paymentType || "cash";
    const fullDocRows = Number(fullCountByDoc.get(docKey) || groupRows.length);
    const isPartialDoc = groupRows.length < fullDocRows;
    if (isPartialDoc) skippedPartialDocs += 1;

    let beforeGlobalTotal = 0;
    let finalLinesTotal = 0;
    let itemDiscountTotal = 0;
    let invoiceDiscountShareTotal = 0;
    let maxInvoiceDiscountBase = 0;
    let orderDiscount = 0;
    const rowIssues: any[] = [];

    for (const row of groupRows) {
      const quantity = Math.max(0, Number(row?.quantity || 0));
      const unitPrice = Math.max(0, Number(row?.unitPrice || 0));
      const gross = quantity * unitPrice;
      const itemDiscount = Math.max(0, Number(row?.discountPerItem || 0));
      const beforeGlobal = Math.max(
        0,
        Number(
          row?.lineTotalBeforeGlobalDiscount ??
            row?.originalLineTotal ??
            Math.max(0, gross - itemDiscount),
        ),
      );
      const invoiceShare = Math.max(0, Number(row?.globalDiscountShare || 0));
      const rowTotalDiscount = Math.max(
        0,
        Number(row?.totalDiscountAmount ?? itemDiscount + invoiceShare),
      );
      const finalLine = Math.max(0, Number(row?.lineTotal || 0));
      const invoiceDiscountBase = Math.max(
        0,
        Number(row?.invoiceDiscountBase || 0),
      );
      orderDiscount = Math.max(
        orderDiscount,
        Math.max(0, Number(row?.orderDiscount || 0)),
      );
      maxInvoiceDiscountBase = Math.max(
        maxInvoiceDiscountBase,
        invoiceDiscountBase,
      );
      beforeGlobalTotal += beforeGlobal;
      finalLinesTotal += finalLine;
      itemDiscountTotal += itemDiscount;
      invoiceDiscountShareTotal += invoiceShare;

      const expectedFinal = Math.max(0, beforeGlobal - invoiceShare);
      const finalDiff = healthAbsDiff(expectedFinal, finalLine);
      if (finalDiff > PRODUCT_SALES_HEALTH_TOLERANCE) {
        rowIssues.push({
          productId: Number(row?.productId || 0),
          productName: String(row?.productName || "—"),
          reason: "جمع نهایی ردیف با فرمول تخفیف برابر نیست",
          expectedAmount: expectedFinal,
          actualAmount: finalLine,
          difference: finalDiff,
        });
      }

      const discountDiff = healthAbsDiff(
        rowTotalDiscount,
        itemDiscount + invoiceShare,
      );
      if (discountDiff > PRODUCT_SALES_HEALTH_TOLERANCE) {
        rowIssues.push({
          productId: Number(row?.productId || 0),
          productName: String(row?.productName || "—"),
          reason: "کل تخفیف ردیف با مجموع تخفیف آیتم و سهم فاکتور برابر نیست",
          expectedAmount: itemDiscount + invoiceShare,
          actualAmount: rowTotalDiscount,
          difference: discountDiff,
        });
      }

      if (
        gross > 0 &&
        itemDiscount + invoiceShare > gross + PRODUCT_SALES_HEALTH_TOLERANCE
      ) {
        rowIssues.push({
          productId: Number(row?.productId || 0),
          productName: String(row?.productName || "—"),
          reason: "تخفیف ردیف از مبلغ ناخالص بیشتر شده است",
          expectedAmount: gross,
          actualAmount: itemDiscount + invoiceShare,
          difference: itemDiscount + invoiceShare - gross,
        });
      }

      if (
        gross > 0 &&
        finalLine <= PRODUCT_SALES_HEALTH_TOLERANCE &&
        itemDiscount + invoiceShare >= gross - PRODUCT_SALES_HEALTH_TOLERANCE
      ) {
        rowIssues.push({
          productId: Number(row?.productId || 0),
          productName: String(row?.productName || "—"),
          reason:
            "مبلغ نهایی ردیف بعد از تخفیف صفر شده است؛ اگر عمدی نیست بررسی شود",
          expectedAmount: gross,
          actualAmount: finalLine,
          difference: gross - finalLine,
        });
      }
    }

    if (rowIssues.length) {
      const maxDiff = rowIssues.reduce(
        (m, item) => Math.max(m, Math.abs(Number(item.difference || 0))),
        0,
      );
      pushIssue({
        type: "row_formula",
        severity: healthSeverityForDiff(maxDiff),
        sourceType,
        orderId,
        paymentType,
        title: `${productSalesHealthSourceLabel(sourceType)} #${orderId}: مغایرت در فرمول ردیف‌ها`,
        description:
          "یک یا چند قلم با فرمول ناخالص، تخفیف آیتم، سهم تخفیف فاکتور و مبلغ نهایی هم‌خوان نیست.",
        difference: maxDiff,
        rowsCount: groupRows.length,
        itemDiscountTotal,
        invoiceDiscountShareTotal,
        finalLinesTotal,
        invoiceDiscountBase: maxInvoiceDiscountBase,
        orderDiscount,
        rowIssues,
      });
    }

    const recomputedFinal = Math.max(
      0,
      beforeGlobalTotal - invoiceDiscountShareTotal,
    );
    const recomputeDiff = healthAbsDiff(recomputedFinal, finalLinesTotal);
    if (recomputeDiff > PRODUCT_SALES_HEALTH_TOLERANCE) {
      pushIssue({
        type: "group_recompute",
        severity: healthSeverityForDiff(recomputeDiff),
        sourceType,
        orderId,
        paymentType,
        title: `${productSalesHealthSourceLabel(sourceType)} #${orderId}: جمع ردیف‌ها با تخفیف‌ها نمی‌خواند`,
        description:
          "جمع مبلغ قبل از تخفیف فاکتور منهای سهم تخفیف فاکتور باید با جمع نهایی ردیف‌ها برابر باشد.",
        expectedAmount: recomputedFinal,
        actualAmount: finalLinesTotal,
        difference: recomputeDiff,
        rowsCount: groupRows.length,
        itemDiscountTotal,
        invoiceDiscountShareTotal,
        finalLinesTotal,
        invoiceDiscountBase: maxInvoiceDiscountBase,
        orderDiscount,
      });
    }

    if (!isPartialDoc && doc) {
      const docTotal = Number(doc.contractualTotal || 0);
      const docDiff = healthAbsDiff(docTotal, finalLinesTotal);
      if (docDiff > PRODUCT_SALES_HEALTH_TOLERANCE) {
        pushIssue({
          type: "document_total",
          severity: healthSeverityForDiff(docDiff),
          sourceType,
          orderId,
          paymentType,
          title: `${productSalesHealthSourceLabel(sourceType)} #${orderId}: جمع ردیف‌ها با مبلغ سند برابر نیست`,
          description:
            "جمع نهایی ردیف‌های غیرگوشی باید با مبلغ غیرگوشی سند در گزارش برابر باشد.",
          expectedAmount: docTotal,
          actualAmount: finalLinesTotal,
          difference: docDiff,
          rowsCount: groupRows.length,
          itemDiscountTotal,
          invoiceDiscountShareTotal,
          finalLinesTotal,
          invoiceDiscountBase: maxInvoiceDiscountBase,
          orderDiscount,
        });
      }
    }

    if (
      !isPartialDoc &&
      sourceType === "invoice" &&
      orderDiscount > 0 &&
      maxInvoiceDiscountBase > 0
    ) {
      const expectedInvoiceShare =
        orderDiscount * (beforeGlobalTotal / maxInvoiceDiscountBase);
      const shareDiff = healthAbsDiff(
        expectedInvoiceShare,
        invoiceDiscountShareTotal,
      );
      if (shareDiff > PRODUCT_SALES_HEALTH_TOLERANCE) {
        pushIssue({
          type: "invoice_discount_allocation",
          severity: healthSeverityForDiff(shareDiff),
          sourceType,
          orderId,
          paymentType,
          title: `${productSalesHealthSourceLabel(sourceType)} #${orderId}: سهم تخفیف فاکتور درست پخش نشده`,
          description:
            "سهم اقلام غیرگوشی از تخفیف کلی فاکتور باید متناسب با وزن مبلغی آن‌ها نسبت به مبنای تقسیم تخفیف باشد.",
          expectedAmount: expectedInvoiceShare,
          actualAmount: invoiceDiscountShareTotal,
          difference: shareDiff,
          rowsCount: groupRows.length,
          itemDiscountTotal,
          invoiceDiscountShareTotal,
          finalLinesTotal,
          invoiceDiscountBase: maxInvoiceDiscountBase,
          orderDiscount,
        });
      }
    }

    if (
      orderDiscount > 0 &&
      maxInvoiceDiscountBase <= PRODUCT_SALES_HEALTH_TOLERANCE
    ) {
      pushIssue({
        type: "missing_discount_base",
        severity: "error",
        sourceType,
        orderId,
        paymentType,
        title: `${productSalesHealthSourceLabel(sourceType)} #${orderId}: مبنای تقسیم تخفیف نامعتبر است`,
        description:
          "برای فاکتور تخفیف کلی ثبت شده اما مبنای تقسیم تخفیف صفر یا نامعتبر است.",
        expectedAmount: orderDiscount,
        actualAmount: maxInvoiceDiscountBase,
        difference: orderDiscount,
        rowsCount: groupRows.length,
        itemDiscountTotal,
        invoiceDiscountShareTotal,
        finalLinesTotal,
        invoiceDiscountBase: maxInvoiceDiscountBase,
        orderDiscount,
      });
    }
  }

  const errorCount = issues.filter(
    (item: any) => item.severity === "error",
  ).length;
  const warningCount = issues.filter(
    (item: any) => item.severity === "warning",
  ).length;
  const roundingCount = issues.filter(
    (item: any) =>
      item.severity === "warning" &&
      Math.abs(Number(item.difference || 0)) <=
        PRODUCT_SALES_HEALTH_ROUNDING_TOLERANCE,
  ).length;
  const status =
    errorCount > 0 ? "error" : warningCount > 0 ? "warning" : "healthy";
  const sortedIssues = issues.sort((a: any, b: any) => {
    const sa = a.severity === "error" ? 0 : 1;
    const sb = b.severity === "error" ? 0 : 1;
    return (
      sa - sb ||
      Math.abs(Number(b.difference || 0)) - Math.abs(Number(a.difference || 0))
    );
  });

  return {
    status,
    checkedDocs,
    checkedRows,
    skippedPartialDocs,
    issueCount: sortedIssues.length,
    errorCount,
    warningCount,
    roundingCount,
    totalAbsoluteDifference,
    issues: sortedIssues.slice(0, 80),
  };
}
