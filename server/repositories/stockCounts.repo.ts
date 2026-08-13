import {
  allTypedAsync,
  execAsync,
  getTypedAsync,
  runAsync,
} from "../db/query";

export interface StockCountCreatePayload {
  title: string;
  notes?: string;
  createdByUserId?: number | null;
}

export type StockCountStatus = "open" | "completed";

export interface StockCountRow {
  id: number;
  title: string;
  status: StockCountStatus;
  notes: string | null;
  createdAt: string;
  completedAt: string | null;
  createdByUserId: number | null;
}

export interface StockCountItemRow {
  id: number;
  stockCountId: number;
  productId: number;
  expectedQty: number;
  countedQty: number;
}

export interface StockCountItemWithProductRow extends StockCountItemRow {
  productName: string;
}

export interface StockCountDetails extends StockCountRow {
  items: StockCountItemWithProductRow[];
}

type StockCountStatusRow = Pick<StockCountRow, "status">;
type ProductStockQuantityRow = { stock_quantity: number | null };

export const createStockCountInDb = async (
  payload: StockCountCreatePayload,
): Promise<StockCountDetails | null> => {
  if (!payload?.title?.trim()) throw new Error("عنوان انبارگردانی الزامی است.");
  const ins = await runAsync(
    `INSERT INTO stock_counts (title, status, notes, createdAt, createdByUserId) VALUES (?,?,?,?,?)`,
    [
      payload.title.trim(),
      "open",
      payload.notes || "",
      new Date().toISOString(),
      payload.createdByUserId ?? null,
    ],
  );
  return await getStockCountByIdFromDb(Number(ins.lastID));
};

export const getAllStockCountsFromDb = async (): Promise<StockCountRow[]> => {
  return await allTypedAsync<StockCountRow>(
    `SELECT id, title, status, notes, createdAt, completedAt, createdByUserId
       FROM stock_counts
      ORDER BY datetime(createdAt) DESC, id DESC`,
  );
};

export const getStockCountByIdFromDb = async (
  stockCountId: number,
): Promise<StockCountDetails | null> => {
  const stockCount = await getTypedAsync<StockCountRow>(
    `SELECT id, title, status, notes, createdAt, completedAt, createdByUserId
       FROM stock_counts
      WHERE id = ?`,
    [stockCountId],
  );
  if (!stockCount) return null;

  const items = await allTypedAsync<StockCountItemWithProductRow>(
    `SELECT
       sci.id,
       sci.stockCountId,
       sci.productId,
       sci.expectedQty,
       sci.countedQty,
       pr.name AS productName
       FROM stock_count_items sci
       JOIN products pr ON pr.id = sci.productId
      WHERE sci.stockCountId = ?
      ORDER BY pr.name ASC`,
    [stockCountId],
  );
  return { ...stockCount, items };
};

export const upsertStockCountItemInDb = async (
  stockCountId: number,
  productId: number,
  countedQty: number,
): Promise<boolean> => {
  const stockCount = await getTypedAsync<StockCountStatusRow>(
    `SELECT status FROM stock_counts WHERE id=?`,
    [stockCountId],
  );
  if (!stockCount) throw new Error("انبارگردانی یافت نشد.");
  if (stockCount.status !== "open")
    throw new Error("این انبارگردانی بسته شده است.");

  const product = await getTypedAsync<ProductStockQuantityRow>(
    `SELECT stock_quantity FROM products WHERE id=?`,
    [productId],
  );
  if (!product) throw new Error("محصول یافت نشد.");
  const expectedQty = Number(product.stock_quantity) || 0;
  const normalizedCountedQty = Math.floor(Number(countedQty));
  if (!Number.isFinite(normalizedCountedQty) || normalizedCountedQty < 0)
    throw new Error("مقدار شمارش‌شده نامعتبر است.");

  await runAsync(
    `INSERT INTO stock_count_items (stockCountId, productId, expectedQty, countedQty)
     VALUES (?,?,?,?)
     ON CONFLICT(stockCountId, productId) DO UPDATE SET countedQty=excluded.countedQty`,
    [stockCountId, productId, expectedQty, normalizedCountedQty],
  );
  return true;
};

export const completeStockCountInDb = async (
  stockCountId: number,
  createdByUserId?: number | null,
): Promise<StockCountDetails | null> => {
  const stockCount = await getTypedAsync<StockCountRow>(
    `SELECT id, title, status, notes, createdAt, completedAt, createdByUserId
       FROM stock_counts
      WHERE id=?`,
    [stockCountId],
  );
  if (!stockCount) throw new Error("انبارگردانی یافت نشد.");
  if (stockCount.status !== "open")
    throw new Error("این انبارگردانی قبلاً بسته شده است.");

  const items = await allTypedAsync<StockCountItemRow>(
    `SELECT id, stockCountId, productId, expectedQty, countedQty
       FROM stock_count_items
      WHERE stockCountId=?`,
    [stockCountId],
  );
  await execAsync("BEGIN TRANSACTION;");
  try {
    for (const item of items) {
      const expectedQty = Number(item.expectedQty) || 0;
      const countedQty = Number(item.countedQty) || 0;
      const delta = countedQty - expectedQty;
      if (delta === 0) continue;

      const product = await getTypedAsync<ProductStockQuantityRow>(
        `SELECT stock_quantity FROM products WHERE id=?`,
        [item.productId],
      );
      if (!product) continue;
      const oldQty = Number(product.stock_quantity) || 0;
      const newQty = oldQty + delta;
      if (newQty < 0) throw new Error("نتیجه موجودی منفی شد. عملیات متوقف شد.");

      await runAsync(`UPDATE products SET stock_quantity=? WHERE id=?`, [
        newQty,
        item.productId,
      ]);
      await runAsync(
        `INSERT INTO inventory_logs (productId, oldQuantity, newQuantity, changedAt) VALUES (?,?,?,?)`,
        [item.productId, oldQty, newQty, new Date().toISOString()],
      );
      await runAsync(
        `INSERT INTO inventory_adjustments (productId, delta, reason, notes, createdAt, createdByUserId)
         VALUES (?,?,?,?,?,?)`,
        [
          item.productId,
          delta,
          `انبارگردانی #${stockCountId}`,
          `اصلاح موجودی از ${expectedQty} به ${countedQty}`,
          new Date().toISOString(),
          createdByUserId ?? null,
        ],
      );
    }

    await runAsync(
      `UPDATE stock_counts SET status='completed', completedAt=? WHERE id=?`,
      [new Date().toISOString(), stockCountId],
    );
    await execAsync("COMMIT;");
    return await getStockCountByIdFromDb(stockCountId);
  } catch (error: unknown) {
    await execAsync("ROLLBACK;");
    throw error;
  }
};
