import { useConfirm } from '../contexts/ConfirmContext';
// src/pages/PartnerDetailPage.tsx
import React, { useState, useEffect, useRef, FormEvent, ChangeEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import moment from 'jalali-moment';

import {
  PartnerDetailsPageData,
  PartnerLedgerEntry,
  NotificationMessage,
  NewPartnerData,
  NewLedgerEntryData,
} from '../types';
import Notification from '../components/Notification';
import Modal from '../components/Modal';
import ModalField from '../components/ModalField';
import FormErrorSummary from '../components/FormErrorSummary';
import MessageComposerModal from '../components/MessageComposerModal';
import TelegramLinkModal from '../components/TelegramLinkModal';
import ShamsiDatePicker from '../components/ShamsiDatePicker';
import PriceInput from '../components/PriceInput';
import Button from '../components/Button';
import ModalActions from '../components/ModalActions';
import FinancialProgressBar from '../components/FinancialProgressBar';
import { formatIsoToShamsi, formatIsoToShamsiDateTime } from '../utils/dateUtils';
import { useAuth } from '../contexts/AuthContext';
import { getAuthHeaders } from '../utils/apiUtils';
import { apiFetch } from '../utils/apiFetch';
import { parseApiResult, runWithFeedback, humanizeErrorMessage } from '../utils/feedback';
import { PARTNER_TYPES } from '../constants';
import { getBalanceBadgeClass, getBalanceLabel, getBalanceState } from '../utils/adaptiveUi';
import { focusErrorsSoon, isDuplicateMessage, toSafeNumber } from '../utils/formBehavior';
import { formatCurrencyText, readStoredCurrencyUnit } from '../utils/currency';

/* ---------------- Helpers ---------------- */
const fa2en = (s: string = '') => s.replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString());
const num = (v: any): number => toSafeNumber(v, 0);

type QtyPrice = { qty?: number; total?: number };

const BULK_SETTLEMENT_LAST_NOTE_KEY = 'kourosh.partner.bulkSettlement.lastNote';

const createBulkSettlementBatchId = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `PSB-${stamp}-${random}`;
};

const extractSettlementBatchId = (entry: any): string => {
  const directBatchId = String(entry?.settlementBatchId || '').trim();
  if (directBatchId) return directBatchId;
  const match = String(entry?.description || '').match(/شناسه دسته تسویه[:：]\s*([A-Z0-9-]+)/i);
  return match?.[1]?.trim() || '';
};

const PHONE_LEDGER_REFERENCE_TYPES = new Set(['phone_purchase', 'phone_purchase_edit', 'phone_purchase_reversal_on_edit', 'phone_settlement_payment', 'phone_payment', 'product_settlement_phone']);
const PRODUCT_LEDGER_REFERENCE_TYPES = new Set(['product_purchase', 'product_purchase_edit']);

const getLedgerSystemKind = (entry: any): 'phone' | 'product' | 'unknown' => {
  const refType = String(entry?.referenceType || '').trim();
  if (PHONE_LEDGER_REFERENCE_TYPES.has(refType)) return 'phone';
  if (PRODUCT_LEDGER_REFERENCE_TYPES.has(refType)) return 'product';
  return 'unknown';
};

const getLedgerSystemId = (entry: any): string => {
  const refType = String(entry?.referenceType || '').trim();
  const refId = Number(entry?.referenceId || 0);
  const kind = getLedgerSystemKind(entry);
  if (kind !== 'unknown' && refId > 0) return `${kind === 'phone' ? 'ph' : 'p'}${refId}`;
  if (refType && refId > 0) return `${refType}#${refId}`;
  if (refId > 0) return `ref#${refId}`;
  return `ledger#${Number(entry?.id || 0) || '0'}`;
};

const getPurchaseSystemId = (item: any): string => {
  const type = String(item?.type || 'item').trim();
  const id = Number(item?.id || 0);
  if (type === 'phone') return `ph${id || '0'}`;
  if (type === 'product') return `p${id || '0'}`;
  return `${type || 'item'}#${id || '0'}`;
};

const csvEscape = (value: any) => {
  const text = String(value ?? '').replace(/"/g, '""');
  return `"${text}"`;
};

const extractQtyFromText = (txt?: string): number => {
  if (!txt) return 0;
  const m = fa2en(txt).match(/(\d+)\s*(?:عدد|تا|pcs?)/i);
  return m ? Number(m[1]) : 0;
};
const extractTotalFromText = (txt?: string): number => {
  if (!txt) return 0;
  const m = fa2en(txt).match(/(?:ارزش|مبلغ|جمع)\s*(?:کل)?\s*([\d,]+)/i);
  return m ? Number(m[1].replace(/,/g, '')) : 0;
};

const formatPartnerLedgerCurrency = (amount?: number, type?: 'debit' | 'credit' | 'balance') => {
  if (amount === undefined || amount === null) return <span className="text-gray-700">{formatCurrencyText(0, readStoredCurrencyUnit())}</span>;
  let amountStr = formatCurrencyText(Math.abs(amount), readStoredCurrencyUnit());
  let color = 'text-gray-700';
  if (type === 'balance') {
    if (amount > 0) { color = 'text-red-600 font-semibold'; amountStr += ' (بدهی به همکار)'; }
    else if (amount < 0) { color = 'text-green-700 font-semibold'; amountStr = `${formatCurrencyText(Math.abs(amount), readStoredCurrencyUnit())} (طلب از همکار)`; }
    else amountStr += ' (تسویه)';
  } else if (type === 'debit' && amount > 0) color = 'text-green-600';
  else if (type === 'credit' && amount > 0) color = 'text-red-500';
  return <span className={type === 'balance' ? getBalanceBadgeClass(getBalanceState(amount)) : color}>{amountStr}</span>;
};
const formatPrice = (price?: number | null) => (price == null ? '-' : formatCurrencyText(price, readStoredCurrencyUnit()));


type PhoneSettlementStatusKey = 'settled' | 'partial' | 'unpaid' | 'unknown';

const getPhoneSettlementStatusMeta = (paidValue: any, balanceValue: any, basisValue: any) => {
  const paid = num(paidValue);
  const balance = Math.max(0, num(balanceValue));
  const basis = num(basisValue);
  if (basis <= 0) {
    return {
      key: 'unknown' as PhoneSettlementStatusKey,
      label: 'نامشخص',
      hint: 'مبنای حساب ثبت نشده',
      icon: 'fa-solid fa-circle-question',
      badgeClass: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300',
      progressClass: 'bg-gradient-to-l from-slate-300 via-slate-400 to-slate-500 dark:from-slate-500 dark:via-slate-400 dark:to-slate-300',
      progressPercent: 0,
    };
  }
  const progressPercent = Math.max(0, Math.min(100, Math.round((paid / basis) * 100)));
  if (balance <= 0) {
    return {
      key: 'settled' as PhoneSettlementStatusKey,
      label: 'سرمایه برگشته',
      hint: 'مانده ندارد',
      icon: 'fa-solid fa-circle-check',
      badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/35 dark:text-emerald-200',
      progressClass: 'bg-gradient-to-l from-emerald-500 via-teal-400 to-cyan-400 dark:from-emerald-400 dark:via-teal-300 dark:to-cyan-300',
      progressPercent: 100,
    };
  }
  if (paid > 0) {
    return {
      key: 'partial' as PhoneSettlementStatusKey,
      label: 'نیمه‌تسویه',
      hint: `${progressPercent.toLocaleString('fa-IR')}٪ پرداخت شده`,
      icon: 'fa-solid fa-circle-half-stroke',
      badgeClass: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/35 dark:text-amber-200',
      progressClass: 'bg-gradient-to-l from-amber-500 via-orange-400 to-rose-400 dark:from-amber-300 dark:via-orange-300 dark:to-rose-300',
      progressPercent,
    };
  }
  return {
    key: 'unpaid' as PhoneSettlementStatusKey,
    label: 'بدون پرداخت',
    hint: 'پرداختی روی این گوشی ثبت نشده',
    icon: 'fa-solid fa-hourglass-start',
    badgeClass: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/35 dark:text-rose-200',
    progressClass: 'bg-gradient-to-l from-rose-500 via-orange-400 to-slate-300 dark:from-rose-400 dark:via-orange-300 dark:to-slate-500',
    progressPercent: 0,
  };
};



type SaleClosureMeta = {
  isInstallment: boolean;
  isClosed: boolean;
  label: string;
  hint: string;
  icon: string;
  badgeClass: string;
  remainingAmount: number;
  openCount: number;
};

const getSaleClosureMeta = (item: any): SaleClosureMeta => {
  const sourceType = String(item?.saleSourceType || item?.settlementPriceSource || '').trim();
  const statusText = String(item?.status || '').trim();
  const paymentMethodText = String(item?.salePaymentMethod || '').trim().toLowerCase();
  const isInstallment = sourceType === 'installment_sale' || statusText.includes('قسطی') || paymentMethodText.includes('installment') || paymentMethodText.includes('قسط');
  if (!isInstallment) {
    return {
      isInstallment: false,
      isClosed: true,
      label: 'پرونده فروش بسته',
      hint: 'فروش نقدی/فاکتوری؛ دریافت مشتری در لحظه فروش تسویه شده است.',
      icon: 'fa-solid fa-circle-check',
      badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/35 dark:text-emerald-200',
      remainingAmount: 0,
      openCount: 0,
    };
  }
  const actualTotal = num(item?.installmentSaleActualTotal || item?.saleTotalPrice || item?.installmentSaleScheduledAmount || 0);
  const collected = Math.max(0, num(item?.installmentCollectedAmount || 0));
  const remainingAmount = Math.max(0, actualTotal - collected);
  const openPayments = num(item?.installmentSaleOpenPaymentsCount || 0);
  const openChecks = num(item?.installmentSaleOpenChecksCount || 0);
  const openCount = Math.max(0, openPayments + openChecks);
  const isClosed = remainingAmount <= 0 && openCount <= 0;
  return {
    isInstallment: true,
    isClosed,
    label: isClosed ? 'پرونده اقساط بسته' : `${openCount > 0 ? openCount.toLocaleString('fa-IR') : ''} ${openCount > 0 ? 'قسط/چک باقی‌مانده' : 'پرونده اقساط باز'}`.trim(),
    hint: isClosed
      ? 'همه اقساط و چک‌های این فروش بسته شده‌اند.'
      : `مانده مشتری: ${formatCurrencyText(remainingAmount, readStoredCurrencyUnit())}`,
    icon: isClosed ? 'fa-solid fa-circle-check' : 'fa-solid fa-calendar',
    badgeClass: isClosed
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/35 dark:text-emerald-200'
      : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/35 dark:text-amber-200',
    remainingAmount,
    openCount,
  };
};

const getPartnerCapitalMeta = (item: any) => {
  const meta = getPhoneSettlementStatusMeta(item?.phoneSettlementPaidAmount, item?.phoneSettlementBalance, item?.settlementPurchasePrice);
  const balance = Math.max(0, num(item?.phoneSettlementBalance));
  return {
    ...meta,
    label: balance <= 0 ? 'سرمایه همکار برگشته' : 'بازگشت سرمایه در جریان',
    hint: balance <= 0 ? 'اصل سرمایه این گوشی برای همکار کامل برگشته است.' : `مانده سرمایه همکار: ${formatCurrencyText(balance, readStoredCurrencyUnit())}`,
  };
};

const getPurchaseDateValue = (item: any): string => {
  return String(item?.purchaseDate || item?.datePurchased || item?.dateAdded || item?.transactionDate || item?.soldAt || item?.createdAt || '').trim();
};

const getEntityRegisteredDateValue = (entity: any): string =>
  String(entity?.dateAdded || entity?.createdAt || entity?.created_at || entity?.registrationDate || '').trim();

const formatKnownShamsiDate = (value?: string | null, fallback: string = 'نامشخص'): string => {
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  const formatted = formatIsoToShamsi(raw);
  return formatted === 'تاریخ نامعتبر' ? fallback : formatted;
};

const formatLedgerTransactionDate = (value?: string | null): string => {
  const raw = String(value || '').trim();
  if (!raw) return 'نامشخص';
  const formatted = formatIsoToShamsiDateTime(raw, 'jYYYY/jMM/jDD HH:mm');
  return formatted === 'تاریخ نامعتبر' ? formatIsoToShamsi(raw) : formatted;
};
const describeLacheckPurchase = (item: any): string => {
  if (!item) return 'هنوز خریدی ثبت اطلاعات نشده';
  const dateValue = getPurchaseDateValue(item);
  const dateLabel = formatKnownShamsiDate(dateValue, '');
  const name = String(item?.name || item?.model || item?.title || 'کالای خریداری‌شده').trim();
  const bits = [name, dateLabel].filter(Boolean);
  return bits.length ? bits.join(' • ') : 'آخرین خرید ثبت اطلاعات‌شده';
};

/* ---------------- Component ---------------- */
const PartnerDetailPage: React.FC = () => {
  const confirmAction = useConfirm();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [partnerData, setPartnerData] = useState<PartnerDetailsPageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);

  // Telegram QR linking for partner
  const [tgQrOpen, setTgQrOpen] = useState(false);
  const [tgQrLoading, setTgQrLoading] = useState(false);
  const [tgQrDeepLink, setTgQrDeepLink] = useState('');
  const [tgBotUsernameMissing, setTgBotUsernameMissing] = useState(false);

  type PartnerTelegramConversationItem = {
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
  const [partnerTgConvItems, setPartnerTgConvItems] = useState<PartnerTelegramConversationItem[]>([]);
  const [partnerTgConvLoading, setPartnerTgConvLoading] = useState(false);
  const [partnerTgConvError, setPartnerTgConvError] = useState('');
  const [partnerTgQuickReply, setPartnerTgQuickReply] = useState('');
  const [partnerTgPreset, setPartnerTgPreset] = useState<'custom' | 'balance' | 'settlement' | 'payment_confirm' | 'supply_followup' | 'statement'>('custom');
  const [partnerTgAutoRefresh, setPartnerTgAutoRefresh] = useState(true);
  const [partnerTgNewSinceScroll, setPartnerTgNewSinceScroll] = useState(false);
  const [partnerTgSearchQuery, setPartnerTgSearchQuery] = useState('');
  const [partnerTgDirectionFilter, setPartnerTgDirectionFilter] = useState<'all' | 'in' | 'out' | 'failed'>('all');
  const partnerTgTimelineRef = React.useRef<HTMLDivElement | null>(null);

  // Edit partner modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partial<NewPartnerData>>({});
  const [editFormErrors, setEditFormErrors] = useState<Partial<NewPartnerData>>({});
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Ledger modal (new payment)
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [prefillMessageText, setPrefillMessageText] = useState<string>('');
  const [prefillChannels, setPrefillChannels] = useState<{ sms?: boolean; telegram?: boolean } | undefined>(undefined);
  const initialLedgerEntry: NewLedgerEntryData = { description: '', debit: 0, credit: 0 };
  const [newLedgerEntry, setNewLedgerEntry] = useState<NewLedgerEntryData>(initialLedgerEntry);
  const [ledgerDateSelected, setLedgerDateSelected] = useState<Date | null>(new Date());
  const [ledgerDirection, setLedgerDirection] = useState<'payment' | 'receipt'>('payment');
  const [ledgerFormErrors, setLedgerFormErrors] = useState<Partial<NewLedgerEntryData & { amount?: string; transactionDate?: string }>>({});
  const [isSubmittingLedger, setIsSubmittingLedger] = useState(false);

  // Product-based partner settlement: payment is attached to one sold phone, but still reduces partner total balance.
  const [phoneSettlementItem, setPhoneSettlementItem] = useState<any | null>(null);
  const [phoneSettlementAmount, setPhoneSettlementAmount] = useState<number>(0);
  const [phoneSettlementNote, setPhoneSettlementNote] = useState('');
  const [phoneSettlementDateSelected, setPhoneSettlementDateSelected] = useState<Date | null>(new Date());
  const [phoneSettlementErrors, setPhoneSettlementErrors] = useState<{ amount?: string; transactionDate?: string; note?: string }>({});
  const [isSubmittingPhoneSettlement, setIsSubmittingPhoneSettlement] = useState(false);
  const phoneSettlementNoteTemplates = React.useMemo(() => ([
    { label: 'کارت‌به‌کارت', icon: 'fa-credit-card', text: 'کارت‌به‌کارت بابت تسویه همین گوشی' },
    { label: 'پرداخت نقدی', icon: 'fa-money-bill-wave', text: 'پرداخت نقدی بابت تسویه همین گوشی' },
    { label: 'حواله بانکی', icon: 'fa-building-columns', text: 'حواله بانکی بابت تسویه همین گوشی' },
    { label: 'تسویه توافقی', icon: 'fa-handshake', text: 'تسویه توافقی بابت مانده سرمایه همین گوشی' },
    { label: 'شماره پیگیری', icon: 'fa-hashtag', text: 'شماره پیگیری: ' },
  ]), []);

  // Edit/delete single ledger entry
  const [editingEntry, setEditingEntry] = useState<any | null>(null);
  const [isDeletingEntry, setIsDeletingEntry] = useState(false);
  const [ledgerViewFilter, setLedgerViewFilter] = useState<'all' | 'debit' | 'credit' | 'recent'>('all');
  const [expandedLedgerEntryId, setExpandedLedgerEntryId] = useState<number | null>(null);
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerRange, setLedgerRange] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [ledgerSystemFilter, setLedgerSystemFilter] = useState<string>('all');
  const [ledgerDisplayMode, setLedgerDisplayMode] = useState<'table' | 'cards'>('table');
  const [ledgerVisibleColumns, setLedgerVisibleColumns] = useState<{ systemId: boolean; createdAt: boolean; transactionDate: boolean }>({
    systemId: false,
    createdAt: false,
    transactionDate: false,
  });
  const [isLedgerColumnPickerOpen, setIsLedgerColumnPickerOpen] = useState(false);
  const ledgerColumnPickerButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const ledgerColumnPickerPanelRef = React.useRef<HTMLDivElement | null>(null);
  const [activeLedgerBatchId, setActiveLedgerBatchId] = useState<string>('');
  const [soldPhoneSettlementFilter, setSoldPhoneSettlementFilter] = useState<'all' | 'open' | 'settled'>('all');
  const [soldPhoneCapitalSearch, setSoldPhoneCapitalSearch] = useState('');
  const soldPhoneCapitalSearchRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const searchEl = soldPhoneCapitalSearchRef.current;
    if (!searchEl) return;
    const currentValue = (searchEl.textContent || '').replace(/\u00a0/g, ' ').trim();
    const nextValue = soldPhoneCapitalSearch.trim();
    if (currentValue !== nextValue) {
      searchEl.textContent = nextValue;
    }
  }, [soldPhoneCapitalSearch]);
  const [soldPhoneCapitalSort, setSoldPhoneCapitalSort] = useState<'newest' | 'highestBalance' | 'highestCapital'>('newest');

  useEffect(() => {
    if (!isLedgerColumnPickerOpen) return;
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (ledgerColumnPickerPanelRef.current?.contains(target)) return;
      if (ledgerColumnPickerButtonRef.current?.contains(target)) return;
      setIsLedgerColumnPickerOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsLedgerColumnPickerOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLedgerColumnPickerOpen]);
  const [expandedPhoneSettlementTimelineId, setExpandedPhoneSettlementTimelineId] = useState<number | null>(null);
  const [isFullPhoneSettlementModalOpen, setIsFullPhoneSettlementModalOpen] = useState(false);
  const [fullSettlementAmounts, setFullSettlementAmounts] = useState<Record<number, string>>({});
  const [isSubmittingFullSettlementPhoneId, setIsSubmittingFullSettlementPhoneId] = useState<number | null>(null);
  const [bulkSettlementPhoneIds, setBulkSettlementPhoneIds] = useState<number[]>([]);
  const [bulkSettlementAmount, setBulkSettlementAmount] = useState<string>('');
  const [bulkSettlementNote, setBulkSettlementNote] = useState<string>('');
  const [bulkSettlementPriority, setBulkSettlementPriority] = useState<'highest_balance' | 'oldest_sale' | 'lowest_balance'>('highest_balance');
  const [bulkSettlementBatchId, setBulkSettlementBatchId] = useState<string>(() => createBulkSettlementBatchId());
  const [lastSubmittedBulkSettlementBatchId, setLastSubmittedBulkSettlementBatchId] = useState<string>('');
  const [isSubmittingBulkSettlement, setIsSubmittingBulkSettlement] = useState(false);
  const bulkSettlementNoteTemplates = React.useMemo(() => ([
    { label: 'کارت‌به‌کارت', icon: 'fa-credit-card', text: 'کارت‌به‌کارت بابت تسویه گروهی گوشی‌های فروخته‌شده' },
    { label: 'نقدی', icon: 'fa-money-bill-wave', text: 'پرداخت نقدی بابت تسویه گروهی گوشی‌های فروخته‌شده' },
    { label: 'حواله', icon: 'fa-building-columns', text: 'حواله بانکی بابت تسویه گروهی گوشی‌های فروخته‌شده' },
    { label: 'تسویه توافقی', icon: 'fa-handshake', text: 'تسویه توافقی بابت بخشی از مانده گوشی‌های فروخته‌شده' },
    { label: 'شماره پیگیری', icon: 'fa-hashtag', text: 'شماره پیگیری: ' },
  ]), []);
  const [lastBulkSettlementNote, setLastBulkSettlementNote] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    try {
      return window.localStorage.getItem(BULK_SETTLEMENT_LAST_NOTE_KEY) || '';
    } catch {
      return '';
    }
  });

  const rememberBulkSettlementNote = (noteText: string) => {
    const cleanNote = String(noteText || '').trim().slice(0, 280);
    if (!cleanNote) return;
    setLastBulkSettlementNote(cleanNote);
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(BULK_SETTLEMENT_LAST_NOTE_KEY, cleanNote);
    } catch {
      // localStorage may be disabled; keeping the in-memory suggestion is enough for this session.
    }
  };

  const applyBulkSettlementNoteTemplate = (templateText: string) => {
    if (isSubmittingBulkSettlement) return;
    const nextText = String(templateText || '').trimEnd();
    if (!nextText) return;
    setBulkSettlementNote((current) => {
      const cleanCurrent = String(current || '').trim();
      if (!cleanCurrent) return nextText;
      if (cleanCurrent === nextText || cleanCurrent.includes(nextText.trim())) return current;
      return `${cleanCurrent} | ${nextText}`.slice(0, 280);
    });
  };

  // Derived map from ledger (for purchase table)
  const [ledgerMap, setLedgerMap] = useState<Record<string, QtyPrice>>({});

  const openPartnerQrLinkModal = async () => {
    if (!partnerData?.profile?.id || !token) return;
    setTgQrOpen(true);
    setTgQrLoading(true);
    setTgQrDeepLink('');
    setTgBotUsernameMissing(false);
    try {
      const res = await apiFetch(`/api/telegram/partner-deeplink/${partnerData.profile.id}`, { headers: getAuthHeaders(token) as any });
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
      setNotification({ type: 'error', text: humanizeErrorMessage(e?.message || 'خطا در ساخت لینک ربات همکار', { action: 'ساخت QR لینک همکار', endpoint: '/api/telegram/partner-deeplink' }) });
    } finally {
      setTgQrLoading(false);
    }
  };


  /* -------- Fetch -------- */
  const fetchPartnerDetails = async () => {
    if (!id || !token) return;
    setIsLoading(true);
    try {
      const response = await apiFetch(`/api/partners/${id}`);
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'خطا در دریافت اطلاعات همکار');

      const data: PartnerDetailsPageData = result.data;
      setPartnerData(data);

      const map: Record<string, QtyPrice> = {};
      data.ledger.forEach((l) => {
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
      setNotification({ type: 'error', text: humanizeErrorMessage(error.message, { endpoint: `/api/partners/${id}`, action: 'دریافت اطلاعات همکار' }) });
      if (error.message.includes('یافت نشد')) setTimeout(() => navigate('/partners'), 2000);
    } finally { setIsLoading(false); }
  };
  useEffect(() => { if (token) fetchPartnerDetails(); }, [id, token]);

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


  const partnerTgFilteredConvItems = React.useMemo(() => {
    const query = partnerTgSearchQuery.trim().toLowerCase();
    return partnerTgConvItems.filter((item) => {
      const directionOk =
        partnerTgDirectionFilter === 'all' ||
        (partnerTgDirectionFilter === 'in' && item.direction === 'in') ||
        (partnerTgDirectionFilter === 'out' && item.direction === 'out') ||
        (partnerTgDirectionFilter === 'failed' && item.direction === 'out' && String(item.status || '') === 'failed');
      if (!directionOk) return false;
      if (!query) return true;
      return [item.text, item.status, item.errorCategory, item.lastError, item.createdAt]
        .map((value) => String(value || '').toLowerCase())
        .some((value) => value.includes(query));
    });
  }, [partnerTgConvItems, partnerTgSearchQuery, partnerTgDirectionFilter]);

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
      setIsEditModalOpen(false); fetchPartnerDetails();
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
      setIsLedgerModalOpen(false); fetchPartnerDetails();
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
      await fetchPartnerDetails();
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
      await fetchPartnerDetails();
    } catch (error: any) {
      setNotification({ type: 'error', text: humanizeErrorMessage(error.message, { endpoint: `/api/partners/${id}/ledger`, action: 'ثبت پرداخت از نمای تسویه کامل همکار' }) });
    } finally {
      setIsSubmittingFullSettlementPhoneId(null);
    }
  };

  const handleBulkSettlementSelectAll = () => {
    setBulkSettlementPhoneIds(openSoldPhoneSettlementRows.map((item: any) => Number(item.id)).filter(Boolean));
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
      await fetchPartnerDetails();
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
        fetch(`/api/partners/${id}/ledger/${entryId}`, { method: 'DELETE', headers: getAuthHeaders(token) }).then((response) =>
          parseApiResult(response, { endpoint: `/api/partners/${id}/ledger/${entryId}`, action: 'حذف رکورد دفتر همکار' })
        ),
        {
          kind: 'delete',
          loading: 'در حال حذف رکورد دفتر همکار…',
          success: 'رکورد دفتر همکار با موفقیت حذف شد.',
          endpoint: `/api/partners/${id}/ledger/${entryId}`,
        }
      );
      await fetchPartnerDetails();
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
        fetch(`/api/partners/${id}/ledger/${editingEntry.id}`, {
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
      setEditingEntry(null); await fetchPartnerDetails();
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
  const ledger = partnerData?.ledger ?? [];
  const totalCredits = ledger.reduce((sum, entry) => sum + Number(entry.credit || 0), 0);
  const totalDebits = ledger.reduce((sum, entry) => sum + Number(entry.debit || 0), 0);
  const ledgerVisibleExtraColumnsCount = Number(ledgerVisibleColumns.systemId) + Number(ledgerVisibleColumns.createdAt) + Number(ledgerVisibleColumns.transactionDate);
  const ledgerTableColumnCount = 5 + ledgerVisibleExtraColumnsCount;
  const purchaseHistory = partnerData?.purchaseHistory ?? [];
  const purchaseHistoryBySystemId = React.useMemo(() => {
    const map = new Map<string, any>();
    for (const item of purchaseHistory) {
      const systemId = String((item as any)?.systemId || getPurchaseSystemId(item)).trim();
      map.set(systemId, item);
    }
    return map;
  }, [purchaseHistory]);
  const ledgerSystemOptions = React.useMemo(() => {
    const relatedPurchaseBySystemId = new Map<string, any>();
    for (const item of purchaseHistory) {
      const systemId = String((item as any)?.systemId || getPurchaseSystemId(item)).trim();
      if (systemId && !relatedPurchaseBySystemId.has(systemId)) relatedPurchaseBySystemId.set(systemId, item);
    }

    const map = new Map<string, { id: string; label: string; count: number }>();
    ledger.forEach((entry) => {
      const id = getLedgerSystemId(entry);
      if (!map.has(id)) {
        const relatedPurchase = relatedPurchaseBySystemId.get(id);
        const relatedName = String(relatedPurchase?.name || relatedPurchase?.model || relatedPurchase?.title || '').trim();
        const kind = getLedgerSystemKind(entry);
        const fallbackLabel = kind === 'phone'
          ? 'گوشی'
          : kind === 'product'
            ? 'محصول'
            : String(entry?.referenceType || '').includes('payment') || String(entry?.referenceType || '').includes('settlement')
              ? 'حسابداری'
              : 'رکورد';
        const kindLabel = kind === 'phone' ? 'گوشی' : kind === 'product' ? 'محصول' : fallbackLabel;
        map.set(id, {
          id,
          label: relatedName ? `${id} · ${relatedName} · ${kindLabel}` : `${id} · ${kindLabel}`,
          count: 0,
        });
      }
      map.get(id)!.count += 1;
    });
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label, 'fa'));
  }, [ledger, purchaseHistory]);
  const dedupePurchaseHistoryRows = React.useCallback((rows: any[]) => {
    const seen = new Map<string, any>();
    for (const row of rows) {
      const assetKey = String(row?.assetKey || `${row?.type || 'item'}-${row?.id || 'unknown'}`).trim();
      if (!seen.has(assetKey)) {
        seen.set(assetKey, row);
      }
    }
    return Array.from(seen.values());
  }, []);
  const [purchaseHistoryFilter, setPurchaseHistoryFilter] = useState<'all' | 'phone' | 'product'>('all');
  const [expandedPurchaseHistoryId, setExpandedPurchaseHistoryId] = useState<string | null>(null);
  const purchaseHistoryVisible = React.useMemo(() => {
    const rows = purchaseHistory.filter((item: any) => {
      if (purchaseHistoryFilter === 'phone') return item?.type === 'phone';
      if (purchaseHistoryFilter === 'product') return item?.type === 'product';
      return item?.type === 'phone' || item?.type === 'product';
    });
    const sorted = rows.sort((a: any, b: any) => String(b?.purchaseDate || b?.soldAt || '').localeCompare(String(a?.purchaseDate || a?.soldAt || '')) || Number(b?.id || 0) - Number(a?.id || 0));
    return dedupePurchaseHistoryRows(sorted);
  }, [purchaseHistory, purchaseHistoryFilter, dedupePurchaseHistoryRows]);
  const purchaseHistoryCounts = React.useMemo(() => ({
    all: dedupePurchaseHistoryRows(purchaseHistory.filter((item: any) => item?.type === 'phone' || item?.type === 'product')).length,
    phone: dedupePurchaseHistoryRows(purchaseHistory.filter((item: any) => item?.type === 'phone')).length,
    product: dedupePurchaseHistoryRows(purchaseHistory.filter((item: any) => item?.type === 'product')).length,
  }), [purchaseHistory, dedupePurchaseHistoryRows]);
  const realizedCollectedBalance = Number((profile as any)?.realizedCollectedBalance ?? 0);
  const unsoldInventoryAmount = Number((profile as any)?.unsoldPhonesInventoryAmount ?? 0) + Number((profile as any)?.unsoldAccessoriesInventoryAmount ?? 0);
  const soldPhonesCurrentPurchaseAmount = Number((profile as any)?.soldPhonesCurrentPurchaseAmount ?? (profile as any)?.phoneSalesReceivableAmount ?? 0);
  const soldPhonesInitialPurchaseAmount = Number((profile as any)?.soldPhonesInitialPurchaseAmount ?? 0);
  const soldPhonesCurrentPurchaseDelta = Number((profile as any)?.soldPhoneCurrentDeltaAmount ?? (soldPhonesCurrentPurchaseAmount - soldPhonesInitialPurchaseAmount));
  const soldPhonesProductSettlementPaidAmount = Number((profile as any)?.soldPhonesProductSettlementPaidAmount ?? 0);
  const soldPhonesProductSettlementBalance = Number((profile as any)?.soldPhonesProductSettlementBalance ?? (soldPhonesCurrentPurchaseAmount - soldPhonesProductSettlementPaidAmount));
  const unallocatedPartnerPaymentAmount = Number((profile as any)?.unallocatedPartnerPaymentAmount ?? Math.max(0, totalDebits - soldPhonesProductSettlementPaidAmount));
  const soldPhonesCurrentPurchaseBalance = Number((profile as any)?.soldPhonesCurrentPurchaseBalance ?? (soldPhonesCurrentPurchaseAmount - totalDebits));
  const soldPhoneDailyPriceRows = React.useMemo(() => {
    const rows = purchaseHistory
      .filter((item: any) => item?.type === 'phone' && String(item?.status || '').includes('فروخته'))
      .map((item: any) => {
        const initialPurchasePrice = num(item?.initialPurchasePrice ?? item?.purchasePrice);
        const settlementPurchasePrice = num(item?.settlementPurchasePrice ?? item?.soldDailyPurchasePrice ?? item?.purchasePrice ?? item?.currentPurchasePrice ?? item?.initialPurchasePrice);
        const saleTotalPrice = num(item?.saleTotalPrice ?? item?.saleUnitPrice ?? 0);
        const manualSettlementPaidAmount = num(item?.phoneSettlementManualPaidAmount ?? item?.phoneSettlementPaidAmount ?? 0);
        const sourceType = String(item?.saleSourceType || item?.settlementPriceSource || '').trim();
        const statusText = String(item?.status || '').trim();
        const paymentMethodText = String(item?.salePaymentMethod || '').trim().toLowerCase();
        const isInstallmentSale = sourceType === 'installment_sale' || statusText.includes('قسطی') || paymentMethodText.includes('installment');
        const isCashSale = !isInstallmentSale && (sourceType === 'sales_order' || sourceType === 'legacy_sale') && !paymentMethodText.includes('credit') && !paymentMethodText.includes('اعتبار');
        const installmentActualTotal = num(item?.installmentSaleActualTotal || saleTotalPrice || item?.installmentSaleScheduledAmount || 0);
        const installmentDownPayment = num(item?.installmentSaleDownPayment || 0);
        const installmentTransactionPaid = num(item?.installmentSaleTransactionPaidAmount || 0);
        const installmentCheckPaid = num(item?.installmentSaleCheckPaidAmount || 0);
        const installmentCollectedAmount = Math.max(0, installmentDownPayment + installmentTransactionPaid + installmentCheckPaid);
        const installmentOpenPaymentsCount = num(item?.installmentSaleOpenPaymentsCount || 0);
        const installmentOpenChecksCount = num(item?.installmentSaleOpenChecksCount || 0);
        const installmentCustomerRemainingAmount = isInstallmentSale ? Math.max(0, installmentActualTotal - installmentCollectedAmount) : 0;
        const installmentCollectionRatio = isInstallmentSale && installmentActualTotal > 0 ? Math.min(1, installmentCollectedAmount / installmentActualTotal) : 0;
        // Partner detail must show real money received from the installment/check workflow.
        // Do not prorate the partner cost basis here; it created misleading fractional values
        // like 12,366,667 while the customer actually paid 12,000,000.
        const autoRecognizedPaidAmount = isInstallmentSale
          ? Math.min(settlementPurchasePrice, installmentCollectedAmount)
          : isCashSale
            ? settlementPurchasePrice
            : 0;
        const phoneSettlementPaidAmount = Math.min(settlementPurchasePrice, Math.max(manualSettlementPaidAmount, autoRecognizedPaidAmount));
        const phoneSettlementBalance = Math.max(0, settlementPurchasePrice - phoneSettlementPaidAmount);
        return {
          ...item,
          initialPurchasePrice,
          settlementPurchasePrice,
          phoneSettlementPaidAmount,
          phoneSettlementManualPaidAmount: manualSettlementPaidAmount,
          phoneSettlementAutoPaidAmount: autoRecognizedPaidAmount,
          phoneSettlementBalance,
          phoneSettlementManagedBySale: isInstallmentSale || isCashSale,
          phoneSettlementManagementLabel: isInstallmentSale ? '' : isCashSale ? 'فروش نقدی؛ تسویه خودکار' : '',
          installmentCollectedAmount,
          installmentTransactionPaidAmount: installmentTransactionPaid,
          installmentCheckPaidAmount: installmentCheckPaid,
          installmentOpenPaymentsCount,
          installmentOpenChecksCount,
          installmentCustomerRemainingAmount,
          installmentCollectionRatio,
          dailyPriceDelta: settlementPurchasePrice - initialPurchasePrice,
          saleTotalPrice,
        };
      })
      .sort((a: any, b: any) => String(b?.soldAt || b?.purchaseDate || '').localeCompare(String(a?.soldAt || a?.purchaseDate || '')) || Number(b?.id || 0) - Number(a?.id || 0));
    return dedupePurchaseHistoryRows(rows);
  }, [purchaseHistory, dedupePurchaseHistoryRows]);
  const soldPhoneSettlementFilterCounts = React.useMemo(() => ({
    all: soldPhoneDailyPriceRows.length,
    open: soldPhoneDailyPriceRows.filter((item: any) => Number(item?.phoneSettlementBalance || 0) > 0).length,
    settled: soldPhoneDailyPriceRows.filter((item: any) => Number(item?.phoneSettlementBalance || 0) <= 0).length,
  }), [soldPhoneDailyPriceRows]);
  const soldPhoneSettlementStatusCounts = React.useMemo(() => {
    return soldPhoneDailyPriceRows.reduce((acc: Record<PhoneSettlementStatusKey, number>, item: any) => {
      const meta = getPhoneSettlementStatusMeta(item?.phoneSettlementPaidAmount, item?.phoneSettlementBalance, item?.settlementPurchasePrice);
      acc[meta.key] = (acc[meta.key] || 0) + 1;
      return acc;
    }, { settled: 0, partial: 0, unpaid: 0, unknown: 0 });
  }, [soldPhoneDailyPriceRows]);
  const filteredSoldPhoneDailyPriceRows = React.useMemo(() => {
    let rows = soldPhoneDailyPriceRows;
    if (soldPhoneSettlementFilter === 'open') {
      rows = rows.filter((item: any) => Number(item?.phoneSettlementBalance || 0) > 0);
    } else if (soldPhoneSettlementFilter === 'settled') {
      rows = rows.filter((item: any) => Number(item?.phoneSettlementBalance || 0) <= 0);
    }

    const query = soldPhoneCapitalSearch.trim().toLowerCase();
    if (query) {
      rows = rows.filter((item: any) => {
        const sourceLabel = String(item?.settlementPriceSourceLabel || item?.saleReferenceLabel || 'ثبت مستقیم گوشی');
        return [
          item?.name,
          item?.identifier,
          item?.status,
          item?.soldAt,
          sourceLabel,
          item?.saleReferenceLabel,
        ].some((value) => String(value || '').toLowerCase().includes(query));
      });
    }

    const sortedRows = [...rows];
    sortedRows.sort((a: any, b: any) => {
      if (soldPhoneCapitalSort === 'highestBalance') {
        return Number(b?.phoneSettlementBalance || 0) - Number(a?.phoneSettlementBalance || 0);
      }
      if (soldPhoneCapitalSort === 'highestCapital') {
        return Number(b?.settlementPurchasePrice || 0) - Number(a?.settlementPurchasePrice || 0);
      }
      return String(b?.soldAt || b?.purchaseDate || '').localeCompare(String(a?.soldAt || a?.purchaseDate || '')) || Number(b?.id || 0) - Number(a?.id || 0);
    });
    return sortedRows;
  }, [soldPhoneDailyPriceRows, soldPhoneSettlementFilter, soldPhoneCapitalSearch, soldPhoneCapitalSort]);
  const filteredSoldPhoneDailyPriceTotal = filteredSoldPhoneDailyPriceRows.reduce((sum: number, item: any) => sum + Number(item?.settlementPurchasePrice || 0), 0);
  const filteredSoldPhoneDailyPriceInitialTotal = filteredSoldPhoneDailyPriceRows.reduce((sum: number, item: any) => sum + Number(item?.initialPurchasePrice || 0), 0);
  const filteredSoldPhoneDailyPriceDeltaTotal = filteredSoldPhoneDailyPriceTotal - filteredSoldPhoneDailyPriceInitialTotal;
  const filteredSoldPhoneProductSettlementPaidTotal = filteredSoldPhoneDailyPriceRows.reduce((sum: number, item: any) => sum + Number(item?.phoneSettlementPaidAmount || 0), 0);
  const filteredSoldPhoneProductSettlementBalanceTotal = filteredSoldPhoneDailyPriceRows.reduce((sum: number, item: any) => sum + Number(item?.phoneSettlementBalance || 0), 0);
  const exportPartnerCapitalRows = () => {
    const headers = ['مدل گوشی', 'شناسه', 'وضعیت', 'قیمت روز فروش', 'بهای اولیه', 'سرمایه برگشتی', 'مانده سرمایه', 'تاریخ فروش', 'منبع'];
    const csvRows = filteredSoldPhoneDailyPriceRows.map((item: any) => {
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
    link.download = `partner-capital-${profile.partnerName || 'partner'}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const partnerUnifiedStatusTotals = React.useMemo(() => {
    const rows = soldPhoneDailyPriceRows;
    const partnerCapitalReturnedAmount = rows.reduce((sum: number, item: any) => sum + Math.min(num(item?.settlementPurchasePrice), num(item?.phoneSettlementPaidAmount)), 0);
    const partnerCapitalWaitingAmount = rows.reduce((sum: number, item: any) => sum + Math.max(0, num(item?.phoneSettlementBalance)), 0);
    const openSaleFiles = rows.filter((item: any) => !getSaleClosureMeta(item).isClosed).length;
    const closedSaleFiles = rows.filter((item: any) => getSaleClosureMeta(item).isClosed).length;
    const customerInstallmentRemainingAmount = rows.reduce((sum: number, item: any) => sum + getSaleClosureMeta(item).remainingAmount, 0);
    return { partnerCapitalReturnedAmount, partnerCapitalWaitingAmount, openSaleFiles, closedSaleFiles, customerInstallmentRemainingAmount };
  }, [soldPhoneDailyPriceRows]);

  const phoneSettlementLedgerTypes = React.useMemo(() => new Set(['phone_settlement_payment', 'phone_payment', 'product_settlement_phone']), []);
  const phoneSettlementPaymentsByPhoneId = React.useMemo(() => {
    const map = new Map<number, PartnerLedgerEntry[]>();
    ledger.forEach((entry) => {
      const referenceType = String(entry.referenceType || '').trim();
      const referenceId = Number(entry.referenceId || 0);
      const paidAmount = Number(entry.debit || 0);
      if (!referenceId || paidAmount <= 0 || !phoneSettlementLedgerTypes.has(referenceType)) return;
      const list = map.get(referenceId) || [];
      list.push(entry);
      map.set(referenceId, list);
    });
    map.forEach((list, phoneId) => {
      map.set(phoneId, list.sort((a, b) => String(b.transactionDate || b.createdAt || '').localeCompare(String(a.transactionDate || a.createdAt || '')) || Number(b.id || 0) - Number(a.id || 0)));
    });
    return map;
  }, [ledger, phoneSettlementLedgerTypes]);

  const nextOpenPhoneForSettlement = React.useMemo(() => {
    const openRows = soldPhoneDailyPriceRows
      .filter((item: any) => Number(item?.phoneSettlementBalance || 0) > 0)
      .sort((a: any, b: any) => Number(b?.phoneSettlementBalance || 0) - Number(a?.phoneSettlementBalance || 0));
    return openRows[0] || null;
  }, [soldPhoneDailyPriceRows]);

  const openSoldPhoneSettlementRows = React.useMemo(() => {
    return soldPhoneDailyPriceRows
      .filter((item: any) => Number(item?.phoneSettlementBalance || 0) > 0)
      .sort((a: any, b: any) => Number(b?.phoneSettlementBalance || 0) - Number(a?.phoneSettlementBalance || 0));
  }, [soldPhoneDailyPriceRows]);
  const fullSettlementOpenBalanceTotal = openSoldPhoneSettlementRows.reduce((sum: number, item: any) => sum + Number(item?.phoneSettlementBalance || 0), 0);
  const fullSettlementOpenBasisTotal = openSoldPhoneSettlementRows.reduce((sum: number, item: any) => sum + Number(item?.settlementPurchasePrice || 0), 0);
  const fullSettlementOpenPaidTotal = openSoldPhoneSettlementRows.reduce((sum: number, item: any) => sum + Number(item?.phoneSettlementPaidAmount || 0), 0);

  const getPhoneSaleNavigation = React.useCallback((item: any) => {
    const sourceType = String(item?.saleSourceType || item?.settlementPriceSource || '').trim();
    const sourceId = Number(item?.saleSourceId || 0);
    if (!sourceId) return null;
    if (sourceType === 'installment_sale') {
      return { path: `/installment-sales/${sourceId}`, label: `پرونده اقساطی #${sourceId}`, icon: 'fa-solid fa-file-contract' };
    }
    if (sourceType === 'sales_order') {
      return { path: `/invoices/${sourceId}`, label: `فاکتور فروش #${sourceId}`, icon: 'fa-solid fa-file-invoice-dollar' };
    }
    return null;
  }, []);

  const renderPhoneSaleSourceLink = React.useCallback((item: any, sourceLabel: string, compact = false) => {
    const target = getPhoneSaleNavigation(item);
    const customerName = String(item?.saleCustomerName || '').trim();
    const customerPhone = String(item?.saleCustomerPhone || '').trim();
    const customerText = customerName
      ? `مشتری: ${customerName}${customerPhone ? ` · ${customerPhone}` : ''}`
      : 'مشتری ثبت نشده';
    const baseClass = compact
      ? 'inline-flex max-w-full items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-black text-blue-700 shadow-sm transition hover:bg-blue-100 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200 dark:hover:bg-blue-900/40'
      : 'inline-flex max-w-full items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] font-black text-blue-700 shadow-sm transition hover:bg-blue-100 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200 dark:hover:bg-blue-900/40';
    if (!target) {
      return (
        <span className={compact
          ? 'inline-flex max-w-full items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-extrabold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
          : 'inline-flex max-w-full items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-extrabold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'}
          title={customerText}
        >
          <i className="fa-solid fa-file-invoice text-slate-400" />
          <span className="truncate">{sourceLabel}</span>
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
        <span className="truncate">{sourceLabel}</span>
        {customerName && <span className="hidden truncate text-blue-500/80 lg:inline">· {customerName}</span>}
        <i className="fa-solid fa-arrow-up-right-from-square text-[9px] opacity-70" />
      </button>
    );
  }, [getPhoneSaleNavigation, navigate]);
  const bulkSettlementIdSet = React.useMemo(() => new Set(bulkSettlementPhoneIds.map((phoneId) => Number(phoneId)).filter(Boolean)), [bulkSettlementPhoneIds]);
  const selectedBulkSettlementRows = React.useMemo(() => {
    const selected = openSoldPhoneSettlementRows.filter((item: any) => bulkSettlementIdSet.has(Number(item?.id || 0)));
    return selected.sort((a: any, b: any) => {
      if (bulkSettlementPriority === 'oldest_sale') {
        return String(a?.soldAt || a?.purchaseDate || '').localeCompare(String(b?.soldAt || b?.purchaseDate || '')) || Number(a?.id || 0) - Number(b?.id || 0);
      }
      if (bulkSettlementPriority === 'lowest_balance') {
        return Number(a?.phoneSettlementBalance || 0) - Number(b?.phoneSettlementBalance || 0);
      }
      return Number(b?.phoneSettlementBalance || 0) - Number(a?.phoneSettlementBalance || 0);
    });
  }, [openSoldPhoneSettlementRows, bulkSettlementIdSet, bulkSettlementPriority]);
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

  const ledgerSettlementBatchOptions = React.useMemo(() => {
    const map = new Map<string, { id: string; count: number; amount: number; latest: string }>();
    ledger.forEach((entry) => {
      const batchId = extractSettlementBatchId(entry);
      if (!batchId) return;
      const current = map.get(batchId) || { id: batchId, count: 0, amount: 0, latest: '' };
      current.count += 1;
      current.amount += Math.max(Number(entry.debit || 0), Number(entry.credit || 0));
      const entryDate = String(entry.transactionDate || entry.createdAt || '');
      if (entryDate > current.latest) current.latest = entryDate;
      map.set(batchId, current);
    });
    return Array.from(map.values()).sort((a, b) => String(b.latest || '').localeCompare(String(a.latest || '')));
  }, [ledger]);

  useEffect(() => {
    if (!activeLedgerBatchId) return;
    if (!ledgerSettlementBatchOptions.some((item) => item.id === activeLedgerBatchId)) {
      setActiveLedgerBatchId('');
    }
  }, [activeLedgerBatchId, ledgerSettlementBatchOptions]);

  const filteredLedgerEntries = React.useMemo(() => {
    const q = ledgerSearch.trim().toLowerCase();
    const now = Date.now();
    return ledger.filter((entry) => {
      const systemId = getLedgerSystemId(entry);
      const text = `${entry.description} ${entry.debit} ${entry.credit} ${entry.balance} ${entry.transactionDate} ${entry.createdAt || ''} ${systemId}`.toLowerCase();
      const ts = new Date(entry.transactionDate || entry.createdAt || entry.updatedAt || 0).getTime();
      const debit = Number(entry.debit || 0);
      const credit = Number(entry.credit || 0);
      if (ledgerViewFilter === 'debit' && debit <= 0) return false;
      if (ledgerViewFilter === 'credit' && credit <= 0) return false;
      if (ledgerViewFilter === 'recent' && (!ts || now - ts > 31 * 24 * 60 * 60 * 1000)) return false;
      if (ledgerRange === 'today') {
        const day = new Date();
        day.setHours(0,0,0,0);
        if (!ts || ts < day.getTime()) return false;
      }
      if (ledgerRange === 'week' && (!ts || now - ts > 7 * 24 * 60 * 60 * 1000)) return false;
      if (ledgerRange === 'month' && (!ts || now - ts > 31 * 24 * 60 * 60 * 1000)) return false;
      if (activeLedgerBatchId && extractSettlementBatchId(entry) !== activeLedgerBatchId) return false;
      if (ledgerSystemFilter !== 'all' && systemId !== ledgerSystemFilter) return false;
      if (q && !text.includes(q)) return false;
      return true;
    });
  }, [ledger, ledgerViewFilter, ledgerSearch, ledgerRange, activeLedgerBatchId, ledgerSystemFilter]);
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
  const activeBatchSummary = activeLedgerBatchId ? ledgerSettlementBatchOptions.find((item) => item.id === activeLedgerBatchId) : null;
  const batchScopedLedgerEntries = activeLedgerBatchId ? filteredLedgerEntries.filter((entry) => extractSettlementBatchId(entry) === activeLedgerBatchId) : [];
  const activeBatchLedgerMetrics = React.useMemo(() => {
    if (!activeLedgerBatchId) return null;
    const entries = batchScopedLedgerEntries;
    const totalDebit = entries.reduce((sum, entry) => sum + Number(entry.debit || 0), 0);
    const totalCredit = entries.reduce((sum, entry) => sum + Number(entry.credit || 0), 0);
    const latestEntry = entries[0] || null;
    return {
      count: entries.length,
      totalDebit,
      totalCredit,
      latestBalance: Number(latestEntry?.balance || 0),
      latestDate: latestEntry ? formatIsoToShamsi(latestEntry.transactionDate || latestEntry.createdAt || '') : '—',
    };
  }, [activeLedgerBatchId, batchScopedLedgerEntries]);

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
    if (ledger.length === 0) {
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
  }, [ledger.length, resetLedgerFilters]);

  const handleExportActiveBatchCsv = () => {
    if (!activeLedgerBatchId || batchScopedLedgerEntries.length === 0) {
      setNotification({ type: 'error', text: 'برای خروجی Excel ابتدا یک دسته تسویه را انتخاب کن.' });
      return;
    }
    const rows = batchScopedLedgerEntries.map((entry) => ({
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

  const handlePrintActiveBatch = () => {
    if (!activeLedgerBatchId || batchScopedLedgerEntries.length === 0) {
      setNotification({ type: 'error', text: 'برای چاپ ابتدا یک دسته تسویه را انتخاب کن.' });
      return;
    }
    const totalDebit = batchScopedLedgerEntries.reduce((sum, entry) => sum + Number(entry.debit || 0), 0);
    const totalCredit = batchScopedLedgerEntries.reduce((sum, entry) => sum + Number(entry.credit || 0), 0);
    const rowsHtml = batchScopedLedgerEntries.map((entry) => `
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
      <div class="summary"><div class="card">تعداد رکورد<b>${batchScopedLedgerEntries.length.toLocaleString('fa-IR')}</b></div><div class="card">جمع پرداخت<b>${totalDebit.toLocaleString('fa-IR')} تومان</b></div><div class="card">جمع بستانکاری<b>${totalCredit.toLocaleString('fa-IR')} تومان</b></div></div>
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
        className={`overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_60px_-42px_rgba(15,23,42,0.30)] transition-shadow hover:shadow-[0_26px_62px_-38px_rgba(15,23,42,0.34)] dark:border-slate-800 dark:bg-slate-950/60 ${
          expanded ? 'ring-1 ring-violet-200 dark:ring-violet-900/40' : ''
        }`}
      >
        <div className="flex flex-col gap-4 border-b border-slate-100 p-4 dark:border-slate-800 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 justify-end justify-end">
              <div className="partner-system-id-block partner-system-id-block--right flex w-[148px] flex-col items-end gap-1 rounded-3xl border border-violet-200 bg-violet-50 px-3 py-2 text-right text-violet-700 dark:border-violet-900/40 dark:bg-violet-950/30 dark:text-violet-200">
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
            <div className="mt-2 text-base font-black leading-7 text-slate-900 dark:text-slate-50">{meta.summary}</div>
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
              className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              title="ویرایش تراکنش"
            >
              <i className="fa-solid fa-pen-to-square" />
              ویرایش
            </button>
            <button
              type="button"
              onClick={() => handleLedgerDelete(entry.id)}
              disabled={isDeletingEntry}
              className="inline-flex h-10 items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 text-xs font-bold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-200 dark:hover:bg-rose-950/40"
              title="حذف تراکنش"
            >
              <i className="fa-solid fa-trash-can" />
              حذف
            </button>
            <button
              type="button"
              onClick={() => setExpandedLedgerEntryId((prev) => (prev === entry.id ? null : entry.id))}
              className="inline-flex h-10 items-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-3 text-xs font-bold text-violet-700 transition hover:bg-violet-100 dark:border-violet-900/40 dark:bg-violet-950/20 dark:text-violet-200 dark:hover:bg-violet-950/40"
              title="نمایش جزئیات درون کارت"
            >
              <i className={`fa-solid ${expanded ? 'fa-chevron-up' : 'fa-chevron-down'}`} />
              {expanded ? 'بستن' : 'باز کردن'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-rose-100 bg-rose-50/80 p-3 dark:border-rose-900/30 dark:bg-rose-950/20">
            <div className="text-[11px] font-bold text-rose-700 dark:text-rose-300">بدهکار</div>
            <div className="mt-1 text-sm font-black text-rose-700 dark:text-rose-200">{formatCurrencyText(entry.debit, readStoredCurrencyUnit())}</div>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-3 dark:border-emerald-900/30 dark:bg-emerald-950/20">
            <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">بستانکار</div>
            <div className="mt-1 text-sm font-black text-emerald-700 dark:text-emerald-200">{formatCurrencyText(entry.credit, readStoredCurrencyUnit())}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/50">
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">مانده</div>
            <div className="mt-1 text-sm font-black text-slate-900 dark:text-slate-50">{formatPartnerLedgerCurrency(entry.balance, 'balance')}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 border-t border-slate-100 p-4 dark:border-slate-800 lg:grid-cols-[1fr_0.9fr]">
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
        </div>

        {expanded ? (
          <div className="border-t border-slate-100 p-4 dark:border-slate-800">
            <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/40">
              <div className="text-[10px] font-black tracking-[0.16em] text-slate-400 dark:text-slate-500">ALL FIELDS</div>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {details.map((line) => (
                  <div key={`${entry.id}-${line}`} className="rounded-2xl border border-white bg-white px-3 py-2 text-xs leading-6 text-slate-600 shadow-[0_10px_24px_-22px_rgba(15,23,42,0.18)] dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
                    {line}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </article>
    );
  };

  const partnerTypeLabel = PARTNER_TYPES.find((p) => p.value === profile.partnerType)?.label || profile.partnerType;

  const openTelegramReport = async () => {
    try {
      if (!token || !profile?.id) return;
      setNotification(null);
      const res = await fetch(`/api/reports/partner/${profile.id}/message`, { headers: getAuthHeaders(token) });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.message || 'خطا در دریافت گزارش');
      setPrefillChannels({ sms: false, telegram: true });
      setPrefillMessageText(String(json?.data?.text || ''));
      setIsMessageModalOpen(true);
    } catch (e: any) {
      setNotification({ type: 'error', text: e?.message || 'خطا در آماده‌سازی گزارش' });
    }
  };

  const sanitizePhone = (value?: string | null) => String(value || '').replace(/[^\d+]/g, '');
  const openTel = () => {
    const phone = sanitizePhone(profile.phoneNumber);
    if (phone) window.open(`tel:${phone}`, '_self');
    else setNotification({ type: 'error', text: 'برای این همکار شماره تماس ثبت اطلاعات نشده است.' });
  };
  const openWhatsApp = () => {
    const phone = sanitizePhone(profile.phoneNumber).replace(/^0/, '98');
    if (phone) window.open(`https://wa.me/${phone}`, '_blank', 'noopener,noreferrer');
    else setNotification({ type: 'error', text: 'برای این همکار شماره تماس ثبت اطلاعات نشده است.' });
  };
  const openPartnerTelegram = () => {
    setPrefillMessageText(`سلام ${profile.partnerName} عزیز،`);
    setPrefillChannels({ telegram: true, sms: false });
    setIsMessageModalOpen(true);
  };
  const openPartnerPayment = () => openLedgerModal();
  const scrollToLedger = () => document.getElementById('partner-ledger-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const scrollToHistory = () => document.getElementById('partner-history-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const printProfile = () => window.print();
  const partnerTelegramChatId = String((profile as any).telegramChatId || (profile as any).telegram_chat_id || '').trim();
  const partnerTelegramLinkedAtRaw = String((profile as any).telegram_linked_at || '').trim();
  const partnerTelegramLinked = !!partnerTelegramChatId;
  const partnerTelegramLinkedAt = partnerTelegramLinkedAtRaw ? formatIsoToShamsi(partnerTelegramLinkedAtRaw) : null;

  const buildPartnerTelegramVars = () => {
    const balance = Number(profile.currentBalance || 0);
    const balanceLabel = balance > 0
      ? `بدهی فروشگاه به همکار: ${formatCurrencyText(balance, readStoredCurrencyUnit())}`
      : balance < 0
        ? `طلب فروشگاه از همکار: ${formatCurrencyText(Math.abs(balance), readStoredCurrencyUnit())}`
        : 'حساب همکار تسویه است';
    const ledgerCount = ledger.length.toLocaleString('fa-IR');
    const lastLedgerDate = ledger[0]?.transactionDate ? formatIsoToShamsi(ledger[0].transactionDate) : '—';
    const partnerLink = typeof window === 'undefined' ? '' : `${window.location.origin}/#/partners/${profile.id}`;
    return {
      name: String(profile.partnerName || ''),
      phone: String(profile.phoneNumber || ''),
      balance: balanceLabel,
      amount: formatCurrencyText(Math.abs(balance), readStoredCurrencyUnit()),
      ledgerCount,
      lastLedgerDate,
      link: partnerLink,
    };
  };

  const resolvePartnerTelegramText = (rawText: string) => {
    const vars = buildPartnerTelegramVars();
    return String(rawText || '').replace(/\{(name|phone|balance|amount|ledgerCount|lastLedgerDate|link)\}/g, (match, key) => {
      return (vars as any)[key] || match;
    });
  };

  const applyPartnerTgPreset = (preset: typeof partnerTgPreset) => {
    setPartnerTgPreset(preset);
    const map: Record<typeof partnerTgPreset, string> = {
      custom: '',
balance: `👋 سلام {name} عزیز،

📋 وضعیت فعلی حساب شما در فروشگاه کوروش:

💰 مانده حساب: {balance}

📑 تعداد رکوردهای دفتر: {ledgerCount}

🕒 آخرین گردش مالی: {lastLedgerDate}`,

      settlement: `👋 سلام {name} عزیز،

🧾 برای هماهنگی تسویه حساب، لطفاً وضعیت مانده را بررسی کنید:

💰 مانده فعلی: {balance}

📨 در صورت انجام پرداخت، لطفاً رسید و شماره پیگیری را ارسال بفرمایید.`,

      payment_confirm: `👋 سلام {name} عزیز،

✅ یک تراکنش پرداخت/دریافت مربوط به حساب همکاری شما ثبت شد.

🕒 آخرین گردش مالی: {lastLedgerDate}

💰 وضعیت فعلی حساب: {balance}`,

      supply_followup: `👋 سلام {name} عزیز،

📦 برای پیگیری تأمین کالا و هماهنگی مربوط به موجودی یا فاکتور خرید با شما در ارتباط هستیم.

💰 وضعیت فعلی حساب: {balance}`,

      statement: `📊 گزارش خلاصه حساب همکاری

👤 نام همکار: {name}
📞 شماره تماس: {phone}

💰 مانده حساب: {balance}
📑 تعداد رکوردهای دفتر: {ledgerCount}
🕒 آخرین گردش مالی: {lastLedgerDate}

🔗 لینک دسترسی سریع: {link}`,

    };
    if (map[preset]) setPartnerTgQuickReply(map[preset]);
  };

  const sendPartnerTelegramQuickReply = async () => {
    if (!token || !profile?.id) return;
    if (!partnerTelegramChatId) return setNotification({ type: 'error', text: 'این همکار به تلگرام لینک نشده است.' });
    const raw = String(partnerTgQuickReply || '').trim();
    if (!raw) return setNotification({ type: 'error', text: 'متن پیام همکار خالی است.' });
    const text = resolvePartnerTelegramText(raw);
    setPartnerTgConvLoading(true);
    try {
      const response = await apiFetch('/api/messages/send', {
        method: 'POST',
        body: JSON.stringify({
          recipientType: 'partner',
          recipientId: Number(profile.id),
          recipientName: profile.partnerName,
          telegramChatId: partnerTelegramChatId,
          channels: ['telegram'],
          text,
          saveToProfile: false,
          variables: buildPartnerTelegramVars(),
        }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || json?.success === false) throw new Error(json?.message || 'ارسال پیام تلگرام همکار انجام نشد.');
      setNotification({ type: 'success', text: 'پیام همکار در صف ارسال تلگرام قرار گرفت.' });
      setPartnerTgQuickReply('');
      setPartnerTgPreset('custom');
      fetchPartnerTelegramConversation(Number(profile.id));
    } catch (error: any) {
      setNotification({ type: 'error', text: error?.message || 'ارسال پیام تلگرام همکار انجام نشد.' });
    } finally {
      setPartnerTgConvLoading(false);
    }
  };

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
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                <i className={chip.icon} />
              </span>
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
    const payments = phoneSettlementPaymentsByPhoneId.get(Number(item?.id || 0)) || [];
    const manualPaidTotal = payments.reduce((sum, entry) => sum + Number(entry.debit || 0), 0);
    const basis = Number(item?.settlementPurchasePrice || 0);
    const paidTotal = Math.max(manualPaidTotal, Number(item?.phoneSettlementPaidAmount || 0));
    const balance = Math.max(0, basis - paidTotal);
    const progressPercent = basis > 0 ? Math.min(100, Math.round((paidTotal / basis) * 100)) : 0;
    const phoneTitle = item?.name || 'گوشی فروخته‌شده';
    const phoneIdentifier = item?.identifier || 'IMEI ثبت نشده';

    return (
      <section className={`phone-settlement-timeline ${compact ? 'phone-settlement-timeline--compact' : ''}`} aria-label="تاریخچه تسویه همین گوشی">
        <div className="phone-settlement-timeline__header">
          <div className="phone-settlement-timeline__title-block">
            <span className="phone-settlement-timeline__icon" aria-hidden="true">
              <i className="fa-solid fa-timeline" />
            </span>
            <div className="min-w-0">
              <div className="phone-settlement-timeline__eyebrow">تاریخچه پرداخت‌های همین گوشی</div>
              <h4 className="phone-settlement-timeline__title">{phoneTitle}</h4>
              <div className="phone-settlement-timeline__meta">
                <span dir="ltr" className="font-mono">{phoneIdentifier}</span>
                <span>•</span>
                <span>{item?.phoneSettlementManagedBySale ? item.phoneSettlementManagementLabel : payments.length ? `${payments.length.toLocaleString('fa-IR')} پرداخت ثبت‌شده` : 'بدون پرداخت ثبت‌شده'}</span>
              </div>
            </div>
          </div>

          <div className="phone-settlement-timeline__summary" aria-label="خلاصه تسویه گوشی">
            <div className="phone-settlement-timeline__summary-item">
              <i className="fa-solid fa-sack-dollar" aria-hidden="true" />
              <span>مبنای سرمایه</span>
              <strong>{basis.toLocaleString('fa-IR')}</strong>
            </div>
            <div className="phone-settlement-timeline__summary-item is-paid">
              <i className="fa-solid fa-arrow-rotate-left" aria-hidden="true" />
              <span>سرمایه بازگشتی</span>
              <strong>{paidTotal.toLocaleString('fa-IR')}</strong>
            </div>
            <div className={`phone-settlement-timeline__summary-item ${balance > 0 ? 'is-balance' : 'is-settled'}`}>
              <i className={`fa-solid ${balance > 0 ? 'fa-scale-balanced' : 'fa-circle-check'}`} aria-hidden="true" />
              <span>{balance > 0 ? 'مانده' : 'وضعیت'}</span>
              <strong>{balance > 0 ? balance.toLocaleString('fa-IR') : 'تسویه'}</strong>
            </div>
          </div>
        </div>

        {renderPhonePriceHistory(item)}

        <div className="phone-settlement-timeline__progress" aria-label={`پیشرفت تسویه ${progressPercent} درصد`}>
          <div className="phone-settlement-timeline__progress-top">
            <span>پیشرفت تسویه</span>
            <strong>{progressPercent.toLocaleString('fa-IR')}٪</strong>
          </div>
          <div className="phone-settlement-timeline__track">
            <span className="phone-settlement-timeline__bar" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        {payments.length === 0 ? (
          <div className="phone-settlement-timeline__empty">
            <span className="phone-settlement-timeline__empty-icon" aria-hidden="true"><i className="fa-solid fa-receipt" /></span>
            <div>
              <div className="phone-settlement-timeline__empty-title">پرداخت دستی جداگانه‌ای برای این گوشی ثبت نشده است</div>
              <p>وضعیت پرداخت از فروش نقدی، اقساط و چک‌های ثبت‌شده خوانده می‌شود.</p>
            </div>
          </div>
        ) : (
          <div className="phone-settlement-timeline__list">
            {payments.map((entry, index) => {
              const batchId = extractSettlementBatchId(entry);
              const amount = Number(entry.debit || 0);
              return (
                <article key={`phone-payment-${item.id}-${entry.id}`} className="phone-settlement-timeline__entry">
                  <div className="phone-settlement-timeline__entry-index">
                    <span>{(payments.length - index).toLocaleString('fa-IR')}</span>
                    {index < payments.length - 1 ? <i aria-hidden="true" /> : null}
                  </div>

                  <div className="phone-settlement-timeline__entry-body">
                    <div className="phone-settlement-timeline__entry-main">
                      <div className="min-w-0">
                        <div className="phone-settlement-timeline__amount">{formatCurrencyText(amount, readStoredCurrencyUnit())}</div>
                        <div className="phone-settlement-timeline__description">{cleanSettlementPaymentDescription(entry.description)}</div>
                      </div>
                      <div className="phone-settlement-timeline__entry-actions">
                        <button
                          type="button"
                          onClick={() => setEditingEntry(entry)}
                          className="phone-settlement-timeline__action"
                          title="ویرایش این پرداخت"
                        >
                          <i className="fa-solid fa-pen-to-square" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleLedgerDelete(entry.id)}
                          disabled={isDeletingEntry}
                          className="phone-settlement-timeline__action phone-settlement-timeline__action--danger"
                          title="حذف این پرداخت"
                        >
                          <i className="fa-solid fa-trash-can" />
                        </button>
                      </div>
                    </div>

                    <div className="phone-settlement-timeline__entry-meta">
                      <span><i className="fa-regular fa-calendar" />{entry.transactionDate ? formatLedgerTransactionDate(entry.transactionDate) : 'بدون تاریخ پرداخت'}</span>
                      <span><i className="fa-regular fa-clock" />ثبت: {ledgerRecordedAt(entry)}</span>
                      {batchId ? (
                        <button
                          type="button"
                          onClick={() => { setActiveLedgerBatchId(batchId); scrollToLedger(); }}
                          className="phone-settlement-timeline__batch"
                          dir="ltr"
                          title="نمایش پرداخت‌های این دسته در دفتر همکار"
                        >
                          {batchId}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
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


  return (
    <>
    <div className="detail-page-shell people-detail-apple partner-detail-apple partner-detail-safe-gutter-v84 partner-detail-responsive-root people-detail-redesign-v1 people-detail-redesign-v1--partner people-foundation people-detail-foundation space-y-8" dir="rtl" data-ui-people-page="partner-detail" data-ui-people-scope="detail">
      <Notification message={notification} onClose={() => setNotification(null)} />

      {/* Profile */}
      <section className="partner-header-mockup-v89" data-ui-people-surface="partner-header-overview">
        <div className="partner-header-mockup-v89__hero">
          <div className="partner-header-mockup-v89__actions" aria-label="عملیات سریع همکار">
            <Button
              onClick={() => {
                setPrefillMessageText('');
                setPrefillChannels(undefined);
                setIsMessageModalOpen(true);
              }}
              variant="success"
              size="sm"
              className="partner-header-mockup-v89__action partner-header-mockup-v89__action--primary"
              leftIcon={<i className="fa-solid fa-paper-plane" />}
            >
              ارسال پیام
            </Button>
            <Button
              onClick={openTelegramReport}
              variant="secondary"
              size="sm"
              className="partner-header-mockup-v89__action"
              leftIcon={<i className="fa-regular fa-file-lines" />}
            >
              ارسال گزارش
            </Button>
            <Button
              onClick={openEditModal}
              variant="success"
              size="sm"
              className="partner-header-mockup-v89__action partner-header-mockup-v89__action--primary"
              leftIcon={<i className="fas fa-edit" />}
            >
              ویرایش پروفایل
            </Button>
            <Button
              type="button"
              onClick={openPartnerQrLinkModal}
              disabled={tgQrLoading}
              variant="secondary"
              size="sm"
              className="partner-header-mockup-v89__action"
              leftIcon={<i className="fa-brands fa-telegram" />}
            >
              اتصال تلگرام
            </Button>
          </div>

          <div className="partner-header-mockup-v89__identity">
            <div className="partner-header-mockup-v89__avatar">
              <i className="fa-solid fa-user-tie" />
            </div>
            <div className="partner-header-mockup-v89__identity-copy">
              <span className="partner-header-mockup-v89__badge">
                <i className="fa-solid fa-briefcase" />
                پرونده همکار
              </span>
              <h2>{profile.partnerName}</h2>
              <p>نمای کامل ارتباطات، گردش حساب، خریدها و وضعیت همکاری.</p>
            </div>
          </div>
        </div>

        <div className="partner-header-mockup-v89__chips" aria-label="وضعیت‌های کلیدی همکار">
          <span className="partner-header-mockup-v89__chip">
            <i className="fa-solid fa-store" />
            {partnerTypeLabel}
          </span>
          <span className="partner-header-mockup-v89__chip" dir="ltr">
            <i className="fa-solid fa-phone" />
            {profile.phoneNumber || 'بدون شماره'}
          </span>
          <span className={`partner-header-mockup-v89__chip ${partnerTelegramLinked ? 'is-success' : 'is-muted'}`}>
            <i className="fa-brands fa-telegram" />
            {partnerTelegramLinked ? 'تلگرام لینک شده' : 'تلگرام لینک نشده'}
          </span>
          <span className={`partner-header-mockup-v89__chip ${profile.currentBalance === 0 ? 'is-success' : 'is-danger'}`}>
            <i className="fa-solid fa-wallet" />
            {profile.currentBalance > 0 ? 'بدهی به همکار' : profile.currentBalance < 0 ? 'طلب از همکار' : 'حساب تسویه'}
          </span>
          <span className="partner-header-mockup-v89__chip">
            <i className="fa-regular fa-clock" />
            آخرین اتصال: {partnerTelegramLinkedAt || 'ثبت نشده'}
          </span>
        </div>

        <div className="partner-header-mockup-v89__cards" aria-label="داشبورد وضعیت همکار">
          <article className={`partner-header-mockup-v89__card partner-header-mockup-v89__card--risk partner-header-mockup-v89__card--risk-${partnerRiskFactors.tone}`}>
            <div className="partner-header-mockup-v89__card-head">
              <span className="partner-header-mockup-v89__card-icon">
                <i className="fa-solid fa-shield-halved" />
              </span>
              <div>
                <h3>خلاصه ریسک همکاری</h3>
                <p>جمع‌بندی اجرایی وضعیت همکاری.</p>
              </div>
            </div>

            <div className="partner-header-mockup-v89__risk-body">
              <div className={`partner-header-mockup-v89__risk-arc partner-header-mockup-v89__risk-arc--${partnerRiskFactors.tone}`} aria-hidden="true">
                <span />
              </div>
              <div className="partner-header-mockup-v89__risk-copy">
                <strong>{partnerRiskFactors.label}</strong>
                <span>امتیاز ریسک</span>
                <b>{partnerRiskFactors.score.toLocaleString('fa-IR')} از ۱۰</b>
              </div>
            </div>

            <div className="partner-header-mockup-v89__recommendation">
              <div className="partner-header-mockup-v89__recommendation-title">
                <i className="fa-regular fa-user" />
                توصیه اجرایی
              </div>
              <p>{partnerRiskFactors.recommendation}</p>
            </div>
          </article>

          <article className="partner-header-mockup-v89__card partner-header-mockup-v89__card--metrics">
            <div className="partner-header-mockup-v89__card-head">
              <span className="partner-header-mockup-v89__card-icon">
                <i className="fa-solid fa-chart-simple" />
              </span>
              <div>
                <h3>شاخص‌های مالی کلیدی</h3>
                <p>نمای فشرده از پرداخت‌ها، دریافت‌ها و وضعیت حساب.</p>
              </div>
            </div>

            <div className="partner-header-mockup-v89__metric-grid">
              <div className="partner-header-mockup-v89__metric">
                <span className="partner-header-mockup-v89__metric-icon is-green"><i className="fa-solid fa-arrow-up" /></span>
                <small>پرداختی شما</small>
                <strong>{formatCurrencyText(Number(totalCredits || 0), readStoredCurrencyUnit())}</strong>
              </div>
              <div className="partner-header-mockup-v89__metric">
                <span className="partner-header-mockup-v89__metric-icon is-blue"><i className="fa-solid fa-arrow-down" /></span>
                <small>دریافتی شما</small>
                <strong>{formatCurrencyText(Number(totalDebits || 0), readStoredCurrencyUnit())}</strong>
              </div>
              <div className="partner-header-mockup-v89__metric">
                <span className="partner-header-mockup-v89__metric-icon is-rose"><i className="fa-solid fa-credit-card" /></span>
                <small>مانده حساب</small>
                <strong className={profile.currentBalance === 0 ? '' : 'is-danger'}>{formatPartnerLedgerCurrency(profile.currentBalance, 'balance')}</strong>
              </div>
              <div className="partner-header-mockup-v89__metric">
                <span className="partner-header-mockup-v89__metric-icon is-orange"><i className="fa-regular fa-clock" /></span>
                <small>سرمایه در انتظار بازگشت</small>
                <strong className={soldPhonesProductSettlementBalance > 0 ? 'is-danger' : ''}>{formatCurrencyText(Math.max(0, soldPhonesProductSettlementBalance), readStoredCurrencyUnit())}</strong>
              </div>
            </div>

            <div className="partner-header-mockup-v89__metric-note">ارقام بر اساس تراکنش‌های ثبت‌شده محاسبه شده‌اند.</div>
          </article>

          <article className="partner-header-mockup-v89__card partner-header-mockup-v89__card--account">
            <div className="partner-header-mockup-v89__card-head">
              <span className="partner-header-mockup-v89__card-icon">
                <i className="fa-solid fa-wallet" />
              </span>
              <div>
                <h3>وضعیت حساب همکار</h3>
                <p>{profile.currentBalance > 0 ? 'بدهی به همکار' : profile.currentBalance < 0 ? 'طلب از همکار' : 'حساب تسویه'}</p>
              </div>
            </div>

            <div className={`partner-header-mockup-v89__account-amount ${profile.currentBalance === 0 ? 'is-settled' : 'is-danger'}`}>
              {formatPartnerLedgerCurrency(profile.currentBalance, 'balance')}
            </div>
            <p className="partner-header-mockup-v89__account-text">
              {profile.currentBalance > 0
                ? 'فروشگاه به این همکار بدهکار است؛ این وضعیت نیازمند زمان‌بندی تسویه است، نه الزاماً ریسک بحرانی.'
                : profile.currentBalance < 0
                  ? 'همکار به فروشگاه بدهکار است و باید در خرید یا تسویه بعدی لحاظ شود.'
                  : 'حساب همکار تسویه است و مانده فعالی ندارد.'}
            </p>
            <div className="partner-header-mockup-v89__alert">
              <i className="fa-solid fa-triangle-exclamation" />
              <span>قبل از خرید یا تسویه جدید، دفتر حساب و سرمایه در انتظار بازگشت بررسی شود.</span>
            </div>
            <button type="button" onClick={scrollToLedger} className="partner-header-mockup-v89__ledger-btn">
              مشاهده دفتر حساب
              <i className="fa-solid fa-book-open" />
            </button>
          </article>
        </div>
      </section>

          <div data-partner-phone-capital-section="true" className="partner-phone-capital-section mx-6 mt-5">
            <div className="partner-phone-capital-header">
              <div className="partner-phone-capital-copy">
                <div className="partner-phone-capital-eyebrow">
                  <i className="fa-solid fa-hand-holding-dollar text-slate-500" /> نمای سرمایه گوشی‌ها
                </div>
                <h3 className="partner-phone-capital-title">نمای سرمایه و وضعیت فروش گوشی‌ها</h3>
                <p className="partner-phone-capital-description">
                  این بخش سرمایه مرتبط با گوشی‌های فروخته‌شده را از پرونده فروش جدا می‌کند؛ بنابراین هم مشخص است اصل سرمایه همکار برگشته یا نه، هم وضعیت باز یا بسته بودن فروش مشتری دیده می‌شود.
                </p>
              </div>

              <div className="partner-phone-capital-summary-card">
                <div className="flex items-center justify-between gap-3">
                  <div className="partner-phone-capital-summary-label">سرمایه در انتظار بازگشت</div>
                  <span className="partner-phone-capital-summary-icon"><i className="fa-solid fa-scale-balanced" /></span>
                </div>
                <div className="partner-phone-capital-summary-value">
                  {formatCurrencyText(Math.max(0, soldPhonesProductSettlementBalance), readStoredCurrencyUnit())}
                </div>
                <div className="partner-phone-capital-summary-note">
                  مبنا: قیمت خرید روز فروش · وضعیت سرمایه: {getBalanceLabel(getBalanceState(soldPhonesProductSettlementBalance), 'partner')}
                </div>
              </div>
            </div>

            <div className="partner-phone-capital-metrics">
              {[
                {
                  label: 'مبنای سرمایه همکار',
                  value: formatCurrencyText(soldPhonesCurrentPurchaseAmount, readStoredCurrencyUnit()),
                  hint: 'قیمت خرید روز ثبت‌شده در فروش',
                  icon: 'fa-solid fa-sack-dollar',
                  featured: true,
                },
                {
                  label: 'سرمایه بازگشتی ثبت‌شده',
                  value: formatCurrencyText(soldPhonesProductSettlementPaidAmount, readStoredCurrencyUnit()),
                  hint: 'پرداخت‌های معتبر مرتبط با همین فروش‌ها',
                  icon: 'fa-solid fa-circle-check',
                  featured: true,
                },
                {
                  label: 'گوشی‌های فروخته‌شده',
                  value: Number((profile as any).phonesSoldCount || 0).toLocaleString('fa-IR'),
                  hint: 'فروش‌های نقدی، چکی و اقساطی',
                  icon: 'fa-solid fa-cart-shopping',
                },
                {
                  label: 'سرمایه در انتظار بازگشت',
                  value: formatCurrencyText(soldPhonesProductSettlementBalance, readStoredCurrencyUnit()),
                  hint: 'مانده سرمایه همکار برای گوشی‌های فروخته‌شده',
                  icon: 'fa-solid fa-hourglass-half',
                },
                {
                  label: 'بهای اولیه ثبت‌شده',
                  value: formatCurrencyText(soldPhonesInitialPurchaseAmount, readStoredCurrencyUnit()),
                  hint: 'برای مقایسه با قیمت روز فروش',
                  icon: 'fa-solid fa-file-invoice-dollar',
                },
                {
                  label: 'اختلاف روز فروش با بهای اولیه',
                  value: `${soldPhonesCurrentPurchaseDelta >= 0 ? '+' : '-'}${formatCurrencyText(Math.abs(soldPhonesCurrentPurchaseDelta), readStoredCurrencyUnit())}`,
                  hint: 'اثر تغییر قیمت خرید تا روز فروش',
                  icon: 'fa-solid fa-chart-line',
                },
                {
                  label: 'پرداخت‌های عمومی همکار',
                  value: formatCurrencyText(Math.max(0, unallocatedPartnerPaymentAmount), readStoredCurrencyUnit()),
                  hint: 'پرداخت‌های دفتر که به گوشی خاص وصل نیستند',
                  icon: 'fa-solid fa-book-open-reader',
                },
                {
                  label: 'مانده سازگار با دفتر',
                  value: formatCurrencyText(soldPhonesCurrentPurchaseBalance, readStoredCurrencyUnit()),
                  hint: 'نمایش مقایسه‌ای با گردش‌های عمومی دفتر',
                  icon: 'fa-solid fa-scale-balanced',
                },
              ].map((item) => (
                <div key={item.label} className={`rounded-[22px] border p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_45px_rgba(15,23,42,0.08)] dark:hover:shadow-none ${item.featured ? 'border-slate-300 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-900/65' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/65'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="partner-phone-capital-metric-label">{item.label}</div>
                      <div className="mt-2 truncate text-[15px] font-black tracking-tight text-slate-950 dark:text-slate-50">{item.value}</div>
                      <div className="mt-1 text-[11px] font-semibold leading-5 text-slate-500 dark:text-slate-400">{item.hint}</div>
                    </div>
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                      <i className={item.icon} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="partner-operational-table-v105">
              <div className="partner-operational-table-v105__header">
                <div className="partner-operational-table-v105__title-block">
                  <div className="partner-operational-table-v105__eyebrow">
                    <i className="fa-solid fa-list-check" />
                    جدول عملیاتی
                  </div>
                  <h4>جزئیات سرمایه و وضعیت فروش</h4>
                  <p>
                    این جدول وضعیت هر گوشی فروخته‌شده، بازگشت سرمایه همکار و وضعیت پرونده مشتری را در یک نمای عملیاتی و قابل پیگیری نمایش می‌دهد.
                  </p>
                </div>

                <div className="partner-operational-table-v105__filters" role="tablist" aria-label="فیلتر تسویه گوشی‌های فروخته‌شده">
                  {[
                    { key: 'all', label: 'همه', count: soldPhoneSettlementFilterCounts.all, icon: 'fa-solid fa-border-all' },
                    { key: 'open', label: 'سرمایه باز', count: soldPhoneSettlementFilterCounts.open, icon: 'fa-solid fa-hourglass-half' },
                    { key: 'settled', label: 'سرمایه برگشته', count: soldPhoneSettlementFilterCounts.settled, icon: 'fa-solid fa-circle-check' },
                  ].map((option) => {
                    const isActive = soldPhoneSettlementFilter === option.key;
                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setSoldPhoneSettlementFilter(option.key as 'all' | 'open' | 'settled')}
                        className={`partner-operational-table-v105__filter ${isActive ? 'is-active' : ''}`}
                        aria-pressed={isActive}
                      >
                        <i className={option.icon} />
                        <span>{option.label}</span>
                        <b>{option.count.toLocaleString('fa-IR')}</b>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="partner-operational-table-v105__summary">
                {[
                  { label: 'نمایش فعلی', value: `${filteredSoldPhoneDailyPriceRows.length.toLocaleString('fa-IR')} گوشی`, icon: 'fa-solid fa-mobile-screen-button', tone: 'blue' },
                  { label: 'سرمایه در انتظار', value: formatCurrencyText(filteredSoldPhoneProductSettlementBalanceTotal, readStoredCurrencyUnit()), icon: 'fa-solid fa-clock', tone: filteredSoldPhoneProductSettlementBalanceTotal > 0 ? 'rose' : 'green' },
                  { label: 'سرمایه برگشتی', value: formatCurrencyText(filteredSoldPhoneProductSettlementPaidTotal, readStoredCurrencyUnit()), icon: 'fa-solid fa-circle-check', tone: 'green' },
                  { label: 'مبنای سرمایه', value: formatCurrencyText(filteredSoldPhoneDailyPriceTotal, readStoredCurrencyUnit()), icon: 'fa-solid fa-coins', tone: 'slate' },
                  { label: 'اختلاف با بهای اولیه', value: `${filteredSoldPhoneDailyPriceDeltaTotal >= 0 ? '+' : '-'}${formatCurrencyText(Math.abs(filteredSoldPhoneDailyPriceDeltaTotal), readStoredCurrencyUnit())}`, icon: 'fa-solid fa-chart-line', tone: filteredSoldPhoneDailyPriceDeltaTotal >= 0 ? 'amber' : 'green' },
                ].map((metric) => (
                  <div key={metric.label} className={`partner-operational-table-v105__summary-card is-${metric.tone}`}>
                    <span><i className={metric.icon} /></span>
                    <small>{metric.label}</small>
                    <strong>{metric.value}</strong>
                  </div>
                ))}
              </div>

              <div className="partner-operational-table-v105__toolbar">
                <div className="partner-operational-table-v105__search" role="search">
                  <div
                    ref={soldPhoneCapitalSearchRef}
                    className="partner-operational-table-v105__search-input"
                    contentEditable
                    suppressContentEditableWarning
                    role="textbox"
                    aria-label="جستجو در مدل گوشی، مشتری یا منبع"
                    data-placeholder="جستجو در مدل گوشی، مشتری یا منبع..."
                    spellCheck={false}
                    onInput={(event) => {
                      const nextValue = (event.currentTarget.textContent || '').replace(/\u00a0/g, ' ');
                      setSoldPhoneCapitalSearch(nextValue);
                    }}
                    onBlur={(event) => {
                      const normalizedValue = (event.currentTarget.textContent || '').replace(/\u00a0/g, ' ').trim();
                      if (!normalizedValue) {
                        event.currentTarget.textContent = '';
                      }
                      setSoldPhoneCapitalSearch(normalizedValue);
                    }}
                  />
                  <i className="fa-solid fa-magnifying-glass" />
                </div>

                <label className="partner-operational-table-v105__select">
                  <i className="fa-solid fa-arrow-down-wide-short" />
                  <select
                    value={soldPhoneCapitalSort}
                    onChange={(event) => setSoldPhoneCapitalSort(event.target.value as 'newest' | 'highestBalance' | 'highestCapital')}
                  >
                    <option value="newest">مرتب‌سازی: جدیدترین</option>
                    <option value="highestBalance">بیشترین مانده سرمایه</option>
                    <option value="highestCapital">بیشترین مبنای سرمایه</option>
                  </select>
                </label>

                <button type="button" onClick={exportPartnerCapitalRows} className="partner-operational-table-v105__tool-btn">
                  <i className="fa-solid fa-download" />
                  خروجی CSV
                </button>
              </div>

              {soldPhoneDailyPriceRows.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-900">
                    <i className="fa-solid fa-mobile-screen" />
                  </div>
                  <div className="mt-3 text-sm font-black text-slate-700 dark:text-slate-200">هنوز گوشی فروخته‌شده‌ای برای این همکار ثبت نشده است.</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">بعد از فروش گوشی، وضعیت سرمایه همکار و پرونده فروش در این بخش نمایش داده می‌شود.</div>
                </div>
              ) : filteredSoldPhoneDailyPriceRows.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-900">
                    <i className="fa-solid fa-filter-circle-xmark" />
                  </div>
                  <div className="mt-3 text-sm font-black text-slate-700 dark:text-slate-200">در این فیلتر، گوشی‌ای برای نمایش وجود ندارد.</div>
                  <button type="button" onClick={() => setSoldPhoneSettlementFilter('all')} className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900">
                    نمایش همه گوشی‌ها
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-3 p-3 lg:hidden">
                    {filteredSoldPhoneDailyPriceRows.map((item: any) => {
                      const delta = Number(item.dailyPriceDelta || 0);
                      const sourceLabel = String(item.settlementPriceSourceLabel || item.saleReferenceLabel || 'ثبت مستقیم گوشی');
                      const settlementStatus = getPartnerCapitalMeta(item);
                      const saleClosureStatus = getSaleClosureMeta(item);
                      const balance = Number(item.phoneSettlementBalance || 0);
                      const paymentCount = (phoneSettlementPaymentsByPhoneId.get(Number(item.id)) || []).length;
                      const isTimelineOpen = expandedPhoneSettlementTimelineId === Number(item.id);
                      return (
                        <div key={`sold-phone-card-${item.id}`} className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-black text-slate-950 dark:text-slate-50">{item.name || 'گوشی فروخته‌شده'}</div>
                              <div className="mt-1 flex flex-wrap items-center gap-2 justify-end text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                <span dir="ltr" className="font-mono">{item.identifier || 'IMEI ثبت نشده'}</span>
                                <span>•</span>
                                <span>{item.soldAt ? formatIsoToShamsi(item.soldAt) : 'تاریخ نامشخص'}</span>
                                <span>•</span>
                                <span>مبنای حساب: قیمت زمان فروش</span>
                              </div>
                              <div className="mt-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                                آخرین تغییر قیمت: {item.currentPurchasePriceUpdatedAt ? formatIsoToShamsi(item.currentPurchasePriceUpdatedAt) : 'ثبت نشده'}
                              </div>
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-1">
                              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${settlementStatus.badgeClass}`}>{settlementStatus.label}</span>
                              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${saleClosureStatus.badgeClass}`}>{saleClosureStatus.label}</span>
                            </div>
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <div className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-900">
                              <div className="text-[10px] font-black text-slate-500">مبنای سرمایه</div>
                              <div className="mt-1 text-xs font-black text-slate-950 dark:text-slate-50">{formatPrice(item.settlementPurchasePrice)}</div>
                              <div className="mt-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">قیمت زمان فروش و ثبت تسویه</div>
                            </div>
                            <div className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-900">
                              <div className="text-[10px] font-black text-slate-500">مانده سرمایه همکار</div>
                              <div className={`mt-1 text-xs font-black ${balance > 0 ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'}`}>{formatCurrencyText(balance, readStoredCurrencyUnit())}</div>
                            </div>
                            <div className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-900">
                              <div className="text-[10px] font-black text-slate-500">بازگشت سرمایه</div>
                              <div className="mt-1 text-xs font-black text-emerald-700 dark:text-emerald-300">{formatCurrencyText(Number(item.phoneSettlementPaidAmount || 0), readStoredCurrencyUnit())}</div>
                            </div>
                            <div className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-900">
                              <div className="text-[10px] font-black text-slate-500">اختلاف روز/اولیه</div>
                              <div className={`mt-1 text-xs font-black ${delta >= 0 ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}`}>{delta >= 0 ? '+' : '-'}{formatCurrencyText(Math.abs(delta), readStoredCurrencyUnit())}</div>
                            </div>
                          </div>

                          <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <div className="text-[10px] font-black text-slate-500">پرونده فروش مشتری</div>
                                <div className="mt-1 text-xs font-black text-slate-900 dark:text-slate-50">{saleClosureStatus.label}</div>
                              </div>
                              <i className={`${saleClosureStatus.icon} text-slate-500`} />
                            </div>
                          </div>

                          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                            <div className={`h-full rounded-full ${settlementStatus.progressClass}`} style={{ width: `${settlementStatus.progressPercent}%` }} />
                          </div>

                          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex min-w-0 flex-col gap-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                              {renderPhoneSaleSourceLink(item, sourceLabel, true)}
                              {item.phoneSettlementLastPaymentDate && <span>آخرین پرداخت: {formatIsoToShamsi(item.phoneSettlementLastPaymentDate)}</span>}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 justify-end">
                              <button
                                type="button"
                                onClick={() => setExpandedPhoneSettlementTimelineId(isTimelineOpen ? null : Number(item.id))}
                                className="finance-table-action finance-table-action--history"
                              >
                                <i className="fa-solid fa-timeline text-slate-500" />
                                {isTimelineOpen ? 'بستن تاریخچه' : `تاریخچه (${paymentCount.toLocaleString('fa-IR')})`}
                              </button>
                            </div>
                          </div>
                          {isTimelineOpen && renderPhoneSettlementTimeline(item, true)}
                        </div>
                      );
                    })}
                  </div>

                  <div className="partner-phone-capital-table-scroll hidden overflow-x-auto lg:block">
                    <table className="partner-capital-compact-table min-w-[1120px] w-full text-right text-xs" dir="rtl">
                      <thead className="sticky top-0 z-10 bg-white/95 text-[11px] font-black text-slate-500 backdrop-blur dark:bg-slate-950/95 dark:text-slate-400">
                        <tr>
                          <th className="px-4 py-3">گوشی و وضعیت</th>
                          <th className="px-4 py-3">قیمت خرید روز / اولیه</th>
                          <th className="px-4 py-3">سرمایه همکار</th>
                          <th className="px-4 py-3">پرونده فروش مشتری</th>
                          <th className="px-4 py-3">تاریخ و منبع</th>
                          <th className="px-4 py-3 text-left">اقدام</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredSoldPhoneDailyPriceRows.map((item: any) => {
                          const delta = Number(item.dailyPriceDelta || 0);
                          const sourceLabel = String(item.settlementPriceSourceLabel || item.saleReferenceLabel || 'ثبت مستقیم گوشی');
                          const settlementStatus = getPartnerCapitalMeta(item);
                          const saleClosureStatus = getSaleClosureMeta(item);
                          const balance = Number(item.phoneSettlementBalance || 0);
                          const paymentCount = (phoneSettlementPaymentsByPhoneId.get(Number(item.id)) || []).length;
                          const isTimelineOpen = expandedPhoneSettlementTimelineId === Number(item.id);
                          return (
                            <React.Fragment key={`sold-phone-daily-fragment-${item.id}`}>
                            <tr className="partner-operational-table-v105__data-row bg-white align-middle transition hover:bg-slate-50 dark:bg-slate-950/45 dark:hover:bg-slate-900/60">
                              <td className="px-4 py-3">
                                <div className="flex items-start gap-3">
                                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                                    <i className="fa-solid fa-mobile-screen-button" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-black text-slate-900 dark:text-slate-50">{item.name || 'گوشی فروخته‌شده'}</div>
                                    <div className="mt-1 flex flex-wrap items-center gap-2 justify-end text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                      <span className="font-mono" dir="ltr">{item.identifier || 'IMEI ثبت نشده'}</span>
                                      <span>•</span>
                                      <span>{item.status || 'فروخته‌شده'}</span>
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-black text-slate-950 dark:text-slate-50">{formatPrice(item.settlementPurchasePrice)}</div>
                                <div className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">اولیه: {formatPrice(item.initialPurchasePrice)}</div>
                                <div className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">آخرین تغییر: {item.currentPurchasePriceUpdatedAt ? formatIsoToShamsi(item.currentPurchasePriceUpdatedAt) : 'ثبت نشده'}</div>
                                <div className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-black ${delta >= 0 ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-200' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200'}`}>
                                  {delta >= 0 ? '+' : '-'}{formatCurrencyText(Math.abs(delta), readStoredCurrencyUnit())}
                                </div>
                              </td>
                              <td className="partner-capital-cell partner-capital-cell--capital px-4 py-3">
                                <div className="partner-capital-stack space-y-2">
                                  <span className={`partner-capital-status-chip inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-black shadow-sm ${settlementStatus.badgeClass}`}>
                                    <i className={settlementStatus.icon} />
                                    {settlementStatus.label}
                                  </span>
                                  <div className="partner-capital-progress-inline" data-progress-value={settlementStatus.progressPercent}>
                                    <FinancialProgressBar
                                      value={settlementStatus.progressPercent}
                                      showPercent={false}
                                      size="xs"
                                      tone={settlementStatus.capitalSettled ? 'emerald' : settlementStatus.progressPercent > 0 ? 'amber' : 'slate'}
                                      ariaLabel={`درصد بازگشت سرمایه: ${settlementStatus.progressPercent} درصد`}
                                    />
                                  </div>
                                  <div className="font-black text-emerald-700 dark:text-emerald-300">{formatCurrencyText(Number(item.phoneSettlementPaidAmount || 0), readStoredCurrencyUnit())} برگشته</div>
                                  <div className={`text-[11px] font-black ${balance > 0 ? 'text-rose-700 dark:text-rose-300' : 'text-slate-500 dark:text-slate-400'}`}>{formatCurrencyText(balance, readStoredCurrencyUnit())} مانده سرمایه</div>
                                </div>
                              </td>
                              <td className="partner-capital-cell partner-capital-cell--customer px-4 py-3">
                                <div className="partner-capital-stack space-y-2">
                                  <span className={`partner-capital-status-chip inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-black shadow-sm ${saleClosureStatus.badgeClass}`}>
                                    <i className={saleClosureStatus.icon} />
                                    {saleClosureStatus.label}
                                  </span>
                                  {saleClosureStatus.isInstallment && !saleClosureStatus.isClosed ? (
                                    <div className="text-[11px] font-black text-amber-700 dark:text-amber-300">مانده اقساط مشتری: {formatCurrencyText(saleClosureStatus.remainingAmount, readStoredCurrencyUnit())}</div>
                                  ) : null}
                                </div>
                              </td>
                              <td className="partner-capital-cell partner-capital-cell--date-source px-4 py-3">
                                <div className="partner-capital-date-value font-bold text-slate-700 dark:text-slate-200">{item.soldAt ? formatIsoToShamsi(item.soldAt) : '—'}</div>
                                <div className="partner-capital-source-link mt-1">
                                  {renderPhoneSaleSourceLink(item, sourceLabel, true)}
                                </div>
                                {item.phoneSettlementLastPaymentDate && (
                                  <div className="mt-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">آخرین پرداخت: {formatIsoToShamsi(item.phoneSettlementLastPaymentDate)}</div>
                                )}
                              </td>
                              <td className="partner-capital-cell partner-capital-cell--action px-4 py-3 text-left">
                                <div className="partner-capital-actions partner-operational-table-v105__action-bar flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setExpandedPhoneSettlementTimelineId(isTimelineOpen ? null : Number(item.id))}
                                    className="finance-table-action finance-table-action--history"
                                  >
                                    <i className="fa-solid fa-timeline text-slate-500" />
                                    {isTimelineOpen ? 'بستن' : `تاریخچه (${paymentCount.toLocaleString('fa-IR')})`}
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {isTimelineOpen && (
                              <tr className="partner-operational-table-v105__timeline-row bg-slate-50 dark:bg-slate-950/30">
                                <td colSpan={6} className="px-4 pb-4 pt-0">
                                  {renderPhoneSettlementTimeline(item)}
                                </td>
                              </tr>
                            )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="partner-detail-section-shell partner-overview-v111 mx-6 mt-5 rounded-[30px] border border-slate-200/80 bg-white px-5 py-6 shadow-[0_16px_45px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-950/75 sm:px-6">
            <div className="partner-overview-v111__header mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="partner-overview-v111__copy order-2 lg:order-1 lg:max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                  <i className="fa-solid fa-chart-simple text-slate-400" />
                  نمای همکاری
                </div>
                <h3 className="mt-3.5 text-2xl font-black tracking-tight text-slate-950 dark:text-slate-50 sm:text-[2rem]">
                  نمای یکپارچه سرمایه، فروش و موجودی همکار
                </h3>
                <p className="mt-3 max-w-3xl text-sm font-medium leading-7 text-slate-500 dark:text-slate-400">
                  نمای سریع از سرمایه برگشتی، سرمایه در انتظار، موجودی گوشی‌ها و وضعیت پرونده‌های فروش همکار.
                </p>
              </div>
            </div>
            <div className="partner-overview-v111__grid grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[
                {
                  label: 'سرمایه بازگشتی همکار',
                  value: formatCurrencyText(partnerUnifiedStatusTotals.partnerCapitalReturnedAmount, readStoredCurrencyUnit()),
                  sub: 'مبلغ کل بازگشتیافته تا این لحظه به اصل سرمایه همکار.',
                  icon: 'fa-solid fa-rotate-left',
                  tone: 'emerald',
                  valueTone: 'text-emerald-600 dark:text-emerald-300',
                },
                {
                  label: 'سرمایه در انتظار بازگشت',
                  value: formatCurrencyText(partnerUnifiedStatusTotals.partnerCapitalWaitingAmount, readStoredCurrencyUnit()),
                  sub: 'معادل پرونده‌های فروش مشتری که هنوز در انتظار بازگشت هستند.',
                  icon: 'fa-solid fa-hourglass-half',
                  tone: 'amber',
                  valueTone: 'text-amber-600 dark:text-amber-300',
                },
                {
                  label: 'مانده اقساط مشتریان',
                  value: formatCurrencyText(partnerUnifiedStatusTotals.customerInstallmentRemainingAmount, readStoredCurrencyUnit()),
                  sub: `${Number(partnerUnifiedStatusTotals.openSaleFiles || 0).toLocaleString('fa-IR')} پرونده فروش هنوز از سمت مشتری باز است.`,
                  icon: 'fa-solid fa-calendar',
                  tone: 'sky',
                  valueTone: 'text-blue-700 dark:text-blue-300',
                },
                {
                  label: 'گوشی‌های فروخته‌شده',
                  value: Number((profile as any).phonesSoldCount || 0).toLocaleString('fa-IR'),
                  sub: 'فروش‌های نقدی، چکی و اقساطی ثبت‌شده.',
                  icon: 'fa-solid fa-cart-shopping',
                  tone: 'sky',
                  valueTone: 'text-blue-700 dark:text-blue-300',
                },
                {
                  label: 'گوشی‌های سپرده‌شده',
                  value: Number((profile as any).totalPhonesSupplied || 0).toLocaleString('fa-IR'),
                  sub: 'تمام گوشی‌هایی که برای این همکار در سیستم ثبت شده‌اند.',
                  icon: 'fa-solid fa-mobile-screen-button',
                  tone: 'indigo',
                  valueTone: 'text-cyan-700 dark:text-cyan-300',
                },
                {
                  label: 'فروش‌های بسته‌شده',
                  value: Number(partnerUnifiedStatusTotals.closedSaleFiles || 0).toLocaleString('fa-IR'),
                  sub: 'پرونده‌هایی که پرداخت مشتری کامل شده و دیگر قسط/چک باز ندارند.',
                  icon: 'fa-solid fa-bag-shopping',
                  tone: 'violet',
                  valueTone: 'text-violet-700 dark:text-violet-300',
                },
                {
                  label: 'گوشی‌های موجود / فروخته‌نشده',
                  value: Number((profile as any).unsoldPhonesCount || 0).toLocaleString('fa-IR'),
                  sub: 'گوشی‌هایی که هنوز فروخته نشده‌اند و در موجودی فروشگاه هستند.',
                  icon: 'fa-solid fa-box-open',
                  tone: 'emerald',
                  valueTone: 'text-emerald-600 dark:text-emerald-300',
                },
                {
                  label: 'ارزش موجودی فروخته‌نشده',
                  value: formatCurrencyText(unsoldInventoryAmount, readStoredCurrencyUnit()),
                  sub: 'ارزش تقریبی گوشی‌های فروش‌نرفته برای تفکیک از سرمایه در گردش فروش‌ها.',
                  icon: 'fa-solid fa-database',
                  tone: 'indigo',
                  valueTone: 'text-indigo-700 dark:text-indigo-300',
                },
                {
                  label: 'مانده کالاهای جانبی',
                  value: formatCurrencyText(Number((profile as any).accessoriesPayableAmount || 0), readStoredCurrencyUnit()),
                  sub: 'مانده مربوط به لوازم و کالاهای جانبی ثبت‌شده برای این همکار.',
                  icon: 'fa-solid fa-warehouse',
                  tone: 'rose',
                  valueTone: 'text-rose-600 dark:text-rose-300',
                },
              ].map((item) => {
                const toneClasses: Record<string, string> = {
                  emerald: 'border-emerald-100 bg-emerald-50/55 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300',
                  amber: 'border-amber-100 bg-amber-50/60 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300',
                  sky: 'border-sky-100 bg-sky-50/60 text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300',
                  slate: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300',
                  indigo: 'border-indigo-100 bg-indigo-50/60 text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300',
                  violet: 'border-violet-100 bg-violet-50/60 text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300',
                  rose: 'border-rose-100 bg-rose-50/60 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300',
                };
                return (
                  <div key={item.label} className="partner-overview-v111__card rounded-[24px] border border-slate-200/85 bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-950/70">
                    <div className="partner-overview-v111__card-inner flex items-start justify-between gap-4">
                      <div className="partner-overview-v111__metric min-w-0 flex-1">
                        <div className="partner-overview-v111__label text-[15px] font-black text-slate-800 dark:text-slate-100">{item.label}</div>
                        <div className={`partner-overview-v111__value mt-4 text-[22px] font-black tracking-tight sm:text-[21px] ${item.valueTone}`}>{item.value}</div>
                        <div className="partner-overview-v111__sub mt-4 border-t border-slate-100 pt-4 text-[13px] font-medium leading-7 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                          {item.sub}
                        </div>
                      </div>
                      <div className={`partner-overview-v111__icon flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] border shadow-sm ${toneClasses[item.tone] || toneClasses.slate}`}>
                        <i className={`${item.icon} text-xl`} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      <MessageComposerModal
        open={isMessageModalOpen}
        onClose={() => setIsMessageModalOpen(false)}
        initialRecipient={{
          type: 'partner',
          id: profile.id,
          name: profile.partnerName,
          phoneNumber: profile.phoneNumber,
          telegramChatId: (profile as any).telegramChatId,
        }}
        initialText={prefillMessageText}
        initialChannels={prefillChannels}
        initialVariables={{
          amount: Number(profile.currentBalance || 0),
          dueDate: String((profile as any).createdAt || ''),
          link: typeof window !== 'undefined' ? window.location.href : '',
        }}
        onQueued={() => setNotification({ type: 'success', text: 'پیام در صف ارسال قرار گرفت. وضعیت را در «صف ارسال» ببینید.' })}
      />

      {/* گفتگوی تلگرام همکار */}
      <section
        dir="rtl"
        className="partner-telegram-customer-copy-v119 rounded-[32px] border border-slate-200 bg-white p-5 text-slate-900 shadow-[0_28px_80px_-52px_rgba(15,23,42,0.35)] dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50"
        aria-label="مرکز گفتگوی تلگرام همکار"
      >
        {(() => {
          const linked = partnerTelegramLinked;
          const chatId = partnerTelegramChatId;
          const outboxCount = partnerTgConvItems.filter((item) => item.direction === 'out').length;
          const inboxCount = partnerTgConvItems.filter((item) => item.direction === 'in').length;
          const failedCount = partnerTgConvItems.filter((item) => item.direction === 'out' && String(item.status || '') === 'failed').length;
          const lastInteractionAt = partnerTgConvItems.length ? partnerTgConvItems[partnerTgConvItems.length - 1]?.createdAt : null;

          return (
            <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
              <aside className="space-y-4">
                <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <div className="mb-4 flex items-center justify-start gap-2 text-right">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                      <i className="fa-solid fa-id-card" />
                    </span>
                    <div className="text-right">
                      <div className="text-[13px] font-black text-slate-900 dark:text-slate-50">کارت تلگرام همکار</div>
                      <div className="mt-0.5 text-[10px] font-bold text-slate-400 dark:text-slate-500">اتصال، وضعیت پیام و Chat ID همکار</div>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-slate-200 bg-gradient-to-b from-white to-slate-50/70 p-4 text-right dark:border-slate-800 dark:from-slate-950 dark:to-slate-900/40">
                    <div className="flex items-center justify-between gap-3">
                      <span className="grid h-16 w-16 shrink-0 place-items-center rounded-[24px] bg-slate-100 text-slate-400 dark:bg-slate-900 dark:text-slate-600">
                        <i className="fa-solid fa-user-tie text-xl" />
                      </span>
                      <div className="min-w-0 flex-1 text-right">
                        <div className="text-[18px] font-black text-slate-950 dark:text-slate-50">{profile.partnerName}</div>
                        <div className="mt-1 text-[12px] font-bold text-slate-500 dark:text-slate-400">شناسه همکار: {Number(profile.id || 0).toLocaleString('fa-IR')}</div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-950">
                        <div className="text-[10px] font-black text-slate-400 dark:text-slate-500">آخرین فعالیت</div>
                        <div className="mt-1 text-[13px] font-black text-slate-900 dark:text-slate-50">{lastInteractionAt ? formatIsoToShamsi(lastInteractionAt) : (partnerTelegramLinkedAt || '—')}</div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-950">
                        <div className="text-[10px] font-black text-slate-400 dark:text-slate-500">وضعیت ربات</div>
                        <div className={["mt-1 inline-flex items-center gap-1.5 text-[13px] font-black", linked ? "text-emerald-700 dark:text-emerald-300" : "text-rose-600 dark:text-rose-300"].join(' ')}>
                          <i className="fa-solid fa-circle text-[8px]" />
                          {linked ? 'متصل' : 'لینک نشده'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <div className="mb-3 flex items-center justify-start gap-2 text-right">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                      <i className="fa-solid fa-link" />
                    </span>
                    <div className="text-right text-[14px] font-black text-slate-900 dark:text-slate-50">Chat ID</div>
                  </div>
                  <div className="flex h-12 items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-3 dark:border-slate-800 dark:bg-slate-950">
                    <span className="min-w-0 flex-1 truncate text-left text-[13px] font-bold text-slate-600 dark:text-slate-300" dir="ltr">{chatId || 'ثبت نشده'}</span>
                    <i className="fa-brands fa-telegram text-sky-500" />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={openPartnerQrLinkModal}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 text-[11px] font-black text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-950/25 dark:text-emerald-200"
                    >
                      <i className="fa-solid fa-floppy-disk" />
                      {linked ? 'مدیریت Chat ID' : 'ذخیره Chat ID'}
                    </button>
                    <button
                      type="button"
                      onClick={openPartnerQrLinkModal}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white text-[11px] font-black text-rose-600 transition hover:bg-rose-50 dark:border-rose-900/40 dark:bg-slate-950 dark:text-rose-300"
                    >
                      <i className="fa-solid fa-rotate-right" />
                      اتصال مجدد
                    </button>
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <div className="mb-3 w-full text-right text-[15px] font-black text-slate-900 dark:text-slate-50">وضعیت دریافت پیام</div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/60">
                      <span className="text-[12px] font-bold text-slate-500 dark:text-slate-400">دریافت پیام</span>
                      <span className={["inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black", linked ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"].join(' ')}>
                        <i className={linked ? "fa-solid fa-circle-check" : "fa-solid fa-circle-minus"} />
                        {linked ? 'فعال' : 'غیرفعال'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/60">
                      <span className="text-[12px] font-bold text-slate-500 dark:text-slate-400">ارسال پیام</span>
                      <span className={["inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black", linked && !failedCount ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200" : "bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-200"].join(' ')}>
                        <i className={linked && !failedCount ? "fa-solid fa-circle-check" : "fa-solid fa-triangle-exclamation"} />
                        {linked && !failedCount ? 'فعال' : 'نیازمند بررسی'}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50/70 px-3 py-2 text-[11px] leading-6 text-slate-600 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-slate-300">
                    <i className="fa-solid fa-circle-info ml-1 text-amber-500" />
                    پیام‌ها از ربات تلگرام همکار دریافت و ارسال می‌شوند.
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <div className="mb-3 flex items-center justify-start gap-2 text-right">
                    <i className="fa-solid fa-chevron-down text-xs text-slate-400" />
                    <div className="text-right text-[14px] font-black text-slate-900 dark:text-slate-50">اطلاعات بیشتر</div>
                  </div>
                  <div className="space-y-2 text-[12px] font-bold text-slate-500 dark:text-slate-400">
                    <div className="flex items-center justify-between gap-3">
                      <span dir="ltr" className="truncate">{linked ? chatId : '-'}</span>
                      <span>جزئیات اتصال ربات و لاگ‌ها</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>{profile.phoneNumber || '-'}</span>
                      <span>شماره تماس</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>{partnerTelegramLinkedAt || '-'}</span>
                      <span>تاریخ اتصال</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>{partnerTgConvItems.length.toLocaleString('fa-IR')}</span>
                      <span>تعداد پیام‌ها</span>
                    </div>
                  </div>
                </div>
              </aside>

              <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <div className="mb-5 space-y-3">
                  <div className="partner-telegram-header-v124">
                    <div className="partner-telegram-header-v124__actions">
                      {([
                        { key: 'all', label: 'همه' },
                        { key: 'out', label: 'ارسالی' },
                        { key: 'in', label: 'دریافتی' },
                      ] as const).map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setPartnerTgDirectionFilter(item.key)}
                          className={["inline-flex h-10 min-w-[78px] items-center justify-center rounded-2xl border px-4 text-[12px] font-black transition", partnerTgDirectionFilter === item.key ? 'border-amber-200 bg-amber-100 text-slate-800 shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200'].join(' ')}
                        >
                          {item.label}
                        </button>
                      ))}

                      <span className={["inline-flex h-10 items-center gap-2 rounded-2xl border px-4 text-[12px] font-black", linked ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/25 dark:text-emerald-200' : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'].join(' ')}>
                        <i className="fa-solid fa-link" />
                        {linked ? 'لینک شده' : 'لینک نشده'}
                      </span>
                    </div>

                    <div className="partner-telegram-header-v124__title">
                      <span className="partner-telegram-header-v124__icon">
                        <i className="fa-brands fa-telegram text-[22px]" />
                      </span>
                      <div className="partner-telegram-header-v124__copy">
                        <h2 className="text-[22px] font-black tracking-[-0.03em] text-slate-950 dark:text-slate-50">گفتگوی تلگرام همکار</h2>
                        <p className="mt-1 text-[12px] leading-6 text-slate-500 dark:text-slate-400">اتصال ربات، ثبت ID، پیام‌ها و پیگیری گفتگو.</p>
                      </div>
                    </div>
                  </div>

                  <div className="partner-telegram-search-row-v120 flex items-center justify-end">
                    <div className="partner-telegram-searchbox-v120" role="search">
                      <div
                        className="partner-telegram-searchbox-v120__input"
                        role="textbox"
                        contentEditable
                        suppressContentEditableWarning
                        data-placeholder="جستجو در گفتگو..."
                        onInput={(event) => {
                          const nextValue = (event.currentTarget.textContent || '').replace(/\u00a0/g, ' ');
                          setPartnerTgSearchQuery(nextValue);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            jumpToFirstPartnerTgResult();
                          }
                        }}
                        onBlur={(event) => {
                          const normalizedValue = (event.currentTarget.textContent || '').replace(/\u00a0/g, ' ').trim();
                          if (!normalizedValue) event.currentTarget.textContent = '';
                          setPartnerTgSearchQuery(normalizedValue);
                        }}
                      />
                      <i className="fa-solid fa-magnifying-glass" />
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-inner dark:border-slate-800 dark:bg-slate-950">
                  <div className="mb-4 rounded-[22px] border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                    <div className="mb-2 text-right text-[14px] font-black text-slate-900 dark:text-slate-50">خلاصه آخرین گفتگو</div>
                    <div className="flex flex-wrap items-center justify-between gap-3 text-[12px] font-bold text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-2">
                        <i className="fa-regular fa-clock" />
                        <span>{lastInteractionAt ? formatIsoToShamsi(lastInteractionAt) : '—'}</span>
                      </div>
                      <div className="min-w-0 flex-1 truncate text-right text-slate-700 dark:text-slate-200">
                        {partnerTgConvItems.length ? String(partnerTgConvItems[partnerTgConvItems.length - 1]?.text || 'آخرین پیام بدون متن') : 'هنوز گفتگویی ثبت نشده است.'}
                      </div>
                    </div>
                  </div>

                  <div className="relative rounded-[26px] border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                    <div
                      ref={partnerTgTimelineRef}
                      onScroll={(e) => {
                        const el = e.currentTarget;
                        const nearBottom = (el.scrollHeight - el.scrollTop - el.clientHeight) < 140;
                        if (nearBottom) setPartnerTgNewSinceScroll(false);
                      }}
                      className="min-h-[250px] max-h-[440px] space-y-4 overflow-y-auto px-2 py-1"
                    >
                      {partnerTgConvError ? (
                        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-200">{partnerTgConvError}</div>
                      ) : null}

                      {!linked ? (
                        <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center dark:border-slate-700 dark:bg-slate-900/50">
                          <i className="fa-brands fa-telegram mb-3 text-[34px] text-slate-300 dark:text-slate-600" />
                          <div className="text-[14px] font-black text-slate-600 dark:text-slate-300">همکار هنوز به تلگرام وصل نیست.</div>
                          <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">ابتدا اتصال تلگرام را فعال کنید تا تایم‌لاین گفتگو نمایش داده شود.</p>
                        </div>
                      ) : partnerTgFilteredConvItems.length === 0 && !partnerTgConvLoading ? (
                        <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center dark:border-slate-700 dark:bg-slate-900/50">
                          <i className="fa-brands fa-telegram mb-3 text-[34px] text-slate-300 dark:text-slate-600" />
                          <div className="text-[14px] font-black text-slate-600 dark:text-slate-300">هنوز پیامی برای نمایش وجود ندارد.</div>
                          <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">با ارسال اولین پیام، تایم‌لاین گفتگو اینجا نمایش داده می‌شود.</p>
                        </div>
                      ) : null}

                      {partnerTgFilteredConvItems.map((message) => {
                        const outgoing = message.direction === 'out';
                        const status = outgoing ? (message.status || '') : '';
                        const isFailed = status === 'failed';
                        const isPending = status === 'pending' || status === 'processing';
                        const isSent = status === 'done' || status === 'sent';
                        const statusLabel = !outgoing ? 'دریافتی' : isSent ? 'ارسال‌شده' : isFailed ? 'ناموفق' : isPending ? 'در صف ارسال' : 'در حال پردازش';

                        return (
                          <div id={`tg-partner-msg-${message.id}`} key={message.id} className={["flex items-end gap-3", outgoing ? "justify-start" : "justify-end"].join(' ')}>
                            {outgoing ? <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-blue-600 text-white shadow-sm"><i className="fa-brands fa-telegram" /></span> : null}
                            <div className={["max-w-[78%] rounded-[24px] border px-4 py-3 text-sm leading-7 shadow-sm transition", outgoing ? (isFailed ? "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-100" : "border-emerald-200 bg-emerald-50/90 text-slate-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-slate-100") : "border-slate-200 bg-white text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"].join(' ')}>
                              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold text-slate-400 dark:text-slate-500">
                                <span>{outgoing ? 'فروشگاه' : profile.partnerName}</span>
                                <span>{formatIsoToShamsi(message.createdAt)}</span>
                              </div>
                              {message.kind === 'photo' && message.mediaUrl ? (
                                <div className="space-y-2"><img src={message.mediaUrl} alt="photo" className="max-h-64 rounded-2xl border border-slate-200 object-contain dark:border-slate-700" />{message.text ? <div className="whitespace-pre-wrap">{message.text}</div> : null}</div>
                              ) : message.kind === 'document' && message.mediaUrl ? (
                                <div className="space-y-2"><a href={message.mediaUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs font-black text-sky-600 dark:text-sky-300"><i className="fa-regular fa-file-lines" /> فایل پیوست</a>{message.text ? <div className="whitespace-pre-wrap">{message.text}</div> : null}</div>
                              ) : (
                                <div className="whitespace-pre-wrap">{message.text || '—'}</div>
                              )}
                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                <span className={["inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black", !outgoing ? 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300' : isSent ? 'border-emerald-200 bg-white text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200' : isFailed ? 'border-rose-200 bg-white text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-200' : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200'].join(' ')}>{statusLabel}</span>
                                {outgoing && message.errorCategory ? <span className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300" title={message.lastError || ''}>{message.errorCategory}</span> : null}
                                {message.lastError ? <span className="text-[10px] font-semibold text-rose-500">{message.lastError}</span> : null}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {partnerTgNewSinceScroll ? (
                      <button
                        type="button"
                        onClick={() => {
                          const el = partnerTgTimelineRef.current;
                          if (el) {
                            el.scrollTop = el.scrollHeight;
                            setPartnerTgNewSinceScroll(false);
                          }
                        }}
                        className="absolute bottom-4 left-4 rounded-full bg-slate-900 px-3 py-2 text-xs font-black text-white shadow-lg dark:bg-white dark:text-slate-900"
                      >
                        پیام جدید ▾
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="mt-5 rounded-[28px] border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                  <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
                    {[
                      { key: 'balance', label: 'پیگیری مانده حساب', icon: 'fa-regular fa-credit-card' },
                      { key: 'settlement', label: 'هماهنگی تسویه', icon: 'fa-regular fa-pen-to-square' },
                      { key: 'payment_confirm', label: 'تأیید پرداخت', icon: 'fa-solid fa-bell' },
                      { key: 'custom', label: 'متن آزاد', icon: 'fa-regular fa-pen-to-square' },
                    ].map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => applyPartnerTgPreset(item.key as typeof partnerTgPreset)}
                        className={["inline-flex h-10 items-center gap-2 rounded-2xl border px-4 text-[12px] font-black transition", partnerTgPreset === item.key ? 'border-blue-600 bg-blue-600 text-white shadow-[0_12px_28px_-18px_rgba(37,99,235,0.85)]' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200'].join(' ')}
                      >
                        <i className={item.icon} />
                        {item.label}
                      </button>
                    ))}
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
                    <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 text-right dark:border-slate-800 dark:bg-slate-900/40">
                      <div className="text-[13px] font-black text-slate-900 dark:text-slate-50">پیش‌نمایش پیام</div>
                      <div className="mt-3 whitespace-pre-wrap text-[13px] leading-7 text-slate-700 dark:text-slate-200">{resolvePartnerTelegramText(partnerTgQuickReply) || 'هنوز متنی برای ارسال وارد نشده است.'}</div>
                    </div>
                    <div>
                      <textarea
                        value={partnerTgQuickReply}
                        onChange={(e) => setPartnerTgQuickReply(e.target.value)}
                        rows={6}
                        placeholder="متن پیام"
                        className="w-full resize-y rounded-[24px] border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-800 outline-none transition    dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 "
                      />
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                          <span>متغیرها:</span>
                          {['{name}', '{phone}', '{amount}', '{dueDate}', '{link}'].map((token) => (
                            <span key={token} dir="ltr" className="rounded-full border border-slate-200 bg-white px-3 py-1.5 dark:border-slate-800 dark:bg-slate-950">{token}</span>
                          ))}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            onClick={() => setNotification({ type: 'success', text: 'زمان‌بندی پیام همکار در نسخه بعدی تکمیل می‌شود.' })}
                            disabled={!linked || !partnerTgQuickReply.trim()}
                            variant="secondary"
                            size="sm"
                            className="justify-center !rounded-2xl"
                            leftIcon={<i className="fa-regular fa-clock" />}
                          >
                            زمان‌بندی ارسال
                          </Button>
                          <Button
                            type="button"
                            onClick={sendPartnerTelegramQuickReply}
                            disabled={partnerTgConvLoading || !linked || !partnerTgQuickReply.trim()}
                            loading={partnerTgConvLoading}
                            loadingText="در حال ارسال..."
                            variant="success"
                            size="sm"
                            className="min-w-[190px] justify-center !rounded-2xl"
                            leftIcon={<i className="fa-solid fa-paper-plane" />}
                          >
                            ارسال تلگرام
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </section>

      {/* Ledger */}

      <div id="partner-ledger-section" className="detail-card partner-customer-sync-ledger partner-ledger-v128 partner-ledger-v130 partner-ledger-v132" data-ui-people-ledger="partner">
        <div className="partner-customer-sync-ledger-head mb-5 flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 text-emerald-700 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
              <i className="fa-solid fa-book-open" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-50">دفتر حساب همکار</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">مدیریت پرداخت‌ها، وضعیت مانده حساب و گردش‌های مالی همکار در یک نمای حرفه‌ای.</p>
            </div>
          </div>
          <button type="button" onClick={openLedgerModal} className="partner-ledger-v128__register-action">
            <i className="fa-solid fa-money-bill-transfer" />
            ثبت اطلاعات دریافت / پرداخت
          </button>
        </div>

        <div className="partner-customer-sync-ledger-stats mb-5 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="partner-customer-sync-ledger-stat partner-ledger-v130__stat-card partner-ledger-hover-card rounded-[18px] border border-emerald-100 bg-emerald-50/80 p-3.5 dark:border-emerald-900/40 dark:bg-emerald-950/20">
            <div className="partner-ledger-v130__stat-head" style={{ direction: 'rtl' }}>
              <span className="partner-ledger-v130__box-icon is-emerald"><i className="fa-solid fa-wallet" /></span>
              <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-200">مانده نهایی حساب</div>
            </div>
            <div className="mt-2 text-xl font-black text-slate-900 dark:text-slate-50">{formatPartnerLedgerCurrency(profile.currentBalance, 'balance')}</div>
          </div>
          <div className="partner-customer-sync-ledger-stat partner-ledger-v130__stat-card partner-ledger-hover-card rounded-[18px] border border-slate-200 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-950/20">
            <div className="partner-ledger-v130__stat-head" style={{ direction: 'rtl' }}>
              <span className="partner-ledger-v130__box-icon is-violet"><i className="fa-solid fa-list-check" /></span>
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">تعداد تراکنش‌ها</div>
            </div>
            <div className="mt-2 text-xl font-black text-slate-900 dark:text-slate-50">{ledger.length.toLocaleString('fa-IR')}</div>
          </div>
          <div className="partner-customer-sync-ledger-stat partner-ledger-v130__stat-card partner-ledger-hover-card rounded-[18px] border border-sky-100 bg-sky-50/80 p-3.5 dark:border-sky-900/40 dark:bg-sky-950/20">
            <div className="partner-ledger-v130__stat-head" style={{ direction: 'rtl' }}>
              <span className="partner-ledger-v130__box-icon is-sky is-calendar-fallback"><i className="fa-solid fa-calendar" /></span>
              <div className="text-xs font-semibold text-sky-700 dark:text-sky-200">آخرین به‌روزرسانی پرونده</div>
            </div>
            <div className="mt-2 text-base font-black text-slate-900 dark:text-slate-50">{partnerRegisteredDateLabel}</div>
          </div>
        </div>

        {filteredLedgerEntries.length > 0 && (
          <div className="partner-ledger-insight-grid mb-5 grid grid-cols-1 gap-3 xl:grid-cols-[1.3fr_0.7fr]"> 
            <div className="partner-ledger-hover-card rounded-3xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/30"> 
              <div className="mb-3 flex items-center justify-between"> 
                <div>
                  <div className="text-[13px] font-bold text-slate-900 dark:text-slate-100">آخرین گردش‌های حساب</div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">نمای زمانی آخرین عملیات مالی‌ها برای بررسی و ادامه سریع پرونده.</div>
                </div>
                <span className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                  <i className="fa-solid fa-timeline" />
                  {Math.min(filteredLedgerEntries.length, 4).toLocaleString('fa-IR')} مورد اخیر
                </span>
              </div>
              <div className="premium-modal-stack">
                {filteredLedgerEntries.slice(0, 4).map((entry, index) => (
                  <div key={`timeline-${entry.id}`} className="grid grid-cols-[auto_1fr] gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
                    <div className="people-ledger-timeline-index-fallback">
                      <span className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 bg-slate-50 text-sm font-black text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" title={`گردش شماره ${(index + 1).toLocaleString('fa-IR')}`}>
                        {(index + 1).toLocaleString('fa-IR')}
                      </span>
                      {index < Math.min(filteredLedgerEntries.length, 4) - 1 ? <span className="mt-2 h-8 w-px bg-slate-200 dark:bg-slate-700" /> : null}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2 justify-end">
                          <div className="text-[13px] font-bold text-slate-900 dark:text-slate-100">{entry.description}</div>
                          {ledgerTypeBadge(entry)}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{formatLedgerTransactionDate(entry.transactionDate)}</div>
                      </div>
                      <div className="partner-ledger-entry-metrics mt-2 grid grid-cols-1 gap-2 text-xs text-slate-600 dark:text-slate-300 sm:grid-cols-3">
                        <div className="partner-ledger-entry-metric partner-ledger-entry-metric--credit partner-ledger-v130__metric-box rounded-2xl border border-emerald-100 bg-emerald-50 py-2 pl-3 pr-14 dark:border-emerald-900/40 dark:bg-emerald-950">
                          <span className="partner-ledger-v130__metric-icon is-emerald"><i className="fa-solid fa-user-check" /></span>
                          <span className="partner-ledger-v130__metric-copy">بستانکار: {formatPartnerLedgerCurrency(entry.credit, 'credit')}</span>
                        </div>
                        <div className="partner-ledger-entry-metric partner-ledger-entry-metric--debit partner-ledger-v130__metric-box rounded-2xl border border-rose-100 bg-rose-50 py-2 pl-3 pr-14 dark:border-rose-900/40 dark:bg-rose-950">
                          <span className="partner-ledger-v130__metric-icon is-rose"><i className="fa-solid fa-arrow-up" /></span>
                          <span className="partner-ledger-v130__metric-copy">بدهکار: {formatPartnerLedgerCurrency(entry.debit, 'debit')}</span>
                        </div>
                        <div className="partner-ledger-entry-metric partner-ledger-entry-metric--balance partner-ledger-v130__metric-box rounded-2xl border border-slate-200 bg-slate-50 py-2 pl-3 pr-14 dark:border-slate-700 dark:bg-slate-800">
                          <span className="partner-ledger-v130__metric-icon is-slate"><i className="fa-solid fa-wallet" /></span>
                          <span className="partner-ledger-v130__metric-copy">مانده: {formatPartnerLedgerCurrency(entry.balance, 'balance')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="partner-ledger-quick-summary partner-ledger-hover-card rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="text-[13px] font-bold text-slate-900 dark:text-slate-100">خلاصه سریع دفتر</div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">یک نگاه سریع برای تصمیم‌گیری قبل از ثبت اطلاعات تراکنش جدید.</div>
              <div className="mt-4 space-y-3">
                <div className="partner-ledger-quick-item partner-ledger-v130__quick-item partner-ledger-hover-card rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                  <span className="partner-ledger-v130__box-icon is-sky"><i className="fa-solid fa-file-lines" /></span>
                  <div className="min-w-0">
                    <div className="text-xs text-slate-500 dark:text-slate-400">اولین رکورد</div>
                    <div className="mt-1 text-[13px] font-bold text-slate-900 dark:text-slate-100">{ledger[ledger.length - 1] ? formatIsoToShamsi(ledger[ledger.length - 1].transactionDate) : '—'}</div>
                  </div>
                </div>
                <div className="partner-ledger-quick-item partner-ledger-v130__quick-item partner-ledger-hover-card rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                  <span className="partner-ledger-v130__box-icon is-emerald"><i className="fa-solid fa-calendar-check" /></span>
                  <div className="min-w-0">
                    <div className="text-xs text-slate-500 dark:text-slate-400">آخرین عملیات مالی</div>
                    <div className="mt-1 text-[13px] font-bold text-slate-900 dark:text-slate-100">{ledger[0] ? formatIsoToShamsi(ledger[0].transactionDate) : '—'}</div>
                  </div>
                </div>
                <div className="partner-ledger-quick-item partner-ledger-v130__quick-item partner-ledger-hover-card rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                  <span className="partner-ledger-v130__box-icon is-violet"><i className="fa-solid fa-chart-line" /></span>
                  <div className="min-w-0">
                    <div className="text-xs text-slate-500 dark:text-slate-400">میانگین ارزش تراکنش</div>
                    <div className="mt-1 text-[13px] font-bold text-slate-900 dark:text-slate-100">{formatPartnerLedgerCurrency(ledger.length ? Math.round(ledger.reduce((sum, item) => sum + Math.max(item.credit || 0, item.debit || 0), 0) / ledger.length) : 0, 'balance')}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}



        <div className="partner-ledger-v132__transactions-panel partner-ledger-hover-surface mb-5 rounded-[28px] border border-slate-200/80 bg-white p-4 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.38)] dark:border-slate-800 dark:bg-slate-950/80">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex-1 space-y-4">
              <div className="partner-ledger-v132__panel-head flex flex-wrap items-center justify-between gap-2">
                <div className="partner-ledger-v132__panel-title">
                  <span className="partner-ledger-v132__panel-icon"><i className="fa-solid fa-file-invoice-dollar" /></span>
                  <div>
                    <div className="text-[11px] font-black tracking-[0.16em] text-slate-400 dark:text-slate-500">مدیریت تراکنش‌های مالی</div>
                    <div className="mt-1 text-sm font-black text-slate-900 dark:text-slate-50">جستجو، فیلترها، خروجی و نمای نمایش</div>
                  </div>
                </div>
                <span className="partner-ledger-v132__record-pill inline-flex h-[34px] items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                  <i className="fa-solid fa-filter-circle-dollar" />
                  {filteredLedgerEntries.length.toLocaleString('fa-IR')} رکورد
                </span>
              </div>

              <div className="partner-ledger-v133__search-grid grid gap-3 xl:grid-cols-[minmax(320px,0.92fr)_minmax(420px,1.08fr)]">
                <div className="partner-ledger-v133__search-wrap relative">
                  <i className="fa-solid fa-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={ledgerSearch}
                    onChange={(e) => setLedgerSearch(e.target.value)}
                    placeholder="جستجو در شرح، مبلغ، تاریخ، شناسه سیستم یا مرجع..."
                    className="partner-ledger-v133__search-input w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pr-3 pl-10 text-sm text-slate-700 outline-none transition     dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100  "
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2 justify-end xl:justify-end">
                  <div className="flex min-w-0 flex-[1.15] items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-2 py-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                    <i className="fa-solid fa-barcode text-[11px] text-violet-500" />
                    <select
                      value={ledgerSystemFilter}
                      onChange={(e) => setLedgerSystemFilter(e.target.value)}
                      className="h-[34px] min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-2 text-[11px] font-black text-slate-700 outline-none transition  dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                      title="فیلتر حسابداری بر اساس شناسه سیستم"
                    >
                      <option value="all">همه شناسه‌های سیستم</option>
                      {ledgerSystemOptions.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.label} · {item.count.toLocaleString('fa-IR')} رکورد
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="relative">
                    <button
                      ref={ledgerColumnPickerButtonRef}
                      type="button"
                      onClick={() => setIsLedgerColumnPickerOpen((current) => !current)}
                      aria-expanded={isLedgerColumnPickerOpen}
                      className={`inline-flex h-[34px] items-center gap-2 rounded-2xl border px-3 text-[11px] font-black shadow-sm transition ${isLedgerColumnPickerOpen ? 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/40 dark:bg-violet-950/25 dark:text-violet-200' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'}`}
                    >
                      <i className="fa-solid fa-table-columns" />
                      ستون‌ها
                    </button>
                    {isLedgerColumnPickerOpen ? (
                      <div ref={ledgerColumnPickerPanelRef} className="absolute left-0 top-full z-20 mt-2 w-80 rounded-3xl border border-slate-200 bg-white p-3 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.35)] dark:border-slate-700 dark:bg-slate-950">
                        <div className="text-[11px] font-black tracking-[0.12em] text-slate-400 dark:text-slate-500">ستون‌های اختیاری</div>
                        <div className="mt-3 space-y-2">
                          {[
                            { key: 'systemId', label: 'شناسه سیستم', hint: 'نمایش شناسه دارایی در جدول' },
                            { key: 'createdAt', label: 'تاریخ ثبت', hint: 'زمان ثبت رکورد' },
                            { key: 'transactionDate', label: 'تاریخ تراکنش', hint: 'زمان مالی تراکنش' },
                          ].map((item) => {
                            const checked = Boolean((ledgerVisibleColumns as any)[item.key]);
                            return (
                              <label key={item.key} className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 transition hover:bg-white dark:border-slate-800 dark:bg-slate-900/70 dark:hover:bg-slate-900">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) => setLedgerVisibleColumns((current) => ({ ...current, [item.key]: e.target.checked }))}
                                  className="peer sr-only"
                                />
                                <span className="min-w-0 flex-1">
                                  <span className="block text-[13px] font-bold text-slate-800 dark:text-slate-100">{item.label}</span>
                                  <span className="block text-[11px] leading-5 text-slate-500 dark:text-slate-400">{item.hint}</span>
                                </span>
                                <span className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-all duration-200 ${checked ? 'border-violet-500 bg-violet-500 shadow-[0_10px_24px_-16px_rgba(99,102,241,0.8)]' : 'border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-700'}`}>
                                  <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? 'right-1 -translate-x-0' : 'right-1 translate-x-5'}`} />
                                </span>
                              </label>
                            );
                          })}
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsLedgerColumnPickerOpen(false)}
                          className="mt-3 inline-flex h-[30px] items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-[11px] font-black text-slate-600 transition hover:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          <i className="fa-solid fa-check" />
                          بستن
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 justify-end">
                {[
                  { key: 'all', label: 'همه', icon: 'fa-layer-group' },
                  { key: 'today', label: 'امروز', icon: 'fa-calendar-day' },
                  { key: 'week', label: '۷ روز', icon: 'fa-calendar-week' },
                  { key: 'month', label: 'ماه اخیر', icon: 'fa-calendar-days' },
                ].map((item) => (
                  <Button
                    key={item.key}
                    type="button"
                    onClick={() => setLedgerRange(item.key as any)}
                    variant={ledgerRange === item.key ? 'primary' : 'secondary'}
                    size="xs"
                    className={`people-action-btn people-action-btn-tight people-action-btn-primary partner-detail-action-btn partner-ledger-v135-filter-btn !px-3 !text-[11px] ${ledgerRange === item.key ? 'is-active' : ''}`}
                    leftIcon={<i className={`fa-solid ${item.icon}`} />}
                  >
                    {item.label}
                  </Button>
                ))}
                {[
                  { key: 'all', label: 'همه تراکنش‌ها', icon: 'fa-layer-group' },
                  { key: 'debit', label: 'فقط بدهکار', icon: 'fa-arrow-up' },
                  { key: 'credit', label: 'فقط بستانکار', icon: 'fa-arrow-down' },
                  { key: 'recent', label: 'اخیر', icon: 'fa-clock-rotate-left' },
                ].map((item) => (
                  <Button
                    key={item.key}
                    type="button"
                    onClick={() => setLedgerViewFilter(item.key as any)}
                    variant={ledgerViewFilter === item.key ? 'primary' : 'secondary'}
                    size="xs"
                    className={`people-action-btn people-action-btn-tight people-action-btn-secondary partner-detail-action-btn partner-ledger-v135-filter-btn !px-3 !text-[11px] ${ledgerViewFilter === item.key ? 'is-active' : ''}`}
                    leftIcon={<i className={`fa-solid ${item.icon}`} />}
                  >
                    {item.label}
                  </Button>
                ))}
                {ledgerSettlementBatchOptions.length > 0 ? (
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-2 py-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-950/70">
                    <i className="fa-solid fa-link text-[11px] text-slate-400" />
                    <select
                      value={activeLedgerBatchId}
                      onChange={(e) => setActiveLedgerBatchId(e.target.value)}
                      className="h-[30px] min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-2 text-[11px] font-black text-slate-700 outline-none transition   dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                      title="نمایش پرداخت‌های یک دسته تسویه"
                    >
                      <option value="">همه دسته‌های تسویه</option>
                      {ledgerSettlementBatchOptions.map((batch) => (
                        <option key={batch.id} value={batch.id}>
                          {batch.id} · {batch.count.toLocaleString('fa-IR')} رکورد · {batch.amount.toLocaleString('fa-IR')}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
                <div className="inline-flex items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                  {[
                    { key: 'table', label: 'جدول', icon: 'fa-table-cells-large' },
                    { key: 'cards', label: 'کارت‌ها', icon: 'fa-table-cells' },
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setLedgerDisplayMode(item.key as 'table' | 'cards')}
                      className={`inline-flex h-[30px] items-center gap-2 rounded-xl px-3 text-[11px] font-black transition ${
                        ledgerDisplayMode === item.key
                          ? 'bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950'
                          : 'bg-transparent text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                      }`}
                      title={item.label}
                    >
                      <i className={`fa-solid ${item.icon}`} />
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
              {activeLedgerBatchId ? (
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={handlePrintActiveBatch} className="inline-flex h-[30px] items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2 text-[10px] font-black text-slate-600 transition hover:bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"><i className="fa-solid fa-print" /> چاپ</button>
                  <button type="button" onClick={handleExportActiveBatchCsv} className="inline-flex h-[30px] items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-2 text-[10px] font-black text-emerald-700 transition hover:bg-white dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200"><i className="fa-solid fa-file-excel" /> Excel</button>
                  <button type="button" onClick={() => setActiveLedgerBatchId('')} className="inline-flex h-[30px] items-center gap-1 rounded-xl px-2 text-[10px] font-black text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-100"><i className="fa-solid fa-xmark" /> حذف فیلتر</button>
                </div>
              ) : null}
            </div>
          </div>

        {activeLedgerBatchId && activeBatchLedgerMetrics ? (
          <div className="partner-ledger-batch-sticky-summary sticky top-24 z-10 mb-5">
            <div className="partner-ledger-batch-sticky-summary__surface">
              <div className="partner-ledger-batch-sticky-summary__head">
                <div>
                  <div className="partner-ledger-batch-sticky-summary__eyebrow">خلاصه دسته تسویه انتخاب‌شده</div>
                  <div className="partner-ledger-batch-sticky-summary__title">{activeLedgerBatchId}</div>
                </div>
                <div className="partner-ledger-batch-sticky-summary__meta">
                  <span className="partner-ledger-batch-sticky-summary__pill"><i className="fa-solid fa-layer-group" /> {activeBatchLedgerMetrics.count.toLocaleString('fa-IR')} رکورد</span>
                  <span className="partner-ledger-batch-sticky-summary__pill"><i className="fa-solid fa-clock-rotate-left" /> آخرین ثبت: {activeBatchLedgerMetrics.latestDate}</span>
                </div>
              </div>
              <div className="partner-ledger-batch-sticky-summary__grid">
                <article className="partner-ledger-batch-sticky-summary__card">
                  <span className="partner-ledger-batch-sticky-summary__label">جمع پرداخت‌ها</span>
                  <strong className="partner-ledger-batch-sticky-summary__value">{formatPartnerLedgerCurrency(activeBatchLedgerMetrics.totalDebit, 'debit')}</strong>
                </article>
                <article className="partner-ledger-batch-sticky-summary__card">
                  <span className="partner-ledger-batch-sticky-summary__label">جمع دریافت‌ها</span>
                  <strong className="partner-ledger-batch-sticky-summary__value">{formatPartnerLedgerCurrency(activeBatchLedgerMetrics.totalCredit, 'credit')}</strong>
                </article>
                <article className="partner-ledger-batch-sticky-summary__card">
                  <span className="partner-ledger-batch-sticky-summary__label">مانده بعد از فیلتر</span>
                  <strong className="partner-ledger-batch-sticky-summary__value">{formatPartnerLedgerCurrency(activeBatchLedgerMetrics.latestBalance, 'balance')}</strong>
                </article>
              </div>
            </div>
          </div>
        ) : null}

        {filteredLedgerEntries.length === 0 ? (
          <div className="partner-ledger-empty-state" dir="rtl">
            <div className="partner-ledger-empty-state__icon"><i className={`fa-solid ${ledgerEmptyState.icon}`} /></div>
            <div className="partner-ledger-empty-state__content">
              <h3>{ledgerEmptyState.title}</h3>
              <p>{ledgerEmptyState.description}</p>
            </div>
            <button type="button" onClick={ledgerEmptyState.action} className="partner-ledger-empty-state__action">
              <i className={`fa-solid ${ledger.length === 0 ? 'fa-plus' : 'fa-rotate-left'}`} />
              {ledgerEmptyState.actionLabel}
            </button>
          </div>
        ) : ledgerDisplayMode === 'cards' ? (
          <div className="space-y-4">
              {groupedLedgerEntries.map((group) => {
                const relatedPurchase = purchaseHistoryBySystemId.get(group.systemId);
                return (
                  <section key={group.systemId} className="partner-ledger-hover-card overflow-hidden rounded-[32px] border border-slate-200 bg-slate-50/80 shadow-[0_24px_60px_-48px_rgba(15,23,42,0.26)] dark:border-slate-800 dark:bg-slate-950/30">
                    <div className="flex flex-col gap-3 border-b border-slate-200 bg-white/90 p-4 dark:border-slate-800 dark:bg-slate-900/70 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex flex-wrap items-center gap-2 justify-end">
                        <span className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-[11px] font-black text-violet-700 dark:border-violet-900/40 dark:bg-violet-950/30 dark:text-violet-200" dir="ltr">
                          <i className="fa-solid fa-barcode" />
                          {group.systemId}
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                          <i className="fa-solid fa-layer-group" />
                          {group.entries.length.toLocaleString('fa-IR')} تراکنش
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200">
                          <i className="fa-solid fa-pen-to-square" />
                          ثبت: {ledgerRecordedAt(group.entries[group.entries.length - 1] || group.entries[0])}
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-full border border-fuchsia-200 bg-fuchsia-50 px-3 py-1.5 text-[11px] font-semibold text-fuchsia-700 dark:border-fuchsia-900/40 dark:bg-fuchsia-950/20 dark:text-fuchsia-200">
                          <i className="fa-solid fa-clock-rotate-left" />
                          آخرین: {formatLedgerTransactionDate(group.entries[0]?.transactionDate || group.entries[0]?.createdAt || '')}
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {relatedPurchase ? 'تاریخچه همین شناسه در کارت سمت راست هر تراکنش قابل مشاهده است.' : 'برای این شناسه هنوز تاریخچه خرید مرتبط ثبت نشده است.'}
                      </div>
                    </div>
                    <div className="space-y-4 p-4">
                      {group.entries.map((entry, index) => renderLedgerTransactionCard(entry, relatedPurchase, group.systemId, index, group.entries.length))}
                    </div>
                  </section>
                );
              })}
            </div>
        ) : (
          <div className={ledgerDisplayMode === 'cards' ? 'hidden people-ledger-grid partner-ledger-grid' : 'people-ledger-grid partner-ledger-grid'}>
            <div className="partner-ledger-summary-grid partner-ledger-v133__summary-grid">
              <article className="partner-ledger-summary-card partner-ledger-v133__summary-card is-violet">
                <div className="partner-ledger-v133__summary-head">
                  <span className="partner-ledger-v133__summary-icon"><i className="fa-solid fa-barcode" /></span>
                  <span className="partner-ledger-summary-card__label">شناسه‌های سیستم</span>
                </div>
                <strong className="partner-ledger-summary-card__value">{groupedLedgerEntries.length.toLocaleString('fa-IR')}</strong>
                <span className="partner-ledger-summary-card__meta">گروه‌بندی براساس محصول / گوشی</span>
              </article>
              <article className="partner-ledger-summary-card partner-ledger-v133__summary-card is-emerald">
                <div className="partner-ledger-v133__summary-head">
                  <span className="partner-ledger-v133__summary-icon"><i className="fa-solid fa-receipt" /></span>
                  <span className="partner-ledger-summary-card__label">تراکنش‌های فیلترشده</span>
                </div>
                <strong className="partner-ledger-summary-card__value">{filteredLedgerEntries.length.toLocaleString('fa-IR')}</strong>
                <span className="partner-ledger-summary-card__meta">همه رکوردهای قابل نمایش</span>
              </article>
              <article className="partner-ledger-summary-card partner-ledger-v133__summary-card is-amber">
                <div className="partner-ledger-v133__summary-head">
                  <span className="partner-ledger-v133__summary-icon"><i className="fa-solid fa-link" /></span>
                  <span className="partner-ledger-summary-card__label">شناسه‌های خرید مرتبط</span>
                </div>
                <strong className="partner-ledger-summary-card__value">{purchaseHistoryBySystemId.size.toLocaleString('fa-IR')}</strong>
                <span className="partner-ledger-summary-card__meta">تاریخچه همان دارایی</span>
              </article>
            </div>
            <div className="people-table-shell partner-ledger-shell overflow-x-auto">
              <table className="partner-ledger-table min-w-[980px] table-fixed divide-y divide-slate-200 text-sm dark:divide-slate-800">
                <thead className="partner-ledger-table__head bg-slate-50/95 dark:bg-slate-900/80">
                  <tr className="partner-ledger-table__head-row text-right [&>th]:px-4 [&>th]:py-3 [&>th]:font-bold [&>th]:text-slate-600 dark:[&>th]:text-slate-200">
                    <th className={`${ledgerVisibleColumns.systemId ? 'w-40' : 'hidden'}`}><span className="inline-flex items-center gap-2"><i className="fa-solid fa-barcode text-violet-500" /> شناسه سیستم</span></th>
                    <th className={`${ledgerVisibleColumns.createdAt ? 'w-36' : 'hidden'}`}><span className="inline-flex items-center gap-2"><i className="fa-solid fa-calendar-check text-sky-500" /> تاریخ ثبت</span></th>
                    <th className={`${ledgerVisibleColumns.transactionDate ? 'w-36' : 'hidden'}`}><span className="inline-flex items-center gap-2"><i className="fa-solid fa-calendar-day text-cyan-500" /> تاریخ تراکنش</span></th>
                    <th className="w-64"><span className="inline-flex items-center gap-2"><i className="fa-solid fa-align-right text-indigo-500" /> شرح</span></th>
                    <th className="w-28"><span className="inline-flex items-center gap-2"><i className="fa-solid fa-arrow-up text-rose-500" /> بدهکار</span></th>
                    <th className="w-28"><span className="inline-flex items-center gap-2"><i className="fa-solid fa-arrow-down text-emerald-500" /> بستانکار</span></th>
                    <th className="w-32"><span className="inline-flex items-center gap-2"><i className="fa-solid fa-scale-balanced text-amber-500" /> مانده</span></th>
                    <th className="w-[19rem]"><span className="inline-flex items-center gap-2"><i className="fa-solid fa-gear text-slate-500" /> عملیات</span></th>
                  </tr>
                </thead>
                <tbody className="partner-ledger-table__body bg-white divide-y divide-slate-200 dark:bg-slate-900/40 dark:divide-slate-800">
                  {groupedLedgerEntries.map((group) => {
                    const relatedPurchase = purchaseHistoryBySystemId.get(group.systemId);
                    return (
                      <React.Fragment key={group.systemId}>
                        <tr className="partner-ledger-group-row bg-violet-50/80 dark:bg-violet-950/20">
                          <td colSpan={ledgerTableColumnCount} className="px-4 py-3">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="flex flex-wrap items-center gap-2 justify-end">
                                <div className="partner-system-id-block partner-system-id-block--right flex w-[148px] flex-col items-end gap-1 rounded-3xl border border-violet-200 bg-white px-3 py-2 text-right text-violet-700 dark:border-violet-900/40 dark:bg-slate-950 dark:text-violet-300">
                                  <span className="text-[10px] font-black tracking-[0.14em] opacity-80">شناسه سیستم</span>
                                  <span
                                    className="partner-system-id-value block w-full text-right font-mono text-xs font-black leading-none tracking-[0.02em]"
                                    dir="ltr"
                                  >
                                    {group.systemId}
                                  </span>
                                </div>
                                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                                  <i className="fa-solid fa-layer-group" /> {group.entries.length.toLocaleString('fa-IR')} تراکنش
                                </span>
                                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-slate-950 dark:text-emerald-200">
                                  <i className="fa-solid fa-pen-to-square" /> ثبت: {ledgerRecordedAt(group.entries[group.entries.length - 1] || group.entries[0])}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 justify-end text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                <span>آخرین تراکنش: {formatLedgerTransactionDate(group.entries[0]?.transactionDate || group.entries[0]?.createdAt || '')}</span>
                                {relatedPurchase ? <span className="inline-flex items-center gap-1 rounded-full border border-fuchsia-200 bg-white px-2.5 py-1 dark:border-fuchsia-900/40 dark:bg-slate-950"><i className="fa-solid fa-box-archive text-fuchsia-500" /> تاریخچه خرید مرتبط موجود است</span> : null}
                              </div>
                            </div>
                          </td>
                        </tr>
                        {group.entries.map((entry) => {
                          const meta = parsePartnerLedgerMeta(entry.description);
                          const recordedAt = ledgerRecordedAt(entry);
                          const systemId = group.systemId;
                          const expanded = expandedLedgerEntryId === entry.id;
                          return (
                            <React.Fragment key={entry.id}>
                              <tr className={`partner-ledger-row partner-ledger-hover-row transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${expanded ? 'partner-ledger-row--expanded bg-slate-50/60 dark:bg-slate-800/30' : ''}`}>
                                <td className={`${ledgerVisibleColumns.systemId ? 'px-4 py-3 whitespace-nowrap align-middle' : 'hidden'}`}>
                                  <div className="partner-system-id-block partner-system-id-block--right flex w-full min-w-[124px] flex-col items-end gap-1.5 rounded-2xl border border-violet-100 bg-white px-3 py-2 text-right shadow-[0_12px_26px_-22px_rgba(15,23,42,0.18)] dark:border-violet-900/40 dark:bg-slate-950/90">
                                    <div className="partner-system-id-value block w-full text-right font-mono text-xs font-bold text-violet-700 dark:text-violet-300" dir="ltr">{systemId}</div>
                                    <div className="inline-flex items-center justify-center gap-1.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                                      <i className="fa-solid fa-boxes-stacked text-[9px] text-violet-400" />
                                      {entry.referenceType ? String(entry.referenceType) : 'بدون مرجع'}
                                    </div>
                                  </div>
                                </td>
                                <td className={`${ledgerVisibleColumns.createdAt ? 'px-4 py-3 whitespace-nowrap align-middle text-slate-700 dark:text-slate-200' : 'hidden'}`}><span className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-3 py-2 font-semibold shadow-[0_12px_26px_-24px_rgba(15,23,42,0.2)] dark:border-slate-700 dark:bg-slate-900/70">{recordedAt}</span></td>
                                <td className={`${ledgerVisibleColumns.transactionDate ? 'px-4 py-3 whitespace-nowrap align-middle text-slate-700 dark:text-slate-200' : 'hidden'}`}><span className="inline-flex items-center rounded-2xl border border-cyan-100 bg-cyan-50 px-3 py-2 font-semibold shadow-[0_12px_26px_-24px_rgba(15,23,42,0.2)] dark:border-cyan-900/30 dark:bg-cyan-950/20">{formatLedgerTransactionDate(entry.transactionDate)}</span></td>
                                <td className="px-3 py-3 align-middle">
                                  <div className="group min-w-0 max-w-[250px]" title={ledgerDetailLines(entry, meta).join('\n')}>
                                    <div className="flex flex-wrap items-center gap-2 justify-end">
                                      <span className="block min-w-0 max-w-[230px] truncate font-semibold leading-6 text-slate-900 dark:text-slate-100">{meta.summary}</span>
                                    </div>
                                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                                      {meta.imei ? <span>IMEI: {meta.imei}</span> : null}
                                      {meta.saleId ? <span>شناسه فروش: {meta.saleId}</span> : null}
                                    </div>
                                    <span className="mt-1 block text-[11px] text-slate-400 dark:text-slate-500">برای مشاهده اطلاعات کامل، ردیف را باز کنید.</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap align-middle"><span className="inline-flex min-w-[76px] justify-center rounded-2xl border border-rose-100 bg-rose-50 px-3 py-2 shadow-[0_12px_26px_-24px_rgba(15,23,42,0.2)] dark:border-rose-900/30 dark:bg-rose-950/20">{formatPartnerLedgerCurrency(entry.debit, 'debit')}</span></td>
                                <td className="px-4 py-3 whitespace-nowrap align-middle"><span className="inline-flex min-w-[76px] justify-center rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2 shadow-[0_12px_26px_-24px_rgba(15,23,42,0.2)] dark:border-emerald-900/30 dark:bg-emerald-950/20">{formatPartnerLedgerCurrency(entry.credit, 'credit')}</span></td>
                                <td className="px-4 py-3 whitespace-nowrap align-middle"><span className="partner-ledger-balance-pill inline-flex min-w-[96px] justify-center rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 shadow-[0_12px_26px_-24px_rgba(15,23,42,0.2)] dark:border-slate-700 dark:bg-slate-900/70">{formatPartnerLedgerCurrency(entry.balance, 'balance')}</span></td>
                                <td className="px-3 py-3 whitespace-nowrap align-middle" dir="rtl">
                                  <div className="ledger-actions-row partner-ledger-actions-equal">
                                    <Button onClick={() => setExpandedLedgerEntryId(prev => prev === entry.id ? null : entry.id)} variant="secondary" size="xs" className="finance-table-action finance-table-action--view" title="باز و بسته کردن جزئیات" leftIcon={<i className={`fa-solid ${expanded ? 'fa-chevron-up' : 'fa-chevron-down'}`} />}>
                                      {expanded ? 'بستن' : 'جزئیات'}
                                    </Button>
                                    <Button onClick={() => setEditingEntry(entry)} variant="warning" size="xs" className="finance-table-action finance-table-action--edit" title="ویرایش اطلاعات رکورد" leftIcon={<i className="fa-solid fa-pen-to-square" />}>
                                      ویرایش
                                    </Button>
                                    <Button onClick={() => handleLedgerDelete(entry.id)} disabled={isDeletingEntry} loading={isDeletingEntry} loadingText="حذف مورد..." variant="danger" size="xs" className="finance-table-action finance-table-action--danger disabled:opacity-60" title="حذف مورد رکورد" leftIcon={<i className="fa-solid fa-trash" />}>
                                      حذف
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                              {expanded ? (
                                <tr className="partner-ledger-expanded-row bg-slate-50/70 dark:bg-slate-900/60">
                                  <td colSpan={ledgerTableColumnCount} className="px-4 pb-4">
                                    <div className="partner-ledger-expanded-panel partner-ledger-expanded-panel--solid rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-950/60">
                                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                        <div className="flex flex-col items-end w-full">
  <div className="w-full text-right text-xs text-slate-500">
    شناسه سیستم
  </div>

  <div
    className="mt-1 w-full font-mono text-sm font-semibold text-violet-700 dark:text-violet-300 !text-right"
    dir="ltr"
    style={{
      direction: 'ltr',
      textAlign: 'right',
      unicodeBidi: 'plaintext'
    }}
  >
    {systemId}
  </div>
</div>
                                        <div><div className="text-xs text-slate-500">شرح کوتاه</div><div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{meta.summary}</div></div>
                                        <div><div className="text-xs text-slate-500">IMEI</div><div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{meta.imei || '—'}</div></div>
                                        <div><div className="text-xs text-slate-500">نوع</div><div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{getLedgerSystemKind(entry) === 'phone' ? 'گوشی' : getLedgerSystemKind(entry) === 'product' ? 'محصول' : 'دیگر'}</div></div>
                                        <div><div className="text-xs text-slate-500">تاریخ ثبت</div><div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{recordedAt}</div></div>
                                        <div><div className="text-xs text-slate-500">تاریخ تراکنش</div><div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{formatLedgerTransactionDate(entry.transactionDate)}</div></div>
                                        <div><div className="text-xs text-slate-500">بدهکار</div><div className="mt-1 font-semibold text-rose-600">{formatCurrencyText(entry.debit, readStoredCurrencyUnit())}</div></div>
                                        <div><div className="text-xs text-slate-500">بستانکار</div><div className="mt-1 font-semibold text-emerald-600">{formatCurrencyText(entry.credit, readStoredCurrencyUnit())}</div></div>
                                        <div><div className="text-xs text-slate-500">مانده</div><div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{formatPartnerLedgerCurrency(entry.balance, 'balance')}</div></div>
                                      </div>
                                      {relatedPurchase?.history?.length ? (
                                        <div className="partner-ledger-history-card mt-4 rounded-3xl border border-fuchsia-100 bg-fuchsia-50/40 p-4 dark:border-fuchsia-900/30 dark:bg-fuchsia-950/10">
                                          <div className="flex items-center justify-between gap-2">
                                            <div>
                                              <div className="text-xs font-black tracking-[0.12em] text-fuchsia-700 dark:text-fuchsia-200">تاریخچه همین شناسه محصول</div>
                                              <div className="mt-1 text-sm font-black text-slate-900 dark:text-slate-50">{relatedPurchase.name}</div>
                                            </div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400">{relatedPurchase.history.length.toLocaleString('fa-IR')} تغییر</div>
                                          </div>
                                          <div className="partner-ledger-history-grid mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                            {relatedPurchase.history.slice().reverse().map((h: any, idx: number) => (
                                              <div key={`${systemId}-hist-${idx}`} className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950/60">
                                                <div className="flex items-center justify-between gap-2">
                                                  <div className="text-[11px] font-black text-slate-500 dark:text-slate-400">{h.title || 'رویداد ثبت‌شده'}</div>
                                                  <div className="text-[11px] text-slate-400 dark:text-slate-500">{formatIsoToShamsiDateTime(h.changedAt, 'jYYYY/jMM/jDD HH:mm')}</div>
                                                </div>
                                                <div className="mt-2 text-xs leading-6 text-slate-600 dark:text-slate-300">
                                                  {h.description ? <div>{String(h.description)}</div> : null}
                                                  {h.oldPrice != null || h.newPrice != null ? <div>قیمت قبلی: <span className="font-black text-slate-900 dark:text-slate-50">{formatCurrencyText(Number(h.oldPrice || 0), readStoredCurrencyUnit())}</span></div> : null}
                                                  {h.newPrice != null ? <div>قیمت جدید: <span className="font-black text-slate-900 dark:text-slate-50">{formatCurrencyText(Number(h.newPrice || 0), readStoredCurrencyUnit())}</span></div> : null}
                                                  {h.newPurchasePrice != null ? <div>قیمت خرید: <span className="font-black text-slate-900 dark:text-slate-50">{formatCurrencyText(Number(h.newPurchasePrice || 0), readStoredCurrencyUnit())}</span></div> : null}
                                                  {h.newSalePrice != null ? <div>قیمت فروش: <span className="font-black text-slate-900 dark:text-slate-50">{formatCurrencyText(Number(h.newSalePrice || 0), readStoredCurrencyUnit())}</span></div> : null}
                                                  {h.note ? <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{h.note}</div> : null}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      ) : null}
                                    </div>
                                  </td>
                                </tr>
                              ) : null}
                            </React.Fragment>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Other Purchases */}
      <div id="partner-history-section" className="people-ledger-grid detail-card p-6">
        <div className="mb-5 flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-fuchsia-100 bg-fuchsia-50 text-fuchsia-700 shadow-sm dark:border-fuchsia-900/40 dark:bg-fuchsia-950/20 dark:text-fuchsia-200">
              <i className="fa-solid fa-boxes-stacked" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-50">خریدهای ثبت‌شده از این همکار</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">گوشی‌ها و کالاهای خریداری‌شده به‌صورت یک ردیف برای هر شناسه اصلی نمایش داده می‌شوند؛ تغییر قیمت‌ها داخل جزئیات همان ردیف قابل مشاهده است.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 justify-end rounded-[20px] border border-slate-200 bg-slate-50/80 p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900/55">
            {[
              { key: 'all', label: 'همه', count: purchaseHistoryCounts.all, icon: 'fa-layer-group' },
              { key: 'phone', label: 'گوشی‌ها', count: purchaseHistoryCounts.phone, icon: 'fa-mobile-screen' },
              { key: 'product', label: 'کالاها', count: purchaseHistoryCounts.product, icon: 'fa-box' },
            ].map((tab) => {
              const active = purchaseHistoryFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => { setPurchaseHistoryFilter(tab.key as any); setExpandedPurchaseHistoryId(null); }}
                  className={`inline-flex min-w-[116px] items-center justify-between gap-3 rounded-[18px] border px-3 py-2.5 text-[11px] font-black transition ${active ? 'border-slate-950 bg-slate-950 text-white shadow-[0_16px_30px_-24px_rgba(15,23,42,0.45)] dark:border-white dark:bg-white dark:text-slate-950' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800'}`}
                >
                  <span className="inline-flex items-center gap-2">
                    <i className={`fa-solid ${tab.icon}`} />
                    <span>{tab.label}</span>
                  </span>
                  <span className={`inline-flex min-w-[30px] items-center justify-center rounded-xl border px-2 py-1 text-[10px] font-black ${active ? 'border-white/20 bg-white/15 text-white dark:border-slate-900/10 dark:bg-slate-950/10 dark:text-slate-950' : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'}`}>{tab.count.toLocaleString('fa-IR')}</span>
                </button>
              );
            })}
          </div>
        </div>
        {purchaseHistoryVisible.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">برای این همکار خریدی با این فیلتر ثبت نشده است.</p>
        ) : (
          <div className="people-table-shell overflow-x-auto">
            <table className="min-w-[1240px] divide-y divide-slate-200 text-sm dark:divide-slate-800">
              <thead className="partner-ledger-table__head bg-slate-50/95 dark:bg-slate-900/80">
                <tr>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-200"><span className="inline-flex items-center gap-2"><i className="fa-solid fa-calendar-day text-sky-500" /> تاریخ</span></th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-200"><span className="inline-flex items-center gap-2"><i className="fa-solid fa-barcode text-slate-500" /> شناسه سیستم</span></th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-200"><span className="inline-flex items-center gap-2"><i className="fa-solid fa-layer-group text-indigo-500" /> نوع</span></th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-200"><span className="inline-flex items-center gap-2"><i className="fa-solid fa-box text-violet-500" /> نام/مدل کالا</span></th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-200"><span className="inline-flex items-center gap-2"><i className="fa-solid fa-bullseye text-amber-500" /> تعداد</span></th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-200"><span className="inline-flex items-center gap-2"><i className="fa-solid fa-scale-balanced text-slate-500" /> واحد</span></th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-200"><span className="inline-flex items-center gap-2"><i className="fa-solid fa-tag text-emerald-500" /> قیمت واحد</span></th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-200"><span className="inline-flex items-center gap-2"><i className="fa-solid fa-sack-dollar text-sky-500" /> مبلغ کل</span></th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-200"><span className="inline-flex items-center gap-2"><i className="fa-solid fa-clock-rotate-left text-fuchsia-500" /> آخرین تغییر</span></th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-200"><span className="inline-flex items-center gap-2"><i className="fa-solid fa-gear text-slate-500" /> عملیات</span></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                {purchaseHistoryVisible.map((item: any) => {
                  const assetKey = String(item.assetKey || `${item.type}-${item.id}`);
                  const systemId = String(item.systemId || getPurchaseSystemId(item));
                  const qty = Number(item.quantityPurchased ?? item.quantity ?? 0);
                  const unitPrice = Number(item.unitPrice ?? item.purchasePrice ?? 0);
                  const total = Number(item.totalPrice ?? (qty && unitPrice ? qty * unitPrice : 0));
                  const unitLabel = String(item.unit || 'عدد');
                  const typeLabel = item.type === 'phone' ? 'گوشی' : item.type === 'product' ? 'کالا' : 'رسید';
                  const expanded = expandedPurchaseHistoryId === assetKey;
                  const history = Array.isArray(item.history) ? item.history : [];
                  const historyToneIcon = item.type === 'phone' ? 'fa-mobile-screen-button' : item.type === 'product' ? 'fa-box' : 'fa-receipt';
                  return (
                    <React.Fragment key={assetKey}>
                      <tr className={`transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${expanded ? 'bg-slate-50/60 dark:bg-slate-800/30' : ''}`}>
                        <td className="px-4 py-2 whitespace-nowrap align-middle">{formatIsoToShamsiDateTime(item.purchaseDate || item.soldAt, 'jYYYY/jMM/jDD HH:mm')}</td>
                        <td className="px-4 py-2 whitespace-nowrap align-middle">
                          <div className="font-mono text-xs text-slate-500" dir="ltr">{systemId}</div>
                        </td>
                        <td className="px-4 py-2 align-middle"><span className={`people-chip ${item.type === 'phone' ? 'people-chip-success' : 'people-chip-neutral'}`}>{typeLabel}</span></td>
                        <td className="px-4 py-2 align-middle">
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 dark:text-slate-100">{item.name}</div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 justify-end text-[11px] text-slate-500 dark:text-slate-400">
                              {item.identifier ? <span>IMEI: {item.identifier}</span> : null}
                              {item.purchaseTypeLabel ? <span>نوع خرید: {item.purchaseTypeLabel}</span> : null}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap align-middle"><div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-black text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"><i className="fa-solid fa-bullseye text-amber-500" />{qty ? qty.toLocaleString('fa-IR') : '-'}</div></td>
                        <td className="px-4 py-2 whitespace-nowrap align-middle"><span className="people-chip people-chip-neutral">{unitLabel}</span></td>
                        <td className="px-4 py-2 whitespace-nowrap align-middle"><div className="font-black text-slate-900 dark:text-slate-50">{unitPrice ? formatCurrencyText(unitPrice, readStoredCurrencyUnit()) : '-'}</div><div className="mt-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500">واحد هر قلم</div></td>
                        <td className="px-4 py-2 whitespace-nowrap font-semibold"><div className="font-black text-slate-900 dark:text-slate-50">{total ? formatCurrencyText(total, readStoredCurrencyUnit()) : '-'}</div><div className="mt-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500">مبلغ کل ردیف</div></td>
                        <td className="px-4 py-2 whitespace-nowrap align-middle text-slate-600 dark:text-slate-300">{formatIsoToShamsiDateTime(item.lastHistoryAt || item.currentPurchasePriceUpdatedAt || item.purchaseDate || item.soldAt, 'jYYYY/jMM/jDD HH:mm')}</td>
                        <td className="px-3 py-2 whitespace-nowrap align-middle">
                          <Button type="button" variant="secondary" size="xs" className="!h-9 !rounded-2xl !px-3 !text-[11px]" onClick={() => setExpandedPurchaseHistoryId((prev) => prev === assetKey ? null : assetKey)} leftIcon={<i className={`fa-solid ${expanded ? 'fa-chevron-up' : 'fa-chevron-down'}`} />}>
                            {expanded ? 'بستن' : 'جزئیات'}
                          </Button>
                        </td>
                      </tr>
                      {expanded ? (
                        <tr className="partner-ledger-expanded-row bg-slate-50/70 dark:bg-slate-900/60">
                          <td colSpan={10} className="px-4 pb-4">
                            <div className="partner-ledger-expanded-panel partner-ledger-expanded-panel--solid rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-950/60">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <div className="text-xs font-black tracking-[0.12em] text-slate-500 dark:text-slate-400">تاریخچه تغییرات همین شناسه</div>
                                  <div className="mt-1 text-sm font-black text-slate-900 dark:text-slate-50">{item.name}</div>
                                  <div className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">شناسه سیستم: <span dir="ltr" className="font-mono">{systemId}</span></div>
                                </div>
                                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300"><i className={`fa-solid ${historyToneIcon} text-slate-500`} />{history.length.toLocaleString('fa-IR')} رویداد</div>
                              </div>
                              {history.length > 0 ? (
                                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                  {history.slice().reverse().map((h: any, idx: number) => (
                                    <div key={`${assetKey}-${idx}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="text-[11px] font-black text-slate-500 dark:text-slate-400">{h.title || (item.type === 'product' ? 'تغییر قیمت کالا' : 'رویداد گوشی')}</div>
                                        <div className="text-[11px] text-slate-400 dark:text-slate-500">{formatIsoToShamsiDateTime(h.changedAt, 'jYYYY/jMM/jDD HH:mm')}</div>
                                      </div>
                                      {item.type === 'product' ? (
                                        <div className="mt-2 text-xs leading-6 text-slate-600 dark:text-slate-300">
                                          <div>قیمت قبلی: <span className="font-black text-slate-900 dark:text-slate-50">{formatCurrencyText(Number(h.oldPrice || 0), readStoredCurrencyUnit())}</span></div>
                                          <div>قیمت جدید: <span className="font-black text-slate-900 dark:text-slate-50">{formatCurrencyText(Number(h.newPrice || 0), readStoredCurrencyUnit())}</span></div>
                                          {h.note ? <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{h.note}</div> : null}
                                        </div>
                                      ) : (
                                        <div className="mt-2 text-xs leading-6 text-slate-600 dark:text-slate-300">
                                          {(h.description || '').toString() ? <div>{String(h.description)}</div> : null}
                                          <div className="mt-1">قیمت خرید: <span className="font-black text-slate-900 dark:text-slate-50">{formatCurrencyText(Number(h.newPurchasePrice || item.purchasePrice || 0), readStoredCurrencyUnit())}</span></div>
                                          {h.newSalePrice ? <div>قیمت فروش: <span className="font-black text-slate-900 dark:text-slate-50">{formatCurrencyText(Number(h.newSalePrice || 0), readStoredCurrencyUnit())}</span></div> : null}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">برای این شناسه هنوز رویداد تغییر ثبت نشده است.</div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Edit Partner Modal */}
      {isEditModalOpen && (
        <Modal
          title="ویرایش اطلاعات همکار"
          onClose={() => setIsEditModalOpen(false)}
          widthClass="max-w-[980px]"
          wrapperClassName="customer-edit-v2-overlay partner-edit-v98-overlay"
          iconClass="fa-solid fa-user-tie"
          variant="operational"
        >
          <form onSubmit={handleEditSubmit} className="customer-edit-v2 partner-edit-v98" dir="rtl">
            <FormErrorSummary
              errors={editFormErrors as any}
              labels={{
                partnerName: 'نام همکار',
                partnerType: 'نوع همکار',
                phoneNumber: 'شماره تماس',
                email: 'ایمیل',
              }}
              fieldIdMap={{
                partnerName: 'editPartnerName',
                partnerType: 'editPartnerType',
                phoneNumber: 'editPhoneNumber',
                email: 'editEmail',
              }}
              className="customer-edit-v2__errors"
            />

            <div className="customer-edit-v2__layout">
              <aside className="customer-edit-v2__summary">
                <div className="customer-edit-v2-card customer-edit-v2-card--hero customer-edit-v2-card--hero-side partner-edit-v98-hero-card">
                  <div className="customer-edit-v2-hero">
                    <div className="customer-edit-v2-hero__copy">
                      <span className="customer-edit-v2-hero__eyebrow"><i className="fa-solid fa-briefcase" /> فرم بازبینی پرونده همکار</span>
                      <h3>{editingPartner.partnerName || 'همکار فروشگاه'}</h3>
                      <p>مشخصات همکاری، راه‌های ارتباطی و اطلاعات پیگیری این همکار را دقیق و یکپارچه به‌روزرسانی کنید.</p>
                      <div className="customer-edit-v2-hero__chips">
                        <span className="customer-edit-v2-chip"><i className="fa-solid fa-lock" /> ثبت امن تغییرات</span>
                        <span className="customer-edit-v2-chip"><i className="fa-solid fa-bolt" /> بروزرسانی سریع پرونده</span>
                      </div>
                    </div>
                    <span className="customer-edit-v2-hero__avatar partner-edit-v98-avatar"><i className="fa-solid fa-user-tie" /></span>
                  </div>
                </div>

                <div className="customer-edit-v2-card customer-edit-v2-card--summary">
                  <div className="customer-edit-v2-card__head">
                    <div>
                      <h4>خلاصه وضعیت اطلاعات</h4>
                      <p>نمای کلی اطلاعات مهم همکاری</p>
                    </div>
                    <span className="customer-edit-v2-card__head-icon"><i className="fa-solid fa-chart-column" /></span>
                  </div>

                  <div className="customer-edit-v2-status-list">
                    <div className="customer-edit-v2-status-item">
                      <div className="customer-edit-v2-status-item__copy">
                        <span>نوع همکاری</span>
                        <strong>{PARTNER_TYPES.find((t) => t.value === editingPartner.partnerType)?.label || 'انتخاب نشده'}</strong>
                        <em className={editingPartner.partnerType?.trim() ? 'is-positive' : 'is-neutral'}><i className={`fa-solid ${editingPartner.partnerType?.trim() ? 'fa-circle-check' : 'fa-circle-minus'}`} /> {editingPartner.partnerType?.trim() ? 'تکمیل شده' : 'نیازمند انتخاب'}</em>
                      </div>
                      <span className="customer-edit-v2-status-item__icon"><i className="fa-solid fa-diagram-project" /></span>
                    </div>

                    <div className="customer-edit-v2-status-item">
                      <div className="customer-edit-v2-status-item__copy">
                        <span>شماره تماس</span>
                        <strong dir="ltr">{editingPartner.phoneNumber || 'ثبت نشده'}</strong>
                        <em className={editingPartner.phoneNumber?.trim() ? 'is-positive' : 'is-neutral'}><i className={`fa-solid ${editingPartner.phoneNumber?.trim() ? 'fa-circle-check' : 'fa-circle-minus'}`} /> {editingPartner.phoneNumber?.trim() ? 'ثبت شده' : 'نیازمند ثبت'}</em>
                      </div>
                      <span className="customer-edit-v2-status-item__icon"><i className="fa-solid fa-phone" /></span>
                    </div>

                    <div className="customer-edit-v2-status-item">
                      <div className="customer-edit-v2-status-item__copy">
                        <span>فرد رابط</span>
                        <strong>{editingPartner.contactPerson?.trim() ? editingPartner.contactPerson : 'ثبت نشده'}</strong>
                        <em className={editingPartner.contactPerson?.trim() ? 'is-info' : 'is-neutral'}><i className={`fa-solid ${editingPartner.contactPerson?.trim() ? 'fa-circle-info' : 'fa-circle-minus'}`} /> {editingPartner.contactPerson?.trim() ? 'قابل پیگیری' : 'در صورت نیاز ثبت شود'}</em>
                      </div>
                      <span className="customer-edit-v2-status-item__icon is-indigo"><i className="fa-solid fa-user-tie" /></span>
                    </div>
                  </div>
                </div>
              </aside>

              <section className="customer-edit-v2__main">
                <div className="customer-edit-v2-card customer-edit-v2-card--panel">
                  <div className="customer-edit-v2-panel__head">
                    <h4>هویت و ارتباط</h4>
                    <span><i className="fa-solid fa-handshake" /></span>
                  </div>

                  <div className="customer-edit-v2-grid customer-edit-v2-grid--two">
                    <label className="customer-edit-v2-field">
                      <span className="customer-edit-v2-field__label">نام همکار <em>*</em></span>
                      <div className={`customer-edit-v2-clean-shell ${editFormErrors.partnerName ? 'is-error' : ''}`}>
                        <div
                          id="editPartnerName"
                          role="textbox"
                          tabIndex={0}
                          contentEditable
                          suppressContentEditableWarning
                          className="customer-edit-v2-clean-editor customer-edit-v2-clean-editor--rtl"
                          data-placeholder="نام همکار یا مجموعه"
                          onInput={(event) => {
                            const value = event.currentTarget.textContent || '';
                            setEditingPartner(prev => ({ ...prev, partnerName: value }));
                            if (editFormErrors.partnerName) setEditFormErrors(prev => ({ ...prev, partnerName: undefined }));
                          }}
                          onBlur={(event) => {
                            const value = event.currentTarget.textContent || '';
                            if (value !== (editingPartner.partnerName || '')) {
                              setEditingPartner(prev => ({ ...prev, partnerName: value }));
                            }
                          }}
                        >{editingPartner.partnerName || ''}</div>
                        <span className="customer-edit-v2-clean-divider" aria-hidden="true" />
                        <span className="customer-edit-v2-clean-icon" aria-hidden="true"><i className="fa-solid fa-building-user" /></span>
                      </div>
                      {editFormErrors.partnerName ? <span className="customer-edit-v2-field__error"><i className="fa-solid fa-circle-exclamation" /> {editFormErrors.partnerName}</span> : null}
                    </label>

                    <label className="customer-edit-v2-field">
                      <span className="customer-edit-v2-field__label">نوع همکار <em>*</em></span>
                      <div className={`customer-edit-v2-clean-shell partner-edit-v98-select-shell ${editFormErrors.partnerType ? 'is-error' : ''}`}>
                        <select
                          id="editPartnerType"
                          name="partnerType"
                          value={editingPartner.partnerType || ''}
                          onChange={handleEditInputChange}
                          className="partner-edit-v98-select"
                          required
                        >
                          {PARTNER_TYPES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
                        </select>
                        <span className="customer-edit-v2-clean-divider" aria-hidden="true" />
                        <span className="customer-edit-v2-clean-icon" aria-hidden="true"><i className="fa-solid fa-diagram-project" /></span>
                      </div>
                      {editFormErrors.partnerType ? <span className="customer-edit-v2-field__error"><i className="fa-solid fa-circle-exclamation" /> {editFormErrors.partnerType}</span> : null}
                    </label>

                    <label className="customer-edit-v2-field">
                      <span className="customer-edit-v2-field__label">فرد رابط</span>
                      <div className={`customer-edit-v2-clean-shell ${editFormErrors.contactPerson ? 'is-error' : ''}`}>
                        <div
                          id="editContactPerson"
                          role="textbox"
                          tabIndex={0}
                          contentEditable
                          suppressContentEditableWarning
                          className="customer-edit-v2-clean-editor customer-edit-v2-clean-editor--rtl"
                          data-placeholder="نام فرد پاسخ‌گو یا مسئول هماهنگی"
                          onInput={(event) => {
                            const value = event.currentTarget.textContent || '';
                            setEditingPartner(prev => ({ ...prev, contactPerson: value }));
                            if (editFormErrors.contactPerson) setEditFormErrors(prev => ({ ...prev, contactPerson: undefined }));
                          }}
                          onBlur={(event) => {
                            const value = event.currentTarget.textContent || '';
                            if (value !== (editingPartner.contactPerson || '')) {
                              setEditingPartner(prev => ({ ...prev, contactPerson: value }));
                            }
                          }}
                        >{editingPartner.contactPerson || ''}</div>
                        <span className="customer-edit-v2-clean-divider" aria-hidden="true" />
                        <span className="customer-edit-v2-clean-icon" aria-hidden="true"><i className="fa-solid fa-user-tie" /></span>
                      </div>
                    </label>

                    <label className="customer-edit-v2-field">
                      <span className="customer-edit-v2-field__label">شماره تماس</span>
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
                            setEditingPartner(prev => ({ ...prev, phoneNumber: value }));
                            if (editFormErrors.phoneNumber) setEditFormErrors(prev => ({ ...prev, phoneNumber: undefined }));
                          }}
                          onBlur={(event) => {
                            const value = (event.currentTarget.textContent || '').replace(/[^0-9]/g, '');
                            if (value !== (editingPartner.phoneNumber || '')) {
                              setEditingPartner(prev => ({ ...prev, phoneNumber: value }));
                            }
                          }}
                        >{editingPartner.phoneNumber || ''}</div>
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
                      <span className="customer-edit-v2-field__label">ایمیل</span>
                      <div className={`customer-edit-v2-clean-shell partner-edit-v100-email-shell ${editFormErrors.email ? 'is-error' : ''}`} dir="ltr">
                        <input
                          id="editEmail"
                          name="email"
                          type="email"
                          inputMode="email"
                          autoComplete="email"
                          dir="ltr"
                          value={editingPartner.email || ''}
                          onChange={(event) => {
                            const value = event.currentTarget.value.trim();
                            setEditingPartner(prev => ({ ...prev, email: value }));
                            if (editFormErrors.email) setEditFormErrors(prev => ({ ...prev, email: undefined }));
                          }}
                          className="customer-edit-v2-native-input customer-edit-v2-native-input--ltr partner-edit-v100-email-input"
                          placeholder="example@domain.com"
                        />
                        <span className="customer-edit-v2-clean-divider" aria-hidden="true" />
                        <span className="customer-edit-v2-clean-icon" aria-hidden="true"><i className="fa-regular fa-envelope" /></span>
                      </div>
                      {editFormErrors.email ? <span className="customer-edit-v2-field__error"><i className="fa-solid fa-circle-exclamation" /> {editFormErrors.email}</span> : null}
                    </label>

                    <label className="customer-edit-v2-field customer-edit-v2-field--full">
                      <span className="customer-edit-v2-field__label">آدرس</span>
                      <div className="customer-edit-v2-field__control customer-edit-v2-field__control--textarea">
                        <textarea
                          id="editAddress"
                          name="address"
                          rows={3}
                          value={editingPartner.address || ''}
                          onChange={handleEditInputChange}
                          className={`customer-edit-v2-input--field customer-edit-v2-textarea ${editFormErrors.address ? 'is-error' : ''}`}
                          placeholder="آدرس یا موقعیت این همکار را وارد کنید"
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
                          value={editingPartner.notes || ''}
                          onChange={handleEditInputChange}
                          className={`customer-edit-v2-input--field customer-edit-v2-textarea ${editFormErrors.notes ? 'is-error' : ''}`}
                          placeholder="مثلاً شرایط همکاری، ساعات پاسخ‌گویی یا توضیحات مدیریتی"
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
                <span>اطلاعات همکاری با بالاترین سطح امنیت ذخیره می‌شود.</span>
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
                  ذخیره تغییرات همکار
                </Button>
              </div>
            </div>
          </form>
        </Modal>
      )}
      {tgQrOpen && (
        <TelegramLinkModal
          isOpen={tgQrOpen}
          onClose={() => setTgQrOpen(false)}
          title="QR لینک شدن تلگرام همکار"
          entityLabel="همکار"
          loading={tgQrLoading}
          deepLink={tgQrDeepLink}
          botUsernameMissing={tgBotUsernameMissing}
          onRefresh={openPartnerQrLinkModal}
          onCopy={async () => {
            try {
              await navigator.clipboard.writeText(tgQrDeepLink);
              setNotification({ type: 'success', text: 'لینک ربات کپی شد.' });
            } catch {
              setNotification({ type: 'error', text: 'کپی لینک عملیات ناموفق بود.' });
            }
          }}
        />
      )}
      {/* Ledger Modal (new payment) */}
      {isLedgerModalOpen && (
        <Modal title={`${ledgerDirection === 'receipt' ? 'ثبت دریافت از همکار' : 'ثبت پرداخت به همکار'} ${profile.partnerName}`} onClose={() => setIsLedgerModalOpen(false)} widthClass="max-w-5xl" iconClass="fa-solid fa-money-bill-transfer" variant="operational">
          <form onSubmit={handleLedgerSubmit} className="partner-payment-modal partner-payment-modal--v2 partner-payment-modal--safe-left partner-payment-modal--final partner-payment-modal--horizontal-no-scroll people-finance-modal premium-modal-stack p-1">
            <div className="partner-payment-modal__top">
              <section className="people-finance-modal__summary partner-payment-modal__balance-hero partner-payment-modal__account-card">
                <div className="min-w-0">
                  <div className="people-finance-modal__eyebrow">دفتر حساب همکار</div>
                  <div className="people-finance-modal__title">{profile.partnerName}</div>
                </div>
                <div className="people-finance-modal__balance partner-balance-card partner-balance-card--current">
                  <span className="people-finance-modal__balance-icon" aria-hidden="true"><i className="fa-solid fa-wallet" /></span>
                  <div className="people-finance-modal__balance-copy">
                    <span>مانده فعلی</span>
                    <strong>{Math.abs(Number(profile.currentBalance || 0)).toLocaleString('fa-IR')} تومان</strong>
                    <small>{getBalanceLabel(getBalanceState(profile.currentBalance, { overdue: Math.abs(Number(profile.currentBalance || 0)) >= 50000000 }), 'partner')}</small>
                  </div>
                </div>
                {(() => {
                  const current = Math.abs(Number(profile.currentBalance || 0));
                  const amount = Number(String(newLedgerEntry.debit || '').replace(/[^\d.-]/g, '')) || 0;
                  const nextBalance = ledgerDirection === 'payment' ? Math.max(0, current - amount) : current + amount;
                  const previewTone = nextBalance <= 0 ? 'settled' : nextBalance >= 50000000 ? 'danger' : nextBalance >= 10000000 ? 'warning' : 'ok';
                  return (
                    <div className={`partner-payment-modal__preview-balance partner-balance-card partner-balance-card--preview partner-payment-modal__preview-balance--${previewTone}`}>
                      <span><i className="fa-solid fa-calculator" /> مانده بعد از ثبت</span>
                      <strong>{nextBalance.toLocaleString('fa-IR')} تومان</strong>
                    </div>
                  );
                })()}
              </section>

              <section className="partner-payment-modal__type-panel">
                <div className="partner-payment-modal__type-panel-head">
                  <span><i className="fa-solid fa-shuffle" /></span>
                  <div>
                    <div className="people-finance-modal__eyebrow">نوع تراکنش</div>
                    <strong>پرداخت یا دریافت را مشخص کن</strong>
                  </div>
                </div>
                <div className="people-ledger-type-grid people-ledger-type-grid--priority partner-payment-modal__type-grid" role="radiogroup" aria-label="نوع تراکنش همکار">
                  {[
                    { key: 'payment', title: 'پرداخت به همکار', sub: 'کاهش بدهی فروشگاه به همکار', icon: 'fa-arrow-up' },
                    { key: 'receipt', title: 'دریافت از همکار', sub: 'برگشت وجه یا اصلاح حساب', icon: 'fa-arrow-down' },
                  ].map((item) => {
                    const active = ledgerDirection === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setLedgerDirection(item.key as any)}
                        className={["people-ledger-type-card", active ? 'is-active' : ''].join(' ')}
                        aria-pressed={active}
                      >
                        <span className="people-ledger-type-card__icon"><i className={`fa-solid ${item.icon}`} /></span>
                        <span className="people-ledger-type-card__copy"><strong>{item.title}</strong><small>{item.sub}</small></span>
                        <span className="people-ledger-type-card__check"><i className="fa-solid fa-check" /></span>
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>

            <div className="partner-payment-modal__entry">
              <FormErrorSummary errors={ledgerFormErrors as any} labels={{ amount: ledgerDirection === 'receipt' ? 'مبلغ دریافتی' : 'مبلغ پرداختی', transactionDate: 'تاریخ ثبت مالی', description: 'شرح تراکنش' }} fieldIdMap={{ amount: 'ledgerAmount', transactionDate: 'ledgerTransactionDate', description: 'ledgerDescription' }} className="people-form-error-summary partner-payment-modal__errors" />

              <section className="partner-payment-modal__entry-right">
                <ModalField label="تاریخ ثبت مالی" iconClass="fa-solid fa-calendar-day" required error={ledgerFormErrors.transactionDate} className="people-finance-field people-finance-field--date">
                  <ShamsiDatePicker id="ledgerTransactionDate" selectedDate={ledgerDateSelected} onDateChange={setLedgerDateSelected} inputClassName={inputClass(!!ledgerFormErrors.transactionDate)} />
                </ModalField>

                <ModalField label={ledgerDirection === 'receipt' ? 'مبلغ دریافتی' : 'مبلغ پرداختی'} iconClass="fa-solid fa-coins" required error={ledgerFormErrors.amount}>
                  <PriceInput id="ledgerAmount" name="amount" value={String(newLedgerEntry.debit || '')} onChange={handleLedgerInputChange} className={inputClass(!!ledgerFormErrors.amount)} preview="مثال: ۵۰۰۰۰۰۰" topLabel="" suffix="" />
                  <div className="people-amount-chip-row">
                    {[
                      { label: '۱ میلیون', value: 1000000 },
                      { label: '۵ میلیون', value: 5000000 },
                      { label: '۱۰ میلیون', value: 10000000 },
                      { label: 'کل مانده', value: Math.max(0, Math.abs(Number(profile.currentBalance || 0))) },
                    ].filter((chip, index, arr) => chip.value > 0 && arr.findIndex((x) => x.value === chip.value) === index).map((chip) => (
                      <button key={chip.label} type="button" className="people-amount-chip" onClick={() => handleLedgerInputChange({ target: { name: 'amount', value: String(chip.value) } })}>{chip.label}</button>
                    ))}
                  </div>
                </ModalField>
              </section>

              <section className="partner-payment-modal__entry-left">
                <ModalField label="شرح تراکنش" iconClass="fa-solid fa-note-sticky" required error={ledgerFormErrors.description}>
                  <textarea id="ledgerDescription" name="description" value={newLedgerEntry.description} onChange={handleLedgerInputChange} rows={4} className={inputClass(!!ledgerFormErrors.description, true)} required placeholder="مثلاً: پرداخت کارت‌به‌کارت بابت تسویه گوشی / دریافت بابت اصلاح حساب" />
                  <div key={`partner-note-templates-${ledgerDirection}`} className="people-note-template-row">
                    {[
                      { id: ledgerDirection === 'payment' ? 'card' : 'adjust', value: ledgerDirection === 'payment' ? 'پرداخت کارت‌به‌کارت بابت تسویه' : 'دریافت بابت اصلاح حساب' },
                      { id: 'cash', value: 'پرداخت نقدی' },
                      { id: 'bank', value: 'حواله بانکی' },
                      { id: 'tracking', value: 'شماره پیگیری: ' },
                    ].map((note) => {
                      const isActive = String(newLedgerEntry.description || '').trim() === note.value.trim();
                      return (
                        <button
                          key={`${ledgerDirection}-${note.id}`}
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
                  submitText={ledgerDirection === 'receipt' ? 'ثبت دریافت از همکار' : 'ثبت پرداخت به همکار'}
                  submittingText="در حال ثبت..."
                  isSubmitting={isSubmittingLedger}
                  submitDisabled={!token}
                />
              </section>
            </div>
          </form>
        </Modal>
      )}

      {/* Full partner phone settlement desk */}
      {isFullPhoneSettlementModalOpen && (
        <Modal title="نمای تسویه کامل همکار" onClose={() => setIsFullPhoneSettlementModalOpen(false)} widthClass="max-w-6xl" iconClass="fa-solid fa-layer-group" variant="expansive">
          <div className="partner-settlement-desk space-y-4 p-1" dir="rtl">
            <div className="rounded-[26px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/55">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-black text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                    <i className="fa-solid fa-mobile-screen-button text-slate-400" /> فقط گوشی‌های سرمایه باز
                  </div>
                  <h3 className="mt-2 text-lg font-black text-slate-950 dark:text-slate-50">تسویه سریع و گروهی گوشی‌های فروخته‌شده</h3>
                  <p className="mt-1 max-w-3xl text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">
                    این نما فقط آیتم‌های باز را نشان می‌دهد. پرداخت کامل، پرداخت بخشی و تسویه گروهی همگی به گوشی مشخص وصل می‌شوند و هم‌زمان از مانده کل همکار کم می‌کنند.
                  </p>
                </div>
                <div className="grid w-full grid-cols-2 gap-2 lg:w-[480px] lg:grid-cols-4">
                  {[
                    { label: 'گوشی باز', value: `${openSoldPhoneSettlementRows.length.toLocaleString('fa-IR')}` },
                    { label: 'مانده کل باز', value: `${fullSettlementOpenBalanceTotal.toLocaleString('fa-IR')}` },
                    { label: 'مبنای سرمایه', value: `${fullSettlementOpenBasisTotal.toLocaleString('fa-IR')}` },
                    { label: 'سرمایه بازگشتی', value: `${fullSettlementOpenPaidTotal.toLocaleString('fa-IR')}` },
                  ].map((metric) => (
                    <div key={metric.label} className="rounded-2xl bg-white px-3 py-2 shadow-sm dark:bg-slate-950/75">
                      <div className="text-[10px] font-black text-slate-400">{metric.label}</div>
                      <div className="mt-1 truncate text-[11px] font-black text-slate-950 dark:text-slate-50">{metric.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-black text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                    <i className="fa-solid fa-check-double" /> تسویه گروهی
                  </div>
                  <p className="mt-2 max-w-2xl text-[11px] font-semibold leading-6 text-slate-500 dark:text-slate-400">
                    چند گوشی را انتخاب کن، مبلغ کلی را وارد کن، سپس سیستم مبلغ را طبق اولویت انتخاب‌شده بین ردیف‌ها پخش می‌کند.
                  </p>
                </div>
                <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:min-w-[360px] sm:grid-cols-4">
                  {[
                    { label: 'انتخاب‌شده', value: `${selectedBulkSettlementRows.length.toLocaleString('fa-IR')} گوشی` },
                    { label: 'مانده انتخاب', value: `${selectedBulkSettlementBalanceTotal.toLocaleString('fa-IR')}` },
                    { label: 'مبلغ قابل ثبت', value: `${bulkSettlementAppliedTotal.toLocaleString('fa-IR')}` },
                    { label: 'مازاد', value: `${bulkSettlementUnallocatedAmount.toLocaleString('fa-IR')}` },
                  ].map((metric) => (
                    <div key={metric.label} className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-900/75">
                      <div className="text-[10px] font-black text-slate-400">{metric.label}</div>
                      <div className="mt-1 truncate text-[11px] font-black text-slate-950 dark:text-slate-50">{metric.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_220px_auto_auto]">
                  <div className="mb-1 flex flex-wrap items-center gap-2 justify-end rounded-2xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 sm:col-span-4">
                  <i className="fa-solid fa-link" />
                  شناسه دسته این عملیات:
                  <span className="font-mono text-slate-900 dark:text-slate-50" dir="ltr">{bulkSettlementBatchId}</span>
                </div>
                {lastSubmittedBulkSettlementBatchId && (
                  <div className="mb-1 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] font-black text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200 sm:col-span-4">
                    آخرین دسته ثبت‌شده: <button type="button" className="font-mono underline" dir="ltr" onClick={() => setActiveLedgerBatchId(lastSubmittedBulkSettlementBatchId)}>{lastSubmittedBulkSettlementBatchId}</button>
                  </div>
                )}
                <label className="sr-only" htmlFor="bulkSettlementPriority">اولویت پخش مبلغ</label>
                  <select
                    id="bulkSettlementPriority"
                    name="bulkSettlementPriority"
                    value={bulkSettlementPriority}
                    onChange={(e) => setBulkSettlementPriority(e.target.value as 'highest_balance' | 'oldest_sale' | 'lowest_balance')}
                    disabled={isSubmittingBulkSettlement}
                    className="h-[34px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-xs font-black text-slate-700 outline-none transition     disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100   "
                  >
                    <option value="highest_balance">اولویت: بیشترین مانده</option>
                    <option value="oldest_sale">اولویت: قدیمی‌ترین فروش</option>
                    <option value="lowest_balance">اولویت: کمترین مانده</option>
                  </select>
                  <PriceInput
                    id="bulkSettlementAmount"
                    name="bulkSettlementAmount"
                    value={bulkSettlementAmount}
                    onChange={(e: any) => handleBulkSettlementAmountChange(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] font-bold text-slate-800 outline-none transition     dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100   "
                    preview="مبلغ کلی برای پخش بین گوشی‌ها"
                  />
                  <button
                    type="button"
                    onClick={() => setBulkSettlementAmount(String(selectedBulkSettlementBalanceTotal))}
                    disabled={selectedBulkSettlementBalanceTotal <= 0 || isSubmittingBulkSettlement}
                    className="inline-flex h-[34px] items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-[11px] font-black text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    کل مانده انتخاب
                  </button>
                  <Button
                    type="button"
                    onClick={handleBulkSettlementSubmit}
                    disabled={isSubmittingBulkSettlement || selectedBulkSettlementRows.length === 0 || bulkSettlementAmountValue <= 0}
                    variant="primary"
                    size="sm"
                    className="!h-[34px] !rounded-2xl !px-4 !text-[11px] disabled:opacity-60"
                    leftIcon={<i className="fa-solid fa-check-double" />}
                  >
                    {isSubmittingBulkSettlement ? 'در حال ثبت…' : 'ثبت تسویه گروهی'}
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-2 justify-end">
                  <button type="button" onClick={handleBulkSettlementSelectAll} disabled={isSubmittingBulkSettlement} className="inline-flex h-[32px] items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-[11px] font-black text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
                    انتخاب همه
                  </button>
                  <button type="button" onClick={handleBulkSettlementClear} disabled={isSubmittingBulkSettlement} className="inline-flex h-[32px] items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-[11px] font-black text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
                    پاک‌کردن انتخاب
                  </button>
                </div>
              </div>

              <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/55">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <label htmlFor="bulkSettlementNote" className="text-[11px] font-black text-slate-600 dark:text-slate-200">توضیح مشترک تسویه گروهی</label>
                    <p className="mt-1 text-[10px] font-bold leading-5 text-slate-400 dark:text-slate-500">این متن روی همه پرداخت‌های پخش‌شده ثبت می‌شود؛ می‌توانی از متن‌های آماده استفاده کنی و بعد ویرایشش کنی.</p>
                  </div>
                  {bulkSettlementNote.trim() && (
                    <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-3 py-1 text-[10px] font-black text-slate-500 shadow-sm dark:bg-slate-950/80 dark:text-slate-300">
                      <i className="fa-solid fa-note-sticky" />
                      توضیح روی همه ردیف‌ها ثبت می‌شود
                    </span>
                  )}
                </div>
                <div className="mt-3 rounded-2xl border border-slate-200/70 bg-white p-2.5 dark:border-slate-700/70 dark:bg-slate-950/70">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-2 text-[10px] font-black text-slate-500 dark:text-slate-300">
                      <i className="fa-solid fa-wand-magic-sparkles" /> متن آماده برای ثبت سریع
                    </span>
                    {bulkSettlementNote.trim() && (
                      <button
                        type="button"
                        onClick={() => setBulkSettlementNote('')}
                        disabled={isSubmittingBulkSettlement}
                        className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-black text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                      >
                        <i className="fa-solid fa-xmark" /> پاک‌کردن توضیح
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {bulkSettlementNoteTemplates.map((template) => {
                      const isActive = bulkSettlementNote.includes(template.text.trim());
                      return (
                        <button
                          key={template.label}
                          type="button"
                          onClick={() => applyBulkSettlementNoteTemplate(template.text)}
                          disabled={isSubmittingBulkSettlement}
                          className={`inline-flex h-[30px] items-center gap-2 rounded-full border px-3 text-[10px] font-black transition disabled:opacity-50 ${isActive ? 'border-slate-900 bg-slate-900 text-white shadow-sm dark:border-slate-100 dark:bg-slate-100 dark:text-slate-950' : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'}`}
                        >
                          <i className={`fa-solid ${template.icon}`} />
                          {template.label}
                        </button>
                      );
                    })}
                    {lastBulkSettlementNote.trim() && (
                      <button
                        type="button"
                        onClick={() => applyBulkSettlementNoteTemplate(lastBulkSettlementNote)}
                        disabled={isSubmittingBulkSettlement}
                        title={lastBulkSettlementNote}
                        className={`inline-flex h-[30px] max-w-full items-center gap-2 rounded-full border px-3 text-[10px] font-black transition disabled:opacity-50 ${bulkSettlementNote.includes(lastBulkSettlementNote.trim()) ? 'border-slate-900 bg-slate-900 text-white shadow-sm dark:border-slate-100 dark:bg-slate-100 dark:text-slate-950' : 'border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-300 hover:bg-white dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200 dark:hover:bg-blue-950/70'}`}
                      >
                        <i className="fa-solid fa-clock-rotate-left" />
                        <span className="shrink-0">آخرین توضیح</span>
                        <span className="max-w-[220px] truncate text-right font-bold opacity-80">{lastBulkSettlementNote}</span>
                      </button>
                    )}
                  </div>
                  {lastBulkSettlementNote.trim() && (
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-2 text-[10px] font-bold text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200">
                      <span className="inline-flex items-center gap-2">
                        <i className="fa-solid fa-circle-info" />
                        آخرین توضیح استفاده‌شده در همین مرورگر ذخیره شده و با یک کلیک قابل استفاده است.
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setLastBulkSettlementNote('');
                          try { window.localStorage.removeItem(BULK_SETTLEMENT_LAST_NOTE_KEY); } catch {}
                        }}
                        disabled={isSubmittingBulkSettlement}
                        className="rounded-full px-2 py-1 font-black text-blue-500 transition hover:bg-white hover:text-blue-800 disabled:opacity-50 dark:hover:bg-blue-950"
                      >
                        حذف پیشنهاد
                      </button>
                    </div>
                  )}
                  <p className="mt-2 text-[10px] font-bold leading-5 text-slate-400 dark:text-slate-500">چیپ‌ها فقط متن را سریع پر می‌کنند؛ متن نهایی قبل از ثبت کاملاً قابل ویرایش است.</p>
                </div>
                <textarea
                  id="bulkSettlementNote"
                  name="bulkSettlementNote"
                  value={bulkSettlementNote}
                  onChange={(e) => setBulkSettlementNote(e.target.value)}
                  disabled={isSubmittingBulkSettlement}
                  rows={2}
                  maxLength={280}
                  placeholder="مثلاً: واریز کارت‌به‌کارت بابت تسویه بخشی گوشی‌های فروخته‌شده / شماره پیگیری ..."
                  className="mt-3 w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold leading-6 text-slate-800 outline-none transition placeholder:text-slate-300    disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-100 dark:placeholder:text-slate-600  "
                />
                <div className="mt-2 flex items-center justify-between gap-3 text-[10px] font-bold text-slate-400">
                  <span>اختیاری است، اما برای پیگیری پرداخت‌های گروهی خیلی مفید است.</span>
                  <span>{bulkSettlementNote.length.toLocaleString('fa-IR')} / ۲۸۰</span>
                </div>
              </div>

              {bulkSettlementDistribution.length > 0 && (
                <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/55">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[10px] font-black text-slate-400">
                    <span>پیش‌نمایش پخش مبلغ بر اساس {bulkSettlementPriority === 'oldest_sale' ? 'قدیمی‌ترین فروش' : bulkSettlementPriority === 'lowest_balance' ? 'کمترین مانده' : 'بیشترین مانده'}</span>
                    <span>{bulkSettlementDistribution.length.toLocaleString('fa-IR')} ردیف</span>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    {bulkSettlementDistribution.slice(0, 6).map((entry: any) => (
                      <div key={`bulk-preview-${entry.item.id}`} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 text-[11px] font-bold shadow-sm dark:bg-slate-950/80">
                        <span className="min-w-0 truncate text-slate-600 dark:text-slate-300">{entry.item.name || 'گوشی فروخته‌شده'}</span>
                        <span className="shrink-0 text-slate-950 dark:text-slate-50">{formatCurrencyText(Number(entry.amount || 0), readStoredCurrencyUnit())}</span>
                      </div>
                    ))}
                  </div>
                  {bulkSettlementDistribution.length > 6 && (
                    <p className="mt-2 text-[10px] font-bold text-slate-400">و {(bulkSettlementDistribution.length - 6).toLocaleString('fa-IR')} گوشی دیگر در همین ثبت گروهی پوشش داده می‌شود.</p>
                  )}
                </div>
              )}
            </div>

            <div className="max-h-[52vh] space-y-2 overflow-y-auto pr-1">
              {openSoldPhoneSettlementRows.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-[13px] font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-900/55 dark:text-slate-400">
                  هیچ گوشی سرمایه باز‌ای برای این همکار وجود ندارد.
                </div>
              ) : openSoldPhoneSettlementRows.map((item: any) => {
                const phoneId = Number(item.id);
                const balance = Number(item.phoneSettlementBalance || 0);
                const isSelected = bulkSettlementIdSet.has(phoneId);
                const isSubmittingRow = isSubmittingFullSettlementPhoneId === phoneId;
                return (
                  <div key={`full-settlement-${phoneId}`} className="rounded-[24px] border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/75">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex min-w-0 items-start gap-3">
                        <button
                          type="button"
                          onClick={() => setBulkSettlementPhoneIds(prev => prev.includes(phoneId) ? prev.filter((id) => id !== phoneId) : [...prev, phoneId])}
                          disabled={isSubmittingBulkSettlement || isSubmittingRow}
                          className={`mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border text-[12px] transition disabled:opacity-50 ${isSelected ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-950' : 'border-slate-200 bg-slate-50 text-slate-400 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:hover:text-slate-100'}`}
                          title="انتخاب برای تسویه گروهی"
                        >
                          <i className={isSelected ? 'fa-solid fa-check' : 'fa-solid fa-plus'} />
                        </button>
                        <div className="min-w-0">
                          <div className="text-sm font-black text-slate-950 dark:text-slate-50">{item.name || 'گوشی فروخته‌شده'}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 justify-end text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                            <span className="font-mono" dir="ltr">{item.identifier || 'IMEI ثبت نشده'}</span>
                            <span>•</span>
                            <span>{item.soldAt ? formatIsoToShamsi(item.soldAt) : 'بدون تاریخ فروش'}</span>
                            <span>•</span>
                            <span>{item.settlementPriceSourceLabel || 'قیمت خرید روز'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] font-black sm:grid-cols-4 lg:min-w-[520px]">
                        <div className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-900">
                          <div className="text-[10px] text-slate-400">مبنای سرمایه</div>
                          <div className="mt-1 text-slate-950 dark:text-slate-50">{Number(item.settlementPurchasePrice || 0).toLocaleString('fa-IR')}</div>
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-900">
                          <div className="text-[10px] text-slate-400">سرمایه بازگشتی</div>
                          <div className="mt-1 text-emerald-700 dark:text-emerald-300">{Number(item.phoneSettlementPaidAmount || 0).toLocaleString('fa-IR')}</div>
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-900">
                          <div className="text-[10px] text-slate-400">مانده</div>
                          <div className="mt-1 text-rose-700 dark:text-rose-300">{balance.toLocaleString('fa-IR')}</div>
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-900">
                          <div className="text-[10px] text-slate-400">تعداد پرداخت</div>
                          <div className="mt-1 text-slate-950 dark:text-slate-50">{Number(item.phoneSettlementPaymentCount || 0).toLocaleString('fa-IR')}</div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_auto_auto]">
                      <PriceInput
                        id={`fullSettlementAmount-${phoneId}`}
                        name={`fullSettlementAmount-${phoneId}`}
                        value={fullSettlementAmounts[phoneId] || ''}
                        onChange={(e: any) => setFullSettlementAmounts(prev => ({ ...prev, [phoneId]: String(num(e.target.value) || '') }))}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 outline-none transition     dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100   "
                        preview="پرداخت بخشی همین گوشی"
                      />
                      <Button
                        type="button"
                        onClick={() => handleFullSettlementPhoneSubmit(item, balance)}
                        disabled={isSubmittingRow || isSubmittingBulkSettlement || balance <= 0}
                        variant="primary"
                        size="sm"
                        className="!min-h-[40px] !rounded-2xl !px-4 !text-[11px] disabled:opacity-60"
                        leftIcon={<i className="fa-solid fa-circle-check" />}
                      >
                        {isSubmittingRow ? 'در حال ثبت…' : 'تسویه کامل'}
                      </Button>
                      <Button
                        type="button"
                        onClick={() => handleFullSettlementPhoneSubmit(item)}
                        disabled={isSubmittingRow || isSubmittingBulkSettlement || num(fullSettlementAmounts[phoneId]) <= 0}
                        variant="secondary"
                        size="sm"
                        className="!min-h-[40px] !rounded-2xl !px-4 !text-[11px] disabled:opacity-60"
                        leftIcon={<i className="fa-solid fa-money-bill-transfer" />}
                      >
                        ثبت مبلغ بخشی
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Modal>
      )}

      {/* Product-based phone settlement modal */}
      {phoneSettlementItem && (() => {
        const settlementBasis = Number(phoneSettlementItem.settlementPurchasePrice || phoneSettlementItem.soldDailyPurchasePrice || phoneSettlementItem.purchasePrice || 0);
        const settlementPaid = Number(phoneSettlementItem.phoneSettlementPaidAmount || 0);
        const settlementRemaining = Math.max(0, settlementBasis - settlementPaid);
        const settlementProgress = settlementBasis > 0 ? Math.min(100, Math.max(0, Math.round((settlementPaid / settlementBasis) * 100))) : 0;
        const quickAmounts = [
          { label: 'کل مانده', value: settlementRemaining, icon: 'fa-circle-check' },
          { label: 'نصف مانده', value: Math.floor(settlementRemaining / 2), icon: 'fa-percent' },
          { label: '۵ میلیون', value: Math.min(5000000, settlementRemaining), icon: 'fa-coins' },
          { label: '۱۰ میلیون', value: Math.min(10000000, settlementRemaining), icon: 'fa-sack-dollar' },
        ].filter((chip, index, arr) => chip.value > 0 && arr.findIndex((x) => x.value === chip.value) === index);

        return (
          <Modal title="ثبت پرداخت مرتبط با گوشی" onClose={() => setPhoneSettlementItem(null)} widthClass="max-w-4xl" iconClass="fa-solid fa-mobile-screen-button" variant="operational">
            <form onSubmit={handlePhoneSettlementSubmit} className="people-finance-modal people-finance-modal--horizontal phone-settlement-finance-modal premium-modal-stack p-1">
              <div className="people-finance-modal__side">
                <div className="people-finance-modal__summary phone-settlement-finance-modal__summary">
                <div>
                  <div className="people-finance-modal__eyebrow">پرداخت متصل به همین گوشی</div>
                  <div className="people-finance-modal__title">{phoneSettlementItem.name || 'گوشی فروخته‌شده'}</div>
                  <div className="people-finance-modal__hint">
                    این پرداخت فقط برای پرداخت‌های مستقیم و مرتبط با همین گوشی استفاده می‌شود؛ فروش‌های اقساطی از پرونده اقساط خوانده می‌شوند.
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 justify-end">
                    {phoneSettlementItem.identifier ? (
                      <span className="phone-settlement-chip" dir="ltr"><i className="fa-solid fa-barcode" /> IMEI: {phoneSettlementItem.identifier}</span>
                    ) : null}
                    <span className="phone-settlement-chip"><i className="fa-solid fa-tag" /> {phoneSettlementItem.settlementPriceSourceLabel || 'قیمت خرید روز'}</span>
                  </div>
                </div>
                <div className="people-finance-modal__balance phone-settlement-finance-modal__balance">
                  <span>مانده سرمایه همین گوشی</span>
                  <strong>{formatCurrencyText(settlementRemaining, readStoredCurrencyUnit())}</strong>
                  <small>{settlementRemaining > 0 ? 'قابل پرداخت به همکار' : 'این گوشی تسویه شده است'}</small>
                </div>
                </div>

                <div className="phone-settlement-metrics-grid">
                <div className="phone-settlement-metric-card">
                  <span>مبنای سرمایه</span>
                  <strong>{formatCurrencyText(settlementBasis, readStoredCurrencyUnit())}</strong>
                </div>
                <div className="phone-settlement-metric-card">
                  <span>سرمایه بازگشتی</span>
                  <strong>{formatCurrencyText(settlementPaid, readStoredCurrencyUnit())}</strong>
                </div>
                <div className="phone-settlement-metric-card">
                  <span>پیشرفت تسویه</span>
                  <strong>{settlementProgress.toLocaleString('fa-IR')}٪</strong>
                </div>
              </div>

                <FinancialProgressBar
                  className="phone-settlement-progress"
                  value={settlementProgress}
                  showPercent={false}
                  tone={settlementProgress >= 100 ? 'emerald' : settlementProgress > 0 ? 'amber' : 'slate'}
                  ariaLabel={`پیشرفت تسویه ${settlementProgress} درصد`}
                />
              </div>

              <div className="people-finance-modal__main">
                <FormErrorSummary errors={phoneSettlementErrors as any} labels={{ amount: 'مبلغ پرداخت روی همین گوشی', transactionDate: 'تاریخ پرداخت', note: 'شرح پرداخت' }} fieldIdMap={{ amount: 'phoneSettlementAmount', transactionDate: 'phoneSettlementDate', note: 'phoneSettlementNote' }} className="people-form-error-summary" />

              <div className="people-finance-modal__grid">
                <ModalField label="مبلغ پرداخت روی همین گوشی" iconClass="fa-solid fa-coins" required error={phoneSettlementErrors.amount}>
                  <PriceInput id="phoneSettlementAmount" name="amount" value={String(phoneSettlementAmount || '')} onChange={handlePhoneSettlementAmountChange} className={inputClass(!!phoneSettlementErrors.amount)} preview="مثال: ۵۰۰۰۰۰۰" />
                  {quickAmounts.length ? (
                    <div className="people-amount-chip-row">
                      {quickAmounts.map((chip) => (
                        <button
                          key={chip.label}
                          type="button"
                          onClick={() => { setPhoneSettlementAmount(chip.value); if (phoneSettlementErrors.amount) setPhoneSettlementErrors(prev => ({ ...prev, amount: undefined })); }}
                          className="people-amount-chip"
                        >
                          <i className={`fa-solid ${chip.icon}`} />
                          {chip.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </ModalField>

                <ModalField label="تاریخ پرداخت" iconClass="fa-solid fa-calendar-day" required error={phoneSettlementErrors.transactionDate}>
                  <ShamsiDatePicker id="phoneSettlementDate" selectedDate={phoneSettlementDateSelected} onDateChange={setPhoneSettlementDateSelected} inputClassName={inputClass(!!phoneSettlementErrors.transactionDate)} />
                </ModalField>
              </div>

              <ModalField label="شرح پرداخت" iconClass="fa-solid fa-note-sticky" required error={phoneSettlementErrors.note}>
                <textarea
                  id="phoneSettlementNote"
                  value={phoneSettlementNote}
                  onChange={(e) => { setPhoneSettlementNote(e.target.value); if (phoneSettlementErrors.note) setPhoneSettlementErrors(prev => ({ ...prev, note: undefined })); }}
                  rows={3}
                  className={inputClass(!!phoneSettlementErrors.note, true)}
                  placeholder="مثلاً: کارت‌به‌کارت بابت تسویه همین گوشی / شماره پیگیری ..."
                />
                <div className="people-note-template-row">
                  {phoneSettlementNoteTemplates.map((template) => (
                    <button
                      key={template.label}
                      type="button"
                      onClick={() => { setPhoneSettlementNote(template.text); if (phoneSettlementErrors.note) setPhoneSettlementErrors(prev => ({ ...prev, note: undefined })); }}
                      className="people-note-template"
                    >
                      <i className={`fa-solid ${template.icon}`} />
                      {template.label}
                    </button>
                  ))}
                  {phoneSettlementNote ? (
                    <button
                      type="button"
                      onClick={() => setPhoneSettlementNote('')}
                      className="people-note-template"
                    >
                      <i className="fa-solid fa-eraser" />
                      پاک‌کردن توضیح
                    </button>
                  ) : null}
                </div>
              </ModalField>

                <ModalActions
                  onCancel={() => setPhoneSettlementItem(null)}
                  submitText="ثبت پرداخت همین گوشی"
                  submittingText="در حال ثبت پرداخت..."
                  isSubmitting={isSubmittingPhoneSettlement}
                  submitDisabled={!token || settlementRemaining <= 0}
                />
              </div>
            </form>
          </Modal>
        );
      })()}


      {/* Edit single ledger entry */}
      {editingEntry && (
        <Modal
          title="ویرایش رکورد دفتر همکار"
          onClose={() => setEditingEntry(null)}
          widthClass="max-w-[760px]"
          wrapperClassName="partner-ledger-edit-modal-v141 customer-profile-edit-overlay"
          iconClass="fa-solid fa-pen-to-square"
          variant="operational"
        >
          <div className="partner-ledger-edit-v141" dir="rtl">
            <div className="partner-ledger-edit-v141__content">
              <aside className="partner-ledger-edit-v141__summary">
                <div className="partner-ledger-edit-v141__summary-icon">
                  <i className="fa-solid fa-clipboard-list" />
                </div>
                <div className="partner-ledger-edit-v141__summary-kicker">رکورد دفتر همکار</div>
                <div className="partner-ledger-edit-v141__summary-title">رکورد #{Number(editingEntry.id || 0).toLocaleString('fa-IR')}</div>
                <p className="partner-ledger-edit-v141__summary-text">
                  شرح رکورد و مبالغ دریافتی و پرداختی این سند را از همین بخش ویرایش کنید.
                </p>
                <div className="partner-ledger-edit-v141__notice">
                  <i className="fa-solid fa-circle-info" />
                  فقط اطلاعات همین رکورد به‌روزرسانی می‌شود
                </div>
              </aside>

              <section className="partner-ledger-edit-v141__form">
                <label className="partner-ledger-edit-v141__field partner-ledger-edit-v141__field--full">
                  <span className="partner-ledger-edit-v141__label">شرح رکورد</span>
                  <div className="partner-ledger-edit-v147__description-shell" style={{ borderColor: "rgb(203 213 225)", boxShadow: "none", outline: "none" }}>
                    <span className="partner-ledger-edit-v147__description-icon"><i className="fa-solid fa-receipt" /></span>
                    <input
                      className="partner-ledger-edit-v147__description-input"
                      dir="rtl"
                      style={{ outline: "none", boxShadow: "none", border: "0" }}
                      value={editingEntry.description || ''}
                      onChange={(e) => setEditingEntry({ ...editingEntry, description: e.target.value })}
                      placeholder="مثلاً: دریافت گوشی Galaxy A17 / اصلاح مبلغ ثبت‌شده"
                    />
                  </div>
                </label>

                <div className="partner-ledger-edit-v141__money-grid">
                  <label className="partner-ledger-edit-v141__field">
                    <span className="partner-ledger-edit-v141__label">مبلغ دریافتی از همکار</span>
                    <div className="partner-ledger-edit-v141__price-shell">
                      <PriceInput
                        id="editPartnerLedgerCredit"
                        name="credit"
                        value={String(editingEntry.credit || '')}
                        onChange={(e) => setEditingEntry({ ...editingEntry, credit: Number((e.target as HTMLInputElement).value.replace(/[^\d.-]/g, '')) || 0 })}
                        className="partner-ledger-edit-v141__price-input"
                        preview="مبلغ دریافت"
                        topLabel=""
                        suffix="تومان"
                      />
                      <span className="partner-ledger-edit-v141__price-icon is-credit"><i className="fa-solid fa-arrow-down" /></span>
                    </div>
                  </label>

                  <label className="partner-ledger-edit-v141__field">
                    <span className="partner-ledger-edit-v141__label">مبلغ پرداختی به همکار</span>
                    <div className="partner-ledger-edit-v141__price-shell">
                      <PriceInput
                        id="editPartnerLedgerDebit"
                        name="debit"
                        value={String(editingEntry.debit || '')}
                        onChange={(e) => setEditingEntry({ ...editingEntry, debit: Number((e.target as HTMLInputElement).value.replace(/[^\d.-]/g, '')) || 0 })}
                        className="partner-ledger-edit-v141__price-input"
                        preview="مبلغ پرداخت"
                        topLabel=""
                        suffix="تومان"
                      />
                      <span className="partner-ledger-edit-v141__price-icon is-debit"><i className="fa-solid fa-arrow-up" /></span>
                    </div>
                  </label>
                </div>

                <div className="partner-ledger-edit-v141__helper">
                  <i className="fa-solid fa-circle-info" />
                  مبالغ را به تومان وارد کنید. تغییر این مقادیر روی مانده حساب همکار اثر می‌گذارد.
                </div>
              </section>
            </div>

            <div className="partner-ledger-edit-v141__footer">
              <button type="button" onClick={() => setEditingEntry(null)} className="partner-ledger-edit-v141__cancel">
                <i className="fa-solid fa-xmark" />
                انصراف
              </button>
              <button type="button" onClick={handleLedgerEdit} disabled={!token} className="partner-ledger-edit-v141__submit">
                <i className="fa-solid fa-check" />
                ذخیره رکورد دفتر
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
    </>
  );
};

export default PartnerDetailPage;