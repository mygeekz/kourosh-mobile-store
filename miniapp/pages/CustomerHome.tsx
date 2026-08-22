import React from "react";
import { Link } from "react-router-dom";
import { MiniAppDataState } from "../components/MiniAppDataState";
import { formatCustomerDate, formatToman } from "../format";
import { useMiniAppQuery } from "../hooks/useMiniAppQuery";
import type { CustomerHomeData } from "../types";

const accountTone = (code: CustomerHomeData["account"]["code"]): string =>
  code === "debtor" ? "text-danger" : code === "creditor" ? "text-success" : "text-secondaryText";

export const CustomerHome: React.FC = () => {
  const query = useMiniAppQuery<CustomerHomeData>("/api/miniapp/customer/home");
  if (!query.data) return <MiniAppDataState loading={query.loading} error={query.error} retry={query.retry} />;
  const { customer, account, installments, lastPurchase } = query.data;

  return (
    <section aria-labelledby="customer-home-title">
      <p className="m-0 text-xs font-extrabold text-primary">حساب مشتری</p>
      <h1 id="customer-home-title" className="mb-1 mt-1 text-2xl font-black leading-10">سلام {customer.fullName}</h1>
      <p className="m-0 text-sm leading-7 text-mutedText">خلاصه حساب شما در کوروش</p>

      <section className="mt-5 rounded-[var(--radius-lg)] border border-border bg-card p-4" aria-label="مانده حساب">
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs text-mutedText">وضعیت حساب</span>
          <strong className={`text-sm ${accountTone(account.code)}`}>{account.label}</strong>
        </div>
        <p className="mb-0 mt-2 break-words text-2xl font-black tabular-nums">{formatToman(account.amount)}</p>
      </section>

      <section className="mt-6" aria-labelledby="installment-summary-title">
        <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
          <h2 id="installment-summary-title" className="m-0 text-base font-black">اقساط فعال</h2>
          <Link to="/installments" className="text-xs font-bold text-primary no-underline">مشاهده همه</Link>
        </div>
        <dl className="m-0 divide-y divide-border">
          <div className="flex min-h-12 items-center justify-between gap-4"><dt className="text-xs text-mutedText">قرارداد فعال</dt><dd className="m-0 text-sm font-extrabold">{installments.activeCount.toLocaleString("fa-IR")}</dd></div>
          <div className="flex min-h-12 items-center justify-between gap-4"><dt className="text-xs text-mutedText">اقساط عقب‌افتاده</dt><dd className={`m-0 text-sm font-extrabold ${installments.overdueCount ? "text-danger" : "text-success"}`}>{installments.overdueCount.toLocaleString("fa-IR")}</dd></div>
          <div className="flex min-h-14 items-center justify-between gap-4">
            <dt className="text-xs text-mutedText">قسط بعدی</dt>
            <dd className="m-0 text-left text-sm font-extrabold">
              {installments.next ? <><span className="block tabular-nums">{formatToman(installments.next.amount)}</span><span className="block text-[11px] font-medium text-mutedText">{formatCustomerDate(installments.next.dueDate)}</span></> : "قسط بازی وجود ندارد"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="mt-6" aria-labelledby="last-purchase-title">
        <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
          <h2 id="last-purchase-title" className="m-0 text-base font-black">آخرین خرید</h2>
          <Link to="/purchases" className="text-xs font-bold text-primary no-underline">سوابق خرید</Link>
        </div>
        {lastPurchase ? (
          <div className="flex items-start justify-between gap-4 py-4">
            <div className="min-w-0"><strong className="block truncate text-sm">{lastPurchase.itemsSummary}</strong><span className="mt-1 block text-xs text-mutedText">{formatCustomerDate(lastPurchase.transactionDate)} · {lastPurchase.purchaseTypeLabel}</span></div>
            <span className="shrink-0 text-sm font-extrabold tabular-nums">{formatToman(lastPurchase.totalAmount)}</span>
          </div>
        ) : <p className="py-5 text-sm text-mutedText">خریدی ثبت نشده است.</p>}
      </section>
    </section>
  );
};
