// src/pages/ServicesPage.tsx
import React, { useState, useEffect, FormEvent, useMemo, useRef } from 'react';
import { Service, NewServiceData, NotificationMessage } from '../types';
import Notification from '../components/Notification';
import Modal from '../components/Modal';
import ModalActions from '../components/ModalActions';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/Button';
import ExportMenu from '../components/ExportMenu';
import ColumnPicker from '../components/ColumnPicker';
import { apiFetch } from '../utils/apiFetch';
import { exportToExcel, exportToPdfTable } from '../utils/exporters';
import { convertNumberToPersianWords } from '../utils/numberUtils';
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
  onSubmitIntentChange?: (intent: 'close' | 'new') => void;
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
  onSubmitIntentChange,
}) => {
  const nameRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const numericPrice = cleanNumber(value.price || '');
  const pricePreview = formatPrice(numericPrice);
  const priceWords = numericPrice > 0 ? convertNumberToPersianWords(String(numericPrice)) + ' تومان' : 'قیمت هنوز وارد نشده است';
  const serviceName = value.name?.trim() || 'نام خدمت';
  const serviceDescription = value.description?.trim() || 'توضیحات کوتاه خدمت در اینجا نمایش داده می‌شود.';
  const descriptionLength = value.description?.length || 0;

  const normalizePriceInput = (raw: string) => raw.replace(/[۰-۹٠-٩]/g, (d) => {
    const fa = '۰۱۲۳۴۵۶۷۸۹';
    const ar = '٠١٢٣٤٥٦٧٨٩';
    const faIndex = fa.indexOf(d);
    if (faIndex >= 0) return String(faIndex);
    const arIndex = ar.indexOf(d);
    return arIndex >= 0 ? String(arIndex) : d;
  }).replace(/[^0-9]/g, '');

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'enter') {
        e.preventDefault();
        onSubmitIntentChange?.('close');
        formRef.current?.requestSubmit();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel, onSubmitIntentChange]);

  useEffect(() => { nameRef.current?.focus({ preventScroll: true }); }, []);

  const focusRef = (ref: React.RefObject<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    ref.current?.focus({ preventScroll: true });
  };

  return (
    <form ref={formRef} onSubmit={onSubmit} className="service-editor-v57" data-ui-service-form="editor-v57" dir="rtl">
      <section className="service-editor-v57__form" aria-label="فرم اطلاعات خدمت">
        <div className="service-editor-v57__sectionTitle">
          <span className="service-editor-v57__dot" aria-hidden="true" />
          <h3>اطلاعات اصلی</h3>
        </div>

        <div className="service-editor-v57__topGrid">
          <div className="service-editor-v57__field service-editor-v57__field--wide" data-field-error={errors.name ? 'true' : undefined}>
            <label htmlFor="serviceNameV57">نام خدمت <b>*</b></label>
            <div className="service-editor-v57__control" onClick={() => focusRef(nameRef)}>
              <input
                ref={nameRef}
                id="serviceNameV57"
                type="text"
                name="name"
                value={value.name || ''}
                onChange={e => onChange({ name: e.target.value })}
                placeholder="مثال: سرویس فیلترشکن"
                autoComplete="off"
              />
              <span className="service-editor-v57__controlIcon" aria-hidden="true"><i className="fa-solid fa-tag" /></span>
            </div>
            <p className={errors.name ? 'service-editor-v57__error' : 'service-editor-v57__hint'}>{errors.name || 'نامی کوتاه، واضح و مناسب فاکتور وارد کنید.'}</p>
          </div>
        </div>

        <div className="service-editor-v57__field service-editor-v57__field--textarea">
          <label htmlFor="serviceDescriptionV57">توضیحات خدمت</label>
          <div className="service-editor-v57__control service-editor-v57__control--textarea" onClick={() => focusRef(descriptionRef)}>
            <textarea
              ref={descriptionRef}
              id="serviceDescriptionV57"
              name="description"
              value={value.description || ''}
              onChange={e => onChange({ description: e.target.value })}
              placeholder="توضیحات کامل خدمت، موارد شامل، نحوه انجام و نکات مهم را وارد کنید…"
              maxLength={400}
            />
            <span className="service-editor-v57__controlIcon" aria-hidden="true"><i className="fa-regular fa-file-lines" /></span>
          </div>
          <p className="service-editor-v57__counter">{descriptionLength.toLocaleString('fa-IR')} / ۴۰۰ کاراکتر</p>
        </div>

        <div className="service-editor-v57__divider" />

        <div className="service-editor-v57__sectionTitle service-editor-v57__sectionTitle--price">
          <span className="service-editor-v57__dot" aria-hidden="true" />
          <h3>قیمت خدمت</h3>
        </div>

        <div className="service-editor-v57__topGrid">
          <div className="service-editor-v57__field service-editor-v57__field--wide" data-field-error={errors.price ? 'true' : undefined}>
            <label htmlFor="servicePriceV57">قیمت (تومان) <b>*</b></label>
            <div className="service-editor-v57__control" onClick={() => focusRef(priceRef)}>
              <input
                ref={priceRef}
                id="servicePriceV57"
                type="text"
                inputMode="numeric"
                name="price"
                value={numericPrice > 0 ? numericPrice.toLocaleString('fa-IR') : ''}
                onChange={e => onChange({ price: normalizePriceInput(e.target.value) })}
                placeholder="مثال: ۲۵۰۰۰۰"
                autoComplete="off"
              />
              <span className="service-editor-v57__controlIcon" aria-hidden="true"><i className="fa-solid fa-wallet" /></span>
            </div>
            <p className={errors.price ? 'service-editor-v57__error' : 'service-editor-v57__hint'}>{errors.price || priceWords}</p>
          </div>
        </div>
      </section>

      <aside className="service-editor-v57__preview" aria-label="پیش‌نمایش خدمت">
        <div className="service-editor-v57__previewCard">
          <div className="service-editor-v57__previewTitle">
            <i className="fa-regular fa-eye" aria-hidden="true" />
            <span>پیش‌نمایش خدمت</span>
          </div>
          <div className="service-editor-v57__previewIcon" aria-hidden="true">
            <i className="fa-solid fa-briefcase" />
          </div>
          <h3>{serviceName}</h3>
          <p>{serviceDescription}</p>
          <div className="service-editor-v57__priceCard">
            <span>قیمت خدمت</span>
            <strong>{pricePreview}</strong>
          </div>
          <div className="service-editor-v57__tipsBox">
            <div><i className="fa-solid fa-circle-info" aria-hidden="true" /> نکات مهم</div>
            <ul>
              <li>اطلاعات را با دقت وارد کنید.</li>
              <li>قیمت باید عددی مثبت باشد.</li>
              <li>قیمت‌ها به تومان وارد شوند.</li>
            </ul>
          </div>
        </div>
      </aside>

      <div className="service-editor-v57__actions">
        <button
          type="submit"
          className="service-editor-v57__btn service-editor-v57__btn--primary"
          disabled={submitting}
          data-submit-intent="close"
          onClick={() => onSubmitIntentChange?.('close')}
        >
          <i className="fa-regular fa-floppy-disk" aria-hidden="true" />
          {submitting ? 'در حال ذخیره…' : mode === 'add' ? 'ذخیره خدمت' : 'ذخیره تغییرات'}
        </button>
        {mode === 'add' ? (
          <button
            type="submit"
            className="service-editor-v57__btn service-editor-v57__btn--secondary"
            disabled={submitting}
            data-submit-intent="new"
            onClick={() => onSubmitIntentChange?.('new')}
          >
            <i className="fa-solid fa-plus" aria-hidden="true" />
            ذخیره و جدید
          </button>
        ) : null}
        <button type="button" className="service-editor-v57__btn service-editor-v57__btn--ghost" onClick={onCancel} disabled={submitting}>
          <i className="fa-solid fa-xmark" aria-hidden="true" />
          انصراف
        </button>
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
  const [submitIntent, setSubmitIntent] = useState<'close' | 'new'>('close');

  const [itemToDelete, setItemToDelete] = useState<Service | null>(null);

  // filters
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
    if (token) fetchServices();
    else setIsLoading(false);
  }, [token]);

  const openModal = (mode: 'add' | 'edit', service: Service | null = null) => {
    setModalMode(mode);
    setFormErrors({});
    setSubmitIntent('close');
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
    setSubmitIntent('close');
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

    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
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
        setServices(prev => {
          if (modalMode === 'add') {
            return prev.some(service => service.id === savedService.id) ? prev : [savedService, ...prev];
          }
          return prev.map(service => service.id === savedService.id ? savedService : service);
        });
      } else if (!keepModalOpen) {
        fetchServices({ silent: true });
      }

      if (keepModalOpen) {
        setCurrentService({ name: '', description: '', price: '' });
        setFormErrors({});
        setSubmitIntent('close');
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

    // Close the confirmation modal and update the table optimistically.
    // This avoids the page-level loading/skeleton path completely, so the Services page no longer flashes white.
    setItemToDelete(null);
    setIsLoading(false);
    setServices(prev => prev.filter(service => String(service.id) !== deletedId));
    setNotification({ type: 'success', text: 'حذف مورد شد.' });

    try {
      const res = await apiFetch(`/api/services/${deletingService.id}`, { method: 'DELETE' });
      let json: any = {};
      try {
        json = await res.json();
      } catch {
        json = {};
      }

      if (!res.ok || json.success === false) {
        throw new Error(json.message || 'حذف خدمت انجام نشد.');
      }

      if (json.message) {
        setNotification({ type: 'success', text: json.message });
      }
    } catch (e: any) {
      setServices(previousServices);
      setNotification({ type: 'error', text: e?.message || 'حذف خدمت انجام نشد.' });
    } finally {
      setIsLoading(false);
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

  const servicePriceStats = useMemo(() => {
    const prices = services.map((s) => Number(s.price) || 0).filter((n) => n > 0);
    const avgPrice = prices.length ? Math.round(prices.reduce((sum, n) => sum + n, 0) / prices.length) : 0;
    const premiumCount = prices.filter((n) => avgPrice > 0 && n >= avgPrice).length;
    const economyCount = prices.filter((n) => avgPrice > 0 && n < avgPrice).length;
    return { avgPrice, premiumCount, economyCount };
  }, [services]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return services.filter((s) => {
      const price = Number(s.price) || 0;
      const matchesText = !q ||
        s.name.toLowerCase().includes(q) ||
        (s.description || '').toLowerCase().includes(q) ||
        String(s.price).includes(q);
      const matchesPrice =
        priceFilter === 'all' ||
        (priceFilter === 'premium' && servicePriceStats.avgPrice > 0 && price >= servicePriceStats.avgPrice) ||
        (priceFilter === 'economy' && servicePriceStats.avgPrice > 0 && price > 0 && price < servicePriceStats.avgPrice);
      return matchesText && matchesPrice;
    });
  }, [services, query, priceFilter, servicePriceStats.avgPrice]);

  const serviceFilterItems = useMemo(() => ([
    { key: 'all' as const, label: 'همه', count: services.length, icon: 'fa-layer-group' },
    { key: 'premium' as const, label: 'پربها', count: servicePriceStats.premiumCount, icon: 'fa-gem' },
    { key: 'economy' as const, label: 'اقتصادی', count: servicePriceStats.economyCount, icon: 'fa-arrow-trend-down' },
  ]), [services.length, servicePriceStats.premiumCount, servicePriceStats.economyCount]);

  const servicesStats = useMemo(() => {
    return [
      { key: 'count', label: 'کل خدمات', value: services.length.toLocaleString('fa-IR'), icon: 'fa-layer-group', hint: 'آیتم فعال' },
      { key: 'avg', label: 'میانگین قیمت', value: formatPrice(servicePriceStats.avgPrice), icon: 'fa-chart-line', hint: 'مبنای فروش' },
      { key: 'premium', label: 'خدمات پربها', value: servicePriceStats.premiumCount.toLocaleString('fa-IR'), icon: 'fa-gem', hint: 'بالاتر از میانگین' },
    ];
  }, [services.length, servicePriceStats]);

  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: 'نام خدمت',
        cell: info => <span className="service-name-cell">{info.getValue()}</span>,
      }),
      columnHelper.accessor('description', {
        header: 'توضیحات',
        cell: info => <span className="service-description-cell">{info.getValue() || '—'}</span>,
      }),
      columnHelper.accessor('price', {
        header: 'قیمت',
        cell: info => <span className="service-price-cell" data-numeric="true">{formatPrice(info.getValue())}</span>,
      }),
      columnHelper.display({
        id: 'quick',
        header: 'فروش سریع',
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => handleQuickSell(row.original)}
            className="service-table-action service-table-action--quick"
            title="افزودن به فروش سریع"
            aria-label={`افزودن ${row.original.name} به فروش سریع`}
          >
            <i className="fa-solid fa-cart-plus" aria-hidden="true" />
            <span>فروش سریع</span>
          </button>
        ),
      }),
      ...(currentUser?.roleName === 'Admin'
        ? [
            columnHelper.display({
              id: 'actions',
              header: 'عملیات',
              cell: ({ row }) => (
                <div className="service-table-actions">
                  <button
                    type="button"
                    onClick={() => openModal('edit', row.original)}
                    className="service-icon-action service-icon-action--edit"
                    title="ویرایش اطلاعات"
                    aria-label={`ویرایش ${row.original.name}`}
                  >
                    <i className="fa-solid fa-pen-to-square" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setItemToDelete(row.original)}
                    className="service-icon-action service-icon-action--delete"
                    title="حذف مورد"
                    aria-label={`حذف ${row.original.name}`}
                  >
                    <i className="fa-solid fa-trash-can" aria-hidden="true" />
                  </button>
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
    <div className="services-page services-apple-page products-services-redesign-v1 services-redesign-v1 space-y-3 text-right max-w-7xl mx-auto px-2 sm:px-3" dir="rtl" data-ui-service-page="services" data-ui-service-scope="list">
      <Notification message={notification} onClose={() => setNotification(null)} />

      <section className="services-apple-hero" aria-label="خلاصه خدمات" data-ui-service-surface="hero">
        <div className="services-apple-hero__title">
          <span className="services-apple-hero__icon"><i className="fa-solid fa-bell-concierge" /></span>
          <div>
            <h1>مدیریت خدمات</h1>
            <p>تعریف، قیمت‌گذاری و فروش سریع خدمات جانبی در یک نمای تجاری.</p>
          </div>
        </div>
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
        <div className="services-workspace-toolbar" data-ui-service-toolbar="true">
          <div className="services-workspace-toolbar__head">
            <span className="services-workspace-toolbar__icon"><i className="fa-solid fa-list-check" /></span>
            <div className="services-workspace-toolbar__copy">
              <h2>مدیریت خدمات</h2>
              <p>{filtered.length.toLocaleString('fa-IR')} خدمت از {services.length.toLocaleString('fa-IR')} مورد نمایش داده می‌شود.</p>
            </div>
          </div>

          <div className="services-workspace-toolbar__controls">
            <label className="services-search-field" aria-label="جستجو در خدمات">
              <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="جستجو در نام، توضیحات یا قیمت…"
              />
              {query ? (
                <button type="button" onClick={() => setQuery('')} aria-label="پاک کردن جستجو">
                  <i className="fa-solid fa-xmark" />
                </button>
              ) : null}
            </label>

            <div className="services-toolbar-actions">
              {currentUser?.roleName === 'Admin' ? (
                <Button
                  type="button"
                  onClick={() => openModal('add')}
                  variant="primary"
                  size="sm"
                  className="services-new-button"
                  leftIcon={<i className="fa-solid fa-plus" />}
                >
                  خدمت جدید
                </Button>
              ) : null}
              <ExportMenu
                className="services-export-menu whitespace-nowrap"
                items={[
                  { key: 'excel', label: 'Excel (XLSX)', icon: 'fa-file-excel', onClick: doExportExcel, disabled: filtered.length === 0 },
                  { key: 'pdf', label: 'PDF (جدول)', icon: 'fa-file-pdf', onClick: doExportPdf, disabled: filtered.length === 0 },
                ]}
              />
              <ColumnPicker table={table} storageKey="services.columns" className="services-column-picker" />
            </div>
          </div>

          <div className="services-filter-row" role="group" aria-label="فیلتر خدمات">
            {serviceFilterItems.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`services-filter-chip ${priceFilter === item.key ? 'is-active' : ''}`}
                onClick={() => setPriceFilter(item.key)}
              >
                <i className={`fa-solid ${item.icon}`} aria-hidden="true" />
                <span>{item.label}</span>
                <b>{item.count.toLocaleString('fa-IR')}</b>
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="p-6"><Skeleton className="h-28 w-full" rounded="xl" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-6"><EmptyState className="premium-no-result" title="خدمتی یافت نشد" description="جستجو را تغییر دهید یا یک خدمت جدید اضافه کنید." /></div>
        ) : (
          <div className="services-table-scroll overflow-x-auto">
            <table className="services-data-table min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
              <colgroup>
                <col className="services-col-name" />
                <col className="services-col-description" />
                <col className="services-col-price" />
                <col className="services-col-quick" />
                {currentUser?.roleName === 'Admin' ? <col className="services-col-actions" /> : null}
              </colgroup>
              <thead>
                {table.getHeaderGroups().map(hg => (
                  <tr key={hg.id}>
                    {hg.headers.map(h => (
                      <th key={h.id} className="service-table-head-cell">
                        {flexRender(h.column.columnDef.header, h.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map(r => (
                  <tr key={r.id}>
                    {r.getVisibleCells().map(c => (
                      <td key={c.id} className="service-table-cell">
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
          widthClass="max-w-[1280px]"
          variant="operational"
          layout="horizontal"
          tone="info"
          iconClass="fa-solid fa-bell-concierge"
          panelClassName="service-modal-v57"
          bodyClassName="service-modal-v57__body"
          ariaDescription="فرم افقی و بدون اسکرول مدیریت خدمت برای ثبت نام، توضیح و تعرفه."
        >
          <ServiceEditor
            mode={modalMode}
            value={currentService}
            errors={formErrors}
            brand={brand}
            submitting={isSubmitting}
            onChange={patch => setCurrentService(prev => ({ ...prev, ...patch }))}
            onCancel={closeModal}
            onSubmit={handleSubmit}
            onSubmitIntentChange={setSubmitIntent}
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
            submitVariant="danger"
            submitType="button"
            submitIconClass="fa-solid fa-trash"
            onSubmitClick={handleDeleteService}
          />
        </Modal>
      )}
    </div>
  );
};

export default ServicesPage;
