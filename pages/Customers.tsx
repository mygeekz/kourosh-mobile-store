// src/pages/Customers.tsx  (یا CustomersPage.tsx؛ مطابق روتینگ پروژه‌ات)
import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import moment from 'jalali-moment';
import { Link, useLocation } from 'react-router-dom';
import { Customer, NewCustomerData, NotificationMessage, InstallmentSale } from '../types';
import Notification from '../components/Notification';
import Modal from '../components/Modal';
import ModalField from '../components/ModalField';
import ModalActions from '../components/ModalActions';
import FormErrorSummary from '../components/FormErrorSummary';
import { useAuth } from '../contexts/AuthContext';
import { getAuthHeaders } from '../utils/apiUtils';
import { apiFetch } from '../utils/apiFetch';
import ExportMenu from '../components/ExportMenu';
import { exportToExcel, exportToPdfTable } from '../utils/exporters';
import Skeleton from '../components/ui/Skeleton';
import PageKit from '../components/ui/PageKit';
import { printArea } from '../utils/printArea';
import MessageComposerModal from '../components/MessageComposerModal';
import Button from '../components/Button';
import { parseApiResult, runWithFeedback, humanizeErrorMessage } from '../utils/feedback';
import { focusErrorsSoon, isDuplicateMessage } from '../utils/formBehavior';
import { getBalanceBadgeClass, getBalanceLabel, getBalanceRowClass, getBalanceState } from '../utils/adaptiveUi';
import { PeopleZeroStateLanding } from '../components/ui/PeopleUiKit';
import { formatCurrencyText, readStoredCurrencyUnit } from '../utils/currency';
import AppSearchField from '../components/ui/AppSearchField';
import AppSelectField from '../components/ui/AppSelectField';


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

const isCustomerTrustRisky = (profile?: CustomerTrustListItem | null) => {
  if (!profile) return false;
  const score = Number(profile.score || 0);
  const lateOrOverdue = Number(profile.latePaymentCount || 0) + Number(profile.overdueUnpaidCount || 0);
  const returnedChecks = Number(profile.returnedCheckCount || 0);
  return score < 50 || lateOrOverdue > 0 || returnedChecks > 0;
};


// رنگ موجودی با سازگاری دارک/لایت
const formatCurrency = (amount?: number, overdue = false) => {
  const state = getBalanceState(amount, { overdue });
  const n = Math.abs(Number(amount || 0)).toLocaleString('fa-IR');
  return (
    <span className={getBalanceBadgeClass(state)}>
      <i className={`fa-solid ${state === 'overdue' ? 'fa-triangle-exclamation' : state === 'negative' ? 'fa-arrow-up' : state === 'positive' ? 'fa-arrow-down' : 'fa-circle-check'}`} />
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

const buildCustomerDueBadge = (sales: InstallmentSale[]): CustomerDueBadge | null => {
  const openSales = sales
    .filter((sale) => sale && sale.overallStatus !== 'تکمیل شده' && sale.nextDueDate)
    .sort((a, b) => moment(a.nextDueDate || '', 'jYYYY/jMM/jDD').valueOf() - moment(b.nextDueDate || '', 'jYYYY/jMM/jDD').valueOf());

  if (openSales.length === 0) return null;

  const nextSale = openSales[0];
  const dueMoment = moment(nextSale.nextDueDate || '', 'jYYYY/jMM/jDD');
  if (!dueMoment.isValid()) {
    return {
      label: 'تاریخ نامعتبر',
      icon: 'fa-calendar-xmark',
      className: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-slate-200',
      hint: 'سررسید ثبت اطلاعات شده معتبر نیست',
      dueDate: nextSale.nextDueDate,
      saleId: nextSale.id,
      openCount: openSales.length,
      countClassName: getDueCountBadgeClassName(openSales.length),
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
      dueDate: nextSale.nextDueDate,
      saleId: nextSale.id,
      openCount: openSales.length,
      countClassName: getDueCountBadgeClassName(openSales.length),
    };
  }
  if (daysDiff === 0) {
    return {
      label: 'امروز',
      icon: 'fa-clock',
      className: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-200',
      hint: 'سررسید برای امروز',
      dueDate: nextSale.nextDueDate,
      saleId: nextSale.id,
      openCount: openSales.length,
      countClassName: getDueCountBadgeClassName(openSales.length),
    };
  }
  if (daysDiff === 1) {
    return {
      label: 'فردا',
      icon: 'fa-calendar-day',
      className: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/40 dark:bg-sky-950/25 dark:text-sky-200',
      hint: 'یک روز تا سررسید',
      dueDate: nextSale.nextDueDate,
      saleId: nextSale.id,
      openCount: openSales.length,
      countClassName: getDueCountBadgeClassName(openSales.length),
    };
  }

  return {
    label: `${daysDiff.toLocaleString('fa-IR')} روز دیگر`,
    icon: 'fa-calendar-week',
    className: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/40 dark:bg-violet-950/25 dark:text-violet-200',
    hint: 'سررسید باز آینده',
    dueDate: nextSale.nextDueDate,
    saleId: nextSale.id,
    openCount: openSales.length,
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

const CustomersPage: React.FC = () => {
  const { token } = useAuth();
  const location = useLocation();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
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
  const [isLoading, setIsLoading] = useState(true);
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

  const availableTags = React.useMemo(() => {
    const set = new Set<string>();
    customers.forEach(c => normalizeTags((c as any).tags).forEach(t => set.add(t)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [customers]);

  const stats = React.useMemo(() => {
    const balances = customers.map((c) => (c as any).currentBalance).filter((x) => typeof x === 'number') as number[];
    const total = customers.length;
    const debtors = balances.filter((b) => b < 0).length;
    const creditors = balances.filter((b) => b > 0).length;
    const settled = total - debtors - creditors;
    const totalDebt = balances.filter((b) => b < 0).reduce((s, b) => s + Math.abs(b), 0);
    const totalCredit = balances.filter((b) => b > 0).reduce((s, b) => s + b, 0);
    const followupCount = balances.filter((b) => b < 0 && Math.abs(b) >= 5000000).length;
    return { total, debtors, creditors, settled, totalDebt, totalCredit, followupCount };
  }, [customers]);

  const riskyCustomersCount = React.useMemo(() => (
    customers.filter((customer) => isCustomerTrustRisky(customerTrustProfiles[customer.id])).length
  ), [customers, customerTrustProfiles]);


  const fetchCustomerDueBadges = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/installment-sales', { headers: getAuthHeaders(token) });
      const json = await res.json();
      if (!res.ok || !json?.success || !Array.isArray(json?.data)) throw new Error(json?.message || 'خطا در دریافت فروش‌های اقساطی');

      const grouped = new Map<number, InstallmentSale[]>();
      (json.data as InstallmentSale[]).forEach((sale) => {
        if (!sale || typeof sale.customerId !== 'number') return;
        const bucket = grouped.get(sale.customerId) || [];
        bucket.push(sale);
        grouped.set(sale.customerId, bucket);
      });

      const nextBadges: Record<number, CustomerDueBadge | null> = {};
      grouped.forEach((sales, customerId) => {
        nextBadges[customerId] = buildCustomerDueBadge(sales);
      });
      setCustomerDueBadges(nextBadges);
    } catch {
      setCustomerDueBadges({});
    }
  };


  const fetchCustomerTrustProfiles = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/customers/trust-profiles', { headers: getAuthHeaders(token) });
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

  const fetchCustomers = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/customers', { headers: getAuthHeaders(token) });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'خطا در دریافت لیست مشتریان');
      setCustomers(json.data);
      setFilteredCustomers(json.data);
    } catch (e:any) {
      setNotification({ type: 'error', text: humanizeErrorMessage(e.message, { endpoint: '/api/customers', action: 'افزودن مورد جدید مشتری' }) });
    } finally {
      setIsLoading(false);
    }
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

  useEffect(() => { if (token) { fetchCustomers(); fetchCustomerDueBadges(); fetchCustomerTrustProfiles(); } }, [token]);

  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search || '');
      if (params.get('risk') === 'risky') setRiskFilter('risky');
    } catch {}
  }, [location.search]);

  useEffect(() => {
    const q = searchTerm.toLowerCase().trim();
    const tf = tagFilter.trim();

    setFilteredCustomers(
      customers.filter((c) => {
        const matchesSearch = !q
          ? true
          : (c.fullName.toLowerCase().includes(q) || (c.phoneNumber && c.phoneNumber.includes(q)));
        if (!matchesSearch) return false;

        if (tf) {
          const tags = normalizeTags((c as any).tags);
          if (!tags.includes(tf)) return false;
        }

        const bal = (c as any).currentBalance as any;
        const nbal = typeof bal === 'number' ? bal : 0;
        if (balanceFilter === 'debt' && !(nbal < 0)) return false;
        if (balanceFilter === 'credit' && !(nbal > 0)) return false;
        if (balanceFilter === 'settled' && !(nbal == 0)) return false;

        if (riskFilter === 'risky' && !isCustomerTrustRisky(customerTrustProfiles[c.id])) return false;

        return true;
      }).sort((a, b) => {
        const ba = Number((a as any).currentBalance || 0);
        const bb = Number((b as any).currentBalance || 0);
        if (sortMode === 'balanceDesc') return Math.abs(bb) - Math.abs(ba);
        if (sortMode === 'balanceAsc') return Math.abs(ba) - Math.abs(bb);
        if (sortMode === 'recent') return Number((b as any).id || 0) - Number((a as any).id || 0);
        return String(a.fullName || '').localeCompare(String(b.fullName || ''), 'fa');
      })
    );
  }, [searchTerm, tagFilter, balanceFilter, riskFilter, sortMode, customers, customerTrustProfiles]);

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
    if (newCustomer.phoneNumber && !/^\d{10,15}$/.test(newCustomer.phoneNumber.trim())) {
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
          await fetch('/api/customers', {
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
      fetchCustomers();
      fetchCustomerDueBadges();
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
      setFilteredCustomers(prev => prev.filter(c => c.id !== confirmDelete.id));
      setNotification({ type: 'success', text: `«${confirmDelete.fullName}» حذف مورد شد.` });
      setConfirmDelete(null);
      setCustomerDueBadges(prev => { const next = { ...prev }; delete next[confirmDelete.id]; return next; });
    } catch (err:any) {
      setNotification({ type: 'error', text: humanizeErrorMessage(err.message, { endpoint: '/api/customers', action: 'حذف مورد مشتری' }) });
    } finally {
      setIsDeleting(false);
    }
  };

  const inputClass = (fieldName: keyof NewCustomerData, isTextarea = false) =>
    [
      'w-full rounded-lg text-sm text-right',
      'px-3 py-2 border shadow-sm outline-none',
      'bg-white text-gray-800 preview-gray-400',
      'dark:bg-slate-900/60 dark:text-gray-100 dark:preview-gray-400',
      formErrors[fieldName] ? 'border-red-500 ring-1 ring-red-400' : 'border-gray-300 dark:border-slate-700',
      '   ',
      isTextarea ? 'resize-y' : ''
    ].join(' ');

  const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1';

  const exportFilenameBase = `customers-${new Date().toISOString().slice(0, 10)}`;
  const exportRows = filteredCustomers.map((c) => ({
    fullName: c.fullName,
    phone: c.phoneNumber ?? '',
    tags: normalizeTags((c as any).tags).join('، '),
    address: c.address ?? '',
    notes: c.notes ?? '',
    balance: (c as any).currentBalance ?? 0,
  }));

  const doExportExcel = () => {
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
      ],
      'Customers',
    );
  };

  const doExportPdf = () => {
    exportToPdfTable({
      filename: `${exportFilenameBase}.pdf`,
      title: 'لیست مشتریان',
      head: ['نام', 'تلفن', 'مانده'],
      body: exportRows.map((r) => [
        r.fullName,
        r.phone,
        r.balance === '' || r.balance == null ? '—' : Number(r.balance).toLocaleString('fa-IR'),
      ]),
    });
  };

  return (
    <PageKit
      className="people-merged-page people-foundation"
      title="مشتریان"
      subtitle="پرونده مشتریان، وضعیت مانده حساب و عملیات ارتباطی را در یک نمای منظم مدیریت کنید."
      icon={<i className="fa-solid fa-user-group" />}
      query={searchTerm}
      onQueryChange={setSearchTerm}
      searchPlaceholder="جستجو بر اساس نام یا شماره تماس..."
      toolbarRight={
        <>
          <ExportMenu
            className="shrink-0"
            items={[
              { key: 'excel', label: 'Excel (XLSX)', icon: 'fa-file-excel', onClick: doExportExcel, disabled: filteredCustomers.length === 0 },
              { key: 'pdf', label: 'PDF (جدول)', icon: 'fa-file-pdf', onClick: doExportPdf, disabled: filteredCustomers.length === 0 },
              { key: 'print', label: 'چاپ لیست', icon: 'fa-print', onClick: () => printArea('#customers-print-area', { title: 'لیست مشتریان' }), disabled: filteredCustomers.length === 0 },
            ]}
          />
          <Button
            onClick={() => setIsAddModalOpen(true)}
            variant="primary"
            requiredRoles={['Admin','Manager','Salesperson']}
            className="whitespace-nowrap people-primary-btn"
            leftIcon={<i className="fas fa-user-plus" />}
          >
            افزودن مورد جدید مشتری
          </Button>
        </>
      }
      secondaryRow={
        <div className="people-top-nav">
          <Link to="/customers" className="people-top-nav__item is-active">
            <i className="fa-solid fa-user-group" />
            <span>مشتریان</span>
          </Link>
          <Link to="/partners" className="people-top-nav__item">
            <i className="fa-solid fa-building" />
            <span>همکاران</span>
          </Link>
          <Notification message={notification} onClose={() => setNotification(null)} />
        </div>
      }
    >
      <div className="people-page-shell people-customers-shell text-right max-w-7xl mx-auto px-3 sm:px-4" dir="rtl" data-ui-people-page="customers" data-ui-people-scope="list">
        {/* کارت اصلی لیست مشتریان */}
      <div className="people-list-shell list-shell-modern" data-ui-people-surface="list-shell">
        <div className="people-hero-panel customers-hero-panel people-unified-hero">
          <div className="people-unified-hero__top">
            <div className="people-top-nav people-top-nav--large">
              <Link to="/customers" className="people-top-nav__item is-active">
                <i className="fa-solid fa-user-group" />
                <span>مشتریان</span>
              </Link>
              <Link to="/partners" className="people-top-nav__item">
                <i className="fa-solid fa-building" />
                <span>همکاران</span>
              </Link>
            </div>
            <div className="people-unified-hero__actions">
              <ExportMenu
                className="shrink-0"
                items={[
                  { key: 'excel', label: 'Excel (XLSX)', icon: 'fa-file-excel', onClick: doExportExcel, disabled: filteredCustomers.length === 0 },
                  { key: 'pdf', label: 'PDF (جدول)', icon: 'fa-file-pdf', onClick: doExportPdf, disabled: filteredCustomers.length === 0 },
                  { key: 'print', label: 'چاپ لیست', icon: 'fa-print', onClick: () => printArea('#customers-print-area', { title: 'لیست مشتریان' }), disabled: filteredCustomers.length === 0 },
                ]}
              />
              <Button
                onClick={() => setIsAddModalOpen(true)}
                variant="primary"
                requiredRoles={['Admin','Manager','Salesperson']}
                className="whitespace-nowrap people-primary-btn"
                leftIcon={<i className="fas fa-user-plus" />}
              >
                افزودن مشتری
              </Button>
            </div>
          </div>

          <div className="people-unified-hero__body">
            <div className="customers-hero-copy">
              <div className="customers-hero-eyebrow">مدیریت اشخاص</div>
              <div className="customers-hero-title-row">
                <h2 className="customers-hero-title">نمای کلی مشتریان</h2>
                <span className="customers-hero-badge">{filteredCustomers.length.toLocaleString('fa-IR')} نتیجه فعال</span>
              </div>
              <p className="customers-hero-subtitle">در این بخش فقط وضعیت کلی، مانده‌ها و ابزارهای سریع مدیریت مشتری نمایش داده می‌شود؛ جزئیات هر مشتری در صفحه اختصاصی خودش قابل پیگیری است.</p>
            </div>
            <div className="customers-hero-quickstats">
              <div className="customers-hero-mini customers-hero-mini--debt">
                <span className="customers-hero-mini__icon"><i className="fa-solid fa-arrow-trend-down" /></span>
                <div className="customers-hero-mini__content">
                  <span className="customers-hero-mini__label">حساب بدهکار</span>
                  <strong className="customers-hero-mini__value">{formatCurrencyText(stats.totalDebt, readStoredCurrencyUnit())}</strong>
                  <small className="customers-hero-mini__meta">جمع مانده بدهی مشتریان در این نما</small>
                </div>
              </div>
              <div className="customers-hero-mini customers-hero-mini--credit">
                <span className="customers-hero-mini__icon"><i className="fa-solid fa-arrow-trend-up" /></span>
                <div className="customers-hero-mini__content">
                  <span className="customers-hero-mini__label">حساب بستانکار</span>
                  <strong className="customers-hero-mini__value">{formatCurrencyText(stats.totalCredit, readStoredCurrencyUnit())}</strong>
                  <small className="customers-hero-mini__meta">جمع بستانکاری ثبت‌شده برای مشتریان</small>
                </div>
              </div>
            </div>
          </div>
          <Notification message={notification} onClose={() => setNotification(null)} />
        </div>

      <div className="people-stats-grid mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" data-ui-people-metrics="true">
        <div className="people-stat-card">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="people-stat-card__label">کل مشتریان</div>
              <div className="people-stat-card__value">{stats.total.toLocaleString('fa-IR')}</div>
              <div className="people-stat-card__meta">پرونده‌های فعال و آرشیوی قابل پیگیری</div>
            </div>
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-violet-100 bg-violet-50 text-violet-600"><i className="fa-solid fa-user-group" /></span>
          </div>
        </div>
        <div className="people-stat-card">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="people-stat-card__label">بدهکار</div>
              <div className="people-stat-card__value text-rose-600">{stats.debtors.toLocaleString('fa-IR')}</div>
              <div className="people-stat-card__meta">جمع بدهی: {formatCurrencyText(stats.totalDebt, readStoredCurrencyUnit())}</div>
            </div>
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-rose-100 bg-rose-50 text-rose-600"><i className="fa-solid fa-arrow-trend-down" /></span>
          </div>
        </div>
        <div className="people-stat-card">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="people-stat-card__label">بستانکار</div>
              <div className="people-stat-card__value text-emerald-600">{stats.creditors.toLocaleString('fa-IR')}</div>
              <div className="people-stat-card__meta">جمع بستانکاری: {formatCurrencyText(stats.totalCredit, readStoredCurrencyUnit())}</div>
            </div>
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 text-emerald-600"><i className="fa-solid fa-arrow-trend-up" /></span>
          </div>
        </div>
        <div className="people-stat-card">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="people-stat-card__label">تسویه</div>
              <div className="people-stat-card__value">{stats.settled.toLocaleString('fa-IR')}</div>
              <div className="people-stat-card__meta">حساب‌های بدون بدهی یا بستانکاری</div>
            </div>
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 text-slate-600"><i className="fa-solid fa-circle-check" /></span>
          </div>
        </div>
      </div>

      <div className="people-filter-bar mb-4 flex flex-wrap items-center gap-2" data-ui-people-filters="true">
        {[
          { key: 'all', label: 'همه', icon: 'fa-layer-group' },
          { key: 'debt', label: 'بدهکار', icon: 'fa-arrow-up' },
          { key: 'credit', label: 'بستانکار', icon: 'fa-arrow-down' },
          { key: 'settled', label: 'تسویه', icon: 'fa-circle-check' },
        ].map((it) => {
          const active = balanceFilter === (it.key as any);
          return (
            <Button
              key={it.key}
              type="button"
              onClick={() => setBalanceFilter(it.key as any)}
              variant={active ? 'primary' : 'secondary'}
              size="sm"
              leftIcon={<i className={`fa-solid ${it.icon || 'fa-circle-dot'} text-[11px]`} />}
              className="people-filter-chip transition"
            >
              {it.label}
            </Button>
          );
        })}
        <Button
          type="button"
          onClick={() => setRiskFilter((prev) => prev === 'risky' ? 'all' : 'risky')}
          variant={riskFilter === 'risky' ? 'warning' : 'secondary'}
          size="sm"
          leftIcon={<i className="fa-solid fa-triangle-exclamation text-[11px]" />}
          className="people-filter-chip transition"
          title="نمایش مشتری‌هایی با امتیاز زیر ۵۰، دیرکرد/معوق یا چک برگشتی"
        >
          فقط مشتریان پرریسک
          {riskyCustomersCount > 0 ? (
            <span className="mr-1 rounded-full bg-black/10 px-1.5 py-0.5 text-[10px] font-black dark:bg-white/15">
              {riskyCustomersCount.toLocaleString('fa-IR')}
            </span>
          ) : null}
        </Button>
      </div>

        <div className="people-toolbar customers-toolbar customers-toolbar--premium dark:text-slate-100">
          <div className="customers-toolbar__inline-strip" aria-label="خلاصه نمای مشتریان">
            <div className="customers-toolbar__select-wrap customers-toolbar__item">
              <i className="fa-solid fa-tags customers-toolbar__icon" />
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="customers-toolbar__select"
              >
                <option value="">همه تگ‌ها</option>
                {availableTags.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="customers-toolbar__summary customers-toolbar__summary--premium customers-toolbar__item">
              <i className="fa-regular fa-circle-dot" />
              <span>{filteredCustomers.length.toLocaleString('fa-IR')} مشتری در این نما</span>
            </div>
            <AppSearchField
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="جستجو در مشتریان بر اساس نام یا شماره تماس..."
              ariaLabel="جستجوی مشتریان"
              size="md"
              className="customers-toolbar__item customers-toolbar__item--wide"
            />
            <AppSelectField
              value={sortMode}
              onChange={setSortMode}
              ariaLabel="مرتب‌سازی مشتریان"
              size="md"
              className="customers-toolbar__item people-sort-select"
              options={[
                { value: 'name', label: 'مرتب‌سازی: نام مشتری' },
                { value: 'balanceDesc', label: 'بیشترین مانده مالی' },
                { value: 'balanceAsc', label: 'کمترین مانده مالی' },
                { value: 'recent', label: 'جدیدترین پرونده' },
              ]}
            />
            {(searchTerm || tagFilter || balanceFilter !== 'all' || riskFilter !== 'all' || sortMode !== 'name') ? (
              <button type="button" className="people-toolbar-reset customers-toolbar__item" onClick={() => { setSearchTerm(''); setTagFilter(''); setBalanceFilter('all'); setRiskFilter('all'); setSortMode('name'); }}>
                <i className="fa-solid fa-rotate-left" /> پاک‌سازی نما
              </button>
            ) : null}
          </div>
        </div>

        {riskFilter === 'risky' ? (
          <div className="mb-4 rounded-[22px] border border-amber-200 bg-amber-50/85 px-4 py-3 text-[12px] font-bold text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/25 dark:text-amber-200">
            <i className="fa-solid fa-triangle-exclamation ml-2" />
            فیلتر فعال است: فقط مشتری‌هایی نمایش داده می‌شوند که امتیاز اعتماد زیر ۵۰ دارند، دیرکرد/معوق فعال دارند یا چک برگشتی در سابقه‌شان ثبت شده است.
            <span className="mr-2 font-black">({filteredCustomers.length.toLocaleString('fa-IR')} مشتری)</span>
          </div>
        ) : null}

        {isLoading ? (
          <div className="space-y-4">
            <div className="hidden md:block overflow-hidden">
              <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/40">
                <div className="grid grid-cols-5 gap-3">
                  {Array.from({ length: 15 }).map((_, i) => (
                    <Skeleton key={i} tone="info" className="h-9" rounded="lg" />
                  ))}
                </div>
              </div>
            </div>
            <div className="md:hidden space-y-4 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
                  <div className="people-mobile-card__topline">
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton tone="info" className="h-5 w-2/3" rounded="lg" />
                      <Skeleton tone="info" className="h-4 w-1/2" rounded="lg" />
                    </div>
                    <Skeleton tone="info" className="h-5 w-20" rounded="lg" />
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-gray-100 dark:border-slate-800 pt-3 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Skeleton tone="info" className="h-9 w-9" rounded="xl" />
                      <Skeleton tone="info" className="h-9 w-9" rounded="xl" />
                    </div>
                    <Skeleton tone="info" className="h-9 w-28" rounded="xl" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : customers.length === 0 ? (
          <PeopleZeroStateLanding
            entity="customer"
            primaryLabel="افزودن مشتری"
            onPrimaryAction={() => setIsAddModalOpen(true)}
            secondaryLabel="رفتن به همکاران"
            onSecondaryAction={() => window.location.assign('/partners')}
          />
        ) : filteredCustomers.length === 0 ? (
          <PeopleZeroStateLanding
            entity="customer"
            title="مشتری‌ای با این فیلتر پیدا نشد"
            description={searchTerm ? `جستجوی «${searchTerm}» با هیچ مشتری‌ای مطابقت نداشت. جستجو یا فیلترها را تغییر دهید.` : 'در این فیلتر موردی برای نمایش وجود ندارد. تگ یا وضعیت مانده را تغییر دهید یا فیلترها را پاک کنید.'}
            primaryLabel="پاک کردن فیلترها"
            onPrimaryAction={() => { setSearchTerm(''); setTagFilter(''); setBalanceFilter('all'); }}
            secondaryLabel="افزودن مشتری"
            onSecondaryAction={() => setIsAddModalOpen(true)}
            searchTerm={searchTerm}
            onClearSearch={searchTerm ? () => setSearchTerm('') : undefined}
          />
        ) : (
          <>
            {/* Desktop: Table */}
            <div className="people-table-shell hidden md:block overflow-hidden dark:text-slate-100" id="customers-print-area">
              <table className="min-w-full table-fixed text-sm divide-y divide-gray-200 dark:divide-slate-800">
                <colgroup>
                  <col className="customers-table-col customers-table-col--name" />
                  <col className="customers-table-col customers-table-col--phone" />
                  <col className="customers-table-col customers-table-col--balance" />
                  <col className="customers-table-col customers-table-col--trust" />
                  <col className="customers-table-col customers-table-col--actions" />
                </colgroup>
                <thead className="people-table-head">
                  <tr>
                    <th className="px-6 py-3 text-right font-semibold">نام کامل</th>
                    <th className="px-6 py-3 text-right font-semibold">شماره تماس</th>
                    <th className="px-6 py-3 text-right font-semibold">موجودی حساب</th>
                    <th className="px-6 py-3 text-right font-semibold">امتیاز اعتماد</th>
                    <th className="px-6 py-3 text-right font-semibold">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-950/60">
                  {filteredCustomers.map(customer => (
                    <tr key={customer.id} className={`people-table-row ${getCustomerDueRowStateClass(customerDueBadges[customer.id])} ${getBalanceRowClass(getBalanceState(customer.currentBalance, { overdue: Boolean(customerDueBadges[customer.id]?.label?.includes('عقب')) }))}`.trim()}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="customer-row-avatar">{(customer.fullName || '?').trim().charAt(0)}</span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="customer-name-full font-bold text-slate-900 dark:text-slate-100">{customer.fullName}</div>
                              {customerDueBadges[customer.id] ? (
                                customerDueBadges[customer.id]!.saleId ? (
                                  <Link
                                    to={`/installment-sales/${customerDueBadges[customer.id]!.saleId}?pay=next`}
                                    className={`group inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold transition hover:-translate-y-0.5 hover:shadow-sm      ${customerDueBadges[customer.id]!.className}`}
                                    title={`${customerDueBadges[customer.id]!.hint}${(customerDueBadges[customer.id]!.openCount ?? 0) > 1 ? ` • ${(customerDueBadges[customer.id]!.openCount ?? 0).toLocaleString('fa-IR')} قسط باز` : ''}${customerDueBadges[customer.id]!.dueDate ? ` • ${customerDueBadges[customer.id]!.dueDate}` : ''} • ورود مستقیم به ثبت اطلاعات پرداخت`}
                                    data-tooltip={`ورود مستقیم به ثبت اطلاعات پرداخت قسط${(customerDueBadges[customer.id]!.openCount ?? 0) > 1 ? ` • ${(customerDueBadges[customer.id]!.openCount ?? 0).toLocaleString('fa-IR')} قسط باز` : ''}${customerDueBadges[customer.id]!.dueDate ? ` • ${customerDueBadges[customer.id]!.dueDate}` : ''}`}
                                    aria-label={`ورود مستقیم به ثبت اطلاعات پرداخت برای ${customer.fullName}`}
                                  >
                                    <i className={`fa-solid ${customerDueBadges[customer.id]!.icon}`} />
                                    {customerDueBadges[customer.id]!.label}
                                    {(customerDueBadges[customer.id]!.openCount ?? 0) > 1 ? (
                                      <span className={`inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5 py-0.5 text-[9px] font-black ${customerDueBadges[customer.id]!.countClassName ?? 'bg-black/10 text-current dark:bg-white/10 dark:text-current'}`}>
                                        {(customerDueBadges[customer.id]!.openCount ?? 0).toLocaleString('fa-IR')}
                                      </span>
                                    ) : null}
                                    <i className="fa-solid fa-arrow-up-left-from-circle text-[9px] opacity-70" />
                                  </Link>
                                ) : (
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${customerDueBadges[customer.id]!.className}`}
                                    title={`${customerDueBadges[customer.id]!.hint}${(customerDueBadges[customer.id]!.openCount ?? 0) > 1 ? ` • ${(customerDueBadges[customer.id]!.openCount ?? 0).toLocaleString('fa-IR')} قسط باز` : ''}${customerDueBadges[customer.id]!.dueDate ? ` • ${customerDueBadges[customer.id]!.dueDate}` : ''}`}
                                  >
                                    <i className={`fa-solid ${customerDueBadges[customer.id]!.icon}`} />
                                    {customerDueBadges[customer.id]!.label}
                                    {(customerDueBadges[customer.id]!.openCount ?? 0) > 1 ? (
                                      <span className={`inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5 py-0.5 text-[9px] font-black ${customerDueBadges[customer.id]!.countClassName ?? 'bg-black/10 text-current dark:bg-white/10 dark:text-current'}`}>
                                        {(customerDueBadges[customer.id]!.openCount ?? 0).toLocaleString('fa-IR')}
                                      </span>
                                    ) : null}
                                  </span>
                                )
                              ) : null}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              پرونده مشتری #{customer.id.toLocaleString('fa-IR')}
                              {customerDueBadges[customer.id]?.dueDate ? ` • ${customerDueBadges[customer.id]?.dueDate}` : ''}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap align-middle">
                        <div className="space-y-1">
                          <div dir="ltr" className="font-medium text-slate-800 dark:text-slate-200">{customer.phoneNumber || '-'}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">راه ارتباطی اصلی مشتری</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap align-middle">{formatCurrency(customer.currentBalance, Boolean(customerDueBadges[customer.id]?.label?.includes('عقب')))}</td>
                      <td className="px-6 py-4 whitespace-nowrap align-middle">
                        {customerTrustProfiles[customer.id] ? (
                          <div className="space-y-1.5">
                            <span
                              className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-black ${getCustomerTrustBadgeClass(customerTrustProfiles[customer.id]?.score)}`}
                              title={`سقف اعتبار پیشنهادی: ${formatCurrencyText(Number(customerTrustProfiles[customer.id]?.suggestedCreditLimit || 0), readStoredCurrencyUnit())}`}
                            >
                              <i className={Number(customerTrustProfiles[customer.id]?.score || 0) >= 68 ? 'fa-solid fa-user-check' : Number(customerTrustProfiles[customer.id]?.score || 0) >= 50 ? 'fa-solid fa-user-clock' : 'fa-solid fa-triangle-exclamation'} />
                              {Number(customerTrustProfiles[customer.id]?.score || 0).toLocaleString('fa-IR')} از ۱۰۰
                            </span>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              {customerTrustProfiles[customer.id]?.tierLabel || 'نامشخص'}
                              {Number(customerTrustProfiles[customer.id]?.latePaymentCount || 0) + Number(customerTrustProfiles[customer.id]?.overdueUnpaidCount || 0) > 0
                                ? ` • ${(Number(customerTrustProfiles[customer.id]?.latePaymentCount || 0) + Number(customerTrustProfiles[customer.id]?.overdueUnpaidCount || 0)).toLocaleString('fa-IR')} دیرکرد/معوق`
                                : ''}
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                            <i className="fa-solid fa-circle-question" />
                            نامشخص
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap align-middle">
                        <div className="flex flex-wrap items-center justify-end gap-2 leading-none">
                          <Link
                            to={`/customers/${customer.id}`}
                            className="people-action-btn people-action-btn-primary people-action-btn-spacious people-detail-eye-btn"
                            title="مشاهده جزئیات مشتری"
                          >
                            <span className="people-detail-eye-btn__icon"><i className="fa-solid fa-eye" /></span>
                            مشاهده جزئیات
                          </Link>
                          <Button
                            onClick={() => openTelegramReport(customer)}
                            variant="secondary"
                            size="sm"
                            className="people-action-btn people-action-btn-secondary people-action-btn-spacious"
                            title="ارسال گزارش کامل در تلگرام"
                            leftIcon={<i className="fa-brands fa-telegram" />}
                          >
                            گزارش تلگرام
                          </Button>
                          <Button
                            onClick={() => setConfirmDelete(customer)}
                            variant="danger"
                            size="sm"
                            requiredRoles={['Admin','Manager']}
                            className="people-action-btn people-action-btn-danger people-action-btn-spacious"
                            title="حذف مورد مشتری"
                            leftIcon={<i className="fa-solid fa-trash" />}
                          >
                            حذف مورد
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile: Cards */}
            <div className="md:hidden space-y-4">
              {filteredCustomers.map(customer => (
                <div key={customer.id} className="people-mobile-card customers-mobile-card people-mobile-card--commercial space-y-4">
                  <div className="people-mobile-card__topline">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="customer-row-avatar people-mobile-card__avatar">{(customer.fullName || '?').trim().charAt(0)}</span>
                      <div className="min-w-0">
                        <div className="truncate text-[15px] font-black text-slate-900 dark:text-slate-50">{customer.fullName}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1" dir="ltr">
                          {customer.phoneNumber || 'بدون شماره'}
                        </div>
                        {customerDueBadges[customer.id] ? (
                          <div className="mt-2">
                            {customerDueBadges[customer.id]!.saleId ? (
                              <Link
                                to={`/installment-sales/${customerDueBadges[customer.id]!.saleId}?pay=next`}
                                className={`group inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition hover:-translate-y-0.5 hover:shadow-sm      ${customerDueBadges[customer.id]!.className}`}
                                title={`${customerDueBadges[customer.id]!.hint}${(customerDueBadges[customer.id]!.openCount ?? 0) > 1 ? ` • ${(customerDueBadges[customer.id]!.openCount ?? 0).toLocaleString('fa-IR')} قسط باز` : ''}${customerDueBadges[customer.id]!.dueDate ? ` • ${customerDueBadges[customer.id]!.dueDate}` : ''} • ورود مستقیم به ثبت اطلاعات پرداخت`}
                                data-tooltip={`ورود مستقیم به ثبت اطلاعات پرداخت قسط${(customerDueBadges[customer.id]!.openCount ?? 0) > 1 ? ` • ${(customerDueBadges[customer.id]!.openCount ?? 0).toLocaleString('fa-IR')} قسط باز` : ''}${customerDueBadges[customer.id]!.dueDate ? ` • ${customerDueBadges[customer.id]!.dueDate}` : ''}`}
                                aria-label={`ورود مستقیم به ثبت اطلاعات پرداخت برای ${customer.fullName}`}
                              >
                                <i className={`fa-solid ${customerDueBadges[customer.id]!.icon}`} />
                                {customerDueBadges[customer.id]!.label}
                                {(customerDueBadges[customer.id]!.openCount ?? 0) > 1 ? (
                                  <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-black/10 px-1.5 py-0.5 text-[9px] font-black dark:bg-white/10">
                                    {(customerDueBadges[customer.id]!.openCount ?? 0).toLocaleString('fa-IR')}
                                  </span>
                                ) : null}
                                {customerDueBadges[customer.id]!.dueDate ? <span className="opacity-80">• {customerDueBadges[customer.id]!.dueDate}</span> : null}
                                <i className="fa-solid fa-arrow-up-left-from-circle text-[10px] opacity-70" />
                              </Link>
                            ) : (
                              <span
                                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${customerDueBadges[customer.id]!.className}`}
                                title={`${customerDueBadges[customer.id]!.hint}${(customerDueBadges[customer.id]!.openCount ?? 0) > 1 ? ` • ${(customerDueBadges[customer.id]!.openCount ?? 0).toLocaleString('fa-IR')} قسط باز` : ''}${customerDueBadges[customer.id]!.dueDate ? ` • ${customerDueBadges[customer.id]!.dueDate}` : ''}`}
                              >
                                <i className={`fa-solid ${customerDueBadges[customer.id]!.icon}`} />
                                {customerDueBadges[customer.id]!.label}
                                {(customerDueBadges[customer.id]!.openCount ?? 0) > 1 ? (
                                  <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-black/10 px-1.5 py-0.5 text-[9px] font-black dark:bg-white/10">
                                    {(customerDueBadges[customer.id]!.openCount ?? 0).toLocaleString('fa-IR')}
                                  </span>
                                ) : null}
                                {customerDueBadges[customer.id]!.dueDate ? <span className="opacity-80">• {customerDueBadges[customer.id]!.dueDate}</span> : null}
                              </span>
                            )}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <div className="people-mobile-card__balance">
                      {formatCurrency(customer.currentBalance, Boolean(customerDueBadges[customer.id]?.label?.includes('عقب')))}
                    </div>
                  </div>

                  <div className="people-mobile-card__meta-grid">
                    <div className="people-mobile-card__meta-item">
                      <span><i className="fa-solid fa-phone" /> شماره تماس</span>
                      <strong dir="ltr">{customer.phoneNumber || 'ثبت نشده'}</strong>
                    </div>
                    <div className="people-mobile-card__meta-item">
                      <span><i className="fa-solid fa-wallet" /> وضعیت حساب</span>
                      <strong>{Number(customer.currentBalance || 0) === 0 ? 'تسویه' : Number(customer.currentBalance || 0) > 0 ? 'بدهکار' : 'بستانکار'}</strong>
                    </div>
                  </div>
                  
                  <div className="people-mobile-card__actions border-t border-gray-100 pt-3 dark:border-slate-800">
                    <Link
                      to={`/customers/${customer.id}`}
                      className="people-action-btn people-action-btn-primary people-action-btn-spacious people-action-btn-tight flex-1 !px-3 !text-[11px] text-center"
                    >
                      <i className="fa-solid fa-circle-info" />
                      جزئیات
                    </Link>
                    <Button
                      onClick={() => openTelegramReport(customer)}
                      variant="secondary"
                      size="sm"
                      className="people-action-btn people-action-btn-secondary people-action-btn-spacious people-action-btn-tight !px-3 !text-[11px]"
                      title="ارسال گزارش تلگرام"
                      leftIcon={<i className="fa-brands fa-telegram" />}
                    >
                      تلگرام
                    </Button>
                    <Button
                      onClick={() => setConfirmDelete(customer)}
                      variant="danger"
                      size="sm"
                      requiredRoles={['Admin','Manager']}
                      className="people-action-btn people-action-btn-danger people-action-btn-spacious people-action-btn-tight !px-3 !text-[11px]"
                      leftIcon={<i className="fa-solid fa-trash" />}
                    >
                      حذف
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <MessageComposerModal
        open={msgOpen}
        onClose={() => setMsgOpen(false)}
        onQueued={() => setNotification({ type: 'success', text: 'گزارش در صف ارسال قرار گرفت.' })}
        initialRecipient={msgInitialRecipient || undefined}
        initialText={msgInitialText}
        initialChannels={{ sms: false, telegram: true }}
      />

      {/* مودال افزودن مورد جدید مشتری */}
      {isAddModalOpen && (
        <Modal title="افزودن مشتری" onClose={() => setIsAddModalOpen(false)} widthClass="max-w-4xl" iconClass="fa-solid fa-user-plus" variant="operational">
          <form onSubmit={handleAddCustomerSubmit} className="people-modal-form people-modal-form--horizontal people-modal-form--customer">
            <FormErrorSummary errors={formErrors as any} labels={{ fullName: 'نام کامل', phoneNumber: 'شماره تماس' }} fieldIdMap={{ fullName: 'fullName', phoneNumber: 'phoneNumber' }} />
            <div className="people-modal-form__side">
              <div className="people-modal-summary-card">
                <span className="people-modal-summary-card__eyebrow"><i className="fa-solid fa-user-plus" /> پرونده مشتری جدید</span>
                <div className="people-modal-summary-card__title">{newCustomer.fullName || 'تعریف مشتری جدید'}</div>
                <p className="people-modal-summary-card__text">این اطلاعات مبنای فاکتورها، اقساط، تعمیرات، یادآوری‌ها و ارتباطات بعدی با مشتری خواهد بود.</p>
                <div className="people-modal-summary-metrics">
                  <div className="people-modal-summary-metric">
                    <span className="people-modal-summary-metric__icon"><i className="fa-solid fa-phone" /></span>
                    <div className="people-modal-summary-metric__copy">
                      <span>شماره تماس</span>
                      <strong dir="ltr">{newCustomer.phoneNumber || 'ثبت نشده'}</strong>
                    </div>
                  </div>
                  <div className="people-modal-summary-metric">
                    <span className="people-modal-summary-metric__icon"><i className="fa-solid fa-location-dot" /></span>
                    <div className="people-modal-summary-metric__copy">
                      <span>آدرس پرونده</span>
                      <strong>{newCustomer.address || 'ثبت نشده'}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="people-modal-form__main">
              <div className="people-modal-form__section people-modal-form__section--primary">
                <ModalField label="نام کامل" iconClass="fa-solid fa-user" required error={formErrors.fullName}>
                  <input type="text" id="fullName" name="fullName" value={newCustomer.fullName}
                         onChange={handleInputChange} className={inputClass('fullName')} required placeholder="نام و نام خانوادگی مشتری" />
                </ModalField>

                <ModalField label="شماره تماس" iconClass="fa-solid fa-phone" error={formErrors.phoneNumber}>
                  <input type="tel" id="phoneNumber" name="phoneNumber" value={newCustomer.phoneNumber}
                         onChange={handleInputChange} className={inputClass('phoneNumber')} placeholder="مثال: 09123456789" />
                </ModalField>
              </div>

              <div className="people-modal-form__section people-modal-form__section--wide">
                <ModalField label="آدرس" iconClass="fa-solid fa-location-dot">
                  <textarea id="address" name="address" rows={2} value={newCustomer.address}
                            onChange={handleInputChange} className={inputClass('address', true)} placeholder="آدرس ثبت‌شده مشتری" />
                </ModalField>

                <ModalField label="یادداشت داخلی" iconClass="fa-solid fa-note-sticky">
                  <textarea id="notes" name="notes" rows={2} value={newCustomer.notes}
                            onChange={handleInputChange} className={inputClass('notes', true)} placeholder="مثلاً توضیحات پیگیری، رفتار پرداخت یا نکات ارتباطی" />
                </ModalField>
              </div>

              <ModalActions onCancel={() => setIsAddModalOpen(false)} submitText="ثبت مشتری" submittingText="در حال ذخیره تغییرات..." isSubmitting={isSubmitting} submitDisabled={!token} />
            </div>
          </form>
        </Modal>
      )}

      {/* مودال تأیید حذف مورد */}
      {confirmDelete && (
        <Modal title={`حذف مورد مشتری «${confirmDelete.fullName}»`} onClose={() => setConfirmDelete(null)} widthClass="max-w-md">
          <div className="space-y-4">
            <p className="text-sm">آیا از حذف مورد این مشتری مطمئن هستید؟ این عملیات غیرقابل بازگشت است.</p>
            <ModalActions
              onCancel={() => setConfirmDelete(null)}
              cancelText="انصراف"
              submitText="حذف مورد نهایی"
              submittingText="در حال حذف مورد..."
              isSubmitting={isDeleting}
              submitDisabled={isDeleting}
              submitVariant="danger"
              submitType="button"
              submitIconClass="fa-solid fa-trash"
              onSubmitClick={handleDeleteCustomer}
            />
          </div>
        </Modal>
      )}
    </div>
  </PageKit>
  );
};

export default CustomersPage;
