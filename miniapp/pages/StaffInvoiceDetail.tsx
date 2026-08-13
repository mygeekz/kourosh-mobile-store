import React from "react";
import { Link, useParams } from "react-router-dom";
import { MiniAppDataState } from "../components/MiniAppDataState";
import { formatCustomerDate, formatToman } from "../format";
import { useMiniAppQuery } from "../hooks/useMiniAppQuery";
import type { StaffInvoiceDetail as StaffInvoiceDetailData } from "../types";

export const StaffInvoiceDetail: React.FC = () => {
  const { ref } = useParams();
  const query = useMiniAppQuery<StaffInvoiceDetailData>(`/api/miniapp/staff/invoices/${ref}`);
  if (!query.data) return <MiniAppDataState loading={query.loading} error={query.error} retry={query.retry} />;
  const invoice = query.data;
  return <div><header className="border-b border-border pb-4"><p className="m-0 text-xs text-mutedText">فاکتور {invoice.ref} · {invoice.status}</p><h1 className="mb-0 mt-1 text-xl font-black">{invoice.customer?.fullName || "مشتری مهمان"}</h1>{invoice.customer ? <Link to={`/customers/${invoice.customer.id}`} className="mt-2 block text-xs font-bold text-primary no-underline">مشاهده پرونده مشتری</Link> : null}</header><dl className="m-0 grid grid-cols-2 gap-x-4 text-xs"><div className="border-b border-border py-3"><dt className="text-mutedText">تاریخ</dt><dd className="m-0 mt-1 font-black">{formatCustomerDate(invoice.date)}</dd></div><div className="border-b border-border py-3"><dt className="text-mutedText">روش پرداخت</dt><dd className="m-0 mt-1 font-black">{invoice.paymentMethodLabel || "فروش"}</dd></div></dl>
    <section className="mt-6"><h2 className="m-0 border-b border-border pb-2 text-sm font-black">اقلام</h2><ul className="m-0 list-none divide-y divide-border p-0">{invoice.items.map((item) => <li key={item.id} className="flex items-start justify-between gap-3 py-4"><span className="min-w-0"><strong className="block text-sm">{item.description}</strong><small className="mt-1 block text-mutedText">{item.quantity.toLocaleString("fa-IR")} × {formatToman(item.unitPrice)}</small></span><strong className="shrink-0 text-xs tabular-nums">{formatToman(item.total)}</strong></li>)}</ul></section>
    <dl className="m-0 border-t border-border pt-2 text-sm"><div className="flex min-h-10 items-center justify-between gap-3"><dt className="text-mutedText">جمع</dt><dd className="m-0 font-black tabular-nums">{formatToman(invoice.subtotal)}</dd></div>{invoice.discount > 0 ? <div className="flex min-h-10 items-center justify-between gap-3"><dt className="text-mutedText">تخفیف</dt><dd className="m-0 font-black tabular-nums">{formatToman(invoice.discount)}</dd></div> : null}<div className="flex min-h-12 items-center justify-between gap-3 border-t border-border"><dt className="font-black">مبلغ نهایی</dt><dd className="m-0 break-words text-lg font-black tabular-nums">{formatToman(invoice.total)}</dd></div></dl>
  </div>;
};
