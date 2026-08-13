// Phase 1H: installment SMS/payment ledger helper cluster extracted from legacyRuntime.ts.

import { getDbInstance } from "../core/runtimeBindings";
import { allAsync, getAsync, runAsync } from "../query";
import {
  addCustomerLedgerEntryInternal,
  recalcCustomerBalancesInternal,
} from "./customers.db";
import {
  getInstallmentSaleReceivableState,
  normalizeInstallmentAccountingDate,
  syncInstallmentCheckCustomerLedger,
} from "./installmentAccounting.db";
import { normalizeCheckStatus } from "./installmentTypes";

export const getInstallmentPaymentDetailsForSms = async (
  paymentId: number,
): Promise<any> => {
  await getDbInstance();
  // تاریخ‌ها در DB شمسی ذخیره شده‌اند؛ همان را می‌خوانیم.
  const query = `
        SELECT
            ip.id as paymentId,
            ip.dueDate,
            ip.amountDue,
            isale.id as saleId,
            isale.customerId as customerId,
            c.fullName as customerFullName,
            c.phoneNumber as customerPhoneNumber
        FROM installment_payments ip
        JOIN installment_sales isale ON ip.saleId = isale.id
        JOIN customers c ON isale.customerId = c.id
        WHERE ip.id = ?
    `;
  return await getAsync(query, [paymentId]);
};

export const getInstallmentPaymentLedgerMeta = async (paymentId: number) => {
  const row = await getAsync(
    `SELECT ip.id AS paymentId, ip.saleId, ip.installmentNumber, isale.customerId
       FROM installment_payments ip
       JOIN installment_sales isale ON isale.id = ip.saleId
      WHERE ip.id = ?`,
    [paymentId],
  );
  if (!row || !row.customerId) return null;
  return {
    customerId: Number(row.customerId),
    saleId: Number(row.saleId),
    installmentNumber: Number(row.installmentNumber || 0),
  };
};

const buildInstallmentReceiptDescription = (
  installmentNumber: number,
  saleId: number,
  notes?: string | null,
) =>
  [
    `دریافت بابت قسط ${installmentNumber ? installmentNumber.toLocaleString("fa-IR") : "—"}`,
    `شناسه فروش: ${saleId}`,
    notes ? `یادداشت: ${notes}` : "",
  ]
    .filter(Boolean)
    .join(" | ");

export const syncInstallmentTransactionCustomerLedger = async (
  txId: number,
  paymentId: number,
  amount: number,
  isoDate: string,
  notes?: string | null,
) => {
  const meta = await getInstallmentPaymentLedgerMeta(paymentId);
  if (!meta) return;

  const description = buildInstallmentReceiptDescription(
    meta.installmentNumber,
    meta.saleId,
    notes,
  );

  const existing = await getAsync(
    `SELECT id FROM customer_ledger WHERE referenceType = ? AND referenceId = ? LIMIT 1`,
    ["installment_payment_tx", txId],
  );

  if (existing?.id) {
    await runAsync(
      `UPDATE customer_ledger
          SET transactionDate = ?,
              updatedAt = ?,
              description = ?,
              debit = 0,
              credit = ?
        WHERE id = ?`,
      [isoDate, new Date().toISOString(), description, amount, existing.id],
    );
    await recalcCustomerBalancesInternal(meta.customerId);
    return;
  }

  await addCustomerLedgerEntryInternal(
    meta.customerId,
    description,
    0,
    amount,
    isoDate,
    { referenceType: "installment_payment_tx", referenceId: txId },
  );
  await recalcCustomerBalancesInternal(meta.customerId);
};


export type InstallmentCustomerLedgerReconciliation = {
  insertedCharges: number;
  updatedCharges: number;
  insertedReceipts: number;
  updatedReceipts: number;
  removedDuplicates: number;
  removedOrphans: number;
  touchedCustomers: number;
};

export type InstallmentLedgerLinkState = "linked" | "missing" | "mismatch";

export type InstallmentCustomerLedgerReconciliationStatus = {
  customerId: number;
  checkedAt: string;
  state: "reconciled" | "needs_review";
  repair: InstallmentCustomerLedgerReconciliation;
  summary: {
    installmentSales: number;
    linkedCharges: number;
    paymentTransactions: number;
    linkedReceipts: number;
    issues: number;
  };
  sales: Array<{
    saleId: number;
    transactionDate: string;
    itemsSummary: string;
    saleTotal: number;
    downPayment: number;
    expectedDebt: number;
    ledgerEntryId: number | null;
    ledgerDebit: number;
    state: InstallmentLedgerLinkState;
  }>;
  payments: Array<{
    transactionId: number;
    paymentId: number;
    saleId: number;
    installmentNumber: number;
    paymentDate: string;
    amountPaid: number;
    ledgerEntryId: number | null;
    ledgerCredit: number;
    state: InstallmentLedgerLinkState;
  }>;
};

/**
 * Reconciles installment debt/receipts against their source tables.
 *
 * Older runtimes could save an installment transaction without the matching
 * customer_ledger credit, or backfill the full sale value instead of the
 * post-down-payment debt. Debt reports use the ledger as their audit trail, so
 * this repair makes that trail deterministic before reporting. It never
 * touches manual ledger rows.
 */
export const reconcileInstallmentCustomerLedger = async (
  customerId?: number,
): Promise<InstallmentCustomerLedgerReconciliation> => {
  await getDbInstance();

  const scopedCustomerId = Number(customerId || 0);
  const customerFilter = scopedCustomerId > 0 ? " AND isale.customerId = ?" : "";
  const params = scopedCustomerId > 0 ? [scopedCustomerId] : [];
  const touchedCustomers = new Set<number>();
  const result: InstallmentCustomerLedgerReconciliation = {
    insertedCharges: 0,
    updatedCharges: 0,
    insertedReceipts: 0,
    updatedReceipts: 0,
    removedDuplicates: 0,
    removedOrphans: 0,
    touchedCustomers: 0,
  };

  const saleRows = await allAsync(
    `SELECT isale.id AS saleId, isale.customerId, isale.actualSalePrice,
            isale.downPayment, isale.itemsSummary, isale.saleDate, isale.saleDateISO, isale.dateCreated
       FROM installment_sales isale
      WHERE isale.customerId IS NOT NULL
        AND COALESCE(isale.actualSalePrice, 0) > 0${customerFilter}
      ORDER BY isale.id ASC`,
    params,
  ).catch(() => [] as any[]);

  const chargeLedgerRows = await allAsync(
    `SELECT cl.*
       FROM customer_ledger cl
      WHERE cl.referenceType = 'installment_charge'
        ${scopedCustomerId > 0 ? "AND cl.customerId = ?" : ""}
      ORDER BY cl.id ASC`,
    params,
  ).catch(() => [] as any[]);
  const chargesBySale = new Map<number, any[]>();
  for (const row of chargeLedgerRows) {
    const saleId = Number(row?.referenceId || 0);
    if (!saleId) continue;
    const list = chargesBySale.get(saleId) || [];
    list.push(row);
    chargesBySale.set(saleId, list);
  }

  for (const sale of saleRows) {
    const saleId = Number(sale?.saleId || 0);
    const saleCustomerId = Number(sale?.customerId || 0);
    if (!saleId || !saleCustomerId) continue;
    const saleTotal = Math.max(0, Number(sale?.actualSalePrice || 0));
    const downPayment = Math.min(
      saleTotal,
      Math.max(0, Number(sale?.downPayment || 0)),
    );
    const debt = Math.max(0, saleTotal - downPayment);
    const description = `خرید اقساطی (شناسه فروش: ${saleId})، موارد: ${String(sale?.itemsSummary || "—")}، مبلغ کل: ${saleTotal.toLocaleString("fa-IR")}، پیش پرداخت: ${downPayment.toLocaleString("fa-IR")}`;
    const accountingDate =
      String(sale?.saleDateISO || "").trim() ||
      normalizeInstallmentAccountingDate(sale?.saleDate, sale?.dateCreated);
    const transactionDate = accountingDate
      ? `${accountingDate}T12:00:00.000Z`
      : String(sale?.dateCreated || new Date().toISOString());

    let ledgerRows = chargesBySale.get(saleId) || [];
    if (ledgerRows.length === 0) {
      const legacyMatch = await getAsync(
        `SELECT *
           FROM customer_ledger
          WHERE customerId = ?
            AND COALESCE(debit, 0) > 0
            AND COALESCE(credit, 0) = 0
            AND (
              description LIKE ?
              OR description LIKE ?
              OR (
                TRIM(COALESCE(description, '')) = TRIM(?)
                AND (
                  ABS(COALESCE(debit, 0) - ?) < 0.00001
                  OR ABS(COALESCE(debit, 0) - ?) < 0.00001
                )
                AND (
                  transactionDate = ?
                  OR date(transactionDate) = date(?)
                )
              )
            )
          ORDER BY id ASC
          LIMIT 1`,
        [
          saleCustomerId,
          `%شناسه فروش: ${saleId}%`,
          `%شناسه فروش اقساطی: ${saleId}%`,
          String(sale?.itemsSummary || "").trim(),
          saleTotal,
          debt,
          transactionDate,
          transactionDate,
        ],
      ).catch(() => null as any);
      if (legacyMatch?.id) ledgerRows = [legacyMatch];
    }

    const primary = ledgerRows[0];
    const chargeNeedsUpdate = Boolean(
      primary?.id &&
        (Number(primary.customerId || 0) !== saleCustomerId ||
          String(primary.transactionDate || "") !== transactionDate ||
          String(primary.description || "") !== description ||
          Number(primary.debit || 0) !== debt ||
          Number(primary.credit || 0) !== 0 ||
          String(primary.referenceType || "") !== "installment_charge" ||
          Number(primary.referenceId || 0) !== saleId),
    );
    if (primary?.id && chargeNeedsUpdate) {
      await runAsync(
        `UPDATE customer_ledger
            SET customerId = ?, transactionDate = ?, updatedAt = ?, description = ?,
                debit = ?, credit = 0, referenceType = 'installment_charge', referenceId = ?
          WHERE id = ?`,
        [
          saleCustomerId,
          transactionDate,
          new Date().toISOString(),
          description,
          debt,
          saleId,
          primary.id,
        ],
      );
      result.updatedCharges += 1;
    } else if (!primary?.id && debt > 0) {
      await runAsync(
        `INSERT INTO customer_ledger
          (customerId, transactionDate, createdAt, updatedAt, description, debit, credit, balance, referenceType, referenceId)
         VALUES (?, ?, ?, ?, ?, ?, 0, 0, 'installment_charge', ?)`,
        [
          saleCustomerId,
          transactionDate,
          new Date().toISOString(),
          new Date().toISOString(),
          description,
          debt,
          saleId,
        ],
      );
      result.insertedCharges += 1;
    }

    for (const duplicate of ledgerRows.slice(1)) {
      await runAsync(`DELETE FROM customer_ledger WHERE id = ?`, [duplicate.id]);
      result.removedDuplicates += 1;
      touchedCustomers.add(saleCustomerId);
    }
    if (chargeNeedsUpdate || (!primary?.id && debt > 0)) {
      touchedCustomers.add(saleCustomerId);
    }
  }

  const transactionRows = await allAsync(
    `SELECT it.id AS txId, it.amount_paid AS amountPaid, it.payment_date AS paymentDate, it.notes,
            ip.id AS paymentId, ip.installmentNumber, ip.saleId, isale.customerId
       FROM installment_transactions it
       JOIN installment_payments ip ON ip.id = it.installment_payment_id
       JOIN installment_sales isale ON isale.id = ip.saleId
      WHERE isale.customerId IS NOT NULL
        AND COALESCE(it.amount_paid, 0) > 0${customerFilter}
      ORDER BY it.id ASC`,
    params,
  ).catch(() => [] as any[]);

  const receiptLedgerRows = await allAsync(
    `SELECT cl.*
       FROM customer_ledger cl
      WHERE cl.referenceType = 'installment_payment_tx'
        ${scopedCustomerId > 0 ? "AND cl.customerId = ?" : ""}
      ORDER BY cl.id ASC`,
    params,
  ).catch(() => [] as any[]);
  const receiptsByTransaction = new Map<number, any[]>();
  for (const row of receiptLedgerRows) {
    const txId = Number(row?.referenceId || 0);
    if (!txId) continue;
    const list = receiptsByTransaction.get(txId) || [];
    list.push(row);
    receiptsByTransaction.set(txId, list);
  }

  const validTransactionIds = new Set<number>();
  for (const tx of transactionRows) {
    const txId = Number(tx?.txId || 0);
    const saleCustomerId = Number(tx?.customerId || 0);
    if (!txId || !saleCustomerId) continue;
    validTransactionIds.add(txId);
    const amount = Math.max(0, Number(tx?.amountPaid || 0));
    const paymentDate = String(tx?.paymentDate || new Date().toISOString());
    const description = buildInstallmentReceiptDescription(
      Number(tx?.installmentNumber || 0),
      Number(tx?.saleId || 0),
      tx?.notes ? String(tx.notes) : null,
    );
    let ledgerRows = receiptsByTransaction.get(txId) || [];
    if (ledgerRows.length === 0) {
      const legacyReceipt = await getAsync(
        `SELECT *
           FROM customer_ledger
          WHERE customerId = ?
            AND COALESCE(debit, 0) = 0
            AND ABS(COALESCE(credit, 0) - ?) < 0.00001
            AND description LIKE '%دریافت بابت قسط%'
            AND description LIKE ?
            AND (transactionDate = ? OR date(transactionDate) = date(?))
          ORDER BY id ASC
          LIMIT 1`,
        [
          saleCustomerId,
          amount,
          `%شناسه فروش: ${Number(tx?.saleId || 0)}%`,
          paymentDate,
          paymentDate,
        ],
      ).catch(() => null as any);
      if (legacyReceipt?.id) ledgerRows = [legacyReceipt];
    }
    const primary = ledgerRows[0];

    const receiptNeedsUpdate = Boolean(
      primary?.id &&
        (Number(primary.customerId || 0) !== saleCustomerId ||
          String(primary.transactionDate || "") !== paymentDate ||
          String(primary.description || "") !== description ||
          Number(primary.debit || 0) !== 0 ||
          Number(primary.credit || 0) !== amount ||
          String(primary.referenceType || "") !== "installment_payment_tx" ||
          Number(primary.referenceId || 0) !== txId),
    );
    if (primary?.id && receiptNeedsUpdate) {
      await runAsync(
        `UPDATE customer_ledger
            SET customerId = ?, transactionDate = ?, updatedAt = ?, description = ?,
                debit = 0, credit = ?, referenceType = 'installment_payment_tx', referenceId = ?
          WHERE id = ?`,
        [
          saleCustomerId,
          paymentDate,
          new Date().toISOString(),
          description,
          amount,
          txId,
          primary.id,
        ],
      );
      result.updatedReceipts += 1;
    } else if (!primary?.id) {
      await runAsync(
        `INSERT INTO customer_ledger
          (customerId, transactionDate, createdAt, updatedAt, description, debit, credit, balance, referenceType, referenceId)
         VALUES (?, ?, ?, ?, ?, 0, ?, 0, 'installment_payment_tx', ?)`,
        [
          saleCustomerId,
          paymentDate,
          new Date().toISOString(),
          new Date().toISOString(),
          description,
          amount,
          txId,
        ],
      );
      result.insertedReceipts += 1;
    }

    for (const duplicate of ledgerRows.slice(1)) {
      await runAsync(`DELETE FROM customer_ledger WHERE id = ?`, [duplicate.id]);
      result.removedDuplicates += 1;
      touchedCustomers.add(saleCustomerId);
    }
    if (receiptNeedsUpdate || !primary?.id) {
      touchedCustomers.add(saleCustomerId);
    }
  }

  for (const ledgerRow of receiptLedgerRows) {
    const txId = Number(ledgerRow?.referenceId || 0);
    if (!txId || validTransactionIds.has(txId)) continue;
    await runAsync(`DELETE FROM customer_ledger WHERE id = ?`, [ledgerRow.id]);
    result.removedOrphans += 1;
    if (Number(ledgerRow?.customerId || 0) > 0) {
      touchedCustomers.add(Number(ledgerRow.customerId));
    }
  }

  // وصول چک نیز باید همان اثر مالی دفتر مشتری را داشته باشد.
  const checkRows = await allAsync(
    `SELECT ic.id, ic.status, isale.customerId
       FROM installment_checks ic
       JOIN installment_sales isale ON isale.id = ic.saleId
      WHERE isale.customerId IS NOT NULL${customerFilter}
      ORDER BY ic.id ASC`,
    params,
  ).catch(() => [] as any[]);
  for (const check of checkRows) {
    const checkId = Number(check?.id || 0);
    const checkCustomerId = Number(check?.customerId || 0);
    if (!checkId || !checkCustomerId) continue;
    const before = await getAsync(
      `SELECT id, credit FROM customer_ledger WHERE referenceType = 'installment_check_cashed' AND referenceId = ? LIMIT 1`,
      [checkId],
    ).catch(() => null as any);
    await syncInstallmentCheckCustomerLedger(checkId, normalizeCheckStatus(check?.status), null);
    const after = await getAsync(
      `SELECT id, credit FROM customer_ledger WHERE referenceType = 'installment_check_cashed' AND referenceId = ? LIMIT 1`,
      [checkId],
    ).catch(() => null as any);
    if (!before?.id && after?.id) result.insertedReceipts += 1;
    else if (before?.id && after?.id && Math.abs(Number(before.credit || 0) - Number(after.credit || 0)) > 0.00001) result.updatedReceipts += 1;
    else if (before?.id && !after?.id) result.removedOrphans += 1;
    if (before?.id !== after?.id || Math.abs(Number(before?.credit || 0) - Number(after?.credit || 0)) > 0.00001) {
      touchedCustomers.add(checkCustomerId);
    }
  }

  for (const touchedCustomerId of touchedCustomers) {
    await recalcCustomerBalancesInternal(touchedCustomerId);
  }
  result.touchedCustomers = touchedCustomers.size;
  return result;
};

/**
 * Returns an audit-friendly link map after repairing the scoped customer's
 * installment ledger. Every installment charge and every recorded payment is
 * matched to its exact customer_ledger row by referenceType/referenceId.
 */
export const getInstallmentCustomerLedgerReconciliationStatus = async (
  customerId: number,
): Promise<InstallmentCustomerLedgerReconciliationStatus> => {
  await getDbInstance();
  const scopedCustomerId = Number(customerId || 0);
  if (!Number.isInteger(scopedCustomerId) || scopedCustomerId <= 0) {
    throw new Error("شناسه مشتری برای تطبیق دفتر حساب نامعتبر است.");
  }

  const repair = await reconcileInstallmentCustomerLedger(scopedCustomerId);

  const saleRows = await allAsync(
    `SELECT isale.id AS saleId, isale.saleDate, isale.saleDateISO, isale.dateCreated,
            COALESCE(isale.itemsSummary, '') AS itemsSummary,
            COALESCE(isale.actualSalePrice, 0) AS saleTotal,
            COALESCE(isale.downPayment, 0) AS downPayment,
            cl.id AS ledgerEntryId,
            COALESCE(cl.debit, 0) AS ledgerDebit
       FROM installment_sales isale
       LEFT JOIN customer_ledger cl
         ON cl.customerId = isale.customerId
        AND cl.referenceType = 'installment_charge'
        AND cl.referenceId = isale.id
      WHERE isale.customerId = ?
        AND COALESCE(isale.actualSalePrice, 0) > 0
      ORDER BY isale.id DESC`,
    [scopedCustomerId],
  ).catch(() => [] as any[]);

  const paymentRows = await allAsync(
    `SELECT it.id AS transactionId,
            ip.id AS paymentId,
            ip.saleId,
            COALESCE(ip.installmentNumber, 0) AS installmentNumber,
            COALESCE(it.payment_date, '') AS paymentDate,
            COALESCE(it.amount_paid, 0) AS amountPaid,
            cl.id AS ledgerEntryId,
            COALESCE(cl.credit, 0) AS ledgerCredit
       FROM installment_transactions it
       JOIN installment_payments ip ON ip.id = it.installment_payment_id
       JOIN installment_sales isale ON isale.id = ip.saleId
       LEFT JOIN customer_ledger cl
         ON cl.customerId = isale.customerId
        AND cl.referenceType = 'installment_payment_tx'
        AND cl.referenceId = it.id
      WHERE isale.customerId = ?
        AND COALESCE(it.amount_paid, 0) > 0
      ORDER BY it.payment_date DESC, it.id DESC`,
    [scopedCustomerId],
  ).catch(() => [] as any[]);

  const sameMoney = (left: unknown, right: unknown) =>
    Math.abs(Number(left || 0) - Number(right || 0)) < 0.00001;

  const sales = saleRows.map((row: any) => {
    const saleTotal = Math.max(0, Number(row?.saleTotal || 0));
    const downPayment = Math.min(
      saleTotal,
      Math.max(0, Number(row?.downPayment || 0)),
    );
    const expectedDebt = Math.max(0, saleTotal - downPayment);
    const ledgerEntryId = Number(row?.ledgerEntryId || 0) || null;
    const ledgerDebit = Math.max(0, Number(row?.ledgerDebit || 0));
    const state: InstallmentLedgerLinkState = expectedDebt === 0 && !ledgerEntryId
      ? "linked"
      : !ledgerEntryId
        ? "missing"
        : sameMoney(ledgerDebit, expectedDebt)
          ? "linked"
          : "mismatch";
    return {
      saleId: Number(row?.saleId || 0),
      transactionDate: (() => {
        const accountingDate =
          String(row?.saleDateISO || "").trim() ||
          normalizeInstallmentAccountingDate(row?.saleDate, row?.dateCreated);
        return accountingDate ? `${accountingDate}T12:00:00.000Z` : String(row?.dateCreated || "");
      })(),
      itemsSummary: String(row?.itemsSummary || ""),
      saleTotal,
      downPayment,
      expectedDebt,
      ledgerEntryId,
      ledgerDebit,
      state,
    };
  });

  const payments = paymentRows.map((row: any) => {
    const amountPaid = Math.max(0, Number(row?.amountPaid || 0));
    const ledgerEntryId = Number(row?.ledgerEntryId || 0) || null;
    const ledgerCredit = Math.max(0, Number(row?.ledgerCredit || 0));
    const state: InstallmentLedgerLinkState = !ledgerEntryId
      ? "missing"
      : sameMoney(ledgerCredit, amountPaid)
        ? "linked"
        : "mismatch";
    return {
      transactionId: Number(row?.transactionId || 0),
      paymentId: Number(row?.paymentId || 0),
      saleId: Number(row?.saleId || 0),
      installmentNumber: Number(row?.installmentNumber || 0),
      paymentDate: String(row?.paymentDate || ""),
      amountPaid,
      ledgerEntryId,
      ledgerCredit,
      state,
    };
  });

  const linkedCharges = sales.filter((row) => row.state === "linked").length;
  const linkedReceipts = payments.filter((row) => row.state === "linked").length;
  const issues = sales.filter((row) => row.state !== "linked").length
    + payments.filter((row) => row.state !== "linked").length;

  return {
    customerId: scopedCustomerId,
    checkedAt: new Date().toISOString(),
    state: issues === 0 ? "reconciled" : "needs_review",
    repair,
    summary: {
      installmentSales: sales.length,
      linkedCharges,
      paymentTransactions: payments.length,
      linkedReceipts,
      issues,
    },
    sales,
    payments,
  };
};

export const deleteInstallmentTransactionCustomerLedger = async (
  txId: number,
  paymentId: number,
) => {
  const meta = await getInstallmentPaymentLedgerMeta(paymentId);
  const existing = await getAsync(
    `SELECT id FROM customer_ledger WHERE referenceType = ? AND referenceId = ? LIMIT 1`,
    ["installment_payment_tx", txId],
  );
  if (!existing?.id) return;
  await runAsync(`DELETE FROM customer_ledger WHERE id = ?`, [existing.id]);
  if (meta?.customerId) await recalcCustomerBalancesInternal(meta.customerId);
};

export const _toNumber = (v: any) =>
  Number(String(v ?? "0").replace(/[^\d.-]/g, "")) || 0;

export const assertInstallmentPaymentAmountIsValid = async (
  paymentId: number,
  amount: number,
  excludeTxId?: number,
): Promise<void> => {
  const normalizedAmount = Number(amount);
  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0)
    throw new Error("مبلغ پرداخت باید عدد مثبت باشد.");
  const payment = await getAsync(
    `SELECT ip.id, ip.saleId, ip.amountDue, ip.sourceType, ip.sourceId, ic.status AS checkStatus
       FROM installment_payments ip
       LEFT JOIN installment_checks ic
         ON ip.sourceType = 'check_recovery' AND ic.id = ip.sourceId
      WHERE ip.id = ?`,
    [paymentId],
  );
  if (!payment) throw new Error("قسط مورد نظر برای ثبت پرداخت یافت نشد.");
  const paidRow = await getAsync(
    `SELECT COALESCE(SUM(amount_paid), 0) as totalPaid
     FROM installment_transactions
     WHERE installment_payment_id = ? ${excludeTxId ? "AND id <> ?" : ""}`,
    excludeTxId ? [paymentId, excludeTxId] : [paymentId],
  );
  const paidBefore = _toNumber(paidRow?.totalPaid);
  const amountDue = _toNumber(payment.amountDue);
  const remaining = Math.max(0, amountDue - paidBefore);
  if (normalizedAmount > remaining + 0.00001) {
    throw new Error(
      `مبلغ پرداخت (${normalizedAmount.toLocaleString("fa-IR")}) بیشتر از مانده این قسط (${remaining.toLocaleString("fa-IR")}) است.`,
    );
  }

  const isCashedCheckRecovery =
    String(payment.sourceType || "") === "check_recovery" &&
    normalizeCheckStatus(payment.checkStatus) === "نقد شد";
  if (!isCashedCheckRecovery) {
    const saleState = await getInstallmentSaleReceivableState(
      Number(payment.saleId),
      excludeTxId,
    );
    if (normalizedAmount > saleState.remaining + 0.00001) {
      throw new Error(
        `مبلغ دریافت (${normalizedAmount.toLocaleString("fa-IR")}) بیشتر از مانده کل قرارداد (${saleState.remaining.toLocaleString("fa-IR")}) است.`,
      );
    }
  }
};
