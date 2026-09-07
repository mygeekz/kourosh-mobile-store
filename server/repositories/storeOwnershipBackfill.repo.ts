import { allAsync, getAsync, runAsync } from "../db/query";

type StoreOwnershipBackfillDeps = {
  getColumnNamesSafe: (tableName: string) => Promise<Set<string>>;
  tableExists: (tableName: string) => Promise<boolean>;
  hasStoreOwnershipCoreTables: () => Promise<boolean>;
};

export const resolveLegacyPartnerOwnershipMap = async (): Promise<Map<number, number>> => {
  const map = new Map<number, number>();
  const links = await allAsync(
    `SELECT spl.legacyPartnerId, sp.id as storePartnerId, sp.name FROM store_partner_legacy_links spl JOIN store_partners sp ON sp.id = spl.storePartnerId WHERE spl.linkType = 'owner'`,
  );
  const storeProfile = await getAsync(
    `SELECT * FROM ownership_profiles WHERE ownershipType = 'store' ORDER BY isDefault DESC, id ASC LIMIT 1`,
  );
  for (const link of links) {
    const personal = await getAsync(
      `SELECT op.id FROM ownership_profiles op JOIN ownership_profile_items opi ON opi.ownershipProfileId = op.id WHERE op.ownershipType = 'personal' AND opi.storePartnerId = ? GROUP BY op.id HAVING COUNT(*) = 1 LIMIT 1`,
      [link.storePartnerId],
    );
    if (personal?.id)
      map.set(Number(link.legacyPartnerId), Number(personal.id));
  }
  const storeLegacy = await allAsync(
    `SELECT id, partnerName FROM partners WHERE lower(trim(partnerName)) IN ('مغازه', 'store', 'shop')`,
  );
  if (storeProfile?.id) {
    for (const legacy of storeLegacy)
      map.set(Number(legacy.id), Number(storeProfile.id));
  }
  return map;
};

export const getStoreOwnershipCoverageFromDb = async ({
  getColumnNamesSafe,
  hasStoreOwnershipCoreTables,
}: StoreOwnershipBackfillDeps): Promise<any> => {
  const phoneCols = await getColumnNamesSafe("phones");
  const productCols = await getColumnNamesSafe("products");
  const hasPhoneOwnership = phoneCols.has("ownershipProfileId");
  const hasProductOwnership = productCols.has("ownershipProfileId");
  const hasCore = await hasStoreOwnershipCoreTables();

  const [phoneSummary, productSummary, profiles, storePartners] =
    await Promise.all([
      hasPhoneOwnership
        ? getAsync(
            `SELECT COUNT(1) as total, SUM(CASE WHEN ownershipProfileId IS NOT NULL THEN 1 ELSE 0 END) as mapped FROM phones`,
          )
        : getAsync(`SELECT COUNT(1) as total, 0 as mapped FROM phones`),
      hasProductOwnership
        ? getAsync(
            `SELECT COUNT(1) as total, SUM(CASE WHEN ownershipProfileId IS NOT NULL THEN 1 ELSE 0 END) as mapped FROM products`,
          )
        : getAsync(`SELECT COUNT(1) as total, 0 as mapped FROM products`),
      hasCore
        ? getAsync(`SELECT COUNT(1) as count FROM ownership_profiles`)
        : Promise.resolve({ count: 0 }),
      hasCore
        ? getAsync(
            `SELECT COUNT(1) as count FROM store_partners WHERE isActive = 1`,
          )
        : Promise.resolve({ count: 0 }),
    ]);
  return {
    phones: {
      total: Number((phoneSummary as any)?.total || 0),
      mapped: Number((phoneSummary as any)?.mapped || 0),
    },
    products: {
      total: Number((productSummary as any)?.total || 0),
      mapped: Number((productSummary as any)?.mapped || 0),
    },
    ownershipProfiles: Number((profiles as any)?.count || 0),
    activeStorePartners: Number((storePartners as any)?.count || 0),
  };
};

export const previewStoreOwnershipBackfillFromDb = async ({
  getColumnNamesSafe,
}: Pick<StoreOwnershipBackfillDeps, "getColumnNamesSafe">): Promise<any> => {
  const phoneCols = await getColumnNamesSafe("phones");
  const productCols = await getColumnNamesSafe("products");
  const hasPhoneOwnership = phoneCols.has("ownershipProfileId");
  const hasProductOwnership = productCols.has("ownershipProfileId");
  const ownershipMap = await resolveLegacyPartnerOwnershipMap().catch(
    () => new Map<number, number>(),
  );
  const phones = await allAsync(
    `SELECT ph.id, ph.model, ph.imei, ph.supplierId, pa.partnerName as legacyPartnerName${hasPhoneOwnership ? ", ph.ownershipProfileId" : ", NULL as ownershipProfileId"} FROM phones ph LEFT JOIN partners pa ON pa.id = ph.supplierId ORDER BY ph.id DESC`,
  ).catch(() => [] as any[]);
  const products = await allAsync(
    `SELECT pr.id, pr.name, pr.stock_quantity, pr.supplierId, pa.partnerName as legacyPartnerName${hasProductOwnership ? ", pr.ownershipProfileId" : ", NULL as ownershipProfileId"} FROM products pr LEFT JOIN partners pa ON pa.id = pr.supplierId ORDER BY pr.id DESC`,
  ).catch(() => [] as any[]);
  const analyze = (rows: any[]) => {
    const ready = [] as any[];
    const missingLink = [] as any[];
    const alreadyMapped = [] as any[];
    for (const row of rows) {
      if (row.ownershipProfileId) {
        alreadyMapped.push(row);
        continue;
      }
      const candidate = row.supplierId
        ? ownershipMap.get(Number(row.supplierId))
        : null;
      if (candidate)
        ready.push({ ...row, candidateOwnershipProfileId: candidate });
      else missingLink.push(row);
    }
    return { ready, missingLink, alreadyMapped };
  };
  const phoneResult = analyze(phones as any[]);
  const productResult = analyze(products as any[]);
  return {
    phones: {
      readyCount: phoneResult.ready.length,
      missingCount: phoneResult.missingLink.length,
      alreadyMappedCount: phoneResult.alreadyMapped.length,
      missingExamples: phoneResult.missingLink.slice(0, 25),
    },
    products: {
      readyCount: productResult.ready.length,
      missingCount: productResult.missingLink.length,
      alreadyMappedCount: productResult.alreadyMapped.length,
      missingExamples: productResult.missingLink.slice(0, 25),
    },
  };
};

export const applyStoreOwnershipBackfillFromDb = async (
  deps: StoreOwnershipBackfillDeps,
): Promise<any> => {
  const phoneCols = await deps.getColumnNamesSafe("phones");
  const productCols = await deps.getColumnNamesSafe("products");
  const hasPhoneOwnership = phoneCols.has("ownershipProfileId");
  const hasProductOwnership = productCols.has("ownershipProfileId");
  const hasPhoneSnapshots = await deps.tableExists("phone_ownership_snapshots");
  const hasProductSnapshots = await deps.tableExists("product_ownership_snapshots");
  const ownershipMap = await resolveLegacyPartnerOwnershipMap().catch(
    () => new Map<number, number>(),
  );
  const phones = hasPhoneOwnership
    ? await allAsync(
        `SELECT id, supplierId, ownershipProfileId FROM phones WHERE ownershipProfileId IS NULL AND supplierId IS NOT NULL`,
      ).catch(() => [] as any[])
    : [];
  const products = hasProductOwnership
    ? await allAsync(
        `SELECT id, supplierId, ownershipProfileId FROM products WHERE ownershipProfileId IS NULL AND supplierId IS NOT NULL`,
      ).catch(() => [] as any[])
    : [];
  let phonesUpdated = 0;
  let productsUpdated = 0;
  for (const row of phones as any[]) {
    const ownershipProfileId = ownershipMap.get(Number(row.supplierId || 0));
    if (!ownershipProfileId) continue;
    await runAsync(`UPDATE phones SET ownershipProfileId = ? WHERE id = ?`, [
      ownershipProfileId,
      row.id,
    ]);
    if (hasPhoneSnapshots) {
      await runAsync(
        `INSERT OR IGNORE INTO phone_ownership_snapshots (phoneId, ownershipProfileId, sourceLegacyPartnerId, sourceMethod, notes) VALUES (?, ?, ?, 'legacy_supplier_backfill', ?)`,
        [
          row.id,
          ownershipProfileId,
          row.supplierId,
          "انتساب خودکار از supplierId قدیمی",
        ],
      ).catch(() => null);
    }
    phonesUpdated += 1;
  }
  for (const row of products as any[]) {
    const ownershipProfileId = ownershipMap.get(Number(row.supplierId || 0));
    if (!ownershipProfileId) continue;
    await runAsync(`UPDATE products SET ownershipProfileId = ? WHERE id = ?`, [
      ownershipProfileId,
      row.id,
    ]);
    if (hasProductSnapshots) {
      await runAsync(
        `INSERT OR IGNORE INTO product_ownership_snapshots (productId, ownershipProfileId, sourceLegacyPartnerId, sourceMethod, notes) VALUES (?, ?, ?, 'legacy_supplier_backfill', ?)`,
        [
          row.id,
          ownershipProfileId,
          row.supplierId,
          "انتساب خودکار از supplierId قدیمی",
        ],
      ).catch(() => null);
    }
    productsUpdated += 1;
  }
  return {
    phonesUpdated,
    productsUpdated,
    coverage: await getStoreOwnershipCoverageFromDb(deps),
  };
};
