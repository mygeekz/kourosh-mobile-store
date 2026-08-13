import { DialogShell, SelectField, TextField } from '@/components/ui';
import { useEffect, useMemo, useRef, useState } from 'react';
import MessageComposerModal from '../components/MessageComposerModal';
import ShamsiDatePicker from '../components/ShamsiDatePicker';
import { apiFetch } from '../utils/apiFetch';
import toast from 'react-hot-toast';

type MessagingOutboxItem = {
  id: number;
  channel: 'sms' | 'telegram' | string;
  provider?: string | null;
  recipient?: string | null;
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

type OutboxStats = {
  total: number;
  pending: number;
  processing: number;
  sent: number;
  failed: number;
  unresolved: number;
  telegram: number;
  sms: number;
};

type InboxStats = { total: number; linked: number; unlinked: number };
type PaginationMeta = { limit: number; offset: number; total: number };

const PAGE_SIZE = 12;
const EMPTY_OUTBOX_STATS: OutboxStats = { total: 0, pending: 0, processing: 0, sent: 0, failed: 0, unresolved: 0, telegram: 0, sms: 0 };
const EMPTY_INBOX_STATS: InboxStats = { total: 0, linked: 0, unlinked: 0 };
const EMPTY_PAGINATION: PaginationMeta = { limit: PAGE_SIZE, offset: 0, total: 0 };

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'همه وضعیت‌ها' },
  { value: 'pending', label: 'در صف ارسال' },
  { value: 'processing', label: 'در حال ارسال' },
  { value: 'done', label: 'ارسال‌شده' },
  { value: 'failed', label: 'ناموفق' },
];

const TYPE_OPTIONS = [
  { value: 'ALL', label: 'همه انواع' },
  { value: 'installments', label: 'اقساط و چک' },
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
  { value: 'sms', label: 'پیامک' },
];

const ghostButton = 'messaging-btn messaging-btn--secondary';
const primaryButton = 'messaging-btn messaging-btn--primary';
const iconButton = 'messaging-icon-btn';
const inputClass = 'messaging-field';
const selectClass = 'messaging-field messaging-select';

const cleanMessageText = (value?: string | null) => String(value || '')
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

const textLine = (value?: string | null, max = 90) => {
  const text = cleanMessageText(value).replace(/\s+/g, ' ').trim();
  return text.length <= max ? text : `${text.slice(0, max)}…`;
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

const normalizeNameCandidate = (value?: string | null) => sanitizeCustomerName(value)
  .replace(/[0-9۰-۹٠-٩#*]+/g, ' ')
  .replace(/[ـ_\-–—]{2,}/g, ' ')
  .replace(/\b(شماره|قرارداد|تاریخ|مبلغ|ثبت|اطلاعات|پیام|یادآوری|اقساطی|اقساط|چک|مشتری|سلام|گرامی|نوع|علت|دلیل|ارسال|برای|با|موفقیت|تغییرات|شد|شما|عزیز|پرداخت|تومان|ریال)\b/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const inferCustomerName = (row: MessagingOutboxItem) => {
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
  ];
  for (const pattern of patterns) {
    const candidate = normalizeNameCandidate(text.match(pattern)?.[1] || '');
    if (candidate && candidate.length >= 3 && candidate.length <= 50) return candidate;
  }
  return 'گیرنده مشخص نشده';
};

const parseServerDate = (value?: string | null) => {
  if (!value) return null;
  let normalized = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(normalized)) normalized = normalized.replace(' ', 'T');
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(normalized)) normalized += 'Z';
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toFaDT = (value?: string | null) => {
  const date = parseServerDate(value);
  if (!date) return '—';
  return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    timeZone: 'Asia/Tehran',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(date);
};

const toFaDate = (date?: Date | null) => {
  if (!date || Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
};

const toIsoDate = (date: Date | null, endOfDay = false) => {
  if (!date) return '';
  const clone = new Date(date);
  if (Number.isNaN(clone.getTime())) return '';
  if (endOfDay) clone.setHours(23, 59, 59, 999);
  else clone.setHours(0, 0, 0, 0);
  return clone.toISOString();
};

const statusBadge = (row: MessagingOutboxItem) => {
  if (row.status === 'done' || row.status === 'sent') return { label: 'ارسال‌شده', icon: 'fa-check', cls: 'is-success' };
  if (row.status === 'failed') return { label: 'ناموفق', icon: 'fa-xmark', cls: 'is-danger' };
  if (row.status === 'processing') return { label: 'در حال ارسال', icon: 'fa-spinner', cls: 'is-info' };
  return { label: row.isRetried ? 'در انتظار مجدد' : 'در صف ارسال', icon: 'fa-clock', cls: 'is-warning' };
};

const typeBadge = (type?: string | null, text?: string | null, eventType?: string | null) => {
  const value = String(type || '').toLowerCase();
  const haystack = `${cleanMessageText(text)} ${eventType || ''}`.toLowerCase();
  if (value === 'installments' || /قسط|اقساط|چک|installment|check/.test(haystack)) return { value: 'installments', label: /چک/.test(haystack) ? 'یادآوری چک' : 'یادآوری اقساط', reason: /چک/.test(haystack) ? 'یادآوری سررسید چک' : 'یادآوری پرداخت اقساط', icon: 'fa-bell' };
  if (value === 'repairs' || /repair|service|تعمیر|خدمات/.test(haystack)) return { value: 'repairs', label: 'اطلاع‌رسانی خدمات', reason: 'وضعیت خدمات یا تعمیرات', icon: 'fa-screwdriver-wrench' };
  if (value === 'reports' || /report|گزارش|manager/.test(haystack)) return { value: 'reports', label: 'گزارش سیستمی', reason: 'گزارش عملکرد یا رویداد مدیریتی', icon: 'fa-chart-line' };
  if (value === 'manual') return { value: 'manual', label: 'پیام دستی', reason: 'ثبت‌شده توسط کاربر', icon: 'fa-pen' };
  return { value: 'other', label: 'پیام سیستمی', reason: 'پیگیری یا اطلاع‌رسانی سیستمی', icon: 'fa-gear' };
};

const channelMeta = (row: MessagingOutboxItem) => {
  if (String(row.channel).toLowerCase() === 'sms') return { value: 'sms', label: 'پیامک', icon: 'fa-solid fa-comment-sms', cls: 'is-sms' };
  return { value: 'telegram', label: 'تلگرام', icon: 'fa-brands fa-telegram', cls: 'is-telegram' };
};

const inboxKindLabel = (kind?: string | null) => {
  const normalized = String(kind || '').toLowerCase();
  if (normalized === 'contact') return 'اطلاعات تماس';
  if (normalized === 'text') return 'پیام متنی';
  if (normalized === 'callback_query') return 'دکمه تعاملی';
  if (normalized === 'photo') return 'تصویر';
  return kind || 'پیام دریافتی';
};

const errorReasonFa = (kind?: MessagingOutboxItem['errorKind']) => {
  if (kind === 'blocked') return 'ربات توسط گیرنده مسدود شده است';
  if (kind === 'chat not found') return 'شناسه مقصد معتبر نیست';
  if (kind === 'proxy error') return 'مشکل اتصال یا پراکسی';
  if (kind === 'other') return 'خطای ارسال';
  return 'خطایی ثبت نشده است';
};

const safeMessage = (value: unknown, fallback: string) => String(value || '').trim() || fallback;

export default function MessagingCenterPage() {
  const [tab, setTab] = useState<TabKey>('outbox');
  const [q, setQ] = useState('');
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [status, setStatus] = useState('ALL');
  const [type, setType] = useState('ALL');
  const [support, setSupport] = useState('ALL');
  const [channel, setChannel] = useState('ALL');
  const [outbox, setOutbox] = useState<MessagingOutboxItem[]>([]);
  const [inbox, setInbox] = useState<TelegramInboxItem[]>([]);
  const [outboxStats, setOutboxStats] = useState<OutboxStats>(EMPTY_OUTBOX_STATS);
  const [inboxStats, setInboxStats] = useState<InboxStats>(EMPTY_INBOX_STATS);
  const [pagination, setPagination] = useState<PaginationMeta>(EMPTY_PAGINATION);
  const [isLoading, setIsLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [bulkRetryBusy, setBulkRetryBusy] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedOutbox, setSelectedOutbox] = useState<MessagingOutboxItem | null>(null);
  const [selectedInbox, setSelectedInbox] = useState<TelegramInboxItem | null>(null);
  const [detailModalTab, setDetailModalTab] = useState<TabKey | null>(null);
  const [allCustomers, setAllCustomers] = useState<any[]>([]);
  const [linkUI, setLinkUI] = useState<{ open: boolean; chatId: string; fromId: string }>({ open: false, chatId: '', fromId: '' });
  const [customerSearch, setCustomerSearch] = useState('');
  const requestSequence = useRef(0);

  const apiJson = async (url: string, options: RequestInit = {}) => {
    const response = await apiFetch(url, options);
    const result = await response.json().catch(() => null);
    if (!response.ok) throw new Error((result && (result.message || result.error)) || `HTTP ${response.status}`);
    return result;
  };

  const fetchOutbox = async () => {
    const requestId = ++requestSequence.current;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String((page - 1) * PAGE_SIZE),
        status,
        type,
        support,
        channel,
        from: toIsoDate(fromDate, false),
        to: toIsoDate(toDate, true),
        q,
      });
      const result = await apiJson(`/api/telegram/outbox/messages?${params.toString()}`);
      if (!result?.success) throw new Error(result?.message || 'دریافت صف پیام‌ها ناموفق بود.');
      if (requestId !== requestSequence.current) return;
      setOutbox(Array.isArray(result.data) ? result.data : []);
      setOutboxStats({ ...EMPTY_OUTBOX_STATS, ...(result?.meta?.stats || {}) });
      setPagination({ ...EMPTY_PAGINATION, ...(result?.meta?.pagination || {}) });
      setLastSyncedAt(result?.meta?.generatedAt || new Date().toISOString());
    } catch (error: any) {
      if (requestId === requestSequence.current) {
        setOutbox([]);
        toast.error(safeMessage(error?.message, 'دریافت صف پیام‌ها ناموفق بود.'));
      }
    } finally {
      if (requestId === requestSequence.current) setIsLoading(false);
    }
  };

  const fetchInbox = async () => {
    const requestId = ++requestSequence.current;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String((page - 1) * PAGE_SIZE),
        support,
        from: toIsoDate(fromDate, false),
        to: toIsoDate(toDate, true),
        q,
      });
      const result = await apiJson(`/api/telegram/inbox?${params.toString()}`);
      if (!result?.success) throw new Error(result?.message || 'دریافت پیام‌های دریافتی ناموفق بود.');
      if (requestId !== requestSequence.current) return;
      setInbox(Array.isArray(result.data) ? result.data : []);
      setInboxStats({ ...EMPTY_INBOX_STATS, ...(result?.meta?.stats || {}) });
      setPagination({ ...EMPTY_PAGINATION, ...(result?.meta?.pagination || {}) });
      setLastSyncedAt(result?.meta?.generatedAt || new Date().toISOString());
    } catch (error: any) {
      if (requestId === requestSequence.current) {
        setInbox([]);
        toast.error(safeMessage(error?.message, 'دریافت پیام‌های دریافتی ناموفق بود.'));
      }
    } finally {
      if (requestId === requestSequence.current) setIsLoading(false);
    }
  };

  const refresh = () => (tab === 'outbox' ? fetchOutbox() : fetchInbox());

  useEffect(() => {
    setPage(1);
  }, [q, status, type, support, channel, fromDate, toDate, tab]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh(); }, q ? 260 : 30);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, page, q, status, type, support, channel, fromDate, toDate]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const result = await apiJson('/api/telegram/inbox?limit=1&offset=0&support=ALL&q=&from=&to=');
        if (alive && result?.success) setInboxStats({ ...EMPTY_INBOX_STATS, ...(result?.meta?.stats || {}) });
      } catch {
        // The inbox tab will retry with a visible state when opened.
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const result = await apiJson('/api/customers');
        if (alive && result?.success) setAllCustomers(result.data || []);
      } catch {
        // Customer lookup is optional for the messaging queue.
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ensureCustomersLoaded = async () => {
    if (allCustomers.length) return;
    try {
      const result = await apiJson('/api/customers');
      if (result?.success) setAllCustomers(result.data || []);
    } catch {
      toast.error('فهرست مشتری‌ها دریافت نشد.');
    }
  };

  const normalizePhoneForMatch = (value?: unknown) => String(value || '')
    .replace(/[۰-۹٠-٩]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩'.indexOf(digit) % 10))
    .replace(/[^0-9]/g, '')
    .replace(/^0098/, '0')
    .replace(/^98(?=9)/, '0');

  const customerDirectory = useMemo(() => (allCustomers || []).map((customer: any) => {
    const id = Number(customer?.id ?? customer?.customerId ?? customer?.personId ?? 0) || null;
    const name = sanitizeCustomerName(customer?.fullName || customer?.name || customer?.displayName || customer?.customerName || customer?.title);
    const displayPhone = String(customer?.phoneNumber || customer?.mobile || customer?.phone || customer?.customerPhone || customer?.phone_number || '').trim();
    return { id, name, displayPhone, phone: normalizePhoneForMatch(displayPhone) };
  }).filter((customer: any) => customer.id || customer.name || customer.phone), [allCustomers]);

  const findCustomerForOutbox = (row: MessagingOutboxItem) => {
    const rowId = Number(row.customerId || 0);
    if (rowId) {
      const byId = customerDirectory.find((customer: any) => Number(customer.id) === rowId);
      if (byId) return byId;
    }
    const rowPhone = normalizePhoneForMatch(row.customerPhone || row.recipient);
    if (rowPhone) {
      const byPhone = customerDirectory.find((customer: any) => customer.phone && (customer.phone === rowPhone || customer.phone.endsWith(rowPhone) || rowPhone.endsWith(customer.phone)));
      if (byPhone) return byPhone;
    }
    const inferred = sanitizeCustomerName(inferCustomerName(row));
    if (inferred && inferred !== 'گیرنده مشخص نشده') {
      return customerDirectory.find((customer: any) => customer.name && (customer.name === inferred || customer.name.includes(inferred) || inferred.includes(customer.name))) || null;
    }
    return null;
  };

  const outboxCustomerName = (row: MessagingOutboxItem) => sanitizeCustomerName(findCustomerForOutbox(row)?.name) || inferCustomerName(row);
  const outboxCustomerPhone = (row: MessagingOutboxItem) => String(row.customerPhone || row.recipient || findCustomerForOutbox(row)?.displayPhone || '').trim();

  const linkCustomer = async (targetCustomerId: number, chatId: string) => {
    try {
      const loadingToast = toast.loading('در حال ذخیره مقصد ارسال...');
      const result = await apiJson('/api/telegram/customers/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: targetCustomerId, chatId }),
      });
      toast.dismiss(loadingToast);
      if (!result?.success) throw new Error(result?.message || 'ذخیره مقصد ارسال انجام نشد.');
      toast.success('مقصد ارسال ذخیره شد؛ دسترسی تلگرام تغییری نکرد.');
      setLinkUI({ open: false, chatId: '', fromId: '' });
      setCustomerSearch('');
      await fetchInbox();
    } catch (error: any) {
      toast.error(safeMessage(error?.message, 'ذخیره مقصد ارسال انجام نشد.'));
    }
  };

  const retryOne = async (row: MessagingOutboxItem) => {
    setBusyId(row.id);
    try {
      const result = await apiJson(`/api/notifications/outbox/${row.id}/retry`, { method: 'POST' });
      if (!result?.success) throw new Error(result?.message || 'ارسال مجدد انجام نشد.');
      toast.success('پیام دوباره در صف قرار گرفت.');
      await fetchOutbox();
    } catch (error: any) {
      toast.error(safeMessage(error?.message, 'ارسال مجدد انجام نشد.'));
    } finally {
      setBusyId(null);
    }
  };

  const sendCheck = async (row: MessagingOutboxItem) => {
    if (row.channel !== 'telegram') return;
    setBusyId(row.id);
    try {
      const result = await apiJson(`/api/telegram/outbox/${row.id}/send-check`, { method: 'POST' });
      if (!result?.success) throw new Error(result?.message || 'ارسال پیام بررسی انجام نشد.');
      toast.success('پیام بررسی تلگرام ارسال شد.');
      await fetchOutbox();
    } catch (error: any) {
      toast.error(safeMessage(error?.message, 'ارسال پیام بررسی انجام نشد.'));
    } finally {
      setBusyId(null);
    }
  };

  const retryFailedCurrentPage = async () => {
    const failedRows = outbox.filter((row) => row.status === 'failed' && row.supportStatus !== 'resolved');
    if (!failedRows.length) return toast('در صفحه فعلی پیام ناموفقِ بازی وجود ندارد.');
    setBulkRetryBusy(true);
    try {
      const results = await Promise.allSettled(failedRows.map((row) => apiJson(`/api/notifications/outbox/${row.id}/retry`, { method: 'POST' })));
      const successful = results.filter((result) => result.status === 'fulfilled').length;
      const failed = results.length - successful;
      if (successful) toast.success(`${successful.toLocaleString('fa-IR')} پیام دوباره در صف قرار گرفت.`);
      if (failed) toast.error(`${failed.toLocaleString('fa-IR')} پیام دوباره صف‌بندی نشد.`);
      await fetchOutbox();
    } finally {
      setBulkRetryBusy(false);
    }
  };

  const filteredCustomers = useMemo(() => {
    const search = customerSearch.trim().toLowerCase();
    return (allCustomers || []).filter((customer) => {
      if (!search) return true;
      return [customer.id, customer.fullName, customer.phoneNumber].filter(Boolean).join(' ').toLowerCase().includes(search);
    }).slice(0, 80);
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

  const totalPages = Math.max(1, Math.ceil(pagination.total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const rangeStart = pagination.total ? pagination.offset + 1 : 0;
  const rangeEnd = Math.min(pagination.offset + (tab === 'outbox' ? outbox.length : inbox.length), pagination.total);
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, index) => {
    const start = Math.max(1, Math.min(safePage - 2, totalPages - 4));
    return start + index;
  }).filter((item) => item <= totalPages);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const statCards = tab === 'outbox'
    ? [
      { key: 'total', label: 'کل پیام‌ها', value: outboxStats.total, hint: `${outboxStats.telegram.toLocaleString('fa-IR')} تلگرام، ${outboxStats.sms.toLocaleString('fa-IR')} پیامک`, icon: 'fa-comments', tone: 'neutral' },
      { key: 'pending', label: 'در صف ارسال', value: outboxStats.pending, hint: 'منتظر پردازش worker', icon: 'fa-paper-plane', tone: 'info' },
      { key: 'sent', label: 'ارسال‌شده', value: outboxStats.sent, hint: `${outboxStats.total ? Math.round((outboxStats.sent / outboxStats.total) * 100) : 0}٪ موفقیت`, icon: 'fa-check', tone: 'success' },
      { key: 'processing', label: 'در حال پردازش', value: outboxStats.processing, hint: 'در اختیار worker', icon: 'fa-spinner', tone: 'warning' },
      { key: 'failed', label: 'ناموفق', value: outboxStats.failed, hint: `${outboxStats.unresolved.toLocaleString('fa-IR')} مورد باز`, icon: 'fa-triangle-exclamation', tone: 'danger' },
    ]
    : [
      { key: 'received', label: 'پیام دریافتی', value: inboxStats.total, hint: 'تلگرام ورودی', icon: 'fa-inbox', tone: 'neutral' },
      { key: 'linked', label: 'مقصد ثبت‌شده', value: inboxStats.linked, hint: 'فقط مسیر ارسال تلگرام', icon: 'fa-paper-plane', tone: 'success' },
      { key: 'unlinked', label: 'نیازمند اتصال', value: inboxStats.unlinked, hint: 'بدون پرونده مشتری', icon: 'fa-user-plus', tone: 'warning' },
    ];

  const dateRange = (
    <>
      <div className="messaging-date-picker-slot">
        <ShamsiDatePicker selectedDate={fromDate} onDateChange={setFromDate} preview="تاریخ شروع" size="compact" />
      </div>
      <div className="messaging-date-picker-slot">
        <ShamsiDatePicker selectedDate={toDate} onDateChange={setToDate} preview="تاریخ پایان" size="compact" />
      </div>
    </>
  );

  return (
    <main className="messaging-center-v2" dir="rtl" data-ui-messaging-center="true">
      <section className="messaging-center-v2__hero">
        <div className="messaging-center-v2__brand">
          <span><i className="fa-solid fa-paper-plane" /></span>
          <div>
            <small><i className="fa-solid fa-layer-group" /> مرکز عملیات پیام‌رسانی</small>
            <h1>مرکز پیام‌رسانی</h1>
            <p>صف واقعی پیامک و تلگرام، پیام‌های دریافتی، خطاها و اتصال گیرنده‌ها در یک نمای فشرده.</p>
          </div>
        </div>

        <div className="messaging-center-v2__hero-tools">
          <div className="messaging-center-v2__tabs" role="tablist" aria-label="نوع پیام‌ها">
            <button type="button" data-active={tab === 'outbox'} onClick={() => setTab('outbox')}>
              <i className="fa-solid fa-paper-plane" /><span>صف ارسال</span><strong>{outboxStats.total.toLocaleString('fa-IR')}</strong>
            </button>
            <button type="button" data-active={tab === 'inbox'} onClick={() => setTab('inbox')}>
              <i className="fa-solid fa-inbox" /><span>پیام‌های دریافتی</span><strong>{inboxStats.total.toLocaleString('fa-IR')}</strong>
            </button>
          </div>

          <div className="messaging-center-v2__actions">
            <button type="button" className={ghostButton} onClick={() => void refresh()} disabled={isLoading}>
              <i className={`fa-solid fa-rotate ${isLoading ? 'fa-spin' : ''}`} /> بروزرسانی
            </button>
            {tab === 'outbox' ? (
              <button type="button" className={ghostButton} onClick={() => void retryFailedCurrentPage()} disabled={isLoading || bulkRetryBusy}>
                <i className={`fa-solid fa-arrows-rotate ${bulkRetryBusy ? 'fa-spin' : ''}`} /> ارسال مجدد این صفحه
              </button>
            ) : null}
            <button type="button" className={primaryButton} onClick={() => setComposerOpen(true)}>
              <i className="fa-solid fa-plus" /> پیام جدید
            </button>
          </div>

          <div className="messaging-center-v2__meta">
            <span><i className="fa-solid fa-database" /> داده واقعی SQLite</span>
            <span><i className="fa-regular fa-clock" /> بروزرسانی: {toFaDT(lastSyncedAt)}</span>
          </div>
        </div>
      </section>

      <section className="messaging-center-v2__stats" aria-label="خلاصه پیام‌رسانی">
        {statCards.map((stat) => (
          <article key={stat.key} data-tone={stat.tone}>
            <span><i className={`fa-solid ${stat.icon}`} /></span>
            <strong>{stat.value.toLocaleString('fa-IR')}</strong>
            <div><b>{stat.label}</b><small>{stat.hint}</small></div>
          </article>
        ))}
      </section>

      <section className="messaging-center-v2__filters" aria-label="فیلتر پیام‌ها">
        <div className="messaging-filter-cell messaging-filter-cell--search">
          <label className="messaging-search-field">
            <i className="fa-solid fa-magnifying-glass" />
            <TextField controlOnly unstyled value={q} onChange={(event) => setQ(event.target.value)} className={inputClass} placeholder={tab === 'outbox' ? 'جستجو در گیرنده، شماره، متن یا خطا' : 'جستجو در مشتری، Chat ID یا متن دریافتی'} />
          </label>
        </div>

        {tab === 'outbox' ? (
          <>
            <div className="messaging-filter-cell"><SelectField controlOnly unstyled showChevron={false} value={type} onChange={(event) => setType(event.target.value)} className={selectClass} aria-label="نوع پیام">{TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</SelectField></div>
            <div className="messaging-filter-cell"><SelectField controlOnly unstyled showChevron={false} value={status} onChange={(event) => setStatus(event.target.value)} className={selectClass} aria-label="وضعیت پیام">{STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</SelectField></div>
            <div className="messaging-filter-cell"><SelectField controlOnly unstyled showChevron={false} value={channel} onChange={(event) => setChannel(event.target.value)} className={selectClass} aria-label="کانال پیام">{CHANNEL_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</SelectField></div>
          </>
        ) : null}

        <div className="messaging-filter-cell"><SelectField controlOnly unstyled showChevron={false} value={support} onChange={(event) => setSupport(event.target.value)} className={selectClass} aria-label="وضعیت بررسی">{SUPPORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</SelectField></div>
        <div className="messaging-filter-cell messaging-filter-cell--date">{dateRange}</div>
        <div className="messaging-filter-cell messaging-filter-cell--actions">
          <button type="button" className={`${ghostButton} messaging-btn--clear`} onClick={clearFilters}><i className="fa-solid fa-filter-circle-xmark" /> پاکسازی فیلترها</button>
        </div>
      </section>

      <section className="messaging-center-v2__list-card">
        <header>
          <div>
            <h2>{tab === 'outbox' ? 'صف ارسال چندکاناله' : 'پیام‌های دریافتی تلگرام'}</h2>
            <p>نمایش {rangeStart.toLocaleString('fa-IR')} تا {rangeEnd.toLocaleString('fa-IR')} از {pagination.total.toLocaleString('fa-IR')} رکورد واقعی</p>
          </div>
          {tab === 'outbox' ? <span><i className="fa-solid fa-circle-info" /> آمار از کل نتایج فیلترشده محاسبه می‌شود.</span> : null}
        </header>

        {isLoading ? (
          <div className="messaging-center-v2__state"><i className="fa-solid fa-spinner fa-spin" /><strong>در حال دریافت داده‌ها</strong><small>صف پیام‌رسانی از سرور خوانده می‌شود.</small></div>
        ) : (tab === 'outbox' ? !outbox.length : !inbox.length) ? (
          <div className="messaging-center-v2__state"><i className="fa-regular fa-inbox" /><strong>رکوردی مطابق فیلتر فعلی وجود ندارد</strong><small>فیلترها را پاک کنید یا پیام جدیدی در صف قرار دهید.</small></div>
        ) : tab === 'outbox' ? (
          <div className="outbox-table-shell messaging-table-shell">
            <table className="outbox-responsive-table messaging-table">
              <colgroup>
                <col className="messaging-table__col-index" />
                <col className="messaging-table__col-message" />
                <col className="messaging-table__col-recipient" />
                <col className="messaging-table__col-channel" />
                <col className="messaging-table__col-status" />
                <col className="messaging-table__col-time" />
                <col className="messaging-table__col-actions" />
              </colgroup>
              <thead><tr><th className="messaging-table__col-index">ردیف</th><th>پیام</th><th>گیرنده</th><th>کانال</th><th>وضعیت</th><th>زمان</th><th className="messaging-table__col-actions">عملیات</th></tr></thead>
              <tbody>
                {outbox.map((row, index) => {
                  const messageType = typeBadge(row.messageType, row.text, row.eventType);
                  const messageChannel = channelMeta(row);
                  const messageStatus = statusBadge(row);
                  return (
                    <tr key={row.id}>
                      <td data-label="ردیف" className="messaging-table__cell-index">{(pagination.offset + index + 1).toLocaleString('fa-IR')}</td>
                      <td data-label="پیام"><div className="messaging-table__primary"><strong>{messageType.label}</strong><small>{messageType.reason}</small></div></td>
                      <td data-label="گیرنده"><div className="messaging-table__primary"><strong>{outboxCustomerName(row)}</strong><small dir="ltr">{outboxCustomerPhone(row) || row.chatId || '—'}</small></div></td>
                      <td data-label="کانال"><span className={`messaging-chip ${messageChannel.cls}`}><i className={messageChannel.icon} />{messageChannel.label}</span></td>
                      <td data-label="وضعیت"><span className={`messaging-chip ${messageStatus.cls}`}><i className={`fa-solid ${messageStatus.icon} ${row.status === 'processing' ? 'fa-spin' : ''}`} />{messageStatus.label}</span></td>
                      <td data-label="زمان"><time>{toFaDT(row.createdAt)}</time></td>
                      <td data-label="عملیات" className="messaging-table__cell-actions"><div className="messaging-row-actions">
                        <button type="button" className={iconButton} title="مشاهده جزئیات" onClick={() => { setSelectedOutbox(row); setDetailModalTab('outbox'); }}><i className="fa-regular fa-eye" /></button>
                        {(row.status === 'failed' || row.status === 'pending') ? <button type="button" className={iconButton} title="ارسال مجدد" disabled={busyId === row.id} onClick={() => void retryOne(row)}><i className={`fa-solid fa-arrows-rotate ${busyId === row.id ? 'fa-spin' : ''}`} /></button> : null}
                      </div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="outbox-table-shell messaging-table-shell">
            <table className="outbox-responsive-table messaging-table">
              <colgroup>
                <col className="messaging-table__col-index" />
                <col className="messaging-table__col-message" />
                <col className="messaging-table__col-recipient" />
                <col className="messaging-table__col-channel" />
                <col className="messaging-table__col-status" />
                <col className="messaging-table__col-time" />
                <col className="messaging-table__col-actions" />
              </colgroup>
              <thead><tr><th className="messaging-table__col-index">ردیف</th><th>پیام دریافتی</th><th>مشتری</th><th>نوع</th><th>اتصال</th><th>زمان</th><th className="messaging-table__col-actions">عملیات</th></tr></thead>
              <tbody>
                {inbox.map((row, index) => {
                  const linked = Boolean(row.customerId);
                  return (
                    <tr key={row.id}>
                      <td data-label="ردیف" className="messaging-table__cell-index">{(pagination.offset + index + 1).toLocaleString('fa-IR')}</td>
                      <td data-label="پیام دریافتی"><div className="messaging-table__primary"><strong>{textLine(row.text, 110) || inboxKindLabel(row.kind)}</strong><small dir="ltr">Chat ID: {row.chatId || '—'}</small></div></td>
                      <td data-label="مشتری"><div className="messaging-table__primary"><strong>{row.customerName || 'بدون مشتری'}</strong><small dir="ltr">{row.customerPhone || '—'}</small></div></td>
                      <td data-label="نوع"><span className="messaging-chip is-neutral"><i className="fa-solid fa-envelope-open-text" />{inboxKindLabel(row.kind)}</span></td>
                      <td data-label="مقصد ارسال"><span className={`messaging-chip ${linked ? 'is-success' : 'is-warning'}`}><i className={`fa-solid ${linked ? 'fa-paper-plane' : 'fa-circle-exclamation'}`} />{linked ? 'مقصد ثبت‌شده' : 'بدون مقصد'}</span></td>
                      <td data-label="زمان"><time>{toFaDT(row.createdAt)}</time></td>
                      <td data-label="عملیات" className="messaging-table__cell-actions"><div className="messaging-row-actions">
                        <button type="button" className={iconButton} title="مشاهده جزئیات" onClick={() => { setSelectedInbox(row); setDetailModalTab('inbox'); }}><i className="fa-regular fa-eye" /></button>
                        {!linked ? <button type="button" className={iconButton} title="اتصال به مشتری" onClick={async () => { await ensureCustomersLoaded(); setLinkUI({ open: true, chatId: String(row.chatId || ''), fromId: String(row.fromId || '') }); }}><i className="fa-solid fa-link" /></button> : null}
                      </div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <footer className="messaging-pagination">
          <span>صفحه {safePage.toLocaleString('fa-IR')} از {totalPages.toLocaleString('fa-IR')}</span>
          <div>
            <button type="button" className={ghostButton} disabled={safePage <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>قبلی</button>
            {pages.map((item) => <button key={item} type="button" data-active={item === safePage} onClick={() => setPage(item)}>{item.toLocaleString('fa-IR')}</button>)}
            <button type="button" className={ghostButton} disabled={safePage >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>بعدی</button>
          </div>
        </footer>
      </section>

      <DialogShell
        isOpen={detailModalTab === 'outbox' && Boolean(selectedOutbox)}
        onClose={() => setDetailModalTab(null)}
        overlayClassName="outbox-detail-modal-backdrop messaging-modal-backdrop"
        panelClassName="outbox-detail-modal-card outbox-detail-modal-card-compact messaging-detail-modal"
        panelAttributes={{ 'data-ui-messaging-detail': 'compact' }}
        ariaLabel="جزئیات پیام خروجی"
        motion="fade"
      >
        {selectedOutbox ? (() => {
        const messageType = typeBadge(selectedOutbox.messageType, selectedOutbox.text, selectedOutbox.eventType);
        const messageStatus = statusBadge(selectedOutbox);
        const messageChannel = channelMeta(selectedOutbox);
        return (
          <>
              <header className="messaging-detail-modal__header">
                <div><span><i className="fa-regular fa-message" /></span><div><h2>جزئیات پیام</h2><p>رکورد واقعی صف ارسال و وضعیت پردازش</p></div></div>
                <button type="button" className={iconButton} onClick={() => setDetailModalTab(null)} aria-label="بستن"><i className="fa-solid fa-xmark" /></button>
              </header>
              <div className="outbox-detail-card outbox-detail-modal-landscape outbox-detail-modal-outbox">
                <div className="outbox-detail-summary">
                  <div className="outbox-detail-summary-main"><div className="outbox-detail-kicker"><i className={`fa-solid ${messageType.icon}`} />نوع پیام</div><div className="outbox-detail-message-type">{messageType.label}</div><div className="outbox-detail-reason">{messageType.reason}</div></div>
                  <span className={`messaging-chip ${messageStatus.cls}`}><i className={`fa-solid ${messageStatus.icon}`} />{messageStatus.label}</span>
                </div>
                <div className="outbox-detail-meta-grid outbox-detail-modal-meta-grid">
                  <div className="outbox-detail-meta"><span><i className="fa-regular fa-user" />گیرنده</span><strong>{outboxCustomerName(selectedOutbox)}</strong></div>
                  <div className="outbox-detail-meta"><span><i className="fa-solid fa-address-card" />مقصد</span><strong dir="ltr">{outboxCustomerPhone(selectedOutbox) || selectedOutbox.chatId || '—'}</strong></div>
                  <div className="outbox-detail-meta"><span><i className={messageChannel.icon} />کانال</span><strong>{messageChannel.label}</strong></div>
                  <div className="outbox-detail-meta"><span><i className="fa-regular fa-clock" />زمان ثبت</span><strong>{toFaDT(selectedOutbox.createdAt)}</strong></div>
                </div>
                <div className="outbox-detail-message-box"><div className="outbox-detail-section-title"><i className="fa-regular fa-file-lines" />محتوای ثبت‌شده</div><div className="outbox-detail-message-text outbox-detail-modal-message-text">{cleanMessageText(selectedOutbox.text) || 'برای این پیام متن آزاد ثبت نشده و ارسال از طریق الگوی سرویس‌دهنده انجام شده است.'}</div></div>
                {selectedOutbox.status === 'failed' ? <div className="outbox-detail-error"><i className="fa-solid fa-circle-info" />{errorReasonFa(selectedOutbox.errorKind)} — {selectedOutbox.error || 'جزئیات بیشتری ثبت نشده است.'}</div> : null}
                <div className="outbox-detail-actions">
                  {(selectedOutbox.status === 'failed' || selectedOutbox.status === 'pending') ? <button type="button" className={primaryButton} disabled={busyId === selectedOutbox.id} onClick={() => void retryOne(selectedOutbox)}><i className={`fa-solid fa-arrows-rotate ${busyId === selectedOutbox.id ? 'fa-spin' : ''}`} /> ارسال مجدد</button> : null}
                  {selectedOutbox.channel === 'telegram' ? <button type="button" className={ghostButton} disabled={busyId === selectedOutbox.id} onClick={() => void sendCheck(selectedOutbox)}><i className="fa-regular fa-circle-check" /> تست تلگرام</button> : null}
                </div>
              </div>
          </>
        );
        })() : null}
      </DialogShell>

      <DialogShell
        isOpen={detailModalTab === 'inbox' && Boolean(selectedInbox)}
        onClose={() => setDetailModalTab(null)}
        overlayClassName="outbox-detail-modal-backdrop messaging-modal-backdrop"
        panelClassName="outbox-detail-modal-card outbox-detail-modal-card-compact messaging-detail-modal"
        panelAttributes={{ 'data-ui-messaging-detail': 'compact' }}
        ariaLabel="جزئیات پیام دریافتی"
        motion="fade"
      >
        {selectedInbox ? (
          <>
            <header className="messaging-detail-modal__header">
              <div><span><i className="fa-solid fa-inbox" /></span><div><h2>جزئیات پیام دریافتی</h2><p>متن دریافتی و وضعیت اتصال به پرونده مشتری</p></div></div>
              <button type="button" className={iconButton} onClick={() => setDetailModalTab(null)} aria-label="بستن"><i className="fa-solid fa-xmark" /></button>
            </header>
            <div className="outbox-detail-card outbox-detail-modal-landscape outbox-detail-modal-inbox">
              <div className="outbox-detail-meta-grid outbox-detail-modal-meta-grid">
                <div className="outbox-detail-meta"><span><i className="fa-regular fa-user" />مشتری</span><strong>{selectedInbox.customerName || 'بدون مشتری'}</strong></div>
                <div className="outbox-detail-meta"><span><i className="fa-brands fa-telegram" />Chat ID</span><strong dir="ltr">{selectedInbox.chatId || '—'}</strong></div>
                <div className="outbox-detail-meta"><span><i className="fa-solid fa-envelope-open-text" />نوع</span><strong>{inboxKindLabel(selectedInbox.kind)}</strong></div>
                <div className="outbox-detail-meta"><span><i className="fa-regular fa-clock" />زمان دریافت</span><strong>{toFaDT(selectedInbox.createdAt)}</strong></div>
              </div>
              <div className="outbox-detail-message-box"><div className="outbox-detail-section-title"><i className="fa-regular fa-file-lines" />متن پیام</div><div className="outbox-detail-message-text outbox-detail-modal-message-text">{cleanMessageText(selectedInbox.text) || 'این ورودی شامل اطلاعات تماس یا payload غیرمتنی است.'}</div></div>
              {!selectedInbox.customerId ? <div className="outbox-detail-actions"><button type="button" className={primaryButton} onClick={async () => { await ensureCustomersLoaded(); setLinkUI({ open: true, chatId: String(selectedInbox.chatId || ''), fromId: String(selectedInbox.fromId || '') }); }}><i className="fa-solid fa-paper-plane" /> ذخیره مقصد ارسال</button></div> : null}
            </div>
          </>
        ) : null}
      </DialogShell>

      <DialogShell
        isOpen={linkUI.open}
        onClose={() => setLinkUI({ open: false, chatId: '', fromId: '' })}
        overlayClassName="messaging-link-modal-backdrop"
        panelClassName="messaging-link-modal"
        ariaLabel="ذخیره مقصد ارسال تلگرام برای مشتری"
        motion="fade"
      >
            <header><div><span><i className="fa-solid fa-paper-plane" /></span><div><h2>ذخیره مقصد ارسال تلگرام</h2><p>این Chat ID فقط برای ارسال ذخیره می‌شود و دسترسی ایجاد نمی‌کند.</p><p dir="ltr">Chat ID: {linkUI.chatId || '—'}</p></div></div><button type="button" className={iconButton} onClick={() => setLinkUI({ open: false, chatId: '', fromId: '' })}><i className="fa-solid fa-xmark" /></button></header>
            <div className="messaging-link-modal__search"><i className="fa-solid fa-magnifying-glass" /><TextField controlOnly unstyled value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} className={inputClass} placeholder="جستجو با نام، شماره یا شناسه" /><span>{allCustomers.length.toLocaleString('fa-IR')} مشتری</span></div>
            <div className="messaging-link-modal__list">
              {filteredCustomers.map((customer) => <button key={customer.id} type="button" onClick={() => void linkCustomer(Number(customer.id), linkUI.chatId)}><span><strong>{customer.fullName || `مشتری #${customer.id}`}</strong><small dir="ltr">{customer.phoneNumber || '—'} • ID {customer.id}</small></span><em>ذخیره مقصد</em></button>)}
            </div>
      </DialogShell>

      <MessageComposerModal open={composerOpen} onClose={() => setComposerOpen(false)} onQueued={() => { setComposerOpen(false); void fetchOutbox(); }} initialChannels={{ sms: true, telegram: false }} />
    </main>
  );
}
