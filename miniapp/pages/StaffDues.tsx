import React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { MiniAppDataState } from "../components/MiniAppDataState";
import { formatCustomerDate, formatToman } from "../format";
import { useMiniAppQuery } from "../hooks/useMiniAppQuery";
import type { StaffDueData } from "../types";

const scopes = [{ key: "overdue", label: "معوق" }, { key: "today", label: "امروز" }, { key: "next7", label: "۷ روز آینده" }] as const;

export const StaffDues: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const scope = scopes.some((item) => item.key === params.get("scope")) ? params.get("scope")! : "overdue";
  const query = useMiniAppQuery<StaffDueData>(`/api/miniapp/staff/installments/due?scope=${scope}&page=1&pageSize=20`);
  return <div><header className="mb-4"><h1 className="m-0 text-xl font-black">مرکز سررسیدها</h1><p className="mb-0 mt-1 text-xs text-mutedText">فقط مانده‌های پرداخت‌نشده</p></header>
    <div className="grid grid-cols-3 gap-1 border-b border-border pb-3">{scopes.map((item) => <button key={item.key} type="button" onClick={() => setParams({ scope: item.key })} className={`min-h-10 rounded-[var(--radius-md)] px-2 text-xs font-bold ${scope === item.key ? "bg-primary text-primary-foreground" : "bg-muted text-mutedText"}`}>{item.label}</button>)}</div>
    {!query.data ? <MiniAppDataState loading={query.loading} error={query.error} retry={query.retry} /> : query.data.items.length === 0 ? <MiniAppDataState empty emptyText="قسطی در این بازه وجود ندارد." /> : <ul className="m-0 list-none divide-y divide-border p-0">{query.data.items.map((item) => <li key={item.paymentId}><Link to={`/installments/${item.saleId}`} className="block py-4 text-foreground no-underline"><div className="flex items-start justify-between gap-3"><span className="min-w-0"><strong className="block truncate text-sm">{item.customerName}</strong><small className="mt-1 block text-mutedText">قرارداد {item.saleId.toLocaleString("fa-IR")} · {formatCustomerDate(item.dueDate)}</small></span><strong className="shrink-0 break-words text-left text-sm tabular-nums">{formatToman(item.remainingAmount)}</strong></div>{item.status === "overdue" ? <span className="mt-2 block text-[11px] font-bold text-danger">{item.overdueDays.toLocaleString("fa-IR")} روز تأخیر</span> : null}</Link></li>)}</ul>}
  </div>;
};
