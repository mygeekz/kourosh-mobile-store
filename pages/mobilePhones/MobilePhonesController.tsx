import { apiFetch } from "../../utils/apiFetch";
// MobilePhones.tsx
import React, { useEffect, FormEvent, ChangeEvent, useMemo, useState } from 'react';
import moment from 'jalali-moment';
import { useNavigate, useSearchParams } from 'react-router-dom';

import type {
 PhoneEntry,
 NewPhoneEntryData,
 NotificationMessage,
 PhoneStatus,
 Partner,
 PhoneEntryPayload,
 PhoneEntryUpdatePayload,
 PhoneHistoryEventClass,
} from '../../types';
import Notification from '../../components/Notification';
import ShamsiDatePicker from '../../components/ShamsiDatePicker';
import { Dialog as Modal } from '@/components/ui';
import Button from '../../components/Button';
import PriceInput from '../../components/PriceInput';
import Skeleton from '../../components/ui/Skeleton';
import FormErrorSummary from '../../components/FormErrorSummary';
import { PHONE_RAM_OPTIONS, PHONE_STORAGE_OPTIONS, PHONE_CONDITIONS, PHONE_STATUSES } from '../../constants';
import { formatIsoToShamsi, formatIsoToShamsiDateTime } from '../../utils/dateUtils';
import { useAuth } from '../../contexts/AuthContext';
import { canManageProducts } from '../../utils/rbac';
import { getAuthHeaders } from '../../utils/apiUtils';
import { useStyle } from '../../contexts/StyleContext';
import { useFeatureFlags } from '../../contexts/FeatureFlagsContext';
import { getImportCell, normalizeImportText, parseImportNumber, readSpreadsheetRows, exportRoundtripExcel } from '../../utils/dataImportExport';
import { focusErrorsSoon, isDuplicateMessage, normalizeNumericInput, toSafeNumber } from '../../utils/formBehavior';
import { useMobilePhonesControllerState } from './useMobilePhonesControllerState';
import { useMobilePhonesNavigationActions } from './useMobilePhonesNavigationActions';
import {
  buildPhoneImportTemplateFilename,
  buildPhoneImportTemplateRows,
  buildPhoneRoundtripFilename,
  buildPhoneRoundtripRows,
  isPhoneImportSupplierBlank,
  parsePhoneImportRow,
  phoneRoundtripColumns,
} from './mobilePhonesImportExportUtils';
import {
  buildExplorerContextCard,
  buildExplorerFocusCards,
  buildInsightsActionCards,
  buildInventoryExplorerDateRangeLabel,
  buildInventoryExplorerPhones,
  buildInventoryIntelligence,
  buildInventoryMetrics,
  buildWorkspaceFilteredPhones,
  buildWorkspaceLead,
  getPhoneAgeDays,
  getPhoneCostBasisAmount,
  getPhoneOperationalFlags,
} from './mobilePhonesViewModels';

// ───────────── helpers
import {
  AddableAutocomplete,
  avg,
  type BulkConfirmAction,
  type DashboardDrilldown,
  DEFAULT_PRICING_INTELLIGENCE_SETTINGS,
  type PricingBehaviorDecision,
  type PricingBehaviorProfile,
  type PricingIntelligenceSettings,
  type PricingStrategyMode,
  type SavedInventoryView,
  buildPhonePrefillItem,
  clamp,
  clampPricingSettings,
  eventToneClasses,
  fromDatePickerToISO_YYYY_MM_DD,
  getEventClassMeta,
  inventorySellableStatuses,
  isFactoryNewPhoneCondition,
  normalizePricingUserKey,
  norm,
  persistPricingBehaviorDecisions,
  persistPricingIntelligenceSettings,
  pricingStrategyMeta,
  roundMoney,
  toFaDigits,
} from './mobilePhonesControllerSupport';
import MobilePhonesRender from './MobilePhonesRender';
import type { PhoneComparablePriceEstimate } from './PhoneComparablePriceEstimateCard';
import type { MarketSnapshotDraft, SupplierFeedDraft, SupplierFeedReview, SupplierFeedReviewItem } from './PhoneMarketEvidencePanel';
const MobilePhonesController: React.FC = () => {
 const navigate = useNavigate();
 const [searchParams] = useSearchParams();
 const focusedPhoneId = Number(searchParams.get('phoneId') || 0) || 0;
 const appliedPhoneDeepLinkRef = React.useRef(0);
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


 const { phones, setPhones, filteredPhones, setFilteredPhones, searchTerm, setSearchTerm, partners, setPartners, phoneModels, setPhoneModels, phoneColors, setPhoneColors, initialNewPhoneState, newPhone, setNewPhone, purchaseDateSelected, setPurchaseDateSelected, formErrors, setFormErrors, pricingBehaviorDecisions, setPricingBehaviorDecisions, pricingSuggestionApplied, setPricingSuggestionApplied, pricingIntelligenceSettings, setPricingIntelligenceSettings, isLoading, setIsLoading, isFetching, setIsFetching, isFetchingPartners, setIsFetchingPartners, notification, setNotification, isPhoneImportExportOpen, setIsPhoneImportExportOpen, phoneImportRows, setPhoneImportRows, phoneImportFileName, setPhoneImportFileName, phoneImportReport, setPhoneImportReport, isImportingPhones, setIsImportingPhones, isEditModalOpen, setIsEditModalOpen, editEntryContext, setEditEntryContext, editingPhone, setEditingPhone, editReadyForSalePulse, setEditReadyForSalePulse, editPurchaseDateSelected, setEditPurchaseDateSelected, editFormErrors, setEditFormErrors, isSubmittingEdit, setIsSubmittingEdit, isDeleteModalOpen, setIsDeleteModalOpen, deletingPhoneId, setDeletingPhoneId, isSubmittingDelete, setIsSubmittingDelete, isBarcodeModalOpen, setIsBarcodeModalOpen, selectedPhoneForBarcode, setSelectedPhoneForBarcode, isDetailsModalOpen, setIsDetailsModalOpen, selectedPhoneForDetails, setSelectedPhoneForDetails, detailsTab, setDetailsTab, detailsHistory, setDetailsHistory, isDetailsHistoryLoading, setIsDetailsHistoryLoading, detailsHistoryError, setDetailsHistoryError, historyReport, setHistoryReport, isHistoryReportLoading, setIsHistoryReportLoading, enterpriseHistoryReport, setEnterpriseHistoryReport, dashboardReport, setDashboardReport, historyExplorerEvents, setHistoryExplorerEvents, isHistoryExplorerLoading, setIsHistoryExplorerLoading, historyExplorerFilters, setHistoryExplorerFilters, inventoryExplorerDateRange, setInventoryExplorerDateRange, shouldFocusExplorer, setShouldFocusExplorer, dashboardDrilldown, setDashboardDrilldown, selectedPhoneIds, setSelectedPhoneIds, bulkStatusTarget, setBulkStatusTarget, bulkSupplierTarget, setBulkSupplierTarget, isBulkSubmitting, setIsBulkSubmitting, pendingBulkAction, setPendingBulkAction, activeTableMenuId, setActiveTableMenuId, activeCardMenuId, setActiveCardMenuId, isConfirmingBulkAction, setIsConfirmingBulkAction, workspace, setWorkspace, inventoryViewMode, setInventoryViewMode, sortMode, setSortMode, savedView, setSavedView, statusFilter, setStatusFilter, supplierFilter, setSupplierFilter, modelFilter, setModelFilter, batteryFilter, setBatteryFilter, explorerRef, activeTableMenuRef } = useMobilePhonesControllerState();
 const [isBulkPurchaseOpen, setIsBulkPurchaseOpen] = useState(false);
 const [phonePriceEstimate, setPhonePriceEstimate] = useState<PhoneComparablePriceEstimate | null>(null);
 const [isPhonePriceEstimateLoading, setIsPhonePriceEstimateLoading] = useState(false);
 const [phonePriceEstimateError, setPhonePriceEstimateError] = useState<string | null>(null);
 const [marketSnapshotRefreshKey, setMarketSnapshotRefreshKey] = useState(0);
 const canRecordMarketSnapshot = ['Admin', 'Manager'].includes(String(currentUser?.roleName || ''));

 const recordPhoneAdvisoryFeedback = (advisoryType: 'phone-purchase-price' | 'phone-sale-price', suggestedValue: number) => {
 if (!token || !(suggestedValue > 0)) return;
 const entityKey = [newPhone.model, newPhone.storage, newPhone.ram, newPhone.color, newPhone.condition, newPhone.batteryHealth]
 .map((value) => String(value ?? '').trim()).join('|').slice(0, 160);
 const artifactId = phonePriceEstimate?.mlAdvisory?.artifactIds?.find((id) => id.includes(advisoryType === 'phone-purchase-price' ? 'purchase' : 'sale'));
 const estimateSide = advisoryType === 'phone-purchase-price' ? phonePriceEstimate?.purchase : phonePriceEstimate?.sale;
 const reason = JSON.stringify({
 specificationMatch: estimateSide?.specificationMatch || 'none',
 confidence: estimateSide?.confidence || 'insufficient',
 comparableCount: estimateSide?.comparableCount || 0,
 monotonicityStatus: estimateSide?.monotonicityStatus || 'not-evaluable',
 source: 'phone-price-card',
 }).slice(0, 500);
 void apiFetch('/api/intelligence/advisory/feedback', {
 method: 'POST',
 headers: { ...getAuthHeaders(token), 'Content-Type': 'application/json' },
 body: JSON.stringify({ advisoryType, entityType: 'phone-specification', entityKey, modelArtifactId: artifactId, suggestedValue, chosenValue: suggestedValue, action: 'accepted', reason }),
 }).catch(() => undefined);
 };

 const recordMarketSnapshot = async (draft: MarketSnapshotDraft): Promise<void> => {
 if (!token || !canRecordMarketSnapshot) throw new Error('دسترسی ثبت مرجع قیمت تأمین‌کنندگان را ندارید.');
 const response = await apiFetch('/api/phones/market-price-snapshots', {
 method: 'POST',
 headers: { ...getAuthHeaders(token), 'Content-Type': 'application/json' },
 body: JSON.stringify({
 ...draft,
 model: newPhone.model,
 storage: newPhone.storage,
 ram: newPhone.ram,
 color: newPhone.color,
 condition: newPhone.condition,
 batteryHealth: newPhone.batteryHealth,
 }),
 });
 const result = await response.json();
 if (!response.ok || !result.success) throw new Error(result.message || 'ثبت قیمت مرجع انجام نشد.');
 setMarketSnapshotRefreshKey((value) => value + 1);
 };

 const createSupplierFeed = async (draft: SupplierFeedDraft, attachment: File | null): Promise<SupplierFeedReview> => {
 if (!token || !canRecordMarketSnapshot) throw new Error('دسترسی ثبت ورودی کانال را ندارید.');
 const payload = new FormData();
 Object.entries(draft).forEach(([key, value]) => payload.append(key, String(value ?? '')));
 if (attachment) payload.append('attachment', attachment);
 const response = await apiFetch('/api/phones/supplier-channel-feeds', { method: 'POST', headers: getAuthHeaders(token, true), body: payload });
 const result = await response.json();
 if (!response.ok || !result.success) throw new Error(result.message || 'پردازش ورودی کانال انجام نشد.');
 return result.data as SupplierFeedReview;
 };

 const approveSupplierFeed = async (feedId: number, items: SupplierFeedReviewItem[]): Promise<number> => {
 if (!token || !canRecordMarketSnapshot) throw new Error('دسترسی تأیید قیمت‌های کانال را ندارید.');
 const response = await apiFetch(`/api/phones/supplier-channel-feeds/${feedId}/approve`, {
 method: 'POST', headers: { ...getAuthHeaders(token), 'Content-Type': 'application/json' }, body: JSON.stringify({ items }),
 });
 const result = await response.json();
 if (!response.ok || !result.success) throw new Error(result.message || 'تأیید ردیف‌های کانال انجام نشد.');
 setMarketSnapshotRefreshKey((value) => value + 1);
 return Number(result.data?.approvedItems || 0);
 };

 useEffect(() => {
 const model = String(newPhone.model || '').trim();
 if (!phoneAiPriceSignalEnabled || !token || model.length < 2) {
 setPhonePriceEstimate(null);
 setPhonePriceEstimateError(null);
 setIsPhonePriceEstimateLoading(false);
 return;
 }
 const controller = new AbortController();
 const timer = window.setTimeout(async () => {
 setIsPhonePriceEstimateLoading(true);
 setPhonePriceEstimateError(null);
 const params = new URLSearchParams({ model });
 const add = (key: string, value: unknown) => {
 const normalized = String(value ?? '').trim();
 if (normalized) params.set(key, normalized);
 };
 add('color', newPhone.color);
 add('storage', newPhone.storage);
 add('ram', newPhone.ram);
 add('condition', newPhone.condition);
 add('batteryHealth', newPhone.batteryHealth);
 try {
 const response = await apiFetch(`/api/phones/price-estimate?${params.toString()}`, { headers: getAuthHeaders(token), signal: controller.signal });
 const result = await response.json();
 if (!response.ok || !result.success) throw new Error(result.message || 'برآورد قیمت در دسترس نیست.');
 setPhonePriceEstimate(result.data || null);
 } catch (error: any) {
 if (error?.name !== 'AbortError') {
 setPhonePriceEstimate(null);
 setPhonePriceEstimateError(error?.message || 'برآورد قیمت در دسترس نیست.');
 }
 } finally {
 if (!controller.signal.aborted) setIsPhonePriceEstimateLoading(false);
 }
 }, 350);
 return () => {
 window.clearTimeout(timer);
 controller.abort();
 };
 }, [phoneAiPriceSignalEnabled, token, newPhone.model, newPhone.color, newPhone.storage, newPhone.ram, newPhone.condition, newPhone.batteryHealth, marketSnapshotRefreshKey]);

 // fetchers
 const fetchPhones = async () => {
 if (!token) return;
 setIsFetching(true);
 setNotification(null);
 try {
 const response = await apiFetch('/api/phones', { headers: getAuthHeaders(token) });
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

 const handleBulkPurchaseCreated = async (result: { count?: number; totalPurchase?: number; supplierName?: string }) => {
  await fetchPhones();
  const count = Number(result?.count || 0);
  const totalPurchase = Number(result?.totalPurchase || 0);
  const supplierName = String(result?.supplierName || 'تامین‌کننده انتخاب‌شده');
  setNotification({
    type: 'success',
    text: `${count.toLocaleString('fa-IR')} گوشی از ${supplierName} با مجموع خرید ${totalPurchase.toLocaleString('fa-IR')} تومان وارد موجودی شد.`,
  });
 };

 const fetchHistoryReport = async (filters = historyExplorerFilters) => {
 if (!token) return;
 setIsHistoryReportLoading(true);
 try {
 const params = buildHistoryQueryParams(filters);
 const response = await apiFetch(`/api/phones/history-report?${params.toString()}`, { headers: getAuthHeaders(token) });
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
 const response = await apiFetch(`/api/phones/history-analytics?${params.toString()}`, { headers: getAuthHeaders(token) });
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
 const response = await apiFetch(`/api/phones/dashboard-report?${params.toString()}`, { headers: getAuthHeaders(token) });
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
 const response = await apiFetch(`/api/phones/history-explorer?${params.toString()}`, { headers: getAuthHeaders(token) });
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
 const response = await apiFetch('/api/partners?partnerType=Supplier', { headers: getAuthHeaders(token) });
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
 const response = await apiFetch(`/api/phones/${phoneId}/history`, { headers: getAuthHeaders(token) });
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
 apiFetch('/api/phone-models', { headers: getAuthHeaders(token) }),
 apiFetch('/api/phone-colors', { headers: getAuthHeaders(token) }),
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
 const res = await apiFetch('/api/phone-models', {
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
 const res = await apiFetch('/api/phone-colors', {
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

 const phoneRoundtripRows = useMemo(() => buildPhoneRoundtripRows(phones), [phones]);

 const doExportPhonesRoundtrip = () => {
 exportRoundtripExcel(buildPhoneRoundtripFilename(), phoneRoundtripRows, phoneRoundtripColumns, 'Mobile Phones Import Export');
 };

 const doDownloadPhonesTemplate = () => {
 exportRoundtripExcel(
 buildPhoneImportTemplateFilename(),
 buildPhoneImportTemplateRows(),
 phoneRoundtripColumns,
 'Mobile Phones Import Template',
 );
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
 const response = await apiFetch('/api/partners', {
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
 const parsedRow = parsePhoneImportRow(row);
 const supplierId = isPhoneImportSupplierBlank(parsedRow.supplierName) ? null : await ensurePhoneSupplierId(parsedRow.supplierName, supplierCache);
 const existing = (parsedRow.id && byId.get(parsedRow.id)) || byImei.get(parsedRow.imei);
 const payload: PhoneEntryPayload | PhoneEntryUpdatePayload = { ...parsedRow.payload, supplierId };
 const response = await apiFetch(existing ? `/api/phones/${existing.id}` : '/api/phones', {
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

const formatCompactNumber = (value: number | undefined | null) => {
 if (value == null || Number.isNaN(Number(value))) return '-';
 return Number(value).toLocaleString('fa-IR');
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
 return `${baseInput} ${isSelect ? 'appearance-none bg-[length:0.78rem] pr-3.5 pl-10' : ''} ${err ? 'border-rose-400   dark:border-rose-500/80  ' : ''}`;
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
 setNewPhone(prev => {
 const next = { ...prev, [name]: value };
 if (name === 'condition' && isFactoryNewPhoneCondition(value)) next.batteryHealth = '100';
 if (name === 'batteryHealth' && isFactoryNewPhoneCondition(prev.condition)) next.batteryHealth = '100';
 return next;
 });
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
 const normalizedNewModel = norm(payload.model || '');
 if (normalizedNewModel && !phoneModels.some((item) => norm(item) === normalizedNewModel)) {
 await addPhoneModel(String(payload.model || '').trim());
 }
 const response = await apiFetch('/api/phones', { method: 'POST', headers: getAuthHeaders(token), body: JSON.stringify(payload) });
 const result = await response.json();
 if (!response.ok || !result.success) throw new Error(result.message || 'خطا در افزودن مورد جدید گوشی');
 const finalSale = Number(payload.salePrice || 0);
 if (payload.purchasePrice > 0 && finalSale > 0) {
 const finalMarkup = ((finalSale - payload.purchasePrice) / payload.purchasePrice) * 100;
 const suggestedSale = Number(intakePriceSignal.suggestedSale || 0);
 const suggestionDelta = suggestedSale > 0 ? Math.abs(finalSale - suggestedSale) / suggestedSale : 1;
 const decision: PricingBehaviorDecision = {
 id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
 source: 'local-pricing-decision',
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
 batteryHealth: isFactoryNewPhoneCondition(phone.condition) ? 100 : phone.batteryHealth,
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
 setEditingPhone(prev => {
 const next = { ...prev, [name]: value };
 if (name === 'condition' && isFactoryNewPhoneCondition(value)) next.batteryHealth = 100;
 if (name === 'batteryHealth' && isFactoryNewPhoneCondition(prev.condition)) next.batteryHealth = 100;
 return next;
 });
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
 const response = await apiFetch(`/api/phones/${editingPhone.id}`, { method: 'PUT', headers: getAuthHeaders(token), body: JSON.stringify(payload) });
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
 const response = await apiFetch(`/api/phones/${deletingPhoneId}`, { method: 'DELETE', headers: getAuthHeaders(token) });
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

 useEffect(() => {
  if (!focusedPhoneId || isFetching || !phones.length || appliedPhoneDeepLinkRef.current === focusedPhoneId) return;
  appliedPhoneDeepLinkRef.current = focusedPhoneId;
  const target = phones.find((phone) => Number(phone.id) === focusedPhoneId);
  if (!target) {
   setNotification({ type: 'warning', text: `گوشی مرتبط با شناسه ${focusedPhoneId.toLocaleString('fa-IR')} در انبار پیدا نشد.` });
   return;
  }
  setSearchTerm(String(target.imei || target.model || focusedPhoneId));
  openDetailsModal(target);
 }, [focusedPhoneId, isFetching, phones]);

 const {
  focusInventoryExplorer,
  focusInsightsWorkspace,
  deriveSelectionDrilldown,
  focusPhoneEntity,
  focusInventoryResult,
  focusHistoryResult,
  handleSelectionPresetAction,
 } = useMobilePhonesNavigationActions({
  inventorySellableStatuses,
  setWorkspace,
  setInventoryViewMode,
  setShouldFocusExplorer,
  setSelectedPhoneIds,
  setDetailsTab,
  setHistoryExplorerFilters,
  setPendingBulkAction,
  setBulkStatusTarget,
  setNotification,
  openDetailsModal,
  applyDashboardDrilldown,
  getSelectionPreset: () => selectionPreset,
  getSelectedPhones: () => selectedPhones,
 });

 // Helper declarations are intentionally hoisted above heavy memo/render blocks to avoid TDZ crashes in this large module.

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
 a.download = `phone-history-log-${moment().format('YYYYMMDD-HHmm')}.csv`;
 document.body.appendChild(a);
 a.click();
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

 const inventoryMetrics = useMemo(() => buildInventoryMetrics(phones), [phones]);
 const inventoryIntelligence = useMemo(() => buildInventoryIntelligence(phones), [phones]);

 const modelFilterOptions = useMemo(() => Array.from(new Set(phones.map((phone) => String(phone.model || '').trim()).filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b), 'fa')), [phones]);
 const drilldownPhones = useMemo(() => historyExplorerFilters.model !== 'all'
 ? phones.filter((phone) => String(phone.model || '').trim() === historyExplorerFilters.model).slice(0, 6)
 : [], [phones, historyExplorerFilters.model]);
 const supplierFilterOptions = useMemo(() => Array.from(new Set(phones.map((phone) => String(phone.supplierName || '').trim()).filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b), 'fa')), [phones]);
 const activeFilterCount = useMemo(() => [savedView !== 'all', statusFilter !== 'all', supplierFilter !== 'all', modelFilter !== 'all', batteryFilter !== 'all', sortMode !== 'newest', dashboardDrilldown.kind !== 'none', !!inventoryExplorerDateRange.startDate, !!inventoryExplorerDateRange.endDate].filter(Boolean).length, [savedView, statusFilter, supplierFilter, modelFilter, batteryFilter, sortMode, dashboardDrilldown, inventoryExplorerDateRange]);
 const workspaceFilteredPhones = useMemo(() => buildWorkspaceFilteredPhones(filteredPhones, workspace), [filteredPhones, workspace]);
 const inventoryExplorerPhones = useMemo(() => buildInventoryExplorerPhones({
 workspaceFilteredPhones,
 savedView,
 statusFilter,
 supplierFilter,
 modelFilter,
 batteryFilter,
 sortMode,
 dashboardDrilldown,
 inventoryExplorerDateRange,
 }), [workspaceFilteredPhones, savedView, statusFilter, supplierFilter, modelFilter, batteryFilter, sortMode, dashboardDrilldown, inventoryExplorerDateRange]);

 const inventoryExplorerDateRangeLabel = useMemo(() => buildInventoryExplorerDateRangeLabel(inventoryExplorerDateRange), [inventoryExplorerDateRange]);

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

 const explorerContextCard = useMemo(() => buildExplorerContextCard(dashboardDrilldown, phones), [dashboardDrilldown, phones]);

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

 const explorerFocusCards = useMemo(() => buildExplorerFocusCards(inventoryExplorerPhones), [inventoryExplorerPhones]);
 const insightsActionCards = useMemo(() => buildInsightsActionCards(inventoryMetrics, inventoryIntelligence), [inventoryIntelligence, inventoryMetrics]);
 const workspaceLead = useMemo(() => buildWorkspaceLead(workspace, inventoryMetrics, inventoryExplorerPhones.length, formatPrice), [workspace, inventoryMetrics, inventoryExplorerPhones.length]);

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
 purchasePrice: payload.purchasePrice !== undefined ? (payload.purchasePrice == null || payload.purchasePrice === '' ? 0 : Number(payload.purchasePrice)) : phone.purchasePrice,
 salePrice: payload.salePrice !== undefined ? (payload.salePrice == '' ? null : Number(payload.salePrice)) : phone.salePrice,
 sellerName: payload.sellerName ?? phone.sellerName,
 purchaseDate: payload.purchaseDate ?? phone.purchaseDate,
 status: payload.status && PHONE_STATUSES.includes(payload.status as PhoneStatus) ? payload.status as PhoneStatus : phone.status,
 notes: payload.notes ?? phone.notes,
 supplierId: payload.supplierId !== undefined ? (payload.supplierId == '' ? null : Number(payload.supplierId)) : phone.supplierId,
 supplierName: payload.supplierId !== undefined
 ? (partners.find((partner) => String(partner.id) === String(payload.supplierId))?.partnerName || (payload.supplierId == '' ? null : phone.supplierName))
 : phone.supplierName,
 });

 const payloadChangesPhone = (phone: PhoneEntry, payload: PhoneEntryUpdatePayload) => {
 const currentSupplierId = phone.supplierId !== null && phone.supplierId !== undefined ? String(phone.supplierId) : '';
 const comparablePairs = ([
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
 ] satisfies Array<[unknown, unknown]>).filter(([next]) => next !== undefined);
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
 const response = await apiFetch(`/api/phones/${phone.id}`, {
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
 nextStep: 'برای بازبینی، سوابق موجودی یا فیلتر تأمین‌کننده را بررسی کنید؛ در صورت نیاز امکان بازگردانی این تخصیص وجود دارد.',
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
 nextStep: 'برای دریافت فایل دقیق‌تر، موارد انتخاب‌شده را با فیلترهای موجودی محدود و دوباره خروجی بگیرید.',
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
 const response = await apiFetch(`/api/phones/${phone.id}`, {
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
 link.download = `mobile-inventory-bulk-${moment().format('YYYYMMDD-HHmmss')}.csv`;
 document.body.appendChild(link);
 link.click();
 link.remove();
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
 recommendedAction: null as 'export' | null,
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
 hint: 'موارد انتخاب‌شده یکدست نیستند؛ پیش از عملیات گروهی آن‌ها را با فیلترهای موجودی تفکیک کنید.',
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

 const updatedPhones: PhoneEntry[] = selectedPhones.map((phone) => {
 if (pendingBulkAction === 'status' && bulkStatusTarget !== 'all') {
 return {...phone, status: bulkStatusTarget };
 }
 if (pendingBulkAction === 'supplier' && bulkSupplierTarget !== 'all') {
 const supplierLabel = partners.find((partner) => String(partner.id) === String(bulkSupplierTarget))?.partnerName || phone.supplierName;
 return {...phone, supplierId: Number(bulkSupplierTarget), supplierName: supplierLabel };
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
 impact: ' فایل خروجی برای قیمت‌گذاری، ارزیابی فنی و گزارش مدیریتی آماده می‌شود.',
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
 if (purchaseValue > 0 && !newPhone.supplierId) warnings.push('برای تکمیل سابقه خرید، تأمین‌کننده را نیز مشخص کنید.');
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
 if (!phonePricingBehaviorLearningEnabled) return { decisions: [], userModelDecisions: [], modelDecisions: [], userAvgMarkup: null, userModelAvgMarkup: null, modelAvgMarkup: null, acceptanceRate: null, overrideBiasPercent: null, confidence: 'پایین', label: 'یادگیری رفتار قیمت‌گذاری خاموش است' };
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
 const suggestedSale = Number(phonePriceEstimate?.recommendation?.sale?.suggestedPrice || 0);
 if (!phoneAiPriceSignalEnabled || !(suggestedSale > 0)) return;
 setNewPhone((prev) => ({ ...prev, salePrice: String(suggestedSale) }));
 setPricingSuggestionApplied(true);
 setFormErrors((prev) => ({ ...prev, salePrice: undefined }));
 recordPhoneAdvisoryFeedback('phone-sale-price', suggestedSale);
 };

 const applyPhonePurchaseEstimate = () => {
 const suggestedPurchase = Number(phonePriceEstimate?.recommendation?.purchase?.suggestedPrice || 0);
 if (!phoneAiPriceSignalEnabled || !(suggestedPurchase > 0)) return;
 setNewPhone((prev) => ({ ...prev, purchasePrice: String(suggestedPurchase) }));
 setFormErrors((prev) => ({ ...prev, purchasePrice: undefined }));
 recordPhoneAdvisoryFeedback('phone-purchase-price', suggestedPurchase);
 };

 const applyPhoneSaleEstimate = () => applyIntakePriceSuggestion();

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
 return { suggestedSale: 0, suggestedPurchase: 0, markupPercent: null as number | null, tone: 'border-slate-200 bg-slate-50 text-slate-600', title: 'برآورد قیمت خاموش است', summary: 'هیچ برآوردی انجام نمی‌شود.', confidence: 'خاموش' };
 }
 if (isPhonePriceEstimateLoading) {
 return {
 suggestedSale: 0, suggestedPurchase: 0,
 markupPercent: null as number | null,
 tone: 'border-sky-200 bg-sky-50 text-sky-700', title: 'در حال بررسی معاملات مشابه', summary: 'سوابق خرید و فروش واقعی فروشگاه در حال خواندن است.', confidence: 'در حال بررسی',
 };
 }
 const suggestedPurchase = Number(phonePriceEstimate?.recommendation?.purchase?.suggestedPrice || 0);
 const suggestedSale = Number(phonePriceEstimate?.recommendation?.sale?.suggestedPrice || 0);
 const markupPercent = suggestedPurchase > 0 && suggestedSale > 0 ? ((suggestedSale - suggestedPurchase) / suggestedPurchase) * 100 : null;
 const levels = [phonePriceEstimate?.purchase?.dataLevel, phonePriceEstimate?.sale?.dataLevel];
 const confidence = phonePriceEstimate?.recommendation?.qualityGate === 'fallback-engaged' ? 'کنترل ایمنی فعال' : phonePriceEstimate?.recommendation?.qualityGate === 'passed' ? 'توصیه یکپارچه' : levels.includes('sufficient') ? 'داده کافی' : levels.includes('limited') ? 'داده محدود' : 'داده ناکافی';
 const summary = phonePriceEstimate?.reasons?.join(' ') || phonePriceEstimateError || 'مدل و مشخصات گوشی را وارد کنید تا معاملات مشابه بررسی شوند.';
 return {
 suggestedSale, suggestedPurchase, markupPercent,
 tone: levels.includes('sufficient') ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : levels.includes('limited') ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 bg-slate-50 text-slate-600',
 title: phonePriceEstimate?.recommendation?.qualityGate === 'fallback-engaged' ? 'توصیه امن جایگزین شد' : suggestedPurchase > 0 || suggestedSale > 0 ? 'توصیه یکپارچه قیمت آماده است' : 'داده مشابه کافی نیست',
 summary, confidence,
 };
 }, [phoneAiPriceSignalEnabled, phonePriceEstimate, phonePriceEstimateError, isPhonePriceEstimateLoading]);

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

  const renderCtx = {
    AddableAutocomplete,
    Button,
    FormErrorSummary,
    Modal,
    Notification,
    PHONE_CONDITIONS,
    PHONE_RAM_OPTIONS,
    PHONE_STATUSES,
    PHONE_STORAGE_OPTIONS,
    PriceInput,
    ShamsiDatePicker,
    Skeleton,
    activeFilterCount,
    addPhoneColor,
    addPhoneModel,
    allVisibleSelected,
    applyDashboardDrilldown,
    applyIntakePriceSuggestion,
    applyPhonePurchaseEstimate,
    applyPhoneSaleEstimate,
    canRecordMarketSnapshot,
    batteryBadge,
    batteryFilter,
    baseInput,
    brand,
    bulkActionPreview,
    bulkActionWarnings,
    bulkDiffPreview,
    bulkImpactSummary,
    bulkStatusTarget,
    bulkSummary,
    bulkSupplierTarget,
    canManage,
    clearDashboardDrilldown,
    clearExplorerFilters,
    dashboardDrilldown,
    dashboardDrilldownSummary,
    dashboardReport,
    deletingPhone,
    deletingPhoneId,
    deletingPhoneSpec,
    detailAge,
    detailHistorySummary,
    detailProfit,
    detailTimeline,
    detailsHistoryError,
    detailsTab,
    doDownloadPhonesTemplate,
    doExportPhonesRoundtrip,
    drilldownPhones,
    duplicateImeiPhone,
    editEntryContext,
    editFormErrors,
    editPurchaseDateSelected,
    editReadyForSalePulse,
    editingPhone,
    enterpriseHistoryReport,
    explorerContextCard,
    explorerFocusCards,
    explorerRef,
    exportExplorerContextCsv,
    exportHistoryExplorerCsv,
    exportHistoryExplorerPrintReport,
    formErrors,
    formatHistoryDiffValue,
    recordMarketSnapshot,
    createSupplierFeed,
    approveSupplierFeed,
    formatIsoToShamsi,
    formatIsoToShamsiDateTime,
    formatPrice,
    formatShortPrice,
    getEventClassMeta,
    eventToneClasses,
    getImportCell,
    getPhoneCostBasisAmount,
    getPhoneOperationalFlags,
    getSellAvailability,
    handleBulkPurchaseCreated,
    handleConfirmBulkAction,
    handleConfirmDelete,
    handleEditInputChange,
    handleEditSubmit,
    handleInputChange,
    handlePhoneImportFile,
    handleSelectionPresetAction,
    handleSellPhone,
    handleSubmit,
    hasPhoneFormErrors,
    historyExplorerClassOptions,
    historyExplorerEvents,
    historyExplorerFilters,
    historyReport,
    historyReportCards,
    initialNewPhoneState,
    inputClass,
    insightsActionCards,
    intakePriceSignal,
    intakeReadinessTone,
    intakeSummary,
    inventoryAIPrompt,
    inventoryExplorerDateRange,
    inventoryExplorerDateRangeLabel,
    inventoryExplorerDateRangeTone,
    inventoryExplorerPhones,
    inventoryIntelligence,
    inventoryViewMode,
    isBarcodeModalOpen,
    isBulkPurchaseOpen,
    isBulkSubmitting,
    isConfirmingBulkAction,
    isDeleteModalOpen,
    isDetailsHistoryLoading,
    isDetailsModalOpen,
    isEditModalOpen,
    isFetching,
    isFetchingPartners,
    isHistoryExplorerLoading,
    isHistoryReportLoading,
    isImportingPhones,
    isLoading,
    isPhoneImportExportOpen,
    isPhonePriceEstimateLoading,
    isSubmittingDelete,
    isSubmittingEdit,
    labelClass,
    modelFilter,
    modelFilterOptions,
    modelPricingBenchmark,
    moment,
    name,
    newPhone,
    normalizeImportText,
    notification,
    openBarcodeModal,
    openDeleteModal,
    openDetailsModal,
    openEditModal,
    openExplorerContextHistory,
    parseImportNumber,
    partners,
    pendingBulkAction,
    phoneAiPriceSignalEnabled: false,
    phoneComparablePriceEstimateEnabled: phoneAiPriceSignalEnabled,
    phoneAiPricingSettingsEnabled,
    phoneColors,
    phoneFormErrorLabels,
    phoneFormFieldIdMap,
    phoneImportFileName,
    phoneImportReport,
    phoneImportRows,
    phoneInventoryDrilldownEnabled,
    phonePriceEstimate,
    phonePriceEstimateError,
    phoneModels,
    phoneSmartWarningsEnabled,
    phones,
    pricingBehaviorProfile,
    pricingIntelligenceSettings,
    pricingSettingsMeta,
    purchaseDateSelected,
    requestBulkAction,
    roundMoney,
    runPhonesImport,
    savedView,
    savedViewMeta,
    searchTerm,
    selectedPhoneForBarcode,
    selectedPhoneForDetails,
    selectedPhoneIds,
    selectedPhones,
    selectionContext,
    selectionPreset,
    setBatteryFilter,
    setBulkStatusTarget,
    setBulkSupplierTarget,
    setDetailsHistory,
    setDetailsHistoryError,
    setDetailsTab,
    setEditEntryContext,
    setEditPurchaseDateSelected,
    setEditReadyForSalePulse,
    setEditingPhone,
    setFormErrors,
    setHistoryExplorerFilters,
    setInventoryExplorerDateRange,
    setInventoryViewMode,
    setIsBarcodeModalOpen,
    setIsBulkPurchaseOpen,
    setIsDeleteModalOpen,
    setIsDetailsModalOpen,
    setIsEditModalOpen,
    setIsPhoneImportExportOpen,
    setModelFilter,
    setNewPhone,
    setNotification,
    setPendingBulkAction,
    setPhoneImportFileName,
    setPhoneImportReport,
    setPhoneImportRows,
    setPurchaseDateSelected,
    setSavedView,
    setSearchTerm,
    setSelectedPhoneForDetails,
    setSelectedPhoneIds,
    setSortMode,
    setStatusFilter,
    setSupplierFilter,
    sortMode,
    status,
    statusBadgeInfo,
    statusFilter,
    supplierFilter,
    supplierFilterOptions,
    toFaDigits,
    togglePhoneSelection,
    toggleSelectAllVisible,
    token,
    updatePricingIntelligenceSettings,
    workspace,
  };

  return <MobilePhonesRender ctx={renderCtx} />;
};

export default MobilePhonesController;
