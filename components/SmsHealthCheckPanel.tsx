import React from 'react';
import { apiFetch } from '../utils/apiFetch';
import { formatIranDateTime } from '../utils/iranDateTime';
import type { SmsPatternDef } from './SmsBulkTestModal';
import Button from './Button';
import { Surface } from '@/components/ui';
import { IconGlyph } from '@/components/ui';
type HealthItem = {
  key: string;
  label: string;
  category: string;
  configured: boolean;
  bodyId?: number | null;
  identifier?: string | null;
};

type CredentialItem = {
  key: string;
  label: string;
  configured: boolean;
};

type HealthResponse = {
  success: boolean;
  provider?: string;
  providerTitle?: string;
  credsOk?: boolean;
  credentialItems?: CredentialItem[];
  supportsLivePatternTest?: boolean;
  checkedAt?: string;
  message?: string;
  items?: HealthItem[];
};

type Props = {
  patterns: SmsPatternDef[];
  provider: string;
  onOpenBulkCheck: (defaultSelectedKeys: string[]) => void;
};

const categoryIconMap: Record<string, string> = {
  اقساط: 'fa-wallet',
  تعمیرات: 'fa-screwdriver-wrench',
  فاکتورها: 'fa-file-invoice',
  'چک‌ها': 'fa-money-check-dollar',
  حساب: 'fa-scale-balanced',
};

const SmsHealthCheckPanel: React.FC<Props> = ({ patterns, provider, onOpenBulkCheck }) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const [data, setData] = React.useState<HealthResponse | null>(null);
  const [error, setError] = React.useState('');

  const load = React.useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await apiFetch('/api/sms/health-check', { cache: 'no-store' });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || json?.success === false) throw new Error(String(json?.message || 'بررسی سلامت تنظیمات پیامک انجام نشد.'));
      setData(json as HealthResponse);
    } catch (loadError: any) {
      setData(null);
      setError(String(loadError?.message || 'ارتباط با سرور برای بررسی سلامت پیامک برقرار نشد.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load, provider]);

  const items = React.useMemo<HealthItem[]>(() => {
    if (Array.isArray(data?.items) && data.items.length) return data.items;
    if (provider !== 'meli_payamak') return [];
    return patterns.map((pattern) => ({
      key: String(pattern.key),
      label: pattern.label,
      category: pattern.category,
      configured: false,
      bodyId: null,
    }));
  }, [data?.items, patterns, provider]);

  const grouped = React.useMemo(() => {
    const map = new Map<string, HealthItem[]>();
    items.forEach((item) => map.set(item.category, [...(map.get(item.category) || []), item]));
    return Array.from(map.entries());
  }, [items]);

  const configuredCount = items.filter((item) => item.configured).length;
  const missingItems = items.filter((item) => !item.configured);
  const progress = items.length ? Math.round((configuredCount / items.length) * 100) : 0;
  const credsOk = Boolean(data?.credsOk);
  const providerTitle = data?.providerTitle || provider;
  const overallReady = credsOk && configuredCount > 0;

  return (
    <Surface surface="glass" variant="panel" scheme="adaptive" className="ops-health-panel sms-health-panel settings-sms-health rounded-[22px]" contentClassName="p-4 sm:p-5" data-ui-ops-panel="sms-health" data-ui-ops-surface="health">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 dark:border-slate-800 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <IconGlyph size="md" tone="success"><i className="fa-solid fa-shield-heart" /></IconGlyph>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[14px] font-black text-slate-950 dark:text-white">سلامت پیکربندی پیامک</h3>
              <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black ${overallReady ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/25 dark:text-emerald-300' : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-300'}`}>
                <i className={`fa-solid ${overallReady ? 'fa-circle-check' : 'fa-triangle-exclamation'}`} />
                {overallReady ? 'آماده' : 'ناقص'}
              </span>
            </div>
            <p className="mt-0.5 text-[10px] leading-5 text-slate-500 dark:text-slate-400 sm:text-[11px]">این بررسی فقط تنظیمات ذخیره‌شده SQLite را ارزیابی می‌کند و بدون ارسال پیامک واقعی انجام می‌شود.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"><i className="fa-solid fa-tower-broadcast" />{providerTitle}</span>
          <Button type="button" variant="secondary" size="xs" className="settings-sms-action rounded-[11px]" onClick={() => void load()} loading={isLoading} loadingText="در حال بررسی..." leftIcon={!isLoading ? <i className="fa-solid fa-rotate" /> : undefined}>بروزرسانی</Button>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-[16px] border border-rose-200 bg-rose-50 px-4 py-3 text-[11px] font-bold text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-300">
          <i className="fa-solid fa-triangle-exclamation ml-1" />{error}
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: 'اتصال', value: credsOk ? 'کامل' : 'ناقص', tone: credsOk ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400' },
          { label: 'قالب‌های آماده', value: `${configuredCount.toLocaleString('fa-IR')}/${items.length.toLocaleString('fa-IR')}`, tone: 'text-slate-900 dark:text-white' },
          { label: 'پوشش', value: `${progress.toLocaleString('fa-IR')}٪`, tone: progress >= 80 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400' },
          { label: 'آخرین بررسی', value: data?.checkedAt ? formatIranDateTime(data.checkedAt) : '—', tone: 'text-slate-900 dark:text-white' },
        ].map((metric) => (
          <Surface key={metric.label} surface="glass" variant="subtle" scheme="adaptive" className="settings-sms-metric rounded-[15px]" contentClassName="px-3 py-2.5">
            <div className="text-[9px] font-bold text-slate-500 dark:text-slate-400">{metric.label}</div>
            <div className={`mt-1 truncate text-[11px] font-black ${metric.tone}`}>{metric.value}</div>
          </Surface>
        ))}
      </div>

      {Array.isArray(data?.credentialItems) && data.credentialItems.length ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {data.credentialItems.map((item) => (
            <span key={item.key} className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[9px] font-black ${item.configured ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/25 dark:text-emerald-300' : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/25 dark:text-rose-300'}`}>
              <i className={`fa-solid ${item.configured ? 'fa-check' : 'fa-xmark'}`} />{item.label}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        {grouped.map(([category, categoryItems]) => (
          <Surface key={category} surface="glass" variant="subtle" scheme="adaptive" className="rounded-[17px]" contentClassName="p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[11px] font-black text-slate-900 dark:text-slate-100"><i className={`fa-solid ${categoryIconMap[category] || 'fa-layer-group'} text-primary`} />{category}</div>
              <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400">{categoryItems.filter((item) => item.configured).length.toLocaleString('fa-IR')}/{categoryItems.length.toLocaleString('fa-IR')}</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {categoryItems.map((item) => (
                <Surface key={item.key} surface="glass" variant="subtle" scheme="adaptive" className="rounded-[13px]" contentClassName="flex min-w-0 items-center justify-between gap-2 px-3 py-2">
                  <span className="min-w-0 truncate text-[10px] font-bold text-slate-700 dark:text-slate-200">{item.label}</span>
                  <IconGlyph size="sm" tone={item.configured ? 'success' : 'danger'}><i className={`fa-solid ${item.configured ? 'fa-check' : 'fa-xmark'} text-[9px]`} /></IconGlyph>
                </Surface>
              ))}
            </div>
          </Surface>
        ))}
      </div>

      {provider === 'meli_payamak' && missingItems.length ? (
        <div className="mt-4 flex flex-col gap-2 rounded-[16px] border border-amber-200 bg-amber-50/70 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/20 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-[10px] font-bold text-amber-800 dark:text-amber-200">{missingItems.length.toLocaleString('fa-IR')} قالب ملی‌پیامک هنوز تنظیم نشده است.</div>
          <Button type="button" variant="warning" size="xs" className="settings-sms-action rounded-[11px]" onClick={() => onOpenBulkCheck(missingItems.map((item) => item.key))} leftIcon={<i className="fa-solid fa-vials" />}>بررسی قالب‌های ناقص</Button>
        </div>
      ) : null}
    </Surface>
  );
};

export default SmsHealthCheckPanel;
