import React, { useMemo, useState } from 'react';
import moment from 'jalali-moment';
import CreatableSelect from 'react-select/creatable';
import type { SingleValue, StylesConfig } from 'react-select';
import type { PhoneEntry, PhoneHistoryEventClass, PhoneStatus } from '../../types';
import { normalizeSearchableSelectText } from '../../components/ui';
export { isFactoryNewPhoneCondition } from './phoneSpecificationUtils';

export const fromDatePickerToISO_YYYY_MM_DD = (date: Date | null): string | undefined =>
 date ? moment(date).format('YYYY-MM-DD') : undefined;

export const norm = (s: string) => s.toLowerCase().trim();
export const toFaDigits = (value: string | number) => String(value).replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]);
export const roundMoney = (value: number, step = 500000) => Math.max(0, Math.round(value / step) * step);
export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
export const getEventClassMeta = (eventClass: PhoneHistoryEventClass | string) => {
 switch (eventClass) {
 case 'price':
 return { label: 'تغییر قیمت', icon: 'fa-coins', tone: 'sky' };
 case 'status':
 return { label: 'وضعیت', icon: 'fa-arrows-rotate', tone: 'violet' };
 case 'critical':
 return { label: 'رویداد حساس', icon: 'fa-siren-on', tone: 'rose' };
 default:
 return { label: 'به‌روزرسانی مشخصات', icon: 'fa-clipboard-list-check', tone: 'slate' };
 }
};

export const eventToneClasses = (tone?: string | null) => tone === 'rose'
 ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300'
 : tone === 'amber'
 ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300'
 : tone === 'violet'
 ? 'bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300'
 : tone === 'sky'
 ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300'
 : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';

export type DashboardDrilldown = {
 kind: 'none' | 'staleBucket' | 'model' | 'supplier' | 'missingSale' | 'lossRisk' | 'lowBattery' | 'readyForSale' | 'sellable' | 'pricedInventory' | 'profitableInventory' | 'staleAll';
 value: string;
 label: string;
};


export type PricingDecisionAction = 'accepted' | 'overridden' | 'manual';
export type PricingBehaviorDecision = {
 id: string;
 source?: 'local-pricing-decision';
 userKey: string;
 model: string;
 condition?: string | null;
 purchasePrice: number;
 suggestedSale: number;
 finalSale: number;
 markupPercent: number;
 suggestedMarkupPercent?: number | null;
 action: PricingDecisionAction;
 createdAt: string;
};

export type PricingBehaviorProfile = {
 decisions: PricingBehaviorDecision[];
 userModelDecisions: PricingBehaviorDecision[];
 modelDecisions: PricingBehaviorDecision[];
 userAvgMarkup: number | null;
 userModelAvgMarkup: number | null;
 modelAvgMarkup: number | null;
 acceptanceRate: number | null;
 overrideBiasPercent: number | null;
 confidence: 'پایین' | 'متوسط' | 'بالا';
 label: string;
};

export type PricingStrategyMode = 'quick' | 'balanced' | 'profit';
export type PricingIntelligenceSettings = {
 strategy: PricingStrategyMode;
 targetMarkupPercent: number;
 riskTolerance: number;
 staleDaysThreshold: number;
 roundStep: number;
};

export const PRICING_INTELLIGENCE_STORAGE_KEY = 'kourosh.phonePricingIntelligenceSettings.v1';
export const DEFAULT_PRICING_INTELLIGENCE_SETTINGS: PricingIntelligenceSettings = {
 strategy: 'balanced',
 targetMarkupPercent: 14,
 riskTolerance: 3,
 staleDaysThreshold: 21,
 roundStep: 500000,
};

export const clampPricingSettings = (settings: Partial<PricingIntelligenceSettings>): PricingIntelligenceSettings => ({
 strategy: ['quick', 'balanced', 'profit'].includes(String(settings.strategy)) ? settings.strategy as PricingStrategyMode : DEFAULT_PRICING_INTELLIGENCE_SETTINGS.strategy,
 targetMarkupPercent: clamp(Number(settings.targetMarkupPercent || DEFAULT_PRICING_INTELLIGENCE_SETTINGS.targetMarkupPercent), 6, 30),
 riskTolerance: Math.round(clamp(Number(settings.riskTolerance || DEFAULT_PRICING_INTELLIGENCE_SETTINGS.riskTolerance), 1, 5)),
 staleDaysThreshold: Math.round(clamp(Number(settings.staleDaysThreshold || DEFAULT_PRICING_INTELLIGENCE_SETTINGS.staleDaysThreshold), 7, 90)),
 roundStep: [100000, 250000, 500000, 1000000].includes(Number(settings.roundStep)) ? Number(settings.roundStep) : DEFAULT_PRICING_INTELLIGENCE_SETTINGS.roundStep,
});

export const loadPricingIntelligenceSettings = (): PricingIntelligenceSettings => {
 if (typeof window === 'undefined') return DEFAULT_PRICING_INTELLIGENCE_SETTINGS;
 try {
 const raw = window.localStorage.getItem(PRICING_INTELLIGENCE_STORAGE_KEY);
 return raw ? clampPricingSettings(JSON.parse(raw)) : DEFAULT_PRICING_INTELLIGENCE_SETTINGS;
 } catch {
 return DEFAULT_PRICING_INTELLIGENCE_SETTINGS;
 }
};

export const persistPricingIntelligenceSettings = (settings: PricingIntelligenceSettings) => {
 if (typeof window === 'undefined') return;
 try {
 window.localStorage.setItem(PRICING_INTELLIGENCE_STORAGE_KEY, JSON.stringify(settings));
 } catch {
 // Pricing settings are optional; engine continues with safe defaults.
 }
};

export const pricingStrategyMeta: Record<PricingStrategyMode, { label: string; icon: string; hint: string; markupBias: number; varianceCeiling: number }> = {
 quick: { label: 'فروش سریع', icon: 'fa-bolt', hint: 'برای آزادسازی سرمایه و کاهش خواب کالا', markupBias: -2.2, varianceCeiling: 8 },
 balanced: { label: 'متعادل', icon: 'fa-scale-balanced', hint: 'تعادل بین سرعت فروش و سود سالم', markupBias: 0, varianceCeiling: 12 },
 profit: { label: 'حداکثر سود', icon: 'fa-gem', hint: 'سود بالاتر با پذیرش ریسک کندی فروش', markupBias: 2.8, varianceCeiling: 17 },
};

export const PRICING_BEHAVIOR_STORAGE_KEY = 'kourosh.phonePricingBehavior.v1';
export const normalizePricingUserKey = (user?: any) => String(user?.id || user?.username || user?.displayName || user?.roleName || 'local-admin');

export const loadPricingBehaviorDecisions = (): PricingBehaviorDecision[] => {
 if (typeof window === 'undefined') return [];
 try {
 const raw = window.localStorage.getItem(PRICING_BEHAVIOR_STORAGE_KEY);
 const parsed = raw ? JSON.parse(raw) : [];
 return Array.isArray(parsed) ? parsed.filter((item) => item && item.model && Number(item.purchasePrice) > 0).slice(-250) : [];
 } catch {
 return [];
 }
};

export const persistPricingBehaviorDecisions = (items: PricingBehaviorDecision[]) => {
 if (typeof window === 'undefined') return;
 try {
 window.localStorage.setItem(PRICING_BEHAVIOR_STORAGE_KEY, JSON.stringify(items.slice(-250)));
 } catch {
 // localStorage can be blocked; pricing should keep working without persistence.
 }
};

export const avg = (items: number[]) => items.length ? items.reduce((sum, item) => sum + item, 0) / items.length : null;

/* اتوکامپلیت قابل افزودن مورد جدید (مدل/رنگ) با ذخیره تغییراتٔ پایدار در سرور */
export type AddableAutocompleteProps = {
 value: string;
 onChange: (v: string) => void;
 options: string[];
 onAdd?: (name: string) => Promise<void>;
 preview?: string;
 inputClassName?: string;
 errorText?: string | null;
 dir?: 'rtl' | 'ltr';
};
export const AddableAutocomplete: React.FC<AddableAutocompleteProps> = ({
 value,
 onChange,
 options,
 onAdd,
 preview,
 inputClassName,
 errorText,
 dir = 'rtl',
}) => {
 const [adding, setAdding] = useState(false);
 const [addError, setAddError] = useState<string | null>(null);
 type Option = { value: string; label: string; __isNew__?: boolean };
 const selectOptions = useMemo<Option[]>(() => (options || [])
  .map((item) => String(item).trim())
  .filter(Boolean)
  .map((item) => ({ value: item, label: item })), [options]);
 const selectedOption = value ? { value, label: value } : null;
 const normalizedValue = normalizeSearchableSelectText(value);
 const exactValueExists = Boolean(normalizedValue) && selectOptions.some((option) => normalizeSearchableSelectText(option.value) === normalizedValue);
 const canPersistCurrentValue = Boolean(onAdd && normalizedValue && !exactValueExists);
 const portalTarget = typeof document === 'undefined' ? undefined : document.body;
 const portalStyles = useMemo<StylesConfig<Option, false>>(() => ({
  menuPortal: (base) => ({ ...base, zIndex: 'var(--kourosh-z-popover)' }),
  menuList: (base) => ({ ...base, scrollbarWidth: 'none' }),
 }), []);

 const selectValue = (option: SingleValue<Option>) => { setAddError(null); onChange(option?.value || ''); };
 const createAndSelect = async (inputValue: string) => {
  const nextValue = inputValue.trim();
  if (!nextValue || adding) return;
  try {
   setAdding(true);
   setAddError(null);
   if (onAdd) await onAdd(nextValue);
   onChange(nextValue);
  } catch (error: any) {
   setAddError(String(error?.message || 'افزودن مورد جدید به لیست انجام نشد.'));
  } finally {
   setAdding(false);
  }
 };

 return (
 <div className="phone-addable-combobox relative" dir={dir}>
 <CreatableSelect<Option, false>
  value={selectedOption}
  options={selectOptions}
  onChange={selectValue}
  onCreateOption={(nextValue) => void createAndSelect(nextValue)}
  onInputChange={(nextValue, meta) => {
   if (meta.action === 'input-change') {
    setAddError(null);
    onChange(nextValue);
   }
  }}
  isDisabled={adding}
  isLoading={adding}
  isSearchable
  filterOption={(candidate, inputValue) => {
   const query = normalizeSearchableSelectText(inputValue);
   if (!query) return true;
   return normalizeSearchableSelectText(candidate.data.value).includes(query);
  }}
  isRtl={dir === 'rtl'}
  openMenuOnClick
  openMenuOnFocus
  closeMenuOnSelect
  menuPlacement="auto"
  menuPosition="fixed"
  maxMenuHeight={210}
  menuShouldScrollIntoView={false}
  menuPortalTarget={portalTarget}
  styles={portalStyles}
  unstyled
  placeholder={preview}
  formatCreateLabel={(nextValue) => `افزودن مورد جدید «${nextValue}»`}
  noOptionsMessage={() => 'موردی یافت نشد'}
  loadingMessage={() => 'در حال افزودن…'}
  className="w-full"
  classNamePrefix="phone-addable-combobox"
  classNames={{
   control: ({ isFocused }) => `${inputClassName ?? ''} min-h-[2.65rem] cursor-text !flex !w-full !items-center rounded-[14px] border border-slate-300/90 bg-white !px-3 !py-0 text-slate-900 shadow-[0_10px_20px_-18px_rgba(15,23,42,0.22)] transition-colors dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 ${isFocused ? '!border-primary/45 ring-2 ring-primary/10 dark:!border-primary/55 dark:ring-primary/15' : 'hover:border-slate-400 dark:hover:border-slate-600'}`,
   valueContainer: () => `min-w-0 flex-1 px-0 py-0 ${dir === 'ltr' ? 'text-left' : 'text-right'}`,
   singleValue: () => `truncate text-[13px] font-semibold text-slate-900 dark:text-slate-100 ${dir === 'ltr' ? 'text-left' : 'text-right'}`,
   input: () => `m-0 min-w-0 p-0 text-[13px] font-semibold text-slate-900 dark:text-slate-100 ${dir === 'ltr' ? 'text-left' : 'text-right'}`,
   placeholder: () => `truncate text-[13px] font-semibold text-slate-400 dark:text-slate-500 ${dir === 'ltr' ? 'text-left' : 'text-right'}`,
   indicatorsContainer: () => 'shrink-0 self-stretch',
   clearIndicator: () => 'flex cursor-pointer items-center px-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200',
   dropdownIndicator: ({ selectProps }) => `flex w-7 items-center justify-center p-0 text-slate-500 transition-transform dark:text-slate-300 ${selectProps.menuIsOpen ? 'rotate-180' : ''}`,
   indicatorSeparator: () => 'hidden',
   menu: () => 'mt-1.5 overflow-hidden rounded-[16px] border border-slate-200/90 bg-white p-1 shadow-[0_20px_48px_-26px_rgba(15,23,42,0.34)] dark:border-slate-700 dark:bg-slate-950',
   menuList: () => 'p-0.5',
   option: ({ data, isFocused, isSelected }) => `flex min-h-9 cursor-pointer items-center rounded-[10px] px-3 py-2 text-[12px] font-semibold ${dir === 'ltr' ? 'text-left' : 'text-right'} ${data.__isNew__ ? 'text-emerald-700 dark:text-emerald-300' : isSelected ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/35 dark:text-emerald-200' : isFocused ? 'bg-slate-100 text-slate-950 dark:bg-slate-800 dark:text-white' : 'text-slate-700 dark:text-slate-200'}`,
   noOptionsMessage: () => 'px-3 py-4 text-center text-sm text-slate-500 dark:text-slate-400',
   loadingMessage: () => 'px-3 py-4 text-center text-sm text-slate-500 dark:text-slate-400',
  }}
 />
 {canPersistCurrentValue ? (
  <button
   type="button"
   className="mt-1.5 flex min-h-8 w-full items-center justify-between gap-2 rounded-[10px] border border-emerald-200 bg-emerald-50/70 px-2.5 py-1.5 text-[10.5px] font-black text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-wait disabled:opacity-60 dark:border-emerald-900/70 dark:bg-emerald-950/25 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
   disabled={adding}
   onMouseDown={(event) => event.preventDefault()}
   onClick={() => void createAndSelect(value)}
  >
   <span className="min-w-0 truncate">{adding ? 'در حال افزودن به لیست…' : `افزودن «${String(value).trim()}» به لیست`}</span>
   <i className="fa-solid fa-plus shrink-0" aria-hidden="true" />
  </button>
 ) : null}
 {addError ? <p className="mt-1 text-xs font-bold text-red-600">{addError}</p> : null}
 {errorText && <p className="mt-1 text-xs text-red-600">{errorText}</p>}
 </div>
 );
};

// Helper: ساخت payload برای انتخاب خودکار آیتم فروش مطابق انتظار SalesCartPage
export const buildPhonePrefillItem = (phone: PhoneEntry) => ({
 id: phone.id,
 type: 'phone' as const,
 name: [
 phone.model,
 phone.storage ? `| ${phone.storage}` : '',
 phone.ram ? `| ${phone.ram}` : '',
 phone.color ? `| ${phone.color}` : '',
 phone.imei ? `| IMEI:${phone.imei}` : '',
 ].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim(),
 price: Number(phone.salePrice || 0),
 stock: 1,
 purchasePrice: Number(phone.purchasePrice || 0),
 initialPurchasePrice: Number(phone.purchasePrice || 0),
 currentPurchasePrice: Number((phone as any).currentPurchasePrice || 0) || null,
 buyPrice: Number((phone as any).currentPurchasePrice || 0) || Number(phone.purchasePrice || 0),
 costBasisSource: Number((phone as any).currentPurchasePrice || 0) > 0 ? 'currentPurchasePrice' : 'purchasePrice',
});

export type InventoryWorkspace = 'intake' | 'inventory' | 'stale' | 'returns' | 'insights';
export type InventoryViewMode = 'cards' | 'compact' | 'table';
export type InventorySortMode = 'newest' | 'oldest' | 'purchaseHigh' | 'purchaseLow' | 'saleHigh' | 'saleLow' | 'marginHigh' | 'staleMost';
export type SavedInventoryView = 'all' | 'sellable' | 'missingSale' | 'stale' | 'returns' | 'today';
export type DetailsTab = 'overview' | 'timeline' | 'dossier';
export type BulkConfirmAction = 'status' | 'supplier' | 'export';

export const inventorySellableStatuses: PhoneStatus[] = ['موجود در انبار', 'مرجوعی', 'مرجوعی اقساطی'];

export const workspaceMeta: Array<{ key: InventoryWorkspace; label: string; icon: string; hint: string }> = [
 { key: 'intake', label: 'ثبت گوشی', icon: 'fa-plus-circle', hint: 'افزودن دستگاه جدید به موجودی فروش' },
 { key: 'inventory', label: 'موجودی', icon: 'fa-boxes-stacked', hint: 'مدیریت قیمت و وضعیت فروش گوشی‌ها' },
 { key: 'stale', label: 'راکدها', icon: 'fa-hourglass-half', hint: 'دستگاه‌های مانده در انبار' },
 { key: 'returns', label: 'مرجوعی‌ها', icon: 'fa-rotate-left', hint: 'ارزیابی و تعیین تکلیف گوشی‌های بازگشتی' },
 { key: 'insights', label: 'فرصت‌های فروش', icon: 'fa-chart-line', hint: 'اولویت‌های فروش، سود و گردش موجودی' },
];

// ───────────── component
