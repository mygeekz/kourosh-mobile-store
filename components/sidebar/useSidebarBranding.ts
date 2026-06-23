import { useEffect, useState } from 'react';

import { useAuth } from '../../contexts/AuthContext';
import { useStyle } from '../../contexts/StyleContext';
import { apiFetch } from '../../utils/apiFetch';
import { applyDocumentBranding, normalizeStoreName, writeStoredBranding } from '../../utils/branding';
import { loadAuthedAssetUrl, revokeObjectUrlSafe } from '../../utils/loadAuthedAssetUrl';

export interface SidebarBrandingState {
  storeName: string;
  logoUrl: string | null;
  isLoadingSettings: boolean;
}

export const useSidebarBranding = (): SidebarBrandingState => {
  const { currentUser, token, authReady } = useAuth();
  const { style, syncBrandFromStoreName } = useStyle();
  const [storeName, setStoreName] = useState('فروشگاه');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  useEffect(() => {
    const fetchStoreSettings = async () => {
      if (!authReady || !currentUser || currentUser.roleName !== 'Admin' || !token) {
        setIsLoadingSettings(false);
        return;
      }

      setIsLoadingSettings(true);
      try {
        const response = await apiFetch('/api/settings');
        if (!response.ok) throw new Error(`پاسخ شبکه صحیح نبود (${response.status})`);

        const result = await response.json();
        if (!result.success || !result.data) {
          throw new Error(result.message || 'خطا در قالب پاسخ تنظیمات');
        }

        const normalizedStoreName = normalizeStoreName(result.data.store_name || 'فروشگاه');
        setStoreName(normalizedStoreName);

        if (result.data.store_logo_path) {
          try {
            const nextUrl = await loadAuthedAssetUrl(`/uploads/${result.data.store_logo_path}?t=${Date.now()}`);
            setLogoUrl((prev) => {
              revokeObjectUrlSafe(prev);
              return nextUrl;
            });
          } catch (logoError) {
            const isMissingLogo = logoError instanceof Error && /404/.test(logoError.message);
            if (!isMissingLogo) {
              console.error('خطا در بارگذاری لوگوی فروشگاه:', logoError);
            }
            setLogoUrl((prev) => {
              revokeObjectUrlSafe(prev);
              return null;
            });
          }
        } else {
          setLogoUrl((prev) => {
            revokeObjectUrlSafe(prev);
            return null;
          });
        }

        writeStoredBranding({ storeName: normalizedStoreName, brandMode: style.brandMode });
        if (style.brandMode === 'auto') syncBrandFromStoreName(normalizedStoreName);
        applyDocumentBranding(normalizedStoreName);
      } catch (error) {
        const isMissingLogo = error instanceof Error && /Asset request failed with 404/.test(error.message);
        if (!isMissingLogo) {
          console.error('خطا در دریافت تنظیمات فروشگاه:', error);
        }
        setStoreName('فروشگاه');
        setLogoUrl(null);
        applyDocumentBranding('فروشگاه');
      } finally {
        setIsLoadingSettings(false);
      }
    };

    void fetchStoreSettings();
  }, [authReady, currentUser, token, style.brandMode, syncBrandFromStoreName]);

  useEffect(() => {
    applyDocumentBranding(storeName);
  }, [storeName]);

  return { storeName, logoUrl, isLoadingSettings };
};
