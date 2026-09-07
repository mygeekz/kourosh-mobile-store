import type { RepairPart } from "../../types";
import { execAsync, getAsync, runAsync } from "../db/query";

export const addPartToRepairInDb = async (
  repairId: number,
  productId: number,
  quantityUsed: number,
): Promise<RepairPart> => {
  await execAsync("BEGIN TRANSACTION;");
  try {
    const product = await getAsync(
      "SELECT stock_quantity FROM products WHERE id = ?",
      [productId],
    );
    if (!product) throw new Error("محصول یافت نشد.");
    if (product.stock_quantity < quantityUsed)
      throw new Error("موجودی محصول در انبار کافی نیست.");

    await runAsync(
      "UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?",
      [quantityUsed, productId],
    );
    const result = await runAsync(
      `INSERT INTO repair_parts (repairId, productId, quantityUsed) VALUES (?, ?, ?)`,
      [repairId, productId, quantityUsed],
    );

    await execAsync("COMMIT;");
    return await getAsync(
      "SELECT rp.*, p.name as productName, p.sellingPrice as pricePerItem FROM repair_parts rp JOIN products p ON rp.productId = p.id WHERE rp.id = ?",
      [result.lastID],
    );
  } catch (err: any) {
    await execAsync("ROLLBACK;");
    throw err;
  }
};

export const deletePartFromRepairInDb = async (
  partId: number,
): Promise<boolean> => {
  await execAsync("BEGIN TRANSACTION;");
  try {
    const part = await getAsync(
      "SELECT productId, quantityUsed FROM repair_parts WHERE id = ?",
      [partId],
    );
    if (!part) throw new Error("قطعه مصرفی یافت نشد.");

    await runAsync(
      "UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?",
      [part.quantityUsed, part.productId],
    );
    const result = await runAsync("DELETE FROM repair_parts WHERE id = ?", [
      partId,
    ]);

    await execAsync("COMMIT;");
    return result.changes > 0;
  } catch (err: any) {
    await execAsync("ROLLBACK;");
    throw err;
  }
};
