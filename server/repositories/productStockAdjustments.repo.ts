import { execAsync, getTypedAsync, runAsync } from "../db/query";

export interface AdjustStockPayload {
  delta: number; // positive => add, negative => reduce
  reason?: string;
  notes?: string;
  createdByUserId?: number | null;
}

type ProductStockQuantityRow = { stock_quantity: number | null };

export const adjustProductStockInDb = async (
  productId: number,
  payload: AdjustStockPayload,
): Promise<{
  productId: number;
  oldQuantity: number;
  newQuantity: number;
  delta: number;
}> => {
  const delta = Number(payload?.delta || 0);
  if (!Number.isFinite(delta) || delta === 0)
    throw new Error("مقدار تغییر موجودی معتبر نیست.");
  const reason = payload?.reason || "اصلاح دستی موجودی";
  const notes = payload?.notes || "";
  const createdByUserId = payload?.createdByUserId ?? null;

  await execAsync("BEGIN TRANSACTION;");
  try {
    const product = await getTypedAsync<ProductStockQuantityRow>(
      `SELECT stock_quantity FROM products WHERE id=?`,
      [productId],
    );
    if (!product) throw new Error("محصول یافت نشد.");
    const oldQuantity = Number(product.stock_quantity) || 0;
    const newQuantity = oldQuantity + delta;
    if (newQuantity < 0)
      throw new Error("موجودی پس از اصلاح نمی‌تواند منفی شود.");

    await runAsync(`UPDATE products SET stock_quantity=? WHERE id=?`, [
      newQuantity,
      productId,
    ]);
    await runAsync(
      `INSERT INTO inventory_logs (productId, oldQuantity, newQuantity, changedAt) VALUES (?,?,?,?)`,
      [productId, oldQuantity, newQuantity, new Date().toISOString()],
    );
    await runAsync(
      `INSERT INTO inventory_adjustments (productId, delta, reason, notes, createdAt, createdByUserId) VALUES (?,?,?,?,?,?)`,
      [
        productId,
        delta,
        reason,
        notes,
        new Date().toISOString(),
        createdByUserId,
      ],
    );

    await execAsync("COMMIT;");
    return { productId, oldQuantity, newQuantity, delta };
  } catch (error: unknown) {
    await execAsync("ROLLBACK;");
    throw error;
  }
};
