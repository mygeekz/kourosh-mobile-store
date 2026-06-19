import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import moment from 'jalali-moment';
import PageKit from '../../components/ui/PageKit';
import ShamsiDatePicker from '../../components/ShamsiDatePicker';
import ReportFilterField from '../../components/reports/ReportFilterField';
import ReportDatePresetChips from '../../components/reports/ReportDatePresetChips';
import { apiFetch } from '../../utils/apiFetch';

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

const toISODate = (d: Date) => d.toISOString().slice(0, 10);
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
const fmt = (n?: number) => (Number.isFinite(Number(n)) ? Number(n).toLocaleString('fa-IR') : '—');

const severityMeta: Record<Severity, { label: string; className: string }> = {
  critical: { label: 'بحرانی', className: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-200 dark:ring-rose-500/25' },
  warning: { label: 'هشدار', className: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/25' },
  info: { label: 'اطلاع', className: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-200 dark:ring-sky-500/25' },
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

function scoreTone(score: number) {
  if (score >= 96) return 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-100';
  if (score >= 85) return 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-sky-100';
  if (score >= 70) return 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-100';
  return 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-100';
}

export default function FinancialAuditReport() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const initialRange = useMemo(() => {
    const sp = new URLSearchParams(search || '');
    return {
      from: fromISODate(sp.get('fromISO'), startOfCurrentJalaliMonth()),
      to: fromISODate(sp.get('toISO'), new Date()),
    };
  }, []);
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
      setData(json.data);
    } catch (e: any) {
      setErr(e?.message || 'خطا در دریافت ممیزی گزارشات');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const t = window.setTimeout(() => { void load(); }, 250);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, toDate]);

  const filteredIssues = useMemo(() => {
    const rows = data?.issues || [];
    return rows.filter((row) => (severity === 'all' || row.severity === severity) && (area === 'all' || row.area === area));
  }, [data, severity, area]);

  return (
    <PageKit
      title="ممیزی اختلاف گزارشات"
      subtitle={subtitle}
      icon={<i className="fa-solid fa-shield-halved" />}
      className="report-merged-page financial-audit-executive-page"
      backAction={() => navigate('/reports')}
      isLoading={isLoading}
      isEmpty={!isLoading && !data}
      emptyTitle={err ? 'خطا در ممیزی' : 'داده‌ای برای ممیزی نیست'}
      emptyDescription={err || 'بازه زمانی را تغییر بده و دوباره تلاش کن.'}
      emptyActionLabel="بازخوانی"
      onEmptyAction={load}
      toolbarRight={
        <div className="financial-audit-filter-dock" dir="rtl">
          <ReportDatePresetChips
            fromDate={fromDate}
            toDate={toDate}
            onChange={({ from, to }) => { setFromDate(from); setToDate(to); }}
            className="financial-audit-date-presets"
          />
          <ReportFilterField label="از تاریخ" icon={<i className="fa-regular fa-calendar" />} minWidthClassName="financial-audit-filter-field financial-audit-filter-field--date">
            <ShamsiDatePicker selectedDate={fromDate} onChange={(d) => d && setFromDate(d)} />
          </ReportFilterField>
          <ReportFilterField label="تا تاریخ" icon={<i className="fa-regular fa-calendar-check" />} minWidthClassName="financial-audit-filter-field financial-audit-filter-field--date">
            <ShamsiDatePicker selectedDate={toDate} onChange={(d) => d && setToDate(d)} />
          </ReportFilterField>
          <ReportFilterField label="سطح" icon={<i className="fa-solid fa-triangle-exclamation" />} minWidthClassName="financial-audit-filter-field financial-audit-filter-field--severity">
            <select value={severity} onChange={(e) => setSeverity(e.target.value as any)} className="financial-audit-select">
              <option value="all">همه</option><option value="critical">بحرانی</option><option value="warning">هشدار</option><option value="info">اطلاع</option>
            </select>
          </ReportFilterField>
          <ReportFilterField label="حوزه" icon={<i className="fa-solid fa-layer-group" />} minWidthClassName="financial-audit-filter-field financial-audit-filter-field--area">
            <select value={area} onChange={(e) => setArea(e.target.value as any)} className="financial-audit-select">
              <option value="all">همه حوزه‌ها</option><option value="sales">فروش و فاکتور</option><option value="profit">سود و بهای تمام‌شده</option><option value="payments">پرداخت و وصول</option><option value="inventory">موجودی</option><option value="partners">همکاران</option>
            </select>
          </ReportFilterField>
          <button type="button" onClick={load} className="financial-audit-refresh-button" disabled={isLoading}><i className={`fa-solid fa-rotate ${isLoading ? 'fa-spin' : ''}`} />بازخوانی</button>
        </div>
      }
    >
      {data && (
        <>
          <div className={`financial-audit-trust-card ${scoreTone(data.score)}`}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-xs font-black tracking-[0.12em] opacity-75">FINANCIAL TRUST LAYER</div>
                <div className="mt-1 text-lg font-black">دقت گزارش: {fmt(data.score)}٪</div>
                <p className="mt-1 text-xs font-bold leading-6 opacity-80">این صفحه قبل از تصمیم مالی، اختلاف فاکتور، پرداخت، سود، موجودی و سند همکار را کنترل می‌کند. روی هر ردیف می‌توانی به گزارش مادر Drill-down کنی.</p>
              </div>
              <div className="financial-audit-trust-counts">
                <div className="rounded-2xl bg-white/55 p-2 ring-1 ring-black/5 dark:bg-black/10 dark:ring-white/10">بحرانی: {fmt(data.counts.critical)}</div>
                <div className="rounded-2xl bg-white/55 p-2 ring-1 ring-black/5 dark:bg-black/10 dark:ring-white/10">هشدار: {fmt(data.counts.warning)}</div>
                <div className="rounded-2xl bg-white/55 p-2 ring-1 ring-black/5 dark:bg-black/10 dark:ring-white/10">کل: {fmt(data.counts.total)}</div>
              </div>
            </div>
          </div>

          <div className="financial-audit-kpi-grid">
            <div className="financial-audit-kpi financial-audit-kpi--score"><span className="financial-audit-kpi__icon"><i className="fa-solid fa-shield-halved" /></span><div><div className="financial-audit-kpi__label">امتیاز سلامت</div><div className="financial-audit-kpi__value">{fmt(data.score)}٪</div><p>اعتمادپذیری داده‌های مالی در بازه انتخابی</p></div></div>
            <div className="financial-audit-kpi financial-audit-kpi--critical"><span className="financial-audit-kpi__icon"><i className="fa-solid fa-triangle-exclamation" /></span><div><div className="financial-audit-kpi__label">بحرانی</div><div className="financial-audit-kpi__value">{fmt(data.counts.critical)}</div><p>مواردی که قبل از تصمیم مالی باید بررسی شوند</p></div></div>
            <div className="financial-audit-kpi financial-audit-kpi--warning"><span className="financial-audit-kpi__icon"><i className="fa-solid fa-circle-exclamation" /></span><div><div className="financial-audit-kpi__label">هشدار</div><div className="financial-audit-kpi__value">{fmt(data.counts.warning)}</div><p>اختلاف‌های قابل پیگیری بدون توقف عملیات</p></div></div>
            <div className="financial-audit-kpi financial-audit-kpi--total"><span className="financial-audit-kpi__icon"><i className="fa-solid fa-list-check" /></span><div><div className="financial-audit-kpi__label">کل موارد</div><div className="financial-audit-kpi__value">{fmt(data.counts.total)}</div><p>تمام موارد شناسایی‌شده توسط ممیزی</p></div></div>
          </div>

          <div className="financial-audit-table-shell">
            <div className="financial-audit-table-head">
              <div className="font-extrabold">موارد اختلاف و ریسک حسابداری</div>
              <div className="text-xs text-muted">نمایش {fmt(filteredIssues.length)} از {fmt(data.issues.length)} مورد</div>
            </div>
            <div className="financial-audit-table-scroll">
              <table className="financial-audit-table">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-right">سطح</th><th className="px-4 py-3 text-right">حوزه</th><th className="px-4 py-3 text-right">شرح</th><th className="px-4 py-3 text-right">موجودیت</th><th className="px-4 py-3 text-left">اختلاف</th><th className="px-4 py-3 text-right">اقدام پیشنهادی</th><th className="px-4 py-3 text-center">Drill-down</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIssues.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-10 text-center text-muted">در فیلتر فعلی موردی پیدا نشد.</td></tr>
                  ) : filteredIssues.map((issue) => (
                    <tr key={issue.id}>
                      <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${severityMeta[issue.severity].className}`}>{severityMeta[issue.severity].label}</span></td>
                      <td className="px-4 py-3 whitespace-nowrap">{areaLabel[issue.area]}</td>
                      <td className="px-4 py-3 min-w-[18rem]"><div className="font-bold text-slate-900 dark:text-slate-100">{cleanAuditText(issue.title)}</div><div className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-6">{cleanAuditText(issue.description)}</div></td>
                      <td className="px-4 py-3 whitespace-nowrap"><div className="financial-audit-entity-type">{entityTypeLabel[String(issue.entityType || '')] || cleanAuditText(issue.entityType)}</div><div className="text-xs text-muted">#{issue.entityId ?? '—'}</div></td>
                      <td className="px-4 py-3 text-left font-bold whitespace-nowrap">{issue.difference == null ? '—' : fmt(issue.difference)}</td>
                      <td className="px-4 py-3 min-w-[16rem] text-xs leading-6 text-slate-600 dark:text-slate-300">{cleanAuditText(issue.actionHint)}</td>
                      <td className="px-4 py-3 text-center"><Link to={areaDrilldown[issue.area]} className="financial-audit-drilldown-button">ردیابی<i className="fa-solid fa-arrow-left text-[10px]" /></Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </PageKit>
  );
}
