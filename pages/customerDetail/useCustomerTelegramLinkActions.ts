import { apiFetch } from "../../utils/apiFetch";
import { getAuthHeaders } from '../../utils/apiUtils';

type CustomerTelegramLinkActionParams = {
  token?: string | null;
  customerData: any;
  setNotification: (value: any) => void;
  setTgQrOpen: (value: boolean) => void;
  setTgQrLoading: (value: boolean) => void;
  setTgQrDeepLink: (value: string) => void;
  setTgQrExpiresAt: (value: string) => void;
  setTgQrExpectedPhone: (value: string) => void;
  setTgQrBotUsernameMissing: (value: boolean) => void;
};

export function useCustomerTelegramLinkActions({
  token,
  customerData,
  setNotification,
  setTgQrOpen,
  setTgQrLoading,
  setTgQrDeepLink,
  setTgQrExpiresAt,
  setTgQrExpectedPhone,
  setTgQrBotUsernameMissing,
}: CustomerTelegramLinkActionParams) {
  const openQrLinkModal = async () => {
    if (!token) return;
    const cid = customerData?.profile?.id;
    if (!cid) return;

    setTgQrOpen(true);
    setTgQrLoading(true);
    setTgQrDeepLink('');
    setTgQrExpiresAt('');
    setTgQrExpectedPhone('');
    setTgQrBotUsernameMissing(false);

    try {
      const res = await apiFetch('/api/telegram/link-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
        body: JSON.stringify({ customerId: cid, expiresMinutes: 90 }),
      });
      const j = await res.json().catch(() => ({} as any));
      if (!res.ok || !j?.success) throw new Error(j?.message || 'ساخت QR انجام نشد.');

      const deepLink = String(j?.data?.deepLink || '').trim();
      const tokenStr = String(j?.data?.token || '').trim();

      // اگر bot username تنظیم نشده باشد، deepLink ممکن است ناقص باشد؛ در این حالت توکن را می‌دهیم.
      if (!deepLink || deepLink.includes('t.me/?start=') || deepLink.includes('t.me/?start')) {
        setTgQrBotUsernameMissing(true);
        setTgQrDeepLink(tokenStr ? `link_${tokenStr}` : '');
      } else {
        setTgQrDeepLink(deepLink);
      }

      setTgQrExpiresAt(String(j?.data?.expiresAt || ''));
      setTgQrExpectedPhone(String(j?.data?.expectedPhone || ''));
    } catch (e: any) {
      setNotification({ type: 'error', text: e?.message || 'خطا در ساخت QR' });
    } finally {
      setTgQrLoading(false);
    }
  };

  return { openQrLinkModal };
}
