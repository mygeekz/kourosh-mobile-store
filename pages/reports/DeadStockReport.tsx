// pages/reports/DeadStockReport.tsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import moment from 'jalali-moment';
import PageKit from '../../components/ui/PageKit';
import { apiFetch } from '../../utils/apiFetch';

type Row = {
  productId: number;
  name: string;
  categoryName?: string | null;
  stock: number;
  purchasePrice: number;
  value: number;
  lastSaleDate?: string | null;
  daysSinceLastSale?: number | null;
};

type RiskTone = 'critical' | 'high' | 'watch' | 'new';

const fmt = (n: number, digits = 0) =>
  (Number.isFinite(n) ? n : 0).toLocaleString('fa-IR', { maximumFractionDigits: digits });

const money = (n: number) => `${fmt(n)} تومان`;

const formatLastSale = (date?: string | null) => {
  if (!date) return 'بدون فروش ثبت‌شده';
  const parsed = moment(date);
  return parsed.isValid() ? parsed.locale('fa').format('jYYYY/jMM/jDD') : String(date).slice(0, 10);
};

const getRiskMeta = (row: Row, thresholdDays: number): { label: string; icon: string; tone: RiskTone; hint: string } => {
  if (!row.lastSaleDate) {
    return { label: 'بدون سابقه فروش', icon: 'fa-circle-question', tone: 'critical', hint: 'اولویت بررسی قیمت، چیدمان یا توقف خرید' };
  }

  const days = Number(row.daysSinceLastSale ?? 0);
  if (days >= Math.max(180, thresholdDays * 2)) {
    return { label: 'راکد بحرانی', icon: 'fa-triangle-exclamation', tone: 'critical', hint: 'سرمایه خوابیده با ریسک بالا' };
  }
  if (days >= Math.max(90, thresholdDays * 1.35)) {
    return { label: 'راکد جدی', icon: 'fa-hourglass-end', tone: 'high', hint: 'نیازمند کمپین فروش یا اصلاح قیمت' };
  }
  return { label: 'نیازمند پایش', icon: 'fa-eye', tone: 'watch', hint: 'در محدوده رکود انتخاب‌شده' };
};

export default function DeadStockReport() {
  const navigate = useNavigate();
  const [days, setDays] = useState(60);
  const [rows, setRows] = useState<Row[]>([]);
  const [query, setQuery] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [pageIndex, setPageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const subtitle = useMemo(() => `کالاهایی که حداقل ${fmt(days)} روز فروش یا حرکت مؤثر نداشته‌اند`, [days]);

  const load = async (nextDays = days) => {
    setIsLoading(true);
    setErr(null);
    try {
      const res = await apiFetch(`/api/reports/dead-stock?days=${encodeURIComponent(String(nextDays))}`);
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.message || 'خطا در دریافت گزارش کالاهای راکد');
      setRows(Array.isArray(json?.data) ? json.data : []);
    } catch (e: any) {
      setErr(e?.message || 'خطا در دریافت گزارش کالاهای راکد');
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const t = window.setTimeout(() => { void load(days); }, 250);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const aNoSale = a.lastSaleDate ? 0 : 1;
      const bNoSale = b.lastSaleDate ? 0 : 1;
      if (aNoSale !== bNoSale) return bNoSale - aNoSale;
      const daysDiff = Number(b.daysSinceLastSale ?? 0) - Number(a.daysSinceLastSale ?? 0);
      if (daysDiff !== 0) return daysDiff;
      return Number(b.value ?? 0) - Number(a.value ?? 0);
    });
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sortedRows;
    return sortedRows.filter((r) => {
      const haystack = [
        r.name,
        r.categoryName,
        String(r.stock ?? ''),
        String(r.value ?? ''),
        String(r.daysSinceLastSale ?? ''),
        formatLastSale(r.lastSaleDate),
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [sortedRows, query]);

  useEffect(() => { setPageIndex(0); }, [query, pageSize, days]);

  const totalValue = useMemo(() => rows.reduce((a, r) => a + Number(r.value || 0), 0), [rows]);
  const totalStock = useMemo(() => rows.reduce((a, r) => a + Number(r.stock || 0), 0), [rows]);
  const noSaleCount = useMemo(() => rows.filter((r) => !r.lastSaleDate).length, [rows]);
  const criticalCount = useMemo(() => rows.filter((r) => getRiskMeta(r, days).tone === 'critical').length, [rows, days]);
  const avgDormancyDays = useMemo(() => {
    const withDays = rows.map((r) => Number(r.daysSinceLastSale ?? 0)).filter((v) => v > 0);
    return withDays.length ? Math.round(withDays.reduce((a, b) => a + b, 0) / withDays.length) : 0;
  }, [rows]);

  const mostExpensive = sortedRows[0];
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePageIndex = Math.min(pageIndex, pageCount - 1);
  const pageRows = filteredRows.slice(safePageIndex * pageSize, safePageIndex * pageSize + pageSize);
  const fromItem = filteredRows.length ? safePageIndex * pageSize + 1 : 0;
  const toItem = Math.min(filteredRows.length, (safePageIndex + 1) * pageSize);

  return (
    <PageKit
      title="کالاهای راکد"
      subtitle={subtitle}
      icon={<i className="fa-solid fa-box-archive" />}
      className="report-merged-page dead-stock-executive-page"
      backAction={() => navigate('/reports')}
      isLoading={isLoading}
      isEmpty={!isLoading && rows.length === 0}
      emptyTitle={err ? 'خطا در دریافت گزارش' : 'کالای راکدی پیدا نشد'}
      emptyDescription={err ? err : 'با آستانه انتخاب‌شده، کالایی با رکود فروش شناسایی نشد.'}
      emptyActionLabel="تلاش دوباره"
      onEmptyAction={() => load(days)}
      toolbarRight={
        <div className="dead-stock-threshold-panel" dir="rtl" aria-label="کنترل آستانه رکود">
          <div className="dead-stock-threshold-panel__label">
            <span><i className="fa-solid fa-hourglass-half" /></span>
            <div>
              <small>آستانه رکود</small>
              <strong>بدون فیلتر تاریخ</strong>
            </div>
          </div>
          <label className="dead-stock-threshold-select" aria-label="انتخاب آستانه رکود">
            <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
              {[30, 60, 90, 120, 180].map((d) => <option key={d} value={d}>{fmt(d)} روز</option>)}
            </select>
            <i className="fa-solid fa-chevron-down" aria-hidden="true" />
          </label>
        </div>
      }
    >
      <div className="dead-stock-layout" dir="rtl">
        <section className="dead-stock-kpi-grid" aria-label="شاخص‌های کالاهای راکد">
          <article className="dead-stock-kpi-card is-primary">
            <span className="dead-stock-kpi-card__icon"><i className="fa-solid fa-boxes-stacked" /></span>
            <div className="dead-stock-kpi-card__body">
              <small>تعداد کالاهای راکد</small>
              <strong>{fmt(rows.length)}</strong>
              <p>کالاهایی که از آستانه {fmt(days)} روز عبور کرده‌اند.</p>
            </div>
          </article>

          <article className="dead-stock-kpi-card">
            <span className="dead-stock-kpi-card__icon"><i className="fa-solid fa-sack-dollar" /></span>
            <div className="dead-stock-kpi-card__body">
              <small>ارزش سرمایه خوابیده</small>
              <strong>{money(totalValue)}</strong>
              <p>ارزش خرید موجودی‌هایی که حرکت فروش ندارند.</p>
            </div>
          </article>

          <article className="dead-stock-kpi-card">
            <span className="dead-stock-kpi-card__icon"><i className="fa-solid fa-cubes" /></span>
            <div className="dead-stock-kpi-card__body">
              <small>تعداد موجودی راکد</small>
              <strong>{fmt(totalStock)}</strong>
              <p>جمع تعداد واحدهای باقی‌مانده در کالاهای راکد.</p>
            </div>
          </article>

          <article className="dead-stock-kpi-card is-warning">
            <span className="dead-stock-kpi-card__icon"><i className="fa-solid fa-triangle-exclamation" /></span>
            <div className="dead-stock-kpi-card__body">
              <small>ریسک بحرانی</small>
              <strong>{fmt(criticalCount)}</strong>
              <p>{fmt(noSaleCount)} کالا بدون سابقه فروش ثبت‌شده است.</p>
            </div>
          </article>
        </section>

        <section className="dead-stock-insight-grid" aria-label="تحلیل مدیریتی کالاهای راکد">
          <article className="dead-stock-insight-card">
            <div className="dead-stock-insight-card__head">
              <span><i className="fa-solid fa-chart-simple" /></span>
              <div>
                <small>میانگین خواب کالا</small>
                <h3>{avgDormancyDays ? `${fmt(avgDormancyDays)} روز` : 'بدون داده کافی'}</h3>
              </div>
            </div>
            <p>این عدد کمک می‌کند بفهمی کالاهای راکد معمولاً چند روز از آخرین فروش فاصله گرفته‌اند. عدد بالا یعنی سرمایه به جای فروش، داخل قفسه مانده است.</p>
          </article>

          <article className="dead-stock-insight-card">
            <div className="dead-stock-insight-card__head">
              <span><i className="fa-solid fa-fire-flame-curved" /></span>
              <div>
                <small>اولویت آزادسازی سرمایه</small>
                <h3>{mostExpensive?.name || '—'}</h3>
              </div>
            </div>
            <p>{mostExpensive ? `${money(mostExpensive.value)} سرمایه روی این کالا خوابیده؛ اولویت بررسی قیمت، تخفیف یا جایگاه نمایش را از این مورد شروع کن.` : 'هنوز کالایی برای تحلیل وجود ندارد.'}</p>
          </article>

          <article className="dead-stock-insight-card dead-stock-insight-card--action">
            <div className="dead-stock-insight-card__head">
              <span><i className="fa-solid fa-route" /></span>
              <div>
                <small>اقدام پیشنهادی</small>
                <h3>از راکدترین کالاها شروع کن</h3>
              </div>
            </div>
            <div className="dead-stock-action-pills">
              <span><i className="fa-solid fa-tag" /> اصلاح قیمت</span>
              <span><i className="fa-solid fa-bullhorn" /> کمپین فروش</span>
              <span><i className="fa-solid fa-ban" /> توقف خرید مجدد</span>
            </div>
          </article>
        </section>

        <section className="dead-stock-table-section" aria-label="جدول کالاهای راکد">
          <div className="dead-stock-table-header">
            <div className="dead-stock-table-title">
              <span><i className="fa-solid fa-table-list" /></span>
              <div>
                <h2>لیست کالاهای راکد</h2>
                <p>{fmt(filteredRows.length)} مورد از {fmt(rows.length)} کالا نمایش داده می‌شود.</p>
              </div>
            </div>

            <div className="dead-stock-table-tools">
              <label className="dead-stock-search" aria-label="جستجو در کالاهای راکد">
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="جستجو در کالا، دسته یا روزهای رکود…"
                  dir="rtl"
                />
                <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
              </label>

              <label className="dead-stock-page-size" aria-label="تعداد در صفحه">
                <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
                  {[10, 20, 50].map((size) => <option key={size} value={size}>{fmt(size)}</option>)}
                </select>
                <span>تعداد در صفحه</span>
              </label>
            </div>
          </div>

          <div className="dead-stock-table-scroll">
            <table className="dead-stock-table">
              <thead>
                <tr>
                  <th>کالا</th>
                  <th>دسته</th>
                  <th>موجودی</th>
                  <th>ارزش خوابیده</th>
                  <th>آخرین فروش</th>
                  <th>روزهای رکود</th>
                  <th>وضعیت</th>
                  <th>اقدام</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r) => {
                  const risk = getRiskMeta(r, days);
                  return (
                    <tr key={r.productId}>
                      <td>
                        <div className="dead-stock-product-cell">
                          <strong>{r.name}</strong>
                          <span>شناسه کالا: {fmt(r.productId)}</span>
                        </div>
                      </td>
                      <td>{r.categoryName || 'بدون دسته'}</td>
                      <td>{fmt(r.stock)}</td>
                      <td>{money(r.value)}</td>
                      <td>{formatLastSale(r.lastSaleDate)}</td>
                      <td>{r.daysSinceLastSale != null ? `${fmt(Number(r.daysSinceLastSale))} روز` : 'نامشخص'}</td>
                      <td>
                        <span className={`dead-stock-risk-badge is-${risk.tone}`} title={risk.hint}>
                          <i className={`fa-solid ${risk.icon}`} />
                          {risk.label}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => navigate(`/products?search=${encodeURIComponent(r.name)}`)}
                          className="dead-stock-row-action"
                          title="نمایش این کالا در صفحه کالاها"
                        >
                          <i className="fa-solid fa-arrow-up-right-from-square" />
                          <span>پرونده کالا</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="dead-stock-pagination" aria-label="صفحه‌بندی کالاهای راکد">
            <span>{fmt(fromItem)} تا {fmt(toItem)} از {fmt(filteredRows.length)}</span>
            <div>
              <button type="button" onClick={() => setPageIndex((v) => Math.max(0, v - 1))} disabled={safePageIndex === 0}>
                <i className="fa-solid fa-chevron-right" />
                قبلی
              </button>
              <strong>صفحه {fmt(safePageIndex + 1)} از {fmt(pageCount)}</strong>
              <button type="button" onClick={() => setPageIndex((v) => Math.min(pageCount - 1, v + 1))} disabled={safePageIndex >= pageCount - 1}>
                بعدی
                <i className="fa-solid fa-chevron-left" />
              </button>
            </div>
          </div>
        </section>
      </div>
    </PageKit>
  );
}
