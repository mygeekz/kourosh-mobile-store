// pages/AddRepair.tsx
import React, { useCallback, useEffect, useMemo, useState, FormEvent, ChangeEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  BidiText,
  FormGrid,
  FormGridItem,
  PageShell,
  PanelCard,
  SearchableSelectField,
  TextareaField,
  TextField,
  compactValidationErrors,
  nonNegativeNumberError,
  requiredSelectionError,
  requiredTextError,
} from '@/components/ui';
import { NewRepairData, Customer, NotificationMessage } from '../types';
import Notification from '../components/Notification';
import FormErrorSummary from '../components/FormErrorSummary';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../utils/apiFetch';
import { parseApiResult, runWithFeedback, humanizeErrorMessage } from '../utils/feedback';
import Button from '../components/Button';
import { useMountedRef } from '../utils/asyncGuards';
import { useFormErgonomics } from '../hooks/useFormErgonomics';
import { cn } from '../utils/cn';
import { convertNumberToPersianWords } from '../utils/numberUtils';
import { focusErrorsSoon } from '../utils/formBehavior';
import {
  REPAIR_INTAKE_DRAFTS_KEY,
  REPAIR_INTAKE_LEGACY_DRAFT_KEY,
  buildRepairIntakeDraft,
  normalizeRepairFormData,
  normalizeRepairIntakeDraft,
  parseRepairIntakeDrafts,
  sortRepairIntakeDrafts,
  upsertRepairIntakeDraft,
  type RepairIntakeDraft,
} from '../utils/repairIntakeDrafts';
import {
  loadRepairIntakeDraftsDurably,
  persistRepairIntakeDraftsDurably,
  readBrowserLocalStorageSafely,
  removeBrowserLocalStorageSafely,
  removeRepairDraftKeyDurably,
} from '../utils/repairIntakeDraftStorage';

const pickMobile = (c?: Partial<Customer> | null) =>
  c?.phoneNumber || (c as Partial<Customer> & { phone?: string })?.phone || '';

const repairSteps = [
  { id: 'customer', title: 'مشتری', description: 'انتخاب یا جستجوی مشتری', icon: 'fa-solid fa-user', anchorId: 'repair-step-customer' },
  { id: 'device', title: 'دستگاه', description: 'مشخصات دستگاه', icon: 'fa-solid fa-mobile-screen-button', anchorId: 'repair-step-device' },
  { id: 'issue', title: 'شرح مشکل', description: 'جزئیات پذیرش و برآورد', icon: 'fa-solid fa-clipboard-list', anchorId: 'repair-step-issue' },
] as const;

const accessories = [
  { key: 'box', label: 'جعبه', icon: 'fa-solid fa-box-open' },
  { key: 'charger', label: 'شارژر', icon: 'fa-solid fa-plug' },
  { key: 'cable', label: 'کابل', icon: 'fa-solid fa-link' },
  { key: 'case', label: 'قاب', icon: 'fa-solid fa-mobile-screen' },
  { key: 'handsfree', label: 'هندزفری', icon: 'fa-solid fa-headphones-simple' },
  { key: 'other', label: 'سایر', icon: 'fa-solid fa-ellipsis' },
] as const;

type CustomerSelectOption = {
  value: number;
  label: string;
  mobile: string;
  searchText: string;
  customer: Customer;
};

type AddableMetaAutocompleteProps = {
  id: string;
  label: React.ReactNode;
  required?: boolean;
  error?: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  onAdd: (value: string) => Promise<void>;
  placeholder?: string;
  addLabel?: string;
  dir?: 'rtl' | 'ltr';
};

function AddableMetaAutocomplete({
  id,
  label,
  required,
  error,
  value,
  onChange,
  options,
  onAdd,
  placeholder,
  addLabel = 'افزودن مورد جدید',
  dir = 'rtl',
}: AddableMetaAutocompleteProps) {
  const selectOptions = useMemo(() => (
    (Array.isArray(options) ? options : []).map((item) => ({
      value: String(item),
      label: String(item),
      searchText: String(item),
    }))
  ), [options]);

  const currentValueOption = useMemo(() => {
    const cleanValue = value.trim();
    if (!cleanValue) return null;
    return { value: cleanValue, label: cleanValue, searchText: cleanValue };
  }, [value]);

  return (
    <SearchableSelectField<string>
      inputId={id}
      name={id}
      label={label}
      required={required}
      error={error}
      value={value || null}
      valueOption={currentValueOption}
      options={selectOptions}
      size="sm"
      dir={dir}
      clearable
      placeholder={placeholder}
      noOptionsMessage="موردی مطابق جستجو پیدا نشد"
      ariaLabel={typeof label === 'string' ? label : 'انتخاب یا افزودن مورد'}
      onInputValueChange={onChange}
      onValueChange={(nextValue) => onChange(nextValue || '')}
      formatCreateLabel={(nextValue) => `${addLabel} «${nextValue.trim()}»`}
      onCreateOption={async (nextValue) => {
        const cleanValue = nextValue.trim();
        if (!cleanValue) return null;
        try {
          await onAdd(cleanValue);
        } catch {
          // Metadata persistence is auxiliary; keep the accepted free-form value available to the repair form.
        }
        const createdOption = { value: cleanValue, label: cleanValue, searchText: cleanValue };
        onChange(cleanValue);
        return createdOption;
      }}
    />
  );
}

function SectionCard({
  id,
  title,
  icon,
  children,
  hint,
}: {
  id?: string;
  title: string;
  icon: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <PanelCard
      id={id}
      title={title}
      subtitle={hint}
      icon={<i className={icon} aria-hidden="true" />}
      density="compact"
      className="min-w-0 overflow-visible"
      bodyClassName="space-y-3"
    >
      {children}
    </PanelCard>
  );
}

class RepairDraftRenderBoundary extends React.Component<
  { children: React.ReactNode; resetKey: string },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error('[repair-draft] draft list render failed', error);
  }

  componentDidUpdate(prevProps: Readonly<{ children: React.ReactNode; resetKey: string }>) {
    if (this.state.failed && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ failed: false });
    }
  }

  render() {
    if (this.state.failed) {
      return (
        <p className="rounded-[var(--ds-radius-sm)] border border-warning/30 bg-warning/10 px-3 py-3 text-xs font-bold leading-6 text-warning" role="status">
          پیش‌نویس ذخیره شده است، اما نمایش فهرست آن با خطا روبه‌رو شد. صفحه را یک‌بار تازه‌سازی کنید.
        </p>
      );
    }
    return this.props.children;
  }
}

const formatRepairDraftTime = (iso: string) => {
  try {
    return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
  } catch {
    return 'زمان نامشخص';
  }
};

const AddRepair: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const mountedRef = useMountedRef();

  const initialFormState: NewRepairData = {
    customerId: null,
    deviceModel: '',
    deviceColor: '',
    serialNumber: '',
    problemDescription: '',
    estimatedCost: '',
  };

  const [formData, setFormData] = useState<NewRepairData>(initialFormState);
  const [wizardStep, setWizardStep] = useState(0);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerMobile, setCustomerMobile] = useState<string>('');
  const [selectedAccessories, setSelectedAccessories] = useState<string[]>([]);
  const [internalNote, setInternalNote] = useState('');
  const [otherAccessoryNote, setOtherAccessoryNote] = useState('');
  const [drafts, setDrafts] = useState<RepairIntakeDraft[]>([]);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [isDraftSaving, setIsDraftSaving] = useState(false);
  const [draftStorageFeedback, setDraftStorageFeedback] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [phoneModels, setPhoneModels] = useState<string[]>([]);
  const [phoneColors, setPhoneColors] = useState<string[]>([]);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);
  const [formErrors, setFormErrors] = useState<Partial<NewRepairData>>({});
  const { formRef, onKeyDownCapture } = useFormErgonomics({
    errorCount: Object.keys(formErrors || {}).filter((key) => Boolean((formErrors as any)[key])).length,
    submitOnLastField: true,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    let cancelled = false;

    void (async () => {
      const loaded = await loadRepairIntakeDraftsDurably();
      let nextDrafts = loaded.drafts;

      const legacyRaw = readBrowserLocalStorageSafely(REPAIR_INTAKE_LEGACY_DRAFT_KEY);
      if (legacyRaw) {
        try {
          const legacy = JSON.parse(legacyRaw);
          if (legacy?.formData && !nextDrafts.some((draft) => draft.id === 'legacy-single-draft')) {
            const legacyDraft = buildRepairIntakeDraft({
              id: 'legacy-single-draft',
              formData: legacy.formData,
              customerMobile: legacy.customerMobile,
              selectedAccessories: legacy.selectedAccessories,
              otherAccessoryNote: legacy.otherAccessoryNote,
              internalNote: legacy.internalNote,
              savedAt: legacy.savedAt || new Date().toISOString(),
              customerName: 'پیش‌نویس قبلی',
            });
            const persisted = await persistRepairIntakeDraftsDurably([legacyDraft, ...nextDrafts]);
            nextDrafts = persisted.drafts;
            removeBrowserLocalStorageSafely(REPAIR_INTAKE_LEGACY_DRAFT_KEY);
          }
        } catch (error: any) {
          console.warn('[repair-draft] legacy draft migration skipped', error);
          removeBrowserLocalStorageSafely(REPAIR_INTAKE_LEGACY_DRAFT_KEY);
        }
      }

      if (!cancelled) setDrafts(sortRepairIntakeDrafts(nextDrafts));
    })().catch((error: any) => {
      console.error('[repair-draft] loading temporary drafts failed', error);
      if (!cancelled) {
        setDraftStorageFeedback({
          type: 'warning',
          text: humanizeErrorMessage(error?.message || 'خواندن پیش‌نویس‌های موقت انجام نشد.', { action: 'خواندن پیش‌نویس پذیرش تعمیر' }),
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (currentUser && currentUser.roleName === 'Salesperson') {
      setNotification({ type: 'error', text: 'شما اجازه دسترسی به این صفحه را ندارید.' });
      navigate('/');
      return;
    }
    fetchPhoneMetaLists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, navigate]);

  const fetchPhoneMetaLists = async () => {
    try {
      const [modelsResponse, colorsResponse] = await Promise.all([
        apiFetch('/api/phone-models'),
        apiFetch('/api/phone-colors'),
      ]);
      const [modelsResult, colorsResult] = await Promise.all([modelsResponse.json(), colorsResponse.json()]);
      if (modelsResponse.ok && modelsResult?.success) {
        setPhoneModels(Array.isArray(modelsResult.data) ? modelsResult.data : []);
      }
      if (colorsResponse.ok && colorsResult?.success) {
        setPhoneColors(Array.isArray(colorsResult.data) ? colorsResult.data : []);
      }
    } catch {
      setPhoneModels([]);
      setPhoneColors([]);
    }
  };

  const addPhoneModel = async (name: string) => {
    const response = await apiFetch('/api/phone-models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const result = await response.json();
    if (!response.ok || !result?.success) throw new Error(result?.message || 'افزودن مدل دستگاه انجام نشد.');
    setPhoneModels(Array.isArray(result.data) ? result.data : (prev) => Array.from(new Set([...prev, name])));
  };

  const addPhoneColor = async (name: string) => {
    const response = await apiFetch('/api/phone-colors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const result = await response.json();
    if (!response.ok || !result?.success) throw new Error(result?.message || 'افزودن رنگ دستگاه انجام نشد.');
    setPhoneColors(Array.isArray(result.data) ? result.data : (prev) => Array.from(new Set([...prev, name])));
  };


  const selectedCustomer = useMemo(() => {
    if (!formData.customerId) return null;
    return customers.find((c) => c.id === Number(formData.customerId)) || null;
  }, [customers, formData.customerId]);

  const mergeCustomers = useCallback((rows: Customer[]) => {
    setCustomers((prev) => {
      const byId = new Map(prev.map((customer) => [Number(customer.id), customer]));
      rows.forEach((customer) => byId.set(Number(customer.id), { ...byId.get(Number(customer.id)), ...customer }));
      return Array.from(byId.values());
    });
  }, []);

  const loadCustomerOptions = useCallback(async (query: string, signal: AbortSignal, page = 0) => {
    const pageSize = 32;
    const params = new URLSearchParams({ q: query, limit: String(pageSize), offset: String(page * pageSize) });
    const response = await apiFetch(`/api/customers?${params.toString()}`, { signal });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.message || 'خطا در دریافت لیست مشتریان');
    const rows = (result.data || []) as Customer[];
    mergeCustomers(rows);
    const options = rows.map((customer) => {
      const mobile = pickMobile(customer);
      const name = customer.fullName || 'مشتری بدون نام';
      return {
        value: Number(customer.id),
        label: `${name}${mobile ? ` — ${mobile}` : ''}`,
        mobile,
        searchText: `${name} ${mobile} ${customer.id || ''}`,
        customer,
      };
    });
    return { options, hasMore: rows.length === pageSize };
  }, [mergeCustomers]);

  const selectedCustomerOption = useMemo<CustomerSelectOption | null>(() => {
    if (!selectedCustomer) return null;
    const mobile = pickMobile(selectedCustomer);
    const name = selectedCustomer.fullName || 'مشتری بدون نام';
    return {
      value: Number(selectedCustomer.id),
      label: `${name}${mobile ? ` — ${mobile}` : ''}`,
      mobile,
      searchText: `${name} ${mobile} ${selectedCustomer.id || ''}`,
      customer: selectedCustomer,
    };
  }, [selectedCustomer]);



  const buildRepairDraft = (id = activeDraftId || `repair-draft-${Date.now()}`): RepairIntakeDraft => (
    buildRepairIntakeDraft({
      id,
      formData,
      customerMobile,
      selectedAccessories,
      otherAccessoryNote,
      internalNote,
      customerName: selectedCustomer?.fullName,
    })
  );

  const handleLoadDraft = (draft: RepairIntakeDraft) => {
    const normalizedDraft = normalizeRepairIntakeDraft(draft);
    if (!normalizedDraft) {
      setNotification({ type: 'error', text: 'این پیش‌نویس معتبر نیست و قابل ادامه دادن نیست.' });
      return;
    }
    setActiveDraftId(normalizedDraft.id);
    setFormData(normalizeRepairFormData(normalizedDraft.formData));
    setCustomerMobile(normalizedDraft.customerMobile);
    setSelectedAccessories(normalizedDraft.selectedAccessories);
    setOtherAccessoryNote(normalizedDraft.otherAccessoryNote);
    setInternalNote(normalizedDraft.internalNote);
    setFormErrors({});
    setWizardStep(0);
    requestAnimationFrame(() => {
      document.getElementById('repair-step-customer')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  const handleDeleteDraft = async (draftId: string) => {
    setDraftStorageFeedback(null);
    try {
      const nextDrafts = drafts.filter((draft) => draft.id !== draftId);
      const persisted = await persistRepairIntakeDraftsDurably(nextDrafts);
      setDrafts(persisted.drafts);
      if (activeDraftId === draftId) {
        setActiveDraftId(null);
        setFormData(initialFormState);
        setCustomerMobile('');
        setSelectedAccessories([]);
        setOtherAccessoryNote('');
        setInternalNote('');
        setFormErrors({});
      }
      setDraftStorageFeedback({ type: 'success', text: 'پیش‌نویس موقت حذف شد.' });
    } catch (error: any) {
      console.error('[repair-draft] deleting temporary draft failed', error);
      setDraftStorageFeedback({
        type: 'error',
        text: humanizeErrorMessage(error?.message || 'حذف پیش‌نویس انجام نشد.', { action: 'حذف پیش‌نویس پذیرش تعمیر' }),
      });
    }
  };



  const handleSelectCustomer = (customer: Customer) => {
    setFormData((prev) => ({ ...prev, customerId: customer.id as any }));
    setCustomerMobile(pickMobile(customer));
    if (formErrors.customerId) {
      setFormErrors((prev) => ({ ...prev, customerId: undefined }));
    }
  };

  const currentStep = repairSteps[wizardStep] || repairSteps[0];
  const estimatedCostDisplay = useMemo(() => {
    const raw = String(formData.estimatedCost || '').replace(/,/g, '');
    if (!raw || Number.isNaN(Number(raw))) return '—';
    return `${Number(raw).toLocaleString('fa-IR')} تومان`;
  }, [formData.estimatedCost]);

  const estimatedCostWords = useMemo(() => convertNumberToPersianWords(String(formData.estimatedCost || '')), [formData.estimatedCost]);

  const todayLabel = useMemo(() => new Date().toLocaleDateString('fa-IR'), []);

  const handleStepClick = (index: number) => {
    setWizardStep(index);
    const step = repairSteps[index];
    if (!step?.anchorId) return;
    requestAnimationFrame(() => {
      document.getElementById(step.anchorId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> | { target: { name: string; value: string } }
  ) => {
    const { name, value } = e.target;

    if (name === 'customerId') {
      const selected = customers.find((c) => c.id === Number(value));
      setCustomerMobile(pickMobile(selected));
    }

    setFormData((prev) => ({ ...prev, [name]: value }));

    if (formErrors[name as keyof NewRepairData]) {
      setFormErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const toggleAccessory = (label: string) => {
    setSelectedAccessories((prev) => {
      if (prev.includes(label)) {
        if (label === 'سایر') setOtherAccessoryNote('');
        return prev.filter((item) => item !== label);
      }
      return [...prev, label];
    });
  };

  const repairFieldIdMap = {
    customerId: 'customerPicker',
    deviceModel: 'deviceModel',
    problemDescription: 'problemDescription',
    estimatedCost: 'estimatedCost',
  } as const;

  const validateForm = (): boolean => {
    const errors = compactValidationErrors({
      customerId: requiredSelectionError(formData.customerId, 'مشتری'),
      deviceModel: requiredTextError(formData.deviceModel, 'مدل دستگاه'),
      problemDescription: requiredTextError(formData.problemDescription, 'شرح مشکل از زبان مشتری'),
      estimatedCost: nonNegativeNumberError(formData.estimatedCost, 'هزینه تخمینی', { optional: true }),
    });
    setFormErrors(errors);
    focusErrorsSoon(errors, repairFieldIdMap);
    return Object.keys(errors).length === 0;
  };

  const buildProblemDescription = () => {
    const parts = [formData.problemDescription.trim()];
    const accessoriesForPayload = selectedAccessories.map((item) => {
      if (item === 'سایر' && otherAccessoryNote.trim()) {
        return `سایر: ${otherAccessoryNote.trim()}`;
      }
      return item;
    });
    if (accessoriesForPayload.length > 0) parts.push(`اقلام همراه: ${accessoriesForPayload.join('، ')}`);
    if (internalNote.trim()) parts.push(`یادداشت داخلی: ${internalNote.trim()}`);
    return parts.filter(Boolean).join('\n');
  };

  const handleSaveDraft = async () => {
    if (isDraftSaving) return;
    setDraftStorageFeedback(null);
    setIsDraftSaving(true);
    try {
      const draftId = activeDraftId || `repair-draft-${Date.now()}`;
      const nextDraft = buildRepairDraft(draftId);
      const nextDrafts = upsertRepairIntakeDraft(drafts, nextDraft);
      const persisted = await persistRepairIntakeDraftsDurably(nextDrafts);
      setDrafts(persisted.drafts);
      setActiveDraftId(draftId);
      setDraftStorageFeedback({
        type: 'success',
        text: persisted.backend === 'indexedDB'
          ? 'پیش‌نویس با موفقیت ذخیره شد. به‌دلیل محدودیت LocalStorage، از حافظه پایدار جایگزین مرورگر استفاده شد.'
          : 'پیش‌نویس پذیرش تعمیر با موفقیت در همین دستگاه ذخیره شد.',
      });
    } catch (error: any) {
      console.error('[repair-draft] temporary save failed', error);
      setDraftStorageFeedback({
        type: 'error',
        text: humanizeErrorMessage(error?.message || 'ذخیره پیش‌نویس انجام نشد.', { action: 'ذخیره پیش‌نویس پذیرش تعمیر' }),
      });
    } finally {
      setIsDraftSaving(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    setNotification(null);

    let navigationCommitted = false;
    try {
      const payload: any = {
        ...formData,
        customerId: Number(formData.customerId),
        problemDescription: buildProblemDescription(),
        estimatedCost: formData.estimatedCost
          ? Number(String(formData.estimatedCost).replace(/,/g, ''))
          : null,
        customerMobile: customerMobile || null,
      };

      const result = await runWithFeedback(
        parseApiResult<any>(
          await apiFetch('/api/repairs', {
            method: 'POST',
            body: JSON.stringify(payload),
          }),
          { endpoint: '/api/repairs', action: 'ثبت اطلاعات پذیرش تعمیر' }
        ),
        {
          kind: 'create',
          endpoint: '/api/repairs',
          loading: 'در حال ثبت اطلاعات پذیرش تعمیر…',
          error: 'ثبت اطلاعات پذیرش تعمیر انجام نشد؛ اطلاعات مشتری، دستگاه و هزینه را بررسی و ادامه کنید.',
          // The receipt route is the success confirmation. Emitting another success toast
          // before navigation forces an unnecessary transient render of AddRepair and can
          // surface runtime failures after the server commit has already succeeded.
          silentSuccess: true,
        }
      );

      const repairId =
        result?.data?.repair?.id ??
        result?.data?.id ??
        result?.data?.repairId ??
        result?.data?.repair?.repairId;

      if (!repairId) {
        throw new Error('شناسه تعمیر پس از ثبت اطلاعات دریافت نشد.');
      }

      const draftIdToCleanup = activeDraftId;
      const draftsSnapshot = drafts;

      // Commit the route transition immediately after the server confirms the repair.
      // Do not mutate AddRepair UI state after the commit; the receipt page is the next
      // authoritative screen and will fetch the saved repair by id.
      navigate(`/repairs/${repairId}/receipt?autoPrint=1`, { replace: true });
      navigationCommitted = true;
      console.info('[repair-submit] repair committed; receipt navigation started', { repairId });

      // Draft cleanup is best-effort post-commit housekeeping. It must never block
      // receipt navigation or write React state on a page that is being unmounted.
      void (async () => {
        try {
          await removeRepairDraftKeyDurably(REPAIR_INTAKE_LEGACY_DRAFT_KEY);
          if (draftIdToCleanup) {
            const nextDrafts = draftsSnapshot.filter((draft) => draft.id !== draftIdToCleanup);
            await persistRepairIntakeDraftsDurably(nextDrafts);
          }
        } catch (draftCleanupError) {
          console.warn('[repair-submit] repair saved; temporary draft cleanup failed', draftCleanupError);
        }
      })();
    } catch (error: any) {
      if (mountedRef.current) {
        setNotification({ type: 'error', text: humanizeErrorMessage(error.message, { endpoint: '/api/repairs', action: 'ثبت اطلاعات پذیرش تعمیر' }) });
      }
    } finally {
      if (!navigationCommitted && mountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    const prefillCustomerId = Number((location.state as any)?.prefillCustomerId || 0);
    if (!prefillCustomerId) return;
    const controller = new AbortController();
    apiFetch(`/api/customers?id=${prefillCustomerId}&limit=1`, { signal: controller.signal })
      .then((response) => response.json())
      .then((result) => {
        const selected = (result.data || [])[0] as Customer | undefined;
        if (!result.success || !selected) return;
        mergeCustomers([selected]);
        setFormData((prev) => ({ ...prev, customerId: prefillCustomerId as any }));
        setCustomerMobile(pickMobile(selected));
      })
      .catch((error) => {
        if (error?.name !== 'AbortError') setNotification({ type: 'error', text: 'مشتری پیش‌فرض پذیرش تعمیر پیدا نشد.' });
      });
    return () => controller.abort();
  }, [location.state, mergeCustomers]);

  return (
    <PageShell
      title="پذیرش دستگاه جدید برای تعمیر"
      description="اطلاعات مشتری، دستگاه و مشکل اعلامی را ثبت کنید تا فرآیند تعمیر دقیق‌تر آغاز شود."
      icon={<i className="fa-solid fa-screwdriver-wrench" aria-hidden="true" />}
      actions={(
        <Button type="button" onClick={() => navigate('/repairs')} variant="secondary" size="sm" leftIcon={<i className="fa-solid fa-arrow-right" />}>
          بازگشت
        </Button>
      )}
    >
      <Notification message={notification} onClose={() => setNotification(null)} />

      <form
        ref={formRef}
        onKeyDownCapture={onKeyDownCapture}
        onSubmit={handleSubmit}
        noValidate
        aria-busy={isLoading}
        className="mx-auto max-w-7xl overflow-hidden rounded-[var(--ds-radius-lg)] border border-border bg-card text-card-foreground shadow-[var(--ds-shadow-card)]"
        data-ui-form-standard="shared-primitives"
      >
        <div className="grid min-w-0 gap-3 p-3 sm:p-4 2xl:grid-cols-[minmax(0,1fr)_19rem]">
          <main className="min-w-0 space-y-3">
            <nav className="grid grid-cols-1 gap-2 sm:grid-cols-3" aria-label="مراحل پذیرش تعمیر">
              {repairSteps.map((step, index) => {
                const active = wizardStep === index;
                const done = index < wizardStep;
                return (
                  <button
                    key={step.id}
                    type="button"
                    className={cn(
                      'flex min-w-0 items-center gap-2.5 rounded-[var(--ds-radius-sm)] border px-3 py-2 text-right transition-colors',
                      active
                        ? 'border-primary/35 bg-primary/10 text-primary'
                        : done
                          ? 'border-success/30 bg-success/10 text-success'
                          : 'border-border bg-card text-foreground hover:bg-muted',
                    )}
                    onClick={() => handleStepClick(index)}
                    aria-current={active ? 'step' : undefined}
                  >
                    <span className={cn(
                      'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--ds-radius-xs)] text-xs font-black',
                      active
                        ? 'bg-primary text-primary-foreground'
                        : done
                          ? 'bg-success text-[var(--ds-text-inverted)]'
                          : 'bg-muted text-muted-foreground',
                    )}>
                      {done ? <i className="fa-solid fa-check" aria-hidden="true" /> : (index + 1).toLocaleString('fa-IR')}
                    </span>
                    <span className="min-w-0">
                      <strong className="block truncate text-sm font-black">{step.title}</strong>
                      <small className="mt-0.5 block truncate text-xs font-semibold opacity-70">{step.description}</small>
                    </span>
                  </button>
                );
              })}
            </nav>

            <FormErrorSummary
              errors={formErrors as Record<string, string>}
              labels={{
                customerId: 'نام مشتری',
                deviceModel: 'مدل دستگاه',
                problemDescription: 'شرح مشکل از زبان مشتری',
                estimatedCost: 'هزینه تخمینی',
              }}
              fieldIdMap={repairFieldIdMap}
            />

            <SectionCard id="repair-step-customer" title="اطلاعات مشتری" icon="fa-solid fa-user" hint="مشتری را انتخاب کنید یا با نام و شماره جستجو کنید.">
              <FormGrid columns={2}>
                <SearchableSelectField<number, CustomerSelectOption>
                  inputId="customerPicker"
                  label="نام مشتری"
                  required
                  error={formErrors.customerId == null ? undefined : String(formErrors.customerId)}
                  options={[]}
                  loadOptions={loadCustomerOptions}
                  valueOption={selectedCustomerOption}
                  debounceMs={240}
                  virtualizeThreshold={36}
                  value={formData.customerId ? Number(formData.customerId) : null}
                  onValueChange={(customerId, option) => {
                    if (!customerId || !option) {
                      setFormData((prev) => ({ ...prev, customerId: null }));
                      setCustomerMobile('');
                      return;
                    }
                    handleSelectCustomer(option.customer);
                  }}
                  placeholder="نام، موبایل یا کد مشتری را تایپ کنید…"
                  clearable
                  ariaLabel="جستجو و انتخاب مشتری تعمیر"
                  noOptionsMessage="مشتری مطابق جستجو پیدا نشد"
                  size="sm"
                  formatOptionLabel={(option, meta) => (
                    meta.context === 'value' ? (
                      <span className="inline-flex min-w-0 max-w-full items-center gap-2">
                        <strong className="min-w-0 truncate">{option.customer.fullName || 'مشتری بدون نام'}</strong>
                        {option.mobile ? <BidiText kind="phone" className="shrink-0 text-xs text-muted-foreground">{option.mobile}</BidiText> : null}
                      </span>
                    ) : (
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--ds-radius-xs)] bg-primary/10 text-xs font-black text-primary" aria-hidden="true">
                          {(option.customer.fullName || 'م').trim().charAt(0)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <strong className="block truncate text-sm font-black">{option.customer.fullName || 'مشتری بدون نام'}</strong>
                          <BidiText kind={option.mobile ? 'phone' : 'text'} className="mt-0.5 block text-xs text-muted-foreground">{option.mobile || 'بدون شماره موبایل'}</BidiText>
                        </span>
                      </span>
                    )
                  )}
                />

                <TextField id="customerMobile" name="customerMobile" label="شماره موبایل" controlSize="sm" icon={<i className="fa-solid fa-mobile-screen-button" aria-hidden="true" />} value={customerMobile} readOnly valueKind="phone" placeholder="بعد از انتخاب مشتری پر می‌شود" />
              </FormGrid>
            </SectionCard>

            <SectionCard id="repair-step-device" title="مشخصات دستگاه" icon="fa-solid fa-mobile-screen-button" hint="مدل، رنگ و شناسه دستگاه را دقیق وارد کنید.">
              <FormGrid columns={3}>
                <AddableMetaAutocomplete id="deviceModel" label="مدل دستگاه" required error={formErrors.deviceModel} value={formData.deviceModel} onChange={(value) => handleInputChange({ target: { name: 'deviceModel', value } })} options={phoneModels} onAdd={addPhoneModel} placeholder="مثلاً: iPhone 13 Pro Max" addLabel="افزودن مدل جدید" dir="ltr" />
                <AddableMetaAutocomplete id="deviceColor" label="رنگ دستگاه" value={formData.deviceColor || ''} onChange={(value) => handleInputChange({ target: { name: 'deviceColor', value } })} options={phoneColors} onAdd={addPhoneColor} placeholder="انتخاب یا نوشتن رنگ" addLabel="افزودن رنگ جدید" dir="rtl" />
                <TextField id="serialNumber" name="serialNumber" label="شماره سریال / IMEI (اختیاری)" controlSize="sm" icon={<i className="fa-solid fa-barcode" aria-hidden="true" />} value={formData.serialNumber || ''} onChange={handleInputChange} placeholder="IMEI / Serial" valueKind="imei" />
              </FormGrid>
            </SectionCard>

            <SectionCard title="اقلام همراه" icon="fa-solid fa-cube" hint="اقلامی که همراه دستگاه دریافت شده است را انتخاب کنید.">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6" role="group" aria-label="اقلام همراه دستگاه">
                {accessories.map((item) => {
                  const active = selectedAccessories.includes(item.label);
                  return (
                    <button
                      key={item.key}
                      type="button"
                      className={cn(
                        'flex min-h-10 min-w-0 items-center gap-2 rounded-[var(--ds-radius-sm)] border px-2.5 py-2 text-right text-xs font-bold transition-colors',
                        active
                          ? 'border-primary/35 bg-primary/10 text-primary'
                          : 'border-border bg-card text-foreground hover:bg-muted',
                      )}
                      onClick={() => toggleAccessory(item.label)}
                      aria-pressed={active}
                    >
                      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--ds-radius-xs)] bg-muted text-muted-foreground" aria-hidden="true"><i className={item.icon} /></span>
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      <i className={cn('shrink-0', active ? 'fa-solid fa-check-square text-primary' : 'fa-regular fa-square text-muted-foreground')} aria-hidden="true" />
                    </button>
                  );
                })}
              </div>

              {selectedAccessories.includes('سایر') ? (
                <TextField id="otherAccessoryNote" name="otherAccessoryNote" label="توضیح سایر اقلام همراه" controlSize="sm" icon={<i className="fa-regular fa-keyboard" aria-hidden="true" />} value={otherAccessoryNote} onChange={(event) => setOtherAccessoryNote(event.target.value)} placeholder="مثلاً: کارت حافظه، سیم‌کارت، محافظ صفحه، کیف چرمی…" />
              ) : null}
            </SectionCard>

            <SectionCard id="repair-step-issue" title="جزئیات پذیرش" icon="fa-regular fa-clipboard" hint="شرح مشکل، برآورد هزینه و توضیحات داخلی را ثبت کنید.">
              <FormGrid columns={2} align="start">
                <FormGridItem className="space-y-2">
                  <TextField id="estimatedCost" name="estimatedCost" type="text" inputMode="numeric" valueKind="currency" label="هزینه تخمینی (تومان)" controlSize="sm" icon={<i className="fa-solid fa-coins" aria-hidden="true" />} error={formErrors.estimatedCost == null ? undefined : String(formErrors.estimatedCost)} value={String(formData.estimatedCost || '')} onChange={handleInputChange} placeholder="مثلاً: ۱,۲۰۰,۰۰۰" autoComplete="off" />
                  {estimatedCostWords ? (
                    <p className="flex min-w-0 items-start gap-2 rounded-[var(--ds-radius-sm)] border border-info/30 bg-info/10 px-3 py-2 text-xs font-bold leading-6 text-info" aria-live="polite">
                      <i className="fa-solid fa-quote-right mt-1 shrink-0" aria-hidden="true" />
                      <span className="min-w-0 break-words">{estimatedCostWords}</span>
                    </p>
                  ) : null}
                </FormGridItem>

                <TextareaField id="problemDescription" name="problemDescription" label="شرح مشکل از زبان مشتری" required error={formErrors.problemDescription} value={formData.problemDescription} onChange={handleInputChange} rows={4} placeholder="مشکل دستگاه را همان‌طور که مشتری توضیح داده است بنویسید…" />
                <FormGridItem span="full">
                  <TextareaField id="internalNote" name="internalNote" label="یادداشت داخلی / توضیحات تکمیلی (اختیاری)" value={internalNote} onChange={(event) => setInternalNote(event.target.value)} rows={4} placeholder="یادداشت داخلی برای کارشناس یا تکنسین…" />
                </FormGridItem>
              </FormGrid>
            </SectionCard>
          </main>

          <aside className="min-w-0 space-y-3" aria-label="خلاصه پذیرش تعمیر">
            <PanelCard title="خلاصه پذیرش" icon={<i className="fa-solid fa-list-check" aria-hidden="true" />} density="compact" bodyClassName="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-success/10 px-3 py-1.5 text-xs font-black text-success">
                <span className="h-2 w-2 rounded-full bg-success" aria-hidden="true" />
                پذیرش جدید
              </div>
              <dl className="divide-y divide-border text-sm">
                {[
                  ['مرحله فعلی', currentStep.title],
                  ['مشتری', selectedCustomer?.fullName || '—'],
                  ['موبایل', customerMobile || '—'],
                  ['مدل دستگاه', formData.deviceModel || '—'],
                  ['سریال / IMEI', formData.serialNumber || '—'],
                  ['هزینه تخمینی', estimatedCostDisplay],
                  ['تاریخ پذیرش', todayLabel],
                  ['کاربر پذیرش‌کننده', currentUser?.username || '—'],
                ].map(([label, value]) => (
                  <div key={String(label)} className="flex min-w-0 items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                    <dt className="shrink-0 text-xs font-semibold text-muted-foreground">{label}</dt>
                    <dd className="min-w-0 break-words text-left text-xs font-black text-foreground">
                      <BidiText kind={label === 'موبایل' ? 'phone' : label === 'سریال / IMEI' ? 'imei' : 'auto'}>{value}</BidiText>
                    </dd>
                  </div>
                ))}
              </dl>
            </PanelCard>

            <PanelCard title="پیش‌نویس‌های موقت" subtitle={drafts.length > 0 ? `${drafts.length.toLocaleString('fa-IR')} مورد در همین مرورگر` : 'هنوز پیش‌نویسی ذخیره نشده است'} icon={<i className="fa-regular fa-folder-open" aria-hidden="true" />} density="compact" bodyClassName="space-y-2">
              {draftStorageFeedback ? (
                <p
                  className={cn(
                    'rounded-[var(--ds-radius-sm)] border px-3 py-2 text-xs font-bold leading-6',
                    draftStorageFeedback.type === 'success'
                      ? 'border-success/30 bg-success/10 text-success'
                      : draftStorageFeedback.type === 'warning'
                        ? 'border-warning/30 bg-warning/10 text-warning'
                        : 'border-danger/30 bg-danger/10 text-danger',
                  )}
                  role={draftStorageFeedback.type === 'error' ? 'alert' : 'status'}
                  aria-live="polite"
                >
                  {draftStorageFeedback.text}
                </p>
              ) : null}
              <RepairDraftRenderBoundary resetKey={`${drafts.length}:${drafts[0]?.savedAt || ''}`}>
              {drafts.length > 0 ? (
                <div className="max-h-80 space-y-2 overflow-y-auto pr-0.5" role="list" aria-label="لیست پیش‌نویس‌های موقت پذیرش" data-skip-global-buttons="true">
                  {drafts.map((draft) => {
                    const active = activeDraftId === draft.id;
                    return (
                      <article key={draft.id} className={cn('relative overflow-hidden rounded-[var(--ds-radius-sm)] border bg-card p-3 transition-colors', active ? 'border-primary/40' : 'border-border')}>
                        <button type="button" className="block w-full min-w-0 text-right" onClick={() => handleLoadDraft(draft)} aria-current={active ? 'true' : undefined} aria-label={`ادامه پیش‌نویس ${draft.customerName || 'بدون نام'}، ${draft.deviceLabel || 'بدون مدل'}، ${draft.issuePreview || 'بدون ایراد'}`}>
                          <span className="block min-w-0 space-y-2 pl-9">
                            <span className="flex min-w-0 items-center gap-2 text-xs font-black text-foreground"><i className="fa-regular fa-user w-4 shrink-0 text-primary" aria-hidden="true" /><span className="min-w-0 flex-1 break-words">{draft.customerName || '—'}</span></span>
                            <span className="flex min-w-0 items-center gap-2 text-xs font-bold text-foreground"><i className="fa-solid fa-mobile-screen w-4 shrink-0 text-primary" aria-hidden="true" /><span className="min-w-0 flex-1 break-words" dir="auto">{draft.deviceLabel || '—'}</span></span>
                            <span className="flex min-w-0 items-start gap-2 text-xs font-semibold leading-5 text-muted-foreground"><i className="fa-regular fa-message mt-0.5 w-4 shrink-0 text-primary" aria-hidden="true" /><span className="line-clamp-2 min-w-0 flex-1 break-words">{draft.issuePreview || '—'}</span></span>
                            <span className="block text-[11px] font-semibold text-muted-foreground">{formatRepairDraftTime(draft.savedAt)}</span>
                          </span>
                        </button>
                        <button type="button" className="absolute left-2.5 top-2.5 inline-flex h-8 w-8 items-center justify-center rounded-[var(--ds-radius-xs)] border border-border bg-card text-muted-foreground transition hover:border-danger/35 hover:bg-danger/10 hover:text-danger" onClick={() => void handleDeleteDraft(draft.id)} aria-label={`حذف پیش‌نویس ${draft.customerName || 'بدون نام'}`} title="لغو این پیش‌نویس"><i className="fa-regular fa-trash-can" aria-hidden="true" /></button>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-[var(--ds-radius-sm)] border border-dashed border-border px-3 py-4 text-xs font-semibold leading-6 text-muted-foreground">با زدن «ذخیره موقت»، پذیرش نیمه‌کاره اینجا می‌ماند تا بعداً ادامه بدهید یا حذفش کنید.</p>
              )}
              </RepairDraftRenderBoundary>
            </PanelCard>

            <PanelCard title="راهنمای سریع" icon={<i className="fa-regular fa-lightbulb" aria-hidden="true" />} density="compact">
              <ul className="list-disc space-y-1.5 pr-5 text-xs font-semibold leading-6 text-muted-foreground">
                <li>مشتری را جستجو یا انتخاب کنید.</li>
                <li>مدل، رنگ و شماره سریال را دقیق ثبت کنید.</li>
                <li>اقلام همراه را مشخص کنید.</li>
                <li>شرح مشکل را کوتاه اما قابل پیگیری بنویسید.</li>
              </ul>
            </PanelCard>
          </aside>
        </div>

        <footer className="flex flex-col-reverse gap-3 border-t border-border bg-muted/60 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <Button type="button" onClick={() => navigate('/repairs')} variant="secondary" leftIcon={<i className="fa-solid fa-xmark" />}>انصراف</Button>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button type="button" variant="secondary" leftIcon={<i className="fa-regular fa-floppy-disk" />} onClick={() => void handleSaveDraft()} loading={isDraftSaving} loadingText="در حال ذخیره پیش‌نویس...">ذخیره موقت</Button>
            <Button type="submit" disabled={isLoading} variant="primary" loading={isLoading} loadingText="در حال ثبت پذیرش..." title="ثبت اطلاعات و رفتن به فیش چاپ" leftIcon={<i className="fa-solid fa-check" />}>ذخیره و ثبت پذیرش</Button>
          </div>
        </footer>
      </form>
    </PageShell>
  );
};

export default AddRepair;
