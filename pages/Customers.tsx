// src/pages/Customers.tsx  (یا CustomersPage.tsx؛ مطابق روتینگ پروژه‌ات)
import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import moment from 'jalali-moment';
import { Link, useLocation } from 'react-router-dom';
import { Customer, NewCustomerData, NotificationMessage } from '../types';
import Notification from '../components/Notification';
import { DataTableShell, Dialog as Modal } from '@/components/ui';
import { ModalField } from '@/components/ui';
import { DialogActions as ModalActions } from '@/components/ui';
import FormErrorSummary from '../components/FormErrorSummary';
import { useAuth } from '../contexts/AuthContext';
import { getAuthHeaders } from '../utils/apiUtils';
import { apiFetch } from '../utils/apiFetch';
import ExportMenu from '../components/ExportMenu';
import { exportToExcel, exportToPdfTable } from '../utils/exporters';
import Skeleton from '../components/ui/Skeleton';
import { PageKit } from '@/components/ui';
import { printArea } from '../utils/printArea';
import MessageComposerModal from '../components/MessageComposerModal';
import Button from '../components/Button';
import { parseApiResult, runWithFeedback, humanizeErrorMessage } from '../utils/feedback';
import { focusErrorsSoon, isDuplicateMessage } from '../utils/formBehavior';
import { getBalanceBadgeClass, getBalanceLabel, getBalanceRowClass, getBalanceState } from '../utils/adaptiveUi';
import { PeopleDeleteConfirmContent, PeopleModalSummaryCard, PeopleZeroStateLanding } from '../components/people/PeopleUiKit';
import PeopleDirectoryOverview from '../components/people/PeopleDirectoryOverview';
import PeopleDirectoryToolbar from '../components/people/PeopleDirectoryToolbar';
import { formatCurrencyText, readStoredCurrencyUnit } from '../utils/currency';
import { SelectField, TextareaField, TextField } from '@/components/ui';
import { formatIsoToShamsiDateTime } from '../utils/dateUtils';
import CustomerRowActions from '../components/customers/CustomerRowActions';
type CustomerTrustListItem = {
  customerId: number;
  score: number;
  confidence: number;
  tier: 'excellent' | 'good' | 'medium' | 'risky' | 'unknown';
  tierLabel: string;
  suggestedCreditLimit: number;
  remainingSuggestedCredit: number;
  latePaymentCount: number;
  overdueUnpaidCount: number;
  returnedCheckCount: number;
  purchaseCount: number;
};

const getCustomerTrustTone = (score?: number | null) => {
  const s = Number(score || 0);
  if (s >= 82) return 'emerald';
  if (s >= 68) return 'blue';
  if (s >= 50) return 'amber';
  return 'rose';
};

const getCustomerTrustBadgeClass = (score?: number | null) => {
  const tone = getCustomerTrustTone(score);
  if (tone === 'emerald') return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200';
  if (tone === 'blue') return 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200';
  if (tone === 'amber') return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200';
  return 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200';
};


// رنگ موجودی با سازگاری دارک/لایت
const formatCurrency = (amount?: number, overdue = false) => {
  const state = getBalanceState(amount, { overdue });
  const n = Math.abs(Number(amount || 0)).toLocaleString('fa-IR');
  return (
    <span className={getBalanceBadgeClass(state)}>
      <i className={`fa-solid ${state === 'overdue' ? 'fa-triangle-exclamation' : state === 'negative' ? 'fa-arrow-trend-down' : state === 'positive' ? 'fa-arrow-trend-up' : 'fa-circle-check'}`} />
      {n} تومان · {getBalanceLabel(state, 'customer')}
    </span>
  );
};



type CustomerDueBadge = {
  label: string;
  icon: string;
  className: string;
  hint: string;
  dueDate?: string | null;
  saleId?: number;
  openCount?: number;
  countClassName?: string;
};

const getDueCountBadgeClassName = (openCount: number) => {
  if (openCount >= 5) {
    return 'bg-rose-600/90 text-white shadow-[0_6px_16px_-8px_rgba(225,29,72,0.95)] ring-1 ring-rose-500/30 dark:bg-rose-500/95 dark:text-rose-50 dark:ring-rose-400/30';
  }
  if (openCount >= 3) {
    return 'bg-amber-500/90 text-amber-950 shadow-[0_6px_16px_-8px_rgba(245,158,11,0.9)] ring-1 ring-amber-400/30 dark:bg-amber-400/95 dark:text-amber-950 dark:ring-amber-300/30';
  }
  return 'bg-black/10 text-current ring-1 ring-black/5 dark:bg-white/10 dark:text-current dark:ring-white/10';
};

const getCustomerDueRowStateClass = (badge?: CustomerDueBadge | null): string => {
  if (!badge) return '';
  if (badge.label.includes('عقب')) return 'table-row-state--overdue';
  if (badge.label.includes('امروز')) return 'table-row-state--due-today';
  if (badge.label.includes('فردا') || badge.label.includes('روز')) return 'table-row-state--due-soon';
  return '';
};

type CustomerDueOverviewRow = {
  customerId: number;
  saleId: number;
  nextDueDate?: string | null;
  openCount?: number;
  overallStatus?: string;
};

const buildCustomerDueBadge = (overview?: CustomerDueOverviewRow | null): CustomerDueBadge | null => {
  if (!overview?.nextDueDate || !overview.saleId) return null;

  const openCount = Math.max(1, Number(overview.openCount || 1));
  const dueMoment = moment(overview.nextDueDate, 'jYYYY/jMM/jDD', true);
  if (!dueMoment.isValid()) {
    return {
      label: 'تاریخ نامعتبر',
      icon: 'fa-calendar-xmark',
      className: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-slate-200',
      hint: 'سررسید ثبت‌شده معتبر نیست',
      dueDate: overview.nextDueDate,
      saleId: overview.saleId,
      openCount,
      countClassName: getDueCountBadgeClassName(openCount),
    };
  }

  const today = moment().startOf('day');
  const daysDiff = dueMoment.startOf('day').diff(today, 'days');

  if (daysDiff < 0) {
    return {
      label: 'عقب افتاده',
      icon: 'fa-triangle-exclamation',
      className: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/25 dark:text-rose-200',
      hint: `${Math.abs(daysDiff).toLocaleString('fa-IR')} روز تأخیر`,
      dueDate: overview.nextDueDate,
      saleId: overview.saleId,
      openCount,
      countClassName: getDueCountBadgeClassName(openCount),
    };
  }
  if (daysDiff === 0) {
    return {
      label: 'امروز',
      icon: 'fa-clock',
      className: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-200',
      hint: 'سررسید برای امروز',
      dueDate: overview.nextDueDate,
      saleId: overview.saleId,
      openCount,
      countClassName: getDueCountBadgeClassName(openCount),
    };
  }
  if (daysDiff === 1) {
    return {
      label: 'فردا',
      icon: 'fa-calendar-day',
      className: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/40 dark:bg-sky-950/25 dark:text-sky-200',
      hint: 'یک روز تا سررسید',
      dueDate: overview.nextDueDate,
      saleId: overview.saleId,
      openCount,
      countClassName: getDueCountBadgeClassName(openCount),
    };
  }

  return {
    label: `${daysDiff.toLocaleString('fa-IR')} روز دیگر`,
    icon: 'fa-calendar-week',
    className: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/40 dark:bg-violet-950/25 dark:text-violet-200',
    hint: 'سررسید باز آینده',
    dueDate: overview.nextDueDate,
    saleId: overview.saleId,
    openCount,
    countClassName: getDueCountBadgeClassName(openCount),
  };
};
const normalizeTags = (raw: any): string[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String).map(t => t.trim()).filter(Boolean);
  if (typeof raw === 'string') {
    const s = raw.trim();
    if (!s) return [];
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) return parsed.map(String).map(t => t.trim()).filter(Boolean);
    } catch {}
    // Fallback: comma-separated
    return s.split(',').map(t => t.trim()).filter(Boolean);
  }
  return [];
};

const normalizePhoneForValidation = (value: unknown) => {
  let phone = String(value ?? '')
    .replace(/[۰-۹]/g, (digit) => '0123456789'['۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)] || digit)
    .replace(/[٠-٩]/g, (digit) => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(digit)] || digit)
    .trim()
    .replace(/[\s\-().]/g, '');
  if (phone.startsWith('0098')) phone = `0${phone.slice(4)}`;
  else if (phone.startsWith('+98')) phone = `0${phone.slice(3)}`;
  else if (phone.startsWith('98') && phone.length === 12) phone = `0${phone.slice(2)}`;
  return phone;
};

const CustomersPage: React.FC = () => {
  const { token } = useAuth();
  const location = useLocation();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [tagFilter, setTagFilter] = useState<string>('');
  const [balanceFilter, setBalanceFilter] = useState<'all' | 'debt' | 'credit' | 'settled'>('all');
  const [riskFilter, setRiskFilter] = useState<'all' | 'risky'>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('risk') === 'risky' ? 'risky' : 'all';
    } catch {
      return 'all';
    }
  });
  const [sortMode, setSortMode] = useState<'name' | 'balanceDesc' | 'balanceAsc' | 'recent'>('name');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<'10' | '25' | '50'>('25');
  const [directoryTotal, setDirectoryTotal] = useState(0);
  const [directoryTotalPages, setDirectoryTotalPages] = useState(1);
  const [directorySummary, setDirectorySummary] = useState<{
    total: number;
    debtors: number;
    creditors: number;
    settled: number;
    totalDebt: number;
    totalCredit: number;
    followupCount: number;
    activeCommitments: number;
    riskCount: number;
    availableTags: string[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);

  // Telegram report messaging
  const [msgOpen, setMsgOpen] = useState(false);
  const [msgInitialRecipient, setMsgInitialRecipient] = useState<any>(null);
  const [msgInitialText, setMsgInitialText] = useState<string>('');

  // حذف مورد
  const [confirmDelete, setConfirmDelete] = useState<Customer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // افزودن مورد جدید
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState<NewCustomerData>({
    fullName: '',
    phoneNumber: '',
    address: '',
    notes: '',
  });
  const [formErrors, setFormErrors] = useState<Partial<NewCustomerData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerDueBadges, setCustomerDueBadges] = useState<Record<number, CustomerDueBadge | null>>({});
  const [customerTrustProfiles, setCustomerTrustProfiles] = useState<Record<number, CustomerTrustListItem>>({});

  const availableTags = directorySummary?.availableTags || [];
  const stats = directorySummary || {
    total: directoryTotal,
    debtors: 0,
    creditors: 0,
    settled: 0,
    totalDebt: 0,
    totalCredit: 0,
    followupCount: 0,
    activeCommitments: 0,
    riskCount: 0,
    availableTags: [],
  };
  const riskyCustomersCount = Number(stats.riskCount || 0);
  const filteredCustomers = customers;
  const pagedCustomers = customers;
  const numericPageSize = Number(pageSize);
  const totalPages = Math.max(1, directoryTotalPages);
  const pageStart = directoryTotal === 0 ? 0 : ((page - 1) * numericPageSize) + 1;
  const pageEnd = Math.min(page * numericPageSize, directoryTotal);
  const visiblePages = React.useMemo(() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1);
    const startPage = Math.max(1, Math.min(page - 2, totalPages - 4));
    return Array.from({ length: 5 }, (_, index) => startPage + index);
  }, [page, totalPages]);

  const fetchCustomerDueBadges = async (customerIds: number[]) => {
    if (!token || customerIds.length === 0) {
      setCustomerDueBadges({});
      return;
    }
    try {
      const params = new URLSearchParams({ customerIds: customerIds.join(','), ts: String(Date.now()) });
      const res = await apiFetch(`/api/installment-sales/customer-due-overview?${params.toString()}`, {
        cache: 'no-store',
        headers: getAuthHeaders(token),
      });
      const json = await res.json();
      if (!res.ok || !json?.success || !Array.isArray(json?.data)) {
        throw new Error(json?.message || 'خطا در دریافت سررسیدهای مشتریان');
      }

      const nextBadges: Record<number, CustomerDueBadge | null> = {};
      (json.data as CustomerDueOverviewRow[]).forEach((overview) => {
        const customerId = Number(overview?.customerId || 0);
        if (!customerId) return;
        nextBadges[customerId] = buildCustomerDueBadge(overview);
      });
      setCustomerDueBadges(nextBadges);
    } catch {
      setCustomerDueBadges({});
    }
  };

  const fetchCustomerTrustProfiles = async (customerIds: number[]) => {
    if (!token || customerIds.length === 0) {
      setCustomerTrustProfiles({});
      return;
    }
    try {
      const params = new URLSearchParams({ ids: customerIds.join(','), ts: String(Date.now()) });
      const res = await apiFetch(`/api/customers/trust-profiles?${params.toString()}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || !json?.success || !Array.isArray(json?.data)) throw new Error(json?.message || 'خطا در دریافت امتیاز اعتماد مشتریان');
      const next: Record<number, CustomerTrustListItem> = {};
      (json.data as CustomerTrustListItem[]).forEach((item) => {
        if (item && Number(item.customerId)) next[Number(item.customerId)] = item;
      });
      setCustomerTrustProfiles(next);
    } catch {
      setCustomerTrustProfiles({});
    }
  };

  const buildDirectoryQuery = (targetPage = page, targetPageSize = numericPageSize, includeSummary = false) => {
    const params = new URLSearchParams({
      view: 'directory',
      page: String(targetPage),
      pageSize: String(targetPageSize),
      search: debouncedSearchTerm,
      tag: tagFilter,
      balance: balanceFilter,
      risk: riskFilter,
      sort: sortMode,
      includeSummary: includeSummary ? '1' : '0',
      ts: String(Date.now()),
    });
    return params;
  };

  const fetchCustomers = async (background = false, includeSummary = false) => {
    if (!token) return;
    if (background) setIsRefreshing(true);
    else setIsLoading(true);
    try {
      const res = await apiFetch(`/api/customers?${buildDirectoryQuery(page, numericPageSize, includeSummary).toString()}`, { cache: 'no-store' });
      const json = await res.json();
      const data = json?.data;
      if (!res.ok || !json?.success || !data || !Array.isArray(data.items)) throw new Error(json?.message || 'خطا در دریافت لیست مشتریان');
      const items = data.items as Customer[];
      setCustomers(items);
      setDirectoryTotal(Math.max(0, Number(data.total || 0)));
      setDirectoryTotalPages(Math.max(1, Number(data.totalPages || 1)));
      if (data.summary) setDirectorySummary(data.summary);
      setLastSyncedAt(new Date().toISOString());
      const ids = items.map((item) => Number(item.id)).filter((id) => id > 0);
      await Promise.allSettled([
        fetchCustomerDueBadges(ids),
        fetchCustomerTrustProfiles(ids),
      ]);
    } catch (e:any) {
      setNotification({ type: 'error', text: humanizeErrorMessage(e.message, { endpoint: '/api/customers?view=directory', action: 'دریافت فهرست مشتریان' }) });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const refreshCustomerDirectory = async (background = true) => {
    await fetchCustomers(background, true);
  };

  const openTelegramReport = async (customer: Customer) => {
    try {
      setNotification(null);
      const res = await apiFetch(`/api/reports/customer/${customer.id}/message`);
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.message || 'خطا در دریافت گزارش مشتری');
      setMsgInitialRecipient({
        type: 'customer',
        id: customer.id,
        name: customer.fullName,
        phoneNumber: customer.phoneNumber,
        telegramChatId: (customer as any).telegramChatId,
      });
      setMsgInitialText(String(json?.data?.text || ''));
      setMsgOpen(true);
    } catch (e: any) {
      setNotification({ type: 'error', text: e?.message || 'خطا در آماده‌سازی گزارش' });
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearchTerm(searchTerm.trim()), 320);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search || '');
      if (params.get('risk') === 'risky') setRiskFilter('risky');
    } catch {}
  }, [location.search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearchTerm, tagFilter, balanceFilter, riskFilter, sortMode, pageSize]);

  useEffect(() => {
    if (!token) return;
    void fetchCustomers(false, directorySummary == null);
  }, [token, page, pageSize, debouncedSearchTerm, tagFilter, balanceFilter, riskFilter, sortMode]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewCustomer(prev => ({ ...prev, [name]: value }));
    if (formErrors[name as keyof NewCustomerData]) {
      setFormErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Partial<NewCustomerData> = {};
    if (!newCustomer.fullName.trim()) errors.fullName = 'نام کامل الزامی است.';
    if (newCustomer.phoneNumber && !/^\d{10,15}$/.test(normalizePhoneForValidation(newCustomer.phoneNumber))) {
      errors.phoneNumber = 'شماره تماس نامعتبر است (۱۰ تا ۱۵ رقم).';
    }
    setFormErrors(errors);
    focusErrorsSoon(errors as any);
    return Object.keys(errors).length === 0;
  };

  const handleAddCustomerSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!validateForm() || !token) return;
    setIsSubmitting(true);
    setNotification(null);
    try {
      await runWithFeedback(
        parseApiResult<any>(
          await apiFetch('/api/customers', {
            method: 'POST',
            headers: getAuthHeaders(token),
            body: JSON.stringify(newCustomer),
          }),
          { endpoint: '/api/customers', action: 'افزودن مورد جدید مشتری' }
        ),
        {
          kind: 'create',
          endpoint: '/api/customers',
          loading: 'در حال ثبت اطلاعات مشتری جدید…',
          success: 'مشتری با موفقیت ثبت شد.',
          error: 'ثبت اطلاعات مشتری انجام نشد؛ نام و شماره تماس را بررسی و ادامه کنید.',
        }
      );

      setNotification({ type: 'success', text: 'مشتری با موفقیت اضافه شد و حالا در لیست مشتریان قابل مشاهده است.' });
      setIsAddModalOpen(false);
      setNewCustomer({ fullName: '', phoneNumber: '', address: '', notes: '' });
      void refreshCustomerDirectory(true);
    } catch (e:any) {
      setNotification({ type: 'error', text: humanizeErrorMessage(e.message, { endpoint: '/api/customers', action: 'افزودن مورد جدید مشتری' }) });
      if (isDuplicateMessage(e.message)) {
        setFormErrors(prev => ({ ...prev, phoneNumber: e.message }));
        focusErrorsSoon({ phoneNumber: e.message } as any);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!confirmDelete) return;
    setIsDeleting(true);
    setNotification(null);
    try {
      await runWithFeedback(
        parseApiResult<any>(
          await apiFetch(`/api/customers/${confirmDelete.id}`, { method: 'DELETE' }),
          { endpoint: '/api/customers', action: 'حذف مورد مشتری' }
        ),
        {
          kind: 'delete',
          endpoint: '/api/customers',
          loading: 'در حال حذف مورد مشتری…',
          success: 'مشتری با موفقیت حذف شد.',
          error: 'حذف مورد مشتری انجام نشد؛ سوابق وابسته یا مجوز کاربر را بررسی و ادامه کنید.',
        }
      );
      setCustomers(prev => prev.filter(c => c.id !== confirmDelete.id));
      setDirectoryTotal((current) => Math.max(0, current - 1));
      setNotification({ type: 'success', text: `پرونده «${confirmDelete.fullName}» حذف شد.` });
      setConfirmDelete(null);
      setCustomerDueBadges(prev => { const next = { ...prev }; delete next[confirmDelete.id]; return next; });
      setCustomerTrustProfiles(prev => { const next = { ...prev }; delete next[confirmDelete.id]; return next; });
      setLastSyncedAt(new Date().toISOString());
      void refreshCustomerDirectory(true);
    } catch (err:any) {
      setNotification({ type: 'error', text: humanizeErrorMessage(err.message, { endpoint: '/api/customers', action: 'حذف مورد مشتری' }) });
    } finally {
      setIsDeleting(false);
    }
  };

  const inputClass = (fieldName: keyof NewCustomerData, isTextarea = false) =>
    [
      'w-full min-h-[38px] rounded-[11px] text-[12px] text-right',
      'px-3 py-2 border outline-none shadow-none',
      'bg-white text-gray-800 preview-gray-400',
      'dark:bg-slate-900/60 dark:text-gray-100 dark:preview-gray-400',
      formErrors[fieldName] ? 'border-red-500' : 'border-gray-300 dark:border-slate-700',
      '   ',
      isTextarea ? 'resize-y' : ''
    ].join(' ');

  const exportFilenameBase = `customers-${new Date().toISOString().slice(0, 10)}`;

  const fetchAllCustomerRowsForExport = async () => {
    const firstPage = 1;
    const chunkSize = 100;
    const firstRes = await apiFetch(`/api/customers?${buildDirectoryQuery(firstPage, chunkSize, false).toString()}`, { cache: 'no-store' });
    const firstJson = await firstRes.json();
    if (!firstRes.ok || !firstJson?.success || !Array.isArray(firstJson?.data?.items)) throw new Error(firstJson?.message || 'خطا در آماده‌سازی خروجی مشتریان');
    const allItems: Customer[] = [...firstJson.data.items];
    const totalExportPages = Math.max(1, Number(firstJson.data.totalPages || 1));
    for (let exportPage = 2; exportPage <= totalExportPages; exportPage += 1) {
      const res = await apiFetch(`/api/customers?${buildDirectoryQuery(exportPage, chunkSize, false).toString()}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || !json?.success || !Array.isArray(json?.data?.items)) throw new Error(json?.message || 'خطا در دریافت ادامه خروجی مشتریان');
      allItems.push(...json.data.items);
    }

    const trustMap: Record<number, CustomerTrustListItem> = {};
    for (let index = 0; index < allItems.length; index += 100) {
      const ids = allItems.slice(index, index + 100).map((item) => Number(item.id)).filter((id) => id > 0);
      if (!ids.length) continue;
      const params = new URLSearchParams({ ids: ids.join(','), ts: String(Date.now()) });
      const res = await apiFetch(`/api/customers/trust-profiles?${params.toString()}`, { cache: 'no-store' });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success && Array.isArray(json.data)) {
        json.data.forEach((item: CustomerTrustListItem) => { if (Number(item?.customerId)) trustMap[Number(item.customerId)] = item; });
      }
    }

    return allItems.map((c) => ({
      fullName: c.fullName,
      phone: c.phoneNumber ?? '',
      tags: normalizeTags((c as any).tags).join('، '),
      address: c.address ?? '',
      notes: c.notes ?? '',
      balance: c.currentBalance ?? 0,
      lastActivity: c.lastActivityAt ? formatIsoToShamsiDateTime(c.lastActivityAt) : '—',
      trustScore: trustMap[c.id]?.score ?? '',
    }));
  };

  const doExportExcel = async () => {
    try {
      const exportRows = await fetchAllCustomerRowsForExport();
      exportToExcel(
        `${exportFilenameBase}.xlsx`,
        exportRows,
        [
          { header: 'نام و نام خانوادگی', key: 'fullName' },
          { header: 'شماره تماس', key: 'phone' },
          { header: 'تگ‌ها', key: 'tags' },
          { header: 'آدرس', key: 'address' },
          { header: 'توضیحات', key: 'notes' },
          { header: 'مانده', key: 'balance' },
          { header: 'آخرین فعالیت', key: 'lastActivity' },
          { header: 'امتیاز اعتماد', key: 'trustScore' },
        ],
        'Customers',
      );
    } catch (error: any) {
      setNotification({ type: 'error', text: error?.message || 'خروجی Excel مشتریان آماده نشد.' });
    }
  };

  const doExportPdf = async () => {
    try {
      const exportRows = await fetchAllCustomerRowsForExport();
      exportToPdfTable({
        filename: `${exportFilenameBase}.pdf`,
        title: 'لیست مشتریان',
        head: ['نام', 'تلفن', 'مانده'],
        body: exportRows.map((r) => [
          r.fullName,
          r.phone,
          r.balance == null ? '—' : Number(r.balance).toLocaleString('fa-IR'),
        ]),
      });
    } catch (error: any) {
      setNotification({ type: 'error', text: error?.message || 'خروجی PDF مشتریان آماده نشد.' });
    }
  };

  return (
    <PageKit
      className="people-merged-page people-foundation customers-directory-page"
      title="مشتریان"
      subtitle="مدیریت اطلاعات مشتریان، مانده حساب، اعتبار و تاریخچه تعاملات"
      icon={<i className="fa-solid fa-user-group" />}
      isLoading={isLoading}
    >
      <div className="people-page-shell people-customers-shell customers-directory-page max-w-7xl mx-auto px-3 sm:px-4 text-right" dir="rtl" data-ui-people-page="customers" data-ui-people-scope="list">
        <PeopleDirectoryOverview
          activeTab="customers"
          eyebrow="مرکز کنترل مشتریان"
          title="نمای کلی مشتریان"
          subtitle="پرونده مشتریان، مانده حساب، اعتبار، تعهدات و آخرین تعاملات را در یک نمای هماهنگ مدیریت کنید."
          resultLabel={`${directoryTotal.toLocaleString('fa-IR')} نتیجه فعال`}
          actions={
            <>
              <Button
                onClick={() => setIsAddModalOpen(true)}
                variant="primary"
                size="sm"
                requiredRoles={['Admin','Manager','Salesperson']}
                leftIcon={<i className="fa-solid fa-user-plus" />}
              >
                افزودن مشتری
              </Button>
              <ExportMenu
                label="خروجی"
                menuWidth={184}
                items={[
                  { key: 'excel', label: 'خروجی Excel', icon: 'fa-file-excel', onClick: doExportExcel, disabled: directoryTotal === 0 },
                  { key: 'pdf', label: 'خروجی PDF', icon: 'fa-file-pdf', onClick: doExportPdf, disabled: directoryTotal === 0 },
                ]}
              />
              <Button
                type="button"
                onClick={() => printArea('#customers-print-area', { title: 'لیست مشتریان' })}
                variant="secondary"
                size="sm"
                disabled={directoryTotal === 0}
                leftIcon={<i className="fa-solid fa-print" />}
              >
                چاپ
              </Button>
              <Button
                type="button"
                onClick={() => void refreshCustomerDirectory(true)}
                variant="secondary"
                size="sm"
                loading={isRefreshing}
                loadingText="در حال تازه‌سازی مشتریان…"
                aria-label="بروزرسانی اطلاعات مشتریان"
                leftIcon={<i className="fa-solid fa-rotate" />}
              >
                بروزرسانی
              </Button>
            </>
          }
          meta={
            <span className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/80 px-2.5 dark:border-slate-700/80 dark:bg-slate-900/80">
              <i className="fa-regular fa-clock" aria-hidden="true" />
              آخرین بروزرسانی: {lastSyncedAt ? formatIsoToShamsiDateTime(lastSyncedAt) : '—'}
            </span>
          }
          quickStats={[
            {
              key: 'debt',
              label: 'کل بدهی مشتریان',
              value: formatCurrencyText(stats.totalDebt, readStoredCurrencyUnit()),
              meta: 'مانده مثبت ثبت‌شده در دفتر مشتریان',
              icon: 'fa-wallet',
              tone: 'danger',
            },
            {
              key: 'commitments',
              label: 'تعهدات فعال',
              value: `${stats.activeCommitments.toLocaleString('fa-IR')} پرونده`,
              meta: 'اقساط و سررسیدهای باز نیازمند پیگیری',
              icon: 'fa-calendar-check',
              tone: 'success',
            },
          ]}
          metrics={[
            { key: 'all', label: 'کل مشتریان', value: stats.total.toLocaleString('fa-IR'), meta: 'پرونده ثبت‌شده', icon: 'fa-user', tone: 'accent' },
            { key: 'commitments', label: 'تعهدات فعال', value: stats.activeCommitments.toLocaleString('fa-IR'), meta: 'پرونده اقساطی', icon: 'fa-user-group', tone: 'info' },
            { key: 'debt', label: 'بدهکار', value: stats.debtors.toLocaleString('fa-IR'), meta: formatCurrencyText(stats.totalDebt, readStoredCurrencyUnit()), icon: 'fa-wallet', tone: 'warning' },
            { key: 'settled', label: 'تسویه‌شده', value: stats.settled.toLocaleString('fa-IR'), meta: 'بدون مانده مالی', icon: 'fa-circle-check', tone: 'success' },
            { key: 'risk', label: 'نیازمند توجه', value: riskyCustomersCount.toLocaleString('fa-IR'), meta: `${stats.followupCount.toLocaleString('fa-IR')} پیگیری باز`, icon: 'fa-triangle-exclamation', tone: 'danger' },
          ]}
          metricsLabel="خلاصه مشتریان"
        />

        <Notification message={notification} onClose={() => setNotification(null)} />

        <PeopleDirectoryToolbar
          ariaLabel="فیلتر مشتریان"
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="جستجو در نام، موبایل یا کد مشتری..."
          searchAriaLabel="جستجوی مشتری"
          filters={[
            {
              key: 'balance',
              value: balanceFilter,
              ariaLabel: 'وضعیت مانده حساب',
              iconClassName: 'fa-solid fa-wallet',
              onValueChange: (value) => setBalanceFilter(value as typeof balanceFilter),
              options: [
                { value: 'all', label: 'همه وضعیت‌ها' },
                { value: 'debt', label: 'بدهکار' },
                { value: 'credit', label: 'بستانکار' },
                { value: 'settled', label: 'تسویه‌شده' },
              ],
            },
            {
              key: 'tag',
              value: tagFilter,
              ariaLabel: 'فیلتر برچسب مشتری',
              iconClassName: 'fa-solid fa-tags',
              onValueChange: setTagFilter,
              options: [
                { value: '', label: 'همه برچسب‌ها' },
                ...availableTags.map((tag) => ({ value: tag, label: tag })),
              ],
            },
            {
              key: 'risk',
              value: riskFilter,
              ariaLabel: 'فیلتر ریسک مشتری',
              iconClassName: 'fa-solid fa-shield-halved',
              onValueChange: (value) => setRiskFilter(value as typeof riskFilter),
              options: [
                { value: 'all', label: 'همه امتیازها' },
                { value: 'risky', label: `نیازمند پیگیری (${riskyCustomersCount.toLocaleString('fa-IR')})` },
              ],
            },
            {
              key: 'sort',
              value: sortMode,
              ariaLabel: 'مرتب‌سازی مشتریان',
              iconClassName: 'fa-solid fa-arrow-down-wide-short',
              onValueChange: (value) => setSortMode(value as typeof sortMode),
              options: [
                { value: 'name', label: 'نام مشتری' },
                { value: 'balanceDesc', label: 'بیشترین مانده' },
                { value: 'balanceAsc', label: 'کمترین مانده' },
                { value: 'recent', label: 'آخرین فعالیت' },
              ],
            },
          ]}
          resetDisabled={!(searchTerm || tagFilter || balanceFilter !== 'all' || riskFilter !== 'all' || sortMode !== 'name')}
          onReset={() => { setSearchTerm(''); setTagFilter(''); setBalanceFilter('all'); setRiskFilter('all'); setSortMode('name'); }}
          notice={riskFilter === 'risky' ? {
            icon: 'fa-triangle-exclamation',
            text: 'فیلتر نیازمند پیگیری فعال است؛ سررسید معوق یا چک برگشتی فعال در این نما لحاظ می‌شود.',
          } : null}
        />

        <div className="customers-directory-v73" dir="rtl" data-ui-customers-directory="true">
        {isLoading ? (
          <div className="customers-directory-v73__loading">
            {Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} tone="info" className="h-12" rounded="lg" />)}
          </div>
        ) : stats.total === 0 ? (
          <PeopleZeroStateLanding
            entity="customer"
            primaryLabel="افزودن مشتری"
            onPrimaryAction={() => setIsAddModalOpen(true)}
            secondaryLabel="رفتن به همکاران"
            onSecondaryAction={() => window.location.assign('/partners')}
          />
        ) : directoryTotal === 0 ? (
          <PeopleZeroStateLanding
            entity="customer"
            title="مشتری‌ای با این فیلتر پیدا نشد"
            description={searchTerm ? `جستجوی «${searchTerm}» با هیچ پرونده‌ای مطابقت نداشت.` : 'فیلترهای فعلی نتیجه‌ای ندارند.'}
            primaryLabel="پاک کردن فیلترها"
            onPrimaryAction={() => { setSearchTerm(''); setTagFilter(''); setBalanceFilter('all'); setRiskFilter('all'); setSortMode('name'); }}
            secondaryLabel="افزودن مشتری"
            onSecondaryAction={() => setIsAddModalOpen(true)}
          />
        ) : (
          <section className="customers-directory-v73__list" id="customers-print-area">
            <header>
              <div>
                <h3>فهرست مشتریان</h3>
                <p>نمایش {pageStart.toLocaleString('fa-IR')} تا {pageEnd.toLocaleString('fa-IR')} از {directoryTotal.toLocaleString('fa-IR')} مشتری</p>
              </div>
              <span><i className="fa-solid fa-circle-info" /> مانده حساب و تعهدات از پرونده‌های ثبت‌شده محاسبه می‌شوند.</span>
            </header>

            <DataTableShell className="customers-directory-v73__table-wrap" data-ui-customer-table-shell="true" data-ui-customer-table="true">
              <table className="customers-directory-v73__table" data-ui-customer-table="semantic">
                <thead>
                  <tr>
                    <th scope="col">مشتری و ارتباط</th>
                    <th scope="col">حساب و تعهدات</th>
                    <th scope="col">اعتبار و فعالیت</th>
                    <th scope="col" className="customers-directory-v73__operations-heading">عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedCustomers.map((customer) => {
                    const due = customerDueBadges[customer.id];
                    const trust = customerTrustProfiles[customer.id];
                    const balance = Number(customer.currentBalance || 0);
                    return (
                      <tr key={customer.id} className={`${getCustomerDueRowStateClass(due)} ${getBalanceRowClass(getBalanceState(balance, { overdue: Boolean(due?.label?.includes('عقب')) }))}`.trim()}>
                        <td className="customers-directory-v73__customer-cell">
                          <div className="customers-directory-v73__customer-profile">
                            <div className="customers-directory-v73__identity">
                              <span className="customers-directory-v73__avatar" data-tone={['blue', 'violet', 'emerald', 'amber'][Number(customer.id || 0) % 4]}>{(customer.fullName || '?').trim().charAt(0)}</span>
                              <div>
                                <strong>{customer.fullName}</strong>
                                <small>پرونده #{customer.id.toLocaleString('fa-IR')} • {normalizeTags(customer.tags).slice(0, 2).join('، ') || 'بدون تگ'}</small>
                              </div>
                            </div>
                            <div className="customers-directory-v73__contact">
                              <strong dir="ltr"><i className="fa-solid fa-phone customers-directory-v73__inline-icon is-blue" /> {customer.phoneNumber || 'ثبت نشده'}</strong>
                              <small><i className="fa-solid fa-location-dot customers-directory-v73__inline-icon is-cyan" /> {customer.address || 'بدون آدرس'}</small>
                            </div>
                          </div>
                        </td>
                        <td className="customers-directory-v73__account-cell">
                          <div className="customers-directory-v73__account-stack">
                            {formatCurrency(balance, Boolean(due?.label?.includes('عقب')))}
                            {due ? (
                              due.saleId ? (
                                <Link to={`/installment-sales/${due.saleId}?pay=next`} className={`customers-directory-v73__due ${due.className}`} title={due.hint}>
                                  <i className={`fa-solid ${due.icon}`} /> {due.label}
                                  {Number(due.openCount || 0) > 1 ? <b>{Number(due.openCount || 0).toLocaleString('fa-IR')}</b> : null}
                                </Link>
                              ) : <span className={`customers-directory-v73__due ${due.className}`}><i className={`fa-solid ${due.icon}`} /> {due.label}</span>
                            ) : <span className="customers-directory-v73__muted-chip"><i className="fa-solid fa-circle-check" /> بدون سررسید باز</span>}
                          </div>
                        </td>
                        <td className="customers-directory-v73__insight-cell">
                          <div className="customers-directory-v73__insight-stack">
                            <div className="customers-directory-v73__status-stack">
                              {trust ? (
                                <span className={`customers-directory-v73__trust ${getCustomerTrustBadgeClass(trust.score)}`}>
                                  <i className={Number(trust.score || 0) >= 68 ? 'fa-solid fa-user-check' : Number(trust.score || 0) >= 50 ? 'fa-solid fa-user-clock' : 'fa-solid fa-triangle-exclamation'} />
                                  {Number(trust.score || 0).toLocaleString('fa-IR')} / ۱۰۰
                                </span>
                              ) : <span className="customers-directory-v73__muted-chip"><i className="fa-solid fa-circle-question" /> نامشخص</span>}
                            </div>
                            <div className="customers-directory-v73__activity">
                              <strong><i className="fa-regular fa-clock customers-directory-v73__inline-icon is-slate" /> {customer.lastActivityAt ? formatIsoToShamsiDateTime(customer.lastActivityAt) : '—'}</strong>
                              <small>
                                <span className="customers-directory-v73__activity-token is-violet"><i className="fa-solid fa-bag-shopping" /> {Number(customer.salesOrderCount || 0).toLocaleString('fa-IR')} فروش</span>
                                <span className="customers-directory-v73__activity-token is-rose"><i className="fa-solid fa-bell" /> {Number(customer.openFollowupCount || 0).toLocaleString('fa-IR')} پیگیری</span>
                              </small>
                            </div>
                          </div>
                        </td>
                        <td className="customers-directory-v73__operations-cell">
                          <CustomerRowActions
                            customerId={customer.id}
                            customerName={customer.fullName}
                            onSendReport={() => openTelegramReport(customer)}
                            onDelete={() => setConfirmDelete(customer)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </DataTableShell>

            <footer className="customers-directory-v73__pagination">
              <div className="customers-directory-v73__pagination-size">
                <span>تعداد در هر صفحه</span>
                <SelectField
                  value={pageSize}
                  onValueChange={setPageSize}
                  ariaLabel="تعداد مشتری در هر صفحه"
                  size="sm"
                  options={[
                    { value: '10', label: '۱۰' },
                    { value: '25', label: '۲۵' },
                    { value: '50', label: '۵۰' },
                  ]}
                />
              </div>
              <nav aria-label="صفحه‌بندی مشتریان">
                <Button type="button" variant="secondary" size="icon" autoIcon={false} disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} aria-label="صفحه قبل" leftIcon={<i className="fa-solid fa-chevron-right" />} />
                {visiblePages.map((item) => <Button key={item} type="button" variant={item === page ? 'primary' : 'secondary'} size="icon" autoIcon={false} data-active={item === page} onClick={() => setPage(item)}>{item.toLocaleString('fa-IR')}</Button>)}
                <Button type="button" variant="secondary" size="icon" autoIcon={false} disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} aria-label="صفحه بعد" leftIcon={<i className="fa-solid fa-chevron-left" />} />
              </nav>
              <span>نمایش {pageStart.toLocaleString('fa-IR')} تا {pageEnd.toLocaleString('fa-IR')} از {directoryTotal.toLocaleString('fa-IR')}</span>
            </footer>
          </section>
        )}
        </div>
      </div>

      <MessageComposerModal
        open={msgOpen}
        onClose={() => setMsgOpen(false)}
        onQueued={() => setNotification({ type: 'success', text: 'گزارش در صف ارسال قرار گرفت.' })}
        initialRecipient={msgInitialRecipient || undefined}
        initialText={msgInitialText}
        initialChannels={{ sms: false, telegram: true }}
      />

      {isAddModalOpen && (
        <Modal
          title="مشتری جدید"
          onClose={() => setIsAddModalOpen(false)}
          widthClass="max-w-4xl"
          iconClass="fa-solid fa-user-plus"
          variant="operational"
          layout="split"
          ariaDescription="ثبت پرونده پایه مشتری برای استفاده در فروش، اقساط، تعمیرات و پیام‌رسانی"
        >
          <form onSubmit={handleAddCustomerSubmit} className="modal-template-form modal-template-form--split modal-template-form--customer" data-ui-customer-modal="canonical-split">
            <FormErrorSummary errors={formErrors as any} labels={{ fullName: 'نام کامل', phoneNumber: 'شماره تماس' }} fieldIdMap={{ fullName: 'fullName', phoneNumber: 'phoneNumber' }} />
            <aside className="modal-template-side">
              <PeopleModalSummaryCard
                eyebrow="پرونده مشتری جدید"
                title={newCustomer.fullName || 'تعریف مشتری جدید'}
                description="این اطلاعات پایه در فروش، اقساط، تعمیرات و ارتباط با مشتری استفاده می‌شود؛ اطلاعات تکمیلی بعداً از داخل پرونده قابل ویرایش است."
                icon="fa-address-card"
                metrics={[
                  { icon: 'fa-phone', label: 'شماره تماس', value: <span dir="ltr">{newCustomer.phoneNumber || 'ثبت نشده'}</span>, hint: newCustomer.phoneNumber ? 'برای تماس و پیام‌رسانی' : 'اختیاری؛ بعداً قابل تکمیل' },
                  { icon: 'fa-location-dot', label: 'وضعیت آدرس', value: newCustomer.address?.trim() ? 'ثبت شده' : 'ثبت نشده', hint: newCustomer.address?.trim() ? 'برای فاکتور و تحویل آماده است' : 'در صورت نیاز بعداً تکمیل شود' },
                ]}
              />
            </aside>
            <div className="modal-template-main">
              <div className="modal-template-section modal-template-section--grid">
                <ModalField label="نام کامل" iconClass="fa-solid fa-user" required error={formErrors.fullName}>
                  <TextField type="text" id="fullName" name="fullName" value={newCustomer.fullName}
                         onChange={handleInputChange} className={inputClass('fullName')} required maxLength={120} placeholder="نام و نام خانوادگی مشتری" />
                </ModalField>
                <ModalField label="شماره تماس" iconClass="fa-solid fa-phone" error={formErrors.phoneNumber}>
                  <TextField type="tel" id="phoneNumber" name="phoneNumber" value={newCustomer.phoneNumber}
                         onChange={handleInputChange} className={inputClass('phoneNumber')} inputMode="tel" maxLength={18} placeholder="مثال: 09123456789" />
                </ModalField>
              </div>
              <div className="modal-template-section modal-template-section--stack">
                <ModalField label="آدرس" iconClass="fa-solid fa-location-dot">
                  <TextareaField controlOnly id="address" name="address" rows={2} value={newCustomer.address}
                              onChange={handleInputChange} className={inputClass('address', true)} maxLength={700} placeholder="آدرس ثبت‌شده مشتری" />
                </ModalField>
                <ModalField label="یادداشت داخلی" iconClass="fa-solid fa-note-sticky">
                  <TextareaField controlOnly id="notes" name="notes" rows={3} value={newCustomer.notes}
                              onChange={handleInputChange} className={inputClass('notes', true)} maxLength={2000} placeholder="توضیحات پیگیری، رفتار پرداخت یا نکات ارتباطی" />
                </ModalField>
              </div>
              <ModalActions onCancel={() => setIsAddModalOpen(false)} submitText="ثبت مشتری" submittingText="در حال ثبت مشتری..." isSubmitting={isSubmitting} submitDisabled={!token} />
            </div>
          </form>
        </Modal>
      )}

      {confirmDelete && (
        <Modal
          title={`حذف پرونده «${confirmDelete.fullName}»`}
          onClose={() => (isDeleting ? undefined : setConfirmDelete(null))}
          widthClass="max-w-3xl"
          iconClass="fa-solid fa-user-xmark"
          tone="danger"
          variant="operational"
          layout="split"
          ariaDescription="بازبینی ایمن پیش از حذف پرونده مشتری"
        >
          <PeopleDeleteConfirmContent
            entityLabel="پرونده مشتری"
            name={confirmDelete.fullName}
            identifier={Number(confirmDelete.id || 0).toLocaleString('fa-IR')}
            statusLabel={Number(confirmDelete.currentBalance || 0) === 0 ? 'بدون مانده مالی' : formatCurrencyText(Math.abs(Number(confirmDelete.currentBalance || 0)), readStoredCurrencyUnit())}
            warningTitle="فقط پرونده بدون سابقه قابل حذف است"
            warningText="سرور پیش از حذف، سوابق مالی، فروش، اقساط، تعمیرات، مرجوعی‌ها، پیام‌ها، اعتبار و پیگیری‌ها را کنترل می‌کند. اگر وابستگی وجود داشته باشد، حذف متوقف می‌شود و داده عملیاتی دست‌نخورده می‌ماند."
            onCancel={() => setConfirmDelete(null)}
            onConfirm={handleDeleteCustomer}
            isSubmitting={isDeleting}
            confirmText="بررسی و حذف"
            submittingText="در حال بررسی سوابق..."
          />
        </Modal>
      )}
  </PageKit>
  );
};

export default CustomersPage;
