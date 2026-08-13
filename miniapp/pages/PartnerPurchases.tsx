import React from "react";
import { Link } from "react-router-dom";
import { MiniAppDataState } from "../components/MiniAppDataState";
import { formatCustomerDate, formatToman } from "../format";
import { useMiniAppPagination } from "../hooks/useMiniAppPagination";
import type { PartnerPurchasesData } from "../types";

export const PartnerPurchases: React.FC = () => {
  const query = useMiniAppPagination<PartnerPurchasesData["items"][number], PartnerPurchasesData>(
    "/api/miniapp/partner/purchases",
    React.useCallback((item) => item.ref, []),
  );
  if (!query.data) return <MiniAppDataState loading={query.loading} error={query.error} retry={query.retry} />;
  return (
    <section aria-labelledby="partner-purchases-title">
      <div className="flex items-end justify-between gap-3"><div><h1 id="partner-purchases-title" className="m-0 text-2xl font-black">کالاهای من</h1><p className="mb-4 mt-1 text-sm leading-7 text-mutedText">اقلامی که از شما وارد سیستم شده‌اند</p></div><Link to="/phones" className="mb-4 shrink-0 text-xs font-bold text-primary no-underline">تسویه گوشی‌ها</Link></div>
      <MiniAppDataState empty={!query.data.items.length} emptyText="کالایی برای این حساب ثبت نشده است." />
      <ul className="m-0 list-none divide-y divide-border p-0">{query.data.items.map((item) => <li key={item.ref} className="py-4"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><strong className="block text-sm leading-6">{item.name}</strong><span className="mt-1 block text-xs text-mutedText">{item.type === "phone" ? item.identifier || "شناسه ثبت نشده" : `${item.quantity.toLocaleString("fa-IR")} ${item.unit}`} · {formatCustomerDate(item.purchaseDate)}</span>{item.status ? <span className="mt-1 block text-[11px] text-mutedText">{item.status}</span> : null}</div><strong className="shrink-0 text-sm tabular-nums">{formatToman(item.supplyAmount)}</strong></div>{item.settlement ? <div className="mt-2 flex items-center justify-between text-xs"><span className={item.settlement.code === "open" ? "font-bold text-warning" : "font-bold text-success"}>{item.settlement.label}</span><span className="text-mutedText">مانده {formatToman(item.settlement.remainingAmount)}</span></div> : null}</li>)}</ul>
      <p className="mt-4 text-center text-xs text-mutedText">نمایش {query.data.items.length.toLocaleString("fa-IR")} از {query.data.total.toLocaleString("fa-IR")}</p>
      {query.hasMore ? <button type="button" disabled={query.loadingMore} onClick={query.loadMore} className="mt-2 min-h-11 w-full rounded-[var(--radius-md)] border border-primary px-4 text-sm font-extrabold text-primary disabled:opacity-60">{query.loadingMore ? "در حال دریافت…" : "نمایش موارد بیشتر"}</button> : null}
    </section>
  );
};
