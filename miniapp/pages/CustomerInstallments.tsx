import React from "react";
import { Link } from "react-router-dom";
import { MiniAppDataState } from "../components/MiniAppDataState";
import { formatCustomerDate, formatToman } from "../format";
import { useMiniAppQuery } from "../hooks/useMiniAppQuery";
import type { CustomerInstallmentSummary } from "../types";

const statusTone = (status: string) => status === "معوق" ? "text-danger" : status === "تکمیل شده" ? "text-success" : "text-secondaryText";

export const CustomerInstallments: React.FC = () => {
  const query = useMiniAppQuery<CustomerInstallmentSummary[]>("/api/miniapp/customer/installments");
  if (!query.data) return <MiniAppDataState loading={query.loading} error={query.error} retry={query.retry} />;
  return (
    <section aria-labelledby="installments-title">
      <h1 id="installments-title" className="m-0 text-2xl font-black">اقساط من</h1>
      <p className="mb-4 mt-1 text-sm leading-7 text-mutedText">وضعیت واقعی قراردادها و سررسیدها</p>
      <MiniAppDataState empty={!query.data.length} emptyText="قرارداد اقساطی ثبت نشده است." />
      <ul className="m-0 list-none divide-y divide-border p-0">
        {query.data.map((sale) => (
          <li key={sale.id} className="py-4">
            <Link to={`/installments/${sale.id}`} className="block text-inherit no-underline">
              <div className="flex items-start justify-between gap-3"><strong className="min-w-0 text-sm leading-6">{sale.itemsSummary}</strong><span className={`shrink-0 text-xs font-extrabold ${statusTone(sale.status)}`}>{sale.status}</span></div>
              <dl className="mb-0 mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div><dt className="text-mutedText">مانده</dt><dd className="m-0 mt-0.5 font-extrabold tabular-nums">{formatToman(sale.remainingAmount)}</dd></div>
                <div><dt className="text-mutedText">قسط بعدی</dt><dd className="m-0 mt-0.5 font-extrabold">{formatCustomerDate(sale.nextDueDate)}</dd></div>
                <div><dt className="text-mutedText">پرداخت‌شده</dt><dd className="m-0 mt-0.5 font-extrabold">{sale.paidInstallmentCount.toLocaleString("fa-IR")} از {sale.installmentCount.toLocaleString("fa-IR")}</dd></div>
                <div><dt className="text-mutedText">مبلغ قرارداد</dt><dd className="m-0 mt-0.5 font-extrabold tabular-nums">{formatToman(sale.totalAmount)}</dd></div>
              </dl>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
};
