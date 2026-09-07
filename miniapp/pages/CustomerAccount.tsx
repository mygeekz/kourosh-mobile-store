import React from "react";
import { MiniAppDataState } from "../components/MiniAppDataState";
import { formatCustomerDate, formatToman } from "../format";
import { useMiniAppQuery } from "../hooks/useMiniAppQuery";
import type { CustomerAccountData } from "../types";

const accountTone = (code: CustomerAccountData["account"]["code"]) =>
  code === "debtor" ? "text-danger" : code === "creditor" ? "text-success" : "text-secondaryText";

export const CustomerAccount: React.FC = () => {
  const query = useMiniAppQuery<CustomerAccountData>("/api/miniapp/customer/account");
  if (!query.data) return <MiniAppDataState loading={query.loading} error={query.error} retry={query.retry} />;
  const data = query.data;
  return (
    <section aria-labelledby="account-title">
      <h1 id="account-title" className="m-0 text-2xl font-black">حساب من</h1>
      <p className="mb-4 mt-1 text-sm leading-7 text-mutedText">مانده و آخرین گردش‌های ثبت‌شده</p>
      <section className="rounded-[var(--radius-lg)] border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-4"><span className="text-xs text-mutedText">وضعیت حساب</span><strong className={`text-sm ${accountTone(data.account.code)}`}>{data.account.label}</strong></div>
        <p className="mb-0 mt-2 text-2xl font-black tabular-nums">{formatToman(data.account.amount)}</p>
      </section>
      <dl className="my-4 grid grid-cols-2 gap-3 text-xs"><div className="border-b border-border py-3"><dt className="text-mutedText">جمع بدهکار</dt><dd className="m-0 mt-1 font-extrabold tabular-nums">{formatToman(data.totalDebit)}</dd></div><div className="border-b border-border py-3"><dt className="text-mutedText">جمع بستانکار</dt><dd className="m-0 mt-1 font-extrabold tabular-nums">{formatToman(data.totalCredit)}</dd></div></dl>
      <h2 className="m-0 border-b border-border pb-3 text-base font-black">گردش‌های اخیر</h2>
      <MiniAppDataState empty={!data.entries.length} emptyText="گردش حسابی ثبت نشده است." />
      <ul className="m-0 list-none divide-y divide-border p-0">
        {data.entries.map((entry) => {
          const value = entry.debit > 0 ? entry.debit : entry.credit;
          const label = entry.debit > 0 ? "بدهکار" : "بستانکار";
          return <li key={entry.id} className="flex items-start justify-between gap-4 py-4"><div className="min-w-0"><strong className="block text-sm leading-6">{entry.description}</strong><span className="mt-1 block text-xs text-mutedText">{formatCustomerDate(entry.transactionDate)} · {label}</span></div><strong className={`shrink-0 text-sm tabular-nums ${entry.debit > 0 ? "text-danger" : "text-success"}`}>{formatToman(value)}</strong></li>;
        })}
      </ul>
    </section>
  );
};
