import type { MouseEventHandler, ReactNode } from 'react';
import type {
  CustomerLedgerEntry,
  PartnerLedgerEntry,
  PhoneHistoryEventClass,
} from '../types';

export type PriceInputChangeEvent = {
  target: { name: string; value: string };
};

export type TelegramConversationItem = {
  id: string;
  direction: 'in' | 'out';
  kind: string;
  text: string;
  createdAt: string;
  status?: string;
  attempts?: number;
  lastError?: string | null;
  errorCategory?: string;
  telegramMessageId?: number | null;
  mediaUrl?: string | null;
};

export type CustomerLedgerViewEntry = CustomerLedgerEntry & {
  date?: string;
  type?: string;
};

export type CustomerManagerSummary = {
  label: string;
  value: ReactNode;
  tone: string;
  icon: string;
  onAction: MouseEventHandler<HTMLButtonElement>;
  ctaLabel: ReactNode;
  ctaIcon: string;
};

export type CustomerManagerAction = {
  title: string;
  text: ReactNode;
  tone: string;
  iconTone: string;
  icon: string;
  tagTone: string;
  tag: ReactNode;
  onAction: MouseEventHandler<HTMLButtonElement>;
  ctaLabel: ReactNode;
  ctaIcon: string;
};

export type CustomerManagerNote = {
  id: string | number;
  context?: string | null;
  createdAt: string;
  note: ReactNode;
  createdByUsername?: string | null;
};

export type CustomerProfileStat = {
  label: string;
  value: ReactNode;
  tone: string;
  icon: string;
};

export type CustomerQuickAction = {
  key: string;
  label: ReactNode;
  sub: ReactNode;
  tone: string;
  icon: string;
  onClick: MouseEventHandler<HTMLButtonElement>;
};

export type PartnerTypeOption = { value: string; label: string };
export type SettlementNoteTemplate = { label: string; icon: string; text: string };
export type LedgerSystemOption = { id: string; label: string; count: number };
export type LedgerSettlementBatchOption = { id: string; count: number; amount: number };
export type PartnerLedgerGroup = { systemId: string; entries: PartnerLedgerEntry[] };

export type HistoryExplorerFilters = {
  q: string;
  eventClass: PhoneHistoryEventClass;
  model: string;
  startDate: string;
  endDate: string;
};

export type DateRange = { startDate: string; endDate: string };

export type HistoryReportCard = {
  key: string;
  label: string;
  value: string;
  icon: string;
  tone: string;
  hint: string;
};

export type PhoneTimelineItem = {
  key: string;
  title: string;
  description: string;
  date?: string | null;
  icon: string;
  tone: string;
  diffs?: Array<{ key?: string; label: string; from: unknown; to: unknown; kind?: string }>;
  meta?: string;
};

export type PhoneImportPreviewRow = Record<string, unknown> & { __rowNumber: number };
export type BulkImpactChange = { key: string; icon: string; label: string; from: number; to: number };
export type BulkDiffItem = { id: number; label: string; meta: string; from: string; to: string };
export type BulkActionWarning = { text: string; tone: string; icon: string };
