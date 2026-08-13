import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { reportNavigationAnchor, useReportDrilldownNavigation } from '../../hooks/useReportDrilldownNavigation';
import {
  ActionLink,
  Button,
  DataTableShell,
  PageKit,
  PanelCard,
  SurfaceHeader,
  type SurfaceTone,
} from '@/components/ui';
import FinancialStatusBadge, { type FinancialStatusTone } from '../../components/FinancialStatusBadge';
import ReportControlDock, {
  ReportControlFooter,
  ReportControlStatus,
} from '../../components/reports/ReportControlDock';
import { apiFetch } from '../../utils/apiFetch';
import { formatExactNumberText } from '../../utils/exactNumber';
import { formatReportMoneyText, formatReportPercentText } from '../../utils/reportPresentation';

type Bucket = { bucket: '0-30' | '31-60' | '61-90' | '90+'; amount: number };
type Row = { customerId: number; fullName: string; phoneNumber?: string | null; totalOutstanding: number; buckets: Bucket[] };
type AgingBucketKey = Bucket['bucket'];
type RiskTone = 'safe' | 'watch' | 'risk' | 'critical';

const BUCKETS: Array<{ key: AgingBucketKey; label: string; tone: RiskTone; hint: string }> = [
  { key: '0-30', label: '۰ تا ۳۰ روز', tone: 'safe', hint: 'قابل پیگیری عادی' },
  { key: '31-60', label: '۳۱ تا ۶۰ روز', tone: 'watch', hint: 'نیازمند پیگیری' },
  { key: '61-90', label: '۶۱ تا ۹۰ روز', tone: 'risk', hint: 'ریسک وصول' },
  { key: '90+', label: 'بیشتر از ۹۰ روز', tone: 'critical', hint: 'اولویت بحرانی' },
];

const toneMap: Record<RiskTone, { surface: SurfaceTone; badge: FinancialStatusTone }> = {
  safe: { surface: 'success', badge: 'success' },
  watch: { surface: 'info', badge: 'info' },
  risk: { surface: 'warning', badge: 'warning' },
  critical: { surface: 'danger', badge: 'danger' },
};

const fmt = (n: number) => formatExactNumberText(Number.isFinite(n) ? n : 0);
const money = (n: number) => formatReportMoneyText(Number.isFinite(n) ? n : 0);
const percent = (n: number) => formatReportPercentText(Number.isFinite(n) ? n : 0);

const getBucketAmount = (row: Row, key: AgingBucketKey) => row.buckets?.find((bucket) => bucket.bucket === key)?.amount || 0;

const getRiskLabel = (row: Row) => {
  if (getBucketAmount(row, '90+') > 0) return { label: 'بحرانی', tone: 'critical' } as const;
  if (getBucketAmount(row, '61-90') > 0) return { label: 'پرریسک', tone: 'risk' } as const;
  if (getBucketAmount(row, '31-60') > 0) return { label: 'قابل پیگیری', tone: 'watch' } as const;
  return { label: 'عادی', tone: 'safe' } as const;
};

export default function AgingReceivablesReport() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { onDrilldownClick } = useReportDrilldownNavigation({
    reportKey: 'aging-receivables',
    uiState: {},
    restoreUiState: () => undefined,
  });

  const load = async () => {
    setIsLoading(true);
    setErr(null);
    try {
      const res = await apiFetch('/api/reports/aging-receivables');
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.message || 'خطا در دریافت گزارش');
      setRows(json?.data || []);
    } catch (e: any) {
      setErr(e?.message || 'خطا در دریافت گزارش');
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
    const refreshAfterInstallmentPayment = () => { void load(); };
    window.addEventListener('kourosh:installment-payment-updated', refreshAfterInstallmentPayment);
    return () => window.removeEventListener('kourosh:installment-payment-updated', refreshAfterInstallmentPayment);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  const summary = useMemo(() => {
    const buckets: Record<AgingBucketKey, number> = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
    for (const row of rows) {
      for (const bucket of row.buckets || []) buckets[bucket.bucket] += bucket.amount || 0;
    }

    const total = Object.values(buckets).reduce((acc, value) => acc + value, 0);
    const riskTotal = buckets['31-60'] + buckets['61-90'] + buckets['90+'];
    const criticalTotal = buckets['90+'];
    const customersAtRisk = rows.filter((row) => getBucketAmount(row, '31-60') + getBucketAmount(row, '61-90') + getBucketAmount(row, '90+') > 0).length;
    const criticalCustomers = rows.filter((row) => getBucketAmount(row, '90+') > 0).length;
    const topDebtor = [...rows].sort((a, b) => (b.totalOutstanding || 0) - (a.totalOutstanding || 0))[0];

    return { total, buckets, riskTotal, criticalTotal, customersAtRisk, criticalCustomers, topDebtor };
  }, [rows]);

  const riskPercent = summary.total > 0 ? (summary.riskTotal / summary.total) * 100 : 0;
  const criticalPercent = summary.total > 0 ? (summary.criticalTotal / summary.total) * 100 : 0;

  const controlDock = (
    <ReportControlDock
      ariaLabel="کنترل گزارش سن بدهی و ریسک وصول"
      presentation="approved"
      title="کنترل گزارش"
      subtitle="این گزارش یک تصویر لحظه‌ای از مانده جاری مشتریان و سن بدهی آن‌هاست؛ بازه تاریخی مصنوعی روی آن اعمال نمی‌شود."
      icon={<i className="fa-solid fa-sliders" aria-hidden="true" />}
      footer={(
        <ReportControlFooter
          ariaLabel="عملیات و وضعیت گزارش سن بدهی"
          statuses={(
            <>
              <ReportControlStatus tone="neutral" icon={<i className="fa-solid fa-camera" aria-hidden="true" />}>
                <span>مبنای گزارش: وضعیت جاری مطالبات</span>
              </ReportControlStatus>
              <ReportControlStatus tone="info" icon={<i className="fa-solid fa-users" aria-hidden="true" />}>
                <span>{fmt(rows.length)} مشتری دارای مانده</span>
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
              loadingText="در حال بازخوانی…"
              leftIcon={<i className="fa-solid fa-rotate" aria-hidden="true" />}
            >
              به‌روزرسانی وضعیت
            </Button>
          )}
        />
      )}
    />
  );

  return (
    <PageKit
      title="سن بدهی و ریسک وصول"
      subtitle="طبقه‌بندی بدهی مشتریان بر اساس مدت‌زمان عقب‌افتادگی؛ برای اولویت‌بندی تماس، محدودکردن فروش اعتباری و پیگیری وصول."
      icon={<i className="fa-solid fa-hourglass-half" />}
      className="report-merged-page"
      backAction={() => navigate('/reports')}
      controlDock={controlDock}
      isLoading={isLoading}
      isEmpty={!isLoading && rows.length === 0}
      emptyTitle={err ? 'خطا در دریافت گزارش' : 'بدهی فعالی ثبت نشده است'}
      emptyDescription={err || 'در حال حاضر بدهی سررسیدشده یا مانده قابل نمایش برای مشتریان وجود ندارد.'}
      emptyActionLabel="بازخوانی"
      onEmptyAction={load}
    >
      <div className="space-y-4" dir="rtl">
        <section className="grid grid-cols-1 gap-3 md:grid-cols-3" aria-label="خلاصه وضعیت وصول">
          <PanelCard variant="metric" title="کل مانده مشتریان" metricValue={money(summary.total)} metricHint={`${fmt(rows.length)} مشتری دارای مانده`} tone="info" icon={<i className="fa-solid fa-wallet" />} />
          <PanelCard variant="metric" title="در معرض ریسک" metricValue={percent(riskPercent)} metricHint={money(summary.riskTotal)} tone={summary.riskTotal > 0 ? 'warning' : 'success'} icon={<i className="fa-solid fa-triangle-exclamation" />} />
          <PanelCard variant="metric" title="اولویت بحرانی" metricValue={fmt(summary.criticalCustomers)} metricHint={`${percent(criticalPercent)} از کل مانده`} tone={summary.criticalCustomers > 0 ? 'danger' : 'success'} icon={<i className="fa-solid fa-bell" />} />
        </section>

        <section aria-label="توزیع سن مطالبات">
          <SurfaceHeader
            kind="section"
            title="توزیع سن مطالبات"
            subtitle="مانده جاری مشتریان بر اساس فاصله زمانی بدهی از موعد پیگیری."
            icon={<i className="fa-solid fa-chart-column" />}
            className="mb-3"
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {BUCKETS.map((bucket) => {
              const value = summary.buckets[bucket.key];
              const bucketPercent = summary.total > 0 ? (value / summary.total) * 100 : 0;
              return (
                <PanelCard
                  key={bucket.key}
                  variant="metric"
                  title={bucket.label}
                  metricValue={money(value)}
                  metricHint={`${bucket.hint} · ${percent(bucketPercent)}`}
                  tone={toneMap[bucket.tone].surface}
                  icon={<i className="fa-solid fa-circle" />}
                />
              );
            })}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3 md:grid-cols-3" aria-label="نکات عملیاتی وصول">
          <PanelCard variant="metric" title="مشتریان نیازمند پیگیری" metricValue={`${fmt(summary.customersAtRisk)} نفر`} metricHint="دارای مانده بالاتر از ۳۰ روز" tone={summary.customersAtRisk > 0 ? 'warning' : 'success'} icon={<i className="fa-solid fa-user-clock" />} />
          <PanelCard variant="metric" title="مانده بحرانی بیشتر از ۹۰ روز" metricValue={money(summary.criticalTotal)} metricHint="اولویت وصول و بررسی اعتبار" tone={summary.criticalTotal > 0 ? 'danger' : 'success'} icon={<i className="fa-solid fa-triangle-exclamation" />} />
          <PanelCard variant="metric" title="بیشترین مانده" metricValue={summary.topDebtor ? money(summary.topDebtor.totalOutstanding) : '—'} metricHint={summary.topDebtor?.fullName || 'مشتری دارای مانده ثبت نشده است'} tone="neutral" icon={<i className="fa-solid fa-crown" />} />
        </section>

        <DataTableShell
          headerLayout="compact"
          title="لیست مشتریان بر اساس ریسک وصول"
          subtitle="ردیف‌هایی که مانده قدیمی‌تری دارند باید زودتر پیگیری شوند."
          titleIcon={<i className="fa-solid fa-user-clock" />}
          meta={(
            <span className="inline-flex items-center gap-2 whitespace-nowrap">
              <i className="fa-solid fa-list-ol" aria-hidden="true" />
              <span>{fmt(rows.length)} مشتری</span>
            </span>
          )}
          aria-label="جدول سن بدهی مشتریان"
        >
          <div className="hidden lg:block">
            <table className="report-table ux-data-table min-w-[980px] w-full" data-ui-table="true" data-ui-table-layout="managed" data-ui-bidi-scope="rtl-table">
              <thead>
                <tr>
                  <th>مشتری</th>
                  <th>موبایل</th>
                  <th>۰ تا ۳۰</th>
                  <th>۳۱ تا ۶۰</th>
                  <th>۶۱ تا ۹۰</th>
                  <th>۹۰+</th>
                  <th>جمع مانده</th>
                  <th>وضعیت</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const risk = getRiskLabel(row);
                  const riskTone = toneMap[risk.tone];
                  return (
                    <tr key={row.customerId} data-navigation-anchor={reportNavigationAnchor('aging-receivables', row.customerId)}>
                      <td>
                        <ActionLink
                          to={`/customers/${row.customerId}#customer-ledger-section`}
                          onClick={(event) => onDrilldownClick(event, `/customers/${row.customerId}#customer-ledger-section`, { contextLabel: `${row.fullName} • مانده ${money(row.totalOutstanding || 0)}` })}
                          unstyled
                          autoIcon={false}
                          className="font-black text-[var(--ds-text-primary)] hover:underline"
                          tooltip="باز کردن پرونده مشتری"
                        >
                          {row.fullName}
                        </ActionLink>
                      </td>
                      <td><bdi dir="ltr" className="whitespace-nowrap font-mono text-xs text-[var(--ds-text-secondary)]">{row.phoneNumber || '—'}</bdi></td>
                      {BUCKETS.map((bucket) => {
                        const value = getBucketAmount(row, bucket.key);
                        return <td key={bucket.key} className={value > 0 ? 'font-black tabular-nums text-[var(--ds-text-primary)]' : 'font-bold tabular-nums text-[var(--ds-text-muted)]'}>{fmt(value)}</td>;
                      })}
                      <td className="font-black tabular-nums text-[var(--ds-text-primary)]">{fmt(row.totalOutstanding || 0)}</td>
                      <td>
                        <ActionLink
                          to={`/customers/${row.customerId}#customer-ledger-section`}
                          onClick={(event) => onDrilldownClick(event, `/customers/${row.customerId}#customer-ledger-section`, { contextLabel: `${row.fullName} • مانده ${money(row.totalOutstanding || 0)}` })}
                          unstyled
                          autoIcon={false}
                          tooltip="رفتن به پرونده و جزئیات بدهی مشتری"
                        >
                          <FinancialStatusBadge label={risk.label} tone={riskTone.badge} size="xs" icon="fa-arrow-up-left-from-circle" />
                        </ActionLink>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 p-3 lg:hidden">
            {rows.map((row) => {
              const risk = getRiskLabel(row);
              const riskTone = toneMap[risk.tone];
              return (
                <PanelCard
                  key={`mobile-aging-${row.customerId}`}
                  data-navigation-anchor={reportNavigationAnchor('aging-receivables', row.customerId)}
                  title={row.fullName}
                  subtitle={row.phoneNumber ? <bdi dir="ltr">{row.phoneNumber}</bdi> : 'شماره موبایل ثبت نشده'}
                  icon={<i className="fa-solid fa-user" />}
                  actions={<FinancialStatusBadge label={risk.label} tone={riskTone.badge} size="xs" />}
                  footer={(
                    <ActionLink to={`/customers/${row.customerId}#customer-ledger-section`} onClick={(event) => onDrilldownClick(event, `/customers/${row.customerId}#customer-ledger-section`, { contextLabel: `${row.fullName} • مانده ${money(row.totalOutstanding || 0)}` })} variant="secondary" size="sm" leftIcon={<i className="fa-solid fa-arrow-left" />}>
                      مشاهده پرونده مشتری
                    </ActionLink>
                  )}
                >
                  <div className="grid grid-cols-2 gap-2">
                    {BUCKETS.map((bucket) => (
                      <div key={`${row.customerId}-${bucket.key}`} className="min-w-0 border-b border-[var(--ds-border-subtle)] py-2 last:border-b-0">
                        <div className="text-xs font-bold text-[var(--ds-text-muted)]">{bucket.label}</div>
                        <div className="mt-1 font-black tabular-nums text-[var(--ds-text-primary)]">{money(getBucketAmount(row, bucket.key))}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 border-t border-[var(--ds-border-subtle)] pt-3">
                    <span className="text-xs font-bold text-[var(--ds-text-muted)]">جمع مانده</span>
                    <strong className="font-black tabular-nums text-[var(--ds-text-primary)]">{money(row.totalOutstanding || 0)}</strong>
                  </div>
                </PanelCard>
              );
            })}
          </div>
        </DataTableShell>
      </div>
    </PageKit>
  );
}
