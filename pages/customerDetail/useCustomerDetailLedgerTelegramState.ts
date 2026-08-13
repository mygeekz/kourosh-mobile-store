import { useMemo, useRef, useState } from 'react';
import { NewLedgerEntryData } from '../../types';

export function useCustomerDetailLedgerTelegramState() {
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
  const [ledgerDebouncedSearch, setLedgerDebouncedSearch] = useState('');
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerPageSize, setLedgerPageSize] = useState<'25' | '50' | '100'>('25');
  const [ledgerTotal, setLedgerTotal] = useState(0);
  const [ledgerTotalPages, setLedgerTotalPages] = useState(1);
  const [ledgerDirectorySummary, setLedgerDirectorySummary] = useState<{ total: number; totalDebit: number; totalCredit: number; currentBalance: number; latestTransaction: string | null } | null>(null);
  const [ledgerDirectoryLoading, setLedgerDirectoryLoading] = useState(false);
  const [ledgerDirectoryRefreshing, setLedgerDirectoryRefreshing] = useState(false);


  
  return { tgConvItems, setTgConvItems, tgConvMeta, setTgConvMeta, tgConvLoading, setTgConvLoading, tgConvError, setTgConvError, tgQuickReply, setTgQuickReply, tgQuickPreset, setTgQuickPreset, tgReplyTo, setTgReplyTo, tgAttachment, setTgAttachment, tgAutoRefresh, setTgAutoRefresh, tgNewSinceScroll, setTgNewSinceScroll, tgSearchQuery, setTgSearchQuery, tgDirectionFilter, setTgDirectionFilter, newLedgerEntry, setNewLedgerEntry, ledgerDateSelected, setLedgerDateSelected, ledgerFormErrors, setLedgerFormErrors, isSubmittingLedger, setIsSubmittingLedger, transactionType, setTransactionType, editingEntry, setEditingEntry, isDeletingEntry, setIsDeletingEntry, ledgerViewFilter, setLedgerViewFilter, expandedLedgerEntryId, setExpandedLedgerEntryId, ledgerSearch, setLedgerSearch, ledgerRange, setLedgerRange, ledgerDebouncedSearch, setLedgerDebouncedSearch, ledgerPage, setLedgerPage, ledgerPageSize, setLedgerPageSize, ledgerTotal, setLedgerTotal, ledgerTotalPages, setLedgerTotalPages, ledgerDirectorySummary, setLedgerDirectorySummary, ledgerDirectoryLoading, setLedgerDirectoryLoading, ledgerDirectoryRefreshing, setLedgerDirectoryRefreshing, tgTimelineRef, tgFilteredConvItems, initialLedgerEntry, jumpToFirstTgResult };
}
