// pages/reports/CohortReport.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import moment from 'jalali-moment'; // ⬅️ اضافه شد
import { CohortRow, NotificationMessage } from '../../types';
import { apiFetch } from '../../utils/apiFetch';
import Notification from '../../components/Notification';
import { useAuth } from '../../contexts/AuthContext';
import { useStyle } from '../../contexts/StyleContext';

const faNum = (value: number) => value.toLocaleString('fa-IR');

const CohortReport: React.FC = () => {
  const { currentUser } = useAuth();
  const { style } = useStyle();
  const navigate = useNavigate();

  const [rows, setRows] = useState<CohortRow[]>([]);
  const [maxMonths, setMaxMonths] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const brand = `hsl(${style.primaryHue} 90% 55%)`;
  const brandSoft = `hsla(${style.primaryHue}, 90%, 55%, 0.14)`;
  const heroGradient = {
    background:
      `radial-gradient(1200px 400px at 80% 0%, hsla(${style.primaryHue}, 90%, 55%, .22), transparent 60%),` +
      `linear-gradient(180deg, rgba(15,23,42,.92), rgba(15,23,42,.72))`,
  } as React.CSSProperties;

  // ⬅️ کمکی: تبدیل «ماه» به شمسی
  const toShamsiMonth = (input: string) => {
    // اگر «YYYY-MM» بود، یک روز به آخرش اضافه می‌کنیم تا قابل پارس باشد
    const guess = /^\d{4}[-/]\d{2}$/.test(input) ? `${input}-01` : input;
    const m = moment(guess, [
      moment.ISO_8601,
      'YYYY-MM-DD',
      'YYYY/MM/DD',
      'YYYY-MM',
      'YYYY/MM',
    ]).locale('fa');
    return m.isValid() ? m.format('jYYYY/jMM') : input;
  };

  useEffect(() => {
    if (currentUser) {
      const allowed = ['Admin', 'Manager', 'Marketer'];
      if (!allowed.includes(currentUser.roleName)) {
        setNotification({ type: 'error', text: 'شما اجازه دسترسی به این صفحه را ندارید.' });
        navigate('/');
        return;
      }
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const res = await apiFetch('/api/reports/cohort');
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message || 'خطا در دریافت داده‌ها');
        const items: CohortRow[] = json.data || [];
        let max = 0;
        items.forEach((row) => { if (Array.isArray(row.counts)) max = Math.max(max, row.counts.length); });
        setMaxMonths(max);
        setRows(items);
      } catch (err: any) {
        setNotification({ type: 'error', text: err.message || 'خطا در عملیاتی ناشناخته در دریافت گزارش' });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const thBase = 'px-3 py-3 text-right text-[11px] font-bold whitespace-nowrap border-b border-slate-200/70 dark:border-slate-800/80 text-slate-600 dark:text-slate-200';
  const tdBase = 'px-3 py-3 text-right text-sm align-middle border-b border-slate-200/70 dark:border-slate-800/80';
  const headBg = 'bg-slate-50/70 dark:bg-slate-900/50 backdrop-blur';
  const tableWrap = 'overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/30';
  const cardWrap = 'rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/30 shadow-[0_18px_60px_-45px_rgba(0,0,0,.55)]';
  const innerPad = 'p-4 md:p-6';

  const cellStyle = (percentNumber: number): React.CSSProperties => {
    const t = Math.max(0, Math.min(1, percentNumber / 100));
    const isDark = document.documentElement.classList.contains('dark');
    const alpha = isDark ? 0.14 + t * 0.22 : 0.1 + t * 0.35;
    return { backgroundColor: `hsla(${style.primaryHue}, 90%, 55%, ${alpha})` };
  };

  const stats = useMemo(() => {
    const cohorts = rows.length;
    const totalCustomers = rows.reduce((acc, r) => acc + (r.customersCount || 0), 0);

    const m2 = rows
      .filter((r) => (r.customersCount || 0) > 0)
      .map((r) => {
        const base = r.customersCount || 0;
        const v = Array.isArray(r.counts) ? (r.counts[1] || 0) : 0;
        return base ? v / base : 0;
      });
    const avgM2 = m2.length ? Math.round((m2.reduce((a, b) => a + b, 0) / m2.length) * 100) : 0;

    let bestMonth = 0;
    let bestScore = -1;
    for (let i = 0; i < maxMonths; i++) {
      const vals = rows
        .filter((r) => (r.customersCount || 0) > 0)
        .map((r) => {
          const base = r.customersCount || 0;
          const v = Array.isArray(r.counts) ? (r.counts[i] || 0) : 0;
          return base ? v / base : 0;
        });
      const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      if (avg > bestScore) {
        bestScore = avg;
        bestMonth = i + 1;
      }
    }

    return {
      cohorts,
      totalCustomers,
      avgM2,
      bestMonth: bestMonth || 1,
      bestScore: bestScore > 0 ? Math.round(bestScore * 100) : 0,
    };
  }, [rows, maxMonths]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const shamsi = toShamsiMonth(row.cohortMonth).toLowerCase();
      return row.cohortMonth.toLowerCase().includes(q) || shamsi.includes(q);
    });
  }, [rows, searchQuery]);

  useEffect(() => { setPage(1); }, [searchQuery, pageSize]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageRows = filteredRows.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="report-page cohort-executive-page" dir="rtl">
      <Notification message={notification} onClose={() => setNotification(null)} />

      <section className="cohort-summary-panel" aria-label="خلاصه گزارش Cohort">
        <div className="cohort-metric-grid">
          <article className="cohort-metric-card">
            <span className="cohort-metric-card__icon"><i className="fa-solid fa-layer-group" /></span>
            <div>
              <span className="cohort-metric-card__label">تعداد Cohort</span>
              <strong>{stats.cohorts.toLocaleString('fa-IR')}</strong>
              <small>گروه‌های ماه اولین خرید</small>
            </div>
          </article>
          <article className="cohort-metric-card">
            <span className="cohort-metric-card__icon"><i className="fa-solid fa-users" /></span>
            <div>
              <span className="cohort-metric-card__label">کل مشتریان</span>
              <strong>{stats.totalCustomers.toLocaleString('fa-IR')}</strong>
              <small>مشتریان وارد شده به تحلیل</small>
            </div>
          </article>
          <article className="cohort-metric-card">
            <span className="cohort-metric-card__icon"><i className="fa-solid fa-arrow-rotate-left" /></span>
            <div>
              <span className="cohort-metric-card__label">نگهداشت ماه ۲</span>
              <strong>٪{stats.avgM2.toLocaleString('fa-IR')}</strong>
              <small>میانگین بازگشت پس از ماه اول</small>
            </div>
          </article>
          <article className="cohort-metric-card">
            <span className="cohort-metric-card__icon"><i className="fa-solid fa-ranking-star" /></span>
            <div>
              <span className="cohort-metric-card__label">بهترین ماه</span>
              <strong>ماه {stats.bestMonth.toLocaleString('fa-IR')}</strong>
              <small>بالاترین نگهداشت: ٪{stats.bestScore.toLocaleString('fa-IR')}</small>
            </div>
          </article>
        </div>
      </section>

      <section className="cohort-section" aria-label="ماتریس بازگشت مشتری">
        <div className="cohort-section__head">
          <div className="cohort-section__title">
            <span className="cohort-section__icon"><i className="fa-solid fa-table-cells-large" /></span>
            <div>
              <h2>ماتریس بازگشت مشتری</h2>
              <p>هر ردیف، مشتریان ماه اولین خرید را نشان می‌دهد؛ هر ستون میزان بازگشت آن گروه در ماه‌های بعدی است.</p>
            </div>
          </div>

          <div className="cohort-tools">
            <div className="cohort-search" role="search" dir="ltr">
              <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
              <input
                aria-label="جستجوی Cohort"
                dir="rtl"
                type="text"
                placeholder="جستجو بر اساس ماه Cohort…"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
            <div className="cohort-page-size">
              <select aria-label="تعداد ردیف در صفحه" value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
                <option value={10}>۱۰</option>
                <option value={20}>۲۰</option>
                <option value={50}>۵۰</option>
              </select>
              <span>تعداد در صفحه</span>
            </div>
          </div>
        </div>

        <div className="cohort-legend-row">
          <div className="cohort-legend-copy">شدت رنگ سلول‌ها، درصد نگهداشت مشتریان همان Cohort را نشان می‌دهد.</div>
          <div className="cohort-legend">
            <span>کم</span>
            <i style={{ background: `linear-gradient(90deg, ${brandSoft}, ${brand})` }} />
            <span>زیاد</span>
          </div>
        </div>

        {isLoading ? (
          <div className="cohort-empty-state">در حال دریافت داده‌ها…</div>
        ) : pageRows.length === 0 ? (
          <div className="cohort-empty-state">برای جستجوی فعلی، Cohortی پیدا نشد.</div>
        ) : (
          <div className="cohort-table-shell">
            <table className="cohort-table">
              <thead>
                <tr>
                  <th className="cohort-sticky-col cohort-sticky-col--month">ماه اول خرید</th>
                  <th className="cohort-sticky-col cohort-sticky-col--count">تعداد مشتریان</th>
                  {Array.from({ length: maxMonths }, (_, i) => (
                    <th key={i}>ماه {faNum(i + 1)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => (
                  <tr key={row.cohortMonth}>
                    <td className="cohort-sticky-col cohort-sticky-col--month"><strong>{toShamsiMonth(row.cohortMonth)}</strong></td>
                    <td className="cohort-sticky-col cohort-sticky-col--count">{(row.customersCount || 0).toLocaleString('fa-IR')}</td>
                    {Array.from({ length: maxMonths }, (_, i) => {
                      const val = row.counts && row.counts[i] != null ? row.counts[i] : 0;
                      const percentNumber = row.customersCount ? Math.round((val / row.customersCount) * 100) : 0;
                      return (
                        <td key={i} className="cohort-heat-cell" style={row.customersCount ? cellStyle(percentNumber) : undefined} title={`${val.toLocaleString('fa-IR')} نفر - ٪${percentNumber.toLocaleString('fa-IR')}`}>
                          <strong>{val.toLocaleString('fa-IR')}</strong>
                          <span>٪{percentNumber.toLocaleString('fa-IR')}</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="cohort-pagination">
          <span>صفحه {safePage.toLocaleString('fa-IR')} از {pageCount.toLocaleString('fa-IR')}</span>
          <div>
            <button type="button" disabled={safePage <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>قبلی</button>
            <button type="button" disabled={safePage >= pageCount} onClick={() => setPage((prev) => Math.min(pageCount, prev + 1))}>بعدی</button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CohortReport;
