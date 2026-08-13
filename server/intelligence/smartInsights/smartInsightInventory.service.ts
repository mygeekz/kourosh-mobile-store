import { formatExactNumberText } from "../../../utils/exactNumber";
import {
  smartInsightMoney,
  smartInsightNum,
  smartInsightSafeRows,
} from "./smartInsightCore.service";

type AddInsight = (raw: any) => void;
type AiIsEnabled = (key: string) => boolean;

export async function buildSmartReorderInsight({
  recent14ISO,
  toISO,
  aiIsEnabled,
  addInsight,
}: {
  recent14ISO: string;
  toISO: string;
  aiIsEnabled: AiIsEnabled;
  addInsight: AddInsight;
}): Promise<any[]> {
  const reorderRows = aiIsEnabled("forecast")
    ? await smartInsightSafeRows(
        `
        SELECT
          p.id AS productId,
          p.name AS productName,
          COALESCE(p.stock_quantity, 0) AS stockQuantity,
          COALESCE(p.threshold, 5) AS thresholdQty,
          COALESCE(SUM(soi.quantity), 0) AS soldQty,
          COALESCE(SUM(soi.totalPrice), 0) AS soldAmount,
          COALESCE(SUM((COALESCE(soi.unitPrice, 0) - COALESCE(NULLIF(soi.buyPrice, 0), p.purchasePrice, 0)) * soi.quantity - COALESCE(soi.discountPerItem, 0)), 0) AS estimatedProfit
        FROM sales_order_items soi
        JOIN sales_orders so ON so.id = soi.orderId
        JOIN products p ON soi.itemType = 'inventory' AND soi.itemId = p.id
        WHERE date(substr(so.transactionDate, 1, 10)) BETWEEN date(?) AND date(?)
          AND COALESCE(so.status, 'active') = 'active'
        GROUP BY p.id, p.name, p.stock_quantity, p.threshold
        HAVING soldQty > 0 AND (stockQuantity <= thresholdQty OR stockQuantity <= soldQty OR estimatedProfit > 0)
        ORDER BY (CASE WHEN stockQuantity <= thresholdQty THEN 1 ELSE 0 END) DESC, estimatedProfit DESC, soldQty DESC
        LIMIT 5
      `,
        [recent14ISO, toISO],
      )
    : [];

  if (reorderRows.length) {
    const top = reorderRows[0] || {};
    const names = reorderRows
      .slice(0, 3)
      .map((r: any) => String(r.productName || "کالا"))
      .join("، ");
    addInsight({
      id: "smart-reorder-suggestion",
      type: "stock_reorder",
      category: "انبار و خرید",
      severity:
        smartInsightNum(top.stockQuantity) <= smartInsightNum(top.thresholdQty)
          ? "high"
          : "medium",
      score: 72 + Math.min(22, reorderRows.length * 4),
      confidence: 78,
      icon: "fa-cart-flatbed",
      title: "پیشنهاد خرید هوشمند برای کالاهای پرفروش",
      summary: `${formatExactNumberText(reorderRows.length)} قلم کالا در ۱۴ روز اخیر سیگنال خرید مجدد دارند؛ مثل ${names}.`,
      reasons: reorderRows
        .slice(0, 5)
        .map(
          (r: any) =>
            `${r.productName}: فروش ${formatExactNumberText(smartInsightNum(r.soldQty))} عدد، موجودی ${formatExactNumberText(smartInsightNum(r.stockQuantity))}، نقطه امن ${formatExactNumberText(smartInsightNum(r.thresholdQty))}`,
        ),
      metrics: [
        {
          label: "تعداد پیشنهاد",
          value: formatExactNumberText(reorderRows.length),
        },
        {
          label: "سود تخمینی ۱۴ روز",
          value: smartInsightMoney(
            reorderRows.reduce(
              (s: number, r: any) => s + smartInsightNum(r.estimatedProfit),
              0,
            ),
          ),
        },
        {
          label: "فروش ۱۴ روز",
          value: smartInsightMoney(
            reorderRows.reduce(
              (s: number, r: any) => s + smartInsightNum(r.soldAmount),
              0,
            ),
          ),
        },
      ],
      actions: [
        {
          label: "رفتن به پیشنهاد خرید",
          to: "/reports/analysis/suggestions",
          icon: "fa-lightbulb",
        },
        {
          label: "مدیریت کالاها",
          to: "/products",
          icon: "fa-boxes-stacked",
        },
      ],
      target: { rows: reorderRows },
    });
  }

  return reorderRows;
}
