import { formatExactNumberText } from "../../../utils/exactNumber";
import {
  smartInsightMoney,
  smartInsightNum,
  smartInsightSafeRows,
} from "./smartInsightCore.service";

type AddInsight = (raw: any) => void;
type AiIsEnabled = (key: string) => boolean;

export async function buildHiddenLossInsight({
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
  const hiddenLossRows = aiIsEnabled("profit_engine")
    ? await smartInsightSafeRows(
        `
        WITH order_item_totals AS (
          SELECT orderId, SUM(COALESCE(totalPrice, 0)) AS orderBase
          FROM sales_order_items
          GROUP BY orderId
        )
        SELECT * FROM (
          SELECT
            'نقدی' AS saleType,
            so.id AS saleId,
            so.transactionDate AS saleDate,
            COALESCE(c.fullName, 'مشتری مهمان') AS customerName,
            ph.model AS phoneModel,
            ph.imei AS imei,
            COALESCE(soi.totalPrice, 0) - CASE WHEN COALESCE(oit.orderBase, 0) > 0 THEN COALESCE(so.discount, 0) * (COALESCE(soi.totalPrice, 0) / COALESCE(oit.orderBase, 1)) ELSE 0 END AS saleNet,
            COALESCE(NULLIF(ph.currentPurchasePrice, 0), NULLIF(soi.buyPrice, 0), ph.purchasePrice, 0) AS replacementPrice,
            (COALESCE(soi.totalPrice, 0) - CASE WHEN COALESCE(oit.orderBase, 0) > 0 THEN COALESCE(so.discount, 0) * (COALESCE(soi.totalPrice, 0) / COALESCE(oit.orderBase, 1)) ELSE 0 END) - COALESCE(NULLIF(ph.currentPurchasePrice, 0), NULLIF(soi.buyPrice, 0), ph.purchasePrice, 0) AS realProfit
          FROM sales_order_items soi
          JOIN sales_orders so ON so.id = soi.orderId
          JOIN order_item_totals oit ON oit.orderId = so.id
          JOIN phones ph ON soi.itemType = 'phone' AND soi.itemId = ph.id
          LEFT JOIN customers c ON c.id = so.customerId
          WHERE date(substr(so.transactionDate, 1, 10)) BETWEEN date(?) AND date(?) AND COALESCE(so.status, 'active') = 'active'
          UNION ALL
          SELECT
            'اقساطی' AS saleType,
            ins.id AS saleId,
            substr(COALESCE(ins.saleDateISO, ins.dateCreated, ''), 1, 10) AS saleDate,
            COALESCE(c.fullName, 'مشتری مهمان') AS customerName,
            ph.model AS phoneModel,
            ph.imei AS imei,
            COALESCE(ins.actualSalePrice, 0) AS saleNet,
            COALESCE(NULLIF(ph.currentPurchasePrice, 0), ph.purchasePrice, 0) AS replacementPrice,
            COALESCE(ins.actualSalePrice, 0) - COALESCE(NULLIF(ph.currentPurchasePrice, 0), ph.purchasePrice, 0) AS realProfit
          FROM installment_sales ins
          JOIN phones ph ON ph.id = ins.phoneId
          LEFT JOIN customers c ON c.id = ins.customerId
          WHERE substr(COALESCE(ins.saleDateISO, ins.dateCreated, ''), 1, 10) BETWEEN ? AND ?
        ) x
        WHERE realProfit < 0
        ORDER BY realProfit ASC
        LIMIT 8
      `,
        [fromISO, toISO, fromISO, toISO],
      )
    : [];

  if (hiddenLossRows.length) {
    const totalLoss = hiddenLossRows.reduce(
      (s: number, r: any) => s + Math.abs(Math.min(0, smartInsightNum(r.realProfit))),
      0,
    );
    addInsight({
      id: "hidden-loss-mobile-replacement-price",
      type: "hidden_loss",
      category: "سود واقعی گوشی",
      severity: totalLoss >= 5000000 ? "critical" : "high",
      score: Math.min(98, 58 + totalLoss / 250000),
      confidence: 84,
      icon: "fa-mobile-screen-button",
      title: "ضرر پنهان بر اساس قیمت خرید روز دیده شد",
      summary: `${formatExactNumberText(hiddenLossRows.length)} فروش گوشی با قیمت جایگزینی فعلی سود واقعی منفی دارد.`,
      reasons: hiddenLossRows
        .slice(0, 5)
        .map(
          (r: any) =>
            `${r.saleType} ${r.phoneModel || ""} (${r.imei || "بدون IMEI"}): فروش خالص ${smartInsightMoney(r.saleNet)}، قیمت خرید روز ${smartInsightMoney(r.replacementPrice)}، نتیجه ${smartInsightMoney(r.realProfit)}`,
        ),
      metrics: [
        {
          label: "تعداد فروش زیان‌ده",
          value: formatExactNumberText(hiddenLossRows.length),
        },
        { label: "زیان پنهان", value: smartInsightMoney(totalLoss) },
        {
          label: "بدترین فروش",
          value: smartInsightMoney(hiddenLossRows[0]?.realProfit),
        },
      ],
      actions: [
        {
          label: "تحلیل گوشی نقد و اقساط",
          to: "/reports/mobile-sales-analytics",
          icon: "fa-mobile-screen-button",
        },
      ],
      target: { rows: hiddenLossRows },
    });
  }

  return hiddenLossRows;
}
