import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '../../contexts/AuthContext';
import { useFeatureFlags } from '../../contexts/FeatureFlagsContext';
import { apiFetch } from '../../utils/apiFetch';

export type SidebarBadgeMap = Record<string, number>;

type SidebarBadgeResponse = Response | null;

const settledResponseOk = (
  result: PromiseSettledResult<SidebarBadgeResponse>,
): result is PromiseFulfilledResult<Response> => result.status === 'fulfilled' && !!result.value?.ok;

export const useSidebarBadges = (): { navBadges: SidebarBadgeMap; refreshSidebarBadges: () => void } => {
  const { currentUser, token, authReady } = useAuth();
  const { isEnabled: isFeatureEnabled } = useFeatureFlags();
  const [navBadges, setNavBadges] = useState<SidebarBadgeMap>({});

  const loadSidebarBadges = useCallback(async () => {
    if (!authReady || !token || !currentUser) return;

    try {
      const [notificationsRes, calendarRes, outboxRes] = await Promise.allSettled<SidebarBadgeResponse>([
        isFeatureEnabled('notifications_outbox') ? apiFetch('/api/notifications') : Promise.resolve(null),
        isFeatureEnabled('installments') ? apiFetch('/api/reports/installments-calendar') : Promise.resolve(null),
        isFeatureEnabled('notifications_outbox') && (currentUser.roleName === 'Admin' || currentUser.roleName === 'Manager')
          ? apiFetch('/api/notifications/outbox?status=pending&limit=200')
          : Promise.resolve(null),
      ]);

      let notificationsCount = 0;
      if (isFeatureEnabled('notifications_outbox') && settledResponseOk(notificationsRes)) {
        const js = await notificationsRes.value.json();
        notificationsCount = Array.isArray(js?.data) ? js.data.length : 0;
      }

      let dueCount = 0;
      if (isFeatureEnabled('installments') && settledResponseOk(calendarRes)) {
        const js = await calendarRes.value.json();
        const items = Array.isArray(js?.data) ? js.data : [];
        const todayJ = new Date();
        const todayFa = new Intl.DateTimeFormat('en-CA-u-ca-persian', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(todayJ).replaceAll('-', '/');
        dueCount = items.filter((item: any) => {
          const status = String(item?.status || '').toLowerCase();
          const dueDate = String(item?.dueDate || '');
          const isClosed = status.includes('پرداخت شده') || status.includes('paid') || status.includes('closed') || status.includes('settled');
          return !isClosed && (dueDate === todayFa || status.includes('معوق') || status.includes('overdue') || status.includes('pass'));
        }).length;
      }

      let outboxCount = 0;
      if (isFeatureEnabled('notifications_outbox') && settledResponseOk(outboxRes)) {
        const js = await outboxRes.value.json();
        outboxCount = Array.isArray(js?.data) ? js.data.length : 0;
      }

      setNavBadges({
        notifications: notificationsCount,
        '/notifications': notificationsCount,
        outbox: outboxCount,
        '/outbox': outboxCount,
        'installment-sales': dueCount,
        '/installment-sales': dueCount,
        'installments-calendar': dueCount,
        '/reports/installments-calendar': dueCount,
      });
    } catch (err) {
      console.warn('sidebar badge load failed:', err);
    }
  }, [authReady, token, currentUser, isFeatureEnabled]);

  useEffect(() => {
    void loadSidebarBadges();
  }, [loadSidebarBadges]);

  useEffect(() => {
    const refreshSidebarBadges = () => {
      void loadSidebarBadges();
    };
    const refreshOnVisibility = () => {
      if (document.visibilityState === 'visible') refreshSidebarBadges();
    };

    window.addEventListener('kourosh:header-quick-refresh', refreshSidebarBadges);
    window.addEventListener('kourosh:notifications-updated', refreshSidebarBadges);
    window.addEventListener('kourosh:installments-updated', refreshSidebarBadges);
    window.addEventListener('kourosh:installment-payment-updated', refreshSidebarBadges);
    window.addEventListener('focus', refreshSidebarBadges);
    document.addEventListener('visibilitychange', refreshOnVisibility);

    return () => {
      window.removeEventListener('kourosh:header-quick-refresh', refreshSidebarBadges);
      window.removeEventListener('kourosh:notifications-updated', refreshSidebarBadges);
      window.removeEventListener('kourosh:installments-updated', refreshSidebarBadges);
      window.removeEventListener('kourosh:installment-payment-updated', refreshSidebarBadges);
      window.removeEventListener('focus', refreshSidebarBadges);
      document.removeEventListener('visibilitychange', refreshOnVisibility);
    };
  }, [loadSidebarBadges]);

  return { navBadges, refreshSidebarBadges: () => void loadSidebarBadges() };
};
