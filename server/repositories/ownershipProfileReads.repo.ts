import { allTypedAsync } from "../db/query";
import type {
  OwnershipProfileItemRow,
  OwnershipProfileRow,
  OwnershipProfileWithItems,
  ProfileItemsTable,
  ProfitShareProfileRow,
  ProfitShareProfileWithItems,
} from "./ownershipValidation";

type OwnershipProfileReadDeps = {
  hasStoreOwnershipCoreTables: () => Promise<boolean>;
  getProfileItems: (
    table: ProfileItemsTable,
    id: number,
  ) => Promise<OwnershipProfileItemRow[]>;
};

export const listProfitShareProfilesFromDb = async (
  deps: OwnershipProfileReadDeps,
): Promise<ProfitShareProfileWithItems[]> => {
  const hasCore = await deps.hasStoreOwnershipCoreTables();
  if (!hasCore) return [];
  const profiles = await allTypedAsync<ProfitShareProfileRow>(
    `SELECT * FROM profit_share_profiles ORDER BY isDefault DESC, id ASC`,
  ).catch((): ProfitShareProfileRow[] => []);
  const result: ProfitShareProfileWithItems[] = [];
  for (const profile of profiles) {
    result.push({
      ...profile,
      items: await deps.getProfileItems(
        "profit_share_profile_items",
        profile.id,
      ),
    });
  }
  return result;
};

export const listOwnershipProfilesFromDb = async (
  deps: OwnershipProfileReadDeps,
): Promise<OwnershipProfileWithItems[]> => {
  const hasCore = await deps.hasStoreOwnershipCoreTables();
  if (!hasCore) return [];
  const profiles = await allTypedAsync<OwnershipProfileRow>(
    `SELECT op.*, psp.title as profitShareProfileTitle FROM ownership_profiles op LEFT JOIN profit_share_profiles psp ON psp.id = op.profitShareProfileId ORDER BY op.isDefault DESC, op.id ASC`,
  ).catch((): OwnershipProfileRow[] => []);
  const result: OwnershipProfileWithItems[] = [];
  for (const profile of profiles) {
    result.push({
      ...profile,
      items: await deps.getProfileItems("ownership_profile_items", profile.id),
    });
  }
  return result;
};
