// pages/Outbox.tsx
import { useEffect, useMemo, useState } from 'react';
import PageKit from '../components/ui/PageKit';
import MessageComposerModal from '../components/MessageComposerModal';
import { apiFetch } from '../utils/apiFetch';
import toast from 'react-hot-toast';
import moment from 'jalali-moment';

type TelegramOutboxItem = {
  id: number;
  status: 'pending' | 'processing' | 'done' | 'failed' | string;
  isRetried?: boolean;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  eventType?: string | null;
  entityType?: string | null;
  entityId?: number | null;
  chatId?: string | null;
  text?: string | null;
  customerId?: number | null;
  customerName?: string | null;
  customerPhone?: string | null;
  supportStatus?: 'resolved' | string | null;
  supportNote?: string | null;
  error?: string | null;
  errorKind?: 'blocked' | 'chat not found' | 'proxy error' | 'other' | null;
  messageType?: 'installments' | 'repairs' | 'manual' | 'reports' | 'other' | string;
};

type TelegramInboxItem = {
  id: number;
  chatId?: string | null;
  fromId?: string | null;
  kind?: string | null;
  text?: string | null;
  createdAt?: string | null;
  customerId?: number | null;
  customerName?: string | null;
  customerPhone?: string | null;
  telegramOptedOut?: number | null;
};

type TabKey = 'outbox' | 'inbox';

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'همه وضعیت‌ها' },
  { value: 'pending', label: 'در صف' },
  { value: 'processing', label: 'در حال ارسال' },
  { value: 'done', label: 'ارسال‌شده' },
  { value: 'failed', label: 'ناموفق' },
];

const TYPE_OPTIONS = [
  { value: 'ALL', label: 'همه پیام‌ها' },
  { value: 'installments', label: 'اقساط و چک' },
  { value: 'repairs', label: 'تعمیرات' },
  { value: 'manual', label: 'دستی' },
  { value: 'reports', label: 'گزارش‌ها' },
  { value: 'other', label: 'سایر' },
];

const SUPPORT_OPTIONS = [
  { value: 'ALL', label: 'همه موارد' },
  { value: 'open', label: 'نیازمند بررسی' },
  { value: 'resolved', label: 'بررسی‌شده' },
];

const cardClass = 'rounded-[26px] border border-slate-200/80 bg-white/95 p-4 shadow-[0_18px_50px_-34px_rgba(15,23,42,0.35)] dark:border-slate-800 dark:bg-slate-950/90';
const fieldClass = 'h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none transition    dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 ';
const ghostButton = 'inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900';
const primaryButton = 'inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-3 text-xs font-black text-white shadow-[0_14px_34px_-24px_rgba(15,23,42,0.85)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45 dark:bg-white dark:text-slate-950';

const toFaDT = (iso?: string | null) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString('fa-IR'); } catch { return String(iso); }
};

const statusBadge = (r: TelegramOutboxItem) => {
  if (r.status === 'done') return { label: 'ارسال‌شده', cls: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200' };
  if (r.status === 'failed') return { label: 'ناموفق', cls: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200' };
  if (r.status === 'processing') return { label: 'در حال ارسال', cls: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-200' };
  if (r.isRetried) return { label: 'ارسال مجدد', cls: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200' };
  return { label: 'در صف', cls: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200' };
};

const typeBadge = (t?: string | null) => {
  const v = String(t || '').toLowerCase();
  if (v === 'installments') return 'اقساط و چک';
  if (v === 'repairs') return 'تعمیرات';
  if (v === 'manual') return 'دستی';
  if (v === 'reports') return 'گزارش‌ها';
  return 'سایر';
};

const errorReasonFa = (k?: TelegramOutboxItem['errorKind']) => {
  if (k === 'blocked') return 'کاربر ربات را بلاک کرده';
  if (k === 'chat not found') return 'Chat ID پیدا نشد';
  if (k === 'proxy error') return 'مشکل اتصال یا پراکسی';
  if (k === 'other') return 'خطای نامشخص';
  return '—';
};

const toIsoDate = (d: string, endOfDay = false) => {
  const s = String(d || '').trim();
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(`${s}${endOfDay ? 'T23:59:59' : 'T00:00:00'}`).toISOString();
  if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(s)) {
    const jm = moment(s, 'jYYYY/jMM/jDD', true);
    if (jm.isValid()) {
      const g = jm.locale('en').format('YYYY-MM-DD');
      return new Date(`${g}${endOfDay ? 'T23:59:59' : 'T00:00:00'}`).toISOString();
    }
  }
  const dd = new Date(s);
  if (!Number.isNaN(dd.getTime())) {
    if (endOfDay) dd.setHours(23, 59, 59, 0);
    else dd.setHours(0, 0, 0, 0);
    return dd.toISOString();
  }
  return '';
};

const safeMessage = (value: unknown, fallback: string) => {
  const msg = String(value || '').trim();
  if (!msg) return fallback;
  return msg
    .replace(/عملیات ناموفق بود/g, 'عملیات انجام نشد')
    .replace(/خطا در/g, 'خطا در')
    .replace(/Retry/g, 'ارسال مجدد');
};

export default function TelegramInboxOutboxPage() {
  const [tab, setTab] = useState<TabKey>('outbox');
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [status, setStatus] = useState('ALL');
  const [type, setType] = useState('ALL');
  const [support, setSupport] = useState('ALL');
  const [customerId, setCustomerId] = useState('');
  const [outbox, setOutbox] = useState<TelegramOutboxItem[]>([]);
  const [inbox, setInbox] = useState<TelegramInboxItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);

  const [allCustomers, setAllCustomers] = useState<any[]>([]);
  const [linkUI, setLinkUI] = useState<{ open: boolean; chatId: string; fromId: string }>({ open: false, chatId: '', fromId: '' });
  const [customerSearch, setCustomerSearch] = useState('');

  const apiJson = async (url: string, options: RequestInit = {}) => {
    const r = await apiFetch(url, options);
    const j = await r.json().catch(() => null);
    if (!r.ok) throw new Error((j && (j.message || j.error)) || `HTTP ${r.status}`);
    return j;
  };

  const fetchOutbox = async () => {
    setIsLoading(true);
    try {
      const url =
        `/api/telegram/outbox/messages?limit=500` +
        `&status=${encodeURIComponent(status)}` +
        `&type=${encodeURIComponent(type)}` +
        `&support=${encodeURIComponent(support)}` +
        `&customerId=${encodeURIComponent(customerId)}` +
        `&from=${encodeURIComponent(toIsoDate(from, false))}` +
        `&to=${encodeURIComponent(toIsoDate(to, true))}` +
        `&q=${encodeURIComponent(q)}`;
      const res = await apiJson(url);
      if (!res?.success) throw new Error(res?.message || 'دریافت صف پیام‌ها ناموفق بود.');
      setOutbox(res.data || []);
    } catch (e: any) {
      toast.error(safeMessage(e?.message, 'دریافت صف پیام‌ها ناموفق بود.'));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInbox = async () => {
    setIsLoading(true);
    try {
      const url =
        `/api/telegram/inbox?limit=500` +
        `&from=${encodeURIComponent(toIsoDate(from, false))}` +
        `&to=${encodeURIComponent(toIsoDate(to, true))}` +
        `&q=${encodeURIComponent(q)}`;
      const res = await apiJson(url);
      if (!res?.success) throw new Error(res?.message || 'دریافت پیام‌های دریافتی ناموفق بود.');
      setInbox(res.data || []);
    } catch (e: any) {
      toast.error(safeMessage(e?.message, 'دریافت پیام‌های دریافتی ناموفق بود.'));
    } finally {
      setIsLoading(false);
    }
  };

  const refresh = async () => {
    if (tab === 'outbox') return fetchOutbox();
    return fetchInbox();
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const ensureCustomersLoaded = async () => {
    if (allCustomers.length) return;
    try {
      const res = await apiJson('/api/customers');
      if (res?.success) setAllCustomers(res.data || []);
    } catch {
      toast.error('فهرست مشتری‌ها دریافت نشد.');
    }
  };

  const linkCustomer = async (targetCustomerId: number, chatId: string, fromId: string) => {
    try {
      const t = toast.loading('در حال اتصال Chat ID...');
      const res = await apiJson('/api/telegram/customers/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: targetCustomerId, chatId, fromId }),
      });
      toast.dismiss(t);
      if (!res?.success) throw new Error(res?.message || 'اتصال Chat ID انجام نشد.');
      toast.success('Chat ID به مشتری متصل شد.');
      setLinkUI({ open: false, chatId: '', fromId: '' });
      setCustomerSearch('');
      fetchInbox();
    } catch (e: any) {
      toast.error(safeMessage(e?.message, 'اتصال Chat ID انجام نشد.'));
    }
  };

  const unlinkCustomer = async (targetCustomerId: number) => {
    try {
      const t = toast.loading('در حال قطع اتصال...');
      const res = await apiJson('/api/telegram/customers/unlink', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: targetCustomerId }),
      });
      toast.dismiss(t);
      if (!res?.success) throw new Error(res?.message || 'قطع اتصال انجام نشد.');
      toast.success('اتصال تلگرام مشتری قطع شد.');
      fetchInbox();
    } catch (e: any) {
      toast.error(safeMessage(e?.message, 'قطع اتصال انجام نشد.'));
    }
  };

  const setOptOut = async (targetCustomerId: number, optedOut: boolean) => {
    try {
      const t = toast.loading('در حال ذخیره وضعیت پیام‌رسانی...');
      const res = await apiJson('/api/telegram/customers/optout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: targetCustomerId, optedOut }),
      });
      toast.dismiss(t);
      if (!res?.success) throw new Error(res?.message || 'ذخیره وضعیت انجام نشد.');
      toast.success(optedOut ? 'دریافت تلگرام برای مشتری غیرفعال شد.' : 'دریافت تلگرام برای مشتری فعال شد.');
      fetchInbox();
    } catch (e: any) {
      toast.error(safeMessage(e?.message, 'ذخیره وضعیت انجام نشد.'));
    }
  };

  const retryOne = async (id: number) => {
    try {
      const t = toast.loading('در حال قراردادن در صف ارسال مجدد...');
      const res = await apiJson(`/api/notifications/outbox/${id}/retry`, { method: 'POST' });
      toast.dismiss(t);
      if (!res?.success) throw new Error(res?.message || 'ارسال مجدد انجام نشد.');
      toast.success('پیام دوباره در صف قرار گرفت.');
      fetchOutbox();
    } catch (e: any) {
      toast.error(safeMessage(e?.message, 'ارسال مجدد انجام نشد.'));
    }
  };

  const sendCheck = async (id: number) => {
    try {
      const t = toast.loading('در حال ارسال پیام بررسی...');
      const res = await apiJson(`/api/telegram/outbox/${id}/send-check`, { method: 'POST' });
      toast.dismiss(t);
      if (!res?.success) throw new Error(res?.message || 'ارسال پیام بررسی انجام نشد.');
      toast.success('پیام بررسی ارسال شد.');
    } catch (e: any) {
      toast.error(safeMessage(e?.message, 'ارسال پیام بررسی انجام نشد.'));
    }
  };

  const markResolved = async (id: number) => {
    try {
      const t = toast.loading('در حال بستن مورد...');
      const res = await apiJson(`/api/telegram/outbox/${id}/mark-resolved`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: '' }),
      });
      toast.dismiss(t);
      if (!res?.success) throw new Error(res?.message || 'ثبت وضعیت بررسی‌شده انجام نشد.');
      toast.success('مورد بررسی‌شده شد.');
      fetchOutbox();
    } catch (e: any) {
      toast.error(safeMessage(e?.message, 'ثبت وضعیت بررسی‌شده انجام نشد.'));
    }
  };

  const retryFailedAll = async () => {
    const failed = outbox.filter((r) => r.status === 'failed' && r.supportStatus !== 'resolved');
    if (!failed.length) return toast('پیام ناموفقِ باز برای ارسال مجدد وجود ندارد.');
    const t = toast.loading(`در حال صف‌بندی ${failed.length.toLocaleString('fa-IR')} پیام...`);
    try {
      for (const r of failed) await apiJson(`/api/notifications/outbox/${r.id}/retry`, { method: 'POST' });
      toast.dismiss(t);
      toast.success('پیام‌های ناموفق دوباره در صف قرار گرفتند.');
      fetchOutbox();
    } catch (e: any) {
      toast.dismiss(t);
      toast.error(safeMessage(e?.message, 'ارسال مجدد گروهی انجام نشد.'));
    }
  };

  const stats = useMemo(() => {
    const failed = outbox.filter((x) => x.status === 'failed' && x.supportStatus !== 'resolved').length;
    const pending = outbox.filter((x) => x.status === 'pending' || x.status === 'processing').length;
    const sent = outbox.filter((x) => x.status === 'done').length;
    const unreadLinks = inbox.filter((x) => !x.customerId).length;
    return [
      { label: 'در صف ارسال', value: pending, icon: 'fa-clock' },
      { label: 'ناموفق باز', value: failed, icon: 'fa-triangle-exclamation' },
      { label: 'ارسال‌شده', value: sent, icon: 'fa-circle-check' },
      { label: 'چت بدون مشتری', value: unreadLinks, icon: 'fa-link-slash' },
    ];
  }, [outbox, inbox]);

  const activeItemsCount = tab === 'outbox' ? outbox.length : inbox.length;

  return (
    <PageKit
      title="مرکز پیام‌رسانی"
      subtitle="صف ارسال، پیام‌های دریافتی، اتصال مشتری و ارسال دستی؛ بدون ساخت بخش تکراری برای قالب‌ها. قالب‌های SMS/Telegram همچنان از تنظیمات مدیریت می‌شوند."
      icon={<i className="fa-solid fa-paper-plane" />}
      query={q}
      onQueryChange={setQ}
      searchPlaceholder="جستجو در مشتری، متن پیام، Chat ID یا خطا…"
      filtersSlot={
        <div className="flex w-full flex-wrap items-center gap-2">
          <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <button type="button" className={`rounded-xl px-3 py-2 text-xs font-black transition ${tab === 'outbox' ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900'}`} onClick={() => setTab('outbox')}>صف ارسال</button>
            <button type="button" className={`rounded-xl px-3 py-2 text-xs font-black transition ${tab === 'inbox' ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900'}`} onClick={() => setTab('inbox')}>پیام‌های دریافتی</button>
          </div>

          <input type="text" value={from} onChange={(e) => setFrom(e.target.value)} className={`${fieldClass} w-[150px]`} placeholder="از تاریخ" title="مثلاً 1404/12/08 یا 2026-03-01" />
          <input type="text" value={to} onChange={(e) => setTo(e.target.value)} className={`${fieldClass} w-[150px]`} placeholder="تا تاریخ" title="مثلاً 1404/12/10 یا 2026-03-03" />

          {tab === 'outbox' ? (
            <>
              <select value={type} onChange={(e) => setType(e.target.value)} className={fieldClass} title="نوع پیام">
                {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={fieldClass} title="وضعیت ارسال">
                {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <select value={support} onChange={(e) => setSupport(e.target.value)} className={fieldClass} title="وضعیت بررسی">
                {SUPPORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <input value={customerId} onChange={(e) => setCustomerId(e.target.value)} className={`${fieldClass} w-[130px]`} placeholder="شناسه مشتری" title="فیلتر بر اساس شناسه مشتری" inputMode="numeric" />
            </>
          ) : null}

          <button type="button" className={ghostButton} onClick={refresh} disabled={isLoading}><i className="fa-solid fa-rotate" /> بروزرسانی</button>
        </div>
      }
      toolbarRight={
        <div className="flex flex-wrap items-center gap-2">
          <a className={ghostButton} href="/#/settings"><i className="fa-solid fa-sliders" /> تنظیم قالب‌ها</a>
          {tab === 'outbox' ? <button type="button" className={ghostButton} onClick={retryFailedAll} disabled={isLoading}><i className="fa-solid fa-arrows-rotate" /> ارسال مجدد ناموفق‌ها</button> : null}
          <button type="button" className={primaryButton} onClick={() => setComposerOpen(true)}><i className="fa-solid fa-pen-to-square" /> پیام جدید</button>
        </div>
      }
      isLoading={isLoading}
      isEmpty={!isLoading && activeItemsCount === 0}
      emptyTitle={tab === 'outbox' ? 'پیامی در صف فعلی نیست' : 'پیام دریافتی ثبت نشده است'}
      emptyDescription={tab === 'outbox' ? 'فیلترها را تغییر دهید یا از دکمه پیام جدید استفاده کنید.' : 'وقتی ربات تلگرام پیام دریافت کند، اینجا برای اتصال به مشتری نمایش داده می‌شود.'}
    >
      <div className="space-y-4" dir="rtl">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-[24px] border border-slate-200/80 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-black text-slate-500 dark:text-slate-400">{s.label}</div>
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200"><i className={`fa-solid ${s.icon}`} /></span>
              </div>
              <div className="mt-3 text-2xl font-black tracking-[-0.03em] text-slate-950 dark:text-white">{s.value.toLocaleString('fa-IR')}</div>
            </div>
          ))}
        </div>

        {tab === 'outbox' ? (
          <div className="space-y-3">
            {outbox.map((r) => {
              const sb = statusBadge(r);
              const resolved = String(r.supportStatus || '') === 'resolved';
              return (
                <article key={r.id} className={cardClass}>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-black text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">#{r.id.toLocaleString('fa-IR')}</span>
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-black ${sb.cls}`}>{sb.label}</span>
                        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-black text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">{typeBadge(r.messageType)}</span>
                        {resolved ? <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">بررسی‌شده</span> : null}
                      </div>
                      <div className="mt-3 whitespace-pre-wrap break-words rounded-[22px] border border-slate-200 bg-slate-50/80 p-3 text-sm font-semibold leading-7 text-slate-800 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-100">{r.text || '—'}</div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                      <button type="button" className={ghostButton} onClick={() => sendCheck(r.id)} disabled={isLoading}>پیام بررسی</button>
                      {(r.status === 'failed' || r.status === 'pending') ? <button type="button" className={ghostButton} onClick={() => retryOne(r.id)} disabled={isLoading}>ارسال مجدد</button> : null}
                      {!resolved ? <button type="button" className={primaryButton} onClick={() => markResolved(r.id)} disabled={isLoading}>بررسی شد</button> : null}
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 lg:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                      <div className="text-[11px] font-black text-slate-500 dark:text-slate-400">گیرنده</div>
                      <div className="mt-1 text-sm font-black text-slate-950 dark:text-white">{r.customerName || '—'}</div>
                      <div className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400" dir="ltr">{r.customerPhone || '—'} {r.customerId ? ` • ID ${r.customerId}` : ''}</div>
                      <div className="mt-1 truncate text-xs font-bold text-slate-500 dark:text-slate-400" dir="ltr">Chat ID: {r.chatId || '—'}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                      <div className="text-[11px] font-black text-slate-500 dark:text-slate-400">زمان‌بندی</div>
                      <div className="mt-1 space-y-1 text-xs font-bold leading-5 text-slate-600 dark:text-slate-300">
                        <div>ساخت: {toFaDT(r.createdAt)}</div>
                        <div>تلاش بعدی: {toFaDT(r.nextAttemptAt)}</div>
                        <div>تعداد تلاش: {Number(r.attempts || 0).toLocaleString('fa-IR')} / {Number(r.maxAttempts || 0).toLocaleString('fa-IR')}</div>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                      <div className="text-[11px] font-black text-slate-500 dark:text-slate-400">عیب‌یابی</div>
                      <div className="mt-1 text-sm font-black text-slate-900 dark:text-white">{errorReasonFa(r.errorKind)}</div>
                      <div className="mt-1 line-clamp-2 text-xs font-bold leading-5 text-slate-500 dark:text-slate-400" title={r.error || ''}>{r.error || 'خطایی ثبت نشده است.'}</div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {inbox.map((m) => {
              const isLinked = !!m.customerId;
              const optedOut = Number(m.telegramOptedOut || 0) === 1;
              return (
                <article key={m.id} className={cardClass}>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-black text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">#{m.id.toLocaleString('fa-IR')}</span>
                        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-black text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">{String(m.kind || 'message')}</span>
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{toFaDT(m.createdAt)}</span>
                        {isLinked ? <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">متصل به {m.customerName || `مشتری ${m.customerId}`}</span> : <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">بدون مشتری</span>}
                        {isLinked && optedOut ? <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-black text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">غیرفعال</span> : null}
                      </div>
                      <div className="mt-2 text-xs font-bold text-slate-500 dark:text-slate-400" dir="ltr">Chat: {m.chatId || '—'} • From: {m.fromId || '—'} {m.customerPhone ? ` • ${m.customerPhone}` : ''}</div>
                      <div className="mt-3 whitespace-pre-wrap break-words rounded-[22px] border border-slate-200 bg-slate-50/80 p-3 text-sm font-semibold leading-7 text-slate-800 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-100">{m.text || '—'}</div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                      {isLinked ? (
                        <>
                          <a className={ghostButton} href={`/#/customers/${m.customerId}`}>پروفایل مشتری</a>
                          <button type="button" className={ghostButton} onClick={() => setOptOut(Number(m.customerId), !optedOut)} disabled={isLoading}>{optedOut ? 'فعال‌سازی پیام' : 'غیرفعال‌سازی پیام'}</button>
                          <button type="button" className={ghostButton} onClick={() => unlinkCustomer(Number(m.customerId))} disabled={isLoading}>قطع اتصال</button>
                        </>
                      ) : (
                        <button type="button" className={primaryButton} onClick={async () => { await ensureCustomersLoaded(); setLinkUI({ open: true, chatId: String(m.chatId || ''), fromId: String(m.fromId || '') }); }} disabled={isLoading}>اتصال به مشتری</button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {linkUI.open ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" onClick={() => setLinkUI({ open: false, chatId: '', fromId: '' })}>
          <div className="w-full max-w-2xl rounded-[28px] border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-950" onClick={(e) => e.stopPropagation()} dir="rtl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-black tracking-[-0.02em] text-slate-950 dark:text-white">اتصال Chat ID به مشتری</div>
                <div className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400" dir="ltr">Chat ID: {linkUI.chatId || '—'} • From: {linkUI.fromId || '—'}</div>
              </div>
              <button type="button" className={ghostButton} onClick={() => setLinkUI({ open: false, chatId: '', fromId: '' })}>بستن</button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <input value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} className={`${fieldClass} min-w-[220px] flex-1`} placeholder="جستجو بر اساس نام، شماره یا شناسه" />
              <div className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-500 dark:bg-slate-900 dark:text-slate-300">{allCustomers.length ? `${allCustomers.length.toLocaleString('fa-IR')} مشتری` : 'بدون داده'}</div>
            </div>

            <div className="mt-4 max-h-[55vh] overflow-auto rounded-[22px] border border-slate-200 dark:border-slate-800">
              {(allCustomers || [])
                .filter((c) => {
                  const s = customerSearch.trim().toLowerCase();
                  if (!s) return true;
                  const hay = [c.id, c.fullName, c.phoneNumber].filter(Boolean).join(' ').toLowerCase();
                  return hay.includes(s);
                })
                .slice(0, 80)
                .map((c) => (
                  <button key={c.id} type="button" className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 text-right transition last:border-b-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900" onClick={() => linkCustomer(Number(c.id), linkUI.chatId, linkUI.fromId)}>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black text-slate-900 dark:text-white">{c.fullName || `مشتری #${c.id}`}</span>
                      <span className="mt-1 block text-xs font-bold text-slate-500 dark:text-slate-400" dir="ltr">{c.phoneNumber || '—'} • ID {c.id}</span>
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600 dark:bg-slate-900 dark:text-slate-300">اتصال</span>
                  </button>
                ))}
            </div>

            <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-xs font-bold leading-6 text-slate-500 dark:bg-slate-900 dark:text-slate-400">اگر این Chat ID قبلاً به مشتری دیگری وصل شده باشد، سرور آن را به‌صورت یک‌به‌یک جابه‌جا می‌کند.</div>
          </div>
        </div>
      ) : null}

      <MessageComposerModal open={composerOpen} onClose={() => setComposerOpen(false)} onQueued={() => { setComposerOpen(false); fetchOutbox(); }} initialChannels={{ sms: true, telegram: false }} />
    </PageKit>
  );
}
