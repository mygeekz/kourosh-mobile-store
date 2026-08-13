// Phase 1G: profit snapshot, legacy partner report fallback, and ownership allocation helpers extracted from legacyRuntime.ts.

import moment from "jalali-moment";
import { allAsync, getAsync, runAsync } from "../query";
import {
  buildDateRangeSql,
  getLegacyPartnerContextForReports,
  mapActiveStorePartners,
  resolveLegacyOwnershipShares,
  type PartnerReportRange,
} from "../../repositories/partnerOwnershipReportBoundary.repo";
import {
  PHONE_SETTLEMENT_LEDGER_TYPES_SQL,
  getColumnNamesSafe,
  tableExists,
} from "./partners.db";

export type ProfitShareLine = {
  storePartnerId: number;
  sharePercent: number;
  partnerName?: string | null;
  colorTag?: string | null;
};
export type ResolvedOwnershipContext = {
  ownershipProfileId: number | null;
  ownershipTitle: string | null;
  ownershipType: "personal" | "store" | "shared" | null;
  ownershipItems: ProfitShareLine[];
  profitShareProfileId: number | null;
  profitShareProfileTitle: string | null;
  profitShareItems: ProfitShareLine[];
};

export type SaleProfitSnapshotItemInput = {
  sourceKind: "sales_order" | "installment_sale";
  sourceId: number;
  sourceItemRefType: "sales_order_item" | "installment_sale_item";
  sourceItemId: number;
  saleDate: string | null;
  itemType: "phone" | "inventory" | "service";
  itemId: number | null;
  itemDescription: string;
  quantity: number;
  saleUnitPrice: number;
  itemDiscount: number;
  saleAmount: number;
  initialCostPerUnit: number;
  marketCostPerUnit: number;
  ownershipProfileId: number | null;
  fallbackNotes?: string | null;
};

export const normalizeShareLines = (items: ProfitShareLine[]): ProfitShareLine[] => {
  const cleaned = (items || [])
    .map((item) => ({
      storePartnerId: Number(item.storePartnerId) || 0,
      sharePercent: Number(item.sharePercent) || 0,
      partnerName: item.partnerName || null,
      colorTag: item.colorTag || null,
    }))
    .filter((item) => item.storePartnerId > 0 && item.sharePercent !== 0);
  const total = cleaned.reduce((sum, item) => sum + item.sharePercent, 0);
  if (!cleaned.length || Math.abs(total) < 1e-9) return [];
  return cleaned.map((item) => ({
    ...item,
    sharePercent: (item.sharePercent / total) * 100,
  }));
};

export const getDefaultProfitShareProfileFromDb = async (): Promise<any | null> => {
  return (
    (await getAsync(
      `SELECT * FROM profit_share_profiles WHERE isDefault = 1 AND isActive = 1 ORDER BY id DESC LIMIT 1`,
    )) || null
  );
};

export const getDefaultOwnershipProfileFromDb = async (): Promise<any | null> => {
  return (
    (await getAsync(
      `SELECT * FROM ownership_profiles WHERE isDefault = 1 AND isActive = 1 ORDER BY id DESC LIMIT 1`,
    )) || null
  );
};

export const getProfitShareLinesByProfileId = async (
  profileId: number | null | undefined,
): Promise<ProfitShareLine[]> => {
  if (!profileId) return [];
  const rows = await allAsync(
    `SELECT i.storePartnerId, i.sharePercent, sp.name as partnerName, sp.colorTag
       FROM profit_share_profile_items i
       JOIN store_partners sp ON sp.id = i.storePartnerId
      WHERE i.profileId = ?
      ORDER BY i.sortOrder ASC, i.id ASC`,
    [profileId],
  );
  return normalizeShareLines(rows as ProfitShareLine[]);
};

export const getOwnershipLinesByProfileId = async (
  ownershipProfileId: number | null | undefined,
): Promise<ProfitShareLine[]> => {
  if (!ownershipProfileId) return [];
  const rows = await allAsync(
    `SELECT i.storePartnerId, i.sharePercent, sp.name as partnerName, sp.colorTag
       FROM ownership_profile_items i
       JOIN store_partners sp ON sp.id = i.storePartnerId
      WHERE i.ownershipProfileId = ?
      ORDER BY i.sortOrder ASC, i.id ASC`,
    [ownershipProfileId],
  );
  return normalizeShareLines(rows as ProfitShareLine[]);
};

export const resolveOwnershipContextByProfileId = async (
  ownershipProfileId: number | null | undefined,
): Promise<ResolvedOwnershipContext> => {
  let profile = ownershipProfileId
    ? await getAsync(
        `SELECT op.*, psp.title as profitShareProfileTitle FROM ownership_profiles op LEFT JOIN profit_share_profiles psp ON psp.id = op.profitShareProfileId WHERE op.id = ?`,
        [ownershipProfileId],
      )
    : null;
  if (!profile) {
    profile = await getDefaultOwnershipProfileFromDb();
    if (profile) {
      const linked = profile.profitShareProfileId
        ? await getAsync(
            `SELECT title FROM profit_share_profiles WHERE id = ?`,
            [profile.profitShareProfileId],
          )
        : null;
      profile = { ...profile, profitShareProfileTitle: linked?.title || null };
    }
  }

  const ownershipItems = normalizeShareLines(
    await getOwnershipLinesByProfileId(Number(profile?.id || 0)),
  );
  let profitShareItems = normalizeShareLines(
    await getProfitShareLinesByProfileId(
      Number(profile?.profitShareProfileId || 0),
    ),
  );
  let profitShareProfileId = Number(profile?.profitShareProfileId || 0) || null;
  let profitShareProfileTitle =
    (profile as any)?.profitShareProfileTitle || null;

  if (!profitShareItems.length) {
    const defaultProfit = await getDefaultProfitShareProfileFromDb();
    if (defaultProfit) {
      const defaultItems = normalizeShareLines(
        await getProfitShareLinesByProfileId(Number(defaultProfit.id)),
      );
      if (defaultItems.length) {
        profitShareItems = defaultItems;
        profitShareProfileId = Number(defaultProfit.id);
        profitShareProfileTitle =
          String(defaultProfit.title || "").trim() || null;
      }
    }
  }

  if (!profitShareItems.length) {
    profitShareItems = ownershipItems;
    if (!profitShareProfileTitle && ownershipItems.length) {
      profitShareProfileTitle = "تقسیم بر پایه مالکیت";
    }
  }

  return {
    ownershipProfileId: Number(profile?.id || 0) || null,
    ownershipTitle: profile ? String(profile.title || "").trim() || null : null,
    ownershipType: profile
      ? (String(profile.ownershipType || "shared") as any) || "shared"
      : null,
    ownershipItems,
    profitShareProfileId,
    profitShareProfileTitle,
    profitShareItems,
  };
};

export const allocateAmountAcrossShares = (
  amount: number,
  items: ProfitShareLine[],
): Array<ProfitShareLine & { amount: number }> => {
  const normalized = normalizeShareLines(items);
  if (!normalized.length || !Number.isFinite(Number(amount))) return [];
  return normalized.map((item) => ({
    ...item,
    amount: Number(amount) * (Number(item.sharePercent) / 100),
  }));
};

export const purgeProfitSnapshotsForSource = async (
  sourceKind: "sales_order" | "installment_sale",
  sourceId: number,
): Promise<void> => {
  const snapshots = await allAsync(
    `SELECT id FROM sale_profit_snapshots WHERE sourceKind = ? AND sourceId = ?`,
    [sourceKind, sourceId],
  );
  const ids = (snapshots || [])
    .map((row: any) => Number(row.id))
    .filter((id: number) => id > 0);
  if (ids.length) {
    await runAsync(
      `DELETE FROM sale_profit_allocations WHERE snapshotId IN (${ids.map(() => "?").join(",")})`,
      ids,
    );
  }
  await runAsync(
    `DELETE FROM sale_profit_snapshots WHERE sourceKind = ? AND sourceId = ?`,
    [sourceKind, sourceId],
  );
};

export const updateSaleProfitSnapshotSourceStatus = async (
  sourceKind: "sales_order" | "installment_sale",
  sourceId: number,
  sourceStatus: "active" | "canceled" | "deleted",
): Promise<void> => {
  await runAsync(
    `UPDATE sale_profit_snapshots SET sourceStatus = ?, updatedAt = (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')) WHERE sourceKind = ? AND sourceId = ?`,
    [sourceStatus, sourceKind, sourceId],
  );
  await runAsync(
    `UPDATE sale_profit_allocations SET sourceStatus = ?, updatedAt = (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')) WHERE sourceKind = ? AND sourceId = ?`,
    [sourceStatus, sourceKind, sourceId],
  );
};

export const persistSaleProfitSnapshotItem = async (
  input: SaleProfitSnapshotItemInput,
): Promise<void> => {
  const ctx = await resolveOwnershipContextByProfileId(
    input.ownershipProfileId,
  );
  const quantity = Number(input.quantity) || 0;
  const saleAmount = Number(input.saleAmount) || 0;
  const initialCostPerUnit = Number(input.initialCostPerUnit) || 0;
  const marketCostPerUnit = Number(input.marketCostPerUnit) || 0;
  const initialCostAmount = initialCostPerUnit * quantity;
  const marketCostAmount = marketCostPerUnit * quantity;
  let ownerGainAmount = 0;
  let sharedProfitAmount = 0;
  let notes = String(input.fallbackNotes || "").trim();

  if (ctx.ownershipType === "personal") {
    ownerGainAmount = marketCostAmount - initialCostAmount;
    sharedProfitAmount = saleAmount - marketCostAmount;
  } else {
    ownerGainAmount = 0;
    sharedProfitAmount = saleAmount - initialCostAmount;
  }
  const totalProfitAmount = ownerGainAmount + sharedProfitAmount;

  const snapshotInsert = await runAsync(
    `INSERT INTO sale_profit_snapshots (
      sourceKind, sourceId, sourceItemRefType, sourceItemId, saleDate, itemType, itemId, itemDescription,
      quantity, ownershipProfileId, ownershipTitle, ownershipType, profitShareProfileId, profitShareProfileTitle,
      initialCostPerUnit, marketCostPerUnit, saleUnitPrice, itemDiscount, saleAmount,
      initialCostAmount, marketCostAmount, ownerGainAmount, sharedProfitAmount, totalProfitAmount, sourceStatus, notes
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      input.sourceKind,
      input.sourceId,
      input.sourceItemRefType,
      input.sourceItemId,
      input.saleDate || null,
      input.itemType,
      input.itemId,
      input.itemDescription,
      quantity,
      ctx.ownershipProfileId,
      ctx.ownershipTitle,
      ctx.ownershipType,
      ctx.profitShareProfileId,
      ctx.profitShareProfileTitle,
      initialCostPerUnit,
      marketCostPerUnit,
      Number(input.saleUnitPrice) || 0,
      Number(input.itemDiscount) || 0,
      saleAmount,
      initialCostAmount,
      marketCostAmount,
      ownerGainAmount,
      sharedProfitAmount,
      totalProfitAmount,
      "active",
      notes || null,
    ],
  );
  const snapshotId = Number(snapshotInsert.lastID || 0);

  const ownerAllocations =
    ctx.ownershipType === "personal"
      ? allocateAmountAcrossShares(ownerGainAmount, ctx.ownershipItems)
      : [];
  const sharedAllocations = allocateAmountAcrossShares(
    sharedProfitAmount,
    ctx.profitShareItems,
  );

  if (
    ctx.ownershipType === "personal" &&
    !ownerAllocations.length &&
    ownerGainAmount !== 0
  ) {
    notes = [notes, "سهم مالک شخصی یافت نشد."].filter(Boolean).join(" | ");
    await runAsync(`UPDATE sale_profit_snapshots SET notes = ? WHERE id = ?`, [
      notes,
      snapshotId,
    ]);
  }

  const allAllocations = [
    ...ownerAllocations.map((row) => ({
      ...row,
      allocationType: "owner_gain",
    })),
    ...sharedAllocations.map((row) => ({
      ...row,
      allocationType: "shared_profit",
    })),
  ];

  for (const allocation of allAllocations) {
    await runAsync(
      `INSERT INTO sale_profit_allocations (
        snapshotId, sourceKind, sourceId, sourceItemRefType, sourceItemId, storePartnerId, allocationType, sharePercent, amount, sourceStatus, notes
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        snapshotId,
        input.sourceKind,
        input.sourceId,
        input.sourceItemRefType,
        input.sourceItemId,
        allocation.storePartnerId,
        allocation.allocationType,
        allocation.sharePercent,
        allocation.amount,
        "active",
        allocation.partnerName || null,
      ],
    );
  }
};


// Phase 1C: `snapshotSalesOrderProfitAllocations` moved to server/db/domains.


export const snapshotInstallmentSaleProfitAllocations = async (
  saleId: number,
): Promise<void> => {
  await purgeProfitSnapshotsForSource("installment_sale", saleId);
  const sale = await getAsync(
    `SELECT saleDateISO, saleDate, installmentsStartDate, dateCreated FROM installment_sales WHERE id = ?`,
    [saleId],
  );
  const saleDate = (() => {
    const explicitIso = String(sale?.saleDateISO || "").trim();
    if (explicitIso) return explicitIso;
    const raw = String(sale?.saleDate || sale?.dateCreated || sale?.installmentsStartDate || "").trim();
    if (!raw) return null;
    const m = moment(
      raw,
      ["YYYY-MM-DD", "jYYYY/jMM/jDD", "jYYYY/jM/jD", moment.ISO_8601],
      true,
    );
    return m.isValid() ? m.locale("en").format("YYYY-MM-DD") : null;
  })();
  const rows = await allAsync(
    `SELECT isi.id as sourceItemId, isi.saleId as sourceId, isi.itemType, isi.itemId, isi.description,
            isi.quantity, isi.unitPrice, isi.buyPrice, isi.totalPrice,
            ph.purchasePrice as phonePurchasePrice, ph.ownershipProfileId as phoneOwnershipProfileId,
            pr.purchasePrice as productPurchasePrice, pr.ownershipProfileId as productOwnershipProfileId
       FROM installment_sale_items isi
       LEFT JOIN phones ph ON isi.itemType = 'phone' AND ph.id = isi.itemId
       LEFT JOIN products pr ON isi.itemType = 'inventory' AND pr.id = isi.itemId
      WHERE isi.saleId = ?
      ORDER BY isi.id ASC`,
    [saleId],
  );

  for (const row of rows as any[]) {
    const initialCostPerUnit =
      row.itemType === "phone"
        ? Number(row.phonePurchasePrice) || 0
        : row.itemType === "inventory"
          ? Number(row.productPurchasePrice) || 0
          : 0;
    const ownershipProfileId =
      row.itemType === "phone"
        ? Number(row.phoneOwnershipProfileId) || null
        : row.itemType === "inventory"
          ? Number(row.productOwnershipProfileId) || null
          : null;
    await persistSaleProfitSnapshotItem({
      sourceKind: "installment_sale",
      sourceId: Number(row.sourceId),
      sourceItemRefType: "installment_sale_item",
      sourceItemId: Number(row.sourceItemId),
      saleDate,
      itemType: row.itemType,
      itemId: Number(row.itemId) || null,
      itemDescription:
        String(row.description || "").trim() || `آیتم ${row.sourceItemId}`,
      quantity: Number(row.quantity) || 0,
      saleUnitPrice: Number(row.unitPrice) || 0,
      itemDiscount: 0,
      saleAmount: Number(row.totalPrice) || 0,
      initialCostPerUnit,
      marketCostPerUnit: Number(row.buyPrice) || initialCostPerUnit || 0,
      ownershipProfileId,
      fallbackNotes: ownershipProfileId
        ? null
        : "مالکیت مشخص نبود؛ تلاش شد پروفایل پیش‌فرض اعمال شود.",
    });
  }
};

export const buildSaleProfitSnapshotResponse = async (
  sourceKind: "sales_order" | "installment_sale",
  sourceId: number,
): Promise<any> => {
  const snapshots = await allAsync(
    `SELECT * FROM sale_profit_snapshots WHERE sourceKind = ? AND sourceId = ? ORDER BY id ASC`,
    [sourceKind, sourceId],
  );
  const allocations = await allAsync(
    `SELECT spa.*, sp.name as partnerName, sp.colorTag
       FROM sale_profit_allocations spa
       LEFT JOIN store_partners sp ON sp.id = spa.storePartnerId
      WHERE spa.sourceKind = ? AND spa.sourceId = ?
      ORDER BY spa.id ASC`,
    [sourceKind, sourceId],
  );

  const bySnapshot = new Map<number, any[]>();
  for (const row of allocations as any[]) {
    const key = Number(row.snapshotId) || 0;
    if (!bySnapshot.has(key)) bySnapshot.set(key, []);
    bySnapshot.get(key)!.push(row);
  }

  const partnerMap = new Map<number, any>();
  for (const row of allocations as any[]) {
    const pid = Number(row.storePartnerId) || 0;
    if (!pid) continue;
    if (!partnerMap.has(pid)) {
      partnerMap.set(pid, {
        storePartnerId: pid,
        partnerName: row.partnerName || `شریک ${pid}`,
        colorTag: row.colorTag || null,
        ownerGainAmount: 0,
        sharedProfitAmount: 0,
        totalAmount: 0,
      });
    }
    const bucket = partnerMap.get(pid)!;
    const amount = Number(row.amount) || 0;
    if (row.allocationType === "owner_gain") bucket.ownerGainAmount += amount;
    if (row.allocationType === "shared_profit")
      bucket.sharedProfitAmount += amount;
    bucket.totalAmount += amount;
  }

  const totals = (snapshots as any[]).reduce(
    (acc, row) => {
      acc.saleAmount += Number(row.saleAmount) || 0;
      acc.initialCostAmount += Number(row.initialCostAmount) || 0;
      acc.marketCostAmount += Number(row.marketCostAmount) || 0;
      acc.ownerGainAmount += Number(row.ownerGainAmount) || 0;
      acc.sharedProfitAmount += Number(row.sharedProfitAmount) || 0;
      acc.totalProfitAmount += Number(row.totalProfitAmount) || 0;
      return acc;
    },
    {
      saleAmount: 0,
      initialCostAmount: 0,
      marketCostAmount: 0,
      ownerGainAmount: 0,
      sharedProfitAmount: 0,
      totalProfitAmount: 0,
    },
  );

  return {
    sourceKind,
    sourceId,
    totals,
    items: (snapshots as any[]).map((row) => ({
      ...row,
      allocations: bySnapshot.get(Number(row.id) || 0) || [],
    })),
    partnerTotals: Array.from(partnerMap.values()).sort(
      (a, b) => Number(b.totalAmount) - Number(a.totalAmount),
    ),
  };
};


// Phase 1C: `getSalesOrderProfitSnapshotFromDb` moved to server/db/domains.



// Phase 1C: `getInstallmentSaleProfitSnapshotFromDb` moved to server/db/domains.


export const getLegacySaleRowsForReports = async (
  range: PartnerReportRange = {},
): Promise<any[]> => {
  const orderFilter = buildDateRangeSql("so.transactionDate", range);
  const salesOrderRows = await allAsync(
    `SELECT 'sales_order' as sourceKind, so.id as sourceId, soi.id as sourceItemId, so.transactionDate as saleDate,
            soi.itemType, soi.itemId, soi.description as itemDescription, soi.quantity, soi.totalPrice as saleAmount,
            CASE
              WHEN soi.itemType = 'phone' THEN COALESCE(NULLIF(ph.currentPurchasePrice, 0), NULLIF(soi.buyPrice, 0), ph.purchasePrice, 0)
              WHEN soi.itemType = 'inventory' THEN COALESCE(NULLIF(soi.buyPrice, 0), pr.purchasePrice, 0)
              ELSE COALESCE(soi.buyPrice, 0)
            END as marketUnitBuyPrice,
            ph.model as phoneModel, ph.imei as phoneImei, ph.purchasePrice as phonePurchasePrice, ph.currentPurchasePrice as phoneCurrentPurchasePrice, ph.supplierId as phoneSupplierId,
            pr.name as productName, pr.purchasePrice as productPurchasePrice, pr.supplierId as productSupplierId
       FROM sales_order_items soi
       JOIN sales_orders so ON so.id = soi.orderId
       LEFT JOIN phones ph ON soi.itemType = 'phone' AND ph.id = soi.itemId
       LEFT JOIN products pr ON soi.itemType = 'inventory' AND pr.id = soi.itemId
      WHERE COALESCE(so.status, 'active') = 'active'${orderFilter.sql}
      ORDER BY so.transactionDate DESC, so.id DESC, soi.id DESC`,
    orderFilter.params,
  ).catch(() => [] as any[]);

  const installmentFilter = buildDateRangeSql("COALESCE(ins.saleDateISO, ins.dateCreated)", range);
  const installmentRows = await allAsync(
    `SELECT 'installment_sale' as sourceKind, ins.id as sourceId, isi.id as sourceItemId, COALESCE(ins.saleDateISO, ins.dateCreated) as saleDate,
            isi.itemType, isi.itemId, isi.description as itemDescription, isi.quantity, isi.totalPrice as saleAmount,
            CASE
              WHEN isi.itemType = 'phone' THEN COALESCE(NULLIF(ph.currentPurchasePrice, 0), NULLIF(isi.buyPrice, 0), ph.purchasePrice, 0)
              WHEN isi.itemType = 'inventory' THEN COALESCE(NULLIF(isi.buyPrice, 0), pr.purchasePrice, 0)
              ELSE COALESCE(isi.buyPrice, 0)
            END as marketUnitBuyPrice,
            ph.model as phoneModel, ph.imei as phoneImei, ph.purchasePrice as phonePurchasePrice, ph.currentPurchasePrice as phoneCurrentPurchasePrice, ph.supplierId as phoneSupplierId,
            pr.name as productName, pr.purchasePrice as productPurchasePrice, pr.supplierId as productSupplierId
       FROM installment_sale_items isi
       JOIN installment_sales ins ON ins.id = isi.saleId
       LEFT JOIN phones ph ON isi.itemType = 'phone' AND ph.id = isi.itemId
       LEFT JOIN products pr ON isi.itemType = 'inventory' AND pr.id = isi.itemId
      WHERE COALESCE(ins.status, 'active') = 'active'${installmentFilter.sql}
      ORDER BY COALESCE(ins.saleDateISO, ins.dateCreated) DESC, ins.id DESC, isi.id DESC`,
    installmentFilter.params,
  ).catch(() => [] as any[]);

  return [...(salesOrderRows as any[]), ...(installmentRows as any[])];
};

export const buildLegacyComputedSales = async (
  range: PartnerReportRange = {},
): Promise<any[]> => {
  const context = await getLegacyPartnerContextForReports();
  const sourceRows = await getLegacySaleRowsForReports(range);
  const computed: any[] = [];
  for (const row of sourceRows as any[]) {
    const itemType = String(row.itemType || "service");
    const quantity = Number(row.quantity) || 0;
    const saleAmount = Number(row.saleAmount) || 0;
    const initialUnitCost =
      itemType === "phone"
        ? Number(row.phonePurchasePrice) || 0
        : itemType === "inventory"
          ? Number(row.productPurchasePrice) || 0
          : 0;
    const initialCostAmount =
      itemType === "phone" ? initialUnitCost : initialUnitCost * quantity;
    const marketUnitBuyPrice = Number(row.marketUnitBuyPrice) || 0;
    const marketCostAmount =
      itemType === "service"
        ? 0
        : marketUnitBuyPrice > 0
          ? itemType === "phone"
            ? marketUnitBuyPrice
            : marketUnitBuyPrice * quantity
          : initialCostAmount;
    const legacySupplierId =
      itemType === "phone"
        ? Number(row.phoneSupplierId || 0)
        : itemType === "inventory"
          ? Number(row.productSupplierId || 0)
          : null;
    const ownership = await resolveLegacyOwnershipShares(
      legacySupplierId,
      context,
    );
    const capitalShares = ownership.shares.map((share) => ({
      ...share,
      amount: initialCostAmount * ((Number(share.sharePercent) || 0) / 100),
    }));
    const ownerGainAmount =
      ownership.ownershipKind === "personal"
        ? marketCostAmount - initialCostAmount
        : 0;
    const sharedProfitAmount =
      ownership.ownershipKind === "personal"
        ? saleAmount - marketCostAmount
        : saleAmount - initialCostAmount;
    const sharedAllocations = Array.from(context.defaultShareMap.entries()).map(
      ([storePartnerId, sharePercent]) => ({
        storePartnerId,
        sharePercent,
        amount: sharedProfitAmount * ((Number(sharePercent) || 0) / 100),
      }),
    );
    const ownerAllocations =
      ownership.ownershipKind === "personal"
        ? ownership.shares.map((share) => ({
            ...share,
            amount: ownerGainAmount * ((Number(share.sharePercent) || 0) / 100),
          }))
        : [];
    computed.push({
      sourceKind: row.sourceKind,
      sourceId: Number(row.sourceId),
      sourceItemId: Number(row.sourceItemId),
      saleDate: row.saleDate,
      itemType,
      itemId: row.itemId != null ? Number(row.itemId) : null,
      itemDescription:
        row.phoneModel || row.productName || row.itemDescription || "-",
      quantity,
      saleAmount,
      initialCostAmount,
      marketCostAmount,
      ownershipKind: ownership.ownershipKind,
      ownershipShares: ownership.shares,
      capitalAllocations: capitalShares,
      ownerGainAmount,
      ownerAllocations,
      sharedProfitAmount,
      sharedAllocations,
      totalProfitAmount: ownerGainAmount + sharedProfitAmount,
      documentKey:
        row.sourceKind === "sales_order"
          ? `INV-${row.sourceId}`
          : `INS-${row.sourceId}`,
      model: row.phoneModel || null,
      imei: row.phoneImei || null,
      legacySupplierId: legacySupplierId || null,
    });
  }
  return computed;
};

export const summarizeLegacyProfitRows = async (range: PartnerReportRange = {}) => {
  const context = await getLegacyPartnerContextForReports();
  const computed = await buildLegacyComputedSales(range);
  const summaryMap = new Map<number, any>();
  for (const partner of context.partners) {
    summaryMap.set(Number(partner.storePartnerId), {
      storePartnerId: Number(partner.storePartnerId),
      partnerName: partner.partnerName,
      colorTag: partner.colorTag || null,
      capitalReturnAmount: 0,
      ownerGainAmount: 0,
      sharedProfitAmount: 0,
      totalAmount: 0,
      settlementEntitlementAmount: 0,
      documentsCount: 0,
      phoneLinesCount: 0,
      accessoryLinesCount: 0,
      serviceLinesCount: 0,
      _docKeys: new Set<string>(),
    });
  }
  const ensure = (partnerId: number) => {
    if (!summaryMap.has(partnerId)) {
      const partner = context.partners.find(
        (item) => Number(item.storePartnerId) === Number(partnerId),
      );
      summaryMap.set(partnerId, {
        storePartnerId: partnerId,
        partnerName: partner?.partnerName || `شریک ${partnerId}`,
        colorTag: partner?.colorTag || null,
        capitalReturnAmount: 0,
        ownerGainAmount: 0,
        sharedProfitAmount: 0,
        totalAmount: 0,
        settlementEntitlementAmount: 0,
        documentsCount: 0,
        phoneLinesCount: 0,
        accessoryLinesCount: 0,
        serviceLinesCount: 0,
        _docKeys: new Set<string>(),
      });
    }
    return summaryMap.get(partnerId);
  };
  for (const row of computed) {
    for (const alloc of row.capitalAllocations) {
      const bucket = ensure(Number(alloc.storePartnerId));
      bucket.capitalReturnAmount += Number(alloc.amount) || 0;
      bucket.settlementEntitlementAmount += Number(alloc.amount) || 0;
      bucket._docKeys.add(`${row.sourceKind}:${row.sourceId}`);
      if (row.itemType === "phone") bucket.phoneLinesCount += 1;
      else if (row.itemType === "inventory") bucket.accessoryLinesCount += 1;
      else bucket.serviceLinesCount += 1;
    }
    for (const alloc of row.ownerAllocations) {
      const bucket = ensure(Number(alloc.storePartnerId));
      bucket.ownerGainAmount += Number(alloc.amount) || 0;
      bucket.totalAmount += Number(alloc.amount) || 0;
      bucket.settlementEntitlementAmount += Number(alloc.amount) || 0;
      bucket._docKeys.add(`${row.sourceKind}:${row.sourceId}`);
    }
    for (const alloc of row.sharedAllocations) {
      const bucket = ensure(Number(alloc.storePartnerId));
      bucket.sharedProfitAmount += Number(alloc.amount) || 0;
      bucket.totalAmount += Number(alloc.amount) || 0;
      bucket.settlementEntitlementAmount += Number(alloc.amount) || 0;
      bucket._docKeys.add(`${row.sourceKind}:${row.sourceId}`);
    }
  }
  const summaries = Array.from(summaryMap.values())
    .map((row: any) => ({ ...row, documentsCount: row._docKeys.size }))
    .map(({ _docKeys, ...rest }) => rest);
  const totals = summaries.reduce(
    (acc: any, row: any) => {
      acc.capitalReturnAmount += Number(row.capitalReturnAmount) || 0;
      acc.ownerGainAmount += Number(row.ownerGainAmount) || 0;
      acc.sharedProfitAmount += Number(row.sharedProfitAmount) || 0;
      acc.totalAmount += Number(row.totalAmount) || 0;
      acc.settlementEntitlementAmount +=
        Number(row.settlementEntitlementAmount) || 0;
      acc.documentsCount += Number(row.documentsCount) || 0;
      acc.phoneLinesCount += Number(row.phoneLinesCount) || 0;
      acc.accessoryLinesCount += Number(row.accessoryLinesCount) || 0;
      acc.serviceLinesCount += Number(row.serviceLinesCount) || 0;
      return acc;
    },
    {
      capitalReturnAmount: 0,
      ownerGainAmount: 0,
      sharedProfitAmount: 0,
      totalAmount: 0,
      settlementEntitlementAmount: 0,
      documentsCount: 0,
      phoneLinesCount: 0,
      accessoryLinesCount: 0,
      serviceLinesCount: 0,
    },
  );
  return { context, computed, summaries, totals };
};

export const getPartnerProfitReportFromDb = async (
  range: PartnerReportRange = {},
): Promise<any> => {
  const hasSnapshots =
    (await tableExists("sale_profit_snapshots")) &&
    (await tableExists("sale_profit_allocations"));
  if (!hasSnapshots) {
    const legacy = await summarizeLegacyProfitRows(range);
    const selectedPartner = range.partnerId
      ? legacy.summaries.find(
          (item: any) =>
            Number(item.storePartnerId) === Number(range.partnerId),
        ) || null
      : null;
    return {
      partners: legacy.context.partners,
      summaries: legacy.summaries,
      totals: legacy.totals,
      selectedPartner,
    };
  }

  const partners = await mapActiveStorePartners();
  const dateFilter = buildDateRangeSql("sps.saleDate", range);
  const rows = await allAsync(
    `SELECT spa.storePartnerId, sp.name as partnerName, sp.colorTag, spa.allocationType, spa.amount,
            sps.sourceKind, sps.sourceId, sps.itemType, sps.saleDate
       FROM sale_profit_allocations spa
       JOIN sale_profit_snapshots sps ON sps.id = spa.snapshotId
       JOIN store_partners sp ON sp.id = spa.storePartnerId
      WHERE spa.sourceStatus = 'active'
        AND sps.sourceStatus = 'active'${dateFilter.sql}
      ORDER BY sps.saleDate DESC, spa.id DESC`,
    dateFilter.params,
  ).catch(() => [] as any[]);

  const capitalRows = await allAsync(
    `SELECT sps.sourceKind, sps.sourceId, sps.itemType, sps.saleDate, sps.initialCostAmount,
            opi.storePartnerId, sp.name as partnerName, sp.colorTag, opi.sharePercent
       FROM sale_profit_snapshots sps
       JOIN ownership_profile_items opi ON opi.ownershipProfileId = sps.ownershipProfileId
       JOIN store_partners sp ON sp.id = opi.storePartnerId
      WHERE sps.sourceStatus = 'active'${dateFilter.sql}
      ORDER BY sps.saleDate DESC, sps.id DESC, opi.id DESC`,
    dateFilter.params,
  ).catch(() => [] as any[]);

  if (!(rows as any[]).length && !(capitalRows as any[]).length) {
    const legacy = await summarizeLegacyProfitRows(range);
    const selectedPartner = range.partnerId
      ? legacy.summaries.find(
          (item: any) =>
            Number(item.storePartnerId) === Number(range.partnerId),
        ) || null
      : null;
    return {
      partners: legacy.context.partners,
      summaries: legacy.summaries,
      totals: legacy.totals,
      selectedPartner,
    };
  }

  const summaryMap = new Map<number, any>();
  for (const partner of partners) {
    summaryMap.set(Number(partner.storePartnerId), {
      storePartnerId: Number(partner.storePartnerId),
      partnerName: partner.partnerName,
      colorTag: partner.colorTag || null,
      capitalReturnAmount: 0,
      ownerGainAmount: 0,
      sharedProfitAmount: 0,
      totalAmount: 0,
      settlementEntitlementAmount: 0,
      documentsCount: 0,
      phoneLinesCount: 0,
      accessoryLinesCount: 0,
      serviceLinesCount: 0,
      _docKeys: new Set<string>(),
    });
  }

  const ensureBucket = (
    partnerId: number,
    partnerName?: string | null,
    colorTag?: string | null,
  ) => {
    if (!summaryMap.has(partnerId)) {
      summaryMap.set(partnerId, {
        storePartnerId: partnerId,
        partnerName: partnerName || `شریک ${partnerId}`,
        colorTag: colorTag || null,
        capitalReturnAmount: 0,
        ownerGainAmount: 0,
        sharedProfitAmount: 0,
        totalAmount: 0,
        settlementEntitlementAmount: 0,
        documentsCount: 0,
        phoneLinesCount: 0,
        accessoryLinesCount: 0,
        serviceLinesCount: 0,
        _docKeys: new Set<string>(),
      });
    }
    return summaryMap.get(partnerId)!;
  };

  for (const row of capitalRows as any[]) {
    const partnerId = Number(row.storePartnerId) || 0;
    const bucket = ensureBucket(partnerId, row.partnerName, row.colorTag);
    const capitalAmount =
      (Number(row.initialCostAmount) || 0) *
      ((Number(row.sharePercent) || 0) / 100);
    bucket.capitalReturnAmount += capitalAmount;
    bucket.settlementEntitlementAmount += capitalAmount;
    bucket._docKeys.add(`${row.sourceKind}:${row.sourceId}`);
    if (row.itemType === "phone") bucket.phoneLinesCount += 1;
    else if (row.itemType === "inventory") bucket.accessoryLinesCount += 1;
    else bucket.serviceLinesCount += 1;
  }

  for (const row of rows as any[]) {
    const partnerId = Number(row.storePartnerId) || 0;
    const bucket = ensureBucket(partnerId, row.partnerName, row.colorTag);
    const amount = Number(row.amount) || 0;
    if (row.allocationType === "owner_gain") bucket.ownerGainAmount += amount;
    if (row.allocationType === "shared_profit")
      bucket.sharedProfitAmount += amount;
    bucket.totalAmount += amount;
    bucket.settlementEntitlementAmount += amount;
    bucket._docKeys.add(`${row.sourceKind}:${row.sourceId}`);
  }

  const summaries = Array.from(summaryMap.values())
    .map((row: any) => ({
      ...row,
      documentsCount: row._docKeys.size,
    }))
    .map(({ _docKeys, ...rest }) => rest)
    .sort(
      (a: any, b: any) =>
        Number(b.settlementEntitlementAmount) -
        Number(a.settlementEntitlementAmount),
    );

  const totals = summaries.reduce(
    (acc: any, row: any) => {
      acc.capitalReturnAmount += Number(row.capitalReturnAmount) || 0;
      acc.ownerGainAmount += Number(row.ownerGainAmount) || 0;
      acc.sharedProfitAmount += Number(row.sharedProfitAmount) || 0;
      acc.totalAmount += Number(row.totalAmount) || 0;
      acc.settlementEntitlementAmount +=
        Number(row.settlementEntitlementAmount) || 0;
      acc.documentsCount += Number(row.documentsCount) || 0;
      acc.phoneLinesCount += Number(row.phoneLinesCount) || 0;
      acc.accessoryLinesCount += Number(row.accessoryLinesCount) || 0;
      acc.serviceLinesCount += Number(row.serviceLinesCount) || 0;
      return acc;
    },
    {
      capitalReturnAmount: 0,
      ownerGainAmount: 0,
      sharedProfitAmount: 0,
      totalAmount: 0,
      settlementEntitlementAmount: 0,
      documentsCount: 0,
      phoneLinesCount: 0,
      accessoryLinesCount: 0,
      serviceLinesCount: 0,
    },
  );

  const selectedPartner = range.partnerId
    ? summaries.find(
        (item: any) => Number(item.storePartnerId) === Number(range.partnerId),
      ) || null
    : null;

  return { partners, summaries, totals, selectedPartner };
};

export const buildLegacyAccessoriesReportFromDb = async (
  range: PartnerReportRange & { partnerId: number },
): Promise<any> => {
  const context = await getLegacyPartnerContextForReports();
  const partner = context.partners.find(
    (item) => Number(item.storePartnerId) === Number(range.partnerId),
  );
  if (!partner) throw new Error("شریک موردنظر پیدا نشد.");
  const computed = await buildLegacyComputedSales(range);
  const sales = computed
    .filter((row) => row.itemType === "inventory")
    .map((row) => {
      const ownershipSharePercent = Number(
        row.capitalAllocations.find(
          (item: any) =>
            Number(item.storePartnerId) === Number(range.partnerId),
        )?.sharePercent || 0,
      );
      const capitalReturnAmount = Number(
        row.capitalAllocations.find(
          (item: any) =>
            Number(item.storePartnerId) === Number(range.partnerId),
        )?.amount || 0,
      );
      const ownerGainAmount = Number(
        row.ownerAllocations.find(
          (item: any) =>
            Number(item.storePartnerId) === Number(range.partnerId),
        )?.amount || 0,
      );
      const sharedProfitAmount = Number(
        row.sharedAllocations.find(
          (item: any) =>
            Number(item.storePartnerId) === Number(range.partnerId),
        )?.amount || 0,
      );
      return {
        snapshotId: null,
        saleDate: row.saleDate,
        sourceKind: row.sourceKind,
        sourceId: row.sourceId,
        sourceItemId: row.sourceItemId,
        itemName: row.itemDescription,
        quantity: row.quantity,
        grossSaleAmount: row.saleAmount,
        initialCostAmount: row.initialCostAmount,
        marketCostAmount: row.marketCostAmount,
        ownershipSharePercent,
        attributedSaleAmount: row.saleAmount * (ownershipSharePercent / 100),
        capitalReturnAmount,
        ownerGainAmount,
        sharedProfitAmount,
        totalProfitAmount: ownerGainAmount + sharedProfitAmount,
        settlementEntitlementAmount:
          capitalReturnAmount + ownerGainAmount + sharedProfitAmount,
        documentKey: row.documentKey,
      };
    })
    .filter(
      (row) =>
        row.ownershipSharePercent > 0 ||
        row.totalProfitAmount !== 0 ||
        row.capitalReturnAmount !== 0,
    );

  const productCols = await getColumnNamesSafe("products");
  const hasOwnershipProfileId = productCols.has("ownershipProfileId");
  const products = await allAsync(
    `SELECT pr.id, pr.name, pr.stock_quantity, pr.purchasePrice, pr.date_added, pr.supplierId${hasOwnershipProfileId ? ", pr.ownershipProfileId" : ", NULL as ownershipProfileId"} FROM products pr ORDER BY pr.id DESC`,
  ).catch(() => [] as any[]);
  const currentInventory: any[] = [];
  for (const row of products as any[]) {
    let sharePercent = 0;
    if (row.ownershipProfileId) {
      const item = await getAsync(
        `SELECT sharePercent FROM ownership_profile_items WHERE ownershipProfileId = ? AND storePartnerId = ?`,
        [Number(row.ownershipProfileId), Number(range.partnerId)],
      ).catch(() => null);
      sharePercent = Number(item?.sharePercent) || 0;
    }
    if (!sharePercent) {
      const ownership = await resolveLegacyOwnershipShares(
        Number(row.supplierId || 0),
        context,
      );
      sharePercent = Number(
        ownership.shares.find(
          (item) => Number(item.storePartnerId) === Number(range.partnerId),
        )?.sharePercent || 0,
      );
    }
    if (!sharePercent) continue;
    const stockQuantity = Number(row.stock_quantity) || 0;
    const purchasePrice = Number(row.purchasePrice) || 0;
    currentInventory.push({
      productId: Number(row.id),
      itemName: row.name,
      stockQuantity,
      purchasePrice,
      sharePercent,
      attributedQuantity: stockQuantity * (sharePercent / 100),
      attributedValue: stockQuantity * purchasePrice * (sharePercent / 100),
      dateAdded: row.date_added,
    });
  }

  const summary = {
    purchasesCount: 0,
    purchasesGrossAmount: 0,
    purchasesAttributedAmount: 0,
    salesCount: sales.length,
    salesGrossAmount: sales.reduce(
      (sum, row) => sum + (Number(row.grossSaleAmount) || 0),
      0,
    ),
    salesAttributedAmount: sales.reduce(
      (sum, row) => sum + (Number(row.attributedSaleAmount) || 0),
      0,
    ),
    capitalReturnAmount: sales.reduce(
      (sum, row) => sum + (Number(row.capitalReturnAmount) || 0),
      0,
    ),
    ownerGainAmount: sales.reduce(
      (sum, row) => sum + (Number(row.ownerGainAmount) || 0),
      0,
    ),
    sharedProfitAmount: sales.reduce(
      (sum, row) => sum + (Number(row.sharedProfitAmount) || 0),
      0,
    ),
    totalProfitAmount: sales.reduce(
      (sum, row) => sum + (Number(row.totalProfitAmount) || 0),
      0,
    ),
    settlementEntitlementAmount: sales.reduce(
      (sum, row) => sum + (Number(row.settlementEntitlementAmount) || 0),
      0,
    ),
    currentInventoryQuantity: currentInventory.reduce(
      (sum, row) => sum + (Number(row.attributedQuantity) || 0),
      0,
    ),
    currentInventoryValue: currentInventory.reduce(
      (sum, row) => sum + (Number(row.attributedValue) || 0),
      0,
    ),
  };

  return { partner, summary, purchases: [], sales, currentInventory };
};

export const buildLegacyPhonesReportFromDb = async (
  range: PartnerReportRange & { partnerId: number },
): Promise<any> => {
  const context = await getLegacyPartnerContextForReports();
  const partner = context.partners.find(
    (item) => Number(item.storePartnerId) === Number(range.partnerId),
  );
  if (!partner) throw new Error("شریک موردنظر پیدا نشد.");
  const phones = await allAsync(
    `SELECT id, model, imei, purchasePrice, purchaseDate, saleDate, status, supplierId FROM phones ORDER BY id DESC`,
  ).catch(() => [] as any[]);
  const purchases = [] as any[];
  const currentInventory = [] as any[];
  for (const row of phones as any[]) {
    const ownership = await resolveLegacyOwnershipShares(
      Number(row.supplierId || 0),
      context,
    );
    const sharePercent = Number(
      ownership.shares.find(
        (item) => Number(item.storePartnerId) === Number(range.partnerId),
      )?.sharePercent || 0,
    );
    if (!sharePercent) continue;
    const purchasePrice = Number(row.purchasePrice) || 0;
    purchases.push({
      phoneId: Number(row.id),
      purchaseDate: row.purchaseDate,
      saleDate: row.saleDate,
      model: row.model,
      imei: row.imei,
      purchasePrice,
      sharePercent,
      attributedPurchaseAmount: purchasePrice * (sharePercent / 100),
      status: row.status,
      documentKey: `PH-${row.id}`,
    });
    if (
      ["in_stock", "pending", "reserved"].includes(String(row.status || ""))
    ) {
      currentInventory.push({
        phoneId: Number(row.id),
        model: row.model,
        imei: row.imei,
        purchasePrice,
        sharePercent,
        attributedValue: purchasePrice * (sharePercent / 100),
        status: row.status,
      });
    }
  }

  const computed = await buildLegacyComputedSales(range);
  const sales = computed
    .filter((row) => row.itemType === "phone")
    .map((row) => {
      const ownershipSharePercent = Number(
        row.capitalAllocations.find(
          (item: any) =>
            Number(item.storePartnerId) === Number(range.partnerId),
        )?.sharePercent || 0,
      );
      const capitalReturnAmount = Number(
        row.capitalAllocations.find(
          (item: any) =>
            Number(item.storePartnerId) === Number(range.partnerId),
        )?.amount || 0,
      );
      const ownerGainAmount = Number(
        row.ownerAllocations.find(
          (item: any) =>
            Number(item.storePartnerId) === Number(range.partnerId),
        )?.amount || 0,
      );
      const sharedProfitAmount = Number(
        row.sharedAllocations.find(
          (item: any) =>
            Number(item.storePartnerId) === Number(range.partnerId),
        )?.amount || 0,
      );
      return {
        snapshotId: null,
        saleDate: row.saleDate,
        sourceKind: row.sourceKind,
        sourceId: row.sourceId,
        sourceItemId: row.sourceItemId,
        phoneId: row.itemId,
        model: row.model || row.itemDescription,
        imei: row.imei || "-",
        grossSaleAmount: row.saleAmount,
        initialCostAmount: row.initialCostAmount,
        marketCostAmount: row.marketCostAmount,
        ownershipSharePercent,
        attributedSaleAmount: row.saleAmount * (ownershipSharePercent / 100),
        capitalReturnAmount,
        ownerGainAmount,
        sharedProfitAmount,
        totalProfitAmount: ownerGainAmount + sharedProfitAmount,
        settlementEntitlementAmount:
          capitalReturnAmount + ownerGainAmount + sharedProfitAmount,
        documentKey: row.documentKey,
      };
    })
    .filter(
      (row) =>
        row.ownershipSharePercent > 0 ||
        row.totalProfitAmount !== 0 ||
        row.capitalReturnAmount !== 0,
    );

  const summary = {
    purchasesCount: purchases.length,
    purchasesGrossAmount: purchases.reduce(
      (sum, row) => sum + (Number(row.purchasePrice) || 0),
      0,
    ),
    purchasesAttributedAmount: purchases.reduce(
      (sum, row) => sum + (Number(row.attributedPurchaseAmount) || 0),
      0,
    ),
    salesCount: sales.length,
    salesGrossAmount: sales.reduce(
      (sum, row) => sum + (Number(row.grossSaleAmount) || 0),
      0,
    ),
    salesAttributedAmount: sales.reduce(
      (sum, row) => sum + (Number(row.attributedSaleAmount) || 0),
      0,
    ),
    capitalReturnAmount: sales.reduce(
      (sum, row) => sum + (Number(row.capitalReturnAmount) || 0),
      0,
    ),
    ownerGainAmount: sales.reduce(
      (sum, row) => sum + (Number(row.ownerGainAmount) || 0),
      0,
    ),
    sharedProfitAmount: sales.reduce(
      (sum, row) => sum + (Number(row.sharedProfitAmount) || 0),
      0,
    ),
    totalProfitAmount: sales.reduce(
      (sum, row) => sum + (Number(row.totalProfitAmount) || 0),
      0,
    ),
    settlementEntitlementAmount: sales.reduce(
      (sum, row) => sum + (Number(row.settlementEntitlementAmount) || 0),
      0,
    ),
    currentInventoryCount: currentInventory.length,
    currentInventoryValue: currentInventory.reduce(
      (sum, row) => sum + (Number(row.attributedValue) || 0),
      0,
    ),
  };

  return { partner, summary, purchases, sales, currentInventory };
};

export const buildLegacySettlementReportFromDb = async (
  range: PartnerReportRange = {},
): Promise<any> => {
  const profit = await getPartnerProfitReportFromDb(range);
  const partners = profit.partners || [];
  const settlements = [] as any[];
  for (const partner of partners) {
    const [phoneReport, accessoryReport] = await Promise.all([
      buildLegacyPhonesReportFromDb({
        ...range,
        partnerId: Number(partner.storePartnerId),
      }),
      buildLegacyAccessoriesReportFromDb({
        ...range,
        partnerId: Number(partner.storePartnerId),
      }),
    ]);
    const summary =
      (profit.summaries || []).find(
        (item: any) =>
          Number(item.storePartnerId) === Number(partner.storePartnerId),
      ) || {};
    settlements.push({
      storePartnerId: Number(partner.storePartnerId),
      partnerName: partner.partnerName,
      colorTag: partner.colorTag || null,
      capitalReturnAmount: Number(summary.capitalReturnAmount) || 0,
      ownerGainAmount: Number(summary.ownerGainAmount) || 0,
      sharedProfitAmount: Number(summary.sharedProfitAmount) || 0,
      recognizedProfit: Number(summary.totalAmount) || 0,
      settlementEntitlement: Number(summary.settlementEntitlementAmount) || 0,
      phoneInventoryValue:
        Number(phoneReport.summary.currentInventoryValue) || 0,
      accessoryInventoryValue:
        Number(accessoryReport.summary.currentInventoryValue) || 0,
      inventoryValue:
        (Number(phoneReport.summary.currentInventoryValue) || 0) +
        (Number(accessoryReport.summary.currentInventoryValue) || 0),
      settlementBalance: Number(summary.settlementEntitlementAmount) || 0,
      settlementStatus:
        (Number(summary.settlementEntitlementAmount) || 0) > 0.5
          ? "creditor"
          : (Number(summary.settlementEntitlementAmount) || 0) < -0.5
            ? "debtor"
            : "settled",
      paidSettlementAmount: 0,
      receivedSettlementAmount: 0,
      netSettledAmount: 0,
      remainingSettlementBalance:
        Number(summary.settlementEntitlementAmount) || 0,
      remainingSettlementStatus:
        (Number(summary.settlementEntitlementAmount) || 0) > 0.5
          ? "creditor"
          : (Number(summary.settlementEntitlementAmount) || 0) < -0.5
            ? "debtor"
            : "settled",
    });
  }
  try {
    if (await tableExists("partner_ledger")) {
      const ledgerDateFilter = buildDateRangeSql("pl.transactionDate", range);
      const phoneLedgerRows = await allAsync(
        `SELECT pl.partnerId as storePartnerId,
                SUM(COALESCE(pl.debit, 0)) as receivedAmount,
                COUNT(*) as settlementCount
           FROM partner_ledger pl
          WHERE pl.referenceType IN ${PHONE_SETTLEMENT_LEDGER_TYPES_SQL}
            AND COALESCE(pl.debit, 0) > 0${ledgerDateFilter.sql}
          GROUP BY pl.partnerId`,
        ledgerDateFilter.params,
      );
      const phoneLedgerMap = new Map(
        (phoneLedgerRows as any[]).map((row) => [
          Number(row.storePartnerId),
          row,
        ]),
      );
      for (const row of settlements) {
        const ledger = phoneLedgerMap.get(Number(row.storePartnerId)) as any;
        const receivedAmount = Number(ledger?.receivedAmount) || 0;
        const settlementCount = Number(ledger?.settlementCount) || 0;
        row.receivedSettlementAmount = receivedAmount;
        row.phoneSpecificSettlementAmount = receivedAmount;
        row.phoneSpecificSettlementCount = settlementCount;
        row.netSettledAmount =
          receivedAmount - (Number(row.paidSettlementAmount) || 0);
        row.remainingSettlementBalance =
          (Number(row.settlementEntitlement) || 0) - receivedAmount;
        row.remainingSettlementStatus =
          row.remainingSettlementBalance > 0.5
            ? "creditor"
            : row.remainingSettlementBalance < -0.5
              ? "debtor"
              : "settled";
      }
    }
  } catch (error) {
    console.warn(
      "Legacy phone-specific partner settlement reconciliation skipped:",
      (error as any)?.message || error,
    );
  }

  const totals = {
    totalSettlementEntitlement: settlements.reduce(
      (sum, row) => sum + (Number(row.settlementEntitlement) || 0),
      0,
    ),
    totalCapitalReturnAmount: settlements.reduce(
      (sum, row) => sum + (Number(row.capitalReturnAmount) || 0),
      0,
    ),
    totalOwnerGainAmount: settlements.reduce(
      (sum, row) => sum + (Number(row.ownerGainAmount) || 0),
      0,
    ),
    totalSharedProfitAmount: settlements.reduce(
      (sum, row) => sum + (Number(row.sharedProfitAmount) || 0),
      0,
    ),
    totalRecognizedProfit: settlements.reduce(
      (sum, row) => sum + (Number(row.recognizedProfit) || 0),
      0,
    ),
    totalInventoryValue: settlements.reduce(
      (sum, row) => sum + (Number(row.inventoryValue) || 0),
      0,
    ),
    totalPhoneInventoryValue: settlements.reduce(
      (sum, row) => sum + (Number(row.phoneInventoryValue) || 0),
      0,
    ),
    totalAccessoryInventoryValue: settlements.reduce(
      (sum, row) => sum + (Number(row.accessoryInventoryValue) || 0),
      0,
    ),
    totalPaidSettlements: settlements.reduce(
      (sum, row) => sum + (Number(row.paidSettlementAmount) || 0),
      0,
    ),
    totalReceivedSettlements: settlements.reduce(
      (sum, row) => sum + (Number(row.receivedSettlementAmount) || 0),
      0,
    ),
    totalPhoneSpecificSettlements: settlements.reduce(
      (sum, row) => sum + (Number(row.phoneSpecificSettlementAmount) || 0),
      0,
    ),
  };
  return {
    profile: { id: null, title: "تقسیم پیش‌فرض سود فروشگاه" },
    partners,
    settlements,
    transactions: [],
    totals,
  };
};


// Phase 1C: `getPartnerAccessoriesReportFromDb` moved to server/db/domains.


// Phase 1F: partner settlement transaction wrappers moved to server/db/domains/partners.db.ts.

// Phase 1C: `getPartnerSettlementReportFromDb` moved to server/db/domains.



// Phase 1C: `getPartnerPhonesReportFromDb` moved to server/db/domains.

