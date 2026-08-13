// Dashboard report helpers extracted from legacyRuntime in Phase 1I.

import moment from "jalali-moment";
import { allAsync } from "../query";
import { getDbInstance } from "../core/runtimeBindings";
import type { SalesDataPoint as FrontendSalesDataPoint } from "../../../types";

export const getDashboardSalesChartData = async (
  period: string,
): Promise<FrontendSalesDataPoint[]> => {
  await getDbInstance();

  // بازه‌ها و فرمت گروه‌بندی
  const now = moment().locale("en");
  let start: moment.Moment;
  let fmt: "%Y-%m-%d" | "%Y-%m";
  let labelFn: (s: string) => string;

  if (period === "weekly") {
    // برای نمودار هفتگی، ۷ روز اخیر را با فرمت شمسی (روز و ماه) نمایش می‌دهیم.
    // استفاده از فرمت تقویم جلالی به‌جای نام روز هفته باعث می‌شود برچسب‌ها یکتاتر باشند
    // و عدم نمایش داده که از تکرار نام روزها ناشی می‌شود، برطرف گردد.
    start = now.clone().startOf("day").subtract(6, "days");
    fmt = "%Y-%m-%d";
    labelFn = (iso: string) => {
      // iso ورودی مانند 2025-10-07 را به شمسی تبدیل کرده و به صورت jMM/jDD برمی‌گردانیم
      return moment(iso).locale("fa").format("jMM/jDD");
    };
  } else if (period === "yearly") {
    start = now.clone().startOf("month").subtract(11, "months");
    fmt = "%Y-%m";
    labelFn = (ym: string) =>
      moment(ym + "-01")
        .locale("fa")
        .format("jMMMM");
  } else {
    // monthly = 30 روز اخیر مثل fallback
    start = now.clone().startOf("day").subtract(29, "days");
    fmt = "%Y-%m-%d";
    labelFn = (iso: string) => moment(iso).locale("fa").format("jMM/jDD");
  }

  const startISO = start.format("YYYY-MM-DD");
  const endISO = now.clone().endOf("day").format("YYYY-MM-DD");

  // تجمیع از هر دو منبع: سفارش‌های جدید + تراکنش‌های قدیمی
  const rows = await allAsync(
    `
    SELECT strftime('${fmt}', t.transactionDate) AS date_group, SUM(t.amount) AS sales
      FROM (
        -- سفارش‌ها: مبلغ نهایی منهای مجموع مبلغ اقلام گوشی‌هایی که مرجوع شده‌اند
        SELECT so.transactionDate AS transactionDate,
               (so.grandTotal
                - COALESCE((
                    SELECT SUM(soi.totalPrice)
                      FROM sales_order_items soi
                      JOIN phones p2 ON soi.itemType='phone' AND soi.itemId=p2.id
                     WHERE soi.orderId = so.id AND p2.status NOT IN ('فروخته شده','فروخته شده (قسطی)')
                   ), 0)
               ) AS amount
          FROM sales_orders so
         WHERE (so.status IS NULL OR so.status = 'active')
        UNION ALL
        -- تراکنش‌های تکی: فقط زمانی محسوب می‌شوند که گوشی همچنان فروخته شده باشد
        SELECT st.transactionDate AS transactionDate,
               st.totalPrice AS amount
          FROM sales_transactions st
          LEFT JOIN phones ph ON st.itemType='phone' AND st.itemId=ph.id
         WHERE (st.itemType <> 'phone' OR ph.status IN ('فروخته شده','فروخته شده (قسطی)'))
      ) t
     WHERE date(t.transactionDate) BETWEEN date(?) AND date(?)
     GROUP BY date_group
     ORDER BY date_group ASC
    `,
    [startISO, endISO],
  );

  // داده‌های موجود را در یک نقشه ذخیره کن تا بتوانیم بازهٔ کامل را پر کنیم
  const dataMap = new Map<string, number>();
  rows.forEach((r: any) => {
    dataMap.set(r.date_group, Number(r.sales) || 0);
  });

  // strftime pattern ها را به فرمت moment معادل تبدیل کن
  const groupFmt = fmt === "%Y-%m-%d" ? "YYYY-MM-DD" : "YYYY-MM";
  const result: FrontendSalesDataPoint[] = [];

  // بازهٔ تکرار: اگر بازه سالانه باشد گام ماهیانه می‌شود و در غیر این صورت روزانه
  const stepUnit = period === "yearly" ? "month" : "day";
  let cursor = start.clone();
  // از زمان شروع تا پایان (امروز) پیمایش کن و برای هر بازه مقدار را از dataMap بگیر
  while (cursor.isSameOrBefore(now, stepUnit as any)) {
    const key = cursor.locale("en").format(groupFmt);
    const salesValue = dataMap.get(key) || 0;
    result.push({
      name: labelFn(key),
      sales: salesValue,
    });
    cursor.add(1, stepUnit as any);
  }
  return result;
};


