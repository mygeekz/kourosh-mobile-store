import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { apiFetch } from '../utils/apiFetch';
import { buildFeatureFlagsFromSettings, FEATURE_DEFAULTS } from '../utils/featureFlags';

type FeatureFlagsContextValue = {
  flags: Record<string, boolean>;
  isLoading: boolean;
  refresh: () => Promise<void>;
  isEnabled: (key: string) => boolean;
};

const FeatureFlagsContext = createContext<FeatureFlagsContextValue>({
  flags: FEATURE_DEFAULTS,
  isLoading: false,
  refresh: async () => undefined,
  isEnabled: (key: string) => FEATURE_DEFAULTS[key] !== false,
});

export const FeatureFlagsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, authReady } = useAuth();
  const [flags, setFlags] = useState<Record<string, boolean>>(FEATURE_DEFAULTS);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!authReady || !currentUser) {
      setFlags(FEATURE_DEFAULTS);
      return;
    }
    setIsLoading(true);
    try {
      const response = await apiFetch('/api/module-flags');
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json.success) throw new Error(json.message || 'خطا در دریافت وضعیت ماژول‌ها');
      setFlags(buildFeatureFlagsFromSettings(json.data || {}));
    } catch (error) {
      console.error('Feature flags load failed:', error);
      setFlags(FEATURE_DEFAULTS);
    } finally {
      setIsLoading(false);
    }
  }, [authReady, currentUser]);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    const handler = () => { void refresh(); };
    window.addEventListener('kourosh:feature-flags-updated', handler);
    return () => window.removeEventListener('kourosh:feature-flags-updated', handler);
  }, [refresh]);

  const value = useMemo<FeatureFlagsContextValue>(() => ({
    flags,
    isLoading,
    refresh,
    isEnabled: (key: string) => flags[key] !== false,
  }), [flags, isLoading, refresh]);

  return <FeatureFlagsContext.Provider value={value}>{children}</FeatureFlagsContext.Provider>;
};

export const useFeatureFlags = () => useContext(FeatureFlagsContext);
