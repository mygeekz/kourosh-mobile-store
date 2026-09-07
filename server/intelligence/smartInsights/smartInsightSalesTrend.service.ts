import {
  smartInsightMoney,
  smartInsightNum,
  smartInsightPercent,
  smartInsightSafeOne,
} from "./smartInsightCore.service";

type AddInsight = (raw: any) => void;

export type SmartInsightSalesTrendResult = {
  salesStats: any;
  prevStats: any;
  todayStats: any;
  activeDays: number;
  prevActiveDays: number;
  avgDaily: number;
  prevAvgDaily: number;
  todaySales: number;
  trendPct: number;
};

export async function buildSalesTrendInsights({
  fromISO,
  toISO,
  previousStartISO,
  previousEndISO,
  todayISO,
  addInsight,
}: {
  fromISO: string;
  toISO: string;
  previousStartISO: string;
  previousEndISO: string;
  todayISO: string;
  addInsight: AddInsight;
}): Promise<SmartInsightSalesTrendResult> {
  const salesStats = await smartInsightSafeOne(
    `
        SELECT
          COUNT(*) AS ordersCount,
          COALESCE(SUM(grandTotal), 0) AS totalSales,
          COALESCE(SUM(discount), 0) AS invoiceDiscount,
          COUNT(DISTINCT transactionDate) AS activeDays,
          COUNT(DISTINCT customerId) AS customersCount
        FROM sales_orders
        WHERE date(substr(transactionDate, 1, 10)) BETWEEN date(?) AND date(?)
          AND COALESCE(status, 'active') = 'active'
      `,
    [fromISO, toISO],
  );

  const prevStats = await smartInsightSafeOne(
    `
        SELECT
          COUNT(*) AS ordersCount,
          COALESCE(SUM(grandTotal), 0) AS totalSales,
          COUNT(DISTINCT transactionDate) AS activeDays
        FROM sales_orders
        WHERE date(substr(transactionDate, 1, 10)) BETWEEN date(?) AND date(?)
          AND COALESCE(status, 'active') = 'active'
      `,
    [previousStartISO, previousEndISO],
  );

  const todayStats = await smartInsightSafeOne(
    `
        SELECT COUNT(*) AS ordersCount, COALESCE(SUM(grandTotal), 0) AS totalSales, COALESCE(SUM(discount), 0) AS discount
        FROM sales_orders
        WHERE transactionDate = ? AND COALESCE(status, 'active') = 'active'
      `,
    [todayISO],
  );

  const activeDays = Math.max(1, smartInsightNum(salesStats.activeDays));
  const prevActiveDays = Math.max(1, smartInsightNum(prevStats.activeDays));
  const avgDaily = smartInsightNum(salesStats.totalSales) / activeDays;
  const prevAvgDaily = smartInsightNum(prevStats.totalSales) / prevActiveDays;
  const todaySales = smartInsightNum(todayStats.totalSales);
  const trendPct =
    prevAvgDaily > 0 ? ((avgDaily - prevAvgDaily) / prevAvgDaily) * 100 : 0;

  if (prevAvgDaily > 0 && trendPct <= -18) {
    addInsight({
      id: "sales-drop-vs-previous-period",
      type: "sales_drop",
      category: "فروش",
      severity: trendPct <= -35 ? "critical" : "high",
      score: Math.min(100, Math.abs(trendPct) * 1.7),
      confidence: 82,
      icon: "fa-arrow-trend-down",
      title: "افت فروش نسبت به دوره قبل شناسایی شد",
      summary: `میانگین فروش روزانه این بازه حدود ${smartInsightPercent(Math.abs(trendPct))} کمتر از دوره قبل است.`,
      reasons: [
        `میانگین روزانه دوره فعلی: ${smartInsightMoney(avgDaily)}`,
        `میانگین روزانه دوره قبل: ${smartInsightMoney(prevAvgDaily)}`,
        "این مقایسه با تعداد روزهای فعال فروش نرمال‌سازی شده است.",
      ],
      metrics: [
        { label: "افت", value: smartInsightPercent(Math.abs(trendPct)) },
        { label: "میانگین فعلی", value: smartInsightMoney(avgDaily) },
        { label: "میانگین قبل", value: smartInsightMoney(prevAvgDaily) },
      ],
      actions: [
        {
          label: "بررسی فروش غیرگوشی",
          to: "/reports/product-sales",
          icon: "fa-boxes-stacked",
        },
        {
          label: "بررسی فروش موبایل",
          to: "/reports/mobile-sales-analytics",
          icon: "fa-mobile-screen-button",
        },
      ],
    });
  } else if (prevAvgDaily > 0 && trendPct >= 22) {
    addInsight({
      id: "sales-growth-vs-previous-period",
      type: "sales_growth",
      category: "فروش",
      severity: "positive",
      score: Math.min(100, trendPct * 1.4),
      confidence: 80,
      icon: "fa-arrow-trend-up",
      title: "رشد فروش معنادار دیده می‌شود",
      summary: `میانگین فروش روزانه حدود ${smartInsightPercent(trendPct)} بهتر از دوره قبل است.`,
      reasons: [
        "رشد با مقایسه بازه فعلی و بازه قبلی هم‌اندازه محاسبه شده است.",
        "بهتر است کالاهای پرفروش این بازه برای خرید مجدد بررسی شوند.",
      ],
      metrics: [
        { label: "رشد", value: smartInsightPercent(trendPct) },
        { label: "میانگین فعلی", value: smartInsightMoney(avgDaily) },
        {
          label: "فروش امروز/انتهای بازه",
          value: smartInsightMoney(todaySales),
        },
      ],
      actions: [
        {
          label: "مشاهده پیشنهاد خرید",
          to: "/reports/analysis/suggestions",
          icon: "fa-lightbulb",
        },
      ],
    });
  }

  return {
    salesStats,
    prevStats,
    todayStats,
    activeDays,
    prevActiveDays,
    avgDaily,
    prevAvgDaily,
    todaySales,
    trendPct,
  };
}
