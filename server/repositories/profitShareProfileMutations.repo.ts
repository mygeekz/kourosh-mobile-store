import { getTypedAsync, runAsync } from "../db/query";
import {
  assertProfileTitleUnique,
  normalizeAndValidateShareItems,
  normalizeProfileNotes,
  normalizeProfileTitle,
  type OwnershipProfileItemRow,
  type OwnershipShareInput,
  type ProfileItemsTable,
  type ProfitShareProfileRow,
  type ProfitShareProfileWithItems,
} from "./ownershipValidation";

export type ProfitShareProfileCreatePayload = {
  title: string;
  notes?: string | null;
  isDefault?: boolean;
  items: OwnershipShareInput[];
};

type ProfitShareProfileMutationDeps = {
  normalizePercent: (value: number) => number;
  replaceProfitShareProfileItems: (
    profileId: number,
    items: OwnershipShareInput[],
  ) => Promise<void>;
  getProfileItems: (
    table: ProfileItemsTable,
    id: number,
  ) => Promise<OwnershipProfileItemRow[]>;
};

export const createProfitShareProfileFromDb = async (
  payload: ProfitShareProfileCreatePayload,
  deps: ProfitShareProfileMutationDeps,
): Promise<ProfitShareProfileWithItems> => {
  const title = normalizeProfileTitle(payload?.title, "عنوان پروفایل سود");
  const notes = normalizeProfileNotes(payload?.notes);
  const items = await normalizeAndValidateShareItems(
    payload?.items,
    deps.normalizePercent,
    { requireActivePartners: true, totalTolerance: 0.01 },
  );
  await assertProfileTitleUnique("profit_share_profiles", title);

  if (payload.isDefault) {
    await runAsync(
      `UPDATE profit_share_profiles SET isDefault = 0 WHERE isDefault = 1`,
    );
  }
  const result = await runAsync(
    `INSERT INTO profit_share_profiles (title, notes, isDefault, isActive) VALUES (?, ?, ?, 1)`,
    [title, notes, payload.isDefault ? 1 : 0],
  );
  const id = Number(result.lastID);
  await deps.replaceProfitShareProfileItems(id, items);
  const profile = await getTypedAsync<ProfitShareProfileRow>(
    `SELECT * FROM profit_share_profiles WHERE id = ?`,
    [id],
  );
  if (!profile) throw new Error("پروفایل سود پس از ثبت پیدا نشد.");
  return {
    ...profile,
    items: await deps.getProfileItems("profit_share_profile_items", id),
  };
};
