// pages/reports/PhoneSalesReportPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import moment from 'jalali-moment';

import { PhoneSaleProfitReportItem, NotificationMessage } from '../../types';
import Notification from '../../components/Notification';
import ShamsiDatePicker from '../../components/ShamsiDatePicker';
import ReportDatePresetChips from '../../components/reports/ReportDatePresetChips';
import { formatIsoToShamsi } from '../../utils/dateUtils';
import { apiFetch } from '../../utils/apiFetch';
import { formatCurrencyText, readStoredCurrencyUnit } from '../../utils/currency';

const toShamsiStr = (d: Date) => moment(d).locale('en').format('jYYYY/jMM/jDD');
const money = (v: number) => formatCurrencyText(v ?? 0, readStoredCurrencyUnit());
const faNum = (v: number) => Number(v || 0).toLocaleString('fa-IR');

const profitTone = (v: number) => (v > 0 ? 'positive' : v < 0 ? 'negative' : 'neutral');

const PhoneSalesReportPage: React.FC = () => {
  const [reportData, setReportData] = useState<PhoneSaleProfitReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);

  const [startDate, setStartDate] = useState<Date | null>(moment().startOf('jMonth').toDate());
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [pageIndex, setPageIndex] = useState(0);

  const fetchPhoneSales = async () => {
    if (!startDate || !endDate) {
      setNotification({ type: 'warning', text: 'لطفاً تاریخ شروع و پایان را انتخاب کنید.' });
      return;
    }

    const fromDate = toShamsiStr(startDate);
    const toDate = toShamsiStr(endDate);

    try {
      setIsLoading(true);
      setNotification(null);
      const res = await apiFetch(`/api/reports/phone-sales?fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'خطا در دریافت گزارش فروش نقدی موبایل');
      }
      setReportData(Array.isArray(json.data) ? json.data : []);
      setPageIndex(0);
    } catch (e: any) {
      setReportData([]);
      setNotification({ type: 'error', text: e.message || 'خطا در دریافت گزارش فروش نقدی موبایل' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchPhoneSales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPageIndex(0);
  }, [searchQuery, pageSize]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return reportData;
    return reportData.filter((row) => {
      const haystack = [
        row.phoneModel,
        row.imei,
        row.customerFullName || 'مهمان',
        String(row.transactionId),
        formatIsoToShamsi(row.transactionDate),
      ].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [reportData, searchQuery]);

  const totalRevenue = filteredRows.reduce((sum, row) => sum + (row.totalPrice ?? 0), 0);
  const totalPurchase = filteredRows.reduce((sum, row) => sum + (row.purchasePrice ?? 0), 0);
  const totalProfit = filteredRows.reduce((sum, row) => sum + (row.profit ?? 0), 0);
  const count = filteredRows.length;
  const avgProfit = count ? Math.round(totalProfit / count) : 0;
  const margin = totalRevenue ? Math.round((totalProfit / totalRevenue) * 1000) / 10 : 0;

  const topModels = useMemo(() => {
    const map = new Map<string, { model: string; revenue: number; profit: number; count: number }>();
    for (const row of filteredRows) {
      const model = (row.phoneModel || 'نامشخص').trim();
      const cur = map.get(model) || { model, revenue: 0, profit: 0, count: 0 };
      cur.revenue += row.totalPrice ?? 0;
      cur.profit += row.profit ?? 0;
      cur.count += 1;
      map.set(model, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 4);
  }, [filteredRows]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePageIndex = Math.min(pageIndex, pageCount - 1);
  const pageRows = filteredRows.slice(safePageIndex * pageSize, safePageIndex * pageSize + pageSize);

  const summaryCards = [
    { label: 'تعداد فروش نقدی', value: `${faNum(count)} ردیف`, hint: 'فروش گوشی ثبت‌شده در بازه', icon: 'fa-mobile-screen-button', tone: 'blue' },
    { label: 'جمع فروش نقدی', value: money(totalRevenue), hint: 'ارزش فروش نقدی موبایل', icon: 'fa-sack-dollar', tone: 'green' },
    { label: 'سود نقدی', value: money(totalProfit), hint: `حاشیه سود: ${faNum(margin)}٪`, icon: 'fa-chart-line', tone: profitTone(totalProfit) },
    { label: 'میانگین سود هر فروش', value: money(avgProfit), hint: 'میانگین سود به ازای هر دستگاه', icon: 'fa-percent', tone: profitTone(avgProfit) },
  ];

  return (
    <div className="report-page phone-sales-executive-page" dir="rtl">
      <Notification message={notification} onClose={() => setNotification(null)} />

      <section className="phone-sales-filter-panel" aria-label="فیلترهای فروش نقدی موبایل">
        <div className="phone-sales-filter-row phone-sales-filter-row--primary">
          <div className="phone-sales-filter-group phone-sales-filter-group--presets">
            <ReportDatePresetChips
              fromDate={startDate}
              toDate={endDate}
              onChange={({ from, to }) => { setStartDate(from); setEndDate(to); }}
              compact
              className="phone-sales-date-presets"
            />
          </div>

          <div className="phone-sales-filter-group phone-sales-filter-group--fields">
            <label className="phone-sales-date-box">
              <span>از تاریخ</span>
              <ShamsiDatePicker
                selectedDate={startDate}
                onDateChange={setStartDate}
                inputClassName="phone-sales-date-input"
              />
            </label>

            <label className="phone-sales-date-box">
              <span>تا تاریخ</span>
              <ShamsiDatePicker
                selectedDate={endDate}
                onDateChange={setEndDate}
                inputClassName="phone-sales-date-input"
              />
            </label>

            <button type="button" className="phone-sales-refresh-button" onClick={() => void fetchPhoneSales()} disabled={isLoading}>
              <i className={`fa-solid ${isLoading ? 'fa-spinner fa-spin' : 'fa-rotate'}`} />
              {isLoading ? 'در حال دریافت' : 'به‌روزرسانی'}
            </button>
          </div>
        </div>
      </section>

      <section className="phone-sales-section" aria-label="خلاصه فروش نقدی موبایل">
        <div className="phone-sales-section__head">
          <div>
            <h2><i className="fa-solid fa-mobile-screen-button" /> خلاصه فروش نقدی موبایل</h2>
            <p>شاخص‌های اصلی فروش نقدی گوشی، سود و میانگین عملکرد در بازه انتخابی.</p>
          </div>
        </div>

        <div className="phone-sales-metric-grid">
          {summaryCards.map((card) => (
            <article key={card.label} className={`phone-sales-metric-card phone-sales-metric-card--${card.tone}`}>
              <span className="phone-sales-metric-card__icon"><i className={`fa-solid ${card.icon}`} /></span>
              <div className="phone-sales-metric-card__content">
                <span className="phone-sales-metric-card__label">{card.label}</span>
                <strong>{card.value}</strong>
                <small>{card.hint}</small>
              </div>
            </article>
          ))}
        </div>
      </section>

      {topModels.length > 0 ? (
        <section className="phone-sales-section" aria-label="مدل‌های پرفروش نقدی">
          <div className="phone-sales-section__head phone-sales-section__head--compact">
            <div>
              <h2><i className="fa-solid fa-ranking-star" /> مدل‌های پرفروش نقدی</h2>
              <p>مدل‌هایی که بیشترین فروش نقدی را در بازه انتخابی داشته‌اند.</p>
            </div>
          </div>

          <div className="phone-sales-top-grid">
            {topModels.map((model, index) => (
              <article className="phone-sales-top-card" key={model.model}>
                <span className="phone-sales-top-card__rank">#{faNum(index + 1)}</span>
                <strong>{model.model}</strong>
                <small>{faNum(model.count)} فروش</small>
                <div className="phone-sales-top-card__meta">
                  <span>{money(model.revenue)}</span>
                  <span>سود: {money(model.profit)}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="phone-sales-section phone-sales-table-section" aria-label="جزئیات فروش نقدی موبایل">
        <div className="phone-sales-table-header">
          <div className="phone-sales-table-title">
            <span className="phone-sales-table-title__icon"><i className="fa-solid fa-receipt" /></span>
            <div>
              <h2>جزئیات فروش نقدی موبایل</h2>
              <p>{faNum(filteredRows.length)} ردیف فیلترشده · جمع فروش: {money(totalRevenue)}</p>
            </div>
          </div>

          <div className="phone-sales-table-tools phone-sales-table-tools--final">
            <div className="phone-sales-table-search-final" dir="ltr" role="search">
              <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
              <input
                aria-label="جستجوی جدول فروش نقدی موبایل"
                dir="rtl"
                type="text"
                placeholder="جستجو بر اساس مدل، IMEI یا مشتری…"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
            <div className="phone-sales-page-size-shell">
              <select aria-label="تعداد ردیف در صفحه" value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
                <option value={10}>۱۰</option>
                <option value={20}>۲۰</option>
                <option value={50}>۵۰</option>
              </select>
              <span>تعداد در صفحه</span>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="phone-sales-empty-state">در حال دریافت داده‌ها…</div>
        ) : pageRows.length === 0 ? (
          <div className="phone-sales-empty-state">برای این بازه، فروش نقدی موبایل ثبت نشده است.</div>
        ) : (
          <div className="phone-sales-table-shell">
            <table className="phone-sales-table">
              <colgroup>
                <col className="phone-sales-col-date" />
                <col className="phone-sales-col-phone" />
                <col className="phone-sales-col-customer" />
                <col className="phone-sales-col-money" />
                <col className="phone-sales-col-profit" />
                <col className="phone-sales-col-action" />
              </colgroup>
              <thead>
                <tr>
                  <th>تاریخ و سند</th>
                  <th>گوشی</th>
                  <th>مشتری</th>
                  <th>مبلغ فروش</th>
                  <th>سود</th>
                  <th>اقدام</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => (
                  <tr key={`${row.transactionId}-${row.imei}`}>
                    <td>
                      <strong>{formatIsoToShamsi(row.transactionDate)}</strong>
                      <small>شناسه سند: {faNum(row.transactionId)}</small>
                    </td>
                    <td>
                      <div className="phone-sales-phone-cell">
                        <span><i className="fa-solid fa-mobile-screen-button" /></span>
                        <div>
                          <strong>{row.phoneModel || 'مدل نامشخص'}</strong>
                          <small>IMEI: {row.imei || '—'}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <strong>{row.customerFullName || 'مهمان'}</strong>
                    </td>
                    <td>
                      <strong>{money(row.totalPrice)}</strong>
                      <small>قیمت خرید: {money(row.purchasePrice)}</small>
                    </td>
                    <td>
                      <strong className={`phone-sales-profit phone-sales-profit--${profitTone(row.profit)}`}>{money(row.profit)}</strong>
                    </td>
                    <td>
                      <a className="phone-sales-row-action" href={`#/invoices/${row.transactionId}`} title="مشاهده سند فروش">
                        <i className="fa-solid fa-file-invoice" />
                        <span>سند فروش</span>
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="phone-sales-pagination">
          <div className="phone-sales-pagination__buttons">
            <button type="button" disabled={safePageIndex <= 0} onClick={() => setPageIndex(0)}>«</button>
            <button type="button" disabled={safePageIndex <= 0} onClick={() => setPageIndex((p) => Math.max(0, p - 1))}>‹</button>
            <button type="button" disabled={safePageIndex >= pageCount - 1} onClick={() => setPageIndex((p) => Math.min(pageCount - 1, p + 1))}>›</button>
            <button type="button" disabled={safePageIndex >= pageCount - 1} onClick={() => setPageIndex(pageCount - 1)}>»</button>
          </div>
          <span>صفحه {faNum(safePageIndex + 1)} از {faNum(pageCount)}</span>
        </div>
      </section>
    </div>
  );
};

export default PhoneSalesReportPage;
