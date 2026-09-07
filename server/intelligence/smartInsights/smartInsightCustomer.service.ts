import { formatExactNumberText } from "../../../utils/exactNumber";
import moment from "jalali-moment";
import { runAsync } from "../../database";
import {
  smartInsightMoney,
  smartInsightNum,
  smartInsightPercent,
  smartInsightRound,
  smartInsightSafeRows,
} from "./smartInsightCore.service";

type AddInsight = (raw: any) => void;
type AiIsEnabled = (key: string) => boolean;

export async function buildCustomerIntelligence({
  fromISO,
  toISO,
  toMoment,
  aiIsEnabled,
  addInsight,
}: {
  fromISO: string;
  toISO: string;
  toMoment: any;
  aiIsEnabled: AiIsEnabled;
  addInsight: AddInsight;
}): Promise<any[]> {
        // --- Customer Intelligence Engine + Auto Pricing Engine (applied, not placeholder) ---
        const customerIntelligenceRows = aiIsEnabled("customer_intelligence")
          ? await smartInsightSafeRows(
              `
        WITH customer_sales AS (
          SELECT
            c.id AS customerId,
            c.fullName AS customerName,
            c.phoneNumber AS phoneNumber,
            COUNT(DISTINCT so.id) AS ordersCount,
            COALESCE(SUM(so.grandTotal), 0) AS totalSpend,
            COALESCE(SUM(so.discount), 0) + COALESCE(SUM(soi.discountPerItem), 0) AS totalDiscount,
            COALESCE(SUM((COALESCE(soi.unitPrice,0) - COALESCE(NULLIF(soi.buyPrice,0), p.purchasePrice, 0)) * COALESCE(soi.quantity,0) - COALESCE(soi.discountPerItem,0)), 0) AS estimatedProfit,
            MIN(so.transactionDate) AS periodFirstPurchaseAt,
            MAX(so.transactionDate) AS periodLastPurchaseAt,
            SUM(CASE WHEN COALESCE(so.paymentMethod,'cash') IN ('credit','installment','mixed') THEN 1 ELSE 0 END) AS creditOrders,
            COUNT(DISTINCT so.transactionDate) AS activeDays
          FROM customers c
          JOIN sales_orders so ON so.customerId = c.id AND COALESCE(so.status, 'active') = 'active'
          LEFT JOIN sales_order_items soi ON soi.orderId = so.id
          LEFT JOIN products p ON soi.itemType = 'inventory' AND soi.itemId = p.id
          WHERE date(substr(so.transactionDate, 1, 10)) BETWEEN date(?) AND date(?)
          GROUP BY c.id, c.fullName, c.phoneNumber
        ), last_before AS (
          SELECT customerId, MAX(transactionDate) AS prevPurchaseAt
          FROM sales_orders
          WHERE transactionDate < ? AND customerId IS NOT NULL AND COALESCE(status, 'active') = 'active'
          GROUP BY customerId
        ), last_purchase AS (
          SELECT customerId, MAX(transactionDate) AS lastPurchaseAt
          FROM sales_orders
          WHERE customerId IS NOT NULL
            AND COALESCE(status, 'active') = 'active'
            AND date(substr(transactionDate, 1, 10)) <= date(?)
          GROUP BY customerId
        )
        SELECT cs.*, lb.prevPurchaseAt, lp.lastPurchaseAt AS absoluteLastPurchaseAt
        FROM customer_sales cs
        LEFT JOIN last_before lb ON lb.customerId = cs.customerId
        LEFT JOIN last_purchase lp ON lp.customerId = cs.customerId
        ORDER BY estimatedProfit DESC, totalSpend DESC
        LIMIT 12
      `,
              [fromISO, toISO, fromISO, toISO]
            )
          : [];

        const customerIntelligence = (customerIntelligenceRows || []).map(
          (r: any) => {
            const totalSpend = smartInsightNum(r.totalSpend);
            const profit = smartInsightNum(r.estimatedProfit);
            const discountRate =
              totalSpend > 0
                ? (smartInsightNum(r.totalDiscount) / totalSpend) * 100
                : 0;
            const creditRate =
              smartInsightNum(r.ordersCount) > 0
                ? (smartInsightNum(r.creditOrders) /
                    smartInsightNum(r.ordersCount)) *
                  100
                : 0;
            const lastDateRaw = String(
              r.absoluteLastPurchaseAt ||
                r.periodLastPurchaseAt ||
                r.lastPurchaseAt ||
                ""
            );
            const lastDateIso = lastDateRaw ? lastDateRaw.slice(0, 10) : "";
            const lastPurchaseMoment = lastDateIso
              ? moment(lastDateIso, "YYYY-MM-DD", true)
              : null;
            const daysSinceLast = lastPurchaseMoment?.isValid()
              ? Math.max(0, toMoment.diff(lastPurchaseMoment, "day"))
              : 999;
            const lastPurchaseLabel =
              daysSinceLast >= 999
                ? "نامشخص"
                : daysSinceLast === 0
                  ? "امروز"
                  : daysSinceLast === 1
                    ? "دیروز"
                    : `${formatExactNumberText(daysSinceLast)} روز قبل`;
            const recencyRisk = Math.min(45, Math.max(0, daysSinceLast - 14));
            const riskScore = Math.min(
              100,
              (discountRate * 1.15 + creditRate * 0.55 + recencyRisk)
            );
            const profitScore = Math.min(
              100,
              (
                (profit / Math.max(1, totalSpend)) * 180 +
                  Math.min(35, smartInsightNum(r.ordersCount) * 5) +
                  Math.min(25, profit / 2000000)
              )
            );
            const segments = [
              profitScore >= 70 ? "مشتری طلایی" : "",
              profitScore >= 48 ? "سودآور" : "",
              riskScore >= 62 ? "پرریسک" : "",
              discountRate >= 12 ? "تخفیف‌گیر حرفه‌ای" : "",
              creditRate >= 45 ? "کندپرداخت/اعتباری" : "",
              daysSinceLast >= 35 ? "در حال ریزش" : "",
            ].filter(Boolean);
            const action =
              riskScore >= 62
                ? "قبل از فروش اعتباری بعدی سقف بدهی و تضمین را کنترل کن."
                : daysSinceLast >= 35
                  ? "یک پیشنهاد بازگشت کوتاه و شخصی‌سازی‌شده ارسال کن."
                  : discountRate >= 12
                    ? "تخفیف را به باندل سودآور تبدیل کن، نه کاهش مستقیم قیمت."
                    : profitScore >= 70
                      ? "برای این مشتری پیشنهاد VIP یا باندل پریمیوم بساز."
                      : "رفتار خرید را زیر نظر بگیر و پیشنهاد مکمل بده.";
            return {
              customerId: r.customerId,
              customerName: r.customerName || "مشتری بدون نام",
              phoneNumber: r.phoneNumber || "",
              segment: segments[0] || "عادی",
              segments,
              riskScore,
              profitScore,
              totalSpend: smartInsightRound(totalSpend),
              estimatedProfit: smartInsightRound(profit),
              discountRate: smartInsightRound(discountRate),
              creditRate: smartInsightRound(creditRate),
              daysSinceLast,
              lastPurchaseAt: lastDateIso,
              lastPurchaseLabel,
              action,
            };
          }
        );

        for (const c of customerIntelligence) {
          if (!c.customerId) continue;
          await runAsync(
            `
          INSERT INTO customer_scores (customerId, segment, riskScore, profitScore, lastCalculatedAt)
          VALUES (?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc'))
          ON CONFLICT(customerId) DO UPDATE SET
            segment = excluded.segment,
            riskScore = excluded.riskScore,
            profitScore = excluded.profitScore,
            lastCalculatedAt = excluded.lastCalculatedAt
        `,
            [
              c.customerId,
              c.segment || "عادی",
              smartInsightNum(c.riskScore),
              smartInsightNum(c.profitScore),
            ]
          ).catch(() => null as any);
        }

        const topCustomerRisk = customerIntelligence.find(
          (c: any) =>
            smartInsightNum(c.riskScore) >= 62 ||
            String(c.segment).includes("ریزش")
        );
        if (topCustomerRisk) {
          addInsight({
            id: "customer-intelligence-risk",
            type: "customer_intelligence",
            category: "مشتری",
            severity:
              smartInsightNum(topCustomerRisk.riskScore) >= 72
                ? "high"
                : "medium",
            score: Math.max(58, smartInsightNum(topCustomerRisk.riskScore)),
            confidence: Math.min(92, 60 + customerIntelligence.length * 3),
            icon: "fa-user-shield",
            title: "شخصیت مشتری نیازمند اقدام شناسایی شد",
            summary: `${topCustomerRisk.customerName} در سگمنت «${topCustomerRisk.segment}» قرار گرفته و بهتر است رفتار فروش/وصول برای او کنترل شود.`,
            reasons: [
              `ریسک: ${smartInsightPercent(topCustomerRisk.riskScore)}`,
              `تخفیف دریافتی: ${smartInsightPercent(topCustomerRisk.discountRate)}`,
              `نرخ خرید اعتباری: ${smartInsightPercent(topCustomerRisk.creditRate)}`,
              `آخرین خرید: ${topCustomerRisk.lastPurchaseLabel || (smartInsightNum(topCustomerRisk.daysSinceLast) >= 999 ? "نامشخص" : `${formatExactNumberText(smartInsightNum(topCustomerRisk.daysSinceLast))} روز قبل`)}`,
            ],
            metrics: [
              {
                label: "ریسک",
                value: smartInsightPercent(topCustomerRisk.riskScore),
              },
              {
                label: "سودآوری",
                value: smartInsightPercent(topCustomerRisk.profitScore),
              },
              {
                label: "سود تخمینی",
                value: smartInsightMoney(topCustomerRisk.estimatedProfit),
              },
            ],
            actions: [
              { label: "مشاهده مشتریان", to: "/customers", icon: "fa-users" },
            ],
            target: { customers: customerIntelligence.slice(0, 8) },
          });
        }


  return customerIntelligence;
}
