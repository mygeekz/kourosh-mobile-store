import { allAsync, getAsync, runAsync } from './query';

const AUTO_METHODS = new Set(['legacy_supplier_backfill', 'supplier_auto', 'supplier_sync']);

export const resolveSupplierOwnershipProfileId = async (
  supplierId: number | null | undefined,
): Promise<number | null> => {
  const legacyPartnerId = Number(supplierId || 0);
  if (!legacyPartnerId) return null;
  const row = await getAsync(
    `SELECT op.id
       FROM store_partner_legacy_links spl
       JOIN ownership_profile_items opi ON opi.storePartnerId = spl.storePartnerId
       JOIN ownership_profiles op ON op.id = opi.ownershipProfileId
      WHERE spl.legacyPartnerId = ?
        AND spl.linkType = 'owner'
        AND op.ownershipType = 'personal'
        AND COALESCE(op.isActive,1) = 1
      GROUP BY op.id
     HAVING COUNT(*) = 1
      ORDER BY op.id ASC
      LIMIT 1`,
    [legacyPartnerId],
  ).catch(() => null);
  return Number(row?.id || 0) || null;
};

type AssetKind = 'phone' | 'product';

const configFor = (kind: AssetKind) =>
  kind === 'phone'
    ? {
        table: 'phones', idField: 'id', snapshotTable: 'phone_ownership_snapshots', snapshotAssetField: 'phoneId',
      }
    : {
        table: 'products', idField: 'id', snapshotTable: 'product_ownership_snapshots', snapshotAssetField: 'productId',
      };

export const syncSupplierAutoOwnership = async (
  kind: AssetKind,
  assetId: number,
  supplierId?: number | null,
): Promise<{ changed: boolean; ownershipProfileId: number | null; protectedManual: boolean }> => {
  const cfg = configFor(kind);
  const row = await getAsync(
    `SELECT ${cfg.idField} AS id, supplierId, ownershipProfileId FROM ${cfg.table} WHERE ${cfg.idField} = ?`,
    [assetId],
  );
  if (!row) return { changed: false, ownershipProfileId: null, protectedManual: false };
  const effectiveSupplierId = supplierId === undefined ? Number(row.supplierId || 0) || null : (Number(supplierId || 0) || null);
  const targetProfileId = await resolveSupplierOwnershipProfileId(effectiveSupplierId);

  const latest = await getAsync(
    `SELECT ownershipProfileId, sourceLegacyPartnerId, sourceMethod
       FROM ${cfg.snapshotTable}
      WHERE ${cfg.snapshotAssetField} = ?
      ORDER BY id DESC LIMIT 1`,
    [assetId],
  ).catch(() => null);

  const currentProfileId = Number(row.ownershipProfileId || 0) || null;
  const latestMethod = String(latest?.sourceMethod || '').trim();
  const protectedManual = !!latestMethod && !AUTO_METHODS.has(latestMethod);
  if (protectedManual) {
    return { changed: false, ownershipProfileId: currentProfileId, protectedManual: true };
  }

  // A record without a snapshot is safe to fill only when ownership is empty. If it
  // already has a value, treat it as an unknown/manual decision rather than guessing.
  if (!latest && currentProfileId && currentProfileId !== targetProfileId) {
    return { changed: false, ownershipProfileId: currentProfileId, protectedManual: true };
  }

  if (currentProfileId === targetProfileId) {
    return { changed: false, ownershipProfileId: currentProfileId, protectedManual: false };
  }

  await runAsync(`UPDATE ${cfg.table} SET ownershipProfileId = ? WHERE ${cfg.idField} = ?`, [targetProfileId, assetId]);
  if (targetProfileId) {
    await runAsync(
      `INSERT INTO ${cfg.snapshotTable} (${cfg.snapshotAssetField}, ownershipProfileId, sourceLegacyPartnerId, sourceMethod, notes)
       VALUES (?, ?, ?, 'supplier_sync', ?)`,
      [assetId, targetProfileId, effectiveSupplierId, 'همگام‌سازی خودکار مالکیت با تامین‌کننده'],
    ).catch(() => undefined);
  }
  return { changed: true, ownershipProfileId: targetProfileId, protectedManual: false };
};

export const reconcileSupplierAutoOwnership = async (): Promise<{
  phonesUpdated: number;
  productsUpdated: number;
  manualProtected: number;
}> => {
  const phones = await allAsync(`SELECT id, supplierId FROM phones ORDER BY id ASC`).catch(() => [] as any[]);
  const products = await allAsync(`SELECT id, supplierId FROM products ORDER BY id ASC`).catch(() => [] as any[]);
  let phonesUpdated = 0;
  let productsUpdated = 0;
  let manualProtected = 0;
  for (const row of phones as any[]) {
    const result = await syncSupplierAutoOwnership('phone', Number(row.id), Number(row.supplierId || 0) || null);
    if (result.changed) phonesUpdated += 1;
    if (result.protectedManual) manualProtected += 1;
  }
  for (const row of products as any[]) {
    const result = await syncSupplierAutoOwnership('product', Number(row.id), Number(row.supplierId || 0) || null);
    if (result.changed) productsUpdated += 1;
    if (result.protectedManual) manualProtected += 1;
  }
  return { phonesUpdated, productsUpdated, manualProtected };
};
