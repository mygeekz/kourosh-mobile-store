// Partner and store-ownership database API extracted from legacyRuntime in Phase 1F.
// This module talks directly to repositories/core and does not import legacyRuntime.

import { getDbInstance } from "../core/runtimeBindings";
import { normalizePhonePurchaseLedgers } from "../core/maintenance";
import { allAsync, getAsync, runAsync } from "../query";
import { buildDateRangeSql, type PartnerReportRange } from "../../repositories/partnerOwnershipReportBoundary.repo";
import {
  getAllPartnersWithBalanceFromDb as getAllPartnersWithBalanceFromRepo,
  getPartnerByIdFromDb as getPartnerByIdFromRepo,
  addPartnerToDb as addPartnerToRepo,
  updatePartnerInDb as updatePartnerInRepo,
  deletePartnerFromDb as deletePartnerFromRepo,
  getLedgerForPartnerFromDb as getLedgerForPartnerFromRepo,
  getPurchasedItemsFromPartnerDb as getPurchasedItemsFromPartnerRepo,
  listPartnerSettlementTransactionsFromDb as listPartnerSettlementTransactionsFromRepo,
  createPartnerSettlementTransactionFromDb as createPartnerSettlementTransactionInRepo,
  cancelPartnerSettlementTransactionFromDb as cancelPartnerSettlementTransactionInRepo,
  addPartnerLedgerEntryToDb as addPartnerLedgerEntryToRepo,
  updatePartnerLedgerEntryInDb as updatePartnerLedgerEntryInRepo,
  deletePartnerLedgerEntryFromDb as deletePartnerLedgerEntryFromRepo,
  recalcPartnerBalances as recalcPartnerBalancesInRepo,
} from "../../repositories/partner";
import {
  listProfitShareProfilesFromDb as listProfitShareProfilesFromRepo,
  listOwnershipProfilesFromDb as listOwnershipProfilesFromRepo,
  createProfitShareProfileFromDb as createProfitShareProfileInRepo,
  createOwnershipProfileFromDb as createOwnershipProfileInRepo,
  saveStoreOwnershipConfigurationFromDb as saveStoreOwnershipConfigurationInRepo,
  createDefaultOwnershipCore as createDefaultOwnershipCoreInRepo,
  getStoreOwnershipCoverageFromDb as getStoreOwnershipCoverageFromRepo,
  previewStoreOwnershipBackfillFromDb as previewStoreOwnershipBackfillFromRepo,
  applyStoreOwnershipBackfillFromDb as applyStoreOwnershipBackfillFromRepo,
  resolveLegacyPartnerOwnershipMap,
  listStoreOwnershipReviewQueueFromDb as listStoreOwnershipReviewQueueFromRepo,
  assignStoreOwnershipReviewItemsFromDb as assignStoreOwnershipReviewItemsInRepo,
  getLegacyPartnerCandidatesFromDb as getLegacyPartnerCandidatesFromRepo,
  listStorePartnersFromDb as listStorePartnersFromRepo,
  createStorePartnerFromDb as createStorePartnerInRepo,
  updateStorePartnerFromDb as updateStorePartnerInRepo,
  type StoreOwnershipReviewAssignmentPayload,
} from "../../repositories/ownership";
import { addPartnerLedgerEntryInternal } from "./ledgerSupport.db";

interface PartnerPayload {
  partnerName: string;
  partnerType: string;
  contactPerson?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
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
  referenceId?: string | number | null;
  settlementBatchId?: string | null;
}

export const SOLD_PHONE_DAILY_BUY_PRICE_SQL = `COALESCE(
  NULLIF((
    SELECT soi.buyPrice
    FROM sales_order_items soi
    JOIN sales_orders so ON so.id = soi.orderId
    WHERE soi.itemType = 'phone'
      AND soi.itemId = ph.id
      AND (so.status IS NULL OR so.status = 'active')
    ORDER BY datetime(COALESCE(so.transactionDate, '1970-01-01')) DESC, soi.id DESC
    LIMIT 1
  ), 0),
  NULLIF((
    SELECT st.buyPrice
    FROM sales_transactions st
    WHERE st.itemType = 'phone'
      AND st.itemId = ph.id
    ORDER BY datetime(COALESCE(st.transactionDate, '1970-01-01')) DESC, st.id DESC
    LIMIT 1
  ), 0),
  NULLIF((
    SELECT isi.buyPrice
    FROM installment_sale_items isi
    JOIN installment_sales isale ON isale.id = isi.saleId
    WHERE isi.itemType = 'phone'
      AND isi.itemId = ph.id
    ORDER BY datetime(COALESCE(isale.saleDateISO, isale.dateCreated, '1970-01-01')) DESC, isi.id DESC
    LIMIT 1
  ), 0),
  NULLIF(ph.currentPurchasePrice, 0),
  ph.purchasePrice,
  0
)`;

export const PHONE_SETTLEMENT_LEDGER_TYPES_SQL = `('phone_settlement_payment','phone_payment','product_settlement_phone')`;
export const PHONE_SETTLEMENT_MANUAL_PAID_SQL = `COALESCE((
  SELECT SUM(COALESCE(l.debit, 0))
  FROM partner_ledger l
  WHERE l.partnerId = ph.supplierId
    AND l.referenceId = ph.id
    AND l.referenceType IN ${PHONE_SETTLEMENT_LEDGER_TYPES_SQL}
), 0)`;
export const PHONE_SETTLEMENT_PAID_SQL = PHONE_SETTLEMENT_MANUAL_PAID_SQL;

export const addPartnerToDb = async (
  partnerData: PartnerPayload,
): Promise<any> => {
  await getDbInstance();
  return await addPartnerToRepo(partnerData);
};

export const getAllPartnersWithBalanceFromDb = async (
  partnerType?: string,
): Promise<any[]> => {
  await getDbInstance();
  return await getAllPartnersWithBalanceFromRepo(partnerType);
};

export const getPartnerByIdFromDb = async (partnerId: number): Promise<any> => {
  await getDbInstance();
  return await getPartnerByIdFromRepo(partnerId, {
    normalizePhonePurchaseLedgers,
  });
};

export const updatePartnerInDb = async (
  partnerId: number,
  partnerData: PartnerPayload,
): Promise<any> => {
  await getDbInstance();
  return await updatePartnerInRepo(partnerId, partnerData, {
    getPartnerById: getPartnerByIdFromDb,
  });
};

export const deletePartnerFromDb = async (
  partnerId: number,
): Promise<boolean> => {
  await getDbInstance();
  return await deletePartnerFromRepo(partnerId);
};

export const addPartnerLedgerEntryToDb = async (
  partnerId: number,
  entryData: LedgerEntryPayload,
): Promise<any> => {
  await getDbInstance();
  return await addPartnerLedgerEntryToRepo(partnerId, entryData as any);
};

export const getLedgerForPartnerFromDb = async (
  partnerId: number,
): Promise<any[]> => {
  await getDbInstance();
  return await getLedgerForPartnerFromRepo(partnerId);
};

export const getPurchasedItemsFromPartnerDb = async (
  partnerId: number,
): Promise<any[]> => {
  await getDbInstance();
  return await getPurchasedItemsFromPartnerRepo(partnerId);
};

export const updatePartnerLedgerEntryInDb = async (
  partnerId: number,
  entryId: number,
  data: Partial<LedgerEntryPayload>,
) => {
  await getDbInstance();
  return await updatePartnerLedgerEntryInRepo(partnerId, entryId, data, {
    recalcPartnerBalances,
  });
};

export const deletePartnerLedgerEntryFromDb = async (
  partnerId: number,
  entryId: number,
) => {
  await getDbInstance();
  return await deletePartnerLedgerEntryFromRepo(partnerId, entryId, {
    recalcPartnerBalances,
  });
};

export const recalcPartnerBalances = async (partnerId: number) => {
  await getDbInstance();
  return await recalcPartnerBalancesInRepo(partnerId);
};

export const tableExists = async (tableName: string): Promise<boolean> => {
  try {
    const row: any = await getAsync(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`,
      [tableName],
    );
    return !!row?.name;
  } catch {
    return false;
  }
};

export const getColumnNamesSafe = async (tableName: string): Promise<Set<string>> => {
  try {
    const exists = await tableExists(tableName);
    if (!exists) return new Set<string>();
    const rows: any[] = await allAsync(`PRAGMA table_info(${tableName})`);
    return new Set(
      (rows || []).map((row: any) => String(row?.name || "")).filter(Boolean),
    );
  } catch {
    return new Set<string>();
  }
};

export const hasStoreOwnershipCoreTables = async (): Promise<boolean> => {
  const required = [
    "store_partners",
    "store_partner_legacy_links",
    "profit_share_profiles",
    "profit_share_profile_items",
    "ownership_profiles",
    "ownership_profile_items",
  ];
  const checks = await Promise.all(required.map((name) => tableExists(name)));
  return checks.every(Boolean);
};

export type ShareInput = {
  storePartnerId: number;
  sharePercent: number;
  sortOrder?: number;
  roleLabel?: string | null;
};

export const normalizePercent = (value: number): number =>
  Math.round((Number(value) || 0) * 100) / 100;

export const replaceProfitShareProfileItems = async (
  profileId: number,
  items: ShareInput[],
): Promise<void> => {
  await runAsync(`DELETE FROM profit_share_profile_items WHERE profileId = ?`, [
    profileId,
  ]);
  for (const [index, item] of items.entries()) {
    await runAsync(
      `INSERT INTO profit_share_profile_items (profileId, storePartnerId, sharePercent, sortOrder) VALUES (?, ?, ?, ?)`,
      [
        profileId,
        item.storePartnerId,
        normalizePercent(item.sharePercent),
        item.sortOrder ?? index,
      ],
    );
  }
};

export const replaceOwnershipProfileItems = async (
  ownershipProfileId: number,
  items: ShareInput[],
): Promise<void> => {
  await runAsync(
    `DELETE FROM ownership_profile_items WHERE ownershipProfileId = ?`,
    [ownershipProfileId],
  );
  for (const [index, item] of items.entries()) {
    await runAsync(
      `INSERT INTO ownership_profile_items (ownershipProfileId, storePartnerId, sharePercent, sortOrder, roleLabel) VALUES (?, ?, ?, ?, ?)`,
      [
        ownershipProfileId,
        item.storePartnerId,
        normalizePercent(item.sharePercent),
        item.sortOrder ?? index,
        item.roleLabel || null,
      ],
    );
  }
};

export const getProfileItems = async (
  table: "profit_share_profile_items" | "ownership_profile_items",
  id: number,
): Promise<any[]> => {
  const coreReady = await hasStoreOwnershipCoreTables();
  if (!coreReady) return [];
  const sql =
    table === "profit_share_profile_items"
      ? `SELECT i.id, i.storePartnerId, i.sharePercent, i.sortOrder, sp.name as partnerName, sp.colorTag
         FROM profit_share_profile_items i
         JOIN store_partners sp ON sp.id = i.storePartnerId
        WHERE i.profileId = ?
        ORDER BY i.sortOrder ASC, i.id ASC`
      : `SELECT i.id, i.storePartnerId, i.sharePercent, i.sortOrder, i.roleLabel, sp.name as partnerName, sp.colorTag
         FROM ownership_profile_items i
         JOIN store_partners sp ON sp.id = i.storePartnerId
        WHERE i.ownershipProfileId = ?
        ORDER BY i.sortOrder ASC, i.id ASC`;
  try {
    return await allAsync(sql, [id]);
  } catch {
    return [];
  }
};

export const getLegacyPartnerCandidatesFromDb = async (): Promise<any[]> => {
  return await getLegacyPartnerCandidatesFromRepo({
    tableExists,
    hasStoreOwnershipCoreTables,
  });
};

export const listStorePartnersFromDb = async (): Promise<any[]> => {
  return await listStorePartnersFromRepo({
    hasStoreOwnershipCoreTables,
  });
};

export const createStorePartnerFromDb = async (payload: {
  name: string;
  code?: string | null;
  colorTag?: string | null;
  notes?: string | null;
  legacyPartnerId?: number | null;
  isStore?: number | boolean | null;
}): Promise<any> => createStorePartnerInRepo(payload);

export const updateStorePartnerFromDb = async (
  id: number,
  payload: {
    name?: string;
    code?: string | null;
    colorTag?: string | null;
    notes?: string | null;
    isActive?: number | boolean;
    isStore?: number | boolean;
    legacyPartnerIds?: number[];
  },
): Promise<any> => updateStorePartnerInRepo(id, payload);

export const listProfitShareProfilesFromDb = async (): Promise<any[]> =>
  listProfitShareProfilesFromRepo({
    hasStoreOwnershipCoreTables,
    getProfileItems,
  });

export const createProfitShareProfileFromDb = async (payload: {
  title: string;
  notes?: string | null;
  isDefault?: boolean;
  items: ShareInput[];
}): Promise<any> =>
  createProfitShareProfileInRepo(payload, {
    normalizePercent,
    replaceProfitShareProfileItems,
    getProfileItems,
  });

export const listOwnershipProfilesFromDb = async (): Promise<any[]> =>
  listOwnershipProfilesFromRepo({
    hasStoreOwnershipCoreTables,
    getProfileItems,
  });

export const createOwnershipProfileFromDb = async (payload: {
  title: string;
  ownershipType?: string;
  notes?: string | null;
  isDefault?: boolean;
  profitShareProfileId?: number | null;
  items: ShareInput[];
}): Promise<any> =>
  createOwnershipProfileInRepo(payload, {
    normalizePercent,
    replaceOwnershipProfileItems,
    getProfileItems,
  });

export const saveStoreOwnershipConfigurationFromDb = async (payload: {
  storePartnerId?: number | null;
  items: ShareInput[];
}): Promise<any> =>
  saveStoreOwnershipConfigurationInRepo(payload, {
    normalizePercent,
    replaceProfitShareProfileItems,
    replaceOwnershipProfileItems,
    getProfileItems,
    createProfitShareProfile: createProfitShareProfileFromDb,
    createOwnershipProfile: createOwnershipProfileFromDb,
    listStorePartners: listStorePartnersFromDb,
    listProfitShareProfiles: listProfitShareProfilesFromDb,
    listOwnershipProfiles: listOwnershipProfilesFromDb,
  });

export const createDefaultOwnershipCore = async (
  legacyPartnerIds: number[],
): Promise<any> =>
  createDefaultOwnershipCoreInRepo(legacyPartnerIds, {
    normalizePercent,
    getProfileItems,
    createStorePartner: createStorePartnerFromDb,
    createProfitShareProfile: createProfitShareProfileFromDb,
    createOwnershipProfile: createOwnershipProfileFromDb,
    listStorePartners: listStorePartnersFromDb,
    listProfitShareProfiles: listProfitShareProfilesFromDb,
    listOwnershipProfiles: listOwnershipProfilesFromDb,
  });

export const bootstrapStoreOwnershipCoreFromDb = async (
  legacyPartnerIds: number[],
): Promise<any> => {
  const core = await createDefaultOwnershipCore(legacyPartnerIds);
  const backfill = await applyStoreOwnershipBackfillFromDb().catch(() => ({
    phonesUpdated: 0,
    productsUpdated: 0,
  }));
  return { ...core, backfill };
};

export const getStoreOwnershipCoverageFromDb = async (): Promise<any> =>
  getStoreOwnershipCoverageFromRepo({
    getColumnNamesSafe,
    tableExists,
    hasStoreOwnershipCoreTables,
  });

export const previewStoreOwnershipBackfillFromDb = async (): Promise<any> =>
  previewStoreOwnershipBackfillFromRepo({
    getColumnNamesSafe,
  });

export const applyStoreOwnershipBackfillFromDb = async (): Promise<any> =>
  applyStoreOwnershipBackfillFromRepo({
    getColumnNamesSafe,
    tableExists,
    hasStoreOwnershipCoreTables,
  });

export const listStoreOwnershipReviewQueueFromDb = async (): Promise<any> =>
  listStoreOwnershipReviewQueueFromRepo({
    getColumnNamesSafe,
    resolveLegacyPartnerOwnershipMap,
  });

export const assignStoreOwnershipReviewItemsFromDb = async (
  payload: StoreOwnershipReviewAssignmentPayload,
): Promise<any> =>
  assignStoreOwnershipReviewItemsInRepo(payload, {
    getColumnNamesSafe,
    tableExists,
    getStoreOwnershipCoverage: getStoreOwnershipCoverageFromDb,
  });

export const listPartnerSettlementTransactionsFromDb = async (
  range: PartnerReportRange = {},
): Promise<any[]> => {
  return await listPartnerSettlementTransactionsFromRepo(range, {
    tableExists,
    buildDateRangeSql,
  });
};

export const createPartnerSettlementTransactionFromDb = async (
  payload: any,
): Promise<any> => {
  return await createPartnerSettlementTransactionInRepo(payload);
};

export const cancelPartnerSettlementTransactionFromDb = async (
  transactionId: number,
): Promise<void> => {
  return await cancelPartnerSettlementTransactionInRepo(transactionId);
};

