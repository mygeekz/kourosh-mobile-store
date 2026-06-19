// pages/reports/TopSuppliersReportPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import moment from 'jalali-moment';

import { TopSupplierReportItem, NotificationMessage } from '../../types';
import Notification from '../../components/Notification';
import ShamsiDatePicker from '../../components/ShamsiDatePicker';
import ReportDatePresetChips from '../../components/reports/ReportDatePresetChips';
import { Search, Truck, Trophy, TrendingUp, Users, RefreshCw, Wallet, ArrowLeft } from '../../components/icons';
import { useAuth } from '../../contexts/AuthContext';
import { getAuthHeaders } from '../../utils/apiUtils';
import { useReportsExports } from '../../contexts/ReportsExportsContext';
import { formatCurrencyText, readStoredCurrencyUnit } from '../../utils/currency';

const formatPrice = (n: number) => formatCurrencyText(n ?? 0, readStoredCurrencyUnit());
const formatNum = (n: number) => (n ?? 0).toLocaleString('fa-IR');

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

const TopSuppliersReportPage: React.FC = () => {
  const { token } = useAuth();
  const { registerReportExports } = useReportsExports();

  const [topSuppliers, setTopSuppliers] = useState<TopSupplierReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);

  const [startDate, setStartDate] = useState<Date | null>(moment().startOf('jMonth').toDate());
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [pageIndex, setPageIndex] = useState(0);

  const fetchTopSuppliers = async () => {
    if (!startDate || !endDate || !token) {
      setNotification({ type: 'error', text: 'لطفاً تاریخ شروع و پایان را انتخاب کنید.' });
      return;
    }
    setIsLoading(true);
    setNotification(null);

    const fromDate = moment(startDate).locale('en').format('jYYYY/jMM/jDD');
    const toDate = moment(endDate).locale('en').format('jYYYY/jMM/jDD');

    try {
      const res = await fetch(`/api/reports/top-suppliers?fromDate=${fromDate}&toDate=${toDate}`, {
        headers: getAuthHeaders(token),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'خطا در دریافت گزارش تأمین‌کنندگان برتر');
      setTopSuppliers(Array.isArray(json.data) ? json.data : []);
      setPageIndex(0);
    } catch (e: any) {
      setNotification({ type: 'error', text: e.message || 'خطا در دریافت گزارش تأمین‌کنندگان برتر' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!token || !startDate || !endDate) return;
    const t = window.setTimeout(() => {
      void fetchTopSuppliers();
    }, 250);
    return () => window.clearTimeout(t);
  }, [token, startDate, endDate]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return topSuppliers;
    return topSuppliers.filter((row) => {
      const haystack = [row.partnerName, String(row.partnerId), String(row.totalPurchaseValue), String(row.transactionCount)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [topSuppliers, searchQuery]);

  useEffect(() => {
    setPageIndex(0);
  }, [searchQuery, pageSize]);

  const insights = useMemo(() => {
    const rows = topSuppliers ?? [];
    const totalPurchaseValue = rows.reduce((s, r) => s + (r.totalPurchaseValue ?? 0), 0);
    const totalTransactions = rows.reduce((s, r) => s + (r.transactionCount ?? 0), 0);
    const avgPurchase = totalTransactions > 0 ? Math.round(totalPurchaseValue / totalTransactions) : 0;
    const topSupplier = rows[0];
    const topShare = totalPurchaseValue > 0 && topSupplier
      ? Math.round(((topSupplier.totalPurchaseValue ?? 0) / totalPurchaseValue) * 100)
      : 0;
    return {
      count: rows.length,
      totalPurchaseValue,
      totalTransactions,
      avgPurchase,
      topSupplierName: topSupplier?.partnerName ?? '—',
      topSupplierValue: topSupplier?.totalPurchaseValue ?? 0,
      topShare,
    };
  }, [topSuppliers]);

  const topCards = useMemo(() => filteredRows.slice(0, 4), [filteredRows]);
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
        disabled: topSuppliers.length === 0,
        onClick: () => {
          const rows = (topSuppliers ?? []).map((r, i) => ({
            رتبه: i + 1,
            'نام تأمین‌کننده': r.partnerName ?? '',
            'مجموع خرید': r.totalPurchaseValue ?? 0,
            'تعداد تراکنش': r.transactionCount ?? 0,
            'شناسه تأمین‌کننده': r.partnerId ?? '',
          }));
          downloadTextFile(`TopSuppliers_${fromLabel}_to_${toLabel}.csv`, toCSV(rows));
        },
      },
    ];
  }, [topSuppliers, startDate, endDate]);

  useEffect(() => {
    registerReportExports({ excel: () => exportItems[0]?.onClick?.() });
    return () => registerReportExports({});
  }, [registerReportExports, exportItems]);

  return (
    <div className="top-suppliers-page" dir="rtl">
      <Notification message={notification} onClose={() => setNotification(null)} />

      <section className="top-suppliers-panel" aria-label="گزارش تأمین‌کنندگان برتر">
        <div className="top-suppliers-kpi-grid">
          <article className="top-suppliers-kpi-card">
            <span className="top-suppliers-kpi-card__icon"><Users size={18} /></span>
            <div>
              <small>تعداد تأمین‌کننده</small>
              <strong>{formatNum(insights.count)}</strong>
              <p>تأمین‌کنندگان دارای خرید در بازه</p>
            </div>
          </article>
          <article className="top-suppliers-kpi-card is-primary">
            <span className="top-suppliers-kpi-card__icon"><Wallet size={18} /></span>
            <div>
              <small>جمع خرید</small>
              <strong>{formatPrice(insights.totalPurchaseValue)}</strong>
              <p>کل خرید از تأمین‌کنندگان گزارش</p>
            </div>
          </article>
          <article className="top-suppliers-kpi-card">
            <span className="top-suppliers-kpi-card__icon"><TrendingUp size={18} /></span>
            <div>
              <small>تعداد تراکنش</small>
              <strong>{formatNum(insights.totalTransactions)}</strong>
              <p>تعداد خریدهای ثبت‌شده</p>
            </div>
          </article>
          <article className="top-suppliers-kpi-card">
            <span className="top-suppliers-kpi-card__icon"><Trophy size={18} /></span>
            <div>
              <small>تأمین‌کننده اول</small>
              <strong>{insights.topSupplierName}</strong>
              <p>{formatNum(insights.topShare)}٪ سهم از خرید کل</p>
            </div>
          </article>
        </div>

        <div className="top-suppliers-filter-panel">
          <div className="top-suppliers-filter-presets">
            <ReportDatePresetChips
              fromDate={startDate}
              toDate={endDate}
              onChange={({ from, to }) => {
                setStartDate(from);
                setEndDate(to);
              }}
              compact
            />
          </div>

          <div className="top-suppliers-filter-fields">
            <label className="top-suppliers-date-box">
              <span>از تاریخ</span>
              <ShamsiDatePicker
                selectedDate={startDate}
                onDateChange={setStartDate}
                inputClassName="top-suppliers-date-input"
              />
            </label>
            <label className="top-suppliers-date-box">
              <span>تا تاریخ</span>
              <ShamsiDatePicker
                selectedDate={endDate}
                onDateChange={(d) => setEndDate(d && startDate && d < startDate ? startDate : d)}
                inputClassName="top-suppliers-date-input"
              />
            </label>
            <button type="button" className="top-suppliers-refresh-button" onClick={fetchTopSuppliers} disabled={isLoading || !token}>
              <RefreshCw size={16} />
              <span>{isLoading ? 'در حال بروزرسانی' : 'بروزرسانی'}</span>
            </button>
          </div>
        </div>

        {topCards.length > 0 ? (
          <div className="top-suppliers-bento-grid" aria-label="کارت‌های تأمین‌کنندگان برتر">
            {topCards.map((supplier, index) => {
              const share = insights.totalPurchaseValue > 0
                ? Math.round(((supplier.totalPurchaseValue ?? 0) / insights.totalPurchaseValue) * 100)
                : 0;
              return (
                <article className="top-suppliers-bento-card" key={supplier.partnerId}>
                  <div className="top-suppliers-bento-card__head">
                    <span className="top-suppliers-rank">#{formatNum(index + 1)}</span>
                    <Truck size={18} />
                  </div>
                  <strong>{supplier.partnerName}</strong>
                  <p>{formatPrice(supplier.totalPurchaseValue)}</p>
                  <div className="top-suppliers-bento-card__meta">
                    <span>{formatNum(supplier.transactionCount)} تراکنش</span>
                    <span>{formatNum(share)}٪ سهم</span>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}

        <section className="top-suppliers-table-section" aria-label="لیست تأمین‌کنندگان برتر">
          <div className="top-suppliers-table-header">
            <div className="top-suppliers-table-title">
              <span><Truck size={18} /></span>
              <div>
                <h2>لیست تأمین‌کنندگان برتر</h2>
                <p>{formatNum(filteredRows.length)} ردیف فیلترشده · جمع خرید: {formatPrice(insights.totalPurchaseValue)}</p>
              </div>
            </div>
            <div className="top-suppliers-table-tools">
              <div className="top-suppliers-search" role="search" dir="ltr">
                <Search size={15} aria-hidden="true" />
                <input
                  dir="rtl"
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="جستجو بر اساس نام تأمین‌کننده یا مبلغ…"
                  aria-label="جستجو در جدول تأمین‌کنندگان برتر"
                />
              </div>
              <label className="top-suppliers-page-size">
                <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))} aria-label="تعداد ردیف در صفحه">
                  <option value={10}>۱۰</option>
                  <option value={20}>۲۰</option>
                  <option value={50}>۵۰</option>
                </select>
                <span>تعداد در صفحه</span>
              </label>
            </div>
          </div>

          {isLoading && topSuppliers.length === 0 ? (
            <div className="top-suppliers-empty-state">در حال دریافت اطلاعات گزارش…</div>
          ) : topSuppliers.length === 0 ? (
            <div className="top-suppliers-empty-state">داده‌ای برای این بازه یافت نشد.</div>
          ) : (
            <div className="top-suppliers-table-shell">
              <table className="top-suppliers-table">
                <colgroup>
                  <col className="top-suppliers-col-rank" />
                  <col className="top-suppliers-col-name" />
                  <col className="top-suppliers-col-money" />
                  <col className="top-suppliers-col-count" />
                  <col className="top-suppliers-col-action" />
                </colgroup>
                <thead>
                  <tr>
                    <th>رتبه</th>
                    <th>تأمین‌کننده</th>
                    <th>مجموع خرید</th>
                    <th>تراکنش</th>
                    <th>اقدام</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row, index) => (
                    <tr key={row.partnerId}>
                      <td><span className="top-suppliers-table-rank">{formatNum(safePageIndex * pageSize + index + 1)}</span></td>
                      <td>
                        <div className="top-suppliers-supplier-cell">
                          <span>{(row.partnerName || '—').slice(0, 1)}</span>
                          <div>
                            <strong>{row.partnerName || '—'}</strong>
                            <small>کد تأمین‌کننده: {formatNum(row.partnerId)}</small>
                          </div>
                        </div>
                      </td>
                      <td><strong className="top-suppliers-money">{formatPrice(row.totalPurchaseValue)}</strong></td>
                      <td>{formatNum(row.transactionCount)}</td>
                      <td>
                        <Link to={`/partners/${row.partnerId}`} className="top-suppliers-action-button">
                          <span>حساب تأمین‌کننده</span>
                          <ArrowLeft size={14} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {filteredRows.length > pageSize ? (
            <div className="top-suppliers-pagination">
              <button type="button" onClick={() => setPageIndex((p) => Math.max(0, p - 1))} disabled={safePageIndex <= 0}>قبلی</button>
              <span>صفحه {formatNum(safePageIndex + 1)} از {formatNum(pageCount)}</span>
              <button type="button" onClick={() => setPageIndex((p) => Math.min(pageCount - 1, p + 1))} disabled={safePageIndex >= pageCount - 1}>بعدی</button>
            </div>
          ) : null}
        </section>
      </section>
    </div>
  );
};

export default TopSuppliersReportPage;
