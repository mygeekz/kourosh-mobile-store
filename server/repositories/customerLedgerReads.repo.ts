import { allAsync, getAsync } from "../db/query";

export type CustomerLedgerSourceInfo = {
  sourceKind:
    | "installment_sale"
    | "installment_payment"
    | "installment_check"
    | "sales_order"
    | "legacy_sale"
    | "repair"
    | "manual"
    | null;
  sourceId: number | null;
  sourceLabel: string | null;
  sourceUrl: string | null;
  sourceIcon: string | null;
  sourceResolved: boolean;
};

type CustomerLedgerSourceCandidateKind = Exclude<CustomerLedgerSourceInfo["sourceKind"], "manual">;
type CustomerLedgerSourceCandidate = { kind: CustomerLedgerSourceCandidateKind; id: number | null };

const formatFaSourceNumber = (value: number) =>
  Number(value || 0).toLocaleString("fa-IR");

const emptyCustomerLedgerSource = (): CustomerLedgerSourceInfo => ({
  sourceKind: null,
  sourceId: null,
  sourceLabel: null,
  sourceUrl: null,
  sourceIcon: null,
  sourceResolved: false,
});

const parseCustomerLedgerSourceFromDescription = (
  description?: string | null,
) => {
  const raw = String(description || "").trim();
  const saleId = Number(
    raw.match(/شناسه\s*فروش(?:\s*اقساطی)?[:：]?\s*(\d+)/i)?.[1] ||
      raw.match(/معامله\s*شماره\s*(\d+)/i)?.[1] ||
      0,
  );
  const invoiceId = Number(
    raw.match(/(?:فاکتور|invoice).*?(?:شماره|#)\s*(\d+)/i)?.[1] ||
      raw.match(/(?:فاکتور|invoice)\s*#?\s*(\d+)/i)?.[1] ||
      0,
  );
  const repairId = Number(
    raw.match(/(?:تعمیر|repair).*?(?:شماره|#|شناسه)?\s*(\d+)/i)?.[1] || 0,
  );
  return { raw, saleId, invoiceId, repairId };
};

const inferCustomerLedgerSourceCandidate = (
  row: any,
): CustomerLedgerSourceCandidate => {
  const referenceType = String(row?.referenceType || "")
    .trim()
    .toLowerCase();
  const referenceId = Number(row?.referenceId || 0);
  const parsed = parseCustomerLedgerSourceFromDescription(row?.description);
  const raw = parsed.raw;

  if (referenceType === "installment_payment_tx" && referenceId > 0) {
    return { kind: "installment_payment", id: referenceId };
  }

  if (referenceType === "installment_check_cashed" && referenceId > 0) {
    return { kind: "installment_check", id: referenceId };
  }

  if (referenceType.includes("installment") && referenceId > 0) {
    return { kind: "installment_sale", id: referenceId };
  }

  if (
    (referenceType.includes("sales_order") ||
      referenceType.includes("invoice")) &&
    referenceId > 0
  ) {
    return { kind: "sales_order", id: referenceId };
  }

  if (referenceType.includes("repair") && referenceId > 0) {
    return { kind: "repair", id: referenceId };
  }

  if (parsed.saleId && /قسط|اقساط|فروش\s*اقساطی/i.test(raw)) {
    return { kind: "installment_sale", id: parsed.saleId };
  }

  if (
    parsed.invoiceId &&
    /فاکتور|invoice|فروش\s*اعتباری|فروش\s*نقدی/i.test(raw)
  ) {
    return { kind: "sales_order", id: parsed.invoiceId };
  }

  if (parsed.saleId && /خرید\s*(?:نقدی|اعتباری)|شناسه\s*فروش/i.test(raw)) {
    return { kind: "legacy_sale", id: parsed.saleId };
  }

  if (parsed.repairId && /تعمیر|خدمات/i.test(raw)) {
    return { kind: "repair", id: parsed.repairId };
  }

  return { kind: null, id: null };
};

const decorateCustomerLedgerSourceRows = async (
  rows: any[],
  customerId: number,
): Promise<any[]> => {
  const safeRows = Array.isArray(rows) ? rows : [];
  if (!safeRows.length) return [];

  const candidateByRow = new Map<number, CustomerLedgerSourceCandidate>();
  const installmentSaleIds = new Set<number>();
  const installmentTransactionIds = new Set<number>();
  const installmentCheckIds = new Set<number>();
  const salesOrderIds = new Set<number>();
  const legacySaleIds = new Set<number>();
  const repairIds = new Set<number>();

  safeRows.forEach((row, index) => {
    const candidate = inferCustomerLedgerSourceCandidate(row);
    candidateByRow.set(index, candidate);
    const id = Number(candidate.id || 0);
    if (!candidate.kind || id <= 0) return;
    if (candidate.kind === "installment_sale") installmentSaleIds.add(id);
    else if (candidate.kind === "installment_payment") installmentTransactionIds.add(id);
    else if (candidate.kind === "installment_check") installmentCheckIds.add(id);
    else if (candidate.kind === "sales_order") salesOrderIds.add(id);
    else if (candidate.kind === "legacy_sale") legacySaleIds.add(id);
    else if (candidate.kind === "repair") repairIds.add(id);
  });

  const loadIdRows = async (
    ids: Set<number>,
    sqlBuilder: (placeholders: string) => string,
    extraParams: any[] = [],
  ) => {
    const list = [...ids].filter((id) => Number.isInteger(id) && id > 0);
    if (!list.length) return [] as any[];
    const placeholders = list.map(() => "?").join(",");
    return await allAsync(sqlBuilder(placeholders), [...list, ...extraParams]).catch(() => [] as any[]);
  };

  const [paymentRows, checkRows, directSales, orders, legacySales, repairs] = await Promise.all([
    loadIdRows(installmentTransactionIds, (placeholders) => `
      SELECT it.id AS transactionId, ip.id AS paymentId, s.id AS saleId, ip.installmentNumber
        FROM installment_transactions it
        JOIN installment_payments ip ON ip.id = it.installment_payment_id
        JOIN installment_sales s ON s.id = ip.saleId
       WHERE it.id IN (${placeholders}) AND s.customerId = ?`, [customerId]),
    loadIdRows(installmentCheckIds, (placeholders) => `
      SELECT ic.id AS checkId, ic.saleId, ic.checkNumber, ic.status
        FROM installment_checks ic
        JOIN installment_sales s ON s.id = ic.saleId
       WHERE ic.id IN (${placeholders}) AND s.customerId = ?`, [customerId]),
    loadIdRows(installmentSaleIds, (placeholders) => `
      SELECT id, COALESCE(NULLIF(itemsSummary, ''), 'فروش اقساطی') AS title
        FROM installment_sales
       WHERE id IN (${placeholders}) AND customerId = ?`, [customerId]),
    loadIdRows(salesOrderIds, (placeholders) => `
      SELECT id, paymentMethod
        FROM sales_orders
       WHERE id IN (${placeholders}) AND customerId = ? AND (status IS NULL OR status = 'active')`, [customerId]),
    loadIdRows(legacySaleIds, (placeholders) => `
      SELECT id, paymentMethod, itemName
        FROM sales_transactions
       WHERE id IN (${placeholders}) AND customerId = ?`, [customerId]),
    loadIdRows(repairIds, (placeholders) => `
      SELECT id FROM repairs WHERE id IN (${placeholders}) AND customerId = ?`, [customerId]),
  ]);

  const paymentMap = new Map<number, any>((paymentRows || []).map((row: any) => [Number(row.transactionId), row]));
  const checkMap = new Map<number, any>((checkRows || []).map((row: any) => [Number(row.checkId), row]));
  const saleMap = new Map<number, any>((directSales || []).map((row: any) => [Number(row.id), row]));
  const orderMap = new Map<number, any>((orders || []).map((row: any) => [Number(row.id), row]));
  const legacySaleMap = new Map<number, any>((legacySales || []).map((row: any) => [Number(row.id), row]));
  const repairMap = new Map<number, any>((repairs || []).map((row: any) => [Number(row.id), row]));

  return safeRows.map((row, index) => {
    const candidate = candidateByRow.get(index) || { kind: null, id: null };
    const candidateId = Number(candidate.id || 0);
    let source = emptyCustomerLedgerSource();
    if (!candidate.kind || candidateId <= 0) return { ...row, ...source };

    if (candidate.kind === "installment_payment") {
      const payment = paymentMap.get(candidateId);
      const saleId = Number(payment?.saleId || 0);
      const paymentId = Number(payment?.paymentId || 0);
      source = {
        sourceKind: "installment_payment",
        sourceId: candidateId,
        sourceLabel: payment
          ? `پرداخت قسط ${formatFaSourceNumber(Number(payment.installmentNumber || 0))} · پرونده #${formatFaSourceNumber(saleId)}`
          : `پرداخت اقساطی #${formatFaSourceNumber(candidateId)} یافت نشد`,
        sourceUrl: payment && saleId > 0 && paymentId > 0
          ? `/installment-sales/${saleId}?tab=installments&paymentId=${paymentId}`
          : null,
        sourceIcon: "fa-solid fa-money-bill-transfer",
        sourceResolved: Boolean(payment && saleId > 0 && paymentId > 0),
      };
      return { ...row, ...source };
    }

    if (candidate.kind === "installment_check") {
      const check = checkMap.get(candidateId);
      const saleId = Number(check?.saleId || 0);
      const checkNumber = String(check?.checkNumber || '').trim();
      source = {
        sourceKind: "installment_check",
        sourceId: candidateId,
        sourceLabel: check
          ? `چک ${checkNumber || `#${formatFaSourceNumber(candidateId)}`} · پرونده #${formatFaSourceNumber(saleId)}`
          : `چک اقساطی #${formatFaSourceNumber(candidateId)} یافت نشد`,
        sourceUrl: check && saleId > 0
          ? `/installment-sales/${saleId}?tab=checks&checkId=${candidateId}`
          : null,
        sourceIcon: "fa-solid fa-money-check-dollar",
        sourceResolved: Boolean(check && saleId > 0),
      };
      return { ...row, ...source };
    }

    if (candidate.kind === "installment_sale") {
      const sale = saleMap.get(candidateId);
      source = {
        sourceKind: "installment_sale",
        sourceId: candidateId,
        sourceLabel: sale?.id
          ? `پرونده اقساطی #${formatFaSourceNumber(candidateId)}`
          : `پرونده اقساطی #${formatFaSourceNumber(candidateId)} یافت نشد`,
        sourceUrl: sale?.id ? `/installment-sales/${candidateId}` : null,
        sourceIcon: "fa-solid fa-file-invoice-dollar",
        sourceResolved: Boolean(sale?.id),
      };
      return { ...row, ...source };
    }

    if (candidate.kind === "sales_order") {
      const order = orderMap.get(candidateId);
      const paymentMethod = String(order?.paymentMethod || '').trim().toLowerCase();
      const isCash = paymentMethod === 'cash';
      const sourceName = isCash ? 'فروش نقدی' : paymentMethod === 'credit' ? 'فاکتور فروش اعتباری' : 'فاکتور فروش';
      source = {
        sourceKind: "sales_order",
        sourceId: candidateId,
        sourceLabel: order?.id
          ? `${sourceName} #${formatFaSourceNumber(candidateId)}`
          : `فاکتور فروش #${formatFaSourceNumber(candidateId)} یافت نشد`,
        sourceUrl: order?.id ? `/invoices/${candidateId}` : null,
        sourceIcon: isCash ? "fa-solid fa-cash-register" : "fa-solid fa-file-invoice",
        sourceResolved: Boolean(order?.id),
      };
      return { ...row, ...source };
    }

    if (candidate.kind === "legacy_sale") {
      const sale = legacySaleMap.get(candidateId);
      const paymentMethod = String(sale?.paymentMethod || '').trim().toLowerCase();
      const sourceName = paymentMethod === 'credit' ? 'فروش اعتباری قدیمی' : 'فروش نقدی قدیمی';
      source = {
        sourceKind: "legacy_sale",
        sourceId: candidateId,
        sourceLabel: sale?.id
          ? `${sourceName} #${formatFaSourceNumber(candidateId)}`
          : `${sourceName} #${formatFaSourceNumber(candidateId)} یافت نشد`,
        sourceUrl: sale?.id ? `/invoices/${candidateId}?source=legacy` : null,
        sourceIcon: "fa-solid fa-cash-register",
        sourceResolved: Boolean(sale?.id),
      };
      return { ...row, ...source };
    }

    if (candidate.kind === "repair") {
      const repair = repairMap.get(candidateId);
      source = {
        sourceKind: "repair",
        sourceId: candidateId,
        sourceLabel: repair?.id
          ? `پرونده تعمیر #${formatFaSourceNumber(candidateId)}`
          : `پرونده تعمیر #${formatFaSourceNumber(candidateId)} یافت نشد`,
        sourceUrl: repair?.id ? `/repairs/${candidateId}` : null,
        sourceIcon: "fa-solid fa-screwdriver-wrench",
        sourceResolved: Boolean(repair?.id),
      };
    }
    return { ...row, ...source };
  });
};

export const getLatestCustomerLedgerSourceForReport = async (
  customerId: number,
): Promise<CustomerLedgerSourceInfo> => {
  const fallback: CustomerLedgerSourceInfo = {
    sourceKind: null,
    sourceId: null,
    sourceLabel: null,
    sourceUrl: null,
    sourceIcon: null,
    sourceResolved: false,
  };

  const rows = await allAsync(
    `SELECT *
       FROM customer_ledger
      WHERE customerId = ?
      ORDER BY
        CASE WHEN COALESCE(debit, 0) > 0 THEN 0 ELSE 1 END,
        datetime(COALESCE(updatedAt, createdAt, transactionDate)) DESC,
        id DESC
      LIMIT 12`,
    [customerId],
  ).catch(() => [] as any[]);

  const decoratedRows = await decorateCustomerLedgerSourceRows(rows || [], customerId);
  let firstCandidate: CustomerLedgerSourceInfo | null = null;
  for (const row of decoratedRows) {
    const source: CustomerLedgerSourceInfo = {
      sourceKind: row?.sourceKind ?? null,
      sourceId: row?.sourceId ?? null,
      sourceLabel: row?.sourceLabel ?? null,
      sourceUrl: row?.sourceUrl ?? null,
      sourceIcon: row?.sourceIcon ?? null,
      sourceResolved: Boolean(row?.sourceResolved),
    };
    if (!firstCandidate && (source.sourceLabel || source.sourceKind || source.sourceId)) firstCandidate = source;
    if (source.sourceResolved && source.sourceUrl) return source;
  }
  return firstCandidate || fallback;
};

export const getLedgerForCustomerFromDb = async (
  customerId: number,
): Promise<any[]> => {
  const rows = await allAsync(
    `SELECT * FROM customer_ledger WHERE customerId = ? ORDER BY datetime(COALESCE(updatedAt, createdAt, transactionDate)) DESC, id DESC`,
    [customerId],
  );
  return await decorateCustomerLedgerSourceRows(rows, customerId);
};


export type CustomerLedgerDirectoryQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  direction?: "all" | "debit" | "credit" | "recent";
  range?: "all" | "today" | "week" | "month";
  includeSummary?: boolean;
};

export type CustomerLedgerDirectorySummary = {
  total: number;
  totalDebit: number;
  totalCredit: number;
  currentBalance: number;
  latestTransaction: string | null;
};

export type CustomerLedgerDirectoryResult = {
  items: any[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  summary?: CustomerLedgerDirectorySummary;
};

const normalizeLedgerDirectorySearch = (value: unknown) => String(value ?? "")
  .normalize("NFKC")
  .replace(/[۰-۹]/g, (digit) => "0123456789"["۰۱۲۳۴۵۶۷۸۹".indexOf(digit)] || digit)
  .replace(/[٠-٩]/g, (digit) => "0123456789"["٠١٢٣٤٥٦٧٨٩".indexOf(digit)] || digit)
  .replace(/ي/g, "ی")
  .replace(/ك/g, "ک")
  .replace(/\s+/g, " ")
  .trim();

export const listCustomerLedgerDirectoryFromDb = async (
  customerId: number,
  query: CustomerLedgerDirectoryQuery = {},
): Promise<CustomerLedgerDirectoryResult> => {
  const safeCustomerId = Math.max(0, Math.floor(Number(customerId || 0)));
  const page = Math.max(1, Math.floor(Number(query.page || 1)));
  const pageSize = Math.min(100, Math.max(10, Math.floor(Number(query.pageSize || 25))));
  const search = normalizeLedgerDirectorySearch(query.search);
  const direction = ["debit", "credit", "recent"].includes(String(query.direction || ""))
    ? String(query.direction) as "debit" | "credit" | "recent"
    : "all";
  const range = ["today", "week", "month"].includes(String(query.range || ""))
    ? String(query.range) as "today" | "week" | "month"
    : "all";
  const offset = (page - 1) * pageSize;
  const conditions = ["customerId = ?"];
  const params: Array<string | number> = [safeCustomerId];

  if (direction === "debit") conditions.push("COALESCE(debit,0) > 0");
  if (direction === "credit") conditions.push("COALESCE(credit,0) > 0");
  if (range === "today") conditions.push("date(COALESCE(transactionDate, createdAt, updatedAt)) = date('now','localtime')");
  if (range === "week") conditions.push("datetime(COALESCE(transactionDate, createdAt, updatedAt)) >= datetime('now','localtime','-7 days')");
  if (range === "month") conditions.push("datetime(COALESCE(transactionDate, createdAt, updatedAt)) >= datetime('now','localtime','-30 days')");
  if (search) {
    const pattern = `%${search}%`;
    conditions.push(`(
      REPLACE(REPLACE(COALESCE(description,''),'ي','ی'),'ك','ک') LIKE ? COLLATE NOCASE
      OR COALESCE(referenceType,'') LIKE ? COLLATE NOCASE
      OR CAST(COALESCE(referenceId,'') AS TEXT) LIKE ?
      OR CAST(id AS TEXT) LIKE ?
      OR CAST(COALESCE(debit,0) AS TEXT) LIKE ?
      OR CAST(COALESCE(credit,0) AS TEXT) LIKE ?
      OR COALESCE(transactionDate,'') LIKE ?
      OR COALESCE(createdAt,'') LIKE ?
    )`);
    params.push(pattern, pattern, pattern, pattern, pattern, pattern, pattern, pattern);
  }

  const where = `WHERE ${conditions.join(" AND ")}`;
  const countRow = await getAsync(`SELECT COUNT(*) AS total FROM customer_ledger ${where}`, params);
  const total = Math.max(0, Number(countRow?.total || 0));
  const rawRows = await allAsync(
    `SELECT *
       FROM customer_ledger
       ${where}
      ORDER BY COALESCE(updatedAt, createdAt, transactionDate) DESC, id DESC
      LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );
  const items = await decorateCustomerLedgerSourceRows(rawRows || [], safeCustomerId);

  let summary: CustomerLedgerDirectorySummary | undefined;
  if (query.includeSummary) {
    const summaryRow = await getAsync(
      `SELECT
         COUNT(*) AS total,
         COALESCE(SUM(COALESCE(debit,0)),0) AS totalDebit,
         COALESCE(SUM(COALESCE(credit,0)),0) AS totalCredit,
         COALESCE(SUM(COALESCE(debit,0) - COALESCE(credit,0)),0) AS currentBalance,
         MAX(COALESCE(updatedAt, createdAt, transactionDate)) AS latestTransaction
       FROM customer_ledger
       WHERE customerId = ?`,
      [safeCustomerId],
    );
    summary = {
      total: Math.max(0, Number(summaryRow?.total || 0)),
      totalDebit: Math.max(0, Number(summaryRow?.totalDebit || 0)),
      totalCredit: Math.max(0, Number(summaryRow?.totalCredit || 0)),
      currentBalance: Number(summaryRow?.currentBalance || 0),
      latestTransaction: summaryRow?.latestTransaction ? String(summaryRow.latestTransaction) : null,
    };
  }

  return {
    items,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    ...(summary ? { summary } : {}),
  };
};
