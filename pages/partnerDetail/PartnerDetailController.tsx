import { FinancialTimeline, FinancialTimelineEntry, IconGlyph } from '@/components/ui';
import { useConfirm } from '../../contexts/ConfirmContext';
// src/pages/PartnerDetailPage.tsx
import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import moment from 'jalali-moment';
import {
  PartnerDetailProfileShellData,
  PartnerLedgerEntry,
  NotificationMessage,
  NewPartnerData,
  NewLedgerEntryData,
} from '../../types';
import Notification from '../../components/Notification';
import { Dialog as Modal } from '@/components/ui';
import { ModalField } from '@/components/ui';
import FormErrorSummary from '../../components/FormErrorSummary';
import MessageComposerModal from '../../components/MessageComposerModal';
import TelegramLinkModal from '../../components/TelegramLinkModal';
import ShamsiDatePicker from '../../components/ShamsiDatePicker';
import PriceInput from '../../components/PriceInput';
import Button from '../../components/Button';
import { DialogActions as ModalActions } from '@/components/ui';
import FinancialProgressBar from '../../components/FinancialProgressBar';
import { formatIsoToShamsi, formatIsoToShamsiDateTime } from '../../utils/dateUtils';
import { useAuth } from '../../contexts/AuthContext';
import { getAuthHeaders } from '../../utils/apiUtils';
import { apiFetch } from '../../utils/apiFetch';
import { parseApiResult, runWithFeedback, humanizeErrorMessage } from '../../utils/feedback';
import { PARTNER_TYPES } from '../../constants';
import { getBalanceLabel, getBalanceState } from '../../utils/adaptiveUi';
import { focusErrorsSoon, isDuplicateMessage } from '../../utils/formBehavior';
import { formatCurrencyText, readStoredCurrencyUnit } from '../../utils/currency';
import { buildFinancialSourceTarget } from '../../utils/financialSourceLinks';
import { getNavigationReturnUiState, type PartnerLedgerReturnUiState } from '../../utils/navigationReturnContext';
import {
  BULK_SETTLEMENT_LAST_NOTE_KEY,
  type QtyPrice,
  createBulkSettlementBatchId,
  csvEscape,
  extractQtyFromText,
  fa2en,
  extractSettlementBatchId,
  extractTotalFromText,
  formatKnownShamsiDate,
  formatLedgerTransactionDate,
  formatPartnerLedgerCurrency,
  formatPrice,
  getEntityRegisteredDateValue,
  getLedgerSystemId,
  getLedgerSystemKind,
  getPartnerCapitalMeta,
  getPurchaseSystemId,
  getSaleClosureMeta,
  num,
} from './partnerDetailControllerSupport';
import PartnerDetailRender from './PartnerDetailRender';
import { usePartnerDetailControllerState } from './usePartnerDetailControllerState';
import { usePartnerDetailCommunicationActions } from './usePartnerDetailCommunicationActions';
import { submitPartnerAtomicSettlementFromUi } from './partnerSettlementAtomicSubmitUiActions';
import { persistPartnerSettlementManagerSignoffFromUi } from './partnerSettlementManagerSignoffPersistenceUiActions';
import {
  buildFilteredSoldPhoneDailyPriceTotals,
  buildPurchaseHistoryBySystemId,
  buildPurchaseHistoryVisible,
  buildSoldPhoneDailyPriceRows,
  buildSoldPhoneSettlementStatusCounts,
  filterPartnerTelegramConversationItems,
  buildPartnerBusinessReadModel,
} from './partnerDetailViewModels';
const buildSettlementRowsInDirectoryOrder = (items: any[]) => {
  const source = Array.isArray(items) ? items : [];
  const derived = buildSoldPhoneDailyPriceRows(source);
  const byId = new Map(derived.map((row: any) => [Number(row?.id || 0), row]));
  return source.map((row: any) => byId.get(Number(row?.id || 0))).filter(Boolean);
};

const PartnerDetailController: React.FC = () => {
  const confirmAction = useConfirm();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const linkedLedgerView = searchParams.get('view') === 'ledger';
  const linkedSettlementBatchId = String(searchParams.get('settlementBatchId') || '').trim();
  const linkedLedgerSystemId = String(searchParams.get('systemId') || '').trim();
  const { token, currentUser } = useAuth();
  const [partnerData, setPartnerData] = useState<PartnerDetailProfileShellData | null>(null);
  const [appliedLedgerDeepLinkKey, setAppliedLedgerDeepLinkKey] = useState('');
  const [ledgerDirectory, setLedgerDirectory] = useState<any>({ items: [], page: 1, pageSize: 25, total: 0, totalPages: 1, summary: { total: 0, totalDebit: 0, totalCredit: 0, latestBalance: 0 }, filteredSummary: { totalDebit: 0, totalCredit: 0, latestBalance: 0 }, systemOptions: [], settlementBatchOptions: [] });
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerPageSize, setLedgerPageSize] = useState<'25' | '50' | '100'>('25');
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [debouncedLedgerSearch, setDebouncedLedgerSearch] = useState('');
  const [purchaseDirectory, setPurchaseDirectory] = useState<any>({ items: [], page: 1, pageSize: 25, total: 0, totalPages: 1, counts: { all: 0, phone: 0, product: 0, totalValue: 0 } });
  const [purchasePage, setPurchasePage] = useState(1);
  const [purchasePageSize, setPurchasePageSize] = useState<'25' | '50' | '100'>('25');
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [purchaseHistoryFilter, setPurchaseHistoryFilter] = useState<'all' | 'phone' | 'product'>('all');
  const [phoneSettlementDirectory, setPhoneSettlementDirectory] = useState<any>({ items: [], page: 1, pageSize: 25, total: 0, totalPages: 1, filteredSummary: { total: 0, totalAmount: 0, initialTotal: 0, paidTotal: 0, balanceTotal: 0, deltaTotal: 0 } });
  const [phoneSettlementPage, setPhoneSettlementPage] = useState(1);
  const [phoneSettlementPageSize, setPhoneSettlementPageSize] = useState<'25' | '50' | '100'>('25');
  const [phoneSettlementLoading, setPhoneSettlementLoading] = useState(false);
  const [phoneSettlementExporting, setPhoneSettlementExporting] = useState(false);
  const [debouncedPhoneSettlementSearch, setDebouncedPhoneSettlementSearch] = useState('');
  const [fullPhoneSettlementDirectory, setFullPhoneSettlementDirectory] = useState<any>({ items: [], page: 1, pageSize: 25, total: 0, totalPages: 1 });
  const [fullPhoneSettlementPage, setFullPhoneSettlementPage] = useState(1);
  const [fullPhoneSettlementPageSize, setFullPhoneSettlementPageSize] = useState<'25' | '50' | '100'>('25');
  const [fullPhoneSettlementLoading, setFullPhoneSettlementLoading] = useState(false);
  const [bulkSettlementRowCache, setBulkSettlementRowCache] = useState<Record<number, any>>({});
  const [phoneSettlementTimelineCache, setPhoneSettlementTimelineCache] = useState<Record<number, any>>({});
  const ledgerRequestSeqRef = React.useRef(0);
  const purchaseRequestSeqRef = React.useRef(0);
  const phoneSettlementRequestSeqRef = React.useRef(0);
  const fullPhoneSettlementRequestSeqRef = React.useRef(0);
  const phoneSettlementTimelineRequestSeqRef = React.useRef<Record<number, number>>({});
  const lastLedgerFilterKeyRef = React.useRef('');
  const lastPurchaseFilterKeyRef = React.useRef('');
  const lastPhoneSettlementFilterKeyRef = React.useRef('');
  const lastFullPhoneSettlementFilterKeyRef = React.useRef('');
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);
  const [isSubmittingAtomicSettlement, setIsSubmittingAtomicSettlement] = useState(false);
  const [lastAtomicSettlementSubmitResult, setLastAtomicSettlementSubmitResult] = useState<any>(null);
  const [lastAtomicSettlementSubmitError, setLastAtomicSettlementSubmitError] = useState<any>(null);
  const [atomicSettlementSubmitAttempts, setAtomicSettlementSubmitAttempts] = useState<any[]>([]);
  const [isPersistingManagerSignoff, setIsPersistingManagerSignoff] = useState(false);
  const [lastManagerSignoffPersistenceResult, setLastManagerSignoffPersistenceResult] = useState<any>(null);
  const [lastManagerSignoffPersistenceError, setLastManagerSignoffPersistenceError] = useState<any>(null);
  const { tgQrOpen, setTgQrOpen, tgQrLoading, setTgQrLoading, tgQrDeepLink, setTgQrDeepLink, tgBotUsernameMissing, setTgBotUsernameMissing, partnerTgConvItems, setPartnerTgConvItems, partnerTgConvLoading, setPartnerTgConvLoading, partnerTgConvError, setPartnerTgConvError, partnerTgQuickReply, setPartnerTgQuickReply, partnerTgPreset, setPartnerTgPreset, partnerTgAutoRefresh, setPartnerTgAutoRefresh, partnerTgNewSinceScroll, setPartnerTgNewSinceScroll, partnerTgSearchQuery, setPartnerTgSearchQuery, partnerTgDirectionFilter, setPartnerTgDirectionFilter, isEditModalOpen, setIsEditModalOpen, editingPartner, setEditingPartner, editFormErrors, setEditFormErrors, isSubmittingEdit, setIsSubmittingEdit, isLedgerModalOpen, setIsLedgerModalOpen, isMessageModalOpen, setIsMessageModalOpen, prefillMessageText, setPrefillMessageText, prefillChannels, setPrefillChannels, newLedgerEntry, setNewLedgerEntry, ledgerDateSelected, setLedgerDateSelected, ledgerDirection, setLedgerDirection, ledgerFormErrors, setLedgerFormErrors, isSubmittingLedger, setIsSubmittingLedger, phoneSettlementItem, setPhoneSettlementItem, phoneSettlementAmount, setPhoneSettlementAmount, phoneSettlementNote, setPhoneSettlementNote, phoneSettlementDateSelected, setPhoneSettlementDateSelected, phoneSettlementErrors, setPhoneSettlementErrors, isSubmittingPhoneSettlement, setIsSubmittingPhoneSettlement, editingEntry, setEditingEntry, isDeletingEntry, setIsDeletingEntry, ledgerViewFilter, setLedgerViewFilter, expandedLedgerEntryId, setExpandedLedgerEntryId, ledgerSearch, setLedgerSearch, ledgerRange, setLedgerRange, ledgerSystemFilter, setLedgerSystemFilter, ledgerDisplayMode, setLedgerDisplayMode, ledgerVisibleColumns, setLedgerVisibleColumns, isLedgerColumnPickerOpen, setIsLedgerColumnPickerOpen, activeLedgerBatchId, setActiveLedgerBatchId, soldPhoneSettlementFilter, setSoldPhoneSettlementFilter, soldPhoneCapitalSearch, setSoldPhoneCapitalSearch, soldPhoneCapitalSort, setSoldPhoneCapitalSort, expandedPhoneSettlementTimelineId, setExpandedPhoneSettlementTimelineId, isFullPhoneSettlementModalOpen, setIsFullPhoneSettlementModalOpen, isSettlementManualConfirmationModalOpen, setIsSettlementManualConfirmationModalOpen, fullSettlementAmounts, setFullSettlementAmounts, isSubmittingFullSettlementPhoneId, setIsSubmittingFullSettlementPhoneId, bulkSettlementPhoneIds, setBulkSettlementPhoneIds, bulkSettlementAmount, setBulkSettlementAmount, bulkSettlementNote, setBulkSettlementNote, bulkSettlementPriority, setBulkSettlementPriority, bulkSettlementBatchId, setBulkSettlementBatchId, lastSubmittedBulkSettlementBatchId, setLastSubmittedBulkSettlementBatchId, isSubmittingBulkSettlement, setIsSubmittingBulkSettlement, lastBulkSettlementNote, setLastBulkSettlementNote, ledgerMap, setLedgerMap, partnerTgTimelineRef, ledgerColumnPickerButtonRef, ledgerColumnPickerPanelRef, soldPhoneCapitalSearchRef, phoneSettlementNoteTemplates, bulkSettlementNoteTemplates, initialLedgerEntry, rememberBulkSettlementNote, applyBulkSettlementNoteTemplate } = usePartnerDetailControllerState();
  const pendingLedgerReturnRestoreRef = React.useRef<PartnerLedgerReturnUiState | null>(null);
  const [ledgerReturnRestoring, setLedgerReturnRestoring] = useState(false);

  useEffect(() => {
    const restoreUi = getNavigationReturnUiState<PartnerLedgerReturnUiState>(location.state, 'partner-ledger');
    if (!restoreUi || String(restoreUi.partnerId || '') !== String(id || '')) return;
    pendingLedgerReturnRestoreRef.current = restoreUi;
    setLedgerReturnRestoring(true);
    setLedgerSearch(String(restoreUi.search || ''));
    setLedgerViewFilter((restoreUi.direction || 'all') as typeof ledgerViewFilter);
    setLedgerRange((restoreUi.range || 'all') as typeof ledgerRange);
    setLedgerSystemFilter(String(restoreUi.systemId || ''));
    setActiveLedgerBatchId(String(restoreUi.settlementBatchId || ''));
    setLedgerDisplayMode((restoreUi.displayMode || 'timeline') as typeof ledgerDisplayMode);
    setLedgerPageSize((restoreUi.pageSize || '25') as typeof ledgerPageSize);
    setLedgerPage(Math.max(1, Number(restoreUi.page || 1)));
    setExpandedLedgerEntryId(Number(restoreUi.expandedEntryId || 0) || null);
  }, [location.key, location.state, id]);

  const requestedLedgerDeepLinkKey = (linkedLedgerView || linkedSettlementBatchId || linkedLedgerSystemId)
    ? `${id || ''}|${linkedLedgerView ? 'ledger' : ''}|${linkedSettlementBatchId}|${linkedLedgerSystemId}`
    : '';
  const ledgerDeepLinkPending = Boolean(requestedLedgerDeepLinkKey && appliedLedgerDeepLinkKey !== requestedLedgerDeepLinkKey);

  useEffect(() => {
    if (!requestedLedgerDeepLinkKey || appliedLedgerDeepLinkKey === requestedLedgerDeepLinkKey) return;
    if (linkedSettlementBatchId) setActiveLedgerBatchId(linkedSettlementBatchId);
    if (linkedLedgerSystemId) setLedgerSystemFilter(linkedLedgerSystemId);
    if (ledgerDisplayMode !== 'timeline') setLedgerDisplayMode('timeline');
    setAppliedLedgerDeepLinkKey(requestedLedgerDeepLinkKey);
    window.setTimeout(() => {
      document.getElementById('partner-ledger-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 180);
  }, [requestedLedgerDeepLinkKey, appliedLedgerDeepLinkKey, linkedSettlementBatchId, linkedLedgerSystemId, ledgerDisplayMode, setActiveLedgerBatchId, setLedgerSystemFilter, setLedgerDisplayMode]);

  const openPartnerQrLinkModal = async () => {
    if (!partnerData?.profile?.id || !token) return;
    setTgQrOpen(true);
    setTgQrLoading(true);
    setTgQrDeepLink('');
    setTgBotUsernameMissing(false);
    try {
      const res = await apiFetch('/api/telegram/partner-link-token', { method: 'POST', headers: getAuthHeaders(token) as any, body: JSON.stringify({ partnerId: partnerData.profile.id }) });
      const j = await res.json().catch(() => ({} as any));
      if (!res.ok || !j?.success) {
        const msg = String(j?.message || 'ساخت لینک ربات همکار عملیات ناموفق بود.');
        if (/نام کاربری ربات|username/i.test(msg)) setTgBotUsernameMissing(true);
        throw new Error(msg);
      }
      const deepLink = String(j?.data?.deepLink || j?.data?.link || '').trim();
      if (!deepLink || /t\.me\/?\?start/i.test(deepLink)) {
        setTgBotUsernameMissing(true);
        throw new Error('لینک ربات همکار آماده نشد. نام کاربری ربات را در تنظیمات بررسی و ادامه کنید.');
      }
      setTgQrDeepLink(deepLink);
    } catch (e: any) {
      setNotification({ type: 'error', text: humanizeErrorMessage(e?.message || 'خطا در ساخت لینک ربات همکار', { action: 'ساخت QR لینک همکار', endpoint: '/api/telegram/partner-link-token' }) });
    } finally {
      setTgQrLoading(false);
    }
  };
  /* -------- Fetch -------- */
  const fetchPartnerDetails = async () => {
    if (!id || !token) return;
    setIsLoading(true);
    try {
      const response = await apiFetch(`/api/partners/${id}?view=profile`);
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'خطا در دریافت اطلاعات همکار');
      const data: PartnerDetailProfileShellData = result.data;
      setPartnerData(data);
      const map: Record<string, QtyPrice> = {};
      (data.ledgerPreview || []).forEach((l) => {
        if (!l.description) return;
        const descFa = l.description;
        const descEN = fa2en(descFa);
        const pid = descEN.match(/شناسه\s*(?:محصول|کالا)\s*:?(\d+)/i)?.[1];
        const qty = extractQtyFromText(descFa);
        const total = extractTotalFromText(descFa) || (l.credit ? Number(l.credit) : 0);
        if (!qty && !total) return;
        if (pid) map[`id_${pid}`] = { qty: qty || map[`id_${pid}`]?.qty, total: total || map[`id_${pid}`]?.total };
      });
      setLedgerMap(map);
    } catch (error: any) {
      setNotification({ type: 'error', text: humanizeErrorMessage(error.message, { endpoint: `/api/partners/${id}?view=profile`, action: 'دریافت اطلاعات همکار' }) });
      if (error.message.includes('یافت نشد')) setTimeout(() => navigate('/partners'), 2000);
    } finally { setIsLoading(false); }
  };
  useEffect(() => { if (token) fetchPartnerDetails(); }, [id, token]);

  useEffect(() => {
    if (!partnerData?.profile?.id || !requestedLedgerDeepLinkKey || appliedLedgerDeepLinkKey !== requestedLedgerDeepLinkKey) return;
    const timer = window.setTimeout(() => {
      document.getElementById('partner-ledger-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 140);
    return () => window.clearTimeout(timer);
  }, [partnerData?.profile?.id, requestedLedgerDeepLinkKey, appliedLedgerDeepLinkKey]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedLedgerSearch(ledgerSearch.trim()), 320);
    return () => window.clearTimeout(timer);
  }, [ledgerSearch]);

  const ledgerFilterKey = React.useMemo(() => JSON.stringify({
    partnerId: id || '',
    pageSize: ledgerPageSize,
    search: debouncedLedgerSearch,
    direction: ledgerViewFilter,
    range: ledgerRange,
    systemId: ledgerSystemFilter,
    settlementBatchId: activeLedgerBatchId,
  }), [id, ledgerPageSize, debouncedLedgerSearch, ledgerViewFilter, ledgerRange, ledgerSystemFilter, activeLedgerBatchId]);

  useEffect(() => {
    if (!ledgerReturnRestoring) return;
    const pending = pendingLedgerReturnRestoreRef.current;
    if (!pending) {
      setLedgerReturnRestoring(false);
      return;
    }
    const filtersReady = debouncedLedgerSearch === String(pending.search || '').trim()
      && String(ledgerViewFilter) === String(pending.direction || 'all')
      && String(ledgerRange) === String(pending.range || 'all')
      && String(ledgerSystemFilter) === String(pending.systemId || '')
      && String(activeLedgerBatchId) === String(pending.settlementBatchId || '')
      && String(ledgerDisplayMode) === String(pending.displayMode || 'timeline')
      && String(ledgerPageSize) === String(pending.pageSize || '25');
    if (!filtersReady) return;
    lastLedgerFilterKeyRef.current = ledgerFilterKey;
    setLedgerPage(Math.max(1, Number(pending.page || 1)));
    pendingLedgerReturnRestoreRef.current = null;
    setLedgerReturnRestoring(false);
  }, [ledgerReturnRestoring, debouncedLedgerSearch, ledgerViewFilter, ledgerRange, ledgerSystemFilter, activeLedgerBatchId, ledgerDisplayMode, ledgerPageSize, ledgerFilterKey]);

  const fetchPartnerLedgerDirectory = React.useCallback(async (targetPage = 1, includeMeta = true) => {
    if (!id || !token) return;
    const requestId = ++ledgerRequestSeqRef.current;
    setLedgerLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        pageSize: String(ledgerPageSize),
        search: debouncedLedgerSearch,
        direction: ledgerViewFilter,
        range: ledgerRange,
        systemId: ledgerSystemFilter,
        settlementBatchId: activeLedgerBatchId,
        includeMeta: includeMeta ? '1' : '0',
        includeRelated: '1',
      });
      const response = await apiFetch(`/api/partners/${id}/ledger?${params.toString()}`);
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'خطا در دریافت دفتر همکار');
      if (requestId !== ledgerRequestSeqRef.current) return;
      setLedgerDirectory((previous: any) => result.data?.metaIncluded ? result.data : { ...previous, ...result.data });
      const safePage = Math.max(1, Math.min(Number(result.data?.page || targetPage), Number(result.data?.totalPages || 1)));
      setLedgerPage((current) => safePage === current ? current : safePage);
    } catch (error: any) {
      if (requestId !== ledgerRequestSeqRef.current) return;
      setNotification({ type: 'error', text: humanizeErrorMessage(error.message, { endpoint: `/api/partners/${id}/ledger`, action: 'دریافت دفتر همکار' }) });
    } finally {
      if (requestId === ledgerRequestSeqRef.current) setLedgerLoading(false);
    }
  }, [id, token, ledgerPageSize, debouncedLedgerSearch, ledgerViewFilter, ledgerRange, ledgerSystemFilter, activeLedgerBatchId]);

  useEffect(() => {
    if (!token || !id || ledgerDeepLinkPending) return;
    if (ledgerReturnRestoring || pendingLedgerReturnRestoreRef.current) return;
    const filterChanged = lastLedgerFilterKeyRef.current !== ledgerFilterKey;
    lastLedgerFilterKeyRef.current = ledgerFilterKey;
    if (filterChanged && ledgerPage !== 1) {
      setLedgerPage(1);
      return;
    }
    fetchPartnerLedgerDirectory(ledgerPage, filterChanged);
  }, [fetchPartnerLedgerDirectory, ledgerFilterKey, token, id, ledgerPage, ledgerDeepLinkPending, ledgerReturnRestoring]);

  const purchaseFilterKey = React.useMemo(() => JSON.stringify({
    partnerId: id || '',
    pageSize: purchasePageSize,
    type: purchaseHistoryFilter,
  }), [id, purchasePageSize, purchaseHistoryFilter]);

  const fetchPartnerPurchaseDirectory = React.useCallback(async (targetPage = 1) => {
    if (!id || !token) return;
    const requestId = ++purchaseRequestSeqRef.current;
    setPurchaseLoading(true);
    try {
      const params = new URLSearchParams({ page: String(targetPage), pageSize: String(purchasePageSize), type: purchaseHistoryFilter });
      const response = await apiFetch(`/api/partners/${id}/purchases?${params.toString()}`);
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'خطا در دریافت تاریخچه خرید همکار');
      if (requestId !== purchaseRequestSeqRef.current) return;
      setPurchaseDirectory(result.data);
      const safePage = Math.max(1, Math.min(Number(result.data?.page || targetPage), Number(result.data?.totalPages || 1)));
      setPurchasePage((current) => safePage === current ? current : safePage);
    } catch (error: any) {
      if (requestId !== purchaseRequestSeqRef.current) return;
      setNotification({ type: 'error', text: humanizeErrorMessage(error.message, { endpoint: `/api/partners/${id}/purchases`, action: 'دریافت تاریخچه خرید همکار' }) });
    } finally {
      if (requestId === purchaseRequestSeqRef.current) setPurchaseLoading(false);
    }
  }, [id, token, purchasePageSize, purchaseHistoryFilter]);

  useEffect(() => {
    if (!token || !id) return;
    const filterChanged = lastPurchaseFilterKeyRef.current !== purchaseFilterKey;
    lastPurchaseFilterKeyRef.current = purchaseFilterKey;
    if (filterChanged && purchasePage !== 1) {
      setPurchasePage(1);
      return;
    }
    fetchPartnerPurchaseDirectory(purchasePage);
  }, [fetchPartnerPurchaseDirectory, purchaseFilterKey, token, id, purchasePage]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedPhoneSettlementSearch(soldPhoneCapitalSearch.trim()), 320);
    return () => window.clearTimeout(timer);
  }, [soldPhoneCapitalSearch]);

  const phoneSettlementFilterKey = React.useMemo(() => JSON.stringify({
    partnerId: id || '',
    pageSize: phoneSettlementPageSize,
    search: debouncedPhoneSettlementSearch,
    status: soldPhoneSettlementFilter,
    sort: soldPhoneCapitalSort,
  }), [id, phoneSettlementPageSize, debouncedPhoneSettlementSearch, soldPhoneSettlementFilter, soldPhoneCapitalSort]);

  const fetchPartnerPhoneSettlementDirectory = React.useCallback(async (targetPage = 1, includeMeta = true) => {
    if (!id || !token) return;
    const requestId = ++phoneSettlementRequestSeqRef.current;
    setPhoneSettlementLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        pageSize: String(phoneSettlementPageSize),
        search: debouncedPhoneSettlementSearch,
        status: soldPhoneSettlementFilter,
        sort: soldPhoneCapitalSort,
        includeMeta: includeMeta ? '1' : '0',
      });
      const response = await apiFetch(`/api/partners/${id}/phone-settlements?${params.toString()}`);
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'خطا در دریافت وضعیت سرمایه گوشی‌های همکار');
      if (requestId !== phoneSettlementRequestSeqRef.current) return;
      setPhoneSettlementDirectory((previous: any) => result.data?.metaIncluded ? result.data : { ...previous, ...result.data });
      const knownTotalPages = result.data?.totalPages != null ? Number(result.data.totalPages) : Number.POSITIVE_INFINITY;
      const safePage = Math.max(1, Math.min(Number(result.data?.page || targetPage), knownTotalPages));
      setPhoneSettlementPage((current) => safePage === current ? current : safePage);
    } catch (error: any) {
      if (requestId !== phoneSettlementRequestSeqRef.current) return;
      setNotification({ type: 'error', text: humanizeErrorMessage(error.message, { endpoint: `/api/partners/${id}/phone-settlements`, action: 'دریافت وضعیت سرمایه گوشی‌های همکار' }) });
    } finally {
      if (requestId === phoneSettlementRequestSeqRef.current) setPhoneSettlementLoading(false);
    }
  }, [id, token, phoneSettlementPageSize, debouncedPhoneSettlementSearch, soldPhoneSettlementFilter, soldPhoneCapitalSort]);

  useEffect(() => {
    if (!token || !id) return;
    const filterChanged = lastPhoneSettlementFilterKeyRef.current !== phoneSettlementFilterKey;
    lastPhoneSettlementFilterKeyRef.current = phoneSettlementFilterKey;
    if (filterChanged && phoneSettlementPage !== 1) {
      setPhoneSettlementPage(1);
      return;
    }
    fetchPartnerPhoneSettlementDirectory(phoneSettlementPage, filterChanged);
  }, [fetchPartnerPhoneSettlementDirectory, phoneSettlementFilterKey, token, id, phoneSettlementPage]);

  const fetchPhoneSettlementTimeline = React.useCallback(async (item: any, targetPage = 1, append = false) => {
    const phoneId = Number(item?.id || 0);
    if (!id || !token || !phoneId) return;
    const requestId = Number(phoneSettlementTimelineRequestSeqRef.current[phoneId] || 0) + 1;
    phoneSettlementTimelineRequestSeqRef.current[phoneId] = requestId;
    setPhoneSettlementTimelineCache((previous) => ({
      ...previous,
      [phoneId]: {
        ...(previous[phoneId] || {}),
        loading: true,
        error: '',
      },
    }));
    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        pageSize: '20',
        includeMeta: targetPage === 1 ? '1' : '0',
      });
      const endpoint = `/api/partners/${id}/phone-settlements/${phoneId}/timeline?${params.toString()}`;
      const response = await apiFetch(endpoint);
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'خطا در دریافت تاریخچه تسویه گوشی');
      if (phoneSettlementTimelineRequestSeqRef.current[phoneId] !== requestId) return;
      setPhoneSettlementTimelineCache((previous) => {
        const current = previous[phoneId] || {};
        const previousPayments = append && Array.isArray(current.payments) ? current.payments : [];
        const incomingPayments = Array.isArray(result.data?.payments) ? result.data.payments : [];
        const dedupedPayments = Array.from(new Map(
          [...previousPayments, ...incomingPayments].map((entry: any) => [Number(entry?.id || 0), entry])
        ).values()).filter((entry: any) => Number(entry?.id || 0) > 0);
        return {
          ...previous,
          [phoneId]: {
            ...current,
            ...result.data,
            payments: dedupedPayments,
            summary: result.data?.summary || current.summary || null,
            total: result.data?.total ?? current.total ?? Number(item?.phoneSettlementPaymentCount || 0),
            totalPages: result.data?.totalPages ?? current.totalPages ?? 1,
            loading: false,
            error: '',
            failedPage: null,
          },
        };
      });
    } catch (error: any) {
      if (phoneSettlementTimelineRequestSeqRef.current[phoneId] !== requestId) return;
      setPhoneSettlementTimelineCache((previous) => ({
        ...previous,
        [phoneId]: {
          ...(previous[phoneId] || {}),
          loading: false,
          error: humanizeErrorMessage(error.message, { endpoint: `/api/partners/${id}/phone-settlements/${phoneId}/timeline`, action: 'دریافت تاریخچه تسویه همین گوشی' }),
          failedPage: targetPage,
        },
      }));
    }
  }, [id, token]);

  const togglePhoneSettlementTimeline = React.useCallback((item: any) => {
    const phoneId = Number(item?.id || 0);
    if (!phoneId) return;
    if (expandedPhoneSettlementTimelineId === phoneId) {
      setExpandedPhoneSettlementTimelineId(null);
      return;
    }
    setExpandedPhoneSettlementTimelineId(phoneId);
    const cached = phoneSettlementTimelineCache[phoneId];
    if (!cached?.summary && !cached?.loading) void fetchPhoneSettlementTimeline(item, 1, false);
  }, [expandedPhoneSettlementTimelineId, fetchPhoneSettlementTimeline, phoneSettlementTimelineCache, setExpandedPhoneSettlementTimelineId]);

  const fullPhoneSettlementSort = bulkSettlementPriority === 'oldest_sale'
    ? 'oldestSale'
    : bulkSettlementPriority === 'lowest_balance'
      ? 'lowestBalance'
      : 'highestBalance';
  const fullPhoneSettlementFilterKey = React.useMemo(() => JSON.stringify({
    partnerId: id || '',
    pageSize: fullPhoneSettlementPageSize,
    sort: fullPhoneSettlementSort,
    open: isFullPhoneSettlementModalOpen,
  }), [id, fullPhoneSettlementPageSize, fullPhoneSettlementSort, isFullPhoneSettlementModalOpen]);

  const fetchFullPhoneSettlementDirectory = React.useCallback(async (targetPage = 1, includeMeta = true) => {
    if (!id || !token || !isFullPhoneSettlementModalOpen) return;
    const requestId = ++fullPhoneSettlementRequestSeqRef.current;
    setFullPhoneSettlementLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        pageSize: String(fullPhoneSettlementPageSize),
        status: 'open',
        sort: fullPhoneSettlementSort,
        includeMeta: includeMeta ? '1' : '0',
      });
      const response = await apiFetch(`/api/partners/${id}/phone-settlements?${params.toString()}`);
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'خطا در دریافت گوشی‌های باز برای تسویه');
      if (requestId !== fullPhoneSettlementRequestSeqRef.current) return;
      setFullPhoneSettlementDirectory((previous: any) => result.data?.metaIncluded ? result.data : { ...previous, ...result.data });
      const derivedRows = buildSettlementRowsInDirectoryOrder(result.data?.items || []);
      setBulkSettlementRowCache((previous) => {
        const next = { ...previous };
        derivedRows.forEach((row: any) => { if (Number(row?.id || 0) > 0) next[Number(row.id)] = row; });
        return next;
      });
      const knownTotalPages = result.data?.totalPages != null ? Number(result.data.totalPages) : Number.POSITIVE_INFINITY;
      const safePage = Math.max(1, Math.min(Number(result.data?.page || targetPage), knownTotalPages));
      setFullPhoneSettlementPage((current) => safePage === current ? current : safePage);
    } catch (error: any) {
      if (requestId !== fullPhoneSettlementRequestSeqRef.current) return;
      setNotification({ type: 'error', text: humanizeErrorMessage(error.message, { endpoint: `/api/partners/${id}/phone-settlements`, action: 'دریافت گوشی‌های باز برای تسویه' }) });
    } finally {
      if (requestId === fullPhoneSettlementRequestSeqRef.current) setFullPhoneSettlementLoading(false);
    }
  }, [id, token, isFullPhoneSettlementModalOpen, fullPhoneSettlementPageSize, fullPhoneSettlementSort]);

  useEffect(() => {
    if (!token || !id || !isFullPhoneSettlementModalOpen) return;
    const filterChanged = lastFullPhoneSettlementFilterKeyRef.current !== fullPhoneSettlementFilterKey;
    lastFullPhoneSettlementFilterKeyRef.current = fullPhoneSettlementFilterKey;
    if (filterChanged && fullPhoneSettlementPage !== 1) {
      setFullPhoneSettlementPage(1);
      return;
    }
    fetchFullPhoneSettlementDirectory(fullPhoneSettlementPage, filterChanged);
  }, [fetchFullPhoneSettlementDirectory, fullPhoneSettlementFilterKey, token, id, isFullPhoneSettlementModalOpen, fullPhoneSettlementPage]);

  const refreshPartnerDetailData = React.useCallback(async () => {
    // Financial mutations can change a phone timeline independently of the currently loaded ledger page.
    // Invalidate bounded timeline caches and let the next explicit expansion fetch fresh history.
    setPhoneSettlementTimelineCache({});
    setExpandedPhoneSettlementTimelineId(null);
    await Promise.all([
      fetchPartnerDetails(),
      fetchPartnerLedgerDirectory(ledgerPage),
      fetchPartnerPurchaseDirectory(purchasePage),
      fetchPartnerPhoneSettlementDirectory(phoneSettlementPage),
      isFullPhoneSettlementModalOpen ? fetchFullPhoneSettlementDirectory(fullPhoneSettlementPage) : Promise.resolve(),
    ]);
  }, [fetchPartnerLedgerDirectory, fetchPartnerPurchaseDirectory, fetchPartnerPhoneSettlementDirectory, fetchFullPhoneSettlementDirectory, ledgerPage, purchasePage, phoneSettlementPage, fullPhoneSettlementPage, isFullPhoneSettlementModalOpen]);
  const fetchPartnerTelegramConversation = async (partnerId: number) => {
    if (!token || !partnerId) return;
    setPartnerTgConvLoading(true);
    setPartnerTgConvError('');
    try {
      const response = await apiFetch(`/api/telegram/conversation?partnerId=${partnerId}&limit=300`);
      const json = await response.json().catch(() => ({}));
      if (!response.ok || json?.success === false) throw new Error(json?.message || 'خطا در دریافت گفت‌وگوی تلگرام همکار');
      setPartnerTgConvItems(Array.isArray(json?.data) ? json.data : []);
    } catch (error: any) {
      setPartnerTgConvError(error?.message || 'گفت‌وگوی تلگرام همکار دریافت نشد.');
      setPartnerTgConvItems([]);
    } finally {
      setPartnerTgConvLoading(false);
    }
  };
  useEffect(() => {
    const pid = Number((partnerData as any)?.profile?.id || 0);
    if (!partnerTgAutoRefresh || !token || !pid) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') fetchPartnerTelegramConversation(pid);
    }, 8000);
    return () => window.clearInterval(timer);
  }, [partnerTgAutoRefresh, token, (partnerData as any)?.profile?.id]);
  useEffect(() => {
    const el = partnerTgTimelineRef.current;
    if (!el) return;
    const nearBottom = (el.scrollHeight - el.scrollTop - el.clientHeight) < 140;
    if (nearBottom) {
      el.scrollTop = el.scrollHeight;
      setPartnerTgNewSinceScroll(false);
    } else {
      setPartnerTgNewSinceScroll(true);
    }
  }, [partnerTgConvItems.length]);
  const partnerTgFilteredConvItems = React.useMemo(
    () => filterPartnerTelegramConversationItems(partnerTgConvItems, partnerTgSearchQuery, partnerTgDirectionFilter),
    [partnerTgConvItems, partnerTgSearchQuery, partnerTgDirectionFilter]
  );
  const jumpToFirstPartnerTgResult = () => {
    const first = partnerTgFilteredConvItems[0];
    if (!first) return;
    document.getElementById(`tg-partner-msg-${first.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  /* -------- Edit partner -------- */
  const openEditModal = () => {
    if (!partnerData?.profile) return;
    const p = partnerData.profile;
    setEditingPartner({
      partnerName: p.partnerName, partnerType: p.partnerType, contactPerson: p.contactPerson || '',
      phoneNumber: p.phoneNumber || '', email: p.email || '', address: p.address || '', notes: p.notes || ''
    });
    setEditFormErrors({}); setIsEditModalOpen(true);
  };
  const handleEditInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditingPartner(prev => ({ ...prev, [name]: value }));
    if (editFormErrors[name as keyof NewPartnerData]) setEditFormErrors(prev => ({ ...prev, [name]: undefined }));
  };
  const validateEditForm = (): boolean => {
    const errors: Partial<NewPartnerData> = {};
    if (!editingPartner.partnerName?.trim()) errors.partnerName = 'نام همکار الزامی است.';
    if (!editingPartner.partnerType?.trim()) errors.partnerType = 'نوع همکار الزامی است.';
    if (editingPartner.phoneNumber && !/^\d{10,15}$/.test(editingPartner.phoneNumber.trim())) errors.phoneNumber = 'شماره تماس نامعتبر است (۱۰ تا ۱۵ رقم).';
    if (editingPartner.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editingPartner.email.trim())) errors.email = 'ایمیل نامعتبر است.';
    setEditFormErrors(errors);
    focusErrorsSoon(errors as any, { partnerName: 'editPartnerName', partnerType: 'editPartnerType', phoneNumber: 'editPhoneNumber', email: 'editEmail' });
    return Object.keys(errors).length === 0;
  };
  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmittingEdit) return;
    if (!validateEditForm() || !id || !token) return;
    setIsSubmittingEdit(true); setNotification(null);
    try {
      await runWithFeedback(
        apiFetch(`/api/partners/${id}`, { method: 'PUT', body: JSON.stringify(editingPartner) }).then((response) =>
          parseApiResult(response, { endpoint: `/api/partners/${id}`, action: 'ویرایش اطلاعات همکار' })
        ),
        {
          kind: 'update',
          loading: 'در حال ذخیره تغییرات اطلاعات همکار…',
          success: 'اطلاعات همکار با موفقیت به‌روزرسانی شد.',
          endpoint: `/api/partners/${id}`,
        }
      );
      setIsEditModalOpen(false); refreshPartnerDetailData();
    } catch (error:any) {
      setNotification({ type: 'error', text: error.message });
      if (isDuplicateMessage(error.message)) {
        const duplicateError = 'این شماره تماس قبلاً برای همکار دیگری ثبت اطلاعات شده است.';
        setEditFormErrors(prev => ({ ...prev, phoneNumber: duplicateError }));
        focusErrorsSoon({ phoneNumber: duplicateError } as any, { phoneNumber: 'editPhoneNumber' });
      }
    } finally { setIsSubmittingEdit(false); }
  };
  /* -------- Ledger (new payment) -------- */
  const openLedgerModal = () => {
    setNewLedgerEntry({ ...initialLedgerEntry, debit: 0, credit: 0 });
    setLedgerDirection('payment');
    setLedgerDateSelected(new Date());
    setLedgerFormErrors({}); setIsLedgerModalOpen(true);
  };
  const handleLedgerInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { name: string; value: string } }) => {
    const { name, value } = e.target;
    if (name === 'amount') { const amountValue = num(value); setNewLedgerEntry(prev => ({ ...prev, debit: amountValue, credit: 0 })); }
    else setNewLedgerEntry(prev => ({ ...prev, [name]: value } as any));
    if (ledgerFormErrors[name as keyof NewLedgerEntryData] || ledgerFormErrors.amount) {
      setLedgerFormErrors(prev => ({ ...prev, [name]: undefined, amount: undefined, transactionDate: undefined }));
    }
  };
  const validateLedgerForm = (): boolean => {
    const errors: Partial<NewLedgerEntryData & { amount?: string; transactionDate?: string }> = {};
    if (!newLedgerEntry.description?.trim()) errors.description = 'شرح پرداخت الزامی است.';
    const amount = newLedgerEntry.debit;
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) errors.amount = 'مبلغ پرداخت باید عددی مثبت باشد.';
    if (!ledgerDateSelected) errors.transactionDate = 'تاریخ پرداخت الزامی است.';
    setLedgerFormErrors(errors);
    focusErrorsSoon(errors as any, { amount: 'ledgerAmount', transactionDate: 'ledgerTransactionDate', description: 'ledgerDescription' });
    return Object.keys(errors).length === 0;
  };
  const handleLedgerSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmittingLedger) return;
    if (!validateLedgerForm() || !id || !ledgerDateSelected || !token) return;
    setIsSubmittingLedger(true); setNotification(null);
    const amount = Number(newLedgerEntry.debit || 0);
    const payload: NewLedgerEntryData = {
      description: newLedgerEntry.description!,
      debit: ledgerDirection === 'payment' ? amount : 0,
      credit: ledgerDirection === 'receipt' ? amount : 0,
      transactionDate: moment(ledgerDateSelected).toISOString(),
    };
    try {
      await runWithFeedback(
        apiFetch(`/api/partners/${id}/ledger`, { method: 'POST', body: JSON.stringify(payload) }).then((response) =>
          parseApiResult(response, { endpoint: `/api/partners/${id}/ledger`, action: ledgerDirection === 'receipt' ? 'ثبت دریافت همکار' : 'ثبت پرداخت همکار' })
        ),
        {
          kind: 'create',
          loading: ledgerDirection === 'receipt' ? 'در حال ثبت اطلاعات دریافت از همکار…' : 'در حال ثبت اطلاعات پرداخت در دفتر همکار…',
          success: ledgerDirection === 'receipt' ? 'دریافت با موفقیت در دفتر همکار ثبت اطلاعات شد.' : 'پرداخت با موفقیت در دفتر همکار ثبت اطلاعات شد.',
          endpoint: `/api/partners/${id}/ledger`,
        }
      );
      setIsLedgerModalOpen(false); refreshPartnerDetailData();
    } catch (error:any) { setNotification({ type: 'error', text: humanizeErrorMessage(error.message, { endpoint: `/api/partners/${id}/ledger`, action: ledgerDirection === 'receipt' ? 'ثبت دریافت همکار' : 'ثبت پرداخت همکار' }) }); }
    finally { setIsSubmittingLedger(false); }
  };
  const openPhoneSettlementModal = (item: any) => {
    const alreadyPaid = Number(item?.phoneSettlementPaidAmount || 0);
    const basis = Number(item?.settlementPurchasePrice || item?.soldDailyPurchasePrice || item?.purchasePrice || 0);
    const remaining = Math.max(0, basis - alreadyPaid);
    const phoneLabel = [item?.name, item?.identifier ? `IMEI: ${item.identifier}` : ''].filter(Boolean).join(' • ');
    setPhoneSettlementItem(item);
    setPhoneSettlementAmount(remaining);
    setPhoneSettlementNote(`ثبت پرداخت مرتبط با گوشی ${phoneLabel}`);
    setPhoneSettlementDateSelected(new Date());
    setPhoneSettlementErrors({});
  };
  const handlePhoneSettlementAmountChange = (e: ChangeEvent<HTMLInputElement> | { target: { name: string; value: string } }) => {
    setPhoneSettlementAmount(num(e.target.value));
    if (phoneSettlementErrors.amount) setPhoneSettlementErrors(prev => ({ ...prev, amount: undefined }));
  };
  const validatePhoneSettlementForm = (): boolean => {
    const errors: { amount?: string; transactionDate?: string; note?: string } = {};
    const amount = Number(phoneSettlementAmount || 0);
    const basis = Number(phoneSettlementItem?.settlementPurchasePrice || phoneSettlementItem?.soldDailyPurchasePrice || phoneSettlementItem?.purchasePrice || 0);
    const alreadyPaid = Number(phoneSettlementItem?.phoneSettlementPaidAmount || 0);
    const remaining = Math.max(0, basis - alreadyPaid);
    if (!amount || Number.isNaN(amount) || amount <= 0) errors.amount = 'مبلغ پرداخت باید عددی مثبت باشد.';
    if (remaining > 0 && amount > remaining) errors.amount = `مبلغ پرداخت نباید بیشتر از مانده سرمایه همین گوشی باشد: ${formatCurrencyText(remaining, readStoredCurrencyUnit())}`;
    if (!phoneSettlementDateSelected) errors.transactionDate = 'تاریخ پرداخت الزامی است.';
    if (!String(phoneSettlementNote || '').trim()) errors.note = 'شرح پرداخت الزامی است.';
    setPhoneSettlementErrors(errors);
    focusErrorsSoon(errors as any, { amount: 'phoneSettlementAmount', transactionDate: 'phoneSettlementDate', note: 'phoneSettlementNote' });
    return Object.keys(errors).length === 0;
  };
  const handlePhoneSettlementSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmittingPhoneSettlement) return;
    if (!id || !token || !phoneSettlementItem || !phoneSettlementDateSelected || !validatePhoneSettlementForm()) return;
    setIsSubmittingPhoneSettlement(true);
    setNotification(null);
    const phoneLabel = [phoneSettlementItem?.name, phoneSettlementItem?.identifier ? `IMEI: ${phoneSettlementItem.identifier}` : ''].filter(Boolean).join(' • ');
    const payload: NewLedgerEntryData = {
      description: `${phoneSettlementNote.trim()}${phoneLabel ? `\nگوشی: ${phoneLabel}` : ''}`,
      debit: Number(phoneSettlementAmount || 0),
      credit: 0,
      transactionDate: moment(phoneSettlementDateSelected).toISOString(),
      referenceType: 'phone_settlement_payment',
      referenceId: Number(phoneSettlementItem.id),
    };
    try {
      await runWithFeedback(
        apiFetch(`/api/partners/${id}/ledger`, { method: 'POST', body: JSON.stringify(payload) }).then((response) =>
          parseApiResult(response, { endpoint: `/api/partners/${id}/ledger`, action: 'ثبت سرمایه بازگشتی ثبت‌شده گوشی' })
        ),
        {
          kind: 'create',
          loading: 'در حال ثبت پرداخت روی گوشی…',
          success: 'پرداخت روی همین گوشی ثبت شد و از مانده کل همکار هم کسر شد.',
          endpoint: `/api/partners/${id}/ledger`,
        }
      );
      setPhoneSettlementItem(null);
      await refreshPartnerDetailData();
    } catch (error: any) {
      setNotification({ type: 'error', text: humanizeErrorMessage(error.message, { endpoint: `/api/partners/${id}/ledger`, action: 'ثبت سرمایه بازگشتی ثبت‌شده گوشی' }) });
    } finally {
      setIsSubmittingPhoneSettlement(false);
    }
  };
  const submitProductPhoneSettlement = async (item: any, amount: number, note: string, feedbackLabel = 'ثبت سرمایه بازگشتی ثبت‌شده گوشی') => {
    if (!id || !token || !item) return;
    const balance = Math.max(0, Number(item?.phoneSettlementBalance || 0));
    const safeAmount = Math.round(Number(amount || 0));
    if (!safeAmount || safeAmount <= 0) throw new Error('مبلغ پرداخت باید عددی مثبت باشد.');
    if (balance > 0 && safeAmount > balance) throw new Error(`مبلغ پرداخت نباید بیشتر از مانده سرمایه همین گوشی باشد: ${formatCurrencyText(balance, readStoredCurrencyUnit())}`);
    const phoneLabel = [item?.name, item?.identifier ? `IMEI: ${item.identifier}` : ''].filter(Boolean).join(' • ');
    const payload: NewLedgerEntryData = {
      description: `${String(note || '').trim()}${phoneLabel ? `
گوشی: ${phoneLabel}` : ''}`,
      debit: safeAmount,
      credit: 0,
      transactionDate: moment().toISOString(),
      referenceType: 'phone_settlement_payment',
      referenceId: Number(item.id),
    };
    await runWithFeedback(
      apiFetch(`/api/partners/${id}/ledger`, { method: 'POST', body: JSON.stringify(payload) }).then((response) =>
        parseApiResult(response, { endpoint: `/api/partners/${id}/ledger`, action: feedbackLabel })
      ),
      {
        kind: 'create',
        loading: 'در حال ثبت پرداخت روی گوشی…',
        success: 'پرداخت روی گوشی ثبت شد و از مانده کل همکار هم کسر شد.',
        endpoint: `/api/partners/${id}/ledger`,
      }
    );
  };
  const handleFullSettlementPhoneSubmit = async (item: any, amountOverride?: number) => {
    const phoneId = Number(item?.id || 0);
    const balance = Math.max(0, Number(item?.phoneSettlementBalance || 0));
    const amount = Math.round(Number(amountOverride ?? num(fullSettlementAmounts[phoneId]) ?? 0));
    if (!phoneId || balance <= 0) return;
    if (!amount || amount <= 0) {
      setNotification({ type: 'error', text: 'برای پرداخت بخشی، مبلغ معتبر وارد کن.' });
      return;
    }
    if (amount > balance) {
      setNotification({ type: 'error', text: `مبلغ واردشده بیشتر از مانده این گوشی است: ${formatCurrencyText(balance, readStoredCurrencyUnit())}` });
      return;
    }
    if (isSubmittingFullSettlementPhoneId === phoneId) return;
    setIsSubmittingFullSettlementPhoneId(phoneId);
    setNotification(null);
    try {
      await submitProductPhoneSettlement(
        item,
        amount,
        amount === balance ? 'تسویه کامل از نمای تسویه همکار' : 'پرداخت بخشی از نمای تسویه همکار',
        'ثبت پرداخت از نمای تسویه کامل همکار'
      );
      setFullSettlementAmounts(prev => ({ ...prev, [phoneId]: '' }));
      setBulkSettlementPhoneIds((previous) => previous.filter((value) => Number(value) !== phoneId));
      setBulkSettlementRowCache((previous) => {
        const next = { ...previous };
        delete next[phoneId];
        return next;
      });
      await refreshPartnerDetailData();
    } catch (error: any) {
      setNotification({ type: 'error', text: humanizeErrorMessage(error.message, { endpoint: `/api/partners/${id}/ledger`, action: 'ثبت پرداخت از نمای تسویه کامل همکار' }) });
    } finally {
      setIsSubmittingFullSettlementPhoneId(null);
    }
  };
  const handleBulkSettlementSelectAll = () => {
    const pageIds = openSoldPhoneSettlementRows.map((item: any) => Number(item.id)).filter(Boolean);
    setBulkSettlementPhoneIds((previous) => Array.from(new Set([...previous, ...pageIds])));
  };
  const handleBulkSettlementClear = () => {
    setBulkSettlementPhoneIds([]);
    setBulkSettlementAmount('');
  };
  const handleBulkSettlementAmountChange = (value: string) => {
    setBulkSettlementAmount(String(num(value) || ''));
  };
  const handleBulkSettlementSubmit = async () => {
    if (!id || !token) return;
    if (selectedBulkSettlementRows.length === 0) {
      setNotification({ type: 'error', text: 'برای تسویه گروهی حداقل یک گوشی را انتخاب کن.' });
      return;
    }
    const amountValue = Math.round(Number(bulkSettlementAmountValue || 0));
    if (!amountValue || amountValue <= 0) {
      setNotification({ type: 'error', text: 'مبلغ کلی تسویه گروهی معتبر نیست.' });
      return;
    }
    if (amountValue > selectedBulkSettlementBalanceTotal) {
      setNotification({ type: 'error', text: `مبلغ کلی بیشتر از مانده گوشی‌های انتخاب‌شده است: ${formatCurrencyText(selectedBulkSettlementBalanceTotal, readStoredCurrencyUnit())}` });
      return;
    }
    if (bulkSettlementDistribution.length === 0) {
      setNotification({ type: 'error', text: 'مبلغ واردشده روی هیچ گوشی قابل تخصیص نیست.' });
      return;
    }
    setIsSubmittingBulkSettlement(true);
    setNotification(null);
    const sharedBulkSettlementNote = bulkSettlementNote.trim();
    const batchIdForSubmit = bulkSettlementBatchId || createBulkSettlementBatchId();
    const priorityLabel = bulkSettlementPriority === 'oldest_sale' ? 'قدیمی‌ترین فروش' : bulkSettlementPriority === 'lowest_balance' ? 'کمترین مانده' : 'بیشترین مانده';
    try {
      await runWithFeedback(
        (async () => {
          for (const entry of bulkSettlementDistribution) {
            const phoneLabel = [entry.item?.name, entry.item?.identifier ? `IMEI: ${entry.item.identifier}` : ''].filter(Boolean).join(' • ');
            const note = [
              'تسویه گروهی گوشی‌های همکار',
              `شناسه دسته تسویه: ${batchIdForSubmit}`,
              `اولویت پخش: ${priorityLabel}`,
              sharedBulkSettlementNote ? `توضیح مشترک: ${sharedBulkSettlementNote}` : '',
              phoneLabel ? `گوشی: ${phoneLabel}` : '',
            ].filter(Boolean).join('\n');
            const payload: NewLedgerEntryData = {
              description: note,
              debit: Number(entry.amount || 0),
              credit: 0,
              transactionDate: moment().toISOString(),
              referenceType: 'phone_settlement_payment',
              referenceId: Number(entry.item?.id),
              settlementBatchId: batchIdForSubmit,
            };
            const response = await apiFetch(`/api/partners/${id}/ledger`, { method: 'POST', body: JSON.stringify(payload) });
            await parseApiResult(response, { endpoint: `/api/partners/${id}/ledger`, action: 'ثبت تسویه گروهی گوشی‌های همکار' });
          }
        })(),
        {
          kind: 'create',
          loading: 'در حال ثبت تسویه گروهی روی گوشی‌های انتخاب‌شده…',
          success: 'تسویه گروهی ثبت شد؛ هر پرداخت به گوشی خودش وصل شد و از مانده کل همکار کم شد.',
          endpoint: `/api/partners/${id}/ledger`,
        }
      );
      if (sharedBulkSettlementNote) rememberBulkSettlementNote(sharedBulkSettlementNote);
      setLastSubmittedBulkSettlementBatchId(batchIdForSubmit);
      setActiveLedgerBatchId(batchIdForSubmit);
      setBulkSettlementBatchId(createBulkSettlementBatchId());
      setBulkSettlementPhoneIds([]);
      setBulkSettlementAmount('');
      setBulkSettlementNote('');
      await refreshPartnerDetailData();
    } catch (error: any) {
      setNotification({ type: 'error', text: humanizeErrorMessage(error.message, { endpoint: `/api/partners/${id}/ledger`, action: 'ثبت تسویه گروهی گوشی‌های همکار' }) });
    } finally {
      setIsSubmittingBulkSettlement(false);
    }
  };
  /* -------- Edit/Delete ledger entry -------- */
  const handleLedgerDelete = async (entryId: number) => {
    if (!id || !token) return;
    const ok = await confirmAction({ title: 'حذف رکورد دفتر', description: 'این رکورد از دفتر همکار حذف شود؟', confirmText: 'بله، حذف شود', tone: 'danger' });
    if (!ok) return;
    setIsDeletingEntry(true);
    try {
      await runWithFeedback(
        apiFetch(`/api/partners/${id}/ledger/${entryId}`, { method: 'DELETE', headers: getAuthHeaders(token) }).then((response) =>
          parseApiResult(response, { endpoint: `/api/partners/${id}/ledger/${entryId}`, action: 'حذف رکورد دفتر همکار' })
        ),
        {
          kind: 'delete',
          loading: 'در حال حذف رکورد دفتر همکار…',
          success: 'رکورد دفتر همکار با موفقیت حذف شد.',
          endpoint: `/api/partners/${id}/ledger/${entryId}`,
        }
      );
      await refreshPartnerDetailData();
    } catch (error:any) { setNotification({ type: 'error', text: humanizeErrorMessage(error.message, { endpoint: `/api/partners/${id}/ledger/${entryId}`, action: 'حذف رکورد دفتر همکار' }) }); }
    finally { setIsDeletingEntry(false); }
  };
  const handleLedgerEdit = async () => {
    if (!id || !token || !editingEntry) return;
    try {
      const payload: any = {
        description: editingEntry.description,
        debit: editingEntry.debit,
        credit: editingEntry.credit,
        transactionDate: editingEntry.transactionDate,
      };
      await runWithFeedback(
        apiFetch(`/api/partners/${id}/ledger/${editingEntry.id}`, {
          method: 'PUT', headers: { ...getAuthHeaders(token), 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).then((response) => parseApiResult(response, { endpoint: `/api/partners/${id}/ledger/${editingEntry.id}`, action: 'ویرایش رکورد دفتر همکار' })),
        {
          kind: 'update',
          loading: 'در حال ذخیره تغییرات تغییرات دفتر همکار…',
          success: 'رکورد دفتر همکار با موفقیت ویرایش شد.',
          endpoint: `/api/partners/${id}/ledger/${editingEntry.id}`,
        }
      );
      setEditingEntry(null); await refreshPartnerDetailData();
    } catch (error:any) { setNotification({ type: 'error', text: humanizeErrorMessage(error.message, { endpoint: `/api/partners/${id}/ledger/${editingEntry.id}`, action: 'ویرایش رکورد دفتر همکار' }) }); }
  };
  /* -------- UI helpers -------- */
  const inputClass = (hasError: boolean, _isTextarea = false, isSelect = false) =>
    `w-full p-2.5 border rounded-lg shadow-sm    text-sm text-right bg-white dark:bg-gray-800 dark:border-gray-600 ${isSelect ? 'bg-white ' : ''}${hasError ? 'border-red-500' : 'border-gray-300'}`;
  const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';
  /* -------- Render -------- */
  const profile = partnerData?.profile;
  const profileBalanceState = getBalanceState(profile?.currentBalance, { overdue: Math.abs(Number(profile?.currentBalance || 0)) >= 50000000 });
  const partnerRegisteredDateLabel = formatKnownShamsiDate(getEntityRegisteredDateValue(profile), 'نامشخص');
  const ledger = (ledgerDirectory?.items ?? []) as PartnerLedgerEntry[];
  const ledgerPreview = (partnerData?.ledgerPreview ?? []) as PartnerLedgerEntry[];
  const totalCredits = Number(partnerData?.ledgerSummary?.totalCredit ?? 0);
  const totalDebits = Number(partnerData?.ledgerSummary?.totalDebit ?? 0);
  const ledgerVisibleExtraColumnsCount = Number(ledgerVisibleColumns.systemId) + Number(ledgerVisibleColumns.createdAt) + Number(ledgerVisibleColumns.transactionDate);
  const ledgerTableColumnCount = 5 + ledgerVisibleExtraColumnsCount;
  const purchaseHistory = (purchaseDirectory?.items ?? []) as any[];
  const ledgerRelatedPurchases = (ledgerDirectory?.relatedPurchases ?? []) as any[];
  const purchaseHistoryBySystemId = React.useMemo(
    () => buildPurchaseHistoryBySystemId([...purchaseHistory, ...ledgerRelatedPurchases]),
    [purchaseHistory, ledgerRelatedPurchases],
  );
  const ledgerSystemOptions = React.useMemo(() => Array.isArray(ledgerDirectory?.systemOptions) ? ledgerDirectory.systemOptions : [], [ledgerDirectory?.systemOptions]);
  const [expandedPurchaseHistoryId, setExpandedPurchaseHistoryId] = useState<string | null>(null);
  const purchaseHistoryVisible = React.useMemo(() => buildPurchaseHistoryVisible(purchaseHistory, purchaseHistoryFilter), [purchaseHistory, purchaseHistoryFilter]);
  const purchaseHistoryCounts = React.useMemo(() => ({
    all: Number(purchaseDirectory?.counts?.all ?? partnerData?.purchaseSummary?.all ?? 0),
    phone: Number(purchaseDirectory?.counts?.phone ?? partnerData?.purchaseSummary?.phone ?? 0),
    product: Number(purchaseDirectory?.counts?.product ?? partnerData?.purchaseSummary?.product ?? 0),
  }), [purchaseDirectory?.counts, partnerData?.purchaseSummary]);
  const realizedCollectedBalance = Number((profile as any)?.realizedCollectedBalance ?? 0);
  const unsoldInventoryAmount = Number((profile as any)?.unsoldPhonesInventoryAmount ?? 0) + Number((profile as any)?.unsoldAccessoriesInventoryAmount ?? 0);
  const soldPhonesCurrentPurchaseAmount = Number((profile as any)?.soldPhonesCurrentPurchaseAmount ?? (profile as any)?.phoneSalesReceivableAmount ?? 0);
  const soldPhonesInitialPurchaseAmount = Number((profile as any)?.soldPhonesInitialPurchaseAmount ?? 0);
  const soldPhonesCurrentPurchaseDelta = Number((profile as any)?.soldPhoneCurrentDeltaAmount ?? (soldPhonesCurrentPurchaseAmount - soldPhonesInitialPurchaseAmount));
  const soldPhonesProductSettlementPaidAmount = Number((profile as any)?.soldPhonesProductSettlementPaidAmount ?? 0);
  const soldPhonesProductSettlementBalance = Number((profile as any)?.soldPhonesProductSettlementBalance ?? (soldPhonesCurrentPurchaseAmount - soldPhonesProductSettlementPaidAmount));
  const unallocatedPartnerPaymentAmount = Number((profile as any)?.unallocatedPartnerPaymentAmount ?? Math.max(0, totalDebits - soldPhonesProductSettlementPaidAmount));
  const soldPhonesCurrentPurchaseBalance = Number((profile as any)?.soldPhonesCurrentPurchaseBalance ?? (soldPhonesCurrentPurchaseAmount - totalDebits));
  const settlementSummary = partnerData?.soldPhoneSettlementSummary;
  const soldPhoneDailyPriceRows = React.useMemo(
    () => buildSettlementRowsInDirectoryOrder(phoneSettlementDirectory?.items ?? []),
    [phoneSettlementDirectory?.items]
  );
  const soldPhoneSettlementFilterCounts = React.useMemo(() => ({
    all: Number(settlementSummary?.total || 0),
    open: Number(settlementSummary?.open || 0),
    settled: Number(settlementSummary?.settled || 0),
  }), [settlementSummary]);
  const soldPhoneSettlementStatusCounts = React.useMemo(() => buildSoldPhoneSettlementStatusCounts(soldPhoneDailyPriceRows), [soldPhoneDailyPriceRows]);
  // Filtering and ordering are server-side; these are only the hydrated rows for the current page.
  const filteredSoldPhoneDailyPriceRows = soldPhoneDailyPriceRows;
  const filteredSoldPhoneDailyPriceTotals = React.useMemo(() => {
    const summary = phoneSettlementDirectory?.filteredSummary;
    if (summary) {
      return {
        total: Number(summary.totalAmount || 0),
        initialTotal: Number(summary.initialTotal || 0),
        deltaTotal: Number(summary.deltaTotal || 0),
        paidTotal: Number(summary.paidTotal || 0),
        balanceTotal: Number(summary.balanceTotal || 0),
      };
    }
    return buildFilteredSoldPhoneDailyPriceTotals(filteredSoldPhoneDailyPriceRows);
  }, [phoneSettlementDirectory?.filteredSummary, filteredSoldPhoneDailyPriceRows]);
  const filteredSoldPhoneDailyPriceTotal = filteredSoldPhoneDailyPriceTotals.total;
  const filteredSoldPhoneDailyPriceInitialTotal = filteredSoldPhoneDailyPriceTotals.initialTotal;
  const filteredSoldPhoneDailyPriceDeltaTotal = filteredSoldPhoneDailyPriceTotals.deltaTotal;
  const filteredSoldPhoneProductSettlementPaidTotal = filteredSoldPhoneDailyPriceTotals.paidTotal;
  const filteredSoldPhoneProductSettlementBalanceTotal = filteredSoldPhoneDailyPriceTotals.balanceTotal;
  const partnerBusinessReadModel = React.useMemo(() => buildPartnerBusinessReadModel({
    profile,
    ledger: ledgerPreview,
    purchaseHistory: partnerData?.soldPhoneSettlementItems ?? [],
    soldPhoneDailyPriceRows,
    unsoldInventoryAmount,
    soldPhonesProductSettlementBalance,
    soldPhonesCurrentPurchaseAmount,
    soldPhonesCurrentPurchaseDelta,
    totalCredits,
    totalDebits,
    purchaseSummary: partnerData?.purchaseSummary,
    ledgerSummary: partnerData?.ledgerSummary,
    settlementSummary: partnerData?.soldPhoneSettlementSummary,
  }), [
    profile,
    ledgerPreview,
    partnerData?.soldPhoneSettlementItems,
    partnerData?.purchaseSummary,
    partnerData?.ledgerSummary,
    partnerData?.soldPhoneSettlementSummary,
    soldPhoneDailyPriceRows,
    unsoldInventoryAmount,
    soldPhonesProductSettlementBalance,
    soldPhonesCurrentPurchaseAmount,
    soldPhonesCurrentPurchaseDelta,
    totalCredits,
    totalDebits,
  ]);
  const handlePartnerAtomicSettlementSubmit = async () => submitPartnerAtomicSettlementFromUi({
    profile,
    id,
    token,
    currentUser,
    partnerBusinessReadModel,
    confirmAction,
    setNotification,
    setIsSubmittingAtomicSettlement,
    setLastAtomicSettlementSubmitResult,
    setLastAtomicSettlementSubmitError,
    appendAtomicSettlementSubmitAttempt: (attempt: any) => setAtomicSettlementSubmitAttempts((previous) => [attempt, ...previous].slice(0, 8)),
    fetchPartnerDetails: refreshPartnerDetailData,
  });
  const handlePartnerManagerSignoffPersistence = async () => persistPartnerSettlementManagerSignoffFromUi({
    profile,
    id,
    token,
    currentUser,
    ledger,
    lastAtomicSettlementSubmitResult,
    partnerBusinessReadModel,
    confirmAction,
    setNotification,
    setIsPersistingManagerSignoff,
    setLastManagerSignoffPersistenceResult,
    setLastManagerSignoffPersistenceError,
    fetchPartnerDetails: refreshPartnerDetailData,
  });
  const exportPartnerCapitalRows = async () => {
    if (!id || !token || phoneSettlementExporting) return;
    setPhoneSettlementExporting(true);
    try {
      const rows: any[] = [];
      let page = 1;
      let totalPages = 1;
      do {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: '100',
          search: soldPhoneCapitalSearch.trim(),
          status: soldPhoneSettlementFilter,
          sort: soldPhoneCapitalSort,
          includeMeta: page === 1 ? '1' : '0',
        });
        const response = await apiFetch(`/api/partners/${id}/phone-settlements?${params.toString()}`);
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || 'خطا در آماده‌سازی خروجی سرمایه گوشی‌ها');
        rows.push(...buildSettlementRowsInDirectoryOrder(result.data?.items || []));
        if (page === 1) totalPages = Math.max(1, Number(result.data?.totalPages || 1));
        page += 1;
      } while (page <= totalPages);

      const headers = ['مدل گوشی', 'شناسه', 'وضعیت', 'قیمت روز فروش', 'بهای اولیه', 'سرمایه برگشتی', 'مانده سرمایه', 'تاریخ فروش', 'منبع'];
      const csvRows = rows.map((item: any) => {
        const sourceLabel = String(item?.settlementPriceSourceLabel || item?.saleReferenceLabel || 'ثبت مستقیم گوشی');
        return [
          item?.name || 'گوشی فروخته‌شده',
          item?.identifier || '',
          item?.status || '',
          Number(item?.settlementPurchasePrice || 0),
          Number(item?.initialPurchasePrice || 0),
          Number(item?.phoneSettlementPaidAmount || 0),
          Number(item?.phoneSettlementBalance || 0),
          item?.soldAt ? formatIsoToShamsi(item.soldAt) : '',
          sourceLabel,
        ].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',');
      });
      const blob = new Blob(['\ufeff' + [headers.join(','), ...csvRows].join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `partner-capital-${profile?.partnerName || 'partner'}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      setNotification({ type: 'error', text: humanizeErrorMessage(error.message, { endpoint: `/api/partners/${id}/phone-settlements`, action: 'خروجی سرمایه گوشی‌های همکار' }) });
    } finally {
      setPhoneSettlementExporting(false);
    }
  };
  const partnerUnifiedStatusTotals = React.useMemo(() => ({
    partnerCapitalReturnedAmount: Number(settlementSummary?.paidTotal || 0),
    partnerCapitalWaitingAmount: Number(settlementSummary?.balanceTotal || 0),
    openSaleFiles: Number(settlementSummary?.openSaleFiles || 0),
    closedSaleFiles: Number(settlementSummary?.closedSaleFiles || 0),
    customerInstallmentRemainingAmount: Number(settlementSummary?.customerInstallmentRemainingAmount || 0),
  }), [settlementSummary]);
  const settlementPreviewRows = React.useMemo(
    () => buildSoldPhoneDailyPriceRows(partnerData?.soldPhoneSettlementItems ?? []),
    [partnerData?.soldPhoneSettlementItems]
  );
  const nextOpenPhoneForSettlement = React.useMemo(() => {
    const openRows = settlementPreviewRows
      .filter((item: any) => Number(item?.phoneSettlementBalance || 0) > 0)
      .sort((a: any, b: any) => Number(b?.phoneSettlementBalance || 0) - Number(a?.phoneSettlementBalance || 0));
    return openRows[0] || null;
  }, [settlementPreviewRows]);
  const openSoldPhoneSettlementRows = React.useMemo(
    () => buildSettlementRowsInDirectoryOrder(fullPhoneSettlementDirectory?.items ?? [])
      .filter((item: any) => Number(item?.phoneSettlementBalance || 0) > 0),
    [fullPhoneSettlementDirectory?.items]
  );
  const fullSettlementOpenBalanceTotal = Number(settlementSummary?.openBalanceTotal || 0);
  const fullSettlementOpenBasisTotal = Number(settlementSummary?.openBasisTotal || 0);
  const fullSettlementOpenPaidTotal = Number(settlementSummary?.openPaidTotal || 0);
  const getPhoneSaleNavigation = React.useCallback((item: any) => {
    const sourceType = String(item?.saleSourceType || item?.settlementPriceSource || '').trim();
    const sourceId = Number(item?.saleSourceId || 0);
    if (!sourceId || !['installment_sale', 'sales_order', 'legacy_sale'].includes(sourceType)) return null;
    return buildFinancialSourceTarget({ kind: sourceType as 'installment_sale' | 'sales_order' | 'legacy_sale', id: sourceId });
  }, []);
  const renderPhoneSaleSourceLink = React.useCallback((item: any, sourceLabel: string, compact = false) => {
    const target = getPhoneSaleNavigation(item);
    const customerName = String(item?.saleCustomerName || '').trim();
    const customerPhone = String(item?.saleCustomerPhone || '').trim();
    const customerText = customerName
      ? `مشتری: ${customerName}${customerPhone ? ` · ${customerPhone}` : ''}`
      : 'مشتری ثبت نشده';
    const baseClass = compact
      ? 'inline-flex max-w-full items-center gap-1.5 text-xs font-black leading-5 text-blue-700 underline-offset-4 transition hover:underline dark:text-blue-300'
      : 'inline-flex max-w-full items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] font-black text-blue-700 shadow-sm transition hover:bg-blue-100 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200 dark:hover:bg-blue-900/40';
    if (!target) {
      return (
        <span className={compact
          ? 'inline-flex max-w-full items-center gap-1.5 text-xs font-extrabold leading-5 text-slate-600 dark:text-slate-300'
          : 'inline-flex max-w-full items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-extrabold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'}
          title={customerText}
        >
          <i className="fa-solid fa-file-invoice text-slate-400" />
          <span className={compact ? 'break-words text-right' : 'truncate'}>{sourceLabel}</span>
          {customerName && <span className="hidden truncate text-slate-400 lg:inline">· {customerName}</span>}
        </span>
      );
    }
    return (
      <button
        type="button"
        onClick={() => navigate(target.path)}
        className={baseClass}
        title={`${target.label} — ${customerText}`}
      >
        <i className={target.icon} />
        <span className={compact ? 'break-words text-right' : 'truncate'}>{sourceLabel}</span>
        {customerName && <span className="hidden truncate text-blue-500/80 lg:inline">· {customerName}</span>}
        <i className="fa-solid fa-arrow-up-right-from-square text-[9px] opacity-70" />
      </button>
    );
  }, [getPhoneSaleNavigation, navigate]);
  const bulkSettlementIdSet = React.useMemo(() => new Set(bulkSettlementPhoneIds.map((phoneId) => Number(phoneId)).filter(Boolean)), [bulkSettlementPhoneIds]);
  const selectedBulkSettlementRows = React.useMemo(() => {
    const selected = Array.from(bulkSettlementIdSet).map((phoneId) => bulkSettlementRowCache[Number(phoneId)]).filter(Boolean);
    return selected.sort((a: any, b: any) => {
      if (bulkSettlementPriority === 'oldest_sale') {
        return String(a?.soldAt || a?.purchaseDate || '').localeCompare(String(b?.soldAt || b?.purchaseDate || '')) || Number(a?.id || 0) - Number(b?.id || 0);
      }
      if (bulkSettlementPriority === 'lowest_balance') {
        return Number(a?.phoneSettlementBalance || 0) - Number(b?.phoneSettlementBalance || 0);
      }
      return Number(b?.phoneSettlementBalance || 0) - Number(a?.phoneSettlementBalance || 0);
    });
  }, [bulkSettlementIdSet, bulkSettlementRowCache, bulkSettlementPriority]);
  const selectedBulkSettlementBalanceTotal = selectedBulkSettlementRows.reduce((sum: number, item: any) => sum + Number(item?.phoneSettlementBalance || 0), 0);
  const bulkSettlementAmountValue = num(bulkSettlementAmount);
  const bulkSettlementDistribution = React.useMemo(() => {
    let remaining = Math.max(0, num(bulkSettlementAmount));
    const entries: Array<{ item: any; amount: number }> = [];
    selectedBulkSettlementRows.forEach((item: any) => {
      const balance = Math.max(0, Number(item?.phoneSettlementBalance || 0));
      if (remaining <= 0 || balance <= 0) return;
      const amount = Math.min(balance, remaining);
      if (amount > 0) entries.push({ item, amount });
      remaining -= amount;
    });
    return entries;
  }, [selectedBulkSettlementRows, bulkSettlementAmount]);
  const bulkSettlementAppliedTotal = bulkSettlementDistribution.reduce((sum: number, entry: any) => sum + Number(entry.amount || 0), 0);
  const bulkSettlementUnallocatedAmount = Math.max(0, bulkSettlementAmountValue - bulkSettlementAppliedTotal);
  const ledgerSettlementBatchOptions = React.useMemo(() =>
    Array.isArray(ledgerDirectory?.settlementBatchOptions) ? ledgerDirectory.settlementBatchOptions : [],
    [ledgerDirectory?.settlementBatchOptions]
  );
  useEffect(() => {
    if (!activeLedgerBatchId || ledgerLoading || !ledgerDirectory?.metaIncluded) return;
    if (!ledgerSettlementBatchOptions.some((item: any) => item.id === activeLedgerBatchId)) {
      setActiveLedgerBatchId('');
    }
  }, [activeLedgerBatchId, ledgerSettlementBatchOptions, ledgerLoading, ledgerDirectory?.metaIncluded, setActiveLedgerBatchId]);
  const filteredLedgerEntries = React.useMemo(() => ledger, [ledger]);
  const groupedLedgerEntries = React.useMemo(() => {
    const groups = new Map<string, { systemId: string; entries: any[]; latestSortKey: string }>();
    filteredLedgerEntries.forEach((entry) => {
      const systemId = getLedgerSystemId(entry);
      const current = groups.get(systemId) || { systemId, entries: [], latestSortKey: '' };
      current.entries.push(entry);
      const sortKey = String(entry.transactionDate || entry.createdAt || entry.updatedAt || '');
      if (sortKey > current.latestSortKey) current.latestSortKey = sortKey;
      groups.set(systemId, current);
    });
    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        entries: group.entries.sort((a, b) =>
          String(b.transactionDate || b.createdAt || b.updatedAt || '').localeCompare(String(a.transactionDate || a.createdAt || a.updatedAt || '')) ||
          Number(b.id || 0) - Number(a.id || 0)
        ),
      }))
      .sort((a, b) => String(b.latestSortKey || '').localeCompare(String(a.latestSortKey || '')));
  }, [filteredLedgerEntries]);
  const activeBatchSummary = activeLedgerBatchId ? ledgerSettlementBatchOptions.find((item: any) => item.id === activeLedgerBatchId) : null;
  const batchScopedLedgerEntries = activeLedgerBatchId ? filteredLedgerEntries : [];
  const activeBatchLedgerMetrics = React.useMemo(() => {
    if (!activeLedgerBatchId) return null;
    const filteredSummary = ledgerDirectory?.filteredSummary || {};
    return {
      count: Number(ledgerDirectory?.total || 0),
      totalDebit: Number(filteredSummary.totalDebit || 0),
      totalCredit: Number(filteredSummary.totalCredit || 0),
      latestBalance: Number(filteredSummary.latestBalance || 0),
      latestDate: batchScopedLedgerEntries[0] ? formatIsoToShamsi(batchScopedLedgerEntries[0].transactionDate || batchScopedLedgerEntries[0].createdAt || '') : '—',
    };
  }, [activeLedgerBatchId, ledgerDirectory?.filteredSummary, ledgerDirectory?.total, batchScopedLedgerEntries]);
  const ledgerHasActiveFilters = Boolean(
    ledgerSearch.trim() ||
    ledgerRange !== 'all' ||
    ledgerViewFilter !== 'all' ||
    ledgerSystemFilter !== 'all' ||
    activeLedgerBatchId ||
    ledgerDisplayMode !== 'table'
  );
  const resetLedgerFilters = React.useCallback(() => {
    setLedgerSearch('');
    setLedgerRange('all');
    setLedgerViewFilter('all');
    setLedgerSystemFilter('all');
    setActiveLedgerBatchId('');
    setLedgerDisplayMode('table');
  }, []);
  const ledgerEmptyState = React.useMemo(() => {
    if (Number(ledgerDirectory?.summary?.total || 0) === 0) {
      return {
        title: 'هنوز هیچ تراکنشی برای این همکار ثبت نشده است',
        description: 'پس از ثبت اولین دریافت یا پرداخت، تاریخچه مالی این بخش به‌صورت کامل نمایش داده می‌شود.',
        icon: 'fa-receipt',
        actionLabel: 'ثبت اولین تراکنش',
        action: openLedgerModal,
      };
    }
    return {
      title: 'نتیجه‌ای با فیلترهای فعلی پیدا نشد',
      description: 'فیلترها یا متن جستجو را تغییر دهید تا دوباره تراکنش‌های مرتبط نمایش داده شوند.',
      icon: 'fa-filter-circle-xmark',
      actionLabel: 'حذف فیلترها',
      action: resetLedgerFilters,
    };
  }, [ledgerDirectory?.summary?.total, resetLedgerFilters]);
  const fetchAllPartnerLedgerChunks = React.useCallback(async (batchOverride?: string) => {
    if (!id || !token) return [] as PartnerLedgerEntry[];
    const chunkSize = 100;
    const rows: PartnerLedgerEntry[] = [];
    let pageNo = 1;
    let totalPages = 1;
    do {
      const params = new URLSearchParams({
        page: String(pageNo),
        pageSize: String(chunkSize),
        search: debouncedLedgerSearch,
        direction: ledgerViewFilter,
        range: ledgerRange,
        systemId: ledgerSystemFilter,
        settlementBatchId: batchOverride ?? activeLedgerBatchId,
        includeMeta: '0',
        includeRelated: '0',
      });
      const response = await apiFetch(`/api/partners/${id}/ledger?${params.toString()}`);
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'خطا در دریافت کامل دفتر همکار');
      const chunk = Array.isArray(result.data?.items) ? result.data.items : [];
      rows.push(...chunk);
      totalPages = Math.max(1, Number(result.data?.totalPages || 1));
      pageNo += 1;
    } while (pageNo <= totalPages);
    return rows;
  }, [id, token, debouncedLedgerSearch, ledgerViewFilter, ledgerRange, ledgerSystemFilter, activeLedgerBatchId]);

  const handleExportActiveBatchCsv = async () => {
    if (!activeLedgerBatchId || Number(activeBatchLedgerMetrics?.count || 0) === 0) {
      setNotification({ type: 'error', text: 'برای خروجی Excel ابتدا یک دسته تسویه را انتخاب کن.' });
      return;
    }
    let fullBatchRows: PartnerLedgerEntry[] = [];
    try {
      fullBatchRows = await fetchAllPartnerLedgerChunks(activeLedgerBatchId);
    } catch (error: any) {
      setNotification({ type: 'error', text: humanizeErrorMessage(error.message, { endpoint: `/api/partners/${id}/ledger`, action: 'دریافت کامل دسته تسویه' }) });
      return;
    }
    const rows = fullBatchRows.map((entry) => ({
      batchId: extractSettlementBatchId(entry),
      createdAt: ledgerRecordedAt(entry),
      transactionDate: formatLedgerTransactionDate(entry.transactionDate),
      description: String(entry.description || '').replace(/\s+/g, ' ').trim(),
      debit: Number(entry.debit || 0),
      credit: Number(entry.credit || 0),
      balance: Number(entry.balance || 0),
      referenceType: entry.referenceType || '',
      referenceId: entry.referenceId || '',
    }));
    const header = ['شناسه دسته', 'تاریخ ثبت', 'تاریخ تراکنش', 'شرح', 'بدهکار', 'بستانکار', 'مانده', 'نوع مرجع', 'شناسه مرجع'];
    const body = rows.map((row) => [row.batchId, row.createdAt, row.transactionDate, row.description, row.debit, row.credit, row.balance, row.referenceType, row.referenceId].map(csvEscape).join(','));
    const csv = '\ufeff' + [header.map(csvEscape).join(','), ...body].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `partner-settlement-${activeLedgerBatchId}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };
  const handlePrintActiveBatch = async () => {
    if (!activeLedgerBatchId || Number(activeBatchLedgerMetrics?.count || 0) === 0) {
      setNotification({ type: 'error', text: 'برای چاپ ابتدا یک دسته تسویه را انتخاب کن.' });
      return;
    }
    let fullBatchRows: PartnerLedgerEntry[] = [];
    try {
      fullBatchRows = await fetchAllPartnerLedgerChunks(activeLedgerBatchId);
    } catch (error: any) {
      setNotification({ type: 'error', text: humanizeErrorMessage(error.message, { endpoint: `/api/partners/${id}/ledger`, action: 'دریافت کامل دفتر برای چاپ' }) });
      return;
    }
    const totalDebit = fullBatchRows.reduce((sum, entry) => sum + Number(entry.debit || 0), 0);
    const totalCredit = fullBatchRows.reduce((sum, entry) => sum + Number(entry.credit || 0), 0);
    const rowsHtml = fullBatchRows.map((entry) => `
      <tr>
        <td>${formatLedgerTransactionDate(entry.transactionDate)}</td>
        <td>${String(entry.description || '').replace(/[<>]/g, '')}</td>
        <td>${Number(entry.debit || 0).toLocaleString('fa-IR')}</td>
        <td>${Number(entry.credit || 0).toLocaleString('fa-IR')}</td>
        <td>${Number(entry.balance || 0).toLocaleString('fa-IR')}</td>
      </tr>`).join('');
    const popup = window.open('', '_blank', 'width=980,height=720');
    if (!popup) {
      setNotification({ type: 'error', text: 'پنجره چاپ باز نشد. popup مرورگر را برای این برنامه فعال کن.' });
      return;
    }
    popup.document.write(`<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8" />
      <title>چاپ دسته تسویه ${activeLedgerBatchId}</title>
      <style>
        body{font-family:Vazir,Tahoma,Arial,sans-serif;margin:28px;color:#0f172a;background:#fff;direction:rtl}
        .head{display:flex;justify-content:space-between;gap:16px;border-bottom:1px solid #e2e8f0;padding-bottom:16px;margin-bottom:18px}
        h1{font-size:18px;margin:0 0 8px;font-weight:900}.muted{color:#64748b;font-size:12px}.pill{border:1px solid #cbd5e1;border-radius:999px;padding:6px 10px;font-size:11px;font-weight:800;direction:ltr}
        .summary{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:14px 0}.card{border:1px solid #e2e8f0;border-radius:16px;padding:12px}.card b{display:block;margin-top:6px;font-size:15px}
        table{width:100%;border-collapse:collapse;margin-top:16px;font-size:12px}th,td{border-bottom:1px solid #e2e8f0;padding:10px;text-align:right;vertical-align:top}th{background:#f8fafc;font-weight:900;color:#475569}.ltr{direction:ltr;text-align:left}
        @media print{body{margin:14mm}.no-print{display:none}}
      </style></head><body>
      <div class="head"><div><h1>گزارش دسته تسویه همکار</h1><div class="muted">${(profile as any)?.fullName || (profile as any)?.shopName || profile?.partnerName || 'همکار'} · ${new Date().toLocaleDateString('fa-IR')}</div></div><div class="pill">${activeLedgerBatchId}</div></div>
      <div class="summary"><div class="card">تعداد رکورد<b>${fullBatchRows.length.toLocaleString('fa-IR')}</b></div><div class="card">جمع پرداخت<b>${totalDebit.toLocaleString('fa-IR')} تومان</b></div><div class="card">جمع بستانکاری<b>${totalCredit.toLocaleString('fa-IR')} تومان</b></div></div>
      <table><thead><tr><th>تاریخ</th><th>شرح</th><th>بدهکار</th><th>بستانکار</th><th>مانده</th></tr></thead><tbody>${rowsHtml}</tbody></table>
      <script>window.onload=()=>{window.print();}</script></body></html>`);
    popup.document.close();
  };
  if (isLoading) return (
    <div className="detail-card partner-ledger-loading-shell" dir="rtl">
      <div className="partner-ledger-loading-shell__header">
        <div className="partner-ledger-loading-shell__title">
          <span className="partner-ledger-skeleton partner-ledger-skeleton--icon" />
          <div className="partner-ledger-loading-shell__title-copy">
            <span className="partner-ledger-skeleton partner-ledger-skeleton--line lg" />
            <span className="partner-ledger-skeleton partner-ledger-skeleton--line sm" />
          </div>
        </div>
        <span className="partner-ledger-skeleton partner-ledger-skeleton--button" />
      </div>
      <div className="partner-ledger-loading-shell__stats">
        {[0, 1, 2].map((item) => (
          <div key={item} className="partner-ledger-loading-shell__stat">
            <span className="partner-ledger-skeleton partner-ledger-skeleton--badge" />
            <span className="partner-ledger-skeleton partner-ledger-skeleton--line md" />
            <span className="partner-ledger-skeleton partner-ledger-skeleton--line xs" />
          </div>
        ))}
      </div>
      <div className="partner-ledger-loading-shell__panel">
        <div className="partner-ledger-loading-shell__toolbar">
          <span className="partner-ledger-skeleton partner-ledger-skeleton--input" />
          <span className="partner-ledger-skeleton partner-ledger-skeleton--input short" />
        </div>
        <div className="partner-ledger-loading-shell__rows">
          {[0, 1, 2].map((item) => (
            <div key={item} className="partner-ledger-loading-shell__row">
              <span className="partner-ledger-skeleton partner-ledger-skeleton--line md" />
              <span className="partner-ledger-skeleton partner-ledger-skeleton--line lg" />
              <span className="partner-ledger-skeleton partner-ledger-skeleton--line sm" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
  if (!partnerData || !profile) return (<div className="p-10 text-center text-red-500"><i className="fas fa-exclamation-circle text-3xl mb-3"></i><p>اطلاعات همکار یافت نشد یا خطایی در عملیات رخ داده است.</p></div>);
  const getLedgerEntryKind = (entry: any): 'debit' | 'credit' | 'balanced' => {
    const debit = Number(entry?.debit || 0);
    const credit = Number(entry?.credit || 0);
    if (credit > 0 && credit >= debit) return 'credit';
    if (debit > 0) return 'debit';
    return 'balanced';
  };
  const ledgerTypeBadge = (entry: any) => {
    const kind = getLedgerEntryKind(entry);
    if (kind === 'credit') return <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200"><i className="fa-solid fa-arrow-down text-[10px]" /> بستانکار</span>;
    if (kind === 'debit') return <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200"><i className="fa-solid fa-arrow-up text-[10px]" /> بدهکار</span>;
    return <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"><i className="fa-solid fa-scale-balanced text-[10px]" /> متعادل</span>;
  };
  const parsePartnerLedgerMeta = (description?: string) => {
  const raw = String(description || '').trim();
  const imei = (
    raw.match(/IMEI[:：]\s*([^,)\-\n•]+)/i)?.[1] || ''
  ).trim();
  const identifier = (
    raw.match(/شناسه(?:\s*گوشی)?[:：]\s*([^,)\-\n•]+)/i)?.[1] || ''
  ).trim();
  const amountText = (
    raw.match(/به\s*ارزش\s*([\d٬,۰-۹٠-٩]+)\s*تومان/i)?.[1] ||
    raw.match(/ارزش\s*([\d٬,۰-۹٠-٩]+)\s*تومان/i)?.[1] ||
    ''
  ).trim();
  const saleId = (
    raw.match(/شناسه\s*فروش[:：]\s*(\d+)/i)?.[1] || ''
  ).trim();
  const shortSource = raw.split(/[\n\r]/)[0] || raw;
  const summary = shortSource
    .replace(/\(\s*شناسه\s*فروش:\s*\d+\s*\)/gi, '')
    .replace(/\(.*?\)/g, '')
    // حذف کامل IMEI
    .replace(/IMEI[:：]\s*[^•,\n]+/gi, '')
    // حذف کامل شناسه گوشی
    .replace(/شناسه(?:\s*گوشی)?[:：]\s*[^•,\n]+/gi, '')
    // حذف مقدارهای "به ارزش ..."
    .replace(/\s*به\s*ارزش\s*[\d٬,۰-۹٠-٩]+\s*(?:تومان)?/gi, '')
    // حذف bullet اضافی
    .replace(/\s*•\s*/g, ' ')
    // حذف dash انتهایی
    .replace(/[-–—]\s*$/g, '')
    // normalize spacing
    .replace(/\s{2,}/g, ' ')
    .trim();
  return {
    raw,
    summary: summary || '—',
    imei,
    identifier,
    saleId,
    amountText,
  };
};
  const parseLedgerChangeHistory = (value?: string | null) => {
    if (!value) return [] as Array<any>;
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [] as Array<any>;
    }
  };
  function ledgerRecordedAt(entry: PartnerLedgerEntry) { return formatIsoToShamsiDateTime(entry.createdAt || entry.updatedAt || entry.transactionDate, 'jYYYY/jMM/jDD HH:mm'); }
  const ledgerDetailLines = (entry: PartnerLedgerEntry, meta: ReturnType<typeof parsePartnerLedgerMeta>) => [
    `شرح: ${meta.summary}`,
    meta.imei ? `IMEI: ${meta.imei}` : '',
    meta.saleId ? `شناسه فروش: ${meta.saleId}` : '',
    extractSettlementBatchId(entry) ? `شناسه دسته تسویه: ${extractSettlementBatchId(entry)}` : '',
    `شناسه سیستم: ${getLedgerSystemId(entry)}`,
    `تاریخ ثبت: ${ledgerRecordedAt(entry)}`,
    `تاریخ تراکنش: ${formatLedgerTransactionDate(entry.transactionDate)}`,
    `بدهکار: ${formatCurrencyText(entry.debit, readStoredCurrencyUnit())}`,
    `بستانکار: ${formatCurrencyText(entry.credit, readStoredCurrencyUnit())}`,
    `مانده: ${entry.balance.toLocaleString('fa-IR')} تومان`,
  ].filter(Boolean) as string[];
  const renderLedgerTransactionCard = (entry: PartnerLedgerEntry, relatedPurchase: any, groupSystemId: string, index: number, total: number) => {
    const meta = parsePartnerLedgerMeta(entry.description);
    const recordedAt = ledgerRecordedAt(entry);
    const expanded = expandedLedgerEntryId === entry.id;
    const batchId = extractSettlementBatchId(entry);
    const details = ledgerDetailLines(entry, meta);
    return (
      <article
        key={entry.id}
        className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-950/60 ${
          expanded ? 'ring-1 ring-violet-200 dark:ring-violet-900/40' : ''
        }`}
      >
        <div className="flex flex-col gap-3 border-b border-slate-100 p-3 dark:border-slate-800 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 justify-end justify-end">
              <div className="partner-system-id-block partner-system-id-block--right flex max-w-[148px] flex-col items-end gap-1 rounded-xl border border-violet-200 bg-violet-50 px-2.5 py-1.5 text-right text-violet-700 dark:border-violet-900/40 dark:bg-violet-950/30 dark:text-violet-200">
                <span className="text-[10px] font-black tracking-[0.14em] opacity-80">شناسه سیستم</span>
                <span
                  className="partner-system-id-value block w-full text-right font-mono text-xs font-black leading-none tracking-[0.02em]"
                  dir="ltr"
                >
                  {groupSystemId}
                </span>
              </div>
              {ledgerTypeBadge(entry)}
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                <i className={`fa-solid ${getLedgerSystemKind(entry) === 'phone' ? 'fa-mobile-screen' : getLedgerSystemKind(entry) === 'product' ? 'fa-box' : 'fa-circle-question'}`} />
                {getLedgerSystemKind(entry) === 'phone' ? 'گوشی' : getLedgerSystemKind(entry) === 'product' ? 'محصول' : 'دیگر'}
              </span>
            </div>
            <div className="mt-2 text-sm font-black leading-6 text-slate-900 dark:text-slate-50">{meta.summary}</div>
            <div className="mt-2 flex flex-wrap items-center gap-2 justify-end text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-900">
                <i className="fa-regular fa-calendar" />
                ثبت: {recordedAt}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1.5 dark:border-cyan-900/30 dark:bg-cyan-950/20">
                <i className="fa-regular fa-clock" />
                تراکنش: {formatLedgerTransactionDate(entry.transactionDate)}
              </span>
              {batchId ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 dark:border-blue-900/30 dark:bg-blue-950/20">
                  <i className="fa-solid fa-link" />
                  دسته: <span className="font-mono ltr-inline" dir="ltr">{batchId}</span>
                </span>
              ) : null}
            </div>
          </div>
          <div className="partner-ledger-card-actions flex flex-wrap items-center gap-2 justify-end self-start">
            <button
              type="button"
              onClick={() => setEditingEntry(entry)}
              className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 text-[11px] font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              title="ویرایش تراکنش"
            >
              <i className="fa-solid fa-pen-to-square" />
              ویرایش
            </button>
            <button
              type="button"
              onClick={() => handleLedgerDelete(entry.id)}
              disabled={isDeletingEntry}
              className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-2.5 text-[11px] font-bold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-200 dark:hover:bg-rose-950/40"
              title="حذف تراکنش"
            >
              <i className="fa-solid fa-trash-can" />
              حذف
            </button>
            <button
              type="button"
              onClick={() => setExpandedLedgerEntryId((prev) => (prev === entry.id ? null : entry.id))}
              className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-2.5 text-[11px] font-bold text-violet-700 transition hover:bg-violet-100 dark:border-violet-900/40 dark:bg-violet-950/20 dark:text-violet-200 dark:hover:bg-violet-950/40"
              title="نمایش جزئیات درون کارت"
            >
              <i className={`fa-solid ${expanded ? 'fa-chevron-up' : 'fa-chevron-down'}`} />
              {expanded ? 'بستن' : 'باز کردن'}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-3">
          <div className="min-w-0 rounded-xl border border-rose-100 bg-rose-50/80 p-2.5 dark:border-rose-900/30 dark:bg-rose-950/20">
            <div className="text-[11px] font-bold text-rose-700 dark:text-rose-300">بدهکار</div>
            <div className="mt-1 text-sm font-black text-rose-700 dark:text-rose-200">{formatCurrencyText(entry.debit, readStoredCurrencyUnit())}</div>
          </div>
          <div className="min-w-0 rounded-xl border border-emerald-100 bg-emerald-50/80 p-2.5 dark:border-emerald-900/30 dark:bg-emerald-950/20">
            <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">بستانکار</div>
            <div className="mt-1 text-sm font-black text-emerald-700 dark:text-emerald-200">{formatCurrencyText(entry.credit, readStoredCurrencyUnit())}</div>
          </div>
          <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50/80 p-2.5 dark:border-slate-800 dark:bg-slate-900/50">
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">مانده</div>
            <div className="mt-1 text-sm font-black text-slate-900 dark:text-slate-50">{formatPartnerLedgerCurrency(entry.balance, 'balance')}</div>
          </div>
        </div>
        {expanded ? <div className="grid grid-cols-1 gap-3 border-t border-slate-100 p-3 dark:border-slate-800 lg:grid-cols-[1fr_0.9fr]">
          <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/40">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-[10px] font-black tracking-[0.16em] text-slate-400 dark:text-slate-500">LEDGER METADATA</div>
                <div className="mt-1 text-sm font-black text-slate-900 dark:text-slate-50">شناسه، مرجع و زمان‌های ثبت</div>
              </div>
              <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                {index + 1} / {total.toLocaleString('fa-IR')}
              </span>
            </div>
            <div className="mt-3 space-y-2 text-xs leading-6 text-slate-600 dark:text-slate-300">
              {details.map((line) => (
                <div key={line} className="rounded-2xl border border-white bg-white px-3 py-2 shadow-[0_10px_24px_-22px_rgba(15,23,42,0.18)] dark:border-slate-800 dark:bg-slate-900/70">
                  {line}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[22px] border border-fuchsia-100 bg-fuchsia-50/50 p-4 dark:border-fuchsia-900/30 dark:bg-fuchsia-950/10">
            {relatedPurchase?.history?.length ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-[10px] font-black tracking-[0.16em] text-fuchsia-700 dark:text-fuchsia-200">HISTORY</div>
                    <div className="mt-1 text-sm font-black text-slate-900 dark:text-slate-50">تاریخچه همین شناسه</div>
                  </div>
                  <div className="rounded-full border border-fuchsia-200 bg-white px-2.5 py-1 text-[10px] font-bold text-fuchsia-700 dark:border-fuchsia-900/40 dark:bg-slate-950 dark:text-fuchsia-200">
                    {relatedPurchase.history.length.toLocaleString('fa-IR')} تغییر
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  {relatedPurchase.history.slice().reverse().slice(0, expanded ? 8 : 3).map((h: any, idx: number) => (
                    <div key={`${groupSystemId}-hist-${idx}`} className="rounded-2xl border border-slate-200 bg-white p-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-black text-slate-900 dark:text-slate-100">{h.title || 'رویداد ثبت‌شده'}</span>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">{formatIsoToShamsiDateTime(h.changedAt, 'jYYYY/jMM/jDD HH:mm')}</span>
                      </div>
                      {h.description ? <div className="mt-1 leading-6">{String(h.description)}</div> : null}
                      {h.newPurchasePrice != null ? <div className="mt-1 leading-6">قیمت خرید: <span className="font-black text-slate-900 dark:text-slate-100">{formatCurrencyText(Number(h.newPurchasePrice || 0), readStoredCurrencyUnit())}</span></div> : null}
                      {h.note ? <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{h.note}</div> : null}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex h-full min-h-[220px] flex-col items-start justify-between gap-4 rounded-[22px] border border-dashed border-fuchsia-200 bg-white/80 p-4 dark:border-fuchsia-900/30 dark:bg-slate-950/30">
                <div>
                  <div className="text-[10px] font-black tracking-[0.16em] text-fuchsia-700 dark:text-fuchsia-200">HISTORY</div>
                  <div className="mt-1 text-sm font-black text-slate-900 dark:text-slate-50">تاریخچه مرتبط ثبت نشده</div>
                  <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">این کارت نشان می‌دهد که تراکنش فعلی از چه دارایی‌ای آمده و تغییرات آن دارایی چه بوده است.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setExpandedLedgerEntryId(entry.id)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-fuchsia-200 bg-fuchsia-50 px-3 py-2 text-xs font-bold text-fuchsia-700 transition hover:bg-fuchsia-100 dark:border-fuchsia-900/40 dark:bg-fuchsia-950/20 dark:text-fuchsia-200"
                >
                  <i className="fa-solid fa-eye" />
                  باز کردن جزئیات
                </button>
              </div>
            )}
          </div>
        </div> : null}
      </article>
    );
  };
  const partnerTypeLabel = PARTNER_TYPES.find((p) => p.value === profile.partnerType)?.label || profile.partnerType;
  const {
    openTelegramReport,
    openTel,
    openWhatsApp,
    openPartnerTelegram,
    openPartnerPayment,
    scrollToLedger,
    scrollToHistory,
    printProfile,
    partnerTelegramChatId,
    partnerTelegramLinked,
    partnerTelegramLinkedAt,
    resolvePartnerTelegramText,
    applyPartnerTgPreset,
    sendPartnerTelegramQuickReply,
  } = usePartnerDetailCommunicationActions({
    token,
    profile,
    ledger,
    partnerTgQuickReply,
    setNotification,
    setPrefillChannels,
    setPrefillMessageText,
    setIsMessageModalOpen,
    openLedgerModal,
    setPartnerTgPreset,
    setPartnerTgQuickReply,
    setPartnerTgConvLoading,
    fetchPartnerTelegramConversation,
  });
  const quickActions = [
    { key: 'call', label: 'تماس', sub: 'شماره همکار', icon: 'fa-solid fa-phone', onClick: openTel, tone: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
    { key: 'whatsapp', label: 'واتساپ', sub: 'ارتباط سریع', icon: 'fa-brands fa-whatsapp', onClick: openWhatsApp, tone: 'text-sky-700 bg-sky-50 border-sky-100' },
    { key: 'telegram', label: 'تلگرام / پیام', sub: 'پنل ارتباطی', icon: 'fa-brands fa-telegram', onClick: openPartnerTelegram, tone: 'text-indigo-700 bg-indigo-50 border-indigo-100' },
    { key: 'payment', label: 'ثبت اطلاعات پرداخت', sub: 'دفتر همکار', icon: 'fa-solid fa-money-bill-wave', onClick: openPartnerPayment, tone: 'text-amber-700 bg-amber-50 border-amber-100' },
    { key: 'history', label: 'مشاهده سوابق', sub: 'خریدها و دفتر', icon: 'fa-solid fa-clock-rotate-left', onClick: scrollToHistory, tone: 'text-slate-700 bg-slate-50 border-slate-200' },
    { key: 'print', label: 'چاپ / PDF', sub: 'خروجی پرونده', icon: 'fa-solid fa-print', onClick: printProfile, tone: 'text-slate-700 bg-white border-slate-200 dark:text-slate-200 dark:bg-slate-900/80 dark:border-slate-700' },
  ];
  const cleanSettlementPaymentDescription = (description?: string) => {
    const firstMeaningfulLine = String(description || '')
      .split(/[\r\n]+/)
      .map((line) => line.trim())
      .filter((line) => line && !/^گوشی[:：]/.test(line))[0];
    return firstMeaningfulLine || 'سرمایه بازگشتی ثبت‌شده همین گوشی';
  };
  const renderPhonePriceHistory = (item: any) => {
    const initialPrice = Number(item?.initialPurchasePrice || item?.purchasePrice || 0);
    const saleBasisPrice = Number(item?.settlementPurchasePrice || item?.saleTotalPrice || item?.saleUnitPrice || item?.currentPurchasePrice || initialPrice);
    const currentPrice = Number(item?.currentPurchasePrice || item?.purchasePrice || 0);
    const lastUpdate = item?.currentPurchasePriceUpdatedAt ? formatIsoToShamsi(item.currentPurchasePriceUpdatedAt) : 'ثبت نشده';
    const changeDelta = saleBasisPrice - initialPrice;
    const hasDifference = initialPrice !== saleBasisPrice || currentPrice !== initialPrice;

    return (
      <div className="mt-3 rounded-[20px] border border-slate-200/80 bg-slate-50/80 p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/45">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-black tracking-[0.14em] text-slate-400 dark:text-slate-500">PRICE TRAIL</div>
            <div className="mt-1 text-[12px] font-black text-slate-900 dark:text-slate-50">مسیر تغییر قیمت همین گوشی</div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            <i className="fa-solid fa-bolt text-amber-500" /> مبنای حساب: قیمت زمان فروش
          </span>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {[
            { label: 'قیمت اولیه', value: formatPrice(initialPrice), icon: 'fa-solid fa-tag' },
            { label: 'قیمت زمان فروش', value: formatPrice(saleBasisPrice), icon: 'fa-solid fa-calendar-check' },
            { label: 'آخرین قیمت ثبت‌شده', value: formatPrice(currentPrice), icon: 'fa-solid fa-pen-to-square' },
          ].map((chip) => (
            <div key={chip.label} className="flex items-center justify-between gap-2 rounded-[16px] border border-white/70 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900/70">
              <div>
                <div className="text-[10px] font-black text-slate-400 dark:text-slate-500">{chip.label}</div>
                <div className="mt-1 text-[12px] font-black text-slate-950 dark:text-slate-50">{chip.value}</div>
              </div>
              <IconGlyph tone="neutral" className="h-9 w-9" aria-hidden="true"><i className={chip.icon} /></IconGlyph>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 justify-end text-[10px] font-semibold text-slate-500 dark:text-slate-400">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${changeDelta >= 0 ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-200' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200'}`}>
            <i className={`fa-solid ${changeDelta >= 0 ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'}`} />
            {changeDelta >= 0 ? '+' : '-'}{formatCurrencyText(Math.abs(changeDelta), readStoredCurrencyUnit())}
          </span>
          <span>آخرین به‌روزرسانی قیمت: {lastUpdate}</span>
          {hasDifference ? <span>قیمت ثبت‌شده با قیمت مبنای فروش تفاوت دارد.</span> : <span>قیمت مبنا و قیمت ثبت‌شده هم‌خوان هستند.</span>}
        </div>
      </div>
    );
  };

  const renderPhoneSettlementTimeline = (item: any, compact = false) => {
    const phoneId = Number(item?.id || 0);
    const timeline = phoneSettlementTimelineCache[phoneId] || {};
    const payments: PartnerLedgerEntry[] = Array.isArray(timeline.payments) ? timeline.payments : [];
    const summary = timeline.summary || null;
    const basis = Number(summary?.settlementPurchasePrice ?? item?.settlementPurchasePrice ?? 0);
    const manualPaidTotal = Number(summary?.manualSettlementPaidAmount ?? item?.phoneSettlementManualPaidAmount ?? 0);
    const autoPaidTotal = Number(summary?.autoRecognizedPaidAmount ?? item?.phoneSettlementAutoPaidAmount ?? 0);
    const paidTotal = Number(summary?.phoneSettlementPaidAmount ?? item?.phoneSettlementPaidAmount ?? Math.max(manualPaidTotal, autoPaidTotal));
    const balance = Number(summary?.phoneSettlementBalance ?? item?.phoneSettlementBalance ?? Math.max(0, basis - paidTotal));
    const progressPercent = basis > 0 ? Math.min(100, Math.round((paidTotal / basis) * 100)) : 0;
    const phoneTitle = item?.name || 'گوشی فروخته‌شده';
    const phoneIdentifier = item?.identifier || 'IMEI ثبت نشده';
    const totalPayments = Number(timeline.total ?? item?.phoneSettlementPaymentCount ?? 0);
    const totalPages = Math.max(1, Number(timeline.totalPages || 1));
    const currentPage = Math.max(1, Number(timeline.page || 1));
    const isInitialLoading = Boolean(timeline.loading && !summary);
    const hasMore = currentPage < totalPages;
    const isInstallmentSale = Number(summary?.isInstallmentSale ?? (item?.phoneSettlementManagedBySale && item?.saleSourceType === 'installment_sale' ? 1 : 0)) === 1;
    const installmentCollectedAmount = Number(summary?.installmentCollectedAmount ?? item?.installmentCollectedAmount ?? 0);
    const timelineItem = summary ? { ...item, ...summary } : item;
    const managementLabel = isInstallmentSale
      ? 'وصول سرمایه از پرونده اقساط محاسبه می‌شود'
      : autoPaidTotal > 0
        ? 'فروش نقدی؛ بازگشت سرمایه به‌صورت خودکار شناسایی شده'
        : totalPayments > 0
          ? `${totalPayments.toLocaleString('fa-IR')} پرداخت مستقیم ثبت‌شده`
          : 'بدون پرداخت مستقیم ثبت‌شده';
    const retryPage = Math.max(1, Number(timeline.failedPage || 1));

    return (
      <FinancialTimeline
        title={phoneTitle}
        subtitle={
          <span className="inline-flex min-w-0 flex-wrap items-center gap-1.5">
            <span dir="ltr" className="font-mono">{phoneIdentifier}</span>
            <span>•</span>
            <span>{managementLabel}</span>
          </span>
        }
        eyebrow="تاریخچه مستقل تسویه گوشی"
        iconClass="fa-solid fa-mobile-screen-button"
        countLabel={`${totalPayments.toLocaleString('fa-IR')} پرداخت مستقیم`}
        loading={isInitialLoading}
        refreshing={Boolean(timeline.loading && summary)}
        error={timeline.error ? (summary ? 'بخش بعدی تاریخچه دریافت نشد؛ اطلاعات فعلی معتبر است و می‌توان دوباره تلاش کرد.' : String(timeline.error)) : null}
        onRefresh={() => void fetchPhoneSettlementTimeline(item, 1, false)}
        onRetry={() => void fetchPhoneSettlementTimeline(item, retryPage, retryPage > 1)}
        hasMore={hasMore}
        loadingMore={Boolean(timeline.loading && hasMore)}
        onLoadMore={() => void fetchPhoneSettlementTimeline(item, currentPage + 1, true)}
        loadMoreLabel={`نمایش بیشتر · ${payments.length.toLocaleString('fa-IR')} از ${totalPayments.toLocaleString('fa-IR')}`}
        completeLabel={totalPayments > 0 ? `همه ${totalPayments.toLocaleString('fa-IR')} پرداخت مستقیم این گوشی نمایش داده شده است.` : undefined}
        compact={compact}
        tone={balance > 0 ? 'warning' : 'success'}
        ariaLabel="تاریخچه تسویه همین گوشی"
      >
        {summary ? (
          <>
            <div className="grid min-w-0 gap-2 sm:grid-cols-3" aria-label="خلاصه تسویه گوشی">
              {[
                { label: 'مبنای سرمایه', value: formatCurrencyText(basis, readStoredCurrencyUnit()), icon: 'fa-solid fa-sack-dollar', tone: 'text-slate-900 dark:text-slate-50' },
                { label: 'سرمایه معتبر برگشتی', value: formatCurrencyText(paidTotal, readStoredCurrencyUnit()), icon: 'fa-solid fa-arrow-rotate-left', tone: 'text-emerald-700 dark:text-emerald-300' },
                { label: balance > 0 ? 'مانده' : 'وضعیت', value: balance > 0 ? formatCurrencyText(balance, readStoredCurrencyUnit()) : 'تسویه کامل', icon: balance > 0 ? 'fa-solid fa-scale-balanced' : 'fa-solid fa-circle-check', tone: balance > 0 ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300' },
              ].map((metric) => (
                <div key={metric.label} className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-950/35">
                  <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 dark:text-slate-400"><i className={metric.icon} aria-hidden="true" /><span>{metric.label}</span></div>
                  <div className={`mt-1.5 whitespace-nowrap text-xs font-black tabular-nums ${metric.tone}`}>{metric.value}</div>
                </div>
              ))}
            </div>

            {renderPhonePriceHistory(timelineItem)}

            {(autoPaidTotal > 0 || manualPaidTotal > 0 || isInstallmentSale) ? (
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900/70">
                  <div className="text-[10px] font-black text-slate-400">شناسایی خودکار از فروش</div>
                  <div className="mt-1 whitespace-nowrap text-xs font-black tabular-nums text-slate-900 dark:text-slate-50">{formatCurrencyText(autoPaidTotal, readStoredCurrencyUnit())}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900/70">
                  <div className="text-[10px] font-black text-slate-400">پرداخت مستقیم همین گوشی</div>
                  <div className="mt-1 whitespace-nowrap text-xs font-black tabular-nums text-slate-900 dark:text-slate-50">{formatCurrencyText(manualPaidTotal, readStoredCurrencyUnit())}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900/70">
                  <div className="text-[10px] font-black text-slate-400">{isInstallmentSale ? 'وصول مشتری در پرونده اقساط' : 'تعداد پرداخت مستقیم'}</div>
                  <div className="mt-1 whitespace-nowrap text-xs font-black tabular-nums text-slate-900 dark:text-slate-50">{isInstallmentSale ? formatCurrencyText(installmentCollectedAmount, readStoredCurrencyUnit()) : totalPayments.toLocaleString('fa-IR')}</div>
                </div>
              </div>
            ) : null}

            <FinancialProgressBar
              className="mt-3"
              value={progressPercent}
              label={`${progressPercent.toLocaleString('fa-IR')}٪ از سرمایه معتبر بازگشته`}
              tone={balance > 0 ? 'amber' : 'emerald'}
              ariaLabel={`پیشرفت تسویه ${progressPercent} درصد`}
            />

            {payments.length === 0 ? (
              <div className="mt-4">
                <FinancialTimelineEntry marker={<i className="fa-solid fa-receipt" aria-hidden="true" />} markerTone={autoPaidTotal > 0 ? 'success' : 'neutral'} isLast compact>
                  <div className="text-xs font-black text-slate-800 dark:text-slate-100">پرداخت مستقیم جداگانه‌ای برای این گوشی ثبت نشده است</div>
                  <div className="mt-1 text-[11px] font-semibold leading-6 text-slate-500 dark:text-slate-400">{autoPaidTotal > 0 ? 'مبلغ بازگشتی از مسیر فروش یا اقساط شناسایی شده و مستقل از دفتر صفحه جاری نگه‌داری می‌شود.' : 'در صورت ثبت پرداخت مستقیم، فقط تاریخچه همین گوشی در این بخش بارگذاری می‌شود.'}</div>
                </FinancialTimelineEntry>
              </div>
            ) : (
              <div className="mt-4 space-y-2.5">
                {payments.map((entry, index) => {
                  const batchId = extractSettlementBatchId(entry);
                  const amount = Number(entry.debit || 0);
                  const absoluteIndex = Math.max(1, totalPayments - index);
                  return (
                    <FinancialTimelineEntry
                      key={`phone-payment-${item.id}-${entry.id}`}
                      marker={absoluteIndex.toLocaleString('fa-IR')}
                      markerTone="success"
                      isLast={index === payments.length - 1 && !hasMore}
                      compact={compact}
                    >
                      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="whitespace-nowrap text-sm font-black tabular-nums text-emerald-700 dark:text-emerald-300">{formatCurrencyText(amount, readStoredCurrencyUnit())}</div>
                          <div className="mt-1 break-words text-xs font-semibold leading-6 text-slate-600 dark:text-slate-300">{cleanSettlementPaymentDescription(entry.description)}</div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <button type="button" onClick={() => setEditingEntry(entry)} className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-amber-300 hover:text-amber-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300" title="ویرایش این پرداخت"><i className="fa-solid fa-pen-to-square" /></button>
                          <button type="button" onClick={() => handleLedgerDelete(entry.id)} disabled={isDeletingEntry} className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-rose-200 bg-white text-rose-600 transition hover:bg-rose-50 disabled:opacity-60 dark:border-rose-900/50 dark:bg-slate-900 dark:text-rose-300" title="حذف این پرداخت"><i className="fa-solid fa-trash-can" /></button>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                        <span><i className="fa-regular fa-calendar ml-1" />{entry.transactionDate ? formatLedgerTransactionDate(entry.transactionDate) : 'بدون تاریخ پرداخت'}</span>
                        <span><i className="fa-regular fa-clock ml-1" />ثبت: {ledgerRecordedAt(entry)}</span>
                        {batchId ? <button type="button" onClick={() => { setActiveLedgerBatchId(batchId); scrollToLedger(); }} className="rounded-lg border border-slate-200 bg-white px-2 py-1 font-mono text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300" dir="ltr" title="نمایش پرداخت‌های این دسته در دفتر همکار">{batchId}</button> : null}
                      </div>
                    </FinancialTimelineEntry>
                  );
                })}
              </div>
            )}
          </>
        ) : null}
      </FinancialTimeline>
    );
  };

  const partnerRiskFactors = (() => {
    const balance = Number(profile.currentBalance || 0);
    const absoluteBalance = Math.abs(balance);
    const isSettled = absoluteBalance <= 0;
    const pendingCapital = Math.max(0, Number(soldPhonesProductSettlementBalance || 0));
    const openSaleFiles = Number(partnerUnifiedStatusTotals?.openSaleFiles || 0);
    const hasTelegram = Boolean(partnerTelegramLinked);

    let score = 1;

    // مانده حساب فقط یکی از سیگنال‌هاست؛ اگر حساب تسویه باشد، از این بخش امتیاز ریسک نمی‌گیرد.
    if (!isSettled) {
      if (absoluteBalance >= 500_000_000) score += 2;
      else if (absoluteBalance >= 150_000_000) score += 1;
      else score += 0.5;
    }

    // سرمایه در انتظار بازگشت در حالت حساب تسویه‌شده باید «نیاز پیگیری» بدهد، نه ریسک بالا.
    if (pendingCapital >= 300_000_000) score += isSettled ? 1.5 : 3;
    else if (pendingCapital >= 100_000_000) score += isSettled ? 1 : 2;
    else if (pendingCapital > 0) score += isSettled ? 0.5 : 1;

    // پرونده‌های فروش باز در حالت تسویه‌شده اثر ملایم‌تری دارند.
    if (openSaleFiles >= 5) score += isSettled ? 1 : 2;
    else if (openSaleFiles >= 2) score += isSettled ? 0.5 : 1;
    else if (openSaleFiles > 0) score += isSettled ? 0.25 : 0.5;

    // اتصال تلگرام ریسک ارتباط و پیگیری را کمی کم می‌کند.
    if (hasTelegram) score -= 0.5;
    else score += 0.5;

    let normalized = Math.max(1, Math.min(10, Math.round(score)));

    // قانون سقف: وقتی حساب تسویه است، ریسک نباید صرفاً به‌خاطر سرمایه در انتظار یا پرونده کم، بالا بماند.
    if (isSettled && pendingCapital < 300_000_000 && openSaleFiles < 5) {
      normalized = Math.min(normalized, 2);
    }

    const label = normalized >= 9
      ? 'بحرانی'
      : normalized >= 6
        ? 'نیازمند پیگیری'
        : normalized >= 3
          ? 'نیازمند توجه'
          : 'کم‌ریسک';

    const tone = normalized >= 9
      ? 'danger'
      : normalized >= 6
        ? 'warning'
        : normalized >= 3
          ? 'attention'
          : 'success';

    const recommendation = normalized >= 9
      ? 'ادامه همکاری بدون تسویه یا ضمانت، ریسک بالایی دارد.'
      : normalized >= 6
        ? 'قبل از خرید یا تسویه جدید، دفتر حساب و پرونده‌های باز بررسی شود.'
        : normalized >= 3
          ? 'وضعیت قابل مدیریت است؛ پیگیری تسویه و سرمایه در انتظار در برنامه روزانه بماند.'
          : isSettled && pendingCapital > 0
            ? 'حساب تسویه است؛ فقط سرمایه در انتظار بازگشت در برنامه پیگیری روزانه بماند.'
            : 'وضعیت همکاری پایدار است و مانع مالی مستقیم دیده نمی‌شود.';

    return {
      score: normalized,
      label,
      tone,
      recommendation,
      absoluteBalance,
      pendingCapital,
      openSaleFiles,
      hasTelegram,
      isSettled,
    };
  })();

  const renderCtx = {
    BULK_SETTLEMENT_LAST_NOTE_KEY,
    Button,
    FinancialProgressBar,
    FormErrorSummary,
    MessageComposerModal,
    Modal,
    ModalActions,
    ModalField,
    Notification,
    PARTNER_TYPES,
    PriceInput,
    ShamsiDatePicker,
    TelegramLinkModal,
    activeBatchLedgerMetrics,
    activeLedgerBatchId,
    applyBulkSettlementNoteTemplate,
    bulkSettlementAmount,
    bulkSettlementAmountValue,
    bulkSettlementBatchId,
    bulkSettlementDistribution,
    bulkSettlementIdSet,
    bulkSettlementNote,
    bulkSettlementNoteTemplates,
    bulkSettlementPriority,
    editFormErrors,
    editingEntry,
    editingPartner,
    expandedLedgerEntryId,
    expandedPhoneSettlementTimelineId,
    expandedPurchaseHistoryId,
    exportPartnerCapitalRows,
    phoneSettlementExporting,
    phoneSettlementLoading,
    phoneSettlementPage,
    phoneSettlementPageSize,
    phoneSettlementTotal: Number(phoneSettlementDirectory?.total || 0),
    phoneSettlementTotalPages: Number(phoneSettlementDirectory?.totalPages || 1),
    setPhoneSettlementPage,
    setPhoneSettlementPageSize,
    filteredLedgerEntries,
    filteredSoldPhoneDailyPriceDeltaTotal,
    filteredSoldPhoneDailyPriceRows,
    filteredSoldPhoneDailyPriceTotal,
    filteredSoldPhoneProductSettlementBalanceTotal,
    filteredSoldPhoneProductSettlementPaidTotal,
    formatCurrencyText,
    formatIsoToShamsi,
    formatIsoToShamsiDateTime,
    formatLedgerTransactionDate,
    formatPartnerLedgerCurrency,
    formatPrice,
    fullSettlementAmounts,
    fullPhoneSettlementLoading,
    fullPhoneSettlementPage,
    fullPhoneSettlementPageSize,
    fullPhoneSettlementTotal: Number(settlementSummary?.open || fullPhoneSettlementDirectory?.total || 0),
    fullPhoneSettlementTotalPages: Math.max(1, Math.ceil(Number(settlementSummary?.open || 0) / Number(fullPhoneSettlementPageSize))),
    setFullPhoneSettlementPage,
    setFullPhoneSettlementPageSize,
    currentUser,
    getBalanceLabel,
    getBalanceState,
    getLedgerSystemKind,
    getPartnerCapitalMeta,
    getPurchaseSystemId,
    getSaleClosureMeta,
    groupedLedgerEntries,
    handleBulkSettlementAmountChange,
    handleBulkSettlementClear,
    handleBulkSettlementSelectAll,
    handleBulkSettlementSubmit,
    handleEditInputChange,
    handleEditSubmit,
    handleExportActiveBatchCsv,
    handleFullSettlementPhoneSubmit,
    handleLedgerDelete,
    handleLedgerEdit,
    handleLedgerInputChange,
    handleLedgerSubmit,
    handlePartnerAtomicSettlementSubmit,
    handlePartnerManagerSignoffPersistence,
    handlePhoneSettlementAmountChange,
    handlePhoneSettlementSubmit,
    handlePrintActiveBatch,
    id,
    inputClass,
    isDeletingEntry,
    isEditModalOpen,
    isFullPhoneSettlementModalOpen,
    isSettlementManualConfirmationModalOpen,
    isLedgerColumnPickerOpen,
    isLedgerModalOpen,
    isMessageModalOpen,
    isSubmittingBulkSettlement,
    isSubmittingEdit,
    isSubmittingFullSettlementPhoneId,
    isSubmittingLedger,
    isSubmittingAtomicSettlement,
    isPersistingManagerSignoff,
    isSubmittingPhoneSettlement,
    jumpToFirstPartnerTgResult,
    lastBulkSettlementNote,
    lastAtomicSettlementSubmitResult,
    lastAtomicSettlementSubmitError,
    lastManagerSignoffPersistenceResult,
    lastManagerSignoffPersistenceError,
    atomicSettlementSubmitAttempts,
    lastSubmittedBulkSettlementBatchId,
    ledger,
    ledgerDirectory,
    ledgerPage,
    ledgerPageSize,
    ledgerLoading,
    setLedgerPage,
    setLedgerPageSize,
    ledgerColumnPickerButtonRef,
    ledgerColumnPickerPanelRef,
    ledgerDateSelected,
    ledgerDetailLines,
    ledgerDirection,
    ledgerDisplayMode,
    ledgerEmptyState,
    ledgerFormErrors,
    ledgerRange,
    ledgerRecordedAt,
    ledgerSearch,
    ledgerSettlementBatchOptions,
    ledgerSystemFilter,
    ledgerSystemOptions,
    ledgerTableColumnCount,
    ledgerTypeBadge,
    ledgerViewFilter,
    ledgerVisibleColumns,
    newLedgerEntry,
    navigate,
    notification,
    num,
    openEditModal,
    openLedgerModal,
    openPartnerQrLinkModal,
    openSoldPhoneSettlementRows,
    openTelegramReport,
    parsePartnerLedgerMeta,
    partnerRegisteredDateLabel,
    partnerBusinessReadModel,
    partnerRiskFactors,
    partnerTgConvError,
    partnerTgConvItems,
    partnerTgConvLoading,
    partnerTgDirectionFilter,
    partnerTgFilteredConvItems,
    partnerTgNewSinceScroll,
    partnerTgPreset,
    partnerTgQuickReply,
    partnerTgSearchQuery,
    partnerTgTimelineRef,
    partnerTypeLabel,
    partnerUnifiedStatusTotals,
    phoneSettlementAmount,
    phoneSettlementDateSelected,
    phoneSettlementErrors,
    phoneSettlementItem,
    phoneSettlementNote,
    phoneSettlementNoteTemplates,
    prefillChannels,
    prefillMessageText,
    profile,
    purchaseHistoryBySystemId,
    purchaseHistoryCounts,
    purchaseHistoryFilter,
    purchaseHistoryVisible,
    purchaseDirectory,
    purchasePage,
    purchasePageSize,
    purchaseLoading,
    setPurchasePage,
    setPurchasePageSize,
    readStoredCurrencyUnit,
    renderLedgerTransactionCard,
    renderPhoneSaleSourceLink,
    selectedBulkSettlementBalanceTotal,
    selectedBulkSettlementRows,
    setActiveLedgerBatchId,
    setBulkSettlementAmount,
    setBulkSettlementNote,
    setBulkSettlementPhoneIds,
    setBulkSettlementPriority,
    setEditFormErrors,
    setEditingEntry,
    setEditingPartner,
    setExpandedLedgerEntryId,
    setExpandedPurchaseHistoryId,
    setFullSettlementAmounts,
    setIsEditModalOpen,
    setIsFullPhoneSettlementModalOpen,
    setIsSettlementManualConfirmationModalOpen,
    setIsLedgerColumnPickerOpen,
    setIsLedgerModalOpen,
    setIsMessageModalOpen,
    setLastBulkSettlementNote,
    setLedgerDateSelected,
    setLedgerDirection,
    setLedgerDisplayMode,
    setLedgerRange,
    setLedgerSearch,
    setLedgerSystemFilter,
    setLedgerViewFilter,
    setLedgerVisibleColumns,
    setNotification,
    setPartnerTgDirectionFilter,
    setPartnerTgNewSinceScroll,
    setPartnerTgQuickReply,
    setPartnerTgSearchQuery,
    setPhoneSettlementAmount,
    setPhoneSettlementDateSelected,
    setPhoneSettlementErrors,
    setPhoneSettlementItem,
    setPhoneSettlementNote,
    setPrefillChannels,
    setPrefillMessageText,
    setPurchaseHistoryFilter,
    setSoldPhoneCapitalSearch,
    setSoldPhoneCapitalSort,
    setSoldPhoneSettlementFilter,
    setTgQrOpen,
    soldPhoneCapitalSearch,
    soldPhoneCapitalSearchRef,
    soldPhoneCapitalSort,
    soldPhoneDailyPriceRows,
    soldPhoneSettlementFilter,
    soldPhoneSettlementFilterCounts,
    soldPhonesCurrentPurchaseAmount,
    soldPhonesCurrentPurchaseBalance,
    soldPhonesInitialPurchaseAmount,
    soldPhonesProductSettlementBalance,
    soldPhonesProductSettlementPaidAmount,
    tgBotUsernameMissing,
    tgQrDeepLink,
    tgQrLoading,
    tgQrOpen,
    token,
    totalCredits,
    totalDebits,
    unallocatedPartnerPaymentAmount,
    unsoldInventoryAmount,
    applyPartnerTgPreset,
    bulkSettlementAppliedTotal,
    bulkSettlementUnallocatedAmount,
    fullSettlementOpenBalanceTotal,
    fullSettlementOpenBasisTotal,
    fullSettlementOpenPaidTotal,
    partnerTelegramChatId,
    partnerTelegramLinked,
    partnerTelegramLinkedAt,
    renderPhoneSettlementTimeline,
    togglePhoneSettlementTimeline,
    resolvePartnerTelegramText,
    scrollToLedger,
    sendPartnerTelegramQuickReply,
    soldPhonesCurrentPurchaseDelta,
  };

  return <PartnerDetailRender ctx={renderCtx} />;
};

export default PartnerDetailController;
