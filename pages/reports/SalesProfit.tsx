import jsPDF from 'jspdf';
import 'jspdf-autotable';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import moment from 'jalali-moment';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from 'recharts';
import ShamsiDatePicker from '../../components/ShamsiDatePicker';
import Notification from '../../components/Notification';
import { formatIsoToShamsiDateTime } from '../../utils/dateUtils';
import { useAuth } from '../../contexts/AuthContext';
import type { NotificationMessage } from '../../types';


import { useReportsExports } from '../../contexts/ReportsExportsContext';
import KpiDefinitionNote from '../../components/reports/KpiDefinitionNote';

type Row = { saleId: number; date: string; productId: number; name: string; qty: number; revenue: number; cogs: number; profit: number; marginPct: number };

const fmtMoney = (n: any) => Number(n || 0).toLocaleString('fa-IR');
const prettyDay = (value: string) => {
  const raw = String(value || '').trim();
  if (!raw) return '—';
  if (/^\d{4}\/\d{2}\/\d{2}/.test(raw)) return raw;
  try { return formatIsoToShamsiDateTime(raw, 'jMM/jDD'); } catch { return raw; }
};

export default function SalesProfit() {
  const { token } = useAuth();
  const { registerReportExports } = useReportsExports();
  const exportExcelRef = useRef<() => void>(() => {});
  const [fromDate, setFromDate] = useState<Date | null>(moment().subtract(30, 'days').toDate());
  const [toDate, setToDate] = useState<Date | null>(new Date());
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState('');
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
      const res = await fetch(`/api/reports/sales-profit?${qs.toString()}`, { headers: { Authorization: `Bearer ${token}` } });
      const js = await res.json();
      if (!res.ok || js?.success === false) throw new Error(js?.message || 'خطا در دریافت سود فروش');
      setRows(js.data || []);
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

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const r = !s ? rows : rows.filter(x => String(x.name||'').toLowerCase().includes(s));
    return r;
  }, [rows, q]);

  const trend = useMemo(() => {
    const map: Record<string, any> = {};
    for (const r of filtered) {
      const d = String(r.date).slice(0,10);
      if (!map[d]) map[d] = { date: d, profit: 0, revenue: 0, cogs: 0 };
      map[d].profit += Number(r.profit || 0);
      map[d].revenue += Number(r.revenue || 0);
      map[d].cogs += Number(r.cogs || 0);
    }
    return Object.values(map).sort((a:any,b:any)=>String(a.date).localeCompare(String(b.date)));
  }, [filtered]);


  const exportExcel = async () => {
    if (!token) return;
    const qs = new URLSearchParams();
    if (fromDate) qs.set('from', moment(fromDate).startOf('day').toDate().toISOString());
    if (toDate) qs.set('to', moment(toDate).endOf('day').toDate().toISOString());
    const res = await fetch(`/api/exports/sales-profit.xlsx?${qs.toString()}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error('خطا در دریافت فایل اکسل');
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `sales_profit_${moment().format('YYYY-MM-DD')}.xlsx`;
    document.body.appendChild(a); a.click(); a.remove();
  };

  // اتصال دکمه Excel بالای ReportsLayout به خروجی دقیق همین صفحه
  exportExcelRef.current = exportExcel;
  useEffect(() => {
    registerReportExports({ excel: () => exportExcelRef.current() });
    return () => registerReportExports({});
  }, [registerReportExports]);


  const exportPdf = () => {
    const doc = new (jsPDF as any)({ orientation: 'landscape' });
    doc.setFontSize(12);
    // @ts-ignore
    doc.text('سود هر فروش (FIFO)', 10, 10);

    const body = filtered.map(r => ([
      r.date,
      r.name,
      String(r.qty||0),
      String(r.revenue||0),
      String(r.cogs||0),
      String(r.profit||0),
      String(r.marginPct||0),
    ]));

    // @ts-ignore
    doc.autoTable({
      head: [['تاریخ','محصول','تعداد','درآمد','COGS','سود','حاشیه%']],
      body,
      startY: 16,
      styles: { fontSize: 8 },
    });

    doc.save(`sales_profit_${moment().format('YYYY-MM-DD')}.pdf`);
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-900/70 dark:border-slate-800 relative overflow-hidden">
        <div className="absolute -top-16 -left-16 h-40 w-40 rounded-full bg-indigo-100 blur-2xl opacity-70 dark:bg-indigo-900/30" />
        <div className="absolute -bottom-16 -right-16 h-40 w-40 rounded-full bg-emerald-100 blur-2xl opacity-70 dark:bg-emerald-900/30" />
        <div className="relative report-header-main gap-3">
          <div>
            <div className="text-lg font-bold text-gray-900 dark:text-gray-100">سود واقعی هر فروش (FIFO)</div>
            <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">COGS و Profit به تفکیک فروش‌های انبار</div>
          </div>
          <div className="report-header-controls">
            <div className="report-filter-inline-actions">
            <ShamsiDatePicker selectedDate={fromDate} onDateChange={setFromDate} preview="از تاریخ"
              inputClassName="report-filter-control px-3 py-2 rounded-xl border bg-white/70 backdrop-blur dark:bg-slate-900/50 dark:border-slate-700 text-sm" />
            <ShamsiDatePicker selectedDate={toDate} onDateChange={setToDate} preview="تا تاریخ"
              inputClassName="report-filter-control px-3 py-2 rounded-xl border bg-white/70 backdrop-blur dark:bg-slate-900/50 dark:border-slate-700 text-sm" />
            <input value={q} onChange={(e)=>setQ(e.target.value)}
              className="report-filter-control px-3 py-2 rounded-xl border bg-white/70 backdrop-blur dark:bg-slate-900/50 dark:border-slate-700 text-sm"
              preview="جستجوی محصول…" />
            <span className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400" title="خروجی Excel از نوار مرکزی بالای گزارش انجام می‌شود.">
              <i className="fa-solid fa-arrow-up-right-from-square ml-2" /> خروجی از نوار بالا
            </span>
            {/* خروجی PDF حذف مورد شد */}
            <button onClick={fetchData} className="w-full px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold sm:w-auto">
              <i className="fa-solid fa-rotate ml-2" /> بروزرسانی
            </button>
            </div>
          </div>
        </div>
      </div>

      {notification ? <Notification message={notification.message} type={notification.type} /> : null}

      <KpiDefinitionNote
        title="مرزبندی سود فروش"
        description="این گزارش سود FIFO هر فروش را نشان می‌دهد؛ برای سود بر اساس وصول، از گزارش سود تحقق‌یافته استفاده کن."
        items={[
          { label: 'درآمد فروش', role: 'operational', description: 'مبلغ فروش ثبت‌شده در سند.' },
          { label: 'COGS FIFO', role: 'operational', description: 'بهای تمام‌شده بر اساس خروج انبار/FIFO.' },
          { label: 'سود FIFO', role: 'operational', description: 'درآمد منهای COGS؛ مستقل از زمان وصول وجه.' },
          { label: 'سود تحقق‌یافته', role: 'recognized', description: 'در گزارش جداگانه و بر اساس پول وصول‌شده محاسبه می‌شود.' },
        ]}
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-900/70 dark:border-slate-800">
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            <i className="fa-solid fa-chart-line ml-2 text-emerald-600" /> روند سود (روزانه)
          </div>
          <div className="mt-3 h-72">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">در حال دریافت...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={prettyDay} minTickGap={18} />
                  <YAxis tickFormatter={(v) => (Number(v) / 1000).toLocaleString('fa-IR') + 'k'} width={50} />
                  <Tooltip formatter={(v:any)=>fmtMoney(v)} labelFormatter={(l:any)=>prettyDay(String(l))} />
                  <Line type="monotone" dataKey="profit" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-900/70 dark:border-slate-800">
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            <i className="fa-solid fa-chart-column ml-2 text-indigo-600" /> Revenue vs COGS (روزانه)
          </div>
          <div className="mt-3 h-72">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">در حال دریافت...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trend} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={prettyDay} minTickGap={18} />
                  <YAxis tickFormatter={(v) => (Number(v) / 1000).toLocaleString('fa-IR') + 'k'} width={50} />
                  <Tooltip formatter={(v:any)=>fmtMoney(v)} labelFormatter={(l:any)=>prettyDay(String(l))} />
                  <Bar dataKey="revenue" />
                  <Bar dataKey="cogs" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden dark:bg-slate-900/70 dark:border-slate-800">
        {isLoading ? (
          <div className="p-10 text-center text-gray-500 dark:text-gray-400">در حال دریافت...</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-gray-500 dark:text-gray-400">داده‌ای وجود ندارد.</div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-800/70">
                <tr className="text-right">
                  <th className="p-3">تاریخ</th>
                  <th className="p-3">محصول</th>
                  <th className="p-3">تعداد</th>
                  <th className="p-3">درآمد</th>
                  <th className="p-3">COGS</th>
                  <th className="p-3">سود</th>
                  <th className="p-3">حاشیه%</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.saleId} className={`border-t border-gray-100 dark:border-slate-800 ${r.profit < 0 ? 'bg-rose-50 dark:bg-rose-900/10' : ''}`}>
                    <td className="p-3 whitespace-nowrap">{prettyDay(r.date)}</td>
                    <td className="p-3">{r.name}</td>
                    <td className="p-3 whitespace-nowrap">{Number(r.qty||0).toLocaleString('fa-IR')}</td>
                    <td className="p-3 whitespace-nowrap">{fmtMoney(r.revenue)}</td>
                    <td className="p-3 whitespace-nowrap">{fmtMoney(r.cogs)}</td>
                    <td className="p-3 whitespace-nowrap font-semibold">{fmtMoney(r.profit)}</td>
                    <td className="p-3 whitespace-nowrap">{Number(r.marginPct||0).toLocaleString('fa-IR')}</td>
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
