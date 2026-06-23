import { useCallback, useEffect, useState } from 'react';
import moment from 'jalali-moment';
import { apiFetch } from '../../utils/apiFetch';
import type {
  HeaderDueItem,
  HeaderFinancePulse,
  HeaderNotificationItem,
  HeaderQuickPanels,
  HeaderQuickStats,
  HeaderSalesPreview,
} from './headerTypes';

export type HeaderRiskyCustomers = {
  totalRisky: number;
  lowScore: number;
  lateOrOverdue: number;
  returnedChecks: number;
};

type UseHeaderQuickDataParams = {
  authReady: boolean;
  token?: string | null;
  currentUser?: unknown;
  isFeatureEnabled: (featureKey: string) => boolean;
  locationPathname: string;
};

const toPersianShamsi = () => moment().locale('fa').format('jYYYY/jMM/jDD');

const createEmptyQuickStats = (): HeaderQuickStats => ({
  salesCount: 0,
  notificationsCount: 0,
  dueCount: 0,
});

const createEmptyFinancePulse = (): HeaderFinancePulse => ({
  realizedProfit: 0,
  realizedRevenue: 0,
  unrecognizedProfit: 0,
  collectionRate: 0,
});

const createEmptySalesPreview = (): HeaderSalesPreview => ({
  totalRevenue: 0,
  grossProfit: 0,
  totalTransactions: 0,
  averageSaleValue: 0,
  topSellingItems: [],
});

const createEmptyQuickPanels = (): HeaderQuickPanels => ({
  sales: createEmptySalesPreview(),
  notifications: [],
  due: [],
});

const createEmptyRiskyCustomers = (): HeaderRiskyCustomers => ({
  totalRisky: 0,
  lowScore: 0,
  lateOrOverdue: 0,
  returnedChecks: 0,
});

export const useHeaderQuickData = ({
  authReady,
  token,
  currentUser,
  isFeatureEnabled,
  locationPathname,
}: UseHeaderQuickDataParams) => {
  const [headerQuickStats, setHeaderQuickStats] = useState<HeaderQuickStats>(() => createEmptyQuickStats());
  const [headerRiskyCustomers, setHeaderRiskyCustomers] = useState<HeaderRiskyCustomers>(() => createEmptyRiskyCustomers());
  const [headerQuickRefreshKey, setHeaderQuickRefreshKey] = useState(0);
  const [headerQuickLoading, setHeaderQuickLoading] = useState(false);
  const [headerFinancePulse, setHeaderFinancePulse] = useState<HeaderFinancePulse>(() => createEmptyFinancePulse());
  const [headerQuickPanels, setHeaderQuickPanels] = useState<HeaderQuickPanels>(() => createEmptyQuickPanels());

  const refreshHeaderQuickPanels = useCallback(() => {
    setHeaderQuickRefreshKey((value) => value + 1);
  }, []);

  useEffect(() => {
    if (!authReady || !token || !currentUser) return;
    let alive = true;

    const loadHeaderQuickStats = async () => {
      setHeaderQuickLoading(true);
      try {
        const todayJ = toPersianShamsi();
        const monthMoment = moment().locale('fa');
        const monthFrom = monthMoment.clone().startOf('jMonth').format('jYYYY/jMM/jDD');
        const monthTo = monthMoment.clone().endOf('jMonth').format('jYYYY/jMM/jDD');
        const [salesRes, notificationsRes, calendarRes, financeRes] = await Promise.allSettled([
          isFeatureEnabled('cash_sales') ? apiFetch(`/api/reports/sales-summary?fromDate=${encodeURIComponent(todayJ)}&toDate=${encodeURIComponent(todayJ)}`) : Promise.resolve(null as any),
          isFeatureEnabled('notifications_outbox') ? apiFetch('/api/notifications') : Promise.resolve(null as any),
          isFeatureEnabled('installments') ? apiFetch('/api/reports/installments-calendar') : Promise.resolve(null as any),
          isFeatureEnabled('advanced_reports') ? apiFetch(`/api/reports/financial-overview?from=${encodeURIComponent(monthFrom)}&to=${encodeURIComponent(monthTo)}`) : Promise.resolve(null as any),
        ]);

        let salesCount = 0;
        let salesPreview: HeaderSalesPreview = createEmptySalesPreview();
        if (isFeatureEnabled('cash_sales') && salesRes.status === 'fulfilled' && salesRes.value?.ok) {
          const js = await salesRes.value.json().catch(() => ({} as any));
          salesCount = Number(js?.data?.totalTransactions || 0);
          salesPreview = {
            totalRevenue: Number(js?.data?.totalRevenue || 0),
            grossProfit: Number(js?.data?.grossProfit || 0),
            totalTransactions: Number(js?.data?.totalTransactions || 0),
            averageSaleValue: Number(js?.data?.averageSaleValue || 0),
            topSellingItems: Array.isArray(js?.data?.topSellingItems) ? js.data.topSellingItems.slice(0, 3) : [],
          };
        }

        let notificationsCount = 0;
        let notificationItems: HeaderNotificationItem[] = [];
        if (isFeatureEnabled('notifications_outbox') && notificationsRes.status === 'fulfilled' && notificationsRes.value?.ok) {
          const js = await notificationsRes.value.json().catch(() => ({} as any));
          const items = Array.isArray(js?.data) ? js.data : [];
          notificationsCount = items.length;
          notificationItems = items.slice(0, 3).map((item: any, index: number) => ({
            id: String(item?.id || `${item?.type || 'notification'}-${item?.actionLink || index}`),
            title: String(item?.title || 'اعلان بدون عنوان'),
            description: String(item?.description || ''),
            actionLink: typeof item?.actionLink === 'string' ? item.actionLink : undefined,
          }));
        }

        let dueCount = 0;
        let dueItems: HeaderDueItem[] = [];
        if (isFeatureEnabled('installments') && calendarRes.status === 'fulfilled' && calendarRes.value?.ok) {
          const js = await calendarRes.value.json().catch(() => ({} as any));
          const rawItems = Array.isArray(js?.data?.items) ? js.data.items : (Array.isArray(js?.data) ? js.data : []);
          const actionableDueItems = rawItems.filter((item: any) => {
            const status = String(item?.status || '').toLowerCase();
            const dueDate = String(item?.dueDate || '');
            const isClosed = status.includes('پرداخت شده') || status.includes('paid') || status.includes('settled') || status.includes('تسویه');
            return !isClosed && (dueDate === todayJ || status.includes('pass') || status.includes('معوق') || status.includes('overdue'));
          });
          dueCount = actionableDueItems.length;
          dueItems = actionableDueItems.slice(0, 3).map((item: any) => ({
            saleId: item?.saleId ? Number(item.saleId) : undefined,
            dueDate: String(item?.dueDate || ''),
            amount: Number(item?.amount || 0),
            customerFullName: String(item?.customerFullName || ''),
            status: String(item?.status || ''),
          }));
        }

        let financePulse: HeaderFinancePulse = createEmptyFinancePulse();
        if (isFeatureEnabled('advanced_reports') && financeRes.status === 'fulfilled' && financeRes.value?.ok) {
          const js = await financeRes.value.json().catch(() => ({} as any));
          const profit = js?.data?.profit || {};
          financePulse = {
            realizedProfit: Number(profit?.realizedProfit || 0),
            realizedRevenue: Number(profit?.realizedRevenue || 0),
            unrecognizedProfit: Number(profit?.unrecognizedProfit || 0),
            collectionRate: Number(profit?.collectionRate || 0),
          };
        }

        if (alive) {
          setHeaderQuickStats({ salesCount, notificationsCount, dueCount });
          setHeaderQuickPanels({ sales: salesPreview, notifications: notificationItems, due: dueItems });
          setHeaderFinancePulse(financePulse);
        }
      } catch (err) {
        console.warn('header quick stats load failed:', err);
      } finally {
        if (alive) setHeaderQuickLoading(false);
      }
    };

    loadHeaderQuickStats();
    const interval = window.setInterval(loadHeaderQuickStats, 60000);
    return () => {
      alive = false;
      window.clearInterval(interval);
    };
  }, [authReady, token, currentUser, isFeatureEnabled, headerQuickRefreshKey, locationPathname]);

  useEffect(() => {
    if (!authReady || !token || !currentUser) return;
    let alive = true;

    const loadRiskyCustomers = async () => {
      try {
        const res = await apiFetch('/api/customers/trust-profiles');
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json?.success || !Array.isArray(json?.data)) throw new Error(json?.message || 'خطا در دریافت مشتریان پرریسک');

        const profiles = json.data as Array<any>;
        const risky = profiles.filter((profile) => {
          const score = Number(profile?.score || 0);
          const lateOrOverdue = Number(profile?.latePaymentCount || 0) + Number(profile?.overdueUnpaidCount || 0);
          const returnedChecks = Number(profile?.returnedCheckCount || 0);
          return score < 50 || lateOrOverdue > 0 || returnedChecks > 0;
        });

        if (alive) {
          setHeaderRiskyCustomers({
            totalRisky: risky.length,
            lowScore: risky.filter((profile) => Number(profile?.score || 0) < 50).length,
            lateOrOverdue: risky.filter((profile) => Number(profile?.latePaymentCount || 0) + Number(profile?.overdueUnpaidCount || 0) > 0).length,
            returnedChecks: risky.filter((profile) => Number(profile?.returnedCheckCount || 0) > 0).length,
          });
        }
      } catch {
        if (alive) setHeaderRiskyCustomers(createEmptyRiskyCustomers());
      }
    };

    loadRiskyCustomers();
    const interval = window.setInterval(loadRiskyCustomers, 90000);
    return () => {
      alive = false;
      window.clearInterval(interval);
    };
  }, [authReady, token, currentUser, headerQuickRefreshKey, locationPathname]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const refreshOnFocus = () => refreshHeaderQuickPanels();
    const refreshOnVisibility = () => {
      if (document.visibilityState === 'visible') refreshHeaderQuickPanels();
    };

    window.addEventListener('kourosh:header-quick-refresh', refreshHeaderQuickPanels);
    window.addEventListener('kourosh:notifications-updated', refreshHeaderQuickPanels);
    window.addEventListener('kourosh:installments-updated', refreshHeaderQuickPanels);
    window.addEventListener('kourosh:installment-payment-updated', refreshHeaderQuickPanels);
    window.addEventListener('focus', refreshOnFocus);
    document.addEventListener('visibilitychange', refreshOnVisibility);

    return () => {
      window.removeEventListener('kourosh:header-quick-refresh', refreshHeaderQuickPanels);
      window.removeEventListener('kourosh:notifications-updated', refreshHeaderQuickPanels);
      window.removeEventListener('kourosh:installments-updated', refreshHeaderQuickPanels);
      window.removeEventListener('kourosh:installment-payment-updated', refreshHeaderQuickPanels);
      window.removeEventListener('focus', refreshOnFocus);
      document.removeEventListener('visibilitychange', refreshOnVisibility);
    };
  }, [refreshHeaderQuickPanels]);

  return {
    headerQuickStats,
    headerRiskyCustomers,
    headerQuickLoading,
    headerFinancePulse,
    headerQuickPanels,
    refreshHeaderQuickPanels,
  };
};
