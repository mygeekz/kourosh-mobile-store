// src/pages/Customers.tsx  (یا CustomersPage.tsx؛ مطابق روتینگ پروژه‌ات)
import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import moment from 'jalali-moment';
import { Link, useLocation } from 'react-router-dom';
import { Customer, NewCustomerData, NotificationMessage } from '../types';
import Notification from '../components/Notification';
import { Dialog as Modal } from '@/components/ui';
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
import { getBalanceLabel, getBalanceState } from '../utils/adaptiveUi';
import { PeopleDeleteConfirmContent, PeopleModalSummaryCard, PeopleZeroStateLanding } from '../components/people/PeopleUiKit';
import PeopleDirectoryOverview from '../components/people/PeopleDirectoryOverview';
import PeopleDirectoryToolbar from '../components/people/PeopleDirectoryToolbar';
import { formatCurrencyText, readStoredCurrencyUnit } from '../utils/currency';
import { ManagementDirectoryPagination, TextareaField, TextField } from '@/components/ui';
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

const getCustomerTrustTextClass = (score?: number | null) => {
  const tone = getCustomerTrustTone(score);
  if (tone === 'emerald') return 'text-emerald-700 dark:text-emerald-300';
  if (tone === 'blue') return 'text-blue-700 dark:text-blue-300';
  if (tone === 'amber') return 'text-amber-700 dark:text-amber-300';
  return 'text-rose-700 dark:text-rose-300';
};


// رنگ موجودی با سازگاری دارک/لایت
const formatCurrency = (amount?: number, overdue = false) => {
  const state = getBalanceState(amount, { overdue });
  const n = Math.abs(Number(amount || 0)).toLocaleString('fa-IR');
  const tone = state === 'overdue' || state === 'positive'
    ? 'text-rose-700 dark:text-rose-300'
    : state === 'negative'
      ? 'text-emerald-700 dark:text-emerald-300'
      : 'text-slate-700 dark:text-slate-300';
  return (
    <div className={`min-w-0 ${tone}`}>
      <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 font-black leading-5">
        <i className={`fa-solid shrink-0 ${state === 'overdue' ? 'fa-triangle-exclamation' : state === 'negative' ? 'fa-arrow-trend-down' : state === 'positive' ? 'fa-arrow-trend-up' : 'fa-circle-check'}`} aria-hidden="true" />
        <span className="tabular-nums">{n} تومان</span>
      </div>
      <div className="mt-0.5 text-[10px] font-bold leading-5">{getBalanceLabel(state, 'customer')}</div>
    </div>
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
};

const CUSTOMER_DIRECTORY_ROW_CLASS = 'bg-white hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-900';

const getCustomerDueRowRailClass = (badge?: CustomerDueBadge | null): string => {
  if (!badge) return 'border-s-4 border-s-slate-300 dark:border-s-slate-700';
  if (badge.label.includes('عقب')) return 'border-s-4 border-s-rose-500';
  if (badge.label.includes('امروز')) return 'border-s-4 border-s-amber-400';
  if (badge.label.includes('فردا') || badge.label.includes('روز')) return 'border-s-4 border-s-sky-500';
  return 'border-s-4 border-s-slate-400';
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
      className: 'text-slate-600 dark:text-slate-300',
      hint: 'سررسید ثبت‌شده معتبر نیست',
      dueDate: overview.nextDueDate,
      saleId: overview.saleId,
      openCount,
    };
  }

  const today = moment().startOf('day');
  const daysDiff = dueMoment.startOf('day').diff(today, 'days');

  if (daysDiff < 0) {
    return {
      label: 'عقب افتاده',
      icon: 'fa-triangle-exclamation',
      className: 'text-rose-700 dark:text-rose-300',
      hint: `${Math.abs(daysDiff).toLocaleString('fa-IR')} روز تأخیر`,
      dueDate: overview.nextDueDate,
      saleId: overview.saleId,
      openCount,
    };
  }
  if (daysDiff === 0) {
    return {
      label: 'امروز',
      icon: 'fa-clock',
      className: 'text-amber-700 dark:text-amber-300',
      hint: 'سررسید برای امروز',
      dueDate: overview.nextDueDate,
      saleId: overview.saleId,
      openCount,
    };
  }
  if (daysDiff === 1) {
    return {
      label: 'فردا',
      icon: 'fa-calendar-day',
      className: 'text-sky-700 dark:text-sky-300',
      hint: 'یک روز تا سررسید',
      dueDate: overview.nextDueDate,
      saleId: overview.saleId,
      openCount,
    };
  }

  return {
    label: `${daysDiff.toLocaleString('fa-IR')} روز دیگر`,
    icon: 'fa-calendar-week',
    className: 'text-violet-700 dark:text-violet-300',
    hint: 'سررسید باز آینده',
    dueDate: overview.nextDueDate,
    saleId: overview.saleId,
    openCount,
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

const normalizeNationalCodeForValidation = (value: unknown) => String(value ?? '')
  .replace(/[۰-۹]/g, (digit) => '0123456789'['۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)] || digit)
  .replace(/[٠-٩]/g, (digit) => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(digit)] || digit)
  .replace(/\D/g, '');

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
    nationalCode: '',
    phoneNumber: '',
    address: '',
    notes: '',
  });
  const [formErrors, setFormErrors] = useState<Partial<NewCustomerData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerDueBadges, setCustomerDueBadges] = useState<Record<number, CustomerDueBadge | null>>({});
  const [customerTrustProfiles, setCustomerTrustProfiles] = useState<Record<number, CustomerTrustListItem>>({});
  const directoryRequestIdRef = React.useRef(0);
  const hasLoadedDirectoryRef = React.useRef(false);

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
    const requestId = ++directoryRequestIdRef.current;
    if (background) setIsRefreshing(true);
    else setIsLoading(true);
    try {
      const res = await apiFetch(`/api/customers?${buildDirectoryQuery(page, numericPageSize, includeSummary).toString()}`, { cache: 'no-store' });
      const json = await res.json();
      const data = json?.data;
      if (!res.ok || !json?.success || !data || !Array.isArray(data.items)) throw new Error(json?.message || 'خطا در دریافت لیست مشتریان');
      if (requestId !== directoryRequestIdRef.current) return;
      const items = data.items as Customer[];
      setCustomers(items);
      setDirectoryTotal(Math.max(0, Number(data.total || 0)));
      setDirectoryTotalPages(Math.max(1, Number(data.totalPages || 1)));
      if (data.summary) setDirectorySummary(data.summary);
      setLastSyncedAt(new Date().toISOString());
      hasLoadedDirectoryRef.current = true;
      const ids = items.map((item) => Number(item.id)).filter((id) => id > 0);
      await Promise.allSettled([
        fetchCustomerDueBadges(ids),
        fetchCustomerTrustProfiles(ids),
      ]);
    } catch (e:any) {
      if (requestId !== directoryRequestIdRef.current) return;
      setNotification({ type: 'error', text: humanizeErrorMessage(e.message, { endpoint: '/api/customers?view=directory', action: 'دریافت فهرست مشتریان' }) });
    } finally {
      if (requestId === directoryRequestIdRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
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
    void fetchCustomers(hasLoadedDirectoryRef.current, directorySummary == null);
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
    if (newCustomer.nationalCode && normalizeNationalCodeForValidation(newCustomer.nationalCode).length !== 10) {
      errors.nationalCode = 'کد ملی باید دقیقاً ۱۰ رقم باشد.';
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
      setNewCustomer({ fullName: '', nationalCode: '', phoneNumber: '', address: '', notes: '' });
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
      className="people-foundation"
      title="مشتریان"
      subtitle="مدیریت اطلاعات مشتریان، مانده حساب، اعتبار و تاریخچه تعاملات"
      icon={<i className="fa-solid fa-user-group" />}
      isLoading={isLoading}
    >
      <div className="mx-auto grid max-w-7xl min-w-0 gap-4 px-3 text-right sm:px-4" dir="rtl" data-ui-people-page="customers" data-ui-people-scope="list">
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

        <div className="min-w-0" dir="rtl" data-ui-customers-directory="true">
        {isLoading ? (
          <div className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
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
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950" id="customers-print-area">
            <header className="flex flex-col gap-2 border-b border-slate-200 px-3 py-2.5 lg:flex-row lg:items-center lg:justify-between dark:border-slate-800">
              <div className="min-w-0">
                <h3 className="text-sm font-black text-slate-950 dark:text-slate-50">فهرست مشتریان</h3>
                <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">نمایش {pageStart.toLocaleString('fa-IR')} تا {pageEnd.toLocaleString('fa-IR')} از {directoryTotal.toLocaleString('fa-IR')} مشتری</p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400"><i className="fa-solid fa-circle-info text-sky-600" aria-hidden="true" /> مانده حساب و تعهدات از پرونده‌های ثبت‌شده محاسبه می‌شوند.</span>
            </header>

            <div className="w-full overflow-x-auto overscroll-x-contain" role="region" aria-label="جدول فهرست مشتریان" tabIndex={0}>
              <table className="w-full min-w-[62rem] table-fixed border-collapse text-xs" dir="rtl" data-ui-table="true" data-ui-bidi-scope="rtl-table" data-ui-table-layout="managed" data-ui-table-density="compact">
                <caption className="sr-only">فهرست مشتریان، وضعیت حساب، تعهدات، اعتبار و عملیات پرونده</caption>
                <colgroup>
                  <col className="w-[33%]" />
                  <col className="w-[28%]" />
                  <col className="w-[25%]" />
                  <col className="w-[14%]" />
                </colgroup>
                <thead className="bg-slate-50 text-slate-600 dark:bg-slate-900/70 dark:text-slate-300">
                  <tr className="border-b border-slate-200 text-right dark:border-slate-800">
                    <th scope="col" className="bg-slate-50 px-3 py-2 text-right font-black tracking-normal before:hidden after:hidden dark:bg-slate-900">مشتری و ارتباط</th>
                    <th scope="col" className="bg-slate-50 px-3 py-2 text-right font-black tracking-normal before:hidden after:hidden dark:bg-slate-900">حساب و تعهدات</th>
                    <th scope="col" className="bg-slate-50 px-3 py-2 text-right font-black tracking-normal before:hidden after:hidden dark:bg-slate-900">اعتبار و فعالیت</th>
                    <th scope="col" className="sticky end-0 z-20 bg-slate-50 px-2 py-2 text-center font-black tracking-normal before:hidden after:hidden dark:bg-slate-900">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {pagedCustomers.map((customer) => {
                    const due = customerDueBadges[customer.id];
                    const trust = customerTrustProfiles[customer.id];
                    const balance = Number(customer.currentBalance || 0);
                    return (
                      <tr key={customer.id} className={CUSTOMER_DIRECTORY_ROW_CLASS}>
                        <td className={`px-3 py-2.5 align-top ${getCustomerDueRowRailClass(due)}`}>
                          <div className="min-w-0 space-y-2">
                            <div className="flex min-w-0 items-start gap-2.5">
                              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-sm font-black text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">{(customer.fullName || '?').trim().charAt(0)}</span>
                              <div className="min-w-0">
                                <strong className="allow-truncate block truncate text-sm font-black text-slate-950 dark:text-slate-50">{customer.fullName}</strong>
                                <small className="allow-truncate mt-0.5 block truncate text-xs font-semibold text-slate-500 dark:text-slate-400">پرونده #{customer.id.toLocaleString('fa-IR')} · {normalizeTags(customer.tags).slice(0, 2).join('، ') || 'بدون برچسب'}</small>
                              </div>
                            </div>
                            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 ps-11 text-[10px] font-semibold leading-5 text-slate-500 dark:text-slate-400">
                              <span className="inline-flex items-center gap-1.5"><i className="fa-solid fa-phone shrink-0 text-sky-600" aria-hidden="true" /><bdi dir="ltr">{customer.phoneNumber || 'ثبت نشده'}</bdi></span>
                              <span className="inline-flex min-w-0 items-start gap-1.5"><i className="fa-solid fa-location-dot mt-0.5 shrink-0 text-cyan-600" aria-hidden="true" /><span className="allow-line-clamp line-clamp-1">{customer.address || 'بدون آدرس'}</span></span>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 align-top">
                          <div className="space-y-2">
                            {formatCurrency(balance, Boolean(due?.label?.includes('عقب')))}
                            {due ? (
                              due.saleId ? (
                                <Link to={`/installment-sales/${due.saleId}?pay=next`} className={`inline-flex max-w-full flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] font-black leading-5 underline-offset-4 hover:underline ${due.className}`} title={due.hint}>
                                  <i className={`fa-solid shrink-0 ${due.icon}`} aria-hidden="true" /> <span>{due.label}</span>
                                  {Number(due.openCount || 0) > 1 ? <span>· {Number(due.openCount || 0).toLocaleString('fa-IR')} تعهد باز</span> : null}
                                </Link>
                              ) : <span className={`inline-flex max-w-full flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] font-black leading-5 ${due.className}`}><i className={`fa-solid shrink-0 ${due.icon}`} aria-hidden="true" /> {due.label}</span>
                            ) : <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400"><i className="fa-solid fa-circle-check text-emerald-600" aria-hidden="true" /> بدون سررسید باز</span>}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 align-top">
                          <div className="min-w-0 space-y-1.5">
                            <div>
                              {trust ? (
                                <span className={`inline-flex items-center gap-1.5 font-black ${getCustomerTrustTextClass(trust.score)}`}>
                                  <i className={Number(trust.score || 0) >= 68 ? 'fa-solid fa-user-check' : Number(trust.score || 0) >= 50 ? 'fa-solid fa-user-clock' : 'fa-solid fa-triangle-exclamation'} />
                                  اعتبار {Number(trust.score || 0).toLocaleString('fa-IR')} از ۱۰۰
                                </span>
                              ) : <span className="inline-flex items-center gap-1.5 font-bold text-slate-500"><i className="fa-solid fa-circle-question" /> اعتبار نامشخص</span>}
                            </div>
                            <div className="min-w-0 space-y-1 text-[10px] text-slate-600 dark:text-slate-300">
                              <strong className="flex flex-wrap items-center gap-1.5 font-bold leading-5"><i className="fa-regular fa-clock shrink-0 text-slate-400" /> {customer.lastActivityAt ? formatIsoToShamsiDateTime(customer.lastActivityAt) : 'بدون فعالیت'}</strong>
                              <small className="flex flex-wrap gap-x-3 gap-y-1 font-semibold text-slate-500 dark:text-slate-400">
                                <span><i className="fa-solid fa-bag-shopping me-1 text-violet-600" />{Number(customer.salesOrderCount || 0).toLocaleString('fa-IR')} فروش</span>
                                <span><i className="fa-solid fa-bell me-1 text-rose-600" />{Number(customer.openFollowupCount || 0).toLocaleString('fa-IR')} پیگیری</span>
                              </small>
                            </div>
                          </div>
                        </td>
                        <td className="sticky end-0 z-10 bg-inherit px-2 py-2.5 text-center align-middle">
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
            </div>

            <ManagementDirectoryPagination
              page={page}
              totalPages={totalPages}
              pageSize={numericPageSize}
              pageSizeOptions={[10, 25, 50]}
              total={directoryTotal}
              pageStart={pageStart}
              pageEnd={pageEnd}
              ariaLabel="صفحه‌بندی مشتریان"
              pageSizeAriaLabel="تعداد مشتری در هر صفحه"
              onPageChange={setPage}
              onPageSizeChange={(value) => { setPage(1); setPageSize(String(value) as typeof pageSize); }}
            />
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
            <FormErrorSummary errors={formErrors as any} labels={{ fullName: 'نام کامل', nationalCode: 'کد ملی', phoneNumber: 'شماره تماس' }} fieldIdMap={{ fullName: 'fullName', nationalCode: 'nationalCode', phoneNumber: 'phoneNumber' }} />
            <aside className="modal-template-side">
              <PeopleModalSummaryCard
                eyebrow="پرونده مشتری جدید"
                title={newCustomer.fullName || 'تعریف مشتری جدید'}
                description="این اطلاعات پایه در فروش، اقساط، تعمیرات و ارتباط با مشتری استفاده می‌شود؛ اطلاعات تکمیلی بعداً از داخل پرونده قابل ویرایش است."
                icon="fa-address-card"
                metrics={[
                  { icon: 'fa-phone', label: 'شماره تماس', value: <span dir="ltr">{newCustomer.phoneNumber || 'ثبت نشده'}</span>, hint: newCustomer.phoneNumber ? 'برای تماس و پیام‌رسانی' : 'اختیاری؛ بعداً قابل تکمیل' },
                  { icon: 'fa-id-card', label: 'آمادگی قرارداد', value: newCustomer.nationalCode?.trim() && newCustomer.address?.trim() ? 'آماده' : 'نیاز به تکمیل', hint: 'کد ملی ۱۰ رقمی و آدرس برای چاپ قرارداد لازم است' },
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
                <ModalField label="کد ملی" iconClass="fa-solid fa-id-card" error={formErrors.nationalCode}>
                  <TextField type="text" id="nationalCode" name="nationalCode" value={newCustomer.nationalCode}
                         onChange={(event) => {
                           const nationalCode = normalizeNationalCodeForValidation(event.currentTarget.value);
                           setNewCustomer((prev) => ({ ...prev, nationalCode }));
                           if (formErrors.nationalCode) setFormErrors((prev) => ({ ...prev, nationalCode: undefined }));
                         }} className={inputClass('nationalCode')} inputMode="numeric" dir="ltr" maxLength={10} placeholder="0012345678" autoComplete="off" />
                </ModalField>
              </div>
              <div className="modal-template-section modal-template-section--stack">
                <ModalField label="آدرس محل سکونت / قرارداد" iconClass="fa-solid fa-location-dot">
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
