import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ToggleSwitch from '../../components/ToggleSwitch';
import { Button, CheckboxField, Dialog, SelectField, TextField } from '@/components/ui';
import { apiFetch } from '../../utils/apiFetch';
import { formatIsoToShamsiDateTime } from '../../utils/dateUtils';

export type NotificationMatrixManager = {
  userId: number;
  displayName: string;
  username: string;
  permissions: string[];
  telegram: { state: 'linked' | 'pending' | 'not_linked' };
};

type NotificationCategory = 'sales' | 'installments' | 'repairs' | 'customers' | 'inventory' | 'accounting' | 'system';
type NotificationSeverity = 'info' | 'success' | 'warning' | 'danger';

type NotificationPreferenceItem = {
  key: string;
  label: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  requiredPermission: string;
  telegramEnabled: boolean;
  inAppEnabled: boolean;
  config: Record<string, unknown>;
  explicit: boolean;
};

type NotificationPreferencesPayload = {
  userId: number;
  membershipId: number;
  tenantId: string;
  items: NotificationPreferenceItem[];
};

type ReportSchedule = {
  id: number;
  reportKey: 'nightly_sales' | 'morning_installments';
  localTime: string;
  timezone: string;
  enabled: boolean;
  channels: { inApp: boolean; telegram: boolean };
  config: Record<string, unknown>;
  catchUpPolicy: 'catch_up' | 'skip_if_old';
  maxAgeMinutes: number;
  graceMinutes: number;
  updatedAt: string;
};

type ScheduledRun = {
  id: number;
  scheduleId: number;
  reportKey: string;
  scheduledFor: string;
  status: 'scheduled' | 'running' | 'completed' | 'failed' | 'skipped';
  deliveryStatus: string;
  retryCount: number;
  executedAt: string | null;
  completedAt: string | null;
  lastError: string | null;
};

type ApiEnvelope<T> = { success?: boolean; data?: T; message?: string; code?: string };

const readApi = async <T,>(response: Response): Promise<T> => {
  const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<T>;
  if (!response.ok || payload.success === false || payload.data === undefined) {
    throw new Error(String(payload.message || `خطای ${response.status}`));
  }
  return payload.data;
};

const CATEGORY_META: Record<NotificationCategory, { label: string; icon: string }> = {
  sales: { label: 'فروش', icon: 'fa-cart-shopping' },
  installments: { label: 'اقساط و چک‌ها', icon: 'fa-calendar-check' },
  repairs: { label: 'تعمیرات', icon: 'fa-screwdriver-wrench' },
  customers: { label: 'حساب مشتریان', icon: 'fa-users' },
  inventory: { label: 'موجودی', icon: 'fa-boxes-stacked' },
  accounting: { label: 'مالی و سلامت حسابداری', icon: 'fa-scale-balanced' },
  system: { label: 'عمومی فروشگاه', icon: 'fa-store' },
};

const SEVERITY_META: Record<NotificationSeverity, { label: string; className: string }> = {
  info: { label: 'اطلاع', className: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-200' },
  success: { label: 'عادی', className: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200' },
  warning: { label: 'مهم', className: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200' },
  danger: { label: 'فوری', className: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200' },
};

const REPORT_META = {
  nightly_sales: {
    label: 'گزارش شبانه فروش',
    icon: 'fa-chart-line',
    requiredPermission: 'sales.read',
  },
  morning_installments: {
    label: 'گزارش صبح اقساط',
    icon: 'fa-clock',
    requiredPermission: 'installments.read',
  },
} as const;

const RUN_STATUS_META: Record<ScheduledRun['status'], { label: string; className: string }> = {
  scheduled: { label: 'زمان‌بندی‌شده', className: 'text-sky-700 dark:text-sky-300' },
  running: { label: 'در حال اجرا', className: 'text-amber-700 dark:text-amber-300' },
  completed: { label: 'تکمیل‌شده', className: 'text-emerald-700 dark:text-emerald-300' },
  failed: { label: 'ناموفق', className: 'text-rose-700 dark:text-rose-300' },
  skipped: { label: 'ردشده', className: 'text-slate-600 dark:text-slate-300' },
};

const formatDate = (value?: string | null) => value ? formatIsoToShamsiDateTime(value) : '—';
const clonePreferences = (items: NotificationPreferenceItem[]) => items.map((item) => ({ ...item, config: { ...(item.config || {}) } }));
const cloneSchedules = (items: ReportSchedule[]) => items.map((item) => ({ ...item, channels: { ...item.channels }, config: { ...(item.config || {}) } }));

const SettingsManagerNotificationMatrixDialog: React.FC<{
  manager: NotificationMatrixManager | null;
  onClose: () => void;
}> = ({ manager, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferenceItem[]>([]);
  const [schedules, setSchedules] = useState<ReportSchedule[]>([]);
  const [runs, setRuns] = useState<ScheduledRun[]>([]);

  const load = useCallback(async () => {
    if (!manager) return;
    setLoading(true);
    setError(null);
    setFeedback(null);
    try {
      const [preferencesResponse, schedulesResponse, runsResponse] = await Promise.all([
        apiFetch(`/api/notifications/managers/${manager.userId}/preferences`),
        apiFetch(`/api/reports/managers/${manager.userId}/schedules`),
        apiFetch(`/api/reports/managers/${manager.userId}/runs?limit=8`),
      ]);
      const preferencesData = await readApi<NotificationPreferencesPayload>(preferencesResponse);
      const schedulesData = await readApi<ReportSchedule[]>(schedulesResponse);
      const runsData = await readApi<ScheduledRun[]>(runsResponse);
      setPreferences(clonePreferences((preferencesData.items || []).filter((item) => !item.key.startsWith('report.'))));
      setSchedules(cloneSchedules(Array.isArray(schedulesData) ? schedulesData : []));
      setRuns(Array.isArray(runsData) ? runsData : []);
    } catch (cause) {
      setError(String((cause as Error)?.message || cause || 'دریافت تنظیمات اعلان مدیر انجام نشد.'));
    } finally {
      setLoading(false);
    }
  }, [manager]);

  useEffect(() => {
    if (manager) void load();
    else {
      setPreferences([]);
      setSchedules([]);
      setRuns([]);
      setError(null);
      setFeedback(null);
    }
  }, [manager, load]);

  const groupedPreferences = useMemo(() => {
    const groups = new Map<NotificationCategory, NotificationPreferenceItem[]>();
    for (const item of preferences) {
      const list = groups.get(item.category) || [];
      list.push(item);
      groups.set(item.category, list);
    }
    return [...groups.entries()];
  }, [preferences]);

  const enabledStats = useMemo(() => ({
    inApp: preferences.filter((item) => manager?.permissions.includes(item.requiredPermission) && item.inAppEnabled).length,
    telegram: preferences.filter((item) => manager?.permissions.includes(item.requiredPermission) && item.telegramEnabled).length,
    available: preferences.filter((item) => manager?.permissions.includes(item.requiredPermission)).length,
  }), [manager?.permissions, preferences]);

  const updatePreference = (key: string, field: 'inAppEnabled' | 'telegramEnabled', value: boolean) => {
    setPreferences((current) => current.map((item) => item.key === key ? { ...item, [field]: value } : item));
  };

  const updateSchedule = (reportKey: ReportSchedule['reportKey'], updater: (current: ReportSchedule) => ReportSchedule) => {
    setSchedules((current) => current.map((item) => item.reportKey === reportKey ? updater(item) : item));
  };

  const save = async () => {
    if (!manager || saving) return;
    setSaving(true);
    setError(null);
    setFeedback(null);
    try {
      const permittedPreferences = preferences.filter((item) => manager.permissions.includes(item.requiredPermission));
      const preferencesResponse = await apiFetch(`/api/notifications/managers/${manager.userId}/preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: permittedPreferences.map((item) => ({
            key: item.key,
            inAppEnabled: item.inAppEnabled,
            telegramEnabled: item.telegramEnabled,
            config: item.config || {},
          })),
        }),
      });
      await readApi<NotificationPreferencesPayload>(preferencesResponse);

      for (const schedule of schedules) {
        const requiredPermission = REPORT_META[schedule.reportKey]?.requiredPermission;
        if (!requiredPermission || !manager.permissions.includes(requiredPermission)) continue;
        // eslint-disable-next-line no-await-in-loop
        const response = await apiFetch(`/api/reports/managers/${manager.userId}/schedules/${schedule.reportKey}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            enabled: schedule.enabled,
            localTime: schedule.localTime,
            timezone: schedule.timezone,
            channels: schedule.channels,
            config: schedule.config,
            catchUpPolicy: schedule.catchUpPolicy,
            maxAgeMinutes: schedule.maxAgeMinutes,
            graceMinutes: schedule.graceMinutes,
          }),
        });
        // eslint-disable-next-line no-await-in-loop
        await readApi<ReportSchedule | null>(response);
      }
      setFeedback('تنظیمات اعلان‌ها و گزارش‌های این مدیر ذخیره شد.');
      await load();
      setFeedback('تنظیمات اعلان‌ها و گزارش‌های این مدیر ذخیره شد.');
    } catch (cause) {
      setError(String((cause as Error)?.message || cause || 'ذخیره تنظیمات انجام نشد.'));
    } finally {
      setSaving(false);
    }
  };

  const telegramLinked = manager?.telegram.state === 'linked';

  return (
    <Dialog
      isOpen={Boolean(manager)}
      onClose={onClose}
      title="ماتریس اعلان‌ها و گزارش‌ها"
      iconClass="fa-solid fa-bell"
      size="xl"
      variant="operational"
      layout="vertical"
      kicker="Telegram Management Center"
    >
      <div className="space-y-5" dir="rtl" data-ui-manager-notification-matrix="v352">
        <section className="grid gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-border bg-muted/25 p-3 md:col-span-2">
            <span className="text-xs text-muted-foreground">مدیر</span>
            <strong className="mt-1 block text-sm text-foreground">{manager?.displayName || '—'}</strong>
            <span className="mt-1 block text-xs text-muted-foreground" dir="ltr">@{manager?.username || '—'} · #{manager?.userId || '—'}</span>
          </div>
          <div className="rounded-xl border border-border bg-muted/25 p-3">
            <span className="text-xs text-muted-foreground">رویدادهای در دسترس</span>
            <strong className="mt-1 block text-base text-foreground">{enabledStats.available.toLocaleString('fa-IR')}</strong>
          </div>
          <div className="rounded-xl border border-border bg-muted/25 p-3">
            <span className="text-xs text-muted-foreground">کانال‌های فعال</span>
            <strong className="mt-1 block text-sm text-foreground">داخل برنامه {enabledStats.inApp.toLocaleString('fa-IR')} · تلگرام {enabledStats.telegram.toLocaleString('fa-IR')}</strong>
          </div>
        </section>

        {!telegramLinked ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
            <i className="fa-brands fa-telegram ml-1" />
            این مدیر هنوز Telegram Binding فعال ندارد. می‌توانید تنظیمات تلگرام را از قبل مشخص کنید، اما تا زمان اتصال واقعی هیچ پیام Telegram تحویل نمی‌شود.
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">{error}</div>
        ) : null}
        {feedback ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">{feedback}</div>
        ) : null}

        {loading ? (
          <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground"><i className="fa-solid fa-spinner fa-spin" /> در حال دریافت ماتریس اعلان‌ها…</div>
        ) : (
          <>
            <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2"><i className="fa-solid fa-bolt text-primary" /><strong className="text-sm text-foreground">اعلان رویدادها</strong></div>
                  <p className="mt-1 text-xs leading-6 text-muted-foreground">برای هر رویداد مشخص کنید در Inbox مدیریت ثبت شود یا از طریق Telegram هم ارسال شود.</p>
                </div>
                <div className="flex items-center gap-5 text-xs font-semibold text-muted-foreground">
                  <span>داخل برنامه</span><span>تلگرام</span>
                </div>
              </div>

              <div className="space-y-4">
                {groupedPreferences.map(([category, items]) => {
                  const categoryMeta = CATEGORY_META[category];
                  return (
                    <div key={category} className="overflow-hidden rounded-xl border border-border">
                      <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-3 py-2.5">
                        <i className={`fa-solid ${categoryMeta.icon} text-primary`} />
                        <strong className="text-xs text-foreground">{categoryMeta.label}</strong>
                      </div>
                      <div className="divide-y divide-border">
                        {items.map((item) => {
                          const allowed = Boolean(manager?.permissions.includes(item.requiredPermission));
                          const severity = SEVERITY_META[item.severity];
                          return (
                            <div key={item.key} className={`grid gap-3 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_90px_90px] sm:items-center ${allowed ? '' : 'opacity-60'}`}>
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <strong className="text-sm text-foreground">{item.label}</strong>
                                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${severity.className}`}>{severity.label}</span>
                                </div>
                                {!allowed ? <span className="mt-1 block text-[11px] text-muted-foreground">نیازمند دسترسی <code dir="ltr">{item.requiredPermission}</code></span> : null}
                              </div>
                              <div className="flex items-center justify-between gap-2 sm:justify-center">
                                <span className="text-xs text-muted-foreground sm:hidden">داخل برنامه</span>
                                <ToggleSwitch checked={item.inAppEnabled} disabled={!allowed} onCheckedChange={(value) => updatePreference(item.key, 'inAppEnabled', value)} ariaLabel={`اعلان داخل برنامه برای ${item.label}`} size="sm" />
                              </div>
                              <div className="flex items-center justify-between gap-2 sm:justify-center">
                                <span className="text-xs text-muted-foreground sm:hidden">تلگرام</span>
                                <ToggleSwitch checked={item.telegramEnabled} disabled={!allowed} onCheckedChange={(value) => updatePreference(item.key, 'telegramEnabled', value)} ariaLabel={`اعلان تلگرام برای ${item.label}`} size="sm" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
              <div>
                <div className="flex items-center gap-2"><i className="fa-solid fa-calendar-days text-primary" /><strong className="text-sm text-foreground">گزارش‌های زمان‌بندی‌شده</strong></div>
                <p className="mt-1 text-xs leading-6 text-muted-foreground">زمان، کانال ارسال، محتوای گزارش و رفتار پس از خاموش‌بودن سیستم را برای همین مدیر تنظیم کنید.</p>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                {schedules.map((schedule) => {
                  const meta = REPORT_META[schedule.reportKey];
                  const allowed = manager?.permissions.includes(meta.requiredPermission) ?? false;
                  const nightly = schedule.reportKey === 'nightly_sales';
                  const windows = Array.isArray(schedule.config.windows) ? schedule.config.windows.map(Number) : [0, 3, 7];
                  return (
                    <article key={schedule.reportKey} className={`space-y-4 rounded-xl border border-border bg-muted/15 p-4 ${allowed ? '' : 'opacity-60'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background text-primary shadow-sm"><i className={`fa-solid ${meta.icon}`} /></span>
                          <div><strong className="block text-sm text-foreground">{meta.label}</strong><span className="mt-1 block text-xs text-muted-foreground">{allowed ? `منطقه زمانی: ${schedule.timezone}` : `نیازمند ${meta.requiredPermission}`}</span></div>
                        </div>
                        <ToggleSwitch checked={schedule.enabled} disabled={!allowed} onCheckedChange={(value) => updateSchedule(schedule.reportKey, (current) => ({ ...current, enabled: value }))} ariaLabel={`فعال‌بودن ${meta.label}`} size="sm" />
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <TextField
                          type="time"
                          label="زمان ارسال"
                          value={schedule.localTime}
                          disabled={!allowed || !schedule.enabled}
                          onChange={(event) => updateSchedule(schedule.reportKey, (current) => ({ ...current, localTime: event.target.value }))}
                        />
                        <SelectField
                          label="اگر سیستم خاموش بود"
                          value={schedule.catchUpPolicy}
                          disabled={!allowed || !schedule.enabled}
                          onChange={(event) => updateSchedule(schedule.reportKey, (current) => ({ ...current, catchUpPolicy: event.target.value as ReportSchedule['catchUpPolicy'] }))}
                        >
                          <option value="catch_up">بعد از روشن‌شدن ارسال شود</option>
                          <option value="skip_if_old">اگر دیر شد رد شود</option>
                        </SelectField>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-border bg-background p-3">
                          <span className="mb-2 block text-xs font-semibold text-foreground">کانال‌های ارسال</span>
                          <div className="space-y-2">
                            <CheckboxField label="داخل برنامه" checked={schedule.channels.inApp} disabled={!allowed || !schedule.enabled} onChange={(event) => updateSchedule(schedule.reportKey, (current) => ({ ...current, channels: { ...current.channels, inApp: event.target.checked } }))} />
                            <CheckboxField label="تلگرام" description={!telegramLinked ? 'اتصال تلگرام این مدیر فعال نیست.' : undefined} checked={schedule.channels.telegram} disabled={!allowed || !schedule.enabled} onChange={(event) => updateSchedule(schedule.reportKey, (current) => ({ ...current, channels: { ...current.channels, telegram: event.target.checked } }))} />
                          </div>
                        </div>
                        <div className="rounded-xl border border-border bg-background p-3">
                          <span className="mb-2 block text-xs font-semibold text-foreground">محتوای گزارش</span>
                          <div className="space-y-2">
                            {nightly ? (
                              <>
                                <CheckboxField label="نمایش سود ناخالص" description={!manager?.permissions.includes('profits.read') ? 'مدیر دسترسی profits.read ندارد و سود در هر صورت ارسال نمی‌شود.' : undefined} checked={schedule.config.includeProfit !== false} disabled={!allowed || !schedule.enabled || !manager?.permissions.includes('profits.read')} onChange={(event) => updateSchedule(schedule.reportKey, (current) => ({ ...current, config: { ...current.config, includeProfit: event.target.checked } }))} />
                                <CheckboxField label="نمایش میانگین فروش" checked={schedule.config.includeAverage !== false} disabled={!allowed || !schedule.enabled} onChange={(event) => updateSchedule(schedule.reportKey, (current) => ({ ...current, config: { ...current.config, includeAverage: event.target.checked } }))} />
                              </>
                            ) : (
                              <>
                                <CheckboxField label="اقساط معوق" checked={schedule.config.includeOverdue !== false} disabled={!allowed || !schedule.enabled} onChange={(event) => updateSchedule(schedule.reportKey, (current) => ({ ...current, config: { ...current.config, includeOverdue: event.target.checked } }))} />
                                {[0, 3, 7].map((windowValue) => (
                                  <CheckboxField key={windowValue} label={windowValue === 0 ? 'سررسید امروز' : `${windowValue.toLocaleString('fa-IR')} روز آینده`} checked={windows.includes(windowValue)} disabled={!allowed || !schedule.enabled} onChange={(event) => updateSchedule(schedule.reportKey, (current) => {
                                    const currentWindows = Array.isArray(current.config.windows) ? current.config.windows.map(Number) : [0, 3, 7];
                                    const next = event.target.checked ? [...new Set([...currentWindows, windowValue])] : currentWindows.filter((value) => value !== windowValue);
                                    return { ...current, config: { ...current.config, windows: next } };
                                  })} />
                                ))}
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <TextField
                          type="number"
                          min={1}
                          max={10080}
                          label={schedule.catchUpPolicy === 'catch_up' ? 'حداکثر تأخیر قابل جبران (دقیقه)' : 'حداکثر عمر اجرا (دقیقه)'}
                          value={String(schedule.maxAgeMinutes)}
                          disabled={!allowed || !schedule.enabled || schedule.catchUpPolicy !== 'catch_up'}
                          onChange={(event) => updateSchedule(schedule.reportKey, (current) => ({ ...current, maxAgeMinutes: Number(event.target.value || 1) }))}
                          valueKind="number"
                        />
                        <TextField
                          type="number"
                          min={1}
                          max={1440}
                          label="مهلت اجرای به‌موقع (دقیقه)"
                          value={String(schedule.graceMinutes)}
                          disabled={!allowed || !schedule.enabled}
                          onChange={(event) => updateSchedule(schedule.reportKey, (current) => ({ ...current, graceMinutes: Number(event.target.value || 1) }))}
                          valueKind="number"
                        />
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <div><div className="flex items-center gap-2"><i className="fa-solid fa-clock-rotate-left text-primary" /><strong className="text-sm text-foreground">آخرین اجراهای گزارش</strong></div><p className="mt-1 text-xs text-muted-foreground">برای تشخیص اجرا، تأخیر، Retry یا Skip شدن گزارش‌ها.</p></div>
                <Button type="button" variant="ghost" size="xs" onClick={() => void load()} leftIcon={<i className="fa-solid fa-rotate" />}>تازه‌سازی</Button>
              </div>
              {runs.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">هنوز اجرای ثبت‌شده‌ای برای این مدیر وجود ندارد.</div>
              ) : (
                <div className="space-y-2">
                  {runs.map((run) => {
                    const status = RUN_STATUS_META[run.status];
                    const reportLabel = run.reportKey === 'nightly_sales' ? 'فروش شبانه' : run.reportKey === 'morning_installments' ? 'اقساط صبح' : run.reportKey;
                    return (
                      <div key={run.id} className="grid gap-2 rounded-xl border border-border bg-muted/15 p-3 sm:grid-cols-[minmax(0,1fr)_130px_120px] sm:items-center">
                        <div className="min-w-0"><strong className="block text-xs text-foreground">{reportLabel}</strong><span className="mt-1 block text-[11px] text-muted-foreground">نوبت: {formatDate(run.scheduledFor)} · تلاش: {run.retryCount.toLocaleString('fa-IR')}</span>{run.lastError ? <span className="mt-1 block break-all text-[10px] text-rose-600 dark:text-rose-300">{run.lastError}</span> : null}</div>
                        <span className={`text-xs font-semibold ${status.className}`}>{status.label}</span>
                        <span className="text-[11px] text-muted-foreground">اجرا: {formatDate(run.executedAt)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4" data-skip-global-buttons="true">
        <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={saving}>بستن</Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => void load()} disabled={loading || saving} leftIcon={<i className="fa-solid fa-rotate" />}>بازخوانی</Button>
        <Button type="button" variant="primary" size="sm" onClick={() => void save()} loading={saving} loadingText="در حال ذخیره..." disabled={loading} leftIcon={!saving ? <i className="fa-solid fa-floppy-disk" /> : undefined}>ذخیره تنظیمات</Button>
      </div>
    </Dialog>
  );
};

export default SettingsManagerNotificationMatrixDialog;
