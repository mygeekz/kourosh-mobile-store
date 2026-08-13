import React, { useEffect, useRef, useState } from 'react';
import { NewLedgerEntryData, NewPartnerData } from '../../types';
import {
  BULK_SETTLEMENT_LAST_NOTE_KEY,
  type QtyPrice,
  createBulkSettlementBatchId,
} from './partnerDetailControllerSupport';

export function usePartnerDetailControllerState() {
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
  const [ledgerDisplayMode, setLedgerDisplayMode] = useState<'table' | 'timeline'>('timeline');
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
  const [isSettlementManualConfirmationModalOpen, setIsSettlementManualConfirmationModalOpen] = useState(false);
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

  return { tgQrOpen, setTgQrOpen, tgQrLoading, setTgQrLoading, tgQrDeepLink, setTgQrDeepLink, tgBotUsernameMissing, setTgBotUsernameMissing, partnerTgConvItems, setPartnerTgConvItems, partnerTgConvLoading, setPartnerTgConvLoading, partnerTgConvError, setPartnerTgConvError, partnerTgQuickReply, setPartnerTgQuickReply, partnerTgPreset, setPartnerTgPreset, partnerTgAutoRefresh, setPartnerTgAutoRefresh, partnerTgNewSinceScroll, setPartnerTgNewSinceScroll, partnerTgSearchQuery, setPartnerTgSearchQuery, partnerTgDirectionFilter, setPartnerTgDirectionFilter, isEditModalOpen, setIsEditModalOpen, editingPartner, setEditingPartner, editFormErrors, setEditFormErrors, isSubmittingEdit, setIsSubmittingEdit, isLedgerModalOpen, setIsLedgerModalOpen, isMessageModalOpen, setIsMessageModalOpen, prefillMessageText, setPrefillMessageText, prefillChannels, setPrefillChannels, newLedgerEntry, setNewLedgerEntry, ledgerDateSelected, setLedgerDateSelected, ledgerDirection, setLedgerDirection, ledgerFormErrors, setLedgerFormErrors, isSubmittingLedger, setIsSubmittingLedger, phoneSettlementItem, setPhoneSettlementItem, phoneSettlementAmount, setPhoneSettlementAmount, phoneSettlementNote, setPhoneSettlementNote, phoneSettlementDateSelected, setPhoneSettlementDateSelected, phoneSettlementErrors, setPhoneSettlementErrors, isSubmittingPhoneSettlement, setIsSubmittingPhoneSettlement, editingEntry, setEditingEntry, isDeletingEntry, setIsDeletingEntry, ledgerViewFilter, setLedgerViewFilter, expandedLedgerEntryId, setExpandedLedgerEntryId, ledgerSearch, setLedgerSearch, ledgerRange, setLedgerRange, ledgerSystemFilter, setLedgerSystemFilter, ledgerDisplayMode, setLedgerDisplayMode, ledgerVisibleColumns, setLedgerVisibleColumns, isLedgerColumnPickerOpen, setIsLedgerColumnPickerOpen, activeLedgerBatchId, setActiveLedgerBatchId, soldPhoneSettlementFilter, setSoldPhoneSettlementFilter, soldPhoneCapitalSearch, setSoldPhoneCapitalSearch, soldPhoneCapitalSort, setSoldPhoneCapitalSort, expandedPhoneSettlementTimelineId, setExpandedPhoneSettlementTimelineId, isFullPhoneSettlementModalOpen, setIsFullPhoneSettlementModalOpen, isSettlementManualConfirmationModalOpen, setIsSettlementManualConfirmationModalOpen, fullSettlementAmounts, setFullSettlementAmounts, isSubmittingFullSettlementPhoneId, setIsSubmittingFullSettlementPhoneId, bulkSettlementPhoneIds, setBulkSettlementPhoneIds, bulkSettlementAmount, setBulkSettlementAmount, bulkSettlementNote, setBulkSettlementNote, bulkSettlementPriority, setBulkSettlementPriority, bulkSettlementBatchId, setBulkSettlementBatchId, lastSubmittedBulkSettlementBatchId, setLastSubmittedBulkSettlementBatchId, isSubmittingBulkSettlement, setIsSubmittingBulkSettlement, lastBulkSettlementNote, setLastBulkSettlementNote, ledgerMap, setLedgerMap, partnerTgTimelineRef, ledgerColumnPickerButtonRef, ledgerColumnPickerPanelRef, soldPhoneCapitalSearchRef, phoneSettlementNoteTemplates, bulkSettlementNoteTemplates, initialLedgerEntry, rememberBulkSettlementNote, applyBulkSettlementNoteTemplate };
}
