import { allAsync, getAsync, runAsync } from "../db/query";

type GetColumnNamesSafe = (tableName: string) => Promise<Set<string>>;
type TableExists = (tableName: string) => Promise<boolean>;
type ResolveLegacyPartnerOwnershipMap = () => Promise<Map<number, number>>;

type StoreOwnershipReviewQueueDeps = {
  getColumnNamesSafe: GetColumnNamesSafe;
  resolveLegacyPartnerOwnershipMap: ResolveLegacyPartnerOwnershipMap;
};

type StoreOwnershipReviewAssignmentDeps = {
  getColumnNamesSafe: GetColumnNamesSafe;
  tableExists: TableExists;
  getStoreOwnershipCoverage: () => Promise<any>;
};

export type StoreOwnershipReviewAssignmentPayload = {
  targetType: "phones" | "products";
  ids: number[];
  ownershipProfileId: number;
  notes?: string | null;
};

export const listStoreOwnershipReviewQueueFromDb = async ({
  getColumnNamesSafe,
  resolveLegacyPartnerOwnershipMap,
}: StoreOwnershipReviewQueueDeps): Promise<any> => {
  const phoneCols = await getColumnNamesSafe("phones");
  const productCols = await getColumnNamesSafe("products");
  const hasPhoneOwnership = phoneCols.has("ownershipProfileId");
  const hasProductOwnership = productCols.has("ownershipProfileId");
  const ownershipMap = await resolveLegacyPartnerOwnershipMap().catch(
    () => new Map<number, number>(),
  );
  const [phoneRows, productRows, phoneSummary, productSummary] =
    await Promise.all([
      allAsync(
        `SELECT ph.id, ph.model, ph.imei, ph.supplierId, pa.partnerName as legacyPartnerName${hasPhoneOwnership ? ", ph.ownershipProfileId" : ", NULL as ownershipProfileId"}, ph.status, ph.purchasePrice, ph.salePrice FROM phones ph LEFT JOIN partners pa ON pa.id = ph.supplierId ${hasPhoneOwnership ? "WHERE ph.ownershipProfileId IS NULL" : ""} ORDER BY ph.id DESC LIMIT 250`,
      ).catch(() => [] as any[]),
      allAsync(
        `SELECT pr.id, pr.name, pr.stock_quantity, pr.supplierId, pa.partnerName as legacyPartnerName${hasProductOwnership ? ", pr.ownershipProfileId" : ", NULL as ownershipProfileId"}, pr.purchasePrice, pr.selling_price FROM products pr LEFT JOIN partners pa ON pa.id = pr.supplierId ${hasProductOwnership ? "WHERE pr.ownershipProfileId IS NULL" : ""} ORDER BY pr.id DESC LIMIT 250`,
      ).catch(() => [] as any[]),
      hasPhoneOwnership
        ? getAsync(
            `SELECT COUNT(1) as count FROM phones WHERE ownershipProfileId IS NULL`,
          ).catch(() => ({ count: 0 }))
        : Promise.resolve({ count: 0 }),
      hasProductOwnership
        ? getAsync(
            `SELECT COUNT(1) as count FROM products WHERE ownershipProfileId IS NULL`,
          ).catch(() => ({ count: 0 }))
        : Promise.resolve({ count: 0 }),
    ]);
  const mapCandidate = (supplierId: any) => {
    const legacyId = Number(supplierId || 0);
    if (!legacyId) return null;
    return ownershipMap.get(legacyId) || null;
  };
  return {
    phones: {
      total: Number((phoneSummary as any)?.count || 0),
      items: (phoneRows as any[]).map((row: any) => ({
        ...row,
        candidateOwnershipProfileId: mapCandidate(row.supplierId),
        candidateReason: mapCandidate(row.supplierId)
          ? "قابل انتساب از supplierId قدیمی"
          : "نیازمند تعیین دستی",
      })),
    },
    products: {
      total: Number((productSummary as any)?.count || 0),
      items: (productRows as any[]).map((row: any) => ({
        ...row,
        candidateOwnershipProfileId: mapCandidate(row.supplierId),
        candidateReason: mapCandidate(row.supplierId)
          ? "قابل انتساب از supplierId قدیمی"
          : "نیازمند تعیین دستی",
      })),
    },
  };
};

export const assignStoreOwnershipReviewItemsFromDb = async (
  payload: StoreOwnershipReviewAssignmentPayload,
  {
    getColumnNamesSafe,
    tableExists,
    getStoreOwnershipCoverage,
  }: StoreOwnershipReviewAssignmentDeps,
): Promise<any> => {
  const phoneCols = await getColumnNamesSafe("phones");
  const productCols = await getColumnNamesSafe("products");
  const hasPhoneOwnership = phoneCols.has("ownershipProfileId");
  const hasProductOwnership = productCols.has("ownershipProfileId");
  const hasPhoneSnapshots = await tableExists("phone_ownership_snapshots");
  const hasProductSnapshots = await tableExists("product_ownership_snapshots");
  const targetType = payload?.targetType === "products" ? "products" : "phones";
  const ids = Array.from(
    new Set(
      (payload?.ids || [])
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0),
    ),
  );
  if (!ids.length) throw new Error("حداقل یک مورد برای انتساب انتخاب کن.");
  if (ids.length > 250) throw new Error("در هر عملیات حداکثر ۲۵۰ رکورد قابل انتساب است.");

  const ownershipProfileId = Number(payload?.ownershipProfileId || 0);
  if (!Number.isInteger(ownershipProfileId) || ownershipProfileId <= 0)
    throw new Error("پروفایل مالکیت معتبر انتخاب نشده است.");
  const profile = await getAsync(
    `SELECT id, title FROM ownership_profiles WHERE id = ? AND isActive = 1`,
    [ownershipProfileId],
  );
  if (!profile?.id) throw new Error("پروفایل مالکیت انتخاب‌شده پیدا نشد یا غیرفعال است.");

  if (targetType === "phones" && !hasPhoneOwnership)
    throw new Error("ستون مالکیت گوشی‌ها هنوز روی دیتابیس شما آماده نشده است.");
  if (targetType === "products" && !hasProductOwnership)
    throw new Error("ستون مالکیت کالاها هنوز روی دیتابیس شما آماده نشده است.");

  const normalizedNotes = String(payload?.notes || "").trim();
  if (normalizedNotes.length > 1000) throw new Error("یادداشت تصمیم نباید بیشتر از ۱۰۰۰ کاراکتر باشد.");
  const notes = normalizedNotes || "انتساب دستی از صف بازبینی مالکیت";
  let updated = 0;
  let skipped = 0;

  if (targetType === "phones") {
    for (const id of ids) {
      const row = await getAsync(
        `SELECT id, supplierId, ownershipProfileId FROM phones WHERE id = ?`,
        [id],
      );
      if (!row?.id || row.ownershipProfileId) {
        skipped += 1;
        continue;
      }
      const result = await runAsync(
        `UPDATE phones SET ownershipProfileId = ? WHERE id = ? AND ownershipProfileId IS NULL`,
        [ownershipProfileId, id],
      );
      if (!Number(result.changes || 0)) {
        skipped += 1;
        continue;
      }
      if (hasPhoneSnapshots) {
        await runAsync(
          `INSERT OR IGNORE INTO phone_ownership_snapshots (phoneId, ownershipProfileId, sourceLegacyPartnerId, sourceMethod, notes) VALUES (?, ?, ?, 'manual_review', ?)`,
          [id, ownershipProfileId, row.supplierId || null, notes],
        ).catch(() => null);
      }
      updated += 1;
    }
  } else {
    for (const id of ids) {
      const row = await getAsync(
        `SELECT id, supplierId, ownershipProfileId FROM products WHERE id = ?`,
        [id],
      );
      if (!row?.id || row.ownershipProfileId) {
        skipped += 1;
        continue;
      }
      const result = await runAsync(
        `UPDATE products SET ownershipProfileId = ? WHERE id = ? AND ownershipProfileId IS NULL`,
        [ownershipProfileId, id],
      );
      if (!Number(result.changes || 0)) {
        skipped += 1;
        continue;
      }
      if (hasProductSnapshots) {
        await runAsync(
          `INSERT OR IGNORE INTO product_ownership_snapshots (productId, ownershipProfileId, sourceLegacyPartnerId, sourceMethod, notes) VALUES (?, ?, ?, 'manual_review', ?)`,
          [id, ownershipProfileId, row.supplierId || null, notes],
        ).catch(() => null);
      }
      updated += 1;
    }
  }
  return {
    targetType,
    ownershipProfileId,
    ownershipProfileTitle: profile.title,
    updated,
    skipped,
    coverage: await getStoreOwnershipCoverage(),
  };
};

