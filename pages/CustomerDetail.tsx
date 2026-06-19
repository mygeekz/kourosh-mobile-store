import { useConfirm } from '../contexts/ConfirmContext';
// src/pages/CustomerDetailPage.tsx
import React, { useState, useEffect, useRef, useMemo, FormEvent, ChangeEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import moment from 'jalali-moment';
import {
  CustomerDetailsPageData,
  CustomerLedgerEntry,
  NotificationMessage,
  NewCustomerData,
  NewLedgerEntryData,
  CustomerLedgerInsights,
  InstallmentSale,
} from '../types';
import Notification from '../components/Notification';
import Modal from '../components/Modal';
import ModalField from '../components/ModalField';
import FormErrorSummary from '../components/FormErrorSummary';
import TelegramLinkModal from '../components/TelegramLinkModal';
import MessageComposerModal from '../components/MessageComposerModal';
import ShamsiDatePicker from '../components/ShamsiDatePicker';
import PriceInput from '../components/PriceInput';
import Button from '../components/Button';
import ModalActions from '../components/ModalActions';
import FinancialProgressBar from '../components/FinancialProgressBar';
import FinancialStatusBadge from '../components/FinancialStatusBadge';
import { formatIsoToShamsi } from '../utils/dateUtils';
import { useAuth } from '../contexts/AuthContext';
import { getAuthHeaders } from '../utils/apiUtils';
import { apiFetch } from '../utils/apiFetch';
import { focusFirstError } from '../utils/focusFirstError';
import { focusErrorsSoon, isDuplicateMessage, toSafeNumber } from '../utils/formBehavior';
import { getBalanceLabel, getBalanceState } from '../utils/adaptiveUi';
import { printArea } from '../utils/printArea';
import { readStoredBranding } from '../utils/branding';
import { formatCurrencyText, readStoredCurrencyUnit } from '../utils/currency';

/* رنگ‌دهی بدهکار/بستانکار سازگار با دارک */


const ScoreBar = ({ score }: { score: number }) => {
  const s = Math.max(0, Math.min(100, score || 0));
  const color =
    s >= 80 ? 'bg-emerald-500' : s >= 60 ? 'bg-sky-500' : s >= 40 ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
        <span>امتیاز خوش‌حسابی</span>
        <span className="font-bold text-gray-900 dark:text-gray-100">{s.toLocaleString('fa-IR')} / ۱۰۰</span>
      </div>
      <div className="mt-1 h-2.5 rounded-full bg-gray-200 dark:bg-slate-800 overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${s}%` }} />
      </div>
    </div>
  );
};

const riskPill = (lvl?: 'low'|'medium'|'high') => {
  const base = 'px-2 py-0.5 rounded-full text-xs font-semibold';
  if (lvl === 'high') return <span className={`${base} bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200`}>ریسک بالا</span>;
  if (lvl === 'medium') return <span className={`${base} bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200`}>ریسک متوسط</span>;
  return <span className={`${base} bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200`}>ریسک پایین</span>;
};


type CustomerTrustProfile = {
  customerId: number;
  score: number;
  confidence: number;
  tier: 'excellent' | 'good' | 'medium' | 'risky' | 'unknown';
  tierLabel: string;
  purchaseCount: number;
  totalPurchaseAmount: number;
  creditSalesCount: number;
  installmentSalesCount: number;
  installmentObligationCount: number;
  onTimePaymentCount: number;
  latePaymentCount: number;
  overdueUnpaidCount: number;
  returnedCheckCount: number;
  currentBalance: number;
  suggestedCreditLimit: number;
  remainingSuggestedCredit: number;
  lastPurchaseDate?: string | null;
  reasons?: string[];
};

type CustomerTrustHistoryEvent = {
  date: string;
  type: string;
  title: string;
  description: string;
  impact: number;
  scoreAfter: number;
  amount?: number;
};

type CustomerTrustHistory = {
  currentScore: number;
  currentTier: string;
  timeline: CustomerTrustHistoryEvent[];
  summary: {
    totalEvents: number;
    positiveEvents: number;
    negativeEvents: number;
    lastChange?: CustomerTrustHistoryEvent | null;
  };
};

const getTrustTone = (score?: number | null) => {
  const s = Number(score || 0);
  if (s >= 82) return { label: 'بسیار قابل اعتماد', shell: 'border-emerald-200 bg-emerald-50/90 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/25 dark:text-emerald-200', icon: 'fa-solid fa-user-check' };
  if (s >= 68) return { label: 'قابل اعتماد', shell: 'border-blue-200 bg-blue-50/90 text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/25 dark:text-blue-200', icon: 'fa-solid fa-user-check' };
  if (s >= 50) return { label: 'نیازمند احتیاط', shell: 'border-amber-200 bg-amber-50/90 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-200', icon: 'fa-solid fa-user-clock' };
  return { label: 'پرریسک', shell: 'border-rose-200 bg-rose-50/90 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/25 dark:text-rose-200', icon: 'fa-solid fa-triangle-exclamation' };
};

const formatLedgerCurrency = (amount?: number, type?: 'debit' | 'credit' | 'balance') => {
  if (amount === undefined || amount === null) return formatCurrencyText(0, readStoredCurrencyUnit());

  const amountStrBase = formatCurrencyText(Math.abs(amount), readStoredCurrencyUnit());
  let amountStr = amountStrBase;
  let color = 'text-gray-700 dark:text-gray-300';

  if (type === 'balance') {
    if (amount > 0) {
      color = 'text-red-600 dark:text-rose-400';
      amountStr += ' (بدهکار)';
    } else if (amount < 0) {
      color = 'text-green-700 dark:text-emerald-400';
      amountStr += ' (بستانکار)';
    } else {
      amountStr += ' (تسویه)';
    }
  } else if (type === 'debit' && amount > 0) {
    color = 'text-red-500 dark:text-rose-400';
  } else if (type === 'credit' && amount > 0) {
    color = 'text-green-600 dark:text-emerald-400';
  }

  return <span className={color}>{amountStr}</span>;
};

const renderLedgerTableAmount = (amount?: number, type?: 'debit' | 'credit' | 'balance') => {
  const value = Number(amount || 0);
  if (type !== 'balance' && value <= 0) {
    return <span className="text-slate-400 dark:text-slate-500">—</span>;
  }

  const amountText = formatCurrencyText(Math.abs(value), readStoredCurrencyUnit());
  if (type === 'balance') {
    const label = value > 0 ? 'بدهکار' : value < 0 ? 'بستانکار' : 'تسویه';
    const color = value > 0
      ? 'text-rose-600 dark:text-rose-300'
      : value < 0
        ? 'text-emerald-600 dark:text-emerald-300'
        : 'text-slate-600 dark:text-slate-300';
    return (
      <span className={`inline-flex flex-col items-start gap-0.5 whitespace-nowrap leading-tight ${color}`}>
        <strong className="font-black">{amountText}</strong>
        <small className="text-[11px] font-extrabold">{label}</small>
      </span>
    );
  }

  const color = type === 'credit'
    ? 'text-emerald-600 dark:text-emerald-300'
    : 'text-rose-600 dark:text-rose-300';
  return <span className={`whitespace-nowrap font-black ${color}`}>{amountText}</span>;
};

const normalizeTags = (raw: any): string[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String).map(t => t.trim()).filter(Boolean);
  if (typeof raw === 'string') {
    const s = raw.trim();
    if (!s) return [];
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) return parsed.map(String).map(t => t.trim()).filter(Boolean);
    } catch {}
    return s.split(',').map(t => t.trim()).filter(Boolean);
  }
  return [];
};


const getEntityRegisteredDateValue = (entity: any): string =>
  String(entity?.dateAdded || entity?.createdAt || entity?.created_at || entity?.registrationDate || entity?.transactionDate || '').trim();

const getCustomerPurchaseDateValue = (item: any): string =>
  String(item?.transactionDate || item?.saleDate || item?.purchaseDate || item?.createdAt || item?.updatedAt || '').trim();

const formatKnownShamsiDate = (value?: string | null, fallback: string = 'نامشخص'): string => {
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  const formatted = formatIsoToShamsi(raw);
  return formatted === 'تاریخ نامعتبر' ? fallback : formatted;
};

const ledgerRecordedAt = (entry: CustomerLedgerEntry) =>
  formatIsoToShamsi(entry.createdAt || entry.updatedAt || entry.transactionDate);

const classifyLedgerPayment = (entry: CustomerLedgerEntry) => {
  const raw = String(entry?.description || '').trim();
  const normalized = raw.replace(/‌/g, ' ').replace(/\s+/g, ' ').trim();
  const isInstallment = /(?:دریافت\s+بابت\s+قسط|ثبت اطلاعات\s+پرداخت\s+قسط|قسط\s*\d+)/i.test(normalized);
  const isCreditPayment = /(?:دریافت|واریز|پرداخت\s+مشتری|تسویه)/i.test(normalized);
  if (isInstallment) return { kind: 'installment' as const, label: 'پرداخت قسط', icon: 'fa-money-bill-wave', tone: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/40 dark:bg-violet-950/25 dark:text-violet-200', severity: 'violet' as const };
  if (isCreditPayment) return { kind: 'credit' as const, label: 'پرداخت بدهی', icon: 'fa-wallet', tone: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/25 dark:text-emerald-200', severity: 'success' as const };
  return { kind: 'general' as const, label: 'دریافت ثبت اطلاعات‌شده', icon: 'fa-arrow-down', tone: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/40 dark:bg-sky-950/25 dark:text-sky-200', severity: 'info' as const };
};

const CustomerDetailPage: React.FC = () => {
  const confirmAction = useConfirm();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [customerData, setCustomerData] = useState<CustomerDetailsPageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);
  const [ledgerInsights, setLedgerInsights] = useState<CustomerLedgerInsights | null>(null);
  const [followups, setFollowups] = useState<any[]>([]);
  const [followupNote, setFollowupNote] = useState('');
  const [followupNextDate, setFollowupNextDate] = useState<Date | null>(null);
  const [isSavingFollowup, setIsSavingFollowup] = useState(false);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [customerInstallmentSales, setCustomerInstallmentSales] = useState<InstallmentSale[]>([]);
  const [installmentSalesLoading, setInstallmentSalesLoading] = useState(false);
  const [customerTrustProfile, setCustomerTrustProfile] = useState<CustomerTrustProfile | null>(null);
  const [customerTrustLoading, setCustomerTrustLoading] = useState(false);
  const [customerTrustHistory, setCustomerTrustHistory] = useState<CustomerTrustHistory | null>(null);
  const [customerTrustHistoryLoading, setCustomerTrustHistoryLoading] = useState(false);

  // CRM tags
  const [tagInput, setTagInput] = useState('');
  const [isSavingTags, setIsSavingTags] = useState(false);

  // ویرایش پروفایل
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Partial<NewCustomerData>>({});
  const [editFormErrors, setEditFormErrors] = useState<Partial<NewCustomerData>>({});
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [isManagerNoteModalOpen, setIsManagerNoteModalOpen] = useState(false);
  const [managerNoteContext, setManagerNoteContext] = useState('');
  const [managerNoteDraft, setManagerNoteDraft] = useState('');
  const [isSavingManagerNote, setIsSavingManagerNote] = useState(false);
  const [managerNotes, setManagerNotes] = useState<any[]>([]);
  const [managerNotesLoading, setManagerNotesLoading] = useState(false);

  // ثبت دفتر
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [prefillMessageText, setPrefillMessageText] = useState<string>('');
  const [prefillChannels, setPrefillChannels] = useState<{ sms?: boolean; telegram?: boolean } | undefined>(undefined);

// کارت تلگرام مشتری (برای اپراتور)
const [tgCardText, setTgCardText] = useState<string>('');
const [tgCardParseMode, setTgCardParseMode] = useState<'HTML' | 'Markdown' | 'MarkdownV2' | 'TEXT'>('HTML');
const [tgShowChatId, setTgShowChatId] = useState(false);
const [tgChatIdInput, setTgChatIdInput] = useState('');
const [tgIsSending, setTgIsSending] = useState(false);
const [tgPreset, setTgPreset] = useState<'custom' | 'hello' | 'installment_reminder' | 'payment_link' | 'thank_you' | 'balance_followup' | 'visit_invite'>('custom');

// QR one-tap linking
const [tgQrOpen, setTgQrOpen] = useState(false);
const [tgQrLoading, setTgQrLoading] = useState(false);
const [tgQrDeepLink, setTgQrDeepLink] = useState<string>('');
const [tgQrExpiresAt, setTgQrExpiresAt] = useState<string>('');
const [tgQrExpectedPhone, setTgQrExpectedPhone] = useState<string>('');
const [tgQrBotUsernameMissing, setTgQrBotUsernameMissing] = useState(false);

useEffect(() => {
  const nextChatId = String((customerData?.profile as any)?.telegramChatId || (customerData?.profile as any)?.telegram_chat_id || '').trim();
  setTgChatIdInput(nextChatId);
}, [customerData?.profile]);

  // ✅ QR One‑tap linking (must be defined before render)
  const openQrLinkModal = async () => {
    if (!token) return;
    const cid = customerData?.profile?.id;
    if (!cid) return;

    setTgQrOpen(true);
    setTgQrLoading(true);
    setTgQrDeepLink('');
    setTgQrExpiresAt('');
    setTgQrExpectedPhone('');
    setTgQrBotUsernameMissing(false);

    try {
      const res = await fetch('/api/telegram/link-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
        body: JSON.stringify({ customerId: cid, expiresMinutes: 90 }),
      });
      const j = await res.json().catch(() => ({} as any));
      if (!res.ok || !j?.success) throw new Error(j?.message || 'ساخت QR انجام نشد.');

      const deepLink = String(j?.data?.deepLink || '').trim();
      const tokenStr = String(j?.data?.token || '').trim();

      // اگر bot username تنظیم نشده باشد، deepLink ممکن است ناقص باشد؛ در این حالت توکن را می‌دهیم.
      if (!deepLink || deepLink.includes('t.me/?start=') || deepLink.includes('t.me/?start')) {
        setTgQrBotUsernameMissing(true);
        setTgQrDeepLink(tokenStr ? `link_${tokenStr}` : '');
      } else {
        setTgQrDeepLink(deepLink);
      }

      setTgQrExpiresAt(String(j?.data?.expiresAt || ''));
      setTgQrExpectedPhone(String(j?.data?.expectedPhone || ''));
    } catch (e: any) {
      setNotification({ type: 'error', text: e?.message || 'خطا در ساخت QR' });
    } finally {
      setTgQrLoading(false);
    }
  };

  // Telegram Conversation view (Inbox + Outbox merged)
  type TgConvItem = {
    id: string;
    direction: 'in' | 'out';
    kind: 'message' | 'photo' | 'document' | string;
    text: string;
    createdAt: string;
    status?: string;
    attempts?: number;
    lastError?: string | null;
    errorCategory?: string;
    telegramMessageId?: number | null;
    mediaUrl?: string | null;
  };
  const [tgConvItems, setTgConvItems] = useState<TgConvItem[]>([]);
  const [tgConvMeta, setTgConvMeta] = useState<any>(null);
  const [tgConvLoading, setTgConvLoading] = useState(false);
  const [tgConvError, setTgConvError] = useState<string>('');
  const [tgQuickReply, setTgQuickReply] = useState<string>('');
  const [tgQuickPreset, setTgQuickPreset] = useState<'custom' | 'hello' | 'installment_reminder' | 'payment_link' | 'thank_you' | 'balance_followup' | 'visit_invite'>('custom');

  const [tgReplyTo, setTgReplyTo] = useState<{ telegramMessageId: number; preview: string } | null>(null);
  const [tgAttachment, setTgAttachment] = useState<{ type: 'photo' | 'document'; relPath: string; url: string; mimeType?: string; originalName?: string } | null>(null);
  const tgTimelineRef = useRef<HTMLDivElement | null>(null);
  const [tgAutoRefresh, setTgAutoRefresh] = useState(true);
  const [tgNewSinceScroll, setTgNewSinceScroll] = useState(false);
  const [tgSearchQuery, setTgSearchQuery] = useState('');
  const [tgDirectionFilter, setTgDirectionFilter] = useState<'all' | 'in' | 'out' | 'failed'>('all');

  const tgFilteredConvItems = useMemo(() => {
    const query = tgSearchQuery.trim().toLowerCase();
    return tgConvItems.filter((item) => {
      const directionOk =
        tgDirectionFilter === 'all' ||
        (tgDirectionFilter === 'in' && item.direction === 'in') ||
        (tgDirectionFilter === 'out' && item.direction === 'out') ||
        (tgDirectionFilter === 'failed' && item.direction === 'out' && String(item.status || '') === 'failed');
      if (!directionOk) return false;
      if (!query) return true;
      return [item.text, item.status, item.errorCategory, item.lastError, item.createdAt]
        .map((value) => String(value || '').toLowerCase())
        .some((value) => value.includes(query));
    });
  }, [tgConvItems, tgSearchQuery, tgDirectionFilter]);

  const jumpToFirstTgResult = () => {
    const first = tgFilteredConvItems[0];
    if (!first) return;
    document.getElementById(`tg-customer-msg-${first.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };


  const initialLedgerEntry: NewLedgerEntryData = { description: '', debit: 0, credit: 0 };
  const [newLedgerEntry, setNewLedgerEntry] = useState<NewLedgerEntryData>(initialLedgerEntry);
  const [ledgerDateSelected, setLedgerDateSelected] = useState<Date | null>(new Date());
  const [ledgerFormErrors, setLedgerFormErrors] = useState<Partial<
    NewLedgerEntryData & { amountType?: string; transactionDate?: string }
  >>({});
  const [isSubmittingLedger, setIsSubmittingLedger] = useState(false);
  const [transactionType, setTransactionType] = useState<'debit' | 'credit'>('credit');

  // مدیریت رکورد دفتر
  const [editingEntry, setEditingEntry] = useState<any | null>(null);
  const [isDeletingEntry, setIsDeletingEntry] = useState(false);
  const [ledgerViewFilter, setLedgerViewFilter] = useState<'all' | 'debit' | 'credit' | 'recent'>('all');
  const [expandedLedgerEntryId, setExpandedLedgerEntryId] = useState<number | null>(null);
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerRange, setLedgerRange] = useState<'all' | 'today' | 'week' | 'month'>('all');


  
  const sendLedgerAction = async (type: 'REMINDER' | 'NOTE' | 'FLAG_HIGH_RISK', note?: string) => {
    if (!token || !customerData) return;
    try {
      const res = await fetch(`/api/customers/${customerData.id}/ledger/actions`, {
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
      const res = await fetch(`/api/customers/${customerData.profile.id}/followups`, {
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
      const res = await fetch(`/api/customers/${customerData.profile.id}/followups`, {
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
      const res = await fetch(`/api/customers/${customerData.profile.id}/followups/${followupId}/close`, {
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
      const res = await fetch(`/api/customers/${customerData.profile.id}/risk-override`, {
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
      const res = await fetch(`/api/customers/${customerId}/ledger/insights`, { headers: getAuthHeaders(token) });
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
      const res = await fetch(`/api/customers/${customerId}/trust-profile`, { headers: getAuthHeaders(token) });
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
      const res = await fetch(`/api/customers/${customerId}/trust-profile/history`, { headers: getAuthHeaders(token) });
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
      const response = await fetch(`/api/customers/${customerId}/manager-notes`, {
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



  const fetchCustomerDetails = async () => {
    if (!id || !token) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/customers/${id}`, { headers: getAuthHeaders(token) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'خطا در دریافت اطلاعات مشتری');
      setCustomerData(result.data);
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
      const res = await fetch('/api/installment-sales', { headers: getAuthHeaders(token) });
      const js = await res.json();
      if (!res.ok || js?.success === false) throw new Error(js?.message || 'خطا در دریافت فروش‌های اقساطی');
      const rows = Array.isArray(js?.data) ? js.data : [];
      setCustomerInstallmentSales(rows.filter((row: any) => Number(row?.customerId || 0) === Number(customerId)));
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
      const res = await fetch(`/api/telegram/conversation?customerId=${customerId}&limit=300`, {
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
      const response = await fetch(`/api/customers/${id}/tags`, {
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
    const cid = Number((customerData as any)?.profile?.id || (customerData as any)?.id || 0);
    if (!cid || !token) return;
    fetchTelegramConversation(cid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, (customerData as any)?.profile?.id, (customerData as any)?.profile?.telegramChatId, (customerData as any)?.profile?.telegram_chat_id]);

  const openEditModal = () => {
    if (!customerData?.profile) return;
    setEditingCustomer({
      fullName: customerData.profile.fullName,
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
    setEditFormErrors(errors);
    focusErrorsSoon(errors as any, { fullName: 'editFullName', phoneNumber: 'editPhoneNumber' });
    return Object.keys(errors).length === 0;
  };

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmittingEdit) return;
    if (!validateEditForm() || !id || !token) return;
    setIsSubmittingEdit(true);
    setNotification(null);
    try {
      const response = await fetch(`/api/customers/${id}`, {
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
      const response = await fetch(`/api/customers/${id}/manager-notes`, {
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
      const response = await fetch(`/api/customers/${id}/ledger`, {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'خطا در ثبت اطلاعات تراکنش در دفتر حساب');
      setNotification({ type: 'success', text: 'تراکنش با موفقیت ثبت شد.' });
      setIsLedgerModalOpen(false);
      fetchCustomerDetails();
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
      const response = await fetch(`/api/customers/${id}/ledger/${entryId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(token),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'حذف مورد انجام نشد');
      await fetchCustomerDetails();
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
      const response = await fetch(`/api/customers/${id}/ledger/${editingEntry.id}`, {
        method: 'PUT',
        headers: { ...getAuthHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'ویرایش اطلاعات انجام نشد');
      setEditingEntry(null);
      await fetchCustomerDetails();
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
      const res = await fetch(`/api/reports/customer/${customerData.profile.id}/message`, { headers: getAuthHeaders(token) });
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
  const purchaseHistory = customerData?.purchaseHistory ?? [];
  const registeredDateLabel = formatKnownShamsiDate(getEntityRegisteredDateValue(profile), 'نامشخص');
  const latestPurchaseDateLabel = (() => {
    const firstPurchaseWithDate = purchaseHistory.find((item: any) => getCustomerPurchaseDateValue(item));
    return firstPurchaseWithDate ? formatKnownShamsiDate(getCustomerPurchaseDateValue(firstPurchaseWithDate), '—') : '—';
  })();

  const lacheckOpenInstallmentDue = React.useMemo(() => {
    const dueItems = customerInstallmentSales.flatMap((sale) => {
      const summary = String(sale?.itemsSummary || sale?.phoneModel || 'فروش اقساطی').trim();
      return (sale?.payments || [])
        .filter((payment: any) => !payment?.paid && Number(payment?.amountDue || 0) > 0 && String(payment?.dueDate || '').trim())
        .map((payment: any) => ({
          saleId: Number(sale.id),
          paymentId: Number(payment.id),
          installmentNumber: Number(payment.installmentNumber || 0),
          dueDate: String(payment.dueDate),
          amountDue: Number(payment.amountDue || 0),
          summary,
          overallStatus: String(sale?.overallStatus || ''),
        }));
    });

    if (!dueItems.length) return null;

    const sorted = dueItems.sort((a, b) => {
      const ma = moment(a.dueDate, 'jYYYY/jMM/jDD', true);
      const mb = moment(b.dueDate, 'jYYYY/jMM/jDD', true);
      const ta = ma.isValid() ? ma.valueOf() : Number.MAX_SAFE_INTEGER;
      const tb = mb.isValid() ? mb.valueOf() : Number.MAX_SAFE_INTEGER;
      if (ta !== tb) return ta - tb;
      return a.installmentNumber - b.installmentNumber;
    });

    return sorted[0];
  }, [customerInstallmentSales]);


  const lacheckOpenInstallmentDueStatus = React.useMemo(() => {
    if (!lacheckOpenInstallmentDue?.dueDate) {
      return {
        label: 'بدون سررسید باز',
        hint: 'در حال حاضر قسط بازی برای این مشتری ثبت اطلاعات نشده است.',
        tone: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
        icon: 'fa-badge-check',
        severity: 'neutral' as const,
      };
    }

    const today = moment().startOf('day');
    const due = moment(lacheckOpenInstallmentDue.dueDate, 'jYYYY/jMM/jDD', true).startOf('day');
    if (!due.isValid()) {
      return {
        label: 'تاریخ نامعتبر',
        hint: 'تاریخ سررسید این قسط معتبر نیست و نیاز به بررسی و ادامه دارد.',
        tone: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
        icon: 'fa-calendar-xmark',
        severity: 'neutral' as const,
      };
    }

    const dayDiff = due.diff(today, 'days');
    if (dayDiff < 0) {
      const overdueDays = Math.abs(dayDiff).toLocaleString('fa-IR');
      return {
        label: 'عقب‌افتاده',
        hint: `${overdueDays} روز از این سررسید گذشته است.`,
        tone: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200',
        icon: 'fa-triangle-exclamation',
        severity: 'danger' as const,
      };
    }
    if (dayDiff === 0) {
      return {
        label: 'امروز',
        hint: 'این قسط امروز سررسید می‌شود و بهتر است امروز پیگیری شود.',
        tone: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200',
        icon: 'fa-clock',
        severity: 'warning' as const,
      };
    }
    if (dayDiff === 1) {
      return {
        label: 'فردا',
        hint: 'این قسط فردا سررسید می‌شود.',
        tone: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-200',
        icon: 'fa-calendar-day',
        severity: 'info' as const,
      };
    }
    const inDays = dayDiff.toLocaleString('fa-IR');
    return {
      label: `${inDays} روز دیگر`,
      hint: `تا این سررسید ${inDays} روز باقی مانده است.`,
      tone: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200',
      icon: 'fa-calendar-check',
      severity: 'success' as const,
    };
  }, [lacheckOpenInstallmentDue]);

  const filteredLedgerEntries = React.useMemo(() => {
    const now = Date.now();
    const q = ledgerSearch.trim().toLowerCase();
    return ledger.filter((entry) => {
      const debit = Number(entry.debit || 0);
      const credit = Number(entry.credit || 0);
      const ts = new Date(entry.transactionDate || '').getTime();
      if (ledgerViewFilter === 'debit' && debit <= 0) return false;
      if (ledgerViewFilter === 'credit' && credit <= 0) return false;
      if (ledgerViewFilter === 'recent' && (!ts || now - ts > 31 * 24 * 60 * 60 * 1000)) return false;
      if (ledgerRange === 'today') {
        const d = new Date();
        const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
        if (!ts || ts < start) return false;
      }
      if (ledgerRange === 'week' && (!ts || now - ts > 7 * 24 * 60 * 60 * 1000)) return false;
      if (ledgerRange === 'month' && (!ts || now - ts > 31 * 24 * 60 * 60 * 1000)) return false;
      if (q) {
        const hay = [entry.description, entry.transactionDate, entry.createdAt, entry.updatedAt, String(entry.balance ?? ''), String(entry.debit ?? ''), String(entry.credit ?? '')]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [ledger, ledgerViewFilter, ledgerSearch, ledgerRange]);


  


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

const latestLedgerEntry = ledger[0] ?? null;
  const averageLedgerValue = ledger.length
    ? Math.round(
        ledger.reduce((sum, item) => sum + Math.max(Number(item?.credit || 0), Number(item?.debit || 0)), 0) / ledger.length
      )
    : 0;
  const currentBalanceValue = Number(profile.currentBalance || 0);
  const balanceDirectionLabel =
    currentBalanceValue > 0 ? 'بدهکار' : currentBalanceValue < 0 ? 'بستانکار' : 'تسویه';
  const balanceValueText = formatCurrencyText(Math.abs(currentBalanceValue), readStoredCurrencyUnit());
  const balanceToneClass =
    currentBalanceValue > 0
      ? 'border-rose-200 bg-rose-50/80 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200'
      : currentBalanceValue < 0
        ? 'border-emerald-200 bg-emerald-50/80 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200'
        : 'border-slate-200 bg-slate-50/80 text-slate-600 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300';
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

  const trustTone = getTrustTone(customerTrustProfile?.score);
  const trustScore = Number(customerTrustProfile?.score || 0);
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
        tone: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200',
        hint: 'این رکورد بابت دریافت وجه از مشتری ثبت شده است.',
      };
    }

    if (debit > 0) {
      return {
        label: 'بدهی',
        icon: 'fa-arrow-trend-up',
        tone: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200',
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
      return {
        path: `/installment-sales/${installmentId}`,
        label: `پرونده اقساطی #${installmentId.toLocaleString('fa-IR')}`,
        shortLabel: 'پرونده اقساطی',
        icon: 'fa-solid fa-file-invoice-dollar',
        resolved: false,
      };
    }

    const invoiceId = Number((referenceType.includes('sales_order') ? refId : 0) || (meta as any)?.invoiceId || 0);
    if (invoiceId && (referenceType.includes('sales_order') || /فاکتور|invoice|فروش\s*اعتباری|فروش\s*نقدی/i.test(raw))) {
      return {
        path: `/invoices/${invoiceId}`,
        label: `فاکتور فروش #${invoiceId.toLocaleString('fa-IR')}`,
        shortLabel: 'فاکتور فروش',
        icon: 'fa-solid fa-file-invoice',
        resolved: false,
      };
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
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200'
    : editingEntryKind === 'debit'
      ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200'
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
  const printProfile = () => printArea('#customer-ledger-print-area', {
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
  const customerTelegramChatId = String((profile as any).telegramChatId || (profile as any).telegram_chat_id || '').trim();
  const customerTelegramLinkedAtRaw = String((profile as any).telegram_linked_at || '').trim();
  const customerTelegramLinked = !!customerTelegramChatId;
  const customerTelegramLinkedAt = customerTelegramLinkedAtRaw ? formatIsoToShamsi(customerTelegramLinkedAtRaw) : null;
  const brandStoreName = readStoredBranding()?.storeName || 'فروشگاه کوروش';
  const buildTelegramTemplateVars = (profileData: any) => {
    const unit = readStoredCurrencyUnit();
    const openSales = [...customerInstallmentSales]
      .filter((sale) => {
        const status = String(sale?.overallStatus || '').toLowerCase();
        return status !== 'completed' && status !== 'settled';
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
    return raw.replace(/\{(\w+)\}/g, (_match, key) => {
      const value = vars[key] ?? '';
      return value === '' ? '—' : String(value);
    });
  })();

  const ledgerPrintStats = (() => {
    const totalDebit = ledger.reduce((sum, entry) => sum + Number(entry?.debit || 0), 0);
    const totalCredit = ledger.reduce((sum, entry) => sum + Number(entry?.credit || 0), 0);
    const latestTransaction = ledger
      .map((entry) => entry?.transactionDate || entry?.createdAt || entry?.updatedAt || '')
      .filter(Boolean)
      .sort()
      .at(-1) || '';

    return {
      totalDebit,
      totalCredit,
      debitCount: ledger.filter((entry) => Number(entry?.debit || 0) > 0).length,
      creditCount: ledger.filter((entry) => Number(entry?.credit || 0) > 0).length,
      latestTransaction,
    };
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
    { label: 'تعداد گردش دفتر', value: ledger.length.toLocaleString('fa-IR'), icon: 'fa-solid fa-book-open-reader', tone: 'text-amber-700 bg-amber-50 border-amber-100 dark:text-amber-200 dark:bg-amber-950/20 dark:border-amber-900/30' },
  ];

  return (
    <div className="detail-page-shell people-detail-apple customer-detail-apple people-detail-redesign-v1 people-detail-redesign-v1--customer people-foundation people-detail-foundation space-y-8" dir="rtl" data-ui-people-page="customer-detail" data-ui-people-scope="detail">
      <Notification message={notification} onClose={() => setNotification(null)} />

      {/* پروفایل */}
      <div className="customer-detail-hero detail-hero-card" data-ui-people-surface="detail-hero">
        <div className="detail-hero-card__head">
          <div className="customer-detail-hero__top customer-overview-hero-top flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="detail-hero-card__icon text-indigo-600 dark:text-indigo-300">
                <i className="fa-solid fa-user text-2xl" />
              </div>
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold tracking-[0.24em] text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <i className="fa-solid fa-address-card text-[10px]" />
                  پرونده مشتری
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50">{profile.fullName}</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">نمای کامل مشتری برای پیگیری ارتباطات، گردش حساب و سوابق خرید و تعاملات.</p>
                <div className="customer-hero-chip-row mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="customer-hero-chip inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 font-semibold text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"><i className="fa-solid fa-phone text-[10px] text-slate-400" /><span dir="ltr">{profile.phoneNumber || 'بدون شماره'}</span></span>
                  <span className="customer-hero-chip inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50/90 px-3 py-1.5 font-semibold text-indigo-700 shadow-sm dark:border-indigo-900/40 dark:bg-indigo-950/40 dark:text-indigo-200"><i className="fa-solid fa-bag-shopping text-[10px]" />{purchaseHistory.length.toLocaleString('fa-IR')} خرید ثبت‌شده</span>
                  <span className={`customer-hero-chip inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-semibold shadow-sm ${trustTone.shell}`}><i className={`${trustTone.icon} text-[10px]`} />امتیاز اعتماد: {customerTrustLoading ? '...' : customerTrustProfile ? `${trustScore.toLocaleString('fa-IR')} از ۱۰۰` : 'نامشخص'}</span>
                  <FinancialStatusBadge label={profile.currentBalance > 0 ? 'بدهکار' : profile.currentBalance < 0 ? 'بستانکار' : 'تسویه'} tone={profile.currentBalance > 0 ? 'danger' : profile.currentBalance < 0 ? 'success' : 'success'} icon="fa-solid fa-wallet" size="sm" />
                  <span className={`customer-hero-chip inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-semibold shadow-sm ${customerTelegramLinked ? 'border-sky-100 bg-sky-50/90 text-sky-700 dark:border-sky-900/40 dark:bg-sky-950/40 dark:text-sky-200' : 'border-rose-100 bg-rose-50/90 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-200'}`}><i className={`fa-brands fa-telegram ${customerTelegramLinked ? '' : 'opacity-80'}`} />{customerTelegramLinked ? 'تلگرام لینک شده' : 'تلگرام لینک نشده'}</span>
                  {customerTelegramLinkedAt && <span className="customer-hero-chip inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 font-semibold text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"><i className="fa-regular fa-clock text-[10px] text-slate-400" />آخرین اتصال: {customerTelegramLinkedAt}</span>}
                </div>
                </div>
              </div>
            </div>

            <div className="customer-detail-actions customer-overview-actions flex flex-wrap items-center gap-2 lg:max-w-[48%] lg:justify-end">
              <Button
                onClick={() => {
                  setPrefillMessageText('');
                  setPrefillChannels(undefined);
                  setIsMessageModalOpen(true);
                }}
                variant="success"
                size="sm"
                className="people-action-btn people-action-btn-tight people-action-btn-primary !px-3.5 !text-[11px]"
                title="ارسال پیامک/تلگرام"
                leftIcon={<i className="fa-solid fa-paper-plane" />}
              >
                ارسال پیام
              </Button>
              <Button
                onClick={openTelegramReport}
                variant="primary"
                size="sm"
                className="people-action-btn people-action-btn-tight people-action-btn-secondary !px-3.5 !text-[11px]"
                title="ارسال گزارش کامل مشتری در تلگرام"
                leftIcon={<i className="fa-brands fa-telegram" />}
              >
                ارسال گزارش
              </Button>
              <Button
                onClick={openEditModal}
                variant="primary"
                size="sm"
                className="people-action-btn people-action-btn-tight people-action-btn-primary !px-3.5 !text-[11px]"
                leftIcon={<i className="fas fa-edit" />}
              >
                ویرایش پروفایل
              </Button>
              <Button
                type="button"
                onClick={openQrLinkModal}
                disabled={tgIsSending || tgQrLoading}
                variant="secondary"
                size="sm"
                className="people-action-btn people-action-btn-tight people-action-btn-secondary !px-3.5 !text-[11px]"
                title="نمایش QR، کپی لینک، باز کردن مستقیم و ساخت QR تازه"
                leftIcon={<i className="fa-solid fa-link" />}
              >
                اتصال تلگرام
              </Button>
            </div>
          </div>

          <section className="customer-overview-dashboard mt-4 space-y-4" aria-label="داشبورد اعتبار و حساب مشتری">
            <div className="customer-overview-dashboard-grid grid gap-4 lg:grid-cols-[1fr_1.25fr_1fr]">
              <div className="customer-overview-card rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-start justify-between gap-2.5">
                  <div>
                    <div className="text-[12px] font-black text-slate-500 dark:text-slate-400">وضعیت حساب مشتری</div>
                    <div className={`mt-3 text-[24px] font-black leading-8 ${
                      profile.currentBalance > 0 ? 'text-rose-600 dark:text-rose-300'
                        : profile.currentBalance < 0 ? 'text-emerald-600 dark:text-emerald-300'
                          : 'text-slate-900 dark:text-slate-50'
                    }`}>
                      {formatLedgerCurrency(profile.currentBalance, 'balance')}
                    </div>
                    <p className="mt-2 text-[12px] leading-6 text-slate-500 dark:text-slate-400">
                      {profile.currentBalance > 0 ? 'حساب مشتری بدهکار است و نیاز به پیگیری دریافت دارد.' : profile.currentBalance < 0 ? 'مشتری بستانکار است و باید در فروش یا تسویه بعدی لحاظ شود.' : 'حساب مشتری تسویه است و بدهی فعالی ندارد.'}
                    </p>
                  </div>
                  <span className={`inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] ${
                    profile.currentBalance > 0 ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/35 dark:text-rose-200'
                      : profile.currentBalance < 0 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/35 dark:text-emerald-200'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-300'
                  }`}>
                    <i className="fa-solid fa-wallet text-[20px]" />
                  </span>
                </div>
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-bold leading-5 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-200">
                  {profile.currentBalance > 0 ? 'پیشنهاد: قبل از فروش اعتباری جدید، دفتر حساب و تعهدات فعال بررسی شود.' : 'وضعیت حساب فعلی مانع مستقیم برای فروش جدید ایجاد نمی‌کند.'}
                </div>
                <button
                  type="button"
                  onClick={scrollToLedger}
                  className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 text-[12px] font-black text-slate-700 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  مشاهده دفتر حساب
                  <i className="fa-solid fa-book-open" />
                </button>
              </div>

              <div className="customer-overview-card rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[13px] font-black text-slate-900 dark:text-slate-50">شاخص‌های اثرگذار بر اعتبار</div>
                    <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">خلاصه داده‌هایی که مستقیم روی تصمیم اعتباری اثر می‌گذارند.</p>
                  </div>
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-300">
                    <i className="fa-solid fa-chart-simple" />
                  </span>
                </div>
                <div className="grid gap-0 overflow-hidden rounded-[22px] border border-slate-200 dark:border-slate-800 sm:grid-cols-2">
                  {[
                    {
                      label: 'سقف اعتبار پیشنهادی',
                      value: customerTrustProfile ? formatLedgerCurrency(customerTrustProfile.suggestedCreditLimit, 'balance') : '—',
                      icon: 'fa-regular fa-credit-card',
                      tone: 'text-blue-600 bg-blue-50 dark:text-blue-200 dark:bg-blue-950/30',
                    },
                    {
                      label: 'ظرفیت باقی‌مانده',
                      value: customerTrustProfile ? formatLedgerCurrency(customerTrustProfile.remainingSuggestedCredit, 'balance') : '—',
                      icon: 'fa-solid fa-wallet',
                      tone: 'text-emerald-600 bg-emerald-50 dark:text-emerald-200 dark:bg-emerald-950/30',
                    },
                    {
                      label: 'دیرکرد / معوق',
                      value: customerTrustProfile ? `${(customerTrustProfile.latePaymentCount + customerTrustProfile.overdueUnpaidCount).toLocaleString('fa-IR')} مورد` : '—',
                      icon: 'fa-regular fa-clock',
                      tone: 'text-rose-600 bg-rose-50 dark:text-rose-200 dark:bg-rose-950/30',
                    },
                    {
                      label: 'چک برگشتی',
                      value: customerTrustProfile ? `${customerTrustProfile.returnedCheckCount.toLocaleString('fa-IR')} مورد` : '—',
                      icon: 'fa-solid fa-stamp',
                      tone: 'text-rose-600 bg-rose-50 dark:text-rose-200 dark:bg-rose-950/30',
                    },
                  ].map((item, index) => (
                    <div key={item.label} className={`customer-overview-metric-cell min-h-[122px] p-4 ${index % 2 === 0 ? 'sm:border-l' : ''} ${index < 2 ? 'border-b' : ''} border-slate-200 dark:border-slate-800`}>
                      <div className="flex items-start justify-between gap-2.5">
                        <div>
                          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{item.label}</div>
                          <div className="mt-3 text-[18px] font-black text-slate-950 dark:text-slate-50">{item.value}</div>
                        </div>
                        <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.tone}`}>
                          <i className={item.icon} />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="customer-overview-card rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-start justify-between gap-2.5">
                  <div>
                    <div className="text-[12px] font-black text-slate-500 dark:text-slate-400">سطح ریسک اعتباری</div>
                    <div className={`mt-2 text-[24px] font-black ${
                      trustScore >= 68 ? 'text-emerald-600 dark:text-emerald-300'
                        : trustScore >= 50 ? 'text-amber-600 dark:text-amber-300'
                          : 'text-rose-600 dark:text-rose-300'
                    }`}>
                      {customerTrustLoading ? 'در حال محاسبه...' : customerTrustProfile ? customerTrustProfile.tierLabel : 'نامشخص'}
                    </div>
                  </div>
                  <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                    trustScore >= 68 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-200'
                      : trustScore >= 50 ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-200'
                        : 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-200'
                  }`}>
                    <i className={trustTone.icon} />
                  </span>
                </div>

                <div className="relative mx-auto mt-3 max-w-full" style={{ width: 170, height: 170, minWidth: 170, maxWidth: '100%' }}>
                  <svg viewBox="0 0 160 160" className="-rotate-90" style={{ width: '170px', height: '170px', display: 'block' }} role="img" aria-label="نمودار دایره‌ای امتیاز اعتماد مشتری">
                    <circle cx="80" cy="80" r="62" fill="none" stroke="currentColor" strokeWidth="14" className="text-slate-200 dark:text-slate-800" strokeLinecap="round" />
                    <circle
                      cx="80"
                      cy="80"
                      r="62"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="14"
                      strokeLinecap="round"
                      strokeDasharray={`${customerTrustProfile ? Math.max(0, Math.min(100, trustScore)) * 3.895 : 0} 389.5`}
                      className={trustScore >= 68 ? 'text-emerald-500 transition-all duration-500' : trustScore >= 50 ? 'text-amber-400 transition-all duration-500' : 'text-rose-500 transition-all duration-500'}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <div className="text-[38px] font-black leading-none text-slate-950 dark:text-slate-50">
                      {customerTrustLoading ? '...' : customerTrustProfile ? trustScore.toLocaleString('fa-IR') : '—'}
                    </div>
                    <div className="mt-2 text-[13px] font-black text-slate-500 dark:text-slate-400">از ۱۰۰</div>
                  </div>
                </div>

                <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-center text-[11px] font-black text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                  امتیاز فعلی: {customerTrustProfile ? `${trustScore.toLocaleString('fa-IR')} از ۱۰۰` : 'نامشخص'}
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-[14px] font-black text-slate-900 dark:text-slate-50">روند امتیاز اعتماد</div>
                    <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">تغییر امتیاز بر اساس خریدها، پرداخت‌ها، دیرکردها و چک‌های برگشتی.</p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[11px] font-black">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">۳۰ روزه</span>
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/25 dark:text-emerald-200">مثبت: {(customerTrustHistory?.summary?.positiveEvents ?? 0).toLocaleString('fa-IR')}</span>
                    <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/25 dark:text-rose-200">منفی: {(customerTrustHistory?.summary?.negativeEvents ?? 0).toLocaleString('fa-IR')}</span>
                  </div>
                </div>

                {customerTrustHistoryLoading ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-[12px] font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                    در حال دریافت روند امتیاز...
                  </div>
                ) : !customerTrustHistory?.timeline?.length ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-[12px] font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">
                    هنوز رویداد کافی برای نمایش روند امتیاز وجود ندارد.
                  </div>
                ) : (
                  <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/45">
                    {(() => {
                      const chartEvents = [...(customerTrustHistory.timeline || [])].reverse().slice(-8);
                      const width = 720;
                      const height = 190;
                      const paddingX = 34;
                      const paddingY = 26;
                      const points = chartEvents.map((event, index) => {
                        const x = paddingX + (index * (width - paddingX * 2)) / Math.max(1, chartEvents.length - 1);
                        const score = Math.max(0, Math.min(100, Number(event.scoreAfter || 0)));
                        const y = paddingY + ((100 - score) * (height - paddingY * 2)) / 100;
                        return { x, y, score, event };
                      });
                      const polyline = points.map((point) => `${point.x},${point.y}`).join(' ');
                      const lastPoint = points[points.length - 1];
                      return (
                        <div dir="ltr">
                          <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height: 190, display: 'block' }} role="img" aria-label="روند امتیاز اعتماد">
                            {[0, 25, 50, 75, 100].map((line) => {
                              const y = paddingY + ((100 - line) * (height - paddingY * 2)) / 100;
                              return <line key={line} x1={paddingX} x2={width - paddingX} y1={y} y2={y} stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeDasharray="7 8" />;
                            })}
                            <polyline points={polyline} fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" className={trustScore >= 68 ? 'text-emerald-500' : trustScore >= 50 ? 'text-amber-400' : 'text-rose-500'} />
                            {points.map((point, index) => (
                              <g key={`${point.event.date}`}>
                                <circle cx={point.x} cy={point.y} r="6" fill="currentColor" className={index === points.length - 1 ? 'text-rose-500' : 'text-slate-400'} />
                                <circle cx={point.x} cy={point.y} r="11" fill="transparent">
                                  <title>{`${point.event.title} · امتیاز ${point.score.toLocaleString('fa-IR')}`}</title>
                                </circle>
                              </g>
                            ))}
                            {lastPoint ? <text x={Math.max(42, lastPoint.x - 8)} y={lastPoint.y - 14} className="fill-current text-[18px] font-black text-rose-600">{lastPoint.score.toLocaleString('fa-IR')}</text> : null}
                          </svg>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <div className="flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-3 rounded-[22px] border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                    <div>
                      <div className="text-[15px] font-black text-slate-900 dark:text-slate-50">پیشنهاد اقدام مدیریتی</div>
                      <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">جمع‌بندی اقدامات پیشنهادی بر اساس ریسک، وضعیت حساب و الگوی پرداخت مشتری.</p>
                    </div>
                    <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${
                      trustScore < 50
                        ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-200'
                        : trustScore < 68
                          ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-200'
                          : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-200'
                    }`}>
                      <i className="fa-solid fa-lightbulb text-[18px]" />
                    </span>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
                    {managerActionSummary.map((item) => (
                      <div key={item.label} className={`rounded-[22px] border p-4 ${item.tone}`}>
                        <div className="flex h-full flex-col gap-3 text-right">
                          <div className="flex items-center justify-between gap-3">
                            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/70 bg-white/85 text-[15px] shadow-sm dark:border-slate-800/80 dark:bg-slate-950/70">
                              <i className={item.icon} />
                            </span>
                            <span className="rounded-full border border-white/80 bg-white/80 px-2.5 py-1 text-[10px] font-black text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-300">جمع‌بندی</span>
                          </div>
                          <div>
                            <div className="text-[11px] font-black text-slate-500 dark:text-slate-400">{item.label}</div>
                            <div className="mt-2 text-[18px] font-black leading-7">{item.value}</div>
                          </div>
                          <button
                            type="button"
                            onClick={item.onAction}
                            className="mt-auto inline-flex h-9 items-center justify-center gap-2 rounded-2xl border border-white/80 bg-white/85 px-3 text-[11px] font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-white dark:border-slate-800/80 dark:bg-slate-950/70 dark:text-slate-200"
                          >
                            {item.ctaLabel}
                            <i className={`${item.ctaIcon} text-[11px]`} />
                          </button>
                        </div>
                      </div>
                    ))}

                    {managerActionCards.map((action) => (
                      <div key={action.title} className={`rounded-[22px] border p-4 ${action.tone}`}>
                        <div className="flex h-full flex-col gap-3 text-right">
                          <div className="flex items-center justify-between gap-3">
                            <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${action.iconTone}`}>
                              <i className={`${action.icon} text-[15px]`} />
                            </span>
                            <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black ${action.tagTone}`}>
                              {action.tag}
                            </span>
                          </div>
                          <div className="text-[16px] font-black leading-7 text-slate-900 dark:text-slate-50">{action.title}</div>
                          <p className="text-[11px] leading-6 text-slate-600 dark:text-slate-300">{action.text}</p>
                          <button
                            type="button"
                            onClick={action.onAction}
                            className="mt-auto inline-flex h-9 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-[11px] font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                          >
                            {action.ctaLabel}
                            <i className={`${action.ctaIcon} text-[11px]`} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/35">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="text-right">
                        <div className="text-[13px] font-black text-slate-900 dark:text-slate-50">آخرین یادداشت‌های مدیریتی</div>
                        <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">تاریخچه جداگانه برای تصمیم‌های اعتباری و پیگیری‌های مدیریتی.</p>
                      </div>
                      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                        <i className="fa-regular fa-note-sticky" />
                      </span>
                    </div>

                    {managerNotesLoading ? (
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-5 text-center text-[12px] font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                        در حال دریافت یادداشت‌های مدیریتی...
                      </div>
                    ) : managerNotes.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-5 text-center text-[12px] font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
                        هنوز یادداشت مدیریتی برای این مشتری ثبت نشده است.
                      </div>
                    ) : (
                      <div className="grid gap-2 md:grid-cols-3">
                        {managerNotes.slice(0, 3).map((note) => (
                          <div key={note.id} className="rounded-2xl border border-slate-200 bg-white p-3 text-right dark:border-slate-800 dark:bg-slate-950">
                            <div className="flex items-center justify-between gap-2">
                              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                                {note.context || 'یادداشت مدیریتی'}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                                {formatIsoToShamsi(note.createdAt)}
                              </span>
                            </div>
                            <p className="mt-2 max-h-[72px] overflow-hidden text-[11px] leading-6 text-slate-600 dark:text-slate-300">{note.note}</p>
                            {note.createdByUsername ? (
                              <div className="mt-2 text-[10px] font-bold text-slate-400 dark:text-slate-500">ثبت توسط: {note.createdByUsername}</div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-3 text-[11px] font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
                    این پیشنهادها بر اساس امتیاز اعتماد، مانده حساب، سابقه پرداخت و نشانه‌های ریسک مشتری تولید شده‌اند.
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-5">
              {profileOverviewStats.map((item) => (
                <div key={item.label} className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-950">
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="min-w-0 flex-1 text-right">
                      <div className="text-[11px] font-black text-slate-500 dark:text-slate-400">{item.label}</div>
                      <div className="mt-2 text-[16px] font-black text-slate-950 dark:text-slate-50">{item.value}</div>
                    </div>
                    <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-[15px] shadow-sm ${item.tone}`}>
                      <i className={item.icon} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

        <section className="customer-extra-section border-t border-slate-200/80 bg-slate-50/55 px-5 py-5 dark:border-slate-800 dark:bg-slate-950/25" aria-label="اکشن‌ها و اطلاعات تکمیلی مشتری">
          <div className="customer-quick-actions-card rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_18px_42px_-42px_rgba(15,23,42,0.35)] dark:border-slate-800 dark:bg-slate-950">
            <div className="customer-quick-actions-header mb-4 flex items-start justify-between gap-3">
              <div className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <h3 className="text-[15px] font-black text-slate-950 dark:text-slate-50">اکشن‌های سریع پرونده مشتری</h3>
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                    <i className="fa-solid fa-bolt" />
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-6 text-slate-500 dark:text-slate-400">پرکاربردترین عملیات را بدون خروج از پرونده اجرا کنید.</p>
              </div>
            </div>

            <div className="customer-quick-actions-grid grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {quickActions.map((action) => (
                <button
                  key={action.key}
                  type="button"
                  onClick={action.onClick}
                  className="customer-quick-action-btn group flex min-h-[68px] items-center justify-between gap-3 rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-right shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_14px_28px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700"
                >
                  <div className="min-w-0">
                    <div className="text-[13px] font-black text-slate-950 dark:text-slate-50">{action.label}</div>
                    <div className="mt-0.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">{action.sub}</div>
                  </div>
                  <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border text-[15px] shadow-sm transition group-hover:scale-105 ${action.tone} dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700`}>
                    <i className={action.icon} />
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="customer-extra-grids mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="customer-extra-card customer-crm-card rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_18px_40px_-44px_rgba(15,23,42,0.32)] dark:border-slate-800 dark:bg-slate-950">
              <div className="customer-extra-card-header mb-4 flex items-start justify-between gap-3">
                <div className="text-right">
                  <div className="text-[15px] font-black text-slate-950 dark:text-slate-50">تگ‌های CRM</div>
                  <p className="mt-1 text-[12px] leading-6 text-slate-500 dark:text-slate-400">برای گروه‌بندی مشتری و فیلتر در گزارش‌ها استفاده می‌شود.</p>
                </div>
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                  <i className="fa-solid fa-tag" />
                </span>
              </div>

              {normalizeTags((profile as any).tags).length === 0 ? (
                <div className="customer-crm-empty rounded-[18px] border border-dashed border-slate-300 bg-slate-50/75 px-4 py-6 text-center dark:border-slate-700 dark:bg-slate-900/35">
                  <span className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-500">
                    <i className="fa-solid fa-tags text-[22px]" />
                  </span>
                  <div className="mt-2.5 text-[12px] font-black text-slate-600 dark:text-slate-300">هنوز تگی برای این مشتری ثبت نشده است.</div>
                  <p className="mt-1 text-[12px] leading-6 text-slate-500 dark:text-slate-400">با افزودن تگ، مشتری را بهتر دسته‌بندی و مدیریت کنید.</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {normalizeTags((profile as any).tags).map(t => (
                    <span key={t} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[12px] font-black text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                      {t}
                      <button
                        type="button"
                        disabled={isSavingTags}
                        onClick={() => {
                          const current = normalizeTags((profile as any).tags);
                          updateTags(current.filter(x => x !== t));
                        }}
                        data-skip-global-button="true"
                        className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-slate-400 transition hover:text-rose-500 dark:bg-slate-950"
                        title="حذف مورد تگ"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="customer-crm-form mt-4 rounded-[18px] border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-900/35">
                <label className="mb-2 block text-[12px] font-black text-slate-500 dark:text-slate-400">افزودن تگ جدید</label>
                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="نام تگ را وارد کنید..."
                    className="customer-crm-input h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] font-bold text-slate-800 outline-none transition    dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                  <button
                    type="button"
                    disabled={isSavingTags}
                    onClick={() => {
                      const t = tagInput.trim();
                      if (!t) return;
                      const current = normalizeTags((profile as any).tags);
                      if (current.includes(t)) { setTagInput(''); return; }
                      updateTags([...current, t]);
                      setTagInput('');
                    }}
                    className="customer-crm-add-btn inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-[12px] font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                  >
                    <i className="fa-solid fa-plus" />
                    افزودن مورد جدید
                  </button>
                </div>
              </div>
            </div>

            <div className="customer-extra-card customer-basic-card rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_18px_40px_-44px_rgba(15,23,42,0.32)] dark:border-slate-800 dark:bg-slate-950">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div className="text-right">
                  <div className="text-[15px] font-black text-slate-950 dark:text-slate-50">اطلاعات پایه مشتری</div>
                  <p className="mt-1 text-[12px] leading-6 text-slate-500 dark:text-slate-400">دسترسی سریع به اطلاعات تماس و یادداشت‌های پرونده</p>
                </div>
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                  <i className="fa-solid fa-circle-info" />
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                {[
                  { label: 'شماره تماس', value: <span dir="ltr">{profile.phoneNumber || '-'}</span>, icon: 'fa-solid fa-phone' },
                  { label: 'آدرس', value: profile.address || '-', icon: 'fa-solid fa-location-dot' },
                  { label: 'تعداد تراکنش‌ها', value: ledger.length.toLocaleString('fa-IR'), icon: 'fa-solid fa-chart-simple' },
                  { label: 'یادداشت‌ها', value: profile.notes || 'بدون یادداشت', icon: 'fa-regular fa-note-sticky', full: true },
                ].map((item) => (
                  <div key={item.label} className={`customer-basic-info-card min-h-[78px] rounded-[18px] border border-slate-200 bg-slate-50/65 p-3.5 dark:border-slate-800 dark:bg-slate-900/35 ${item.full ? 'md:col-span-2' : ''}`}>
                    <div className="mb-1.5 flex items-center justify-between gap-2 text-[11px] font-black text-slate-500 dark:text-slate-400">
                      <span>{item.label}</span>
                      <i className={`${item.icon} text-[13px]`} />
                    </div>
                    <div className="text-[14px] font-black leading-6 text-slate-950 dark:text-slate-50">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      <MessageComposerModal
        open={isMessageModalOpen}
        onClose={() => setIsMessageModalOpen(false)}
        initialRecipient={{
          type: 'customer',
          id: profile.id,
          name: profile.fullName,
          phoneNumber: profile.phoneNumber,
          telegramChatId: (profile as any).telegramChatId,
        }}
        initialText={prefillMessageText}
        initialChannels={prefillChannels}
        initialVariables={{
          amount: Number(profile.currentBalance || 0),
          dueDate: String((profile as any).lastPurchaseDate || (profile as any).createdAt || ''),
          link: typeof window !== 'undefined' ? window.location.href : '',
        }}
        onQueued={() => setNotification({ type: 'success', text: 'پیام در صف ارسال قرار گرفت. وضعیت را در «صف ارسال» ببینید.' })}
      />

      <TelegramLinkModal
        isOpen={tgQrOpen}
        onClose={() => setTgQrOpen(false)}
        title="اتصال تلگرام"
        entityLabel={profile.fullName || 'مشتری'}
        loading={tgQrLoading}
        deepLink={tgQrDeepLink}
        botUsernameMissing={tgQrBotUsernameMissing}
        expectedPhone={tgQrExpectedPhone || profile.phoneNumber || ''}
        expiresAt={tgQrExpiresAt}
        onRefresh={openQrLinkModal}
        onCopy={async () => {
          if (!tgQrDeepLink) return;
          try {
            await navigator.clipboard.writeText(tgQrDeepLink);
            setNotification({ type: 'success', text: 'لینک اتصال تلگرام کپی شد.' });
          } catch {
            setNotification({ type: 'error', text: 'کپی لینک اتصال انجام نشد.' });
          }
        }}
      />

      {/* Telegram Command Center */}
      <section className="rounded-[32px] border border-slate-200 bg-white p-5 text-slate-900 shadow-[0_28px_80px_-52px_rgba(15,23,42,0.35)] dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50" aria-label="مرکز گفتگوی تلگرام مشتری">
        {(() => {
          const chatId = String((profile as any).telegramChatId || (profile as any).telegram_chat_id || tgConvMeta?.chatId || '').trim();
          const optedOut = Number((profile as any).telegramOptedOut ?? (profile as any).telegram_opted_out ?? tgConvMeta?.telegramOptedOut ?? 0) === 1;
          const invalid = Number((profile as any).telegram_invalid ?? (profile as any).telegramInvalid ?? tgConvMeta?.telegramInvalid ?? 0) === 1;
          const linked = !!chatId;
          const outboxCount = tgConvItems.filter((item) => item.direction === 'out').length;
          const inboxCount = tgConvItems.filter((item) => item.direction === 'in').length;
          const failedCount = tgConvItems.filter((item) => item.direction === 'out' && String(item.status || '') === 'failed').length;
          const lastInteractionAt = tgConvItems.length ? tgConvItems[tgConvItems.length - 1]?.createdAt : null;
          const canSendTelegram = linked && !optedOut && !invalid;
          const retryTelegramOutbox = async (outboxId: string) => {
            if (!token) return;
            setTgIsSending(true);
            try {
              const res = await fetch('/api/telegram/customer-actions/retry-outbox', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
                body: JSON.stringify({ outboxId }),
              });
              const js = await res.json().catch(() => ({}));
              if (!res.ok || js?.success === false) throw new Error(js?.message || 'ارسال مجدد انجام نشد.');
              setNotification({ type: 'success', text: 'پیام برای ارسال مجدد در صف قرار گرفت.' });
              fetchTelegramConversation(profile.id);
            } catch (e: any) {
              setNotification({ type: 'error', text: e?.message || 'ارسال مجدد انجام نشد.' });
            } finally {
              setTgIsSending(false);
            }
          };

          const saveManualChatId = async () => {
            const nextChatId = tgChatIdInput.trim();
            if (!token) return;
            if (!nextChatId) return setNotification({ type: 'error', text: 'ابتدا Chat ID را وارد کنید.' });
            setTgIsSending(true);
            try {
              const res = await fetch('/api/telegram/customers/link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
                body: JSON.stringify({ customerId: profile.id, chatId: nextChatId }),
              });
              const js = await res.json().catch(() => ({}));
              if (!res.ok || js?.success === false) throw new Error(js?.message || 'ذخیره Chat ID انجام نشد.');
              setCustomerData((prev) => prev ? {
                ...prev,
                profile: {
                  ...(prev as any).profile,
                  telegramChatId: nextChatId,
                  telegram_chat_id: nextChatId,
                  telegram_linked_at: new Date().toISOString(),
                  telegramOptedOut: false,
                  telegram_opted_out: 0,
                  telegramInvalid: 0,
                  telegram_invalid: 0,
                } as any,
              } as any : prev);
              setNotification({ type: 'success', text: 'Chat ID مشتری ذخیره شد.' });
              fetchTelegramConversation(profile.id);
            } catch (e: any) {
              setNotification({ type: 'error', text: e?.message || 'ذخیره Chat ID انجام نشد.' });
            } finally {
              setTgIsSending(false);
            }
          };

          const unlinkChatId = async () => {
            if (!token || !linked) return;
            setTgIsSending(true);
            try {
              const res = await fetch('/api/telegram/customers/unlink', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
                body: JSON.stringify({ customerId: profile.id }),
              });
              const js = await res.json().catch(() => ({}));
              if (!res.ok || js?.success === false) throw new Error(js?.message || 'حذف اتصال تلگرام انجام نشد.');
              setCustomerData((prev) => prev ? {
                ...prev,
                profile: {
                  ...(prev as any).profile,
                  telegramChatId: '',
                  telegram_chat_id: '',
                  telegram_linked_at: null,
                } as any,
              } as any : prev);
              setTgChatIdInput('');
              setNotification({ type: 'success', text: 'اتصال تلگرام مشتری حذف شد.' });
              fetchTelegramConversation(profile.id);
            } catch (e: any) {
              setNotification({ type: 'error', text: e?.message || 'حذف اتصال انجام نشد.' });
            } finally {
              setTgIsSending(false);
            }
          };

          const toggleTelegramOptout = async () => {
            if (!token) return;
            setTgIsSending(true);
            try {
              const nextOptedOut = !optedOut;
              const res = await fetch('/api/telegram/customers/optout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
                body: JSON.stringify({ customerId: profile.id, optedOut: nextOptedOut }),
              });
              const js = await res.json().catch(() => ({}));
              if (!res.ok || js?.success === false) throw new Error(js?.message || 'تغییر وضعیت دریافت پیام انجام نشد.');
              setCustomerData((prev) => prev ? {
                ...prev,
                profile: {
                  ...(prev as any).profile,
                  telegramOptedOut: nextOptedOut,
                  telegram_opted_out: nextOptedOut ? 1 : 0,
                } as any,
              } as any : prev);
              setNotification({ type: 'success', text: nextOptedOut ? 'دریافت پیام تلگرام غیرفعال شد.' : 'دریافت پیام تلگرام فعال شد.' });
            } catch (e: any) {
              setNotification({ type: 'error', text: e?.message || 'تغییر وضعیت دریافت پیام انجام نشد.' });
            } finally {
              setTgIsSending(false);
            }
          };

          const sendTelegramAction = async (kind: 'menu' | 'status') => {
            if (!token) return;
            if (!canSendTelegram) return setNotification({ type: 'error', text: 'برای ارسال، اتصال تلگرام باید فعال و معتبر باشد.' });
            setTgIsSending(true);
            try {
              const url = kind === 'menu'
                ? '/api/telegram/customer-actions/send-menu'
                : '/api/telegram/customer-actions/send-account-status';
              const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
                body: JSON.stringify({ customerId: profile.id }),
              });
              const js = await res.json().catch(() => ({}));
              if (!res.ok || js?.success === false) throw new Error(js?.message || 'ارسال پیام انجام نشد.');
              setNotification({ type: 'success', text: kind === 'menu' ? 'منوی ربات ارسال شد یا در صف ارسال قرار گرفت.' : 'وضعیت حساب ارسال شد یا در صف ارسال قرار گرفت.' });
              fetchTelegramConversation(profile.id);
            } catch (e: any) {
              setNotification({ type: 'error', text: e?.message || 'ارسال پیام انجام نشد.' });
            } finally {
              setTgIsSending(false);
            }
          };

          return (
            <div className="space-y-4">
              <div className="customer-telegram-header flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 xl:flex-row xl:items-start xl:justify-between">
                <div className="flex items-start gap-3">
                  <span className="grid h-14 w-14 place-items-center rounded-[24px] bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-[0_18px_40px_-20px_rgba(37,99,235,0.85)]">
                    <i className="fa-brands fa-telegram text-[24px]" />
                  </span>
                  <div>
                    <div className="customer-telegram-actions flex flex-wrap items-center gap-2">
                      <h2 className="text-[24px] font-black tracking-[-0.03em] text-slate-950 dark:text-slate-50">گفتگو تلگرام مشتری</h2>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-black text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">Inbox + Outbox</span>
                    </div>
                    <p className="mt-1 text-[13px] leading-7 text-slate-500 dark:text-slate-400">مرکز فرمان ارتباط با مشتری؛ گفتگو، ارسال سریع، مدیریت Chat ID و خطاهای ارسال در یک پنل واحد.</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => fetchTelegramConversation(profile.id)} disabled={tgConvLoading} className="customer-telegram-action-btn inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-[11px] font-black text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                    <i className={["fa-solid fa-rotate", tgConvLoading ? "fa-spin" : ""].join(' ')} />
                    تازه‌سازی
                  </button>
                  <button type="button" onClick={() => sendTelegramAction('status')} disabled={!canSendTelegram || tgIsSending} className="customer-telegram-action-btn inline-flex h-10 items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3.5 text-[11px] font-black text-sky-700 shadow-sm transition hover:bg-sky-100 disabled:opacity-50 dark:border-sky-900/40 dark:bg-sky-950/25 dark:text-sky-200">
                    <i className="fa-solid fa-wallet" />
                    ارسال وضعیت حساب
                  </button>
                  <button type="button" onClick={() => sendTelegramAction('menu')} disabled={!canSendTelegram || tgIsSending} className="customer-telegram-action-btn inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-3.5 text-[11px] font-black text-white shadow-[0_18px_36px_-22px_rgba(37,99,235,0.9)] transition hover:bg-blue-700 disabled:opacity-50">
                    <i className="fa-solid fa-paper-plane" />
                    ارسال منوی ربات
                  </button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-5">
                {[
                  { label: 'کل پیام‌ها', value: tgConvItems.length.toLocaleString('fa-IR'), icon: 'fa-regular fa-message', tone: 'text-slate-700 bg-slate-50 border-slate-200' },
                  { label: 'دریافتی', value: inboxCount.toLocaleString('fa-IR'), icon: 'fa-solid fa-arrow-down', tone: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
                  { label: 'ارسالی', value: outboxCount.toLocaleString('fa-IR'), icon: 'fa-solid fa-arrow-up', tone: 'text-sky-700 bg-sky-50 border-sky-100' },
                  { label: 'ناموفق', value: failedCount.toLocaleString('fa-IR'), icon: 'fa-solid fa-triangle-exclamation', tone: failedCount ? 'text-rose-700 bg-rose-50 border-rose-100' : 'text-slate-600 bg-slate-50 border-slate-200' },
                  { label: 'آخرین تعامل', value: lastInteractionAt ? formatIsoToShamsi(lastInteractionAt) : '—', icon: 'fa-regular fa-clock', tone: 'text-violet-700 bg-violet-50 border-violet-100' },
                ].map((item) => (
                  <div key={item.label} className="rounded-[22px] border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-right">
                        <div className="text-[11px] font-black text-slate-500 dark:text-slate-400">{item.label}</div>
                        <div className="mt-1 text-[18px] font-black text-slate-950 dark:text-slate-50">{item.value}</div>
                      </div>
                      <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-[15px] ${item.tone} dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200`}>
                        <i className={item.icon} />
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {!linked ? (
                <div className="rounded-[24px] border border-amber-200 bg-amber-50/80 p-4 text-right text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
                  <div className="text-[14px] font-black">این مشتری هنوز به تلگرام وصل نیست.</div>
                  <p className="mt-1 text-[12px] leading-6">Chat ID را از پنل سمت چپ وارد و ذخیره کنید تا ارسال و دریافت پیام فعال شود.</p>
                </div>
              ) : null}

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(390px,0.75fr)]">
                <div className="space-y-4">
                  <div className="rounded-[28px] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/35">
                    <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex flex-wrap items-center gap-2">
                        {([
                          { key: 'all', label: 'همه' },
                          { key: 'in', label: 'دریافتی' },
                          { key: 'out', label: 'ارسالی' },
                          { key: 'failed', label: 'ناموفق' },
                        ] as const).map((item) => (
                          <button key={item.key} type="button" onClick={() => setTgDirectionFilter(item.key)} className={["inline-flex h-10 items-center rounded-2xl border px-4 text-[12px] font-black transition", tgDirectionFilter === item.key ? 'border-blue-600 bg-blue-600 text-white shadow-[0_12px_28px_-18px_rgba(37,99,235,0.85)]' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200'].join(' ')}>
                            {item.label}
                          </button>
                        ))}
                      </div>
                      <div
                        style={{
                          height: 44,
                          minWidth: 280,
                          maxWidth: 420,
                          flex: '1 1 280px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          borderRadius: 16,
                          border: '1px solid rgb(226, 232, 240)',
                          background: '#fff',
                          padding: '0 12px',
                          boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
                          overflow: 'hidden',
                          position: 'relative',
                        }}
                      >
                        <div
                          role="textbox"
                          contentEditable
                          suppressContentEditableWarning
                          onInput={(e) => setTgSearchQuery(e.currentTarget.textContent || '')}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              jumpToFirstTgResult();
                            }
                          }}
                          style={{
                            flex: '1 1 auto',
                            minWidth: 0,
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            border: 'none',
                            outline: 'none',
                            boxShadow: 'none',
                            background: 'transparent',
                            padding: 0,
                            margin: 0,
                            color: '#334155',
                            fontSize: 14,
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                          }}
                        >
                          {tgSearchQuery ? tgSearchQuery : ''}
                        </div>
                        {!tgSearchQuery ? (
                          <span
                            style={{
                              position: 'absolute',
                              pointerEvents: 'none',
                              color: '#94a3b8',
                              fontSize: 14,
                              fontWeight: 700,
                              marginRight: 0,
                            }}
                          >
                            جستجو در گفتگو...
                          </span>
                        ) : null}
                        <i className="fa-solid fa-magnifying-glass shrink-0 text-xs text-slate-400" />
                      </div>
                      <button type="button" onClick={jumpToFirstTgResult} disabled={!tgFilteredConvItems.length} className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-[12px] font-black text-slate-600 shadow-sm disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                        <i className="fa-solid fa-location-crosshairs" />
                        پرش
                      </button>
                    </div>

                    <div className="relative rounded-[26px] border border-slate-200 bg-white p-4 shadow-inner dark:border-slate-800 dark:bg-slate-950">
                      <div ref={tgTimelineRef} onScroll={(e) => { const el = e.currentTarget; const nearBottom = (el.scrollHeight - el.scrollTop - el.clientHeight) < 140; if (nearBottom) setTgNewSinceScroll(false); }} className="max-h-[560px] space-y-4 overflow-y-auto px-2 py-1">
                        {tgConvError ? (
                          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-200">{tgConvError}</div>
                        ) : null}

                        {tgFilteredConvItems.length === 0 && !tgConvLoading ? (
                          <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center dark:border-slate-700 dark:bg-slate-900/50">
                            <i className="fa-brands fa-telegram mb-3 text-[34px] text-slate-300 dark:text-slate-600" />
                            <div className="text-[14px] font-black text-slate-600 dark:text-slate-300">هنوز پیامی برای نمایش وجود ندارد.</div>
                            <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">با ارسال اولین پیام، تایم‌لاین گفتگو اینجا نمایش داده می‌شود.</p>
                          </div>
                        ) : null}

                        {tgFilteredConvItems.map((m) => {
                          const outgoing = m.direction === 'out';
                          const status = outgoing ? (m.status || '') : '';
                          const isFailed = status === 'failed';
                          const isPending = status === 'pending' || status === 'processing';
                          const isSent = status === 'done' || status === 'sent';
                          const statusLabel = !outgoing ? 'دریافتی' : isSent ? 'ارسال‌شده' : isFailed ? 'ناموفق' : isPending ? 'در صف ارسال' : 'در حال پردازش';

                          return (
                            <div id={`tg-customer-msg-${m.id}`} key={m.id} className={["flex items-end gap-3", outgoing ? "justify-start" : "justify-end"].join(' ')}>
                              {outgoing ? <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-blue-600 text-white shadow-sm"><i className="fa-brands fa-telegram" /></span> : null}
                              <div className={["max-w-[78%] rounded-[24px] border px-4 py-3 text-sm leading-7 shadow-sm transition", outgoing ? (isFailed ? "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-100" : "border-blue-100 bg-blue-50/90 text-slate-800 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-slate-100") : "border-slate-200 bg-white text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"].join(' ')}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const mid = Number((m as any).telegramMessageId || 0);
                                    if (mid) setTgReplyTo({ telegramMessageId: mid, preview: String((m as any).text || '').slice(0, 80) });
                                  }}
                                  className="w-full text-right"
                                >
                                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold text-slate-400 dark:text-slate-500">
                                    <span>{outgoing ? 'شما' : profile.fullName}</span>
                                    <span>{formatIsoToShamsi(m.createdAt)}</span>
                                  </div>
                                  {(m as any).kind === 'photo' && (m as any).mediaUrl ? (
                                    <div className="space-y-2"><img src={(m as any).mediaUrl} alt="photo" className="max-h-64 rounded-2xl border border-slate-200 object-contain dark:border-slate-700" />{m.text ? <div className="whitespace-pre-wrap">{m.text}</div> : null}</div>
                                  ) : (m as any).kind === 'document' && (m as any).mediaUrl ? (
                                    <div className="space-y-2"><a href={(m as any).mediaUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs font-black text-sky-600 dark:text-sky-300"><i className="fa-regular fa-file-lines" /> فایل پیوست</a>{m.text ? <div className="whitespace-pre-wrap">{m.text}</div> : null}</div>
                                  ) : (
                                    <div className="whitespace-pre-wrap">{m.text || '—'}</div>
                                  )}
                                </button>
                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                  <span className={["inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black", !outgoing ? 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300' : isSent ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200' : isFailed ? 'border-rose-200 bg-white text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-200' : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200'].join(' ')}>{statusLabel}</span>
                                  {outgoing && m.errorCategory ? <span className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300" title={m.lastError || ''}>{m.errorCategory}</span> : null}
                                  {isFailed ? (
                                    <>
                                      <button type="button" onClick={() => retryTelegramOutbox(String(m.id))} disabled={tgIsSending} className="inline-flex rounded-full border border-rose-200 bg-white px-2.5 py-1 text-[10px] font-black text-rose-700 transition hover:bg-rose-50 disabled:opacity-50 dark:border-rose-900/40 dark:bg-slate-950 dark:text-rose-200">
                                        <i className="fa-solid fa-rotate-left ml-1" />
                                        تلاش مجدد
                                      </button>
                                      <button type="button" onClick={() => setNotification({ type: 'error', text: m.lastError || 'خطای ثبت‌شده برای این پیام موجود نیست.' })} className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                                        مشاهده خطا
                                      </button>
                                    </>
                                  ) : null}
                                </div>
                              </div>
                              {!outgoing ? <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"><i className="fa-regular fa-user" /></span> : null}
                            </div>
                          );
                        })}

                        {tgNewSinceScroll ? (
                          <button type="button" onClick={() => { const el = tgTimelineRef.current; if (el) { el.scrollTop = el.scrollHeight; setTgNewSinceScroll(false); } }} className="absolute bottom-5 left-5 rounded-full bg-slate-900 px-4 py-2 text-xs font-black text-white shadow-lg dark:bg-white dark:text-slate-900">
                            مشاهده جدیدترین پیام‌ها
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      {[
                        { key: 'hello', label: 'سلام' },
                        { key: 'installment_reminder', label: 'یادآوری قسط' },
                        { key: 'payment_link', label: 'پیگیری مانده حساب' },
                        { key: 'custom', label: 'متن آزاد' },
                      ].map((preset: any) => (
                        <button key={preset.key} type="button" onClick={() => applyTgQuickPreset(preset.key)} className={["inline-flex h-9 items-center rounded-2xl border px-3 text-[11px] font-black transition", tgQuickPreset === preset.key ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'].join(' ')}>
                          {preset.label}
                        </button>
                      ))}
                      <label className="mr-auto inline-flex h-9 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-[11px] font-black text-slate-600 transition hover:bg-white cursor-pointer dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                        <i className="fa-solid fa-paperclip" />
                        پیوست
                        <input type="file" className="hidden" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadTelegramAttachment(f); e.currentTarget.value = ''; }} />
                      </label>
                    </div>

                    {tgReplyTo ? (
                      <div className="mb-3 rounded-2xl border border-sky-200 bg-sky-50/70 px-3 py-2 text-xs text-sky-800 dark:border-sky-900/40 dark:bg-sky-950/20 dark:text-sky-200">
                        <div className="flex items-center justify-between gap-2"><div className="truncate"><span className="font-black ml-2">Reply:</span> #{tgReplyTo.telegramMessageId} — {tgReplyTo.preview}</div><button type="button" onClick={() => setTgReplyTo(null)} className="grid h-8 w-8 place-items-center rounded-full border border-sky-200 bg-white text-sky-700 dark:border-sky-900/40 dark:bg-slate-900 dark:text-sky-200"><i className="fa-solid fa-xmark" /></button></div>
                      </div>
                    ) : null}

                    {tgAttachment ? (
                      <div className="mb-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200">
                        <div className="flex items-center justify-between gap-2"><div className="truncate"><span className="font-black ml-2">پیوست:</span>{tgAttachment.originalName || tgAttachment.relPath}</div><button type="button" onClick={() => setTgAttachment(null)} className="grid h-8 w-8 place-items-center rounded-full border border-emerald-200 bg-white text-emerald-700 dark:border-emerald-900/40 dark:bg-slate-900 dark:text-emerald-200"><i className="fa-solid fa-xmark" /></button></div>
                      </div>
                    ) : null}

                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.55fr)]">
                      <div>
                        <textarea value={tgQuickReply} onChange={(e) => setTgQuickReply(e.target.value)} rows={5} placeholder="متن پیام خود را بنویسید..." className="w-full resize-y rounded-[22px] border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-800 outline-none transition    dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 " />
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {["{name}","{phone}","{amount}","{dueDate}","{link}","{installmentNo}","{remainingAmount}"].map((ch) => (
                            <button key={ch} type="button" onClick={() => setTgQuickReply(v => (v || '') + ch)} className="inline-flex h-8 items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 text-[10px] font-black text-slate-600 hover:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">{ch}</button>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/45">
                        <div className="text-[11px] font-black text-slate-500 dark:text-slate-400">پیش‌نمایش متن پیام</div>
                        <div className="mt-2 max-h-[118px] overflow-y-auto whitespace-pre-wrap text-[12px] leading-6 text-slate-700 dark:text-slate-200">{tgQuickPreviewText || 'هنوز متنی برای پیش‌نمایش وارد نشده است.'}</div>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button type="button" onClick={sendTgQuickReply} disabled={tgIsSending || !canSendTelegram || (!tgQuickReply.trim() && !tgAttachment)} className="inline-flex h-12 min-w-[220px] items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-black text-white shadow-[0_18px_36px_-20px_rgba(37,99,235,0.9)] transition hover:bg-blue-700 disabled:opacity-50">
                        <i className={["fa-solid fa-paper-plane", tgIsSending ? "fa-bounce" : ""].join(' ')} />
                        {tgIsSending ? 'در حال ارسال...' : 'ارسال تلگرام'}
                      </button>

                      <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">پیوست، Reply و متغیرهای سریع پشتیبانی می‌شود.</span>
                    </div>
                  </div>
                </div>

                <aside className="space-y-4">
                  <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                    <div className="customer-extra-card-header mb-4 flex items-start justify-between gap-3">
                      <div className="text-right">
                        <div className="text-[16px] font-black text-slate-900 dark:text-slate-50">کارت تلگرام مشتری</div>
                        <p className="mt-1 text-[12px] leading-6 text-slate-500 dark:text-slate-400">اتصال، دریافت پیام و Chat ID مشتری.</p>
                      </div>
                      <span className="grid h-11 w-11 place-items-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"><i className="fa-solid fa-id-card" /></span>
                    </div>

                    <div className="rounded-[22px] border border-slate-200 bg-slate-50/75 p-4 dark:border-slate-800 dark:bg-slate-900/35">
                      <div className="text-[18px] font-black text-slate-950 dark:text-slate-50">{profile.fullName}</div>
                      <div className="mt-1 text-[12px] font-bold text-slate-500 dark:text-slate-400">مشتری #{profile.id.toLocaleString('fa-IR')}</div>
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-right dark:border-emerald-900/40 dark:bg-emerald-950/20">
                          <div className="text-[11px] font-black text-emerald-700 dark:text-emerald-200">وضعیت ارتباط</div>
                          <div className="mt-1 text-[13px] font-black text-emerald-700 dark:text-emerald-200">{linked && !invalid ? 'متصل' : invalid ? 'خطادار' : 'بدون اتصال'}</div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-3 text-right dark:border-slate-800 dark:bg-slate-950">
                          <div className="text-[11px] font-black text-slate-500 dark:text-slate-400">آخرین فعالیت</div>
                          <div className="mt-1 text-[13px] font-black text-slate-900 dark:text-slate-50">{lastInteractionAt ? formatIsoToShamsi(lastInteractionAt) : '—'}</div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 rounded-[22px] border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div className="text-[12px] font-black text-slate-700 dark:text-slate-200">Chat ID</div>
                        <button type="button" onClick={() => setTgShowChatId(v => !v)} disabled={!tgChatIdInput.trim()} className="inline-flex h-8 items-center rounded-full border border-slate-200 bg-slate-50 px-3 text-[11px] font-black text-slate-600 transition hover:bg-white disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">{tgShowChatId ? 'مخفی' : 'نمایش'}</button>
                      </div>
                      <div className="flex gap-2">
                        <input type={tgShowChatId ? 'text' : 'password'} inputMode="numeric" dir="ltr" value={tgChatIdInput} onChange={(e) => setTgChatIdInput(e.target.value)} placeholder="مثلاً -1001234567890" className="h-11 min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-900 outline-none    dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100" />
                        <button type="button" onClick={async () => { if (!tgChatIdInput.trim()) return; try { await navigator.clipboard.writeText(tgChatIdInput.trim()); setNotification({ type: 'success', text: 'Chat ID کپی شد.' }); } catch { setNotification({ type: 'error', text: 'کپی Chat ID انجام نشد.' }); } }} disabled={!tgChatIdInput.trim()} className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"><i className="fa-regular fa-copy" /></button>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button type="button" onClick={saveManualChatId} disabled={tgIsSending || !tgChatIdInput.trim()} className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 text-[12px] font-black text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200"><i className="fa-regular fa-floppy-disk" /> ذخیره Chat ID</button>
                        <button type="button" onClick={unlinkChatId} disabled={tgIsSending || !linked} className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 text-[12px] font-black text-rose-700 transition hover:bg-rose-100 disabled:opacity-50 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-200"><i className="fa-regular fa-trash-can" /> حذف اتصال</button>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                    <div className="mb-4 text-[15px] font-black text-slate-900 dark:text-slate-50">وضعیت دریافت پیام</div>
                    <div className="grid gap-3">
                      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                        <span className="text-[12px] font-black text-slate-500 dark:text-slate-400">دریافت پیام</span>
                        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-black ${optedOut ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-200' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-200'}`}><i className={`fa-solid ${optedOut ? 'fa-ban' : 'fa-circle-check'}`} />{optedOut ? 'غیرفعال' : 'فعال'}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                        <span className="text-[12px] font-black text-slate-500 dark:text-slate-400">ارسال پیام</span>
                        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-black ${canSendTelegram ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-200' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-200'}`}><i className={`fa-solid ${canSendTelegram ? 'fa-signal' : 'fa-triangle-exclamation'}`} />{canSendTelegram ? 'فعال' : 'متوقف'}</span>
                      </div>
                    </div>
                    <button type="button" onClick={toggleTelegramOptout} disabled={tgIsSending} className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-[12px] font-black text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                      <i className="fa-solid fa-toggle-on" />
                      {optedOut ? 'فعال‌سازی دریافت پیام' : 'غیرفعال‌سازی دریافت پیام'}
                    </button>
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-center text-[12px] leading-6 text-slate-500 dark:border-slate-800 dark:bg-slate-900/45 dark:text-slate-400">
                      اطلاعات ارتباط فقط برای ارسال پیام‌های تجاری و پیگیری مشتری استفاده می‌شود.
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-right">
                        <div className="text-[14px] font-black text-slate-900 dark:text-slate-50">اطلاعات بیشتر</div>
                        <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">جزئیات اتصال و تاریخچه پیام‌ها</p>
                      </div>
                      <i className="fa-solid fa-chevron-down text-slate-400" />
                    </div>
                    <div className="mt-4 space-y-3 text-[12px] font-bold text-slate-500 dark:text-slate-400">
                      <div className="flex justify-between gap-3"><span>نام کاربری</span><span dir="ltr">{(profile as any).telegramUsername || (profile as any).telegram_username || '—'}</span></div>
                      <div className="flex justify-between gap-3"><span>تاریخ اتصال</span><span>{(profile as any).telegram_linked_at ? formatIsoToShamsi((profile as any).telegram_linked_at) : '—'}</span></div>
                      <div className="flex justify-between gap-3"><span>تعداد پیام‌ها</span><span>{tgConvItems.length.toLocaleString('fa-IR')}</span></div>
                    </div>
                  </div>
                </aside>
              </div>
            </div>
          );
        })()}
      </section>

      {/* دفتر حساب */}
      <div id="customer-ledger-section" data-ui-people-anchor="ledger" />
      <div className="detail-card overflow-hidden text-gray-900 dark:text-gray-100">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 dark:border-slate-800 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl border border-slate-200 bg-white text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                <i className="fa-solid fa-book-open text-lg" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-slate-50">دفتر حساب مشتری</h2>
                <p className="mt-1 text-sm leading-7 text-slate-500 dark:text-slate-400">
                  وضعیت مالی، گردش‌ها و عملیات این مشتری را اینجا مدیریت کنید.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 xl:justify-end">
              <details className="group relative">
                <summary className="flex cursor-pointer list-none items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600 [&::-webkit-details-marker]:hidden">
                  <i className="fa-solid fa-arrow-up-from-bracket text-slate-500" />
                  خروجی
                  <i className="fa-solid fa-chevron-down text-[11px] text-slate-400 transition group-open:rotate-180" />
                </summary>
                <div className="absolute left-0 top-full z-20 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
                  <button
                    type="button"
                    onClick={printProfile}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800"
                  >
                    <span>چاپ / PDF دفتر حساب</span>
                    <i className="fa-solid fa-print text-slate-400" />
                  </button>
                  <button
                    type="button"
                    onClick={openTelegramReport}
                    className="mt-1 flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800"
                  >
                    <span>گزارش برای ارسال</span>
                    <i className="fa-solid fa-paper-plane text-slate-400" />
                  </button>
                </div>
              </details>

              <Button
                onClick={openLedgerModal}
                variant="success"
                className="!h-14 !rounded-2xl !px-5 !text-sm people-action-btn people-action-btn-primary"
                leftIcon={<i className="fas fa-plus" />}
              >
                ثبت تراکنش جدید
              </Button>
            </div>
          </div>

          <div className="customer-ledger-summary-grid grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className={`customer-ledger-summary-card rounded-2xl border p-3.5 shadow-sm ${balanceToneClass}`}>
              <div className="flex items-start justify-between gap-2.5">
                <div>
                  <div className="text-[12px] font-bold">مانده حساب</div>
                  <div className="mt-2 text-[18px] font-black text-slate-900 dark:text-white">{balanceValueText}</div>
                  <div className="mt-0.5 text-[12px] font-extrabold">{balanceDirectionLabel}</div>
                </div>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-current/15 bg-white/70 text-[14px] dark:bg-slate-950/20">
                  <i className="fa-solid fa-wallet" />
                </span>
              </div>
            </div>

            <div className="customer-ledger-summary-card rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
              <div className="flex items-start justify-between gap-2.5">
                <div>
                  <div className="text-[12px] font-bold text-slate-600 dark:text-slate-300">تعداد تراکنش‌ها</div>
                  <div className="mt-2 text-[18px] font-black text-slate-900 dark:text-white">{ledger.length.toLocaleString('fa-IR')}</div>
                </div>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[14px] text-blue-600 dark:bg-blue-950/30 dark:text-blue-200">
                  <i className="fa-solid fa-list-ul" />
                </span>
              </div>
            </div>

            <div className="customer-ledger-summary-card rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
              <div className="flex items-start justify-between gap-2.5">
                <div>
                  <div className="text-[12px] font-bold text-slate-600 dark:text-slate-300">آخرین تراکنش</div>
                  <div className="mt-2 text-[18px] font-black text-slate-900 dark:text-white">
                    {latestLedgerEntry ? formatKnownShamsiDate(latestLedgerEntry.transactionDate, 'ثبت نشده') : 'ثبت نشده'}
                  </div>
                </div>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-[14px] text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-200">
                  <i className="fa-solid fa-calendar-check" />
                </span>
              </div>
            </div>

            <div className="customer-ledger-summary-card rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
              <div className="flex items-start justify-between gap-2.5">
                <div>
                  <div className="text-[12px] font-bold text-slate-600 dark:text-slate-300">آخرین پرداخت</div>
                  <div className="mt-2 text-[18px] font-black text-slate-900 dark:text-white">
                    {ledgerInsights?.lastPaymentDate ? formatKnownShamsiDate(ledgerInsights.lastPaymentDate, 'ثبت نشده') : 'ثبت نشده'}
                  </div>
                </div>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-[14px] text-violet-600 dark:bg-violet-950/30 dark:text-violet-200">
                  <i className="fa-solid fa-credit-card" />
                </span>
              </div>
            </div>
          </div>

          <div className="customer-ledger-toolbar flex flex-col gap-3 rounded-[26px] border border-slate-200 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-950/30 xl:flex-row xl:items-center xl:justify-between">
            <div className="customer-ledger-toolbar-search order-1 xl:order-4 w-full xl:max-w-[25rem]">
              <div className="relative">
                <i className="fa-solid fa-magnifying-glass pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={ledgerSearch}
                  onChange={(e) => setLedgerSearch(e.target.value)}
                  placeholder="جستجو در شرح، مبلغ یا تاریخ"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-4 pl-11 text-[13px] text-slate-700 outline-none transition    dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100  "
                />
              </div>
            </div>

            <div className="customer-ledger-toolbar-filter order-2 xl:order-3 flex w-full items-center xl:w-auto">
              <div className="inline-flex w-full flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900 xl:w-auto">
                {[
                  { key: 'all', label: 'همه' },
                  { key: 'debit', label: 'فقط بدهکار' },
                  { key: 'credit', label: 'فقط بستانکار' },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setLedgerViewFilter(item.key as 'all' | 'debit' | 'credit')}
                    className={`rounded-lg px-3 py-1.5 text-[12px] font-bold transition ${ledgerViewFilter === item.key ? 'bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="customer-ledger-toolbar-meta order-3 xl:order-2 flex flex-wrap items-center gap-2.5">
              <label className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <span className="text-[12px] font-bold text-slate-600 dark:text-slate-300">بازه زمانی</span>
                <select
                  value={ledgerRange}
                  onChange={(e) => setLedgerRange(e.target.value as 'all' | 'today' | 'week' | 'month')}
                  className="min-w-[8rem] bg-transparent text-[12px] font-bold text-slate-900 outline-none dark:text-slate-100"
                >
                  <option value="all">همه بازه‌ها</option>
                  <option value="today">امروز</option>
                  <option value="week">۷ روز اخیر</option>
                  <option value="month">۳۰ روز اخیر</option>
                </select>
              </label>

              <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[12px] font-bold text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                <i className="fa-solid fa-filter-circle-dollar text-slate-400" />
                {filteredLedgerEntries.length.toLocaleString('fa-IR')} رکورد
              </span>
            </div>

            <button
              type="button"
              onClick={printProfile}
              className="customer-ledger-toolbar-print order-4 xl:order-1 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-slate-100"
              title="چاپ / PDF"
            >
              <i className="fa-solid fa-arrow-up-from-bracket" />
            </button>
          </div>

          {filteredLedgerEntries.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/70 px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900/40">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-2xl text-slate-400 shadow-sm dark:bg-slate-900 dark:text-slate-500">
                <i className="fa-solid fa-receipt" />
              </div>
              <h3 className="mt-4 text-lg font-black text-slate-900 dark:text-slate-100">برای این فیلترها رکوردی پیدا نشد</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">جستجو یا بازه زمانی را تغییر دهید، یا اولین تراکنش را برای این مشتری ثبت کنید.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
              <aside className="customer-ledger-smart-summary rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-slate-50">خلاصه هوشمند</h3>
                    <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">خلاصه تصمیم‌گیری سریع قبل از ثبت یا پیگیری تراکنش بعدی.</p>
                  </div>
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200">
                    <i className="fa-solid fa-lightbulb" />
                  </span>
                </div>

                <div className="customer-ledger-smart-summary-list mt-4 space-y-2.5">
                  <div className="customer-ledger-smart-summary-item rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/70">
                    <div className="flex items-start justify-between gap-2.5">
                      <div>
                        <div className="text-[12px] font-bold text-slate-700 dark:text-slate-200">وضعیت وصول</div>
                        <div className={`mt-1.5 text-base font-extrabold ${ledgerStatusSummary.tone}`}>{ledgerStatusSummary.label}</div>
                      </div>
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-200">
                        <i className="fa-solid fa-circle-exclamation" />
                      </span>
                    </div>
                  </div>

                  <div className="customer-ledger-smart-summary-item rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900/70">
                    <div className="flex items-start justify-between gap-2.5">
                      <div>
                        <div className="text-[12px] font-bold text-slate-700 dark:text-slate-200">آخرین تراکنش</div>
                        <div className="mt-1.5 text-[14px] font-extrabold text-slate-900 dark:text-slate-50">{latestLedgerEntry ? formatKnownShamsiDate(latestLedgerEntry.transactionDate, 'ثبت نشده') : 'ثبت نشده'}</div>
                      </div>
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-200">
                        <i className="fa-solid fa-calendar-days" />
                      </span>
                    </div>
                  </div>

                  <div className="customer-ledger-smart-summary-item rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900/70">
                    <div className="flex items-start justify-between gap-2.5">
                      <div>
                        <div className="text-[12px] font-bold text-slate-700 dark:text-slate-200">آخرین پرداخت</div>
                        <div className="mt-1.5 text-[14px] font-extrabold text-slate-900 dark:text-slate-50">{ledgerInsights?.lastPaymentDate ? formatKnownShamsiDate(ledgerInsights.lastPaymentDate, 'ثبت نشده') : 'ثبت نشده'}</div>
                      </div>
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:text-violet-200">
                        <i className="fa-solid fa-credit-card" />
                      </span>
                    </div>
                  </div>

                  <div className="customer-ledger-smart-summary-item rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900/70">
                    <div className="flex items-start justify-between gap-2.5">
                      <div>
                        <div className="text-[12px] font-bold text-slate-700 dark:text-slate-200">میانگین ارزش تراکنش</div>
                        <div className="mt-1.5 text-[14px] font-extrabold text-slate-900 dark:text-slate-50">{formatCurrencyText(averageLedgerValue, readStoredCurrencyUnit())}</div>
                      </div>
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-200">
                        <i className="fa-solid fa-chart-column" />
                      </span>
                    </div>
                  </div>

                  <div className="customer-ledger-smart-summary-item rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900/70">
                    <div className="flex items-start justify-between gap-2.5">
                      <div>
                        <div className="text-[12px] font-bold text-slate-700 dark:text-slate-200">سررسید باز اقساطی</div>
                        <div className="mt-1.5 text-[14px] font-extrabold text-slate-900 dark:text-slate-50">
                          {installmentSalesLoading ? 'در حال بررسی...' : lacheckOpenInstallmentDue ? 'دارد' : 'ندارد'}
                        </div>
                        <div className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
                          {installmentSalesLoading
                            ? 'در حال خواندن سررسیدهای باز مشتری...'
                            : lacheckOpenInstallmentDue
                              ? `${lacheckOpenInstallmentDue.dueDate} — ${lacheckOpenInstallmentDueStatus.hint}`
                              : 'در حال حاضر برای این مشتری سررسید بازی ثبت نشده است.'}
                        </div>
                      </div>
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-200">
                        <i className="fa-solid fa-calendar-check" />
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => firstInstallmentSaleId && navigate(`/installment-sales/${firstInstallmentSaleId}`)}
                  disabled={!firstInstallmentSaleId}
                  className="mt-4 inline-flex w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-[13px] font-black text-slate-800 shadow-sm transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600"
                >
                  <span>{firstInstallmentSaleId ? 'مشاهده پرونده اقساط' : 'پرونده اقساطی فعالی وجود ندارد'}</span>
                  <i className="fa-regular fa-folder-open" />
                </button>
              </aside>

              <section className="customer-ledger-stream rounded-3xl border border-slate-200 bg-white shadow-sm ring-1 ring-slate-100/70 dark:border-slate-800 dark:bg-slate-900/70 dark:ring-slate-800/60">
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-slate-50">گردش حساب</h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">نمایش کامل گردش‌های مالی ثبت‌شده برای این مشتری.</p>
                  </div>
                  <button type="button" onClick={fetchCustomerDetails} className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700" title="بروزرسانی">
                    <i className="fa-solid fa-rotate" />
                  </button>
                </div>

                <div className="space-y-3 p-4">
                  <div className="customer-ledger-stream-head hidden rounded-2xl border border-slate-200 bg-slate-50/95 px-4 py-3 text-[12px] font-black text-slate-500 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-300 xl:grid xl:grid-cols-[96px_minmax(0,1.8fr)_minmax(330px,1fr)_126px] xl:gap-4">
                    <div>تاریخ</div>
                    <div>شرح و سند</div>
                    <div>اثر مالی</div>
                    <div>وضعیت و عملیات</div>
                  </div>

                  {filteredLedgerEntries.map((entry) => {
                    const meta = parseLedgerMeta(entry.description);
                    const recordedAt = ledgerRecordedAt(entry);
                    const expanded = expandedLedgerEntryId === entry.id;
                    const contextMeta = getLedgerEntryContext(entry);
                    const sourceTarget = getLedgerSourceLink(entry, meta);
                    const debitValue = Number(entry.debit || 0);
                    const creditValue = Number(entry.credit || 0);
                    const balanceValue = Number(entry.balance || 0);
                    const balanceDirection = balanceValue > 0 ? 'بدهکار' : balanceValue < 0 ? 'بستانکار' : 'تسویه';
                    const balanceTone = balanceValue > 0
                      ? 'text-rose-600 dark:text-rose-300'
                      : balanceValue < 0
                        ? 'text-emerald-600 dark:text-emerald-300'
                        : 'text-slate-600 dark:text-slate-300';

                    return (
                      <article
                        key={`ledger-${entry.id}-${entry.date || entry.createdAt || entry.description || entry.type || 'row'}`}
                        className={`customer-ledger-stream-row rounded-[26px] border shadow-sm transition-colors ${expanded ? 'border-sky-200 bg-sky-50/35 dark:border-sky-900/45 dark:bg-slate-800/45' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-slate-700 dark:hover:bg-slate-800/35'}`}
                      >
                        <div className="customer-ledger-stream-row-grid grid grid-cols-1 gap-3 p-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(250px,.9fr)_112px] xl:items-center">
                          <div className="flex items-center justify-between gap-3 xl:hidden">
                            <span className="text-xs font-black text-slate-400">تاریخ</span>
                            <span className="inline-flex whitespace-nowrap rounded-2xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                              {formatKnownShamsiDate(entry.transactionDate, '—')}
                            </span>
                          </div>

                          <div className="customer-ledger-main min-w-0">
                            <div className="min-w-0">
                              <h4 className="text-sm font-black leading-7 text-slate-900 dark:text-slate-50">{meta.summary}</h4>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs leading-6 text-slate-500 dark:text-slate-400">
                              {[meta.typeLabel, (meta as any).invoiceId ? `فاکتور #${(meta as any).invoiceId}` : '', meta.saleId ? `شناسه فروش: ${meta.saleId}` : '', meta.imei ? `IMEI: ${meta.imei}` : '']
                                .filter(Boolean)
                                .slice(0, 3)
                                .map((item) => (
                                  <span key={String(item)} className="rounded-full bg-slate-50 px-2.5 py-1 font-semibold text-slate-500 ring-1 ring-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:ring-slate-700">{item}</span>
                                ))}
                              {!meta.typeLabel && !(meta as any).invoiceId && !meta.saleId && !meta.imei ? <span>رکورد مالی مشتری</span> : null}
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <span className="hidden xl:inline-flex whitespace-nowrap rounded-2xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                {formatKnownShamsiDate(entry.transactionDate, '—')}
                              </span>
                              {sourceTarget ? (
                                <button
                                  type="button"
                                  onClick={() => navigate(sourceTarget.path)}
                                  className="inline-flex max-w-full items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-black text-blue-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-100 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200 dark:hover:bg-blue-900/40"
                                  title={sourceTarget.label}
                                >
                                  <i className={sourceTarget.icon} />
                                  <span className="truncate">{sourceTarget.shortLabel || sourceTarget.label}</span>
                                </button>
                              ) : (
                                <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                                  <i className="fa-solid fa-link-slash" />
                                  ریشه تراکنش مشخص نیست
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="customer-ledger-money-box rounded-2xl border border-slate-200 bg-slate-50/80 p-2 dark:border-slate-700 dark:bg-slate-800/50">
                            <div className="grid grid-cols-3 gap-2">
                              <div className="rounded-2xl border border-rose-100 bg-white/90 px-2 py-2 text-center shadow-sm dark:border-rose-900/30 dark:bg-slate-900/70">
                                <div className="text-[10px] font-black text-rose-500/80 dark:text-rose-300/80">بدهکار</div>
                                <div className="mt-1 text-[12px] font-black leading-5 text-rose-600 dark:text-rose-300">{debitValue > 0 ? Math.abs(debitValue).toLocaleString('fa-IR') : '—'}</div>
                                <div className="mt-0.5 text-[10px] font-extrabold text-rose-500 dark:text-rose-300">بدهی</div>
                              </div>
                              <div className="rounded-2xl border border-emerald-100 bg-white/90 px-2 py-2 text-center shadow-sm dark:border-emerald-900/30 dark:bg-slate-900/70">
                                <div className="text-[10px] font-black text-emerald-600/80 dark:text-emerald-300/80">بستانکار</div>
                                <div className="mt-1 text-[12px] font-black leading-5 text-emerald-600 dark:text-emerald-300">{creditValue > 0 ? Math.abs(creditValue).toLocaleString('fa-IR') : '—'}</div>
                                <div className="mt-0.5 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-300">وصول</div>
                              </div>
                              <div className="rounded-2xl border border-slate-200 bg-white/90 px-2 py-2 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                                <div className="text-[10px] font-black text-slate-500 dark:text-slate-400">مانده</div>
                                <div className={`mt-1 text-[12px] font-black leading-5 ${balanceTone}`}>{Math.abs(balanceValue).toLocaleString('fa-IR')}</div>
                                <div className={`mt-0.5 text-[10px] font-extrabold ${balanceTone}`}>{balanceDirection}</div>
                              </div>
                            </div>
                          </div>

                          <div className="customer-ledger-row-actions flex flex-col items-start gap-2">
                            <span className={`inline-flex w-fit items-center gap-1.5 self-auto rounded-full border px-2.5 py-1 text-[11px] font-black ${contextMeta.tone}`}>
                              <i className={`fa-solid ${contextMeta.icon}`} />
                              {contextMeta.label}
                            </span>
                            <button
                              type="button"
                              onClick={() => setExpandedLedgerEntryId((prev) => (prev === entry.id ? null : entry.id))}
                              className="inline-flex h-9 min-w-[92px] items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 text-[11px] font-black text-sky-700 transition hover:border-sky-300 hover:bg-sky-100 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-200 xl:w-auto xl:min-w-[104px]"
                            >
                              <i className={`fa-solid ${expanded ? 'fa-chevron-up' : 'fa-chevron-left'} text-[11px]`} />
                              {expanded ? 'بستن' : 'جزئیات'}
                            </button>
                          </div>
                        </div>

                        {expanded ? (
                          <div className="px-4 pb-4">
                            <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-950/70">
                              <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
                                <div className="customer-ledger-expanded-stat rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">شماره معامله / سند</div>
                                      <div className="mt-2 text-[15px] font-black text-slate-900 dark:text-slate-50">{meta.saleId || (meta as any).invoiceId || (entry as any).referenceId || '—'}</div>
                                    </div>
                                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-[12px] text-blue-600 dark:bg-blue-950/30 dark:text-blue-300">
                                      <i className="fa-solid fa-file-invoice" />
                                    </span>
                                  </div>
                                </div>
                                <div className="customer-ledger-expanded-stat rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">IMEI</div>
                                      <div className="mt-2 text-[15px] font-black text-slate-900 dark:text-slate-50">{meta.imei || '—'}</div>
                                    </div>
                                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 text-[12px] text-violet-600 dark:bg-violet-950/30 dark:text-violet-300">
                                      <i className="fa-solid fa-mobile-screen-button" />
                                    </span>
                                  </div>
                                </div>
                                <div className="customer-ledger-expanded-stat rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">تاریخ ثبت</div>
                                      <div className="mt-2 text-[15px] font-black text-slate-900 dark:text-slate-50">{recordedAt}</div>
                                    </div>
                                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-[12px] text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-300">
                                      <i className="fa-solid fa-calendar-day" />
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 px-4 py-3 text-sm leading-7 text-slate-600 dark:border-slate-700 dark:text-slate-300">
                                {contextMeta.hint}
                                {sourceTarget ? (
                                  <button
                                    type="button"
                                    onClick={() => navigate(sourceTarget.path)}
                                    className="mr-2 inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700 transition hover:bg-blue-100 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200"
                                  >
                                    <i className={sourceTarget.icon} />
                                    رفتن به {sourceTarget.shortLabel}
                                  </button>
                                ) : null}
                              </div>

                              <div className="mt-4 flex flex-col gap-4 border-t border-dashed border-slate-200 pt-4 dark:border-slate-700 xl:flex-row xl:items-center xl:justify-between">
                                <div className="text-sm leading-7 text-slate-600 dark:text-slate-300">
                                  این رکورد در تاریخ <span className="font-bold text-slate-900 dark:text-slate-100">{formatKnownShamsiDate(entry.transactionDate, '—')}</span> ثبت شده و در همان لحظه مانده حساب را به <span className="font-bold text-slate-900 dark:text-slate-100">{Number(entry.balance || 0) > 0 ? 'بدهکار' : Number(entry.balance || 0) < 0 ? 'بستانکار' : 'تسویه'}</span> رسانده است.
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <Button
                                    onClick={() => setEditingEntry(entry)}
                                    variant="secondary"
                                    size="xs"
                                    className="finance-table-action finance-table-action--edit"
                                    leftIcon={<i className="fa-solid fa-pen-to-square" />}
                                  >
                                    ویرایش
                                  </Button>
                                  <Button
                                    onClick={() => handleLedgerDelete(entry.id)}
                                    disabled={isDeletingEntry}
                                    loading={isDeletingEntry}
                                    loadingText="در حال حذف..."
                                    variant="danger"
                                    size="xs"
                                    className="finance-table-action finance-table-action--danger"
                                    leftIcon={<i className="fa-solid fa-trash" />}
                                  >
                                    حذف
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </article>
                    );
                  })}

                </div>
              </section>
            </div>
          )}
        </div>
      </div>

      {/* تاریخچه خرید */}

      <div id="customer-history-section" />
      <div className="people-ledger-grid detail-card p-6 text-gray-900 dark:text-gray-100">
        <div className="customer-history-header mb-4 flex items-center gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
          <span className="people-chip people-chip-neutral customer-history-chip"><i className="fa-solid fa-clock-rotate-left" /> تراکنش‌ها</span>
          <h2 className="text-xl font-black">تاریخچه خرید مشتری</h2>
        </div>
        {purchaseHistory.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">این مشتری هنوز خریدی ثبت اطلاعات نکرده است.</p>
        ) : (
          <div className="people-table-shell">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
              <thead className="bg-slate-50/95 dark:bg-slate-900/80">
                <tr className="text-right [&>th]:px-4 [&>th]:py-3 [&>th]:font-bold [&>th]:text-slate-600 dark:[&>th]:text-slate-200">
                  <th><span className="inline-flex items-center gap-2"><i className="fa-solid fa-calendar-day text-sky-500" /> تاریخ فروش</span></th>
                  <th><span className="inline-flex items-center gap-2"><i className="fa-solid fa-box text-indigo-500" /> شرح کالا</span></th>
                  <th><span className="inline-flex items-center gap-2"><i className="fa-solid fa-credit-card text-violet-500" /> نوع خرید</span></th>
                  <th><span className="inline-flex items-center gap-2"><i className="fa-solid fa-fingerprint text-slate-500" /> IMEI</span></th>
                  <th><span className="inline-flex items-center gap-2"><i className="fa-solid fa-bullseye text-amber-500" /> تعداد</span></th>
                  <th><span className="inline-flex items-center gap-2"><i className="fa-solid fa-sack-dollar text-emerald-500" /> قیمت نهایی</span></th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-transparent divide-y divide-slate-200 dark:divide-slate-800">
                {purchaseHistory.map(sale => {
                  const meta = parseSaleItemMeta(sale);
                  const typeClass = meta.purchaseType === 'installment'
                    ? 'people-chip people-chip-info'
                    : meta.purchaseType === 'credit'
                      ? 'people-chip people-chip-warning'
                      : 'people-chip people-chip-success';
                  const typeIcon = meta.purchaseType === 'installment'
                    ? 'fa-calendar-days'
                    : meta.purchaseType === 'credit'
                      ? 'fa-receipt'
                      : 'fa-wallet';
                  return (
                    <tr key={sale.id} className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 whitespace-nowrap align-middle text-slate-700 dark:text-slate-200">{formatIsoToShamsi(sale.transactionDate)}</td>
                      <td className="px-4 py-3 align-middle text-slate-900 dark:text-slate-100">{meta.cleanName}</td>
                      <td className="px-4 py-3 whitespace-nowrap align-middle"><span className={typeClass}><i className={`fa-solid ${typeIcon}`} /> {meta.purchaseTypeLabel}</span></td>
                      <td className="px-4 py-3 whitespace-nowrap align-middle">{meta.imei ? <span className="people-chip people-chip-info"><i className="fa-solid fa-mobile-screen-button" /> {meta.imei}</span> : <span className="text-slate-400">-</span>}</td>
                      <td className="px-4 py-3 whitespace-nowrap align-middle">{sale.quantity.toLocaleString('fa-IR')}</td>
                      <td className="px-4 py-3 whitespace-nowrap align-middle font-semibold text-indigo-700 dark:text-indigo-300">{formatPrice(sale.totalPrice)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div id="customer-ledger-print-area" className="hidden" aria-hidden="true">
        <div className="customer-print-report">
          <div className="customer-print-report__masthead">
            <div className="customer-print-report__brand">
              <span className="customer-print-report__brand-badge">
                <span>گزارش حرفه‌ای چاپ</span>
              </span>
              <h1 className="customer-print-report__brand-name">{brandStoreName}</h1>
              <p className="customer-print-report__brand-subtitle">گزارش دفتر حساب مشتری با چیدمان رسمی، مناسب چاپ و خروجی PDF.</p>
            </div>
            <div className="customer-print-report__meta">
              <div className="customer-print-report__meta-item"><span className="customer-print-report__meta-label">عنوان گزارش</span><strong>پرونده مالی مشتری</strong></div>
              <div className="customer-print-report__meta-item"><span className="customer-print-report__meta-label">تاریخ چاپ</span><strong>{formatIsoToShamsi(new Date().toISOString())}</strong></div>
              <div className="customer-print-report__meta-item"><span className="customer-print-report__meta-label">شناسه مشتری</span><strong>{profile.id ? Number(profile.id).toLocaleString('fa-IR') : '—'}</strong></div>
            </div>
          </div>

          <div className="customer-print-report__panel-grid">
            <div className="customer-print-panel">
              <div className="customer-print-panel__title">مشخصات مشتری</div>
              <div className="customer-print-profile-grid">
                <div className="customer-print-profile-item"><span>نام مشتری</span><strong>{profile.fullName}</strong></div>
                <div className="customer-print-profile-item"><span>شماره تماس</span><strong>{profile.phoneNumber || '—'}</strong></div>
                <div className="customer-print-profile-item"><span>تاریخ ثبت‌نام</span><strong>{registeredDateLabel}</strong></div>
                <div className="customer-print-profile-item"><span>وضعیت تلگرام</span><strong>{customerTelegramLinked ? 'متصل' : 'متصل نیست'}</strong></div>
                <div className="customer-print-profile-item"><span>آدرس</span><strong>{profile.address || '—'}</strong></div>
                <div className="customer-print-profile-item"><span>یادداشت</span><strong>{profile.notes || '—'}</strong></div>
              </div>
            </div>

            <div className={`customer-print-balance-card ${profile.currentBalance > 0 ? 'customer-print-balance-card--debit' : profile.currentBalance < 0 ? 'customer-print-balance-card--credit' : 'customer-print-balance-card--settled'}`}>
              <div className="customer-print-balance-card__eyebrow">جمع‌بندی مانده حساب</div>
              <div className="customer-print-balance-card__value">{formatLedgerCurrency(profile.currentBalance, 'balance')}</div>
              <div className="customer-print-balance-card__hint">
                {profile.currentBalance > 0
                  ? 'این مشتری بدهکار است و نیاز به پیگیری دریافت دارد.'
                  : profile.currentBalance < 0
                    ? 'این مشتری بستانکار است و در فروش یا تسویه بعدی باید لحاظ شود.'
                    : 'حساب مشتری در وضعیت تسویه قرار دارد.'}
              </div>
            </div>
          </div>

          <div className="customer-print-summary">
            <div className="customer-print-summary__item">
              <span>تعداد تراکنش‌های دفتر</span>
              <strong>{ledger.length.toLocaleString('fa-IR')}</strong>
            </div>
            <div className="customer-print-summary__item">
              <span>جمع بدهکار</span>
              <strong>{ledgerPrintStats.totalDebit.toLocaleString('fa-IR')} تومان</strong>
            </div>
            <div className="customer-print-summary__item">
              <span>جمع بستانکار</span>
              <strong>{ledgerPrintStats.totalCredit.toLocaleString('fa-IR')} تومان</strong>
            </div>
            <div className="customer-print-summary__item">
              <span>آخرین تاریخ تراکنش</span>
              <strong>{ledgerPrintStats.latestTransaction ? formatIsoToShamsi(ledgerPrintStats.latestTransaction) : '—'}</strong>
            </div>
          </div>

          <div className="customer-print-table-wrap">
            <table className="customer-print-table">
              <thead>
                <tr>
                  <th style={{ width: '5%' }}>ردیف</th>
                  <th style={{ width: '9%' }}>نوع</th>
                  <th style={{ width: '10%' }}>تاریخ تراکنش</th>
                  <th style={{ width: '10%' }}>تاریخ ثبت</th>
                  <th style={{ width: '32%' }}>شرح / بابت</th>
                  <th style={{ width: '11%' }}>بدهکار</th>
                  <th style={{ width: '11%' }}>بستانکار</th>
                  <th style={{ width: '12%' }}>مانده</th>
                </tr>
              </thead>
              <tbody>
                {ledger.length > 0 ? ledger.map((entry, index) => {
                  const meta = parseLedgerMeta(entry.description);
                  const kind = getLedgerEntryKind(entry);
                  const rowClass = kind === 'debit' ? 'customer-print-row--debit' : kind === 'credit' ? 'customer-print-row--credit' : '';
                  return (
                    <tr key={`print-${entry.id || index}`} className={rowClass}>
                      <td>{(index + 1).toLocaleString('fa-IR')}</td>
                      <td>
                        <span className={`customer-print-type-badge customer-print-type-badge--${kind}`}>
                          {kind === 'debit' ? 'بدهکار' : kind === 'credit' ? 'بستانکار' : 'متعادل'}
                        </span>
                      </td>
                      <td>{formatIsoToShamsi(entry.transactionDate)}</td>
                      <td>{ledgerRecordedAt(entry)}</td>
                      <td>
                        <div>{meta.summary || entry.description || '—'}</div>
                        {meta.details ? <div style={{ marginTop: '4px', fontSize: '10px', color: '#64748b' }}>{meta.details}</div> : null}
                      </td>
                      <td>{Number(entry.debit || 0).toLocaleString('fa-IR')} تومان</td>
                      <td>{Number(entry.credit || 0).toLocaleString('fa-IR')} تومان</td>
                      <td>{Number(entry.balance || 0).toLocaleString('fa-IR')} تومان</td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={8}>هنوز تراکنشی برای این مشتری ثبت نشده است.</td>
                  </tr>
                )}
              </tbody>
              {ledger.length > 0 ? (
                <tfoot>
                  <tr>
                    <td colSpan={5}>جمع کل گردش دفتر حساب</td>
                    <td>{ledgerPrintStats.totalDebit.toLocaleString('fa-IR')} تومان</td>
                    <td>{ledgerPrintStats.totalCredit.toLocaleString('fa-IR')} تومان</td>
                    <td>{Number(profile.currentBalance || 0).toLocaleString('fa-IR')} تومان</td>
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>

          <p className="customer-print-footnote">این خروجی برای چاپ / PDF به‌صورت جدولی و حرفه‌ای آماده شده تا تاریخ، شرح، نوع تراکنش، بدهکار، بستانکار و مانده هر ردیف شفاف و اجرایی نمایش داده شود.</p>
        </div>
      </div>

      {/* مودال ثبت یادداشت مدیریتی */}
      {isManagerNoteModalOpen && (
        <Modal
          title="ثبت یادداشت مدیریتی"
          onClose={() => {
            if (isSavingManagerNote) return;
            setIsManagerNoteModalOpen(false);
          }}
          widthClass="max-w-2xl"
          iconClass="fa-solid fa-pen-to-square"
          variant="operational"
        >
          <form onSubmit={handleManagerNoteSubmit} className="space-y-5 p-1">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/45">
              <div className="flex items-start justify-between gap-2.5">
                <div className="text-right">
                  <div className="text-[14px] font-black text-slate-900 dark:text-slate-50">{managerNoteContext || 'یادداشت مدیریتی'}</div>
                  <p className="mt-1 text-[12px] leading-6 text-slate-500 dark:text-slate-400">
                    این یادداشت در تاریخچه اختصاصی یادداشت‌های مدیریتی مشتری ذخیره می‌شود.
                  </p>
                </div>
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                  <i className="fa-regular fa-note-sticky" />
                </span>
              </div>
            </div>

            <ModalField label="متن یادداشت" iconClass="fa-solid fa-pen">
              <textarea
                rows={6}
                value={managerNoteDraft}
                onChange={(e) => setManagerNoteDraft(e.target.value)}
                className={inputClass(false, true)}
                placeholder="مثلاً: مشتری برای تسویه مانده تماس گرفته شد و برنامه پرداخت توافق شد."
                autoFocus
              />
            </ModalField>

            <ModalActions
              onCancel={() => setIsManagerNoteModalOpen(false)}
              submitText="ثبت یادداشت در پرونده"
              submittingText="در حال ثبت یادداشت..."
              isSubmitting={isSavingManagerNote}
              submitDisabled={!token || !managerNoteDraft.trim()}
            />
          </form>
        </Modal>
      )}

      {/* مودال ویرایش پروفایل */}
      {isEditModalOpen && (
        <Modal
          title="ویرایش اطلاعات مشتری"
          onClose={() => setIsEditModalOpen(false)}
          widthClass="max-w-[980px]"
          wrapperClassName="customer-edit-v2-overlay"
          iconClass="fa-solid fa-user-pen"
          variant="operational"
        >
          <form onSubmit={handleEditSubmit} className="customer-edit-v2" dir="rtl">
            <FormErrorSummary
              errors={editFormErrors as any}
              labels={{ fullName: 'نام کامل', phoneNumber: 'شماره تماس' }}
              fieldIdMap={{ fullName: 'editFullName', phoneNumber: 'editPhoneNumber' }}
              className="customer-edit-v2__errors"
            />

            <div className="customer-edit-v2__layout">
              <aside className="customer-edit-v2__summary">
                <div className="customer-edit-v2-card customer-edit-v2-card--hero customer-edit-v2-card--hero-side">
                  <div className="customer-edit-v2-hero">
                    <div className="customer-edit-v2-hero__copy">
                      <span className="customer-edit-v2-hero__eyebrow"><i className="fa-solid fa-user-gear" /> فرم بازبینی پرونده مشتری</span>
                      <h3>{editingCustomer.fullName || 'اکبر آریسان'}</h3>
                      <p>اطلاعات هویتی و راه‌های ارتباطی این مشتری را برای مدیریت دقیق‌تر پرونده به‌روزرسانی کنید.</p>
                      <div className="customer-edit-v2-hero__chips">
                        <span className="customer-edit-v2-chip"><i className="fa-solid fa-lock" /> ثبت امن تغییرات</span>
                        <span className="customer-edit-v2-chip"><i className="fa-solid fa-bolt" /> بروزرسانی سریع پرونده</span>
                      </div>
                    </div>
                    <span className="customer-edit-v2-hero__avatar"><i className="fa-solid fa-user" /></span>
                  </div>
                </div>

                <div className="customer-edit-v2-card customer-edit-v2-card--summary">
                  <div className="customer-edit-v2-card__head">
                    <div>
                      <h4>خلاصه وضعیت اطلاعات</h4>
                      <p>نمای کلی و وضعیت اطلاعات مهم مشتری</p>
                    </div>
                    <span className="customer-edit-v2-card__head-icon"><i className="fa-solid fa-chart-column" /></span>
                  </div>

                  <div className="customer-edit-v2-status-list">
                    <div className="customer-edit-v2-status-item">
                      <div className="customer-edit-v2-status-item__copy">
                        <span>شماره تماس</span>
                        <strong dir="ltr">{editingCustomer.phoneNumber || 'ثبت نشده'}</strong>
                        <em className={editingCustomer.phoneNumber?.trim() ? 'is-positive' : 'is-neutral'}><i className={`fa-solid ${editingCustomer.phoneNumber?.trim() ? 'fa-circle-check' : 'fa-circle-minus'}`} /> {editingCustomer.phoneNumber?.trim() ? 'تأیید شده' : 'نیازمند ثبت'}</em>
                      </div>
                      <span className="customer-edit-v2-status-item__icon"><i className="fa-solid fa-phone" /></span>
                    </div>

                    <div className="customer-edit-v2-status-item">
                      <div className="customer-edit-v2-status-item__copy">
                        <span>آدرس</span>
                        <strong>{editingCustomer.address?.trim() ? 'آدرس ثبت شده' : 'آدرس ثبت نشده'}</strong>
                        <em className={editingCustomer.address?.trim() ? 'is-positive' : 'is-neutral'}><i className={`fa-solid ${editingCustomer.address?.trim() ? 'fa-circle-check' : 'fa-circle-minus'}`} /> {editingCustomer.address?.trim() ? 'تکمیل شده' : 'نیازمند تکمیل'}</em>
                      </div>
                      <span className="customer-edit-v2-status-item__icon"><i className="fa-solid fa-location-dot" /></span>
                    </div>

                    <div className="customer-edit-v2-status-item">
                      <div className="customer-edit-v2-status-item__copy">
                        <span>یادداشت داخلی</span>
                        <strong>{editingCustomer.notes?.trim() ? 'یادداشت موجود' : 'بدون یادداشت'}</strong>
                        <em className={editingCustomer.notes?.trim() ? 'is-info' : 'is-neutral'}><i className={`fa-solid ${editingCustomer.notes?.trim() ? 'fa-circle-info' : 'fa-circle-minus'}`} /> {editingCustomer.notes?.trim() ? 'نیازمند بازبینی' : 'در صورت نیاز ثبت شود'}</em>
                      </div>
                      <span className="customer-edit-v2-status-item__icon is-indigo"><i className="fa-regular fa-note-sticky" /></span>
                    </div>
                  </div>
                </div>
              </aside>

              <section className="customer-edit-v2__main">
                <div className="customer-edit-v2-card customer-edit-v2-card--panel">
                  <div className="customer-edit-v2-panel__head">
                    <h4>هویت و ارتباط</h4>
                    <span><i className="fa-solid fa-user" /></span>
                  </div>
                  <div className="customer-edit-v2-grid customer-edit-v2-grid--two">
                    <label className="customer-edit-v2-field">
                      <span className="customer-edit-v2-field__label">نام کامل <em>*</em></span>
                      <div className={`customer-edit-v2-clean-shell ${editFormErrors.fullName ? 'is-error' : ''}`}>
                        <div
                          id="editFullName"
                          role="textbox"
                          tabIndex={0}
                          contentEditable
                          suppressContentEditableWarning
                          className="customer-edit-v2-clean-editor customer-edit-v2-clean-editor--rtl"
                          data-placeholder="نام و نام خانوادگی مشتری"
                          onInput={(event) => {
                            const value = event.currentTarget.textContent || '';
                            setEditingCustomer(prev => ({ ...prev, fullName: value }));
                            if (editFormErrors.fullName) setEditFormErrors(prev => ({ ...prev, fullName: undefined }));
                          }}
                          onBlur={(event) => {
                            const value = event.currentTarget.textContent || '';
                            if (value !== (editingCustomer.fullName || '')) {
                              setEditingCustomer(prev => ({ ...prev, fullName: value }));
                            }
                          }}
                        >{editingCustomer.fullName || ''}</div>
                        <span className="customer-edit-v2-clean-divider" aria-hidden="true" />
                        <span className="customer-edit-v2-clean-icon" aria-hidden="true"><i className="fa-solid fa-user" /></span>
                      </div>
                      {editFormErrors.fullName ? <span className="customer-edit-v2-field__error"><i className="fa-solid fa-circle-exclamation" /> {editFormErrors.fullName}</span> : null}
                    </label>

                    <label className="customer-edit-v2-field">
                      <span className="customer-edit-v2-field__label">شماره تماس <em>*</em></span>
                      <div className={`customer-edit-v2-clean-shell ${editFormErrors.phoneNumber ? 'is-error' : ''}`}>
                        <div
                          id="editPhoneNumber"
                          role="textbox"
                          tabIndex={0}
                          contentEditable
                          suppressContentEditableWarning
                          className="customer-edit-v2-clean-editor customer-edit-v2-clean-editor--ltr"
                          data-placeholder="مثال: 09123456789"
                          onInput={(event) => {
                            const value = (event.currentTarget.textContent || '').replace(/[^0-9]/g, '');
                            if (event.currentTarget.textContent !== value) event.currentTarget.textContent = value;
                            setEditingCustomer(prev => ({ ...prev, phoneNumber: value }));
                            if (editFormErrors.phoneNumber) setEditFormErrors(prev => ({ ...prev, phoneNumber: undefined }));
                          }}
                          onBlur={(event) => {
                            const value = (event.currentTarget.textContent || '').replace(/[^0-9]/g, '');
                            if (value !== (editingCustomer.phoneNumber || '')) {
                              setEditingCustomer(prev => ({ ...prev, phoneNumber: value }));
                            }
                          }}
                        >{editingCustomer.phoneNumber || ''}</div>
                        <span className="customer-edit-v2-clean-divider" aria-hidden="true" />
                        <span className="customer-edit-v2-clean-icon" aria-hidden="true"><i className="fa-solid fa-phone" /></span>
                      </div>
                      {editFormErrors.phoneNumber ? <span className="customer-edit-v2-field__error"><i className="fa-solid fa-circle-exclamation" /> {editFormErrors.phoneNumber}</span> : null}
                    </label>
                  </div>
                </div>

                <div className="customer-edit-v2-card customer-edit-v2-card--panel">
                  <div className="customer-edit-v2-panel__head">
                    <h4>اطلاعات تکمیلی</h4>
                    <span><i className="fa-solid fa-file-lines" /></span>
                  </div>
                  <div className="customer-edit-v2-grid customer-edit-v2-grid--stack">
                    <label className="customer-edit-v2-field customer-edit-v2-field--full">
                      <span className="customer-edit-v2-field__label">آدرس</span>
                      <div className="customer-edit-v2-field__control customer-edit-v2-field__control--textarea">
                        <textarea
                          id="editAddress"
                          name="address"
                          rows={3}
                          value={editingCustomer.address || ''}
                          onChange={handleEditInputChange}
                          className={`customer-edit-v2-input--field customer-edit-v2-textarea ${editFormErrors.address ? 'is-error' : ''}`}
                          placeholder="آدرس ثبت‌شده مشتری"
                        />
                        <span className="customer-edit-v2-field__icon"><i className="fa-solid fa-location-dot" /></span>
                      </div>
                    </label>

                    <label className="customer-edit-v2-field customer-edit-v2-field--full">
                      <span className="customer-edit-v2-field__label">یادداشت داخلی</span>
                      <div className="customer-edit-v2-field__control customer-edit-v2-field__control--textarea">
                        <textarea
                          id="editNotes"
                          name="notes"
                          rows={3}
                          value={editingCustomer.notes || ''}
                          onChange={handleEditInputChange}
                          className={`customer-edit-v2-input--field customer-edit-v2-textarea ${editFormErrors.notes ? 'is-error' : ''}`}
                          placeholder="مثلاً توضیح تکمیلی برای پیگیری یا ارتباط با مشتری"
                        />
                        <span className="customer-edit-v2-field__icon"><i className="fa-regular fa-note-sticky" /></span>
                      </div>
                    </label>
                  </div>
                </div>
              </section>
            </div>

            <div className="customer-edit-v2__footer">
              <div className="customer-edit-v2__footer-note">
                <i className="fa-solid fa-shield-halved" />
                <span>اطلاعات شما با بالاترین سطح امنیت ذخیره می‌شود.</span>
              </div>
              <div className="customer-edit-v2__footer-actions">
                <Button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  variant="ghost"
                  className="customer-edit-v2__cancel-btn"
                >
                  انصراف
                </Button>
                <Button
                  type="submit"
                  disabled={!token || isSubmittingEdit}
                  loading={Boolean(isSubmittingEdit)}
                  loadingText="در حال ذخیره تغییرات..."
                  variant="primary"
                  className="customer-edit-v2__submit-btn"
                  leftIcon={!isSubmittingEdit ? <i className="fa-solid fa-floppy-disk" /> : undefined}
                >
                  ذخیره تغییرات مشتری
                </Button>
              </div>
            </div>
          </form>
        </Modal>
      )}
      {/* مودال ثبت تراکنش مالی */}
      {isLedgerModalOpen && (
        <Modal title={`ثبت تراکنش مالی ${profile.fullName}`} onClose={() => setIsLedgerModalOpen(false)} widthClass="max-w-4xl" iconClass="fa-solid fa-money-bill-transfer" variant="operational">
          <form onSubmit={handleLedgerSubmit} className="people-finance-modal people-finance-modal--horizontal premium-modal-stack p-1">
            <div className="people-finance-modal__side">
              <div className="people-finance-modal__summary">
              <div className="min-w-0">
                <div className="people-finance-modal__eyebrow">دفتر حساب مشتری</div>
                <div className="people-finance-modal__title">{profile.fullName}</div>
                <div className="people-finance-modal__hint">
                  دریافت از مشتری بدهی او را کم می‌کند؛ پرداخت/شارژ حساب زمانی استفاده می‌شود که مشتری بستانکار یا حسابش شارژ شود.
                </div>
              </div>
              <div className="people-finance-modal__balance">
                <span className="people-finance-modal__balance-icon" aria-hidden="true"><i className="fa-solid fa-wallet" /></span>
                <div className="people-finance-modal__balance-copy">
                  <span>مانده فعلی</span>
                  <strong>{Math.abs(Number(profile.currentBalance || 0)).toLocaleString('fa-IR')} تومان</strong>
                  <small>{getBalanceLabel(getBalanceState(profile.currentBalance), 'customer')}</small>
                </div>
              </div>
            </div>

              <div className="people-ledger-type-grid" role="radiogroup" aria-label="نوع تراکنش مشتری">
              {[
                { key: 'credit', title: 'دریافت از مشتری', sub: 'کاهش بدهی یا ثبت وصول', icon: 'fa-hand-holding-dollar' },
                { key: 'debit', title: 'پرداخت / شارژ حساب', sub: 'افزایش طلب مشتری یا اصلاح حساب', icon: 'fa-wallet' },
              ].map((item) => {
                const active = transactionType === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleTransactionTypeChange({ target: { value: item.key } } as ChangeEvent<HTMLInputElement>)}
                    className={["people-ledger-type-card", active ? 'is-active' : ''].join(' ')}
                    aria-pressed={active}
                  >
                    <span className="people-ledger-type-card__icon"><i className={`fa-solid ${item.icon}`} /></span>
                    <span className="people-ledger-type-card__copy">
                      <strong>{item.title}</strong>
                      <small>{item.sub}</small>
                    </span>
                    <span className="people-ledger-type-card__check"><i className="fa-solid fa-check" /></span>
                  </button>
                );
              })}
              </div>
            </div>

            <div className="people-finance-modal__main">
              <FormErrorSummary errors={ledgerFormErrors as any} labels={{ amountType: 'مبلغ تراکنش', transactionDate: 'تاریخ تراکنش', description: 'شرح تراکنش' }} fieldIdMap={{ amountType: 'ledgerAmount', transactionDate: 'ledgerDatePicker', description: 'ledgerDescription' }} className="people-form-error-summary" />

              <div className="people-finance-modal__grid">
              <ModalField label="مبلغ تراکنش" iconClass="fa-solid fa-coins" required error={ledgerFormErrors.amountType} className="people-finance-field people-finance-field--amount">
                <PriceInput
                  id="ledgerAmount" name="amount"
                  value={transactionType === 'credit' ? String(newLedgerEntry.credit || '') : String(newLedgerEntry.debit || '')}
                  onChange={handleLedgerInputChange}
                  className={inputClass(!!ledgerFormErrors.amountType)}
                  preview="مثال: ۵۰۰۰۰۰۰"
                />
                <div className="people-amount-chip-row">
                  {[
                    { label: '۱ میلیون', value: 1000000 },
                    { label: '۵ میلیون', value: 5000000 },
                    { label: '۱۰ میلیون', value: 10000000 },
                    { label: 'کل مانده', value: Math.max(0, Math.abs(Number(profile.currentBalance || 0))) },
                  ].filter((chip, index, arr) => chip.value > 0 && arr.findIndex((x) => x.value === chip.value) === index).map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      className="people-amount-chip"
                      onClick={() => handleLedgerInputChange({ target: { name: 'amount', value: String(chip.value) } })}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </ModalField>

              <ModalField label="تاریخ تراکنش" iconClass="fa-solid fa-calendar-day" required error={ledgerFormErrors.transactionDate} className="people-finance-field people-finance-field--date">
                <ShamsiDatePicker
                  id="ledgerDatePicker"
                  selectedDate={ledgerDateSelected}
                  onDateChange={setLedgerDateSelected}
                  inputClassName={inputClass(!!ledgerFormErrors.transactionDate)}
                />
              </ModalField>
            </div>

            <ModalField label="شرح تراکنش" iconClass="fa-solid fa-note-sticky" required error={ledgerFormErrors.description} className="people-finance-field people-finance-field--description">
              <textarea
                id="ledgerDescription" name="description" rows={3}
                value={newLedgerEntry.description || ''} onChange={handleLedgerInputChange}
                className={inputClass(!!ledgerFormErrors.description, true)} required
                placeholder="مثلاً: دریافت کارت‌به‌کارت بابت بدهی فاکتور / شارژ حساب مشتری"
              />
              <div key={`customer-note-templates-${transactionType}`} className="people-note-template-row">
                {[
                  { id: transactionType === 'credit' ? 'card' : 'charge', value: transactionType === 'credit' ? 'دریافت کارت‌به‌کارت بابت بدهی' : 'شارژ حساب مشتری' },
                  { id: 'cash', value: 'پرداخت نقدی' },
                  { id: 'adjust', value: 'اصلاح حساب' },
                  { id: 'tracking', value: 'شماره پیگیری: ' },
                ].map((note) => {
                  const isActive = String(newLedgerEntry.description || '').trim() === note.value.trim();
                  return (
                    <button
                      key={`${transactionType}-${note.id}`}
                      type="button"
                      className={["people-note-template", isActive ? 'is-active' : ''].join(' ')}
                      onClick={() => handleLedgerInputChange({ target: { name: 'description', value: note.value } })}
                    >
                      {note.value}
                    </button>
                  );
                })}
              </div>
            </ModalField>

              <ModalActions
                onCancel={() => setIsLedgerModalOpen(false)}
                submitText="ثبت تراکنش مالی"
                submittingText="در حال ثبت تراکنش..."
                isSubmitting={isSubmittingLedger}
                submitDisabled={!token}
              />
            </div>
          </form>
        </Modal>
      )}

      {/* مودال ویرایش اطلاعات رکورد دفتر */}
      {editingEntry && (
        <Modal
          title="ویرایش رکورد دفتر مشتری"
          onClose={() => setEditingEntry(null)}
          widthClass="max-w-4xl"
          wrapperClassName="customer-ledger-edit-modal-center"
          iconClass="fa-solid fa-pen-to-square"
          variant="operational"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLedgerEdit();
            }}
            className="space-y-3 p-1"
          >
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[18px] border border-slate-200 bg-white px-3.5 py-2.5 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
                <div className="flex items-start justify-between gap-2.5">
                  <div>
                    <div className="text-[10px] font-black tracking-[0.12em] text-slate-500 dark:text-slate-400">مانده فعلی مشتری</div>
                    <div className="mt-2 text-base font-black text-slate-900 dark:text-slate-50">{balanceValueText}</div>
                    <div className="mt-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-300">{balanceDirectionLabel}</div>
                  </div>
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-50 text-slate-500 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
                    <i className="fa-regular fa-user" />
                  </span>
                </div>
              </div>

              <div className="rounded-[18px] border border-slate-200 bg-white px-3.5 py-2.5 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
                <div className="flex items-start justify-between gap-2.5">
                  <div>
                    <div className="text-[10px] font-black tracking-[0.12em] text-slate-500 dark:text-slate-400">مبلغ رکورد</div>
                    <div className="mt-2 text-base font-black text-slate-900 dark:text-slate-50">{editingEntryAmountText}</div>
                  </div>
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-900/30">
                    <i className="fa-solid fa-wallet" />
                  </span>
                </div>
              </div>

              <div className="rounded-[18px] border border-slate-200 bg-white px-3.5 py-2.5 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
                <div className="flex items-start justify-between gap-2.5">
                  <div>
                    <div className="text-[10px] font-black tracking-[0.12em] text-slate-500 dark:text-slate-400">نوع اثر مالی</div>
                    <div className="mt-2">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black ${editingEntryKindTone}`}>
                        <i className={`fa-solid ${editingEntryKind === 'credit' ? 'fa-arrow-down' : editingEntryKind === 'debit' ? 'fa-arrow-up' : 'fa-scale-balanced'}`} />
                        {editingEntryKindLabel}
                      </span>
                    </div>
                  </div>
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-600 ring-1 ring-rose-100 dark:bg-rose-950/30 dark:text-rose-300 dark:ring-rose-900/30">
                    <i className="fa-solid fa-arrow-right-arrow-left" />
                  </span>
                </div>
              </div>

              <div className="rounded-[18px] border border-slate-200 bg-white px-3.5 py-2.5 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
                <div className="flex items-start justify-between gap-2.5">
                  <div>
                    <div className="text-[10px] font-black tracking-[0.12em] text-slate-500 dark:text-slate-400">شناسه رکورد</div>
                    <div className="mt-2 text-base font-black text-slate-900 dark:text-slate-50">#{Number(editingEntry.id || 0).toLocaleString('fa-IR')}</div>
                  </div>
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 ring-1 ring-blue-100 dark:bg-blue-950/30 dark:text-blue-300 dark:ring-blue-900/30">
                    <i className="fa-solid fa-hashtag" />
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,.85fr)]">
              <div className="space-y-4 rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2.5">
                    <label className="text-sm font-black text-slate-700 dark:text-slate-200">شرح رکورد</label>
                    <i className="fa-regular fa-note-sticky text-blue-500" />
                  </div>
                  <textarea
                    rows={3}
                    className={inputClass(false, true)}
                    value={editingEntry.description || ''}
                    onChange={e => setEditingEntry({ ...editingEntry, description: e.target.value })}
                    placeholder="شرح رکورد دفتر حساب"
                  />
                  <div className="text-left text-[11px] font-bold text-slate-400 dark:text-slate-500">
                    {String(editingEntry.description || '').length.toLocaleString('fa-IR')}/300
                  </div>
                </div>

                <div className="space-y-2.5 rounded-[20px] border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-700 dark:bg-slate-800/40">
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-sm font-black text-slate-700 dark:text-slate-200">ریشه تراکنش</label>
                    <i className="fa-solid fa-link text-blue-500" />
                  </div>
                  {editingEntrySourceTarget ? (
                    <button
                      type="button"
                      onClick={() => navigate(editingEntrySourceTarget.path)}
                      className="inline-flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-[13px] font-black text-slate-800 shadow-sm transition hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-blue-700 dark:hover:text-blue-300"
                      title={editingEntrySourceTarget.label}
                    >
                      <span className="inline-flex items-center gap-3 min-w-0">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-300">
                          <i className={editingEntrySourceTarget.icon} />
                        </span>
                        <span className="truncate">{editingEntrySourceTarget.label}</span>
                      </span>
                      <i className="fa-solid fa-chevron-left text-slate-400" />
                    </button>
                  ) : (
                    <div className="inline-flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                      <span className="inline-flex items-center gap-3">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                          <i className="fa-solid fa-link-slash" />
                        </span>
                        ریشه تراکنش مشخص نیست
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4 rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
                <div className="space-y-2.5">
                  <label className="text-[13px] font-black text-slate-700 dark:text-slate-200">تاریخ رکورد</label>
                  <ShamsiDatePicker
                    id="editCustomerLedgerDate"
                    selectedDate={editingEntry.transactionDate || ''}
                    onDateChange={(value) => setEditingEntry({ ...editingEntry, transactionDate: value })}
                    inputClassName={inputClass(false)}
                  />
                </div>

                <div className="space-y-2.5">
                  <label className="text-[13px] font-black text-slate-700 dark:text-slate-200">دریافت / بستانکار (تومان)</label>
                  <PriceInput
                    id="editCustomerLedgerCredit"
                    name="credit"
                    value={String(editingEntry.credit || '')}
                    onChange={e => setEditingEntry({ ...editingEntry, credit: Number((e.target as HTMLInputElement).value.replace(/[^\d.-]/g, '')) || 0 })}
                    className={inputClass(false)}
                    preview="مبلغ دریافت"
                  />
                </div>

                <div className="space-y-2.5">
                  <label className="text-[13px] font-black text-slate-700 dark:text-slate-200">پرداخت / بدهکار (تومان)</label>
                  <PriceInput
                    id="editCustomerLedgerDebit"
                    name="debit"
                    value={String(editingEntry.debit || '')}
                    onChange={e => setEditingEntry({ ...editingEntry, debit: Number((e.target as HTMLInputElement).value.replace(/[^\d.-]/g, '')) || 0 })}
                    className={inputClass(false)}
                    preview="مبلغ پرداخت"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-[20px] border border-blue-100 bg-blue-50/60 px-4 py-3.5 text-[13px] leading-6.5 text-slate-600 dark:border-blue-900/30 dark:bg-blue-950/20 dark:text-slate-300">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                  <i className="fa-solid fa-circle-info" />
                </span>
                <div className="w-full text-center xl:text-right">
                  با ذخیره این تغییرات، مانده حساب مشتری به‌روزرسانی خواهد شد.
                  <br className="hidden sm:block" />
                  در صورت تغییر نوع یا مبلغ، گزارش‌ها و تسویه‌حساب‌های مرتبط نیز تحت تأثیر قرار می‌گیرند.
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => setEditingEntry(null)}
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-300 bg-white px-6 text-sm font-black text-slate-700 transition hover:border-slate-400 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600"
              >
                انصراف
              </button>
              <button
                type="submit"
                disabled={!token}
                className="inline-flex h-12 min-w-[220px] items-center justify-center gap-2.5 rounded-2xl bg-slate-900 px-6 text-sm font-black text-white shadow-[0_14px_30px_rgba(15,23,42,0.18)] transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-700 dark:hover:bg-blue-600"
              >
                <i className="fa-regular fa-floppy-disk" />
                ذخیره رکورد دفتر
              </button>
            </div>
          </form>
        </Modal>
      )}



    </div>
    </div>
  );
};

export default CustomerDetailPage;