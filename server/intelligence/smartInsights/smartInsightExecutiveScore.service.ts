import { formatExactNumberText, formatReadablePercentText } from "../../../utils/exactNumber";
type ExecutiveScoreComponent = {
  key: string;
  label: string;
  value: number;
  weight: number;
  evidence: string;
};

type ExecutiveHealthScoreArgs = {
  insights: any[];
  memorySummary: any;
  profitEngine: any;
  signalsScore: number;
  salesStats: any;
  trendPct: number;
  previousAvgDaily: number;
};

const num = (value: unknown) =>
  Number.isFinite(Number(value)) ? Number(value) : 0;

const clampScore = (value: unknown) =>
  Math.max(0, Math.min(100, (num(value))));

const percent = (value: unknown) =>
  formatReadablePercentText(num(value), 1);

const calculateExecutiveHealthScore = ({
  insights,
  memorySummary,
  profitEngine,
  signalsScore,
  salesStats,
  trendPct,
  previousAvgDaily,
}: ExecutiveHealthScoreArgs) => {
  const ordersCount = num(salesStats?.ordersCount);
  const components: ExecutiveScoreComponent[] = [];

  if (ordersCount > 0) {
    components.push({
      key: "data_coverage",
      label: "پوشش داده",
      value: clampScore(signalsScore),
      weight: 20,
      evidence: `${formatExactNumberText(ordersCount)} سند فروش`,
    });
  }

  const grossSales = num(profitEngine?.summary?.grossSales);
  const realProfit = num(profitEngine?.summary?.realProfit);
  const recognizedProfit = num(profitEngine?.summary?.recognizedProfit);
  const marginPct = num(profitEngine?.summary?.marginPct);
  const negativeProfitCount = num(
    profitEngine?.summary?.negativeProfitCount,
  );
  if (ordersCount > 0 && grossSales > 0) {
    const marginHealth = clampScore((marginPct / 25) * 100);
    const collectionHealth =
      realProfit > 0
        ? clampScore((recognizedProfit / realProfit) * 100)
        : realProfit < 0
          ? 0
          : 100;
    const profitableInvoiceHealth = clampScore(
      100 - (negativeProfitCount / ordersCount) * 100,
    );
    components.push({
      key: "profit_health",
      label: "سلامت سود",
      value: clampScore(
        marginHealth * 0.55 +
          collectionHealth * 0.3 +
          profitableInvoiceHealth * 0.15,
      ),
      weight: 30,
      evidence: `حاشیه واقعی ${percent(marginPct)}`,
    });
  }

  if (ordersCount > 0) {
    const severityCount = insights
      .filter((insight: any) => String(insight.type) !== "daily_summary")
      .reduce(
        (counts: Record<string, number>, insight: any) => {
          const severity = String(insight.severity || "low");
          counts[severity] = num(counts[severity]) + 1;
          return counts;
        },
        { critical: 0, high: 0, medium: 0, low: 0 },
      );
    const riskPenalty =
      num(severityCount.critical) * 25 +
      num(severityCount.high) * 16 +
      num(severityCount.medium) * 8 +
      num(severityCount.low) * 3;
    components.push({
      key: "risk_control",
      label: "کنترل ریسک",
      value: clampScore(100 - riskPenalty),
      weight: 30,
      evidence: `${formatExactNumberText((
        num(severityCount.critical) + num(severityCount.high)
      ))} مورد فوری/مهم`,
    });
  }

  if (ordersCount > 0 && num(previousAvgDaily) > 0) {
    components.push({
      key: "sales_momentum",
      label: "روند فروش",
      value: clampScore(50 + num(trendPct)),
      weight: 20,
      evidence: `${trendPct >= 0 ? "رشد" : "افت"} ${percent(
        Math.abs(trendPct),
      )} نسبت به دوره قبل`,
    });
  }

  const acceptedDecisions = num(memorySummary.accepted);
  if (acceptedDecisions > 0) {
    const positiveOutcomes = num(memorySummary.outcome_positive);
    components.push({
      key: "decision_outcomes",
      label: "نتیجه تصمیم‌ها",
      value: clampScore((positiveOutcomes / acceptedDecisions) * 100),
      weight: 10,
      evidence: `${formatExactNumberText(positiveOutcomes)} نتیجه مثبت از ${formatExactNumberText(acceptedDecisions)} تصمیم`,
    });
  }

  const totalWeight = components.reduce(
    (sum, component) => sum + component.weight,
    0,
  );
  const scoreAvailable = ordersCount > 0 && components.length >= 2;
  const score = scoreAvailable
    ? clampScore(
        components.reduce(
          (sum, component) => sum + component.value * component.weight,
          0,
        ) / Math.max(1, totalWeight),
      )
    : null;

  return {
    score,
    scoreAvailable,
    components,
    evidence: {
      basis: "live_store_data",
      ordersCount,
      insightCount: insights.filter(
        (insight: any) => String(insight.type) !== "daily_summary",
      ).length,
      acceptedDecisions,
    },
  };
};

export { calculateExecutiveHealthScore };
export type { ExecutiveHealthScoreArgs, ExecutiveScoreComponent };
