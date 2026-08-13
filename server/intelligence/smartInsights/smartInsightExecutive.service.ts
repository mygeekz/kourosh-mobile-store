import { formatExactNumberText } from "../../../utils/exactNumber";
import {
  smartInsightMoney,
  smartInsightNum,
  smartInsightPercent,
} from "./smartInsightCore.service";
import { calculateExecutiveHealthScore } from "./smartInsightExecutiveScore.service";

const buildTodayActions = ({
  aiIsEnabled,
  insights,
}: {
  aiIsEnabled: (key: string) => boolean;
  insights: any[];
}) => {
  const severityWeight: any = {
    critical: 120,
    high: 95,
    medium: 70,
    low: 45,
    positive: 25,
  };
  const decisionPenalty: any = {
    accepted: 28,
    rejected: 60,
    snoozed: 12,
    pending: 0,
  };
  const typeBoost: any = {
    collection_risk: 18,
    invoice_audit: 20,
    hidden_loss: 16,
    stock_reorder: 14,
    discount_anomaly: 12,
    profit_quality: 10,
    sales_drop: 8,
  };
  return aiIsEnabled("today_actions")
    ? insights
        .filter(
          (i: any) =>
            String(i.severity) !== "positive" &&
            String(i.type) !== "daily_summary" &&
            String(i.decision?.userDecision || "pending") !== "rejected"
        )
        .map((i: any) => {
          const firstAction =
            Array.isArray(i.actions) && i.actions.length ? i.actions[0] : {};
          const repeatBoost = Math.min(
            18,
            smartInsightNum(i.decision?.occurrenceCount) * 2
          );
          const outcomeBoost =
            String(i.decision?.outcome || "unknown") === "positive"
              ? 8
              : String(i.decision?.outcome || "unknown") === "negative"
                ? -10
                : 0;
          const priority = Math.max(
            1,
            (
              (severityWeight[i.severity] || 50) +
                smartInsightNum(i.score) * 0.42 +
                smartInsightNum(i.confidence) * 0.18 +
                (typeBoost[i.type] || 0) +
                repeatBoost +
                outcomeBoost -
                (decisionPenalty[i.decision?.userDecision || "pending"] || 0)
            )
          );
          return {
            id: "today-action-" + i.id,
            insightId: i.id,
            title:
              i.type === "collection_risk"
                ? "اول وصول فوری را پیگیری کن"
                : i.type === "stock_reorder"
                  ? "خرید مجدد کالاهای پرفروش را بررسی کن"
                  : i.type === "invoice_audit"
                    ? "فاکتورهای مشکوک را کنترل کن"
                    : i.type === "hidden_loss"
                      ? "جلوی ضرر پنهان را بگیر"
                      : i.type === "discount_anomaly"
                        ? "تخفیف‌های غیرعادی را کنترل کن"
                        : i.type === "profit_quality"
                          ? "کیفیت سود وصول‌شده را بررسی کن"
                          : i.title,
            summary: i.summary,
            priority,
            severity: i.severity,
            icon: i.icon,
            actionLabel: firstAction.label || "باز کردن اقدام",
            to: firstAction.to || "",
            decision: i.decision || {},
          };
        })
        .sort(
          (a: any, b: any) =>
            smartInsightNum(b.priority) - smartInsightNum(a.priority)
        )
        .slice(0, 3)
    : [];
};

const summarizeSmartInsightMemory = (memoryRows: any[]) =>
  (memoryRows || []).reduce(
    (acc: any, r: any) => {
      const decision = String(r.userDecision || "pending");
      const outcome = String(r.outcome || "unknown");
      acc.total += 1;
      acc[decision] = (acc[decision] || 0) + 1;
      acc["outcome_" + outcome] = (acc["outcome_" + outcome] || 0) + 1;
      return acc;
    },
    {
      total: 0,
      pending: 0,
      accepted: 0,
      rejected: 0,
      snoozed: 0,
      outcome_positive: 0,
      outcome_negative: 0,
      outcome_neutral: 0,
      outcome_unknown: 0,
    }
  );

const countSmartInsightSeverities = (insights: any[]) =>
  insights.reduce(
    (acc: any, i: any) => {
      acc[i.severity] = (acc[i.severity] || 0) + 1;
      return acc;
    },
    { critical: 0, high: 0, medium: 0, low: 0, positive: 0 }
  );

const buildExecutiveDecisionLayer = ({
  insights,
  todayActions,
  memorySummary,
  memoryRows,
  profitEngine,
  suspiciousInvoiceAudits,
  signalsScore,
  salesStats,
  trendPct,
  previousAvgDaily,
}: {
  insights: any[];
  todayActions: any[];
  memorySummary: any;
  memoryRows: any[];
  profitEngine: any;
  suspiciousInvoiceAudits: any[];
  signalsScore: number;
  salesStats: any;
  trendPct: number;
  previousAvgDaily: number;
}) => {
  const summaryCounts = countSmartInsightSeverities(insights);
  const urgentCount =
    smartInsightNum(summaryCounts.critical) + smartInsightNum(summaryCounts.high);
  const avgConfidence = insights.length
    ? (
        insights.reduce(
          (sum: number, i: any) => sum + smartInsightNum(i.confidence),
          0
        ) / insights.length
      )
    : 0;
  const profitQuality = smartInsightNum(profitEngine?.summary?.qualityScore);
  const realMargin = smartInsightNum(profitEngine?.summary?.marginPct || 0);
  const auditRiskCount =
    suspiciousInvoiceAudits.length +
    insights.filter((i: any) =>
      ["invoice_audit", "hidden_loss", "discount_anomaly"].includes(
        String(i.type)
      )
    ).length;
  const collectionRiskCount = insights.filter(
    (i: any) => String(i.type) === "collection_risk"
  ).length;
  const inventoryRiskCount = insights.filter(
    (i: any) => String(i.type) === "stock_reorder"
  ).length;
  const decisionWinRate =
    smartInsightNum(memorySummary.accepted) > 0
      ? (
          (smartInsightNum(memorySummary.outcome_positive) /
            Math.max(1, smartInsightNum(memorySummary.accepted))) *
            100
        )
      : 0;
  const executiveScoreResult = calculateExecutiveHealthScore({
    insights,
    memorySummary,
    profitEngine,
    signalsScore,
    salesStats,
    trendPct,
    previousAvgDaily,
  });
  const executiveScore = executiveScoreResult.score;
  const executiveStatus =
    !executiveScoreResult.scoreAvailable
      ? "no_data"
      : smartInsightNum(executiveScore) >= 86
      ? "excellent"
      : smartInsightNum(executiveScore) >= 70
        ? "healthy"
        : smartInsightNum(executiveScore) >= 52
          ? "watch"
          : "risk";
  const executiveStatusLabel =
    executiveStatus === "no_data"
      ? "داده کافی نیست"
      : executiveStatus === "excellent"
      ? "عالی و قابل اتکا"
      : executiveStatus === "healthy"
        ? "سالم"
        : executiveStatus === "watch"
          ? "نیازمند پایش"
          : "پرریسک";
  const executiveNarrative =
    executiveStatus === "no_data"
      ? "برای محاسبه امتیاز واقعی، حداقل چند سند فروش و دو شاخص قابل اندازه‌گیری در بازه انتخابی لازم است."
      : executiveStatus === "excellent"
      ? "فروشگاه از نظر داده، سود و کنترل ریسک در وضعیت قابل اتکاست؛ تمرکز بعدی روی رشد سود و افزایش فروش تکراری باشد."
      : executiveStatus === "healthy"
        ? "وضعیت کلی خوب است، اما چند سیگنال مالی/عملیاتی نیاز به اقدام دارد تا سود واقعی افت نکند."
        : executiveStatus === "watch"
          ? "سیستم چند ریسک قابل توجه در سود، وصول یا موجودی دیده؛ قبل از تصمیم خرید یا تخفیف، موارد فوری بررسی شوند."
          : "ریسک گزارشات بالاست؛ بهتر است امروز اول اختلاف فاکتور، وصولی‌ها و فروش زیر قیمت کنترل شود.";
  const completedExecutiveActionIds = new Set(
    (memoryRows || [])
      .filter((row: any) => String(row.type || '') === 'executive_action' && String(row.userDecision || '') === 'accepted')
      .map((row: any) => String(row.insightId || ''))
      .filter(Boolean),
  );
  const rankedActionPool = [...todayActions, ...insights]
    .map((item: any, index: number) => ({
      id: String(item.id || item.insightId || `engine-action-${index}`),
      title: item.title || "اقدام مدیریتی",
      summary: item.summary || "",
      severity: item.severity || "medium",
      priority: smartInsightNum(item.priority) || smartInsightNum(item.score) || 40,
      to: item.to || item.actions?.[0]?.to || "",
      actionLabel: item.actionLabel || item.actions?.[0]?.label || "بررسی",
    }))
    .sort(
      (a: any, b: any) =>
        smartInsightNum(b.priority) - smartInsightNum(a.priority)
    );
  const seenEngineActions = new Set<string>();
  const nextBestActions = rankedActionPool
    .filter((a: any) => !completedExecutiveActionIds.has(String(a.id)))
    .filter((a: any) => {
      const key = `${a.title}-${a.to}`;
      if (seenEngineActions.has(key)) return false;
      seenEngineActions.add(key);
      return true;
    })
    .slice(0, 5);
  const executiveBrain = {
    score: executiveScore,
    scoreAvailable: executiveScoreResult.scoreAvailable,
    scoreBasis: "live_store_data",
    scoreComponents: executiveScoreResult.components,
    scoreEvidence: executiveScoreResult.evidence,
    status: executiveStatus,
    statusLabel: executiveStatusLabel,
    narrative: executiveNarrative,
    confidence: avgConfidence,
    winRate: decisionWinRate,
    focusAreas: [
      {
        key: "profit",
        label: "کیفیت سود",
        value:
          profitQuality || (Math.max(0, Math.min(100, realMargin * 4))),
        tone: (profitQuality || realMargin * 4) >= 70 ? "positive" : "warning",
      },
      {
        key: "audit",
        label: "ریسک اختلاف",
        value: auditRiskCount,
        tone: auditRiskCount > 0 ? "danger" : "positive",
      },
      {
        key: "collection",
        label: "ریسک وصول",
        value: collectionRiskCount,
        tone: collectionRiskCount > 0 ? "warning" : "positive",
      },
      {
        key: "inventory",
        label: "ریسک موجودی",
        value: inventoryRiskCount,
        tone: inventoryRiskCount > 0 ? "warning" : "positive",
      },
    ],
    nextBestActions,
    command:
      nextBestActions[0]?.title ||
      (urgentCount
        ? "موارد فوری گزارشات را بررسی کن"
        : "وضعیت پایدار است؛ روی رشد سود تمرکز کن"),
  };
  const dailyBrief = [
    `فروش بازه: ${smartInsightMoney(salesStats.totalSales)} از ${formatExactNumberText(smartInsightNum(salesStats.ordersCount))} سند.`,
    trendPct
      ? `روند نسبت به دوره قبل: ${trendPct >= 0 ? "رشد" : "افت"} ${smartInsightPercent(Math.abs(trendPct))}.`
      : "برای مقایسه روند، داده دوره قبل محدود است.",
    `${formatExactNumberText(urgentCount)} Insight فوری/مهم برای اقدام مدیریتی وجود دارد.`,
    executiveScoreResult.scoreAvailable
      ? `وضعیت موتور تصمیم‌ساز: ${executiveStatusLabel} با امتیاز ${formatExactNumberText(smartInsightNum(executiveScore))} از ۱۰۰.`
      : "امتیاز وضعیت مدیریتی تا رسیدن داده واقعی کافی نمایش داده نمی‌شود.",
  ];

  return {
    summaryCounts,
    urgentCount,
    executiveBrain,
    dailyBrief,
  };
};

export {
  buildExecutiveDecisionLayer,
  buildTodayActions,
  countSmartInsightSeverities,
  summarizeSmartInsightMemory,
};
