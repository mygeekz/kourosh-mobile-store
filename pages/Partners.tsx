import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { Partner, NewPartnerData, NotificationMessage } from '../types';
import Notification from '../components/Notification';
import { Dialog as Modal } from '@/components/ui';
import { ModalField } from '@/components/ui';
import { DialogActions as ModalActions } from '@/components/ui';
import FormErrorSummary from '../components/FormErrorSummary';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../utils/apiFetch';
import { parseApiResult, runWithFeedback, humanizeErrorMessage } from '../utils/feedback';
import { PARTNER_TYPES } from '../constants';
import { PageKit } from '@/components/ui';
import MessageComposerModal from '../components/MessageComposerModal';
import Button from '../components/Button';
import { PeopleDeleteConfirmContent, PeopleModalSummaryCard, PeopleZeroStateLanding } from '../components/people/PeopleUiKit';
import PeopleDirectoryOverview from '../components/people/PeopleDirectoryOverview';
import PeopleDirectoryToolbar from '../components/people/PeopleDirectoryToolbar';
import PartnerDirectoryList from '../components/people/PartnerDirectoryList';
import { focusErrorsSoon, isDuplicateMessage } from '../utils/formBehavior';
import { formatCurrencyText, readStoredCurrencyUnit } from '../utils/currency';
import { formatIsoToShamsiDateTime } from '../utils/dateUtils';
import { SelectField, TextareaField, TextField } from '@/components/ui';

const faNum = (value: number | undefined | null) => Number(value || 0).toLocaleString('fa-IR');
const PartnersPage: React.FC = () => {
  const { token } = useAuth();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [balanceFilter, setBalanceFilter] = useState<'all' | 'debt' | 'credit' | 'settled'>('all');
  const [sortMode, setSortMode] = useState<'name' | 'balanceDesc' | 'balanceAsc' | 'recent'>('name');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<'25' | '50' | '100'>('25');
  const [directoryTotal, setDirectoryTotal] = useState(0);
  const [directoryTotalPages, setDirectoryTotalPages] = useState(1);
  const [directorySummary, setDirectorySummary] = useState<Record<string, number> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);

  // Telegram report messaging
  const [msgOpen, setMsgOpen] = useState(false);
  const [msgInitialRecipient, setMsgInitialRecipient] = useState<any>(null);
  const [msgInitialText, setMsgInitialText] = useState<string>('');

  const stats = {
    total: Number(directorySummary?.total || directoryTotal || 0),
    debtors: Number(directorySummary?.debtors || 0),
    creditors: Number(directorySummary?.creditors || 0),
    settled: Number(directorySummary?.settled || 0),
    totalPhonesSupplied: Number(directorySummary?.totalPhonesSupplied || 0),
    phonesSoldCount: Number(directorySummary?.phonesSoldCount || 0),
    phonesInstallmentSoldCount: Number(directorySummary?.phonesInstallmentSoldCount || 0),
    openInstallmentSalesCount: Number(directorySummary?.openInstallmentSalesCount || 0),
    unsoldPhonesCount: Number(directorySummary?.unsoldPhonesCount || 0),
    accessoriesPayableAmount: Number(directorySummary?.accessoriesPayableAmount || 0),
    phoneSalesReceivableAmount: Number(directorySummary?.phoneSalesReceivableAmount || 0),
    totalReceivableAmount: Number(directorySummary?.totalReceivableAmount || directorySummary?.totalDebt || 0),
    totalDebt: Number(directorySummary?.totalDebt || 0),
    totalCredit: Number(directorySummary?.totalCredit || 0),
  };

  const partnerKpis = React.useMemo(() => [
    { key: 'totalPhones', label: 'کل گوشی‌های دریافتی', value: faNum(stats.totalPhonesSupplied), meta: faNum(stats.total) + ' همکار فعال', icon: 'fa-mobile-screen-button', tone: 'info' as const },
    { key: 'soldPhones', label: 'گوشی فروخته‌شده', value: faNum(stats.phonesSoldCount), meta: faNum(stats.phonesInstallmentSoldCount) + ' فروش قسطی', icon: 'fa-cart-shopping', tone: 'success' as const },
    { key: 'openInstallments', label: 'فروش قسطی باز', value: faNum(stats.openInstallmentSalesCount), meta: 'پرونده‌های نیازمند پیگیری', icon: 'fa-file-invoice-dollar', tone: 'warning' as const },
    { key: 'unsoldPhones', label: 'گوشی فروخته‌نشده', value: faNum(stats.unsoldPhonesCount), meta: 'موجود نزد فروشگاه', icon: 'fa-box-open', tone: 'neutral' as const },
    { key: 'accessories', label: 'بابت لوازم', value: formatCurrencyText(stats.accessoriesPayableAmount, readStoredCurrencyUnit()), meta: 'ارزش خرید موجودی تامین‌شده', icon: 'fa-headphones-simple', tone: 'accent' as const },
    { key: 'phoneReceivable', label: 'طلب فروش گوشی', value: formatCurrencyText(stats.phoneSalesReceivableAmount, readStoredCurrencyUnit()), meta: 'بر پایه قیمت خرید گوشی‌های فروخته‌شده', icon: 'fa-hand-holding-dollar', tone: 'info' as const },
    { key: 'totalReceivable', label: 'کل طلب همکاران', value: formatCurrencyText(stats.totalReceivableAmount, readStoredCurrencyUnit()), meta: 'مانده مثبت دفتر همکاران', icon: 'fa-scale-balanced', tone: 'danger' as const },
  ], [directorySummary, directoryTotal]);

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
  const [confirmDelete, setConfirmDelete] = useState<Partner | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const numericPageSize = Number(pageSize);
  const totalPages = Math.max(1, directoryTotalPages);
  const pageStart = directoryTotal === 0 ? 0 : ((page - 1) * numericPageSize) + 1;
  const pageEnd = Math.min(page * numericPageSize, directoryTotal);
  const visiblePages = React.useMemo(() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1);
    const startPage = Math.max(1, Math.min(page - 2, totalPages - 4));
    return Array.from({ length: 5 }, (_, index) => startPage + index);
  }, [page, totalPages]);
  const filteredPartners = partners;

  const buildPartnerDirectoryQuery = (targetPage = page, targetPageSize = numericPageSize, includeSummary = false) => new URLSearchParams({
    view: 'directory',
    page: String(targetPage),
    pageSize: String(targetPageSize),
    search: debouncedSearchTerm,
    balance: balanceFilter,
    sort: sortMode,
    includeSummary: includeSummary ? '1' : '0',
    ts: String(Date.now()),
  });

  const fetchPartners = async (background = false, includeSummary = false) => {
    if (!token) return;
    if (background) setIsRefreshing(true);
    else setIsLoading(true);
    try {
      const response = await apiFetch(`/api/partners?${buildPartnerDirectoryQuery(page, numericPageSize, includeSummary).toString()}`, { cache: 'no-store' });
      const result = await response.json();
      const data = result?.data;
      if (!response.ok || !result.success || !data || !Array.isArray(data.items)) throw new Error(result.message || 'خطا در دریافت لیست همکاران');
      setPartners(data.items);
      setDirectoryTotal(Math.max(0, Number(data.total || 0)));
      setDirectoryTotalPages(Math.max(1, Number(data.totalPages || 1)));
      if (data.summary) setDirectorySummary(data.summary);
      setLastSyncedAt(new Date().toISOString());
    } catch (error) {
      setNotification({ type: 'error', text: humanizeErrorMessage((error as Error).message, { endpoint: '/api/partners?view=directory', action: 'دریافت فهرست همکاران' }) });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
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
    const timer = window.setTimeout(() => setDebouncedSearchTerm(searchTerm.trim()), 320);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearchTerm, balanceFilter, sortMode, pageSize]);

  useEffect(() => {
    if (!token) return;
    void fetchPartners(false, directorySummary == null);
  }, [token, page, pageSize, debouncedSearchTerm, balanceFilter, sortMode]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

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
      setPage(1);
      void fetchPartners(true, true);
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
      setPartners(prev => prev.filter(p => p.id !== confirmDelete.id));
      setDirectoryTotal((current) => Math.max(0, current - 1));
      setConfirmDelete(null);
      void fetchPartners(true, true);
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

      <div className="people-page-shell mx-auto grid max-w-7xl min-w-0 gap-4 px-3 text-right sm:px-4" dir="rtl" data-ui-people-page="partners" data-ui-people-scope="list">
          <PeopleDirectoryOverview
            activeTab="partners"
            eyebrow="مرکز کنترل همکاران"
            title="نمای کلی همکاران"
            subtitle="خلاصه گوشی‌های دریافتی، فروش‌رفته، اقساط باز، موجودی فروش‌نرفته و طلب همکاران را در یک نمای هماهنگ مدیریت کنید."
            resultLabel={`${directoryTotal.toLocaleString('fa-IR')} نتیجه فعال`}
            actions={
              <>
                <Button
                  onClick={() => setIsAddModalOpen(true)}
                  variant="primary"
                  size="sm"
                  leftIcon={<i className="fas fa-user-plus" />}
                >
                  افزودن همکار
                </Button>
                <Button
                  type="button"
                  onClick={() => void fetchPartners(true, true)}
                  variant="secondary"
                  size="sm"
                  loading={isRefreshing}
                  loadingText="در حال تازه‌سازی همکاران…"
                  aria-label="بروزرسانی اطلاعات همکاران"
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
                key: 'receivable',
                label: 'کل طلب همکاران',
                value: formatCurrencyText(stats.totalReceivableAmount, readStoredCurrencyUnit()),
                meta: 'مانده مثبت ثبت‌شده در دفتر همکاران',
                icon: 'fa-scale-balanced',
                tone: 'danger',
              },
              {
                key: 'inventory',
                label: 'گوشی فروخته‌نشده',
                value: `${faNum(stats.unsoldPhonesCount)} دستگاه`,
                meta: 'موجودی باقی‌مانده نزد فروشگاه برای پیگیری',
                icon: 'fa-box-open',
                tone: 'accent',
              },
            ]}
            metrics={partnerKpis}
            metricsLabel="خلاصه همکاران"
          />

          <Notification message={notification} onClose={() => setNotification(null)} />

          <PeopleDirectoryToolbar
            ariaLabel="فیلتر همکاران"
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="جستجو در نام همکار، شماره تماس یا نوع همکاری..."
            searchAriaLabel="جستجوی همکاران"
            filters={[
              {
                key: 'balance',
                value: balanceFilter,
                ariaLabel: 'وضعیت مانده حساب همکار',
                iconClassName: 'fa-solid fa-wallet',
                onValueChange: (value) => setBalanceFilter(value as typeof balanceFilter),
                options: [
                  { value: 'all', label: 'همه وضعیت‌ها' },
                  { value: 'debt', label: 'بدهی به همکار' },
                  { value: 'credit', label: 'طلب از همکار' },
                  { value: 'settled', label: 'تسویه‌شده' },
                ],
              },
              {
                key: 'sort',
                value: sortMode,
                ariaLabel: 'مرتب‌سازی همکاران',
                iconClassName: 'fa-solid fa-arrow-down-wide-short',
                onValueChange: (value) => setSortMode(value as typeof sortMode),
                options: [
                  { value: 'name', label: 'نام همکار' },
                  { value: 'balanceDesc', label: 'بیشترین مانده مالی' },
                  { value: 'balanceAsc', label: 'کمترین مانده مالی' },
                  { value: 'recent', label: 'جدیدترین پرونده' },
                ],
              },
            ]}
            resetDisabled={!(searchTerm || balanceFilter !== 'all' || sortMode !== 'name')}
            onReset={() => { setSearchTerm(''); setBalanceFilter('all'); setSortMode('name'); }}
          />

          {stats.total === 0 ? (
            <PeopleZeroStateLanding
              entity="partner"
              primaryLabel="افزودن همکار"
              onPrimaryAction={() => setIsAddModalOpen(true)}
              secondaryLabel="رفتن به مشتریان"
              onSecondaryAction={() => window.location.assign('/customers')}
              searchTerm={searchTerm}
              onClearSearch={searchTerm ? () => setSearchTerm('') : undefined}
            />
          ) : directoryTotal === 0 ? (
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
            <PartnerDirectoryList
              partners={filteredPartners}
              page={page}
              pageSize={pageSize}
              total={directoryTotal}
              totalPages={totalPages}
              pageStart={pageStart}
              pageEnd={pageEnd}
              visiblePages={visiblePages}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              onSendReport={openTelegramReport}
              onDelete={setConfirmDelete}
            />
          )}
      </div>

      {/* Add Partner Modal */}
      {isAddModalOpen && (
        <Modal
          title="افزودن همکار"
          onClose={() => setIsAddModalOpen(false)}
          widthClass="max-w-4xl"
          iconClass="fa-solid fa-handshake"
          variant="operational"
          layout="split"
          ariaDescription="ثبت پرونده پایه همکار برای خرید، تسویه و ارتباطات"
        >
          <form onSubmit={handleAddPartnerSubmit} className="modal-template-form modal-template-form--split modal-template-form--partner" data-ui-partner-modal="canonical-split">
            <FormErrorSummary errors={formErrors as any} labels={{ partnerName: 'نام همکار', partnerType: 'نوع همکار', phoneNumber: 'شماره تماس', email: 'ایمیل' }} fieldIdMap={{ partnerName: 'partnerName', partnerType: 'partnerType', phoneNumber: 'phoneNumber', email: 'email' }} />
            <aside className="modal-template-side">
              <PeopleModalSummaryCard
                eyebrow="پرونده همکار جدید"
                title={newPartner.partnerName || 'تعریف همکار جدید'}
                description="اطلاعات پایه همکار را ثبت کنید تا دفتر حساب، خریدها، تسویه‌ها و ارتباطات بعدی از یک پروفایل واحد مدیریت شوند."
                icon="fa-handshake"
                metrics={[
                  { icon: 'fa-diagram-project', label: 'نوع همکاری', value: PARTNER_TYPES.find((t) => t.value === newPartner.partnerType)?.label || 'انتخاب نشده', hint: 'مبنای دسته‌بندی و عملیات پرونده' },
                  { icon: 'fa-phone', label: 'شماره تماس', value: <span dir="ltr">{newPartner.phoneNumber || 'ثبت نشده'}</span>, hint: newPartner.phoneNumber ? 'برای تماس و گزارش آماده است' : 'در صورت نیاز بعداً قابل تکمیل' },
                ]}
              />
            </aside>

            <div className="modal-template-main">
              <div className="modal-template-section modal-template-section--grid">
                <ModalField label="نام همکار" iconClass="fa-solid fa-building-user" required error={formErrors.partnerName}>
                  <TextField type="text" id="partnerName" name="partnerName" value={newPartner.partnerName} onChange={handleInputChange} className={inputClass('partnerName')} required placeholder="مثلاً: تأمین‌کننده کوروش" />
                </ModalField>
                <ModalField label="نوع همکار" iconClass="fa-solid fa-diagram-project" required error={formErrors.partnerType}>
                  <SelectField id="partnerType" name="partnerType" value={newPartner.partnerType} onChange={handleInputChange} className={inputClass('partnerType', false, true)} required>
                    {PARTNER_TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
                  </SelectField>
                </ModalField>
                <ModalField label="فرد رابط" iconClass="fa-solid fa-user-tie">
                  <TextField type="text" id="contactPerson" name="contactPerson" value={newPartner.contactPerson} onChange={handleInputChange} className={inputClass('contactPerson')} placeholder="نام مسئول هماهنگی یا فروش" />
                </ModalField>
                <ModalField label="شماره تماس" iconClass="fa-solid fa-phone" error={formErrors.phoneNumber}>
                  <TextField type="tel" id="phoneNumber" name="phoneNumber" value={newPartner.phoneNumber} onChange={handleInputChange} className={inputClass('phoneNumber')} placeholder="مثال: 09123456789" />
                </ModalField>
              </div>
              <div className="modal-template-section modal-template-section--stack">
                <ModalField label="ایمیل" iconClass="fa-solid fa-envelope" error={formErrors.email}>
                  <TextField type="email" id="email" name="email" value={newPartner.email} onChange={handleInputChange} className={inputClass('email')} placeholder="example@domain.com" />
                </ModalField>
                <ModalField label="آدرس" iconClass="fa-solid fa-location-dot">
                  <TextareaField controlOnly id="address" name="address" value={newPartner.address} onChange={handleInputChange} rows={2} className={inputClass('address', true)} placeholder="آدرس یا موقعیت همکاری" />
                </ModalField>
                <ModalField label="یادداشت داخلی" iconClass="fa-solid fa-note-sticky">
                  <TextareaField controlOnly id="notes" name="notes" value={newPartner.notes} onChange={handleInputChange} rows={3} className={inputClass('notes', true)} placeholder="شرایط همکاری، توضیحات تسویه یا نکات مدیریتی" />
                </ModalField>
              </div>
              <ModalActions onCancel={() => setIsAddModalOpen(false)} submitText="ثبت همکار" submittingText="در حال ثبت همکار..." isSubmitting={isSubmitting} submitDisabled={!token} />
            </div>
          </form>
        </Modal>
      )}

      {confirmDelete && (
        <Modal
          title={`حذف پرونده «${confirmDelete.partnerName}»`}
          onClose={() => (isDeleting ? undefined : setConfirmDelete(null))}
          widthClass="max-w-3xl"
          iconClass="fa-solid fa-user-xmark"
          tone="danger"
          variant="operational"
          layout="split"
          ariaDescription="بازبینی ایمن پیش از حذف پرونده همکار"
        >
          <PeopleDeleteConfirmContent
            entityLabel="پرونده همکار"
            name={confirmDelete.partnerName}
            identifier={Number(confirmDelete.id || 0).toLocaleString('fa-IR')}
            statusLabel={Number(confirmDelete.currentBalance || 0) === 0 ? 'حساب تسویه' : formatCurrencyText(Math.abs(Number(confirmDelete.currentBalance || 0)), readStoredCurrencyUnit())}
            warningTitle="حذف همکار باید بدون وابستگی عملیاتی باشد"
            warningText="اگر این همکار در خرید گوشی، کالا، دفتر حساب، تسویه یا سوابق مالی استفاده شده باشد، حذف نباید تاریخچه عملیاتی را مخدوش کند. سرور وابستگی‌های مجاز را کنترل می‌کند و در صورت وجود سابقه، عملیات متوقف می‌شود."
            onCancel={() => setConfirmDelete(null)}
            onConfirm={handleDeletePartner}
            isSubmitting={isDeleting}
            confirmText="بررسی و حذف"
            submittingText="در حال بررسی و حذف..."
          />
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
