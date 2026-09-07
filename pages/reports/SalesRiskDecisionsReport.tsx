import { formatExactNumberText } from '../../utils/exactNumber';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { reportNavigationAnchor, useReportDrilldownNavigation } from '../../hooks/useReportDrilldownNavigation';
import moment from 'jalali-moment';
import ModernReportShell from '../../components/reports/ModernReportShell';
import ReportDatePresetChips from '../../components/reports/ReportDatePresetChips';
import ShamsiDatePicker from '../../components/ShamsiDatePicker';
import AppSearchField from '../../components/ui/AppSearchField';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';
import Button from '../../components/Button';
import DataTableShell, { type DataTableColumn } from '../../components/ui/DataTableShell';
import { apiFetch } from '../../utils/apiFetch';
import { formatReportMoneyText } from '../../utils/reportPresentation';

type DecisionType = 'switch-to-cash' | 'return-to-credit' | 'other';
type RiskDecisionLog = {
  id: number;
  userId: number | null;
  username: string | null;
  role: string | null;
  entityId: number | null;
  description: string | null;
  createdAt: string;
  decisionType: DecisionType;
  customerName: string | null;
  trustScore: number | null;
  trustTier: string | null;
  grandTotal: number | null;
  suggestedCreditLimit: number | null;
  projectedCreditExposure: number | null;
  reason: string | null;
};

type RiskDecisionMeta = {
  totalCount: number;
  cashSwitchCount: number;
  creditReturnCount: number;
  uniqueCustomers: number;
  returnedCount: number;
  hasRecordedDecisions: boolean;
};

const initialMeta: RiskDecisionMeta = {
  totalCount: 0,
  cashSwitchCount: 0,
  creditReturnCount: 0,
  uniqueCustomers: 0,
  returnedCount: 0,
  hasRecordedDecisions: false,
};

const money = (value: unknown) => formatReportMoneyText(Number(value || 0));
const fa = (value: unknown) => formatExactNumberText(Number(value || 0));
const formatDate = (value?: string | null) => value
  ? new Intl.DateTimeFormat('fa-IR-u-ca-persian', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
  : '—';

const decisionMeta: Record<DecisionType, { label: string; icon: string; tone: string }> = {
  'switch-to-cash': { label: 'تغییر به نقدی', icon: 'fa-money-bill-wave', tone: 'success' },
  'return-to-credit': { label: 'بازگشت به اعتباری', icon: 'fa-file-invoice-dollar', tone: 'warning' },
  other: { label: 'تصمیم کنترلی', icon: 'fa-shield-halved', tone: 'neutral' },
};

const SalesRiskDecisionsReport: React.FC = () => {
  const [fromDate, setFromDate] = useState<Date>(() => moment().subtract(29, 'day').startOf('day').toDate());
  const [toDate, setToDate] = useState<Date>(() => new Date());
  const [rows, setRows] = useState<RiskDecisionLog[]>([]);
  const [meta, setMeta] = useState<RiskDecisionMeta>(initialMeta);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'cash' | 'credit'>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reportUiState = useMemo(() => ({
    fromDate: fromDate.toISOString(),
    toDate: toDate.toISOString(),
    filter,
    search,
  }), [filter, fromDate, search, toDate]);

  const restoreReportUiState = React.useCallback((state: Record<string, unknown>) => {
    if (state.fromDate) setFromDate(new Date(String(state.fromDate)));
    if (state.toDate) setToDate(new Date(String(state.toDate)));
    setFilter((['all', 'cash', 'credit'].includes(String(state.filter)) ? String(state.filter) : 'all') as 'all' | 'cash' | 'credit');
    setSearch(String(state.search || ''));
  }, []);

  const { onDrilldownClick } = useReportDrilldownNavigation({
    reportKey: 'sales-risk-decisions',
    uiState: reportUiState,
    restoreUiState: restoreReportUiState,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        limit: '300',
        from: moment(fromDate).format('YYYY-MM-DD'),
        to: moment(toDate).format('YYYY-MM-DD'),
      });
      const response = await apiFetch(`/api/reports/sales-risk-decisions?${params.toString()}`);
      const json = await response.json();
      if (!response.ok || json?.success === false) throw new Error(json?.message || 'دریافت لاگ تصمیم‌های ریسک انجام نشد.');
      setRows(Array.isArray(json?.data) ? json.data : []);
      setMeta({ ...initialMeta, ...(json?.meta || {}) });
      setGeneratedAt(json?.generatedAt || null);
    } catch (reason: any) {
      setRows([]);
      setMeta(initialMeta);
      setError(reason?.message || 'دریافت گزارش انجام نشد.');
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 180);
    return () => window.clearTimeout(timer);
  }, [load]);

  const visibleRows = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('fa');
    return rows.filter((row) => {
      if (filter === 'cash' && row.decisionType !== 'switch-to-cash') return false;
      if (filter === 'credit' && row.decisionType !== 'return-to-credit') return false;
      if (!needle) return true;
      return [row.customerName, row.username, row.role, row.reason, row.description, row.entityId]
        .some((value) => String(value ?? '').toLocaleLowerCase('fa').includes(needle));
    });
  }, [filter, rows, search]);

  const lastReceived = generatedAt ? formatDate(generatedAt) : '—';
  const columns = useMemo<DataTableColumn<RiskDecisionLog>[]>(() => [
    {
      id: 'decision',
      header: 'تصمیم و زمان',
      cell: (item) => {
        const tone = decisionMeta[item.decisionType] || decisionMeta.other;
        return <div className="sales-risk-table-cell"><span className={`sales-risk-status sales-risk-status--${tone.tone}`}><i className={`fa-solid ${tone.icon}`} />{tone.label}</span><small>{formatDate(item.createdAt)}</small></div>;
      },
    },
    {
      id: 'customer', header: 'مشتری',
      cell: (row) => <div className="sales-risk-table-cell"><strong>{row.customerName || 'مشتری ثبت‌نشده'}</strong><small>{row.entityId ? `شناسه ${fa(row.entityId)}` : 'بدون شناسه'}</small></div>,
    },
    {
      id: 'risk', header: 'جزئیات ریسک',
      cell: (row) => <div className="sales-risk-table-cell"><strong>{row.reason || row.trustTier || 'علت تکمیلی ثبت نشده'}</strong><small>{row.trustScore == null ? 'امتیاز اعتماد ثبت نشده' : `امتیاز اعتماد: ${fa(row.trustScore)} از ۱۰۰`}</small></div>,
    },
    {
      id: 'amounts', header: 'مبالغ',
      cell: (row) => <div className="sales-risk-table-cell"><strong>{row.grandTotal == null ? '—' : money(row.grandTotal)}</strong><small>{row.projectedCreditExposure == null ? 'تعهد ثبت نشده' : `تعهد پس از فروش: ${money(row.projectedCreditExposure)}`}</small></div>,
    },
    {
      id: 'operator', header: 'ثبت‌کننده',
      cell: (row) => <div className="sales-risk-table-cell"><strong>{row.username || 'کاربر نامشخص'}</strong><small>{row.role || 'نقش ثبت نشده'}</small></div>,
    },
    {
      id: 'access', header: 'دسترسی',
      cell: (row) => row.entityId ? <Link className="sales-risk-customer-link" to={`/customers/${row.entityId}`} onClick={(event) => onDrilldownClick(event, `/customers/${row.entityId}`, { contextLabel: `تصمیم ریسک #${formatExactNumberText(row.id)} • ${row.username || 'کاربر'}`, anchorId: reportNavigationAnchor('sales-risk-decisions', row.id) })}><i className="fa-regular fa-user" />پرونده مشتری</Link> : '—',
    },
  ], [onDrilldownClick]);

  return (
    <ModernReportShell
      title="لاگ تصمیم‌های ریسک فروش"
      subtitle="ردیابی واقعی تغییر روش پرداخت مشتریان پرریسک و تصمیم‌های ثبت‌شده اپراتورها"
      icon={<i className="fa-solid fa-shield-halved" />}
    >
      <div className="sales-risk-report" data-report-source="sqlite-audit-logs">
        <section className="sales-risk-source" aria-label="منبع داده گزارش">
          <div><span><i className="fa-solid fa-database" /></span><p><strong>متصل به لاگ عملیاتی فروشگاه</strong><small>اطلاعات فقط از رویدادهای عملیاتی و پرونده واقعی مشتری خوانده می‌شود.</small></p></div>
          <p><i className="fa-regular fa-clock" /> آخرین دریافت: {lastReceived}</p>
        </section>

        <section className="sales-risk-controls" aria-label="فیلترهای لاگ ریسک">
          <ReportDatePresetChips fromDate={fromDate} toDate={toDate} includeLast30 className="sales-risk-presets" onChange={({ from, to }) => { setFromDate(from); setToDate(to); }} />
          <label className="sales-risk-field"><span><i className="fa-regular fa-calendar" />از تاریخ</span><ShamsiDatePicker selectedDate={fromDate} onDateChange={(date) => date && setFromDate(date)} hideIcon className="sales-risk-date" /></label>
          <label className="sales-risk-field"><span><i className="fa-regular fa-calendar-check" />تا تاریخ</span><ShamsiDatePicker selectedDate={toDate} onDateChange={(date) => date && setToDate(date)} hideIcon className="sales-risk-date" /></label>
          <div className="sales-risk-search"><span><i className="fa-solid fa-magnifying-glass" />جستجو</span><AppSearchField value={search} onChange={setSearch} placeholder="مشتری، کاربر یا علت تصمیم…" ariaLabel="جستجو در لاگ ریسک" clearable /></div>
          <Button variant="primary" size="sm" autoIcon={false} leftIcon={<i className={`fa-solid fa-rotate ${loading ? 'fa-spin' : ''}`} />} className="sales-risk-refresh" onClick={() => void load()} disabled={loading}>بازخوانی</Button>
        </section>

        {error ? <section className="sales-risk-error" role="alert"><i className="fa-solid fa-triangle-exclamation" /><div><strong>دریافت گزارش انجام نشد</strong><small>{error}</small></div><Button variant="neutral" size="xs" onClick={() => void load()}>تلاش دوباره</Button></section> : null}

        {loading ? (
          <div className="sales-risk-loading"><div>{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="sales-risk-loading__kpi" rounded="xl" />)}</div><Skeleton className="sales-risk-loading__table" rounded="xl" /></div>
        ) : !error ? (
          <>
            <section className="sales-risk-kpis" aria-label="خلاصه تصمیم‌های ریسک">
              {[
                { label: 'کل تصمیم‌ها', value: meta.totalCount, icon: 'fa-list-check', tone: 'primary' },
                { label: 'تغییر به نقدی', value: meta.cashSwitchCount, icon: 'fa-money-bill-wave', tone: 'success' },
                { label: 'بازگشت به اعتباری', value: meta.creditReturnCount, icon: 'fa-file-invoice-dollar', tone: 'warning' },
                { label: 'مشتریان درگیر', value: meta.uniqueCustomers, icon: 'fa-users', tone: 'neutral' },
              ].map((item) => <article key={item.label} className={`sales-risk-kpi sales-risk-kpi--${item.tone}`}><span><i className={`fa-solid ${item.icon}`} /></span><div><small>{item.label}</small><strong>{fa(item.value)}</strong><p>بر اساس رویدادهای ثبت‌شده</p></div></article>)}
            </section>

            <section className="sales-risk-log">
              <header><div><h2>سوابق تصمیم‌های کنترلی</h2><p>فقط تغییر روش پرداختی که توسط کاربر ثبت شده باشد در این فهرست قرار می‌گیرد.</p></div><span>{fa(visibleRows.length)} نتیجه</span></header>
              <div className="sales-risk-filter-tabs" role="group" aria-label="نوع تصمیم">
                {[
                  { key: 'all', label: 'همه تصمیم‌ها' },
                  { key: 'cash', label: 'تغییر به نقدی' },
                  { key: 'credit', label: 'بازگشت به اعتباری' },
                ].map((item) => <Button key={item.key} variant={filter === item.key ? 'primary' : 'neutral'} size="xs" autoIcon={false} aria-pressed={filter === item.key} onClick={() => setFilter(item.key as typeof filter)}>{item.label}</Button>)}
              </div>

              {!meta.hasRecordedDecisions ? (
                <EmptyState title="هنوز تصمیم ریسکی ثبت نشده است" description="در دیتابیس فعلی هیچ تغییر روش پرداخت پرریسکی ثبت نشده؛ پس از استفاده اپراتور از گزینه تغییر به نقدی یا بازگشت به اعتباری، رویداد واقعی اینجا نمایش داده می‌شود." tone="info" className="sales-risk-empty" />
              ) : visibleRows.length === 0 ? (
                <EmptyState title="نتیجه‌ای مطابق فیلتر پیدا نشد" description="نوع تصمیم، عبارت جستجو یا بازه زمانی را تغییر دهید." tone="info" className="sales-risk-empty" />
              ) : (
                <>
                  <DataTableShell rows={visibleRows} columns={columns} getRowKey={(row) => row.id} getRowProps={(row) => ({ 'data-navigation-anchor': reportNavigationAnchor('sales-risk-decisions', row.id) } as React.HTMLAttributes<HTMLTableRowElement>)} className="sales-risk-canonical-table" tableClassName="sales-risk-table" />
                  <div className="sales-risk-mobile-list">
                    {visibleRows.map((row) => {
                      const tone = decisionMeta[row.decisionType] || decisionMeta.other;
                      return <article key={row.id} data-navigation-anchor={reportNavigationAnchor('sales-risk-decisions', row.id)} className="sales-risk-mobile-card">
                        <header><span className={`sales-risk-status sales-risk-status--${tone.tone}`}><i className={`fa-solid ${tone.icon}`} />{tone.label}</span><small>{formatDate(row.createdAt)}</small></header>
                        <div><small>مشتری</small><strong>{row.customerName || 'مشتری ثبت‌نشده'}</strong></div>
                        <div><small>علت تصمیم</small><strong>{row.reason || row.trustTier || 'علت تکمیلی ثبت نشده'}</strong></div>
                        <div><small>مبلغ فروش</small><strong>{row.grandTotal == null ? '—' : money(row.grandTotal)}</strong></div>
                        <footer><span>{row.username || 'کاربر نامشخص'}</span>{row.entityId ? <Link to={`/customers/${row.entityId}`} onClick={(event) => onDrilldownClick(event, `/customers/${row.entityId}`, { contextLabel: `تصمیم ریسک #${formatExactNumberText(row.id)} • ${row.username || 'کاربر'}`, anchorId: reportNavigationAnchor('sales-risk-decisions', row.id) })}><i className="fa-regular fa-user" />پرونده مشتری</Link> : null}</footer>
                      </article>;
                    })}
                  </div>
                </>
              )}
            </section>
          </>
        ) : null}
      </div>
    </ModernReportShell>
  );
};

export default SalesRiskDecisionsReport;
