import { getAsync, runAsync } from "../db/query";
import {
  normalizeAndValidateShareItems,
  type OwnershipShareInput,
} from "./ownershipValidation";

type ProfileItemsTable = "profit_share_profile_items" | "ownership_profile_items";

export type StoreOwnershipConfigurationPayload = {
  storePartnerId?: number | null;
  items: OwnershipShareInput[];
};

type StoreOwnershipConfigurationDeps = {
  normalizePercent: (value: number) => number;
  replaceProfitShareProfileItems: (
    profileId: number,
    items: OwnershipShareInput[],
  ) => Promise<void>;
  replaceOwnershipProfileItems: (
    ownershipProfileId: number,
    items: OwnershipShareInput[],
  ) => Promise<void>;
  getProfileItems: (table: ProfileItemsTable, id: number) => Promise<any[]>;
  createProfitShareProfile: (payload: {
    title: string;
    notes?: string | null;
    isDefault?: boolean;
    items: OwnershipShareInput[];
  }) => Promise<any>;
  createOwnershipProfile: (payload: {
    title: string;
    ownershipType?: string;
    notes?: string | null;
    isDefault?: boolean;
    profitShareProfileId?: number | null;
    items: OwnershipShareInput[];
  }) => Promise<any>;
  listStorePartners: () => Promise<any[]>;
  listProfitShareProfiles: () => Promise<any[]>;
  listOwnershipProfiles: () => Promise<any[]>;
};

export const saveStoreOwnershipConfigurationFromDb = async (
  payload: StoreOwnershipConfigurationPayload,
  deps: StoreOwnershipConfigurationDeps,
): Promise<any> => {
  const normalizedItems = await normalizeAndValidateShareItems(
    payload?.items,
    deps.normalizePercent,
    { requireActivePartners: true, totalTolerance: 0.01 },
  );

  // فروشگاه یک شریک نیست؛ فروشگاه تجمیع عملکرد همه شرکاست.
  // ستون isStore برای سازگاری نگه داشته می‌شود اما در مدل جدید خاموش می‌ماند.
  await runAsync(`UPDATE store_partners SET isStore = 0`).catch(() => undefined);

  let defaultProfitShare: any = await getAsync(
    `SELECT * FROM profit_share_profiles WHERE isDefault = 1 AND isActive = 1 ORDER BY id DESC LIMIT 1`,
  );
  if (!defaultProfitShare) {
    defaultProfitShare = await deps.createProfitShareProfile({
      title: "پروفایل پیش‌فرض سود فروشگاه",
      isDefault: true,
      items: normalizedItems,
    });
  } else {
    await runAsync(
      `UPDATE profit_share_profiles
          SET title = ?, isDefault = 1, isActive = 1,
              updatedAt = strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')
        WHERE id = ?`,
      ["پروفایل پیش‌فرض سود فروشگاه", Number(defaultProfitShare.id)],
    );
    await deps.replaceProfitShareProfileItems(Number(defaultProfitShare.id), normalizedItems);
    defaultProfitShare = await getAsync(
      `SELECT * FROM profit_share_profiles WHERE id = ?`,
      [Number(defaultProfitShare.id)],
    );
    (defaultProfitShare as any).items = await deps.getProfileItems(
      "profit_share_profile_items",
      Number(defaultProfitShare.id),
    );
  }

  let storeOwnership: any = await getAsync(
    `SELECT * FROM ownership_profiles WHERE ownershipType = 'store' AND isActive = 1 ORDER BY isDefault DESC, id ASC LIMIT 1`,
  );
  const ownershipItems = normalizedItems.map((item, index) => ({
    ...item,
    sortOrder: index,
    roleLabel: "سهم تجمیعی فروشگاه",
  }));

  if (!storeOwnership) {
    storeOwnership = await deps.createOwnershipProfile({
      title: "مالکیت تجمیعی فروشگاه",
      ownershipType: "store",
      isDefault: true,
      profitShareProfileId: Number(defaultProfitShare.id),
      items: ownershipItems,
    });
  } else {
    await runAsync(
      `UPDATE ownership_profiles
          SET title = ?, ownershipType = 'store', isDefault = 1, isActive = 1,
              profitShareProfileId = ?,
              updatedAt = strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')
        WHERE id = ?`,
      [
        "مالکیت تجمیعی فروشگاه",
        Number(defaultProfitShare.id),
        Number(storeOwnership.id),
      ],
    );
    await deps.replaceOwnershipProfileItems(Number(storeOwnership.id), ownershipItems);
    storeOwnership = await getAsync(
      `SELECT * FROM ownership_profiles WHERE id = ?`,
      [Number(storeOwnership.id)],
    );
    (storeOwnership as any).items = await deps.getProfileItems(
      "ownership_profile_items",
      Number(storeOwnership.id),
    );
  }

  return {
    storePartners: await deps.listStorePartners(),
    profitShareProfiles: await deps.listProfitShareProfiles(),
    ownershipProfiles: await deps.listOwnershipProfiles(),
    selectedStorePartnerId: null,
  };
};
