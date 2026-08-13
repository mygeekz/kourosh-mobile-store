// Customer database API extracted from legacyRuntime in Phase 1F.
// This module talks directly to repositories/core and does not import legacyRuntime.

import { getDbInstance } from "../core/runtimeBindings";
import { allAsync, runAsync } from "../query";
import type { CustomerFollowupPayload, CustomerLedgerInsights } from "../../repositories/customer";
import {
  getAllCustomersWithBalanceFromDb as getAllCustomersWithBalanceFromRepo,
  getCustomerByIdFromDb as getCustomerByIdFromRepo,
  addCustomerToDb as addCustomerToRepo,
  updateCustomerInDb as updateCustomerInRepo,
  updateCustomerTagsInDb as updateCustomerTagsInRepo,
  deleteCustomerFromDb as deleteCustomerFromRepo,
  addCustomerFollowupToDb as addCustomerFollowupToRepo,
  listCustomerFollowupsFromDb as listCustomerFollowupsFromRepo,
  closeCustomerFollowupInDb as closeCustomerFollowupInRepo,
  updateCustomerFollowupInDb as updateCustomerFollowupInRepo,
  setCustomerRiskOverrideInDb as setCustomerRiskOverrideInRepo,
  getLedgerForCustomerFromDb as getLedgerForCustomerFromRepo,
  getCustomerLedgerInsightsFromDb as getCustomerLedgerInsightsFromRepo,
  addCustomerLedgerEntryToDb as addCustomerLedgerEntryToRepo,
  addCustomerLedgerEntryInternal as addCustomerLedgerEntryInternalInRepo,
  updateCustomerLedgerEntryInDb as updateCustomerLedgerEntryInRepo,
  deleteCustomerLedgerEntryFromDb as deleteCustomerLedgerEntryFromRepo,
  recalcCustomerBalances as recalcCustomerBalancesInRepo,
  recalcCustomerBalancesInternal as recalcCustomerBalancesInternalInRepo,
} from "../../repositories/customer";

interface CustomerPayload {
  fullName: string;
  phoneNumber?: string | null;
  address?: string | null;
  notes?: string | null;
  telegramChatId?: string | null;
}

interface LedgerEntryPayload {
  description: string;
  debit?: number;
  credit?: number;
  transactionDate: string;
  referenceType?: string | null;
  referenceId?: number | null;
  settlementBatchId?: string | null;
}

export const addCustomerLedgerEntryToDb = async (
  customerId: number,
  entryData: LedgerEntryPayload,
): Promise<any> => {
  await getDbInstance();
  return await addCustomerLedgerEntryToRepo(customerId, entryData);
};

export const addCustomerLedgerEntryInternal = async (
  customerId: number,
  description: string,
  debit: number | undefined,
  credit: number | undefined,
  transactionDateISO?: string,
  meta?: { referenceType?: string | null; referenceId?: number | null },
): Promise<any> => {
  return await addCustomerLedgerEntryInternalInRepo(
    customerId,
    description,
    debit,
    credit,
    transactionDateISO,
    meta,
  );
};

export const addCustomerToDb = async (
  customerData: CustomerPayload,
): Promise<any> => {
  await getDbInstance();
  return await addCustomerToRepo(customerData);
};

export const getAllCustomersWithBalanceFromDb = async (): Promise<any[]> => {
  await getDbInstance();
  return await getAllCustomersWithBalanceFromRepo();
};

export const getCustomerByIdFromDb = async (
  customerId: number,
): Promise<any> => {
  await getDbInstance();
  return await getCustomerByIdFromRepo(customerId);
};

export const updateCustomerInDb = async (
  customerId: number,
  customerData: CustomerPayload,
): Promise<any> => {
  await getDbInstance();
  return await updateCustomerInRepo(customerId, customerData, {
    getCustomerById: getCustomerByIdFromDb,
  });
};

export const updateCustomerTagsInDb = async (
  customerId: number,
  tags: string[],
): Promise<any> => {
  await getDbInstance();
  return await updateCustomerTagsInRepo(customerId, tags, {
    getCustomerById: getCustomerByIdFromDb,
  });
};

export const deleteCustomerFromDb = async (
  customerId: number,
): Promise<boolean> => {
  await getDbInstance();
  return await deleteCustomerFromRepo(customerId);
};

export const getLedgerForCustomerFromDb = async (
  customerId: number,
): Promise<any[]> => {
  await getDbInstance();
  return await getLedgerForCustomerFromRepo(customerId);
};

export const addCustomerFollowupToDb = async (
  customerId: number,
  payload: CustomerFollowupPayload,
  actor?: { userId?: number; username?: string },
): Promise<any> => {
  await getDbInstance();
  return await addCustomerFollowupToRepo(customerId, payload, actor);
};

export const listCustomerFollowupsFromDb = async (
  customerId: number,
): Promise<any[]> => {
  await getDbInstance();
  return await listCustomerFollowupsFromRepo(customerId);
};

export const closeCustomerFollowupInDb = async (
  customerId: number,
  followupId: number,
): Promise<any> => {
  await getDbInstance();
  return await closeCustomerFollowupInRepo(customerId, followupId);
};

export const updateCustomerFollowupInDb = async (
  customerId: number,
  followupId: number,
  payload: {
    note?: string;
    nextFollowupDate?: string | null;
    status?: "open" | "closed";
  },
): Promise<any> => {
  await getDbInstance();
  return await updateCustomerFollowupInRepo(customerId, followupId, payload);
};

export const setCustomerRiskOverrideInDb = async (
  customerId: number,
  risk: "low" | "medium" | "high" | null,
): Promise<any> => {
  await getDbInstance();
  return await setCustomerRiskOverrideInRepo(customerId, risk);
};

export const getCustomerLedgerInsightsFromDb = async (
  customerId: number,
): Promise<CustomerLedgerInsights> => {
  await getDbInstance();
  return await getCustomerLedgerInsightsFromRepo(customerId);
};

export const updateCustomerLedgerEntryInDb = async (
  customerId: number,
  entryId: number,
  data: Partial<LedgerEntryPayload>,
) => {
  await getDbInstance();
  return await updateCustomerLedgerEntryInRepo(customerId, entryId, data, {
    recalcCustomerBalances,
  });
};

export const deleteCustomerLedgerEntryFromDb = async (
  customerId: number,
  entryId: number,
) => {
  await getDbInstance();
  return await deleteCustomerLedgerEntryFromRepo(customerId, entryId, {
    recalcCustomerBalances,
  });
};

export const recalcCustomerBalancesInternal = async (customerId: number) => {
  await getDbInstance();
  return await recalcCustomerBalancesInternalInRepo(customerId);
};

export const recalcCustomerBalances = async (customerId: number) => {
  await getDbInstance();
  return await recalcCustomerBalancesInRepo(customerId);
};

export const upsertDebtSnapshotInDb = async (
  snapshotDate: string,
  totalDebt: number,
) => {
  await getDbInstance();
  const d = String(snapshotDate || "").trim();
  if (!d) throw new Error("snapshotDate خالی است.");
  const v = Number(totalDebt || 0);
  await runAsync(
    `INSERT INTO debt_snapshots (snapshotDate, totalDebt) VALUES (?, ?)
     ON CONFLICT(snapshotDate) DO UPDATE SET totalDebt = excluded.totalDebt`,
    [d, v],
  );
};

export const listDebtSnapshotsFromDb = async (
  fromDate: string,
  toDate: string,
) => {
  await getDbInstance();
  return await allAsync(
    `SELECT snapshotDate, totalDebt FROM debt_snapshots
      WHERE snapshotDate >= ? AND snapshotDate <= ?
      ORDER BY snapshotDate ASC`,
    [fromDate, toDate],
  );
};

