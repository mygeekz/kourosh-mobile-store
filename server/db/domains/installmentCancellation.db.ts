import moment from "jalali-moment";
import { allAsync, execAsync, getAsync, runAsync } from "../query";
import { getDbInstance } from "../core/initRuntime";
import { addCustomerLedgerEntryInternal, recalcCustomerBalancesInternal } from "./customers.db";
import { getInstallmentSaleReceivableState } from "./installmentAccounting.db";
import { updateSaleProfitSnapshotSourceStatus } from "./profitSnapshots.db";
import { detectLegacyAccountingHumanReviewIssues } from "../migrations/legacyAccountingReconciliation";
import { normalizeCheckStatus } from "./installmentTypes";

const MONEY_EPSILON = 0.00001;

export type InstallmentCancellationMode = "full_reversal" | "review_required";
export type InstallmentCancellationSettlementStatus =
  | "settled"
  | "refund_due"
  | "customer_balance"
  | "needs_reconciliation";

export type InstallmentCancellationRequest = {
  reason: string;
  mode: InstallmentCancellationMode;
  returnPhysicalItems?: boolean;
  returnUnusedChecks?: boolean;
  userId?: number | null;
  username?: string | null;
};

export type InstallmentCancellationRefundMethod = "cash" | "card" | "bank_transfer" | "other";

export type InstallmentCancellationRefundRequest = {
  amount: number;
  paymentDate: string;
  paymentMethod: InstallmentCancellationRefundMethod;
  referenceNo?: string | null;
  notes?: string | null;
  userId?: number | null;
  username?: string | null;
};

type SaleRow = {
  id: number;
  customerId: number;
  actualSalePrice: number;
  downPayment: number;
  saleType?: string | null;
  status?: string | null;
  itemsSummary?: string | null;
  saleDate?: string | null;
  saleDateISO?: string | null;
  dateCreated?: string | null;
  cancelReason?: string | null;
  canceledAt?: string | null;
  cancellationMode?: string | null;
  cancellationSettlementStatus?: string | null;
};

const isSaleCanceled = (status: unknown) =>
  ["canceled", "cancelled"].includes(String(status || "").trim().toLowerCase());

const getSale = async (saleId: number): Promise<SaleRow> => {
  const row = await getAsync(
    `SELECT id, customerId, actualSalePrice, downPayment, saleType, status, itemsSummary,
            saleDate, saleDateISO, dateCreated, cancelReason, canceledAt,
            cancellationMode, cancellationSettlementStatus
       FROM installment_sales
      WHERE id = ?`,
    [saleId],
  );
  if (!row?.id) throw new Error("قرارداد اقساطی مورد نظر یافت نشد.");
  return row as SaleRow;
};

const getPhysicalItems = async (saleId: number) =>
  allAsync(
    `SELECT id, itemType, itemId, description, quantity, unitPrice, totalPrice
       FROM installment_sale_items
      WHERE saleId = ? AND itemType IN ('phone','inventory')
      ORDER BY id ASC`,
    [saleId],
  ).catch(() => [] as any[]);

const getChecks = async (saleId: number) => {
  const rows = await allAsync(
    `SELECT id, checkNumber, bankName, dueDate, amount, status, cashedAt
       FROM installment_checks
      WHERE saleId = ?
      ORDER BY dueDate ASC, id ASC`,
    [saleId],
  ).catch(() => [] as any[]);
  return rows.map((row: any) => ({ ...row, status: normalizeCheckStatus(row.status) }));
};

const getSaleReceiptLedgerTotals = async (saleId: number) => {
  const row = await getAsync(
    `SELECT
       COALESCE(SUM(CASE WHEN cl.referenceType = 'installment_payment_tx' THEN cl.credit ELSE 0 END),0) AS paymentCredits,
       COALESCE(SUM(CASE WHEN cl.referenceType = 'installment_check_cashed' THEN cl.credit ELSE 0 END),0) AS checkCredits
     FROM customer_ledger cl
    WHERE (cl.referenceType = 'installment_payment_tx' AND cl.referenceId IN (
            SELECT it.id
              FROM installment_transactions it
              JOIN installment_payments ip ON ip.id = it.installment_payment_id
             WHERE ip.saleId = ?
          ))
       OR (cl.referenceType = 'installment_check_cashed' AND cl.referenceId IN (
            SELECT ic.id FROM installment_checks ic WHERE ic.saleId = ?
          ))`,
    [saleId, saleId],
  );
  const paymentCredits = Math.max(0, Number(row?.paymentCredits || 0));
  const checkCredits = Math.max(0, Number(row?.checkCredits || 0));
  return { paymentCredits, checkCredits, total: paymentCredits + checkCredits };
};

const getCancellationRecord = async (saleId: number) =>
  getAsync(
    `SELECT * FROM installment_sale_cancellations WHERE saleId = ? LIMIT 1`,
    [saleId],
  );

const normalizeRefundPaymentDate = (value: unknown): string => {
  const raw = String(value ?? "").trim();
  if (!raw) throw new Error("تاریخ بازپرداخت الزامی است.");
  const parsed = moment(
    raw,
    ["jYYYY/jMM/jDD", "jYYYY/jM/jD", "YYYY-MM-DD", moment.ISO_8601],
    true,
  );
  if (!parsed.isValid()) throw new Error("تاریخ بازپرداخت معتبر نیست.");
  return `${parsed.locale("en").format("YYYY-MM-DD")}T00:00:00.000Z`;
};

const REFUND_METHODS = new Set<InstallmentCancellationRefundMethod>([
  "cash",
  "card",
  "bank_transfer",
  "other",
]);

const getCancellationRefundRows = async (saleId: number) =>
  allAsync(
    `SELECT id, cancellationId, saleId, customerId, amount, paymentDate, paymentMethod,
            referenceNo, notes, createdByUserId, createdByUsername, createdAt
       FROM installment_cancellation_refunds
      WHERE saleId = ?
      ORDER BY datetime(paymentDate) ASC, id ASC`,
    [saleId],
  ).catch(() => [] as any[]);

export const getInstallmentCancellationRefundStateFromDb = async (saleId: number) => {
  await getDbInstance();
  const sale = await getSale(saleId);
  const cancellation = await getCancellationRecord(saleId);
  if (!cancellation?.id) {
    return {
      saleId,
      canceled: false,
      expectedRefundDue: 0,
      refundedAmount: 0,
      remainingRefund: 0,
      refundStatus: "not_applicable",
      refunds: [],
    };
  }
  const refunds = await getCancellationRefundRows(saleId);
  const expectedRefundDue = Math.max(0, Number(cancellation.expectedRefundDue || 0));
  const refundedAmount = refunds.reduce(
    (sum: number, row: any) => sum + Math.max(0, Number(row?.amount || 0)),
    0,
  );
  const remainingRefund = Math.max(0, expectedRefundDue - refundedAmount);
  const refundStatus = expectedRefundDue <= MONEY_EPSILON
    ? "not_applicable"
    : remainingRefund <= MONEY_EPSILON
      ? "refunded"
      : refundedAmount > MONEY_EPSILON
        ? "partial"
        : "due";

  return {
    saleId,
    cancellationId: Number(cancellation.id),
    customerId: Number(sale.customerId),
    canceled: isSaleCanceled(sale.status),
    canceledAt: sale.canceledAt || cancellation.createdAt || null,
    settlementStatus: cancellation.settlementStatus || sale.cancellationSettlementStatus || null,
    expectedRefundDue,
    refundedAmount,
    remainingRefund,
    refundStatus,
    refunds,
  };
};

const countSaleReconciliationIssues = async (saleId: number) => {
  const issues = await detectLegacyAccountingHumanReviewIssues();
  return issues.filter((issue) => {
    if (Number(issue.saleId || 0) === saleId) return true;
    const saleIds = Array.isArray(issue.details?.saleIds) ? issue.details.saleIds : [];
    return saleIds.map(Number).includes(saleId);
  });
};

export const getInstallmentCancellationPreviewFromDb = async (
  saleId: number,
  mode: InstallmentCancellationMode = "review_required",
) => {
  await getDbInstance();
  const sale = await getSale(saleId);
  const existingCancellation = await getCancellationRecord(saleId);
  const physicalItems = await getPhysicalItems(saleId);
  const checks = await getChecks(saleId);
  const receivable = await getInstallmentSaleReceivableState(saleId);
  const ledgerReceipts = await getSaleReceiptLedgerTotals(saleId);
  const issues = await countSaleReconciliationIssues(saleId);

  const unusedChecks = checks.filter((check: any) =>
    ["نزد فروشنده", "در جریان وصول"].includes(String(check.status || "")),
  );
  const cashedChecks = checks.filter((check: any) => check.status === "نقد شد");
  const returnedChecks = checks.filter(
    (check: any) => check.status === "به مشتری برگشت داده شده",
  );
  const expectedRefundDue = Math.max(
    0,
    Number(sale.downPayment || 0) + receivable.collectedAfterDownPayment,
  );
  const receiptLedgerGap = Math.max(
    0,
    receivable.collectedAfterDownPayment - ledgerReceipts.total,
  );

  return {
    saleId,
    saleStatus: isSaleCanceled(sale.status) ? "canceled" : "active",
    existingCancellation: existingCancellation || null,
    mode,
    contract: {
      actualSalePrice: Number(sale.actualSalePrice || 0),
      downPayment: Number(sale.downPayment || 0),
      contractDebt: receivable.contractDebt,
      itemsSummary: sale.itemsSummary || null,
    },
    receivable: {
      collectedAfterDownPayment: receivable.collectedAfterDownPayment,
      remaining: receivable.remaining,
      overpayment: receivable.overpayment,
      expectedRefundDue,
      ledgerRecordedReceipts: ledgerReceipts.total,
      receiptLedgerGap,
    },
    inventory: {
      physicalItems,
      physicalItemRows: physicalItems.length,
      physicalQuantity: physicalItems.reduce(
        (sum: number, item: any) => sum + Math.max(0, Number(item.quantity || 0)),
        0,
      ),
    },
    checks: {
      total: checks.length,
      unused: unusedChecks.length,
      cashed: cashedChecks.length,
      returned: returnedChecks.length,
      unusedItems: unusedChecks,
    },
    reconciliation: {
      issueCount: issues.length,
      highIssueCount: issues.filter((issue) => issue.severity === "high").length,
      issueKeys: issues.map((issue) => issue.issueKey),
    },
    effects: {
      mode,
      willReverseContractCharge: mode === "full_reversal",
      reversalCredit: mode === "full_reversal" ? receivable.contractDebt : 0,
      downPaymentRefundCredit:
        mode === "full_reversal" ? Number(sale.downPayment || 0) : 0,
      expectedRefundDue: mode === "full_reversal" ? expectedRefundDue : 0,
      financialTermsRemainForReview: mode === "review_required",
    },
  };
};

const restoreReturnedPhysicalItems = async (saleId: number) => {
  const items = await getPhysicalItems(saleId);
  const returnDateShamsi = moment().locale("fa").format("jYYYY/jMM/jDD");
  let restoredRows = 0;
  let alreadyReturnedRows = 0;
  const unresolved: Array<{
    itemType: string;
    itemId: number;
    description?: string | null;
    reason: string;
    currentStatus?: string | null;
  }> = [];

  for (const item of items as any[]) {
    const itemId = Number(item.itemId || 0);
    const qty = Math.max(0, Number(item.quantity || 0));
    if (!itemId || qty <= 0) {
      unresolved.push({
        itemType: String(item.itemType || "unknown"),
        itemId,
        description: item.description || null,
        reason: "شناسه یا تعداد قلم برای بازگشت موجودی معتبر نیست.",
      });
      continue;
    }

    if (item.itemType === "inventory") {
      const result = await runAsync(
        `UPDATE products
            SET stock_quantity = stock_quantity + ?,
                saleCount = CASE WHEN saleCount >= ? THEN saleCount - ? ELSE 0 END
          WHERE id = ?`,
        [qty, qty, qty, itemId],
      );
      if (Number(result.changes || 0) > 0) restoredRows += 1;
      else
        unresolved.push({
          itemType: "inventory",
          itemId,
          description: item.description || null,
          reason: "کالای متناظر در موجودی یافت نشد؛ هیچ مقدار حدسی به انبار اضافه نشد.",
        });
      continue;
    }

    if (item.itemType === "phone") {
      const phone = await getAsync("SELECT status FROM phones WHERE id = ?", [itemId]);
      if (!phone) {
        unresolved.push({
          itemType: "phone",
          itemId,
          description: item.description || null,
          reason: "گوشی متناظر در انبار یافت نشد.",
        });
        continue;
      }
      const currentStatus = String(phone.status || "").trim();
      if (["موجود در انبار", "مرجوعی", "مرجوعی اقساطی"].includes(currentStatus)) {
        alreadyReturnedRows += 1;
        continue;
      }
      if (currentStatus !== "فروخته شده (قسطی)") {
        unresolved.push({
          itemType: "phone",
          itemId,
          description: item.description || null,
          currentStatus,
          reason: "وضعیت فعلی گوشی با اثر قابل‌اثبات این قرارداد تطابق ندارد؛ وضعیت آن خودکار تغییر نکرد.",
        });
        continue;
      }
      const result = await runAsync(
        `UPDATE phones
            SET status = 'مرجوعی اقساطی', saleDate = NULL, returnDate = ?
          WHERE id = ? AND status = 'فروخته شده (قسطی)'`,
        [returnDateShamsi, itemId],
      );
      if (Number(result.changes || 0) > 0) restoredRows += 1;
      else
        unresolved.push({
          itemType: "phone",
          itemId,
          description: item.description || null,
          currentStatus,
          reason: "وضعیت گوشی هم‌زمان تغییر کرده است؛ بازگشت خودکار انجام نشد.",
        });
    }
  }

  return {
    restoredRows,
    alreadyReturnedRows,
    unresolvedRows: unresolved.length,
    unresolved,
  };
};

const returnUnusedChecks = async (saleId: number) => {
  const checks = await getChecks(saleId);
  const ids = checks
    .filter((check: any) =>
      ["نزد فروشنده", "در جریان وصول"].includes(String(check.status || "")),
    )
    .map((check: any) => Number(check.id || 0))
    .filter((id: number) => id > 0);
  if (!ids.length) return 0;

  const placeholders = ids.map(() => "?").join(",");
  const result = await runAsync(
    `UPDATE installment_checks
        SET status = 'به مشتری برگشت داده شده', cashedAt = NULL
      WHERE saleId = ? AND id IN (${placeholders})`,
    [saleId, ...ids],
  );
  return Number(result.changes || 0);
};

const addCancellationLedgerEntries = async (
  sale: SaleRow,
  contractDebt: number,
  downPayment: number,
  canceledAt: string,
  reason: string,
) => {
  let reversalCredit = 0;
  let downPaymentRefundCredit = 0;

  if (contractDebt > MONEY_EPSILON) {
    await addCustomerLedgerEntryInternal(
      Number(sale.customerId),
      `فسخ قرارداد اقساطی #${sale.id} — برگشت بدهی قرارداد | دلیل: ${reason}`,
      0,
      contractDebt,
      canceledAt,
      { referenceType: "installment_cancellation_reversal", referenceId: Number(sale.id) },
    );
    reversalCredit = contractDebt;
  }

  if (downPayment > MONEY_EPSILON) {
    await addCustomerLedgerEntryInternal(
      Number(sale.customerId),
      `فسخ قرارداد اقساطی #${sale.id} — پیش‌پرداخت قابل استرداد | دلیل: ${reason}`,
      0,
      downPayment,
      canceledAt,
      { referenceType: "installment_cancellation_downpayment_refund_due", referenceId: Number(sale.id) },
    );
    downPaymentRefundCredit = downPayment;
  }

  return { reversalCredit, downPaymentRefundCredit };
};

export const cancelInstallmentSaleFromDb = async (
  saleId: number,
  request: InstallmentCancellationRequest,
) => {
  await getDbInstance();
  const reason = String(request.reason || "").trim();
  const mode: InstallmentCancellationMode =
    request.mode === "full_reversal" ? "full_reversal" : "review_required";
  const returnPhysicalItems = Boolean(request.returnPhysicalItems);
  const shouldReturnUnusedChecks = Boolean(request.returnUnusedChecks);

  if (!reason) throw new Error("ثبت دلیل فسخ قرارداد الزامی است.");

  const preview = await getInstallmentCancellationPreviewFromDb(saleId, mode);
  if (preview.saleStatus === "canceled") {
    return {
      canceled: true,
      alreadyCanceled: true,
      saleId,
      cancellation: preview.existingCancellation,
      preview,
    };
  }

  if (
    mode === "full_reversal" &&
    preview.inventory.physicalItemRows > 0 &&
    !returnPhysicalItems
  ) {
    throw new Error(
      "برای فسخ با برگشت کامل مالی، بازگشت اقلام فیزیکی باید تأیید شود. در غیر این صورت حالت «نیازمند تسویه و تطبیق» را انتخاب کنید.",
    );
  }

  const canceledAt = new Date().toISOString();
  const contractDebt = Number(preview.contract.contractDebt || 0);
  const downPayment = Number(preview.contract.downPayment || 0);
  const collectedAfterDownPayment = Number(
    preview.receivable.collectedAfterDownPayment || 0,
  );
  const expectedRefundDue =
    mode === "full_reversal"
      ? Math.max(0, downPayment + collectedAfterDownPayment)
      : 0;

  await execAsync("BEGIN TRANSACTION;");
  try {
    const sale = await getSale(saleId);
    if (isSaleCanceled(sale.status)) {
      await execAsync("ROLLBACK;");
      return { canceled: true, alreadyCanceled: true, saleId };
    }

    let physicalRestore = {
      restoredRows: 0,
      alreadyReturnedRows: 0,
      unresolvedRows: 0,
      unresolved: [] as Array<any>,
    };
    if (returnPhysicalItems) {
      physicalRestore = await restoreReturnedPhysicalItems(saleId);
    }

    let returnedCheckRows = 0;
    if (shouldReturnUnusedChecks) {
      returnedCheckRows = await returnUnusedChecks(saleId);
    }

    let reversalCredit = 0;
    let downPaymentRefundCredit = 0;
    if (mode === "full_reversal") {
      const ledger = await addCancellationLedgerEntries(
        sale,
        contractDebt,
        downPayment,
        canceledAt,
        reason,
      );
      reversalCredit = ledger.reversalCredit;
      downPaymentRefundCredit = ledger.downPaymentRefundCredit;
    }

    await updateSaleProfitSnapshotSourceStatus(
      "installment_sale",
      saleId,
      "canceled",
    );

    const knownIssueCount = Number(preview.reconciliation.issueCount || 0);
    const unresolvedInventory =
      (preview.inventory.physicalItemRows > 0 && !returnPhysicalItems) ||
      physicalRestore.unresolvedRows > 0;
    const unresolvedChecks = preview.checks.unused > 0 && !shouldReturnUnusedChecks;
    const receiptLedgerGap = Number(preview.receivable.receiptLedgerGap || 0);
    const reconciliationNeeded =
      mode === "review_required" ||
      knownIssueCount > 0 ||
      unresolvedInventory ||
      unresolvedChecks ||
      receiptLedgerGap > MONEY_EPSILON;

    let settlementStatus: InstallmentCancellationSettlementStatus;
    if (reconciliationNeeded) settlementStatus = "needs_reconciliation";
    else if (expectedRefundDue > MONEY_EPSILON) settlementStatus = "refund_due";
    else settlementStatus = "settled";

    const snapshot = {
      version: 1,
      canceledAt,
      mode,
      reason,
      contract: preview.contract,
      receivableBeforeCancellation: preview.receivable,
      inventory: {
        ...preview.inventory,
        returnPhysicalItems,
        restoredPhysicalRows: physicalRestore.restoredRows,
        alreadyReturnedRows: physicalRestore.alreadyReturnedRows,
        unresolvedRows: physicalRestore.unresolvedRows,
        unresolved: physicalRestore.unresolved,
      },
      checks: {
        ...preview.checks,
        returnUnusedChecks: shouldReturnUnusedChecks,
        returnedCheckRows,
      },
      reconciliationBeforeCancellation: preview.reconciliation,
      expectedRefundDue,
      ledger: { reversalCredit, downPaymentRefundCredit },
    };

    await runAsync(
      `INSERT INTO installment_sale_cancellations
        (saleId, mode, reason, returnPhysicalItems, returnUnusedChecks,
         contractDebt, downPayment, collectedAfterDownPayment,
         remainingBeforeCancellation, overpaymentBeforeCancellation,
         expectedRefundDue, ledgerReversalCredit, downPaymentRefundCredit,
         settlementStatus, reconciliationIssueCount, snapshotJson,
         createdByUserId, createdByUsername, createdAt)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        saleId,
        mode,
        reason,
        returnPhysicalItems ? 1 : 0,
        shouldReturnUnusedChecks ? 1 : 0,
        contractDebt,
        downPayment,
        collectedAfterDownPayment,
        Number(preview.receivable.remaining || 0),
        Number(preview.receivable.overpayment || 0),
        expectedRefundDue,
        reversalCredit,
        downPaymentRefundCredit,
        settlementStatus,
        knownIssueCount,
        JSON.stringify(snapshot),
        request.userId ?? null,
        request.username ?? null,
        canceledAt,
      ],
    );

    const cancellationMeta = {
      returnPhysicalItems,
      returnUnusedChecks: shouldReturnUnusedChecks,
      expectedRefundDue,
      knownIssueCount,
      receiptLedgerGap,
    };
    await runAsync(
      `UPDATE installment_sales
          SET status = 'canceled',
              canceledAt = ?,
              cancelReason = ?,
              cancellationMode = ?,
              cancellationSettlementStatus = ?,
              cancellationMetaJson = ?
        WHERE id = ?`,
      [
        canceledAt,
        reason,
        mode,
        settlementStatus,
        JSON.stringify(cancellationMeta),
        saleId,
      ],
    );

    await execAsync("COMMIT;");
    return {
      canceled: true,
      alreadyCanceled: false,
      saleId,
      settlementStatus,
      expectedRefundDue,
      reconciliationNeeded,
      restoredPhysicalRows: physicalRestore.restoredRows,
      alreadyReturnedPhysicalRows: physicalRestore.alreadyReturnedRows,
      unresolvedPhysicalRows: physicalRestore.unresolvedRows,
      returnedCheckRows,
      cancellation: await getCancellationRecord(saleId),
    };
  } catch (error) {
    await execAsync("ROLLBACK;").catch(() => undefined);
    throw error;
  }
};

export const addInstallmentCancellationRefundFromDb = async (
  saleId: number,
  request: InstallmentCancellationRefundRequest,
) => {
  await getDbInstance();
  const amount = Number(request.amount || 0);
  if (!Number.isFinite(amount) || amount <= MONEY_EPSILON) {
    throw new Error("مبلغ بازپرداخت باید بیشتر از صفر باشد.");
  }
  const paymentMethod = String(request.paymentMethod || "").trim() as InstallmentCancellationRefundMethod;
  if (!REFUND_METHODS.has(paymentMethod)) throw new Error("روش بازپرداخت معتبر نیست.");
  const paymentDate = normalizeRefundPaymentDate(request.paymentDate);
  const referenceNo = String(request.referenceNo || "").trim() || null;
  const notes = String(request.notes || "").trim() || null;

  await execAsync("BEGIN IMMEDIATE TRANSACTION;");
  try {
    const sale = await getSale(saleId);
    if (!isSaleCanceled(sale.status)) throw new Error("بازپرداخت فسخ فقط برای قرارداد فسخ‌شده قابل ثبت است.");

    const cancellation = await getCancellationRecord(saleId);
    if (!cancellation?.id) throw new Error("سند فسخ قرارداد یافت نشد.");
    const expectedRefundDue = Math.max(0, Number(cancellation.expectedRefundDue || 0));
    if (expectedRefundDue <= MONEY_EPSILON) {
      throw new Error("برای این فسخ مبلغ قابل استرداد قابل‌اثباتی ثبت نشده است.");
    }

    const canceledDay = String(sale.canceledAt || cancellation.createdAt || "").slice(0, 10);
    const paymentDay = paymentDate.slice(0, 10);
    if (canceledDay && paymentDay < canceledDay) {
      throw new Error("تاریخ بازپرداخت نمی‌تواند قبل از تاریخ فسخ قرارداد باشد.");
    }
    const today = moment().locale("en").format("YYYY-MM-DD");
    if (paymentDay > today) throw new Error("تاریخ بازپرداخت نمی‌تواند در آینده باشد.");

    const paidRow = await getAsync(
      `SELECT COALESCE(SUM(amount), 0) AS total
         FROM installment_cancellation_refunds
        WHERE cancellationId = ?`,
      [cancellation.id],
    );
    const refundedBefore = Math.max(0, Number(paidRow?.total || 0));
    const remainingBefore = Math.max(0, expectedRefundDue - refundedBefore);
    if (remainingBefore <= MONEY_EPSILON) throw new Error("مبلغ قابل استرداد این قرارداد قبلاً به‌طور کامل پرداخت شده است.");
    if (amount - remainingBefore > MONEY_EPSILON) {
      throw new Error(`مبلغ بازپرداخت از مانده قابل استرداد بیشتر است. مانده فعلی: ${remainingBefore.toLocaleString("fa-IR")} تومان.`);
    }

    const insert = await runAsync(
      `INSERT INTO installment_cancellation_refunds
        (cancellationId, saleId, customerId, amount, paymentDate, paymentMethod, referenceNo, notes,
         createdByUserId, createdByUsername, createdAt)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        Number(cancellation.id),
        saleId,
        Number(sale.customerId),
        amount,
        paymentDate,
        paymentMethod,
        referenceNo,
        notes,
        request.userId ?? null,
        request.username ?? null,
        new Date().toISOString(),
      ],
    );
    const refundId = Number(insert.lastID);

    await addCustomerLedgerEntryInternal(
      Number(sale.customerId),
      `بازپرداخت فسخ قرارداد اقساطی #${saleId}${referenceNo ? ` | پیگیری: ${referenceNo}` : ""}${notes ? ` | ${notes}` : ""}`,
      amount,
      0,
      paymentDate,
      { referenceType: "installment_cancellation_refund_payment", referenceId: saleId },
    );
    // تاریخ بازپرداخت ممکن است Backdated باشد؛ تمام مانده‌های بعدی باید دوباره محاسبه شوند.
    await recalcCustomerBalancesInternal(Number(sale.customerId));

    const refundedAmount = refundedBefore + amount;
    const remainingRefund = Math.max(0, expectedRefundDue - refundedAmount);
    const previousSettlement = String(cancellation.settlementStatus || "");
    const nextSettlementStatus =
      previousSettlement === "needs_reconciliation"
        ? "needs_reconciliation"
        : remainingRefund <= MONEY_EPSILON
          ? "settled"
          : "refund_due";

    await runAsync(
      `UPDATE installment_sale_cancellations SET settlementStatus = ? WHERE id = ?`,
      [nextSettlementStatus, cancellation.id],
    );
    await runAsync(
      `UPDATE installment_sales SET cancellationSettlementStatus = ? WHERE id = ?`,
      [nextSettlementStatus, saleId],
    );

    await execAsync("COMMIT;");
    return {
      refundId,
      saleId,
      cancellationId: Number(cancellation.id),
      amount,
      paymentDate,
      paymentMethod,
      referenceNo,
      refundedAmount,
      remainingRefund,
      refundStatus: remainingRefund <= MONEY_EPSILON ? "refunded" : "partial",
      settlementStatus: nextSettlementStatus,
    };
  } catch (error) {
    await execAsync("ROLLBACK;").catch(() => undefined);
    throw error;
  }
};

export const assertInstallmentSaleIsMutable = async (saleId: number) => {
  const sale = await getSale(saleId);
  if (isSaleCanceled(sale.status)) {
    throw new Error(
      "این قرارداد فسخ شده است و عملیات مالی جدید روی آن مجاز نیست. تاریخچه فقط برای مشاهده نگه‌داری می‌شود.",
    );
  }
};

export const assertInstallmentPaymentIsMutable = async (paymentId: number) => {
  const row = await getAsync(
    `SELECT ip.saleId, isale.status
       FROM installment_payments ip
       JOIN installment_sales isale ON isale.id = ip.saleId
      WHERE ip.id = ?`,
    [paymentId],
  );
  if (!row?.saleId) throw new Error("قسط مورد نظر یافت نشد.");
  if (isSaleCanceled(row.status)) {
    throw new Error(
      "این قرارداد فسخ شده است و ثبت، ویرایش یا حذف پرداخت روی آن مجاز نیست.",
    );
  }
};

export const assertInstallmentCheckIsMutable = async (checkId: number) => {
  const row = await getAsync(
    `SELECT ic.saleId, isale.status
       FROM installment_checks ic
       JOIN installment_sales isale ON isale.id = ic.saleId
      WHERE ic.id = ?`,
    [checkId],
  );
  if (!row?.saleId) throw new Error("چک مورد نظر یافت نشد.");
  if (isSaleCanceled(row.status)) {
    throw new Error(
      "این قرارداد فسخ شده است و تغییر وضعیت یا ثبت دریافت جدید برای چک‌های آن مجاز نیست.",
    );
  }
};
