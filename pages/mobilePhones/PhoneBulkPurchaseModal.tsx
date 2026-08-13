import React from 'react';
import type { Partner, PhoneEntry, PhoneBulkPurchaseItemPayload } from '../../types';
import { Button, DialogShell, SearchableSelectField, SelectField, TextField } from '@/components/ui';
import PriceInput from '../../components/PriceInput';
import ShamsiDatePicker from '../../components/ShamsiDatePicker';
import { PHONE_RAM_OPTIONS, PHONE_STORAGE_OPTIONS } from '../../constants';
import { apiFetch } from '../../utils/apiFetch';
import { normalizeNumericInput, toSafeNumber } from '../../utils/formBehavior';
import { AddableAutocomplete, fromDatePickerToISO_YYYY_MM_DD } from './mobilePhonesControllerSupport';

type BulkPurchaseRow = {
  id: string;
  model: string;
  color: string;
  storage: string;
  ram: string;
  imei: string;
  purchasePrice: string;
};

type BulkPurchaseRowErrors = Partial<Record<keyof Omit<BulkPurchaseRow, 'id'>, string>>;

type BulkPurchaseResult = {
  purchaseBatchId: string;
  supplierId: number;
  supplierName: string;
  purchaseDate: string;
  count: number;
  totalPurchase: number;
  items: PhoneEntry[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  token?: string | null;
  partners: Partner[];
  phones: PhoneEntry[];
  phoneModels: string[];
  phoneColors: string[];
  addPhoneModel?: (name: string) => Promise<void>;
  addPhoneColor?: (name: string) => Promise<void>;
  onCreated: (result: BulkPurchaseResult) => Promise<void> | void;
};

const createRow = (seed?: Partial<BulkPurchaseRow>): BulkPurchaseRow => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  model: seed?.model || '',
  color: seed?.color || '',
  storage: seed?.storage || PHONE_STORAGE_OPTIONS[0] || '',
  ram: seed?.ram || PHONE_RAM_OPTIONS[0] || '',
  imei: '',
  purchasePrice: seed?.purchasePrice || '',
});

const MAX_BULK_ROWS = 100;

const labelClass =
  'mb-2 flex items-center gap-2 text-[11px] font-black text-slate-600 dark:text-slate-300';

const PhoneBulkPurchaseModal: React.FC<Props> = ({
  open,
  onClose,
  token,
  partners,
  phones,
  phoneModels,
  phoneColors,
  addPhoneModel,
  addPhoneColor,
  onCreated,
}) => {
  const [supplierId, setSupplierId] = React.useState('');
  const [purchaseDate, setPurchaseDate] = React.useState<Date | null>(new Date());
  const [rows, setRows] = React.useState<BulkPurchaseRow[]>([createRow()]);
  const [rowErrors, setRowErrors] = React.useState<Record<string, BulkPurchaseRowErrors>>({});
  const [headerErrors, setHeaderErrors] = React.useState<{ supplierId?: string; purchaseDate?: string }>({});
  const [serverError, setServerError] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const reset = React.useCallback(() => {
    setSupplierId('');
    setPurchaseDate(new Date());
    setRows([createRow()]);
    setRowErrors({});
    setHeaderErrors({});
    setServerError('');
    setIsSubmitting(false);
  }, []);

  React.useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  const existingImeis = React.useMemo(
    () => new Set((phones || []).map((phone) => String(phone.imei || '').trim()).filter(Boolean)),
    [phones],
  );

  const totalPurchase = React.useMemo(
    () => rows.reduce((sum, row) => sum + Math.max(0, toSafeNumber(row.purchasePrice)), 0),
    [rows],
  );

  const updateRow = <K extends keyof Omit<BulkPurchaseRow, 'id'>>(
    rowId: string,
    field: K,
    value: BulkPurchaseRow[K],
  ) => {
    setRows((current) =>
      current.map((row) => (row.id === rowId ? { ...row, [field]: value } : row)),
    );
    setRowErrors((current) => {
      if (!current[rowId]?.[field]) return current;
      return { ...current, [rowId]: { ...current[rowId], [field]: undefined } };
    });
    setServerError('');
  };

  const addRow = () => {
    setRows((current) => {
      if (current.length >= MAX_BULK_ROWS) return current;
      return [...current, createRow()];
    });
  };

  const duplicateRow = (row: BulkPurchaseRow) => {
    setRows((current) => {
      if (current.length >= MAX_BULK_ROWS) return current;
      return [
        ...current,
        createRow({
          model: row.model,
          color: row.color,
          storage: row.storage,
          ram: row.ram,
          purchasePrice: row.purchasePrice,
        }),
      ];
    });
  };

  const removeRow = (rowId: string) => {
    setRows((current) =>
      current.length === 1 ? [createRow()] : current.filter((row) => row.id !== rowId),
    );
    setRowErrors((current) => {
      const next = { ...current };
      delete next[rowId];
      return next;
    });
  };

  const validate = () => {
    const nextHeaderErrors: typeof headerErrors = {};
    const nextRowErrors: Record<string, BulkPurchaseRowErrors> = {};
    if (!supplierId) nextHeaderErrors.supplierId = 'تامین‌کننده فاکتور خرید را انتخاب کنید.';
    if (!purchaseDate) nextHeaderErrors.purchaseDate = 'تاریخ خرید مشترک الزامی است.';
    if (rows.length > MAX_BULK_ROWS) {
      setServerError(`حداکثر ${MAX_BULK_ROWS.toLocaleString('fa-IR')} دستگاه در هر فاکتور قابل ثبت است.`);
      return false;
    }

    const imeiRows = new Map<string, string[]>();
    rows.forEach((row) => {
      const errors: BulkPurchaseRowErrors = {};
      const imei = normalizeNumericInput(row.imei);
      if (!row.model.trim()) errors.model = 'مدل الزامی است.';
      if (!row.color.trim()) errors.color = 'رنگ الزامی است.';
      if (!row.storage.trim()) errors.storage = 'حافظه الزامی است.';
      if (!row.ram.trim()) errors.ram = 'رم الزامی است.';
      if (!/^\d{15,16}$/.test(imei)) errors.imei = 'IMEI باید ۱۵ یا ۱۶ رقم باشد.';
      if (existingImeis.has(imei)) errors.imei = 'این IMEI قبلاً در موجودی ثبت شده است.';
      const purchasePrice = toSafeNumber(row.purchasePrice, Number.NaN);
      if (!Number.isFinite(purchasePrice) || purchasePrice < 0) {
        errors.purchasePrice = 'قیمت خرید معتبر وارد کنید.';
      }
      if (imei) {
        const ids = imeiRows.get(imei) || [];
        ids.push(row.id);
        imeiRows.set(imei, ids);
      }
      if (Object.values(errors).some(Boolean)) nextRowErrors[row.id] = errors;
    });

    imeiRows.forEach((rowIds) => {
      if (rowIds.length < 2) return;
      rowIds.forEach((rowId) => {
        nextRowErrors[rowId] = {
          ...nextRowErrors[rowId],
          imei: 'این IMEI داخل ردیف‌های همین فاکتور تکرار شده است.',
        };
      });
    });

    setHeaderErrors(nextHeaderErrors);
    setRowErrors(nextRowErrors);
    return !Object.values(nextHeaderErrors).some(Boolean) && Object.keys(nextRowErrors).length === 0;
  };

  const submit = async () => {
    if (isSubmitting || !token || !validate()) return;
    const purchaseDateIso = fromDatePickerToISO_YYYY_MM_DD(purchaseDate);
    if (!purchaseDateIso) {
      setHeaderErrors((current) => ({ ...current, purchaseDate: 'تاریخ خرید معتبر نیست.' }));
      return;
    }

    const items: PhoneBulkPurchaseItemPayload[] = rows.map((row) => ({
      model: row.model.trim(),
      color: row.color.trim(),
      storage: row.storage.trim(),
      ram: row.ram.trim(),
      imei: normalizeNumericInput(row.imei),
      purchasePrice: toSafeNumber(row.purchasePrice),
    }));

    try {
      setIsSubmitting(true);
      setServerError('');

      if (addPhoneModel) {
        const knownModels = new Set(phoneModels.map((item) => item.trim().toLocaleLowerCase('fa-IR')));
        const missingModels = Array.from(
          new Set(
            items
              .map((item) => item.model.trim())
              .filter((model) => model && !knownModels.has(model.toLocaleLowerCase('fa-IR'))),
          ),
        );
        for (const model of missingModels) {
          await addPhoneModel(model);
          knownModels.add(model.toLocaleLowerCase('fa-IR'));
        }
      }

      const response = await apiFetch('/api/phones/bulk-purchase', {
        method: 'POST',
        body: JSON.stringify({
          supplierId: Number(supplierId),
          purchaseDate: purchaseDateIso,
          items,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        if (Array.isArray(result.errors)) {
          const mappedErrors: Record<string, BulkPurchaseRowErrors> = {};
          result.errors.forEach((error: any) => {
            const row = rows[Number(error.row) - 1];
            if (!row) return;
            mappedErrors[row.id] = {
              ...mappedErrors[row.id],
              [error.field]: String(error.message || 'اطلاعات این ردیف معتبر نیست.'),
            };
          });
          setRowErrors(mappedErrors);
        }
        throw new Error(result.message || 'ثبت گروهی خرید گوشی انجام نشد.');
      }
      await onCreated(result.data as BulkPurchaseResult);
      onClose();
      reset();
    } catch (error: any) {
      setServerError(String(error?.message || 'ثبت گروهی خرید گوشی انجام نشد.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  const desktopRowGridClass =
    'xl:grid-cols-[42px_minmax(180px,1.2fr)_minmax(140px,0.92fr)_minmax(110px,0.72fr)_minmax(104px,0.68fr)_minmax(180px,1.2fr)_minmax(160px,0.96fr)_76px]';
  const compactAutocompleteClass = '!min-h-[2.35rem] !rounded-[10px] !px-2.5';

  return (
    <DialogShell
      isOpen={open}
      onClose={isSubmitting ? () => undefined : onClose}
      closeOnBackdrop={!isSubmitting}
      closeOnEscape={!isSubmitting}
      ariaLabel="ثبت گروهی خرید گوشی"
      panelClassName="max-h-[calc(100vh-1rem)] max-w-[1280px] overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_28px_80px_-42px_rgba(15,23,42,0.52)] dark:border-slate-800 dark:bg-slate-950"
      panelDataId="phone-bulk-purchase-dialog"
    >
      <div className="flex max-h-[calc(100vh-1rem)] min-h-0 flex-col" dir="rtl">
        <header className="flex shrink-0 items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800 sm:px-5">
          <span className="inline-grid h-10 w-10 shrink-0 place-items-center rounded-[15px] border border-primary/20 bg-primary/5 text-primary shadow-[0_10px_22px_-20px_hsl(var(--primary)/0.55)]">
            <i className="fa-solid fa-cart-shopping text-[15px]" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-[17px] font-black tracking-[-0.02em] text-slate-950 dark:text-white sm:text-[19px]">
              ثبت گروهی خرید گوشی
            </h2>
            <p className="mt-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 sm:text-[12px]">
              چندین گوشی را در قالب یک فاکتور خرید ثبت کنید
            </p>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/50 p-3 dark:bg-slate-950/60 sm:p-4 lg:p-5">
          <div className="space-y-4">
            <section className="rounded-[20px] border border-slate-200 bg-white p-3.5 shadow-[0_14px_34px_-30px_rgba(15,23,42,0.28)] dark:border-slate-800 dark:bg-slate-950 sm:p-4">
              <div className="mb-4 flex items-center gap-2">
                <span className="inline-grid h-8 w-8 place-items-center rounded-[12px] bg-primary/10 text-primary">
                  <i className="fa-regular fa-file-lines text-sm" />
                </span>
                <div>
                  <h3 className="text-[14px] font-black text-slate-950 dark:text-white">اطلاعات فاکتور خرید</h3>
                  <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400 sm:text-[11px]">تأمین‌کننده و تاریخ خرید برای تمام ردیف‌ها مشترک است.</p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_minmax(220px,0.9fr)_minmax(250px,0.95fr)] xl:items-end">
                <div>
                  <label className={labelClass}>
                    تأمین‌کننده <span className="text-rose-500">*</span>
                  </label>
                  <SearchableSelectField<string>
                    value={supplierId || null}
                    onValueChange={(value) => {
                      setSupplierId(value ?? '');
                      setHeaderErrors((current) => ({ ...current, supplierId: undefined }));
                    }}
                    options={partners.map((partner) => ({
                      value: String(partner.id),
                      label: partner.partnerName,
                      searchText: `${partner.partnerName} ${partner.id}`,
                    }))}
                    placeholder="نام تأمین‌کننده را تایپ کنید…"
                    noOptionsMessage="تأمین‌کننده‌ای مطابق جستجو پیدا نشد"
                    ariaLabel="جستجو و انتخاب تأمین‌کننده فاکتور خرید"
                    invalid={Boolean(headerErrors.supplierId)}
                    size="md"
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    تاریخ خرید <span className="text-rose-500">*</span>
                  </label>
                  <ShamsiDatePicker
                    id="bulk-phone-purchase-date"
                    selectedDate={purchaseDate}
                    onDateChange={(value) => {
                      setPurchaseDate(value);
                      setHeaderErrors((current) => ({ ...current, purchaseDate: undefined }));
                    }}
                    invalid={Boolean(headerErrors.purchaseDate)}
                    preview="انتخاب تاریخ خرید"
                  />
                  {headerErrors.purchaseDate ? (
                    <p className="mt-1.5 text-xs font-bold text-rose-600">{headerErrors.purchaseDate}</p>
                  ) : null}
                </div>

                <div className="grid grid-cols-3 overflow-hidden rounded-[16px] border border-slate-200 bg-slate-50/70 dark:border-slate-700 dark:bg-slate-900/60 md:col-span-2 xl:col-span-1">
                  <div className="px-2.5 py-2.5 text-center">
                    <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-400">تعداد ردیف</span>
                    <strong className="mt-1 block text-[14px] font-black text-primary">{rows.length.toLocaleString('fa-IR')}</strong>
                    <span className="text-[10px] font-bold text-primary">ردیف</span>
                  </div>
                  <div className="border-x border-slate-200 px-2.5 py-2.5 text-center dark:border-slate-700">
                    <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-400">جمع کل مبلغ</span>
                    <strong className="mt-1 block truncate text-[14px] font-black text-emerald-600 dark:text-emerald-400">
                      {totalPurchase.toLocaleString('fa-IR')}
                    </strong>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">تومان</span>
                  </div>
                  <div className="px-2.5 py-2.5 text-center">
                    <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-400">تعداد دستگاه</span>
                    <strong className="mt-1 block text-[14px] font-black text-sky-600 dark:text-sky-400">{rows.length.toLocaleString('fa-IR')}</strong>
                    <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400">دستگاه</span>
                  </div>
                </div>
              </div>
            </section>

            {serverError ? (
              <div className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/25 dark:text-rose-300">
                <i className="fa-solid fa-triangle-exclamation ml-2" />
                {serverError}
              </div>
            ) : null}

            <section data-ui-bulk-purchase-invoice-grid="true" className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_14px_34px_-30px_rgba(15,23,42,0.28)] dark:border-slate-800 dark:bg-slate-950">
              <div className="flex flex-col gap-2.5 border-b border-slate-200 px-3.5 py-3 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between sm:px-4">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="inline-grid h-8 w-8 shrink-0 place-items-center rounded-[12px] bg-primary/10 text-primary">
                    <i className="fa-solid fa-mobile-screen-button text-sm" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-[14px] font-black text-slate-950 dark:text-white">جزئیات گوشی‌ها</h3>
                    <p className="mt-0.5 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
                      هر IMEI یک ردیف مستقل است؛ برای دستگاه مشابه، ردیف را کپی و فقط IMEI را تغییر دهید.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="hidden text-[11px] font-bold text-slate-500 dark:text-slate-400 sm:inline">
                    حداکثر {MAX_BULK_ROWS.toLocaleString('fa-IR')} دستگاه در هر فاکتور
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={addRow}
                    disabled={rows.length >= MAX_BULK_ROWS}
                    autoIcon={false}
                    leftIcon={<i className="fa-solid fa-plus" />}
                    className="min-h-[40px] rounded-[12px] border-primary/20 bg-primary/5 px-3 text-[11px] font-black text-primary hover:bg-primary/10"
                  >
                    افزودن ردیف
                  </Button>
                </div>
              </div>

              <div className="hidden border-b border-slate-200 bg-slate-50/90 px-3 py-2 text-[10px] font-black text-slate-600 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300 xl:block">
                <div className={`grid items-center gap-2 ${desktopRowGridClass}`}>
                  <div className="text-center">ردیف</div>
                  <div>مدل <span className="text-rose-500">*</span></div>
                  <div>رنگ <span className="text-rose-500">*</span></div>
                  <div>حافظه <span className="text-rose-500">*</span></div>
                  <div>رم <span className="text-rose-500">*</span></div>
                  <div>IMEI <span className="text-rose-500">*</span></div>
                  <div>قیمت خرید (تومان) <span className="text-rose-500">*</span></div>
                  <div className="text-center">عملیات</div>
                </div>
              </div>

              <div className="max-h-[48vh] space-y-2.5 overflow-y-auto p-2.5 sm:p-3 xl:space-y-0 xl:p-0">
                {rows.map((row, index) => {
                  const errors = rowErrors[row.id] || {};
                  const renderActionButtons = () => (
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        onClick={() => duplicateRow(row)}
                        disabled={rows.length >= MAX_BULK_ROWS}
                        className="h-8 w-8 rounded-[9px] border-slate-200 bg-white p-0 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                        tooltip="کپی مشخصات و ایجاد ردیف جدید"
                        aria-label="کپی ردیف"
                        autoIcon={false}
                      >
                        <i className="fa-regular fa-copy text-xs" />
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        size="icon"
                        onClick={() => removeRow(row.id)}
                        className="h-8 w-8 rounded-[9px] border-rose-200 bg-rose-500 p-0 text-white hover:bg-rose-600 dark:border-rose-900/60 dark:bg-rose-600 dark:text-white dark:hover:bg-rose-500"
                        tooltip="حذف ردیف"
                        aria-label="حذف ردیف"
                        autoIcon={false}
                      >
                        <i className="fa-solid fa-trash-can text-xs" />
                      </Button>
                    </div>
                  );

                  return (
                    <article
                      key={row.id}
                      data-ui-bulk-purchase-invoice-row="true"
                      className={`group grid grid-cols-1 gap-2.5 rounded-[16px] border border-slate-200 bg-white p-3 shadow-[0_10px_24px_-24px_rgba(15,23,42,0.26)] transition-colors dark:border-slate-800 dark:bg-slate-950 sm:grid-cols-2 lg:grid-cols-2 xl:items-center xl:gap-2 xl:rounded-none xl:border-x-0 xl:border-t-0 xl:border-b xl:bg-transparent xl:px-3 xl:py-1.5 xl:shadow-none xl:hover:bg-slate-50/80 dark:xl:bg-transparent dark:xl:hover:bg-slate-900/55 ${desktopRowGridClass}`}
                    >
                      <div className="col-span-full flex items-center justify-between gap-3 xl:hidden">
                        <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full border border-primary/20 bg-primary/5 px-2 text-[10px] font-black text-primary">
                          ردیف {(index + 1).toLocaleString('fa-IR')}
                        </span>
                        {renderActionButtons()}
                      </div>

                      <div className="hidden min-h-[38px] items-center justify-center xl:flex"><span className="inline-flex h-6 min-w-6 items-center justify-center rounded-[8px] bg-slate-100 px-1.5 text-[10px] font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {(index + 1).toLocaleString('fa-IR')}
                        </span>
                      </div>

                      <div>
                        <label className={`${labelClass} xl:hidden`}>مدل <span className="text-rose-500">*</span></label>
                        <AddableAutocomplete
                          value={row.model}
                          onChange={(value) => updateRow(row.id, 'model', value)}
                          options={phoneModels}
                          onAdd={addPhoneModel}
                          preview="انتخاب مدل"
                          inputClassName={`${compactAutocompleteClass} ${errors.model ? '!border-rose-400' : ''}`}
                          errorText={errors.model}
                          dir="ltr"
                        />
                      </div>

                      <div>
                        <label className={`${labelClass} xl:hidden`}>رنگ <span className="text-rose-500">*</span></label>
                        <AddableAutocomplete
                          value={row.color}
                          onChange={(value) => updateRow(row.id, 'color', value)}
                          options={phoneColors}
                          onAdd={addPhoneColor}
                          preview="انتخاب رنگ"
                          inputClassName={`${compactAutocompleteClass} ${errors.color ? '!border-rose-400' : ''}`}
                          errorText={errors.color}
                        />
                      </div>

                      <div>
                        <label className={`${labelClass} xl:hidden`}>حافظه <span className="text-rose-500">*</span></label>
                        <SelectField
                          value={row.storage}
                          onValueChange={(value) => updateRow(row.id, 'storage', value)}
                          options={PHONE_STORAGE_OPTIONS.map((option) => ({ value: option, label: option }))}
                          ariaLabel={`حافظه ردیف ${index + 1}`}
                          error={errors.storage}
                          icon={false}
                          size="sm"
                        />
                      </div>

                      <div>
                        <label className={`${labelClass} xl:hidden`}>رم <span className="text-rose-500">*</span></label>
                        <SelectField
                          value={row.ram}
                          onValueChange={(value) => updateRow(row.id, 'ram', value)}
                          options={PHONE_RAM_OPTIONS.map((option) => ({ value: option, label: option }))}
                          ariaLabel={`رم ردیف ${index + 1}`}
                          error={errors.ram}
                          icon={false}
                          size="sm"
                        />
                      </div>

                      <div>
                        <label className={`${labelClass} xl:hidden`}>IMEI <span className="text-rose-500">*</span></label>
                        <TextField
                          value={row.imei}
                          onChange={(event) => updateRow(row.id, 'imei', normalizeNumericInput(event.target.value))}
                          inputMode="numeric"
                          dir="ltr"
                          maxLength={16}
                          placeholder="۱۵ یا ۱۶ رقم"
                          className="!min-h-[38px] !rounded-[10px] !px-2.5 font-mono !text-[12px]"
                          error={errors.imei}
                          aria-label={`IMEI ردیف ${index + 1}`}
                        />
                      </div>

                      <div>
                        <label className={`${labelClass} xl:hidden`}>قیمت خرید <span className="text-rose-500">*</span></label>
                        <PriceInput
                          value={row.purchasePrice}
                          onChange={(event) => updateRow(row.id, 'purchasePrice', event.target.value)}
                          preview="قیمت خرید (تومان)"
                          topLabel=""
                          suffix=""
                          showWords={false}
                          className={`${errors.purchasePrice ? 'border-rose-400' : ''} !h-[38px] !rounded-[10px] !px-2.5 !py-1 !text-[12px] !shadow-none`}
                        />
                        {errors.purchasePrice ? <p className="mt-1 text-xs font-bold text-rose-600">{errors.purchasePrice}</p> : null}
                      </div>

                      <div className="hidden min-h-[40px] items-center justify-center xl:flex">
                        {renderActionButtons()}
                      </div>
                    </article>
                  );
                })}

                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={addRow}
                  disabled={rows.length >= MAX_BULK_ROWS}
                  autoIcon={false}
                  className="min-h-[38px] w-full rounded-[10px] border-dashed border-primary/25 bg-primary/[0.025] px-3 text-[10px] font-black text-primary hover:border-primary/40 hover:bg-primary/[0.055] xl:rounded-none xl:border-x-0 xl:border-b-0"
                >
                  <span className="inline-flex items-center gap-2">
                    <i className="fa-solid fa-plus" />
                    افزودن ردیف جدید
                  </span>
                </Button>
              </div>
            </section>

            <section className="rounded-[16px] border border-sky-200 bg-sky-50/70 px-3.5 py-3 dark:border-sky-900/60 dark:bg-sky-950/20">
              <div className="flex items-center gap-2 text-[11px] font-black text-sky-700 dark:text-slate-300">
                <i className="fa-solid fa-circle-info" />
                نکات مهم
              </div>
              <div className="mt-2.5 grid gap-2.5 text-[10px] font-medium leading-5 text-slate-600 dark:text-slate-300 md:grid-cols-3">
                <p className="flex items-start gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" />همه فیلدهای دارای علامت ستاره الزامی هستند.</p>
                <p className="flex items-start gap-2 md:border-x md:border-sky-200 md:px-4 dark:md:border-sky-900/60"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" />IMEI هر دستگاه باید یکتا و ۱۵ یا ۱۶ رقمی باشد.</p>
                <p className="flex items-start gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" />پس از ثبت، موجودی و حساب تأمین‌کننده به‌روزرسانی می‌شود.</p>
              </div>
            </section>
          </div>
        </div>

        <footer className="flex shrink-0 flex-col gap-2.5 border-t border-slate-200 bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-950 sm:px-4 lg:flex-row lg:items-center lg:justify-between">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onClose}
            disabled={isSubmitting}
            className="order-2 min-h-[40px] min-w-[96px] rounded-[12px] px-3 text-[11px] lg:order-1"
            autoIcon={false}
          >
            <span className="inline-flex items-center gap-2"><i className="fa-solid fa-xmark" />انصراف</span>
          </Button>

          <div className="order-1 flex flex-col gap-2.5 sm:flex-row sm:items-center lg:order-2">
            <div className="text-[12px] font-bold text-slate-500 dark:text-slate-400">
              جمع کل: <strong className="mr-1 text-[15px] font-black text-emerald-600 dark:text-emerald-400">{totalPurchase.toLocaleString('fa-IR')} تومان</strong>
            </div>
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={submit}
              disabled={isSubmitting || !token}
              loading={isSubmitting}
              loadingText="در حال ثبت فاکتور خرید..."
              autoIcon={false}
              className="min-h-[40px] min-w-[168px] rounded-[12px] px-4 text-[11px] font-black"
            >
              <span className="inline-flex items-center gap-2">
                <i className="fa-solid fa-floppy-disk" />
                ثبت فاکتور خرید
              </span>
            </Button>
          </div>
        </footer>
      </div>
    </DialogShell>
  );
};

export default PhoneBulkPurchaseModal;
