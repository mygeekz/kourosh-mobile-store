import { useConfirm } from '../contexts/ConfirmContext';
// pages/Invoices.tsx
import React, { useEffect, useState, ChangeEvent, useRef, useMemo } from "react";
import PageKit from '../components/ui/PageKit';
import { Link } from "react-router-dom";
import moment from "jalali-moment";
import { SalesTransactionEntry, NotificationMessage } from "../types";
import Notification from "../components/Notification";
import { formatIsoToShamsi } from "../utils/dateUtils";
import { useAuth } from "../contexts/AuthContext";
import { getAuthHeaders } from "../utils/apiUtils";
import ExportMenu from "../components/ExportMenu";
import { exportToExcel, exportToPdfTable } from "../utils/exporters";
import { printArea } from "../utils/printArea";
import Skeleton from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";
import { parseApiResult, runWithFeedback, humanizeErrorMessage } from '../utils/feedback';
import Button from '../components/Button';
import { formatCurrencyText, readStoredCurrencyUnit } from '../utils/currency';

/* ---------- تاریخ ---------- */
const parseTs = (s?: string | null): number => {
  if (!s) return 0;
  if (s.includes("T") || s.includes("-")) {
    const t = Date.parse(s);
    return isNaN(t) ? 0 : t;
  }
  const m = moment.from(s, "fa", "jYYYY/jMM/jDD");
  return m.isValid() ? m.toDate().getTime() : 0;
};
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/* ---------- fallback آخرین فاکتور از localStorage ---------- */
const lastInvoiceItemsRaw = localStorage.getItem("lastInvoiceItems");
const recentInvoiceLocal = lastInvoiceItemsRaw ? (JSON.parse(lastInvoiceItemsRaw) as any[]) : null;

/* ---------- نام/خلاصه‌ی آیتم ---------- */
const pickItemName = (it: any): string => {
  const candidates = [
    it?.description, it?.itemDescription, it?.summary, it?.name, it?.itemName,
    it?.title, it?.productName, it?.sellableTitle, it?.sellableName, it?.serviceName, it?.label,
  ];
  let base = "";
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) { base = c.trim(); break; }
  }
  if (!base) base = "—";
  const extras = [it?.brand, it?.model, it?.color].filter((x) => typeof x === "string" && x.trim()) as string[];
  if (extras.length) base += ` (${extras.join(" / ")})`;
  return base;
};
const summarizeItems = (items: any[]): string => {
  const names = items.map(pickItemName).filter(Boolean);
  const uniq: string[] = [];
  for (const n of names) if (!uniq.includes(n)) uniq.push(n);
  if (uniq.length === 0) return "—";
  if (uniq.length === 1) return uniq[0];
  return `${uniq[0]} + ${uniq.length - 1} مورد دیگر`;
};

const normalizeSalePaymentMethod = (sale: any): 'cash' | 'credit' | 'installment' => {
  const raw = String(
    sale?.paymentMethod
    ?? sale?.payment_method
    ?? sale?.paymentType
    ?? sale?.purchaseType
    ?? sale?.purchaseTypeLabel
    ?? '',
  ).trim().toLowerCase();
  if (raw.includes('installment') || raw.includes('قسط')) return 'installment';
  if (raw.includes('credit') || raw.includes('اعتبار')) return 'credit';
  return 'cash';
};

const paymentMethodMeta = (sale: any) => {
  const kind = normalizeSalePaymentMethod(sale);
  if (kind === 'credit') return { label: 'فروش اعتباری', className: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-300' };
  if (kind === 'installment') return { label: 'فروش اقساطی', className: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/25 dark:text-blue-300' };
  return { label: 'فروش نقدی', className: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/25 dark:text-emerald-300' };
};

/* ---------- نوع باکس آخرین فاکتور ---------- */
type LastBox = { id?: number; lines: string[]; grandTotal?: number | null };

const InvoicesPage: React.FC = () => {
  const confirmAction = useConfirm();
  const { token } = useAuth();

  const [sales, setSales] = useState<SalesTransactionEntry[]>([]);
  const [filteredSales, setFilteredSales] = useState<SalesTransactionEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [stats, setStats] = useState({ today: 0, week: 0, month: 0 });
  const [lastBox, setLastBox] = useState<LastBox | null>(null);

  /* کش شرح دقیق هر فاکتور */
  const [descCache, setDescCache] = useState<Record<number, string>>({});
  const inflight = useRef<Set<number>>(new Set());

  /* وضعیت ابطال */
  const [deletingId, setDeletingId] = useState<number | null>(null);

  /* صفحه‌بندی */
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const pickSaleDesc = (sale: any): string =>
    sale?.summary ?? sale?.description ?? sale?.itemName ?? "—";

  const sortSales = (rows: SalesTransactionEntry[]) =>
    [...rows].sort((a, b) => {
      const tb = parseTs(b.transactionDate);
      const ta = parseTs(a.transactionDate);
      if (tb !== ta) return tb - ta;
      return Number(b.id) - Number(a.id);
    });

  const computeStats = (rows: SalesTransactionEntry[]) => {
    const now = new Date();
    const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 6);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    let today = 0, week = 0, month = 0;
    for (const r of rows) {
      const d = new Date(parseTs(r.transactionDate));
      if (!isNaN(d.getTime())) {
        if (sameDay(d, now)) today++;
        if (d >= weekAgo) week++;
        if (d >= monthStart) month++;
      }
    }
    setStats({ today, week, month });
  };

  const buildLines = (items: any[]): string[] =>
    items.map((it) => {
      const qty = Number(it?.quantity ?? it?.qty ?? 1);
      const unit = Number(
        it?.unitPrice ?? it?.unit_price ?? it?.price ?? it?.salePrice ?? it?.unitSalePrice ?? 0
      );
      const rawTotal = it?.totalPrice ?? it?.lineTotal ?? it?.total;
      const total = Number(rawTotal != null ? rawTotal : qty * unit);
      const name = pickItemName(it);
      return `${name} × ${qty.toLocaleString("fa-IR")} = ${formatCurrencyText(total, readStoredCurrencyUnit())}`;
    });

  const fetchLastBoxFromAPI = async (id: number) => {
    try {
      const res = await fetch(`/api/sales-orders/${id}`, { headers: getAuthHeaders(token!) });
      const j = await res.json();
      if (res.ok && j?.success && j?.data) {
        const inv = j.data;
        const items = inv.lineItems || inv.items || inv.orderItems || inv.rows || [];
        setLastBox({
          id,
          lines: buildLines(items),
          grandTotal: Number(inv?.financialSummary?.grandTotal ?? inv?.grandTotal ?? NaN) || null,
        });
        return;
      }
      throw new Error();
    } catch {
      if (Array.isArray(recentInvoiceLocal) && recentInvoiceLocal.length) {
        setLastBox({ lines: buildLines(recentInvoiceLocal), grandTotal: null });
      } else setLastBox(null);
    }
  };

  const fetchSales = async () => {
    if (!token) return;
    setIsLoading(true);
    setNotification(null);
    try {
      const res = await fetch("/api/sales-orders", { headers: getAuthHeaders(token) });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.message || "خطا در دریافت لیست فروش‌ها");

      const sorted = sortSales(json.data as SalesTransactionEntry[]);
      setSales(sorted);
      setFilteredSales(sorted);
      computeStats(sorted);

      if (sorted.length) await fetchLastBoxFromAPI(sorted[0].id);

      warmDescriptions(sorted.slice(0, 50));
    } catch (e: any) {
      setNotification({ type: "error", text: e?.message || "خطا در عملیاتی نامشخص" });
    } finally {
      setIsLoading(false);
    }
  };

  const warmDescriptions = async (rows: SalesTransactionEntry[]) => {
    const limit = 4;
    let idx = 0;
    const worker = async () => {
      while (idx < rows.length) {
        const pos = idx++;
        const sale = rows[pos];
        if (!sale?.id || inflight.current.has(sale.id) || descCache[sale.id]) continue;
        inflight.current.add(sale.id);
        try {
          const r = await fetch(`/api/sales-orders/${sale.id}`, { headers: getAuthHeaders(token!) });
          const j = await r.json();
          if (r.ok && j?.success && j?.data) {
            const items = j.data.lineItems || j.data.items || j.data.orderItems || j.data.rows || [];
            const text = summarizeItems(items);
            setDescCache((m) => ({ ...m, [sale.id]: text }));
          }
        } catch { /* ignore */ }
        finally { inflight.current.delete(sale.id); }
      }
    };
    await Promise.all(Array.from({ length: Math.min(limit, rows.length) }, worker));
  };

  useEffect(() => { if (token) fetchSales(); }, [token]);

  /* جست‌وجو */
  useEffect(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) { setFilteredSales(sales); return; }
    setFilteredSales(
      sales.filter((sale) => {
        const desc = (descCache[sale.id] || pickSaleDesc(sale)).toLowerCase();
        const idFa = sale.id.toLocaleString("fa-IR");
        const idEn = String(sale.id);
        return (
          idFa.includes(term) ||
          idEn.includes(term) ||
          (sale.itemName ? sale.itemName.toLowerCase().includes(term) : false) ||
          desc.includes(term) ||
          (sale.customerFullName ? sale.customerFullName.toLowerCase().includes(term) : false) ||
          formatIsoToShamsi(sale.transactionDate).includes(term)
        );
      })
    );
    setPageIndex(0); // ریست صفحه هنگام جست‌وجو
  }, [searchTerm, sales, descCache]);

  // وقتی داده فیلترشده تغییر کرد، اگر صفحه خارج از بازه بود ریست شود
  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(filteredSales.length / pageSize) - 1);
    if (pageIndex > maxPage) setPageIndex(0);
  }, [filteredSales, pageIndex, pageSize]);

  const onSearch = (e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value);
  const formatPrice = (p?: number | null) => (p != null ? formatCurrencyText(p, readStoredCurrencyUnit()) : '-');

  
/* ---------------- ابطال فاکتور ---------------- */
const cancelInvoice = async (sale: SalesTransactionEntry) => {
  if (!token) return;
  const reason = window.prompt(`دلیل ابطال فاکتور شماره ${sale.id} را وارد کنید (اختیاری):`) || '';
  const ok = await confirmAction({ title: 'ابطال فاکتور', description: `فاکتور شماره ${sale.id} باطل شود؟ این عملیات قابل بازگشت نیست.`, confirmText: 'بله، باطل شود', tone: 'danger', iconClass: 'fa-solid fa-file-circle-xmark' });
  if (!ok) return;

  setDeletingId(sale.id);
  setNotification(null);

  try {
    await runWithFeedback(
      parseApiResult<any>(
        await fetch(`/api/sales-orders/${sale.id}/cancel`, {
          method: "POST",
          headers: { ...getAuthHeaders(token), "Content-Type": "application/json" },
          body: JSON.stringify({ reason }),
        }),
        { endpoint: '/api/sales-orders/cancel', action: 'ابطال فاکتور' }
      ),
      {
        kind: 'action',
        endpoint: '/api/sales-orders/cancel',
        loading: 'در حال ابطال فاکتور و بازگردانی موجودی…',
        success: `فاکتور #${sale.id} با موفقیت باطل شد.`,
        error: 'ابطال فاکتور انجام نشد؛ وضعیت فاکتور، موجودی اقلام یا دسترسی کاربر را بررسی و ادامه کنید.',
      }
    );

    // به‌روزرسانی کلاینت: فاکتور ابطال نمی‌شود، فقط وضعیتش تغییر می‌کند
    const newSales = sales.map((s) => (s.id === sale.id ? ({ ...s, status: "canceled" } as any) : s));
    setSales(newSales);
    setFilteredSales((list) => list.map((s) => (s.id === sale.id ? ({ ...s, status: "canceled" } as any) : s)));
    computeStats(newSales);

    setDeletingId(null);
    setNotification({ type: "success", text: `فاکتور #${sale.id} باطل شد.` });
  } catch (e: any) {
    setDeletingId(null);
    setNotification({ type: "error", text: humanizeErrorMessage(e?.message || "ابطال فاکتور انجام نشد.", { endpoint: '/api/sales-orders/cancel', action: 'ابطال فاکتور' }) });
  }
};


/* ---------- صفحه‌بندی محاسبه‌شده ---------- */
  const pageCount = useMemo(
    () => Math.ceil(filteredSales.length / pageSize) || 1,
    [filteredSales.length, pageSize]
  );
  const pageRows = useMemo(
    () => filteredSales.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize),
    [filteredSales, pageIndex, pageSize]
  );

  const exportFilenameBase = `invoices-${new Date().toISOString().slice(0, 10)}`;
  const exportRows = filteredSales.map((sale) => ({
    id: sale.id,
    date: formatIsoToShamsi(sale.transactionDate),
    customer: (sale as any).customerName ?? (sale as any).customerFullName ?? (sale as any).customer ?? '—',
    paymentType: paymentMethodMeta(sale).label,
    description: descCache[sale.id] ?? pickSaleDesc(sale),
    total: Number((sale as any).grandTotal ?? (sale as any).totalAmount ?? (sale as any).total ?? 0),
  }));

  const doExportExcel = () => {
    exportToExcel(
      `${exportFilenameBase}.xlsx`,
      exportRows,
      [
        { header: 'شناسه', key: 'id' },
        { header: 'تاریخ', key: 'date' },
        { header: 'مشتری', key: 'customer' },
        { header: 'نوع فروش', key: 'paymentType' },
        { header: 'شرح', key: 'description' },
        { header: 'مبلغ کل', key: 'total' },
      ],
      'Invoices',
    );
  };

  const doExportPdf = () => {
    exportToPdfTable({
      filename: `${exportFilenameBase}.pdf`,
      title: 'فاکتورهای فروش',
      head: ['شناسه', 'تاریخ', 'مشتری', 'نوع فروش', 'مبلغ کل'],
      body: exportRows.map((r) => [
        Number(r.id).toLocaleString('fa-IR'),
        r.date,
        r.customer,
        r.paymentType,
        formatCurrencyText(Number(r.total || 0), readStoredCurrencyUnit()),
      ]),
    });
  };

  const lastInvoiceHeader = lastBox ? (
    <div className="grid w-full gap-2 rounded-[22px] border border-slate-200 bg-white/80 p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/60 md:grid-cols-[1fr_auto] md:items-center">
      <div className="min-w-0 text-right">
        <div className="flex flex-wrap items-center justify-start gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-950"><i className="fa-solid fa-receipt" /></span>
          <span className="text-[13px] font-black text-slate-900 dark:text-slate-100">آخرین فاکتور{lastBox.id ? ` #${lastBox.id.toLocaleString("fa-IR")}` : ""}</span>
        </div>
        <div className="mt-2 line-clamp-2 text-[12px] leading-6 text-slate-500 dark:text-slate-400">{lastBox.lines.join(" • ")}</div>
      </div>
      {typeof lastBox.grandTotal === "number" ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-right dark:border-emerald-900/50 dark:bg-emerald-950/20">
          <div className="text-[10px] font-black text-emerald-600 dark:text-emerald-300">جمع کل</div>
          <div className="mt-1 text-[13px] font-black text-emerald-900 dark:text-emerald-100">{formatPrice(lastBox.grandTotal)}</div>
        </div>
      ) : null}
    </div>
  ) : null;

  return (
    <PageKit className="sales-invoices-foundation" title="فاکتورهای فروش" subtitle="مدیریت و جستجوی فاکتورهای فروش" icon={<i className="fa-solid fa-receipt" />} query={searchTerm} onQueryChange={(v) => setSearchTerm(v)} searchPlaceholder="جست‌وجو در شناسه/شرح/مشتری/تاریخ…" secondaryRow={lastInvoiceHeader}
      toolbarRight={
            <ExportMenu
              className="shrink-0"
              items={[
                { key: 'excel', label: 'Excel (XLSX)', icon: 'fa-file-excel', onClick: doExportExcel, disabled: filteredSales.length === 0 },
                { key: 'pdf', label: 'PDF (جدول)', icon: 'fa-file-pdf', onClick: doExportPdf, disabled: filteredSales.length === 0 },
                { key: 'print', label: 'چاپ لیست', icon: 'fa-print', onClick: () => printArea('#invoices-print-area', { title: 'فاکتورهای فروش' }), disabled: filteredSales.length === 0 },
              ]}
            />
          }>
      
      <Notification message={notification} onClose={() => setNotification(null)} />


      {/* بدنه صفحه */}
      <div className="app-card sales-invoices-card p-4 md:p-6" data-ui-sales-page="invoices">
        

        {/* کارت‌های آمار */}
        <div className="sales-invoice-stats grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4" data-ui-sales-metrics="invoices">
          <div className="rounded-lg bg-primary/5 p-3 text-sm border border-primary/10">
            <div className="text-muted">تعداد امروز</div>
            <div className="text-lg font-bold">{stats.today.toLocaleString("fa-IR")}</div>
          </div>
          <div className="rounded-lg bg-primary/5 p-3 text-sm border border-primary/10">
            <div className="text-muted">تعداد این هفته (۷ روز اخیر)</div>
            <div className="text-lg font-bold">{stats.week.toLocaleString("fa-IR")}</div>
          </div>
          <div className="rounded-lg bg-primary/5 p-3 text-sm border border-primary/10">
            <div className="text-muted">تعداد این ماه</div>
            <div className="text-lg font-bold">{stats.month.toLocaleString("fa-IR")}</div>
          </div>
        </div>

        {/* جدول */}
        {isLoading ? (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-black/10 dark:divide-white/10">
              <thead className="bg-black/[0.02] dark:bg-white/[0.03]">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-text">شناسه فروش</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-text">تاریخ</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-text">شرح</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-text">مشتری</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-text">نوع فروش</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-text">مبلغ کل</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-text">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10 dark:divide-white/10">
                {Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-20" rounded="lg" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-28" rounded="lg" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-56" rounded="lg" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-36" rounded="lg" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-7 w-24" rounded="full" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-32" rounded="lg" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-9 w-40" rounded="xl" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="هیچ فاکتوری پیدا نشد"
              description={searchTerm ? "عبارت جستجو را تغییر بده یا پاک کن." : "بعد از ثبت اولین فاکتور، این بخش به‌روزرسانی می‌شود."}
              actionLabel={searchTerm ? "پاک کردن جستجو" : undefined}
              onAction={searchTerm ? () => setSearchTerm('') : undefined}
              iconClass="fa-solid fa-receipt"
            />
          </div>
        ) : (
          <>
            {/* Desktop: Table */}
            <div className="sales-invoice-table hidden md:block overflow-x-auto rounded-xl border border-primary/10" data-ui-sales-table="invoices" id="invoices-print-area">
              <table className="min-w-full divide-y divide-primary/10">
                <thead className="bg-primary/5">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-semibold">شناسه فروش</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold">تاریخ</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold">شرح کالا/خدمت</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold">مشتری</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold">نوع فروش</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold">مبلغ کل</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold">عملیات</th>
                  </tr>
                </thead>
                <tbody className="bg-surface divide-y divide-primary/10">
                  {pageRows.map((sale) => {
                    const desc = descCache[sale.id] ? descCache[sale.id] : pickSaleDesc(sale);
                    const isDeleting = deletingId === sale.id;
                    const isCanceled = (sale as any).status === 'canceled';
                    const paymentMeta = paymentMethodMeta(sale);
                    return (
                      <tr key={sale.id} className="hover:bg-primary/5 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {sale.id.toLocaleString("fa-IR")}
                          {isCanceled && (
                            <span className="mr-2 inline-flex items-center rounded-full bg-rose-600/10 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:text-rose-300">
                              باطل
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {formatIsoToShamsi(sale.transactionDate)}
                        </td>
                        <td className="px-6 py-4 text-sm whitespace-normal break-words">
                          {desc}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {sale.customerFullName || (sale as any).customerName || (sale.customerId ? "مشتری ابطال شده" : "مهمان")}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-black ${paymentMeta.className}`}>{paymentMeta.label}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                          {sale.grandTotal != null ? formatCurrencyText(sale.grandTotal, readStoredCurrencyUnit()) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              to={`/invoices/${sale.id}`}
                              className="finance-table-action finance-table-action--view"
                            >
                              <i className="fa-solid fa-eye" />
                              مشاهده فاکتور
                            </Link>
                            <Link
                              to={`/invoices/${sale.id}?autoThermal=1`}
                              className="finance-table-action finance-table-action--payment"
                              title="چاپ رسید ۵۸ میلیمتری"
                            >
                              <i className="fa-solid fa-print" />
                              چاپ رسید
                            </Link>
                            <Button
                              disabled={isDeleting || isCanceled}
                              onClick={() => !isCanceled && cancelInvoice(sale)}
                              variant="danger"
                              size="xs"
                              className="finance-table-action finance-table-action--danger disabled:opacity-60"
                              title="ابطال فاکتور و کسر از فروش/سود"
                              leftIcon={<i className="fa-solid fa-ban" />}
                            >
                              {isCanceled ? "باطل شده" : (isDeleting ? "در حال ابطال…" : "ابطال")}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile: Cards */}
            <div className="sales-invoice-mobile-list md:hidden space-y-4" data-ui-sales-mobile-list="invoices">
              {pageRows.map((sale) => {
                const desc = descCache[sale.id] ? descCache[sale.id] : pickSaleDesc(sale);
                const isDeleting = deletingId === sale.id;
                const isCanceled = (sale as any).status === 'canceled';
                const paymentMeta = paymentMethodMeta(sale);
                return (
                  <div key={sale.id} className="sales-invoice-mobile-card bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-gray-100">
                          فاکتور #{sale.id.toLocaleString("fa-IR")}
                          {isCanceled && (
                            <span className="inline-flex items-center rounded-full bg-rose-600/10 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:text-rose-300">
                              باطل
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {formatIsoToShamsi(sale.transactionDate)} • {sale.customerFullName || (sale as any).customerName || "مهمان"}
                        </div>
                        <span className={`mt-2 inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-[11px] font-black ${paymentMeta.className}`}>{paymentMeta.label}</span>
                      </div>
                      <div className="text-sm font-black text-primary">
                        {sale.grandTotal != null ? `${sale.grandTotal.toLocaleString("fa-IR")} ت` : "-"}
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 bg-gray-50 dark:bg-gray-900/50 p-2 rounded-lg">
                      {desc}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <Link
                        to={`/invoices/${sale.id}`}
                        className="finance-table-action finance-table-action--view"
                      >
                        <i className="fa-solid fa-eye" />
                        مشاهده
                      </Link>
                      <Link
                        to={`/invoices/${sale.id}?autoThermal=1`}
                        className="finance-table-action finance-table-action--payment"
                      >
                        <i className="fa-solid fa-print" />
                        چاپ
                      </Link>
                      {!isCanceled && (
                        <Button
                          disabled={isDeleting}
                          onClick={() => cancelInvoice(sale)}
                          variant="danger"
                          size="xs"
                          className="finance-table-action finance-table-action--danger disabled:opacity-60"
                          leftIcon={<i className="fa-solid fa-ban" />}
                        >
                          {isDeleting ? "..." : "ابطال"}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* صفحه‌بندی */}
      <div className="flex items-center justify-between p-4 border-t border-primary/10 text-sm">
        <div className="flex items-center gap-2">
          <Button type="button" onClick={() => setPageIndex(0)} disabled={pageIndex === 0} variant="secondary" size="xs" leftIcon={<i className="fa-solid fa-angles-right" />}>اول</Button>
          <Button type="button" onClick={() => setPageIndex((p) => Math.max(0, p - 1))} disabled={pageIndex === 0} variant="secondary" size="xs" leftIcon={<i className="fa-solid fa-chevron-right" />}>قبل</Button>
          <Button type="button" onClick={() => setPageIndex((p) => Math.min(pageCount - 1, p + 1))} disabled={pageIndex >= pageCount - 1} variant="secondary" size="xs" leftIcon={<i className="fa-solid fa-chevron-left" />}>بعد</Button>
          <Button type="button" onClick={() => setPageIndex(pageCount - 1)} disabled={pageIndex >= pageCount - 1} variant="secondary" size="xs" leftIcon={<i className="fa-solid fa-angles-left" />}>آخر</Button>
        </div>
        <div className="flex items-center gap-2">
          <span>صفحه</span>
          <strong>{pageIndex + 1} از {pageCount}</strong>
        </div>
        <select
          value={pageSize}
          onChange={(e) => { setPageSize(Number(e.target.value)); setPageIndex(0); }}
          className="p-1 rounded border border-primary/20 bg-white dark:bg-black/30"
        >
          <option value="10">نمایش 10</option>
          <option value="20">نمایش 20</option>
          <option value="50">نمایش 50</option>
        </select>
      </div>
  </PageKit>
  );
};

export default InvoicesPage;
