import { useMemo } from 'react';
import type {
  SmartInsightActiveTypeFilter,
  PredictiveAlertItem,
  SmartInsightLike,
  SmartInsightPayload,
  SmartInsightSeverityFilter,
  TodayActionItem,
} from '../types/smartInsightContracts';

type UseSmartInsightCollectionsArgs = {
  payload: SmartInsightPayload;
  activeType: SmartInsightActiveTypeFilter;
  severity: SmartInsightSeverityFilter;
};

export type SmartInsightCollections = {
  insights: SmartInsightLike[];
  types: string[];
  filtered: SmartInsightLike[];
  todayActions: TodayActionItem[];
  predictiveAlerts: PredictiveAlertItem[];
};

export default function useSmartInsightCollections({
  payload,
  activeType,
  severity,
}: UseSmartInsightCollectionsArgs): SmartInsightCollections {
  const insights = useMemo<SmartInsightLike[]>(
    () => (Array.isArray(payload.insights) ? payload.insights as SmartInsightLike[] : []),
    [payload.insights]
  );

  const types = useMemo(() => {
    const set = new Set(insights.map((item) => String(item.type || '')).filter(Boolean));
    return ['all', ...Array.from(set)];
  }, [insights]);

  const filtered = useMemo(
    () => insights.filter((item) => {
      if (activeType !== 'all' && String(item.type) !== activeType) return false;
      if (severity !== 'all' && item.severity !== severity) return false;
      return true;
    }),
    [activeType, insights, severity]
  );

  const todayActions = useMemo<TodayActionItem[]>(
    () => (Array.isArray(payload.todayActions) ? payload.todayActions as TodayActionItem[] : []),
    [payload.todayActions]
  );

  const predictiveAlerts = useMemo<PredictiveAlertItem[]>(
    () => (Array.isArray(payload.predictiveEngine?.alerts) ? payload.predictiveEngine?.alerts as PredictiveAlertItem[] : []),
    [payload.predictiveEngine?.alerts]
  );

  return {
    insights,
    types,
    filtered,
    todayActions,
    predictiveAlerts,
  };
}
