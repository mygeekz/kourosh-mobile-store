// pages/reports/PhoneInstallmentSalesReportPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import moment from 'jalali-moment';

import { PhoneInstallmentSaleProfitReportItem, NotificationMessage } from '../../types';
import Notification from '../../components/Notification';
import ShamsiDatePicker from '../../components/ShamsiDatePicker';
import ReportDatePresetChips from '../../components/reports/ReportDatePresetChips';
import { formatIsoToShamsiDateTime } from '../../utils/dateUtils';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../utils/apiFetch';
import { formatCurrencyText, readStoredCurrencyUnit } from '../../utils/currency';

const toShamsiStr = (d: Date) => moment(d).locale('en').format('jYYYY/jMM/jDD');
const money = (v: number) => formatCurrencyText(v ?? 0, readStoredCurrencyUnit());
const faNum = (v: number) => Number(v || 0).toLocaleString('fa-IR');
const profitTone = (v: number) => (v > 0 ? 'positive' : v < 0 ? 'negative' : 'neutral');

const PhoneInstallmentSalesReportPage: React.FC = () => {
  const { token } = useAuth();
  const [reportData, setReportData] = useState<PhoneInstallmentSaleProfitReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);

  const [startDate, setStartDate] = useState<Date | null>(moment().startOf('jMonth').toDate());
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [pageIndex, setPageIndex] = useState(0);

  const fetchReport = async () => {
    if (!token) return;
    if (!startDate || !endDate) {
      setNotification({ type: 'warning', text: 'لطفاً تاریخ شروع و پایان را انتخاب کنید.' });
      return;
    }

    const qs = new URLSearchParams();
    qs.set('fromDate', toShamsiStr(startDate));
    qs.set('toDate', toShamsiStr(endDate));

    try {
      setIsLoading(true);
      setNotification(null);
      const res = await apiFetch(`/api/reports/phone-installment-sales?${qs.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'خطا در دریافت گزارش فروش اقساطی موبایل');
      setReportData(Array.isArray(json.data) ? json.data : []);
      setPageIndex(0);
    } catch (e: any) {
      setReportData([]);
      setNotification({ type: 'error', text: e.message || 'خطا در دریافت گزارش فروش اقساطی موبایل' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

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
        String(row.saleId),
        formatIsoToShamsiDateTime(row.dateCreated, 'jYYYY/jMM/jDD HH:mm'),
      ].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [reportData, searchQuery]);

  const totalSaleValue = filteredRows.reduce((sum, row) => sum + (row.actualSalePrice ?? 0), 0);
  const totalPurchase = filteredRows.reduce((sum, row) => sum + (row.purchasePrice ?? 0), 0);
  const totalProfit = filteredRows.reduce((sum, row) => sum + (row.totalProfit ?? 0), 0);
  const count = filteredRows.length;
  const avgSale = count ? Math.round(totalSaleValue / count) : 0;
  const avgProfit = count ? Math.round(totalProfit / count) : 0;
  const margin = totalSaleValue ? Math.round((totalProfit / totalSaleValue) * 1000) / 10 : 0;

  const topCustomers = useMemo(() => {
    const map = new Map<string, { name: string; value: number; profit: number; count: number }>();
    for (const row of filteredRows) {
      const name = (row.customerFullName || 'مهمان').trim();
      const cur = map.get(name) || { name, value: 0, profit: 0, count: 0 };
      cur.value += row.actualSalePrice ?? 0;
      cur.profit += row.totalProfit ?? 0;
      cur.count += 1;
      map.set(name, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.value - a.value).slice(0, 4);
  }, [filteredRows]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePageIndex = Math.min(pageIndex, pageCount - 1);
  const pageRows = filteredRows.slice(safePageIndex * pageSize, safePageIndex * pageSize + pageSize);

  const summaryCards = [
    { label: 'تعداد قرارداد اقساطی', value: `${faNum(count)} ردیف`, hint: 'قراردادهای موبایل در بازه انتخابی', icon: 'fa-file-contract', tone: 'blue' },
    { label: 'جمع فروش اقساطی', value: money(totalSaleValue), hint: 'ارزش قراردادهای اقساطی موبایل', icon: 'fa-sack-dollar', tone: 'green' },
    { label: 'سود اقساطی', value: money(totalProfit), hint: `حاشیه سود: ${faNum(margin)}٪`, icon: 'fa-chart-line', tone: profitTone(totalProfit) },
    { label: 'میانگین سود هر قرارداد', value: money(avgProfit), hint: `میانگین فروش: ${money(avgSale)}`, icon: 'fa-percent', tone: profitTone(avgProfit) },
  ];

  return (
    <div className="report-page installment-sales-executive-page" dir="rtl">
      <Notification message={notification} onClose={() => setNotification(null)} />

      <section className="installment-sales-filter-panel" aria-label="فیلترهای فروش اقساطی موبایل">
        <div className="installment-sales-filter-row">
          <div className="installment-sales-filter-presets">
            <ReportDatePresetChips
              fromDate={startDate}
              toDate={endDate}
              onChange={({ from, to }) => { setStartDate(from); setEndDate(to); }}
              compact
              className="installment-sales-date-presets"
            />
          </div>

          <div className="installment-sales-filter-fields">
            <label className="installment-sales-date-box">
              <span>از تاریخ</span>
              <ShamsiDatePicker
                selectedDate={startDate}
                onDateChange={setStartDate}
                inputClassName="installment-sales-date-input"
              />
            </label>

            <label className="installment-sales-date-box">
              <span>تا تاریخ</span>
              <ShamsiDatePicker
                selectedDate={endDate}
                onDateChange={setEndDate}
                inputClassName="installment-sales-date-input"
              />
            </label>

            <button type="button" className="installment-sales-refresh-button" onClick={() => void fetchReport()} disabled={isLoading || !token}>
              <i className={`fa-solid ${isLoading ? 'fa-spinner fa-spin' : 'fa-rotate'}`} />
              {isLoading ? 'در حال دریافت' : 'به‌روزرسانی'}
            </button>
          </div>
        </div>
      </section>

      <section className="installment-sales-section" aria-label="خلاصه فروش اقساطی موبایل">
        <div className="installment-sales-section__head">
          <div>
            <h2><i className="fa-solid fa-file-invoice-dollar" /> خلاصه فروش اقساطی موبایل</h2>
            <p>شاخص‌های اصلی قراردادهای اقساطی، ارزش فروش، سود و میانگین عملکرد در بازه انتخابی.</p>
          </div>
        </div>

        <div className="installment-sales-metric-grid">
          {summaryCards.map((card) => (
            <article key={card.label} className={`installment-sales-metric-card installment-sales-metric-card--${card.tone}`}>
              <span className="installment-sales-metric-card__icon"><i className={`fa-solid ${card.icon}`} /></span>
              <div className="installment-sales-metric-card__content">
                <span className="installment-sales-metric-card__label">{card.label}</span>
                <strong>{card.value}</strong>
                <small>{card.hint}</small>
              </div>
            </article>
          ))}
        </div>
      </section>

      {topCustomers.length ? (
        <section className="installment-sales-section" aria-label="مشتریان برتر اقساطی">
          <div className="installment-sales-section__head installment-sales-section__head--compact">
            <div>
              <h2><i className="fa-solid fa-ranking-star" /> مشتریان برتر اقساطی</h2>
              <p>مشتریانی که بیشترین ارزش قرارداد اقساطی را در بازه انتخابی داشته‌اند.</p>
            </div>
          </div>

          <div className="installment-sales-top-grid">
            {topCustomers.map((customer, index) => (
              <article className="installment-sales-top-card" key={customer.name}>
                <span className="installment-sales-top-card__rank">#{faNum(index + 1)}</span>
                <strong>{customer.name}</strong>
                <small>{faNum(customer.count)} قرارداد</small>
                <div className="installment-sales-top-card__meta">
                  <span>{money(customer.value)}</span>
                  <span>سود: {money(customer.profit)}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="installment-sales-section installment-sales-table-section" aria-label="جزئیات فروش اقساطی موبایل">
        <div className="installment-sales-table-header">
          <div className="installment-sales-table-title">
            <span className="installment-sales-table-title__icon"><i className="fa-solid fa-receipt" /></span>
            <div>
              <h2>جزئیات فروش اقساطی موبایل</h2>
              <p>{faNum(filteredRows.length)} ردیف فیلترشده · جمع فروش: {money(totalSaleValue)}</p>
            </div>
          </div>

          <div className="installment-sales-table-tools">
            <div className="installment-sales-search-field" dir="ltr" role="search">
              <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
              <input
                aria-label="جستجوی جدول فروش اقساطی موبایل"
                dir="rtl"
                type="text"
                placeholder="جستجو بر اساس مدل، IMEI یا مشتری…"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
            <div className="installment-sales-page-size-control">
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
          <div className="installment-sales-empty-state">در حال دریافت داده‌ها…</div>
        ) : pageRows.length === 0 ? (
          <div className="installment-sales-empty-state">برای این بازه، فروش اقساطی موبایل ثبت نشده است.</div>
        ) : (
          <div className="installment-sales-table-shell">
            <table className="installment-sales-table">
              <colgroup>
                <col className="installment-sales-col-date" />
                <col className="installment-sales-col-phone" />
                <col className="installment-sales-col-customer" />
                <col className="installment-sales-col-money" />
                <col className="installment-sales-col-profit" />
                <col className="installment-sales-col-action" />
              </colgroup>
              <thead>
                <tr>
                  <th>تاریخ و قرارداد</th>
                  <th>گوشی</th>
                  <th>مشتری</th>
                  <th>مبلغ فروش</th>
                  <th>سود</th>
                  <th>اقدام</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => (
                  <tr key={row.saleId}>
                    <td>
                      <strong>{formatIsoToShamsiDateTime(row.dateCreated, 'jYYYY/jMM/jDD')}</strong>
                      <small>شناسه قرارداد: {faNum(row.saleId)}</small>
                    </td>
                    <td>
                      <div className="installment-sales-phone-cell">
                        <i className="fa-solid fa-mobile-screen-button" />
                        <div>
                          <strong>{row.phoneModel || 'گوشی بدون مدل'}</strong>
                          <small dir="ltr">IMEI: {row.imei || '—'}</small>
                        </div>
                      </div>
                    </td>
                    <td><strong>{row.customerFullName || 'مهمان'}</strong></td>
                    <td>
                      <strong>{money(row.actualSalePrice)}</strong>
                      <small>قیمت خرید: {money(row.purchasePrice)}</small>
                    </td>
                    <td>
                      <strong className={`installment-sales-profit installment-sales-profit--${profitTone(row.totalProfit)}`}>{money(row.totalProfit)}</strong>
                    </td>
                    <td>
                      <a className="installment-sales-row-action" href={`#/installment-sales/${row.saleId}`} title="مشاهده قرارداد اقساطی">
                        <i className="fa-solid fa-file-contract" />
                        <span>پرونده اقساط</span>
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="installment-sales-pagination">
          <div className="installment-sales-pagination__buttons">
            <button type="button" onClick={() => setPageIndex(0)} disabled={safePageIndex === 0}>»</button>
            <button type="button" onClick={() => setPageIndex((p) => Math.max(0, p - 1))} disabled={safePageIndex === 0}>›</button>
            <span>صفحه {faNum(safePageIndex + 1)} از {faNum(pageCount)}</span>
            <button type="button" onClick={() => setPageIndex((p) => Math.min(pageCount - 1, p + 1))} disabled={safePageIndex >= pageCount - 1}>‹</button>
            <button type="button" onClick={() => setPageIndex(pageCount - 1)} disabled={safePageIndex >= pageCount - 1}>«</button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PhoneInstallmentSalesReportPage;
