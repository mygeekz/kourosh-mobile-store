import { allAsync, getAsync } from "../db/query";
import { listStorePartnersFromDb as listStorePartnersFromRepo } from "./storePartnerReads.repo";

export type PartnerReportRange = {
  fromDateIso?: string | null;
  toDateIso?: string | null;
  partnerId?: number | null;
};

export type EffectivePartnerRow = {
  storePartnerId: number;
  partnerName: string;
  colorTag?: string | null;
  notes?: string | null;
  legacyPartnerId?: number | null;
};

export type LegacyPartnerContext = {
  partners: EffectivePartnerRow[];
  defaultShareMap: Map<number, number>;
  legacyToStorePartnerId: Map<number, number>;
  storeLegacyPartnerIds: Set<number>;
};

const tableExists = async (tableName: string): Promise<boolean> => {
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

const hasStoreOwnershipCoreTables = async (): Promise<boolean> => {
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

const normalizePercent = (value: number): number => Number(value) || 0;

const isStoreLegacyName = (value: any): boolean => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  return (
    normalized === "مغازه" ||
    normalized === "store" ||
    normalized === "shop" ||
    normalized === "فروشگاه"
  );
};

const getLegacyPartnersForFallback = async (): Promise<
  EffectivePartnerRow[]
> => {
  const rows = await allAsync(
    `SELECT id, partnerName FROM partners WHERE partnerType = 'Supplier' ORDER BY id ASC`,
  ).catch(() => [] as any[]);
  return (rows as any[])
    .filter((row) => !isStoreLegacyName(row.partnerName))
    .map((row) => ({
      storePartnerId: Number(row.id),
      legacyPartnerId: Number(row.id),
      partnerName: String(row.partnerName || `شریک ${row.id}`),
      colorTag: null,
      notes: null,
    }));
};

export const getLegacyPartnerContextForReports =
  async (): Promise<LegacyPartnerContext> => {
    const hasCore = await hasStoreOwnershipCoreTables();
    let partners: EffectivePartnerRow[] = [];
    const legacyToStorePartnerId = new Map<number, number>();
    if (hasCore) {
      const rows = await listStorePartnersFromRepo({
        hasStoreOwnershipCoreTables,
      }).catch(() => [] as any[]);
      partners = (rows as any[])
        .filter((row) => Number(row.isActive ?? 1) === 1)
        .map((row) => ({
          storePartnerId: Number(row.id),
          partnerName: String(row.name || `شریک ${row.id}`),
          colorTag: row.colorTag || null,
          notes: row.notes || null,
          legacyPartnerId:
            Array.isArray(row.legacyLinks) && row.legacyLinks.length
              ? Number(row.legacyLinks[0].legacyPartnerId)
              : null,
        }));
      for (const row of rows as any[]) {
        const links = Array.isArray(row.legacyLinks) ? row.legacyLinks : [];
        for (const link of links) {
          legacyToStorePartnerId.set(
            Number(link.legacyPartnerId),
            Number(row.id),
          );
        }
      }
    }
    if (!partners.length) {
      partners = await getLegacyPartnersForFallback();
      for (const partner of partners) {
        if (partner.legacyPartnerId != null)
          legacyToStorePartnerId.set(
            Number(partner.legacyPartnerId),
            Number(partner.storePartnerId),
          );
      }
    }

    const defaultShareMap = new Map<number, number>();
    if (hasCore && partners.length) {
      const defaultProfile: any = await getAsync(
        `SELECT id FROM profit_share_profiles WHERE isDefault = 1 ORDER BY id DESC LIMIT 1`,
      ).catch(() => null);
      if (defaultProfile?.id) {
        const items = await allAsync(
          `SELECT storePartnerId, sharePercent FROM profit_share_profile_items WHERE profileId = ?`,
          [Number(defaultProfile.id)],
        ).catch(() => [] as any[]);
        for (const item of items as any[])
          defaultShareMap.set(
            Number(item.storePartnerId),
            Number(item.sharePercent) || 0,
          );
      }
    }
    if (!defaultShareMap.size && partners.length) {
      const base = Math.floor(10000 / partners.length) / 100;
      partners.forEach((partner, index) => {
        defaultShareMap.set(
          Number(partner.storePartnerId),
          index === partners.length - 1
            ? normalizePercent(100 - base * (partners.length - 1))
            : base,
        );
      });
    }

    const storeLegacyRows = await allAsync(
      `SELECT id, partnerName FROM partners WHERE partnerType = 'Supplier' ORDER BY id ASC`,
    ).catch(() => [] as any[]);
    const storeLegacyPartnerIds = new Set<number>(
      (storeLegacyRows as any[])
        .filter((row) => isStoreLegacyName(row.partnerName))
        .map((row) => Number(row.id)),
    );

    return {
      partners,
      defaultShareMap,
      legacyToStorePartnerId,
      storeLegacyPartnerIds,
    };
  };

export const resolveLegacyOwnershipShares = async (
  legacySupplierId: number | null | undefined,
  context?: LegacyPartnerContext,
): Promise<{
  ownershipKind: "personal" | "store";
  shares: Array<{ storePartnerId: number; sharePercent: number }>;
}> => {
  const ctx = context || (await getLegacyPartnerContextForReports());
  const defaultShares = Array.from(ctx.defaultShareMap.entries()).map(
    ([storePartnerId, sharePercent]) => ({ storePartnerId, sharePercent }),
  );
  if (
    !legacySupplierId ||
    ctx.storeLegacyPartnerIds.has(Number(legacySupplierId))
  ) {
    return { ownershipKind: "store", shares: defaultShares };
  }
  const mappedStorePartnerId = ctx.legacyToStorePartnerId.get(
    Number(legacySupplierId),
  );
  if (mappedStorePartnerId) {
    return {
      ownershipKind: "personal",
      shares: [
        { storePartnerId: Number(mappedStorePartnerId), sharePercent: 100 },
      ],
    };
  }
  return { ownershipKind: "store", shares: defaultShares };
};

export const buildDateRangeSql = (
  field: string,
  range?: PartnerReportRange,
): { sql: string; params: any[] } => {
  const clauses: string[] = [];
  const params: any[] = [];
  if (range?.fromDateIso) {
    clauses.push(`${field} >= ?`);
    params.push(range.fromDateIso);
  }
  if (range?.toDateIso) {
    clauses.push(`${field} <= ?`);
    params.push(range.toDateIso);
  }
  return { sql: clauses.length ? ` AND ${clauses.join(" AND ")}` : "", params };
};

export const mapActiveStorePartners = async (): Promise<any[]> => {
  const partners = await allAsync(
    `SELECT id, name, colorTag, notes FROM store_partners WHERE isActive = 1 ORDER BY id ASC`,
  );
  return (partners as any[]).map((row) => ({
    storePartnerId: Number(row.id),
    partnerName: row.name,
    colorTag: row.colorTag || null,
    notes: row.notes || null,
  }));
};
