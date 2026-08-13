import { allAsync, getAsync } from "../db/query";

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

const INSTALLMENT_SALE_HAS_OPEN_RECEIVABLE_SQL = `(
  MAX(0,
    COALESCE(isale.actualSalePrice,0) - COALESCE(isale.downPayment,0)
    - COALESCE((
        SELECT SUM(it.amount_paid)
        FROM installment_payments ip
        JOIN installment_transactions it ON it.installment_payment_id = ip.id
        WHERE ip.saleId = isale.id
      ),0)
    - COALESCE((
        SELECT SUM(
          CASE
            WHEN TRIM(COALESCE(ic.status,'')) IN ('نقد شد','نقدشده','وصول شده','پاس شده','تسویه شده','پرداخت شده','تکمیل شده','paid','Paid','cashed','Cashed')
            THEN MAX(0, COALESCE(ic.amount,0) - COALESCE((
              SELECT SUM(it.amount_paid)
              FROM installment_payments rp
              JOIN installment_transactions it ON it.installment_payment_id = rp.id
              WHERE rp.sourceType = 'check_recovery' AND rp.sourceId = ic.id
            ),0))
            ELSE 0
          END
        )
        FROM installment_checks ic
        WHERE ic.saleId = isale.id
      ),0)
  ) > 0.00001
)`;

export const getAllPartnersWithBalanceFromDb = async (
  partnerType?: string,
  partnerIds: number[] = [],
): Promise<any[]> => {
  let sql = `
    SELECT
      p.*,
      COALESCE((
        SELECT SUM(COALESCE(l.credit, 0) - COALESCE(l.debit, 0))
        FROM partner_ledger l
        WHERE l.partnerId = p.id
      ), 0) AS currentBalance,
      COALESCE((SELECT COUNT(*) FROM phones ph WHERE ph.supplierId = p.id), 0) AS totalPhonesSupplied,
      COALESCE((SELECT COUNT(*) FROM phones ph WHERE ph.supplierId = p.id AND ph.status IN ('فروخته شده', 'فروخته شده (قسطی)')), 0) AS phonesSoldCount,
      COALESCE((SELECT COUNT(*) FROM phones ph WHERE ph.supplierId = p.id AND ph.status = 'فروخته شده (قسطی)'), 0) AS phonesInstallmentSoldCount,
      COALESCE((
        SELECT COUNT(DISTINCT isale.id)
        FROM installment_sales isale
        JOIN installment_sale_items isi ON isi.saleId = isale.id AND isi.itemType = 'phone'
        JOIN phones ph ON ph.id = isi.itemId
        WHERE ph.supplierId = p.id
          AND COALESCE(isale.status,'active') = 'active'
          AND ${INSTALLMENT_SALE_HAS_OPEN_RECEIVABLE_SQL}
      ), 0) AS openInstallmentSalesCount,
      COALESCE((SELECT COUNT(*) FROM phones ph WHERE ph.supplierId = p.id AND ph.status IN ('موجود در انبار', 'مرجوعی', 'مرجوعی اقساطی')), 0) AS unsoldPhonesCount,
      COALESCE((SELECT SUM(COALESCE(pr.purchasePrice, 0) * COALESCE(pr.stock_quantity, 0)) FROM products pr WHERE pr.supplierId = p.id), 0) AS accessoriesPayableAmount,
      COALESCE((SELECT SUM(${SOLD_PHONE_DAILY_BUY_PRICE_SQL}) FROM phones ph WHERE ph.supplierId = p.id AND ph.status IN ('فروخته شده', 'فروخته شده (قسطی)')), 0) AS phoneSalesReceivableAmount,
      COALESCE((SELECT SUM(${SOLD_PHONE_DAILY_BUY_PRICE_SQL}) FROM phones ph WHERE ph.supplierId = p.id AND ph.status IN ('فروخته شده', 'فروخته شده (قسطی)')), 0) AS soldPhonesCurrentPurchaseAmount,
      COALESCE((SELECT SUM(COALESCE(ph.purchasePrice, 0)) FROM phones ph WHERE ph.supplierId = p.id AND ph.status IN ('فروخته شده', 'فروخته شده (قسطی)')), 0) AS soldPhonesInitialPurchaseAmount,
      COALESCE((
        SELECT SUM(COALESCE((
          SELECT SUM(COALESCE(l.debit, 0))
          FROM partner_ledger l
          WHERE l.partnerId = p.id
            AND l.referenceId = ph.id
            AND l.referenceType IN ${PHONE_SETTLEMENT_LEDGER_TYPES_SQL}
        ), 0))
        FROM phones ph
        WHERE ph.supplierId = p.id
          AND ph.status IN ('فروخته شده', 'فروخته شده (قسطی)')
      ), 0) AS soldPhonesProductSettlementPaidAmount,
      (
        COALESCE((SELECT SUM(${SOLD_PHONE_DAILY_BUY_PRICE_SQL}) FROM phones ph WHERE ph.supplierId = p.id AND ph.status IN ('فروخته شده', 'فروخته شده (قسطی)')), 0)
        - COALESCE((
          SELECT SUM(COALESCE((
            SELECT SUM(COALESCE(l.debit, 0))
            FROM partner_ledger l
            WHERE l.partnerId = p.id
              AND l.referenceId = ph.id
              AND l.referenceType IN ${PHONE_SETTLEMENT_LEDGER_TYPES_SQL}
          ), 0))
          FROM phones ph
          WHERE ph.supplierId = p.id
            AND ph.status IN ('فروخته شده', 'فروخته شده (قسطی)')
        ), 0)
      ) AS soldPhonesProductSettlementBalance,
      (
        COALESCE((SELECT SUM(COALESCE(l.debit, 0)) FROM partner_ledger l WHERE l.partnerId = p.id), 0)
        - COALESCE((
          SELECT SUM(COALESCE((
            SELECT SUM(COALESCE(l.debit, 0))
            FROM partner_ledger l
            WHERE l.partnerId = p.id
              AND l.referenceId = ph.id
              AND l.referenceType IN ${PHONE_SETTLEMENT_LEDGER_TYPES_SQL}
          ), 0))
          FROM phones ph
          WHERE ph.supplierId = p.id
            AND ph.status IN ('فروخته شده', 'فروخته شده (قسطی)')
        ), 0)
      ) AS unallocatedPartnerPaymentAmount,
      (
        COALESCE((SELECT SUM(${SOLD_PHONE_DAILY_BUY_PRICE_SQL}) FROM phones ph WHERE ph.supplierId = p.id AND ph.status IN ('فروخته شده', 'فروخته شده (قسطی)')), 0)
        - COALESCE((SELECT SUM(COALESCE(l.debit, 0)) FROM partner_ledger l WHERE l.partnerId = p.id), 0)
      ) AS soldPhonesCurrentPurchaseBalance,
      CASE WHEN COALESCE((SELECT SUM(COALESCE(l.credit, 0) - COALESCE(l.debit, 0)) FROM partner_ledger l WHERE l.partnerId = p.id), 0) > 0
        THEN COALESCE((SELECT SUM(COALESCE(l.credit, 0) - COALESCE(l.debit, 0)) FROM partner_ledger l WHERE l.partnerId = p.id), 0)
        ELSE 0
      END AS totalReceivableAmount,
      COALESCE((SELECT SUM(COALESCE(NULLIF(ph.currentPurchasePrice, 0), ph.purchasePrice, 0)) FROM phones ph WHERE ph.supplierId = p.id AND ph.status IN ('موجود در انبار', 'مرجوعی', 'مرجوعی اقساطی')), 0) AS unsoldPhonesInventoryAmount,
      COALESCE((SELECT SUM(COALESCE(pr.purchasePrice, 0) * COALESCE(pr.stock_quantity, 0)) FROM products pr WHERE pr.supplierId = p.id AND COALESCE(pr.stock_quantity, 0) > 0), 0) AS unsoldAccessoriesInventoryAmount,
      COALESCE((SELECT SUM(${SOLD_PHONE_DAILY_BUY_PRICE_SQL} - COALESCE(ph.purchasePrice, 0)) FROM phones ph WHERE ph.supplierId = p.id AND ph.status IN ('فروخته شده', 'فروخته شده (قسطی)')), 0) AS soldPhoneCurrentDeltaAmount,
      (
        COALESCE((SELECT SUM(COALESCE(l.credit, 0) - COALESCE(l.debit, 0)) FROM partner_ledger l WHERE l.partnerId = p.id), 0)
        + COALESCE((SELECT SUM(${SOLD_PHONE_DAILY_BUY_PRICE_SQL} - COALESCE(ph.purchasePrice, 0)) FROM phones ph WHERE ph.supplierId = p.id AND ph.status IN ('فروخته شده', 'فروخته شده (قسطی)')), 0)
        - COALESCE((SELECT SUM(COALESCE(NULLIF(ph.currentPurchasePrice, 0), ph.purchasePrice, 0)) FROM phones ph WHERE ph.supplierId = p.id AND ph.status IN ('موجود در انبار', 'مرجوعی', 'مرجوعی اقساطی')), 0)
        - COALESCE((SELECT SUM(COALESCE(pr.purchasePrice, 0) * COALESCE(pr.stock_quantity, 0)) FROM products pr WHERE pr.supplierId = p.id AND COALESCE(pr.stock_quantity, 0) > 0), 0)
      ) AS realizedCollectedBalance
    FROM partners p
  `;
  const params: any[] = [];
  const conditions: string[] = [];
  if (partnerType) {
    conditions.push("p.partnerType = ?");
    params.push(partnerType);
  }
  const safePartnerIds = [...new Set((partnerIds || []).map(Number).filter((id) => Number.isInteger(id) && id > 0))].slice(0, 100);
  if (safePartnerIds.length) {
    conditions.push(`p.id IN (${safePartnerIds.map(() => "?").join(",")})`);
    params.push(...safePartnerIds);
  }
  if (conditions.length) sql += ` WHERE ${conditions.join(" AND ")}`;
  sql += " ORDER BY p.partnerName ASC";

  return await allAsync(sql, params);
};


export type PartnerReadDependencies = {
  normalizePhonePurchaseLedgers?: (force?: boolean) => Promise<any>;
};

export const getPartnerByIdFromDb = async (
  partnerId: number,
  deps: PartnerReadDependencies = {},
): Promise<any> => {
  await deps.normalizePhonePurchaseLedgers?.(true).catch((e) => {
    console.error(
      "Phone purchase ledger normalization failed while loading partner:",
      e?.message || e,
    );
  });
  return await getAsync(
    `
    SELECT
      p.*,
      COALESCE((
        SELECT SUM(COALESCE(l.credit, 0) - COALESCE(l.debit, 0))
        FROM partner_ledger l
        WHERE l.partnerId = p.id
      ), 0) AS currentBalance,
      COALESCE((SELECT COUNT(*) FROM phones ph WHERE ph.supplierId = p.id), 0) AS totalPhonesSupplied,
      COALESCE((SELECT COUNT(*) FROM phones ph WHERE ph.supplierId = p.id AND ph.status IN ('فروخته شده', 'فروخته شده (قسطی)')), 0) AS phonesSoldCount,
      COALESCE((SELECT COUNT(*) FROM phones ph WHERE ph.supplierId = p.id AND ph.status = 'فروخته شده (قسطی)'), 0) AS phonesInstallmentSoldCount,
      COALESCE((
        SELECT COUNT(DISTINCT isale.id)
        FROM installment_sales isale
        JOIN installment_sale_items isi ON isi.saleId = isale.id AND isi.itemType = 'phone'
        JOIN phones ph ON ph.id = isi.itemId
        WHERE ph.supplierId = p.id
          AND COALESCE(isale.status,'active') = 'active'
          AND ${INSTALLMENT_SALE_HAS_OPEN_RECEIVABLE_SQL}
      ), 0) AS openInstallmentSalesCount,
      COALESCE((SELECT COUNT(*) FROM phones ph WHERE ph.supplierId = p.id AND ph.status IN ('موجود در انبار', 'مرجوعی', 'مرجوعی اقساطی')), 0) AS unsoldPhonesCount,
      COALESCE((SELECT SUM(COALESCE(pr.purchasePrice, 0) * COALESCE(pr.stock_quantity, 0)) FROM products pr WHERE pr.supplierId = p.id), 0) AS accessoriesPayableAmount,
      COALESCE((SELECT SUM(${SOLD_PHONE_DAILY_BUY_PRICE_SQL}) FROM phones ph WHERE ph.supplierId = p.id AND ph.status IN ('فروخته شده', 'فروخته شده (قسطی)')), 0) AS phoneSalesReceivableAmount,
      COALESCE((SELECT SUM(${SOLD_PHONE_DAILY_BUY_PRICE_SQL}) FROM phones ph WHERE ph.supplierId = p.id AND ph.status IN ('فروخته شده', 'فروخته شده (قسطی)')), 0) AS soldPhonesCurrentPurchaseAmount,
      COALESCE((SELECT SUM(COALESCE(ph.purchasePrice, 0)) FROM phones ph WHERE ph.supplierId = p.id AND ph.status IN ('فروخته شده', 'فروخته شده (قسطی)')), 0) AS soldPhonesInitialPurchaseAmount,
      COALESCE((
        SELECT SUM(COALESCE((
          SELECT SUM(COALESCE(l.debit, 0))
          FROM partner_ledger l
          WHERE l.partnerId = p.id
            AND l.referenceId = ph.id
            AND l.referenceType IN ${PHONE_SETTLEMENT_LEDGER_TYPES_SQL}
        ), 0))
        FROM phones ph
        WHERE ph.supplierId = p.id
          AND ph.status IN ('فروخته شده', 'فروخته شده (قسطی)')
      ), 0) AS soldPhonesProductSettlementPaidAmount,
      (
        COALESCE((SELECT SUM(${SOLD_PHONE_DAILY_BUY_PRICE_SQL}) FROM phones ph WHERE ph.supplierId = p.id AND ph.status IN ('فروخته شده', 'فروخته شده (قسطی)')), 0)
        - COALESCE((
          SELECT SUM(COALESCE((
            SELECT SUM(COALESCE(l.debit, 0))
            FROM partner_ledger l
            WHERE l.partnerId = p.id
              AND l.referenceId = ph.id
              AND l.referenceType IN ${PHONE_SETTLEMENT_LEDGER_TYPES_SQL}
          ), 0))
          FROM phones ph
          WHERE ph.supplierId = p.id
            AND ph.status IN ('فروخته شده', 'فروخته شده (قسطی)')
        ), 0)
      ) AS soldPhonesProductSettlementBalance,
      (
        COALESCE((SELECT SUM(COALESCE(l.debit, 0)) FROM partner_ledger l WHERE l.partnerId = p.id), 0)
        - COALESCE((
          SELECT SUM(COALESCE((
            SELECT SUM(COALESCE(l.debit, 0))
            FROM partner_ledger l
            WHERE l.partnerId = p.id
              AND l.referenceId = ph.id
              AND l.referenceType IN ${PHONE_SETTLEMENT_LEDGER_TYPES_SQL}
          ), 0))
          FROM phones ph
          WHERE ph.supplierId = p.id
            AND ph.status IN ('فروخته شده', 'فروخته شده (قسطی)')
        ), 0)
      ) AS unallocatedPartnerPaymentAmount,
      (
        COALESCE((SELECT SUM(${SOLD_PHONE_DAILY_BUY_PRICE_SQL}) FROM phones ph WHERE ph.supplierId = p.id AND ph.status IN ('فروخته شده', 'فروخته شده (قسطی)')), 0)
        - COALESCE((SELECT SUM(COALESCE(l.debit, 0)) FROM partner_ledger l WHERE l.partnerId = p.id), 0)
      ) AS soldPhonesCurrentPurchaseBalance,
      CASE WHEN COALESCE((SELECT SUM(COALESCE(l.credit, 0) - COALESCE(l.debit, 0)) FROM partner_ledger l WHERE l.partnerId = p.id), 0) > 0
        THEN COALESCE((SELECT SUM(COALESCE(l.credit, 0) - COALESCE(l.debit, 0)) FROM partner_ledger l WHERE l.partnerId = p.id), 0)
        ELSE 0
      END AS totalReceivableAmount,
      COALESCE((SELECT SUM(COALESCE(NULLIF(ph.currentPurchasePrice, 0), ph.purchasePrice, 0)) FROM phones ph WHERE ph.supplierId = p.id AND ph.status IN ('موجود در انبار', 'مرجوعی', 'مرجوعی اقساطی')), 0) AS unsoldPhonesInventoryAmount,
      COALESCE((SELECT SUM(COALESCE(pr.purchasePrice, 0) * COALESCE(pr.stock_quantity, 0)) FROM products pr WHERE pr.supplierId = p.id AND COALESCE(pr.stock_quantity, 0) > 0), 0) AS unsoldAccessoriesInventoryAmount,
      COALESCE((SELECT SUM(${SOLD_PHONE_DAILY_BUY_PRICE_SQL} - COALESCE(ph.purchasePrice, 0)) FROM phones ph WHERE ph.supplierId = p.id AND ph.status IN ('فروخته شده', 'فروخته شده (قسطی)')), 0) AS soldPhoneCurrentDeltaAmount,
      (
        COALESCE((SELECT SUM(COALESCE(l.credit, 0) - COALESCE(l.debit, 0)) FROM partner_ledger l WHERE l.partnerId = p.id), 0)
        + COALESCE((SELECT SUM(${SOLD_PHONE_DAILY_BUY_PRICE_SQL} - COALESCE(ph.purchasePrice, 0)) FROM phones ph WHERE ph.supplierId = p.id AND ph.status IN ('فروخته شده', 'فروخته شده (قسطی)')), 0)
        - COALESCE((SELECT SUM(COALESCE(NULLIF(ph.currentPurchasePrice, 0), ph.purchasePrice, 0)) FROM phones ph WHERE ph.supplierId = p.id AND ph.status IN ('موجود در انبار', 'مرجوعی', 'مرجوعی اقساطی')), 0)
        - COALESCE((SELECT SUM(COALESCE(pr.purchasePrice, 0) * COALESCE(pr.stock_quantity, 0)) FROM products pr WHERE pr.supplierId = p.id AND COALESCE(pr.stock_quantity, 0) > 0), 0)
      ) AS realizedCollectedBalance
    FROM partners p
    WHERE p.id = ?
  `,
    [partnerId],
  );
};


export type PartnerDirectoryQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  balance?: "all" | "debt" | "credit" | "settled";
  sort?: "name" | "balanceDesc" | "balanceAsc" | "recent";
  includeSummary?: boolean;
};

export type PartnerDirectoryResult = {
  items: any[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  summary?: Record<string, number>;
};

const normalizePartnerDirectorySearch = (value: unknown) => String(value ?? "")
  .normalize("NFKC")
  .replace(/ي/g, "ی")
  .replace(/ك/g, "ک")
  .replace(/\s+/g, " ")
  .trim();

const getPartnerTypeMatchesForSearch = (search: string): string[] => {
  const value = normalizePartnerDirectorySearch(search).toLowerCase();
  if (!value) return [];
  const aliases: Array<{ type: string; labels: string[] }> = [
    { type: "Supplier", labels: ["supplier", "تامین کننده", "تأمین کننده", "تامین‌کننده", "تأمین‌کننده", "تامین", "تأمین"] },
    { type: "Service Provider", labels: ["service provider", "ارائه دهنده خدمات", "ارائه‌دهنده خدمات", "خدمات"] },
    { type: "Technician", labels: ["technician", "تعمیرکار", "تکنسین"] },
    { type: "Other", labels: ["other", "سایر", "دیگر"] },
  ];
  return aliases
    .filter(({ type, labels }) => normalizePartnerDirectorySearch(type).toLowerCase().includes(value) || labels.some((label) => normalizePartnerDirectorySearch(label).toLowerCase().includes(value) || value.includes(normalizePartnerDirectorySearch(label).toLowerCase())))
    .map(({ type }) => type);
};

const getPartnerDirectorySummaryFromDb = async () => {
  const balanceRow = await getAsync(`
    WITH ledger AS (
      SELECT partnerId, SUM(COALESCE(credit,0) - COALESCE(debit,0)) AS balance
      FROM partner_ledger
      GROUP BY partnerId
    )
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN COALESCE(l.balance,0) > 0 THEN 1 ELSE 0 END) AS debtors,
      SUM(CASE WHEN COALESCE(l.balance,0) < 0 THEN 1 ELSE 0 END) AS creditors,
      SUM(CASE WHEN COALESCE(l.balance,0) = 0 THEN 1 ELSE 0 END) AS settled,
      SUM(CASE WHEN COALESCE(l.balance,0) > 0 THEN COALESCE(l.balance,0) ELSE 0 END) AS totalDebt,
      SUM(CASE WHEN COALESCE(l.balance,0) < 0 THEN ABS(COALESCE(l.balance,0)) ELSE 0 END) AS totalCredit,
      SUM(CASE WHEN COALESCE(l.balance,0) > 0 THEN COALESCE(l.balance,0) ELSE 0 END) AS totalReceivableAmount
    FROM partners p
    LEFT JOIN ledger l ON l.partnerId = p.id
  `);
  const phoneRow = await getAsync(`
    SELECT
      COUNT(*) AS totalPhonesSupplied,
      SUM(CASE WHEN ph.status IN ('فروخته شده','فروخته شده (قسطی)') THEN 1 ELSE 0 END) AS phonesSoldCount,
      SUM(CASE WHEN ph.status = 'فروخته شده (قسطی)' THEN 1 ELSE 0 END) AS phonesInstallmentSoldCount,
      SUM(CASE WHEN ph.status IN ('موجود در انبار','مرجوعی','مرجوعی اقساطی') THEN 1 ELSE 0 END) AS unsoldPhonesCount,
      SUM(CASE WHEN ph.status IN ('فروخته شده','فروخته شده (قسطی)') THEN ${SOLD_PHONE_DAILY_BUY_PRICE_SQL} ELSE 0 END) AS phoneSalesReceivableAmount
    FROM phones ph
  `);
  const accessoriesRow = await getAsync(`
    SELECT SUM(COALESCE(purchasePrice,0) * COALESCE(stock_quantity,0)) AS accessoriesPayableAmount
    FROM products
  `);
  const openInstallmentsRow = await getAsync(`
    SELECT COUNT(DISTINCT isale.id) AS openInstallmentSalesCount
    FROM installment_sales isale
    JOIN installment_sale_items isi ON isi.saleId = isale.id AND isi.itemType = 'phone'
    JOIN phones ph ON ph.id = isi.itemId
    WHERE COALESCE(isale.status,'active') = 'active'
      AND ${INSTALLMENT_SALE_HAS_OPEN_RECEIVABLE_SQL}
  `);
  return {
    total: Math.max(0, Number(balanceRow?.total || 0)),
    debtors: Math.max(0, Number(balanceRow?.debtors || 0)),
    creditors: Math.max(0, Number(balanceRow?.creditors || 0)),
    settled: Math.max(0, Number(balanceRow?.settled || 0)),
    totalDebt: Math.max(0, Number(balanceRow?.totalDebt || 0)),
    totalCredit: Math.max(0, Number(balanceRow?.totalCredit || 0)),
    totalReceivableAmount: Math.max(0, Number(balanceRow?.totalReceivableAmount || 0)),
    totalPhonesSupplied: Math.max(0, Number(phoneRow?.totalPhonesSupplied || 0)),
    phonesSoldCount: Math.max(0, Number(phoneRow?.phonesSoldCount || 0)),
    phonesInstallmentSoldCount: Math.max(0, Number(phoneRow?.phonesInstallmentSoldCount || 0)),
    unsoldPhonesCount: Math.max(0, Number(phoneRow?.unsoldPhonesCount || 0)),
    phoneSalesReceivableAmount: Math.max(0, Number(phoneRow?.phoneSalesReceivableAmount || 0)),
    accessoriesPayableAmount: Math.max(0, Number(accessoriesRow?.accessoriesPayableAmount || 0)),
    openInstallmentSalesCount: Math.max(0, Number(openInstallmentsRow?.openInstallmentSalesCount || 0)),
  };
};

export const listPartnersDirectoryFromDb = async (query: PartnerDirectoryQuery = {}): Promise<PartnerDirectoryResult> => {
  const page = Math.max(1, Math.floor(Number(query.page || 1)));
  const pageSize = Math.min(100, Math.max(10, Math.floor(Number(query.pageSize || 25))));
  const search = normalizePartnerDirectorySearch(query.search);
  const balance = ["debt","credit","settled"].includes(String(query.balance || "")) ? String(query.balance) : "all";
  const sort = ["balanceDesc","balanceAsc","recent"].includes(String(query.sort || "")) ? String(query.sort) : "name";
  const offset = (page - 1) * pageSize;
  const conditions: string[] = [];
  const params: Array<string | number> = [];
  if (search) {
    const normalizedName = "REPLACE(REPLACE(COALESCE(p.partnerName,''),'ي','ی'),'ك','ک')";
    const normalizedContact = "REPLACE(REPLACE(COALESCE(p.contactPerson,''),'ي','ی'),'ك','ک')";
    const pattern = `%${search}%`;
    const typeMatches = getPartnerTypeMatchesForSearch(search);
    const typeClause = typeMatches.length ? ` OR p.partnerType IN (${typeMatches.map(() => "?").join(",")})` : "";
    conditions.push(`(${normalizedName} LIKE ? COLLATE NOCASE OR COALESCE(p.phoneNumber,'') LIKE ? OR ${normalizedContact} LIKE ? COLLATE NOCASE OR COALESCE(p.partnerType,'') LIKE ? COLLATE NOCASE${typeClause})`);
    params.push(pattern, pattern, pattern, pattern, ...typeMatches);
  }
  const needsBalance = balance !== "all" || sort === "balanceDesc" || sort === "balanceAsc";
  const ledgerCte = needsBalance ? `WITH ledger AS (SELECT partnerId, SUM(COALESCE(credit,0)-COALESCE(debit,0)) AS currentBalance FROM partner_ledger GROUP BY partnerId)` : "";
  if (balance === "debt") conditions.push("COALESCE(l.currentBalance,0) > 0");
  if (balance === "credit") conditions.push("COALESCE(l.currentBalance,0) < 0");
  if (balance === "settled") conditions.push("COALESCE(l.currentBalance,0) = 0");
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const joinLedger = needsBalance ? "LEFT JOIN ledger l ON l.partnerId = p.id" : "";
  const order = sort === "balanceDesc"
    ? "ABS(COALESCE(l.currentBalance,0)) DESC, p.partnerName COLLATE NOCASE ASC, p.id ASC"
    : sort === "balanceAsc"
      ? "ABS(COALESCE(l.currentBalance,0)) ASC, p.partnerName COLLATE NOCASE ASC, p.id ASC"
      : sort === "recent"
        ? "p.id DESC"
        : "p.partnerName COLLATE NOCASE ASC, p.id ASC";
  const countRow = await getAsync(`${ledgerCte} SELECT COUNT(*) AS total FROM partners p ${joinLedger} ${where}`, params);
  const total = Math.max(0, Number(countRow?.total || 0));
  const idRows = await allAsync(`${ledgerCte} SELECT p.id FROM partners p ${joinLedger} ${where} ORDER BY ${order} LIMIT ? OFFSET ?`, [...params, pageSize, offset]);
  const ids = (idRows || []).map((row: any) => Number(row.id)).filter((id: number) => id > 0);
  let items = await getAllPartnersWithBalanceFromDb(undefined, ids);
  const orderIndex = new Map(ids.map((id, index) => [id, index]));
  items = items.sort((a, b) => (orderIndex.get(Number(a.id)) ?? Number.MAX_SAFE_INTEGER) - (orderIndex.get(Number(b.id)) ?? Number.MAX_SAFE_INTEGER));
  return {
    items,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    ...(query.includeSummary ? { summary: await getPartnerDirectorySummaryFromDb() } : {}),
  };
};
