import React from "react";
import { Link } from "react-router-dom";
import { MiniAppDataState } from "../components/MiniAppDataState";
import { formatCustomerDate, formatToman } from "../format";
import { useMiniAppQuery } from "../hooks/useMiniAppQuery";
import type { PartnerHomeData } from "../types";

const accountTone = (code: PartnerHomeData["account"]["code"]) =>
  code === "debtor" ? "text-danger" : code === "creditor" ? "text-success" : "text-secondaryText";

export const PartnerHome: React.FC = () => {
  const query = useMiniAppQuery<PartnerHomeData>("/api/miniapp/partner/home");
  if (!query.data) return <MiniAppDataState loading={query.loading} error={query.error} retry={query.retry} />;
  const data = query.data;
  return (
    <section aria-labelledby="partner-home-title">
      <p className="m-0 text-xs font-extrabold text-primary">حساب همکار</p>
      <h1 id="partner-home-title" className="mb-1 mt-1 text-2xl font-black leading-10">سلام {data.partner.name}</h1>
      <p className="m-0 text-sm leading-7 text-mutedText">خلاصه‌ی واقعی همکاری شما با کوروش</p>

      <section className="mt-5 rounded-[var(--radius-lg)] border border-border bg-card p-4" aria-label="مانده حساب همکار">
        <div className="flex items-center justify-between gap-4"><span className="text-xs text-mutedText">وضعیت حساب</span><strong className={`text-xs ${accountTone(data.account.code)}`}>{data.account.label}</strong></div>
        <p className="mb-0 mt-2 break-words text-2xl font-black tabular-nums">{formatToman(data.account.amount)}</p>
      </section>

      <section className="mt-6" aria-labelledby="partner-ledger-summary">
        <div className="flex items-center justify-between gap-3 border-b border-border pb-3"><h2 id="partner-ledger-summary" className="m-0 text-base font-black">گردش حساب</h2><Link to="/ledger" className="text-xs font-bold text-primary no-underline">مشاهده همه</Link></div>
        <dl className="m-0 divide-y divide-border text-xs">
          <div className="flex min-h-12 items-center justify-between gap-4"><dt className="text-mutedText">تعداد رکوردها</dt><dd className="m-0 font-extrabold">{data.ledger.total.toLocaleString("fa-IR")}</dd></div>
          <div className="flex min-h-12 items-center justify-between gap-4"><dt className="text-mutedText">آخرین فعالیت</dt><dd className="m-0 font-extrabold">{formatCustomerDate(data.ledger.lastActivity)}</dd></div>
        </dl>
      </section>

      <section className="mt-6" aria-labelledby="partner-supplies-summary">
        <div className="flex items-center justify-between gap-3 border-b border-border pb-3"><h2 id="partner-supplies-summary" className="m-0 text-base font-black">کالاهای تأمین‌شده</h2><Link to="/purchases" className="text-xs font-bold text-primary no-underline">مشاهده کالاها</Link></div>
        <dl className="m-0 grid grid-cols-2 gap-x-4 text-xs">
          <div className="border-b border-border py-3"><dt className="text-mutedText">گوشی</dt><dd className="m-0 mt-1 font-extrabold">{data.supplied.phones.toLocaleString("fa-IR")}</dd></div>
          <div className="border-b border-border py-3"><dt className="text-mutedText">کالا</dt><dd className="m-0 mt-1 font-extrabold">{data.supplied.products.toLocaleString("fa-IR")}</dd></div>
        </dl>
      </section>

      {data.phoneSettlement.total > 0 ? <section className="mt-6" aria-labelledby="partner-settlement-summary"><div className="flex items-center justify-between gap-3 border-b border-border pb-3"><h2 id="partner-settlement-summary" className="m-0 text-base font-black">تسویه گوشی‌ها</h2><Link to="/phones" className="text-xs font-bold text-primary no-underline">جزئیات تسویه</Link></div><dl className="m-0 divide-y divide-border text-xs"><div className="flex min-h-12 items-center justify-between"><dt className="text-mutedText">باز</dt><dd className="m-0 font-extrabold">{data.phoneSettlement.open.toLocaleString("fa-IR")}</dd></div><div className="flex min-h-12 items-center justify-between"><dt className="text-mutedText">مانده تسویه</dt><dd className="m-0 font-extrabold tabular-nums">{formatToman(data.phoneSettlement.remainingAmount)}</dd></div></dl></section> : null}
    </section>
  );
};
