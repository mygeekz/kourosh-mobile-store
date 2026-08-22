import { useConfirm } from '../../contexts/ConfirmContext';
// src/pages/CustomerDetailPage.tsx
import React, { useEffect, FormEvent, ChangeEvent } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import moment from 'jalali-moment';
import {
  CustomerLedgerEntry,
  NewCustomerData,
  NewLedgerEntryData,
  CustomerLedgerInsights,
} from '../../types';
import Notification from '../../components/Notification';
import { Dialog as Modal } from '@/components/ui';
import { ModalField } from '@/components/ui';
import FormErrorSummary from '../../components/FormErrorSummary';
import TelegramLinkModal from '../../components/TelegramLinkModal';
import MessageComposerModal from '../../components/MessageComposerModal';
import ShamsiDatePicker from '../../components/ShamsiDatePicker';
import PriceInput from '../../components/PriceInput';
import Button from '../../components/Button';
import { DialogActions as ModalActions } from '@/components/ui';
import FinancialStatusBadge from '../../components/FinancialStatusBadge';
import { formatIsoToShamsi } from '../../utils/dateUtils';
import { useAuth } from '../../contexts/AuthContext';
import { getAuthHeaders } from '../../utils/apiUtils';
import { apiFetch } from '../../utils/apiFetch';
import { focusErrorsSoon, isDuplicateMessage, toSafeNumber } from '../../utils/formBehavior';
import { getBalanceLabel, getBalanceState } from '../../utils/adaptiveUi';
import { printArea } from '../../utils/printArea';
import { readStoredBranding } from '../../utils/branding';
import { formatCurrencyText, readStoredCurrencyUnit } from '../../utils/currency';
import { buildFinancialSourceTarget } from '../../utils/financialSourceLinks';
import { getNavigationReturnUiState, type CustomerLedgerReturnUiState } from '../../utils/navigationReturnContext';

import {
  classifyLedgerPayment,
  formatKnownShamsiDate,
  formatLedgerCurrency,
  getEntityRegisteredDateValue,
  getTrustTone,
  ledgerRecordedAt,
  normalizeTags,
} from './customerDetailControllerSupport';
import CustomerDetailRender from './CustomerDetailRender';
import { useCustomerDetailControllerState } from './useCustomerDetailControllerState';
import { useCustomerDetailLedgerTelegramState } from './useCustomerDetailLedgerTelegramState';
import { useCustomerTelegramLinkActions } from './useCustomerTelegramLinkActions';
import {
  buildLatestPurchaseDateLabel,
  buildLedgerPrintStats,
  buildOpenInstallmentDue,
  buildOpenInstallmentDueStatus,
} from './customerDetailViewModels';
const CustomerDetailController: React.FC = () => {
  const confirmAction = useConfirm();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = useAuth();

  const { customerData, setCustomerData, isLoading, setIsLoading, notification, setNotification, ledgerInsights, setLedgerInsights, followups, setFollowups, followupNote, setFollowupNote, followupNextDate, setFollowupNextDate, isSavingFollowup, setIsSavingFollowup, insightsLoading, setInsightsLoading, customerInstallmentSales, setCustomerInstallmentSales, installmentSalesLoading, setInstallmentSalesLoading, customerTrustProfile, setCustomerTrustProfile, customerTrustLoading, setCustomerTrustLoading, customerTrustHistory, setCustomerTrustHistory, customerTrustHistoryLoading, setCustomerTrustHistoryLoading, tagInput, setTagInput, isSavingTags, setIsSavingTags, isEditModalOpen, setIsEditModalOpen, editingCustomer, setEditingCustomer, editFormErrors, setEditFormErrors, isSubmittingEdit, setIsSubmittingEdit, isManagerNoteModalOpen, setIsManagerNoteModalOpen, managerNoteContext, setManagerNoteContext, managerNoteDraft, setManagerNoteDraft, isSavingManagerNote, setIsSavingManagerNote, managerNotes, setManagerNotes, managerNotesLoading, setManagerNotesLoading, isLedgerModalOpen, setIsLedgerModalOpen, isMessageModalOpen, setIsMessageModalOpen, prefillMessageText, setPrefillMessageText, prefillChannels, setPrefillChannels, tgCardText, setTgCardText, tgCardParseMode, setTgCardParseMode, tgShowChatId, setTgShowChatId, tgChatIdInput, setTgChatIdInput, tgIsSending, setTgIsSending, tgPreset, setTgPreset, tgQrOpen, setTgQrOpen, tgQrLoading, setTgQrLoading, tgQrDeepLink, setTgQrDeepLink, tgQrExpiresAt, setTgQrExpiresAt, tgQrExpectedPhone, setTgQrExpectedPhone, tgQrBotUsernameMissing, setTgQrBotUsernameMissing } = useCustomerDetailControllerState();


  const { openQrLinkModal } = useCustomerTelegramLinkActions({
    token,
    customerData,
    setNotification,
    setTgQrOpen,
    setTgQrLoading,
    setTgQrDeepLink,
    setTgQrExpiresAt,
    setTgQrExpectedPhone,
    setTgQrBotUsernameMissing,
  });


  const { tgConvItems, setTgConvItems, tgConvMeta, setTgConvMeta, tgConvLoading, setTgConvLoading, tgConvError, setTgConvError, tgQuickReply, setTgQuickReply, tgQuickPreset, setTgQuickPreset, tgReplyTo, setTgReplyTo, tgAttachment, setTgAttachment, tgAutoRefresh, setTgAutoRefresh, tgNewSinceScroll, setTgNewSinceScroll, tgSearchQuery, setTgSearchQuery, tgDirectionFilter, setTgDirectionFilter, newLedgerEntry, setNewLedgerEntry, ledgerDateSelected, setLedgerDateSelected, ledgerFormErrors, setLedgerFormErrors, isSubmittingLedger, setIsSubmittingLedger, transactionType, setTransactionType, editingEntry, setEditingEntry, isDeletingEntry, setIsDeletingEntry, ledgerViewFilter, setLedgerViewFilter, expandedLedgerEntryId, setExpandedLedgerEntryId, ledgerSearch, setLedgerSearch, ledgerRange, setLedgerRange, ledgerDebouncedSearch, setLedgerDebouncedSearch, ledgerPage, setLedgerPage, ledgerPageSize, setLedgerPageSize, ledgerTotal, setLedgerTotal, ledgerTotalPages, setLedgerTotalPages, ledgerDirectorySummary, setLedgerDirectorySummary, ledgerDirectoryLoading, setLedgerDirectoryLoading, ledgerDirectoryRefreshing, setLedgerDirectoryRefreshing, tgTimelineRef, tgFilteredConvItems, initialLedgerEntry, jumpToFirstTgResult } = useCustomerDetailLedgerTelegramState();
  const pendingLedgerReturnRestoreRef = React.useRef<CustomerLedgerReturnUiState | null>(null);
  const [ledgerReturnRestoring, setLedgerReturnRestoring] = React.useState(false);

  const [ledgerPrintRows, setLedgerPrintRows] = React.useState<CustomerLedgerEntry[]>([]);
  const contractEditOpenedRef = React.useRef(false);


  const sendLedgerAction = async (type: 'REMINDER' | 'NOTE' | 'FLAG_HIGH_RISK', note?: string) => {
    if (!token || !customerData) return;
    try {
      const res = await apiFetch(`/api/customers/${customerData.profile.id}/ledger/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
        body: JSON.stringify({ type, note }),
      });
      if (res.ok) {
        setNotification({ message: 'عملیات با موفقیت انجام شد.', type: 'success' });
      }
    } catch {
      setNotification({ message: 'خطا در ثبت اطلاعات اقدام', type: 'error' });
    }
  };

  
  const createQuickFollowup = async (note: string, nextIso?: string | null) => {
    if (!token || !customerData?.profile?.id) return;
    const n = String(note || '').trim();
    if (!n) return;
    try {
      const res = await apiFetch(`/api/customers/${customerData.profile.id}/followups`, {
        method: 'POST',
        headers: { ...getAuthHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: n, nextFollowupDate: nextIso ?? new Date().toISOString() }),
      });
      const js = await res.json();
      if (!res.ok || js?.success === false) throw new Error(js?.message || 'خطا در ثبت اطلاعات پیگیری');
      setFollowups([js.data, ...(followups || [])]);
      setNotification({ message: 'یادآوری ثبت اطلاعات شد.', type: 'success' });
    } catch (e: any) {
      setNotification({ message: e?.message || 'خطا در عملیات', type: 'error' });
    }
  };

const saveFollowup = async () => {
    if (!token || !customerData?.profile?.id) return;
    const note = String(followupNote || '').trim();
    if (!note) {
      setNotification({ message: 'یادداشت پیگیری را وارد کنید.', type: 'error' });
      return;
    }
    setIsSavingFollowup(true);
    try {
      const body = {
        note,
        nextFollowupDate: followupNextDate ? new Date(followupNextDate).toISOString() : null,
      };
      const res = await apiFetch(`/api/customers/${customerData.profile.id}/followups`, {
        method: 'POST',
        headers: { ...getAuthHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const js = await res.json();
      if (!res.ok || js?.success === false) throw new Error(js?.message || 'خطا در ثبت اطلاعات پیگیری');
      setFollowups([js.data, ...(followups || [])]);
      setFollowupNote('');
      setFollowupNextDate(null);
      setNotification({ message: 'پیگیری ثبت اطلاعات شد.', type: 'success' });
    } catch (e: any) {
      setNotification({ message: e?.message || 'خطا در عملیات', type: 'error' });
    } finally {
      setIsSavingFollowup(false);
    }
  };

  
  const closeFollowup = async (followupId: number) => {
    if (!token || !customerData?.profile?.id) return;
    try {
      const res = await apiFetch(`/api/customers/${customerData.profile.id}/followups/${followupId}/close`, {
        method: 'POST',
        headers: getAuthHeaders(token),
      });
      const js = await res.json();
      if (!res.ok || js?.success === false) throw new Error(js?.message || 'خطا در بستن پیگیری');
      setFollowups((prev) => (prev || []).map((f: any) => (f.id === followupId ? js.data : f)));
      setNotification({ message: 'پیگیری بسته شد.', type: 'success' });
    } catch (e: any) {
      setNotification({ message: e?.message || 'خطا در عملیات', type: 'error' });
    }
  };

const setRiskOverride = async (risk: 'low'|'medium'|'high'|null) => {
    if (!token || !customerData?.profile?.id) return;
    try {
      const res = await apiFetch(`/api/customers/${customerData.profile.id}/risk-override`, {
        method: 'POST',
        headers: { ...getAuthHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({ risk }),
      });
      const js = await res.json();
      if (!res.ok || js?.success === false) throw new Error(js?.message || 'خطا در تنظیم ریسک');
      // update local profile
      setCustomerData((prev: any) => prev ? ({ ...prev, profile: js.data }) : prev);
      setNotification({ message: 'ریسک دستی ذخیره تغییرات شد.', type: 'success' });
    } catch (e: any) {
      setNotification({ message: e?.message || 'خطا در عملیات', type: 'error' });
    }
  };

const fetchLedgerInsights = async (customerId: number) => {
    if (!token) return;
    setInsightsLoading(true);
    try {
      const res = await apiFetch(`/api/customers/${customerId}/ledger/insights`, { headers: getAuthHeaders(token) });
      const js = await res.json();
      if (res.ok && js?.success !== false) setLedgerInsights(js.data as CustomerLedgerInsights);
    } catch {
      // ignore
    } finally {
      setInsightsLoading(false);
    }
  };

  
const fetchCustomerTrustProfile = async (customerId: number) => {
    if (!token || !customerId) return;
    setCustomerTrustLoading(true);
    try {
      const res = await apiFetch(`/api/customers/${customerId}/trust-profile?ts=${Date.now()}`, { headers: getAuthHeaders(token), cache: 'no-store' });
      const js = await res.json();
      if (!res.ok || js?.success === false) throw new Error(js?.message || 'خطا در دریافت امتیاز اعتماد مشتری');
      setCustomerTrustProfile(js.data || null);
    } catch (error: any) {
      console.warn('fetchCustomerTrustProfile failed:', error?.message || error);
      setCustomerTrustProfile(null);
    } finally {
      setCustomerTrustLoading(false);
    }
  };

const fetchCustomerTrustHistory = async (customerId: number) => {
    if (!token || !customerId) return;
    setCustomerTrustHistoryLoading(true);
    try {
      const res = await apiFetch(`/api/customers/${customerId}/trust-profile/history?ts=${Date.now()}`, { headers: getAuthHeaders(token), cache: 'no-store' });
      const js = await res.json();
      if (!res.ok || js?.success === false) throw new Error(js?.message || 'خطا در دریافت تاریخچه امتیاز اعتماد');
      setCustomerTrustHistory(js.data || null);
    } catch (error: any) {
      console.warn('fetchCustomerTrustHistory failed:', error?.message || error);
      setCustomerTrustHistory(null);
    } finally {
      setCustomerTrustHistoryLoading(false);
    }
  };


  const fetchManagerNotes = async (customerId: number) => {
    if (!token || !customerId) return;
    setManagerNotesLoading(true);
    try {
      const response = await apiFetch(`/api/customers/${customerId}/manager-notes`, {
        headers: getAuthHeaders(token),
      });
      const result = await response.json();
      if (!response.ok || result?.success === false) throw new Error(result?.message || 'خطا در دریافت یادداشت‌های مدیریتی');
      setManagerNotes(Array.isArray(result?.data) ? result.data : []);
    } catch (error: any) {
      console.warn('fetchManagerNotes failed:', error?.message || error);
      setManagerNotes([]);
    } finally {
      setManagerNotesLoading(false);
    }
  };


  const fetchCustomerLedgerDirectory = async (background = false, includeSummary = false, targetPage = ledgerPage) => {
    const customerId = Number(id || 0);
    if (!customerId || !token) return;
    if (background) setLedgerDirectoryRefreshing(true);
    else setLedgerDirectoryLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        pageSize: String(Number(ledgerPageSize)),
        search: ledgerDebouncedSearch,
        direction: ledgerViewFilter,
        range: ledgerRange,
        includeSummary: includeSummary ? '1' : '0',
        ts: String(Date.now()),
      });
      const response = await apiFetch(`/api/customers/${customerId}/ledger?${params.toString()}`, {
        headers: getAuthHeaders(token),
        cache: 'no-store',
      });
      const result = await response.json();
      const data = result?.data;
      if (!response.ok || !result?.success || !data || !Array.isArray(data.items)) {
        throw new Error(result?.message || 'خطا در دریافت دفتر حساب مشتری');
      }
      setCustomerData((prev) => prev ? { ...prev, ledger: data.items } : prev);
      setLedgerTotal(Math.max(0, Number(data.total || 0)));
      setLedgerTotalPages(Math.max(1, Number(data.totalPages || 1)));
      if (data.summary) setLedgerDirectorySummary(data.summary);
    } catch (error: any) {
      setNotification({ type: 'error', text: error?.message || 'خطا در دریافت دفتر حساب مشتری' });
    } finally {
      setLedgerDirectoryLoading(false);
      setLedgerDirectoryRefreshing(false);
    }
  };



  const fetchCustomerDetails = async () => {
    if (!id || !token) return;
    setIsLoading(true);
    try {
      const response = await apiFetch(`/api/customers/${id}?includeLedger=0`, { headers: getAuthHeaders(token), cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'خطا در دریافت اطلاعات مشتری');
      setCustomerData((prev) => ({
        ...result.data,
        ledger: Array.isArray(prev?.ledger) ? prev.ledger : [],
      }));
      fetchLedgerInsights(Number(id));
      fetchCustomerInstallmentSales(Number(id));
      fetchCustomerTrustProfile(Number(id));
      fetchCustomerTrustHistory(Number(id));
      fetchManagerNotes(Number(id));
} catch (error: any) {
      setNotification({ type: 'error', text: error.message });
      if (error.message.includes('یافت نشد')) setTimeout(() => navigate('/customers'), 2000);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCustomerInstallmentSales = async (customerId: number) => {
    if (!token || !customerId) return;
    setInstallmentSalesLoading(true);
    try {
      const res = await apiFetch(`/api/installment-sales/customer/${customerId}`, {
        headers: getAuthHeaders(token),
        cache: 'no-store',
      });
      const js = await res.json();
      if (!res.ok || js?.success === false) throw new Error(js?.message || 'خطا در دریافت فروش‌های اقساطی مشتری');
      setCustomerInstallmentSales(Array.isArray(js?.data) ? js.data : []);
    } catch (error: any) {
      console.warn('fetchCustomerInstallmentSales failed:', error?.message || error);
      setCustomerInstallmentSales([]);
    } finally {
      setInstallmentSalesLoading(false);
    }
  };

  const fetchTelegramConversation = async (customerId: number) => {
    if (!token || !customerId) return;
    setTgConvLoading(true);
    setTgConvError('');
    try {
      const res = await apiFetch(`/api/telegram/conversation?customerId=${customerId}&limit=300`, {
        headers: getAuthHeaders(token),
      });
      const js = await res.json().catch(() => ({}));
      if (!res.ok || js?.success === false) throw new Error(js?.message || 'خطا در دریافت گفتگو');
      setTgConvItems(Array.isArray(js?.data) ? js.data : []);
      setTgConvMeta(js?.meta || null);
    } catch (e: any) {
      setTgConvError(e?.message || 'خطا در دریافت گفتگو');
      setTgConvMeta(null);
    } finally {
      setTgConvLoading(false);
    }
  };

  // Auto refresh conversation (smart polling)
  useEffect(() => {
    const profile: any = customerData?.profile;
    if (!tgAutoRefresh || !token || !profile?.id) return;
    const t = setInterval(() => {
      // Only poll when tab is visible to reduce noise
      if (document.visibilityState === 'visible') fetchTelegramConversation(Number(profile.id));
    }, 5000);

    return () => clearInterval(t);
  }, [tgAutoRefresh, token, customerData?.profile?.id]);

  // Scroll-to-lacheck with "new messages" hint when operator is reading older parts
  useEffect(() => {
    const el = tgTimelineRef.current;
    if (!el) return;
    const nearBottom = (el.scrollHeight - el.scrollTop - el.clientHeight) < 140;
    if (nearBottom) {
      el.scrollTop = el.scrollHeight;
      setTgNewSinceScroll(false);
    } else {
      // only show badge if new content came in
      setTgNewSinceScroll(true);
    }
  }, [tgConvItems.length]);



  const applyTgQuickPreset = (p: typeof tgQuickPreset) => {
    setTgQuickPreset(p);
    if (p === 'hello') {
      setTgQuickReply(`سلام {name} عزیز 🌿\n\nدر خدمتم.`);
    } else if (p === 'installment_reminder') {
      setTgQuickReply(`🔔 یادآوری قسط\nمشتری: {name}\nمبلغ: {amount}\nسررسید: {dueDate}`);
    } else if (p === 'payment_link') {
      setTgQuickReply(`✅ لینک وضعیت\n{name} عزیز، این لینک را باز کنید:\n{link}`);
    }
  };

  const sendTgQuickReply = async () => {
    if (!token || !customerData?.profile) return;
    const profile: any = customerData.profile;
    const chatId = String(profile.telegramChatId || profile.telegram_chat_id || '').trim();
    const optedOut = Number(profile.telegramOptedOut ?? profile.telegram_opted_out ?? 0) === 1;

    if (!chatId) return setNotification({ type: 'error', text: 'این مشتری به تلگرام لینک نشده است.' });
    if (optedOut) return setNotification({ type: 'error', text: 'این مشتری opt-out کرده است.' });

    const raw = String(tgQuickReply || '').trim();
    if (!raw && !tgAttachment) return setNotification({ type: 'error', text: 'متن یا فایل لازم است.' });

    const filled = raw.replace(/\{(\w+)\}/g, (_m, k) => {
      const map: Record<string, string> = buildTelegramTemplateVars(profile);
      return map[k] ?? `{${k}}`;
    });

    // Default parse mode for quick-reply is HTML (matches templates)
    const parseMode: any = 'HTML';

    setTgIsSending(true);
    try {
      const body: any = {
        customerId: Number(profile.id),
        text: filled,
        parseMode,
        attachment: tgAttachment ? { ...tgAttachment } : null,
        replyToMessageId: tgReplyTo?.telegramMessageId || 0,
      };

      const res = await apiFetch('/api/telegram/customer-actions/send-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const js = await res.json().catch(() => ({}));
      if (!res.ok || js?.success === false) throw new Error(js?.message || 'ارسال پیام انجام نشد.');

      setTgQuickPreset('custom');
      setTgQuickReply('');
      setTgAttachment(null);
      setTgReplyTo(null);
      setNotification({ type: 'success', text: 'در صف تلگرام قرار گرفت.' });
      fetchTelegramConversation(profile.id);
    } catch (e: any) {
      setNotification({ type: 'error', text: e?.message || 'ارسال پیام انجام نشد.' });
    } finally {
      setTgIsSending(false);
    }
  };

  const uploadTelegramAttachment = async (file: File) => {
    if (!file) return;
    setTgIsSending(true);
    try {
      const fd = new FormData();
      fd.append('file', file);

      const res = await apiFetch('/api/telegram/upload', { method: 'POST', body: fd });
      const js = await res.json().catch(() => ({}));
      if (!res.ok || js?.success === false) throw new Error(js?.message || 'آپلود فایل انجام نشد.');

      const d = js?.data || {};
      const mime = String(d.mimeType || file.type || '');
      const type: any = mime.startsWith('image/') ? 'photo' : 'document';

      setTgAttachment({
        type,
        relPath: String(d.relPath || '').trim(),
        url: String(d.url || '').trim(),
        mimeType: mime || undefined,
        originalName: String(d.originalName || file.name || '').trim(),
      });
      setNotification({ type: 'success', text: 'فایل آماده ارسال شد.' });
    } catch (e: any) {
      setNotification({ type: 'error', text: e?.message || 'آپلود فایل انجام نشد.' });
    } finally {
      setTgIsSending(false);
    }
  };


  const updateTags = async (nextTags: string[]) => {
    if (!id || !token) return;
    setIsSavingTags(true);
    try {
      const response = await apiFetch(`/api/customers/${id}/tags`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
        body: JSON.stringify({ tags: nextTags }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'خطا در ذخیره تغییرات تگ‌ها');

      // Update local state without refetch
      setCustomerData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          profile: {
            ...prev.profile,
            tags: (result.data as any)?.tags,
          } as any,
        };
      });
    } catch (e: any) {
      setNotification({ type: 'error', text: e.message || 'خطا در ذخیره تغییرات تگ‌ها' });
    } finally {
      setIsSavingTags(false);
    }
  };

  useEffect(() => { if (token) fetchCustomerDetails(); }, [id, navigate, token]);

  useEffect(() => {
    const restoreUi = getNavigationReturnUiState<CustomerLedgerReturnUiState>(location.state, 'customer-ledger');
    if (!restoreUi || Number(restoreUi.customerId || 0) !== Number(id || 0)) return;
    pendingLedgerReturnRestoreRef.current = restoreUi;
    setLedgerReturnRestoring(true);
    setLedgerSearch(String(restoreUi.search || ''));
    setLedgerViewFilter((restoreUi.direction || 'all') as typeof ledgerViewFilter);
    setLedgerRange((restoreUi.range || 'all') as typeof ledgerRange);
    setLedgerPageSize((restoreUi.pageSize || '25') as typeof ledgerPageSize);
    setLedgerPage(Math.max(1, Number(restoreUi.page || 1)));
    setExpandedLedgerEntryId(Number(restoreUi.expandedEntryId || 0) || null);
  }, [location.key, location.state, id]);

  useEffect(() => {
    const timer = window.setTimeout(() => setLedgerDebouncedSearch(ledgerSearch.trim()), 320);
    return () => window.clearTimeout(timer);
  }, [ledgerSearch]);

  useEffect(() => {
    if (pendingLedgerReturnRestoreRef.current) return;
    setLedgerPage(1);
  }, [ledgerDebouncedSearch, ledgerViewFilter, ledgerRange, ledgerPageSize]);

  useEffect(() => {
    if (!ledgerReturnRestoring) return;
    const pending = pendingLedgerReturnRestoreRef.current;
    if (!pending) {
      setLedgerReturnRestoring(false);
      return;
    }
    const filtersReady = ledgerDebouncedSearch === String(pending.search || '').trim()
      && String(ledgerViewFilter) === String(pending.direction || 'all')
      && String(ledgerRange) === String(pending.range || 'all')
      && String(ledgerPageSize) === String(pending.pageSize || '25');
    if (!filtersReady) return;
    setLedgerPage(Math.max(1, Number(pending.page || 1)));
    pendingLedgerReturnRestoreRef.current = null;
    setLedgerReturnRestoring(false);
  }, [ledgerReturnRestoring, ledgerDebouncedSearch, ledgerViewFilter, ledgerRange, ledgerPageSize]);

  useEffect(() => {
    if (!token || !id || !customerData?.profile?.id || ledgerReturnRestoring || pendingLedgerReturnRestoreRef.current) return;
    void fetchCustomerLedgerDirectory(false, ledgerDirectorySummary == null, ledgerPage);
  }, [token, id, customerData?.profile?.id, ledgerPage, ledgerPageSize, ledgerDebouncedSearch, ledgerViewFilter, ledgerRange, ledgerReturnRestoring]);

  useEffect(() => {
    if (ledgerPage > ledgerTotalPages) setLedgerPage(ledgerTotalPages);
  }, [ledgerPage, ledgerTotalPages]);

  useEffect(() => {
    const cid = Number((customerData as any)?.profile?.id || (customerData as any)?.id || 0);
    if (!cid || !token) return;
    fetchTelegramConversation(cid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, (customerData as any)?.profile?.id, (customerData as any)?.profile?.telegramChatId, (customerData as any)?.profile?.telegram_chat_id]);

  const openEditModal = () => {
    if (!customerData?.profile) return;
    setEditingCustomer({
      fullName: customerData.profile.fullName,
      nationalCode: customerData.profile.nationalCode || '',
      phoneNumber: customerData.profile.phoneNumber || '',
      address: customerData.profile.address || '',
      notes: customerData.profile.notes || '',
    });
    setEditFormErrors({});
    setIsEditModalOpen(true);
  };

  const handleEditInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditingCustomer(prev => ({ ...prev, [name]: value }));
    if (editFormErrors[name as keyof NewCustomerData]) setEditFormErrors(prev => ({ ...prev, [name]: undefined }));
  };

  const validateEditForm = (): boolean => {
    const errors: Partial<NewCustomerData> = {};
    if (!editingCustomer.fullName?.trim()) errors.fullName = 'نام کامل الزامی است.';
    if (editingCustomer.phoneNumber && !/^\d{10,15}$/.test(editingCustomer.phoneNumber.trim())) {
      errors.phoneNumber = 'شماره تماس نامعتبر است (باید ۱۰ تا ۱۵ رقم باشد).';
    }
    const nationalCode = String(editingCustomer.nationalCode || '').replace(/\D/g, '');
    if ((nationalCode || contractEditOpenedRef.current) && nationalCode.length !== 10) {
      errors.nationalCode = contractEditOpenedRef.current
        ? 'برای چاپ قرارداد، کد ملی ۱۰ رقمی الزامی است.'
        : 'کد ملی باید دقیقاً ۱۰ رقم باشد.';
    }
    if (contractEditOpenedRef.current && !String(editingCustomer.address || '').trim()) {
      errors.address = 'برای چاپ قرارداد، آدرس محل سکونت خریدار الزامی است.';
    }
    setEditFormErrors(errors);
    focusErrorsSoon(errors as any, { fullName: 'editFullName', nationalCode: 'editNationalCode', phoneNumber: 'editPhoneNumber', address: 'editAddress' });
    return Object.keys(errors).length === 0;
  };

  useEffect(() => {
    if (!customerData?.profile || contractEditOpenedRef.current) return;
    const params = new URLSearchParams(location.search || '');
    if (params.get('edit') !== 'contract') return;
    contractEditOpenedRef.current = true;
    openEditModal();
    navigate(location.pathname, { replace: true });
  }, [customerData?.profile?.id, location.pathname, location.search]);

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmittingEdit) return;
    if (!validateEditForm() || !id || !token) return;
    setIsSubmittingEdit(true);
    setNotification(null);
    try {
      const response = await apiFetch(`/api/customers/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(token),
        body: JSON.stringify(editingCustomer),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'خطا در به‌روزرسانی اطلاعات مشتری');
      setNotification({ type: 'success', text: 'اطلاعات مشتری با موفقیت به‌روزرسانی شد.' });
      setIsEditModalOpen(false);
      fetchCustomerDetails();
    } catch (error: any) {
      const msg = error.message;
      setNotification({ type: 'error', text: msg });
      if (isDuplicateMessage(msg)) {
        setEditFormErrors(prev => ({ ...prev, phoneNumber: msg }));
        focusErrorsSoon({ phoneNumber: msg } as any, { phoneNumber: 'editPhoneNumber' });
      }
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const openManagerNoteModal = (context: string) => {
    const nowLabel = moment().locale('fa').format('jYYYY/jMM/jDD HH:mm');
    setManagerNoteContext(context);
    setManagerNoteDraft(`یادداشت مدیریتی - ${context} - ${nowLabel}\n`);
    setIsManagerNoteModalOpen(true);
  };

  const handleManagerNoteSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSavingManagerNote || !id || !token || !customerData?.profile) return;

    const note = managerNoteDraft.trim();
    if (!note) {
      setNotification({ type: 'error', text: 'متن یادداشت مدیریتی را وارد کنید.' });
      return;
    }

    setIsSavingManagerNote(true);
    setNotification(null);

    try {
      const response = await apiFetch(`/api/customers/${id}/manager-notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
        body: JSON.stringify({
          context: managerNoteContext || 'یادداشت مدیریتی',
          note,
        }),
      });
      const result = await response.json();
      if (!response.ok || result?.success === false) throw new Error(result?.message || 'خطا در ثبت یادداشت مدیریتی');

      const savedNote = result?.data;
      setManagerNotes(prev => savedNote ? [savedNote, ...prev] : prev);
      setNotification({ type: 'success', text: 'یادداشت مدیریتی در تاریخچه اختصاصی مشتری ثبت شد.' });
      setIsManagerNoteModalOpen(false);
      setManagerNoteDraft('');
      setManagerNoteContext('');
    } catch (error: any) {
      setNotification({ type: 'error', text: error?.message || 'خطا در ثبت یادداشت مدیریتی' });
    } finally {
      setIsSavingManagerNote(false);
    }
  };

  const openLedgerModal = () => {
    setNewLedgerEntry(initialLedgerEntry);
    setLedgerDateSelected(new Date());
    setTransactionType('credit');
    setLedgerFormErrors({});
    setIsLedgerModalOpen(true);
  };

  const handleLedgerInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { name: string; value: string } }
  ) => {
    const { name, value } = e.target;
    if (name === 'amount') {
      const amountValue = toSafeNumber(value, NaN);
      if (transactionType === 'credit') {
        setNewLedgerEntry(prev => ({ ...prev, credit: isNaN(amountValue) ? ('' as any) : amountValue, debit: 0 } as any));
      } else {
        setNewLedgerEntry(prev => ({ ...prev, debit: isNaN(amountValue) ? ('' as any) : amountValue, credit: 0 } as any));
      }
    } else {
      setNewLedgerEntry(prev => ({ ...prev, [name]: value } as any));
    }
    if (ledgerFormErrors[name as keyof NewLedgerEntryData] || ledgerFormErrors.amountType) {
      setLedgerFormErrors(prev => ({ ...prev, [name]: undefined, amountType: undefined, transactionDate: undefined }));
    }
  };

  const handleTransactionTypeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const type = e.target.value as 'debit' | 'credit';
    setTransactionType(type);
    const currentAmount = type === 'credit' ? (newLedgerEntry.credit || 0) : (newLedgerEntry.debit || 0);
    if (type === 'credit') setNewLedgerEntry(prev => ({ ...prev, credit: currentAmount, debit: 0 }));
    else setNewLedgerEntry(prev => ({ ...prev, debit: currentAmount, credit: 0 }));
  };

  const validateLedgerForm = (): boolean => {
    const errors: Partial<NewLedgerEntryData & { amountType?: string; transactionDate?: string }> = {};
    if (!newLedgerEntry.description?.trim()) errors.description = 'شرح تراکنش الزامی است.';
    const amount = transactionType === 'credit' ? newLedgerEntry.credit : newLedgerEntry.debit;
    if (amount === undefined || amount === null || isNaN(Number(amount)) || Number(amount) <= 0) {
      errors.amountType = 'مبلغ تراکنش باید عددی مثبت باشد.';
    }
    if (!ledgerDateSelected) errors.transactionDate = 'تاریخ تراکنش الزامی است.';
    setLedgerFormErrors(errors);
    focusErrorsSoon(errors as any, { amountType: 'ledgerAmount', transactionDate: 'ledgerDatePicker', description: 'ledgerDescription' });
    return Object.keys(errors).length === 0;
  };

  const handleLedgerSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmittingLedger) return;
    if (!validateLedgerForm() || !id || !ledgerDateSelected || !token) return;
    setIsSubmittingLedger(true);
    setNotification(null);

    const payload: NewLedgerEntryData = {
      description: newLedgerEntry.description || '',
      debit: transactionType === 'debit' ? Number(newLedgerEntry.debit) : 0,
      credit: transactionType === 'credit' ? Number(newLedgerEntry.credit) : 0,
      transactionDate: moment(ledgerDateSelected).toISOString(),
    };

    try {
      const response = await apiFetch(`/api/customers/${id}/ledger`, {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'خطا در ثبت اطلاعات تراکنش در دفتر حساب');
      setNotification({ type: 'success', text: 'تراکنش با موفقیت ثبت شد.' });
      setIsLedgerModalOpen(false);
      setLedgerPage(1);
      await fetchCustomerLedgerDirectory(true, true, 1);
      fetchLedgerInsights(Number(id));
    } catch (error: any) {
      setNotification({ type: 'error', text: error.message });
    } finally {
      setIsSubmittingLedger(false);
    }
  };

  const handleLedgerDelete = async (entryId: number) => {
    if (!id || !token) return;
    const ok = await confirmAction({ title: 'حذف مورد رکورد دفتر', description: 'این رکورد از دفتر مشتری حذف مورد شود؟', confirmText: 'بله، حذف مورد شود', tone: 'danger' });
    if (!ok) return;
    setIsDeletingEntry(true);
    try {
      const response = await apiFetch(`/api/customers/${id}/ledger/${entryId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(token),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'حذف مورد انجام نشد');
      await fetchCustomerLedgerDirectory(true, true, ledgerPage);
      fetchLedgerInsights(Number(id));
      setNotification({ type: 'success', text: 'حذف مورد انجام شد.' });
    } catch (error: any) {
      setNotification({ type: 'error', text: error.message });
    } finally {
      setIsDeletingEntry(false);
    }
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
      const response = await apiFetch(`/api/customers/${id}/ledger/${editingEntry.id}`, {
        method: 'PUT',
        headers: { ...getAuthHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'ویرایش اطلاعات انجام نشد');
      setEditingEntry(null);
      await fetchCustomerLedgerDirectory(true, true, ledgerPage);
      fetchLedgerInsights(Number(id));
      setNotification({ type: 'success', text: 'ویرایش اطلاعات انجام شد.' });
    } catch (error: any) {
      setNotification({ type: 'error', text: error.message });
    }
  };

  const formatPrice = (price: number | undefined | null) =>
    price === undefined || price === null ? '-' : `${price.toLocaleString('fa-IR')} تومان`;

  const openTelegramReport = async () => {
    try {
      if (!token || !customerData?.profile?.id) return;
      setNotification(null);
      const res = await apiFetch(`/api/reports/customer/${customerData.profile.id}/message`, { headers: getAuthHeaders(token) });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.message || 'خطا در دریافت گزارش');
      setPrefillChannels({ sms: false, telegram: true });
      setPrefillMessageText(String(json?.data?.text || ''));
      setIsMessageModalOpen(true);
    } catch (e: any) {
      setNotification({ type: 'error', text: e?.message || 'خطا در آماده‌سازی گزارش' });
    }
  };

  const inputClass = (hasError: boolean, isTextarea = false) =>
    [
      'w-full rounded-lg text-sm text-right px-3 py-2',
      'border shadow-sm outline-none',
      'bg-white text-gray-800 preview-gray-400 border-gray-300',
      'dark:bg-slate-900/60 dark:text-gray-100 dark:preview-gray-400 dark:border-slate-700',
      '   ',
      isTextarea ? 'resize-y' : '',
      hasError ? 'border-red-500 ring-1 ring-red-400' : '',
    ].join(' ');
  const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1';


  const profile = customerData?.profile;
  const ledger = customerData?.ledger ?? [];
  const ledgerReconciliation = customerData?.ledgerReconciliation ?? null;
  const purchaseHistory = customerData?.purchaseHistory ?? [];
  const registeredDateLabel = formatKnownShamsiDate(getEntityRegisteredDateValue(profile), 'نامشخص');
  const latestPurchaseDateLabel = React.useMemo(() => buildLatestPurchaseDateLabel(purchaseHistory), [purchaseHistory]);

  const lacheckOpenInstallmentDue = React.useMemo(() => buildOpenInstallmentDue(customerInstallmentSales), [customerInstallmentSales]);

  const lacheckOpenInstallmentDueStatus = React.useMemo(() => buildOpenInstallmentDueStatus(lacheckOpenInstallmentDue), [lacheckOpenInstallmentDue]);

  const filteredLedgerEntries = ledger;

  const ledgerPrintStats = React.useMemo(() => ({
    ...buildLedgerPrintStats(ledger),
    totalDebit: Number(ledgerDirectorySummary?.totalDebit ?? buildLedgerPrintStats(ledger).totalDebit),
    totalCredit: Number(ledgerDirectorySummary?.totalCredit ?? buildLedgerPrintStats(ledger).totalCredit),
    latestTransaction: ledgerDirectorySummary?.latestTransaction ?? buildLedgerPrintStats(ledger).latestTransaction,
  }), [ledger, ledgerDirectorySummary]);


  


  if (isLoading) {
    return (
      <div className="p-10 text-center text-gray-500 dark:text-gray-400">
        <i className="fas fa-spinner fa-spin text-3xl mb-3" />
        <p>در حال دریافت اطلاعات مشتری...</p>
      </div>
    );
  }

  if (!customerData || !profile) {
    return (
      <div className="p-10 text-center text-red-500">
        <i className="fas fa-exclamation-circle text-3xl mb-3" />
        <p>اطلاعات مشتری یافت نشد یا خطایی رخ داده است.</p>
      </div>
    );
  }

const latestLedgerEntry = ledgerDirectorySummary?.latestTransaction
    ? ({ transactionDate: ledgerDirectorySummary.latestTransaction } as CustomerLedgerEntry)
    : (ledger[0] ?? null);
  const averageLedgerValue = Number(ledgerDirectorySummary?.total || 0) > 0
    ? Math.round((Number(ledgerDirectorySummary?.totalDebit || 0) + Number(ledgerDirectorySummary?.totalCredit || 0)) / Number(ledgerDirectorySummary?.total || 1))
    : 0;
  const currentBalanceValue = Number(profile.currentBalance || 0);
  const balanceDirectionLabel =
    currentBalanceValue > 0 ? 'بدهکار' : currentBalanceValue < 0 ? 'بستانکار' : 'تسویه';
  const balanceValueText = formatCurrencyText(Math.abs(currentBalanceValue), readStoredCurrencyUnit());
  const balanceToneClass =
    currentBalanceValue > 0
      ? 'border-rose-200 bg-rose-50/80 text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200'
      : currentBalanceValue < 0
        ? 'border-emerald-200 bg-emerald-50/80 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
        : 'border-slate-200 bg-slate-50/80 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300';
  const ledgerStatusSummary = (() => {
    if (!ledgerInsights) {
      return {
        label: currentBalanceValue > 0 ? 'نیازمند پیگیری' : 'عادی',
        tone: currentBalanceValue > 0 ? 'text-amber-600' : 'text-emerald-600',
      };
    }
    if (ledgerInsights.riskLevel === 'high') return { label: 'نیازمند پیگیری', tone: 'text-rose-600 dark:text-rose-300' };
    if (ledgerInsights.riskLevel === 'medium') return { label: 'پیگیری ملایم', tone: 'text-amber-600 dark:text-amber-300' };
    return { label: 'وضعیت مناسب', tone: 'text-emerald-600 dark:text-emerald-300' };
  })();
  const firstInstallmentSaleId = Number(lacheckOpenInstallmentDue?.saleId || customerInstallmentSales[0]?.id || 0);

  const rawTrustScore = Number(customerTrustProfile?.score || 0);
  const effectiveTrustScore = (() => {
    if (!customerTrustProfile || !profile) return rawTrustScore;
    const balance = Number(profile.currentBalance || customerTrustProfile.currentBalance || 0);
    const hasReturnedCheck = Number(customerTrustProfile.returnedCheckCount || 0) > 0;
    const hasActivity = Number(customerTrustProfile.purchaseCount || 0) > 0 || Number(customerTrustProfile.onTimePaymentCount || 0) > 0 || Number(customerTrustProfile.latePaymentCount || 0) > 0 || Math.abs(balance) > 0;
    if (balance < 0 && !hasReturnedCheck) return Math.max(rawTrustScore, Math.abs(balance) >= 5000000 ? 76 : 72);
    if (balance === 0 && hasActivity && !hasReturnedCheck) return Math.max(rawTrustScore, 70);
    return rawTrustScore;
  })();
  const trustTone = getTrustTone(effectiveTrustScore);
  const trustScore = effectiveTrustScore;
  const trustProgressWidth = `${Math.max(0, Math.min(100, trustScore))}%`;

  const getLedgerEntryKind = (entry: any): 'debit' | 'credit' | 'balanced' => {
    const debit = Number(entry?.debit || 0);
    const credit = Number(entry?.credit || 0);
    if (credit > 0 && credit >= debit) return 'credit';
    if (debit > 0) return 'debit';
    return 'balanced';
  };

    const getLedgerEntryContext = (entry: any) => {
    const referenceType = String(entry?.referenceType || '').trim().toLowerCase();
    const raw = String(entry?.description || '').trim();
    const debit = Number(entry?.debit || 0);
    const credit = Number(entry?.credit || 0);

    if (referenceType.includes('installment') || /قسط|اقساط/i.test(raw)) {
      return {
        label: 'قسطی',
        icon: 'fa-file-invoice-dollar',
        tone: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200',
        hint: 'این تراکنش به فروش یا دریافت اقساطی مرتبط است.',
      };
    }

    if (referenceType.includes('repair') || /تعمیر|خدمات/i.test(raw)) {
      return {
        label: 'خدمات',
        icon: 'fa-screwdriver-wrench',
        tone: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-200',
        hint: 'این رکورد به خدمات یا تعمیرات مشتری مرتبط است.',
      };
    }

    if (credit > 0 && /دریافت|پرداخت|تسویه|واریز/i.test(raw)) {
      return {
        label: 'دریافتی',
        icon: 'fa-wallet',
        tone: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200',
        hint: 'این رکورد بابت دریافت وجه از مشتری ثبت شده است.',
      };
    }

    if (debit > 0) {
      return {
        label: 'بدهی',
        icon: 'fa-arrow-trend-up',
        tone: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200',
        hint: 'این تراکنش باعث افزایش مانده بدهی مشتری شده است.',
      };
    }

    return {
      label: 'عمومی',
      icon: 'fa-receipt',
      tone: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
      hint: 'این رکورد به‌صورت عمومی در دفتر حساب ثبت شده است.',
    };
  };

const parseSaleItemMeta = (sale: any) => {
    const rawName = String(sale?.itemName || '').trim();
    const rawImei = String(sale?.imei || sale?.identifier || '').trim();
    const explicitImei = (rawName.match(/IMEI[:：\-\s]*([^,\)\]\}\-\n]+)/i)?.[1] || '').trim();
    const parenthesizedImei = (rawName.match(/[\(\[\{]\s*([0-9A-Za-z\-_.]{10,20})\s*[\)\]\}]/)?.[1] || '').trim();
    const imei = rawImei || explicitImei || parenthesizedImei;
    const cleanName = String(sale?.cleanName || rawName)
      .replace(/\s*[\(\[\{]\s*IMEI[:：\-\s]*[0-9A-Za-z\-_.]+\s*[\)\]\}]?\s*/ig, ' ')
      .replace(/\s*[\(\[\{]\s*[0-9A-Za-z\-_.]{10,20}\s*[\)\]\}]\s*/g, ' ')
      .replace(/\s*[-–—|:،,]\s*IMEI[:：\-\s]*[0-9A-Za-z\-_.]+.*$/ig, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
    const paymentMethod = String(sale?.purchaseType || sale?.saleType || sale?.paymentMethod || '').toLowerCase();
    const purchaseType = paymentMethod === 'installment' ? 'installment' : paymentMethod === 'credit' ? 'credit' : 'cash';
    const purchaseTypeLabel = sale?.purchaseTypeLabel || (purchaseType === 'installment' ? 'اقساطی' : purchaseType === 'credit' ? 'اعتباری' : 'نقدی');
    return { cleanName: cleanName || rawName || '—', imei, purchaseType, purchaseTypeLabel };
  };

  const parseLedgerMeta = (description?: string) => {
    const raw = String(description || '').trim();
    const imei = ((raw.match(/IMEI[:：]\s*([^,\)\n]*)/i)?.[1] || '').replace(/\s+[-–—]\s+.*$/, '').trim());
    const saleId = (
      raw.match(/شناسه\s*فروش(?:\s*اقساطی)?[:：]?\s*(\d+)/i)?.[1] ||
      raw.match(/معامله\s*شماره\s*(\d+)/i)?.[1] ||
      ''
    ).trim();
    const invoiceId = (
      raw.match(/(?:فاکتور|invoice).*?(?:شماره|#)\s*(\d+)/i)?.[1] ||
      raw.match(/(?:فاکتور|invoice)\s*#?\s*(\d+)/i)?.[1] ||
      ''
    ).trim();
    const typeMatch = raw.match(/^(خرید\s+اقساطی|خرید\s+نقدی|دریافت|پرداخت|هزینه|بدهی|بستانکاری|ثبت اطلاعات\s*تراکنش|فاکتور\s+فروش\s+اعتباری)/i);
    const typeLabel = typeMatch?.[1] ? typeMatch[1].trim() : '';
    const itemMatch = raw.match(/موارد[:：]\s*(.*?)(?:\s*[،,]\s*(?:مبلغ\s*کل|پیش\s*پرداخت|پیش‌پرداخت|بدهکار|بستانکار|مانده)|\n|$)/i);
    const shortSource = itemMatch?.[1] || raw.split(/موارد[:：]/i)[1] || raw;
    const summary = shortSource
      .replace(/\(\s*شناسه\s*فروش(?:\s*اقساطی)?[:：]?\s*\d+\s*\)/g, '')
      .replace(/\(\s*IMEI[:：].*?\)\s*/i, '')
      .replace(/\s*[-–—|:،,]\s*IMEI[:：].*$/i, '')
      .replace(/\s*(مبلغ\s*کل|پیش\s*پرداخت|پیش‌پرداخت|بدهکار|بستانکار|مانده)[:：]?.*$/i, '')
      .replace(/\s{2,}/g, ' ')
      .trim()
      .replace(/^،\s*/, '')
      .replace(/[،,]\s*$/, '');
    const details: string[] = [];
    if (typeLabel) details.push(typeLabel);
    if (saleId) details.push(`شناسه فروش: ${saleId}`);
    if (invoiceId) details.push(`شماره فاکتور: ${invoiceId}`);
    return { summary: summary || typeLabel || raw || '—', imei, saleId, invoiceId, typeLabel, details: details.join(' • '), raw };
  };

  const getLedgerSourceLink = (entry: CustomerLedgerEntry, meta = parseLedgerMeta(entry.description)) => {
    const backendUrl = String((entry as any)?.sourceUrl || '').trim();
    const backendLabel = String((entry as any)?.sourceLabel || '').trim();
    const hasBackendSource = Boolean((entry as any)?.sourceKind || (entry as any)?.sourceId || backendLabel);
    if (hasBackendSource && !backendUrl) return null;
    if (backendUrl && backendLabel) {
      return {
        path: backendUrl,
        label: backendLabel,
        shortLabel: backendLabel.replace(/\s+#.*$/, ''),
        icon: String((entry as any)?.sourceIcon || 'fa-solid fa-arrow-up-right-from-square'),
        resolved: Boolean((entry as any)?.sourceResolved),
      };
    }

    const referenceType = String((entry as any)?.referenceType || '').trim().toLowerCase();
    const raw = String((meta as any)?.raw || entry?.description || '').trim();
    const refId = Number((entry as any)?.referenceId || 0);
    const isInstallmentTransactionRef = referenceType === 'installment_payment_tx';
    const installmentId = Number((meta as any)?.saleId || (!isInstallmentTransactionRef && referenceType.includes('installment') ? refId : 0));
    if (installmentId && (referenceType.includes('installment') || /قسط|اقساط|فروش\s*اقساطی/i.test(raw))) {
      const target = buildFinancialSourceTarget({ kind: 'installment_sale', id: installmentId });
      return target ? { ...target, resolved: false } : null;
    }

    const invoiceId = Number((referenceType.includes('sales_order') ? refId : 0) || (meta as any)?.invoiceId || 0);
    if (invoiceId && (referenceType.includes('sales_order') || /فاکتور|invoice/i.test(raw))) {
      const target = buildFinancialSourceTarget({ kind: 'sales_order', id: invoiceId });
      return target ? { ...target, resolved: false } : null;
    }

    const legacySaleId = Number((meta as any)?.saleId || 0);
    if (legacySaleId && /خرید\s*(?:نقدی|اعتباری)|فروش\s*نقدی|شناسه\s*فروش/i.test(raw) && !/قسط|اقساط/i.test(raw)) {
      const target = buildFinancialSourceTarget({ kind: 'legacy_sale', id: legacySaleId });
      return target ? { ...target, resolved: false } : null;
    }

    const repairId = Number(referenceType.includes('repair') ? refId : raw.match(/(?:تعمیر|repair).*?(?:شماره|#|شناسه)?\s*(\d+)/i)?.[1] || 0);
    if (repairId > 0) {
      const target = buildFinancialSourceTarget({ kind: 'repair', id: repairId });
      return target ? { ...target, resolved: false } : null;
    }

    return null;
  };

  const editingEntryMeta = editingEntry ? parseLedgerMeta(String(editingEntry.description || '')) : null;
  const editingEntrySourceTarget = editingEntry && editingEntryMeta
    ? getLedgerSourceLink(editingEntry as CustomerLedgerEntry, editingEntryMeta as any)
    : null;
  const editingEntryDebitValue = Number(editingEntry?.debit || 0);
  const editingEntryCreditValue = Number(editingEntry?.credit || 0);
  const editingEntryKind = editingEntryCreditValue > 0 ? 'credit' : editingEntryDebitValue > 0 ? 'debit' : 'balanced';
  const editingEntryKindLabel = editingEntryKind === 'credit' ? 'دریافتی / بستانکار' : editingEntryKind === 'debit' ? 'پرداخت / بدهکار' : 'رکورد متعادل';
  const editingEntryKindTone = editingEntryKind === 'credit'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
    : editingEntryKind === 'debit'
      ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200'
      : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300';
  const editingEntryAmountText = formatCurrencyText(Math.max(Math.abs(editingEntryCreditValue), Math.abs(editingEntryDebitValue)), readStoredCurrencyUnit());

  const lacheckRecordedPaymentEntry = ledger.find((entry) => Number(entry?.credit || 0) > 0) || null;
  const lacheckRecordedPaymentMeta = lacheckRecordedPaymentEntry ? classifyLedgerPayment(lacheckRecordedPaymentEntry) : null;

  const sanitizePhone = (value?: string | null) => String(value || '').replace(/[^\d+]/g, '');
  const normalizeWhatsAppPhone = (value?: string | null) => {
    const raw = sanitizePhone(value).replace(/^00/, '+');
    if (!raw) return '';
    if (raw.startsWith('+')) return raw.slice(1);
    if (raw.startsWith('98')) return raw;
    if (raw.startsWith('0')) return `98${raw.slice(1)}`;
    return raw;
  };
  const copyPhoneToClipboard = async (phone: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(phone);
        return true;
      }
    } catch {}
    return false;
  };
  const openTel = async () => {
    const phone = sanitizePhone(profile.phoneNumber);
    if (!phone) {
      setNotification({ type: 'error', text: 'برای این مشتری شماره تماس ثبت نشده است.' });
      return;
    }

    const telUrl = `tel:${phone}`;
    const isDesktop = !/android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent || '');
    if (isDesktop) {
      const copied = await copyPhoneToClipboard(phone);
      setNotification({
        type: 'info',
        text: copied
          ? 'شماره تماس کپی شد. اگر روی این سیستم برنامه تماس نصب باشد، صفحه تماس نیز باز می‌شود.'
          : 'در حال تلاش برای باز کردن تماس. اگر انجام نشد، شماره تماس را دستی استفاده کنید.',
      });
    }

    try {
      window.location.href = telUrl;
    } catch {
      const copied = await copyPhoneToClipboard(phone);
      setNotification({
        type: copied ? 'info' : 'error',
        text: copied ? 'امکان باز کردن تماس نبود؛ شماره تماس کپی شد.' : 'امکان باز کردن تماس روی این دستگاه وجود ندارد.',
      });
    }
  };
  const openWhatsApp = () => {
    const phone = normalizeWhatsAppPhone(profile.phoneNumber);
    if (!phone) {
      setNotification({ type: 'error', text: 'برای این مشتری شماره موبایل معتبر ثبت نشده است.' });
      return;
    }
    const url = `https://wa.me/${phone}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };
  const openCustomerTelegram = () => {
    setPrefillMessageText(`سلام ${profile.fullName} عزیز،`);
    setPrefillChannels({ telegram: true, sms: false });
    setIsMessageModalOpen(true);
  };
  const goToCashSale = () => navigate('/sales/cash', { state: { prefillCustomerId: profile.id, prefillCustomerName: profile.fullName } });
  const goToInstallmentSale = () => navigate('/installment-sales/new', { state: { prefillCustomerId: profile.id, prefillCustomerName: profile.fullName } });
  const goToRepair = () => navigate('/repairs/new', { state: { prefillCustomerId: profile.id, prefillCustomerName: profile.fullName } });
  const scrollToLedger = () => document.getElementById('customer-ledger-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const scrollToHistory = () => document.getElementById('customer-history-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const fetchAllLedgerRowsForPrint = async (): Promise<CustomerLedgerEntry[]> => {
    const customerId = Number(id || 0);
    if (!customerId || !token) return [];
    const rows: CustomerLedgerEntry[] = [];
    let targetPage = 1;
    let totalPagesForPrint = 1;
    do {
      const params = new URLSearchParams({ page: String(targetPage), pageSize: '100', direction: 'all', range: 'all', includeSummary: '0', ts: String(Date.now()) });
      const response = await apiFetch(`/api/customers/${customerId}/ledger?${params.toString()}`, { headers: getAuthHeaders(token), cache: 'no-store' });
      const result = await response.json();
      const data = result?.data;
      if (!response.ok || !result?.success || !data || !Array.isArray(data.items)) throw new Error(result?.message || 'خطا در آماده‌سازی دفتر حساب برای چاپ');
      rows.push(...data.items);
      totalPagesForPrint = Math.max(1, Number(data.totalPages || 1));
      targetPage += 1;
    } while (targetPage <= totalPagesForPrint);
    return rows;
  };

  const printProfile = async () => {
    try {
      const printRows = await fetchAllLedgerRowsForPrint();
      setLedgerPrintRows(printRows);
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
      printArea('#customer-ledger-print-area', {
    title: `گزارش مالی مشتری ${profile.fullName}`,
    extraCss: `
      @page { size: A4 landscape; margin: 6mm; }
      body { padding: 0; font-family: Vazir, Tahoma, sans-serif; color: #0f172a; background: #fff; }
      .customer-print-report { direction: rtl; text-align: right; max-width: 281mm; margin: 0 auto; }
      .customer-print-report__masthead { display: grid; grid-template-columns: 1.08fr .92fr; align-items: start; gap: 8px; margin-bottom: 8px; padding: 9px 11px; border: 1px solid #dbe5f0; border-radius: 16px; background: linear-gradient(180deg, #ffffff, #f8fbff); }
      .customer-print-report__brand { display: flex; flex-direction: column; gap: 4px; }
      .customer-print-report__brand-badge { display: inline-flex; align-items: center; gap: 6px; width: fit-content; padding: 4px 10px; border-radius: 999px; background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; font-size: 11px; font-weight: 900; }
      .customer-print-report__brand-name { font-size: 18px; font-weight: 950; margin: 0; }
      .customer-print-report__brand-subtitle { font-size: 10px; color: #475569; line-height: 1.6; margin: 0; }
      .customer-print-report__meta { display: grid; gap: 4px; min-width: 0; max-width: none; font-size: 10px; color: #334155; }
      .customer-print-report__meta-item { display: flex; justify-content: space-between; gap: 8px; }
      .customer-print-report__meta-label { color: #64748b; }
      .customer-print-report__panel-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-bottom: 8px; }
      .customer-print-panel { border: 1px solid #dbe5f0; border-radius: 16px; background: #fff; padding: 8px 10px; min-height: 96px; }
      .customer-print-panel__title { font-size: 11px; font-weight: 900; color: #334155; margin-bottom: 6px; }
      .customer-print-profile-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px 10px; }
      .customer-print-profile-item { display: grid; gap: 2px; }
      .customer-print-profile-item span { font-size: 10px; color: #64748b; }
      .customer-print-profile-item strong { font-size: 11px; color: #0f172a; line-height: 1.45; }
      .customer-print-balance-card { border-radius: 16px; padding: 9px 10px; background: linear-gradient(180deg, #ffffff, #f8fafc); border: 1px solid #dbe5f0; min-height: 96px; display: flex; flex-direction: column; justify-content: center; }
      .customer-print-balance-card__eyebrow { font-size: 10px; color: #64748b; font-weight: 800; }
      .customer-print-balance-card__value { margin-top: 4px; font-size: 16px; font-weight: 950; }
      .customer-print-balance-card__hint { margin-top: 3px; font-size: 10px; line-height: 1.55; color: #475569; }
      .customer-print-balance-card--debit .customer-print-balance-card__value { color: #be123c; }
      .customer-print-balance-card--credit .customer-print-balance-card__value { color: #047857; }
      .customer-print-balance-card--settled .customer-print-balance-card__value { color: #0f172a; }
      .customer-print-summary { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; margin: 0 0 8px; }
      .customer-print-summary__item { border: 1px solid #cbd5e1; border-radius: 14px; padding: 7px 9px; background: linear-gradient(180deg, #ffffff, #f8fafc); min-height: 46px; }
      .customer-print-summary__item span { font-size: 10px; color: #64748b; }
      .customer-print-summary__item strong { display: block; margin-top: 3px; font-size: 12px; color: #0f172a; }
      .customer-print-table-wrap { border: 1px solid #dbe5f0; border-radius: 16px; overflow: hidden; }
      .customer-print-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
      .customer-print-table th, .customer-print-table td { border: 1px solid #e2e8f0; padding: 5px 6px; font-size: 10px; vertical-align: top; word-break: break-word; }
      .customer-print-table thead th { background: #eff6ff; color: #1e3a8a; font-weight: 900; }
      .customer-print-table tbody tr:nth-child(even) td { background: #f8fafc; }
      .customer-print-row--debit td { background: #fff7f8; }
      .customer-print-row--credit td { background: #f2fbf7; }
      .customer-print-type-badge { display: inline-flex; align-items: center; gap: 4px; border-radius: 999px; padding: 2px 7px; font-size: 9px; font-weight: 900; white-space: nowrap; }
      .customer-print-type-badge--debit { background: #ffe4e6; color: #be123c; }
      .customer-print-type-badge--credit { background: #d1fae5; color: #047857; }
      .customer-print-type-badge--balanced { background: #e2e8f0; color: #334155; }
      .customer-print-table tfoot td { background: #eef2ff; font-weight: 900; }
      .customer-print-footnote { margin-top: 8px; font-size: 9px; color: #64748b; line-height: 1.6; }
      @media print {
        .customer-print-report__masthead, .customer-print-panel, .customer-print-balance-card, .customer-print-summary__item, .customer-print-table-wrap { break-inside: avoid; page-break-inside: avoid; }
      }
      @media screen and (max-width: 640px) {
        .customer-print-report__masthead, .customer-print-report__panel-grid, .customer-print-summary, .customer-print-profile-grid { display: grid; grid-template-columns: 1fr; }
      }
    `,
  });
    } catch (error: any) {
      setNotification({ type: 'error', text: error?.message || 'آماده‌سازی گزارش چاپ انجام نشد.' });
    }
  };
  const customerTelegramChatId = String((profile as any).telegramChatId || (profile as any).telegram_chat_id || '').trim();
  const customerTelegramLinkedAtRaw = String((profile as any).telegram_linked_at || '').trim();
  const customerTelegramLinked = !!customerTelegramChatId;
  const customerTelegramLinkedAt = customerTelegramLinkedAtRaw ? formatIsoToShamsi(customerTelegramLinkedAtRaw) : null;
  const brandStoreName = readStoredBranding()?.storeName || 'فروشگاه کوروش';
  const buildTelegramTemplateVars = (profileData: any) => {
    const unit = readStoredCurrencyUnit();
    const openSales = [...customerInstallmentSales]
      .filter((sale) => {
        const status = String(sale?.overallStatus || '').trim().toLowerCase();
        return ![
          'تکمیل شده',
          'فسخ شده',
          'completed',
          'settled',
          'canceled',
          'cancelled',
        ].includes(status);
      })
      .sort((a, b) => String(a?.nextDueDate || '9999/99/99').localeCompare(String(b?.nextDueDate || '9999/99/99')));
    const activeSale = openSales[0];
    const amountValue = activeSale
      ? Number(activeSale.installmentAmount || activeSale.remainingAmount || profileData?.currentBalance || 0)
      : Math.abs(Number(profileData?.currentBalance || 0));
    const dueDate = String(activeSale?.nextDueDate || '');
    const amount = formatCurrencyText(amountValue, unit);
    const customerLink = typeof window === 'undefined' ? '' : `${window.location.origin}/#/customers/${profileData?.id}`;
    return {
      name: String(profileData?.fullName || ''),
      phone: String(profileData?.phoneNumber || ''),
      amount,
      dueDate,
      days: '',
      saleId: String(activeSale?.id || ''),
      link: customerLink,
    };
  };
  const tgQuickPreviewText = (() => {
    const raw = String(tgQuickReply || '').trim();
    if (!raw) return '';
    const vars = buildTelegramTemplateVars(profile || {});
    return raw.replace(/\{(\w+)\}/g, (_match, key: keyof ReturnType<typeof buildTelegramTemplateVars>) => {
      const value = vars[key] ?? '';
      return value === '' ? '—' : String(value);
    });
  })();

  const quickActions = [
    { key: 'call', label: 'تماس', sub: 'شماره مشتری', icon: 'fa-solid fa-phone', onClick: openTel, tone: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
    { key: 'whatsapp', label: 'واتساپ', sub: 'ارسال مستقیم پیام', icon: 'fa-brands fa-whatsapp', onClick: openWhatsApp, tone: 'text-sky-700 bg-sky-50 border-sky-100' },
    { key: 'telegram', label: 'ارسال پیام', sub: 'پنل ارتباطی', icon: 'fa-brands fa-telegram', onClick: openCustomerTelegram, tone: 'text-indigo-700 bg-indigo-50 border-indigo-100' },
    { key: 'sale', label: 'ثبت فروش', sub: 'فروش نقدی', icon: 'fa-solid fa-cart-plus', onClick: goToCashSale, tone: 'text-fuchsia-700 bg-fuchsia-50 border-fuchsia-100' },
    { key: 'repair', label: 'ثبت تعمیر', sub: 'پذیرش جدید', icon: 'fa-solid fa-screwdriver-wrench', onClick: goToRepair, tone: 'text-amber-700 bg-amber-50 border-amber-100' },
    { key: 'installment', label: 'ثبت فروش اقساطی', sub: 'فروش اقساطی', icon: 'fa-solid fa-file-invoice-dollar', onClick: goToInstallmentSale, tone: 'text-violet-700 bg-violet-50 border-violet-100' },
    { key: 'history', label: 'مشاهده سوابق', sub: 'خریدها و دفتر', icon: 'fa-solid fa-clock-rotate-left', onClick: scrollToHistory, tone: 'text-slate-700 bg-slate-50 border-slate-200' },
    { key: 'print', label: 'چاپ / PDF', sub: 'خروجی پرونده', icon: 'fa-solid fa-print', onClick: printProfile, tone: 'text-slate-700 bg-white border-slate-200 dark:text-slate-200 dark:bg-slate-900/80 dark:border-slate-700' },
  ];

  const managerActionSummary = [
    {
      label: 'اولویت فعلی',
      value: trustScore < 50 ? 'اقدام فوری' : trustScore < 68 ? 'کنترل‌شده' : 'وضعیت پایدار',
      icon: trustScore < 50 ? 'fa-solid fa-bolt' : trustScore < 68 ? 'fa-solid fa-sliders' : 'fa-solid fa-circle-check',
      tone: trustScore < 50
        ? 'border-rose-200 bg-rose-50/80 text-rose-700 dark:border-rose-900/30 dark:bg-rose-950/15 dark:text-rose-200'
        : trustScore < 68
          ? 'border-amber-200 bg-amber-50/80 text-amber-700 dark:border-amber-900/30 dark:bg-amber-950/15 dark:text-amber-200'
          : 'border-emerald-200 bg-emerald-50/80 text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-950/15 dark:text-emerald-200',
      ctaLabel: trustScore < 50 ? 'بررسی دفتر حساب' : 'مشاهده روند',
      ctaIcon: trustScore < 50 ? 'fa-solid fa-book-open' : 'fa-solid fa-chart-line',
      onAction: trustScore < 50 ? scrollToLedger : scrollToHistory,
    },
    {
      label: 'تمرکز اصلی',
      value: trustScore < 50 ? 'وصول و پیگیری' : 'پایش پرداخت',
      icon: trustScore < 50 ? 'fa-solid fa-hand-holding-dollar' : 'fa-solid fa-chart-line',
      tone: 'border-sky-200 bg-sky-50/80 text-sky-700 dark:border-sky-900/30 dark:bg-sky-950/15 dark:text-sky-200',
      ctaLabel: trustScore < 50 ? 'رفتن به دفتر حساب' : 'دیدن سوابق',
      ctaIcon: trustScore < 50 ? 'fa-solid fa-book-open-reader' : 'fa-solid fa-clock-rotate-left',
      onAction: trustScore < 50 ? scrollToLedger : scrollToHistory,
    },
    {
      label: 'وضعیت تصمیم',
      value: trustScore < 50 ? 'محدودیت اعتبار' : 'پایش منظم',
      icon: trustScore < 50 ? 'fa-solid fa-shield-halved' : 'fa-solid fa-clipboard-check',
      tone: 'border-violet-200 bg-violet-50/80 text-violet-700 dark:border-violet-900/30 dark:bg-violet-950/15 dark:text-violet-200',
      ctaLabel: trustScore < 50 ? 'ثبت یادداشت پیگیری' : 'ثبت یادداشت',
      ctaIcon: 'fa-regular fa-note-sticky',
      onAction: () => openManagerNoteModal(trustScore < 50 ? 'پیگیری وضعیت تصمیم' : 'پایش وضعیت تصمیم'),
    },
  ];

  const managerActionCards = [
    {
      title: customerTrustProfile && trustScore < 50 ? 'بررسی و پیگیری مطالبات' : 'پایش مستمر وضعیت مشتری',
      text: customerTrustProfile && trustScore < 50 ? 'به دلیل امتیاز پایین و وضعیت بدهی، بررسی دفتر حساب و پیگیری دریافت در اولویت قرار بگیرد.' : 'ثبت منظم پرداخت‌ها و بازبینی دوره‌ای وضعیت مشتری برای حفظ ثبات اعتباری ادامه پیدا کند.',
      icon: customerTrustProfile && trustScore < 50 ? 'fa-solid fa-bell' : 'fa-solid fa-eye',
      tone: customerTrustProfile && trustScore < 50 ? 'border-rose-200 bg-rose-50/70 dark:border-rose-900/30 dark:bg-rose-950/15' : 'border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/45',
      iconTone: customerTrustProfile && trustScore < 50 ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-200' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200',
      tag: customerTrustProfile && trustScore < 50 ? 'فوری' : 'پایش',
      tagTone: customerTrustProfile && trustScore < 50 ? 'border-rose-200 bg-white text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-200' : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300',
      ctaLabel: customerTrustProfile && trustScore < 50 ? 'پیگیری دفتر حساب' : 'مشاهده سوابق',
      ctaIcon: customerTrustProfile && trustScore < 50 ? 'fa-solid fa-book-open' : 'fa-solid fa-clock-rotate-left',
      onAction: customerTrustProfile && trustScore < 50 ? scrollToLedger : scrollToHistory,
    },
    {
      title: 'کنترل سقف اعتبار',
      text: 'تا بهبود سابقه پرداخت یا کاهش بدهی، از افزایش سقف اعتبار مشتری خودداری شود.',
      icon: 'fa-solid fa-shield-halved',
      tone: 'border-amber-200 bg-amber-50/70 dark:border-amber-900/30 dark:bg-amber-950/15',
      iconTone: 'bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-200',
      tag: 'سیاست اعتباری',
      tagTone: 'border-amber-200 bg-white text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200',
      ctaLabel: 'ثبت یادداشت کنترل',
      ctaIcon: 'fa-solid fa-pen-to-square',
      onAction: () => openManagerNoteModal('کنترل سقف اعتبار'),
    },
    {
      title: 'ارتباط و مذاکره با مشتری',
      text: 'برقراری تماس و توافق روی برنامه پرداخت می‌تواند ریسک را کاهش دهد و تصمیم‌گیری بعدی را دقیق‌تر کند.',
      icon: 'fa-solid fa-user-group',
      tone: 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/30 dark:bg-emerald-950/15',
      iconTone: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-200',
      tag: 'اقدام تعاملی',
      tagTone: 'border-emerald-200 bg-white text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200',
      ctaLabel: 'شروع تماس',
      ctaIcon: 'fa-solid fa-phone',
      onAction: openTel,
    },
  ];

  const profileOverviewStats = [
    { label: 'شناسه مشتری', value: `C-${profile.id.toLocaleString('fa-IR')}`, icon: 'fa-solid fa-hashtag', tone: 'text-slate-700 bg-slate-50 border-slate-200 dark:text-slate-200 dark:bg-slate-900 dark:border-slate-800' },
    { label: 'تاریخ ثبت‌نام', value: registeredDateLabel, icon: 'fa-regular fa-calendar-plus', tone: 'text-sky-700 bg-sky-50 border-sky-100 dark:text-sky-200 dark:bg-sky-950/20 dark:border-sky-900/30' },
    { label: 'آخرین خرید', value: purchaseHistory.length ? formatKnownShamsiDate((purchaseHistory[0] as any)?.transactionDate || (purchaseHistory[0] as any)?.createdAt, '—') : '—', icon: 'fa-solid fa-bag-shopping', tone: 'text-violet-700 bg-violet-50 border-violet-100 dark:text-violet-200 dark:bg-violet-950/20 dark:border-violet-900/30' },
    { label: 'تعداد خریدها', value: purchaseHistory.length.toLocaleString('fa-IR'), icon: 'fa-solid fa-basket-shopping', tone: 'text-emerald-700 bg-emerald-50 border-emerald-100 dark:text-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/30' },
    { label: 'تعداد گردش دفتر', value: Number(ledgerDirectorySummary?.total ?? ledgerTotal ?? 0).toLocaleString('fa-IR'), icon: 'fa-solid fa-book-open-reader', tone: 'text-amber-700 bg-amber-50 border-amber-100 dark:text-amber-200 dark:bg-amber-950/20 dark:border-amber-900/30' },
  ];

  const renderCtx = {
    Button,
    FinancialStatusBadge,
    FormErrorSummary,
    MessageComposerModal,
    Modal,
    ModalActions,
    ModalField,
    Notification,
    PriceInput,
    ShamsiDatePicker,
    TelegramLinkModal,
    applyTgQuickPreset,
    averageLedgerValue,
    balanceDirectionLabel,
    balanceValueText,
    customerTrustHistory,
    customerTrustHistoryLoading,
    customerTrustLoading,
    customerTrustProfile,
    editFormErrors,
    editingCustomer,
    editingEntry,
    editingEntryAmountText,
    editingEntryKindLabel,
    editingEntrySourceTarget,
    expandedLedgerEntryId,
    fetchCustomerDetails,
    fetchTelegramConversation,
    filteredLedgerEntries,
    firstInstallmentSaleId,
    formatCurrencyText,
    formatIsoToShamsi,
    formatKnownShamsiDate,
    formatLedgerCurrency,
    formatPrice,
    getAuthHeaders,
    getBalanceLabel,
    getBalanceState,
    getLedgerEntryContext,
    getLedgerEntryKind,
    getLedgerSourceLink,
    handleEditInputChange,
    handleEditSubmit,
    handleLedgerDelete,
    handleLedgerEdit,
    handleLedgerInputChange,
    handleLedgerSubmit,
    handleManagerNoteSubmit,
    handleTransactionTypeChange,
    id,
    inputClass,
    installmentSalesLoading,
    isDeletingEntry,
    isEditModalOpen,
    isLedgerModalOpen,
    isManagerNoteModalOpen,
    isMessageModalOpen,
    isSavingManagerNote,
    isSavingTags,
    isSubmittingEdit,
    isSubmittingLedger,
    jumpToFirstTgResult,
    lacheckOpenInstallmentDue,
    latestLedgerEntry,
    ledger,
    ledgerPrintRows,
    ledgerReconciliation,
    ledgerDateSelected,
    ledgerFormErrors,
    ledgerInsights,
    ledgerRange,
    ledgerRecordedAt,
    ledgerPage,
    ledgerPageSize,
    ledgerTotal,
    ledgerTotalPages,
    ledgerDirectorySummary,
    ledgerDirectoryLoading,
    ledgerDirectoryRefreshing,
    ledgerSearch,
    ledgerStatusSummary,
    managerNoteContext,
    managerNoteDraft,
    managerNotes,
    managerNotesLoading,
    navigate,
    newLedgerEntry,
    normalizeTags,
    notification,
    openEditModal,
    openLedgerModal,
    openQrLinkModal,
    openTelegramReport,
    parseLedgerMeta,
    parseSaleItemMeta,
    prefillChannels,
    prefillMessageText,
    profile,
    purchaseHistory,
    readStoredCurrencyUnit,
    registeredDateLabel,
    sendTgQuickReply,
    setCustomerData,
    setEditFormErrors,
    setEditingCustomer,
    setEditingEntry,
    setExpandedLedgerEntryId,
    setIsEditModalOpen,
    setIsLedgerModalOpen,
    setIsManagerNoteModalOpen,
    setIsMessageModalOpen,
    setLedgerDateSelected,
    setLedgerRange,
    setLedgerSearch,
    setLedgerPage,
    setLedgerPageSize,
    setLedgerViewFilter,
    fetchCustomerLedgerDirectory,
    setManagerNoteDraft,
    setNotification,
    setPrefillChannels,
    setPrefillMessageText,
    setTagInput,
    setTgAttachment,
    setTgChatIdInput,
    setTgDirectionFilter,
    setTgIsSending,
    setTgNewSinceScroll,
    setTgQrOpen,
    setTgQuickReply,
    setTgReplyTo,
    setTgSearchQuery,
    setTgShowChatId,
    tagInput,
    tgAttachment,
    tgChatIdInput,
    tgConvError,
    tgConvItems,
    tgConvLoading,
    tgConvMeta,
    tgDirectionFilter,
    tgFilteredConvItems,
    tgIsSending,
    tgNewSinceScroll,
    tgQrBotUsernameMissing,
    tgQrDeepLink,
    tgQrExpectedPhone,
    tgQrExpiresAt,
    tgQrLoading,
    tgQrOpen,
    tgQuickPreset,
    tgQuickReply,
    tgReplyTo,
    tgSearchQuery,
    tgShowChatId,
    tgTimelineRef,
    token,
    transactionType,
    trustScore,
    trustTone,
    updateTags,
    uploadTelegramAttachment,
    balanceToneClass,
    brandStoreName,
    customerTelegramLinked,
    customerTelegramLinkedAt,
    editingEntryKind,
    editingEntryKindTone,
    lacheckOpenInstallmentDueStatus,
    ledgerPrintStats,
    ledgerViewFilter,
    managerActionCards,
    managerActionSummary,
    printProfile,
    profileOverviewStats,
    quickActions,
    scrollToLedger,
    tgQuickPreviewText,
  };

  return <CustomerDetailRender ctx={renderCtx} />;
};

export default CustomerDetailController;
