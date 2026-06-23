// pages/reports/AbcAnalysisReport.tsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageKit from '../../components/ui/PageKit';
import { apiFetch } from '../../utils/apiFetch';
import ShamsiDatePicker from '../../components/ShamsiDatePicker';
import ReportFilterField from '../../components/reports/ReportFilterField';
import ReportDatePresetChips from '../../components/reports/ReportDatePresetChips';
import moment from 'jalali-moment';

type Row = {
  productId: number;
  name: string;
  categoryName?: string | null;
  sales: number;
  cogs: number;
  profit: number;
  share: number;
  cumShare: number;
  bucket: 'A' | 'B' | 'C';
};

const toISODate = (d: Date) => d.toISOString().slice(0, 10);
const fmt = (n: number, digits = 0) =>
  (Number.isFinite(n) ? n : 0).toLocaleString('fa-IR', { maximumFractionDigits: digits });

const startOfCurrentJalaliMonth = () => moment().startOf('jMonth').startOf('day').toDate();

const BiLabel = ({ fa, en }: { fa: string; en: string }) => (
  <div className="abc-table-bilabel">
    <div>{fa}</div>
    <span dir="ltr">{en}</span>
  </div>
);

const KpiCard = ({ icon, label, value, hint, tone = 'neutral' }: { icon: string; label: string; value: string; hint: string; tone?: 'neutral' | 'money' | 'profit' | 'focus' }) => (
  <article className={`abc-executive-kpi abc-executive-kpi--${tone}`}>
    <span className="abc-executive-kpi__icon" aria-hidden="true"><i className={`fa-solid ${icon}`} /></span>
    <div className="abc-executive-kpi__body">
      <small>{label}</small>
      <strong>{value}</strong>
      <p>{hint}</p>
    </div>
  </article>
);

export default function AbcAnalysisReport() {
  const navigate = useNavigate();
  const [fromDate, setFromDate] = useState<Date>(() => startOfCurrentJalaliMonth());
  const [toDate, setToDate] = useState<Date>(() => new Date());
  const [metric, setMetric] = useState<'sales' | 'profit'>('sales');
  const [rows, setRows] = useState<Row[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const fromISO = useMemo(() => toISODate(fromDate), [fromDate]);
  const toISO = useMemo(() => toISODate(toDate), [toDate]);

  const subtitle = useMemo(() => {
    const faRange = `${moment(fromDate).locale('fa').format('jYYYY/jMM/jDD')} تا ${moment(toDate).locale('fa').format('jYYYY/jMM/jDD')}`;
    const faMetric = metric === 'sales' ? 'فروش' : 'سود';
    return `تحلیل ABC موجودی • بازه: ${faRange} • معیار: ${faMetric}`;
  }, [fromDate, toDate, metric]);

  const load = async () => {
    setIsLoading(true);
    setErr(null);
    try {
      const res = await apiFetch(`/api/reports/abc?fromISO=${encodeURIComponent(fromISO)}&toISO=${encodeURIComponent(toISO)}&metric=${metric}`);
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
  const t = window.setTimeout(() => { void load(); }, 250);
  return () => window.clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [fromISO, toISO, metric]);

  const totals = useMemo(() => ({
    sales: rows.reduce((a, r) => a + (r.sales || 0), 0),
    profit: rows.reduce((a, r) => a + (r.profit || 0), 0),
  }), [rows]);

  return (
    <PageKit
      title="تحلیل ABC"
      subtitle={subtitle}
      icon={<i className="fa-solid fa-chart-pie" />}
      className="report-merged-page abc-executive-page"
      backAction={() => navigate('/reports')}
      isLoading={isLoading}
      isEmpty={!isLoading && rows.length === 0}
      emptyTitle={err ? "خطا در دریافت گزارش" : "موردی پیدا نشد"}
      emptyDescription={err ? err : "برای این بازه داده‌ای موجود نیست."}
      emptyActionLabel="بازخوانی"
      onEmptyAction={load}
      toolbarRight={
        <div className="abc-filter-bar" dir="rtl">
          <ReportDatePresetChips
            fromDate={fromDate}
            toDate={toDate}
            onChange={({ from, to }) => { setFromDate(from); setToDate(to); }}
            className="abc-filter-presets"
          />
          <ReportFilterField label="از تاریخ" icon={<i className="fa-regular fa-calendar" />} minWidthClassName="abc-filter-field abc-filter-field--date">
            <ShamsiDatePicker value={fromDate} onChange={(d: any) => d && setFromDate(d)} inputClassName="w-full h-11 rounded-2xl" />
          </ReportFilterField>
          <ReportFilterField label="تا تاریخ" icon={<i className="fa-regular fa-calendar-check" />} minWidthClassName="abc-filter-field abc-filter-field--date">
            <ShamsiDatePicker value={toDate} onChange={(d: any) => d && setToDate(d)} inputClassName="w-full h-11 rounded-2xl" />
          </ReportFilterField>
          <ReportFilterField label="مبنای تحلیل" icon={<i className="fa-solid fa-filter-circle-dollar" />} minWidthClassName="abc-filter-field abc-filter-field--metric">
            <select value={metric} onChange={(e) => setMetric(e.target.value as any)} className="abc-filter-select">
              <option value="sales">فروش</option>
              <option value="profit">سود</option>
            </select>
          </ReportFilterField>
          <button onClick={load} className="abc-apply-button"> 
            <i className={`fa-solid fa-bolt ${isLoading ? 'fa-fade' : ''}`} />
            اعمال
          </button>
        </div>
      }
    >
      <div className="abc-executive-kpi-grid">
        <KpiCard icon="fa-sack-dollar" label="فروش کل" value={fmt(totals.sales)} hint="جمع فروش کالاهای تحلیل‌شده در بازه انتخابی" tone="money" />
        <KpiCard icon="fa-chart-line" label="سود کل" value={fmt(totals.profit)} hint="سود ناخالص همان ردیف‌ها بر اساس معیار گزارش" tone="profit" />
        <KpiCard icon="fa-boxes-stacked" label="تعداد کالا" value={fmt(rows.length)} hint="تعداد کالاهایی که در تحلیل ABC وارد شده‌اند" tone="focus" />
      </div>

      <div className="abc-table-shell">
        <table className="abc-table">
          <thead>
            <tr>
              <th className="px-4 py-3 text-right"><BiLabel fa="کالا" en="Product" /></th>
              <th className="px-4 py-3 text-right"><BiLabel fa="دسته" en="Category" /></th>
              <th className="px-4 py-3 text-right"><BiLabel fa="گروه" en="Bucket" /></th>
              <th className="px-4 py-3 text-right"><BiLabel fa="فروش" en="Sales" /></th>
              <th className="px-4 py-3 text-right"><BiLabel fa="سود" en="Profit" /></th>
              <th className="px-4 py-3 text-right"><BiLabel fa="سهم" en="Share" /></th>
              <th className="px-4 py-3 text-right"><BiLabel fa="سهم تجمعی" en="Cumulative" /></th>
              <th className="px-4 py-3 text-right font-semibold abc-table-action-head">اقدام</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.productId}>
                <td className="px-4 py-3 font-medium">{r.name}</td>
                <td className="px-4 py-3 text-muted">{r.categoryName || '-'}</td>
                <td className="px-4 py-3">
                  <span className={`abc-bucket-badge abc-bucket-badge--${r.bucket.toLowerCase()}`}>
                    <span className="abc-bucket-badge__dot" aria-hidden="true" />
                    گروه {r.bucket}
                  </span>
                </td>
                <td className="px-4 py-3">{fmt(r.sales)}</td>
                <td className="px-4 py-3">{fmt(r.profit)}</td>
                <td className="px-4 py-3">{fmt((r.share || 0) * 100, 1)}%</td>
                <td className="px-4 py-3">{fmt((r.cumShare || 0) * 100, 1)}%</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => navigate(`/products?search=${encodeURIComponent(r.name)}`)}
                    className="report-direct-action abc-table-action"
                    title="نمایش این کالا در صفحه کالاها"
                  >
                    <i className="fa-solid fa-arrow-up-right-from-square" />
                    <span>پرونده کالا</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageKit>
  );
}
