import { allAsync, getAsync, runAsync } from "../db/query";

type ShareInput = {
  storePartnerId: number;
  sharePercent: number;
  sortOrder?: number;
  roleLabel?: string | null;
};

type ProfileItemsTable = "profit_share_profile_items" | "ownership_profile_items";

type DefaultOwnershipCoreDeps = {
  normalizePercent: (value: number) => number;
  getProfileItems: (table: ProfileItemsTable, id: number) => Promise<any[]>;
  createStorePartner: (payload: {
    name: string;
    code?: string | null;
    colorTag?: string | null;
    notes?: string | null;
    legacyPartnerId?: number | null;
    isStore?: number | boolean | null;
  }) => Promise<any>;
  createProfitShareProfile: (payload: {
    title: string;
    notes?: string | null;
    isDefault?: boolean;
    items: ShareInput[];
  }) => Promise<any>;
  createOwnershipProfile: (payload: {
    title: string;
    ownershipType?: string;
    notes?: string | null;
    isDefault?: boolean;
    profitShareProfileId?: number | null;
    items: ShareInput[];
  }) => Promise<any>;
  listStorePartners: () => Promise<any[]>;
  listProfitShareProfiles: () => Promise<any[]>;
  listOwnershipProfiles: () => Promise<any[]>;
};

export const createDefaultOwnershipCore = async (
  legacyPartnerIds: number[],
  deps: DefaultOwnershipCoreDeps,
): Promise<any> => {
  if (!legacyPartnerIds.length)
    throw new Error("حداقل یک شریک قدیمی را انتخاب کنید.");
  const legacyPartners = await allAsync(
    `SELECT * FROM partners WHERE id IN (${legacyPartnerIds.map(() => "?").join(",")}) ORDER BY id ASC`,
    legacyPartnerIds,
  );
  if (legacyPartners.length !== legacyPartnerIds.length)
    throw new Error("بخشی از شرکای انتخاب‌شده پیدا نشدند.");

  const createdStorePartners: any[] = [];
  for (const partner of legacyPartners) {
    const existingLink = await getAsync(
      `SELECT sp.* FROM store_partner_legacy_links spl JOIN store_partners sp ON sp.id = spl.storePartnerId WHERE spl.legacyPartnerId = ? AND spl.linkType = 'owner'`,
      [partner.id],
    );
    if (existingLink) {
      createdStorePartners.push(existingLink);
      continue;
    }
    const existingByName = await getAsync(
      `SELECT * FROM store_partners WHERE lower(trim(name)) = lower(trim(?)) LIMIT 1`,
      [partner.partnerName],
    );
    if (existingByName?.id) {
      await runAsync(
        `INSERT OR IGNORE INTO store_partner_legacy_links (storePartnerId, legacyPartnerId, linkType) VALUES (?, ?, 'owner')`,
        [existingByName.id, partner.id],
      );
      createdStorePartners.push(existingByName);
      continue;
    }
    const created = await deps.createStorePartner({
      name: partner.partnerName,
      legacyPartnerId: partner.id,
      notes: `ایجادشده از همکار قدیمی #${partner.id}`,
    });
    createdStorePartners.push(created);
  }

  let defaultProfitShare = await getAsync(
    `SELECT * FROM profit_share_profiles WHERE isDefault = 1 ORDER BY id DESC LIMIT 1`,
  );
  if (defaultProfitShare) {
    (defaultProfitShare as any).items = await deps.getProfileItems(
      "profit_share_profile_items",
      Number((defaultProfitShare as any).id),
    );
  }
  if (!defaultProfitShare) {
    const count = createdStorePartners.length;
    const base = Math.floor(10000 / count) / 100;
    const items = createdStorePartners.map((sp, index) => ({
      storePartnerId: sp.id,
      sharePercent:
        index === count - 1
          ? deps.normalizePercent(100 - base * (count - 1))
          : base,
      sortOrder: index,
    }));
    defaultProfitShare = await deps.createProfitShareProfile({
      title: "پروفایل پیش‌فرض فروشگاه",
      isDefault: true,
      items,
    });
  }

  let storeOwnership = await getAsync(
    `SELECT * FROM ownership_profiles WHERE ownershipType = 'store' ORDER BY isDefault DESC, id ASC LIMIT 1`,
  );
  if (!storeOwnership) {
    storeOwnership = await deps.createOwnershipProfile({
      title: "مالکیت مغازه",
      ownershipType: "store",
      isDefault: true,
      profitShareProfileId: defaultProfitShare.id,
      items: (defaultProfitShare.items || []).map(
        (item: any, index: number) => ({
          storePartnerId: item.storePartnerId,
          sharePercent: item.sharePercent,
          sortOrder: index,
          roleLabel: "شریک مغازه",
        }),
      ),
    });
  }

  for (const [index, sp] of createdStorePartners.entries()) {
    const existingPersonal = await getAsync(
      `SELECT * FROM ownership_profiles WHERE ownershipType = 'personal' AND title = ? LIMIT 1`,
      [sp.name],
    );
    if (!existingPersonal) {
      await deps.createOwnershipProfile({
        title: sp.name,
        ownershipType: "personal",
        items: [
          {
            storePartnerId: sp.id,
            sharePercent: 100,
            sortOrder: index,
            roleLabel: "مالک اصلی",
          },
        ],
      });
    }
  }

  return {
    storePartners: await deps.listStorePartners(),
    profitShareProfiles: await deps.listProfitShareProfiles(),
    ownershipProfiles: await deps.listOwnershipProfiles(),
  };
};
