import { allAsync, getAsync, runAsync } from "../db/query";
import {
  getLegacyPartnerCandidatesFromDb as getLegacyPartnerCandidatesFromRepo,
  listStorePartnersFromDb as listStorePartnersFromRepo,
} from "./storePartnerReads.repo";
import {
  createStorePartnerFromDb as createStorePartnerInRepo,
  updateStorePartnerFromDb as updateStorePartnerInRepo,
} from "./storePartnerMutations.repo";
import {
  listProfitShareProfilesFromDb as listProfitShareProfilesFromRepo,
  listOwnershipProfilesFromDb as listOwnershipProfilesFromRepo,
} from "./ownershipProfileReads.repo";
import { createProfitShareProfileFromDb as createProfitShareProfileInRepo } from "./profitShareProfileMutations.repo";
import { createOwnershipProfileFromDb as createOwnershipProfileInRepo } from "./ownershipProfileMutations.repo";
import { saveStoreOwnershipConfigurationFromDb as saveStoreOwnershipConfigurationInRepo } from "./storeOwnershipConfiguration.repo";
import { createDefaultOwnershipCore as createDefaultOwnershipCoreInRepo } from "./defaultOwnershipCore.repo";
import {
  applyStoreOwnershipBackfillFromDb as applyStoreOwnershipBackfillFromRepo,
  getStoreOwnershipCoverageFromDb as getStoreOwnershipCoverageFromRepo,
  previewStoreOwnershipBackfillFromDb as previewStoreOwnershipBackfillFromRepo,
  resolveLegacyPartnerOwnershipMap,
} from "./storeOwnershipBackfill.repo";
import {
  assignStoreOwnershipReviewItemsFromDb as assignStoreOwnershipReviewItemsInRepo,
  listStoreOwnershipReviewQueueFromDb as listStoreOwnershipReviewQueueFromRepo,
  type StoreOwnershipReviewAssignmentPayload,
} from "./storeOwnershipReviewQueue.repo";

type ShareInput = {
  storePartnerId: number;
  sharePercent: number;
  sortOrder?: number;
  roleLabel?: string | null;
};

type ProfileItemsTable = "profit_share_profile_items" | "ownership_profile_items";

export const tableExistsForOwnershipBoundary = async (
  tableName: string,
): Promise<boolean> => {
  try {
    const row = await getAsync(
      `SELECT name FROM sqlite_master WHERE type='table' AND name = ?`,
      [tableName],
    );
    return !!row?.name;
  } catch {
    return false;
  }
};

export const getColumnNamesSafeForOwnershipBoundary = async (
  tableName: string,
): Promise<Set<string>> => {
  try {
    const exists = await tableExistsForOwnershipBoundary(tableName);
    if (!exists) return new Set<string>();
    const rows: any[] = await allAsync(`PRAGMA table_info(${tableName})`);
    return new Set(
      (rows || []).map((row: any) => String(row?.name || "")).filter(Boolean),
    );
  } catch {
    return new Set<string>();
  }
};

export const hasStoreOwnershipCoreTablesForBoundary = async (): Promise<boolean> => {
  const required = [
    "store_partners",
    "store_partner_legacy_links",
    "profit_share_profiles",
    "profit_share_profile_items",
    "ownership_profiles",
    "ownership_profile_items",
  ];
  const checks = await Promise.all(
    required.map((name) => tableExistsForOwnershipBoundary(name)),
  );
  return checks.every(Boolean);
};

const normalizePercent = (value: number): number =>
  Math.round((Number(value) || 0) * 100) / 100;

const replaceProfitShareProfileItems = async (
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

const replaceOwnershipProfileItems = async (
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

const getProfileItems = async (
  table: ProfileItemsTable,
  id: number,
): Promise<any[]> => {
  const coreReady = await hasStoreOwnershipCoreTablesForBoundary();
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

export const getLegacyPartnerCandidatesForOwnershipBoundary = async (): Promise<any[]> => {
  return await getLegacyPartnerCandidatesFromRepo({
    tableExists: tableExistsForOwnershipBoundary,
    hasStoreOwnershipCoreTables: hasStoreOwnershipCoreTablesForBoundary,
  });
};

export const listStorePartnersForOwnershipBoundary = async (): Promise<any[]> => {
  return await listStorePartnersFromRepo({
    hasStoreOwnershipCoreTables: hasStoreOwnershipCoreTablesForBoundary,
  });
};

export const createStorePartnerForOwnershipBoundary = async (payload: {
  name: string;
  code?: string | null;
  colorTag?: string | null;
  notes?: string | null;
  legacyPartnerId?: number | null;
  isStore?: number | boolean | null;
}): Promise<any> => createStorePartnerInRepo(payload);

export const updateStorePartnerForOwnershipBoundary = async (
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

export const listProfitShareProfilesForOwnershipBoundary = async (): Promise<any[]> =>
  listProfitShareProfilesFromRepo({
    hasStoreOwnershipCoreTables: hasStoreOwnershipCoreTablesForBoundary,
    getProfileItems,
  });

export const createProfitShareProfileForOwnershipBoundary = async (payload: {
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

export const listOwnershipProfilesForOwnershipBoundary = async (): Promise<any[]> =>
  listOwnershipProfilesFromRepo({
    hasStoreOwnershipCoreTables: hasStoreOwnershipCoreTablesForBoundary,
    getProfileItems,
  });

export const createOwnershipProfileForOwnershipBoundary = async (payload: {
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

export const saveStoreOwnershipConfigurationForOwnershipBoundary = async (payload: {
  storePartnerId?: number | null;
  items: ShareInput[];
}): Promise<any> =>
  saveStoreOwnershipConfigurationInRepo(payload, {
    normalizePercent,
    replaceProfitShareProfileItems,
    replaceOwnershipProfileItems,
    getProfileItems,
    createProfitShareProfile: createProfitShareProfileForOwnershipBoundary,
    createOwnershipProfile: createOwnershipProfileForOwnershipBoundary,
    listStorePartners: listStorePartnersForOwnershipBoundary,
    listProfitShareProfiles: listProfitShareProfilesForOwnershipBoundary,
    listOwnershipProfiles: listOwnershipProfilesForOwnershipBoundary,
  });

const createDefaultOwnershipCoreForBoundary = async (
  legacyPartnerIds: number[],
): Promise<any> =>
  createDefaultOwnershipCoreInRepo(legacyPartnerIds, {
    normalizePercent,
    getProfileItems,
    createStorePartner: createStorePartnerForOwnershipBoundary,
    createProfitShareProfile: createProfitShareProfileForOwnershipBoundary,
    createOwnershipProfile: createOwnershipProfileForOwnershipBoundary,
    listStorePartners: listStorePartnersForOwnershipBoundary,
    listProfitShareProfiles: listProfitShareProfilesForOwnershipBoundary,
    listOwnershipProfiles: listOwnershipProfilesForOwnershipBoundary,
  });

export const bootstrapStoreOwnershipCoreForOwnershipBoundary = async (
  legacyPartnerIds: number[],
): Promise<any> => {
  const core = await createDefaultOwnershipCoreForBoundary(legacyPartnerIds);
  const backfill = await applyStoreOwnershipBackfillForOwnershipBoundary().catch(
    () => ({
      phonesUpdated: 0,
      productsUpdated: 0,
    }),
  );
  return { ...core, backfill };
};

export const getStoreOwnershipCoverageForOwnershipBoundary = async (): Promise<any> =>
  getStoreOwnershipCoverageFromRepo({
    getColumnNamesSafe: getColumnNamesSafeForOwnershipBoundary,
    tableExists: tableExistsForOwnershipBoundary,
    hasStoreOwnershipCoreTables: hasStoreOwnershipCoreTablesForBoundary,
  });

export const previewStoreOwnershipBackfillForOwnershipBoundary = async (): Promise<any> =>
  previewStoreOwnershipBackfillFromRepo({
    getColumnNamesSafe: getColumnNamesSafeForOwnershipBoundary,
  });

export const applyStoreOwnershipBackfillForOwnershipBoundary = async (): Promise<any> =>
  applyStoreOwnershipBackfillFromRepo({
    getColumnNamesSafe: getColumnNamesSafeForOwnershipBoundary,
    tableExists: tableExistsForOwnershipBoundary,
    hasStoreOwnershipCoreTables: hasStoreOwnershipCoreTablesForBoundary,
  });

export const listStoreOwnershipReviewQueueForOwnershipBoundary = async (): Promise<any> =>
  listStoreOwnershipReviewQueueFromRepo({
    getColumnNamesSafe: getColumnNamesSafeForOwnershipBoundary,
    resolveLegacyPartnerOwnershipMap,
  });

export const assignStoreOwnershipReviewItemsForOwnershipBoundary = async (
  payload: StoreOwnershipReviewAssignmentPayload,
): Promise<any> =>
  assignStoreOwnershipReviewItemsInRepo(payload, {
    getColumnNamesSafe: getColumnNamesSafeForOwnershipBoundary,
    tableExists: tableExistsForOwnershipBoundary,
    getStoreOwnershipCoverage: getStoreOwnershipCoverageForOwnershipBoundary,
  });
