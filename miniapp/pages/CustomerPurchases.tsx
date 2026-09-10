import React from "react";
import { MiniAppDataState } from "../components/MiniAppDataState";
import { CustomerList, CustomerPage, CustomerPurchaseRow, CustomerQueryState } from "../components/customer/CustomerUI";
import { useMiniAppQuery } from "../hooks/useMiniAppQuery";
import type { CustomerPurchase } from "../types";

export const CustomerPurchases: React.FC = () => {
  const query = useMiniAppQuery<CustomerPurchase[]>("/api/miniapp/customer/purchases");
  return <CustomerPage id="purchases-title" title="خریدهای من" description="خریدهای ثبت‌شده و فاکتورهای در دسترس شما">
    <CustomerQueryState query={query}>{query.data && <>
      {query.data.length ? <CustomerList>{query.data.map(purchase => <CustomerPurchaseRow key={purchase.ref} purchase={purchase} />)}</CustomerList> : <MiniAppDataState empty emptyText="هنوز خریدی در این گزارش ثبت نشده است. خریدهای ثبت‌شده فروشگاه در این بخش نمایش داده می‌شوند." />}
      <p className="customer-muted">این فهرست، خریدهای موجود در گزارش فعلی را نشان می‌دهد؛ ممکن است همه سوابق قدیمی در دسترس نباشند.</p>
    </>}</CustomerQueryState>
  </CustomerPage>;
};
