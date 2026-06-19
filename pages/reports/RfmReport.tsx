// pages/reports/RfmReport.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { RfmItem, NotificationMessage } from '../../types';
import { apiFetch } from '../../utils/apiFetch';
import { formatCurrencyText, readStoredCurrencyUnit } from '../../utils/currency';
import Notification from '../../components/Notification';

const PAGE_SIZE_OPTIONS = [10, 20, 50];
const faNum = (value: number | string) => Number(value).toLocaleString('fa-IR');
const money = (value: number) => formatCurrencyText(value, readStoredCurrencyUnit());
const customerPath = (customerId: number | string) => `/customers/${customerId}`;

type SegmentTone = 'vip' | 'active' | 'growth' | 'risk';

const segmentMeta = (code: string): { label: string; tone: SegmentTone; icon: string; hint: string } => {
  const r = Number(code?.[0] || 0);
  const f = Number(code?.[1] || 0);
  const m = Number(code?.[2] || 0);
  const score = r + f + m;
  if (score >= 8) return { label: 'VIP / طلایی', tone: 'vip', icon: 'fa-crown', hint: 'اولویت حفظ و پیشنهاد اختصاصی' };
  if (score >= 6) return { label: 'فعال / ارزشمند', tone: 'active', icon: 'fa-gem', hint: 'مناسب برای فروش مکمل و وفادارسازی' };
  if (score >= 4) return { label: 'در حال رشد', tone: 'growth', icon: 'fa-seedling', hint: 'قابل تبدیل به مشتری ارزشمند' };
  return { label: 'در معرض ریزش', tone: 'risk', icon: 'fa-triangle-exclamation', hint: 'نیازمند پیگیری و پیشنهاد بازگشت' };
};

const scoreTone = (value: number) => (value >= 3 ? 'strong' : value === 2 ? 'mid' : 'low');

const RfmReport: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [items, setItems] = useState<RfmItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [pageIndex, setPageIndex] = useState(0);
  const [activeSegment, setActiveSegment] = useState<string>('all');

  useEffect(() => {
    if (currentUser) {
      const allowed = ['Admin', 'Manager', 'Marketer'];
      if (!allowed.includes(currentUser.roleName)) {
        setNotification({ type: 'error', text: 'شما اجازه دسترسی به این صفحه را ندارید.' });
        navigate('/');
      }
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const res = await apiFetch('/api/reports/rfm');
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message || 'خطا در دریافت داده‌ها');
        setItems(json.data || []);
        setPageIndex(0);
      } catch (err: any) {
        setNotification({ type: 'error', text: err.message || 'خطا در دریافت گزارش RFM' });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    setPageIndex(0);
  }, [searchQuery, pageSize, activeSegment]);

  const segments = useMemo(() => {
    const map: Record<string, number> = {};
    items.forEach((it) => {
      const seg = it.rfm || '000';
      map[seg] = (map[seg] || 0) + 1;
    });
    return Object.entries(map)
      .map(([segment, count]) => ({ segment, count, ...segmentMeta(segment) }))
      .sort((a, b) => b.count - a.count);
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...items]
      .filter((item) => activeSegment === 'all' || item.rfm === activeSegment)
      .filter((item) => {
        if (!q) return true;
        const haystack = `${item.customerName || ''} ${item.customerId || ''} ${item.rfm || ''} ${item.monetary || ''}`.toLowerCase();
        return haystack.includes(q);
      })
      .sort((a, b) => (Number(b.monetary) || 0) - (Number(a.monetary) || 0));
  }, [items, searchQuery, activeSegment]);

  const moneySum = useMemo(() => items.reduce((acc, it) => acc + (Number(it.monetary) || 0), 0), [items]);
  const avgRecency = useMemo(() => (items.length ? Math.round(items.reduce((acc, it) => acc + (Number(it.recencyDays) || 0), 0) / items.length) : 0), [items]);
  const vipCount = useMemo(() => items.filter((item) => {
    const code = item.rfm || '000';
    const score = Number(code[0] || 0) + Number(code[1] || 0) + Number(code[2] || 0);
    return score >= 8;
  }).length, [items]);
  const riskCount = useMemo(() => items.filter((item) => segmentMeta(item.rfm || '000').tone === 'risk').length, [items]);

  const pageCount = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const safePageIndex = Math.min(pageIndex, pageCount - 1);
  const pageRows = useMemo(() => {
    const start = safePageIndex * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, safePageIndex, pageSize]);

  const kpis = [
    { label: 'مشتریان تحلیل‌شده', value: faNum(items.length), hint: 'تعداد مشتری دارای سابقه خرید', icon: 'fa-users', tone: 'neutral' },
    { label: 'ارزش کل خرید', value: money(moneySum), hint: 'مجموع مبلغ خرید مشتریان', icon: 'fa-wallet', tone: 'money' },
    { label: 'میانگین فاصله خرید', value: `${faNum(avgRecency)} روز`, hint: 'میانگین روز از آخرین خرید', icon: 'fa-clock-rotate-left', tone: 'warn' },
    { label: 'VIP / در ریسک', value: `${faNum(vipCount)} / ${faNum(riskCount)}`, hint: 'مشتریان طلایی و در معرض ریزش', icon: 'fa-layer-group', tone: 'risk' },
  ];

  return (
    <div className="report-page rfm-executive-page" dir="rtl">
      <Notification message={notification} onClose={() => setNotification(null)} />

      <section className="rfm-executive-panel" aria-label="گزارش RFM مشتریان">
        <div className="rfm-executive-kpis">
          {kpis.map((card) => (
            <article key={card.label} className={`rfm-executive-kpi rfm-executive-kpi--${card.tone}`}>
              <span className="rfm-executive-kpi__icon"><i className={`fa-solid ${card.icon}`} /></span>
              <div>
                <span>{card.label}</span>
                <strong>{card.value}</strong>
                <small>{card.hint}</small>
              </div>
            </article>
          ))}
        </div>

        <div className="rfm-executive-toolbar">
          <div className="rfm-search-final" dir="ltr" role="search">
            <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
            <input
              aria-label="جستجوی جدول RFM"
              dir="rtl"
              type="text"
              placeholder="جستجو بر اساس نام مشتری، کد RFM یا مبلغ…"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>

          <div className="rfm-page-size-final">
            <select aria-label="تعداد ردیف در صفحه" value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
              {PAGE_SIZE_OPTIONS.map((option) => <option key={option} value={option}>{faNum(option)}</option>)}
            </select>
            <span>تعداد در صفحه</span>
          </div>
        </div>

        <div className="rfm-segment-strip" aria-label="فیلتر سگمنت‌ها">
          <button type="button" className={activeSegment === 'all' ? 'is-active' : ''} onClick={() => setActiveSegment('all')}>
            <i className="fa-solid fa-list" />
            همه
            <b>{faNum(items.length)}</b>
          </button>
          {segments.slice(0, 6).map((segment) => (
            <button
              type="button"
              key={segment.segment}
              className={`rfm-segment-chip rfm-segment-chip--${segment.tone} ${activeSegment === segment.segment ? 'is-active' : ''}`}
              onClick={() => setActiveSegment(segment.segment)}
            >
              <i className={`fa-solid ${segment.icon}`} />
              {segment.segment}
              <b>{faNum(segment.count)}</b>
            </button>
          ))}
        </div>
      </section>

      <section className="rfm-insight-grid" aria-label="سگمنت‌های اصلی RFM">
        {segments.slice(0, 4).map((segment) => (
          <article key={segment.segment} className={`rfm-insight-card rfm-insight-card--${segment.tone}`}>
            <span><i className={`fa-solid ${segment.icon}`} /></span>
            <div>
              <b>{segment.segment}</b>
              <strong>{segment.label}</strong>
              <small>{segment.hint}</small>
            </div>
            <em>{faNum(segment.count)}</em>
          </article>
        ))}
      </section>

      <section className="rfm-table-card" aria-label="جزئیات مشتریان RFM">
        <div className="rfm-table-header">
          <div className="rfm-table-title">
            <span className="rfm-table-title__icon"><i className="fa-solid fa-chart-pie" /></span>
            <div>
              <h2>جزئیات مشتریان RFM</h2>
              <p>{faNum(filteredItems.length)} مشتری فیلترشده · ارزش خرید: {money(filteredItems.reduce((sum, row) => sum + (Number(row.monetary) || 0), 0))}</p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="rfm-empty-state">
            <i className="fa-solid fa-spinner fa-spin" />
            <p>در حال دریافت تحلیل RFM…</p>
          </div>
        ) : items.length === 0 ? (
          <div className="rfm-empty-state">
            <i className="fa-solid fa-chart-pie" />
            <p>داده‌ای برای تحلیل RFM وجود ندارد.</p>
          </div>
        ) : pageRows.length === 0 ? (
          <div className="rfm-empty-state">
            <i className="fa-solid fa-magnifying-glass" />
            <p>نتیجه‌ای با این جستجو یا سگمنت پیدا نشد.</p>
          </div>
        ) : (
          <>
            <div className="rfm-table-shell">
              <table className="rfm-table-final">
                <colgroup>
                  <col className="rfm-col-customer" />
                  <col className="rfm-col-recency" />
                  <col className="rfm-col-frequency" />
                  <col className="rfm-col-money" />
                  <col className="rfm-col-score" />
                  <col className="rfm-col-segment" />
                  <col className="rfm-col-action" />
                </colgroup>
                <thead>
                  <tr>
                    <th>مشتری</th>
                    <th>آخرین خرید</th>
                    <th>تعداد خرید</th>
                    <th>ارزش خرید</th>
                    <th>امتیاز</th>
                    <th>سگمنت</th>
                    <th>اقدام</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row) => {
                    const meta = segmentMeta(row.rfm || '000');
                    const initial = String(row.customerName || '؟').trim().charAt(0) || '؟';
                    return (
                      <tr key={row.customerId}>
                        <td>
                          <div className="rfm-customer-cell">
                            <span>{initial}</span>
                            <div>
                              <strong>{row.customerName || 'بدون نام'}</strong>
                              <small>کد مشتری: {faNum(row.customerId || 0)}</small>
                            </div>
                          </div>
                        </td>
                        <td className="rfm-number-cell">{faNum(Number(row.recencyDays) || 0)} روز</td>
                        <td className="rfm-number-cell">{faNum(Number(row.frequency) || 0)}</td>
                        <td className="rfm-money-cell">{money(Number(row.monetary) || 0)}</td>
                        <td>
                          <div className="rfm-score-cell">
                            <span className={`rfm-score rfm-score--${scoreTone(row.rScore)}`}>R {faNum(row.rScore)}</span>
                            <span className={`rfm-score rfm-score--${scoreTone(row.fScore)}`}>F {faNum(row.fScore)}</span>
                            <span className={`rfm-score rfm-score--${scoreTone(row.mScore)}`}>M {faNum(row.mScore)}</span>
                          </div>
                        </td>
                        <td>
                          <div className={`rfm-segment-cell rfm-segment-cell--${meta.tone}`}>
                            <b>{row.rfm}</b>
                            <span>{meta.label}</span>
                          </div>
                        </td>
                        <td>
                          <div className="rfm-row-actions">
                            <Link to={customerPath(row.customerId)} className="rfm-row-action">
                              <i className="fa-solid fa-user" />
                              <span>پرونده مشتری</span>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="rfm-pagination">
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

export default RfmReport;
