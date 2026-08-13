import { SearchableSelectField, TextareaField, normalizeSearchableSelectText } from '@/components/ui';
// pages/AddRepair.tsx
import React, { useEffect, useMemo, useRef, useState, useCallback, FormEvent, ChangeEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { NewRepairData, Customer, NotificationMessage } from '../types';
import Notification from '../components/Notification';
import { useAuth } from '../contexts/AuthContext';
import { useStyle } from '../contexts/StyleContext';
import { apiFetch } from '../utils/apiFetch';
import { parseApiResult, runWithFeedback, humanizeErrorMessage } from '../utils/feedback';
import Button from '../components/Button';
import { useMountedRef } from '../utils/asyncGuards';
import { useFormErgonomics } from '../hooks/useFormErgonomics';
import { cn } from '../utils/cn';
import { convertNumberToPersianWords } from '../utils/numberUtils';
import { IconGlyph } from '@/components/ui';
/** کمکی‌ها */
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

type FieldShellProps = {
  id?: string;
  label: React.ReactNode;
  icon: string;
  required?: boolean;
  error?: string;
  className?: string;
  children: React.ReactNode;
};

type CustomerSelectOption = {
  value: number;
  label: string;
  mobile: string;
  searchText: string;
  customer: Customer;
};

const normalizeRepairMeta = (value: unknown) => normalizeSearchableSelectText(value);

type AddableMetaAutocompleteProps = {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  onAdd: (value: string) => Promise<void>;
  placeholder?: string;
  addLabel?: string;
  dir?: 'rtl' | 'ltr';
};

function AddableMetaAutocomplete({
  value,
  onChange,
  options,
  onAdd,
  placeholder,
  addLabel = 'افزودن مورد جدید',
  dir = 'rtl',
}: AddableMetaAutocompleteProps) {
  const [query, setQuery] = useState(value || '');
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  const filteredOptions = useMemo(() => {
    const q = normalizeRepairMeta(query);
    const source = Array.isArray(options) ? options : [];
    if (!q) return source.slice(0, 40);
    return source.filter((item) => normalizeRepairMeta(item).includes(q)).slice(0, 40);
  }, [options, query]);

  const alreadyExists = useMemo(() => {
    const q = normalizeRepairMeta(query);
    return Boolean(q) && (options || []).some((item) => normalizeRepairMeta(item) === q);
  }, [options, query]);

  const canAdd = query.trim().length > 0 && !alreadyExists;

  const selectValue = (nextValue: string) => {
    setQuery(nextValue);
    onChange(nextValue);
    setOpen(false);
  };

  const addAndSelect = async () => {
    const nextValue = query.trim();
    if (!nextValue || !canAdd || adding) return;
    try {
      setAdding(true);
      await onAdd(nextValue);
      selectValue(nextValue);
    } catch (error: any) {
      // The parent keeps the form usable even when the metadata endpoint fails.
      selectValue(nextValue);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="ri3-metaCombo" dir="rtl">
      <input
        type="text"
        className="ri3-native ri3-metaCombo__input"
        value={query}
        dir={dir}
        onChange={(event) => {
          setQuery(event.target.value);
          onChange(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 140)}
        placeholder={placeholder}
        autoComplete="off"
        style={ri3InputStyle}
      />
      <span className="ri3-metaCombo__chevron" aria-hidden="true">
        <i className={`fa-solid ${open ? 'fa-chevron-up' : 'fa-chevron-down'}`} />
      </span>
      {open ? (
        <div className="ri3-metaCombo__menu">
          <div className="ri3-metaCombo__menuTitle">انتخاب یا جستجوی مورد</div>
          <div className="ri3-metaCombo__list">
            {filteredOptions.length === 0 && !canAdd ? (
              <div className="ri3-metaCombo__empty">موردی پیدا نشد.</div>
            ) : null}
            {filteredOptions.map((item) => (
              <button
                key={String(item)}
                type="button"
                className="ri3-metaCombo__option"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectValue(String(item))}
              >
                <i className="fa-solid fa-check" aria-hidden="true" />
                <span>{String(item)}</span>
              </button>
            ))}
            {canAdd ? (
              <button
                type="button"
                className="ri3-metaCombo__add"
                disabled={adding}
                onMouseDown={(event) => event.preventDefault()}
                onClick={addAndSelect}
              >
                <span>{adding ? 'در حال افزودن…' : `${addLabel} «${query.trim()}»`}</span>
                <i className="fa-solid fa-plus" aria-hidden="true" />
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

const REPAIR_INTAKE_DRAFTS_KEY = 'kourosh:repair-intake-drafts:v1';
const REPAIR_INTAKE_LEGACY_DRAFT_KEY = 'kourosh:repair-intake-draft';

type RepairIntakeDraft = {
  id: string;
  formData: NewRepairData;
  customerMobile: string;
  selectedAccessories: string[];
  otherAccessoryNote: string;
  internalNote: string;
  savedAt: string;
  customerName: string;
  deviceLabel: string;
  issuePreview: string;
};

const ri3InputStyle: React.CSSProperties = {
  outline: '0',
  boxShadow: 'none',
  background: 'transparent',
  border: '0 solid transparent',
};

function FieldShell({ id, label, icon, required, error, className, children }: FieldShellProps) {
  const childItems = React.Children.toArray(children);
  const primaryChild = childItems.find((child) => React.isValidElement(child));
  const primaryTag = React.isValidElement(primaryChild) && typeof primaryChild.type === 'string' ? primaryChild.type : '';
  const fieldKind = primaryTag === 'textarea' ? 'textarea' : primaryTag === 'select' ? 'select' : 'text';

  const normalizedChildren = childItems.map((child) => {
    if (!React.isValidElement(child)) return child;
    const props = (child.props || {}) as any;
    if (typeof child.type !== 'string') return child;

    return React.cloneElement(child as React.ReactElement<any>, {
      id: props.id || id,
      name: props.name || id,
      className: cn('ri3-native', fieldKind === 'textarea' ? 'ri3-native--textarea' : '', props.className),
      style: { ...ri3InputStyle, ...(props.style || {}) },
      'data-ri3-native-control': 'true',
      'data-ri3-control-kind': fieldKind,
    });
  });

  const focusNativeControlFromFrame = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!id || fieldKind !== 'textarea') return;

    const target = event.target as HTMLElement | null;
    if (target?.closest('textarea, input, select, button, a, [role="button"], [contenteditable="true"]')) {
      return;
    }

    const control = document.getElementById(id) as HTMLTextAreaElement | null;
    if (!control || typeof control.focus !== 'function') return;

    event.preventDefault();
    control.focus({ preventScroll: true });
  };

  return (
    <div
      className={cn('ri3-fieldShell', error ? 'ri3-fieldShell--error' : '', className)}
      data-ri3-field-shell="true"
      data-field-kind={fieldKind}
    >
      <label className="ri3-fieldLabel" htmlFor={id}>
        <span>{label}</span>
        {required ? <span className="ri3-required">*</span> : null}
      </label>
      <div className="ri3-field" data-ri3-field="single-frame-icon-cell" onMouseDown={focusNativeControlFromFrame}>
        <IconGlyph size="md" tone="neutral" className="ri3-field__icon" aria-hidden="true">
          <i className={icon} />
        </IconGlyph>
        <span className="ri3-field__divider" aria-hidden="true" />
        <div className="ri3-field__control">
          {normalizedChildren.length === 1 ? normalizedChildren[0] : normalizedChildren}
        </div>
      </div>
      {error ? (
        <p className="ri3-fieldError">
          <i className="fa-solid fa-circle-exclamation" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
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
    <section id={id} className="ri3-section">
      <header className="ri3-section__header">
        <IconGlyph size="lg" tone="accent" className="ri3-section__icon" aria-hidden="true"><i className={icon} /></IconGlyph>
        <div className="min-w-0">
          <h3>{title}</h3>
          {hint ? <p>{hint}</p> : null}
        </div>
      </header>
      <div className="ri3-section__body">{children}</div>
    </section>
  );
}

const safeParseRepairDrafts = (raw: string | null): RepairIntakeDraft[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
};

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
  const { style } = useStyle();
  const brand = `hsl(${style.primaryHue} 90% 55%)`;
  const pageRootRef = useRef<HTMLDivElement | null>(null);
  useMountedRef();

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const styleId = 'kourosh-repair-intake-v3-focus-kill';
    if (document.getElementById(styleId)) return;

    const styleTag = document.createElement('style');
    styleTag.id = styleId;
    styleTag.setAttribute('data-owner', 'repair-intake-v3');
    styleTag.textContent = `
      html body .repair-intake-v3,
      html body .repair-intake-v3 *,
      html body .repair-intake-v3 *::before,
      html body .repair-intake-v3 *::after {
        --tw-ring-inset: var(--tw-empty,/*!*/ /*!*/) !important;
        --tw-ring-offset-width: 0px !important;
        --tw-ring-offset-color: transparent !important;
        --tw-ring-color: transparent !important;
        --tw-ring-offset-shadow: 0 0 #0000 !important;
        --tw-ring-shadow: 0 0 #0000 !important;
        --tw-shadow: 0 0 #0000 !important;
        --tw-shadow-colored: 0 0 #0000 !important;
      }

      html body .repair-intake-v3 :where(
        input,
        textarea,
        select,
        button,
        [role="combobox"],
        [role="textbox"],
        [tabindex],
        .ri3-field,
        .ri3-field__control,
        .ri3-combobox,
        .ri3-combobox__control,
        .ri3-combobox__value-container,
        .ri3-combobox__input,
        .ri3-combobox__input-container,
        .ri3-combobox__single-value,
        .ri3-combobox__placeholder,
        .ri3-combobox__indicator,
        .ri3-combobox__dropdown-indicator,
        .ri3-combobox__clear-indicator
      ):where(:focus, :focus-visible, :focus-within, :active),
      html body .repair-intake-v3 :where(
        .ri3-field,
        .ri3-field__control,
        .ri3-combobox,
        .ri3-combobox__control,
        .ri3-combobox__value-container,
        .ri3-combobox__input,
        .ri3-combobox__input-container
      ):has(:focus),
      html body .repair-intake-v3 :where(
        .ri3-combobox__control--is-focused,
        .ri3-combobox__control--menu-is-open
      ) {
        outline: 0 !important;
        outline-color: transparent !important;
        outline-width: 0 !important;
        outline-offset: 0 !important;
        box-shadow: none !important;
        -webkit-box-shadow: none !important;
        filter: none !important;
        transform: none !important;
        --tw-ring-inset: var(--tw-empty,/*!*/ /*!*/) !important;
        --tw-ring-offset-width: 0px !important;
        --tw-ring-offset-color: transparent !important;
        --tw-ring-color: transparent !important;
        --tw-ring-offset-shadow: 0 0 #0000 !important;
        --tw-ring-shadow: 0 0 #0000 !important;
        --tw-shadow: 0 0 #0000 !important;
        --tw-shadow-colored: 0 0 #0000 !important;
      }

      html body .repair-intake-v3 .ri3-field,
      html body .repair-intake-v3 .ri3-field:hover,
      html body .repair-intake-v3 .ri3-field:focus,
      html body .repair-intake-v3 .ri3-field:focus-visible,
      html body .repair-intake-v3 .ri3-field:focus-within,
      html body .repair-intake-v3 .ri3-field:has(:focus),
      html body .repair-intake-v3 .ri3-field:has(:focus-visible),
      html body .repair-intake-v3 .ri3-field:active {
        border-color: rgba(203, 213, 225, 0.92) !important;
        background: #fff !important;
        box-shadow: none !important;
        -webkit-box-shadow: none !important;
        outline: 0 !important;
      }

      html body .repair-intake-v3 .ri3-fieldShell--error .ri3-field,
      html body .repair-intake-v3 .ri3-fieldShell--error .ri3-field:hover,
      html body .repair-intake-v3 .ri3-fieldShell--error .ri3-field:focus-within,
      html body .repair-intake-v3 .ri3-fieldShell--error .ri3-field:has(:focus) {
        border-color: rgba(251, 113, 133, 0.9) !important;
      }

      html body .repair-intake-v3 :where(input:not([type="checkbox"]):not([type="radio"]), textarea, select),
      html body .repair-intake-v3 :where(input:not([type="checkbox"]):not([type="radio"]), textarea, select):hover,
      html body .repair-intake-v3 :where(input:not([type="checkbox"]):not([type="radio"]), textarea, select):focus,
      html body .repair-intake-v3 :where(input:not([type="checkbox"]):not([type="radio"]), textarea, select):focus-visible,
      html body .repair-intake-v3 :where(input:not([type="checkbox"]):not([type="radio"]), textarea, select):active,
      html body .repair-intake-v3 :where(input:not([type="checkbox"]):not([type="radio"]), textarea, select):not(:placeholder-shown),
      html body .repair-intake-v3 :where(input:not([type="checkbox"]):not([type="radio"]), textarea, select):-webkit-autofill,
      html body .repair-intake-v3 :where(input:not([type="checkbox"]):not([type="radio"]), textarea, select):-webkit-autofill:hover,
      html body .repair-intake-v3 :where(input:not([type="checkbox"]):not([type="radio"]), textarea, select):-webkit-autofill:focus,
      html body .repair-intake-v3 :where(input:not([type="checkbox"]):not([type="radio"]), textarea, select):-webkit-autofill:active {
        border: 0 !important;
        outline: 0 !important;
        box-shadow: none !important;
        -webkit-box-shadow: 0 0 0 1000px #fff inset !important;
        background: transparent !important;
        background-color: transparent !important;
      }

      html body .repair-intake-v3 .ri3-combobox__control,
      html body .repair-intake-v3 .ri3-combobox__control:hover,
      html body .repair-intake-v3 .ri3-combobox__control--is-focused,
      html body .repair-intake-v3 .ri3-combobox__control--menu-is-open {
        border: 0 !important;
        outline: 0 !important;
        box-shadow: none !important;
        -webkit-box-shadow: none !important;
        background: transparent !important;
        background-color: transparent !important;
      }
    `;
    document.head.appendChild(styleTag);
    return () => {
      styleTag.remove();
    };
  }, []);

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
    if (typeof window === 'undefined') return;

    const storedDrafts = safeParseRepairDrafts(window.localStorage.getItem(REPAIR_INTAKE_DRAFTS_KEY));
    let nextDrafts = storedDrafts;

    const legacyRaw = window.localStorage.getItem(REPAIR_INTAKE_LEGACY_DRAFT_KEY);
    if (legacyRaw) {
      try {
        const legacy = JSON.parse(legacyRaw);
        if (legacy?.formData && !storedDrafts.some((draft) => draft.id === 'legacy-single-draft')) {
          nextDrafts = [
            {
              id: 'legacy-single-draft',
              formData: legacy.formData,
              customerMobile: legacy.customerMobile || '',
              selectedAccessories: Array.isArray(legacy.selectedAccessories) ? legacy.selectedAccessories : [],
              otherAccessoryNote: legacy.otherAccessoryNote || '',
              internalNote: legacy.internalNote || '',
              savedAt: legacy.savedAt || new Date().toISOString(),
              customerName: 'پیش‌نویس قبلی',
              deviceLabel: legacy.formData?.deviceModel || 'بدون مدل دستگاه',
              issuePreview: legacy.formData?.problemDescription || 'بدون شرح مشکل',
            },
            ...storedDrafts,
          ];
          window.localStorage.removeItem(REPAIR_INTAKE_LEGACY_DRAFT_KEY);
          window.localStorage.setItem(REPAIR_INTAKE_DRAFTS_KEY, JSON.stringify(nextDrafts));
        }
      } catch {
        window.localStorage.removeItem(REPAIR_INTAKE_LEGACY_DRAFT_KEY);
      }
    }

    setDrafts([...nextDrafts].sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()));
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



  const persistRepairDrafts = (nextDrafts: RepairIntakeDraft[]) => {
    const sorted = [...nextDrafts].sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
    setDrafts(sorted);
    try {
      window.localStorage.setItem(REPAIR_INTAKE_DRAFTS_KEY, JSON.stringify(sorted));
    } catch (error: any) {
      setNotification({ type: 'error', text: humanizeErrorMessage(error.message || 'ذخیره لیست پیش‌نویس‌ها انجام نشد.', { action: 'ذخیره پیش‌نویس پذیرش تعمیر' }) });
    }
  };

  const buildRepairDraft = (id = activeDraftId || `repair-draft-${Date.now()}`): RepairIntakeDraft => {
    const cleanIssue = formData.problemDescription.trim();
    return {
      id,
      formData,
      customerMobile,
      selectedAccessories,
      otherAccessoryNote,
      internalNote,
      savedAt: new Date().toISOString(),
      customerName: selectedCustomer?.fullName || 'مشتری انتخاب نشده',
      deviceLabel: formData.deviceModel?.trim() || 'بدون مدل دستگاه',
      issuePreview: cleanIssue || internalNote.trim() || 'بدون شرح مشکل',
    };
  };

  const handleLoadDraft = (draft: RepairIntakeDraft) => {
    setActiveDraftId(draft.id);
    setFormData(draft.formData);
    setCustomerMobile(draft.customerMobile || '');
    setSelectedAccessories(Array.isArray(draft.selectedAccessories) ? draft.selectedAccessories : []);
    setOtherAccessoryNote(draft.otherAccessoryNote || '');
    setInternalNote(draft.internalNote || '');
    setFormErrors({});
    setWizardStep(0);
    requestAnimationFrame(() => {
      document.getElementById('repair-step-customer')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  const handleDeleteDraft = (draftId: string) => {
    const nextDrafts = drafts.filter((draft) => draft.id !== draftId);
    persistRepairDrafts(nextDrafts);
    if (activeDraftId === draftId) {
      setActiveDraftId(null);
      setFormData(initialFormState);
      setCustomerMobile('');
      setSelectedAccessories([]);
      setOtherAccessoryNote('');
      setInternalNote('');
      setFormErrors({});
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

  const validateForm = (): boolean => {
    const errors: Partial<NewRepairData> = {};
    if (!formData.customerId) errors.customerId = 'انتخاب مشتری الزامی است.';
    if (!formData.deviceModel.trim()) errors.deviceModel = 'مدل دستگاه الزامی است.';
    if (!formData.problemDescription.trim()) errors.problemDescription = 'شرح مشکل از زبان مشتری الزامی است.';
    if (
      formData.estimatedCost &&
      (isNaN(Number(String(formData.estimatedCost).replace(/,/g, ''))) ||
        Number(String(formData.estimatedCost).replace(/,/g, '')) < 0)
    ) {
      errors.estimatedCost = 'هزینهٔ تخمینی باید عدد معتبر باشد.';
    }
    setFormErrors(errors);
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

  const handleSaveDraft = () => {
    try {
      const draftId = activeDraftId || `repair-draft-${Date.now()}`;
      const nextDraft = buildRepairDraft(draftId);
      const nextDrafts = [nextDraft, ...drafts.filter((draft) => draft.id !== draftId)].slice(0, 20);
      persistRepairDrafts(nextDrafts);
      setActiveDraftId(draftId);
      setNotification({ type: 'success', text: 'پیش‌نویس پذیرش تعمیر ذخیره شد و در لیست سمت چپ قابل ادامه دادن است.' });
    } catch (error: any) {
      setNotification({ type: 'error', text: humanizeErrorMessage(error.message || 'ذخیره پیش‌نویس انجام نشد.', { action: 'ذخیره پیش‌نویس پذیرش تعمیر' }) });
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    setNotification(null);

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
          success: 'پذیرش تعمیر با موفقیت ثبت شد.',
          error: 'ثبت اطلاعات پذیرش تعمیر انجام نشد؛ اطلاعات مشتری، دستگاه و هزینه را بررسی و ادامه کنید.',
        }
      );

      setNotification({ type: 'success', text: 'دستگاه با موفقیت پذیرش شد و رسید آماده چاپ است.' });
      const repairId =
        result?.data?.repair?.id ??
        result?.data?.id ??
        result?.data?.repairId ??
        result?.data?.repair?.repairId;

      if (!repairId) {
        throw new Error('شناسه تعمیر پس از ثبت اطلاعات دریافت نشد.');
      }

      try {
        localStorage.removeItem(REPAIR_INTAKE_LEGACY_DRAFT_KEY);
        if (activeDraftId) {
          const nextDrafts = drafts.filter((draft) => draft.id !== activeDraftId);
          localStorage.setItem(REPAIR_INTAKE_DRAFTS_KEY, JSON.stringify(nextDrafts));
          setDrafts(nextDrafts);
          setActiveDraftId(null);
        }
      } catch {}
      navigate(`/repairs/${repairId}/receipt?autoPrint=1`);
    } catch (error: any) {
      setNotification({ type: 'error', text: humanizeErrorMessage(error.message, { endpoint: '/api/repairs', action: 'ثبت اطلاعات پذیرش تعمیر' }) });
    } finally {
      setIsLoading(false);
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
    <div
      ref={pageRootRef}
      className="repair-intake-v3 mx-auto max-w-[1440px] px-2 text-right sm:px-4"
      dir="rtl"
      data-ri3-page="repair-intake"
      data-ri3-version="51-44"
      style={{ '--repair-brand': brand } as React.CSSProperties}
    >
      <Notification message={notification} onClose={() => setNotification(null)} />

      <form
        ref={formRef}
        onKeyDownCapture={onKeyDownCapture}
        onSubmit={handleSubmit}
        className="ri3-shell"
        aria-busy={isLoading}
        data-ri3-form="intake"
      >
        <header className="ri3-hero" data-ri3-surface="form-header">
          <div className="ri3-titleBlock">
            <IconGlyph size="lg" tone="accent" className="ri3-titleIcon" aria-hidden="true"><i className="fa-solid fa-screwdriver-wrench" /></IconGlyph>
            <div className="min-w-0">
              <h2>پذیرش دستگاه جدید برای تعمیر</h2>
              <p>اطلاعات مشتری، دستگاه و مشکل اعلامی را ثبت کنید تا فرآیند تعمیر دقیق‌تر آغاز شود.</p>
            </div>
          </div>

          <Button
            type="button"
            onClick={() => navigate('/repairs')}
            variant="secondary"
            size="sm"
            leftIcon={<i className="fa-solid fa-arrow-right" />}
            className="ri3-backButton"
          >
            بازگشت
          </Button>
        </header>

        <div className="ri3-contentGrid">
          <main className="ri3-main">
            <nav className="ri3-stepper" aria-label="مراحل پذیرش تعمیر">
              {repairSteps.map((step, index) => {
                const active = wizardStep === index;
                const done = index < wizardStep;
                return (
                  <button
                    key={step.id}
                    type="button"
                    className={cn('ri3-step', active ? 'ri3-step--active' : '', done ? 'ri3-step--done' : '')}
                    onClick={() => handleStepClick(index)}
                  >
                    <span className="ri3-step__number">{(index + 1).toLocaleString('fa-IR')}</span>
                    <span className="ri3-step__copy">
                      <strong>{step.title}</strong>
                      <small>{step.description}</small>
                    </span>
                  </button>
                );
              })}
            </nav>

            <SectionCard id="repair-step-customer" title="اطلاعات مشتری" icon="fa-solid fa-user" hint="مشتری را انتخاب کنید یا با نام و شماره جستجو کنید.">
              <div className="ri3-grid ri3-grid--customer">
                <FieldShell id="customerPicker" label="نام مشتری" icon="fa-solid fa-user" required error={formErrors.customerId == null ? undefined : String(formErrors.customerId)} className="ri3-fieldShell--customerPicker">
                  <SearchableSelectField<number, CustomerSelectOption>
                    inputId="customerPicker"
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
                    className="ri3-combobox"
                    controlClassName="!min-h-11 !h-11 !rounded-none !border-0 !bg-transparent !shadow-none !ring-0 !px-0 hover:!border-0 dark:!bg-transparent"
                    formatOptionLabel={(option, meta) => (
                      meta.context === 'value' ? (
                        <span className="ri3-comboValue">
                          <strong>{option.customer.fullName || 'مشتری بدون نام'}</strong>
                          {option.mobile ? <small dir="ltr">{option.mobile}</small> : null}
                        </span>
                      ) : (
                        <span className="ri3-customerOption">
                          <span className="ri3-customerOption__avatar" aria-hidden="true">
                            {(option.customer.fullName || 'م').trim().charAt(0)}
                          </span>
                          <span className="ri3-customerOption__copy">
                            <strong>{option.customer.fullName || 'مشتری بدون نام'}</strong>
                            <small dir="ltr">{option.mobile || 'بدون شماره موبایل'}</small>
                          </span>
                        </span>
                      )
                    )}
                  />
                </FieldShell>

                <FieldShell id="customerMobile" label="شماره موبایل" icon="fa-solid fa-mobile-screen-button">
                  <input
                    type="text"
                    id="customerMobile"
                    name="customerMobile"
                    className="ri3-native"
                    value={customerMobile}
                    readOnly
                    placeholder="بعد از انتخاب مشتری پر می‌شود"
                  />
                </FieldShell>
              </div>
            </SectionCard>

            <SectionCard id="repair-step-device" title="مشخصات دستگاه" icon="fa-solid fa-mobile-screen-button" hint="مدل، رنگ و شناسه دستگاه را دقیق وارد کنید.">
              <div className="ri3-grid ri3-grid--3">
                <FieldShell id="deviceModel" label="مدل دستگاه" icon="fa-solid fa-mobile-screen" required error={formErrors.deviceModel}>
                  <AddableMetaAutocomplete
                    value={formData.deviceModel}
                    onChange={(value) => handleInputChange({ target: { name: 'deviceModel', value } })}
                    options={phoneModels}
                    onAdd={addPhoneModel}
                    placeholder="مثلاً: iPhone 13 Pro Max"
                    addLabel="افزودن مدل جدید"
                    dir="ltr"
                  />
                </FieldShell>

                <FieldShell id="deviceColor" label="رنگ دستگاه" icon="fa-solid fa-palette">
                  <AddableMetaAutocomplete
                    value={formData.deviceColor || ''}
                    onChange={(value) => handleInputChange({ target: { name: 'deviceColor', value } })}
                    options={phoneColors}
                    onAdd={addPhoneColor}
                    placeholder="انتخاب یا نوشتن رنگ"
                    addLabel="افزودن رنگ جدید"
                    dir="rtl"
                  />
                </FieldShell>

                <FieldShell id="serialNumber" label="شماره سریال / IMEI (اختیاری)" icon="fa-solid fa-barcode">
                  <input
                    type="text"
                    id="serialNumber"
                    name="serialNumber"
                    className="ri3-native"
                    value={formData.serialNumber || ''}
                    onChange={handleInputChange}
                    placeholder="IMEI / Serial"
                  />
                </FieldShell>
              </div>
            </SectionCard>

            <SectionCard title="اقلام همراه" icon="fa-solid fa-cube" hint="اقلامی که همراه دستگاه دریافت شده است را انتخاب کنید.">
              <div className="ri3-accessories" role="group" aria-label="اقلام همراه دستگاه">
                {accessories.map((item) => {
                  const active = selectedAccessories.includes(item.label);
                  return (
                    <button
                      key={item.key}
                      type="button"
                      className={cn('ri3-accessory', active ? 'ri3-accessory--active' : '')}
                      onClick={() => toggleAccessory(item.label)}
                    >
                      <span aria-hidden="true"><i className={item.icon} /></span>
                      <strong>{item.label}</strong>
                      <i className={active ? 'fa-solid fa-check-square' : 'fa-regular fa-square'} aria-hidden="true" />
                    </button>
                  );
                })}
              </div>

              {selectedAccessories.includes('سایر') ? (
                <FieldShell
                  id="otherAccessoryNote"
                  label="توضیح سایر اقلام همراه"
                  icon="fa-regular fa-keyboard"
                  className="ri3-fieldGroup--otherAccessory"
                >
                  <input
                    id="otherAccessoryNote"
                    name="otherAccessoryNote"
                    className="ri3-native"
                    value={otherAccessoryNote}
                    onChange={(event) => setOtherAccessoryNote(event.target.value)}
                    placeholder="مثلاً: کارت حافظه، سیم‌کارت، محافظ صفحه، کیف چرمی…"
                  />
                </FieldShell>
              ) : null}
            </SectionCard>

            <SectionCard id="repair-step-issue" title="جزئیات پذیرش" icon="fa-regular fa-clipboard" hint="شرح مشکل، برآورد هزینه و توضیحات داخلی را ثبت کنید.">
              <div className="ri3-grid ri3-grid--issue">
                <div className="ri3-costStack">
                  <FieldShell id="estimatedCost" label="هزینه تخمینی (تومان)" icon="fa-solid fa-coins" error={formErrors.estimatedCost == null ? undefined : String(formErrors.estimatedCost)} className="ri3-fieldGroup--cost">
                    <input
                      type="text"
                      inputMode="numeric"
                      id="estimatedCost"
                      name="estimatedCost"
                      className="ri3-native ri3-priceInput"
                      value={String(formData.estimatedCost || '')}
                      onChange={handleInputChange}
                      placeholder="مثلاً: ۱,۲۰۰,۰۰۰"
                      autoComplete="off"
                    />
                  </FieldShell>
                  {estimatedCostWords ? (
                    <p className="ri3-costWords" aria-live="polite">
                      <i className="fa-solid fa-quote-right" aria-hidden="true" />
                      <span>{estimatedCostWords}</span>
                    </p>
                  ) : null}
                </div>

                <FieldShell id="problemDescription" label="شرح مشکل از زبان مشتری" icon="fa-regular fa-message" required error={formErrors.problemDescription} className="ri3-fieldGroup--textarea">
                  <TextareaField controlOnly
                    id="problemDescription"
                    name="problemDescription"
                    className="ri3-native"
                    value={formData.problemDescription}
                    onChange={handleInputChange}
                    rows={5}
                    placeholder="مشکل دستگاه را همان‌طور که مشتری توضیح داده است بنویسید…"
                  />
                </FieldShell>

                <FieldShell id="internalNote" label="یادداشت داخلی / توضیحات تکمیلی (اختیاری)" icon="fa-regular fa-note-sticky" className="ri3-fieldGroup--textarea">
                  <TextareaField controlOnly
                    id="internalNote"
                    name="internalNote"
                    className="ri3-native"
                    value={internalNote}
                    onChange={(e) => setInternalNote(e.target.value)}
                    rows={5}
                    placeholder="یادداشت داخلی برای کارشناس یا تکنسین…"
                  />
                </FieldShell>
              </div>
            </SectionCard>
          </main>

          <aside className="ri3-side" aria-label="خلاصه پذیرش تعمیر">
            <section className="ri3-summaryCard">
              <header>
                <span aria-hidden="true"><i className="fa-solid fa-list-check" /></span>
                <h3>خلاصه پذیرش</h3>
              </header>
              <div className="ri3-statusChip"><span /> پذیرش جدید</div>
              <div className="ri3-summaryRows">
                <div><span>مرحله فعلی</span><strong>{currentStep.title}</strong></div>
                <div><span>مشتری</span><strong>{selectedCustomer?.fullName || '—'}</strong></div>
                <div><span>موبایل</span><strong dir="ltr">{customerMobile || '—'}</strong></div>
                <div><span>مدل دستگاه</span><strong>{formData.deviceModel || '—'}</strong></div>
                <div><span>سریال / IMEI</span><strong dir="ltr">{formData.serialNumber || '—'}</strong></div>
                <div><span>هزینه تخمینی</span><strong>{estimatedCostDisplay}</strong></div>
                <div><span>تاریخ پذیرش</span><strong>{todayLabel}</strong></div>
                <div><span>کاربر پذیرش‌کننده</span><strong>{currentUser?.username || '—'}</strong></div>
              </div>
            </section>

            <section className="ri3-draftPanelV49" aria-label="پیش‌نویس‌های پذیرش تعمیر">
              <header className="ri3-draftPanelV49__header">
                <IconGlyph size="md" tone="neutral" className="ri3-draftPanelV49__headerIcon" aria-hidden="true"><i className="fa-regular fa-folder-open" /></IconGlyph>
                <div className="ri3-draftPanelV49__heading">
                  <h3>پیش‌نویس‌های موقت</h3>
                  <p>{drafts.length > 0 ? `${drafts.length.toLocaleString('fa-IR')} مورد در همین مرورگر` : 'هنوز پیش‌نویسی ذخیره نشده است'}</p>
                </div>
              </header>
              {drafts.length > 0 ? (
                <div className="ri3-draftStackV49" role="listbox" aria-label="لیست پیش‌نویس‌های موقت پذیرش">
                  {drafts.map((draft) => {
                    const active = activeDraftId === draft.id;
                    return (
                      <article key={draft.id} className={cn('ri3-draftTicketV49', active ? 'ri3-draftTicketV49--active' : '')}>
                        <button
                          type="button"
                          className="ri3-draftTicketV49__load"
                          onClick={() => handleLoadDraft(draft)}
                          role="option"
                          aria-selected={active}
                          aria-label={`ادامه پیش‌نویس ${draft.customerName || 'بدون نام'}، ${draft.deviceLabel || 'بدون مدل'}، ${draft.issuePreview || 'بدون ایراد'}`}
                        >
                          <span className="ri3-draftTicketV49__row" data-draft-row="customer">
                            <IconGlyph size="sm" tone="neutral" className="ri3-draftTicketV49__icon" aria-hidden="true"><i className="fa-regular fa-user" /></IconGlyph>
                            <span className="ri3-draftTicketV49__value">{draft.customerName || '—'}</span>
                          </span>
                          <span className="ri3-draftTicketV49__row" data-draft-row="device">
                            <IconGlyph size="sm" tone="neutral" className="ri3-draftTicketV49__icon" aria-hidden="true"><i className="fa-solid fa-mobile-screen" /></IconGlyph>
                            <span className="ri3-draftTicketV49__value" dir="auto">{draft.deviceLabel || '—'}</span>
                          </span>
                          <span className="ri3-draftTicketV49__row" data-draft-row="issue">
                            <IconGlyph size="sm" tone="neutral" className="ri3-draftTicketV49__icon" aria-hidden="true"><i className="fa-regular fa-message" /></IconGlyph>
                            <span className="ri3-draftTicketV49__value">{draft.issuePreview || '—'}</span>
                          </span>
                        </button>
                        <button
                          type="button"
                          className="ri3-draftTicketV49__delete"
                          onClick={() => handleDeleteDraft(draft.id)}
                          aria-label={`حذف پیش‌نویس ${draft.customerName || 'بدون نام'}`}
                          title="لغو این پیش‌نویس"
                        >
                          <i className="fa-regular fa-trash-can" aria-hidden="true" />
                        </button>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <p className="ri3-draftPanelV49__empty">با زدن «ذخیره موقت»، پذیرش نیمه‌کاره اینجا می‌ماند تا بعداً ادامه بدهید یا حذفش کنید.</p>
              )}
            </section>

            <section className="ri3-guideCard">
              <header>
                <span aria-hidden="true"><i className="fa-regular fa-lightbulb" /></span>
                <h3>راهنمای سریع</h3>
              </header>
              <ul>
                <li>مشتری را جستجو یا انتخاب کنید.</li>
                <li>مدل، رنگ و شماره سریال را دقیق ثبت کنید.</li>
                <li>اقلام همراه را مشخص کنید.</li>
                <li>شرح مشکل را کوتاه اما قابل پیگیری بنویسید.</li>
              </ul>
            </section>

          </aside>
        </div>

        <footer className="ri3-actions">
          <Button
            type="button"
            onClick={() => navigate('/repairs')}
            variant="secondary"
            leftIcon={<i className="fa-solid fa-xmark" />}
          >
            انصراف
          </Button>

          <div className="ri3-actions__main">
            <Button
              type="button"
              variant="secondary"
              leftIcon={<i className="fa-regular fa-floppy-disk" />}
              onClick={handleSaveDraft}
            >
              ذخیره موقت
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              variant="primary"
              loading={isLoading}
              loadingText="در حال ثبت پذیرش..."
              title="ثبت اطلاعات و رفتن به فیش چاپ"
              leftIcon={<i className="fa-solid fa-check" />}
              className="ri3-submitButton"
            >
              ذخیره و ثبت پذیرش
            </Button>
          </div>
        </footer>
      </form>
    </div>
  );
};

export default AddRepair;
