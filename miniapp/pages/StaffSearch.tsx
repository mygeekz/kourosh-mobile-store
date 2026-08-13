import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchMiniAppData, MiniAppApiError } from "../apiClient";
import { MiniAppDataState } from "../components/MiniAppDataState";
import { formatCustomerDate, formatToman } from "../format";
import type { StaffSearchData } from "../types";

export const StaffSearch: React.FC = () => {
  const [input, setInput] = useState("");
  const [state, setState] = useState<{ data: StaffSearchData | null; loading: boolean; error: string | null }>({ data: null, loading: false, error: null });
  const query = input.trim();
  useEffect(() => {
    if (!query) { setState({ data: null, loading: false, error: null }); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setState((old) => ({ ...old, loading: true, error: null }));
      void fetchMiniAppData<StaffSearchData>(`/api/miniapp/staff/search?q=${encodeURIComponent(query)}&limit=20`, controller.signal)
        .then((data) => setState({ data, loading: false, error: null }))
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          setState({ data: null, loading: false, error: error instanceof MiniAppApiError ? error.message : "جستجو انجام نشد." });
        });
    }, 300);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query]);
  const total = useMemo(() => state.data ? Object.values(state.data.groups).reduce((sum, rows) => sum + rows.length, 0) : 0, [state.data]);
  return (
    <div>
      <header className="mb-4"><h1 className="m-0 text-xl font-black">جستجوی مدیریتی</h1><p className="mb-0 mt-1 text-xs leading-6 text-mutedText">مشتری، موبایل، IMEI، فاکتور یا قرارداد اقساطی</p></header>
      <label className="block"><span className="sr-only">عبارت جستجو</span><input autoFocus value={input} onChange={(event) => setInput(event.target.value.slice(0, 80))} placeholder="نام، شماره موبایل، IMEI یا شناسه…" className="h-12 w-full rounded-[var(--radius-md)] border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-primary" /></label>
      {!query ? <MiniAppDataState empty emptyText="برای جستجو، حداقل یک عبارت وارد کنید." /> : null}
      {state.loading ? <MiniAppDataState loading /> : null}
      {state.error ? <MiniAppDataState error={state.error} /> : null}
      {state.data && !state.loading && total === 0 ? <MiniAppDataState empty emptyText="نتیجه‌ای پیدا نشد." /> : null}
      {state.data && !state.loading ? <div className="mt-5 space-y-6">
        {state.data.groups.customers.length ? <section><h2 className="m-0 border-b border-border pb-2 text-sm font-black">مشتریان</h2><ul className="m-0 list-none divide-y divide-border p-0">{state.data.groups.customers.map((item) => <li key={item.customerId}><Link to={`/customers/${item.customerId}`} className="flex min-h-16 items-center justify-between gap-3 py-3 text-foreground no-underline"><span className="min-w-0"><strong className="block truncate text-sm">{item.fullName}</strong><small className="mt-1 block text-mutedText">{item.phoneNumber || `شناسه ${item.customerId}`}</small></span><span className={`shrink-0 text-left text-xs font-bold ${item.accountState === "debtor" ? "text-danger" : item.accountState === "creditor" ? "text-success" : "text-mutedText"}`}>{item.accountStateLabel}<small className="block font-medium">{formatToman(Math.abs(item.balance))}</small></span></Link></li>)}</ul></section> : null}
        {state.data.groups.phones.length ? <section><h2 className="m-0 border-b border-border pb-2 text-sm font-black">گوشی‌ها</h2><ul className="m-0 list-none divide-y divide-border p-0">{state.data.groups.phones.map((item) => <li key={item.id}><Link to={`/phones/${item.id}`} className="block py-3 text-foreground no-underline"><strong className="block text-sm">{item.model}</strong><span className="mt-1 block break-all text-xs text-mutedText">IMEI: {item.imei} · {item.status}</span></Link></li>)}</ul></section> : null}
        {state.data.groups.invoices.length ? <section><h2 className="m-0 border-b border-border pb-2 text-sm font-black">فاکتورها</h2><ul className="m-0 list-none divide-y divide-border p-0">{state.data.groups.invoices.map((item) => <li key={item.invoiceRef}><Link to={`/invoices/${item.invoiceRef}`} className="flex items-start justify-between gap-3 py-3 text-foreground no-underline"><span className="min-w-0"><strong className="block truncate text-sm">{item.customer}</strong><small className="mt-1 block truncate text-mutedText">{item.invoiceRef} · {formatCustomerDate(item.date)}</small></span><strong className="shrink-0 text-xs tabular-nums">{formatToman(item.total)}</strong></Link></li>)}</ul></section> : null}
        {state.data.groups.installments.length ? <section><h2 className="m-0 border-b border-border pb-2 text-sm font-black">اقساط</h2><ul className="m-0 list-none divide-y divide-border p-0">{state.data.groups.installments.map((item) => <li key={item.saleId}><Link to={`/installments/${item.saleId}`} className="flex items-start justify-between gap-3 py-3 text-foreground no-underline"><span className="min-w-0"><strong className="block truncate text-sm">{item.customerName}</strong><small className="mt-1 block truncate text-mutedText">قرارداد {item.saleId} · {item.itemSummary}</small></span><strong className="shrink-0 text-xs tabular-nums">{formatToman(item.actualSalePrice)}</strong></Link></li>)}</ul></section> : null}
      </div> : null}
    </div>
  );
};
