import { formatExactNumberText } from "../../../utils/exactNumber";
import {
  smartInsightMoney,
  smartInsightNum,
  smartInsightPercent,
  smartInsightSafeRows,
} from "./smartInsightCore.service";

type AddInsight = (raw: any) => void;
type AiIsEnabled = (key: string) => boolean;

export async function buildDiscountAnomalyInsight({
  fromISO,
  toISO,
  aiIsEnabled,
  addInsight,
}: {
  fromISO: string;
  toISO: string;
  aiIsEnabled: AiIsEnabled;
  addInsight: AddInsight;
}): Promise<any[]> {
  const discountRows = aiIsEnabled("audit_radar")
    ? await smartInsightSafeRows(
        `
        SELECT
          so.id AS orderId,
          so.transactionDate,
          COALESCE(c.fullName, 'مشتری مهمان') AS customerName,
          COALESCE(so.subtotal, 0) AS subtotal,
          COALESCE(so.grandTotal, 0) AS grandTotal,
          COALESCE(so.discount, 0) AS invoiceDiscount,
          COALESCE(SUM(soi.discountPerItem), 0) AS itemDiscount,
          CASE WHEN COALESCE(so.subtotal, 0) > 0 THEN ((COALESCE(so.discount, 0) + COALESCE(SUM(soi.discountPerItem), 0)) / COALESCE(so.subtotal, 1)) * 100 ELSE 0 END AS discountRate
        FROM sales_orders so
        LEFT JOIN sales_order_items soi ON soi.orderId = so.id
        LEFT JOIN customers c ON c.id = so.customerId
        WHERE date(substr(so.transactionDate, 1, 10)) BETWEEN date(?) AND date(?)
          AND COALESCE(so.status, 'active') = 'active'
        GROUP BY so.id, so.transactionDate, c.fullName, so.subtotal, so.grandTotal, so.discount
        HAVING discountRate >= 12 OR (invoiceDiscount + itemDiscount) >= 1000000
        ORDER BY discountRate DESC, (invoiceDiscount + itemDiscount) DESC
        LIMIT 8
      `,
        [fromISO, toISO],
      )
    : [];

  if (discountRows.length) {
    const top = discountRows[0] || {};
    addInsight({
      id: "discount-anomaly-watch",
      type: "discount_anomaly",
      category: "کنترل تخفیف",
      severity: smartInsightNum(top.discountRate) >= 25 ? "critical" : "high",
      score: Math.min(96, 48 + smartInsightNum(top.discountRate) * 1.5),
      confidence: 86,
      icon: "fa-tags",
      title: "تخفیف‌های غیرعادی نیاز به بررسی دارند",
      summary: `${formatExactNumberText(discountRows.length)} فاکتور در این بازه تخفیف بالاتر از سطح معمول دارند.`,
      reasons: discountRows
        .slice(0, 5)
        .map(
          (r: any) =>
            `فاکتور ${r.orderId} برای ${r.customerName}: نرخ تخفیف ${smartInsightPercent(r.discountRate)}، مبلغ تخفیف ${smartInsightMoney(smartInsightNum(r.invoiceDiscount) + smartInsightNum(r.itemDiscount))}`,
        ),
      metrics: [
        {
          label: "بالاترین نرخ",
          value: smartInsightPercent(top.discountRate),
        },
        {
          label: "فاکتورهای مشکوک",
          value: formatExactNumberText(discountRows.length),
        },
        {
          label: "جمع تخفیف‌های مشکوک",
          value: smartInsightMoney(
            discountRows.reduce(
              (s: number, r: any) =>
                s + smartInsightNum(r.invoiceDiscount) + smartInsightNum(r.itemDiscount),
              0,
            ),
          ),
        },
      ],
      actions: [
        {
          label: "گزارش فروش غیرگوشی",
          to: "/reports/product-sales",
          icon: "fa-magnifying-glass-chart",
        },
      ],
      target: { rows: discountRows },
    });
  }

  return discountRows;
}
