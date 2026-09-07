import moment from "jalali-moment";
import { allAsync, execAsync, getAsync, runAsync } from "../query";
import { fromShamsiStringToISO } from "../date";
import { normalizeCheckStatus } from "../domains/installmentTypes";
import { syncInstallmentCheckCustomerLedger } from "../domains/installmentAccounting.db";
import { rebuildAllLedgerBalanceCaches } from "../ledgerBalanceConsistency";
import { reconcileSupplierAutoOwnership } from "../ownershipConsistency";
import { rebuildAllProfitSnapshotsFromSources } from "../domains/profitSnapshots.db";
import { stringifyLedgerChangeHistory } from "../domains/ledgerSupport.db";
import { recordAccountingAuditEvent, type AccountingAuditActor } from "../../accounting/accountingAuditTrail";

const MONEY_EPSILON = 0.00001;
const SAFE_ROUNDING_DELTA = 1;


const CASHED_CHECK_STATUS_SQL = "'نقد شد','نقدشده','وصول شده','پاس شده','تسویه شده','پرداخت شده','تکمیل شده','paid','Paid','cashed','Cashed'";

const CONFIRMED_PARTNER_LEDGER_DIRECTION_CORRECTIONS = [
  {
    correctionKey: "v335-behzad-settlement-2026-05-23-87700000",
    partnerName: "بهزاد هلیلی",
    transactionDate: "2026-05-23",
    originalDescription: "بابت صافی حساب",
    correctedDescription: "پرداخت بابت صافی حساب",
    amount: 87_700_000,
  },
] as const;

/**
 * Confirmed, one-time legacy data corrections.
 *
 * These are NOT heuristic repairs. Each fingerprint represents a historical
 * accounting fact explicitly confirmed by the operator. The update is
 * deliberately narrow, idempotent and audit-trailed: it only flips a row when
 * partner/date/description/amount/reference fields all match the known bad
 * state. If any part is ambiguous, no money is changed.
 */
const repairConfirmedPartnerLedgerDirectionCorrections = async (): Promise<number> => {
  let repaired = 0;
  for (const correction of CONFIRMED_PARTNER_LEDGER_DIRECTION_CORRECTIONS) {
    const rows = await allAsync(
      `SELECT pl.*, p.partnerName
         FROM partner_ledger pl
         JOIN partners p ON p.id = pl.partnerId
        WHERE TRIM(COALESCE(p.partnerName,'')) = ?
          AND date(COALESCE(pl.transactionDate, pl.createdAt)) = date(?)
          AND TRIM(COALESCE(pl.description,'')) = ?
          AND ABS(COALESCE(pl.debit,0)) <= ?
          AND ABS(COALESCE(pl.credit,0) - ?) <= ?
          AND TRIM(COALESCE(pl.referenceType,'')) = ''
          AND pl.referenceId IS NULL
        ORDER BY pl.id ASC`,
      [
        correction.partnerName,
        correction.transactionDate,
        correction.originalDescription,
        MONEY_EPSILON,
        correction.amount,
        MONEY_EPSILON,
      ],
    ).catch(() => [] as any[]);

    // Never guess. A confirmed correction must still resolve to exactly one row.
    if ((rows as any[]).length !== 1) continue;
    const row = (rows as any[])[0];
    const updatedAt = new Date().toISOString();
    const changeHistoryJson = stringifyLedgerChangeHistory(row.changeHistoryJson, {
      changedAt: updatedAt,
      reason: "confirmed_legacy_direction_correction_v335",
      before: {
        description: row.description,
        debit: Number(row.debit || 0),
        credit: Number(row.credit || 0),
        transactionDate: row.transactionDate,
        referenceType: row.referenceType ?? null,
        referenceId: row.referenceId ?? null,
      },
      after: {
        description: correction.correctedDescription,
        debit: correction.amount,
        credit: 0,
        transactionDate: row.transactionDate,
        referenceType: row.referenceType ?? null,
        referenceId: row.referenceId ?? null,
      },
      note: `Confirmed correction ${correction.correctionKey}: payment to partner had been stored on the credit side.`,
    });

    const result = await runAsync(
      `UPDATE partner_ledger
          SET description = ?, debit = ?, credit = 0, updatedAt = ?, changeHistoryJson = ?
        WHERE id = ?
          AND ABS(COALESCE(debit,0)) <= ?
          AND ABS(COALESCE(credit,0) - ?) <= ?`,
      [
        correction.correctedDescription,
        correction.amount,
        updatedAt,
        changeHistoryJson,
        Number(row.id),
        MONEY_EPSILON,
        correction.amount,
        MONEY_EPSILON,
      ],
    );
    repaired += Number(result.changes || 0);
  }
  return repaired;
};

/**
 * Read-only effective balance view.
 *
 * Legacy databases can contain a check whose status is definitively «نقد شد»
 * while its historical cash date is unknown. We must not invent that date, so
 * no customer_ledger row is synthesized. For *current balance* only, the still
 * unposted remainder of such a check is treated as a proven credit. This keeps
 * profile/directory/debtor totals financially correct without falsifying the
 * historical cash-flow timeline.
 */
const ensureCustomerEffectiveBalanceView = async (): Promise<void> => {
  await runAsync("DROP VIEW IF EXISTS v_customer_effective_balance");
  await runAsync(`
    CREATE VIEW v_customer_effective_balance AS
    WITH ledger_balance AS (
      SELECT customerId,
             COALESCE(SUM(COALESCE(debit,0) - COALESCE(credit,0)),0) AS rawLedgerBalance
        FROM customer_ledger
       GROUP BY customerId
    ), legacy_unposted_checks AS (
      SELECT isale.customerId,
             COALESCE(SUM(
               MAX(
                 0,
                 COALESCE(ic.amount,0) - COALESCE((
                   SELECT SUM(it.amount_paid)
                     FROM installment_payments rp
                     JOIN installment_transactions it ON it.installment_payment_id = rp.id
                    WHERE rp.sourceType = 'check_recovery'
                      AND rp.sourceId = ic.id
                 ),0)
               )
             ),0) AS legacyCashedCheckAdjustment
        FROM installment_checks ic
        JOIN installment_sales isale ON isale.id = ic.saleId
       WHERE LOWER(TRIM(COALESCE(isale.status,'active'))) NOT IN ('canceled','cancelled')
         AND TRIM(COALESCE(ic.status,'')) IN (${CASHED_CHECK_STATUS_SQL})
         AND NOT EXISTS (
           SELECT 1
             FROM customer_ledger cl
            WHERE cl.referenceType = 'installment_check_cashed'
              AND cl.referenceId = ic.id
         )
       GROUP BY isale.customerId
    )
    SELECT c.id AS customerId,
           COALESCE(lb.rawLedgerBalance,0) AS rawLedgerBalance,
           COALESCE(luc.legacyCashedCheckAdjustment,0) AS legacyCashedCheckAdjustment,
           COALESCE(lb.rawLedgerBalance,0) - COALESCE(luc.legacyCashedCheckAdjustment,0) AS currentBalance
      FROM customers c
      LEFT JOIN ledger_balance lb ON lb.customerId = c.id
      LEFT JOIN legacy_unposted_checks luc ON luc.customerId = c.id
  `);
};

const genericReceiptDescription = (value: unknown): boolean => {
  const text = String(value || '').trim();
  if (!text) return false;
  return /دریافت|وصول|نقد|کارت|پرداخت|تسویه/i.test(text);
};

/**
 * Safe legacy repair for a very specific, provable case:
 * - customer has exactly one active check-based sale whose check schedule is
 *   short by a positive amount;
 * - exactly one unreferenced credit exists after that sale date;
 * - that credit amount equals the schedule gap exactly.
 *
 * We only attach a reference to the already-existing ledger row; no money or
 * date is invented and the customer ledger movement itself is unchanged.
 */
const linkExactManualReceiptsToCheckSaleGaps = async (): Promise<number> => {
  const rows = await allAsync(`
    SELECT isale.id AS saleId,
           isale.customerId,
           COALESCE(NULLIF(isale.saleDateISO,''), substr(isale.dateCreated,1,10)) AS saleDateISO,
           MAX(0, COALESCE(isale.actualSalePrice,0) - COALESCE(isale.downPayment,0)) AS contractDebt,
           COALESCE((SELECT SUM(MAX(0,COALESCE(ic.amount,0))) FROM installment_checks ic WHERE ic.saleId=isale.id),0) AS checksTotal,
           COALESCE((SELECT SUM(MAX(0,COALESCE(cl.credit,0))) FROM customer_ledger cl WHERE cl.referenceType='installment_manual_receipt' AND cl.referenceId=isale.id),0) AS linkedManualReceipts
      FROM installment_sales isale
     WHERE (isale.saleType='check' OR COALESCE(isale.numberOfInstallments,0)=0)
       AND LOWER(TRIM(COALESCE(isale.status,'active'))) NOT IN ('canceled','cancelled')
     ORDER BY isale.customerId, isale.id
  `).catch(() => [] as any[]);

  const candidates = (rows as any[]).map((row) => ({
    ...row,
    gap: Math.max(0, Number(row.contractDebt || 0) - Number(row.checksTotal || 0) - Number(row.linkedManualReceipts || 0)),
  })).filter((row) => row.gap > MONEY_EPSILON);

  const byCustomer = new Map<number, any[]>();
  for (const row of candidates) {
    const customerId = Number(row.customerId || 0);
    if (!customerId) continue;
    const list = byCustomer.get(customerId) || [];
    list.push(row);
    byCustomer.set(customerId, list);
  }

  let linked = 0;
  for (const [customerId, sales] of byCustomer) {
    if (sales.length !== 1) continue;
    const sale = sales[0];
    const gap = Number(sale.gap || 0);
    const saleDate = String(sale.saleDateISO || '').trim();
    const credits = await allAsync(
      `SELECT id, description, credit, transactionDate, createdAt
         FROM customer_ledger
        WHERE customerId = ?
          AND COALESCE(debit,0) <= ?
          AND ABS(COALESCE(credit,0) - ?) <= ?
          AND TRIM(COALESCE(referenceType,'')) = ''
          AND referenceId IS NULL
          AND (? = '' OR date(COALESCE(transactionDate,createdAt)) >= date(?))
        ORDER BY id ASC`,
      [customerId, MONEY_EPSILON, gap, MONEY_EPSILON, saleDate, saleDate],
    ).catch(() => [] as any[]);
    const safeCredits = (credits as any[]).filter((row) => genericReceiptDescription(row.description));
    if (safeCredits.length !== 1) continue;
    const credit = safeCredits[0];
    const result = await runAsync(
      `UPDATE customer_ledger
          SET referenceType = 'installment_manual_receipt', referenceId = ?, updatedAt = ?
        WHERE id = ? AND TRIM(COALESCE(referenceType,'')) = '' AND referenceId IS NULL`,
      [Number(sale.saleId), new Date().toISOString(), Number(credit.id)],
    );
    linked += Number(result.changes || 0);
  }
  return linked;
};

export type LegacyAccountingIssueSeverity = "warning" | "high";

export type LegacyAccountingIssue = {
  issueKey: string;
  issueType: string;
  entityType: string;
  entityId?: number | null;
  saleId?: number | null;
  severity: LegacyAccountingIssueSeverity;
  title: string;
  details: Record<string, unknown>;
};

const ensureIssueTable = async (): Promise<void> => {
  await runAsync(`
    CREATE TABLE IF NOT EXISTS accounting_reconciliation_issues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      issueKey TEXT NOT NULL UNIQUE,
      issueType TEXT NOT NULL,
      entityType TEXT NOT NULL,
      entityId INTEGER,
      saleId INTEGER,
      severity TEXT NOT NULL,
      title TEXT NOT NULL,
      detailsJson TEXT NOT NULL DEFAULT '{}',
      firstDetectedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      lastDetectedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')),
      resolvedAt TEXT
    );
  `);
  await runAsync(
    "CREATE INDEX IF NOT EXISTS idx_accounting_reconciliation_issues_active ON accounting_reconciliation_issues(resolvedAt, severity, issueType);",
  );
};

const persistIssues = async (issues: LegacyAccountingIssue[]): Promise<void> => {
  const now = new Date().toISOString();
  await runAsync(
    "UPDATE accounting_reconciliation_issues SET resolvedAt = ? WHERE resolvedAt IS NULL",
    [now],
  );
  for (const issue of issues) {
    await runAsync(
      `INSERT INTO accounting_reconciliation_issues
        (issueKey, issueType, entityType, entityId, saleId, severity, title, detailsJson, firstDetectedAt, lastDetectedAt, resolvedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
       ON CONFLICT(issueKey) DO UPDATE SET
         issueType = excluded.issueType,
         entityType = excluded.entityType,
         entityId = excluded.entityId,
         saleId = excluded.saleId,
         severity = excluded.severity,
         title = excluded.title,
         detailsJson = excluded.detailsJson,
         lastDetectedAt = excluded.lastDetectedAt,
         resolvedAt = NULL`,
      [
        issue.issueKey,
        issue.issueType,
        issue.entityType,
        issue.entityId ?? null,
        issue.saleId ?? null,
        issue.severity,
        issue.title,
        JSON.stringify(issue.details),
        now,
        now,
      ],
    );
  }
};

const normalizeLegacyCheckStatuses = async (): Promise<number> => {
  const checks = await allAsync("SELECT id, status FROM installment_checks").catch(
    () => [] as any[],
  );
  let changed = 0;
  for (const check of checks as any[]) {
    const normalized = normalizeCheckStatus(check.status);
    if (String(check.status || "").trim() === normalized) continue;
    const result = await runAsync(
      "UPDATE installment_checks SET status = ? WHERE id = ?",
      [normalized, Number(check.id)],
    );
    changed += Number(result.changes || 0);
  }
  return changed;
};

const repairSafeInstallmentScheduleRounding = async (): Promise<number> => {
  const sales = await allAsync(`
    SELECT id, actualSalePrice, downPayment, numberOfInstallments
      FROM installment_sales
     WHERE saleType = 'installment'
       AND COALESCE(status, 'active') = 'active'
       AND COALESCE(numberOfInstallments, 0) > 0
  `).catch(() => [] as any[]);

  let repaired = 0;
  for (const sale of sales as any[]) {
    const saleId = Number(sale.id || 0);
    const expectedCount = Number(sale.numberOfInstallments || 0);
    const debt = Number(sale.actualSalePrice || 0) - Number(sale.downPayment || 0);
    if (!saleId || expectedCount <= 0 || debt <= 0) continue;

    const rows = await allAsync(
      `SELECT ip.id, ip.installmentNumber, ip.amountDue, ip.status,
              COALESCE((SELECT SUM(it.amount_paid)
                          FROM installment_transactions it
                         WHERE it.installment_payment_id = ip.id), 0) AS paidAmount,
              COALESCE((SELECT COUNT(*)
                          FROM installment_transactions it
                         WHERE it.installment_payment_id = ip.id), 0) AS txCount
         FROM installment_payments ip
        WHERE ip.saleId = ?
          AND COALESCE(ip.sourceType, 'installment') = 'installment'
        ORDER BY ip.installmentNumber ASC, ip.id ASC`,
      [saleId],
    ).catch(() => [] as any[]);

    if (rows.length !== expectedCount) continue;
    const scheduled = rows.reduce(
      (sum: number, row: any) => sum + Number(row.amountDue || 0),
      0,
    );
    const delta = debt - scheduled;
    if (
      Math.abs(delta) <= MONEY_EPSILON ||
      Math.abs(delta) > SAFE_ROUNDING_DELTA + MONEY_EPSILON
    ) {
      continue;
    }

    const last = rows[rows.length - 1] as any;
    const nextAmount = Number(last.amountDue || 0) + delta;
    const paidAmount = Number(last.paidAmount || 0);
    const txCount = Number(last.txCount || 0);
    if (
      txCount !== 0 ||
      paidAmount > MONEY_EPSILON ||
      nextAmount <= MONEY_EPSILON ||
      String(last.status || "پرداخت نشده") !== "پرداخت نشده"
    ) {
      continue;
    }

    const result = await runAsync(
      "UPDATE installment_payments SET amountDue = ? WHERE id = ?",
      [nextAmount, Number(last.id)],
    );
    repaired += Number(result.changes || 0);
  }
  return repaired;
};

const repairKnownCashedCheckLedgerGaps = async (): Promise<number> => {
  const rows = await allAsync(`
    SELECT ic.id AS checkId, ic.cashedAt
      FROM installment_checks ic
     WHERE ic.status = 'نقد شد'
       AND TRIM(COALESCE(ic.cashedAt, '')) <> ''
       AND NOT EXISTS (
         SELECT 1 FROM customer_ledger cl
          WHERE cl.referenceType = 'installment_check_cashed'
            AND cl.referenceId = ic.id
       )
  `).catch(() => [] as any[]);

  let repaired = 0;
  for (const row of rows as any[]) {
    await syncInstallmentCheckCustomerLedger(
      Number(row.checkId),
      "نقد شد",
      String(row.cashedAt),
    );
    repaired += 1;
  }
  return repaired;
};

const rebuildProductSaleCounts = async (): Promise<number> => {
  const products = await allAsync("SELECT id, saleCount FROM products").catch(
    () => [] as any[],
  );
  let changed = 0;

  for (const product of products as any[]) {
    const productId = Number(product.id || 0);
    if (!productId) continue;

    const legacy = await getAsync(
      `SELECT COALESCE(SUM(quantity), 0) AS qty
         FROM sales_transactions
        WHERE itemType = 'inventory' AND itemId = ?`,
      [productId],
    ).catch(() => null as any);

    const order = await getAsync(
      `SELECT COALESCE(SUM(soi.quantity), 0) AS qty
         FROM sales_order_items soi
         JOIN sales_orders so ON so.id = soi.orderId
        WHERE soi.itemType = 'inventory'
          AND soi.itemId = ?
          AND COALESCE(so.status, 'active') = 'active'`,
      [productId],
    ).catch(() => null as any);

    const returned = await getAsync(
      `SELECT COALESCE(SUM(sri.quantity), 0) AS qty
         FROM sales_return_items sri
         JOIN sales_returns sr ON sr.id = sri.returnId
         JOIN sales_orders so ON so.id = sr.orderId
        WHERE sri.itemType = 'inventory'
          AND sri.itemId = ?
          AND COALESCE(so.status, 'active') = 'active'`,
      [productId],
    ).catch(() => null as any);

    const installment = await getAsync(
      `SELECT COALESCE(SUM(isi.quantity), 0) AS qty
         FROM installment_sale_items isi
         JOIN installment_sales isale ON isale.id = isi.saleId
         LEFT JOIN installment_sale_cancellations isc ON isc.saleId = isale.id
        WHERE isi.itemType = 'inventory'
          AND isi.itemId = ?
          AND (COALESCE(isale.status, 'active') = 'active'
               OR (COALESCE(isale.status, 'active') = 'canceled' AND COALESCE(isc.returnPhysicalItems, 0) = 0))`,
      [productId],
    ).catch(() => null as any);

    const expected = Math.max(
      0,
      Math.round(
        Number(legacy?.qty || 0) +
          Number(order?.qty || 0) -
          Number(returned?.qty || 0) +
          Number(installment?.qty || 0),
      ),
    );
    if (Number(product.saleCount || 0) === expected) continue;
    const result = await runAsync(
      "UPDATE products SET saleCount = ? WHERE id = ?",
      [expected, productId],
    );
    changed += Number(result.changes || 0);
  }

  return changed;
};

export const detectLegacyAccountingHumanReviewIssues = async (): Promise<LegacyAccountingIssue[]> => {
  const issues: LegacyAccountingIssue[] = [];

  const cashedWithoutLedger = await allAsync(`
    SELECT ic.id AS checkId, ic.saleId, ic.checkNumber, ic.amount, ic.dueDate, ic.cashedAt,
           isale.customerId
      FROM installment_checks ic
      JOIN installment_sales isale ON isale.id = ic.saleId
     WHERE ic.status = 'نقد شد'
       AND NOT EXISTS (
         SELECT 1
           FROM customer_ledger cl
          WHERE cl.referenceType = 'installment_check_cashed'
            AND cl.referenceId = ic.id
       )
  `).catch(() => [] as any[]);

  for (const row of cashedWithoutLedger as any[]) {
    const checkId = Number(row.checkId || 0);
    const hasKnownCashDate = Boolean(String(row.cashedAt || "").trim());
    issues.push({
      issueKey: `legacy-cashed-check-ledger-gap:${checkId}`,
      issueType: hasKnownCashDate
        ? "cashed_check_missing_ledger"
        : "cashed_check_unknown_cash_date",
      entityType: "installment_check",
      entityId: checkId,
      saleId: Number(row.saleId || 0) || null,
      severity: "high",
      title: hasKnownCashDate
        ? "چک نقدشده بدون سند وصول در دفتر مشتری"
        : "چک نقدشده قدیمی بدون تاریخ قابل اثبات وصول",
      details: {
        checkNumber: String(row.checkNumber || ""),
        amount: Number(row.amount || 0),
        dueDate: row.dueDate || null,
        cashedAt: row.cashedAt || null,
        customerId: Number(row.customerId || 0) || null,
        automaticRepairAllowed: hasKnownCashDate,
      },
    });
  }

  const checkSales = await allAsync(`
    SELECT isale.id AS saleId,
           COALESCE(isale.actualSalePrice, 0) - COALESCE(isale.downPayment, 0) AS contractDebt,
           COALESCE(SUM(ic.amount), 0) AS checksTotal,
           COALESCE((SELECT SUM(cl.credit)
                       FROM customer_ledger cl
                      WHERE cl.referenceType = 'installment_manual_receipt'
                        AND cl.referenceId = isale.id), 0) AS manualReceiptTotal
      FROM installment_sales isale
      LEFT JOIN installment_checks ic ON ic.saleId = isale.id
     WHERE isale.saleType = 'check'
     GROUP BY isale.id
  `).catch(() => [] as any[]);
  for (const row of checkSales as any[]) {
    const contractDebt = Number(row.contractDebt || 0);
    const checksTotal = Number(row.checksTotal || 0);
    const manualReceiptTotal = Number(row.manualReceiptTotal || 0);
    const delta = contractDebt - checksTotal - manualReceiptTotal;
    if (Math.abs(delta) <= MONEY_EPSILON) continue;
    const saleId = Number(row.saleId || 0);
    issues.push({
      issueKey: `check-contract-total-mismatch:${saleId}`,
      issueType: "check_contract_total_mismatch",
      entityType: "installment_sale",
      entityId: saleId,
      saleId,
      severity: "high",
      title: "جمع چک‌ها با مانده قرارداد برابر نیست",
      details: { contractDebt, checksTotal, manualReceiptTotal, delta, automaticRepairAllowed: false },
    });
  }

  const duplicateChecks = await allAsync(`
    SELECT TRIM(checkNumber) AS checkNumber,
           COUNT(*) AS rowCount,
           COUNT(DISTINCT saleId) AS saleCount,
           GROUP_CONCAT(id) AS checkIds,
           GROUP_CONCAT(saleId) AS saleIds
      FROM installment_checks
     WHERE TRIM(COALESCE(checkNumber, '')) <> ''
     GROUP BY TRIM(checkNumber)
    HAVING COUNT(DISTINCT saleId) > 1
  `).catch(() => [] as any[]);
  for (const row of duplicateChecks as any[]) {
    issues.push({
      issueKey: `duplicate-check-number:${String(row.checkNumber || "")}`,
      issueType: "duplicate_check_number_across_sales",
      entityType: "installment_check_number",
      severity: "high",
      title: "شماره چک در بیش از یک قرارداد استفاده شده است",
      details: {
        checkNumber: String(row.checkNumber || ""),
        checkIds: String(row.checkIds || "")
          .split(",")
          .filter(Boolean)
          .map(Number),
        saleIds: Array.from(
          new Set(
            String(row.saleIds || "")
              .split(",")
              .filter(Boolean)
              .map(Number),
          ),
        ),
        automaticRepairAllowed: false,
      },
    });
  }

  const datedSales = await allAsync(`
    SELECT id, saleDate, installmentsStartDate
      FROM installment_sales
     WHERE saleType = 'installment'
       AND TRIM(COALESCE(saleDate, '')) <> ''
       AND TRIM(COALESCE(installmentsStartDate, '')) <> ''
  `).catch(() => [] as any[]);
  for (const row of datedSales as any[]) {
    const saleDateIso = fromShamsiStringToISO(String(row.saleDate));
    const startDateIso = fromShamsiStringToISO(String(row.installmentsStartDate));
    if (!saleDateIso || !startDateIso) continue;
    const saleDate = moment(saleDateIso, "YYYY-MM-DD", true);
    const startDate = moment(startDateIso, "YYYY-MM-DD", true);
    if (!saleDate?.isValid?.() || !startDate?.isValid?.() || !startDate.isBefore(saleDate, "day")) {
      continue;
    }
    const saleId = Number(row.id || 0);
    issues.push({
      issueKey: `installment-start-before-sale:${saleId}`,
      issueType: "installment_start_before_sale_date",
      entityType: "installment_sale",
      entityId: saleId,
      saleId,
      severity: "high",
      title: "شروع اقساط قبل از تاریخ فروش ثبت شده است",
      details: {
        saleDate: String(row.saleDate),
        installmentsStartDate: String(row.installmentsStartDate),
        automaticRepairAllowed: false,
      },
    });
  }

  const scheduleSales = await allAsync(`
    SELECT isale.id AS saleId,
           COALESCE(isale.actualSalePrice, 0) - COALESCE(isale.downPayment, 0) AS contractDebt,
           COALESCE(SUM(CASE WHEN COALESCE(ip.sourceType, 'installment') = 'installment' THEN ip.amountDue ELSE 0 END), 0) AS scheduledTotal
      FROM installment_sales isale
      LEFT JOIN installment_payments ip ON ip.saleId = isale.id
     WHERE isale.saleType = 'installment'
     GROUP BY isale.id
  `).catch(() => [] as any[]);
  for (const row of scheduleSales as any[]) {
    const contractDebt = Number(row.contractDebt || 0);
    const scheduledTotal = Number(row.scheduledTotal || 0);
    const delta = contractDebt - scheduledTotal;
    if (Math.abs(delta) <= MONEY_EPSILON) continue;
    const saleId = Number(row.saleId || 0);
    issues.push({
      issueKey: `installment-schedule-total-mismatch:${saleId}`,
      issueType: "installment_schedule_total_mismatch",
      entityType: "installment_sale",
      entityId: saleId,
      saleId,
      severity: "high",
      title: "جمع برنامه اقساط با بدهی قرارداد برابر نیست",
      details: { contractDebt, scheduledTotal, delta, automaticRepairAllowed: false },
    });
  }

  const canceledWithoutSnapshot = await allAsync(`
    SELECT id AS saleId
      FROM installment_sales
     WHERE COALESCE(status, 'active') = 'canceled'
       AND NOT EXISTS (SELECT 1 FROM installment_sale_cancellations isc WHERE isc.saleId = installment_sales.id)
  `).catch(() => [] as any[]);
  for (const row of canceledWithoutSnapshot as any[]) {
    const saleId = Number(row.saleId || 0);
    issues.push({
      issueKey: `canceled-sale-missing-snapshot:${saleId}`,
      issueType: "canceled_sale_missing_reversal_snapshot",
      entityType: "installment_sale",
      entityId: saleId,
      saleId,
      severity: "high",
      title: "قرارداد فسخ‌شده فاقد Snapshot حسابداری فسخ است",
      details: { automaticRepairAllowed: false },
    });
  }

  const cancellationRows = await allAsync(`
    SELECT isale.id AS saleId, isc.mode, isc.returnPhysicalItems, isc.returnUnusedChecks,
           isc.collectedAfterDownPayment, isc.expectedRefundDue, isc.settlementStatus, isc.snapshotJson,
           COALESCE((SELECT SUM(isi.quantity) FROM installment_sale_items isi
                      WHERE isi.saleId = isale.id AND isi.itemType IN ('phone','inventory')), 0) AS physicalQuantity,
           COALESCE((SELECT COUNT(*) FROM installment_checks ic
                      WHERE ic.saleId = isale.id
                        AND TRIM(COALESCE(ic.status,'')) IN ('نزد فروشنده','در جریان وصول')), 0) AS pendingCheckCount,
           COALESCE((SELECT SUM(cl.credit) FROM customer_ledger cl
                      WHERE (cl.referenceType = 'installment_payment_tx' AND cl.referenceId IN (
                               SELECT it.id FROM installment_transactions it
                               JOIN installment_payments ip ON ip.id = it.installment_payment_id
                               WHERE ip.saleId = isale.id
                             ))
                         OR (cl.referenceType = 'installment_check_cashed' AND cl.referenceId IN (
                               SELECT ic2.id FROM installment_checks ic2 WHERE ic2.saleId = isale.id
                             ))
                         OR (cl.referenceType = 'installment_manual_receipt' AND cl.referenceId = isale.id)), 0) AS ledgerReceiptCredits
      FROM installment_sales isale
      JOIN installment_sale_cancellations isc ON isc.saleId = isale.id
     WHERE COALESCE(isale.status, 'active') = 'canceled'
  `).catch(() => [] as any[]);

  for (const row of cancellationRows as any[]) {
    const saleId = Number(row.saleId || 0);
    const physicalQuantity = Number(row.physicalQuantity || 0);
    const pendingCheckCount = Number(row.pendingCheckCount || 0);
    const collected = Number(row.collectedAfterDownPayment || 0);
    const ledgerCredits = Number(row.ledgerReceiptCredits || 0);
    const ledgerGap = collected - ledgerCredits;
    let unresolvedPhysicalRows = 0;
    let unresolvedPhysicalItems: any[] = [];
    try {
      const snapshot = row.snapshotJson ? JSON.parse(String(row.snapshotJson)) : null;
      unresolvedPhysicalRows = Math.max(0, Number(snapshot?.inventory?.unresolvedRows || 0));
      unresolvedPhysicalItems = Array.isArray(snapshot?.inventory?.unresolved)
        ? snapshot.inventory.unresolved
        : [];
    } catch {}

    if (String(row.mode || '') === 'review_required') {
      issues.push({
        issueKey: `canceled-sale-open-financial-review:${saleId}`,
        issueType: "canceled_sale_financial_review_required",
        entityType: "installment_sale",
        entityId: saleId,
        saleId,
        severity: "high",
        title: "فسخ قرارداد با تسویه مالی باز ثبت شده است",
        details: {
          expectedRefundDue: Number(row.expectedRefundDue || 0),
          settlementStatus: row.settlementStatus || null,
          automaticRepairAllowed: false,
        },
      });
    }

    if (physicalQuantity > 0 && Number(row.returnPhysicalItems || 0) !== 1) {
      issues.push({
        issueKey: `canceled-sale-physical-items-not-returned:${saleId}`,
        issueType: "canceled_sale_physical_items_not_returned",
        entityType: "installment_sale",
        entityId: saleId,
        saleId,
        severity: "warning",
        title: "فسخ ثبت شده اما بازگشت اقلام فیزیکی تأیید نشده است",
        details: { physicalQuantity, automaticRepairAllowed: false },
      });
    }

    if (unresolvedPhysicalRows > 0) {
      issues.push({
        issueKey: `canceled-sale-physical-return-unresolved:${saleId}`,
        issueType: "canceled_sale_physical_return_unresolved",
        entityType: "installment_sale",
        entityId: saleId,
        saleId,
        severity: "high",
        title: "بخشی از بازگشت فیزیکی قرارداد فسخ‌شده قابل اعمال قطعی نبوده است",
        details: {
          unresolvedPhysicalRows,
          unresolvedPhysicalItems,
          automaticRepairAllowed: false,
        },
      });
    }

    if (pendingCheckCount > 0 && Number(row.returnUnusedChecks || 0) !== 1) {
      issues.push({
        issueKey: `canceled-sale-unused-checks-not-returned:${saleId}`,
        issueType: "canceled_sale_unused_checks_not_returned",
        entityType: "installment_sale",
        entityId: saleId,
        saleId,
        severity: "high",
        title: "فسخ ثبت شده اما چک استفاده‌نشده هنوز عودت‌شده ثبت نشده است",
        details: { pendingCheckCount, automaticRepairAllowed: false },
      });
    }

    if (String(row.mode || '') === 'full_reversal' && ledgerGap > MONEY_EPSILON) {
      issues.push({
        issueKey: `canceled-sale-receipt-ledger-gap:${saleId}`,
        issueType: "canceled_sale_receipt_ledger_gap",
        entityType: "installment_sale",
        entityId: saleId,
        saleId,
        severity: "high",
        title: "وصول شناخته‌شده قرارداد فسخ‌شده با دفتر مشتری هم‌خوان نیست",
        details: {
          collectedAfterDownPayment: collected,
          ledgerReceiptCredits: ledgerCredits,
          delta: ledgerGap,
          automaticRepairAllowed: false,
        },
      });
    }
  }

  return issues;
};

export const detectDerivedAccountingConsistencyIssues = async (): Promise<LegacyAccountingIssue[]> => {
  const issues: LegacyAccountingIssue[] = [];

  // v336 invariant audit. Partner movements are always one-sided. Customer
  // cash-sales may be a balanced pair only when the row has an explicit sales
  // source reference; anything else needs human review rather than silent repair.
  const invalidLedgerRows = await allAsync(`
    SELECT 'partner_ledger' AS entityType, id, partnerId AS accountId,
           debit, credit, referenceType, referenceId, description
      FROM partner_ledger
     WHERE COALESCE(debit,0) < 0 OR COALESCE(credit,0) < 0
        OR (COALESCE(debit,0) <= 0 AND COALESCE(credit,0) <= 0)
        OR (COALESCE(debit,0) > 0 AND COALESCE(credit,0) > 0)
    UNION ALL
    SELECT 'customer_ledger' AS entityType, id, customerId AS accountId,
           debit, credit, referenceType, referenceId, description
      FROM customer_ledger
     WHERE COALESCE(debit,0) < 0 OR COALESCE(credit,0) < 0
        OR (COALESCE(debit,0) <= 0 AND COALESCE(credit,0) <= 0)
        OR (
          COALESCE(debit,0) > 0 AND COALESCE(credit,0) > 0
          AND (
            ABS(COALESCE(debit,0)-COALESCE(credit,0)) > ${MONEY_EPSILON}
            OR LOWER(TRIM(COALESCE(referenceType,''))) NOT IN ('sales_order_charge','sales_transaction_charge','installment_charge')
          )
        )
     ORDER BY entityType, id
     LIMIT 200
  `).catch(() => [] as any[]);
  for (const row of invalidLedgerRows as any[]) {
    const entityType = String(row.entityType || 'ledger');
    issues.push({
      issueKey: `invalid-ledger-movement:${entityType}:${Number(row.id)}`,
      issueType: 'invalid_ledger_movement',
      entityType,
      entityId: Number(row.id),
      severity: 'high',
      title: 'ساختار بدهکار/بستانکار این سند با قرارداد حسابداری سازگار نیست',
      details: {
        accountId: Number(row.accountId || 0) || null,
        debit: Number(row.debit || 0),
        credit: Number(row.credit || 0),
        referenceType: row.referenceType || null,
        referenceId: row.referenceId == null ? null : Number(row.referenceId),
        description: row.description || null,
        automaticRepairAllowed: false,
      },
    });
  }


  // v340 source-reference integrity: legacy rows are surfaced, never guessed.
  const missingReferenceRows = await allAsync(`
    SELECT 'partner_ledger' AS entityType, id, partnerId AS accountId,
           transactionDate, description, debit, credit, referenceType, referenceId
      FROM partner_ledger
     WHERE TRIM(COALESCE(referenceType,'')) = '' OR COALESCE(referenceId,0) <= 0
    UNION ALL
    SELECT 'customer_ledger' AS entityType, id, customerId AS accountId,
           transactionDate, description, debit, credit, referenceType, referenceId
      FROM customer_ledger
     WHERE TRIM(COALESCE(referenceType,'')) = '' OR COALESCE(referenceId,0) <= 0
     ORDER BY entityType, id
     LIMIT 250
  `).catch(() => [] as any[]);
  for (const row of missingReferenceRows as any[]) {
    const entityType = String(row.entityType || 'ledger');
    issues.push({
      issueKey: `ledger-missing-reference:${entityType}:${Number(row.id)}`,
      issueType: 'ledger_missing_reference',
      entityType,
      entityId: Number(row.id),
      severity: 'high',
      title: 'سند دفتر بدون مرجع مالی قطعی ثبت شده است',
      details: {
        accountId: Number(row.accountId || 0) || null,
        transactionDate: row.transactionDate || null,
        description: row.description || null,
        debit: Number(row.debit || 0),
        credit: Number(row.credit || 0),
        referenceType: row.referenceType || null,
        referenceId: row.referenceId == null ? null : Number(row.referenceId),
        automaticRepairAllowed: false,
        requiresHumanSourceAssignment: true,
      },
    });
  }

  // A manual document is the only intentionally source-less business action;
  // even then, the ledger must resolve to the immutable document and match it.
  const orphanManualReferences = await allAsync(`
    SELECT 'customer_ledger' AS entityType, cl.id, cl.customerId AS accountId,
           cl.referenceId, cl.transactionDate, cl.description, cl.debit, cl.credit
      FROM customer_ledger cl
      LEFT JOIN accounting_manual_documents amd
        ON amd.id = cl.referenceId
       AND amd.accountType = 'customer'
       AND amd.accountId = cl.customerId
     WHERE LOWER(TRIM(COALESCE(cl.referenceType,''))) = 'manual_accounting_document'
       AND amd.id IS NULL
    UNION ALL
    SELECT 'partner_ledger' AS entityType, pl.id, pl.partnerId AS accountId,
           pl.referenceId, pl.transactionDate, pl.description, pl.debit, pl.credit
      FROM partner_ledger pl
      LEFT JOIN accounting_manual_documents amd
        ON amd.id = pl.referenceId
       AND amd.accountType = 'partner'
       AND amd.accountId = pl.partnerId
     WHERE LOWER(TRIM(COALESCE(pl.referenceType,''))) = 'manual_accounting_document'
       AND amd.id IS NULL
     ORDER BY entityType, id
     LIMIT 100
  `).catch(() => [] as any[]);
  for (const row of orphanManualReferences as any[]) {
    const entityType = String(row.entityType || 'ledger');
    issues.push({
      issueKey: `ledger-orphan-manual-reference:${entityType}:${Number(row.id)}`,
      issueType: 'ledger_orphan_manual_reference',
      entityType,
      entityId: Number(row.id),
      severity: 'high',
      title: 'مرجع سند مستقل دفتر پیدا نمی‌شود',
      details: {
        accountId: Number(row.accountId || 0) || null,
        referenceId: Number(row.referenceId || 0) || null,
        transactionDate: row.transactionDate || null,
        description: row.description || null,
        debit: Number(row.debit || 0),
        credit: Number(row.credit || 0),
        automaticRepairAllowed: false,
      },
    });
  }

  // Every sale that affects a named customer's balance must have its primary
  // charge ledger row. Cash rows may be balance-neutral, but they are still
  // source evidence and therefore must exist.
  const salesWithoutLedger = await allAsync(`
    SELECT 'sales_order' AS entityType, so.id, so.customerId, so.transactionDate,
           so.grandTotal AS amount, 'sales_order_charge' AS expectedReferenceType
      FROM sales_orders so
     WHERE so.customerId IS NOT NULL
       AND COALESCE(so.grandTotal,0) > ${MONEY_EPSILON}
       AND NOT EXISTS (
         SELECT 1 FROM customer_ledger cl
          WHERE cl.referenceType='sales_order_charge' AND cl.referenceId=so.id
       )
    UNION ALL
    SELECT 'sales_transaction' AS entityType, st.id, st.customerId, st.transactionDate,
           st.totalPrice AS amount, 'sales_transaction_charge' AS expectedReferenceType
      FROM sales_transactions st
     WHERE st.customerId IS NOT NULL
       AND COALESCE(st.totalPrice,0) > ${MONEY_EPSILON}
       AND NOT EXISTS (
         SELECT 1 FROM customer_ledger cl
          WHERE cl.referenceType='sales_transaction_charge' AND cl.referenceId=st.id
       )
    UNION ALL
    SELECT 'installment_sale' AS entityType, isale.id, isale.customerId,
           COALESCE(NULLIF(isale.saleDateISO,''), substr(isale.dateCreated,1,10)) AS transactionDate,
           isale.actualSalePrice AS amount, 'installment_charge' AS expectedReferenceType
      FROM installment_sales isale
     WHERE isale.customerId IS NOT NULL
       AND COALESCE(isale.actualSalePrice,0) > ${MONEY_EPSILON}
       AND LOWER(TRIM(COALESCE(isale.status,'active'))) NOT IN ('canceled','cancelled')
       AND NOT EXISTS (
         SELECT 1 FROM customer_ledger cl
          WHERE cl.referenceType='installment_charge' AND cl.referenceId=isale.id
       )
     ORDER BY entityType, id
     LIMIT 200
  `).catch(() => [] as any[]);
  for (const row of salesWithoutLedger as any[]) {
    const entityType = String(row.entityType || 'sale');
    issues.push({
      issueKey: `sale-missing-primary-ledger:${entityType}:${Number(row.id)}`,
      issueType: 'sale_missing_primary_ledger',
      entityType,
      entityId: Number(row.id),
      saleId: Number(row.id),
      severity: 'high',
      title: 'فروش بدون سند مالی اصلی در دفتر مشتری ثبت شده است',
      details: {
        customerId: Number(row.customerId || 0) || null,
        transactionDate: row.transactionDate || null,
        amount: Number(row.amount || 0),
        expectedReferenceType: row.expectedReferenceType,
        automaticRepairAllowed: false,
      },
    });
  }

  // Supplier and owner are allowed to differ only as an explicit/manual
  // business decision. The reconciliation center surfaces that divergence so
  // it cannot silently pass as the supplier-derived owner.
  const supplierOwnerMismatches = await allAsync(`
    WITH supplier_profile AS (
      SELECT spl.legacyPartnerId AS supplierId,
             MIN(op.id) AS expectedOwnershipProfileId,
             MIN(op.title) AS expectedOwnershipTitle,
             COUNT(DISTINCT op.id) AS profileCount
        FROM store_partner_legacy_links spl
        JOIN ownership_profile_items opi ON opi.storePartnerId = spl.storePartnerId
        JOIN ownership_profiles op ON op.id = opi.ownershipProfileId
       WHERE spl.linkType='owner'
         AND op.ownershipType='personal'
         AND COALESCE(op.isActive,1)=1
       GROUP BY spl.legacyPartnerId
      HAVING COUNT(DISTINCT op.id)=1
    )
    SELECT 'phone' AS entityType, ph.id, ph.supplierId,
           pa.partnerName AS supplierName,
           ph.ownershipProfileId,
           cur.title AS ownershipTitle,
           sp.expectedOwnershipProfileId,
           sp.expectedOwnershipTitle
      FROM phones ph
      JOIN supplier_profile sp ON sp.supplierId=ph.supplierId
      LEFT JOIN partners pa ON pa.id=ph.supplierId
      LEFT JOIN ownership_profiles cur ON cur.id=ph.ownershipProfileId
     WHERE COALESCE(ph.ownershipProfileId,0) <> COALESCE(sp.expectedOwnershipProfileId,0)
    UNION ALL
    SELECT 'product' AS entityType, pr.id, pr.supplierId,
           pa.partnerName AS supplierName,
           pr.ownershipProfileId,
           cur.title AS ownershipTitle,
           sp.expectedOwnershipProfileId,
           sp.expectedOwnershipTitle
      FROM products pr
      JOIN supplier_profile sp ON sp.supplierId=pr.supplierId
      LEFT JOIN partners pa ON pa.id=pr.supplierId
      LEFT JOIN ownership_profiles cur ON cur.id=pr.ownershipProfileId
     WHERE COALESCE(pr.ownershipProfileId,0) <> COALESCE(sp.expectedOwnershipProfileId,0)
     ORDER BY entityType, id
     LIMIT 200
  `).catch(() => [] as any[]);
  for (const row of supplierOwnerMismatches as any[]) {
    const entityType = String(row.entityType || 'asset');
    issues.push({
      issueKey: `supplier-owner-mismatch:${entityType}:${Number(row.id)}`,
      issueType: 'supplier_owner_mismatch',
      entityType,
      entityId: Number(row.id),
      severity: 'warning',
      title: 'تأمین‌کننده و مالک فعلی کالا با نگاشت خودکار یکسان نیستند',
      details: {
        supplierId: Number(row.supplierId || 0) || null,
        supplierName: row.supplierName || null,
        ownershipProfileId: Number(row.ownershipProfileId || 0) || null,
        ownershipTitle: row.ownershipTitle || null,
        expectedOwnershipProfileId: Number(row.expectedOwnershipProfileId || 0) || null,
        expectedOwnershipTitle: row.expectedOwnershipTitle || null,
        automaticRepairAllowed: false,
        mayBeIntentionalManualOwnership: true,
      },
    });
  }

  // Cross-check installment receivables against the canonical customer ledger.
  // This is intentionally read-only: if the two systems disagree, a source
  // document must decide which side is wrong.
  const installmentCustomerMismatches = await allAsync(`
    WITH payment_tx AS (
      SELECT ip.saleId,
             COALESCE(SUM(MAX(0,COALESCE(it.amount_paid,0))),0) AS transactionPaid
        FROM installment_payments ip
        LEFT JOIN installment_transactions it ON it.installment_payment_id=ip.id
       GROUP BY ip.saleId
    ), check_recovery AS (
      SELECT ip.sourceId AS checkId,
             COALESCE(SUM(MAX(0,COALESCE(it.amount_paid,0))),0) AS recoveryPaid
        FROM installment_payments ip
        JOIN installment_transactions it ON it.installment_payment_id=ip.id
       WHERE ip.sourceType='check_recovery' AND ip.sourceId IS NOT NULL
       GROUP BY ip.sourceId
    ), checks AS (
      SELECT ic.saleId,
             COALESCE(SUM(CASE
               WHEN TRIM(COALESCE(ic.status,'')) IN (${CASHED_CHECK_STATUS_SQL})
               THEN MAX(0,COALESCE(ic.amount,0)-COALESCE(cr.recoveryPaid,0))
               ELSE 0 END),0) AS cashedRemainder
        FROM installment_checks ic
        LEFT JOIN check_recovery cr ON cr.checkId=ic.id
       GROUP BY ic.saleId
    ), manual_receipts AS (
      SELECT referenceId AS saleId, COALESCE(SUM(MAX(0,COALESCE(credit,0))),0) AS manualReceipt
        FROM customer_ledger
       WHERE referenceType='installment_manual_receipt' AND referenceId IS NOT NULL
       GROUP BY referenceId
    ), sale_remaining AS (
      SELECT s.id AS saleId, s.customerId,
             CASE WHEN LOWER(TRIM(COALESCE(s.status,'active'))) IN ('canceled','cancelled') THEN 0
                  ELSE MAX(0,
                    MAX(0,COALESCE(s.actualSalePrice,0)-COALESCE(s.downPayment,0))
                    - MAX(0,COALESCE(pt.transactionPaid,0)+COALESCE(ch.cashedRemainder,0)+COALESCE(mr.manualReceipt,0))
                  ) END AS remainingAmount
        FROM installment_sales s
        LEFT JOIN payment_tx pt ON pt.saleId=s.id
        LEFT JOIN checks ch ON ch.saleId=s.id
        LEFT JOIN manual_receipts mr ON mr.saleId=s.id
    ), customer_installments AS (
      SELECT customerId,
             COUNT(*) AS saleCount,
             SUM(CASE WHEN remainingAmount>${MONEY_EPSILON} THEN 1 ELSE 0 END) AS openSaleCount,
             COALESCE(SUM(remainingAmount),0) AS totalRemaining
        FROM sale_remaining
       GROUP BY customerId
    ), customer_balance AS (
      SELECT customerId, COALESCE(SUM(COALESCE(debit,0)-COALESCE(credit,0)),0) AS ledgerBalance
        FROM customer_ledger
       GROUP BY customerId
    )
    SELECT ci.customerId, ci.saleCount, ci.openSaleCount, ci.totalRemaining,
           COALESCE(cb.ledgerBalance,0) AS ledgerBalance,
           CASE
             WHEN ci.totalRemaining>${MONEY_EPSILON} AND ABS(COALESCE(cb.ledgerBalance,0))<=${MONEY_EPSILON}
               THEN 'customer_zero_with_open_installments'
             WHEN ci.totalRemaining<=${MONEY_EPSILON} AND COALESCE(cb.ledgerBalance,0)>${MONEY_EPSILON}
               THEN 'installments_settled_customer_debt'
             ELSE NULL
           END AS mismatchType
      FROM customer_installments ci
      LEFT JOIN customer_balance cb ON cb.customerId=ci.customerId
     WHERE (ci.totalRemaining>${MONEY_EPSILON} AND ABS(COALESCE(cb.ledgerBalance,0))<=${MONEY_EPSILON})
        OR (ci.totalRemaining<=${MONEY_EPSILON} AND COALESCE(cb.ledgerBalance,0)>${MONEY_EPSILON})
     ORDER BY ci.customerId
     LIMIT 150
  `).catch(() => [] as any[]);
  for (const row of installmentCustomerMismatches as any[]) {
    const mismatchType = String(row.mismatchType || 'installment_customer_balance_mismatch');
    issues.push({
      issueKey: `${mismatchType}:${Number(row.customerId)}`,
      issueType: mismatchType,
      entityType: 'customer',
      entityId: Number(row.customerId),
      severity: 'high',
      title: mismatchType === 'customer_zero_with_open_installments'
        ? 'مشتری صفر شده اما پرونده اقساط هنوز مانده باز دارد'
        : 'اقساط تسویه شده اما دفتر مشتری هنوز بدهکار است',
      details: {
        customerId: Number(row.customerId),
        installmentSaleCount: Number(row.saleCount || 0),
        openInstallmentSaleCount: Number(row.openSaleCount || 0),
        installmentRemaining: Number(row.totalRemaining || 0),
        customerLedgerBalance: Number(row.ledgerBalance || 0),
        automaticRepairAllowed: false,
      },
    });
  }

  const partnerDrift = await allAsync(`
    WITH expected AS (
      SELECT id, partnerId, balance,
             SUM(COALESCE(credit,0)-COALESCE(debit,0)) OVER (
               PARTITION BY partnerId
               ORDER BY datetime(COALESCE(transactionDate,createdAt,updatedAt)), id
               ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
             ) AS expectedBalance
        FROM partner_ledger
    )
    SELECT id, partnerId, balance, expectedBalance
      FROM expected
     WHERE ABS(COALESCE(balance,0)-COALESCE(expectedBalance,0)) > ${MONEY_EPSILON}
     ORDER BY partnerId, id
     LIMIT 100
  `).catch(() => [] as any[]);
  for (const row of partnerDrift as any[]) {
    issues.push({
      issueKey: `partner-ledger-cache-drift:${Number(row.id)}`,
      issueType: 'partner_ledger_cache_drift',
      entityType: 'partner_ledger',
      entityId: Number(row.id),
      severity: 'high',
      title: 'مانده ذخیره‌شده دفتر همکار با گردش واقعی هم‌خوان نیست',
      details: {
        partnerId: Number(row.partnerId),
        storedBalance: Number(row.balance || 0),
        expectedBalance: Number(row.expectedBalance || 0),
        automaticRepairAllowed: true,
      },
    });
  }

  const customerDrift = await allAsync(`
    WITH expected AS (
      SELECT id, customerId, balance,
             SUM(COALESCE(debit,0)-COALESCE(credit,0)) OVER (
               PARTITION BY customerId
               ORDER BY datetime(COALESCE(transactionDate,createdAt,updatedAt)), id
               ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
             ) AS expectedBalance
        FROM customer_ledger
    )
    SELECT id, customerId, balance, expectedBalance
      FROM expected
     WHERE ABS(COALESCE(balance,0)-COALESCE(expectedBalance,0)) > ${MONEY_EPSILON}
     ORDER BY customerId, id
     LIMIT 100
  `).catch(() => [] as any[]);
  for (const row of customerDrift as any[]) {
    issues.push({
      issueKey: `customer-ledger-cache-drift:${Number(row.id)}`,
      issueType: 'customer_ledger_cache_drift',
      entityType: 'customer_ledger',
      entityId: Number(row.id),
      severity: 'high',
      title: 'مانده ذخیره‌شده دفتر مشتری با گردش واقعی هم‌خوان نیست',
      details: {
        customerId: Number(row.customerId),
        storedBalance: Number(row.balance || 0),
        expectedBalance: Number(row.expectedBalance || 0),
        automaticRepairAllowed: true,
      },
    });
  }

  const missingAllocations = await allAsync(`
    SELECT sps.id, sps.sourceKind, sps.sourceId, sps.itemId, sps.itemDescription, sps.totalProfitAmount
      FROM sale_profit_snapshots sps
     WHERE sps.sourceStatus = 'active'
       AND ABS(COALESCE(sps.totalProfitAmount,0)) > ${MONEY_EPSILON}
       AND NOT EXISTS (
         SELECT 1 FROM sale_profit_allocations spa
          WHERE spa.snapshotId = sps.id AND spa.sourceStatus = 'active'
       )
     ORDER BY sps.id ASC
  `).catch(() => [] as any[]);
  for (const row of missingAllocations as any[]) {
    issues.push({
      issueKey: `profit-snapshot-missing-allocation:${Number(row.id)}`,
      issueType: 'profit_snapshot_missing_allocation',
      entityType: 'sale_profit_snapshot',
      entityId: Number(row.id),
      saleId: Number(row.sourceId || 0) || null,
      severity: 'high',
      title: 'سود فروش محاسبه شده اما سهم شرکا تخصیص نیافته است',
      details: {
        sourceKind: row.sourceKind,
        sourceId: Number(row.sourceId || 0) || null,
        itemId: Number(row.itemId || 0) || null,
        itemDescription: row.itemDescription || null,
        totalProfitAmount: Number(row.totalProfitAmount || 0),
        automaticRepairAllowed: false,
        repairReason: "v338_historical_snapshot_requires_frozen_evidence",
      },
    });
  }

  const staleCosts = await allAsync(`
    SELECT sps.id, sps.sourceKind, sps.sourceId, sps.itemType, sps.itemId,
           sps.initialCostPerUnit, sps.marketCostPerUnit, sps.snapshotState, sps.sourceCostBasis,
           CASE
             WHEN sps.sourceKind='sales_order' THEN soi.buyPrice
             WHEN sps.sourceKind='installment_sale' THEN isi.buyPrice
             ELSE NULL
           END AS documentBuyPrice
      FROM sale_profit_snapshots sps
      LEFT JOIN sales_order_items soi
        ON sps.sourceKind='sales_order' AND soi.id=sps.sourceItemId
      LEFT JOIN installment_sale_items isi
        ON sps.sourceKind='installment_sale' AND isi.id=sps.sourceItemId
     WHERE sps.sourceStatus='active'
       AND ABS(COALESCE(sps.marketCostPerUnit,0)-COALESCE(CASE WHEN sps.sourceKind='sales_order' THEN soi.buyPrice WHEN sps.sourceKind='installment_sale' THEN isi.buyPrice ELSE 0 END,0)) > ${MONEY_EPSILON}
     ORDER BY sps.id ASC
  `).catch(() => [] as any[]);
  for (const row of staleCosts as any[]) {
    issues.push({
      issueKey: `profit-snapshot-cost-drift:${Number(row.id)}`,
      issueType: 'profit_snapshot_cost_drift',
      entityType: 'sale_profit_snapshot',
      entityId: Number(row.id),
      saleId: Number(row.sourceId || 0) || null,
      severity: 'high',
      title: 'سند فروش پس از ثبت Snapshot تاریخی تغییر کرده است',
      details: {
        sourceKind: row.sourceKind,
        sourceId: Number(row.sourceId || 0) || null,
        itemType: row.itemType,
        itemId: Number(row.itemId || 0) || null,
        snapshotInitialCost: Number(row.initialCostPerUnit || 0),
        snapshotMarketCost: Number(row.marketCostPerUnit || 0),
        documentBuyPrice: Number(row.documentBuyPrice || 0),
        snapshotState: row.snapshotState || null,
        sourceCostBasis: row.sourceCostBasis || null,
        automaticRepairAllowed: false,
        historicalSnapshotMustNotFollowCurrentAssetPrice: true,
      },
    });
  }

  const legacyBaselines = await getAsync(`
    SELECT COUNT(*) AS count
      FROM sale_profit_snapshots
     WHERE COALESCE(snapshotState,'legacy_baseline') = 'legacy_baseline'
  `).catch(() => null as any);
  const legacyBaselineCount = Number((legacyBaselines as any)?.count || 0);
  if (legacyBaselineCount > 0) {
    issues.push({
      issueKey: 'profit-snapshot-legacy-baseline-v338',
      issueType: 'profit_snapshot_legacy_baseline',
      entityType: 'sale_profit_snapshot',
      severity: 'warning',
      title: 'بخشی از Snapshotهای قدیمی با Baseline مهاجرتی فریز شده‌اند',
      details: {
        count: legacyBaselineCount,
        automaticRepairAllowed: false,
        note: 'این رکوردها دیگر با تغییر قیمت/مالک/Supplier امروز بازنویسی نمی‌شوند، اما اصالت تاریخی Baseline باید در صورت حساسیت مالی بازبینی انسانی شود.',
      },
    });
  }

  // A malformed/far-future accounting date does not change the all-time ledger
  // sum, but it can silently move money into the wrong reporting period. Never
  // invent a replacement date: surface the row for human review instead.
  const today = new Date(Date.now() + 3.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const ledgerDateOutliers = await allAsync(
    `SELECT 'partner_ledger' AS entityType, id, partnerId AS accountId, transactionDate, createdAt, description, debit, credit
       FROM partner_ledger
      WHERE TRIM(COALESCE(transactionDate,'')) <> ''
        AND (date(transactionDate) IS NULL OR date(transactionDate) > date(?, '+366 day'))
      UNION ALL
     SELECT 'customer_ledger' AS entityType, id, customerId AS accountId, transactionDate, createdAt, description, debit, credit
       FROM customer_ledger
      WHERE TRIM(COALESCE(transactionDate,'')) <> ''
        AND (date(transactionDate) IS NULL OR date(transactionDate) > date(?, '+366 day'))
      ORDER BY entityType, id`,
    [today, today],
  ).catch(() => [] as any[]);
  for (const row of ledgerDateOutliers as any[]) {
    const entityType = String(row.entityType || 'ledger');
    issues.push({
      issueKey: `ledger-date-outlier:${entityType}:${Number(row.id)}`,
      issueType: 'ledger_date_outlier',
      entityType,
      entityId: Number(row.id),
      severity: 'high',
      title: 'تاریخ حسابداری غیرعادی در دفتر ثبت شده است',
      details: {
        accountId: Number(row.accountId || 0) || null,
        transactionDate: row.transactionDate || null,
        createdAt: row.createdAt || null,
        description: row.description || null,
        debit: Number(row.debit || 0),
        credit: Number(row.credit || 0),
        affectsPeriodReports: true,
        automaticRepairAllowed: false,
      },
    });
  }

  return issues;
};

export const detectFutureDatedProfitIssues = async (): Promise<LegacyAccountingIssue[]> => {
  const today = new Date(Date.now() + 3.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const rows = await allAsync(
    `SELECT sps.id, sps.sourceKind, sps.sourceId, sps.saleDate, sps.itemDescription
       FROM sale_profit_snapshots sps
      WHERE sps.sourceStatus = 'active'
        AND date(sps.saleDate) > date(?)
      ORDER BY date(sps.saleDate) ASC, sps.id ASC`,
    [today],
  ).catch(() => [] as any[]);
  return (rows as any[]).map((row) => ({
    issueKey: `future-profit-snapshot:${row.id}`,
    issueType: 'future_profit_snapshot',
    entityType: 'sale_profit_snapshot',
    entityId: Number(row.id),
    saleId: Number(row.sourceId) || null,
    severity: 'warning' as const,
    title: 'سند سود با تاریخ آینده در داده‌ها وجود دارد',
    details: {
      sourceKind: row.sourceKind,
      sourceId: Number(row.sourceId) || null,
      saleDate: row.saleDate,
      itemDescription: row.itemDescription || null,
      excludedFromCurrentReports: true,
      automaticRepairAllowed: false,
    },
  }));
};

export const detectAllAccountingReconciliationIssues = async (): Promise<LegacyAccountingIssue[]> => [
  ...(await detectLegacyAccountingHumanReviewIssues()),
  ...(await detectDerivedAccountingConsistencyIssues()),
  ...(await detectFutureDatedProfitIssues()),
];

export type LegacyAccountingReconciliationResult = {
  correctedConfirmedPartnerLedgerDirections: number;
  normalizedCheckStatuses: number;
  repairedInstallmentSchedules: number;
  rebuiltProductSaleCounts: number;
  repairedKnownCashedCheckLedgers: number;
  linkedManualInstallmentReceipts: number;
  rebuiltPartnerLedgerCaches: number;
  rebuiltCustomerLedgerCaches: number;
  autoOwnershipPhonesUpdated: number;
  autoOwnershipProductsUpdated: number;
  reconciledPhoneCostBasisDocuments: number;
  rebuiltProfitSalesOrders: number;
  rebuiltProfitInstallmentSales: number;
  activeIssueCount: number;
  highIssueCount: number;
};

/**
 * Safe, idempotent legacy reconciliation.
 * It never guesses a historical payment date or ambiguous contract amount.
 */
export const runLegacyAccountingReconciliation = async (options?: {
  audit?: boolean;
  actor?: AccountingAuditActor | null;
  source?: string;
}): Promise<LegacyAccountingReconciliationResult> => {
  await ensureIssueTable();
  await ensureCustomerEffectiveBalanceView();
  await execAsync("BEGIN TRANSACTION;");
  try {
    const normalizedCheckStatuses = await normalizeLegacyCheckStatuses();
    const repairedInstallmentSchedules = await repairSafeInstallmentScheduleRounding();
    const rebuiltProductSaleCounts = await rebuildProductSaleCounts();
    const repairedKnownCashedCheckLedgers = await repairKnownCashedCheckLedgerGaps();
    const linkedManualInstallmentReceipts = await linkExactManualReceiptsToCheckSaleGaps();
    const correctedConfirmedPartnerLedgerDirections = await repairConfirmedPartnerLedgerDirectionCorrections();

    // v338: ledger caches remain derived, but historical sale-profit facts are not.
    // Ownership repair may update the CURRENT asset profile only. Profit reconciliation
    // backfills missing snapshots and never rewrites an existing historical snapshot.
    const ledgerCaches = await rebuildAllLedgerBalanceCaches();
    const ownershipRepair = await reconcileSupplierAutoOwnership();
    const profitRepair = await rebuildAllProfitSnapshotsFromSources();

    const issues = await detectAllAccountingReconciliationIssues();
    await persistIssues(issues);

    const highIssueCount = issues.filter((issue) => issue.severity === "high").length;
    const result = {
      correctedConfirmedPartnerLedgerDirections,
      normalizedCheckStatuses,
      repairedInstallmentSchedules,
      rebuiltProductSaleCounts,
      repairedKnownCashedCheckLedgers,
      linkedManualInstallmentReceipts,
      rebuiltPartnerLedgerCaches: ledgerCaches.partners,
      rebuiltCustomerLedgerCaches: ledgerCaches.customers,
      autoOwnershipPhonesUpdated: ownershipRepair.phonesUpdated,
      autoOwnershipProductsUpdated: ownershipRepair.productsUpdated,
      reconciledPhoneCostBasisDocuments: 0,
      rebuiltProfitSalesOrders: profitRepair.salesOrders,
      rebuiltProfitInstallmentSales: profitRepair.installmentSales,
      activeIssueCount: issues.length,
      highIssueCount,
    };
    if (options?.audit) {
      await recordAccountingAuditEvent({
        eventType: "safe_reconciliation_run",
        entityType: "accounting_reconciliation",
        accountType: "system",
        actor: options.actor || null,
        reason: "safe_repair_from_reconciliation_center",
        after: result,
        source: options.source || "accounting_reconciliation_center",
      });
    }
    await execAsync("COMMIT;");
    console.log("Legacy accounting reconciliation completed:", result);
    return result;
  } catch (error) {
    await execAsync("ROLLBACK;").catch(() => undefined);
    throw error;
  }
};
