import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import moment from 'jalali-moment';
import {
  ActionLink,
  Button,
  DataTableShell,
  PageKit,
  PanelCard,
  SelectField,
  SurfaceHeader,
  type SurfaceTone,
} from '@/components/ui';
import FinancialStatusBadge, { type FinancialStatusTone } from '../../components/FinancialStatusBadge';
import ShamsiDatePicker from '../../components/ShamsiDatePicker';
import ReportDatePresetChips from '../../components/reports/ReportDatePresetChips';
import ReportFilterField from '../../components/reports/ReportFilterField';
import ReportControlDock, {
  ReportControlDateSection,
  ReportControlFilters,
  ReportControlFooter,
  ReportControlStatus,
} from '../../components/reports/ReportControlDock';
import { apiFetch } from '../../utils/apiFetch';
import { formatExactNumberText } from '../../utils/exactNumber';
import { formatReportPercentText } from '../../utils/reportPresentation';
import { reportNavigationAnchor, useReportDrilldownNavigation } from '../../hooks/useReportDrilldownNavigation';

type Severity = 'critical' | 'warning' | 'info';
type Area = 'sales' | 'profit' | 'payments' | 'inventory' | 'partners';

type AuditIssue = {
  id: string;
  severity: Severity;
  area: Area;
  title: string;
  description: string;
  entityType: string;
  entityId?: number | string | null;
  expected?: number;
  actual?: number;
  difference?: number;
  actionHint: string;
};

type AuditData = {
  score: number;
  counts: { total: number; critical: number; warning: number; info: number; byArea: Record<string, number> };
  issues: AuditIssue[];
  sampled: Record<string, number>;
  range: { fromISO: string; toISO: string };
};

const toISODate = (d: Date) => moment(d).locale('en').format('YYYY-MM-DD');
const toJalali = (d: Date) => moment(d).locale('fa').format('jYYYY/jMM/jDD');
const startOfCurrentJalaliMonth = () => moment().startOf('jMonth').startOf('day').toDate();

const cleanAuditText = (value?: string | null) => {
  const raw = String(value || '').trim();
  if (!raw) return '—';
  if (/^collection:/i.test(raw)) return 'نیازمند بررسی وضعیت وصول و اتصال سند';
  if (/^action:/i.test(raw)) return raw.replace(/^action:/i, '').replace(/[:_]+/g, ' ').trim() || 'نیازمند بررسی دستی';
  return raw.replace(/collection:[\w:-]+/gi, 'وضعیت وصول').replace(/action:[\w:-]+/gi, 'اقدام سیستمی');
};

const entityTypeLabel: Record<string, string> = {
  invoice: 'فاکتور',
  order: 'سفارش',
  payment: 'پرداخت',
  receipt: 'رسید',
  installment: 'قسط',
  partner: 'همکار',
  product: 'کالا',
  inventory: 'موجودی',
};

const fromISODate = (value: string | null, fallback: Date) => {
  if (!value) return fallback;
  const d = new Date(`${value}T12:00:00`);
  return Number.isFinite(d.getTime()) ? d : fallback;
};

const fmt = (n?: number) => (Number.isFinite(Number(n)) ? formatExactNumberText(Number(n)) : '—');

const severityMeta: Record<Severity, { label: string; tone: FinancialStatusTone }> = {
  critical: { label: 'بحرانی', tone: 'danger' },
  warning: { label: 'هشدار', tone: 'warning' },
  info: { label: 'اطلاع', tone: 'info' },
};

const areaLabel: Record<Area, string> = {
  sales: 'فروش و فاکتور',
  profit: 'سود و بهای تمام‌شده',
  payments: 'پرداخت و وصول',
  inventory: 'موجودی',
  partners: 'همکاران',
};

const areaDrilldown: Record<Area, string> = {
  sales: '/reports/sales-summary',
  profit: '/reports/product-profit-real',
  payments: '/reports/aging-receivables',
  inventory: '/reports/analysis/inventory',
  partners: '/reports/partners-performance',
};

const healthTone = (score: number): { surface: SurfaceTone; badge: FinancialStatusTone } => {
  if (score >= 96) return { surface: 'success', badge: 'success' };
  if (score >= 85) return { surface: 'info', badge: 'info' };
  if (score >= 70) return { surface: 'warning', badge: 'warning' };
  return { surface: 'danger', badge: 'danger' };
};

export default function FinancialAuditReport() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const initialRange = useMemo(() => {
    const sp = new URLSearchParams(search || '');
    return {
      from: fromISODate(sp.get('fromISO'), startOfCurrentJalaliMonth()),
      to: fromISODate(sp.get('toISO'), new Date()),
    };
  }, [search]);

  const [fromDate, setFromDate] = useState<Date>(() => initialRange.from);
  const [toDate, setToDate] = useState<Date>(() => initialRange.to);
  const [data, setData] = useState<AuditData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [severity, setSeverity] = useState<'all' | Severity>('all');
  const [area, setArea] = useState<'all' | Area>('all');

  const subtitle = useMemo(() => `بازه ممیزی: ${toJalali(fromDate)} تا ${toJalali(toDate)}`, [fromDate, toDate]);

  const load = async () => {
    setIsLoading(true);
    setErr(null);
    try {
      const res = await apiFetch(`/api/reports/financial-audit?fromISO=${encodeURIComponent(toISODate(fromDate))}&toISO=${encodeURIComponent(toISODate(toDate))}`);
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.message || 'خطا در دریافت ممیزی گزارشات');
      setData(json.data as AuditData);
    } catch (e: any) {
      setErr(e?.message || 'خطا در دریافت ممیزی گزارشات');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, toDate]);

  const filteredIssues = useMemo(() => {
    const rows = data?.issues || [];
    return rows.filter((row) => (severity === 'all' || row.severity === severity) && (area === 'all' || row.area === area));
  }, [data, severity, area]);

  const reportUiState = useMemo(() => ({
    fromDate: fromDate.toISOString(),
    toDate: toDate.toISOString(),
    severity,
    area,
  }), [area, fromDate, severity, toDate]);

  const restoreReportUiState = useCallback((state: Record<string, unknown>) => {
    if (state.fromDate) setFromDate(new Date(String(state.fromDate)));
    if (state.toDate) setToDate(new Date(String(state.toDate)));
    const restoredSeverity = String(state.severity || 'all');
    setSeverity((['all', 'critical', 'warning', 'info'].includes(restoredSeverity) ? restoredSeverity : 'all') as 'all' | Severity);
    const restoredArea = String(state.area || 'all');
    setArea((['all', 'sales', 'profit', 'payments', 'inventory', 'partners'].includes(restoredArea) ? restoredArea : 'all') as 'all' | Area);
  }, []);

  const { onDrilldownClick } = useReportDrilldownNavigation({
    reportKey: 'financial-audit',
    uiState: reportUiState,
    restoreUiState: restoreReportUiState,
  });

  const activeFrom = toJalali(fromDate);
  const activeTo = toJalali(toDate);
  const resolvedHealthTone = healthTone(Number(data?.score || 0));

  const controlDock = (
    <ReportControlDock
      ariaLabel="کنترل گزارش حسابرسی مالی"
      presentation="approved"
      title="کنترل گزارش"
      subtitle="بازه زمانی و فیلترهای ممیزی اختلاف اسناد مالی"
      icon={<i className="fa-solid fa-sliders" aria-hidden="true" />}
      footer={(
        <ReportControlFooter
          ariaLabel="عملیات و وضعیت حسابرسی مالی"
          statuses={(
            <>
              <ReportControlStatus tone="info" icon={<i className="fa-regular fa-calendar" aria-hidden="true" />}>
                <span className="whitespace-nowrap">بازه فعال:</span>
                <bdi dir="ltr" className="font-black">{activeFrom}</bdi>
                <span aria-hidden="true" className="font-black text-[var(--ds-text-muted)]">|</span>
                <bdi dir="ltr" className="font-black">{activeTo}</bdi>
              </ReportControlStatus>
              <ReportControlStatus tone="neutral" icon={<i className="fa-solid fa-list-check" aria-hidden="true" />}>
                <span>{fmt(filteredIssues.length)} مورد در فیلتر فعلی</span>
              </ReportControlStatus>
            </>
          )}
          actions={(
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={() => void load()}
              disabled={isLoading}
              loading={isLoading}
              loadingText="در حال ممیزی…"
              leftIcon={<i className="fa-solid fa-rotate" aria-hidden="true" />}
            >
              محاسبه / به‌روزرسانی
            </Button>
          )}
        />
      )}
    >
      <ReportControlDateSection
        presets={(
          <ReportDatePresetChips
            fromDate={fromDate}
            toDate={toDate}
            compact
            includeLast30
            onChange={({ from, to }) => {
              setFromDate(from);
              setToDate(to);
            }}
          />
        )}
        fromField={(
          <ReportFilterField label="از تاریخ" icon={<i className="fa-regular fa-calendar" />} minWidthClassName="min-w-0">
            <ShamsiDatePicker selectedDate={fromDate} onDateChange={(d) => { if (!d) return; setFromDate(d); if (d > toDate) setToDate(d); }} size="standard" />
          </ReportFilterField>
        )}
        toField={(
          <ReportFilterField label="تا تاریخ" icon={<i className="fa-regular fa-calendar-check" />} minWidthClassName="min-w-0">
            <ShamsiDatePicker selectedDate={toDate} onDateChange={(d) => { if (!d) return; setToDate(d); if (d < fromDate) setFromDate(d); }} size="standard" />
          </ReportFilterField>
        )}
      />

      <ReportControlFilters>
        <ReportFilterField label="سطح" icon={<i className="fa-solid fa-triangle-exclamation" />} minWidthClassName="min-w-0">
          <SelectField
            controlOnly
            size="md"
            ariaLabel="فیلتر سطح ممیزی"
            value={severity}
            onValueChange={(value) => setSeverity(value as 'all' | Severity)}
            options={[
              { value: 'all', label: 'همه سطوح' },
              { value: 'critical', label: 'بحرانی' },
              { value: 'warning', label: 'هشدار' },
              { value: 'info', label: 'اطلاع' },
            ]}
          />
        </ReportFilterField>
        <ReportFilterField label="حوزه" icon={<i className="fa-solid fa-layer-group" />} minWidthClassName="min-w-0">
          <SelectField
            controlOnly
            size="md"
            ariaLabel="فیلتر حوزه ممیزی"
            value={area}
            onValueChange={(value) => setArea(value as 'all' | Area)}
            options={[
              { value: 'all', label: 'همه حوزه‌ها' },
              { value: 'sales', label: 'فروش' },
              { value: 'profit', label: 'سود' },
              { value: 'payments', label: 'وصول' },
              { value: 'inventory', label: 'موجودی' },
              { value: 'partners', label: 'همکاران' },
            ]}
          />
        </ReportFilterField>
      </ReportControlFilters>
    </ReportControlDock>
  );

  return (
    <PageKit
      title="ممیزی اختلاف گزارش‌ها"
      subtitle={subtitle}
      icon={<i className="fa-solid fa-shield-halved" />}
      className="report-merged-page"
      backAction={() => navigate('/reports')}
      controlDock={controlDock}
      isLoading={isLoading}
      isEmpty={!isLoading && !data}
      emptyTitle={err ? 'خطا در ممیزی' : 'داده‌ای برای ممیزی نیست'}
      emptyDescription={err || 'بازه زمانی را تغییر بده و دوباره تلاش کن.'}
      emptyActionLabel="بازخوانی"
      onEmptyAction={load}
    >
      {data ? (
        <div className="space-y-4" dir="rtl">
          <section aria-label="خلاصه حسابرسی مالی">
            <SurfaceHeader
              kind="section"
              title="کنترل تطبیق مالی"
              subtitle="امتیاز و موارد این صفحه مستقیماً از پاسخ ممیزی بک‌اند خوانده می‌شوند."
              icon={<i className="fa-solid fa-shield-halved" />}
              status={<FinancialStatusBadge label={`سلامت ${formatReportPercentText(data.score)}`} tone={resolvedHealthTone.badge} size="sm" />}
              className="mb-3"
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <PanelCard variant="metric" title="امتیاز سلامت" metricValue={formatReportPercentText(data.score)} metricHint="اعتمادپذیری گزارش‌های مالی" tone={resolvedHealthTone.surface} icon={<i className="fa-solid fa-shield-halved" />} />
              <PanelCard variant="metric" title="موارد بحرانی" metricValue={fmt(data.counts.critical)} metricHint="نیازمند بررسی پیش از تصمیم مالی" tone={data.counts.critical > 0 ? 'danger' : 'success'} icon={<i className="fa-solid fa-triangle-exclamation" />} />
              <PanelCard variant="metric" title="هشدارها" metricValue={fmt(data.counts.warning)} metricHint="قابل پیگیری بدون توقف عملیات" tone={data.counts.warning > 0 ? 'warning' : 'success'} icon={<i className="fa-solid fa-circle-exclamation" />} />
              <PanelCard variant="metric" title="کل موارد" metricValue={fmt(data.counts.total)} metricHint="تمام اختلاف‌های شناسایی‌شده" tone="neutral" icon={<i className="fa-solid fa-list-check" />} />
            </div>
          </section>

          <DataTableShell
            headerLayout="compact"
            title="موارد اختلاف و ریسک حسابداری"
            titleIcon={<i className="fa-solid fa-scale-balanced" />}
            meta={(
              <span className="inline-flex min-w-0 items-center gap-2 whitespace-nowrap">
                <i className="fa-solid fa-list-ol shrink-0" aria-hidden="true" />
                <span>نمایش {fmt(filteredIssues.length)} از {fmt(data.issues.length)} مورد</span>
              </span>
            )}
            aria-label="جدول موارد اختلاف و ریسک حسابداری"
          >
            <table className="report-table ux-data-table min-w-[980px] w-full" data-ui-table="true" data-ui-table-layout="managed" data-ui-bidi-scope="rtl-table">
              <thead>
                <tr>
                  {['سطح', 'حوزه', 'شرح اختلاف', 'موجودیت', 'انتظار', 'واقعی', 'اختلاف', 'اقدام', 'ردیابی'].map((label) => <th key={label}>{label}</th>)}
                </tr>
              </thead>
              <tbody>
                {filteredIssues.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-10 text-center text-sm font-bold text-[var(--ds-text-muted)]">در فیلتر فعلی موردی پیدا نشد.</td></tr>
                ) : filteredIssues.map((issue) => (
                  <tr key={issue.id} data-navigation-anchor={reportNavigationAnchor('financial-audit', issue.id)}>
                    <td><FinancialStatusBadge label={severityMeta[issue.severity].label} tone={severityMeta[issue.severity].tone} size="xs" /></td>
                    <td><span className="whitespace-nowrap text-xs font-bold text-[var(--ds-text-secondary)]">{areaLabel[issue.area]}</span></td>
                    <td className="min-w-[240px]">
                      <div className="font-black text-[var(--ds-text-primary)]">{cleanAuditText(issue.title)}</div>
                      <div className="mt-1 text-xs font-semibold leading-6 text-[var(--ds-text-muted)]">{cleanAuditText(issue.description)}</div>
                    </td>
                    <td>
                      <div className="font-black text-[var(--ds-text-primary)]">{entityTypeLabel[String(issue.entityType || '')] || cleanAuditText(issue.entityType)}</div>
                      <div className="mt-1 text-xs text-[var(--ds-text-muted)]">#{issue.entityId ?? '—'}</div>
                    </td>
                    <td className="whitespace-nowrap tabular-nums">{issue.expected == null ? '—' : fmt(issue.expected)}</td>
                    <td className="whitespace-nowrap tabular-nums">{issue.actual == null ? '—' : fmt(issue.actual)}</td>
                    <td className="whitespace-nowrap tabular-nums">{issue.difference == null ? '—' : fmt(issue.difference)}</td>
                    <td className="min-w-[210px] text-xs font-semibold leading-6 text-[var(--ds-text-secondary)]">{cleanAuditText(issue.actionHint)}</td>
                    <td className="text-center">
                      <ActionLink
                        to={areaDrilldown[issue.area]}
                        onClick={(event) => onDrilldownClick(event, areaDrilldown[issue.area], { contextLabel: `${severityMeta[issue.severity].label} • ${areaLabel[issue.area]}`, anchorId: reportNavigationAnchor('financial-audit', issue.id) })}
                        variant="secondary"
                        size="xs"
                        leftIcon={<i className="fa-solid fa-arrow-left" />}
                        tooltip="رفتن به گزارش مرتبط"
                      >
                        ردیابی
                      </ActionLink>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DataTableShell>
        </div>
      ) : null}
    </PageKit>
  );
}
