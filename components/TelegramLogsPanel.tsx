import React, { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Dialog as Modal, IconGlyph, SelectField, Surface, Table, TextField } from '@/components/ui';
import Button from './Button';
import { CheckCircle2, MoreHorizontal, RefreshCw, Search, X } from './lucide-react';
import { humanizeTelegramError } from '../utils/telegramErrorMessage';
import { formatIranDateTime } from '../utils/iranDateTime';
import { apiFetch } from '../utils/apiFetch';
type TgLog = {
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

type SuccessFilter = 'ALL' | 'true' | 'false';

const EVENT_OPTIONS = [
  'ALL',
  'HEALTH_CHECK',
  'TEST_MESSAGE',
  'INSTALLMENT_REMINDER',
  'INSTALLMENT_COMPLETED',
  'INSTALLMENT_DUE_7',
  'INSTALLMENT_DUE_3',
  'INSTALLMENT_DUE_TODAY',
  'CHECK_DUE_7',
  'CHECK_DUE_3',
  'CHECK_DUE_TODAY',
  'REPAIR_RECEIVED',
  'REPAIR_COST_ESTIMATED',
  'REPAIR_READY_FOR_PICKUP',
];

const EVENT_LABELS: Record<string, string> = {
  ALL: 'همه رویدادها',
  HEALTH_CHECK: 'بررسی سلامت اتصال',
  TEST_MESSAGE: 'پیام بررسی',
  INSTALLMENT_REMINDER: 'یادآوری قسط',
  INSTALLMENT_COMPLETED: 'تکمیل قسط',
  INSTALLMENT_DUE_7: 'قسط؛ ۷ روز مانده',
  INSTALLMENT_DUE_3: 'قسط؛ ۳ روز مانده',
  INSTALLMENT_DUE_TODAY: 'قسط؛ سررسید امروز',
  CHECK_DUE_7: 'چک؛ ۷ روز مانده',
  CHECK_DUE_3: 'چک؛ ۳ روز مانده',
  CHECK_DUE_TODAY: 'چک؛ سررسید امروز',
  REPAIR_RECEIVED: 'دریافت تعمیرات',
  REPAIR_COST_ESTIMATED: 'برآورد هزینه تعمیر',
  REPAIR_READY_FOR_PICKUP: 'آماده تحویل تعمیر',
};

const formatDate = (iso: string) => formatIranDateTime(iso, iso || '—');

const resolveEventLabel = (eventType?: string) => {
  if (!eventType) return 'بدون نوع رویداد';
  return EVENT_LABELS[eventType] || eventType;
};

const resolveStatusText = (success: number) => (Number(success) === 1 ? 'ارسال موفق' : 'ناموفق');

const formatDuration = (value?: number | null) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? `${Math.round(n).toLocaleString('fa-IR')} ms` : 'بدون زمان';
};

const resolveTrackingId = (row?: Pick<TgLog, 'id' | 'correlationId'> | null) => {
  if (!row) return '—';
  return row.correlationId || `tg-${String(row.id).padStart(6, '0')}`;
};

const formatHttpDuration = (row?: Pick<TgLog, 'httpStatus' | 'durationMs'> | null) => {
  if (!row) return 'ثبت نشده';
  const status = row.httpStatus ?? 'بدون HTTP';
  return `${status} / ${formatDuration(row.durationMs)}`;
};

const TELEGRAM_LOGS_PAGE_SIZE = 8;

const getTelegramLogGuidance = (message?: string) => humanizeTelegramError(message).action;



type TelegramQuickFix = {
  key: string;
  label: string;
  hint: string;
  iconClass: string;
  targetId?: string;
  templateKey?: string;
};

const EVENT_TEMPLATE_TARGETS: Record<string, string> = {
  INSTALLMENT_REMINDER: 'telegram_installment_due_notice_message',
  INSTALLMENT_COMPLETED: 'telegram_installment_settlement_message',
  INSTALLMENT_PAYMENT_RECEIVED: 'telegram_installment_payment_received_message',
  INSTALLMENT_DUE_7: 'telegram_installment_due_notice_message',
  INSTALLMENT_DUE_3: 'telegram_installment_due_notice_message',
  INSTALLMENT_DUE_TODAY: 'telegram_installment_due_notice_message',
  CHECK_DUE_7: 'telegram_check_failed_message',
  CHECK_DUE_3: 'telegram_check_failed_message',
  CHECK_DUE_TODAY: 'telegram_check_failed_message',
  REPAIR_RECEIVED: 'telegram_repair_received_message',
  REPAIR_COST_ESTIMATED: 'telegram_repair_cost_notice_message',
  REPAIR_READY_FOR_PICKUP: 'telegram_repair_ready_message',
  TEST_MESSAGE: 'telegram_quick_msg',
};

const getTelegramQuickFix = (row?: TgLog | null): TelegramQuickFix => {
  const raw = String(row?.error || row?.errorText || row?.rawResponseText || row?.responseJson || '').trim();
  const lower = raw.toLowerCase();
  if (/timeout|etimedout|abort|econnrefused|proxy|socks|tunneling/i.test(lower)) {
    return {
      key: 'route',
      label: 'رفتن به مسیر اتصال',
      hint: 'پراکسی/مسیر تلگرام را بررسی کن و بعد ارسال مجدد بزن.',
      iconClass: 'fa-solid fa-shuffle',
      targetId: 'telegram_proxy',
    };
  }
  if (/chat not found|bad request|chat_id|chat id|recipient|telegram:getme/i.test(lower)) {
    return {
      key: 'chat',
      label: 'رفتن به مقصد گیرنده',
      hint: 'Chat ID یا اتصال مخاطب را بررسی کن؛ کاربر باید ربات را Start کرده باشد.',
      iconClass: 'fa-solid fa-comments',
      targetId: 'telegram_chat_id',
    };
  }
  if (/bot token|unauthorized|401|not found|username/i.test(lower)) {
    return {
      key: 'bot',
      label: 'رفتن به هویت ربات',
      hint: 'توکن یا نام کاربری ربات را بررسی کن.',
      iconClass: 'fa-solid fa-key',
      targetId: 'telegram_bot_token',
    };
  }
  if (/parse|entity|can't parse|html|markdown/i.test(lower)) {
    const templateKey = EVENT_TEMPLATE_TARGETS[String(row?.eventType || '')] || 'telegram_quick_msg';
    return {
      key: 'template',
      label: 'رفتن به قالب پیام',
      hint: 'فرمت HTML/Markdown یا متن قالب این پیام را ساده و معتبر کن.',
      iconClass: 'fa-solid fa-wand-magic-sparkles',
      targetId: templateKey === 'telegram_quick_msg' ? 'telegram_quick_msg' : undefined,
      templateKey: templateKey === 'telegram_quick_msg' ? undefined : templateKey,
    };
  }
  const templateKey = EVENT_TEMPLATE_TARGETS[String(row?.eventType || '')];
  if (templateKey && templateKey !== 'telegram_quick_msg') {
    return {
      key: 'template-generic',
      label: 'بررسی قالب مرتبط',
      hint: 'قالب مرتبط با این رویداد را باز کن و تنظیمات پیام را بررسی کن.',
      iconClass: 'fa-solid fa-layer-group',
      templateKey,
    };
  }
  return {
    key: 'general',
    label: 'رفتن به تنظیمات تلگرام',
    hint: 'تنظیمات پایه تلگرام را بررسی کن و سپس ارسال مجدد بزن.',
    iconClass: 'fa-brands fa-telegram',
    targetId: 'telegram_bot_token',
  };
};

const dispatchTelegramQuickFix = (fix: TelegramQuickFix) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('kourosh:telegramQuickFix', { detail: fix }));
  window.setTimeout(() => {
    const targetId = fix.targetId || (fix.templateKey ? `telegram-template-item-${fix.templateKey}` : 'telegram_bot_token');
    const el = document.getElementById(targetId) as (HTMLElement | null);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    try { (el as HTMLInputElement).focus?.(); } catch {}
  }, 140);
};

const TelegramLogsPanel: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [rows, setRows] = useState<TgLog[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [stats, setStats] = useState({ total: 0, successful: 0, failed: 0, avgDuration: 0, lastSentAt: null as string | null });
  const [successFilter, setSuccessFilter] = useState<SuccessFilter>('ALL');
  const [eventType, setEventType] = useState<string>('ALL');
  const [recipient, setRecipient] = useState<string>('');
  const deferredRecipient = useDeferredValue(recipient.trim());
  const [selected, setSelected] = useState<TgLog | null>(null);

  const [retryingIds, setRetryingIds] = useState<Set<number>>(() => new Set());
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);
  const [page, setPage] = useState(1);
  const [expandedFixIds, setExpandedFixIds] = useState<Set<number>>(() => new Set());

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    p.set('limit', String(TELEGRAM_LOGS_PAGE_SIZE));
    p.set('offset', String((Math.max(1, page) - 1) * TELEGRAM_LOGS_PAGE_SIZE));
    if (successFilter !== 'ALL') p.set('success', successFilter);
    if (eventType && eventType !== 'ALL') p.set('eventType', eventType);
    if (deferredRecipient) p.set('recipient', deferredRecipient);
    return p.toString();
  }, [deferredRecipient, eventType, page, successFilter]);

  const pagination = useMemo(() => {
    const totalPages = Math.max(1, Math.ceil(totalRows / TELEGRAM_LOGS_PAGE_SIZE));
    const safePage = Math.min(Math.max(page, 1), totalPages);
    const startIndex = totalRows ? (safePage - 1) * TELEGRAM_LOGS_PAGE_SIZE : 0;
    const endIndex = totalRows ? Math.min(startIndex + rows.length, totalRows) : 0;
    return { totalRows, totalPages, safePage, startIndex, endIndex, visibleRows: rows };
  }, [page, rows, totalRows]);

  const toggleFixExpansion = (id: number) => {
    setExpandedFixIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch(`/api/telegram/logs?${qs}`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || 'دریافت گزارش تلگرام با خطا روبه‌رو شد.');
      }
      const payload = data?.data;
      const nextRows = Array.isArray(payload) ? payload : Array.isArray(payload?.rows) ? payload.rows : [];
      const nextTotal = Number(payload?.pagination?.total ?? nextRows.length);
      const nextStats = payload?.stats || {};
      setRows(nextRows);
      setTotalRows(nextTotal);
      setStats({
        total: Number(nextStats.total ?? nextTotal),
        successful: Number(nextStats.successful ?? nextRows.filter((row: TgLog) => Number(row.success) === 1).length),
        failed: Number(nextStats.failed ?? nextRows.filter((row: TgLog) => Number(row.success) !== 1).length),
        avgDuration: Number(nextStats.avgDuration || 0),
        lastSentAt: nextStats.lastSentAt || null,
      });
      setToast(null);
    } catch (error: any) {
      setRows([]);
      setTotalRows(0);
      setStats({ total: 0, successful: 0, failed: 0, avgDuration: 0, lastSentAt: null });
      setToast({ ok: false, msg: error?.message || 'ارتباط با سرور برای دریافت گزارش تلگرام برقرار نشد.' });
    } finally {
      setIsLoading(false);
    }
  }, [qs]);


  const retryLog = async (row: TgLog) => {
    if (!row?.id) return;
    setRetryingIds((prev) => {
      const next = new Set(prev);
      next.add(row.id);
      return next;
    });
    try {
      const res = await apiFetch(`/api/telegram/logs/${row.id}/retry`, {
        method: 'POST',
        body: '{}',
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success) {
        setToast({ ok: true, msg: data?.message || 'ارسال مجدد با موفقیت انجام شد.' });
        await load();
      } else {
        setToast({ ok: false, msg: data?.message || 'ارسال مجدد لاگ تلگرام انجام نشد.' });
      }
    } catch (e: any) {
      setToast({ ok: false, msg: e?.message || 'ارتباط با سرور برای ارسال مجدد برقرار نشد.' });
    } finally {
      setRetryingIds((prev) => {
        const next = new Set(prev);
        next.delete(row.id);
        return next;
      });
    }
  };

  useEffect(() => {
    setPage(1);
    setExpandedFixIds(new Set());
  }, [successFilter, eventType, recipient]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const refreshLogs = () => { void load(); };
    window.addEventListener('kourosh:telegram-log-updated', refreshLogs);
    return () => window.removeEventListener('kourosh:telegram-log-updated', refreshLogs);
  }, [load]);

  useEffect(() => {
    if (page !== pagination.safePage) setPage(pagination.safePage);
  }, [page, pagination.safePage]);

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950" dir="rtl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <IconGlyph size="md" aria-hidden="true">
            <MoreHorizontal size={18} />
          </IconGlyph>
          <div>
            <h3 className="text-base font-black text-slate-950 dark:text-white">لاگ‌های ارسال تلگرام</h3>
            <p className="mt-1 text-xs leading-6 text-slate-600 dark:text-slate-300">گزارش ارسال‌ها، وضعیت پاسخ و مقصد پیام‌ها.{stats.lastSentAt ? ` آخرین رکورد: ${formatDate(stats.lastSentAt)}` : ''}</p>
          </div>
        </div>
        <Button
          type="button"
          onClick={load}
          variant="secondary"
          size="sm"
          loading={isLoading}
          loadingText="در حال به‌روزرسانی..."
          className=""
          leftIcon={!isLoading ? <RefreshCw size={14} /> : undefined}
        >
          به‌روزرسانی
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4" aria-label="خلاصه لاگ‌های تلگرام">
        <Surface surface="glass" variant="subtle" scheme="adaptive" className="rounded-2xl" contentClassName="p-3.5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
            <IconGlyph size="sm" aria-hidden="true"><i className="fa-solid fa-list-check" /></IconGlyph>
            <span>کل لاگ‌ها</span>
          </div>
          <strong className="mt-1 block text-base font-black text-slate-900 dark:text-white">{stats.total.toLocaleString('fa-IR')}</strong>
        </Surface>
        <Surface surface="glass" variant="subtle" scheme="adaptive" className="rounded-2xl" contentClassName="p-3.5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
            <IconGlyph size="sm" tone="success" aria-hidden="true"><CheckCircle2 size={15} /></IconGlyph>
            <span>موفق</span>
          </div>
          <strong className="mt-1 block text-base font-black text-emerald-700 dark:text-emerald-300">{stats.successful.toLocaleString('fa-IR')}</strong>
        </Surface>
        <Surface surface="glass" variant="subtle" scheme="adaptive" className="rounded-2xl" contentClassName="p-3.5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
            <IconGlyph size="sm" tone="danger" aria-hidden="true"><i className="fa-solid fa-triangle-exclamation" /></IconGlyph>
            <span>ناموفق</span>
          </div>
          <strong className="mt-1 block text-base font-black text-rose-700 dark:text-rose-300">{stats.failed.toLocaleString('fa-IR')}</strong>
        </Surface>
        <Surface surface="glass" variant="subtle" scheme="adaptive" className="rounded-2xl" contentClassName="p-3.5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
            <IconGlyph size="sm" aria-hidden="true"><i className="fa-solid fa-clock" /></IconGlyph>
            <span>میانگین پاسخ</span>
          </div>
          <strong className="mt-1 block text-base font-black text-slate-900 dark:text-white" dir="ltr">{stats.avgDuration ? `${stats.avgDuration}ms` : '—'}</strong>
        </Surface>
      </div>

      <Surface surface="glass" variant="subtle" scheme="adaptive" className="rounded-2xl" contentClassName="grid grid-cols-1 gap-3 p-4 lg:grid-cols-3">
        <label className="flex min-w-0 flex-col gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
          <span>وضعیت ارسال</span>
          <SelectField controlOnly unstyled showChevron={false} value={successFilter} onChange={(e) => setSuccessFilter(e.target.value as SuccessFilter)}>
            <option value="ALL">همه وضعیت‌ها</option>
            <option value="true">فقط موفق‌ها</option>
            <option value="false">فقط ناموفق‌ها</option>
          </SelectField>
        </label>
        <label className="flex min-w-0 flex-col gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
          <span>نوع رویداد</span>
          <SelectField controlOnly unstyled showChevron={false} value={eventType} onChange={(e) => setEventType(e.target.value)}>
            {EVENT_OPTIONS.map((x) => (
              <option key={x} value={x}>{resolveEventLabel(x)}</option>
            ))}
          </SelectField>
        </label>
        <label className="flex min-w-0 flex-col gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
          <span>جستجوی گیرنده</span>
          <div className="flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400" dir="ltr">
            <Search size={15} />
            <TextField
              controlOnly
              unstyled
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="شناسه چت یا نام گیرنده"
              dir="ltr"
            />
          </div>
        </label>
      </Surface>

      {toast ? (
        <div className={`flex items-start gap-3 rounded-xl border p-3 text-sm ${toast.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200' : 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-200'}`}>
          <span>{toast.ok ? <CheckCircle2 size={16} /> : <X size={16} />}</span>
          <div>
            <strong>{toast.ok ? 'عملیات انجام شد' : 'مشکل در دریافت لاگ‌ها'}</strong>
            <p>{toast.msg}</p>
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
        <Table className="min-w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="whitespace-nowrap bg-slate-50 px-3 py-2 text-right text-xs font-black text-slate-600 dark:bg-slate-900 dark:text-slate-300">تاریخ</th>
              <th className="whitespace-nowrap bg-slate-50 px-3 py-2 text-right text-xs font-black text-slate-600 dark:bg-slate-900 dark:text-slate-300">رویداد / قالب</th>
              <th className="whitespace-nowrap bg-slate-50 px-3 py-2 text-right text-xs font-black text-slate-600 dark:bg-slate-900 dark:text-slate-300">گیرنده</th>
              <th className="whitespace-nowrap bg-slate-50 px-3 py-2 text-right text-xs font-black text-slate-600 dark:bg-slate-900 dark:text-slate-300">وضعیت / پاسخ</th>
              <th className="whitespace-nowrap bg-slate-50 px-3 py-2 text-right text-xs font-black text-slate-600 dark:bg-slate-900 dark:text-slate-300">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {pagination.visibleRows.map((r) => {
              const ok = Number(r.success) === 1;
              const quickFix = !ok ? getTelegramQuickFix(r) : null;
              const isFixExpanded = expandedFixIds.has(r.id);
              const humanError = !ok ? humanizeTelegramError(r.error || r.errorText || r.rawResponseText || r.responseJson) : null;
              return (
                <React.Fragment key={r.id}>
                <tr>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-600 dark:text-slate-300">{formatDate(r.createdAt)}</td>
                  <td>
                    <div className="min-w-0 px-3 py-2">
                      <strong className="block font-black text-slate-900 dark:text-white">{resolveEventLabel(r.eventType)}</strong>
                      <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{r.patternId || r.provider || '—'}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-flex rounded-lg bg-slate-100 px-2 py-1 text-xs tabular-nums text-slate-700 dark:bg-slate-900 dark:text-slate-200" dir="ltr">{r.recipient || '—'}</span>
                  </td>
                  <td>
                    <div className="flex min-w-0 flex-col items-start gap-1 px-3 py-2">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-black ${ok ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300' : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300'}`}>
                        {ok ? <CheckCircle2 size={13} /> : <X size={13} />}
                        {resolveStatusText(r.success)}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400" dir="ltr">
                        {formatHttpDuration(r)}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="flex flex-wrap items-center gap-1.5 px-3 py-2">
                      {!ok && quickFix ? (
                        <Button
                          type="button"
                          onClick={() => toggleFixExpansion(r.id)}
                          variant="secondary"
                          size="xs"
                          className=""
                          leftIcon={<i className={quickFix.iconClass} />}
                          title={quickFix.hint}
                        >
                          {isFixExpanded ? 'بستن راهکار' : 'راهکار'}
                        </Button>
                      ) : null}
                      {!ok ? (
                        <Button
                          type="button"
                          onClick={() => retryLog(r)}
                          variant="secondary"
                          size="xs"
                          loading={retryingIds.has(r.id)}
                          loadingText="در حال ارسال..."
                          className=""
                          leftIcon={!retryingIds.has(r.id) ? <RefreshCw size={12} /> : undefined}
                        >
                          ارسال مجدد
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        onClick={() => setSelected(r)}
                        variant="ghost"
                        size="xs"
                        className=""
                        leftIcon={<MoreHorizontal size={13} />}
                      >
                        جزئیات
                      </Button>
                    </div>
                  </td>
                </tr>
                {!ok && quickFix && isFixExpanded ? (
                  <tr className="bg-amber-50/60 dark:bg-amber-950/10">
                    <td colSpan={5}>
                      <div className="m-2 grid gap-3 rounded-xl border border-amber-200 bg-white p-3 sm:grid-cols-3 sm:items-center dark:border-amber-900/40 dark:bg-slate-950">
                        <div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" aria-hidden="true">
                          <i className={quickFix.iconClass} />
                        </div>
                        <div className="min-w-0 text-xs leading-6 text-slate-600 dark:text-slate-300">
                          <span>راهکار پیشنهادی</span>
                          <strong>{humanError?.title || 'خطای ارسال تلگرام'}</strong>
                          <p>{humanError?.action || quickFix.hint}</p>
                          <small>{quickFix.hint}</small>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            size="xs"
                            className=""
                            leftIcon={<i className={quickFix.iconClass} />}
                            onClick={() => dispatchTelegramQuickFix(quickFix)}
                          >
                            {quickFix.label}
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            size="xs"
                            loading={retryingIds.has(r.id)}
                            loadingText="در حال ارسال..."
                            leftIcon={!retryingIds.has(r.id) ? <RefreshCw size={12} /> : undefined}
                            onClick={() => retryLog(r)}
                          >
                            ارسال مجدد
                          </Button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : null}
                </React.Fragment>
              );
            })}
            {!isLoading && rows.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center text-slate-500 dark:text-slate-400">
                    <span><Search size={20} /></span>
                    <strong>لاگی برای این فیلتر پیدا نشد</strong>
                    <p>فیلترها را تغییر بده یا بعد از ارسال پیام بررسی، دوباره به‌روزرسانی کن.</p>
                  </div>
                </td>
              </tr>
            ) : null}
          </tbody>
        </Table>
      </div>

      {pagination.totalRows > 0 ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" aria-label="صفحه‌بندی لاگ‌های تلگرام">
          <div className="flex flex-wrap items-center gap-1 text-xs text-slate-600 dark:text-slate-300">
            نمایش
            <strong>{(pagination.totalRows ? pagination.startIndex + 1 : 0).toLocaleString('fa-IR')}</strong>
            تا
            <strong>{pagination.endIndex.toLocaleString('fa-IR')}</strong>
            از
            <strong>{pagination.totalRows.toLocaleString('fa-IR')}</strong>
            لاگ
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="xs"
              disabled={pagination.safePage <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              قبلی
            </Button>
            <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 dark:bg-slate-900 dark:text-slate-200">
              صفحه {pagination.safePage.toLocaleString('fa-IR')} از {pagination.totalPages.toLocaleString('fa-IR')}
            </span>
            <Button
              type="button"
              variant="secondary"
              size="xs"
              disabled={pagination.safePage >= pagination.totalPages}
              onClick={() => setPage((value) => Math.min(pagination.totalPages, value + 1))}
            >
              بعدی
            </Button>
          </div>
        </div>
      ) : null}

      <Modal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title={`جزئیات ارسال تلگرام #${selected?.id ?? ''}`}
        widthClass="max-w-4xl"
        variant="expansive"
      >
        {selected ? (
          <div className="space-y-4" dir="rtl">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-slate-600 dark:bg-slate-950 dark:text-slate-300" aria-hidden="true"><i className="fa-regular fa-clock" /></span>
                <div>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">تاریخ</span>
                  <strong className="mt-0.5 block text-sm font-black text-slate-900 dark:text-white">{formatDate(selected.createdAt)}</strong>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-slate-600 dark:bg-slate-950 dark:text-slate-300" aria-hidden="true"><i className="fa-solid fa-fingerprint" /></span>
                <div>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">شناسه پیگیری</span>
                  <strong className="mt-0.5 block text-sm font-black text-slate-900 dark:text-white" dir="ltr">{resolveTrackingId(selected)}</strong>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-slate-600 dark:bg-slate-950 dark:text-slate-300" aria-hidden="true"><RefreshCw size={14} /></span>
                <div>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">کد پاسخ / مدت زمان</span>
                  <strong className="mt-0.5 block text-sm font-black text-slate-900 dark:text-white" dir="ltr">{formatHttpDuration(selected)}</strong>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-slate-600 dark:bg-slate-950 dark:text-slate-300" aria-hidden="true"><Search size={14} /></span>
                <div>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">گیرنده</span>
                  <strong className="mt-0.5 block text-sm font-black text-slate-900 dark:text-white" dir="ltr">{selected.recipient || '—'}</strong>
                </div>
              </div>
            </div>

            {selected.error || selected.errorText || selected.rawResponseText || selected.responseJson ? (() => {
              const humanError = humanizeTelegramError(selected.error || selected.errorText || selected.rawResponseText || selected.responseJson);
              const fix = getTelegramQuickFix(selected);
              return (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 dark:border-rose-900/40 dark:bg-rose-950/20">
                  <div className="grid gap-3">
                    <div className="flex items-start gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"><X size={16} /></span>
                      <div>
                        <strong>{humanError.title}</strong>
                        <p>{humanError.message}</p>
                      </div>
                    </div>
                    <div className="rounded-xl bg-white p-3 text-sm text-slate-700 dark:bg-slate-950 dark:text-slate-200">
                      <span>راهکار پیشنهادی</span>
                      <p>{humanError.action}</p>
                    </div>
                    <div className="flex flex-col gap-3 rounded-xl bg-white p-3 sm:flex-row sm:items-center sm:justify-between dark:bg-slate-950">
                      <div>
                        <strong>مسیر پیشنهادی رفع خطا</strong>
                        <p>{fix.hint}</p>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className=""
                        leftIcon={<i className={fix.iconClass} />}
                        onClick={() => {
                          dispatchTelegramQuickFix(fix);
                          setSelected(null);
                        }}
                      >
                        {fix.label}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })() : null}

          </div>
        ) : null}
      </Modal>
    </section>
  );
};

export default TelegramLogsPanel;
