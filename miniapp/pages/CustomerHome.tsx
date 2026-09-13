import React from "react";
import { Link } from "react-router-dom";
import { CustomerAmount, CustomerCard, CustomerList, CustomerPage, CustomerPosition, CustomerPurchaseRow, CustomerQueryState, CustomerSection } from "../components/customer/CustomerUI";
import { formatCustomerDate } from "../format";
import { useMiniAppQuery } from "../hooks/useMiniAppQuery";
import type { CustomerHomeData } from "../types";

export const CustomerHome: React.FC = () => {
  const query = useMiniAppQuery<CustomerHomeData>("/api/miniapp/customer/home");
  const d = query.data;
  return <CustomerPage id="customer-home-title" title={d ? `سلام ${d.customer.fullName}` : "حساب من"} description="خریدها، اقساط و سوابق حساب شما در کوروش" headerSummary={!query.loading && !query.error && d ? <CustomerPosition account={d.account} /> : undefined}>
    <CustomerQueryState query={query}>{d && <>
      {(d.installments.activeCount > 0 || d.installments.overdueCount > 0 || d.installments.next) && <CustomerSection title={d.installments.overdueCount > 0 ? "قسطی برای پیگیری دارید" : "سررسید بعدی شما"}>
        <CustomerCard>
          {d.installments.overdueCount > 0 && <><p className="customer-muted">{d.installments.overdueCount.toLocaleString("fa-IR")} قسط عقب‌افتاده در گزارش شما ثبت شده است.</p><Link className="customer-link" to="/installments">بررسی قراردادها و سررسیدها ←</Link></>}
          {d.installments.next ? <><p className="customer-muted">سررسید ثبت‌شده: {formatCustomerDate(d.installments.next.dueDate)}</p><CustomerAmount label="مبلغ سررسید" value={d.installments.next.amount} field="nextAmount" /><Link className="customer-link" to={`/installments/${d.installments.next.saleId}`}>مشاهده قرارداد این سررسید ←</Link></> : <p className="customer-muted">برای جزئیات برنامه پرداخت، قراردادهای خود را ببینید.</p>}
          {!d.installments.next && !d.installments.overdueCount && <Link className="customer-link" to="/installments">قراردادهای من ←</Link>}
        </CustomerCard>
      </CustomerSection>}
      <CustomerSection artwork="shopping" title={d.lastPurchase ? "آخرین خرید شما" : "خریدهای شما"} to="/purchases" action="سوابق خرید">
        {d.lastPurchase ? <CustomerList><CustomerPurchaseRow purchase={d.lastPurchase} /></CustomerList> : <CustomerCard><p className="customer-muted">هنوز خریدی در این گزارش ثبت نشده است. خریدهای ثبت‌شده فروشگاه را از این بخش خواهید دید.</p></CustomerCard>}
      </CustomerSection>
      <Link className="customer-link" to="/account">حساب و گردش‌ها ←</Link>
    </>}</CustomerQueryState>
  </CustomerPage>;
};
