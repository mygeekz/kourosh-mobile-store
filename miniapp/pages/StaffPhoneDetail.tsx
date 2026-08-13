import React from "react";
import { Link, useParams } from "react-router-dom";
import { MiniAppDataState } from "../components/MiniAppDataState";
import { formatCustomerDate, formatToman } from "../format";
import { useMiniAppQuery } from "../hooks/useMiniAppQuery";
import type { StaffPhoneDetail as StaffPhoneDetailData } from "../types";

export const StaffPhoneDetail: React.FC = () => {
  const { id } = useParams();
  const query = useMiniAppQuery<StaffPhoneDetailData>(`/api/miniapp/staff/phones/${id}`);
  if (!query.data) return <MiniAppDataState loading={query.loading} error={query.error} retry={query.retry} />;
  const phone = query.data;
  const rows = [["IMEI", phone.imei], ["رنگ", phone.color], ["حافظه", phone.storage], ["RAM", phone.ram], ["وضعیت ظاهری", phone.condition], ["وضعیت", phone.status], ["تأمین‌کننده", phone.supplierName], ["تاریخ خرید", formatCustomerDate(phone.purchaseDate)]];
  return <div><header className="border-b border-border pb-4"><p className="m-0 text-xs text-mutedText">گوشی #{phone.id.toLocaleString("fa-IR")}</p><h1 className="mb-0 mt-1 text-xl font-black">{phone.model}</h1><p className="mb-0 mt-2 break-all text-sm text-mutedText">IMEI: {phone.imei}</p></header><dl className="m-0 grid grid-cols-2 gap-x-4 text-xs">{rows.map(([label, value]) => <div key={label} className="min-w-0 border-b border-border py-3"><dt className="text-mutedText">{label}</dt><dd className="m-0 mt-1 break-words font-black">{value || "—"}</dd></div>)}</dl>
    <section className="mt-6"><h2 className="m-0 border-b border-border pb-2 text-sm font-black">قیمت‌ها</h2><dl className="m-0 divide-y divide-border text-xs"><div className="flex min-h-12 items-center justify-between gap-3"><dt className="text-mutedText">قیمت خرید</dt><dd className="m-0 break-words text-left font-black tabular-nums">{formatToman(phone.purchasePrice)}</dd></div><div className="flex min-h-12 items-center justify-between gap-3"><dt className="text-mutedText">قیمت خرید روز</dt><dd className="m-0 break-words text-left font-black tabular-nums">{formatToman(phone.currentPurchasePrice)}</dd></div><div className="flex min-h-12 items-center justify-between gap-3"><dt className="text-mutedText">قیمت فروش</dt><dd className="m-0 break-words text-left font-black tabular-nums">{formatToman(phone.salePrice)}</dd></div></dl></section>
    {phone.sale ? <section className="mt-6"><h2 className="m-0 border-b border-border pb-2 text-sm font-black">فروش اثبات‌شده</h2><div className="py-4 text-sm"><p className="m-0 text-mutedText">{formatCustomerDate(phone.sale.date)} · {phone.sale.ref}</p>{phone.sale.customer ? <Link to={`/customers/${phone.sale.customer.id}`} className="mt-2 block font-black text-primary no-underline">{phone.sale.customer.fullName}</Link> : <p className="mb-0 mt-2 font-bold">مشتری مهمان</p>}</div></section> : null}
  </div>;
};
