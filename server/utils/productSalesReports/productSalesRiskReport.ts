import { formatExactNumberText, formatExactPercentText } from "../../../utils/exactNumber";
import moment from "jalali-moment";
import { allAsync, getAsync, fromShamsiStringToISO } from "../../database";

import { formatReportMoneyText, getProductSalesDocKey, safeReportNumber } from './productSalesSharedCore';

export const parseProductSalesRiskDate = (value: any) => {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const jalali = moment(raw, "jYYYY/jMM/jDD", true);
  if (jalali.isValid()) return jalali.startOf("day");
  const iso = moment(raw);
  return iso.isValid() ? iso.startOf("day") : null;
};

export const productSalesRiskLevelMeta = (score: number) => {
  if (score >= 70) return { level: "critical", label: "بحرانی", weight: 4 };
  if (score >= 50) return { level: "urgent", label: "فوری", weight: 3 };
  if (score >= 25)
    return { level: "followup", label: "نیازمند پیگیری", weight: 2 };
  return { level: "low", label: "کم‌ریسک", weight: 1 };
};

export async function buildProductSalesCollectionRisk(
  rows: any[],
  docs: any[],
  limit = 80,
) {
  const relevantRows = Array.isArray(rows) ? rows : [];
  const docMap = new Map<string, any>();
  for (const doc of Array.isArray(docs) ? docs : []) {
    docMap.set(
      getProductSalesDocKey(
        String(doc?.sourceType || "invoice"),
        Number(doc?.orderId || 0),
      ),
      doc,
    );
  }

  const rowsByDoc = new Map<string, any[]>();
  for (const row of relevantRows) {
    const key = getProductSalesDocKey(
      String(row?.sourceType || "invoice"),
      Number(row?.orderId || 0),
    );
    const arr = rowsByDoc.get(key) || [];
    arr.push(row);
    rowsByDoc.set(key, arr);
  }

  const customerIds = Array.from(
    new Set(
      [
        ...Array.from(rowsByDoc.values()).map((list) =>
          Number(list?.[0]?.customerId || 0),
        ),
        ...Array.from(docMap.values()).map((doc: any) =>
          Number(doc?.customerId || 0),
        ),
      ].filter((id) => id > 0),
    ),
  );

  const customerMap = new Map<number, any>();
  const balanceMap = new Map<number, number>();
  if (customerIds.length) {
    const placeholders = customerIds.map(() => "?").join(",");
    try {
      const customerRows = await allAsync(
        `SELECT id, fullName, phoneNumber, COALESCE(riskOverride,'') AS riskOverride FROM customers WHERE id IN (${placeholders})`,
        customerIds,
      );
      for (const c of customerRows as any[]) customerMap.set(Number(c.id), c);
    } catch {}
    try {
      const balanceRows = await allAsync(
        `SELECT l.customerId, COALESCE(l.balance, 0) AS balance
           FROM customer_ledger l
           JOIN (SELECT customerId, MAX(id) AS id FROM customer_ledger WHERE customerId IN (${placeholders}) GROUP BY customerId) x
             ON x.id = l.id`,
        customerIds,
      );
      for (const b of balanceRows as any[])
        balanceMap.set(Number(b.customerId), Number(b.balance || 0));
    } catch {}
  }

  const installmentSaleIds = Array.from(
    new Set(
      Array.from(rowsByDoc.entries())
        .filter(
          ([key, list]) =>
            String(list?.[0]?.sourceType || key.split(":")[0]) ===
            "installment",
        )
        .map(([key]) => Number(key.split(":")[1] || 0))
        .filter((id) => id > 0),
    ),
  );
  const installmentDueMap = new Map<number, any>();
  const todayJ = moment().locale("fa").format("jYYYY/jMM/jDD");
  if (installmentSaleIds.length) {
    const placeholders = installmentSaleIds.map(() => "?").join(",");
    try {
      const dueRows = await allAsync(
        `SELECT x.saleId,
                COUNT(CASE WHEN x.remainingAmount > 0.00001 THEN 1 END) AS unpaidCount,
                COALESCE(SUM(CASE WHEN x.remainingAmount > 0.00001 THEN x.remainingAmount ELSE 0 END),0) AS unpaidAmount,
                COALESCE(SUM(CASE WHEN x.remainingAmount > 0.00001 AND x.dueDate < ? THEN x.remainingAmount ELSE 0 END),0) AS overdueAmount,
                SUM(CASE WHEN x.remainingAmount > 0.00001 AND x.dueDate < ? THEN 1 ELSE 0 END) AS overdueCount,
                MIN(CASE WHEN x.remainingAmount > 0.00001 THEN x.dueDate ELSE NULL END) AS nearestDueDate,
                MIN(CASE WHEN x.remainingAmount > 0.00001 AND x.dueDate < ? THEN x.dueDate ELSE NULL END) AS earliestOverdueDate
           FROM (
             SELECT ip.saleId, ip.dueDate,
                    MAX(0, COALESCE(ip.amountDue,0) - COALESCE((
                      SELECT SUM(it.amount_paid)
                        FROM installment_transactions it
                       WHERE it.installment_payment_id = ip.id
                    ),0)) AS remainingAmount
               FROM installment_payments ip
              WHERE ip.saleId IN (${placeholders})
                AND COALESCE(ip.sourceType,'installment') = 'installment'
           ) x
          GROUP BY x.saleId`,
        [todayJ, todayJ, todayJ, ...installmentSaleIds],
      );
      for (const d of dueRows as any[])
        installmentDueMap.set(Number(d.saleId), d);
    } catch {}
    try {
      const checkRows = await allAsync(
        `SELECT x.saleId,
                COUNT(CASE WHEN x.remainingAmount > 0.00001 AND x.normalizedStatus <> 'نقد شد' THEN 1 END) AS unpaidCheckCount,
                COALESCE(SUM(CASE WHEN x.remainingAmount > 0.00001 AND x.normalizedStatus <> 'نقد شد' THEN x.remainingAmount ELSE 0 END),0) AS unpaidCheckAmount,
                COALESCE(SUM(CASE WHEN x.remainingAmount > 0.00001 AND x.normalizedStatus <> 'نقد شد' AND x.dueDate < ? THEN x.remainingAmount ELSE 0 END),0) AS overdueCheckAmount,
                SUM(CASE WHEN x.remainingAmount > 0.00001 AND x.normalizedStatus <> 'نقد شد' AND x.dueDate < ? THEN 1 ELSE 0 END) AS overdueCheckCount,
                MIN(CASE WHEN x.remainingAmount > 0.00001 AND x.normalizedStatus <> 'نقد شد' THEN x.dueDate ELSE NULL END) AS nearestCheckDueDate,
                MIN(CASE WHEN x.remainingAmount > 0.00001 AND x.normalizedStatus <> 'نقد شد' AND x.dueDate < ? THEN x.dueDate ELSE NULL END) AS earliestCheckOverdueDate
           FROM (
             SELECT ic.saleId, ic.dueDate,
                    CASE
                      WHEN TRIM(COALESCE(ic.status,'')) IN ('نقد شد','نقدشده','وصول شده','پاس شده','تسویه شده','پرداخت شده','تکمیل شده','paid','Paid','cashed','Cashed') THEN 'نقد شد'
                      ELSE TRIM(COALESCE(ic.status,'نزد فروشنده'))
                    END AS normalizedStatus,
                    MAX(0, COALESCE(ic.amount,0) - COALESCE((
                      SELECT SUM(it.amount_paid)
                        FROM installment_payments rp
                        JOIN installment_transactions it ON it.installment_payment_id = rp.id
                       WHERE rp.sourceType = 'check_recovery' AND rp.sourceId = ic.id
                    ),0)) AS remainingAmount
               FROM installment_checks ic
              WHERE ic.saleId IN (${placeholders})
           ) x
          GROUP BY x.saleId`,
        [todayJ, todayJ, todayJ, ...installmentSaleIds],
      );
      for (const ch of checkRows as any[]) {
        const saleId = Number(ch.saleId);
        const cur = installmentDueMap.get(saleId) || { saleId };
        const installmentOpen = Math.max(0, Number(cur.unpaidAmount || 0));
        const checkOpen = Math.max(0, Number(ch.unpaidCheckAmount || 0));
        const useCheckSchedule = checkOpen > installmentOpen;
        cur.unpaidAmount = Math.max(installmentOpen, checkOpen);
        cur.unpaidCount = useCheckSchedule
          ? Number(ch.unpaidCheckCount || 0)
          : Number(cur.unpaidCount || 0);
        cur.overdueAmount = useCheckSchedule
          ? Number(ch.overdueCheckAmount || 0)
          : Number(cur.overdueAmount || 0);
        cur.overdueCount = useCheckSchedule
          ? Number(ch.overdueCheckCount || 0)
          : Number(cur.overdueCount || 0);
        cur.nearestDueDate = useCheckSchedule
          ? ch.nearestCheckDueDate || null
          : cur.nearestDueDate || null;
        cur.earliestOverdueDate = useCheckSchedule
          ? ch.earliestCheckOverdueDate || null
          : cur.earliestOverdueDate || null;
        installmentDueMap.set(saleId, cur);
      }
    } catch {}
  }

  const today = moment().startOf("day");
  const items: any[] = [];
  for (const [key, groupRows] of rowsByDoc.entries()) {
    if (!groupRows.length) continue;
    const first = groupRows[0] || {};
    const doc = docMap.get(key) || {};
    const sourceType =
      String(first.sourceType || doc.sourceType || key.split(":")[0]) ===
      "installment"
        ? "installment"
        : "invoice";
    const paymentType =
      String(first.paymentType || doc.paymentType || "cash").toLowerCase() ===
      "installment"
        ? "installment"
        : String(
              first.paymentType || doc.paymentType || "cash",
            ).toLowerCase() === "credit"
          ? "credit"
          : "cash";
    const orderId = Number(
      first.orderId || doc.orderId || key.split(":")[1] || 0,
    );
    const customerId = Number(first.customerId || doc.customerId || 0);
    const customer = customerId ? customerMap.get(customerId) : null;
    const total = groupRows.reduce(
      (sum, row) => sum + Number(row?.lineTotal || 0),
      0,
    );
    const received = groupRows.reduce(
      (sum, row) => sum + Number(row?.receivedAmount || 0),
      0,
    );
    const fullProfit = groupRows.reduce(
      (sum, row) =>
        sum +
        Number(
          row?.fullProfit ??
            Number(row?.lineTotal || 0) - Number(row?.lineCost || 0),
        ),
      0,
    );
    const realizedProfit = groupRows.reduce(
      (sum, row) => sum + Number(row?.realizedProfit || 0),
      0,
    );
    const unrecognizedProfit = groupRows.reduce(
      (sum, row) =>
        sum +
        Number(
          row?.unrecognizedProfit ??
            Number(row?.fullProfit ?? 0) - Number(row?.realizedProfit || 0),
        ),
      0,
    );
    const totalDiscount = groupRows.reduce(
      (sum, row) => sum + Number(row?.totalDiscountAmount || 0),
      0,
    );
    const collectionRate =
      total > 0 ? Math.min(100, Math.max(0, (received / total) * 100)) : 0;
    const outstanding = Math.max(0, total - received);
    const transactionDate = String(
      first.transactionDate || doc.transactionDate || "",
    );
    const txMoment = parseProductSalesRiskDate(transactionDate);
    const ageDays = txMoment ? Math.max(0, today.diff(txMoment, "days")) : 0;
    const due =
      sourceType === "installment" ? installmentDueMap.get(orderId) : null;
    const dueDate = due?.nearestDueDate || null;
    const dueMoment = parseProductSalesRiskDate(dueDate);
    const overdueBase = due?.earliestOverdueDate
      ? parseProductSalesRiskDate(due.earliestOverdueDate)
      : null;
    const overdueDays = overdueBase
      ? Math.max(0, today.diff(overdueBase, "days"))
      : dueMoment && dueMoment.isBefore(today)
        ? Math.max(0, today.diff(dueMoment, "days"))
        : 0;
    const dueInDays = dueMoment ? dueMoment.diff(today, "days") : null;
    const overdueCount = outstanding > 0.00001
      ? Math.max(0, Number(due?.overdueCount || 0))
      : 0;
    const overdueAmount = Math.min(
      outstanding,
      Math.max(0, Number(due?.overdueAmount || 0)),
    );
    const customerBalance = Math.max(
      0,
      Number(balanceMap.get(customerId) || 0),
    );
    const discountRate =
      total > 0 ? (totalDiscount / (total + totalDiscount)) * 100 : 0;
    const hasHighDiscountOpen =
      discountRate >= 12 && outstanding > 0 && collectionRate < 85;

    if (paymentType === "cash" || outstanding <= 1000) continue;

    let score = paymentType === "installment" ? 15 : 10;
    const reasons: string[] = [];
    if (collectionRate < 30) {
      score += 30;
      reasons.push(
        `درصد وصول پایین است (${formatExactPercentText(collectionRate)})`,
      );
    } else if (collectionRate < 60) {
      score += 18;
      reasons.push(
        `درصد وصول متوسط رو به پایین است (${formatExactPercentText(collectionRate)})`,
      );
    } else if (collectionRate < 90) {
      score += 8;
      reasons.push(
        `بخشی از مبلغ هنوز وصول نشده است (${formatExactPercentText(collectionRate)} وصول)`,
      );
    }
    if (overdueDays > 30) {
      score += 30;
      reasons.push(
        `${formatExactNumberText(overdueDays)} روز از سررسید گذشته است`,
      );
    } else if (overdueDays > 7) {
      score += 18;
      reasons.push(
        `${formatExactNumberText(overdueDays)} روز تأخیر در سررسید دارد`,
      );
    } else if (overdueDays > 0) {
      score += 10;
      reasons.push("سررسید این سند گذشته است");
    } else if (
      typeof dueInDays === "number" &&
      dueInDays >= 0 &&
      dueInDays <= 7
    ) {
      score += 7;
      reasons.push(
        `سررسید تا ${formatExactNumberText(dueInDays)} روز آینده است`,
      );
    }
    if (ageDays > 60) {
      score += 20;
      reasons.push(
        `از تاریخ فروش ${formatExactNumberText(ageDays)} روز گذشته است`,
      );
    } else if (ageDays > 30) {
      score += 12;
      reasons.push(
        `بیش از ${formatExactNumberText(ageDays)} روز از فروش گذشته است`,
      );
    } else if (ageDays > 14) {
      score += 6;
      reasons.push("فروش بیشتر از دو هفته باز مانده است");
    }
    if (unrecognizedProfit > 5000000) {
      score += 18;
      reasons.push(
        `سود وصول‌نشده بالاست: ${formatReportMoneyText(unrecognizedProfit)}`,
      );
    } else if (unrecognizedProfit > 1000000) {
      score += 10;
      reasons.push(
        `سود وصول‌نشده قابل توجه است: ${formatReportMoneyText(unrecognizedProfit)}`,
      );
    }
    if (customerBalance > 10000000) {
      score += 15;
      reasons.push(
        `مانده حساب مشتری بالاست: ${formatReportMoneyText(customerBalance)}`,
      );
    } else if (customerBalance > 3000000) {
      score += 8;
      reasons.push(
        `مشتری مانده حساب باز دارد: ${formatReportMoneyText(customerBalance)}`,
      );
    }
    if (overdueCount >= 3) {
      score += 20;
      reasons.push(
        `${formatExactNumberText(overdueCount)} قسط/چک عقب‌افتاده وجود دارد`,
      );
    } else if (overdueCount > 0) {
      score += 10;
      reasons.push(
        `${formatExactNumberText(overdueCount)} مورد سررسید عقب‌افتاده وجود دارد`,
      );
    }
    if (overdueAmount > 0)
      reasons.push(
        `مبلغ سررسید گذشته: ${formatReportMoneyText(overdueAmount)}`,
      );
    if (hasHighDiscountOpen) {
      score += 8;
      reasons.push(
        `تخفیف نسبتاً بالا ثبت شده و هنوز کامل وصول نشده است (${formatExactPercentText(discountRate)})`,
      );
    }
    const override = String(customer?.riskOverride || "").toLowerCase();
    if (
      override.includes("high") ||
      override.includes("critical") ||
      override.includes("بحرانی")
    ) {
      score += 12;
      reasons.push("برای این مشتری سطح ریسک دستی بالا ثبت شده است");
    }

    const meta = productSalesRiskLevelMeta(score);
    if (!reasons.length)
      reasons.push("مانده باز وجود دارد، اما نشانه بحرانی جدی دیده نشد");
    items.push({
      id: key,
      level: meta.level,
      label: meta.label,
      score: Math.min(100, score),
      sourceType,
      paymentType,
      orderId,
      customerId,
      customerName: customer?.fullName || "مشتری ثبت‌نشده",
      customerPhone: customer?.phoneNumber || "",
      transactionDate,
      dueDate,
      ageDays,
      dueInDays: typeof dueInDays === "number" ? dueInDays : null,
      overdueDays,
      overdueCount,
      overdueAmount,
      contractualTotal: total,
      receivedAmount: received,
      outstandingAmount: outstanding,
      fullProfit,
      realizedProfit,
      unrecognizedProfit,
      collectionRate,
      customerBalance,
      discountRate,
      reasons,
    });
  }

  const levelRank: any = { critical: 4, urgent: 3, followup: 2, low: 1 };
  const sortedItems = items.sort(
    (a, b) =>
      levelRank[b.level] - levelRank[a.level] ||
      Number(b.score || 0) - Number(a.score || 0) ||
      Number(b.outstandingAmount || 0) - Number(a.outstandingAmount || 0),
  );
  const counts = sortedItems.reduce(
    (acc: any, item: any) => {
      acc[item.level] = (acc[item.level] || 0) + 1;
      return acc;
    },
    { low: 0, followup: 0, urgent: 0, critical: 0 },
  );
  const totalOutstanding = sortedItems.reduce(
    (sum, item) => sum + Number(item.outstandingAmount || 0),
    0,
  );
  const totalUnrecognizedProfit = sortedItems.reduce(
    (sum, item) => sum + Number(item.unrecognizedProfit || 0),
    0,
  );
  const highestScore = sortedItems.length
    ? Math.max(...sortedItems.map((item) => Number(item.score || 0)))
    : 0;
  const status =
    counts.critical > 0
      ? "critical"
      : counts.urgent > 0
        ? "urgent"
        : counts.followup > 0
          ? "followup"
          : "low";

  return {
    status,
    totalDocs: sortedItems.length,
    counts,
    totalOutstanding,
    totalUnrecognizedProfit,
    highestScore,
    items: sortedItems.slice(0, Math.max(1, Number(limit || 80))),
  };
}
