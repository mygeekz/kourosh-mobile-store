import React, {useEffect, useMemo, useRef, useState} from 'react';
import moment from 'jalali-moment';
import { ResponsiveContainer, PieChart, Pie, Tooltip, Cell } from 'recharts';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import ShamsiDatePicker from '../../components/ShamsiDatePicker';
import ReportDatePresetChips from '../../components/reports/ReportDatePresetChips';
import ReportFilterField from '../../components/reports/ReportFilterField';
import Notification from '../../components/Notification';
import { useAuth } from '../../contexts/AuthContext';
import type { NotificationMessage } from '../../types';


import { useReportsExports } from '../../contexts/ReportsExportsContext';
import KpiDefinitionNote from '../../components/reports/KpiDefinitionNote';

type Row = {
  productId: number;
  name: string;
  qty: number;
  revenue: number;
  cogs: number;
  profit: number;
  avgBuyPrice: number;
  avgSellPrice: number;
  shareOfRevenue: number;
  marginPct: number;
};

type Payload = { from: string; to: string; totalRevenue: number; items: Row[] };

const fmtMoney = (n: any) => Number(n || 0).toLocaleString('fa-IR');
const fmtNum = (n: any) => Number(n || 0).toLocaleString('fa-IR');
const startOfCurrentJalaliMonth = () => moment().startOf('jMonth').startOf('day').toDate();
const chartPalette = ['#0f766e', '#2563eb', '#7c3aed', '#d97706', '#dc2626', '#64748b'];
const shortName = (value: string, max = 18) => {
  const raw = String(value || '').trim();
  return raw.length > max ? raw.slice(0, max - 1) + '…' : raw;
};

export default function ProductProfitReal() {
  const { token } = useAuth();
  const { registerReportExports } = useReportsExports();
  const exportExcelRef = useRef<() => void>(() => {});
  const [fromDate, setFromDate] = useState<Date | null>(() => startOfCurrentJalaliMonth());
  const [toDate, setToDate] = useState<Date | null>(new Date());
  const [q, setQ] = useState('');
  const [payload, setPayload] = useState<Payload | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);

  const fetchData = async () => {
    if (!token) return;
    setIsLoading(true);
    setNotification(null);
    try {
      const qs = new URLSearchParams();
      if (fromDate) qs.set('from', moment(fromDate).startOf('day').toDate().toISOString());
      if (toDate) qs.set('to', moment(toDate).endOf('day').toDate().toISOString());
      const res = await fetch(`/api/reports/product-profit-real?${qs.toString()}`, { headers: { Authorization: `Bearer ${token}` } });
      const js = await res.json();
      if (!res.ok || js?.success === false) throw new Error(js?.message || 'خطا در دریافت گزارش سود واقعی محصولات');
      setPayload(js.data || null);
    } catch (e: any) {
      setNotification({ message: e?.message || 'خطا در عملیات', type: 'error' });
    } finally { setIsLoading(false); }
  };

  useEffect(() => {
    if (!token) return;
    const t = window.setTimeout(() => { void fetchData(); }, 250);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, fromDate, toDate]);

  const rows = useMemo(() => payload?.items || [], [payload]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const r = !s ? rows : rows.filter(x => String(x.name||'').toLowerCase().includes(s));
    return r.sort((a,b) => Number(b.profit||0) - Number(a.profit||0));
  }, [rows, q]);

  const topShare = useMemo(() => {
    const r = [...rows].sort((a,b)=>Number(b.revenue||0)-Number(a.revenue||0)).slice(0, 6);
    return r.map(x => ({ name: x.name, value: Number(x.revenue || 0) }));
  }, [rows]);

  const topProfit = useMemo(() => {
    const r = [...rows].sort((a,b)=>Number(b.profit||0)-Number(a.profit||0)).slice(0, 8);
    return r.map(x => ({ name: x.name, profit: Number(x.profit||0) }));
  }, [rows]);

  const summary = useMemo(() => {
    const totalRevenue = Number(payload?.totalRevenue || 0);
    const totalCogs = rows.reduce((s,x)=>s+Number(x.cogs||0), 0);
    const totalProfit = rows.reduce((s,x)=>s+Number(x.profit||0), 0);
    const marginPct = totalRevenue > 0 ? (totalProfit/totalRevenue)*100 : 0;
    const totalQty = rows.reduce((s,x)=>s+Number(x.qty||0), 0);
    return { totalRevenue, totalCogs, totalProfit, marginPct, totalQty };
  }, [payload, rows]);

  const topShareLegend = useMemo(() => {
    return topShare.map((item) => ({
      ...item,
      percent: summary.totalRevenue > 0 ? (Number(item.value || 0) / summary.totalRevenue) * 100 : 0,
    }));
  }, [topShare, summary.totalRevenue]);

  const revenueConcentration = useMemo(() => {
    return Math.min(100, topShareLegend.reduce((sum, item) => sum + Number(item.percent || 0), 0));
  }, [topShareLegend]);

  const topRevenueShare = topShareLegend[0]?.percent || 0;

  const maxProfitValue = useMemo(() => {
    return Math.max(1, ...topProfit.map((item) => Math.abs(Number(item.profit || 0))));
  }, [topProfit]);

  const riskSummary = useMemo(() => {
    const negativeItems = rows.filter((x) => Number(x.profit || 0) < 0).length;
    const bestItem = [...rows].sort((a, b) => Number(b.profit || 0) - Number(a.profit || 0))[0];
    const worstItem = [...rows].sort((a, b) => Number(a.profit || 0) - Number(b.profit || 0))[0];
    return { negativeItems, bestItem, worstItem };
  }, [rows]);


  const exportExcel = async () => {
    if (!token) return;
    const qs = new URLSearchParams();
    if (fromDate) qs.set('from', moment(fromDate).startOf('day').toDate().toISOString());
    if (toDate) qs.set('to', moment(toDate).endOf('day').toDate().toISOString());
    const url = `/api/exports/product-profit-real.xlsx?${qs.toString()}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error('خطا در دریافت فایل اکسل');
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `product_profit_real_${moment().format('YYYY-MM-DD')}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  // اتصال دکمه Excel بالای ReportsLayout به خروجی دقیق همین صفحه
  exportExcelRef.current = exportExcel;
  useEffect(() => {
    registerReportExports({ excel: () => exportExcelRef.current() });
    return () => registerReportExports({});
  }, [registerReportExports]);


  const exportPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const title = 'سود واقعی هر محصول (FIFO)';
    doc.setFontSize(12);
    // @ts-ignore
    doc.text(title, 10, 10);

    const body = filtered.map(r => ([
      r.name,
      String(r.avgBuyPrice || 0),
      String(r.avgSellPrice || 0),
      String(r.qty || 0),
      String(r.revenue || 0),
      String(r.profit || 0),
      String(r.shareOfRevenue || 0),
      String(r.marginPct || 0),
    ]));

    // @ts-ignore
    doc.autoTable({
      head: [['محصول','قیمت خرید','قیمت فروش','تعداد','درآمد','سود','سهم%','حاشیه%']],
      body,
      startY: 16,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 144, 255] }
    });

    doc.save(`product_profit_real_${moment().format('YYYY-MM-DD')}.pdf`);
  };

  return (
    <div className="space-y-4" dir="rtl">
      <section className="product-profit-real-hero">
        <div className="product-profit-real-hero__head">
          <span className="product-profit-real-hero__icon" aria-hidden="true">
            <i className="fa-solid fa-chart-line" />
          </span>
          <div className="min-w-0">
            <div className="product-profit-real-hero__kicker">PRODUCT PROFITABILITY</div>
            <h2 className="product-profit-real-hero__title">سود واقعی هر محصول</h2>
            <p className="product-profit-real-hero__text">تحلیل درآمد، COGS FIFO، سود، سهم از درآمد و حاشیه سود هر کالا در بازه انتخابی.</p>
          </div>
        </div>

        <div className="product-profit-real-control-dock" aria-label="فیلترهای گزارش سود واقعی هر محصول">
          <ReportDatePresetChips
            fromDate={fromDate}
            toDate={toDate}
            onChange={({ from, to }) => { setFromDate(from); setToDate(to); }}
            className="product-profit-real-date-presets"
          />

          <ReportFilterField label="از تاریخ" icon={<i className="fa-regular fa-calendar" />} minWidthClassName="product-profit-real-filter-field product-profit-real-filter-field--date">
            <ShamsiDatePicker selectedDate={fromDate} onDateChange={setFromDate} />
          </ReportFilterField>

          <ReportFilterField label="تا تاریخ" icon={<i className="fa-regular fa-calendar-check" />} minWidthClassName="product-profit-real-filter-field product-profit-real-filter-field--date">
            <ShamsiDatePicker selectedDate={toDate} onDateChange={setToDate} />
          </ReportFilterField>

          <div className="product-profit-real-search" dir="ltr">
            <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
            <input
              value={q}
              onChange={(e)=>setQ(e.target.value)}
              placeholder="جستجوی محصول…"
              aria-label="جستجوی محصول"
            />
          </div>

          <button type="button" onClick={fetchData} className="product-profit-real-refresh-button" disabled={isLoading}>
            <i className={`fa-solid fa-rotate ${isLoading ? 'fa-spin' : ''}`} />
            بروزرسانی
          </button>
        </div>
      </section>

      {notification ? <Notification message={notification.message} type={notification.type} /> : null}

      <KpiDefinitionNote
        title="مرزبندی سود محصول"
        description="این گزارش برای سود عملیاتی هر محصول است؛ نرخ وصول و سود تحقق‌یافته در گزارش مالی/تحقق‌یافته بررسی می‌شود."
        items={[
          { label: 'درآمد محصول', role: 'operational', description: 'جمع فروش محصول در بازه.' },
          { label: 'COGS FIFO', role: 'operational', description: 'بهای خروج انبار بر اساس FIFO.' },
          { label: 'سود محصول', role: 'operational', description: 'سود عملیاتی محصول، نه الزاماً سود وصول‌شده.' },
          { label: 'سهم از درآمد', role: 'audit', description: 'برای تحلیل ترکیب فروش است و نباید با حاشیه سود یکی گرفته شود.' },
        ]}
      />

      <section className="product-profit-real-kpi-grid">
        <article className="product-profit-real-kpi product-profit-real-kpi--revenue">
          <span className="product-profit-real-kpi__icon"><i className="fa-solid fa-sack-dollar" /></span>
          <div><div className="product-profit-real-kpi__label">درآمد کل</div><div className="product-profit-real-kpi__value">{fmtMoney(summary.totalRevenue)}</div><p>جمع فروش محصولات در بازه انتخابی</p></div>
        </article>
        <article className="product-profit-real-kpi product-profit-real-kpi--cogs">
          <span className="product-profit-real-kpi__icon"><i className="fa-solid fa-boxes-stacked" /></span>
          <div><div className="product-profit-real-kpi__label">COGS کل FIFO</div><div className="product-profit-real-kpi__value">{fmtMoney(summary.totalCogs)}</div><p>بهای خروج انبار بر اساس FIFO</p></div>
        </article>
        <article className="product-profit-real-kpi product-profit-real-kpi--profit">
          <span className="product-profit-real-kpi__icon"><i className="fa-solid fa-chart-line" /></span>
          <div><div className="product-profit-real-kpi__label">سود کل</div><div className="product-profit-real-kpi__value">{fmtMoney(summary.totalProfit)}</div><p>سود عملیاتی محصول، جدا از نرخ وصول</p></div>
        </article>
        <article className="product-profit-real-kpi product-profit-real-kpi--margin">
          <span className="product-profit-real-kpi__icon"><i className="fa-solid fa-percent" /></span>
          <div><div className="product-profit-real-kpi__label">حاشیه سود کل</div><div className="product-profit-real-kpi__value">{fmtNum(summary.marginPct)}%</div><p>{riskSummary.negativeItems.toLocaleString('fa-IR')} کالا با سود منفی</p></div>
        </article>
      </section>

      <div className="product-profit-real-chart-grid">
        <div className="product-profit-real-chart-card product-profit-real-chart-card--share">
          <div className="product-profit-real-chart-card__head">
            <div>
              <div className="product-profit-real-chart-card__title"><i className="fa-solid fa-chart-pie" /> سهم از درآمد (Top 6)</div>
              <p className="product-profit-real-chart-card__subtext">{fmtNum(revenueConcentration)}٪ از کل درآمد در ۶ محصول اول متمرکز است.</p>
            </div>
            <div className="product-profit-real-chart-card__summary">
              <span className="product-profit-real-chart-card__summary-label">محصول اول</span>
              <strong title={topShareLegend[0]?.name || ''}>{topShareLegend[0] ? shortName(topShareLegend[0].name, 26) : '—'}</strong>
              <small>{topShareLegend[0] ? `${fmtNum(topShareLegend[0].percent)}٪ از درآمد` : '—'}</small>
            </div>
          </div>

          {isLoading ? (
            <div className="product-profit-real-chart-card__empty">در حال دریافت...</div>
          ) : topShareLegend.length === 0 ? (
            <div className="product-profit-real-chart-card__empty">داده‌ای برای سهم درآمد وجود ندارد.</div>
          ) : (
            <div className="product-profit-real-donut-layout">
              <div className="product-profit-real-donut-figure">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={topShareLegend} dataKey="value" nameKey="name" innerRadius={56} outerRadius={90} paddingAngle={2} stroke="rgba(255,255,255,0.95)" strokeWidth={2}>
                      {topShareLegend.map((_, i) => <Cell key={i} fill={chartPalette[i % chartPalette.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v:any)=>fmtMoney(v)} labelFormatter={(label:any)=>String(label || '')} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="product-profit-real-donut-center">
                  <strong>{fmtNum(topRevenueShare)}٪</strong>
                  <span>سهم محصول اول</span>
                </div>
              </div>
              <div className="product-profit-real-donut-legend">
                {topShareLegend.map((item, i) => (
                  <div key={item.name + i} className="product-profit-real-donut-legend__item">
                    <span className="product-profit-real-donut-legend__dot" style={{ backgroundColor: chartPalette[i % chartPalette.length] }} />
                    <div className="product-profit-real-donut-legend__text">
                      <strong>{shortName(item.name, 28)}</strong>
                      <small>{fmtMoney(item.value)} تومان</small>
                    </div>
                    <span className="product-profit-real-donut-legend__percent">{fmtNum(item.percent)}٪</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="product-profit-real-chart-card product-profit-real-chart-card--profit">
          <div className="product-profit-real-chart-card__head">
            <div>
              <div className="product-profit-real-chart-card__title"><i className="fa-solid fa-chart-column" /> بیشترین سود (Top 8)</div>
              <p className="product-profit-real-chart-card__subtext">مقایسه خواناتر سود محصولات با نام کالا و مقیاس قابل فهم.</p>
            </div>
            <div className="product-profit-real-chart-card__summary">
              <span className="product-profit-real-chart-card__summary-label">بیشترین سود</span>
              <strong title={riskSummary.bestItem?.name || ''}>{riskSummary.bestItem ? shortName(riskSummary.bestItem.name, 26) : '—'}</strong>
              <small>{riskSummary.bestItem ? fmtMoney(riskSummary.bestItem.profit) + ' تومان' : '—'}</small>
            </div>
          </div>

          {isLoading ? (
            <div className="product-profit-real-chart-card__empty">در حال دریافت...</div>
          ) : topProfit.length === 0 ? (
            <div className="product-profit-real-chart-card__empty">داده‌ای برای نمودار سود وجود ندارد.</div>
          ) : (
            <div className="product-profit-real-profit-ranking">
              {topProfit.map((item, index) => {
                const value = Number(item.profit || 0);
                const width = Math.max(7, Math.min(100, (Math.abs(value) / maxProfitValue) * 100));
                return (
                  <div key={item.name + index} className="product-profit-real-profit-row">
                    <div className="product-profit-real-profit-row__rank">{(index + 1).toLocaleString('fa-IR')}</div>
                    <div className="product-profit-real-profit-row__main">
                      <div className="product-profit-real-profit-row__topline">
                        <strong title={item.name}>{shortName(item.name, 34)}</strong>
                        <span>{fmtMoney(value)} تومان</span>
                      </div>
                      <div className="product-profit-real-profit-row__track" aria-hidden="true">
                        <span
                          className={value < 0 ? 'is-negative' : ''}
                          style={{ width: `${width}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="product-profit-real-table-shell">
        {isLoading ? (
          <div className="p-10 text-center text-gray-500 dark:text-gray-400">در حال دریافت...</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-gray-500 dark:text-gray-400">داده‌ای وجود ندارد.</div>
        ) : (
          <div className="product-profit-real-table-scroll">
            <table className="product-profit-real-table">
              <thead >
                <tr className="text-right">
                  <th className="p-3">محصول</th>
                  <th className="p-3">قیمت خرید (میانگین)</th>
                  <th className="p-3">قیمت فروش (میانگین)</th>
                  <th className="p-3">تعداد فروش</th>
                  <th className="p-3">درآمد</th>
                  <th className="p-3">سود</th>
                  <th className="p-3">سهم از درآمد%</th>
                  <th className="p-3">حاشیه%</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.productId} className={r.profit < 0 ? 'is-negative' : ''}>
                    <td className="p-3 font-semibold">{r.name}</td>
                    <td className="p-3 whitespace-nowrap">{fmtMoney(r.avgBuyPrice)}</td>
                    <td className="p-3 whitespace-nowrap">{fmtMoney(r.avgSellPrice)}</td>
                    <td className="p-3 whitespace-nowrap">{fmtNum(r.qty)}</td>
                    <td className="p-3 whitespace-nowrap">{fmtMoney(r.revenue)}</td>
                    <td className="p-3 whitespace-nowrap font-semibold">{fmtMoney(r.profit)}</td>
                    <td className="p-3 whitespace-nowrap">{fmtNum(r.shareOfRevenue)}%</td>
                    <td className="p-3 whitespace-nowrap">{fmtNum(r.marginPct)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
