import moment from "jalali-moment";
import { allAsync } from "../database";

export type SalesAdvisorSeverity = "critical" | "warning" | "info" | "success";

export type SalesAdvisorInsight = {
  id: string;
  title: string;
  summary: string;
  severity: SalesAdvisorSeverity;
  confidence: number;
  icon?: string;
  reasons?: string[];
  metrics?: Array<{ label: string; value: string }>;
  actionLabel?: string;
  actionTo?: string;
};

export const salesAdvisorNum = (value: any) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

export const salesAdvisorClamp = (value: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, Math.round(value)));

export const salesAdvisorMoney = (value: number) =>
  `${salesAdvisorNum(value).toLocaleString("fa-IR")} تومان`;

const calculateSalesAdvisorConfidence = (params: {
  dataQuality: number;
  evidenceCount: number;
  uncertaintyPenalty?: number;
  severity?: SalesAdvisorSeverity;
  customerResolved?: boolean;
  hasRealCostBasis?: boolean;
  customerTrustScore?: number | null;
  customerTrustConfidence?: number | null;
}) => {
  const severityBonus: Record<SalesAdvisorSeverity, number> = {
    critical: 8,
    warning: 6,
    info: 2,
    success: 4,
  };
  const evidenceScore = Math.min(22, Math.max(0, params.evidenceCount) * 5);
  const costBonus = params.hasRealCostBasis ? 8 : 0;
  const customerBaseBonus = params.customerResolved ? 5 : 0;
  const trustScore =
    typeof params.customerTrustScore === "number"
      ? params.customerTrustScore
      : null;
  const trustConfidence =
    typeof params.customerTrustConfidence === "number"
      ? params.customerTrustConfidence
      : null;
  const customerTrustAdjustment =
    trustScore == null
      ? 0
      : trustScore >= 85
        ? 10
        : trustScore >= 70
          ? 6
          : trustScore >= 55
            ? 2
            : trustScore >= 40
              ? -6
              : -14;
  const trustUncertaintyPenalty =
    trustConfidence == null ? 0 : Math.max(0, 70 - trustConfidence) * 0.12;
  const raw =
    30 +
    params.dataQuality * 0.35 +
    evidenceScore +
    costBonus +
    customerBaseBonus +
    customerTrustAdjustment +
    severityBonus[params.severity || "info"] -
    (params.uncertaintyPenalty || 0) -
    trustUncertaintyPenalty;
  return salesAdvisorClamp(raw, 30, 98);
};

export type CustomerSalesTrustProfile = {
  customerId: number;
  score: number;
  confidence: number;
  tier: "excellent" | "good" | "medium" | "risky" | "unknown";
  tierLabel: string;
  purchaseCount: number;
  totalPurchaseAmount: number;
  creditSalesCount: number;
  installmentSalesCount: number;
  installmentObligationCount: number;
  onTimePaymentCount: number;
  latePaymentCount: number;
  overdueUnpaidCount: number;
  returnedCheckCount: number;
  currentBalance: number;
  suggestedCreditLimit: number;
  remainingSuggestedCredit: number;
  lastPurchaseDate?: string | null;
  reasons: string[];
  cashSalesCount?: number;
  ledgerPaymentCount?: number;
  ledgerPaymentAmount?: number;
  customerCreditBalance?: number;
  oldestOpenDebtAgeDays?: number | null;
};

export const salesAdvisorParseDate = (value: any): moment.Moment | null => {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const formats = ["jYYYY/jMM/jDD", "jYYYY-MM-DD", "YYYY-MM-DD", "YYYY/MM/DD"];
  for (const format of formats) {
    const parsed = moment(raw, format, true);
    if (parsed.isValid()) return parsed;
  }
  try {
    const parsed = moment.from(raw, "fa", "YYYY/MM/DD");
    if (parsed.isValid()) return parsed;
  } catch {}
  const fallback = moment(raw);
  return fallback.isValid() ? fallback : null;
};

const salesAdvisorDaysFromNowAbs = (dateValue: any) => {
  const parsed = salesAdvisorParseDate(dateValue);
  if (!parsed) return null;
  return Math.abs(moment().startOf("day").diff(parsed.startOf("day"), "days"));
};

export const getCustomerSalesTrustProfileFromDb = async (
  customerId: number,
  customer: any | null,
): Promise<CustomerSalesTrustProfile | null> => {
  if (!customerId) return null;

  const safeRows = async (sql: string, params: any[] = []) =>
    allAsync(sql, params).catch(() => [] as any[]);

  const salesOrders = await safeRows(
    `SELECT id, paymentMethod, grandTotal, transactionDate, status
       FROM sales_orders
      WHERE customerId = ?
        AND (status IS NULL OR status = 'active')
      ORDER BY transactionDate DESC, id DESC`,
    [customerId],
  );

  const legacySales = await safeRows(
    `SELECT id, paymentMethod, totalPrice AS grandTotal, transactionDate
       FROM sales_transactions
      WHERE customerId = ?
      ORDER BY transactionDate DESC, id DESC`,
    [customerId],
  );

  const installmentSales = await safeRows(
    `SELECT id, actualSalePrice, downPayment, numberOfInstallments, saleDate, dateCreated
       FROM installment_sales
      WHERE customerId = ?
        AND COALESCE(status,'active') = 'active'
      ORDER BY COALESCE(saleDate, dateCreated) DESC, id DESC`,
    [customerId],
  );

  const installmentPayments = await safeRows(
    `SELECT p.id, p.saleId, p.dueDate, p.paymentDate, p.status, p.amountDue
       FROM installment_payments p
       INNER JOIN installment_sales s ON s.id = p.saleId
      WHERE s.customerId = ?
        AND COALESCE(s.status,'active') = 'active'`,
    [customerId],
  );

  const installmentChecks = await safeRows(
    `SELECT c.id, c.saleId, c.dueDate, c.status, c.amount
       FROM installment_checks c
       INNER JOIN installment_sales s ON s.id = c.saleId
      WHERE s.customerId = ?
        AND COALESCE(s.status,'active') = 'active'`,
    [customerId],
  );

  const ledgerRows = await safeRows(
    `SELECT id, transactionDate, createdAt, updatedAt, description, debit, credit, balance, referenceType, referenceId
       FROM customer_ledger
      WHERE customerId = ?
      ORDER BY COALESCE(transactionDate, createdAt, updatedAt) ASC, id ASC`,
    [customerId],
  );

  const normalizedMethod = (value: any) =>
    String(value || "cash")
      .trim()
      .toLowerCase();
  const allSales = [...salesOrders, ...legacySales];
  const cashSales = allSales.filter(
    (row: any) => normalizedMethod(row.paymentMethod) !== "credit",
  );
  const creditSales = allSales.filter(
    (row: any) => normalizedMethod(row.paymentMethod) === "credit",
  );

  const salesTotal = allSales.reduce(
    (sum: number, row: any) =>
      sum + Math.max(0, salesAdvisorNum(row.grandTotal)),
    0,
  );
  const cashSalesTotal = cashSales.reduce(
    (sum: number, row: any) =>
      sum + Math.max(0, salesAdvisorNum(row.grandTotal)),
    0,
  );
  const creditSalesTotal = creditSales.reduce(
    (sum: number, row: any) =>
      sum + Math.max(0, salesAdvisorNum(row.grandTotal)),
    0,
  );
  const installmentTotal = installmentSales.reduce(
    (sum: number, row: any) =>
      sum + Math.max(0, salesAdvisorNum(row.actualSalePrice)),
    0,
  );
  const installmentDownPaymentTotal = installmentSales.reduce(
    (sum: number, row: any) =>
      sum + Math.max(0, salesAdvisorNum(row.downPayment)),
    0,
  );
  const installmentCreditExposure = Math.max(
    0,
    installmentTotal - installmentDownPaymentTotal,
  );
  const totalPurchaseAmount = salesTotal + installmentTotal;
  const purchaseCount = allSales.length + installmentSales.length;
  const creditSalesCount = creditSales.length;
  const cashSalesCount = cashSales.length;

  const ledgerTotalDebit = ledgerRows.reduce(
    (sum: number, row: any) => sum + Math.max(0, salesAdvisorNum(row.debit)),
    0,
  );
  const ledgerTotalCredit = ledgerRows.reduce(
    (sum: number, row: any) => sum + Math.max(0, salesAdvisorNum(row.credit)),
    0,
  );
  const ledgerComputedBalance = ledgerTotalDebit - ledgerTotalCredit;
  const lastLedgerBalance = ledgerRows.length
    ? salesAdvisorNum(ledgerRows[ledgerRows.length - 1]?.balance)
    : NaN;
  const customerStoredBalance = salesAdvisorNum(customer?.currentBalance);
  const currentBalance = Number.isFinite(ledgerComputedBalance)
    ? ledgerComputedBalance
    : Number.isFinite(lastLedgerBalance)
      ? lastLedgerBalance
      : customerStoredBalance;

  const paymentLedgerRows = ledgerRows.filter((row: any) => {
    const debit = Math.max(0, salesAdvisorNum(row.debit));
    const credit = Math.max(0, salesAdvisorNum(row.credit));
    const refType = String(row.referenceType || "").toLowerCase();
    const desc = String(row.description || "");
    if (credit <= 0) return false;
    const looksLikeCashInvoiceMirror = debit > 0 && /نقدی|cash/i.test(desc);
    if (looksLikeCashInvoiceMirror) return false;
    return (
      debit <= 0 ||
      /payment|receipt|installment|sales_order_payment|ledger/i.test(refType) ||
      /دریافت|واریز|پرداخت|تسویه|قسط|بابت/i.test(desc)
    );
  });
  const ledgerPaymentAmount = paymentLedgerRows.reduce(
    (sum: number, row: any) => sum + Math.max(0, salesAdvisorNum(row.credit)),
    0,
  );
  const ledgerPaymentCount = paymentLedgerRows.length;

  const today = moment().startOf("day");
  let onTimePaymentCount = 0;
  let latePaymentCount = 0;
  let overdueUnpaidCount = 0;

  installmentPayments.forEach((payment: any) => {
    const status = String(payment.status || "");
    const due = salesAdvisorParseDate(payment.dueDate);
    const paid = salesAdvisorParseDate(payment.paymentDate);
    const isPaid =
      /پرداخت شده|پرداخت|تسویه|paid|done/i.test(status) || Boolean(paid);
    const isExplicitLate = /دیرکرد|تاخیر|معوق|late/i.test(status);
    if (isPaid) {
      if (due && paid && paid.startOf("day").isAfter(due.startOf("day")))
        latePaymentCount += 1;
      else onTimePaymentCount += 1;
      return;
    }
    if (isExplicitLate) {
      latePaymentCount += 1;
      return;
    }
    if (due && due.startOf("day").isBefore(today)) overdueUnpaidCount += 1;
  });

  let returnedCheckCount = 0;
  installmentChecks.forEach((check: any) => {
    const status = String(check.status || "");
    const due = salesAdvisorParseDate(check.dueDate);
    const isReturned = /برگشت|returned|bounce/i.test(status);
    const isCashed = /نقد شد|وصول|تسویه|پرداخت|paid|cashed/i.test(status);
    if (isReturned) returnedCheckCount += 1;
    else if (!isCashed && due && due.startOf("day").isBefore(today))
      overdueUnpaidCount += 1;
  });

  // FIFO age of open customer debt. Credit rows first settle older debit rows.
  type OpenDebtSlice = { amount: number; date: string | null };
  const openDebtQueue: OpenDebtSlice[] = [];
  ledgerRows.forEach((row: any) => {
    let debit = Math.max(0, salesAdvisorNum(row.debit));
    let credit = Math.max(0, salesAdvisorNum(row.credit));
    const date =
      String(row.transactionDate || row.createdAt || row.updatedAt || "").slice(
        0,
        10,
      ) || null;
    if (debit > 0) openDebtQueue.push({ amount: debit, date });
    while (credit > 0 && openDebtQueue.length) {
      const first = openDebtQueue[0];
      const applied = Math.min(first.amount, credit);
      first.amount -= applied;
      credit -= applied;
      if (first.amount <= 1) openDebtQueue.shift();
    }
  });
  const oldestOpenDebtDate =
    openDebtQueue.find((slice) => slice.amount > 1)?.date || null;
  const oldestOpenDebtAgeDays = oldestOpenDebtDate
    ? salesAdvisorDaysFromNowAbs(oldestOpenDebtDate)
    : null;

  const installmentObligationCount =
    installmentPayments.length + installmentChecks.length;
  const lastDates = [
    ...allSales.map((row: any) => row.transactionDate || row.dateCreated),
    ...installmentSales.map((row: any) => row.saleDate || row.dateCreated),
  ]
    .filter(Boolean)
    .sort((a: any, b: any) => String(b).localeCompare(String(a)));
  const lastPurchaseDate = lastDates[0] || null;
  const lastPurchaseAgeDays = lastPurchaseDate
    ? salesAdvisorDaysFromNowAbs(lastPurchaseDate)
    : null;

  const creditExperienceCount = creditSalesCount + installmentSales.length;
  const grossCreditExposure = creditSalesTotal + installmentCreditExposure;
  const activeDebt = Math.max(0, currentBalance);
  const customerCreditBalance = Math.max(0, -currentBalance);
  const isSettledOrCreditor = currentBalance <= 0;
  const paidAgainstCreditRatio =
    grossCreditExposure > 0
      ? Math.max(
          0,
          Math.min(1.5, ledgerPaymentAmount / Math.max(1, grossCreditExposure)),
        )
      : ledgerPaymentAmount > 0
        ? 1
        : 0;

  let score = 50;
  const reasons: string[] = [];
  const addScore = (amount: number, reason: string) => {
    if (!Number.isFinite(amount) || Math.abs(amount) < 0.25) return;
    score += amount;
    reasons.push(
      `${amount > 0 ? "+" : ""}${Math.round(amount).toLocaleString("fa-IR")} امتیاز — ${reason}`,
    );
  };

  if (purchaseCount === 0 && ledgerRows.length === 0) score = 42;

  addScore(
    Math.min(12, purchaseCount * 2.2),
    `${purchaseCount.toLocaleString("fa-IR")} خرید ثبت‌شده`,
  );
  if (totalPurchaseAmount > 0)
    addScore(
      Math.min(12, Math.log10(totalPurchaseAmount / 1_000_000 + 1) * 4.5),
      `حجم خرید کل ${salesAdvisorMoney(totalPurchaseAmount)}`,
    );
  if (cashSalesCount > 0)
    addScore(
      Math.min(
        8,
        cashSalesCount * 1.5 + Math.log10(cashSalesTotal / 1_000_000 + 1) * 1.2,
      ),
      `${cashSalesCount.toLocaleString("fa-IR")} خرید نقدی موفق`,
    );
  if (creditExperienceCount > 0)
    addScore(
      Math.min(10, creditExperienceCount * 1.8 + paidAgainstCreditRatio * 5),
      `${creditExperienceCount.toLocaleString("fa-IR")} تجربه فروش اعتباری/اقساطی`,
    );
  if (ledgerPaymentCount > 0)
    addScore(
      Math.min(
        22,
        ledgerPaymentCount * 2.6 +
          Math.log10(ledgerPaymentAmount / 1_000_000 + 1) * 4.8,
      ),
      `${ledgerPaymentCount.toLocaleString("fa-IR")} پرداخت/تسویه به مبلغ ${salesAdvisorMoney(ledgerPaymentAmount)}`,
    );
  if (grossCreditExposure > 0 && isSettledOrCreditor)
    addScore(14, "تعهدات اعتباری/اقساطی فعلی تسویه شده یا مشتری بستانکار است");
  else if (grossCreditExposure > 0 && paidAgainstCreditRatio >= 0.65)
    addScore(7, "بخش قابل توجهی از تعهدات اعتباری پرداخت شده است");
  if (
    grossCreditExposure > 0 &&
    ledgerPaymentCount > 0 &&
    paidAgainstCreditRatio >= 0.9
  )
    addScore(9, "پرداخت‌های ثبت‌شده تقریباً کل تعهد اعتباری را پوشش داده‌اند");
  if (installmentObligationCount > 0) {
    const onTimeRatio =
      onTimePaymentCount / Math.max(1, installmentObligationCount);
    addScore(
      Math.min(16, onTimeRatio * 16),
      `${onTimePaymentCount.toLocaleString("fa-IR")} پرداخت اقساط/تعهد به‌موقع`,
    );
  }
  if (customerCreditBalance > 0)
    addScore(
      Math.min(18, 6 + Math.log10(customerCreditBalance / 1_000_000 + 1) * 7),
      `مشتری ${salesAdvisorMoney(customerCreditBalance)} بستانکار است`,
    );
  if (lastPurchaseAgeDays != null) {
    if (lastPurchaseAgeDays <= 60)
      addScore(5, "خرید اخیر در ۶۰ روز گذشته ثبت شده است");
    else if (lastPurchaseAgeDays <= 180)
      addScore(2, "مشتری در بازه ۱۸۰ روز گذشته فعال بوده است");
    else if (lastPurchaseAgeDays > 365 && activeDebt > 0)
      addScore(-4, "بیش از یک سال از آخرین خرید گذشته و بدهی فعال وجود دارد");
  }

  // Penalties should not override a positive account balance unless there is real severe evidence.
  if (activeDebt > 0) {
    const debtPressureBase = Math.max(
      6_000_000,
      grossCreditExposure,
      totalPurchaseAmount * 0.35,
    );
    const debtPressure = activeDebt / debtPressureBase;
    addScore(
      -Math.min(28, debtPressure * 25),
      `مانده بدهی فعال ${salesAdvisorMoney(activeDebt)}`,
    );
  }
  if (oldestOpenDebtAgeDays != null && activeDebt > 0) {
    if (oldestOpenDebtAgeDays > 180)
      addScore(-22, `قدیمی‌ترین بدهی باز بیش از ۱۸۰ روز عمر دارد`);
    else if (oldestOpenDebtAgeDays > 90)
      addScore(-14, `قدیمی‌ترین بدهی باز بیش از ۹۰ روز عمر دارد`);
    else if (oldestOpenDebtAgeDays > 45)
      addScore(-7, `قدیمی‌ترین بدهی باز بیش از ۴۵ روز عمر دارد`);
  }

  const effectiveOverdueUnpaid =
    isSettledOrCreditor && returnedCheckCount === 0
      ? Math.max(0, Math.min(overdueUnpaidCount, 1))
      : overdueUnpaidCount;
  const effectiveLatePayment =
    isSettledOrCreditor && returnedCheckCount === 0
      ? Math.max(0, Math.min(latePaymentCount, 1))
      : latePaymentCount;
  if (effectiveOverdueUnpaid > 0)
    addScore(
      -Math.min(18, effectiveOverdueUnpaid * 7),
      `${effectiveOverdueUnpaid.toLocaleString("fa-IR")} سررسید معوق/باز`,
    );
  if (effectiveLatePayment > 0)
    addScore(
      -Math.min(12, effectiveLatePayment * 5),
      `${effectiveLatePayment.toLocaleString("fa-IR")} پرداخت با دیرکرد`,
    );
  if (returnedCheckCount > 0)
    addScore(
      -Math.min(42, returnedCheckCount * 20),
      `${returnedCheckCount.toLocaleString("fa-IR")} چک برگشتی`,
    );

  // Business guardrail: a settled or creditor customer must not remain in the risky band merely because old test/overdue flags were left open.
  let finalScore = salesAdvisorClamp(score, 5, 98);
  if (isSettledOrCreditor && returnedCheckCount === 0) {
    const creditorFloor =
      customerCreditBalance >= 5_000_000
        ? 76
        : customerCreditBalance > 0
          ? 72
          : 66;
    const settledWithActivityFloor =
      purchaseCount > 0 || ledgerPaymentCount > 0 ? creditorFloor : 58;
    finalScore = Math.max(finalScore, settledWithActivityFloor);
    if (
      (purchaseCount > 0 || ledgerPaymentCount > 0) &&
      effectiveOverdueUnpaid === 0 &&
      effectiveLatePayment === 0
    )
      finalScore = Math.max(finalScore, 82);
  }
  if (
    ledgerPaymentAmount > 0 &&
    isSettledOrCreditor &&
    returnedCheckCount === 0
  )
    finalScore = Math.max(finalScore, 78);
  if (activeDebt === 0 && purchaseCount > 0 && returnedCheckCount === 0)
    finalScore = Math.max(finalScore, 70);
  finalScore = Math.round(salesAdvisorClamp(finalScore, 5, 98));

  const confidence = Math.round(
    salesAdvisorClamp(
      35 +
        Math.min(25, purchaseCount * 4) +
        Math.min(18, ledgerRows.length * 1.5) +
        Math.min(18, installmentObligationCount * 2) +
        (lastPurchaseDate ? 5 : 0) +
        (ledgerRows.length > 0 ? 6 : 0) -
        (purchaseCount === 0 && ledgerRows.length === 0 ? 12 : 0),
      20,
      96,
    ),
  );

  const tier =
    purchaseCount === 0 && ledgerRows.length === 0
      ? "unknown"
      : finalScore >= 85
        ? "excellent"
        : finalScore >= 70
          ? "good"
          : finalScore >= 55
            ? "medium"
            : "risky";

  const tierLabel =
    tier === "excellent"
      ? "بسیار قابل اعتماد"
      : tier === "good"
        ? "قابل اعتماد"
        : tier === "medium"
          ? "نیازمند احتیاط"
          : tier === "risky"
            ? "پرریسک"
            : "بدون سابقه کافی";

  const avgPurchaseValue =
    purchaseCount > 0 ? totalPurchaseAmount / purchaseCount : 0;
  const behaviorFactor =
    finalScore >= 85
      ? 1.55
      : finalScore >= 70
        ? 1.2
        : finalScore >= 55
          ? 0.78
          : finalScore >= 40
            ? 0.34
            : 0.14;
  const historyBase = Math.max(
    avgPurchaseValue * 1.35,
    totalPurchaseAmount * 0.24,
    ledgerPaymentAmount * 1.2,
    purchaseCount > 0 ? 5_000_000 : 0,
  );
  const riskPenaltyFactor = Math.max(
    0.35,
    1 -
      (effectiveLatePayment * 0.06 +
        effectiveOverdueUnpaid * 0.1 +
        returnedCheckCount * 0.25),
  );
  const creditBalanceBoost =
    customerCreditBalance > 0
      ? Math.min(customerCreditBalance * 0.85, 45_000_000)
      : 0;
  const suggestedCreditLimit = Math.round(
    salesAdvisorClamp(
      historyBase * behaviorFactor * riskPenaltyFactor + creditBalanceBoost,
      0,
      500_000_000,
    ),
  );
  const remainingSuggestedCredit = Math.max(
    0,
    suggestedCreditLimit - activeDebt,
  );

  if (reasons.length === 0)
    reasons.push("داده کافی برای محاسبه امتیاز رفتاری مشتری پیدا نشد.");
  if (currentBalance < 0)
    reasons.push(
      `وضعیت حساب فعلی بستانکاری ${salesAdvisorMoney(customerCreditBalance)} است و حداقل امتیاز عملیاتی برای مشتری اعمال شد.`,
    );
  else if (currentBalance === 0)
    reasons.push("مانده حساب مشتری تسویه است و ریسک بدهی فعال ندارد.");
  else
    reasons.push(
      `مانده حساب فعلی بدهکاری ${salesAdvisorMoney(activeDebt)} است.`,
    );
  if (
    isSettledOrCreditor &&
    (latePaymentCount > effectiveLatePayment ||
      overdueUnpaidCount > effectiveOverdueUnpaid)
  )
    reasons.push(
      "به‌دلیل تسویه/بستانکاری فعلی، هشدارهای قدیمی دیرکرد فقط با وزن کنترل‌شده محاسبه شدند.",
    );

  return {
    customerId,
    score: finalScore,
    confidence,
    tier,
    tierLabel,
    purchaseCount,
    totalPurchaseAmount,
    creditSalesCount,
    installmentSalesCount: installmentSales.length,
    installmentObligationCount,
    onTimePaymentCount,
    latePaymentCount,
    overdueUnpaidCount,
    returnedCheckCount,
    currentBalance,
    suggestedCreditLimit,
    remainingSuggestedCredit,
    lastPurchaseDate,
    reasons,
    cashSalesCount,
    ledgerPaymentCount,
    ledgerPaymentAmount,
    customerCreditBalance,
    oldestOpenDebtAgeDays,
  } as CustomerSalesTrustProfile & Record<string, any>;
};

export const buildSalesAdvisorAnalysis = (
  payload: any,
  customer: any | null,
  customerTrustProfile?: CustomerSalesTrustProfile | null,
) => {
  const rawItems = Array.isArray(payload?.items) ? payload.items : [];
  const items = rawItems.map((item: any, index: number) => {
    const quantity = Math.max(1, salesAdvisorNum(item.quantity));
    const unitPrice = Math.max(0, salesAdvisorNum(item.unitPrice));
    const lineGross = unitPrice * quantity;
    const discount = Math.min(
      Math.max(0, salesAdvisorNum(item.discountPerItem ?? item.discount)),
      lineGross,
    );
    const buyPrice = Math.max(
      0,
      salesAdvisorNum(
        item.buyPrice ?? item.currentPurchasePrice ?? item.purchasePrice,
      ),
    );
    const stockRaw = item.stock;
    const stock =
      stockRaw === Infinity || stockRaw === "Infinity"
        ? Infinity
        : salesAdvisorNum(stockRaw);
    const itemType = String(item.itemType || item.type || "").toLowerCase();
    return {
      id: String(item.cartItemId || item.itemId || index),
      itemId: salesAdvisorNum(item.itemId || item.id),
      itemType,
      name: String(item.name || item.description || `قلم ${index + 1}`),
      quantity,
      unitPrice,
      lineGross,
      discount,
      buyPrice,
      lineNet: Math.max(0, lineGross - discount),
      stock,
      hasCostBasis: buyPrice > 0 || itemType === "service",
    };
  });

  const paymentMethod =
    String(payload?.paymentMethod || "cash") === "credit" ? "credit" : "cash";
  const subtotal = items.reduce(
    (sum: number, item: any) => sum + item.lineGross,
    0,
  );
  const itemsDiscount = items.reduce(
    (sum: number, item: any) => sum + item.discount,
    0,
  );
  const afterRowDiscounts = Math.max(0, subtotal - itemsDiscount);
  const globalDiscount = Math.min(
    Math.max(0, salesAdvisorNum(payload?.discount ?? payload?.globalDiscount)),
    afterRowDiscounts,
  );
  const grandTotal = Math.max(0, afterRowDiscounts - globalDiscount);
  const totalDiscount = itemsDiscount + globalDiscount;
  const totalDiscountRate = subtotal > 0 ? (totalDiscount / subtotal) * 100 : 0;
  const costKnownCount = items.filter((item: any) => item.hasCostBasis).length;
  const priceKnownCount = items.filter(
    (item: any) => item.unitPrice > 0,
  ).length;
  const dataQuality = salesAdvisorClamp(
    (items.length ? 25 : 0) +
      (items.length ? (priceKnownCount / items.length) * 25 : 0) +
      (items.length ? (costKnownCount / items.length) * 25 : 0) +
      (paymentMethod === "credit" ? (customer ? 15 : 0) : 15) +
      (subtotal > 0 ? 10 : 0),
    0,
    100,
  );
  const hasRealCostBasis = items.length > 0 && costKnownCount === items.length;
  const customerBalance = salesAdvisorNum(customer?.currentBalance);
  const customerTrustScore = customerTrustProfile?.score ?? null;
  const customerTrustConfidence = customerTrustProfile?.confidence ?? null;
  const insights: SalesAdvisorInsight[] = [];
  const addInsight = (
    insight: Omit<SalesAdvisorInsight, "confidence"> & {
      evidenceCount?: number;
      uncertaintyPenalty?: number;
      customerResolved?: boolean;
      hasRealCostBasis?: boolean;
    },
  ) => {
    insights.push({
      ...insight,
      confidence: calculateSalesAdvisorConfidence({
        dataQuality,
        evidenceCount: insight.evidenceCount ?? 1,
        uncertaintyPenalty: insight.uncertaintyPenalty,
        severity: insight.severity,
        customerResolved: insight.customerResolved ?? Boolean(customer),
        hasRealCostBasis: insight.hasRealCostBasis ?? hasRealCostBasis,
        customerTrustScore,
        customerTrustConfidence,
      }),
    });
  };

  if (items.length === 0) {
    addInsight({
      id: "empty-cart-guidance",
      title: "در انتظار انتخاب قلم فروش",
      summary:
        "پس از انتخاب کالا یا خدمت، تحلیل سود، تخفیف، موجودی و ریسک مشتری از سمت سرور محاسبه می‌شود.",
      severity: "info",
      icon: "fa-solid fa-cart-shopping",
      reasons: [
        "سرور برای تحلیل دقیق به حداقل یک ردیف فروش نیاز دارد.",
        "عدد اعتماد تا قبل از دریافت داده کامل، قطعی نمایش داده نمی‌شود.",
      ],
      evidenceCount: 0,
      uncertaintyPenalty: 8,
      hasRealCostBasis: false,
      customerResolved: false,
    });
    return {
      insights,
      meta: {
        dataQuality,
        confidence: insights[0]?.confidence || null,
        learningStatus: "empty",
      },
    };
  }

  if (paymentMethod === "credit" && !customer) {
    addInsight({
      id: "credit-without-customer",
      title: "فروش اعتباری بدون مشتری انتخاب شده",
      summary:
        "برای فروش اعتباری باید مشتری از دیتابیس انتخاب شود تا مانده حساب و پیگیری وصول قابل اتکا باشد.",
      severity: "critical",
      icon: "fa-solid fa-user-lock",
      reasons: [
        "پرداخت اعتباری انتخاب شده است.",
        "شناسه مشتری معتبر در دیتابیس برای این فاکتور پیدا نشد.",
      ],
      metrics: [
        { label: "نوع پرداخت", value: "اعتباری" },
        { label: "وضعیت مشتری", value: "انتخاب نشده" },
      ],
      evidenceCount: 2,
      uncertaintyPenalty: 4,
      customerResolved: false,
    });
  }

  if (customer && customerTrustProfile) {
    const score = customerTrustProfile.score;
    const trustSeverity: SalesAdvisorSeverity =
      score < 42
        ? "critical"
        : score < 58
          ? "warning"
          : score < 72
            ? "info"
            : "success";
    const trustSummary =
      customerTrustProfile.tier === "unknown"
        ? "این مشتری سابقه خرید کافی ندارد؛ برای فروش اعتباری بهتر است سقف اعتبار محافظه‌کارانه تعیین شود."
        : `ارزش اعتباری این مشتری ${score.toLocaleString("fa-IR")} از ۱۰۰ است و در سطح «${customerTrustProfile.tierLabel}» قرار می‌گیرد.`;

    addInsight({
      id: "customer-credit-trust-profile",
      title: "ارزش اعتباری مشتری بر اساس سوابق خرید",
      summary: trustSummary,
      severity: trustSeverity,
      icon:
        score >= 72
          ? "fa-solid fa-user-check"
          : score >= 58
            ? "fa-solid fa-user-clock"
            : "fa-solid fa-triangle-exclamation",
      reasons: customerTrustProfile.reasons,
      metrics: [
        {
          label: "امتیاز مشتری",
          value: `${score.toLocaleString("fa-IR")} از ۱۰۰`,
        },
        { label: "سطح اعتماد", value: customerTrustProfile.tierLabel },
        {
          label: "حجم خرید قبلی",
          value: salesAdvisorMoney(customerTrustProfile.totalPurchaseAmount),
        },
        {
          label: "تعداد خریدها",
          value: customerTrustProfile.purchaseCount.toLocaleString("fa-IR"),
        },
        {
          label: "دیرکرد/معوق",
          value: `${(customerTrustProfile.latePaymentCount + customerTrustProfile.overdueUnpaidCount).toLocaleString("fa-IR")} مورد`,
        },
        {
          label: "چک برگشتی",
          value:
            customerTrustProfile.returnedCheckCount.toLocaleString("fa-IR"),
        },
      ],
      actionLabel: "دیدن پرونده مشتری",
      actionTo: `/customers/${Number(customer.id)}`,
      evidenceCount: Math.max(
        2,
        Math.min(
          8,
          customerTrustProfile.purchaseCount +
            customerTrustProfile.installmentObligationCount,
        ),
      ),
      uncertaintyPenalty:
        Math.max(0, 70 - customerTrustProfile.confidence) * 0.12,
      customerResolved: true,
    });
  }

  if (paymentMethod === "credit" && customer && customerTrustProfile) {
    const suggestedLimit = customerTrustProfile.suggestedCreditLimit;
    const projectedCreditExposure =
      Math.max(0, customerTrustProfile.currentBalance) + grandTotal;
    const limitUsageRate =
      suggestedLimit > 0
        ? (projectedCreditExposure / suggestedLimit) * 100
        : 100;
    const hasNoSafeLimit = suggestedLimit <= 0;
    const exceedsLimit = projectedCreditExposure > suggestedLimit;
    const limitSeverity: SalesAdvisorSeverity =
      hasNoSafeLimit || limitUsageRate >= 140
        ? "critical"
        : exceedsLimit || limitUsageRate >= 100
          ? "warning"
          : limitUsageRate >= 75
            ? "info"
            : "success";

    addInsight({
      id: "customer-suggested-credit-limit",
      title: "سقف اعتبار پیشنهادی برای این مشتری",
      summary: hasNoSafeLimit
        ? "به‌دلیل نبود سابقه کافی یا ریسک بالای سوابق، فروش اعتباری بدون تأیید مدیر توصیه نمی‌شود."
        : exceedsLimit
          ? `مبلغ این فروش، مانده مشتری را از سقف اعتبار پیشنهادی ${salesAdvisorMoney(suggestedLimit)} عبور می‌دهد.`
          : `برای این مشتری سقف اعتبار پیشنهادی ${salesAdvisorMoney(suggestedLimit)} است و پس از این فاکتور حدود ${salesAdvisorMoney(Math.max(0, suggestedLimit - projectedCreditExposure))} ظرفیت باقی می‌ماند.`,
      severity: limitSeverity,
      icon:
        limitSeverity === "success"
          ? "fa-solid fa-credit-card"
          : limitSeverity === "info"
            ? "fa-solid fa-gauge-high"
            : "fa-solid fa-triangle-exclamation",
      reasons: [
        "سقف اعتبار از امتیاز مشتری، حجم خرید قبلی، رفتار پرداخت اقساط، چک‌های برگشتی و مانده فعلی محاسبه شد.",
        `امتیاز اعتباری مشتری ${customerTrustProfile.score.toLocaleString("fa-IR")} از ۱۰۰ است.`,
        `مصرف اعتبار پس از این فاکتور حدود ${limitUsageRate.toFixed(1).replace(".", "٫")}٪ می‌شود.`,
      ],
      metrics: [
        { label: "سقف پیشنهادی", value: salesAdvisorMoney(suggestedLimit) },
        {
          label: "مانده فعلی",
          value: salesAdvisorMoney(customerTrustProfile.currentBalance),
        },
        { label: "مبلغ فاکتور", value: salesAdvisorMoney(grandTotal) },
        {
          label: "تعهد پس از ثبت",
          value: salesAdvisorMoney(projectedCreditExposure),
        },
        {
          label: "ظرفیت باقی‌مانده",
          value: salesAdvisorMoney(
            Math.max(0, suggestedLimit - projectedCreditExposure),
          ),
        },
      ],
      actionLabel:
        exceedsLimit || hasNoSafeLimit
          ? "بررسی پرونده مشتری"
          : "دیدن پرونده مشتری",
      actionTo: `/customers/${Number(customer.id)}`,
      evidenceCount: Math.max(
        3,
        Math.min(
          8,
          customerTrustProfile.purchaseCount +
            customerTrustProfile.installmentObligationCount +
            1,
        ),
      ),
      uncertaintyPenalty:
        Math.max(0, 70 - customerTrustProfile.confidence) * 0.12,
      customerResolved: true,
    });
  }

  if (paymentMethod === "credit" && customer && customerBalance > 0) {
    const projected = customerBalance + grandTotal;
    addInsight({
      id: "customer-balance-risk",
      title: "مشتری مانده قبلی دارد",
      summary: `مانده ثبت‌شده مشتری ${salesAdvisorMoney(customerBalance)} است و با این فاکتور به ${salesAdvisorMoney(projected)} می‌رسد.`,
      severity:
        projected > 50000000 ||
        (customerTrustScore != null && customerTrustScore < 45)
          ? "critical"
          : "warning",
      icon: "fa-solid fa-user-check",
      reasons: [
        "مانده قبلی مشتری از دفتر حساب دیتابیس خوانده شد.",
        "مبلغ فاکتور جاری به مانده احتمالی مشتری اضافه می‌شود.",
        ...(customerTrustProfile
          ? [
              `امتیاز اعتباری مشتری ${customerTrustProfile.score.toLocaleString("fa-IR")} از ۱۰۰ است.`,
            ]
          : []),
      ],
      metrics: [
        { label: "مانده قبلی", value: salesAdvisorMoney(customerBalance) },
        { label: "مبلغ فاکتور", value: salesAdvisorMoney(grandTotal) },
        { label: "مانده پس از ثبت", value: salesAdvisorMoney(projected) },
      ],
      actionLabel: "دیدن پرونده مشتری",
      actionTo: `/customers/${Number(customer.id)}`,
      evidenceCount: 3,
      customerResolved: true,
    });
  }

  if (subtotal > 0 && totalDiscountRate >= 10) {
    addInsight({
      id: "high-total-discount",
      title: "تخفیف کل فاکتور بالاتر از حد معمول است",
      summary: `جمع تخفیف‌ها حدود ${totalDiscountRate.toFixed(1).replace(".", "٫")}٪ مبلغ ناخالص فاکتور است.`,
      severity: totalDiscountRate >= 18 ? "critical" : "warning",
      icon: "fa-solid fa-percent",
      reasons: [
        "مبلغ ناخالص، تخفیف ردیفی و تخفیف کل از فاکتور جاری محاسبه شد.",
        "تخفیف بالا می‌تواند سود واقعی فروش را کاهش دهد.",
      ],
      metrics: [
        { label: "مبلغ ناخالص", value: salesAdvisorMoney(subtotal) },
        { label: "کل تخفیف", value: salesAdvisorMoney(totalDiscount) },
        {
          label: "نرخ تخفیف",
          value: `${totalDiscountRate.toFixed(1).replace(".", "٫")}٪`,
        },
      ],
      evidenceCount: 3,
    });
  }

  items.forEach((item: any) => {
    const discountRate =
      item.lineGross > 0 ? (item.discount / item.lineGross) * 100 : 0;
    const cost = item.buyPrice * item.quantity;
    const lineProfit = item.lineNet - cost;
    const marginRate = item.lineNet > 0 ? (lineProfit / item.lineNet) * 100 : 0;

    if (discountRate >= 12) {
      addInsight({
        id: `item-discount-${item.id}`,
        title: `تخفیف بالای ردیف: ${item.name}`,
        summary: `تخفیف این ردیف حدود ${discountRate.toFixed(1).replace(".", "٫")}٪ مبلغ خودش است.`,
        severity: discountRate >= 20 ? "critical" : "warning",
        icon: "fa-solid fa-tag",
        reasons: [
          "تخفیف ردیف از داده همین فاکتور خوانده شد.",
          "این تخفیف مستقیماً سود همین قلم را تغییر می‌دهد.",
        ],
        metrics: [
          { label: "مبلغ ردیف", value: salesAdvisorMoney(item.lineGross) },
          { label: "تخفیف ردیف", value: salesAdvisorMoney(item.discount) },
          {
            label: "نرخ تخفیف",
            value: `${discountRate.toFixed(1).replace(".", "٫")}٪`,
          },
        ],
        evidenceCount: 3,
      });
    }

    if (item.buyPrice > 0 && lineProfit < 0) {
      addInsight({
        id: `negative-profit-${item.id}`,
        title: `سود منفی در ردیف: ${item.name}`,
        summary: `با قیمت خرید ثبت‌شده، این ردیف حدود ${salesAdvisorMoney(Math.abs(lineProfit))} زیان دارد.`,
        severity: "critical",
        icon: "fa-solid fa-triangle-exclamation",
        reasons: [
          "قیمت خرید/مبنای هزینه برای این ردیف موجود است.",
          "مبلغ خالص فروش کمتر از بهای تمام‌شده محاسبه شد.",
        ],
        metrics: [
          { label: "خالص فروش ردیف", value: salesAdvisorMoney(item.lineNet) },
          { label: "بهای تمام‌شده", value: salesAdvisorMoney(cost) },
          {
            label: "زیان احتمالی",
            value: salesAdvisorMoney(Math.abs(lineProfit)),
          },
        ],
        evidenceCount: 3,
      });
    } else if (item.buyPrice > 0 && item.lineNet > 0 && marginRate < 5) {
      addInsight({
        id: `low-margin-${item.id}`,
        title: `حاشیه سود کم: ${item.name}`,
        summary: `حاشیه سود این ردیف حدود ${marginRate.toFixed(1).replace(".", "٫")}٪ است؛ تخفیف بیشتر توصیه نمی‌شود.`,
        severity: "warning",
        icon: "fa-solid fa-chart-line",
        reasons: [
          "قیمت خرید و قیمت فروش برای این ردیف در دسترس است.",
          "حاشیه سود کمتر از ۵٪ برای فروش عادی نیازمند بررسی است.",
        ],
        metrics: [
          { label: "سود ردیف", value: salesAdvisorMoney(lineProfit) },
          {
            label: "حاشیه سود",
            value: `${marginRate.toFixed(1).replace(".", "٫")}٪`,
          },
        ],
        evidenceCount: 2,
      });
    }

    if (
      item.itemType !== "service" &&
      Number.isFinite(item.stock) &&
      item.stock <= item.quantity
    ) {
      addInsight({
        id: `stock-risk-${item.id}`,
        title: `موجودی در مرز اتمام: ${item.name}`,
        summary:
          "بعد از ثبت این فاکتور موجودی این قلم صفر یا بسیار پایین می‌شود.",
        severity: "info",
        icon: "fa-solid fa-box-open",
        reasons: [
          "موجودی فعلی و تعداد در فاکتور از داده فروش خوانده شد.",
          "برای کالای پرفروش، پیشنهاد خرید یا جایگزینی باید بررسی شود.",
        ],
        metrics: [
          {
            label: "موجودی فعلی",
            value: salesAdvisorNum(item.stock).toLocaleString("fa-IR"),
          },
          {
            label: "تعداد در فاکتور",
            value: salesAdvisorNum(item.quantity).toLocaleString("fa-IR"),
          },
        ],
        actionLabel: "رفتن به پیشنهاد خرید",
        actionTo: "/reports/analysis/suggestions",
        evidenceCount: 2,
      });
    }
  });

  if (
    insights.every(
      (item) => item.severity !== "critical" && item.severity !== "warning",
    )
  ) {
    addInsight({
      id: "healthy-sale-flow",
      title: "شرایط فروش سالم به نظر می‌رسد",
      summary:
        "بر اساس داده‌های فعلی فاکتور، هشدار جدی درباره تخفیف، سود یا مشتری دیده نشد.",
      severity: "success",
      icon: "fa-solid fa-check",
      reasons: [
        "تخفیف‌ها در محدوده قابل قبول هستند.",
        "سود ردیف‌ها منفی نشده و مانده مشتری هشدار جدی ایجاد نکرده است.",
        ...(customerTrustProfile
          ? [
              `ارزش اعتباری مشتری در سطح «${customerTrustProfile.tierLabel}» محاسبه شد.`,
            ]
          : []),
      ],
      metrics: [
        { label: "جمع فاکتور", value: salesAdvisorMoney(grandTotal) },
        { label: "تعداد اقلام", value: items.length.toLocaleString("fa-IR") },
      ],
      evidenceCount: Math.max(2, items.length + costKnownCount),
      hasRealCostBasis,
      customerResolved: paymentMethod === "credit" ? Boolean(customer) : true,
      uncertaintyPenalty: hasRealCostBasis ? 0 : 10,
    });
  }

  const avgConfidence = insights.length
    ? salesAdvisorClamp(
        insights.reduce((sum, item) => sum + item.confidence, 0) /
          insights.length,
      )
    : null;
  const learningStatus =
    items.length === 0
      ? "empty"
      : dataQuality >= 82
        ? "trusted"
        : dataQuality >= 60
          ? "learning"
          : "empty";
  return {
    insights,
    meta: { dataQuality, confidence: avgConfidence, learningStatus },
  };
};
