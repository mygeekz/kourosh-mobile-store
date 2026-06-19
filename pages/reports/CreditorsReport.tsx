// pages/reports/CreditorsReport.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Notification from '../../components/Notification';
import { useAuth } from '../../contexts/AuthContext';
import { getAuthHeaders } from '../../utils/apiUtils';
import { CreditorReportItem, NotificationMessage } from '../../types';
import { formatCurrencyText, readStoredCurrencyUnit } from '../../utils/currency';

const money = (value: number) => formatCurrencyText(value, readStoredCurrencyUnit());
const faNum = (value: number | string) => Number(value).toLocaleString('fa-IR');
const partnerLedgerPath = (partnerId: number | string) => `/partners/${partnerId}`;
const reportSourcePath = (url?: string | null) => String(url || '').trim() || '#';
const PAGE_SIZE_OPTIONS = [10, 20, 50];

function initials(name: string) {
  const s = (name || '').trim();
  if (!s) return '؟';
  const parts = s.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || s[0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

const CreditorsReportPage: React.FC = () => {
  const { token } = useAuth();
  const [creditors, setCreditors] = useState<CreditorReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [pageIndex, setPageIndex] = useState(0);

  const fetchCreditors = async () => {
    if (!token) return;
    setIsLoading(true);
    setNotification(null);
    try {
      const response = await fetch('/api/reports/creditors', { headers: getAuthHeaders(token) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'خطا در دریافت لیست بستانکاران');
      setCreditors(result.data || []);
      setPageIndex(0);
    } catch (error) {
      setNotification({ type: 'error', text: (error as Error).message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchCreditors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    setPageIndex(0);
  }, [searchQuery, pageSize]);

  const sortedCreditors = useMemo(() => {
    return [...creditors].sort((a, b) => (Number(b.balance) || 0) - (Number(a.balance) || 0));
  }, [creditors]);

  const filteredCreditors = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sortedCreditors;
    return sortedCreditors.filter((item) => {
      const haystack = `${item.partnerName || ''} ${item.partnerType || ''} ${item.balance || ''} ${item.id || ''} ${item.sourceLabel || ''} ${item.sourceKind || ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [sortedCreditors, searchQuery]);

  const totalCredit = useMemo(() => creditors.reduce((sum, row) => sum + (Number(row.balance) || 0), 0), [creditors]);
  const maxCredit = useMemo(() => Math.max(0, ...creditors.map(row => Number(row.balance) || 0)), [creditors]);
  const avgCredit = useMemo(() => (creditors.length ? Math.round(totalCredit / creditors.length) : 0), [creditors, totalCredit]);
  const priorityCount = useMemo(() => creditors.filter((row) => (Number(row.balance) || 0) >= avgCredit && avgCredit > 0).length, [creditors, avgCredit]);

  const pageCount = Math.max(1, Math.ceil(filteredCreditors.length / pageSize));
  const safePageIndex = Math.min(pageIndex, pageCount - 1);
  const pageRows = useMemo(() => {
    const start = safePageIndex * pageSize;
    return filteredCreditors.slice(start, start + pageSize);
  }, [filteredCreditors, safePageIndex, pageSize]);

  const kpis = [
    { label: 'تعداد بستانکاران', value: faNum(creditors.length), hint: 'همکار دارای مانده بستانکار', icon: 'fa-handshake', tone: 'neutral' },
    { label: 'جمع بدهی به همکاران', value: money(totalCredit), hint: 'کل مانده پرداخت‌نشده', icon: 'fa-wallet', tone: 'danger' },
    { label: 'میانگین بدهی', value: money(avgCredit), hint: 'میانگین مانده هر همکار', icon: 'fa-chart-simple', tone: 'warn' },
    { label: 'نیازمند اولویت', value: faNum(priorityCount), hint: 'مانده بالاتر از میانگین', icon: 'fa-triangle-exclamation', tone: 'risk' },
  ];

  const filteredTotal = filteredCreditors.reduce((sum, row) => sum + (Number(row.balance) || 0), 0);

  return (
    <div className="report-page creditors-executive-page" dir="rtl">
      <Notification message={notification} onClose={() => setNotification(null)} />

      <section className="creditors-executive-panel" aria-label="گزارش همکاران بستانکار">
        <div className="creditors-executive-kpis">
          {kpis.map((card) => (
            <article key={card.label} className={`creditors-executive-kpi creditors-executive-kpi--${card.tone}`}>
              <span className="creditors-executive-kpi__icon"><i className={`fa-solid ${card.icon}`} /></span>
              <div>
                <span>{card.label}</span>
                <strong>{card.value}</strong>
                <small>{card.hint}</small>
              </div>
            </article>
          ))}
        </div>

        <div className="creditors-executive-toolbar">
          <div className="creditors-search-final" dir="ltr" role="search">
            <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
            <input
              aria-label="جستجوی جدول بستانکاران"
              dir="rtl"
              type="text"
              placeholder="جستجو بر اساس نام، نوع همکار یا مبلغ…"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>

          <div className="creditors-page-size-final">
            <select aria-label="تعداد ردیف در صفحه" value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
              {PAGE_SIZE_OPTIONS.map((option) => <option key={option} value={option}>{faNum(option)}</option>)}
            </select>
            <span>تعداد در صفحه</span>
          </div>
        </div>
      </section>

      <section className="creditors-table-card" aria-label="لیست همکاران بستانکار">
        <div className="creditors-table-header">
          <div className="creditors-table-title">
            <span className="creditors-table-title__icon"><i className="fa-solid fa-hand-holding-dollar" /></span>
            <div>
              <h2>لیست همکاران بستانکار</h2>
              <p>{faNum(filteredCreditors.length)} همکار فیلترشده · جمع بدهی: {money(filteredTotal)}</p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="creditors-empty-state">
            <i className="fa-solid fa-spinner fa-spin" />
            <p>در حال دریافت اطلاعات لیست بستانکاران…</p>
          </div>
        ) : creditors.length === 0 ? (
          <div className="creditors-empty-state">
            <i className="fa-solid fa-circle-check" />
            <p>در حال حاضر هیچ همکار بستانکاری وجود ندارد.</p>
          </div>
        ) : pageRows.length === 0 ? (
          <div className="creditors-empty-state">
            <i className="fa-solid fa-magnifying-glass" />
            <p>نتیجه‌ای با این جستجو پیدا نشد.</p>
          </div>
        ) : (
          <>
            <div className="creditors-table-shell">
              <table className="creditors-table-final">
                <colgroup>
                  <col className="creditors-col-partner" />
                  <col className="creditors-col-type" />
                  <col className="creditors-col-credit" />
                  <col className="creditors-col-action" />
                </colgroup>
                <thead>
                  <tr>
                    <th>همکار</th>
                    <th>نوع</th>
                    <th>مبلغ بستانکاری</th>
                    <th>اقدام</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row) => {
                    const credit = Number(row.balance) || 0;
                    const pct = maxCredit ? Math.min(100, Math.round((credit / maxCredit) * 100)) : 0;
                    return (
                      <tr key={row.id}>
                        <td>
                          <div className="creditors-partner-cell">
                            <span>{initials(row.partnerName || '؟')}</span>
                            <div>
                              <strong>{row.partnerName || 'بدون نام'}</strong>
                              <small>کد همکار: {row.id}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="creditors-type-pill">{row.partnerType || 'همکار'}</span>
                        </td>
                        <td>
                          <div className="creditors-credit-cell">
                            <strong>{money(credit)}</strong>
                            <small>بدهی ما به همکار</small>
                            <div><span style={{ width: `${pct}%` }} /></div>
                          </div>
                        </td>
                        <td>
                          <div className="creditors-row-actions">
                            <Link to={partnerLedgerPath(row.id)} className="creditors-row-action creditors-row-action--primary">
                              <i className="fa-solid fa-user-tie" />
                              <span>حساب همکار</span>
                            </Link>
                            {row.sourceUrl ? (
                              <Link to={reportSourcePath(row.sourceUrl)} className="creditors-row-action" title={row.sourceLabel || 'مشاهده سند ریشه'}>
                                <i className={row.sourceIcon || 'fa-solid fa-arrow-up-right-from-square'} />
                                <span>سند ریشه</span>
                              </Link>
                            ) : row.sourceLabel ? (
                              <span className="creditors-row-action creditors-row-action--muted" title={row.sourceLabel}>
                                <i className={row.sourceIcon || 'fa-solid fa-circle-info'} />
                                <span>سند نامشخص</span>
                              </span>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="creditors-pagination">
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

export default CreditorsReportPage;
