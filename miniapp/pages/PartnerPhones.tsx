import React from "react";
import { MiniAppDataState } from "../components/MiniAppDataState";
import { formatCustomerDate, formatToman } from "../format";
import { useMiniAppPagination } from "../hooks/useMiniAppPagination";
import type { PartnerPhoneData } from "../types";

export const PartnerPhones: React.FC = () => {
  const query = useMiniAppPagination<PartnerPhoneData["items"][number], PartnerPhoneData>(
    "/api/miniapp/partner/phones",
    React.useCallback((phone) => phone.ref, []),
  );
  if (!query.data) return <MiniAppDataState loading={query.loading} error={query.error} retry={query.retry} />;
  const data = query.data;
  return (
    <section aria-labelledby="partner-phones-title">
      <h1 id="partner-phones-title" className="m-0 text-2xl font-black">تسویه گوشی‌ها</h1>
      <p className="mb-4 mt-1 text-sm leading-7 text-mutedText">مبالغ مرتبط با خود شما و وضعیت تسویه ثبت‌شده</p>
      <dl className="mb-4 grid grid-cols-2 gap-x-4 rounded-[var(--radius-lg)] border border-border bg-card p-4 text-xs"><div><dt className="text-mutedText">پرداخت‌شده</dt><dd className="m-0 mt-1 font-black tabular-nums text-success">{formatToman(data.summary.paidAmount)}</dd></div><div><dt className="text-mutedText">مانده</dt><dd className="m-0 mt-1 font-black tabular-nums">{formatToman(data.summary.remainingAmount)}</dd></div></dl>
      <MiniAppDataState empty={!data.items.length} emptyText="گوشی فروخته‌شده‌ای برای تسویه وجود ندارد." />
      <ul className="m-0 list-none divide-y divide-border p-0">{data.items.map((phone) => <li key={phone.ref} className="py-4"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><strong className="block text-sm leading-6">{phone.name}</strong><span className="mt-1 block text-xs text-mutedText">IMEI: {phone.identifier || "ثبت نشده"}</span><span className="mt-1 block text-[11px] text-mutedText">{formatCustomerDate(phone.purchaseDate)} · {phone.status || "وضعیت ثبت نشده"}</span></div><span className={`shrink-0 text-xs font-bold ${phone.settlement.code === "open" ? "text-warning" : "text-success"}`}>{phone.settlement.label}</span></div><dl className="mt-3 grid grid-cols-3 gap-2 text-[11px]"><div><dt className="text-mutedText">مبلغ</dt><dd className="m-0 mt-1 font-bold tabular-nums">{formatToman(phone.settlement.amount)}</dd></div><div><dt className="text-mutedText">پرداخت</dt><dd className="m-0 mt-1 font-bold tabular-nums">{formatToman(phone.settlement.paidAmount)}</dd></div><div><dt className="text-mutedText">مانده</dt><dd className="m-0 mt-1 font-bold tabular-nums">{formatToman(phone.settlement.remainingAmount)}</dd></div></dl></li>)}</ul>
      <p className="mt-4 text-center text-xs text-mutedText">نمایش {data.items.length.toLocaleString("fa-IR")} از {data.total.toLocaleString("fa-IR")}</p>
      {query.hasMore ? <button type="button" disabled={query.loadingMore} onClick={query.loadMore} className="mt-2 min-h-11 w-full rounded-[var(--radius-md)] border border-primary px-4 text-sm font-extrabold text-primary disabled:opacity-60">{query.loadingMore ? "در حال دریافت…" : "نمایش موارد بیشتر"}</button> : null}
    </section>
  );
};
