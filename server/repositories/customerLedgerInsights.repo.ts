import moment from "jalali-moment";
import { getAsync } from "../db/query";

export type CustomerLedgerInsights = {
  customerId: number;
  currentBalance: number; // >0 بدهکار، <0 بستانکار
  totalDebit: number;
  totalCredit: number;
  lastPaymentDate: string | null; // ISO
  daysSinceLastPayment: number | null;
  overdueInstallmentsCount: number;
  overdueChecksCount: number;
  riskLevel: "low" | "medium" | "high";
  score: number; // 0..100 (خوش‌حسابی)
  suggestedActions: string[];
};

export const getCustomerLedgerInsightsFromDb = async (
  customerId: number,
): Promise<CustomerLedgerInsights> => {
  const totals = await getAsync(
    `SELECT 
        COALESCE(SUM(debit),0) AS totalDebit,
        COALESCE(SUM(credit),0) AS totalCredit,
        (SELECT balance FROM customer_ledger WHERE customerId = ? ORDER BY id DESC LIMIT 1) AS currentBalance
      FROM customer_ledger
     WHERE customerId = ?`,
    [customerId, customerId],
  );

  const lastPay = await getAsync(
    `SELECT transactionDate AS lastPaymentDate
       FROM customer_ledger
      WHERE customerId = ? AND credit > 0
        AND LOWER(COALESCE(referenceType,'')) NOT IN (
          'installment_cancellation_reversal',
          'installment_cancellation_downpayment_refund_due'
        )
      ORDER BY transactionDate DESC, id DESC
      LIMIT 1`,
    [customerId],
  );

  // Overdue installments / checks based on Jalali date string YYYY/MM/DD (lexicographic works)
  const todayJ = moment().locale("fa").format("jYYYY/jMM/jDD");

  const overdueInstallmentsRow = await getAsync(
    `SELECT COALESCE(COUNT(*),0) AS cnt
       FROM installment_payments ip
       JOIN installment_sales s ON s.id = ip.saleId
      WHERE s.customerId = ?
        AND COALESCE(s.status,'active') = 'active'
        AND COALESCE(ip.sourceType,'installment') = 'installment'
        AND ip.dueDate < ?
        AND MAX(0, COALESCE(ip.amountDue,0) - COALESCE((
              SELECT SUM(it.amount_paid)
                FROM installment_transactions it
               WHERE it.installment_payment_id = ip.id
            ),0)) > 0.00001`,
    [customerId, todayJ],
  );

  const overdueChecksRow = await getAsync(
    `SELECT COALESCE(COUNT(*),0) AS cnt
       FROM installment_checks ic
       JOIN installment_sales s ON s.id = ic.saleId
      WHERE s.customerId = ?
        AND COALESCE(s.status,'active') = 'active'
        AND ic.dueDate < ?
        AND TRIM(COALESCE(ic.status,'')) NOT IN ('نقد شد','نقدشده','وصول شده','پاس شده','تسویه شده','پرداخت شده','تکمیل شده','paid','Paid','cashed','Cashed')
        AND MAX(0, COALESCE(ic.amount,0) - COALESCE((
              SELECT SUM(it.amount_paid)
                FROM installment_payments rp
                JOIN installment_transactions it ON it.installment_payment_id = rp.id
               WHERE rp.sourceType = 'check_recovery' AND rp.sourceId = ic.id
            ),0)) > 0.00001`,
    [customerId, todayJ],
  );

  const currentBalance = Number(totals?.currentBalance || 0);
  const totalDebit = Number(totals?.totalDebit || 0);
  const totalCredit = Number(totals?.totalCredit || 0);

  const lastPaymentDate = lastPay?.lastPaymentDate
    ? String(lastPay.lastPaymentDate)
    : null;

  let daysSinceLastPayment: number | null = null;
  if (lastPaymentDate) {
    const diff = moment().diff(moment(lastPaymentDate), "days");
    daysSinceLastPayment = Number.isFinite(diff) ? diff : null;
  }

  const overdueInstallmentsCount = Number(overdueInstallmentsRow?.cnt || 0);
  const overdueChecksCount = Number(overdueChecksRow?.cnt || 0);

  // Risk heuristic (simple but useful)
  let riskLevel: "low" | "medium" | "high" = "low";
  const overdueAny = overdueInstallmentsCount + overdueChecksCount;

  if (currentBalance > 0 && overdueAny >= 2) riskLevel = "high";
  else if (currentBalance > 0 && overdueAny >= 1) riskLevel = "medium";
  else if (currentBalance > 0 && (daysSinceLastPayment ?? 0) >= 30)
    riskLevel = "medium";

  // Score (0..100) + suggested actions
  let score = 100;

  // debt penalty (only if debtor)
  if (currentBalance > 0) {
    // every 1,000,000 تومان debt => -10 (cap -40)
    const debtPenalty = Math.min(
      40,
      Math.floor(currentBalance / 1_000_000) * 10,
    );
    score -= debtPenalty;
  }

  // overdue penalties
  score -= Math.min(30, overdueInstallmentsCount * 15);
  score -= Math.min(40, overdueChecksCount * 20);

  // inactivity penalty
  if ((daysSinceLastPayment ?? 0) >= 60) score -= 20;
  else if ((daysSinceLastPayment ?? 0) >= 30) score -= 10;

  if (score < 0) score = 0;
  if (score > 100) score = 100;

  const suggestedActions: string[] = [];

  if (overdueAny > 0) {
    suggestedActions.push("یادآوری فوری بابت سررسیدهای گذشته");
  }
  if (currentBalance > 0 && score < 60) {
    suggestedActions.push("برای فروش جدید، پیش‌پرداخت/تسویه بگیر");
  } else if (currentBalance > 0 && score >= 60) {
    suggestedActions.push("پیگیری ملایم برای تسویه یا پرداخت بخشی از بدهی");
  }
  if ((daysSinceLastPayment ?? 0) >= 45 && currentBalance > 0) {
    suggestedActions.push("تماس پیگیری (بیش از ۴۵ روز از آخرین پرداخت)");
  }
  if (currentBalance < -0.00001) {
    suggestedActions.push("مشتری بستانکار است — مانده قابل استرداد/تسویه را بررسی کنید");
  } else if (Math.abs(currentBalance) <= 0.00001 && overdueAny === 0) {
    suggestedActions.push("حساب مشتری تسویه است — امکان ارائه تخفیف/اعتبار");
  }

  // Risk level (derived from score + overdue)
  if (score <= 40 || (currentBalance > 0 && overdueAny >= 2))
    riskLevel = "high";
  else if (score <= 70 || (currentBalance > 0 && overdueAny >= 1))
    riskLevel = "medium";
  else riskLevel = "low";

  return {
    customerId,
    currentBalance,
    totalDebit,
    totalCredit,
    lastPaymentDate,
    daysSinceLastPayment,
    overdueInstallmentsCount,
    overdueChecksCount,
    riskLevel,
    score,
    suggestedActions,
  };
};
