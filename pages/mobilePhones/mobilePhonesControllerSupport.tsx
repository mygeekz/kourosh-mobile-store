import React, { useMemo, useState } from 'react';
import moment from 'jalali-moment';
import type { PhoneEntry, PhoneHistoryEventClass, PhoneStatus } from '../../types';
import { SearchableSelectField, normalizeSearchableSelectText } from '../../components/ui';
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
 inputId?: string;
 label?: React.ReactNode;
 required?: boolean;
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
 inputId,
 label,
 required = false,
 inputClassName,
 errorText,
 dir = 'rtl',
}) => {
 const [addError, setAddError] = useState<string | null>(null);
 const selectOptions = useMemo(() => (options || [])
  .map((item) => String(item).trim())
  .filter(Boolean)
  .map((item) => ({ value: item, label: item, searchText: item })), [options]);

 return (
  <SearchableSelectField<string>
   value={value || null}
   valueOption={value ? { value, label: value, searchText: value } : null}
   onValueChange={(nextValue) => {
    setAddError(null);
    onChange(nextValue || '');
   }}
   onInputValueChange={(nextValue) => {
    setAddError(null);
    onChange(nextValue);
   }}
   inputValueTakesPrecedence
   options={selectOptions}
   inputId={inputId}
   label={label}
   required={required}
   placeholder={preview}
   ariaLabel={preview || 'جستجو و انتخاب مقدار'}
   dir={dir}
   size="sm"
   controlClassName={inputClassName}
   error={errorText || addError}
   onCreateOption={async (nextValue) => {
    const cleanValue = nextValue.trim();
    if (!cleanValue) return null;
    try {
     setAddError(null);
     if (onAdd) await onAdd(cleanValue);
     return { value: cleanValue, label: cleanValue, searchText: cleanValue };
    } catch (error: any) {
     setAddError(String(error?.message || 'افزودن مورد جدید به لیست انجام نشد.'));
     return null;
    }
   }}
   formatCreateLabel={(nextValue) => `افزودن مورد جدید «${nextValue}»`}
   noOptionsMessage="موردی یافت نشد"
  />
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
