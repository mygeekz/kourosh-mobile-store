import { formatExactNumberText } from "../../../utils/exactNumber";
import {
  smartInsightNum,
  smartInsightSafeOne,
} from "./smartInsightCore.service";

const resolveLearningLevel = (signalsScore: number) =>
  signalsScore >= 86
    ? "excellent"
    : signalsScore >= 62
      ? "reliable"
      : signalsScore >= 28
        ? "learning"
        : "no_data";

const learningLabels: Record<string, string> = {
  excellent: "بسیار قابل اعتماد",
  reliable: "قابل اعتماد",
  learning: "در حال یادگیری",
  no_data: "داده کافی ندارد",
};

const learningDescriptions: Record<string, string> = {
  excellent:
    "سیستم داده کافی برای تشخیص الگوهای فروش، تخفیف، موجودی و وصول دارد.",
  reliable:
    "داده‌ها برای پیشنهادهای عملیاتی قابل اتکا هستند؛ با فروش بیشتر دقت بالاتر می‌رود.",
  learning:
    "سیستم هنوز در حال شناخت رفتار فروشگاه است و پیشنهادها محافظه‌کارانه ارائه می‌شوند.",
  no_data: "برای تحلیل هوشمند واقعی، فروش و تراکنش بیشتری لازم است.",
};

const collectSmartInsightLearningState = async ({
  fromISO,
  toISO,
  activeDays,
  salesStats,
}: {
  fromISO: string;
  toISO: string;
  activeDays: number;
  salesStats: any;
}) => {
  const soldProductCountRow = await smartInsightSafeOne(
    `
        SELECT COUNT(DISTINCT itemId) AS soldProducts
        FROM sales_order_items soi
        JOIN sales_orders so ON so.id = soi.orderId
        WHERE date(substr(so.transactionDate, 1, 10)) BETWEEN date(?) AND date(?) AND soi.itemType IN ('inventory', 'service', 'phone') AND COALESCE(so.status, 'active') = 'active'
      `,
    [fromISO, toISO]
  );
  const totalProductsRow = await smartInsightSafeOne(
    `SELECT COUNT(*) AS productsCount FROM products`
  );
  const totalCustomersRow = await smartInsightSafeOne(
    `SELECT COUNT(*) AS customersCount FROM customers`
  );
  const ordersCount = smartInsightNum(salesStats.ordersCount);
  const soldProducts = smartInsightNum(soldProductCountRow.soldProducts);
  const customersCount = smartInsightNum(totalCustomersRow.customersCount);
  const productsCount = smartInsightNum(totalProductsRow.productsCount);
  const signalsScore = Math.min(
    100,
    (
      ordersCount * 1.6 +
        activeDays * 2.2 +
        soldProducts * 3 +
        Math.min(customersCount, 80) * 0.28
    )
  );
  const learningLevel = resolveLearningLevel(signalsScore);

  return {
    signalsScore,
    learningLevel,
    learningLabel: learningLabels[learningLevel] || learningLabels.no_data,
    learningDescription:
      learningDescriptions[learningLevel] || learningDescriptions.no_data,
    ordersCount,
    soldProducts,
    customersCount,
    productsCount,
  };
};

const buildSmartInsightLearningPayload = ({
  learningState,
  memorySummary,
  fromJ,
  toJ,
  resetAt,
  activeDays,
}: {
  learningState: any;
  memorySummary: any;
  fromJ: string;
  toJ: string;
  resetAt: string | null;
  activeDays: number;
}) => ({
  level: learningState.learningLevel,
  label: learningState.learningLabel,
  description: learningState.learningDescription,
  confidence: learningState.signalsScore,
  lastResetAt: resetAt,
  signals: [
    {
      label: "سندهای بررسی‌شده",
      value: formatExactNumberText(smartInsightNum(learningState.ordersCount)),
    },
    {
      label: "روزهای فعال فروش",
      value: formatExactNumberText(smartInsightNum(activeDays)),
    },
    {
      label: "اقلام دارای فروش",
      value: formatExactNumberText(smartInsightNum(learningState.soldProducts)),
    },
    {
      label: "مشتریان ثبت‌شده",
      value: formatExactNumberText(smartInsightNum(learningState.customersCount)),
    },
    {
      label: "تصمیم‌های ثبت‌شده",
      value: formatExactNumberText(smartInsightNum(memorySummary.accepted)),
    },
  ],
});

export { buildSmartInsightLearningPayload, collectSmartInsightLearningState };
