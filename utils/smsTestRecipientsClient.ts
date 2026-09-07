import type { SmsTestRecipient } from '../shared/smsTestRecipients';
import { apiFetch } from './apiFetch';

export type SmsTestRecipientsResponse = {
  items: SmsTestRecipient[];
  total: number;
};

export const fetchAllowedSmsTestRecipients = async (token: string): Promise<SmsTestRecipientsResponse> => {
  const response = await apiFetch('/api/sms/test-recipients', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.success) {
    throw new Error(String(payload?.message || 'دریافت شماره‌های مجاز تست پیامک انجام نشد.'));
  }
  const items = Array.isArray(payload?.data?.items) ? payload.data.items : [];
  return { items, total: Number(payload?.data?.total || items.length || 0) };
};
