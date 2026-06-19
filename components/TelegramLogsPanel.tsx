import React, { useEffect, useMemo, useState } from 'react';
import Modal from './Modal';
import Button from './Button';
import { CheckCircle2, MoreHorizontal, RefreshCw, Search, X } from './lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { humanizeTelegramError } from '../utils/telegramErrorMessage';
import { formatIranDateTime } from '../utils/iranDateTime';

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
  HEALTH_CHECK: 'تست سلامت اتصال',
  TEST_MESSAGE: 'پیام تستی',
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

const safeJsonParse = (s?: string): unknown => {
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
};

const formatDebugValue = (value?: string) => {
  const parsed = safeJsonParse(value);
  if (parsed === null || parsed === undefined || parsed === '') return '—';
  if (typeof parsed === 'string') return parsed;
  return JSON.stringify(parsed, null, 2);
};

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

const TELEGRAM_LOGS_PAGE_SIZE = 5;

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
  INSTALLMENT_COMPLETED: 'telegram_installment_payment_received_message',
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
    const targetId = fix.targetId || (fix.templateKey ? `tg-item-${fix.templateKey}` : 'telegram_bot_token');
    const el = document.getElementById(targetId) as (HTMLElement | null);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    try { (el as HTMLInputElement).focus?.(); } catch {}
    el.classList.add('tg-quick-fix-spotlight');
    window.setTimeout(() => el.classList.remove('tg-quick-fix-spotlight'), 1800);
  }, 140);
};

const TelegramLogsPanel: React.FC = () => {
  const { token } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [rows, setRows] = useState<TgLog[]>([]);
  const [successFilter, setSuccessFilter] = useState<SuccessFilter>('ALL');
  const [eventType, setEventType] = useState<string>('ALL');
  const [recipient, setRecipient] = useState<string>('');
  const [selected, setSelected] = useState<TgLog | null>(null);

  useEffect(() => {
    document.body.classList.toggle('tg-log-modal-open', Boolean(selected));
    return () => document.body.classList.remove('tg-log-modal-open');
  }, [selected]);
  const [retryingIds, setRetryingIds] = useState<Set<number>>(() => new Set());
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);
  const [page, setPage] = useState(1);
  const [expandedFixIds, setExpandedFixIds] = useState<Set<number>>(() => new Set());

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    p.set('limit', '50');
    if (successFilter !== 'ALL') p.set('success', successFilter);
    if (eventType && eventType !== 'ALL') p.set('eventType', eventType);
    if (recipient.trim()) p.set('recipient', recipient.trim());
    return p.toString();
  }, [successFilter, eventType, recipient]);

  const stats = useMemo(() => {
    const total = rows.length;
    const successful = rows.filter((row) => Number(row.success) === 1).length;
    const failed = total - successful;
    const durations = rows.map((row) => Number(row.durationMs)).filter((n) => Number.isFinite(n) && n > 0);
    const avgDuration = durations.length ? Math.round(durations.reduce((sum, n) => sum + n, 0) / durations.length) : 0;
    return { total, successful, failed, avgDuration };
  }, [rows]);

  const pagination = useMemo(() => {
    const totalRows = rows.length;
    const totalPages = Math.max(1, Math.ceil(totalRows / TELEGRAM_LOGS_PAGE_SIZE));
    const safePage = Math.min(Math.max(page, 1), totalPages);
    const startIndex = (safePage - 1) * TELEGRAM_LOGS_PAGE_SIZE;
    const endIndex = startIndex + TELEGRAM_LOGS_PAGE_SIZE;
    return {
      totalRows,
      totalPages,
      safePage,
      startIndex,
      endIndex: Math.min(endIndex, totalRows),
      visibleRows: rows.slice(startIndex, endIndex),
    };
  }, [page, rows]);

  const toggleFixExpansion = (id: number) => {
    setExpandedFixIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const load = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/telegram/logs?${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success) {
        setRows(Array.isArray(data.data) ? data.data : []);
        setToast(null);
      } else {
        setToast({ ok: false, msg: data?.message || 'دریافت لاگ‌های تلگرام با خطا روبه‌رو شد.' });
      }
    } catch (e: any) {
      setToast({ ok: false, msg: e?.message || 'ارتباط با سرور برای دریافت لاگ‌های تلگرام برقرار نشد.' });
    } finally {
      setIsLoading(false);
    }
  };


  const retryLog = async (row: TgLog) => {
    if (!token || !row?.id) return;
    setRetryingIds((prev) => {
      const next = new Set(prev);
      next.add(row.id);
      return next;
    });
    try {
      const res = await fetch(`/api/telegram/logs/${row.id}/retry`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
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
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qs, token]);

  useEffect(() => {
    if (page !== pagination.safePage) setPage(pagination.safePage);
  }, [page, pagination.safePage]);

  return (
    <section className="tg-logs-apple ops-logs-panel telegram-logs-panel" data-ui-ops-panel="telegram-logs" data-ui-ops-surface="logs" dir="rtl">
      <div className="tg-logs-apple__head">
        <div className="tg-logs-apple__identity">
          <span className="tg-logs-apple__icon" aria-hidden="true">
            <MoreHorizontal size={18} />
          </span>
          <div>
            <h3>لاگ‌های ارسال تلگرام</h3>
            <p>ردیابی ارسال‌ها، خطاها، زمان پاسخ و مقصد پیام‌ها برای عیب‌یابی سریع ربات.</p>
          </div>
        </div>
        <Button
          type="button"
          onClick={load}
          variant="secondary"
          size="sm"
          loading={isLoading}
          loadingText="در حال به‌روزرسانی..."
          className="tg-logs-apple__refresh"
          leftIcon={!isLoading ? <RefreshCw size={14} /> : undefined}
        >
          به‌روزرسانی
        </Button>
      </div>

      <div className="tg-logs-apple__stats" aria-label="خلاصه لاگ‌های تلگرام">
        <div className="tg-logs-apple__stat ops-metric-card">
          <div className="tg-logs-apple__statHead">
            <span className="tg-logs-apple__statIcon" aria-hidden="true"><i className="fa-solid fa-list-check" /></span>
            <span>کل لاگ‌ها</span>
          </div>
          <strong>{stats.total.toLocaleString('fa-IR')}</strong>
        </div>
        <div className="tg-logs-apple__stat tg-logs-apple__stat--success">
          <div className="tg-logs-apple__statHead">
            <span className="tg-logs-apple__statIcon" aria-hidden="true"><CheckCircle2 size={15} /></span>
            <span>موفق</span>
          </div>
          <strong>{stats.successful.toLocaleString('fa-IR')}</strong>
        </div>
        <div className="tg-logs-apple__stat tg-logs-apple__stat--danger">
          <div className="tg-logs-apple__statHead">
            <span className="tg-logs-apple__statIcon" aria-hidden="true"><i className="fa-solid fa-triangle-exclamation" /></span>
            <span>ناموفق</span>
          </div>
          <strong>{stats.failed.toLocaleString('fa-IR')}</strong>
        </div>
        <div className="tg-logs-apple__stat ops-metric-card">
          <div className="tg-logs-apple__statHead">
            <span className="tg-logs-apple__statIcon" aria-hidden="true"><i className="fa-solid fa-clock" /></span>
            <span>میانگین پاسخ</span>
          </div>
          <strong dir="ltr">{stats.avgDuration ? `${stats.avgDuration}ms` : '—'}</strong>
        </div>
      </div>

      <div className="tg-logs-apple__filters ops-filter-panel" data-ui-ops-filters="true">
        <label className="tg-logs-apple__field">
          <span>وضعیت ارسال</span>
          <select value={successFilter} onChange={(e) => setSuccessFilter(e.target.value as SuccessFilter)}>
            <option value="ALL">همه وضعیت‌ها</option>
            <option value="true">فقط موفق‌ها</option>
            <option value="false">فقط ناموفق‌ها</option>
          </select>
        </label>
        <label className="tg-logs-apple__field">
          <span>نوع رویداد</span>
          <select value={eventType} onChange={(e) => setEventType(e.target.value)}>
            {EVENT_OPTIONS.map((x) => (
              <option key={x} value={x}>{resolveEventLabel(x)}</option>
            ))}
          </select>
        </label>
        <label className="tg-logs-apple__field tg-logs-apple__field--search">
          <span>جستجوی گیرنده</span>
          <div className="tg-logs-apple__searchbox" dir="ltr">
            <Search size={15} />
            <input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="chat_id یا telegram:getMe"
              dir="ltr"
            />
          </div>
        </label>
      </div>

      {toast ? (
        <div className={`tg-logs-apple__alert ${toast.ok ? 'tg-logs-apple__alert--success' : 'tg-logs-apple__alert--danger'}`}>
          <span>{toast.ok ? <CheckCircle2 size={16} /> : <X size={16} />}</span>
          <div>
            <strong>{toast.ok ? 'عملیات انجام شد' : 'مشکل در دریافت لاگ‌ها'}</strong>
            <p>{toast.msg}</p>
          </div>
        </div>
      ) : null}

      <div className="tg-logs-apple__tableWrap">
        <table className="tg-logs-apple__table">
          <thead>
            <tr>
              <th className="tg-logs-apple__thDate">تاریخ</th>
              <th className="tg-logs-apple__thEvent">رویداد / قالب</th>
              <th className="tg-logs-apple__thRecipient">گیرنده</th>
              <th className="tg-logs-apple__thStatus">وضعیت / پاسخ</th>
              <th className="tg-logs-apple__thActions">عملیات</th>
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
                  <td className="tg-logs-apple__date">{formatDate(r.createdAt)}</td>
                  <td>
                    <div className="tg-logs-apple__event">
                      <strong>{resolveEventLabel(r.eventType)}</strong>
                      <span dir="ltr">{r.eventType || '—'} · {r.patternId || r.provider || '—'}</span>
                    </div>
                  </td>
                  <td>
                    <span className="tg-logs-apple__code" dir="ltr">{r.recipient || '—'}</span>
                  </td>
                  <td>
                    <div className="tg-logs-apple__statusCell">
                      <span className={`tg-logs-apple__badge ${ok ? 'tg-logs-apple__badge--success' : 'tg-logs-apple__badge--danger'}`}>
                        {ok ? <CheckCircle2 size={13} /> : <X size={13} />}
                        {resolveStatusText(r.success)}
                      </span>
                      <span className="tg-logs-apple__muted" dir="ltr">
                        {formatHttpDuration(r)}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="tg-logs-apple__actions">
                      {!ok && quickFix ? (
                        <Button
                          type="button"
                          onClick={() => toggleFixExpansion(r.id)}
                          variant="warning"
                          size="xs"
                          className="tg-logs-apple__quickFixBtn"
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
                          className="tg-logs-apple__retryBtn ops-retry-button"
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
                        className="tg-logs-apple__detailsBtn"
                        leftIcon={<MoreHorizontal size={13} />}
                      >
                        جزئیات
                      </Button>
                    </div>
                  </td>
                </tr>
                {!ok && quickFix && isFixExpanded ? (
                  <tr className="tg-logs-apple__fixRow">
                    <td colSpan={5}>
                      <div className="tg-logs-apple__inlineFix ops-inline-fix">
                        <div className="tg-logs-apple__inlineFixIcon" aria-hidden="true">
                          <i className={quickFix.iconClass} />
                        </div>
                        <div className="tg-logs-apple__inlineFixBody">
                          <span>راهکار پیشنهادی</span>
                          <strong>{humanError?.title || 'خطای ارسال تلگرام'}</strong>
                          <p>{humanError?.action || quickFix.hint}</p>
                          <small>{quickFix.hint}</small>
                        </div>
                        <div className="tg-logs-apple__inlineFixActions">
                          <Button
                            type="button"
                            variant="warning"
                            size="xs"
                            className="tg-logs-apple__modalQuickFix"
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
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="tg-logs-apple__empty">
                    <span><Search size={20} /></span>
                    <strong>لاگی برای این فیلتر پیدا نشد</strong>
                    <p>فیلترها را تغییر بده یا بعد از ارسال پیام تستی، دوباره به‌روزرسانی کن.</p>
                  </div>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {pagination.totalRows > 0 ? (
        <div className="tg-logs-apple__pagination" aria-label="صفحه‌بندی لاگ‌های تلگرام">
          <div className="tg-logs-apple__pageSummary">
            نمایش
            <strong>{(pagination.startIndex + 1).toLocaleString('fa-IR')}</strong>
            تا
            <strong>{pagination.endIndex.toLocaleString('fa-IR')}</strong>
            از
            <strong>{pagination.totalRows.toLocaleString('fa-IR')}</strong>
            لاگ
          </div>
          <div className="tg-logs-apple__pageActions">
            <Button
              type="button"
              variant="secondary"
              size="xs"
              disabled={pagination.safePage <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              قبلی
            </Button>
            <span className="tg-logs-apple__pageBadge">
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
        title={`جزئیات لاگ تلگرام #${selected?.id ?? ''}`}
        widthClass="max-w-4xl"
        wrapperClassName="tg-logs-detail-modal-overlay"
        variant="expansive"
      >
        {selected ? (
          <div className="tg-logs-apple__modal" dir="rtl">
            <div className="tg-logs-apple__modalGrid">
              <div className="tg-logs-apple__detailCard">
                <span className="tg-logs-apple__detailIcon" aria-hidden="true"><i className="fa-regular fa-clock" /></span>
                <div>
                  <span>تاریخ</span>
                  <strong>{formatDate(selected.createdAt)}</strong>
                </div>
              </div>
              <div className="tg-logs-apple__detailCard">
                <span className="tg-logs-apple__detailIcon" aria-hidden="true"><i className="fa-solid fa-fingerprint" /></span>
                <div>
                  <span>شناسه پیگیری</span>
                  <strong dir="ltr">{resolveTrackingId(selected)}</strong>
                </div>
              </div>
              <div className="tg-logs-apple__detailCard">
                <span className="tg-logs-apple__detailIcon" aria-hidden="true"><RefreshCw size={14} /></span>
                <div>
                  <span>HTTP / Duration</span>
                  <strong dir="ltr">{formatHttpDuration(selected)}</strong>
                </div>
              </div>
              <div className="tg-logs-apple__detailCard">
                <span className="tg-logs-apple__detailIcon" aria-hidden="true"><Search size={14} /></span>
                <div>
                  <span>گیرنده</span>
                  <strong dir="ltr">{selected.recipient || '—'}</strong>
                </div>
              </div>
            </div>

            {selected.error || selected.errorText || selected.rawResponseText || selected.responseJson ? (() => {
              const humanError = humanizeTelegramError(selected.error || selected.errorText || selected.rawResponseText || selected.responseJson);
              const fix = getTelegramQuickFix(selected);
              return (
                <div className="tg-logs-apple__modalError ops-modal-error">
                  <div className="tg-logs-apple__errorGrid">
                    <div className="tg-logs-apple__errorHero">
                      <span className="tg-logs-apple__errorIcon"><X size={16} /></span>
                      <div>
                        <strong>{humanError.title}</strong>
                        <p>{humanError.message}</p>
                      </div>
                    </div>
                    <div className="tg-logs-apple__guidance">
                      <span>راهکار پیشنهادی</span>
                      <p>{humanError.action}</p>
                    </div>
                    <details className="tg-logs-apple__technicalError">
                      <summary>نمایش جزئیات فنی</summary>
                      <pre dir="ltr">{humanError.technical}</pre>
                    </details>
                    <div className="tg-logs-apple__fixCoach">
                      <div>
                        <strong>مسیر پیشنهادی رفع خطا</strong>
                        <p>{fix.hint}</p>
                      </div>
                      <Button
                        type="button"
                        variant="warning"
                        size="sm"
                        className="tg-logs-apple__modalQuickFix"
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

            <div className="tg-logs-apple__debugGrid">
              <div className="tg-logs-apple__debugBox">
                <strong>Request</strong>
                <pre dir="ltr">{formatDebugValue(selected.requestJson)}</pre>
              </div>
              <div className="tg-logs-apple__debugBox">
                <strong>Tokens / Text</strong>
                <pre dir="ltr">{formatDebugValue(selected.tokensJson)}</pre>
              </div>
              <div className="tg-logs-apple__debugBox">
                <strong>Raw Response</strong>
                <pre dir="ltr">{selected.rawResponseText || '—'}</pre>
              </div>
              <div className="tg-logs-apple__debugBox">
                <strong>Response JSON</strong>
                <pre dir="ltr">{formatDebugValue(selected.responseJson)}</pre>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </section>
  );
};

export default TelegramLogsPanel;
