import { formatExactNumberText } from "../../../utils/exactNumber";
import {
  smartInsightMoney,
  smartInsightNum,
  smartInsightPercent,
  smartInsightSafeRows,
} from "./smartInsightCore.service";

type AddInsight = (raw: any) => void;
type AiIsEnabled = (key: string) => boolean;

export async function buildSuspiciousInvoiceAudits({
  fromISO,
  toISO,
  aiIsEnabled,
  addInsight,
  salesStats,
  activeDays,
}: {
  fromISO: string;
  toISO: string;
  aiIsEnabled: AiIsEnabled;
  addInsight: AddInsight;
  salesStats: any;
  activeDays: number;
}): Promise<any[]> {
  const suspiciousInvoiceAudits: any[] = [];
        const suspiciousRows = aiIsEnabled("audit_radar")
          ? await smartInsightSafeRows(
              `
        WITH order_base AS (
          SELECT orderId, SUM(COALESCE(totalPrice, 0)) AS itemBase, COUNT(*) AS itemCount, SUM(COALESCE(discountPerItem, 0)) AS itemDiscountTotal
          FROM sales_order_items
          GROUP BY orderId
        ), line_audit AS (
          SELECT
            so.id AS orderId,
            so.transactionDate,
            COALESCE(c.fullName, 'مشتری مهمان') AS customerName,
            COALESCE(so.subtotal, 0) AS subtotal,
            COALESCE(so.grandTotal, 0) AS grandTotal,
            COALESCE(so.discount, 0) AS invoiceDiscount,
            COALESCE(ob.itemBase, 0) AS itemBase,
            COALESCE(ob.itemCount, 0) AS itemCount,
            COALESCE(ob.itemDiscountTotal, 0) AS itemDiscountTotal,
            soi.description AS itemTitle,
            soi.itemType,
            COALESCE(soi.quantity, 0) AS qty,
            COALESCE(soi.unitPrice, 0) AS unitPrice,
            COALESCE(soi.totalPrice, 0) AS lineTotal,
            COALESCE(soi.discountPerItem, 0) AS lineDiscount,
            COALESCE(NULLIF(soi.buyPrice, 0), p.purchasePrice, 0) AS costPrice,
            CASE WHEN COALESCE(ob.itemBase, 0) > 0 THEN COALESCE(so.discount, 0) * COALESCE(soi.totalPrice, 0) / COALESCE(ob.itemBase, 1) ELSE 0 END AS allocatedInvoiceDiscount
          FROM sales_orders so
          JOIN sales_order_items soi ON soi.orderId = so.id
          LEFT JOIN products p ON soi.itemType = 'inventory' AND p.id = soi.itemId
          LEFT JOIN customers c ON c.id = so.customerId
          LEFT JOIN order_base ob ON ob.orderId = so.id
          WHERE date(substr(so.transactionDate, 1, 10)) BETWEEN date(?) AND date(?) AND COALESCE(so.status, 'active') = 'active'
        )
        SELECT
          orderId,
          transactionDate,
          customerName,
          MAX(subtotal) AS subtotal,
          MAX(grandTotal) AS grandTotal,
          MAX(invoiceDiscount) AS invoiceDiscount,
          MAX(itemBase) AS itemBase,
          MAX(itemCount) AS itemCount,
          MAX(itemDiscountTotal) AS itemDiscountTotal,
          SUM(lineTotal - (costPrice * qty) - allocatedInvoiceDiscount) AS estimatedProfitAfterDiscount,
          SUM(CASE WHEN itemType = 'inventory' AND costPrice > 0 AND (lineTotal - (costPrice * qty) - allocatedInvoiceDiscount) < 0 THEN 1 ELSE 0 END) AS negativeProfitLines,
          SUM(CASE WHEN itemType = 'inventory' AND costPrice > 0 AND unitPrice < costPrice THEN 1 ELSE 0 END) AS belowCostLines,
          SUM(CASE WHEN itemType = 'inventory' AND costPrice <= 0 THEN 1 ELSE 0 END) AS missingCostLines,
          SUM(CASE WHEN ABS(lineTotal - ((unitPrice * qty) - lineDiscount)) > 100 THEN 1 ELSE 0 END) AS inconsistentLineTotals,
          SUM(CASE WHEN (unitPrice * qty) > 0 AND (lineDiscount / (unitPrice * qty)) >= 0.15 THEN 1 ELSE 0 END) AS heavyItemDiscountLines,
          MAX(CASE WHEN subtotal > 0 AND invoiceDiscount / subtotal >= 0.12 THEN 1 ELSE 0 END) AS heavyInvoiceDiscount,
          MAX(CASE WHEN itemBase > 0 AND ABS((itemBase - invoiceDiscount) - grandTotal) > 5000 THEN 1 ELSE 0 END) AS totalMismatch,
          GROUP_CONCAT(CASE
            WHEN itemType = 'inventory' AND costPrice > 0 AND (lineTotal - (costPrice * qty) - allocatedInvoiceDiscount) < 0 THEN itemTitle
            WHEN itemType = 'inventory' AND costPrice > 0 AND unitPrice < costPrice THEN itemTitle
            WHEN itemType = 'inventory' AND costPrice <= 0 THEN itemTitle
            ELSE NULL END, '، ') AS riskyItems
        FROM line_audit
        GROUP BY orderId, transactionDate, customerName
        HAVING negativeProfitLines > 0 OR belowCostLines > 0 OR missingCostLines > 0 OR inconsistentLineTotals > 0 OR heavyItemDiscountLines > 0 OR heavyInvoiceDiscount > 0 OR totalMismatch > 0
        ORDER BY (negativeProfitLines * 28 + belowCostLines * 22 + missingCostLines * 14 + inconsistentLineTotals * 18 + heavyItemDiscountLines * 10 + heavyInvoiceDiscount * 16 + totalMismatch * 24) DESC,
                 ABS(estimatedProfitAfterDiscount) DESC
        LIMIT 10
      `,
              [fromISO, toISO]
            )
          : [];

        suspiciousRows.forEach((r: any) => {
          const reasonParts = [
            smartInsightNum(r.negativeProfitLines) > 0
              ? `${formatExactNumberText(smartInsightNum(r.negativeProfitLines))} قلم با سود منفی بعد از تخفیف`
              : "",
            smartInsightNum(r.belowCostLines) > 0
              ? `${formatExactNumberText(smartInsightNum(r.belowCostLines))} قلم فروش زیر قیمت خرید`
              : "",
            smartInsightNum(r.missingCostLines) > 0
              ? `${formatExactNumberText(smartInsightNum(r.missingCostLines))} قلم بدون قیمت خرید معتبر`
              : "",
            smartInsightNum(r.inconsistentLineTotals) > 0
              ? "عدم تطابق جمع ردیف با قیمت×تعداد"
              : "",
            smartInsightNum(r.heavyItemDiscountLines) > 0
              ? "تخفیف سنگین روی ردیف کالا"
              : "",
            smartInsightNum(r.heavyInvoiceDiscount) > 0
              ? "تخفیف کلی سنگین روی فاکتور"
              : "",
            smartInsightNum(r.totalMismatch) > 0
              ? "اختلاف بین جمع اقلام و مبلغ نهایی"
              : "",
          ].filter(Boolean);
          const riskScore = Math.min(
            100,
            (
              smartInsightNum(r.negativeProfitLines) * 28 +
                smartInsightNum(r.belowCostLines) * 22 +
                smartInsightNum(r.missingCostLines) * 14 +
                smartInsightNum(r.inconsistentLineTotals) * 18 +
                smartInsightNum(r.heavyItemDiscountLines) * 10 +
                smartInsightNum(r.heavyInvoiceDiscount) * 16 +
                smartInsightNum(r.totalMismatch) * 24 +
                Math.min(
                  18,
                  Math.abs(smartInsightNum(r.estimatedProfitAfterDiscount)) /
                    1000000
                )
            )
          );
          suspiciousInvoiceAudits.push({
            id: `audit-invoice-${r.orderId}`,
            orderId: r.orderId,
            transactionDate: r.transactionDate,
            customerName: r.customerName,
            riskScore,
            severity:
              riskScore >= 72 ? "critical" : riskScore >= 48 ? "high" : "medium",
            title: `فاکتور ${formatExactNumberText(Number(r.orderId || 0))} نیاز به کنترل دارد`,
            subtitle:
              reasonParts.slice(0, 3).join("، ") ||
              "سیگنال حسابداری غیرعادی پیدا شد",
            reasons: reasonParts,
            riskyItems: String(r.riskyItems || "")
              .split("، ")
              .filter(Boolean)
              .slice(0, 5),
            metrics: [
              { label: "فروش نهایی", value: smartInsightMoney(r.grandTotal) },
              {
                label: "تخفیف کل",
                value: smartInsightMoney(
                  smartInsightNum(r.invoiceDiscount) +
                    smartInsightNum(r.itemDiscountTotal)
                ),
              },
              {
                label: "سود بعد از تخفیف",
                value: smartInsightMoney(r.estimatedProfitAfterDiscount),
              },
            ],
          });
        });

        if (suspiciousInvoiceAudits.length) {
          const topAudit = suspiciousInvoiceAudits[0] || {};
          const auditReasonCount = (matcher: (text: string) => boolean) =>
            suspiciousInvoiceAudits.reduce((sum: number, row: any) => {
              const reasons = Array.isArray(row.reasons) ? row.reasons : [];
              return (
                sum +
                (reasons.some((reason: any) => matcher(String(reason || "")))
                  ? 1
                  : 0)
              );
            }, 0);
          const auditDiscountTotal = suspiciousInvoiceAudits.reduce(
            (sum: number, row: any) => {
              const metric = (Array.isArray(row.metrics) ? row.metrics : []).find(
                (m: any) => String(m.label || "").includes("تخفیف")
              );
              const raw = String(metric?.value || "").replace(/[^0-9.-]/g, "");
              return sum + smartInsightNum(raw);
            },
            0
          );
          const auditConfidence = Math.max(
            55,
            Math.min(
              96,
              (
                48 +
                  Math.min(24, suspiciousInvoiceAudits.length * 3) +
                  Math.min(18, smartInsightNum(salesStats.ordersCount) * 0.9) +
                  Math.min(10, activeDays * 1.1)
              )
            )
          );
          addInsight({
            id: "invoice-accounting-audit",
            type: "invoice_audit",
            category: "کنترل داخلی",
            severity: topAudit.severity || "high",
            score: Math.max(68, smartInsightNum(topAudit.riskScore)),
            confidence: auditConfidence,
            icon: "fa-shield-halved",
            title: "فاکتورهای مشکوک حسابداری شناسایی شد",
            summary: `${formatExactNumberText(suspiciousInvoiceAudits.length)} فاکتور از نظر سود منفی، تخفیف، قیمت خرید یا جمع ردیف‌ها نیاز به کنترل دارد.`,
            reasons: suspiciousInvoiceAudits
              .slice(0, 5)
              .map((r: any) => `${r.title}: ${r.subtitle}`),
            metrics: [
              {
                label: "فاکتورهای قابل کنترل",
                value: formatExactNumberText(suspiciousInvoiceAudits.length),
              },
              {
                label: "بالاترین ریسک",
                value: `${formatExactNumberText(smartInsightNum(topAudit.riskScore))} از ۱۰۰`,
              },
              {
                label: "بالاترین تخفیف",
                value:
                  auditDiscountTotal > 0
                    ? smartInsightMoney(auditDiscountTotal)
                    : (topAudit.metrics || [])[1]?.value || smartInsightMoney(0),
              },
              {
                label: "سود منفی",
                value: formatExactNumberText(auditReasonCount((text) =>
                  text.includes("سود منفی")
                )),
              },
              {
                label: "اختلاف جمع",
                value: formatExactNumberText(auditReasonCount(
                  (text) => text.includes("اختلاف") || text.includes("عدم تطابق")
                )),
              },
              {
                label: "تخفیف مشکوک",
                value: formatExactNumberText(auditReasonCount((text) =>
                  text.includes("تخفیف")
                )),
              },
            ],
            actions: [
              {
                label: "مشاهده فاکتورها",
                to: "/invoices",
                icon: "fa-file-invoice",
              },
              {
                label: "گزارش فروش",
                to: "/reports/product-sales",
                icon: "fa-chart-column",
              },
            ],
            target: { rows: suspiciousInvoiceAudits },
          });
        }


  return suspiciousInvoiceAudits;
}
