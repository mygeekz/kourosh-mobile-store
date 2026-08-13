import { formatExactNumberText } from "../../../utils/exactNumber";
import {
  smartInsightNum,
  smartInsightPercent,
  smartInsightSafeRows,
} from "./smartInsightCore.service";

type AddInsight = (raw: any) => void;
type AiIsEnabled = (key: string) => boolean;

export async function buildSalesAgentLeads({
  customerIntelligence,
  pricingRecommendations,
  aiIsEnabled,
  addInsight,
}: {
  customerIntelligence: any[];
  pricingRecommendations: any[];
  aiIsEnabled: AiIsEnabled;
  addInsight: AddInsight;
}): Promise<any[]> {
        // --- AI Sales Agent: active selling / collection playbook based on customer intelligence, pricing and purchase history ---
        const customerIdsForAgent = customerIntelligence
          .map((c: any) => String(c.customerId || ""))
          .filter(Boolean)
          .slice(0, 20);
        const lastCustomerItems =
          aiIsEnabled("sales_agent") && customerIdsForAgent.length
            ? await smartInsightSafeRows(
                `
        SELECT
          so.customerId,
          p.id AS productId,
          p.name AS productName,
          MAX(so.transactionDate) AS lastBoughtAt,
          SUM(COALESCE(soi.quantity, 0)) AS boughtQty,
          SUM(COALESCE(soi.totalPrice, 0)) AS boughtAmount
        FROM sales_orders so
        JOIN sales_order_items soi ON soi.orderId = so.id AND soi.itemType = 'inventory'
        LEFT JOIN products p ON p.id = soi.itemId
        WHERE so.customerId IN (${customerIdsForAgent.map(() => "?").join(",")})
          AND COALESCE(so.status, 'active') = 'active'
        GROUP BY so.customerId, p.id, p.name
        ORDER BY MAX(so.transactionDate) DESC, SUM(COALESCE(soi.totalPrice, 0)) DESC
      `,
                customerIdsForAgent
              )
            : [];
        const lastItemByCustomer = new Map();
        for (const row of lastCustomerItems || []) {
          const key = String(row.customerId || "");
          if (!lastItemByCustomer.has(key) && row.productName)
            lastItemByCustomer.set(key, row);
        }
        const bestPricingProduct =
          pricingRecommendations.find(
            (p: any) =>
              smartInsightNum(p.expectedProfitDelta) >= 0 &&
              smartInsightNum(p.optimalPrice) > 0
          ) ||
          pricingRecommendations[0] ||
          null;
        const salesAgentLeads = aiIsEnabled("sales_agent")
          ? customerIntelligence
              .filter(
                (c: any) =>
                  c.customerId &&
                  (smartInsightNum(c.profitScore) >= 45 ||
                    smartInsightNum(c.riskScore) >= 45 ||
                    smartInsightNum(c.daysSinceLast) >= 21 ||
                    smartInsightNum(c.discountRate) >= 10)
              )
              .map((c: any) => {
                const lastItem =
                  lastItemByCustomer.get(String(c.customerId)) || {};
                const isCollection =
                  smartInsightNum(c.creditRate) >= 45 ||
                  smartInsightNum(c.riskScore) >= 68;
                const isWinback = smartInsightNum(c.daysSinceLast) >= 35;
                const isDiscountSeeker = smartInsightNum(c.discountRate) >= 12;
                const isVip = smartInsightNum(c.profitScore) >= 70;
                const targetProduct =
                  lastItem.productName ||
                  bestPricingProduct?.productName ||
                  "محصولات تازه فروشگاه";
                const intent = isCollection
                  ? "collection"
                  : isWinback
                    ? "winback"
                    : isVip
                      ? "vip_upsell"
                      : isDiscountSeeker
                        ? "bundle_offer"
                        : "cross_sell";
                const title =
                  intent === "collection"
                    ? "پیگیری وصول بدون از دست دادن مشتری"
                    : intent === "winback"
                      ? "بازگرداندن مشتری در حال ریزش"
                      : intent === "vip_upsell"
                        ? "پیشنهاد VIP برای مشتری سودآور"
                        : intent === "bundle_offer"
                          ? "تبدیل تخفیف به باندل سودآور"
                          : "فروش مکمل شخصی‌سازی‌شده";
                const message =
                  intent === "collection"
                    ? `سلام ${c.customerName} عزیز، برای هماهنگی تسویه حساب قبلی و ادامه خریدهای بعدی در خدمتتون هستیم. اگر مایل باشید امروز وضعیت حساب رو با هم نهایی کنیم.`
                    : intent === "winback"
                      ? `سلام ${c.customerName} عزیز، ${targetProduct} و چند قلم تازه فروشگاه موجود شده. اگر دوست داشتید، امروز می‌تونیم یک پیشنهاد مناسب بر اساس خرید قبلی‌تون آماده کنیم.`
                      : intent === "vip_upsell"
                        ? `سلام ${c.customerName} عزیز، برای شما یک پیشنهاد ویژه روی ${targetProduct} آماده کردیم؛ ترکیب تازه و باکیفیت با اولویت موجودی امروز.`
                        : intent === "bundle_offer"
                          ? `سلام ${c.customerName} عزیز، به جای تخفیف مستقیم، یک ترکیب اقتصادی و به‌صرفه از ${targetProduct} براتون آماده کردیم که ارزش خرید بالاتری داره.`
                          : `سلام ${c.customerName} عزیز، با توجه به خرید قبلی شما از ${targetProduct}، چند گزینه مکمل تازه داریم که می‌تونه انتخاب خوبی برای خرید بعدی باشه.`;
                const priority = (
                  smartInsightNum(c.profitScore) * 0.62 +
                    smartInsightNum(c.riskScore) * 0.38 +
                    Math.min(24, smartInsightNum(c.daysSinceLast) / 2) +
                    (intent === "collection"
                      ? 22
                      : intent === "vip_upsell"
                        ? 18
                        : intent === "winback"
                          ? 14
                          : 8)
                );
                return {
                  id: `sales-agent-${c.customerId}-${intent}`,
                  customerId: c.customerId,
                  customerName: c.customerName,
                  phoneNumber: c.phoneNumber || "",
                  segment: c.segment || "عادی",
                  intent,
                  title,
                  priority: Math.min(100, Math.max(1, priority)),
                  recommendedChannel: c.phoneNumber
                    ? "تماس / پیامک / تلگرام"
                    : "تماس حضوری یا ثبت شماره",
                  targetProduct,
                  message,
                  reason:
                    intent === "collection"
                      ? "ریسک اعتباری یا خرید نسیه بالا است."
                      : intent === "winback"
                        ? "فاصله آخرین خرید زیاد شده و احتمال ریزش وجود دارد."
                        : intent === "vip_upsell"
                          ? "سودآوری مشتری بالاست و ارزش پیشنهاد ویژه دارد."
                          : intent === "bundle_offer"
                            ? "رفتار مشتری تخفیف‌محور است؛ باندل بهتر از کاهش قیمت است."
                            : "رفتار خرید، ظرفیت فروش مکمل را نشان می‌دهد.",
                  expectedImpact:
                    intent === "collection"
                      ? "کاهش ریسک وصول"
                      : intent === "winback"
                        ? "بازگشت مشتری"
                        : intent === "vip_upsell"
                          ? "افزایش سود فاکتور"
                          : intent === "bundle_offer"
                            ? "حفظ حاشیه سود"
                            : "افزایش فروش مکمل",
                  ctaLabel:
                    intent === "collection"
                      ? "پیگیری وصول"
                      : "آماده‌سازی پیام فروش",
                  to: c.customerId ? `/customers/${c.customerId}` : "/customers",
                };
              })
              .sort(
                (a: any, b: any) =>
                  smartInsightNum(b.priority) - smartInsightNum(a.priority)
              )
              .slice(0, 8)
          : [];

        if (salesAgentLeads.length) {
          const topLead = salesAgentLeads[0];
          addInsight({
            id: "ai-sales-agent-active-lead",
            type: "ai_sales_agent",
            category: "فروش فعال",
            severity: smartInsightNum(topLead.priority) >= 78 ? "high" : "medium",
            score: topLead.priority,
            confidence: Math.min(92, 58 + salesAgentLeads.length * 5),
            icon: "fa-headset",
            title: "دستیار فروش فعال، مشتری آماده اقدام پیدا کرد",
            summary: `${topLead.customerName} برای «${topLead.title}» اولویت دارد؛ پیام آماده و مسیر اقدام ساخته شد.`,
            reasons: [
              topLead.reason,
              `سگمنت: ${topLead.segment}`,
              `کانال پیشنهادی: ${topLead.recommendedChannel}`,
              `اثر مورد انتظار: ${topLead.expectedImpact}`,
            ],
            metrics: [
              { label: "اولویت", value: smartInsightPercent(topLead.priority) },
              {
                label: "لید فعال",
                value: formatExactNumberText(salesAgentLeads.length),
              },
              { label: "هدف", value: topLead.expectedImpact },
            ],
            actions: [{ label: "مشاهده مشتری", to: topLead.to, icon: "fa-user" }],
            target: { salesAgent: salesAgentLeads },
          });
        }


  return salesAgentLeads;
}
