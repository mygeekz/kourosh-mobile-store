import jsPDF from 'jspdf';
import 'jspdf-autotable';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import Notification from '../../components/Notification';
import { useAuth } from '../../contexts/AuthContext';
import type { NotificationMessage } from '../../types';


import { useReportsExports } from '../../contexts/ReportsExportsContext';
import KpiDefinitionNote from '../../components/reports/KpiDefinitionNote';

type Row = { month: string; productId: number; name: string; qty: number; revenue: number; cogs: number; profit: number; marginPct: number };

const fmtMoney = (n: any) => Number(n || 0).toLocaleString('fa-IR');

export default function ProductMargins() {
  const { token } = useAuth();
  const { registerReportExports } = useReportsExports();
  const exportExcelRef = useRef<() => void>(() => {});
  const [rows, setRows] = useState<Row[]>([]);
  const [monthsBack, setMonthsBack] = useState(6);
  const [q, setQ] = useState('');
  const [notification, setNotification] = useState<NotificationMessage | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = async () => {
    if (!token) return;
    setIsLoading(true);
    setNotification(null);
    try {
      const res = await fetch(`/api/reports/product-margins?monthsBack=${monthsBack}`, { headers: { Authorization: `Bearer ${token}` } });
      const js = await res.json();
      if (!res.ok || js?.success === false) throw new Error(js?.message || 'خطا در دریافت گزارش سود');
      setRows(js.data || []);
    } catch (e: any) {
      setNotification({ message: e?.message || 'خطا در عملیات', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); /* eslint-disable-next-line */ }, [token, monthsBack]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const r = !s ? rows : rows.filter(x => String(x.name||'').toLowerCase().includes(s));
    return r.sort((a,b) => b.profit - a.profit);
  }, [rows, q]);

  const chartData = useMemo(() => {
    const map: Record<string, any> = {};
    for (const r of rows) {
      if (!map[r.month]) map[r.month] = { month: r.month, profit: 0, revenue: 0, cogs: 0 };
      map[r.month].profit += Number(r.profit || 0);
      map[r.month].revenue += Number(r.revenue || 0);
      map[r.month].cogs += Number(r.cogs || 0);
    }
    return Object.values(map).sort((a:any,b:any) => String(a.month).localeCompare(String(b.month)));
  }, [rows]);


  const exportExcel = async () => {
    if (!token) return;
    const res = await fetch(`/api/exports/product-margins.xlsx?monthsBack=${monthsBack}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error('خطا در دریافت فایل اکسل');
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `product_margins_${moment().format('YYYY-MM-DD')}.xlsx`;
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
    // @ts-ignore
    doc.text('گزارش سود محصولات (FIFO)', 10, 10);
    const body = filtered.map(r => ([
      r.month, r.name, String(r.qty||0), String(r.revenue||0), String(r.cogs||0), String(r.profit||0), String(r.marginPct||0)
    ]));
    // @ts-ignore
    doc.autoTable({
      head: [['ماه','محصول','تعداد','درآمد','COGS','سود','حاشیه%']],
      body,
      startY: 16,
      styles: { fontSize: 8 },
    });
    doc.save(`product_margins_${moment().format('YYYY-MM-DD')}.pdf`);
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-900/70 dark:border-slate-800 relative overflow-hidden">
        <div className="absolute -top-16 -left-16 h-40 w-40 rounded-full bg-emerald-100 blur-2xl opacity-70 dark:bg-emerald-900/30" />
        <div className="absolute -bottom-16 -right-16 h-40 w-40 rounded-full bg-rose-100 blur-2xl opacity-70 dark:bg-rose-900/30" />
        <div className="relative flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="text-lg font-bold text-gray-900 dark:text-gray-100">گزارش سود محصولات (FIFO)</div>
            <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">Revenue − COGS(FIFO) • Margin%</div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="px-3 py-2 rounded-xl border bg-white/70 backdrop-blur dark:bg-slate-900/50 dark:border-slate-700 text-sm"
              preview="جستجو…"
            />
            <select
              value={monthsBack}
              onChange={(e) => setMonthsBack(Number(e.target.value))}
              className="px-3 py-2 rounded-xl border bg-white/70 backdrop-blur dark:bg-slate-900/50 dark:border-slate-700 text-sm"
            >
              <option value={3}>۳ ماه</option>
              <option value={6}>۶ ماه</option>
              <option value={12}>۱۲ ماه</option>
            </select>
            <span className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400" title="خروجی Excel از نوار مرکزی بالای گزارش انجام می‌شود.">
              <i className="fa-solid fa-arrow-up-right-from-square ml-2" /> خروجی از نوار بالا
            </span>
            {/* خروجی PDF حذف مورد شد */}
            <button onClick={fetchData} className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold">
              <i className="fa-solid fa-rotate ml-2" />
              بروزرسانی
            </button>
          </div>
        </div>
      </div>

      {notification ? <Notification message={notification.message} type={notification.type} /> : null}

      <KpiDefinitionNote
        title="مرزبندی حاشیه سود"
        description="این صفحه برای روند و حاشیه سود محصول است و KPIهای وصول نقدی را تکرار نمی‌کند."
        items={[
          { label: 'سود ماهانه', role: 'operational', description: 'سود تجمیعی محصول در هر ماه.' },
          { label: 'حاشیه سود', role: 'audit', description: 'نسبت سود به درآمد؛ شاخص کیفیت سود نه مبلغ وصول.' },
          { label: 'درآمد', role: 'operational', description: 'حجم فروش محصول و مبنای محاسبه margin.' },
          { label: 'نرخ وصول', role: 'collection', description: 'در گزارش تحقق‌یافته/مالی نمایش داده می‌شود، نه در این روند محصول.' },
        ]}
      />

      <div className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-900/70 dark:border-slate-800">
        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          <i className="fa-solid fa-chart-column ml-2 text-indigo-600" />
          روند سود (تجمیعی ماهانه)
        </div>
        <div className="mt-3 h-72">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">در حال دریافت...</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(v) => (Number(v) / 1000).toLocaleString('fa-IR') + 'k'} width={50} />
                <Tooltip formatter={(v: any) => fmtMoney(v)} />
                <Bar dataKey="profit" />
              </BarChart>
            </ResponsiveContainer>
          )}
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
                  <th className="p-3">ماه</th>
                  <th className="p-3">محصول</th>
                  <th className="p-3">تعداد</th>
                  <th className="p-3">درآمد</th>
                  <th className="p-3">COGS</th>
                  <th className="p-3">سود</th>
                  <th className="p-3">حاشیه%</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={i} className={`border-t border-gray-100 dark:border-slate-800 ${r.profit < 0 ? 'bg-rose-50 dark:bg-rose-900/10' : ''}`}>
                    <td className="p-3 whitespace-nowrap">{r.month}</td>
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
