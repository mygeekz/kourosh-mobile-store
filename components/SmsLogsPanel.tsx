import React, { useEffect, useMemo, useState } from 'react';
import { formatIranDateTime } from '../utils/iranDateTime';
import Modal from './Modal';
import Button from './Button';
import { useAuth } from '../contexts/AuthContext';
import { humanizeSmsError } from '../utils/smsErrorMessage';

type SmsLog = {
  id: number;
  createdAt: string;
  provider: string;
  eventType?: string;
  recipient: string;
  patternId?: string;
  success: number;
  error?: string;
  responseJson?: string;
  tokensJson?: string;
  requestJson?: string;
  httpStatus?: number;
  rawResponseText?: string;
  durationMs?: number;
  correlationId?: string;
  errorText?: string;
  relatedLogId?: number;
};

const formatDate = (iso: string) => formatIranDateTime(iso, iso || '—');

const safeJsonParse = (s?: string): any => {
  if (!s) return null;
  try { return JSON.parse(s); } catch { return s; }
};

const cleanText = (value?: string) => String(value || '')
  .replace(/عملیات ناموفق بود/g, 'انجام نشد')
  .replace(/عملیات ناموفق بود/g, 'انجام نشد')
  .replace(/ثبت اطلاعات شد/g, 'ثبت شد')
  .trim();


const getSmsErrorInput = (row: SmsLog) => {
  const payload = [
    row.error,
    row.errorText,
    row.rawResponseText,
    row.responseJson,
    row.requestJson,
  ].filter(Boolean).join(' | ');
  return cleanText(payload);
};

const getSmsErrorToneClass = (severity?: string) => {
  if (severity === 'warning') return 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200';
  if (severity === 'info') return 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-200';
  return 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200';
};

const eventTitleMap: Record<string, string> = {
  TEST_PATTERN: 'تست پترن',
  INSTALLMENT_COMPLETED: 'تسویه قسط',
  INSTALLMENT_REMINDER: 'یادآوری قسط',
  INSTALLMENT_DUE_7: 'سررسید ۷ روزه',
  INSTALLMENT_DUE_3: 'سررسید ۳ روزه',
  INSTALLMENT_DUE_TODAY: 'سررسید امروز',
  REPAIR_RECEIVED: 'ثبت پذیرش تعمیر',
  REPAIR_COST_ESTIMATED: 'اعلام هزینه تعمیر',
  REPAIR_READY_FOR_PICKUP: 'آماده تحویل',
  CHECK_FAILED: 'چک برگشتی',
  INVOICE_CREATED: 'ثبت فاکتور',
  INVOICE_PAYMENT_RECEIVED: 'پرداخت فاکتور',
};

const eventOptions = [
  'ALL',
  'TEST_PATTERN',
  'INSTALLMENT_COMPLETED',
  'INSTALLMENT_REMINDER',
  'INSTALLMENT_DUE_7',
  'INSTALLMENT_DUE_3',
  'INSTALLMENT_DUE_TODAY',
  'REPAIR_RECEIVED',
  'REPAIR_COST_ESTIMATED',
  'REPAIR_READY_FOR_PICKUP',
  'CHECK_FAILED',
  'INVOICE_CREATED',
  'INVOICE_PAYMENT_RECEIVED',
];

const resolveEventTitle = (value?: string) => eventTitleMap[String(value || '')] || cleanText(value) || '—';

const getDurationText = (row: SmsLog) => {
  if (typeof row.durationMs === 'number') return `${row.durationMs.toLocaleString('fa-IR')} ms`;
  return 'ثبت نشده';
};

const getHttpText = (row: SmsLog) => {
  if (typeof row.httpStatus === 'number') return row.httpStatus.toLocaleString('fa-IR');
  return '—';
};

const SMS_LOGS_PAGE_SIZE_OPTIONS = [5, 10, 20] as const;

const getProviderLabel = (provider?: string) => {
  const raw = String(provider || '').toLowerCase();
  if (raw.includes('meli')) return 'ملی‌پیامک';
  if (raw.includes('kavenegar')) return 'کاوه‌نگار';
  if (raw.includes('sms_ir')) return 'SMS.ir';
  if (raw.includes('ippanel')) return 'IPPANEL';
  return provider || '—';
};

const SmsLogsPanel: React.FC = () => {
  const { token } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [rows, setRows] = useState<SmsLog[]>([]);
  const [successFilter, setSuccessFilter] = useState<'ALL' | 'true' | 'false'>('ALL');
  const [eventType, setEventType] = useState<string>('ALL');
  const [recipient, setRecipient] = useState<string>('');
  const [selected, setSelected] = useState<SmsLog | null>(null);
  const [isRetryingId, setIsRetryingId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof SMS_LOGS_PAGE_SIZE_OPTIONS)[number]>(5);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    p.set('limit', '50');
    if (successFilter !== 'ALL') p.set('success', successFilter);
    if (eventType && eventType !== 'ALL') p.set('eventType', eventType);
    if (recipient.trim()) p.set('recipient', recipient.trim());
    return p.toString();
  }, [successFilter, eventType, recipient]);

  const load = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/sms/logs?${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success) {
        setRows(Array.isArray(data.data) ? data.data : []);
      } else {
        setToast({ ok: false, msg: cleanText(data?.message) || 'دریافت لاگ پیامک انجام نشد.' });
      }
    } catch (e: any) {
      setToast({ ok: false, msg: cleanText(e?.message) || 'ارتباط با سرور برای دریافت لاگ پیامک برقرار نشد.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qs, token]);

  useEffect(() => {
    setCurrentPage(1);
  }, [successFilter, eventType, recipient, pageSize]);

  const retry = async (id: number) => {
    if (!token) return;
    setIsRetryingId(id);
    setToast(null);
    try {
      const res = await fetch(`/api/sms/logs/${id}/retry`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success) {
        setToast({ ok: true, msg: cleanText(data?.message) || 'ارسال مجدد انجام شد.' });
        await load();
      } else {
        setToast({ ok: false, msg: cleanText(data?.message) || 'ارسال مجدد ناموفق بود.' });
      }
    } catch (e: any) {
      setToast({ ok: false, msg: cleanText(e?.message) || 'ارتباط با سرور برای ارسال مجدد برقرار نشد.' });
    } finally {
      setIsRetryingId(null);
    }
  };

  const okCount = rows.filter((r) => Number(r.success) === 1).length;
  const failCount = rows.length - okCount;
  const hasFailedLogs = failCount > 0;
  const isQuickErrorFilterActive = successFilter === 'false';
  const averageDuration = rows.filter((r) => typeof r.durationMs === 'number').map((r) => Number(r.durationMs));
  const avgDuration = averageDuration.length ? Math.round(averageDuration.reduce((sum, item) => sum + item, 0) / averageDuration.length) : null;
  const lastLog = rows[0];
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const visibleRows = rows.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  return (
    <section className="ops-logs-panel sms-logs-panel mt-6 rounded-[30px] border border-slate-200/80 bg-white/95 p-5 shadow-[0_30px_80px_-50px_rgba(15,23,42,0.2)] dark:border-slate-800 dark:bg-slate-900/95" data-ui-ops-panel="sms-logs" data-ui-ops-surface="logs">
      <div className="flex flex-col gap-4 border-b border-slate-200/80 pb-4 dark:border-slate-800 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/40 dark:bg-violet-950/30 dark:text-violet-200">
              <i className="fa-solid fa-clock-rotate-left" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-black text-slate-900 dark:text-slate-50">لاگ‌های ارسال پیامک</h3>
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                  <i className="fa-solid fa-database" />
                  نمایش {pageSize.toLocaleString('fa-IR')} لاگ در هر صفحه
                </span>
              </div>
              <p className="mt-1 text-sm leading-7 text-slate-500 dark:text-slate-400">
                گزارش خوانا از ارسال‌ها، خطاها، مدت پاسخ سرویس و مسیر ارسال مجدد پیامک.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <Button
            type="button"
            onClick={load}
            variant="ghost"
            size="sm"
            loading={isLoading}
            loadingText="در حال به‌روزرسانی..."
            leftIcon={!isLoading ? <i className="fa-solid fa-rotate" /> : undefined}
          >
            بروزرسانی
          </Button>
        </div>
      </div>

      <div className="ops-metric-grid mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5" data-ui-ops-metrics="true">
        {[
          { title: 'کل لاگ‌ها', value: rows.length.toLocaleString('fa-IR'), icon: 'fa-database', valueClass: 'text-slate-900 dark:text-slate-50' },
          { title: 'موفق', value: okCount.toLocaleString('fa-IR'), icon: 'fa-circle-check', valueClass: 'text-emerald-700 dark:text-emerald-300' },
          { title: 'ناموفق', value: failCount.toLocaleString('fa-IR'), icon: 'fa-circle-xmark', valueClass: 'text-rose-700 dark:text-rose-300' },
          { title: 'میانگین پاسخ', value: avgDuration !== null ? `${avgDuration.toLocaleString('fa-IR')} ms` : 'ثبت نشده', icon: 'fa-gauge-high', valueClass: 'text-slate-900 dark:text-slate-50' },
          { title: 'آخرین ارسال', value: lastLog ? formatDate(lastLog.createdAt) : '—', icon: 'fa-clock', valueClass: 'text-slate-900 dark:text-slate-50' },
        ].map((item) => (
          <div key={item.title} className="ops-metric-card rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400"><i className={`fa-solid ${item.icon}`} />{item.title}</div>
            <div className={`mt-1 truncate text-base font-black ${item.valueClass}`}>{item.value}</div>
          </div>
        ))}
      </div>

      <div className="ops-filter-panel mt-4 rounded-[24px] border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/50" data-ui-ops-filters="true">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-black text-slate-900 dark:text-slate-50">فیلتر لاگ‌ها</div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">با وضعیت، نوع رویداد یا شماره گیرنده لاگ‌ها را محدود کن.</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!hasFailedLogs && !isQuickErrorFilterActive}
              onClick={() => setSuccessFilter((prev) => (prev === 'false' ? 'ALL' : 'false'))}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                isQuickErrorFilterActive
                  ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200'
                  : hasFailedLogs
                    ? 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                    : 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400 opacity-70 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-500'
              }`}
              title={isQuickErrorFilterActive ? 'نمایش همه لاگ‌ها' : hasFailedLogs ? 'نمایش فقط لاگ‌های ناموفق' : 'لاگ خطاداری وجود ندارد'}
              aria-disabled={!hasFailedLogs && !isQuickErrorFilterActive}
            >
              <i className={`fa-solid ${hasFailedLogs || isQuickErrorFilterActive ? 'fa-triangle-exclamation' : 'fa-circle-check'}`} />
              <span>{isQuickErrorFilterActive ? 'خطادارها' : hasFailedLogs ? 'فقط خطادارها' : 'بدون خطا'}</span>
              <span className={`inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-black ${
                isQuickErrorFilterActive
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-100'
                  : hasFailedLogs
                    ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                    : 'bg-white text-slate-400 dark:bg-slate-800/80 dark:text-slate-500'
              }`}>
                {failCount.toLocaleString('fa-IR')}
              </span>
            </button>
            {(successFilter !== 'ALL' || eventType !== 'ALL' || recipient.trim()) ? (
              <button
                type="button"
                onClick={() => {
                  setSuccessFilter('ALL');
                  setEventType('ALL');
                  setRecipient('');
                }}
                className="ops-filter-chip ops-filter-chip--clear inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              >
                <i className="fa-solid fa-xmark" />
                پاک کردن فیلترها
              </button>
            ) : null}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/70 bg-white/80 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400">تعداد نمایش در هر صفحه</div>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value) as (typeof SMS_LOGS_PAGE_SIZE_OPTIONS)[number])}
            className="min-h-[38px] rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-700 outline-none transition    dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 "
          >
            {SMS_LOGS_PAGE_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>{option.toLocaleString('fa-IR')} لاگ</option>
            ))}
          </select>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="app-label">وضعیت ارسال</label>
            <select className="app-input" value={successFilter} onChange={(e) => setSuccessFilter(e.target.value as any)}>
              <option value="ALL">همه وضعیت‌ها</option>
              <option value="true">فقط موفق‌ها</option>
              <option value="false">فقط ناموفق‌ها</option>
            </select>
          </div>
          <div>
            <label className="app-label">نوع رویداد</label>
            <select className="app-input" value={eventType} onChange={(e) => setEventType(e.target.value)}>
              {eventOptions.map((x) => (
                <option key={x} value={x}>{x === 'ALL' ? 'همه رویدادها' : resolveEventTitle(x)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="app-label">جستجوی گیرنده</label>
            <input className="app-input" value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="0912..." dir="ltr" />
          </div>
        </div>
      </div>

      {toast ? (
        <div className={`mt-4 app-inline-alert ${toast.ok ? 'app-inline-alert--success' : 'app-inline-alert--danger'}`}>
          <div className="app-inline-alert__row">
            <span className="app-inline-alert__icon"><i className={`fa-solid ${toast.ok ? 'fa-circle-check' : 'fa-triangle-exclamation'}`} /></span>
            <div className="app-inline-alert__content">
              <div className="app-inline-alert__title">{toast.ok ? 'عملیات با موفقیت انجام شد' : 'در انجام عملیات مشکلی ایجاد شد'}</div>
              <div className="app-inline-alert__text">{toast.msg}</div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        {visibleRows.map((r) => {
          const ok = Number(r.success) === 1;
          const humanError = !ok ? humanizeSmsError(getSmsErrorInput(r)) : null;
          return (
            <article key={r.id} className="ops-log-item rounded-[24px] border border-slate-200/80 bg-white p-4 shadow-[0_18px_44px_-38px_rgba(15,23,42,0.18)] dark:border-slate-800 dark:bg-slate-950/45" data-ui-ops-log-item="sms" data-log-status={ok ? 'success' : 'failed'}>
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.72fr)] xl:items-start">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex items-start gap-3">
                      <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${ok ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200' : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200'}`}>
                        <i className={`fa-solid ${ok ? 'fa-circle-check' : 'fa-triangle-exclamation'}`} />
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-black text-slate-900 dark:text-slate-50">{resolveEventTitle(r.eventType)}</h4>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${ok ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200' : 'border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200'}`}>
                            <i className={`fa-solid ${ok ? 'fa-check' : 'fa-xmark'}`} />
                            {ok ? 'ارسال موفق' : 'ناموفق'}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span dir="ltr">#{r.id}</span>
                          <span>•</span>
                          <span>{formatDate(r.createdAt)}</span>
                          <span>•</span>
                          <span>{getProviderLabel(r.provider)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200/70 bg-slate-50/70 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/50">
                      <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">گیرنده</div>
                      <div className="mt-1 truncate text-xs font-black text-slate-800 dark:text-slate-100" dir="ltr">{r.recipient || '—'}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200/70 bg-slate-50/70 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/50">
                      <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">پترن</div>
                      <div className="mt-1 truncate text-xs font-black text-slate-800 dark:text-slate-100" dir="ltr">{r.patternId || '—'}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200/70 bg-slate-50/70 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/50">
                      <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">HTTP / مدت</div>
                      <div className="mt-1 truncate text-xs font-black text-slate-800 dark:text-slate-100" dir="ltr">{getHttpText(r)} / {getDurationText(r)}</div>
                    </div>
                  </div>

                  {!ok && humanError ? (
                    <div className={`mt-3 rounded-2xl border px-3 py-2.5 text-xs leading-6 ${getSmsErrorToneClass(humanError.severity)}`}>
                      <div className="flex items-start gap-2">
                        <i className="fa-solid fa-triangle-exclamation mt-1 shrink-0" />
                        <div className="min-w-0">
                          <div className="font-black">{humanError.title}</div>
                          <div className="mt-1">{humanError.message}</div>
                          <details className="mt-2 rounded-xl border border-current/15 bg-white/55 px-3 py-2 dark:bg-slate-950/20">
                            <summary className="cursor-pointer select-none font-black">نمایش راهکار پیشنهادی</summary>
                            <div className="mt-2">{humanError.action}</div>
                          </details>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-col gap-2 xl:items-end">
                  <Button type="button" onClick={() => setSelected(r)} variant="secondary" size="sm" className="w-full justify-center xl:w-auto" leftIcon={<i className="fa-solid fa-circle-info" />}>
                    جزئیات
                  </Button>
                  <Button
                    type="button"
                    disabled={isRetryingId === r.id}
                    onClick={() => retry(r.id)}
                    size="sm"
                    className="w-full justify-center xl:w-auto"
                    loading={isRetryingId === r.id}
                    loadingText="در حال ارسال..."
                    leftIcon={isRetryingId !== r.id ? <i className="fa-solid fa-paper-plane" /> : undefined}
                  >
                    ارسال مجدد
                  </Button>
                </div>
              </div>
            </article>
          );
        })}

        {rows.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50/80 px-5 py-8 text-center dark:border-slate-700 dark:bg-slate-950/40">
            <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              <i className="fa-solid fa-magnifying-glass" />
            </div>
            <div className="mt-3 text-sm font-black text-slate-900 dark:text-slate-50">لاگی برای فیلتر فعلی پیدا نشد</div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">فیلترها را تغییر بده یا بعد از ارسال تست، بروزرسانی را بزن.</div>
          </div>
        ) : null}
      </div>

      {rows.length > pageSize ? (
        <div className="mt-4 flex flex-col gap-3 rounded-[24px] border border-slate-200/80 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/50 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
            صفحه {safeCurrentPage.toLocaleString('fa-IR')} از {totalPages.toLocaleString('fa-IR')} · نمایش {visibleRows.length.toLocaleString('fa-IR')} لاگ از {rows.length.toLocaleString('fa-IR')} مورد · اندازه صفحه {pageSize.toLocaleString('fa-IR')}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={safeCurrentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              leftIcon={<i className="fa-solid fa-chevron-right" />}
            >
              قبلی
            </Button>
            {Array.from({ length: totalPages }).slice(0, 7).map((_, index) => {
              const pageNumber = index + 1;
              return (
                <button
                  key={pageNumber}
                  type="button"
                  onClick={() => setCurrentPage(pageNumber)}
                  className={`inline-flex h-9 min-w-9 items-center justify-center rounded-xl border px-3 text-xs font-black transition ${safeCurrentPage === pageNumber ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'}`}
                >
                  {pageNumber.toLocaleString('fa-IR')}
                </button>
              );
            })}
            {totalPages > 7 ? <span className="px-1 text-xs font-bold text-slate-400">…</span> : null}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={safeCurrentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              leftIcon={<i className="fa-solid fa-chevron-left" />}
            >
              بعدی
            </Button>
          </div>
        </div>
      ) : null}

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="جزئیات ارسال پیامک" widthClass="max-w-5xl">
        {selected ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              {[
                { title: 'تاریخ', value: formatDate(selected.createdAt), ltr: false },
                { title: 'گیرنده', value: selected.recipient || '—', ltr: true },
                { title: 'شناسه پیگیری', value: selected.correlationId || `sms-${selected.id}`, ltr: true },
                { title: 'HTTP / Duration', value: `${getHttpText(selected)} / ${getDurationText(selected)}`, ltr: true },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{item.title}</div>
                  <div className="mt-1 text-sm font-black text-slate-900 dark:text-slate-50" dir={item.ltr ? 'ltr' : 'rtl'}>{item.value}</div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/40">
              <div className="text-sm font-black text-slate-900 dark:text-slate-50">رویداد / پترن</div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">{resolveEventTitle(selected.eventType)}</span>
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" dir="ltr">{selected.patternId || '—'}</span>
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">{getProviderLabel(selected.provider)}</span>
              </div>
            </div>

            {Number(selected.success) !== 1 ? (() => {
              const humanError = humanizeSmsError(getSmsErrorInput(selected));
              return (
                <div className={`rounded-2xl border p-4 text-sm leading-7 ${getSmsErrorToneClass(humanError.severity)}`}>
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-current/20 bg-white/55 dark:bg-slate-950/20">
                      <i className="fa-solid fa-triangle-exclamation" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-base font-black">{humanError.title}</div>
                      <div className="mt-1">{humanError.message}</div>
                      <details className="mt-3 rounded-xl border border-current/15 bg-white/55 px-3 py-2 text-xs dark:bg-slate-950/20">
                        <summary className="cursor-pointer select-none font-black">نمایش راهکار پیشنهادی</summary>
                        <div className="mt-2">{humanError.action}</div>
                      </details>
                      <details className="mt-3 text-xs">
                        <summary className="cursor-pointer font-bold">نمایش جزئیات فنی</summary>
                        <pre className="mt-2 max-h-40 overflow-auto rounded-xl bg-white/70 p-3 text-[11px] text-slate-700 dark:bg-slate-950/30 dark:text-slate-200" dir="ltr">{humanError.technical || '—'}</pre>
                      </details>
                    </div>
                  </div>
                </div>
              );
            })() : null}

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                <div className="mb-2 text-sm font-black text-slate-900 dark:text-slate-50">متغیرها</div>
                <pre className="max-h-72 overflow-auto rounded-xl bg-white p-3 text-xs dark:bg-slate-900" dir="ltr">{JSON.stringify(safeJsonParse(selected.tokensJson), null, 2)}</pre>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                <div className="mb-2 text-sm font-black text-slate-900 dark:text-slate-50">درخواست</div>
                <pre className="max-h-72 overflow-auto rounded-xl bg-white p-3 text-xs dark:bg-slate-900" dir="ltr">{JSON.stringify(safeJsonParse(selected.requestJson), null, 2)}</pre>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                <div className="mb-2 text-sm font-black text-slate-900 dark:text-slate-50">پاسخ خام</div>
                <pre className="max-h-72 overflow-auto rounded-xl bg-white p-3 text-xs dark:bg-slate-900" dir="ltr">{selected.rawResponseText || '—'}</pre>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                <div className="mb-2 text-sm font-black text-slate-900 dark:text-slate-50">پاسخ سرویس</div>
                <pre className="max-h-72 overflow-auto rounded-xl bg-white p-3 text-xs dark:bg-slate-900" dir="ltr">{JSON.stringify(safeJsonParse(selected.responseJson), null, 2)}</pre>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button onClick={() => setSelected(null)} variant="secondary">بستن</Button>
              <Button onClick={() => selected && retry(selected.id)} disabled={!!selected && isRetryingId === selected.id} loading={!!selected && isRetryingId === selected.id} loadingText="در حال ارسال..." leftIcon={<i className="fa-solid fa-paper-plane" />}>
                ارسال مجدد
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </section>
  );
};

export default SmsLogsPanel;
