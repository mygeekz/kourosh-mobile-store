import { execAsync, getAsync, runAsync } from "../db/query";
import { getPurchaseByIdFromDb as getPurchaseByIdFromReadRepo } from "./purchaseReads.repo";

export interface PurchaseReceiptItemPayload {
  productId: number;
  quantity: number;
  unitCost: number;
}

export interface PurchaseReceiptPayload {
  supplierId?: number | null;
  invoiceNumber?: string | null;
  notes?: string | null;
  items: PurchaseReceiptItemPayload[];
  createdByUserId?: number;
  purchaseDateISO?: string; // optional ISO datetime
}

type AddPartnerLedgerEntry = (
  partnerId: number,
  description: string,
  debit: number,
  credit: number,
  entryDate: string,
  refType: string,
  refId: number,
) => Promise<unknown>;

interface CreatePurchaseReceiptDependencies {
  addPartnerLedgerEntry: AddPartnerLedgerEntry;
  getPurchaseById?: (purchaseId: number) => Promise<unknown>;
}

export const createPurchaseReceiptInDb = async (
  payload: PurchaseReceiptPayload,
  dependencies: CreatePurchaseReceiptDependencies,
) => {
  if (!payload?.items?.length) throw new Error("لیست اقلام خرید خالی است.");
  const supplierId = payload.supplierId ?? null;
  const invoiceNumber = payload.invoiceNumber ?? null;
  const notes = payload.notes ?? "";
  const createdByUserId = payload.createdByUserId ?? null;
  const purchaseDate = payload.purchaseDateISO || new Date().toISOString();

  await execAsync("BEGIN TRANSACTION;");
  try {
    const ins = await runAsync(
      `INSERT INTO purchases (supplierId, invoiceNumber, notes, totalCost, purchaseDate, createdByUserId)
       VALUES (?,?,?,?,?,?)`,
      [supplierId, invoiceNumber, notes, 0, purchaseDate, createdByUserId],
    );
    const purchaseId = ins.lastID as number;

    let totalCost = 0;

    for (const it of payload.items) {
      const productId = Number(it.productId);
      const quantity = Math.floor(Number(it.quantity));
      const unitCost = Number(it.unitCost);

      if (!productId || quantity <= 0)
        throw new Error("آیتم خرید نامعتبر است.");
      if (!Number.isFinite(unitCost) || unitCost < 0)
        throw new Error("قیمت خرید نامعتبر است.");

      const pr = await getAsync(
        `SELECT id, name, stock_quantity, purchasePrice FROM products WHERE id=?`,
        [productId],
      );
      if (!pr) throw new Error(`محصول با شناسه ${productId} یافت نشد.`);

      const oldQty = Number(pr.stock_quantity) || 0;
      const newQty = oldQty + quantity;

      // Weighted average for purchasePrice (optional)
      let newPurchasePrice = Number(pr.purchasePrice) || 0;
      if (unitCost > 0) {
        const oldValue = newPurchasePrice * oldQty;
        const addValue = unitCost * quantity;
        const denom = oldQty + quantity;
        newPurchasePrice = denom > 0 ? (oldValue + addValue) / denom : unitCost;
      }

      await runAsync(
        `UPDATE products SET stock_quantity=?, purchasePrice=? WHERE id=?`,
        [newQty, newPurchasePrice, productId],
      );
      await runAsync(
        `INSERT INTO inventory_logs (productId, oldQuantity, newQuantity, changedAt) VALUES (?,?,?,?)`,
        [productId, oldQty, newQty, purchaseDate],
      );

      const lineTotal = unitCost * quantity;
      totalCost += lineTotal;

      await runAsync(
        `INSERT INTO purchase_items (purchaseId, productId, quantity, unitCost, lineTotal) VALUES (?,?,?,?,?)`,
        [purchaseId, productId, quantity, unitCost, lineTotal],
      );
    }

    await runAsync(`UPDATE purchases SET totalCost=? WHERE id=?`, [
      totalCost,
      purchaseId,
    ]);

    if (supplierId && totalCost > 0) {
      const desc =
        `ثبت خرید کالا (رسید انبار) شماره ${purchaseId}` +
        (invoiceNumber ? ` | فاکتور: ${invoiceNumber}` : "");
      // credit => بدهی به تامین‌کننده افزایش می‌یابد
      await dependencies.addPartnerLedgerEntry(
        Number(supplierId),
        desc,
        0,
        totalCost,
        purchaseDate,
        "product_purchase",
        purchaseId,
      );
    }

    await execAsync("COMMIT;");

    return await (dependencies.getPurchaseById || getPurchaseByIdFromReadRepo)(
      purchaseId,
    );
  } catch (e) {
    await execAsync("ROLLBACK;");
    throw e;
  }
};
