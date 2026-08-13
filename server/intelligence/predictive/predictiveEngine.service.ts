import { formatExactNumberText, formatReadablePercentText } from "../../../utils/exactNumber";
import moment from "jalali-moment";
import type { PredictiveBrainData, PredictiveQuery } from "./predictiveTypes";
import { buildCollectionPressure } from "./collectionPressure";
import { buildInventoryStockoutRisks } from "./inventoryStockoutRisk";
import { buildPredictiveSalesForecast } from "./salesForecast";
import { predictiveNum, resolvePredictiveDateRange, roundOneDecimal } from "./predictiveUtils";

export class PredictiveRangeError extends Error {
  constructor() {
    super("بازه زمانی پیش‌بینی نامعتبر است.");
    this.name = "PredictiveRangeError";
  }
}

export const buildPredictiveEngineData = async (
  query: PredictiveQuery,
): Promise<PredictiveBrainData> => {
  const { fromJ, toJ, toISO, isValid } = resolvePredictiveDateRange(query);
  if (!isValid || !toISO) {
    throw new PredictiveRangeError();
  }

  const end = moment(toISO, "YYYY-MM-DD");
  const salesForecast = await buildPredictiveSalesForecast(end, toISO);
  const stockoutRisks = await buildInventoryStockoutRisks(end, toISO);
  const { overdue, dueSoon, collection } = await buildCollectionPressure(
    end,
    toISO,
  );

  const baseConfidence = Math.min(
    94,
    Math.max(
      38,
      42 +
        salesForecast.dataPoints * 2.1 +
        Math.min(20, predictiveNum(salesForecast.recent7?.ordersCount) * 0.8),
    ),
  );
  const confidence = Math.max(
    25,
    Math.min(
      96,
      baseConfidence -
        Math.min(14, Math.abs(salesForecast.trendPct) * 0.12) -
        (salesForecast.discountPressure > 18 ? 6 : 0),
    ),
  );

  const alerts: PredictiveBrainData["alerts"] = [];
  if (salesForecast.trendPct <= -18)
    alerts.push({
      id: "predicted-sales-drop",
      severity: salesForecast.trendPct <= -35 ? "critical" : "high",
      title: "ریسک افت فروش فردا",
      summary: `روند ۷ روز اخیر نسبت به ۷ روز قبل حدود ${formatReadablePercentText(Math.abs(salesForecast.trendPct), 1)} افت دارد.`,
      actionLabel: "بررسی گزارش فروش",
      to: "/reports/sales",
    });
  if (
    stockoutRisks.some((r: any) => ["critical", "high"].includes(r.severity))
  )
    alerts.push({
      id: "stockout-next-days",
      severity: "high",
      title: "ریسک اتمام موجودی در چند روز آینده",
      summary: `${formatExactNumberText(stockoutRisks.filter((r: any) => ["critical", "high"].includes(r.severity)).length)} کالا سیگنال خرید فوری دارد.`,
      actionLabel: "مشاهده پیشنهاد خرید",
      to: "/reports/analysis/suggestions",
    });
  if (predictiveNum(overdue?.overdueCount) > 0 || predictiveNum(dueSoon?.dueSoonCount) > 0)
    alerts.push({
      id: "collection-pressure-next-week",
      severity: predictiveNum(overdue?.overdueCount) > 0 ? "high" : "medium",
      title: "فشار وصول هفته آینده",
      summary: `${formatExactNumberText(predictiveNum(overdue?.overdueCount))} قسط معوق و ${formatExactNumberText(predictiveNum(dueSoon?.dueSoonCount))} قسط نزدیک سررسید وجود دارد.`,
      actionLabel: "مرکز پیگیری وصول",
      to: "/reports/collection-center",
    });
  if (salesForecast.discountPressure >= 18)
    alerts.push({
      id: "discount-pressure",
      severity: "medium",
      title: "احتمال فشار روی حاشیه سود",
      summary: `نسبت تخفیف به فروش ۷ روز اخیر حدود ${formatReadablePercentText(salesForecast.discountPressure, 1)} است.`,
      actionLabel: "بررسی سود واقعی",
      to: "/reports/product-profit-real",
    });

  return {
    from: fromJ,
    to: toJ,
    generatedAt: new Date().toISOString(),
    confidence,
    horizon: {
      tomorrow: end.clone().add(1, "day").format("YYYY-MM-DD"),
      next7DaysUntil: end.clone().add(7, "day").format("YYYY-MM-DD"),
    },
    forecast: {
      tomorrowSales: salesForecast.tomorrowSalesForecast,
      next7Sales: salesForecast.next7SalesForecast,
      tomorrowOrders: salesForecast.forecastOrders,
      avgTicket: salesForecast.avgTicket,
      trendPct: roundOneDecimal(salesForecast.trendPct),
      discountPressure: roundOneDecimal(salesForecast.discountPressure),
    },
    risks: {
      stockout: stockoutRisks,
      collection,
    },
    alerts,
    method: {
      label:
        "میانگین متحرک ۷ روزه + مقایسه ۷ روز قبل + ریسک موجودی بر اساس نرخ مصرف ۱۴ روزه",
      dataPoints: salesForecast.dataPoints,
      warning:
        salesForecast.dataPoints < 10
          ? "داده تاریخی کم است؛ پیش‌بینی را به‌عنوان جهت روند ببین، نه عدد قطعی."
          : "",
    },
  };
};
