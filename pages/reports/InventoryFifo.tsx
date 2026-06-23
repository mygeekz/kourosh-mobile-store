import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useEffect, useMemo, useRef, useState } from 'react';
import moment from 'jalali-moment';
import Notification from '../../components/Notification';
import { useAuth } from '../../contexts/AuthContext';
import type { NotificationMessage } from '../../types';


import { useReportsExports } from '../../contexts/ReportsExportsContext';

type Layer = { entryDate: string; remainingQty: number; unitCost: number; value: number; ageDays: number };
type Row = { productId: number; name: string; onHandQty: number; onHandValue: number; avgCost: number; layers: Layer[] };

const fmtMoney = (n: any) => Number(n || 0).toLocaleString('fa-IR');
const fmtQty = (n: any) => Number(n || 0).toLocaleString('fa-IR');

export default function InventoryFifo() {
  const { token } = useAuth();
  const { registerReportExports } = useReportsExports();
  const exportExcelRef = useRef<() => void>(() => {});
  const [data, setData] = useState<Row[]>([]);
  const [q, setQ] = useState('');
  const [notification, setNotification] = useState<NotificationMessage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [agingBuckets, setAgingBuckets] = useState<any>(null);


  const fetchData = async () => {
    if (!token) return;
    setIsLoading(true);
    setNotification(null);
    try {
      const res = await fetch('/api/reports/inventory-fifo', { headers: { Authorization: `Bearer ${token}` } });
      const js = await res.json();
      if (!res.ok || js?.success === false) throw new Error(js?.message || 'خطا در دریافت گزارش انبار');
      setData(js.data || []);
      try {
        const bRes = await fetch('/api/reports/inventory-aging-buckets', { headers: { Authorization: `Bearer ${token}` } });
        const bJs = await bRes.json();
        if (bRes.ok && bJs?.success !== false) setAgingBuckets(bJs.data);
      } catch {}

    } catch (e: any) {
      setNotification({ message: e?.message || 'خطا در عملیات', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); /* eslint-disable-next-line */ }, [token]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const rows = !s ? data : data.filter(r => String(r.name||'').toLowerCase().includes(s));
    return rows.sort((a,b) => Number(b.onHandValue||0) - Number(a.onHandValue||0));
  }, [data, q]);


  const exportExcel = async () => {
    if (!token) return;
    const res = await fetch('/api/exports/inventory-fifo.xlsx', { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error('خطا در دریافت فایل اکسل');
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `inventory_fifo_${moment().format('YYYY-MM-DD')}.xlsx`;
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
    doc.text('گزارش موجودی (FIFO / Stock Aging)', 10, 10);

    const body = filtered.map(r => ([
      r.name,
      String(r.onHandQty||0),
      String(r.onHandValue||0),
      String(r.avgCost||0),
      String((r.layers||[]).length),
    ]));

    // @ts-ignore
    doc.autoTable({
      head: [['محصول','موجودی','ارزش موجودی','میانگین قیمت','تعداد لایه‌ها']],
      body,
      startY: 16,
      styles: { fontSize: 8 },
    });

    doc.save(`inventory_fifo_${moment().format('YYYY-MM-DD')}.pdf`);
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-900/70 dark:border-slate-800 relative overflow-hidden">
        <div className="absolute -top-16 -left-16 h-40 w-40 rounded-full bg-amber-100 blur-2xl opacity-70 dark:bg-amber-900/30" />
        <div className="absolute -bottom-16 -right-16 h-40 w-40 rounded-full bg-sky-100 blur-2xl opacity-70 dark:bg-sky-900/30" />
        <div className="relative flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="text-lg font-bold text-gray-900 dark:text-gray-100">گزارش موجودی (FIFO / Stock Aging)</div>
            <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">لایه‌های موجودی بر اساس تاریخ ورود و قیمت خرید</div>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="px-3 py-2 rounded-xl border bg-white/70 backdrop-blur dark:bg-slate-900/50 dark:border-slate-700 text-sm"
              placeholder="جستجوی محصول…"
            />
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

      
      {agingBuckets ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-900/70 dark:border-slate-800">
            <div className="text-xs text-gray-500 dark:text-gray-400">۰ تا ۳۰ روز</div>
            <div className="mt-2 text-xl font-bold">{fmtMoney(agingBuckets.b0_30)}</div>
          </div>
          <div className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-900/70 dark:border-slate-800">
            <div className="text-xs text-gray-500 dark:text-gray-400">۳۱ تا ۹۰ روز</div>
            <div className="mt-2 text-xl font-bold">{fmtMoney(agingBuckets.b31_90)}</div>
          </div>
          <div className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-900/70 dark:border-slate-800">
            <div className="text-xs text-gray-500 dark:text-gray-400">۹۱ تا ۱۸۰ روز</div>
            <div className="mt-2 text-xl font-bold">{fmtMoney(agingBuckets.b91_180)}</div>
          </div>
          <div className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-900/70 dark:border-slate-800">
            <div className="text-xs text-gray-500 dark:text-gray-400">۱۸۰+ روز</div>
            <div className="mt-2 text-xl font-bold">{fmtMoney(agingBuckets.b181_plus)}</div>
          </div>
        </div>
      ) : null}

{notification ? <Notification message={notification.message} type={notification.type} /> : null}

      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden dark:bg-slate-900/70 dark:border-slate-800">
        {isLoading ? (
          <div className="p-10 text-center text-gray-500 dark:text-gray-400">در حال دریافت...</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-gray-500 dark:text-gray-400">موردی یافت نشد.</div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-800/70">
                <tr className="text-right">
                  <th className="p-3">محصول</th>
                  <th className="p-3">موجودی</th>
                  <th className="p-3">ارزش موجودی</th>
                  <th className="p-3">میانگین قیمت</th>
                  <th className="p-3">لایه‌ها (قدیمی → جدید)</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.productId} className="border-t border-gray-100 dark:border-slate-800 align-top">
                    <td className="p-3 font-semibold">{r.name}</td>
                    <td className="p-3 whitespace-nowrap">{fmtQty(r.onHandQty)}</td>
                    <td className="p-3 whitespace-nowrap">{fmtMoney(r.onHandValue)}</td>
                    <td className="p-3 whitespace-nowrap">{fmtMoney(r.avgCost)}</td>
                    <td className="p-3">
                      {r.layers.length === 0 ? (
                        <span className="text-xs text-gray-500 dark:text-gray-400">—</span>
                      ) : (
                        <div className="space-y-2">
                          {r.layers.slice(0, 6).map((l, i) => (
                            <div key={i} className="rounded-xl border bg-white/60 p-2 dark:bg-slate-900/40 dark:border-slate-800">
                              <div className="flex items-center justify-between gap-2">
                                <div className="text-xs text-gray-600 dark:text-gray-300">
                                  {moment(l.entryDate).locale('fa').format('jYYYY/jMM/jDD')} • {Number(l.ageDays).toLocaleString('fa-IR')} روز
                                </div>
                                <div className="text-xs font-semibold">{fmtMoney(l.unitCost)}</div>
                              </div>
                              <div className="mt-1 text-sm">
                                باقی‌مانده: <span className="font-semibold">{fmtQty(l.remainingQty)}</span> • ارزش: <span className="font-semibold">{fmtMoney(l.value)}</span>
                              </div>
                            </div>
                          ))}
                          {r.layers.length > 6 ? <div className="text-xs text-gray-500 dark:text-gray-400">+ {fmtQty(r.layers.length - 6)} لایه دیگر</div> : null}
                        </div>
                      )}
                    </td>
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
