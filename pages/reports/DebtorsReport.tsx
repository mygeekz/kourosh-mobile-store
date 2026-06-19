// pages/reports/DebtorsReport.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { DebtorReportItem, NotificationMessage } from '../../types';
import Notification from '../../components/Notification';
import { useAuth } from '../../contexts/AuthContext';
import { getAuthHeaders } from '../../utils/apiUtils';
import { formatCurrencyText, readStoredCurrencyUnit } from '../../utils/currency';

const money = (n: number) => formatCurrencyText(n, readStoredCurrencyUnit());
const faNum = (value: number | string) => Number(value).toLocaleString('fa-IR');
const customerLedgerPath = (customerId: number | string) => `/customers/${customerId}#customer-ledger-section`;
const reportSourcePath = (url?: string | null) => String(url || '').trim() || '#';
const collectionCenterPath = (name?: string | null) => `/reports/collection-center${name ? `?q=${encodeURIComponent(name)}` : ''}`;

const PAGE_SIZE_OPTIONS = [10, 20, 50];

const DebtorsReportPage: React.FC = () => {
  const { token } = useAuth();
  const [debtors, setDebtors] = useState<DebtorReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [pageIndex, setPageIndex] = useState(0);

  const fetchDebtors = async () => {
    if (!token) return;
    setIsLoading(true);
    setNotification(null);
    try {
      const response = await fetch('/api/reports/debtors', { headers: getAuthHeaders(token) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'خطا در دریافت لیست بدهکاران');
      setDebtors(result.data || []);
      setPageIndex(0);
    } catch (error) {
      setNotification({ type: 'error', text: (error as Error).message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchDebtors();
  }, [token]);

  useEffect(() => {
    setPageIndex(0);
  }, [searchQuery, pageSize]);

  const sortedDebtors = useMemo(() => {
    return [...debtors].sort((a, b) => (Number(b.balance) || 0) - (Number(a.balance) || 0));
  }, [debtors]);

  const filteredDebtors = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sortedDebtors;
    return sortedDebtors.filter((item) => {
      const haystack = `${item.fullName || ''} ${item.phoneNumber || ''} ${item.balance || ''} ${item.sourceLabel || ''} ${item.sourceKind || ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [sortedDebtors, searchQuery]);

  const totalDebt = useMemo(() => debtors.reduce((acc, d) => acc + (Number(d.balance) || 0), 0), [debtors]);
  const maxDebt = useMemo(() => Math.max(0, ...debtors.map(d => Number(d.balance) || 0)), [debtors]);
  const avgDebt = useMemo(() => (debtors.length ? Math.round(totalDebt / debtors.length) : 0), [debtors, totalDebt]);
  const highRiskCount = useMemo(() => debtors.filter((d) => (Number(d.balance) || 0) >= avgDebt && avgDebt > 0).length, [debtors, avgDebt]);

  const pageCount = Math.max(1, Math.ceil(filteredDebtors.length / pageSize));
  const safePageIndex = Math.min(pageIndex, pageCount - 1);
  const pageRows = useMemo(() => {
    const start = safePageIndex * pageSize;
    return filteredDebtors.slice(start, start + pageSize);
  }, [filteredDebtors, safePageIndex, pageSize]);

  const kpis = [
    { label: 'تعداد بدهکاران', value: faNum(debtors.length), hint: 'مشتری دارای مانده بدهکار', icon: 'fa-users', tone: 'neutral' },
    { label: 'جمع بدهی', value: money(totalDebt), hint: 'کل مطالبات ثبت‌شده', icon: 'fa-wallet', tone: 'danger' },
    { label: 'میانگین بدهی', value: money(avgDebt), hint: 'میانگین مانده هر مشتری', icon: 'fa-chart-simple', tone: 'warn' },
    { label: 'نیازمند اولویت', value: faNum(highRiskCount), hint: 'بدهی بالاتر از میانگین', icon: 'fa-triangle-exclamation', tone: 'risk' },
  ];

  return (
    <div className="report-page debtors-executive-page" dir="rtl">
      <Notification message={notification} onClose={() => setNotification(null)} />

      <section className="debtors-executive-panel" aria-label="گزارش مشتریان بدهکار">
        <div className="debtors-executive-kpis">
          {kpis.map((card) => (
            <article key={card.label} className={`debtors-executive-kpi debtors-executive-kpi--${card.tone}`}>
              <span className="debtors-executive-kpi__icon"><i className={`fa-solid ${card.icon}`} /></span>
              <div>
                <span>{card.label}</span>
                <strong>{card.value}</strong>
                <small>{card.hint}</small>
              </div>
            </article>
          ))}
        </div>

        <div className="debtors-executive-toolbar">
          <div className="debtors-search-final" dir="ltr" role="search">
            <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
            <input
              aria-label="جستجوی جدول بدهکاران"
              dir="rtl"
              type="text"
              placeholder="جستجو بر اساس نام، موبایل یا مبلغ…"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>

          <div className="debtors-page-size-final">
            <select aria-label="تعداد ردیف در صفحه" value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
              {PAGE_SIZE_OPTIONS.map((option) => <option key={option} value={option}>{faNum(option)}</option>)}
            </select>
            <span>تعداد در صفحه</span>
          </div>


          <Link to="/reports/collection-center" className="debtors-toolbar-link">
            <i className="fa-solid fa-headset" />
            مرکز وصول
          </Link>
        </div>
      </section>

      <section className="debtors-table-card" aria-label="لیست مشتریان بدهکار">
        <div className="debtors-table-header">
          <div className="debtors-table-title">
            <span className="debtors-table-title__icon"><i className="fa-solid fa-user-clock" /></span>
            <div>
              <h2>لیست مشتریان بدهکار</h2>
              <p>{faNum(filteredDebtors.length)} مشتری فیلترشده · جمع بدهی: {money(filteredDebtors.reduce((sum, row) => sum + (Number(row.balance) || 0), 0))}</p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="debtors-empty-state">
            <i className="fa-solid fa-spinner fa-spin" />
            <p>در حال دریافت اطلاعات لیست بدهکاران…</p>
          </div>
        ) : debtors.length === 0 ? (
          <div className="debtors-empty-state">
            <i className="fa-solid fa-circle-check" />
            <p>در حال حاضر هیچ مشتری بدهکاری وجود ندارد.</p>
          </div>
        ) : pageRows.length === 0 ? (
          <div className="debtors-empty-state">
            <i className="fa-solid fa-magnifying-glass" />
            <p>نتیجه‌ای با این جستجو پیدا نشد.</p>
          </div>
        ) : (
          <>
            <div className="debtors-table-shell">
              <table className="debtors-table-final">
                <colgroup>
                  <col className="debtors-col-customer" />
                  <col className="debtors-col-phone" />
                  <col className="debtors-col-debt" />
                  <col className="debtors-col-action" />
                </colgroup>
                <thead>
                  <tr>
                    <th>مشتری</th>
                    <th>موبایل</th>
                    <th>مبلغ بدهی</th>
                    <th>اقدام</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row) => {
                    const debt = Number(row.balance) || 0;
                    const pct = maxDebt ? Math.min(100, Math.round((debt / maxDebt) * 100)) : 0;
                    const initial = String(row.fullName || '؟').trim().charAt(0) || '؟';
                    return (
                      <tr key={row.id}>
                        <td>
                          <div className="debtors-customer-cell">
                            <span>{initial}</span>
                            <div>
                              <strong>{row.fullName || 'بدون نام'}</strong>
                              <small>حساب مشتری</small>
                            </div>
                          </div>
                        </td>
                        <td className="debtors-phone-cell">{row.phoneNumber || '—'}</td>
                        <td>
                          <div className="debtors-debt-cell">
                            <strong>{money(debt)}</strong>
                            <div><span style={{ width: `${pct}%` }} /></div>
                          </div>
                        </td>
                        <td>
                          <div className="debtors-row-actions">
                            <Link to={customerLedgerPath(row.id)} className="debtors-row-action debtors-row-action--primary">
                              <i className="fa-solid fa-user" />
                              پرونده مشتری
                            </Link>
                            {row.sourceUrl ? (
                              <Link to={reportSourcePath(row.sourceUrl)} className="debtors-row-action" title={row.sourceLabel || 'مشاهده سند ریشه'}>
                                <i className={row.sourceIcon || 'fa-solid fa-arrow-up-right-from-square'} />
                                سند ریشه
                              </Link>
                            ) : row.sourceLabel ? (
                              <span className="debtors-row-action debtors-row-action--muted" title={row.sourceLabel}>
                                <i className={row.sourceIcon || 'fa-solid fa-circle-info'} />
                                سند نامشخص
                              </span>
                            ) : null}
                            <Link to={collectionCenterPath(row.fullName)} className="debtors-row-action">
                              <i className="fa-solid fa-headset" />
                              پیگیری وصول
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="debtors-pagination">
              <span>صفحه {faNum(safePageIndex + 1)} از {faNum(pageCount)}</span>
              <div>
                <button type="button" onClick={() => setPageIndex(0)} disabled={safePageIndex === 0}>»</button>
                <button type="button" onClick={() => setPageIndex((p) => Math.max(0, p - 1))} disabled={safePageIndex === 0}>›</button>
                <button type="button" onClick={() => setPageIndex((p) => Math.min(pageCount - 1, p + 1))} disabled={safePageIndex >= pageCount - 1}>‹</button>
                <button type="button" onClick={() => setPageIndex(pageCount - 1)} disabled={safePageIndex >= pageCount - 1}>«</button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
};

export default DebtorsReportPage;
