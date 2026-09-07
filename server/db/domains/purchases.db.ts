// Domain database API extracted from legacyRuntime in Phase 1E.

import { getDbInstance, addPartnerLedgerEntryInternal } from "../core/runtimeBindings";
import { getAllPurchasesFromDb as getAllPurchasesFromRepo, getPurchaseByIdFromDb as getPurchaseByIdFromRepo } from "../../repositories/purchaseReads.repo";
import { createPurchaseReceiptInDb as createPurchaseReceiptInRepo, type PurchaseReceiptPayload, type PurchaseReceiptItemPayload } from "../../repositories/purchaseReceipts.repo";

export type { PurchaseReceiptPayload, PurchaseReceiptItemPayload } from "../../repositories/purchaseReceipts.repo";

export const createPurchaseReceiptInDb = async (
  payload: PurchaseReceiptPayload,
) => {
  await getDbInstance();
  return await createPurchaseReceiptInRepo(payload, {
    addPartnerLedgerEntry: addPartnerLedgerEntryInternal,
    getPurchaseById: getPurchaseByIdFromDb,
  });
};

export const getAllPurchasesFromDb = async () => {
  await getDbInstance();
  return await getAllPurchasesFromRepo();
};

export const getPurchaseByIdFromDb = async (purchaseId: number) => {
  await getDbInstance();
  return await getPurchaseByIdFromRepo(purchaseId);
};
