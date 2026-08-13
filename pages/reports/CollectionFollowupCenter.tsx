import { formatExactNumberText } from '../../utils/exactNumber';
import { formatReportMoneyText, formatReportPercentText } from '../../utils/reportPresentation';
import { ActionLink, AppSearchField, Button, CheckboxField, DialogShell, PanelCard, Surface, SurfaceHeader, type SurfaceTone } from '@/components/ui';
import { apiFetch } from "../../utils/apiFetch";
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { reportNavigationAnchor, useReportDrilldownNavigation } from '../../hooks/useReportDrilldownNavigation';
import moment from 'jalali-moment';
import ShamsiDatePicker from '../../components/ShamsiDatePicker';
import FinancialStatusBadge, { type FinancialStatusTone } from '../../components/FinancialStatusBadge';
import FilterChipsBar from '../../components/FilterChipsBar';
import Notification from '../../components/Notification';
import ReportControlDock, { ReportControlDateSection, ReportControlFilters, ReportControlFooter, ReportControlSearch, ReportControlStatus } from '../../components/reports/ReportControlDock';
import ReportDatePresetChips from '../../components/reports/ReportDatePresetChips';
import ReportFilterField from '../../components/reports/ReportFilterField';
import { useAuth } from '../../contexts/AuthContext';
import { useReportsExports } from '../../contexts/ReportsExportsContext';
import { exportToExcel } from '../../utils/exporters';
import type { NotificationMessage } from '../../types';
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

const LEVEL_META: Record<RiskLevel, { label: string; icon: string; badgeTone: FinancialStatusTone; surfaceTone: SurfaceTone }> = {
  all: { label: 'همه', icon: 'fa-list-check', badgeTone: 'neutral', surfaceTone: 'neutral' },
  critical: { label: 'بحرانی', icon: 'fa-triangle-exclamation', badgeTone: 'danger', surfaceTone: 'danger' },
  urgent: { label: 'فوری', icon: 'fa-bolt', badgeTone: 'warning', surfaceTone: 'warning' },
  followup: { label: 'نیازمند پیگیری', icon: 'fa-phone-volume', badgeTone: 'warning', surfaceTone: 'warning' },
  low: { label: 'کم‌ریسک', icon: 'fa-shield-heart', badgeTone: 'success', surfaceTone: 'success' },
};

const ACTIONS = [
  { key: 'call_done', label: 'تماس گرفتم', icon: 'fa-phone', variant: 'primary' },
  { key: 'message_sent', label: 'پیامک/تلگرام', icon: 'fa-paper-plane', variant: 'secondary' },
  { key: 'promise_payment', label: 'قول پرداخت', icon: 'fa-handshake', variant: 'success' },
  { key: 'move_tomorrow', label: 'انتقال به فردا', icon: 'fa-calendar-plus', variant: 'warning' },
  { key: 'reviewed', label: 'بررسی شد', icon: 'fa-check', variant: 'neutral' },
] as const satisfies ReadonlyArray<{ key: ActionKey; label: string; icon: string; variant: 'primary' | 'secondary' | 'success' | 'warning' | 'neutral' }>;

const KANBAN_COLUMNS: Array<{ stage: KanbanStage; label: string; description: string; icon: string; badgeTone: FinancialStatusTone; surfaceTone: SurfaceTone }> = [
  { stage: 'new', label: 'جدید', description: 'هنوز اقدام مشخصی ثبت نشده', icon: 'fa-sparkles', badgeTone: 'neutral', surfaceTone: 'neutral' },
  { stage: 'waiting', label: 'در انتظار پاسخ', description: 'تماس یا پیام ارسال شده و منتظر نتیجه هستیم', icon: 'fa-hourglass-half', badgeTone: 'info', surfaceTone: 'info' },
  { stage: 'promise', label: 'قول پرداخت', description: 'مشتری زمان یا مبلغ پرداخت را اعلام کرده', icon: 'fa-handshake', badgeTone: 'success', surfaceTone: 'success' },
  { stage: 'today', label: 'امروز پیگیری شود', description: 'موعد پیگیری امروز است یا به امروز منتقل شده', icon: 'fa-calendar-day', badgeTone: 'warning', surfaceTone: 'warning' },
  { stage: 'critical', label: 'بحرانی', description: 'پرریسک، دیرکردار یا افزایش‌یافته توسط سیستم', icon: 'fa-triangle-exclamation', badgeTone: 'danger', surfaceTone: 'danger' },
  { stage: 'settled', label: 'تسویه/بسته شد', description: 'برای امروز بسته یا بررسی نهایی شده', icon: 'fa-circle-check', badgeTone: 'success', surfaceTone: 'accent' },
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

const money = (value: number | undefined | null) => formatReportMoneyText(value || 0);
const percent = (value: number | undefined | null) => formatReportPercentText(value || 0);
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
  const pendingSelectedIdRef = useRef<string | null>(null);

  const reportUiState = useMemo(() => ({
    fromDate: fromDate?.toISOString() || '',
    toDate: toDate?.toISOString() || '',
    level,
    query,
    onlyUntouched,
    viewMode,
    selectedItemId: selected?.id || '',
  }), [fromDate, level, onlyUntouched, query, selected?.id, toDate, viewMode]);

  const restoreReportUiState = React.useCallback((state: Record<string, unknown>) => {
    if (state.fromDate) setFromDate(new Date(String(state.fromDate)));
    if (state.toDate) setToDate(new Date(String(state.toDate)));
    setLevel((String(state.level || 'all') as RiskLevel));
    setQuery(String(state.query || ''));
    setOnlyUntouched(Boolean(state.onlyUntouched));
    setViewMode(String(state.viewMode || 'list') === 'kanban' ? 'kanban' : 'list');
    pendingSelectedIdRef.current = String(state.selectedItemId || '') || null;
  }, []);

  const { onDrilldownClick } = useReportDrilldownNavigation({
    reportKey: 'collection-center',
    uiState: reportUiState,
    restoreUiState: restoreReportUiState,
  });

  useEffect(() => {
    const pendingId = pendingSelectedIdRef.current;
    if (!pendingId || items.length === 0) return;
    const match = items.find((item) => item.id === pendingId);
    if (match) setSelected(match);
    pendingSelectedIdRef.current = null;
  }, [items]);

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
      const res = await apiFetch(`/api/reports/collection-center?${qs.toString()}`, { headers: { Authorization: `Bearer ${token}` } });
      const js = await res.json();
      if (!res.ok || js?.success === false) throw new Error(js?.message || 'خطا در دریافت مرکز وصول');
      const backendItems = Array.isArray(js?.data?.items) ? js.data.items : [];
      setItems(backendItems);
      setSelected((current) => current ? (backendItems.find((item: CollectionItem) => item.id === current.id) || null) : null);
      setSummary(js?.data?.summary || { totalItems: 0, counts: { low: 0, followup: 0, urgent: 0, critical: 0, touchedToday: 0 }, totalOutstanding: 0, totalUnrecognizedProfit: 0, highestScore: 0 });
    } catch (e: any) {
      setNotification({ type: 'error', text: e?.message || 'خطا در دریافت اطلاعات' });
    } finally {
      setLoading(false);
    }
  };

  const runAction = async (item: CollectionItem, action: string, smartNote?: string, nextFollowupDate?: string | null) => {
    if (!token) return;
    setActingId(`${item.id}:${action}`);
    try {
      const res = await apiFetch('/api/reports/collection-center/actions', {
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

      // Source of truth is the persisted backend state. No browser overlay or synthetic counters are applied.
      await fetchData();
      setNotification({ type: 'success', text: js?.message || 'اقدام پیگیری در دیتابیس ثبت و گزارش از سرور بازخوانی شد.' });
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
    <div className="space-y-5" dir="rtl" data-ui-collection-followup-center="true">
      {notification ? <Notification message={notification} onClose={() => setNotification(null)} /> : null}

      <section aria-label="خلاصه مرکز پیگیری وصول">
        <SurfaceHeader
          kind="section"
          title="مرکز پیگیری وصول"
          subtitle="اولویت‌بندی پرونده‌های باز بر اساس مانده وصول، موعد پرداخت، پیگیری بعدی و ریسک"
          icon={<i className="fa-solid fa-hand-holding-dollar" aria-hidden="true" />}
          status={<FinancialStatusBadge label={`${formatExactNumberText(highRiskCount)} مورد فوری/بحرانی`} tone={highRiskCount > 0 ? 'danger' : 'success'} size="sm" />}
          className="mb-3"
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <PanelCard variant="metric" title="فوری/بحرانی" metricValue={formatExactNumberText(highRiskCount)} metricHint="اولویت‌های فوری" icon={<i className="fa-solid fa-triangle-exclamation" />} tone={highRiskCount > 0 ? 'danger' : 'success'} />
          <PanelCard variant="metric" title="مانده وصول" metricValue={money(summary.totalOutstanding)} metricHint="مبلغ دریافت‌نشده" icon={<i className="fa-solid fa-wallet" />} tone="warning" />
          <PanelCard variant="metric" title="اقدام امروز" metricValue={formatExactNumberText(summary.counts.touchedToday)} metricHint="پیگیری‌های ثبت‌شده" icon={<i className="fa-solid fa-calendar-check" />} tone="info" />
          <PanelCard variant="metric" title="بالاترین امتیاز" metricValue={`${formatExactNumberText(summary.highestScore)} / ۱۰۰`} metricHint="حداکثر ریسک" icon={<i className="fa-solid fa-gauge-high" />} tone={summary.highestScore >= 70 ? 'danger' : 'neutral'} />
          <PanelCard variant="metric" title="افزایش خودکار" metricValue={formatExactNumberText(Number(summary.counts.escalated || 0))} metricHint="Escalation ثبت‌شده" icon={<i className="fa-solid fa-arrow-trend-up" />} tone="neutral" />
        </div>
      </section>

      <ReportControlDock
        ariaLabel="کنترل گزارش مرکز پیگیری وصول"
        presentation="approved"
        title="کنترل گزارش"
        subtitle="بازه زمانی، سطح ریسک، جستجو و حالت نمایش مرکز وصول"
        icon={<i className="fa-solid fa-sliders" aria-hidden="true" />}
        footer={(
          <ReportControlFooter
            statuses={(
              <>
                <ReportControlStatus tone="info" icon={<i className="fa-regular fa-calendar" aria-hidden="true" />}>بازه فعال: {toJ(fromDate) || '—'} | {toJ(toDate) || '—'}</ReportControlStatus>
                <ReportControlStatus tone={highRiskCount > 0 ? 'info' : 'success'} icon={<i className="fa-solid fa-list-check" aria-hidden="true" />}>{formatExactNumberText(items.length)} پرونده نمایشی</ReportControlStatus>
                <ReportControlStatus tone="neutral" icon={<i className={`fa-solid ${viewMode === 'kanban' ? 'fa-table-columns' : 'fa-list'}`} aria-hidden="true" />}>{viewMode === 'kanban' ? 'نمای Kanban' : 'نمای فهرست'}</ReportControlStatus>
              </>
            )}
            actions={(
              <>
                <Button type="button" variant="secondary" size="md" onClick={exportExcel} leftIcon={<i className="fa-solid fa-file-excel" />} disabled={loading || items.length === 0}>خروجی اکسل</Button>
                <Button type="button" variant="primary" size="md" onClick={() => { void fetchData(); }} leftIcon={<i className="fa-solid fa-rotate" />} loading={loading}>محاسبه / به‌روزرسانی</Button>
              </>
            )}
          />
        )}
      >
        <ReportControlDateSection
          presets={<ReportDatePresetChips fromDate={fromDate} toDate={toDate} includeLast30 onChange={({ from, to }) => { setFromDate(from); setToDate(to); }} />}
          fromField={(
            <ReportFilterField label="از تاریخ" icon={<i className="fa-regular fa-calendar" />}>
              <ShamsiDatePicker selectedDate={fromDate} onChange={(date) => { setFromDate(date); if (date && toDate && date > toDate) setToDate(date); }} preview="از تاریخ" hideIcon />
            </ReportFilterField>
          )}
          toField={(
            <ReportFilterField label="تا تاریخ" icon={<i className="fa-regular fa-calendar-check" />}>
              <ShamsiDatePicker selectedDate={toDate} onChange={(date) => { setToDate(date); if (date && fromDate && date < fromDate) setFromDate(date); }} preview="تا تاریخ" hideIcon />
            </ReportFilterField>
          )}
        />

        <ReportControlFilters>
          <ReportFilterField label="سطح ریسک" icon={<i className="fa-solid fa-shield-halved" />} minWidthClassName="basis-full min-w-0">
            <FilterChipsBar
              ariaLabel="فیلتر سطح ریسک وصول"
              value={level}
              onChange={(key) => setLevel(key as RiskLevel)}
              chips={orderedLevels.map((lvl) => ({
                key: lvl,
                label: LEVEL_META[lvl].label,
                icon: `fa-solid ${LEVEL_META[lvl].icon}`,
                count: lvl === 'all' ? summary.totalItems : Number(summary.counts[lvl] || 0),
              }))}
            />
          </ReportFilterField>
          <ReportFilterField label="حالت نمایش" icon={<i className="fa-solid fa-layer-group" />} minWidthClassName="basis-full min-w-0 sm:basis-[15rem]">
            <FilterChipsBar
              ariaLabel="حالت نمایش مرکز وصول"
              value={viewMode}
              onChange={(key) => setViewMode(key as ViewMode)}
              chips={[
                { key: 'list', label: 'فهرست', icon: 'fa-solid fa-list' },
                { key: 'kanban', label: 'Kanban', icon: 'fa-solid fa-table-columns' },
              ]}
            />
          </ReportFilterField>
          <ReportFilterField label="پیگیری امروز" icon={<i className="fa-solid fa-bolt" />} minWidthClassName="basis-full min-w-0 sm:basis-[15rem]">
            <CheckboxField
              checked={onlyUntouched}
              onChange={(event) => setOnlyUntouched(event.target.checked)}
              label="فقط پیگیری‌نشده‌های امروز"
              description="مواردی که امروز برایشان اقدام ثبت نشده است"
              wrapperClassName="min-h-12 items-center rounded-2xl border border-[var(--ds-border-subtle)] px-3 py-2"
            />
          </ReportFilterField>
        </ReportControlFilters>

        <ReportControlSearch>
          <AppSearchField value={query} onChange={setQuery} clearable size="lg" ariaLabel="جستجو در مرکز پیگیری وصول" placeholder="مشتری، موبایل، شماره سند یا دلیل ریسک…" />
        </ReportControlSearch>
      </ReportControlDock>

      <PanelCard
        title="مبنای مرکز وصول"
        subtitle="فروش‌های قدیمی نیز اگر مانده باز، سررسید، چک/قسط یا پیگیری بعدی داشته باشند در این مرکز باقی می‌مانند."
        icon={<i className="fa-solid fa-diagram-project" aria-hidden="true" />}
        tone="info"
      >
        <div className="text-sm font-semibold leading-7 text-[var(--ds-text-muted)]">این صفحه ابزار عملیاتی وصول است؛ بازه تاریخ برای محدودکردن داده‌های قابل بررسی استفاده می‌شود، اما وجود مانده و موعد وصول همچنان مبنای اصلی اولویت‌بندی است.</div>
      </PanelCard>

      {viewMode === 'kanban' ? (
        <section aria-label="برد Kanban وصول">
          <SurfaceHeader
            kind="section"
            title="برد Kanban وصول"
            subtitle="کارت‌ها را بین ستون‌ها جابه‌جا کن تا وضعیت پیگیری در تاریخچه مشتری ثبت شود."
            icon={<i className="fa-solid fa-table-columns" aria-hidden="true" />}
            status={<FinancialStatusBadge label={`${formatExactNumberText(items.length)} کارت فعال`} tone="neutral" size="sm" />}
            className="mb-3"
          />
          {loading ? (
            <div className="py-10 text-center text-sm font-black text-[var(--ds-text-muted)]">در حال دریافت برد وصول...</div>
          ) : items.length === 0 ? (
            <div className="py-10 text-center">
              <i className="fa-solid fa-filter-circle-xmark text-3xl text-amber-600" aria-hidden="true" />
              <div className="mt-3 text-base font-black">کارت فعالی با فیلتر فعلی وجود ندارد</div>
              <p className="mt-1 text-sm font-semibold text-[var(--ds-text-muted)]">جستجو، سطح ریسک یا بازه پیگیری را پاک یا گسترده کن.</p>
            </div>
          ) : (
            <div className="grid gap-3 xl:grid-cols-6">
              {kanbanColumns.map((column) => (
                <div
                  key={column.stage}
                  onDragOver={handleKanbanDragOver}
                  onDragEnter={handleKanbanDragOver}
                  onDrop={(event) => handleKanbanDrop(column.stage, event)}
                  className={`min-h-[22rem] rounded-[26px] ${draggingItemId ? 'ring-2 ring-slate-300 dark:ring-slate-600' : ''}`}
                  data-kanban-stage={column.stage}
                >
                  <PanelCard
                    title={column.label}
                    subtitle={column.description}
                    icon={<i className={`fa-solid ${column.icon}`} aria-hidden="true" />}
                    actions={<FinancialStatusBadge label={formatExactNumberText(column.items.length)} tone={column.badgeTone} size="xs" />}
                    tone={column.surfaceTone}
                    className="h-full"
                  >
                    <div className="space-y-3">
                      {column.items.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-[var(--ds-border-subtle)] p-4 text-center text-xs font-black text-[var(--ds-text-muted)]">رها کن اینجا</div>
                      ) : column.items.map((item) => {
                        const meta = LEVEL_META[item.level];
                        return (
                          <Surface
                            key={`${column.stage}-${item.id}`}
                            draggable={!Boolean(actingId)}
                            onDragStart={(event) => { setDraggingItemId(item.id); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', item.id); }}
                            onDragEnd={() => setDraggingItemId(null)}
                            surface="glass"
                            variant="subtle"
                            scheme="adaptive"
                            className={`cursor-grab rounded-3xl p-3 transition hover:-translate-y-0.5 active:cursor-grabbing ${draggingItemId === item.id ? 'opacity-60 ring-2 ring-indigo-300' : ''}`}
                            title="برای تغییر وضعیت، کارت را بکش و روی ستون مقصد رها کن"
                            data-ui-collection-card="kanban"
                            data-navigation-anchor={reportNavigationAnchor('collection-center', item.id)}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="truncate text-sm font-black">{item.customerName}</div>
                                <div className="mt-1 text-[11px] font-bold text-[var(--ds-text-muted)]">#{formatExactNumberText(item.orderId)} — {item.sourceType === 'installment' ? 'اقساطی' : 'اعتباری'}</div>
                              </div>
                              <FinancialStatusBadge label={item.label} tone={meta.badgeTone} size="xs" />
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold">
                              <div><span className="block text-[var(--ds-text-muted)]">مانده</span><bdi>{money(item.outstandingAmount)}</bdi></div>
                              <div><span className="block text-[var(--ds-text-muted)]">وصول</span><bdi>{percent(item.collectionRate)}</bdi></div>
                            </div>
                            <div className="mt-3 line-clamp-2 text-[11px] font-semibold leading-5 text-[var(--ds-text-muted)]">{(item.reasons || [])[0] || 'نیازمند بررسی'}</div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Button type="button" variant="secondary" size="xs" onClick={() => setSelected(item)}>جزئیات</Button>
                              <ActionLink to={customerLedgerPath(item.customerId)} onClick={(event) => onDrilldownClick(event, customerLedgerPath(item.customerId), { contextLabel: `${item.customerName} • ${item.label}` })} variant="secondary" size="xs" leftIcon={<i className="fa-solid fa-user" />}>پرونده</ActionLink>
                              <ActionLink to={sourceDocumentPath(item)} onClick={(event) => onDrilldownClick(event, sourceDocumentPath(item), { contextLabel: `${item.customerName} • ${item.sourceType === 'installment' ? 'قرارداد اقساطی' : 'فاکتور اعتباری'} #${formatExactNumberText(item.orderId)}` })} variant="secondary" size="xs" leftIcon={<i className="fa-solid fa-file-invoice" />}>سند</ActionLink>
                              <Button type="button" variant="primary" size="xs" disabled={Boolean(actingId)} onClick={() => { void runSmartRecommendedAction(item); }} aria-label="ثبت اقدام هوشمند" tooltip="ثبت اقدام هوشمند" autoIcon={false}><i className="fa-solid fa-robot" /></Button>
                            </div>
                          </Surface>
                        );
                      })}
                    </div>
                  </PanelCard>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="grid gap-3 xl:grid-cols-2" aria-label="فهرست پرونده‌های وصول">
          {loading ? (
            <PanelCard className="xl:col-span-2"><div className="py-10 text-center text-sm font-black text-[var(--ds-text-muted)]">در حال دریافت اولویت‌های وصول...</div></PanelCard>
          ) : items.length === 0 ? (
            <PanelCard className="xl:col-span-2" tone="warning" title="با فیلتر فعلی موردی نمایش داده نمی‌شود" subtitle="برای دیدن همه موارد، جستجو را پاک کن و سطح ریسک را روی «همه» بگذار." icon={<i className="fa-solid fa-filter-circle-xmark" />}>
              <Button type="button" variant="warning" size="md" onClick={() => { setQuery(''); setLevel('all'); setOnlyUntouched(false); setFromDate(moment().subtract(24, 'months').toDate()); setToDate(new Date()); }} leftIcon={<i className="fa-solid fa-rotate-left" />}>نمایش همه موارد قابل پیگیری</Button>
            </PanelCard>
          ) : items.map((item) => {
            const meta = LEVEL_META[item.level];
            const stageMeta = kanbanMeta(item.kanbanStage);
            return (
              <PanelCard
                key={item.id}
                data-navigation-anchor={reportNavigationAnchor('collection-center', item.id)}
                title={item.customerName}
                subtitle={`${item.sourceType === 'installment' ? 'فروش اقساطی' : 'فاکتور اعتباری'} #${formatExactNumberText(item.orderId)} — ${shamsi(item.transactionDate)}`}
                icon={<i className={`fa-solid ${meta.icon}`} aria-hidden="true" />}
                tone={meta.surfaceTone}
                actions={(
                  <div className="flex flex-wrap gap-2">
                    <FinancialStatusBadge label={item.label} tone={meta.badgeTone} size="xs" />
                    <FinancialStatusBadge label={item.kanbanStageLabel || stageMeta.label} tone={stageMeta.badgeTone} icon={`fa-solid ${stageMeta.icon}`} size="xs" />
                    {item.touchedToday ? <FinancialStatusBadge label="امروز پیگیری شد" tone="success" size="xs" /> : null}
                  </div>
                )}
                footer={(
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" size="sm" onClick={() => setSelected(item)}>جزئیات</Button>
                    <ActionLink to={customerLedgerPath(item.customerId)} onClick={(event) => onDrilldownClick(event, customerLedgerPath(item.customerId), { contextLabel: `${item.customerName} • ${item.label}` })} variant="secondary" size="sm" leftIcon={<i className="fa-solid fa-user" />}>پرونده مشتری</ActionLink>
                    <ActionLink to={sourceDocumentPath(item)} onClick={(event) => onDrilldownClick(event, sourceDocumentPath(item), { contextLabel: `${item.customerName} • ${item.sourceType === 'installment' ? 'قرارداد اقساطی' : 'فاکتور اعتباری'} #${formatExactNumberText(item.orderId)}` })} variant="secondary" size="sm" leftIcon={<i className="fa-solid fa-file-invoice" />}>{item.sourceType === 'installment' ? 'جزئیات اقساط' : 'سند فروش'}</ActionLink>
                  </div>
                )}
              >
                <div className="grid gap-x-5 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div><div className="text-xs font-bold text-[var(--ds-text-muted)]">مانده وصول</div><div className="mt-1 font-black"><bdi>{money(item.outstandingAmount)}</bdi></div></div>
                  <div><div className="text-xs font-bold text-[var(--ds-text-muted)]">درصد وصول</div><div className="mt-1 font-black"><bdi>{percent(item.collectionRate)}</bdi></div></div>
                  <div><div className="text-xs font-bold text-[var(--ds-text-muted)]">سود وصول‌نشده</div><div className="mt-1 font-black"><bdi>{money(item.unrecognizedProfit)}</bdi></div></div>
                  <div><div className="text-xs font-bold text-[var(--ds-text-muted)]">تأخیر</div><div className="mt-1 font-black">{formatExactNumberText(Number(item.overdueDays || 0))} روز</div></div>
                </div>
                <div className="mt-4 border-t border-[var(--ds-border-subtle)] pt-3">
                  <div className="text-xs font-black text-[var(--ds-text-muted)]">چرا این اولویت؟</div>
                  <ul className="mt-2 space-y-1 text-sm font-semibold">
                    {(item.reasons || []).slice(0, 3).map((reason, idx) => <li key={`${item.id}-r-${idx}`} className="flex gap-2"><i className="fa-solid fa-circle-info mt-1 text-[10px] text-[var(--ds-text-muted)]" />{reason}</li>)}
                  </ul>
                </div>
                {item.automation ? (
                  <div className="mt-4 border-t border-[var(--ds-border-subtle)] pt-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <FinancialStatusBadge label={item.automation.label || 'اتوماسیون وصول'} tone="info" icon="fa-solid fa-wand-magic-sparkles" size="xs" />
                        <div className="mt-2 text-sm font-black">اقدام پیشنهادی: {item.automation.recommendedActionLabel || 'پیگیری'}</div>
                        <div className="mt-1 text-xs font-semibold text-[var(--ds-text-muted)]">{item.automation.reason}</div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="secondary" size="xs" onClick={() => { void copySmartText(item.automation?.smsText, 'پیام پیشنهادی'); }} leftIcon={<i className="fa-solid fa-copy" />}>کپی پیام</Button>
                        <Button type="button" variant="primary" size="xs" disabled={Boolean(actingId)} onClick={() => { void runSmartRecommendedAction(item); }} leftIcon={<i className="fa-solid fa-robot" />}>ثبت اقدام پیشنهادی</Button>
                      </div>
                    </div>
                  </div>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--ds-border-subtle)] pt-3">
                  {ACTIONS.map((action) => (
                    <Button key={action.key} type="button" variant={action.variant} size="xs" disabled={Boolean(actingId)} onClick={() => { void runAction(item, action.key); }} leftIcon={<i className={`fa-solid ${action.icon}`} />}>{action.label}</Button>
                  ))}
                </div>
              </PanelCard>
            );
          })}
        </section>
      )}

      <DialogShell
        isOpen={Boolean(selected)}
        onClose={() => setSelected(null)}
        layer="drawer"
        surface="glass"
        surfaceVariant="panel"
        surfaceScheme="adaptive"
        ariaLabel="جزئیات پرونده وصول"
        backdropDataId="collection-followup"
        panelDataId="collection-followup-panel"
        overlayClassName="!items-stretch !justify-end !p-0 sm:!p-3"
        panelClassName="!h-dvh !max-h-dvh !w-full !overflow-y-auto !overscroll-contain sm:!h-auto sm:!max-h-[calc(100dvh-1.5rem)] sm:!max-w-2xl sm:!rounded-[26px]"
        panelAttributes={{ 'data-report-drawer-surface': 'true' }}
      >
        {selected ? (
          <div className="min-w-0 space-y-4 p-4 sm:p-5" data-report-drawer-frame="true">
            <div className="flex items-start justify-between gap-3 border-b border-[var(--ds-border-subtle)] pb-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <FinancialStatusBadge label={selected.label} tone={LEVEL_META[selected.level].badgeTone} size="sm" />
                  <FinancialStatusBadge label={`امتیاز ${formatExactNumberText(selected.score)} / ۱۰۰`} tone="neutral" size="sm" />
                </div>
                <h2 className="mt-3 truncate text-xl font-black">{selected.customerName}</h2>
                <p className="mt-1 text-sm font-semibold text-[var(--ds-text-muted)]">{selected.sourceType === 'installment' ? 'فروش اقساطی' : 'فاکتور اعتباری'} #{formatExactNumberText(selected.orderId)} — {selected.customerPhone || 'موبایل ثبت نشده'}</p>
              </div>
              <Button type="button" variant="ghost" size="icon" aria-label="بستن جزئیات وصول" tooltip="بستن" onClick={() => setSelected(null)} autoIcon={false}><i className="fa-solid fa-xmark" /></Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <PanelCard variant="metric" title="مانده وصول" metricValue={money(selected.outstandingAmount)} metricHint={`وصول ${percent(selected.collectionRate)}`} icon={<i className="fa-solid fa-wallet" />} tone="warning" />
              <PanelCard variant="metric" title="سود وصول‌نشده" metricValue={money(selected.unrecognizedProfit)} metricHint={`${formatExactNumberText(Number(selected.overdueDays || 0))} روز تأخیر`} icon={<i className="fa-solid fa-chart-line" />} tone="warning" />
            </div>

            <PanelCard title="وضعیت Kanban" icon={<i className="fa-solid fa-table-columns" />} actions={<FinancialStatusBadge label={selected.kanbanStageLabel || kanbanMeta(selected.kanbanStage).label} tone={kanbanMeta(selected.kanbanStage).badgeTone} icon={`fa-solid ${kanbanMeta(selected.kanbanStage).icon}`} size="xs" />}>
              <div className="flex flex-wrap gap-2">
                {KANBAN_COLUMNS.map((col) => (
                  <Button key={`sel-kanban-${col.stage}`} type="button" variant={selected.kanbanStage === col.stage ? 'neutral' : 'secondary'} size="xs" disabled={Boolean(actingId) || selected.kanbanStage === col.stage} onClick={() => { void moveKanbanItem(selected, col.stage); }}>{col.label}</Button>
                ))}
              </div>
            </PanelCard>

            <PanelCard title="دلایل اولویت" icon={<i className="fa-solid fa-circle-info" />}>
              <ul className="space-y-2 text-sm font-semibold">
                {(selected.reasons || []).map((reason, idx) => <li key={`sel-r-${idx}`} className="flex gap-2"><i className="fa-solid fa-check-circle mt-1 text-emerald-500" />{reason}</li>)}
              </ul>
            </PanelCard>

            {selected.automation ? (
              <PanelCard
                title="اتوماسیون وصول هوشمند"
                subtitle={selected.automation.reason}
                icon={<i className="fa-solid fa-wand-magic-sparkles" />}
                tone="info"
                actions={<Button type="button" variant="primary" size="sm" disabled={Boolean(actingId)} onClick={() => { void runSmartRecommendedAction(selected); }} leftIcon={<i className="fa-solid fa-robot" />}>ثبت اقدام پیشنهادی</Button>}
              >
                <div className="grid gap-3 sm:grid-cols-3">
                  <div><div className="text-xs font-bold text-[var(--ds-text-muted)]">پیگیری بی‌نتیجه</div><div className="mt-1 font-black">{formatExactNumberText(Number(selected.automation.unansweredAttempts || 0))}</div></div>
                  <div><div className="text-xs font-bold text-[var(--ds-text-muted)]">موعد پیشنهادی بعدی</div><div className="mt-1 font-black">{shamsi(selected.automation.suggestedNextFollowupDate)}</div></div>
                  <div><div className="text-xs font-bold text-[var(--ds-text-muted)]">سطح بعد از تحلیل</div><div className="mt-1 font-black">{selected.automation.adjustedLabel || selected.label} — {formatExactNumberText(Number(selected.automation.adjustedScore || selected.score || 0))}</div></div>
                </div>
                <div className="mt-4 space-y-4 border-t border-[var(--ds-border-subtle)] pt-4">
                  {[
                    { label: 'اسکریپت تماس', text: selected.automation.callScript },
                    { label: 'پیامک پیشنهادی', text: selected.automation.smsText },
                    { label: 'تلگرام پیشنهادی', text: selected.automation.telegramText },
                  ].map((entry) => (
                    <div key={entry.label}>
                      <div className="flex items-center justify-between gap-2"><span className="text-xs font-black text-[var(--ds-text-muted)]">{entry.label}</span><Button type="button" variant="ghost" size="xs" onClick={() => { void copySmartText(entry.text, entry.label); }}>کپی</Button></div>
                      <p className="mt-2 whitespace-pre-line text-sm font-semibold leading-7">{entry.text}</p>
                    </div>
                  ))}
                </div>
                {(selected.automation.touchPlan || []).length ? (
                  <div className="mt-4 border-t border-[var(--ds-border-subtle)] pt-4">
                    <div className="text-xs font-black text-[var(--ds-text-muted)]">پلن پیشنهادی سیستم</div>
                    <ul className="mt-2 space-y-1 text-sm font-semibold">
                      {(selected.automation.touchPlan || []).map((step, idx) => <li key={`smart-step-${idx}`} className="flex gap-2"><i className="fa-solid fa-arrow-left mt-1 text-[10px] text-indigo-500" />{step}</li>)}
                    </ul>
                  </div>
                ) : null}
              </PanelCard>
            ) : null}

            <PanelCard title="ثبت اقدام سریع" icon={<i className="fa-solid fa-bolt" />}>
              <div className="flex flex-wrap gap-2">
                {ACTIONS.map((action) => (
                  <Button key={action.key} type="button" variant={action.variant} size="sm" disabled={Boolean(actingId)} onClick={() => { void runAction(selected, action.key); }} leftIcon={<i className={`fa-solid ${action.icon}`} />}>{action.label}</Button>
                ))}
              </div>
            </PanelCard>

            <PanelCard
              title="تاریخچه همین سند"
              icon={<i className="fa-solid fa-clock-rotate-left" />}
              actions={(
                <div className="flex flex-wrap gap-2">
                  <ActionLink to={customerLedgerPath(selected.customerId)} onClick={(event) => onDrilldownClick(event, customerLedgerPath(selected.customerId), { contextLabel: `${selected.customerName} • ${selected.label}`, anchorId: reportNavigationAnchor('collection-center', selected.id) })} variant="primary" size="xs">پرونده مشتری</ActionLink>
                  <ActionLink to={sourceDocumentPath(selected)} onClick={(event) => onDrilldownClick(event, sourceDocumentPath(selected), { contextLabel: `${selected.customerName} • ${selected.sourceType === 'installment' ? 'قرارداد اقساطی' : 'فاکتور اعتباری'} #${formatExactNumberText(selected.orderId)}`, anchorId: reportNavigationAnchor('collection-center', selected.id) })} variant="secondary" size="xs">سند مرتبط</ActionLink>
                </div>
              )}
            >
              {(selected.history || []).length === 0 ? (
                <div className="text-sm font-semibold text-[var(--ds-text-muted)]">برای این سند هنوز اقدام ثبت نشده است.</div>
              ) : (
                <div className="space-y-3">
                  {(selected.history || []).map((h) => (
                    <Surface key={h.id} surface="glass" variant="subtle" scheme="adaptive" className="rounded-2xl p-3">
                      <div className="text-xs font-black text-[var(--ds-text-muted)]">{shamsi(h.createdAt)} {h.createdByUsername ? `— ${h.createdByUsername}` : ''}</div>
                      <div className="mt-1 text-sm font-semibold">{cleanNote(h.note)}</div>
                      {h.nextFollowupDate ? <div className="mt-2 text-xs font-bold text-indigo-600">موعد بعدی: {shamsi(h.nextFollowupDate)}</div> : null}
                    </Surface>
                  ))}
                </div>
              )}
            </PanelCard>
          </div>
        ) : null}
      </DialogShell>
    </div>
  );
}
