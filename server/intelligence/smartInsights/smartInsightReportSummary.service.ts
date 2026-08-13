import { formatExactNumberText } from "../../../utils/exactNumber";
import {
  SMART_INSIGHT_CURRENCY_BASE,
  SMART_INSIGHT_DISPLAY_CURRENCY,
  smartInsightMoney,
  smartInsightNum,
  smartInsightRound,
  smartInsightSeverityFromScore,
} from "./smartInsightCore.service";

const createSmartInsightCollector = () => {
  const insights: any[] = [];
  const addInsight = (raw: any) => {
    const score = Math.max(
      0,
      Math.min(100, (smartInsightNum(raw.score || 0))),
    );
    const severity = raw.severity || smartInsightSeverityFromScore(score);
    insights.push({
      id: raw.id || `insight-${insights.length + 1}`,
      type: raw.type || "daily_summary",
      category: raw.category || "هوشمند",
      title: raw.title || "Insight فروشگاه",
      summary: raw.summary || "",
      severity,
      score,
      confidence: Math.max(
        0,
        Math.min(100, (smartInsightNum(raw.confidence))),
      ),
      icon: raw.icon || "fa-brain",
      tone: raw.tone || severity,
      reasons: Array.isArray(raw.reasons) ? raw.reasons.filter(Boolean) : [],
      metrics: Array.isArray(raw.metrics) ? raw.metrics.filter(Boolean) : [],
      actions: Array.isArray(raw.actions) ? raw.actions.filter(Boolean) : [],
      target: raw.target || {},
    });
  };
  return { addInsight, insights };
};

const ensureDefaultSmartInsight = ({
  addInsight,
  fromJ,
  insights,
  salesStats,
  toJ,
}: {
  addInsight: (raw: any) => void;
  fromJ: string;
  insights: any[];
  salesStats: any;
  toJ: string;
}) => {
  if (insights.length) return;
  addInsight({
    id: "daily-positive-summary",
    type: "daily_summary",
    category: "خلاصه روز",
    severity: "positive",
    score: 0,
    confidence: Math.min(
      100,
      smartInsightNum(salesStats.ordersCount) * 5,
    ),
    icon: "fa-circle-check",
    title: "در بازه فعلی هشدار جدی دیده نشد",
    summary:
      "سیستم افت شدید، تخفیف غیرعادی سنگین یا ریسک وصول بحرانی در بازه انتخابی پیدا نکرده است.",
    reasons: [
      "داده‌های فعلی در محدوده هشدارهای تعریف‌شده قرار نگرفته‌اند.",
      "با افزایش داده فروش، دقت یادگیری سیستم بالاتر می‌رود.",
    ],
    metrics: [
      {
        label: "فروش کل",
        value: smartInsightMoney(salesStats.totalSales),
      },
      {
        label: "تعداد فاکتور",
        value: formatExactNumberText(smartInsightNum(salesStats.ordersCount)),
      },
      { label: "بازه", value: `${fromJ} تا ${toJ}` },
    ],
    actions: [
      {
        label: "داشبورد گزارشات",
        to: "/reports",
        icon: "fa-chart-column",
      },
    ],
  });
};

const sortSmartInsightsByPriority = (insights: any[]) => {
  insights.sort((a, b) => {
    const rank: any = {
      critical: 5,
      high: 4,
      medium: 3,
      low: 2,
      positive: 1,
    };
    return (
      (rank[b.severity] || 0) - (rank[a.severity] || 0) ||
      smartInsightNum(b.score) - smartInsightNum(a.score)
    );
  });
};

const buildSmartInsightReportData = ({
  avgDaily,
  customerIntelligence,
  dailyBrief,
  executiveBrain,
  fromJ,
  hiddenProfitCards,
  insights,
  learning,
  memorySummary,
  pricingRecommendations,
  profitEngine,
  salesAgentLeads,
  salesStats,
  summaryCounts,
  suspiciousInvoiceAudits,
  toJ,
  todayActions,
  trendPct,
}: {
  avgDaily: number;
  customerIntelligence: any;
  dailyBrief: any[];
  executiveBrain: any;
  fromJ: string;
  hiddenProfitCards: any[];
  insights: any[];
  learning: any;
  memorySummary: any;
  pricingRecommendations: any[];
  profitEngine: any;
  salesAgentLeads: any[];
  salesStats: any;
  summaryCounts: any;
  suspiciousInvoiceAudits: any[];
  toJ: string;
  todayActions: any[];
  trendPct: number;
}) => ({
  from: fromJ,
  to: toJ,
  generatedAt: new Date().toISOString(),
  currencyBase: SMART_INSIGHT_CURRENCY_BASE,
  displayCurrency: SMART_INSIGHT_DISPLAY_CURRENCY,
  moneyDivisor: 1,
  learning,
  summary: {
    totalInsights: insights.length,
    ...summaryCounts,
    totalSales: smartInsightRound(salesStats.totalSales),
    ordersCount: smartInsightNum(salesStats.ordersCount),
    avgDaily: smartInsightRound(avgDaily),
    trendPct: smartInsightRound(trendPct),
    decisionMemory: memorySummary,
  },
  dailyBrief,
  executiveBrain,
  todayActions,
  hiddenProfit: hiddenProfitCards,
  suspiciousAudit: suspiciousInvoiceAudits,
  customerIntelligence,
  pricingRecommendations,
  salesAgentLeads,
  profitEngine,
  insights,
});

export {
  buildSmartInsightReportData,
  createSmartInsightCollector,
  ensureDefaultSmartInsight,
  sortSmartInsightsByPriority,
};
