import React from "react";
import { useParams } from "react-router-dom";
import { MiniAppBidiText } from "../components/MiniAppBidiText";
import { MiniAppDataState } from "../components/MiniAppDataState";
import { CustomerAmount, CustomerCard, CustomerList, CustomerPage, CustomerQueryState, CustomerRecord, CustomerSection } from "../components/customer/CustomerUI";
import { formatCustomerDate } from "../format";
import { useMiniAppQuery } from "../hooks/useMiniAppQuery";
import type { CustomerInvoiceDetail } from "../types";

export const CustomerInvoice: React.FC = () => {
  const { invoiceRef = "" } = useParams();
  const query = useMiniAppQuery<CustomerInvoiceDetail>(`/api/miniapp/customer/invoices/${encodeURIComponent(invoiceRef)}`);
  const d = query.data;
  return <CustomerPage id="invoice-title" title="فاکتور خرید" description={d?.business.name}>
    <CustomerQueryState query={query}>{d && <>
      <CustomerCard><div className="customer-invoice-identity">
        {d.business.logoUrl && <img className="size-11 object-contain" src={d.business.logoUrl} alt="" aria-hidden="true" />}
        <strong>شماره فاکتور: <MiniAppBidiText>{d.invoiceNumber || "—"}</MiniAppBidiText></strong>
        <p className="customer-muted">مرجع: <MiniAppBidiText>{invoiceRef}</MiniAppBidiText></p>
        <p className="customer-muted">تاریخ: {formatCustomerDate(d.transactionDate)}</p>
        <p className="customer-muted">روش پرداخت: {d.paymentMethodLabel || "ثبت نشده"}</p>
        <p className="customer-muted">وضعیت فاکتور: {d.status === "active" ? "فعال" : d.status || "ثبت نشده"}</p>
      </div></CustomerCard>
      <CustomerSection title="اقلام خرید">
        {d.items.length ? <CustomerList>{d.items.map(item => <CustomerRecord key={item.id} record={item.id} title={item.description} detail={`تعداد: ${item.quantity.toLocaleString("fa-IR")}`}>
          <CustomerAmount label="قیمت هر واحد" value={item.unitPrice} field={`item-${item.id}-unit`} /><CustomerAmount label="تخفیف هر واحد" value={item.discountAmount} field={`item-${item.id}-discount`} /><CustomerAmount label="مبلغ ردیف" value={item.totalPrice} field={`item-${item.id}-total`} />
        </CustomerRecord>)}</CustomerList> : <MiniAppDataState empty emptyText="اقلام این فاکتور در گزارش فعلی موجود نیست." />}
      </CustomerSection>
      <CustomerSection title="مبالغ فاکتور" description="مقادیر ثبت‌شده در فاکتور فروشگاه"><CustomerCard>
        <CustomerAmount label="جمع اولیه" value={d.totals.subtotal} field="subtotal" /><CustomerAmount label="تخفیف اقلام" value={d.totals.itemsDiscount} field="itemsDiscount" /><CustomerAmount label="تخفیف کل فاکتور" value={d.totals.globalDiscount} field="globalDiscount" /><CustomerAmount label="مالیات" value={d.totals.taxAmount} field="taxAmount" />
        <div className="customer-invoice-total"><CustomerAmount label="مبلغ نهایی فاکتور" value={d.totals.grandTotal} field="grandTotal" /></div>
      </CustomerCard></CustomerSection>
    </>}</CustomerQueryState>
  </CustomerPage>;
};
