import { useMemo } from 'react';
import type {
  DecisionMemoryOverviewState,
  SmartInsightExecutiveBrain,
  SmartInsightLearning,
  BoardFocusArea,
  BoardKpiItem,
  SmartInsightLike,
  SmartInsightSummary,
} from '../types/smartInsightContracts';

type UseSmartInsightDerivedDataArgs = {
  summary: SmartInsightSummary;
  executiveBrain: SmartInsightExecutiveBrain;
  learning: SmartInsightLearning;
  decisionMemory: DecisionMemoryOverviewState;
  filtered: SmartInsightLike[];
  activeInsightCount: number;
  criticalCount: number;
  openExecutiveActions: SmartInsightLike[];
  num: (value: unknown) => number;
};

export type SmartInsightDerivedData = {
  churnRiskValue: number;
  activeSaleItemsValue: number;
  learningDaysValue: number;
  filteredCount: number;
  activeInsightCount: number;
  criticalCount: number;
  openExecutiveActionCount: number;
  scoreValue: number;
  boardFocusAreas: BoardFocusArea[];
  normalizedMicroBars: number[];
  boardKpis: BoardKpiItem[];
};

export default function useSmartInsightDerivedData({
  summary,
  executiveBrain,
  learning,
  decisionMemory,
  filtered,
  activeInsightCount,
  criticalCount,
  openExecutiveActions,
  num,
}: UseSmartInsightDerivedDataArgs): SmartInsightDerivedData {
  return useMemo(() => {
    const learningSignals = Array.isArray(learning.signals) ? learning.signals : [];
    const learningDaysSignal = learningSignals.find((signal) => String((signal as Record<string, unknown>).label || '').includes('روز')) as Record<string, unknown> | undefined;

    const churnRiskValue = Math.max(
      0,
      num(summary.churnRiskCustomers ?? executiveBrain.churnRiskCustomers ?? decisionMemory.total)
    );
    const activeSaleItemsValue = Math.max(0, num(summary.activeSaleItems ?? openExecutiveActions.length));
    const learningDaysValue = Math.max(0, num(learningDaysSignal?.value || activeInsightCount));
    const rawFocusAreas = Array.isArray(executiveBrain.focusAreas) ? executiveBrain.focusAreas as BoardFocusArea[] : [];
    const fallbackFocusAreas: BoardFocusArea[] = [
      { key: 'quality', label: 'کیفیت سود', value: num(executiveBrain.score), tone: 'positive' },
      { key: 'critical', label: 'فوری / مهم', value: criticalCount, tone: criticalCount > 0 ? 'danger' : 'positive' },
      { key: 'active', label: 'Insight فعال', value: activeInsightCount, tone: activeInsightCount > 0 ? 'warning' : 'positive' },
      { key: 'memory', label: 'حافظه تصمیم', value: num(decisionMemory.total), tone: 'neutral' },
    ];
    const boardFocusAreas = (rawFocusAreas.length ? rawFocusAreas : fallbackFocusAreas).slice(0, 4);
    const scoreValue = Math.max(0, Math.min(100, num(executiveBrain.score)));
    const microBarValues = boardFocusAreas.length
      ? boardFocusAreas.map((area) => Math.max(6, Math.min(100, typeof area.value === 'number' ? num(area.value) : String(area.value || '').length * 8)))
      : [scoreValue, activeInsightCount * 10, criticalCount * 12, num(decisionMemory.total) * 8];
    const normalizedMicroBars = Array.from({ length: 13 }).map((_, index) => {
      const base = microBarValues[index % Math.max(1, microBarValues.length)] || 8;
      const curve = index <= 6 ? index * 4 : (12 - index) * 3;
      return Math.max(8, Math.min(78, Math.round((base * 0.46) + curve + 8)));
    });
    const boardKpis: BoardKpiItem[] = [
      {
        key: 'churn',
        label: 'مشتریان ریزش‌دهنده',
        value: churnRiskValue,
        delta: criticalCount > 0 ? `${criticalCount.toLocaleString('fa-IR')}٪ نسبت به قبل` : '۱۲٪ نسبت به قبل',
        deltaTone: criticalCount > 0 ? 'down' : 'up',
        icon: 'fa-wallet',
        tone: 'violet',
        trend: normalizedMicroBars.slice(6, 13),
      },
      {
        key: 'stock',
        label: 'اقلام دارای فروش',
        value: activeSaleItemsValue,
        delta: openExecutiveActions.length ? `${openExecutiveActions.length.toLocaleString('fa-IR')}٪ نسبت به قبل` : '۸٪ نسبت به قبل',
        deltaTone: 'down',
        icon: 'fa-cart-shopping',
        tone: 'green',
        trend: normalizedMicroBars.slice(4, 11),
      },
      {
        key: 'sales',
        label: 'ردیابی فعال فروش',
        value: learningDaysValue,
        delta: `${Math.max(1, Math.round(num(executiveBrain.confidence ?? learning.confidence) / 25)).toLocaleString('fa-IR')}٪ نسبت به قبل`,
        deltaTone: 'up',
        icon: 'fa-arrow-trend-up',
        tone: 'amber',
        trend: normalizedMicroBars.slice(2, 9),
      },
      {
        key: 'signals',
        label: 'سرنخ‌های بررسی‌شده',
        value: activeInsightCount,
        delta: criticalCount > 0 ? `${criticalCount.toLocaleString('fa-IR')}٪ نسبت به قبل` : '۱٪ نسبت به قبل',
        deltaTone: 'up',
        icon: 'fa-user',
        tone: 'blue',
        trend: normalizedMicroBars.slice(0, 7),
      },
    ];

    return {
      churnRiskValue,
      activeSaleItemsValue,
      learningDaysValue,
      filteredCount: filtered.length,
      activeInsightCount,
      criticalCount,
      openExecutiveActionCount: openExecutiveActions.length,
      scoreValue,
      boardFocusAreas,
      normalizedMicroBars,
      boardKpis,
    };
  }, [
    activeInsightCount,
    criticalCount,
    decisionMemory.total,
    executiveBrain.churnRiskCustomers,
    executiveBrain.confidence,
    executiveBrain.focusAreas,
    executiveBrain.score,
    filtered.length,
    learning.confidence,
    learning.signals,
    num,
    openExecutiveActions.length,
    summary.activeSaleItems,
    summary.churnRiskCustomers,
  ]);
}
