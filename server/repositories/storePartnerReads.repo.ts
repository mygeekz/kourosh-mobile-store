import { allAsync } from "../db/query";

export type StorePartnerReadDeps = {
  tableExists: (tableName: string) => Promise<boolean>;
  hasStoreOwnershipCoreTables: () => Promise<boolean>;
};

export const getLegacyPartnerCandidatesFromDb = async ({
  tableExists,
  hasStoreOwnershipCoreTables,
}: StorePartnerReadDeps): Promise<any[]> => {
  const hasPartners = await tableExists("partners");
  if (!hasPartners) return [];
  const hasCore = await hasStoreOwnershipCoreTables();
  if (!hasCore) {
    return allAsync(
      `SELECT p.id, p.partnerName, p.partnerType,
              COALESCE((SELECT COUNT(1) FROM phones ph WHERE ph.supplierId = p.id), 0) as phoneCount,
              COALESCE((SELECT COUNT(1) FROM products pr WHERE pr.supplierId = p.id), 0) as productCount,
              0 as isLinked,
              NULL as linkedStorePartnerId,
              NULL as linkedStorePartnerName
         FROM partners p
        ORDER BY p.partnerName COLLATE NOCASE ASC`,
    );
  }
  return allAsync(
    `SELECT p.id, p.partnerName, p.partnerType,
            COALESCE((SELECT COUNT(1) FROM phones ph WHERE ph.supplierId = p.id), 0) as phoneCount,
            COALESCE((SELECT COUNT(1) FROM products pr WHERE pr.supplierId = p.id), 0) as productCount,
            CASE WHEN spl.id IS NOT NULL THEN 1 ELSE 0 END as isLinked,
            sp.id as linkedStorePartnerId,
            sp.name as linkedStorePartnerName
       FROM partners p
       LEFT JOIN store_partner_legacy_links spl ON spl.legacyPartnerId = p.id AND spl.linkType = 'owner'
       LEFT JOIN store_partners sp ON sp.id = spl.storePartnerId
      ORDER BY p.partnerName COLLATE NOCASE ASC`,
  );
};

export const listStorePartnersFromDb = async ({
  hasStoreOwnershipCoreTables,
}: Pick<StorePartnerReadDeps, "hasStoreOwnershipCoreTables">): Promise<any[]> => {
  const hasCore = await hasStoreOwnershipCoreTables();
  if (!hasCore) return [];
  const rows = await allAsync(
    `SELECT * FROM store_partners ORDER BY isActive DESC, id ASC`,
  );
  const links = await allAsync(
    `SELECT spl.storePartnerId, spl.legacyPartnerId, spl.linkType, p.partnerName as legacyPartnerName
       FROM store_partner_legacy_links spl
       JOIN partners p ON p.id = spl.legacyPartnerId`,
  ).catch(() => [] as any[]);
  const linkMap = new Map<number, any[]>();
  for (const link of links as any[]) {
    const key = Number(link.storePartnerId || 0);
    if (!linkMap.has(key)) linkMap.set(key, []);
    linkMap.get(key)!.push({
      legacyPartnerId: link.legacyPartnerId,
      legacyPartnerName: link.legacyPartnerName,
      linkType: link.linkType,
    });
  }
  return (rows as any[]).map((row) => ({
    ...row,
    legacyLinks: linkMap.get(Number(row.id || 0)) || [],
  }));
};
