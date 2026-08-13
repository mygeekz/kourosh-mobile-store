import moment from "jalali-moment";
import { allAsync, execAsync, getAsync, runAsync } from "../query";
import { fromShamsiStringToISO } from "../date";
import { normalizeCheckStatus } from "../domains/installmentTypes";
import { syncInstallmentCheckCustomerLedger } from "../domains/installmentAccounting.db";

const MONEY_EPSILON = 0.00001;
const SAFE_ROUNDING_DELTA = 1;

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
           COALESCE(SUM(ic.amount), 0) AS checksTotal
      FROM installment_sales isale
      LEFT JOIN installment_checks ic ON ic.saleId = isale.id
     WHERE isale.saleType = 'check'
     GROUP BY isale.id
  `).catch(() => [] as any[]);
  for (const row of checkSales as any[]) {
    const contractDebt = Number(row.contractDebt || 0);
    const checksTotal = Number(row.checksTotal || 0);
    const delta = contractDebt - checksTotal;
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
      details: { contractDebt, checksTotal, delta, automaticRepairAllowed: false },
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
                             ))), 0) AS ledgerReceiptCredits
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

export type LegacyAccountingReconciliationResult = {
  normalizedCheckStatuses: number;
  repairedInstallmentSchedules: number;
  rebuiltProductSaleCounts: number;
  repairedKnownCashedCheckLedgers: number;
  activeIssueCount: number;
  highIssueCount: number;
};

/**
 * Safe, idempotent legacy reconciliation.
 * It never guesses a historical payment date or ambiguous contract amount.
 */
export const runLegacyAccountingReconciliation = async (): Promise<LegacyAccountingReconciliationResult> => {
  await ensureIssueTable();
  await execAsync("BEGIN TRANSACTION;");
  try {
    const normalizedCheckStatuses = await normalizeLegacyCheckStatuses();
    const repairedInstallmentSchedules = await repairSafeInstallmentScheduleRounding();
    const rebuiltProductSaleCounts = await rebuildProductSaleCounts();
    const repairedKnownCashedCheckLedgers = await repairKnownCashedCheckLedgerGaps();
    const issues = await detectLegacyAccountingHumanReviewIssues();
    await persistIssues(issues);
    await execAsync("COMMIT;");

    const highIssueCount = issues.filter((issue) => issue.severity === "high").length;
    const result = {
      normalizedCheckStatuses,
      repairedInstallmentSchedules,
      rebuiltProductSaleCounts,
      repairedKnownCashedCheckLedgers,
      activeIssueCount: issues.length,
      highIssueCount,
    };
    console.log("Legacy accounting reconciliation completed:", result);
    return result;
  } catch (error) {
    await execAsync("ROLLBACK;").catch(() => undefined);
    throw error;
  }
};
