import React from "react";
import { Link } from "react-router-dom";
import { MiniAppDataState } from "../components/MiniAppDataState";
import { MiniAppPill } from "../components/MiniAppVisualPrimitives";
import { CustomerAmount, CustomerList, CustomerPage, CustomerQueryState, CustomerRecord } from "../components/customer/CustomerUI";
import { formatCustomerDate } from "../format";
import { useMiniAppQuery } from "../hooks/useMiniAppQuery";
import type { CustomerInstallmentSummary } from "../types";

export const CustomerInstallments: React.FC = () => {
  const query = useMiniAppQuery<CustomerInstallmentSummary[]>("/api/miniapp/customer/installments");
  return <CustomerPage id="installments-title" title="اقساط من" description="قراردادها، سررسیدها و پرداخت‌های ثبت‌شده شما">
    <CustomerQueryState query={query}>{query.data && <>
      {query.data.length ? <CustomerList>{query.data.map(sale => <CustomerRecord key={sale.id} record={sale.id} title={sale.itemsSummary} detail={`قرارداد ${sale.id.toLocaleString("fa-IR")} · ${formatCustomerDate(sale.saleDate)}`}>
        <div><MiniAppPill tone={sale.overdueCount > 0 ? "warning" : "muted"}>{sale.status}</MiniAppPill></div>
        {sale.overdueCount > 0 && <p className="customer-muted">{sale.overdueCount.toLocaleString("fa-IR")} قسط عقب‌افتاده</p>}
        <CustomerAmount label="مانده قرارداد" value={sale.remainingAmount} field={`sale-${sale.id}-remaining`} />
        {sale.nextDueDate && <><p className="customer-muted">سررسید بعدی ثبت‌شده: {formatCustomerDate(sale.nextDueDate)}</p><CustomerAmount label="مبلغ سررسید بعدی" value={sale.nextDueAmount} field={`sale-${sale.id}-next`} /></>}
        <CustomerAmount label="مبلغ قرارداد" value={sale.totalAmount} field={`sale-${sale.id}-total`} /><CustomerAmount label="پرداخت‌شده ثبت‌شده" value={sale.collectedAmount} field={`sale-${sale.id}-paid`} />
        {typeof sale.paidInstallmentCount === "number" && typeof sale.installmentCount === "number" && <p className="customer-muted">{sale.paidInstallmentCount.toLocaleString("fa-IR")} از {sale.installmentCount.toLocaleString("fa-IR")} {sale.saleType === "check" ? "چک وصول‌شده" : "قسط پرداخت‌شده"}</p>}
        <Link className="customer-link" to={`/installments/${sale.id}`}>برنامه پرداخت و جزئیات قرارداد ←</Link>
      </CustomerRecord>)}</CustomerList> : <MiniAppDataState empty emptyText="قرارداد اقساطی در این گزارش ندارید. اگر خرید اقساطی ثبت شود، قرارداد و سررسیدها را اینجا خواهید دید." />}
    </>}</CustomerQueryState>
  </CustomerPage>;
};
