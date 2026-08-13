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

    const noComparison = 'داده مقایسه‌ای برای این شاخص ثبت نشده است';
    const boardKpis: BoardKpiItem[] = [
      {
        key: 'churn',
        label: 'مشتریان در معرض ریزش',
        value: churnRiskValue,
        delta: noComparison,
        deltaTone: 'neutral',
        icon: 'fa-wallet',
        tone: 'violet',
      },
      {
        key: 'stock',
        label: 'اقلام دارای فروش',
        value: activeSaleItemsValue,
        delta: noComparison,
        deltaTone: 'neutral',
        icon: 'fa-cart-shopping',
        tone: 'green',
      },
      {
        key: 'sales',
        label: 'روزهای داده فعال',
        value: learningDaysValue,
        delta: noComparison,
        deltaTone: 'neutral',
        icon: 'fa-calendar-days',
        tone: 'amber',
      },
      {
        key: 'signals',
        label: 'سرنخ‌های بررسی‌شده',
        value: activeInsightCount,
        delta: noComparison,
        deltaTone: 'neutral',
        icon: 'fa-user',
        tone: 'blue',
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
