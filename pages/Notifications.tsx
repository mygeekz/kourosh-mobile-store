// pages/Notifications.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../utils/apiFetch';
import { NotificationMessage, UnifiedNotificationItem } from '../types';
import Notification from '../components/Notification';
import ExportMenu from '../components/ExportMenu';
import MessageComposerModal from '../components/MessageComposerModal';
import { useAuth } from '../contexts/AuthContext';
import { exportToExcel, exportToPdfTable } from '../utils/exporters';

type NotificationCategory = 'all' | 'finance' | 'sales' | 'customers' | 'inventory' | 'services' | 'system';
type QueueFilter = 'active' | 'urgent' | 'today' | 'actionable' | 'archived';
type Severity = 'critical' | 'warning' | 'normal' | 'low';

const PAGE_SIZE = 8;

type OutboxRow = {
  id: number;
  channel?: string;
  recipient?: string;
  subject?: string;
  body?: string;
  status?: string;
  attempts?: number;
  error?: string;
  createdAt?: string;
  updatedAt?: string;
};

const toRouterPath = (urlOrPath?: string | null): string => {
  if (!urlOrPath) return '/';
  try {
    const u = new URL(urlOrPath, window.location.origin);
    if (u.hash && u.hash.startsWith('#/')) return u.hash.slice(1);
    return (u.pathname || '/') + (u.search || '');
  } catch {
    if (urlOrPath.startsWith('#/')) return urlOrPath.slice(1);
    return urlOrPath.startsWith('/') ? urlOrPath : `/${urlOrPath}`;
  }
};

const asFa = (value: number | string | null | undefined) => Number(value || 0).toLocaleString('fa-IR');
const asText = (value: unknown) => String(value ?? '').trim();
const formatFaDateTime = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('fa-IR', { hour: '2-digit', minute: '2-digit', year: 'numeric', month: '2-digit', day: '2-digit' });
};

const TYPE_LABELS: Record<string, string> = {
  CollectionFollowup: 'وصول مطالبات',
  SmartInstallmentAlert: 'اقساط هوشمند',
  SmartCheckAlert: 'چک هوشمند',
  OverdueInstallment: 'قسط معوق',
  InstallmentDue: 'سررسید قسط',
  CheckDue: 'سررسید چک',
  RecurringExpenseDue: 'هزینه تکرارشونده',
  RecurringExpenseAlert: 'هزینه تکرارشونده',
  CustomerFollowup: 'پیگیری مشتری',
  FollowupAlert: 'پیگیری مشتری',
  RepairReady: 'تعمیر آماده',
  StockAlert: 'موجودی کم',
  StagnantStock: 'انبار راکد',
  NegativeMarginAlert: 'سود منفی',
};

const CATEGORY_META: Record<NotificationCategory, { label: string; icon: string; accent: string }> = {
  all: { label: 'همه اعلان‌ها', icon: 'fa-comments', accent: 'emerald' },
  finance: { label: 'مالی و سررسیدها', icon: 'fa-money-check-dollar', accent: 'green' },
  sales: { label: 'فروش و سود', icon: 'fa-cart-shopping', accent: 'blue' },
  customers: { label: 'مشتریان و وصول', icon: 'fa-users', accent: 'violet' },
  inventory: { label: 'انبار', icon: 'fa-box-open', accent: 'amber' },
  services: { label: 'تعمیرات و خدمات', icon: 'fa-screwdriver-wrench', accent: 'sky' },
  system: { label: 'سیستمی', icon: 'fa-gear', accent: 'slate' },
};

const QUEUE_META: Record<QueueFilter, { label: string; icon: string }> = {
  active: { label: 'فعال', icon: 'fa-inbox' },
  urgent: { label: 'فوری', icon: 'fa-triangle-exclamation' },
  today: { label: 'امروز', icon: 'fa-calendar-day' },
  actionable: { label: 'دارای اقدام', icon: 'fa-bolt' },
  archived: { label: 'انجام‌شده', icon: 'fa-box-archive' },
};


const HEADER_TAB_META: Record<'active' | 'urgent' | 'archived', { label: string; icon: string; caption: string }> = {
  active: { label: 'همه اعلان‌ها', icon: 'fa-layer-group', caption: 'نمای کامل اعلان‌های جاری' },
  urgent: { label: 'نیازمند توجه', icon: 'fa-triangle-exclamation', caption: 'موارد بحرانی و فوری' },
  archived: { label: 'آرشیو', icon: 'fa-box-archive', caption: 'انجام‌شده و بایگانی' },
};

const getCategoryKey = (item: UnifiedNotificationItem): NotificationCategory => {
  const type = String(item.type || '');
  if (['OverdueInstallment', 'InstallmentDue', 'CheckDue', 'SmartInstallmentAlert', 'SmartCheckAlert', 'RecurringExpenseDue', 'RecurringExpenseAlert'].includes(type)) return 'finance';
  if (['CollectionFollowup', 'CustomerFollowup', 'FollowupAlert'].includes(type)) return 'customers';
  if (['StockAlert', 'StagnantStock'].includes(type)) return 'inventory';
  if (['RepairReady'].includes(type)) return 'services';
  if (['NegativeMarginAlert'].includes(type) || /فروش|فاکتور|سود/.test(`${item.title} ${item.description}`)) return 'sales';
  return 'system';
};

const getSeverity = (item: UnifiedNotificationItem): Severity => {
  const type = String(item.type || '');
  const title = `${item.title || ''} ${item.description || ''}`;
  if (item.priority === 'High') return 'critical';
  if (type === 'OverdueInstallment' || type === 'CollectionFollowup' || title.includes('معوق') || title.includes('عقب')) return 'critical';
  if (type === 'CheckDue' && Number(item.daysRemaining ?? 99) <= 0) return 'critical';
  if (type === 'InstallmentDue' && Number(item.daysRemaining ?? 99) <= 0) return 'warning';
  if (item.priority === 'Medium') return 'warning';
  if (item.priority === 'Low') return 'low';
  return 'normal';
};

const getItemIcon = (item: UnifiedNotificationItem) => {
  const type = String(item.type || '');
  if (type === 'CollectionFollowup') return 'fa-file-invoice-dollar';
  if (type.includes('Followup')) return 'fa-user-clock';
  if (type.includes('Check')) return 'fa-money-check';
  if (type.includes('Installment') || type === 'OverdueInstallment') return 'fa-calendar-check';
  if (type.includes('Expense')) return 'fa-receipt';
  if (type.includes('Stock')) return 'fa-box-open';
  if (type.includes('Repair')) return 'fa-screwdriver-wrench';
  if (type.includes('Margin')) return 'fa-chart-line';
  return 'fa-bell';
};

const isUrgentItem = (item: UnifiedNotificationItem) => getSeverity(item) === 'critical' || getSeverity(item) === 'warning';
const isTodayItem = (item: UnifiedNotificationItem) => Number(item.daysRemaining ?? 99) === 0 || /امروز|همین امروز/.test(`${item.title || ''} ${item.description || ''}`);
const hasAction = (item: UnifiedNotificationItem) => Boolean(item.actionLink || item.targetId || item.eventType || (item as any)?.meta?.customerId);
const itemTypeLabel = (item: UnifiedNotificationItem) => TYPE_LABELS[String(item.type)] || String(item.type || 'اعلان');

const getCustomerIdFromItem = (item: UnifiedNotificationItem): number | null => {
  const metaId = (item as any)?.meta?.customerId;
  if (typeof metaId === 'number' && metaId > 0) return metaId;
  const link = (item as any)?.actionLink as string | undefined;
  if (link) {
    const m = link.match(/\/customers\/(\d+)/);
    if (m) return Number(m[1]);
  }
  return null;
};

const getNotificationRoute = (item: UnifiedNotificationItem): string | null => {
  if (item.actionLink) return toRouterPath(item.actionLink);
  const type = String(item.type || '');
  const customerId = getCustomerIdFromItem(item);
  if (customerId) return `/customers/${customerId}`;
  if (type.includes('Stock') || type === 'StagnantStock') return '/products';
  if (type.includes('Repair')) return '/repairs';
  if (type.includes('Expense')) return '/expenses';
  if (type.includes('Check') || type.includes('Installment') || type === 'OverdueInstallment') return '/sales/installments';
  if (type.includes('Margin') || /فروش|فاکتور|سود/.test(`${item.title || ''} ${item.description || ''}`)) return '/sales';
  return null;
};

const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.roleName === 'Admin' || currentUser?.roleName === 'Manager';
  const [items, setItems] = useState<UnifiedNotificationItem[]>([]);
  const [outbox, setOutbox] = useState<OutboxRow[]>([]);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<NotificationCategory>('all');
  const [queueFilter, setQueueFilter] = useState<QueueFilter>('active');
  const [priorityFilter, setPriorityFilter] = useState<'all' | Severity>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [smsModal, setSmsModal] = useState<{ open: boolean; text: string; phone: string; template: 'gentle'|'firm'|'formal'; source?: UnifiedNotificationItem | null }>({ open: false, text: '', phone: '', template: 'gentle', source: null });

  const buildCollectionNotifications = async (): Promise<UnifiedNotificationItem[]> => {
    try {
      const qs = new URLSearchParams();
      qs.set('level', 'all');
      qs.set('onlyUntouched', '1');
      const response = await apiFetch(`/api/reports/collection-center?${qs.toString()}`);
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result?.success === false) return [];
      const rows = Array.isArray(result?.data?.items) ? result.data.items : [];
      return rows.slice(0, 20).map((row: any) => ({
        id: `collection-followup-${row.sourceType || 'item'}-${row.orderId || row.id || row.customerId}`,
        type: 'CollectionFollowup' as any,
        title: `پیگیری وصول: ${row.customerName || 'مشتری'}`,
        description: [
          row.label ? `وضعیت: ${row.label}` : null,
          row.outstandingAmount ? `مانده: ${Number(row.outstandingAmount || 0).toLocaleString('fa-IR')} تومان` : null,
          row.dueDate ? `سررسید: ${row.dueDate}` : null,
          row.automation?.recommendedActionLabel ? `اقدام پیشنهادی: ${row.automation.recommendedActionLabel}` : null,
        ].filter(Boolean).join(' • '),
        priority: row.level === 'critical' ? 'High' : row.level === 'urgent' ? 'High' : 'Medium',
        actionText: 'باز کردن مرکز وصول',
        actionLink: '/reports/collection-center',
        meta: {
          customerId: Number(row.customerId || 0),
          customer: row.customerName,
          customerPhone: row.customerPhone,
          outstandingAmount: Number(row.outstandingAmount || 0),
          level: row.level,
          sourceType: row.sourceType,
          orderId: row.orderId,
        },
      })) as UnifiedNotificationItem[];
    } catch {
      return [];
    }
  };

  const fetchOutbox = async () => {
    if (!isAdmin) return;
    try {
      const response = await apiFetch('/api/notifications/outbox?status=ALL&limit=8');
      const result = await response.json().catch(() => ({}));
      if (response.ok && result?.success !== false && Array.isArray(result?.data)) {
        setOutbox(result.data);
      }
    } catch {
      setOutbox([]);
    }
  };

  const fetchItems = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiFetch('/api/notifications');
      const result = await response.json();
      if (!response.ok || result?.success === false) throw new Error(result?.message || 'خطا در دریافت اعلان‌ها');
      const baseItems = Array.isArray(result?.data) ? result.data : [];
      const collectionItems = await buildCollectionNotifications();
      setItems([...collectionItems, ...baseItems]);
      await fetchOutbox();
    } catch (err: any) {
      setError(err?.message || 'خطا در عملیاتی ناشناخته');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = async () => {
    setIsRefreshing(true);
    await fetchItems();
    setTimeout(() => setIsRefreshing(false), 300);
  };

  const activeItems = useMemo(() => items.filter((item) => !hiddenIds.has(String(item.id))), [items, hiddenIds]);
  const archivedItems = useMemo(() => items.filter((item) => hiddenIds.has(String(item.id))), [items, hiddenIds]);

  const categoryCounts = useMemo(() => {
    const base: Record<NotificationCategory, number> = { all: activeItems.length, finance: 0, sales: 0, customers: 0, inventory: 0, services: 0, system: 0 };
    activeItems.forEach((item) => { base[getCategoryKey(item)] += 1; });
    return base;
  }, [activeItems]);

  const visibleItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    const source = queueFilter === 'archived' ? archivedItems : activeItems;
    return source.filter((item) => {
      const cat = getCategoryKey(item);
      const severity = getSeverity(item);
      if (categoryFilter !== 'all' && cat !== categoryFilter) return false;
      if (queueFilter === 'urgent' && !isUrgentItem(item)) return false;
      if (queueFilter === 'today' && !isTodayItem(item)) return false;
      if (queueFilter === 'actionable' && !hasAction(item)) return false;
      if (priorityFilter !== 'all' && severity !== priorityFilter) return false;
      if (!q) return true;
      const meta = (item as any)?.meta || {};
      const hay = `${item.title ?? ''} ${item.description ?? ''} ${meta.customer ?? ''} ${meta.customerPhone ?? ''} ${meta.dueDate ?? ''} ${itemTypeLabel(item)}`.toLowerCase();
      return hay.includes(q);
    });
  }, [activeItems, archivedItems, categoryFilter, priorityFilter, query, queueFilter]);

  const totalPages = Math.max(1, Math.ceil(visibleItems.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pagedItems = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE;
    return visibleItems.slice(start, start + PAGE_SIZE);
  }, [visibleItems, safeCurrentPage]);
  const pageStartIndex = visibleItems.length ? (safeCurrentPage - 1) * PAGE_SIZE + 1 : 0;
  const pageEndIndex = visibleItems.length ? Math.min(safeCurrentPage * PAGE_SIZE, visibleItems.length) : 0;

  useEffect(() => {
    setCurrentPage(1);
  }, [query, categoryFilter, queueFilter, priorityFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (!pagedItems.length) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !pagedItems.some((item) => String(item.id) === String(selectedId))) {
      setSelectedId(String(pagedItems[0].id));
    }
  }, [selectedId, pagedItems]);

  const selectedItem = useMemo(() => pagedItems.find((item) => String(item.id) === String(selectedId)) || pagedItems[0] || null, [selectedId, pagedItems]);

  const outboxStats = useMemo(() => {
    const pending = outbox.filter((row) => String(row.status || '').toLowerCase() === 'pending').length;
    const failed = outbox.filter((row) => String(row.status || '').toLowerCase() === 'failed').length;
    return { pending, failed };
  }, [outbox]);

  const stats = useMemo(() => {
    const urgent = activeItems.filter(isUrgentItem).length;
    const today = activeItems.filter(isTodayItem).length;
    const actionable = activeItems.filter(hasAction).length;
    return [
      { key: 'urgent', label: 'فوری', value: urgent, hint: 'نیازمند تصمیم', icon: 'fa-triangle-exclamation' },
      { key: 'today', label: 'امروز', value: today, hint: 'سررسید یا پیگیری', icon: 'fa-calendar-day' },
      { key: 'failed', label: 'ارسال ناموفق', value: outboxStats.failed, hint: 'نیازمند تلاش مجدد', icon: 'fa-circle-exclamation' },
      { key: 'actionable', label: 'دارای اقدام', value: actionable, hint: 'قابل ارسال/پیگیری', icon: 'fa-bolt' },
      { key: 'all', label: 'کل اعلان‌ها', value: activeItems.length, hint: 'در Inbox فعال', icon: 'fa-bell' },
    ];
  }, [activeItems, outboxStats.failed]);

  const exportBase = `notifications-${new Date().toISOString().slice(0, 10)}`;
  const exportRows = visibleItems.map((item) => ({
    title: item.title,
    description: item.description ?? '',
    type: itemTypeLabel(item),
    severity: getSeverity(item),
    category: CATEGORY_META[getCategoryKey(item)].label,
    due: (item as any)?.meta?.dueDate ?? '',
    customer: (item as any)?.meta?.customer ?? '',
    phone: (item as any)?.meta?.customerPhone ?? '',
  }));

  const doExportExcel = () => {
    exportToExcel(
      `${exportBase}.xlsx`,
      exportRows,
      [
        { header: 'عنوان', key: 'title' },
        { header: 'توضیحات', key: 'description' },
        { header: 'نوع', key: 'type' },
        { header: 'اهمیت', key: 'severity' },
        { header: 'دسته', key: 'category' },
        { header: 'سررسید', key: 'due' },
        { header: 'مشتری', key: 'customer' },
        { header: 'موبایل', key: 'phone' },
      ],
      'Notifications',
    );
  };

  const doExportPdf = () => {
    exportToPdfTable({
      filename: `${exportBase}.pdf`,
      title: 'مرکز اعلان‌ها',
      head: ['عنوان', 'نوع', 'دسته', 'مشتری', 'سررسید'],
      body: exportRows.map((r) => [String(r.title ?? ''), String(r.type ?? ''), String(r.category ?? ''), String(r.customer ?? ''), String(r.due ?? '')]),
    });
  };

  const triggerSms = async (targetId: number, eventType: string) => {
    const response = await apiFetch('/api/sms/trigger-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetId, eventType }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result?.success === false) throw new Error(result?.message || 'خطا در ارسال پیامک');
    return result;
  };

  const triggerTelegram = async (targetId: number, eventType: string) => {
    const response = await apiFetch('/api/telegram/trigger-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetId, eventType }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result?.success === false) throw new Error(result?.message || 'خطا در ارسال تلگرام');
    return result;
  };

  const sendSms = async (item: UnifiedNotificationItem) => {
    if (!item.targetId || !item.eventType) {
      openSmsModal(item);
      return;
    }
    setSendingId(String(item.id));
    setNotification(null);
    try {
      await triggerSms(item.targetId, item.eventType);
      setNotification({ type: 'success', text: 'پیامک با موفقیت ارسال شد.' });
      await fetchOutbox();
    } catch (err: any) {
      setNotification({ type: 'error', text: err?.message || 'خطا در ارسال پیامک' });
    } finally {
      setSendingId(null);
    }
  };

  const sendTelegram = async (item: UnifiedNotificationItem) => {
    if (!item.targetId || !item.eventType) return;
    setSendingId(String(item.id));
    setNotification(null);
    try {
      await triggerTelegram(item.targetId, item.eventType);
      setNotification({ type: 'success', text: 'تلگرام با موفقیت ارسال شد.' });
      await fetchOutbox();
    } catch (err: any) {
      setNotification({ type: 'error', text: err?.message || 'خطا در ارسال تلگرام' });
    } finally {
      setSendingId(null);
    }
  };

  const archiveNotification = async (item: UnifiedNotificationItem) => {
    const id = String(item.id);
    setHiddenIds((prev) => new Set([...prev, id]));
    setNotification({ type: 'success', text: 'اعلان انجام‌شده شد.' });
    try {
      await apiFetch(`/api/notifications/${encodeURIComponent(id)}/dismiss`, { method: 'POST' });
      window.dispatchEvent(new CustomEvent('kourosh:notifications-updated', { detail: { id, action: 'dismiss' } }));
      window.dispatchEvent(new CustomEvent('kourosh:header-quick-refresh'));
    } catch {
      // Local archive still keeps the workflow non-blocking.
    }
  };

  const restoreNotification = (item: UnifiedNotificationItem) => {
    const id = String(item.id);
    setHiddenIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const archiveVisible = () => {
    if (!visibleItems.length) return;
    const ids = visibleItems.map((item) => String(item.id));
    setHiddenIds((prev) => new Set([...prev, ...ids]));
    setNotification({ type: 'success', text: `${asFa(ids.length)} اعلان انجام‌شده شد.` });
  };

  const createSmartFollowup = async (item: UnifiedNotificationItem, daysFromNow: number) => {
    const customerId = getCustomerIdFromItem(item);
    if (!customerId) {
      setNotification({ message: 'شناسه مشتری پیدا نشد.', type: 'error' });
      return;
    }
    try {
      const d = new Date();
      d.setDate(d.getDate() + daysFromNow);
      d.setHours(23, 59, 59, 999);
      const note = `پیگیری اعلان: ${item.title}${item.description ? ' — ' + item.description : ''}`;
      const res = await apiFetch(`/api/customers/${customerId}/followups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note, nextFollowupDate: d.toISOString() }),
      });
      const js = await res.json();
      if (!res.ok || js?.success === false) throw new Error(js?.message || 'خطا در ثبت پیگیری');
      setNotification({ message: 'پیگیری ثبت شد.', type: 'success' });
    } catch (e: any) {
      setNotification({ message: e?.message || 'خطا در عملیات', type: 'error' });
    }
  };

  const buildSmsText = (item: UnifiedNotificationItem, template: 'gentle'|'firm'|'formal') => {
    const customer = (item as any)?.meta?.customer || '';
    const header = `یادآوری${customer ? ` برای ${customer}` : ''}`;
    const body = `${item.title}${item.description ? '\n' + item.description : ''}`;
    const closing = template === 'gentle'
      ? 'اگر امکانش هست، لطفاً در اولین فرصت بررسی بفرمایید. سپاس 🙏'
      : template === 'firm'
        ? 'لطفاً در اسرع وقت نسبت به بررسی و اقدام لازم هماهنگی بفرمایید.'
        : 'خواهشمند است در اولین فرصت نسبت به اقدام لازم پیگیری فرمایید. با تشکر.';
    return `${header}\n${body}\n\n${closing}`;
  };

  const openSmsModal = (item: UnifiedNotificationItem) => {
    const phone = String((item as any)?.meta?.customerPhone || '');
    const template: 'gentle'|'firm'|'formal' = 'gentle';
    setSmsModal({ open: true, phone, template, text: buildSmsText(item, template), source: item });
  };

  const copySms = async () => {
    try {
      await navigator.clipboard.writeText(smsModal.text);
      setNotification({ message: 'متن پیامک کپی شد.', type: 'success' });
    } catch {
      setNotification({ message: 'کپی نشد. دستی کپی کنید.', type: 'error' });
    }
  };

  const openSmsLink = (platform: 'android' | 'ios') => {
    const phone = String(smsModal.phone || '').trim();
    const body = encodeURIComponent(String(smsModal.text || ''));
    window.location.href = platform === 'android' ? `sms:${phone || ''}?body=${body}` : `sms:${phone || ''}&body=${body}`;
  };

  const retryOutbox = async (row: OutboxRow) => {
    try {
      const response = await apiFetch(`/api/notifications/outbox/${row.id}/retry`, { method: 'POST' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result?.success === false) throw new Error(result?.message || 'خطا در تلاش مجدد');
      setNotification({ type: 'success', text: 'پیام دوباره در صف ارسال قرار گرفت.' });
      await fetchOutbox();
    } catch (err: any) {
      setNotification({ type: 'error', text: err?.message || 'خطا در تلاش مجدد' });
    }
  };

  const renderSeverityPill = (item: UnifiedNotificationItem) => {
    const severity = getSeverity(item);
    const label = severity === 'critical' ? 'بحرانی' : severity === 'warning' ? 'فوری' : severity === 'low' ? 'کم‌اهمیت' : 'عادی';
    return <span className="notifications-saas-pill" data-severity={severity}>{label}</span>;
  };

  const renderItemMeta = (item: UnifiedNotificationItem) => {
    const meta = (item as any)?.meta || {};
    const pairs = [
      meta.customer ? { icon: 'fa-user', text: meta.customer } : null,
      meta.customerPhone ? { icon: 'fa-phone', text: meta.customerPhone } : null,
      meta.dueDate ? { icon: 'fa-calendar', text: meta.dueDate } : null,
      meta.amount ? { icon: 'fa-sack-dollar', text: `${asFa(meta.amount)} تومان` } : null,
      meta.outstandingAmount ? { icon: 'fa-wallet', text: `${asFa(meta.outstandingAmount)} تومان مانده` } : null,
    ].filter(Boolean) as Array<{ icon: string; text: string }>;
    if (!pairs.length) return null;
    return (
      <div className="notifications-saas-card__meta">
        {pairs.map((pair, index) => (
          <span key={`${pair.icon}-${index}`}><i className={`fa-solid ${pair.icon}`} />{pair.text}</span>
        ))}
      </div>
    );
  };

  const openNotificationTarget = (item: UnifiedNotificationItem) => {
    const target = getNotificationRoute(item);
    setSelectedId(String(item.id));
    if (target) {
      navigate(target);
      return;
    }
    setNotification({ type: 'warning', text: 'برای این اعلان مسیر مستقیمی ثبت نشده است؛ جزئیات آن در پنل کناری نمایش داده شد.' });
  };

  const renderList = () => {
    if (error) {
      return <div className="notifications-saas-state notifications-saas-state--error"><i className="fa-solid fa-triangle-exclamation" />{error}</div>;
    }
    if (!visibleItems.length) {
      return <div className="notifications-saas-state"><i className="fa-solid fa-circle-check" />اعلانی مطابق فیلتر فعلی وجود ندارد.</div>;
    }
    return (
      <div className="notifications-saas-list" data-ui-notifications-list="true">
        {pagedItems.map((item) => {
          const cat = getCategoryKey(item);
          const active = selectedItem && String(selectedItem.id) === String(item.id);
          return (
            <button
              key={String(item.id)}
              type="button"
              className="notifications-saas-card"
              data-active={active ? 'true' : 'false'}
              data-severity={getSeverity(item)}
              data-category={cat}
              onClick={() => openNotificationTarget(item)}
            >
              <span className="notifications-saas-card__dot" />
              <span className="notifications-saas-card__icon"><i className={`fa-solid ${getItemIcon(item)}`} /></span>
              <span className="notifications-saas-card__content">
                <span className="notifications-saas-card__topline">
                  <strong>{item.title}</strong>
                  <small>{itemTypeLabel(item)}</small>
                </span>
                {item.description ? <span className="notifications-saas-card__desc">{item.description}</span> : null}
                {renderItemMeta(item)}
              </span>
              <span className="notifications-saas-card__side">
                {renderSeverityPill(item)}
                <i className="fa-solid fa-chevron-left" />
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  const renderPagination = () => {
    if (visibleItems.length <= PAGE_SIZE) return null;
    const windowStart = Math.max(1, safeCurrentPage - 2);
    const windowEnd = Math.min(totalPages, windowStart + 4);
    const pages = [];
    for (let page = windowStart; page <= windowEnd; page += 1) pages.push(page);
    return (
      <div className="notifications-saas-pagination">
        <span className="notifications-saas-pagination__summary">نمایش {asFa(pageStartIndex)} تا {asFa(pageEndIndex)} از {asFa(visibleItems.length)} اعلان</span>
        <div className="notifications-saas-pagination__actions">
          <button type="button" onClick={() => setCurrentPage(Math.max(1, safeCurrentPage - 1))} disabled={safeCurrentPage === 1}>
            <i className="fa-solid fa-chevron-right" />
          </button>
          {pages.map((page) => (
            <button key={page} type="button" data-active={page === safeCurrentPage ? 'true' : 'false'} onClick={() => setCurrentPage(page)}>
              {asFa(page)}
            </button>
          ))}
          <button type="button" onClick={() => setCurrentPage(Math.min(totalPages, safeCurrentPage + 1))} disabled={safeCurrentPage === totalPages}>
            <i className="fa-solid fa-chevron-left" />
          </button>
        </div>
      </div>
    );
  };

  const renderDetails = () => {
    if (!selectedItem) {
      return <div className="notifications-saas-detail notifications-saas-detail--empty"><i className="fa-solid fa-bell-slash" />اعلانی برای نمایش انتخاب نشده است.</div>;
    }
    const meta = (selectedItem as any)?.meta || {};
    const cat = getCategoryKey(selectedItem);
    const category = CATEGORY_META[cat];
    const amountText = meta.amount || meta.outstandingAmount ? `${asFa(meta.amount || meta.outstandingAmount)} تومان` : '—';
    const customerText = meta.customer || '—';
    const dueText = meta.dueDate || (isTodayItem(selectedItem) ? 'امروز' : '—');
    return (
      <aside className="notifications-saas-detail" data-severity={getSeverity(selectedItem)} data-category={cat} data-type={String(selectedItem.type || '')}>
        <div className="notifications-saas-detail__hero">
          <span className="notifications-saas-detail__icon"><i className={`fa-solid ${getItemIcon(selectedItem)}`} /></span>
          <div className="notifications-saas-detail__hero-copy">
            <span className="notifications-saas-detail__eyebrow">{itemTypeLabel(selectedItem)}</span>
            <h2>{selectedItem.title}</h2>
            <div className="notifications-saas-detail__hero-meta">
              <span><i className={`fa-solid ${category.icon}`} />{category.label}</span>
              <span><i className="fa-solid fa-user" />{customerText}</span>
              <span><i className="fa-solid fa-calendar-day" />{dueText}</span>
            </div>
          </div>
        </div>

        <div className="notifications-saas-detail__hero-stats">
          <div>
            <span>مانده قابل پیگیری</span>
            <strong>{amountText}</strong>
          </div>
          <div>
            <span>سطح اهمیت</span>
            <strong>{renderSeverityPill(selectedItem)}</strong>
          </div>
        </div>

        <p className="notifications-saas-detail__description">{selectedItem.description || 'جزئیات تکمیلی برای این اعلان ثبت نشده است.'}</p>

        <div className="notifications-saas-detail__facts">
          <div><span>دسته</span><strong><i className={`fa-solid ${category.icon}`} />{category.label}</strong></div>
          <div><span>اهمیت</span><strong>{renderSeverityPill(selectedItem)}</strong></div>
          <div><span>مشتری</span><strong>{meta.customer || '—'}</strong></div>
          <div><span>تاریخ/سررسید</span><strong>{meta.dueDate || (isTodayItem(selectedItem) ? 'امروز' : '—')}</strong></div>
          <div><span>مبلغ</span><strong>{meta.amount || meta.outstandingAmount ? `${asFa(meta.amount || meta.outstandingAmount)} تومان` : '—'}</strong></div>
          <div><span>شماره تماس</span><strong>{meta.customerPhone || '—'}</strong></div>
        </div>

        <div className="notifications-saas-detail__actions">
          {selectedItem.actionLink ? (
            <Link to={toRouterPath(selectedItem.actionLink)} className="notifications-saas-primary-action">
              <i className="fa-solid fa-arrow-up-left-from-circle" />
              {selectedItem.actionText || 'مشاهده منبع'}
            </Link>
          ) : null}

          <button type="button" onClick={() => openSmsModal(selectedItem)}>
            <i className="fa-solid fa-message" />متن پیام
          </button>

          {selectedItem.targetId && selectedItem.eventType ? (
            <>
              <button type="button" onClick={() => sendSms(selectedItem)} disabled={sendingId === String(selectedItem.id)}>
                <i className="fa-solid fa-paper-plane" />پیامک مستقیم
              </button>
              <button type="button" onClick={() => sendTelegram(selectedItem)} disabled={sendingId === String(selectedItem.id)}>
                <i className="fa-brands fa-telegram" />تلگرام
              </button>
            </>
          ) : null}

          {getCustomerIdFromItem(selectedItem) ? (
            <button type="button" onClick={() => createSmartFollowup(selectedItem, 1)}>
              <i className="fa-solid fa-user-clock" />پیگیری فردا
            </button>
          ) : null}

          {queueFilter === 'archived' ? (
            <button type="button" onClick={() => restoreNotification(selectedItem)}>
              <i className="fa-solid fa-rotate-left" />بازگردانی
            </button>
          ) : (
            <button type="button" onClick={() => archiveNotification(selectedItem)}>
              <i className="fa-solid fa-check" />انجام شد
            </button>
          )}
        </div>

        <div className="notifications-saas-recommendation">
          <span><i className="fa-solid fa-wand-magic-sparkles" />پیشنهاد اقدام</span>
          <p>{isUrgentItem(selectedItem) ? 'این اعلان را قبل از بستن بررسی کن؛ در صورت نیاز پیام آماده را ویرایش و ارسال کن یا پیگیری ثبت کن.' : 'اگر اقدام لازم انجام شده، اعلان را انجام‌شده کن تا Inbox روزانه خلوت بماند.'}</p>
        </div>
      </aside>
    );
  };

  const renderOutbox = () => {
    if (!isAdmin) return null;
    const rows = outbox.slice(0, 4);
    const getStatusLabel = (status?: string) => {
      const normalized = String(status || '').toLowerCase();
      if (normalized === 'pending') return 'در انتظار ارسال';
      if (normalized === 'failed') return 'ناموفق';
      if (normalized === 'sent') return 'ارسال‌شده';
      if (normalized === 'processing') return 'در حال پردازش';
      return status || 'نامشخص';
    };
    return (
      <div className="notifications-saas-outbox">
        <div className="notifications-saas-outbox__head">
          <div>
            <strong><i className="fa-solid fa-tower-broadcast" />صف ارسال</strong>
            <p>آخرین پیام‌های در صف، با وضعیت روشن و قابل پیگیری.</p>
          </div>
        </div>
        <div className="notifications-saas-outbox__stats">
          <div className="notifications-saas-outbox__stat">
            <span>در انتظار</span>
            <strong>{asFa(outboxStats.pending)}</strong>
          </div>
          <div className="notifications-saas-outbox__stat" data-status="failed">
            <span>ناموفق</span>
            <strong>{asFa(outboxStats.failed)}</strong>
          </div>
        </div>
        {!rows.length ? (
          <p>پیامی در صف ارسال ثبت نشده است.</p>
        ) : rows.map((row) => {
          const status = String(row.status || '').toLowerCase();
          return (
            <div key={row.id} className="notifications-saas-outbox__row" data-status={status}>
              <div className="notifications-saas-outbox__row-head">
                <strong>{row.recipient || row.subject || 'بدون گیرنده'}</strong>
                <span className="notifications-saas-outbox__badge" data-status={status}>{getStatusLabel(row.status)}</span>
              </div>
              <div className="notifications-saas-outbox__meta">
                <span><i className="fa-solid fa-paper-plane" />{row.channel || 'پیام'}</span>
                <span><i className="fa-solid fa-clock" />{formatFaDateTime(row.updatedAt || row.createdAt)}</span>
              </div>
              {status === 'failed' ? (
                <button type="button" onClick={() => retryOutbox(row)}>تلاش مجدد</button>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="notifications-saas-page-shell notifications-saas-page-shell--mockup" dir="rtl" data-ui-page-shell="true" data-ui-notifications-saas="true">
      <div className="notifications-saas-frame">
        <header className="notifications-saas-frame__header">
          <div className="notifications-saas-brand">
            <span className="notifications-saas-brand__icon"><i className="fa-solid fa-bell" /></span>
            <div>
              <span className="notifications-saas-kicker"><i className="fa-solid fa-circle-question" /> نمای کاری</span>
              <h1>اعلان‌ها</h1>
              <p>مرکز یکپارچه اعلان‌های فروشگاه برای پیگیری، ارسال پیام، آرشیو و کنترل هشدارهای مهم.</p>
            </div>
          </div>
          <div className="notifications-saas-header-tabs" role="tablist" aria-label="وضعیت اعلان‌ها">
            {(['active', 'urgent', 'archived'] as const).map((tabKey) => {
              const isActive = tabKey === 'active'
                ? queueFilter !== 'archived' && queueFilter !== 'urgent'
                : queueFilter === tabKey;
              const count = tabKey === 'active'
                ? activeItems.length
                : tabKey === 'urgent'
                  ? activeItems.filter(isUrgentItem).length
                  : archivedItems.length;
              return (
                <button key={tabKey} type="button" data-active={isActive ? 'true' : 'false'} onClick={() => setQueueFilter(tabKey)}>
                  <span className="notifications-saas-header-tabs__icon"><i className={`fa-solid ${HEADER_TAB_META[tabKey].icon}`} /></span>
                  <span className="notifications-saas-header-tabs__copy">
                    <span className="notifications-saas-header-tabs__label">{HEADER_TAB_META[tabKey].label}</span>
                    <small>{HEADER_TAB_META[tabKey].caption}</small>
                  </span>
                  <strong>{asFa(count)}</strong>
                </button>
              );
            })}
          </div>
        </header>

        <section className="notifications-saas-commandbar" aria-label="ابزارهای اعلان‌ها">
          <div className="notifications-saas-commandbar__actions">
            <button type="button" className="notifications-saas-command notifications-saas-command--ghost" onClick={doExportPdf} disabled={!visibleItems.length}>
              <i className="fa-solid fa-file-pdf" /> خروجی PDF
            </button>
            <ExportMenu
              items={[
                { key: 'excel', label: 'Excel (XLSX)', icon: 'fa-file-excel', onClick: doExportExcel, disabled: visibleItems.length === 0 },
                { key: 'pdf', label: 'PDF (جدول)', icon: 'fa-file-pdf', onClick: doExportPdf, disabled: visibleItems.length === 0 },
              ]}
            />
            <button type="button" className="notifications-saas-command notifications-saas-command--primary" onClick={archiveVisible} disabled={!visibleItems.length || queueFilter === 'archived'}>
              <i className="fa-solid fa-check" /> علامت‌گذاری همه به انجام‌شده
            </button>
            <button type="button" className="notifications-saas-command notifications-saas-command--danger" onClick={() => setHiddenIds(new Set())} disabled={!archivedItems.length}>
              <i className="fa-solid fa-rotate-left" /> بازگردانی آرشیو
            </button>
          </div>
          <div className="notifications-saas-commandbar__tools">
            <button type="button" className="notifications-saas-command notifications-saas-command--soft" onClick={refresh}>
              <i className={`fa-solid fa-rotate-right ${isRefreshing ? 'animate-spin' : ''}`} /> {isRefreshing ? 'تازه‌سازی…' : 'تازه‌سازی'}
            </button>
            <button type="button" className="notifications-saas-command notifications-saas-command--soft" onClick={() => setIsComposerOpen(true)}>
              <i className="fa-solid fa-paper-plane" /> ارسال پیام
            </button>
          </div>
        </section>

        <section className="notifications-saas-filterbar">
          <div className="notifications-saas-search notifications-saas-search--wide">
            <i className="fa-solid fa-magnifying-glass" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="جستجو در عنوان یا متن اعلان…" />
          </div>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as NotificationCategory)} aria-label="نوع اعلان">
            {(Object.keys(CATEGORY_META) as NotificationCategory[]).map((key) => (
              <option key={key} value={key}>{CATEGORY_META[key].label}</option>
            ))}
          </select>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as any)} aria-label="وضعیت اهمیت">
            <option value="all">همه اهمیت‌ها</option>
            <option value="critical">بحرانی</option>
            <option value="warning">فوری</option>
            <option value="normal">عادی</option>
            <option value="low">کم‌اهمیت</option>
          </select>
          <div className="notifications-saas-mini-queues">
            {(Object.keys(QUEUE_META) as QueueFilter[]).map((key) => (
              <button key={key} type="button" data-active={queueFilter === key ? 'true' : 'false'} onClick={() => setQueueFilter(key)}>
                <i className={`fa-solid ${QUEUE_META[key].icon}`} />
                {QUEUE_META[key].label}
              </button>
            ))}
          </div>
        </section>

        {notification ? <Notification message={notification} onClose={() => setNotification(null)} /> : null}

        <section className="notifications-saas-workbench notifications-saas-workbench--mockup">
          <aside className="notifications-saas-categories notifications-saas-categories--mockup">
            <h2>دسته‌بندی‌ها</h2>
            {(Object.keys(CATEGORY_META) as NotificationCategory[]).map((key) => (
              <button key={key} type="button" data-active={categoryFilter === key ? 'true' : 'false'} data-accent={CATEGORY_META[key].accent} onClick={() => setCategoryFilter(key)}>
                <span><i className={`fa-solid ${CATEGORY_META[key].icon}`} />{CATEGORY_META[key].label}</span>
                <strong>{asFa(categoryCounts[key] || 0)}</strong>
              </button>
            ))}
            <div className="notifications-saas-category-summary notifications-saas-category-summary--mockup">
              <span>خلاصه اعلان‌ها</span>
              <p><span><i className="fa-solid fa-bell" />کل اعلان‌ها</span><strong>{asFa(activeItems.length)}</strong></p>
              <p><span><i className="fa-solid fa-triangle-exclamation" />خوانده‌نشده / مهم</span><strong>{asFa(activeItems.filter(isUrgentItem).length)}</strong></p>
              <p><span><i className="fa-solid fa-box-archive" />آرشیوشده</span><strong>{asFa(archivedItems.length)}</strong></p>
            </div>
          </aside>

          <main className="notifications-saas-main notifications-saas-main--mockup">
            <div className="notifications-saas-main__head">
              <div>
                <h2>لیست اعلان‌ها</h2>
                <p>نمایش {asFa(pageStartIndex)} تا {asFa(pageEndIndex)} از {asFa(queueFilter === 'archived' ? archivedItems.length : activeItems.length)} اعلان</p>
              </div>
              <span>{CATEGORY_META[categoryFilter].label}</span>
            </div>
            {isLoading ? (
              <div className="notifications-saas-state"><i className="fa-solid fa-spinner fa-spin" />در حال دریافت اعلان‌ها…</div>
            ) : (<>
              {renderList()}
              {renderPagination()}
            </>)}
          </main>

          <div className="notifications-saas-side notifications-saas-side--mockup">
            {renderDetails()}
            {renderOutbox()}
          </div>
        </section>
      </div>

      <MessageComposerModal
        open={isComposerOpen}
        onClose={() => setIsComposerOpen(false)}
        onQueued={() => {
          setNotification({ type: 'success', text: 'پیام در صف ارسال قرار گرفت.' });
          fetchOutbox();
        }}
      />

      {smsModal.open ? (
        <div className="notifications-saas-sms-backdrop" dir="rtl" data-ui-notifications-modal="sms-compose">
          <div className="notifications-saas-sms-modal">
            <div className="notifications-saas-sms-modal__head">
              <div>
                <span>پیش‌نمایش پیام</span>
                <strong>{smsModal.source?.title || 'متن پیام آماده'}</strong>
              </div>
              <button type="button" onClick={() => setSmsModal({ open: false, text: '', phone: '', template: 'gentle', source: null })}><i className="fa-solid fa-xmark" /></button>
            </div>
            <textarea value={smsModal.text} onChange={(e) => setSmsModal((prev) => ({ ...prev, text: e.target.value }))} />
            <div className="notifications-saas-sms-modal__actions">
              <button type="button" onClick={() => openSmsLink('android')}><i className="fa-brands fa-android" />Android</button>
              <button type="button" onClick={() => openSmsLink('ios')}><i className="fa-brands fa-apple" />iPhone</button>
              <button type="button" onClick={copySms}><i className="fa-solid fa-copy" />کپی متن</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );

};

export default NotificationsPage;
