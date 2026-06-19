// src/pages/ServicesPage.tsx
import React, { useState, useEffect, FormEvent, useMemo, useRef } from 'react';
import { Service, NewServiceData, NotificationMessage } from '../types';
import Notification from '../components/Notification';
import Modal from '../components/Modal';
import ModalActions from '../components/ModalActions';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/Button';
import PriceInput from '../components/PriceInput';
import TableToolbar from '../components/TableToolbar';
import ExportMenu from '../components/ExportMenu';
import ColumnPicker from '../components/ColumnPicker';
import { apiFetch } from '../utils/apiFetch';
import { exportToExcel, exportToPdfTable } from '../utils/exporters';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  createColumnHelper,
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table';
import { useStyle } from '../contexts/StyleContext';

const columnHelper = createColumnHelper<Service>();

/* ---------- Small helpers ---------- */
const cleanNumber = (v: string | number | undefined) =>
  Number((v ?? '').toString().replaceAll(',', '').trim());

const formatPrice = (n: number) =>
  isFinite(n) && n > 0 ? n.toLocaleString('fa-IR') + ' تومان' : '—';

/* ---------- Editor (Redesigned) ---------- */
type ServiceEditorProps = {
  mode: 'add' | 'edit';
  value: Partial<NewServiceData & { id?: number }>;
  errors: Partial<Record<keyof NewServiceData, string>>;
  brand: string;
  submitting: boolean;
  onChange: (patch: Partial<NewServiceData>) => void;
  onCancel: () => void;
  onSubmit: (e: FormEvent) => void;
};

const ServiceEditor: React.FC<ServiceEditorProps> = ({
  mode,
  value,
  errors,
  brand,
  submitting,
  onChange,
  onCancel,
  onSubmit,
}) => {
  const nameRef = useRef<HTMLInputElement>(null);
  const pricePreview = formatPrice(cleanNumber(value.price || ''));

  // keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'enter') {
        const fake = new Event('submit', { bubbles: true, cancelable: true });
        // @ts-ignore
        e.currentTarget?.dispatchEvent?.(fake);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel]);

  useEffect(() => { nameRef.current?.focus(); }, []);

  const inputBase =
    'w-full rounded-lg border bg-white dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 px-3 py-2 text-sm   ';
  const labelBase = 'text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center gap-2 mb-1';
  const helpBase = 'text-xs mt-1';
  const errCls = 'ring-red-400 border-red-500';
  const okRing = '';
  const iconWrap =
    'inline-flex items-center justify-center w-6 h-6 rounded-md bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-200';

  return (
    <form onSubmit={onSubmit} className="space-y-5 min-w-0" data-ui-service-form="editor">
      {/* Title badge */}
      <div className="flex items-center gap-2 -mt-1">
        <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-semibold"
              style={{ backgroundColor: brand + '1a', color: brand }}>
          <i className="fa-solid fa-wrench" />
          {mode === 'add' ? 'افزودن مورد جدید خدمت جدید' : 'ویرایش اطلاعات خدمت'}
        </span>
      </div>

      {/* Name */}
      <div className="min-w-0">
        <label className={labelBase}>
          <span className={iconWrap}><i className="fa-solid fa-signature" /></span>
          نام خدمت
          <span className="text-red-500">*</span>
        </label>
        <input
          ref={nameRef}
          type="text"
          value={value.name || ''}
          onChange={e => onChange({ name: e.target.value })}
          className={`${inputBase} ${okRing} ${errors.name ? errCls : ''}`}
          placeholder="مثلاً: تعویض گلس، نصب برنامه، انتقال اطلاعات…"
        />
        <p className={`${helpBase} ${errors.name ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
          {errors.name ? errors.name : 'نامی واضح و کوتاه وارد کنید.'}
        </p>
      </div>

      {/* Description */}
      <div className="min-w-0">
        <label className={labelBase}>
          <span className={iconWrap}><i className="fa-solid fa-align-right" /></span>
          توضیحات (اختیاری)
        </label>
        <textarea
          rows={3}
          value={value.description || ''}
          onChange={e => onChange({ description: e.target.value })}
          className={`${inputBase} ${okRing}`}
          placeholder="شرح مختصر خدمت برای کاربر و فاکتور…"
          maxLength={400}
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            می‌توانید تا ۴۰۰ کاراکتر توضیح اضافه کنید.
          </p>
          <span className="text-[11px] text-gray-400 mt-1">
            {(value.description?.length || 0)} / 400
          </span>
        </div>
      </div>

      {/* Price */}
      <div className="min-w-0">
        <label className={labelBase}>
          <span className={iconWrap}><i className="fa-solid fa-tags" /></span>
          قیمت (تومان)
          <span className="text-red-500">*</span>
        </label>
        <PriceInput
          name="price"
          value={String(value.price || '')}
          onChange={(e: any) => onChange({ price: e.target.value })}
          className={`${inputBase} text-left ${okRing} ${errors.price ? errCls : ''}`}
          preview="مثلاً: ۲۵۰۰۰۰"
          topLabel="تعرفه"
          suffix="تومان"
        />
        <div className="flex items-center justify-between">
          <p className={`${helpBase} ${errors.price ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
            {errors.price ? errors.price : 'قیمت باید عددی مثبت باشد.'}
          </p>
          <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
            پیش‌نمایش: <span style={{ color: brand }}>{pricePreview}</span>
          </span>
        </div>
      </div>

      {/* Sticky actions — بدون منفی‌مارجین تا اسکرول افقی ایجاد نشود */}
      <div className="premium-sticky-footer premium-drawer-panel rounded-b-xl px-5 py-3">
        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            onClick={onCancel}
            variant="secondary"
            size="md"
          >
            انصراف (Esc)
          </Button>
          <Button
            type="submit"
            loading={submitting}
            loadingText="در حال ذخیره تغییرات…"
            variant="primary"
            size="md"
          >
            ذخیره تغییرات (Ctrl/⌘ + Enter)
          </Button>
        </div>
      </div>
    </form>
  );
};

/* ---------- Page ---------- */
const ServicesPage: React.FC = () => {
  const { token, currentUser } = useAuth();
  const navigate = useNavigate();
  const { style } = useStyle();
  const brand = `hsl(${style.primaryHue} 90% 55%)`;

  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [currentService, setCurrentService] = useState<Partial<NewServiceData & { id?: number }>>({});
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof NewServiceData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [itemToDelete, setItemToDelete] = useState<Service | null>(null);

  // filters
  const [query, setQuery] = useState('');
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

  const fetchServices = async () => {
    setIsLoading(true);
    try {
      const response = await apiFetch('/api/services');
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'خطا در دریافت لیست خدمات');
      setServices(result.data);
    } catch (error: any) {
      setNotification({ type: 'error', text: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchServices();
    else setIsLoading(false);
  }, [token]);

  const openModal = (mode: 'add' | 'edit', service: Service | null = null) => {
    setModalMode(mode);
    setFormErrors({});
    if (mode === 'edit' && service) {
      setCurrentService({ id: service.id, name: service.name, description: service.description || '', price: String(service.price) });
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

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof NewServiceData, string>> = {};
    if (!currentService.name?.trim()) errors.name = 'نام خدمت الزامی است.';
    const priceNum = cleanNumber(currentService.price);
    if (isNaN(priceNum) || priceNum <= 0) errors.price = 'قیمت باید عددی مثبت باشد.';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    setNotification(null);

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

      setNotification({ type: 'success', text: result.message || 'با موفقیت ذخیره شد.' });
      closeModal();
      fetchServices();
    } catch (error: any) {
      setNotification({ type: 'error', text: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Sell
  const handleQuickSell = (svc: Service) => {
    const sellable = {
      id: svc.id,
      type: 'service' as const,
      name: svc.name,
      price: Number(svc.price) || 0,
      stock: Infinity,
      purchasePrice: 0,
    };
    navigate('/sales', { state: { prefillItem: sellable } });
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return services;
    return services.filter(
      s =>
        s.name.toLowerCase().includes(q) ||
        (s.description || '').toLowerCase().includes(q) ||
        String(s.price).includes(q)
    );
  }, [services, query]);

  const servicesStats = useMemo(() => {
    const prices = services.map((s) => Number(s.price) || 0).filter((n) => n > 0);
    const avgPrice = prices.length ? Math.round(prices.reduce((sum, n) => sum + n, 0) / prices.length) : 0;
    const premiumCount = prices.filter((n) => avgPrice > 0 && n >= avgPrice).length;
    return [
      { key: 'count', label: 'کل خدمات', value: services.length.toLocaleString('fa-IR'), icon: 'fa-layer-group', hint: 'آیتم فعال' },
      { key: 'avg', label: 'میانگین قیمت', value: formatPrice(avgPrice), icon: 'fa-chart-line', hint: 'مبنای فروش' },
      { key: 'premium', label: 'خدمات پربها', value: premiumCount.toLocaleString('fa-IR'), icon: 'fa-gem', hint: 'بالاتر از میانگین' },
    ];
  }, [services]);

  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: 'نام خدمت',
        cell: info => <span className="font-medium">{info.getValue()}</span>,
      }),
      columnHelper.accessor('description', {
        header: 'توضیحات',
        cell: info => info.getValue() || '—',
      }),
      columnHelper.accessor('price', {
        header: 'قیمت',
        cell: info => <span className="whitespace-nowrap">{formatPrice(info.getValue())}</span>,
      }),
      columnHelper.display({
        id: 'quick',
        header: 'فروش سریع',
        cell: ({ row }) => (
          <Button
            onClick={() => handleQuickSell(row.original)}
            variant="success"
            size="xs"
            className="min-h-0 px-2.5 py-2"
            tooltip="افزودن مورد جدید به سبد خرید"
            leftIcon={<i className="fas fa-shopping-cart" />}
          />
        ),
      }),
      ...(currentUser?.roleName === 'Admin'
        ? [
            columnHelper.display({
              id: 'actions',
              header: 'عملیات',
              cell: ({ row }) => (
                <div className="flex items-center justify-center gap-1.5">
                  <Button
                    onClick={() => openModal('edit', row.original)}
                    variant="secondary"
                    size="xs"
                    className="min-h-0 px-2.5 py-2"
                    tooltip="ویرایش اطلاعات"
                    leftIcon={<i className="fas fa-edit" />}
                  />
                  <Button
                    onClick={() => setItemToDelete(row.original)}
                    variant="danger"
                    size="xs"
                    className="min-h-0 px-2.5 py-2"
                    tooltip="حذف مورد"
                    leftIcon={<i className="fas fa-trash" />}
                  />
                </div>
              ),
            }),
          ]
        : []),
    ],
    [currentUser]
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { columnVisibility },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const exportBase = `services-${new Date().toISOString().slice(0, 10)}`;
  const exportRows = filtered.map((s) => ({
    name: s.name,
    price: s.price ?? 0,
    description: s.description ?? '',
    createdAt: (s as any)?.createdAt ?? '',
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
      body: exportRows.map((r) => [
        String(r.name ?? ''),
        String(Number(r.price ?? 0).toLocaleString('fa-IR')),
        String(r.description ?? ''),
      ]),
    });
  };

  return (
    // در اندازه‌های کوچک، از حداکثر عرض مناسب و حاشیه‌های افقی برای بدنه‌ی صفحه استفاده می‌کنیم تا صفحه واکنش‌گرا شود
    <div className="services-page services-apple-page products-services-redesign-v1 services-redesign-v1 repair-workflow-foundation space-y-3 text-right max-w-7xl mx-auto px-2 sm:px-3" dir="rtl" data-ui-service-page="services" data-ui-service-scope="list">
      <Notification message={notification} onClose={() => setNotification(null)} />

      <section className="services-apple-hero" aria-label="خلاصه خدمات" data-ui-service-surface="hero">
        <div className="services-apple-hero__title">
          <span className="services-apple-hero__icon"><i className="fa-solid fa-bell-concierge" /></span>
          <div>
            <h1>مدیریت خدمات</h1>
            <p>تعریف، قیمت‌گذاری و فروش سریع خدمات جانبی در یک نمای تجاری.</p>
          </div>
        </div>
        {currentUser?.roleName === 'Admin' ? (
          <Button
            type="button"
            onClick={() => openModal('add')}
            variant="primary"
            size="sm"
            leftIcon={<i className="fa-solid fa-plus" />}
          >
            خدمت جدید
          </Button>
        ) : null}
      </section>

      <section className="services-apple-stats" aria-label="شاخص‌های خدمات" data-ui-service-metrics="true">
        {servicesStats.map((card) => (
          <div key={card.key} className="services-apple-stat-card" data-ui-service-card="stat">
            <span className="services-apple-stat-card__icon"><i className={`fa-solid ${card.icon}`} /></span>
            <span className="services-apple-stat-card__body">
              <span className="services-apple-stat-card__label">{card.label}</span>
              <span className="services-apple-stat-card__hint">{card.hint}</span>
            </span>
            <span className="services-apple-stat-card__value">{card.value}</span>
          </div>
        ))}
      </section>

      <div className="services-apple-panel app-card p-3 md:p-4" data-ui-service-surface="workspace" data-ui-service-table-shell="true">
        <TableToolbar
          title="مدیریت خدمات"
          search={query}
          onSearchChange={setQuery}
          searchPlaceholder="جستجو در نام/توضیحات…"
          actions={
            <>
              <ExportMenu
                className="whitespace-nowrap"
                items={[
                  { key: 'excel', label: 'Excel (XLSX)', icon: 'fa-file-excel', onClick: doExportExcel, disabled: filtered.length === 0 },
                  { key: 'pdf', label: 'PDF (جدول)', icon: 'fa-file-pdf', onClick: doExportPdf, disabled: filtered.length === 0 },
                ]}
              />
              <ColumnPicker table={table} storageKey="services.columns" />
            </>
          }
        />

        {isLoading ? (
          <div className="p-6"><Skeleton className="h-28 w-full" rounded="xl" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-6"><EmptyState className="premium-no-result" title="خدمتی یافت نشد" description="جستجو را تغییر دهید یا یک خدمت جدید اضافه کنید." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
              <thead className="bg-slate-100/90 dark:bg-slate-900/95">
                {table.getHeaderGroups().map(hg => (
                  <tr key={hg.id}>
                    {hg.headers.map(h => (
                      <th key={h.id} className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-200">
                        {flexRender(h.column.columnDef.header, h.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="bg-white dark:bg-slate-950/55 divide-y divide-slate-200 dark:divide-slate-800">
                {table.getRowModel().rows.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/85">
                    {r.getVisibleCells().map(c => (
                      <td key={c.id} className="px-4 py-3 whitespace-nowrap text-slate-700 dark:text-slate-200">
                        {flexRender(c.column.columnDef.cell, c.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Redesigned Modal */}
      {isModalOpen && (
        <Modal
          title={modalMode === 'add' ? 'افزودن مورد جدید خدمت' : 'ویرایش اطلاعات خدمت'}
          onClose={closeModal}
          widthClass="max-w-2xl"
          variant="operational"
        >
          <div className="services-apple-modal-head mb-4"><i className="fa-solid fa-screwdriver-wrench" /> فرم خدمت</div>
          <ServiceEditor
            mode={modalMode}
            value={currentService}
            errors={formErrors}
            brand={brand}
            submitting={isSubmitting}
            onChange={patch => setCurrentService(prev => ({ ...prev, ...patch }))}
            onCancel={closeModal}
            onSubmit={handleSubmit}
          />
        </Modal>
      )}

      {/* Delete Modal */}
      {itemToDelete && (
        <Modal title={`تایید حذف خدمت "${itemToDelete.name}"`} onClose={() => setItemToDelete(null)} variant="compact">
          <div className="services-apple-modal-head mb-4"><i className="fa-solid fa-triangle-exclamation" /> حذف خدمت</div>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
            آیا از حذف مورد این خدمت مطمئن هستید؟ این عمل قابل بازگشت نیست.
          </p>
          <ModalActions
            onCancel={() => setItemToDelete(null)}
            cancelText="انصراف"
            submitText="تایید و حذف مورد"
            submittingText="در حال حذف مورد…"
            isSubmitting={isSubmitting}
            submitVariant="danger"
            submitType="button"
            submitIconClass="fa-solid fa-trash"
            onSubmitClick={async () => {
              try {
                setIsSubmitting(true);
                const res = await apiFetch(`/api/services/${itemToDelete.id}`, { method: 'DELETE' });
                const json = await res.json();
                if (!res.ok || !json.success) throw new Error(json.message);
                setNotification({ type: 'success', text: json.message || 'حذف مورد شد.' });
                setItemToDelete(null);
                fetchServices();
              } catch (e: any) {
                setNotification({ type: 'error', text: e.message });
              } finally {
                setIsSubmitting(false);
              }
            }}
          />
        </Modal>
      )}
    </div>
  );
};

export default ServicesPage;
