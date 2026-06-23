// pages/reports/AgingReceivablesReport.tsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageKit from '../../components/ui/PageKit';
import { apiFetch } from '../../utils/apiFetch';

type Bucket = { bucket: '0-30' | '31-60' | '61-90' | '90+'; amount: number; };
type Row = { customerId: number; fullName: string; phoneNumber?: string | null; totalOutstanding: number; buckets: Bucket[] };

type AgingBucketKey = Bucket['bucket'];

const BUCKETS: Array<{ key: AgingBucketKey; label: string; tone: 'safe' | 'watch' | 'risk' | 'critical'; hint: string }> = [
  { key: '0-30', label: '۰ تا ۳۰ روز', tone: 'safe', hint: 'قابل پیگیری عادی' },
  { key: '31-60', label: '۳۱ تا ۶۰ روز', tone: 'watch', hint: 'نیازمند پیگیری' },
  { key: '61-90', label: '۶۱ تا ۹۰ روز', tone: 'risk', hint: 'ریسک وصول' },
  { key: '90+', label: 'بیشتر از ۹۰ روز', tone: 'critical', hint: 'اولویت بحرانی' },
];

const fmt = (n: number, digits = 0) =>
  (Number.isFinite(n) ? n : 0).toLocaleString('fa-IR', { maximumFractionDigits: digits });

const amountText = (n: number) => `${fmt(n)} تومان`;

const getBucketAmount = (row: Row, key: AgingBucketKey) =>
  row.buckets?.find((bucket) => bucket.bucket === key)?.amount || 0;

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

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, []);

  const summary = useMemo(() => {
    const buckets: Record<AgingBucketKey, number> = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
    for (const row of rows) {
      for (const bucket of row.buckets || []) {
        buckets[bucket.bucket] += bucket.amount || 0;
      }
    }

    const total = Object.values(buckets).reduce((acc, value) => acc + value, 0);
    const riskTotal = buckets['31-60'] + buckets['61-90'] + buckets['90+'];
    const criticalTotal = buckets['90+'];
    const customersAtRisk = rows.filter((row) => getBucketAmount(row, '31-60') + getBucketAmount(row, '61-90') + getBucketAmount(row, '90+') > 0).length;
    const criticalCustomers = rows.filter((row) => getBucketAmount(row, '90+') > 0).length;
    const topDebtor = [...rows].sort((a, b) => (b.totalOutstanding || 0) - (a.totalOutstanding || 0))[0];

    return { total, buckets, riskTotal, criticalTotal, customersAtRisk, criticalCustomers, topDebtor };
  }, [rows]);

  const riskPercent = summary.total > 0 ? Math.round((summary.riskTotal / summary.total) * 100) : 0;
  const criticalPercent = summary.total > 0 ? Math.round((summary.criticalTotal / summary.total) * 100) : 0;

  return (
    <PageKit
      title="سن بدهی و ریسک وصول"
      subtitle="طبقه‌بندی بدهی مشتریان بر اساس مدت‌زمان عقب‌افتادگی؛ برای اولویت‌بندی تماس، محدودکردن فروش اعتباری و پیگیری وصول."
      icon={<i className="fa-solid fa-hourglass-half" />}
      className="report-merged-page"
      backAction={() => navigate('/reports')}
      isLoading={isLoading}
      isEmpty={!isLoading && rows.length === 0}
      emptyTitle={err ? 'خطا در دریافت گزارش' : 'بدهی فعالی ثبت نشده است'}
      emptyDescription={err ? err : 'در حال حاضر بدهی سررسیدشده یا مانده قابل نمایش برای مشتریان وجود ندارد.'}
      emptyActionLabel="بازخوانی"
      onEmptyAction={load}
    >
      <section className="aging-receivables" dir="rtl">
        <div className="aging-receivables__summary-strip" aria-label="خلاصه وضعیت وصول">
          <div className="aging-receivables__metric aging-receivables__metric--primary">
            <span>کل مانده مشتریان</span>
            <strong>{amountText(summary.total)}</strong>
            <small>{fmt(rows.length)} مشتری دارای مانده</small>
          </div>
          <div className="aging-receivables__metric">
            <span>در معرض ریسک</span>
            <strong>{fmt(riskPercent)}٪</strong>
            <small>{amountText(summary.riskTotal)}</small>
          </div>
          <div className="aging-receivables__metric aging-receivables__metric--critical">
            <span>اولویت بحرانی</span>
            <strong>{fmt(summary.criticalCustomers)}</strong>
            <small>{fmt(criticalPercent)}٪ از کل مانده</small>
          </div>
        </div>

        <div className="aging-receivables__bucket-grid">
          {BUCKETS.map((bucket) => {
            const value = summary.buckets[bucket.key];
            const percent = summary.total > 0 ? Math.round((value / summary.total) * 100) : 0;
            return (
              <article key={bucket.key} className={`aging-receivables__bucket aging-receivables__bucket--${bucket.tone}`}>
                <div className="aging-receivables__bucket-header">
                  <span>{bucket.label}</span>
                  <i className="fa-solid fa-circle" />
                </div>
                <strong>{amountText(value)}</strong>
                <div className="aging-receivables__bucket-footer">
                  <span>{bucket.hint}</span>
                  <b>{fmt(percent)}٪</b>
                </div>
              </article>
            );
          })}
        </div>

        <div className="aging-receivables__insight-row">
          <div className="aging-receivables__insight-card">
            <i className="fa-solid fa-user-clock" />
            <div>
              <span>مشتریان نیازمند پیگیری</span>
              <strong>{fmt(summary.customersAtRisk)} نفر</strong>
            </div>
          </div>
          <div className="aging-receivables__insight-card">
            <i className="fa-solid fa-triangle-exclamation" />
            <div>
              <span>مانده بحرانی بیشتر از ۹۰ روز</span>
              <strong>{amountText(summary.criticalTotal)}</strong>
            </div>
          </div>
          <div className="aging-receivables__insight-card">
            <i className="fa-solid fa-crown" />
            <div>
              <span>بیشترین مانده</span>
              <strong>{summary.topDebtor ? `${summary.topDebtor.fullName} · ${amountText(summary.topDebtor.totalOutstanding)}` : '—'}</strong>
            </div>
          </div>
        </div>

        <div className="aging-receivables__table-shell">
          <div className="aging-receivables__table-header">
            <div>
              <h3>لیست مشتریان بر اساس ریسک وصول</h3>
              <p>ردیف‌هایی که مانده قدیمی‌تری دارند باید زودتر پیگیری شوند.</p>
            </div>
            <button type="button" onClick={load} className="ux-btn ux-btn-secondary aging-receivables__refresh">
              <i className="fa-solid fa-rotate-right" />
              <span>بازخوانی</span>
            </button>
          </div>

          <div className="aging-receivables__table-scroll">
            <table className="aging-receivables__table">
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
                  return (
                    <tr key={row.customerId}>
                      <td>
                        <button
                          type="button"
                          className="aging-receivables__customer aging-receivables__customer--plain"
                          onClick={() => navigate(`/customers/${row.customerId}#customer-ledger-section`)}
                          title="باز کردن پرونده مشتری"
                        >
                          <span>{row.fullName}</span>
                        </button>
                      </td>
                      <td dir="ltr" className="aging-receivables__phone">{row.phoneNumber || '—'}</td>
                      {BUCKETS.map((bucket) => (
                        <td key={bucket.key} className={getBucketAmount(row, bucket.key) > 0 ? 'aging-receivables__amount' : 'aging-receivables__zero'}>
                          {fmt(getBucketAmount(row, bucket.key))}
                        </td>
                      ))}
                      <td className="aging-receivables__total">{fmt(row.totalOutstanding || 0)}</td>
                      <td>
                        <button
                          type="button"
                          className={`aging-receivables__risk-pill aging-receivables__risk-pill--${risk.tone}`}
                          onClick={() => navigate(`/customers/${row.customerId}#customer-ledger-section`)}
                          title="رفتن به پرونده و جزئیات بدهی مشتری"
                        >
                          <span>{risk.label}</span>
                          <i className="fa-solid fa-arrow-up-left-from-circle" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </PageKit>
  );
}
