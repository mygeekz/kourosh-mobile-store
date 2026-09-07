import {
  addAuditLog,
  addExpenseToDb,
  createPurchaseReceiptInDb,
  getAllPurchasesFromDb,
  getAsync,
  getPurchaseByIdFromDb,
  recordInventoryInDb,
} from '../database';

export const purchasesRepo = {
  listPurchases: () => getAllPurchasesFromDb(),
  getPurchaseById: (id: number) => getPurchaseByIdFromDb(id),
  createPurchaseReceipt: (payload: any) => createPurchaseReceiptInDb(payload),
  recordInventoryEntry: (payload: any) => recordInventoryInDb(payload),
  getPartnerNameById: async (partnerId: number): Promise<string | null> => {
    const sp = await getAsync(`SELECT name FROM partners WHERE id = ?`, [partnerId]);
    return sp?.name ? String(sp.name) : null;
  },
  addInventoryPurchaseExpense: (payload: any, actor?: any) =>
    addExpenseToDb(payload, actor),
  addAuditLog,
};
