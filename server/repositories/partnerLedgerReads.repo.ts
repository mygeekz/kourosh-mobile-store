import { getDbInstance } from "../database";
import { allAsync, getAsync } from "../db/query";

const formatFaSourceNumber = (value: number) =>
  Number(value || 0).toLocaleString("fa-IR");

export type PartnerLedgerSourceInfo = {
  sourceKind: "phone" | "product" | "partner_ledger" | "manual" | null;
  sourceId: number | null;
  sourceLabel: string | null;
  sourceUrl: string | null;
  sourceIcon: string | null;
  sourceResolved: boolean;
};

export const resolvePartnerLedgerSourceInfo = async (
  row: any,
  partnerId: number,
): Promise<PartnerLedgerSourceInfo> => {
  const fallback: PartnerLedgerSourceInfo = {
    sourceKind: null,
    sourceId: null,
    sourceLabel: null,
    sourceUrl: null,
    sourceIcon: null,
    sourceResolved: false,
  };

  const referenceType = String(row?.referenceType || "")
    .trim()
    .toLowerCase();
  const referenceId = Number(row?.referenceId || 0);
  const raw = String(row?.description || "").trim();

  if (referenceId > 0 && referenceType.includes("phone")) {
    const phone = await getAsync(
      `SELECT id, model, imei
         FROM phones
        WHERE id = ? AND (partnerId = ? OR partnerId IS NULL OR ? IS NULL)
        LIMIT 1`,
      [referenceId, partnerId, partnerId],
    ).catch(() => null as any);

    if (phone?.id) {
      const model = String(phone.model || "گوشی").trim();
      const imei = String(phone.imei || "").trim();
      return {
        sourceKind: "phone",
        sourceId: Number(phone.id),
        sourceLabel: `${model}${imei ? ` • IMEI: ${imei}` : ""}`,
        sourceUrl: `/mobile-phones?phoneId=${Number(phone.id)}`,
        sourceIcon: "fa-solid fa-mobile-screen-button",
        sourceResolved: true,
      };
    }

    return {
      sourceKind: "phone",
      sourceId: referenceId,
      sourceLabel: `گوشی #${formatFaSourceNumber(referenceId)} یافت نشد`,
      sourceUrl: null,
      sourceIcon: "fa-solid fa-mobile-screen-button",
      sourceResolved: false,
    };
  }

  if (referenceId > 0 && referenceType.includes("product")) {
    const product = await getAsync(
      `SELECT id, name
         FROM products
        WHERE id = ?
        LIMIT 1`,
      [referenceId],
    ).catch(() => null as any);

    return {
      sourceKind: "product",
      sourceId: referenceId,
      sourceLabel: product?.id
        ? `کالا: ${String(product.name || `#${referenceId}`).trim()}`
        : `کالا #${formatFaSourceNumber(referenceId)} یافت نشد`,
      sourceUrl: product?.id ? `/products?productId=${referenceId}` : null,
      sourceIcon: "fa-solid fa-box",
      sourceResolved: Boolean(product?.id),
    };
  }

  const phoneIdFromText = Number(
    raw.match(/(?:شناسه\s*گوشی|phone\s*id|ph)[:：#\s-]*(\d+)/i)?.[1] || 0,
  );
  if (phoneIdFromText > 0) {
    return resolvePartnerLedgerSourceInfo(
      { ...row, referenceType: "phone_purchase", referenceId: phoneIdFromText },
      partnerId,
    );
  }

  return fallback;
};

export const getLatestPartnerLedgerSourceForReport = async (
  partnerId: number,
): Promise<PartnerLedgerSourceInfo> => {
  const fallback: PartnerLedgerSourceInfo = {
    sourceKind: null,
    sourceId: null,
    sourceLabel: null,
    sourceUrl: null,
    sourceIcon: null,
    sourceResolved: false,
  };

  const rows = await allAsync(
    `SELECT *
       FROM partner_ledger
      WHERE partnerId = ?
      ORDER BY
        CASE WHEN referenceType IS NOT NULL AND TRIM(referenceType) <> '' THEN 0 ELSE 1 END,
        CASE WHEN COALESCE(credit, 0) > 0 THEN 0 ELSE 1 END,
        datetime(COALESCE(updatedAt, createdAt, transactionDate)) DESC,
        id DESC
      LIMIT 12`,
    [partnerId],
  ).catch(() => [] as any[]);

  let firstCandidate: PartnerLedgerSourceInfo | null = null;
  for (const row of rows || []) {
    const source = await resolvePartnerLedgerSourceInfo(row, partnerId);
    if (
      !firstCandidate &&
      (source.sourceLabel || source.sourceKind || source.sourceId)
    )
      firstCandidate = source;
    if (source.sourceResolved && source.sourceUrl) return source;
  }
  return firstCandidate || fallback;
};


const SOLD_PHONE_DAILY_BUY_PRICE_SQL = `COALESCE(
  NULLIF((
    SELECT soi.buyPrice
    FROM sales_order_items soi
    JOIN sales_orders so ON so.id = soi.orderId
    WHERE soi.itemType = 'phone'
      AND soi.itemId = ph.id
      AND (so.status IS NULL OR so.status = 'active')
    ORDER BY datetime(COALESCE(so.transactionDate, '1970-01-01')) DESC, soi.id DESC
    LIMIT 1
  ), 0),
  NULLIF((
    SELECT st.buyPrice
    FROM sales_transactions st
    WHERE st.itemType = 'phone'
      AND st.itemId = ph.id
    ORDER BY datetime(COALESCE(st.transactionDate, '1970-01-01')) DESC, st.id DESC
    LIMIT 1
  ), 0),
  NULLIF((
    SELECT isi.buyPrice
    FROM installment_sale_items isi
    JOIN installment_sales isale ON isale.id = isi.saleId
    WHERE isi.itemType = 'phone'
      AND isi.itemId = ph.id
      AND COALESCE(isale.status,'active') = 'active'
    ORDER BY datetime(COALESCE(isale.saleDateISO, isale.dateCreated, '1970-01-01')) DESC, isi.id DESC
    LIMIT 1
  ), 0),
  NULLIF(ph.currentPurchasePrice, 0),
  ph.purchasePrice,
  0
)`;

const LATEST_PHONE_INSTALLMENT_SALE_ID_SQL = `(
  SELECT latestSale.id
  FROM installment_sale_items latestItem
  JOIN installment_sales latestSale ON latestSale.id = latestItem.saleId
  WHERE latestItem.itemType = 'phone' AND latestItem.itemId = ph.id
    AND COALESCE(latestSale.status,'active') = 'active'
  ORDER BY datetime(COALESCE(latestSale.saleDateISO, latestSale.dateCreated, '1970-01-01')) DESC, latestItem.id DESC
  LIMIT 1
)`;

const PHONE_SETTLEMENT_LEDGER_TYPES_SQL = `('phone_settlement_payment','phone_payment','product_settlement_phone','partner_settlement_atomic_submit')`;
// Manual/product-specific settlements previously entered from the partner panel.
// Kept for legacy compatibility, but the UI now treats phone settlement as read-only
// and derives cash/installment progress from the actual sale/payment source.
const PHONE_SETTLEMENT_MANUAL_PAID_SQL = `COALESCE((
  SELECT SUM(COALESCE(l.debit, 0))
  FROM partner_ledger l
  WHERE l.partnerId = ph.supplierId
    AND l.referenceId = ph.id
    AND l.referenceType IN ${PHONE_SETTLEMENT_LEDGER_TYPES_SQL}
), 0)`;
const PHONE_SETTLEMENT_PAID_SQL = PHONE_SETTLEMENT_MANUAL_PAID_SQL;

const PHONE_PURCHASE_LEDGER_DISPLAY_TYPES = new Set<string>([
  "phone_purchase",
  "phone_purchase_edit",
  "phone_purchase_reversal_on_edit",
]);

const collapseDuplicatePhonePurchaseLedgerRows = (rows: any[]): any[] => {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  const latestByPhoneReference = new Map<number, any>();
  const keptRows: any[] = [];

  for (const row of rows) {
    const referenceType = String(row?.referenceType || "").trim();
    const referenceId = Number(row?.referenceId || 0);
    if (
      referenceId > 0 &&
      PHONE_PURCHASE_LEDGER_DISPLAY_TYPES.has(referenceType)
    ) {
      if (!latestByPhoneReference.has(referenceId)) {
        latestByPhoneReference.set(referenceId, row);
      }
      continue;
    }
    keptRows.push(row);
  }

  return [...keptRows, ...latestByPhoneReference.values()].sort(
    (a, b) =>
      String(
        b.updatedAt || b.createdAt || b.transactionDate || "",
      ).localeCompare(
        String(a.updatedAt || a.createdAt || a.transactionDate || ""),
      ) || Number(b.id || 0) - Number(a.id || 0),
  );
};

export const getLedgerForPartnerFromDb = async (
  partnerId: number,
): Promise<any[]> => {
  await getDbInstance();
  const rows = await allAsync(
    `SELECT * FROM partner_ledger WHERE partnerId = ? ORDER BY datetime(COALESCE(updatedAt, createdAt, transactionDate)) DESC, id DESC`,
    [partnerId],
  );
  return collapseDuplicatePhonePurchaseLedgerRows(rows);
};

export type PartnerLedgerDirectoryQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  direction?: "all" | "debit" | "credit" | "recent";
  range?: "all" | "today" | "week" | "month";
  systemId?: string;
  settlementBatchId?: string;
  includeMeta?: boolean;
  includeRelated?: boolean;
};

const PARTNER_PHONE_LEDGER_DISPLAY_TYPES_SQL = `('phone_purchase','phone_purchase_edit','phone_purchase_reversal_on_edit')`;
const PARTNER_PHONE_LEDGER_SYSTEM_TYPES_SQL = `('phone_purchase','phone_purchase_edit','phone_purchase_reversal_on_edit','phone_settlement_payment','phone_payment','product_settlement_phone','partner_settlement_atomic_submit')`;
const PARTNER_PRODUCT_LEDGER_SYSTEM_TYPES_SQL = `('product_purchase','product_purchase_edit')`;

const normalizePartnerLedgerDirectoryQuery = (query: PartnerLedgerDirectoryQuery = {}) => ({
  page: Math.max(1, Math.floor(Number(query.page || 1))),
  pageSize: Math.min(100, Math.max(10, Math.floor(Number(query.pageSize || 25)))),
  search: String(query.search || "").trim(),
  direction: (["all", "debit", "credit", "recent"].includes(String(query.direction || "all")) ? String(query.direction || "all") : "all") as "all" | "debit" | "credit" | "recent",
  range: (["all", "today", "week", "month"].includes(String(query.range || "all")) ? String(query.range || "all") : "all") as "all" | "today" | "week" | "month",
  systemId: String(query.systemId || "all").trim() || "all",
  settlementBatchId: String(query.settlementBatchId || "").trim(),
  includeMeta: query.includeMeta !== false,
  includeRelated: query.includeRelated !== false,
});

const buildPartnerLedgerDirectoryWhere = (partnerId: number, query: ReturnType<typeof normalizePartnerLedgerDirectoryQuery>) => {
  const clauses = ["partnerId = ?"];
  const params: any[] = [partnerId];

  if (query.direction === "debit") clauses.push("COALESCE(debit, 0) > 0");
  else if (query.direction === "credit") clauses.push("COALESCE(credit, 0) > 0");
  else if (query.direction === "recent") clauses.push("datetime(COALESCE(transactionDate, createdAt, updatedAt)) >= datetime('now', '-31 days')");

  if (query.range === "today") clauses.push("date(COALESCE(transactionDate, createdAt, updatedAt), 'localtime') = date('now', 'localtime')");
  else if (query.range === "week") clauses.push("datetime(COALESCE(transactionDate, createdAt, updatedAt)) >= datetime('now', '-7 days')");
  else if (query.range === "month") clauses.push("datetime(COALESCE(transactionDate, createdAt, updatedAt)) >= datetime('now', '-31 days')");

  if (query.settlementBatchId) {
    clauses.push("COALESCE(settlementBatchId, '') = ?");
    params.push(query.settlementBatchId);
  }

  if (query.systemId !== "all") {
    const phoneMatch = query.systemId.match(/^ph(\d+)$/i);
    const productMatch = query.systemId.match(/^p(\d+)$/i);
    const typedMatch = query.systemId.match(/^([^#]+)#(\d+)$/);
    const ledgerMatch = query.systemId.match(/^ledger#(\d+)$/i);
    if (phoneMatch) {
      clauses.push(`referenceId = ? AND referenceType IN ${PARTNER_PHONE_LEDGER_SYSTEM_TYPES_SQL}`);
      params.push(Number(phoneMatch[1]));
    } else if (productMatch) {
      clauses.push(`referenceId = ? AND referenceType IN ${PARTNER_PRODUCT_LEDGER_SYSTEM_TYPES_SQL}`);
      params.push(Number(productMatch[1]));
    } else if (typedMatch) {
      clauses.push("referenceType = ? AND referenceId = ?");
      params.push(typedMatch[1], Number(typedMatch[2]));
    } else if (ledgerMatch) {
      clauses.push("id = ?");
      params.push(Number(ledgerMatch[1]));
    }
  }

  if (query.search) {
    const like = `%${query.search}%`;
    clauses.push(`(
      COALESCE(description, '') LIKE ?
      OR CAST(COALESCE(debit, 0) AS TEXT) LIKE ?
      OR CAST(COALESCE(credit, 0) AS TEXT) LIKE ?
      OR CAST(COALESCE(balance, 0) AS TEXT) LIKE ?
      OR COALESCE(transactionDate, '') LIKE ?
      OR COALESCE(createdAt, '') LIKE ?
      OR COALESCE(referenceType, '') LIKE ?
      OR CAST(COALESCE(referenceId, 0) AS TEXT) LIKE ?
      OR COALESCE(settlementBatchId, '') LIKE ?
    )`);
    params.push(like, like, like, like, like, like, like, like, like);
  }

  return { sql: clauses.join(" AND "), params };
};

const buildPartnerLedgerDedupedCte = (partnerId: number) => {
  const safePartnerId = Math.max(0, Math.floor(Number(partnerId) || 0));
  return `WITH ranked_partner_ledger AS (
  SELECT l.*,
         ROW_NUMBER() OVER (
           PARTITION BY CASE
             WHEN COALESCE(l.referenceId, 0) > 0 AND l.referenceType IN ${PARTNER_PHONE_LEDGER_DISPLAY_TYPES_SQL}
             THEN 'phone_purchase:' || l.referenceId
             ELSE 'ledger:' || l.id
           END
           ORDER BY datetime(COALESCE(l.updatedAt, l.createdAt, l.transactionDate)) DESC, l.id DESC
         ) AS display_rank
    FROM partner_ledger l
   WHERE l.partnerId = ${safePartnerId}
), display_partner_ledger AS (
  SELECT * FROM ranked_partner_ledger WHERE display_rank = 1
)`;
};

export const getPartnerLedgerProfileSnapshotFromDb = async (
  partnerId: number,
  previewSize = 10,
) => {
  await getDbInstance();
  const ledgerCte = buildPartnerLedgerDedupedCte(partnerId);
  const safePreviewSize = Math.min(20, Math.max(1, Math.floor(Number(previewSize || 10))));
  const [items, summary] = await Promise.all([
    allAsync(
      `${ledgerCte}
       SELECT id, partnerId, transactionDate, createdAt, updatedAt, description, debit, credit, balance,
              referenceType, referenceId, settlementBatchId, changeHistoryJson
         FROM display_partner_ledger
        ORDER BY datetime(COALESCE(updatedAt, createdAt, transactionDate)) DESC, id DESC
        LIMIT ?`,
      [safePreviewSize],
    ),
    getAsync(
      `${ledgerCte}
       SELECT COUNT(*) AS total,
              COALESCE(SUM(COALESCE(debit, 0)), 0) AS totalDebit,
              COALESCE(SUM(COALESCE(credit, 0)), 0) AS totalCredit,
              COALESCE((SELECT balance FROM display_partner_ledger ORDER BY datetime(COALESCE(updatedAt, createdAt, transactionDate)) DESC, id DESC LIMIT 1), 0) AS latestBalance
         FROM display_partner_ledger`,
    ),
  ]);
  return {
    items: items || [],
    summary: {
      total: Number(summary?.total || 0),
      totalDebit: Number(summary?.totalDebit || 0),
      totalCredit: Number(summary?.totalCredit || 0),
      latestBalance: Number(summary?.latestBalance || 0),
    },
  };
};

export const listPartnerLedgerDirectoryFromDb = async (
  partnerId: number,
  rawQuery: PartnerLedgerDirectoryQuery = {},
) => {
  await getDbInstance();
  const query = normalizePartnerLedgerDirectoryQuery(rawQuery);
  const where = buildPartnerLedgerDirectoryWhere(partnerId, query);
  const ledgerCte = buildPartnerLedgerDedupedCte(partnerId);
  const offset = (query.page - 1) * query.pageSize;

  const [rows, countRow, overallSummary, filteredSummary, systemRows, batchRows] = await Promise.all([
    allAsync(
      `${ledgerCte}
       SELECT id, partnerId, transactionDate, createdAt, updatedAt, description, debit, credit, balance,
              referenceType, referenceId, settlementBatchId, changeHistoryJson
         FROM display_partner_ledger
        WHERE ${where.sql}
        ORDER BY datetime(COALESCE(updatedAt, createdAt, transactionDate)) DESC, id DESC
        LIMIT ? OFFSET ?`,
      [...where.params, query.pageSize, offset],
    ),
    getAsync(
      `${ledgerCte}
       SELECT COUNT(*) AS total FROM display_partner_ledger WHERE ${where.sql}`,
      where.params,
    ),
    query.includeMeta ? getAsync(
      `${ledgerCte}
       SELECT COUNT(*) AS total,
              COALESCE(SUM(COALESCE(debit, 0)), 0) AS totalDebit,
              COALESCE(SUM(COALESCE(credit, 0)), 0) AS totalCredit,
              COALESCE((SELECT balance FROM display_partner_ledger d2 WHERE d2.partnerId = ? ORDER BY datetime(COALESCE(d2.updatedAt, d2.createdAt, d2.transactionDate)) DESC, d2.id DESC LIMIT 1), 0) AS latestBalance
         FROM display_partner_ledger
        WHERE partnerId = ?`,
      [partnerId, partnerId],
    ) : Promise.resolve(null),
    query.includeMeta ? getAsync(
      `${ledgerCte}
       SELECT COALESCE(SUM(COALESCE(debit, 0)), 0) AS totalDebit,
              COALESCE(SUM(COALESCE(credit, 0)), 0) AS totalCredit,
              COALESCE((SELECT balance FROM display_partner_ledger d2 WHERE ${where.sql} ORDER BY datetime(COALESCE(d2.updatedAt, d2.createdAt, d2.transactionDate)) DESC, d2.id DESC LIMIT 1), 0) AS latestBalance
         FROM display_partner_ledger
        WHERE ${where.sql}`,
      [...where.params, ...where.params],
    ) : Promise.resolve(null),
    query.includeMeta ? allAsync(
      `${ledgerCte}
       SELECT referenceType, referenceId, COUNT(*) AS count
         FROM display_partner_ledger
        WHERE partnerId = ?
        GROUP BY referenceType, referenceId
        ORDER BY COUNT(*) DESC, referenceType ASC, referenceId DESC`,
      [partnerId],
    ) : Promise.resolve([]),
    query.includeMeta ? allAsync(
      `${ledgerCte}
       SELECT settlementBatchId AS id,
              COUNT(*) AS count,
              COALESCE(SUM(CASE WHEN COALESCE(debit, 0) >= COALESCE(credit, 0) THEN COALESCE(debit, 0) ELSE COALESCE(credit, 0) END), 0) AS amount,
              MAX(COALESCE(transactionDate, createdAt, updatedAt, '')) AS latest
         FROM display_partner_ledger
        WHERE partnerId = ? AND COALESCE(settlementBatchId, '') <> ''
        GROUP BY settlementBatchId
        ORDER BY datetime(MAX(COALESCE(transactionDate, createdAt, updatedAt, '1970-01-01'))) DESC`,
      [partnerId],
    ) : Promise.resolve([]),
  ]);

  const systemOptionMap = new Map<string, { id: string; label: string; count: number }>();
  for (const row of systemRows || []) {
    const refType = String(row.referenceType || '').trim();
    const refId = Number(row.referenceId || 0);
    let id = refId > 0 ? `${refType || 'ref'}#${refId}` : `ledger#0`;
    let kind = 'رکورد';
    if (refId > 0 && ['phone_purchase','phone_purchase_edit','phone_purchase_reversal_on_edit','phone_settlement_payment','phone_payment','product_settlement_phone','partner_settlement_atomic_submit'].includes(refType)) {
      id = `ph${refId}`;
      kind = 'گوشی';
    } else if (refId > 0 && ['product_purchase','product_purchase_edit'].includes(refType)) {
      id = `p${refId}`;
      kind = 'محصول';
    } else if (refType.includes('payment') || refType.includes('settlement')) {
      kind = 'حسابداری';
    }
    const existing = systemOptionMap.get(id);
    if (existing) existing.count += Number(row.count || 0);
    else systemOptionMap.set(id, { id, label: `${id} · ${kind}`, count: Number(row.count || 0) });
  }
  const systemOptions = Array.from(systemOptionMap.values()).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'fa'));

  const total = Number(countRow?.total || 0);
  return {
    items: rows || [],
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    metaIncluded: query.includeMeta,
    ...(query.includeMeta ? {
      summary: {
        total: Number(overallSummary?.total || 0),
        totalDebit: Number(overallSummary?.totalDebit || 0),
        totalCredit: Number(overallSummary?.totalCredit || 0),
        latestBalance: Number(overallSummary?.latestBalance || 0),
      },
      filteredSummary: {
        totalDebit: Number(filteredSummary?.totalDebit || 0),
        totalCredit: Number(filteredSummary?.totalCredit || 0),
        latestBalance: Number(filteredSummary?.latestBalance || 0),
      },
      systemOptions,
      settlementBatchOptions: (batchRows || []).map((row: any) => ({
        id: String(row.id || ''),
        count: Number(row.count || 0),
        amount: Number(row.amount || 0),
        latest: String(row.latest || ''),
      })),
    } : {}),
  };
};

export type PartnerPurchasedItemsScope = {
  productIds?: number[];
  phoneIds?: number[];
  includeProducts?: boolean;
  includePhones?: boolean;
  soldPhonesOnly?: boolean;
};

export const getPurchasedItemsFromPartnerDb = async (
  partnerId: number,
  scope: PartnerPurchasedItemsScope = {},
): Promise<any[]> => {
  await getDbInstance();
  const productIds = Array.from(new Set((scope.productIds || []).map(Number).filter((id) => Number.isInteger(id) && id > 0)));
  const phoneIds = Array.from(new Set((scope.phoneIds || []).map(Number).filter((id) => Number.isInteger(id) && id > 0)));
  const includeProducts = scope.includeProducts !== false;
  const includePhones = scope.includePhones !== false;
  const productScopeSql = productIds.length ? ` AND pr.id IN (${productIds.map(() => "?").join(",")})` : "";
  const phoneScopeSql = phoneIds.length ? ` AND ph.id IN (${phoneIds.map(() => "?").join(",")})` : "";
  const soldPhoneScopeSql = scope.soldPhonesOnly ? ` AND ph.status IN ('فروخته شده', 'فروخته شده (قسطی)')` : "";
  const products = includeProducts ? await allAsync(
    `SELECT
        pr.id,
        pr.name,
        COALESCE(SUM(pi.quantity), 0) as quantityPurchased,
        COALESCE(SUM(pi.quantity), 0) as quantity,
        COALESCE((
          SELECT pi2.unitCost
            FROM purchase_items pi2
            JOIN purchases p2 ON p2.id = pi2.purchaseId
           WHERE pi2.productId = pr.id
             AND p2.supplierId = ?
           ORDER BY datetime(COALESCE(p2.purchaseDate, '1970-01-01')) DESC, pi2.id DESC
           LIMIT 1
        ), pr.purchasePrice, 0) as unitPrice,
        COALESCE(NULLIF(pr.unit, ''), 'عدد') as unit,
        COALESCE(SUM(pi.lineTotal), 0) as totalPrice,
        MAX(p.purchaseDate) as purchaseDate,
        'product' as type,
        NULL as status,
        NULL as soldAt,
        COALESCE((
          SELECT pi2.unitCost
            FROM purchase_items pi2
            JOIN purchases p2 ON p2.id = pi2.purchaseId
           WHERE pi2.productId = pr.id
             AND p2.supplierId = ?
           ORDER BY datetime(COALESCE(p2.purchaseDate, '1970-01-01')) DESC, pi2.id DESC
           LIMIT 1
        ), pr.purchasePrice, 0) as purchasePrice,
        pr.sellingPrice,
        pr.sku,
        pr.barcode
     FROM products pr
     JOIN purchase_items pi ON pi.productId = pr.id
     JOIN purchases p ON p.id = pi.purchaseId
     WHERE p.supplierId = ?${productScopeSql}
     GROUP BY pr.id, pr.name, pr.unit, pr.purchasePrice, pr.sellingPrice, pr.sku, pr.barcode
     ORDER BY datetime(MAX(p.purchaseDate)) DESC, pr.id DESC`,
    [partnerId, partnerId, partnerId, ...productIds],
  ) : [];
  const phones = includePhones ? await allAsync(
    `SELECT ph.id, ph.model as name, ph.imei as identifier,
            ${SOLD_PHONE_DAILY_BUY_PRICE_SQL} as purchasePrice,
            COALESCE(ph.purchasePrice, 0) as initialPurchasePrice,
            ph.currentPurchasePrice,
            ph.currentPurchasePriceUpdatedAt,
            ${SOLD_PHONE_DAILY_BUY_PRICE_SQL} as soldDailyPurchasePrice,
            ${SOLD_PHONE_DAILY_BUY_PRICE_SQL} as settlementPurchasePrice,
            ${PHONE_SETTLEMENT_PAID_SQL} as phoneSettlementPaidAmount,
            (${SOLD_PHONE_DAILY_BUY_PRICE_SQL} - ${PHONE_SETTLEMENT_PAID_SQL}) as phoneSettlementBalance,
            COALESCE((
              SELECT COUNT(1)
              FROM partner_ledger l
              WHERE l.partnerId = ph.supplierId
                AND l.referenceId = ph.id
                AND l.referenceType IN ${PHONE_SETTLEMENT_LEDGER_TYPES_SQL}
                AND COALESCE(l.debit, 0) > 0
            ), 0) as phoneSettlementPaymentCount,
            (
              SELECT MAX(l.transactionDate)
              FROM partner_ledger l
              WHERE l.partnerId = ph.supplierId
                AND l.referenceId = ph.id
                AND l.referenceType IN ${PHONE_SETTLEMENT_LEDGER_TYPES_SQL}
                AND COALESCE(l.debit, 0) > 0
            ) as phoneSettlementLastPaymentDate,
            CASE
              WHEN EXISTS (
                SELECT 1 FROM sales_order_items soi
                JOIN sales_orders so ON so.id = soi.orderId
                WHERE soi.itemType = 'phone' AND soi.itemId = ph.id
                  AND COALESCE(NULLIF(soi.buyPrice, 0), 0) > 0
                  AND (so.status IS NULL OR so.status = 'active')
              ) THEN 'sales_order'
              WHEN EXISTS (
                SELECT 1 FROM sales_transactions st
                WHERE st.itemType = 'phone' AND st.itemId = ph.id
                  AND COALESCE(NULLIF(st.buyPrice, 0), 0) > 0
              ) THEN 'legacy_sale'
              WHEN EXISTS (
                SELECT 1 FROM installment_sale_items isi
                JOIN installment_sales isale ON isale.id = isi.saleId
                WHERE isi.itemType = 'phone' AND isi.itemId = ph.id
                  AND COALESCE(NULLIF(isi.buyPrice, 0), 0) > 0
              ) THEN 'installment_sale'
              WHEN COALESCE(NULLIF(ph.currentPurchasePrice, 0), 0) > 0 THEN 'phone_current'
              ELSE 'initial_purchase'
            END as settlementPriceSource,
            CASE
              WHEN EXISTS (SELECT 1 FROM sales_order_items soi JOIN sales_orders so ON so.id = soi.orderId WHERE soi.itemType = 'phone' AND soi.itemId = ph.id AND COALESCE(NULLIF(soi.buyPrice, 0), 0) > 0 AND (so.status IS NULL OR so.status = 'active')) THEN 'فاکتور فروش'
              WHEN EXISTS (SELECT 1 FROM sales_transactions st WHERE st.itemType = 'phone' AND st.itemId = ph.id AND COALESCE(NULLIF(st.buyPrice, 0), 0) > 0) THEN 'فروش نقدی قدیمی'
              WHEN EXISTS (SELECT 1 FROM installment_sale_items isi JOIN installment_sales isale ON isale.id = isi.saleId WHERE isi.itemType = 'phone' AND isi.itemId = ph.id AND COALESCE(NULLIF(isi.buyPrice, 0), 0) > 0) THEN 'فروش اقساطی'
              WHEN COALESCE(NULLIF(ph.currentPurchasePrice, 0), 0) > 0 THEN 'قیمت خرید روز گوشی'
              ELSE 'قیمت خرید اولیه'
            END as settlementPriceSourceLabel,
            COALESCE(
              (SELECT 'sales_order' FROM sales_order_items soi JOIN sales_orders so ON so.id = soi.orderId WHERE soi.itemType = 'phone' AND soi.itemId = ph.id AND (so.status IS NULL OR so.status = 'active') ORDER BY datetime(COALESCE(so.transactionDate, '1970-01-01')) DESC, soi.id DESC LIMIT 1),
              (SELECT 'legacy_sale' FROM sales_transactions st WHERE st.itemType = 'phone' AND st.itemId = ph.id ORDER BY datetime(COALESCE(st.transactionDate, '1970-01-01')) DESC, st.id DESC LIMIT 1),
              (SELECT 'installment_sale' FROM installment_sale_items isi JOIN installment_sales isale ON isale.id = isi.saleId WHERE isi.itemType = 'phone' AND isi.itemId = ph.id ORDER BY datetime(COALESCE(isale.saleDateISO, isale.dateCreated, '1970-01-01')) DESC, isi.id DESC LIMIT 1)
            ) as saleSourceType,
            COALESCE(
              (SELECT so.id FROM sales_order_items soi JOIN sales_orders so ON so.id = soi.orderId WHERE soi.itemType = 'phone' AND soi.itemId = ph.id AND (so.status IS NULL OR so.status = 'active') ORDER BY datetime(COALESCE(so.transactionDate, '1970-01-01')) DESC, soi.id DESC LIMIT 1),
              (SELECT st.id FROM sales_transactions st WHERE st.itemType = 'phone' AND st.itemId = ph.id ORDER BY datetime(COALESCE(st.transactionDate, '1970-01-01')) DESC, st.id DESC LIMIT 1),
              (SELECT isale.id FROM installment_sale_items isi JOIN installment_sales isale ON isale.id = isi.saleId WHERE isi.itemType = 'phone' AND isi.itemId = ph.id ORDER BY datetime(COALESCE(isale.saleDateISO, isale.dateCreated, '1970-01-01')) DESC, isi.id DESC LIMIT 1)
            ) as saleSourceId,
            COALESCE(
              (SELECT so.transactionDate FROM sales_order_items soi JOIN sales_orders so ON so.id = soi.orderId WHERE soi.itemType = 'phone' AND soi.itemId = ph.id AND (so.status IS NULL OR so.status = 'active') ORDER BY datetime(COALESCE(so.transactionDate, '1970-01-01')) DESC, soi.id DESC LIMIT 1),
              (SELECT st.transactionDate FROM sales_transactions st WHERE st.itemType = 'phone' AND st.itemId = ph.id ORDER BY datetime(COALESCE(st.transactionDate, '1970-01-01')) DESC, st.id DESC LIMIT 1),
              (SELECT COALESCE(isale.saleDateISO, isale.dateCreated) FROM installment_sale_items isi JOIN installment_sales isale ON isale.id = isi.saleId WHERE isi.itemType = 'phone' AND isi.itemId = ph.id ORDER BY datetime(COALESCE(isale.saleDateISO, isale.dateCreated, '1970-01-01')) DESC, isi.id DESC LIMIT 1),
              ph.saleDate
            ) as soldAt,
            COALESCE(
              (SELECT 'فاکتور #' || so.id FROM sales_order_items soi JOIN sales_orders so ON so.id = soi.orderId WHERE soi.itemType = 'phone' AND soi.itemId = ph.id AND (so.status IS NULL OR so.status = 'active') ORDER BY datetime(COALESCE(so.transactionDate, '1970-01-01')) DESC, soi.id DESC LIMIT 1),
              (SELECT 'فروش نقدی #' || st.id FROM sales_transactions st WHERE st.itemType = 'phone' AND st.itemId = ph.id ORDER BY datetime(COALESCE(st.transactionDate, '1970-01-01')) DESC, st.id DESC LIMIT 1),
              (SELECT 'اقساطی #' || isale.id FROM installment_sale_items isi JOIN installment_sales isale ON isale.id = isi.saleId WHERE isi.itemType = 'phone' AND isi.itemId = ph.id ORDER BY datetime(COALESCE(isale.saleDateISO, isale.dateCreated, '1970-01-01')) DESC, isi.id DESC LIMIT 1)
            ) as saleReferenceLabel,
            COALESCE(
              (SELECT soi.unitPrice FROM sales_order_items soi JOIN sales_orders so ON so.id = soi.orderId WHERE soi.itemType = 'phone' AND soi.itemId = ph.id AND (so.status IS NULL OR so.status = 'active') ORDER BY datetime(COALESCE(so.transactionDate, '1970-01-01')) DESC, soi.id DESC LIMIT 1),
              (SELECT st.pricePerItem FROM sales_transactions st WHERE st.itemType = 'phone' AND st.itemId = ph.id ORDER BY datetime(COALESCE(st.transactionDate, '1970-01-01')) DESC, st.id DESC LIMIT 1),
              (SELECT isi.unitPrice FROM installment_sale_items isi JOIN installment_sales isale ON isale.id = isi.saleId WHERE isi.itemType = 'phone' AND isi.itemId = ph.id ORDER BY datetime(COALESCE(isale.saleDateISO, isale.dateCreated, '1970-01-01')) DESC, isi.id DESC LIMIT 1),
              ph.salePrice
            ) as saleUnitPrice,
            COALESCE(
              (SELECT soi.totalPrice FROM sales_order_items soi JOIN sales_orders so ON so.id = soi.orderId WHERE soi.itemType = 'phone' AND soi.itemId = ph.id AND (so.status IS NULL OR so.status = 'active') ORDER BY datetime(COALESCE(so.transactionDate, '1970-01-01')) DESC, soi.id DESC LIMIT 1),
              (SELECT st.totalPrice FROM sales_transactions st WHERE st.itemType = 'phone' AND st.itemId = ph.id ORDER BY datetime(COALESCE(st.transactionDate, '1970-01-01')) DESC, st.id DESC LIMIT 1),
              (SELECT isi.totalPrice FROM installment_sale_items isi JOIN installment_sales isale ON isale.id = isi.saleId WHERE isi.itemType = 'phone' AND isi.itemId = ph.id ORDER BY datetime(COALESCE(isale.saleDateISO, isale.dateCreated, '1970-01-01')) DESC, isi.id DESC LIMIT 1),
              ph.salePrice
            ) as saleTotalPrice,
            COALESCE(
              (SELECT so.customerId FROM sales_order_items soi JOIN sales_orders so ON so.id = soi.orderId WHERE soi.itemType = 'phone' AND soi.itemId = ph.id AND (so.status IS NULL OR so.status = 'active') ORDER BY datetime(COALESCE(so.transactionDate, '1970-01-01')) DESC, soi.id DESC LIMIT 1),
              (SELECT st.customerId FROM sales_transactions st WHERE st.itemType = 'phone' AND st.itemId = ph.id ORDER BY datetime(COALESCE(st.transactionDate, '1970-01-01')) DESC, st.id DESC LIMIT 1),
              (SELECT isale.customerId FROM installment_sale_items isi JOIN installment_sales isale ON isale.id = isi.saleId WHERE isi.itemType = 'phone' AND isi.itemId = ph.id ORDER BY datetime(COALESCE(isale.saleDateISO, isale.dateCreated, '1970-01-01')) DESC, isi.id DESC LIMIT 1)
            ) as saleCustomerId,
            COALESCE(
              (SELECT c.fullName FROM sales_order_items soi JOIN sales_orders so ON so.id = soi.orderId LEFT JOIN customers c ON c.id = so.customerId WHERE soi.itemType = 'phone' AND soi.itemId = ph.id AND (so.status IS NULL OR so.status = 'active') ORDER BY datetime(COALESCE(so.transactionDate, '1970-01-01')) DESC, soi.id DESC LIMIT 1),
              (SELECT c.fullName FROM sales_transactions st LEFT JOIN customers c ON c.id = st.customerId WHERE st.itemType = 'phone' AND st.itemId = ph.id ORDER BY datetime(COALESCE(st.transactionDate, '1970-01-01')) DESC, st.id DESC LIMIT 1),
              (SELECT c.fullName FROM installment_sale_items isi JOIN installment_sales isale ON isale.id = isi.saleId LEFT JOIN customers c ON c.id = isale.customerId WHERE isi.itemType = 'phone' AND isi.itemId = ph.id ORDER BY datetime(COALESCE(isale.saleDateISO, isale.dateCreated, '1970-01-01')) DESC, isi.id DESC LIMIT 1)
            ) as saleCustomerName,
            COALESCE(
              (SELECT c.phoneNumber FROM sales_order_items soi JOIN sales_orders so ON so.id = soi.orderId LEFT JOIN customers c ON c.id = so.customerId WHERE soi.itemType = 'phone' AND soi.itemId = ph.id AND (so.status IS NULL OR so.status = 'active') ORDER BY datetime(COALESCE(so.transactionDate, '1970-01-01')) DESC, soi.id DESC LIMIT 1),
              (SELECT c.phoneNumber FROM sales_transactions st LEFT JOIN customers c ON c.id = st.customerId WHERE st.itemType = 'phone' AND st.itemId = ph.id ORDER BY datetime(COALESCE(st.transactionDate, '1970-01-01')) DESC, st.id DESC LIMIT 1),
              (SELECT c.phoneNumber FROM installment_sale_items isi JOIN installment_sales isale ON isale.id = isi.saleId LEFT JOIN customers c ON c.id = isale.customerId WHERE isi.itemType = 'phone' AND isi.itemId = ph.id ORDER BY datetime(COALESCE(isale.saleDateISO, isale.dateCreated, '1970-01-01')) DESC, isi.id DESC LIMIT 1)
            ) as saleCustomerPhone,
            COALESCE(
              (SELECT so.paymentMethod FROM sales_order_items soi JOIN sales_orders so ON so.id = soi.orderId WHERE soi.itemType = 'phone' AND soi.itemId = ph.id AND (so.status IS NULL OR so.status = 'active') ORDER BY datetime(COALESCE(so.transactionDate, '1970-01-01')) DESC, soi.id DESC LIMIT 1),
              (SELECT st.paymentMethod FROM sales_transactions st WHERE st.itemType = 'phone' AND st.itemId = ph.id ORDER BY datetime(COALESCE(st.transactionDate, '1970-01-01')) DESC, st.id DESC LIMIT 1),
              (SELECT isale.saleType FROM installment_sale_items isi JOIN installment_sales isale ON isale.id = isi.saleId WHERE isi.itemType = 'phone' AND isi.itemId = ph.id ORDER BY datetime(COALESCE(isale.saleDateISO, isale.dateCreated, '1970-01-01')) DESC, isi.id DESC LIMIT 1)
            ) as salePaymentMethod,
            COALESCE(
              (SELECT isale.actualSalePrice FROM installment_sale_items isi JOIN installment_sales isale ON isale.id = isi.saleId WHERE isi.itemType = 'phone' AND isi.itemId = ph.id ORDER BY datetime(COALESCE(isale.saleDateISO, isale.dateCreated, '1970-01-01')) DESC, isi.id DESC LIMIT 1),
              0
            ) as installmentSaleActualTotal,
            COALESCE(
              (SELECT isale.downPayment FROM installment_sale_items isi JOIN installment_sales isale ON isale.id = isi.saleId WHERE isi.itemType = 'phone' AND isi.itemId = ph.id ORDER BY datetime(COALESCE(isale.saleDateISO, isale.dateCreated, '1970-01-01')) DESC, isi.id DESC LIMIT 1),
              0
            ) as installmentSaleDownPayment,
            COALESCE(
              (SELECT SUM(COALESCE(it.amount_paid, 0))
                 FROM installment_sale_items isi
                 JOIN installment_sales isale ON isale.id = isi.saleId
                 JOIN installment_payments ip ON ip.saleId = isale.id
                 JOIN installment_transactions it ON it.installment_payment_id = ip.id
                WHERE isi.itemType = 'phone' AND isi.itemId = ph.id
                  AND isale.id = ${LATEST_PHONE_INSTALLMENT_SALE_ID_SQL}),
              0
            ) as installmentSaleTransactionPaidAmount,
            COALESCE(
              (SELECT SUM(MAX(0, COALESCE(ic.amount, 0) - COALESCE((
                         SELECT SUM(it.amount_paid)
                           FROM installment_payments rp
                           JOIN installment_transactions it ON it.installment_payment_id = rp.id
                          WHERE rp.sourceType = 'check_recovery' AND rp.sourceId = ic.id
                       ),0)))
                 FROM installment_sale_items isi
                 JOIN installment_sales isale ON isale.id = isi.saleId
                 JOIN installment_checks ic ON ic.saleId = isale.id
                WHERE isi.itemType = 'phone'
                  AND isi.itemId = ph.id
                  AND isale.id = ${LATEST_PHONE_INSTALLMENT_SALE_ID_SQL}
                  AND TRIM(COALESCE(ic.status, '')) IN ('پاس شده','نقد شد','نقدشده','وصول شده','تسویه شده','تکمیل شده','پرداخت شده','paid','Paid','cashed','Cashed')),
              0
            ) as installmentSaleCheckPaidAmount,
            COALESCE(
              (SELECT SUM(COALESCE(ip.amountDue, 0))
                 FROM installment_sale_items isi
                 JOIN installment_sales isale ON isale.id = isi.saleId
                 JOIN installment_payments ip ON ip.saleId = isale.id
                WHERE isi.itemType = 'phone' AND isi.itemId = ph.id
                  AND isale.id = ${LATEST_PHONE_INSTALLMENT_SALE_ID_SQL}
                  AND COALESCE(ip.sourceType,'installment') = 'installment'),
              0
            ) as installmentSaleScheduledAmount,
            COALESCE(
              (SELECT COUNT(1)
                 FROM installment_sale_items isi
                 JOIN installment_sales isale ON isale.id = isi.saleId
                 JOIN installment_payments ip ON ip.saleId = isale.id
                WHERE isi.itemType = 'phone'
                  AND isi.itemId = ph.id
                  AND isale.id = ${LATEST_PHONE_INSTALLMENT_SALE_ID_SQL}
                  AND COALESCE(ip.sourceType,'installment') = 'installment'
                  AND MAX(0, COALESCE(ip.amountDue,0) - COALESCE((
                        SELECT SUM(it.amount_paid)
                          FROM installment_transactions it
                         WHERE it.installment_payment_id = ip.id
                      ),0)) > 0.00001),
              0
            ) as installmentSaleOpenPaymentsCount,
            COALESCE(
              (SELECT COUNT(1)
                 FROM installment_sale_items isi
                 JOIN installment_sales isale ON isale.id = isi.saleId
                 JOIN installment_checks ic ON ic.saleId = isale.id
                WHERE isi.itemType = 'phone'
                  AND isi.itemId = ph.id
                  AND isale.id = ${LATEST_PHONE_INSTALLMENT_SALE_ID_SQL}
                  AND TRIM(COALESCE(ic.status, '')) NOT IN ('پاس شده','نقد شد','نقدشده','وصول شده','تسویه شده','تکمیل شده','پرداخت شده','paid','Paid','cashed','Cashed')
                  AND MAX(0, COALESCE(ic.amount,0) - COALESCE((
                        SELECT SUM(it.amount_paid)
                          FROM installment_payments rp
                          JOIN installment_transactions it ON it.installment_payment_id = rp.id
                         WHERE rp.sourceType = 'check_recovery' AND rp.sourceId = ic.id
                      ),0)) > 0.00001),
              0
            ) as installmentSaleOpenChecksCount,
            ${PHONE_SETTLEMENT_MANUAL_PAID_SQL} as phoneSettlementManualPaidAmount,
            1 as quantityPurchased,
            'عدد' as unit,
            ${SOLD_PHONE_DAILY_BUY_PRICE_SQL} as totalPrice,
            ph.purchaseDate, ph.status, 'phone' as type
     FROM phones ph
     WHERE ph.supplierId = ?${soldPhoneScopeSql}${phoneScopeSql}`,
    [partnerId, ...phoneIds],
  ) : [];
  return [...products, ...phones].sort(
    (a, b) =>
      new Date(String(b.purchaseDate || b.soldAt || 0)).getTime() -
      new Date(String(a.purchaseDate || a.soldAt || 0)).getTime(),
  );
};


export type PartnerPurchaseDirectoryQuery = {
  page?: number;
  pageSize?: number;
  type?: "all" | "phone" | "product";
};

const getPartnerPurchaseCountsFromDb = async (partnerId: number) => {
  const [productRow, phoneRow] = await Promise.all([
    getAsync(
      `SELECT COUNT(DISTINCT pi.productId) AS count
         FROM purchases p
         JOIN purchase_items pi ON pi.purchaseId = p.id
        WHERE p.supplierId = ?`,
      [partnerId],
    ),
    getAsync(`SELECT COUNT(*) AS count FROM phones WHERE supplierId = ?`, [partnerId]),
  ]);
  const product = Number(productRow?.count || 0);
  const phone = Number(phoneRow?.count || 0);
  return { all: product + phone, product, phone };
};

export const getPartnerPurchaseSummaryFromDb = async (partnerId: number) => {
  await getDbInstance();
  const [counts, totalRow] = await Promise.all([
    getPartnerPurchaseCountsFromDb(partnerId),
    getAsync(
      `SELECT COALESCE(SUM(totalValue), 0) AS totalValue FROM (
         SELECT COALESCE(SUM(pi.lineTotal), 0) AS totalValue
           FROM purchases p
           JOIN purchase_items pi ON pi.purchaseId = p.id
          WHERE p.supplierId = ?
         UNION ALL
         SELECT COALESCE(SUM(COALESCE(NULLIF(currentPurchasePrice, 0), purchasePrice, 0)), 0) AS totalValue
           FROM phones
          WHERE supplierId = ?
       )`,
      [partnerId, partnerId],
    ),
  ]);
  return { ...counts, totalValue: Number(totalRow?.totalValue || 0) };
};

export const listPartnerPurchaseDirectoryFromDb = async (
  partnerId: number,
  rawQuery: PartnerPurchaseDirectoryQuery = {},
) => {
  await getDbInstance();
  const page = Math.max(1, Math.floor(Number(rawQuery.page || 1)));
  const pageSize = Math.min(100, Math.max(10, Math.floor(Number(rawQuery.pageSize || 25))));
  const type = (["all", "phone", "product"].includes(String(rawQuery.type || "all")) ? String(rawQuery.type || "all") : "all") as "all" | "phone" | "product";
  const offset = (page - 1) * pageSize;
  const counts = await getPartnerPurchaseCountsFromDb(partnerId);

  const branches: string[] = [];
  const params: any[] = [];
  if (type === "all" || type === "product") {
    branches.push(`SELECT 'product' AS assetType, pi.productId AS assetId, MAX(COALESCE(p.purchaseDate, '1970-01-01')) AS sortDate
      FROM purchases p
      JOIN purchase_items pi ON pi.purchaseId = p.id
      WHERE p.supplierId = ?
      GROUP BY pi.productId`);
    params.push(partnerId);
  }
  if (type === "all" || type === "phone") {
    branches.push(`SELECT 'phone' AS assetType, ph.id AS assetId, COALESCE(ph.purchaseDate, ph.registerDate, ph.saleDate, '1970-01-01') AS sortDate
      FROM phones ph
      WHERE ph.supplierId = ?`);
    params.push(partnerId);
  }

  const keys = branches.length
    ? await allAsync(
        `WITH purchase_keys AS (${branches.join(" UNION ALL ")})
         SELECT assetType, assetId, sortDate
           FROM purchase_keys
          ORDER BY datetime(sortDate) DESC, assetId DESC
          LIMIT ? OFFSET ?`,
        [...params, pageSize, offset],
      )
    : [];
  const productIds = keys.filter((row: any) => row.assetType === "product").map((row: any) => Number(row.assetId));
  const phoneIds = keys.filter((row: any) => row.assetType === "phone").map((row: any) => Number(row.assetId));
  const hydrated = await getPurchasedItemsFromPartnerDb(partnerId, {
    includeProducts: productIds.length > 0,
    includePhones: phoneIds.length > 0,
    productIds,
    phoneIds,
  });
  const byKey = new Map(hydrated.map((row: any) => [`${row.type}:${Number(row.id)}`, row]));
  const items = keys.map((key: any) => byKey.get(`${key.assetType}:${Number(key.assetId)}`)).filter(Boolean);
  const total = type === "phone" ? counts.phone : type === "product" ? counts.product : counts.all;
  return {
    items,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    counts,
  };
};


export type PartnerPhoneSettlementDirectoryQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: "all" | "open" | "settled";
  sort?: "newest" | "highestBalance" | "highestCapital" | "oldestSale" | "lowestBalance";
  includeMeta?: boolean;
};

export type PartnerPhoneSettlementTimelineQuery = {
  page?: number;
  pageSize?: number;
  includeMeta?: boolean;
};

const buildPartnerSoldPhoneSettlementStateCte = (scopePhone = false) => {
  const partnerPhoneScopeSql = scopePhone
    ? "ph.supplierId = ? AND ph.id = ? AND ph.status IN ('فروخته شده', 'فروخته شده (قسطی)')"
    : "ph.supplierId = ? AND ph.status IN ('فروخته شده', 'فروخته شده (قسطی)')";
  return `
WITH partner_phones AS (
  SELECT ph.id, ph.supplierId, ph.model, ph.imei, ph.status, ph.purchaseDate, ph.registerDate,
         ph.saleDate, ph.purchasePrice, ph.currentPurchasePrice, ph.salePrice
  FROM phones ph
  WHERE ${partnerPhoneScopeSql}
), manual_settlement AS (
  SELECT l.referenceId AS phoneId, COALESCE(SUM(COALESCE(l.debit,0)),0) AS paidAmount
  FROM partner_ledger l
  JOIN partner_phones ph ON ph.id = l.referenceId AND ph.supplierId = l.partnerId
  WHERE l.referenceType IN ${PHONE_SETTLEMENT_LEDGER_TYPES_SQL}
  GROUP BY l.referenceId
), sales_order_source_ranked AS (
  SELECT soi.itemId AS phoneId, so.id AS sourceId, so.transactionDate AS soldAt,
         so.paymentMethod, so.customerId, soi.totalPrice,
         ROW_NUMBER() OVER (PARTITION BY soi.itemId ORDER BY datetime(COALESCE(so.transactionDate,'1970-01-01')) DESC, soi.id DESC) AS rn
  FROM sales_order_items soi
  JOIN sales_orders so ON so.id = soi.orderId
  JOIN partner_phones ph ON ph.id = soi.itemId
  WHERE soi.itemType = 'phone' AND (so.status IS NULL OR so.status = 'active')
), sales_order_source AS (
  SELECT * FROM sales_order_source_ranked WHERE rn = 1
), sales_order_buy_ranked AS (
  SELECT soi.itemId AS phoneId, soi.buyPrice,
         ROW_NUMBER() OVER (PARTITION BY soi.itemId ORDER BY datetime(COALESCE(so.transactionDate,'1970-01-01')) DESC, soi.id DESC) AS rn
  FROM sales_order_items soi
  JOIN sales_orders so ON so.id = soi.orderId
  JOIN partner_phones ph ON ph.id = soi.itemId
  WHERE soi.itemType = 'phone' AND (so.status IS NULL OR so.status = 'active') AND COALESCE(NULLIF(soi.buyPrice,0),0) > 0
), sales_order_buy AS (
  SELECT * FROM sales_order_buy_ranked WHERE rn = 1
), legacy_source_ranked AS (
  SELECT st.itemId AS phoneId, st.id AS sourceId, st.transactionDate AS soldAt,
         st.paymentMethod, st.customerId, st.totalPrice,
         ROW_NUMBER() OVER (PARTITION BY st.itemId ORDER BY datetime(COALESCE(st.transactionDate,'1970-01-01')) DESC, st.id DESC) AS rn
  FROM sales_transactions st
  JOIN partner_phones ph ON ph.id = st.itemId
  WHERE st.itemType = 'phone'
), legacy_source AS (
  SELECT * FROM legacy_source_ranked WHERE rn = 1
), legacy_buy_ranked AS (
  SELECT st.itemId AS phoneId, st.buyPrice,
         ROW_NUMBER() OVER (PARTITION BY st.itemId ORDER BY datetime(COALESCE(st.transactionDate,'1970-01-01')) DESC, st.id DESC) AS rn
  FROM sales_transactions st
  JOIN partner_phones ph ON ph.id = st.itemId
  WHERE st.itemType = 'phone' AND COALESCE(NULLIF(st.buyPrice,0),0) > 0
), legacy_buy AS (
  SELECT * FROM legacy_buy_ranked WHERE rn = 1
), installment_source_ranked AS (
  SELECT isi.itemId AS phoneId, isale.id AS sourceId,
         COALESCE(isale.saleDateISO,isale.dateCreated) AS soldAt,
         isale.saleType AS paymentMethod, isale.customerId, isi.totalPrice,
         isale.actualSalePrice, isale.downPayment,
         ROW_NUMBER() OVER (PARTITION BY isi.itemId ORDER BY datetime(COALESCE(isale.saleDateISO,isale.dateCreated,'1970-01-01')) DESC, isi.id DESC) AS rn
  FROM installment_sale_items isi
  JOIN installment_sales isale ON isale.id = isi.saleId
  JOIN partner_phones ph ON ph.id = isi.itemId
  WHERE isi.itemType = 'phone'
), installment_source AS (
  SELECT * FROM installment_source_ranked WHERE rn = 1
), installment_buy_any_ranked AS (
  SELECT isi.itemId AS phoneId, isi.buyPrice,
         ROW_NUMBER() OVER (PARTITION BY isi.itemId ORDER BY datetime(COALESCE(isale.saleDateISO,isale.dateCreated,'1970-01-01')) DESC, isi.id DESC) AS rn
  FROM installment_sale_items isi
  JOIN installment_sales isale ON isale.id = isi.saleId
  JOIN partner_phones ph ON ph.id = isi.itemId
  WHERE isi.itemType = 'phone' AND COALESCE(NULLIF(isi.buyPrice,0),0) > 0
), installment_buy_any AS (
  SELECT * FROM installment_buy_any_ranked WHERE rn = 1
), installment_buy_active_ranked AS (
  SELECT isi.itemId AS phoneId, isi.buyPrice,
         ROW_NUMBER() OVER (PARTITION BY isi.itemId ORDER BY datetime(COALESCE(isale.saleDateISO,isale.dateCreated,'1970-01-01')) DESC, isi.id DESC) AS rn
  FROM installment_sale_items isi
  JOIN installment_sales isale ON isale.id = isi.saleId
  JOIN partner_phones ph ON ph.id = isi.itemId
  WHERE isi.itemType = 'phone' AND COALESCE(isale.status,'active') = 'active' AND COALESCE(NULLIF(isi.buyPrice,0),0) > 0
), installment_buy_active AS (
  SELECT * FROM installment_buy_active_ranked WHERE rn = 1
), installment_active_ranked AS (
  SELECT isi.itemId AS phoneId, isale.id AS saleId,
         ROW_NUMBER() OVER (PARTITION BY isi.itemId ORDER BY datetime(COALESCE(isale.saleDateISO,isale.dateCreated,'1970-01-01')) DESC, isi.id DESC) AS rn
  FROM installment_sale_items isi
  JOIN installment_sales isale ON isale.id = isi.saleId
  JOIN partner_phones ph ON ph.id = isi.itemId
  WHERE isi.itemType = 'phone' AND COALESCE(isale.status,'active') = 'active'
), installment_active AS (
  SELECT phoneId, saleId FROM installment_active_ranked WHERE rn = 1
), installment_transaction_totals AS (
  SELECT ia.phoneId, COALESCE(SUM(COALESCE(it.amount_paid,0)),0) AS paidAmount
  FROM installment_active ia
  JOIN installment_payments ip ON ip.saleId = ia.saleId
  JOIN installment_transactions it ON it.installment_payment_id = ip.id
  GROUP BY ia.phoneId
), installment_scheduled_totals AS (
  SELECT ia.phoneId, COALESCE(SUM(COALESCE(ip.amountDue,0)),0) AS scheduledAmount
  FROM installment_active ia
  JOIN installment_payments ip ON ip.saleId = ia.saleId AND COALESCE(ip.sourceType,'installment') = 'installment'
  GROUP BY ia.phoneId
), check_recovery_totals AS (
  SELECT rp.sourceId AS checkId, COALESCE(SUM(COALESCE(it.amount_paid,0)),0) AS recoveryAmount
  FROM installment_payments rp
  JOIN installment_transactions it ON it.installment_payment_id = rp.id
  WHERE rp.sourceType = 'check_recovery' AND rp.sourceId IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM installment_checks scoped_check
      JOIN installment_active scoped_sale ON scoped_sale.saleId = scoped_check.saleId
      WHERE scoped_check.id = rp.sourceId
    )
  GROUP BY rp.sourceId
), installment_check_paid_totals AS (
  SELECT ia.phoneId,
         COALESCE(SUM(MAX(0,COALESCE(ic.amount,0)-COALESCE(cr.recoveryAmount,0))),0) AS paidAmount
  FROM installment_active ia
  JOIN installment_checks ic ON ic.saleId = ia.saleId
  LEFT JOIN check_recovery_totals cr ON cr.checkId = ic.id
  WHERE TRIM(COALESCE(ic.status,'')) IN ('پاس شده','نقد شد','نقدشده','وصول شده','تسویه شده','تکمیل شده','پرداخت شده','paid','Paid','cashed','Cashed')
  GROUP BY ia.phoneId
), raw_phone_settlement AS (
  SELECT
    ph.id,
    ph.model AS name,
    ph.imei AS identifier,
    ph.status,
    ph.purchaseDate,
    ph.registerDate,
    ph.saleDate,
    COALESCE(ph.purchasePrice,0) AS initialPurchasePrice,
    COALESCE(NULLIF(sob.buyPrice,0),NULLIF(lb.buyPrice,0),NULLIF(iab.buyPrice,0),NULLIF(ph.currentPurchasePrice,0),ph.purchasePrice,0) AS settlementPurchasePrice,
    COALESCE(ms.paidAmount,0) AS manualSettlementPaidAmount,
    CASE WHEN sos.phoneId IS NOT NULL THEN 'sales_order' WHEN ls.phoneId IS NOT NULL THEN 'legacy_sale' WHEN ins.phoneId IS NOT NULL THEN 'installment_sale' ELSE NULL END AS saleSourceType,
    COALESCE(sos.paymentMethod,ls.paymentMethod,ins.paymentMethod) AS salePaymentMethod,
    c.fullName AS saleCustomerName,
    COALESCE(sos.soldAt,ls.soldAt,ins.soldAt,ph.saleDate) AS soldAt,
    COALESCE(sos.totalPrice,ls.totalPrice,ins.totalPrice,ph.salePrice,0) AS saleTotalPrice,
    COALESCE(ins.actualSalePrice,0) AS installmentSaleActualTotal,
    COALESCE(ins.downPayment,0) AS installmentSaleDownPayment,
    COALESCE(itt.paidAmount,0) AS installmentSaleTransactionPaidAmount,
    COALESCE(ict.paidAmount,0) AS installmentSaleCheckPaidAmount,
    COALESCE(ist.scheduledAmount,0) AS installmentSaleScheduledAmount,
    CASE WHEN sob.phoneId IS NOT NULL THEN 'فاکتور فروش'
         WHEN lb.phoneId IS NOT NULL THEN 'فروش نقدی قدیمی'
         WHEN iba.phoneId IS NOT NULL THEN 'فروش اقساطی'
         WHEN COALESCE(NULLIF(ph.currentPurchasePrice,0),0) > 0 THEN 'قیمت خرید روز گوشی'
         ELSE 'قیمت خرید اولیه' END AS settlementPriceSourceLabel,
    CASE WHEN sos.phoneId IS NOT NULL THEN 'فاکتور #' || sos.sourceId
         WHEN ls.phoneId IS NOT NULL THEN 'فروش نقدی #' || ls.sourceId
         WHEN ins.phoneId IS NOT NULL THEN 'اقساطی #' || ins.sourceId
         ELSE NULL END AS saleReferenceLabel
  FROM partner_phones ph
  LEFT JOIN manual_settlement ms ON ms.phoneId = ph.id
  LEFT JOIN sales_order_source sos ON sos.phoneId = ph.id
  LEFT JOIN sales_order_buy sob ON sob.phoneId = ph.id
  LEFT JOIN legacy_source ls ON ls.phoneId = ph.id
  LEFT JOIN legacy_buy lb ON lb.phoneId = ph.id
  LEFT JOIN installment_source ins ON ins.phoneId = ph.id
  LEFT JOIN installment_buy_any iba ON iba.phoneId = ph.id
  LEFT JOIN installment_buy_active iab ON iab.phoneId = ph.id
  LEFT JOIN installment_transaction_totals itt ON itt.phoneId = ph.id
  LEFT JOIN installment_scheduled_totals ist ON ist.phoneId = ph.id
  LEFT JOIN installment_check_paid_totals ict ON ict.phoneId = ph.id
  LEFT JOIN customers c ON c.id = COALESCE(sos.customerId,ls.customerId,ins.customerId)
), classified_phone_settlement AS (
  SELECT raw_phone_settlement.*,
    (COALESCE(installmentSaleDownPayment,0) + COALESCE(installmentSaleTransactionPaidAmount,0) + COALESCE(installmentSaleCheckPaidAmount,0)) AS installmentCollectedAmount,
    CASE WHEN saleSourceType = 'installment_sale' OR status LIKE '%قسطی%' OR LOWER(COALESCE(salePaymentMethod,'')) LIKE '%installment%' THEN 1 ELSE 0 END AS isInstallmentSale
  FROM raw_phone_settlement
), auto_phone_settlement AS (
  SELECT classified_phone_settlement.*,
    CASE
      WHEN isInstallmentSale = 1 THEN MIN(MAX(0,settlementPurchasePrice),MAX(0,installmentCollectedAmount))
      WHEN saleSourceType IN ('sales_order','legacy_sale') AND LOWER(COALESCE(salePaymentMethod,'')) NOT LIKE '%credit%' AND COALESCE(salePaymentMethod,'') NOT LIKE '%اعتبار%'
      THEN MAX(0,settlementPurchasePrice)
      ELSE 0
    END AS autoRecognizedPaidAmount,
    CASE WHEN isInstallmentSale = 1 THEN MAX(0,
      COALESCE(NULLIF(installmentSaleActualTotal,0),NULLIF(saleTotalPrice,0),NULLIF(installmentSaleScheduledAmount,0),0)-MAX(0,installmentCollectedAmount)
    ) ELSE 0 END AS installmentCustomerRemainingAmount
  FROM classified_phone_settlement
), final_paid_phone_settlement AS (
  SELECT auto_phone_settlement.*,
    MIN(MAX(0,settlementPurchasePrice),MAX(MAX(0,manualSettlementPaidAmount),MAX(0,autoRecognizedPaidAmount))) AS phoneSettlementPaidAmount
  FROM auto_phone_settlement
), settlement_state AS (
  SELECT final_paid_phone_settlement.*,
    MAX(0,MAX(0,settlementPurchasePrice)-MAX(0,phoneSettlementPaidAmount)) AS phoneSettlementBalance,
    (MAX(0,settlementPurchasePrice)-MAX(0,initialPurchasePrice)) AS dailyPriceDelta,
    CASE WHEN isInstallmentSale = 0 OR installmentCustomerRemainingAmount <= 0.00001 THEN 1 ELSE 0 END AS saleFileClosed
  FROM final_paid_phone_settlement
)`;
};

const PARTNER_SOLD_PHONE_SETTLEMENT_STATE_CTE = buildPartnerSoldPhoneSettlementStateCte(false);
// Timeline reads reuse the same accounting formulas but scope every dependent CTE to one phone.
const PARTNER_SOLD_PHONE_SETTLEMENT_STATE_FOR_PHONE_CTE = buildPartnerSoldPhoneSettlementStateCte(true);

const normalizePartnerSettlementSearch = (value: unknown) => String(value || '')
  .trim()
  .replace(/ي/g, 'ی')
  .replace(/ك/g, 'ک')
  .replace(/\s+/g, ' ');

const partnerSettlementFilterSql = (
  status: "all" | "open" | "settled",
  search: string,
) => {
  const clauses: string[] = [];
  const params: any[] = [];
  if (status === 'open') clauses.push('phoneSettlementBalance > 0.00001');
  if (status === 'settled') clauses.push('phoneSettlementBalance <= 0.00001');
  if (search) {
    const needle = `%${search}%`;
    clauses.push(`(
      REPLACE(REPLACE(COALESCE(name,''),'ي','ی'),'ك','ک') LIKE ? COLLATE NOCASE OR
      REPLACE(REPLACE(COALESCE(identifier,''),'ي','ی'),'ك','ک') LIKE ? COLLATE NOCASE OR
      REPLACE(REPLACE(COALESCE(status,''),'ي','ی'),'ك','ک') LIKE ? COLLATE NOCASE OR
      REPLACE(REPLACE(COALESCE(saleCustomerName,''),'ي','ی'),'ك','ک') LIKE ? COLLATE NOCASE OR
      REPLACE(REPLACE(COALESCE(soldAt,''),'ي','ی'),'ك','ک') LIKE ? COLLATE NOCASE OR
      REPLACE(REPLACE(COALESCE(settlementPriceSourceLabel,''),'ي','ی'),'ك','ک') LIKE ? COLLATE NOCASE OR
      REPLACE(REPLACE(COALESCE(saleReferenceLabel,''),'ي','ی'),'ك','ک') LIKE ? COLLATE NOCASE
    )`);
    params.push(needle, needle, needle, needle, needle, needle, needle);
  }
  return { sql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params };
};

const partnerSettlementSortSql = (sort: PartnerPhoneSettlementDirectoryQuery['sort']) => {
  if (sort === 'highestBalance') return 'phoneSettlementBalance DESC, datetime(COALESCE(soldAt, purchaseDate, registerDate, \'1970-01-01\')) DESC, id DESC';
  if (sort === 'highestCapital') return 'settlementPurchasePrice DESC, datetime(COALESCE(soldAt, purchaseDate, registerDate, \'1970-01-01\')) DESC, id DESC';
  if (sort === 'oldestSale') return 'datetime(COALESCE(soldAt, purchaseDate, registerDate, \'1970-01-01\')) ASC, id ASC';
  if (sort === 'lowestBalance') return 'phoneSettlementBalance ASC, datetime(COALESCE(soldAt, purchaseDate, registerDate, \'1970-01-01\')) ASC, id ASC';
  return 'datetime(COALESCE(soldAt, purchaseDate, registerDate, \'1970-01-01\')) DESC, id DESC';
};

const normalizeSettlementSummaryRow = (row: any) => ({
  total: Number(row?.total || 0),
  open: Number(row?.open || 0),
  settled: Number(row?.settled || 0),
  totalAmount: Number(row?.totalAmount || 0),
  initialTotal: Number(row?.initialTotal || 0),
  paidTotal: Number(row?.paidTotal || 0),
  balanceTotal: Number(row?.balanceTotal || 0),
  deltaTotal: Number(row?.deltaTotal || 0),
  openBasisTotal: Number(row?.openBasisTotal || 0),
  openPaidTotal: Number(row?.openPaidTotal || 0),
  openBalanceTotal: Number(row?.openBalanceTotal || 0),
  missingCurrentPurchasePriceItems: Number(row?.missingCurrentPurchasePriceItems || 0),
  missingSourceItems: Number(row?.missingSourceItems || 0),
  openSaleFiles: Number(row?.openSaleFiles || 0),
  closedSaleFiles: Number(row?.closedSaleFiles || 0),
  customerInstallmentRemainingAmount: Number(row?.customerInstallmentRemainingAmount || 0),
});

export const getPartnerPhoneSettlementProfileDataFromDb = async (partnerId: number) => {
  await getDbInstance();
  const summaryRow = await getAsync(
    `${PARTNER_SOLD_PHONE_SETTLEMENT_STATE_CTE}
     SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN phoneSettlementBalance > 0.00001 THEN 1 ELSE 0 END) AS open,
       SUM(CASE WHEN phoneSettlementBalance <= 0.00001 THEN 1 ELSE 0 END) AS settled,
       COALESCE(SUM(settlementPurchasePrice),0) AS totalAmount,
       COALESCE(SUM(initialPurchasePrice),0) AS initialTotal,
       COALESCE(SUM(phoneSettlementPaidAmount),0) AS paidTotal,
       COALESCE(SUM(phoneSettlementBalance),0) AS balanceTotal,
       COALESCE(SUM(dailyPriceDelta),0) AS deltaTotal,
       COALESCE(SUM(CASE WHEN phoneSettlementBalance > 0.00001 THEN settlementPurchasePrice ELSE 0 END),0) AS openBasisTotal,
       COALESCE(SUM(CASE WHEN phoneSettlementBalance > 0.00001 THEN phoneSettlementPaidAmount ELSE 0 END),0) AS openPaidTotal,
       COALESCE(SUM(CASE WHEN phoneSettlementBalance > 0.00001 THEN phoneSettlementBalance ELSE 0 END),0) AS openBalanceTotal,
       SUM(CASE WHEN settlementPurchasePrice <= 0 THEN 1 ELSE 0 END) AS missingCurrentPurchasePriceItems,
       SUM(CASE WHEN saleSourceType IS NULL AND saleReferenceLabel IS NULL THEN 1 ELSE 0 END) AS missingSourceItems,
       SUM(CASE WHEN saleFileClosed = 0 THEN 1 ELSE 0 END) AS openSaleFiles,
       SUM(CASE WHEN saleFileClosed = 1 THEN 1 ELSE 0 END) AS closedSaleFiles,
       COALESCE(SUM(installmentCustomerRemainingAmount),0) AS customerInstallmentRemainingAmount
     FROM settlement_state`,
    [partnerId],
  );
  const previewKeys = await allAsync(
    `${PARTNER_SOLD_PHONE_SETTLEMENT_STATE_CTE}
     SELECT id
     FROM settlement_state
     WHERE phoneSettlementBalance > 0.00001
     ORDER BY datetime(COALESCE(soldAt, purchaseDate, registerDate, '1970-01-01')) DESC, id DESC
     LIMIT 8`,
    [partnerId],
  );
  const previewIds = previewKeys.map((row: any) => Number(row.id)).filter((id: number) => id > 0);
  const hydrated = previewIds.length
    ? await getPurchasedItemsFromPartnerDb(partnerId, {
        includeProducts: false,
        includePhones: true,
        soldPhonesOnly: true,
        phoneIds: previewIds,
      })
    : [];
  const byId = new Map(hydrated.map((row: any) => [Number(row.id), row]));
  return {
    summary: normalizeSettlementSummaryRow(summaryRow),
    previewItems: previewIds.map((id: number) => byId.get(id)).filter(Boolean),
  };
};

export const listPartnerPhoneSettlementDirectoryFromDb = async (
  partnerId: number,
  rawQuery: PartnerPhoneSettlementDirectoryQuery = {},
) => {
  await getDbInstance();
  const page = Math.max(1, Math.floor(Number(rawQuery.page || 1)));
  const pageSize = Math.min(100, Math.max(10, Math.floor(Number(rawQuery.pageSize || 25))));
  const search = normalizePartnerSettlementSearch(rawQuery.search);
  const status = (["all", "open", "settled"].includes(String(rawQuery.status || "all")) ? String(rawQuery.status || "all") : "all") as "all" | "open" | "settled";
  const sort = (["newest", "highestBalance", "highestCapital", "oldestSale", "lowestBalance"].includes(String(rawQuery.sort || "newest")) ? String(rawQuery.sort || "newest") : "newest") as PartnerPhoneSettlementDirectoryQuery['sort'];
  const includeMeta = rawQuery.includeMeta !== false;
  const offset = (page - 1) * pageSize;
  const filter = partnerSettlementFilterSql(status, search);

  let meta: any = null;
  if (includeMeta) {
    meta = await getAsync(
      `${PARTNER_SOLD_PHONE_SETTLEMENT_STATE_CTE}
       SELECT COUNT(*) AS total,
         COALESCE(SUM(settlementPurchasePrice),0) AS totalAmount,
         COALESCE(SUM(initialPurchasePrice),0) AS initialTotal,
         COALESCE(SUM(phoneSettlementPaidAmount),0) AS paidTotal,
         COALESCE(SUM(phoneSettlementBalance),0) AS balanceTotal,
         COALESCE(SUM(dailyPriceDelta),0) AS deltaTotal
       FROM settlement_state ${filter.sql}`,
      [partnerId, ...filter.params],
    );
  }

  const keys = await allAsync(
    `${PARTNER_SOLD_PHONE_SETTLEMENT_STATE_CTE}
     SELECT id
     FROM settlement_state ${filter.sql}
     ORDER BY ${partnerSettlementSortSql(sort)}
     LIMIT ? OFFSET ?`,
    [partnerId, ...filter.params, pageSize, offset],
  );
  const ids = keys.map((row: any) => Number(row.id)).filter((value: number) => value > 0);
  const hydrated = ids.length
    ? await getPurchasedItemsFromPartnerDb(partnerId, {
        includeProducts: false,
        includePhones: true,
        soldPhonesOnly: true,
        phoneIds: ids,
      })
    : [];
  const byId = new Map(hydrated.map((row: any) => [Number(row.id), row]));
  const items = ids.map((id: number) => byId.get(id)).filter(Boolean);
  const total = includeMeta ? Number(meta?.total || 0) : undefined;
  return {
    items,
    page,
    pageSize,
    ...(includeMeta ? {
      total,
      totalPages: Math.max(1, Math.ceil(Number(total || 0) / pageSize)),
      filteredSummary: {
        total: Number(meta?.total || 0),
        totalAmount: Number(meta?.totalAmount || 0),
        initialTotal: Number(meta?.initialTotal || 0),
        paidTotal: Number(meta?.paidTotal || 0),
        balanceTotal: Number(meta?.balanceTotal || 0),
        deltaTotal: Number(meta?.deltaTotal || 0),
      },
    } : {}),
    metaIncluded: includeMeta,
  };
};


export const getPartnerPhoneSettlementTimelineFromDb = async (
  partnerId: number,
  phoneId: number,
  rawQuery: PartnerPhoneSettlementTimelineQuery = {},
) => {
  await getDbInstance();
  const safePartnerId = Math.floor(Number(partnerId || 0));
  const safePhoneId = Math.floor(Number(phoneId || 0));
  if (safePartnerId <= 0 || safePhoneId <= 0) return null;

  // A cheap ownership/status guard runs for every page. Meta pages additionally run the
  // single-phone settlement CTE, while load-more requests only touch the indexed ledger.
  const ownership = await getAsync(
    `SELECT id FROM phones
      WHERE id = ? AND supplierId = ? AND status IN ('فروخته شده', 'فروخته شده (قسطی)')
      LIMIT 1`,
    [safePhoneId, safePartnerId],
  );
  if (!ownership?.id) return null;

  const page = Math.max(1, Math.floor(Number(rawQuery.page || 1)));
  const pageSize = Math.min(50, Math.max(10, Math.floor(Number(rawQuery.pageSize || 20))));
  const includeMeta = rawQuery.includeMeta !== false;
  const offset = (page - 1) * pageSize;

  let summary: any = null;
  let total: number | undefined;
  if (includeMeta) {
    summary = await getAsync(
      `${PARTNER_SOLD_PHONE_SETTLEMENT_STATE_FOR_PHONE_CTE}
       SELECT
         id AS phoneId, name, identifier, status,
         initialPurchasePrice, settlementPurchasePrice,
         manualSettlementPaidAmount, autoRecognizedPaidAmount, phoneSettlementPaidAmount, phoneSettlementBalance,
         isInstallmentSale, installmentCollectedAmount, installmentSaleDownPayment,
         installmentSaleTransactionPaidAmount, installmentSaleCheckPaidAmount, installmentCustomerRemainingAmount,
         saleFileClosed, saleSourceType, salePaymentMethod, saleCustomerName, soldAt, saleTotalPrice,
         settlementPriceSourceLabel, saleReferenceLabel
       FROM settlement_state
       LIMIT 1`,
      [safePartnerId, safePhoneId],
    );
    const totalRow = await getAsync(
      `SELECT COUNT(*) AS total
         FROM partner_ledger
        WHERE partnerId = ?
          AND referenceId = ?
          AND referenceType IN ${PHONE_SETTLEMENT_LEDGER_TYPES_SQL}
          AND COALESCE(debit, 0) > 0`,
      [safePartnerId, safePhoneId],
    );
    total = Number(totalRow?.total || 0);
  }

  const payments = await allAsync(
    `SELECT *
       FROM partner_ledger
      WHERE partnerId = ?
        AND referenceId = ?
        AND referenceType IN ${PHONE_SETTLEMENT_LEDGER_TYPES_SQL}
        AND COALESCE(debit, 0) > 0
      ORDER BY datetime(COALESCE(transactionDate, updatedAt, createdAt, '1970-01-01')) DESC, id DESC
      LIMIT ? OFFSET ?`,
    [safePartnerId, safePhoneId, pageSize, offset],
  );

  const normalizedSummary = summary
    ? {
        ...summary,
        phoneId: Number(summary.phoneId || safePhoneId),
        initialPurchasePrice: Number(summary.initialPurchasePrice || 0),
        settlementPurchasePrice: Number(summary.settlementPurchasePrice || 0),
        manualSettlementPaidAmount: Number(summary.manualSettlementPaidAmount || 0),
        autoRecognizedPaidAmount: Number(summary.autoRecognizedPaidAmount || 0),
        phoneSettlementPaidAmount: Number(summary.phoneSettlementPaidAmount || 0),
        phoneSettlementBalance: Number(summary.phoneSettlementBalance || 0),
        isInstallmentSale: Number(summary.isInstallmentSale || 0),
        installmentCollectedAmount: Number(summary.installmentCollectedAmount || 0),
        installmentSaleDownPayment: Number(summary.installmentSaleDownPayment || 0),
        installmentSaleTransactionPaidAmount: Number(summary.installmentSaleTransactionPaidAmount || 0),
        installmentSaleCheckPaidAmount: Number(summary.installmentSaleCheckPaidAmount || 0),
        installmentCustomerRemainingAmount: Number(summary.installmentCustomerRemainingAmount || 0),
        saleFileClosed: Number(summary.saleFileClosed || 0),
        saleTotalPrice: Number(summary.saleTotalPrice || 0),
      }
    : null;

  return {
    payments,
    page,
    pageSize,
    ...(includeMeta
      ? {
          total: Number(total || 0),
          totalPages: Math.max(1, Math.ceil(Number(total || 0) / pageSize)),
          summary: normalizedSummary,
        }
      : {}),
    metaIncluded: includeMeta,
  };
};

export const getSoldPhoneSettlementItemsFromPartnerDb = async (partnerId: number): Promise<any[]> =>
  getPurchasedItemsFromPartnerDb(partnerId, { includeProducts: false, includePhones: true, soldPhonesOnly: true });
