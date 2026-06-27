import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { Partner, NewPartnerData, NotificationMessage } from '../types';
import Notification from '../components/Notification';
import Modal from '../components/Modal';
import ModalField from '../components/ModalField';
import ModalActions from '../components/ModalActions';
import FormErrorSummary from '../components/FormErrorSummary';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../utils/apiFetch';
import { parseApiResult, runWithFeedback, humanizeErrorMessage } from '../utils/feedback';
import { PARTNER_TYPES } from '../constants';
import PageKit from '../components/ui/PageKit';
import MessageComposerModal from '../components/MessageComposerModal';
import Button from '../components/Button';
import { PeopleZeroStateLanding } from '../components/ui/PeopleUiKit';
import { focusErrorsSoon, isDuplicateMessage } from '../utils/formBehavior';
import { getBalanceBadgeClass, getBalanceLabel, getBalanceRowClass, getBalanceState } from '../utils/adaptiveUi';
import { formatCurrencyText, readStoredCurrencyUnit } from '../utils/currency';
import AppSearchField from '../components/ui/AppSearchField';
import AppSelectField from '../components/ui/AppSelectField';

// Helper to format partner balance
const faNum = (value: number | undefined | null) => Number(value || 0).toLocaleString('fa-IR');
const formatPartnerBalance = (amount?: number) => {
  const state = getBalanceState(amount, { overdue: Math.abs(Number(amount || 0)) >= 50000000 });
  const absAmountStr = Math.abs(Number(amount || 0)).toLocaleString('fa-IR') + ' تومان';
  const compactLabel = state === 'positive'
    ? 'بدهی به همکار'
    : state === 'negative'
      ? 'طلب از همکار'
      : state === 'overdue'
        ? 'نیازمند پیگیری'
        : 'تسویه';
  return (
    <span className={`${getBalanceBadgeClass(state)} partner-balance-chip`} title={`${absAmountStr} · ${getBalanceLabel(state, 'partner')}`}>
      <i className={`fa-solid ${state === 'positive' ? 'fa-arrow-up-left' : state === 'negative' ? 'fa-arrow-down-right' : state === 'overdue' ? 'fa-triangle-exclamation' : 'fa-circle-check'}`} />
      <span className="partner-balance-chip__copy">
        <strong>{absAmountStr}</strong>
        <small>{compactLabel}</small>
      </span>
    </span>
  );
};

const PartnersPage: React.FC = () => {
  const { token } = useAuth();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [filteredPartners, setFilteredPartners] = useState<Partner[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [balanceFilter, setBalanceFilter] = useState<'all' | 'debt' | 'credit' | 'settled'>('all');
  const [sortMode, setSortMode] = useState<'name' | 'balanceDesc' | 'balanceAsc' | 'recent'>('name');
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);

  // Telegram report messaging
  const [msgOpen, setMsgOpen] = useState(false);
  const [msgInitialRecipient, setMsgInitialRecipient] = useState<any>(null);
  const [msgInitialText, setMsgInitialText] = useState<string>('');

  const stats = React.useMemo(() => {
    const num = (key: string) => partners.reduce((sum, p) => sum + Number((p as any)[key] || 0), 0);
    const balances = partners.map((p) => Number((p as any).currentBalance || 0));
    const total = partners.length;
    const debtors = balances.filter((b) => b > 0).length;
    const creditors = balances.filter((b) => b < 0).length;
    const settled = total - debtors - creditors;
    const totalDebt = balances.filter((b) => b > 0).reduce((sum, b) => sum + b, 0);
    const totalCredit = balances.filter((b) => b < 0).reduce((sum, b) => sum + Math.abs(b), 0);
    return {
      total,
      debtors,
      creditors,
      settled,
      totalPhonesSupplied: num('totalPhonesSupplied'),
      phonesSoldCount: num('phonesSoldCount'),
      phonesInstallmentSoldCount: num('phonesInstallmentSoldCount'),
      openInstallmentSalesCount: num('openInstallmentSalesCount'),
      unsoldPhonesCount: num('unsoldPhonesCount'),
      accessoriesPayableAmount: num('accessoriesPayableAmount'),
      phoneSalesReceivableAmount: num('phoneSalesReceivableAmount'),
      soldPhonesCurrentPurchaseAmount: num('soldPhonesCurrentPurchaseAmount'),
      soldPhonesInitialPurchaseAmount: num('soldPhonesInitialPurchaseAmount'),
      soldPhonesProductSettlementPaidAmount: num('soldPhonesProductSettlementPaidAmount'),
      soldPhonesProductSettlementBalance: num('soldPhonesProductSettlementBalance'),
      soldPhonesCurrentPurchaseBalance: num('soldPhonesCurrentPurchaseBalance'),
      soldPhoneCurrentDeltaAmount: num('soldPhoneCurrentDeltaAmount'),
      totalReceivableAmount: num('totalReceivableAmount') || totalDebt,
      totalDebt,
      totalCredit,
    };
  }, [partners]);

  const partnerKpis = React.useMemo(() => [
    { key: 'totalPhones', label: 'کل گوشی‌های دریافتی', value: faNum(stats.totalPhonesSupplied), meta: faNum(stats.total) + ' همکار فعال', icon: 'fa-mobile-screen-button', tone: 'blue' },
    { key: 'soldPhones', label: 'گوشی فروخته‌شده', value: faNum(stats.phonesSoldCount), meta: faNum(stats.phonesInstallmentSoldCount) + ' فروش قسطی', icon: 'fa-cart-shopping', tone: 'emerald' },
    { key: 'openInstallments', label: 'فروش قسطی باز', value: faNum(stats.openInstallmentSalesCount), meta: 'پرونده‌های نیازمند پیگیری', icon: 'fa-file-invoice-dollar', tone: 'amber' },
    { key: 'unsoldPhones', label: 'گوشی فروخته‌نشده', value: faNum(stats.unsoldPhonesCount), meta: 'موجود نزد فروشگاه', icon: 'fa-box-open', tone: 'slate' },
    { key: 'accessories', label: 'بابت لوازم', value: formatCurrencyText(stats.accessoriesPayableAmount, readStoredCurrencyUnit()), meta: 'ارزش خرید موجودی تامین‌شده', icon: 'fa-headphones-simple', tone: 'violet' },
    { key: 'phoneReceivable', label: 'طلب فروش گوشی', value: formatCurrencyText(stats.phoneSalesReceivableAmount, readStoredCurrencyUnit()), meta: 'بر پایه قیمت خرید گوشی‌های فروخته‌شده', icon: 'fa-hand-holding-dollar', tone: 'cyan' },
    { key: 'totalReceivable', label: 'کل طلب همکاران', value: formatCurrencyText(stats.totalReceivableAmount, readStoredCurrencyUnit()), meta: 'مانده مثبت دفتر همکاران', icon: 'fa-scale-balanced', tone: 'rose' },
  ], [stats]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const initialNewPartnerState: NewPartnerData = {
    partnerName: '',
    partnerType: 'Supplier',
    contactPerson: '',
    phoneNumber: '',
    email: '',
    address: '',
    notes: '',
  };
  const [newPartner, setNewPartner] = useState<NewPartnerData>(initialNewPartnerState);
  const [formErrors, setFormErrors] = useState<Partial<NewPartnerData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- NEW: state for delete confirm modal
  const [confirmDelete, setConfirmDelete] = useState<Partner | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchPartners = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const response = await apiFetch('/api/partners');
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'خطا در دریافت لیست همکاران');
      setPartners(result.data);
      setFilteredPartners(result.data);
    } catch (error) {
      setNotification({ type: 'error', text: humanizeErrorMessage((error as Error).message, { endpoint: '/api/partners', action: 'افزودن مورد جدید همکار' }) });
    } finally {
      setIsLoading(false);
    }
  };

  const openTelegramReport = async (partner: Partner) => {
    try {
      setNotification(null);
      const res = await apiFetch(`/api/reports/partner/${partner.id}/message`);
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.message || 'خطا در دریافت گزارش همکار');
      setMsgInitialRecipient({
        type: 'partner',
        id: partner.id,
        name: partner.partnerName,
        phoneNumber: (partner as any).phoneNumber,
        telegramChatId: (partner as any).telegramChatId,
      });
      setMsgInitialText(String(json?.data?.text || ''));
      setMsgOpen(true);
    } catch (e: any) {
      setNotification({ type: 'error', text: e?.message || 'خطا در آماده‌سازی گزارش' });
    }
  };

  useEffect(() => {
    if (token) fetchPartners();
  }, [token]);

  useEffect(() => {
    const lower = searchTerm.toLowerCase().trim();

    const filtered = partners.filter((p) => {
      const matchesSearch = !lower
        ? true
        : p.partnerName.toLowerCase().includes(lower) ||
          (PARTNER_TYPES.find((pt) => pt.value === p.partnerType)?.label.toLowerCase().includes(lower)) ||
          (p.phoneNumber && p.phoneNumber.includes(lower)) ||
          (p.contactPerson && p.contactPerson.toLowerCase().includes(lower));
      if (!matchesSearch) return false;

      const bal = (p as any).currentBalance;
      const nbal = typeof bal === 'number' ? bal : 0;
      // در همکاران: مثبت = بدهی ما به همکار، منفی = طلب ما
      if (balanceFilter === 'debt' && !(nbal > 0)) return false;
      if (balanceFilter === 'credit' && !(nbal < 0)) return false;
      if (balanceFilter === 'settled' && !(nbal == 0)) return false;
      return true;
    }).sort((a, b) => {
      const ba = Number((a as any).currentBalance || 0);
      const bb = Number((b as any).currentBalance || 0);
      if (sortMode === 'balanceDesc') return Math.abs(bb) - Math.abs(ba);
      if (sortMode === 'balanceAsc') return Math.abs(ba) - Math.abs(bb);
      if (sortMode === 'recent') return Number((b as any).id || 0) - Number((a as any).id || 0);
      return String(a.partnerName || '').localeCompare(String(b.partnerName || ''), 'fa');
    });

    setFilteredPartners(filtered);
  }, [searchTerm, balanceFilter, sortMode, partners]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewPartner(prev => ({ ...prev, [name]: value }));
    if (formErrors[name as keyof NewPartnerData]) {
      setFormErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Partial<NewPartnerData> = {};
    if (!newPartner.partnerName.trim()) errors.partnerName = 'نام همکار الزامی است.';
    if (!newPartner.partnerType.trim()) errors.partnerType = 'نوع همکار الزامی است.';
    if (newPartner.phoneNumber && !/^\d{10,15}$/.test(newPartner.phoneNumber.trim())) {
      errors.phoneNumber = 'شماره تماس نامعتبر است (باید ۱۰ تا ۱۵ رقم باشد).';
    }
    if (newPartner.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newPartner.email.trim())) {
      errors.email = 'ایمیل نامعتبر است.';
    }
    setFormErrors(errors);
    focusErrorsSoon(errors as any);
    return Object.keys(errors).length === 0;
  };

  const handleAddPartnerSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!validateForm() || !token) return;
    setIsSubmitting(true);
    setNotification(null);
    try {
      await runWithFeedback(
        apiFetch('/api/partners', {
          method: 'POST',
          body: JSON.stringify(newPartner),
        }).then((response) => parseApiResult(response, { endpoint: '/api/partners', action: 'افزودن مورد جدید همکار' })),
        {
          kind: 'create',
          loading: 'در حال ثبت اطلاعات همکار جدید…',
          success: 'همکار جدید با موفقیت ثبت شد.',
          endpoint: '/api/partners',
        }
      );
      setIsAddModalOpen(false);
      setNewPartner(initialNewPartnerState);
      fetchPartners();
    } catch (error) {
      setNotification({ type: 'error', text: (error as Error).message });
      if (isDuplicateMessage((error as Error).message)) {
        const duplicateError = 'این شماره تماس قبلا ثبت اطلاعات شده است.';
        setFormErrors(prev => ({ ...prev, phoneNumber: duplicateError }));
        focusErrorsSoon({ phoneNumber: duplicateError } as any);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- NEW: delete handler
  const handleDeletePartner = async () => {
    if (!confirmDelete || !token) return;
    setIsDeleting(true);
    setNotification(null);
    try {
      await runWithFeedback(
        apiFetch(`/api/partners/${confirmDelete.id}`, { method: 'DELETE' }).then((response) =>
          parseApiResult(response, { endpoint: `/api/partners/${confirmDelete.id}`, action: 'حذف مورد همکار' })
        ),
        {
          kind: 'delete',
          loading: 'در حال حذف مورد همکار…',
          success: `همکار «${confirmDelete.partnerName}» با موفقیت حذف شد.`,
          endpoint: `/api/partners/${confirmDelete.id}`,
        }
      );
      // Optimistic update
      setPartners(prev => prev.filter(p => p.id !== confirmDelete.id));
      setFilteredPartners(prev => prev.filter(p => p.id !== confirmDelete.id));
      setConfirmDelete(null);
    } catch (err) {
      setNotification({ type: 'error', text: humanizeErrorMessage((err as Error).message, { endpoint: `/api/partners/${confirmDelete.id}`, action: 'حذف مورد همکار' }) });
    } finally {
      setIsDeleting(false);
    }
  };

  const inputClass = (fieldName: keyof NewPartnerData, isTextarea = false, isSelect = false) =>
    `w-full p-2.5 border rounded-lg shadow-sm    text-sm text-right bg-white dark:bg-black/30 ${
      formErrors[fieldName] ? 'border-red-500' : 'border-primary/20'
    }`;
  const labelClass = 'block text-sm font-medium text-text mb-1';

  return (
    <PageKit
      className="people-merged-page people-foundation"
      title="همکاران"
      subtitle="تامین‌کنندگان، تکنسین‌ها، وضعیت مانده حساب و عملیات ارتباطی را یکپارچه مدیریت کنید."
      icon={<i className="fa-solid fa-building" />}
      isLoading={isLoading}
    >

      <div className="people-page-shell partners-page-shell max-w-7xl mx-auto px-3 sm:px-4 text-right" dir="rtl" data-ui-people-page="partners" data-ui-people-scope="list">
        <div className="partners-shell" data-ui-people-surface="list-shell">
          <section className="people-hero-panel customers-hero-panel people-unified-hero partners-overview-hero">
            <div className="people-unified-hero__top">
              <div className="people-top-nav people-top-nav--large">
                <Link to="/customers" className="people-top-nav__item">
                  <i className="fa-solid fa-user-group" />
                  <span>مشتریان</span>
                </Link>
                <Link to="/partners" className="people-top-nav__item is-active">
                  <i className="fa-solid fa-building" />
                  <span>همکاران</span>
                </Link>
              </div>
              <div className="people-unified-hero__actions">
                <Button onClick={() => setIsAddModalOpen(true)} variant="primary" className="people-primary-btn whitespace-nowrap" leftIcon={<i className="fas fa-user-plus" />}>
                  افزودن همکار
                </Button>
              </div>
            </div>

            <div className="people-unified-hero__body partners-overview-hero__body">
              <div className="customers-hero-copy">
                <div className="customers-hero-eyebrow">مرکز کنترل همکاران</div>
                <div className="customers-hero-title-row">
                  <h2 className="customers-hero-title">نمای کلی همکاران</h2>
                  <span className="customers-hero-badge">{filteredPartners.length.toLocaleString('fa-IR')} نتیجه فعال</span>
                </div>
                <p className="customers-hero-subtitle">خلاصه گوشی‌های دریافتی، فروش‌رفته، اقساط باز، موجودی فروش‌نرفته و طلب همکاران در یک نگاه.</p>
              </div>
              <div className="customers-hero-quickstats partners-hero-quickstats">
                <div className="customers-hero-mini customers-hero-mini--debt partners-hero-mini partners-hero-mini--receivable">
                  <span className="customers-hero-mini__icon"><i className="fa-solid fa-scale-balanced" /></span>
                  <div className="customers-hero-mini__content">
                    <span className="customers-hero-mini__label">کل طلب همکاران</span>
                    <strong className="customers-hero-mini__value">{formatCurrencyText(stats.totalReceivableAmount, readStoredCurrencyUnit())}</strong>
                    <small className="customers-hero-mini__meta">مانده مثبت ثبت‌شده در دفتر همکاران</small>
                  </div>
                </div>
                <div className="customers-hero-mini customers-hero-mini--credit partners-hero-mini partners-hero-mini--inventory">
                  <span className="customers-hero-mini__icon"><i className="fa-solid fa-box-open" /></span>
                  <div className="customers-hero-mini__content">
                    <span className="customers-hero-mini__label">گوشی فروخته‌نشده</span>
                    <strong className="customers-hero-mini__value">{faNum(stats.unsoldPhonesCount)} دستگاه</strong>
                    <small className="customers-hero-mini__meta">موجودی باقی‌مانده نزد فروشگاه برای پیگیری</small>
                  </div>
                </div>
              </div>
            </div>

            <div className="people-stats-grid partners-stats-grid mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" data-ui-people-metrics="true">
              {partnerKpis.map((item) => (
                <div key={item.key} className="people-stat-card partners-stat-card">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="people-stat-card__label">{item.label}</div>
                      <div className="people-stat-card__value">{item.value}</div>
                      <div className="people-stat-card__meta">{item.meta}</div>
                    </div>
                    <span className="people-stat-card__icon"><i className={'fa-solid ' + item.icon} /></span>
                  </div>
                </div>
              ))}
            </div>
            <Notification message={notification} onClose={() => setNotification(null)} />
          </section>

          <section className="people-toolbar partners-toolbar-shell" data-ui-people-filters="true">
            <div className="partners-filter-chips">
              {[
                { key: 'all', label: 'همه', icon: 'fa-layer-group' },
                { key: 'debt', label: 'بدهی شما', icon: 'fa-arrow-up' },
                { key: 'credit', label: 'طلب شما', icon: 'fa-arrow-down' },
                { key: 'settled', label: 'تسویه', icon: 'fa-circle-check' },
              ].map((it) => {
                const active = balanceFilter === (it.key as any);
                return (
                  <Button
                    key={it.key}
                    type="button"
                    onClick={() => setBalanceFilter(it.key as any)}
                    variant={active ? 'primary' : 'secondary'}
                    size="xs"
                    className={['people-filter-chip partners-filter-chip', active ? 'is-active' : ''].join(' ')}
                    leftIcon={<i className={`fa-solid ${it.icon} text-[10px]`} />}
                  >
                    {it.label}
                  </Button>
                );
              })}
            </div>

            <div className="partners-toolbar-summary">
              <div className="partners-toolbar-summary__item">
                <i className="fa-solid fa-filter" />
                <span>{filteredPartners.length.toLocaleString('fa-IR')} همکار در این نما</span>
              </div>
              <AppSearchField
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="جستجو بین همکاران، شماره تماس یا نوع همکاری..."
                ariaLabel="جستجوی همکاران"
                size="md"
                className="partners-toolbar-search-slot"
              />
              <AppSelectField
                value={sortMode}
                onChange={setSortMode}
                ariaLabel="مرتب‌سازی همکاران"
                size="md"
                className="people-sort-select"
                options={[
                  { value: 'name', label: 'مرتب‌سازی: نام همکار' },
                  { value: 'balanceDesc', label: 'بیشترین مانده مالی' },
                  { value: 'balanceAsc', label: 'کمترین مانده مالی' },
                  { value: 'recent', label: 'جدیدترین پرونده' },
                ]}
              />
              {(searchTerm || balanceFilter !== 'all' || sortMode !== 'name') ? (
                <button type="button" className="people-toolbar-reset" onClick={() => { setSearchTerm(''); setBalanceFilter('all'); setSortMode('name'); }}>
                  <i className="fa-solid fa-rotate-left" /> پاک‌سازی نما
                </button>
              ) : null}
            </div>
          </section>

          {partners.length === 0 ? (
            <PeopleZeroStateLanding
              entity="partner"
              primaryLabel="افزودن همکار"
              onPrimaryAction={() => setIsAddModalOpen(true)}
              secondaryLabel="رفتن به مشتریان"
              onSecondaryAction={() => window.location.assign('/customers')}
              searchTerm={searchTerm}
              onClearSearch={searchTerm ? () => setSearchTerm('') : undefined}
            />
          ) : filteredPartners.length === 0 ? (
            <PeopleZeroStateLanding
              entity="partner"
              title="همکاری با این فیلتر پیدا نشد"
              description={searchTerm ? `جستجوی «${searchTerm}» با هیچ همکاری مطابقت نداشت. جستجو یا فیلتر وضعیت را تغییر دهید.` : 'در این فیلتر موردی برای نمایش وجود ندارد. فیلتر وضعیت را تغییر دهید یا آن را پاک کنید.'}
              primaryLabel={searchTerm ? "پاک کردن جستجو" : "نمایش همه همکاران"}
              onPrimaryAction={() => { setSearchTerm(''); setBalanceFilter('all'); }}
              secondaryLabel="افزودن همکار"
              onSecondaryAction={() => setIsAddModalOpen(true)}
              searchTerm={searchTerm}
              onClearSearch={searchTerm ? () => setSearchTerm('') : undefined}
            />
          ) : (
          <>
          <div className="partners-table-shell hidden md:block overflow-hidden dark:text-slate-100">
            <table className="partners-table partners-table--people w-full text-sm divide-y divide-gray-200 dark:divide-slate-800">
              <thead className="partners-table-head">
                <tr>
                  <th className="px-6 py-3 text-right font-semibold partner-col-name">نام همکار</th>
                  <th className="px-6 py-3 text-right font-semibold partner-col-type">نوع همکاری</th>
                  <th className="px-6 py-3 text-right font-semibold partner-col-phone">شماره تماس</th>
                  <th className="px-6 py-3 text-right font-semibold partner-col-balance">موجودی حساب</th>
                  <th className="px-6 py-3 text-right font-semibold partner-col-actions">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-950/60">
                {filteredPartners.map(partner => (
                  <tr key={partner.id} className={`partners-table-row ${getBalanceRowClass(getBalanceState((partner as any).currentBalance, { overdue: Math.abs(Number((partner as any).currentBalance || 0)) >= 50000000 }))}`}>
                    <td className="px-6 py-4 partner-col-name">
                      <div className="flex items-center gap-3">
                        <span className="partners-row-avatar">{(partner.partnerName || '?').trim().charAt(0)}</span>
                        <div className="min-w-0">
                          <div className="truncate font-bold text-slate-900 dark:text-slate-100">{partner.partnerName}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">همکار #{partner.id.toLocaleString('fa-IR')}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap align-middle partner-col-type">
                      <div className="space-y-1">
                        <div className="font-medium text-slate-800 dark:text-slate-200">{PARTNER_TYPES.find(pt => pt.value === partner.partnerType)?.label || partner.partnerType}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{partner.contactPerson ? `رابط: ${partner.contactPerson}` : 'بدون رابط'}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap align-middle partner-col-phone">
                      <div className="space-y-1">
                        <div dir="ltr" className="font-medium text-slate-800 dark:text-slate-200">{partner.phoneNumber || '-'}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">تماس اصلی</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap align-middle partner-col-balance">{formatPartnerBalance(partner.currentBalance)}</td>
                    <td className="px-6 py-4 whitespace-nowrap align-middle partner-col-actions">
                      <div className="partners-actions">
                        <Link to={`/partners/${partner.id}`} className="partners-action-btn partners-action-btn--primary partners-action-btn--spacious people-action-btn-clean" title="مشاهده جزئیات همکار">
                          <i className="fa-solid fa-building-circle-check" />
                          جزئیات
                        </Link>
                        <Button onClick={() => openTelegramReport(partner)} variant="secondary" size="sm" className="partners-action-btn partners-action-btn--secondary partners-action-btn--spacious people-action-btn-clean" title="ارسال گزارش کامل در تلگرام" leftIcon={<i className="fa-brands fa-telegram" />}>
                          تلگرام
                        </Button>
                        <Button onClick={() => setConfirmDelete(partner)} variant="danger" size="sm" requiredRoles={['Admin','Manager']} className="partners-action-btn partners-action-btn--danger partners-action-btn--spacious people-action-btn-clean" title="حذف مورد همکار" leftIcon={<i className="fa-solid fa-trash" />}>
                          حذف
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-4">
            {filteredPartners.map(partner => (
              <div key={partner.id} className="partners-mobile-card people-mobile-card--commercial space-y-4">
                <div className="people-mobile-card__topline">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="partners-row-avatar people-mobile-card__avatar">{(partner.partnerName || '?').trim().charAt(0)}</span>
                    <div className="min-w-0">
                      <div className="truncate text-[15px] font-black text-slate-900 dark:text-slate-50">{partner.partnerName}</div>
                      <div className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-violet-100 bg-violet-50 px-2.5 py-1 text-[10.5px] font-black text-violet-700 dark:border-violet-900/40 dark:bg-violet-950/25 dark:text-violet-200">
                        <i className="fa-solid fa-handshake-angle" />
                        {PARTNER_TYPES.find(pt => pt.value === partner.partnerType)?.label || partner.partnerType}
                      </div>
                    </div>
                  </div>
                  <div className="people-mobile-card__balance">{formatPartnerBalance(partner.currentBalance)}</div>
                </div>

                <div className="people-mobile-card__meta-grid">
                  <div className="people-mobile-card__meta-item">
                    <span><i className="fa-solid fa-phone" /> شماره تماس</span>
                    <strong dir="ltr">{partner.phoneNumber || 'ثبت نشده'}</strong>
                  </div>
                  <div className="people-mobile-card__meta-item">
                    <span><i className="fa-solid fa-wallet" /> وضعیت مالی</span>
                    <strong>{Number(partner.currentBalance || 0) === 0 ? 'تسویه' : Number(partner.currentBalance || 0) > 0 ? 'بدهکار به همکار' : 'طلب از همکار'}</strong>
                  </div>
                </div>

                <div className="partners-mobile-actions people-mobile-card__actions">
                  <Link to={`/partners/${partner.id}`} className="partners-action-btn partners-action-btn--primary partners-action-btn--stretch">
                    <i className="fa-solid fa-building-circle-check" />
                    مشاهده پرونده
                  </Link>
                  <Button onClick={() => openTelegramReport(partner)} variant="secondary" size="sm" className="partners-action-btn partners-action-btn--secondary partners-action-btn--stretch" title="ارسال گزارش تلگرام" leftIcon={<i className="fa-brands fa-telegram" />}>
                    تلگرام
                  </Button>
                  <Button onClick={() => setConfirmDelete(partner)} variant="danger" size="sm" requiredRoles={['Admin','Manager']} className="partners-action-btn partners-action-btn--danger partners-action-btn--stretch" leftIcon={<i className="fa-solid fa-trash" />}>
                    حذف
                  </Button>
                </div>
              </div>
            ))}
          </div>
          </>
          )}
        </div>
      </div>

      {/* Add Partner Modal */}
      {isAddModalOpen && (
        <Modal title="افزودن همکار" onClose={() => setIsAddModalOpen(false)} widthClass="max-w-4xl" iconClass="fa-solid fa-handshake">
          <form onSubmit={handleAddPartnerSubmit} className="modal-template-form modal-template-form--split modal-template-form--partner">
            <FormErrorSummary errors={formErrors as any} labels={{ partnerName: 'نام همکار', partnerType: 'نوع همکار', phoneNumber: 'شماره تماس', email: 'ایمیل' }} fieldIdMap={{ partnerName: 'partnerName', partnerType: 'partnerType', phoneNumber: 'phoneNumber', email: 'email' }} />
            <div className="modal-template-side">
              <div className="modal-template-card modal-template-summary">
                <span className="modal-template-eyebrow"><i className="fa-solid fa-handshake" /> پرونده همکار جدید</span>
                <div className="modal-template-title">{newPartner.partnerName || 'تعریف همکار جدید'}</div>
                <p className="modal-template-text">اطلاعات پایه همکار را کامل وارد کن تا بعداً دفتر حساب، خریدها، تسویه‌ها و اتصال تلگرام با همین پروفایل مدیریت شود.</p>
                <div className="modal-template-metric-list">
                  <div className="modal-template-metric">
                    <span className="modal-template-metric__icon"><i className="fa-solid fa-diagram-project" /></span>
                    <div className="modal-template-metric__copy">
                      <span>نوع همکاری</span>
                      <strong>{PARTNER_TYPES.find((t) => t.value === newPartner.partnerType)?.label || 'انتخاب نشده'}</strong>
                    </div>
                  </div>
                  <div className="modal-template-metric">
                    <span className="modal-template-metric__icon"><i className="fa-solid fa-phone" /></span>
                    <div className="modal-template-metric__copy">
                      <span>شماره تماس</span>
                      <strong dir="ltr">{newPartner.phoneNumber || 'ثبت نشده'}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-template-main">
              <div className="modal-template-section modal-template-section--grid">
                <ModalField label="نام همکار" iconClass="fa-solid fa-building-user" required error={formErrors.partnerName}>
                  <input type="text" id="partnerName" name="partnerName" value={newPartner.partnerName} onChange={handleInputChange} className={inputClass('partnerName')} required placeholder="مثلاً: تأمین‌کننده کوروش" />
                </ModalField>
                <ModalField label="نوع همکار" iconClass="fa-solid fa-diagram-project" required error={formErrors.partnerType}>
                  <select id="partnerType" name="partnerType" value={newPartner.partnerType} onChange={handleInputChange} className={inputClass('partnerType', false, true)} required>
                    {PARTNER_TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
                  </select>
                </ModalField>
                <ModalField label="فرد رابط" iconClass="fa-solid fa-user-tie">
                  <input type="text" id="contactPerson" name="contactPerson" value={newPartner.contactPerson} onChange={handleInputChange} className={inputClass('contactPerson')} placeholder="نام مسئول هماهنگی یا فروش" />
                </ModalField>
                <ModalField label="شماره تماس" iconClass="fa-solid fa-phone" error={formErrors.phoneNumber}>
                  <input type="tel" id="phoneNumber" name="phoneNumber" value={newPartner.phoneNumber} onChange={handleInputChange} className={inputClass('phoneNumber')} placeholder="مثال: 09123456789" />
                </ModalField>
              </div>
              <div className="modal-template-section modal-template-section--stack">
                <ModalField label="ایمیل" iconClass="fa-solid fa-envelope" error={formErrors.email}>
                  <input type="email" id="email" name="email" value={newPartner.email} onChange={handleInputChange} className={inputClass('email')} placeholder="example@domain.com" />
                </ModalField>
                <ModalField label="آدرس" iconClass="fa-solid fa-location-dot">
                  <textarea id="address" name="address" value={newPartner.address} onChange={handleInputChange} rows={2} className={inputClass('address', true)} placeholder="آدرس یا موقعیت همکاری" />
                </ModalField>
                <ModalField label="یادداشت داخلی" iconClass="fa-solid fa-note-sticky">
                  <textarea id="notes" name="notes" value={newPartner.notes} onChange={handleInputChange} rows={2} className={inputClass('notes', true)} placeholder="شرایط همکاری، توضیحات تسویه یا نکات مدیریتی" />
                </ModalField>
              </div>
              <ModalActions onCancel={() => setIsAddModalOpen(false)} submitText="ثبت همکار" submittingText="در حال ذخیره تغییرات..." isSubmitting={isSubmitting} submitDisabled={!token} />
            </div>
          </form>
        </Modal>
      )}

      {/* NEW: Delete confirm modal */}
      {confirmDelete && (
        <Modal
          title="حذف مورد همکار"
          onClose={() => (isDeleting ? null : setConfirmDelete(null))}
          widthClass="max-w-md"
        >
          <div className="p-2 space-y-4">
            <p className="text-sm">
              آیا از حذف مورد <span className="font-semibold">«{confirmDelete.partnerName}»</span> مطمئن هستید؟
            </p>
            <ModalActions
              onCancel={() => setConfirmDelete(null)}
              cancelText="انصراف"
              submitText="حذف مورد"
              submittingText="در حال حذف مورد..."
              isSubmitting={isDeleting}
              submitDisabled={isDeleting}
              submitVariant="danger"
              submitType="button"
              submitIconClass="fa-solid fa-trash"
              onSubmitClick={handleDeletePartner}
            />
          </div>
        </Modal>
      )}

      <MessageComposerModal
        open={msgOpen}
        onClose={() => setMsgOpen(false)}
        onQueued={() => setNotification({ type: 'success', text: 'گزارش در صف ارسال قرار گرفت.' })}
        initialRecipient={msgInitialRecipient || undefined}
        initialText={msgInitialText}
        initialChannels={{ sms: false, telegram: true }}
      />
    </PageKit>
  );
};

export default PartnersPage;
