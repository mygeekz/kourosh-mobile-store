import { formatExactNumberText } from "../../../utils/exactNumber";
import { runAsync } from "../../database";
import {
  smartInsightMoney,
  smartInsightNum,
  smartInsightPercent,
  smartInsightRound,
  smartInsightSafeRows,
} from "./smartInsightCore.service";

type RealProfitEngineParams = {
  fromISO: string;
  toISO: string;
  userId?: number | string | null;
  aiIsEnabled: (key: string) => boolean;
  addInsight: (raw: any) => void;
};

const buildRealProfitEngine = async ({
  fromISO,
  toISO,
  userId,
  aiIsEnabled,
  addInsight,
}: RealProfitEngineParams) => {
  const profitRows = aiIsEnabled("profit_engine")
    ? await smartInsightSafeRows(
        `
        SELECT
          so.id AS orderId,
          so.transactionDate,
          COALESCE(so.paymentMethod, 'cash') AS paymentMethod,
          COALESCE(so.subtotal, 0) AS subtotal,
          COALESCE(so.grandTotal, 0) AS grandTotal,
          COALESCE(so.discount, 0) AS invoiceDiscount,
          COALESCE(SUM(COALESCE(soi.quantity,0) * COALESCE(soi.unitPrice,0)), 0) AS lineGross,
          COALESCE(SUM(COALESCE(soi.discountPerItem,0)), 0) AS itemDiscount,
          COALESCE(SUM(COALESCE(soi.totalPrice,0)), 0) AS lineNet,
          COALESCE(SUM(COALESCE(soi.totalPrice,0) - (COALESCE(NULLIF(soi.buyPrice,0), p.purchasePrice, 0) * COALESCE(soi.quantity,0))), 0) AS lineProfitBeforeInvoiceDiscount
        FROM sales_orders so
        LEFT JOIN sales_order_items soi ON soi.orderId = so.id
        LEFT JOIN products p ON soi.itemType = 'inventory' AND soi.itemId = p.id
        WHERE date(substr(so.transactionDate, 1, 10)) BETWEEN date(?) AND date(?) AND COALESCE(so.status, 'active') = 'active'
        GROUP BY so.id, so.transactionDate, so.paymentMethod, so.subtotal, so.grandTotal, so.discount
      `,
        [fromISO, toISO]
      )
    : [];

  const profitInvoices = (profitRows || []).map((r: any) => {
    const grandTotal = smartInsightNum(r.grandTotal);
    const subtotal =
      smartInsightNum(r.subtotal) || smartInsightNum(r.lineGross) || grandTotal;
    const invoiceDiscount = smartInsightNum(r.invoiceDiscount);
    const lineProfitBeforeInvoiceDiscount = smartInsightNum(
      r.lineProfitBeforeInvoiceDiscount
    );
    const invoiceDiscountShare =
      invoiceDiscount > 0 ? invoiceDiscount : Math.max(0, subtotal - grandTotal);
    const realProfit = lineProfitBeforeInvoiceDiscount - invoiceDiscountShare;
    const isDeferred = ["credit", "installment", "mixed"].includes(
      String(r.paymentMethod || "").toLowerCase()
    );
    const recognitionRate = isDeferred ? 0.5 : 1;
    const recognizedProfit = realProfit * recognitionRate;
    const profitAtRisk = realProfit - recognizedProfit;
    const marginPct = grandTotal > 0 ? (realProfit / grandTotal) * 100 : 0;
    const riskScore = Math.min(
      100,
      Math.max(
        0,
        (realProfit < 0 ? 55 : 0) +
          (marginPct < 8 ? 22 : 0) +
          (invoiceDiscountShare > 0 && subtotal > 0
            ? Math.min(24, (invoiceDiscountShare / subtotal) * 100)
            : 0) +
          (isDeferred ? 14 : 0)
      )
    );
    return {
      orderId: r.orderId,
      transactionDate: r.transactionDate,
      paymentMethod: r.paymentMethod,
      grandTotal: smartInsightRound(grandTotal),
      invoiceDiscount: smartInsightRound(invoiceDiscountShare),
      realProfit: smartInsightRound(realProfit),
      recognizedProfit: smartInsightRound(recognizedProfit),
      profitAtRisk: smartInsightRound(profitAtRisk),
      marginPct: smartInsightRound(marginPct),
      riskScore: (riskScore),
      label:
        realProfit < 0
          ? "زیان‌ده"
          : marginPct < 8
            ? "حاشیه سود ضعیف"
            : isDeferred
              ? "سود وصول‌نشده"
              : "سود سالم",
      to: "/invoices/" + r.orderId,
    };
  });

  const profitSummary = profitInvoices.reduce(
    (acc: any, r: any) => {
      acc.grossSales += smartInsightNum(r.grandTotal);
      acc.realProfit += smartInsightNum(r.realProfit);
      acc.recognizedProfit += smartInsightNum(r.recognizedProfit);
      acc.profitAtRisk += smartInsightNum(r.profitAtRisk);
      acc.negativeProfitCount += smartInsightNum(r.realProfit) < 0 ? 1 : 0;
      acc.lowMarginCount +=
        smartInsightNum(r.realProfit) >= 0 && smartInsightNum(r.marginPct) < 8
          ? 1
          : 0;
      acc.deferredCount += smartInsightNum(r.profitAtRisk) > 0 ? 1 : 0;
      return acc;
    },
    {
      grossSales: 0,
      realProfit: 0,
      recognizedProfit: 0,
      profitAtRisk: 0,
      negativeProfitCount: 0,
      lowMarginCount: 0,
      deferredCount: 0,
    }
  );
  profitSummary.marginPct =
    profitSummary.grossSales > 0
      ? smartInsightRound(
          (profitSummary.realProfit / profitSummary.grossSales) * 100
        )
      : 0;
  profitSummary.qualityScore = Math.max(
    0,
    Math.min(
      100,
      (
        64 +
          Math.min(22, smartInsightNum(profitSummary.marginPct)) -
          smartInsightNum(profitSummary.negativeProfitCount) * 12 -
          smartInsightNum(profitSummary.lowMarginCount) * 4 -
          (profitSummary.realProfit > 0
            ? Math.min(
                18,
                (profitSummary.profitAtRisk /
                  Math.max(1, profitSummary.realProfit)) *
                  28
              )
            : 0)
      )
    )
  );
  const profitEngine = {
    summary: {
      grossSales: smartInsightRound(profitSummary.grossSales),
      realProfit: smartInsightRound(profitSummary.realProfit),
      recognizedProfit: smartInsightRound(profitSummary.recognizedProfit),
      profitAtRisk: smartInsightRound(profitSummary.profitAtRisk),
      marginPct: smartInsightRound(profitSummary.marginPct),
      qualityScore: profitSummary.qualityScore,
      negativeProfitCount: profitSummary.negativeProfitCount,
      lowMarginCount: profitSummary.lowMarginCount,
      deferredCount: profitSummary.deferredCount,
    },
    riskyInvoices: profitInvoices
      .filter(
        (r: any) =>
          smartInsightNum(r.riskScore) >= 20 ||
          smartInsightNum(r.realProfit) < 0 ||
          smartInsightNum(r.profitAtRisk) > 0
      )
      .sort(
        (a: any, b: any) =>
          smartInsightNum(b.riskScore) - smartInsightNum(a.riskScore)
      )
      .slice(0, 8),
  };

  if (profitInvoices.length) {
    await runAsync(
      `
          INSERT INTO profit_engine_snapshots (periodFrom, periodTo, grossSales, realProfit, recognizedProfit, profitAtRisk, marginPct, userId)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
      [
        fromISO,
        toISO,
        profitEngine.summary.grossSales,
        profitEngine.summary.realProfit,
        profitEngine.summary.recognizedProfit,
        profitEngine.summary.profitAtRisk,
        profitEngine.summary.marginPct,
        userId || null,
      ]
    );
  }

  if (
    profitEngine.summary.negativeProfitCount > 0 ||
    profitEngine.summary.lowMarginCount > 0 ||
    profitEngine.summary.profitAtRisk > 0
  ) {
    addInsight({
      id: "real-profit-engine-watch",
      type: "real_profit",
      category: "سود واقعی",
      severity:
        profitEngine.summary.negativeProfitCount > 0
          ? "critical"
          : profitEngine.summary.qualityScore < 58
            ? "high"
            : "medium",
      score: Math.min(99, 100 - profitEngine.summary.qualityScore + 42),
      confidence: 88,
      icon: "fa-sack-dollar",
      title: "موتور سود واقعی، نقاط حساس سود را پیدا کرد",
      summary:
        "سود واقعی بازه " +
        smartInsightMoney(profitEngine.summary.realProfit) +
        " است؛ " +
        formatExactNumberText(profitEngine.summary.negativeProfitCount) +
        " فاکتور زیان‌ده و " +
        formatExactNumberText(profitEngine.summary.deferredCount) +
        " فاکتور با سود در خطر دیده شد.",
      reasons: [
        "حاشیه سود واقعی: " + smartInsightPercent(profitEngine.summary.marginPct),
        "سود شناسایی‌شده: " +
          smartInsightMoney(profitEngine.summary.recognizedProfit),
        "سود در خطر/وصول‌نشده: " +
          smartInsightMoney(profitEngine.summary.profitAtRisk),
        "تخفیف کلی فاکتور از سود واقعی کسر شده و فروش اعتباری با شناسایی محافظه‌کارانه دیده می‌شود.",
      ],
      metrics: [
        {
          label: "سود واقعی",
          value: smartInsightMoney(profitEngine.summary.realProfit),
        },
        {
          label: "کیفیت سود",
          value: smartInsightPercent(profitEngine.summary.qualityScore),
        },
        {
          label: "در خطر",
          value: smartInsightMoney(profitEngine.summary.profitAtRisk),
        },
      ],
      actions: [
        {
          label: "بررسی فاکتورهای حساس",
          to: "/reports/product-sales",
          icon: "fa-scale-balanced",
        },
      ],
      target: { profitEngine },
    });
  }

  return profitEngine;
};

export { buildRealProfitEngine };
