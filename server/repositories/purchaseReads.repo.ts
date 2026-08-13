import { allAsync, getAsync } from "../db/query";

export const getAllPurchasesFromDb = async () => {
  return await allAsync(
    `SELECT p.*, pa.partnerName as supplierName
       FROM purchases p
       LEFT JOIN partners pa ON pa.id = p.supplierId
   ORDER BY datetime(p.purchaseDate) DESC, p.id DESC`,
  );
};

export const getPurchaseByIdFromDb = async (purchaseId: number) => {
  const purchase = await getAsync(
    `SELECT p.*, pa.partnerName as supplierName
       FROM purchases p
       LEFT JOIN partners pa ON pa.id = p.supplierId
      WHERE p.id = ?`,
    [purchaseId],
  );
  if (!purchase) return null;
  const items = await allAsync(
    `SELECT pi.*, pr.name as productName
       FROM purchase_items pi
       JOIN products pr ON pr.id = pi.productId
      WHERE pi.purchaseId = ?
      ORDER BY pi.id ASC`,
    [purchaseId],
  );
  return { ...purchase, items };
};
