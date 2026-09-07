import { Table } from '@/components/ui';
import React, { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  createColumnHelper, flexRender, getCoreRowModel, getPaginationRowModel, useReactTable, } from '@tanstack/react-table';

import type { NewServiceData, NotificationMessage, Service } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../utils/apiFetch';
import { exportToExcel, exportToPdfTable } from '../utils/exporters';
import { convertNumberToPersianWords } from '../utils/numberUtils';
import Button from '../components/Button';
import ColumnPicker from '../components/ColumnPicker';
import ExportMenu from '../components/ExportMenu';
import Notification from '../components/Notification';
import {
  Dialog as Modal, DialogActions as ModalActions, EmptyState, FormGrid, ManagementDirectoryOverview, ManagementDirectoryPagination, ManagementDirectoryToolbar, PageKit, TableActionGroup, TextareaField, TextField, positiveNumberError, requiredTextError } from '@/components/ui';
const columnHelper = createColumnHelper<Service>();

const cleanNumber = (value: string | number | undefined) =>
  Number((value ?? '').toString().replaceAll(',', '').trim());

const formatPrice = (value: number) =>
  Number.isFinite(value) && value > 0 ? `${value.toLocaleString('fa-IR')} تومان` : '—';

type ServiceEditorProps = {
  mode: 'add' | 'edit';
  value: Partial<NewServiceData & { id?: number }>;
  errors: Partial<Record<keyof NewServiceData, string>>;
  submitting: boolean;
  onChange: (patch: Partial<NewServiceData>) => void;
  onCancel: () => void;
  onSubmit: (event: FormEvent) => void;
};

const ServiceEditor: React.FC<ServiceEditorProps> = ({
  mode,
  value,
  errors,
  submitting,
  onChange,
  onCancel,
  onSubmit,
}) => {
  const nameRef = useRef<HTMLInputElement>(null);
  const numericPrice = cleanNumber(value.price || '');
  const descriptionLength = value.description?.length || 0;
  const serviceName = value.name?.trim() || 'نام خدمت';
  const serviceDescription = value.description?.trim() || 'توضیحات خدمت هنوز وارد نشده است.';
  const priceWords = numericPrice > 0
    ? `${convertNumberToPersianWords(String(numericPrice))} تومان`
    : 'قیمت هنوز وارد نشده است.';

  const normalizePriceInput = (raw: string) => raw.replace(/[۰-۹٠-٩]/g, (digit) => {
    const fa = '۰۱۲۳۴۵۶۷۸۹';
    const ar = '٠١٢٣٤٥٦٧٨٩';
    const faIndex = fa.indexOf(digit);
    if (faIndex >= 0) return String(faIndex);
    const arIndex = ar.indexOf(digit);
    return arIndex >= 0 ? String(arIndex) : digit;
  }).replace(/[^0-9]/g, '');

  useEffect(() => {
    nameRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <form noValidate onSubmit={onSubmit} className="grid min-w-0 gap-4" dir="rtl" data-ui-service-form="canonical">
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-stretch">
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950" aria-label="اطلاعات خدمت">
          <div className="mb-4 flex min-w-0 items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/70 dark:bg-sky-950/30 dark:text-sky-300" aria-hidden="true">
              <i className="fa-solid fa-bell-concierge" />
            </span>
            <div className="min-w-0">
              <h3 className="m-0 text-sm font-black text-slate-950 dark:text-slate-50">اطلاعات اصلی خدمت</h3>
              <p className="mt-1 mb-0 text-[11px] font-semibold leading-6 text-slate-500 dark:text-slate-400">نام، تعرفه و توضیحی که در فروش و فاکتور دیده می‌شود را ثبت کنید.</p>
            </div>
          </div>

          <FormGrid columns={2}>
            <TextField
              ref={nameRef}
              label="نام خدمت"
              required
              value={value.name || ''}
              onChange={(event) => onChange({ name: event.target.value })}
              placeholder="مثال: تعویض گلس"
              autoComplete="off"
              error={errors.name}
              hint={!errors.name ? 'نام کوتاه و واضح برای فاکتور انتخاب کنید.' : undefined}
              icon={<i className="fa-solid fa-tag" aria-hidden="true" />}
            />

            <TextField
              label="قیمت (تومان)"
              required
              type="text"
              inputMode="numeric"
              valueKind="currency"
              value={numericPrice > 0 ? numericPrice.toLocaleString('fa-IR') : ''}
              onChange={(event) => onChange({ price: normalizePriceInput(event.target.value) })}
              placeholder="مثال: ۲۵۰٬۰۰۰"
              autoComplete="off"
              error={errors.price}
              hint={!errors.price ? priceWords : undefined}
              icon={<i className="fa-solid fa-wallet" aria-hidden="true" />}
            />
          </FormGrid>

          <div className="mt-3">
            <TextareaField
              label="توضیحات خدمت"
              value={value.description || ''}
              onChange={(event) => onChange({ description: event.target.value })}
              placeholder="شرح کوتاه خدمت، موارد شامل و نکات مهم…"
              maxLength={400}
              rows={3}
              className="min-h-[88px] resize-none"
              icon={<i className="fa-regular fa-file-lines" aria-hidden="true" />}
              hint={`${descriptionLength.toLocaleString('fa-IR')} از ۴۰۰ کاراکتر`}
            />
          </div>
        </section>

        <aside className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/60" aria-label="پیش‌نمایش خدمت">
          <div className="flex items-center gap-2 text-xs font-black text-slate-600 dark:text-slate-300">
            <i className="fa-regular fa-eye text-sky-600" aria-hidden="true" />
            پیش‌نمایش
          </div>
          <div className="mt-4 min-w-0">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300" aria-hidden="true">
              <i className="fa-solid fa-briefcase" />
            </span>
            <h3 className="mt-3 mb-0 break-words text-base font-black text-slate-950 dark:text-slate-50">{serviceName}</h3>
            <p className="mt-2 line-clamp-3 text-[11px] font-medium leading-6 text-slate-500 dark:text-slate-400">{serviceDescription}</p>
          </div>
          <div className="mt-auto rounded-xl border border-emerald-200 bg-white px-3 py-2.5 dark:border-emerald-900/60 dark:bg-slate-950">
            <span className="block text-[10px] font-black text-slate-500 dark:text-slate-400">تعرفه ثبت‌شده</span>
            <strong className="mt-1 block text-sm font-black text-emerald-700 dark:text-emerald-300">{formatPrice(numericPrice)}</strong>
          </div>
        </aside>
      </div>

      <footer className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={submitting}
          leftIcon={<i className="fa-solid fa-xmark" aria-hidden="true" />}
        >
          انصراف
        </Button>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
          {mode === 'add' ? (
            <Button
              type="submit"
              variant="secondary"
              disabled={submitting}
              data-submit-intent="new"
              leftIcon={<i className="fa-solid fa-plus" aria-hidden="true" />}
            >
              ذخیره و خدمت جدید
            </Button>
          ) : null}
          <Button
            type="submit"
            variant="primary"
            loading={submitting}
            loadingText="در حال ذخیره…"
            data-submit-intent="close"
            leftIcon={<i className="fa-regular fa-floppy-disk" aria-hidden="true" />}
          >
            {mode === 'add' ? 'ذخیره خدمت' : 'ذخیره تغییرات'}
          </Button>
        </div>
      </footer>
    </form>
  );
};

const ServicesPage: React.FC = () => {
  const { token, currentUser } = useAuth();
  const navigate = useNavigate();

  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [currentService, setCurrentService] = useState<Partial<NewServiceData & { id?: number }>>({});
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof NewServiceData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Service | null>(null);
  const [query, setQuery] = useState('');
  const [priceFilter, setPriceFilter] = useState<'all' | 'premium' | 'economy'>('all');
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem('services.columns') || '{}');
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try { localStorage.setItem('services.columns', JSON.stringify(columnVisibility)); } catch {}
  }, [columnVisibility]);

  const fetchServices = async (options: { silent?: boolean } = {}) => {
    if (!options.silent) setIsLoading(true);
    try {
      const response = await apiFetch('/api/services');
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'خطا در دریافت لیست خدمات');
      setServices(result.data);
    } catch (error: any) {
      setNotification({ type: 'error', text: error.message });
    } finally {
      if (!options.silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) void fetchServices();
    else setIsLoading(false);
  }, [token]);

  const openModal = (mode: 'add' | 'edit', service: Service | null = null) => {
    setModalMode(mode);
    setFormErrors({});
    if (mode === 'edit' && service) {
      setCurrentService({
        id: service.id,
        name: service.name,
        description: service.description || '',
        price: String(service.price),
      });
    } else {
      setCurrentService({ name: '', description: '', price: '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentService({});
    setFormErrors({});
  };

  const validateForm = () => {
    const errors: Partial<Record<keyof NewServiceData, string>> = {};
    const nameError = requiredTextError(currentService.name, 'نام خدمت');
    const priceError = positiveNumberError(currentService.price, 'قیمت');
    if (nameError) errors.name = nameError;
    if (priceError) errors.price = priceError;
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    const requestedIntent = submitter?.getAttribute('data-submit-intent') === 'new' ? 'new' : 'close';
    const keepModalOpen = modalMode === 'add' && requestedIntent === 'new';

    if (!validateForm()) return;
    setIsSubmitting(true);
    if (!keepModalOpen) setNotification(null);

    const url = modalMode === 'add' ? '/api/services' : `/api/services/${currentService.id}`;
    const method = modalMode === 'add' ? 'POST' : 'PUT';
    const payload = {
      name: currentService.name || '',
      description: currentService.description || '',
      price: cleanNumber(currentService.price),
    };

    try {
      const response = await apiFetch(url, { method, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'خطا در ذخیره تغییرات');

      if (!keepModalOpen) {
        setNotification({ type: 'success', text: result.message || 'با موفقیت ذخیره شد.' });
      }

      const savedService = result.data as Service | undefined;
      if (savedService?.id) {
        setServices((previous) => {
          if (modalMode === 'add') {
            return previous.some((service) => service.id === savedService.id) ? previous : [savedService, ...previous];
          }
          return previous.map((service) => service.id === savedService.id ? savedService : service);
        });
      } else if (!keepModalOpen) {
        void fetchServices({ silent: true });
      }

      if (keepModalOpen) {
        setCurrentService({ name: '', description: '', price: '' });
        setFormErrors({});
      } else {
        closeModal();
      }
    } catch (error: any) {
      setNotification({ type: 'error', text: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteService = async () => {
    const deletingService = itemToDelete;
    if (!deletingService) return;

    const previousServices = services;
    const deletedId = String(deletingService.id);
    setItemToDelete(null);
    setIsLoading(false);
    setServices((previous) => previous.filter((service) => String(service.id) !== deletedId));
    setNotification({ type: 'success', text: 'خدمت حذف شد.' });

    try {
      const response = await apiFetch(`/api/services/${deletingService.id}`, { method: 'DELETE' });
      let result: any = {};
      try { result = await response.json(); } catch { result = {}; }
      if (!response.ok || result.success === false) throw new Error(result.message || 'حذف خدمت انجام نشد.');
      if (result.message) setNotification({ type: 'success', text: result.message });
    } catch (error: any) {
      setServices(previousServices);
      setNotification({ type: 'error', text: error?.message || 'حذف خدمت انجام نشد.' });
    } finally {
      setIsLoading(false);
      setIsSubmitting(false);
    }
  };

  const handleQuickSell = (service: Service) => {
    navigate('/sales', {
      state: {
        prefillItem: {
          id: service.id,
          type: 'service' as const,
          name: service.name,
          price: Number(service.price) || 0,
          stock: Infinity,
          purchasePrice: 0,
        },
      },
    });
  };

  const servicePriceStats = useMemo(() => {
    const prices = services.map((service) => Number(service.price) || 0).filter((price) => price > 0);
    const avgPrice = prices.length ? Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length) : 0;
    const premiumCount = prices.filter((price) => avgPrice > 0 && price >= avgPrice).length;
    const economyCount = prices.filter((price) => avgPrice > 0 && price < avgPrice).length;
    return { avgPrice, premiumCount, economyCount };
  }, [services]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return services.filter((service) => {
      const price = Number(service.price) || 0;
      const matchesText = !normalizedQuery
        || service.name.toLowerCase().includes(normalizedQuery)
        || (service.description || '').toLowerCase().includes(normalizedQuery)
        || String(service.price).includes(normalizedQuery);
      const matchesPrice = priceFilter === 'all'
        || (priceFilter === 'premium' && servicePriceStats.avgPrice > 0 && price >= servicePriceStats.avgPrice)
        || (priceFilter === 'economy' && servicePriceStats.avgPrice > 0 && price > 0 && price < servicePriceStats.avgPrice);
      return matchesText && matchesPrice;
    });
  }, [services, query, priceFilter, servicePriceStats.avgPrice]);

  const columns = useMemo(() => [
    columnHelper.accessor('name', {
      header: 'نام خدمت',
      cell: ({ row, getValue }) => (
        <div className="min-w-0 space-y-1">
          <strong className="block truncate text-sm font-black text-slate-950 dark:text-slate-50" title={getValue()}>{getValue()}</strong>
          <span className="block text-[10px] font-semibold text-slate-400">خدمت #{Number(row.original.id).toLocaleString('fa-IR')}</span>
        </div>
      ),
    }),
    columnHelper.accessor('description', {
      header: 'توضیحات',
      cell: ({ getValue }) => (
        <span className="line-clamp-2 text-[11px] font-semibold leading-6 text-slate-600 dark:text-slate-300" title={getValue() || 'بدون توضیحات'}>{getValue() || 'بدون توضیحات'}</span>
      ),
    }),
    columnHelper.accessor('price', {
      header: 'قیمت',
      cell: ({ getValue }) => (
        <strong className="whitespace-nowrap text-xs font-black text-slate-900 dark:text-slate-100">{formatPrice(Number(getValue()) || 0)}</strong>
      ),
    }),
    columnHelper.display({
      id: 'quick',
      header: 'فروش سریع',
      cell: ({ row }) => (
        <Button
          type="button"
          variant="primary"
          size="xs"
          onClick={() => handleQuickSell(row.original)}
          leftIcon={<i className="fa-solid fa-cart-plus" aria-hidden="true" />}
        >
          فروش سریع
        </Button>
      ),
    }),
    ...(currentUser?.roleName === 'Admin' ? [
      columnHelper.display({
        id: 'actions',
        header: 'عملیات',
        cell: ({ row }) => (
          <TableActionGroup
            ariaLabel={`عملیات خدمت ${row.original.name}`}
            collapseBelow="lg"
            density="compact"
            align="center"
            actions={[
              {
                key: 'edit',
                kind: 'button',
                label: 'ویرایش خدمت',
                variant: 'secondary',
                onClick: () => openModal('edit', row.original),
                icon: <i className="fa-solid fa-pen-to-square" aria-hidden="true" />,
              },
              {
                key: 'delete',
                kind: 'button',
                label: 'حذف خدمت',
                variant: 'danger',
                onClick: () => setItemToDelete(row.original),
                icon: <i className="fa-solid fa-trash-can" aria-hidden="true" />,
              },
            ]}
          />
        ),
      }),
    ] : []),
  ], [currentUser]);

  const table = useReactTable({
    data: filtered,
    columns,
    state: { columnVisibility },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  useEffect(() => {
    table.setPageIndex(0);
  }, [query, priceFilter]);

  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const pageCount = Math.max(1, table.getPageCount());
  const pageStart = filtered.length === 0 ? 0 : (pageIndex * pageSize) + 1;
  const pageEnd = filtered.length === 0 ? 0 : Math.min(filtered.length, (pageIndex + 1) * pageSize);

  const exportBase = `services-${new Date().toISOString().slice(0, 10)}`;
  const exportRows = filtered.map((service) => ({
    name: service.name,
    price: service.price ?? 0,
    description: service.description ?? '',
    createdAt: (service as any)?.createdAt ?? '',
  }));

  const doExportExcel = () => {
    exportToExcel(
      `${exportBase}.xlsx`,
      exportRows,
      [
        { header: 'نام خدمت', key: 'name' },
        { header: 'قیمت', key: 'price' },
        { header: 'توضیحات', key: 'description' },
        { header: 'تاریخ', key: 'createdAt' },
      ],
      'Services',
    );
  };

  const doExportPdf = () => {
    exportToPdfTable({
      filename: `${exportBase}.pdf`,
      title: 'لیست خدمات',
      head: ['نام خدمت', 'قیمت', 'توضیحات'],
      body: exportRows.map((row) => [
        String(row.name ?? ''),
        String(Number(row.price ?? 0).toLocaleString('fa-IR')),
        String(row.description ?? ''),
      ]),
    });
  };

  return (
    <PageKit
      title="خدمات"
      subtitle="مدیریت خدمات جانبی، تعرفه‌ها و فروش سریع"
      icon={<i className="fa-solid fa-bell-concierge" />}
      isLoading={isLoading}
      loadingTone="info"
    >
      <div className="mx-auto grid max-w-7xl min-w-0 gap-4 px-3 text-right sm:px-4" dir="rtl" data-ui-service-page="services" data-ui-service-scope="list">
        <ManagementDirectoryOverview
          eyebrow="مرکز خدمات فروشگاه"
          title="مدیریت خدمات"
          subtitle="خدمات، تعرفه‌ها و دسترسی فروش سریع را در همان ساختار یکپارچه بخش‌های مشتریان، همکاران و اقساط مدیریت کنید."
          resultLabel={`${filtered.length.toLocaleString('fa-IR')} نتیجه فعال`}
          actions={
            <>
              {currentUser?.roleName === 'Admin' ? (
                <Button
                  type="button"
                  onClick={() => openModal('add')}
                  variant="primary"
                  size="sm"
                  leftIcon={<i className="fa-solid fa-plus" aria-hidden="true" />}
                >
                  خدمت جدید
                </Button>
              ) : null}
              <ExportMenu
                label="خروجی"
                menuWidth={184}
                items={[
                  { key: 'excel', label: 'خروجی Excel', icon: 'fa-file-excel', onClick: doExportExcel, disabled: filtered.length === 0 },
                  { key: 'pdf', label: 'خروجی PDF', icon: 'fa-file-pdf', onClick: doExportPdf, disabled: filtered.length === 0 },
                ]}
              />
              <ColumnPicker table={table} storageKey="services.columns" />
            </>
          }
          quickStats={[
            {
              key: 'count',
              label: 'کل خدمات',
              value: services.length.toLocaleString('fa-IR'),
              meta: 'خدمت ثبت‌شده',
              icon: 'fa-layer-group',
              tone: 'info',
            },
            {
              key: 'avg',
              label: 'میانگین تعرفه',
              value: formatPrice(servicePriceStats.avgPrice),
              meta: 'مبنای دسته‌بندی قیمتی',
              icon: 'fa-chart-line',
              tone: 'success',
            },
          ]}
          metrics={[
            { key: 'all', label: 'همه خدمات', value: services.length.toLocaleString('fa-IR'), meta: 'کل فهرست', icon: 'fa-bell-concierge', tone: 'accent' },
            { key: 'premium', label: 'خدمات پربها', value: servicePriceStats.premiumCount.toLocaleString('fa-IR'), meta: 'برابر یا بالاتر از میانگین', icon: 'fa-gem', tone: 'warning' },
            { key: 'economy', label: 'خدمات اقتصادی', value: servicePriceStats.economyCount.toLocaleString('fa-IR'), meta: 'کمتر از میانگین', icon: 'fa-arrow-trend-down', tone: 'success' },
          ]}
          metricsLabel="خلاصه خدمات"
        />

        <Notification message={notification} onClose={() => setNotification(null)} />

        <ManagementDirectoryToolbar
          ariaLabel="فیلتر خدمات"
          searchValue={query}
          onSearchChange={setQuery}
          searchPlaceholder="جستجو در نام، توضیحات یا قیمت خدمت..."
          searchAriaLabel="جستجو در خدمات"
          columns={2}
          filters={[
            {
              key: 'price',
              value: priceFilter,
              ariaLabel: 'فیلتر محدوده قیمت خدمات',
              onValueChange: (value) => setPriceFilter(value as typeof priceFilter),
              options: [
                { value: 'all', label: `همه خدمات (${services.length.toLocaleString('fa-IR')})` },
                { value: 'premium', label: `پربها (${servicePriceStats.premiumCount.toLocaleString('fa-IR')})` },
                { value: 'economy', label: `اقتصادی (${servicePriceStats.economyCount.toLocaleString('fa-IR')})` },
              ],
            },
          ]}
          resetDisabled={!query && priceFilter === 'all'}
          onReset={() => { setQuery(''); setPriceFilter('all'); }}
        />

        {filtered.length === 0 ? (
          <EmptyState
            title="خدمتی پیدا نشد"
            description={query || priceFilter !== 'all' ? 'جستجو یا فیلتر فعلی با هیچ خدمتی مطابقت ندارد.' : 'هنوز خدمتی ثبت نشده است.'}
            actionLabel={query || priceFilter !== 'all' ? 'پاک کردن فیلترها' : currentUser?.roleName === 'Admin' ? 'افزودن خدمت' : undefined}
            onAction={query || priceFilter !== 'all' ? () => { setQuery(''); setPriceFilter('all'); } : currentUser?.roleName === 'Admin' ? () => openModal('add') : undefined}
            icon={<i className="fa-solid fa-bell-concierge" aria-hidden="true" />}
          />
        ) : (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950" id="services-list-surface">
            <header className="flex flex-col gap-2 border-b border-slate-200 px-3 py-2.5 lg:flex-row lg:items-center lg:justify-between dark:border-slate-800">
              <div className="min-w-0">
                <h3 className="text-sm font-black text-slate-950 dark:text-slate-50">فهرست خدمات</h3>
                <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">نمایش {pageStart.toLocaleString('fa-IR')} تا {pageEnd.toLocaleString('fa-IR')} از {filtered.length.toLocaleString('fa-IR')} خدمت</p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <i className="fa-solid fa-circle-info text-sky-600" aria-hidden="true" /> تعرفه‌ها بر اساس آخرین اطلاعات ثبت‌شده نمایش داده می‌شوند.
              </span>
            </header>

            <div className="w-full overflow-x-auto overscroll-x-contain" role="region" aria-label="جدول فهرست خدمات" tabIndex={0}>
              <Table className="w-full min-w-[58rem] table-fixed border-collapse text-xs" dir="rtl" data-ui-bidi-scope="rtl-table" layout="managed" density="compact">
                <caption className="sr-only">فهرست خدمات، توضیحات، قیمت، فروش سریع و عملیات مدیریت</caption>
                <colgroup>
                  <col className="w-[22%]" />
                  <col className="w-[34%]" />
                  <col className="w-[18%]" />
                  <col className="w-[14%]" />
                  {currentUser?.roleName === 'Admin' ? <col className="w-[12%]" /> : null}
                </colgroup>
                <thead className="bg-slate-50 text-slate-600 dark:bg-slate-900/70 dark:text-slate-300">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id} className="border-b border-slate-200 text-right dark:border-slate-800">
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          scope="col"
                          className={header.column.id === 'actions'
                            ? 'sticky end-0 z-20 bg-slate-50 px-2 py-2 text-center font-black tracking-normal before:hidden after:hidden dark:bg-slate-900'
                            : 'bg-slate-50 px-3 py-2 text-right font-black tracking-normal before:hidden after:hidden dark:bg-slate-900'}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white text-slate-700 dark:divide-slate-800 dark:bg-slate-950 dark:text-slate-200">
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="bg-white transition-colors hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-900">
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className={cell.column.id === 'actions'
                            ? 'sticky end-0 z-10 bg-inherit px-2 py-2.5 text-center align-middle'
                            : 'px-3 py-2.5 align-middle'}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>

            <ManagementDirectoryPagination
              page={pageIndex + 1}
              totalPages={pageCount}
              pageSize={pageSize}
              pageSizeOptions={[10, 20, 30, 50]}
              total={filtered.length}
              pageStart={pageStart}
              pageEnd={pageEnd}
              ariaLabel="صفحه‌بندی خدمات"
              pageSizeAriaLabel="تعداد خدمت در هر صفحه"
              onPageChange={(page) => table.setPageIndex(Math.max(0, page - 1))}
              onPageSizeChange={(nextPageSize) => { table.setPageSize(nextPageSize); table.setPageIndex(0); }}
            />
          </section>
        )}
      </div>

      {isModalOpen ? (
        <Modal
          title={modalMode === 'add' ? 'افزودن خدمت' : 'ویرایش اطلاعات خدمت'}
          onClose={closeModal}
          widthClass="max-w-[1180px]"
          size="full"
          variant="operational"
          layout="vertical"
          tone="info"
          iconClass="fa-solid fa-bell-concierge"
          hideCloseButton
          ariaDescription="نام، توضیحات و تعرفه خدمت را ثبت یا ویرایش کنید."
        >
          <ServiceEditor
            mode={modalMode}
            value={currentService}
            errors={formErrors}
            submitting={isSubmitting}
            onChange={(patch) => setCurrentService((previous) => ({ ...previous, ...patch }))}
            onCancel={closeModal}
            onSubmit={handleSubmit}
          />
        </Modal>
      ) : null}

      {itemToDelete ? (
        <Modal
          title={`تایید حذف خدمت «${itemToDelete.name}»`}
          onClose={() => setItemToDelete(null)}
          variant="compact"
          tone="danger"
          iconClass="fa-solid fa-trash-can"
        >
          <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 dark:border-rose-900/70 dark:bg-rose-950/25">
            <h3 className="m-0 text-sm font-black text-slate-950 dark:text-slate-50">آیا از حذف این خدمت مطمئن هستید؟</h3>
            <p className="mt-2 mb-0 text-xs font-semibold leading-6 text-slate-600 dark:text-slate-300">این عملیات قابل بازگشت نیست و برای استفاده دوباره باید خدمت را مجدداً ثبت کنید.</p>
          </div>
          <ModalActions
            onCancel={() => setItemToDelete(null)}
            cancelText="انصراف"
            submitText="تایید و حذف خدمت"
            submitVariant="danger"
            submitType="button"
            submitIconClass="fa-solid fa-trash"
            onSubmitClick={handleDeleteService}
          />
        </Modal>
      ) : null}
    </PageKit>
  );
};

export default ServicesPage;
