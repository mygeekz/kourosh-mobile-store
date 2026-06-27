// MobilePhones.tsx
import React, { useState, useEffect, FormEvent, ChangeEvent, useMemo, useRef } from 'react';
import moment from 'jalali-moment';
import { useNavigate } from 'react-router-dom';

import {
 PhoneEntry,
 NewPhoneEntryData,
 NotificationMessage,
 PhoneStatus,
 Partner,
 PhoneEntryPayload,
 PhoneEntryUpdatePayload,
 PhoneInventoryEvent,
 PhoneInventoryChangeReport,
 PhoneInventoryExplorerEvent,
 PhoneInventoryEnterpriseReport,
 PhoneInventoryDashboardReport,
 PhoneHistoryEventClass,
} from '../types';
import Notification from '../components/Notification';
import ShamsiDatePicker from '../components/ShamsiDatePicker';
import Modal from '../components/Modal';
import Button from '../components/Button';
import PriceInput from '../components/PriceInput';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import FormErrorSummary from '../components/FormErrorSummary';
import { PHONE_RAM_OPTIONS, PHONE_STORAGE_OPTIONS, PHONE_CONDITIONS, PHONE_STATUSES } from '../constants';
import { formatIsoToShamsi, formatIsoToShamsiDateTime } from '../utils/dateUtils';
import { useAuth } from '../contexts/AuthContext';
import { canManageProducts } from '../utils/rbac';
import { getAuthHeaders } from '../utils/apiUtils';
import { useStyle } from '../contexts/StyleContext';
import { useFeatureFlags } from '../contexts/FeatureFlagsContext';
import { getImportCell, isoToday, isImportBlank, normalizeImportText, parseImportInteger, parseImportNumber, readSpreadsheetRows, ImportSheetRow, exportRoundtripExcel } from '../utils/dataImportExport';
import { focusErrorsSoon, isDuplicateMessage, normalizeNumericInput, toSafeNumber } from '../utils/formBehavior';

// ───────────── helpers
const fromDatePickerToISO_YYYY_MM_DD = (date: Date | null): string | undefined =>
 date ? moment(date).format('YYYY-MM-DD') : undefined;

const norm = (s: string) => s.toLowerCase().trim();
const toFaDigits = (value: string | number) => String(value).replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]);
const roundMoney = (value: number, step = 500000) => Math.max(0, Math.round(value / step) * step);
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const getEventClassMeta = (eventClass: PhoneHistoryEventClass | string) => {
 switch (eventClass) {
 case 'price':
 return { label: 'تغییر قیمت', icon: 'fa-coins', tone: 'sky' };
 case 'status':
 return { label: 'وضعیت', icon: 'fa-arrows-rotate', tone: 'violet' };
 case 'critical':
 return { label: 'رویداد حساس', icon: 'fa-siren-on', tone: 'rose' };
 default:
 return { label: 'ثبت اطلاعات/ویرایش اطلاعات عمومی', icon: 'fa-clipboard-list-check', tone: 'slate' };
 }
};

const eventToneClasses = (tone?: string | null) => tone === 'rose'
 ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300'
 : tone === 'amber'
 ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300'
 : tone === 'violet'
 ? 'bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300'
 : tone === 'sky'
 ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300'
 : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';

type DashboardDrilldown = {
 kind: 'none' | 'staleBucket' | 'model' | 'supplier' | 'missingSale' | 'lossRisk' | 'lowBattery' | 'readyForSale' | 'sellable' | 'pricedInventory' | 'profitableInventory' | 'staleAll';
 value: string;
 label: string;
};


type PricingDecisionAction = 'accepted' | 'overridden' | 'manual';
type PricingBehaviorDecision = {
 id: string;
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

type PricingBehaviorProfile = {
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

type PricingStrategyMode = 'quick' | 'balanced' | 'profit';
type PricingIntelligenceSettings = {
 strategy: PricingStrategyMode;
 targetMarkupPercent: number;
 riskTolerance: number;
 staleDaysThreshold: number;
 roundStep: number;
};

const PRICING_INTELLIGENCE_STORAGE_KEY = 'kourosh.phonePricingIntelligenceSettings.v1';
const DEFAULT_PRICING_INTELLIGENCE_SETTINGS: PricingIntelligenceSettings = {
 strategy: 'balanced',
 targetMarkupPercent: 14,
 riskTolerance: 3,
 staleDaysThreshold: 21,
 roundStep: 500000,
};

const clampPricingSettings = (settings: Partial<PricingIntelligenceSettings>): PricingIntelligenceSettings => ({
 strategy: ['quick', 'balanced', 'profit'].includes(String(settings.strategy)) ? settings.strategy as PricingStrategyMode : DEFAULT_PRICING_INTELLIGENCE_SETTINGS.strategy,
 targetMarkupPercent: clamp(Number(settings.targetMarkupPercent || DEFAULT_PRICING_INTELLIGENCE_SETTINGS.targetMarkupPercent), 6, 30),
 riskTolerance: Math.round(clamp(Number(settings.riskTolerance || DEFAULT_PRICING_INTELLIGENCE_SETTINGS.riskTolerance), 1, 5)),
 staleDaysThreshold: Math.round(clamp(Number(settings.staleDaysThreshold || DEFAULT_PRICING_INTELLIGENCE_SETTINGS.staleDaysThreshold), 7, 90)),
 roundStep: [100000, 250000, 500000, 1000000].includes(Number(settings.roundStep)) ? Number(settings.roundStep) : DEFAULT_PRICING_INTELLIGENCE_SETTINGS.roundStep,
});

const loadPricingIntelligenceSettings = (): PricingIntelligenceSettings => {
 if (typeof window === 'undefined') return DEFAULT_PRICING_INTELLIGENCE_SETTINGS;
 try {
 const raw = window.localStorage.getItem(PRICING_INTELLIGENCE_STORAGE_KEY);
 return raw ? clampPricingSettings(JSON.parse(raw)) : DEFAULT_PRICING_INTELLIGENCE_SETTINGS;
 } catch {
 return DEFAULT_PRICING_INTELLIGENCE_SETTINGS;
 }
};

const persistPricingIntelligenceSettings = (settings: PricingIntelligenceSettings) => {
 if (typeof window === 'undefined') return;
 try {
 window.localStorage.setItem(PRICING_INTELLIGENCE_STORAGE_KEY, JSON.stringify(settings));
 } catch {
 // Pricing settings are optional; engine continues with safe defaults.
 }
};

const pricingStrategyMeta: Record<PricingStrategyMode, { label: string; icon: string; hint: string; markupBias: number; varianceCeiling: number }> = {
 quick: { label: 'فروش سریع', icon: 'fa-bolt', hint: 'برای آزادسازی سرمایه و کاهش خواب کالا', markupBias: -2.2, varianceCeiling: 8 },
 balanced: { label: 'متعادل', icon: 'fa-scale-balanced', hint: 'تعادل بین سرعت فروش و سود سالم', markupBias: 0, varianceCeiling: 12 },
 profit: { label: 'حداکثر سود', icon: 'fa-gem', hint: 'سود بالاتر با پذیرش ریسک کندی فروش', markupBias: 2.8, varianceCeiling: 17 },
};

const PRICING_BEHAVIOR_STORAGE_KEY = 'kourosh.phonePricingBehavior.v1';
const normalizePricingUserKey = (user?: any) => String(user?.id || user?.username || user?.displayName || user?.roleName || 'local-admin');

const loadPricingBehaviorDecisions = (): PricingBehaviorDecision[] => {
 if (typeof window === 'undefined') return [];
 try {
 const raw = window.localStorage.getItem(PRICING_BEHAVIOR_STORAGE_KEY);
 const parsed = raw ? JSON.parse(raw) : [];
 return Array.isArray(parsed) ? parsed.filter((item) => item && item.model && Number(item.purchasePrice) > 0).slice(-250) : [];
 } catch {
 return [];
 }
};

const persistPricingBehaviorDecisions = (items: PricingBehaviorDecision[]) => {
 if (typeof window === 'undefined') return;
 try {
 window.localStorage.setItem(PRICING_BEHAVIOR_STORAGE_KEY, JSON.stringify(items.slice(-250)));
 } catch {
 // localStorage can be blocked; pricing should keep working without persistence.
 }
};

const avg = (items: number[]) => items.length ? items.reduce((sum, item) => sum + item, 0) / items.length : null;

/* اتوکامپلیت قابل افزودن مورد جدید (مدل/رنگ) با ذخیره تغییراتٔ پایدار در سرور */
type AddableAutocompleteProps = {
 value: string;
 onChange: (v: string) => void;
 options: string[];
 onAdd: (name: string) => Promise<void>;
 preview?: string;
 inputClassName?: string;
 errorText?: string | null;
 dir?: 'rtl' | 'ltr';
};
const AddableAutocomplete: React.FC<AddableAutocompleteProps> = ({
 value,
 onChange,
 options,
 onAdd,
 preview,
 inputClassName,
 errorText,
 dir = 'ltr',
}) => {
 const [query, setQuery] = useState(value || '');
 const [open, setOpen] = useState(false);
 const [adding, setAdding] = useState(false);

 useEffect(() => setQuery(value || ''), [value]);

 const filtered = useMemo(() => {
 const q = norm(query);
 if (!q) return (options || []).slice(0, 30);
 return (options || []).filter((m) => norm(String(m)).includes(q)).slice(0, 30);
 }, [options, query]);

 const alreadyExists = (options || []).some((m) => norm(String(m)) === norm(query));
 const canAdd = query.trim().length > 0 && !alreadyExists;

 const selectValue = (v: string) => {
 setQuery(v);
 onChange(v);
 setOpen(false);
 };

 const addAndSelect = async () => {
 const v = query.trim();
 if (!v || !canAdd) return;
 try {
 setAdding(true);
 await onAdd(v);
 selectValue(v);
 } finally {
 setAdding(false);
 }
 };

 return (
 <div className="phone-addable-autocomplete relative" dir="rtl"><div className="pointer-events-none absolute right-3 top-1/2 z-10 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 shadow-[0_10px_22px_-18px_rgba(15,23,42,0.18)] dark:border-slate-700/80 dark:bg-slate-900 dark:text-slate-300"><i className={`fa-solid ${open ? 'fa-chevron-up' : 'fa-chevron-down'} text-[11px]`} /></div><input type="text" dir={dir} value={query} onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 120)} placeholder={preview} className={`${inputClassName ?? ''} pr-12 pl-4 ${dir === 'ltr' ? 'text-left' : 'text-right'} ${dir === 'ltr' ? 'tracking-[0.01em]' : ''}`} autoComplete="off" />
 {open && (
 <div style={{ zIndex: "var(--kourosh-z-popover)" }} className="phone-addable-autocomplete__menu absolute mt-2 w-full overflow-hidden rounded-[24px] border border-slate-200/90 bg-white shadow-[0_28px_65px_-34px_rgba(15,23,42,0.35)] dark:border-slate-700/90 dark:bg-slate-950"><div className="border-b border-slate-100 px-4 py-2.5 text-[11px] font-black tracking-[0.16em] text-slate-500 dark:border-slate-800 dark:text-slate-400">
 انتخاب یا افزودن مورد جدید مقدار
 </div><div className="max-h-60 overflow-auto p-2">
 {filtered.length === 0 && !canAdd && (
 <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-4 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">موردی یافت نشد</div>
 )}
 {filtered.map((m) => (
 <button key={String(m)} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => selectValue(String(m))} className="phone-addable-autocomplete__option block w-full rounded-2xl px-4 py-2.5 text-right text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-900 dark:hover:text-slate-50">
 {String(m)}
 </button>
 ))}
 {canAdd && (
 <button type="button" disabled={adding} onMouseDown={(e) => e.preventDefault()} onClick={addAndSelect} className="mt-2 flex w-full items-center justify-between rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-right text-[13px] font-black text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-60 dark:border-indigo-900/60 dark:bg-indigo-950/30 dark:text-indigo-300 dark:hover:bg-indigo-950/40"><span>{adding ? 'در حال افزودن مورد جدید...' : `افزودن مورد جدید «${query.trim()}»`}</span><span className="inline-flex h-7 w-7 items-center justify-center rounded-xl border border-current/15 bg-white/70 text-[11px] dark:bg-slate-950/60"><i className="fa-solid fa-plus" /></span></button>
 )}
 </div></div>
 )}
 {errorText && <p className="mt-1 text-xs text-red-600">{errorText}</p>}
 </div>
 );
};

// Helper: ساخت payload برای انتخاب خودکار آیتم فروش مطابق انتظار SalesCartPage
const buildPhonePrefillItem = (phone: PhoneEntry) => ({
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

type InventoryWorkspace = 'intake' | 'inventory' | 'stale' | 'returns' | 'insights';
type InventoryViewMode = 'cards' | 'compact' | 'table';
type InventorySortMode = 'newest' | 'oldest' | 'purchaseHigh' | 'purchaseLow' | 'saleHigh' | 'saleLow' | 'marginHigh' | 'staleMost';
type SavedInventoryView = 'all' | 'sellable' | 'missingSale' | 'stale' | 'returns' | 'today';
type DetailsTab = 'overview' | 'timeline' | 'dossier';
type BulkConfirmAction = 'status' | 'supplier' | 'export';

const inventorySellableStatuses: PhoneStatus[] = ['موجود در انبار', 'مرجوعی', 'مرجوعی اقساطی'];

const workspaceMeta: Array<{ key: InventoryWorkspace; label: string; icon: string; hint: string }> = [
 { key: 'intake', label: 'ثبت اطلاعات گوشی', icon: 'fa-plus-circle', hint: 'ورود سریع و حرفه‌ای دستگاه جدید' },
 { key: 'inventory', label: 'موجودی', icon: 'fa-boxes-stacked', hint: 'نمای کامل گوشی‌های ثبت اطلاعات‌شده' },
 { key: 'stale', label: 'راکدها', icon: 'fa-hourglass-half', hint: 'دستگاه‌های مانده در انبار' },
 { key: 'returns', label: 'مرجوعی‌ها', icon: 'fa-rotate-left', hint: 'گوشی‌های بازگشتی و نیازمند تصمیم' },
 { key: 'insights', label: 'تحلیل سریع', icon: 'fa-chart-line', hint: 'خلاصه وضعیت انبار و هشدارها' },
];

// ───────────── component
const MobilePhonesPage: React.FC = () => {
 const navigate = useNavigate();
 const { token, currentUser } = useAuth();
 const canManage = canManageProducts(currentUser?.roleName);
 const { style } = useStyle();
 const brand = `hsl(${style.primaryHue} 90% 55%)`;
 const { isEnabled } = useFeatureFlags();
 const phoneAiPricingSettingsEnabled = isEnabled('ai_pricing') && isEnabled('phone_ai_pricing_settings');
 const phoneAiPriceSignalEnabled = isEnabled('ai_pricing') && isEnabled('phone_ai_price_signal');
 const phoneAiStrategyAdvisorEnabled = isEnabled('ai_pricing') && isEnabled('phone_ai_strategy_advisor');
 const phonePricingBehaviorLearningEnabled = isEnabled('ai_pricing') && isEnabled('phone_pricing_behavior_learning');
 const phoneSmartWarningsEnabled = isEnabled('phone_smart_warnings');
 const phoneInventoryDrilldownEnabled = isEnabled('phone_inventory_drilldown');


 const [phones, setPhones] = useState<PhoneEntry[]>([]);
 const [filteredPhones, setFilteredPhones] = useState<PhoneEntry[]>([]);
 const [searchTerm, setSearchTerm] = useState('');
 const [partners, setPartners] = useState<Partner[]>([]);
 const [phoneModels, setPhoneModels] = useState<string[]>([]);
 const [phoneColors, setPhoneColors] = useState<string[]>([]);

 const initialNewPhoneState: NewPhoneEntryData = {
 model: '',
 color: '',
 storage: PHONE_STORAGE_OPTIONS[0],
 ram: PHONE_RAM_OPTIONS[0],
 imei: '',
 batteryHealth: '',
 condition: PHONE_CONDITIONS[0],
 purchasePrice: '',
 currentPurchasePrice: '',
 salePrice: '',
 status: PHONE_STATUSES[0],
 notes: '',
 supplierId: '',
 };
 const [newPhone, setNewPhone] = useState<NewPhoneEntryData>(initialNewPhoneState);
 const [purchaseDateSelected, setPurchaseDateSelected] = useState<Date | null>(null);
 const [formErrors, setFormErrors] = useState<Partial<Record<keyof NewPhoneEntryData | 'purchaseDate', string>>>({});
 const [pricingBehaviorDecisions, setPricingBehaviorDecisions] = useState<PricingBehaviorDecision[]>(() => loadPricingBehaviorDecisions());
 const [pricingSuggestionApplied, setPricingSuggestionApplied] = useState(false);
 const [pricingIntelligenceSettings, setPricingIntelligenceSettings] = useState<PricingIntelligenceSettings>(() => loadPricingIntelligenceSettings());

 const [isLoading, setIsLoading] = useState(false);
 const [isFetching, setIsFetching] = useState(true);
 const [isFetchingPartners, setIsFetchingPartners] = useState(true);
 const [notification, setNotification] = useState<NotificationMessage | null>(null);
 const [isPhoneImportExportOpen, setIsPhoneImportExportOpen] = useState(false);
 const [phoneImportRows, setPhoneImportRows] = useState<ImportSheetRow[]>([]);
 const [phoneImportFileName, setPhoneImportFileName] = useState('');
 const [phoneImportReport, setPhoneImportReport] = useState<{ created: number; updated: number; skipped: number; errors: string[] } | null>(null);
 const [isImportingPhones, setIsImportingPhones] = useState(false);

 // Edit modal
 const [isEditModalOpen, setIsEditModalOpen] = useState(false);
 const [editEntryContext, setEditEntryContext] = useState<null | 'pricing' | 'status-review'>(null);
 const [editingPhone, setEditingPhone] = useState<Partial<PhoneEntry>>({});
 const [editReadyForSalePulse, setEditReadyForSalePulse] = useState<null | { model: string; from: 'pricing' | 'status-review' }>(null);
 const [editPurchaseDateSelected, setEditPurchaseDateSelected] = useState<Date | null>(null);
 const [editFormErrors, setEditFormErrors] = useState<Partial<Record<keyof PhoneEntryUpdatePayload | 'purchaseDate', string>>>({});
 const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

 // Delete modal
 const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
 const [deletingPhoneId, setDeletingPhoneId] = useState<number | null>(null);
 const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

 // Barcode
 const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
 const [selectedPhoneForBarcode, setSelectedPhoneForBarcode] = useState<PhoneEntry | null>(null);

 // Details drawer
 const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
 const [selectedPhoneForDetails, setSelectedPhoneForDetails] = useState<PhoneEntry | null>(null);
 const [detailsTab, setDetailsTab] = useState<DetailsTab>('overview');
 const [detailsHistory, setDetailsHistory] = useState<PhoneInventoryEvent[]>([]);
 const [isDetailsHistoryLoading, setIsDetailsHistoryLoading] = useState(false);
 const [detailsHistoryError, setDetailsHistoryError] = useState<string | null>(null);
 const [historyReport, setHistoryReport] = useState<PhoneInventoryChangeReport | null>(null);
 const [isHistoryReportLoading, setIsHistoryReportLoading] = useState(false);
 const [enterpriseHistoryReport, setEnterpriseHistoryReport] = useState<PhoneInventoryEnterpriseReport | null>(null);
 const [dashboardReport, setDashboardReport] = useState<PhoneInventoryDashboardReport | null>(null);
 const [historyExplorerEvents, setHistoryExplorerEvents] = useState<PhoneInventoryExplorerEvent[]>([]);
 const [isHistoryExplorerLoading, setIsHistoryExplorerLoading] = useState(false);
 const [historyExplorerFilters, setHistoryExplorerFilters] = useState<{ q: string; eventClass: PhoneHistoryEventClass; model: string; startDate: string; endDate: string }>({ q: '', eventClass: 'all', model: 'all', startDate: '', endDate: '' });
 const [inventoryExplorerDateRange, setInventoryExplorerDateRange] = useState<{ startDate: string; endDate: string }>({ startDate: '', endDate: '' });
 const explorerRef = useRef<HTMLDivElement | null>(null);
 const [shouldFocusExplorer, setShouldFocusExplorer] = useState(false);
 const [dashboardDrilldown, setDashboardDrilldown] = useState<DashboardDrilldown>({ kind: 'none', value: '', label: '' });

 const [selectedPhoneIds, setSelectedPhoneIds] = useState<number[]>([]);
 const [bulkStatusTarget, setBulkStatusTarget] = useState<PhoneStatus | 'all'>('all');
 const [bulkSupplierTarget, setBulkSupplierTarget] = useState<string>('all');
 const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
 const [pendingBulkAction, setPendingBulkAction] = useState<BulkConfirmAction | null>(null);
 const [activeTableMenuId, setActiveTableMenuId] = useState<number | null>(null);
 const [activeCardMenuId, setActiveCardMenuId] = useState<number | null>(null);
 const [isConfirmingBulkAction, setIsConfirmingBulkAction] = useState(false);
 const activeTableMenuRef = useRef<HTMLDivElement | null>(null);

 const [workspace, setWorkspace] = useState<InventoryWorkspace>('inventory');
 const [inventoryViewMode, setInventoryViewMode] = useState<InventoryViewMode>('cards');
 const [sortMode, setSortMode] = useState<InventorySortMode>('newest');
 const [savedView, setSavedView] = useState<SavedInventoryView>('all');
 const [statusFilter, setStatusFilter] = useState<string>('all');
 const [supplierFilter, setSupplierFilter] = useState<string>('all');
 const [modelFilter, setModelFilter] = useState<string>('all');
 const [batteryFilter, setBatteryFilter] = useState<'all' | 'low' | 'good'>('all');

 useEffect(() => {
 if (activeTableMenuId === null) return;
 const handlePointerDown = (event: MouseEvent | TouchEvent) => {
 const target = event.target as Node | null;
 if (target && activeTableMenuRef.current?.contains(target)) return;
 setActiveTableMenuId(null);
 };
 const handleEscape = (event: KeyboardEvent) => {
 if (event.key === 'Escape') setActiveTableMenuId(null);
 };
 document.addEventListener('mousedown', handlePointerDown);
 document.addEventListener('touchstart', handlePointerDown);
 document.addEventListener('keydown', handleEscape);
 return () => {
 document.removeEventListener('mousedown', handlePointerDown);
 document.removeEventListener('touchstart', handlePointerDown);
 document.removeEventListener('keydown', handleEscape);
 };
 }, [activeTableMenuId]);

 // fetchers
 const fetchPhones = async () => {
 if (!token) return;
 setIsFetching(true);
 setNotification(null);
 try {
 const response = await fetch('/api/phones', { headers: getAuthHeaders(token) });
 const result = await response.json();
 if (!response.ok || !result.success) throw new Error(result.message || 'خطا در دریافت لیست گوشی‌ها');
 setPhones(result.data);
 setFilteredPhones(result.data);
 } catch (error: any) {
 setNotification({ type: 'error', text: error.message || 'یک خطا در عملیاتی ناشناخته هنگام دریافت گوشی‌ها رخ داد.' });
 } finally {
 setIsFetching(false);
 }
 };

 const fetchHistoryReport = async (filters = historyExplorerFilters) => {
 if (!token) return;
 setIsHistoryReportLoading(true);
 try {
 const params = buildHistoryQueryParams(filters);
 const response = await fetch(`/api/phones/history-report?${params.toString()}`, { headers: getAuthHeaders(token) });
 const result = await response.json();
 if (!response.ok || !result.success) throw new Error(result.message || 'دریافت گزارش تغییرات عملیات ناموفق بود.');
 setHistoryReport(result.data || null);
 } catch {
 setHistoryReport(null);
 } finally {
 setIsHistoryReportLoading(false);
 }
 };

 const fetchHistoryAnalytics = async (filters = historyExplorerFilters) => {
 if (!token) return;
 try {
 const params = buildHistoryQueryParams(filters);
 const response = await fetch(`/api/phones/history-analytics?${params.toString()}`, { headers: getAuthHeaders(token) });
 const result = await response.json();
 if (!response.ok || !result.success) throw new Error(result.message || 'دریافت گزارش تحلیلی عملیات ناموفق بود.');
 setEnterpriseHistoryReport(result.data || null);
 } catch {
 setEnterpriseHistoryReport(null);
 }
 };

const fetchDashboardReport = async (filters = historyExplorerFilters) => {
 if (!token) return;
 try {
 const params = buildHistoryQueryParams(filters);
 const response = await fetch(`/api/phones/dashboard-report?${params.toString()}`, { headers: getAuthHeaders(token) });
 const result = await response.json();
 if (!response.ok || !result.success) throw new Error(result.message || 'دریافت داشبورد تحلیلی عملیات ناموفق بود.');
 setDashboardReport(result.data || null);
 } catch {
 setDashboardReport(null);
 }
};

 const fetchHistoryExplorer = async (filters = historyExplorerFilters) => {
 if (!token) return;
 setIsHistoryExplorerLoading(true);
 try {
 const params = buildHistoryQueryParams(filters);
 const response = await fetch(`/api/phones/history-explorer?${params.toString()}`, { headers: getAuthHeaders(token) });
 const result = await response.json();
 if (!response.ok || !result.success) throw new Error(result.message || 'دریافت مرور تاریخچه عملیات ناموفق بود.');
 setHistoryExplorerEvents(Array.isArray(result.data) ? result.data : []);
 } catch {
 setHistoryExplorerEvents([]);
 } finally {
 setIsHistoryExplorerLoading(false);
 }
 };

 const fetchPartners = async () => {
 if (!token) return;
 setIsFetchingPartners(true);
 try {
 const response = await fetch('/api/partners?partnerType=Supplier', { headers: getAuthHeaders(token) });
 const result = await response.json();
 if (!response.ok || !result.success) throw new Error(result.message || 'خطا در دریافت تامین‌کنندگان');
 setPartners(result.data.filter((p: Partner) => p.partnerType === 'Supplier'));
 } catch (error: any) {
 setNotification({ type: 'error', text: error.message || 'یک خطا در عملیاتی ناشناخته هنگام دریافت تامین‌کنندگان رخ داد.' });
 } finally {
 setIsFetchingPartners(false);
 }
 };

 const fetchPhoneHistory = async (phoneId: number) => {
 if (!token) return;
 setIsDetailsHistoryLoading(true);
 setDetailsHistoryError(null);
 try {
 const response = await fetch(`/api/phones/${phoneId}/history`, { headers: getAuthHeaders(token) });
 const result = await response.json();
 if (!response.ok || !result.success) throw new Error(result.message || 'خطا در دریافت تاریخچه دستگاه');
 setDetailsHistory(Array.isArray(result.data) ? result.data : []);
 } catch (error: any) {
 setDetailsHistory([]);
 setDetailsHistoryError(error.message || 'دریافت تاریخچه دستگاه عملیات ناموفق بود.');
 } finally {
 setIsDetailsHistoryLoading(false);
 }
 };

 const fetchPhoneMetaLists = async () => {
 if (!token) return;
 try {
 const [mRes, cRes] = await Promise.all([
 fetch('/api/phone-models', { headers: getAuthHeaders(token) }),
 fetch('/api/phone-colors', { headers: getAuthHeaders(token) }),
 ]);
 const mJson = await mRes.json();
 const cJson = await cRes.json();
 if (mRes.ok && mJson?.success) setPhoneModels(Array.isArray(mJson.data) ? mJson.data : []);
 if (cRes.ok && cJson?.success) setPhoneColors(Array.isArray(cJson.data) ? cJson.data : []);
 } catch {
 // بی‌صدا
 }
 };

 const addPhoneModel = async (name: string) => {
 if (!token) return;
 const res = await fetch('/api/phone-models', {
 method: 'POST',
 headers: {...getAuthHeaders(token), 'Content-Type': 'application/json' },
 body: JSON.stringify({ name }),
 });
 const js = await res.json();
 if (!res.ok || !js?.success) throw new Error(js?.message || 'خطا در افزودن مورد جدید مدل');
 setPhoneModels(Array.isArray(js.data) ? js.data : []);
 };

 const addPhoneColor = async (name: string) => {
 if (!token) return;
 const res = await fetch('/api/phone-colors', {
 method: 'POST',
 headers: {...getAuthHeaders(token), 'Content-Type': 'application/json' },
 body: JSON.stringify({ name }),
 });
 const js = await res.json();
 if (!res.ok || !js?.success) throw new Error(js?.message || 'خطا در افزودن مورد جدید رنگ');
 setPhoneColors(Array.isArray(js.data) ? js.data : []);
 };

 useEffect(() => {
 if (token) {
 fetchPhones();
 fetchPartners();
 fetchHistoryReport(historyExplorerFilters);
 fetchHistoryAnalytics(historyExplorerFilters);
 fetchHistoryExplorer(historyExplorerFilters);
 fetchDashboardReport(historyExplorerFilters);
 fetchPhoneMetaLists();
 }
 }, [token]);

 useEffect(() => {
 const lower = searchTerm.toLowerCase().trim();
 if (!lower) { setFilteredPhones(phones); return; }
 const filtered = phones.filter(p =>
 p.model.toLowerCase().includes(lower) ||
 p.imei.toLowerCase().includes(lower) ||
 (p.color && p.color.toLowerCase().includes(lower)) ||
 (p.status && p.status.toLowerCase().includes(lower)) ||
 (p.supplierName && p.supplierName.toLowerCase().includes(lower))
 );
 setFilteredPhones(filtered);
 }, [searchTerm, phones]);

 useEffect(() => {
 if (token && workspace === 'insights') {
 fetchHistoryExplorer(historyExplorerFilters);
 fetchHistoryAnalytics(historyExplorerFilters);
 fetchHistoryReport(historyExplorerFilters);
 fetchDashboardReport(historyExplorerFilters);
 }
 }, [historyExplorerFilters, workspace, token]);

 useEffect(() => {
 if (!shouldFocusExplorer) return;
 const frame = window.requestAnimationFrame(() => {
 explorerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
 setShouldFocusExplorer(false);
 });
 return () => window.cancelAnimationFrame(frame);
 }, [shouldFocusExplorer, workspace, inventoryViewMode, dashboardDrilldown]);
 const focusInventoryExplorer = () => {
 setWorkspace('inventory');
 setInventoryViewMode('table');
 setShouldFocusExplorer(true);
 };

 const focusInsightsWorkspace = () => {
 setWorkspace('insights');
 window.requestAnimationFrame(() => {
 window.scrollTo({ top: 0, behavior: 'smooth' });
 });
 };

 const deriveSelectionDrilldown = (items: PhoneEntry[]): DashboardDrilldown => {
 if (!items.length) return { kind: 'none', value: '', label: '' };
 const allSameModel = items.every((phone) => String(phone.model || '').trim() === String(items[0]?.model || '').trim());
 const allSameSupplier = items.every((phone) => String(phone.supplierName || '').trim() === String(items[0]?.supplierName || '').trim());
 const allReturned = items.every((phone) => String(phone.status || '').includes('مرجوع'));
 const allMissingSale = items.every((phone) => !(Number(phone.salePrice || 0) > 0));
 const allLowBattery = items.every((phone) => Number(phone.batteryHealth || 0) > 0 && Number(phone.batteryHealth || 0) < 80);
 const allReadyForSale = items.every((phone) => inventorySellableStatuses.includes(phone.status) && Number(phone.salePrice || 0) > 0);
 if (allReturned) return { kind: 'none', value: '', label: 'مرجوعی‌های همین عملیات' };
 if (allSameSupplier && String(items[0]?.supplierName || '').trim()) return { kind: 'supplier', value: String(items[0]?.supplierName || '').trim(), label: String(items[0]?.supplierName || '').trim() };
 if (allSameModel && String(items[0]?.model || '').trim()) return { kind: 'model', value: String(items[0]?.model || '').trim(), label: String(items[0]?.model || '').trim() };
 if (allMissingSale) return { kind: 'missingSale', value: 'missing-sale', label: 'بی‌قیمت‌های همین عملیات' };
 if (allLowBattery) return { kind: 'lowBattery', value: 'low-battery', label: 'کم‌باتری‌های همین عملیات' };
 if (allReadyForSale) return { kind: 'readyForSale', value: 'ready-for-sale', label: 'آماده‌فروش‌های همین عملیات' };
 return { kind: 'none', value: '', label: '' };
 };

 const focusPhoneEntity = (phone: PhoneEntry, options?: { detailsTab?: DetailsTab; workspaceMode?: InventoryWorkspace; viewMode?: InventoryViewMode; focusExplorer?: boolean }) => {
 setSelectedPhoneIds([phone.id]);
 if (options?.workspaceMode) setWorkspace(options.workspaceMode);
 if (options?.viewMode) setInventoryViewMode(options.viewMode);
 if (options?.focusExplorer) setShouldFocusExplorer(true);
 window.requestAnimationFrame(() => {
 openDetailsModal(phone);
 if (options?.detailsTab) setDetailsTab(options.detailsTab);
 });
 };

 const focusInventoryResult = (items: PhoneEntry[], preferredDrilldown?: DashboardDrilldown) => {
 if (items.length === 1) {
 focusPhoneEntity(items[0], { detailsTab: 'overview', workspaceMode: 'inventory', viewMode: 'table', focusExplorer: true });
 return;
 }
 setSelectedPhoneIds(items.map((item) => item.id));
 const nextDrilldown = preferredDrilldown && preferredDrilldown.kind !== 'none'
 ? preferredDrilldown
 : deriveSelectionDrilldown(items);
 if (nextDrilldown.kind !== 'none') {
 applyDashboardDrilldown(nextDrilldown);
 } else {
 setWorkspace('inventory');
 setInventoryViewMode('table');
 setShouldFocusExplorer(true);
 }
 };

 const focusHistoryResult = (items: PhoneEntry[], eventClass: PhoneHistoryEventClass = 'audit') => {
 if (items.length === 1) {
 focusPhoneEntity(items[0], { detailsTab: 'timeline', workspaceMode: 'inventory', viewMode: 'table', focusExplorer: true });
 return;
 }
 const firstModel = items.length > 0 ? String(items[0]?.model || '').trim() : '';
 const allSameModel = items.length > 0 && items.every((phone) => String(phone.model || '').trim() === firstModel);
 setWorkspace('insights');
 setHistoryExplorerFilters((prev) => ({...prev,
 eventClass,
 model: allSameModel && firstModel ? firstModel : 'all',
 q: allSameModel && firstModel ? firstModel : prev.q,
 }));
 window.requestAnimationFrame(() => {
 window.scrollTo({ top: 0, behavior: 'smooth' });
 });
 };

 const handleSelectionPresetAction = () => {
 if (!selectionPreset || selectedPhones.length === 0) return;
 if (selectionPreset.kind === 'pricing-workflow') {
 applyDashboardDrilldown({ kind: 'missingSale', value: 'missing-sale', label: 'انتخاب‌های بی‌قیمت' });
 setWorkspace('inventory');
 setInventoryViewMode('table');
 setShouldFocusExplorer(true);
 return;
 }
 if (selectionPreset.kind === 'export-review') {
 setPendingBulkAction('export');
 return;
 }
 if (selectionPreset.kind === 'bulk-status') {
 const nextStatus = selectionPreset.label.includes('مرجوعی') ? 'مرجوعی' : 'موجود در انبار';
 setBulkStatusTarget(nextStatus);
 setNotification({ type: 'success', text: `پریست گروهی روی «${nextStatus}» قرار گرفت.` });
 return;
 }
 setNotification({ type: 'success', text: 'انتخاب فعلی ترکیبی است؛ ابتدا با فیلترها یا درایلدان آن را تفکیک کن.' });
 };

 // utils
 const displayError = (error: any, fallback: string) => {
 let text = fallback;
 if (error?.message) text = error.message;
 setNotification({ type: 'error', text });
 };
 const formatPrice = (price: number | undefined | null) =>
 (price === undefined || price === null) ? '-' : price.toLocaleString('fa-IR') + ' تومان';
 const deletingPhone = phones.find((phone) => phone.id === deletingPhoneId) || null;
 const deletingPhoneSpec = [deletingPhone?.storage, deletingPhone?.ram ? `${deletingPhone.ram} RAM` : null].filter(Boolean).join(' • ');

 const phoneRoundtripColumns = [
 { header: 'شناسه', key: 'id' },
 { header: 'مدل', key: 'model' },
 { header: 'رنگ', key: 'color' },
 { header: 'حافظه', key: 'storage' },
 { header: 'رم', key: 'ram' },
 { header: 'IMEI', key: 'imei' },
 { header: 'سلامت باتری', key: 'batteryHealth' },
 { header: 'وضعیت ظاهری', key: 'condition' },
 { header: 'قیمت خرید', key: 'purchasePrice' },
 { header: 'قیمت خرید روز', key: 'currentPurchasePrice' },
 { header: 'قیمت فروش', key: 'salePrice' },
 { header: 'تامین‌کننده', key: 'supplier' },
 { header: 'فروشنده/ثبت‌کننده', key: 'sellerName' },
 { header: 'تاریخ خرید', key: 'purchaseDate' },
 { header: 'وضعیت', key: 'status' },
 { header: 'یادداشت', key: 'notes' },
 ];

 const phoneRoundtripRows = phones.map((phone) => ({
 id: phone.id,
 model: phone.model || '',
 color: phone.color || '',
 storage: phone.storage || '',
 ram: phone.ram || '',
 imei: phone.imei || '',
 batteryHealth: phone.batteryHealth ?? '',
 condition: phone.condition || '',
 purchasePrice: Number(phone.purchasePrice || 0),
 currentPurchasePrice: Number(phone.currentPurchasePrice || phone.purchasePrice || 0),
 salePrice: phone.salePrice ?? '',
 supplier: phone.supplierName || '',
 sellerName: phone.sellerName || '',
 purchaseDate: phone.purchaseDate || '',
 status: phone.status || '',
 notes: phone.notes || '',
 }));

 const doExportPhonesRoundtrip = () => {
 exportRoundtripExcel(`mobile-phones-roundtrip-${isoToday()}.xlsx`, phoneRoundtripRows, phoneRoundtripColumns, 'Mobile Phones Import Export');
 };

 const doDownloadPhonesTemplate = () => {
 exportRoundtripExcel(
 `mobile-phones-import-template-${isoToday()}.xlsx`,
 [{ id: '', model: 'iPhone 13 Pro', color: 'Graphite', storage: '256GB', ram: '6GB', imei: '356000000000000', batteryHealth: 92, condition: 'در حد نو', purchasePrice: 35000000, currentPurchasePrice: 36000000, salePrice: 39500000, supplier: 'تامین‌کننده نمونه', sellerName: '', purchaseDate: '2026-05-03', status: 'موجود در انبار', notes: '' }],
 phoneRoundtripColumns,
 'Mobile Phones Import Template',
 );
 };

 const normalizePhoneImportDate = (value: unknown) => {
 const text = normalizeImportText(value);
 if (!text) return null;
 const normalized = text.replace(/[.\/]/g, '-');
 if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(normalized)) {
 const [year] = normalized.split('-').map(Number);
 const parsed = year >= 1300 && year < 1700 ? moment.from(normalized, 'fa', 'YYYY-M-D') : moment(normalized, 'YYYY-M-D');
 return parsed.isValid() ? parsed.format('YYYY-MM-DD') : null;
 }
 return text;
 };

 const handlePhoneImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
 const file = event.target.files?.[0];
 if (!file) return;
 try {
 const rows = await readSpreadsheetRows(file);
 setPhoneImportRows(rows);
 setPhoneImportFileName(file.name);
 setPhoneImportReport(null);
 setNotification({ type: 'info', text: `${rows.length.toLocaleString('fa-IR')} ردیف گوشی از فایل خوانده شد. قبل از ثبت، پیش‌نمایش را بررسی کن.` });
 } catch (error) {
 setPhoneImportRows([]);
 setPhoneImportFileName('');
 displayError(error, 'فایل انتخاب‌شده قابل خواندن نیست. فرمت XLSX یا CSV خروجی همین بخش را انتخاب کن.');
 } finally {
 event.target.value = '';
 }
 };

 const ensurePhoneSupplierId = async (name: string, cache: Map<string, number>) => {
 const key = normalizeImportText(name).toLowerCase();
 if (!key || !token) return null;
 if (cache.has(key)) return cache.get(key) ?? null;
 const response = await fetch('/api/partners', {
 method: 'POST',
 headers: { ...getAuthHeaders(token), 'Content-Type': 'application/json' },
 body: JSON.stringify({ partnerName: name, partnerType: 'Supplier' }),
 });
 const result = await response.json();
 if (!response.ok || !result.success) throw new Error(result.message || `خطا در ساخت تامین‌کننده «${name}»`);
 const id = Number(result.data?.id);
 if (id) cache.set(key, id);
 return id || null;
 };

 const runPhonesImport = async () => {
 if (!token) {
 setNotification({ type: 'warning', text: 'برای ایمپورت گوشی ابتدا وارد حساب کاربری شو.' });
 return;
 }
 if (!canManage) {
 setNotification({ type: 'warning', text: 'برای ایمپورت گوشی به دسترسی مدیریت انبار نیاز داری.' });
 return;
 }
 if (phoneImportRows.length === 0) {
 setNotification({ type: 'warning', text: 'ابتدا فایل ایمپورت گوشی را انتخاب کن.' });
 return;
 }

 setIsImportingPhones(true);
 const report = { created: 0, updated: 0, skipped: 0, errors: [] as string[] };
 const supplierCache = new Map<string, number>();
 partners.forEach((sp) => supplierCache.set(normalizeImportText(sp.partnerName).toLowerCase(), sp.id));
 const byId = new Map(phones.map((phone) => [Number(phone.id), phone]));
 const byImei = new Map(phones.map((phone) => [normalizeImportText(phone.imei), phone]));

 for (const row of phoneImportRows) {
 const rowNumber = row.__rowNumber ?? 0;
 try {
 const id = parseImportInteger(getImportCell(row, ['شناسه', 'id', 'phone id']), 0);
 const model = normalizeImportText(getImportCell(row, ['مدل', 'model']));
 const color = normalizeImportText(getImportCell(row, ['رنگ', 'color']));
 const storage = normalizeImportText(getImportCell(row, ['حافظه', 'storage']));
 const ram = normalizeImportText(getImportCell(row, ['رم', 'ram']));
 const imei = normalizeImportText(getImportCell(row, ['imei', 'آی ام ای آی', 'شناسه دستگاه']));
 const batteryHealthRaw = getImportCell(row, ['سلامت باتری', 'battery health', 'batteryHealth']);
 const condition = normalizeImportText(getImportCell(row, ['وضعیت ظاهری', 'condition']));
 const purchasePrice = parseImportNumber(getImportCell(row, ['قیمت خرید', 'purchase price', 'purchasePrice']), 0);
 const currentPurchasePrice = parseImportNumber(getImportCell(row, ['قیمت خرید روز', 'current purchase price', 'currentPurchasePrice']), purchasePrice);
 const salePriceRaw = getImportCell(row, ['قیمت فروش', 'sale price', 'salePrice', 'selling price']);
 const salePrice = isImportBlank(salePriceRaw) ? null : parseImportNumber(salePriceRaw, 0);
 const supplierName = normalizeImportText(getImportCell(row, ['تامین‌کننده', 'تامین کننده', 'supplier']));
 const sellerName = normalizeImportText(getImportCell(row, ['فروشنده/ثبت‌کننده', 'فروشنده', 'ثبت کننده', 'sellerName']));
 const purchaseDate = normalizePhoneImportDate(getImportCell(row, ['تاریخ خرید', 'purchase date', 'purchaseDate']));
 const statusRaw = normalizeImportText(getImportCell(row, ['وضعیت', 'status']));
 const notes = normalizeImportText(getImportCell(row, ['یادداشت', 'notes']));

 if (!model) throw new Error('مدل گوشی خالی است.');
 if (!imei) throw new Error('IMEI خالی است.');
 if (purchasePrice <= 0) throw new Error('قیمت خرید باید بزرگتر از صفر باشد.');
 const batteryHealth = isImportBlank(batteryHealthRaw) ? null : parseImportInteger(batteryHealthRaw, 0);
 if (batteryHealth != null && (batteryHealth < 0 || batteryHealth > 100)) throw new Error('سلامت باتری باید بین ۰ تا ۱۰۰ باشد.');
 const supplierId = isImportBlank(supplierName) ? null : await ensurePhoneSupplierId(supplierName, supplierCache);
 const status = PHONE_STATUSES.includes(statusRaw as PhoneStatus) ? statusRaw : PHONE_STATUSES[0];
 const existing = (id && byId.get(id)) || byImei.get(imei);
 const payload: PhoneEntryPayload | PhoneEntryUpdatePayload = {
 model,
 color: color || null,
 storage: storage || null,
 ram: ram || null,
 imei,
 batteryHealth,
 condition: condition || null,
 purchasePrice,
 currentPurchasePrice: currentPurchasePrice > 0 ? currentPurchasePrice : purchasePrice,
 salePrice,
 sellerName: sellerName || null,
 purchaseDate,
 status,
 notes: notes || null,
 supplierId,
 };
 const response = await fetch(existing ? `/api/phones/${existing.id}` : '/api/phones', {
 method: existing ? 'PUT' : 'POST',
 headers: { ...getAuthHeaders(token), 'Content-Type': 'application/json' },
 body: JSON.stringify(payload),
 });
 const result = await response.json();
 if (!response.ok || !result.success) throw new Error(result.message || 'خطای نامشخص در ثبت گوشی.');
 if (existing) report.updated += 1; else report.created += 1;
 } catch (error: any) {
 report.skipped += 1;
 report.errors.push(`ردیف ${rowNumber.toLocaleString('fa-IR')}: ${error?.message || 'خطای نامشخص'}`);
 }
 }

 setIsImportingPhones(false);
 setPhoneImportReport(report);
 await fetchPhones();
 await fetchPartners();
 await fetchPhoneMetaLists();
 setNotification({
 type: report.errors.length ? 'warning' : 'success',
 text: `ایمپورت گوشی تمام شد: ${report.created.toLocaleString('fa-IR')} جدید، ${report.updated.toLocaleString('fa-IR')} بروزرسانی، ${report.skipped.toLocaleString('fa-IR')} ردشده.`,
 });
 };

 const formatShortPrice = (price: number | undefined | null) => {
 if (price === undefined || price === null || Number.isNaN(Number(price))) return '-';
 const abs = Math.abs(Number(price));
 if (abs >= 1_000_000) {
 const compact = abs >= 10_000_000
 ? Math.round(Number(price) / 1_000_000)
 : Math.round((Number(price) / 1_000_000) * 10) / 10;
 return `${compact.toLocaleString('fa-IR')} میلیون`;
 }
 if (abs >= 1_000) {
 const compact = abs >= 10_000
 ? Math.round(Number(price) / 1_000)
 : Math.round((Number(price) / 1_000) * 10) / 10;
 return `${compact.toLocaleString('fa-IR')}هزار`;
 }
 return Number(price).toLocaleString('fa-IR');
 };

const getPhoneCostBasisAmount = (phone: Pick<PhoneEntry, 'currentPurchasePrice' | 'purchasePrice'> | null | undefined) => {
 const current = Number((phone as any)?.currentPurchasePrice || 0);
 if (Number.isFinite(current) && current > 0) return current;
 const original = Number((phone as any)?.purchasePrice || 0);
 return Number.isFinite(original) ? original : 0;
};

const formatCompactNumber = (value: number | undefined | null) => {
 if (value == null || Number.isNaN(Number(value))) return '-';
 return Number(value).toLocaleString('fa-IR');
};

const isPhoneStaleForAtLeast = (phone: PhoneEntry, minDays: number) => {
 const baseDate = phone.purchaseDate || phone.registerDate;
 return !!baseDate && inventorySellableStatuses.includes(phone.status) && moment().diff(moment(baseDate), 'days') >= minDays;
};

const isPhoneWithinAgeBucket = (phone: PhoneEntry, bucketKey: string) => {
 const baseDate = phone.purchaseDate || phone.registerDate;
 if (!baseDate || !inventorySellableStatuses.includes(phone.status)) return false;
 const age = moment().diff(moment(baseDate), 'days');
 if (bucketKey === 'lt7') return age < 7;
 if (bucketKey === '7to29') return age >= 7 && age <= 29;
 if (bucketKey === '30to59') return age >= 30 && age <= 59;
 if (bucketKey === '60plus') return age >= 60;
 return false;
};

const renderBar = (value: number, max: number, tone: 'violet' | 'sky' | 'amber' | 'emerald' | 'rose' = 'sky') => {
 const width = max > 0 ? `${Math.max(8, Math.round((value / max) * 100))}%` : '8%';
 const toneClass = tone === 'violet'
 ? 'from-violet-500/70 to-fuchsia-400/70'
 : tone === 'amber'
 ? 'from-amber-500/70 to-orange-400/70'
 : tone === 'emerald'
 ? 'from-emerald-500/70 to-teal-400/70'
 : tone === 'rose'
 ? 'from-rose-500/70 to-pink-400/70'
 : 'from-sky-500/70 to-cyan-400/70';
 return (
 <div className="h-2.5 overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800"><div className={`h-full rounded-full bg-gradient-to-r ${toneClass}`} style={{ width }} /></div>
 );
};

 function buildHistoryQueryParams(filters = historyExplorerFilters) {
 const params = new URLSearchParams({ limit: '120' });
 if (filters.startDate) params.set('startDate', filters.startDate);
 if (filters.endDate) params.set('endDate', filters.endDate);
 if (!filters.startDate && !filters.endDate) params.set('days', '30');
 if (filters.q.trim()) params.set('q', filters.q.trim());
 if (filters.eventClass && filters.eventClass !== 'all') params.set('eventClass', filters.eventClass);
 if (filters.model && filters.model !== 'all') params.set('model', filters.model);
 return params;
 }

 const exportHistoryExplorerPrintReport = () => {
 const win = window.open('', '_blank', 'width=1200,height=900');
 if (!win) return;
 const rows = historyExplorerEvents.slice(0, 50).map((event) => {
 const meta = getEventClassMeta(event.eventClass || 'audit');
 return `<tr><td>${event.phoneModel || '-'}</td><td dir="rtl">${event.phoneImei || '-'}</td><td>${meta.label}</td><td>${event.title || '-'}</td><td>${event.actorDisplayName || event.actorUsername || '-'}</td><td>${event.currentStatus || '-'}</td><td>${formatIsoToShamsiDateTime(event.eventDate || event.createdAt)}</td></tr>`;
 }).join('');
 const summary = enterpriseHistoryReport ? `
 <div class="grid"><div class="card"><div class="label">کل رویدادها</div><div class="value">${enterpriseHistoryReport.totalEvents.toLocaleString('fa-IR')}</div></div><div class="card"><div class="label">تغییر قیمت</div><div class="value">${enterpriseHistoryReport.priceChanges.toLocaleString('fa-IR')}</div></div><div class="card"><div class="label">وضعیت</div><div class="value">${enterpriseHistoryReport.statusChanges.toLocaleString('fa-IR')}</div></div><div class="card"><div class="label">رویداد حساس</div><div class="value">${enterpriseHistoryReport.criticalEvents.toLocaleString('fa-IR')}</div></div></div>` : '';
 win.document.write(`<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"/><title>گزارش گردش انبار</title><style>
 body{font-family:Vazir,Tahoma,Arial,sans-serif;padding:24px;color:#0f172a} h1{margin:0 0 8px} p{color:#475569}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:20px 0}.card{border:1px solid #cbd5e1;border-radius:16px;padding:14px}.label{font-size:12px;color:#64748b;margin-bottom:8px}.value{font-weight:700;font-size:20px}
 table{width:100%;border-collapse:collapse;margin-top:16px} th,td{border:1px solid #cbd5e1;padding:10px;text-align:right;font-size:12px;vertical-align:top} th{background:#f8fafc}.meta{margin-top:12px;font-size:12px;color:#475569}
 </style></head><body><h1>گزارش گردش انبار</h1><p>بازه: ${historyExplorerFilters.startDate || '۳۰ روز اخیر'} ${historyExplorerFilters.endDate ? `تا ${historyExplorerFilters.endDate}` : ''}</p>${summary}<table><thead><tr><th>مدل</th><th>IMEI</th><th>کلاس</th><th>عنوان</th><th>کاربر</th><th>وضعیت فعلی</th><th>تاریخ</th></tr></thead><tbody>${rows || '<tr><td colspan="7">داده‌ای برای نمایش وجود ندارد.</td></tr>'}</tbody></table><div class="meta">تاریخ تولید ${formatIsoToShamsiDateTime(new Date().toISOString())}</div></body></html>`);
 win.document.close;
 win.focus;
 setTimeout(() => win.print(), 250);
 };

 // form helpers (unified style)
 const baseInput =
 'ux-input app-form-field inventory-form-control w-full min-h-[2.85rem] rounded-[15px] border border-slate-200/85 bg-white/95 px-3.5 py-2 text-[13px] font-semibold text-slate-900 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.18)] outline-none transition-all duration-200 ' +
 'preview:text-slate-400 hover:border-slate-300 hover:shadow-[0_18px_36px_-24px_rgba(15,23,42,0.24)] dark:border-slate-700/80 dark:bg-slate-950/60 dark:text-slate-100 dark:preview:text-slate-500 dark:hover:border-slate-600 ' +
 '    ';
 const inputClass = (fieldName?: keyof NewPhoneEntryData | 'purchaseDate' | keyof PhoneEntryUpdatePayload, isSelect = false, errorsObj?: any) => {
 const err = (errorsObj || formErrors)[fieldName as any];
 return `${baseInput} ${isSelect ? 'appearance-none bg-[length:0.78rem] pr-11 pl-3' : ''} ${err ? 'border-rose-400   dark:border-rose-500/80  ' : ''}`;
 };
 const labelClass = 'mb-2 flex items-center gap-1.5 text-[10px] font-black tracking-[0.06em] text-slate-600 dark:text-slate-300';
 const phoneFormErrorLabels: Record<string, string> = {
 model: 'مدل گوشی',
 imei: 'IMEI',
 purchasePrice: 'قیمت خرید',
 salePrice: 'قیمت فروش',
 supplierId: 'تامین‌کننده',
 batteryHealth: 'سلامت باتری',
 purchaseDate: 'تاریخ خرید',
 status: 'وضعیت',
 };
 const phoneFormFieldIdMap: Record<string, string> = {
 model: 'model',
 imei: 'imei',
 purchasePrice: 'purchasePrice',
 salePrice: 'salePrice',
 supplierId: 'supplierId',
 batteryHealth: 'batteryHealth',
 purchaseDate: 'purchaseDate',
 status: 'status',
 };
 const hasPhoneFormErrors = Object.values(formErrors).some(Boolean);

 // validate + handlers
 const validateForm = (data: NewPhoneEntryData | PhoneEntryUpdatePayload, isEdit = false): boolean => {
 const errors: Record<string, string> = {};
 if (!data.model?.trim() && !isEdit) errors.model = 'مدل الزامی است.';
 if (data.model && data.model.trim() === '') errors.model = 'مدل نمی‌تواند خالی باشد.';

 if (!data.imei?.trim() && !isEdit) errors.imei = 'IMEI الزامی است.';
 else if (data.imei && !/^\d{15,16}$/.test(data.imei.trim())) errors.imei = 'IMEI باید ۱۵ یا ۱۶ رقم باشد.';

 const purchasePriceStr = String(data.purchasePrice ?? '');
 if ((!purchasePriceStr.trim() && !isEdit) ||
 (purchasePriceStr.trim() && (!Number.isFinite(toSafeNumber(purchasePriceStr, NaN)) || toSafeNumber(purchasePriceStr, NaN) < 0))) {
 errors.purchasePrice = 'قیمت خرید باید عددی غیرمنفی باشد.';
 } else if (toSafeNumber(purchasePriceStr) > 0 && !(data as any).supplierId) {
 errors.supplierId = 'برای ثبت اطلاعات قیمت خرید، انتخاب تامین‌کننده الزامی است.';
 }

 const currentPurchasePriceStr = String((data as any).currentPurchasePrice ?? '');
 if (currentPurchasePriceStr.trim() && (!Number.isFinite(toSafeNumber(currentPurchasePriceStr, NaN)) || toSafeNumber(currentPurchasePriceStr, NaN) < 0)) {
 errors.currentPurchasePrice = 'قیمت خرید روز باید عددی غیرمنفی باشد.';
 }

 const salePriceStr = String(data.salePrice ?? '');
 if (salePriceStr.trim() && (!Number.isFinite(toSafeNumber(salePriceStr, NaN)) || toSafeNumber(salePriceStr, NaN) < 0)) {
 errors.salePrice = 'قیمت فروش (در صورت وجود) باید عددی غیرمنفی باشد.';
 }

 const batteryHealthStr = String((data as any).batteryHealth ?? '');
 if (batteryHealthStr.trim() && (!Number.isFinite(toSafeNumber(batteryHealthStr, NaN)) ||
 toSafeNumber(batteryHealthStr, NaN) < 0 || toSafeNumber(batteryHealthStr, NaN) > 100)) {
 errors.batteryHealth = 'سلامت باتری باید عددی بین ۰ تا ۱۰۰ باشد.';
 }
 if (!(data as any).status && !isEdit) errors.status = 'وضعیت الزامی است.';

 if (isEdit) {
 setEditFormErrors(errors);
 focusErrorsSoon(errors as any);
 } else {
 setFormErrors(errors);
 focusErrorsSoon(errors as any, phoneFormFieldIdMap);
 }
 return Object.keys(errors).length === 0;
 };

 const handleInputChange = (
 e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> |
 { target: { name: string; value: string } }
 ) => {
 const { name, value } = e.target;
 setNewPhone(prev => ({...prev, [name]: value }));
 if (name === 'salePrice') setPricingSuggestionApplied(false);
 if (formErrors[name as keyof NewPhoneEntryData]) setFormErrors(prev => ({...prev, [name]: undefined }));
 };

 const handleSubmit = async (e: FormEvent) => {
 e.preventDefault();
 if (isLoading) return;
 if (!validateForm(newPhone) || !token) return;
 setIsLoading(true); setNotification(null);

 const payload: PhoneEntryPayload = {
 model: newPhone.model,
 color: newPhone.color || undefined,
 storage: newPhone.storage || undefined,
 ram: newPhone.ram || undefined,
 imei: newPhone.imei,
 batteryHealth: newPhone.batteryHealth ? Math.round(toSafeNumber(newPhone.batteryHealth)) : undefined,
 condition: newPhone.condition || undefined,
 purchasePrice: toSafeNumber(newPhone.purchasePrice),
 salePrice: newPhone.salePrice ? toSafeNumber(newPhone.salePrice) : undefined,
 sellerName: (newPhone as any).sellerName || undefined,
 purchaseDate: fromDatePickerToISO_YYYY_MM_DD(purchaseDateSelected),
 saleDate: undefined,
 status: newPhone.status || PHONE_STATUSES[0],
 notes: newPhone.notes || undefined,
 supplierId: newPhone.supplierId ? parseInt(String(newPhone.supplierId), 10) : null,
 registerDate: new Date().toISOString(),
 };

 try {
 const response = await fetch('/api/phones', { method: 'POST', headers: getAuthHeaders(token), body: JSON.stringify(payload) });
 const result = await response.json();
 if (!response.ok || !result.success) throw new Error(result.message || 'خطا در افزودن مورد جدید گوشی');
 const finalSale = Number(payload.salePrice || 0);
 if (payload.purchasePrice > 0 && finalSale > 0) {
 const finalMarkup = ((finalSale - payload.purchasePrice) / payload.purchasePrice) * 100;
 const suggestedSale = Number(intakePriceSignal.suggestedSale || 0);
 const suggestionDelta = suggestedSale > 0 ? Math.abs(finalSale - suggestedSale) / suggestedSale : 1;
 const decision: PricingBehaviorDecision = {
 id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
 userKey: normalizePricingUserKey(currentUser),
 model: norm(payload.model || ''),
 condition: payload.condition || null,
 purchasePrice: payload.purchasePrice,
 suggestedSale,
 finalSale,
 markupPercent: finalMarkup,
 suggestedMarkupPercent: intakePriceSignal.markupPercent,
 action: pricingSuggestionApplied && suggestionDelta <= 0.015 ? 'accepted' : suggestionDelta > 0.04 ? 'overridden' : 'manual',
 createdAt: new Date().toISOString(),
 };
 setPricingBehaviorDecisions((prev) => {
 const next = [...prev, decision].slice(-250);
 persistPricingBehaviorDecisions(next);
 return next;
 });
 }
 setPricingSuggestionApplied(false);
 setNewPhone(initialNewPhoneState);
 setPurchaseDateSelected(null);
 setFormErrors({});
 setNotification({ type: 'success', text: 'گوشی با موفقیت اضافه شد!' });
 await fetchPhones();
 } catch (error: any) {
 const msg = error.message || 'یک خطا در عملیاتی ناشناخته هنگام افزودن مورد جدید گوشی رخ داد.';
 setNotification({ type: 'error', text: msg });
 if (msg.includes('IMEI') || isDuplicateMessage(msg)) { const imeiError = 'این شماره IMEI قبلا ثبت اطلاعات شده است.'; setFormErrors(prev => ({...prev, imei: imeiError })); focusErrorsSoon({ imei: imeiError } as any, phoneFormFieldIdMap); }
 } finally {
 setIsLoading(false);
 }
 };

 // edit
 const openEditModal = (phone: PhoneEntry, context: null | 'pricing' | 'status-review' = null) => {
 setEditingPhone({
 ...phone,
 currentPurchasePrice: Number(phone.currentPurchasePrice || 0) > 0 ? phone.currentPurchasePrice : phone.purchasePrice,
 });
 setEditEntryContext(context);
 setEditPurchaseDateSelected(phone.purchaseDate ? moment(phone.purchaseDate, 'YYYY-MM-DD').toDate() : null);
 setEditFormErrors({});
 setIsEditModalOpen(true);
 };

 useEffect(() => {
 if (!isEditModalOpen || !editEntryContext) return;

 const focusTarget = () => {
 const selector = editEntryContext === 'pricing'
 ? '#edit-sale-price-input, input[name="salePrice"]'
 : '#edit-status-select, select[name="status"]';
 const target = document.querySelector<HTMLElement>(selector);
 if (!target) return;
 target.focus({ preventScroll: true });
 if (target instanceof HTMLInputElement && editEntryContext === 'pricing') {
 const len = target.value?.length ?? 0;
 try { target.setSelectionRange(len, len); } catch {}
 }
 target.scrollIntoView({ block: 'center', behavior: 'smooth' });
 };

 const raf = window.requestAnimationFrame(() => {
 window.setTimeout(focusTarget, 30);
 });

 return () => window.cancelAnimationFrame(raf);
 }, [isEditModalOpen, editEntryContext]);
 const handleEditInputChange = (
 e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> |
 { target: { name: string; value: string } }
 ) => {
 const { name, value } = e.target;
 setEditingPhone(prev => ({...prev, [name]: value }));
 if (editFormErrors[name as keyof PhoneEntryUpdatePayload]) setEditFormErrors(prev => ({...prev, [name]: undefined }));
 };
 const handleEditSubmit = async (e: FormEvent) => {
 e.preventDefault();
 if (isSubmittingEdit) return;
 if (!editingPhone.id || !validateForm(editingPhone as PhoneEntryUpdatePayload, true) || !token) return;
 setIsSubmittingEdit(true); setNotification(null);

 const payload: PhoneEntryUpdatePayload = {
 model: editingPhone.model,
 color: editingPhone.color,
 storage: editingPhone.storage,
 ram: editingPhone.ram,
 imei: editingPhone.imei,
 batteryHealth: editingPhone.batteryHealth ? String(Math.round(toSafeNumber(editingPhone.batteryHealth))) : undefined,
 condition: editingPhone.condition,
 purchasePrice: editingPhone.purchasePrice ? normalizeNumericInput(editingPhone.purchasePrice) : undefined,
 currentPurchasePrice: String(editingPhone.currentPurchasePrice ?? '').trim() ? normalizeNumericInput(editingPhone.currentPurchasePrice as any) : undefined,
 salePrice: editingPhone.salePrice ? normalizeNumericInput(editingPhone.salePrice) : undefined,
 sellerName: editingPhone.sellerName,
 purchaseDate: fromDatePickerToISO_YYYY_MM_DD(editPurchaseDateSelected),
 status: editingPhone.status,
 notes: editingPhone.notes,
 supplierId: editingPhone.supplierId ? String(editingPhone.supplierId) : undefined,
 };

 try {
 const response = await fetch(`/api/phones/${editingPhone.id}`, { method: 'PUT', headers: getAuthHeaders(token), body: JSON.stringify(payload) });
 const result = await response.json();
 if (!response.ok || !result.success) throw new Error(result.message || 'خطا در به‌روزرسانی گوشی');

 const updatedPhoneForSell = {...editingPhone,...payload,
 id: editingPhone.id,
 salePrice: payload.salePrice ? Number(payload.salePrice) : Number(editingPhone.salePrice || 0),
 purchasePrice: payload.purchasePrice ? Number(payload.purchasePrice) : Number(editingPhone.purchasePrice || 0),
 currentPurchasePrice: payload.currentPurchasePrice ? Number(payload.currentPurchasePrice) : Number(editingPhone.currentPurchasePrice || editingPhone.purchasePrice || 0),
 supplierId: payload.supplierId ? Number(payload.supplierId) : editingPhone.supplierId,
 batteryHealth: payload.batteryHealth ? Number(payload.batteryHealth) : (editingPhone.batteryHealth as any),
 purchaseDate: payload.purchaseDate || editingPhone.purchaseDate,
 status: payload.status || editingPhone.status,
 } as PhoneEntry;
 const sellAvailabilityAfterEdit = getSellAvailability(updatedPhoneForSell);
 const shouldOfferSellCta =
 (editEntryContext === 'pricing' || editEntryContext === 'status-review') &&
 sellAvailabilityAfterEdit.canSell;

 setNotification({
 type: 'success',
 title: shouldOfferSellCta ? 'مسیر فروش باز شد' : undefined,
 text: result.message || 'گوشی به‌روزرسانی شد.',
 detail: shouldOfferSellCta ? 'مانع فروش این دستگاه برطرف شد و الان می‌توانی مستقیم وارد ثبت اطلاعات فروشش شوی.' : undefined,
 nextStep: shouldOfferSellCta ? 'اگر آماده‌ای، از همین اعلان وارد فروش همان دستگاه شو.' : undefined,
 badges: shouldOfferSellCta ? ['آماده فروش', updatedPhoneForSell.model] : undefined,
 actionLabel: shouldOfferSellCta ? 'رفتن به فروش همین دستگاه' : undefined,
 actionIcon: shouldOfferSellCta ? 'fas fa-cash-register' : undefined,
 actionVariant: shouldOfferSellCta ? 'primary' : undefined,
 onAction: shouldOfferSellCta ? (() => handleSellPhone(updatedPhoneForSell, editEntryContext || undefined)) : undefined,
 feedActionLabel: shouldOfferSellCta ? 'فروش همین دستگاه' : undefined,
 onFeedAction: shouldOfferSellCta ? (() => handleSellPhone(updatedPhoneForSell, editEntryContext || undefined)) : undefined,
 });
 if (shouldOfferSellCta && editEntryContext) {
 setEditReadyForSalePulse({ model: updatedPhoneForSell.model, from: editEntryContext });
 }
 await fetchPhones();
 if (shouldOfferSellCta) {
 window.setTimeout(() => {
 setEditReadyForSalePulse(null);
 setIsEditModalOpen(false);
 setEditEntryContext(null);
 setEditingPhone({});
 }, 1200);
 } else {
 setIsEditModalOpen(false);
 setEditEntryContext(null);
 setEditingPhone({});
 }
 } catch (error: any) {
 const msg = error.message || 'یک خطا در عملیاتی ناشناخته رخ داد.';
 setNotification({ type: 'error', text: msg });
 if (msg.includes('IMEI') || isDuplicateMessage(msg)) { const imeiError = 'این IMEI برای گوشی دیگری ثبت اطلاعات شده است.'; setEditFormErrors(prev => ({...prev, imei: imeiError })); focusErrorsSoon({ imei: imeiError } as any); }
 } finally {
 setIsSubmittingEdit(false);
 }
 };

 // delete
 const openDeleteModal = (id: number) => { setDeletingPhoneId(id); setIsDeleteModalOpen(true); };
 const handleConfirmDelete = async () => {
 if (!canManage) { setNotification({ type: 'error', text: 'شما دسترسی حذف مورد گوشی را ندارید.' }); return; }

 if (!deletingPhoneId || !token) return;
 setIsSubmittingDelete(true);
 try {
 const response = await fetch(`/api/phones/${deletingPhoneId}`, { method: 'DELETE', headers: getAuthHeaders(token) });
 const result = await response.json();
 if (!response.ok || !result.success) throw new Error(result.message || 'خطا در حذف مورد گوشی');
 setNotification({ type: 'success', text: result.message || 'حذف مورد شد.' });
 setIsDeleteModalOpen(false);
 setDeletingPhoneId(null);
 await fetchPhones();
 } catch (error) {
 displayError(error, 'خطا در حذف مورد گوشی.');
 } finally {
 setIsSubmittingDelete(false);
 }
 };

 // sell + barcode
 const handleSellPhone = (phone: PhoneEntry, saleEntrySource?: 'pricing' | 'status-review') => {
 // امکان فروش برای گوشی‌هایی که یا در انبار موجود هستند یا از فروش اقساطی مرجوع شده‌اند.
 // در غیر این صورت هشداری به کاربر نمایش داده می‌شود.
 if (phone.status !== 'موجود در انبار' && phone.status !== 'مرجوعی اقساطی' && phone.status !== 'مرجوعی') {
 setNotification({ type: 'warning', text: `گوشی در وضعیت "${phone.status}" است و قابل فروش نیست.` });
 return;
 }
 if (!phone.salePrice || phone.salePrice <= 0) {
 setNotification({ type: 'warning', text: 'قیمت فروش برای این گوشی مشخص نشده.' });
 return;
 }

 const prefillItem = buildPhonePrefillItem(phone);
 navigate('/sales', { state: { prefillItem, saleEntrySource }, replace: false });
 };

 function getSellAvailability(phone: PhoneEntry) {
 if (phone.status !== 'موجود در انبار' && phone.status !== 'مرجوعی اقساطی' && phone.status !== 'مرجوعی') {
 return { canSell: false, hint: 'نیاز به بازبینی وضعیت' };
 }
 if (!phone.salePrice || Number(phone.salePrice) <= 0) {
 return { canSell: false, hint: 'اول قیمت‌گذاری کن' };
 }
 return { canSell: true, hint: 'آماده فروش' };
 }

 const openBarcodeModal = (p: PhoneEntry) => { setSelectedPhoneForBarcode(p); setIsBarcodeModalOpen(true); };
 function openDetailsModal(phone: PhoneEntry) { setSelectedPhoneForDetails(phone); setDetailsTab('overview'); setIsDetailsModalOpen(true); setDetailsHistory([]); setDetailsHistoryError(null); void fetchPhoneHistory(phone.id); }

 // Helper declarations are intentionally hoisted above heavy memo/render blocks to avoid TDZ crashes in this large module.

 function getPhoneAgeDays(phone: PhoneEntry) {
 return phone.purchaseDate || phone.registerDate ? moment().diff(moment(phone.purchaseDate || phone.registerDate), 'days') : null;
 }

 function getPhoneOperationalFlags(phone: PhoneEntry) {
 const flags: Array<{ label: string; tone: string; icon: string }> = [];
 const ageDays = getPhoneAgeDays(phone);
 if (ageDays !== null && ageDays >= 45 && inventorySellableStatuses.includes(phone.status)) {
 flags.push({ label: ageDays >= 60 ? 'فروش فوری' : 'راکد', tone: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300', icon: 'fa-hourglass-half' });
 }
 if (Number(phone.salePrice || 0) > 0 && Number(phone.salePrice || 0) <= Number(phone.purchasePrice || 0)) {
 flags.push({ label: 'سود ضعیف', tone: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300', icon: 'fa-triangle-exclamation' });
 }
 if (!(Number(phone.salePrice || 0) > 0) && inventorySellableStatuses.includes(phone.status)) {
 flags.push({ label: 'بی‌قیمت', tone: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-300', icon: 'fa-tags' });
 }
 if (Number(phone.batteryHealth || 0) > 0 && Number(phone.batteryHealth || 0) < 80) {
 flags.push({ label: 'باتری ضعیف', tone: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300', icon: 'fa-battery-quarter' });
 }
 return flags.slice(0, 3);
 }

 function getPhoneTimeline(phone: PhoneEntry) {
 const events: Array<{ key: string; title: string; date: string | null; icon: string; tone: string; description: string }> = [];

 events.push({
 key: 'registered',
 title: 'ثبت اطلاعات در انبار',
 date: phone.registerDate,
 icon: 'fa-box-archive',
 tone: 'slate',
 description: `ورود دستگاه به سیستم با وضعیت «${phone.status}».`,
 });

 if (phone.purchaseDate) {
 events.push({
 key: 'purchase',
 title: 'ورود از تامین',
 date: phone.purchaseDate,
 icon: 'fa-truck-ramp-box',
 tone: 'sky',
 description: `${phone.supplierName ? `تامین‌کننده: ${phone.supplierName}` : 'تامین‌کننده ثبت اطلاعات نشده'}${(Number(phone.currentPurchasePrice || 0) > 0 || Number(phone.purchasePrice || 0) > 0) ? ` • مبنای بها: ${formatPrice(Number(phone.currentPurchasePrice || 0) > 0 ? Number(phone.currentPurchasePrice || 0) : Number(phone.purchasePrice || 0))}` : ''}` ,
 });
 }

 if (phone.salePrice && phone.salePrice > 0) {
 events.push({
 key: 'pricing',
 title: 'قیمت‌گذاری برای فروش',
 date: phone.purchaseDate || phone.registerDate,
 icon: 'fa-tags',
 tone: 'emerald',
 description: `قیمت فروش ثبت اطلاعات‌شده: ${formatPrice(phone.salePrice)}${getPhoneCostBasisAmount(phone) ? ` • سود بالقوه: ${formatPrice(Number(phone.salePrice) - getPhoneCostBasisAmount(phone))}` : ''}`,
 });
 }

 if (phone.saleDate || phone.status === 'فروخته شده' || phone.status === 'فروخته شده (قسطی)') {
 events.push({
 key: 'sale',
 title: phone.status === 'فروخته شده (قسطی)' ? 'خروج از انبار - فروش اقساطی' : 'خروج از انبار - فروش',
 date: phone.saleDate || phone.registerDate,
 icon: phone.status === 'فروخته شده (قسطی)' ? 'fa-file-invoice-dollar' : 'fa-cash-register',
 tone: 'violet',
 description: `${phone.buyerName ? `خریدار: ${phone.buyerName}` : 'خریدار ثبت اطلاعات نشده'}${phone.salePrice ? ` • مبلغ فروش: ${formatPrice(phone.salePrice)}` : ''}`,
 });
 }

 if (phone.returnDate || phone.status === 'مرجوعی' || phone.status === 'مرجوعی اقساطی') {
 events.push({
 key: 'return',
 title: 'بازگشت به انبار',
 date: phone.returnDate || phone.registerDate,
 icon: 'fa-rotate-left',
 tone: 'amber',
 description: phone.status === 'مرجوعی اقساطی' ? 'این دستگاه از جریان فروش اقساطی به انبار برگشته و نیازمند تصمیم عملیاتی است.' : 'این دستگاه در وضعیت مرجوعی قرار دارد و باید درباره قیمت‌گذاری یا فروش مجدد آن تصمیم‌گیری شود.',
 });
 }

 if (phone.batteryHealth !== null && phone.batteryHealth !== undefined) {
 events.push({
 key: 'battery',
 title: 'ثبت اطلاعات سلامت باتری',
 date: phone.registerDate,
 icon: 'fa-battery-three-quarters',
 tone: Number(phone.batteryHealth) >= 85 ? 'emerald' : Number(phone.batteryHealth) > 75 ? 'amber' : 'rose',
 description: `${Number(phone.batteryHealth) < 70 ? 'وضعیت باتری بحرانی' : Number(phone.batteryHealth) <= 75 ? 'باتری تعویض باید بشود' : 'سلامت باتری در زمان ثبت اطلاعات'}: ${Number(phone.batteryHealth).toLocaleString('fa-IR')}٪`,
 });
 }

 return events.sort((a, b) => {
 const aTime = a.date ? moment(a.date, ['YYYY-MM-DD', moment.ISO_8601], true).valueOf() : 0;
 const bTime = b.date ? moment(b.date, ['YYYY-MM-DD', moment.ISO_8601], true).valueOf() : 0;
 return bTime - aTime;
 });
 }

 function formatHistoryDiffValue(value: any, kind?: string) {
 if (value === null || value === undefined || value === '') return '—';
 if (kind === 'money') return formatPrice(Number(value || 0));
 if (kind === 'percent') return `${Number(value).toLocaleString('fa-IR')}٪`;
 return String(value);
 }

 const historyReportCards = useMemo(() => historyReport ? [
 { key: 'events', label: 'کل تغییرات ۳۰ روز', value: historyReport.totalEvents.toLocaleString('fa-IR'), icon: 'fa-timeline', tone: 'slate', hint: 'تمام رویدادهای ثبت اطلاعات‌شده برای دستگاه‌ها' },
 { key: 'status', label: 'وضعیت', value: historyReport.statusChanges.toLocaleString('fa-IR'), icon: 'fa-arrows-rotate', tone: 'violet', hint: 'جابجایی بین وضعیت‌های عملیاتی' },
 { key: 'price', label: 'دست‌کاری قیمت', value: historyReport.priceChanges.toLocaleString('fa-IR'), icon: 'fa-coins', tone: 'sky', hint: 'تغییر بهای خرید یا قیمت فروش' },
 { key: 'critical', label: 'رویداد حساس', value: historyReport.criticalEvents.toLocaleString('fa-IR'), icon: 'fa-siren-on', tone: 'rose', hint: 'حذف مورد، بازگشت یا رویدادهای نیازمند توجه' },
 ] : [], [historyReport]);

 const historyExplorerClassOptions: Array<{ key: PhoneHistoryEventClass; label: string; icon: string }> = [
 { key: 'all', label: 'همه رویدادها', icon: 'fa-layer-group' },
 { key: 'price', label: 'قیمت', icon: 'fa-coins' },
 { key: 'status', label: 'وضعیت', icon: 'fa-arrows-rotate' },
 { key: 'critical', label: 'حساس', icon: 'fa-siren-on' },
 { key: 'audit', label: 'عمومی', icon: 'fa-clipboard-list-check' },
 ];

 const exportHistoryExplorerCsv = () => {
 const rows = historyExplorerEvents.map((event) => {
 const meta = getEventClassMeta(event.eventClass || 'audit');
 return [
 event.phoneModel || '',
 event.phoneImei || '',
 meta.label,
 event.title || '',
 event.description || '',
 event.actorDisplayName || event.actorUsername || '',
 event.currentStatus || '',
 event.eventDate || event.createdAt || '',
 ];
 });
 const csv = ['﻿مدل,IMEI,کلاس رویداد,عنوان,توضیح,کاربر,وضعیت فعلی,تاریخ',...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');
 const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url;
 a.download = `phone-history-log-${moment.format('YYYYMMDD-HHmm')}.csv`;
 document.body.appendChild(a);
 a.click;
 document.body.removeChild(a);
 URL.revokeObjectURL(url);
 };

 const backendHistoryTimeline = useMemo(() => detailsHistory.map((event) => ({
 key: `${event.eventType}-${event.id}`,
 title: event.title,
 date: event.eventDate || event.createdAt,
 icon: event.icon || 'fa-clock-rotate-left',
 tone: event.tone || 'slate',
 description: event.description || 'بدون توضیح تکمیلی',
 diffs: Array.isArray(event.metadata?.fieldDiffs) ? event.metadata.fieldDiffs : [],
 meta: [
 event.actorDisplayName ? `ثبت اطلاعات‌کننده: ${event.actorDisplayName}` : event.actorUsername ? `کاربر: ${event.actorUsername}` : '',
 event.eventType === 'updated' && Array.isArray(event.metadata?.changes) && event.metadata.changes.length > 0 ? `خلاصه تغییر: ${event.metadata.changes.join(' • ')}` : '',
 ].filter(Boolean).join(' • '),
 })), [detailsHistory]);

 const detailTimeline = useMemo(() => (backendHistoryTimeline.length > 0 ? backendHistoryTimeline : (selectedPhoneForDetails ? getPhoneTimeline(selectedPhoneForDetails) : [])), [backendHistoryTimeline, selectedPhoneForDetails]);
 const detailProfit = useMemo(() => selectedPhoneForDetails ? Number(selectedPhoneForDetails.salePrice || 0) - getPhoneCostBasisAmount(selectedPhoneForDetails) : 0, [selectedPhoneForDetails]);
 const detailRealProfit = useMemo(() => selectedPhoneForDetails ? Number(selectedPhoneForDetails.salePrice || 0) - Number((selectedPhoneForDetails as any).currentPurchasePrice || selectedPhoneForDetails.purchasePrice || 0) : 0, [selectedPhoneForDetails]);
 const detailAge = useMemo(() => selectedPhoneForDetails ? getPhoneAgeDays(selectedPhoneForDetails) : null, [selectedPhoneForDetails]);
 const detailHistorySummary = useMemo(() => ({
 count: detailsHistory.length,
 lacheck: detailsHistory[0] || null,
 priceTouches: detailsHistory.filter((event) => event.oldPurchasePrice != null || event.newPurchasePrice != null || event.oldSalePrice != null || event.newSalePrice != null).length,
 statusTouches: detailsHistory.filter((event) => (event.oldStatus || null) !== (event.newStatus || null) && (event.oldStatus || event.newStatus)).length,
 }), [detailsHistory]);

 /**
 * اطلاعات مربوط به نشان (badge) وضعیت گوشی.
 * شامل کلاس‌های رنگ و آیکون مناسب برای هر وضعیت.
 */
 const statusBadgeInfo = (status: PhoneStatus): { bgClass: string; icon: string } => {
 switch (status) {
 case 'موجود در انبار':
 return {
 bgClass: 'border border-emerald-200 bg-emerald-50/85 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-300',
 icon: 'fa-box-open',
 };
 case 'فروخته شده':
 return {
 bgClass: 'border border-rose-200 bg-rose-50/85 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/25 dark:text-rose-300',
 icon: 'fa-check-circle',
 };
 case 'فروخته شده (قسطی)':
 return {
 bgClass: 'border border-rose-200 bg-rose-50/80 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/20 dark:text-rose-300',
 icon: 'fa-file-invoice-dollar',
 };
 case 'مرجوعی':
 return {
 bgClass: 'border border-amber-200 bg-amber-50 text-amber-800 shadow-[0_8px_18px_-16px_rgba(245,158,11,0.75)] dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300',
 icon: 'fa-rotate-left',
 };
 case 'مرجوعی اقساطی':
 return {
 bgClass: 'border border-rose-200 bg-rose-50 text-rose-800 shadow-[0_8px_18px_-16px_rgba(244,63,94,0.75)] dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300',
 icon: 'fa-rotate-left',
 };
 default:
 return {
 bgClass: 'border border-slate-200 bg-slate-50/85 text-slate-600 dark:border-slate-700/80 dark:bg-slate-900/65 dark:text-slate-300',
 icon: 'fa-circle-question',
 };
 }
 };

 const inventoryMetrics = useMemo(() => {
 const sellable = phones.filter((phone) => inventorySellableStatuses.includes(phone.status));
 const returns = phones.filter((phone) => phone.status === 'مرجوعی' || phone.status === 'مرجوعی اقساطی');
 const withoutSalePrice = sellable.filter((phone) => !(Number(phone.salePrice) > 0));
 const totalPurchaseValue = sellable.reduce((sum, phone) => sum + getPhoneCostBasisAmount(phone), 0);
 const totalSaleValue = sellable.reduce((sum, phone) => sum + Number(phone.salePrice || 0), 0);
 const potentialProfit = totalSaleValue - totalPurchaseValue;
 const stalePhones = sellable.filter((phone) => {
 const baseDate = phone.purchaseDate || phone.registerDate;
 return baseDate ? moment().diff(moment(baseDate), 'days') >= 30 : false;
 });
 const todayEntries = phones.filter((phone) => moment(phone.registerDate).isSame(moment(), 'day')).length;
 return { sellable, returns, withoutSalePrice, totalPurchaseValue, totalSaleValue, potentialProfit, stalePhones, todayEntries };
 }, [phones]);

 const inventoryIntelligence = useMemo(() => {
 const sellable = phones.filter((phone) => inventorySellableStatuses.includes(phone.status));
 const stale45 = sellable.filter((phone) => {
 const baseDate = phone.purchaseDate || phone.registerDate;
 return baseDate ? moment().diff(moment(baseDate), 'days') >= 45 : false;
 });
 const stale60 = sellable.filter((phone) => {
 const baseDate = phone.purchaseDate || phone.registerDate;
 return baseDate ? moment().diff(moment(baseDate), 'days') >= 60 : false;
 });
 const lossRisk = sellable.filter((phone) => Number(phone.salePrice || 0) > 0 && Number(phone.salePrice || 0) <= getPhoneCostBasisAmount(phone));
 const missingSupplier = phones.filter((phone) => Number(phone.purchasePrice || 0) > 0 && !String(phone.supplierName || '').trim());
 const lowBatterySellable = sellable.filter((phone) => Number(phone.batteryHealth || 0) > 0 && Number(phone.batteryHealth || 0) < 80);
 const missingSale = sellable.filter((phone) => !(Number(phone.salePrice || 0) > 0));
 const noPurchaseDate = phones.filter((phone) => !phone.purchaseDate);

 const soldByModel = phones.reduce((acc, phone) => {
 const key = String(phone.model || '').trim();
 if (!key) return acc;
 const item = acc.get(key) || { sold: 0, active: 0 };
 if (phone.status === 'فروخته شده' || phone.status === 'فروخته شده (قسطی)') item.sold += 1;
 if (inventorySellableStatuses.includes(phone.status)) item.active += 1;
 acc.set(key, item);
 return acc;
 }, new Map<string, { sold: number; active: number }>);
 const fastMoving = Array.from(soldByModel.entries).filter(([, value]) => value.sold >= 2).sort((a, b) => (b[1].sold - a[1].sold) || (a[1].active - b[1].active)).slice(0, 3).map(([model, value]) => ({ model, sold: value.sold, active: value.active }));

 const topAction = lossRisk.length > 0
 ? 'بازبینی فوری قیمت فروش چند دستگاه'
 : stale60.length > 0
 ? 'طراحی کمپین خروج برای راکدهای ۶۰+ روز'
 : missingSale.length > 0
 ? 'تکمیل قیمت‌گذاری دستگاه‌های بدون نرخ فروش'
 : 'انبار در وضعیت متعادل قرار دارد';

 const pressureScore = clamp((stale45.length * 7) + (lossRisk.length * 14) + (missingSale.length * 5) + (missingSupplier.length * 4) + (lowBatterySellable.length * 3), 0, 100);
 const pressureLabel = pressureScore >= 65 ? 'فشار عملیاتی بالا' : pressureScore >= 35 ? 'فشار عملیاتی متوسط' : 'پایدار';

 const alerts = [
 { key: 'loss', label: 'ریسک سود منفی', value: lossRisk.length, icon: 'fa-triangle-exclamation', tone: 'rose', hint: 'قیمت فروش کمتر یا مساوی بهای خرید' },
 { key: 'stale', label: 'راکدهای ۴۵+ روز', value: stale45.length, icon: 'fa-hourglass-end', tone: 'amber', hint: 'دستگاه‌هایی که تصمیم فروش یا کاهش قیمت می‌خواهند' },
 { key: 'missingSale', label: 'بدون قیمت فروش', value: missingSale.length, icon: 'fa-tags', tone: 'violet', hint: 'فروش‌پذیری آن‌ها هنوز نهایی نشده' },
 { key: 'supplier', label: 'بدون تامین‌کننده', value: missingSupplier.length, icon: 'fa-user-slash', tone: 'sky', hint: 'ثبت اطلاعات ناقص زنجیره تامین' },
 { key: 'battery', label: 'باتری پایین', value: lowBatterySellable.length, icon: 'fa-battery-quarter', tone: 'amber', hint: 'به قیمت‌گذاری یا توضیح شفاف‌تر نیاز دارند' },
 { key: 'date', label: 'بدون تاریخ خرید', value: noPurchaseDate.length, icon: 'fa-calendar-xmark', tone: 'slate', hint: 'تایم‌لاین و گزارش را ضعیف می‌کند' },
 ].filter((item) => item.value > 0);

 return { stale45, stale60, lossRisk, missingSupplier, lowBatterySellable, missingSale, noPurchaseDate, fastMoving, topAction, pressureScore, pressureLabel, alerts };
 }, [phones]);

 const modelFilterOptions = useMemo(() => Array.from(new Set(phones.map((phone) => String(phone.model || '').trim()).filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b), 'fa')), [phones]);
 const drilldownPhones = useMemo(() => historyExplorerFilters.model !== 'all'
 ? phones.filter((phone) => String(phone.model || '').trim() === historyExplorerFilters.model).slice(0, 6)
 : [], [phones, historyExplorerFilters.model]);
 const supplierFilterOptions = useMemo(() => Array.from(new Set(phones.map((phone) => String(phone.supplierName || '').trim()).filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b), 'fa')), [phones]);
 const activeFilterCount = useMemo(() => [savedView !== 'all', statusFilter !== 'all', supplierFilter !== 'all', modelFilter !== 'all', batteryFilter !== 'all', sortMode !== 'newest', inventoryViewMode !== 'cards', dashboardDrilldown.kind !== 'none', !!inventoryExplorerDateRange.startDate, !!inventoryExplorerDateRange.endDate].filter(Boolean).length, [savedView, statusFilter, supplierFilter, modelFilter, batteryFilter, sortMode, inventoryViewMode, dashboardDrilldown, inventoryExplorerDateRange]);
 const workspaceFilteredPhones = useMemo(() => {
 switch (workspace) {
 case 'stale':
 return filteredPhones.filter((phone) => {
 return isPhoneStaleForAtLeast(phone, 30);
 });
 case 'returns':
 return filteredPhones.filter((phone) => phone.status === 'مرجوعی' || phone.status === 'مرجوعی اقساطی');
 case 'insights':
 return filteredPhones.filter((phone) => inventorySellableStatuses.includes(phone.status));
 case 'inventory':
 return filteredPhones;
 case 'intake':
 default:
 return filteredPhones;
 }
 }, [filteredPhones, workspace]);

 const inventoryExplorerPhones = useMemo(() => {
 let next = [...workspaceFilteredPhones];

 if (savedView === 'sellable') next = next.filter((phone) => inventorySellableStatuses.includes(phone.status));
 if (savedView === 'missingSale') next = next.filter((phone) => !(Number(phone.salePrice) > 0));
 if (savedView === 'stale') next = next.filter((phone) => {
 return isPhoneStaleForAtLeast(phone, 30);
 });
 if (savedView === 'returns') next = next.filter((phone) => phone.status === 'مرجوعی' || phone.status === 'مرجوعی اقساطی');
 if (savedView === 'today') next = next.filter((phone) => moment(phone.registerDate).isSame(moment(), 'day'));

 if (statusFilter !== 'all') next = next.filter((phone) => phone.status === statusFilter);
 if (supplierFilter !== 'all') next = next.filter((phone) => (phone.supplierName || '') === supplierFilter);
 if (modelFilter !== 'all') next = next.filter((phone) => (phone.model || '') === modelFilter);
 if (batteryFilter === 'low') next = next.filter((phone) => Number(phone.batteryHealth || 0) > 0 && Number(phone.batteryHealth || 0) < 80);
 if (batteryFilter === 'good') next = next.filter((phone) => Number(phone.batteryHealth || 0) >= 80);

 if (inventoryExplorerDateRange.startDate) {
 next = next.filter((phone) => {
 const baseDate = phone.purchaseDate || phone.registerDate;
 return baseDate ? moment(baseDate).isSameOrAfter(moment(inventoryExplorerDateRange.startDate), 'day') : false;
 });
 }
 if (inventoryExplorerDateRange.endDate) {
 next = next.filter((phone) => {
 const baseDate = phone.purchaseDate || phone.registerDate;
 return baseDate ? moment(baseDate).isSameOrBefore(moment(inventoryExplorerDateRange.endDate), 'day') : false;
 });
 }

 if (dashboardDrilldown.kind === 'model' && dashboardDrilldown.value) next = next.filter((phone) => String(phone.model || '').trim() === dashboardDrilldown.value);
 if (dashboardDrilldown.kind === 'supplier' && dashboardDrilldown.value) next = next.filter((phone) => String(phone.supplierName || '').trim() === dashboardDrilldown.value);
 if (dashboardDrilldown.kind === 'staleBucket' && dashboardDrilldown.value) next = next.filter((phone) => isPhoneWithinAgeBucket(phone, dashboardDrilldown.value));
 if (dashboardDrilldown.kind === 'missingSale') next = next.filter((phone) => inventorySellableStatuses.includes(phone.status) && !(Number(phone.salePrice || 0) > 0));
 if (dashboardDrilldown.kind === 'lossRisk') next = next.filter((phone) => Number(phone.salePrice || 0) > 0 && Number(phone.salePrice || 0) <= getPhoneCostBasisAmount(phone));
 if (dashboardDrilldown.kind === 'lowBattery') next = next.filter((phone) => Number(phone.batteryHealth || 0) > 0 && Number(phone.batteryHealth || 0) < 80);
 if (dashboardDrilldown.kind === 'readyForSale') next = next.filter((phone) => inventorySellableStatuses.includes(phone.status) && Number(phone.salePrice || 0) > 0);
 if (dashboardDrilldown.kind === 'sellable') next = next.filter((phone) => inventorySellableStatuses.includes(phone.status));
 if (dashboardDrilldown.kind === 'pricedInventory') next = next.filter((phone) => inventorySellableStatuses.includes(phone.status) && Number(phone.salePrice || 0) > 0);
 if (dashboardDrilldown.kind === 'profitableInventory') next = next.filter((phone) => inventorySellableStatuses.includes(phone.status) && Number(phone.salePrice || 0) > getPhoneCostBasisAmount(phone));
 if (dashboardDrilldown.kind === 'staleAll') next = next.filter((phone) => inventorySellableStatuses.includes(phone.status) && (getPhoneAgeDays(phone) ?? 0) >= 30);

 const staleDays = (phone: PhoneEntry) => {
 const baseDate = phone.purchaseDate || phone.registerDate;
 return baseDate ? moment().diff(moment(baseDate), 'days') : -1;
 };
 const marginValue = (phone: PhoneEntry) => Number(phone.salePrice || 0) - getPhoneCostBasisAmount(phone);

 next.sort((a, b) => {
 switch (sortMode) {
 case 'oldest':
 return moment(a.registerDate).valueOf() - moment(b.registerDate).valueOf();
 case 'purchaseHigh':
 return Number(b.purchasePrice || 0) - Number(a.purchasePrice || 0);
 case 'purchaseLow':
 return Number(a.purchasePrice || 0) - Number(b.purchasePrice || 0);
 case 'saleHigh':
 return Number(b.salePrice || 0) - Number(a.salePrice || 0);
 case 'saleLow':
 return Number(a.salePrice || 0) - Number(b.salePrice || 0);
 case 'marginHigh':
 return marginValue(b) - marginValue(a);
 case 'staleMost':
 return staleDays(b) - staleDays(a);
 case 'newest':
 default:
 return moment(b.registerDate).valueOf() - moment(a.registerDate).valueOf();
 }
 });

 return next;
 }, [workspaceFilteredPhones, savedView, statusFilter, supplierFilter, modelFilter, batteryFilter, sortMode, dashboardDrilldown, inventoryExplorerDateRange]);

 const inventoryExplorerDateRangeLabel = useMemo(() => {
 if (!inventoryExplorerDateRange.startDate && !inventoryExplorerDateRange.endDate) return null;
 const fromLabel = inventoryExplorerDateRange.startDate ? formatIsoToShamsi(inventoryExplorerDateRange.startDate) : 'ابتدای ثبت اطلاعات‌ها';
 const toLabel = inventoryExplorerDateRange.endDate ? formatIsoToShamsi(inventoryExplorerDateRange.endDate) : 'امروز';
 if (inventoryExplorerDateRange.startDate && !inventoryExplorerDateRange.endDate) {
 return `از ${fromLabel} به بعد`;
 }
 if (!inventoryExplorerDateRange.startDate && inventoryExplorerDateRange.endDate) {
 return `تا ${toLabel}`;
 }
 return `${fromLabel} تا ${toLabel}`;
 }, [inventoryExplorerDateRange]);

 const inventoryExplorerDateRangeResultCount = useMemo(() => inventoryExplorerPhones.length, [inventoryExplorerPhones]);
 const inventoryExplorerDateRangeTone = useMemo<'empty' | 'narrow' | 'normal'>(() => {
 if (inventoryExplorerDateRangeResultCount === 0) return 'empty';
 if (inventoryExplorerDateRangeResultCount <= 2) return 'narrow';
 return 'normal';
 }, [inventoryExplorerDateRangeResultCount]);

 const clearExplorerFilters = () => {
 setSavedView('all');
 setStatusFilter('all');
 setSupplierFilter('all');
 setModelFilter('all');
 setBatteryFilter('all');
 setSortMode('newest');
 setInventoryViewMode('cards');
 setDashboardDrilldown({ kind: 'none', value: '', label: '' });
 setInventoryExplorerDateRange({ startDate: '', endDate: '' });
 setHistoryExplorerFilters({ q: '', eventClass: 'all', model: 'all', startDate: '', endDate: '' });
 };

 function applyDashboardDrilldown(drilldown: DashboardDrilldown) {
 setWorkspace('inventory');
 setInventoryViewMode('table');
 setSavedView('all');
 setStatusFilter('all');
 setSupplierFilter('all');
 setModelFilter('all');
 setBatteryFilter('all');
 setSortMode(drilldown.kind === 'staleBucket' || drilldown.kind === 'staleAll' ? 'staleMost' : 'newest');
 setDashboardDrilldown(drilldown);
 setShouldFocusExplorer(true);
 }

 const clearDashboardDrilldown = () => setDashboardDrilldown({ kind: 'none', value: '', label: '' });

 const dashboardDrilldownSummary = dashboardDrilldown.kind === 'none'
 ? null
 : dashboardDrilldown.kind === 'model'
 ? `مدل: ${dashboardDrilldown.label}`
 : dashboardDrilldown.kind === 'supplier'
 ? `تامین‌کننده: ${dashboardDrilldown.label}`
 : dashboardDrilldown.kind === 'missingSale'
 ? 'بی‌قیمت: دستگاه‌های بدون نرخ فروش'
 : dashboardDrilldown.kind === 'lossRisk'
 ? 'ریسک سود: فروش کمتر یا مساوی خرید'
 : dashboardDrilldown.kind === 'lowBattery'
 ? 'کم‌باتری: سلامت باتری زیر ۸۰٪'
 : dashboardDrilldown.kind === 'readyForSale'
 ? 'آماده فروش: قابل عرضه با قیمت ثبت اطلاعات‌شده'
 : dashboardDrilldown.kind === 'sellable'
 ? 'موجودی قابل فروش: همه دستگاه‌های قابل عرضه'
 : dashboardDrilldown.kind === 'pricedInventory'
 ? 'قیمت‌گذاری‌شده: موجودی دارای نرخ فروش'
 : dashboardDrilldown.kind === 'profitableInventory'
 ? 'سودده: فروش بالاتر از بهای خرید'
 : dashboardDrilldown.kind === 'staleAll'
 ? 'راکدهای ۳۰+ روز: موجودی نیازمند تصمیم'
 : `بازه راکدی: ${dashboardDrilldown.label}`;

 const explorerContextCard = useMemo(() => {
 if (dashboardDrilldown.kind === 'model' && dashboardDrilldown.value) {
 const sameModel = phones.filter((phone) => String(phone.model || '').trim() === dashboardDrilldown.value);
 const priced = sameModel.filter((phone) => Number(phone.salePrice || 0) > 0).length;
 const sellable = sameModel.filter((phone) => inventorySellableStatuses.includes(phone.status)).length;
 return {
 tone: 'violet' as const,
 icon: 'fa-mobile-screen-button',
 kicker: 'نمای متمرکز مدل',
 title: `مدل ${dashboardDrilldown.label}`,
 description: 'مرور روی یک مدل واحد قفل شده تا قیمت‌گذاری، وضعیت و کیفیت موجودی همین خانواده را سریع‌تر مرور کنی.',
 chips: [
 `${sameModel.length.toLocaleString('fa-IR')} دستگاه`,
 `${sellable.toLocaleString('fa-IR')} قابل‌فروش`,
 `${priced.toLocaleString('fa-IR')} قیمت‌گذاری‌شده`,
 ],
 };
 }
 if (dashboardDrilldown.kind === 'supplier' && dashboardDrilldown.value) {
 const sameSupplier = phones.filter((phone) => String(phone.supplierName || '').trim() === dashboardDrilldown.value);
 const priced = sameSupplier.filter((phone) => Number(phone.salePrice || 0) > 0).length;
 const stale = sameSupplier.filter((phone) => (getPhoneAgeDays(phone) ?? 0) >= 30).length;
 return {
 tone: 'sky' as const,
 icon: 'fa-user',
 kicker: 'نمای متمرکز تامین‌کننده',
 title: `تامین‌کننده ${dashboardDrilldown.label}`,
 description: 'الان در نمای متمرکز یک تامین‌کننده هستی؛ برای ارزیابی پوشش تامین، راکدی و کیفیت قیمت‌گذاری همین زنجیره.',
 chips: [
 `${sameSupplier.length.toLocaleString('fa-IR')} دستگاه`,
 `${priced.toLocaleString('fa-IR')} قیمت‌گذاری‌شده`,
 `${stale.toLocaleString('fa-IR')} راکد ۳۰+ روز`,
 ],
 };
 }
 return null;
 }, [dashboardDrilldown, phones]);

 const openExplorerContextHistory = () => {
 if (!explorerContextCard) return;
 setWorkspace('insights');
 setInventoryViewMode('table');
 setShouldFocusExplorer(true);
 setHistoryExplorerFilters((prev) => ({...prev,
 q: dashboardDrilldown.kind === 'supplier' ? dashboardDrilldown.label : '',
 model: dashboardDrilldown.kind === 'model' ? dashboardDrilldown.value : 'all',
 }));
 };

 const exportExplorerContextCsv = () => {
 if (!explorerContextCard || inventoryExplorerPhones.length === 0) return;
 const rows = inventoryExplorerPhones.map((phone) => [
 phone.model || '',
 phone.imei || '',
 phone.status || '',
 phone.supplierName || '',
 phone.purchasePrice || '',
 phone.salePrice || '',
 phone.batteryHealth ?? '',
 phone.purchaseDate || '',
 phone.registerDate || '',
 ]);
 const csv = ['﻿مدل,IMEI,وضعیت,تامین‌کننده,قیمت خرید,قیمت فروش,سلامت باتری,تاریخ خرید,تاریخ ثبت اطلاعات',...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');
 const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
 const url = URL.createObjectURL(blob);
 const link = document.createElement('a');
 link.href = url;
 const safeLabel = String(dashboardDrilldown.label || 'context').replace(/\s+/g, '-');
 link.download = `phone-context-${safeLabel}.csv`;
 document.body.appendChild(link);
 link.click;
 document.body.removeChild(link);
 URL.revokeObjectURL(url);
 };

 const savedViewMeta: Array<{ key: SavedInventoryView; label: string; icon: string }> = [
 { key: 'all', label: 'همه', icon: 'fa-layer-group' },
 { key: 'sellable', label: 'قابل فروش', icon: 'fa-bolt' },
 { key: 'missingSale', label: 'بدون قیمت فروش', icon: 'fa-tags' },
 { key: 'stale', label: 'راکد', icon: 'fa-hourglass-half' },
 { key: 'returns', label: 'مرجوعی', icon: 'fa-rotate-left' },
 { key: 'today', label: 'ثبت اطلاعات امروز', icon: 'fa-calendar-day' },
 ];

 const explorerFocusCards = useMemo(() => ([
 {
 key: 'sellable',
 label: 'آماده فروش',
 value: inventoryExplorerPhones.filter((phone) => inventorySellableStatuses.includes(phone.status)).length.toLocaleString('fa-IR'),
 hint: 'دستگاه‌هایی که همین حالا در مسیر فروش‌اند.',
 icon: 'fa-bolt',
 tone: 'from-emerald-50 to-white dark:from-emerald-950/20 dark:to-slate-950/20',
 },
 {
 key: 'flagged',
 label: 'نیازمند توجه',
 value: inventoryExplorerPhones.filter((phone) => getPhoneOperationalFlags(phone).length > 0).length.toLocaleString('fa-IR'),
 hint: 'پرچم‌دارهای ریسک، راکدی یا داده ناقص.',
 icon: 'fa-triangle-exclamation',
 tone: 'from-amber-50 to-white dark:from-amber-950/20 dark:to-slate-950/20',
 },
 ]), [inventoryExplorerPhones]);

 const insightsActionCards = useMemo(() => ([
 {
 key: 'readyForSale',
 label: 'آماده فروش',
 value: inventoryMetrics.sellable.filter((phone) => Number(phone.salePrice || 0) > 0).length,
 hint: 'گوشی‌های قابل عرضه با قیمت فروش ثبت اطلاعات‌شده',
 icon: 'fa-bolt',
 tone: 'from-emerald-50 to-white dark:from-emerald-950/20 dark:to-slate-950/20',
 drilldown: { kind: 'readyForSale' as const, value: 'ready', label: 'آماده فروش' },
 },
 {
 key: 'missingSale',
 label: 'بی‌قیمت',
 value: inventoryIntelligence.missingSale.length,
 hint: 'دستگاه‌هایی که قیمت فروش نگرفته‌اند',
 icon: 'fa-tags',
 tone: 'from-violet-50 to-white dark:from-violet-950/20 dark:to-slate-950/20',
 drilldown: { kind: 'missingSale' as const, value: 'missingSale', label: 'بی‌قیمت' },
 },
 {
 key: 'lossRisk',
 label: 'ریسک سود',
 value: inventoryIntelligence.lossRisk.length,
 hint: 'فروش کمتر یا مساوی بهای خرید',
 icon: 'fa-triangle-exclamation',
 tone: 'from-rose-50 to-white dark:from-rose-950/20 dark:to-slate-950/20',
 drilldown: { kind: 'lossRisk' as const, value: 'lossRisk', label: 'ریسک سود' },
 },
 {
 key: 'lowBattery',
 label: 'کم‌باتری',
 value: inventoryIntelligence.lowBatterySellable.length,
 hint: 'گوشی‌های با سلامت باتری کمتر از ۸۰٪',
 icon: 'fa-battery-quarter',
 tone: 'from-amber-50 to-white dark:from-amber-950/20 dark:to-slate-950/20',
 drilldown: { kind: 'lowBattery' as const, value: 'lowBattery', label: 'کم‌باتری' },
 },
 ]), [inventoryIntelligence, inventoryMetrics.sellable]);

 const workspaceLead = useMemo(() => {
 if (workspace === 'stale') return `راکدهای قابل پیگیری: ${inventoryMetrics.stalePhones.length.toLocaleString('fa-IR')} دستگاه`;
 if (workspace === 'returns') return `مرجوعی‌های باز: ${inventoryMetrics.returns.length.toLocaleString('fa-IR')} دستگاه`;
 if (workspace === 'insights') return `فروش بالقوه موجودی: ${formatPrice(inventoryMetrics.totalSaleValue)}`;
 if (workspace === 'intake') return 'ورود دستگاه جدید با دید مدیریتی و مالی';
 return `نمایش ${inventoryExplorerPhones.length.toLocaleString('fa-IR')} مورد از انبار گوشی`;
 }, [workspace, inventoryMetrics, inventoryExplorerPhones.length]);

 const selectedPhones = useMemo(() => {
 const idSet = new Set(selectedPhoneIds);
 return inventoryExplorerPhones.filter((phone) => idSet.has(phone.id));
 }, [inventoryExplorerPhones, selectedPhoneIds]);

 const allVisibleSelected = inventoryExplorerPhones.length > 0 && selectedPhones.length === inventoryExplorerPhones.length;

 useEffect(() => {
 setSelectedPhoneIds((prev) => prev.filter((id) => inventoryExplorerPhones.some((phone) => phone.id === id)));
 }, [inventoryExplorerPhones]);

 const togglePhoneSelection = (phoneId: number) => {
 setSelectedPhoneIds((prev) => (prev.includes(phoneId) ? prev.filter((id) => id !== phoneId) : [...prev, phoneId]));
 };

 const toggleSelectAllVisible = () => {
 if (allVisibleSelected) {
 setSelectedPhoneIds([]);
 return;
 }
 setSelectedPhoneIds(inventoryExplorerPhones.map((phone) => phone.id));
 };

 const normalizeCompareValue = (value: unknown) => String(value ?? '').trim();
 const countSellablePhones = (items: PhoneEntry[]) => items.filter((phone) => phone.status === 'موجود در انبار').length;
 const countMissingSalePhones = (items: PhoneEntry[]) => items.filter((phone) => !Number(phone.salePrice || 0)).length;
 const countWithoutSupplierPhones = (items: PhoneEntry[]) => items.filter((phone) => !phone.supplierId).length;
 const countReturnedPhones = (items: PhoneEntry[]) => items.filter((phone) => String(phone.status || '').includes('مرجوع')).length;

 const mergePhoneWithPayload = (phone: PhoneEntry, payload: PhoneEntryUpdatePayload): PhoneEntry => ({...phone,
 model: payload.model ?? phone.model,
 color: payload.color ?? phone.color,
 storage: payload.storage ?? phone.storage,
 ram: payload.ram ?? phone.ram,
 imei: payload.imei ?? phone.imei,
 batteryHealth: payload.batteryHealth !== undefined ? (payload.batteryHealth === '' ? null : Number(payload.batteryHealth)) : phone.batteryHealth,
 condition: payload.condition ?? phone.condition,
 purchasePrice: payload.purchasePrice !== undefined ? (payload.purchasePrice == '' ? null : Number(payload.purchasePrice)) : phone.purchasePrice,
 salePrice: payload.salePrice !== undefined ? (payload.salePrice == '' ? null : Number(payload.salePrice)) : phone.salePrice,
 sellerName: payload.sellerName ?? phone.sellerName,
 purchaseDate: payload.purchaseDate ?? phone.purchaseDate,
 status: payload.status ?? phone.status,
 notes: payload.notes ?? phone.notes,
 supplierId: payload.supplierId !== undefined ? (payload.supplierId == '' ? null : Number(payload.supplierId)) : phone.supplierId,
 supplierName: payload.supplierId !== undefined
 ? (partners.find((partner) => String(partner.id) === String(payload.supplierId))?.partnerName || (payload.supplierId == '' ? null : phone.supplierName))
 : phone.supplierName,
 });

 const payloadChangesPhone = (phone: PhoneEntry, payload: PhoneEntryUpdatePayload) => {
 const currentSupplierId = phone.supplierId !== null && phone.supplierId !== undefined ? String(phone.supplierId) : '';
 const comparablePairs: Array<[unknown, unknown]> = [
 [payload.model, phone.model],
 [payload.color, phone.color],
 [payload.storage, phone.storage],
 [payload.ram, phone.ram],
 [payload.imei, phone.imei],
 [payload.batteryHealth, phone.batteryHealth !== null && phone.batteryHealth !== undefined ? String(phone.batteryHealth) : ''],
 [payload.condition, phone.condition],
 [payload.purchasePrice, phone.purchasePrice !== null && phone.purchasePrice !== undefined ? String(phone.purchasePrice) : ''],
 [payload.salePrice, phone.salePrice !== null && phone.salePrice !== undefined ? String(phone.salePrice) : ''],
 [payload.sellerName, phone.sellerName],
 [payload.purchaseDate, phone.purchaseDate],
 [payload.status, phone.status],
 [payload.notes, phone.notes],
 [payload.supplierId, currentSupplierId],
 ].filter(([next]) => next !== undefined);
 return comparablePairs.some(([next, current]) => normalizeCompareValue(next) !== normalizeCompareValue(current));
 };

 const buildBulkImpactBadges = (beforePhones: PhoneEntry[], afterPhones: PhoneEntry[]) => {
 const before = {
 sellable: countSellablePhones(beforePhones),
 missingSale: countMissingSalePhones(beforePhones),
 withoutSupplier: countWithoutSupplierPhones(beforePhones),
 returned: countReturnedPhones(beforePhones),
 };
 const after = {
 sellable: countSellablePhones(afterPhones),
 missingSale: countMissingSalePhones(afterPhones),
 withoutSupplier: countWithoutSupplierPhones(afterPhones),
 returned: countReturnedPhones(afterPhones),
 };
 return [
 `قابل فروش: ${before.sellable.toLocaleString('fa-IR')} → ${after.sellable.toLocaleString('fa-IR')}`,
 `بی‌قیمت: ${before.missingSale.toLocaleString('fa-IR')} → ${after.missingSale.toLocaleString('fa-IR')}`,
 `بدون تامین: ${before.withoutSupplier.toLocaleString('fa-IR')} → ${after.withoutSupplier.toLocaleString('fa-IR')}`,
 `مرجوعی: ${before.returned.toLocaleString('fa-IR')} → ${after.returned.toLocaleString('fa-IR')}`,
 ];
 };

 const executeBulkUndo = async (
 mode: 'status' | 'supplier',
 originalPhones: PhoneEntry[],
 targetLabel: string,
 ) => {
 if (!token || originalPhones.length === 0) return;
 setIsBulkSubmitting(true);
 setNotification({
 type: 'info',
 text: `بازگردانی برای ${originalPhones.length.toLocaleString('fa-IR')} دستگاه شروع شد.`,
 title: 'در حال بازگردانی سریع',
 detail: `تغییرات اعمال‌شده به «${targetLabel}» در حال برگشت به وضعیت/تامین‌کننده قبلی هستند.`,
 persistent: true,
 });
 try {
 const outcomes = await Promise.all(originalPhones.map(async (phone) => {
 const payload: PhoneEntryUpdatePayload = {
 model: phone.model,
 color: phone.color,
 storage: phone.storage,
 ram: phone.ram,
 imei: phone.imei,
 batteryHealth: phone.batteryHealth !== null && phone.batteryHealth !== undefined ? String(phone.batteryHealth) : undefined,
 condition: phone.condition,
 purchasePrice: phone.purchasePrice !== null && phone.purchasePrice !== undefined ? String(phone.purchasePrice) : undefined,
 salePrice: phone.salePrice !== null && phone.salePrice !== undefined ? String(phone.salePrice) : undefined,
 sellerName: phone.sellerName,
 purchaseDate: phone.purchaseDate,
 status: phone.status,
 notes: phone.notes,
 supplierId: mode === 'supplier'
 ? (phone.supplierId !== null && phone.supplierId !== undefined ? String(phone.supplierId) : null)
 : (phone.supplierId !== null && phone.supplierId !== undefined ? String(phone.supplierId) : undefined),
 };
 const response = await fetch(`/api/phones/${phone.id}`, {
 method: 'PUT',
 headers: getAuthHeaders(token),
 body: JSON.stringify(payload),
 });
 const result = await response.json();
 if (!response.ok || !result.success) throw new Error(result.message || `خطا در بازگردانی ${phone.model}`);
 return { phone, payload };
 }));
 await fetchPhones();
 setSelectedPhoneIds(outcomes.map((item) => item.phone.id));
 const badges = mode === 'status'
 ? [
 `بازگردانی‌شده: ${outcomes.length.toLocaleString('fa-IR')}`,
 `وضعیت مقصد قبلی: ${targetLabel}`,
 ]
 : [
 `بازگردانی‌شده: ${outcomes.length.toLocaleString('fa-IR')}`,
 `تامین‌کننده مقصد قبلی: ${targetLabel}`,
 ];
 setNotification({
 type: 'success',
 text: `بازگردانی سریع برای ${outcomes.length.toLocaleString('fa-IR')} دستگاه انجام شد.`,
 title: mode === 'status' ? 'وضعیت برگشت داده شد.' : 'تخصیص تامین‌کننده برگشت داده شد.',
 detail: mode === 'status'
 ? 'وضعیت و گردش‌های تغییرکرده به مقدار قبلی برگشت و دوباره در مرور انتخاب شدند.'
 : 'تامین‌کننده دستگاه‌های تغییرکرده به مقدار قبلی برگشت و دوباره در مرور انتخاب شدند.',
 nextStep: 'برای بازبینی نهایی، لیست فیلترشده و History Explorer را مرور کن.',
 badges,
 feedActionLabel: outcomes.length === 1 ? 'باز کردن تایم‌لاین دستگاه' : 'باز کردن نتیجه در مرور',
 onFeedAction: () => {
 if (outcomes.length === 1) {
 focusPhoneEntity(outcomes[0].phone, { detailsTab: 'timeline', workspaceMode: 'inventory', viewMode: 'table', focusExplorer: true });
 return;
 }
 focusInventoryResult(
 outcomes.map((item) => item.phone),
 deriveSelectionDrilldown(outcomes.map((item) => item.phone)),
 );
 },
 });
 } catch (error: any) {
 setNotification({ type: 'error', text: error.message || 'بازگردانی سریع با خطا در عملیات روبه‌رو شد.' });
 } finally {
 setIsBulkSubmitting(false);
 }
 };

 const buildBulkSuccessNotification = (
 mode: 'status' | 'supplier' | 'export',
 params: {
 targetLabel?: string;
 selected: PhoneEntry[];
 updated?: PhoneEntry[];
 changedCount?: number;
 unchangedCount?: number;
 undoAction?: () => void | Promise<void>;
 },
 ): NotificationMessage => {
 const total = params.selected.length;
 const changedCount = params.changedCount ?? total;
 const unchangedCount = params.unchangedCount ?? Math.max(total - changedCount, 0);

 if (mode === 'status') {
 const targetLabel = params.targetLabel || 'وضعیت انتخاب‌شده';
 return {
 type: 'success',
 text: `وضعیت برای ${total.toLocaleString('fa-IR')} دستگاه پردازش شد.`,
 title: `وضعیت انجام شد؛ ${changedCount.toLocaleString('fa-IR')} تغییر واقعی ثبت اطلاعات شد.`,
 detail: unchangedCount > 0
 ? `${unchangedCount.toLocaleString('fa-IR')} دستگاه از قبل روی «${targetLabel}» بودند و بدون تغییر ماندند.`
 : `همه انتخاب‌ها به «${targetLabel}» منتقل شدند و تاریخچه انبار به‌روزرسانی شد.`,
 nextStep: targetLabel === 'موجود در انبار'
 ? 'این گروه حالا به موجودی قابل عرضه نزدیک‌تر شده است. KPIهای بالای صفحه و مرور را برای اثر نهایی مرور کن.'
 : 'اگر لازم است این تغییر برگردد، از دکمه بازگردانی سریع همین اعلان استفاده کن یا همان انتخاب را دوباره در مرور فیلتر کن.',
 badges: params.updated ? buildBulkImpactBadges(params.selected, params.updated) : [],
 actionLabel: changedCount > 0 && params.undoAction ? 'بازگردانی سریع' : undefined,
 actionIcon: changedCount > 0 && params.undoAction ? 'fa-arrow-rotate-left' : undefined,
 onAction: changedCount > 0 ? params.undoAction : undefined,
 countdownSeconds: changedCount > 0 && params.undoAction ? 8 : undefined,
 countdownLabel: changedCount > 0 && params.undoAction ? 'فرصت بازگردانی سریع' : undefined,
 feedActionLabel: (params.updated || params.selected).length === 1 ? 'باز کردن جزئیات دستگاه' : 'باز کردن نتیجه در مرور',
 onFeedAction: () => focusInventoryResult(
 params.updated || params.selected,
 targetLabel === 'موجود در انبار'
 ? { kind: 'sellable', value: 'sellable', label: 'موجودی قابل فروش' }
 : targetLabel.includes('مرجوع')
 ? { kind: 'none', value: '', label: targetLabel }
 : deriveSelectionDrilldown(params.updated || params.selected),
 ),
 };
 }

 if (mode === 'supplier') {
 const targetLabel = params.targetLabel || 'تامین‌کننده انتخاب‌شده';
 return {
 type: 'success',
 text: `تامین‌کننده برای ${total.toLocaleString('fa-IR')} دستگاه پردازش شد.`,
 title: `تخصیص تامین‌کننده انجام شد؛ ${changedCount.toLocaleString('fa-IR')} تغییر واقعی ثبت اطلاعات شد.`,
 detail: unchangedCount > 0
 ? `${unchangedCount.toLocaleString('fa-IR')} دستگاه از قبل روی «${targetLabel}» بودند.`
 : `پوشش تامین برای همه انتخاب‌ها با «${targetLabel}» کامل شد.`,
 nextStep: 'برای بازبینی، می‌توانی از History Explorer یا درایلدان تامین‌کننده استفاده کنی و در صورت نیاز با بازگردانی سریع همین اعلان تخصیص را معکوس انجام دهی.',
 badges: params.updated ? buildBulkImpactBadges(params.selected, params.updated) : [],
 actionLabel: changedCount > 0 && params.undoAction ? 'بازگردانی سریع' : undefined,
 actionIcon: changedCount > 0 && params.undoAction ? 'fa-arrow-rotate-left' : undefined,
 onAction: changedCount > 0 ? params.undoAction : undefined,
 countdownSeconds: changedCount > 0 && params.undoAction ? 8 : undefined,
 countdownLabel: changedCount > 0 && params.undoAction ? 'فرصت بازگردانی سریع' : undefined,
 feedActionLabel: (params.updated || params.selected).length === 1 ? 'باز کردن جزئیات دستگاه' : 'باز کردن نتیجه در مرور',
 onFeedAction: () => focusInventoryResult(
 params.updated || params.selected,
 targetLabel && targetLabel !== 'تامین‌کننده انتخاب‌شده'
 ? { kind: 'supplier', value: targetLabel, label: targetLabel }
 : deriveSelectionDrilldown(params.updated || params.selected),
 ),
 };
 }

 if (mode === 'export') {
 return {
 type: 'success',
 text: `خروجی CSV برای ${total.toLocaleString('fa-IR')} دستگاه آماده شد.`,
 title: 'فایل CSV انتخاب‌ها ساخته شد.',
 detail: `${total.toLocaleString('fa-IR')} دستگاه وارد فایل خروجی شدند و برای حسابرسی یا بازبینی آماده‌اند.`,
 nextStep: 'اگر لازم است دامنه فایل محدودتر شود، selection فعلی را با درایلدان یا فیلترهای مرور دقیق‌تر کن و دوباره خروجی بگیر.',
 badges: [
 `تعداد ردیف: ${total.toLocaleString('fa-IR')}`,
 `بدون قیمت: ${countMissingSalePhones(params.selected).toLocaleString('fa-IR')}`,
 `بدون تامین: ${countWithoutSupplierPhones(params.selected).toLocaleString('fa-IR')}`,
 ],
 feedActionLabel: params.selected.length === 1 ? 'باز کردن تایم‌لاین دستگاه' : 'باز کردن نتیجه در تحلیل سریع',
 onFeedAction: () => focusHistoryResult(params.selected, 'audit'),
 };
 }

 return {
 type: 'success',
 text: `پنجره برای ${total.toLocaleString('fa-IR')} دستگاه باز شد.`,
 title: 'چاپ برچسب‌ها آماده شد.',
 detail: `${total.toLocaleString('fa-IR')} دستگاه وارد صف چاپ شدند و پیش‌نمایش برچسب‌ها باز شد.`,
 nextStep: 'بعد از چاپ، اگر لازم بود selection را نگه دار و برای CSV یا وضعیت همان گروه از نوار بالایی استفاده کن.',
 badges: [
 `تعداد برچسب: ${total.toLocaleString('fa-IR')}`,
 `آماده فروش: ${countSellablePhones(params.selected).toLocaleString('fa-IR')}`,
 ],
 feedActionLabel: (params.updated || params.selected).length === 1 ? 'باز کردن جزئیات دستگاه' : 'باز کردن نتیجه در مرور',
 onFeedAction: () => focusInventoryResult(params.selected, deriveSelectionDrilldown(params.selected)),
 };
 };

 const bulkUpdatePhones = async (
 updater: (phone: PhoneEntry) => PhoneEntryUpdatePayload,
 successMessage: string,
 successNotificationBuilder?: (params: { selected: PhoneEntry[]; updated: PhoneEntry[]; changedCount: number; unchangedCount: number }) => NotificationMessage,
 ) => {
 if (!token || selectedPhones.length === 0) return;
 setIsBulkSubmitting(true);
 setNotification(null);
 try {
 const outcomes = await Promise.all(selectedPhones.map(async (phone) => {
 const payload = updater(phone);
 const changed = payloadChangesPhone(phone, payload);
 const updatedPhone = mergePhoneWithPayload(phone, payload);
 const response = await fetch(`/api/phones/${phone.id}`, {
 method: 'PUT',
 headers: getAuthHeaders(token),
 body: JSON.stringify(payload),
 });
 const result = await response.json();
 if (!response.ok || !result.success) throw new Error(result.message || `خطا در به‌روزرسانی ${phone.model}`);
 return { result, phone, changed, updatedPhone };
 }));
 const changedCount = outcomes.filter((item) => item.changed).length;
 const unchangedCount = Math.max(outcomes.length - changedCount, 0);
 const notification = successNotificationBuilder
 ? successNotificationBuilder({
 selected: outcomes.map((item) => item.phone),
 updated: outcomes.map((item) => item.updatedPhone),
 changedCount,
 unchangedCount,
 })
 : { type: 'success' as const, text: `${successMessage} (${selectedPhones.length.toLocaleString('fa-IR')} دستگاه)` };
 setNotification(notification);
 setSelectedPhoneIds([]);
 await fetchPhones();
 return outcomes.map((item) => item.result);
 } catch (error: any) {
 setNotification({ type: 'error', text: error.message || 'خطا در عملیات گروهی انبار.' });
 throw error;
 } finally {
 setIsBulkSubmitting(false);
 }
 };

 const executeBulkStatusUpdate = async () => {
 if (bulkStatusTarget === 'all' || selectedPhones.length === 0) return;
 await bulkUpdatePhones((phone) => ({
 model: phone.model,
 color: phone.color,
 storage: phone.storage,
 ram: phone.ram,
 imei: phone.imei,
 batteryHealth: phone.batteryHealth !== null && phone.batteryHealth !== undefined ? String(phone.batteryHealth) : undefined,
 condition: phone.condition,
 purchasePrice: phone.purchasePrice !== null && phone.purchasePrice !== undefined ? String(phone.purchasePrice) : undefined,
 salePrice: phone.salePrice !== null && phone.salePrice !== undefined ? String(phone.salePrice) : undefined,
 sellerName: phone.sellerName,
 purchaseDate: phone.purchaseDate,
 status: bulkStatusTarget,
 notes: phone.notes,
 supplierId: phone.supplierId ? String(phone.supplierId) : undefined,
 }), 'وضعیت با موفقیت به‌روزرسانی شد', ({ selected, updated, changedCount, unchangedCount }) => {
 const changedPhones = selected.filter((phone) => String(phone.status || '') !== String(bulkStatusTarget));
 return buildBulkSuccessNotification('status', {
 targetLabel: String(bulkStatusTarget),
 selected,
 updated,
 changedCount,
 unchangedCount,
 undoAction: changedPhones.length > 0 ? () => executeBulkUndo('status', changedPhones, String(bulkStatusTarget)) : undefined,
 });
 });
 setBulkStatusTarget('all');
 };

 const executeBulkSupplierAssign = async () => {
 if (bulkSupplierTarget === 'all' || selectedPhones.length === 0) return;
 await bulkUpdatePhones((phone) => ({
 model: phone.model,
 color: phone.color,
 storage: phone.storage,
 ram: phone.ram,
 imei: phone.imei,
 batteryHealth: phone.batteryHealth !== null && phone.batteryHealth !== undefined ? String(phone.batteryHealth) : undefined,
 condition: phone.condition,
 purchasePrice: phone.purchasePrice !== null && phone.purchasePrice !== undefined ? String(phone.purchasePrice) : undefined,
 salePrice: phone.salePrice !== null && phone.salePrice !== undefined ? String(phone.salePrice) : undefined,
 sellerName: phone.sellerName,
 purchaseDate: phone.purchaseDate,
 status: phone.status,
 notes: phone.notes,
 supplierId: bulkSupplierTarget,
 }), 'تامین‌کننده برای دستگاه‌های انتخاب‌شده ثبت اطلاعات شد', ({ selected, updated, changedCount, unchangedCount }) => {
 const changedPhones = selected.filter((phone) => String(phone.supplierId || '') !== String(bulkSupplierTarget));
 return buildBulkSuccessNotification('supplier', {
 targetLabel: partners.find((partner) => String(partner.id) === String(bulkSupplierTarget))?.partnerName || 'تامین‌کننده انتخاب‌شده',
 selected,
 updated,
 changedCount,
 unchangedCount,
 undoAction: changedPhones.length > 0 ? () => executeBulkUndo('supplier', changedPhones, partners.find((partner) => String(partner.id) === String(bulkSupplierTarget))?.partnerName || 'تامین‌کننده انتخاب‌شده') : undefined,
 });
 });
 setBulkSupplierTarget('all');
 };

 const executeBulkExport = () => {
 if (selectedPhones.length === 0) return;
 const headers = ['مدل', 'وضعیت', 'IMEI', 'حافظه', 'رم', 'رنگ', 'قیمت خرید', 'قیمت فروش', 'تامین‌کننده', 'تاریخ خرید', 'تاریخ ثبت اطلاعات'];
 const rows = selectedPhones.map((phone) => [
 phone.model,
 phone.status,
 phone.imei,
 phone.storage || '',
 phone.ram || '',
 phone.color || '',
 String(phone.purchasePrice ?? ''),
 String(phone.salePrice ?? ''),
 phone.supplierName || '',
 phone.purchaseDate || '',
 phone.registerDate || '',
 ]);
 const csv = [headers,...rows].map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
 const blob = new Blob(["﻿" + csv], { type: 'text/csv;charset=utf-8;' });
 const url = URL.createObjectURL(blob);
 const link = document.createElement('a');
 link.href = url;
 link.download = `mobile-inventory-bulk-${moment.format('YYYYMMDD-HHmmss')}.csv`;
 document.body.appendChild(link);
 link.click;
 link.remove;
 URL.revokeObjectURL(url);
 setNotification(buildBulkSuccessNotification('export', { selected: selectedPhones }));
 };

 const bulkSummary = useMemo(() => {
 const totalPurchase = selectedPhones.reduce((sum, phone) => sum + getPhoneCostBasisAmount(phone), 0);
 const totalSale = selectedPhones.reduce((sum, phone) => sum + Number(phone.salePrice || 0), 0);
 return {
 count: selectedPhones.length,
 totalPurchase,
 totalSale,
 potentialProfit: totalSale - totalPurchase,
 };
 }, [selectedPhones]);

 const selectionContext = useMemo(() => {
 if (selectedPhones.length === 0) return null;
 const count = selectedPhones.length;
 const returned = selectedPhones.filter((phone) => String(phone.status || '').includes('مرجوع')).length;
 const missingSale = selectedPhones.filter((phone) => !Number(phone.salePrice || 0)).length;
 const lowBattery = selectedPhones.filter((phone) => Number(phone.batteryHealth || 0) > 0 && Number(phone.batteryHealth || 0) < 80).length;
 const sellable = selectedPhones.filter((phone) => phone.status === 'موجود در انبار').length;
 const withoutSupplier = selectedPhones.filter((phone) => !phone.supplierId).length;

 const allReturned = returned === count;
 const allMissingSale = missingSale === count;
 const allLowBattery = lowBattery === count && lowBattery > 0;
 const allSellable = sellable === count;

 if (allReturned) {
 return {
 tone: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300',
 icon: 'fa-rotate-left',
 label: 'همه انتخاب‌ها مرجوعی هستند',
 hint: ' خروجی CSV بگیر و قبل از عرضه مجدد، وضعیت و قیمت‌گذاری را بازبینی کن.',
 recommendedAction: 'export' as 'export' | null,
 };
 }
 if (allMissingSale) {
 return {
 tone: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300',
 icon: 'fa-tags',
 label: 'همه انتخاب‌ها بدون قیمت فروش‌اند',
 hint: ' اول قیمت‌گذاری را کامل کن؛ بعد از آن خروجی گرفتن معنا پیدا می‌کند.',
 recommendedAction: null,
 };
 }
 if (allLowBattery) {
 return {
 tone: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-900/60 dark:bg-fuchsia-950/30 dark:text-fuchsia-300',
 icon: 'fa-battery-quarter',
 label: 'همه انتخاب‌ها کم‌باتری‌اند',
 hint: ' قیمت‌گذاری محافظه‌کارانه‌تر و ثبت اطلاعات توضیح فنی برای فروش یا مرجوعی را در اولویت بگذار.',
 recommendedAction: 'export' as 'export' | null,
 };
 }
 if (allSellable) {
 return {
 tone: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300',
 icon: 'fa-badge-check',
 label: 'همه انتخاب‌ها آماده فروش‌اند',
 hint: ' برای آماده‌سازی سریع، خروجی لیست فروش بگیر.',
 recommendedAction: undefined as 'export' | null,
 };
 }

 const issues = [
 missingSale > 0 ? `${missingSale.toLocaleString('fa-IR')} بی‌قیمت` : null,
 lowBattery > 0 ? `${lowBattery.toLocaleString('fa-IR')} کم‌باتری` : null,
 withoutSupplier > 0 ? `${withoutSupplier.toLocaleString('fa-IR')} بدون تامین‌کننده` : null,
 returned > 0 ? `${returned.toLocaleString('fa-IR')} مرجوعی` : null,
 ].filter(Boolean);

 return {
 tone: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300',
 icon: 'fa-wand-magic-sparkles',
 label: 'انتخاب ترکیبی با نیازهای مختلف',
 hint: issues.length > 0
 ? ` قبل از عملیات گروهی، این موارد را تفکیک کن: ${issues.slice(0, 3).join(' • ')}`
 : ' عملیات گروهی را بر اساس وضعیت و سود بالقوه این انتخاب‌ها جلو ببر.',
 recommendedAction: null,
 };
 }, [selectedPhones]);

 const selectionPreset = useMemo(() => {
 if (!selectionContext) return null;
 if (selectionContext.label.includes('مرجوعی')) {
 return {
 kind: 'bulk-status' as const,
 label: 'پریست گروهی: مرجوعی',
 hint: 'وضعیت روی مرجوعی تنظیم می‌شود تا عملیات بعدی سریع‌تر انجام شود.',
 icon: 'fa-rotate-left',
 };
 }
 if (selectionContext.label.includes('آماده فروش')) {
 return {
 kind: 'bulk-status' as const,
 label: 'پریست گروهی: موجود در انبار',
 hint: 'وضعیت روی موجود در انبار تنظیم می‌شود و ',
 icon: 'fa-badge-check',
 };
 }
 if (selectionContext.label.includes('بدون قیمت فروش')) {
 return {
 kind: 'pricing-workflow' as const,
 label: 'پریست عملیاتی: ورود به قیمت‌گذاری',
 hint: 'برای این انتخاب، بهترین قدم بعدی رفتن مستقیم به لیست بی‌قیمت‌ها و تکمیل قیمت‌گذاری است.',
 icon: 'fa-tags',
 };
 }
 if (selectionContext.label.includes('کم‌باتری')) {
 return {
 kind: 'export-review' as const,
 label: 'پریست عملیاتی: خروجی برای بازبینی',
 hint: 'برای انتخاب‌های کم‌باتری، خروجی CSV و بررسی و ادامه فنی قبل از قیمت‌گذاری پیشنهاد می‌شود.',
 icon: 'fa-battery-quarter',
 };
 }
 return {
 kind: 'smart-segment' as const,
 label: 'پریست ترکیبی: تفکیک هوشمند قبل از bulk',
 hint: 'انتخاب فعلی ترکیبی است؛ قبل از عملیات bulk بهتر است با درایلدان یا فیلتر، آن را تفکیک کنی.',
 icon: 'fa-wand-magic-sparkles',
 };
 }, [selectionContext]);

 useEffect(() => {
 if (selectedPhones.length === 0 || !selectionPreset) return;
 if (selectionPreset.kind === 'bulk-status') {
 const nextStatus = selectionPreset.label.includes('مرجوعی') ? 'مرجوعی' : 'موجود در انبار';
 setBulkStatusTarget((prev) => prev === 'all' ? nextStatus : prev);
 }
 }, [selectedPhones.length, selectionPreset]);

 const bulkActionWarnings = useMemo(() => {
 if (selectedPhones.length === 0) return [];
 const warnings: Array<{ tone: string; icon: string; text: string }> = [];
 const missingSale = selectedPhones.filter((phone) => !Number(phone.salePrice || 0)).length;
 const lowBattery = selectedPhones.filter((phone) => Number(phone.batteryHealth || 0) > 0 && Number(phone.batteryHealth || 0) < 80).length;
 const returned = selectedPhones.filter((phone) => String(phone.status || '').includes('مرجوع')).length;
 const withoutSupplier = selectedPhones.filter((phone) => !phone.supplierId).length;
 const lossRisk = selectedPhones.filter((phone) => Number(phone.salePrice || 0) > 0 && getPhoneCostBasisAmount(phone) > 0 && Number(phone.salePrice || 0) <= getPhoneCostBasisAmount(phone)).length;

 if (missingSale > 0) warnings.push({ tone: 'rose', icon: 'fa-tags', text: `${missingSale.toLocaleString('fa-IR')} دستگاه هنوز قیمت فروش ندارد.` });
 if (lowBattery > 0) warnings.push({ tone: 'amber', icon: 'fa-battery-quarter', text: `${lowBattery.toLocaleString('fa-IR')} دستگاه باتری زیر ۸۰٪ دارد.` });
 if (returned > 0) warnings.push({ tone: 'violet', icon: 'fa-rotate-left', text: `${returned.toLocaleString('fa-IR')} دستگاه در وضعیت مرجوعی است.` });
 if (withoutSupplier > 0) warnings.push({ tone: 'sky', icon: 'fa-user-slash', text: `${withoutSupplier.toLocaleString('fa-IR')} دستگاه تامین‌کننده ثبت اطلاعات‌شده ندارد.` });
 if (lossRisk > 0) warnings.push({ tone: 'rose', icon: 'fa-triangle-exclamation', text: `${lossRisk.toLocaleString('fa-IR')} دستگاه ریسک سود پایین یا منفی دارد.` });
 return warnings.slice(0, 4);
 }, [selectedPhones]);

 const bulkDiffPreview = useMemo(() => {
 if (selectedPhones.length === 0) return null;
 if (pendingBulkAction === 'status' && bulkStatusTarget !== 'all') {
 const unchanged = selectedPhones.filter((phone) => String(phone.status || '') === String(bulkStatusTarget));
 const changed = selectedPhones.filter((phone) => String(phone.status || '') !== String(bulkStatusTarget));
 return {
 tone: 'violet' as const,
 title: 'پیش‌نمایش وضعیت',
 icon: 'fa-arrows-rotate',
 summary: `${changed.length.toLocaleString('fa-IR')} دستگاه واقعاً از وضعیت فعلی به «${bulkStatusTarget}» می‌روند و ${unchanged.length.toLocaleString('fa-IR')} مورد بدون تغییر می‌مانند.`,
 items: changed.slice(0, 6).map((phone) => ({
 id: phone.id,
 label: phone.model,
 meta: phone.imei || 'IMEI نامشخص',
 from: phone.status || 'نامشخص',
 to: bulkStatusTarget,
 })),
 unchangedCount: unchanged.length,
 changedCount: changed.length,
 };
 }
 if (pendingBulkAction === 'supplier' && bulkSupplierTarget !== 'all') {
 const supplierLabel = partners.find((partner) => String(partner.id) === String(bulkSupplierTarget))?.partnerName || 'تامین‌کننده انتخاب‌شده';
 const unchanged = selectedPhones.filter((phone) => String(phone.supplierId || '') === String(bulkSupplierTarget));
 const changed = selectedPhones.filter((phone) => String(phone.supplierId || '') !== String(bulkSupplierTarget));
 return {
 tone: 'sky' as const,
 title: 'پیش‌نمایش تغییر تامین‌کننده',
 icon: 'fa-people-carry-box',
 summary: `${changed.length.toLocaleString('fa-IR')} دستگاه به «${supplierLabel}» تخصیص می‌گیرند و ${unchanged.length.toLocaleString('fa-IR')} مورد از قبل روی همین تامین‌کننده بوده‌اند.`,
 items: changed.slice(0, 6).map((phone) => ({
 id: phone.id,
 label: phone.model,
 meta: phone.imei || 'IMEI نامشخص',
 from: phone.supplierName || 'بدون تامین‌کننده',
 to: supplierLabel,
 })),
 unchangedCount: unchanged.length,
 changedCount: changed.length,
 };
 }
 return null;
 }, [pendingBulkAction, bulkStatusTarget, bulkSupplierTarget, selectedPhones, partners]);

 const bulkImpactSummary = useMemo(() => {
 if (selectedPhones.length === 0 || !pendingBulkAction) return null;

 const updatedPhones = selectedPhones.map((phone) => {
 if (pendingBulkAction === 'status' && bulkStatusTarget !== 'all') {
 return {...phone, status: bulkStatusTarget };
 }
 if (pendingBulkAction === 'supplier' && bulkSupplierTarget !== 'all') {
 const supplierLabel = partners.find((partner) => String(partner.id) === String(bulkSupplierTarget))?.partnerName || phone.supplierName;
 return {...phone, supplierId: bulkSupplierTarget, supplierName: supplierLabel };
 }
 return phone;
 });

 const countSellable = (phones: PhoneEntry[]) => phones.filter((phone) => phone.status === 'موجود در انبار').length;
 const countMissingSale = (phones: PhoneEntry[]) => phones.filter((phone) => !Number(phone.salePrice || 0)).length;
 const countWithoutSupplier = (phones: PhoneEntry[]) => phones.filter((phone) => !phone.supplierId).length;
 const countReturned = (phones: PhoneEntry[]) => phones.filter((phone) => String(phone.status || '').includes('مرجوع')).length;

 const before = {
 sellable: countSellable(selectedPhones),
 missingSale: countMissingSale(selectedPhones),
 withoutSupplier: countWithoutSupplier(selectedPhones),
 returned: countReturned(selectedPhones),
 };
 const after = {
 sellable: countSellable(updatedPhones),
 missingSale: countMissingSale(updatedPhones),
 withoutSupplier: countWithoutSupplier(updatedPhones),
 returned: countReturned(updatedPhones),
 };

 const changes = [
 { key: 'sellable', label: 'موجودی قابل فروش', icon: 'fa-badge-check', from: before.sellable, to: after.sellable },
 { key: 'missingSale', label: 'بی‌قیمت', icon: 'fa-tags', from: before.missingSale, to: after.missingSale },
 { key: 'withoutSupplier', label: 'بدون تامین‌کننده', icon: 'fa-user-slash', from: before.withoutSupplier, to: after.withoutSupplier },
 { key: 'returned', label: 'مرجوعی', icon: 'fa-rotate-left', from: before.returned, to: after.returned },
 ].filter((item) => item.from !== item.to);

 let headline = 'این عملیات بیشتر روی ساختار انتخاب اثر می‌گذارد و KPI مهمی را جابه‌جا نمی‌کند.';
 if (pendingBulkAction === 'status' && bulkStatusTarget !== 'all') {
 if (bulkStatusTarget === 'موجود در انبار') {
 headline = 'اثر اصلی: بخشی از انتخاب به موجودی قابل عرضه نزدیک می‌شود و دسته‌بندی عملیاتی مرور تغییر می‌کند.';
 } else if (String(bulkStatusTarget).includes('مرجوع')) {
 headline = 'اثر اصلی: موارد انتخاب‌شده از جریان عرضه جدا و وارد خوشه مرجوعی‌ها می‌شوند.';
 } else {
 headline = `اثر اصلی: وضعیت عملیاتی انتخاب روی «${bulkStatusTarget}» یکدست می‌شود و گزارش‌های وضعیت به‌روزرسانی می‌شوند.`;
 }
 }
 if (pendingBulkAction === 'supplier' && bulkSupplierTarget !== 'all') {
 headline = 'اثر اصلی: پوشش تامین انتخاب کامل‌تر می‌شود و گزارش‌های تامین‌کننده و تاریخچه حسابرسی همگام می‌شوند.';
 }

 return {
 headline,
 changes: changes.slice(0, 4),
 summaryBadges: [
 `قابل فروش: ${before.sellable.toLocaleString('fa-IR')} → ${after.sellable.toLocaleString('fa-IR')}`,
 `بی‌قیمت: ${before.missingSale.toLocaleString('fa-IR')} → ${after.missingSale.toLocaleString('fa-IR')}`,
 ],
 };
 }, [selectedPhones, pendingBulkAction, bulkStatusTarget, bulkSupplierTarget, partners]);

 const bulkActionPreview = useMemo(() => {
 if (!pendingBulkAction) return null;
 if (pendingBulkAction === 'status') {
 return {
 title: 'تایید وضعیت',
 icon: 'fa-arrows-rotate',
 confirmLabel: 'اعمال وضعیت',
 description: bulkStatusTarget === 'all'
 ? 'هنوز وضعیت مقصد انتخاب نشده است.'
 : `وضعیت ${bulkSummary.count.toLocaleString('fa-IR')} دستگاه انتخاب‌شده به «${bulkStatusTarget}» تغییر می‌کند.`,
 impact: bulkStatusTarget === 'all' ? 'لطفاً اول وضعیت مقصد را مشخص کن.' : ` دسته‌بندی انبار و گزارش‌های عملیاتی با وضعیت «${bulkStatusTarget}» همگام می‌شوند.`,
 disabled: bulkStatusTarget === 'all',
 };
 }
 if (pendingBulkAction === 'supplier') {
 const supplierLabel = partners.find((partner) => String(partner.id) === String(bulkSupplierTarget))?.partnerName || 'تامین‌کننده انتخاب‌شده';
 return {
 title: 'تایید تخصیص گروهی تامین‌کننده',
 icon: 'fa-people-carry-box',
 confirmLabel: 'ثبت اطلاعات تامین‌کننده',
 description: bulkSupplierTarget === 'all'
 ? 'هنوز تامین‌کننده مقصد انتخاب نشده است.'
 : `تامین‌کننده ${bulkSummary.count.toLocaleString('fa-IR')} دستگاه انتخاب‌شده روی «${supplierLabel}» تنظیم می‌شود.`,
 impact: bulkSupplierTarget === 'all' ? 'لطفاً اول تامین‌کننده مقصد را مشخص کن.' : ' پوشش زنجیره تامین، گزارش تامین‌کننده و تاریخچه دستگاه‌ها به‌روزرسانی می‌شود.',
 disabled: bulkSupplierTarget === 'all',
 };
 }
 if (pendingBulkAction === 'export') {
 return {
 title: 'تایید خروجی CSV انتخاب‌ها',
 icon: 'fa-file-csv',
 confirmLabel: 'ساخت خروجی CSV',
 description: `برای ${bulkSummary.count.toLocaleString('fa-IR')} دستگاه انتخاب‌شده فایل CSV حسابرسی و بازبینی ساخته می‌شود.`,
 impact: ' فایل خروجی برای تحلیل بیرونی، قیمت‌گذاری، بازبینی فنی یا ثبت اطلاعات مدیریتی آماده می‌شود.',
 disabled: false,
 };
 }
 return {
 title: 'تایید چاپ برچسب‌ها',
 icon: 'fa-print',
 confirmLabel: 'باز کردن پنجره',
 description: `برای ${bulkSummary.count.toLocaleString('fa-IR')} دستگاه انتخاب‌شده پنجره چاپ بارکد باز می‌شود.`,
 impact: ' برچسب‌های آماده برای آماده‌سازی فروش یا دسته‌بندی فیزیکی انبار تولید می‌شود.',
 disabled: false,
 };
 }, [pendingBulkAction, bulkStatusTarget, bulkSupplierTarget, bulkSummary.count, partners]);

 const requestBulkAction = (action: BulkConfirmAction) => {
 if (selectedPhones.length === 0) {
 setNotification({ type: 'error', text: 'ابتدا حداقل یک گوشی را برای عملیات گروهی انتخاب کن.' });
 return;
 }
 setPendingBulkAction(action);
 };

 const handleConfirmBulkAction = async () => {
 if (!pendingBulkAction || !bulkActionPreview || bulkActionPreview.disabled) return;
 try {
 setIsConfirmingBulkAction(true);
 if (pendingBulkAction === 'status') {
 await executeBulkStatusUpdate;
 } else if (pendingBulkAction === 'supplier') {
 await executeBulkSupplierAssign;
 } else if (pendingBulkAction === 'export') {
 executeBulkExport;
 }
 setPendingBulkAction(null);
 } finally {
 setIsConfirmingBulkAction(false);
 }
 };

 const duplicateImeiPhone = useMemo(() => {
 const imei = String(newPhone.imei || '').trim();
 if (!imei) return null;
 return phones.find((phone) => String(phone.imei || '').trim() === imei) || null;
 }, [newPhone.imei, phones]);

 const intakeSummary = useMemo(() => {
 const purchaseValue = Number(String(newPhone.purchasePrice || '').replace(/,/g, '')) || 0;
 const saleValue = Number(String(newPhone.salePrice || '').replace(/,/g, '')) || 0;
 const margin = saleValue - purchaseValue;
 const marginPercent = purchaseValue > 0 ? (margin / purchaseValue) * 100 : null;
 const batteryValue = Number(String(newPhone.batteryHealth || '').replace(/,/g, ''));
 const dataScoreParts = [
 newPhone.model?.trim(),
 newPhone.imei?.trim(),
 String(newPhone.purchasePrice || '').trim(),
 newPhone.supplierId,
 String(newPhone.salePrice || '').trim(),
 newPhone.color?.trim(),
 newPhone.notes?.trim(),
 ].filter(Boolean).length;
 const dataQuality = Math.min(100, Math.round((dataScoreParts / 7) * 100));
 const warnings: string[] = [];
 if (duplicateImeiPhone) warnings.push('این IMEI قبلاً در انبار ثبت اطلاعات شده و نیاز به بررسی و ادامه دارد.');
 if (purchaseValue > 0 && !newPhone.supplierId) warnings.push('برای ثبت اطلاعات خرید حرفه‌ای، تامین‌کننده را هم مشخص کن.');
 if (saleValue > 0 && purchaseValue > 0 && saleValue <= purchaseValue) warnings.push('قیمت فروش از بهای خرید کمتر یا مساوی است؛ حاشیه سود منفی یا صفر می‌شود.');
 if (!String(newPhone.salePrice || '').trim()) warnings.push('قیمت فروش هنوز ثبت اطلاعات نشده و دستگاه در تحلیل سود لحاظ کامل نمی‌شود.');
 if (!Number.isNaN(batteryValue) && String(newPhone.batteryHealth || '').trim() && batteryValue <= 75 && batteryValue >= 70) warnings.push('باتری در محدوده تعویض است؛ بهتر است در یادداشت و قیمت‌گذاری منعکس شود.');
 if (!Number.isNaN(batteryValue) && String(newPhone.batteryHealth || '').trim() && batteryValue < 70) warnings.push('وضعیت باتری بحرانی است؛ قبل از فروش یا قیمت‌گذاری حتماً شفاف ثبت اطلاعات شود.');
 if (!purchaseDateSelected) warnings.push('تاریخ خرید ثبت اطلاعات نشده؛ برای timeline و گزارش بعدی بهتر است تکمیل شود.');
 return { purchaseValue, saleValue, margin, marginPercent, batteryValue, dataQuality, warnings };
 }, [newPhone, duplicateImeiPhone, purchaseDateSelected]);

 const intakeReadinessTone = duplicateImeiPhone
 ? 'text-rose-600 dark:text-rose-300'
 : intakeSummary.dataQuality >= 85
 ? 'text-emerald-600 dark:text-emerald-300'
 : intakeSummary.dataQuality >= 55
 ? 'text-amber-600 dark:text-amber-300'
 : 'text-slate-600 dark:text-slate-300';

 const batteryBadge = useMemo(() => {
 const raw = intakeSummary.batteryValue;
 if (Number.isNaN(raw) || !String(newPhone.batteryHealth || '').trim()) {
 return { label: 'نامشخص', tone: 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300' };
 }
 if (raw >= 90) return { label: 'عالی', tone: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300' };
 if (raw >= 80) return { label: 'خوب', tone: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300' };
 if (raw >= 70) return { label: 'باتری تعویض باید بشود', tone: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300' };
 return { label: 'وضعیت باتری بحرانی', tone: 'border-rose-300 bg-rose-100 text-rose-800 dark:border-rose-900/70 dark:bg-rose-950/35 dark:text-rose-200' };
 }, [intakeSummary.batteryValue, newPhone.batteryHealth]);

 const modelPricingBenchmark = useMemo(() => {
 const modelKey = norm(newPhone.model || '');
 const sameModelPhones = phones.filter((phone) => norm(phone.model || '') === modelKey);
 const peers = sameModelPhones.filter((phone) => getPhoneCostBasisAmount(phone) > 0 && Number(phone.salePrice || 0) > 0);
 if (peers.length === 0) return null;
 const avgMarginPercent = peers.reduce((sum, phone) => sum + (((Number(phone.salePrice || 0) - getPhoneCostBasisAmount(phone)) / Math.max(getPhoneCostBasisAmount(phone), 1)) * 100), 0) / peers.length;
 const avgSale = peers.reduce((sum, phone) => sum + Number(phone.salePrice || 0), 0) / peers.length;
 const now = moment();
 const staleUnsoldCount = sameModelPhones.filter((phone) => {
 const status = String(phone.status || '');
 if (status.includes('فروخته') || status.includes('مرجوعی')) return false;
 const rawDate = String(phone.purchaseDate || phone.registerDate || '').trim();
 if (!rawDate) return false;
 return now.diff(moment(rawDate), 'days') >= pricingIntelligenceSettings.staleDaysThreshold;
 }).length;
 return { count: peers.length, avgMarginPercent, avgSale, staleUnsoldCount };
 }, [phones, newPhone.model, pricingIntelligenceSettings.staleDaysThreshold, phoneAiPriceSignalEnabled, phoneAiStrategyAdvisorEnabled]);

 const pricingBehaviorProfile = useMemo<PricingBehaviorProfile>(() => {
 if (!phonePricingBehaviorLearningEnabled) return { decisions: [], userModelDecisions: [], modelDecisions: [], userAvgMarkup: null, userModelAvgMarkup: null, modelAvgMarkup: null, acceptanceRate: null, confidence: 'پایین', label: 'یادگیری رفتار قیمت‌گذاری خاموش است' };
 const userKey = normalizePricingUserKey(currentUser);
 const modelKey = norm(newPhone.model || '');
 const decisions = pricingBehaviorDecisions.filter((item) => Number(item.purchasePrice) > 0 && Number(item.finalSale) > 0);
 const userDecisions = decisions.filter((item) => item.userKey === userKey);
 const modelDecisions = modelKey ? decisions.filter((item) => item.model === modelKey) : [];
 const userModelDecisions = modelKey ? decisions.filter((item) => item.userKey === userKey && item.model === modelKey) : [];
 const preferred = userModelDecisions.length >= 2 ? userModelDecisions : userDecisions.length >= 4 ? userDecisions : modelDecisions;
 const accepted = preferred.filter((item) => item.action === 'accepted').length;
 const overrideDeltas = preferred
 .filter((item) => item.suggestedSale > 0)
 .map((item) => ((item.finalSale - item.suggestedSale) / item.suggestedSale) * 100);
 const confidence = userModelDecisions.length >= 3 ? 'بالا' : userDecisions.length >= 5 || modelDecisions.length >= 4 ? 'متوسط' : 'پایین';
 const label = userModelDecisions.length >= 2
 ? `بر اساس ${userModelDecisions.length.toLocaleString('fa-IR')} تصمیم قبلی شما روی همین مدل`
 : userDecisions.length >= 4
 ? `بر اساس ${userDecisions.length.toLocaleString('fa-IR')} تصمیم قیمت‌گذاری قبلی شما`
 : modelDecisions.length > 0
 ? `بر اساس ${modelDecisions.length.toLocaleString('fa-IR')} تصمیم ثبت‌شده برای همین مدل`
 : 'هنوز رفتار قیمت‌گذاری کافی برای یادگیری ثبت نشده است';
 return {
 decisions: preferred,
 userModelDecisions,
 modelDecisions,
 userAvgMarkup: avg(userDecisions.map((item) => item.markupPercent)),
 userModelAvgMarkup: avg(userModelDecisions.map((item) => item.markupPercent)),
 modelAvgMarkup: avg(modelDecisions.map((item) => item.markupPercent)),
 acceptanceRate: preferred.length ? (accepted / preferred.length) * 100 : null,
 overrideBiasPercent: avg(overrideDeltas),
 confidence,
 label,
 };
 }, [pricingBehaviorDecisions, currentUser, newPhone.model, phonePricingBehaviorLearningEnabled]);

 const applyIntakePriceSuggestion = () => {
 if (!phoneAiPriceSignalEnabled || !(intakePriceSignal.suggestedSale > 0)) return;
 setNewPhone((prev) => ({ ...prev, salePrice: String(intakePriceSignal.suggestedSale) }));
 setPricingSuggestionApplied(true);
 setFormErrors((prev) => ({ ...prev, salePrice: undefined }));
 };

 const updatePricingIntelligenceSettings = (patch: Partial<PricingIntelligenceSettings>) => {
 setPricingIntelligenceSettings((prev) => {
 const next = clampPricingSettings({ ...prev, ...patch });
 persistPricingIntelligenceSettings(next);
 return next;
 });
 };

 const resetPricingIntelligenceSettings = () => {
 setPricingIntelligenceSettings(DEFAULT_PRICING_INTELLIGENCE_SETTINGS);
 persistPricingIntelligenceSettings(DEFAULT_PRICING_INTELLIGENCE_SETTINGS);
 };

 const resetPricingBehaviorLearning = () => {
 setPricingBehaviorDecisions([]);
 persistPricingBehaviorDecisions([]);
 setPricingSuggestionApplied(false);
 };

 const pricingLearningStats = useMemo(() => {
 if (!phonePricingBehaviorLearningEnabled) return { total: 0, accepted: 0, overridden: 0, modelCount: 0, learningPercent: 0, status: 'یادگیری خاموش' };
 const total = pricingBehaviorDecisions.length;
 const accepted = pricingBehaviorDecisions.filter((item) => item.action === 'accepted').length;
 const overridden = pricingBehaviorDecisions.filter((item) => item.action === 'overridden').length;
 const modelCount = new Set(pricingBehaviorDecisions.map((item) => item.model).filter(Boolean)).size;
 const learningPercent = clamp(Math.round((Math.min(total, 12) / 12) * 100), 0, 100);
 const status = total >= 12 ? 'یادگیری بالغ' : total >= 5 ? 'در حال یادگیری' : total > 0 ? 'شروع یادگیری' : 'بدون داده یادگیری';
 return { total, accepted, overridden, modelCount, learningPercent, status };
 }, [pricingBehaviorDecisions, phonePricingBehaviorLearningEnabled]);

 const pricingSettingsMeta = pricingStrategyMeta[pricingIntelligenceSettings.strategy];

 const intakePriceSignal = useMemo(() => {
 if (!phoneAiPriceSignalEnabled) {
 return { suggestedSale: 0, markupPercent: null as number | null, tone: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300', title: 'AI Price Signal خاموش است', summary: 'این فیچر از تنظیمات ماژول‌های تجاری خاموش شده و هیچ محاسبه قیمت پیشنهادی انجام نمی‌دهد.', confidence: 'خاموش' };
 }
 const purchaseValue = intakeSummary.purchaseValue;
 const saleValue = intakeSummary.saleValue;
 if (!(purchaseValue > 0)) {
 return {
 suggestedSale: 0,
 markupPercent: null as number | null,
 tone: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300',
 title: 'برای پیشنهاد قیمت، ابتدا بهای خرید را ثبت اطلاعات کن',
 summary: 'سیستم بعد از ثبت اطلاعات بهای خرید و مدل، قیمت پیشنهادی و سیگنال ریسک را می‌سازد.',
 confidence: 'پایین',
 };
 }

 const conditionAdjustments: Record<string, number> = {
 'در حد نو': 2.5,
 'عالی': 1.5,
 'تمیز': 0.5,
 'معمولی': -1.5,
 'خط و خش دار': -4.5,
 'نیازمند تعمیر': -8,
 };

 const learnedMarkup = pricingBehaviorProfile.userModelAvgMarkup ?? pricingBehaviorProfile.userAvgMarkup ?? pricingBehaviorProfile.modelAvgMarkup;
 const strategyMeta = pricingStrategyMeta[pricingIntelligenceSettings.strategy];
 const benchmarkMarkup = modelPricingBenchmark?.avgMarginPercent ?? pricingIntelligenceSettings.targetMarkupPercent;
 let markupPercent = learnedMarkup !== null && learnedMarkup !== undefined
 ? (learnedMarkup * 0.55) + (benchmarkMarkup * 0.25) + (pricingIntelligenceSettings.targetMarkupPercent * 0.2)
 : (benchmarkMarkup * 0.55) + (pricingIntelligenceSettings.targetMarkupPercent * 0.45);
 markupPercent += strategyMeta.markupBias;
 markupPercent += (pricingIntelligenceSettings.riskTolerance - 3) * 0.9;
 markupPercent += conditionAdjustments[newPhone.condition || ''] ?? 0;
 if (String(newPhone.batteryHealth || '').trim()) {
 const battery = Number(newPhone.batteryHealth || 0);
 if (battery >= 90) markupPercent += 1.5;
 else if (battery < 70) markupPercent -= 5;
 else if (battery < 80) markupPercent -= 2.5;
 }
 const minMarkup = pricingIntelligenceSettings.strategy === 'quick' ? 4 : 6;
 const maxMarkup = pricingIntelligenceSettings.strategy === 'profit' ? 30 : pricingIntelligenceSettings.strategy === 'balanced' ? 24 : 20;
 markupPercent = clamp(markupPercent, minMarkup, maxMarkup);

 const suggestedSale = roundMoney(purchaseValue * (1 + markupPercent / 100), pricingIntelligenceSettings.roundStep);
 const variance = saleValue > 0 ? ((saleValue - suggestedSale) / suggestedSale) * 100 : null;

 let tone = 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300';
 let title = 'قیمت‌گذاری در محدوده سالم است';
 let summary = saleValue > 0
 ? 'قیمت فروش فعلی با الگوی موجودی و کیفیت دستگاه هم‌راستاست.'
 : 'برای این دستگاه یک قیمت پیشنهادی اولیه بر اساس داده‌های موجود ساخته شد.';
 let confidence = pricingBehaviorProfile.confidence === 'بالا' ? 'بالا' : modelPricingBenchmark || pricingBehaviorProfile.confidence === 'متوسط' ? 'متوسط' : 'پایین';

 if (variance !== null && variance < -6) {
 tone = 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300';
 title = 'ریسک قیمت‌گذاری پایین‌تر از حد انتظار';
 summary = 'قیمت فروش فعلی نسبت به بهای خرید و الگوی مدل، پایین‌تر از بازه منطقی است و می‌تواند سود را بخورد.';
 } else if (variance !== null && variance > strategyMeta.varianceCeiling) {
 tone = 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300';
 title = 'قیمت‌گذاری تهاجمی‌تر از سیاست فعلی';
 summary = `قیمت فروش فعلی از سقف ریسک حالت ${strategyMeta.label} بالاتر است؛ اگر هدف فروش سریع نیست، با احتیاط قابل قبول است.`;
 } else if (modelPricingBenchmark && modelPricingBenchmark.staleUnsoldCount > 0 && pricingIntelligenceSettings.strategy !== 'profit') {
 tone = 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300';
 title = 'سیگنال راکدی برای همین مدل';
 summary = `${modelPricingBenchmark.staleUnsoldCount.toLocaleString('fa-IR')} دستگاه از همین مدل از آستانه راکدی ${pricingIntelligenceSettings.staleDaysThreshold.toLocaleString('fa-IR')} روز عبور کرده؛ حالت ${strategyMeta.label} قیمت را محافظه‌کارانه‌تر نگه می‌دارد.`;
 } else if (!modelPricingBenchmark && pricingBehaviorProfile.confidence === 'پایین') {
 summary = 'به‌دلیل کمبود پیش‌نمایش مشابه، این پیشنهاد بیشتر روی کیفیت دستگاه و بهای خرید تکیه دارد.';
 }

 if (pricingBehaviorProfile.confidence !== 'پایین') {
 summary = `${summary} ${pricingBehaviorProfile.label}؛ بنابراین پیشنهاد با رفتار واقعی قیمت‌گذاری شما هم تنظیم شده است.`;
 }
 summary = `${summary} سیاست فعلی: ${strategyMeta.label} با سود هدف ${pricingIntelligenceSettings.targetMarkupPercent.toLocaleString('fa-IR')}٪ و ریسک ${pricingIntelligenceSettings.riskTolerance.toLocaleString('fa-IR')} از ۵.`;

 return { suggestedSale, markupPercent, tone, title, summary, confidence };
 }, [phoneAiPriceSignalEnabled, intakeSummary.purchaseValue, intakeSummary.saleValue, newPhone.condition, newPhone.batteryHealth, modelPricingBenchmark, pricingBehaviorProfile, pricingIntelligenceSettings]);

 const intakeStrategyAdvisor = useMemo(() => {
 if (!phoneAiStrategyAdvisorEnabled) return { recommended: pricingIntelligenceSettings.strategy, title: 'AI Strategy Advisor خاموش است', reason: 'این فیچر از تنظیمات ماژول‌های تجاری خاموش شده است.', maturity: 'خاموش', icon: 'fa-power-off', tone: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300', canApply: false, cards: [] as Array<{ label: string; value: string; icon: string }> };
 const learningTotal = pricingLearningStats.total;
 const learningConfidence = learningTotal >= 12 ? 'بالا' : learningTotal >= 5 ? 'متوسط' : 'پایین';
 const currentStrategy = pricingIntelligenceSettings.strategy;
 const saleValue = intakeSummary.saleValue;
 const suggestedSale = Number(intakePriceSignal.suggestedSale || 0);
 const variancePercent = suggestedSale > 0 && saleValue > 0 ? ((saleValue - suggestedSale) / suggestedSale) * 100 : 0;
 const staleCount = Number(modelPricingBenchmark?.staleUnsoldCount || 0);
 const avgMargin = Number(modelPricingBenchmark?.avgMarginPercent || pricingBehaviorProfile.userModelAvgMarkup || pricingBehaviorProfile.userAvgMarkup || pricingIntelligenceSettings.targetMarkupPercent);
 let recommended: PricingStrategyMode = currentStrategy;
 let title = 'استراتژی فعلی برای این ثبت مناسب است';
 let reason = 'سیگنال‌های قیمت، رفتار قبلی شما و سیاست فعلی تضاد مهمی نشان نمی‌دهند؛ سیستم فعلاً پیشنهاد می‌کند با همین مسیر ادامه بدهی.';
 let icon = pricingStrategyMeta[currentStrategy].icon;
 let tone = 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-200';
 if (learningTotal < 4) {
 recommended = 'balanced';
 title = 'فعلاً اجازه بده سیستم یاد بگیرد';
 reason = 'داده رفتاری هنوز کم است؛ حالت متعادل امن‌ترین انتخاب است تا بعد از چند ثبت واقعی، پیشنهادها شخصی‌تر شوند.';
 icon = 'fa-seedling';
 tone = 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-200';
 } else if (staleCount > 0 || variancePercent < -6) {
 recommended = 'quick';
 title = 'برای این مدل فروش سریع منطقی‌تر است';
 reason = staleCount > 0
 ? `${staleCount.toLocaleString('fa-IR')} دستگاه از همین مدل نشانه راکدی دارد؛ کاهش ریسک قیمت و گردش سریع‌تر سرمایه بهتر است.`
 : 'قیمت فعلی یا رفتار اخیر به سمت پایین‌تر از پیشنهاد AI رفته؛ سیستم حالت فروش سریع را مناسب‌تر می‌بیند.';
 icon = 'fa-bolt';
 tone = 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200';
 } else if (variancePercent > 6 || avgMargin > pricingIntelligenceSettings.targetMarkupPercent + 3) {
 recommended = 'profit';
 title = 'فضا برای سود بالاتر وجود دارد';
 reason = 'قیمت فعلی یا رفتار قبلی شما نشان می‌دهد این مدل ظرفیت قیمت‌گذاری سودمحورتر دارد؛ اگر عجله فروش نداری، حالت حداکثر سود مناسب است.';
 icon = 'fa-gem';
 tone = 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-200';
 } else if (pricingBehaviorProfile.acceptanceRate !== null && pricingBehaviorProfile.acceptanceRate >= 70) {
 recommended = 'balanced';
 title = 'AI با سبک قیمت‌گذاری شما هماهنگ شده';
 reason = 'نرخ قبول پیشنهادها بالاست و اختلاف رفتار کاربر با پیشنهاد سیستم کم شده؛ حالت متعادل بهترین تعادل بین سود و سرعت فروش است.';
 icon = 'fa-bullseye';
 tone = 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200';
 }
 const cards = [
 { label: 'استراتژی پیشنهادی', value: pricingStrategyMeta[recommended].label, icon },
 { label: 'اطمینان تحلیل', value: learningConfidence, icon: 'fa-shield-check' },
 { label: 'اختلاف با AI', value: suggestedSale > 0 && saleValue > 0 ? `${variancePercent > 0 ? '+' : ''}${Math.round(variancePercent).toLocaleString('fa-IR')}٪` : 'در انتظار قیمت', icon: 'fa-code-compare' },
 ];
 return { recommended, title, reason, icon, tone, cards, canApply: recommended !== currentStrategy };
 }, [phoneAiStrategyAdvisorEnabled, pricingLearningStats.total, pricingIntelligenceSettings, intakeSummary.saleValue, intakePriceSignal.suggestedSale, modelPricingBenchmark, pricingBehaviorProfile]);

 const applyIntakeAdvisorStrategy = () => {
 updatePricingIntelligenceSettings({ strategy: intakeStrategyAdvisor.recommended });
 };

 const inventoryAIPrompt = useMemo(() => {
 if (inventoryIntelligence.lossRisk.length > 0) return 'اول قیمت دستگاه‌های کم‌سود یا زیان‌ده را بازبینی کن؛ این‌ها سریع‌ترین نقطه نشت سود هستند.';
 if (inventoryIntelligence.stale60.length > 0) return 'روی راکدهای ۶۰ روز به بالا تخفیف یا بسته فروش سریع تعریف کن تا سرمایه در گردش آزاد شود.';
 if (inventoryIntelligence.missingSale.length > 0) return 'دستگاه‌های بدون قیمت فروش را تکمیل کن تا آماده عرضه شوند.';
 if (inventoryIntelligence.fastMoving.length > 0) return `مدل «${inventoryIntelligence.fastMoving[0].model}» سیگنال گردش خوبی دارد؛ موجودی آن را هوشمندانه نگه دار.`;
 return 'الان انبار در وضعیت متعادل است؛ تمرکز را روی کامل‌ماندن داده‌ها و حفظ سرعت ورودی بگذار.';
 }, [inventoryIntelligence]);

 const kpiCards = [
 {
 key: 'sellable',
 label: 'موجودی قابل فروش',
 value: inventoryMetrics.sellable.length.toLocaleString('fa-IR'),
 hint: 'گوشی‌های آماده فروش یا بازگشتی قابل عرضه',
 icon: 'fa-mobile-screen-button',
 tone: 'from-sky-500/14 via-cyan-500/10 to-transparent border-sky-200/70 dark:border-sky-900/60',
 drilldown: { kind: 'sellable', value: 'sellable', label: 'موجودی قابل فروش' } as DashboardDrilldown,
 },
 {
 key: 'purchase',
 label: 'ارزش خرید کل',
 value: formatPrice(inventoryMetrics.totalPurchaseValue),
 hint: 'بهای تمام‌شده موجودی قابل فروش',
 icon: 'fa-sack-dollar',
 tone: 'from-emerald-500/14 via-green-500/10 to-transparent border-emerald-200/70 dark:border-emerald-900/60',
 drilldown: { kind: 'sellable', value: 'sellable', label: 'ارزش خرید کل موجودی' } as DashboardDrilldown,
 },
 {
 key: 'sale',
 label: 'ارزش فروش کل',
 value: formatPrice(inventoryMetrics.totalSaleValue),
 hint: 'مجموع قیمت فروش تعریف‌شده برای موجودی',
 icon: 'fa-coins',
 tone: 'from-violet-500/14 via-fuchsia-500/10 to-transparent border-violet-200/70 dark:border-violet-900/60',
 drilldown: { kind: 'pricedInventory', value: 'priced', label: 'موجودی قیمت‌گذاری‌شده' } as DashboardDrilldown,
 },
 {
 key: 'profit',
 label: 'سود بالقوه',
 value: formatPrice(inventoryMetrics.potentialProfit),
 hint: 'اختلاف ارزش فروش و خرید فعلی',
 icon: 'fa-chart-simple',
 tone: 'from-amber-500/14 via-orange-500/10 to-transparent border-amber-200/70 dark:border-amber-900/60',
 drilldown: { kind: 'profitableInventory', value: 'profitable', label: 'موجودی سودده' } as DashboardDrilldown,
 },
 {
 key: 'missingSale',
 label: 'بدون قیمت فروش',
 value: inventoryMetrics.withoutSalePrice.length.toLocaleString('fa-IR'),
 hint: 'دستگاه‌هایی که هنوز قیمت فروش نگرفته‌اند',
 icon: 'fa-tags',
 tone: 'from-rose-500/14 via-pink-500/10 to-transparent border-rose-200/70 dark:border-rose-900/60',
 drilldown: { kind: 'missingSale', value: 'missing-sale', label: 'بدون قیمت فروش' } as DashboardDrilldown,
 },
 {
 key: 'stale',
 label: 'راکدهای ۳۰+ روز',
 value: inventoryMetrics.stalePhones.length.toLocaleString('fa-IR'),
 hint: 'نیازمند قیمت‌گذاری یا اقدام سریع',
 icon: 'fa-hourglass-half',
 tone: 'from-slate-500/14 via-slate-400/10 to-transparent border-slate-200/70 dark:border-slate-800/80',
 drilldown: { kind: 'staleAll', value: '30+', label: 'راکدهای ۳۰+ روز' } as DashboardDrilldown,
 },
 ];

 // ───────────── render
 return (
 <div className="mobile-phones-redesign-v1 inventory-mobile-foundation mx-auto max-w-7xl space-y-3 px-4 text-right" dir="rtl" data-ui-inventory-page="mobile-phones" data-ui-inventory-scope="phones" style={{ ['--brand' as any]: brand }}>
 {/* dark popover overrides for common date pickers */}
 <style>{`.rmdp-wrapper,.react-datepicker,.date-picker-pop,.rdp { background-color: #111827 !important; color:#e5e7eb !important; }.rmdp-day,.react-datepicker__day { color:#e5e7eb !important; }.rmdp-day.rmdp-selected span,.react-datepicker__day--selected { background:${brand} !important; color:#fff !important; }.inventory-glass-sheen:after { content:''; position:absolute; inset:-1px; background:linear-gradient(120deg,transparent 12%,rgba(255,255,255,0.22) 32%,transparent 52%); opacity:.55; pointer-events:none; }.inventory-premium-scroll:-webkit-scrollbar { height:10px; width:10px; }.inventory-premium-scroll:-webkit-scrollbar-thumb { background:rgba(148,163,184,0.45); border-radius:999px; }
 `}</style><Notification message={notification} onClose={() => setNotification(null)} /><section className="grid grid-cols-1 gap-3"><div className="space-y-3"><div className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_26px_60px_-40px_rgba(15,23,42,0.28)] dark:border-slate-800 dark:bg-slate-900/85"><div className="mb-6 flex flex-col gap-3 border-b border-slate-200 pb-4 dark:border-slate-800"><div className="inline-flex w-fit items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-black tracking-[0.16em] text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"><i className="fa-solid fa-mobile-screen-button" style={{ color: brand }} />
 DEVICE REGISTRATION
 </div><div className="flex flex-col gap-1"><h2 className="text-xl font-black text-slate-900 dark:text-slate-50">ثبت اطلاعات گوشی</h2></div></div><form onSubmit={handleSubmit} className="space-y-3">{hasPhoneFormErrors ? <FormErrorSummary errors={formErrors as any} labels={phoneFormErrorLabels} fieldIdMap={phoneFormFieldIdMap} /> : null}<div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_21.5rem]"><div className="order-1 space-y-3 xl:order-1"><section className="phone-identity-block rounded-[24px] border border-slate-200/80 bg-slate-50/70 p-[1.125rem] dark:border-slate-800 dark:bg-slate-950/45"><div className="phone-identity-block__header mb-4 flex flex-col gap-3 border-b border-slate-200/80 pb-3 dark:border-slate-800/90 sm:flex-row sm:items-start sm:justify-between"><div><div className="text-[11px] font-black tracking-[0.16em] text-slate-500 dark:text-slate-400">DEVICE IDENTITY</div><h3 className="mt-1 text-base font-black text-slate-900 dark:text-slate-50">هویت دستگاه</h3></div><div className="text-xs text-slate-500 dark:text-slate-400">مدل، IMEI و مشخصات پایه برای شناسایی دقیق</div></div><div className="phone-identity-block__grid grid grid-cols-1 gap-x-4 gap-y-5 md:grid-cols-6 xl:grid-cols-12"><div className="phone-identity-block__field phone-identity-block__field--model md:col-span-3 xl:col-span-6"><label className={labelClass}><i className="fa-solid fa-mobile-screen" style={{ color: brand }} /> مدل <span className="text-rose-500">*</span></label><AddableAutocomplete
 value={newPhone.model}
 onChange={(v) => handleInputChange({ target: { name: 'model', value: v } })}
 options={phoneModels}
 onAdd={addPhoneModel}
 preview="مثال: iPhone 13 Pro"
 inputClassName={`${inputClass('model')} text-left pr-11`}
 errorText={formErrors.model}
 dir="ltr"
 /></div><div className="phone-identity-block__field phone-identity-block__field--imei md:col-span-3 xl:col-span-6"><label className={labelClass}><i className="fa-solid fa-sim-card" style={{ color: brand }} /> IMEI <span className="text-rose-500">*</span></label><div className="space-y-3"><input id="imei" name="imei" value={newPhone.imei} onChange={handleInputChange} className={inputClass('imei')} placeholder="۱۵ یا ۱۶ رقم" dir="ltr" /><div className={`rounded-2xl border px-3 py-2 text-xs ${duplicateImeiPhone ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300' : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300'}`}>
 {duplicateImeiPhone ? `IMEI تکراری است؛ دستگاه مشابه با مدل «${duplicateImeiPhone.model}» قبلاً ثبت اطلاعات شده.` : 'IMEI فعلاً در لیست فعلی تکراری دیده نشد.'}
 </div></div>
 {formErrors.imei && <p className="mt-1 text-xs text-rose-500">{formErrors.imei}</p>}
 </div><div className="phone-identity-block__field phone-identity-block__field--color md:col-span-2 md:row-start-2 xl:col-span-4 xl:row-start-2"><label className={labelClass}><i className="fa-solid fa-palette" style={{ color: brand }} /> رنگ</label><AddableAutocomplete
 value={newPhone.color || ''}
 onChange={(v) => handleInputChange({ target: { name: 'color', value: v } })}
 options={phoneColors}
 onAdd={addPhoneColor}
 preview="مثال: Graphite"
 inputClassName={`${inputClass('color')} text-left pr-11`}
 /></div><div className="md:col-span-2 md:row-start-2 xl:col-span-4 xl:row-start-2"><label className={labelClass}><i className="fa-solid fa-memory" style={{ color: brand }} /> حافظه</label><select name="storage" value={newPhone.storage} onChange={handleInputChange} className={inputClass('storage', true)}>
 {PHONE_STORAGE_OPTIONS.map(s =><option key={s} value={s}>{s}</option>)}
 </select></div><div className="md:col-span-2 md:row-start-2 xl:col-span-4 xl:row-start-2"><label className={labelClass}><i className="fa-solid fa-microchip" style={{ color: brand }} /> رم</label><select name="ram" value={newPhone.ram} onChange={handleInputChange} className={inputClass('ram', true)}>
 {PHONE_RAM_OPTIONS.map(r =><option key={r} value={r}>{r}</option>)}
 </select></div></div></section><section className="rounded-[24px] border border-slate-200/80 bg-slate-50/70 p-[1.125rem] dark:border-slate-800 dark:bg-slate-950/45"><div className="mb-4 flex flex-col gap-3 border-b border-slate-200/80 pb-3 dark:border-slate-800/90 sm:flex-row sm:items-center sm:justify-between"><div><div className="text-[11px] font-black tracking-[0.16em] text-slate-500 dark:text-slate-400">PHYSICAL & TECHNICAL</div><h3 className="mt-1 text-base font-black text-slate-900 dark:text-slate-50">وضعیت فنی و ظاهری</h3></div><div className="text-xs text-slate-500 dark:text-slate-400">سلامت، ظاهر و شفافیت لازم برای فروش مطمئن</div></div><div className="grid grid-cols-1 gap-x-4 gap-y-5 md:grid-cols-6 xl:grid-cols-12"><div className="md:col-span-3 xl:col-span-4"><label className={labelClass}><i className="fa-solid fa-shield-heart" style={{ color: brand }} /> وضعیت ظاهری</label><select name="condition" value={newPhone.condition} onChange={handleInputChange} className={inputClass('condition', true)}>
 {PHONE_CONDITIONS.map(c =><option key={c} value={c}>{c}</option>)}
 </select></div><div className="md:col-span-2 xl:col-span-2"><label className={labelClass}><i className="fa-solid fa-battery-three-quarters" style={{ color: brand }} /> سلامت باتری</label><div className="space-y-3"><input id="batteryHealth" type="number" name="batteryHealth" value={newPhone.batteryHealth} onChange={handleInputChange} className={inputClass('batteryHealth')} placeholder="مثال: ۹۵" min={0} max={100} /><div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-black ${batteryBadge.tone}`}><i className="fa-solid fa-battery-half" />
 {batteryBadge.label}
 </div></div>
 {formErrors.batteryHealth && <p className="mt-1 text-xs text-rose-500">{formErrors.batteryHealth}</p>}
 </div><div className="md:col-span-3 xl:col-span-6"><label className={labelClass}><i className="fa-solid fa-calendar-days" style={{ color: brand }} /> تاریخ خرید</label><div id="purchaseDate" data-field-key="purchaseDate"><ShamsiDatePicker selectedDate={purchaseDateSelected} onDateChange={setPurchaseDateSelected} inputClassName={inputClass('purchaseDate')} />
 </div>
 {formErrors.purchaseDate && <p className="mt-1 text-xs text-rose-500">{formErrors.purchaseDate}</p>}
 </div></div></section><section className="phone-finance-block rounded-[24px] border border-slate-200/80 bg-slate-50/70 p-[1.125rem] dark:border-slate-800 dark:bg-slate-950/45"><div className="phone-finance-block__header mb-4 flex flex-col gap-3 border-b border-slate-200/80 pb-3 dark:border-slate-800/90 sm:flex-row sm:items-start sm:justify-between"><div><div className="text-[11px] font-black tracking-[0.16em] text-slate-500 dark:text-slate-400">FINANCE & SUPPLY</div><h3 className="mt-1 text-base font-black text-slate-900 dark:text-slate-50">مالی و تامین</h3></div><div className="text-xs text-slate-500 dark:text-slate-400">قیمت‌گذاری، حاشیه سود و منبع ورود دستگاه</div></div><div className="phone-finance-block__grid grid grid-cols-1 gap-x-4 gap-y-5 md:grid-cols-6 xl:grid-cols-12"><div className="phone-finance-block__field phone-finance-block__field--purchase md:col-span-2 xl:col-span-3"><PriceInput id="purchasePrice" name="purchasePrice" value={String(newPhone.purchasePrice)} onChange={handleInputChange} className={`${inputClass('purchasePrice')} text-left`} preview="مثال: ۳۵۰۰۰۰۰۰" topLabel="بهای خرید" suffix="تومان" />
 {formErrors.purchasePrice && <p className="mt-1 text-xs text-rose-500">{formErrors.purchasePrice}</p>}
 </div><div className="phone-finance-block__field phone-finance-block__field--sale md:col-span-2 xl:col-span-3"><PriceInput id="salePrice" name="salePrice" value={String(newPhone.salePrice || '')} onChange={handleInputChange} className={`${inputClass('salePrice')} text-left`} preview="مثال: ۳۸۵۰۰۰۰۰" topLabel="قیمت فروش" suffix="تومان" />
 {formErrors.salePrice && <p className="mt-1 text-xs text-rose-500">{formErrors.salePrice}</p>}
 </div><div className="phone-finance-block__field phone-finance-block__field--supplier md:col-span-2 xl:col-span-6"><label className={labelClass}><i className="fa-solid fa-people-carry-box" style={{ color: brand }} /> تامین‌کننده</label><select id="supplierId" name="supplierId" value={newPhone.supplierId || ''} onChange={handleInputChange} className={inputClass('supplierId', true)} disabled={isFetchingPartners}><option value="">-- انتخاب تامین‌کننده --</option>
 {partners.map(p =><option key={p.id} value={p.id}>{p.partnerName}</option>)}
 </select>
 {isFetchingPartners && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">درحال بارگذاری…</p>}
 {formErrors.supplierId && <p className="mt-1 text-xs text-rose-500">{formErrors.supplierId}</p>}
 </div></div></section><section className="phone-operations-block rounded-[24px] border border-slate-200/80 bg-slate-50/70 p-[1.125rem] dark:border-slate-800 dark:bg-slate-950/45"><div className="phone-operations-block__header mb-4 flex flex-col gap-3 border-b border-slate-200/80 pb-3 dark:border-slate-800/90 sm:flex-row sm:items-start sm:justify-between"><div><div className="text-[11px] font-black tracking-[0.16em] text-slate-500 dark:text-slate-400">OPERATIONS</div><h3 className="mt-1 text-base font-black text-slate-900 dark:text-slate-50">وضعیت عملیاتی</h3></div><div className="text-xs text-slate-500 dark:text-slate-400">وضعیت فعلی و یادداشت مدیریتی برای تصمیم‌های بعدی</div></div><div className="phone-operations-block__grid grid grid-cols-1 gap-x-4 gap-y-5 md:grid-cols-6 xl:grid-cols-12"><div className="phone-operations-block__field phone-operations-block__field--status md:col-span-2 xl:col-span-3"><label className={labelClass}><i className="fa-solid fa-check-circle" style={{ color: brand }} /> وضعیت</label><select id="status" name="status" value={newPhone.status} onChange={handleInputChange} className={inputClass('status', true)}>
 {PHONE_STATUSES.map(s =><option key={s} value={s}>{s}</option>)}
 </select>
 {formErrors.status && <p className="mt-1 text-xs text-rose-500">{formErrors.status}</p>}
 </div><div className="phone-operations-block__field phone-operations-block__field--notes md:col-span-4 xl:col-span-9"><label className={labelClass}><i className="fa-solid fa-note-sticky" style={{ color: brand }} /> یادداشت مدیریتی</label><textarea name="notes" value={newPhone.notes || ''} onChange={handleInputChange} rows={5} className={`${inputClass('notes')} resize-y leading-7`} placeholder="نکات ظاهری، رجیستری، ایراد خاص یا توضیح فروش" /></div></div></section><div className="phone-register-submitbar flex flex-col gap-3 rounded-[24px] border border-slate-200/80 bg-white/90 p-4 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-950/50 sm:flex-row sm:items-center sm:justify-between"><div><div className="text-[13px] font-black text-slate-900 dark:text-slate-50">ثبت اطلاعات گوشی</div><div className="mt-1 text-xs text-slate-500 dark:text-slate-400">ثبت اطلاعات و نهایی‌سازی دستگاه جدید</div></div><div className="flex flex-col gap-3 sm:flex-row sm:items-center"><Button
 type="submit"
 disabled={isLoading || isFetching || isFetchingPartners || !token || !!duplicateImeiPhone}
 loading={isLoading}
 loadingText="در حال افزودن مورد جدید..."
 loadingHint="اعتبارسنجی، ثبت اطلاعات گوشی، به‌روزرسانی موجودی و همگام‌سازی لیست"
 successPulseText="گوشی ثبت اطلاعات شد"
 successPulseHint="ورودی انبار و لیست گوشی‌ها با موفقیت به‌روزرسانی شد"
 variant="primary"
 size="md"
 className="phone-register-submitbar__submit w-full px-6 sm:w-auto"
 leftIcon={<i className="fa-solid fa-plus" />}
 >
 افزودن مورد جدید گوشی
 </Button><Button type="button" variant="secondary" size="md" className="phone-register-submitbar__reset w-full sm:w-auto" onClick={() => { setNewPhone(initialNewPhoneState); setPurchaseDateSelected(null); setFormErrors({}); }}>
 پاک‌سازی فرم
 </Button></div></div></div><aside className="order-2 space-y-3 xl:order-2 xl:sticky xl:top-6 xl:h-fit xl:max-w-[21.5rem]"><div className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.98),rgba(248,250,252,0.94)_55%,rgba(241,245,249,0.92)_100%)] p-4 shadow-[0_24px_52px_-36px_rgba(15,23,42,0.28)] dark:border-slate-800 dark:bg-[radial-gradient(circle_at_top_right,rgba(30,41,59,0.92),rgba(15,23,42,0.94)_55%,rgba(2,6,23,0.96)_100%)]"><div className="flex items-center justify-between gap-3"><div><div className="text-[11px] font-black tracking-[0.16em] text-slate-500 dark:text-slate-400">LIVE SUMMARY</div><h3 className="mt-1 text-base font-black text-slate-900 dark:text-slate-50">خلاصه زنده ثبت اطلاعات</h3></div><span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/70 bg-white/80 text-slate-700 shadow-[0_18px_32px_-24px_rgba(15,23,42,0.28)] dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200"><i className="fa-solid fa-chart-simple" style={{ color: brand }} /></span></div><div className="mt-4 grid grid-cols-2 gap-2.5"><div className="rounded-[18px] border border-slate-200/80 bg-white/80 px-3.5 py-3 dark:border-slate-800 dark:bg-slate-950/50"><div className="flex items-center gap-1.5 text-[10px] font-black tracking-[0.12em] text-slate-500 dark:text-slate-400"><i className="fa-solid fa-sack-dollar" /> بهای خرید</div><div className="mt-1.5 text-[13px] font-black text-slate-900 dark:text-slate-50">{formatPrice(intakeSummary.purchaseValue)}</div></div><div className="rounded-[18px] border border-slate-200/80 bg-white/80 px-3.5 py-3 dark:border-slate-800 dark:bg-slate-950/50"><div className="flex items-center gap-1.5 text-[10px] font-black tracking-[0.12em] text-slate-500 dark:text-slate-400"><i className="fa-solid fa-tags" /> قیمت فروش</div><div className="mt-1.5 text-[13px] font-black text-slate-900 dark:text-slate-50">{formatPrice(intakeSummary.saleValue)}</div></div><div className="rounded-[18px] border border-slate-200/80 bg-white/80 px-3.5 py-3 dark:border-slate-800 dark:bg-slate-950/50"><div className="flex items-center gap-1.5 text-[10px] font-black tracking-[0.12em] text-slate-500 dark:text-slate-400"><i className="fa-solid fa-chart-line" /> سود تقریبی</div><div className={`mt-1.5 text-[13px] font-black ${intakeSummary.margin >= 0 ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300'}`}>{formatPrice(intakeSummary.margin)}</div></div><div className="rounded-[18px] border border-slate-200/80 bg-white/80 px-3.5 py-3 dark:border-slate-800 dark:bg-slate-950/50"><div className="flex items-center gap-1.5 text-[11px] font-black tracking-[0.12em] text-slate-500 dark:text-slate-400"><i className="fa-solid fa-percent" /> مارجین</div><div className="mt-2 text-[13px] font-black text-slate-900 dark:text-slate-50">{intakeSummary.marginPercent === null ? 'نامشخص' : `${Number(intakeSummary.marginPercent.toFixed(1)).toLocaleString('fa-IR')}٪`}</div></div></div>{phoneAiPricingSettingsEnabled ? <div className="mt-4 rounded-[20px] border border-indigo-200/70 bg-indigo-50/70 p-4 text-indigo-900 shadow-[0_18px_38px_-32px_rgba(79,70,229,0.35)] dark:border-indigo-900/50 dark:bg-indigo-950/25 dark:text-indigo-100"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="text-[11px] font-black tracking-[0.14em] opacity-75">استراتژی قیمت‌گذاری</div><div className="mt-1 flex items-center gap-2 text-[13px] font-black"><i className={`fa-solid ${pricingSettingsMeta.icon}`} /> {pricingSettingsMeta.label}</div><p className="mt-1 text-[11px] leading-5 opacity-80">فقط سیاست پایه این ثبت را انتخاب کن؛ جزئیات پیشرفته از تنظیمات کنترل می‌شود.</p></div><select value={pricingIntelligenceSettings.strategy} onChange={(e) => updatePricingIntelligenceSettings({ strategy: e.target.value as PricingStrategyMode })} className="h-10 min-w-[8.5rem] rounded-2xl border border-current/15 bg-white/75 px-3 text-xs font-black outline-none dark:bg-slate-950/35"><option value="quick">فروش سریع</option><option value="balanced">متعادل</option><option value="profit">حداکثر سود</option></select></div></div> : null}{phoneAiPriceSignalEnabled ? <div className={`mt-4 rounded-[20px] border p-4 ${intakePriceSignal.tone}`}><div className="flex items-center justify-between gap-3"><div><div className="text-[11px] font-black tracking-[0.14em] opacity-80">AI PRICE SIGNAL</div><div className="mt-1 text-[13px] font-black">{intakePriceSignal.title}</div></div><span className="inline-flex items-center gap-1.5 rounded-full border border-current/15 bg-white/70 px-2.5 py-1 text-[11px] font-black dark:bg-slate-950/30"><i className="fa-solid fa-star" /> اطمینان {intakePriceSignal.confidence}</span></div><div className="mt-3 grid grid-cols-2 gap-3 text-sm"><div className="rounded-[16px] border border-current/10 bg-white/65 p-3 dark:bg-slate-950/30"><div className="text-[11px] font-black tracking-[0.12em] opacity-80">قیمت پیشنهادی</div><div className="mt-2 font-black">{intakePriceSignal.suggestedSale > 0 ? formatPrice(intakePriceSignal.suggestedSale) : '—'}</div></div><div className="rounded-[16px] border border-current/10 bg-white/65 p-3 dark:bg-slate-950/30"><div className="text-[11px] font-black tracking-[0.12em] opacity-80">مارکاپ پیشنهادی</div><div className="mt-2 font-black">{intakePriceSignal.markupPercent === null ? '—' : `${Number(intakePriceSignal.markupPercent.toFixed(1)).toLocaleString('fa-IR')}٪`}</div></div></div><p className="mt-3 text-xs leading-6 opacity-90">{intakePriceSignal.summary}</p><div className="mt-3 flex flex-wrap items-center gap-2"><Button type="button" size="sm" variant="primary" onClick={applyIntakePriceSuggestion} disabled={!(intakePriceSignal.suggestedSale > 0)} leftIcon={<i className="fa-solid fa-wand-magic-sparkles" />}>اعمال قیمت پیشنهادی</Button><span className="inline-flex items-center gap-1.5 rounded-full border border-current/15 bg-white/60 px-2.5 py-1 text-[11px] font-black dark:bg-slate-950/30"><i className="fa-solid fa-brain" /> یادگیری {pricingBehaviorProfile.confidence}</span></div>{modelPricingBenchmark && (<div className="mt-2 text-[11px] opacity-80">بر پایه {modelPricingBenchmark.count.toLocaleString('fa-IR')} پیش‌نمایش مشابه با میانگین فروش {formatPrice(roundMoney(modelPricingBenchmark.avgSale))}</div>)}</div> : null}<div className="mt-4 rounded-[20px] border border-slate-200/80 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-950/60"><div className="flex items-center justify-between gap-3"><div className="text-[11px] font-black tracking-[0.14em] text-slate-500 dark:text-slate-400">READINESS</div><div className={`text-xs font-black ${intakeReadinessTone}`}>{duplicateImeiPhone ? 'نیازمند بررسی و ادامه' : intakeSummary.dataQuality >= 85 ? 'آماده ثبت اطلاعات' : 'در حال تکمیل'}</div></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"><div className="h-full rounded-full transition-all" style={{ width: `${intakeSummary.dataQuality}%`, background: brand }} /></div><div className="mt-2 text-xs text-slate-500 dark:text-slate-400">کیفیت داده ورودی: {intakeSummary.dataQuality.toLocaleString('fa-IR')}٪</div></div>{phoneSmartWarningsEnabled ? <div className="mt-4 space-y-3"><div className="text-[11px] font-black tracking-[0.14em] text-slate-500 dark:text-slate-400">SMART WARNINGS</div>{intakeSummary.warnings.length === 0 ? (<div className="rounded-[18px] border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">همه‌چیز برای یک ثبت اطلاعات تمیز و حرفه‌ای آماده است.</div>) : (intakeSummary.warnings.slice(0, 4).map((warning, index) => (<div key={index} className="rounded-[18px] border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">{warning}</div>)))}</div> : null}<div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div className="rounded-[18px] border border-slate-200/80 bg-white/80 px-4 py-3.5 dark:border-slate-800 dark:bg-slate-950/60"><div className="flex items-center gap-1.5 text-[11px] font-black tracking-[0.12em] text-slate-500 dark:text-slate-400"><i className="fa-solid fa-battery-half" /> باتری</div><div className="mt-2 font-black text-slate-900 dark:text-slate-50">{String(newPhone.batteryHealth || '').trim() ? `${newPhone.batteryHealth}٪` : 'ثبت اطلاعات نشده'}</div></div><div className="rounded-[18px] border border-slate-200/80 bg-white/80 px-4 py-3.5 dark:border-slate-800 dark:bg-slate-950/60"><div className="flex items-center gap-1.5 text-[11px] font-black tracking-[0.12em] text-slate-500 dark:text-slate-400"><i className="fa-solid fa-truck" /> تامین</div><div className="mt-2 font-black text-slate-900 dark:text-slate-50">{partners.find((p) => String(p.id) === String(newPhone.supplierId || ''))?.partnerName || 'ثبت اطلاعات نشده'}</div></div></div></div></aside></div></form></div></div><div ref={explorerRef} className="space-y-3 scroll-mt-24"><div className="sticky top-20 z-20 -mt-3"><div className={`rounded-[18px] border px-3 py-2 shadow-[0_14px_30px_-28px_rgba(15,23,42,0.24)] backdrop-blur transition ${selectedPhones.length > 0 ? 'border-[color:var(--brand)]/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(248,250,252,0.9))] dark:border-[color:var(--brand)]/25 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.9),rgba(2,6,23,0.88))]' : 'border-slate-200/80 bg-white/80 dark:border-slate-800 dark:bg-slate-950/78'}`}><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div className="flex flex-wrap items-center gap-1"><span className="inline-flex items-center gap-1 rounded-full border border-slate-200/80 bg-slate-50/90 px-2 py-0.5 text-[10px] font-black text-slate-700 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200"><i className="fa-solid fa-layer-group" /> {inventoryExplorerPhones.length.toLocaleString('fa-IR')} نتیجه</span><span className="inline-flex items-center gap-1 rounded-full border border-slate-200/80 bg-slate-50/90 px-2 py-0.5 text-[10px] font-black text-slate-700 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200"><i className="fa-solid fa-eye" /> نمای {inventoryViewMode === 'table' ? 'جدولی' : inventoryViewMode === 'compact' ? 'فشرده' : 'کارتی'}</span>
 {dashboardDrilldown.kind !== 'none' ? (
 <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-black text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300"><i className="fa-solid fa-bullseye" /> درایلدان فعال</span>
 ) : null}
 {activeFilterCount > 0 ? (
 <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300"><i className="fa-solid fa-filter" /> {activeFilterCount.toLocaleString('fa-IR')} فیلتر</span>
 ) : (
 <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300"><i className="fa-solid fa-star" /> پاک</span>
 )}
 {selectedPhones.length > 0 ? (
 <><span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--brand)]/25 bg-[color:var(--brand)]/10 px-2 py-0.5 text-[10px] font-black text-[color:var(--brand)]"><i className="fa-solid fa-check-double" /> {bulkSummary.count.toLocaleString('fa-IR')} انتخاب</span><span className="inline-flex items-center gap-1 rounded-full border border-slate-200/80 bg-white/90 px-2 py-0.5 text-[10px] font-black text-slate-700 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200"><i className="fa-solid fa-sack-dollar" /> خرید {formatPrice(bulkSummary.totalPurchase)}</span><span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300"><i className="fa-solid fa-chart-line-up" /> سود {formatPrice(bulkSummary.potentialProfit)}</span>
 {selectionContext ? (
 <span className={`inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black ${selectionContext.tone}`}><i className={`fa-solid ${selectionContext.icon}`} /><span className="truncate">{selectionContext.label}</span></span>
 ) : null}
 </>
 ) : null}
 </div><div className="flex flex-wrap items-center gap-1.5">
 {selectedPhones.length > 0 ? (
 <>
 {selectionContext ? (
 <span className={`inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black ${selectionContext.tone}`} title={selectionContext.hint}><i className={`fa-solid ${selectionContext.icon}`} /><span className="truncate">{selectionContext.hint}</span></span>
 ) : null}
 {selectionPreset ? (
 <button type="button" onClick={handleSelectionPresetAction} className="inline-flex max-w-full items-center gap-1 rounded-full border border-[color:var(--brand)]/25 bg-[color:var(--brand)]/10 px-2 py-0.5 text-[10px] font-black text-[color:var(--brand)] transition hover:bg-[color:var(--brand)]/15" title={selectionPreset.hint}><i className={`fa-solid ${selectionPreset.icon}`} /><span className="truncate">{selectionPreset.label}</span></button>
 ) : null}
 {selectionContext?.recommendedAction === 'export' ? (
 <button type="button" onClick={() => requestBulkAction('export')} className="inline-flex items-center gap-1 rounded-full border border-[color:var(--brand)]/25 bg-[color:var(--brand)]/10 px-2 py-0.5 text-[10px] font-black text-[color:var(--brand)] transition hover:bg-[color:var(--brand)]/15"><i className="fa-solid fa-star" /> خروجی CSV
 </button>
 ) : null}
 <button type="button" onClick={() => requestBulkAction('export')} className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300 dark:hover:bg-emerald-950/50"><i className="fa-solid fa-file-export" /> خروجی CSV
 </button><button type="button" onClick={() => setSelectedPhoneIds([])} className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-black text-rose-700 transition hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300 dark:hover:bg-rose-950/50"><i className="fa-solid fa-xmark" /> پاک‌کردن انتخاب
 </button></>
 ) : null}
 </div></div></div></div><div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
 {explorerFocusCards.map((card) => (
 <div key={card.key} className="relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-950"><div className="flex items-start justify-between gap-3"><div><div className="text-[11px] font-black tracking-[0.14em] text-slate-500 dark:text-slate-400">{card.label}</div><div className="mt-2 text-[17px] font-black text-slate-900 dark:text-slate-50">{card.value}</div><p className="mt-2 text-xs leading-6 text-slate-600 dark:text-slate-300">{card.hint}</p></div><span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/80 bg-white/80 text-slate-700 shadow-[0_18px_32px_-24px_rgba(15,23,42,0.35)] dark:border-slate-700/70 dark:bg-slate-900/70 dark:text-slate-200"><i className={`fa-solid ${card.icon}`} /></span></div></div>
 ))}
 </div>

 {phoneInventoryDrilldownEnabled && workspace === 'insights' ? (
 <div className="rounded-[24px] border border-slate-200/80 bg-white/90 p-4 shadow-[0_22px_50px_-38px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-950/60"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="text-[11px] font-black tracking-[0.16em] text-slate-500 dark:text-slate-400">ACTION DRILL-DOWN</div><h3 className="mt-2 text-[17px] font-black text-slate-900 dark:text-slate-50">درایلدان عملیاتی از کارت‌های تحلیلی</h3><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">روی هر کارت کلیک کن تا همان گروه مستقیم در مرور انبار باز شود.</p></div>
 {dashboardDrilldown.kind !== 'none' ? (
 <button type="button" onClick={clearDashboardDrilldown} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 shadow-sm text-[11px] font-black text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"><i className="fa-solid fa-xmark" /> انصراف درایلدان
 </button>
 ) : null}
 </div><div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
 {insightsActionCards.map((card) => {
 const active = dashboardDrilldown.kind === card.drilldown.kind;
 return (
 <button
 type="button"
 key={card.key}
 onClick={() => applyDashboardDrilldown(card.drilldown)}
 className={`relative overflow-hidden rounded-[22px] border bg-white p-4 text-right shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-slate-300 dark:bg-slate-950 dark:border-slate-800 ${active ? 'border-slate-900 ring-2 ring-slate-900/10 dark:border-white dark:ring-white/10' : 'border-slate-200/80'}`}
 ><div className="flex items-start justify-between gap-3"><div><div className="text-[11px] font-black tracking-[0.14em] text-slate-500 dark:text-slate-400">{card.label}</div><div className="mt-2 text-2xl font-black text-slate-900 dark:text-slate-50">{card.value.toLocaleString('fa-IR')}</div><p className="mt-2 text-xs leading-6 text-slate-600 dark:text-slate-300">{card.hint}</p></div><span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/80 bg-white/80 text-slate-700 shadow-[0_18px_32px_-24px_rgba(15,23,42,0.35)] dark:border-slate-700/70 dark:bg-slate-900/70 dark:text-slate-200"><i className={`fa-solid ${card.icon}`} /></span></div><div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/70 px-3 py-1 text-[11px] font-black text-slate-700 dark:border-slate-700/70 dark:bg-slate-900/70 dark:text-slate-200"><i className="fa-solid fa-arrow-down-and-arrow-up-right-to-center" /> رفتن به مرور
 </div></button>
 );
 })}
 </div></div>
 ) : null}

 {workspace === 'insights' && historyReport && (
 <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]"><div className="rounded-[24px] border border-slate-200/80 bg-white/90 p-4 shadow-[0_22px_50px_-38px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-950/60"><div className="flex items-center justify-between gap-3"><div><div className="text-[11px] font-black tracking-[0.16em] text-slate-500 dark:text-slate-400">HISTORY REPORT</div><h3 className="mt-2 text-[17px] font-black text-slate-900 dark:text-slate-50">گزارش تغییرات انبار گوشی</h3><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">خلاصه ۳۰ روز اخیر از تغییر قیمت، وضعیت و رویدادهای حساس.</p></div><div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"><i className={`fa-solid ${isHistoryReportLoading ? 'fa-spinner fa-spin' : 'fa-clock-rotate-left'}`} /> {historyReport.windowDays.toLocaleString('fa-IR')} روز اخیر
 </div></div><div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
 {historyReportCards.map((card) => (
 <div key={card.key} className="rounded-[20px] border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60"><div className="flex items-start justify-between gap-3"><div><div className="text-[11px] font-black tracking-[0.14em] text-slate-500 dark:text-slate-400">{card.label}</div><div className="mt-2 text-2xl font-black text-slate-900 dark:text-slate-50">{card.value}</div></div><span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${card.tone === 'rose' ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300' : card.tone === 'violet' ? 'bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300' : card.tone === 'sky' ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}><i className={`fa-solid ${card.icon}`} /></span></div><div className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">{card.hint}</div></div>
 ))}
 </div></div><div className="rounded-[24px] border border-slate-200/80 bg-white/90 p-4 shadow-[0_22px_50px_-38px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-950/60"><div className="text-[11px] font-black tracking-[0.16em] text-slate-500 dark:text-slate-400">RECENT CHANGE FEED</div><h3 className="mt-2 text-[17px] font-black text-slate-900 dark:text-slate-50">آخرین تغییرات مهم</h3><div className="mt-4 space-y-3">
 {historyReport.recentEvents.length === 0 ? (
 <div className="rounded-[18px] border border-dashed border-slate-200 px-3 py-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">در این بازه رویدادی ثبت اطلاعات نشده است.</div>
 ) : historyReport.recentEvents.slice(0, 5).map((event) => (
 <div key={`report-${event.id}`} className="rounded-[18px] border border-slate-200/80 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/60"><div className="flex items-start justify-between gap-3"><div><div className="text-[13px] font-black text-slate-900 dark:text-slate-50">{event.title}</div><div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{formatIsoToShamsiDateTime(event.eventDate || event.createdAt)}</div></div><span className={`inline-flex h-9 w-9 items-center justify-center rounded-2xl ${event.tone === 'rose' ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300' : event.tone === 'amber' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300' : event.tone === 'violet' ? 'bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300' : event.tone === 'sky' ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}><i className={`fa-solid ${event.icon || 'fa-clock-rotate-left'}`} /></span></div>
 {event.description ? <div className="mt-2 text-xs leading-6 text-slate-600 dark:text-slate-300">{event.description}</div> : null}
 </div>
 ))}
 </div></div></div>
 )}

 {workspace === 'insights' && (
 <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]"><div className="rounded-[24px] border border-slate-200/80 bg-white/90 p-4 shadow-[0_22px_50px_-38px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-950/60"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-[11px] font-black tracking-[0.16em] text-slate-500 dark:text-slate-400">ENTERPRISE HISTORY</div><h3 className="mt-2 text-[17px] font-black text-slate-900 dark:text-slate-50">کنترل‌های مدیریتی تاریخچه انبار</h3><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">فیلتر، جستجو، بازه دلخواه و خروجی حسابرسی برای لاگ تغییرات.</p></div>
 {canManage ? (
 <div className="flex flex-wrap items-center gap-3"><button type="button" onClick={exportHistoryExplorerCsv} className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white shadow-sm px-3 py-1.5 shadow-sm text-[11px] font-black text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"><i className="fa-solid fa-file-export" /> خروجی CSV لاگ
 </button><button type="button" onClick={exportHistoryExplorerPrintReport} className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white shadow-sm px-3 py-1.5 shadow-sm text-[11px] font-black text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"><i className="fa-solid fa-print" /> خروجی گزارشات
 </button></div>
 ) : (
 <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-black text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300"><i className="fa-solid fa-shield-halved" /> خروجی‌ها محدود به مدیر انبار است</span>
 )}
 </div><div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_18rem]"><input
 value={historyExplorerFilters.q}
 onChange={(e) => setHistoryExplorerFilters((prev) => ({...prev, q: e.target.value }))}
 placeholder="جستجو در مدل، IMEI، عنوان رویداد، توضیح یا کاربر..."
 className="w-full rounded-[18px] border border-slate-200 bg-slate-50/80 px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none transition   dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-50"
 /><select value={historyExplorerFilters.model} onChange={(e) => setHistoryExplorerFilters((prev) => ({...prev, model: e.target.value }))} className="rounded-[18px] border border-slate-200 bg-slate-50/80 px-4 py-2.5 text-[13px] font-black text-slate-900 outline-none transition   dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-50"><option value="all">همه مدل‌ها</option>
 {modelFilterOptions.map((model) =><option key={`history-model-${model}`} value={model}>{model}</option>)}
 </select></div><div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2"><div className="rounded-[18px] border border-slate-200 bg-slate-50/80 px-4 py-2.5 dark:border-slate-700 dark:bg-slate-900/70"><div className="mb-2 text-[11px] font-black tracking-[0.14em] text-slate-500 dark:text-slate-400">شروع بازه</div><ShamsiDatePicker
 selectedDate={historyExplorerFilters.startDate ? new Date(historyExplorerFilters.startDate) : null}
 onDateChange={(d) => setHistoryExplorerFilters((prev) => ({...prev, startDate: d ? moment(d).format('YYYY-MM-DD') : '' }))}
 inputClassName="w-full rounded-[14px] border-0 bg-transparent px-0 py-0 text-[13px] font-black text-slate-900 outline-none dark:text-slate-50"
 /></div><div className="rounded-[18px] border border-slate-200 bg-slate-50/80 px-4 py-2.5 dark:border-slate-700 dark:bg-slate-900/70"><div className="mb-2 text-[11px] font-black tracking-[0.14em] text-slate-500 dark:text-slate-400">پایان بازه</div><ShamsiDatePicker
 selectedDate={historyExplorerFilters.endDate ? new Date(historyExplorerFilters.endDate) : null}
 onDateChange={(d) => setHistoryExplorerFilters((prev) => ({...prev, endDate: d ? moment(d).format('YYYY-MM-DD') : '' }))}
 inputClassName="w-full rounded-[14px] border-0 bg-transparent px-0 py-0 text-[13px] font-black text-slate-900 outline-none dark:text-slate-50"
 /></div></div><div className="mt-3 flex flex-wrap gap-3">
 {historyExplorerClassOptions.map((item) => {
 const active = historyExplorerFilters.eventClass === item.key;
 return (
 <button key={item.key} type="button" onClick={() => setHistoryExplorerFilters((prev) => ({...prev, eventClass: item.key }))} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-black transition ${active ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-950' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'}`}><i className={`fa-solid ${item.icon}`} /> {item.label}
 </button>
 );
 })}
 </div><div className="mt-4 space-y-3">
 {isHistoryExplorerLoading ? (
 <><Skeleton className="h-20 rounded-[18px]" /><Skeleton className="h-20 rounded-[18px]" /></>
 ) : historyExplorerEvents.length === 0 ? (
 <div className="rounded-[20px] border border-dashed border-slate-200 px-4 py-8 text-center text-sm font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">برای این فیلترها رویدادی پیدا نشد.</div>
 ) : historyExplorerEvents.slice(0, 8).map((event) => {
 const classMeta = getEventClassMeta(event.eventClass || 'audit');
 return (
 <div key={`hx-${event.id}`} className="rounded-[20px] border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-3"><span className={`inline-flex h-9 w-9 items-center justify-center rounded-2xl ${eventToneClasses(event.tone || classMeta.tone)}`}><i className={`fa-solid ${event.icon || classMeta.icon}`} /></span><div><div className="text-[13px] font-black text-slate-900 dark:text-slate-50">{event.title}</div><div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] font-bold text-slate-500 dark:text-slate-400"><span>{event.phoneModel || 'مدل نامشخص'}</span>
 {event.phoneImei ? <span className="rounded-full bg-white px-2 py-1 dark:bg-slate-950/70">IMEI: {event.phoneImei}</span> : null}
 <span className="rounded-full bg-white px-2 py-1 dark:bg-slate-950/70">{classMeta.label}</span></div></div></div>
 {event.description ? <div className="mt-3 text-xs leading-6 text-slate-600 dark:text-slate-300">{event.description}</div> : null}
 </div><div className="text-left text-[11px] font-black text-slate-500 dark:text-slate-400">{formatIsoToShamsiDateTime(event.eventDate || event.createdAt)}</div></div></div>
 );
 })}
 </div></div><div className="space-y-3"><div className="rounded-[24px] border border-slate-200/80 bg-white/90 p-4 shadow-[0_22px_50px_-38px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-950/60"><div className="text-[11px] font-black tracking-[0.16em] text-slate-500 dark:text-slate-400">MODEL CHANGE REPORT</div><h3 className="mt-2 text-[17px] font-black text-slate-900 dark:text-slate-50">مدل‌های پرتغییر و پرریسک</h3><div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
 {(enterpriseHistoryReport?.topModels || []).slice(0, 4).map((item) => (
 <button type="button" key={`top-model-${item.model}`} onClick={() => setHistoryExplorerFilters((prev) => ({...prev, model: item.model }))} className="rounded-[20px] border border-slate-200/80 bg-slate-50/80 p-4 text-right transition hover:-translate-y-0.5 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60"><div className="flex items-start justify-between gap-3"><div><div className="text-[13px] font-black text-slate-900 dark:text-slate-50">{item.model}</div><div className="mt-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">{item.totalChanges.toLocaleString('fa-IR')} تغییر ثبت اطلاعات‌شده</div></div><span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"><i className="fa-solid fa-mobile-screen-button" /></span></div><div className="mt-3 flex flex-wrap gap-3 text-[11px] font-black"><span className="rounded-full bg-sky-50 px-2.5 py-1 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300">قیمت: {item.priceChanges.toLocaleString('fa-IR')}</span><span className="rounded-full bg-violet-50 px-2.5 py-1 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300">وضعیت: {item.statusChanges.toLocaleString('fa-IR')}</span><span className="rounded-full bg-rose-50 px-2.5 py-1 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">حساس: {item.criticalEvents.toLocaleString('fa-IR')}</span></div></button>
 ))}
 </div></div>

 {historyExplorerFilters.model !== 'all' ? (
 <div className="rounded-[24px] border border-slate-200/80 bg-white/90 p-4 shadow-[0_22px_50px_-38px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-950/60"><div className="flex items-center justify-between gap-3"><div><div className="text-[11px] font-black tracking-[0.16em] text-slate-500 dark:text-slate-400">MODEL DRILL-DOWN</div><h3 className="mt-2 text-[17px] font-black text-slate-900 dark:text-slate-50">جزئیات مدل {historyExplorerFilters.model}</h3></div><button type="button" onClick={() => setHistoryExplorerFilters((prev) => ({...prev, model: 'all' }))} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 shadow-sm text-[11px] font-black text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"><i className="fa-solid fa-xmark" /> انصراف</button></div><div className="mt-4 space-y-3">
 {drilldownPhones.length === 0 ? <div className="rounded-[18px] border border-dashed border-slate-200 px-4 py-6 text-center text-sm font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">دستگاهی از این مدل در موجودی فعلی پیدا نشد.</div> : drilldownPhones.map((phone) => (
 <button type="button" key={`drill-${phone.id}`} onClick={() => openDetailsModal(phone)} className="flex w-full items-center justify-between gap-3 rounded-[18px] border border-slate-200/80 bg-slate-50/80 px-4 py-2.5 text-right transition hover:-translate-y-0.5 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60"><div><div className="text-[13px] font-black text-slate-900 dark:text-slate-50">{phone.model}</div><div className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">IMEI: <span dir="ltr">{phone.imei}</span></div></div><div className="text-left"><div className="text-xs font-black text-slate-600 dark:text-slate-300">{phone.status}</div><div className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">{formatPrice(phone.salePrice)}</div></div></button>
 ))}
 </div></div>
 ) : null}

 <div className="rounded-[24px] border border-slate-200/80 bg-white/90 p-4 shadow-[0_22px_50px_-38px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-950/60"><div className="text-[11px] font-black tracking-[0.16em] text-slate-500 dark:text-slate-400">AUDIT SNAPSHOT</div><h3 className="mt-2 text-[17px] font-black text-slate-900 dark:text-slate-50">خلاصه حسابرسی و اپراتورها</h3><div className="mt-4 grid grid-cols-2 gap-3">
 {(enterpriseHistoryReport?.eventClassCounts || []).map((item) => (
 <div key={`class-count-${item.key}`} className="rounded-[18px] border border-slate-200/80 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/60"><div className="text-[11px] font-black tracking-[0.12em] text-slate-500 dark:text-slate-400">{item.label}</div><div className="mt-2 text-[17px] font-black text-slate-900 dark:text-slate-50">{item.count.toLocaleString('fa-IR')}</div></div>
 ))}
 </div><div className="mt-4 space-y-3">
 {(enterpriseHistoryReport?.topActors || []).slice(0, 4).map((actor) => (
 <div key={`actor-${actor.actor}`} className="flex items-center justify-between gap-3 rounded-[18px] border border-slate-200/80 bg-slate-50/80 px-4 py-2.5 text-sm dark:border-slate-800 dark:bg-slate-900/60"><span className="font-black text-slate-900 dark:text-slate-50">{actor.actor}</span><span className="text-xs font-black text-slate-500 dark:text-slate-400">{actor.totalChanges.toLocaleString('fa-IR')} تغییر</span></div>
 ))}
 </div></div></div></div>
 )}

 {workspace === 'insights' && dashboardReport ? (
 <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]"><div className="space-y-3"><div className="rounded-[24px] border border-slate-200/80 bg-white/90 p-4 shadow-[0_22px_50px_-38px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-950/60"><div className="flex items-center justify-between gap-3"><div><div className="text-[11px] font-black tracking-[0.16em] text-slate-500 dark:text-slate-400">DASHBOARD REPORT</div><h3 className="mt-2 text-[17px] font-black text-slate-900 dark:text-slate-50">روند راکدی و نبض فعالیت</h3><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">روی هر باکت کلیک کن تا موجودی دقیق همان بخش در مرور باز شود.</p></div><span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"><i className="fa-solid fa-chart-mixed" /> {dashboardReport.windowDays.toLocaleString('fa-IR')} روز
 </span></div><div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
 {dashboardReport.staleBuckets.map((bucket) => (
 <button
 type="button"
 key={`bucket-${bucket.key}`}
 onClick={() => applyDashboardDrilldown({ kind: 'staleBucket', value: bucket.key, label: bucket.label })}
 className={`rounded-[20px] border p-4 text-right transition hover:-translate-y-0.5 hover:border-slate-300 ${dashboardDrilldown.kind === 'staleBucket' && dashboardDrilldown.value === bucket.key ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-950' : 'border-slate-200/80 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/60'}`}
 ><div className="text-[11px] font-black tracking-[0.12em] opacity-80">{bucket.label}</div><div className="mt-2 text-2xl font-black">{bucket.count.toLocaleString('fa-IR')}</div><div className="mt-2 text-[11px] font-bold opacity-80">در انبار موجود و قابل پیگیری</div></button>
 ))}
 </div><div className="mt-4 rounded-[20px] border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60"><div className="flex items-center justify-between gap-3"><div className="text-[13px] font-black text-slate-900 dark:text-slate-50">نبض فعالیت ۱۴ روز اخیر</div><div className="text-[11px] font-black text-slate-500 dark:text-slate-400">بیشترین روز: {dashboardReport.dailyActivity.reduce((max, point) => point.total > max.total ? point : max, dashboardReport.dailyActivity[0] || { label: '-', total: 0 }).label || '-'}</div></div><div className="mt-4 flex items-end gap-3 overflow-x-auto pb-1 inventory-premium-scroll">
 {dashboardReport.dailyActivity.map((point) => {
 const height = Math.max(20, Math.round((point.total / Math.max(1,...dashboardReport.dailyActivity.map((item) => item.total || 0))) * 92));
 return (
 <div key={`activity-${point.date}`} className="flex min-w-[42px] flex-col items-center gap-3"><div className="text-[10px] font-black text-slate-400 dark:text-slate-500">{point.total.toLocaleString('fa-IR')}</div><div className="relative flex h-28 w-8 items-end overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-800/80"><div className="w-full rounded-full bg-[linear-gradient(180deg,rgba(56,189,248,0.35),rgba(14,165,233,0.95))]" style={{ height }} /></div><div className="text-[10px] font-black text-slate-500 dark:text-slate-400">{point.label}</div></div>
 );
 })}
 </div></div></div><div className="rounded-[24px] border border-slate-200/80 bg-white/90 p-4 shadow-[0_22px_50px_-38px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-950/60"><div className="text-[11px] font-black tracking-[0.16em] text-slate-500 dark:text-slate-400">PRICE TREND</div><h3 className="mt-2 text-[17px] font-black text-slate-900 dark:text-slate-50">روند تغییر قیمت‌ها</h3><div className="mt-4 grid grid-cols-2 gap-3">
 {[
 { label: 'افزایش فروش', value: dashboardReport.pricingTrend.saleIncrease, tone: 'text-emerald-600 dark:text-emerald-300' },
 { label: 'کاهش فروش', value: dashboardReport.pricingTrend.saleDecrease, tone: 'text-rose-600 dark:text-rose-300' },
 { label: 'افزایش خرید', value: dashboardReport.pricingTrend.purchaseIncrease, tone: 'text-sky-600 dark:text-sky-300' },
 { label: 'کاهش خرید', value: dashboardReport.pricingTrend.purchaseDecrease, tone: 'text-amber-600 dark:text-amber-300' },
 ].map((item) => (
 <div key={item.label} className="rounded-[18px] border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60"><div className="text-[11px] font-black tracking-[0.12em] text-slate-500 dark:text-slate-400">{item.label}</div><div className={`mt-2 text-xl font-black ${item.tone}`}>{item.value.toLocaleString('fa-IR')}</div></div>
 ))}
 </div></div></div><div className="space-y-3"><div className="rounded-[24px] border border-slate-200/80 bg-white/90 p-4 shadow-[0_22px_50px_-38px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-950/60"><div className="text-[11px] font-black tracking-[0.16em] text-slate-500 dark:text-slate-400">MODEL HEATMAP</div><h3 className="mt-2 text-[17px] font-black text-slate-900 dark:text-slate-50">تحلیل مدل‌ها</h3><div className="mt-4 space-y-3">
 {dashboardReport.modelHeatmap.slice(0, 6).map((item) => (
 <button type="button" key={`model-heat-${item.name}`} onClick={() => applyDashboardDrilldown({ kind: 'model', value: item.name, label: item.name })} className={`flex w-full items-center justify-between gap-3 rounded-[18px] border px-4 py-2.5 text-right transition hover:-translate-y-0.5 hover:border-slate-300 ${dashboardDrilldown.kind === 'model' && dashboardDrilldown.value === item.name ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-950' : 'border-slate-200/80 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/60'}`}><div><div className="text-[13px] font-black">{item.name}</div><div className="mt-1 text-[11px] font-bold opacity-80">مارجین بالقوه: {formatPrice(item.potentialMargin)}</div></div><div className="text-left"><div className="text-[17px] font-black">{item.total.toLocaleString('fa-IR')}</div><div className="mt-1 text-[11px] font-bold opacity-80">راکد: {item.staleCount.toLocaleString('fa-IR')}</div></div></button>
 ))}
 </div></div><div className="rounded-[24px] border border-slate-200/80 bg-white/90 p-4 shadow-[0_22px_50px_-38px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-950/60"><div className="text-[11px] font-black tracking-[0.16em] text-slate-500 dark:text-slate-400">SUPPLIER HEATMAP</div><h3 className="mt-2 text-[17px] font-black text-slate-900 dark:text-slate-50">تحلیل تامین‌کننده‌ها</h3><div className="mt-4 space-y-3">
 {dashboardReport.supplierHeatmap.slice(0, 6).map((item) => (
 <button type="button" key={`supplier-heat-${item.name}`} onClick={() => applyDashboardDrilldown({ kind: 'supplier', value: item.name, label: item.name })} className={`flex w-full items-center justify-between gap-3 rounded-[18px] border px-4 py-2.5 text-right transition hover:-translate-y-0.5 hover:border-slate-300 ${dashboardDrilldown.kind === 'supplier' && dashboardDrilldown.value === item.name ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-950' : 'border-slate-200/80 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/60'}`}><div><div className="text-[13px] font-black">{item.name}</div><div className="mt-1 text-[11px] font-bold opacity-80">بدون قیمت فروش: {item.missingSalePriceCount.toLocaleString('fa-IR')}</div></div><div className="text-left"><div className="text-[17px] font-black">{item.total.toLocaleString('fa-IR')}</div><div className="mt-1 text-[11px] font-bold opacity-80">باتری پایین: {item.lowBatteryCount.toLocaleString('fa-IR')}</div></div></button>
 ))}
 </div></div></div></div>
 ) : null}

 <div className="app-card overflow-hidden p-0"><div className="border-b border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.94),rgba(255,255,255,0.84))] p-4 dark:border-slate-800 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.9))] md:p-6"><div className="flex flex-col gap-3.5"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><div className="text-[11px] font-black tracking-[0.16em] text-slate-500 dark:text-slate-400">INVENTORY EXPLORER</div><div className="mt-1 text-[17px] font-black text-slate-900 dark:text-slate-50">انبار گوشی</div></div><div className="flex flex-wrap items-center gap-3"><div className="inline-flex overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-950/70">
 {([
 ['cards', 'fa-grid-2', 'کارتی'],
 ['compact', 'fa-table-list', 'فشرده'],
 ['table', 'fa-table-columns', 'جدولی'],
 ] as const).map(([mode, icon, label]) => {
 const active = inventoryViewMode === mode;
 return (
 <button key={mode} type="button" onClick={() => setInventoryViewMode(mode)} className={`inline-flex items-center gap-3 px-3 py-2 text-xs font-black transition ${active ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900'}`}><i className={`fa-solid ${icon}`} />
 {label}
 </button>
 );
 })}
 </div><button type="button" onClick={clearExplorerFilters} className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white shadow-sm px-3 py-2 text-xs font-black text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-slate-50"><i className="fa-solid fa-rotate" />
 پاک‌سازی
 </button></div></div><div className="flex flex-wrap gap-3">
 {savedViewMeta.map((view) => {
 const active = savedView === view.key;
 return (
 <button key={view.key} type="button" onClick={() => setSavedView(view.key)} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-black transition ${active ? 'border-transparent bg-slate-900 text-white shadow-[0_18px_34px_-22px_rgba(15,23,42,0.45)] dark:bg-white dark:text-slate-900' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-slate-50'}`}><i className={`fa-solid ${view.icon}`} />
 {view.label}
 </button>
 );
 })}
 </div><div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center"><div className="flex flex-wrap items-center gap-3 text-xs"><span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 font-black text-slate-700 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-200"><i className="fa-solid fa-calendar-range" />
 بازه ثبت اطلاعات / ورود
 </span>
 {inventoryExplorerDateRangeLabel ? (
 <span className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-3 py-1.5 font-black ${
 inventoryExplorerDateRangeTone === 'empty'
 ? 'border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300'
 : inventoryExplorerDateRangeTone === 'narrow'
 ? 'border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300'
 : 'border border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-900/60 dark:bg-fuchsia-950/30 dark:text-fuchsia-300'
 }`}><i className={`fa-solid ${inventoryExplorerDateRangeTone === 'empty' ? 'fa-calendar-xmark' : inventoryExplorerDateRangeTone === 'narrow' ? 'fa-calendar-day' : 'fa-calendar-range'}`} /><span className="truncate">{inventoryExplorerDateRangeLabel}</span></span>
 ) : (
 <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-400">
 بدون محدودیت تاریخ
 </span>
 )}
 {inventoryExplorerDateRange.startDate || inventoryExplorerDateRange.endDate ? (
 <button
 type="button"
 onClick={() => setInventoryExplorerDateRange({ startDate: '', endDate: '' })}
 className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 font-black text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-slate-50"
 ><i className="fa-solid fa-xmark" />
 پاک‌کردن بازه
 </button>
 ) : null}
 </div><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:min-w-[620px]"><div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white shadow-sm px-3 py-2 dark:border-slate-700 dark:bg-slate-950/70"><span className="shrink-0 text-[11px] font-black text-slate-500 dark:text-slate-400">از</span><ShamsiDatePicker
 selectedDate={inventoryExplorerDateRange.startDate ? new Date(inventoryExplorerDateRange.startDate) : null}
 onDateChange={(d) => setInventoryExplorerDateRange((prev) => ({...prev, startDate: d ? moment(d).format('YYYY-MM-DD') : '' }))}
 inputClassName="w-full rounded-[10px] border-0 bg-transparent px-0 py-0 text-[12px] font-black text-slate-900 outline-none dark:text-slate-50"
 /></div><div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white shadow-sm px-3 py-2 dark:border-slate-700 dark:bg-slate-950/70"><span className="shrink-0 text-[11px] font-black text-slate-500 dark:text-slate-400">تا</span><ShamsiDatePicker
 selectedDate={inventoryExplorerDateRange.endDate ? new Date(inventoryExplorerDateRange.endDate) : null}
 onDateChange={(d) => setInventoryExplorerDateRange((prev) => ({...prev, endDate: d ? moment(d).format('YYYY-MM-DD') : '' }))}
 inputClassName="w-full rounded-[10px] border-0 bg-transparent px-0 py-0 text-[12px] font-black text-slate-900 outline-none dark:text-slate-50"
 /></div></div></div>
 {explorerContextCard ? (
 <div className={`grid grid-cols-1 gap-3.5 rounded-[28px] border px-4 py-4 md:grid-cols-[minmax(0,1fr)_auto] md:px-5 ${explorerContextCard.tone === 'violet' ? 'border-violet-200/80 bg-violet-50/80 dark:border-violet-900/60 dark:bg-violet-950/20' : 'border-sky-200/80 bg-sky-50/80 dark:border-sky-900/60 dark:bg-sky-950/20'}`}><div><div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-black ${explorerContextCard.tone === 'violet' ? 'border-violet-200 bg-white/80 text-violet-700 dark:border-violet-800 dark:bg-slate-950/50 dark:text-violet-300' : 'border-sky-200 bg-white/80 text-sky-700 dark:border-sky-800 dark:bg-slate-950/50 dark:text-sky-300'}`}><i className={`fa-solid ${explorerContextCard.icon}`} />
 {explorerContextCard.kicker}
 </div><h3 className="mt-3 text-[17px] font-black text-slate-900 dark:text-slate-50">{explorerContextCard.title}</h3><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{explorerContextCard.description}</p><div className="mt-4 flex flex-wrap items-center gap-3"><button type="button" onClick={openExplorerContextHistory} className={`inline-flex items-center gap-3 rounded-2xl border px-3 py-2 text-xs font-black transition hover:-translate-y-0.5 ${explorerContextCard.tone === 'violet' ? 'border-violet-200 bg-white/85 text-violet-700 hover:border-violet-300 dark:border-violet-800 dark:bg-slate-950/60 dark:text-violet-300' : 'border-sky-200 bg-white/85 text-sky-700 hover:border-sky-300 dark:border-sky-800 dark:bg-slate-950/60 dark:text-sky-300'}`}><i className="fa-solid fa-timeline" /> تاریخچه همین نما
 </button><button type="button" onClick={exportExplorerContextCsv} className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white shadow-sm/85 px-3 py-2 text-xs font-black text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-200"><i className="fa-solid fa-file-export" /> خروجی CSV همین نما
 </button><button type="button" onClick={clearDashboardDrilldown} className="inline-flex items-center gap-3 rounded-2xl border border-rose-200 bg-white/85 px-3 py-2 text-xs font-black text-rose-700 transition hover:-translate-y-0.5 hover:border-rose-300 dark:border-rose-900/60 dark:bg-slate-950/60 dark:text-rose-300"><i className="fa-solid fa-xmark" /> پاک‌کردن تمرکز
 </button></div></div><div className="flex flex-wrap items-center gap-3 md:justify-end">
 {explorerContextCard.chips.map((chip) => (
 <span key={chip} className="inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/80 px-3 py-1.5 text-xs font-black text-slate-700 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.35)] dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-200">{chip}</span>
 ))}
 </div></div>
 ) : null}
 <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5"><div className="rounded-2xl border border-slate-200/80 bg-white/85 px-2.5 py-2 shadow-[0_10px_24px_-24px_rgba(15,23,42,0.4)] dark:border-slate-800/80 dark:bg-slate-950/45"><label className="mb-1 flex items-center gap-1.5 text-[10px] font-black text-slate-500 dark:text-slate-400"><i className="fa-solid fa-arrows-rotate text-[11px]" /> وضعیت</label><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-9 w-full rounded-xl border border-slate-200 bg-white shadow-sm px-2.5 text-[11px] font-black text-slate-700 outline-none transition    dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100  "><option value="all">همه وضعیت‌ها</option>{PHONE_STATUSES.map((status) =><option key={status} value={status}>{status}</option>)}</select></div><div className="rounded-2xl border border-slate-200/80 bg-white/85 px-2.5 py-2 shadow-[0_10px_24px_-24px_rgba(15,23,42,0.4)] dark:border-slate-800/80 dark:bg-slate-950/45"><label className="mb-1 flex items-center gap-1.5 text-[10px] font-black text-slate-500 dark:text-slate-400"><i className="fa-solid fa-truck text-[11px]" /> تامین</label><select value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)} className="h-9 w-full rounded-xl border border-slate-200 bg-white shadow-sm px-2.5 text-[11px] font-black text-slate-700 outline-none transition    dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100  "><option value="all">همه تامین‌کنندگان</option>{supplierFilterOptions.map((supplier) =><option key={supplier} value={supplier}>{supplier}</option>)}</select></div><div className="rounded-2xl border border-slate-200/80 bg-white/85 px-2.5 py-2 shadow-[0_10px_24px_-24px_rgba(15,23,42,0.4)] dark:border-slate-800/80 dark:bg-slate-950/45"><label className="mb-1 flex items-center gap-1.5 text-[10px] font-black text-slate-500 dark:text-slate-400"><i className="fa-solid fa-mobile-screen-button text-[11px]" /> مدل</label><select value={modelFilter} onChange={(e) => setModelFilter(e.target.value)} className="h-9 w-full rounded-xl border border-slate-200 bg-white shadow-sm px-2.5 text-[11px] font-black text-slate-700 outline-none transition    dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100  "><option value="all">همه مدل‌ها</option>{modelFilterOptions.map((model) =><option key={model} value={model}>{model}</option>)}</select></div><div className="rounded-2xl border border-slate-200/80 bg-white/85 px-2.5 py-2 shadow-[0_10px_24px_-24px_rgba(15,23,42,0.4)] dark:border-slate-800/80 dark:bg-slate-950/45"><label className="mb-1 flex items-center gap-1.5 text-[10px] font-black text-slate-500 dark:text-slate-400"><i className="fa-solid fa-battery-half text-[11px]" /> باتری</label><select value={batteryFilter} onChange={(e) => setBatteryFilter(e.target.value as any)} className="h-9 w-full rounded-xl border border-slate-200 bg-white shadow-sm px-2.5 text-[11px] font-black text-slate-700 outline-none transition    dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100  "><option value="all">همه</option><option value="good">۸۰٪ و بالاتر</option><option value="low">کمتر از ۸۰٪</option></select></div><div className="rounded-2xl border border-slate-200/80 bg-white/85 px-2.5 py-2 shadow-[0_10px_24px_-24px_rgba(15,23,42,0.4)] dark:border-slate-800/80 dark:bg-slate-950/45"><label className="mb-1 flex items-center gap-1.5 text-[10px] font-black text-slate-500 dark:text-slate-400"><i className="fa-solid fa-arrow-down-wide-short text-[11px]" /> مرتب</label><select value={sortMode} onChange={(e) => setSortMode(e.target.value as InventorySortMode)} className="h-9 w-full rounded-xl border border-slate-200 bg-white shadow-sm px-2.5 text-[11px] font-black text-slate-700 outline-none transition    dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100  "><option value="newest">جدیدترین ثبت اطلاعات</option><option value="oldest">قدیمی‌ترین ثبت اطلاعات</option><option value="purchaseHigh">بیشترین قیمت خرید</option><option value="purchaseLow">کمترین قیمت خرید</option><option value="saleHigh">بیشترین قیمت فروش</option><option value="saleLow">کمترین قیمت فروش</option><option value="marginHigh">بیشترین حاشیه سود</option><option value="staleMost">راکدترین</option></select></div></div><div className="flex flex-wrap items-center gap-3 text-xs"><span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 font-black text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">{inventoryExplorerPhones.length.toLocaleString('fa-IR')} نتیجه</span><span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-400">{activeFilterCount.toLocaleString('fa-IR')} فیلتر فعال</span>
 {dashboardDrilldownSummary ? (
 <button type="button" onClick={clearDashboardDrilldown} className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 font-black text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-300"><i className="fa-solid fa-compass-drafting" /> {dashboardDrilldownSummary}
 <i className="fa-solid fa-xmark" /></button>
 ) : null}
 </div></div></div><div className="phone-list-shell__toolbar p-3 md:p-4"><section className="phone-list-apple-head"><div className="phone-list-apple-head__title"><span className="phone-list-apple-head__icon"><i className="fa-solid fa-list-check" /></span><div className="phone-list-apple-head__copy"><h3>{workspace === 'stale' ? 'گوشی‌های راکد' : workspace === 'returns' ? 'گوشی‌های مرجوعی' : workspace === 'insights' ? 'موجودی قابل تحلیل' : 'لیست گوشی‌های ثبت اطلاعات شده'}</h3><p>{workspace === 'stale' ? 'نمای گوشی‌های بدون گردش اخیر برای پیگیری سریع تیم فروش.' : workspace === 'returns' ? 'مرجوعی‌ها را تمیز، سریع و قابل پیگیری مدیریت کن.' : workspace === 'insights' ? 'نمای تحلیلی موجودی برای تصمیم‌گیری مدیریتی و مالی.' : 'جستجو، کنترل و خروجی گرفتن از لیست گوشی‌ها در یک نمای خلوت و حرفه‌ای.'}</p></div></div><div className="phone-list-apple-head__controls"><div className="phone-list-apple-head__search"><span className="phone-list-apple-head__search-icon"><i className="fa-solid fa-magnifying-glass" /></span><input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="جستجو بر اساس مدل، IMEI، تأمین‌کننده…" data-tooltip="جستجو بر اساس مدل، IMEI، تأمین‌کننده…" type="text" dir="rtl" className="phone-list-apple-head__search-input" /></div><div className="phone-list-apple-head__actions"><Button type="button" variant="secondary" size="sm" className="phone-list-apple-head__action-btn whitespace-nowrap" onClick={() => setIsPhoneImportExportOpen(true)} leftIcon={<i className="fa-solid fa-file-import" />}>ایمپورت / اکسپورت</Button><span className="phone-list-apple-head__count">{isFetching ? 'در حال دریافت اطلاعات…' : `${inventoryExplorerPhones.length.toLocaleString('fa-IR')} مورد`}</span></div></div></section></div>

 {isFetching ? (
 <div className="p-4 md:p-6"><div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
 {Array.from({ length: 6 }).map((_, i) => (
 <div
 key={i}
 className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/40"
 ><div className="flex items-start justify-between gap-3"><div className="min-w-0 flex-1 space-y-3"><Skeleton className="h-5 w-2/3" rounded="lg" /><Skeleton className="h-4 w-1/2" rounded="lg" /></div><Skeleton className="h-6 w-20" rounded="full" /></div><div className="mt-4 grid grid-cols-2 gap-3">
 {Array.from({ length: 6 }).map((__, j) => (
 <Skeleton key={j} className="h-4" rounded="lg" />
 ))}
 </div><div className="mt-4 flex items-center justify-between"><div className="flex items-center gap-3"><Skeleton className="h-9 w-9" rounded="xl" /><Skeleton className="h-9 w-20" rounded="xl" /></div><Skeleton className="h-9 w-24" rounded="xl" /></div></div>
 ))}
 </div></div>
 ) : phones.length === 0 ? (
 <div className="p-6"><EmptyState
 icon={<i className="fa-solid fa-mobile-screen" aria-hidden="true" />}
 title="هنوز هیچ گوشی ثبت اطلاعات نشده است"
 description="برای شروع، از فرم بالای صفحه یک گوشی جدید ثبت اطلاعات کنید."
 /></div>
 ) : inventoryExplorerPhones.length === 0 && searchTerm ? (
 <div className="p-6"><EmptyState
 icon={<i className="fa-solid fa-magnifying-glass" aria-hidden="true" />}
 title="چیزی پیدا نشد"
 description="عبارت جستجو را تغییر دهید یا پاک کنید."
 /></div>
 ) : inventoryExplorerPhones.length === 0 ? (
 <div className="p-6"><EmptyState
 icon={<i className={workspace === 'stale' ? 'fa-solid fa-hourglass-half' : workspace === 'returns' ? 'fa-solid fa-rotate-left' : 'fa-solid fa-box-open'} aria-hidden="true" />}
 title={workspace === 'stale' ? 'فعلاً گوشی راکدی دیده نمی‌شود' : workspace === 'returns' ? 'مرجوعی فعالی پیدا نشد' : 'موردی برای نمایش نیست'}
 description="با تغییر فضای کاری یا جستجو، نماهای دیگری را بررسی و ادامه کنید."
 /></div>
 ) : (
 <div className="phone-list-shell__content p-4 sm:p-6 space-y-3"><div className="phone-list-shell__controlbar rounded-[24px] border border-slate-200/80 bg-slate-50/90 p-4 dark:border-slate-800 dark:bg-slate-950/50"><div className="flex flex-col gap-3.5 xl:flex-row xl:items-center xl:justify-between"><div className="flex flex-wrap items-center gap-3"><button type="button" onClick={toggleSelectAllVisible} className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white shadow-sm px-3 py-2 text-xs font-black text-slate-700 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:text-slate-50"><i className={`fa-solid ${allVisibleSelected ? 'fa-square-check' : 'fa-square'}`} />
 {allVisibleSelected ? 'لغو انتخاب همه' : 'انتخاب همه موارد نمایان'}
 </button><div className="rounded-2xl border border-slate-200/80 bg-white px-3 py-2 text-xs font-black text-slate-700 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-200">
 {bulkSummary.count.toLocaleString('fa-IR')} دستگاه در انتخاب
 </div><div className="rounded-2xl border border-slate-200/80 bg-white px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-300">
 ارزش خرید: <span className="font-black text-slate-900 dark:text-slate-50">{formatPrice(bulkSummary.totalPurchase)}</span></div><div className="rounded-2xl border border-slate-200/80 bg-white px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-300">
 سود بالقوه: <span className="font-black text-slate-900 dark:text-slate-50">{formatPrice(bulkSummary.potentialProfit)}</span></div>
 {selectionPreset ? (
 <button type="button" onClick={handleSelectionPresetAction} className="inline-flex items-center gap-3 rounded-2xl border border-[color:var(--brand)]/20 bg-[color:var(--brand)]/10 px-3 py-2 text-xs font-black text-[color:var(--brand)] transition hover:bg-[color:var(--brand)]/15" title={selectionPreset.hint}><i className={`fa-solid ${selectionPreset.icon}`} />
 {selectionPreset.label}
 </button>
 ) : null}
 </div>

 {selectedPhones.length > 0 && (
 <button type="button" onClick={() => setSelectedPhoneIds([])} className="inline-flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 transition hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300"><i className="fa-solid fa-xmark" /> لغو انتخاب‌ها
 </button>
 )}
 </div>

 {workspace === 'insights' && (
 <div className="mb-4 grid gap-3.5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]"><div className="rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.95))] p-4 shadow-[0_22px_50px_-38px_rgba(15,23,42,0.24)] dark:border-slate-800 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.96))]"><div className="flex flex-col gap-3 border-b border-slate-200/80 pb-3 dark:border-slate-800"><div className="text-[11px] font-black tracking-[0.16em] text-slate-500 dark:text-slate-400">INTELLIGENCE LAYER</div><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><h3 className="text-[17px] font-black text-slate-900 dark:text-slate-50">سیگنال‌های مدیریتی انبار</h3><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">این لایه، موجودی را فقط نمایش نمی‌دهد؛ به تو می‌گوید کجا سود در خطر است و کدام اقدام اولویت بالاتری دارد.</p></div><div className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black ${inventoryIntelligence.pressureScore >= 65 ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300' : inventoryIntelligence.pressureScore >= 35 ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300' : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300'}`}><i className="fa-solid fa-radar" /> {inventoryIntelligence.pressureLabel}
 </div></div></div><div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
 {inventoryIntelligence.alerts.length === 0 ? (
 <div className="md:col-span-2 xl:col-span-3 rounded-[20px] border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">هشدار بحرانی فعالی دیده نشد؛ تمرکز را روی حفظ ریتم ورود و قیمت‌گذاری منظم نگه دار.</div>
 ) : (
 inventoryIntelligence.alerts.map((alert) => (
 <div key={alert.key} className="rounded-[20px] border border-slate-200/80 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-950/50"><div className="flex items-start justify-between gap-3"><div><div className="text-[11px] font-black tracking-[0.14em] text-slate-500 dark:text-slate-400">{alert.label}</div><div className="mt-2 text-2xl font-black text-slate-900 dark:text-slate-50">{alert.value.toLocaleString('fa-IR')}</div></div><span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${alert.tone === 'rose' ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300' : alert.tone === 'amber' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300' : alert.tone === 'violet' ? 'bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300' : alert.tone === 'sky' ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}><i className={`fa-solid ${alert.icon}`} /></span></div><div className="mt-3 text-xs leading-6 text-slate-500 dark:text-slate-400">{alert.hint}</div></div>
 ))
 )}
 </div></div><div className="space-y-3"><div className="rounded-[24px] border border-slate-200/80 bg-white/90 p-4 shadow-[0_22px_50px_-38px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-950/60"><div className="text-[11px] font-black tracking-[0.16em] text-slate-500 dark:text-slate-400">NEXT BEST ACTION</div><h3 className="mt-2 text-[17px] font-black text-slate-900 dark:text-slate-50">اقدام پیشنهادی سیستم</h3><p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{inventoryAIPrompt}</p><div className="mt-3 rounded-[18px] border border-slate-200/80 bg-slate-50/80 px-3 py-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
 تمرکز امروز: <span className="font-black text-slate-900 dark:text-slate-50">{inventoryIntelligence.topAction}</span></div></div><div className="rounded-[24px] border border-slate-200/80 bg-white/90 p-4 shadow-[0_22px_50px_-38px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-950/60"><div className="text-[11px] font-black tracking-[0.16em] text-slate-500 dark:text-slate-400">FAST MOVERS</div><h3 className="mt-2 text-[17px] font-black text-slate-900 dark:text-slate-50">مدل‌های با گردش بهتر</h3><div className="mt-4 space-y-3">
 {inventoryIntelligence.fastMoving.length === 0 ? (
 <div className="rounded-[18px] border border-dashed border-slate-200 px-3 py-3 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">فعلاً پیش‌نمایش فروخته‌شده کافی برای پیشنهاد گردش مدل دیده نشده است.</div>
 ) : inventoryIntelligence.fastMoving.map((item) => (
 <div key={item.model} className="rounded-[18px] border border-slate-200/80 bg-slate-50/80 px-3 py-3 dark:border-slate-800 dark:bg-slate-900/60"><div className="flex items-center justify-between gap-3"><div><div className="text-[13px] font-black text-slate-900 dark:text-slate-50">{item.model}</div><div className="mt-1 text-xs text-slate-500 dark:text-slate-400">فروخته‌شده: {item.sold.toLocaleString('fa-IR')} • موجود فعال: {item.active.toLocaleString('fa-IR')}</div></div><span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300"><i className="fa-solid fa-bolt" /> سیگنال خوب</span></div></div>
 ))}
 </div></div></div></div>
 )}
 {selectedPhones.length > 0 && (
 <div className="mt-4 grid gap-3 xl:grid-cols-[1.2fr_1.2fr_auto_auto]"><div className="rounded-[20px] border border-slate-200/80 bg-white p-3 dark:border-slate-700 dark:bg-slate-950/70"><div className="mb-2 text-[11px] font-black tracking-[0.14em] text-slate-500 dark:text-slate-400">وضعیت</div><div className="flex gap-3"><select value={bulkStatusTarget} onChange={(e) => setBulkStatusTarget(e.target.value as PhoneStatus | 'all')} className={`${baseInput} h-11`}><option value="all">انتخاب وضعیت</option>
 {PHONE_STATUSES.map((status) => (<option key={status} value={status}>{status}</option>))}
 </select><button type="button" onClick={() => requestBulkAction('status')} disabled={bulkStatusTarget === 'all' || isBulkSubmitting} className="ux-btn ux-btn-primary h-10 rounded-2xl px-4 text-[11px] shadow-sm ux-btn-sm h-11 px-4 disabled:opacity-50">اعمال</button></div></div><div className="rounded-[20px] border border-slate-200/80 bg-white p-3 dark:border-slate-700 dark:bg-slate-950/70"><div className="mb-2 text-[11px] font-black tracking-[0.14em] text-slate-500 dark:text-slate-400">تخصیص تامین‌کننده</div><div className="flex gap-3"><select value={bulkSupplierTarget} onChange={(e) => setBulkSupplierTarget(e.target.value)} className={`${baseInput} h-11`}><option value="all">انتخاب تامین‌کننده</option>
 {partners.map((partner) => (<option key={partner.id} value={String(partner.id)}>{partner.partnerName}</option>))}
 </select><button type="button" onClick={() => requestBulkAction('supplier')} disabled={bulkSupplierTarget === 'all' || isBulkSubmitting} className="ux-btn ux-btn-secondary h-10 rounded-2xl px-4 text-[11px] shadow-sm ux-btn-sm h-11 px-4 disabled:opacity-50">ثبت اطلاعات</button></div></div><button type="button" onClick={() => requestBulkAction('export')} className="ux-btn ux-btn-success h-[4.5rem] rounded-[20px] px-5 text-[13px] font-black"><i className="fa-solid fa-file-export ml-2" /> خروجی CSV</button></div>
 )}
 </div>
 {inventoryViewMode === 'table' ? (
 <div className="phone-list-shell__table phone-list-shell__table--fit phone-inventory-table-v2 overflow-hidden rounded-[20px] border border-slate-200/80 dark:border-slate-800">
 <div className="inventory-premium-scroll overflow-hidden">
 <table className="w-full table-fixed divide-y divide-slate-200 text-[12px] dark:divide-slate-800">
 <colgroup>
 <col style={{ width: '2.45rem' }} />
 <col style={{ width: '35%' }} />
 <col style={{ width: '10.75rem' }} />
 <col style={{ width: '18.75rem' }} />
 </colgroup>
 <thead className="sticky top-0 z-[1] bg-slate-50/95 backdrop-blur dark:bg-slate-950/90">
 <tr className="text-right text-[10px] font-black tracking-[0.1em] text-slate-500 dark:text-slate-400">
 <th className="px-2 py-2.5">
 <button type="button" onClick={toggleSelectAllVisible} className={`phone-table-select-btn ${allVisibleSelected ? 'is-selected' : ''}`} title={allVisibleSelected ? 'لغو انتخاب همه' : 'انتخاب همه'} aria-label={allVisibleSelected ? 'لغو انتخاب همه گوشی‌های قابل مشاهده' : 'انتخاب همه گوشی‌های قابل مشاهده'}><i className={`fa-solid ${allVisibleSelected ? 'fa-check' : 'fa-minus'} text-[9px]`} /></button>
 </th>
 <th className="px-2 py-2.5">دستگاه</th>
 <th className="px-2 py-2.5 text-left">مالی</th>
 <th className="px-2 py-2.5 text-center">عملیات</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-950/40">
 {inventoryExplorerPhones.map((phone) => {
 const ageDays = phone.purchaseDate || phone.registerDate ? moment().diff(moment(phone.purchaseDate || phone.registerDate), 'days') : null;
 const info = statusBadgeInfo(phone.status);
 const flags = getPhoneOperationalFlags(phone);
 const topFlag = flags[0] ?? null;
 const extraFlagsCount = Math.max(0, flags.length - (topFlag ? 1 : 0));
 const isSelected = selectedPhoneIds.includes(phone.id);
 const profit = Number(phone.salePrice || 0) - getPhoneCostBasisAmount(phone);
 const batteryValue = Number(phone.batteryHealth || 0);
 const batteryLabel = phone.batteryHealth
 ? batteryValue < 70
 ? 'وضعیت باتری بحرانی'
 : batteryValue <= 75
 ? 'باتری تعویض باید بشود'
 : `باتری ${toFaDigits(String(batteryValue))}%`
 : null;
 const rowHoverClass = phone.status === 'مرجوعی اقساطی'
 ? 'hover:bg-rose-50/80 dark:hover:bg-rose-950/18'
 : phone.status === 'مرجوعی'
 ? 'hover:bg-amber-50/80 dark:hover:bg-amber-950/18'
 : topFlag?.label === 'فروش فوری'
 ? 'hover:bg-amber-50/75 dark:hover:bg-amber-950/15'
 : topFlag?.label === 'سود ضعیف'
 ? 'hover:bg-rose-50/70 dark:hover:bg-rose-950/15'
 : topFlag?.label === 'بی‌قیمت'
 ? 'hover:bg-sky-50/70 dark:hover:bg-sky-950/15'
 : 'hover:bg-slate-50/70 dark:hover:bg-slate-900/35';
 const selectedRowClass = !isSelected
 ? ''
 : phone.status === 'مرجوعی اقساطی'
 ? 'bg-rose-50/85 ring-1 ring-inset ring-rose-200/70 dark:bg-rose-950/22 dark:ring-rose-900/40'
 : phone.status === 'مرجوعی'
 ? 'bg-amber-50/85 ring-1 ring-inset ring-amber-200/70 dark:bg-amber-950/22 dark:ring-amber-900/40'
 : topFlag?.label === 'فروش فوری'
 ? 'bg-amber-50/80 ring-1 ring-inset ring-amber-200/70 dark:bg-amber-950/18 dark:ring-amber-900/35'
 : topFlag?.label === 'سود ضعیف'
 ? 'bg-rose-50/75 ring-1 ring-inset ring-rose-200/70 dark:bg-rose-950/18 dark:ring-rose-900/35'
 : topFlag?.label === 'بی‌قیمت'
 ? 'bg-sky-50/75 ring-1 ring-inset ring-sky-200/70 dark:bg-sky-950/18 dark:ring-sky-900/35'
 : 'bg-[color:var(--brand)]/6 ring-1 ring-inset ring-[color:var(--brand)]/20 dark:bg-[color:var(--brand)]/10 dark:ring-[color:var(--brand)]/25';
 const isSoldPhone = phone.status === 'فروخته شده' || phone.status === 'فروخته شده (قسطی)';
 const sellAvailability = getSellAvailability(phone);
 return (
 <tr key={phone.id} className={`h-[112px] text-[12px] text-slate-700 transition ${isSoldPhone ? 'bg-rose-50/70 dark:bg-rose-950/18' : ''} ${rowHoverClass} ${selectedRowClass} dark:text-slate-200`}>
 <td className="px-2 py-2.5 align-middle">
 <button type="button" onClick={() => togglePhoneSelection(phone.id)} className={`phone-table-select-btn ${isSelected ? 'is-selected' : ''}`} title={isSelected ? 'لغو انتخاب' : 'انتخاب'} aria-label={isSelected ? 'لغو انتخاب گوشی' : 'انتخاب گوشی'}><i className={`fa-solid ${isSelected ? 'fa-check' : 'fa-minus'} text-[9px]`} /></button>
 </td>
 <td className="min-w-0 px-2 py-2.5 align-middle">
 <div className="phone-table-device-stack flex min-w-0 min-h-[5.75rem] flex-col justify-center space-y-2">
 <div className="flex min-w-0 items-start justify-between gap-2">
 <div className="min-w-0 space-y-1">
 <div className="truncate text-[13px] font-black leading-5 text-slate-900 dark:text-slate-50" title={phone.model}>{phone.model}</div>
 <div className="flex min-w-0 items-center gap-2">
 <span className="min-w-0 truncate font-mono text-[10.5px] tracking-[0.04em] text-slate-500 dark:text-slate-400" dir="ltr" title={phone.imei || 'IMEI نامشخص'}>{phone.imei || '-'}</span>
 </div>
 </div>
 <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-black leading-none ${info.bgClass}`} title={phone.status}>{phone.status}</span>
 </div>
 <div className="flex min-w-0 flex-wrap gap-1.5 text-[9.5px]">
 <span dir="ltr" className="phone-table-spec-pill phone-table-spec-pill--numeric inline-flex items-center gap-1 rounded-full border border-slate-200/80 bg-slate-50/95 px-2 py-1 text-slate-600 dark:border-slate-700 dark:bg-slate-900/75 dark:text-slate-300"><i className="fa-solid fa-memory text-[9px]" /><span className="phone-table-spec-pill__value">{phone.storage ? `${toFaDigits(String(phone.storage))} GB` : '-'}</span></span>
 <span dir="ltr" className="phone-table-spec-pill phone-table-spec-pill--numeric inline-flex items-center gap-1 rounded-full border border-slate-200/80 bg-slate-50/95 px-2 py-1 text-slate-600 dark:border-slate-700 dark:bg-slate-900/75 dark:text-slate-300"><i className="fa-solid fa-microchip text-[9px]" /><span className="phone-table-spec-pill__value">{phone.ram ? `${toFaDigits(String(phone.ram))} GB` : '-'}</span></span>
 <span className="phone-table-spec-pill inline-flex items-center gap-1 rounded-full border border-slate-200/80 bg-slate-50/95 px-2 py-1 text-slate-600 dark:border-slate-700 dark:bg-slate-900/75 dark:text-slate-300"><i className="fa-solid fa-droplet text-[9px]" /><span className="truncate">{phone.color || 'نامشخص'}</span></span>
 <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 ${phone.supplierName ? 'border border-slate-200/80 bg-slate-50/95 text-slate-600 dark:border-slate-700 dark:bg-slate-900/75 dark:text-slate-300' : 'border border-slate-200/70 bg-slate-50/70 text-slate-400 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-500'}`} title={phone.supplierName || 'بدون تامین‌کننده'}><i className="fa-solid fa-user text-[9px]" />{phone.supplierName || 'بدون تامین'}</span>
 <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 ${ageDays === null ? 'border border-slate-200/70 bg-slate-50/70 text-slate-400 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-500' : ageDays >= 45 ? 'border border-amber-200/80 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-300' : 'border border-slate-200/80 bg-slate-50/95 text-slate-600 dark:border-slate-700 dark:bg-slate-900/75 dark:text-slate-300'}`} title={ageDays === null ? 'سن انبار نامشخص' : `${ageDays.toLocaleString('fa-IR')} روز`}><i className="fa-solid fa-hourglass-half text-[9px]" />{ageDays === null ? 'سن نامشخص' : `${ageDays.toLocaleString('fa-IR')} روز`}</span>
 {batteryLabel ? <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 ${batteryValue <= 75 ? 'border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300' : 'border border-slate-200/80 bg-slate-50/95 text-slate-600 dark:border-slate-700 dark:bg-slate-900/75 dark:text-slate-300'}`}><i className="fa-solid fa-battery-half text-[9px]" />{batteryLabel}</span> : null}
 {topFlag && <span key={topFlag.label} className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-black ${topFlag.tone}`}><i className={`fa-solid ${topFlag.icon}`} />{topFlag.label}</span>}
 {extraFlagsCount > 0 && <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-1.5 py-1 text-[8.5px] font-black text-slate-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400">+{extraFlagsCount.toLocaleString('fa-IR')}</span>}
 </div>
 </div>
 </td>
 <td className="px-2 py-2.5 align-middle text-left" dir="ltr">
 <div className="phone-table-finance-stack flex min-h-[5.75rem] max-w-full flex-col justify-center rounded-2xl border border-slate-200/80 bg-slate-50/85 px-2.5 py-2 dark:border-slate-700 dark:bg-slate-900/70">
 <div className="phone-table-finance-row"><span>خرید</span><strong title={formatPrice(Number(phone.currentPurchasePrice || 0) > 0 ? Number(phone.currentPurchasePrice || 0) : Number(phone.purchasePrice || 0))}>{formatShortPrice(Number(phone.currentPurchasePrice || 0) > 0 ? Number(phone.currentPurchasePrice || 0) : Number(phone.purchasePrice || 0))}</strong></div>
 <div className="phone-table-finance-row"><span>فروش</span><strong className="text-emerald-700 dark:text-emerald-300" title={formatPrice(phone.salePrice)}>{formatShortPrice(phone.salePrice)}</strong></div>
 <div className={`phone-table-finance-row ${profit > 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400'}`}><span>سود</span><strong title={formatPrice(profit)}>{formatShortPrice(profit)}</strong></div>
 </div>
 </td>
 <td className="phone-table-actions-cell px-2 py-2.5 align-middle">
 <div className="phone-table-inline-actions flex min-h-[5.75rem] w-full flex-wrap items-center justify-center gap-1.5">
 <button type="button" onClick={() => openDetailsModal(phone)} className="phone-table-action-btn phone-table-action-btn--neutral" title="جزئیات" aria-label="مشاهده جزئیات گوشی"><i className="fas fa-eye" /><span>جزئیات</span></button>
 <button type="button" onClick={() => openBarcodeModal(phone)} className="phone-table-action-btn phone-table-action-btn--neutral" title="چاپ بارکد" aria-label="چاپ بارکد گوشی"><i className="fas fa-barcode" /><span>بارکد</span></button>
 <button type="button" onClick={() => { if (sellAvailability.canSell) handleSellPhone(phone); else if (!isSoldPhone && sellAvailability.hint === 'اول قیمت‌گذاری کن') openEditModal(phone, 'pricing'); else if (!isSoldPhone && sellAvailability.hint === 'نیاز به بازبینی وضعیت') openEditModal(phone, 'status-review'); }} title={sellAvailability.hint} className={`phone-table-action-btn ${sellAvailability.canSell ? 'phone-table-action-btn--success' : 'phone-table-action-btn--warning'}`} aria-label={sellAvailability.canSell ? 'فروش گوشی' : sellAvailability.hint}><i className={`fas ${sellAvailability.canSell ? 'fa-cash-register' : sellAvailability.hint === 'اول قیمت‌گذاری کن' ? 'fa-tags' : 'fa-clipboard-check'}`} /><span>{sellAvailability.canSell ? 'فروش' : sellAvailability.hint === 'اول قیمت‌گذاری کن' ? 'قیمت' : 'بازبینی'}</span></button>
 {canManage ? <button type="button" onClick={() => openEditModal(phone)} className="phone-table-action-btn phone-table-action-btn--info" title="ویرایش اطلاعات" aria-label="ویرایش اطلاعات گوشی"><i className="fas fa-pen-to-square" /><span>ویرایش</span></button> : null}
 {canManage ? <button type="button" onClick={() => openDeleteModal(phone.id)} className="phone-table-action-btn phone-table-action-btn--danger" title="حذف مورد" aria-label="حذف گوشی"><i className="fas fa-trash" /><span>حذف</span></button> : null}
 </div>
 </td> </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 </div>
 ) : (
 <div className={`phone-list-shell__cards grid ${inventoryViewMode === 'compact' ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'} gap-3.5`}>
 {inventoryExplorerPhones.map((phone) => {
 const ageDays = phone.purchaseDate || phone.registerDate ? moment().diff(moment(phone.purchaseDate || phone.registerDate), 'days') : null;
 const profit = Number(phone.salePrice || 0) - getPhoneCostBasisAmount(phone);
 const info = statusBadgeInfo(phone.status);
 const flags = getPhoneOperationalFlags(phone);
 const topFlag = flags[0] ?? null;
 const cardMetaItems = [
 phone.purchaseDate ? {
 key: 'purchaseDate',
 label: 'تاریخ خرید',
 value: formatIsoToShamsi(phone.purchaseDate),
 title: formatIsoToShamsi(phone.purchaseDate),
 valueClassName: 'text-slate-800 dark:text-slate-200',
 labelClassName: 'text-slate-500 dark:text-slate-400',
 } : null,
 phone.saleDate ? {
 key: 'saleDate',
 label: 'تاریخ فروش',
 value: formatIsoToShamsi(phone.saleDate),
 title: formatIsoToShamsi(phone.saleDate),
 valueClassName: 'text-slate-800 dark:text-slate-200',
 labelClassName: 'text-slate-500 dark:text-slate-400',
 } : {
 key: 'saleDate',
 label: 'تاریخ فروش',
 value: 'ثبت نشده',
 title: 'تاریخ فروش ثبت نشده',
 valueClassName: 'text-slate-500 dark:text-slate-400',
 labelClassName: 'text-slate-500 dark:text-slate-400',
 },
 phone.registerDate ? {
 key: 'register',
 label: 'ثبت اطلاعات',
 value: formatIsoToShamsi(phone.registerDate),
 title: formatIsoToShamsi(phone.registerDate),
 valueClassName: 'text-slate-800 dark:text-slate-200',
 labelClassName: 'text-slate-500 dark:text-slate-400',
 } : null,
 phone.batteryHealth !== null && phone.batteryHealth !== undefined ? {
 key: 'battery',
 label: 'باتری',
 value: `${Number(phone.batteryHealth).toLocaleString('fa-IR')}٪`,
 title: `${Number(phone.batteryHealth).toLocaleString('fa-IR')}٪`,
 valueClassName: `${Number(phone.batteryHealth) < 75 ? 'text-rose-700 dark:text-rose-300' : Number(phone.batteryHealth) < 80 ? 'text-amber-700 dark:text-amber-300' : 'text-slate-800 dark:text-slate-200'}`,
 labelClassName: `${Number(phone.batteryHealth) < 75 ? 'text-rose-600/90 dark:text-rose-400' : Number(phone.batteryHealth) < 80 ? 'text-amber-600/90 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'}`,
 } : null,
 ].filter(Boolean).slice(0, 4) as Array<{ key: string; label: string; value: string; title: string; dir?: 'ltr'; valueClassName?: string; labelClassName?: string }>;
 const isSelected = selectedPhoneIds.includes(phone.id);
 const isSoldPhone = phone.status === 'فروخته شده' || phone.status === 'فروخته شده (قسطی)';
 const selectedCardTone = !isSelected
 ? isSoldPhone
 ? 'border-rose-200 bg-rose-50/80 dark:border-rose-900/40 dark:bg-rose-950/18'
 : 'border-slate-200/80 dark:border-slate-800'
 : phone.status === 'مرجوعی اقساطی'
 ? 'border-rose-200 ring-2 ring-rose-200/70 bg-rose-50/70 dark:border-rose-900/40 dark:ring-rose-900/35 dark:bg-rose-950/16'
 : phone.status === 'مرجوعی'
 ? 'border-amber-200 ring-2 ring-amber-200/70 bg-amber-50/70 dark:border-amber-900/40 dark:ring-amber-900/35 dark:bg-amber-950/16'
 : topFlag?.label === 'فروش فوری'
 ? 'border-amber-200 ring-2 ring-amber-200/70 bg-amber-50/65 dark:border-amber-900/35 dark:ring-amber-900/30 dark:bg-amber-950/14'
 : topFlag?.label === 'سود ضعیف'
 ? 'border-rose-200 ring-2 ring-rose-200/70 bg-rose-50/65 dark:border-rose-900/35 dark:ring-rose-900/30 dark:bg-rose-950/14'
 : topFlag?.label === 'بی‌قیمت'
 ? 'border-sky-200 ring-2 ring-sky-200/70 bg-sky-50/65 dark:border-sky-900/35 dark:ring-sky-900/30 dark:bg-sky-950/14'
 : 'border-[color:var(--brand)] ring-2 ring-[color:var(--brand)]/15 bg-[color:var(--brand)]/5 dark:border-[color:var(--brand)]/35 dark:ring-[color:var(--brand)]/25 dark:bg-[color:var(--brand)]/10';
 const cardHoverTone = !isSelected
 ? isSoldPhone
 ? 'hover:border-rose-300/90 hover:bg-rose-100/75 dark:hover:border-rose-800/50 dark:hover:bg-rose-950/22'
 : phone.status === 'مرجوعی اقساطی'
 ? 'hover:border-rose-200/90 hover:bg-rose-50/60 dark:hover:border-rose-900/40 dark:hover:bg-rose-950/12'
 : phone.status === 'مرجوعی'
 ? 'hover:border-amber-200/90 hover:bg-amber-50/60 dark:hover:border-amber-900/40 dark:hover:bg-amber-950/12'
 : topFlag?.label === 'فروش فوری'
 ? 'hover:border-amber-200/80 hover:bg-amber-50/55 dark:hover:border-amber-900/35 dark:hover:bg-amber-950/10'
 : topFlag?.label === 'سود ضعیف'
 ? 'hover:border-rose-200/80 hover:bg-rose-50/55 dark:hover:border-rose-900/35 dark:hover:bg-rose-950/10'
 : topFlag?.label === 'بی‌قیمت'
 ? 'hover:border-sky-200/80 hover:bg-sky-50/55 dark:hover:border-sky-900/35 dark:hover:bg-sky-950/10'
 : 'hover:border-slate-300/90 dark:hover:border-slate-700'
 : phone.status === 'مرجوعی اقساطی'
 ? 'hover:border-rose-300 hover:bg-rose-100/80 hover:ring-rose-200/90 dark:hover:border-rose-800/55 dark:hover:bg-rose-950/24 dark:hover:ring-rose-900/45'
 : phone.status === 'مرجوعی'
 ? 'hover:border-amber-300 hover:bg-amber-100/80 hover:ring-amber-200/90 dark:hover:border-amber-800/55 dark:hover:bg-amber-950/24 dark:hover:ring-amber-900/45'
 : topFlag?.label === 'فروش فوری'
 ? 'hover:border-amber-300 hover:bg-amber-100/75 hover:ring-amber-200/80 dark:hover:border-amber-800/50 dark:hover:bg-amber-950/22 dark:hover:ring-amber-900/40'
 : topFlag?.label === 'سود ضعیف'
 ? 'hover:border-rose-300 hover:bg-rose-100/75 hover:ring-rose-200/80 dark:hover:border-rose-800/50 dark:hover:bg-rose-950/22 dark:hover:ring-rose-900/40'
 : topFlag?.label === 'بی‌قیمت'
 ? 'hover:border-sky-300 hover:bg-sky-100/75 hover:ring-sky-200/80 dark:hover:border-sky-800/50 dark:hover:bg-sky-950/22 dark:hover:ring-sky-900/40'
 : 'hover:border-[color:var(--brand)]/90 hover:bg-[color:var(--brand)]/8 hover:ring-[color:var(--brand)]/20 dark:hover:border-[color:var(--brand)]/45 dark:hover:bg-[color:var(--brand)]/14 dark:hover:ring-[color:var(--brand)]/28';
 const cardMenuTone = phone.status === 'مرجوعی اقساطی'
 ? { button: 'border-rose-200/80 bg-rose-50/80 text-rose-700 hover:bg-rose-100/90 dark:border-rose-900/40 dark:bg-rose-950/25 dark:text-rose-200 dark:hover:bg-rose-950/40', shell: 'border-rose-200/80 bg-white/95 dark:border-rose-900/40 dark:bg-slate-950/95' }
 : phone.status === 'مرجوعی'
 ? { button: 'border-amber-200/80 bg-amber-50/85 text-amber-700 hover:bg-amber-100/90 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-200 dark:hover:bg-amber-950/40', shell: 'border-amber-200/80 bg-white/95 dark:border-amber-900/40 dark:bg-slate-950/95' }
 : topFlag?.label === 'فروش فوری'
 ? { button: 'border-amber-200/80 bg-amber-50/80 text-amber-700 hover:bg-amber-100/90 dark:border-amber-900/35 dark:bg-amber-950/20 dark:text-amber-200 dark:hover:bg-amber-950/35', shell: 'border-amber-200/70 bg-white/95 dark:border-amber-900/35 dark:bg-slate-950/95' }
 : topFlag?.label === 'سود ضعیف'
 ? { button: 'border-rose-200/80 bg-rose-50/80 text-rose-700 hover:bg-rose-100/90 dark:border-rose-900/35 dark:bg-rose-950/20 dark:text-rose-200 dark:hover:bg-rose-950/35', shell: 'border-rose-200/70 bg-white/95 dark:border-rose-900/35 dark:bg-slate-950/95' }
 : topFlag?.label === 'بی‌قیمت'
 ? { button: 'border-sky-200/80 bg-sky-50/80 text-sky-700 hover:bg-sky-100/90 dark:border-sky-900/35 dark:bg-sky-950/20 dark:text-sky-200 dark:hover:bg-sky-950/35', shell: 'border-sky-200/70 bg-white/95 dark:border-sky-900/35 dark:bg-slate-950/95' }
 : { button: 'border-slate-200/80 bg-white/85 text-slate-600 hover:bg-slate-100/90 dark:border-slate-800 dark:bg-slate-950/45 dark:text-slate-200 dark:hover:bg-slate-900/85', shell: 'border-slate-200/80 bg-white/95 dark:border-slate-800 dark:bg-slate-950/95' };
 const sellAvailability = getSellAvailability(phone);
 return (
 <div key={phone.id} className={`phone-card-surface rounded-[22px] border ${isSoldPhone ? 'border-rose-200 bg-rose-50/85 dark:border-rose-900/45 dark:bg-rose-950/18' : selectedCardTone} ${cardHoverTone} overflow-hidden bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(248,250,252,0.97))] shadow-[0_16px_38px_-32px_rgba(15,23,42,0.18)] transition hover:-translate-y-[1px] hover:shadow-[0_20px_40px_-30px_rgba(15,23,42,0.24)] dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(2,6,23,0.96))]`}><div className="p-3.5"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-3"><button type="button" onClick={() => togglePhoneSelection(phone.id)} className={`phone-card-select-btn mt-1 text-[13px] transition ${isSelected ? 'text-[color:var(--brand)] dark:text-[color:var(--brand)]' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50'}`} title="انتخاب این گوشی"><i className={`fa-solid ${isSelected ? 'fa-square-check' : 'fa-square'}`} /></button><div className="min-w-0"><div className="flex flex-wrap items-center gap-1.5"><h4 className="truncate text-[15px] font-extrabold leading-5 text-slate-900 dark:text-slate-50">{phone.model}</h4></div><div dir="ltr" className="mt-1 flex items-center gap-1.5 font-mono text-[11px] tracking-[0.03em] text-slate-500 dark:text-slate-400" title={phone.imei || 'IMEI نامشخص'}><span className="truncate">{phone.imei || '—'}</span><span className="inline-flex items-center rounded-full border border-[color:var(--brand)]/18 bg-[color:var(--brand)]/8 px-1.5 py-0.5 text-[8.5px] font-black text-[color:var(--brand)]">IMEI</span></div><div className="phone-card-specs-row mt-1.5 grid grid-cols-3 gap-1.5 text-[10px]"><span dir="ltr" className="phone-card-spec-pill phone-card-spec-pill--numeric inline-flex min-w-0 items-center justify-center gap-1 rounded-full border border-slate-200/80 bg-white/80 px-1.5 py-0.5 text-slate-600 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300"><i className="fa-solid fa-memory shrink-0 text-[9px]" /><span className="phone-card-spec-pill__value">{phone.storage ? `${toFaDigits(String(phone.storage))} GB` : '-'}</span></span><span dir="ltr" className="phone-card-spec-pill phone-card-spec-pill--numeric inline-flex min-w-0 items-center justify-center gap-1 rounded-full border border-slate-200/80 bg-white/80 px-1.5 py-0.5 text-slate-600 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300"><i className="fa-solid fa-microchip shrink-0 text-[9px]" /><span className="phone-card-spec-pill__value">{phone.ram ? `${toFaDigits(String(phone.ram))} GB` : '-'}</span></span><span className="phone-card-spec-pill inline-flex min-w-0 items-center justify-center gap-1 rounded-full border border-slate-200/80 bg-white/80 px-1.5 py-0.5 text-slate-600 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300"><i className="fa-solid fa-palette shrink-0 text-[9px]" /><span className="phone-card-spec-pill__value phone-card-spec-pill__value--text">{phone.color || '-'}</span></span></div></div></div><div className="flex shrink-0 flex-col items-end gap-1.5"><span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${info.bgClass}`}><i className={`fa-solid ${info.icon}`}></i>{phone.status}</span>{topFlag && <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-black ${topFlag.tone}`}><i className={`fa-solid ${topFlag.icon}`} />{topFlag.label}</span>}</div></div><div className="mt-3 grid grid-cols-3 gap-3 text-[11px]"><div className="rounded-[16px] border border-slate-200/80 bg-white/85 p-2.5 dark:border-slate-800 dark:bg-slate-950/40"><div className="text-[10px] font-black tracking-[0.1em] text-slate-500 dark:text-slate-400">خرید</div><div dir="ltr" title={formatPrice(Number(phone.currentPurchasePrice || 0) > 0 ? Number(phone.currentPurchasePrice || 0) : Number(phone.purchasePrice || 0))} className="mt-1 font-mono tabular-nums text-[12px] font-black text-slate-900 dark:text-slate-50">{formatShortPrice(Number(phone.currentPurchasePrice || 0) > 0 ? Number(phone.currentPurchasePrice || 0) : Number(phone.purchasePrice || 0))}</div></div><div className="rounded-[16px] border border-slate-200/80 bg-white/85 p-2.5 dark:border-slate-800 dark:bg-slate-950/40"><div className="text-[10px] font-black tracking-[0.1em] text-slate-500 dark:text-slate-400">فروش</div><div dir="ltr" title={formatPrice(phone.salePrice)} className="mt-1 font-mono tabular-nums text-[12px] font-black text-slate-900 dark:text-slate-50">{formatShortPrice(phone.salePrice)}</div></div><div className="rounded-[16px] border border-slate-200/80 bg-white/85 p-2.5 dark:border-slate-800 dark:bg-slate-950/40"><div className="text-[10px] font-black tracking-[0.1em] text-slate-500 dark:text-slate-400">سود</div><div dir="ltr" title={formatPrice(Number(phone.salePrice || 0) - (Number(phone.currentPurchasePrice || 0) > 0 ? Number(phone.currentPurchasePrice || 0) : Number(phone.purchasePrice || 0)))} className={`mt-1 font-mono tabular-nums text-[12px] font-black ${Number(phone.salePrice || 0) - (Number(phone.currentPurchasePrice || 0) > 0 ? Number(phone.currentPurchasePrice || 0) : Number(phone.purchasePrice || 0)) > 0 ? 'text-emerald-600 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-200'}`}>{formatShortPrice(Number(phone.salePrice || 0) - (Number(phone.currentPurchasePrice || 0) > 0 ? Number(phone.currentPurchasePrice || 0) : Number(phone.purchasePrice || 0)))}</div></div></div><div className="mt-3 grid grid-cols-2 gap-2.5 text-[11px] sm:grid-cols-3">{cardMetaItems.map((item) => (<div key={item.key} className="rounded-[14px] border border-slate-200/70 bg-slate-50/75 px-2.5 py-2 dark:border-slate-800 dark:bg-slate-950/35"><div className={`text-[9.5px] font-black tracking-[0.08em] ${item.labelClassName || 'text-slate-500 dark:text-slate-400'}`}>{item.label}</div><div dir={item.dir} className={`mt-1 truncate text-[11px] font-bold ${item.valueClassName || 'text-slate-800 dark:text-slate-200'}`} title={item.title}>{item.value}</div></div>))}</div>{inventoryViewMode !== 'compact' && phone.notes && (<div className="mt-3 rounded-[16px] border border-dashed border-slate-200/90 bg-slate-50/75 px-3 py-2 text-[11px] text-slate-600 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-300"><span className="font-black text-slate-500 dark:text-slate-400">یادداشت:</span> <span className="line-clamp-2 align-middle">{phone.notes}</span></div>)}</div><div className="phone-card-footer flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 bg-white/60 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/40"><div className="phone-card-supplier flex items-center gap-2 text-[10.5px] text-slate-500 dark:text-slate-400"><span className="inline-flex h-7 w-7 items-center justify-center rounded-xl border border-slate-200/80 bg-white/80 text-slate-600 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300"><i className="fa-solid fa-user text-[10px]" /></span><span className="font-semibold">{phone.supplierName || 'بدون تامین‌کننده'}</span></div><div className="phone-card-actions flex flex-wrap items-center justify-end gap-2"><button onClick={() => handleSellPhone(phone)} disabled={!sellAvailability.canSell} className="ux-btn ux-btn-success ux-btn-sm h-9 rounded-2xl px-3.5 text-[11px] font-black disabled:opacity-50" title={sellAvailability.canSell ? 'فروش این گوشی' : sellAvailability.hint}><i className="fas fa-cash-register ml-1 text-[11px]" /> فروش</button><button onClick={() => openDetailsModal(phone)} className="ux-btn ux-btn-ghost ux-btn-sm h-9 w-9 rounded-2xl p-0 text-slate-700 dark:text-slate-200" title="جزئیات"><i className="fas fa-eye text-[11px]" /></button><button onClick={() => openBarcodeModal(phone)} className="ux-btn ux-btn-secondary ux-btn-sm h-9 w-9 rounded-2xl p-0 text-[11px] font-black" title="چاپ بارکد"><i className="fas fa-barcode text-[11px]" /></button>{!isSoldPhone && !sellAvailability.canSell && sellAvailability.hint === 'اول قیمت‌گذاری کن' ? (<button onClick={() => openEditModal(phone, 'pricing')} className="ux-btn ux-btn-warning ux-btn-sm h-9 rounded-2xl px-3 text-[11px] font-black"><i className="fas fa-tags ml-1 text-[11px]" /> قیمت‌گذاری</button>) : null}{!sellAvailability.canSell && sellAvailability.hint === 'نیاز به بازبینی وضعیت' ? (<button onClick={() => openEditModal(phone, 'status-review')} className="ux-btn ux-btn-warning ux-btn-sm h-9 rounded-2xl px-3 text-[11px] font-black"><i className="fas fa-clipboard-check ml-1 text-[11px]" /> بازبینی وضعیت</button>) : null}{canManage && <button onClick={() => openEditModal(phone)} className="ux-btn ux-btn-primary ux-btn-sm h-9 w-9 rounded-2xl p-0" title="ویرایش اطلاعات"><i className="fas fa-pen-to-square text-[11px]" /></button>}{canManage && <button onClick={() => openDeleteModal(phone.id)} className="ux-btn ux-btn-danger ux-btn-sm h-9 w-9 rounded-2xl p-0" title="حذف مورد"><i className="fas fa-trash text-[11px]" /></button>}</div></div></div>
 );
 })}
 </div>
 )}
 </div>
 )}
 </div></div></section>

 {/* Details Modal */}
 {isDetailsModalOpen && selectedPhoneForDetails && (
 <Modal
 title={`جزئیات دستگاه: ${selectedPhoneForDetails.model}`}
 onClose={() => { setIsDetailsModalOpen(false); setSelectedPhoneForDetails(null); setDetailsTab('overview'); setDetailsHistory([]); setDetailsHistoryError(null); }}
 widthClass="max-w-7xl"
 iconClass="fa-solid fa-mobile-screen-button"
 variant="expansive"
 size="full"
 layout="split"
 bodyClassName="mobile-phone-detail-modal-body"
 ><div className="space-y-4 p-2"><section className="overflow-hidden rounded-[30px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] p-5 shadow-[0_30px_70px_-44px_rgba(15,23,42,0.24)] dark:border-slate-800 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(2,6,23,0.96))]"><div className="grid gap-5 xl:grid-cols-[minmax(0,1.18fr)_minmax(19rem,0.82fr)]"><div className="space-y-4"><div className="flex flex-wrap items-center gap-2"><span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-3 py-1.5 text-[11px] font-black tracking-[0.16em] text-slate-500 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-400"><i className="fa-solid fa-mobile-screen-button" style={{ color: brand }} /> DEVICE PROFILE</span><span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black ${statusBadgeInfo(selectedPhoneForDetails.status).bgClass}`}><i className={`fa-solid ${statusBadgeInfo(selectedPhoneForDetails.status).icon}`}></i>{selectedPhoneForDetails.status}</span>{detailAge !== null ? <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-black text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300"><i className="fa-solid fa-hourglass-half" /> {detailAge.toLocaleString('fa-IR')} روز در انبار</span> : null}</div><div><h3 className="text-[1.65rem] font-black text-slate-900 dark:text-slate-50">{selectedPhoneForDetails.model}</h3><div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-slate-500 dark:text-slate-400"><span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/80 px-3 py-1.5 font-black dark:border-slate-700 dark:bg-slate-950/60"><i className="fa-solid fa-sim-card" /> {selectedPhoneForDetails.storage || '-'}</span><span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/80 px-3 py-1.5 font-black dark:border-slate-700 dark:bg-slate-950/60"><i className="fa-solid fa-memory" /> {selectedPhoneForDetails.ram || '-'}</span><span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/80 px-3 py-1.5 font-black dark:border-slate-700 dark:bg-slate-950/60"><i className="fa-solid fa-palette" /> {selectedPhoneForDetails.color || '-'}</span></div></div><div className="rounded-[24px] border border-slate-200/80 bg-white/82 p-4 shadow-[0_18px_44px_-34px_rgba(15,23,42,0.16)] dark:border-slate-800 dark:bg-slate-950/55"><div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start"><div><div className="text-[11px] font-black tracking-[0.14em] text-slate-500 dark:text-slate-400">IMEI / شناسه یکتا</div><div dir="ltr" className="mt-2 break-all font-mono text-[15px] font-black text-slate-900 dark:text-slate-50">{selectedPhoneForDetails.imei}</div></div><div className="flex flex-wrap justify-start gap-2 md:justify-end"><Button type="button" variant="secondary" size="sm" className="shadow-sm px-3" onClick={() => openBarcodeModal(selectedPhoneForDetails)} title="چاپ بارکد" leftIcon={<i className="fas fa-barcode" />}></Button>{canManage ? <Button type="button" variant="secondary" size="sm" onClick={() => { setIsDetailsModalOpen(false); openEditModal(selectedPhoneForDetails); }} leftIcon={<i className="fas fa-pen-to-square" />}>ویرایش اطلاعات</Button> : null}<Button type="button" variant="secondary" size="sm" onClick={() => handleSellPhone(selectedPhoneForDetails)} leftIcon={<i className="fas fa-cash-register" />}>فروش این دستگاه</Button></div></div></div><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[{ label: 'بهای خرید', value: formatPrice(selectedPhoneForDetails.purchasePrice), tone: 'text-slate-900 dark:text-slate-50', icon: 'fa-bag-shopping' }, { label: 'قیمت فروش', value: formatPrice(selectedPhoneForDetails.salePrice), tone: 'text-slate-900 dark:text-slate-50', icon: 'fa-tags' }, { label: 'سود/زیان ثبت اولیه', value: formatPrice(detailProfit), tone: detailProfit >= 0 ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300', icon: 'fa-chart-line' }, { label: 'سلامت باتری', value: selectedPhoneForDetails.batteryHealth !== null && selectedPhoneForDetails.batteryHealth !== undefined ? `${Number(selectedPhoneForDetails.batteryHealth).toLocaleString('fa-IR')}٪` : 'ثبت اطلاعات نشده', tone: 'text-slate-900 dark:text-slate-50', icon: 'fa-battery-three-quarters' }].map((item) => (<div key={item.label} className="rounded-[22px] border border-slate-200/80 bg-white/84 p-4 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.16)] dark:border-slate-800 dark:bg-slate-950/55"><div className="flex items-center justify-between gap-3"><div><div className="text-[11px] font-black tracking-[0.14em] text-slate-500 dark:text-slate-400">{item.label}</div><div className={`mt-2 text-[15px] font-black ${item.tone}`}>{item.value}</div></div><span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200/80 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"><i className={`fa-solid ${item.icon}`} /></span></div></div>))}</div></div><aside className="space-y-3"><div className="grid grid-cols-2 gap-3">{[{ label: 'تامین‌کننده', value: selectedPhoneForDetails.supplierName || 'ثبت اطلاعات نشده', icon: 'fa-truck-fast' }, { label: 'وضعیت ظاهری', value: selectedPhoneForDetails.condition || 'ثبت اطلاعات نشده', icon: 'fa-star' }, { label: 'تاریخ خرید', value: selectedPhoneForDetails.purchaseDate ? formatIsoToShamsi(selectedPhoneForDetails.purchaseDate) : 'ثبت اطلاعات نشده', icon: 'fa-calendar-days' }, { label: 'تاریخ فروش', value: selectedPhoneForDetails.saleDate ? formatIsoToShamsi(selectedPhoneForDetails.saleDate) : 'بدون خروج', icon: 'fa-calendar-check' }].map((item) => (<div key={item.label} className="rounded-[22px] border border-slate-200/80 bg-white/82 p-4 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.14)] dark:border-slate-800 dark:bg-slate-950/55"><div className="flex items-center gap-2 text-[11px] font-black tracking-[0.14em] text-slate-500 dark:text-slate-400"><i className={`fa-solid ${item.icon}`} /> {item.label}</div><div className="mt-2 text-[13px] font-black text-slate-900 dark:text-slate-50">{item.value}</div></div>))}</div><div className="rounded-[24px] border border-slate-200/80 bg-white/84 p-4 shadow-[0_18px_44px_-34px_rgba(15,23,42,0.16)] dark:border-slate-800 dark:bg-slate-950/55"><div className="text-[11px] font-black tracking-[0.14em] text-slate-500 dark:text-slate-400">خلاصه مدیریتی</div><p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{selectedPhoneForDetails.status === 'موجود در انبار' ? 'این دستگاه آماده تصمیم فروش است. قیمت فروش، سود بالقوه و سن انبار را کنار هم بررسی و ادامه کن تا سریع‌تر از حالت راکد خارج شود.' : selectedPhoneForDetails.status === 'مرجوعی' || selectedPhoneForDetails.status === 'مرجوعی اقساطی' ? 'این دستگاه در چرخه بازگشت قرار دارد. قبل از فروش مجدد، وضعیت ظاهری، قیمت‌گذاری و توضیحات مرجوعی را دقیق چک کن.' : 'این دستگاه از انبار خارج شده و این نما برای رهگیری سابقه، قیمت و مسیر آن نگه داشته شده است.'}</p></div></aside></div></section><div className="rounded-[24px] border border-slate-200/80 bg-white/80 p-2 shadow-[0_22px_48px_-36px_rgba(15,23,42,0.18)] dark:border-slate-800 dark:bg-slate-950/55"><div className="grid grid-cols-3 gap-3">{([{ key: 'overview', label: 'نمای کلی', icon: 'fa-grid-2' }, { key: 'timeline', label: 'تایم‌لاین', icon: 'fa-wave-square' }, { key: 'dossier', label: 'شناسنامه', icon: 'fa-id-card-clip' }] as const).map((tab) => { const active = detailsTab === tab.key; return (<button key={tab.key} type="button" onClick={() => setDetailsTab(tab.key)} className={`rounded-[18px] px-4 py-2.5 text-[13px] font-black transition ${active ? 'bg-slate-900 text-white shadow-[0_20px_36px_-24px_rgba(15,23,42,0.45)] dark:bg-white dark:text-slate-900' : 'bg-transparent text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-900/60'}`}><span className="flex items-center justify-center gap-3"><i className={`fa-solid ${tab.icon}`} />{tab.label}</span></button>); })}</div></div><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[{ label: 'سن انبار', value: detailAge !== null ? `${detailAge.toLocaleString('fa-IR')} روز` : 'نامشخص', tone: 'text-slate-900 dark:text-slate-50', icon: 'fa-hourglass-half' }, { label: 'وضعیت', value: selectedPhoneForDetails.status, tone: 'text-slate-900 dark:text-slate-50', icon: 'fa-signal' }].map((item) => (<div key={item.label} className="rounded-[22px] border border-slate-200/80 bg-white/85 p-4 shadow-[0_20px_40px_-32px_rgba(15,23,42,0.18)] dark:border-slate-800 dark:bg-slate-950/55"><div className="flex items-center justify-between gap-3"><div><div className="text-[11px] font-black tracking-[0.14em] text-slate-500 dark:text-slate-400">{item.label}</div><div className={`mt-2 text-[13px] font-black ${item.tone}`}>{item.value}</div></div><span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200/80 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"><i className={`fa-solid ${item.icon}`} /></span></div></div>))}</div><div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.14fr)_minmax(0,0.86fr)]">{detailsTab !== 'dossier' && (<section className="rounded-[28px] border border-slate-200/80 bg-white/95 p-5 shadow-[0_26px_60px_-40px_rgba(15,23,42,0.2)] dark:border-slate-800 dark:bg-slate-900/85"><div className="flex items-center justify-between gap-3"><div><div className="text-[11px] font-black tracking-[0.16em] text-slate-500 dark:text-slate-400">LIFECYCLE TIMELINE</div><h4 className="mt-2 text-[17px] font-black text-slate-900 dark:text-slate-50">تایم‌لاین چرخه عمر دستگاه</h4></div><span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">{detailTimeline.length.toLocaleString('fa-IR')} رویداد</span></div><div className="mt-5 space-y-3">{detailTimeline.map((event, index) => (<div key={event.key} className="relative rounded-[22px] border border-slate-200/80 bg-slate-50/70 p-4 pr-14 dark:border-slate-800 dark:bg-slate-950/50">{index !== detailTimeline.length - 1 && <span className="absolute right-[1.7rem] top-[3.3rem] h-[calc(100%+0.9rem)] w-px bg-gradient-to-b from-slate-300 to-transparent dark:from-slate-700" />}<span className={`absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-2xl ${event.tone === 'emerald' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : event.tone === 'amber' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' : event.tone === 'violet' ? 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300' : event.tone === 'rose' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' : event.tone === 'sky' ? 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}><i className={`fa-solid ${event.icon}`} /></span><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><div className="text-[13px] font-black text-slate-900 dark:text-slate-50">{event.title}</div><p className="mt-1 text-sm leading-7 text-slate-500 dark:text-slate-400">{event.description}</p>{Array.isArray((event as any).diffs) && (event as any).diffs.length > 0 ? (<div className="mt-3 flex flex-wrap gap-3">{(event as any).diffs.map((diff: any, idx: number) => (<span key={`${diff.key || diff.label}-${idx}`} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 shadow-sm text-[11px] font-black text-slate-700 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-200"><span className="text-slate-500 dark:text-slate-400">{diff.label}</span><span>{formatHistoryDiffValue(diff.from, diff.kind)}</span><i className="fa-solid fa-arrow-left text-[10px] text-slate-400" /><span className="text-slate-900 dark:text-slate-50">{formatHistoryDiffValue(diff.to, diff.kind)}</span></span>))}</div>) : null}{(event as any).meta ? <div className="mt-3 text-xs text-slate-400 dark:text-slate-500">{(event as any).meta}</div> : null}</div><div className="text-xs font-black text-slate-500 dark:text-slate-400">{event.date ? (String(event.date).includes('T') ? formatIsoToShamsiDateTime(event.date) : formatIsoToShamsi(event.date)) : 'بدون تاریخ'}</div></div></div>))}</div></section>)}<aside className="space-y-3"><section className="rounded-[28px] border border-slate-200/80 bg-white/95 p-5 shadow-[0_26px_60px_-40px_rgba(15,23,42,0.2)] dark:border-slate-800 dark:bg-slate-900/85"><div className="flex items-center justify-between gap-3"><div><div className="text-[11px] font-black tracking-[0.16em] text-slate-500 dark:text-slate-400">EVENT LOG</div><h4 className="mt-2 text-[17px] font-black text-slate-900 dark:text-slate-50">تاریخچه واقعی ثبت اطلاعات‌شده</h4></div><span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-black text-slate-600 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-300"><i className="fa-solid fa-database" />{detailHistorySummary.count.toLocaleString('fa-IR')} رویداد</span></div>{isDetailsHistoryLoading ? (<div className="mt-4 space-y-3"><Skeleton className="h-16 rounded-[18px]" /><Skeleton className="h-16 rounded-[18px]" /></div>) : detailsHistoryError ? (<div className="mt-4 rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">{detailsHistoryError}</div>) : (<div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div className="rounded-[20px] border border-slate-200/80 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/60"><div className="text-[11px] font-black tracking-[0.12em] text-slate-500 dark:text-slate-400">آخرین تغییر</div><div className="mt-2 font-black text-slate-900 dark:text-slate-50">{detailHistorySummary.lacheck?.title || 'هنوز ثبت اطلاعات نشده'}</div></div><div className="rounded-[20px] border border-slate-200/80 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/60"><div className="text-[11px] font-black tracking-[0.12em] text-slate-500 dark:text-slate-400">آخرین ثبت اطلاعات‌کننده</div><div className="mt-2 font-black text-slate-900 dark:text-slate-50">{detailHistorySummary.lacheck?.actorDisplayName || detailHistorySummary.lacheck?.actorUsername || 'نامشخص'}</div></div><div className="rounded-[20px] border border-slate-200/80 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/60"><div className="text-[11px] font-black tracking-[0.12em] text-slate-500 dark:text-slate-400">تاچ قیمت</div><div className="mt-2 font-black text-slate-900 dark:text-slate-50">{detailHistorySummary.priceTouches.toLocaleString('fa-IR')}</div></div><div className="rounded-[20px] border border-slate-200/80 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/60"><div className="text-[11px] font-black tracking-[0.12em] text-slate-500 dark:text-slate-400">تاچ وضعیت</div><div className="mt-2 font-black text-slate-900 dark:text-slate-50">{detailHistorySummary.statusTouches.toLocaleString('fa-IR')}</div></div></div>)}<div className="mt-4 rounded-[22px] border border-dashed border-slate-300 bg-slate-50/70 p-4 text-sm leading-7 text-slate-600 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-300">این بخش از لاگ واقعی backend خوانده می‌شود. هر تغییر مهم روی قیمت، وضعیت، تامین یا شناسنامه دستگاه اینجا قابل رهگیری است.</div></section>{detailsTab !== 'timeline' && (<section className="rounded-[28px] border border-slate-200/80 bg-white/95 p-5 shadow-[0_26px_60px_-40px_rgba(15,23,42,0.2)] dark:border-slate-800 dark:bg-slate-900/85"><div className="text-[11px] font-black tracking-[0.16em] text-slate-500 dark:text-slate-400">DEVICE DOSSIER</div><h4 className="mt-2 text-[17px] font-black text-slate-900 dark:text-slate-50">شناسنامه کامل دستگاه</h4><div className="mt-4 space-y-3 text-sm"><div className="flex items-center justify-between gap-3 rounded-[18px] border border-slate-200/80 bg-slate-50/80 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-950/50"><span className="text-slate-500 dark:text-slate-400">فروشنده/ثبت اطلاعات‌کننده</span><span className="font-black text-slate-900 dark:text-slate-50">{selectedPhoneForDetails.sellerName || 'ثبت اطلاعات نشده'}</span></div><div className="flex items-center justify-between gap-3 rounded-[18px] border border-slate-200/80 bg-slate-50/80 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-950/50"><span className="text-slate-500 dark:text-slate-400">خریدار</span><span className="font-black text-slate-900 dark:text-slate-50">{selectedPhoneForDetails.buyerName || 'ثبت اطلاعات نشده'}</span></div><div className="flex items-center justify-between gap-3 rounded-[18px] border border-slate-200/80 bg-slate-50/80 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-950/50"><span className="text-slate-500 dark:text-slate-400">تاریخ بازگشت</span><span className="font-black text-slate-900 dark:text-slate-50">{selectedPhoneForDetails.returnDate || 'ندارد'}</span></div><div className="rounded-[18px] border border-slate-200/80 bg-slate-50/80 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-950/50"><div className="text-slate-500 dark:text-slate-400">یادداشت مدیریتی</div><div className="mt-2 text-sm font-semibold leading-7 text-slate-900 dark:text-slate-50">{selectedPhoneForDetails.notes || 'یادداشتی برای این دستگاه ثبت اطلاعات نشده است.'}</div></div></div></section>)}</aside></div></div></Modal>
 )}
 <Modal
 isOpen={isPhoneImportExportOpen}
 title="ایمپورت / اکسپورت لیست گوشی‌ها"
 onClose={() => setIsPhoneImportExportOpen(false)}
 widthClass="max-w-5xl"
 iconClass="fa-solid fa-file-import"
 tone="info"
 variant="expansive"
 layout="split"
 >
 <div className="space-y-5 p-2" dir="rtl">
 <section className="rounded-[26px] border border-slate-200 bg-white p-4 md:p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
 <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
 <div className="flex min-w-0 items-start gap-3">
 <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"><i className="fa-solid fa-mobile-screen-button" /></span>
 <div className="min-w-0">
 <h3 className="text-base font-black text-slate-950 dark:text-white">ورود و خروج دقیق لیست گوشی‌ها</h3>
 <p className="mt-1 text-sm leading-7 text-slate-500 dark:text-slate-400">برای ورود مجدد، از «خروجی کامل قابل ایمپورت» استفاده کن؛ فایل «قالب نمونه» فقط یک ردیف راهنما دارد. رکوردها با شناسه یا IMEI بروزرسانی می‌شوند و اگر موردی پیدا نشود گوشی جدید ثبت می‌شود.</p>
 </div>
 </div>
 <div className="flex flex-col gap-2 sm:items-end">
 <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
 <Button type="button" variant="secondary" size="sm" onClick={doDownloadPhonesTemplate} leftIcon={<i className="fa-solid fa-file-lines" />}>قالب نمونه</Button>
 <Button type="button" variant="secondary" size="sm" onClick={doExportPhonesRoundtrip} disabled={phones.length === 0} leftIcon={<i className="fa-solid fa-file-export" />}>خروجی کامل قابل ایمپورت</Button>
 </div>
 <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">خروجی کامل شامل {phones.length.toLocaleString('fa-IR')} گوشی است؛ قالب نمونه فقط راهنماست.</span>
 </div>
 </div>
 </section>

 <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
 <label className="group flex cursor-pointer flex-col items-center justify-center rounded-[26px] border border-dashed border-slate-300 bg-slate-50 p-6 text-center transition hover:border-slate-400 hover:bg-white dark:border-slate-700 dark:bg-slate-900/60 dark:hover:border-slate-600 dark:hover:bg-slate-900">
 <span className="grid h-12 w-12 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"><i className="fa-solid fa-cloud-arrow-up" /></span>
 <span className="mt-3 text-sm font-black text-slate-900 dark:text-white">انتخاب فایل XLSX / CSV</span>
 <span className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">ستون‌های ضروری: مدل، IMEI و قیمت خرید. ستون‌های تکمیلی مثل قیمت خرید روز، وضعیت، باتری، تامین‌کننده و یادداشت هم پشتیبانی می‌شوند.</span>
 <input type="file" accept=".xlsx,.xls,.csv" className="sr-only" onChange={handlePhoneImportFile} />
 </label>

 <section className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
 <div className="flex items-center justify-between gap-3">
 <div>
 <div className="text-[11px] font-black tracking-[0.14em] text-slate-500 dark:text-slate-400">IMPORT PREVIEW</div>
 <div className="mt-1 text-sm font-black text-slate-900 dark:text-white">{phoneImportFileName || 'فایلی انتخاب نشده'}</div>
 </div>
 <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">{phoneImportRows.length.toLocaleString('fa-IR')} ردیف</span>
 </div>

 <div className="mt-4 max-h-56 space-y-2 overflow-auto pr-1">
 {phoneImportRows.slice(0, 6).map((row) => {
 const model = normalizeImportText(getImportCell(row, ['مدل', 'model'])) || 'بدون مدل';
 const imei = normalizeImportText(getImportCell(row, ['imei', 'شناسه دستگاه'])) || 'بدون IMEI';
 const purchase = parseImportNumber(getImportCell(row, ['قیمت خرید', 'purchase price', 'purchasePrice']), 0);
 return (
 <div key={row.__rowNumber} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-900/60">
 <span className="min-w-0 truncate font-bold text-slate-800 dark:text-slate-100">{model}</span>
 <span className="shrink-0 font-mono text-slate-500 dark:text-slate-400">{imei}</span>
 <span className="shrink-0 text-slate-500 dark:text-slate-400">{formatPrice(purchase)}</span>
 </div>
 );
 })}
 {phoneImportRows.length === 0 ? <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">بعد از انتخاب فایل، چند ردیف اول اینجا نمایش داده می‌شود.</div> : null}
 </div>

 {phoneImportReport ? (
 <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs leading-6 text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
 <div className="font-black text-slate-900 dark:text-white">نتیجه: {phoneImportReport.created.toLocaleString('fa-IR')} جدید، {phoneImportReport.updated.toLocaleString('fa-IR')} بروزرسانی، {phoneImportReport.skipped.toLocaleString('fa-IR')} ردشده</div>
 {phoneImportReport.errors.slice(0, 4).map((err) => <div key={err} className="mt-1 text-rose-600 dark:text-rose-300">{err}</div>)}
 </div>
 ) : null}

 <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
 <Button type="button" variant="secondary" size="sm" onClick={() => { setPhoneImportRows([]); setPhoneImportFileName(''); setPhoneImportReport(null); }}>پاک‌کردن</Button>
 <Button type="button" variant="primary" size="sm" loading={isImportingPhones} disabled={!canManage || phoneImportRows.length === 0 || isImportingPhones} onClick={runPhonesImport} leftIcon={<i className="fa-solid fa-file-import" />}>شروع ایمپورت</Button>
 </div>
 </section>
 </div>
 </div>
 </Modal>

 {/* Edit Modal */}
 {isEditModalOpen && editingPhone.id && (
 <Modal
 title={`ویرایش اطلاعات گوشی: ${editingPhone.model} (IMEI: ${editingPhone.imei})`}
 onClose={() => { setIsEditModalOpen(false); setEditEntryContext(null); setEditReadyForSalePulse(null); }}
 widthClass="max-w-6xl"
 iconClass="fa-solid fa-pen-to-square"
 variant="expansive"
 layout="split"
 bodyClassName="mobile-phone-edit-modal-body"
 ><form onSubmit={handleEditSubmit} className="phone-edit-vertical-form max-h-[78vh] space-y-5 overflow-y-auto p-2 pr-1 text-sm">
 {editEntryContext ? (
 <div
 className={`rounded-2xl border px-4 py-2.5 text-xs sm:text-sm ${editEntryContext === 'pricing'
 ? 'border-violet-200 bg-violet-50/90 text-violet-800 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-200'
 : 'border-amber-200 bg-amber-50/90 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200'}`}
 ><div className="flex items-start gap-3"><span className={`mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full ${editEntryContext === 'pricing' ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200'}`}><i className={`fa-solid ${editEntryContext === 'pricing' ? 'fa-tags' : 'fa-clipboard-check'}`} /></span><div className="min-w-0"><div className="font-black">{editEntryContext === 'pricing' ? 'ورود از مسیر قیمت‌گذاری' : 'ورود از مسیر بازبینی وضعیت'}</div><div className="mt-1 leading-6 opacity-90">
 {editEntryContext === 'pricing'
 ? 'برای باز کردن مسیر فروش، قیمت فروش این دستگاه را ثبت اطلاعات یا اصلاح کن. بعد از ذخیره تغییرات، دوباره از همان منو می‌توانی مستقیم وارد فروش شوی.'
 : 'برای باز کردن مسیر فروش، وضعیت این دستگاه را بررسی و ادامه و در صورت نیاز اصلاح کن. بعد از ذخیره تغییرات، دوباره از همان منو می‌توانی مستقیم وارد فروش شوی.'}
 </div></div></div></div>
 ) : null}
 <div className="phone-edit-horizontal-form grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"><section className="phone-identity-block phone-identity-block--edit rounded-[24px] border border-slate-200/80 bg-slate-50/75 p-4 dark:border-slate-800 dark:bg-slate-950/35"><div className="phone-identity-block__header mb-4 flex flex-col gap-2 border-b border-slate-200/80 pb-3 dark:border-slate-800/90 "><div><div className="text-[11px] font-black tracking-[0.16em] text-slate-500 dark:text-slate-400">DEVICE IDENTITY</div><h3 className="mt-1 text-base font-black text-slate-900 dark:text-slate-50">هویت دستگاه</h3></div><div className="text-xs text-slate-500 dark:text-slate-400">شناسنامه اصلی دستگاه را اینجا تمیز و خوانا نگه دار.</div></div><div className="phone-identity-block__grid grid grid-cols-1 gap-4 md:grid-cols-2"><div className="phone-identity-block__field phone-identity-block__field--model "><label className={labelClass}><i className="fa-solid fa-tag" style={{ color: brand }} /> مدل</label><AddableAutocomplete
 value={editingPhone.model || ''}
 onChange={(v) => handleEditInputChange({ target: { name: 'model', value: v } })}
 options={phoneModels}
 onAdd={addPhoneModel}
 preview="مثال: Galaxy S24 Ultra"
 inputClassName={`${inputClass('model', false, editFormErrors)} text-left pr-11`}
 errorText={editFormErrors.model || null}
 /></div><div className="phone-identity-block__field phone-identity-block__field--imei "><label className={labelClass}><i className="fa-solid fa-hashtag" style={{ color: brand }} /> IMEI</label><input
 name="imei"
 value={editingPhone.imei || ''}
 onChange={handleEditInputChange}
 dir="ltr"
 className={`${inputClass('imei', false, editFormErrors)} text-left`}
 />
 {editFormErrors.imei && <p className="mt-1 text-xs text-rose-500">{editFormErrors.imei}</p>}
 </div><div className="phone-identity-block__field phone-identity-block__field--condition "><label className={labelClass}><i className="fa-solid fa-wand-sparkles" style={{ color: brand }} /> وضعیت ظاهری</label><select
 name="condition"
 value={editingPhone.condition || ''}
 onChange={handleEditInputChange}
 className={inputClass('condition', true, editFormErrors)}
 >
 {PHONE_CONDITIONS.map(c =><option key={c} value={c}>{c}</option>)}
 </select></div><div className="phone-identity-block__field phone-identity-block__field--color "><label className={labelClass}><i className="fa-solid fa-droplet" style={{ color: brand }} /> رنگ</label><AddableAutocomplete
value={editingPhone.color || ''}
onChange={(v) => setEditingPhone((prev) => prev ? { ...prev, color: v } : prev)}
options={phoneColors}
preview="رنگ را انتخاب یا وارد کن"
inputClassName={`${inputClass('color', false, editFormErrors)} text-left pr-11`}
/></div><div className=""><label className={labelClass}><i className="fa-solid fa-sd-card" style={{ color: brand }} /> حافظه</label><select name="storage" value={editingPhone.storage || ''} onChange={handleEditInputChange} className={inputClass('storage', true, editFormErrors)}>{PHONE_STORAGE_OPTIONS.map(s =><option key={s} value={s}>{s}</option>)}</select></div><div className=""><label className={labelClass}><i className="fa-solid fa-microchip" style={{ color: brand }} /> رم</label><select name="ram" value={editingPhone.ram || ''} onChange={handleEditInputChange} className={inputClass('ram', true, editFormErrors)}>{PHONE_RAM_OPTIONS.map(r =><option key={r} value={r}>{r}</option>)}</select></div><div className="phone-identity-block__field phone-identity-block__field--purchase-date  space-y-1"><label className={labelClass}><i className="fa-solid fa-calendar-days" style={{ color: brand }} /> تاریخ خرید</label><ShamsiDatePicker
 selectedDate={editPurchaseDateSelected}
 onDateChange={setEditPurchaseDateSelected}
 inputClassName={`${inputClass('purchaseDate', false, editFormErrors)} min-w-0 w-full`}
 />
 {editFormErrors.purchaseDate && <p className="mt-1 text-xs text-rose-500">{editFormErrors.purchaseDate}</p>}
 </div><div className="phone-identity-block__field phone-identity-block__field--battery  space-y-1"><label className={labelClass}><i className="fa-solid fa-battery-three-quarters" style={{ color: brand }} /> سلامت باتری</label><div className="space-y-2"><input
 name="batteryHealth"
 value={editingPhone.batteryHealth || ''}
 onChange={handleEditInputChange}
 className={inputClass('batteryHealth', false, editFormErrors)}
 /></div>
 {editFormErrors.batteryHealth && <p className="mt-1 text-xs text-rose-500">{editFormErrors.batteryHealth}</p>}
 </div></div></section><section className="phone-finance-block phone-finance-block--edit rounded-[24px] border border-slate-200/80 bg-white/90 p-4 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.18)] dark:border-slate-800 dark:bg-slate-950/45"><div className="phone-finance-block__header mb-4 flex flex-col gap-2 border-b border-slate-200/80 pb-3 dark:border-slate-800/90 "><div><div className="text-[11px] font-black tracking-[0.16em] text-slate-500 dark:text-slate-400">FINANCE & SUPPLY</div><h3 className="mt-1 text-base font-black text-slate-900 dark:text-slate-50">مالی و تامین</h3></div><div className="text-xs text-slate-500 dark:text-slate-400">قیمت‌ها و تامین‌کننده را یک‌جا مدیریت کن.</div></div><div className="phone-finance-block__grid grid grid-cols-1 gap-4 md:grid-cols-2"><div className="phone-finance-block__field phone-finance-block__field--purchase  space-y-1"><label className={labelClass}><i className="fa-solid fa-sack-dollar" style={{ color: brand }} /> قیمت خرید</label><PriceInput
 name="purchasePrice"
 value={String(editingPhone.purchasePrice || '')}
 onChange={handleEditInputChange}
 className={`${inputClass('purchasePrice', false, editFormErrors)} text-left`}
 topLabel="بهای خرید"
 suffix="تومان"
 />
 {editFormErrors.purchasePrice && <p className="mt-1 text-xs text-rose-500">{editFormErrors.purchasePrice}</p>}
 </div><div className="phone-finance-block__field phone-finance-block__field--current-purchase  space-y-1 rounded-[18px] border border-emerald-200/70 bg-emerald-50/60 p-2 dark:border-emerald-900/50 dark:bg-emerald-950/18"><label className={labelClass}><i className="fa-solid fa-scale-balanced" style={{ color: brand }} /> قیمت خرید روز</label><PriceInput
 name="currentPurchasePrice"
 value={String(editingPhone.currentPurchasePrice || '')}
 onChange={handleEditInputChange}
 className={`${inputClass('currentPurchasePrice', false, editFormErrors)} text-left`}
 topLabel="مبنای سود و فروش"
 suffix="تومان"
 preview="برای محاسبه سود واقعی و سهم همکار"
 />
 <p className="text-[11px] leading-5 text-emerald-700 dark:text-emerald-200">این مبلغ مبنای محاسبه سود واقعی، تسویه همکار و فروش دستگاه است.</p>
 {editFormErrors.currentPurchasePrice && <p className="mt-1 text-xs text-rose-500">{editFormErrors.currentPurchasePrice}</p>}
 </div><div className={`phone-finance-block__field phone-finance-block__field--sale md:col-span-2 space-y-1 rounded-[18px] border border-transparent p-2 transition-all ${editEntryContext === 'pricing' ? 'border border-violet-200/80 bg-violet-50/70 shadow-[0_10px_24px_-18px_rgba(124,58,237,0.35)] dark:border-violet-900/60 dark:bg-violet-950/20' : 'bg-slate-50/70 dark:bg-slate-950/30'}`}><div className="flex items-center justify-between gap-3"><label className={labelClass}><i className="fa-solid fa-tags" style={{ color: brand }} /> قیمت فروش</label>
 {editEntryContext === 'pricing' ? (
 <span className="inline-flex items-center gap-1 rounded-full border border-violet-200/80 bg-violet-100/80 px-2 py-1 text-[10px] font-black text-violet-700 dark:border-violet-900/60 dark:bg-violet-900/30 dark:text-violet-200"><i className="fa-solid fa-bullseye" />
 فیلد هدف
 </span>
 ) : null}
 </div><PriceInput
 id="edit-sale-price-input"
 name="salePrice"
 value={String(editingPhone.salePrice || '')}
 onChange={handleEditInputChange}
 className={`${inputClass('salePrice', false, editFormErrors)} text-left ${editEntryContext === 'pricing' ? 'ring-2 ring-violet-400/30 dark:ring-violet-500/30' : ''}`}
 topLabel="قیمت فروش"
 suffix="تومان"
 preview={editEntryContext === 'pricing' && !String(editingPhone.salePrice || '').trim() ? 'برای فعال شدن فروش، قیمت را وارد کن' : 'مثال: ۳۸۵۰۰۰۰۰'}
 />
 {editEntryContext === 'pricing' ? <p className="text-[11px] leading-5 text-violet-700 dark:text-violet-200">برای باز شدن مسیر فروش، این فیلد را ثبت اطلاعات یا اصلاح کن.</p> : null}
 {editEntryContext === 'pricing' && !String(editingPhone.salePrice || '').trim() ? <p className="text-[11px] leading-5 text-violet-600/90 dark:text-violet-300/90">بدون قیمت فروش، این دستگاه مستقیم وارد مسیر فروش نمی‌شود.</p> : null}
 {editFormErrors.salePrice && <p className="mt-1 text-xs text-rose-500">{editFormErrors.salePrice}</p>}
 </div><div className="phone-finance-block__field phone-finance-block__field--supplier min-w-0 space-y-1 rounded-[16px] border border-slate-200/70 bg-slate-50/70 p-2 dark:border-slate-800 dark:bg-slate-950/30"><label className={labelClass}><i className="fa-solid fa-truck" style={{ color: brand }} /> تامین‌کننده</label><select
 name="supplierId"
 value={editingPhone.supplierId || ''}
 onChange={handleEditInputChange}
 className={`${inputClass('supplierId', true, editFormErrors)} h-11 min-w-0 text-sm`}
 disabled={isFetchingPartners}
 ><option value="">-- انتخاب تامین‌کننده --</option>
 {partners.map(p =><option key={p.id} value={p.id}>{p.partnerName}</option>)}
 </select>
 {editFormErrors.supplierId && <p className="mt-1 text-xs text-rose-500">{editFormErrors.supplierId}</p>}
 </div><div className={`phone-finance-block__field phone-finance-block__field--status phone-operations-block__field phone-operations-block__field--status min-w-0 max-w-none rounded-[16px] border border-transparent p-2 transition-all ${editEntryContext === 'status-review' ? 'border border-amber-200/80 bg-amber-50/70 shadow-[0_10px_24px_-18px_rgba(245,158,11,0.35)] dark:border-amber-900/60 dark:bg-amber-950/20' : 'bg-slate-50/70 dark:bg-slate-950/30'}`}><div className="flex items-center justify-between gap-3"><label className={labelClass}><i className="fa-solid fa-check-circle" style={{ color: brand }} /> وضعیت</label>
 {editEntryContext === 'status-review' ? (
 <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/80 bg-amber-100/80 px-2 py-1 text-[10px] font-black text-amber-700 dark:border-amber-900/60 dark:bg-amber-900/30 dark:text-amber-200"><i className="fa-solid fa-bullseye" />
 فیلد هدف
 </span>
 ) : null}
 </div><select id="edit-status-select" name="status" value={editingPhone.status || ''} onChange={handleEditInputChange} className={`${inputClass('status', true, editFormErrors)} h-11 min-w-0 text-sm ${editEntryContext === 'status-review' ? 'ring-2 ring-amber-400/30 dark:ring-amber-500/30' : ''}`}>
 {PHONE_STATUSES.map((s) => {
 const contextualLabel = editEntryContext === 'status-review'
 ? s === 'موجود در انبار'
 ? 'موجود در انبار — مسیر فروش باز'
 : s === 'مرجوعی'
 ? 'مرجوعی — نیازمند بررسی و ادامه قبل از فروش'
 : s === 'مرجوعی اقساطی'
 ? 'مرجوعی اقساطی — بررسی و ادامه ویژه قبل از فروش'
 : s === 'فروخته شده'
 ? 'فروخته شده — خارج از مسیر فروش'
 : s === 'فروخته شده (قسطی)'
 ? 'فروخته شده اقساطی — خارج از مسیر فروش'
 : s
 : s;
 return <option key={s} value={s}>{contextualLabel}</option>;
 })}
 </select>
 {editEntryContext === 'status-review' ? <p className="mt-1 text-[11px] leading-5 text-amber-700 dark:text-amber-200">برای باز شدن مسیر فروش، معمولاً وضعیت «موجود در انبار» انتخاب درست‌تری است.</p> : null}
 </div></div></section><section className="phone-operations-block phone-operations-block--edit xl:col-span-2 rounded-[24px] border border-slate-200/80 bg-slate-50/75 p-4 dark:border-slate-800 dark:bg-slate-950/35"><div className="phone-operations-block__header mb-4 flex flex-col gap-2 border-b border-slate-200/80 pb-3 dark:border-slate-800/90 "><div><div className="text-[11px] font-black tracking-[0.16em] text-slate-500 dark:text-slate-400">NOTES & CONTEXT</div><h3 className="mt-1 text-base font-black text-slate-900 dark:text-slate-50">وضعیت و یادداشت</h3></div><div className="text-xs text-slate-500 dark:text-slate-400">هر توضیح مدیریتی یا نکته فروش را اینجا ثبت اطلاعات کن.</div></div><div className="phone-operations-block__grid grid grid-cols-1 gap-4"><div className="phone-operations-block__field phone-operations-block__field--notes  "><label className={labelClass}><i className="fa-solid fa-note-sticky" style={{ color: brand }} /> یادداشت</label><textarea name="notes" value={editingPhone.notes || ''} onChange={handleEditInputChange} rows={4} className={inputClass('notes', false, editFormErrors)} /></div></div></section></div>

 

 {editReadyForSalePulse ? (
 <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/80 px-4 py-2.5 shadow-[0_12px_28px_-20px_rgba(16,185,129,0.45)] dark:border-emerald-900/60 dark:bg-emerald-950/25"><div className="flex items-start gap-3"><span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"><i className="fa-solid fa-circle-check" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-3"><span className="text-[13px] font-black text-emerald-800 dark:text-emerald-100">الان این دستگاه آماده فروش است</span><span className="inline-flex items-center rounded-full border border-emerald-200/80 bg-white/80 px-2 py-0.5 text-[10px] font-black text-emerald-700 dark:border-emerald-800/70 dark:bg-emerald-900/30 dark:text-emerald-200">{editReadyForSalePulse.model}</span></div><p className="mt-1 text-[11px] leading-5 text-emerald-700/90 dark:text-emerald-200/90">
 {editReadyForSalePulse.from === 'pricing' ? 'قیمت‌گذاری کامل شد و مسیر فروش باز شده است.' : 'وضعیت و گردش اصلاح شد و حالا می‌تواند وارد فروش شود.'}
 </p><div className="mt-3 flex flex-wrap items-center gap-3"><Button
 type="button"
 variant="secondary"
 size="sm"
 className="h-8 rounded-full border-emerald-200 bg-white/90 px-3 text-[11px] font-black text-emerald-700 shadow-none hover:bg-emerald-50 dark:border-emerald-800/60 dark:bg-emerald-950/20 dark:text-emerald-200 dark:hover:bg-emerald-900/30"
 leftIcon={<i className="fa-solid fa-cash-register" />}
 onClick={() => {
 const readyPhone = phones.find((p) => p.id === editReadyForSalePulse.phoneId) || editingPhone;
 if (readyPhone) {
 setIsEditModalOpen(false);
 setEditReadyForSalePulse(null);
 setEditEntryContext(null);
 handleSellPhone(readyPhone, editReadyForSalePulse.from);
 }
 }}
 >
 فروش همین دستگاه
 </Button><span className="text-[10px] font-medium text-emerald-700/80 dark:text-emerald-200/80">بدون خروج از این مسیر مستقیم وارد فروش شو.</span></div></div><span className="inline-flex items-center gap-1 rounded-full bg-emerald-100/90 px-2 py-1 text-[10px] font-black text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"><i className="fa-solid fa-bolt" />
 آماده فروش
 </span></div></div>
 ) : null}

 <div className="flex justify-end pt-4 gap-3 border-t border-gray-200 dark:border-gray-700"><button type="button" onClick={() => { setIsEditModalOpen(false); setEditReadyForSalePulse(null); setEditEntryContext(null); }} className="px-3.5 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600">
 انصراف
 </button><Button
 type="submit"
 disabled={isSubmittingEdit || !token}
 loading={isSubmittingEdit}
 loadingText={editEntryContext === 'pricing' ? 'در حال ذخیره تغییرات قیمت‌گذاری...' : editEntryContext === 'status-review' ? 'در حال ذخیره تغییرات بازبینی وضعیت...' : 'در حال ذخیره تغییرات...'}
 loadingHint={editEntryContext === 'pricing' ? 'ثبت اطلاعات قیمت فروش و آماده‌سازی مسیر فروش دستگاه' : editEntryContext === 'status-review' ? 'اعمال وضعیت جدید و بررسی و ادامه باز شدن مسیر فروش' : 'اعمال تغییرات گوشی و همگام‌سازی مشخصات'}
 successPulseText={editEntryContext === 'pricing' ? 'قیمت‌گذاری ذخیره تغییرات شد' : editEntryContext === 'status-review' ? 'وضعیت ذخیره تغییرات شد' : 'ویرایش اطلاعات ذخیره تغییرات شد'}
 successPulseHint={editEntryContext === 'pricing' ? 'قیمت فروش این دستگاه با موفقیت ثبت یا به‌روزرسانی شد' : editEntryContext === 'status-review' ? 'وضعیت این دستگاه با موفقیت به‌روزرسانی شد' : 'مشخصات گوشی با موفقیت به‌روزرسانی شد'}
 variant="primary"
 size="md"
 className="min-w-[11rem] text-white"
 style={{ backgroundColor: brand }}
 leftIcon={<i className="fa-solid fa-floppy-disk" />}
 >
 {editEntryContext === 'pricing'
 ? 'ذخیره تغییرات و باز کردن مسیر فروش'
 : editEntryContext === 'status-review' && editingPhone.status === 'موجود در انبار'
 ? 'ذخیره تغییرات و باز کردن مسیر فروش'
 : editEntryContext === 'status-review'
 ? 'ذخیره تغییرات بازبینی وضعیت'
 : 'ذخیره تغییرات'}
 </Button></div></form></Modal>
 )}

 {/* Delete Phone Modal */}
 {isDeleteModalOpen && deletingPhoneId !== null && (
 <Modal title="حذف این گوشی از انبار" onClose={() => setIsDeleteModalOpen(false)} widthClass="max-w-2xl" iconClass="fa-solid fa-trash-can" tone="danger" variant="compact" layout="horizontal" bodyClassName="mobile-phone-delete-modal-body"><div className="space-y-4"><div className="rounded-[24px] border border-rose-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,241,242,0.96))] p-4 shadow-[0_18px_42px_-34px_rgba(225,29,72,0.35)] dark:border-rose-900/70 dark:bg-[linear-gradient(180deg,rgba(30,41,59,0.98),rgba(76,5,25,0.3))]"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[11px] font-black text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-200"><i className="fa-solid fa-triangle-exclamation" /> عملیات غیرقابل بازگشت</div><h3 className="mt-3 text-[18px] font-black text-slate-900 dark:text-slate-50">آیا از حذف این گوشی مطمئن هستی؟</h3><p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">با تأیید این عملیات، رکورد این دستگاه از انبار حذف می‌شود و برای بازیابی آن باید دوباره به‌صورت دستی ثبت شود.</p></div><div className="rounded-[22px] border border-rose-200/80 bg-white/90 px-4 py-3 text-center shadow-sm dark:border-rose-900/60 dark:bg-slate-950/60"><div className="text-[11px] font-black tracking-[0.14em] text-rose-500 dark:text-rose-300">DELETE PREVIEW</div><div className="mt-2 text-[28px] font-black text-rose-600 dark:text-rose-300">#{toFaDigits(deletingPhone?.id ?? deletingPhoneId)}</div><div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">شناسه رکورد انبار</div></div></div></div><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-[22px] border border-slate-200/80 bg-white/95 p-4 dark:border-slate-800 dark:bg-slate-950/60"><div className="text-[11px] font-black tracking-[0.14em] text-slate-500 dark:text-slate-400">DEVICE SNAPSHOT</div><div className="mt-3 flex items-start gap-3"><span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"><i className="fa-solid fa-mobile-screen-button" /></span><div className="min-w-0"><div className="text-sm font-black text-slate-900 dark:text-slate-50">{deletingPhone?.model || 'گوشی انتخاب‌شده'}</div>{deletingPhoneSpec ? <div className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">{deletingPhoneSpec}</div> : null}<div className="mt-2 inline-flex max-w-full items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-black text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"><i className="fa-solid fa-fingerprint" /><span className="truncate" dir="ltr">{deletingPhone?.imei || '-'}</span></div></div></div><div className="mt-4 grid gap-2.5"><div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-3 py-2.5 text-xs dark:border-slate-800 dark:bg-slate-900/60"><span className="text-slate-500 dark:text-slate-400">وضعیت فعلی</span><span className="font-black text-slate-800 dark:text-slate-100">{deletingPhone?.status || 'نامشخص'}</span></div><div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-3 py-2.5 text-xs dark:border-slate-800 dark:bg-slate-900/60"><span className="text-slate-500 dark:text-slate-400">قیمت خرید</span><span className="font-black text-slate-800 dark:text-slate-100">{formatPrice(deletingPhone?.purchasePrice)}</span></div><div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-3 py-2.5 text-xs dark:border-slate-800 dark:bg-slate-900/60"><span className="text-slate-500 dark:text-slate-400">تاریخ خرید</span><span className="font-black text-slate-800 dark:text-slate-100">{deletingPhone?.purchaseDate ? formatIsoToShamsi(deletingPhone.purchaseDate) : 'ثبت نشده'}</span></div></div></div><div className="rounded-[22px] border border-amber-200/80 bg-amber-50/90 p-4 dark:border-amber-900/60 dark:bg-amber-950/20"><div className="text-[11px] font-black tracking-[0.14em] text-amber-700 dark:text-amber-300">قبل از حذف این مورد</div><ul className="mt-3 space-y-2.5 text-xs leading-7 text-amber-800 dark:text-amber-200"><li className="flex items-start gap-2"><i className="fa-solid fa-check mt-1" /> اگر فقط می‌خواهی گوشی از مسیر فروش خارج شود، بهتر است ابتدا وضعیت آن را بررسی کنی.</li><li className="flex items-start gap-2"><i className="fa-solid fa-check mt-1" /> حذف این رکورد مناسب زمانی است که ثبت اشتباه بوده یا این دستگاه دیگر نباید در انبار دیده شود.</li>{deletingPhone?.notes ? <li className="flex items-start gap-2"><i className="fa-solid fa-note-sticky mt-1" /> یادداشت این مورد: <span className="font-black text-slate-700 dark:text-slate-100">{deletingPhone.notes}</span></li> : null}</ul></div></div><div className="flex flex-col-reverse justify-end gap-3 border-t border-slate-200/80 pt-4 sm:flex-row dark:border-slate-800"><Button onClick={() => setIsDeleteModalOpen(false)} variant="secondary" size="md">انصراف و بازگشت</Button><Button
 onClick={handleConfirmDelete}
 disabled={isSubmittingDelete || !token}
 loading={isSubmittingDelete}
 loadingText="در حال حذف مورد..."
 loadingHint="در حال پاک‌سازی رکورد این گوشی از انبار"
 successPulseText="حذف مورد انجام شد"
 successPulseHint="این دستگاه با موفقیت از انبار حذف شد"
 variant="danger"
 size="md"
 className="min-w-[12rem]"
 leftIcon={<i className="fa-solid fa-trash-can" />}
 >
 حذف قطعی این گوشی
 </Button></div></div></Modal>
 )}

 {/* Bulk Confirmation Modal */}
 {pendingBulkAction && bulkActionPreview && (
 <Modal
 title={bulkActionPreview.title}
 onClose={() => !isConfirmingBulkAction && setPendingBulkAction(null)}
 widthClass="max-w-2xl"
 iconClass={`fa-solid ${bulkActionPreview.icon}`}
 tone="warning"
 variant="compact"
 layout="horizontal"
 bodyClassName="mobile-phone-bulk-confirm-modal-body"
 ><div className="space-y-3"><div className="rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] p-4 shadow-[0_16px_38px_-28px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.96))]"><div className="flex flex-col gap-3.5 lg:flex-row lg:items-start lg:justify-between"><div><div className="text-[11px] font-black tracking-[0.16em] text-slate-500 dark:text-slate-400">CONFIRMATION DRAWER</div><h4 className="mt-2 text-[17px] font-black text-slate-900 dark:text-slate-50">خلاصه عملیات قبل از اجرا</h4><p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">{bulkActionPreview.description}</p><div className="mt-3 rounded-[18px] border border-[color:var(--brand)]/15 bg-[color:var(--brand)]/10 px-3 py-3 text-xs leading-6 text-[color:var(--brand)]"><span className="font-black">اثر احتمالی:</span> {bulkActionPreview.impact}
 </div></div><div className="grid min-w-[15rem] grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1"><div className="rounded-[18px] border border-slate-200/80 bg-white/90 px-3 py-3 text-xs dark:border-slate-700 dark:bg-slate-900/80"><span className="block text-slate-500 dark:text-slate-400">تعداد انتخاب</span><span className="mt-1 block text-base font-black text-slate-900 dark:text-slate-50">{bulkSummary.count.toLocaleString('fa-IR')} دستگاه</span></div><div className="rounded-[18px] border border-slate-200/80 bg-white/90 px-3 py-3 text-xs dark:border-slate-700 dark:bg-slate-900/80"><span className="block text-slate-500 dark:text-slate-400">ارزش خرید</span><span className="mt-1 block text-base font-black text-slate-900 dark:text-slate-50">{formatPrice(bulkSummary.totalPurchase)}</span></div><div className="rounded-[18px] border border-emerald-200 bg-emerald-50/90 px-3 py-3 text-xs dark:border-emerald-900/60 dark:bg-emerald-950/30"><span className="block text-emerald-700 dark:text-emerald-300">سود بالقوه</span><span className="mt-1 block text-base font-black text-emerald-700 dark:text-emerald-300">{formatPrice(bulkSummary.potentialProfit)}</span></div><div className="rounded-[18px] border border-slate-200/80 bg-white/90 px-3 py-3 text-xs dark:border-slate-700 dark:bg-slate-900/80"><span className="block text-slate-500 dark:text-slate-400">ریتم اقدام</span><span className="mt-1 block text-base font-black text-slate-900 dark:text-slate-50">{selectionContext?.label || 'انتخاب عملیاتی'}</span></div></div></div></div><div className="grid gap-3.5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]"><div className="rounded-[22px] border border-slate-200/80 bg-white/90 p-4 dark:border-slate-800 dark:bg-slate-950/60"><div className="text-[11px] font-black tracking-[0.16em] text-slate-500 dark:text-slate-400">SELECTION SNAPSHOT</div><div className="mt-3 flex flex-wrap gap-3">
 {selectedPhones.slice(0, 6).map((phone) => (
 <span key={phone.id} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-700 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200"><i className="fa-solid fa-mobile-screen" />
 {phone.model}
 </span>
 ))}
 {selectedPhones.length > 6 ? <span className="inline-flex items-center rounded-full border border-slate-200/80 bg-white px-3 py-1.5 text-xs font-black text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">+{(selectedPhones.length - 6).toLocaleString('fa-IR')} مورد دیگر</span> : null}
 </div>
 {selectionPreset ? (
 <div className="mt-4 rounded-[18px] border border-[color:var(--brand)]/20 bg-[color:var(--brand)]/10 px-3 py-3 text-xs leading-6 text-[color:var(--brand)]"><span className="inline-flex items-center gap-3 font-black"><i className={`fa-solid ${selectionPreset.icon}`} /> {selectionPreset.label}</span><div className="mt-1">{selectionPreset.hint}</div></div>
 ) : null}
 </div><div className="rounded-[22px] border border-slate-200/80 bg-white/90 p-4 dark:border-slate-800 dark:bg-slate-950/60"><div className="text-[11px] font-black tracking-[0.16em] text-slate-500 dark:text-slate-400">RISK CHECK, DIFF & KPI IMPACT</div>
 {bulkImpactSummary ? (
 <div className="mt-3 rounded-[20px] border border-emerald-200 bg-emerald-50/90 px-4 py-4 text-xs leading-6 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300"><div className="flex items-center gap-3 text-[13px] font-black"><i className="fa-solid fa-chart-mixed-up-circle-dollar" /> خلاصه اثر روی KPIها</div><p className="mt-2">{bulkImpactSummary.headline}</p><div className="mt-3 grid gap-3 sm:grid-cols-2">
 {bulkImpactSummary.changes.length > 0 ? bulkImpactSummary.changes.map((item) => (
 <div key={item.key} className="rounded-[16px] border border-white/70 bg-white/80 px-3 py-3 dark:border-slate-800/80 dark:bg-slate-950/40"><div className="flex items-center gap-3 text-[11px] font-black text-slate-700 dark:text-slate-200"><i className={`fa-solid ${item.icon} text-emerald-500`} /> {item.label}</div><div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-black"><span className="inline-flex items-center rounded-full border border-slate-200/80 bg-white px-2.5 py-1 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">{item.from.toLocaleString('fa-IR')}</span><i className="fa-solid fa-arrow-left-long opacity-70" /><span className="inline-flex items-center rounded-full border border-emerald-300 bg-emerald-100 px-2.5 py-1 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">{item.to.toLocaleString('fa-IR')}</span></div></div>
 )) : bulkImpactSummary.summaryBadges.map((badge) => (
 <div key={badge} className="rounded-[16px] border border-white/70 bg-white/80 px-3 py-3 font-black dark:border-slate-800/80 dark:bg-slate-950/40">{badge}</div>
 ))}
 </div></div>
 ) : null}
 {bulkDiffPreview ? (
 <div className={`mt-3 rounded-[20px] border px-4 py-4 text-xs leading-6 ${bulkDiffPreview.tone === 'violet' ? 'border-violet-200 bg-violet-50/90 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-300' : 'border-sky-200 bg-sky-50/90 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300'}`}><div className="flex items-center gap-3 text-[13px] font-black"><i className={`fa-solid ${bulkDiffPreview.icon}`} /> {bulkDiffPreview.title}</div><p className="mt-2">{bulkDiffPreview.summary}</p><div className="mt-3 space-y-3">
 {bulkDiffPreview.items.map((item) => (
 <div key={item.id} className="rounded-[16px] border border-white/60 bg-white/80 px-3 py-3 dark:border-slate-800/80 dark:bg-slate-950/40"><div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400"><span className="font-black text-slate-900 dark:text-slate-50">{item.label}</span><span>{item.meta}</span></div><div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-black"><span className="inline-flex items-center rounded-full border border-slate-200/80 bg-white px-2.5 py-1 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">{item.from}</span><i className="fa-solid fa-arrow-left-long opacity-70" /><span className="inline-flex items-center rounded-full border border-[color:var(--brand)]/25 bg-[color:var(--brand)]/12 px-2.5 py-1 text-[color:var(--brand)]">{item.to}</span></div></div>
 ))}
 </div><div className="mt-3 flex flex-wrap gap-3 text-[11px] font-black"><span className="inline-flex items-center gap-1 rounded-full border border-slate-200/80 bg-white px-2.5 py-1 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"><i className="fa-solid fa-pen-to-square" /> {bulkDiffPreview.changedCount.toLocaleString('fa-IR')} تغییر واقعی</span>
 {bulkDiffPreview.unchangedCount > 0 ? <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300"><i className="fa-solid fa-equals" /> {bulkDiffPreview.unchangedCount.toLocaleString('fa-IR')} بدون تغییر</span> : null}
 </div></div>
 ) : null}
 <div className="mt-3 space-y-3">
 {bulkActionWarnings.length > 0 ? bulkActionWarnings.map((warning) => (
 <div key={warning.text} className={`flex items-start gap-3 rounded-[18px] border px-3 py-3 text-xs leading-6 ${warning.tone === 'rose' ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300' : warning.tone === 'amber' ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300' : warning.tone === 'violet' ? 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-300' : 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300'}`}><span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/70 dark:bg-slate-950/40"><i className={`fa-solid ${warning.icon}`} /></span><span>{warning.text}</span></div>
 )) : (
 <div className="rounded-[18px] border border-emerald-200 bg-emerald-50 px-3 py-3 text-xs leading-6 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300"><span className="font-black">وضعیت خوب است:</span> ریسک برجسته‌ای در انتخاب فعلی دیده نشد و عملیات می‌تواند مستقیم اجرا شود.
 </div>
 )}
 </div></div></div><div className="flex flex-col-reverse gap-3 border-t border-slate-200/80 pt-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-end"><button type="button" onClick={() => setPendingBulkAction(null)} disabled={isConfirmingBulkAction} className="ux-btn ux-btn-secondary h-10 rounded-2xl px-4 text-[11px] shadow-sm ux-btn-md disabled:opacity-50">انصراف</button><button type="button" onClick={handleConfirmBulkAction} disabled={isConfirmingBulkAction || bulkActionPreview.disabled} className="ux-btn ux-btn-primary h-10 rounded-2xl px-4 text-[11px] shadow-sm ux-btn-md min-w-[12rem] disabled:opacity-50"><i className={`fa-solid ${bulkActionPreview.icon}`} /><span>{isConfirmingBulkAction ? 'در حال اجرا...' : bulkActionPreview.confirmLabel}</span></button></div></div></Modal>
 )}

 {/* Barcode Modal */}
 {isBarcodeModalOpen && selectedPhoneForBarcode && (
 <Modal
 title={`بارکد برای: ${selectedPhoneForBarcode.model}`}
 onClose={() => setIsBarcodeModalOpen(false)}
 widthClass="max-w-sm"
 wrapperClassName="printable-area"
 iconClass="fa-solid fa-barcode"
 tone="info"
 variant="compact"
 ><div id="barcode-label-content" className="text-center p-4"><img src={`/api/barcode/phone/${selectedPhoneForBarcode.id}`} alt={`Barcode for ${selectedPhoneForBarcode.model}`} className="mx-auto" /><p className="mt-2 font-semibold text-lg text-gray-900 dark:text-gray-100">{selectedPhoneForBarcode.model}</p><p className="text-sm text-gray-600 dark:text-gray-300">IMEI: {selectedPhoneForBarcode.imei}</p><p className="text-sm text-gray-600 dark:text-gray-300">{formatPrice(selectedPhoneForBarcode.salePrice)}</p></div><div className="flex justify-end pt-4 mt-4 border-t border-gray-200 dark:border-gray-700 print:hidden"><button
 type="button"
 onClick={() => window.print}
 className="px-3.5 py-1.5 rounded-lg text-white"
 style={{ backgroundColor: brand }}
 ><i className="fas fa-print ml-2" /> چاپ برچسب
 </button></div></Modal>
 )}
 </div>
 );
};

export default MobilePhonesPage;