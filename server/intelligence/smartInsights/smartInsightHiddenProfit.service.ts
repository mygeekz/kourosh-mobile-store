import { formatExactNumberText } from "../../../utils/exactNumber";
import {
  smartInsightMoney,
  smartInsightNum,
  smartInsightPercent,
  smartInsightSafeRows,
} from "./smartInsightCore.service";

type AddInsight = (raw: any) => void;
type AiIsEnabled = (key: string) => boolean;

export async function buildHiddenProfitInsights({
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
  const hiddenProfitCards: any[] = [];
        const productProfitRows = aiIsEnabled("hidden_profit")
          ? await smartInsightSafeRows(
              `
        SELECT
          p.id AS productId,
          p.name AS productName,
          COALESCE(p.stock_quantity, 0) AS stockQuantity,
          COALESCE(SUM(CASE WHEN so.id IS NOT NULL THEN soi.quantity ELSE 0 END), 0) AS soldQty,
          COALESCE(SUM(CASE WHEN so.id IS NOT NULL THEN soi.totalPrice ELSE 0 END), 0) AS soldAmount,
          COALESCE(SUM(CASE WHEN so.id IS NOT NULL THEN COALESCE(soi.discountPerItem, 0) ELSE 0 END), 0) AS itemDiscount,
          COALESCE(AVG(COALESCE(NULLIF(soi.buyPrice, 0), p.purchasePrice, 0)), 0) AS avgBuyPrice,
          COALESCE(AVG(COALESCE(soi.unitPrice, 0)), 0) AS avgSalePrice,
          COALESCE(SUM(CASE WHEN so.id IS NOT NULL THEN ((COALESCE(soi.unitPrice, 0) - COALESCE(NULLIF(soi.buyPrice, 0), p.purchasePrice, 0)) * COALESCE(soi.quantity, 0) - COALESCE(soi.discountPerItem, 0)) ELSE 0 END), 0) AS grossProfit
        FROM products p
        LEFT JOIN sales_order_items soi ON soi.itemType = 'inventory' AND soi.itemId = p.id
        LEFT JOIN sales_orders so ON so.id = soi.orderId AND date(substr(so.transactionDate, 1, 10)) BETWEEN date(?) AND date(?) AND COALESCE(so.status, 'active') = 'active'
        GROUP BY p.id, p.name, p.stock_quantity
        HAVING soldAmount > 0 OR stockQuantity > 0
        ORDER BY grossProfit DESC, soldAmount DESC
        LIMIT 80
      `,
              [fromISO, toISO]
            )
          : [];

        const highMarginSleepers = productProfitRows
          .map((r: any) => {
            const soldAmount = smartInsightNum(r.soldAmount);
            const profit = smartInsightNum(r.grossProfit);
            const margin = soldAmount > 0 ? (profit / soldAmount) * 100 : 0;
            const soldQty = smartInsightNum(r.soldQty);
            const stock = smartInsightNum(r.stockQuantity);
            const opportunity = (
              Math.max(0, margin) * 1.8 +
                Math.min(stock, 50) * 1.2 -
                soldQty * 1.4
            );
            return { ...r, margin, opportunity };
          })
          .filter(
            (r: any) =>
              smartInsightNum(r.margin) >= 18 &&
              smartInsightNum(r.stockQuantity) > 0 &&
              smartInsightNum(r.soldQty) <= 4
          )
          .sort(
            (a: any, b: any) =>
              smartInsightNum(b.opportunity) - smartInsightNum(a.opportunity)
          )
          .slice(0, 5);

        const priceLiftRows = productProfitRows
          .map((r: any) => {
            const soldAmount = smartInsightNum(r.soldAmount);
            const profit = smartInsightNum(r.grossProfit);
            const soldQty = smartInsightNum(r.soldQty);
            const discountRate =
              soldAmount > 0
                ? (smartInsightNum(r.itemDiscount) / soldAmount) * 100
                : 0;
            const margin = soldAmount > 0 ? (profit / soldAmount) * 100 : 0;
            const suggestedLiftPct =
              margin >= 22 && discountRate <= 3
                ? 3
                : margin >= 14 && discountRate <= 5
                  ? 2
                  : 1;
            const extraProfit = soldAmount * (suggestedLiftPct / 100);
            const score = (
              soldQty * 3 + margin * 1.2 - discountRate * 2
            );
            return {
              ...r,
              margin,
              discountRate,
              suggestedLiftPct,
              extraProfit,
              score,
            };
          })
          .filter(
            (r: any) =>
              smartInsightNum(r.soldQty) >= 3 &&
              smartInsightNum(r.score) >= 20 &&
              smartInsightNum(r.suggestedLiftPct) >= 2
          )
          .sort(
            (a: any, b: any) =>
              smartInsightNum(b.extraProfit) - smartInsightNum(a.extraProfit)
          )
          .slice(0, 5);

        const bundleRows = aiIsEnabled("hidden_profit")
          ? await smartInsightSafeRows(
              `
        WITH item_profit AS (
          SELECT
            so.id AS orderId,
            p.id AS productId,
            p.name AS productName,
            COALESCE(soi.totalPrice, 0) AS lineAmount,
            (COALESCE(soi.unitPrice, 0) - COALESCE(NULLIF(soi.buyPrice, 0), p.purchasePrice, 0)) * COALESCE(soi.quantity, 0) - COALESCE(soi.discountPerItem, 0) AS lineProfit
          FROM sales_orders so
          JOIN sales_order_items soi ON soi.orderId = so.id AND soi.itemType = 'inventory'
          JOIN products p ON p.id = soi.itemId
          WHERE date(substr(so.transactionDate, 1, 10)) BETWEEN date(?) AND date(?) AND COALESCE(so.status, 'active') = 'active'
        )
        SELECT
          a.productId AS productAId,
          a.productName AS productA,
          b.productId AS productBId,
          b.productName AS productB,
          COUNT(DISTINCT a.orderId) AS togetherOrders,
          COALESCE(SUM(a.lineAmount + b.lineAmount), 0) AS bundleSales,
          COALESCE(SUM(a.lineProfit + b.lineProfit), 0) AS bundleProfit
        FROM item_profit a
        JOIN item_profit b ON a.orderId = b.orderId AND a.productId < b.productId
        GROUP BY a.productId, a.productName, b.productId, b.productName
        HAVING togetherOrders >= 2 AND bundleProfit > 0
        ORDER BY togetherOrders DESC, bundleProfit DESC
        LIMIT 6
      `,
              [fromISO, toISO]
            )
          : [];

        if (highMarginSleepers.length) {
          hiddenProfitCards.push({
            id: "high-margin-sleepers",
            title: "کالاهای پرسودِ کم‌نمایش",
            subtitle: "این کالاها سود خوبی دارند اما در فروش دیده نمی‌شوند.",
            icon: "fa-gem",
            tone: "emerald",
            impact: smartInsightMoney(
              highMarginSleepers.reduce(
                (s: number, r: any) =>
                  s + Math.max(0, smartInsightNum(r.grossProfit)),
                0
              )
            ),
            action: "نمایش در پیشنهاد فروش، کنار صندوق یا باندل مکمل",
            rows: highMarginSleepers.map((r: any) => ({
              productId: r.productId,
              title: r.productName,
              metric: `حاشیه سود ${smartInsightPercent(r.margin)} | موجودی ${formatExactNumberText(smartInsightNum(r.stockQuantity))}`,
              reason: `فروش کم (${formatExactNumberText(smartInsightNum(r.soldQty))}) با سود بالقوه بالا`,
            })),
          });
        }
        if (bundleRows.length) {
          hiddenProfitCards.push({
            id: "bundle-candidates",
            title: "باندل‌های طبیعی فروشگاه",
            subtitle: "این کالاها در فاکتورهای واقعی با هم خریداری شده‌اند.",
            icon: "fa-link",
            tone: "indigo",
            impact: smartInsightMoney(
              bundleRows.reduce(
                (s: number, r: any) => s + smartInsightNum(r.bundleProfit),
                0
              )
            ),
            action: "ساخت پیشنهاد باندل، برچسب قفسه یا پیشنهاد کنار فاکتور",
            rows: bundleRows.slice(0, 5).map((r: any) => ({
              productId: `${r.productAId}-${r.productBId}`,
              title: `${r.productA} + ${r.productB}`,
              metric: `${formatExactNumberText(smartInsightNum(r.togetherOrders))} فاکتور مشترک | سود ${smartInsightMoney(r.bundleProfit)}`,
              reason: "هم‌خرید واقعی در فاکتورهای ثبت‌شده",
            })),
          });
        }
        if (priceLiftRows.length) {
          hiddenProfitCards.push({
            id: "safe-price-lift",
            title: "افزایش قیمت کم‌ریسک",
            subtitle: "کالاهایی که ظرفیت تست افزایش قیمت محدود دارند.",
            icon: "fa-arrow-up-right-dots",
            tone: "amber",
            impact: smartInsightMoney(
              priceLiftRows.reduce(
                (s: number, r: any) => s + smartInsightNum(r.extraProfit),
                0
              )
            ),
            action: "تست افزایش ۲ تا ۳ درصدی برای یک هفته و ثبت نتیجه",
            rows: priceLiftRows.map((r: any) => ({
              productId: r.productId,
              title: r.productName,
              metric: `پیشنهاد ${smartInsightPercent(r.suggestedLiftPct)} | سود اضافه ${smartInsightMoney(r.extraProfit)}`,
              reason: `فروش مناسب، تخفیف پایین (${smartInsightPercent(r.discountRate)}) و حاشیه سود ${smartInsightPercent(r.margin)}`,
            })),
          });
        }

        if (hiddenProfitCards.length) {
          addInsight({
            id: "hidden-profit-detector",
            type: "hidden_profit",
            category: "فرصت سود",
            severity: hiddenProfitCards.length >= 2 ? "high" : "medium",
            score: Math.min(96, 62 + hiddenProfitCards.length * 10),
            confidence: 79,
            icon: "fa-sack-dollar",
            title: "فرصت‌های سود پنهان شناسایی شد",
            summary: `${formatExactNumberText(hiddenProfitCards.length)} مسیر افزایش سود از دل داده فروش و موجودی پیدا شد؛ از کالاهای پرسود کم‌نمایش تا باندل‌های طبیعی.`,
            reasons: hiddenProfitCards.map((c: any) => `${c.title}: ${c.action}`),
            metrics: hiddenProfitCards.map((c: any) => ({
              label: c.title,
              value: c.impact,
            })),
            actions: [
              { label: "بررسی فرصت‌های سود", icon: "fa-sack-dollar" },
              {
                label: "مدیریت کالاها",
                to: "/products",
                icon: "fa-boxes-stacked",
              },
            ],
            target: { cards: hiddenProfitCards },
          });
        }


  return hiddenProfitCards;
}
