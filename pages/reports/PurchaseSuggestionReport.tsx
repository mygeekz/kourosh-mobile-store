// pages/reports/PurchaseSuggestionReport.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { PurchaseSuggestionItem, NotificationMessage } from "../../types";
import Notification from "../../components/Notification";
import DialogShell from "../../components/ui/DialogShell";
import { useAuth } from "../../contexts/AuthContext";
import { apiFetch } from "../../utils/apiFetch";

const columnHelper = createColumnHelper<PurchaseSuggestionItem>();
const fmt = (num: number, digits = 0) =>
  (Number.isFinite(Number(num)) ? Number(num) : 0).toLocaleString("fa-IR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

const classifyDays = (days: number) => {
  if (days <= 7)
    return { label: `${fmt(days)} روز`, tone: "danger", dot: "rose" };
  if (days <= 14)
    return { label: `${fmt(days)} روز`, tone: "warning", dot: "orange" };
  return { label: `${fmt(days)} روز`, tone: "safe", dot: "emerald" };
};

const getProductIcon = (item: PurchaseSuggestionItem) => {
  if (item.itemType === "phone") return "fa-mobile-screen-button";
  const name = String(item.itemName || "");
  if (
    /کابل|شارژر|هندزفری|هدفون|هدفون|speaker|اسپیکر|لنز|glass|شیشه/i.test(name)
  )
    return "fa-plug-circle-bolt";
  return "fa-cube";
};

function downloadCsv(filename: string, rows: Record<string, any>[]) {
  const headers = Object.keys(rows[0] || {});
  const escape = (s: any) => `"${String(s ?? "").replace(/"/g, '""')}"`;
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

type Urgency = "all" | "urgent" | "soon";

const PurchaseSuggestionReport: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState<PurchaseSuggestionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<NotificationMessage | null>(
    null,
  );
  const [selectedSuggestion, setSelectedSuggestion] =
    useState<PurchaseSuggestionItem | null>(null);

  const [search, setSearch] = useState("");
  const [urgency, setUrgency] = useState<Urgency>("all");

  useEffect(() => {
    if (currentUser && currentUser.roleName === "Salesperson") {
      setNotification({
        type: "error",
        text: "شما اجازه دسترسی به این صفحه را ندارید.",
      });
      navigate("/reports/analysis");
      return;
    }

    const fetchReport = async () => {
      setIsLoading(true);
      try {
        const res = await apiFetch("/api/analysis/purchase-suggestions");
        const json = await res.json();
        if (!res.ok || !json.success)
          throw new Error(json.message || "خطا در دریافت پیشنهادهای خرید");
        setData(json.data || []);
      } catch (e: any) {
        setNotification({
          type: "error",
          text: e.message || "خطا در عملیاتی نامشخص",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchReport();
  }, [currentUser, navigate]);

  const filteredData = useMemo(() => {
    if (urgency === "all") return data;
    if (urgency === "urgent")
      return data.filter((x) => (x.daysOfStockLeft ?? 9999) <= 7);
    return data.filter(
      (x) =>
        (x.daysOfStockLeft ?? 9999) > 7 && (x.daysOfStockLeft ?? 9999) <= 14,
    );
  }, [data, urgency]);

  const totals = useMemo(() => {
    const urgent = data.filter((x) => (x.daysOfStockLeft ?? 9999) <= 7).length;
    const soon = data.filter(
      (x) =>
        (x.daysOfStockLeft ?? 9999) > 7 && (x.daysOfStockLeft ?? 9999) <= 14,
    ).length;
    const actionable = data.filter(
      (x) => (x.suggestedPurchaseQuantity ?? 0) > 0,
    ).length;
    const sumSuggested = data.reduce(
      (s, x) => s + (x.suggestedPurchaseQuantity ?? 0),
      0,
    );
    const avgDays = data.length
      ? data.reduce((s, x) => s + (x.daysOfStockLeft ?? 0), 0) / data.length
      : 0;
    const avgSpeed = data.length
      ? data.reduce((s, x) => s + (x.salesPerDay ?? 0), 0) / data.length
      : 0;
    return {
      urgent,
      soon,
      actionable,
      sumSuggested,
      avgDays,
      avgSpeed,
      count: data.length,
    };
  }, [data]);

  const columns = useMemo(
    () => [
      columnHelper.accessor("itemName", {
        header: "کالا / محصول",
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="purchase210-product-cell">
              <span className="purchase210-product-icon">
                <i className={`fa-solid ${getProductIcon(row)}`} />
              </span>
              <div className="min-w-0">
                <span className="purchase210-product-name">
                  {info.getValue()}
                </span>
                <span className="purchase210-product-type">
                  {row.itemType === "phone" ? "گوشی" : "کالا و لوازم"}
                </span>
              </div>
            </div>
          );
        },
      }),
      columnHelper.accessor("currentStock", {
        header: "موجودی",
        cell: (info) => (
          <span className="purchase210-stock-value">
            <i className="fa-solid fa-circle" />
            {fmt(info.getValue(), 0)}
          </span>
        ),
      }),
      columnHelper.accessor("salesPerDay", {
        header: "سرعت فروش روزانه",
        cell: (info) => (
          <span className="purchase210-muted-number">
            {fmt(info.getValue(), 2)}
          </span>
        ),
      }),
      columnHelper.accessor("daysOfStockLeft", {
        header: "روز باقی‌مانده",
        cell: (info) => {
          const v = Number(info.getValue() ?? 0);
          const meta = classifyDays(v);
          return (
            <span
              className={`purchase210-days-badge purchase210-days-badge--${meta.tone}`}
            >
              {meta.label}
            </span>
          );
        },
      }),
      columnHelper.accessor("suggestedPurchaseQuantity", {
        header: "تعداد پیشنهادی خرید",
        cell: (info) => (
          <span className="purchase210-suggested-qty">
            {fmt(info.getValue(), 0)}
          </span>
        ),
      }),
      columnHelper.display({
        id: "why",
        header: "تحلیل",
        cell: (info) => (
          <button
            type="button"
            onClick={() => setSelectedSuggestion(info.row.original)}
            className="purchase210-analyze-btn"
          >
            تحلیل
          </button>
        ),
      }),
    ],
    [],
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { globalFilter: search },
    onGlobalFilterChange: setSearch,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      const q = String(filterValue ?? "").trim();
      if (!q) return true;
      return String(row.original.itemName ?? "").includes(q);
    },
  });

  const handleExport = () => {
    const out = table.getFilteredRowModel().rows.map((r) => r.original);
    if (!out.length) return;
    downloadCsv(
      "purchase_suggestions.csv",
      out.map((x) => ({
        itemName: x.itemName,
        currentStock: x.currentStock,
        salesPerDay: x.salesPerDay,
        daysOfStockLeft: x.daysOfStockLeft,
        suggestedPurchaseQuantity: x.suggestedPurchaseQuantity,
        itemType: x.itemType,
      })),
    );
  };

  const handlePrint = () => window.print();

  const Chip = ({
    k,
    label,
    tone,
    count,
  }: {
    k: Urgency;
    label: string;
    tone: "all" | "urgent" | "soon";
    count: number;
  }) => (
    <button
      type="button"
      onClick={() => setUrgency(k)}
      className={`purchase210-filter-chip purchase210-filter-chip--${tone} ${urgency === k ? "is-active" : ""}`}
    >
      <span>{label}</span>
      <b>{fmt(count)}</b>
    </button>
  );

  if (currentUser && currentUser.roleName === "Salesperson") return null;

  return (
    <div className="report-page purchase210-page" dir="rtl">
      <Notification
        message={notification}
        onClose={() => setNotification(null)}
      />

      <section className="purchase210-hero">
        <div className="purchase210-hero__topline">
          <button
            type="button"
            onClick={() => navigate("/reports/analysis")}
            className="purchase210-back-btn"
          >
            <i className="fa-solid fa-arrow-right" />
            بازگشت
          </button>
          <div className="purchase210-breadcrumb">
            مرکز گزارش‌ها <i className="fa-solid fa-chevron-left" /> پیشنهادهای
            هوشمند خرید
          </div>
        </div>

        <div className="purchase210-hero__content">
          <div className="purchase210-hero-icon">
            <i className="fa-solid fa-cart-plus" />
          </div>
          <div>
            <span className="purchase210-eyebrow">گزارش تحلیلی</span>
            <h1>پیشنهادهای هوشمند خرید</h1>
            <p>
              اولویت‌بندی کالاها بر اساس سرعت فروش، موجودی فعلی و روزهای
              باقی‌مانده تا اتمام.
            </p>
          </div>
        </div>

        <div className="purchase210-status-strip">
          <span>
            <i className="fa-solid fa-circle text-emerald-500" />{" "}
            {fmt(totals.actionable)} مورد قابل اقدام
          </span>
          <span>
            <i className="fa-solid fa-circle text-orange-500" />{" "}
            {fmt(totals.soon)} مورد به‌زودی
          </span>
          <span>
            <i className="fa-solid fa-circle text-rose-500" />{" "}
            {fmt(totals.urgent)} مورد نیاز فوری
          </span>
        </div>
      </section>

      <section className="purchase210-kpi-grid">
        <article className="purchase210-kpi-card">
          <span className="purchase210-kpi-icon purchase210-kpi-icon--blue">
            <i className="fa-solid fa-list-check" />
          </span>
          <div>
            <small>تعداد آیتم</small>
            <strong>{fmt(totals.count)}</strong>
            <em>کل کالاهای دارای پیشنهاد</em>
          </div>
        </article>
        <article className="purchase210-kpi-card">
          <span className="purchase210-kpi-icon purchase210-kpi-icon--rose">
            <i className="fa-solid fa-triangle-exclamation" />
          </span>
          <div>
            <small>فوری (≤ ۷ روز)</small>
            <strong>{fmt(totals.urgent)}</strong>
            <em>اولویت خرید فوری</em>
          </div>
        </article>
        <article className="purchase210-kpi-card">
          <span className="purchase210-kpi-icon purchase210-kpi-icon--orange">
            <i className="fa-solid fa-clock" />
          </span>
          <div>
            <small>به‌زودی (۸ تا ۱۴ روز)</small>
            <strong>{fmt(totals.soon)}</strong>
            <em>نیازمند پایش خرید</em>
          </div>
        </article>
        <article className="purchase210-kpi-card">
          <span className="purchase210-kpi-icon purchase210-kpi-icon--violet">
            <i className="fa-solid fa-cart-shopping" />
          </span>
          <div>
            <small>جمع خرید پیشنهادی</small>
            <strong>{fmt(totals.sumSuggested)}</strong>
            <em>میانگین روز باقی‌مانده: {fmt(totals.avgDays, 1)}</em>
          </div>
        </article>
      </section>

      <section className="purchase210-toolbar">
        <label
          className="purchase219-search"
          role="search"
          aria-label="جستجو در پیشنهادهای خرید"
        >
          <input
            className="purchase219-search__input"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو در نام محصول..."
            aria-label="جستجو در نام محصول"
          />
          <span className="purchase219-search__icon" aria-hidden="true">
            <i className="fa-solid fa-magnifying-glass" />
          </span>
        </label>
        <div className="purchase210-chip-group">
          <Chip k="all" label="همه" tone="all" count={totals.count} />
          <Chip k="urgent" label="فوری" tone="urgent" count={totals.urgent} />
          <Chip k="soon" label="به‌زودی" tone="soon" count={totals.soon} />
        </div>
        <div className="purchase210-toolbar-actions">
          <button type="button" onClick={handleExport}>
            <i className="fa-solid fa-file-export" /> خروجی
          </button>
          <button type="button" onClick={handlePrint}>
            <i className="fa-solid fa-print" /> چاپ
          </button>
        </div>
      </section>

      <section className="purchase210-table-card">
        <div className="purchase210-table-headline">
          <div>
            <h2>لیست پیشنهادهای خرید</h2>
            <p>
              {fmt(table.getFilteredRowModel().rows.length)} ردیف از داده واقعی
              API
            </p>
          </div>
          <span>مرتب‌سازی: سرعت فروش و روز باقی‌مانده</span>
        </div>

        {isLoading ? (
          <div className="purchase210-state">در حال دریافت اطلاعات…</div>
        ) : filteredData.length === 0 ? (
          <div className="purchase210-state">
            موردی برای نمایش وجود ندارد. ممکن است موجودی‌ها کامل باشند یا داده
            کافی وجود نداشته باشد.
          </div>
        ) : (
          <div className="purchase210-table-wrap">
            <table className="purchase210-table">
              <thead>
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id}>
                    {hg.headers.map((h) => (
                      <th key={h.id}>
                        {flexRender(h.column.columnDef.header, h.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filteredData.length > 0 ? (
          <div className="purchase210-pagination">
            <span>
              صفحه{" "}
              {(table.getState().pagination.pageIndex + 1).toLocaleString(
                "fa-IR",
              )}{" "}
              از {Math.max(1, table.getPageCount()).toLocaleString("fa-IR")}
            </span>
            <div>
              <button
                type="button"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <i className="fa-solid fa-chevron-right" />
              </button>
              <button
                type="button"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <i className="fa-solid fa-chevron-left" />
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="purchase210-note">
        <i className="fa-solid fa-circle-info" />
        <span>
          توصیه: کالاهایی با سرعت فروش بالا و موجودی پایین، در اولویت خرید قرار
          دارند. هیچ عدد نمایشی در این صفحه mock نیست و همه مقادیر از API
          پیشنهادهای خرید خوانده می‌شود.
        </span>
      </section>

      <DialogShell
        isOpen={Boolean(selectedSuggestion)}
        onClose={() => setSelectedSuggestion(null)}
        ariaLabel="تحلیل پیشنهاد خرید"
        overlayClassName="purchase210-drawer-overlay purchase210-drawer-overlay--dialog-shell app-modal-backdrop !items-stretch !justify-end !p-0"
        panelClassName="purchase210-drawer purchase210-drawer--dialog-shell"
        closeOnBackdrop
      >
        {selectedSuggestion ? (
          <>
            <header>
              <span>تحلیل پیشنهاد خرید</span>
              <h3>{selectedSuggestion.itemName}</h3>
              <p>
                منطق پیشنهاد بر اساس موجودی فعلی، سرعت فروش روزانه و روزهای
                باقی‌مانده محاسبه شده است.
              </p>
            </header>

            <main>
              <div className="purchase210-drawer-grid">
                {[
                  {
                    label: "موجودی فعلی",
                    value: fmt(selectedSuggestion.currentStock),
                    icon: "fa-boxes-stacked",
                  },
                  {
                    label: "سرعت فروش روزانه",
                    value: fmt(selectedSuggestion.salesPerDay, 2),
                    icon: "fa-chart-line",
                  },
                  {
                    label: "روز باقی‌مانده",
                    value: fmt(selectedSuggestion.daysOfStockLeft),
                    icon: "fa-hourglass-half",
                  },
                  {
                    label: "تعداد پیشنهادی خرید",
                    value: fmt(selectedSuggestion.suggestedPurchaseQuantity),
                    icon: "fa-cart-plus",
                  },
                ].map((item) => (
                  <div key={item.label}>
                    <i className={`fa-solid ${item.icon}`} />
                    <small>{item.label}</small>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>

              <div className="purchase210-drawer-result">
                <i className="fa-solid fa-wand-magic-sparkles" />
                <div>
                  <strong>نتیجه تحلیل</strong>
                  <p>
                    هرچه روزهای باقی‌مانده کمتر و سرعت فروش بالاتر باشد، اولویت
                    خرید بیشتر می‌شود. تعداد پیشنهادی برای کاهش ریسک اتمام
                    موجودی محاسبه شده است.
                  </p>
                </div>
              </div>
            </main>
          </>
        ) : null}
      </DialogShell>
    </div>
  );
};

export default PurchaseSuggestionReport;
