// pages/Outbox.tsx
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import MessageComposerModal from '../components/MessageComposerModal';
import ShamsiDatePicker from '../components/ShamsiDatePicker';
import { apiFetch } from '../utils/apiFetch';
import toast from 'react-hot-toast';

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

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'همه وضعیت‌ها' },
  { value: 'pending', label: 'در صف ارسال' },
  { value: 'processing', label: 'در حال ارسال' },
  { value: 'done', label: 'ارسال‌شده' },
  { value: 'failed', label: 'ناموفق' },
];

const TYPE_OPTIONS = [
  { value: 'ALL', label: 'همه انواع' },
  { value: 'installments', label: 'یادآوری اقساط و چک' },
  { value: 'repairs', label: 'تعمیرات و خدمات' },
  { value: 'manual', label: 'پیام دستی' },
  { value: 'reports', label: 'گزارش‌ها' },
  { value: 'other', label: 'سیستمی / سایر' },
];

const SUPPORT_OPTIONS = [
  { value: 'ALL', label: 'همه موارد' },
  { value: 'open', label: 'نیازمند بررسی' },
  { value: 'resolved', label: 'بررسی‌شده' },
];

const CHANNEL_OPTIONS = [
  { value: 'ALL', label: 'همه کانال‌ها' },
  { value: 'telegram', label: 'تلگرام' },
  { value: 'sms', label: 'SMS' },
  { value: 'whatsapp', label: 'واتساپ' },
];

const baseButton = 'inline-flex items-center justify-center gap-2 rounded-2xl text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-45';
const ghostButton = `${baseButton} h-10 border border-slate-200 bg-white px-3 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900`;
const primaryButton = `${baseButton} h-10 border border-blue-600 bg-blue-600 px-4 text-white shadow-[0_16px_34px_-24px_rgba(37,99,235,.75)] hover:-translate-y-0.5 dark:border-blue-500 dark:bg-blue-500`;
const iconButton = `${baseButton} h-10 w-10 border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900`;
const inputClass = 'h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-700 dark:focus:ring-slate-800/60';
const selectClass = 'h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-slate-800/60';
const dateInputClass = 'outbox-date-control';

const cleanMessageText = (value?: string | null) => {
  return String(value || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(b|strong|i|em|span|div|p|small)[^>]*>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&zwnj;/gi, '‌')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const textLine = (value?: string | null, max = 90) => {
  const s = cleanMessageText(value).replace(/\s+/g, ' ').trim();
  return s.length <= max ? s : `${s.slice(0, max)}…`;
};

const sanitizeCustomerName = (value?: string | null) => {
  let normalized = cleanMessageText(value)
    .replace(/&nbsp;/gi, ' ')
    .replace(/[ـ_\-–—]+/g, ' ')
    .replace(/[|]+/g, ' ')
    .replace(/\btelegram[_\s-]*chat\b/gi, ' ')
    .replace(/^[^آ-یA-Za-z]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const persianName = normalized.match(/[آ-ی][آ-ی\s‌]{2,}/)?.[0]?.replace(/\s+/g, ' ').trim();
  if (persianName) normalized = persianName;
  if (!normalized) return '';
  if (/^(بدون\s*نام|نامشخص|مشتری\s*نامشخص|مشتری\s*قابل\s*شناسایی|گیرنده\s*مشخص\s*نشده|unknown|null|undefined)$/i.test(normalized)) return '';
  if (!/[آ-یA-Za-z]/.test(normalized)) return '';
  return normalized;
};

const normalizeNameCandidate = (value?: string | null) => {
  const cleaned = sanitizeCustomerName(value)
    .replace(/[0-9۰-۹٠-٩#*]+/g, ' ')
    .replace(/[ـ_\-–—]{2,}/g, ' ')
    .replace(/\b(شماره|قرارداد|تاریخ|مبلغ|ثبت|اطلاعات|پیام|یادآوری|اقساطی|اقساط|چک|مشتری|سلام|گرامی|نوع|علت|دلیل|ارسال|برای|با|موفقیت|تغییرات|شد|شما|عزیز|پرداخت|تومان|ریال)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return sanitizeCustomerName(cleaned);
};

const inferCustomerName = (row: TelegramOutboxItem) => {
  const direct = sanitizeCustomerName(row.customerName);
  if (direct) return direct;
  const text = cleanMessageText(row.text);
  const patterns = [
    /(?:یادآوری\s+)?(?:چک|قسط)\s+مشتری\s*[:：]?\s*([^،:؛|]+)/,
    /مشتری\s+گرامی\s+([^،:؛|]+)/,
    /👤\s*مشتری\s*[:：]?\s*([^،:؛|]+)/,
    /👤\s*([^،:؛|]+?)(?=\s*(?:شماره|قرارداد|مبلغ|تاریخ|ثبت|با|$))/,
    /مشتری\s*[:：]?\s*([^،:؛|]+)/,
    /نام\s*[:：]?\s*([^،:؛|]+)/,
    /پرداخت\s+توسط\s+([^،:؛|]+)/,
    /فروش\s+اقساطی\s+([^،:؛|]+?)(?=\s+(?:شماره|قرارداد|مبلغ|ثبت|تاریخ|با|$))/,
    /سلام\s+([^،:؛|]+?)(?=\s+(?:عزیز|شماره|قرارداد|مبلغ|ثبت|تاریخ|با|$))/,
    /برای\s+([^،:؛|]+?)(?=\s+(?:عزیز|شماره|قرارداد|مبلغ|ثبت|تاریخ|با|$))/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const candidate = normalizeNameCandidate(match?.[1] || '');
    if (candidate && candidate.length >= 3 && candidate.length <= 50) return candidate;
  }
  return 'گیرنده مشخص نشده';
};

const getInitials = (name?: string | null) => {
  const clean = sanitizeCustomerName(name);
  if (!clean) return '؟';
  return clean.split(/\s+/).slice(0, 2).map((x) => x[0]).join('');
};

const toFaDT = (iso?: string | null) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('fa-IR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch {
    return String(iso);
  }
};

const toFaDate = (d?: Date | null) => {
  if (!d) return '—';
  try { return d.toLocaleDateString('fa-IR'); } catch { return '—'; }
};

const toIsoDate = (date: Date | null, endOfDay = false) => {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  if (endOfDay) d.setHours(23, 59, 59, 999);
  else d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

const isInDateRange = (iso: string | null | undefined, fromDate: Date | null, toDate: Date | null) => {
  if (!iso) return true;
  const current = new Date(iso).getTime();
  if (Number.isNaN(current)) return true;
  if (fromDate) {
    const f = new Date(fromDate); f.setHours(0, 0, 0, 0);
    if (current < f.getTime()) return false;
  }
  if (toDate) {
    const t = new Date(toDate); t.setHours(23, 59, 59, 999);
    if (current > t.getTime()) return false;
  }
  return true;
};

const statusBadge = (r: TelegramOutboxItem) => {
  if (r.status === 'done') return { label: 'ارسال‌شده', icon: 'fa-check', cls: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200', dot: 'bg-emerald-500' };
  if (r.status === 'failed') return { label: 'ناموفق', icon: 'fa-xmark', cls: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200', dot: 'bg-rose-500' };
  if (r.status === 'processing') return { label: 'در حال ارسال', icon: 'fa-spinner', cls: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200', dot: 'bg-blue-500' };
  return { label: r.isRetried ? 'در انتظار' : 'در صف ارسال', icon: 'fa-clock', cls: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200', dot: 'bg-amber-500' };
};

const typeBadge = (t?: string | null, text?: string | null, eventType?: string | null) => {
  const v = String(t || '').toLowerCase();
  const hay = `${cleanMessageText(text)} ${eventType || ''}`.toLowerCase();
  if (v === 'installments' || /قسط|اقساط|چک|installment|check/.test(hay)) return { value: 'installments', label: /چک/.test(hay) ? 'یادآوری چک' : 'یادآوری اقساط', reason: /چک/.test(hay) ? 'برای یادآوری سررسید چک' : 'برای یادآوری پرداخت اقساط', icon: 'fa-bell' };
  if (v === 'repairs' || /repair|service|تعمیر|خدمات/.test(hay)) return { value: 'repairs', label: 'اطلاع‌رسانی خدمات', reason: 'برای اطلاع وضعیت خدمات یا تعمیرات', icon: 'fa-screwdriver-wrench' };
  if (v === 'reports' || /report|گزارش/.test(hay)) return { value: 'reports', label: 'گزارش سیستمی', reason: 'برای ارسال گزارش عملکرد', icon: 'fa-chart-line' };
  if (v === 'manual') return { value: 'manual', label: 'پیام دستی', reason: 'ارسال‌شده توسط کاربر', icon: 'fa-pen' };
  return { value: 'other', label: 'پیام سیستمی', reason: 'برای پیگیری یا اطلاع‌رسانی سیستمی', icon: 'fa-gear' };
};

const channelMeta = (r: TelegramOutboxItem) => {
  const text = `${r.chatId || ''} ${r.eventType || ''} ${r.messageType || ''}`.toLowerCase();
  if (text.includes('sms')) return { value: 'sms', label: 'SMS', icon: 'fa-comment-sms', cls: 'text-blue-600 bg-blue-50 border-blue-100 dark:bg-blue-950/30 dark:border-blue-900/50 dark:text-blue-200' };
  if (text.includes('whatsapp')) return { value: 'whatsapp', label: 'واتساپ', icon: 'fa-brands fa-whatsapp', cls: 'text-emerald-600 bg-emerald-50 border-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-emerald-200' };
  return { value: 'telegram', label: 'تلگرام', icon: 'fa-brands fa-telegram', cls: 'text-sky-600 bg-sky-50 border-sky-100 dark:bg-sky-950/30 dark:border-sky-900/50 dark:text-sky-200' };
};

const inboxKindLabel = (kind?: string | null) => {
  const v = String(kind || '').toLowerCase();
  if (v === 'message') return 'پیام متنی';
  if (v === 'photo') return 'تصویر';
  if (v === 'voice') return 'صوت';
  if (v === 'document') return 'فایل';
  return v || 'پیام';
};

const errorReasonFa = (k?: TelegramOutboxItem['errorKind']) => {
  if (k === 'blocked') return 'کاربر ربات را بلاک کرده';
  if (k === 'chat not found') return 'Chat ID پیدا نشد';
  if (k === 'proxy error') return 'مشکل اتصال یا پراکسی';
  if (k === 'other') return 'خطای نامشخص';
  return 'خطایی ثبت نشده است';
};

const safeMessage = (value: unknown, fallback: string) => {
  const msg = String(value || '').trim();
  return msg || fallback;
};

export default function TelegramInboxOutboxPage() {
  const [tab, setTab] = useState<TabKey>('outbox');
  const [q, setQ] = useState('');
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [status, setStatus] = useState('ALL');
  const [type, setType] = useState('ALL');
  const [support, setSupport] = useState('ALL');
  const [channel, setChannel] = useState('ALL');
  const [outbox, setOutbox] = useState<TelegramOutboxItem[]>([]);
  const [inbox, setInbox] = useState<TelegramInboxItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedOutboxId, setSelectedOutboxId] = useState<number | null>(null);
  const [selectedInboxId, setSelectedInboxId] = useState<number | null>(null);
  const [detailModalTab, setDetailModalTab] = useState<TabKey | null>(null);
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
      const url = `/api/telegram/outbox/messages?limit=500&status=${encodeURIComponent(status)}&type=${encodeURIComponent(type)}&support=${encodeURIComponent(support)}&from=${encodeURIComponent(toIsoDate(fromDate, false))}&to=${encodeURIComponent(toIsoDate(toDate, true))}&q=${encodeURIComponent(q)}`;
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
      const url = `/api/telegram/inbox?limit=500&from=${encodeURIComponent(toIsoDate(fromDate, false))}&to=${encodeURIComponent(toIsoDate(toDate, true))}&q=${encodeURIComponent(q)}`;
      const res = await apiJson(url);
      if (!res?.success) throw new Error(res?.message || 'دریافت پیام‌های دریافتی ناموفق بود.');
      setInbox(res.data || []);
    } catch (e: any) {
      toast.error(safeMessage(e?.message, 'دریافت پیام‌های دریافتی ناموفق بود.'));
    } finally {
      setIsLoading(false);
    }
  };

  const refresh = async () => tab === 'outbox' ? fetchOutbox() : fetchInbox();

  useEffect(() => {
    setPage(1);
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => { setPage(1); }, [q, status, type, support, channel, fromDate, toDate]);

  const ensureCustomersLoaded = async () => {
    if (allCustomers.length) return;
    try {
      const res = await apiJson('/api/customers');
      if (res?.success) setAllCustomers(res.data || []);
    } catch {
      toast.error('فهرست مشتری‌ها دریافت نشد.');
    }
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      if (allCustomers.length) return;
      try {
        const res = await apiJson('/api/customers');
        if (alive && res?.success) setAllCustomers(res.data || []);
      } catch {
        // Silent preload: صفحه پیام‌رسانی نباید به خاطر خطای لیست مشتری‌ها toast اضافی بدهد.
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const normalizePhoneForMatch = (value?: unknown) => String(value || '')
    .replace(/[۰-۹٠-٩]/g, (d) => '۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩'.indexOf(d) % 10 + '')
    .replace(/[^0-9]/g, '')
    .replace(/^0098/, '0')
    .replace(/^98(?=9)/, '0');

  const customerDirectory = useMemo(() => (allCustomers || []).map((c: any) => {
    const id = Number(c?.id ?? c?.customerId ?? c?.personId ?? 0) || null;
    const name = sanitizeCustomerName(c?.fullName || c?.name || c?.displayName || c?.customerName || c?.title);
    const displayPhone = String(c?.phoneNumber || c?.mobile || c?.phone || c?.customerPhone || c?.phone_number || '').trim();
    const phone = normalizePhoneForMatch(displayPhone);
    return { id, name, displayPhone, phone, raw: c };
  }).filter((c: any) => c.id || c.name || c.phone), [allCustomers]);

  const findCustomerForOutbox = (row: TelegramOutboxItem) => {
    const rowId = Number(row.customerId || 0);
    if (rowId) {
      const byId = customerDirectory.find((c: any) => Number(c.id) === rowId);
      if (byId) return byId;
    }
    const rowPhone = normalizePhoneForMatch(row.customerPhone);
    if (rowPhone) {
      const byPhone = customerDirectory.find((c: any) => c.phone && (c.phone === rowPhone || c.phone.endsWith(rowPhone) || rowPhone.endsWith(c.phone)));
      if (byPhone) return byPhone;
    }
    const inferred = sanitizeCustomerName(inferCustomerName(row));
    if (inferred && inferred !== 'گیرنده مشخص نشده') {
      const byName = customerDirectory.find((c: any) => c.name && (c.name === inferred || c.name.includes(inferred) || inferred.includes(c.name)));
      if (byName) return byName;
    }
    return null;
  };

  const outboxCustomerName = (row: TelegramOutboxItem) => sanitizeCustomerName(findCustomerForOutbox(row)?.name) || inferCustomerName(row);
  const outboxCustomerPhone = (row: TelegramOutboxItem) => {
    const direct = String(row.customerPhone || '').trim();
    if (direct) return direct;
    const matched = findCustomerForOutbox(row);
    return matched?.displayPhone || '';
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

  const displayedOutbox = useMemo(() => {
    const search = q.trim().toLowerCase();
    return outbox.filter((r) => {
      const ch = channelMeta(r);
      const tb = typeBadge(r.messageType, r.text, r.eventType);
      if (channel !== 'ALL' && ch.value !== channel) return false;
      if (status !== 'ALL' && String(r.status || '').toLowerCase() !== status) return false;
      if (type !== 'ALL' && tb.value !== type) return false;
      if (support === 'open' && String(r.supportStatus || '') === 'resolved') return false;
      if (support === 'resolved' && String(r.supportStatus || '') !== 'resolved') return false;
      if (!isInDateRange(r.createdAt || r.updatedAt, fromDate, toDate)) return false;
      if (!search) return true;
      const hay = [cleanMessageText(r.text), outboxCustomerName(r), outboxCustomerPhone(r), r.chatId, r.error, r.status, tb.label, tb.reason, ch.label]
        .filter(Boolean).join(' ').toLowerCase();
      return hay.includes(search);
    });
  }, [outbox, channel, status, type, support, fromDate, toDate, q, customerDirectory]);

  const displayedInbox = useMemo(() => {
    const search = q.trim().toLowerCase();
    return inbox.filter((x) => {
      if (support === 'open' && x.customerId) return false;
      if (support === 'resolved' && !x.customerId) return false;
      if (!isInDateRange(x.createdAt, fromDate, toDate)) return false;
      if (!search) return true;
      const hay = [cleanMessageText(x.text), x.customerName, x.customerPhone, x.chatId, x.fromId, x.kind]
        .filter(Boolean).join(' ').toLowerCase();
      return hay.includes(search);
    });
  }, [inbox, support, fromDate, toDate, q]);

  const currentRows = tab === 'outbox' ? displayedOutbox : displayedInbox;
  const totalPages = Math.max(1, Math.ceil(currentRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedRows = currentRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const rangeStart = currentRows.length ? (safePage - 1) * PAGE_SIZE + 1 : 0;
  const rangeEnd = Math.min(safePage * PAGE_SIZE, currentRows.length);

  const selectedOutbox = useMemo(() => {
    if (!displayedOutbox.length) return null;
    return displayedOutbox.find((r) => r.id === selectedOutboxId) || displayedOutbox[0];
  }, [displayedOutbox, selectedOutboxId]);

  const selectedInbox = useMemo(() => {
    if (!displayedInbox.length) return null;
    return displayedInbox.find((r) => r.id === selectedInboxId) || displayedInbox[0];
  }, [displayedInbox, selectedInboxId]);

  useEffect(() => {
    if (tab === 'outbox' && selectedOutbox && selectedOutbox.id !== selectedOutboxId) setSelectedOutboxId(selectedOutbox.id);
    if (tab === 'inbox' && selectedInbox && selectedInbox.id !== selectedInboxId) setSelectedInboxId(selectedInbox.id);
  }, [tab, selectedOutbox, selectedInbox, selectedOutboxId, selectedInboxId]);

  const stats = useMemo(() => {
    const total = displayedOutbox.length;
    const processing = displayedOutbox.filter((x) => x.status === 'processing').length;
    const pending = displayedOutbox.filter((x) => x.status === 'pending' || x.isRetried).length;
    const failed = displayedOutbox.filter((x) => x.status === 'failed' && x.supportStatus !== 'resolved').length;
    const sent = displayedOutbox.filter((x) => x.status === 'done').length;
    return [
      { label: 'کل پیام‌ها', value: total, hint: 'در بازه انتخابی', icon: 'fa-comments', tone: 'blue' },
      { label: 'در صف ارسال', value: pending, hint: 'پیام در صف', icon: 'fa-paper-plane', tone: 'indigo' },
      { label: 'ارسال‌شده', value: sent, hint: `${total ? Math.round((sent / total) * 100) : 0}% موفقیت`, icon: 'fa-check', tone: 'emerald' },
      { label: 'در انتظار', value: processing, hint: 'پیام در حال پردازش', icon: 'fa-clock', tone: 'amber' },
      { label: 'ناموفق', value: failed, hint: 'نیاز به بررسی', icon: 'fa-xmark', tone: 'rose' },
    ];
  }, [displayedOutbox]);

  const filteredCustomers = useMemo(() => {
    const s = customerSearch.trim().toLowerCase();
    return (allCustomers || [])
      .filter((c) => {
        if (!s) return true;
        const hay = [c.id, c.fullName, c.phoneNumber].filter(Boolean).join(' ').toLowerCase();
        return hay.includes(s);
      })
      .slice(0, 80);
  }, [allCustomers, customerSearch]);

  const clearFilters = () => {
    setFromDate(null);
    setToDate(null);
    setStatus('ALL');
    setType('ALL');
    setSupport('ALL');
    setChannel('ALL');
    setQ('');
    setPage(1);
  };

  const renderDateRange = () => (
    <>
      <div className="outbox-date-field min-w-[132px] max-w-full flex-[0_1_140px] space-y-1">
        <span className="block pr-2 text-[10px] font-black text-slate-500 dark:text-slate-400">از تاریخ</span>
        <ShamsiDatePicker selectedDate={fromDate} onDateChange={setFromDate} preview="از تاریخ" inputClassName={dateInputClass} hideIcon />
      </div>
      <div className="outbox-date-field min-w-[132px] max-w-full flex-[0_1_140px] space-y-1">
        <span className="block pr-2 text-[10px] font-black text-slate-500 dark:text-slate-400">تا تاریخ</span>
        <ShamsiDatePicker selectedDate={toDate} onDateChange={setToDate} preview="تا تاریخ" inputClassName={dateInputClass} hideIcon />
      </div>
    </>
  );

  const telegramStatusChip = (
    <span className="inline-flex h-10 items-center gap-2 rounded-2xl border border-emerald-200 bg-white px-3 text-[11px] font-black text-emerald-700 shadow-[0_10px_24px_-22px_rgba(16,185,129,.75)] dark:border-emerald-900/60 dark:bg-slate-950 dark:text-emerald-200">
      <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-300">
        <i className="fa-brands fa-telegram text-[15px]" />
        <span className="absolute -left-0.5 -top-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-950" />
      </span>
      تلگرام متصل
    </span>
  );

  const toneIcon = (tone: string) => {
    if (tone === 'rose') return 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-200';
    if (tone === 'emerald') return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-200';
    if (tone === 'amber') return 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-200';
    if (tone === 'indigo') return 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-200';
    return 'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-200';
  };

  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
    const start = Math.max(1, Math.min(safePage - 2, totalPages - 4));
    return start + i;
  }).filter((p) => p <= totalPages);

  const detailOutbox = selectedOutbox;
  const detailInbox = selectedInbox;

  return (
    <main className="space-y-4 px-3 pb-8 pt-4 sm:px-5" dir="rtl">
      <section className="rounded-[30px] border border-slate-200/80 bg-white/95 shadow-[0_24px_70px_-52px_rgba(15,23,42,.32)] dark:border-slate-800 dark:bg-slate-950/90">
        <div className="flex flex-col gap-4 border-b border-slate-200/80 px-5 py-4 lg:flex-row lg:items-center lg:justify-between dark:border-slate-800">
          <div className="flex items-center gap-3">
            <span className="flex h-14 w-14 items-center justify-center rounded-[22px] bg-blue-50 text-2xl text-blue-600 dark:bg-blue-950/40 dark:text-blue-200">
              <i className="fa-solid fa-paper-plane" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-black tracking-[-0.03em] text-slate-950 dark:text-white">مرکز پیام‌رسانی</h1>
                {telegramStatusChip}
              </div>
              <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">مدیریت صف ارسال، پیام‌های دریافتی و جزئیات کامل هر پیام در یک نمای عملیاتی.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={ghostButton} onClick={refresh} disabled={isLoading}><i className="fa-solid fa-rotate text-slate-500" /> بروزرسانی</button>
            <button type="button" className={ghostButton} onClick={retryFailedAll} disabled={isLoading || tab !== 'outbox'}><i className="fa-solid fa-arrows-rotate text-blue-500" /> ارسال مجدد ناموفق‌ها</button>
            <button type="button" className={primaryButton} onClick={() => setComposerOpen(true)}><i className="fa-solid fa-plus text-white" /> پیام جدید</button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 px-5 py-3">
          <button type="button" onClick={() => { setTab('outbox'); setPage(1); }} className={`inline-flex h-10 items-center gap-2 rounded-2xl border px-4 text-xs font-black transition ${tab === 'outbox' ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300'}`}>
            <i className="fa-solid fa-paper-plane" /> صف ارسال
          </button>
          <button type="button" onClick={() => { setTab('inbox'); setPage(1); }} className={`inline-flex h-10 items-center gap-2 rounded-2xl border px-4 text-xs font-black transition ${tab === 'inbox' ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300'}`}>
            <i className="fa-solid fa-inbox" /> پیام‌های دریافتی
          </button>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-[24px] border border-slate-200/80 bg-white/95 p-4 shadow-[0_18px_46px_-38px_rgba(15,23,42,.24)] dark:border-slate-800 dark:bg-slate-950/90">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-black text-slate-500 dark:text-slate-400">{s.label}</div>
                <div className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950 dark:text-white">{s.value.toLocaleString('fa-IR')}</div>
              </div>
              <span className={`flex h-14 w-14 items-center justify-center rounded-full text-xl ${toneIcon(s.tone)}`}><i className={`fa-solid ${s.icon}`} /></span>
            </div>
            <div className="mt-2 text-xs font-bold text-slate-500 dark:text-slate-400">{s.hint}</div>
          </div>
        ))}
      </section>

      <section className="rounded-[28px] border border-slate-200/80 bg-white/95 p-4 shadow-[0_20px_56px_-44px_rgba(15,23,42,.28)] dark:border-slate-800 dark:bg-slate-950/90">
        <div className="outbox-filter-row flex flex-wrap items-end gap-3">
          <label className="relative block min-w-[240px] flex-[1_1_300px]">
            <i className="fa-solid fa-magnifying-glass pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} className={`${inputClass} w-full pr-11`} placeholder="جستجو در نام مشتری یا عنوان پیام…" />
          </label>
          <select value={type} onChange={(e) => setType(e.target.value)} className={`${selectClass} w-[140px] max-w-full flex-[0_1_140px]`}>{TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${selectClass} w-[140px] max-w-full flex-[0_1_140px]`}>{STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
          <select value={channel} onChange={(e) => setChannel(e.target.value)} className={`${selectClass} w-[140px] max-w-full flex-[0_1_140px]`}>{CHANNEL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
          <select value={support} onChange={(e) => setSupport(e.target.value)} className={`${selectClass} w-[140px] max-w-full flex-[0_1_140px]`}>{SUPPORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
          {renderDateRange()}
          <button type="button" className={`${ghostButton} flex-[0_0_auto]`} onClick={clearFilters}><i className="fa-solid fa-filter-circle-xmark text-blue-500" /> پاکسازی</button>
        </div>
        <div className="mt-3 text-[11px] font-bold text-slate-500 dark:text-slate-400">بازه انتخابی: {toFaDate(fromDate)} تا {toFaDate(toDate)}</div>
      </section>

      <section className="grid gap-4 2xl:grid-cols-[300px_minmax(0,1fr)]" dir="ltr">
        <aside className="rounded-[32px] border border-slate-200/80 bg-white/95 shadow-[0_26px_70px_-50px_rgba(15,23,42,.36)] dark:border-slate-800 dark:bg-slate-950/90" dir="rtl">
          {tab === 'outbox' && detailOutbox ? (() => {
            const tb = typeBadge(detailOutbox.messageType, detailOutbox.text, detailOutbox.eventType);
            const sb = statusBadge(detailOutbox);
            const ch = channelMeta(detailOutbox);
            const customerName = outboxCustomerName(detailOutbox);
            return (
              <div className="p-4">
                <div className="outbox-detail-card">
                  <div className="outbox-detail-header">
                    <span className="outbox-detail-icon"><i className="fa-regular fa-message" /></span>
                    <div className="min-w-0">
                      <h2 className="outbox-detail-title">جزئیات پیام</h2>
                      <p className="outbox-detail-subtitle">نمای خلاصه، گیرنده، وضعیت و متن کامل پیام انتخاب‌شده</p>
                    </div>
                  </div>

                  <div className="outbox-detail-summary">
                    <div className="outbox-detail-summary-main">
                      <div className="outbox-detail-kicker"><i className={`fa-solid ${tb.icon}`} />نوع پیام</div>
                      <div className="outbox-detail-message-type">{tb.label}</div>
                      <div className="outbox-detail-reason">{tb.reason}</div>
                    </div>
                    <span className={`outbox-detail-status ${sb.cls}`}><i className={`fa-solid ${sb.icon}`} />{sb.label}</span>
                  </div>

                  <div className="outbox-detail-meta-grid">
                    <div className="outbox-detail-meta">
                      <span><i className="fa-regular fa-user" />گیرنده</span>
                      <strong>{customerName}</strong>
                    </div>
                    <div className="outbox-detail-meta">
                      <span><i className="fa-solid fa-phone" />شماره موبایل</span>
                      <strong dir="ltr">{outboxCustomerPhone(detailOutbox) || '—'}</strong>
                    </div>
                    <div className="outbox-detail-meta">
                      <span><i className={ch.icon.includes('fa-brands') ? ch.icon : `fa-solid ${ch.icon}`} />کانال</span>
                      <strong>{ch.label}</strong>
                    </div>
                    <div className="outbox-detail-meta">
                      <span><i className="fa-regular fa-clock" />تاریخ و زمان</span>
                      <strong>{toFaDT(detailOutbox.createdAt)}</strong>
                    </div>
                  </div>

                  <div className="outbox-detail-message-box">
                    <div className="outbox-detail-section-title"><i className="fa-regular fa-file-lines" />متن پیام</div>
                    <div className="outbox-detail-message-text">{cleanMessageText(detailOutbox.text) || 'متنی ثبت نشده است.'}</div>
                  </div>

                  {detailOutbox.status === 'failed' ? <div className="outbox-detail-error"><i className="fa-solid fa-circle-info" />{errorReasonFa(detailOutbox.errorKind)} — {detailOutbox.error || 'برای رفع مشکل، اتصال یا Chat ID را بررسی کنید.'}</div> : null}

                  <div className="outbox-detail-actions">
                    <button type="button" className={primaryButton} onClick={() => retryOne(detailOutbox.id)}><i className="fa-solid fa-paper-plane text-white" /> ارسال مجدد</button>
                    <button type="button" className={ghostButton} onClick={() => sendCheck(detailOutbox.id)}><i className="fa-regular fa-circle-check text-blue-500" /> تست ارسال</button>
                  </div>
                </div>
              </div>
            );
          })() : tab === 'inbox' && detailInbox ? (
            <div className="p-4">
              <div className="outbox-detail-card">
                <div className="outbox-detail-header">
                  <span className="outbox-detail-icon"><i className="fa-solid fa-inbox" /></span>
                  <div className="min-w-0">
                    <h2 className="outbox-detail-title">جزئیات پیام دریافتی</h2>
                    <p className="outbox-detail-subtitle">متن دریافتی و وضعیت اتصال به مشتری</p>
                  </div>
                </div>
                <div className="outbox-detail-meta-grid">
                  <div className="outbox-detail-meta"><span><i className="fa-regular fa-user" />مشتری</span><strong>{detailInbox.customerName || 'بدون مشتری'}</strong></div>
                  <div className="outbox-detail-meta"><span><i className="fa-brands fa-telegram" />Chat ID</span><strong dir="ltr">{detailInbox.chatId || '—'}</strong></div>
                  <div className="outbox-detail-meta"><span><i className="fa-solid fa-envelope-open-text" />نوع</span><strong>{inboxKindLabel(detailInbox.kind)}</strong></div>
                </div>
                <div className="outbox-detail-message-box">
                  <div className="outbox-detail-section-title"><i className="fa-regular fa-file-lines" />متن پیام</div>
                  <div className="outbox-detail-message-text">{cleanMessageText(detailInbox.text) || 'متنی ثبت نشده است.'}</div>
                </div>
                {!detailInbox.customerId ? <button type="button" className={`${primaryButton} mt-4 w-full`} onClick={async () => { await ensureCustomersLoaded(); setLinkUI({ open: true, chatId: String(detailInbox.chatId || ''), fromId: String(detailInbox.fromId || '') }); }}><i className="fa-solid fa-link text-white" /> اتصال به مشتری</button> : null}
              </div>
            </div>
          ) : (
            <div className="flex min-h-[360px] items-center justify-center p-6 text-center text-sm font-bold text-slate-500">برای مشاهده جزئیات، یک پیام را انتخاب کنید.</div>
          )}
        </aside>

        <div className="min-w-0 rounded-[30px] border border-slate-200/80 bg-white/95 shadow-[0_22px_70px_-52px_rgba(15,23,42,.34)] dark:border-slate-800 dark:bg-slate-950/90" dir="rtl">
          <div className="flex flex-col gap-3 border-b border-slate-200/80 px-5 py-4 lg:flex-row lg:items-center lg:justify-between dark:border-slate-800">
            <div>
              <h2 className="text-lg font-black tracking-[-0.02em] text-slate-950 dark:text-white">{tab === 'outbox' ? 'لیست پیام‌های در صف ارسال' : 'لیست پیام‌های دریافتی'}</h2>
              <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">نمایش {rangeStart.toLocaleString('fa-IR')} تا {rangeEnd.toLocaleString('fa-IR')} از {currentRows.length.toLocaleString('fa-IR')} پیام</p>
            </div>
            <button type="button" className={ghostButton} onClick={retryFailedAll} disabled={tab !== 'outbox' || isLoading}><i className="fa-solid fa-arrows-rotate text-blue-500" /> ارسال مجدد ناموفق‌ها</button>
          </div>

          {isLoading ? (
            <div className="flex min-h-[420px] items-center justify-center text-sm font-black text-slate-500"><i className="fa-solid fa-spinner fa-spin ml-2" />در حال دریافت پیام‌ها...</div>
          ) : !currentRows.length ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 p-8 text-center"><span className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 text-2xl text-slate-400 dark:bg-slate-900"><i className="fa-regular fa-inbox" /></span><h3 className="text-base font-black text-slate-950 dark:text-white">پیامی مطابق فیلتر فعلی وجود ندارد</h3><p className="text-xs font-bold text-slate-500">فیلترها را تغییر بده یا پیام جدید ایجاد کن.</p></div>
          ) : tab === 'outbox' ? (
            <div className="outbox-table-shell overflow-hidden">
              <table className="outbox-responsive-table w-full min-w-0 table-fixed border-collapse text-right">
                <colgroup><col className="w-[44px]" /><col className="w-[34%]" /><col className="w-[22%]" /><col className="w-[12%]" /><col className="w-[14%]" /><col className="w-[18%]" /></colgroup>
                <thead className="bg-slate-50/80 text-xs font-black text-slate-500 dark:bg-slate-900/50 dark:text-slate-400"><tr><th className="px-3 py-3">ردیف</th><th className="px-4 py-3">نوع پیام / علت</th><th className="px-4 py-3">گیرنده</th><th className="px-4 py-3">کانال</th><th className="px-4 py-3">وضعیت</th><th className="px-4 py-3">عملیات</th></tr></thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(pagedRows as TelegramOutboxItem[]).map((row, index) => {
                    const tb = typeBadge(row.messageType, row.text, row.eventType);
                    const ch = channelMeta(row);
                    const sb = statusBadge(row);
                    const customerName = outboxCustomerName(row);
                    const selected = detailOutbox?.id === row.id;
                    return (
                      <tr key={row.id} onClick={() => setSelectedOutboxId(row.id)} className={`cursor-pointer transition hover:bg-slate-50/80 dark:hover:bg-slate-900/50 ${selected ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}`}>
                        <td data-label="ردیف" className="px-2 py-3 align-middle text-sm font-black text-slate-500">{((safePage - 1) * PAGE_SIZE + index + 1).toLocaleString('fa-IR')}</td>
                        <td data-label="نوع پیام" className="px-3 py-3 align-middle"><div className="flex items-start gap-1.5"><div className="min-w-0"><div className="truncate text-[15px] font-black text-slate-950 dark:text-white">{tb.label}</div><div className="mt-1 truncate text-[11px] font-bold text-slate-500 dark:text-slate-400">{tb.reason}</div></div></div></td>
                        <td data-label="گیرنده" className="px-3 py-3 align-middle"><div className="min-w-0"><div className="truncate text-sm font-black text-slate-900 dark:text-white">{customerName}</div><div className="truncate text-[11px] font-bold text-slate-500">{outboxCustomerPhone(row) || (row.chatId ? 'شناسه تلگرام ثبت شده' : 'بدون شماره')}</div></div></td>
                        <td data-label="کانال" className="px-3 py-3 align-middle"><span className={`outbox-table-chip inline-flex h-8 items-center gap-1.5 rounded-full border px-2 text-[11px] font-black ${ch.cls}`}><i className={ch.icon.includes('fa-brands') ? ch.icon : `fa-solid ${ch.icon}`} />{ch.label}</span></td>
                        <td data-label="وضعیت" className="px-3 py-3 align-middle"><span className={`outbox-table-chip inline-flex h-8 items-center gap-1.5 rounded-full border px-2 text-[11px] font-black ${sb.cls}`}><i className={`fa-solid ${sb.icon}`} />{sb.label}</span></td>
                        <td data-label="عملیات" className="px-3 py-3 align-middle"><div className="flex items-center gap-1.5 justify-start"><button type="button" className="outbox-action-button inline-flex h-8 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 text-[11px] font-black text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200" onClick={(e) => { e.stopPropagation(); setSelectedOutboxId(row.id); setDetailModalTab('outbox'); }}><i className="fa-regular fa-eye text-blue-500" /><span>مشاهده</span></button>{(row.status === 'failed' || row.status === 'pending') ? <button type="button" className="outbox-action-icon inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200" onClick={(e) => { e.stopPropagation(); retryOne(row.id); }} title="ارسال مجدد"><i className="fa-solid fa-arrows-rotate text-blue-500" /></button> : null}</div></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="outbox-table-shell overflow-hidden">
              <table className="outbox-responsive-table w-full min-w-0 table-fixed border-collapse text-right">
                <colgroup><col className="w-[52px]" /><col className="w-[34%]" /><col className="w-[22%]" /><col className="w-[13%]" /><col className="w-[15%]" /><col className="w-[16%]" /></colgroup>
                <thead className="bg-slate-50/80 text-xs font-black text-slate-500 dark:bg-slate-900/50 dark:text-slate-400"><tr><th className="px-4 py-3">ردیف</th><th className="px-4 py-3">متن دریافتی</th><th className="px-4 py-3">مشتری</th><th className="px-4 py-3">نوع</th><th className="px-4 py-3">وضعیت اتصال</th><th className="px-4 py-3">عملیات</th></tr></thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(pagedRows as TelegramInboxItem[]).map((m, index) => {
                    const selected = detailInbox?.id === m.id;
                    const isLinked = !!m.customerId;
                    return (
                      <tr key={m.id} onClick={() => setSelectedInboxId(m.id)} className={`cursor-pointer transition hover:bg-slate-50/80 dark:hover:bg-slate-900/50 ${selected ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}`}>
                        <td data-label="ردیف" className="px-3 py-3 text-sm font-black text-slate-500">{((safePage - 1) * PAGE_SIZE + index + 1).toLocaleString('fa-IR')}</td>
                        <td data-label="متن دریافتی" className="px-3 py-3"><div className="line-clamp-2 text-sm font-black leading-6 text-slate-950 dark:text-white">{textLine(m.text, 120)}</div><div className="mt-1 truncate text-[11px] font-bold text-slate-500" dir="ltr">Chat: {m.chatId || '—'}</div></td>
                        <td data-label="مشتری" className="px-3 py-3"><div className="min-w-0"><div className="truncate text-sm font-black text-slate-900 dark:text-white">{m.customerName || 'بدون مشتری'}</div><div className="text-[11px] font-bold text-slate-500" dir="ltr">{m.customerPhone || '—'}</div></div></td>
                        <td data-label="نوع" className="px-3 py-3"><span className="outbox-table-chip inline-flex h-8 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2 text-[11px] font-black text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"><i className="fa-solid fa-envelope-open-text text-blue-500" />{inboxKindLabel(m.kind)}</span></td>
                        <td data-label="وضعیت اتصال" className="px-3 py-3">{isLinked ? <span className="outbox-table-chip inline-flex h-8 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 text-[11px] font-black text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200"><i className="fa-solid fa-link" />متصل</span> : <span className="outbox-table-chip inline-flex h-8 items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2 text-[11px] font-black text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200"><i className="fa-solid fa-user-plus" />نیازمند اتصال</span>}</td>
                        <td data-label="عملیات" className="px-3 py-3"><button type="button" className="outbox-action-button inline-flex h-8 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 text-[11px] font-black text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200" onClick={(e) => { e.stopPropagation(); setSelectedInboxId(m.id); setDetailModalTab('inbox'); }}><i className="fa-regular fa-eye text-blue-500" /><span>مشاهده</span></button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-slate-200/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400">نمایش {rangeStart.toLocaleString('fa-IR')} تا {rangeEnd.toLocaleString('fa-IR')} از {currentRows.length.toLocaleString('fa-IR')} پیام</div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className={ghostButton} disabled={safePage <= 1} onClick={() => setPage((x) => Math.max(1, x - 1))}>قبلی</button>
              {pages.map((p) => <button key={p} type="button" onClick={() => setPage(p)} className={`h-10 min-w-10 rounded-xl px-3 text-xs font-black ${safePage === p ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300'}`}>{p.toLocaleString('fa-IR')}</button>)}
              <button type="button" className={ghostButton} disabled={safePage >= totalPages} onClick={() => setPage((x) => Math.min(totalPages, x + 1))}>بعدی</button>
            </div>
          </div>
        </div>
      </section>


      {typeof document !== 'undefined' && detailModalTab === 'outbox' && selectedOutbox ? createPortal((() => {
        const tb = typeBadge(selectedOutbox.messageType, selectedOutbox.text, selectedOutbox.eventType);
        const sb = statusBadge(selectedOutbox);
        const ch = channelMeta(selectedOutbox);
        const customerName = outboxCustomerName(selectedOutbox);
        return (
          <div className="outbox-detail-modal-backdrop fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" onClick={() => setDetailModalTab(null)}>
            <div className="outbox-detail-modal-card outbox-detail-modal-card-compact rounded-[32px] border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-950" onClick={(e) => e.stopPropagation()} dir="rtl">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="outbox-detail-icon"><i className="fa-regular fa-message" /></span>
                  <div>
                    <h2 className="outbox-detail-title">جزئیات کامل پیام</h2>
                    <p className="outbox-detail-subtitle">نمای کامل پیام انتخاب‌شده از صف ارسال</p>
                  </div>
                </div>
                <button type="button" className={ghostButton} onClick={() => setDetailModalTab(null)}><i className="fa-solid fa-xmark" /> بستن</button>
              </div>

              <div className="outbox-detail-card outbox-detail-modal-landscape outbox-detail-modal-outbox">
                <div className="outbox-detail-summary">
                  <div className="outbox-detail-summary-main">
                    <div className="outbox-detail-kicker"><i className={`fa-solid ${tb.icon}`} />نوع پیام</div>
                    <div className="outbox-detail-message-type">{tb.label}</div>
                    <div className="outbox-detail-reason">{tb.reason}</div>
                  </div>
                  <span className={`outbox-detail-status ${sb.cls}`}><i className={`fa-solid ${sb.icon}`} />{sb.label}</span>
                </div>

                <div className="outbox-detail-meta-grid outbox-detail-modal-meta-grid">
                  <div className="outbox-detail-meta"><span><i className="fa-regular fa-user" />گیرنده</span><strong>{customerName}</strong></div>
                  <div className="outbox-detail-meta"><span><i className="fa-solid fa-phone" />شماره موبایل</span><strong dir="ltr">{outboxCustomerPhone(selectedOutbox) || '—'}</strong></div>
                  <div className="outbox-detail-meta"><span><i className={ch.icon.includes('fa-brands') ? ch.icon : `fa-solid ${ch.icon}`} />کانال</span><strong>{ch.label}</strong></div>
                  <div className="outbox-detail-meta"><span><i className="fa-regular fa-clock" />تاریخ و زمان</span><strong>{toFaDT(selectedOutbox.createdAt)}</strong></div>
                </div>

                <div className="outbox-detail-message-box">
                  <div className="outbox-detail-section-title"><i className="fa-regular fa-file-lines" />متن پیام</div>
                  <div className="outbox-detail-message-text outbox-detail-modal-message-text">{cleanMessageText(selectedOutbox.text) || 'متنی ثبت نشده است.'}</div>
                </div>

                {selectedOutbox.status === 'failed' ? <div className="outbox-detail-error"><i className="fa-solid fa-circle-info" />{errorReasonFa(selectedOutbox.errorKind)} — {selectedOutbox.error || 'برای رفع مشکل، اتصال یا Chat ID را بررسی کنید.'}</div> : null}

                <div className="outbox-detail-actions">
                  <button type="button" className={primaryButton} onClick={() => retryOne(selectedOutbox.id)}><i className="fa-solid fa-paper-plane text-white" /> ارسال مجدد</button>
                  <button type="button" className={ghostButton} onClick={() => sendCheck(selectedOutbox.id)}><i className="fa-regular fa-circle-check text-blue-500" /> تست ارسال</button>
                </div>
              </div>
            </div>
          </div>
        );
      })(), document.body) : null}

      {typeof document !== 'undefined' && detailModalTab === 'inbox' && selectedInbox ? createPortal((
        <div className="outbox-detail-modal-backdrop fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" onClick={() => setDetailModalTab(null)}>
          <div className="outbox-detail-modal-card outbox-detail-modal-card-compact rounded-[32px] border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-950" onClick={(e) => e.stopPropagation()} dir="rtl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="outbox-detail-icon"><i className="fa-solid fa-inbox" /></span>
                <div>
                  <h2 className="outbox-detail-title">جزئیات پیام دریافتی</h2>
                  <p className="outbox-detail-subtitle">نمای کامل پیام دریافتی انتخاب‌شده</p>
                </div>
              </div>
              <button type="button" className={ghostButton} onClick={() => setDetailModalTab(null)}><i className="fa-solid fa-xmark" /> بستن</button>
            </div>

            <div className="outbox-detail-card outbox-detail-modal-landscape outbox-detail-modal-inbox">
              <div className="outbox-detail-meta-grid outbox-detail-modal-meta-grid">
                <div className="outbox-detail-meta"><span><i className="fa-regular fa-user" />مشتری</span><strong>{selectedInbox.customerName || 'بدون مشتری'}</strong></div>
                <div className="outbox-detail-meta"><span><i className="fa-brands fa-telegram" />Chat ID</span><strong dir="ltr">{selectedInbox.chatId || '—'}</strong></div>
                <div className="outbox-detail-meta"><span><i className="fa-solid fa-envelope-open-text" />نوع</span><strong>{inboxKindLabel(selectedInbox.kind)}</strong></div>
              </div>
              <div className="outbox-detail-message-box">
                <div className="outbox-detail-section-title"><i className="fa-regular fa-file-lines" />متن پیام</div>
                <div className="outbox-detail-message-text outbox-detail-modal-message-text">{cleanMessageText(selectedInbox.text) || 'متنی ثبت نشده است.'}</div>
              </div>
              {!selectedInbox.customerId ? <div className="outbox-detail-actions"><button type="button" className={`${primaryButton} w-full`} onClick={async () => { await ensureCustomersLoaded(); setLinkUI({ open: true, chatId: String(selectedInbox.chatId || ''), fromId: String(selectedInbox.fromId || '') }); }}><i className="fa-solid fa-link text-white" /> اتصال به مشتری</button></div> : null}
            </div>
          </div>
        </div>
      ), document.body) : null}

      {linkUI.open ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" onClick={() => setLinkUI({ open: false, chatId: '', fromId: '' })}>
          <div className="w-full max-w-2xl rounded-[30px] border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-950" onClick={(e) => e.stopPropagation()} dir="rtl">
            <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-3 text-lg font-black text-slate-950 dark:text-white"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><i className="fa-solid fa-link" /></span>اتصال Chat ID به مشتری</div><div className="mt-2 text-xs font-bold text-slate-500" dir="ltr">Chat ID: {linkUI.chatId || '—'} • From: {linkUI.fromId || '—'}</div></div><button type="button" className={ghostButton} onClick={() => setLinkUI({ open: false, chatId: '', fromId: '' })}>بستن</button></div>
            <div className="mt-4 flex flex-wrap items-center gap-2"><input value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} className={`${inputClass} min-w-[220px] flex-1`} placeholder="جستجو بر اساس نام، شماره یا شناسه" /><div className="inline-flex h-11 items-center rounded-2xl border border-slate-200 bg-slate-50 px-3 text-xs font-black text-slate-500">{allCustomers.length ? `${allCustomers.length.toLocaleString('fa-IR')} مشتری` : 'بدون داده'}</div></div>
            <div className="mt-4 max-h-[55vh] overflow-auto rounded-[24px] border border-slate-200 dark:border-slate-800">
              {filteredCustomers.map((c) => <button key={c.id} type="button" className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 text-right transition last:border-b-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900" onClick={() => linkCustomer(Number(c.id), linkUI.chatId, linkUI.fromId)}><span className="min-w-0"><span className="block truncate text-sm font-black text-slate-900 dark:text-white">{c.fullName || `مشتری #${c.id}`}</span><span className="mt-1 block text-xs font-bold text-slate-500" dir="ltr">{c.phoneNumber || '—'} • ID {c.id}</span></span><span className="inline-flex h-8 items-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-600">اتصال</span></button>)}
            </div>
          </div>
        </div>
      ) : null}

      <MessageComposerModal open={composerOpen} onClose={() => setComposerOpen(false)} onQueued={() => { setComposerOpen(false); fetchOutbox(); }} initialChannels={{ sms: true, telegram: false }} />
    </main>
  );
}
