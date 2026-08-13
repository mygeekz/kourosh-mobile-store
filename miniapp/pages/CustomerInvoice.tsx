import React from "react";
import { useParams } from "react-router-dom";
import { MiniAppDataState } from "../components/MiniAppDataState";
import { formatCustomerDate, formatToman } from "../format";
import { useMiniAppQuery } from "../hooks/useMiniAppQuery";
import type { CustomerInvoiceDetail } from "../types";

export const CustomerInvoice: React.FC = () => {
  const { invoiceRef = "" } = useParams();
  const query = useMiniAppQuery<CustomerInvoiceDetail>(`/api/miniapp/customer/invoices/${encodeURIComponent(invoiceRef)}`);
  if (!query.data) return <MiniAppDataState loading={query.loading} error={query.error} retry={query.retry} />;
  const invoice = query.data;
  return (
    <section aria-labelledby="invoice-title">
      <div className="flex items-center gap-3 border-b border-border pb-4"><img className="size-11 object-contain" src={invoice.business.logoUrl} alt="" aria-hidden="true" /><div><p className="m-0 text-xs text-mutedText">{invoice.business.name}</p><h1 id="invoice-title" className="m-0 text-xl font-black">فاکتور {invoice.invoiceNumber}</h1></div></div>
      <dl className="my-0 grid grid-cols-2 gap-4 border-b border-border py-4 text-xs"><div><dt className="text-mutedText">تاریخ</dt><dd className="m-0 mt-1 font-extrabold">{formatCustomerDate(invoice.transactionDate)}</dd></div><div><dt className="text-mutedText">نوع فروش</dt><dd className="m-0 mt-1 font-extrabold">{invoice.paymentMethodLabel || "فروش"}</dd></div></dl>
      <h2 className="m-0 border-b border-border py-3 text-base font-black">اقلام</h2>
      <ul className="m-0 list-none divide-y divide-border p-0">{invoice.items.map((item) => <li key={item.id} className="flex items-start justify-between gap-4 py-4"><div><strong className="block text-sm">{item.description}</strong><span className="mt-1 block text-xs text-mutedText">{item.quantity.toLocaleString("fa-IR")} × {formatToman(item.unitPrice)}</span></div><strong className="shrink-0 text-sm tabular-nums">{formatToman(item.totalPrice)}</strong></li>)}</ul>
      <dl className="m-0 border-t border-border pt-3 text-sm"><div className="flex min-h-10 items-center justify-between"><dt className="text-mutedText">جمع</dt><dd className="m-0 font-extrabold tabular-nums">{formatToman(invoice.totals.subtotal)}</dd></div>{invoice.totals.itemsDiscount + invoice.totals.globalDiscount > 0 ? <div className="flex min-h-10 items-center justify-between"><dt className="text-mutedText">تخفیف</dt><dd className="m-0 font-extrabold tabular-nums">{formatToman(invoice.totals.itemsDiscount + invoice.totals.globalDiscount)}</dd></div> : null}<div className="flex min-h-12 items-center justify-between border-t border-border"><dt className="font-black">مبلغ نهایی</dt><dd className="m-0 text-lg font-black tabular-nums">{formatToman(invoice.totals.grandTotal)}</dd></div></dl>
    </section>
  );
};
