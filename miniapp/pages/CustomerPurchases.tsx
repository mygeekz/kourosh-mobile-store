import React from "react";
import { Link } from "react-router-dom";
import { MiniAppDataState } from "../components/MiniAppDataState";
import { formatCustomerDate, formatToman } from "../format";
import { useMiniAppQuery } from "../hooks/useMiniAppQuery";
import type { CustomerPurchase } from "../types";

export const CustomerPurchases: React.FC = () => {
  const query = useMiniAppQuery<CustomerPurchase[]>("/api/miniapp/customer/purchases");
  if (!query.data) return <MiniAppDataState loading={query.loading} error={query.error} retry={query.retry} />;
  return (
    <section aria-labelledby="purchases-title">
      <h1 id="purchases-title" className="m-0 text-2xl font-black">خریدهای من</h1>
      <p className="mb-4 mt-1 text-sm leading-7 text-mutedText">فروش‌های نقدی، اعتباری و اقساطی ثبت‌شده</p>
      <MiniAppDataState empty={!query.data.length} emptyText="هنوز خریدی برای شما ثبت نشده است." />
      <ul className="m-0 list-none divide-y divide-border p-0">
        {query.data.map((purchase) => (
          <li key={purchase.ref} className="py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0"><strong className="block text-sm leading-6">{purchase.itemsSummary}</strong><span className="mt-1 block text-xs text-mutedText">{formatCustomerDate(purchase.transactionDate)} · {purchase.purchaseTypeLabel}</span></div>
              <strong className="shrink-0 text-sm tabular-nums">{formatToman(purchase.totalAmount)}</strong>
            </div>
            {purchase.invoiceRef ? <Link className="mt-2 inline-block text-xs font-bold text-primary no-underline" to={`/invoices/${purchase.invoiceRef}`}>مشاهده فاکتور</Link> : <Link className="mt-2 inline-block text-xs font-bold text-primary no-underline" to={`/installments/${purchase.id}`}>جزئیات قرارداد</Link>}
          </li>
        ))}
      </ul>
    </section>
  );
};
