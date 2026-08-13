import type moment from "jalali-moment";
import { allAsync, getAsync } from "../../database";
import { predictiveNum } from "./predictiveUtils";

export const buildPredictiveSalesForecast = async (
  end: moment.Moment,
  toISO: string,
) => {
  const historyStartISO = end
    .clone()
    .subtract(55, "day")
    .format("YYYY-MM-DD");
  const recentStartISO = end.clone().subtract(6, "day").format("YYYY-MM-DD");
  const previousStartISO = end
    .clone()
    .subtract(13, "day")
    .format("YYYY-MM-DD");
  const previousEndISO = end
    .clone()
    .subtract(7, "day")
    .format("YYYY-MM-DD");

  const dailyRows = await allAsync(
    `
      SELECT substr(transactionDate, 1, 10) AS day,
             COUNT(*) AS ordersCount,
             COALESCE(SUM(grandTotal), 0) AS totalSales,
             COALESCE(SUM(discount), 0) AS discountTotal
      FROM sales_orders
      WHERE substr(transactionDate, 1, 10) BETWEEN ? AND ?
        AND COALESCE(status, 'active') = 'active'
      GROUP BY substr(transactionDate, 1, 10)
      ORDER BY day ASC
    `,
    [historyStartISO, toISO],
  ).catch(() => []);

  const recent7 = await getAsync(
    `
      SELECT COUNT(DISTINCT substr(transactionDate, 1, 10)) AS activeDays,
             COUNT(*) AS ordersCount,
             COALESCE(SUM(grandTotal), 0) AS totalSales,
             COALESCE(SUM(discount), 0) AS discountTotal
      FROM sales_orders
      WHERE substr(transactionDate, 1, 10) BETWEEN ? AND ?
        AND COALESCE(status, 'active') = 'active'
    `,
    [recentStartISO, toISO],
  ).catch(() => ({}) as any);

  const prev7 = await getAsync(
    `
      SELECT COUNT(DISTINCT substr(transactionDate, 1, 10)) AS activeDays,
             COUNT(*) AS ordersCount,
             COALESCE(SUM(grandTotal), 0) AS totalSales,
             COALESCE(SUM(discount), 0) AS discountTotal
      FROM sales_orders
      WHERE substr(transactionDate, 1, 10) BETWEEN ? AND ?
        AND COALESCE(status, 'active') = 'active'
    `,
    [previousStartISO, previousEndISO],
  ).catch(() => ({}) as any);

  const activeDays = Math.max(1, predictiveNum(recent7?.activeDays));
  const prevActiveDays = Math.max(1, predictiveNum(prev7?.activeDays));
  const recentAvgDaily = predictiveNum(recent7?.totalSales) / activeDays;
  const prevAvgDaily = predictiveNum(prev7?.totalSales) / prevActiveDays;
  const trendPct =
    prevAvgDaily > 0
      ? ((recentAvgDaily - prevAvgDaily) / prevAvgDaily) * 100
      : 0;
  const boundedTrend = Math.max(-0.35, Math.min(0.35, trendPct / 100));
  const tomorrowSalesForecast = Math.max(
    0,
    recentAvgDaily * (1 + boundedTrend * 0.45),
  );
  const next7SalesForecast = Math.max(
    0,
    recentAvgDaily * 7 * (1 + boundedTrend * 0.35),
  );
  const avgTicket =
    predictiveNum(recent7?.ordersCount) > 0
      ? predictiveNum(recent7?.totalSales) /
        Math.max(1, predictiveNum(recent7?.ordersCount))
      : 0;
  const forecastOrders =
    avgTicket > 0
      ? Math.max(0, tomorrowSalesForecast / avgTicket)
      : 0;
  const discountPressure =
    predictiveNum(recent7?.totalSales) > 0
      ? (predictiveNum(recent7?.discountTotal) /
          Math.max(1, predictiveNum(recent7?.totalSales))) *
        100
      : 0;
  const dataPoints = Array.isArray(dailyRows) ? dailyRows.length : 0;

  return {
    dailyRows,
    recent7,
    prev7,
    trendPct,
    tomorrowSalesForecast,
    next7SalesForecast,
    avgTicket,
    forecastOrders,
    discountPressure,
    dataPoints,
  };
};
