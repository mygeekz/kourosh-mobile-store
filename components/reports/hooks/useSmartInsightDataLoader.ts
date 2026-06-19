import { useCallback, useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { apiFetch } from '../../../utils/apiFetch';
import type { NotificationMessage } from '../../../types';
import type { PredictiveEnginePayload, SmartInsightPayload } from '../types/smartInsightContracts';

type UseSmartInsightDataLoaderArgs = {
  fromDate: Date | null;
  toDate: Date | null;
  lastResetAt: string | null;
  toJ: (value?: Date | null) => string;
  setNotification: Dispatch<SetStateAction<NotificationMessage | null>>;
};

const readErrorMessage = (error: unknown) => error instanceof Error ? error.message : 'خطا در دریافت اطلاعات';

export default function useSmartInsightDataLoader({
  fromDate,
  toDate,
  lastResetAt,
  toJ,
  setNotification,
}: UseSmartInsightDataLoaderArgs) {
  const [payload, setPayload] = useState<SmartInsightPayload>({ insights: [] });
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (toJ(fromDate)) qs.set('fromDate', toJ(fromDate));
      if (toJ(toDate)) qs.set('toDate', toJ(toDate));
      if (lastResetAt) qs.set('resetAt', lastResetAt);

      const [res, predictiveRes] = await Promise.all([
        apiFetch(`/api/reports/smart-insights?${qs.toString()}`),
        apiFetch(`/api/brain/predictive?${qs.toString()}`).catch(() => null),
      ]);

      const responseJson = await res.json();
      if (!res.ok || responseJson?.success === false) {
        throw new Error(responseJson?.message || 'خطا در دریافت دستیار هوشمند مدیریت');
      }

      let predictiveEngine: PredictiveEnginePayload | undefined;
      if (predictiveRes && predictiveRes.ok) {
        const predictiveJson = await predictiveRes.json().catch(() => null);
        predictiveEngine = predictiveJson?.data;
      }

      setPayload({ insights: [], ...(responseJson?.data || {}), predictiveEngine });
    } catch (error: unknown) {
      setNotification({ type: 'error', text: readErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  }, [fromDate, lastResetAt, setNotification, toDate, toJ]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => { void fetchData(); }, 260);
    return () => window.clearTimeout(timeoutId);
  }, [fetchData]);

  useEffect(() => {
    const reload = () => { void fetchData(); };
    window.addEventListener('kourosh:ai-features-updated', reload as EventListener);
    return () => window.removeEventListener('kourosh:ai-features-updated', reload as EventListener);
  }, [fetchData]);

  useEffect(() => {
    const reload = () => { void fetchData(); };
    window.addEventListener('kourosh:collection-action-recorded', reload as EventListener);
    window.addEventListener('storage', reload as EventListener);
    window.addEventListener('focus', reload as EventListener);
    return () => {
      window.removeEventListener('kourosh:collection-action-recorded', reload as EventListener);
      window.removeEventListener('storage', reload as EventListener);
      window.removeEventListener('focus', reload as EventListener);
    };
  }, [fetchData]);

  return {
    payload,
    setPayload,
    loading,
    fetchData,
  };
}
