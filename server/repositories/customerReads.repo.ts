import moment from "jalali-moment";
import { allAsync, getAsync } from "../db/query";


export type CustomerDirectoryBalanceFilter = "" | "all" | "debt" | "credit" | "settled";
export type CustomerDirectorySort = "name" | "balanceDesc" | "balanceAsc" | "recent";

export type CustomerDirectoryQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  tag?: string;
  balance?: CustomerDirectoryBalanceFilter;
  sort?: CustomerDirectorySort;
  risk?: "" | "all" | "risky";
  includeSummary?: boolean;
};

export type CustomerDirectorySummary = {
  total: number;
  debtors: number;
  creditors: number;
  settled: number;
  totalDebt: number;
  totalCredit: number;
  followupCount: number;
  activeCommitments: number;
  riskCount: number;
  availableTags: string[];
};

export type CustomerDirectoryResult = {
  items: any[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  summary?: CustomerDirectorySummary;
};

export type CustomerSearchFilters = {
  q?: string;
  limit?: number;
  id?: number;
  offset?: number;
};

const normalizeCustomerSearchQuery = (value: unknown): string => String(value ?? "")
  .normalize("NFKC")
  .replace(/[۰-۹]/g, (digit) => "0123456789"["۰۱۲۳۴۵۶۷۸۹".indexOf(digit)] || digit)
  .replace(/[٠-٩]/g, (digit) => "0123456789"["٠١٢٣٤٥٦٧٨٩".indexOf(digit)] || digit)
  .replace(/[أإآ]/g, "ا")
  .replace(/ي/g, "ی")
  .replace(/ك/g, "ک")
  .replace(/[\u200c\u200d]/g, " ")
  .replace(/\s+/g, " ")
  .trim();

export const searchCustomersWithBalanceFromDb = async (
  filters: CustomerSearchFilters = {},
): Promise<any[]> => {
  const safeLimit = Math.min(120, Math.max(1, Number(filters.limit) || 60));
  const safeOffset = Math.max(0, Number(filters.offset) || 0);
  const id = Number(filters.id || 0);
  const q = normalizeCustomerSearchQuery(filters.q);
  const conditions: string[] = [];
  const params: Array<string | number> = [];

  if (id > 0) {
    conditions.push("c.id = ?");
    params.push(id);
  } else if (q) {
    const prefixLike = `${q}%`;
    const containsLike = `%${q}%`;
    const normalizedName = "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(c.fullName, 'ي', 'ی'), 'ك', 'ک'), 'أ', 'ا'), 'إ', 'ا'), 'آ', 'ا')";
    conditions.push(`(${normalizedName} LIKE ? COLLATE NOCASE OR COALESCE(c.phoneNumber, '') LIKE ? OR CAST(c.id AS TEXT) LIKE ?)`);
    params.push(prefixLike, containsLike, containsLike);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  return await allAsync(`
    SELECT
      c.id, c.fullName, c.phoneNumber, c.address, c.notes,
      COALESCE(c.telegram_chat_id, c.telegramChatId) AS telegramChatId,
      c.telegram_user_id, c.telegram_linked_at, c.dateAdded,
      COALESCE((
        SELECT SUM(COALESCE(l.debit, 0) - COALESCE(l.credit, 0))
        FROM customer_ledger l
        WHERE l.customerId = c.id
      ), 0) AS currentBalance
    FROM customers c
    ${where}
    ORDER BY c.fullName COLLATE NOCASE ASC, c.id ASC
    LIMIT ? OFFSET ?
  `, [...params, safeLimit, safeOffset]);
};

export const getAllCustomersWithBalanceFromDb = async (): Promise<any[]> => {
  return await allAsync(`
    SELECT
      c.*,
      COALESCE((
        SELECT SUM(COALESCE(l.debit, 0) - COALESCE(l.credit, 0))
        FROM customer_ledger l
        WHERE l.customerId = c.id
      ), 0) AS currentBalance,
      COALESCE((SELECT COUNT(*) FROM customer_ledger l WHERE l.customerId = c.id), 0) AS ledgerEntryCount,
      COALESCE((SELECT COUNT(*) FROM customer_followups f WHERE f.customerId = c.id AND COALESCE(f.status, 'open') = 'open'), 0) AS openFollowupCount,
      COALESCE((SELECT COUNT(*) FROM sales_orders so WHERE so.customerId = c.id AND COALESCE(so.status, 'active') <> 'canceled'), 0) AS salesOrderCount,
      COALESCE((SELECT COUNT(*) FROM installment_sales ins WHERE ins.customerId = c.id), 0) AS installmentSaleCount,
      COALESCE((SELECT COUNT(*) FROM repairs r WHERE r.customerId = c.id), 0) AS repairCount,
      MAX(
        c.dateAdded,
        COALESCE((SELECT MAX(COALESCE(l.updatedAt, l.createdAt, l.transactionDate)) FROM customer_ledger l WHERE l.customerId = c.id), c.dateAdded),
        COALESCE((SELECT MAX(so.transactionDate) FROM sales_orders so WHERE so.customerId = c.id), c.dateAdded),
        COALESCE((SELECT MAX(COALESCE(ins.saleDateISO, ins.dateCreated)) FROM installment_sales ins WHERE ins.customerId = c.id), c.dateAdded),
        COALESCE((SELECT MAX(COALESCE(r.dateCompleted, r.dateReceived)) FROM repairs r WHERE r.customerId = c.id), c.dateAdded),
        COALESCE((SELECT MAX(f.createdAt) FROM customer_followups f WHERE f.customerId = c.id), c.dateAdded)
      ) AS lastActivityAt
    FROM customers c
    ORDER BY c.fullName COLLATE NOCASE ASC, c.id ASC
  `);
};

export const getCustomerDeleteDependenciesFromDb = async (
  customerId: number,
): Promise<Record<string, number>> => {
  const row = await getAsync(
    `SELECT
      (SELECT COUNT(*) FROM customer_ledger WHERE customerId = ?) AS ledgerEntries,
      (SELECT COUNT(*) FROM installment_sales WHERE customerId = ?) AS installmentSales,
      (SELECT COUNT(*) FROM repairs WHERE customerId = ?) AS repairs,
      (SELECT COUNT(*) FROM sales_orders WHERE customerId = ?) AS salesOrders,
      (SELECT COUNT(*) FROM sales_transactions WHERE customerId = ?) AS salesTransactions,
      (SELECT COUNT(*) FROM sales_returns WHERE customerId = ?) AS salesReturns,
      (SELECT COUNT(*) FROM invoices WHERE customerId = ?) AS invoices,
      (SELECT COUNT(*) FROM customer_followups WHERE customerId = ?) AS followups,
      (SELECT COUNT(*) FROM customer_manager_notes WHERE customerId = ?) AS managerNotes,
      (SELECT COUNT(*) FROM telegram_link_tokens WHERE customer_id = ?) AS telegramLinkTokens,
      (SELECT COUNT(*) FROM reminder_daily_cap WHERE customerId = ?) AS reminderCaps,
      (SELECT COUNT(*) FROM notification_outbox WHERE capCustomerId = ?) AS notificationOutbox,
      (SELECT COUNT(*) FROM customer_scores WHERE customerId = ?) AS customerScores`,
    [
      customerId, customerId, customerId, customerId, customerId, customerId,
      customerId, customerId, customerId, customerId, customerId, customerId,
      customerId,
    ],
  );
  return {
    ledgerEntries: Number(row?.ledgerEntries || 0),
    installmentSales: Number(row?.installmentSales || 0),
    repairs: Number(row?.repairs || 0),
    salesOrders: Number(row?.salesOrders || 0),
    salesTransactions: Number(row?.salesTransactions || 0),
    salesReturns: Number(row?.salesReturns || 0),
    invoices: Number(row?.invoices || 0),
    followups: Number(row?.followups || 0),
    managerNotes: Number(row?.managerNotes || 0),
    telegramLinkTokens: Number(row?.telegramLinkTokens || 0),
    reminderCaps: Number(row?.reminderCaps || 0),
    notificationOutbox: Number(row?.notificationOutbox || 0),
    customerScores: Number(row?.customerScores || 0),
  };
};

export const getCustomerByIdFromDb = async (
  customerId: number,
): Promise<any> => {
  const customer = await getAsync(
    `
    SELECT
      c.*,
      COALESCE((
        SELECT SUM(COALESCE(l.debit, 0) - COALESCE(l.credit, 0))
        FROM customer_ledger l
        WHERE l.customerId = c.id
      ), 0) AS currentBalance
    FROM customers c
    WHERE c.id = ?
  `,
    [customerId],
  );
  return customer;
};


const CUSTOMER_DIRECTORY_SORTS: Record<CustomerDirectorySort, string> = {
  name: "fullName COLLATE NOCASE ASC, id ASC",
  balanceDesc: "ABS(currentBalance) DESC, fullName COLLATE NOCASE ASC, id ASC",
  balanceAsc: "ABS(currentBalance) ASC, fullName COLLATE NOCASE ASC, id ASC",
  recent: "COALESCE(lastActivityAt, dateAdded, '') DESC, id DESC",
};

const normalizeDirectoryTag = (value: unknown): string => String(value ?? "").normalize("NFKC").trim();

const parseStoredTags = (raw: unknown): string[] => {
  if (Array.isArray(raw)) return raw.map(String).map((value) => value.trim()).filter(Boolean);
  const text = String(raw ?? "").trim();
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed.map(String).map((value) => value.trim()).filter(Boolean);
  } catch {}
  return text.split(",").map((value) => value.trim()).filter(Boolean);
};

const buildCustomerDirectoryBaseFilter = (search: string, tag: string) => {
  const conditions: string[] = [];
  const params: Array<string | number> = [];
  if (search) {
    const normalizedName = "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(c.fullName, 'ي', 'ی'), 'ك', 'ک'), 'أ', 'ا'), 'إ', 'ا'), 'آ', 'ا')";
    const contains = `%${search}%`;
    conditions.push(`(${normalizedName} LIKE ? COLLATE NOCASE OR COALESCE(c.phoneNumber,'') LIKE ? OR CAST(c.id AS TEXT) LIKE ?)`);
    params.push(contains, contains, contains);
  }
  if (tag) {
    conditions.push("COALESCE(c.tags,'') LIKE ?");
    params.push(`%${tag}%`);
  }
  return { conditions, params };
};

const getCustomerDirectorySummaryFromDb = async (): Promise<CustomerDirectorySummary> => {
  const row = await getAsync(`
    WITH ledger AS (
      SELECT customerId, SUM(COALESCE(debit,0) - COALESCE(credit,0)) AS balance
      FROM customer_ledger
      GROUP BY customerId
    ), followups AS (
      SELECT customerId, COUNT(*) AS openCount
      FROM customer_followups
      WHERE COALESCE(status,'open') = 'open'
      GROUP BY customerId
    ), installments AS (
      SELECT customerId, COUNT(*) AS saleCount
      FROM installment_sales
      GROUP BY customerId
    )
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN COALESCE(l.balance,0) > 0 THEN 1 ELSE 0 END) AS debtors,
      SUM(CASE WHEN COALESCE(l.balance,0) < 0 THEN 1 ELSE 0 END) AS creditors,
      SUM(CASE WHEN COALESCE(l.balance,0) = 0 THEN 1 ELSE 0 END) AS settled,
      SUM(CASE WHEN COALESCE(l.balance,0) > 0 THEN COALESCE(l.balance,0) ELSE 0 END) AS totalDebt,
      SUM(CASE WHEN COALESCE(l.balance,0) < 0 THEN ABS(COALESCE(l.balance,0)) ELSE 0 END) AS totalCredit,
      SUM(CASE WHEN COALESCE(f.openCount,0) > 0 THEN 1 ELSE 0 END) AS followupCount,
      SUM(COALESCE(i.saleCount,0)) AS activeCommitments,
      SUM(CASE WHEN
        EXISTS (
          SELECT 1 FROM installment_checks ic
          JOIN installment_sales ris ON ris.id = ic.saleId
          WHERE ris.customerId = c.id
            AND COALESCE(ris.status,'active') = 'active'
            AND (LOWER(COALESCE(ic.status,'')) LIKE '%return%' OR COALESCE(ic.status,'') LIKE '%برگشت%')
        )
        OR EXISTS (
          SELECT 1 FROM installment_payments ip
          JOIN installment_sales ris ON ris.id = ip.saleId
          WHERE ris.customerId = c.id
            AND COALESCE(ris.status,'active') = 'active'
            AND COALESCE(ip.dueDate,'') <> ''
            AND COALESCE(ip.dueDate,'') < ?
            AND NOT (LOWER(COALESCE(ip.status,'')) LIKE '%paid%' OR COALESCE(ip.status,'') LIKE '%پرداخت%' OR COALESCE(ip.status,'') LIKE '%تسویه%')
        )
        THEN 1 ELSE 0 END) AS riskCount
    FROM customers c
    LEFT JOIN ledger l ON l.customerId = c.id
    LEFT JOIN followups f ON f.customerId = c.id
    LEFT JOIN installments i ON i.customerId = c.id
  `, [moment().locale("en").format("jYYYY/jMM/jDD")]);
  const tagRows = await allAsync("SELECT tags FROM customers WHERE COALESCE(tags,'') <> ''");
  const tagSet = new Set<string>();
  for (const item of tagRows || []) parseStoredTags(item?.tags).forEach((tag) => tagSet.add(tag));
  return {
    total: Math.max(0, Number(row?.total || 0)),
    debtors: Math.max(0, Number(row?.debtors || 0)),
    creditors: Math.max(0, Number(row?.creditors || 0)),
    settled: Math.max(0, Number(row?.settled || 0)),
    totalDebt: Math.max(0, Number(row?.totalDebt || 0)),
    totalCredit: Math.max(0, Number(row?.totalCredit || 0)),
    followupCount: Math.max(0, Number(row?.followupCount || 0)),
    activeCommitments: Math.max(0, Number(row?.activeCommitments || 0)),
    riskCount: Math.max(0, Number(row?.riskCount || 0)),
    availableTags: Array.from(tagSet).sort((a, b) => a.localeCompare(b, "fa")),
  };
};

const getCustomerDirectoryRowsByIds = async (ids: number[], sort: CustomerDirectorySort): Promise<any[]> => {
  if (!ids.length) return [];
  const placeholders = ids.map(() => "?").join(",");
  return await allAsync(`
    WITH scoped AS (SELECT id FROM customers WHERE id IN (${placeholders})),
    ledger AS (
      SELECT customerId,
             SUM(COALESCE(debit,0) - COALESCE(credit,0)) AS currentBalance,
             COUNT(*) AS ledgerEntryCount,
             MAX(COALESCE(updatedAt, createdAt, transactionDate)) AS lastLedgerAt
      FROM customer_ledger
      WHERE customerId IN (${placeholders})
      GROUP BY customerId
    ), followups AS (
      SELECT customerId,
             SUM(CASE WHEN COALESCE(status,'open') = 'open' THEN 1 ELSE 0 END) AS openFollowupCount,
             MAX(createdAt) AS lastFollowupAt
      FROM customer_followups
      WHERE customerId IN (${placeholders})
      GROUP BY customerId
    ), sales AS (
      SELECT customerId,
             SUM(CASE WHEN COALESCE(status,'active') <> 'canceled' THEN 1 ELSE 0 END) AS salesOrderCount,
             MAX(transactionDate) AS lastSaleAt
      FROM sales_orders
      WHERE customerId IN (${placeholders})
      GROUP BY customerId
    ), installments AS (
      SELECT customerId, COUNT(*) AS installmentSaleCount, MAX(COALESCE(saleDateISO, dateCreated)) AS lastInstallmentAt
      FROM installment_sales
      WHERE customerId IN (${placeholders})
      GROUP BY customerId
    ), repairs_agg AS (
      SELECT customerId, COUNT(*) AS repairCount, MAX(COALESCE(dateCompleted, dateReceived)) AS lastRepairAt
      FROM repairs
      WHERE customerId IN (${placeholders})
      GROUP BY customerId
    )
    SELECT c.*,
           COALESCE(l.currentBalance,0) AS currentBalance,
           COALESCE(l.ledgerEntryCount,0) AS ledgerEntryCount,
           COALESCE(f.openFollowupCount,0) AS openFollowupCount,
           COALESCE(s.salesOrderCount,0) AS salesOrderCount,
           COALESCE(i.installmentSaleCount,0) AS installmentSaleCount,
           COALESCE(r.repairCount,0) AS repairCount,
           MAX(
             COALESCE(c.dateAdded,''),
             COALESCE(l.lastLedgerAt,''),
             COALESCE(s.lastSaleAt,''),
             COALESCE(i.lastInstallmentAt,''),
             COALESCE(r.lastRepairAt,''),
             COALESCE(f.lastFollowupAt,'')
           ) AS lastActivityAt
    FROM customers c
    JOIN scoped sc ON sc.id = c.id
    LEFT JOIN ledger l ON l.customerId = c.id
    LEFT JOIN followups f ON f.customerId = c.id
    LEFT JOIN sales s ON s.customerId = c.id
    LEFT JOIN installments i ON i.customerId = c.id
    LEFT JOIN repairs_agg r ON r.customerId = c.id
    ORDER BY ${CUSTOMER_DIRECTORY_SORTS[sort]}
  `, [...ids, ...ids, ...ids, ...ids, ...ids, ...ids]);
};

export const listCustomersDirectoryFromDb = async (
  query: CustomerDirectoryQuery = {},
): Promise<CustomerDirectoryResult> => {
  const page = Math.max(1, Math.floor(Number(query.page || 1)));
  const pageSize = Math.min(100, Math.max(10, Math.floor(Number(query.pageSize || 25))));
  const search = normalizeCustomerSearchQuery(query.search);
  const tag = normalizeDirectoryTag(query.tag);
  const balance: CustomerDirectoryBalanceFilter = ["debt","credit","settled"].includes(String(query.balance || ""))
    ? String(query.balance) as CustomerDirectoryBalanceFilter
    : "all";
  const sort: CustomerDirectorySort = Object.prototype.hasOwnProperty.call(CUSTOMER_DIRECTORY_SORTS, query.sort)
    ? query.sort as CustomerDirectorySort
    : "name";
  const risk = String(query.risk || '') === 'risky' ? 'risky' : 'all';
  const todayJalali = moment().locale("en").format("jYYYY/jMM/jDD");
  const offset = (page - 1) * pageSize;
  const base = buildCustomerDirectoryBaseFilter(search, tag);
  if (risk === 'risky') {
    base.conditions.push(`(
      EXISTS (
        SELECT 1 FROM installment_checks ic
        JOIN installment_sales ris ON ris.id = ic.saleId
        WHERE ris.customerId = c.id
          AND COALESCE(ris.status,'active') = 'active'
          AND (LOWER(COALESCE(ic.status,'')) LIKE '%return%' OR COALESCE(ic.status,'') LIKE '%برگشت%')
      )
      OR EXISTS (
        SELECT 1 FROM installment_payments ip
        JOIN installment_sales ris ON ris.id = ip.saleId
        WHERE ris.customerId = c.id
          AND COALESCE(ris.status,'active') = 'active'
          AND COALESCE(ip.dueDate,'') <> ''
          AND COALESCE(ip.dueDate,'') < ?
          AND NOT (LOWER(COALESCE(ip.status,'')) LIKE '%paid%' OR COALESCE(ip.status,'') LIKE '%پرداخت%' OR COALESCE(ip.status,'') LIKE '%تسویه%')
      )
    )`);
    base.params.push(todayJalali);
  }
  const baseWhere = base.conditions.length ? `WHERE ${base.conditions.join(" AND ")}` : "";
  const fastPath = balance === "all" && sort === "name";
  let total = 0;
  let ids: number[] = [];

  if (fastPath) {
    const countRow = await getAsync(`SELECT COUNT(*) AS total FROM customers c ${baseWhere}`, base.params);
    total = Math.max(0, Number(countRow?.total || 0));
    const idRows = await allAsync(`
      SELECT c.id
      FROM customers c
      ${baseWhere}
      ORDER BY c.fullName COLLATE NOCASE ASC, c.id ASC
      LIMIT ? OFFSET ?
    `, [...base.params, pageSize, offset]);
    ids = (idRows || []).map((row: any) => Number(row.id)).filter((id: number) => id > 0);
  } else {
    const balanceCondition = balance === "debt"
      ? "COALESCE(l.currentBalance,0) > 0"
      : balance === "credit"
        ? "COALESCE(l.currentBalance,0) < 0"
        : balance === "settled"
          ? "COALESCE(l.currentBalance,0) = 0"
          : "1=1";
    const directoryConditions = [...base.conditions, balanceCondition];
    const directoryWhere = `WHERE ${directoryConditions.join(" AND ")}`;
    const enrichedCte = `
      WITH ledger AS (
        SELECT customerId, SUM(COALESCE(debit,0) - COALESCE(credit,0)) AS currentBalance, MAX(COALESCE(updatedAt,createdAt,transactionDate)) AS lastLedgerAt
        FROM customer_ledger GROUP BY customerId
      ), sales AS (SELECT customerId, MAX(transactionDate) AS lastSaleAt FROM sales_orders GROUP BY customerId),
      installments AS (SELECT customerId, MAX(COALESCE(saleDateISO,dateCreated)) AS lastInstallmentAt FROM installment_sales GROUP BY customerId),
      repairs_agg AS (SELECT customerId, MAX(COALESCE(dateCompleted,dateReceived)) AS lastRepairAt FROM repairs GROUP BY customerId),
      followups AS (SELECT customerId, MAX(createdAt) AS lastFollowupAt FROM customer_followups GROUP BY customerId),
      directory AS (
        SELECT c.id, c.fullName, c.dateAdded, COALESCE(l.currentBalance,0) AS currentBalance,
          MAX(COALESCE(c.dateAdded,''),COALESCE(l.lastLedgerAt,''),COALESCE(s.lastSaleAt,''),COALESCE(i.lastInstallmentAt,''),COALESCE(r.lastRepairAt,''),COALESCE(f.lastFollowupAt,'')) AS lastActivityAt
        FROM customers c
        LEFT JOIN ledger l ON l.customerId=c.id
        LEFT JOIN sales s ON s.customerId=c.id
        LEFT JOIN installments i ON i.customerId=c.id
        LEFT JOIN repairs_agg r ON r.customerId=c.id
        LEFT JOIN followups f ON f.customerId=c.id
        ${directoryWhere}
      )
    `;
    const countRow = await getAsync(`${enrichedCte} SELECT COUNT(*) AS total FROM directory`, base.params);
    total = Math.max(0, Number(countRow?.total || 0));
    const idRows = await allAsync(`${enrichedCte}
      SELECT id FROM directory ORDER BY ${CUSTOMER_DIRECTORY_SORTS[sort]} LIMIT ? OFFSET ?`, [...base.params, pageSize, offset]);
    ids = (idRows || []).map((row: any) => Number(row.id)).filter((id: number) => id > 0);
  }

  const items = await getCustomerDirectoryRowsByIds(ids, sort);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return {
    items,
    page,
    pageSize,
    total,
    totalPages,
    ...(query.includeSummary ? { summary: await getCustomerDirectorySummaryFromDb() } : {}),
  };
};
