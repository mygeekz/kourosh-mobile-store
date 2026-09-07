import { formatExactNumberText } from "../../../utils/exactNumber";
import {
  smartInsightMoney,
  smartInsightNum,
  smartInsightPercent,
  smartInsightRound,
  smartInsightSafeRows,
} from "./smartInsightCore.service";

type AddInsight = (raw: any) => void;
type AiIsEnabled = (key: string) => boolean;

export async function buildPricingRecommendations({
  fromISO,
  toISO,
  fromMoment,
  toMoment,
  aiIsEnabled,
  addInsight,
}: {
  fromISO: string;
  toISO: string;
  fromMoment: any;
  toMoment: any;
  aiIsEnabled: AiIsEnabled;
  addInsight: AddInsight;
}): Promise<any[]> {
        const pricingRows = aiIsEnabled("auto_pricing")
          ? await smartInsightSafeRows(
              `
        WITH product_sales AS (
          SELECT
            p.id AS productId,
            p.name AS productName,
            COALESCE(p.purchasePrice, 0) AS purchasePrice,
            COALESCE(p.sellingPrice, 0) AS currentPrice,
            COALESCE(p.stock_quantity, 0) AS stockQuantity,
            COALESCE(p.threshold, 5) AS thresholdQty,
            COALESCE(SUM(CASE WHEN date(substr(so.transactionDate, 1, 10)) BETWEEN date(?) AND date(?) THEN soi.quantity ELSE 0 END), 0) AS sold7,
            COALESCE(SUM(CASE WHEN date(substr(so.transactionDate, 1, 10)) BETWEEN date(?) AND date(?) THEN soi.quantity ELSE 0 END), 0) AS sold30,
            COALESCE(SUM(CASE WHEN date(substr(so.transactionDate, 1, 10)) BETWEEN date(?) AND date(?) THEN soi.totalPrice ELSE 0 END), 0) AS revenue30,
            COALESCE(SUM(CASE WHEN date(substr(so.transactionDate, 1, 10)) BETWEEN date(?) AND date(?) THEN soi.discountPerItem ELSE 0 END), 0) AS discount30,
            COALESCE(SUM(CASE WHEN date(substr(so.transactionDate, 1, 10)) BETWEEN date(?) AND date(?) THEN (COALESCE(soi.unitPrice,0) - COALESCE(NULLIF(soi.buyPrice,0), p.purchasePrice, 0)) * COALESCE(soi.quantity,0) - COALESCE(soi.discountPerItem,0) ELSE 0 END), 0) AS profit30
          FROM products p
          LEFT JOIN sales_order_items soi ON soi.itemType = 'inventory' AND soi.itemId = p.id
          LEFT JOIN sales_orders so ON so.id = soi.orderId AND COALESCE(so.status, 'active') = 'active'
          GROUP BY p.id, p.name, p.purchasePrice, p.sellingPrice, p.stock_quantity, p.threshold
          HAVING currentPrice > 0 AND (sold30 > 0 OR stockQuantity > 0)
          ORDER BY profit30 DESC, sold30 DESC
          LIMIT 18
        )
        SELECT * FROM product_sales
      `,
              [
                toMoment.clone().subtract(7, "day").format("YYYY-MM-DD"),
                toISO,
                fromISO,
                toISO,
                fromISO,
                toISO,
                fromISO,
                toISO,
                fromISO,
                toISO,
              ]
            )
          : [];

        const pricingRecommendations = (pricingRows || [])
          .map((r: any) => {
            const currentPrice = smartInsightNum(r.currentPrice);
            const purchasePrice = smartInsightNum(r.purchasePrice);
            const stock = smartInsightNum(r.stockQuantity);
            const sold7 = smartInsightNum(r.sold7);
            const sold30 = smartInsightNum(r.sold30);
            const velocity =
              sold30 / Math.max(1, toMoment.diff(fromMoment, "day") + 1);
            const marginPct =
              currentPrice > 0
                ? ((currentPrice - purchasePrice) / currentPrice) * 100
                : 0;
            const discountRate =
              smartInsightNum(r.revenue30) > 0
                ? (smartInsightNum(r.discount30) / smartInsightNum(r.revenue30)) *
                  100
                : 0;
            const daysToStockout = velocity > 0 ? stock / velocity : 999;
            const elasticityScore = Math.max(
              -2.5,
              Math.min(
                0.5,
                -0.55 -
                  discountRate / 35 +
                  (sold7 > sold30 / 4 ? 0.18 : -0.12) +
                  (marginPct > 28 ? 0.16 : 0)
              )
            );
            const safeMinPrice = Math.max(
              purchasePrice * 1.08,
              currentPrice * 0.92
            );
            const lift =
              daysToStockout < 7
                ? 0.06
                : marginPct > 25 && discountRate < 8
                  ? 0.04
                  : discountRate > 15
                    ? -0.03
                    : sold7 > Math.max(1, sold30 / 4)
                      ? 0.03
                      : 0;
            const rawOptimal = currentPrice * (1 + lift);
            const optimalPrice = Math.max(
              safeMinPrice,
              (rawOptimal / 1000) * 1000
            );
            const volumeDelta =
              lift > 0
                ? (elasticityScore * lift * 100)
                : (Math.abs(elasticityScore) * Math.abs(lift) * 45);
            const profitDelta = (
              (optimalPrice - purchasePrice - (currentPrice - purchasePrice)) *
                Math.max(1, Math.min(sold30, stock || sold30 || 1))
            );
            const risk =
              lift > 0.045 && elasticityScore < -1.1
                ? "بالا"
                : lift < 0
                  ? "کنترل فروش"
                  : "کم";
            const action =
              lift > 0
                ? "افزایش قیمت کنترل‌شده ۷ روزه"
                : lift < 0
                  ? "کاهش قیمت/تخلیه موجودی کنترل‌شده"
                  : "حفظ قیمت و پایش";
            return {
              productId: r.productId,
              productName: r.productName,
              currentPrice: smartInsightRound(currentPrice),
              purchasePrice: smartInsightRound(purchasePrice),
              safeMinPrice: smartInsightRound(safeMinPrice),
              optimalPrice: smartInsightRound(optimalPrice),
              aggressivePrice: smartInsightRound(
                Math.max(safeMinPrice, currentPrice * 0.96)
              ),
              marginPct: smartInsightRound(marginPct),
              elasticityScore: smartInsightRound(elasticityScore),
              sold7: smartInsightRound(sold7),
              sold30: smartInsightRound(sold30),
              daysToStockout:
                daysToStockout >= 999 ? 999 : smartInsightRound(daysToStockout),
              expectedProfitDelta: smartInsightRound(profitDelta),
              expectedVolumeDelta: volumeDelta,
              confidence: Math.max(
                45,
                Math.min(
                  92,
                  (
                    52 +
                      Math.min(22, sold30 * 2) +
                      Math.min(14, Math.max(0, marginPct)) -
                      Math.max(0, discountRate - 12)
                  )
                )
              ),
              risk,
              action,
            };
          })
          .sort(
            (a: any, b: any) =>
              Math.abs(smartInsightNum(b.expectedProfitDelta)) -
              Math.abs(smartInsightNum(a.expectedProfitDelta))
          )
          .slice(0, 8);

        const topPricing = pricingRecommendations.find(
          (p: any) =>
            Math.abs(smartInsightNum(p.expectedProfitDelta)) > 0 ||
            smartInsightNum(p.sold30) > 0
        );
        if (topPricing) {
          addInsight({
            id: "auto-pricing-opportunity",
            type: "auto_pricing",
            category: "قیمت‌گذاری",
            severity:
              smartInsightNum(topPricing.expectedProfitDelta) > 0
                ? "medium"
                : "low",
            score: Math.min(
              92,
              50 +
                smartInsightNum(topPricing.confidence) * 0.35 +
                Math.min(
                  18,
                  Math.abs(smartInsightNum(topPricing.expectedProfitDelta)) /
                    1000000
                )
            ),
            confidence: topPricing.confidence,
            icon: "fa-tags",
            title: "قیمت‌گذاری هوشمند پیشنهاد جدید دارد",
            summary: `برای ${topPricing.productName} قیمت پیشنهادی ${smartInsightMoney(topPricing.optimalPrice)} است؛ قیمت فعلی ${smartInsightMoney(topPricing.currentPrice)}.`,
            reasons: [
              `حاشیه سود: ${smartInsightPercent(topPricing.marginPct)}`,
              `کشش قیمت تخمینی: ${topPricing.elasticityScore}`,
              `فروش ۳۰ روز: ${formatExactNumberText(smartInsightNum(topPricing.sold30))}`,
              `ریسک اجرا: ${topPricing.risk}`,
            ],
            metrics: [
              {
                label: "قیمت فعلی",
                value: smartInsightMoney(topPricing.currentPrice),
              },
              {
                label: "قیمت پیشنهادی",
                value: smartInsightMoney(topPricing.optimalPrice),
              },
              {
                label: "اثر سود",
                value: smartInsightMoney(topPricing.expectedProfitDelta),
              },
            ],
            actions: [
              { label: "مدیریت کالاها", to: "/products", icon: "fa-tags" },
            ],
            target: { pricing: pricingRecommendations },
          });
        }


  return pricingRecommendations;
}
