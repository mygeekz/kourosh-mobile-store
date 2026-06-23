// pages/reports/CompareSalesPage.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import moment from 'jalali-moment';
import ShamsiDatePicker from '../../components/ShamsiDatePicker';
import ReportDatePresetChips from '../../components/reports/ReportDatePresetChips';
import Notification from '../../components/Notification';
import { useAuth } from '../../contexts/AuthContext';
import { useStyle } from '../../contexts/StyleContext';
import { apiFetch } from '../../utils/apiFetch';
import { formatIsoToShamsi } from '../../utils/dateUtils';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useReportsExports } from '../../contexts/ReportsExportsContext';
import { formatCurrencyText, readStoredCurrencyUnit } from '../../utils/currency';
import {
  VAZIR_FAMILY,
  VAZIR_REGULAR_FILE,
  VAZIR_BOLD_FILE,
  vazirRegularB64,
  vazirBoldB64,
} from '../../utils/vazirFont';

type Baseline = 'prev' | 'last_year';

type CompareApiResponse = {
  success: boolean;
  data?: {
    currentAmount: number;
    previousAmount: number;
    percentageChange: number | null;
    currentRange: { from: string; to: string };
    previousRange: { from: string; to: string };
    baseline: Baseline;
  };
  message?: string;
};

type SaleRow = {
  id: number;
  transactionDate: string;
  customerFullName?: string | null;
  totalPrice?: number | null;
  profit?: number | null;
};

const price = (n: number | null | undefined) =>
  formatCurrencyText(Number(n || 0), readStoredCurrencyUnit());

export default function CompareSalesPage() {
  const { token } = useAuth();
  const { style } = useStyle();
  const { registerReportExports } = useReportsExports();
  const exportExcelRef = useRef<() => void>(() => {});
  const brand = `hsl(${style.primaryHue} 90% 55%)`;
  const brandTint = `hsla(${style.primaryHue} 95% 62% / .15)`;

  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(moment().startOf('jMonth').toDate());
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [baseline, setBaseline] = useState<Baseline>('prev');
  const [data, setData] = useState<CompareApiResponse['data'] | null>(null);
  const [loading, setLoading] = useState(false);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsTitle, setDetailsTitle] = useState('');
  const [detailsRows, setDetailsRows] = useState<SaleRow[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const currentRangeLabel = useMemo(() => {
    if (!data) return '—';
    return `${data.currentRange.from} تا ${data.currentRange.to}`;
  }, [data]);

  const previousRangeLabel = useMemo(() => {
    if (!data) return '—';
    return `${data.previousRange.from} تا ${data.previousRange.to}`;
  }, [data]);

  const fetchCompare = async () => {
    if (!startDate || !endDate) {
      setNotification({ type: 'warning', text: 'لطفاً تاریخ شروع و پایان را انتخاب کنید.' });
      return;
    }

    const fromDate = moment(startDate).locale('en').format('jYYYY/jMM/jDD');
    const toDate = moment(endDate).locale('en').format('jYYYY/jMM/jDD');

    try {
      setLoading(true);
      setNotification(null);
      const res = await apiFetch(
        `/api/reports/compare-sales?fromDate=${fromDate}&toDate=${toDate}&baseline=${baseline}`,
      );
      const json: CompareApiResponse = await res.json();
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.message || 'خطا در دریافت گزارش مقایسه‌ای');
      }
      setData(json.data);
    } catch (e: any) {
      setData(null);
      setNotification({ type: 'error', text: e.message || 'خطا در عملیاتی نامشخص رخ داد' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!startDate || !endDate) return;
    const t = window.setTimeout(() => {
      void fetchCompare();
    }, 250);
    return () => window.clearTimeout(t);
  }, [startDate, endDate, baseline]);

  const preset = (
    key: 'this_week' | 'last_7' | 'this_month' | 'last_30' | 'this_year',
    base?: Baseline,
  ) => {
    const now = moment();
    let s = now.clone();
    let e = now.clone();

    switch (key) {
      case 'this_week':
        s = now.clone().startOf('week');
        e = now.clone().endOf('week');
        break;
      case 'last_7':
        s = now.clone().subtract(6, 'day');
        e = now.clone();
        break;
      case 'this_month':
        s = now.clone().startOf('jMonth');
        e = now.clone();
        break;
      case 'last_30':
        s = now.clone().subtract(29, 'day');
        e = now.clone();
        break;
      case 'this_year':
        s = now.clone().startOf('jYear');
        e = now.clone();
        break;
    }

    setStartDate(s.toDate());
    setEndDate(e.toDate());
    if (base) setBaseline(base);
  };

  const openDetails = async (kind: 'current' | 'previous') => {
    if (!data) return;
    const range = kind === 'current' ? data.currentRange : data.previousRange;

    setDetailsTitle(
      kind === 'current'
        ? `جزئیات دوره فعلی (${range.from} تا ${range.to})`
        : `جزئیات دوره مبنا (${range.from} تا ${range.to})`,
    );
    setDetailsRows([]);
    setDetailsOpen(true);
    setDetailsLoading(true);

    try {
      const res = await apiFetch('/api/sales');
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'خطا در دریافت لیست فروش');
      }

      const all: SaleRow[] = json.data || [];
      const fromISO = moment(range.from, 'jYYYY/jMM/jDD').startOf('day');
      const toISO = moment(range.to, 'jYYYY/jMM/jDD').endOf('day');

      const rows = all.filter((row) => {
        const m = moment(row.transactionDate);
        return m.isValid() && m.isSameOrAfter(fromISO) && m.isSameOrBefore(toISO);
      });

      rows.sort((a, b) => (a.transactionDate < b.transactionDate ? 1 : -1));
      setDetailsRows(rows);
    } catch (e: any) {
      setNotification({ type: 'error', text: e.message || 'خطا در بارگذاری جزئیات' });
    } finally {
      setDetailsLoading(false);
    }
  };

  const kpi = useMemo(() => {
    const count = detailsRows.length;
    const total = detailsRows.reduce((s, r) => s + Number(r.totalPrice || 0), 0);
    const profit = detailsRows.reduce((s, r) => s + Number(r.profit || 0), 0);
    const avg = count ? total / count : 0;
    return { count, total, profit, avg };
  }, [detailsRows]);

  const exportExcel = () => {
    if (!detailsRows.length) return;

    const wsData = [
      ['شناسه', 'تاریخ', 'مشتری', 'مبلغ', 'سود'],
      ...detailsRows.map((r) => [
        r.id,
        formatIsoToShamsi(r.transactionDate),
        r.customerFullName || 'مهمان',
        Number(r.totalPrice || 0),
        Number(r.profit || 0),
      ]),
      [],
      ['تعداد فاکتور', kpi.count],
      ['مجموع فروش', kpi.total],
      ['مجموع سود', kpi.profit],
      ['میانگین فروش', kpi.avg],
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'جزئیات فروش');
    const fileName = (detailsTitle || 'report') + '.xlsx';
    XLSX.writeFile(wb, fileName);
  };

  exportExcelRef.current = exportExcel;

  useEffect(() => {
    registerReportExports({ excel: () => exportExcelRef.current() });
    return () => registerReportExports({});
  }, [registerReportExports]);

  const ensureVazirFont = (doc: jsPDF) => {
    if (vazirRegularB64 && vazirRegularB64.length > 0) {
      doc.addFileToVFS(VAZIR_REGULAR_FILE, vazirRegularB64);
      doc.addFont(VAZIR_REGULAR_FILE, VAZIR_FAMILY, 'normal');
    }
    if (vazirBoldB64 && vazirBoldB64.length > 0) {
      doc.addFileToVFS(VAZIR_BOLD_FILE, vazirBoldB64);
      doc.addFont(VAZIR_BOLD_FILE, VAZIR_FAMILY, 'bold');
    }
  };

  const exportPDF = () => {
    if (!detailsRows.length) return;

    const doc = new jsPDF({ orientation: 'p', unit: 'pt' });
    ensureVazirFont(doc);

    const hasRegular = !!(vazirRegularB64 && vazirRegularB64.length);
    doc.setFont(VAZIR_FAMILY, hasRegular ? 'normal' : 'bold');
    doc.setFontSize(12);

    const pageWidth = doc.internal.pageSize.getWidth();
    const marginX = 40;
    const title = detailsTitle || 'جزئیات فروش';
    doc.text(title, pageWidth - marginX, 40, { align: 'right' });

    const head = [['شناسه', 'تاریخ', 'مشتری', 'مبلغ', 'سود']];
    const body = detailsRows.map((r) => [
      String(r.id),
      formatIsoToShamsi(r.transactionDate),
      r.customerFullName || 'مهمان',
      Number(r.totalPrice || 0).toLocaleString('fa-IR'),
      Number(r.profit || 0).toLocaleString('fa-IR'),
    ]);

    autoTable(doc, {
      head,
      body,
      startY: 60,
      theme: 'grid',
      styles: {
        font: VAZIR_FAMILY,
        fontSize: 10,
        halign: 'right',
        cellPadding: { top: 6, right: 6, bottom: 6, left: 6 },
        lineColor: [220, 220, 220],
        lineWidth: 0.5,
        textColor: [40, 40, 40],
      },
      headStyles: {
        font: VAZIR_FAMILY,
        fontStyle: 'bold',
        fillColor: [245, 245, 245],
        textColor: [30, 30, 30],
        halign: 'center',
      },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      columnStyles: {
        0: { halign: 'center', cellWidth: 60 },
        1: { halign: 'center', cellWidth: 95 },
        2: { halign: 'right', cellWidth: 180 },
        3: { halign: 'right', cellWidth: 110 },
        4: { halign: 'right', cellWidth: 90 },
      },
      margin: { left: marginX, right: marginX },
      didDrawPage: ({ pageNumber }) => {
        const footer = `صفحه ${pageNumber}`;
        doc.setFont(VAZIR_FAMILY, hasRegular ? 'normal' : 'bold');
        doc.setFontSize(9);
        doc.text(footer, pageWidth - marginX, doc.internal.pageSize.getHeight() - 20, {
          align: 'right',
        });
      },
    });

    const lastY = (doc as any).lastAutoTable?.finalY || 60;
    const y = lastY + 18;

    doc.setFont(VAZIR_FAMILY, 'bold');
    doc.text('خلاصه:', pageWidth - marginX, y, { align: 'right' });
    doc.setFont(VAZIR_FAMILY, hasRegular ? 'normal' : 'bold');
    doc.text(`تعداد فاکتور: ${kpi.count.toLocaleString('fa-IR')}`, pageWidth - marginX, y + 18, {
      align: 'right',
    });
    doc.text(`مجموع فروش: ${kpi.total.toLocaleString('fa-IR')} تومان`, pageWidth - marginX, y + 36, {
      align: 'right',
    });
    doc.text(`مجموع سود: ${kpi.profit.toLocaleString('fa-IR')} تومان`, pageWidth - marginX, y + 54, {
      align: 'right',
    });
    doc.text(`میانگین فروش: ${kpi.avg.toLocaleString('fa-IR')} تومان`, pageWidth - marginX, y + 72, {
      align: 'right',
    });

    const fileName = (detailsTitle || 'report') + '.pdf';
    doc.save(fileName);
  };

  const posNegClass = (val: number | null) => {
    if (val === null) return 'text-gray-500 dark:text-gray-400';
    return val >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';
  };

  const deltaAmount = data ? data.currentAmount - data.previousAmount : 0;
  const trendTone = !data || data.percentageChange === null ? 'neutral' : data.percentageChange >= 0 ? 'positive' : 'negative';
  const trendLabel = !data || data.percentageChange === null ? 'بدون مبنای قابل مقایسه' : data.percentageChange >= 0 ? 'رشد فروش' : 'افت فروش';

  return (
    <div className="report-page" dir="rtl">
      <Notification message={notification} onClose={() => setNotification(null)} />

      <div className="compare-sales-executive-page" dir="rtl">
        <section className="compare-sales-filter-panel" aria-label="فیلترهای مقایسه دوره‌ای فروش">
          <div className="compare-sales-filter-row compare-sales-filter-row--primary">
            <div className="compare-sales-primary-group compare-sales-primary-group--presets">
              <ReportDatePresetChips
                fromDate={startDate}
                toDate={endDate}
                onChange={({ from, to }) => { setStartDate(from); setEndDate(to); }}
                compact
                className="compare-sales-date-presets"
              />
            </div>

            <div className="compare-sales-primary-group compare-sales-primary-group--fields">
              <label className="compare-sales-date-box">
                <span>از تاریخ</span>
                <ShamsiDatePicker
                  selectedDate={startDate}
                  onDateChange={setStartDate}
                  inputClassName="compare-sales-date-input"
                />
              </label>

              <label className="compare-sales-date-box">
                <span>تا تاریخ</span>
                <ShamsiDatePicker
                  selectedDate={endDate}
                  onDateChange={setEndDate}
                  inputClassName="compare-sales-date-input"
                />
              </label>

              <label className="compare-sales-baseline-select">
                <span>مبنای مقایسه</span>
                <select value={baseline} onChange={(e) => setBaseline(e.target.value as Baseline)}>
                  <option value="prev">دوره قبلی هم‌طول</option>
                  <option value="last_year">همین بازه در سال قبل</option>
                </select>
              </label>

              <button
                onClick={fetchCompare}
                disabled={loading || !token}
                className="compare-sales-refresh-button"
                type="button"
              >
                <i className={`fa-solid ${loading ? 'fa-spinner fa-spin' : 'fa-rotate'}`} />
                {loading ? 'در حال محاسبه' : 'محاسبه'}
              </button>
            </div>
          </div>

          <div className="compare-sales-filter-row compare-sales-filter-row--secondary">
            <span className="compare-sales-filter-label">میانبرهای مقایسه‌ای</span>
            <button onClick={() => preset('this_week')} type="button">هفته جاری</button>
            <button onClick={() => preset('this_year')} type="button">سال جاری</button>
            <button onClick={() => preset('this_month', 'prev')} type="button">ماه جاری + دوره قبلی</button>
            <button onClick={() => preset('this_month', 'last_year')} type="button">ماه جاری + سال قبل</button>
          </div>
        </section>

        {data ? (
          <>
            <section className="compare-sales-section" aria-label="خلاصه مقایسه فروش">
              <div className="compare-sales-section__head">
                <div>
                  <h2><i className="fa-solid fa-chart-simple" /> خلاصه مقایسه فروش</h2>
                  <p>مقایسه فروش دوره انتخابی با دوره مبنا؛ برای تشخیص رشد، افت و تغییرات درآمد.</p>
                </div>
                <span className={`compare-sales-trend-badge compare-sales-trend-badge--${trendTone}`}>{trendLabel}</span>
              </div>

              <div className="compare-sales-metric-grid">
                <article className="compare-sales-metric-card">
                  <span className="compare-sales-metric-card__icon"><i className="fa-solid fa-chart-line" /></span>
                  <div>
                    <span className="compare-sales-metric-card__label">فروش دوره فعلی</span>
                    <strong>{price(data.currentAmount)}</strong>
                    <small>{currentRangeLabel}</small>
                    <button onClick={() => openDetails('current')} type="button">جزئیات دوره فعلی</button>
                  </div>
                </article>

                <article className="compare-sales-metric-card">
                  <span className="compare-sales-metric-card__icon"><i className="fa-solid fa-clock-rotate-left" /></span>
                  <div>
                    <span className="compare-sales-metric-card__label">فروش دوره مبنا</span>
                    <strong>{price(data.previousAmount)}</strong>
                    <small>{previousRangeLabel}</small>
                    <button onClick={() => openDetails('previous')} type="button">جزئیات دوره مبنا</button>
                  </div>
                </article>

                <article className="compare-sales-metric-card">
                  <span className="compare-sales-metric-card__icon"><i className="fa-solid fa-scale-balanced" /></span>
                  <div>
                    <span className="compare-sales-metric-card__label">اختلاف فروش</span>
                    <strong className={posNegClass(deltaAmount)}>{price(deltaAmount)}</strong>
                    <small>اختلاف دوره فعلی نسبت به مبنا</small>
                  </div>
                </article>

                <article className="compare-sales-metric-card">
                  <span className="compare-sales-metric-card__icon"><i className="fa-solid fa-percent" /></span>
                  <div>
                    <span className="compare-sales-metric-card__label">درصد تغییر</span>
                    <strong className={posNegClass(data.percentageChange)}>{data.percentageChange === null ? '—' : `${data.percentageChange.toFixed(2)}٪`}</strong>
                    <small>مبنا: {data.baseline === 'last_year' ? 'سال قبل' : 'دوره قبلی هم‌طول'}</small>
                  </div>
                </article>
              </div>
            </section>
          </>
        ) : !loading ? (
          <section className="compare-sales-empty-state">
            <i className="fa-solid fa-chart-simple" />
            <strong>بازه و مبنا را انتخاب کنید</strong>
            <span>برای نمایش مقایسه، تاریخ شروع و پایان را مشخص کنید و محاسبه را بزنید.</span>
          </section>
        ) : null}
      </div>

      {detailsOpen && createPortal(
        <div className="compare-sales-details-portal" onClick={() => setDetailsOpen(false)} dir="rtl">
          <section className="compare-sales-details-shell" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={detailsTitle}>
            <header className="compare-sales-details-shell__header">
              <div className="compare-sales-details-shell__title">
                <span className="compare-sales-details-shell__icon"><i className="fa-solid fa-table-list" /></span>
                <div>
                  <strong>{detailsTitle}</strong>
                  <small>فاکتورهای ثبت‌شده در دوره انتخابی</small>
                </div>
              </div>
              <button type="button" className="compare-sales-details-shell__close" onClick={() => setDetailsOpen(false)} aria-label="بستن">
                <i className="fa-solid fa-xmark" />
              </button>
            </header>

            <div className="compare-sales-details-modal" dir="rtl">
              {detailsLoading ? (
                <div className="compare-sales-details-state">
                  <i className="fa-solid fa-spinner fa-spin" />
                  <span>در حال دریافت جزئیات دوره...</span>
                </div>
              ) : detailsRows.length === 0 ? (
                <div className="compare-sales-details-state">
                  <i className="fa-solid fa-file-circle-xmark" />
                  <span>موردی برای این دوره یافت نشد.</span>
                </div>
              ) : (
                <>
                  <div className="compare-sales-details-summary" aria-label="خلاصه جزئیات دوره">
                    {[
                      { icon: 'fa-receipt', k: 'تعداد فاکتور', v: kpi.count.toLocaleString('fa-IR') },
                      { icon: 'fa-sack-dollar', k: 'مجموع فروش', v: price(kpi.total) },
                      { icon: 'fa-chart-line', k: 'مجموع سود', v: price(kpi.profit) },
                      { icon: 'fa-calculator', k: 'میانگین فروش', v: price(kpi.avg) },
                    ].map((box, i) => (
                      <div key={i} className="compare-sales-details-summary-card">
                        <span className="compare-sales-details-summary-card__icon"><i className={`fa-solid ${box.icon}`} /></span>
                        <span className="compare-sales-details-summary-card__label">{box.k}</span>
                        <strong>{box.v}</strong>
                      </div>
                    ))}
                  </div>

                  <div className="compare-sales-details-table-shell">
                    <table className="compare-sales-details-table">
                      <thead>
                        <tr>
                          <th>تاریخ</th>
                          <th>مشتری</th>
                          <th>مبلغ فروش</th>
                          <th>سود</th>
                          <th>اقدام</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailsRows.map((r) => (
                          <tr key={r.id}>
                            <td>
                              <strong>{formatIsoToShamsi(r.transactionDate)}</strong>
                              <small>شناسه سند: {r.id.toLocaleString('fa-IR')}</small>
                            </td>
                            <td>{r.customerFullName || 'مهمان'}</td>
                            <td>{price(r.totalPrice)}</td>
                            <td><span className={posNegClass(r.profit ?? 0)}>{price(r.profit ?? 0)}</span></td>
                            <td>
                              <a className="compare-sales-details-action" href={`#/invoices/${r.id}`} title="مشاهده فاکتور">
                                <i className="fa-solid fa-file-invoice" />
                                مشاهده فاکتور
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </section>
        </div>,
        document.body
      )}
    </div>
  );
}
