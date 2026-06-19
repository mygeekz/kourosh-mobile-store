import { getDbInstance } from "./database";

/**
 * گزارش خلاصه فروش
 * - totalOrders: تعداد کل سفارش‌ها
 * - totalSales: مجموع فروش (SUM(totalPrice))
 *
 * نکته: getDbInstance در database.ts اکسپورت شده و DB را به‌صورت singleton مدیریت می‌کند.
 */
export async function salesSummary(): Promise<{ totalOrders: number; totalSales: number | null }> {
  const db = await getDbInstance();
  if (!db) {
    throw new Error("Database is not initialized");
  }

  return new Promise((resolve, reject) => {
    db.get(
      "SELECT COUNT(*) as totalOrders, SUM(totalPrice) as totalSales FROM sales_orders",
      [],
      (err: any, row: any) => {
        if (err) return reject(err);
        resolve({
          totalOrders: Number(row?.totalOrders ?? 0),
          totalSales: row?.totalSales != null ? Number(row.totalSales) : null
        });
      }
    );
  });
}
