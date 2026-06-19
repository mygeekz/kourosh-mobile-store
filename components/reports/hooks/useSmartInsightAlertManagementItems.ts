import { useMemo } from 'react';
import type { AlertManagementItemData } from '../AlertManagementModal';
import type {
  DecisionStatusMeta,
  PredictiveAlertItem,
  SmartInsightAction,
  SmartInsightDecision,
  SmartInsightLike,
  SmartInsightMetric,
  SmartInsightPayload,
  TodayActionItem,
} from '../types/smartInsightContracts';

type UseSmartInsightAlertManagementItemsArgs = {
  insights: SmartInsightLike[];
  todayActions: TodayActionItem[];
  predictiveAlerts: PredictiveAlertItem[];
  payload: SmartInsightPayload;
  typeLabels: Record<string, string>;
  getDecisionStatusMeta: (decision?: SmartInsightDecision) => DecisionStatusMeta;
  num: (value: unknown) => number;
  shamsi: (value: unknown) => string;
  percent: (value: unknown) => string;
};

const parseLocalizedNumber = (value: unknown) => {
  const normalized = String(value ?? '')
    .replace(/[۰-۹]/g, (digit) => '0123456789'['۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)])
    .replace(/[٠-٩]/g, (digit) => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(digit)])
    .replace(/٬/g, '')
    .replace(/,/g, '')
    .replace(/٫/g, '.');
  const match = normalized.match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) || 0 : 0;
};

const extractImpactMetric = (metrics: SmartInsightMetric[] = []) => {
  const prioritized = metrics.find((metric) => /مبلغ|ارزش|فروش|سود|مانده|profit|sales|cash|revenue/i.test(String(metric.label || '')) || /تومان|ریال/i.test(String(metric.value || '')));
  const fallback = metrics.find((metric) => Number.isFinite(Number(metric.value))) || metrics[0];
  const target = prioritized || fallback;
  if (!target) return { label: 'بدون عدد مستقیم', amount: 0 };
  const amount = typeof target.value === 'number' ? Number(target.value) : parseLocalizedNumber(target.value);
  return {
    label: `${target.label}: ${target.value}`,
    amount: Number.isFinite(amount) ? amount : 0,
  };
};

export default function useSmartInsightAlertManagementItems({
  insights,
  todayActions,
  predictiveAlerts,
  payload,
  typeLabels,
  getDecisionStatusMeta,
  num,
  shamsi,
  percent,
}: UseSmartInsightAlertManagementItemsArgs): AlertManagementItemData[] {
  return useMemo(() => {
    const actionMap = new Map(todayActions.map((action) => [String(action.insightId || action.id), action]));

    const rows: AlertManagementItemData[] = insights.map((insight) => {
      const linkedAction = actionMap.get(String(insight.id));
      const impact = extractImpactMetric(insight.metrics || []);
      const decision = linkedAction?.decision || insight.decision;
      const statusMeta = getDecisionStatusMeta(decision);
      const timeSource = decision?.decidedAt || decision?.lastGeneratedAt || decision?.firstGeneratedAt || payload.generatedAt;

      return {
        id: `insight-${insight.id}`,
        title: insight.title || 'Insight',
        summary: insight.summary || '',
        severity: String(insight.severity || 'medium'),
        priority: num(linkedAction?.priority ?? insight.score),
        confidence: num(insight.confidence),
        source: linkedAction ? 'today_action' : 'insight',
        categoryLabel: typeLabels[String(insight.type)] || insight.category || 'Insight',
        statusKey: statusMeta.key as AlertManagementItemData['statusKey'],
        statusLabel: statusMeta.label,
        impactLabel: impact.label,
        impactAmount: impact.amount,
        timeLabel: timeSource ? shamsi(timeSource) : '—',
        reasons: insight.reasons || [],
        actions: insight.actions || [],
        metrics: insight.metrics || [],
        decision,
        to: linkedAction?.to || insight.actions?.[0]?.to,
        insightId: insight.id,
      };
    });

    const standaloneTodayActions: AlertManagementItemData[] = todayActions
      .filter((action) => !rows.some((item) => item.insightId && item.insightId === action.insightId))
      .map((action) => {
        const statusMeta = getDecisionStatusMeta(action.decision);
        return {
          id: `today-${action.id || action.insightId || action.title}`,
          title: action.title || 'اقدام فوری',
          summary: action.summary || '',
          severity: String(action.severity || 'medium'),
          priority: num(action.priority),
          confidence: 0,
          source: 'today_action',
          categoryLabel: 'اقدام فوری',
          statusKey: statusMeta.key as AlertManagementItemData['statusKey'],
          statusLabel: statusMeta.label,
          impactLabel: action.actionLabel || 'نیازمند بررسی مدیریتی',
          impactAmount: 0,
          timeLabel: payload.generatedAt ? shamsi(payload.generatedAt) : '—',
          reasons: action.summary ? [action.summary] : [],
          actions: action.to ? [{ label: action.actionLabel || 'باز کردن', to: action.to, icon: action.icon } as SmartInsightAction] : [],
          metrics: [{ label: 'اولویت', value: num(action.priority).toLocaleString('fa-IR') }],
          decision: action.decision,
          to: action.to,
          insightId: action.insightId,
        };
      });

    const predictiveRows: AlertManagementItemData[] = predictiveAlerts.map((alert) => {
      const severity = (['critical', 'high', 'medium', 'low', 'positive'].includes(String(alert.severity)) ? alert.severity : 'medium') as string;
      const basePriority = severity === 'critical' ? 96 : severity === 'high' ? 84 : severity === 'low' ? 52 : severity === 'positive' ? 60 : 68;
      return {
        id: `predictive-${alert.id || alert.title}`,
        title: alert.title || 'هشدار پیش‌بینی',
        summary: alert.summary || 'هشدار عملیاتی برای بررسی سریع',
        severity,
        priority: basePriority,
        confidence: num(payload.predictiveEngine?.confidence),
        source: 'predictive',
        categoryLabel: 'هشدار پیش‌بینی',
        statusKey: 'new',
        statusLabel: 'جدید',
        impactLabel: alert.actionLabel || 'بررسی جزئیات',
        impactAmount: 0,
        timeLabel: payload.generatedAt ? shamsi(payload.generatedAt) : '—',
        reasons: [alert.summary || 'جزئیات بیشتری برای این هشدار از بک‌اند ارسال نشده است.'],
        actions: alert.to ? [{ label: alert.actionLabel || 'باز کردن', to: alert.to, icon: 'fa-arrow-left' } as SmartInsightAction] : [],
        metrics: [{ label: 'اعتماد مدل', value: percent(payload.predictiveEngine?.confidence) }],
        to: alert.to,
      };
    });

    const unique = new Map<string, AlertManagementItemData>();
    [...rows, ...standaloneTodayActions, ...predictiveRows].forEach((item) => {
      const key = `${item.title}__${item.categoryLabel}`;
      if (!unique.has(key)) unique.set(key, item);
    });

    const severityRank: Record<string, number> = { critical: 5, high: 4, medium: 3, low: 2, positive: 1 };
    return Array.from(unique.values()).sort((a, b) => {
      const severityDelta = (severityRank[String(b.severity)] || 0) - (severityRank[String(a.severity)] || 0);
      if (severityDelta !== 0) return severityDelta;
      return b.priority - a.priority;
    });
  }, [
    getDecisionStatusMeta,
    insights,
    num,
    payload.generatedAt,
    payload.predictiveEngine?.confidence,
    percent,
    predictiveAlerts,
    shamsi,
    todayActions,
    typeLabels,
  ]);
}
