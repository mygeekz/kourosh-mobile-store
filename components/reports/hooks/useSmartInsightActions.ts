import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { apiFetch } from '../../../utils/apiFetch';
import type { NotificationMessage } from '../../../types';
import type {
  DecisionMemoryPatch,
  SmartInsightLike,
  SmartInsightPayload,
} from '../types/smartInsightContracts';

type UseSmartInsightActionsArgs = {
  setPayload: Dispatch<SetStateAction<SmartInsightPayload>>;
  setSelected: Dispatch<SetStateAction<SmartInsightLike | null>>;
  setNotification: Dispatch<SetStateAction<NotificationMessage | null>>;
  setLastResetAt: Dispatch<SetStateAction<string | null>>;
  actingInsightId: string | null;
  setActingInsightId: Dispatch<SetStateAction<string | null>>;
};

const getErrorMessage = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;

export default function useSmartInsightActions({
  setPayload,
  setSelected,
  setNotification,
  setLastResetAt,
  actingInsightId,
  setActingInsightId,
}: UseSmartInsightActionsArgs) {
  const resetLearning = useCallback(async () => {
    try {
      const res = await apiFetch('/api/reports/smart-insights/reset-learning', { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) throw new Error(json?.message || 'خطا در ریست حافظه یادگیری');
      const stamp = json?.data?.resetAt || new Date().toISOString();
      try {
        localStorage.setItem('smartInsightLearningResetAt', stamp);
      } catch {
        // The backend reset is authoritative; browser storage is only a UI convenience.
      }
      setLastResetAt(stamp);
      setNotification({ type: 'success', text: 'حافظه تصمیمات پاک شد؛ مغز هوشمند از این لحظه دوباره یاد می‌گیرد.' });
    } catch (error: unknown) {
      setNotification({ type: 'error', text: getErrorMessage(error, 'خطا در ریست یادگیری') });
    }
  }, [setLastResetAt, setNotification]);

  const updateDecisionMemory = useCallback(async (insight: SmartInsightLike, patch: DecisionMemoryPatch) => {
    setActingInsightId(insight.id);
    try {
      const res = await apiFetch('/api/reports/smart-insights/decisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          insightId: insight.id,
          type: insight.type,
          title: insight.title,
          severity: insight.severity,
          score: insight.score,
          confidence: insight.confidence,
          actionLabel: insight.actions?.[0]?.label || '',
          ...patch,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) throw new Error(json?.message || 'خطا در ثبت حافظه تصمیم');
      const decision = json?.data || patch;
      setPayload((prev) => ({
        ...prev,
        insights: (prev.insights || []).map((item) => item.id === insight.id ? { ...item, decision: { ...(item.decision || {}), ...decision } } : item),
      }));
      setSelected((prev) => prev?.id === insight.id ? { ...prev, decision: { ...(prev.decision || {}), ...decision } } : prev);
      setNotification({ type: 'success', text: 'تصمیم ثبت شد؛ سیستم از نتیجه این پیشنهاد برای تحلیل‌های بعدی استفاده می‌کند.' });
    } catch (error: unknown) {
      setNotification({ type: 'error', text: getErrorMessage(error, 'خطا در ثبت تصمیم') });
    } finally {
      setActingInsightId(null);
    }
  }, [setActingInsightId, setNotification, setPayload, setSelected]);

  const isDecisionAccepted = useCallback((decision?: SmartInsightLike['decision']) => {
    if (!decision) return false;
    const userDecision = String(decision.userDecision || '').toLowerCase();
    const status = String(decision.status || '').toLowerCase();
    const decisionLabel = String(decision.decisionLabel || '');
    const statusLabel = String(decision.statusLabel || '');
    return userDecision === 'accepted'
      || decisionLabel.includes('اقدام شد')
      || statusLabel.includes('اقدام شد')
      || (status === 'open' && Boolean(decision.decidedAt));
  }, []);

  const getDecisionActionState = useCallback((insight: SmartInsightLike) => {
    const isActing = actingInsightId === insight.id;
    const isAccepted = isDecisionAccepted(insight.decision);
    return {
      isActing,
      isAccepted,
      label: isAccepted ? 'اقدام شد' : 'اقدام شود',
      icon: isActing ? 'fa-spinner fa-spin' : isAccepted ? 'fa-circle-check' : 'fa-check',
    };
  }, [actingInsightId, isDecisionAccepted]);



  return {
    resetLearning,
    updateDecisionMemory,
    isDecisionAccepted,
    getDecisionActionState,
  };
}
