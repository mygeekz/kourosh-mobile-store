import React from "react";
import { MiniAppDataState } from "../components/MiniAppDataState";
import { formatCustomerDate, formatToman } from "../format";
import { useMiniAppPagination } from "../hooks/useMiniAppPagination";
import type { PartnerLedgerData } from "../types";

export const PartnerLedger: React.FC = () => {
  const query = useMiniAppPagination<PartnerLedgerData["items"][number], PartnerLedgerData>(
    "/api/miniapp/partner/ledger",
    React.useCallback((entry) => entry.id, []),
  );
  if (!query.data) return <MiniAppDataState loading={query.loading} error={query.error} retry={query.retry} />;
  return (
    <section aria-labelledby="partner-ledger-title">
      <h1 id="partner-ledger-title" className="m-0 text-2xl font-black">گردش حساب من</h1>
      <p className="mb-4 mt-1 text-sm leading-7 text-mutedText">نمایش {query.data.items.length.toLocaleString("fa-IR")} رکورد از {query.data.total.toLocaleString("fa-IR")}</p>
      <MiniAppDataState empty={!query.data.items.length} emptyText="گردش حسابی ثبت نشده است." />
      <ul className="m-0 list-none divide-y divide-border p-0">
        {query.data.items.map((entry) => {
          const isDebit = entry.debit > 0;
          const value = isDebit ? entry.debit : entry.credit;
          return <li key={entry.id} className="flex items-start justify-between gap-4 py-4"><div className="min-w-0"><strong className="block text-sm leading-6">{entry.description}</strong><span className="mt-1 block text-xs text-mutedText">{formatCustomerDate(entry.transactionDate)} · {isDebit ? "بدهکار" : "بستانکار"}</span><span className="mt-1 block text-[11px] text-mutedText">مانده {formatToman(Math.abs(entry.balance))}</span></div><strong className={`shrink-0 text-sm tabular-nums ${isDebit ? "text-danger" : "text-success"}`}>{formatToman(value)}</strong></li>;
        })}
      </ul>
      {query.hasMore ? <button type="button" disabled={query.loadingMore} onClick={query.loadMore} className="mt-4 min-h-11 w-full rounded-[var(--radius-md)] border border-primary px-4 text-sm font-extrabold text-primary disabled:opacity-60">{query.loadingMore ? "در حال دریافت…" : "نمایش موارد بیشتر"}</button> : null}
    </section>
  );
};
