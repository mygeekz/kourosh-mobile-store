import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import moment from 'jalali-moment';
import ShamsiDatePicker from '../../components/ShamsiDatePicker';
import ReportDatePresetChips from '../../components/reports/ReportDatePresetChips';
import Notification from '../../components/Notification';
import { useAuth } from '../../contexts/AuthContext';
import { useReportsExports } from '../../contexts/ReportsExportsContext';
import { exportToExcel } from '../../utils/exporters';
import type { NotificationMessage } from '../../types';
import KpiDefinitionNote from '../../components/reports/KpiDefinitionNote';
import { formatCurrencyText, readStoredCurrencyUnit } from '../../utils/currency';
import { formatShamsiDate, toShamsiInputValue } from '../../utils/shamsiDate';

type RiskLevel = 'all' | 'critical' | 'urgent' | 'followup' | 'low';
type ViewMode = 'list' | 'kanban';
type KanbanStage = 'new' | 'waiting' | 'promise' | 'today' | 'critical' | 'settled';
type ActionKey = 'call_done' | 'message_sent' | 'promise_payment' | 'move_tomorrow' | 'reviewed';

type FollowupHistory = {
  id: number;
  createdAt?: string | null;
  createdByUsername?: string | null;
  note?: string | null;
  nextFollowupDate?: string | null;
  status?: string | null;
};

type SmartAutomation = {
  status?: 'ready' | 'watch' | 'escalated' | string;
  label?: string;
  reason?: string;
  unansweredAttempts?: number;
  escalationBonus?: number;
  shouldEscalate?: boolean;
  adjustedScore?: number;
  adjustedLevel?: 'critical' | 'urgent' | 'followup' | 'low';
  adjustedLabel?: string;
  recommendedAction?: ActionKey | string;
  recommendedActionLabel?: string;
  suggestedNextFollowupDate?: string | null;
  callScript?: string;
  smsText?: string;
  telegramText?: string;
  touchPlan?: string[];
  hasPhone?: boolean;
  lastAction?: { key?: string; at?: string | null; by?: string; note?: string } | null;
};

type CollectionItem = {
  id: string;
  level: 'critical' | 'urgent' | 'followup' | 'low';
  label: string;
  score: number;
  sourceType: 'invoice' | 'installment';
  paymentType: string;
  orderId: number;
  customerId: number;
  customerName: string;
  customerPhone?: string;
  transactionDate?: string;
  dueDate?: string | null;
  ageDays?: number;
  dueInDays?: number | null;
  overdueDays?: number;
  overdueCount?: number;
  overdueAmount?: number;
  contractualTotal: number;
  receivedAmount: number;
  outstandingAmount: number;
  fullProfit: number;
  realizedProfit: number;
  unrecognizedProfit: number;
  collectionRate: number;
  customerBalance: number;
  discountRate: number;
  reasons: string[];
  touchedToday?: boolean;
  lastActionAt?: string | null;
  lastActionNote?: string;
  lastActionBy?: string;
  nextFollowupDate?: string | null;
  history?: FollowupHistory[];
  customerHistory?: FollowupHistory[];
  automation?: SmartAutomation;
  kanbanStage?: KanbanStage | string;
  kanbanStageLabel?: string;
};

type CenterSummary = {
  totalItems: number;
  counts: Record<'low' | 'followup' | 'urgent' | 'critical' | 'touchedToday', number> & { escalated?: number; automationReady?: number };
  totalOutstanding: number;
  totalUnrecognizedProfit: number;
  highestScore: number;
};

const LEVEL_META: Record<RiskLevel, { label: string; icon: string; className: string; chip: string }> = {
  all: { label: 'همه', icon: 'fa-list-check', className: 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950', chip: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-100' },
  critical: { label: 'بحرانی', icon: 'fa-triangle-exclamation', className: 'border-rose-200 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/30', chip: 'bg-rose-600 text-white' },
  urgent: { label: 'فوری', icon: 'fa-bolt', className: 'border-orange-200 bg-orange-50 dark:border-orange-900/60 dark:bg-orange-950/30', chip: 'bg-orange-500 text-white' },
  followup: { label: 'نیازمند پیگیری', icon: 'fa-phone-volume', className: 'border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/30', chip: 'bg-amber-500 text-white' },
  low: { label: 'کم‌ریسک', icon: 'fa-shield-heart', className: 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/30', chip: 'bg-emerald-600 text-white' },
};

const ACTIONS: Array<{ key: ActionKey; label: string; icon: string; tone: string }> = [
  { key: 'call_done', label: 'تماس گرفتم', icon: 'fa-phone', tone: 'bg-sky-600 hover:bg-sky-500' },
  { key: 'message_sent', label: 'پیامک/تلگرام', icon: 'fa-paper-plane', tone: 'bg-indigo-600 hover:bg-indigo-500' },
  { key: 'promise_payment', label: 'قول پرداخت', icon: 'fa-handshake', tone: 'bg-emerald-600 hover:bg-emerald-500' },
  { key: 'move_tomorrow', label: 'انتقال به فردا', icon: 'fa-calendar-plus', tone: 'bg-amber-600 hover:bg-amber-500' },
  { key: 'reviewed', label: 'بررسی شد', icon: 'fa-check', tone: 'bg-slate-700 hover:bg-slate-600' },
];

const ACTION_LABEL_BY_KEY: Record<string, string> = ACTIONS.reduce((acc, action) => {
  acc[action.key] = action.label;
  return acc;
}, {} as Record<string, string>);

const collectionStageAfterAction = (action: string): { stage: KanbanStage; label: string } => {
  const key = String(action || 'reviewed');
  if (key === 'promise_payment' || key === 'kanban_promise') return { stage: 'promise', label: 'قول پرداخت' };
  if (key === 'call_done' || key === 'message_sent' || key === 'kanban_waiting') return { stage: 'waiting', label: 'در انتظار پاسخ' };
  if (key === 'move_tomorrow' || key === 'kanban_today') return { stage: 'today', label: 'امروز پیگیری شود' };
  if (key === 'reviewed' || key === 'kanban_settled') return { stage: 'settled', label: 'تسویه/بسته شد' };
  if (key === 'kanban_critical') return { stage: 'critical', label: 'بحرانی' };
  return { stage: 'waiting', label: 'در انتظار پاسخ' };
};

const COLLECTION_ACTION_OVERLAY_STORAGE_KEY = 'kourosh:collectionActionOverlays';

const collectionActionOverlayKey = (item: Pick<CollectionItem, 'sourceType' | 'orderId'>) =>
  `${String(item.sourceType || 'invoice')}:${Number(item.orderId || 0)}`;

const readCollectionActionOverlays = (): Record<string, any> => {
  try {
    return JSON.parse(localStorage.getItem(COLLECTION_ACTION_OVERLAY_STORAGE_KEY) || '{}') || {};
  } catch {
    return {};
  }
};

const writeCollectionActionOverlay = (item: CollectionItem, action: string, payload: any) => {
  try {
    const overlays = readCollectionActionOverlays();
    const key = collectionActionOverlayKey(item);
    overlays[key] = {
      ...payload,
      action,
      sourceType: item.sourceType,
      orderId: item.orderId,
      customerId: item.customerId,
      at: payload?.createdAt || payload?.created?.createdAt || new Date().toISOString(),
      note: payload?.note || payload?.created?.note || `مرکز وصول: ${ACTION_LABEL_BY_KEY[action] || 'پیگیری ثبت شد'}`,
      nextFollowupDate: payload?.nextFollowupDate ?? payload?.created?.nextFollowupDate ?? null,
    };
    localStorage.setItem(COLLECTION_ACTION_OVERLAY_STORAGE_KEY, JSON.stringify(overlays));
  } catch {}
};

const mergeCollectionActionOverlay = (item: CollectionItem, overlay: any): CollectionItem => {
  if (!overlay) return item;
  const action = String(overlay.action || 'reviewed');
  const stage = collectionStageAfterAction(action);
  const nowIso = overlay.createdAt || overlay.at || new Date().toISOString();
  const note = overlay.note || `مرکز وصول: ${ACTION_LABEL_BY_KEY[action] || 'پیگیری ثبت شد'}`;
  const nextFollowupDate = overlay.nextFollowupDate ?? null;
  const overlayHistory = {
    id: Number(overlay.id || Date.now()),
    createdAt: nowIso,
    createdByUsername: overlay.createdByUsername || '',
    note,
    nextFollowupDate,
    status: 'open',
  };
  const existingHistory = Array.isArray(item.history) ? item.history : [];
  const hasOverlay = existingHistory.some((h) => String(h.note || '') === String(note) && String(h.createdAt || '') === String(nowIso));
  return {
    ...item,
    touchedToday: true,
    lastActionAt: nowIso,
    lastActionNote: note,
    lastActionBy: overlay.createdByUsername || item.lastActionBy || '',
    nextFollowupDate,
    kanbanStage: stage.stage,
    kanbanStageLabel: stage.label,
    automation: {
      ...(item.automation || {}),
      status: action === 'reviewed' || action === 'kanban_settled' ? 'ready' : 'watch',
      label: action === 'reviewed' || action === 'kanban_settled' ? 'بررسی‌شده' : 'در چرخه پیگیری',
      lastAction: { key: action, at: nowIso, by: overlay.createdByUsername || '', note },
    },
    history: (hasOverlay ? existingHistory : [overlayHistory, ...existingHistory]).slice(0, 12),
  };
};

const applyCollectionActionOverlays = (rows: CollectionItem[]): CollectionItem[] => {
  const overlays = readCollectionActionOverlays();
  return rows.map((item) => {
    const overlay = overlays[collectionActionOverlayKey(item)];
    if (!overlay) return item;
    const backendTime = item.lastActionAt ? moment(item.lastActionAt).valueOf() : 0;
    const overlayTime = overlay.at ? moment(overlay.at).valueOf() : 0;
    return overlayTime >= backendTime ? mergeCollectionActionOverlay(item, overlay) : item;
  });
};

const KANBAN_COLUMNS: Array<{ stage: KanbanStage; label: string; description: string; icon: string; className: string; chip: string }> = [
  { stage: 'new', label: 'جدید', description: 'هنوز اقدام مشخصی ثبت نشده', icon: 'fa-sparkles', className: 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/70', chip: 'bg-slate-900 text-white dark:bg-white dark:text-slate-950' },
  { stage: 'waiting', label: 'در انتظار پاسخ', description: 'تماس یا پیام ارسال شده و منتظر نتیجه هستیم', icon: 'fa-hourglass-half', className: 'border-sky-200 bg-sky-50 dark:border-sky-900/60 dark:bg-sky-950/25', chip: 'bg-sky-600 text-white' },
  { stage: 'promise', label: 'قول پرداخت', description: 'مشتری زمان یا مبلغ پرداخت را اعلام کرده', icon: 'fa-handshake', className: 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/25', chip: 'bg-emerald-600 text-white' },
  { stage: 'today', label: 'امروز پیگیری شود', description: 'موعد پیگیری امروز است یا به امروز منتقل شده', icon: 'fa-calendar-day', className: 'border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/25', chip: 'bg-amber-500 text-white' },
  { stage: 'critical', label: 'بحرانی', description: 'پرریسک، دیرکردار یا افزایش‌یافته توسط سیستم', icon: 'fa-triangle-exclamation', className: 'border-rose-200 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/25', chip: 'bg-rose-600 text-white' },
  { stage: 'settled', label: 'تسویه/بسته شد', description: 'برای امروز بسته یا بررسی نهایی شده', icon: 'fa-circle-check', className: 'border-violet-200 bg-violet-50 dark:border-violet-900/60 dark:bg-violet-950/25', chip: 'bg-violet-600 text-white' },
];

const KANBAN_ACTION_BY_STAGE: Record<KanbanStage, string> = {
  new: 'kanban_new',
  waiting: 'kanban_waiting',
  promise: 'kanban_promise',
  today: 'kanban_today',
  critical: 'kanban_critical',
  settled: 'kanban_settled',
};

const kanbanMeta = (stage?: string | null) => KANBAN_COLUMNS.find((col) => col.stage === stage) || KANBAN_COLUMNS[0];

const money = (value: number | undefined | null) => formatCurrencyText(Number(value || 0), readStoredCurrencyUnit());
const percent = (value: number | undefined | null) => `${Number(value || 0).toLocaleString('fa-IR', { maximumFractionDigits: 1 })}٪`;
const shamsi = formatShamsiDate;
const toJ = (date: Date | null) => toShamsiInputValue(date);
const customerLedgerPath = (customerId: number | string) => `/customers/${customerId}#customer-ledger-section`;
const sourceDocumentPath = (item: Pick<CollectionItem, 'sourceType' | 'orderId'>) => item.sourceType === 'installment' ? `/installment-sales/${item.orderId}` : `/invoices/${item.orderId}`;

const cleanNote = (note?: string | null) => String(note || '').replace(/\[collection:[^\]]+\]\s*\|?\s*/g, '').replace(/\[action:[^\]]+\]\s*\|?\s*/g, '').trim();

export default function CollectionFollowupCenter() {
  const { token } = useAuth();
  const { registerReportExports } = useReportsExports();
  const [searchParams] = useSearchParams();
  const exportRef = useRef<() => void>(() => undefined);

  const [fromDate, setFromDate] = useState<Date | null>(() => moment().subtract(24, 'months').toDate());
  const [toDate, setToDate] = useState<Date | null>(() => new Date());
  const [level, setLevel] = useState<RiskLevel>('all');
  const [query, setQuery] = useState(() => searchParams.get('q') || '');
  const [onlyUntouched, setOnlyUntouched] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [summary, setSummary] = useState<CenterSummary>({ totalItems: 0, counts: { low: 0, followup: 0, urgent: 0, critical: 0, touchedToday: 0 }, totalOutstanding: 0, totalUnrecognizedProfit: 0, highestScore: 0 });
  const [loading, setLoading] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<CollectionItem | null>(null);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);

  const highRiskCount = Number(summary.counts.critical || 0) + Number(summary.counts.urgent || 0);

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (toJ(fromDate)) qs.set('from', toJ(fromDate));
      if (toJ(toDate)) qs.set('to', toJ(toDate));
      qs.set('level', level);
      if (query.trim()) qs.set('q', query.trim());
      if (onlyUntouched) qs.set('onlyUntouched', '1');
      const res = await fetch(`/api/reports/collection-center?${qs.toString()}`, { headers: { Authorization: `Bearer ${token}` } });
      const js = await res.json();
      if (!res.ok || js?.success === false) throw new Error(js?.message || 'خطا در دریافت مرکز وصول');
      const backendItems = Array.isArray(js?.data?.items) ? js.data.items : [];
      setItems(applyCollectionActionOverlays(backendItems));
      setSummary(js?.data?.summary || { totalItems: 0, counts: { low: 0, followup: 0, urgent: 0, critical: 0, touchedToday: 0 }, totalOutstanding: 0, totalUnrecognizedProfit: 0, highestScore: 0 });
    } catch (e: any) {
      setNotification({ type: 'error', text: e?.message || 'خطا در دریافت اطلاعات' });
    } finally {
      setLoading(false);
    }
  };

  const applyActionLocally = (item: CollectionItem, action: string, payload?: any) => {
    const nowIso = payload?.createdAt || payload?.created?.createdAt || new Date().toISOString();
    const actionLabel = ACTION_LABEL_BY_KEY[action] || payload?.actionLabel || 'پیگیری ثبت شد';
    const note = payload?.note || payload?.created?.note || `مرکز وصول: ${actionLabel}`;
    const nextFollowupDate = payload?.nextFollowupDate ?? payload?.created?.nextFollowupDate ?? null;
    const stage = collectionStageAfterAction(action);
    writeCollectionActionOverlay(item, action, { ...payload, createdAt: nowIso, note, nextFollowupDate });

    const patchItem = (current: CollectionItem): CollectionItem => {
      if (current.id !== item.id) return current;
      return {
        ...current,
        touchedToday: true,
        lastActionAt: nowIso,
        lastActionNote: note,
        lastActionBy: payload?.createdByUsername || payload?.created?.createdByUsername || current.lastActionBy || '',
        nextFollowupDate,
        kanbanStage: stage.stage,
        kanbanStageLabel: stage.label,
        automation: {
          ...(current.automation || {}),
          status: action === 'reviewed' ? 'ready' : 'watch',
          label: action === 'reviewed' ? 'بررسی‌شده' : 'در چرخه پیگیری',
          lastAction: {
            key: action,
            at: nowIso,
            by: payload?.createdByUsername || payload?.created?.createdByUsername || '',
            note,
          },
        },
        history: [
          {
            id: Number(payload?.id || payload?.created?.id || Date.now()),
            createdAt: nowIso,
            createdByUsername: payload?.createdByUsername || payload?.created?.createdByUsername || '',
            note,
            nextFollowupDate,
            status: 'open',
          },
          ...(current.history || []),
        ].slice(0, 12),
      };
    };

    setItems((prev) => prev.map(patchItem));
    setSelected((prev) => prev && prev.id === item.id ? patchItem(prev) : prev);
    setSummary((prev) => ({
      ...prev,
      counts: {
        ...(prev.counts || {}),
        touchedToday: Number(prev.counts?.touchedToday || 0) + (item.touchedToday ? 0 : 1),
      },
    }));

    try {
      localStorage.setItem('kourosh:lastCollectionAction', JSON.stringify({ itemId: item.id, action, at: nowIso, orderId: item.orderId, customerId: item.customerId }));
      window.dispatchEvent(new CustomEvent('kourosh:collection-action-recorded', { detail: { itemId: item.id, action, at: nowIso, orderId: item.orderId, customerId: item.customerId } }));
    } catch {}
  };

  const runAction = async (item: CollectionItem, action: string, smartNote?: string, nextFollowupDate?: string | null) => {
    if (!token) return;
    setActingId(`${item.id}:${action}`);
    try {
      const res = await fetch('/api/reports/collection-center/actions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          customerId: item.customerId,
          orderId: item.orderId,
          sourceType: item.sourceType,
          outstandingAmount: item.outstandingAmount,
          riskLabel: item.label,
          note: smartNote || undefined,
          nextFollowupDate: nextFollowupDate || undefined,
        }),
      });
      const js = await res.json();
      if (!res.ok || js?.success === false) throw new Error(js?.message || 'خطا در ثبت اقدام');

      applyActionLocally(item, action, js?.data || {});
      setNotification({ type: 'success', text: js?.message || 'اقدام پیگیری ثبت شد و در گزارش‌ها اعمال می‌شود.' });

      // Fresh backend state is still loaded after the optimistic update so all counters,
      // kanban stage, and Smart Insight signals stay aligned with persisted data.
      await fetchData();
    } catch (e: any) {
      setNotification({ type: 'error', text: e?.message || 'خطا در ثبت اقدام' });
    } finally {
      setActingId(null);
    }
  };

  const copySmartText = async (text?: string, label = 'متن') => {
    const value = String(text || '').trim();
    if (!value) {
      setNotification({ type: 'error', text: 'متنی برای کپی وجود ندارد.' });
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      setNotification({ type: 'success', text: label + ' کپی شد.' });
    } catch {
      setNotification({ type: 'error', text: 'کپی خودکار انجام نشد؛ متن را از Drawer انتخاب و کپی کنید.' });
    }
  };

  const runSmartRecommendedAction = async (item: CollectionItem) => {
    const action = (item.automation?.recommendedAction || 'message_sent') as ActionKey;
    const note = action === 'call_done' ? item.automation?.callScript : item.automation?.smsText || item.automation?.telegramText;
    await runAction(item, action, note, item.automation?.suggestedNextFollowupDate || null);
  };

  const moveKanbanItem = async (item: CollectionItem, stage: KanbanStage) => {
    if (!item || item.kanbanStage === stage) return;
    const meta = kanbanMeta(stage);
    const nextDate = stage === 'today' ? moment().endOf('day').toISOString() : stage === 'settled' ? null : undefined;
    await runAction(item, KANBAN_ACTION_BY_STAGE[stage], `انتقال در کانبان وصول به ستون ` + meta.label, nextDate);
  };

  const handleKanbanDrop = (stage: KanbanStage, event?: React.DragEvent<HTMLDivElement>) => {
    event?.preventDefault();
    event?.stopPropagation();
    const item = items.find((row) => row.id === draggingItemId);
    setDraggingItemId(null);
    if (item) void moveKanbanItem(item, stage);
  };

  const handleKanbanDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const exportExcel = () => {
    exportToExcel(`collection-followup-center-${moment().format('YYYYMMDD-HHmm')}`, items.map((item) => ({
      customerName: item.customerName,
      customerPhone: item.customerPhone || '',
      source: item.sourceType === 'installment' ? 'اقساطی' : 'فاکتور',
      orderId: item.orderId,
      level: item.label,
      score: item.score,
      outstandingAmount: item.outstandingAmount,
      collectionRate: percent(item.collectionRate),
      unrecognizedProfit: item.unrecognizedProfit,
      overdueDays: item.overdueDays || 0,
      reasons: (item.reasons || []).join(' | '),
      lastActionAt: item.lastActionAt ? shamsi(item.lastActionAt) : '',
      lastActionNote: cleanNote(item.lastActionNote),
      automationLabel: item.automation?.label || '',
      recommendedAction: item.automation?.recommendedActionLabel || '',
      unansweredAttempts: item.automation?.unansweredAttempts || 0,
      suggestedNextFollowupDate: item.automation?.suggestedNextFollowupDate ? shamsi(item.automation.suggestedNextFollowupDate) : '',
      smartSmsText: item.automation?.smsText || '',
      kanbanStageLabel: item.kanbanStageLabel || kanbanMeta(item.kanbanStage).label,
    })), [
      { header: 'مشتری', key: 'customerName' },
      { header: 'موبایل', key: 'customerPhone' },
      { header: 'نوع سند', key: 'source' },
      { header: 'شماره سند', key: 'orderId' },
      { header: 'سطح ریسک', key: 'level' },
      { header: 'امتیاز ریسک', key: 'score' },
      { header: 'مانده وصول', key: 'outstandingAmount' },
      { header: 'درصد وصول', key: 'collectionRate' },
      { header: 'سود وصول‌نشده', key: 'unrecognizedProfit' },
      { header: 'روز تأخیر', key: 'overdueDays' },
      { header: 'دلایل', key: 'reasons' },
      { header: 'آخرین اقدام', key: 'lastActionAt' },
      { header: 'یادداشت آخرین اقدام', key: 'lastActionNote' },
      { header: 'وضعیت اتوماسیون', key: 'automationLabel' },
      { header: 'اقدام پیشنهادی', key: 'recommendedAction' },
      { header: 'تعداد پیگیری بی‌نتیجه', key: 'unansweredAttempts' },
      { header: 'موعد پیشنهادی بعدی', key: 'suggestedNextFollowupDate' },
      { header: 'متن پیام پیشنهادی', key: 'smartSmsText' },
      { header: 'ستون Kanban', key: 'kanbanStageLabel' },
    ], 'مرکز پیگیری وصول');
  };

  exportRef.current = exportExcel;
  useEffect(() => { registerReportExports({ excel: () => exportRef.current() }); return () => registerReportExports({}); }, [registerReportExports]);
  useEffect(() => { const t = window.setTimeout(() => { void fetchData(); }, 300); return () => window.clearTimeout(t); }, [token, fromDate, toDate, level, query, onlyUntouched]);

  const orderedLevels = useMemo<RiskLevel[]>(() => ['all', 'critical', 'urgent', 'followup', 'low'], []);
  const kanbanColumns = useMemo(() => KANBAN_COLUMNS.map((col) => ({
    ...col,
    items: items.filter((item) => (item.kanbanStage || 'new') === col.stage),
  })), [items]);

  return (
    <div className="collection-center-page space-y-5" dir="rtl">
      {notification ? <Notification message={notification} onClose={() => setNotification(null)} /> : null}

      <section className="collection-center-hero overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="collection-center-hero__head border-b border-slate-100 p-5 dark:border-slate-800">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="collection-center-report-meta flex items-center gap-2">
              <div
                className="collection-center-basis-badge"
                tabIndex={0}
                role="note"
                aria-label="مبنای نمایش مرکز وصول"
              >
                <i className="fa-solid fa-diagram-project" />
                مبنای نمایش: موعد وصول، مانده باز، پیگیری بعدی و سطح ریسک
                <span className="collection-center-basis-badge__hint" aria-hidden="true">
                  فروش‌های قدیمی هم اگر مانده باز، سررسید، چک/قسط یا پیگیری بعدی داشته باشند در مرکز وصول نمایش داده می‌شوند.
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              <div className="collection-center-kpi rounded-2xl border p-3 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[11px] font-black collection-center-kpi__label">فوری/بحرانی</div>
                  <i className="fa-solid fa-triangle-exclamation text-xs collection-center-kpi__icon" />
                </div>
                <div className="mt-1 text-lg font-black collection-center-kpi__value">{highRiskCount.toLocaleString('fa-IR')}</div>
                <div className="mt-1 text-[10px] collection-center-kpi__hint">اولویت‌های فوری</div>
              </div>
              <div className="collection-center-kpi rounded-2xl border p-3 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[11px] font-black collection-center-kpi__label">مانده وصول</div>
                  <i className="fa-solid fa-wallet text-xs collection-center-kpi__icon" />
                </div>
                <div className="mt-1 text-sm font-black collection-center-kpi__value">{money(summary.totalOutstanding)}</div>
                <div className="mt-1 text-[10px] collection-center-kpi__hint">مبلغ دریافت‌نشده</div>
              </div>
              <div className="collection-center-kpi rounded-2xl border p-3 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[11px] font-black collection-center-kpi__label">اقدام امروز</div>
                  <i className="fa-solid fa-calendar-check text-xs collection-center-kpi__icon" />
                </div>
                <div className="mt-1 text-lg font-black collection-center-kpi__value">{summary.counts.touchedToday.toLocaleString('fa-IR')}</div>
                <div className="mt-1 text-[10px] collection-center-kpi__hint">پیگیری‌های ثبت‌شده</div>
              </div>
              <div className="collection-center-kpi rounded-2xl border p-3 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[11px] font-black collection-center-kpi__label">بالاترین امتیاز</div>
                  <i className="fa-solid fa-gauge-high text-xs collection-center-kpi__icon" />
                </div>
                <div className="mt-1 text-lg font-black collection-center-kpi__value">{summary.highestScore.toLocaleString('fa-IR')} / ۱۰۰</div>
                <div className="mt-1 text-[10px] collection-center-kpi__hint">حداکثر ریسک</div>
              </div>
              <div className="collection-center-kpi rounded-2xl border p-3 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[11px] font-black collection-center-kpi__label">افزایش خودکار</div>
                  <i className="fa-solid fa-arrow-trend-up text-xs collection-center-kpi__icon" />
                </div>
                <div className="mt-1 text-lg font-black collection-center-kpi__value">{Number(summary.counts.escalated || 0).toLocaleString('fa-IR')}</div>
                <div className="mt-1 text-[10px] collection-center-kpi__hint">Escalation</div>
              </div>
            </div>
          </div>
        </div>

        <div className="collection-center-toolbar-v2" aria-label="کنترل‌های مرکز پیگیری وصول">
          <div className="collection-center-toolbar-v2__main">
            <div className="collection-center-search-final" dir="ltr" role="search">
              <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
              <input
                aria-label="جستجو در مرکز پیگیری وصول"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="جستجو در مرکز وصول؛ مشتری، موبایل، شماره سند یا دلیل ریسک…"
                dir="rtl"
                type="text"
              />
            </div>

            <div className="collection-center-date-group-v2" aria-label="بازه زمانی پیگیری">
              <label className="collection-center-date-box-v2">
                <span>از تاریخ</span>
                <ShamsiDatePicker selectedDate={fromDate} onChange={setFromDate} preview="از تاریخ" inputClassName="collection-center-date-input-v2" />
              </label>
              <label className="collection-center-date-box-v2">
                <span>تا تاریخ</span>
                <ShamsiDatePicker selectedDate={toDate} onChange={setToDate} preview="تا تاریخ" inputClassName="collection-center-date-input-v2" />
              </label>
            </div>

            <div className="collection-center-view-actions-v2" aria-label="حالت نمایش و فیلتر سریع">
              <div className="collection-center-view-toggle-v2" role="group" aria-label="حالت نمایش">
                <button type="button" onClick={() => setViewMode('list')} className={viewMode === 'list' ? 'is-active' : ''}>
                  <i className="fa-solid fa-list" />
                  لیست
                </button>
                <button type="button" onClick={() => setViewMode('kanban')} className={viewMode === 'kanban' ? 'is-active' : ''}>
                  <i className="fa-solid fa-table-columns" />
                  Kanban
                </button>
              </div>
              <button type="button" onClick={() => setOnlyUntouched((v) => !v)} className={`collection-center-today-toggle-v2 ${onlyUntouched ? 'is-active' : ''}`}>
                <i className="fa-solid fa-bolt" />
                فقط پیگیری‌نشده‌های امروز
              </button>
            </div>
          </div>

          <div className="collection-center-status-bar-v2" aria-label="فیلتر سطح ریسک">
            {orderedLevels.map((lvl) => {
              const meta = LEVEL_META[lvl];
              const count = lvl === 'all' ? summary.totalItems : Number(summary.counts[lvl] || 0);
              const active = level === lvl;
              return (
                <button key={lvl} type="button" onClick={() => setLevel(lvl)} className={active ? 'is-active' : ''}>
                  <i className={`fa-solid ${meta.icon}`} />
                  <span>{meta.label}</span>
                  <strong>{count.toLocaleString('fa-IR')}</strong>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {viewMode === 'kanban' ? (
        <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-1 text-[11px] font-black text-white dark:bg-white dark:text-slate-950"><i className="fa-solid fa-table-columns" /> برد Kanban وصول</div>
              <h2 className="mt-2 text-lg font-black text-slate-950 dark:text-slate-50">وضعیت عملیاتی پرونده‌های وصول</h2>
              <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">کارت‌ها را بین ستون‌ها جابه‌جا کن تا وضعیت پیگیری در تاریخچه مشتری ثبت شود.</p>
            </div>
            <div className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 dark:bg-slate-900 dark:text-slate-200">{items.length.toLocaleString('fa-IR')} کارت فعال</div>
          </div>
          {loading ? (
            <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-center font-black text-slate-500 dark:border-slate-800 dark:bg-slate-950">در حال دریافت برد وصول...</div>
          ) : items.length === 0 ? (
            <div className="collection-center-empty rounded-[28px] border border-amber-200 bg-amber-50 p-8 text-center dark:border-amber-900/60 dark:bg-amber-950/25">
              <i className="fa-solid fa-filter-circle-xmark text-3xl text-amber-600" />
              <div className="mt-3 text-lg font-black text-amber-900 dark:text-amber-100">کارت فعالی با فیلتر فعلی وجود ندارد</div>
              <p className="mt-1 text-sm font-bold text-amber-700 dark:text-amber-200">جستجو، سطح ریسک یا بازه پیگیری را پاک/گسترده کن.</p>
            </div>
          ) : (
            <div className="grid gap-3 xl:grid-cols-6">
              {kanbanColumns.map((column) => (
                <div
                  key={column.stage}
                  onDragOver={handleKanbanDragOver}
                  onDragEnter={handleKanbanDragOver}
                  onDrop={(event) => handleKanbanDrop(column.stage, event)}
                  className={`collection-kanban-column min-h-[22rem] rounded-[26px] border p-3 transition ${column.className} ${draggingItemId ? 'is-drop-ready ring-2 ring-slate-300 dark:ring-slate-600' : ''}`}
                  data-kanban-stage={column.stage}
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div>
                      <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-black ${column.chip}`}><i className={`fa-solid ${column.icon}`} />{column.label}</div>
                      <p className="mt-2 text-[11px] font-bold leading-5 text-slate-500 dark:text-slate-400">{column.description}</p>
                    </div>
                    <span className="rounded-full bg-white/80 px-2 py-1 text-[11px] font-black text-slate-600 ring-1 ring-slate-200 dark:bg-slate-950/50 dark:text-slate-200 dark:ring-slate-700">{column.items.length.toLocaleString('fa-IR')}</span>
                  </div>
                  <div className="space-y-3">
                    {column.items.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-white/45 p-4 text-center text-xs font-black text-slate-400 dark:border-slate-700 dark:bg-slate-950/30">رها کن اینجا</div>
                    ) : column.items.map((item) => {
                      const meta = LEVEL_META[item.level];
                      return (
                        <article
                          key={`${column.stage}-${item.id}`}
                          draggable={!Boolean(actingId)}
                          onDragStart={(event) => {
                            setDraggingItemId(item.id);
                            event.dataTransfer.effectAllowed = 'move';
                            event.dataTransfer.setData('text/plain', item.id);
                          }}
                          onDragEnd={() => setDraggingItemId(null)}
                          className={`collection-selectable-card collection-kanban-card rounded-3xl border border-white/75 bg-white/85 p-3 shadow-sm transition hover:-translate-y-0.5 active:cursor-grabbing dark:border-slate-800 dark:bg-slate-950/70 ${draggingItemId === item.id ? 'is-dragging opacity-60 ring-2 ring-indigo-300' : ''}`}
                          title="برای تغییر وضعیت، کارت را بکش و روی ستون مقصد رها کن"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-black text-slate-950 dark:text-slate-50">{item.customerName}</div>
                              <div className="mt-1 text-[11px] font-bold text-slate-500">#{item.orderId.toLocaleString('fa-IR')} — {item.sourceType === 'installment' ? 'اقساطی' : 'اعتباری'}</div>
                            </div>
                            <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${meta.chip}`}>{item.label}</span>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                            <div className="rounded-2xl bg-slate-50 p-2 dark:bg-slate-900/70"><span className="block text-slate-400">مانده</span>{money(item.outstandingAmount)}</div>
                            <div className="rounded-2xl bg-slate-50 p-2 dark:bg-slate-900/70"><span className="block text-slate-400">وصول</span>{percent(item.collectionRate)}</div>
                          </div>
                          <div className="mt-3 line-clamp-2 text-[11px] font-bold leading-5 text-slate-500 dark:text-slate-400">{(item.reasons || [])[0] || 'نیازمند بررسی'}</div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button type="button" onClick={() => setSelected(item)} className="collection-action-link flex-1 rounded-2xl border border-slate-200 bg-white px-2 py-2 text-[11px] font-black text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">جزئیات</button>
                            <Link to={customerLedgerPath(item.customerId)} className="collection-action-link rounded-2xl border border-slate-200 bg-white px-2 py-2 text-[11px] font-black text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                              <i className="fa-solid fa-user ml-1" /> پرونده
                            </Link>
                            <Link to={sourceDocumentPath(item)} className="collection-action-link rounded-2xl border border-slate-200 bg-white px-2 py-2 text-[11px] font-black text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                              <i className="fa-solid fa-file-invoice ml-1" /> سند
                            </Link>
                            <button type="button" disabled={Boolean(actingId)} onClick={() => { void runSmartRecommendedAction(item); }} className="rounded-2xl bg-indigo-600 px-3 py-2 text-[11px] font-black text-white disabled:opacity-60"><i className="fa-solid fa-robot" /></button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : (
      <section className="grid gap-3 xl:grid-cols-2">
        {loading ? (
          <div className="col-span-full rounded-[28px] border border-slate-200 bg-white p-8 text-center font-black text-slate-500 dark:border-slate-800 dark:bg-slate-950">در حال دریافت اولویت‌های وصول...</div>
        ) : items.length === 0 ? (
          <div className="collection-center-empty col-span-full rounded-[28px] border border-amber-200 bg-amber-50 p-8 text-center dark:border-amber-900/60 dark:bg-amber-950/25">
            <i className="fa-solid fa-filter-circle-xmark text-3xl text-amber-600" />
            <div className="mt-3 text-lg font-black text-amber-900 dark:text-amber-100">با فیلتر فعلی موردی نمایش داده نمی‌شود</div>
            <p className="mt-1 text-sm font-bold text-amber-700 dark:text-amber-200">مرکز وصول حالا بر اساس موعد قسط/چک، مانده باز، تاریخ پیگیری بعدی و ریسک عمل می‌کند. برای دیدن همه موارد، جستجو را پاک کن و سطح ریسک را روی «همه» بگذار.</p>
            <button type="button" onClick={() => { setQuery(''); setLevel('all'); setOnlyUntouched(false); setFromDate(moment().subtract(24, 'months').toDate()); setToDate(new Date()); }} className="mt-4 inline-flex min-h-[42px] items-center gap-2 rounded-2xl bg-amber-600 px-4 text-xs font-black text-white shadow-sm hover:bg-amber-500">
              <i className="fa-solid fa-rotate-left" /> نمایش همه موارد قابل پیگیری
            </button>
          </div>
        ) : items.map((item) => {
          const meta = LEVEL_META[item.level];
          return (
            <article key={item.id} className={`collection-selectable-card collection-center-list-card overflow-hidden rounded-[28px] border p-4 shadow-sm ${meta.className}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-[11px] font-black ${meta.chip}`}><i className={`fa-solid ${meta.icon} ml-1`} />{item.label}</span>
                    <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-black text-slate-600 ring-1 ring-slate-200 dark:bg-slate-950/60 dark:text-slate-200 dark:ring-slate-700">امتیاز {item.score.toLocaleString('fa-IR')} / ۱۰۰</span>
                    {item.touchedToday ? <span className="rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-black text-white">امروز پیگیری شد</span> : null}
                    <span className={`rounded-full px-3 py-1 text-[11px] font-black ${kanbanMeta(item.kanbanStage).chip}`}>
                      <i className={`fa-solid ${kanbanMeta(item.kanbanStage).icon} ml-1`} />{item.kanbanStageLabel || kanbanMeta(item.kanbanStage).label}
                    </span>
                  </div>
                  <h3 className="mt-3 text-lg font-black text-slate-950 dark:text-slate-50">{item.customerName}</h3>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs font-bold text-slate-500 dark:text-slate-400">
                    <span>{item.sourceType === 'installment' ? 'فروش اقساطی' : 'فاکتور اعتباری'} #{item.orderId.toLocaleString('fa-IR')}</span>
                    <span>تاریخ فروش: {shamsi(item.transactionDate)}</span>
                    <span>موبایل: {item.customerPhone || 'ثبت نشده'}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  <button type="button" onClick={() => setSelected(item)} className="collection-action-link min-h-[42px] rounded-2xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 shadow-sm transition dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                    جزئیات
                  </button>
                  <Link to={customerLedgerPath(item.customerId)} className="collection-action-link min-h-[42px] rounded-2xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 shadow-sm transition dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                    <i className="fa-solid fa-user ml-1" /> پرونده مشتری
                  </Link>
                  <Link to={sourceDocumentPath(item)} className="collection-action-link min-h-[42px] rounded-2xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 shadow-sm transition dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                    <i className="fa-solid fa-file-invoice ml-1" /> {item.sourceType === 'installment' ? 'جزئیات اقساط' : 'سند فروش'}
                  </Link>
                </div>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-4">
                <div className="rounded-2xl bg-white/75 p-3 ring-1 ring-slate-200/70 dark:bg-slate-950/45 dark:ring-slate-700"><div className="text-[11px] text-slate-500">مانده وصول</div><div className="mt-1 text-sm font-black">{money(item.outstandingAmount)}</div></div>
                <div className="rounded-2xl bg-white/75 p-3 ring-1 ring-slate-200/70 dark:bg-slate-950/45 dark:ring-slate-700"><div className="text-[11px] text-slate-500">درصد وصول</div><div className="mt-1 text-sm font-black">{percent(item.collectionRate)}</div></div>
                <div className="rounded-2xl bg-white/75 p-3 ring-1 ring-slate-200/70 dark:bg-slate-950/45 dark:ring-slate-700"><div className="text-[11px] text-slate-500">سود وصول‌نشده</div><div className="mt-1 text-sm font-black">{money(item.unrecognizedProfit)}</div></div>
                <div className="rounded-2xl bg-white/75 p-3 ring-1 ring-slate-200/70 dark:bg-slate-950/45 dark:ring-slate-700"><div className="text-[11px] text-slate-500">تأخیر</div><div className="mt-1 text-sm font-black">{Number(item.overdueDays || 0).toLocaleString('fa-IR')} روز</div></div>
              </div>

              <div className="mt-4 rounded-2xl border border-white/70 bg-white/55 p-3 dark:border-slate-700 dark:bg-slate-950/35">
                <div className="text-xs font-black text-slate-500">چرا این اولویت؟</div>
                <ul className="mt-2 space-y-1 text-sm font-bold text-slate-700 dark:text-slate-200">
                  {(item.reasons || []).slice(0, 3).map((reason, idx) => <li key={`${item.id}-r-${idx}`} className="flex gap-2"><i className="fa-solid fa-circle-info mt-1 text-[10px] text-slate-400" />{reason}</li>)}
                </ul>
              </div>

              {item.automation ? (
                <div className="mt-4 rounded-2xl border border-indigo-200 bg-indigo-50/80 p-3 dark:border-indigo-900/60 dark:bg-indigo-950/25">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-3 py-1 text-[11px] font-black text-white">
                        <i className="fa-solid fa-wand-magic-sparkles" /> {item.automation.label || 'اتوماسیون وصول'}
                      </div>
                      <div className="mt-2 text-sm font-black text-slate-900 dark:text-slate-100">اقدام پیشنهادی: {item.automation.recommendedActionLabel || 'پیگیری'}</div>
                      <div className="mt-1 text-xs font-bold text-slate-600 dark:text-slate-300">{item.automation.reason}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => { void copySmartText(item.automation?.smsText, 'پیام پیشنهادی'); }} className="min-h-[38px] rounded-2xl border border-indigo-200 bg-white px-3 text-xs font-black text-indigo-700 shadow-sm dark:border-indigo-800 dark:bg-slate-950 dark:text-indigo-200">
                        <i className="fa-solid fa-copy ml-1" /> کپی پیام
                      </button>
                      <button type="button" disabled={Boolean(actingId)} onClick={() => { void runSmartRecommendedAction(item); }} className="min-h-[38px] rounded-2xl bg-indigo-600 px-3 text-xs font-black text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-60">
                        <i className="fa-solid fa-robot ml-1" /> ثبت اقدام پیشنهادی
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <div className="rounded-2xl bg-white/75 p-2 text-xs font-bold text-slate-600 dark:bg-slate-950/40 dark:text-slate-200">بی‌پاسخ: {Number(item.automation.unansweredAttempts || 0).toLocaleString('fa-IR')}</div>
                    <div className="rounded-2xl bg-white/75 p-2 text-xs font-bold text-slate-600 dark:bg-slate-950/40 dark:text-slate-200">موعد بعدی: {shamsi(item.automation.suggestedNextFollowupDate)}</div>
                    <div className="rounded-2xl bg-white/75 p-2 text-xs font-bold text-slate-600 dark:bg-slate-950/40 dark:text-slate-200">امتیاز بعد از هوش: {Number(item.automation.adjustedScore || item.score || 0).toLocaleString('fa-IR')}</div>
                  </div>
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                {ACTIONS.map((action) => (
                  <button key={action.key} type="button" disabled={Boolean(actingId)} onClick={() => { void runAction(item, action.key); }} className={`inline-flex min-h-[42px] items-center gap-2 rounded-2xl px-3 text-xs font-black text-white shadow-sm transition hover:-translate-y-0.5 disabled:opacity-60 ${action.tone}`}>
                    <i className={`fa-solid ${action.icon}`} /> {actingId === `${item.id}:${action.key}` ? 'در حال ثبت...' : action.label}
                  </button>
                ))}
              </div>

              {item.lastActionAt ? <div className="mt-3 rounded-2xl bg-slate-950/5 px-3 py-2 text-xs font-bold text-slate-500 dark:bg-white/5 dark:text-slate-300">آخرین اقدام: {shamsi(item.lastActionAt)} {item.lastActionBy ? `— ${item.lastActionBy}` : ''}</div> : null}
            </article>
          );
        })}
      </section>
      )}

      {selected ? (
        <div className="fixed inset-0 z-[220] flex justify-end bg-slate-950/45 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <aside className="h-full w-full max-w-2xl overflow-y-auto bg-white p-5 shadow-2xl dark:bg-slate-950" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div>
                <span className={`rounded-full px-3 py-1 text-[11px] font-black ${LEVEL_META[selected.level].chip}`}>{selected.label}</span>
                <h2 className="mt-3 text-xl font-black text-slate-950 dark:text-slate-50">{selected.customerName}</h2>
                <p className="mt-1 text-sm font-bold text-slate-500">سند #{selected.orderId.toLocaleString('fa-IR')} — {selected.sourceType === 'installment' ? 'اقساطی' : 'فاکتور'}</p>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-100">×</button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 p-4 dark:border-slate-800"><div className="text-xs font-black text-slate-500">مبلغ سند</div><div className="mt-1 text-base font-black">{money(selected.contractualTotal)}</div></div>
              <div className="rounded-3xl border border-slate-200 p-4 dark:border-slate-800"><div className="text-xs font-black text-slate-500">وصول‌شده</div><div className="mt-1 text-base font-black">{money(selected.receivedAmount)}</div></div>
              <div className="rounded-3xl border border-slate-200 p-4 dark:border-slate-800"><div className="text-xs font-black text-slate-500">مانده</div><div className="mt-1 text-base font-black text-rose-600">{money(selected.outstandingAmount)}</div></div>
              <div className="rounded-3xl border border-slate-200 p-4 dark:border-slate-800"><div className="text-xs font-black text-slate-500">سود وصول‌نشده</div><div className="mt-1 text-base font-black text-orange-600">{money(selected.unrecognizedProfit)}</div></div>
            </div>

            <div className="mt-5 rounded-3xl border border-slate-200 p-4 dark:border-slate-800">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-xs font-black text-slate-500">وضعیت Kanban</div>
                  <div className={`mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black ${kanbanMeta(selected.kanbanStage).chip}`}><i className={`fa-solid ${kanbanMeta(selected.kanbanStage).icon}`} />{selected.kanbanStageLabel || kanbanMeta(selected.kanbanStage).label}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {KANBAN_COLUMNS.map((col) => (
                    <button key={`sel-kanban-${col.stage}`} type="button" disabled={Boolean(actingId) || selected.kanbanStage === col.stage} onClick={() => { void moveKanbanItem(selected, col.stage); }} className={`rounded-2xl border px-3 py-2 text-[11px] font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${selected.kanbanStage === col.stage ? 'border-slate-900 bg-slate-950 text-white dark:bg-white dark:text-slate-950' : 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'}`}>{col.label}</button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-3xl border border-slate-200 p-4 dark:border-slate-800">
              <h3 className="font-black text-slate-900 dark:text-slate-100">دلایل اولویت</h3>
              <ul className="mt-3 space-y-2 text-sm font-bold text-slate-600 dark:text-slate-300">
                {(selected.reasons || []).map((reason, idx) => <li key={`sel-r-${idx}`} className="flex gap-2"><i className="fa-solid fa-check-circle mt-1 text-emerald-500" />{reason}</li>)}
              </ul>
            </div>

            {selected.automation ? (
              <div className="mt-5 rounded-3xl border border-indigo-200 bg-indigo-50/70 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/25">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-3 py-1 text-[11px] font-black text-white">
                      <i className="fa-solid fa-wand-magic-sparkles" /> اتوماسیون وصول هوشمند
                    </div>
                    <h3 className="mt-3 font-black text-slate-900 dark:text-slate-100">{selected.automation.recommendedActionLabel || 'اقدام پیشنهادی'}</h3>
                    <p className="mt-1 text-sm font-bold text-slate-600 dark:text-slate-300">{selected.automation.reason}</p>
                  </div>
                  <button type="button" disabled={Boolean(actingId)} onClick={() => { void runSmartRecommendedAction(selected); }} className="min-h-[42px] rounded-2xl bg-indigo-600 px-4 text-xs font-black text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-500 disabled:opacity-60">
                    <i className="fa-solid fa-robot ml-1" /> ثبت اقدام پیشنهادی
                  </button>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <div className="rounded-2xl bg-white/80 p-3 dark:bg-slate-950/45"><div className="text-[11px] font-black text-slate-500">پیگیری بی‌نتیجه</div><div className="mt-1 text-base font-black">{Number(selected.automation.unansweredAttempts || 0).toLocaleString('fa-IR')}</div></div>
                  <div className="rounded-2xl bg-white/80 p-3 dark:bg-slate-950/45"><div className="text-[11px] font-black text-slate-500">موعد پیشنهادی بعدی</div><div className="mt-1 text-sm font-black">{shamsi(selected.automation.suggestedNextFollowupDate)}</div></div>
                  <div className="rounded-2xl bg-white/80 p-3 dark:bg-slate-950/45"><div className="text-[11px] font-black text-slate-500">سطح بعد از هوش</div><div className="mt-1 text-sm font-black">{selected.automation.adjustedLabel || selected.label} — {Number(selected.automation.adjustedScore || selected.score || 0).toLocaleString('fa-IR')}</div></div>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="rounded-2xl border border-indigo-100 bg-white p-3 dark:border-indigo-900/50 dark:bg-slate-950/60">
                    <div className="flex items-center justify-between gap-2"><span className="text-xs font-black text-slate-500">اسکریپت تماس</span><button type="button" onClick={() => { void copySmartText(selected.automation?.callScript, 'اسکریپت تماس'); }} className="rounded-xl bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-700 dark:bg-slate-800 dark:text-slate-100">کپی</button></div>
                    <p className="mt-2 whitespace-pre-line text-sm font-bold leading-7 text-slate-700 dark:text-slate-200">{selected.automation.callScript}</p>
                  </div>
                  <div className="rounded-2xl border border-indigo-100 bg-white p-3 dark:border-indigo-900/50 dark:bg-slate-950/60">
                    <div className="flex items-center justify-between gap-2"><span className="text-xs font-black text-slate-500">پیامک پیشنهادی</span><button type="button" onClick={() => { void copySmartText(selected.automation?.smsText, 'پیامک پیشنهادی'); }} className="rounded-xl bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-700 dark:bg-slate-800 dark:text-slate-100">کپی</button></div>
                    <p className="mt-2 whitespace-pre-line text-sm font-bold leading-7 text-slate-700 dark:text-slate-200">{selected.automation.smsText}</p>
                  </div>
                  <div className="rounded-2xl border border-indigo-100 bg-white p-3 dark:border-indigo-900/50 dark:bg-slate-950/60">
                    <div className="flex items-center justify-between gap-2"><span className="text-xs font-black text-slate-500">تلگرام پیشنهادی</span><button type="button" onClick={() => { void copySmartText(selected.automation?.telegramText, 'متن تلگرام'); }} className="rounded-xl bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-700 dark:bg-slate-800 dark:text-slate-100">کپی</button></div>
                    <p className="mt-2 whitespace-pre-line text-sm font-bold leading-7 text-slate-700 dark:text-slate-200">{selected.automation.telegramText}</p>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl bg-white/75 p-3 dark:bg-slate-950/40">
                  <div className="text-xs font-black text-slate-500">پلن پیشنهادی سیستم</div>
                  <ul className="mt-2 space-y-1 text-sm font-bold text-slate-700 dark:text-slate-200">
                    {(selected.automation.touchPlan || []).map((step, idx) => <li key={`smart-step-${idx}`} className="flex gap-2"><i className="fa-solid fa-arrow-left mt-1 text-[10px] text-indigo-500" />{step}</li>)}
                  </ul>
                </div>
              </div>
            ) : null}

            <div className="mt-5 rounded-3xl border border-slate-200 p-4 dark:border-slate-800">
              <h3 className="font-black text-slate-900 dark:text-slate-100">ثبت اقدام سریع</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {ACTIONS.map((action) => (
                  <button key={action.key} type="button" disabled={Boolean(actingId)} onClick={() => { void runAction(selected, action.key); }} className={`inline-flex min-h-[42px] items-center gap-2 rounded-2xl px-3 text-xs font-black text-white shadow-sm transition disabled:opacity-60 ${action.tone}`}>
                    <i className={`fa-solid ${action.icon}`} /> {action.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 rounded-3xl border border-slate-200 p-4 dark:border-slate-800">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-black text-slate-900 dark:text-slate-100">تاریخچه همین سند</h3>
                <div className="flex flex-wrap gap-2">
                  <Link to={customerLedgerPath(selected.customerId)} className="rounded-2xl bg-slate-950 px-3 py-2 text-xs font-black text-white dark:bg-white dark:text-slate-950">پرونده مشتری</Link>
                  <Link to={sourceDocumentPath(selected)} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">سند مرتبط</Link>
                </div>
              </div>
              {(selected.history || []).length === 0 ? (
                <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500 dark:bg-slate-900">برای این سند هنوز اقدام ثبت نشده است.</div>
              ) : (
                <div className="mt-4 space-y-3">
                  {(selected.history || []).map((h) => (
                    <div key={h.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                      <div className="text-xs font-black text-slate-500">{shamsi(h.createdAt)} {h.createdByUsername ? `— ${h.createdByUsername}` : ''}</div>
                      <div className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-100">{cleanNote(h.note)}</div>
                      {h.nextFollowupDate ? <div className="mt-2 text-xs font-bold text-indigo-600">موعد بعدی: {shamsi(h.nextFollowupDate)}</div> : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
