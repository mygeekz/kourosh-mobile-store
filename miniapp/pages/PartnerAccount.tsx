import React from "react";
import { Link } from "react-router-dom";
import { MiniAppDataState } from "../components/MiniAppDataState";
import { formatToman } from "../format";
import { useMiniAppQuery } from "../hooks/useMiniAppQuery";
import type { PartnerAccountData } from "../types";

const accountTone = (code: PartnerAccountData["account"]["code"]) =>
  code === "debtor" ? "text-danger" : code === "creditor" ? "text-success" : "text-secondaryText";

export const PartnerAccount: React.FC = () => {
  const query = useMiniAppQuery<PartnerAccountData>("/api/miniapp/partner/account");
  if (!query.data) return <MiniAppDataState loading={query.loading} error={query.error} retry={query.retry} />;
  const data = query.data;
  return (
    <section aria-labelledby="partner-account-title">
      <h1 id="partner-account-title" className="m-0 text-2xl font-black">حساب من</h1>
      <p className="mb-4 mt-1 text-sm leading-7 text-mutedText">اطلاعات پرونده و مانده دقیق همکاری</p>
      <section className="rounded-[var(--radius-lg)] border border-border bg-card p-4"><div className="flex items-center justify-between gap-4"><span className="text-xs text-mutedText">وضعیت فعلی</span><strong className={`text-xs ${accountTone(data.account.code)}`}>{data.account.label}</strong></div><p className="mb-0 mt-2 text-2xl font-black tabular-nums">{formatToman(data.account.amount)}</p></section>
      <dl className="my-4 divide-y divide-border text-sm"><div className="flex min-h-12 items-center justify-between gap-4"><dt className="text-mutedText">نام همکار</dt><dd className="m-0 font-extrabold">{data.partner.name}</dd></div>{data.partner.contactName ? <div className="flex min-h-12 items-center justify-between gap-4"><dt className="text-mutedText">شخص رابط</dt><dd className="m-0 font-extrabold">{data.partner.contactName}</dd></div> : null}{data.partner.phoneNumber ? <div className="flex min-h-12 items-center justify-between gap-4"><dt className="text-mutedText">شماره تماس</dt><dd className="m-0 font-extrabold" dir="ltr">{data.partner.phoneNumber}</dd></div> : null}</dl>
      <section className="mt-6"><div className="flex items-center justify-between gap-3 border-b border-border pb-3"><h2 className="m-0 text-base font-black">خلاصه تأمین</h2><Link to="/purchases" className="text-xs font-bold text-primary no-underline">کالاها</Link></div><dl className="grid grid-cols-2 gap-x-4 text-xs"><div className="py-3"><dt className="text-mutedText">کل اقلام</dt><dd className="m-0 mt-1 font-extrabold">{data.supplied.total.toLocaleString("fa-IR")}</dd></div><div className="py-3"><dt className="text-mutedText">مانده تسویه گوشی</dt><dd className="m-0 mt-1 font-extrabold tabular-nums">{formatToman(data.phoneSettlement.remainingAmount)}</dd></div></dl></section>
    </section>
  );
};
