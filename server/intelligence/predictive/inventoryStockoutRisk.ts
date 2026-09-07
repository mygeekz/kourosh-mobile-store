import type moment from "jalali-moment";
import { allAsync } from "../../database";
import type { PredictiveStockoutRisk } from "./predictiveTypes";
import { predictiveNum } from "./predictiveUtils";

export const buildInventoryStockoutRisks = async (
  end: moment.Moment,
  toISO: string,
): Promise<PredictiveStockoutRisk[]> => {
  const stockRows = await allAsync(
    `
      SELECT p.id AS productId,
             p.name AS productName,
             COALESCE(p.stock_quantity, 0) AS stockQuantity,
             COALESCE(p.threshold, 5) AS thresholdQty,
             COALESCE(SUM(soi.quantity), 0) AS soldQty14,
             COALESCE(SUM(soi.totalPrice), 0) AS soldAmount14
      FROM products p
      LEFT JOIN sales_order_items soi ON soi.itemType = 'inventory' AND soi.itemId = p.id
      LEFT JOIN sales_orders so ON so.id = soi.orderId
        AND substr(so.transactionDate, 1, 10) BETWEEN ? AND ?
        AND COALESCE(so.status, 'active') = 'active'
      GROUP BY p.id, p.name, p.stock_quantity, p.threshold
      HAVING soldQty14 > 0 OR stockQuantity <= thresholdQty
      ORDER BY (CASE WHEN stockQuantity <= thresholdQty THEN 1 ELSE 0 END) DESC, soldQty14 DESC, soldAmount14 DESC
      LIMIT 12
    `,
    [end.clone().subtract(13, "day").format("YYYY-MM-DD"), toISO],
  ).catch(() => []);

  return (stockRows || [])
    .map((r: any) => {
      const avgDailySold = predictiveNum(r.soldQty14) / 14;
      const daysToStockout =
        avgDailySold > 0
          ? predictiveNum(r.stockQuantity) / avgDailySold
          : predictiveNum(r.stockQuantity) <= predictiveNum(r.thresholdQty)
            ? 0
            : 999;
      const severity: PredictiveStockoutRisk["severity"] =
        daysToStockout <= 2
          ? "critical"
          : daysToStockout <= 5
            ? "high"
            : daysToStockout <= 9
              ? "medium"
              : "low";
      const suggestedBuyQty = Math.max(
        0,
        avgDailySold * 21 - predictiveNum(r.stockQuantity),
      );
      return {
        productId: r.productId,
        productName: r.productName || "کالا",
        stockQuantity: predictiveNum(r.stockQuantity),
        thresholdQty: predictiveNum(r.thresholdQty),
        soldQty14: predictiveNum(r.soldQty14),
        avgDailySold,
        daysToStockout:
          daysToStockout >= 999 ? null : daysToStockout,
        suggestedBuyQty,
        severity,
        actionLabel: suggestedBuyQty > 0 ? "بررسی خرید مجدد" : "کنترل موجودی",
        to: "/reports/analysis/suggestions",
      };
    })
    .filter((r: any) => r.severity !== "low" || r.suggestedBuyQty > 0)
    .slice(0, 8);
};
