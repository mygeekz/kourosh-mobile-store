import React from 'react';

import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../utils/apiFetch';

export type QualityReportStatus = {
  status: 'missing' | 'passed' | 'failed';
  hasReport: boolean;
  runId: string | null;
  generatedAt: string | null;
  passed: number;
  failed: number;
  total: number;
};

export type StyleQualityStatus = {
  status: 'missing' | 'passed' | 'failed';
  totalFailed: number;
  dashboard: QualityReportStatus;
  loadingButton: QualityReportStatus;
  pwaPlatformInstall: QualityReportStatus;
};

type StyleQualityResponse = {
  success?: boolean;
  data?: StyleQualityStatus | null;
};

const EMPTY_REPORT: QualityReportStatus = {
  status: 'missing',
  hasReport: false,
  runId: null,
  generatedAt: null,
  passed: 0,
  failed: 0,
  total: 0,
};

const EMPTY_STATUS: StyleQualityStatus = {
  status: 'missing',
  totalFailed: 0,
  dashboard: EMPTY_REPORT,
  loadingButton: EMPTY_REPORT,
  pwaPlatformInstall: EMPTY_REPORT,
};

export const useStyleQualityStatus = () => {
  const { currentUser, token, authReady } = useAuth();
  const isAdmin = currentUser?.roleName === 'Admin';
  const [status, setStatus] = React.useState<StyleQualityStatus>(EMPTY_STATUS);
  const [loading, setLoading] = React.useState(false);

  const refresh = React.useCallback(async () => {
    if (!authReady || !token || !isAdmin) {
      setStatus(EMPTY_STATUS);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await apiFetch('/api/settings/quality/style-report/status', { cache: 'no-store' });
      const payload = await response.json() as StyleQualityResponse;
      if (!response.ok || !payload.success || !payload.data || Array.isArray(payload.data)) throw new Error('style quality status unavailable');
      setStatus({
        status: payload.data.status ?? 'missing',
        totalFailed: Math.max(0, Number(payload.data.totalFailed) || 0),
        dashboard: payload.data.dashboard ?? EMPTY_REPORT,
        loadingButton: payload.data.loadingButton ?? EMPTY_REPORT,
        pwaPlatformInstall: payload.data.pwaPlatformInstall ?? EMPTY_REPORT,
      });
    } catch {
      setStatus(EMPTY_STATUS);
    } finally {
      setLoading(false);
    }
  }, [authReady, isAdmin, token]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  React.useEffect(() => {
    const onRefresh = () => void refresh();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') onRefresh();
    };

    window.addEventListener('kourosh:dashboard-visual-report-updated', onRefresh);
    window.addEventListener('kourosh:loading-button-report-updated', onRefresh);
    window.addEventListener('kourosh:pwa-platform-install-report-updated', onRefresh);
    window.addEventListener('focus', onRefresh);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('kourosh:dashboard-visual-report-updated', onRefresh);
      window.removeEventListener('kourosh:loading-button-report-updated', onRefresh);
      window.removeEventListener('kourosh:pwa-platform-install-report-updated', onRefresh);
      window.removeEventListener('focus', onRefresh);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [refresh]);

  return { status, loading, refresh, isAdmin };
};

export const useDashboardVisualQualityStatus = () => {
  const quality = useStyleQualityStatus();
  return {
    ...quality,
    status: quality.status.dashboard,
  };
};

export default useDashboardVisualQualityStatus;
