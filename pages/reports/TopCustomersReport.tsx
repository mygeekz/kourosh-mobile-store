// pages/reports/TopCustomersReportPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import moment from 'jalali-moment';

import { TopCustomerReportItem, NotificationMessage } from '../../types';
import Notification from '../../components/Notification';
import ShamsiDatePicker from '../../components/ShamsiDatePicker';
import ReportDatePresetChips from '../../components/reports/ReportDatePresetChips';
import { useAuth } from '../../contexts/AuthContext';
import { getAuthHeaders } from '../../utils/apiUtils';
import { useReportsExports } from '../../contexts/ReportsExportsContext';
import { formatCurrencyText, readStoredCurrencyUnit } from '../../utils/currency';

const money = (n: number) => formatCurrencyText(n ?? 0, readStoredCurrencyUnit());
const faNum = (n: number) => (n ?? 0).toLocaleString('fa-IR');

function toCSV(rows: Record<string, any>[]) {
  const esc = (v: any) => {
    const s = String(v ?? '');
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const headers = Object.keys(rows[0] ?? {});
  const lines = [headers.map(esc).join(','), ...rows.map((r) => headers.map((h) => esc(r[h])).join(','))];
  return '\uFEFF' + lines.join('\n');
}

function downloadTextFile(filename: string, content: string, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const TopCustomersReportPage: React.FC = () => {
  const { token } = useAuth();
  const { registerReportExports } = useReportsExports();

  const [rows, setRows] = useState<TopCustomerReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);

  const [startDate, setStartDate] = useState<Date | null>(moment().startOf('jMonth').toDate());
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [pageIndex, setPageIndex] = useState(0);

  const fetchTopCustomers = async () => {
    if (!startDate || !endDate || !token) {
      setNotification({ type: 'error', text: 'لطفاً بازه گزارش را انتخاب کنید.' });
      return;
    }

    setIsLoading(true);
    setNotification(null);

    const fromDate = moment(startDate).locale('en').format('jYYYY/jMM/jDD');
    const toDate = moment(endDate).locale('en').format('jYYYY/jMM/jDD');

    try {
      const res = await fetch(`/api/reports/top-customers?fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}`, {
        headers: getAuthHeaders(token),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'خطا در دریافت گزارش مشتریان برتر');
      setRows(Array.isArray(json.data) ? json.data : []);
    } catch (e: any) {
      setNotification({ type: 'error', text: e.message || 'خطا در دریافت گزارش مشتریان برتر' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!token || !startDate || !endDate) return;
    const t = window.setTimeout(() => {
      void fetchTopCustomers();
    }, 250);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, startDate, endDate]);

  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) => {
      return [row.fullName, String(row.customerId), String(row.totalSpent), String(row.transactionCount)]
        .some((part) => String(part ?? '').toLowerCase().includes(query));
    });
  }, [rows, searchQuery]);

  useEffect(() => setPageIndex(0), [searchQuery, pageSize, rows.length]);

  const summary = useMemo(() => {
    const totalSpent = rows.reduce((sum, row) => sum + (row.totalSpent ?? 0), 0);
    const totalTx = rows.reduce((sum, row) => sum + (row.transactionCount ?? 0), 0);
    const avgBasket = totalTx > 0 ? Math.round(totalSpent / totalTx) : 0;
    const top = rows[0];
    const topShare = top && totalSpent > 0 ? Math.round(((top.totalSpent ?? 0) / totalSpent) * 100) : 0;

    return {
      count: rows.length,
      totalSpent,
      totalTx,
      avgBasket,
      topName: top?.fullName ?? '—',
      topShare,
    };
  }, [rows]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePageIndex = Math.min(pageIndex, pageCount - 1);
  const pageRows = filteredRows.slice(safePageIndex * pageSize, safePageIndex * pageSize + pageSize);

  const exportItems = useMemo(() => {
    const fromLabel = startDate ? moment(startDate).format('jYYYY/jMM/jDD') : '—';
    const toLabel = endDate ? moment(endDate).format('jYYYY/jMM/jDD') : '—';
    return [
      {
        key: 'csv',
        label: 'خروجی CSV (اکسل)',
        icon: 'fas fa-file-csv',
        disabled: rows.length === 0,
        onClick: () => {
          const csvRows = rows.map((row, index) => ({
            رتبه: index + 1,
            'نام مشتری': row.fullName ?? '',
            'مجموع خرید': row.totalSpent ?? 0,
            'تعداد تراکنش': row.transactionCount ?? 0,
            'شناسه مشتری': row.customerId ?? '',
          }));
          downloadTextFile(`TopCustomers_${fromLabel}_to_${toLabel}.csv`, toCSV(csvRows));
        },
      },
    ];
  }, [rows, startDate, endDate]);

  useEffect(() => {
    registerReportExports({ excel: () => exportItems[0]?.onClick?.() });
    return () => registerReportExports({});
  }, [registerReportExports, exportItems]);

  const metricCards = [
    { label: 'تعداد مشتریان برتر', value: faNum(summary.count), hint: 'مشتری فعال در بازه', icon: 'fa-users', tone: 'blue' },
    { label: 'جمع خرید', value: money(summary.totalSpent), hint: 'کل خرید مشتریان برتر', icon: 'fa-wallet', tone: 'green' },
    { label: 'تعداد تراکنش', value: faNum(summary.totalTx), hint: 'جمع فاکتورهای ثبت‌شده', icon: 'fa-receipt', tone: 'purple' },
    { label: 'میانگین سبد خرید', value: money(summary.avgBasket), hint: `${summary.topName} · سهم نفر اول ${faNum(summary.topShare)}٪`, icon: 'fa-trophy', tone: 'amber' },
  ];

  return (
    <div className="report-page top-customers-executive-page" dir="rtl">
      <Notification message={notification} onClose={() => setNotification(null)} />

      <section className="top-customers-panel" aria-label="خلاصه و فیلتر مشتریان برتر">
        <div className="top-customers-metric-grid">
          {metricCards.map((card) => (
            <article key={card.label} className={`top-customers-metric-card top-customers-metric-card--${card.tone}`}>
              <span className="top-customers-metric-card__icon"><i className={`fa-solid ${card.icon}`} /></span>
              <div>
                <span>{card.label}</span>
                <strong>{card.value}</strong>
                <small>{card.hint}</small>
              </div>
            </article>
          ))}
        </div>

        <div className="top-customers-filter-row">
          <div className="top-customers-filter-presets">
            <ReportDatePresetChips
              fromDate={startDate}
              toDate={endDate}
              onChange={({ from, to }) => { setStartDate(from); setEndDate(to); }}
              compact
              className="top-customers-date-presets"
            />
          </div>

          <div className="top-customers-filter-fields">
            <label className="top-customers-date-box">
              <span>از تاریخ</span>
              <ShamsiDatePicker selectedDate={startDate} onDateChange={setStartDate} inputClassName="top-customers-date-input" />
            </label>
            <label className="top-customers-date-box">
              <span>تا تاریخ</span>
              <ShamsiDatePicker selectedDate={endDate} onDateChange={(date) => setEndDate(date && startDate && date < startDate ? startDate : date)} inputClassName="top-customers-date-input" />
            </label>
            <button type="button" className="top-customers-refresh-button" onClick={() => void fetchTopCustomers()} disabled={isLoading || !token}>
              <i className={`fa-solid ${isLoading ? 'fa-spinner fa-spin' : 'fa-rotate'}`} />
              {isLoading ? 'در حال دریافت' : 'به‌روزرسانی'}
            </button>
          </div>
        </div>
      </section>

      <section className="top-customers-section" aria-label="لیست مشتریان برتر">
        <div className="top-customers-table-header">
          <div className="top-customers-table-title">
            <span className="top-customers-table-title__icon"><i className="fa-solid fa-ranking-star" /></span>
            <div>
              <h2>لیست مشتریان برتر</h2>
              <p>{faNum(filteredRows.length)} مشتری فیلترشده · جمع خرید: {money(summary.totalSpent)}</p>
            </div>
          </div>

          <div className="top-customers-table-tools">
            <div className="top-customers-search" dir="ltr" role="search">
              <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
              <input
                aria-label="جستجوی مشتریان برتر"
                dir="rtl"
                type="text"
                placeholder="جستجو بر اساس نام، شناسه یا مبلغ…"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>

            <div className="top-customers-page-size">
              <select aria-label="تعداد ردیف در صفحه" value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
                <option value={10}>۱۰</option>
                <option value={20}>۲۰</option>
                <option value={50}>۵۰</option>
              </select>
              <span>تعداد در صفحه</span>
            </div>
          </div>
        </div>

        {isLoading && rows.length === 0 ? (
          <div className="top-customers-empty-state">در حال دریافت گزارش مشتریان برتر…</div>
        ) : filteredRows.length === 0 ? (
          <div className="top-customers-empty-state">برای این بازه مشتری برتری یافت نشد.</div>
        ) : (
          <div className="top-customers-table-shell">
            <table className="top-customers-table">
              <colgroup>
                <col className="top-customers-col-rank" />
                <col className="top-customers-col-customer" />
                <col className="top-customers-col-spent" />
                <col className="top-customers-col-count" />
                <col className="top-customers-col-action" />
              </colgroup>
              <thead>
                <tr>
                  <th>رتبه</th>
                  <th>مشتری</th>
                  <th>مجموع خرید</th>
                  <th>تراکنش</th>
                  <th>اقدام</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row, index) => {
                  const rank = safePageIndex * pageSize + index + 1;
                  return (
                    <tr key={row.customerId}>
                      <td><span className="top-customers-rank">{faNum(rank)}</span></td>
                      <td>
                        <div className="top-customers-customer-cell">
                          <strong>{row.fullName || 'مشتری بدون نام'}</strong>
                          <small>کد مشتری: {faNum(row.customerId)}</small>
                        </div>
                      </td>
                      <td><strong className="top-customers-money">{money(row.totalSpent)}</strong></td>
                      <td>{faNum(row.transactionCount)}</td>
                      <td>
                        <Link className="top-customers-row-action" to={`/customers/${row.customerId}`}>
                          <i className="fa-solid fa-user" />
                          <span>پرونده مشتری</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {filteredRows.length > 0 ? (
          <div className="top-customers-pagination">
            <div className="top-customers-pagination__buttons">
              <button type="button" onClick={() => setPageIndex(0)} disabled={safePageIndex <= 0}>»</button>
              <button type="button" onClick={() => setPageIndex((page) => Math.max(0, page - 1))} disabled={safePageIndex <= 0}>›</button>
              <span>صفحه {faNum(safePageIndex + 1)} از {faNum(pageCount)}</span>
              <button type="button" onClick={() => setPageIndex((page) => Math.min(pageCount - 1, page + 1))} disabled={safePageIndex >= pageCount - 1}>‹</button>
              <button type="button" onClick={() => setPageIndex(pageCount - 1)} disabled={safePageIndex >= pageCount - 1}>«</button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
};

export default TopCustomersReportPage;
