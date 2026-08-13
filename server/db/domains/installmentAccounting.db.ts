import moment from "jalali-moment";
import { normalizeInstallmentAccountingDate } from "../date";
import { getAsync, runAsync } from "../query";
import {
  addCustomerLedgerEntryInternal,
  recalcCustomerBalancesInternal,
} from "./customers.db";
import { normalizeCheckStatus, type CheckStatus } from "./installmentTypes";

const MONEY_EPSILON = 0.00001;

export { normalizeInstallmentAccountingDate } from "../date";


export type InstallmentSaleReceivableState = {
  saleId: number;
  contractDebt: number;
  transactionPaid: number;
  cashedCheckRemainder: number;
  collectedAfterDownPayment: number;
  remaining: number;
  overpayment: number;
};

export const getInstallmentSaleReceivableState = async (
  saleId: number,
  excludeTxId?: number,
): Promise<InstallmentSaleReceivableState> => {
  const sale = await getAsync(
    `SELECT id, actualSalePrice, downPayment, status FROM installment_sales WHERE id = ?`,
    [saleId],
  );
  if (!sale?.id) throw new Error("فروش اقساطی مورد نظر یافت نشد.");

  const contractDebt = Math.max(
    0,
    Number(sale.actualSalePrice || 0) - Number(sale.downPayment || 0),
  );
  const txRow = await getAsync(
    `SELECT COALESCE(SUM(it.amount_paid), 0) AS paid
       FROM installment_transactions it
       JOIN installment_payments ip ON ip.id = it.installment_payment_id
      WHERE ip.saleId = ? ${excludeTxId ? "AND it.id <> ?" : ""}`,
    excludeTxId ? [saleId, excludeTxId] : [saleId],
  );
  const transactionPaid = Math.max(0, Number(txRow?.paid || 0));

  const checkRow = await getAsync(
    `SELECT COALESCE(SUM(
              CASE
                WHEN TRIM(COALESCE(ic.status,'')) IN ('نقد شد','نقدشده','وصول شده','پاس شده','تسویه شده','پرداخت شده','تکمیل شده','paid','Paid','cashed','Cashed')
                THEN MAX(0, COALESCE(ic.amount,0) - COALESCE((
                  SELECT SUM(it.amount_paid)
                    FROM installment_payments rp
                    JOIN installment_transactions it ON it.installment_payment_id = rp.id
                   WHERE rp.sourceType = 'check_recovery'
                     AND rp.sourceId = ic.id
                     ${excludeTxId ? "AND it.id <> ?" : ""}
                ),0))
                ELSE 0
              END
            ),0) AS paid
       FROM installment_checks ic
      WHERE ic.saleId = ?`,
    excludeTxId ? [excludeTxId, saleId] : [saleId],
  );
  const cashedCheckRemainder = Math.max(0, Number(checkRow?.paid || 0));
  const collectedAfterDownPayment = transactionPaid + cashedCheckRemainder;
  const canceled = ["canceled", "cancelled"].includes(String(sale.status || "").trim().toLowerCase());
  return {
    saleId,
    contractDebt,
    transactionPaid,
    cashedCheckRemainder,
    collectedAfterDownPayment,
    remaining: canceled ? 0 : Math.max(0, contractDebt - collectedAfterDownPayment),
    overpayment: Math.max(0, collectedAfterDownPayment - contractDebt),
  };
};

export const getCheckRecoveryCollectedAmount = async (
  checkId: number,
): Promise<number> => {
  const row = await getAsync(
    `SELECT COALESCE(SUM(it.amount_paid), 0) AS paid
       FROM installment_payments ip
       JOIN installment_transactions it ON it.installment_payment_id = ip.id
      WHERE ip.sourceType = 'check_recovery'
        AND ip.sourceId = ?`,
    [checkId],
  );
  const paid = Number(row?.paid || 0);
  return Number.isFinite(paid) && paid > 0 ? paid : 0;
};

/**
 * Mirrors the financial effect of a passed check into customer_ledger.
 * Cash recoveries are already represented by installment_payment_tx rows, so
 * only the still-uncredited remainder of the check is recorded here.
 */
export const syncInstallmentCheckCustomerLedger = async (
  checkId: number,
  status: CheckStatus,
  eventDateIso?: string | null,
): Promise<void> => {
  const check = await getAsync(
    `SELECT ic.id, ic.saleId, ic.checkNumber, ic.amount, ic.cashedAt, isale.customerId
       FROM installment_checks ic
       JOIN installment_sales isale ON isale.id = ic.saleId
      WHERE ic.id = ?`,
    [checkId],
  );
  if (!check?.id || !check?.customerId) throw new Error("چک مورد نظر یافت نشد.");

  const existing = await getAsync(
    `SELECT id, transactionDate
       FROM customer_ledger
      WHERE referenceType = 'installment_check_cashed' AND referenceId = ?
      ORDER BY id ASC LIMIT 1`,
    [checkId],
  );

  const normalizedStatus = normalizeCheckStatus(status);
  if (normalizedStatus !== "نقد شد") {
    if (existing?.id) {
      await runAsync("DELETE FROM customer_ledger WHERE id = ?", [existing.id]);
      await recalcCustomerBalancesInternal(Number(check.customerId));
    }
    return;
  }

  const checkAmount = Math.max(0, Number(check.amount || 0));
  const recoveryPaid = Math.min(
    checkAmount,
    await getCheckRecoveryCollectedAmount(checkId),
  );
  const ledgerCredit = Math.max(0, checkAmount - recoveryPaid);

  if (ledgerCredit <= MONEY_EPSILON) {
    if (existing?.id) {
      await runAsync("DELETE FROM customer_ledger WHERE id = ?", [existing.id]);
      await recalcCustomerBalancesInternal(Number(check.customerId));
    }
    return;
  }

  const transactionDate =
    String(existing?.transactionDate || "").trim() ||
    String(eventDateIso || "").trim() ||
    String(check.cashedAt || "").trim();

  // برای چک Legacy که تاریخ واقعی وصول آن قابل اثبات نیست، تاریخ امروز را حدس نمی‌زنیم.
  // چنین موردی توسط Legacy Reconciliation Audit برای بررسی انسانی Flag می‌شود.
  if (!transactionDate) return;

  const description = `وصول چک شماره ${String(check.checkNumber || "—")} | شناسه فروش: ${Number(check.saleId)}`;

  if (existing?.id) {
    await runAsync(
      `UPDATE customer_ledger
          SET customerId = ?, transactionDate = ?, updatedAt = ?, description = ?,
              debit = 0, credit = ?
        WHERE id = ?`,
      [
        Number(check.customerId),
        transactionDate,
        new Date().toISOString(),
        description,
        ledgerCredit,
        existing.id,
      ],
    );
  } else {
    await addCustomerLedgerEntryInternal(
      Number(check.customerId),
      description,
      0,
      ledgerCredit,
      transactionDate,
      { referenceType: "installment_check_cashed", referenceId: checkId },
    );
  }

  await recalcCustomerBalancesInternal(Number(check.customerId));
};

export const syncCheckRecoveryLedgerForPayment = async (
  paymentId: number,
): Promise<void> => {
  const row = await getAsync(
    `SELECT ip.sourceType, ip.sourceId, ic.status
       FROM installment_payments ip
       LEFT JOIN installment_checks ic ON ic.id = ip.sourceId
      WHERE ip.id = ?`,
    [paymentId],
  );
  if (String(row?.sourceType || "") !== "check_recovery") return;
  const checkId = Number(row?.sourceId || 0);
  if (!Number.isInteger(checkId) || checkId <= 0 || !row?.status) return;
  await syncInstallmentCheckCustomerLedger(
    checkId,
    normalizeCheckStatus(row.status),
    null,
  );
};

export const removeInstallmentSaleCustomerLedger = async (
  saleId: number,
  customerId: number,
): Promise<void> => {
  await runAsync(
    `DELETE FROM customer_ledger
      WHERE (referenceType = 'installment_charge' AND referenceId = ?)
         OR (referenceType = 'installment_payment_tx' AND referenceId IN (
              SELECT it.id
                FROM installment_transactions it
                JOIN installment_payments ip ON ip.id = it.installment_payment_id
               WHERE ip.saleId = ?
            ))
         OR (referenceType = 'installment_check_cashed' AND referenceId IN (
              SELECT ic.id FROM installment_checks ic WHERE ic.saleId = ?
            ))`,
    [saleId, saleId, saleId],
  );
  await recalcCustomerBalancesInternal(customerId);
};

export const assertInstallmentReceiptDateOnOrAfterSale = async (
  paymentId: number,
  receiptIsoDate: string,
): Promise<void> => {
  const row = await getAsync(
    `SELECT isale.saleDateISO, isale.saleDate, isale.dateCreated
       FROM installment_payments ip
       JOIN installment_sales isale ON isale.id = ip.saleId
      WHERE ip.id = ?`,
    [paymentId],
  );
  if (!row) throw new Error("قسط مورد نظر یافت نشد.");
  const saleIso =
    String(row.saleDateISO || "").trim() ||
    normalizeInstallmentAccountingDate(row.saleDate, row.dateCreated);
  if (!saleIso) return;
  const receiptIso = normalizeInstallmentAccountingDate(receiptIsoDate);
  if (!receiptIso) throw new Error("تاریخ دریافت نامعتبر است.");

  const receiptDay = moment(receiptIso, "YYYY-MM-DD", true);
  const saleDay = moment(saleIso, "YYYY-MM-DD", true);
  if (!receiptDay?.isValid?.() || !saleDay?.isValid?.()) {
    throw new Error("تاریخ حسابداری قرارداد نامعتبر است.");
  }
  if (receiptDay.clone().startOf("day").isAfter(moment().startOf("day"))) {
    throw new Error("تاریخ دریافت نمی‌تواند در آینده باشد.");
  }
  if (receiptDay.startOf("day").isBefore(saleDay.startOf("day"))) {
    throw new Error("تاریخ دریافت نمی‌تواند قبل از تاریخ فروش باشد.");
  }
};
