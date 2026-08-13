import { formatExactNumberText } from "../../../utils/exactNumber";
import moment from "jalali-moment";
import { allocateReportAmountByWeights, allocateReportAmountShare } from "../../utils/productSalesReports/productSalesSharedCore";
import {
  mobileAnalyticsDateMoment,
  mobileAnalyticsNumber,
  mobileAnalyticsPct,
  mobileAnalyticsRiskMeta,
  mobileAnalyticsRound,
} from "./mobileSalesAnalyticsUtils";

const isCollectedInstallmentCheck = (status: unknown) => {
  const value = String(status || '').trim();
  if (!value || /ضمانت|امانت|نزد فروشنده|در جریان|برگشت|عودت|لغو|باطل/.test(value)) return false;
  return /نقد|پاس|وصول|تسویه|پرداخت/.test(value);
};

export function buildMobileAnalyticsInstallmentRows({
  installmentBaseRows,
  paymentsBySale,
  checksBySale,
}: {
  installmentBaseRows: any[];
  paymentsBySale: Map<number, any[]>;
  checksBySale: Map<number, any[]>;
}): any[] {
  const today = moment().startOf("day");
  const indexedRows = (installmentBaseRows as any[]).map((row, index) => ({ row, index }));
  const rowsBySale = new Map<number, Array<{ row: any; index: number }>>();
  for (const entry of indexedRows) {
    const saleId = Number(entry.row.saleId || 0);
    const group = rowsBySale.get(saleId) || [];
    group.push(entry);
    rowsBySale.set(saleId, group);
  }

  const allocations = new Map<number, {
    contractualTotal: number;
    downPaymentShare: number;
    paidInstallments: number;
    overdueAmount: number;
    nextDueAmount: number;
    nextDueDate: string | null;
    overdueCount: number;
  }>();

  for (const [saleId, group] of rowsBySale.entries()) {
    const first = group[0]?.row || {};
    const actualSalePrice = Math.max(0, mobileAnalyticsNumber(first.actualSalePrice));
    const weights = group.map(({ row }) => Math.max(0, mobileAnalyticsNumber(row.itemTotal)) || 1);
    const phoneItemsBase = weights.reduce((sum, value) => sum + value, 0);
    const saleItemsBase = Math.max(
      phoneItemsBase,
      mobileAnalyticsNumber(first.saleItemsBase) || phoneItemsBase,
    );
    const nonPhoneRemainder = Math.max(0, saleItemsBase - phoneItemsBase);
    const allocationWeights = nonPhoneRemainder > 0
      ? [...weights, nonPhoneRemainder]
      : weights;
    const allocateToPhoneRows = (amount: number) =>
      allocateReportAmountByWeights(amount, allocationWeights).slice(0, group.length);
    const contractualTotals = allocateToPhoneRows(actualSalePrice);
    const downPayments = allocateToPhoneRows(
      Math.min(actualSalePrice, Math.max(0, mobileAnalyticsNumber(first.downPayment))),
    );
    const payments = paymentsBySale.get(saleId) || [];
    const checks = checksBySale.get(saleId) || [];
    const transactionReceipts = payments.reduce(
      (sum: number, payment: any) => sum + Math.max(0, mobileAnalyticsNumber(payment.amountPaid)),
      0,
    );
    const recoveryByCheckId = new Map<number, number>();
    for (const payment of payments) {
      if (String(payment?.sourceType || '') !== 'check_recovery') continue;
      const checkId = Number(payment?.sourceId || 0);
      if (!checkId) continue;
      recoveryByCheckId.set(
        checkId,
        (recoveryByCheckId.get(checkId) || 0) + Math.max(0, mobileAnalyticsNumber(payment.amountPaid)),
      );
    }
    const passedCheckReceipts = checks
      .filter((check: any) => isCollectedInstallmentCheck(check.status))
      .reduce((sum: number, check: any) => {
        const checkAmount = Math.max(0, mobileAnalyticsNumber(check.amount));
        const recovered = Math.min(checkAmount, recoveryByCheckId.get(Number(check?.checkId || 0)) || 0);
        return sum + Math.max(0, checkAmount - recovered);
      }, 0);
    const paidInstallmentsWhole = transactionReceipts + passedCheckReceipts;
    const paidInstallments = allocateToPhoneRows(
      Math.min(Math.max(0, actualSalePrice - mobileAnalyticsNumber(first.downPayment)), paidInstallmentsWhole),
    );

    let overdueWhole = 0;
    let overdueCount = 0;
    let nextDueDate: string | null = null;
    let nextDueWhole = 0;
    for (const payment of payments) {
      const due = mobileAnalyticsDateMoment(payment.dueDate);
      const remainingDue = Math.max(
        0,
        mobileAnalyticsNumber(payment.amountDue) - mobileAnalyticsNumber(payment.amountPaid),
      );
      if (remainingDue <= 0) continue;
      if (due && due.isBefore(today, 'day')) {
        overdueCount += 1;
        overdueWhole += remainingDue;
      }
      const currentNext = mobileAnalyticsDateMoment(nextDueDate);
      if (due && (!currentNext || due.isBefore(currentNext))) {
        nextDueDate = payment.dueDate;
        nextDueWhole = remainingDue;
      }
    }
    const overdueAmounts = allocateToPhoneRows(overdueWhole);
    const nextDueAmounts = allocateToPhoneRows(nextDueWhole);

    group.forEach(({ index }, groupIndex) => {
      allocations.set(index, {
        contractualTotal: contractualTotals[groupIndex] || 0,
        downPaymentShare: downPayments[groupIndex] || 0,
        paidInstallments: paidInstallments[groupIndex] || 0,
        overdueAmount: overdueAmounts[groupIndex] || 0,
        nextDueAmount: nextDueAmounts[groupIndex] || 0,
        nextDueDate,
        overdueCount,
      });
    });
  }

  return indexedRows.map(({ row: r, index }) => {
    const saleId = Number(r.saleId || 0);
    const qty = Math.max(1, mobileAnalyticsNumber(r.quantity || 1));
    const actualSalePrice = mobileAnalyticsNumber(r.actualSalePrice);
    const allocation = allocations.get(index) || {
      contractualTotal: actualSalePrice,
      downPaymentShare: mobileAnalyticsNumber(r.downPayment),
      paidInstallments: 0,
      overdueAmount: 0,
      nextDueAmount: 0,
      nextDueDate: null,
      overdueCount: 0,
    };
    const contractualTotal = allocation.contractualTotal;
    const downPaymentShare = allocation.downPaymentShare;
    const payments = paymentsBySale.get(saleId) || [];
    const checks = checksBySale.get(saleId) || [];
    const paidInstallments = allocation.paidInstallments;
    const paidTotal = Math.min(contractualTotal, downPaymentShare + paidInstallments);
    const outstanding = Math.max(0, contractualTotal - paidTotal);
    const collectionRate = mobileAnalyticsPct(paidTotal, contractualTotal);
    const overdueAmount = allocation.overdueAmount;
    const overdueCount = allocation.overdueCount;
    const nextDueDate = allocation.nextDueDate;
    const nextDueAmount = allocation.nextDueAmount;
    let overdueChecks = 0;
    for (const c of checks) {
      const due = mobileAnalyticsDateMoment(c.dueDate);
      const st = String(c.status || "");
      const bad = st.includes("برگشت") || st.includes("برگشتی");
      const settled =
        st.includes("پاس") || st.includes("تسویه") || st.includes("پرداخت");
      if (bad || (due && due.isBefore(today, "day") && !settled))
        overdueChecks += 1;
    }
    const nextDueMoment = mobileAnalyticsDateMoment(nextDueDate);
    const dueInDays = nextDueMoment ? nextDueMoment.diff(today, "day") : null;
    const overdueDays =
      nextDueMoment && nextDueMoment.isBefore(today, "day")
        ? Math.abs(nextDueMoment.diff(today, "day"))
        : 0;
    const cost = mobileAnalyticsNumber(r.purchasePrice) * qty;
    const hasCurrentPurchasePrice = mobileAnalyticsNumber(r.currentPurchasePrice) > 0;
    const replacementCost = hasCurrentPurchasePrice
      ? mobileAnalyticsNumber(r.currentPurchasePrice) * qty
      : null;
    const fullProfit = contractualTotal - cost;
    const realizedProfit = allocateReportAmountShare(fullProfit, paidTotal, contractualTotal);
    const unrecognizedProfit = fullProfit - realizedProfit;
    const downPaymentRate = mobileAnalyticsPct(
      downPaymentShare,
      contractualTotal,
    );
    const reasons: string[] = [];
    let score = 0;
    if (collectionRate < 25) {
      score += 24;
      reasons.push("درصد وصول کمتر از ۲۵٪ است");
    } else if (collectionRate < 50) {
      score += 16;
      reasons.push("درصد وصول کمتر از ۵۰٪ است");
    } else if (collectionRate < 75) {
      score += 8;
      reasons.push("وصول هنوز کامل نیست");
    }
    if (downPaymentRate < 20) {
      score += 18;
      reasons.push("پیش‌پرداخت کمتر از ۲۰٪ مبلغ گوشی است");
    } else if (downPaymentRate < 35) {
      score += 10;
      reasons.push("پیش‌پرداخت پایین‌تر از سطح مطمئن است");
    }
    if (overdueCount > 0) {
      score += Math.min(28, overdueCount * 10);
      reasons.push(
        `${formatExactNumberText(overdueCount)} قسط عقب‌افتاده دارد`,
      );
    }
    if (overdueChecks > 0) {
      score += 24;
      reasons.push(
        `${formatExactNumberText(overdueChecks)} چک/سررسید پرریسک دارد`,
      );
    }
    if (overdueDays > 14) {
      score += 12;
      reasons.push("تاخیر بیشتر از دو هفته است");
    }
    if (
      outstanding > 0 &&
      contractualTotal > 0 &&
      outstanding / contractualTotal > 0.6
    ) {
      score += 12;
      reasons.push("بیش از ۶۰٪ مبلغ هنوز وصول نشده");
    }
    if (
      unrecognizedProfit > 0 &&
      fullProfit > 0 &&
      unrecognizedProfit / Math.max(1, fullProfit) > 0.5
    ) {
      score += 8;
      reasons.push("بخش زیادی از سود هنوز وصول نشده");
    }
    if (Number(r.customerBalance || 0) > 0) {
      score += Math.min(10, Number(r.customerBalance || 0) / 10000000);
      reasons.push("مشتری مانده حساب باز دارد");
    }
    if (!reasons.length)
      reasons.push("وصول فعلی این فروش در محدوده قابل قبول است");
    const meta = mobileAnalyticsRiskMeta(score);
    const realProfit = replacementCost === null ? null : contractualTotal - replacementCost;
    return {
      id: `installment-${saleId}-${r.phoneId || "phone"}-${r.imei || ""}`,
      saleType: "installment",
      saleTypeLabel: "اقساطی",
      saleId,
      saleDate: r.saleDate,
      customerId: Number(r.customerId || 0),
      customerName: r.customerName || "مشتری ثبت نشده",
      customerPhone: r.customerPhone || "",
      phoneId: r.phoneId ? Number(r.phoneId) : null,
      phoneModel: r.phoneModel || r.itemsSummary || "گوشی اقساطی",
      imei: r.imei || "",
      quantity: qty,
      purchasePrice: mobileAnalyticsRound(cost),
      referencePrice: replacementCost === null ? null : mobileAnalyticsRound(replacementCost),
      referencePriceAvailable: hasCurrentPurchasePrice,
      referencePriceSource: hasCurrentPurchasePrice ? "phones.currentPurchasePrice" : null,
      contractTotal: mobileAnalyticsRound(contractualTotal),
      actualSalePrice: mobileAnalyticsRound(actualSalePrice),
      downPayment: mobileAnalyticsRound(downPaymentShare),
      paidInstallments: mobileAnalyticsRound(paidInstallments),
      receivedAmount: mobileAnalyticsRound(paidTotal),
      outstandingAmount: mobileAnalyticsRound(outstanding),
      collectionRate: mobileAnalyticsRound(collectionRate),
      downPaymentRate: mobileAnalyticsRound(downPaymentRate),
      fullProfit: mobileAnalyticsRound(fullProfit),
      realizedProfit: mobileAnalyticsRound(realizedProfit),
      unrecognizedProfit: mobileAnalyticsRound(unrecognizedProfit),
      realProfit: realProfit === null ? null : mobileAnalyticsRound(realProfit),
      replacementDelta: replacementCost === null ? null : mobileAnalyticsRound(replacementCost - cost),
      overdueAmount: mobileAnalyticsRound(overdueAmount),
      overdueCount,
      overdueChecks,
      overdueDays,
      dueInDays,
      nextDueDate,
      nextDueAmount: mobileAnalyticsRound(nextDueAmount),
      saleMode: r.saleType || "installment",
      numberOfInstallments: Number(r.numberOfInstallments || 0),
      customerBalance: mobileAnalyticsRound(Number(r.customerBalance || 0)),
      riskScore: Math.max(0, Math.min(100, score)),
      riskLevel: meta.level,
      riskLabel: meta.label,
      riskTone: meta.tone,
      riskReasons: reasons,
    };
  });
}
