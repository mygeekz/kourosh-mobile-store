import { getTypedAsync, runAsync } from "../db/query";
import {
  assertProfileTitleUnique,
  normalizeAndValidateShareItems,
  normalizeProfileNotes,
  normalizeProfileTitle,
  type OwnershipProfileItemRow,
  type OwnershipProfileRow,
  type OwnershipProfileWithItems,
  type OwnershipShareInput,
  type OwnershipType,
  type ProfileItemsTable,
} from "./ownershipValidation";

export type OwnershipProfileCreatePayload = {
  title: string;
  ownershipType?: string;
  notes?: string | null;
  isDefault?: boolean;
  profitShareProfileId?: number | null;
  items: OwnershipShareInput[];
};

type IdRow = {
  id: number;
};

type OwnershipProfileMutationDeps = {
  normalizePercent: (value: number) => number;
  replaceOwnershipProfileItems: (
    ownershipProfileId: number,
    items: OwnershipShareInput[],
  ) => Promise<void>;
  getProfileItems: (
    table: ProfileItemsTable,
    id: number,
  ) => Promise<OwnershipProfileItemRow[]>;
};

const OWNERSHIP_TYPES: readonly OwnershipType[] = ["personal", "shared", "store"];

const normalizeOwnershipType = (value: unknown): OwnershipType => {
  const normalized = String(value || "shared").trim();
  const ownershipType = OWNERSHIP_TYPES.find((item) => item === normalized);
  if (!ownershipType) throw new Error("نوع پروفایل مالکیت معتبر نیست.");
  return ownershipType;
};

export const createOwnershipProfileFromDb = async (
  payload: OwnershipProfileCreatePayload,
  deps: OwnershipProfileMutationDeps,
): Promise<OwnershipProfileWithItems> => {
  const title = normalizeProfileTitle(payload?.title, "عنوان پروفایل مالکیت");
  const notes = normalizeProfileNotes(payload?.notes);
  const ownershipType = normalizeOwnershipType(payload?.ownershipType);
  const items = await normalizeAndValidateShareItems(
    payload?.items,
    deps.normalizePercent,
    { requireActivePartners: true, totalTolerance: 0.01 },
  );
  await assertProfileTitleUnique("ownership_profiles", title);

  if (
    ownershipType === "personal" &&
    (items.length !== 1 || Math.abs(items[0].sharePercent - 100) > 0.01)
  )
    throw new Error(
      "پروفایل مالکیت شخصی باید دقیقاً یک شریک با سهم ۱۰۰٪ داشته باشد.",
    );
  if (ownershipType === "store") {
    const existingStore = await getTypedAsync<IdRow>(
      `SELECT id FROM ownership_profiles WHERE ownershipType = 'store' AND isActive = 1 LIMIT 1`,
    );
    if (existingStore?.id)
      throw new Error("پروفایل تجمیعی فروشگاه از قبل وجود دارد.");
  }

  const profitShareProfileId = Number(payload?.profitShareProfileId || 0) || null;
  if (profitShareProfileId) {
    const linkedProfile = await getTypedAsync<IdRow>(
      `SELECT id FROM profit_share_profiles WHERE id = ? AND isActive = 1`,
      [profitShareProfileId],
    );
    if (!linkedProfile?.id)
      throw new Error("پروفایل تسهیم سود متصل معتبر یا فعال نیست.");
  }

  if (payload.isDefault) {
    await runAsync(
      `UPDATE ownership_profiles SET isDefault = 0 WHERE isDefault = 1`,
    );
  }
  const result = await runAsync(
    `INSERT INTO ownership_profiles (title, ownershipType, notes, isDefault, isActive, profitShareProfileId) VALUES (?, ?, ?, ?, 1, ?)`,
    [title, ownershipType, notes, payload.isDefault ? 1 : 0, profitShareProfileId],
  );
  const id = Number(result.lastID);
  await deps.replaceOwnershipProfileItems(id, items);
  const profile = await getTypedAsync<OwnershipProfileRow>(
    `SELECT * FROM ownership_profiles WHERE id = ?`,
    [id],
  );
  if (!profile) throw new Error("پروفایل مالکیت پس از ثبت پیدا نشد.");
  return {
    ...profile,
    items: await deps.getProfileItems("ownership_profile_items", id),
  };
};
